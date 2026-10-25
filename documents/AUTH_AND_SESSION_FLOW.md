# Auth and session flow

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](AUTH_AND_SESSION_FLOW.vi.md)

[Documentation index](DOCUMENTATION_INDEX.md)

## Session ownership

Read `assets/js/stores/authStore.js`, `assets/js/api/sessionStorage.js`, `assets/js/api/sessionCoordinator.js` and `assets/js/api/httpClient.js` together. The canonical persisted session is `auth-session-record`; legacy token/user mirrors are compatibility data, not an independent source of truth. API identity and session context fence requests and asynchronous results so a response from an old account or backend cannot replace the current session.

Authentication requires Web Locks, readable/writable/removable localStorage and a secure context (HTTPS or localhost). Login checks those capabilities before submitting credentials and refuses a token result that cannot be persisted safely. Unsupported startup environments do not adopt a saved session. There is no tab-only login fallback. Capability checks cannot guarantee that storage will never fail later.

The coordinator serializes session writes and refresh rotation across tabs. Current records, revisions and ended-session tombstones prevent older results or legacy mirrors from reviving a logged-out session. Logout cleanup in the browser is distinct from server-side token revocation; test both when changing the protocol.

## Route and page protection

Protected routes declare `meta.requiresAuth` in `assets/js/router.js`. The router records `authRequired` and `intendedRoute` in sessionStorage and allows navigation; the destination page uses `vue/composables/useAuthGate.js` to display a login-required state and open `LoginModal.vue`. Closing the dialog must leave an actionable login prompt rather than an indefinite skeleton. Backend permissions remain authoritative.

## Request configuration

Storage seeds the API URL at startup. The live Axios `apiClient.defaults.baseURL` is then authoritative. Settings and cross-tab preference adoption update it through `setApiClientBaseUrl`; requests do not reread and overwrite it from storage each time. Changing API identity invalidates the old session.

The request interceptor applies language, checks the current auth/session context, refreshes a near-expiry access token when eligible and attaches the bearer token. Non-public requests are blocked when reauthentication is required. Public/auth flows have their own exceptions in the transport contract.

## Refresh and replay

`refreshAccessTokenOrThrow` coordinates refresh and can adopt a replacement token pair that another tab already committed. A first `401` can cause one refresh-and-replay only for a safe method (`GET`, `HEAD`, `OPTIONS`), a usable refresh session and a request still bound to the current API/session context. Refresh/logout requests are excluded. Mutations rejected with `401` are not replayed automatically.

General retry/backoff follows the separate [transport policy](DATA_ACCESS_AND_MOCK_API.md): auth endpoints, cancelled requests, `429`, `503` and other `4xx` are excluded. Mutation retry requires an explicit `idempotentRetry` contract; do not enable it merely to hide a failed write.

Refresh outcomes are distinct:

- Invalid, revoked or expired sessions require reauthentication and centralized login messaging.
- Rotation conflicts (`409`) trigger reconciliation with the current session rather than blindly logging out or overwriting another tab.
- Network errors, `429` and server failures are temporary: reject the affected operation while preserving the existing session; do not equate them with invalid credentials.
- Results from a superseded API/session context are discarded, including late refresh results after logout or account replacement.

## Review and verification

Check logout versus in-flight refresh, concurrent tabs, account/API replacement, storage failures, safe-method replay and failed mutations. Page-level auth prompts must avoid duplicate dialogs and repeated loads after login. The focused suites include `auth-transport`, `browser-login-policy` and `session-rollback`.

Use [verification and releases](VERIFICATION_AND_RELEASES.md) for executable gates and [session rollback](SESSION-ROLLBACK.md) when switching versions. Browser cleanup does not migrate backend schema or prove that server credentials were revoked.
