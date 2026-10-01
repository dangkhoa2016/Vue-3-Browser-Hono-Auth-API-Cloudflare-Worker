/**
 * FR6-I / FR6-J — the *callers* of the session store, exercised as callers.
 *
 * The store-level suites prove that a commit is refused. They cannot prove what the page does with a
 * response that arrives after the session it belongs to is gone, because that is the caller's code:
 * the composable decides which context a request is allowed to speak for, the store decides whether a
 * profile write is applied, and the UI decides what the user is told. Those three live in
 * `useProfilePage.js`, `profileStore.js` and `useLoginModalForm.js`, so they are loaded here as
 * modules and driven exactly as the page drives them.
 *
 * Every scenario answers the same question in different words: after the response lands, what does
 * the tab the user is *now* looking at contain, and what was it told?
 *
 * Fixtures are fake credentials on loopback origins. No real API, no production host, no secrets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { API_A, NOW_SECONDS, ACCESS_TTL, REFRESH_TTL, bootApp, baseSession } from './helpers/app-harness.mjs';
import { createStorage, loadModule } from './helpers/browser-env.mjs';

const drain = () => new Promise((resolve) => setImmediate(resolve));

/**
 * The smallest honest stand-ins for the three reactivity helpers the composable imports.
 *
 * A `ref` is a live box: reading it reads the current value, writing it writes the current value. That
 * is the whole contract the composable relies on, and it is what makes `isSavingProfile.value = false`
 * in a `finally` observable at all.
 */
const ref = (value) => ({ value });
const computed = (getter) => {
  const box = { get value() { return getter(); } };
  return box;
};

/** `storeToRefs(store)`: a live ref per state key, exactly as the real one behaves. */
const storeToRefs = (store) => {
  const refs = {};
  for (const key of Object.keys(store)) {
    if (typeof store[key] === 'function') continue;
    refs[key] = {
      get value() { return store[key]; },
      set value(next) { store[key] = next; },
    };
  }
  return refs;
};

/**
 * Boots the profile store and the profile page against one app.
 *
 * The composable is a real module: `loadModule` injects the stores it imports, so the ownership
 * checks under test are the shipped ones, not a copy.
 */
function bootProfilePage({ routes = {}, storage = createStorage(), app = null } = {}) {
  // The transport reads this exact object per request, so a test can swap one route in place to
  // hold a response while the rest of the table keeps working.
  const routesTable = app ? (app.transport?.__routes || {}) : { ...routes };
  const booted = app || bootApp({ routes: routesTable, storage, baseUrl: API_A });
  const toasts = [];
  const modals = [];

  // The real profile store, registered in the app's own pinia, so the composable and the test share
  // one instance exactly as the page and the rest of the application do.
  loadModule('assets/js/stores/profileStore.js', { ...booted.env, Pinia: booted.pinia }, {
    apiClient: booted.http.apiClient,
    API_ENDPOINTS: booted.endpoints.API_ENDPOINTS,
  });
  const profileStore = booted.pinia.defineStore.createStoreInstance('profile');
  const mainStore = { mockApi: false };
  const modalStore = {
    openLogin: () => modals.push('openLogin'),
    closeAll: () => modals.push('closeAll'),
  };
  const toastStore = {
    success: (message) => toasts.push({ level: 'success', message }),
    error: (message) => toasts.push({ level: 'error', message }),
    warning: (message) => toasts.push({ level: 'warning', message }),
  };

  // The real gate calls `onAuthenticated` when the page loads; the fake one must too, or
  // `loadProfile()` would be a function that fetches nothing and the test would prove nothing.
  let gateCallbacks = {};
  const env = { ...booted.env, Pinia: { storeToRefs } };
  const bindings = {
    ref,
    computed,
    watch: () => {},
    useAuthStore: () => booted.auth,
    useProfileStore: () => profileStore,
    useMainStore: () => mainStore,
    useModalStore: () => modalStore,
    useToastStore: () => toastStore,
    useI18n: () => ({ t: (key) => key, locale: { value: 'en' } }),
    useAuthGate: () => ({
      showLoginRequired: { value: false },
      openLoginModal: () => modals.push('openLogin'),
      ensureAuthenticated: async () => {
        if (typeof gateCallbacks?.onAuthenticated === 'function') await gateCallbacks.onAuthenticated();
        return true;
      },
      handleAuthStateChange: async () => {
        if (typeof gateCallbacks?.onUnauthenticated === 'function') await gateCallbacks.onUnauthenticated();
        return true;
      },
      markUnauthenticated: () => modals.push('markUnauthenticated'),
    }),
    createAuthGateCallbacks: (callbacks) => {
      gateCallbacks = callbacks || {};
      return gateCallbacks;
    },
    useAuthStateChangeWatcher: () => {},
    useEnsureAuthenticatedLifecycle: () => {},
  };

  const composable = loadModule('vue/composables/useProfilePage.js', env, bindings);
  const page = composable.useProfilePage();

  return { app: booted, page, profileStore, toasts, modals, routes: routesTable, env };
}

