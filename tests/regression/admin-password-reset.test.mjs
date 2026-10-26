import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/browser-env.mjs';

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function boot({ role = 'admin', mockApi = false, reset } = {}) {
  const calls = [], toasts = [], watches = [], unmounts = [];
  let identity = 1;
  const authStore = {
    isAuthenticated: true, user: { id: 1, role }, captureContext: () => identity,
    isCurrentContext: context => context === identity
  };
  const mainStore = { mockApi, apiBaseUrl: 'http://127.0.0.1:18788' };
  const { useAdminPasswordReset } = loadModule('vue/composables/useAdminPasswordReset.js', { TextEncoder }, {
    ref: value => ({ value }),
    watch: (source, callback) => watches.push(callback),
    onBeforeUnmount: callback => unmounts.push(callback)
  });
  const ui = useAdminPasswordReset({ authStore, mainStore,
    userStore: { resetUserPassword: async (...args) => { calls.push(args); return reset ? reset(...args) : { success: true }; } },
    toastStore: { success: text => toasts.push(text) }, t: key => key
  });
  const open = (user = { id: 2, role: 'user', email: 'target@example.invalid' }) => ui.openPasswordReset(user);
  const fill = (password = ' New-password-9! ', confirmation = password) => {
    ui.resetPasswordForm.value = { newPassword: password, confirmPassword: confirmation };
  };
  return { ui, calls, toasts, open, fill, authStore, mainStore, changeIdentity: () => { identity++; watches.forEach(fn => fn()); }, unmount: () => unmounts.forEach(fn => fn()) };
}

test('the reset action follows strict role hierarchy and excludes self, anonymous and unknown roles', () => {
  for (const role of ['user', 'admin', 'super_admin']) {
    const { ui, authStore } = boot({ role });
    for (const targetRole of ['user', 'admin', 'super_admin', 'unknown']) {
      const allowed = (role === 'admin' && targetRole === 'user') || (role === 'super_admin' && ['user', 'admin'].includes(targetRole));
      assert.equal(ui.canResetPassword({ id: 2, role: targetRole }), allowed);
      assert.equal(ui.canResetPassword({ id: 1, role: targetRole }), false);
    }
    authStore.isAuthenticated = false;
    assert.equal(ui.canResetPassword({ id: 2, role: 'user' }), false);
  }
});
test('confirmation and byte limits reject invalid input before transport; passwords keep exact whitespace', async () => {
  const h = boot(); h.open();
  for (const [pw, confirm] of [['short', 'short'], ['valid-password', 'different'], ['é'.repeat(37), 'é'.repeat(37)]]) {
    h.fill(pw, confirm); await h.ui.submitPasswordReset();
    assert.equal(h.calls.length, 0); assert.ok(h.ui.resetPasswordError.value);
  }
  h.fill(); await h.ui.submitPasswordReset();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], 2);
  assert.equal(h.calls[0][1].newPassword, ' New-password-9! ');
  assert.equal(h.ui.showPasswordReset.value, false);
  assert.equal(h.ui.resetPasswordForm.value.newPassword, '');
  assert.equal(h.toasts.length, 1);
});
test('duplicate submits make one request and closing clears credentials while suppressing late success', async () => {
  const pending = deferred(); const h = boot({ reset: () => pending.promise }); h.open(); h.fill();
  const first = h.ui.submitPasswordReset(); await h.ui.submitPasswordReset();
  assert.equal(h.calls.length, 1);
  h.ui.closePasswordReset();
  assert.equal(h.ui.resetPasswordForm.value.newPassword, '');
  pending.resolve({ success: true }); await first;
  assert.equal(h.toasts.length, 0);
});
for (const outcome of ['success', 'failure']) test(`identity change clears secrets and ignores late ${outcome}`, async () => {
  const pending = deferred(); const h = boot({ reset: () => pending.promise }); h.open(); h.fill();
  const first = h.ui.submitPasswordReset(); h.changeIdentity();
  assert.equal(h.ui.showPasswordReset.value, false);
  assert.equal(h.ui.resetPasswordForm.value.newPassword, '');
  if (outcome === 'success') pending.resolve({ success: true }); else pending.reject(new Error('Old backend response'));
  await first; assert.equal(h.toasts.length, 0); assert.equal(h.ui.resetPasswordError.value, '');
});
test('server failure is visible and never automatically retried; unmount clears the form', async () => {
  const h = boot({ reset: () => Promise.reject(new Error('Reset unavailable')) }); h.open(); h.fill();
  await h.ui.submitPasswordReset(); assert.equal(h.calls.length, 1);
  assert.equal(h.ui.resetPasswordError.value, 'Reset unavailable');
  assert.equal(h.ui.resetPasswordForm.value.newPassword, '');
  assert.equal(h.ui.showPasswordReset.value, true);
  h.unmount(); assert.equal(h.ui.showPasswordReset.value, false);
});
test('mock mode explains that credentials cannot be reset instead of pretending success', async () => {
  const h = boot({ mockApi: true }); h.open(); h.fill(); await h.ui.submitPasswordReset();
  assert.equal(h.calls.length, 0); assert.equal(h.toasts.length, 0);
  assert.equal(h.ui.resetPasswordError.value, 'message.admin_password_reset.mock_unavailable');
});

test('the store sends only the dedicated password fields and rejects an unsuccessful response', async () => {
  const { API_ENDPOINTS } = loadModule('assets/js/api/endpoints.js', {});
  const requests = [];
  let success = true;
  const { useUserStore } = loadModule('assets/js/stores/userStore.js', {
    Pinia: { defineStore: (_name, options) => options }
  }, { API_ENDPOINTS, apiClient: { post: async (url, body) => {
    requests.push({ url, body }); return { data: { success, message: 'Fixture result' } };
  } } });
  const reset = useUserStore.actions.resetUserPassword;
  await reset.call({}, 2, { newPassword: ' Exact-password-1 ', confirmPassword: ' Exact-password-1 ', role: 'super_admin' });
  assert.equal(requests[0].url, '/api/admin/users/2/reset-password');
  assert.deepEqual(Object.keys(requests[0].body).sort(), ['confirmPassword', 'newPassword']);
  assert.equal(requests[0].body.newPassword, ' Exact-password-1 ');
  success = false;
  await assert.rejects(() => reset.call({}, 2, { newPassword: 'Valid-password', confirmPassword: 'Valid-password' }), /Fixture result/);
});
