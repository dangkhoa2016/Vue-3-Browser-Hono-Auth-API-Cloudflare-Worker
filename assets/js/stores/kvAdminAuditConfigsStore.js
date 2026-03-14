const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';

const createInitialLoadingState = () => ({
  features: true,
  retention: true,
  performance: true,
  alerts: true,
  compliance: true
});

const createCompletedLoadingState = () => ({
  features: false,
  retention: false,
  performance: false,
  alerts: false,
  compliance: false
});

const createInitialAuditData = () => ({
  features: {},
  retention: {},
  performance: {},
  alerts: {},
  compliance: {}
});

const createSafeSectionFallback = () => ({ data: { data: {} } });

export const useKvAdminAuditConfigsStore = defineStore('kvAdminAuditConfigs', {
  state: () => ({
    loadingState: createInitialLoadingState(),
    errorMessage: null,
    isToggling: {},
    auditData: createInitialAuditData(),
    lastUpdated: null
  }),

  actions: {
    resetState() {
      this.loadingState = createInitialLoadingState();
      this.errorMessage = null;
      this.isToggling = {};
      this.auditData = createInitialAuditData();
      this.lastUpdated = null;
    },

    async loadData(token) {
      this.loadingState = createInitialLoadingState();
      this.errorMessage = null;

      try {
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        const featuresReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_FEATURES, authHeader).catch((error) => {
          if (error?.response?.status === 401 || error?.response?.status === 403 || error?.code === 'REAUTH_REQUIRED') throw error;
          return createSafeSectionFallback();
        });
        this.auditData.features = featuresReq?.data?.data || {};
        this.loadingState.features = false;

        const retentionReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_RETENTION, authHeader).catch((error) => {
          if (error?.response?.status === 401 || error?.response?.status === 403 || error?.code === 'REAUTH_REQUIRED') throw error;
          return createSafeSectionFallback();
        });
        this.auditData.retention = retentionReq?.data?.data || {};
        this.loadingState.retention = false;

        const performanceReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_PERFORMANCE, authHeader).catch((error) => {
          if (error?.response?.status === 401 || error?.response?.status === 403 || error?.code === 'REAUTH_REQUIRED') throw error;
          return createSafeSectionFallback();
        });
        this.auditData.performance = performanceReq?.data?.data || {};
        this.loadingState.performance = false;

        const alertsReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_ALERTS, authHeader).catch((error) => {
          if (error?.response?.status === 401 || error?.response?.status === 403 || error?.code === 'REAUTH_REQUIRED') throw error;
          return createSafeSectionFallback();
        });
        this.auditData.alerts = alertsReq?.data?.data || {};
        this.loadingState.alerts = false;

        const complianceReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_COMPLIANCE, authHeader).catch((error) => {
          if (error?.response?.status === 401 || error?.response?.status === 403 || error?.code === 'REAUTH_REQUIRED') throw error;
          return createSafeSectionFallback();
        });
        this.auditData.compliance = complianceReq?.data?.data || {};
        this.loadingState.compliance = false;
        this.lastUpdated = new Date().toISOString();

        return {
          success: true
        };
      } catch (error) {
        this.errorMessage = error?.message || 'Failed to load configs';
        return {
          success: false,
          error: this.errorMessage,
          status: error?.response?.status,
          code: error?.code
        };
      } finally {
        this.loadingState = createCompletedLoadingState();
      }
    },

    async toggleFeature(token, feature, enabled) {
      this.isToggling = {
        ...this.isToggling,
        [feature]: true
      };

      try {
        const url = API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_TOGGLE.replace(':feature', feature);
        const response = await apiClient.post(url, { enabled }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        this.auditData.features = {
          ...this.auditData.features,
          [feature]: enabled
        };

        return {
          success: true,
          message: response?.data?.data?.message || `Feature ${feature} set to ${enabled}`
        };
      } catch (error) {
        return {
          success: false,
          error: error?.message || `Failed to toggle ${feature}`,
          status: error?.response?.status,
          code: error?.code
        };
      } finally {
        this.isToggling = {
          ...this.isToggling,
          [feature]: false
        };
      }
    }
  }
});