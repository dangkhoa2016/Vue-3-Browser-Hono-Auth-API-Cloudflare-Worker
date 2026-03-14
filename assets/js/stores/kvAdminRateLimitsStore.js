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
    pruneForm: createInitialPruneForm()
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
          data: response.data
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
          data: response.data
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