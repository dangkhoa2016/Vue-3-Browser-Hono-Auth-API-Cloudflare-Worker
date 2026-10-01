import { computed, watch } from 'vue';
import { useAuthStore } from '/assets/js/stores/authStore.js';

/**
 * Observes the *session context* instead of the `isAuthenticated` boolean.
 *
 * A boolean watch cannot see a switch from user A to user B when both are authenticated: the value
 * never changes, so a protected page keeps the caches and the backend capability map of the
 * previous user/server. The context key below changes for every case that must invalidate
 * protected state: a new login, a logout, an API endpoint change, a cross-tab session takeover and
 * a token rotation that carries a different session.
 *
 * @param {Function} onContextChange called with (nextKey, previousKey) after a real change
 * @returns {{sessionContextKey: import('vue').ComputedRef<string>}}
 */
export function useSessionContextWatch(onContextChange, { immediate = true, authStore = null } = {}) {
  const store = authStore || useAuthStore();

  const sessionContextKey = computed(() => [
    store.apiIdentity || '',
    store.sessionId || '',
    store.sessionGeneration ?? 0
  ].join('|'));

  watch(sessionContextKey, (next, previous) => {
    if (next === previous) return;
    if (typeof onContextChange === 'function') onContextChange(next, previous);
  }, { immediate });

  return { sessionContextKey };
}
