const { defineStore } = Pinia;
import { DEFAULT_ADMIN_PAGE_SIZE, resolveAdminPageSize } from '../constants/pagination.js';
import { API_CONFIG } from '../api/endpoints.js';
import { normalizeApiBaseUrl, normalizeApiRequestTimeout, setApiClientBaseUrl, setApiClientTimeout } from '../api/httpClient.js';

const THEME_KEY = 'theme';
const MOCK_API_KEY = 'mock-api';
const API_BASE_URL_KEY = 'api-base-url';
const ADMIN_PAGE_SIZE_KEY = 'admin-page-size';
const API_REQUEST_TIMEOUT_KEY = 'api-request-timeout-ms';
const ADMIN_SEARCH_DEBOUNCE_KEY = 'admin-search-debounce-ms';
const TIME_FORMAT_KEY = 'time-format';

const DEFAULT_ADMIN_SEARCH_DEBOUNCE = 300;

const normalizeAdminSearchDebounce = (value, fallback = DEFAULT_ADMIN_SEARCH_DEBOUNCE) => {
  const parsed = Number.parseInt(value, 10);
  const fallbackValue = Number.parseInt(fallback, 10);
  const normalizedFallback = Number.isFinite(fallbackValue) ? fallbackValue : DEFAULT_ADMIN_SEARCH_DEBOUNCE;

  if (!Number.isFinite(parsed)) {
    return normalizedFallback;
  }

  return Math.min(1500, Math.max(0, parsed));
};

const normalizeTimeFormat = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['locale', '12h', '24h'].includes(normalized) ? normalized : 'locale';
};

const readStoredBooleanPreference = (key, fallback = false) => {
  const stored = localStorage.getItem(key);

  if (stored === 'true') {
    return true;
  }

  if (stored === 'false') {
    return false;
  }

  return fallback;
};

const readStoredMockApi = () => readStoredBooleanPreference(MOCK_API_KEY, true);

const readStoredAdminPageSize = () => {
  return resolveAdminPageSize(localStorage.getItem(ADMIN_PAGE_SIZE_KEY), DEFAULT_ADMIN_PAGE_SIZE);
};

const readStoredApiBaseUrl = () => {
  try {
    return normalizeApiBaseUrl(localStorage.getItem(API_BASE_URL_KEY));
  } catch (_error) {
    return normalizeApiBaseUrl(API_CONFIG.DEFAULT_BASE_URL || API_CONFIG.BASE_URL);
  }
};

const readStoredApiRequestTimeout = () => normalizeApiRequestTimeout(
  localStorage.getItem(API_REQUEST_TIMEOUT_KEY),
  API_CONFIG.DEFAULT_TIMEOUT
);

const readStoredAdminSearchDebounce = () => normalizeAdminSearchDebounce(
  localStorage.getItem(ADMIN_SEARCH_DEBOUNCE_KEY),
  DEFAULT_ADMIN_SEARCH_DEBOUNCE
);

const readStoredTimeFormat = () => normalizeTimeFormat(localStorage.getItem(TIME_FORMAT_KEY));

export const useMainStore = defineStore('main', {
  state: () => ({
    darkMode: localStorage.getItem(THEME_KEY) === 'dark',
    mockApi: readStoredMockApi(),
    apiBaseUrl: readStoredApiBaseUrl(),
    adminPageSize: readStoredAdminPageSize(),
    apiRequestTimeoutMs: readStoredApiRequestTimeout(),
    adminSearchDebounceMs: readStoredAdminSearchDebounce(),
    timeFormat: readStoredTimeFormat(),
    settingsLastUpdated: ''
  }),
  actions: {
    applyTheme(isDarkMode) {
      this.darkMode = Boolean(isDarkMode);
      document.documentElement.classList.toggle('dark', this.darkMode);
      document.body.classList.toggle('dark', this.darkMode);
      localStorage.setItem(THEME_KEY, this.darkMode ? 'dark' : 'light');
    },

    initTheme() {
      const stored = localStorage.getItem(THEME_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(stored === 'dark' || (!stored && prefersDark));
    },

    initPreferences() {
      this.initTheme();
      this.mockApi = readStoredMockApi();
      this.apiBaseUrl = readStoredApiBaseUrl();
      this.adminPageSize = readStoredAdminPageSize();
      this.apiRequestTimeoutMs = readStoredApiRequestTimeout();
      this.adminSearchDebounceMs = readStoredAdminSearchDebounce();
      this.timeFormat = readStoredTimeFormat();
      localStorage.removeItem('remember-settings-tab');
      localStorage.removeItem('settings-active-tab');
      setApiClientBaseUrl(this.apiBaseUrl);
      setApiClientTimeout(this.apiRequestTimeoutMs);
    },

    toggleDarkMode() {
      this.applyTheme(!this.darkMode);
    },

    setMockApi(value) {
      this.mockApi = Boolean(value);
      localStorage.setItem(MOCK_API_KEY, String(this.mockApi));
      this.settingsLastUpdated = new Date().toISOString();
    },

    setApiBaseUrl(value) {
      const nextValue = normalizeApiBaseUrl(value);
      this.apiBaseUrl = nextValue;
      localStorage.setItem(API_BASE_URL_KEY, nextValue);
      setApiClientBaseUrl(nextValue);
      this.settingsLastUpdated = new Date().toISOString();
    },

    resetApiBaseUrl() {
      const fallback = normalizeApiBaseUrl(API_CONFIG.DEFAULT_BASE_URL || API_CONFIG.BASE_URL);
      this.apiBaseUrl = fallback;
      localStorage.setItem(API_BASE_URL_KEY, fallback);
      setApiClientBaseUrl(fallback);
      this.settingsLastUpdated = new Date().toISOString();
    },

    setAdminPageSize(value) {
      const nextValue = resolveAdminPageSize(value, DEFAULT_ADMIN_PAGE_SIZE);
      this.adminPageSize = nextValue;
      localStorage.setItem(ADMIN_PAGE_SIZE_KEY, String(nextValue));
      this.settingsLastUpdated = new Date().toISOString();
    },

    setApiRequestTimeout(value) {
      const nextValue = normalizeApiRequestTimeout(value, API_CONFIG.DEFAULT_TIMEOUT);
      this.apiRequestTimeoutMs = nextValue;
      localStorage.setItem(API_REQUEST_TIMEOUT_KEY, String(nextValue));
      setApiClientTimeout(nextValue);
      this.settingsLastUpdated = new Date().toISOString();
    },

    setAdminSearchDebounce(value) {
      const nextValue = normalizeAdminSearchDebounce(value, DEFAULT_ADMIN_SEARCH_DEBOUNCE);
      this.adminSearchDebounceMs = nextValue;
      localStorage.setItem(ADMIN_SEARCH_DEBOUNCE_KEY, String(nextValue));
      this.settingsLastUpdated = new Date().toISOString();
    },

    setTimeFormat(value) {
      const nextValue = normalizeTimeFormat(value);
      this.timeFormat = nextValue;
      localStorage.setItem(TIME_FORMAT_KEY, nextValue);
      this.settingsLastUpdated = new Date().toISOString();
    }
  }
});
