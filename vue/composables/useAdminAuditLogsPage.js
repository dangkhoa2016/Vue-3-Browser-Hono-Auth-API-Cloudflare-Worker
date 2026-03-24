import { watch, ref, computed } from 'vue';
import { DEFAULT_ADMIN_PAGE_SIZE, resolveAdminPageSize } from '/assets/js/constants/pagination.js';
import { useAuditStore } from '/assets/js/stores/auditStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { createAuthGateCallbacks } from '/vue/composables/createAuthGateCallbacks.js';
import { useAuthStateChangeWatcher } from '/vue/composables/useAuthStateChangeWatcher.js';
import { useEnsureAuthenticatedLifecycle } from '/vue/composables/useEnsureAuthenticatedLifecycle.js';
import { useDateTimeFormatter } from '/vue/composables/useDateTimeFormatter.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { useMockApiChangeWatcher } from '/vue/composables/useMockApiChangeWatcher.js';
import { useModalState } from '/vue/composables/useModalState.js';

export function useAdminAuditLogsPage() {
  const auditStore = useAuditStore();
  const toastStore = useToastStore();
  const { formatDateTime } = useDateTimeFormatter();
  const mainStore = useMainStore();

  const logDetailModal = useModalState({
    initialMode: 'view',
    initialValue: null
  });
  const showModal = logDetailModal.isOpen;
  const selectedLog = logDetailModal.value;
  const tableTopRef = ref(null);

  const heroSectionClass =
    'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-cyan-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
  const filtersPanelClass =
    'bg-gradient-to-r from-slate-50/80 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-700/80 rounded-2xl p-6 mb-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-5';
  const filterInputClass =
    'w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition';
  const filterSelectClass =
    'w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition';
  const actorAvatarClass =
    'w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-sm font-semibold text-slate-800 dark:text-slate-100';
  const actorRoleBadgeBaseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap';
  const preferredPageSize = computed(() => resolveAdminPageSize(mainStore.adminPageSize, DEFAULT_ADMIN_PAGE_SIZE));

  const totalLogCount = computed(() => auditStore.error ? 0 : (Number(auditStore.pagination.total) || auditStore.logs.length || 0));
  const successCount = computed(() => auditStore.error ? 0 : (auditStore.logs || []).filter((log) => (log.status || '').toUpperCase() === 'SUCCESS').length);
  const issueCount = computed(() => auditStore.error ? 0 : (auditStore.logs || []).filter((log) => {
    const status = (log.status || '').toUpperCase();
    return status === 'FAILED' || status === 'UNAUTHORIZED';
  }).length);

  const formatDate = (d) => {
    return formatDateTime(d, '');
  };

  const formatDetails = (obj) => {
    try {
      if (!obj) return '';
      if (typeof obj === 'string') return obj;
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  };

  const avatarInitial = (log) => {
    if (!log) return 'U';

    const normalize = (val) => {
      if (val == null) return '';
      if (typeof val === 'object') {
        if (val.name) return String(val.name);
        if (val.email) return String(val.email);
        return '';
      }
      return String(val);
    };

    const candidates = [
      log.actor_name,
      log.actor_email,
      log.user_email,
      log.actor_id,
      log.id
    ];

    for (const c of candidates) {
      const s = normalize(c).trim();
      if (!s) continue;
      const token = s.includes('@') ? s.split('@')[0] : s.split(/\s+/)[0];
      const match = token.match(/[A-Za-z0-9]/);
      if (match) return match[0].toUpperCase();
    }

    return 'U';
  };

  const actorDisplay = (log) => {
    if (!log) return '-';
    if (log.actor_name) return log.actor_name;
    if (log.actor_email) {
      try {
        const local = String(log.actor_email).split('@')[0];
        return local || log.actor_email;
      } catch (e) {
        return log.actor_email;
      }
    }
    if (log.user_email) {
      try {
        const local = String(log.user_email).split('@')[0];
        return local || log.user_email;
      } catch (e) {
        return log.user_email;
      }
    }
    if (log.actor_id) return `#${log.actor_id}`;
    return '-';
  };

  const actorRoleBadgeClass = (role) => {
    const normalized = (role || '').toString().toLowerCase();
    if (normalized === 'super_admin') {
      return `${actorRoleBadgeBaseClass} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`;
    }
    if (normalized === 'admin') {
      return `${actorRoleBadgeBaseClass} bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300`;
    }
    return `${actorRoleBadgeBaseClass} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`;
  };

  const { tf } = useI18nFallback();
  const authStore = useAuthStore();
  const modalStore = useModalStore();

  const {
    showLoginRequired,
    openLoginModal,
    ensureAuthenticated,
    handleAuthStateChange
  } = useAuthGate({
    authStore,
    modalStore,
    sessionAuthFlagKey: 'authRequired',
    ...createAuthGateCallbacks({
      onAuthenticated: async () => {
        await auditStore.fetchLogs();
        if (auditStore.fetchStats) {
          auditStore.fetchStats().catch(() => {});
        }
      }
    })
  });

  useMockApiChangeWatcher(mainStore, async () => {
    auditStore.fetchLogs();
  }, {
    shouldRefresh: () => authStore.isAuthenticated && !showLoginRequired.value
  });

  const showToast = (message, type = 'info') => {
    toastStore.add(message, type);
  };

  const onExport = async (format = 'csv') => {
    try {
      await auditStore.export(format);
      showToast('Export started', 'success');
    } catch (err) {
      console.error('Export failed', err);
      showToast('Export failed', 'error');
    }
  };

  const applyFilters = () => {
    auditStore.filters.page = 1;
    auditStore.fetchLogs();
  };

  const clearFilters = () => {
    auditStore.filters.search = '';
    auditStore.filters.action = '';
    auditStore.filters.actorId = '';
    auditStore.filters.targetType = '';
    auditStore.filters.actorRole = '';
    auditStore.filters.startDate = '';
    auditStore.filters.endDate = '';
    auditStore.filters.page = 1;
    auditStore.fetchLogs();
  };

  const scrollToTableTop = () => {
    if (tableTopRef.value && typeof tableTopRef.value.scrollIntoView === 'function') {
      const rect = tableTopRef.value.getBoundingClientRect();
      const y = Math.max(0, window.scrollY + rect.top - 100);
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const goToPage = async (page) => {
    const totalPages = Number(auditStore.pagination.totalPages) || 1;
    const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    if (nextPage === (Number(auditStore.filters.page) || 1)) return;
    auditStore.filters.page = nextPage;
    await auditStore.fetchLogs();
    scrollToTableTop();
  };

  const handlePageSizeChange = async (limit) => {
    const nextLimit = resolveAdminPageSize(limit, preferredPageSize.value);
    const currentLimit = resolveAdminPageSize(auditStore.filters.limit, preferredPageSize.value);
    if (nextLimit === currentLimit) return;

    auditStore.filters.limit = nextLimit;
    auditStore.filters.page = 1;
    await auditStore.fetchLogs();
    scrollToTableTop();
  };

  const copySelectedLog = async () => {
    const copySuccessMessage = tf('message.audit.copied', 'Copied to clipboard');
    const copyFailureMessage = tf('message.audit.copy_failed', 'Failed to copy log details');

    try {
      const json = JSON.stringify(selectedLog.value || {}, null, 2);
      await navigator.clipboard.writeText(json);
      showToast(copySuccessMessage, 'success');
    } catch (err) {
      console.error('Copy failed', err);
      showToast(copyFailureMessage, 'error');
    }
  };

  const badgeColor = (action) => {
    const a = (action || '').toString().toLowerCase();
    if (['create', 'update'].includes(a)) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/30 dark:text-emerald-200';
    if (['delete'].includes(a)) return 'bg-rose-100 text-rose-800 dark:bg-rose-800/30 dark:text-rose-200';
    if (['login', 'logout'].includes(a)) return 'bg-sky-100 text-sky-800 dark:bg-sky-800/30 dark:text-sky-200';
    if (['export'].includes(a)) return 'bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-200';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-200';
  };

  const openLog = (log) => {
    logDetailModal.open(log, 'view');
  };

  const closeLog = () => {
    logDetailModal.close({ reset: true });
  };

  useEnsureAuthenticatedLifecycle(ensureAuthenticated);

  useAuthStateChangeWatcher(authStore, handleAuthStateChange);

  return {
    auditStore,
    formatDate,
    formatDetails,
    applyFilters,
    clearFilters,
    onExport,
    goToPage,
    handlePageSizeChange,
    showModal,
    selectedLog,
    totalLogCount,
    successCount,
    issueCount,
    openLog,
    closeLog,
    copySelectedLog,
    showLoginRequired,
    openLoginModal,
    badgeColor,
    avatarInitial,
    actorDisplay,
    actorRoleBadgeClass,
    heroSectionClass,
    filtersPanelClass,
    filterInputClass,
    filterSelectClass,
    actorAvatarClass,
    tf,
    tableTopRef
  };
}
