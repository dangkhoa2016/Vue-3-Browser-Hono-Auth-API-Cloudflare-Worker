import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { createAuthGateCallbacks } from '/vue/composables/createAuthGateCallbacks.js';
import { useAuthStateChangeWatcher } from '/vue/composables/useAuthStateChangeWatcher.js';
import { useEnsureAuthenticatedLifecycle } from '/vue/composables/useEnsureAuthenticatedLifecycle.js';

export function useApiExplorerPage() {
  const apiInfo = ref(null);
  const isLoading = ref(true);
  const errorMessage = ref(null);
  const collapsed = ref({});

  const mainStore = useMainStore();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const { t, locale } = useI18n({ useScope: 'global' });

  authStore.init();

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange, markUnauthenticated } = useAuthGate({
    authStore,
    modalStore,
    ...createAuthGateCallbacks({
      onAuthenticated: async () => {
        await fetchApiInfo();
      }
    })
  });

  const fetchApiInfo = async () => {
    try {
      isLoading.value = true;
      errorMessage.value = null;

      const response = await apiClient.get(API_ENDPOINTS.API_INFO, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });

      apiInfo.value = response.data;
      showLoginRequired.value = false;
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message || t('message.api_explorer.error_loading');
      errorMessage.value = message;

      if (status === 401) {
        authStore.logout();
        markUnauthenticated();
        openLoginModal();
      }
    } finally {
      isLoading.value = false;
    }
  };

  const loadApiInfo = async () => {
    const isAuth = await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
    if (!isAuth) {
      isLoading.value = false;
      return false;
    }

    return true;
  };

  const endpointCategories = computed(() => {
    if (!apiInfo.value?.endpoints) return [];

    return Object.entries(apiInfo.value.endpoints).map(([name, routes]) => {
      const routeEntries = Object.entries(routes || {}).map(([key, description]) => ({
        key,
        description,
        method: key.split(' ')[0] || '',
        path: key.split(' ').slice(1).join(' ') || ''
      }));

      return {
        name,
        routes: routeEntries,
        countLabel: t('message.api_explorer.endpoint_count', { count: routeEntries.length })
      };
    });
  });

  const endpointCountLabel = computed(() => {
    const total = endpointCategories.value.reduce((sum, categoryItem) => sum + categoryItem.routes.length, 0);
    return t('message.api_explorer.endpoint_count', { count: total });
  });

  watch(endpointCategories, (categories) => {
    const next = {};
    categories.forEach((categoryItem) => {
      next[categoryItem.name] = collapsed.value[categoryItem.name] || false;
    });
    collapsed.value = next;
  }, { immediate: true });

  const toggleCategory = (name) => {
    collapsed.value = {
      ...collapsed.value,
      [name]: !collapsed.value[name]
    };
  };

  watch([() => mainStore.mockApi, locale], async () => {
    if (!mainStore.mockApi && authStore.isAuthenticated && !showLoginRequired.value) {
      await fetchApiInfo();
    }
  });

  useAuthStateChangeWatcher(authStore, handleAuthStateChange, {
    onUnauthenticated: async () => {
      apiInfo.value = null;
      errorMessage.value = null;
    }
  });

  useEnsureAuthenticatedLifecycle(ensureAuthenticated);

  return {
    apiInfo,
    isLoading,
    errorMessage,
    collapsed,
    showLoginRequired,
    openLoginModal,
    loadApiInfo,
    endpointCategories,
    endpointCountLabel,
    toggleCategory
  };
}