import { computed, onActivated, onMounted, watch } from 'vue';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useKvAdminRateLimitsStore } from '/assets/js/stores/kvAdminRateLimitsStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';

export function useKvAdminRateLimitsPage() {
  const { storeToRefs } = Pinia;
  const authStore = useAuthStore();
  const mainStore = useMainStore();
  const modalStore = useModalStore();
  const toastStore = useToastStore();
  const kvAdminRateLimitsStore = useKvAdminRateLimitsStore();
  const { isLoading, result, cleanForm, pruneForm, rateLimitsList, listComplete, listCursor, listPrefix } = storeToRefs(kvAdminRateLimitsStore);

  const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');

  const resetProtectedState = () => {
    kvAdminRateLimitsStore.rateLimitsList = [];
    kvAdminRateLimitsStore.listComplete = true;
    kvAdminRateLimitsStore.listCursor = null;
    kvAdminRateLimitsStore.result = null;
    kvAdminRateLimitsStore.errorMessage = null;
  };

  const loadInitialRateLimits = async (showToast = false) => {
    if (!authStore.isAuthenticated || !isSuperAdmin.value) {
      resetProtectedState();
      return;
    }

    await fetchRateLimits(true, showToast);
  };

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange, markUnauthenticated } = useAuthGate({
    authStore,
    modalStore,
    resetProtectedState,
    onAuthenticated: async () => {
      await loadInitialRateLimits(false);
    },
    onModalSuccess: async () => {
      await loadInitialRateLimits(true);
    }
  });

  const handleAuthError = (resultItem) => {
    if (resultItem?.code === 'REAUTH_REQUIRED' || resultItem?.status === 401 || resultItem?.status === 403) {
      authStore.logout();
      markUnauthenticated();
      openLoginModal();
      return true;
    }
    return false;
  };

  const fetchRateLimits = async (reset = true, showToast = true) => {
    const actionResult = await kvAdminRateLimitsStore.loadRateLimits(authStore.token, { reset });
    if (!actionResult.success && !handleAuthError(actionResult)) {
      toastStore.add('Failed to load rate limits list', 'error');
    } else if (actionResult.success && actionResult.message && showToast) {
      toastStore.add(actionResult.message, 'success');
    }
  };

  const runClean = async () => {
    const actionResult = await kvAdminRateLimitsStore.runClean(authStore.token);
    if (actionResult.success) {
      toastStore.add(actionResult.message || 'Clean operation completed', 'success');
      return;
    }

    if (handleAuthError(actionResult)) {
      return;
    }

    toastStore.add('Clean operation failed', 'error');
  };

  const runPrune = async () => {
    const actionResult = await kvAdminRateLimitsStore.runPrune(authStore.token);
    if (actionResult.success) {
      toastStore.add(actionResult.message || 'Prune operation completed', 'success');
      return;
    }

    if (handleAuthError(actionResult)) {
      return;
    }

    toastStore.add('Prune operation failed', 'error');
  };

  const loadMoreRateLimits = () => fetchRateLimits(false, true);

  onMounted(async () => {
    kvAdminRateLimitsStore.initializePruneRange();
    await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
  });

  onActivated(async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
  });

  watch(() => authStore.isAuthenticated, async (value) => {
    await handleAuthStateChange(value);
    if (!value) {
      resetProtectedState();
    }
  });

  watch(() => mainStore.mockApi, async (value, oldValue) => {
    if (value === oldValue) return;
    if (!authStore.isAuthenticated || !isSuperAdmin.value) return;
    await fetchRateLimits(true, false);
  });

  return {
    showLoginRequired,
    openLoginModal,
    isSuperAdmin,
    isLoading,
    result,
    cleanForm,
    pruneForm,
    rateLimitsList,
    listComplete,
    listCursor,
    listPrefix,
    runClean,
    runPrune,
    fetchRateLimits,
    loadMoreRateLimits
  };
}