/** Signs tab A in, so a page has a session whose context can be captured. */
async function signIn(app, { user = baseSession().user, access = baseSession().access_token, refresh = baseSession().refresh_token } = {}) {
  const context = app.auth.beginLoginAttempt();
  const result = await app.auth.commitLogin({
    user,
    accessToken: access,
    refreshToken: refresh,
    expiresAt: NOW_SECONDS + ACCESS_TTL,
    refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
  }, context);
  assert.equal(result.status, 'applied', 'the fixture session must be durable before the race starts');
  return app.readRecord();
}

const successBody = (data, message = '') => ({ status: 200, data: { success: true, data, message } });

test('FR6-I — a profile response for a replaced session mutates nothing the new session can see', async () => {
  const storage = createStorage();
  const { app, page, profileStore, toasts, routes } = bootProfilePage({ storage });

  await signIn(app);
  profileStore.profile = { full_name: 'Name A', email: 'a@example.test' };
  page.startEditingProfile();
  page.editForm.value = { full_name: 'Name B', email: 'b@example.test' };

  // The request is really in flight; only the *response* is withheld.
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  routes['put /api/user/profile'] = async () => {
    await held;
    return successBody({ full_name: 'Name B', email: 'b@example.test' });
  };

  const saving = page.saveProfile();
  await drain();

  // While the request is pending, the session is replaced by a completely different login.
  await signIn(app, {
    user: { id: 2, email: 'user2@example.test', role: 'user' },
    access: 'FAKE_ACCESS_B',
    refresh: 'FAKE_REFRESH_B',
  });
  const recordB = app.readRecord();
  profileStore.profile = { full_name: 'Other User', email: 'user2@example.test' };
  page.editForm.value = { full_name: 'Other User', email: 'user2@example.test' };

  // Now the response for the *old* session arrives.
  release();
  const outcome = await saving;
  await drain();

  assert.equal(outcome.applied, false, 'a response for a replaced session is not applied');
  assert.equal(outcome.reason, 'superseded-request');
  assert.deepEqual(profileStore.profile, { full_name: 'Other User', email: 'user2@example.test' }, 'the new session\'s profile is untouched');
  assert.equal(toasts.length, 0, 'and the page says nothing about a change the new session never made');
  assert.equal(app.readRecord().accessToken, recordB.accessToken, 'no token of B was replaced');
  assert.equal(app.readRecord().user.id, 2, 'the canonical record still describes B');
  assert.equal(page.isEditing.value, true, 'the old attempt does not close the editor of the new session');
});

