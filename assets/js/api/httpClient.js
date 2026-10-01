const { axios } = window;
import { i18n } from '../i18n.js';
import { getAuthStore } from '../appServices.js';
import { API_ENDPOINTS, API_CONFIG, HTTP_STATUS } from './endpoints.js';
import {
  SESSION_IDENTITY_STORAGE,
  captureContext,
  getApiIdentity,
  isCurrentContext,
  normalizeApiBaseUrl,
  setApiIdentity,
} from './apiIdentity.js';

const API_REQUEST_TIMEOUT_KEY = 'api-request-timeout-ms';

export const TRANSPORT_ERROR_CODES = {
  CROSS_ORIGIN_REQUEST_REFUSED: 'CROSS_ORIGIN_REQUEST_REFUSED',
  STALE_SESSION: 'STALE_SESSION',
  REAUTH_REQUIRED: 'REAUTH_REQUIRED',
  AUTH_TEMPORARILY_UNAVAILABLE: 'AUTH_TEMPORARILY_UNAVAILABLE'
};

/**
 * Matches the "is this URL absolute" rule of the Axios version this app ships, including the
 * protocol-relative form `//host/path`. A protocol-relative URL is NOT relative: Axios sends it to
 * `//host` of the current origin, so treating it as relative is what used to leak a bearer to a
 * foreign host (review OF-02).
 */
export const ABSOLUTE_URL_PATTERN = /^([a-z][a-z\d+\-.]*:)?\/\//i;

/** Mirrors Axios' `combineURLs`/`buildFullPath` so the policy matches what is really sent. */
export function combineRequestUrl(baseURL, requestedUrl) {
  const base = String(baseURL || '');
  const requested = String(requestedUrl || '');

  if (!base) return requested;
  if (!requested) return base;
  if (ABSOLUTE_URL_PATTERN.test(requested)) return requested;

  return `${base.replace(/\/+$/, '')}/${requested.replace(/^\/+/, '')}`;
}

/**
 * Resolves the URL a request will actually target, using the same rules as the transport.
 *
 * `origin` and `pathname` are kept apart on purpose: the configured API identity is an origin plus
 * a *base path*, not the endpoint path. Comparing a resolved endpoint (`/api/user/profile`) against
 * the configured base would reject every ordinary relative request (review OF-02).
 *
 * @returns {{url: string, origin: string, pathname: string, invalid: boolean}}
 */
export function resolveRequestTarget(config, fallbackBase = '') {
  const requested = String(config?.url || '');
  const baseURL = config?.baseURL || fallbackBase;
  const combined = combineRequestUrl(baseURL, requested);

  try {
    const parsed = new URL(combined, window.location.origin);
    return { url: combined, origin: parsed.origin, pathname: parsed.pathname, invalid: false };
  } catch (_error) {
    return { url: combined, origin: '', pathname: '', invalid: true };
  }
}

const normalizeBasePath = (value) => {
  const path = String(value || '/').replace(/\/+$/, '');
  return path || '/';
};

/**
 * Decides whether a request stays inside the configured API.
 *
 * The rule is "same origin and inside the configured base path", which is what the transport will
 * really send:
 *   - a relative URL is in scope by construction, including when the base URL has a base path;
 *   - an absolute or protocol-relative URL to the same origin is accepted only when it stays under
 *     the configured base path;
 *   - anything on another origin is out of scope and must not receive the bearer token.
 */
export function resolveRequestScope(config, fallbackBase = '', configuredIdentity = getApiIdentity()) {
  const target = resolveRequestTarget(config, fallbackBase);
  const requested = String(config?.url || '');

  if (target.invalid) {
    return { inScope: false, reason: 'unresolvable-url', target, configuredBasePath: '/' };
  }

  if (!configuredIdentity) {
    return { inScope: false, reason: 'api-not-configured', target, configuredBasePath: '/' };
  }

  let configuredOrigin;
  let configuredBasePath;
  try {
    const configured = new URL(configuredIdentity, window.location.origin);
    configuredOrigin = configured.origin;
    configuredBasePath = normalizeBasePath(configured.pathname);
  } catch (_error) {
    return { inScope: false, reason: 'invalid-configured-identity', target, configuredBasePath: '/' };
  }

  if (target.origin !== configuredOrigin) {
    return { inScope: false, reason: 'cross-origin', target, configuredBasePath };
  }

  if (configuredBasePath !== '/' && !isPathInsideBase(target.pathname, configuredBasePath)) {
    return { inScope: false, reason: 'outside-configured-base-path', target, configuredBasePath };
  }

  // An absolute URL bypasses the configured base URL entirely, so it is a real boundary decision.
  const bypassesConfiguredBase = ABSOLUTE_URL_PATTERN.test(requested);
  if (bypassesConfiguredBase && configuredBasePath !== '/' && !isPathInsideBase(target.pathname, configuredBasePath)) {
    return { inScope: false, reason: 'outside-configured-base-path', target, configuredBasePath };
  }

  return { inScope: true, reason: 'within-configured-api', target, configuredBasePath };
}

