const { defineStore } = Pinia;

// Pinia auth store
export const useAuthStore = defineStore('auth', {
  // State
  state: () => ({
    user: null,
    token: null
  }),

  // Getters
  getters: {
    isAuthenticated: (state) => !!state.user
  },

  // Actions
  actions: {
    login(userData, accessToken, refreshToken) {
      this.user = userData;
      this.token = accessToken;
      
      // Save to localStorage
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      }
      if (accessToken) {
        localStorage.setItem('token', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    },

    // Initialize from localStorage
    init() {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        
        if (savedUser) {
          this.user = JSON.parse(savedUser);
        }
        if (savedToken) {
          this.token = savedToken;
        }
      } catch (error) {
        console.error('Failed to load auth state from localStorage:', error);
        this.logout();
      }
    }
  }
});
