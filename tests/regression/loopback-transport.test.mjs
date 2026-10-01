/**
 * Transport tests against a real Axios and a real HTTP server on 127.0.0.1.
 *
 * The other suites exercise the transport with a stand-in that keeps interceptor semantics. That
 * stand-in cannot show the things that only appear with the real client and a real socket: what the
 * server actually received, whether a request was sent twice, whether a replay happened at all, and
 * what happens when the connection is refused instead of answered.
 *
 * The review's own FA-01/FA-06 probes drove a real Axios instance. These are the same shape, but
 * they assert the secure behaviour, and the reproduction is not kept.
 *
 * Everything here is loopback: the server binds 127.0.0.1 on an ephemeral port, the tokens are
 * fakes, and no real API is contacted.
 */

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';

import axiosReal from 'axios';

import { ACCESS_TTL, NOW_SECONDS, REFRESH_TTL, bootApp } from './helpers/app-harness.mjs';

/** The real Axios of the version the browser loads from the CDN, forced onto Node's http adapter. */
const realAxios = axiosReal.create({ adapter: axiosReal.getAdapter('http') });
const { version: AXIOS_VERSION } = createRequire(import.meta.url)('axios/package.json');

const ACCESS_1 = 'ACCESS_LOOPBACK_1';
const REFRESH_1 = 'REFRESH_LOOPBACK_1';
/** Expiry is epoch seconds, in the same frame as the harness clock. */
const FUTURE = NOW_SECONDS + ACCESS_TTL;
const FUTURE_REFRESH = NOW_SECONDS + REFRESH_TTL;
const USER = { id: 1, email: 'a@example.test' };
const CLOSED_PORT_ORIGIN = 'http://127.0.0.1:1';

/**
 * The server answers by path, never by arrival order. A queue looks simpler, but with a real
 * socket the order is decided by the network: the first test written that way handed a queued
 * `401` to the refresh call and then blamed the session logic for ending the session.
 */
const server = {
  origin: '',
  handle: null,
  /** What `/api/auth/login` answers with right now; `signIn` sets it per call. */
  login: null,
  /** Everything the server saw, in order. */
  seen: [],
  listener: null,
};

function record(request) {
  server.seen.push({
    method: request.method,
    url: request.url,
    authorization: request.headers.authorization || null,
  });
}

function readBody(request) {
  return new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch (_error) {
        resolve(raw);
      }
    });
  });
}

function json(response, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    ...headers,
  });
  response.end(payload);
}

/** A response the test releases by hand, for the case "the request is in flight when the session changes". */
function deferred() {
  let release = () => {};
  const gate = new Promise((resolve) => { release = resolve; });
  return { wait: () => gate, release: () => release() };
}

before(async () => {
  const listener = http.createServer(async (request, res) => {
    record(request);
    const body = await readBody(request);
    const responder = server.handle ? server.handle(request, body) : null;
    if (!responder) {
      json(res, 500, { success: false, error: { code: 'UNEXPECTED_REQUEST', message: request.url } });
      return;
    }
    await responder(request, res, body);
  });
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  server.origin = `http://127.0.0.1:${listener.address().port}`;
  server.listener = listener;
});

after(async () => {
  if (server.listener) await new Promise((resolve) => server.listener.close(resolve));
});

/** The login path, answering with whatever `signIn` last declared. */
const loginRoute = (_request, response) => json(response, 200, { success: true, data: server.login });

function bootLoopbackApp(handle) {
  server.handle = handle;
  server.login = loginPayload();
  server.seen.length = 0;
  // The API base is set the way `init.js` sets it, and the real client is handed to the harness
  // exactly as `vue/Loader.js` hands `window.axios` to the page.
  return bootApp({ axiosInstance: realAxios, baseUrl: server.origin, origin: server.origin });
}

function loginPayload(overrides = {}) {
  return {
    user: USER,
    access_token: ACCESS_1,
    refresh_token: REFRESH_1,
    expires_at: FUTURE,
    refresh_expires_at: FUTURE_REFRESH,
    ...overrides,
  };
}

function refreshPayload(overrides = {}) {
  return {
    user: USER,
    access_token: 'ACCESS_ROTATED',
    refresh_token: 'REFRESH_ROTATED',
    expires_at: FUTURE,
    refresh_expires_at: FUTURE_REFRESH,
    ...overrides,
  };
}

