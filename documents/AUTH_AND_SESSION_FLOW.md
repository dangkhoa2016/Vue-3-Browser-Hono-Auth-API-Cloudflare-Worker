# Auth And Session Flow

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](AUTH_AND_SESSION_FLOW.vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)

This document explains how login state, token refresh, route protection, and reauthentication work across the app.

## 1. Main Files

- `assets/js/stores/authStore.js`
- `assets/js/api/httpClient.js`
- `assets/js/router.js`
- `vue/composables/useAuthGate.js`
- `vue/components/LoginModal.vue`

## 2. Auth State Model

The auth store keeps:

- `user`
- `token`
- `refreshToken`
- `expiresAt`
- `refreshExpiresAt`
- `isRefreshing`
- `requiresReauth`
- `reauthNoticeShown`

The state is persisted in `localStorage` and restored through `authStore.init()`.

## 3. Route Protection Strategy

Protected routes use `meta.requiresAuth` in `assets/js/router.js`.

Important behavior:

- The router guard does not hard-redirect anonymous users.
- It stores `authRequired` and `intendedRoute` in `sessionStorage`.
- Navigation is allowed to continue.
- The destination page is responsible for showing a login-required prompt and opening the modal through `useAuthGate()`.

This gives the UI more control, but it means page-level auth handling must stay consistent.

## 4. Token Refresh Flow

### Request phase

The shared Axios client does the following before protected requests:

1. Re-sync runtime base URL from local storage.
2. Inject `Accept-Language` from i18n.
3. Read the auth store through app services.
4. Block non-public requests if `requiresReauth` is already active.
5. Refresh the access token if it is near expiry and refresh token is still valid.
6. Attach `Authorization: Bearer ...`.

### Response phase

If the server responds with `401`:

1. The client checks whether that request has already been retried.
2. If not, it tries `authStore.refreshAccessToken()`.
3. If refresh succeeds, the original request is retried once.
4. If refresh fails, the request is rejected and the app moves toward reauthentication.

## 5. Reauthentication Path

When the refresh token is expired or refresh fails with a client error:

1. `authStore.requireReauthentication()` clears auth state.
2. It sets `requiresReauth = true`.
3. It shows a warning toast once.
4. It tries to open the login modal.

This design prevents repeated invalid-token calls after the session is no longer recoverable.

## 6. Why This Area Is Sensitive

### Good properties

- Only one refresh attempt runs at a time.
- Non-public requests are blocked after session failure.
- Session-expired messaging is centralized.

### Risks

- Logic is split across router, store, interceptor, and composables.
- Missing `authStore.init()` or service wiring can create confusing partial-auth states.
- Pages that skip `useAuthGate()` can behave differently from the rest of the app.

## 7. Review Checklist

1. Does the change preserve one-refresh-at-a-time behavior?
2. Can the page still recover after login and continue intended navigation?
3. Are public endpoints excluded from auth blocking and refresh logic?
4. Does the UI avoid duplicate re-login toasts or modal spam?
5. Are `401`, `403`, and `REAUTH_REQUIRED` handled consistently?

## 8. Optimization Ideas

1. Move auth error classification into a small shared helper to reduce duplication.
2. Standardize page-level unauthorized handling around one composable contract.
3. Add lightweight logging around `intendedRoute` restore behavior for debugging.
4. Consider separating token persistence from toast/modal side effects if auth logic grows further.

---

[Read this document in Vietnamese](AUTH_AND_SESSION_FLOW_vi.md)

[Back to Documentation Index](DOCUMENTATION_INDEX.md)