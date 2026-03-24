import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useUserStore } from '/assets/js/stores/userStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { DEFAULT_ADMIN_PAGE_SIZE, resolveAdminPageSize } from '/assets/js/constants/pagination.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { createAuthGateCallbacks } from '/vue/composables/createAuthGateCallbacks.js';
import { useAuthStateChangeWatcher } from '/vue/composables/useAuthStateChangeWatcher.js';
import { useDateTimeFormatter } from '/vue/composables/useDateTimeFormatter.js';
import { useDebouncedFilters } from '/vue/composables/useDebouncedFilters.js';
import { useModalState } from '/vue/composables/useModalState.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { useEnsureAuthenticatedLifecycle } from '/vue/composables/useEnsureAuthenticatedLifecycle.js';
import { useMockApiChangeWatcher } from '/vue/composables/useMockApiChangeWatcher.js';
import { getUserRoleBadgeClass, getUserStatusBadgeClass } from '/vue/composables/useUiClassMap.js';

export function useAdminUsersPage() {
  const { t, tf } = useI18nFallback();
  const authStore = useAuthStore();
  const mainStore = useMainStore();
  const modalStore = useModalStore();
  const userStore = useUserStore();
  const toastStore = useToastStore();
  const { formatDateTime } = useDateTimeFormatter();
  const search = ref('');
  const roleFilter = ref('all');
  const statusFilter = ref('all');
  const useServerFilter = ref(true);

  const heroSectionClass =
    'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
  const searchInputClass =
    'w-full pl-11 pr-12 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none';
  const serverFilterLabelClass =
    'inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200';

  const mobileDataLabelBaseClass =
    'max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3';
  const tableRowClass =
    'border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition max-[992px]:block max-[992px]:border max-[992px]:border-slate-200/70 dark:max-[992px]:border-slate-700 max-[992px]:rounded-2xl max-[992px]:p-1 max-[992px]:mb-4 max-[992px]:bg-white/90 dark:max-[992px]:bg-slate-900/80';
  const actionsCellClass = `whitespace-nowrap px-6 py-4 text-center ${mobileDataLabelBaseClass}`;
  const idCellClass = `px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 ${mobileDataLabelBaseClass}`;
  const nameCellClass = `whitespace-nowrap px-6 py-4 text-slate-800 dark:text-slate-100 ${mobileDataLabelBaseClass}`;
  const emailCellClass = `px-6 py-4 text-slate-500 dark:text-slate-300 ${mobileDataLabelBaseClass}`;
  const roleCellClass = `px-6 py-4 ${mobileDataLabelBaseClass}`;
  const statusCellClass = `whitespace-nowrap px-6 py-4 ${mobileDataLabelBaseClass}`;
  const createdAtCellClass = `whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-300 ${mobileDataLabelBaseClass}`;
  const updatedAtCellClass = `whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-300 ${mobileDataLabelBaseClass}`;

  const initialUserForm = {
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  };
  const userModal = useModalState({
    initialOpen: false,
    initialMode: 'create',
    createInitialValue: () => ({ ...initialUserForm })
  });
  const showModal = userModal.isOpen;
  const modalMode = userModal.mode;
  const userForm = userModal.value;

  const selectedUserId = ref(null);
  const formError = ref(null);
  const isSubmitting = ref(false);

  const deleteConfirmModal = useModalState({
    initialOpen: false,
    initialMode: 'delete',
    initialValue: null
  });
  const showConfirm = deleteConfirmModal.value;

  const isDeleting = ref(false);

  const roleModal = useModalState({
    initialOpen: false,
    initialMode: 'role',
    initialValue: null
  });
  const showRoleModal = roleModal.isOpen;
  const selectedRoleUser = roleModal.value;
  const selectedRoleValue = ref('user');
  const isChangingRole = ref(false);
  const tableTopRef = ref(null);

  const isAdmin = computed(() => {
    const role = authStore.user?.role?.toLowerCase();
    return role === 'admin' || role === 'super_admin';
  });

  const isSuperAdmin = computed(() => {
    const role = authStore.user?.role?.toLowerCase();
    return role === 'super_admin';
  });

  const roleOptions = ['super_admin', 'admin', 'user'];
  const adminRoleOptions = ['admin', 'user'];

  const roleChangeOptions = computed(() => {
    if (isSuperAdmin.value) {
      return roleOptions;
    }
    if (isAdmin.value) {
      return adminRoleOptions;
    }
    return [];
  });

  const isCurrentUser = (userItem) => {
    const currentUserId = authStore.user?.id;
    const rowUserId = userItem?.id;
    if (currentUserId === null || typeof currentUserId === 'undefined') {
      return false;
    }
    if (rowUserId === null || typeof rowUserId === 'undefined') {
      return false;
    }
    return String(currentUserId) === String(rowUserId);
  };

  const loading = computed(() => userStore.loading);
  const error = computed(() => userStore.error);
  const users = computed(() => userStore.users);
  const pagination = computed(() => userStore.pagination);
  const preferredPageSize = computed(() => resolveAdminPageSize(mainStore.adminPageSize, DEFAULT_ADMIN_PAGE_SIZE));
  const preferredSearchDebounce = computed(() => Math.max(0, Number.parseInt(mainStore.adminSearchDebounceMs, 10) || 300));
  const showDataSkeleton = ref(false);
  const forceSkeletonOnLoading = ref(false);

  const filteredUsers = computed(() => {
    const searchValue = search.value.trim().toLowerCase();
    return users.value.filter((userItem) => {
      const matchesSearch = !searchValue ||
        (userItem.full_name && userItem.full_name.toLowerCase().includes(searchValue)) ||
        (userItem.email && userItem.email.toLowerCase().includes(searchValue));
      const matchesRole = roleFilter.value === 'all' || userItem.role === roleFilter.value;
      const matchesStatus = statusFilter.value === 'all' || userItem.status === statusFilter.value;
      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  const activeCount = computed(() => filteredUsers.value.filter(userItem => userItem.status === 'active').length);
  const inactiveCount = computed(() => filteredUsers.value.filter(userItem => userItem.status === 'inactive').length);

  const loadUsers = async (
    page = Number(pagination.value?.page) || 1,
    limit = resolveAdminPageSize(pagination.value?.limit, preferredPageSize.value)
  ) => {
    if (!authStore.isAuthenticated) {
      return;
    }

    const searchValue = useServerFilter.value ? search.value.trim() : '';
    const roleValue = useServerFilter.value ? roleFilter.value : 'all';
    const statusValue = useServerFilter.value ? statusFilter.value : 'all';

    await userStore.fetchUsers({
      page,
      limit,
      search: searchValue,
      role: roleValue,
      status: statusValue,
      useServerFilter: useServerFilter.value
    });
  };

  const resetUserPageState = () => {
    userStore.users = [];
    userStore.pagination = { total: 0, page: 1, limit: preferredPageSize.value, totalPages: 1 };
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
    resetProtectedState: resetUserPageState,
    ...createAuthGateCallbacks({
      onAuthenticated: async () => {
        await loadUsers(1);
      },
      onModalSuccess: async () => {
        await loadUsers();
      }
    })
  });

  const reload = async () => {
    forceSkeletonOnLoading.value = true;
    await loadUsers();
  };

  const goToPage = async (page) => {
    const totalPages = Number(pagination.value?.totalPages) || 1;
    const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    if (nextPage === (Number(pagination.value?.page) || 1)) return;
    forceSkeletonOnLoading.value = true;
    await loadUsers(nextPage, resolveAdminPageSize(pagination.value?.limit, preferredPageSize.value));
    scrollToTableTop();
  };

  const handlePageSizeChange = async (limit) => {
    const nextLimit = resolveAdminPageSize(limit, preferredPageSize.value);
    const currentLimit = resolveAdminPageSize(pagination.value?.limit, preferredPageSize.value);
    if (nextLimit === currentLimit) return;

    forceSkeletonOnLoading.value = true;
    await loadUsers(1, nextLimit);
    scrollToTableTop();
  };

  const scrollToTableTop = () => {
    if (tableTopRef.value && typeof tableTopRef.value.scrollIntoView === 'function') {
      const rect = tableTopRef.value.getBoundingClientRect();
      const y = Math.max(0, window.scrollY + rect.top - 100);
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const formatDate = (value) => {
    return formatDateTime(value, '-');
  };

  const formatRole = (role) => {
    if (!role) return '-';
    return role.replace('_', ' ').toUpperCase();
  };

  const formatStatus = (status) => {
    if (!status) return '-';
    return status.toLowerCase() === 'active'
      ? t('message.admin_users.status_active')
      : t('message.admin_users.status_inactive');
  };

  const openCreateModal = () => {
    selectedUserId.value = null;
    formError.value = null;
    userModal.open({ ...initialUserForm }, 'create');
  };

  const openEditModal = (user) => {
    selectedUserId.value = user.id;
    formError.value = null;
    userModal.open({ ...user }, 'edit');
  };

  const closeModal = () => {
    userModal.close({ reset: true });
    selectedUserId.value = null;
    formError.value = null;
  };

  const handleSaveUser = async (formData) => {
    if (isSubmitting.value) return;
    isSubmitting.value = true;
    formError.value = null;

    try {
      let res;
      if (modalMode.value === 'create') {
        res = await userStore.createUser(formData);
      } else {
        res = await userStore.updateUser(selectedUserId.value, {
          full_name: formData.full_name,
          email: formData.email,
          status: formData.status
        });
      }

      console.log('Save user response:', res);
      if (res && res.message) {
        toastStore.success(res.message);

        closeModal();
        forceSkeletonOnLoading.value = true;
        await loadUsers();
      }
    } catch (err) {
      console.log('Error saving user:', err);
      formError.value = err.message || t('message.errors.unknown_error');
    } finally {
      isSubmitting.value = false;
    }
  };

  const openRoleModal = (userItem) => {
    if (!isAdmin.value) {
      return;
    }

    const currentRole = (userItem.role || '').toLowerCase();
    selectedRoleValue.value = roleChangeOptions.value.includes(currentRole)
      ? currentRole
      : roleChangeOptions.value[0] || 'user';
    roleModal.open(userItem, 'role');
  };

  const closeRoleModal = (force = false) => {
    if (isChangingRole.value && !force) {
      return;
    }
    roleModal.close({ reset: true });
    selectedRoleValue.value = 'user';
  };

  const submitRoleChange = async () => {
    if (!isAdmin.value || !selectedRoleUser.value || isChangingRole.value) {
      return;
    }

    const currentRole = (selectedRoleUser.value.role || '').toLowerCase();
    const newRole = String(selectedRoleValue.value || '').trim().toLowerCase();
    if (!newRole) {
      return;
    }

    if (!roleChangeOptions.value.includes(newRole)) {
      toastStore.error(
        t('message.admin_users.invalid_role', {
          role: newRole,
          allowed: roleChangeOptions.value.join(', ')
        }, `Invalid role: ${newRole}. Allowed: ${roleChangeOptions.value.join(', ')}`)
      );
      return;
    }

    if (newRole === currentRole) {
      return;
    }

    isChangingRole.value = true;
    try {
      const res = await userStore.updateUserRole(selectedRoleUser.value.id, newRole);
      toastStore.success(
        (res && res.message) ||
        t('message.admin_users.role_updated_success', {
          name: selectedRoleUser.value.full_name,
          role: newRole
        }, `Updated role for ${selectedRoleUser.value.full_name} to ${newRole}`)
      );
      closeRoleModal(true);
      forceSkeletonOnLoading.value = true;
      await loadUsers(pagination.value.page);
    } catch (err) {
      const reason = (err && err.response && err.response.data && err.response.data.message) || err.message || t('message.errors.unknown_error');
      toastStore.error(
        t('message.admin_users.role_updated_failed', { reason }, `Failed to update role: ${reason}`)
      );
    } finally {
      isChangingRole.value = false;
    }
  };

  const confirmDelete = (user) => {
    deleteConfirmModal.open({ id: user.id, full_name: user.full_name }, 'delete');
  };

  const performDelete = async () => {
    if (!showConfirm.value) return;
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await userStore.deleteUser(showConfirm.value.id);
      toastStore.success(t('message.admin_users.deleted_success', { id: showConfirm.value.id, name: showConfirm.value.full_name }));
      deleteConfirmModal.close({ reset: true });
      await loadUsers();
    } catch (err) {
      const reason = (err && err.response && err.response.data && err.response.data.message) || err.message || t('message.errors.unknown_error');
      const title = t('message.admin_users.delete_failed_title');
      const detail = t('message.admin_users.delete_failed_detail', { reason });
      toastStore.error(detail, 5000, title);
    } finally {
      isDeleting.value = false;
    }
  };

  const cancelDelete = () => {
    deleteConfirmModal.close({ reset: true });
  };

  const roleBadgeClass = (role) => getUserRoleBadgeClass(role);

  const statusBadgeClass = (status) => getUserStatusBadgeClass(status);

  const { runDebounced, clearDebounce } = useDebouncedFilters();

  watch(
    loading,
    (isLoading) => {
      clearDebounce('admin-users-skeleton');

      if (isLoading && (users.value.length === 0 || forceSkeletonOnLoading.value)) {
        const delay = forceSkeletonOnLoading.value ? 0 : 180;
        runDebounced('admin-users-skeleton', async () => {
          showDataSkeleton.value = true;
        }, delay);
        return;
      }

      showDataSkeleton.value = false;
      if (!isLoading) {
        forceSkeletonOnLoading.value = false;
      }
    },
    { immediate: true }
  );

  watch(search, () => {
    runDebounced('admin-users-search', async () => {
      if (useServerFilter.value) {
        forceSkeletonOnLoading.value = true;
        await loadUsers(1);
      }
    }, preferredSearchDebounce.value);
  });

  watch([roleFilter, statusFilter], () => {
    if (useServerFilter.value) {
      forceSkeletonOnLoading.value = true;
      loadUsers(1);
    }
  });

  watch(useServerFilter, () => {
    if (useServerFilter.value) {
      forceSkeletonOnLoading.value = true;
      loadUsers(1);
    }
  });

  useMockApiChangeWatcher(mainStore, async () => {
    await loadUsers(1);
  }, {
    shouldRefresh: () => authStore.isAuthenticated && !showLoginRequired.value,
    beforeRefresh: async () => {
      forceSkeletonOnLoading.value = true;
    }
  });

  useAuthStateChangeWatcher(authStore, handleAuthStateChange);

  onBeforeUnmount(() => {
    clearDebounce('admin-users-search');
    clearDebounce('admin-users-skeleton');
  });

  useEnsureAuthenticatedLifecycle(ensureAuthenticated);

  return {
    t,
    tf,
    authStore,
    showLoginRequired,
    error,
    loading,
    isAdmin,
    isSuperAdmin,
    search,
    roleFilter,
    statusFilter,
    useServerFilter,
    heroSectionClass,
    searchInputClass,
    serverFilterLabelClass,
    tableRowClass,
    actionsCellClass,
    idCellClass,
    nameCellClass,
    emailCellClass,
    roleCellClass,
    statusCellClass,
    createdAtCellClass,
    updatedAtCellClass,
    roleOptions,
    users,
    pagination,
    showDataSkeleton,
    filteredUsers,
    activeCount,
    inactiveCount,
    openLoginModal,
    reload,
    goToPage,
    handlePageSizeChange,
    formatDate,
    formatRole,
    formatStatus,
    roleBadgeClass,
    statusBadgeClass,
    isCurrentUser,
    showModal,
    modalMode,
    userForm,
    formError,
    isSubmitting,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSaveUser,
    showRoleModal,
    selectedRoleUser,
    selectedRoleValue,
    roleChangeOptions,
    isChangingRole,
    tableTopRef,
    openRoleModal,
    closeRoleModal,
    submitRoleChange,
    showConfirm,
    isDeleting,
    performDelete,
    cancelDelete,
    confirmDelete
  };
}
