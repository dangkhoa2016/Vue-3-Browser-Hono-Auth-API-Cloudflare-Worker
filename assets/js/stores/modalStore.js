const { defineStore } = Pinia;

// Pinia modal management store
export const useModalStore = defineStore('modal', {
  // State
  state: () => ({
    showLoginModal: false,
    showRegisterModal: false,
    onLoginSuccessCallback: null,
    onCloseCallback: null
  }),

  // Actions
  actions: {
    // Open login modal with optional callback
    openLogin(onSuccess = null, onClose = null) {
      this.showLoginModal = true;
      this.showRegisterModal = false;
      this.onLoginSuccessCallback = onSuccess;
      this.onCloseCallback = onClose;
    },

    // Open register modal with optional callback
    openRegister(onSuccess = null, onClose = null) {
      this.showRegisterModal = true;
      this.showLoginModal = false;
      this.onLoginSuccessCallback = onSuccess;
      this.onCloseCallback = onClose;
    },

    // Close all modals
    closeAll() {
      this.showLoginModal = false;
      this.showRegisterModal = false;
      
      // Execute close callback if exists
      if (this.onCloseCallback) {
        this.onCloseCallback();
        this.onCloseCallback = null;
      }
      
      // Clear callbacks
      this.onLoginSuccessCallback = null;
    },

    // Handle successful login
    handleLoginSuccess(data) {
      // Execute success callback if exists
      if (this.onLoginSuccessCallback) {
        this.onLoginSuccessCallback(data);
      }
      this.closeAll();
    },

    // Switch between modals
    switchToRegister() {
      this.showLoginModal = false;
      this.showRegisterModal = true;
    },

    switchToLogin() {
      this.showRegisterModal = false;
      this.showLoginModal = true;
    }
  }
});
