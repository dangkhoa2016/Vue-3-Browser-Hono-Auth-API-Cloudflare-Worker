import { computed, ref, watch } from 'vue';
const { storeToRefs } = Pinia;
import { useI18n } from 'vue-i18n';
import { useSystemStatsStore } from '/assets/js/stores/systemStatsStore.js';
import { useAuditStore } from '/assets/js/stores/auditStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { createAuthGateCallbacks } from '/vue/composables/createAuthGateCallbacks.js';
import { useAuthStateChangeWatcher } from '/vue/composables/useAuthStateChangeWatcher.js';
import { useEnsureAuthenticatedLifecycle } from '/vue/composables/useEnsureAuthenticatedLifecycle.js';
import { useMockApiChangeWatcher } from '/vue/composables/useMockApiChangeWatcher.js';

export function useAdminSystemStatsPage() {
  const { t } = useI18n({ useScope: 'global' });
  const systemStatsStore = useSystemStatsStore();
  const auditStore = useAuditStore();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const mainStore = useMainStore();
  const heroSectionClass = 'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-indigo-50/40 to-cyan-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
  const auditScopeBadgeClass = 'inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300';

  const auditStatsData = ref(null);
  const auditStatsLoading = ref(false);
  const auditStatsError = ref(null);
  const auditDays = ref(7);

  const { statsData, loading: isLoading, error: errorMessage, lastUpdated } = storeToRefs(systemStatsStore);

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const role = computed(() => String(authStore.user?.role || '').toLowerCase());
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');

  const stats = computed(() => ({
    totalUsers: Number(statsData.value?.totalUsers) || 0,
    activeUsers: Number(statsData.value?.activeUsers) || 0,
    inactiveUsers: Number(statsData.value?.inactiveUsers) || 0,
    suspendedUsers: Number(statsData.value?.suspendedUsers) || 0,
    recentRegistrations: Number(statsData.value?.recentRegistrations) || 0
  }));

  const roleCounts = computed(() => ({
    super_admin: Number(statsData.value?.usersByRole?.super_admin) || 0,
    admin: Number(statsData.value?.usersByRole?.admin) || 0,
    user: Number(statsData.value?.usersByRole?.user) || 0
  }));

  const toPercent = (value, total) => {
    if (!total) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const activeRate = computed(() => toPercent(stats.value.activeUsers, stats.value.totalUsers));
  const inactiveRate = computed(() => toPercent(stats.value.inactiveUsers, stats.value.totalUsers));
  const suspendedRate = computed(() => toPercent(stats.value.suspendedUsers, stats.value.totalUsers));

  const hasData = computed(() => Boolean(statsData.value));
  const lastUpdatedLabel = computed(() => lastUpdated.value);
  const hasAuditStats = computed(() => Boolean(auditStatsData.value));

  const auditBasicStats = computed(() => ({
    total_events: Number(auditStatsData.value?.basic_stats?.total_events) || 0,
    successful_events: Number(auditStatsData.value?.basic_stats?.successful_events) || 0,
    failed_events: Number(auditStatsData.value?.basic_stats?.failed_events) || 0,
    error_events: Number(auditStatsData.value?.basic_stats?.error_events) || 0,
    security_events: Number(auditStatsData.value?.basic_stats?.security_events) || 0
  }));

  const auditRecentActivity = computed(() => ({
    events_24h: Number(auditStatsData.value?.recent_activity?.events_24h) || 0,
    login_events_24h: Number(auditStatsData.value?.recent_activity?.login_events_24h) || 0,
    admin_events_24h: Number(auditStatsData.value?.recent_activity?.admin_events_24h) || 0,
    kv_events_24h: Number(auditStatsData.value?.recent_activity?.kv_events_24h) || 0
  }));

  const auditActionStats = computed(() => (
    Array.isArray(auditStatsData.value?.action_stats) ? auditStatsData.value.action_stats : []
  ));

  const formatAuditAction = (value) => {
    const action = String(value || '').trim();
    if (!action) return '-';
    return action
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const auditScopeText = computed(() => {
    const scope = String(auditStatsData.value?.filtered_for_role || '').toLowerCase();
    if (scope === 'super_admin') return t('message.system_stats_page.audit_scope_full');
    if (scope === 'admin') return t('message.system_stats_page.audit_scope_limited');
    return '-';
  });

  const auditScopeHintKey = computed(() => {
    const scope = String(auditStatsData.value?.filtered_for_role || '').toLowerCase();
    if (scope === 'super_admin') return 'message.system_stats_page.audit_scope_hint_full';
    return 'message.system_stats_page.audit_scope_hint_limited';
  });

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const normalizeAuditDays = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 7;
    return Math.min(365, Math.max(1, parsed));
  };

  const loadAuditStats = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    auditStatsLoading.value = true;
    auditStatsError.value = null;
    try {
      const safeDays = normalizeAuditDays(auditDays.value);
      auditDays.value = safeDays;
      const payload = await auditStore.fetchStats(`${safeDays}d`);
      auditStatsData.value = payload;
    } catch (error) {
      auditStatsError.value = error?.message || null;
    } finally {
      auditStatsLoading.value = false;
    }
  };

  const handleAuditDaysChange = async () => {
    auditDays.value = normalizeAuditDays(auditDays.value);
    await loadAuditStats();
  };

  const refresh = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await systemStatsStore.fetchSystemStats();
    await loadAuditStats();
  };

  const loadInitial = async () => {
    if (!isAuthenticated.value || !isAdmin.value) return;
    await systemStatsStore.fetchSystemStats();
    await loadAuditStats();
  };

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange } = useAuthGate({
    authStore,
    modalStore,
    ...createAuthGateCallbacks({
      onAuthenticated: async () => {
        await loadInitial();
      }
    })
  });

  useAuthStateChangeWatcher(authStore, handleAuthStateChange);

  useMockApiChangeWatcher(mainStore, async () => {
    await loadInitial();
  }, {
    shouldRefresh: () => isAuthenticated.value && isAdmin.value
  });

  useEnsureAuthenticatedLifecycle(ensureAuthenticated);

  return {
    activeRate,
    auditActionStats,
    auditBasicStats,
    auditDays,
    auditRecentActivity,
    auditScopeBadgeClass,
    auditScopeHintKey,
    auditScopeText,
    auditStatsError,
    auditStatsLoading,
    formatAuditAction,
    formatDate,
    handleAuditDaysChange,
    hasAuditStats,
    hasData,
    heroSectionClass,
    inactiveRate,
    isAdmin,
    isLoading,
    lastUpdatedLabel,
    openLoginModal,
    refresh,
    roleCounts,
    showLoginRequired,
    stats,
    suspendedRate,
    errorMessage
  };
}