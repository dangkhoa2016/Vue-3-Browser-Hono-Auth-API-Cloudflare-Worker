import { apiClient } from './httpClient.js';
import { DEFAULT_ADMIN_PAGE_SIZE } from '../constants/pagination.js';
import { API_ENDPOINTS, HTTP_STATUS } from './endpoints.js';
import { DATA_PATHS, MOCK_CONFIG, MOCK_PATTERNS } from './mockData.js';
import { sleep } from '../helper.js';
const MockAdapter = window.AxiosMockAdapter;

const loadJson = async (path) => {
  const res = await fetch(path);
  if (!res.ok) {
    const t = window.i18nInstance?.global?.t || ((msg) => msg);
    throw new Error(typeof t === 'function' ? t('message.errors.failed_to_load', { item: path, message: res.statusText || t('message.errors.unknown_error') }) : `Failed to load ${path}`);
  }
  return res.json();
};

let mock = null;

export const setupMock = (enable) => {
  if (enable) {
    if (!mock) {
      console.log('Enabling Mock API');
      mock = new MockAdapter(apiClient, { delayResponse: MOCK_CONFIG.DELAY_RESPONSE });
      let mockMonitoringActive = false;
      let mockPendingEmail = null;
      let mockAlertConfiguration = {
        thresholds: {
          failedLogins: 5,
          suspiciousActivity: 10,
          highRiskActions: 3
        },
        settings: {
          emailNotifications: true,
          cooldownMinutes: 15,
          autoResolveLowSeverity: false
        }
      };

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
          alertsHistoryData: payload.alertsHistory || { alerts: [], pagination: { page: 1, limit: DEFAULT_ADMIN_PAGE_SIZE, total: 0, totalPages: 1 } },
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
          const t = window.i18nInstance?.global?.t || ((msg) => msg);
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
          const t = window.i18nInstance?.global?.t || ((msg) => msg);

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
          const t = window.i18nInstance?.global?.t || ((msg) => msg);
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
          const message = window.i18nInstance && window.i18nInstance.global ? window.i18nInstance.global.t('message.admin_users.deleted_success') : 'User deleted';
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

      // Admin: Token Blacklist
      mock.onGet(MOCK_PATTERNS.ADMIN_TOKEN_BLACKLIST).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.TOKEN_BLACKLIST_LIST_SUCCESS);
          return [200, data];
        } catch (error) {
          const message = error.message || 'Internal Server Error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onPost(MOCK_PATTERNS.ADMIN_TOKEN_BLACKLIST).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.TOKEN_BLACKLIST_CREATE_SUCCESS);
          return [200, data];
        } catch (error) {
          return [500, { success: false, error: 'Internal error' }];
        }
      });

      mock.onDelete(MOCK_PATTERNS.ADMIN_TOKEN_BLACKLIST).reply(async () => {
        return [200, { success: true, message: "Token successfully removed from blacklist" }];
      });
      
      // Admin: Token Audit
      mock.onGet(MOCK_PATTERNS.ADMIN_TOKEN_AUDIT).reply(async (config) => {
        try {
          const isDetail = /\/api\/admin\/token-audit\/\d+(?:\?.*)?$/.test(config.url);
          if (isDetail) {
            const data = await loadJson(DATA_PATHS.TOKEN_AUDIT_DETAIL_SUCCESS);
            return [200, data];
          }
          const data = await loadJson(DATA_PATHS.TOKEN_AUDIT_LIST_SUCCESS);
          return [200, data];
        } catch (error) {
          const message = error.message || 'Internal Server Error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onDelete(MOCK_PATTERNS.ADMIN_TOKEN_AUDIT).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.TOKEN_AUDIT_DELETE_SUCCESS);
          return [200, data];
        } catch (error) {
          return [500, { success: false, error: error.message || 'Internal Server Error' }];
        }
      });

      mock.onPost(MOCK_PATTERNS.ADMIN_TOKEN_AUDIT).reply(async (config) => {
        const isBulkDelete = /\/api\/admin\/token-audit\/bulk-delete(?:\?.*)?$/.test(config.url);
        if (isBulkDelete) {
          try {
            const data = await loadJson(DATA_PATHS.TOKEN_AUDIT_BULK_DELETE_SUCCESS);
            return [200, data];
          } catch (error) {
            return [500, { success: false, error: error.message || 'Internal Server Error' }];
          }
        }
        return [404, { success: false, error: 'Not found' }];
      });

      // Audit: logs
      mock.onGet(MOCK_PATTERNS.AUDIT_LOGS).reply(async (config) => {
        try {
          const data = await loadJson(DATA_PATHS.AUDIT_LOGS_SUCCESS);
          const params = config.params || {};
          const page = Number.parseInt(params.page, 10) || data.data?.pagination?.page || 1;
          const limit = Number.parseInt(params.limit, 10) || data.data?.pagination?.limit || data.data?.logs?.length || DEFAULT_ADMIN_PAGE_SIZE;

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
      
      // Advanced Audit mocks
      mock.onGet(MOCK_PATTERNS.ADVANCED_AUDIT_ANALYTICS).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_ANALYTICS_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onGet(MOCK_PATTERNS.ADVANCED_AUDIT_COMPLIANCE_MANAGEMENT).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_COMPLIANCE_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onPost(MOCK_PATTERNS.ADVANCED_AUDIT_COMPLIANCE_MANAGEMENT).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_COMPLIANCE_ENFORCE_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onGet(MOCK_PATTERNS.ADVANCED_AUDIT_COMPLIANCE).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_COMPLIANCE_REPORT_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onGet(MOCK_PATTERNS.ADVANCED_AUDIT_ANALYTICS_SECURITY).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_ANALYTICS_SECURITY_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onGet(MOCK_PATTERNS.ADVANCED_AUDIT_MIDDLEWARE_STATS).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_MIDDLEWARE_STATS_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onPost(MOCK_PATTERNS.ADVANCED_AUDIT_ARCHIVAL_RUN).reply(async () => { const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_ARCHIVAL_RUN_SUCCESS); return [200, data]; });

      mock.onPost(MOCK_PATTERNS.ADVANCED_AUDIT_ARCHIVAL_RESTORE).reply(async () => { const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_ARCHIVAL_RESTORE_FAIL); return [400, data]; });

      mock.onGet(MOCK_PATTERNS.ADVANCED_AUDIT_ARCHIVAL).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_ARCHIVAL_STATS_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onGet(MOCK_PATTERNS.ADVANCED_AUDIT_ARCHIVE).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_ARCHIVE_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onPost(MOCK_PATTERNS.ADVANCED_AUDIT_ARCHIVE).reply(async (config) => {
        try {
          const body = JSON.parse(config.data || '{}');
          return [200, { success: true, action: body.action }];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
        }
      });

      mock.onPost(MOCK_PATTERNS.ADVANCED_AUDIT_RETENTION).reply(async () => {
        try {
          const data = await loadJson(DATA_PATHS.ADVANCED_AUDIT_RETENTION_SUCCESS);
          return [200, data];
        } catch {
          return [500, { success: false, error: 'Mock fail' }];
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
          return [200, {
            success: true,
            data: {
              activeAlerts: Number(alertsStatusData?.activeAlerts) || 2,
              totalRules: Number(alertsStatusData?.totalRules) || 6,
              enabledRules: Number(alertsStatusData?.enabledRules) || 4,
              ...(alertsStatusData && typeof alertsStatusData === 'object' ? alertsStatusData : {}),
              thresholds: {
                ...(alertsStatusData?.thresholds || {}),
                ...mockAlertConfiguration.thresholds
              },
              settings: {
                ...(alertsStatusData?.settings || {}),
                ...mockAlertConfiguration.settings
              }
            },
            message: 'Alert status loaded'
          }];
        } catch (error) {
          console.error('[Mock API] Alerts status handler error:', error);
          const message = (error && error.message) || 'Internal server error';
          return [500, { success: false, error: message }];
        }
      });

      mock.onPost(MOCK_PATTERNS.REALTIME_MONITORING_ALERTS_CONFIGURE).reply(async (config) => {
        try {
          const body = parseBody(config);
          mockAlertConfiguration = {
            thresholds: {
              ...(mockAlertConfiguration.thresholds || {}),
              ...((body?.thresholds && typeof body.thresholds === 'object') ? body.thresholds : {})
            },
            settings: {
              ...(mockAlertConfiguration.settings || {}),
              ...((body?.settings && typeof body.settings === 'object') ? body.settings : {})
            }
          };

          return [200, {
            success: true,
            data: {
              activeAlerts: 2,
              totalRules: 6,
              enabledRules: 4,
              thresholds: mockAlertConfiguration.thresholds,
              settings: mockAlertConfiguration.settings
            },
            message: 'Alert configuration updated'
          }];
        } catch (error) {
          console.error('[Mock API] Alerts configure handler error:', error);
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

  mockAdapter.onDelete(MOCK_PATTERNS.KV_ADMIN_CONFIGS_SPECIFIC).reply(async (config) => {
    try {
      const data = await loadJson(DATA_PATHS.KV_ADMIN_DELETE_SUCCESS);
      // Giả lập trả về key được xóa/reset theo URL (nếu có dynamic data từ URL, bạn có thể override ở đây)
      return [200, data];
    } catch {
      return [200, { success: true, message: 'Deleted mock fallback' }];
    }
  });

  mockAdapter.onPost(MOCK_PATTERNS.KV_ADMIN_AUDIT_CONFIGS_TOGGLE).reply(async () => {
    return [200, await loadJson(DATA_PATHS.KV_ADMIN_FEATURES_TOGGLE_SUCCESS)];
  });
  mockAdapter.onPost(MOCK_PATTERNS.KV_ADMIN_RATE_LIMITS_CLEAN).reply(async () => {
    return [200, await loadJson(DATA_PATHS.KV_ADMIN_RATE_LIMITS_CLEAN_SUCCESS)];
  });
  mockAdapter.onGet(MOCK_PATTERNS.KV_ADMIN_RATE_LIMITS_LIST).reply(async () => {
    return [200, await loadJson(DATA_PATHS.KV_ADMIN_RATE_LIMITS_LIST_SUCCESS)];
  });
  mockAdapter.onPost(MOCK_PATTERNS.KV_ADMIN_RATE_LIMITS_PRUNE_TIME).reply(async () => {
    return [200, await loadJson(DATA_PATHS.KV_ADMIN_RATE_LIMITS_PRUNE_SUCCESS)];
  });
};
