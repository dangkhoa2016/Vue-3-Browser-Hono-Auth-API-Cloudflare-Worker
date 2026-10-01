const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';
import { captureContext, isCurrentContext, getApiIdentity, getSessionId } from '../api/apiIdentity.js';
import { registerProtectedStateReset } from '../api/protectedState.js';
import {
  API_ERROR_CODES,
  CAPABILITY_KEYS,
  EXPORT_OPTION_KEYS,
  REJECTED_EXPORT_OPTION_ALIASES,
  VERIFIED_EXPORT_FORMATS,
  buildCapabilityContextKey,
  createUnsupportedError,
  isCapabilityContextCurrent,
  isCapabilitySupported,
  isUnsupportedError,
  mergeCapabilityMap,
  readContractRevision,
  readExportOption
} from '../api/backendContract.js';

const EXPORT_CAPABILITY_BY_FORMAT = {
  json: CAPABILITY_KEYS.EXPORT_JSON,
  csv: CAPABILITY_KEYS.EXPORT_CSV,
  pdf: CAPABILITY_KEYS.EXPORT_PDF,
  xlsx: CAPABILITY_KEYS.EXPORT_EXCEL,
  excel: CAPABILITY_KEYS.EXPORT_EXCEL
};

const normalizeFormat = (value) => String(value || 'json').trim().toLowerCase();

/**
 * The scope a capability answer must still belong to: which API server, and which user session.
 * The contract revision is stored next to it but is not part of the scope, so a capability map
 * stays usable across a revision bump only after it has been re-verified.
 */
const currentCapabilityScope = () => buildCapabilityContextKey({
  identity: getApiIdentity(),
  sessionId: getSessionId()
});

// The capability answers are server state for one identity and one session, so they are dropped
// whenever the session context changes, not only when a page happens to ask for them again
// (review OF-08).
registerProtectedStateReset('advancedAuditCapabilities', (reason) => {
  useAdvancedAuditStore().resetCapabilities(reason);
});
registerProtectedStateReset('advancedAuditData', (reason) => {
  useAdvancedAuditStore().resetContext(reason);
});

/**
 * A 2xx is not a success. The baseline archived UI reported success from `status === 200` alone,
 * so a `200 { success: false }` was presented as a completed archival or export (review OF-05).
 */
const isSemanticSuccess = (response) => {
  const payload = response?.data;

  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'success' in payload) {
    return payload.success === true;
  }

  return true;
};

const semanticFailure = (response, action) => {
  const payload = response?.data;
  const message = payload && typeof payload === 'object'
    ? (payload.error || payload.message)
    : undefined;

  const error = new Error(message || `${action} was rejected by the server`);
  error.name = 'SemanticRequestFailure';
  error.semanticFailure = true;
  error.response = response;
  error.action = action;

  if (payload && typeof payload === 'object') error.data = payload;

  return error;
};

