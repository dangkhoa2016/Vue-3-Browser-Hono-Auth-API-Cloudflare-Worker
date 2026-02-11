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
  LOGIN: '/api/auth/login',
  REFRESH_TOKEN: '/api/auth/refresh_token',
  REGISTER: '/api/user/register',
  PROFILE: '/api/user/profile',
  API_INFO: '/api',
  USERS: '/api/admin/users',
};

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
  LOGIN: new RegExp(`${API_ENDPOINTS.LOGIN.replace(/\//g, '\\/')}($|\\?)`),
  REFRESH_TOKEN: new RegExp(`${API_ENDPOINTS.REFRESH_TOKEN.replace(/\//g, '\\/')}($|\\?)`),
  REGISTER: new RegExp(`${API_ENDPOINTS.REGISTER.replace(/\//g, '\\/')}($|\\?)`),
  PROFILE: new RegExp(`${API_ENDPOINTS.PROFILE.replace(/\//g, '\\/')}($|\\?)`),
  API_INFO: new RegExp(`${API_ENDPOINTS.API_INFO.replace(/\//g, '\\/')}($|\\?)`),
  USERS: new RegExp(`${API_ENDPOINTS.USERS.replace(/\//g, '\\/')}($|\\?)`),
};

// Data Paths
const DATA_PATHS = {
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
  API_INFO: '/assets/data/profile/api.json',
  USERS: '/assets/data/users/succeed/super-admin+users.json',
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

  // Token refresh logic
  // Skip token refresh for the refresh endpoint itself
  if (!config.url.includes(API_ENDPOINTS.REFRESH_TOKEN)) {
    try {
      // Dynamically import authStore to avoid circular dependency
      const { useAuthStore } = await import('./stores/authStore.js');
      const authStore = useAuthStore();

      // Check if we need to refresh the token
      if (authStore.shouldRefreshToken) {
        console.log('[API] Access token expired, refreshing...');
        const newToken = await authStore.refreshAccessToken();
        
        if (newToken) {
          // Update Authorization header with new token
          config.headers['Authorization'] = `Bearer ${newToken}`;
        } else {
          // If refresh failed, token will be null and user will be logged out
          console.warn('[API] Token refresh failed, request will proceed without auth');
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
          // Dynamically import authStore to avoid circular dependency
          const { useAuthStore } = await import('./stores/authStore.js');
          const authStore = useAuthStore();

          // Check if we have a refresh token
          if (authStore.refreshToken && !authStore.isRefreshTokenExpired) {
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
          return [200, data];
        } catch (error) {
          console.error('[Mock API] Profile handler error:', error);
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

      // Users
      mock.onGet(MOCK_PATTERNS.USERS).reply(async (config) => {
        try {
          const data = await loadJson(DATA_PATHS.USERS);
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
    }
  } else {
    if (mock) {
      console.log('Disabling Mock API');
      mock.restore();
      mock = null;
    }
  }
};
