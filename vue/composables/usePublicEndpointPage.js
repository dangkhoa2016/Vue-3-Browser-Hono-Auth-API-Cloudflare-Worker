import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient } from '/assets/js/api.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useModalState } from '/vue/composables/useModalState.js';

export function usePublicEndpointPage(options) {
  const {
    endpointPath,
    loadErrorKey,
    dataSelector = (payload) => payload?.data || {},
    messageSelector = (payload, endpointData) => payload?.message || endpointData?.message || '—'
  } = options;

  const { t } = useI18n({ useScope: 'global' });
  const mainStore = useMainStore();
  const isLoading = ref(false);
  const errorMessage = ref('');
  const payload = ref(null);
  const jsonModal = useModalState({ initialMode: 'json' });
  const showJsonModal = jsonModal.isOpen;

  const endpointData = computed(() => dataSelector(payload.value));
  const endpointMessage = computed(() => messageSelector(payload.value, endpointData.value));
  const formattedPayload = computed(() => JSON.stringify(payload.value ?? {}, null, 2));

  const loadData = async () => {
    try {
      isLoading.value = true;
      errorMessage.value = '';
      const response = await apiClient.get(endpointPath);
      payload.value = response.data;
    } catch (error) {
      errorMessage.value = error?.response?.data?.error || error?.message || t(loadErrorKey);
    } finally {
      isLoading.value = false;
    }
  };

  const openJsonModal = () => {
    if (!payload.value) {
      return;
    }

    jsonModal.open(null, 'json');
  };

  const closeJsonModal = () => {
    jsonModal.close({ reset: true });
  };

  watch(() => mainStore.mockApi, async (value, oldValue) => {
    if (value === oldValue) {
      return;
    }
    await loadData();
  });

  onMounted(loadData);

  return {
    isLoading,
    errorMessage,
    payload,
    showJsonModal,
    endpointData,
    endpointMessage,
    formattedPayload,
    loadData,
    openJsonModal,
    closeJsonModal
  };
}