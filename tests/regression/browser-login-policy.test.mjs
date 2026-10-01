import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, baseSession, API_A } from './helpers/app-harness.mjs';
import { createStorage, loadModule } from './helpers/browser-env.mjs';

function loginForm(app) {
  const emitted = [];
  const module = loadModule('vue/composables/useLoginModalForm.js', app.env, {
    useAuthStore: () => app.auth, readSessionPayload: app.readSessionPayload,
    apiClient: app.http.apiClient,
    hasFieldError: () => false, normalizeFieldErrors: () => [],
    useI18n: () => ({ t: key => key }), reactive: value => ({ ...value }),
    ref: value => ({ value })
  });
  const form = module.useLoginModalForm((...args) => emitted.push(args));
  form.formData.email = 'policy@example.test';
  form.formData.password = 'FAKE_POLICY_PASSWORD';
  return { form, emitted };
}
for (const missing of ['locks', 'storage-write', 'storage-read', 'storage-remove']) {
  test(`owner option 2: ${missing} blocks login before credentials leave the tab`, async () => {
    const storage = createStorage();
    const app = bootApp({ storage, baseUrl: API_A, ...(missing === 'locks' ? { locks: null } : {}), routes: {
      'post /api/auth/login': async () => ({ status: 200, data: { success: true, data: baseSession() } })
    } });
    if (missing === 'storage-write') storage.setItem = () => { throw Error('quota'); };
    if (missing === 'storage-read') storage.getItem = () => { throw Error('denied'); };
    if (missing === 'storage-remove') storage.removeItem = () => { throw Error('denied'); };
    const { form, emitted } = loginForm(app);
    await form.handleLogin();
    assert.equal(app.transport.calls.filter(c => c.key === 'post /api/auth/login').length, 0);
    assert.equal(app.auth.isAuthenticated, false);
    assert.equal(app.auth.token, null);
    assert.equal(form.errorMessage.value, 'message.auth.login_browser_unsupported');
    assert.equal(form.isLoading.value, false);
    assert.deepEqual(emitted, []);
  });
}
test('owner option 2: direct login cannot adopt a memory-only credential', async () => {
  const storage = createStorage({ preference: 'keep' });
  const app = bootApp({ storage, locks: null, baseUrl: API_A });
  const p = baseSession();
  const result = await app.auth.login(p.user, p.access_token, p.refresh_token, p.expires_at, p.refresh_expires_at);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.memoryOnly, undefined);
  assert.equal(app.auth.token, null);
  assert.equal(app.auth.user, null);
  assert.equal(app.auth.isAuthenticated, false);
  assert.equal(storage.getItem('preference'), 'keep');
  assert.equal(storage.getItem('auth-session-record'), null);
});

test('owner option 2: readable but unwritable storage cannot silently restore a login', async () => {
  const storage = createStorage();
  const first = bootApp({ storage, baseUrl: API_A });
  const p = baseSession();
  await first.auth.login(p.user, p.access_token, p.refresh_token, p.expires_at, p.refresh_expires_at);
  const original = storage.getItem('auth-session-record');
  storage.setItem = () => { throw Error('quota'); };
  const next = bootApp({ storage, baseUrl: API_A });
  next.auth.init();
  assert.equal(next.auth.isAuthenticated, false);
  assert.equal(next.auth.adoptSession(), false);
  assert.equal(storage.getItem('auth-session-record'), original);
});

test('owner option 2: support probe preserves session keys and leaves no probe behind', () => {
  const storage = createStorage({ preference: 'keep', token: 'FAKE_OTHER_TAB' });
  const app = bootApp({ storage, baseUrl: API_A });
  const before = JSON.stringify(storage._dump());
  assert.equal(app.auth.checkLoginSupport().supported, true);
  assert.equal(JSON.stringify(storage._dump()), before);
});

test('owner option 2: a refused submit supersedes an older queued login commit', async () => {
  const { createLockManager } = await import('./helpers/browser-env.mjs');
  const { WRITER_LOCK_NAME } = await import('./helpers/app-harness.mjs');
  const locks = createLockManager();
  const storage = createStorage();
  const app = bootApp({ storage, locks, baseUrl: API_A, routes: {
    'post /api/auth/login': async () => ({ status: 200, data: { success: true, data: baseSession() } })
  } });
  const release = await locks.hold(WRITER_LOCK_NAME);
  const { form, emitted } = loginForm(app);
  const first = form.handleLogin();
  for (let i = 0; i < 20 && locks.pending(WRITER_LOCK_NAME) === 0; i++) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(locks.pending(WRITER_LOCK_NAME), 1, 'first response reached the writer queue');
  const setItem = storage.setItem;
  storage.setItem = () => { throw Error('quota'); };
  await form.handleLogin();
  storage.setItem = setItem;
  release();
  await first;
  assert.equal(app.auth.isAuthenticated, false);
  assert.equal(app.auth.token, null);
  assert.equal(storage.getItem('auth-session-record'), null);
  assert.equal(form.errorMessage.value, 'message.auth.login_browser_unsupported');
  assert.deepEqual(emitted, []);
});
