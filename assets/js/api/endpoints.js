const DEFAULT_API_BASE_URL = 'http://localhost:8788/';

export const API_CONFIG = {
  DEFAULT_BASE_URL: DEFAULT_API_BASE_URL,
  BASE_URL: DEFAULT_API_BASE_URL,
  DEFAULT_TIMEOUT: 15000,
  RETRY_COUNT: 2,
  RETRY_DELAY: 1000,
};

export const HTTP_STATUS = {
  CLIENT_ERROR_MIN: 400,
  CLIENT_ERROR_MAX: 500,
};

/**
 * Mapped API endpoints across all services
 * @type {Object.<string, string>}
 */
/**
 * Mapped API endpoints across all services
 * @type {Object.<string, string>}
 */
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
  ADMIN_TOKEN_BLACKLIST: '/api/admin/token-blacklist',
  ADMIN_TOKEN_AUDIT: '/api/admin/token-audit',
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
  KV_ADMIN_AUDIT_CONFIGS_REALTIME: '/api/kv-admin/audit/configs/realtime',
  KV_ADMIN_AUDIT_CONFIGS_EXPORT: '/api/kv-admin/audit/configs/export',
  KV_ADMIN_AUDIT_CONFIGS_TOGGLE: '/api/kv-admin/audit/configs/feature/:feature/toggle',
  // KV Admin - Rate Limits
  KV_ADMIN_RATE_LIMITS_LIST: '/api/kv-admin/rate-limits',
  KV_ADMIN_RATE_LIMITS_CLEAN: '/api/kv-admin/rate-limits/clean',
  KV_ADMIN_RATE_LIMITS_SEED: '/api/kv-admin/rate-limits/seed',
  KV_ADMIN_RATE_LIMITS_PRUNE_TIME: '/api/kv-admin/rate-limits/prune-time',
  KV_ADMIN_RATE_LIMITS_BATCH_DELETE: '/api/kv-admin/rate-limits/batch-delete',
  // Audit endpoints
  AUDIT_LOGS: '/api/audit/logs',
  AUDIT_STATS: '/api/audit/stats',
  AUDIT_EXPORT: '/api/audit/export',
  
  // Advanced Audit
  ADVANCED_AUDIT_ANALYTICS: '/api/advanced-audit/analytics',
  ADVANCED_AUDIT_ANALYTICS_SECURITY: '/api/advanced-audit/analytics/security',
  ADVANCED_AUDIT_ANALYTICS_BEHAVIOR: '/api/advanced-audit/analytics/behavior',
  ADVANCED_AUDIT_ANALYTICS_PERFORMANCE: '/api/advanced-audit/analytics/performance',
  ADVANCED_AUDIT_COMPLIANCE: '/api/advanced-audit/compliance/report',
  ADVANCED_AUDIT_COMPLIANCE_MANAGEMENT: '/api/advanced-audit/compliance',
  ADVANCED_AUDIT_ARCHIVAL: '/api/advanced-audit/archival/stats',
  ADVANCED_AUDIT_ARCHIVAL_RUN: '/api/advanced-audit/archival/run',
  ADVANCED_AUDIT_ARCHIVAL_RESTORE: '/api/advanced-audit/archival/restore',
  ADVANCED_AUDIT_ARCHIVE: '/api/advanced-audit/archive',
  ADVANCED_AUDIT_EXPORT_ADVANCED: '/api/advanced-audit/export-advanced',
  ADVANCED_AUDIT_MIDDLEWARE_STATS: '/api/advanced-audit/middleware/stats',
  ADVANCED_AUDIT_RETENTION: '/api/advanced-audit/retention',

  // Security incidents (match backend route)
  SECURITY_INCIDENTS: '/api/security-incident/incidents',
  // Realtime monitoring
  REALTIME_MONITORING_EVENTS_RECENT: '/api/realtime-monitoring/events/recent',
  REALTIME_MONITORING_STATUS: '/api/realtime-monitoring/monitoring/status',
  REALTIME_MONITORING_START: '/api/realtime-monitoring/monitoring/start',
  REALTIME_MONITORING_STOP: '/api/realtime-monitoring/monitoring/stop',
  REALTIME_MONITORING_THREATS: '/api/realtime-monitoring/monitoring/threats',
  REALTIME_MONITORING_THREAT_RESOLVE: '/api/realtime-monitoring/monitoring/threats/:threatId/resolve',
  REALTIME_MONITORING_ANALYZE: '/api/realtime-monitoring/monitoring/analyze',
  REALTIME_MONITORING_SIMULATE: '/api/realtime-monitoring/monitoring/simulate',
  REALTIME_MONITORING_ALERTS_STATUS: '/api/realtime-monitoring/alerts/status',
  REALTIME_MONITORING_ALERTS_CONFIGURE: '/api/realtime-monitoring/alerts/configure',
  REALTIME_MONITORING_ALERTS_HISTORY: '/api/realtime-monitoring/alerts/history',
  REALTIME_MONITORING_ALERTS_SEND: '/api/realtime-monitoring/alerts/send',
  REALTIME_MONITORING_ALERTS_RULES: '/api/realtime-monitoring/alerts/rules',
  REALTIME_MONITORING_ALERTS_RULE_TOGGLE: '/api/realtime-monitoring/alerts/rules/:ruleId/toggle',
  REALTIME_MONITORING_ALERTS_CHANNELS: '/api/realtime-monitoring/alerts/channels',
  REALTIME_MONITORING_ALERTS_TEST: '/api/realtime-monitoring/alerts/test',
  REALTIME_MONITORING_DASHBOARD_OVERVIEW: '/api/realtime-monitoring/dashboard/overview',
  REALTIME_MONITORING_DASHBOARD_REALTIME: '/api/realtime-monitoring/dashboard/realtime',
  REALTIME_MONITORING_DASHBOARD_LIVE: '/api/realtime-monitoring/dashboard/live',
  REALTIME_MONITORING_DASHBOARD_TIMELINE: '/api/realtime-monitoring/dashboard/timeline',
  REALTIME_MONITORING_DASHBOARD_SECURITY: '/api/realtime-monitoring/dashboard/security',
  REALTIME_MONITORING_DASHBOARD_PERFORMANCE: '/api/realtime-monitoring/dashboard/performance',
  REALTIME_MONITORING_DASHBOARD_CACHE: '/api/realtime-monitoring/dashboard/cache',
  REALTIME_MONITORING_DASHBOARD_HEALTH: '/api/realtime-monitoring/dashboard/health',
  REALTIME_MONITORING_DASHBOARD_EXPORT: '/api/realtime-monitoring/dashboard/export',
  REALTIME_MONITORING_INCIDENTS_CREATE: '/api/realtime-monitoring/incidents/create',
};

export const buildAdminUserRoleEndpoint = (userId) =>
  API_ENDPOINTS.ADMIN_USER_ROLE.replace(':id', String(userId));

export const buildRealtimeMonitoringThreatResolveEndpoint = (threatId) =>
  API_ENDPOINTS.REALTIME_MONITORING_THREAT_RESOLVE.replace(':threatId', encodeURIComponent(String(threatId)));

export const buildRealtimeMonitoringAlertRuleToggleEndpoint = (ruleId) =>
  API_ENDPOINTS.REALTIME_MONITORING_ALERTS_RULE_TOGGLE.replace(':ruleId', encodeURIComponent(String(ruleId)));
