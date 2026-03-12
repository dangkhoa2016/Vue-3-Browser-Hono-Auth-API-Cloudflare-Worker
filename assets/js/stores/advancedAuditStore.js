const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';

export const useAdvancedAuditStore = defineStore('advancedAudit', {
  state: () => ({
    analytics: null,
    compliance: null,
    archival: null,
    loading: false,
    error: null,
    lastUpdated: null
  }),

  actions: {
    async fetchAnalytics(timeframe = '7d') {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ANALYTICS, {
          params: { timeframe }
        });
        this.analytics = response.data?.data || response.data;
        this.lastUpdated = new Date().toISOString();
        return this.analytics;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch analytics';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchCompliance(timeframe = '7d') {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_COMPLIANCE, {
          params: { timeframe }
        });
        this.compliance = response.data?.data || response.data;
        return this.compliance;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch compliance reports';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async runArchival(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        // Set dryRun to false by default for actual UI clicks unless specified otherwise
        const payload = {
          dryRun: false,
          ...params
        };
        
        // Remove empty strings which may trigger strict enum validation errors
        if (payload.categoryFilter === '') {
          delete payload.categoryFilter;
        }

        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVAL_RUN, payload);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to run archival';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async restoreArchive(params) {
      this.loading = true;
      this.error = null;
      try {
        // Prepare backend compatible params
        let backendParams = { ...params };
        
        // Map frontend timeline='all' to actual startDate/endDate required by backend validator
        if (params?.timeline === 'all' && !params.startDate && !params.endDate) {
          const end = new Date();
          const start = new Date();
          start.setFullYear(start.getFullYear() - 10); // Use 10 years as "all" timeline representation
          backendParams = {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            ...params
          };
          delete backendParams.timeline;
        }

        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVAL_RESTORE, backendParams);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to restore archive';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async manualArchive(params) {
      this.loading = true;
      this.error = null;
      try {
        // Use unified POST /api/advanced-audit/archive endpoint with manual_archive action
        const payload = {
          action: 'manual_archive',
          ...params
        };
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVE, payload);
        return response.data?.data || response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to manually archive logs';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async exportAdvanced(params) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_EXPORT_ADVANCED, params);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to export advanced info';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchArchival() {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVAL);
        this.archival = response.data?.data || response.data;
        return this.archival;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch archival status';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchSecurityAnalytics(timeframe = '7d', includeDetails = false, silent = false) {
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ANALYTICS_SECURITY, {
          params: { timeframe, includeDetails }
        });
        return response.data?.data || response.data;
      } catch (error) {
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to fetch security analytics';
        throw error;
      } finally {
        if (!silent) this.loading = false;
      }
    },

    async fetchBehaviorAnalytics(timeframe = '7d', actorRole = null, includeDetails = false) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ANALYTICS_BEHAVIOR, {
          params: { timeframe, actorRole, includeDetails }
        });
        return response.data?.data || response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch behavior analytics';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchPerformanceAnalytics(timeframe = '7d') {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ANALYTICS_PERFORMANCE, {
          params: { timeframe }
        });
        return response.data?.data || response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch performance analytics';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchComplianceManagement(silent = false) {
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_COMPLIANCE_MANAGEMENT);
        return response.data?.data || response.data;
      } catch (error) {
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to fetch compliance management data';
        throw error;
      } finally {
        if (!silent) this.loading = false;
      }
    },

    async manageCompliance(params, silent = false) {
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_COMPLIANCE_MANAGEMENT, params);
        return response.data?.data || response.data;
      } catch (error) {
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to manage compliance';
        throw error;
      } finally {
        if (!silent) this.loading = false;
      }
    },

    async getArchive(silent = false) {
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVE);
        return response.data?.data || response.data;
      } catch (error) {
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to fetch archive information';
        throw error;
      } finally {
        if (!silent) this.loading = false;
      }
    },

    async manageArchive(params, silent = false) {
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVE, params);
        return response.data?.data || response.data;
      } catch (error) {
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to manage archive';
        throw error;
      } finally {
        if (!silent) this.loading = false;
      }
    },

    async fetchMiddlewareStats(silent = false) {
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_MIDDLEWARE_STATS);
        return response.data?.data || response.data;
      } catch (error) {
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to fetch middleware stats';
        throw error;
      } finally {
        if (!silent) this.loading = false;
      }
    },

    async manageRetention(params, silent = false) {
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_RETENTION, params);
        return response.data?.data || response.data;
      } catch (error) {
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to manage retention policy';
        throw error;
      } finally {
        if (!silent) this.loading = false;
      }
    }
  }
});
