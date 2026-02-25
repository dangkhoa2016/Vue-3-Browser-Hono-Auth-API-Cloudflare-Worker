const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';
import { i18n } from '../i18n.js';

const normalizeStatsPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  const usersByRole = payload.usersByRole && typeof payload.usersByRole === 'object'
    ? payload.usersByRole
    : {};

  return {
    totalUsers: Number(payload.totalUsers) || 0,
    activeUsers: Number(payload.activeUsers) || 0,
    inactiveUsers: Number(payload.inactiveUsers) || 0,
    suspendedUsers: Number(payload.suspendedUsers) || 0,
    recentRegistrations: Number(payload.recentRegistrations) || 0,
    usersByRole: {
      super_admin: Number(usersByRole.super_admin) || 0,
      admin: Number(usersByRole.admin) || 0,
      user: Number(usersByRole.user) || 0
    }
  };
};

export const useSystemStatsStore = defineStore('systemStats', {
  state: () => ({
    statsData: null,
    loading: false,
    error: null,
    lastUpdated: null
  }),

  getters: {
    hasData: (state) => Boolean(state.statsData),
    totalUsers: (state) => Number(state.statsData?.totalUsers) || 0,
    activeUsers: (state) => Number(state.statsData?.activeUsers) || 0,
    inactiveUsers: (state) => Number(state.statsData?.inactiveUsers) || 0,
    suspendedUsers: (state) => Number(state.statsData?.suspendedUsers) || 0,
    recentRegistrations: (state) => Number(state.statsData?.recentRegistrations) || 0,
    usersByRole: (state) => state.statsData?.usersByRole || { super_admin: 0, admin: 0, user: 0 }
  },

  actions: {
    normalizeError(err) {
      return err?.response?.data?.error || err?.message || i18n.global.t('message.errors.unknown_error');
    },

    async fetchSystemStats() {
      this.loading = true;
      this.error = null;

      try {
        const response = await apiClient.get(API_ENDPOINTS.ADMIN_STATS);
        const payload = response?.data?.data || null;

        this.statsData = normalizeStatsPayload(payload);
        this.lastUpdated = new Date().toISOString();

        return this.statsData;
      } catch (error) {
        this.error = this.normalizeError(error);
        return null;
      } finally {
        this.loading = false;
      }
    }
  }
});
