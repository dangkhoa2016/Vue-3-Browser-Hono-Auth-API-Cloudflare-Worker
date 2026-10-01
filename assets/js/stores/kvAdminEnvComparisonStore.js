const { defineStore } = Pinia;
import { apiClient } from '../api.js';
import { sanitizeEnvComparison } from '../api/backendContract.js';

export const useKvAdminEnvComparisonStore = defineStore('kvAdminEnvComparison', {
  state: () => ({
    isLoading: false,
    errorMessage: null,
    comparison: {},
    summary: {},
    lastUpdated: null
  }),

  actions: {
    resetState() {
      this.isLoading = false;
      this.errorMessage = null;
      this.comparison = {};
      this.summary = {};
      this.lastUpdated = null;
    },

    async fetchComparison(token) {
      this.isLoading = true;
      this.errorMessage = null;

      try {
        const response = await apiClient.get('/api/kv-admin/configs/env-comparison', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data?.success) {
          return {
            success: false,
            error: response.data?.error || 'Failed to fetch comparison'
          };
        }

        this.comparison = sanitizeEnvComparison(response.data?.data?.comparison);
        this.summary = this.buildSummary(response.data?.data?.summary);
        this.lastUpdated = new Date().toISOString();

        return {
          success: true,
          data: response.data?.data || {}
        };
      } catch (error) {
        this.errorMessage = error?.response?.data?.error || error?.message || 'Error loading data';

        return {
          success: false,
          error: this.errorMessage,
          status: error?.response?.status,
          code: error?.code
        };
      } finally {
        this.isLoading = false;
      }
    },

    buildSummary(summary) {
      const source = summary && typeof summary === 'object' && !Array.isArray(summary) ? summary : {};
      const entries = Object.entries(this.comparison);

      return {
        total: Number.isFinite(source.total) ? source.total : entries.length,
        fromKV: Number.isFinite(source.fromKV) ? source.fromKV : entries.filter(([, item]) => item.source === 'kv').length,
        fromEnv: Number.isFinite(source.fromEnv) ? source.fromEnv : entries.filter(([, item]) => item.source === 'env').length,
        fromDefault: Number.isFinite(source.fromDefault) ? source.fromDefault : entries.filter(([, item]) => item.source === 'default').length
      };
    }
  }
});
