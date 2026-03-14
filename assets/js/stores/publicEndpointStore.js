const { defineStore } = Pinia;
import { apiClient } from '../api.js';

const createInitialEntry = () => ({
  payload: null,
  loading: false,
  error: '',
  lastUpdated: null
});

export const usePublicEndpointStore = defineStore('publicEndpoint', {
  state: () => ({
    entries: {}
  }),

  actions: {
    ensureEntry(key) {
      const normalizedKey = String(key || '').trim();
      if (!normalizedKey) {
        return null;
      }

      if (!this.entries[normalizedKey]) {
        this.entries[normalizedKey] = createInitialEntry();
      }

      return this.entries[normalizedKey];
    },

    clearEntry(key) {
      const normalizedKey = String(key || '').trim();
      if (!normalizedKey) {
        return;
      }

      this.entries[normalizedKey] = createInitialEntry();
    },

    async fetchEndpoint({ key, endpointPath, fallbackErrorMessage = 'Failed to load data' }) {
      const entry = this.ensureEntry(key);
      if (!entry) {
        return {
          success: false,
          error: fallbackErrorMessage
        };
      }

      entry.loading = true;
      entry.error = '';

      try {
        const response = await apiClient.get(endpointPath);
        entry.payload = response?.data || null;
        entry.lastUpdated = new Date().toISOString();

        return {
          success: true,
          data: entry.payload
        };
      } catch (error) {
        entry.error = error?.response?.data?.error || error?.message || fallbackErrorMessage;
        return {
          success: false,
          error: entry.error
        };
      } finally {
        entry.loading = false;
      }
    }
  }
});
