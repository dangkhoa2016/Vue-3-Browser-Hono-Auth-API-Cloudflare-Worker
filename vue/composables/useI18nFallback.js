import { useI18n } from 'vue-i18n';

export function useI18nFallback(options = { useScope: 'global' }) {
  const { t, te } = useI18n(options);

  const resolve = (key, params) => {
    if (!key) return null;

    if (typeof te === 'function' && te(key)) {
      const translated = t(key, params);
      if (translated !== '' && translated != null) return translated;
      return null;
    }

    const translated = t(key, params);
    if (translated && translated !== key) return translated;
    return null;
  };

  const tf = (keyOrKeys, fallback = '', params) => {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];

    for (const key of keys) {
      const translated = resolve(key, params);
      if (translated != null) return translated;
    }

    return fallback;
  };

  return {
    t,
    tf
  };
}
