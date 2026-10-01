/**
 * Registry of protected, session-scoped state.
 *
 * Caches that hold protected data (audit analytics, capability answers, comparison rows) are only
 * valid for the identity and session they were fetched for. A boolean `isAuthenticated` watch
 * cannot see a switch from user A to user B while both are signed in, so the invalidation is
 * driven from the session context itself: whoever changes the context resets every registration
 * here, whether or not a page happens to be mounted.
 */

const resetters = new Map();

/**
 * Registers a reset callback.
 *
 * @param {string} name unique label, used to make a duplicate registration diagnosable
 * @param {Function} reset called with (reason) whenever the session context changes
 * @returns {Function} unregisters the callback
 */
export function registerProtectedStateReset(name, reset) {
  if (typeof reset !== 'function') {
    throw new TypeError(`registerProtectedStateReset("${name}") requires a function`);
  }

  if (resetters.has(name) && resetters.get(name) !== reset) {
    console.warn(`[protectedState] replacing the reset registered as "${name}"`);
  }

  resetters.set(name, reset);

  return () => {
    if (resetters.get(name) === reset) resetters.delete(name);
  };
}

/**
 * Resets every registered protected state. One failing reset must not leave the others holding
 * data for the previous session, so failures are collected and reported, not thrown.
 */
export function resetProtectedState(reason = 'session-context-change') {
  const failures = [];

  for (const [name, reset] of resetters) {
    try {
      reset(reason);
    } catch (error) {
      failures.push({ name, error });
      console.warn(`[protectedState] reset "${name}" failed`, error);
    }
  }

  return { reason, count: resetters.size, failures };
}

/** Test/diagnostic helper: how many resets are currently registered. */
export function protectedStateResetCount() {
  return resetters.size;
}
