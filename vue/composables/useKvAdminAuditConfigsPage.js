import { computed, onMounted, watch } from 'vue';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useKvAdminAuditConfigsStore } from '/assets/js/stores/kvAdminAuditConfigsStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';

export function useKvAdminAuditConfigsPage() {
  const { storeToRefs } = Pinia;

  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const toastStore = useToastStore();
  const mainStore = useMainStore();
  const kvAdminAuditConfigsStore = useKvAdminAuditConfigsStore();
  const { loadingState, errorMessage, isToggling, auditData } = storeToRefs(kvAdminAuditConfigsStore);

  const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange, markUnauthenticated } = useAuthGate({
    authStore,
    modalStore,
    onAuthenticated: async () => {
      if (isSuperAdmin.value) {
        await loadData();
      }
    }
  });

  const loadData = async () => {
    if (!isSuperAdmin.value) {
      return;
    }

    const result = await kvAdminAuditConfigsStore.loadData(authStore.token);
    if (!result.success) {
      if (result?.code === 'REAUTH_REQUIRED' || result?.status === 401 || result?.status === 403) {
        authStore.logout();
        markUnauthenticated();
        openLoginModal();
      }
    }
  };

  const toggleFeature = async (feature, enabled) => {
    const result = await kvAdminAuditConfigsStore.toggleFeature(authStore.token, feature, enabled);
    if (result.success) {
      toastStore.add(result.message, 'success');
      return;
    }

    if (result?.code === 'REAUTH_REQUIRED' || result?.status === 401 || result?.status === 403) {
      authStore.logout();
      markUnauthenticated();
      openLoginModal();
      return;
    }

    toastStore.add(result.error || `Failed to toggle ${feature}`, 'error');
  };

  const formatFeatureName = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());

  const formatValueUnit = (key, val) => {
    if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('days')) return `${val} Days`;
    if (lowerKey.includes('ms')) return `${val} ms`;
    return typeof val === 'object' ? JSON.stringify(val) : val;
  };

  onMounted(async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: false });
  });

  watch(() => authStore.isAuthenticated, async (value) => {
    await handleAuthStateChange(value);
  });

  watch(() => mainStore.mockApi, (value, oldValue) => {
    if (value === oldValue) return;
    if (!authStore.isAuthenticated || !isSuperAdmin.value) return;
    loadData();
  });

  return {
    showLoginRequired,
    openLoginModal,
    isSuperAdmin,
    loadingState,
    errorMessage,
    isToggling,
    auditData,
    loadData,
    toggleFeature,
    formatFeatureName,
    formatValueUnit
  };
}