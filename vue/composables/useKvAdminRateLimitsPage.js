import { computed, onMounted, watch } from 'vue';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useKvAdminRateLimitsStore } from '/assets/js/stores/kvAdminRateLimitsStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';

export function useKvAdminRateLimitsPage() {
  const { storeToRefs } = Pinia;
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const toastStore = useToastStore();
  const kvAdminRateLimitsStore = useKvAdminRateLimitsStore();
  const { isLoading, result, cleanForm, pruneForm } = storeToRefs(kvAdminRateLimitsStore);

  const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange, markUnauthenticated } = useAuthGate({
    authStore,
    modalStore
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

  const runClean = async () => {
    const actionResult = await kvAdminRateLimitsStore.runClean(authStore.token);
    if (actionResult.success) {
      toastStore.add('Clean operation completed', 'success');
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
      toastStore.add('Prune operation completed', 'success');
      return;
    }

    if (handleAuthError(actionResult)) {
      return;
    }

    toastStore.add('Prune operation failed', 'error');
  };

  onMounted(async () => {
    kvAdminRateLimitsStore.initializePruneRange();
    await ensureAuthenticated({ checkSessionFlag: true, openModal: false });
  });

  watch(() => authStore.isAuthenticated, async (value) => {
    await handleAuthStateChange(value);
  });

  return {
    showLoginRequired,
    openLoginModal,
    isSuperAdmin,
    isLoading,
    result,
    cleanForm,
    pruneForm,
    runClean,
    runPrune
  };
}