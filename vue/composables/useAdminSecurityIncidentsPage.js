import { computed, onActivated, onMounted, ref, watch } from 'vue';
const { storeToRefs } = Pinia;
import { DEFAULT_ADMIN_PAGE_SIZE, resolveAdminPageSize } from '/assets/js/constants/pagination.js';
import { useSecurityIncidentStore } from '/assets/js/stores/securityIncidentStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useDateTimeFormatter } from '/vue/composables/useDateTimeFormatter.js';
import { useDebouncedFilters } from '/vue/composables/useDebouncedFilters.js';
import { useModalState } from '/vue/composables/useModalState.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import {
  getSecurityIncidentTypeBadgeClass,
  getSecurityIncidentSeverityBadgeClass,
  getSecurityIncidentStatusBadgeClass
} from '/vue/composables/useUiClassMap.js';

export function useAdminSecurityIncidentsPage() {
  const { t, tf } = useI18nFallback();
  const mainStore = useMainStore();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const { formatDateTime } = useDateTimeFormatter();
  const securityStore = useSecurityIncidentStore();
  const { incidents, loading: isLoading, error: errorMessage, pagination } = storeToRefs(securityStore);
  const incidentModal = useModalState({ initialMode: 'view', initialValue: null });
  const showModal = incidentModal.isOpen;
  const selectedIncident = incidentModal.value;
  const tableTopRef = ref(null);
  const search = ref('');
  const severityFilter = ref('all');
  const statusFilter = ref('all');
  const useServerFilter = ref(true);
  const preferredPageSize = computed(() => resolveAdminPageSize(mainStore.adminPageSize, DEFAULT_ADMIN_PAGE_SIZE));
  const preferredSearchDebounce = computed(() => Math.max(0, Number.parseInt(mainStore.adminSearchDebounceMs, 10) || 300));
  const { runDebounced } = useDebouncedFilters();
  const role = computed(() => String(authStore.user?.role || '').toLowerCase());
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');

  const heroSectionClass =
    'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
  const searchInputClass =
    'w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none';
  const serverFilterLabelClass =
    'inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200';

  const mobileCellBaseClass =
    'max-[992px]:flex max-[992px]:items-start max-[992px]:justify-between max-[992px]:gap-3 max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3';
  const mobileActionsCellBaseClass =
    'max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3';
  const tableRowClass =
    'border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition max-[992px]:block max-[992px]:border max-[992px]:border-slate-200/70 dark:max-[992px]:border-slate-700 max-[992px]:rounded-2xl max-[992px]:p-1 max-[992px]:mb-4 max-[992px]:bg-white/90 dark:max-[992px]:bg-slate-900/80';
  const actionsCellClass = `whitespace-nowrap px-6 py-4 text-center ${mobileActionsCellBaseClass}`;
  const incidentCellClass = `px-6 py-4 text-slate-800 dark:text-slate-100 ${mobileCellBaseClass}`;
  const severityStatusCellClass = `px-6 py-4 ${mobileCellBaseClass}`;
  const whenByCellClass = `px-6 py-4 text-slate-500 dark:text-slate-300 ${mobileCellBaseClass}`;

  const normalizedIncidents = computed(() => incidents.value || []);

  const filteredIncidents = computed(() => {
    const query = search.value.trim().toLowerCase();

    return normalizedIncidents.value.filter((incident) => {
      const severity = (incident.severity || '').toLowerCase();
      const status = (incident.status || '').toLowerCase();
      const type = (incident.type || '').toLowerCase();
      const title = (incident.title || '').toLowerCase();
      const createdBy = String(incident.created_by || '').toLowerCase();

      const matchesSearch = !query || title.includes(query) || type.includes(query) || createdBy.includes(query);
      const matchesSeverity = severityFilter.value === 'all' || severity === severityFilter.value;
      const matchesStatus = statusFilter.value === 'all' || status === statusFilter.value;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  });

  const detectedCount = computed(() => normalizedIncidents.value.filter((incident) => (incident.status || '').toLowerCase() === 'detected').length);
  const resolvedCount = computed(() => normalizedIncidents.value.filter((incident) => (incident.status || '').toLowerCase() === 'resolved').length);
  const highSeverityCount = computed(() => normalizedIncidents.value.filter((incident) => (incident.severity || '').toLowerCase() === 'high').length);

  const formatDate = (value) => {
    return formatDateTime(value, '-');
  };

  const formatStatus = (status) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'detected') return t('message.security_incidents.status_detected');
    if (normalized === 'resolved') return t('message.security_incidents.status_resolved');
    return status || '-';
  };

  const typeBadgeClass = (type) => getSecurityIncidentTypeBadgeClass(type);
  const severityBadgeClass = (severity) => getSecurityIncidentSeverityBadgeClass(severity);
  const statusBadgeClass = (status) => getSecurityIncidentStatusBadgeClass(status);

  const openIncident = (incident) => {
    incidentModal.open(incident, 'view');
  };

  const closeIncident = () => {
    incidentModal.close({ reset: true });
  };

  const scrollToTableTop = () => {
    if (tableTopRef.value && typeof tableTopRef.value.scrollIntoView === 'function') {
      const rect = tableTopRef.value.getBoundingClientRect();
      const y = Math.max(0, window.scrollY + rect.top - 100);
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const loadIncidents = async (
    page = pagination.value?.page || 1,
    limit = resolveAdminPageSize(pagination.value?.limit, preferredPageSize.value)
  ) => {
    if (!authStore.isAuthenticated || !isAdmin.value) return;

    await securityStore.fetchIncidents({
      page,
      limit,
      search: useServerFilter.value ? search.value : '',
      severity: useServerFilter.value ? severityFilter.value : 'all',
      status: useServerFilter.value ? statusFilter.value : 'all',
      useServerFilter: useServerFilter.value
    });
  };

  const resetProtectedState = () => {
    securityStore.incidents = [];
    securityStore.error = null;
    securityStore.pagination = { total: 0, page: 1, limit: preferredPageSize.value, totalPages: 1 };
  };

  const {
    showLoginRequired,
    openLoginModal,
    ensureAuthenticated,
    handleAuthStateChange
  } = useAuthGate({
    authStore,
    modalStore,
    resetProtectedState,
    onAuthenticated: async () => {
      await loadIncidents(1);
    }
  });

  const goToPage = async (page) => {
    const totalPages = (pagination.value && pagination.value.totalPages) || 1;
    if (page < 1 || page > totalPages) return;
    await loadIncidents(page);
    scrollToTableTop();
  };

  const handlePageSizeChange = async (limit) => {
    const nextLimit = resolveAdminPageSize(limit, preferredPageSize.value);
    const currentLimit = resolveAdminPageSize(pagination.value?.limit, preferredPageSize.value);
    if (nextLimit === currentLimit) return;

    await loadIncidents(1, nextLimit);
    scrollToTableTop();
  };

  const refresh = async () => {
    await loadIncidents(pagination.value?.page || 1);
  };

  watch(search, () => {
    if (!useServerFilter.value) return;
    runDebounced('admin-security-incidents-search', async () => {
      await loadIncidents(1);
    }, preferredSearchDebounce.value);
  });

  watch([severityFilter, statusFilter], async () => {
    if (useServerFilter.value) {
      await loadIncidents(1);
    }
  });

  watch(useServerFilter, async () => {
    await loadIncidents(1);
  });

  watch(() => mainStore.mockApi, async (value, oldValue) => {
    if (value !== oldValue && authStore.isAuthenticated && isAdmin.value) {
      await loadIncidents(1);
    }
  });

  watch(() => authStore.isAuthenticated, async (value) => {
    await handleAuthStateChange(value);
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
    actionsCellClass,
    closeIncident,
    detectedCount,
    errorMessage,
    filteredIncidents,
    formatDate,
    formatStatus,
    goToPage,
    handlePageSizeChange,
    heroSectionClass,
    highSeverityCount,
    incidentCellClass,
    incidents,
    isAdmin,
    isLoading,
    openIncident,
    openLoginModal,
    pagination,
    refresh,
    resolvedCount,
    search,
    searchInputClass,
    selectedIncident,
    serverFilterLabelClass,
    severityBadgeClass,
    severityFilter,
    showLoginRequired,
    showModal,
    statusBadgeClass,
    statusFilter,
    severityStatusCellClass,
    tableRowClass,
    tableTopRef,
    tf,
    typeBadgeClass,
    useServerFilter,
    whenByCellClass
  };
}