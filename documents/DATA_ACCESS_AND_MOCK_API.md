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
- Retry non-client failures with backoff

This client is not just a transport utility. It also owns part of the app's session behavior, so changes here can affect most pages at once.

## 3. Runtime Configuration

`assets/js/stores/mainStore.js` persists system preferences in browser storage, including:

- `mockApi`
- `apiBaseUrl`
- `apiRequestTimeoutMs`
- `adminPageSize`
- `adminSearchDebounceMs`
- `timeFormat`

`httpClient.js` re-reads the base URL from storage on each relative request so Settings changes apply immediately without rebuilding the client.

## 4. Retry Rules

### Retries are allowed for

- Network failures
- Server-side failures that are not classified as client errors

### Retries are skipped for

- Auth endpoints with client errors
- General `4xx` client errors
- Requests that already exhausted the configured retry count

This keeps login and validation failures from looking transient when they are actually user or contract errors.

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

[Read this document in Vietnamese](DATA_ACCESS_AND_MOCK_API_vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)