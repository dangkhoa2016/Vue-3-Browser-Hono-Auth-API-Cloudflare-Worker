const { axios } = window;
const MockAdapter = window.AxiosMockAdapter;
import { i18n } from './i18n.js';
import { sleep } from './helper.js';

// API Configuration Constants
const API_CONFIG = {
  BASE_URL: 'http://localhost:8788/',
  RETRY_COUNT: 2,
  RETRY_DELAY: 1000,
};

// HTTP Status Code Ranges
const HTTP_STATUS = {
  CLIENT_ERROR_MIN: 400,
  CLIENT_ERROR_MAX: 500,
};

// API Endpoints
export const API_ENDPOINTS = {
  PUBLIC_HEALTH: '/health',
  PUBLIC_VERSION: '/version',
  PUBLIC_LANGUAGE: '/language',
  LOGIN: '/api/auth/login',
  REFRESH_TOKEN: '/api/auth/refresh_token',
  REGISTER: '/api/user/register',
  PROFILE: '/api/user/profile',
  CHANGE_PASSWORD: '/api/user/change-password',
  CLEAR_PENDING_EMAIL: '/api/user/pending-email',
  API_INFO: '/api',
  USERS: '/api/admin/users',
  ADMIN_STATS: '/api/admin/stats',
  ADMIN_SYSTEM_HEALTH: '/api/admin/system-health',
  ADMIN_USER_ROLE: '/api/admin/users/:id/role', // Helper for pattern matching
  KV_ADMIN_CONFIGS: '/api/kv-admin/configs',
  KV_ADMIN_CONFIGS_SPECIFIC: '/api/kv-admin/configs/:key',
  KV_ADMIN_CONFIGS_BATCH: '/api/kv-admin/configs/batch',
  // KV Admin - Audit
  KV_ADMIN_AUDIT_CONFIGS: '/api/kv-admin/audit/configs',
  KV_ADMIN_AUDIT_CONFIGS_RETENTION: '/api/kv-admin/audit/configs/retention',
  KV_ADMIN_AUDIT_CONFIGS_PERFORMANCE: '/api/kv-admin/audit/configs/performance',
  KV_ADMIN_AUDIT_CONFIGS_FEATURES: '/api/kv-admin/audit/configs/features',
  KV_ADMIN_AUDIT_CONFIGS_ALERTS: '/api/kv-admin/audit/configs/alerts',
  KV_ADMIN_AUDIT_CONFIGS_COMPLIANCE: '/api/kv-admin/audit/configs/compliance',
  KV_ADMIN_AUDIT_CONFIGS_TOGGLE: '/api/kv-admin/audit/configs/feature/:feature/toggle',
  // KV Admin - Rate Limits
  KV_ADMIN_RATE_LIMITS_CLEAN: '/api/kv-admin/rate-limits/clean',
  KV_ADMIN_RATE_LIMITS_SEED: '/api/kv-admin/rate-limits/seed',
  KV_ADMIN_RATE_LIMITS_PRUNE_TIME: '/api/kv-admin/rate-limits/prune-time',
  KV_ADMIN_RATE_LIMITS_BATCH_DELETE: '/api/kv-admin/rate-limits/batch-delete',
  // Validation regex cho thay đổi trạng thái Configs Toggle Mock API
  KV_ADMIN_FEATURES_TOGGLE_SUCCESS: '/assets/data/kv-admin/features/toggle/succeed/response.json',
  // Audit endpoints
  AUDIT_LOGS: '/api/audit/logs',
  AUDIT_STATS: '/api/audit/stats',
  AUDIT_EXPORT: '/api/audit/export',
  // Security incidents (match backend route)
  SECURITY_INCIDENTS: '/api/security-incident/incidents',
  // Realtime monitoring
  REALTIME_MONITORING_STATUS: '/api/realtime-monitoring/monitoring/status',
  REALTIME_MONITORING_START: '/api/realtime-monitoring/monitoring/start',
  REALTIME_MONITORING_STOP: '/api/realtime-monitoring/monitoring/stop',
  REALTIME_MONITORING_THREATS: '/api/realtime-monitoring/monitoring/threats',
  REALTIME_MONITORING_ANALYZE: '/api/realtime-monitoring/monitoring/analyze',
  REALTIME_MONITORING_SIMULATE: '/api/realtime-monitoring/monitoring/simulate',
  REALTIME_MONITORING_ALERTS_STATUS: '/api/realtime-monitoring/alerts/status',
  REALTIME_MONITORING_ALERTS_HISTORY: '/api/realtime-monitoring/alerts/history',
  REALTIME_MONITORING_DASHBOARD_OVERVIEW: '/api/realtime-monitoring/dashboard/overview',
  REALTIME_MONITORING_DASHBOARD_REALTIME: '/api/realtime-monitoring/dashboard/realtime',
  REALTIME_MONITORING_DASHBOARD_TIMELINE: '/api/realtime-monitoring/dashboard/timeline',
  REALTIME_MONITORING_DASHBOARD_HEALTH: '/api/realtime-monitoring/dashboard/health',
  REALTIME_MONITORING_DASHBOARD_EXPORT: '/api/realtime-monitoring/dashboard/export',
};

export const buildAdminUserRoleEndpoint = (userId) =>
  API_ENDPOINTS.ADMIN_USER_ROLE.replace(':id', String(userId));

// Mock API Configuration
const MOCK_CONFIG = {
  DELAY_RESPONSE: 0,
  LOGIN_PROCESSING_DELAY: 0,
  REGISTER_PROCESSING_DELAY: 0,
  TEST_EMAIL: 'test-superadmin@example.com',
  TEST_PASSWORD: 'password123',
};

