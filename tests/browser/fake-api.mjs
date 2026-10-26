/**
 * Loopback stand-ins for the browser suite: a static server for this worktree and a fake API.
 *
 * The browser suite must not need a deployment, a real backend or an owner's credentials, and it
 * must not be able to reach anything but 127.0.0.1. Both servers here bind the loopback interface
 * only, and every token they hand out is a fake.
 *
 * Run directly (`node tests/browser/fake-api.mjs`) or let Playwright start it as a web server.
 */

import http from 'node:http';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildManifest } from '../../tools/frontend-source-identity.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The digest of the tree this server is serving, taken once.
 *
 * `buildManifest` is the same function the evidence and the validator use, deliberately: a second hashing
 * routine in the fake API would be a second definition of "the source", and the two would drift, and then
 * the comparison below would be between two different things that both call themselves the digest.
 */
let cachedDigest = null;
const actualDigest = () => {
  if (cachedDigest === null) cachedDigest = buildManifest(REPO_ROOT).digest;
  return cachedDigest;
};

const STATIC_PORT = Number(process.env.FRONTEND_STATIC_PORT || 4173);
const API_PORT = Number(process.env.FRONTEND_API_PORT || 18788);

/**
 * Static-only mode: serve this worktree and nothing else.
 *
 * The integration run needs the app under test served from the tree, but it must reach a *prepared
 * backend*. Starting the fake API alongside it would put a stand-in one request away from every
 * integration assertion, so the integration config asks for static only and says so in its own
 * output. A run that wanted a mock here is the mock suite, which is a different config.
 */
const STATIC_ONLY = /^(1|true|yes)$/i.test(String(process.env.FRONTEND_STATIC_ONLY || ''));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

/**
 * The contract answers the fake API gives, and the outcomes a test can force.
 *
 * The defaults are deliberately *unconfirmed*: `capabilities` carries no export or monitoring keys at
 * all, so a page that trusts an unconfirmed capability fails closed. A test that wants a control
 * enabled posts a real answer to `/__fake/config` and the page must follow it. That is the whole
 * point of the contract mock — it is a peer that can be told the truth, not a stub that always says
 * yes.
 */
const DEFAULT_CONFIG = {
  /** Merged into every response that carries a capability map. `{}` means "the backend said nothing". */
  capabilities: {},
  contractRevision: null,
  /** The role `login` hands out, so a gate that is super-admin only can actually be reached. */
  userRole: 'admin',
  /** How long a login's access token is valid. Negative means already expired, which is how a test
   *  puts the app on the refresh path without waiting an hour for it. */
  accessTtlSeconds: 3600,
  refreshTtlSeconds: 259200,
  /** Export formats the backend accepts. Anything else must come back as UNSUPPORTED_EXPORT_OPTION. */
  exportFormats: ['json', 'csv'],
  /** `env-comparison` payload. A test can put a raw secret in here on purpose. */
  envComparison: {
    COMPARISON_KEY: { source: 'kv', kv: { configured: true, masked: null }, env: { configured: true, masked: null } },
    OTHER_KEY: { source: 'env', kv: { configured: false, masked: null }, env: { configured: true, masked: 'wh****xy' } }
  },
  /** Whether continuous monitoring is already running when the status endpoint is asked. */
  monitoringActive: false,
  forced: {
    /**
     * Answers the next authenticated non-auth request with 401, once, and then forgets it. This is how
     * a test provokes a rotation with a *valid* TTL: an already-expired token refreshes again after
     * every rotation, so it measures a loop rather than a race.
     */
    staleAccessOnce: false,
    /**
     * Whether a logout really revokes at this peer. Set to false to reach the state a real deployment is
     * in when a revoke has not propagated yet: the client believes the session ended, the peer has not
     * heard, and a rotation of the old credential still succeeds. That is the answer a late predecessor
     * race is actually about.
     */
    revokeOnLogout: true,
    refreshStatus: 200,
    /** A rotation that is already gone: the 401 the stale-refresh path has to survive. */
    refreshReplay: false,
    /** Status for the monitoring start/stop calls, used to prove a refusal is reported, not hidden. */
    monitoringStartStatus: 200,
    /** Latency in ms per route prefix, so a test can hold a response open deterministically. */
    delayMs: {},
    /** Fails the next N writes to the origin, used to reach the degraded paths. */
    failNext: {}
  }
};

