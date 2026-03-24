import { watch } from 'vue';

export function useMockApiChangeWatcher(mainStore, onChange, options = {}) {
  const {
    shouldRefresh,
    beforeRefresh,
    source = () => mainStore.mockApi
  } = options;

  watch(source, async (value, oldValue) => {
    if (value === oldValue) {
      return;
    }

    if (typeof shouldRefresh === 'function') {
      const shouldRun = await shouldRefresh(value, oldValue);
      if (!shouldRun) {
        return;
      }
    }

    if (typeof beforeRefresh === 'function') {
      await beforeRefresh(value, oldValue);
    }

    await onChange(value, oldValue);
  });
}