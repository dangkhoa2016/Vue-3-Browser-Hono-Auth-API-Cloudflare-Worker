const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';

const createInitialCleanForm = () => ({
  prefix: 'rate_limit:',
  dryRun: true
});

const createInitialPruneForm = () => ({
  prefix: 'rate_limit:',
  start: '',
  end: '',
  dryRun: true
});

export const useKvAdminRateLimitsStore = defineStore('kvAdminRateLimits', {
  state: () => ({
    isLoading: false,
    result: null,
    errorMessage: null,
    cleanForm: createInitialCleanForm(),
    pruneForm: createInitialPruneForm(),
    rateLimitsList: [],
    listComplete: true,
    listCursor: null,
    listPrefix: 'rate_limit:'
  }),

  actions: {
    initializePruneRange() {
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      this.pruneForm = {
        ...this.pruneForm,
        start: past.toISOString().slice(0, 16),
        end: now.toISOString().slice(0, 16)
      };
    },

    resetTransientState() {
      this.isLoading = false;
      this.result = null;
      this.errorMessage = null;
    },

    async loadRateLimits(token, { reset = true } = {}) {
      if (reset) {
        this.listCursor = null;
        this.rateLimitsList = [];
      }
      this.isLoading = true;
      this.errorMessage = null;

      try {
        const params = { limit: 50 };
        if (this.listPrefix) params.prefix = this.listPrefix;
        if (this.listCursor) params.cursor = this.listCursor;
        
        const response = await apiClient.get(API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_LIST, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });

        if (response.data?.success) {
          const result = response.data.data;
          this.rateLimitsList = reset ? result.keys : [...this.rateLimitsList, ...result.keys];
          this.listComplete = result.list_complete;
          this.listCursor = result.cursor;
          return { 
            success: true, 
            message: response.data.message 
          };
        } else {
          throw new Error('Failed to load rate limits list');
        }
      } catch (error) {
        this.errorMessage = error?.response?.data?.error || error?.message || 'Failed to load rate limits';
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

    async runClean(token) {
      this.isLoading = true;
      this.result = null;
      this.errorMessage = null;

      try {
        const response = await apiClient.post(API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_CLEAN, this.cleanForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.result = response.data;

        return {
          success: true,
          data: response.data,
          message: response.data?.message
        };
      } catch (error) {
        this.result = error?.response?.data || error?.message;
        this.errorMessage = error?.response?.data?.error || error?.message || 'Clean operation failed';

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

    async runPrune(token) {
      this.isLoading = true;
      this.result = null;
      this.errorMessage = null;

      try {
        const payload = {
          ...this.pruneForm,
          start: new Date(this.pruneForm.start).getTime(),
          end: new Date(this.pruneForm.end).getTime()
        };

        const response = await apiClient.post(API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_PRUNE_TIME, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        this.result = response.data;

        return {
          success: true,
          data: response.data,
          message: response.data?.message
        };
      } catch (error) {
        this.result = error?.response?.data || error?.message;
        this.errorMessage = error?.response?.data?.error || error?.message || 'Prune operation failed';

        return {
          success: false,
          error: this.errorMessage,
          status: error?.response?.status,
          code: error?.code
        };
      } finally {
        this.isLoading = false;
      }
    }
  }
});