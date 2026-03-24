import { computed, ref, watch } from 'vue';
import { apiClient, API_CONFIG, API_ENDPOINTS } from '/assets/js/api.js';
import { normalizeApiBaseUrl, normalizeApiRequestTimeout } from '/assets/js/api/httpClient.js';
import { DEFAULT_ADMIN_PAGE_SIZE, resolveAdminPageSize, stringifyAdminPageSize } from '/assets/js/constants/pagination.js';
import { SUPPORTED_LANGUAGES, loadLanguageAsync } from '/assets/js/i18n.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { createAuthGateCallbacks } from '/vue/composables/createAuthGateCallbacks.js';
import { useAuthStateChangeWatcher } from '/vue/composables/useAuthStateChangeWatcher.js';
import { useEnsureAuthenticatedLifecycle } from '/vue/composables/useEnsureAuthenticatedLifecycle.js';
import { getTimeFormatLabel, useDateTimeFormatter } from '/vue/composables/useDateTimeFormatter.js';
import { useDeepLinkedTabs } from '/vue/composables/useDeepLinkedTabs.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { useMockApiChangeWatcher } from '/vue/composables/useMockApiChangeWatcher.js';

const normalizeText = (value) => String(value || '').trim();

const parseAdminPageSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
};

const isUnauthorizedError = (error) => {
  const status = error?.response?.status || error?.status;
  return status === 401 || status === 403 || error?.code === 'REAUTH_REQUIRED';
};

const getErrorMessage = (error, fallback) => {
  const detailErrors = Array.isArray(error?.response?.data?.errors) ? error.response.data.errors : [];

  if (detailErrors.length > 0) {
    const combined = detailErrors
      .map((entry) => {
        const field = normalizeText(entry?.field);
        const message = normalizeText(entry?.message);

        if (!message) {
          return '';
        }

        return field ? `${field}: ${message}` : message;
      })
      .filter(Boolean)
      .join(' | ');

    if (combined) {
      return combined;
    }
  }

  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
};

const formatDisplayLabel = (key) => String(key || '')
  .replace(/_/g, ' ')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^./, (character) => character.toUpperCase());

