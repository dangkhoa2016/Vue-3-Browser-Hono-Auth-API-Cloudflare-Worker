/**
 * Regression tests for the auth/transport invariants behind findings F01–F04.
 *
 * These tests assert the SECURE behaviour. The review probes (review-auth-2026-09-26/frontend-probes.mjs)
 * asserted the buggy behaviour and are intentionally not reproduced here.
 *
 * Fixtures: fake tokens/credentials and loopback origins only (127.0.0.1). No production API, no secrets.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TEST_ORIGINS, loadModule, ok, fail } from './helpers/browser-env.mjs';
import {
  ACCESS_TTL,
  API_A,
  API_B,
  NOW_SECONDS,
  REFRESH_TTL,
  baseSession,
  bootApp,
  loadEndpoints,
} from './helpers/app-harness.mjs';

describe('F01 — logout revokes the server session and always clears local state', () => {
  test('explicit logout calls the backend exactly once with the token snapshot taken before clearing', async () => {
    const app = bootApp({
      routes: {
        'post /api/auth/logout': ok({ revoked: true }),
      },
    });

    app.storage.setItem('token', 'FAKE_ACCESS_A');
    app.storage.setItem('refresh_token', 'FAKE_REFRESH_A');
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const result = await app.auth.logoutRemote();

    const logoutCalls = app.transport.calls.filter((call) => call.key === 'post /api/auth/logout');
    assert.equal(logoutCalls.length, 1, 'logout must be sent once');
    assert.equal(logoutCalls[0].config.headers.Authorization, 'Bearer FAKE_ACCESS_A', 'logout must use the pre-clear token snapshot');
    assert.deepEqual(logoutCalls[0].config.data, { refresh_token: 'FAKE_REFRESH_A' });
    assert.equal(result.revoked, true);

    assert.equal(app.auth.token, null);
    assert.equal(app.auth.refreshToken, null);
    assert.equal(app.storage.getItem('token'), null);
    assert.equal(app.storage.getItem('refresh_token'), null);
    assert.equal(app.storage.getItem('user'), null);
  });

  test('double-clicking logout does not send a second request', async () => {
    const app = bootApp({ routes: { 'post /api/auth/logout': ok({ revoked: true }) } });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const [first, second] = await Promise.all([app.auth.logoutRemote(), app.auth.logoutRemote()]);

    assert.equal(first, second, 'both callers share one in-flight logout');
    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/logout').length, 1);
  });

  test('logout failure still clears local state and reports revocation as NOT confirmed', async () => {
    const app = bootApp({
      routes: { 'post /api/auth/logout': fail(503, 'DB_UNAVAILABLE', 'database unavailable') },
    });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const result = await app.auth.logoutRemote();

    assert.equal(result.revoked, false, 'a 503 must never be reported as a confirmed revocation');
    assert.equal(result.status, 503);
    assert.equal(result.code, 'DB_UNAVAILABLE');
    assert.equal(app.auth.token, null, 'local cleanup happens even when revocation fails');
    assert.equal(app.storage.getItem('token'), null);
  });

  test('logout of a session whose access token already expired does not trigger a token refresh', async () => {
    const app = bootApp({
      routes: {
        'post /api/auth/logout': ok({ revoked: true }),
        'post /api/auth/refresh_token': ok(baseSession({ access_token: 'FAKE_ACCESS_A2' })),
      },
    });
    // Access token expired 10 minutes ago; refresh token still valid.
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 600, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    const result = await app.auth.logoutRemote();

    assert.equal(result.revoked, true);
    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token').length, 0, 'the logout request must not be preceded by a refresh');
  });

  test('session-expired cleanup does not call the logout endpoint (no recursive logout)', async () => {
    const app = bootApp({ routes: { 'post /api/auth/logout': ok({ revoked: true }) } });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    await app.auth.requireReauthentication();

    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/logout').length, 0);
    assert.equal(app.auth.token, null);
    assert.equal(app.auth.requiresReauth, true);
  });

  test('Navbar confirmLogout performs the remote logout and reports the revocation outcome', async () => {
    const app = bootApp({ routes: { 'post /api/auth/logout': fail(503, 'DB_UNAVAILABLE', 'database unavailable') } });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const toasts = [];
    const vue = {
      ref: (value) => ({ value }),
      computed: (fn) => ({ get value() { return fn(); } }),
      onMounted: () => {},
      onUnmounted: () => {},
    };

    const navbar = loadModule('vue/composables/useNavbar.js', { ...app.env, Pinia: app.pinia }, {
      computed: vue.computed,
      ref: vue.ref,
      onMounted: vue.onMounted,
      onUnmounted: vue.onUnmounted,
      useRoute: () => ({ path: '/' }),
      useI18n: () => ({ t: (key, fallback) => (fallback === undefined ? key : fallback), locale: { value: 'en' } }),
      useMainStore: () => ({ mockApi: true }),
      useAuthStore: () => app.auth,
      useModalStore: () => ({ showLoginModal: false, showRegisterModal: false, handleLoginSuccess: () => {}, openLogin: () => {}, openRegister: () => {}, closeAll: () => {}, switchToRegister: () => {}, switchToLogin: () => {} }),
      SUPPORTED_LANGUAGES: ['en'],
      loadLanguageAsync: async () => {},
    });

    const state = navbar.useNavbar();
    state.handleLogout();
    await state.confirmLogout();

    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/logout').length, 1, 'the Navbar caller must reach the backend once');
    assert.equal(app.auth.token, null, 'local session is cleared even when revocation failed');
    assert.equal(state.lastLogoutResult.value?.revoked, false, 'UI keeps the revocation failure visible instead of claiming success');
    assert.equal(state.lastLogoutResult.value?.status, 503);
    assert.ok(state.logoutWarningMessage.value.length > 0, 'the user is told the session is only revoked locally');
    assert.equal(state.showLogoutConfirm.value, false);
    assert.equal(state.isLoggingOut.value, false);
  });
});

describe('F02 — transport retries only idempotent requests', () => {
  const mutationCases = ['post /api/advanced-audit/truncate', 'post /api/admin/users', 'post /api/user/change-password', 'put /api/admin/users/7', 'patch /api/kv-admin/configs/JWT_SECRET', 'delete /api/admin/token-blacklist/9'];

  for (const route of mutationCases) {
    test(`${route} is sent once on 500`, async () => {
      const app = bootApp({ routes: { [route]: fail(500, 'INTERNAL', 'boom'), 'post /api/auth/logout': ok({}) } });
      const method = route.split(' ')[0];

      await assert.rejects(() => app.http.apiClient({ url: route.split(' ')[1], method, headers: {} }));

      assert.equal(app.transport.calls.filter((call) => call.key === route).length, 1, 'a mutation must never be replayed without an idempotency contract');
    });
  }

  test('a lost response (network error) does not replay a mutation', async () => {
    const app = bootApp({ routes: { 'post /api/advanced-audit/truncate': { networkError: 'socket hang up' } } });

    await assert.rejects(() => app.http.apiClient({ url: '/api/advanced-audit/truncate', method: 'post', headers: {} }));
    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/advanced-audit/truncate').length, 1);
  });

  test('GET retries a 500 up to the configured limit', async () => {
    const app = bootApp({ routes: { 'get /api/audit/logs': fail(500, 'INTERNAL', 'boom') } });
    app.http.apiClient.defaults.retryDelay = 1;

    await assert.rejects(() => app.http.apiClient({ url: '/api/audit/logs', method: 'get', headers: {}, retry: 2, retryDelay: 1 }));
    assert.equal(app.transport.calls.filter((call) => call.key === 'get /api/audit/logs').length, 3, 'GET may retry: 1 initial + 2 retries');
  });

  test('GET does not retry 503 or 429 (no retry storm against an overloaded backend)', async () => {
    for (const status of [503, 429]) {
      const app = bootApp({ routes: { 'get /api/audit/logs': fail(status, 'DB_UNAVAILABLE', 'busy') } });
      await assert.rejects(() => app.http.apiClient({ url: '/api/audit/logs', method: 'get', headers: {}, retry: 2, retryDelay: 1 }));
      assert.equal(app.transport.calls.filter((call) => call.key === 'get /api/audit/logs').length, 1, `status ${status} must not be retried`);
    }
  });

  test('an aborted/cancelled request is not retried', async () => {
    const app = bootApp({ routes: { 'get /api/audit/logs': { cancelled: true } } });

    await assert.rejects(() => app.http.apiClient({ url: '/api/audit/logs', method: 'get', headers: {}, retry: 2, retryDelay: 1 }));
    assert.equal(app.transport.calls.filter((call) => call.key === 'get /api/audit/logs').length, 1);
  });

  test('auth endpoints are never retried', async () => {
    const app = bootApp({ routes: { 'post /api/auth/login': fail(500, 'INTERNAL', 'boom') } });

    await assert.rejects(() => app.http.apiClient({ url: '/api/auth/login', method: 'post', headers: {} }));
    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/login').length, 1);
  });

  test('a mutation rejected with 401 is not replayed after a successful refresh', async () => {
    const app = bootApp({
      routes: {
        'post /api/admin/users': fail(401, 'UNAUTHORIZED', 'expired'),
        'post /api/auth/refresh_token': ok(baseSession({ access_token: 'FAKE_ACCESS_A2' })),
      },
    });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    await assert.rejects(() => app.http.apiClient({ url: '/api/admin/users', method: 'post', headers: {} }));

    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/admin/users').length, 1, 'the server may already have run the handler; no replay');
    assert.ok(app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token').length <= 1, 'at most one refresh attempt');
  });

  test('a safe GET rejected with 401 is replayed once after a refresh', async () => {
    const app = bootApp({
      routes: {
        'get /api/user/profile': (config) => (config.headers.Authorization === 'Bearer FAKE_ACCESS_A2'
          ? ok(baseSession())
          : fail(401, 'UNAUTHORIZED', 'revoked')),
        'post /api/auth/refresh_token': ok(baseSession({ access_token: 'FAKE_ACCESS_A2', refresh_token: 'FAKE_REFRESH_A2' })),
      },
    });
    // The access token is not expired, so it is sent as-is and rejected by the backend.
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    const response = await app.http.apiClient({ url: '/api/user/profile', method: 'get', headers: {} });

    assert.equal(response.status, 200);
    assert.equal(app.transport.calls.filter((call) => call.key === 'get /api/user/profile').length, 2, 'exactly one replay');
    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token').length, 1, 'exactly one refresh');
  });

  test('a safe GET is refreshed before it is sent, so no 401 round-trip is needed', async () => {
    const app = bootApp({
      routes: {
        'get /api/user/profile': (config) => (config.headers.Authorization === 'Bearer FAKE_ACCESS_A2'
          ? ok(baseSession())
          : fail(401, 'UNAUTHORIZED', 'expired')),
        'post /api/auth/refresh_token': ok(baseSession({ access_token: 'FAKE_ACCESS_A2', refresh_token: 'FAKE_REFRESH_A2' })),
      },
    });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    const response = await app.http.apiClient({ url: '/api/user/profile', method: 'get', headers: {} });

    assert.equal(response.status, 200);
    assert.equal(app.transport.calls.filter((call) => call.key === 'get /api/user/profile').length, 1, 'an expired token is never sent');
  });
});

describe('F03 — API identity isolation', () => {
  test('a token issued by API A is never attached to a request for API B', async () => {
    const app = bootApp({ routes: { 'get /api/user/profile': ok(baseSession()) } });
    app.storage.setItem('api-base-url', API_A);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    await app.http.apiClient({ url: '/api/user/profile', method: 'get', headers: {} });
    const firstCall = app.transport.calls.at(-1);
    assert.equal(firstCall.config.headers.Authorization, 'Bearer FAKE_ACCESS_A');

    // User switches the API endpoint to server B.
    app.storage.setItem('api-base-url', API_B);
    app.http.setApiClientBaseUrl(API_B);

    await app.http.apiClient({ url: '/api/user/profile', method: 'get', headers: {} });
    const secondCall = app.transport.calls.at(-1);
    assert.equal(secondCall.config.baseURL, API_B);
    assert.equal(secondCall.config.headers.Authorization, undefined, 'server B must not receive server A credentials');
  });

  test('changing the API identity clears the session so the UI must ask for a new login', async () => {
    const app = bootApp({ routes: { 'get /api/user/profile': ok(baseSession()) } });
    app.storage.setItem('api-base-url', API_A);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);
    assert.equal(app.auth.isAuthenticated, true);

    app.storage.setItem('api-base-url', API_B);
    const outcome = app.auth.handleApiIdentityChange(app.http.normalizeApiBaseUrl(API_B));

    assert.equal(outcome.changed, true);
    assert.equal(app.auth.isAuthenticated, false, 'protected pages see isAuthenticated=false and run their existing reset path');
    assert.equal(app.auth.token, null);
    assert.equal(app.storage.getItem('token'), null);
  });

  test('two different base paths on the same origin are different identities', async () => {
    const app = bootApp({ routes: { 'get /api/user/profile': ok(baseSession()) } });
    app.storage.setItem('api-base-url', 'http://127.0.0.1:18788/tenant-a');
    app.storage.setItem('api-base-url', 'http://127.0.0.1:18788/tenant-a');
    app.http.setApiClientBaseUrl('http://127.0.0.1:18788/tenant-a');
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    await app.http.apiClient({ url: '/api/user/profile', method: 'get', headers: {} });
    assert.equal(app.transport.calls.at(-1).config.headers.Authorization, 'Bearer FAKE_ACCESS_A');

    app.http.setApiClientBaseUrl('http://127.0.0.1:18788/tenant-b');
    app.auth.handleApiIdentityChange(app.http.getApiIdentity());

    await app.http.apiClient({ url: '/api/user/profile', method: 'get', headers: {} });
    const call = app.transport.calls.at(-1);
    assert.equal(call.config.baseURL, 'http://127.0.0.1:18788/tenant-b');
    assert.equal(call.config.headers.Authorization, undefined);
  });

  test('an absolute URL pointing at another API identity does not receive the bearer token', async () => {
    const app = bootApp({ routes: {} });
    app.storage.setItem('api-base-url', API_A);
    app.http.setApiClientBaseUrl(API_A);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const config = await app.http.applyRequestInterceptors({ url: `${API_B}/api/user/profile`, method: 'get', headers: {} });
    assert.equal(config.headers.Authorization, undefined);
  });

  test('a late refresh response cannot restore a session after the identity changed', async () => {
    let releaseRefresh;
    const gate = new Promise((resolve) => { releaseRefresh = resolve; });
    const app = bootApp({
      routes: {
        'post /api/auth/refresh_token': async () => { await gate; return ok(baseSession({ access_token: 'FAKE_LATE_ACCESS', refresh_token: 'FAKE_LATE_REFRESH' })); },
        'get /api/user/profile': ok(baseSession()),
      },
    });
    app.storage.setItem('api-base-url', API_A);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    const pending = app.auth.refreshAccessToken();
    // User switches API server while the refresh request is in flight.
    app.storage.setItem('api-base-url', API_B);
    app.http.setApiClientBaseUrl(API_B);
    app.auth.handleApiIdentityChange(app.http.getApiIdentity());

    releaseRefresh();
    const token = await pending;

    assert.equal(token, null, 'a response for the old identity must not produce a usable token');
    assert.equal(app.auth.token, null);
    assert.equal(app.storage.getItem('token'), null);
  });

  test('legacy persisted tokens without an identity binding force a fresh login', async () => {
    const app = bootApp({ routes: {} });
    app.storage.setItem('api-base-url', API_A);
    app.storage.setItem('token', 'LEGACY_FAKE_ACCESS');
    app.storage.setItem('refresh_token', 'LEGACY_FAKE_REFRESH');
    app.storage.setItem('expires_at', String(NOW_SECONDS + ACCESS_TTL));
    app.storage.setItem('refresh_expires_at', String(NOW_SECONDS + REFRESH_TTL));
    app.storage.setItem('user', JSON.stringify(baseSession().user));

    app.auth.init();

    assert.equal(app.auth.token, null, 'unbound legacy session must not be trusted');
    assert.equal(app.auth.requiresReauth, true);
    assert.equal(app.storage.getItem('token'), null);
  });

  test('a session bound to the current identity is restored on init', async () => {
    const app = bootApp({ routes: {} });
    app.storage.setItem('api-base-url', API_A);
    app.storage.setItem('token', 'FAKE_ACCESS_A');
    app.storage.setItem('refresh_token', 'FAKE_REFRESH_A');
    app.storage.setItem('expires_at', String(NOW_SECONDS + ACCESS_TTL));
    app.storage.setItem('refresh_expires_at', String(NOW_SECONDS + REFRESH_TTL));
    app.storage.setItem('user', JSON.stringify(baseSession().user));
    app.storage.setItem('auth-api-identity', API_A);

    app.auth.init();

    assert.equal(app.auth.token, 'FAKE_ACCESS_A');
    assert.equal(app.auth.requiresReauth, false);
  });
});

describe('F04 — expiry, single-flight refresh and multi-tab coordination', () => {
  test('expiry is evaluated against a synced clock instead of a cached Date.now read', async () => {
    const app = bootApp({
      routes: {
        'get /api/user/profile': (config) => (config.headers.Authorization === 'Bearer FAKE_ACCESS_A2'
          ? ok(baseSession())
          : fail(401, 'UNAUTHORIZED', 'expired')),
        'post /api/auth/refresh_token': ok(baseSession({ access_token: 'FAKE_ACCESS_A2', refresh_token: 'FAKE_REFRESH_A2' })),
      },
    });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + 120, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    assert.equal(app.auth.isAccessTokenExpired, false);

    // The clock passes the expiry without any store mutation (the original bug was a getter that
    // cached the result of one Date.now() read and never expired again).
    app.clock.now = () => (NOW_SECONDS + 600) * 1000;

    const response = await app.http.apiClient({ url: '/api/user/profile', method: 'get', headers: {} });

    assert.equal(response.status, 200);
    assert.equal(app.auth.clockNow, NOW_SECONDS + 600, 'the request path synced the real clock');
    assert.equal(
      app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token').length,
      1,
      'expiry is recomputed per request, so exactly one refresh was needed'
    );
  });

  test('20 concurrent requests in one tab trigger exactly one refresh', async () => {
    const app = bootApp({
      routes: {
        'post /api/auth/refresh_token': ok(baseSession({ access_token: 'FAKE_ACCESS_A2', refresh_token: 'FAKE_REFRESH_A2' })),
        'get /api/user/profile': ok(baseSession()),
      },
    });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    await Promise.all(Array.from({ length: 20 }, () => app.auth.refreshAccessToken()));

    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token').length, 1);
    assert.equal(app.auth.token, 'FAKE_ACCESS_A2');
  });

  test('a losing tab adopts the winner session on REFRESH_ALREADY_ROTATED without minting again', async () => {
    const app = bootApp({
      routes: {
        'post /api/auth/refresh_token': fail(409, 'REFRESH_ALREADY_ROTATED', 'refresh token already rotated'),
      },
    });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    // A second tab on the same origin, sharing the same record: the winner of the race.
    const winnerTab = bootApp({ storage: app.storage });
    winnerTab.auth.init();
    assert.equal(winnerTab.auth.sessionId, app.auth.sessionId, 'both tabs own the same login session');

    const pending = app.auth.refreshAccessToken();
    setTimeout(() => {
      // The winner rotates the shared session and publishes it. It persists the record itself, which
      // is what the loser adopts: adoption is a read, so the loser must not write a second record.
      void winnerTab.auth.applyRotation({
        accessToken: 'FAKE_WINNER_ACCESS',
        refreshToken: 'FAKE_WINNER_REFRESH',
        expiresAt: NOW_SECONDS + ACCESS_TTL,
        refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
      }, winnerTab.auth.captureContext(), { predecessor: winnerTab.predecessor() });
    }, 5);

    const token = await pending;

    assert.equal(token, 'FAKE_WINNER_ACCESS', 'the winning session is adopted');
    assert.equal(app.storage.getItem('refresh_token'), 'FAKE_WINNER_REFRESH', 'the winner session is persisted');
    assert.equal(app.auth.token, 'FAKE_WINNER_ACCESS', 'and the losing tab holds it in memory');
    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token').length, 1, 'no second mint');
  });

  test('a refresh conflict without a winner inside the timeout asks for a new login exactly once', async () => {
    const app = bootApp({
      routes: { 'post /api/auth/refresh_token': fail(409, 'REFRESH_ALREADY_ROTATED', 'rotated') },
      sessionConflictTimeoutMs: 40,
    });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    const token = await app.auth.refreshAccessToken();

    assert.equal(token, null);
    assert.equal(app.auth.requiresReauth, true);
    assert.equal(app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token').length, 1, 'never loop or mint again');
  });

  test('503 or network failure during refresh does not clear the session', async () => {
    for (const route of [fail(503, 'DB_UNAVAILABLE', 'down'), { networkError: 'offline' }]) {
      const app = bootApp({ routes: { 'post /api/auth/refresh_token': route } });
      await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
      app.auth.syncClock();

      const token = await app.auth.refreshAccessToken();

      assert.equal(token, null);
      assert.equal(app.auth.token, 'FAKE_ACCESS_A', 'a temporary failure must not be treated as an invalid token');
      assert.equal(app.storage.getItem('refresh_token'), 'FAKE_REFRESH_A');
      assert.equal(app.auth.requiresReauth, false);
    }
  });

  test('a rejected refresh token (401) clears the session and asks for a new login', async () => {
    const app = bootApp({ routes: { 'post /api/auth/refresh_token': fail(401, 'INVALID_REFRESH_TOKEN', 'revoked') } });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    const token = await app.auth.refreshAccessToken();

    assert.equal(token, null);
    assert.equal(app.auth.token, null);
    assert.equal(app.auth.requiresReauth, true);
  });

  test('logging out while a refresh is in flight cannot resurrect the session', async () => {
    let releaseRefresh;
    const gate = new Promise((resolve) => { releaseRefresh = resolve; });
    const app = bootApp({
      routes: {
        'post /api/auth/refresh_token': async () => { await gate; return ok(baseSession({ access_token: 'FAKE_LATE_ACCESS', refresh_token: 'FAKE_LATE_REFRESH' })); },
        'post /api/auth/logout': ok({ revoked: true }),
      },
    });
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS - 10, NOW_SECONDS + REFRESH_TTL);
    app.auth.syncClock();

    const pending = app.auth.refreshAccessToken();
    await app.auth.logoutRemote();
    releaseRefresh();
    await pending;

    assert.equal(app.auth.token, null, 'generation guard must drop the late refresh response');
    assert.equal(app.storage.getItem('token'), null);
  });
});

describe('OF-02 — the credential boundary is decided by the URL that is really sent', () => {
  test('an ordinary relative endpoint under a base path is in scope and keeps the bearer', async () => {
    const app = bootApp({ routes: { 'get /api/user/profile': ok(baseSession()) } });
    const baseWithPath = `${API_A}/tenant-a`;
    app.storage.setItem('api-base-url', baseWithPath);
    app.http.setApiClientBaseUrl(baseWithPath);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const config = await app.http.applyRequestInterceptors({ url: '/api/user/profile', method: 'get', headers: {} });

    assert.equal(config.__identityMatches, true, 'a normal request must not be treated as cross-origin');
    assert.equal(config.headers.Authorization, 'Bearer FAKE_ACCESS_A');
  });

  test('a same-origin absolute URL outside the configured base path loses the bearer', async () => {
    const app = bootApp({ routes: {} });
    const baseWithPath = `${API_A}/tenant-a`;
    app.storage.setItem('api-base-url', baseWithPath);
    app.http.setApiClientBaseUrl(baseWithPath);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const config = await app.http.applyRequestInterceptors({
      url: `${API_A}/other-tenant/api/user/profile`,
      method: 'get',
      headers: { Authorization: 'Bearer FAKE_ACCESS_A' }
    });

    assert.equal(config.__identityMatches, false);
    assert.equal(config.headers.Authorization, undefined, 'same origin is not enough; the base path is part of the boundary');
  });

  test('a base path is not matched by prefix, so /api-a-evil is not /api-a', async () => {
    const app = bootApp({ routes: {} });
    const baseWithPath = `${API_A}/api-a`;
    app.storage.setItem('api-base-url', baseWithPath);
    app.http.setApiClientBaseUrl(baseWithPath);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const config = await app.http.applyRequestInterceptors({
      url: `${API_A}/api-a-evil/api/user/profile`,
      method: 'get',
      headers: { Authorization: 'Bearer FAKE_ACCESS_A' }
    });

    assert.equal(config.headers.Authorization, undefined);
  });

  test('a protocol-relative URL is absolute and never inherits the configured base', async () => {
    const app = bootApp({ routes: {} });
    app.storage.setItem('api-base-url', API_A);
    app.http.setApiClientBaseUrl(API_A);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const config = await app.http.applyRequestInterceptors({
      url: `//${new URL(API_B).host}/api/user/profile`,
      method: 'get',
      headers: { Authorization: 'Bearer FAKE_ACCESS_A' }
    });

    assert.equal(config.__identityMatches, false, '//host is absolute, not relative to the page');
    assert.equal(config.headers.Authorization, undefined);
  });

  test('an auth endpoint outside the configured API is refused outright, not sent anonymously', async () => {
    const app = bootApp({ routes: {} });
    app.storage.setItem('api-base-url', API_A);
    app.http.setApiClientBaseUrl(API_A);

    await assert.rejects(
      () => app.http.applyRequestInterceptors({
        url: `${API_B}/api/auth/login`,
        method: 'post',
        headers: {}
      }),
      (error) => error.code === app.http.TRANSPORT_ERROR_CODES.CROSS_ORIGIN_REQUEST_REFUSED
    );
  });

  test('login and register never receive a bearer, even inside the configured API', async () => {
    const app = bootApp({ routes: {} });
    app.storage.setItem('api-base-url', API_A);
    app.http.setApiClientBaseUrl(API_A);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const login = await app.http.applyRequestInterceptors({ url: app.endpoints.API_ENDPOINTS.LOGIN, method: 'post', headers: {} });
    const register = await app.http.applyRequestInterceptors({ url: app.endpoints.API_ENDPOINTS.REGISTER, method: 'post', headers: {} });

    assert.equal(login.headers.Authorization, undefined);
    assert.equal(register.headers.Authorization, undefined);
  });

  test('the auth endpoints are still recognised when the API is served under a base path', async () => {
    const app = bootApp({ routes: {} });
    const baseWithPath = `${API_A}/gateway`;
    app.storage.setItem('api-base-url', baseWithPath);
    app.http.setApiClientBaseUrl(baseWithPath);
    await app.auth.login(baseSession().user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + ACCESS_TTL, NOW_SECONDS + REFRESH_TTL);

    const config = await app.http.applyRequestInterceptors({
      url: app.endpoints.API_ENDPOINTS.LOGIN,
      method: 'post',
      headers: {}
    });

    assert.equal(config.__isAuthRequest, true, 'a base path must not disable the credential-free auth rule');
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* FR6-A — every remote-logout outcome is owned by the operation that started it.                  */
/* ---------------------------------------------------------------------------------------------- */

