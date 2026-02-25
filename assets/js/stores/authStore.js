const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';
import { i18n } from '../i18n.js';

// Pinia auth store
export const useAuthStore = defineStore('auth', {
  // State
  state: () => ({
    user: null,
    token: null,
    refreshToken: null,
    expiresAt: null,
    refreshExpiresAt: null,
    isRefreshing: false,
    requiresReauth: false,
    reauthNoticeShown: false,
  }),

  // Getters
  getters: {
    isAuthenticated: (state) => !!state.user && !!state.token,
    
    isAccessTokenExpired: (state) => {
      if (!state.expiresAt) return true;
      // Add 60 seconds buffer to refresh before actual expiry
      return Date.now() / 1000 >= (state.expiresAt - 60);
    },
    
    isRefreshTokenExpired: (state) => {
      if (!state.refreshExpiresAt) return true;
      return Date.now() / 1000 >= state.refreshExpiresAt;
    },
    
    shouldRefreshToken: (state) => {
      return state.isAccessTokenExpired && !state.isRefreshTokenExpired && !state.isRefreshing;
    }
  },

  // Actions
  actions: {
    login(userData, accessToken, refreshToken, expiresAt = null, refreshExpiresAt = null) {
      this.user = userData;
      this.token = accessToken;
      this.refreshToken = refreshToken;
      this.expiresAt = expiresAt;
      this.refreshExpiresAt = refreshExpiresAt;
      this.requiresReauth = false;
      this.reauthNoticeShown = false;
      
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
      if (expiresAt) {
        localStorage.setItem('expires_at', expiresAt.toString());
      }
      if (refreshExpiresAt) {
        localStorage.setItem('refresh_expires_at', refreshExpiresAt.toString());
      }
    },

    async notifySessionExpired() {
      if (this.reauthNoticeShown) {
        return;
      }

      this.reauthNoticeShown = true;

      try {
        const { useToastStore } = await import('./toastStore.js');
        const toastStore = useToastStore();
        const message = i18n.global.t(
          'message.auth.relogin_required_reason',
          'Your session has expired or is invalid. Please login again to continue.'
        );
        const title = i18n.global.t('message.auth.login_required', 'Login Required');
        toastStore.warning(message, 7000, title);
      } catch (error) {
        console.warn('[AuthStore] Could not show re-login toast:', error);
      }
    },

    async requireReauthentication() {
      this.logout();
      this.requiresReauth = true;

      await this.notifySessionExpired();

      try {
        const { useModalStore } = await import('./modalStore.js');
        const modalStore = useModalStore();
        modalStore.openLogin();
      } catch (error) {
        console.warn('[AuthStore] Could not open login modal:', error);
      }
    },

    async refreshAccessToken() {
      if (this.requiresReauth) {
        return null;
      }

      // Prevent multiple simultaneous refresh attempts
      if (this.isRefreshing) {
        console.log('[AuthStore] Token refresh already in progress, waiting...');
        // Wait for the ongoing refresh to complete
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!this.isRefreshing) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
        return this.token;
      }

      // Check if refresh token is expired
      if (this.isRefreshTokenExpired) {
        console.log('[AuthStore] Refresh token expired, logout required');
        await this.requireReauthentication();
        return null;
      }

      this.isRefreshing = true;
      console.log('[AuthStore] Refreshing access token...');

      try {
        const response = await apiClient.post(API_ENDPOINTS.REFRESH_TOKEN, {
          refresh_token: this.refreshToken
        });

        if (response.data.success) {
          const { access_token, refresh_token, expires_at, refresh_expires_at, user } = response.data.data;
          
          // Update tokens
          this.login(user, access_token, refresh_token, expires_at, refresh_expires_at);
          
          console.log('[AuthStore] Token refreshed successfully');
          return access_token;
        } else {
          console.error('[AuthStore] Token refresh failed:', response.data.error);
          await this.requireReauthentication();
          return null;
        }
      } catch (error) {
        console.error('[AuthStore] Token refresh error:', error);
        
        // Any client error from refresh endpoint means refresh token/request is invalid
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          console.log('[AuthStore] Refresh token rejected by server, reauthentication required');
          await this.requireReauthentication();
        }
        
        return null;
      } finally {
        this.isRefreshing = false;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.refreshToken = null;
      this.expiresAt = null;
      this.refreshExpiresAt = null;
      this.isRefreshing = false;
      this.requiresReauth = false;
      this.reauthNoticeShown = false;
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('expires_at');
      localStorage.removeItem('refresh_expires_at');
    },

    // Initialize from localStorage
    init() {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        const savedRefreshToken = localStorage.getItem('refresh_token');
        const savedExpiresAt = localStorage.getItem('expires_at');
        const savedRefreshExpiresAt = localStorage.getItem('refresh_expires_at');
        
        if (savedUser) {
          this.user = JSON.parse(savedUser);
        }
        if (savedToken) {
          this.token = savedToken;
        }
        if (savedRefreshToken) {
          this.refreshToken = savedRefreshToken;
        }
        if (savedExpiresAt) {
          this.expiresAt = parseInt(savedExpiresAt, 10);
        }
        if (savedRefreshExpiresAt) {
          this.refreshExpiresAt = parseInt(savedRefreshExpiresAt, 10);
        }

        this.requiresReauth = false;
        this.reauthNoticeShown = false;

        // Check if refresh token is expired on init
        if (this.refreshToken && this.isRefreshTokenExpired) {
          console.log('[AuthStore] Refresh token expired on init, clearing auth state');
          this.logout();
        }
      } catch (error) {
        console.error('Failed to load auth state from localStorage:', error);
        this.logout();
      }
    }
  }
});
