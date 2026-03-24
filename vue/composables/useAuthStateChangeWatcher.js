import { watch } from 'vue';

export function useAuthStateChangeWatcher(authStore, handleAuthStateChange, options = {}) {
  const {
    immediate = false,
    onUnauthenticated,
    onStateChange,
    source = () => authStore.isAuthenticated
  } = options;

  watch(
    source,
    async (isAuthenticated) => {
      if (typeof onStateChange === 'function') {
        const shouldContinue = await onStateChange(isAuthenticated);
        if (shouldContinue === false) {
          return;
        }
      }

      if (isAuthenticated === false && typeof onUnauthenticated === 'function') {
        const shouldContinue = await onUnauthenticated(isAuthenticated);
        if (shouldContinue === false) {
          return;
        }
      }

      await handleAuthStateChange(isAuthenticated);
    },
    { immediate }
  );
}