export const useAdvancedAuditStore = defineStore('advancedAudit', {
  state: () => ({
    analytics: null,
    compliance: null,
    archival: null,
    loading: false,
    error: null,
    lastUpdated: null,
    capabilities: null,
    capabilityScope: null,
    capabilityRevision: null,
    activeCapabilityScope: null,
    exportUnsupportedCode: null
  }),

  getters: {
    /** True only while the cached answers still belong to the live identity and session. */
    capabilitiesAreCurrent: (state) => isCapabilityContextCurrent(state.capabilityScope, state.activeCapabilityScope),
    isExportCapabilityKnown() {
      return this.capabilitiesAreCurrent;
    },
    exportUnsupportedReason: (state) => state.exportUnsupportedCode,
    isPdfExportSupported() {
      return this.capabilitiesAreCurrent && isCapabilitySupported(this.capabilities, CAPABILITY_KEYS.EXPORT_PDF);
    },
    isExcelExportSupported() {
      return this.capabilitiesAreCurrent && isCapabilitySupported(this.capabilities, CAPABILITY_KEYS.EXPORT_EXCEL);
    },
    isEncryptedExportSupported() {
      return this.capabilitiesAreCurrent && isCapabilitySupported(this.capabilities, CAPABILITY_KEYS.EXPORT_ENCRYPTION);
    },
    isCompressedExportSupported() {
      return this.capabilitiesAreCurrent && isCapabilitySupported(this.capabilities, CAPABILITY_KEYS.EXPORT_COMPRESSION);
    }
  },


  actions: {
    /**
     * Records the capability map together with the scope it is valid for. A map fetched for one
     * API server or one user is never reused for another, so a sign-out/sign-in cycle can no
     * longer inherit a stale answer (review OF-08).
     */
    captureCapabilities(payload, context = null) {
      const scope = buildCapabilityContextKey({
        identity: context?.identity ?? getApiIdentity(),
        sessionId: context?.sessionId ?? getSessionId()
      });

      this.activeCapabilityScope = scope;
      const revision = context?.revision ?? readContractRevision(payload);

      // A scope change invalidates every cached answer, not just the keys in this payload.
      if (this.capabilityScope !== null && this.capabilityScope !== scope) {
        this.capabilities = null;
      }

      this.capabilityScope = scope;
      this.capabilityRevision = revision;
      this.capabilities = mergeCapabilityMap(this.capabilities, payload);

      return this.capabilities;
    },

    /** Drops every cached capability answer because the session context changed. */
    resetCapabilities(reason = 'context-change') {
      this.capabilities = null;
      this.capabilityScope = null;
      this.capabilityRevision = null;
      this.activeCapabilityScope = null;
      this.exportUnsupportedCode = null;
      this.lastErrorReason = reason;
    },

    /**
     * Drops the protected payloads owned by this session. Called on every context change so a late
     * response of the previous user can never refill them (review OF-01).
     */
    resetContext(reason = 'context-change') {
      this.resetCapabilities(reason);
      this.analytics = null;
      this.compliance = null;
      this.archival = null;
      this.lastUpdated = null;
      this.error = null;
      this.loading = false;
    },

    /**
     * Normalises export options to the canonical backend keys. An alias the UI still uses is
     * treated as a real request — so it is still verified here — and is then sent under the name
     * the backend actually reads (review OF-07).
     */
    normalizeExportOptions(params = {}) {
      const encryption = readExportOption(params, EXPORT_OPTION_KEYS.ENCRYPT);
      const compression = readExportOption(params, EXPORT_OPTION_KEYS.COMPRESS);
      const normalized = { ...params, format: normalizeFormat(params.format) };

      REJECTED_EXPORT_OPTION_ALIASES.forEach((alias) => delete normalized[alias]);
      delete normalized[EXPORT_OPTION_KEYS.ENCRYPT];
      delete normalized[EXPORT_OPTION_KEYS.COMPRESS];

      if (encryption.requested) normalized[EXPORT_OPTION_KEYS.ENCRYPT] = true;
      if (compression.requested) normalized[EXPORT_OPTION_KEYS.COMPRESS] = true;

      return normalized;
    },

    assertExportSupported(params = {}) {
      const format = normalizeFormat(params.format);
      const capabilityKey = EXPORT_CAPABILITY_BY_FORMAT[format];
      const formatVerified = VERIFIED_EXPORT_FORMATS.includes(format)
        ? (!this.capabilities || isCapabilitySupported(this.capabilities, capabilityKey))
        : isCapabilitySupported(this.capabilities, capabilityKey);
      const encryption = readExportOption(params, EXPORT_OPTION_KEYS.ENCRYPT);
      const compression = readExportOption(params, EXPORT_OPTION_KEYS.COMPRESS);
      const encryptionVerified = !encryption.requested
        || isCapabilitySupported(this.capabilities, CAPABILITY_KEYS.EXPORT_ENCRYPTION);
      const compressionVerified = !compression.requested
        || isCapabilitySupported(this.capabilities, CAPABILITY_KEYS.EXPORT_COMPRESSION);

      if (formatVerified && encryptionVerified && compressionVerified) return format;

      const unverifiedCapability = !formatVerified
        ? (capabilityKey || CAPABILITY_KEYS.EXPORT_JSON)
        : (!encryptionVerified ? CAPABILITY_KEYS.EXPORT_ENCRYPTION : CAPABILITY_KEYS.EXPORT_COMPRESSION);

      throw createUnsupportedError(API_ERROR_CODES.UNSUPPORTED_EXPORT_OPTION, {
        capability: unverifiedCapability,
        format,
        reason: `export option not verified: ${format}`
      });
    },

    async fetchAnalytics(timeframe = '7d') {
      const context = captureContext();
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ANALYTICS, {
          params: { timeframe }
        });
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        this.captureCapabilities(response.data);
        this.analytics = response.data?.data || response.data;
        this.lastUpdated = new Date().toISOString();
        return this.analytics;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = error.response?.data?.error || error.message || 'Failed to fetch analytics';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async fetchCompliance(timeframe = '7d') {
      const context = captureContext();
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_COMPLIANCE, {
          params: { timeframe }
        });
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        this.captureCapabilities(response.data);
        this.compliance = response.data?.data || response.data;
        return this.compliance;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = error.response?.data?.error || error.message || 'Failed to fetch compliance reports';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async runArchival(params = {}) {
      const context = captureContext();
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
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });

        if (!isSemanticSuccess(response)) {
          const failure = semanticFailure(response, 'runArchival');
          this.error = failure.message;
          throw failure;
        }

        return response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = error.response?.data?.error || error.message || 'Failed to run archival';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async restoreArchive(params) {
      const context = captureContext();
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
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });

        if (!isSemanticSuccess(response)) {
          const failure = semanticFailure(response, 'restoreArchive');
          this.error = failure.message;
          throw failure;
        }

        return response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = error.response?.data?.error || error.message || 'Failed to restore archive';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async manualArchive(params) {
      const context = captureContext();
      this.loading = true;
      this.error = null;
      try {
        // Use unified POST /api/advanced-audit/archive endpoint with manual_archive action
        const payload = {
          action: 'manual_archive',
          ...params
        };
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVE, payload);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });

        if (!isSemanticSuccess(response)) {
          const failure = semanticFailure(response, 'manualArchive');
          this.error = failure.message;
          throw failure;
        }

        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = error.response?.data?.error || error.message || 'Failed to manually archive logs';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async exportAdvanced(params = {}) {
      const context = captureContext();
      this.loading = true;
      this.error = null;
      this.exportUnsupportedCode = null;

      let requestParams;

      try {
        this.assertExportSupported(params);
        requestParams = this.normalizeExportOptions(params);
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = null;
        this.exportUnsupportedCode = API_ERROR_CODES.UNSUPPORTED_EXPORT_OPTION;
        if (isCurrentContext(context)) this.loading = false;
        throw error;
      }

      try {
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_EXPORT_ADVANCED, requestParams);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        this.captureCapabilities(response.data);

        if (!isSemanticSuccess(response)) {
          throw semanticFailure(response, 'exportAdvanced');
        }

        return response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        if (isUnsupportedError(error)) {
          this.error = null;
          this.exportUnsupportedCode = API_ERROR_CODES.UNSUPPORTED_EXPORT_OPTION;
          throw createUnsupportedError(API_ERROR_CODES.UNSUPPORTED_EXPORT_OPTION, {
            format: normalizeFormat(params.format),
            capability: EXPORT_CAPABILITY_BY_FORMAT[normalizeFormat(params.format)] || null,
            status: error.response?.status,
            cause: error
          });
        }

        if (error?.semanticFailure) {
          this.error = error.message;
          throw error;
        }

        this.error = error.response?.data?.error || error.message || 'Failed to export advanced info';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async fetchArchival() {
      const context = captureContext();
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVAL);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        this.captureCapabilities(response.data);
        this.archival = response.data?.data || response.data;
        return this.archival;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = error.response?.data?.error || error.message || 'Failed to fetch archival status';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async fetchSecurityAnalytics(timeframe = '7d', includeDetails = false, silent = false) {
      const context = captureContext();
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ANALYTICS_SECURITY, {
          params: { timeframe, includeDetails }
        });
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to fetch security analytics';
        throw error;
      } finally {
        if (!silent && isCurrentContext(context)) this.loading = false;
      }
    },

    async fetchBehaviorAnalytics(timeframe = '7d', actorRole = null, includeDetails = false) {
      const context = captureContext();
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ANALYTICS_BEHAVIOR, {
          params: { timeframe, actorRole, includeDetails }
        });
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = error.response?.data?.error || error.message || 'Failed to fetch behavior analytics';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async fetchPerformanceAnalytics(timeframe = '7d') {
      const context = captureContext();
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ANALYTICS_PERFORMANCE, {
          params: { timeframe }
        });
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        this.error = error.response?.data?.error || error.message || 'Failed to fetch performance analytics';
        throw error;
      } finally {
        if (isCurrentContext(context)) this.loading = false;
      }
    },

    async fetchComplianceManagement(silent = false) {
      const context = captureContext();
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_COMPLIANCE_MANAGEMENT);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to fetch compliance management data';
        throw error;
      } finally {
        if (!silent && isCurrentContext(context)) this.loading = false;
      }
    },

    async manageCompliance(params, silent = false) {
      const context = captureContext();
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_COMPLIANCE_MANAGEMENT, params);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to manage compliance';
        throw error;
      } finally {
        if (!silent && isCurrentContext(context)) this.loading = false;
      }
    },

    async getArchive(silent = false) {
      const context = captureContext();
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVE);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to fetch archive information';
        throw error;
      } finally {
        if (!silent && isCurrentContext(context)) this.loading = false;
      }
    },

    async manageArchive(params, silent = false) {
      const context = captureContext();
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_ARCHIVE, params);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to manage archive';
        throw error;
      } finally {
        if (!silent && isCurrentContext(context)) this.loading = false;
      }
    },

    async fetchMiddlewareStats(silent = false) {
      const context = captureContext();
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.get(API_ENDPOINTS.ADVANCED_AUDIT_MIDDLEWARE_STATS);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to fetch middleware stats';
        throw error;
      } finally {
        if (!silent && isCurrentContext(context)) this.loading = false;
      }
    },

    async manageRetention(params, silent = false) {
      const context = captureContext();
      if (!silent) this.loading = true;
      if (!silent) this.error = null;
      try {
        const response = await apiClient.post(API_ENDPOINTS.ADVANCED_AUDIT_RETENTION, params);
        if (!isCurrentContext(context)) throw Object.assign(new Error('Stale audit response'), { stale: true });
        return response.data?.data || response.data;
      } catch (error) {
        if (!isCurrentContext(context)) throw error;
        if (!silent) this.error = error.response?.data?.error || error.message || 'Failed to manage retention policy';
        throw error;
      } finally {
        if (!silent && isCurrentContext(context)) this.loading = false;
      }
    }
  }
});
