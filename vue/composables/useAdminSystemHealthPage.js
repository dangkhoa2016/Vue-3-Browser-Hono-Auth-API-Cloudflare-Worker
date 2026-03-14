import { computed, onActivated, onMounted, watch } from 'vue';
const { storeToRefs } = Pinia;
import { i18n } from '/assets/js/i18n.js';
import { useSystemHealthStore } from '/assets/js/stores/systemHealthStore.js';
import { useSystemStatsStore } from '/assets/js/stores/systemStatsStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthGate } from '../composables/useAuthGate.js';
import { getHealthTextClass, getHealthCheckBadgeClass, getBooleanHealthTextClass } from '/vue/composables/useUiClassMap.js';

export function useAdminSystemHealthPage() {
  const systemHealthStore = useSystemHealthStore();
  const systemStatsStore = useSystemStatsStore();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const mainStore = useMainStore();
  const heroSectionClass = 'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';

  const {
    healthData,
    loading: healthLoading,
    error: healthError,
    lastUpdated: healthLastUpdated
  } = storeToRefs(systemHealthStore);
  const {
    statsData,
    loading: statsLoading,
    error: statsError,
    lastUpdated: statsLastUpdated
  } = storeToRefs(systemStatsStore);

  const isLoading = computed(() => Boolean(healthLoading.value || statsLoading.value));
  const errorMessage = computed(() => healthError.value || statsError.value || null);

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const role = computed(() => String(authStore.user?.role || '').toLowerCase());
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');

  const status = computed(() => String(healthData.value?.status || '').toLowerCase());
  const t = (key) => i18n.global.t(key);
  const statusText = computed(() => {
    if (status.value === 'healthy') return t('message.system_health.status_healthy');
    if (status.value === 'unhealthy') return t('message.system_health.status_unhealthy');
    return t('message.system_health.status_unknown');
  });

  const statusDotClass = computed(() => {
    if (status.value === 'healthy') return 'bg-emerald-500';
    if (status.value === 'unhealthy') return 'bg-rose-500';
    return 'bg-slate-400';
  });

  const statusTextClass = computed(() => {
    return getHealthTextClass(status.value);
  });

  const responseTime = computed(() => String(healthData.value?.responseTime || '-'));
  const environment = computed(() => String(healthData.value?.environment || '-'));
  const healthChecks = computed(() => {
    const source = healthData.value?.healthChecks;
    if (Array.isArray(source)) {
      return source;
    }
    if (source && typeof source === 'object') {
      return Object.entries(source).map(([name, statusValue]) => ({ name, status: statusValue }));
    }
    return [];
  });

  const databaseConnected = computed(() => Boolean(healthData.value?.database?.isConnected));
  const databaseConnectedText = computed(() => (databaseConnected.value ? t('message.system_health.yes') : t('message.system_health.no')));
  const databaseConnectedClass = computed(() => getBooleanHealthTextClass(databaseConnected.value));

  const sqliteVersion = computed(() => String(healthData.value?.database?.info?.version || '-'));

  const databaseInfo = computed(() => ({
    tableCount: Number(healthData.value?.database?.info?.tableCount) || 0,
    tables: Array.isArray(healthData.value?.database?.info?.tables) ? healthData.value.database.info.tables : []
  }));

  const dbPerformance = computed(() => ({
    queryResponseTime: String(healthData.value?.database?.metrics?.performance?.queryResponseTime || '-'),
    isResponsive: Boolean(healthData.value?.database?.metrics?.performance?.isResponsive),
    testQuerySuccess: Boolean(healthData.value?.database?.metrics?.performance?.testQuerySuccess)
  }));

  const databaseStructure = computed(() => ({
    tables: Array.isArray(healthData.value?.database?.metrics?.database?.tables) ? healthData.value.database.metrics.database.tables : [],
    totalTables: Number(healthData.value?.database?.metrics?.database?.totalTables) || 0,
    totalIndexes: Number(healthData.value?.database?.metrics?.database?.totalIndexes) || 0
  }));

  const dbUsers = computed(() => ({
    totalRecords: Number(healthData.value?.database?.metrics?.users?.totalRecords) || 0,
    activeUsers: Number(healthData.value?.database?.metrics?.users?.activeUsers) || 0,
    recentUsers24h: Number(
      healthData.value?.database?.metrics?.users?.recentUsers24h ??
      healthData.value?.database?.metrics?.users?.recentUsers
    ) || 0,
    recentActivity1h: Number(
      healthData.value?.database?.metrics?.users?.recentActivity1h ??
      healthData.value?.database?.metrics?.users?.recentActivity
    ) || 0
  }));

  const stats = computed(() => {
    const storeStats = statsData.value || {};
    const healthStats = healthData.value?.system?.statistics || {};

    return {
      totalUsers: Number(storeStats.totalUsers ?? healthStats.totalUsers) || 0,
      activeUsers: Number(storeStats.activeUsers ?? healthStats.activeUsers) || 0,
      inactiveUsers: Number(storeStats.inactiveUsers ?? healthStats.inactiveUsers) || 0,
      suspendedUsers: Number(storeStats.suspendedUsers ?? healthStats.suspendedUsers) || 0,
      recentRegistrations: Number(storeStats.recentRegistrations ?? healthStats.recentRegistrations) || 0
    };
  });

  const roleCounts = computed(() => {
    const storeUsersByRole = statsData.value?.usersByRole || {};
    const healthUsersByRole = healthData.value?.system?.statistics?.usersByRole || {};

    return {
      super_admin: Number(storeUsersByRole.super_admin ?? healthUsersByRole.super_admin) || 0,
      admin: Number(storeUsersByRole.admin ?? healthUsersByRole.admin) || 0,
      user: Number(storeUsersByRole.user ?? healthUsersByRole.user) || 0
    };
  });

  const performance = computed(() => ({
    responseTime: String(
      healthData.value?.system?.performance?.responseTime ||
      healthData.value?.responseTime ||
      '-'
    ),
    databaseResponseTime: String(
      healthData.value?.system?.performance?.databaseResponseTime ||
      healthData.value?.database?.metrics?.performance?.queryResponseTime ||
      '-'
    ),
    isPerformant: Boolean(healthData.value?.system?.performance?.isPerformant),
    performanceGrade: String(healthData.value?.system?.performance?.performanceGrade || '-')
  }));

  const security = computed(() => ({
    recentFailedLogins: Number(
      healthData.value?.system?.security?.recentFailedLogins ??
      healthData.value?.database?.metrics?.security?.recentFailures
    ) || 0,
    totalFailedAttempts: Number(
      healthData.value?.system?.security?.totalFailedAttempts ??
      healthData.value?.database?.metrics?.security?.totalFailedAttempts
    ) || 0,
    uniqueIpsWithFailures: Number(
      healthData.value?.system?.security?.uniqueIpsWithFailures ??
      healthData.value?.database?.metrics?.security?.uniqueIpsWithFailures
    ) || 0,
    riskLevel: String(healthData.value?.system?.security?.riskLevel || '-')
  }));

  const metadata = computed(() => ({
    accessLevel: String(healthData.value?.metadata?.accessLevel || '-'),
    canViewSuperAdminData: Boolean(healthData.value?.metadata?.canViewSuperAdminData)
  }));

  const checkedBy = computed(() => ({
    userId: Number(healthData.value?.metadata?.checkedBy?.userId) || 0,
    role: String(healthData.value?.metadata?.checkedBy?.role || '-')
  }));

  const lastUpdatedLabel = computed(() => {
    return healthData.value?.timestamp || healthLastUpdated.value || statsLastUpdated.value;
  });
  const hasData = computed(() => Boolean(healthData.value || statsData.value));

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const healthStatusText = (value) => {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'healthy' || normalized === 'pass') return t('message.system_health.health_pass');
    if (normalized === 'warn') return t('message.system_health.health_warn');
    if (normalized === 'unhealthy' || normalized === 'fail') return t('message.system_health.health_fail');
    return normalized || t('message.system_health.health_unknown');
  };

  const healthCheckStatusClass = (value) => {
    return getHealthCheckBadgeClass(value);
  };

  const refresh = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await Promise.allSettled([
      systemHealthStore.fetchSystemHealth(),
      systemStatsStore.fetchSystemStats()
    ]);
  };

  const loadInitial = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await Promise.allSettled([
      systemHealthStore.fetchSystemHealth(),
      systemStatsStore.fetchSystemStats()
    ]);
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

  onMounted(async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: false });
  });

  onActivated(async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: false });
  });

  return {
    isLoading,
    errorMessage,
    heroSectionClass,
    isAdmin,
    showLoginRequired,
    statusDotClass,
    statusText,
    statusTextClass,
    responseTime,
    environment,
    healthChecks,
    databaseInfo,
    dbPerformance,
    dbUsers,
    databaseStructure,
    databaseConnectedText,
    databaseConnectedClass,
    sqliteVersion,
    stats,
    roleCounts,
    performance,
    security,
    metadata,
    checkedBy,
    hasData,
    lastUpdatedLabel,
    formatDate,
    healthStatusText,
    healthCheckStatusClass,
    refresh,
    openLoginModal
  };
}
