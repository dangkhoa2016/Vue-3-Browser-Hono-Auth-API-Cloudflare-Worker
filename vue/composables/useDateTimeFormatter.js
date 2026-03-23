import { computed } from 'vue';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

const TIME_FORMAT_OPTIONS = Object.freeze({
  locale: {},
  '12h': { hour12: true },
  '24h': { hour12: false }
});

export const getTimeFormatLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === '12h') {
    return '12-hour';
  }

  if (normalized === '24h') {
    return '24-hour';
  }

  return 'Locale default';
};

export const formatDateTimeWithPreference = (value, options = {}) => {
  const fallback = options.fallback ?? '-';

  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const timeFormat = String(options.timeFormat || 'locale').trim().toLowerCase();
  const locale = options.locale || undefined;
  const formatterOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...(TIME_FORMAT_OPTIONS[timeFormat] || TIME_FORMAT_OPTIONS.locale)
  };

  try {
    return new Intl.DateTimeFormat(locale, formatterOptions).format(date);
  } catch (_error) {
    return date.toLocaleString();
  }
};

export function useDateTimeFormatter() {
  const mainStore = useMainStore();
  const { locale } = useI18nFallback({ useScope: 'global' });

  const activeLocale = computed(() => {
    const preferredLocale = String(locale?.value || '').trim();
    if (preferredLocale) {
      return preferredLocale;
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }

    return undefined;
  });

  const formatDateTime = (value, fallback = '-') => formatDateTimeWithPreference(value, {
    locale: activeLocale.value,
    timeFormat: mainStore.timeFormat,
    fallback
  });

  return {
    activeLocale,
    formatDateTime,
    timeFormatLabel: computed(() => getTimeFormatLabel(mainStore.timeFormat))
  };
}