test('FR6-I — a profile response for a session that was only *repointed* is refused too', async () => {
  const storage = createStorage();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const { app, page, profileStore, toasts, routes } = bootProfilePage({ storage });

  await signIn(app);
  profileStore.profile = { full_name: 'Name A', email: 'a@example.test' };
  page.startEditingProfile();
  page.editForm.value = { full_name: 'Name C', email: 'c@example.test' };

  routes['put /api/user/profile'] = async () => {
    await held;
    return successBody({ full_name: 'Name C', email: 'c@example.test' });
  };

  const saving = page.saveProfile();
  await drain();

  // Same user, same identity, but a *new login session* — a logout and a fresh sign-in between the
  // request and its answer. The response is still about the old lifecycle.
  await app.auth.logout();
  await signIn(app);
  const recordAfter = app.readRecord();
  assert.equal(recordAfter.state, 'active');

  release();
  const outcome = await saving;
  await drain();

  assert.equal(outcome.applied, false);
  assert.equal(toasts.length, 0, 'no success toast for a lifecycle that no longer exists');
  assert.equal(page.isEditing.value, true, 'and the new session\'s editor is left as it was');
  assert.equal(app.readRecord().version, recordAfter.version, 'the canonical record is not written by a stale caller');
});

test('FR6-I — a server save that the device could not store is reported as exactly that', async () => {
  const storage = createStorage();
  // A storage that reads fine and refuses to write: the server save succeeds, the local commit does not.
  const failing = createStorage();
  const app = bootApp({
    routes: { 'put /api/user/profile': async () => successBody({ full_name: 'Name Z', email: 'z@example.test' }, 'Saved on the server') },
    storage: failing,
    baseUrl: API_A,
  });
  const { page, profileStore, toasts } = bootProfilePage({ app, storage: failing });

  await signIn(app);
  profileStore.profile = { full_name: 'Name Y', email: 'y@example.test' };
  page.editForm.value = { full_name: 'Name Z', email: 'z@example.test' };

  // Break the writer *after* the session exists, so the login above is durable and the save is not.
  failing.setItem = () => { throw new Error('QuotaExceededError'); };

  const outcome = await page.saveProfile();

  assert.equal(outcome.applied, false, 'the page may not claim both systems agree');
  assert.equal(outcome.serverSaved, true, 'while still reporting the part that did happen');
  assert.ok(outcome.commit && outcome.commit.status !== 'applied', 'the refused commit is handed back, not dropped');
  assert.deepEqual(toasts.map((entry) => entry.level), ['error'], 'a failed local commit is an error, not a success');
  assert.equal(toasts[0].message, 'message.profile.update_success_local_failed', 'and the message names the local half');
  assert.notEqual(toasts[0].message, 'message.profile.update_success');
  assert.equal(page.isEditing.value, false, 'the editor closes: the server really did save it');
});

test('FR6-I — a refused profile commit keeps the tokens it was asked to keep', async () => {
  const storage = createStorage();
  const { app, page, profileStore, routes } = bootProfilePage({
    storage,
    routes: { 'put /api/user/profile': async () => successBody({ full_name: 'Name Z', email: 'z@example.test' }) },
  });

  await signIn(app);
  profileStore.profile = { full_name: 'Name Y', email: 'y@example.test' };
  page.editForm.value = { full_name: 'Name Z', email: 'z@example.test' };

  const before = app.readRecord();
  await page.saveProfile();

  const after = app.readRecord();
  assert.equal(after.accessToken, before.accessToken, 'a profile write never rotates the bearer');
  assert.equal(after.refreshToken, before.refreshToken);
  assert.equal(after.user.full_name, 'Name Z', 'the profile did land in the canonical record');
  assert.equal(after.version, before.version + 1, 'as a profile write of the same session');
  assert.equal(after.sessionId, before.sessionId, 'and the session did not change');
});

test('FR6-I — clearPendingEmail has the same ownership semantics as the profile save', async () => {
  const storage = createStorage();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const { app, page, profileStore, toasts, routes } = bootProfilePage({ storage });

  await signIn(app);
  profileStore.profile = { full_name: 'Name A', email: 'a@example.test', new_email: 'pending@example.test' };

  routes['delete /api/user/pending-email'] = async () => {
    await held;
    return successBody({ new_email: null, emailVerificationPending: false });
  };

  const clearing = page.clearPendingEmail();
  await drain();

  await signIn(app, {
    user: { id: 7, email: 'seven@example.test', role: 'user' },
    access: 'FAKE_ACCESS_SEVEN',
    refresh: 'FAKE_REFRESH_SEVEN',
  });
  const recordB = app.readRecord();

  release();
  const outcome = await clearing;
  await drain();

  assert.equal(outcome.applied, false);
  assert.equal(toasts.length, 0, 'no toast for a superseded clear');
  assert.equal(app.readRecord().accessToken, recordB.accessToken, 'and no token of the new session is touched');
  assert.equal(app.readRecord().user.new_email ?? null, null, 'the new session has no pending email either way');
});

