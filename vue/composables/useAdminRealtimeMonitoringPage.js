import { computed, ref } from 'vue';
const { storeToRefs } = Pinia;
import { useRealtimeMonitoringStore } from '/assets/js/stores/realtimeMonitoringStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useModalState } from '/vue/composables/useModalState.js';
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

  const createDefaultRuleForm = () => ({
    name: `${tf('message.realtime_monitoring.create_rule_default_prefix', 'Custom rule')} ${new Date().toLocaleTimeString()}`,
    description: tf('message.realtime_monitoring.prompt_rule_description_default', 'Created from realtime monitoring UI'),
    severity: 'medium',
    condition: 'test',
    cooldown: 300,
    channels: ['email']
  });

  const createDefaultChannelForm = () => ({
    name: `${tf('message.realtime_monitoring.create_channel_default_prefix', 'Channel')} ${new Date().toLocaleTimeString()}`,
    type: 'email',
    target: 'ops@example.com'
  });

  const createDefaultCacheForm = () => ({
    key: ''
  });

  const createDefaultIncidentForm = () => ({
    description: tf('message.realtime_monitoring.prompt_incident_description_default', 'Manual incident created from monitoring UI'),
    severity: 'medium',
    type: 'manual_incident'
  });

  const {
    loading,
    actionLoading,
    error,
    timestamp,
    overview,
    users,
    security,
    performance,
    metadata,
    timeline,
    recentEvents,
    alertsRules,
    alertsRulesLoading,
    alertChannels,
    latestAnalysis,
    latestSimulation,
    latestIncident,
    lastUpdated
  } = storeToRefs(monitoringStore);

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const role = computed(() => String(authStore.user?.role || '').toLowerCase());
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');
  const isSuperAdmin = computed(() => role.value === 'super_admin');
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

  const recentEventItems = computed(() => {
    const rows = recentEvents.value?.events;
    return Array.isArray(rows) ? rows : [];
  });

  const recentEventCount = computed(() => Number(recentEvents.value?.count) || recentEventItems.value.length);

  const alertRuleItems = computed(() => {
    const rows = alertsRules.value?.rules;
    return Array.isArray(rows) ? rows : [];
  });

  const alertRuleSummary = computed(() => ({
    total: Number(alertsRules.value?.totalRules) || alertRuleItems.value.length,
    enabled: Number(alertsRules.value?.enabledRules) || alertRuleItems.value.filter((item) => item?.enabled).length
  }));

  const alertChannelItems = computed(() => {
    const rows = alertChannels.value?.channels;
    return Array.isArray(rows) ? rows : [];
  });

  const alertChannelSummary = computed(() => ({
    total: Number(alertChannels.value?.totalChannels) || alertChannelItems.value.length,
    enabled: Number(alertChannels.value?.enabledChannels) || alertChannelItems.value.filter((item) => item?.enabled).length
  }));

  const performanceSummary = computed(() => ({
    periodDescription: String(performance.value?.period?.description || '').trim(),
    periodStart: performance.value?.period?.start || null,
    totalLogs: Number(performance.value?.database?.totalLogs) || 0,
    averageDurationMs: Number(performance.value?.database?.averageDuration) || 0,
    eventRate: Number(performance.value?.database?.eventRate) || 0,
    estimatedSizeKB: Number(performance.value?.database?.estimatedSizeKB) || 0,
    cacheHitRate: (() => {
      const value = Number(performance.value?.system?.cacheHitRate);
      return Number.isNaN(value) ? '0.0' : value.toFixed(1);
    })(),
    cacheSize: Number(performance.value?.system?.cacheSize) || 0,
    health: performance.value?.health || 'unknown'
  }));

  const latestAnalysisSummary = computed(() => ({
    startTime: latestAnalysis.value?.period?.startTime || null,
    endTime: latestAnalysis.value?.period?.endTime || null,
    eventCount: Number(latestAnalysis.value?.eventCount) || 0,
    threatsDetected: Number(latestAnalysis.value?.threatsDetected) || 0,
    threatCount: Array.isArray(latestAnalysis.value?.threats) ? latestAnalysis.value.threats.length : 0
  }));

  const latestAnalysisThreats = computed(() => {
    const rows = latestAnalysis.value?.threats;
    return Array.isArray(rows) ? rows.slice(0, 3) : [];
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
  const createRuleModal = useModalState({ initialMode: 'create-rule' });
  const showCreateRuleModal = createRuleModal.isOpen;
  const createRuleForm = ref(createDefaultRuleForm());
  const createRuleError = ref('');

  const createChannelModal = useModalState({ initialMode: 'create-channel' });
  const showCreateChannelModal = createChannelModal.isOpen;
  const createChannelForm = ref(createDefaultChannelForm());
  const createChannelError = ref('');

  const clearCacheModal = useModalState({ initialMode: 'clear-cache' });
  const showClearCacheModal = clearCacheModal.isOpen;
  const clearCacheForm = ref(createDefaultCacheForm());
  const clearCacheError = ref('');

  const createIncidentModal = useModalState({ initialMode: 'create-incident' });
  const showCreateIncidentModal = createIncidentModal.isOpen;
  const createIncidentForm = ref(createDefaultIncidentForm());
  const createIncidentError = ref('');

  const toggleRuleModal = useModalState({ initialMode: 'toggle-rule', initialValue: null });
  const showToggleRuleModal = toggleRuleModal.isOpen;
  const pendingToggleRule = ref(null);

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const refresh = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await Promise.all([
      monitoringStore.refreshSnapshot(),
      monitoringStore.fetchRecentEvents(),
      monitoringStore.fetchAlertRules(),
      monitoringStore.fetchAlertChannels(),
      monitoringStore.fetchPerformanceDashboard({ showToast: true })
    ]);
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
    await Promise.all([
      monitoringStore.refreshSnapshot(),
      monitoringStore.fetchRecentEvents(),
      monitoringStore.fetchAlertRules(),
      monitoringStore.fetchAlertChannels(),
      monitoringStore.fetchPerformanceDashboard()
    ]);
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
    if (!isAuthenticated.value || !isSuperAdmin.value) return;
    try {
      await monitoringStore.startMonitoring(5000, true);
    } catch (_error) {
    }
  };

  const stopMonitoring = async () => {
    if (!isAuthenticated.value || !isSuperAdmin.value) return;
    try {
      await monitoringStore.stopMonitoring();
    } catch (_error) {
    }
  };

  const analyzeThreats = async () => {
    if (!isAuthenticated.value || !isSuperAdmin.value) return;
    try {
      await monitoringStore.analyzeThreats(1);
    } catch (_error) {
    }
  };

  const simulateEvent = async () => {
    if (!isAuthenticated.value || !isSuperAdmin.value) return;
    try {
      await monitoringStore.simulateEvent({
        eventType: 'test_event',
        severity: 'medium',
        data: { source: 'ui' }
      });
    } catch (_error) {
    }
  };

  const refreshRecentEvents = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    try {
      await monitoringStore.fetchRecentEvents();
    } catch (_error) {
    }
  };

  const testAlerts = async () => {
    if (!isAuthenticated.value || !isSuperAdmin.value) return;
    try {
      await monitoringStore.testAlertSystem();
    } catch (_error) {
    }
  };

  const createAlertRule = async () => {
    if (!isAuthenticated.value || !isSuperAdmin.value) return;

    createRuleError.value = '';
    createRuleForm.value = createDefaultRuleForm();
    createRuleModal.open(null, 'create-rule');
  };

  const closeCreateAlertRuleModal = () => {
    if (actionLoading.value) return;
    createRuleError.value = '';
    createRuleForm.value = createDefaultRuleForm();
    createRuleModal.close({ reset: true });
  };

  const submitCreateAlertRule = async () => {
    const payload = {
      name: String(createRuleForm.value.name || '').trim(),
      description: String(createRuleForm.value.description || '').trim() || tf('message.realtime_monitoring.prompt_rule_description_default', 'Created from realtime monitoring UI'),
      severity: String(createRuleForm.value.severity || 'medium').trim().toLowerCase(),
      condition: String(createRuleForm.value.condition || '').trim() || 'test',
      enabled: true,
      cooldown: Number(createRuleForm.value.cooldown) || 300,
      channels: Array.isArray(createRuleForm.value.channels)
        ? createRuleForm.value.channels.filter((value) => !!String(value || '').trim())
        : []
    };

    if (!payload.name) {
      createRuleError.value = tf('message.realtime_monitoring.rule_name_required', 'Rule name is required.');
      return;
    }

    if (!payload.channels.length) {
      createRuleError.value = tf('message.realtime_monitoring.rule_channels_required', 'Select at least one alert channel.');
      return;
    }

    createRuleError.value = '';

    try {
      const result = await monitoringStore.createAlertRule(payload);
      if (result) {
        closeCreateAlertRuleModal();
        return;
      }
      createRuleError.value = monitoringStore.error || tf('message.realtime_monitoring.create_rule_failed', 'Failed to create rule.');
    } catch (_error) {
      createRuleError.value = monitoringStore.error || tf('message.realtime_monitoring.create_rule_failed', 'Failed to create rule.');
    }
  };

  const toggleAlertRule = async (rule) => {
    if (!isAuthenticated.value || !isSuperAdmin.value || !rule?.id) return;

    pendingToggleRule.value = rule;
    toggleRuleModal.open(rule, 'toggle-rule');
  };

  const closeToggleRuleModal = () => {
    if (actionLoading.value) return;
    pendingToggleRule.value = null;
    toggleRuleModal.close({ reset: true });
  };

  const confirmToggleAlertRule = async () => {
    const rule = pendingToggleRule.value;
    if (!rule?.id) return;

    try {
      const result = await monitoringStore.toggleAlertRule(rule.id, !rule.enabled);
      if (result) {
        closeToggleRuleModal();
      }
    } catch (_error) {
    }
  };

  const createAlertChannel = async () => {
    if (!isAuthenticated.value || !isSuperAdmin.value) return;

    createChannelError.value = '';
    createChannelForm.value = createDefaultChannelForm();
    createChannelModal.open(null, 'create-channel');
  };

  const closeCreateAlertChannelModal = () => {
    if (actionLoading.value) return;
    createChannelError.value = '';
    createChannelForm.value = createDefaultChannelForm();
    createChannelModal.close({ reset: true });
  };

  const submitCreateAlertChannel = async () => {
    const payload = {
      name: String(createChannelForm.value.name || '').trim(),
      type: String(createChannelForm.value.type || 'email').trim().toLowerCase(),
      enabled: true,
      config: {
        target: String(createChannelForm.value.target || '').trim() || 'ops@example.com'
      }
    };

    if (!payload.name) {
      createChannelError.value = tf('message.realtime_monitoring.channel_name_required', 'Channel name is required.');
      return;
    }

    createChannelError.value = '';

    try {
      const result = await monitoringStore.createAlertChannel(payload);
      if (result) {
        closeCreateAlertChannelModal();
        return;
      }
      createChannelError.value = monitoringStore.error || tf('message.realtime_monitoring.create_channel_failed', 'Failed to create channel.');
    } catch (_error) {
      createChannelError.value = monitoringStore.error || tf('message.realtime_monitoring.create_channel_failed', 'Failed to create channel.');
    }
  };

  const clearCache = async () => {
    if (!isAuthenticated.value || !isSuperAdmin.value) return;

    clearCacheError.value = '';
    clearCacheForm.value = createDefaultCacheForm();
    clearCacheModal.open(null, 'clear-cache');
  };

  const closeClearCacheModal = () => {
    if (actionLoading.value) return;
    clearCacheError.value = '';
    clearCacheForm.value = createDefaultCacheForm();
    clearCacheModal.close({ reset: true });
  };

  const submitClearCache = async () => {
    const key = String(clearCacheForm.value.key || '').trim();

    clearCacheError.value = '';

    try {
      await monitoringStore.clearDashboardCache(key || null);
      await monitoringStore.fetchPerformanceDashboard();
      closeClearCacheModal();
    } catch (_error) {
      clearCacheError.value = monitoringStore.error || tf('message.realtime_monitoring.clear_cache_failed', 'Failed to clear cache.');
    }
  };

  const createIncident = async () => {
    if (!isAuthenticated.value || !isSuperAdmin.value) return;

    createIncidentError.value = '';
    createIncidentForm.value = createDefaultIncidentForm();
    createIncidentModal.open(null, 'create-incident');
  };

  const closeCreateIncidentModal = () => {
    if (actionLoading.value) return;
    createIncidentError.value = '';
    createIncidentForm.value = createDefaultIncidentForm();
    createIncidentModal.close({ reset: true });
  };

  const submitCreateIncident = async () => {
    const payload = {
      description: String(createIncidentForm.value.description || '').trim(),
      severity: String(createIncidentForm.value.severity || 'medium').trim().toLowerCase(),
      type: String(createIncidentForm.value.type || 'manual_incident').trim() || 'manual_incident',
      metadata: {
        source: 'admin_realtime_monitoring_ui'
      }
    };

    if (!payload.description) {
      createIncidentError.value = tf('message.realtime_monitoring.incident_description_required', 'Incident description is required.');
      return;
    }

    createIncidentError.value = '';

    try {
      const result = await monitoringStore.createIncident(payload);
      if (result) {
        closeCreateIncidentModal();
        return;
      }
      createIncidentError.value = monitoringStore.error || tf('message.realtime_monitoring.create_incident_failed', 'Failed to create incident.');
    } catch (_error) {
      createIncidentError.value = monitoringStore.error || tf('message.realtime_monitoring.create_incident_failed', 'Failed to create incident.');
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
    alertChannelItems,
    alertChannelSummary,
    alertRuleItems,
    alertsRulesLoading,
    alertRuleSummary,
    cacheHitRate,
    cacheStatus,
    clearCache,
    clearCacheError,
    clearCacheForm,
    closeClearCacheModal,
    closeCreateIncidentModal,
    closeToggleRuleModal,
    confirmToggleAlertRule,
    createAlertChannel,
    createAlertRule,
    createChannelError,
    createChannelForm,
    createIncidentError,
    createIncidentForm,
    createRuleError,
    createRuleForm,
    createIncident,
    dataTimestamp,
    error,
    exportDashboard,
    formatDate,
    heroSectionClass,
    isAdmin,
    isSuperAdmin,
    isMonitoringActive,
    latestIncident,
    latestAnalysis,
    latestAnalysisSummary,
    latestAnalysisThreats,
    latestSimulation,
    loading,
    closeCreateAlertChannelModal,
    closeCreateAlertRuleModal,
    openLoginModal,
    overviewTotals,
    performanceSummary,
    pendingToggleRule,
    recentEventCount,
    recentEventItems,
    refresh,
    refreshRecentEvents,
    riskIndicators,
    riskScore,
    security,
    showLoginRequired,
    showClearCacheModal,
    showCreateChannelModal,
    showCreateIncidentModal,
    showCreateRuleModal,
    showToggleRuleModal,
    simulateEvent,
    startMonitoring,
    stopMonitoring,
    submitClearCache,
    submitCreateAlertChannel,
    submitCreateIncident,
    submitCreateAlertRule,
    testAlerts,
    tf,
    timelineItems,
    timelineSummary,
    toggleAlertRule,
    topActionsToday,
    usersByRole
  };
}