// Mock API Patterns - Generated from API_ENDPOINTS
const MOCK_PATTERNS = {
  PUBLIC_HEALTH: new RegExp(`${API_ENDPOINTS.PUBLIC_HEALTH.replace(/\//g, '\\/')}($|\\?)`),
  PUBLIC_VERSION: new RegExp(`${API_ENDPOINTS.PUBLIC_VERSION.replace(/\//g, '\\/')}($|\\?)`),
  PUBLIC_LANGUAGE: new RegExp(`${API_ENDPOINTS.PUBLIC_LANGUAGE.replace(/\//g, '\\/')}($|\\?)`),
  LOGIN: new RegExp(`${API_ENDPOINTS.LOGIN.replace(/\//g, '\\/')}($|\\?)`),
  REFRESH_TOKEN: new RegExp(`${API_ENDPOINTS.REFRESH_TOKEN.replace(/\//g, '\\/')}($|\\?)`),
  REGISTER: new RegExp(`${API_ENDPOINTS.REGISTER.replace(/\//g, '\\/')}($|\\?)`),
  PROFILE: new RegExp(`${API_ENDPOINTS.PROFILE.replace(/\//g, '\\/')}($|\\?)`),
  CHANGE_PASSWORD: new RegExp(`${API_ENDPOINTS.CHANGE_PASSWORD.replace(/\//g, '\\/')}($|\\?)`),
  CLEAR_PENDING_EMAIL: new RegExp(`${API_ENDPOINTS.CLEAR_PENDING_EMAIL.replace(/\//g, '\\/')}($|\\?)`),
  API_INFO: new RegExp(`${API_ENDPOINTS.API_INFO.replace(/\//g, '\\/')}($|\\?)`),
  USERS: new RegExp(`${API_ENDPOINTS.USERS.replace(/\//g, '\\/')}(?:\\/.*|\\?.*|)$`),
  ADMIN_STATS: new RegExp(`${API_ENDPOINTS.ADMIN_STATS.replace(/\//g, '\\/')}($|\\?)`),
  ADMIN_SYSTEM_HEALTH: new RegExp(`${API_ENDPOINTS.ADMIN_SYSTEM_HEALTH.replace(/\//g, '\\/')}($|\\?)`),
  ADMIN_USER_ROLE: new RegExp(`${API_ENDPOINTS.USERS.replace(/\//g, '\\/')}\\/\\d+\\/role($|\\?)`),

  // KV Admin patterns
  KV_ADMIN_ENV_COMPARISON: new RegExp(`${API_ENDPOINTS.KV_ADMIN_CONFIGS.replace(/\//g, '\\/')}\\/env-comparison($|\\?)`),
  KV_ADMIN_CONFIGS_BATCH: new RegExp(`${API_ENDPOINTS.KV_ADMIN_CONFIGS.replace(/\//g, '\\/')}\\/batch($|\\?)`),
  KV_ADMIN_CONFIGS_SPECIFIC: new RegExp(`${API_ENDPOINTS.KV_ADMIN_CONFIGS.replace(/\//g, '\\/')}\\/[^/]+($|\\?)`),
  KV_ADMIN_CONFIGS: new RegExp(`${API_ENDPOINTS.KV_ADMIN_CONFIGS.replace(/\//g, '\\/')}($|\\?)`),
  
  KV_ADMIN_AUDIT_CONFIGS: new RegExp(`${API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_AUDIT_CONFIGS_RETENTION: new RegExp(`${API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_RETENTION.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_AUDIT_CONFIGS_PERFORMANCE: new RegExp(`${API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_PERFORMANCE.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_AUDIT_CONFIGS_FEATURES: new RegExp(`${API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_FEATURES.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_AUDIT_CONFIGS_ALERTS: new RegExp(`${API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_ALERTS.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_AUDIT_CONFIGS_COMPLIANCE: new RegExp(`${API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_COMPLIANCE.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_AUDIT_CONFIGS_TOGGLE: new RegExp(`${API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS.replace(/\//g, '\\/')}\\/feature\\/[^/]+\\/toggle($|\\?)`),
  
  KV_ADMIN_RATE_LIMITS_CLEAN: new RegExp(`${API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_CLEAN.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_RATE_LIMITS_SEED: new RegExp(`${API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_SEED.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_RATE_LIMITS_PRUNE_TIME: new RegExp(`${API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_PRUNE_TIME.replace(/\//g, '\\/')}($|\\?)`),
  KV_ADMIN_RATE_LIMITS_BATCH_DELETE: new RegExp(`${API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_BATCH_DELETE.replace(/\//g, '\\/')}($|\\?)`),

  // Audit patterns
  AUDIT_LOGS: new RegExp(`${API_ENDPOINTS.AUDIT_LOGS.replace(/\//g, '\\/')}($|\\?)`),
  AUDIT_STATS: new RegExp(`${API_ENDPOINTS.AUDIT_STATS.replace(/\//g, '\\/')}($|\\?)`),
  AUDIT_EXPORT: new RegExp(`${API_ENDPOINTS.AUDIT_EXPORT.replace(/\//g, '\\/')}($|\\?)`),
  // Security incidents
  SECURITY_INCIDENTS: new RegExp(`${API_ENDPOINTS.SECURITY_INCIDENTS.replace(/\//g, '\\/')}($|\\?)`),
  // Realtime monitoring
  REALTIME_MONITORING_STATUS: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_STATUS.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_START: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_START.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_STOP: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_STOP.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_THREATS: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_THREATS.replace(/\//g, '\\/')}(?:\\/.*|\\?.*|)$`),
  REALTIME_MONITORING_ANALYZE: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_ANALYZE.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_SIMULATE: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_SIMULATE.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_ALERTS_STATUS: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_ALERTS_STATUS.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_ALERTS_HISTORY: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_ALERTS_HISTORY.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_DASHBOARD_OVERVIEW: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_OVERVIEW.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_DASHBOARD_REALTIME: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_REALTIME.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_DASHBOARD_TIMELINE: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_TIMELINE.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_DASHBOARD_HEALTH: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_HEALTH.replace(/\//g, '\\/')}($|\\?)`),
  REALTIME_MONITORING_DASHBOARD_EXPORT: new RegExp(`${API_ENDPOINTS.REALTIME_MONITORING_DASHBOARD_EXPORT.replace(/\//g, '\\/')}($|\\?)`),
};

// Data Paths
export const DATA_PATHS = {
  LOGIN_VALIDATE_EMAIL_EMPTY: '/assets/data/login/fail/validate-3.json',
  LOGIN_VALIDATE_EMAIL_FORMAT: '/assets/data/login/fail/validate-1.json',
  LOGIN_VALIDATE_PASSWORD_EMPTY: '/assets/data/login/fail/validate-2.json',
  LOGIN_SUCCESS: '/assets/data/login/succeed/response.json',
  LOGIN_INVALID_CREDENTIALS: '/assets/data/login/fail/invalid-email-or-password.json',
  REFRESH_TOKEN_SUCCESS: '/assets/data/refresh_token/succeed/response.json',
  REFRESH_TOKEN_EXPIRED: '/assets/data/refresh_token/fail/expired.json',
  REFRESH_TOKEN_INVALID: '/assets/data/refresh_token/fail/invalid.json',
  REGISTER_VALIDATE_EMAIL_EMPTY: '/assets/data/register/fail/validate-1.json',
  REGISTER_VALIDATE_EMAIL_FORMAT: '/assets/data/register/fail/validate-2.json',
  REGISTER_VALIDATE_PASSWORD_EMPTY: '/assets/data/register/fail/validate-3.json',
  REGISTER_VALIDATE_PASSWORD_SHORT: '/assets/data/register/fail/validate-4.json',
  REGISTER_VALIDATE_FULLNAME_EMPTY: '/assets/data/register/fail/validate-5.json',
  REGISTER_SUCCESS_ACTIVE: '/assets/data/register/succeed/response2.json',
  REGISTER_SUCCESS_INACTIVE: '/assets/data/register/succeed/response1.json',
  PROFILE: '/assets/data/profile/succeed.json',
  PROFILE_UPDATE_SUCCESS: '/assets/data/profile/update/succeed/response.json',
  API_INFO: '/assets/data/profile/api.json',
  PUBLIC_HEALTH: '/assets/data/health/response.json',
  PUBLIC_VERSION: '/assets/data/version/response.json',
  PUBLIC_LANGUAGE: '/assets/data/language/response.json',
  USERS_LIST: '/assets/data/users/list/succeed/super-admin+users.json',
  ADMIN_STATS: '/assets/data/system-stats/succeed/response.json',
  ADMIN_SYSTEM_HEALTH: '/assets/data/system-health/succeed/response.json',
  CREATE_USER_SUCCESS: '/assets/data/users/create/succeed/response.json',
  UPDATE_USER_SUCCESS: '/assets/data/users/update/succeed/response.json',
  CHANGE_USER_ROLE_SUCCESS: '/assets/data/users/change-role/succeed/response.json',
  CHANGE_PASSWORD_FAIL: '/assets/data/users/change-password/fail/validate-1.json',
  CHANGE_PASSWORD_INVALID_CURRENT: '/assets/data/users/change-password/fail/invalid-current-password.json',
  CHANGE_PASSWORD_SUCCESS: '/assets/data/users/change-password/succeed/response.json',
  // KV Admin Toggle data
  KV_ADMIN_FEATURES_TOGGLE_SUCCESS: '/assets/data/kv-admin/features/toggle/succeed/response.json',
  KV_ADMIN_FEATURES: '/assets/data/kv-admin/features/response.json',
  KV_ADMIN_BATCH_SUCCESS: '/assets/data/kv-admin/batch/succeed/response.json',
  KV_ADMIN_ENV_COMPARISON: '/assets/data/kv-admin/env-comparison/response.json',
  KV_ADMIN_RETENTION: '/assets/data/kv-admin/retention/response.json',
  KV_ADMIN_PERFORMANCE: '/assets/data/kv-admin/performance/response.json',
  KV_ADMIN_ALERTS: '/assets/data/kv-admin/alerts/response.json',
  KV_ADMIN_COMPLIANCE: '/assets/data/kv-admin/compliance/response.json',
  // Audit data
  AUDIT_LOGS_SUCCESS: '/assets/data/audit/logs/succeed/response.json',
  AUDIT_STATS_SUCCESS: '/assets/data/audit/stats/succeed/response.json',
  // Security incident data
  SECURITY_INCIDENTS: '/assets/data/security-incident/succeed/response.json',
  // Realtime monitoring data
  REALTIME_MONITORING_REALTIME: '/assets/data/realtime-monitoring/realtime/succeed/response.json',
  REALTIME_MONITORING_STATUS_SUCCESS: '/assets/data/realtime-monitoring/status/succeed/response.json',
  REALTIME_MONITORING_START_SUCCESS: '/assets/data/realtime-monitoring/start/succeed/response.json',
  REALTIME_MONITORING_STOP_SUCCESS: '/assets/data/realtime-monitoring/stop/succeed/response.json',
  REALTIME_MONITORING_EXPORT_SUCCESS: '/assets/data/realtime-monitoring/export/succeed/response.json',
};

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  retry: API_CONFIG.RETRY_COUNT,
  retryDelay: API_CONFIG.RETRY_DELAY,
});

// Add request interceptor to inject current language and handle token refresh
apiClient.interceptors.request.use(async (config) => {
  // Language injection
  let lang = 'en'; // Default fallback

  // Get current language from i18n instance
  if (i18n && i18n.global) {
    if (i18n.mode === 'legacy') {
      lang = i18n.global.locale || 'en';
    } else {
      lang = i18n.global.locale.value || 'en';
    }
  } else {
    // Try localStorage if i18n not initialized or available
    lang = localStorage.getItem('user-locale') || 'en';
  }

  // Set Accept-Language header for backend detection
  config.headers['Accept-Language'] = lang;

  // Dynamically import auth store once for request auth guards
  let authStore = null;
  try {
    authStore = window.authStore;
  } catch (error) {
    console.warn('[API] Error loading auth store in request interceptor:', error);
  }

  const isAuthRequest = Boolean(config.url) && (
    config.url.includes(API_ENDPOINTS.LOGIN) ||
    config.url.includes(API_ENDPOINTS.REGISTER) ||
    config.url.includes(API_ENDPOINTS.REFRESH_TOKEN)
  );

  const isPublicRequest = Boolean(config.url) && (
    config.url.includes(API_ENDPOINTS.PUBLIC_HEALTH) ||
    config.url.includes(API_ENDPOINTS.PUBLIC_VERSION) ||
    config.url.includes(API_ENDPOINTS.PUBLIC_LANGUAGE)
  );

  // Block all non-auth requests until user logs in again after session expiry/refresh failure
  if (authStore?.requiresReauth && !isAuthRequest && !isPublicRequest) {
    const blockedError = new Error('Auth requires re-login');
    blockedError.code = 'REAUTH_REQUIRED';
    blockedError.isAuthBlocked = true;
    return Promise.reject(blockedError);
  }

  // Token refresh logic
  // Skip token refresh for the refresh endpoint itself
  if (authStore && !config.url.includes(API_ENDPOINTS.REFRESH_TOKEN) && !isPublicRequest) {
    try {
      // Check if we need to refresh the token
      if (authStore.shouldRefreshToken) {
        console.log('[API] Access token expired, refreshing...');
        const newToken = await authStore.refreshAccessToken();
        
        if (newToken) {
          // Update Authorization header with new token
          config.headers['Authorization'] = `Bearer ${newToken}`;
        } else {
          // Refresh failed: block request immediately to avoid repeated invalid-token calls
          const blockedError = new Error('Auth refresh failed');
          blockedError.code = 'REAUTH_REQUIRED';
          blockedError.isAuthBlocked = true;
          return Promise.reject(blockedError);
        }
      } else if (authStore.token) {
        // Use existing valid token
        config.headers['Authorization'] = `Bearer ${authStore.token}`;
      }
    } catch (error) {
      console.warn('[API] Error in token refresh interceptor:', error);
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use(undefined, async (err) => {
  const config = err.config;

  console.warn('[API] Request failed:', err.message || err);
  
  // Handle 401 Unauthorized - Try to refresh token
  if (err.response && err.response.status === 401) {
    // Skip refresh for the refresh token endpoint itself
    if (config.url && !config.url.includes(API_ENDPOINTS.REFRESH_TOKEN)) {
      // Skip if we already tried to refresh for this request
      if (!config._retryWithRefresh) {
        console.log('[API] Got 401, attempting to refresh token...');
        
        try {
          // Access authStore from window globally to avoid circular dependency
          const authStore = window.authStore;

          // Check if we have a refresh token
          if (authStore && authStore.refreshToken && !authStore.isRefreshTokenExpired) {
            // Try to refresh the token
            const newToken = await authStore.refreshAccessToken();
            
            if (newToken) {
              // Mark this request as already retried with refresh
              config._retryWithRefresh = true;
              // Update the Authorization header with new token
              config.headers['Authorization'] = `Bearer ${newToken}`;
              
              console.log('[API] Token refreshed, retrying original request...');
              // Retry the original request with new token
              return apiClient(config);
            }
          }
          
          // If we get here, refresh failed or no refresh token available
          console.warn('[API] Cannot refresh token, user needs to login');
        } catch (error) {
          console.error('[API] Error during token refresh:', error);
        }
      } else {
        console.warn('[API] Already tried refresh for this request, giving up');
      }
    }
    
    // If refresh failed or not applicable, reject with original error
    return Promise.reject(err);
  }
  
  // If config does not exist or the retry option is not set, reject
  if (!config || !config.retry) {
    return Promise.reject(err);
  }

  // Check if this is an authentication endpoint (login/register)
  const isAuthEndpoint = config.url && Object.values(API_ENDPOINTS)
    .filter(endpoint => endpoint.includes('/auth/'))
    .some(endpoint => config.url.includes(endpoint));

  // Don't retry for authentication endpoints with client errors (4xx)
  // These are typically validation errors or wrong credentials that won't succeed on retry
  if (isAuthEndpoint && err.response && 
      err.response.status >= HTTP_STATUS.CLIENT_ERROR_MIN && 
      err.response.status < HTTP_STATUS.CLIENT_ERROR_MAX) {
    console.warn('[API] Not retrying auth endpoint with client error:', err.response.status);
    return Promise.reject(err);
  }

  // Don't retry for any 4xx errors (client errors) except 401 (already handled above)
  if (err.response && 
      err.response.status >= HTTP_STATUS.CLIENT_ERROR_MIN && 
      err.response.status < HTTP_STATUS.CLIENT_ERROR_MAX) {
    console.warn('[API] Not retrying client error:', err.response.status);
    return Promise.reject(err);
  }

  // Set the variable for keeping track of the retry count
  config.__retryCount = config.__retryCount || 0;

  // Check if we've maxed out the total number of retries
  if (config.__retryCount >= config.retry) {
    // Reject with the error
    return Promise.reject(err);
  }

  // Increase the retry count
  config.__retryCount += 1;

  // console.log(`[API] Retrying request (${config.__retryCount}/${config.retry}):`, config.url);

  // Create new promise to handle delay
  const backoff = new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, config.retryDelay || API_CONFIG.RETRY_DELAY);
  });

  // Return the promise in which recalls axios to retry the request
  await backoff;
  return apiClient(config);
});

let mock;

const loadJson = async (path) => {
  const t = i18n.global.t;

  try {
    const res = await fetch(path);

    if (!res.ok) {
      const message = res.statusText || t('message.errors.unknown_error');
      throw new Error(message);
    }

    return await res.json();
  } catch (error) {
    console.log(`[API] Failed to load JSON from ${path}:`, error);
    const message = (error && error.message) || t('message.errors.unknown_error');
    throw new Error(t('message.errors.failed_to_load', { item: path, message }));
  }
};

export const setupMock = (enable) => {
  if (enable) {
    if (!mock) {
      console.log('Enabling Mock API');
      mock = new MockAdapter(apiClient, { delayResponse: MOCK_CONFIG.DELAY_RESPONSE });
      let mockMonitoringActive = false;
      let mockPendingEmail = null;

      const parseBody = (config) => {
        if (!config || typeof config.data === 'undefined' || config.data === null) {
          return {};
        }
        try {
          return typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        } catch (_error) {
          return {};
        }
      };

      const getRealtimePayload = async () => {
        const base = await loadJson(DATA_PATHS.REALTIME_MONITORING_REALTIME);
        const payload = base?.data || {};
        const now = new Date().toISOString();

        return {
          rawResponse: base,
          rawData: payload,
          statusData: {
            startedAt: payload.timestamp || now,
            isActive: mockMonitoringActive,
            lastHeartbeat: now
          },
          overviewData: {
            ...(payload.overview || {}),
            monitoringActive: mockMonitoringActive
          },
          realtimeData: {
            timestamp: payload.timestamp || now,
            isActive: mockMonitoringActive,
            lastUpdated: now
          },
          threatsData: {
            ...(payload.threats || {}),
            activeThreatsCount: Array.isArray(payload.threats?.activeThreats)
              ? payload.threats.activeThreats.length
              : (payload.threats?.activeThreatsCount || 0),
            resolvedThreatsCount: Array.isArray(payload.threats?.resolvedThreats)
              ? payload.threats.resolvedThreats.length
              : (payload.threats?.resolvedThreatsCount || 0)
          },
          alertsStatusData: payload.alertsStatus || {},
          alertsHistoryData: payload.alertsHistory || { alerts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } },
          timelineData: payload.timeline || { points: [] },
          healthData: payload.health || { status: 'healthy' }
        };
      };

      const normalizeAuditStatsResponse = (raw) => {
        const base = raw && typeof raw === 'object' ? raw : {};
        const data = base && typeof base.data === 'object' ? base.data : {};
        const basicStatsRaw = data && typeof data.basic_stats === 'object' ? data.basic_stats : {};
        const recentActivityRaw = data && typeof data.recent_activity === 'object' ? data.recent_activity : {};
        const actionStatsRaw = Array.isArray(data.action_stats) ? data.action_stats : [];

        const actionStats = actionStatsRaw
          .map((item) => ({
            action: String(item?.action || '').trim(),
            count: Number(item?.count) || 0
          }))
          .filter((item) => item.action)
          .sort((first, second) => second.count - first.count);

        return {
          ...base,
          success: typeof base.success === 'boolean' ? base.success : true,
          data: {
            ...data,
            basic_stats: {
              total_events: Number(basicStatsRaw.total_events) || 0,
              successful_events: Number(basicStatsRaw.successful_events) || 0,
              failed_events: Number(basicStatsRaw.failed_events) || 0,
              error_events: Number(basicStatsRaw.error_events) || 0,
              security_events: Number(basicStatsRaw.security_events) || 0
            },
            action_stats: actionStats,
            recent_activity: {
              events_24h: Number(recentActivityRaw.events_24h) || 0,
              login_events_24h: Number(recentActivityRaw.login_events_24h) || 0,
              admin_events_24h: Number(recentActivityRaw.admin_events_24h) || 0,
              kv_events_24h: Number(recentActivityRaw.kv_events_24h) || 0
            },
            filtered_for_role: String(data.filtered_for_role || 'admin')
          }
        };
      };

      // Login
      mock.onPost(MOCK_PATTERNS.LOGIN).reply(async (config) => {
        // console.log(`[Mock API] Login request received, sleeping ${MOCK_CONFIG.LOGIN_PROCESSING_DELAY}ms to simulate processing...`);
        await sleep(MOCK_CONFIG.LOGIN_PROCESSING_DELAY);

        try {
          const body = JSON.parse(config.data);
          const { email, password } = body;

          // Validate empty email
          if (!email || email.trim() === '') {
            const data = await loadJson(DATA_PATHS.LOGIN_VALIDATE_EMAIL_EMPTY);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            const data = await loadJson(DATA_PATHS.LOGIN_VALIDATE_EMAIL_FORMAT);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Validate empty password
          if (!password || password.trim() === '') {
            const data = await loadJson(DATA_PATHS.LOGIN_VALIDATE_PASSWORD_EMPTY);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Check credentials
          if (email === MOCK_CONFIG.TEST_EMAIL && password === MOCK_CONFIG.TEST_PASSWORD) {
            const data = await loadJson(DATA_PATHS.LOGIN_SUCCESS);
            // Update timestamps to current time + expiry
            const now = Math.floor(Date.now() / 1000);
            data.data.expires_at = now + data.data.expires_in;
            data.data.refresh_expires_at = now + data.data.refresh_expires_in;
            return [200, data];
          }

          // Invalid credentials
          const data = await loadJson(DATA_PATHS.LOGIN_INVALID_CREDENTIALS);
          return [401, data];
        } catch (error) {
          console.error('[Mock API] Login handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Refresh Token
      mock.onPost(MOCK_PATTERNS.REFRESH_TOKEN).reply(async (config) => {
        await sleep(MOCK_CONFIG.LOGIN_PROCESSING_DELAY);

        try {
          const body = JSON.parse(config.data);
          const { refresh_token } = body;

          // Validate refresh_token exists
          if (!refresh_token || refresh_token.trim() === '') {
            const data = await loadJson(DATA_PATHS.REFRESH_TOKEN_INVALID);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Simulate token expiry check (10% chance of expired token for testing)
          const isExpired = Math.random() < 0.1;
          if (isExpired) {
            const data = await loadJson(DATA_PATHS.REFRESH_TOKEN_EXPIRED);
            return [401, data];
          }

          // Success - return new tokens with updated timestamps
          const data = await loadJson(DATA_PATHS.REFRESH_TOKEN_SUCCESS);
          // Update timestamps to current time + expiry
          const now = Math.floor(Date.now() / 1000);
          data.data.expires_at = now + data.data.expires_in;
          data.data.refresh_expires_at = now + data.data.refresh_expires_in;
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Refresh token handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Register
      mock.onPost(MOCK_PATTERNS.REGISTER).reply(async (config) => {
        // console.log(`[Mock API] Register request received, sleeping ${MOCK_CONFIG.REGISTER_PROCESSING_DELAY}ms to simulate processing...`);
        await sleep(MOCK_CONFIG.REGISTER_PROCESSING_DELAY);

        try {
          const body = JSON.parse(config.data);
          const { email, password, full_name } = body;

          // Validate empty full_name
          if (!full_name || full_name.trim() === '') {
            const data = await loadJson(DATA_PATHS.REGISTER_VALIDATE_FULLNAME_EMPTY);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Validate empty email
          if (!email || email.trim() === '') {
            const data = await loadJson(DATA_PATHS.REGISTER_VALIDATE_EMAIL_EMPTY);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            const data = await loadJson(DATA_PATHS.REGISTER_VALIDATE_EMAIL_FORMAT);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Validate empty password
          if (!password || password.trim() === '') {
            const data = await loadJson(DATA_PATHS.REGISTER_VALIDATE_PASSWORD_EMPTY);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Validate password length
          if (password.length < 6) {
            const data = await loadJson(DATA_PATHS.REGISTER_VALIDATE_PASSWORD_SHORT);
            return [HTTP_STATUS.CLIENT_ERROR_MIN, data];
          }

          // Success - return inactive status (change to REGISTER_SUCCESS_ACTIVE to test active flow)
          const responseFile = Math.random() < 0.5 ? DATA_PATHS.REGISTER_SUCCESS_ACTIVE : DATA_PATHS.REGISTER_SUCCESS_INACTIVE;
          const data = await loadJson(responseFile);
          return [201, data];
        } catch (error) {
          console.error('[Mock API] Register handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Profile
      mock.onGet(MOCK_PATTERNS.PROFILE).reply(async (config) => {
        try {
          const data = await loadJson(DATA_PATHS.PROFILE);
          data.data = {
            ...(data?.data || {}),
            new_email: mockPendingEmail,
            emailVerificationPending: Boolean(mockPendingEmail),
            pendingEmailAction: {
              canClear: Boolean(mockPendingEmail),
              endpoint: API_ENDPOINTS.CLEAR_PENDING_EMAIL,
              method: 'DELETE'
            }
          };
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Profile handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onPut(MOCK_PATTERNS.PROFILE).reply(async (config) => {
        try {
          const t = i18n.global.t;
          const body = parseBody(config);
          const current = await loadJson(DATA_PATHS.PROFILE);
          const updateResponse = await loadJson(DATA_PATHS.PROFILE_UPDATE_SUCCESS);
          const currentProfile = current?.data || {};
          const serverUpdateData = updateResponse?.data || {};

          const nextFullName = String(body.full_name || '').trim();
          const nextEmail = String(body.email || '').trim();

          if (!nextFullName) {
            return [400, {
              success: false,
              error: t('message.profile.validation_full_name_required')
            }];
          }

          if (!nextEmail) {
            return [400, {
              success: false,
              error: t('message.profile.validation_email_required')
            }];
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(nextEmail)) {
            return [400, {
              success: false,
              error: t('message.profile.validation_email_invalid')
            }];
          }

          const emailChanged = nextEmail.toLowerCase() !== String(currentProfile.email || '').trim().toLowerCase();
          mockPendingEmail = emailChanged ? nextEmail : null;

          let serverMessage = String(updateResponse?.message || '').trim();
          if (emailChanged && serverMessage) {
            serverMessage = serverMessage.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, nextEmail);
          }

          return [200, {
            success: updateResponse?.success ?? true,
            data: {
              ...serverUpdateData,
              ...currentProfile,
              full_name: nextFullName,
              email: emailChanged ? (serverUpdateData.email || currentProfile.email) : nextEmail,
              new_email: mockPendingEmail,
              emailVerificationPending: Boolean(mockPendingEmail),
              pendingEmailAction: {
                canClear: Boolean(mockPendingEmail),
                endpoint: API_ENDPOINTS.CLEAR_PENDING_EMAIL,
                method: 'DELETE'
              }
            },
            message: emailChanged
              ? (serverMessage || t('message.profile.update_verify_email'))
              : t('message.profile.update_success')
          }];
        } catch (error) {
          console.error('[Mock API] Update profile handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onDelete(MOCK_PATTERNS.CLEAR_PENDING_EMAIL).reply(async () => {
        try {
          const t = i18n.global.t;

          if (!mockPendingEmail) {
            return [400, {
              success: false,
              error: t('message.profile.clear_pending_email_not_found')
            }];
          }

          const current = await loadJson(DATA_PATHS.PROFILE);
          const currentProfile = current?.data || {};

          mockPendingEmail = null;

          return [200, {
            success: true,
            data: {
              ...currentProfile,
              new_email: null,
              emailVerificationPending: false,
              pendingEmailAction: {
                canClear: false,
                endpoint: API_ENDPOINTS.CLEAR_PENDING_EMAIL,
                method: 'DELETE'
              }
            },
            message: t('message.profile.pending_email_cleared')
          }];
        } catch (error) {
          console.error('[Mock API] Clear pending email handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onPut(MOCK_PATTERNS.CHANGE_PASSWORD).reply(async (config) => {
        try {
          const t = i18n.global.t;
          const body = parseBody(config);
          const currentPassword = String(body.currentPassword || '').trim();
          const newPassword = String(body.newPassword || '').trim();
          const confirmPassword = String(body.confirmPassword || '').trim();
          const failPayload = await loadJson(DATA_PATHS.CHANGE_PASSWORD_FAIL);
          const defaultValidationMessage = String(failPayload?.errors?.[0]?.message || '').trim();
          const baseErrorText = String(failPayload?.error || '').trim();
          const baseDetailsText = String(failPayload?.details || '').trim();
          const buildValidationError = (field, message, code = 'invalid_type') => {
            const errors = [{ field, message, code }];
            const count = errors.length;
            return {
              ...failPayload,
              success: false,
              errors,
              errorCount: count,
              error: baseErrorText || t('message.errors.something_went_wrong'),
              details: baseDetailsText || baseErrorText || t('message.errors.something_went_wrong')
            };
          };

          if (!currentPassword || !newPassword || !confirmPassword) {
            const missingField = !currentPassword
              ? 'currentPassword'
              : (!newPassword ? 'newPassword' : 'confirmPassword');
            return [400, buildValidationError(missingField, t('message.profile.password_required_fields'), 'too_small')];
          }

          if (newPassword.length < 6) {
            return [400, buildValidationError('newPassword', defaultValidationMessage || t('message.errors.something_went_wrong'), 'too_small')];
          }

          if (newPassword !== confirmPassword) {
            return [400, buildValidationError('confirmPassword', t('message.auth.password_mismatch'), 'custom')];
          }

          if (currentPassword !== MOCK_CONFIG.TEST_PASSWORD) {
            const invalidCurrentPayload = await loadJson(DATA_PATHS.CHANGE_PASSWORD_INVALID_CURRENT);
            return [400, invalidCurrentPayload];
          }

          // Success: use succeed/response.json
          const successPayload = await loadJson(DATA_PATHS.CHANGE_PASSWORD_SUCCESS);
          return [200, successPayload];
        } catch (error) {
          console.error('[Mock API] Change password handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // API info
      mock.onGet(MOCK_PATTERNS.API_INFO).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.API_INFO);
          return [200, data];
        } catch (error) {
          console.error('[Mock API] API info handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onGet(MOCK_PATTERNS.PUBLIC_HEALTH).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.PUBLIC_HEALTH);
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Public health handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onGet(MOCK_PATTERNS.PUBLIC_VERSION).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.PUBLIC_VERSION);
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Public version handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onGet(MOCK_PATTERNS.PUBLIC_LANGUAGE).reply(async (config) => {
        try {
          const data = await loadJson(DATA_PATHS.PUBLIC_LANGUAGE);
          const requestLanguage = config?.headers?.['Accept-Language'] || config?.headers?.['accept-language'];
          if (requestLanguage && data?.data) {
            return [200, {
              ...data,
              data: {
                ...data.data,
                current_language: String(requestLanguage).split(',')[0].trim().toLowerCase()
              }
            }];
          }
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Public language handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Users
      mock.onPost(MOCK_PATTERNS.USERS).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.CREATE_USER_SUCCESS);
          return [201, data];
        } catch (error) {
          console.error('[Mock API] Create user handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onGet(MOCK_PATTERNS.USERS).reply(async (config) => {
        try {
          const data = await loadJson(DATA_PATHS.USERS_LIST);
          const params = config.params || {};
          const page = Number.parseInt(params.page, 10) || data.data?.pagination?.page || 1;
          const limit = Number.parseInt(params.limit, 10) || data.data?.pagination?.limit || data.data?.users?.length || 10;

          if (data.data && data.data.pagination) {
            const total = data.data.pagination.total || data.data.users.length;
            data.data.pagination.page = page;
            data.data.pagination.limit = limit;
            data.data.pagination.totalPages = data.data.pagination.totalPages || Math.max(1, Math.ceil(total / limit));
          }

          return [200, data];
        } catch (error) {
          console.error('[Mock API] Users handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Update User Role (dedicated endpoint)
      mock.onPut(MOCK_PATTERNS.ADMIN_USER_ROLE).reply(async (config) => {
        try {
          const body = parseBody(config);
          const url = config.url || '';
          const match = url.match(/\/api\/admin\/users\/(\d+)\/role(?:$|\?)/);
          const userId = match ? Number.parseInt(match[1], 10) : null;
          const role = String(body.role || '').trim().toLowerCase();
          const allowedRoles = ['user', 'admin', 'super_admin'];

          if (!allowedRoles.includes(role)) {
            return [400, {
              success: false,
              message: `Invalid role: ${role}`
            }];
          }

          const data = await loadJson(DATA_PATHS.CHANGE_USER_ROLE_SUCCESS);
          const responseData = {
            ...data,
            data: {
              ...(data?.data || {}),
              ...(userId ? { userId } : {}),
              newRole: role
            }
          };
          return [200, responseData];
        } catch (error) {
          console.error('[Mock API] Update user role handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Update User (without role changes)
      mock.onPut(MOCK_PATTERNS.USERS).reply(async (config) => {
        try {
          const url = config.url || '';
          if (/\/api\/admin\/users\/\d+\/role(?:$|\?)/.test(url)) {
            return [404, {
              success: false,
              message: 'Use dedicated role endpoint handler'
            }];
          }

          const data = await loadJson(DATA_PATHS.UPDATE_USER_SUCCESS);
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Update user handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Delete User
      mock.onDelete(MOCK_PATTERNS.USERS).reply(async (config) => {
        try {
          // Optionally parse ID from URL for more realistic behavior
          const url = config.url || '';
          const match = url.match(/\/api\/admin\/users\/(\d+)(?:$|[?\/])/);
          const userId = match ? match[1] : null;

          // For mock, we simply return success. Could simulate 404 if needed.
          const message = i18n && i18n.global ? i18n.global.t('message.admin_users.deleted_success') : 'User deleted';
          return [200, { success: true, message }];
        } catch (error) {
          console.error('[Mock API] Delete user handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Admin: system health
      mock.onGet(MOCK_PATTERNS.ADMIN_SYSTEM_HEALTH).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADMIN_SYSTEM_HEALTH);
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Admin system health handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Admin: system stats
      mock.onGet(MOCK_PATTERNS.ADMIN_STATS).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADMIN_STATS);
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Admin system stats handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });
      
      // Audit: logs
      mock.onGet(MOCK_PATTERNS.AUDIT_LOGS).reply(async (config) => {
        try {
          const data = await loadJson(DATA_PATHS.AUDIT_LOGS_SUCCESS);
          const params = config.params || {};
          const page = Number.parseInt(params.page, 10) || data.data?.pagination?.page || 1;
          const limit = Number.parseInt(params.limit, 10) || data.data?.pagination?.limit || data.data?.logs?.length || 20;

          if (data.data && data.data.pagination) {
            const total = data.data.pagination.total || (data.data.logs && data.data.logs.length) || 0;
            data.data.pagination.page = page;
            data.data.pagination.limit = limit;
            data.data.pagination.totalPages = data.data.pagination.totalPages || Math.max(1, Math.ceil(total / limit));
          }

          return [200, data];
        } catch (error) {
          console.error('[Mock API] Audit logs handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Audit: stats
      mock.onGet(MOCK_PATTERNS.AUDIT_STATS).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.AUDIT_STATS_SUCCESS);
          return [200, normalizeAuditStatsResponse(data)];
        } catch (error) {
          console.error('[Mock API] Audit stats handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Security incidents
      mock.onGet(MOCK_PATTERNS.SECURITY_INCIDENTS).reply(async (config) => {
        try {
          const data = await loadJson(DATA_PATHS.SECURITY_INCIDENTS);
          const params = config.params || {};
          const page = Number.parseInt(params.page, 10) || data.data?.pagination?.page || 1;
          const limit = Number.parseInt(params.limit, 10) || data.data?.pagination?.limit || data.data?.incidents?.length || 50;

          if (data.data && data.data.pagination) {
            const total = data.data.pagination.total || (data.data.incidents && data.data.incidents.length) || 0;
            data.data.pagination.page = page;
            data.data.pagination.limit = limit;
            data.data.pagination.totalPages = data.data.pagination.totalPages || Math.max(1, Math.ceil(total / limit));
          }

          return [200, data];
        } catch (error) {
          console.error('[Mock API] Security incidents handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: status
      mock.onGet(MOCK_PATTERNS.REALTIME_MONITORING_STATUS).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.REALTIME_MONITORING_STATUS_SUCCESS);

          return [200, {
            ...data,
            data: {
              ...(data?.data || {}),
              monitoring: {
                ...(data?.data?.monitoring || {}),
                active: typeof mockMonitoringActive === 'boolean'
                  ? mockMonitoringActive
                  : Boolean(data?.data?.monitoring?.active)
              }
            }
          }];
        } catch (error) {
          console.error('[Mock API] Monitoring status handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: start
      mock.onPost(MOCK_PATTERNS.REALTIME_MONITORING_START).reply(async (config) => {
        try {
          const body = parseBody(config);
          const data = await loadJson(DATA_PATHS.REALTIME_MONITORING_START_SUCCESS);
          mockMonitoringActive = true;

          return [200, {
            ...data,
            data: {
              ...(data?.data || {}),
              intervalMs: Number(body.intervalMs) || Number(data?.data?.intervalMs) || 5000,
              enableThreatDetection: typeof body.enableThreatDetection === 'boolean'
                ? body.enableThreatDetection
                : (typeof data?.data?.enableThreatDetection === 'boolean' ? data.data.enableThreatDetection : true),
              startedAt: new Date().toISOString()
            }
          }];
        } catch (error) {
          console.error('[Mock API] Monitoring start handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: stop
      mock.onPost(MOCK_PATTERNS.REALTIME_MONITORING_STOP).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.REALTIME_MONITORING_STOP_SUCCESS);
          mockMonitoringActive = false;
          return [200, {
            ...data,
            data: {
              ...(data?.data || {}),
              stoppedAt: new Date().toISOString()
            }
          }];
        } catch (error) {
          console.error('[Mock API] Monitoring stop handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: threats
      mock.onGet(MOCK_PATTERNS.REALTIME_MONITORING_THREATS).reply(async () => {
        try {
          const { threatsData } = await getRealtimePayload();
          return [200, { success: true, data: threatsData, message: 'Threat data loaded' }];
        } catch (error) {
          console.error('[Mock API] Monitoring threats handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: analyze
      mock.onPost(MOCK_PATTERNS.REALTIME_MONITORING_ANALYZE).reply(async (config) => {
        try {
          const body = parseBody(config);
          return [200, {
            success: true,
            data: {
              hours: Number(body.hours) || 1,
              threatsDetected: Math.floor(Math.random() * 5),
              anomalies: Math.floor(Math.random() * 3),
              generatedAt: new Date().toISOString()
            },
            message: 'Threat analysis completed'
          }];
        } catch (error) {
          console.error('[Mock API] Monitoring analyze handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: simulate
      mock.onPost(MOCK_PATTERNS.REALTIME_MONITORING_SIMULATE).reply(async (config) => {
        try {
          const body = parseBody(config);
          return [200, {
            success: true,
            data: {
              id: `sim_${Date.now()}`,
              type: body.eventType || body.type || 'test_event',
              action: body.action || body.eventType || 'test_event',
              severity: body.severity || 'medium',
              timestamp: new Date().toISOString()
            },
            message: 'Event simulated'
          }];
        } catch (error) {
          console.error('[Mock API] Monitoring simulate handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: alert status
      mock.onGet(MOCK_PATTERNS.REALTIME_MONITORING_ALERTS_STATUS).reply(async () => {
        try {
          const { alertsStatusData } = await getRealtimePayload();
          return [200, { success: true, data: alertsStatusData, message: 'Alert status loaded' }];
        } catch (error) {
          console.error('[Mock API] Alerts status handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: alert history
      mock.onGet(MOCK_PATTERNS.REALTIME_MONITORING_ALERTS_HISTORY).reply(async () => {
        try {
          const { alertsHistoryData } = await getRealtimePayload();
          return [200, { success: true, data: alertsHistoryData, message: 'Alert history loaded' }];
        } catch (error) {
          console.error('[Mock API] Alerts history handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: dashboard overview
      mock.onGet(MOCK_PATTERNS.REALTIME_MONITORING_DASHBOARD_OVERVIEW).reply(async () => {
        try {
          const { overviewData } = await getRealtimePayload();
          return [200, { success: true, data: overviewData, message: 'Overview loaded' }];
        } catch (error) {
          console.error('[Mock API] Dashboard overview handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: dashboard realtime
      mock.onGet(MOCK_PATTERNS.REALTIME_MONITORING_DASHBOARD_REALTIME).reply(async () => {
        try {
          const { rawResponse, rawData } = await getRealtimePayload();

          return [200, {
            ...rawResponse,
            data: rawData
          }];
        } catch (error) {
          console.error('[Mock API] Dashboard realtime handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: dashboard timeline
      mock.onGet(MOCK_PATTERNS.REALTIME_MONITORING_DASHBOARD_TIMELINE).reply(async () => {
        try {
          const { timelineData } = await getRealtimePayload();
          return [200, { success: true, data: timelineData, message: 'Timeline loaded' }];
        } catch (error) {
          console.error('[Mock API] Dashboard timeline handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Realtime monitoring: dashboard health
      mock.onGet(MOCK_PATTERNS.REALTIME_MONITORING_DASHBOARD_HEALTH).reply(async () => {
        try {
          const { healthData } = await getRealtimePayload();
          return [200, { success: true, data: healthData, message: 'Health check loaded' }];
        } catch (error) {
          console.error('[Mock API] Dashboard health handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onPost(MOCK_PATTERNS.REALTIME_MONITORING_DASHBOARD_EXPORT).reply(async (config) => {
        try {
          const body = parseBody(config);
          const data = await loadJson(DATA_PATHS.REALTIME_MONITORING_EXPORT_SUCCESS);
          const format = String(body?.format || 'json').toLowerCase();
          const timeRange = String(body?.timeRange || 'last_24h');

          return [200, {
            ...data,
            data: {
              ...(data?.data || {}),
              metadata: {
                ...(data?.data?.metadata || {}),
                format,
                timeRange,
                exportedAt: new Date().toISOString()
              }
            },
            meta: {
              ...(data?.meta || {}),
              filename: format === 'csv'
                ? `audit_dashboard_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`
                : (data?.meta?.filename || `audit_dashboard_${timeRange}_${new Date().toISOString().slice(0, 10)}.json`),
              contentType: format === 'csv' ? 'text/csv' : (data?.meta?.contentType || 'application/json')
            }
          }];
        } catch (error) {
          console.error('[Mock API] Dashboard export handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      // Initialize KV Admin Mocks
      initializeKVAdminMock(mock);
    }
  } else {
    if (mock) {
      console.log('Disabling Mock API');
      mock.restore();
      mock = null;
    }
  }
};

export const initializeKVAdminMock = (mockAdapter) => {
  if (!mockAdapter) return;
  mockAdapter.onGet(MOCK_PATTERNS.KV_ADMIN_AUDIT_CONFIGS_FEATURES).reply(async () => {
    try {
      const data = await loadJson(DATA_PATHS.KV_ADMIN_FEATURES);
      return [200, data];
    } catch {
      return [200, { success: true, data: { enableAuditLogging: true, enableRealTimeMonitoring: true, enableAdvancedAnalytics: true, enableExport: true, enableArchival: true, enableComplianceReporting: true, enablePerformanceMonitoring: true, enableAdvancedSearch: true } }];
    }
  });
  mockAdapter.onGet(MOCK_PATTERNS.KV_ADMIN_ENV_COMPARISON).reply(async () => {
    try {
      const data = await loadJson(DATA_PATHS.KV_ADMIN_ENV_COMPARISON);
      return [200, data];
    } catch {
      return [200, { success: true, data: { comparison: {}, summary: {} } }];
    }
  });
  mockAdapter.onPost(MOCK_PATTERNS.KV_ADMIN_CONFIGS_BATCH).reply(async () => {
    try {
      const data = await loadJson(DATA_PATHS.KV_ADMIN_BATCH_SUCCESS);
      return [200, data];
    } catch {
      return [200, {
        success: true,
        data: {
          updated: {},
          errors: {},
          summary: { total: 0, updated: 0, failed: 0 },
          cacheCleared: true
        },
        message: 'Batch configuration update successful'
      }];
    }
  });
  
  mockAdapter.onGet(MOCK_PATTERNS.KV_ADMIN_AUDIT_CONFIGS_RETENTION).reply(async () => {
    try {
      const data = await loadJson(DATA_PATHS.KV_ADMIN_RETENTION);
      return [200, data];
    } catch {
      return [200, { success: true, data: { defaultRetentionDays: 90, sensitiveRetentionDays: 365, complianceRetentionDays: 2555, autoArchiveEnabled: true, autoArchiveThresholdDays: 30 } }];
    }
  });
  mockAdapter.onGet(MOCK_PATTERNS.KV_ADMIN_AUDIT_CONFIGS_PERFORMANCE).reply(async () => {
    try {
      const data = await loadJson(DATA_PATHS.KV_ADMIN_PERFORMANCE);
      return [200, data];
    } catch {
      return [200, { success: true, data: { maxQueryResults: 1000, defaultPageSize: 50, maxPageSize: 500, queryTimeoutMs: 30000, batchSize: 100 } }];
    }
  });
  mockAdapter.onGet(MOCK_PATTERNS.KV_ADMIN_AUDIT_CONFIGS_ALERTS).reply(async () => {
    try {
      const data = await loadJson(DATA_PATHS.KV_ADMIN_ALERTS);
      return [200, data];
    } catch {
      return [200, { success: true, data: { failedLoginThreshold: 5, suspiciousActivityThreshold: 10, highRiskActionThreshold: 3, performanceAlertThresholdMs: 5000 } }];
    }
  });
  mockAdapter.onGet(MOCK_PATTERNS.KV_ADMIN_AUDIT_CONFIGS_COMPLIANCE).reply(async () => {
    try {
      const data = await loadJson(DATA_PATHS.KV_ADMIN_COMPLIANCE);
      return [200, data];
    } catch {
      return [200, { success: true, data: { gdprEnabled: true, hipaaEnabled: false, pciDssEnabled: false, soc2Enabled: true, dataAnonymization: true, consentTracking: true } }];
    }
  });
  mockAdapter.onPost(MOCK_PATTERNS.KV_ADMIN_AUDIT_CONFIGS_TOGGLE).reply(async () => {
    return [200, await loadJson(DATA_PATHS.KV_ADMIN_FEATURES_TOGGLE_SUCCESS)];
  });
  mockAdapter.onPost(MOCK_PATTERNS.KV_ADMIN_RATE_LIMITS_CLEAN).reply(200, {
    success: true, data: { dryRun: true, deletedCount: 5, prefix: "test:" }
  });
  mockAdapter.onPost(MOCK_PATTERNS.KV_ADMIN_RATE_LIMITS_PRUNE_TIME).reply(200, {
    success: true, data: { dryRun: true, deletedCount: 12 }
  });
};