test('FR6-I — a rotation between the request and the commit keeps the new tokens', async () => {
  const storage = createStorage();
  const { app, page, profileStore, routes } = bootProfilePage({ storage });

  await signIn(app);
  profileStore.profile = { full_name: 'Name Y', email: 'y@example.test' };
  page.editForm.value = { full_name: 'Name Rotated', email: 'y@example.test' };

  let release;
  const held = new Promise((resolve) => { release = resolve; });
  routes['put /api/user/profile'] = async () => {
    await held;
    return successBody({ full_name: 'Name Rotated', email: 'y@example.test' });
  };

  const saving = page.saveProfile();
  await drain();

  // A rotation of the *same* lifecycle lands while the save is pending: a valid change, and the
  // profile write must merge onto it rather than restoring the old bearer.
  const predecessor = {
    identity: app.readRecord().identity,
    sessionId: app.readRecord().sessionId,
    accessToken: app.readRecord().accessToken,
    refreshToken: app.readRecord().refreshToken,
  };
  const rotation = await app.auth.applyRotation({
    accessToken: 'FAKE_ACCESS_A_ROTATED',
    refreshToken: 'FAKE_REFRESH_A_ROTATED',
    expiresAt: NOW_SECONDS + ACCESS_TTL,
    refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
  }, app.auth.captureContext(), { predecessor });
  assert.equal(rotation.status, 'applied');

  release();
  const outcome = await saving;

  assert.equal(outcome.applied, true, 'a rotation of the same session does not supersede the request');
  const after = app.readRecord();
  assert.equal(after.accessToken, 'FAKE_ACCESS_A_ROTATED', 'the rotated bearer survives the profile write');
  assert.equal(after.user.full_name, 'Name Rotated', 'and the profile still lands');
  assert.equal(after.sessionId, predecessor.sessionId);
});

test('FR6-I — a reload of a committed profile keeps the metadata, and the loading flag belongs to the newest request', async () => {
  const storage = createStorage();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const { app, page, profileStore, routes } = bootProfilePage({ storage });

  await signIn(app);
  profileStore.profile = null;

  let first = true;
  routes['get /api/user/profile'] = async () => {
    if (first) {
      first = false;
      await held;
    }
    return successBody({ full_name: 'Name Reload', email: 'r@example.test' });
  };

  const slow = page.loadProfile();
  await drain();
  const faster = page.loadProfile();
  release();
  await Promise.all([slow, faster]);
  await drain();

  assert.equal(profileStore.loadingProfile, false, 'the flag is cleared by the request that owns it');
  assert.ok(profileStore.profile, 'the profile really was fetched: the route answered');
  assert.equal(profileStore.profile.full_name, 'Name Reload');
  assert.equal(page.editForm.value.full_name, 'Name Reload', 'and the form reflects the newest response, not the older one');
  assert.equal(app.readRecord().user.id, 1, 'the canonical record still describes the signed-in user');
  assert.equal(page.isEditing.value, false, 'a fetch does not open the editor');
});