describe('FR6-A — the remote logout owns its target, its promise and its flags', () => {
  const SESSION_B = {
    user: { id: 2, email: 'user-b@example.test', role: 'user' },
    accessToken: 'FAKE_ACCESS_B',
    refreshToken: 'FAKE_REFRESH_B',
    expiresAt: NOW_SECONDS + ACCESS_TTL,
    refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
  };

  const bootWithA = (logoutRoute) => {
    const app = bootApp({ baseUrl: API_A, routes: { 'post /api/auth/logout': logoutRoute } });
    app.auth.init();
    return app;
  };

  const signInA = async (app) => {
    const context = app.auth.beginLoginAttempt();
    const committed = await app.auth.commitLogin({
      user: baseSession().user,
      accessToken: baseSession().access_token,
      refreshToken: baseSession().refresh_token,
      expiresAt: baseSession().expires_at,
      refreshExpiresAt: baseSession().refresh_expires_at,
    }, context);
    assert.equal(committed.status, 'applied');
    return context;
  };

  for (const [label, route, expected] of [
    ['a confirmed 200', ok({ revoked: true }), { revoked: true, confirmed: true, reason: 'revoked' }],
    ['a 204', { status: 204, body: '' }, { revoked: true, confirmed: true, reason: 'revoked' }],
    ['a 503', fail(503, 'DB_UNAVAILABLE', 'database unavailable'), { revoked: false, confirmed: false, reason: 'request-failed' }],
    // An HTTP 200 whose body never says `success: true` — a proxy error page, or a schema the
    // frontend does not know. Neither is proof that the server session was revoked.
    ['a malformed 200 that only has HTTP 200', { status: 200, data: { not_a_confirmation: true } }, { revoked: false, confirmed: false, reason: 'not-confirmed' }],
    ['an HTML 200 error page', { status: 200, data: '<html>gateway</html>' }, { revoked: false, confirmed: false, reason: 'not-confirmed' }],
  ]) {
    test(`${label} reports its own result and never disturbs the session that replaced A`, async () => {
      const app = bootWithA(route);
      const context = await signInA(app);
      const sessionA = app.readRecord();

      const logoutA = app.auth.logoutRemote(context);

      const contextB = app.auth.beginLoginAttempt();
      const loginB = app.auth.commitLogin(SESSION_B, contextB);
      const [loginResult, logoutResult] = await Promise.all([loginB, logoutA]);

      assert.equal(loginResult.status, 'applied');
      for (const [field, value] of Object.entries(expected)) {
        assert.equal(logoutResult[field], value, `${label}: ${field}`);
      }

      const final = app.readRecord();
      assert.equal(final.state, 'active', `${label}: session B must stay active`);
      assert.equal(final.accessToken, SESSION_B.accessToken, `${label}: canonical record`);
      assert.equal(app.auth.token, SESSION_B.accessToken, `${label}: memory`);
      assert.equal(app.storage.getItem('token'), SESSION_B.accessToken, `${label}: mirror`);

      const calls = app.transport.calls.filter((call) => call.key === 'post /api/auth/logout');
      assert.equal(calls.length, 1, `${label}: exactly one revoke`);
      assert.equal(calls[0].config.headers.Authorization, `Bearer ${sessionA.accessToken}`, `${label}: A's bearer only`);
    });
  }

  test('a newer logout that starts while the first is in flight keeps its own promise and flags', async () => {
    const app = bootWithA(ok({ revoked: true }));
    const context = await signInA(app);

    const logoutA = app.auth.logoutRemote(context);

    // B signs in and is then logged out remotely, all while A's revoke is still in flight.
    const contextB = app.auth.beginLoginAttempt();
    await app.auth.commitLogin(SESSION_B, contextB);
    const logoutB = app.auth.logoutRemote(app.auth.captureContext());

    assert.notEqual(logoutA, logoutB, 'a login between two logouts must not make them the same operation');

    const [resultA, resultB] = await Promise.all([logoutA, logoutB]);

    assert.equal(resultA.revoked, true, 'A reports its own revoke');
    assert.equal(resultB.revoked, true, 'B reports its own revoke');

    // B's end is the last word, and A's `finally` did not reset B's in-flight state: with
    // `_logoutPromise` clobbered, a third click would have started a *new* operation.
    const third = app.auth.logoutRemote(app.auth.captureContext());
    const thirdResult = await third;
    assert.equal(thirdResult.revoked, false, 'nothing is left to revoke, so a third click is a no-op');
    assert.equal(app.auth._logoutPromise, null, 'the logout state is released exactly once, by its owner');
    assert.equal(app.readRecord().state, 'ended');
  });

  test('a timeout of the revoke is not a confirmation and is still visible to the caller', async () => {
    const app = bootApp({ baseUrl: API_A, routes: {
      'post /api/auth/logout': { status: 200, body: { success: true }, delayMs: 5000 },
    } });
    app.auth.init();
    const context = app.auth.beginLoginAttempt();
    await app.auth.commitLogin({
      user: baseSession().user,
      accessToken: baseSession().access_token,
      refreshToken: baseSession().refresh_token,
      expiresAt: baseSession().expires_at,
      refreshExpiresAt: baseSession().refresh_expires_at,
    }, context);

    app.http.setRequestTimeout?.(1);
    const result = await app.auth.logoutRemote(context);

    assert.equal(result.confirmed, false, 'a request that never completed is not a confirmed revocation');
    assert.equal(app.auth.token, null, 'the local session is still cleared');
    assert.equal(app.auth.sessionGeneration > 0, true);
  });
});