function isPathInsideBase(pathname, basePath) {
  const path = String(pathname || '/');
  if (path === basePath) return true;
  return path.startsWith(`${basePath}/`);
}


/** Removes `Authorization` regardless of the casing the caller or Axios used. */
export function stripAuthorization(headers) {
  if (!headers) return headers;

  if (typeof headers.delete === 'function') {
    headers.delete('Authorization');
    return headers;
  }

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'authorization') delete headers[key];
  }

  return headers;
}

export function hasAuthorizationHeader(headers) {
  if (!headers) return false;
  if (typeof headers.get === 'function') return Boolean(headers.get('Authorization'));
  return Object.keys(headers).some((key) => key.toLowerCase() === 'authorization');
}

function createTransportError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}


/**
 * Methods that are safe to replay when a response is lost: they are not supposed to change
 * server state. Everything else needs an idempotency contract before it may be retried (F02).
 */
export const SAFE_METHODS = ['get', 'head', 'options'];

/** Statuses that mean "the backend is busy/unavailable": retrying them only creates a storm. */
export const NON_RETRYABLE_STATUSES = [429, 503];

const AUTH_ENDPOINTS = [
  API_ENDPOINTS.LOGIN,
  API_ENDPOINTS.REGISTER,
  API_ENDPOINTS.REFRESH_TOKEN,
  API_ENDPOINTS.LOGOUT,
].filter(Boolean);

/**
 * Matches a request against a known endpoint path.
 *
 * The endpoint constant is written against the API root, so a configured base path is removed
 * before comparing. Without that, a deployment served under `/api` classified every auth call as a
 * normal call, which disabled the "no bearer on login" rule and the logout token snapshot.
 */
function matchesEndpointPath(url, endpoint, baseURL) {
  if (!url || !endpoint) {
    return false;
  }

  const endpointPath = normalizeBasePath(String(endpoint).split('?')[0].split('#')[0]);
  const basePath = (() => {
    try {
      return normalizeBasePath(new URL(String(baseURL || ''), window.location.origin).pathname);
    } catch (_error) {
      return '/';
    }
  })();

  try {
    const resolvedUrl = new URL(combineRequestUrl(baseURL, url), window.location.origin);
    const requestPath = normalizeBasePath(resolvedUrl.pathname);
    const relativePath = basePath !== '/' && isPathInsideBase(requestPath, basePath)
      ? requestPath.slice(basePath.length) || '/'
      : requestPath;

    return relativePath === endpointPath || isPathInsideBase(relativePath, endpointPath);
  } catch (_error) {
    const normalizedUrl = normalizeBasePath(String(url).split('?')[0].split('#')[0]);
    return normalizedUrl === endpointPath || isPathInsideBase(normalizedUrl, endpointPath);
  }
}

export function isSafeMethod(method) {
  return SAFE_METHODS.includes(String(method || 'get').toLowerCase());
}

export function isAuthEndpointRequest(url) {
  return AUTH_ENDPOINTS.some((endpoint) => String(url || '').includes(endpoint));
}

export function isCancelledError(error) {
  const code = error?.code || error?.name;
  return code === 'ERR_CANCELED' || code === 'CanceledError' || code === 'ABORT_ERR';
}

/**
 * Decides whether a failed request may be replayed.
 * Mutations, cancelled requests, auth endpoints and overloaded backends are never retried.
 */
