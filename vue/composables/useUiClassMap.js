const BADGE_BASE_CLASS = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold';

const USER_ROLE_BADGE_MAP = {
  super_admin: `${BADGE_BASE_CLASS} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`,
  admin: `${BADGE_BASE_CLASS} bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300`,
  default: `${BADGE_BASE_CLASS} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`
};

const USER_STATUS_BADGE_MAP = {
  active: `${BADGE_BASE_CLASS} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300`,
  default: `${BADGE_BASE_CLASS} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300`
};

const HEALTH_TEXT_CLASS_MAP = {
  healthy: 'text-emerald-600 dark:text-emerald-400',
  unhealthy: 'text-rose-600 dark:text-rose-400',
  default: 'text-slate-600 dark:text-slate-300'
};

const HEALTH_CHECK_BADGE_CLASS_MAP = {
  healthy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  pass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unhealthy: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  fail: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
};

const normalize = (value) => String(value || '').toLowerCase().trim();

const SECURITY_INCIDENT_TYPE_BADGE_MAP = {
  brute_force_login: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  privilege_escalation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
};

const SECURITY_INCIDENT_SEVERITY_BADGE_MAP = {
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
};

const SECURITY_INCIDENT_STATUS_BADGE_MAP = {
  detected: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
};

const KV_SOURCE_BADGE_MAP = {
  kv: `${BADGE_BASE_CLASS} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300`,
  default: `${BADGE_BASE_CLASS} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`,
  unknown: `${BADGE_BASE_CLASS} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300`
};

const KV_ENV_SOURCE_BADGE_MAP = {
  kv: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',
  env: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30',
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
};

const TOKEN_AUDIT_ACTION_CLASS_MAP = {
  LOGIN: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md',
  LOGOUT: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md',
  REFRESH_TOKEN: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-md',
  REVOKE: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md',
  INVALID_TOKEN: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-md'
};

const TOKEN_AUDIT_DEFAULT_ACTION_CLASS = 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono text-xs';

export function getUserRoleBadgeClass(role) {
  const normalized = normalize(role);
  return USER_ROLE_BADGE_MAP[normalized] || USER_ROLE_BADGE_MAP.default;
}

export function getUserStatusBadgeClass(status) {
  const normalized = normalize(status);
  return USER_STATUS_BADGE_MAP[normalized] || USER_STATUS_BADGE_MAP.default;
}

export function getHealthTextClass(status) {
  const normalized = normalize(status);
  return HEALTH_TEXT_CLASS_MAP[normalized] || HEALTH_TEXT_CLASS_MAP.default;
}

export function getHealthCheckBadgeClass(status) {
  const normalized = normalize(status);
  return HEALTH_CHECK_BADGE_CLASS_MAP[normalized] || HEALTH_CHECK_BADGE_CLASS_MAP.default;
}

export function getBooleanHealthTextClass(value) {
  return value
    ? HEALTH_TEXT_CLASS_MAP.healthy
    : HEALTH_TEXT_CLASS_MAP.unhealthy;
}

export function getSecurityIncidentTypeBadgeClass(type) {
  const normalized = normalize(type);
  return SECURITY_INCIDENT_TYPE_BADGE_MAP[normalized] || SECURITY_INCIDENT_TYPE_BADGE_MAP.default;
}

export function getSecurityIncidentSeverityBadgeClass(severity) {
  const normalized = normalize(severity);
  return SECURITY_INCIDENT_SEVERITY_BADGE_MAP[normalized] || SECURITY_INCIDENT_SEVERITY_BADGE_MAP.default;
}

export function getSecurityIncidentStatusBadgeClass(status) {
  const normalized = normalize(status);
  return SECURITY_INCIDENT_STATUS_BADGE_MAP[normalized] || SECURITY_INCIDENT_STATUS_BADGE_MAP.default;
}

export function getKvSourceBadgeClass(source) {
  const normalized = normalize(source);
  if (normalized === 'kv') return KV_SOURCE_BADGE_MAP.kv;
  if (normalized === 'default') return KV_SOURCE_BADGE_MAP.default;
  return KV_SOURCE_BADGE_MAP.unknown;
}

export function getTokenAuditActionClass(action, baseClasses = '') {
  const actionKey = String(action || '').toUpperCase().trim();
  const mappedClass = TOKEN_AUDIT_ACTION_CLASS_MAP[actionKey] || TOKEN_AUDIT_DEFAULT_ACTION_CLASS;
  return `${baseClasses} ${mappedClass}`.trim();
}

export function getKvEnvSourceBadgeClass(source) {
  const normalized = normalize(source);
  return KV_ENV_SOURCE_BADGE_MAP[normalized] || KV_ENV_SOURCE_BADGE_MAP.default;
}