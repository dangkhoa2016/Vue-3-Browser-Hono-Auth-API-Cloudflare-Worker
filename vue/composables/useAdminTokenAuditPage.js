import { ref, computed, onActivated, onMounted, watch } from 'vue';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useTokenAuditStore } from '/assets/js/stores/tokenAuditStore.js';
import { DEFAULT_ADMIN_PAGE_SIZE, resolveAdminPageSize } from '/assets/js/constants/pagination.js';
import { useDateTimeFormatter } from '/vue/composables/useDateTimeFormatter.js';
import { useDebouncedFilters } from '/vue/composables/useDebouncedFilters.js';
import { useModalState } from '/vue/composables/useModalState.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { getTokenAuditActionClass } from '/vue/composables/useUiClassMap.js';

export function useAdminTokenAuditPage() {
  const { tf } = useI18nFallback();
  const mainStore = useMainStore();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const auditStore = useTokenAuditStore();
  const { formatDateTime } = useDateTimeFormatter();

  const items = computed(() => auditStore.items);
  const isLoading = computed(() => auditStore.loading);
  const errorMessage = computed(() => auditStore.error);
  const pagination = computed(() => auditStore.pagination);

  const currentLog = computed(() => auditStore.currentLog);
  const isFetchingLog = computed(() => auditStore.isFetchingLog);
  const isDeleting = computed(() => auditStore.isDeleting);

  const searchQuery = ref('');
  const selectedItems = ref([]);
  const preferredPageSize = computed(() => resolveAdminPageSize(mainStore.adminPageSize, DEFAULT_ADMIN_PAGE_SIZE));
  const preferredSearchDebounce = computed(() => Math.max(0, Number.parseInt(mainStore.adminSearchDebounceMs, 10) || 300));
  const { runDebounced, clearDebounce } = useDebouncedFilters();

  const detailModal = useModalState({ initialMode: 'detail', initialValue: null });
  const showDetailModal = detailModal.isOpen;
  const deleteModal = useModalState({ initialMode: 'delete', initialValue: null });
  const showDeleteModal = deleteModal.isOpen;
  const bulkDeleteModal = useModalState({ initialMode: 'bulk-delete', initialValue: null });
  const showBulkDeleteModal = bulkDeleteModal.isOpen;
  const deletingId = ref(null);

  const isSuperAdmin = computed(() => {
    return authStore.user?.role?.toUpperCase() === 'SUPER_ADMIN';
  });

  const isAllSelected = computed(() => {
    return items.value.length > 0 && selectedItems.value.length === items.value.length;
  });

  const mobileDataLabelBaseClass =
    'max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3';

  const tableRowClass =
    'border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition max-[992px]:block max-[992px]:border max-[992px]:border-slate-200/70 dark:max-[992px]:border-slate-700 max-[992px]:rounded-2xl max-[992px]:p-1 max-[992px]:mb-4 max-[992px]:bg-white/90 dark:max-[992px]:bg-slate-900/80';

  const checkboxCellClass = `px-5 py-3 whitespace-nowrap text-sm ${mobileDataLabelBaseClass}`;
  const actionCellClass = `px-5 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-100 ${mobileDataLabelBaseClass}`;
  const userCellClass = `px-5 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 ${mobileDataLabelBaseClass}`;
  const ipCellClass = `px-5 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono ${mobileDataLabelBaseClass}`;
  const statusCellClass = `px-5 py-3 whitespace-nowrap text-sm ${mobileDataLabelBaseClass}`;
  const dateCellClass = `px-5 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 ${mobileDataLabelBaseClass}`;
  const actionsCellClass = `px-5 py-3 whitespace-nowrap text-right text-sm font-medium ${mobileDataLabelBaseClass}`;

  const formatDate = (dateString) => {
    return formatDateTime(dateString, '-');
  };

  const formatMetadata = (metadata) => {
    if (!metadata) return '';
    try {
      if (typeof metadata === 'string') {
        return JSON.stringify(JSON.parse(metadata), null, 2);
      }
      return JSON.stringify(metadata, null, 2);
    } catch (e) {
      return metadata;
    }
  };

  const fetchLogs = async (
    page = 1,
    limit = resolveAdminPageSize(pagination.value?.limit, preferredPageSize.value)
  ) => {
    if (!authStore.isAuthenticated || !isSuperAdmin.value) return;

    selectedItems.value = [];
    await auditStore.fetchLogs({
      page,
      limit,
      search: searchQuery.value
    });
  };

  const {
    showLoginRequired,
    openLoginModal,
    ensureAuthenticated,
    handleAuthStateChange
  } = useAuthGate({
    authStore,
    modalStore,
    sessionAuthFlagKey: 'authRequired',
    onAuthenticated: async () => {
      if (isSuperAdmin.value) {
        await fetchLogs();
      }
    }
  });

  const changePage = (newPage) => {
    if (newPage < 1 || (pagination.value.totalPages && newPage > pagination.value.totalPages)) return;
    fetchLogs(newPage);
  };

  const handleSearch = () => {
    runDebounced('admin-token-audit-search', async () => {
      await fetchLogs(1);
    }, preferredSearchDebounce.value);
  };

  const clearSearch = () => {
    clearDebounce('admin-token-audit-search');
    searchQuery.value = '';
    fetchLogs(1);
  };

  const clearSelection = () => {
    selectedItems.value = [];
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      selectedItems.value = items.value.map(item => item.id);
    } else {
      selectedItems.value = [];
    }
  };

  const viewLogDetails = async (id) => {
    detailModal.open(id, 'detail');
    await auditStore.fetchLogDetails(id);
  };

  const closeDetailModal = () => {
    detailModal.close({ reset: true });
  };

  const confirmDeleteLog = (id) => {
    deletingId.value = id;
    deleteModal.open(id, 'delete');
  };

  const confirmBulkDelete = () => {
    if (selectedItems.value.length === 0) return;
    bulkDeleteModal.open(null, 'bulk-delete');
  };

  const closeDeleteModal = () => {
    deleteModal.close({ reset: true });
  };

  const closeBulkDeleteModal = () => {
    bulkDeleteModal.close({ reset: true });
  };

  const executeDeleteLog = async () => {
    if (!deletingId.value) return;
    const targetId = deletingId.value;
    const success = await auditStore.deleteLog(deletingId.value);

    if (success) {
      closeDeleteModal();
      deletingId.value = null;
      selectedItems.value = selectedItems.value.filter(id => id !== targetId);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedItems.value.length === 0) return;
    const success = await auditStore.bulkDeleteLogs(selectedItems.value);
    if (success) {
      closeBulkDeleteModal();
      selectedItems.value = [];
    }
  };

  onMounted(async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
  });

  onActivated(async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
  });

  watch(() => mainStore.mockApi, (newVal, oldVal) => {
    if (newVal !== oldVal && authStore.isAuthenticated && isSuperAdmin.value) {
      fetchLogs();
    }
  });

  watch(() => authStore.isAuthenticated, async (newVal) => {
    await handleAuthStateChange(newVal);
  });

  return {
    tableRowClass,
    checkboxCellClass,
    actionCellClass,
    userCellClass,
    ipCellClass,
    statusCellClass,
    dateCellClass,
    actionsCellClass,

    items,
    isLoading,
    errorMessage,
    searchQuery,
    pagination,
    showLoginRequired,
    isSuperAdmin,
    showDetailModal,
    closeDetailModal,
    currentLog,
    isFetchingLog,
    showDeleteModal,
    showBulkDeleteModal,
    closeDeleteModal,
    closeBulkDeleteModal,
    isDeleting,
    tf,
    selectedItems,
    isAllSelected,

    fetchLogs,
    changePage,
    handleSearch,
    clearSearch,
    clearSelection,
    formatDate,
    formatMetadata,
    getActionTailwindClass: getTokenAuditActionClass,
    openLoginModal,
    viewLogDetails,
    confirmDeleteLog,
    confirmBulkDelete,
    executeDeleteLog,
    executeBulkDelete,
    toggleSelectAll
  };
}
