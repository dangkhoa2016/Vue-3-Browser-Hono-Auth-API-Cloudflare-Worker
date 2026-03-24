import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useProfileStore } from '/assets/js/stores/profileStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { createAuthGateCallbacks } from '/vue/composables/createAuthGateCallbacks.js';
import { useAuthStateChangeWatcher } from '/vue/composables/useAuthStateChangeWatcher.js';
import { useEnsureAuthenticatedLifecycle } from '/vue/composables/useEnsureAuthenticatedLifecycle.js';

export function useProfilePage() {
  const { storeToRefs } = Pinia;
  const { locale, t } = useI18n({ useScope: 'global' });
  const isEditing = ref(false);
  const isSavingProfile = ref(false);
  const isClearingPendingEmail = ref(false);
  const isChangingPassword = ref(false);
  const isSavingPassword = ref(false);
  const editForm = ref({
    full_name: '',
    email: ''
  });
  const passwordForm = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const profileHeaderCardClass =
    'relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 dark:from-blue-700 dark:via-blue-800 dark:to-purple-800 rounded-2xl shadow-xl p-8 transition-all duration-300';
  const profileHeaderAvatarClass =
    'relative h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white/30 group-hover:ring-white/50 transition-all group-hover:scale-105';
  const profileEditInputClass =
    'w-full sm:w-auto sm:min-w-[16rem] sm:max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const profilePasswordInputClass =
    'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500';
  const statsCardClass =
    'bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-xl p-8 transition-all duration-300 border border-gray-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900';
  const statsUserIdCardClass =
    'group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-2xl hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700';
  const statsAccessLevelCardClass =
    'group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-2xl hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-700';

  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const toastStore = useToastStore();
  const profileStore = useProfileStore();
  const mainStore = useMainStore();
  const isAdmin = computed(() => {
    const role = String(authStore.user?.role || '').toLowerCase();
    return role === 'admin' || role === 'super_admin';
  });
  const { profile, loadingProfile, errorMessage } = storeToRefs(profileStore);

  const normalizeText = (value) => String(value || '').trim();

  const syncEditFormWithProfile = () => {
    editForm.value = {
      full_name: normalizeText(profile.value?.full_name),
      email: normalizeText(profile.value?.email)
    };
  };

  const canSubmitProfile = computed(() => {
    if (!profile.value || isSavingProfile.value) {
      return false;
    }

    const nextFullName = normalizeText(editForm.value.full_name);
    const nextEmail = normalizeText(editForm.value.email);
    const currentFullName = normalizeText(profile.value.full_name);
    const currentEmail = normalizeText(profile.value.email);

    if (!nextFullName || !nextEmail) {
      return false;
    }

    return nextFullName !== currentFullName || nextEmail !== currentEmail;
  });

  const canSubmitPassword = computed(() => {
    if (!isChangingPassword.value || isSavingPassword.value) {
      return false;
    }

    const currentPassword = normalizeText(passwordForm.value.currentPassword);
    const newPassword = normalizeText(passwordForm.value.newPassword);
    const confirmPassword = normalizeText(passwordForm.value.confirmPassword);

    return Boolean(currentPassword && newPassword && confirmPassword);
  });

  const startEditingProfile = () => {
    if (!profile.value) {
      return;
    }
    syncEditFormWithProfile();
    isEditing.value = true;
    errorMessage.value = null;
  };

  const cancelEditingProfile = () => {
    syncEditFormWithProfile();
    isEditing.value = false;
  };

  const resetEditingState = () => {
    isEditing.value = false;
    isSavingProfile.value = false;
    isChangingPassword.value = false;
    isSavingPassword.value = false;
    editForm.value = {
      full_name: '',
      email: ''
    };
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  };

  const resetProfileSessionState = () => {
    profileStore.resetProfile();
    resetEditingState();
  };

  const resetPasswordForm = () => {
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  };

  const startChangingPassword = () => {
    isChangingPassword.value = true;
    resetPasswordForm();
    errorMessage.value = null;
  };

  const cancelChangingPassword = () => {
    isChangingPassword.value = false;
    isSavingPassword.value = false;
    resetPasswordForm();
  };

  const extractErrorMessage = (err, fallbackMessage) => {
    const responseData = err?.response?.data;
    const detailErrors = Array.isArray(responseData?.errors) ? responseData.errors : [];

    if (err?.response?.status === 401) {
      return t('message.auth.relogin_required_reason');
    }

    if (detailErrors.length > 0) {
      const detailMessage = detailErrors
        .map((item) => {
          const message = normalizeText(item?.message);
          const field = normalizeText(item?.field);

          if (!message) {
            return '';
          }

          return field ? `${field}: ${message}` : message;
        })
        .filter(Boolean)
        .join(' | ');

      if (detailMessage) {
        return detailMessage;
      }
    }

    return responseData?.message || responseData?.error || err?.message || fallbackMessage;
  };

  const saveProfile = async () => {
    if (!profile.value || !canSubmitProfile.value) {
      return;
    }

    isSavingProfile.value = true;

    try {
      const payload = {
        full_name: normalizeText(editForm.value.full_name),
        email: normalizeText(editForm.value.email)
      };

      const saveResult = await profileStore.saveProfile(authStore.token, payload);
      if (!saveResult.success) {
        throw new Error(saveResult.error || t('message.errors.something_went_wrong'));
      }

      if (authStore.user) {
        authStore.user = {
          ...authStore.user,
          full_name: profile.value.full_name,
          email: profile.value.email,
          new_email: profile.value.new_email
        };
        localStorage.setItem('user', JSON.stringify(authStore.user));
      }

      isEditing.value = false;
      const serverMessage = saveResult?.message;
      toastStore.success(serverMessage || t('message.profile.update_success'));
    } catch (err) {
      const message = extractErrorMessage(err, t('message.errors.something_went_wrong'));
      toastStore.error(message);

      if (err?.response?.status === 401) {
        authStore.logout();
        markUnauthenticated();
        openLoginModal();
      }
    } finally {
      isSavingProfile.value = false;
    }
  };

  const clearPendingEmail = async () => {
    if (!profile.value?.new_email || isClearingPendingEmail.value) {
      return;
    }

    isClearingPendingEmail.value = true;

    try {
      const clearResult = await profileStore.clearPendingEmail(authStore.token);
      if (!clearResult.success) {
        throw new Error(clearResult.error || t('message.errors.something_went_wrong'));
      }

      if (authStore.user) {
        authStore.user = {
          ...authStore.user,
          new_email: profile.value.new_email
        };
        localStorage.setItem('user', JSON.stringify(authStore.user));
      }

      const serverMessage = clearResult?.message;
      toastStore.success(serverMessage || t('message.profile.pending_email_cleared'));
    } catch (err) {
      const message = extractErrorMessage(err, t('message.profile.clear_pending_email_failed'));
      toastStore.error(message);

      if (err?.response?.status === 401) {
        authStore.logout();
        markUnauthenticated();
        openLoginModal();
      }
    } finally {
      isClearingPendingEmail.value = false;
    }
  };

  const changePassword = async () => {
    if (!canSubmitPassword.value) {
      return;
    }

    const currentPassword = normalizeText(passwordForm.value.currentPassword);
    const newPassword = normalizeText(passwordForm.value.newPassword);
    const confirmPassword = normalizeText(passwordForm.value.confirmPassword);

    if (newPassword !== confirmPassword) {
      toastStore.error(t('message.auth.password_mismatch'));
      return;
    }

    isSavingPassword.value = true;

    try {
      const passwordResult = await profileStore.changePassword(authStore.token, {
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (!passwordResult.success) {
        throw new Error(passwordResult.error || t('message.errors.something_went_wrong'));
      }

      const serverMessage = passwordResult?.message;
      toastStore.success(serverMessage || t('message.profile.password_change_success'));
      cancelChangingPassword();
    } catch (err) {
      const message = extractErrorMessage(err, t('message.profile.password_change_failed'));
      toastStore.error(message);

      if (err?.response?.status === 401) {
        authStore.logout();
        markUnauthenticated();
        openLoginModal();
      }
    } finally {
      isSavingPassword.value = false;
    }
  };

  const fetchProfileData = async () => {
    const fetchResult = await profileStore.fetchProfile(authStore.token);

    if (fetchResult.success) {
      syncEditFormWithProfile();
      return;
    }

    const responseStatus = fetchResult.responseStatus;
    const responseData = fetchResult.responseData || {};
    const errorValue = fetchResult.error;

    try {
      if (
        responseStatus === 401 &&
        (
          responseData?.error === 'Invalid or malformed authentication token' ||
          responseData?.message === 'Invalid or malformed authentication token'
        )
      ) {
        errorMessage.value = t('message.auth.relogin_required_reason', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        authStore.logout();
        markUnauthenticated();
        openLoginModal();
      } else {
        errorMessage.value = errorValue || 'Failed to load profile';
        if (responseStatus === 401) {
          authStore.logout();
          markUnauthenticated();
          openLoginModal();
        }
      }
      console.error('Failed to load profile:', fetchResult);
    } catch (_error) {
    }
  };

  const {
    showLoginRequired,
    openLoginModal,
    ensureAuthenticated,
    handleAuthStateChange,
    markUnauthenticated
  } = useAuthGate({
    authStore,
    modalStore,
    sessionAuthFlagKey: 'authRequired',
    resetProtectedState: resetProfileSessionState,
    ...createAuthGateCallbacks({
      onAuthenticated: async () => {
        await fetchProfileData();
      }
    })
  });

  useAuthStateChangeWatcher(authStore, handleAuthStateChange, {
    onUnauthenticated: async () => {
      resetEditingState();
      markUnauthenticated();
      openLoginModal();
      return false;
    }
  });

  watch(
    () => authStore.user?.id,
    (newUserId, oldUserId) => {
      if (newUserId !== oldUserId) {
        resetEditingState();
      }
    },
    { immediate: false }
  );

  watch(
    () => mainStore.mockApi,
    async () => {
      if (authStore.isAuthenticated) {
        await fetchProfileData();
      }
    }
  );

  const loadProfile = async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
  };

  useEnsureAuthenticatedLifecycle(ensureAuthenticated);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(locale.value, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      super_admin: 'from-purple-500 to-pink-500',
      admin: 'from-blue-500 to-cyan-500',
      user: 'from-green-500 to-emerald-500'
    };
    return colors[role] || 'from-gray-500 to-slate-500';
  };

  const getRoleIcon = (role) => {
    const icons = {
      super_admin: 'bi-shield-fill-check',
      admin: 'bi-shield-check',
      user: 'bi-person-badge'
    };
    return icons[role] || 'bi-person';
  };

  return {
    profile,
    loadingProfile,
    errorMessage,
    showLoginRequired,
    isEditing,
    isSavingProfile,
    isClearingPendingEmail,
    isChangingPassword,
    isSavingPassword,
    profileHeaderCardClass,
    profileHeaderAvatarClass,
    profileEditInputClass,
    profilePasswordInputClass,
    statsCardClass,
    statsUserIdCardClass,
    statsAccessLevelCardClass,
    editForm,
    passwordForm,
    canSubmitProfile,
    canSubmitPassword,
    formatDate,
    getRoleBadgeColor,
    getRoleIcon,
    isAdmin,
    openLoginModal,
    loadProfile,
    startEditingProfile,
    cancelEditingProfile,
    startChangingPassword,
    cancelChangingPassword,
    saveProfile,
    clearPendingEmail,
    changePassword
  };
}
