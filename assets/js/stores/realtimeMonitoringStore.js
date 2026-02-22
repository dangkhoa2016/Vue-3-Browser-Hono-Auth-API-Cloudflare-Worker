const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';
import { i18n } from '../i18n.js';

export const useRealtimeMonitoringStore = defineStore('realtimeMonitoring', {
  state: () => ({
    timestamp: null,
    status: null,
    overview: null,
    realtime: null,
    users: null,
    security: null,
    metadata: null,
    threats: {
      activeThreats: [],
      resolvedThreats: [],
      recentThreats: []
    },
    alertsStatus: null,
    alertsHistory: {
      alerts: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
    },
    timeline: { points: [] },
    health: null,
    latestAnalysis: null,
    latestSimulation: null,
    loading: false,
    actionLoading: false,
    error: null,
    lastUpdated: null
  }),

  getters: {
    activeThreatCount: (state) => {
      if (typeof state.threats?.activeThreatsCount === 'number') return state.threats.activeThreatsCount;
      if (Array.isArray(state.threats?.activeThreats)) return state.threats.activeThreats.length;
      return 0;
    },
    resolvedThreatCount: (state) => {
      if (typeof state.threats?.resolvedThreatsCount === 'number') return state.threats.resolvedThreatsCount;
      if (Array.isArray(state.threats?.resolvedThreats)) return state.threats.resolvedThreats.length;
      return 0;
    },
    alertsCount: (state) => {
      if (typeof state.alertsStatus?.activeAlerts === 'number') return state.alertsStatus.activeAlerts;
      if (Array.isArray(state.alertsHistory?.alerts)) return state.alertsHistory.alerts.length;
      return 0;
    },
    isMonitoringActive: (state) => Boolean(
      state.status?.isActive
      ?? state.status?.monitoringActive
      ?? state.status?.monitoring?.active
      ?? state.realtime?.isActive
      ?? state.overview?.monitoringActive
    )
  },

  actions: {
    normalizeError(err) {
      return (err && err.message) || i18n.global.t('message.errors.unknown_error');
    },

    async fetchMonitoringStatus() {
      this.loading = true;
      this.error = null;

      try {
        const response = await apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_STATUS);
        const payload = response?.data?.data || {};
        const resolvedIsActive = typeof payload?.isActive === 'boolean'
          ? payload.isActive
          : (typeof payload?.monitoring?.active === 'boolean' ? payload.monitoring.active : undefined);

        this.status = {
          ...(this.status || {}),
          ...(payload && typeof payload === 'object' ? payload : {}),
          ...(typeof resolvedIsActive === 'boolean' ? { isActive: resolvedIsActive } : {})
        };

        if (typeof resolvedIsActive === 'boolean') {
          this.realtime = {
            ...(this.realtime || {}),
            isActive: resolvedIsActive
          };
        }

        this.lastUpdated = new Date().toISOString();
        return this.status;
      } catch (error) {
        this.error = this.normalizeError(error);
        return null;
      } finally {
        this.loading = false;
      }
    },

    applySnapshot(snapshot = {}) {
      if (!snapshot || typeof snapshot !== 'object') {
        return;
      }

      if (snapshot.timestamp) {
        this.timestamp = snapshot.timestamp;
      }

      if (snapshot.status) {
        this.status = snapshot.status;
      }
      if (snapshot.overview) {
        this.overview = snapshot.overview;
      }
      if (snapshot.realtime) {
        this.realtime = snapshot.realtime;
      }
      if (snapshot.threats) {
        this.threats = snapshot.threats;
      }
      if (snapshot.alertsStatus) {
        this.alertsStatus = snapshot.alertsStatus;
      }
      if (snapshot.alertsHistory) {
        this.alertsHistory = snapshot.alertsHistory;
      }
      if (snapshot.timeline) {
        this.timeline = snapshot.timeline;
      }
      if (snapshot.health) {
        this.health = snapshot.health;
      }
      if (snapshot.users) {
        this.users = snapshot.users;
      }
      if (snapshot.security) {
        this.security = snapshot.security;
      }
      if (snapshot.metadata) {
        this.metadata = snapshot.metadata;
      }
    },

    async fetchDashboardData() {
      this.loading = true;
      this.error = null;

      try {
        const [
          statusRes,
          overviewRes,
          realtimeRes,
          threatsRes,
          alertsStatusRes,
          alertsHistoryRes,
          timelineRes,
          healthRes
        ] = await Promise.all([
          apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_STATUS),
          apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_OVERVIEW),
          apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_REALTIME),
          apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_THREATS),
          apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_ALERTS_STATUS),
          apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_ALERTS_HISTORY),
          apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_TIMELINE),
          apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_HEALTH)
        ]);

        const statusPayload = statusRes?.data?.data || {};
        const overviewPayload = overviewRes?.data?.data || null;
        const realtimePayload = realtimeRes?.data?.data || {};
        const threatsPayload = threatsRes?.data?.data || this.threats;
        const alertsStatusPayload = alertsStatusRes?.data?.data || null;
        const alertsHistoryPayload = alertsHistoryRes?.data?.data || this.alertsHistory;
        const timelinePayload = timelineRes?.data?.data || this.timeline;
        const healthPayload = healthRes?.data?.data || null;

        const resolvedIsActive = typeof statusPayload?.isActive === 'boolean'
          ? statusPayload.isActive
          : (typeof statusPayload?.monitoring?.active === 'boolean' ? statusPayload.monitoring.active : undefined);

        this.status = {
          ...(this.status || {}),
          ...(statusPayload && typeof statusPayload === 'object' ? statusPayload : {}),
          ...(typeof resolvedIsActive === 'boolean' ? { isActive: resolvedIsActive } : {})
        };

        this.overview = overviewPayload;
        this.threats = threatsPayload;
        this.alertsStatus = alertsStatusPayload;
        this.alertsHistory = alertsHistoryPayload;
        this.timeline = timelinePayload;
        this.health = healthPayload;

        if (realtimePayload && realtimePayload.overview && realtimePayload.timeline && realtimePayload.users && realtimePayload.security) {
          this.applySnapshot(realtimePayload);
        } else if (
          realtimePayload.status ||
          realtimePayload.overview ||
          realtimePayload.realtime ||
          realtimePayload.threats ||
          realtimePayload.alertsStatus ||
          realtimePayload.alertsHistory ||
          realtimePayload.timeline ||
          realtimePayload.health
        ) {
          this.applySnapshot(realtimePayload);
        } else {
          this.realtime = realtimePayload;
        }

        if (typeof resolvedIsActive === 'boolean') {
          this.realtime = {
            ...(this.realtime || {}),
            isActive: resolvedIsActive
          };
        }

        this.lastUpdated = new Date().toISOString();
      } catch (error) {
        this.error = this.normalizeError(error);
      } finally {
        this.loading = false;
      }
    },

    async startMonitoring(intervalMs = 5000, enableThreatDetection = true) {
      this.actionLoading = true;
      this.error = null;

      try {
        const response = await apiClient.post(API_ENDPOINTS.REALTIME_MONITORING_START, {
          intervalMs,
          enableThreatDetection
        });
        const payload = response?.data?.data || {};
        this.status = {
          ...(this.status || {}),
          ...(payload && typeof payload === 'object' ? payload : {}),
          isActive: typeof payload?.isActive === 'boolean' ? payload.isActive : true
        };

        if (!this.realtime || typeof this.realtime !== 'object') {
          this.realtime = {};
        }
        this.realtime = {
          ...this.realtime,
          isActive: true,
          lastUpdated: payload?.startedAt || new Date().toISOString()
        };
        this.lastUpdated = new Date().toISOString();
        return response?.data || null;
      } catch (error) {
        this.error = this.normalizeError(error);
        return null;
      } finally {
        this.actionLoading = false;
      }
    },

    async stopMonitoring() {
      this.actionLoading = true;
      this.error = null;

      try {
        const response = await apiClient.post(API_ENDPOINTS.REALTIME_MONITORING_STOP, {});
        const payload = response?.data?.data || {};
        this.status = {
          ...(this.status || {}),
          ...(payload && typeof payload === 'object' ? payload : {}),
          isActive: typeof payload?.isActive === 'boolean' ? payload.isActive : false
        };

        if (!this.realtime || typeof this.realtime !== 'object') {
          this.realtime = {};
        }
        this.realtime = {
          ...this.realtime,
          isActive: false,
          lastUpdated: new Date().toISOString()
        };
        this.lastUpdated = new Date().toISOString();
        return response?.data || null;
      } catch (error) {
        this.error = this.normalizeError(error);
        return null;
      } finally {
        this.actionLoading = false;
      }
    },

    async analyzeThreats(hours = 1) {
      this.actionLoading = true;
      this.error = null;

      try {
        const response = await apiClient.post(API_ENDPOINTS.REALTIME_MONITORING_ANALYZE, { hours });
        this.latestAnalysis = response?.data?.data || null;

        if (this.latestAnalysis && typeof this.latestAnalysis === 'object') {
          const threatsDetected = Number(this.latestAnalysis.threatsDetected);
          const anomalies = Number(this.latestAnalysis.anomalies);

          if (!Number.isNaN(threatsDetected)) {
            this.overview = {
              ...(this.overview || {}),
              threatsDetected
            };
          }

          if (!Number.isNaN(anomalies)) {
            this.overview = {
              ...(this.overview || {}),
              anomaliesDetected: anomalies
            };
          }

          if (this.latestAnalysis.generatedAt) {
            this.realtime = {
              ...(this.realtime || {}),
              lastUpdated: this.latestAnalysis.generatedAt
            };
          }
        }

        this.lastUpdated = new Date().toISOString();
        return this.latestAnalysis;
      } catch (error) {
        this.error = this.normalizeError(error);
        return null;
      } finally {
        this.actionLoading = false;
      }
    },

    async simulateEvent(payload = { eventType: 'test_event', data: { test: true } }) {
      this.actionLoading = true;
      this.error = null;

      try {
        const response = await apiClient.post(API_ENDPOINTS.REALTIME_MONITORING_SIMULATE, payload);
        this.latestSimulation = response?.data?.data || null;
        this.lastUpdated = new Date().toISOString();
        return this.latestSimulation;
      } catch (error) {
        this.error = this.normalizeError(error);
        return null;
      } finally {
        this.actionLoading = false;
      }
    },

    async exportDashboard(options = {}) {
      this.actionLoading = true;
      this.error = null;

      try {
        const format = String(options.format || 'json').toLowerCase();
        const timeRange = options.timeRange || 'last_24h';
        const response = await apiClient.post(API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_EXPORT, {
          format,
          timeRange
        });

        const payload = response?.data;
        const metadata = payload?.data?.metadata || payload?.metadata || {};
        const fileMeta = payload?.meta || {};
        const content = payload?.data;

        let fileContent = '';
        let mimeType = 'application/json;charset=utf-8';
        let extension = format === 'csv' ? 'csv' : 'json';

        if (format === 'csv' && typeof content === 'string') {
          fileContent = content;
          mimeType = 'text/csv;charset=utf-8';
        } else {
          fileContent = JSON.stringify(content, null, 2);
          mimeType = 'application/json;charset=utf-8';
          extension = 'json';
        }

        const filename = fileMeta?.filename || metadata?.filename || `realtime-monitoring-${Date.now()}.${extension}`;
        if (typeof fileMeta?.contentType === 'string' && fileMeta.contentType.trim()) {
          mimeType = fileMeta.contentType;
        }
        const blob = new Blob([fileContent], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);

        this.lastUpdated = new Date().toISOString();
        return payload;
      } catch (error) {
        this.error = this.normalizeError(error);
        return null;
      } finally {
        this.actionLoading = false;
      }
    },

    async reload() {
      await this.fetchMonitoringStatus();
      await this.refreshSnapshot();
    },

    async refreshSnapshot() {
      this.loading = true;
      this.error = null;

      try {
        const response = await apiClient.get(API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_REALTIME);
        const payload = response?.data?.data || {};

        // New server payload shape
        if (payload.overview && payload.timeline && payload.users && payload.security) {
          this.applySnapshot(payload);
          this.timeline = payload.timeline;
        } else if (
          payload.status ||
          payload.overview ||
          payload.realtime ||
          payload.threats ||
          payload.alertsStatus ||
          payload.alertsHistory ||
          payload.timeline ||
          payload.health
        ) {
          this.applySnapshot(payload);
        } else {
          this.realtime = payload;
          if (typeof payload?.isActive === 'boolean') {
            this.status = {
              ...(this.status || {}),
              isActive: payload.isActive
            };
          }
        }

        this.lastUpdated = new Date().toISOString();
      } catch (error) {
        this.error = this.normalizeError(error);
      } finally {
        this.loading = false;
      }
    }
  }
});
