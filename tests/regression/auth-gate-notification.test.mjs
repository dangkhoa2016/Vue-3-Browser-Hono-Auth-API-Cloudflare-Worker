import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserEnv, loadModule } from './helpers/browser-env.mjs';

function setup({ onAuthenticated = async () => {}, onModalSuccess } = {}) {
  const env = createBrowserEnv();
  const authStore = { isAuthenticated: false, apiIdentity: 'http://127.0.0.1:18788', sessionId: '', sessionGeneration: 0 };
  let success;
  const { useAuthGate } = loadModule('vue/composables/useAuthGate.js', env, {
    ref: value => ({ value }),
    computed: read => ({ get value() { return read(); } }),
    useSessionContextWatch: () => {},
  });
  const gate = useAuthGate({ authStore, autoInit: false, onAuthenticated, onModalSuccess,
    modalStore: { openLogin: callback => { success = callback; } } });
  const signIn = (id = 'session-1') => {
    authStore.isAuthenticated = true;
    authStore.sessionId = id;
    authStore.sessionGeneration++;
  };
  return { gate, signIn, success: () => success() };
}

for (const pending of [true, false]) {
  test(`login modal does not repeat the observer's authenticated notification (${pending ? 'pending' : 'completed'})`, async () => {
    let calls = 0;
    let release;
    const blocked = new Promise(resolve => { release = resolve; });
    const app = setup({ onAuthenticated: async () => { calls++; if (pending) await blocked; } });
    await app.gate.ensureAuthenticated();
    app.signIn();
    const observed = app.gate.handleAuthStateChange(true);
    if (!pending) await observed;
    const modal = app.success();
    assert.equal(calls, 1);
    release();
    await Promise.all([observed, modal]);
    assert.equal(app.gate.showLoginRequired.value, false);
  });
}

test('modal-first login notifies once and later sessions can notify again', async () => {
  let calls = 0;
  const app = setup({ onAuthenticated: async () => { calls++; } });
  await app.gate.ensureAuthenticated();
  app.signIn();
  await app.success();
  await app.gate.handleAuthStateChange(true);
  assert.equal(calls, 1);
  app.gate.markUnauthenticated();
  app.gate.openLoginModal();
  app.signIn('session-2');
  await app.gate.handleAuthStateChange(true);
  await app.success();
  assert.equal(calls, 2);
  // Explicit page loading/retry must still fetch in the current session.
  await app.gate.ensureAuthenticated();
  assert.equal(calls, 3);
});

test('an explicit modal-success callback retains its distinct behavior', async () => {
  let notifications = 0;
  let modalCalls = 0;
  const app = setup({ onAuthenticated: async () => { notifications++; }, onModalSuccess: async () => { modalCalls++; } });
  await app.gate.ensureAuthenticated();
  app.signIn();
  await app.gate.handleAuthStateChange(true);
  await app.success();
  assert.equal(notifications, 1);
  assert.equal(modalCalls, 1);
});

test('a new session in an already authenticated page is not mistaken for the previous notification', async () => {
  let calls = 0;
  const app = setup({ onAuthenticated: async () => { calls++; } });
  app.signIn('session-1');
  await app.gate.ensureAuthenticated();
  app.gate.openLoginModal();
  app.signIn('session-2');
  await app.success();
  assert.equal(calls, 2);
});
