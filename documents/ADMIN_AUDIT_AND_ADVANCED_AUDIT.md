# Admin Audit And Advanced Audit

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](ADMIN_AUDIT_AND_ADVANCED_AUDIT.vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)

This document covers the audit review surface in two layers: the standard audit log operations page and the advanced audit workspace for analytics, compliance, and archival actions.

## 1. Main Files

- `vue/pages/AdminAuditLogs.vue`
- `vue/composables/useAdminAuditLogsPage.js`
- `assets/js/stores/auditStore.js`
- `vue/pages/AdminAdvancedAudit.vue`
- `assets/js/stores/advancedAuditStore.js`
- `vue/components/AdvancedAuditAnalyticsTab.vue`
- `vue/components/AdvancedAuditComplianceTab.vue`
- `vue/components/AdvancedAuditArchivalTab.vue`

## 2. Standard Audit Logs Scope

The standard audit page is the operator-facing audit browser.

Key responsibilities:

- search and filter logs
- paginate and change page size
- export filtered results
- view detailed log payloads
- show summary counters for total, success, and issue records

The page orchestration mostly lives in `useAdminAuditLogsPage.js`, while `auditStore.js` owns data fetching, filtering parameters, pagination state, and export handling.

## 3. Standard Audit Review Hotspots

### Page/composable layer

- multiple filter fields mapped to store state
- page-size synchronization with main settings
- table scroll and pagination behavior
- log detail modal and clipboard copy flow

### Store layer

- mock-mode filtering behavior versus real API behavior
- pagination normalization
- audit stats fetch versus log list fetch
- export path differences between mock mode and real mode

The most common drift risk here is that mock filtering logic can differ from backend filtering semantics.

## 4. Advanced Audit Scope

The advanced audit page is a tabbed control surface for deeper analysis and retention workflows.

Current tabs:

- analytics
- compliance
- archival

The page uses `useDeepLinkedTabs()` so operators can link directly to a specific tab state.

## 5. Advanced Audit State Model

`advancedAuditStore.js` owns multiple command-style actions and cached result buckets:

- `analytics`
- `compliance`
- `archival`
- fetch methods for specialized analytics
- archival and restore commands
- compliance management commands
- archive and retention management commands

This store is more command-heavy than many of the other stores in the project.

## 6. Why This Area Needs Documentation

This audit cluster is important because it mixes several complexity types:

- operator-facing filters and exports
- tabbed view orchestration
- direct management actions with side effects
- mixed mock and real API behavior
- multiple backend contract surfaces under one audit domain

It is easy for review to focus only on templates and miss the store and orchestration risks underneath.

## 7. Review Checklist

1. Do filter names and exported parameters still match backend expectations?
2. Is mock-mode filtering close enough to real-mode behavior for review confidence?
3. Do advanced audit tabs still lazy-load and preserve linkable tab state?
4. Are command actions clearly separated from passive data fetches?
5. Do error, loading, and toast flows behave consistently across audit and advanced audit actions?

## 8. Optimization Ideas

1. Extract audit filter serialization into a helper shared by fetch and export.
2. Split `advancedAuditStore.js` by concern: analytics, compliance, archival, retention.
3. Consider a dedicated composable for advanced-audit commands so the page stays focused on tab orchestration.
4. Keep tab-specific payload normalization close to the tab that renders it.

## 9. Related Documents

1. [Auth And Session Flow](AUTH_AND_SESSION_FLOW.md)
2. [Data Access And Mock API](DATA_ACCESS_AND_MOCK_API.md)
3. [Project Review Guide](PROJECT_REVIEW_GUIDE.md)

---

[Read this document in Vietnamese](ADMIN_AUDIT_AND_ADVANCED_AUDIT_vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)