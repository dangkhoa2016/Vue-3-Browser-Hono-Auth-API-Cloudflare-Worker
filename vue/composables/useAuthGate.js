import { ref } from 'vue';

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

  const markUnauthenticated = () => {
    if (typeof resetProtectedState === 'function') {
      resetProtectedState();
    }
    showLoginRequired.value = true;
  };

  const handleAuthStateChange = async (isAuthenticated) => {
    if (isAuthenticated === false) {
      markUnauthenticated();
      return;
    }

    if (isAuthenticated === true && showLoginRequired.value) {
      showLoginRequired.value = false;
      if (typeof onAuthenticated === 'function') {
        await onAuthenticated();
      }
    }
  };

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

        if (typeof onAuthenticated === 'function') {
          await onAuthenticated();
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

  const ensureAuthenticated = async ({ checkSessionFlag = true, openModal = true } = {}) => {
    const authRequired = checkSessionFlag && sessionStorage.getItem(sessionAuthFlagKey) === 'true';
    const isAuthenticated = !!(authStore && authStore.isAuthenticated);

    if (!isAuthenticated || authRequired) {
      markUnauthenticated();
      if (openModal) {
        openLoginModal();
      }
      return false;
    }

    showLoginRequired.value = false;
    if (typeof onAuthenticated === 'function') {
      await onAuthenticated();
    }
    return true;
  };

  return {
    showLoginRequired,
    openLoginModal,
    ensureAuthenticated,
    handleAuthStateChange,
    markUnauthenticated
  };
}
