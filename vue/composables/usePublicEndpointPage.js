import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { usePublicEndpointStore } from '/assets/js/stores/publicEndpointStore.js';
import { useMockApiChangeWatcher } from '/vue/composables/useMockApiChangeWatcher.js';
import { useModalState } from '/vue/composables/useModalState.js';

export function usePublicEndpointPage(options) {
  const {
    cacheKey,
    endpointPath,
    loadErrorKey,
    dataSelector = (payload) => payload?.data || {},
    messageSelector = (payload, endpointData) => payload?.message || endpointData?.message || '—'
  } = options;

  const { t } = useI18n({ useScope: 'global' });
  const mainStore = useMainStore();
  const publicEndpointStore = usePublicEndpointStore();
  const jsonModal = useModalState({ initialMode: 'json' });
  const showJsonModal = jsonModal.isOpen;

  const stateKey = String(cacheKey || endpointPath);

  const endpointState = computed(() => {
    return publicEndpointStore.entries[stateKey] || {
      payload: null,
      loading: false,
      error: '',
      lastUpdated: null
    };
  });

  const isLoading = computed(() => Boolean(endpointState.value.loading));
  const errorMessage = computed(() => endpointState.value.error || '');
  const payload = computed(() => endpointState.value.payload);
  const endpointData = computed(() => dataSelector(payload.value));
  const endpointMessage = computed(() => messageSelector(payload.value, endpointData.value));
  const formattedPayload = computed(() => JSON.stringify(payload.value ?? {}, null, 2));

  const loadData = async () => {
    await publicEndpointStore.fetchEndpoint({
      key: stateKey,
      endpointPath,
      fallbackErrorMessage: t(loadErrorKey)
    });
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

  useMockApiChangeWatcher(mainStore, async () => {
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