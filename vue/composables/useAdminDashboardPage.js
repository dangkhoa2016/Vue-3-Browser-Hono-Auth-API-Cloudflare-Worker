import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue';
const { storeToRefs } = Pinia;
import { useI18n } from 'vue-i18n';
import { useSystemStatsStore } from '/assets/js/stores/systemStatsStore.js';
import { useSystemHealthStore } from '/assets/js/stores/systemHealthStore.js';
import { useAuditStore } from '/assets/js/stores/auditStore.js';
import { useSecurityIncidentStore } from '/assets/js/stores/securityIncidentStore.js';
import { useRealtimeMonitoringStore } from '/assets/js/stores/realtimeMonitoringStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';

export function useAdminDashboardPage() {
  const { t } = useI18n({ useScope: 'global' });
  const systemStatsStore = useSystemStatsStore();
  const systemHealthStore = useSystemHealthStore();
  const auditStore = useAuditStore();
  const securityIncidentStore = useSecurityIncidentStore();
  const realtimeStore = useRealtimeMonitoringStore();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const mainStore = useMainStore();

  const isLoading = ref(false);
  const errorMessage = ref(null);
  const heroSectionClass = 'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-indigo-50/40 to-emerald-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
  const quickActionCardClass = 'group rounded-2xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition';
  const currentStep = ref('');
  const currentStepIndex = ref(0);
  const totalSteps = ref(0);
  const showProgressPanel = ref(false);
  const queuedRefresh = ref(false);

  const { statsData, lastUpdated: statsUpdated } = storeToRefs(systemStatsStore);
  const { healthData, lastUpdated: healthUpdated } = storeToRefs(systemHealthStore);
  const { pagination: auditPagination, lastUpdated: auditUpdated } = storeToRefs(auditStore);
  const { pagination: incidentPagination, lastUpdated: incidentUpdated } = storeToRefs(securityIncidentStore);
  const { lastUpdated: realtimeUpdated } = storeToRefs(realtimeStore);

  const hasLoaded = ref({
    stats: Boolean(statsData.value),
    health: Boolean(healthData.value),
    audit: typeof auditPagination.value?.total !== 'undefined',
    incidents: typeof incidentPagination.value?.total !== 'undefined',
    realtime: Boolean(realtimeUpdated.value)
  });

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const role = computed(() => String(authStore.user?.role || '').toLowerCase());
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');

  const totalUsers = computed(() => {
    const value = Number(statsData.value?.totalUsers);
    return Number.isFinite(value) ? value : null;
  });
  const displayTotalUsers = computed(() => (totalUsers.value === null ? '-' : totalUsers.value));
  const roleCounts = computed(() => ({
    super_admin: Number(statsData.value?.usersByRole?.super_admin) || 0,
    admin: Number(statsData.value?.usersByRole?.admin) || 0,
    user: Number(statsData.value?.usersByRole?.user) || 0
  }));

  const healthStatus = computed(() => String(healthData.value?.status || 'unknown').toLowerCase());
  const healthStatusText = computed(() => {
    if (healthStatus.value === 'healthy') return t('message.system_health.status_healthy');
    if (healthStatus.value === 'unhealthy') return t('message.system_health.status_unhealthy');
    return t('message.system_health.status_unknown');
  });
  const healthStatusClass = computed(() => {
    if (healthStatus.value === 'healthy') return 'text-emerald-600 dark:text-emerald-400';
    if (healthStatus.value === 'unhealthy') return 'text-rose-600 dark:text-rose-400';
    return 'text-slate-600 dark:text-slate-300';
  });

  const responseTime = computed(() => {
    return healthData.value?.responseTime || healthData.value?.system?.performance?.responseTime || '-';
  });

  const totalAuditLogs = computed(() => {
    const value = Number(auditPagination.value?.total);
    return Number.isFinite(value) ? value : null;
  });
  const displayTotalAuditLogs = computed(() => (totalAuditLogs.value === null ? '-' : totalAuditLogs.value));
  const activeIncidents = computed(() => {
    const value = Number(incidentPagination.value?.total);
    return Number.isFinite(value) ? value : null;
  });
  const displayActiveIncidents = computed(() => (activeIncidents.value === null ? '-' : activeIncidents.value));
  const activeThreats = computed(() => {
    const value = Number(realtimeStore.activeThreatCount);
    return Number.isFinite(value) ? value : null;
  });
  const displayActiveThreats = computed(() => (activeThreats.value === null ? '-' : activeThreats.value));
  const activeAlerts = computed(() => {
    const value = Number(realtimeStore.alertsCount);
    return Number.isFinite(value) ? value : null;
  });
  const displayActiveAlerts = computed(() => (activeAlerts.value === null ? '-' : activeAlerts.value));
  const isMonitoringActive = computed(() => Boolean(realtimeStore.isMonitoringActive));
  const currentStepLabel = computed(() => {
    if (!currentStep.value) return '';
    const labels = {
      stats: t('message.navbar.system_stats'),
      health: t('message.navbar.system_health'),
      audit: t('message.navbar.audit_logs'),
      incidents: t('message.navbar.security_incidents'),
      realtime: t('message.navbar.realtime_monitoring')
    };
    return labels[currentStep.value] || currentStep.value;
  });
  const progressItems = computed(() => {
    const steps = [
      { key: 'stats', label: t('message.navbar.system_stats') },
      { key: 'health', label: t('message.navbar.system_health') },
      { key: 'audit', label: t('message.navbar.audit_logs') },
      { key: 'incidents', label: t('message.navbar.security_incidents') },
      { key: 'realtime', label: t('message.navbar.realtime_monitoring') }
    ];

    return steps.map((step) => {
      const isDone = Boolean(hasLoaded.value[step.key]);
      const isCurrent = showProgressPanel.value && currentStep.value === step.key;

      if (isDone) {
        return {
          ...step,
          icon: 'bi bi-check-circle-fill text-emerald-500',
          classes: 'border-emerald-300/60 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
        };
      }

      if (isCurrent) {
        return {
          ...step,
          icon: 'bi bi-arrow-repeat animate-spin text-indigo-500',
          classes: 'border-indigo-300/60 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
        };
      }

      return {
        ...step,
        icon: 'bi bi-circle text-slate-400',
        classes: 'border-slate-300/60 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-300'
      };
    });
  });

  const quickActions = computed(() => [
    {
      name: t('message.navbar.settings', 'Settings'),
      path: '/settings',
      icon: 'bi bi-sliders2-vertical',
      meta: isAdmin.value
        ? (role.value === 'super_admin'
          ? t('message.settings.super_admin_note_title', 'System controls are role-gated')
          : t('message.settings.workspace_title', 'Browser Preferences'))
        : '...'
    },
    {
      name: t('message.navbar.system_stats'),
      path: '/admin/stats',
      icon: 'bi bi-graph-up',
      meta: hasLoaded.value.stats
        ? `${displayTotalUsers.value} ${String(t('message.system_stats_page.total_users')).toLowerCase()}`
        : '...'
    },
    {
      name: t('message.navbar.system_health'),
      path: '/admin/system-health',
      icon: 'bi bi-heart-pulse',
      meta: hasLoaded.value.health ? healthStatusText.value : '...'
    },
    {
      name: t('message.navbar.audit_logs'),
      path: '/admin/audit-logs',
      icon: 'bi bi-journal-text',
      meta: hasLoaded.value.audit
        ? `${displayTotalAuditLogs.value} ${String(t('message.admin_dashboard_page.total_audit_logs')).toLowerCase()}`
        : '...'
    },
    {
      name: t('message.navbar.security_incidents'),
      path: '/admin/security-incidents',
      icon: 'bi bi-shield-exclamation',
      meta: hasLoaded.value.incidents
        ? `${displayActiveIncidents.value} ${String(t('message.admin_dashboard_page.active_incidents')).toLowerCase()}`
        : '...'
    },
    {
      name: t('message.navbar.realtime_monitoring'),
      path: '/admin/monitoring',
      icon: 'bi bi-activity',
      meta: hasLoaded.value.realtime
        ? (isMonitoringActive.value
          ? t('message.admin_dashboard_page.monitoring_active')
          : t('message.admin_dashboard_page.monitoring_inactive'))
        : '...'
    },
    {
      name: t('message.navbar.user_management'),
      path: '/admin/users',
      icon: 'bi bi-people',
      meta: t('message.system_stats_page.users_by_role_title')
    }
  ]);

  const lastUpdatedLabel = computed(() => {
    const candidates = [
      statsUpdated.value,
      healthUpdated.value,
      auditUpdated.value,
      incidentUpdated.value,
      realtimeUpdated.value
    ].filter(Boolean);
    if (!candidates.length) return null;
    const sorted = candidates.sort();
    return sorted[sorted.length - 1] || null;
  });

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const refresh = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    if (isLoading.value) {
      queuedRefresh.value = true;
      return;
    }

    isLoading.value = true;
    showProgressPanel.value = true;
    errorMessage.value = null;
    hasLoaded.value = {
      stats: false,
      health: false,
      audit: false,
      incidents: false,
      realtime: false
    };
    await nextTick();

    const tasks = [
      { key: 'stats', run: () => systemStatsStore.fetchSystemStats() },
      { key: 'health', run: () => systemHealthStore.fetchSystemHealth() },
      { key: 'audit', run: () => auditStore.fetchLogs() },
      { key: 'incidents', run: () => securityIncidentStore.fetchIncidents({ page: 1 }) },
      { key: 'realtime', run: () => realtimeStore.fetchDashboardData() }
    ];
    const minStepDurationMs = 280;
    totalSteps.value = tasks.length;
    currentStepIndex.value = 0;
    currentStep.value = '';

    const failed = [];
    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];
      const stepStartedAt = Date.now();
      try {
        currentStep.value = task.key;
        currentStepIndex.value = index + 1;
        await task.run();
      } catch (err) {
        failed.push({ key: task.key, error: err });

        const status = Number(err?.status || err?.response?.status || 0);
        if (status === 401 || status === 403) {
          const elapsed = Date.now() - stepStartedAt;
          const holdFor = Math.max(0, minStepDurationMs - elapsed);
          if (holdFor > 0) await sleep(holdFor);
          hasLoaded.value[task.key] = true;
          break;
        }
      }

      const elapsed = Date.now() - stepStartedAt;
      const holdFor = Math.max(0, minStepDurationMs - elapsed);
      if (holdFor > 0) await sleep(holdFor);
      hasLoaded.value[task.key] = true;
    }

    if (failed.length > 0) {
      const firstError = failed[0]?.error;
      const firstMessage = String(firstError?.message || '').trim();
      const fallback = t('message.errors.unknown_error');
      const suffix = failed.length > 1 ? ` (+${failed.length - 1})` : '';
      errorMessage.value = `${firstMessage || fallback}${suffix}`;
      console.warn('[AdminDashboard] Sequential refresh failed:', failed);
    }

    isLoading.value = false;
    currentStep.value = '';
    currentStepIndex.value = 0;
    totalSteps.value = 0;

    if (queuedRefresh.value) {
      queuedRefresh.value = false;
      await refresh();
      return;
    }

    await sleep(600);
    showProgressPanel.value = false;
  };

  const loadInitial = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await refresh();
  };

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange } = useAuthGate({
    authStore,
    modalStore,
    onAuthenticated: async () => {
      await loadInitial();
    }
  });

  watch(() => authStore.isAuthenticated, async (value) => {
    await handleAuthStateChange(value);
  });

  watch(() => mainStore.mockApi, async (value, oldValue) => {
    if (!isAuthenticated.value || !isAdmin.value || value === oldValue) return;
    await loadInitial();
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

  return {
    currentStepIndex,
    currentStepLabel,
    displayActiveAlerts,
    displayActiveIncidents,
    displayActiveThreats,
    displayTotalAuditLogs,
    displayTotalUsers,
    errorMessage,
    formatDate,
    hasLoaded,
    healthStatusClass,
    healthStatusText,
    heroSectionClass,
    isAdmin,
    isLoading,
    isMonitoringActive,
    lastUpdatedLabel,
    openLoginModal,
    progressItems,
    quickActionCardClass,
    quickActions,
    refresh,
    responseTime,
    roleCounts,
    showLoginRequired,
    showProgressPanel,
    totalSteps
  };
}