export function shouldRetryRequest(config, error, apiConfig = API_CONFIG) {
  if (!config || isCancelledError(error)) return false;
  if (isAuthEndpointRequest(config.url)) return false;

  const method = String(config.method || 'get').toLowerCase();
  // A mutation may only be replayed when the caller explicitly opts in with a proven contract.
  if (!isSafeMethod(method) && config.idempotentRetry !== true) return false;

  const limit = Number.isFinite(config.retry) ? config.retry : apiConfig.RETRY_COUNT;
  if (!(limit > 0)) return false;

  const attempts = config.__retryCount || 0;
  if (attempts >= limit) return false;

  const status = error?.response?.status ?? null;
  if (status === null) return true; // network failure / timeout: the server may not have run
  if (NON_RETRYABLE_STATUSES.includes(status)) return false;
  if (status >= HTTP_STATUS.CLIENT_ERROR_MIN && status < HTTP_STATUS.CLIENT_ERROR_MAX) return false;
  return status >= 500;
}

export { normalizeApiBaseUrl };

export function normalizeApiRequestTimeout(value, fallback = API_CONFIG.DEFAULT_TIMEOUT) {
  const parsed = Number.parseInt(value, 10);
  const fallbackValue = Number.parseInt(fallback, 10);
  const normalizedFallback = Number.isFinite(fallbackValue) && fallbackValue >= 1000
    ? fallbackValue
    : 15000;

  if (!Number.isFinite(parsed)) {
    return normalizedFallback;
  }

  return Math.min(120000, Math.max(1000, parsed));
}

const resolveInitialBaseUrl = () => {
  try {
    return normalizeApiBaseUrl(localStorage.getItem('api-base-url'), API_CONFIG.DEFAULT_BASE_URL || API_CONFIG.BASE_URL);
  } catch (_error) {
    return normalizeApiBaseUrl(API_CONFIG.DEFAULT_BASE_URL || API_CONFIG.BASE_URL);
  }
};

const resolveInitialTimeout = () => {
  try {
    return normalizeApiRequestTimeout(localStorage.getItem(API_REQUEST_TIMEOUT_KEY), API_CONFIG.DEFAULT_TIMEOUT);
  } catch (_error) {
    return API_CONFIG.DEFAULT_TIMEOUT;
  }
};

const resolveRuntimeBaseUrl = () => {
  // The live client configuration is authoritative; storage only seeds it at startup. Reading
  // storage per request would silently undo an explicit setApiClientBaseUrl() (F03).
  if (apiClient?.defaults?.baseURL) {
    return normalizeApiBaseUrl(apiClient.defaults.baseURL, API_CONFIG.DEFAULT_BASE_URL);
  }

  try {
    return normalizeApiBaseUrl(localStorage.getItem('api-base-url'), API_CONFIG.BASE_URL || API_CONFIG.DEFAULT_BASE_URL);
  } catch (_error) {
    return normalizeApiBaseUrl(API_CONFIG.BASE_URL || API_CONFIG.DEFAULT_BASE_URL);
  }
};

/**
 * Shared Axios HTTP Client instance with identity-aware interceptors.
 * @type {import('axios').AxiosInstance}
 */
export const apiClient = axios.create({
  baseURL: resolveInitialBaseUrl(),
  timeout: resolveInitialTimeout(),
  retry: API_CONFIG.RETRY_COUNT,
  retryDelay: API_CONFIG.RETRY_DELAY,
});

setApiIdentity(apiClient.defaults.baseURL);
API_CONFIG.BASE_URL = apiClient.defaults.baseURL;

export function setApiClientBaseUrl(nextBaseUrl) {
  const normalized = normalizeApiBaseUrl(nextBaseUrl, API_CONFIG.DEFAULT_BASE_URL || API_CONFIG.BASE_URL);
  apiClient.defaults.baseURL = normalized;
  API_CONFIG.BASE_URL = normalized;
  return setApiIdentity(normalized);
}

export function setApiClientTimeout(nextTimeout) {
  apiClient.defaults.timeout = normalizeApiRequestTimeout(nextTimeout, API_CONFIG.DEFAULT_TIMEOUT);
}

export function getApiIdentityForRequest() {
  return getApiIdentity();
}

/**
 * Resolves the API identity a request will actually target. A relative URL is bound to the
 * configured base; an absolute or protocol-relative URL is bound to its own origin, so it is never
 * silently treated as the configured API.
 */
