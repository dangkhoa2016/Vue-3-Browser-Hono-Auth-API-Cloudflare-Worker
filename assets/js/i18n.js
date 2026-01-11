const { createI18n } = VueI18n;
import { sleep } from './helper.js';

let i18n;
let loadedLanguages;

if (window.i18nInstance) {
  // console.warn('[i18n] Reusing existing i18n instance');
  i18n = window.i18nInstance;
  loadedLanguages = window.i18nLoadedLanguages;
} else {
  // console.log('[i18n] Creating new i18n instance');
  i18n = createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: {},
    legacy: false,
    globalInjection: true,
    runtimeOnly: false
  });
  window.i18nInstance = i18n;
  loadedLanguages = [];
  window.i18nLoadedLanguages = loadedLanguages;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'de', label: 'Deutsch' }
];

export { i18n };

function setI18nLanguage(lang) {
  if (i18n.mode === 'legacy') {
    i18n.global.locale = lang;
  } else {
    i18n.global.locale.value = lang;
  }
  document.querySelector('html').setAttribute('lang', lang);
  localStorage.setItem('user-locale', lang);
  return lang;
}

export async function loadLanguageAsync(lang) {
  // console.log(`[i18n] Requested language: ${lang}`, i18n);

  // If the language was already loaded
  if (loadedLanguages.includes(lang)) {
    const currentLocale = i18n.mode === 'legacy' ? i18n.global.locale : i18n.global.locale.value;
    if (currentLocale !== lang) {
      return Promise.resolve(setI18nLanguage(lang));
    }
    return Promise.resolve(lang);
  }

  // If the language hasn't been loaded yet
  try {
    if (loadedLanguages.length > 0) {
      // Artificial delay to simulate loading time
      await sleep(200);
    }

    // console.log(`[i18n] Loading language file for: ${lang}`);
    const module = await import(`./locales/${lang}.js`);
    let messages = module.default || module;

    // Unwrap Proxy if needed and ensure plain object
    if (typeof messages === 'object') {
      messages = JSON.parse(JSON.stringify(messages));
    }

    // console.log(`[i18n] Loading ${lang}`, messages);

    i18n.global.setLocaleMessage(lang, messages);

    // console.log(`[i18n] Available locales:`, i18n.global.availableLocales);
    // console.log(`[i18n] Messages for ${lang}:`, i18n.global.getLocaleMessage(lang));

    loadedLanguages.push(lang);
    return setI18nLanguage(lang);
  } catch (e) {
    console.error(`Failed to load language: ${lang}`, e);
    throw e;
  }
}
export function detectBrowserLanguage() {
  const savedLang = localStorage.getItem('user-locale');
  if (savedLang) {
    return savedLang;
  }
  const lang = navigator.language || navigator.userLanguage;
  const shortLang = lang.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.map(l => l.code);
  return supported.includes(shortLang) ? shortLang : 'en';
}
