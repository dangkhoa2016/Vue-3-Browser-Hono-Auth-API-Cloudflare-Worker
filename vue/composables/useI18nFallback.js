import { useI18n } from 'vue-i18n';

/**
 * A wrapper around vue-i18n that providing a fallback translation mechanism (tf).
 * 
 * @param {Object} options - Options passed to vue-i18n's useI18n
 * @param {string} [options.useScope='global'] - The scope to use for i18n
 * @returns {{ t: Function, tf: (keyOrKeys: string|string[], fallback?: string, params?: Object) => string, locale: import('vue').Ref<string> }}
 */
export function useI18nFallback(options = { useScope: 'global' }) {
  const { t, te, locale } = useI18n(options);

  /**
   * Attempts to resolve a translation key.
   * @param {string} key - The translation key to resolve
   * @param {Object} [params] - The parameters to substitute into the translation string
   * @returns {string|null} The resolved string, or null if not found
   */
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

  /**
   * Translate with Fallback: Returns the first valid translation from a list of keys.
   * If none are found, returns the provided fallback text.
   * 
   * @param {string|string[]} keyOrKeys - A single translation key or an array of keys
   * @param {string} [fallback=''] - The default text to return if no translation is found
   * @param {Object} [params] - Optional parameters for the translation string
   * @returns {string} The translated string or the fallback
   */
  const tf = (keyOrKeys, fallback = '', params) => {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];

    for (const key of keys) {
      const translated = resolve(key, params);
      if (translated != null) return translated;
    }

    return fallback;
  };

  return {
    locale,
    t,
    tf
  };
}
