/**
 * Regression tests for F05: UI adaptation to backend capabilities and error codes.
 *
 * The invariant under test: the UI never claims a capability or a success the backend did not
 * confirm at a published contract position. A legacy backend, a missing capability map and an
 * explicit `false` all resolve to the conservative "unsupported" state.
 *
 * Fixtures: fake tokens and loopback origins only. No production API, no secrets.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  REPO_ROOT,
  createBrowserEnv,
  createFakeAxios,
  createPiniaStub,
  createRecordingConsole,
  createTransport,
  loadModule,
  ok,
  fail,
} from './helpers/browser-env.mjs';

/** Pure contract helpers, loaded once: they hold no session or transport state. */
const appContractHelpers = loadModule(
  'assets/js/api/backendContract.js',
  createBrowserEnv({ console: createRecordingConsole() })
);

const readRepoFile = (relativePath) => readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');

/**
 * A 2xx body exactly as given. `ok()` wraps its payload in the success envelope, which is not
 * usable for the semantic-success tests: those need to control the top-level `success` field.
 */
const raw = (data, status = 200) => ({ status, data });

const FAKE_SECRET = 'sk_live_DO_NOT_DISPLAY_0123456789';
const FAKE_MASKED = 'sk_live_****6789';

function loadContract(env) {
  return loadModule('assets/js/api/backendContract.js', env);
}

function bootHttpClient(env, routes) {
  env.window.axios = createFakeAxios();
  const endpoints = loadModule('assets/js/api/endpoints.js', env);
  const identity = loadModule('assets/js/api/apiIdentity.js', env);
  const httpModule = loadModule('assets/js/api/httpClient.js', env, {
    i18n: { mode: 'legacy', global: { locale: 'en', t: (key, fallback) => (fallback === undefined ? key : fallback) } },
    getAuthStore: () => null,
    API_ENDPOINTS: endpoints.API_ENDPOINTS,
    API_CONFIG: endpoints.API_CONFIG,
    HTTP_STATUS: endpoints.HTTP_STATUS,
    axios: env.window.axios,
    ...identity,
  });
  httpModule.apiClient.__state.transport = createTransport(routes);
  return { httpModule, endpoints, identity, transport: httpModule.apiClient.__state.transport };
}

function bootAuditStore({ routes = {} } = {}) {
  const env = createBrowserEnv({ console: createRecordingConsole() });
  const contract = loadContract(env);
  const { httpModule, endpoints, transport, identity } = bootHttpClient(env, routes);

  const pinia = createPiniaStub();
  const protectedState = loadModule('assets/js/api/protectedState.js', env);
  loadModule('assets/js/stores/advancedAuditStore.js', { ...env, Pinia: pinia }, {
    apiClient: httpModule.apiClient,
    API_ENDPOINTS: endpoints.API_ENDPOINTS,
    ...identity,
    ...protectedState,
    ...contract,
  });

  return {
    env,
    store: pinia.defineStore.createStoreInstance('advancedAudit'),
    contract,
    identity,
    transport,
    protectedState
  };
}

function bootMonitoringStore({ routes = {} } = {}) {
  const env = createBrowserEnv({ console: createRecordingConsole() });
  const contract = loadContract(env);
  const toasts = [];
  const { httpModule, endpoints, transport } = bootHttpClient(env, routes);

  const pinia = createPiniaStub();
  loadModule('assets/js/stores/realtimeMonitoringStore.js', { ...env, Pinia: pinia }, {
    apiClient: httpModule.apiClient,
    API_ENDPOINTS: endpoints.API_ENDPOINTS,
    buildRealtimeMonitoringThreatResolveEndpoint: (id) => `/api/realtime-monitoring/threats/${id}/resolve`,
    buildRealtimeMonitoringAlertRuleToggleEndpoint: (id) => `/api/realtime-monitoring/alert-rules/${id}/toggle`,
    DEFAULT_ADMIN_PAGE_SIZE: 25,
    resolveAdminPageSize: (value) => Number(value) || 25,
    getToastStore: () => ({ success: (...a) => toasts.push(a), error: (...a) => toasts.push(a), warning: (...a) => toasts.push(a) }),
    i18n: { global: { t: (key, fallback) => (fallback === undefined ? key : fallback) } },
    useMainStore: () => ({ adminPageSize: 25 }),
    ...contract,
  });

  return { env, store: pinia.defineStore.createStoreInstance('realtimeMonitoring'), contract, transport, toasts };
}

