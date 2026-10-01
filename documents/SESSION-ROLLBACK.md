# Session version transitions and rollback

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](SESSION-ROLLBACK.vi.md)

Do not run old and new app versions in parallel tabs. Before switching in either direction:

1. Announce the interruption and close every other app tab on the same origin.
2. In the transition tab, clean authentication storage, verify `cleared`, then load the target version immediately. Do not continue with the old tab's in-memory session.
3. Log in again. Do not restore authentication from legacy mirrors or carry tokens across the transition.

When the current version provides the cleanup helper:

```js
const { invalidateAuthForRollback } = await import('/assets/js/api/sessionStorage.js');
const result = invalidateAuthForRollback(localStorage);
if (result.status !== 'cleared') throw new Error('Auth cleanup incomplete; stop version switch');
location.reload();
```

Before upgrading again from an older version without that helper, apply the same allowlist in the browser console on the app's own origin:

```js
for (const key of ['auth-session-record','auth-api-identity','api-identity','user',
  'token','refresh_token','expires_at','refresh_expires_at']) localStorage.removeItem(key);
location.reload();
```

If storage refuses an operation, stop and resolve storage access first. Do not use `localStorage.clear()`; preserve `api-base-url`, language, theme and non-auth data. Cleanup does not prove backend token revocation and cannot clear another tab's memory.

`session-rollback.test.mjs` exercises new → simulated legacy writes → new for logout, rotation, account replacement, partial mirrors and invalid/ended canonical records. It verifies the allowlist and refusal to restore an old login. This is a unit test with simulated legacy writes, not a browser running an old release.

Current login policy requires Web Locks for serialized writes and working localStorage read/write/removal. Check before sending credentials and reject token adoption if session persistence fails. There is no tab-only login fallback. Unsupported startup environments neither adopt sessions nor write/delete another tab's record. Storage failures after a session starts still use the existing refresh refusal/warning behavior; preflight checks cannot prevent all later storage errors.

Messages should request an updated browser, site-data permission and HTTPS. Do not infer support from User-Agent strings or arbitrary browser version labels. Old reduced-mode verification remains historical evidence, not the current support policy.
