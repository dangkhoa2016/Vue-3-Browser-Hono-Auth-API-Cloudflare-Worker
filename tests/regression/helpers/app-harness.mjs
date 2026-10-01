/**
 * Shared app harness: boots the real `httpClient` + `authStore` against a fake axios, a fake
 * `localStorage` and a controllable clock.
 *
 * It lives in `helpers/` rather than in a test file because two suites need it. A suite that
 * imports another *test* file also re-registers that file's `describe` blocks in its own runner,
 * which is how a partial, confusing test count appears; sharing the harness keeps each suite's
 * reported totals its own.
 *
 * Fixtures are fake credentials and loopback origins only. No real API, no production host, no secrets.
 */

import {
  TEST_ORIGINS,
  createBrowserEnv,
  createFakeAxios,
  createLockManager,
  createPiniaStub,
  createRecordingConsole,
  createStorage,
  createTransport,
  loadModule,
} from './browser-env.mjs';

export const API_A = TEST_ORIGINS.apiA;
export const API_B = TEST_ORIGINS.apiB;

/**
 * The writer lock name the application uses for the one canonical record. It is imported from the
 * real module rather than duplicated, so a test can never latch a *different* lock than the one
 * production takes and then "prove" serialisation that never happened.
 */
export const WRITER_LOCK_NAME = 'frontend-session-write:auth-session-record';

export const NOW_SECONDS = 1_800_000_000;
export const ACCESS_TTL = 3600;
export const REFRESH_TTL = 259200;

/**
 * The rotation predecessor for a record.
 *
 * A rotation names the credential pair it replaces, so tests build the predecessor from the record
 * they mean the rotation to replace — including the case where the record in storage has since
 * become somebody else's, which is precisely what the writer has to refuse.
 */
export function predecessorOf(record) {
  if (!record || !record.accessToken || !record.refreshToken) return null;
  return {
    identity: record.identity,
    sessionId: record.sessionId,
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
  };
}

export function baseSession(overrides = {}) {
  return {
    user: { id: 1, email: 'user@example.test', role: 'user' },
    access_token: 'FAKE_ACCESS_A',
    refresh_token: 'FAKE_REFRESH_A',
    expires_at: NOW_SECONDS + ACCESS_TTL,
    refresh_expires_at: NOW_SECONDS + REFRESH_TTL,
    ...overrides,
  };
}

export function loadEndpoints() {
  const env = createBrowserEnv();
  return loadModule('assets/js/api/endpoints.js', env);
}


/**
 * Boots the real httpClient + authStore against a fake axios and a fake localStorage.
 * `routes` is the programmable transport (see helpers/createTransport).
 *
 * `axiosInstance` swaps the stand-in for a real client (the loopback suite does this) and
 * `baseUrl` configures the API base the way `init.js` does, so both kinds of suite boot the same
 * store instead of each re-implementing the wiring.
 *
 * `locks` defaults to a **real queue**. Passing `locks: null` reproduces a browser without Web
 * Locks, which is now a documented reduced mode with its own behaviour; it must be an explicit
 * choice per suite, never the default, or a writer race simply runs immediately and hides itself.
 */