const state = {
  /** refresh token -> session, so a rotation can be issued and a replay refused. */
  sessions: new Map(),
  requests: [],
  config: structuredClone(DEFAULT_CONFIG),
  /**
   * Requests parked because the test asked for a held response, as `{ prefix, path, resolve }`. This
   * is how a test knows the server has *received* a request and has not *answered* it yet — a state a
   * fixed delay can only approximate.
   */
  holdWaiters: [],
  /** Every response this peer has finished sending, so "the answer is out" is observable too. */
  completed: []
};

const user = () => ({
  id: 1,
  email: 'browser@example.test',
  name: 'Browser Test',
  role: state.config.userRole
});

/** Every answer that carries capabilities carries the same map, as one backend would. */
const withCapabilities = (data) => {
  const payload = { ...data };
  if (Object.keys(state.config.capabilities).length > 0) {
    payload.capabilities = { ...state.config.capabilities };
  }
  if (state.config.contractRevision) payload.contractRevision = state.config.contractRevision;
  return payload;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Every issuance is distinct.
 *
 * These used to be `label + epoch seconds`, so two logins inside the same second handed out the same
 * two strings. A suite that then asserts "the token changed" is asserting on a string that may not
 * have changed at all, and a test that expects a conflict cannot provoke one.
 */
let issuanceSeq = 0;
const uniqueSuffix = () => `${nowSeconds()}_${(issuanceSeq += 1).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function issueSession(label) {
  const suffix = uniqueSuffix();
  const sessionId = `browser-session-${label}-${suffix}`;
  const refreshToken = `FAKE_REFRESH_${label}_${suffix}`;
  const session = {
    // The label travels with the session so a rotation can name itself without inheriting the
    // previous session id: a token built from the old id grows by a constant every rotation, which is
    // both a lie about token size and a trap for anything that asserts on the string.
    label,
    sessionId,
    refreshToken,
    accessToken: `FAKE_ACCESS_${label}_${suffix}`,
    expiresAt: nowSeconds() + state.config.accessTtlSeconds,
    refreshExpiresAt: nowSeconds() + state.config.refreshTtlSeconds,
  };
  state.sessions.set(refreshToken, session);
  return session;
}

function rotate(refreshToken) {
  const existing = state.sessions.get(refreshToken);
  if (!existing) return null;
  state.sessions.delete(refreshToken);
  return issueSession('rotation');
}

const sessionBody = (session) => ({
  user: user(),
  access_token: session.accessToken,
  refresh_token: session.refreshToken,
  expires_at: session.expiresAt,
  refresh_expires_at: session.refreshExpiresAt
});

function readBody(request) {
  return new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (_error) {
        resolve({});
      }
    });
  });
}

function sendJson(response, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-expose-headers': '*',
    ...headers,
  });
  response.end(payload);
}

const handleFakeApi = async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, `http://127.0.0.1:${API_PORT}`);
  const body = await readBody(request);
  state.requests.push({
    method: request.method,
    path: url.pathname,
    // Which server was actually asked. `api-base-url` is a preference; this is the fact, and the
    // two disagreeing is exactly what an endpoint-switch test has to be able to see.
    host: request.headers.host || null,
    authorization: request.headers.authorization || null
  });

  // `/__fake/*` is never delayed and never held: it is the control plane a test uses to observe.
  if (!url.pathname.startsWith('/__fake/')) {
    // A held response, if the test asked for one. The request is recorded before this point, so
    // "received but not answered" is a state the fixture log already proves. Nothing here uses a
    // duration: the test releases it when it has finished looking.
    const heldRoute = (state.config.forced.holdRoutes || [])
      .filter((prefix) => url.pathname.startsWith(prefix))
      .sort((a, b) => b.length - a.length)[0];
    if (heldRoute) {
      await new Promise((resolve) => state.holdWaiters.push({ prefix: heldRoute, path: url.pathname, resolve }));
    }

    const delays = state.config.forced.delayMs || {};
    const key = Object.keys(delays)
      .filter((prefix) => url.pathname.startsWith(prefix))
      .sort((a, b) => b.length - a.length)[0];
    if (key && Number(delays[key]) > 0) await delay(Number(delays[key]));
  }

  if (url.pathname === '/__fake/requests') {
    sendJson(response, 200, { requests: state.requests });
    return;
  }

  // The control plane. A test tells this peer what to answer, which is what makes the mock a peer
  // instead of a rubber stamp: the same page has to render a confirmed answer and an unconfirmed one
  // correctly, and it can only do that if the answer can actually change.
  if (url.pathname === '/__fake/config' && request.method === 'POST') {
    const { reset, ...patch } = body || {};
    if (reset) state.config = structuredClone(DEFAULT_CONFIG);
    if (patch.capabilities) state.config.capabilities = { ...state.config.capabilities, ...patch.capabilities };
    if (patch.userRole) state.config.userRole = patch.userRole;
    if (patch.accessTtlSeconds !== undefined) state.config.accessTtlSeconds = patch.accessTtlSeconds;
    if (patch.refreshTtlSeconds !== undefined) state.config.refreshTtlSeconds = patch.refreshTtlSeconds;
    if (patch.contractRevision !== undefined) state.config.contractRevision = patch.contractRevision;
    if (patch.exportFormats) state.config.exportFormats = patch.exportFormats;
    if (patch.envComparison) state.config.envComparison = patch.envComparison;
    if (patch.monitoringActive !== undefined) state.config.monitoringActive = patch.monitoringActive;
    if (patch.forced) state.config.forced = { ...state.config.forced, ...patch.forced };
    sendJson(response, 200, { success: true, data: { config: state.config } });
    return;
  }

  if (url.pathname === '/__fake/ready') {
    sendJson(response, 200, {
      ok: true,
      service: 'frontend-fake-api',
      apiPort: API_PORT,
      staticPort: STATIC_PORT,
      staticOnly: STATIC_ONLY,
      pid: process.pid,
      // Which tree this server is actually serving, and what it says that tree is (FR10-07).
      //
      // The root was always derived from this file's own location, so a run against a frozen copy served
      // the copy. Nothing said so: the wrapper started no server, the ports are the conventional defaults,
      // and whatever happened to be listening on them is what the browser loaded. A developer with another
      // checkout already serving 4173 would have had their source tested and the evidence filed under this
      // run's name, with every hash in it correct.
      //
      // So the server states its root, and `served-source-identity.spec.mjs` checks that root against the
      // tree the spec itself is running from. A server on the wrong root now fails the suite instead of
      // quietly testing something else.
      staticRoot: REPO_ROOT,
      // What this server is *actually* serving, hashed from the tree itself (FR11-03).
      //
      // `expectedStaticDigest` is what the wrapper says it copied in, which is a claim. Nothing checked it
      // against anything: a wrapper that copied the wrong tree, a stale export left in the environment, or a
      // server someone else started on the right port all produced a run whose `expectedStaticDigest` was
      // internally consistent and whose assertions were about a different repository than the reports named.
      // The digest below is computed from the bytes being served, so it cannot inherit that mistake — and
      // comparing the two is the check. It is computed once, at startup, and served from the cache: a
      // readiness probe that rehashed the tree on every call would make the browser suite pay for a full
      // source snapshot per probe.
      actualStaticDigest: actualDigest(),
      // The digest the wrapper exported for the tree it copied in, when there is one. Empty otherwise, so a
      // run that was not launched through the wrapper still gets the root check.
      expectedStaticDigest: process.env.FRONTEND_SERVED_DIGEST || ''
    });
    return;
  }

  if (url.pathname === '/__fake/completed') {
    sendJson(response, 200, { completed: state.completed });
    return;
  }

  if (url.pathname === '/__fake/held') {
    sendJson(response, 200, {
      holdRoutes: state.config.forced.holdRoutes || [],
      waiting: state.holdWaiters.map((entry) => ({ prefix: entry.prefix, path: entry.path }))
    });
    return;
  }

  if (url.pathname === '/__fake/sessions') {
    // What the peer still considers live. A revoke that changes this list is a real revoke, and a
    // test can assert it instead of trusting the client's word for it.
    sendJson(response, 200, {
      sessions: [...state.sessions.values()].map((session) => ({
        sessionId: session.sessionId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        refreshExpiresAt: session.refreshExpiresAt
      }))
    });
    return;
  }

  if (url.pathname === '/__fake/hold' && request.method === 'POST') {
    state.config.forced.holdRoutes = [...new Set((body?.routes || []).map(String))];
    sendJson(response, 200, { success: true, data: { holdRoutes: state.config.forced.holdRoutes } });
    return;
  }

  if (url.pathname === '/__fake/release' && request.method === 'POST') {
    const only = (body?.routes || []).map(String);
    const waiters = state.holdWaiters.filter((entry) => only.length === 0 || only.some((prefix) => entry.path.startsWith(prefix)));
    for (const entry of waiters) entry.resolve();
    state.holdWaiters = state.holdWaiters.filter((entry) => !waiters.includes(entry));
    if (only.length === 0) state.config.forced.holdRoutes = [];
    else state.config.forced.holdRoutes = (state.config.forced.holdRoutes || []).filter((prefix) => !only.includes(prefix));
    sendJson(response, 200, { success: true, data: { released: waiters.length } });
    return;
  }

  if (url.pathname === '/__fake/redirect' && request.method === 'GET') {
    const target = new URL(url.searchParams.get('target'));
    if (target.protocol !== 'http:' || target.hostname !== '127.0.0.1') {
      sendJson(response, 400, {error: 'redirect probe must remain loopback'}); return;
    }
    response.writeHead(302, {Location: target.href}); response.end(); return;
  }

  if (url.pathname === '/__fake/reset' && request.method === 'POST') {
    // Release anything a previous test parked, so a held response cannot outlive the test that asked
    // for it and hang the next one.
    for (const entry of state.holdWaiters) entry.resolve();
    state.config = structuredClone(DEFAULT_CONFIG);
    state.requests.length = 0;
    state.sessions.clear();
    state.holdWaiters = [];
    state.completed.length = 0;
    sendJson(response, 200, { success: true, data: { config: state.config } });
    return;
  }

  if (url.pathname === '/api/auth/login') {
    if (body?.password === 'wrong') {
      // The shape the real backend uses for validation failures, and the one the FA-03 probe sent.
      sendJson(response, 422, {
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Validation failed' },
        errors: [
          { field: 'email', message: 'Email is already registered' },
          { field: 'password', message: 'Password is too short' },
        ],
      });
      return;
    }
    sendJson(response, 200, { success: true, data: sessionBody(issueSession('login')) });
    return;
  }

  if (url.pathname === '/api/auth/refresh_token') {
    if (state.config.forced.refreshStatus !== 200) {
      sendJson(response, state.config.forced.refreshStatus, { success: false, error: { code: 'BUSY' } });
      return;
    }
    if (state.config.forced.refreshReplay) {
      // The replay the server answers with when a token was already rotated: the client must treat
      // this as an ended session, not as a session it can keep using with the old access token.
      sendJson(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
      return;
    }
    const rotated = rotate(body?.refresh_token);
    if (!rotated) {
      sendJson(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
      return;
    }
    sendJson(response, 200, { success: true, data: sessionBody(rotated) });
    return;
  }

  if (url.pathname === '/api/auth/logout') {
    // A real revoke: the named session stops being live, so a later rotation of the same refresh token
    // is refused the way a replay would be. A logout endpoint that always says 200 cannot show a
    // client that kept a session the server had already forgotten.
    const revoked = [];
    for (const session of state.sessions.values()) {
      if (body?.refresh_token && session.refreshToken !== body.refresh_token) continue;
      if (state.config.forced.revokeOnLogout === false) continue;
      state.sessions.delete(session.refreshToken);
      revoked.push(session.sessionId);
    }
    sendJson(response, 200, {
      success: true,
      data: {
        message: revoked.length > 0 ? 'Logged out' : 'No matching session',
        revokedSessions: revoked
      }
    });
    return;
  }

  // The one-shot stale access token. It only ever answers a request that carried a bearer, and only
  // once per setting, so the refresh it provokes is the only thing that changes afterwards.
  if (state.config.forced.staleAccessOnce
    && !url.pathname.startsWith('/api/auth/')
    && request.headers.authorization) {
    state.config.forced.staleAccessOnce = false;
    sendJson(response, 401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
    return;
  }

  // --- The backend contract surface: capability, export, env comparison, monitoring. ---

  // Profile must be a renderable response, not the empty fallback below. The session
  // invariant exercises this view before logout and after a fresh mount.
  // User administration fixtures exercise the shipped client, not backend authorization.
  if (url.pathname === '/api/admin/users' && request.method === 'GET') {
    sendJson(response, 200, { success: true, data: {
      users: [
        { ...user(), full_name: 'Browser Test', status: 'active' },
        { id: 2, full_name: 'Reset Target', email: 'target@example.test', role: 'user', status: 'active' },
        { id: 3, full_name: 'Peer Admin', email: 'peer@example.test', role: 'admin', status: 'active' },
        { id: 4, full_name: 'Protected Admin', email: 'protected@example.test', role: 'super_admin', status: 'active' }
      ], pagination: { page: 1, limit: 10, total: 4, totalPages: 1 }
    } });
    return;
  }
  if (/^\/api\/admin\/users\/\d+\/reset-password$/.test(url.pathname) && request.method === 'POST') {
    sendJson(response, 200, { success: true, message: 'Fixture password reset', data: { sessionsRevoked: true } });
    return;
  }

  if (url.pathname === '/api/user/profile' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      data: { ...user(), full_name: 'Browser Test', status: 'active', created_at: '2026-01-01T00:00:00Z' }
    });
    return;
  }

  if (url.pathname === '/api/advanced-audit/analytics') {
    sendJson(response, 200, {
      success: true,
      data: withCapabilities({
        totalEvents: 1284,
        riskDistribution: { low: 900, medium: 300, high: 60, critical: 24 },
        topActors: [{ actor: 'service-worker', count: 120 }]
      })
    });
    return;
  }

  if (url.pathname === '/api/advanced-audit/compliance/report') {
    sendJson(response, 200, {
      success: true,
      data: withCapabilities({ frameworks: [{ name: 'SOC2', score: 91 }], openFindings: 3 })
    });
    return;
  }

  if (url.pathname === '/api/advanced-audit/export-advanced' && request.method === 'POST') {
    const format = String(body?.format || 'json').toLowerCase();
    if (!state.config.exportFormats.includes(format)) {
      // The exact envelope the frontend reads `UNSUPPORTED_EXPORT_OPTION` out of.
      sendJson(response, 422, {
        success: false,
        error: { code: 'UNSUPPORTED_EXPORT_OPTION', message: `format ${format} is not available` }
      });
      return;
    }
    sendJson(response, 200, {
      success: true,
      data: withCapabilities({ exportId: `FAKE_EXPORT_${nowSeconds()}`, format, downloadUrl: null })
    });
    return;
  }

  if (url.pathname === '/api/kv-admin/configs/env-comparison') {
    const comparison = state.config.envComparison || {};
    const keys = Object.keys(comparison);
    sendJson(response, 200, {
      success: true,
      data: {
        comparison,
        summary: {
          total: keys.length,
          fromKV: keys.filter((key) => comparison[key]?.source === 'kv').length,
          fromEnv: keys.filter((key) => comparison[key]?.source === 'env').length,
          fromDefault: keys.filter((key) => comparison[key]?.source === 'default').length
        }
      }
    });
    return;
  }

  if (url.pathname === '/api/realtime-monitoring/monitoring/status') {
    sendJson(response, 200, {
      success: true,
      data: withCapabilities({
        isActive: state.config.monitoringActive,
        intervalMs: 5000,
        eventsObserved: 41,
        threatsOpen: 2
      })
    });
    return;
  }

  if (url.pathname === '/api/realtime-monitoring/monitoring/start' && request.method === 'POST') {
    if (state.config.forced.monitoringStartStatus !== 200) {
      sendJson(response, state.config.forced.monitoringStartStatus, {
        success: false,
        error: { code: 'UNSUPPORTED_MONITORING_MODE', message: 'continuous monitoring is not available' }
      });
      return;
    }
    state.config.monitoringActive = true;
    sendJson(response, 200, {
      success: true,
      data: withCapabilities({ isActive: true, startedAt: new Date().toISOString(), intervalMs: body?.intervalMs || 5000 })
    });
    return;
  }

  if (url.pathname === '/api/realtime-monitoring/monitoring/stop' && request.method === 'POST') {
    state.config.monitoringActive = false;
    sendJson(response, 200, { success: true, data: withCapabilities({ isActive: false }) });
    return;
  }

  // Anything else answers with an empty success so a page that asks for data on load is not blocked
  // by a shape this stand-in does not know. The tests assert auth behaviour, not payload shapes.
  sendJson(response, 200, { success: true, data: {} });
};

/**
 * Records what this peer has finished answering, so a test can wait for the *answer* rather than for
 * a duration. Every response goes through here, which is the point: a log that only knows what
 * arrived cannot tell a test whether the server had finished replying.
 */
const fakeApi = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${API_PORT}`);
  response.on('finish', () => {
    state.completed.push({ method: request.method, path: url.pathname, status: response.statusCode });
  });
  await handleFakeApi(request, response);
});

const staticServer = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${STATIC_PORT}`);
  let filePath = path.join(REPO_ROOT, decodeURIComponent(url.pathname));

  // Never serve outside the worktree, whatever the request says.
  if (!filePath.startsWith(REPO_ROOT)) {
    response.writeHead(403).end('forbidden');
    return;
  }

  try {
    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats || stats.isDirectory()) filePath = path.join(REPO_ROOT, 'index.html');

    // The served bytes, not a claim about them. `served-source-identity.spec.mjs` compares this header with
    // the file in the root it expects, so a server that resolved a path somewhere other than the tree under
    // test is caught by the content it actually returns rather than by its own account of itself.
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-served-root': REPO_ROOT,
      'x-served-sha256': createHash('sha256').update(body).digest('hex')
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { 'content-type': 'text/plain' }).end(`not found: ${url.pathname}`);
  }
});

const listen = (server, port) => new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

if (!STATIC_ONLY) await listen(fakeApi, API_PORT);
await listen(staticServer, STATIC_PORT);

process.stdout.write(
  STATIC_ONLY
    ? `static only (no fake API) on http://127.0.0.1:${STATIC_PORT}\n`
    : `fake API on http://127.0.0.1:${API_PORT}, static on http://127.0.0.1:${STATIC_PORT}\n`
);

const shutdown = () => {
  fakeApi.close();
  staticServer.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
