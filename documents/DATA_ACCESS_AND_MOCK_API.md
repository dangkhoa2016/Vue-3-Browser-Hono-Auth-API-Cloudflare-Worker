# Data Access And Mock API

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](DATA_ACCESS_AND_MOCK_API.vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)

This document covers the shared API transport layer, runtime endpoint configuration, retry behavior, and the mock backend used by the frontend.

## 1. Main Files

- `assets/js/api/httpClient.js`
- `assets/js/api/endpoints.js`
- `assets/js/api.js`
- `assets/js/api/mockSetup.js`
- `assets/js/api/mockData.js`
- `assets/js/stores/mainStore.js`

## 2. Real API Transport

The app uses one shared Axios instance: `apiClient`.

Key responsibilities:

- Normalize and store the runtime base URL
- Normalize request timeout
- Inject `Accept-Language`
- Inject bearer token when available
- Refresh access tokens when needed
- Apply bounded retries only to eligible requests

This client is not just a transport utility. It also owns part of the app's session behavior, so changes here can affect most pages at once.

## 3. Runtime Configuration

`assets/js/stores/mainStore.js` persists system preferences in browser storage, including:

- `mockApi`
- `apiBaseUrl`
- `apiRequestTimeoutMs`
- `adminPageSize`
- `adminSearchDebounceMs`
- `timeFormat`

Storage seeds the base URL at startup. The live Axios defaults then remain authoritative. Settings and cross-tab preference changes apply through `setApiClientBaseUrl`; each request does not reread storage. Switching API identity invalidates the previous session.

## 4. Retry Rules

Safe methods (`GET`, `HEAD`, `OPTIONS`) may retry network/timeouts and eligible `5xx` failures within the configured attempt limit. Mutations require an explicit `idempotentRetry` contract before general replay is permitted.

Never retry cancelled requests, auth endpoints, `429`, `503`, other `4xx` or exhausted attempts. A first `401` has a separate refresh-and-replay path restricted to safe methods and the current API/session context; refresh/logout are excluded. Mutations rejected with `401` are not automatically replayed. Establish the outcome of an ambiguous write before a user repeats it.

Temporary refresh failures preserve the session; invalid/expired sessions and rotation conflicts follow different recovery paths. See [auth and session flow](AUTH_AND_SESSION_FLOW.md).

## 5. Mock API Role

`assets/js/api/mockSetup.js` is the local demo backend for the app. It registers Axios Mock Adapter handlers for many features, including:

- login
- token refresh
- registration
- profile update
- realtime monitoring
- admin data views
- KV admin surfaces

The file is large because it contains endpoint registration, mock state, response shaping, and some feature-specific validation.

For realtime monitoring specifically, mock mode now covers both the original dashboard snapshot endpoints and newer operational endpoints such as:

- recent events
- alert rules and rule toggles
- alert channels
- alert test actions
- performance dashboard data
- dashboard cache clearing
- incident creation

This parity matters because the admin realtime monitoring page now depends on feature-specific follow-up requests beyond the original dashboard snapshot.

## 6. Why Mock Setup Is Important

### Benefits

- Frontend work can continue without a live backend.
- UI flows can be demonstrated consistently.
- Profile, auth, and admin pages can be exercised end to end in the browser.

### Risks

- Mock responses can drift from real backend contracts.
- Feature-specific logic can accumulate inside one file.
- Reviewing a change is harder because transport and feature emulation are mixed together.

## 7. Review Checklist

1. If an endpoint payload changed, were both real-client assumptions and mock responses updated?
2. If a route became parameterized, were the endpoint builders and mock URL matchers updated together?
3. Does the change preserve runtime endpoint validation and timeout normalization?
4. Could a new error path accidentally get retried when it should fail fast?
5. If a mock response now includes derived fields, is that derivation also true in real API mode?
6. Did a change add more feature logic into `mockSetup.js` that should live in a helper instead?

## 8. Optimization Ideas

1. Split `mockSetup.js` into feature registrars such as auth, profile, monitoring, and KV admin.
2. Share payload normalization helpers between mock mode and store code where possible.
3. Add a small contract checklist for every endpoint that exists in both real and mock modes.
4. Keep `httpClient.js` focused on transport concerns by moving unrelated helpers out over time.
5. Keep parameterized endpoint builders and mock regex patterns close enough that route-surface drift is easy to spot in review.

## 9. Good Files To Read Together

1. [Auth And Session Flow](AUTH_AND_SESSION_FLOW.md)
2. [Settings, I18n, And Quality](SETTINGS_I18N_AND_QUALITY.md)
3. [Realtime Monitoring And Dashboard](REALTIME_MONITORING_AND_DASHBOARD.md)

---

[Read this document in Vietnamese](DATA_ACCESS_AND_MOCK_API.vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)
