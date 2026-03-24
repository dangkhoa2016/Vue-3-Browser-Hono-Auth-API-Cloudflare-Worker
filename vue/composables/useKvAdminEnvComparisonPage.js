import { computed, ref, watch } from 'vue';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useKvAdminEnvComparisonStore } from '/assets/js/stores/kvAdminEnvComparisonStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { createAuthGateCallbacks } from '/vue/composables/createAuthGateCallbacks.js';
import { useAuthStateChangeWatcher } from '/vue/composables/useAuthStateChangeWatcher.js';
import { useEnsureAuthenticatedLifecycle } from '/vue/composables/useEnsureAuthenticatedLifecycle.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { useMockApiChangeWatcher } from '/vue/composables/useMockApiChangeWatcher.js';

export function useKvAdminEnvComparisonPage() {
  const { t, tf } = useI18nFallback();
  const { storeToRefs } = Pinia;
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const toastStore = useToastStore();
  const mainStore = useMainStore();
  const kvAdminEnvComparisonStore = useKvAdminEnvComparisonStore();
  const { isLoading, errorMessage, comparison, summary } = storeToRefs(kvAdminEnvComparisonStore);

  const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');
  const search = ref('');
  const sourceFilter = ref('all');

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange, markUnauthenticated } = useAuthGate({
    authStore,
    modalStore,
    ...createAuthGateCallbacks({
      when: () => isSuperAdmin.value,
      onAuthenticated: async () => {
        await fetchComparison();
      }
    })
  });

  const formatValue = (val) => {
    if (val === null || val === undefined) return t('message.kv_admin_page.env_comparison.value_none') || '- none -';
    if (typeof val === 'object') return JSON.stringify(val);
    if (val === '') return t('message.kv_admin_page.env_comparison.value_empty_string') || '"" (Empty string)';
    return String(val);
  };

  const filteredKeys = computed(() => {
    let keys = Object.keys(comparison.value || {});

    if (sourceFilter.value !== 'all') {
      keys = keys.filter((key) => comparison.value[key].source === sourceFilter.value);
    }

    if (search.value) {
      const term = search.value.toLowerCase();
      keys = keys.filter((key) => {
        if (key.toLowerCase().includes(term)) return true;

        const item = comparison.value[key];
        const kvStr = typeof item.kv === 'object' && item.kv !== null ? JSON.stringify(item.kv) : String(item.kv ?? '');
        const envStr = typeof item.env === 'object' && item.env !== null ? JSON.stringify(item.env) : String(item.env ?? '');

        return kvStr.toLowerCase().includes(term) || envStr.toLowerCase().includes(term);
      });
    }

    return keys.sort();
  });

  const fetchComparison = async () => {
    if (!isSuperAdmin.value) return;

    const result = await kvAdminEnvComparisonStore.fetchComparison(authStore.token);
    if (result.success) {
      return;
    }

    if (result?.status === 401 || result?.status === 403 || result?.code === 'REAUTH_REQUIRED') {
      authStore.logout();
      markUnauthenticated();
      errorMessage.value = 'Session expired';
      openLoginModal();
      return;
    }

    toastStore.add(t('message.kv_admin_page.env_comparison.error_load_failed') || 'Failed to load environment comparison', 'error');
  };

  useEnsureAuthenticatedLifecycle(ensureAuthenticated);

  useAuthStateChangeWatcher(authStore, handleAuthStateChange);

  useMockApiChangeWatcher(mainStore, async () => {
    await fetchComparison();
  }, {
    shouldRefresh: () => authStore.isAuthenticated && isSuperAdmin.value
  });

  return {
    t,
    tf,
    showLoginRequired,
    openLoginModal,
    isSuperAdmin,
    isLoading,
    errorMessage,
    comparison,
    summary,
    search,
    sourceFilter,
    filteredKeys,
    fetchComparison,
    formatValue
  };
}