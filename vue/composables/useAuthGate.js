import { computed, ref, watch } from 'vue';
import { useSessionContextWatch } from './useSessionContextWatch.js';

/**
 * Custom composable to handle route/page level authentication gating.
 * Determines if a user is authenticated using the authStore and triggers login modals if needed.
 * 
 * @param {Object} options Configuration options
 * @param {Object} options.authStore The Pinia auth store instance
 * @param {Object} [options.modalStore] The Pinia modal store instance (used to open login modals)
 * @param {string} [options.sessionAuthFlagKey='authRequired'] Session storage key flag for checking forced login state
 * @param {Function} [options.resetProtectedState] Callback invoked when the user becomes unauthenticated
 * @param {Function} [options.onAuthenticated] Callback invoked when the user is successfully authenticated
 * @param {Function} [options.onModalSuccess] Callback invoked upon successful login modal submission
 * @param {Function} [options.onModalCloseUnauthenticated] Callback invoked if login modal is closed without success
 * @param {boolean} [options.autoInit=true] Whether to auto-initialize the auth store hook on creation
 * 
 * @returns {Object} Methods and state to handle Auth Gating
 */
export function useAuthGate(options) {
  const {
    authStore,
    modalStore,
    sessionAuthFlagKey = 'authRequired',
    resetProtectedState,
    onAuthenticated,
    onModalSuccess,
    onModalCloseUnauthenticated,
    autoInit = true
  } = options || {};

  const showLoginRequired = ref(false);

  if (autoInit && authStore && typeof authStore.init === 'function') {
    authStore.init();
  }

  /**
   * Watches the session context, not the `isAuthenticated` boolean. A→B while both are signed in
   * never flips that boolean, so a page would otherwise keep the protected caches of the previous
   * user or of the previous API server (review OF-01/OF-08).
   */
  const sessionContextKey = computed(() => authStore
    ? [authStore.apiIdentity || '', authStore.sessionId || '', authStore.sessionGeneration ?? 0].join('|')
    : '');

  let lastAuthenticatedContext = null;
  const notifyAuthenticated = async () => {
    // Record before awaiting: committing login can wake the page watcher before
    // the modal emits success, even while the page's request is still pending.
    lastAuthenticatedContext = sessionContextKey.value;
    if (typeof onAuthenticated === 'function') {
      await onAuthenticated();
    }
  };

  useSessionContextWatch(() => {
    if (typeof resetProtectedState === 'function') {
      resetProtectedState();
    }
  }, { authStore });

  /**
   * Internal mechanism to explicitly shift the user context back to unauthenticated.
   * Clears protected state locally to prevent data leaks.
   */
  const markUnauthenticated = () => {
    lastAuthenticatedContext = null;
    if (typeof resetProtectedState === 'function') {
      resetProtectedState();
    }
    showLoginRequired.value = true;
  };

  /**
   * Event listener bound to reactivity elements reflecting Vue/Pinia state changes.
   * @param {boolean} isAuthenticated 
   */
  const handleAuthStateChange = async (isAuthenticated) => {
    if (isAuthenticated === false) {
      markUnauthenticated();
      return;
    }

    if (isAuthenticated === true && showLoginRequired.value) {
      showLoginRequired.value = false;
      await notifyAuthenticated();
    }
  };

  /**
   * Triggers the global Login modal if modalStore exists.
   * Modifies internal session tracking appropriately based on user interaction outcome.
   */
  const openLoginModal = () => {
    if (!modalStore || typeof modalStore.openLogin !== 'function') return;

    modalStore.openLogin(
      async () => {
        sessionStorage.removeItem(sessionAuthFlagKey);
        sessionStorage.removeItem('intendedRoute');
        showLoginRequired.value = false;

        if (typeof onModalSuccess === 'function') {
          await onModalSuccess();
          return;
        }

        // The observer may already have loaded this session. A modal-specific
        // callback above remains explicit; only its default fallback is shared.
        if (lastAuthenticatedContext !== sessionContextKey.value) {
          await notifyAuthenticated();
        }
      },
      () => {
        if (!authStore || !authStore.isAuthenticated) {
          showLoginRequired.value = true;
          if (typeof onModalCloseUnauthenticated === 'function') {
            onModalCloseUnauthenticated();
          }
        }
      }
    );
  };

  /**
   * Main gate-keeper logic. Verifies store truth and fallback session-flags.
   * Prompts action (via Modal) naturally if user drops auth.
   * 
   * @param {Object} args Guard settings
   * @param {boolean} [args.checkSessionFlag=true] Whether to check the session storage flag for forced auth logic
   * @param {boolean} [args.openModal=true] Whether to open the login modal automatically if unauthenticated
   * @returns {Promise<boolean>} True if the request proceeds seamlessly, otherwise false
   */
  const ensureAuthenticated = async ({ checkSessionFlag = true, openModal = true } = {}) => {
    const authRequired = checkSessionFlag && sessionStorage.getItem(sessionAuthFlagKey) === 'true';
    const isAuthenticated = !!(authStore && authStore.isAuthenticated);

    if (!isAuthenticated) {
      markUnauthenticated();
      if (openModal) {
        openLoginModal();
      }
      return false;
    }

    if (authRequired) {
      sessionStorage.removeItem(sessionAuthFlagKey);
      sessionStorage.removeItem('intendedRoute');
    }

    showLoginRequired.value = false;
    await notifyAuthenticated();
    return true;
  };

  return {
    showLoginRequired,
    openLoginModal,
    ensureAuthenticated,
    handleAuthStateChange,
    markUnauthenticated,
    sessionContextKey
  };
}
