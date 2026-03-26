import { computed } from 'vue';
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
    performance,
    metadata,
    timeline,
    recentEvents,
    alertsRules,
    alertChannels,
    latestAnalysis,
    latestSimulation,
    latestIncident,
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
    averageResponseTimeMs: Number(performance.value?.averageResponseTimeMs) || 0,
    p95ResponseTimeMs: Number(performance.value?.p95ResponseTimeMs) || 0,
    cacheHitRate: Number(performance.value?.cacheHitRate) || 0,
    health: performance.value?.health || 'unknown'
  }));

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

  const promptText = (message, fallback = '') => {
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') return fallback;
    const value = window.prompt(message, fallback);
    if (value === null) return null;
    return String(value).trim();
  };

  const confirmAction = (message) => {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
    return window.confirm(message);
  };

  const refresh = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await Promise.all([
      monitoringStore.refreshSnapshot(),
      monitoringStore.fetchRecentEvents(),
      monitoringStore.fetchAlertRules(),
      monitoringStore.fetchAlertChannels(),
      monitoringStore.fetchPerformanceDashboard()
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

  const refreshRecentEvents = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    try {
      await monitoringStore.fetchRecentEvents();
    } catch (_error) {
    }
  };

  const testAlerts = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    try {
      await monitoringStore.testAlertSystem();
    } catch (_error) {
    }
  };

  const createAlertRule = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;

    const name = promptText(
      tf('message.realtime_monitoring.prompt_rule_name', 'Rule name'),
      `${tf('message.realtime_monitoring.create_rule_default_prefix', 'Custom rule')} ${new Date().toLocaleTimeString()}`
    );
    if (!name) return;

    const description = promptText(
      tf('message.realtime_monitoring.prompt_rule_description', 'Rule description'),
      tf('message.realtime_monitoring.prompt_rule_description_default', 'Created from realtime monitoring UI')
    ) || tf('message.realtime_monitoring.prompt_rule_description_default', 'Created from realtime monitoring UI');
    const severity = (
      promptText(tf('message.realtime_monitoring.prompt_severity', 'Severity (low, medium, high, critical)'), 'medium') || 'medium'
    ).toLowerCase();
    const condition = promptText(tf('message.realtime_monitoring.prompt_condition_pattern', 'Condition pattern'), 'test') || 'test';

    try {
      await monitoringStore.createAlertRule({
        name,
        description,
        severity,
        enabled: true,
        cooldown: 300,
        channels: ['email'],
        condition
      });
    } catch (_error) {
    }
  };

  const toggleAlertRule = async (rule) => {
    if (!isAuthenticated.value || !isAdmin.value || !rule?.id) return;
    try {
      await monitoringStore.toggleAlertRule(rule.id, !rule.enabled);
    } catch (_error) {
    }
  };

  const createAlertChannel = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;

    const name = promptText(
      tf('message.realtime_monitoring.prompt_channel_name', 'Channel name'),
      `${tf('message.realtime_monitoring.create_channel_default_prefix', 'Channel')} ${new Date().toLocaleTimeString()}`
    );
    if (!name) return;

    const type = (
      promptText(tf('message.realtime_monitoring.prompt_channel_type', 'Channel type (email, webhook, slack)'), 'email') || 'email'
    ).toLowerCase();

    try {
      await monitoringStore.createAlertChannel({
        name,
        type,
        enabled: true,
        config: {
          target: promptText(tf('message.realtime_monitoring.prompt_channel_target', 'Channel target'), 'ops@example.com') || 'ops@example.com'
        }
      });
    } catch (_error) {
    }
  };

  const clearCache = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;

    const key = promptText(tf('message.realtime_monitoring.prompt_cache_key', 'Cache key to clear. Leave blank to clear all.'), '');
    if (key === null) return;

    const label = key || tf('message.realtime_monitoring.all_dashboard_cache', 'all dashboard cache');
    if (!confirmAction(tf('message.realtime_monitoring.confirm_clear_cache', 'Clear {label}?', { label }))) return;

    try {
      await monitoringStore.clearDashboardCache(key || null);
      await monitoringStore.fetchPerformanceDashboard();
    } catch (_error) {
    }
  };

  const createIncident = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;

    const description = promptText(
      tf('message.realtime_monitoring.prompt_incident_description', 'Incident description'),
      tf('message.realtime_monitoring.prompt_incident_description_default', 'Manual incident created from monitoring UI')
    );
    if (!description) return;

    const severity = (
      promptText(tf('message.realtime_monitoring.prompt_incident_severity', 'Incident severity (low, medium, high, critical)'), 'medium') || 'medium'
    ).toLowerCase();
    const type = promptText(tf('message.realtime_monitoring.prompt_incident_type', 'Incident type'), 'manual_incident') || 'manual_incident';

    try {
      await monitoringStore.createIncident({
        description,
        severity,
        type,
        metadata: {
          source: 'admin_realtime_monitoring_ui'
        }
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
    alertChannelItems,
    alertChannelSummary,
    alertRuleItems,
    alertRuleSummary,
    cacheHitRate,
    cacheStatus,
    clearCache,
    createAlertChannel,
    createAlertRule,
    createIncident,
    dataTimestamp,
    error,
    exportDashboard,
    formatDate,
    heroSectionClass,
    isAdmin,
    isMonitoringActive,
    latestIncident,
    latestAnalysis,
    latestSimulation,
    loading,
    openLoginModal,
    overviewTotals,
    performanceSummary,
    recentEventCount,
    recentEventItems,
    refresh,
    refreshRecentEvents,
    riskIndicators,
    riskScore,
    security,
    showLoginRequired,
    simulateEvent,
    startMonitoring,
    stopMonitoring,
    testAlerts,
    tf,
    timelineItems,
    timelineSummary,
    toggleAlertRule,
    topActionsToday,
    usersByRole
  };
}