export function resolveRequestIdentity(config, fallbackBase = '') {
  const target = resolveRequestTarget(config, fallbackBase);
  if (target.invalid) return null;

  const configured = getApiIdentity();
  if (!ABSOLUTE_URL_PATTERN.test(String(config?.url || '')) && configured) {
    return configured;
  }

  try {
    return normalizeApiBaseUrl(target.origin);
  } catch (_error) {
    return null;
  }
}

/** True when the request targets the configured API origin, staying inside its base path. */
export function isWithinConfiguredApi(config, configuredIdentity = getApiIdentity()) {
  return resolveRequestScope(config, '', configuredIdentity).inScope;
}

/**
 * The same origin is not enough: a different base path is a different identity, and a path that
 * merely starts with the base path (`/api-a-evil` vs `/api-a`) is not the same API.
 */
export function isSameApiBasePath(targetPath, configuredBasePath) {
  return isPathInsideBase(targetPath, normalizeBasePath(configuredBasePath));
}


function readLanguage() {
  if (i18n && i18n.global) {
    if (i18n.mode === 'legacy') {
      return i18n.global.locale || 'en';
    }
    return i18n.global.locale.value || 'en';
  }

  try {
    return localStorage.getItem('user-locale') || 'en';
  } catch (_error) {
    return 'en';
  }
}

function resolveAuthStore() {
  try {
    return getAuthStore();
  } catch (error) {
    console.warn('[API] Error loading auth store in request interceptor:', error);
    return null;
  }
}

/**
 * Request interceptor: resolves the real target with the transport's own URL rules, refuses to
 * send a credential outside the configured API identity, and snapshots the session context that
 * must still be live for the response to be applied (F03, review OF-01/OF-02).
 */
