const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null,
    loadingProfile: false,
    errorMessage: null,
    lastUpdated: null
  }),

  actions: {
    resetProfile() {
      this.profile = null;
      this.loadingProfile = false;
      this.errorMessage = null;
      this.lastUpdated = null;
    },

    async fetchProfile(token) {
      this.loadingProfile = true;
      this.errorMessage = null;

      try {
        const response = await apiClient.get(API_ENDPOINTS.PROFILE, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response?.data?.success) {
          return {
            success: false,
            error: response?.data?.error || response?.data?.message || 'Failed to load profile'
          };
        }

        this.profile = response.data.data || null;
        this.lastUpdated = new Date().toISOString();

        return {
          success: true,
          data: this.profile,
          message: response?.data?.message || ''
        };
      } catch (error) {
        this.errorMessage = error?.response?.data?.error || error?.message || 'Failed to load profile';
        return {
          success: false,
          error: this.errorMessage,
          responseStatus: error?.response?.status,
          responseData: error?.response?.data
        };
      } finally {
        this.loadingProfile = false;
      }
    },

    async saveProfile(token, payload) {
      const response = await apiClient.put(API_ENDPOINTS.PROFILE, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response?.data?.success) {
        return {
          success: false,
          error: response?.data?.error || response?.data?.message || 'Failed to update profile'
        };
      }

      const updatedProfile = response.data.data || {};
      const currentProfile = this.profile || {};

      this.profile = {
        ...currentProfile,
        ...updatedProfile,
        full_name: updatedProfile.full_name || payload.full_name || currentProfile.full_name,
        email: updatedProfile.email || currentProfile.email,
        new_email: Object.prototype.hasOwnProperty.call(updatedProfile, 'new_email') ? updatedProfile.new_email : currentProfile.new_email
      };
      this.lastUpdated = new Date().toISOString();

      return {
        success: true,
        data: this.profile,
        message: response?.data?.message || ''
      };
    },

    async clearPendingEmail(token) {
      const response = await apiClient.delete(API_ENDPOINTS.CLEAR_PENDING_EMAIL, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response?.data?.success) {
        return {
          success: false,
          error: response?.data?.error || response?.data?.message || 'Failed to clear pending email'
        };
      }

      const updatedProfile = response.data.data || {};
      const currentProfile = this.profile || {};

      this.profile = {
        ...currentProfile,
        ...updatedProfile,
        new_email: Object.prototype.hasOwnProperty.call(updatedProfile, 'new_email') ? updatedProfile.new_email : null,
        emailVerificationPending: false
      };
      this.lastUpdated = new Date().toISOString();

      return {
        success: true,
        data: this.profile,
        message: response?.data?.message || ''
      };
    },

    async changePassword(token, payload) {
      const response = await apiClient.put(API_ENDPOINTS.CHANGE_PASSWORD, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response?.data?.success) {
        return {
          success: false,
          error: response?.data?.error || response?.data?.message || 'Failed to change password'
        };
      }

      return {
        success: true,
        data: response?.data?.data || null,
        message: response?.data?.message || ''
      };
    }
  }
});
