import { computed, watch } from 'vue';
const { storeToRefs } = Pinia;
import { useRealtimeMonitoringStore } from '/assets/js/stores/realtimeMonitoringStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { createAuthGateCallbacks } from '/vue/composables/createAuthGateCallbacks.js';
import { useAuthStateChangeWatcher } from '/vue/composables/useAuthStateChangeWatcher.js';
import { useEnsureAuthenticatedLifecycle } from '/vue/composables/useEnsureAuthenticatedLifecycle.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { useMockApiChangeWatcher } from '/vue/composables/useMockApiChangeWatcher.js';

export function useAdminRealtimeMonitoringPage() {
  const { tf } = useI18nFallback();
  const monitoringStore = useRealtimeMonitoringStore();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const mainStore = useMainStore();
  const heroSectionClass = 'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-violet-50/40 to-cyan-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';

  const {
    loading,
    actionLoading,
    error,
    timestamp,
    overview,
    users,
    security,
    metadata,
    timeline,
    latestAnalysis,
    latestSimulation,
    lastUpdated
  } = storeToRefs(monitoringStore);

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const role = computed(() => String(authStore.user?.role || '').toLowerCase());
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');
  const isMonitoringActive = computed(() => monitoringStore.isMonitoringActive);

  const overviewTotals = computed(() => ({
    allTime: Number(overview.value?.totals?.allTime) || 0,
    today: Number(overview.value?.totals?.today) || 0,
    thisWeek: Number(overview.value?.totals?.thisWeek) || 0,
    uniqueUsersToday: Number(overview.value?.totals?.uniqueUsersToday) || 0,
    failedActionsToday: Number(overview.value?.totals?.failedActionsToday) || 0
  }));

  const topActionsToday = computed(() => {
    const rows = overview.value?.trends?.topActionsToday;
    return Array.isArray(rows) ? rows : [];
  });

  const timelineSummary = computed(() => timeline.value?.summary || {});

  const timelineItems = computed(() => {
    const rows = timeline.value?.timeline;
    return Array.isArray(rows) ? rows : [];
  });

  const usersByRole = computed(() => {
    const rows = users.value?.byRole;
    return Array.isArray(rows) ? rows : [];
  });

  const actionDistribution = computed(() => {
    const rows = users.value?.actionDistribution;
    return Array.isArray(rows) ? rows : [];
  });

  const adminActivity = computed(() => {
    const rows = security.value?.analytics?.security_summary?.admin_activity;
    return Array.isArray(rows) ? rows.slice(0, 6) : [];
  });

  const riskIndicators = computed(() => security.value?.analytics?.risk_indicators || {});

  const riskScore = computed(() => {
    const value = Number(riskIndicators.value?.risk_score ?? security.value?.riskScore);
    return Number.isNaN(value) ? 0 : value;
  });

  const cacheStatus = computed(() => metadata.value?.cacheStatus || {});

  const cacheHitRate = computed(() => {
    const value = Number(cacheStatus.value?.hitRate);
    if (Number.isNaN(value)) return 0;
    return value.toFixed(1);
  });

  const dataTimestamp = computed(() => timestamp.value || lastUpdated.value);

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const refresh = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await monitoringStore.refreshSnapshot();
  };

  const ensureMonitoringStatusLoadedOnce = async () => {
    if (monitoringStore.statusRequestedOnce) return;
    monitoringStore.statusRequestedOnce = true;
    try {
      await monitoringStore.fetchMonitoringStatus();
    } catch (_error) {
    }
  };

  const loadInitialMonitoringData = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await ensureMonitoringStatusLoadedOnce();
    await monitoringStore.refreshSnapshot();
  };

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange } = useAuthGate({
    authStore,
    modalStore,
    ...createAuthGateCallbacks({
      onAuthenticated: async () => {
        await loadInitialMonitoringData();
      }
    })
  });

  const exportDashboard = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await monitoringStore.exportDashboard({ format: 'json', timeRange: 'last_24h' });
  };

  const startMonitoring = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    try {
      await monitoringStore.startMonitoring(5000, true);
    } catch (_error) {
    }
  };

  const stopMonitoring = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    try {
      await monitoringStore.stopMonitoring();
    } catch (_error) {
    }
  };

  const analyzeThreats = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    try {
      await monitoringStore.analyzeThreats(1);
    } catch (_error) {
    }
  };

  const simulateEvent = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    try {
      await monitoringStore.simulateEvent({
        eventType: 'test_event',
        severity: 'medium',
        data: { source: 'ui' }
      });
    } catch (_error) {
    }
  };

  useMockApiChangeWatcher(mainStore, async (value, oldValue) => {
    if (oldValue === true && value === false) {
      monitoringStore.statusRequestedOnce = false;
      await loadInitialMonitoringData();
      return;
    }

    await loadInitialMonitoringData();
  }, {
    shouldRefresh: () => isAuthenticated.value && isAdmin.value
  });

  useAuthStateChangeWatcher(authStore, handleAuthStateChange);

  useEnsureAuthenticatedLifecycle(ensureAuthenticated);

  return {
    actionDistribution,
    actionLoading,
    adminActivity,
    analyzeThreats,
    cacheHitRate,
    cacheStatus,
    dataTimestamp,
    error,
    exportDashboard,
    formatDate,
    heroSectionClass,
    isAdmin,
    isMonitoringActive,
    latestAnalysis,
    latestSimulation,
    loading,
    openLoginModal,
    overviewTotals,
    refresh,
    riskIndicators,
    riskScore,
    security,
    showLoginRequired,
    simulateEvent,
    startMonitoring,
    stopMonitoring,
    tf,
    timelineItems,
    timelineSummary,
    topActionsToday,
    usersByRole
  };
}