export function useSettingsPage() {
  const { storeToRefs } = Pinia;
  const { locale, tf } = useI18nFallback({ useScope: 'global' });

  const authStore = useAuthStore();
  const modalStore = useModalStore();
  const toastStore = useToastStore();
  const mainStore = useMainStore();
  const { settingsLastUpdated } = storeToRefs(mainStore);
  const { formatDateTime } = useDateTimeFormatter();

  const heroSectionClass = 'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/50 to-cyan-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
  const panelClass = 'rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]';
  const cardClass = 'rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-4';
  const inputClass = 'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30';
  const pillClass = 'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase';

  const supportedLanguages = ref([...SUPPORTED_LANGUAGES]);
  const isSavingSystemPreferences = ref(false);

  const systemPreferencesForm = ref({
    apiBaseUrl: String(mainStore.apiBaseUrl || API_CONFIG.DEFAULT_BASE_URL || ''),
    adminPageSize: stringifyAdminPageSize(mainStore.adminPageSize),
    apiRequestTimeoutMs: String(mainStore.apiRequestTimeoutMs || API_CONFIG.DEFAULT_TIMEOUT),
    adminSearchDebounceMs: String(mainStore.adminSearchDebounceMs || 300),
    timeFormat: String(mainStore.timeFormat || 'locale')
  });

  const role = computed(() => String(authStore.user?.role || '').toLowerCase());
  const isAuthenticated = computed(() => !!authStore.isAuthenticated);
  const isAdmin = computed(() => role?.value === 'admin' || role?.value === 'super_admin');
  const isSuperAdmin = computed(() => role?.value === 'super_admin');
  const isPublicSettingsMode = computed(() => !isAuthenticated.value);
  const showAccessDenied = computed(() => isAuthenticated.value && !isAdmin.value);
  const currentTheme = computed(() => mainStore.darkMode ? 'dark' : 'light');
  const currentLanguage = computed(() => String(locale?.value || 'en'));
  const currentApiMode = computed(() => mainStore.mockApi ? 'mock' : 'real');
  const currentApiBaseUrl = computed(() => String(mainStore.apiBaseUrl || API_CONFIG.DEFAULT_BASE_URL || ''));
  const defaultAdminPageSize = computed(() => resolveAdminPageSize(mainStore.adminPageSize));
  const currentApiRequestTimeout = computed(() => normalizeApiRequestTimeout(mainStore.apiRequestTimeoutMs, API_CONFIG.DEFAULT_TIMEOUT));
  const currentAdminSearchDebounce = computed(() => Math.max(0, Number.parseInt(mainStore.adminSearchDebounceMs, 10) || 300));
  const currentTimeFormat = computed(() => String(mainStore.timeFormat || 'locale'));
  const currentTimeFormatLabel = computed(() => getTimeFormatLabel(currentTimeFormat.value));

  const lastSynced = computed(() => settingsLastUpdated?.value || '');

  const availableTabs = computed(() => {
    if (isPublicSettingsMode.value) {
      return [
        {
          key: 'system',
          label: tf('message.settings.tabs.system', 'System'),
          description: tf('message.settings.public_system_title', 'Connection Setup'),
          icon: 'bi bi-hdd-network'
        }
      ];
    }

    const baseTabs = [
      {
        key: 'workspace',
        label: tf('message.settings.tabs.workspace', 'Workspace'),
        description: tf('message.settings.workspace_title', 'Browser Preferences'),
        icon: 'bi bi-laptop'
      }
    ];

    baseTabs.push({
      key: 'system',
      label: tf('message.settings.tabs.system', 'System'),
      description: tf('message.settings.system_title', 'Application Preferences'),
      icon: 'bi bi-sliders2'
    });

    return baseTabs;
  });

  const {
    activeTab,
    copiedTabKey,
    copyTabLink,
    selectTab
  } = useDeepLinkedTabs({
    routeName: 'Settings',
    tabs: availableTabs,
    initialTab: 'workspace'
  });

  const summaryCards = computed(() => ([
    {
      label: tf('message.settings.summary.role', 'Role'),
      value: isAuthenticated.value
        ? formatDisplayLabel(role?.value || 'unknown')
        : tf('message.profile.guest_user', 'Guest User'),
      icon: 'bi bi-person-badge',
      tone: 'text-amber-600 dark:text-amber-300'
    },
    {
      label: tf('message.settings.summary.language', 'Language'),
      value: String(currentLanguage?.value || 'EN').toUpperCase(),
      icon: 'bi bi-translate',
      tone: 'text-cyan-600 dark:text-cyan-300'
    },
    {
      label: tf('message.settings.summary.theme', 'Theme'),
      value: currentTheme?.value === 'dark'
        ? tf('message.settings.theme_dark', 'Dark')
        : tf('message.settings.theme_light', 'Light'),
      icon: currentTheme?.value === 'dark' ? 'bi bi-moon-stars' : 'bi bi-sun',
      tone: 'text-emerald-600 dark:text-emerald-300'
    },
    {
      label: tf('message.settings.summary.time_format', 'Time format'),
      value: currentTimeFormatLabel.value,
      icon: 'bi bi-clock-history',
      tone: 'text-indigo-600 dark:text-indigo-300'
    }
  ]));

  const serverLanguageLabels = computed(() => (supportedLanguages?.value || []).map((item) => item.label).join(', '));

  const hasSystemPreferenceChanges = computed(() => {
    const currentBaseUrl = normalizeText(currentApiBaseUrl.value);
    const nextBaseUrlInput = normalizeText(systemPreferencesForm.value.apiBaseUrl);

    let hasBaseUrlChange = false;

    try {
      hasBaseUrlChange = normalizeApiBaseUrl(nextBaseUrlInput) !== currentBaseUrl;
    } catch (_error) {
      hasBaseUrlChange = nextBaseUrlInput !== currentBaseUrl;
    }

    if (isPublicSettingsMode.value) {
      return hasBaseUrlChange;
    }

    const nextPageSize = parseAdminPageSize(systemPreferencesForm.value.adminPageSize);
    const nextTimeout = normalizeApiRequestTimeout(systemPreferencesForm.value.apiRequestTimeoutMs, API_CONFIG.DEFAULT_TIMEOUT);
    const nextSearchDebounce = Math.max(0, Number.parseInt(systemPreferencesForm.value.adminSearchDebounceMs, 10) || 0);
    const nextTimeFormat = String(systemPreferencesForm.value.timeFormat || 'locale').trim().toLowerCase();

    return hasBaseUrlChange
      || nextPageSize !== defaultAdminPageSize.value
      || nextTimeout !== currentApiRequestTimeout.value
      || nextSearchDebounce !== currentAdminSearchDebounce.value
      || nextTimeFormat !== currentTimeFormat.value;
  });

  const canSaveSystemPreferences = computed(() => {
    let nextBaseUrl = '';

    try {
      nextBaseUrl = normalizeApiBaseUrl(systemPreferencesForm.value.apiBaseUrl);
    } catch (_error) {
      return false;
    }

    if (isPublicSettingsMode.value) {
      return nextBaseUrl !== normalizeText(currentApiBaseUrl.value);
    }

    const nextPageSize = parseAdminPageSize(systemPreferencesForm.value.adminPageSize);
    const nextTimeout = normalizeApiRequestTimeout(systemPreferencesForm.value.apiRequestTimeoutMs, API_CONFIG.DEFAULT_TIMEOUT);
    const nextSearchDebounce = Math.max(0, Number.parseInt(systemPreferencesForm.value.adminSearchDebounceMs, 10) || 0);
    const nextTimeFormat = String(systemPreferencesForm.value.timeFormat || 'locale').trim().toLowerCase();

    if (!nextBaseUrl || !Number.isFinite(nextPageSize) || nextPageSize < 1 || !Number.isFinite(nextTimeout) || !Number.isFinite(nextSearchDebounce)) {
      return false;
    }

    return nextBaseUrl !== normalizeText(currentApiBaseUrl.value)
      || nextPageSize !== defaultAdminPageSize.value
      || nextTimeout !== currentApiRequestTimeout.value
      || nextSearchDebounce !== currentAdminSearchDebounce.value
      || nextTimeFormat !== currentTimeFormat.value;
  });

  const copyTabLabel = (tabKey) => availableTabs?.value?.find((tab) => tab.key === tabKey)?.label || formatDisplayLabel(tabKey);

  const copyTabShareLink = async (tabKey) => {
    try {
      const copied = await copyTabLink(tabKey);
      if (!copied) {
        return;
      }

      toastStore.success(`${tf('message.settings.copy_link_success', 'Link copied')}: ${copyTabLabel(tabKey)}`);
    } catch (error) {
      console.warn('Copy tab link failed:', error);
      toastStore.error(tf('message.settings.copy_link_failed', 'Failed to copy link'));
    }
  };

  const resetProtectedState = () => {
    isSavingSystemPreferences.value = false;
    systemPreferencesForm.value = {
      apiBaseUrl: String(mainStore.apiBaseUrl || API_CONFIG.DEFAULT_BASE_URL || ''),
      adminPageSize: stringifyAdminPageSize(mainStore.adminPageSize),
      apiRequestTimeoutMs: String(mainStore.apiRequestTimeoutMs || API_CONFIG.DEFAULT_TIMEOUT),
      adminSearchDebounceMs: String(mainStore.adminSearchDebounceMs || 300),
      timeFormat: String(mainStore.timeFormat || 'locale')
    };
  };

  const handleUnauthorized = async (error) => {
    if (!isUnauthorizedError(error)) {
      return false;
    }

    authStore.logout();
    markUnauthenticated();
    openLoginModal();
    return true;
  };

  const refreshSupportedLanguages = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PUBLIC_LANGUAGE);
      const serverCodes = Array.isArray(response?.data?.data?.supported_languages)
        ? response.data.data.supported_languages.map((item) => String(item).toLowerCase())
        : [];

      if (!serverCodes.length) {
        supportedLanguages.value = [...SUPPORTED_LANGUAGES];
        return;
      }

      const mapped = serverCodes.map((code) => {
        const known = SUPPORTED_LANGUAGES.find((item) => item.code === code);
        return known || { code, label: code.toUpperCase() };
      });

      supportedLanguages.value = mapped;
    } catch (_error) {
      supportedLanguages.value = [...SUPPORTED_LANGUAGES];
    }
  };

  const loadSettings = async () => {
    if (!authStore.isAuthenticated || !isAdmin.value) {
      await refreshSupportedLanguages();
      return;
    }

    await Promise.allSettled([
      refreshSupportedLanguages()
    ]);

    systemPreferencesForm.value = {
      apiBaseUrl: String(mainStore.apiBaseUrl || API_CONFIG.DEFAULT_BASE_URL || ''),
      adminPageSize: stringifyAdminPageSize(mainStore.adminPageSize),
      apiRequestTimeoutMs: String(mainStore.apiRequestTimeoutMs || API_CONFIG.DEFAULT_TIMEOUT),
      adminSearchDebounceMs: String(mainStore.adminSearchDebounceMs || 300),
      timeFormat: String(mainStore.timeFormat || 'locale')
    };
  };

  const {
    showLoginRequired,
    openLoginModal,
    ensureAuthenticated,
    handleAuthStateChange,
    markUnauthenticated
  } = useAuthGate({
    authStore,
    modalStore,
    resetProtectedState,
    ...createAuthGateCallbacks({
      onAuthenticated: async () => {
        await loadSettings();
      }
    })
  });

  const setLanguage = async (nextLanguage) => {
    await loadLanguageAsync(nextLanguage);
    toastStore.success(tf('message.settings.language_updated', 'Language updated for this browser session.'));
  };

  const applyThemeLocally = (isDarkMode) => {
    const nextValue = Boolean(isDarkMode);

    mainStore.darkMode = nextValue;

    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', nextValue);
      document.body.classList.toggle('dark', nextValue);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', nextValue ? 'dark' : 'light');
    }

    mainStore.settingsLastUpdated = new Date().toISOString();
  };

  const setTheme = (nextTheme) => {
    const isDarkMode = nextTheme === 'dark';

    if (typeof mainStore.applyTheme === 'function') {
      mainStore.applyTheme(isDarkMode);
    } else {
      applyThemeLocally(isDarkMode);
    }

    toastStore.success(tf('message.settings.theme_updated', 'Theme updated.'));
  };

  const setApiMode = (nextMode) => {
    if (typeof mainStore.setMockApi === 'function') {
      mainStore.setMockApi(nextMode === 'mock');
    } else {
      mainStore.mockApi = nextMode === 'mock';
    }

    toastStore.success(tf('message.settings.api_mode_updated', 'API mode updated.'));
  };

  const setAdminSearchDebounceLocally = (value) => {
    const nextValue = Math.max(0, Number.parseInt(value, 10) || 0);
    mainStore.adminSearchDebounceMs = nextValue;
    localStorage.setItem('admin-search-debounce-ms', String(nextValue));
    mainStore.settingsLastUpdated = new Date().toISOString();
  };

  const setTimeFormatLocally = (value) => {
    const normalized = ['locale', '12h', '24h'].includes(String(value || '').trim().toLowerCase())
      ? String(value).trim().toLowerCase()
      : 'locale';
    mainStore.timeFormat = normalized;
    localStorage.setItem('time-format', normalized);
    mainStore.settingsLastUpdated = new Date().toISOString();
  };

  const saveSystemPreferences = async () => {
    if (isSavingSystemPreferences.value) {
      return;
    }

    if (!hasSystemPreferenceChanges.value) {
      toastStore.info(tf('message.settings.no_changes_to_save', 'No changes to save.'));
      return;
    }

    isSavingSystemPreferences.value = true;

    try {
      const nextBaseUrl = normalizeApiBaseUrl(systemPreferencesForm.value.apiBaseUrl);

      if (isPublicSettingsMode.value) {
        mainStore.setApiBaseUrl(nextBaseUrl);
        systemPreferencesForm.value.apiBaseUrl = String(mainStore.apiBaseUrl || API_CONFIG.DEFAULT_BASE_URL || '');
        toastStore.success(tf('message.settings.public_endpoint_saved', 'API endpoint updated. You can sign in later to access the rest of the settings.'));
        return;
      }

      const nextPageSize = parseAdminPageSize(systemPreferencesForm.value.adminPageSize);
      const nextTimeout = normalizeApiRequestTimeout(systemPreferencesForm.value.apiRequestTimeoutMs, API_CONFIG.DEFAULT_TIMEOUT);
      const nextSearchDebounce = Math.max(0, Number.parseInt(systemPreferencesForm.value.adminSearchDebounceMs, 10) || 0);
      const nextTimeFormat = String(systemPreferencesForm.value.timeFormat || 'locale').trim().toLowerCase();

      if (!Number.isFinite(nextPageSize) || nextPageSize < 1) {
        throw new Error(tf('message.settings.page_size_invalid', 'Page size must be at least 1.'));
      }

      if (!Number.isFinite(nextTimeout) || nextTimeout < 1000) {
        throw new Error(tf('message.settings.request_timeout_invalid', 'Request timeout must be at least 1000 ms.'));
      }

      if (!['locale', '12h', '24h'].includes(nextTimeFormat)) {
        throw new Error(tf('message.settings.time_format_invalid', 'Choose a supported time format.'));
      }

      mainStore.setApiBaseUrl(nextBaseUrl);
      mainStore.setAdminPageSize(nextPageSize);
      mainStore.setApiRequestTimeout(nextTimeout);
      if (typeof mainStore.setAdminSearchDebounce === 'function') {
        mainStore.setAdminSearchDebounce(nextSearchDebounce);
      } else {
        setAdminSearchDebounceLocally(nextSearchDebounce);
      }
      if (typeof mainStore.setTimeFormat === 'function') {
        mainStore.setTimeFormat(nextTimeFormat);
      } else {
        setTimeFormatLocally(nextTimeFormat);
      }

      systemPreferencesForm.value = {
        apiBaseUrl: String(mainStore.apiBaseUrl || API_CONFIG.DEFAULT_BASE_URL || ''),
        adminPageSize: stringifyAdminPageSize(mainStore.adminPageSize),
        apiRequestTimeoutMs: String(mainStore.apiRequestTimeoutMs || API_CONFIG.DEFAULT_TIMEOUT),
        adminSearchDebounceMs: String(mainStore.adminSearchDebounceMs || 300),
        timeFormat: String(mainStore.timeFormat || 'locale')
      };

      toastStore.success(tf('message.settings.system_preferences_saved', 'System preferences updated.'));
    } catch (error) {
      const errorMessage = String(error?.message || '');
      const fallbackMessage = /Invalid API endpoint/i.test(errorMessage)
        ? tf('message.settings.api_endpoint_invalid', 'API endpoint must be a valid HTTP or HTTPS origin.')
        : /timeout/i.test(errorMessage)
          ? tf('message.settings.request_timeout_invalid', 'Request timeout must be at least 1000 ms.')
          : tf('message.settings.system_preferences_save_failed', 'Failed to update system preferences.');
      toastStore.error(getErrorMessage(error, fallbackMessage));
    } finally {
      isSavingSystemPreferences.value = false;
    }
  };

  const resetApiBaseUrl = () => {
    mainStore.resetApiBaseUrl();
    systemPreferencesForm.value.apiBaseUrl = String(mainStore.apiBaseUrl || API_CONFIG.DEFAULT_BASE_URL || '');
    toastStore.success(tf('message.settings.api_endpoint_reset', 'API endpoint reset to default.'));
  };

  const resetApiRequestTimeout = () => {
    systemPreferencesForm.value.apiRequestTimeoutMs = String(API_CONFIG.DEFAULT_TIMEOUT);
  };

  const setAdminSearchDebounce = (value) => {
    systemPreferencesForm.value.adminSearchDebounceMs = String(Math.max(0, Number.parseInt(value, 10) || 0));
  };

  const resetAdminSearchDebounce = () => {
    setAdminSearchDebounce(300);
  };

  const setTimeFormat = (value) => {
    systemPreferencesForm.value.timeFormat = ['locale', '12h', '24h'].includes(String(value || '').trim().toLowerCase())
      ? String(value).trim().toLowerCase()
      : 'locale';
  };

  const resetTimeFormat = () => {
    setTimeFormat('locale');
  };

  const setDefaultAdminPageSize = (value) => {
    systemPreferencesForm.value.adminPageSize = String(value);
  };

  const resetDefaultAdminPageSize = () => {
    setDefaultAdminPageSize(DEFAULT_ADMIN_PAGE_SIZE);
  };

  const formatDate = (value) => {
    if (!value) {
      return tf('message.settings.never_synced', 'Not synced yet');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return formatDateTime(date, tf('message.settings.never_synced', 'Not synced yet'));
  };

  useEnsureAuthenticatedLifecycle(ensureAuthenticated, {
    shouldEnsure: () => authStore.isAuthenticated,
    onSkipMount: async () => {
      await loadSettings();
    },
    onSkipActivate: async () => {
      await loadSettings();
    }
  });

  useAuthStateChangeWatcher(authStore, handleAuthStateChange, {
    onUnauthenticated: async () => {
      resetProtectedState();
      await loadSettings();
      return false;
    }
  });

  useMockApiChangeWatcher(mainStore, async () => {
    await loadSettings();
  }, {
    shouldRefresh: () => authStore.isAuthenticated && isAdmin.value
  });

  watch(() => authStore.user?.id, (value, oldValue) => {
    if (value !== oldValue) {
      resetProtectedState();
    }
  });

  return {
    activeTab,
    availableTabs,
    canSaveSystemPreferences,
    cardClass,
    copiedTabKey,
    copyTabLabel,
    copyTabShareLink,
    currentApiMode,
    currentApiBaseUrl,
    currentApiRequestTimeout,
    currentAdminSearchDebounce,
    isAuthenticated,
    currentLanguage,
    currentTheme,
    currentTimeFormat,
    currentTimeFormatLabel,
    defaultAdminPageSize,
    formatDate,
    formatDisplayLabel,
    heroSectionClass,
    inputClass,
    isAdmin,
    isPublicSettingsMode,
    isSavingSystemPreferences,
    isSuperAdmin,
    lastSynced,
    openLoginModal,
    panelClass,
    pillClass,
    saveSystemPreferences,
    setAdminSearchDebounce,
    resetApiRequestTimeout,
    resetAdminSearchDebounce,
    resetDefaultAdminPageSize,
    resetTimeFormat,
    selectTab,
    serverLanguageLabels,
    setDefaultAdminPageSize,
    setApiMode,
    setLanguage,
    setTimeFormat,
    setTheme,
    showAccessDenied,
    systemPreferencesForm,
    showLoginRequired,
    summaryCards,
    supportedLanguages,
    resetApiBaseUrl
  };
}