export async function applyRequestInterceptors(config) {
  const url = String(config?.url || '');
  const isAbsolute = ABSOLUTE_URL_PATTERN.test(url);

  if (config && url && !isAbsolute) {
    config.baseURL = resolveRuntimeBaseUrl();
    API_CONFIG.BASE_URL = config.baseURL;
  }

  const configuredIdentity = getApiIdentity();
  const scope = resolveRequestScope(config, '', configuredIdentity);
  const target = scope.target;
  const authStore = resolveAuthStore();

  // Replay belongs to the configured origin AND base path, not just its origin.
  config.__apiIdentity = scope.inScope ? configuredIdentity : target.origin;
  config.__requestTarget = target;
  config.__sessionContext = captureContext();
  config.__sessionGeneration = config.__sessionContext.epoch;
  config.__identityMatches = scope.inScope;
  config.__scopeReason = scope.reason;
  config.__isAuthRequest = Boolean(url) && (
    matchesEndpointPath(url, API_ENDPOINTS.LOGIN, config.baseURL)
    || matchesEndpointPath(url, API_ENDPOINTS.REGISTER, config.baseURL)
    || matchesEndpointPath(url, API_ENDPOINTS.REFRESH_TOKEN, config.baseURL)
    || matchesEndpointPath(url, API_ENDPOINTS.LOGOUT, config.baseURL)
  );
  config.__isPublicRequest = Boolean(url) && (
    matchesEndpointPath(url, API_ENDPOINTS.PUBLIC_HEALTH, config.baseURL)
    || matchesEndpointPath(url, API_ENDPOINTS.PUBLIC_VERSION, config.baseURL)
    || matchesEndpointPath(url, API_ENDPOINTS.PUBLIC_LANGUAGE, config.baseURL)
  );

  const isAuthRequest = config.__isAuthRequest;
  const isPublicRequest = config.__isPublicRequest;

  // A caller may not smuggle credentials past the boundary by passing its own snapshot: the
  // snapshot is only usable while it belongs to the identity that is configured right now.
  const snapshotAuth = config.snapshotAuth || null;
  const snapshotBelongsToIdentity = !snapshotAuth
    || !snapshotAuth.identity
    || snapshotAuth.identity === configuredIdentity;

  // Simple, auditable policy: the authenticated client only ever talks to the configured API.
  // Anything else is refused before a single byte leaves the page, so a protocol-relative or
  // absolute URL can never receive a bearer of this session (review OF-02).
  if (target.invalid) {
    stripAuthorization(config.headers);
    return Promise.reject(createTransportError(
      TRANSPORT_ERROR_CODES.CROSS_ORIGIN_REQUEST_REFUSED,
      'The request URL could not be resolved',
      { config, isAuthBlocked: false }
    ));
  }

  // Out of scope: the bearer never leaves. An auth or public endpoint is refused outright, because
  // silently turning a sign-in into an unauthenticated call would hide a misconfiguration; any
  // other path is still performed, credential-free, so a caller that legitimately uses its own
  // host is not broken by a security guard (review OF-02).
  if (!scope.inScope || !snapshotBelongsToIdentity) {
    stripAuthorization(config.headers);

    if (isAuthRequest || isPublicRequest) {
      return Promise.reject(createTransportError(
        TRANSPORT_ERROR_CODES.CROSS_ORIGIN_REQUEST_REFUSED,
        'This client only sends credentials to the configured API endpoint',
        { config, requestedTarget: target.url, configuredIdentity, reason: scope.reason }
      ));
    }

    config.__crossOriginRefused = true;
    config.__scopeReason = scope.reason;
    return config;
  }

  if (config.headers) {
    config.headers['Accept-Language'] = readLanguage();
  }

  if (authStore && typeof authStore.syncClock === 'function') {
    // Expiry must be evaluated at request time; a cached Date.now read goes stale (F04).
    authStore.syncClock();
  }

  // Block non-auth requests only when the session of the *current* API was invalidated. After a
  // logout or an API switch there is nothing to protect, and protected pages run their own reset.
  if (authStore?.requiresReauth && authStore.reauthReason === 'invalid-session' && !isAuthRequest && !isPublicRequest) {
    return Promise.reject(createTransportError(
      TRANSPORT_ERROR_CODES.REAUTH_REQUIRED,
      'Auth requires re-login',
      { isAuthBlocked: true, config }
    ));
  }

  if (!config.headers) {
    return config;
  }

  // Credentials only travel to the API identity that issued them (F03).
  const sessionBelongsToIdentity = !authStore?.apiIdentity || authStore.apiIdentity === configuredIdentity;

  if (!sessionBelongsToIdentity) {
    stripAuthorization(config.headers);
    return config;
  }

  const isRefreshRequest = matchesEndpointPath(url, API_ENDPOINTS.REFRESH_TOKEN, config.baseURL);
  const isCredentialFreeRequest = matchesEndpointPath(url, API_ENDPOINTS.LOGIN, config.baseURL)
    || matchesEndpointPath(url, API_ENDPOINTS.REGISTER, config.baseURL);

  // Login/register never carry a bearer token, and public endpoints stay unauthenticated.
  if (isCredentialFreeRequest || isPublicRequest) {
    stripAuthorization(config.headers);
    return config;
  }

  // A logout request must use the token snapshot taken before the local session was cleared.
  const snapshotToken = snapshotAuth?.token;
  const currentToken = snapshotToken || authStore?.token;

  if (!currentToken) {
    return config;
  }

  const shouldRefresh = !config.skipAuthRefresh
    && !snapshotToken
    && !isRefreshRequest
    && authStore
    && authStore.shouldRefreshToken;

  if (shouldRefresh) {
    // Every caller awaits the same refresh. There is no path that returns the stale token while a
    // refresh is running, and a temporary failure never falls through to a request with an
    // expired bearer (review OF-03).
    let newToken;

    try {
      newToken = await authStore.refreshAccessTokenOrThrow(config.__sessionContext);
    } catch (error) {
      const code = error?.code === TRANSPORT_ERROR_CODES.STALE_SESSION
        ? TRANSPORT_ERROR_CODES.STALE_SESSION
        : (error?.code === TRANSPORT_ERROR_CODES.REAUTH_REQUIRED
          ? TRANSPORT_ERROR_CODES.REAUTH_REQUIRED
          : TRANSPORT_ERROR_CODES.AUTH_TEMPORARILY_UNAVAILABLE);

      return Promise.reject(createTransportError(
        code,
        error?.message || 'The session could not be refreshed',
        { isAuthBlocked: code === TRANSPORT_ERROR_CODES.REAUTH_REQUIRED, config, cause: error }
      ));
    }

    if (!isCurrentContext(config.__sessionContext)) {
      return Promise.reject(createTransportError(
        TRANSPORT_ERROR_CODES.STALE_SESSION,
        'Session changed while the request was in flight',
        { config }
      ));
    }

    config.headers['Authorization'] = `Bearer ${newToken}`;
    return config;
  }

  config.headers['Authorization'] = `Bearer ${currentToken}`;
  return config;
}

