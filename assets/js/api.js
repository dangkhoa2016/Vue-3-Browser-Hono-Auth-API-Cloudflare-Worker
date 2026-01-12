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
  REGISTER: '/api/auth/register',
  PROFILE: '/api/user/profile',
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
  REGISTER: new RegExp(`${API_ENDPOINTS.REGISTER.replace(/\//g, '\\/')}($|\\?)`),
  PROFILE: new RegExp(`${API_ENDPOINTS.PROFILE.replace(/\//g, '\\/')}($|\\?)`),
};

// Data Paths
const DATA_PATHS = {
  LOGIN_VALIDATE_EMAIL_EMPTY: '/assets/data/login/fail/validate-3.json',
  LOGIN_VALIDATE_EMAIL_FORMAT: '/assets/data/login/fail/validate-1.json',
  LOGIN_VALIDATE_PASSWORD_EMPTY: '/assets/data/login/fail/validate-2.json',
  LOGIN_SUCCESS: '/assets/data/login/succeed/response.json',
  REGISTER_VALIDATE_EMAIL_EMPTY: '/assets/data/register/fail/validate-1.json',
  REGISTER_VALIDATE_EMAIL_FORMAT: '/assets/data/register/fail/validate-2.json',
  REGISTER_VALIDATE_PASSWORD_EMPTY: '/assets/data/register/fail/validate-3.json',
  REGISTER_VALIDATE_PASSWORD_SHORT: '/assets/data/register/fail/validate-4.json',
  REGISTER_VALIDATE_FULLNAME_EMPTY: '/assets/data/register/fail/validate-5.json',
  REGISTER_SUCCESS_ACTIVE: '/assets/data/register/succeed/response2.json',
  REGISTER_SUCCESS_INACTIVE: '/assets/data/register/succeed/response1.json',
  LOGIN_INVALID_CREDENTIALS: '/assets/data/login/fail/invalid-email-or-password.json',
  PROFILE: '/assets/data/profile/succeed.json',
};

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  retry: API_CONFIG.RETRY_COUNT,
  retryDelay: API_CONFIG.RETRY_DELAY,
});

apiClient.interceptors.response.use(undefined, async (err) => {
  const config = err.config;

  console.warn('[API] Request failed:', err.message || err);
  
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

  // Don't retry for any 4xx errors (client errors) as they won't succeed on retry
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
  const res = await fetch(path);
  if (!res.ok) {
    const t = i18n.global.t;
    throw new Error(t('message.errors.failed_to_load', { item: path, message: res.statusText || t('message.errors.unknown_error') }));
  }
  return await res.json();
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
            return [200, data];
          }

          // Invalid credentials
          const data = await loadJson(DATA_PATHS.LOGIN_INVALID_CREDENTIALS);
          return [401, data];
        } catch (error) {
          return [500, { success: false, error: 'Internal server error' }];
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
          return [500, { success: false, error: 'Internal server error' }];
        }
      });

      // Profile
      mock.onGet(MOCK_PATTERNS.PROFILE).reply(async (config) => {
        const data = await loadJson(DATA_PATHS.PROFILE);
        return [200, data];
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
