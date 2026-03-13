const { defineStore } = Pinia;
import { apiClient } from '../api.js';
import { useToastStore } from './toastStore.js';
import { i18n } from '../i18n.js';

export const useTokenAuditStore = defineStore('tokenAudit', {
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
    
    // View details state
    currentLog: null,
    isFetchingLog: false,
    
    // Delete state
    isDeleting: false
  }),

  actions: {
    async fetchLogs({ page = 1, limit = 10, search = '' } = {}) {
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

        const response = await apiClient.get(`/api/admin/token-audit?${params.toString()}`);
        
        if (response.data?.success) {
          this.items = response.data.data?.items || [];
          
          if (response.data.data) {
             this.pagination = { 
               page: Number(response.data.data.page) || page, 
               limit: Number(response.data.data.limit) || limit, 
               total: Number(response.data.data.total) || 0, 
               totalPages: Number(response.data.data.totalPages) || 1 
             };
          } else {
             this.pagination = { page, limit, total: 0, totalPages: 1 };
          }
          
          this.lastUpdated = new Date().toISOString();
        } else {
          this.error = response.data?.message || 'Failed to fetch token audit logs.';
        }
      } catch (err) {
        console.error('Error fetching token audit logs:', err);
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

    async fetchLogDetails(id) {
      this.isFetchingLog = true;
      try {
        const response = await apiClient.get(`/api/admin/token-audit/${id}`);
        if (response.data?.success) {
          this.currentLog = response.data.data;
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error fetching token audit log details:', err);
        const toastStore = useToastStore();
        toastStore.error(
          err.response?.data?.message || err.message || 'Error fetching details.',
          5000,
          i18n.global.t('message.common.error') || 'Error'
        );
        return false;
      } finally {
        this.isFetchingLog = false;
      }
    },

    async deleteLog(id) {
      this.isDeleting = true;
      const toastStore = useToastStore();
      
      try {
        const response = await apiClient.delete(`/api/admin/token-audit/${id}`);
        if (response.data?.success) {
          toastStore.success(
            i18n.global.t('message.token_audit.delete_success') || 'Audit log successfully deleted.',
            5000,
            i18n.global.t('message.common.success') || 'Success'
          );
          
          let targetPage = this.pagination.page;
          if (this.items.length === 1 && targetPage > 1) {
            targetPage -= 1;
          }
          
          await this.fetchLogs({ 
            page: targetPage, 
            limit: this.pagination.limit 
          });
          return true;
        } else {
          toastStore.error(
            response.data?.message || 'Failed to delete audit log.',
            5000,
            i18n.global.t('message.common.error') || 'Error'
          );
          return false;
        }
      } catch (err) {
         console.error('Error deleting token audit log:', err);
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
    
    async bulkDeleteLogs(ids) {
      this.isDeleting = true;
      const toastStore = useToastStore();
      
      try {
        const response = await apiClient.post('/api/admin/token-audit/bulk-delete', { ids });
        if (response.data?.success) {
          toastStore.success(
            i18n.global.t('message.token_audit.bulk_delete_success', { count: response.data.data?.deleted_sub_count || ids.length }) || `Successfully deleted ${ids.length} audit logs.`,
            5000,
            i18n.global.t('message.common.success') || 'Success'
          );
          
          await this.fetchLogs({ 
            page: 1, 
            limit: this.pagination.limit 
          });
          return true;
        } else {
          toastStore.error(
            response.data?.message || 'Failed to bulk delete audit logs.',
            5000,
            i18n.global.t('message.common.error') || 'Error'
          );
          return false;
        }
      } catch (err) {
         console.error('Error bulk deleting token audit logs:', err);
         let errorMessage = 'Network error.';
         // (Omitted generic error mapper code repetition for brevity, using simple mapper)
         if (err.response?.data?.error) {
             errorMessage = typeof err.response.data.error === 'string' ? err.response.data.error : JSON.stringify(err.response.data.error);
         } else if (err.response?.data?.message) {
             errorMessage = err.response.data.message;
         }
         toastStore.error(errorMessage, 5000, i18n.global.t('message.common.error') || 'Error');
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
