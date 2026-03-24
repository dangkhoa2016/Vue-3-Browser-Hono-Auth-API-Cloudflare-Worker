# Realtime Monitoring And Dashboard

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](REALTIME_MONITORING_AND_DASHBOARD.vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)

This document describes how the realtime monitoring feature and the admin dashboard assemble data, which stores own the state, and where review or optimization work should focus.

## 1. Main Files

- `vue/pages/AdminRealtimeMonitoring.vue`
- `assets/js/stores/realtimeMonitoringStore.js`
- `vue/pages/AdminDashboard.vue`
- `assets/js/stores/systemStatsStore.js`
- `assets/js/stores/systemHealthStore.js`
- `assets/js/stores/auditStore.js`
- `assets/js/stores/securityIncidentStore.js`

## 2. Realtime Monitoring Responsibilities

The realtime monitoring store owns:

- latest status
- overview metrics
- realtime snapshot payloads
- live dashboard payloads used for page-level refreshes
- recent events feed
- threat lists and counts
- alert status and alert history
- alert rule and alert channel data
- timeline data
- health data
- performance summaries
- latest incident creation result
- action result state for analyze, start, stop, simulate, export, alert testing, cache clearing, rule toggles, channel creation, and incident creation

The page and its composable turn this state into hero actions, summary cards, recent-event tables, alert rule and channel panels, maintenance controls, and error/loading UI.

## 3. Data Fetching Model

`fetchDashboardData()` in `realtimeMonitoringStore` still performs the baseline multi-request aggregation with `Promise.all()`.

It fetches:

- monitoring status
- overview
- realtime dashboard payload
- threats
- alert status
- alert history
- timeline
- health

The store then normalizes partial responses into one state model through `applySnapshot()` and additional merge logic.

The admin realtime monitoring composable layers more requests on top of that baseline. Its page refresh path currently runs:

- `refreshSnapshot()` for the current realtime payload
- `fetchRecentEvents()`
- `fetchAlertRules()`
- `fetchAlertChannels()`
- `fetchPerformanceDashboard()`

This means the page no longer depends on one giant response for every operational panel. Reviewers should expect a mix of snapshot-style payloads and feature-specific follow-up requests.

## 4. Why This Matters

This feature is both operationally important and structurally complex:

- It combines many server payloads into one UI.
- It has command actions, not just read-only fetches.
- It is reused indirectly by the admin dashboard summaries.
- It can drift if payload shapes are inconsistent between endpoints or mock mode.

## 5. Dashboard Aggregation

`vue/pages/AdminDashboard.vue` is a separate orchestration layer that pulls data from multiple stores:

- system stats
- system health
- audit
- security incidents
- realtime monitoring

This makes the dashboard useful, but it also means the page can grow quickly because it knows too much about several feature domains at once.

## 6. Review Hotspots

### In the store

- payload normalization for `status`, `realtime`, and `overview`
- state drift between `fetchDashboardData()` and the newer `refreshSnapshot()` plus follow-up endpoint calls
- derived counters such as active threats and alerts
- action loading versus general loading
- mixed responsibilities between read-model state and command responses

### In the pages

- duplicated presentation logic for loading skeletons and summary formatting
- large template size
- direct knowledge of many backend fields
- prompt-driven operational flows for creating rules, channels, and incidents

## 7. Review Checklist

1. If an endpoint response changed, does normalization still produce a stable UI shape?
2. Are command actions updating only the state they actually own?
3. Can the page still render partial data safely if one response is empty?
4. Does the dashboard still tolerate stores loading at different times?
5. If mock mode changed, do recent events, alert rules/channels, and performance metrics still look realistic?
6. Do operational commands such as cache clear, rule toggle, or incident creation refresh the minimum required state afterward?

## 8. Optimization Ideas

1. Extract response normalization helpers from `realtimeMonitoringStore.js`.
2. Separate command actions from read snapshot state if the store keeps growing.
3. Split `AdminDashboard.vue` into view sections backed by feature-specific composables.
4. Consider using a smaller derived-view helper for card-ready metrics instead of formatting inside pages.
5. Replace prompt-based maintenance actions with dedicated dialog components if the monitoring surface keeps expanding.

## 9. Related Documents

1. [Data Access And Mock API](DATA_ACCESS_AND_MOCK_API.md)
2. [Project Review Guide](PROJECT_REVIEW_GUIDE.md)

---

[Read this document in Vietnamese](REALTIME_MONITORING_AND_DASHBOARD_vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)