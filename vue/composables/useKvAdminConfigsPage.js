import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useKvAdminConfigsStore } from '/assets/js/stores/kvAdminConfigsStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { useModalState } from '/vue/composables/useModalState.js';
import { useDebouncedFilters } from '/vue/composables/useDebouncedFilters.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { getKvSourceBadgeClass } from '/vue/composables/useUiClassMap.js';

export function useKvAdminConfigsPage() {
  const { t, tf } = useI18nFallback();
  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const mainStore = useMainStore();
  const kvAdminConfigsStore = useKvAdminConfigsStore();
  const { storeToRefs } = Pinia;
  const { isLoading, errorMessage, rows, allowedKeys, allowedCount, lastUpdated } = storeToRefs(kvAdminConfigsStore);

  const search = ref('');
  const debouncedSearch = ref('');
  const showOverridesOnly = ref(false);
  const copiedKey = ref(null);
  const copiedValue = ref(null);
  const editorModal = useModalState({ initialOpen: false, initialMode: 'add' });
  const editorOpen = editorModal.isOpen;
  const editorMode = editorModal.mode;
  const editorKey = ref('');
  const editorValue = ref('');
  const editorError = ref('');
  const isSaving = ref(false);

  const deleteModal = useModalState({ initialOpen: false, initialMode: 'delete' });
  const deleteOpen = deleteModal.isOpen;
  const deleteKey = ref('');
  const deleteError = ref('');
  const isDeleting = ref(false);

  const bulkModal = useModalState({ initialOpen: false, initialMode: 'bulk' });
  const bulkOpen = bulkModal.isOpen;
  const bulkItems = ref([]);
  const bulkError = ref('');
  const isBulkSaving = ref(false);
  const bulkSeed = ref(0);
  const bulkListRowId = ref(null);
  const toastStore = useToastStore();
  const { runDebounced, clearDebounce } = useDebouncedFilters(200);

  const heroSectionClass =
    'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
  const searchInputClass =
    'w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';
  const overrideFilterLabelClass =
    'inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200';
  const configCardClass =
    'group rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5';
  const editorKeyInputClass =
    'mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-60';
  const editorValueTextareaClass =
    'mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono';

  const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');

  const stats = computed(() => {
    const total = rows.value.length;
    const overrides = rows.value.filter((row) => row.source === 'kv' && row.isOverride).length;
    const allowed = allowedCount.value || rows.value.length;
    return { total, overrides, allowed };
  });

  const filteredRows = computed(() => {
    const term = debouncedSearch.value.trim().toLowerCase();
    return rows.value.filter((row) => {
      if (showOverridesOnly.value && !(row.source === 'kv' && row.isOverride)) {
        return false;
      }
      if (!term) return true;
      return row.key.toLowerCase().includes(term) ||
        row.valueLabel.toLowerCase().includes(term) ||
        row.defaultLabel.toLowerCase().includes(term);
    });
  });

  const bulkKeyOptions = computed(() => {
    const keySet = new Set([...(allowedKeys.value || []), ...rows.value.map((row) => row.key)]);
    return Array.from(keySet).sort((first, second) => first.localeCompare(second));
  });

  const lastUpdatedLabel = computed(() => {
    if (!lastUpdated.value) return '-';
    const date = new Date(lastUpdated.value);
    return Number.isNaN(date.getTime()) ? lastUpdated.value : date.toLocaleString();
  });

  const resetKvState = () => {
    kvAdminConfigsStore.resetState();
  };

  const loadConfigs = async () => {
    if (!authStore.isAuthenticated || !isSuperAdmin.value) {
      return;
    }

    const loadResult = await kvAdminConfigsStore.loadConfigs({
      token: authStore.token,
      mockApi: mainStore.mockApi
    });

    if (!loadResult.success) {
      const status = loadResult.status;
      if (status === 401 || status === 403) {
        authStore.logout();
        markUnauthenticated();
      }
      if (!errorMessage.value) {
        errorMessage.value = t('message.kv_admin_page.error_loading');
      }
    }
  };

  const {
    showLoginRequired,
    openLoginModal,
    ensureAuthenticated,
    handleAuthStateChange,
    markUnauthenticated
  } = useAuthGate({
    authStore,
    modalStore,
    sessionAuthFlagKey: 'authRequired',
    resetProtectedState: resetKvState,
    onAuthenticated: async () => {
      if (isSuperAdmin.value) {
        await loadConfigs();
      }
    },
    onModalSuccess: async () => {
      if (isSuperAdmin.value) {
        await loadConfigs();
      }
    }
  });

  const reload = async () => {
    await loadConfigs();
  };

  const clearSearch = () => {
    clearDebounce('kv-admin-configs-search');
    search.value = '';
    debouncedSearch.value = '';
  };

  const formatValueForEdit = (value) => {
    if (value === undefined) return '';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  };

  const sourceLabel = (source) => {
    if (source === 'kv') return t('message.kv_admin_page.source_kv');
    if (source === 'default') return t('message.kv_admin_page.source_default');
    return t('message.kv_admin_page.source_unknown');
  };

  const openAddModal = () => {
    editorMode.value = 'add';
    editorKey.value = '';
    editorValue.value = '';
    editorError.value = '';
    editorModal.open(null, 'add');
  };

  const openEditModal = (row) => {
    editorMode.value = 'edit';
    editorKey.value = row.key;
    editorValue.value = formatValueForEdit(row.value);
    editorError.value = '';
    editorModal.open(null, 'edit');
  };

  const closeEditor = () => {
    editorModal.close({ reset: false });
    editorError.value = '';
  };

  const createBulkItem = () => {
    const id = `bulk-${Date.now()}-${bulkSeed.value}`;
    bulkSeed.value += 1;
    return { id, key: '', value: '' };
  };

  const hydrateAllowedKeys = (data) => {
    kvAdminConfigsStore.hydrateAllowedKeys(data);
  };

  const ensureBulkKeyOptionsLoaded = async () => {
    if (bulkKeyOptions.value.length > 0) return;
    try {
      if (mainStore.mockApi) {
        const res = await fetch('/assets/data/kv-admin/configs.json', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = await res.json();
        const data = payload?.data || payload || {};
        hydrateAllowedKeys(data);
        return;
      }

      const defaultsEndpoint = `${API_ENDPOINTS.KV_ADMIN_CONFIGS}/defaults`;
      const defaultsRes = await apiClient.get(defaultsEndpoint, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      const defaultsPayload = defaultsRes?.data || {};
      const defaultsData = defaultsPayload?.data || defaultsPayload || {};
      hydrateAllowedKeys(defaultsData);
    } catch (_error) {
    }
  };

  const openBulkModal = async () => {
    bulkItems.value = [createBulkItem()];
    bulkError.value = '';
    bulkModal.open(null, 'bulk');
    await ensureBulkKeyOptionsLoaded();
  };

  const closeBulkModal = () => {
    bulkModal.close({ reset: false });
    bulkError.value = '';
    isBulkSaving.value = false;
    bulkListRowId.value = null;
  };

  const addBulkRow = () => {
    bulkItems.value = [...bulkItems.value, createBulkItem()];
  };

  const removeBulkRow = (index) => {
    if (bulkItems.value.length <= 1) return;
    bulkItems.value = bulkItems.value.filter((_, itemIndex) => itemIndex !== index);
  };

  const openBulkKeySuggestions = async (itemId) => {
    await ensureBulkKeyOptionsLoaded();
    bulkListRowId.value = itemId;
  };

  const onBulkKeyBlur = (itemId) => {
    if (bulkListRowId.value === itemId) {
      bulkListRowId.value = null;
    }
  };

  const focusBulkValueInput = (itemId) => {
    const valueInput = document.getElementById(`bulk-value-${itemId}`);
    if (!valueInput) return;
    requestAnimationFrame(() => {
      valueInput.focus();
    });
  };

  const onBulkKeyInput = (event, itemId) => {
    const keyInput = event?.target;
    if (!keyInput) return;
    bulkListRowId.value = itemId;

    requestAnimationFrame(() => {
      const value = String(keyInput.value || '').trim();
      if (!value) return;
      if (!bulkKeyOptions.value.includes(value)) return;

      bulkListRowId.value = null;
      keyInput.blur();
      focusBulkValueInput(itemId);
    });
  };

  const onBulkValueEnter = async (itemId) => {
    const currentIndex = bulkItems.value.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) return;

    const isLastRow = currentIndex === bulkItems.value.length - 1;
    if (isLastRow) {
      const nextItem = createBulkItem();
      bulkItems.value = [...bulkItems.value, nextItem];
      await nextTick();
      const nextKeyInput = document.getElementById(`bulk-key-${nextItem.id}`);
      if (nextKeyInput) {
        nextKeyInput.focus();
      }
      return;
    }

    const nextRow = bulkItems.value[currentIndex + 1];
    if (!nextRow) return;
    await nextTick();
    const nextKeyInput = document.getElementById(`bulk-key-${nextRow.id}`);
    if (nextKeyInput) {
      nextKeyInput.focus();
    }
  };

  const openDeleteModal = (row) => {
    deleteKey.value = row.key;
    deleteError.value = '';
    deleteModal.open(null, 'delete');
  };

  const closeDelete = () => {
    deleteModal.close({ reset: false });
    deleteError.value = '';
  };

  const parseInputValue = (value) => {
    const trimmed = String(value).trim();
    if (trimmed === '') return '';
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        return trimmed;
      }
    }
    return trimmed;
  };

  const showToast = (message, type = 'info', title = null) => {
    if (!toastStore) return;
    toastStore.add(message, type, 7500, title);
  };

  const isAuthTokenError = (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) return true;
    const code = String(error?.code || '').toUpperCase();
    if (code === 'REAUTH_REQUIRED') return true;
    const message = String(error?.message || '').toLowerCase();
    return message.includes('token') || message.includes('re-login') || message.includes('reauth');
  };

  const saveConfig = async () => {
    editorError.value = '';
    const key = editorKey.value.trim();
    if (!key) {
      editorError.value = t('message.kv_admin_page.validation_error');
      showToast(editorError.value, 'error');
      return;
    }

    if (editorMode.value === 'add' && rows.value.some((row) => row.key === key)) {
      editorError.value = t('message.kv_admin_page.validation_error');
      showToast(editorError.value, 'error');
      return;
    }

    const payloadValue = parseInputValue(editorValue.value);
    isSaving.value = true;

    try {
      let response;
      if (mainStore.mockApi) {
        kvAdminConfigsStore.applyLocalUpsert(key, payloadValue);
        response = { success: true, message: editorMode.value === 'add' ? t('message.kv_admin_page.add_success') : t('message.kv_admin_page.edit_success') };
      } else {
        const endpoint = API_ENDPOINTS.KV_ADMIN_CONFIGS_SPECIFIC.replace(':key', encodeURIComponent(key));
        const apiResponse = await apiClient.put(endpoint, { value: payloadValue }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });
        response = apiResponse.data;
        if (response.success) {
          kvAdminConfigsStore.applyLocalUpsert(key, payloadValue);
        } else {
          throw new Error(response.error || 'Unknown error');
        }
      }
      const toastMsg = response.message || (editorMode.value === 'add' ? t('message.kv_admin_page.add_success') : t('message.kv_admin_page.edit_success'));
      showToast(toastMsg, 'success');
      closeEditor();
    } catch (error) {
      let fullError = t('message.errors.unknown_error');
      if (error.response?.data) {
        const data = error.response.data;
        fullError = data.error || data.message || fullError;
      } else if (error.message) {
        fullError = error.message;
      }
      editorError.value = fullError;

      if (isAuthTokenError(error)) {
        closeEditor();
      }

      showToast(t(`message.kv_admin_page.save_error_default`, { key }), 'error');
    } finally {
      isSaving.value = false;
    }
  };

  const confirmDelete = async () => {
    deleteError.value = '';
    if (!deleteKey.value) return;
    isDeleting.value = true;

    try {
      const endpoint = API_ENDPOINTS.KV_ADMIN_CONFIGS_SPECIFIC.replace(':key', encodeURIComponent(deleteKey.value));
      const apiResponse = await apiClient.delete(endpoint, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      const response = apiResponse.data;

      if (response.success) {
        if (response.data && response.data.defaultValue !== undefined) {
          kvAdminConfigsStore.applyLocalUpsert(deleteKey.value, response.data.defaultValue);
        } else {
          kvAdminConfigsStore.removeLocalKey(deleteKey.value);
        }
      } else {
        throw new Error(response.error || 'Unknown error');
      }

      const toastMsg = response.message || t('message.kv_admin_page.delete_success');
      showToast(toastMsg, 'success');
      closeDelete();
    } catch (error) {
      let errorMsg = t('message.errors.unknown_error');
      if (error.response?.data) {
        const data = error.response.data;
        errorMsg = data.error || data.message || errorMsg;
      } else if (error.message) {
        errorMsg = error.message;
      }
      deleteError.value = errorMsg;
      showToast(errorMsg, 'error');
    } finally {
      isDeleting.value = false;
    }
  };

  const submitBulkUpdate = async () => {
    bulkError.value = '';

    const normalizedItems = bulkItems.value
      .map((item) => ({
        key: String(item.key || '').trim(),
        rawValue: item.value
      }))
      .filter((item) => item.key || String(item.rawValue || '').trim() !== '');

    if (!normalizedItems.length) {
      bulkError.value = t('message.kv_admin_page.bulk_validation_min_items');
      showToast(bulkError.value, 'error');
      return;
    }

    const missingKey = normalizedItems.some((item) => !item.key);
    if (missingKey) {
      bulkError.value = t('message.kv_admin_page.bulk_validation_missing_key');
      showToast(bulkError.value, 'error');
      return;
    }

    const duplicateKeys = new Set();
    const seenKeys = new Set();
    normalizedItems.forEach((item) => {
      if (seenKeys.has(item.key)) {
        duplicateKeys.add(item.key);
      }
      seenKeys.add(item.key);
    });

    if (duplicateKeys.size > 0) {
      bulkError.value = t('message.kv_admin_page.bulk_validation_duplicate_keys', {
        keys: Array.from(duplicateKeys).join(', ')
      });
      showToast(bulkError.value, 'error');
      return;
    }

    const availableKeys = new Set(bulkKeyOptions.value);
    const invalidKeys = normalizedItems
      .map((item) => item.key)
      .filter((key) => availableKeys.size > 0 && !availableKeys.has(key));

    if (invalidKeys.length > 0) {
      bulkError.value = t('message.kv_admin_page.bulk_validation_invalid_keys', {
        keys: invalidKeys.join(', ')
      });
      showToast(bulkError.value, 'error');
      return;
    }

    const requestConfigs = normalizedItems.map((item) => ({
      key: item.key,
      value: parseInputValue(item.rawValue)
    }));

    isBulkSaving.value = true;

    try {
      const endpoint = `${API_ENDPOINTS.KV_ADMIN_CONFIGS}/batch`;
      const apiResponse = await apiClient.post(endpoint, {
        configs: requestConfigs
      }, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });

      const payload = apiResponse.data || {};
      const resultData = payload.data || {};
      const responseErrors = resultData.errors || {};
      const failedKeys = new Set(Object.keys(responseErrors));
      const updatedCount = Number(resultData.summary?.updated) || (requestConfigs.length - failedKeys.size);

      requestConfigs.forEach((configItem) => {
        if (!failedKeys.has(configItem.key)) {
          kvAdminConfigsStore.applyLocalUpsert(configItem.key, configItem.value);
        }
      });

      if (failedKeys.size > 0) {
        bulkError.value = Object.entries(responseErrors)
          .map(([key, message]) => `${key}: ${message}`)
          .join('\n');
        showToast(t('message.kv_admin_page.bulk_partial_error', {
          updated: updatedCount,
          failed: failedKeys.size
        }), 'error');
      } else {
        showToast(payload.message || t('message.kv_admin_page.edit_success'), 'success');
        closeBulkModal();
      }
    } catch (error) {
      let errorMsg = t('message.errors.unknown_error');
      if (error.response?.data) {
        const data = error.response.data;
        errorMsg = data.error || data.message || errorMsg;
      } else if (error.message) {
        errorMsg = error.message;
      }
      bulkError.value = errorMsg;

      if (isAuthTokenError(error)) {
        closeBulkModal();
      }

      showToast(errorMsg, 'error');
    } finally {
      isBulkSaving.value = false;
    }
  };

  const copyText = async (type, key, value) => {
    try {
      await navigator.clipboard.writeText(String(value));
      if (type === 'key') {
        copiedKey.value = key;
        setTimeout(() => { copiedKey.value = null; }, 1200);
      } else {
        copiedValue.value = key;
        setTimeout(() => { copiedValue.value = null; }, 1200);
      }
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  watch(
    search,
    () => {
      runDebounced('kv-admin-configs-search', () => {
        debouncedSearch.value = search.value;
      });
    },
    { immediate: true }
  );

  watch(
    () => authStore.isAuthenticated,
    async (isAuthenticated) => {
      await handleAuthStateChange(isAuthenticated);
    }
  );

  watch(
    () => isSuperAdmin.value,
    async (value) => {
      if (value) {
        if (authStore.isAuthenticated) {
          await loadConfigs();
        }
        return;
      }
      resetKvState();
    }
  );

  watch(() => mainStore.mockApi, async (value, oldValue) => {
      if (value === oldValue) return;
      if (!authStore.isAuthenticated || !isSuperAdmin.value) return;
      await loadConfigs();
    }
  );

  onMounted(async () => {
    await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
  });

  return {
    showLoginRequired,
    isSuperAdmin,
    tf,
    isLoading,
    errorMessage,
    search,
    showOverridesOnly,
    heroSectionClass,
    searchInputClass,
    overrideFilterLabelClass,
    configCardClass,
    editorKeyInputClass,
    editorValueTextareaClass,
    rows,
    bulkOpen,
    bulkItems,
    bulkError,
    isBulkSaving,
    bulkKeyOptions,
    filteredRows,
    stats,
    lastUpdatedLabel,
    openLoginModal,
    reload,
    clearSearch,
    sourceBadgeClass: getKvSourceBadgeClass,
    sourceLabel,
    copyText,
    copiedKey,
    copiedValue,
    editorOpen,
    editorMode,
    editorKey,
    editorValue,
    editorError,
    isSaving,
    deleteOpen,
    deleteKey,
    deleteError,
    isDeleting,
    openAddModal,
    openBulkModal,
    closeBulkModal,
    addBulkRow,
    removeBulkRow,
    openBulkKeySuggestions,
    onBulkKeyBlur,
    bulkListRowId,
    onBulkKeyInput,
    onBulkValueEnter,
    submitBulkUpdate,
    openEditModal,
    closeEditor,
    saveConfig,
    openDeleteModal,
    closeDelete,
    confirmDelete
  };
}