test('FR6-J — a rejected login keeps its field errors and does not close the modal', async () => {
  const app = bootApp({
    baseUrl: API_A,
    routes: {
      'post /api/auth/login': {
        status: 422,
        data: {
          success: false,
          error: 'Validation failed',
          errors: [{ field: 'email', message: 'Email is already in use' }]
        }
      },
    },
  });

  const emitted = [];
  const composable = loadModule('vue/composables/useLoginModalForm.js', app.env, {
    useAuthStore: () => app.auth,
    readSessionPayload: app.readSessionPayload,
    apiClient: app.http.apiClient,
    hasFieldError: (list, field) => list.some((entry) => entry.field === field),
    normalizeFieldErrors: (data) => (Array.isArray(data?.errors) ? data.errors : []),
    useI18n: () => ({ t: (key) => key }),
    reactive: (value) => ({ ...value }),
    ref,
  });

  const form = composable.useLoginModalForm((...args) => emitted.push(args));
  form.formData.email = 'taken@example.test';
  form.formData.password = 'FAKE_PASSWORD';

  await form.handleLogin();

  assert.equal(form.errorMessage.value, 'Validation failed');
  assert.equal(form.fieldErrors.value.length, 1, 'the field error the server sent is kept');
  assert.equal(form.hasFieldError('email'), true, 'and the template can ask about it without throwing');
  assert.equal(form.isLoading.value, false, 'the button is released');
  assert.deepEqual(emitted, [], 'nothing is emitted for a rejected login');
  assert.equal(form.formData.email, 'taken@example.test', 'the form keeps what the user typed');
});

test('FR6-J — a sign-in the session record refuses does not close the modal as a success', async () => {
  const storage = createStorage();
  const app = bootApp({
    baseUrl: API_A,
    storage,
    routes: {
      'post /api/auth/login': async () => successBody({
        user: baseSession().user,
        access_token: 'FAKE_ACCESS_NEW',
        refresh_token: 'FAKE_REFRESH_NEW',
        expires_at: NOW_SECONDS + ACCESS_TTL,
        refresh_expires_at: NOW_SECONDS + REFRESH_TTL,
      }),
    },
  });

  // The application initialises the store at boot; a caller that skips it is testing a state the
  // product never has.
  app.auth.init();

  // The login response is fine and the request really reaches the transport; the *device* cannot
  // store the answer. A quota error is the honest shape of this: reads work, writes do not.
  const setItem = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (key === 'auth-session-record') throw new Error('QuotaExceededError');
    setItem(key, value);
  };

  const emitted = [];
  const composable = loadModule('vue/composables/useLoginModalForm.js', app.env, {
    useAuthStore: () => app.auth,
    readSessionPayload: app.readSessionPayload,
    apiClient: app.http.apiClient,
    hasFieldError: (list, field) => list.some((entry) => entry.field === field),
    normalizeFieldErrors: (data) => (Array.isArray(data?.errors) ? data.errors : []),
    useI18n: () => ({ t: (key) => key }),
    reactive: (value) => ({ ...value }),
    ref,
  });

  const form = composable.useLoginModalForm((...args) => emitted.push(args));
  form.formData.email = 'user@example.test';
  form.formData.password = 'FAKE_PASSWORD';

  await form.handleLogin();

  assert.equal(emitted.length, 0, 'a refused commit emits neither success nor close');
  assert.equal(form.errorMessage.value, 'message.auth.login_commit_failed', 'the form stays open with a reason');
  assert.equal(form.isLoading.value, false, 'and the button is released so the user can try again');
  assert.equal(app.auth.token, null, 'no token was adopted from a commit that did not land');
});

test('FR6-J — unsupported browser refuses sign-in and keeps the modal open', async () => {
  const storage = createStorage();
  const app = bootApp({
    baseUrl: API_A,
    storage,
    locks: null,
    routes: {
      'post /api/auth/login': async () => successBody({
        user: baseSession().user,
        access_token: 'FAKE_ACCESS_MEM',
        refresh_token: 'FAKE_REFRESH_MEM',
        expires_at: NOW_SECONDS + ACCESS_TTL,
        refresh_expires_at: NOW_SECONDS + REFRESH_TTL,
      }),
    },
  });
  app.auth.init();

  const emitted = [];
  const composable = loadModule('vue/composables/useLoginModalForm.js', app.env, {
    useAuthStore: () => app.auth,
    readSessionPayload: app.readSessionPayload,
    apiClient: app.http.apiClient,
    hasFieldError: (list, field) => list.some((entry) => entry.field === field),
    normalizeFieldErrors: (data) => (Array.isArray(data?.errors) ? data.errors : []),
    useI18n: () => ({ t: (key) => key }),
    reactive: (value) => ({ ...value }),
    ref,
  });

  const form = composable.useLoginModalForm((...args) => emitted.push(args));
  form.formData.email = 'user@example.test';
  form.formData.password = 'FAKE_PASSWORD';

  await form.handleLogin();

  assert.equal(form.errorMessage.value, 'message.auth.login_browser_unsupported');
  assert.equal(app.auth.token, null);
  assert.equal(app.transport.calls.filter(call => call.key === 'post /api/auth/login').length, 0);
  assert.equal(storage.getItem('auth-session-record'), null);
  assert.deepEqual(emitted, [], 'neither success nor close is emitted');
});

