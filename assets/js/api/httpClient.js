const { axios } = window;
import { i18n } from '../i18n.js';
import { getAuthStore } from '../appServices.js';
import { API_ENDPOINTS, API_CONFIG, HTTP_STATUS } from './endpoints.js';

const API_REQUEST_TIMEOUT_KEY = 'api-request-timeout-ms';

export function normalizeApiBaseUrl(value) {
  const rawValue = String(value || '').trim();
  const fallback = String(API_CONFIG.DEFAULT_BASE_URL || API_CONFIG.BASE_URL || '').trim();
  const candidate = rawValue || fallback;
  const parsedUrl = new URL(candidate);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Invalid API endpoint protocol');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Invalid API endpoint credentials');
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error('Invalid API endpoint suffix');
  }

  if (parsedUrl.pathname && parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') {
    throw new Error('Invalid API endpoint path');
  }

  return parsedUrl.origin;
}

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
    return normalizeApiBaseUrl(localStorage.getItem('api-base-url'));
  } catch (_error) {
    return normalizeApiBaseUrl(API_CONFIG.DEFAULT_BASE_URL || API_CONFIG.BASE_URL);
  }
};

const resolveInitialTimeout = () => normalizeApiRequestTimeout(
  localStorage.getItem(API_REQUEST_TIMEOUT_KEY),
  API_CONFIG.DEFAULT_TIMEOUT
);

const resolveRuntimeBaseUrl = () => {
  try {
    return normalizeApiBaseUrl(localStorage.getItem('api-base-url'));
  } catch (_error) {
    return normalizeApiBaseUrl(API_CONFIG.BASE_URL || API_CONFIG.DEFAULT_BASE_URL);
  }
};

/**
 * Shared Axios HTTP Client instance with retry and interceptor logic.
 * @type {import('axios').AxiosInstance}
 */
/**
 * Shared Axios HTTP Client instance with retry and interceptor logic.
 * @type {import('axios').AxiosInstance}
 */
export const apiClient = axios.create({
  baseURL: resolveInitialBaseUrl(),
  timeout: resolveInitialTimeout(),
  retry: API_CONFIG.RETRY_COUNT,
  retryDelay: API_CONFIG.RETRY_DELAY,
});

API_CONFIG.BASE_URL = apiClient.defaults.baseURL;

export function setApiClientBaseUrl(nextBaseUrl) {
  const normalized = normalizeApiBaseUrl(nextBaseUrl);
  apiClient.defaults.baseURL = normalized;
  API_CONFIG.BASE_URL = normalized;
}

export function setApiClientTimeout(nextTimeout) {
  apiClient.defaults.timeout = normalizeApiRequestTimeout(nextTimeout, API_CONFIG.DEFAULT_TIMEOUT);
}

// Add request interceptor to inject current language and handle token refresh
apiClient.interceptors.request.use(async (config) => {
  // Re-sync baseURL on each request so runtime endpoint changes apply immediately.
  if (config && config.url && !/^https?:\/\//i.test(config.url)) {
    config.baseURL = resolveRuntimeBaseUrl();
    apiClient.defaults.baseURL = config.baseURL;
    API_CONFIG.BASE_URL = config.baseURL;
  }

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

  // Get auth store via appServices (avoids window.authStore global)
  let authStore = null;
  try {
    authStore = getAuthStore();
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
          // Get auth store via appServices
          const authStore = getAuthStore();

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

