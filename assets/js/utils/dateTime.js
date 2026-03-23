export const DEFAULT_TIME_FORMAT = 'locale';

export const resolveTimeFormat = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['locale', '12h', '24h'].includes(normalized) ? normalized : DEFAULT_TIME_FORMAT;
};

export const getHour12Preference = (timeFormat) => {
  const normalized = resolveTimeFormat(timeFormat);

  if (normalized === '12h') {
    return true;
  }

  if (normalized === '24h') {
    return false;
  }

  return undefined;
};

export const formatAppDateTime = (value, options = {}) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const {
    locale,
    timeFormat = DEFAULT_TIME_FORMAT,
    fallback = '',
    includeSeconds = true,
    formatOptions = {}
  } = options;

  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: getHour12Preference(timeFormat),
      ...formatOptions
    }).format(date);
  } catch (_error) {
    return fallback || date.toLocaleString();
  }
};