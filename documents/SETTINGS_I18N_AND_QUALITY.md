# Settings, I18n, And Quality

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](SETTINGS_I18N_AND_QUALITY.vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)

This document covers the Settings page, persisted browser preferences, runtime language loading, and the lightweight quality scripts that help keep the project maintainable.

## 1. Main Files

- `vue/pages/Settings.vue`
- `vue/composables/useSettingsPage.js`
- `assets/js/stores/mainStore.js`
- `assets/js/i18n.js`
- `tools/i18n.js`
- `tools/i18n-audit.js`
- `tools/i18n-usage-check.js`
- `tools/vue-file-size-check.cjs`
- `tools/vue-custom-lint.cjs`
- `tools/vue-script-setup-coverage.cjs`

## 2. Settings Page Purpose

The Settings page is more than a cosmetic preferences page. It is the browser control panel for runtime behavior.

Important settings include:

- theme
- language
- mock versus real API mode
- runtime API base URL
- admin page size
- request timeout
- search debounce
- time format

These settings affect both user experience and the behavior of other features.

## 3. Preference Ownership

`assets/js/stores/mainStore.js` owns persisted browser-level preferences and applies side effects such as:

- toggling dark mode classes on `document`
- persisting values into `localStorage`
- updating Axios runtime base URL and timeout
- recording `settingsLastUpdated`

`useSettingsPage()` adds page orchestration, access rules, form state, deep-linked tabs, toast feedback, and supported-language loading from the server.

## 4. I18n Runtime Model

`assets/js/i18n.js` creates or reuses a single i18n instance.

Important behavior:

- locale files are loaded lazily with dynamic imports
- current language is stored in `localStorage`
- `<html lang="...">` is updated when the locale changes
- supported browser languages are narrowed to the app's supported list

This setup keeps initial boot smaller, but it means locale drift can remain hidden unless tooling is used.

## 5. Quality Scripts

### I18n checks

- `node tools/i18n.js audit`
- `node tools/i18n.js usage`
- `node tools/i18n.js check`

These scripts help catch missing keys, usage drift, and other translation maintenance issues.

### Vue maintainability checks

- `node tools/vue-file-size-check.cjs`
- `node tools/vue-custom-lint.cjs`
- `node tools/vue-script-setup-coverage.cjs`

These are lightweight guardrails, not full lint or type systems. They are especially useful in this project because several Vue files are already large.

## 6. Review Hotspots

### Settings page

- role-dependent tab and access behavior
- runtime API changes that affect all future requests
- public mode versus authenticated admin mode
- preference synchronization between form state and store state

### I18n

- locale key drift across `en`, `vi`, `de`, `ja`, and `ko`
- fallback text usage in pages and components
- new keys that are added to only one locale file

### Quality tooling

- guardrails can become stale if scripts and docs diverge
- passing scripts does not guarantee architectural quality, only baseline safety

## 7. Review Checklist

1. Does a Settings change update both UI state and persisted state correctly?
2. If the API base URL or timeout changes, do later requests pick up the new values immediately?
3. If a new i18n key is introduced, are all maintained locales updated or tracked?
4. Does the change preserve the central fallback approach rather than inline template fallbacks?
5. If a file grows again, should the code be extracted before adding more feature logic?

## 8. Optimization Ideas

1. Split `useSettingsPage.js` into system preferences, appearance/language, and tab-link helpers.
2. Add a short maintenance note whenever new settings also require quality script updates.
3. Keep locale-key additions grouped by feature to reduce drift review time.
4. Consider surfacing known i18n drift status in documentation when the non-EN/VI locales lag behind.

## 9. Related Documents

1. [Project Review Guide](PROJECT_REVIEW_GUIDE.md)
2. [Data Access And Mock API](DATA_ACCESS_AND_MOCK_API.md)
3. [Frontend Architecture Boundaries](FRONTEND_ARCHITECTURE_BOUNDARIES.md)

---

[Read this document in Vietnamese](SETTINGS_I18N_AND_QUALITY_vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)