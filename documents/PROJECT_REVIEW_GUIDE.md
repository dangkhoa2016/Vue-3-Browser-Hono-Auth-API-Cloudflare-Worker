# Project Review Guide

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](PROJECT_REVIEW_GUIDE.vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)

This document is the review entry point for `vue-hono-auth-api-cloudflare-worker`. It maps the areas that matter most when you need to review behavior, reduce complexity, or plan optimization work.

## 1. Project Shape

- Runtime model: browser-only Vue 3 app loaded through `vue3-sfc-loader`; there is no build step for the UI runtime.
- State model: Pinia stores in `assets/js/stores/`.
- Routing: hash-based router in `assets/js/router.js`.
- Boot sequence: `assets/js/init.js` mounts a lightweight loader first, then mounts the main app.
- API access: shared Axios client in `assets/js/api/httpClient.js` with runtime base URL, language headers, retries, and token refresh.
- Mock mode: `assets/js/api/mockSetup.js` can emulate most backend flows for local UI work.

## 2. Review Priorities

### Highest-value areas

1. App runtime and lazy module loading
2. Auth, token refresh, and route protection
3. Data access and mock API parity
4. Realtime monitoring and dashboard aggregation
5. KV admin config editing for super-admin paths
6. Settings, i18n, and quality guard scripts

### Largest logic hotspots

- `assets/js/api/mockSetup.js`
- `vue/composables/useKvAdminConfigsPage.js`
- `vue/composables/useSettingsPage.js`
- `vue/pages/AdminAuditLogs.vue`
- `vue/pages/AdminRealtimeMonitoring.vue`
- `vue/pages/AdminDashboard.vue`
- `assets/js/stores/realtimeMonitoringStore.js`

These files are strong candidates for future extraction into smaller feature modules or service helpers.

## 3. Documentation Map

- [Documentation Index](DOCUMENTATION_INDEX.md)
- [App Runtime And Loading](APP_RUNTIME_AND_LOADING.md)
- [Auth And Session Flow](AUTH_AND_SESSION_FLOW.md)
- [Admin Audit And Advanced Audit](ADMIN_AUDIT_AND_ADVANCED_AUDIT.md)
- [Data Access And Mock API](DATA_ACCESS_AND_MOCK_API.md)
- [Realtime Monitoring And Dashboard](REALTIME_MONITORING_AND_DASHBOARD.md)
- [KV Admin Configs Workflow](KV_ADMIN_CONFIGS_WORKFLOW.md)
- [Settings, I18n, And Quality](SETTINGS_I18N_AND_QUALITY.md)
- [Frontend Architecture Boundaries](FRONTEND_ARCHITECTURE_BOUNDARIES.md)

## 4. Feature Map

| Feature | Main route/page | Primary state/composable | Why it matters |
| --- | --- | --- | --- |
| Application bootstrap | `index.html`, `vue/Loader.vue` | `assets/js/init.js`, `assets/js/appServices.js` | All module loading, cache behavior, and singleton wiring start here |
| Authentication | `vue/components/LoginModal.vue`, protected pages | `assets/js/stores/authStore.js`, `vue/composables/useAuthGate.js` | Affects every protected request and user recovery path |
| Audit operations | `vue/pages/AdminAuditLogs.vue`, `vue/pages/AdminAdvancedAudit.vue` | `assets/js/stores/auditStore.js`, `assets/js/stores/advancedAuditStore.js`, `vue/composables/useAdminAuditLogsPage.js` | Covers operator log review, export, analytics, compliance, and archival actions |
| API transport | all pages | `assets/js/api/httpClient.js` | Injects locale, auth header, retries, and refresh logic |
| Mock backend | all pages in mock mode | `assets/js/api/mockSetup.js` | Large source of demo behavior and possible parity drift |
| Dashboard | `vue/pages/AdminDashboard.vue` | multiple admin stores | Aggregates health, stats, audit, incidents, and monitoring |
| Realtime monitoring | `vue/pages/AdminRealtimeMonitoring.vue` | `assets/js/stores/realtimeMonitoringStore.js`, `vue/composables/useAdminRealtimeMonitoringPage.js` | Combines snapshot normalization with recent events, alert rules/channels, performance, cache, and incident operations |
| KV config admin | `vue/pages/KvAdminConfigs.vue` | `vue/composables/useKvAdminConfigsPage.js`, `assets/js/stores/kvAdminConfigsStore.js` | Super-admin surface with CRUD and bulk edit flows |
| Settings | `vue/pages/Settings.vue` | `vue/composables/useSettingsPage.js`, `assets/js/stores/mainStore.js` | Controls runtime API endpoint, pagination, debounce, theme, and language |
| I18n | all pages | `assets/js/i18n.js`, locale files, `tools/i18n.js` | Cross-cutting runtime and maintenance concern |

## 5. Review Checklist

Use this checklist before approving a non-trivial change:

1. Does the change preserve browser-only startup and lazy loading assumptions?
2. Does it respect route meta and auth gate behavior for protected screens?
3. If API contracts changed, is mock mode still aligned enough for frontend testing?
4. If the change touches filters, pagination, or tabs, are deep links and keep-alive behavior still correct?
5. If i18n keys changed, did the related locale and tooling checks get updated?
6. If a file is already large, can the change extract logic instead of adding more page-level code?

## 6. Optimization Targets

### Good refactor candidates

- Split `mockSetup.js` by feature group rather than keeping one giant registration file.
- Move repeated admin page orchestration into more feature-specific composables.
- Introduce small normalization helpers for dashboard and monitoring payloads.
- Reduce page-level styling constants where they obscure behavior review.

### Areas to keep stable

- `init.js` module cache setup order
- `router.js` lazy wrapper and auth guard behavior
- `authStore.js` refresh and reauthentication semantics
- `httpClient.js` interceptor ordering

## 7. Suggested Review Order

1. Start with [App Runtime And Loading](APP_RUNTIME_AND_LOADING.md)
2. Continue with [Auth And Session Flow](AUTH_AND_SESSION_FLOW.md)
3. Read [Data Access And Mock API](DATA_ACCESS_AND_MOCK_API.md)
4. Read [Admin Audit And Advanced Audit](ADMIN_AUDIT_AND_ADVANCED_AUDIT.md) when audit-domain changes are involved
5. Then inspect feature-specific docs based on the area being changed

---

[Read this document in Vietnamese](PROJECT_REVIEW_GUIDE_vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)