test('FR6-J — a login response for a superseded intent emits nothing at all', async () => {
  const storage = createStorage();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const app = bootApp({
    baseUrl: API_A,
    storage,
    routes: {
      'post /api/auth/login': async () => {
        await held;
        return successBody({
          user: baseSession().user,
          access_token: 'FAKE_ACCESS_SLOW',
          refresh_token: 'FAKE_REFRESH_SLOW',
          expires_at: NOW_SECONDS + ACCESS_TTL,
          refresh_expires_at: NOW_SECONDS + REFRESH_TTL,
        });
      },
    },
  });

  const emitted = [];
  const composable = loadModule('vue/composables/useLoginModalForm.js', app.env, {
    useAuthStore: () => app.auth,
    readSessionPayload: app.readSessionPayload,
    apiClient: app.http.apiClient,
    hasFieldError: (list, field) => list.some((entry) => entry.field === field),
    normalizeFieldErrors: (data) => (Array.isArray(data?.errors) ? data.errors : []),
    useI18n: () => ({ t: (key) => key }),
    reactive: (value) => ({ ...value }),
    ref,
  });

  const form = composable.useLoginModalForm((...args) => emitted.push(args));
  form.formData.email = 'user@example.test';
  form.formData.password = 'FAKE_PASSWORD';

  const slow = form.handleLogin();
  await drain();

  // A newer intent starts while the request is in the air. The response belongs to the old one.
  const newer = app.auth.beginLoginAttempt();
  release();
  await slow;
  await drain();

  assert.deepEqual(emitted, [], 'no success and no close for an attempt that was replaced');
  assert.equal(form.errorMessage.value, 'message.auth.login_superseded', 'and the form says why');
  assert.equal(form.isLoading.value, false);
  assert.notEqual(app.auth.sessionGeneration, null);
  assert.ok(newer, 'the newer intent is what the store works from');
});

for (const [method, verb, endpoint, payload] of [
  ['fetchProfile', 'get', '/api/user/profile', null],
  ['saveProfile', 'put', '/api/user/profile', {full_name:'After reset'}],
  ['clearPendingEmail', 'delete', '/api/user/pending-email', null],
  ['changePassword', 'put', '/api/user/change-password', {currentPassword:'FAKE_OLD',newPassword:'FAKE_NEW'}]
]) {
  for (const callerCurrent of [true,false]) test(`profile ${method}: independent caller/store counters after reset, callerCurrent=${callerCurrent}`,async()=>{
    const {app,profileStore,routes}=bootProfilePage();
    await signIn(app);
    profileStore.resetProfile(); // Store generation survives a page's local attempt counter.
    let requests=0;
    routes[`${verb} ${endpoint}`]=()=>{requests++;return successBody({full_name:'After reset',new_email:null});};
    const guard={isCurrent:()=>true,operationId:1,currentOperationId:()=>callerCurrent?1:2};
    const result=payload
      ? await profileStore[method](app.auth.token,payload,guard)
      : await profileStore[method](app.auth.token,guard);
    assert.equal(requests,1,'the operation reached the real transport');
    assert.equal(result.success,callerCurrent,'compare each counter only with its own owner');
    if(!callerCurrent)assert.equal(result.stale,true);
    assert.equal(profileStore.loadingProfile,false,'the completed store operation releases its flag');
  });
}
