const { defineStore } = Pinia;
import { apiClient } from '../api.js';
import { useToastStore } from './toastStore.js';
import { i18n } from '../i18n.js';

export const useTokenBlacklistStore = defineStore('tokenBlacklist', {
  state: () => ({
    items: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1
    },
    loading: false,
    error: null,
    lastUpdated: null,
    
    // Add operations state
    isSubmitting: false,
    addError: null,
    isDeleting: false
  }),

  actions: {
    async fetchTokens({ page = 1, limit = 10, search = '' } = {}) {
      this.loading = true;
      this.error = null;

      try {
        const params = new URLSearchParams({
          page,
          limit
        });

        if (search) {
          params.append('search', search);
        }

        const response = await apiClient.get(`/api/admin/token-blacklist?${params.toString()}`);
        
        if (response.data?.success) {
          this.items = response.data.data?.items || [];
          this.pagination = response.data.data?.pagination || { page, limit, total: 0, totalPages: 1 };
          this.lastUpdated = new Date().toISOString();
        } else {
          this.error = response.data?.message || 'Failed to fetch blacklist tokens.';
        }
      } catch (err) {
        console.error('Error fetching token blacklist:', err);
        let errorMessage = 'Network error while fetching data.';
        const errData = err.response?.data;
        if (errData?.error) {
          if (typeof errData.error === 'string') {
            errorMessage = errData.error;
          } else if (errData.error.issues && Array.isArray(errData.error.issues)) {
            errorMessage = errData.error.issues.map(i => i.message).join('\n');
          } else {
            errorMessage = JSON.stringify(errData.error);
          }
        } else if (errData?.message) {
          errorMessage = errData.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        this.error = errorMessage;
      } finally {
        this.loading = false;
      }
    },

    async addToken(payload) {
      this.isSubmitting = true;
      this.addError = null;
      
      try {
        const toastStore = useToastStore();
        
        // Ensure expiresAt is properly formatted
        const apiPayload = {
          jti: payload.jti,
          reason: payload.reason
        };

        if (payload.userId) {
          apiPayload.userId = parseInt(payload.userId, 10);
        }

        if (payload.expiresAt) {
           apiPayload.expiresAt = new Date(payload.expiresAt).toISOString();
        } else {
           // Provide a default 24h expiration
           const d = new Date();
           d.setHours(d.getHours() + 24);
           apiPayload.expiresAt = d.toISOString();
        }

        const response = await apiClient.post('/api/admin/token-blacklist', apiPayload);
        
        if (response.data?.success) {
          toastStore.success(
            i18n.global.t('message.token_blacklist.add_modal.success') || 'Token successfully added to blacklist.',
            5000,
            i18n.global.t('message.common.success') || 'Success'
          );
          
          // Refresh current page
          await this.fetchTokens({ 
            page: 1, 
            limit: this.pagination.limit 
          });
          
          return true;
        } else {
          this.addError = response.data?.message || i18n.global.t('message.token_blacklist.add_modal.failed') || 'Failed to add token to blacklist.';
          return false;
        }
      } catch (err) {
        console.error('Error adding token to blacklist:', err);
        const toastStore = useToastStore();
        let errorMessage = 'Network error.';
        const errData = err.response?.data;
        if (errData?.error) {
          if (typeof errData.error === 'string') {
            errorMessage = errData.error;
          } else if (errData.error.issues && Array.isArray(errData.error.issues)) {
            errorMessage = errData.error.issues.map(i => i.message).join('\n');
          } else {
            errorMessage = JSON.stringify(errData.error);
          }
        } else if (errData?.message) {
          errorMessage = errData.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.addError = errorMessage;
        toastStore.error(
          errorMessage,
          5000,
          i18n.global.t('message.common.error') || 'Error'
        );
        return false;
      } finally {
        this.isSubmitting = false;
      }
    },

    async removeToken(id) {
      this.isDeleting = true;
      const toastStore = useToastStore();
      
      try {
        const response = await apiClient.delete(`/api/admin/token-blacklist/${id}`);
        
        if (response.data?.success) {
          toastStore.success(
            i18n.global.t('message.token_blacklist.delete_modal.success') || 'Token successfully removed from blacklist.',
            5000,
            i18n.global.t('message.common.success') || 'Success'
          );
          
          // Check if we just deleted the last item on the page
          let targetPage = this.pagination.page;
          if (this.items.length === 1 && targetPage > 1) {
            targetPage -= 1;
          }
          
          await this.fetchTokens({ 
            page: targetPage, 
            limit: this.pagination.limit 
          });
          return true;
        } else {
           toastStore.error(
            response.data?.message || i18n.global.t('message.token_blacklist.delete_modal.failed') || 'Failed to remove token from blacklist.',
            5000,
            i18n.global.t('message.common.error') || 'Error'
          );
          return false;
        }
      } catch (err) {
         console.error('Error removing token from blacklist:', err);
         let errorMessage = 'Network error.';
         const errData = err.response?.data;
         if (errData?.error) {
           if (typeof errData.error === 'string') {
             errorMessage = errData.error;
           } else if (errData.error.issues && Array.isArray(errData.error.issues)) {
             errorMessage = errData.error.issues.map(i => i.message).join('\n');
           } else {
             errorMessage = JSON.stringify(errData.error);
           }
         } else if (errData?.message) {
           errorMessage = errData.message;
         } else if (err.message) {
           errorMessage = err.message;
         }

         toastStore.error(
            errorMessage,
            5000,
            i18n.global.t('message.common.error') || 'Error'
          );
          return false;
      } finally {
        this.isDeleting = false;
      }
    },

    clearError() {
      this.error = null;
    }
  }
});
