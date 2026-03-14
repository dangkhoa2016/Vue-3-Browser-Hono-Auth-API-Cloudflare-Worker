<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
      v-if="showLoginRequired"
      tone="amber"
      button-icon="bi bi-box-arrow-in-right text-lg"
      :title="$t('message.auth.login_required')"
  import { useKvAdminConfigsPage } from '/vue/composables/useKvAdminConfigsPage.js';
    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-20 -right-16 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"
      return useKvAdminConfigsPage();
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

    const applyLocalUpsert = (key, value) => {
      const existingIndex = rows.value.findIndex((row) => row.key === key);
      const defaultValue = existingIndex >= 0 ? rows.value[existingIndex].defaultValue : undefined;
      const valueLabel = formatValue(value);
      const defaultLabel = formatValue(defaultValue);
      const isOverride = valueLabel !== defaultLabel;
      const source = isOverride ? 'kv' : (defaultValue !== undefined ? 'default' : 'unknown');
      const nextRow = {
        key,
        value,
        defaultValue,
        valueLabel,
        defaultLabel,
        source,
        isOverride
      };

      if (existingIndex >= 0) {
        const next = [...rows.value];
        next[existingIndex] = nextRow;
        rows.value = next;
      } else {
        rows.value = [nextRow, ...rows.value];
        allowedCount.value += 1;
      }
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
          applyLocalUpsert(key, payloadValue);
          response = { success: true, message: editorMode.value === 'add' ? t('message.kv_admin_page.add_success') : t('message.kv_admin_page.edit_success') };
        } else {
          const endpoint = API_ENDPOINTS.KV_ADMIN_CONFIGS_SPECIFIC.replace(':key', encodeURIComponent(key));
          const apiResponse = await apiClient.put(endpoint, { value: payloadValue }, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          });
          response = apiResponse.data;
          if (response.success) {
            applyLocalUpsert(key, payloadValue);
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
        // show full error in modal
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
             // Reset back to default value instead of deleting row
             applyLocalUpsert(deleteKey.value, response.data.defaultValue);
          } else {
             // Fallback behavior if no defaultValue returned
             rows.value = rows.value.filter((row) => row.key !== deleteKey.value);
             allowedCount.value = Math.max(0, allowedCount.value - 1);
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
            applyLocalUpsert(configItem.key, configItem.value);
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
};
</script>

<style scoped>
.kv-error-message {
  color: #dc2626;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow: auto;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: rgba(254, 242, 242, 0.6);
}

.dark .kv-error-message {
  background: rgba(139, 0, 0, 0.06);
  color: #fecaca;
}
</style>