/** A handle that always refuses, so only the declared paths are answered. */
function routes(table) {
  return (request) => table[request.url] || null;
}

/** The session store logged in the way the app does: attempt, request, commit against that attempt. */
async function signIn(app, login = loginPayload()) {
  server.login = login;
  const context = app.auth.beginLoginAttempt();
  const response = await app.http.apiClient.post('/api/auth/login', { email: USER.email, password: 'fake' });
  assert.equal(response.data.success, true, 'the login endpoint answered');
  const accepted = await app.auth.commitLogin({
    user: response.data.data.user,
    accessToken: response.data.data.access_token,
    refreshToken: response.data.data.refresh_token,
    expiresAt: response.data.data.expires_at,
    refreshExpiresAt: response.data.data.refresh_expires_at,
  }, context);
  assert.equal(accepted.status, 'applied', 'the login response must be accepted and persisted');
  return app.readRecord();
}

async function settle() {
  for (let i = 0; i < 8; i += 1) {
    // Two turns each: the axios promise chain, then the store's write promise.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
  }
}

const countFor = (url) => server.seen.filter((entry) => entry.url === url).length;

describe(`loopback transport (real axios ${AXIOS_VERSION})`, () => {
  test('a 401 rotates the session once and replays the request with the new bearer', async () => {
    let refreshes = 0;
    const app = bootLoopbackApp(routes({
      '/api/auth/login': loginRoute,
      '/api/protected': (_request, response) => json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } }),
      '/api/auth/refresh_token': (_request, response) => {
        refreshes += 1;
        return json(response, 200, { success: true, data: refreshPayload() });
      },
    }));

    // The replay comes back to the same path, so the path answers differently once the rotation has
    // been applied. A handler that always returned 401 would loop.
    let replays = 0;
    server.handle = (request) => {
      if (request.url === '/api/protected' && request.headers.authorization === 'Bearer ACCESS_ROTATED') {
        replays += 1;
        return (_r, response) => json(response, 200, { success: true, data: { value: 42 } });
      }
      return routes({
        '/api/auth/login': loginRoute,
        '/api/protected': (_r, response) => json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } }),
        '/api/auth/refresh_token': (_r, response) => {
          refreshes += 1;
          return json(response, 200, { success: true, data: refreshPayload() });
        },
      })(request);
    };

    const session = await signIn(app);
    const result = await app.http.apiClient.get('/api/protected');
    await settle();

    assert.equal(result.data.data.value, 42, 'the request completed after the replay');
    assert.equal(app.auth.token, 'ACCESS_ROTATED', 'the rotated access token is in memory');
    assert.equal(app.auth.refreshToken, 'REFRESH_ROTATED');
    assert.equal(app.auth.sessionId, session.sessionId, 'the session id did not change: this was a rotation');
    assert.equal(refreshes, 1, 'one refresh call');
    assert.equal(replays, 1, 'exactly one replay, not a loop');
    assert.equal(countFor('/api/protected'), 2, 'the failed request and one replay reached the server');
  });

  test('several requests that 401 at once share one refresh and one rotation', async () => {
    let refreshes = 0;
    const app = bootLoopbackApp(routes({
      '/api/auth/login': loginRoute,
      '/api/auth/refresh_token': (_request, response) => {
        refreshes += 1;
        return json(response, 200, { success: true, data: refreshPayload() });
      },
    }));

    // A protected path that answers 401 until the rotation has been applied, then 200.
    server.handle = (request) => {
      if (request.url === '/api/auth/login') return loginRoute;
      if (request.url === '/api/auth/refresh_token') {
        return (_r, response) => {
          refreshes += 1;
          return json(response, 200, { success: true, data: refreshPayload() });
        };
      }
      if (request.url.startsWith('/api/item/')) {
        if (request.headers.authorization === 'Bearer ACCESS_ROTATED') {
          return (_r, response) => json(response, 200, { success: true, data: { ok: true } });
        }
        return (_r, response) => json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
      }
      return null;
    };

    await signIn(app);
    const results = await Promise.allSettled([
      app.http.apiClient.get('/api/item/1'),
      app.http.apiClient.get('/api/item/2'),
      app.http.apiClient.get('/api/item/3'),
    ]);
    await settle();

    assert.deepEqual(results.map((entry) => entry.status), ['fulfilled', 'fulfilled', 'fulfilled'], 'every request recovered');
    assert.equal(refreshes, 1, `one refresh, not three: the flight is shared (got ${refreshes})`);
    assert.equal(app.auth.token, 'ACCESS_ROTATED', 'the shared rotation is in memory');
    assert.equal(app.readRecord().version, 2, `the record was written once (got version ${app.readRecord().version})`);
    assert.equal(app.auth.requiresReauth, false, 'a shared refresh is not a reason to log the user out');
    assert.equal(app.readRecord().state, 'active', 'the session was not turned into a tombstone');
  });

  test('a 401 of a request that was already superseded neither refreshes nor replays', async () => {
    const gate = deferred();
    const arrived = deferred();
    let refreshes = 0;
    const app = bootLoopbackApp(routes({
      '/api/auth/login': loginRoute,
      '/api/slow': async (_request, response) => {
        arrived.release();
        await gate.wait();
        json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
      },
      '/api/auth/refresh_token': (_request, response) => {
        refreshes += 1;
        return json(response, 200, { success: true, data: refreshPayload() });
      },
    }));

    const first = await signIn(app);

    // The request is sent and bound to the first session; the server has it.
    const pending = app.http.apiClient.get('/api/slow');
    await arrived.wait();

    // The user logs in again while the answer is still held: a new session, a new epoch.
    await signIn(app, loginPayload({ access_token: 'ACCESS_S2', refresh_token: 'REFRESH_S2' }));
    const second = app.readRecord();
    assert.notEqual(second.sessionId, first.sessionId, 'a second login is a new session, not a rotation');

    assert.equal(app.auth.token, 'ACCESS_S2', 'the second login is in memory before the stale answer lands');
    gate.release();
    await assert.rejects(() => pending);
    await settle();

    assert.equal(refreshes, 0, 'a superseded request must not spend the new session\'s refresh token');
    assert.equal(countFor('/api/slow'), 1, 'and it is not replayed');
    assert.equal(app.auth.token, 'ACCESS_S2', 'the current session kept its own token');
    assert.equal(app.auth.sessionId, second.sessionId, 'the session id did not move backwards');
    assert.equal(app.readRecord().accessToken, 'ACCESS_S2', 'the record is the second login\'s own');
    assert.ok(
      app.readRecord().version > first.version,
      `the version moved forward and not backwards (${first.version} -> ${app.readRecord().version})`
    );
    assert.equal(app.readRecord().state, 'active');
  });

  test('a rotation the server answers with an ended session ends this one and replays nothing', async () => {
    const app = bootLoopbackApp(routes({
      '/api/auth/login': loginRoute,
      '/api/protected': (_request, response) => json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } }),
      '/api/auth/refresh_token': (_request, response) => json(response, 401, {
        success: false,
        error: { code: 'TOKEN_EXPIRED', session: { state: 'ended' } },
      }),
    }));

    await signIn(app);
    await assert.rejects(() => app.http.apiClient.get('/api/protected'));
    await settle();

    assert.equal(app.auth.token, null, 'the bearer is gone from memory');
    assert.equal(app.auth.sessionId, null);
    assert.equal(countFor('/api/protected'), 1, 'a dead session is not replayed');
    assert.equal(app.readRecord().state, 'ended', 'a tombstone was written for the other tabs to see');
    assert.equal(app.auth.requiresReauth, true, 'the user is asked to log in again');
  });

  test('a busy backend keeps the session instead of logging the user out', async () => {
    const app = bootLoopbackApp(routes({
      '/api/auth/login': loginRoute,
      '/api/protected': (_request, response) => json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } }),
      '/api/auth/refresh_token': (_request, response) => json(response, 503, { success: false, error: { code: 'BUSY' } }),
    }));

    await signIn(app);
    await assert.rejects(() => app.http.apiClient.get('/api/protected'));
    await settle();

    assert.equal(app.auth.token, ACCESS_1, 'a 5xx is not an invalid token');
    assert.equal(app.auth.requiresReauth, false, 'the user is not asked to log in again');
    assert.equal(app.readRecord().state, 'active', 'the record was not turned into a tombstone');
  });

  test('a mutation rejected with 401 is not replayed', async () => {
    const app = bootLoopbackApp(routes({
      '/api/auth/login': loginRoute,
      '/api/mutate': (_request, response) => json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } }),
      '/api/auth/refresh_token': (_request, response) => json(response, 200, { success: true, data: refreshPayload() }),
    }));

    await signIn(app);
    await assert.rejects(() => app.http.apiClient.post('/api/mutate', { value: 1 }));
    await settle();

    assert.equal(countFor('/api/mutate'), 1, 'the POST was sent once: it may already have run on the server');
    assert.equal(app.auth.token, ACCESS_1, 'the session is untouched: nothing claimed it was over');
  });

  test('a request to a foreign origin is refused and no bearer leaves the tab', async () => {
    const app = bootLoopbackApp(routes({
      '/api/auth/login': loginRoute,
    }));
    await signIn(app);

    await assert.rejects(() => app.http.apiClient.get('http://127.0.0.1:1/api/steal'));

    assert.equal(server.seen.filter((entry) => entry.url === '/api/steal').length, 0, 'the foreign path was never requested');
    assert.equal(app.auth.token, ACCESS_1, 'the session is intact');
  });

  test('a refused connection is reported without ending the session', async () => {
    let refreshes = 0;
    const app = bootLoopbackApp(routes({
      '/api/auth/login': loginRoute,
      '/api/protected': (_request, response) => json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } }),
      '/api/auth/refresh_token': (_request, response) => {
        refreshes += 1;
        return json(response, 200, { success: true, data: refreshPayload() });
      },
    }));

    // A second listener that is closed again, so the identity is the same and the socket is not.
    const dead = http.createServer();
    await new Promise((resolve) => dead.listen(0, '127.0.0.1', resolve));
    const deadOrigin = `http://127.0.0.1:${dead.address().port}`;
    await new Promise((resolve) => dead.close(resolve));

    await signIn(app);
    server.seen.length = 0;
    app.http.setApiClientBaseUrl(deadOrigin);
    // The record is bound to the previous identity, so the session is re-established for the new
    // one exactly as a tab that was re-pointed would.
    const context = app.auth.beginLoginAttempt();
    app.auth.commitLogin({ user: USER, accessToken: ACCESS_1, refreshToken: REFRESH_1, expiresAt: FUTURE, refreshExpiresAt: FUTURE_REFRESH }, context);
    await app.auth.flushSessionWrites();

    await assert.rejects(() => app.http.apiClient.get('/api/protected', { timeout: 2000 }));
    await settle();

    assert.equal(app.auth.token, ACCESS_1, 'an unreachable backend is not an invalid token');
    assert.equal(app.auth.requiresReauth, false, 'the user is not asked to log in again');
    assert.equal(app.readRecord().state, 'active', 'the record was not turned into a tombstone');
  });
});

