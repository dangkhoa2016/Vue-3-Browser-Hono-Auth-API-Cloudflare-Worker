import { onBeforeUnmount, ref, watch } from 'vue';

export function useAdminPasswordReset({ authStore, mainStore, userStore, toastStore, t }) {
  const showPasswordReset = ref(false);
  const passwordResetUser = ref(null);
  const resetPasswordForm = ref({ newPassword: '', confirmPassword: '' });
  const resetPasswordError = ref('');
  const isResettingPassword = ref(false);
  let attempt = 0;
  let alive = true;
  const canResetPassword = user => {
    if (!authStore.isAuthenticated || !user?.id || String(user.id) === String(authStore.user?.id)) return false;
    return (authStore.user?.role === 'admin' && user.role === 'user')
      || (authStore.user?.role === 'super_admin' && ['user', 'admin'].includes(user.role));
  };
  const clearPasswords = () => { resetPasswordForm.value = { newPassword: '', confirmPassword: '' }; };
  const closePasswordReset = () => {
    attempt++;
    showPasswordReset.value = false;
    passwordResetUser.value = null;
    resetPasswordError.value = '';
    isResettingPassword.value = false;
    clearPasswords();
  };
  const openPasswordReset = user => {
    if (!canResetPassword(user)) return;
    closePasswordReset();
    passwordResetUser.value = { id: user.id, role: user.role, email: user.email, full_name: user.full_name };
    showPasswordReset.value = true;
  };
  const submitPasswordReset = async () => {
    if (!showPasswordReset.value || isResettingPassword.value || !canResetPassword(passwordResetUser.value)) return;
    resetPasswordError.value = '';
    if (mainStore.mockApi) {
      resetPasswordError.value = t('message.admin_password_reset.mock_unavailable');
      clearPasswords();
      return;
    }
    const { newPassword, confirmPassword } = resetPasswordForm.value;
    if (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      resetPasswordError.value = t('message.admin_password_reset.policy');
      return;
    }
    if (newPassword !== confirmPassword) {
      resetPasswordError.value = t('message.admin_password_reset.mismatch');
      return;
    }
    const operation = ++attempt;
    const context = authStore.captureContext();
    const owns = () => alive && operation === attempt && authStore.isCurrentContext(context);
    isResettingPassword.value = true;
    try {
      await userStore.resetUserPassword(passwordResetUser.value.id, { newPassword, confirmPassword });
      if (!owns()) return;
      toastStore.success(t('message.admin_password_reset.success'));
      closePasswordReset();
    } catch (error) {
      if (!owns()) return;
      resetPasswordError.value = error?.response?.data?.message || error.message || t('message.admin_password_reset.failed');
    } finally {
      if (owns()) { isResettingPassword.value = false; clearPasswords(); }
    }
  };
  // Compare identity fields individually: replacing the same user's object during
  // token/profile synchronization must preserve a form that is still being edited.
  watch([
    () => authStore.isAuthenticated, () => authStore.user?.id, () => authStore.user?.role,
    () => authStore.sessionId, () => authStore.apiIdentity,
    () => mainStore.apiBaseUrl, () => mainStore.mockApi
  ], closePasswordReset, { flush: 'sync' });
  onBeforeUnmount(() => { alive = false; closePasswordReset(); });
  return { showPasswordReset, passwordResetUser, resetPasswordForm, resetPasswordError, isResettingPassword,
    canResetPassword, openPasswordReset, closePasswordReset, submitPasswordReset };
}