function bootEnvComparisonStore({ routes = {} } = {}) {
  const env = createBrowserEnv({ console: createRecordingConsole() });
  const contract = loadContract(env);
  const { httpModule, transport } = bootHttpClient(env, routes);

  const pinia = createPiniaStub();
  loadModule('assets/js/stores/kvAdminEnvComparisonStore.js', { ...env, Pinia: pinia }, {
    apiClient: httpModule.apiClient,
    ...contract,
  });

  return { env, store: pinia.defineStore.createStoreInstance('kvAdminEnvComparison'), contract, transport };
}

function bootEnvComparisonPage(store) {
  const env = createBrowserEnv({ console: createRecordingConsole() });
  const authStore = { user: { role: 'super_admin' }, token: 'FAKE_ACCESS', isAuthenticated: true, logout() {} };
  const toasts = [];
  const composable = (value) => ({ value });
  const storeToRefs = (source) => Object.keys(source).reduce((refs, key) => {
    refs[key] = composable(source[key]);
    return refs;
  }, {});

  const { useKvAdminEnvComparisonPage } = loadModule('vue/composables/useKvAdminEnvComparisonPage.js', env, {
    computed: (getter) => ({ get value() { return getter(); } }),
    ref: composable,
    watch: () => {},
    Pinia: { storeToRefs },
    useAuthStore: () => authStore,
    useModalStore: () => ({}),
    useToastStore: () => ({ add: (...a) => toasts.push(a) }),
    useMainStore: () => ({}),
    useKvAdminEnvComparisonStore: () => store,
    useAuthGate: () => ({
      showLoginRequired: { value: false },
      openLoginModal: () => {},
      ensureAuthenticated: async () => {},
      handleAuthStateChange: () => {},
      markUnauthenticated: () => {},
    }),
    createAuthGateCallbacks: () => ({}),
    useAuthStateChangeWatcher: () => {},
    useEnsureAuthenticatedLifecycle: () => {},
    useI18nFallback: () => ({ t: (key, fallback) => (fallback === undefined ? key : fallback), tf: (key, fallback) => (fallback === undefined ? key : fallback) }),
    useMockApiChangeWatcher: () => {},
  });

  return useKvAdminEnvComparisonPage();
}

const plain = (value) => JSON.parse(JSON.stringify(value));