export function bootApp({
  routes = {},
  axiosInstance = null,
  baseUrl = null,
  storage = createStorage(),
  origin = API_A,
  console: recorder = createRecordingConsole(),
  clock = () => NOW_SECONDS * 1000,
  sessionConflictTimeoutMs = null,
  broadcastBus = null,
  locks = createLockManager(),
  storageHooks = null,
} = {}) {
  // The clock stays deterministic for expiry maths but keeps advancing with real time, so bounded
  // waits inside production code (conflict timeouts) can still expire under test.
  const baseMs = clock();
  const realStart = Date.now();
  const clockControl = { now: () => baseMs + (Date.now() - realStart) };
  const sharedStorage = storageHooks ? createStorage(storage._dump ? storage._dump() : {}, { hooks: storageHooks }) : storage;
  const env = createBrowserEnv({ origin, storage: sharedStorage, console: recorder, clock: clockControl, broadcastBus, locks });
  env.window.axios = axiosInstance || createFakeAxios();

  const endpoints = loadEndpoints();
  // Shared singletons: httpClient, authStore and mainStore must agree on one identity instance.
  const identity = loadModule('assets/js/api/apiIdentity.js', env);
  const sessionStorageModule = loadModule('assets/js/api/sessionStorage.js', env);
  const protectedStateModule = loadModule('assets/js/api/protectedState.js', env);
  const coordinatorModule = loadModule('assets/js/api/sessionCoordinator.js', env);
  const authHolders = {};

  const i18n = {
    mode: 'legacy',
    global: {
      locale: 'en',
      t: (key, fallback) => (fallback === undefined ? key : fallback),
    },
  };

  const httpModule = loadModule('assets/js/api/httpClient.js', env, {
    i18n,
    getAuthStore: () => authHolders.store || null,
    API_ENDPOINTS: endpoints.API_ENDPOINTS,
    API_CONFIG: endpoints.API_CONFIG,
    HTTP_STATUS: endpoints.HTTP_STATUS,
    axios: env.window.axios,
    ...identity,
  });

  if (!axiosInstance) {
    httpModule.apiClient.__state.transport = createTransport(routes);
  } else if (baseUrl === null) {
    throw new Error('bootApp: a real axios instance needs baseUrl, or the requests go to the default host');
  }

  if (baseUrl !== null) {
    httpModule.setApiClientBaseUrl(baseUrl);
  }

  const pinia = createPiniaStub();
  const toasts = [];
  const modals = [];

  const authModule = loadModule('assets/js/stores/authStore.js', { ...env, Pinia: pinia }, {
    apiClient: httpModule.apiClient,
    API_ENDPOINTS: endpoints.API_ENDPOINTS,
    i18n,
    getToastStore: () => ({ warning: (...args) => toasts.push({ level: 'warning', args }), error: (...args) => toasts.push({ level: 'error', args }), success: (...args) => toasts.push({ level: 'success', args }) }),
    getModalStore: () => ({ openLogin: () => modals.push('openLogin') }),
    ...identity,
    ...sessionStorageModule,
    ...protectedStateModule,
    ...coordinatorModule,
  });

  const store = pinia.defineStore.createStoreInstance('auth');
  authHolders.store = store;

  if (sessionConflictTimeoutMs !== null) {
    store.sessionConflictTimeoutMs = sessionConflictTimeoutMs;
  }

  return {
    env,
    storage: sharedStorage,
    locks,
    endpoints,
    http: httpModule,
    auth: store,
    /** Only a stand-in client has a programmable transport; a real one talks to a real socket. */
    transport: axiosInstance ? null : httpModule.apiClient.__state.transport,
    toasts,
    modals,
    console: recorder,
    clock: clockControl,
    pinia,
    /**
     * The store's own payload reader.
     *
     * A caller module that imports it must be handed the store's export, not a re-implementation:
     * two copies of this parser would be two opinions about what a valid session looks like.
     */
    readSessionPayload: authModule.readSessionPayload,
    /** The canonical record exactly as it is stored, for a direct assertion on what was written. */
    readRecord: () => JSON.parse(sharedStorage.getItem('auth-session-record') || 'null'),
    /**
     * The rotation predecessor, read from the record that is durable right now.
     *
     * A real rotation names the credential pair it replaces, captured immediately before the
     * request was dispatched. Tests do the same, so an `applyRotation()` call without a predecessor
     * is a refused write rather than an implicit "overwrite whatever you find".
     */
    predecessor: () => {
      const record = JSON.parse(sharedStorage.getItem('auth-session-record') || 'null');
      if (!record || !record.accessToken || !record.refreshToken) return null;
      return {
        identity: record.identity,
        sessionId: record.sessionId,
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
      };
    },
    /**
     * The same predecessor, taken from memory. A reduced-mode session is real to its tab even
     * though it is not durable, and a rotation of it still has to name what it replaces.
     */
    memoryPredecessor: () => {
      const own = store.readMemorySession();
      if (!own || !own.accessToken || !own.refreshToken) return null;
      return {
        identity: own.identity,
        sessionId: own.sessionId,
        accessToken: own.accessToken,
        refreshToken: own.refreshToken,
      };
    },
    /** Every write of the canonical record: "wrote once" and "wrote nothing" become assertable. */
    recordWrites: () => (sharedStorage._writes || []).filter((entry) => entry.key === 'auth-session-record').map((entry) => JSON.parse(entry.value)),
    /** What another tab's write does to this tab: the browser only fires `storage` elsewhere. */
    emitStorageEvent: (key = 'auth-session-record') => env.window._emit('storage', { key, newValue: sharedStorage.getItem(key) }),
  };
}

