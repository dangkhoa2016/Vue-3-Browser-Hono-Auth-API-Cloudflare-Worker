# KV Admin Configs Workflow

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](KV_ADMIN_CONFIGS_WORKFLOW.vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)

This document explains the super-admin KV configuration surface, how rows are normalized, and where edits are risky.

## 1. Main Files

- `vue/pages/KvAdminConfigs.vue`
- `vue/composables/useKvAdminConfigsPage.js`
- `assets/js/stores/kvAdminConfigsStore.js`
- `assets/js/api/httpClient.js`

## 2. Feature Purpose

The feature provides a browser UI for inspecting default config values, viewing KV overrides, editing single keys, bulk writing keys, and deleting overrides.

This is a high-value admin surface because it changes runtime behavior indirectly through configuration rather than code.

## 3. State Ownership

### Store responsibilities

`kvAdminConfigsStore` owns the normalized row list and keeps the page model simple:

- `rows`
- `allowedKeys`
- `allowedCount`
- `lastUpdated`
- load and reset behavior

It converts raw `configs`, `defaults`, and allowed key lists into row objects with:

- `value`
- `defaultValue`
- `valueLabel`
- `defaultLabel`
- `source`
- `isOverride`

### Composable responsibilities

`useKvAdminConfigsPage()` owns page orchestration:

- auth gating
- search and debounce
- override-only filtering
- copy actions
- add/edit modal
- delete modal
- bulk entry flow
- request submission and toast feedback

## 4. Why This File Is Large

The page composable is large because it combines UI state, permission handling, fetch logic, serialization, parsing, modal control, and bulk-edit keyboard flow in one place.

That makes it practical for now, but it is a clear refactor candidate if the feature grows.

## 5. Important Behavior

### Access control

- The feature requires authentication.
- It additionally checks `super_admin` role before loading sensitive data.
- On `401` or `403`, it can clear auth state and move the user back through the auth gate flow.

### Value parsing

User input is converted back into typed values where possible:

- `true` and `false` become booleans
- `null` becomes null
- numeric strings become numbers
- JSON-like text is parsed into objects or arrays
- everything else stays a string

### Bulk editing

Bulk edit mode supports:

- dynamically added rows
- allowed key suggestions
- keyboard-driven next-field focus
- mixed row validation before save

## 6. Review Checklist

1. Does a change preserve the distinction between default values and KV overrides?
2. Are typed values still parsed and displayed consistently?
3. Can unauthorized or expired sessions still fail safely?
4. Does bulk editing keep its keyboard workflow and validation behavior?
5. If allowed keys changed, do suggestion lists and row normalization still match?

## 7. Optimization Ideas

1. Split modal state and request submission into smaller helpers.
2. Extract value serialization and parsing into a dedicated KV config utility.
3. Move bulk-entry mechanics into a focused composable.
4. Keep store normalization pure and avoid leaking more UI concerns into it.

## 8. Related Documents

1. [Auth And Session Flow](AUTH_AND_SESSION_FLOW.md)
2. [Data Access And Mock API](DATA_ACCESS_AND_MOCK_API.md)

---

[Read this document in Vietnamese](KV_ADMIN_CONFIGS_WORKFLOW_vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)