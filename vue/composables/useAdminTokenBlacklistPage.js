import { ref, computed, onMounted, watch } from 'vue';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useTokenBlacklistStore } from '/assets/js/stores/tokenBlacklistStore.js';
import { useModalState } from '../composables/useModalState.js';
import { useDebouncedFilters } from '../composables/useDebouncedFilters.js';
import { useAuthGate } from '../composables/useAuthGate.js';
import { useI18nFallback } from '../composables/useI18nFallback.js';

export function useAdminTokenBlacklistPage() {
  const { tf } = useI18nFallback();
  const mainStore = useMainStore();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const blacklistStore = useTokenBlacklistStore();

  const items = computed(() => blacklistStore.items);
  const isLoading = computed(() => blacklistStore.loading);
  const errorMessage = computed(() => blacklistStore.error);
  const pagination = computed(() => blacklistStore.pagination);

  const searchQuery = ref('');
  const { runDebounced, clearDebounce } = useDebouncedFilters();

  const addTokenModal = useModalState({ initialMode: 'add-token' });
  const showAddModal = addTokenModal.isOpen;
  const addError = computed(() => blacklistStore.addError);
  const isSubmitting = computed(() => blacklistStore.isSubmitting);
  const addForm = ref({
    jti: '',
    userId: '',
    reason: 'ADMIN_SECURITY_ACTION',
    expiresAt: ''
  });

  const deleteTokenModal = useModalState({ initialMode: 'delete-token', initialValue: null });
  const showDeleteModal = deleteTokenModal.isOpen;
  const isDeleting = computed(() => blacklistStore.isDeleting);
  const deletingId = ref(null);

  const isSuperAdmin = computed(() => {
    return authStore.user?.role?.toUpperCase() === 'SUPER_ADMIN';
  });

  const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange } = useAuthGate({
    authStore,
    modalStore,
    onAuthenticated: async () => {
      await fetchTokens();
    }
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const fetchTokens = async (page = 1) => {
    if (!authStore.isAuthenticated || !isSuperAdmin.value) return;

    await blacklistStore.fetchTokens({
      page,
      limit: pagination.value.limit,
      search: searchQuery.value
    });
  };

  const changePage = (newPage) => {
    if (newPage < 1 || (pagination.value.totalPages && newPage > pagination.value.totalPages)) return;
    fetchTokens(newPage);
  };

  const handleSearch = () => {
    runDebounced('token-blacklist-search', async () => {
      await fetchTokens(1);
    });
  };

  const openAddTokenModal = () => {
    addForm.value = {
      jti: '',
      userId: '',
      reason: 'ADMIN_SECURITY_ACTION',
      expiresAt: ''
    };
    blacklistStore.addError = null;
    addTokenModal.open(null, 'add-token');
  };

  const closeAddTokenModal = () => {
    addTokenModal.close({ reset: true });
  };

  const submitAddToken = async () => {
    const success = await blacklistStore.addToken(addForm.value);
    if (success) {
      closeAddTokenModal();
    }
  };

  const confirmDeleteToken = (id) => {
    deletingId.value = id;
    deleteTokenModal.open(id, 'delete-token');
  };

  const closeDeleteTokenModal = () => {
    deleteTokenModal.close({ reset: true });
  };

  const executeDeleteToken = async () => {
    if (!deletingId.value) return;
    const success = await blacklistStore.removeToken(deletingId.value);

    if (success) {
      closeDeleteTokenModal();
      deletingId.value = null;
    }
  };

  onMounted(async () => {
    await ensureAuthenticated({ openModal: false });
  });

  watch(() => mainStore.mockApi, (newVal, oldVal) => {
    if (newVal !== oldVal && authStore.isAuthenticated && isSuperAdmin.value) {
      fetchTokens();
    }
  });

  watch(() => authStore.isAuthenticated, async (newVal) => {
    await handleAuthStateChange(newVal);
  });

  watch(searchQuery, (newVal) => {
    if (!newVal) {
      clearDebounce('token-blacklist-search');
    }
  });

  return {
    items,
    isLoading,
    errorMessage,
    searchQuery,
    pagination,
    showLoginRequired,
    isSuperAdmin,
    showAddModal,
    addForm,
    addError,
    isSubmitting,
    showDeleteModal,
    isDeleting,
    closeAddTokenModal,
    closeDeleteTokenModal,
    tf,

    fetchTokens,
    changePage,
    handleSearch,
    formatDate,
    openLoginModal,
    openAddTokenModal,
    submitAddToken,
    confirmDeleteToken,
    executeDeleteToken
  };
}