test('R11 history review: a gateway 401 refreshes and replays within the same full API identity', async () => {
  const app = bootLoopbackApp(routes({
    '/gateway/api/auth/login': loginRoute,
    '/gateway/api/auth/refresh_token': (_r, response) => json(response, 200, { success: true, data: refreshPayload() }),
    '/gateway/api/protected': (request, response) => request.headers.authorization === 'Bearer ACCESS_ROTATED'
      ? json(response, 200, { success: true, data: { value: 42 } })
      : json(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } }),
  }));
  app.http.setApiClientBaseUrl(`${server.origin}/gateway`);
  await signIn(app);
  const response = await app.http.apiClient.get('/api/protected');
  assert.equal(response.data.data.value, 42);
  assert.equal(countFor('/gateway/api/protected'), 2);
  assert.equal(countFor('/gateway/api/auth/refresh_token'), 1);
  assert.equal(app.readRecord().identity, `${server.origin}/gateway`);
});

test('R11 history review: credential-free endpoints strip caller supplied bearer headers on the wire', async () => {
  const app = bootLoopbackApp(() => (_r, response) => json(response, 200, { success: true, data: {} }));
  for (const endpoint of [app.endpoints.API_ENDPOINTS.LOGIN, app.endpoints.API_ENDPOINTS.REGISTER,
    app.endpoints.API_ENDPOINTS.PUBLIC_HEALTH, app.endpoints.API_ENDPOINTS.PUBLIC_VERSION,
    app.endpoints.API_ENDPOINTS.PUBLIC_LANGUAGE]) {
    await app.http.apiClient.get(endpoint, { headers: { authorization: 'Bearer FAKE_CALLER_ACCESS' } });
    assert.equal(server.seen.at(-1).authorization, null, `credential-free endpoint ${endpoint}`);
  }
});
