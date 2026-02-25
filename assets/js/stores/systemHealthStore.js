const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';
import { i18n } from '../i18n.js';

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeSystemHealthPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  const databaseMetrics = payload.database?.metrics || {};
  const databaseSecurity = databaseMetrics.security || {};
  const system = payload.system || {};
  const systemPerformance = system.performance || {};
  const systemSecurity = system.security || {};

  return {
    ...payload,
    system: {
      ...system,
      performance: {
        ...systemPerformance,
        databaseResponseTime: systemPerformance.databaseResponseTime || databaseMetrics.performance?.queryResponseTime || '-'
      },
      security: {
        ...systemSecurity,
        recentFailedLogins: systemSecurity.recentFailedLogins ?? databaseSecurity.recentFailures ?? 0,
        totalFailedAttempts: systemSecurity.totalFailedAttempts ?? databaseSecurity.totalFailedAttempts ?? 0,
        uniqueIpsWithFailures: systemSecurity.uniqueIpsWithFailures ?? databaseSecurity.uniqueIpsWithFailures ?? 0
      }
    }
  };
};

export const useSystemHealthStore = defineStore('systemHealth', {
  state: () => ({
    healthData: null,
    loading: false,
    error: null,
    lastUpdated: null
  }),

  getters: {
    statusLabel: (state) => String(state.healthData?.status || '').toLowerCase(),
    healthChecks: (state) => {
      const source = state.healthData?.healthChecks;
      if (Array.isArray(source)) return source;
      if (source && typeof source === 'object') {
        return Object.entries(source).map(([name, status]) => ({ name, status }));
      }
      return [];
    },
    hasData: (state) => Boolean(state.healthData)
  },

  actions: {
    normalizeError(err) {
      return err?.response?.data?.error || err?.message || i18n.global.t('message.errors.unknown_error');
    },

    async fetchSystemHealth() {
      this.loading = true;
      this.error = null;

      try {
        const response = await apiClient.get(API_ENDPOINTS.ADMIN_SYSTEM_HEALTH);
        const payload = response?.data?.data || null;

        this.healthData = normalizeSystemHealthPayload(payload);
        this.lastUpdated = new Date().toISOString();

        return this.healthData;
      } catch (error) {
        this.error = this.normalizeError(error);
        return null;
      } finally {
        this.loading = false;
      }
    }
  }
});
