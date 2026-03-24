import { computed, onActivated, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useAdvancedAuditStore } from '/assets/js/stores/advancedAuditStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useDeepLinkedTabs } from '/vue/composables/useDeepLinkedTabs.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

export function useAdminAdvancedAuditPage() {
  const { tf } = useI18nFallback({ useScope: 'global' });
  const authStore = useAuthStore();
  const auditStore = useAdvancedAuditStore();
  const mainStore = useMainStore();
  const modalStore = useModalStore();
  const toastStore = useToastStore();

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const role = computed(() => String(authStore.user?.role || '').toLowerCase());
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');

  const tabs = computed(() => [
    { key: 'analytics', name: tf('message.advanced_audit.tabs.analytics', 'Analytics'), icon: 'bi-graph-up' },
    { key: 'compliance', name: tf('message.advanced_audit.tabs.compliance', 'Compliance'), icon: 'bi-shield-check' },
    { key: 'archival', name: tf('message.advanced_audit.tabs.archival', 'Archival & Retention'), icon: 'bi-archive' }
  ]);

  const {
    activeTab,
    copiedTabKey,
    copyTabLink,
    selectTab
  } = useDeepLinkedTabs({
    routeName: 'AdminAdvancedAudit',
    tabs,
    initialTab: 'analytics'
  });

  const analyticsData = computed(() => auditStore.analytics);
  const complianceData = computed(() => auditStore.compliance);
  const archivalData = computed(() => auditStore.archival);

  const isLocalLoading = ref(false);
  const isLoading = computed(() => auditStore.loading || isLocalLoading.value);

  const loadTabData = async (tab) => {
    if (!isAuthenticated.value || !isAdmin.value) return;

    if (tab === 'analytics' && !analyticsData.value) {
      await auditStore.fetchAnalytics();
    } else if (tab === 'compliance' && !complianceData.value) {
      await auditStore.fetchCompliance('7d');
    } else if (tab === 'archival' && !archivalData.value) {
      await auditStore.fetchArchival();
    }
  };

  const resetCachedData = () => {
    auditStore.analytics = null;
    auditStore.compliance = null;
    auditStore.archival = null;
  };

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange } = useAuthGate({
    authStore,
    modalStore,
    resetProtectedState: resetCachedData,
    onAuthenticated: async () => {
      await loadTabData(activeTab.value);
    }
  });

  watch(isAuthenticated, async (newValue) => {
    await handleAuthStateChange(newValue);
  });

  watch(activeTab, async (newTab) => {
    await loadTabData(newTab);
  });

  watch(() => mainStore.mockApi, async (value, oldValue) => {
    if (value === oldValue || !authStore.isAuthenticated || !isAdmin.value) return;
    resetCachedData();
    await loadTabData(activeTab.value);
  });

  const ensurePageAccess = async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
  };

  onMounted(async () => {
    await ensurePageAccess();
  });

  onActivated(async () => {
    await ensurePageAccess();
  });

  const refreshData = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;

    isLocalLoading.value = true;
    try {
      const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 600));
      let fetchPromise;

      if (activeTab.value === 'analytics') fetchPromise = auditStore.fetchAnalytics();
      else if (activeTab.value === 'compliance') fetchPromise = auditStore.fetchCompliance('7d');
      else if (activeTab.value === 'archival') fetchPromise = auditStore.fetchArchival();

      await Promise.all([fetchPromise, minLoadingTime]);
    } finally {
      isLocalLoading.value = false;
    }
  };

  const copyCurrentTabLink = async (tabKey) => {
    try {
      const copied = await copyTabLink(tabKey);
      if (!copied) {
        return;
      }

      const label = tabs.value.find((tab) => tab.key === tabKey)?.name || tabKey;
      toastStore.success(`${tf('message.settings.copy_link_success', 'Link copied')}: ${label}`);
    } catch (error) {
      console.warn('Copy advanced audit tab link failed:', error);
      toastStore.error(tf('message.settings.copy_link_failed', 'Failed to copy link'));
    }
  };

  const buildApiErrorMessage = (error, fallback) => {
    let errorText = error?.response?.data?.error || error?.message || fallback;
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      errorText += `: ${error.response.data.errors.map((item) => item.message).join(', ')}`;
    }
    return errorText;
  };

  const handleRunArchival = async (params = {}) => {
    try {
      const res = await auditStore.runArchival(params);
      toastStore.success(res?.message || 'Archival process completed successfully!');
      await refreshData();
    } catch (error) {
      console.error('Run archival failed:', error);
      toastStore.error(buildApiErrorMessage(error, 'Archival process failed'));
    }
  };

  const handleRequestPdf = async () => {
    try {
      await auditStore.exportAdvanced({ format: 'pdf', type: 'compliance' });
      alert('Compliance PDF export initiated successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert(`PDF Export failed: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSetPolicy = async (params = {}) => {
    try {
      const res = await auditStore.manageRetention({ action: 'set_policy', policy: params });
      toastStore.success(res?.message || 'Retention policy configured successfully!');
      await refreshData();
    } catch (error) {
      console.error('Set policy failed:', error);
      toastStore.error(buildApiErrorMessage(error, 'Set policy failed'));
    }
  };

  const handleRestoreArchive = async (params = {}) => {
    try {
      const res = await auditStore.restoreArchive(params);
      toastStore.success(res?.message || 'Archive restoration process initiated successfully!');
      await refreshData();
    } catch (error) {
      console.error('Restore archive failed:', error);
      toastStore.error(buildApiErrorMessage(error, 'Restore process failed'));
    }
  };

  return {
    activeTab,
    analyticsData,
    archivalData,
    complianceData,
    copiedTabKey,
    copyCurrentTabLink,
    handleRequestPdf,
    handleRestoreArchive,
    handleRunArchival,
    handleSetPolicy,
    isAdmin,
    isLoading,
    openLoginModal,
    refreshData,
    selectTab,
    showLoginRequired,
    tabs,
    tf
  };
}