const deepScan = (value, needle, path = 'state') => {
  if (typeof value === 'string') {
    assert.ok(!value.includes(needle), `${path} must not contain a raw secret`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => deepScan(item, needle, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) deepScan(item, needle, `${path}.${key}`);
  }
};

describe('F05 — contract adapter reads published fields only', () => {
  test('a capability is supported only when explicitly true', () => {
    const { readCapability, isCapabilitySupported, CAPABILITY_KEYS } = loadContract(createBrowserEnv());

    assert.equal(readCapability({ continuousMonitoring: true }, CAPABILITY_KEYS.CONTINUOUS_MONITORING), true);
    assert.equal(readCapability({ continuousMonitoring: false }, CAPABILITY_KEYS.CONTINUOUS_MONITORING), false);
    assert.equal(readCapability({}, CAPABILITY_KEYS.CONTINUOUS_MONITORING), null, 'missing capability is unknown');
    assert.equal(readCapability(null, CAPABILITY_KEYS.CONTINUOUS_MONITORING), null);
    assert.equal(readCapability({ continuousMonitoring: 'yes' }, CAPABILITY_KEYS.CONTINUOUS_MONITORING), null, 'non-boolean is unknown');
    assert.equal(isCapabilitySupported({ continuousMonitoring: false }, CAPABILITY_KEYS.CONTINUOUS_MONITORING), false);
    assert.equal(isCapabilitySupported(null, CAPABILITY_KEYS.CONTINUOUS_MONITORING), false);
  });

  test('capability map is found at the published envelope positions and merged forward only', () => {
    const { readCapabilityMap, mergeCapabilityMap } = loadContract(createBrowserEnv());

    assert.deepEqual(plain(readCapabilityMap({ capabilities: { exportPdf: true } })), { exportPdf: true });
    assert.deepEqual(plain(readCapabilityMap({ data: { capabilities: { exportCsv: true } } })), { exportCsv: true });
    assert.equal(readCapabilityMap({ data: { something: 1 } }), null);
    assert.deepEqual(plain(mergeCapabilityMap({ exportPdf: true }, { data: { capabilities: { exportCsv: true } } })), { exportPdf: true, exportCsv: true });
    assert.equal(mergeCapabilityMap(null, { data: {} }), null, 'a response without capabilities cannot invent one');
  });

  test('error codes are read from machine fields, never from a localized message', () => {
    const { readErrorCode, isUnsupportedError } = loadContract(createBrowserEnv());

    assert.equal(readErrorCode({ response: { data: { error: { code: 'UNSUPPORTED_EXPORT_OPTION', message: 'PDF export unavailable' } } } }), 'UNSUPPORTED_EXPORT_OPTION');
    assert.equal(readErrorCode({ response: { data: { data: { code: 'DB_UNAVAILABLE' } } } }), 'DB_UNAVAILABLE');
    assert.equal(readErrorCode({ response: { data: { error: 'Không hỗ trợ PDF' } } }), null, 'a message alone yields no code');
    assert.equal(isUnsupportedError({ response: { status: 422, data: { error: { code: 'UNSUPPORTED_MONITORING_MODE' } } } }), true);
    assert.equal(isUnsupportedError({ response: { status: 422, data: { error: 'anything' } } }), true, '422 is an unsupported option by contract');
    assert.equal(isUnsupportedError({ response: { status: 500, data: { error: { code: 'DB_UNAVAILABLE' } } } }), false);
  });
});

describe('F05 — continuous monitoring follows the backend, never an optimistic flag', () => {
  test('start is blocked without a published capability and no request is sent', async () => {
    const app = bootMonitoringStore();

    await assert.rejects(
      () => app.store.startMonitoring(5000, true),
      (error) => error.isUnsupported === true && error.code === 'UNSUPPORTED_MONITORING_MODE'
    );
    assert.equal(app.transport.calls.length, 0);
    assert.equal(app.store.isContinuousMonitoringSupported, false);
    assert.equal(app.store.isMonitoringActive, false);
  });

  test('an explicit false capability is reported as confirmed-but-disabled', async () => {
    const app = bootMonitoringStore();
    app.store.captureCapabilities({ data: { capabilities: { continuousMonitoring: false } } });

    assert.equal(app.store.isContinuousMonitoringConfirmed, true);
    assert.equal(app.store.isContinuousMonitoringSupported, false);

    await assert.rejects(() => app.store.startMonitoring(5000, true), (error) => error.isUnsupported === true);
    assert.equal(app.transport.calls.length, 0);
  });

  test('a start response without an explicit active flag must not claim active monitoring', async () => {
    const app = bootMonitoringStore({
      routes: { 'post /api/realtime-monitoring/monitoring/start': ok({ startedAt: '2026-09-26T00:00:00.000Z' }) },
    });
    app.store.captureCapabilities({ capabilities: { continuousMonitoring: true } });

    await app.store.startMonitoring(5000, true);

    assert.equal(app.transport.calls.length, 1);
    assert.equal(app.store.isMonitoringActive, false, 'no server-confirmed active flag means not active');
  });

  test('422 UNSUPPORTED_MONITORING_MODE never becomes an active monitoring state', async () => {
    const app = bootMonitoringStore({
      routes: {
        'post /api/realtime-monitoring/monitoring/start': fail(422, 'UNSUPPORTED_MONITORING_MODE', 'continuous mode is unavailable'),
      },
    });
    app.store.captureCapabilities({ capabilities: { continuousMonitoring: true } });

    const result = await app.store.startMonitoring(5000, true);

    assert.equal(result, null);
    assert.equal(app.store.isMonitoringActive, false);
    assert.equal(app.store.monitoringUnsupportedCode, 'UNSUPPORTED_MONITORING_MODE');
  });

  test('status polling after start/stop keeps the active flag server-owned', async () => {
    const app = bootMonitoringStore({
      routes: {
        'get /api/realtime-monitoring/monitoring/status': ok({ isActive: false }),
        'post /api/realtime-monitoring/monitoring/start': ok({ isActive: true }),
        'post /api/realtime-monitoring/monitoring/stop': ok({ isActive: false }),
      },
    });

    await app.store.fetchMonitoringStatus();
    assert.equal(app.store.isMonitoringActive, false);

    app.store.captureCapabilities({ capabilities: { continuousMonitoring: true } });
    await app.store.startMonitoring(5000, true);
    assert.equal(app.store.isMonitoringActive, true, 'a confirmed active flag is shown');

    await app.store.stopMonitoring();
    assert.equal(app.store.isMonitoringActive, false);

    await app.store.fetchMonitoringStatus();
    assert.equal(app.store.isMonitoringActive, false, 'a later status poll must win over local optimism');
  });

  test('capabilities published on the status payload unlock the start control', async () => {
    const app = bootMonitoringStore({
      routes: {
        'get /api/realtime-monitoring/monitoring/status': ok({ isActive: false, capabilities: { continuousMonitoring: true } }),
        'post /api/realtime-monitoring/monitoring/start': ok({ isActive: true }),
      },
    });

    await app.store.fetchMonitoringStatus();
    assert.equal(app.store.isContinuousMonitoringSupported, true);

    await app.store.startMonitoring(5000, true);
    assert.equal(app.store.isMonitoringActive, true);
  });
});