apiClient.interceptors.request.use(applyRequestInterceptors, (error) => Promise.reject(error));

/**
 * Success boundary. A protected response that arrives after the session context changed is dropped
 * here, so no store can refill its cache with data that belongs to a previous user or API server
 * (review OF-01). Public and auth endpoints are exempt: the store decides what a login response
 * means, and the health/version endpoints must keep working without a session.
 */
export function applyResponseSuccessInterceptor(response) {
  const config = response?.config;

  if (!config || !config.__sessionContext) return response;
  if (config.__isAuthRequest || config.__isPublicRequest) return response;
  if (!isCurrentContext(config.__sessionContext)) {
    return Promise.reject(createTransportError(
      TRANSPORT_ERROR_CODES.STALE_SESSION,
      'Discarded a response that belongs to a session that is no longer current',
      { config }
    ));
  }

  return response;
}

apiClient.interceptors.response.use(applyResponseSuccessInterceptor, undefined);

/** A retry or refresh-replay must never be re-pointed at a different server or session. */
function isStillBoundToRequestContext(config) {
  if (!config) return false;
  if (config.__sessionContext && !isCurrentContext(config.__sessionContext)) return false;
  if (config.__apiIdentity && getApiIdentity() !== config.__apiIdentity) return false;
  return true;
}

/**
 * Response interceptor: refresh-and-replay only for safe methods, and apply the retry policy
 * that keeps mutations and overloaded backends untouched (F02).
 */
export async function applyResponseErrorInterceptor(err) {
  const config = err?.config;

  if (err?.code === TRANSPORT_ERROR_CODES.STALE_SESSION) {
    return Promise.reject(err);
  }

  if (err?.response?.status === 401) {
    const isRefreshEndpoint = config?.url && matchesEndpointPath(config.url, API_ENDPOINTS.REFRESH_TOKEN, config.baseURL);
    const isLogoutEndpoint = config?.url && matchesEndpointPath(config.url, API_ENDPOINTS.LOGOUT, config.baseURL);
    const method = String(config?.method || 'get').toLowerCase();
    // A mutation rejected with 401 may already have run on the server: no replay (F02/F03).
    const replayable = !isRefreshEndpoint && !isLogoutEndpoint && isSafeMethod(method) && !config?._retryWithRefresh;

    if (replayable && isStillBoundToRequestContext(config)) {
      const authStore = resolveAuthStore();

      if (authStore && authStore.refreshToken && !authStore.isRefreshTokenExpired) {
        // The bearer this request carried is what the store compares against the stored session,
        // so a rotation that already happened costs no refresh call.
        const accessTokenUsed = String(config.headers?.Authorization || config.headers?.authorization || '').replace(/^Bearer\s+/i, '') || null;

        try {
          const newToken = await authStore.refreshAccessTokenOrThrow(config.__sessionContext, { accessTokenUsed });

          if (newToken && isStillBoundToRequestContext(config)) {
            config._retryWithRefresh = true;
            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${newToken}`;
            return apiClient(config);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(err);
  }

  // A response of a superseded session must not be retried against the API that is configured now:
  // replaying it would send the old request to a new server (F03).
  if (!isStillBoundToRequestContext(config)) {
    return Promise.reject(createTransportError(
      TRANSPORT_ERROR_CODES.STALE_SESSION,
      'Discarded a failed request that belongs to a session that is no longer current',
      { config, cause: err }
    ));
  }

  if (!shouldRetryRequest(config, err)) {
    return Promise.reject(err);
  }

  config.__retryCount = (config.__retryCount || 0) + 1;

  await new Promise((resolve) => {
    setTimeout(resolve, config.retryDelay || API_CONFIG.RETRY_DELAY);
  });

  if (!isStillBoundToRequestContext(config)) {
    return Promise.reject(createTransportError(
      TRANSPORT_ERROR_CODES.STALE_SESSION,
      'Aborted a retry because the session context changed while backing off',
      { config }
    ));
  }

  return apiClient(config);
}

apiClient.interceptors.response.use(undefined, applyResponseErrorInterceptor);

export {
  getApiIdentity,
  SESSION_IDENTITY_STORAGE,
  captureContext,
  isCurrentContext,
  setApiIdentity
};
export { getSessionGeneration, getSessionId, setSessionId } from './apiIdentity.js';
