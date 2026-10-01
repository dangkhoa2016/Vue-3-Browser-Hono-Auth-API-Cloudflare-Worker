/**
 * The integration fixture: how a browser context is given a session, and how a run decides whether
 * it is allowed to claim one.
 *
 * Two failures shaped this file.
 *
 * 1. The seed used to be an inline `page.addInitScript()` callback that read a module-scope constant
 *    (`RECORD_KEY`). That callback is serialised and evaluated by the browser in its own realm, where
 *    the module does not exist: the very first line raised `ReferenceError`, so the fixture quietly
 *    seeded nothing. `seedSessionScript()` below is therefore written to be **closure-free** — every
 *    key, value, schema version and token arrives through the single serialisable argument — and
 *    `tests/regression/integration-fixture.test.mjs` re-evaluates it in a `vm` realm that has nothing
 *    but its argument, so that property is enforced rather than assumed.
 * 2. The seed wrote `schemaVersion: 1` while the product's validator accepts only 2, and wrote the
 *    API identity as a bare origin while the record is validated against origin **plus base path**.
 *    Both were refused on read, and because the suite was skipped without a backend nobody saw it.
 *    Nothing in the product is relaxed to accommodate a fixture; the fixture is written to the
 *    product's contract and the product's own reader is what judges it.
 *
 * The validator was not relaxed and no global was added to the app.
 */

/** Canonical record key. One record per origin; every other key here is either config or a mirror. */
export const SESSION_RECORD_KEY = 'auth-session-record';
/** The configured endpoint the app reads at startup (`api-base-url`). */
export const API_BASE_URL_KEY = 'api-base-url';
/**
 * The app's own mock-API switch. It defaults to **on** when unset, so a fixture that does not say
 * what it wants will silently get the loopback stand-in. Every seed therefore states it.
 */
export const MOCK_API_KEY = 'mock-api';
/** Mirror of the configured endpoint, rewritten by `setApiIdentity()`. Origin **and** base path. */
export const API_IDENTITY_KEY = 'api-identity';
/** The session binding: the identity this record's tokens belong to. */
export const SESSION_IDENTITY_KEY = 'auth-api-identity';
/**
 * Legacy mirror keys. Removed on seed so the app cannot adopt a second opinion about who is signed
 * in. The seed never calls `localStorage.clear()`: unrelated preferences in the same origin are not
 * the fixture's business.
 */
export const LEGACY_SESSION_KEYS = ['user', 'token', 'expires_at', 'refresh_token', 'refresh_expires_at'];

/** Kept in step with `SESSION_SCHEMA_VERSION` in assets/js/api/sessionStorage.js. */
export const SESSION_SCHEMA_VERSION = 2;

/** The static port has one owner. Configs, specs and fixtures all read it from here. */
export const STATIC_PORT = Number(process.env.FRONTEND_STATIC_PORT || 4173);
/** Where the app under test is served. One source of truth, so a spec cannot disagree with a config. */
export const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || `http://127.0.0.1:${STATIC_PORT}`;

/**
 * The callback handed to `page.addInitScript()`.
 *
 * It must not reference anything from this module: it is stringified, shipped to the browser and run
 * in a realm where the only things that exist are `window` and the argument it is given.
 *
 * @param {object} args Serializable seed arguments; see {@link buildSeedArgs}.
 */
export function seedSessionScript(args) {
  const storage = window.localStorage;

  for (const key of args.removeKeys) storage.removeItem(key);

  // The configured endpoint and both identity keys keep the full base path. An origin-only value
  // would fail identity validation for every deployment served under a path prefix.
  // The endpoint the app will call, and the endpoint this record belongs to, are separate. They are
  // equal in the normal case; a fixture can set them apart to prove the record is bound, not merely
  // present.
  storage.setItem(args.apiBaseUrlKey, args.configuredApiBaseUrl || args.apiBaseUrl);
  storage.setItem(args.apiIdentityKey, args.apiBaseUrl);
  storage.setItem(args.sessionIdentityKey, args.apiBaseUrl);

  // Stated, not inherited: unset means the app's own default, which is the mock API.
  if (args.mockApi !== null && args.mockApi !== undefined) {
    storage.setItem(args.mockApiKey, String(args.mockApi));
  }

  storage.setItem(args.recordKey, JSON.stringify({
    schemaVersion: args.schemaVersion,
    identity: args.apiBaseUrl,
    sessionId: args.sessionId,
    version: 1,
    state: 'active',
    user: args.user,
    accessToken: args.accessToken,
    refreshToken: args.refreshToken,
    expiresAt: args.epochSeconds + args.accessTtlSeconds,
    refreshExpiresAt: args.epochSeconds + args.refreshTtlSeconds,
  }));
}

/**
 * Builds the serialisable argument for {@link seedSessionScript}.
 *
 * Expiry is in **seconds**, and the two tokens are never the same string: the validator refuses an
 * aliased pair, which is a real defect class (a rotation that hands back the credential it replaced)
 * and not a formality.
 */
export function buildSeedArgs({
  apiBaseUrl,
  user,
  accessToken,
  refreshToken,
  sessionId,
  epochSeconds = Math.floor(Date.now() / 1000),
  accessTtlSeconds = 3600,
  refreshTtlSeconds = 259200,
  mockApi = 'false',
  configuredApiBaseUrl = null,
} = {}) {
  if (!apiBaseUrl) throw new Error('buildSeedArgs: apiBaseUrl is required');
  if (!user || typeof user !== 'object') throw new Error('buildSeedArgs: user must be an object');
  if (!accessToken) throw new Error('buildSeedArgs: accessToken is required');
  if (!refreshToken) throw new Error('buildSeedArgs: refreshToken is required');
  if (accessToken === refreshToken) {
    throw new Error('buildSeedArgs: access and refresh tokens must differ (the validator refuses an alias pair)');
  }
  if (!Number.isFinite(epochSeconds)) throw new Error('buildSeedArgs: epochSeconds must be epoch seconds');

  return {
    recordKey: SESSION_RECORD_KEY,
    apiBaseUrlKey: API_BASE_URL_KEY,
    mockApiKey: MOCK_API_KEY,
    mockApi: mockApi === null ? null : String(mockApi),
    apiIdentityKey: API_IDENTITY_KEY,
    sessionIdentityKey: SESSION_IDENTITY_KEY,
    removeKeys: [SESSION_RECORD_KEY, ...LEGACY_SESSION_KEYS],
    schemaVersion: SESSION_SCHEMA_VERSION,
    apiBaseUrl: String(apiBaseUrl),
    configuredApiBaseUrl: configuredApiBaseUrl === null ? String(apiBaseUrl) : String(configuredApiBaseUrl),
    user: JSON.parse(JSON.stringify(user)),
    accessToken: String(accessToken),
    refreshToken: String(refreshToken),
    sessionId: sessionId || `sid_integration_${Math.random().toString(36).slice(2, 12)}`,
    epochSeconds: Number(epochSeconds),
    accessTtlSeconds: Number(accessTtlSeconds),
    refreshTtlSeconds: Number(refreshTtlSeconds),
  };
}

/**
 * A READY manifest: what the owner vouched for. Without it the integration run is *pending*, and
 * with a broken one it *fails*. It is never inferred from a production environment note.
 */
export const READY_ENV_KEYS = {
  apiBaseUrl: 'FRONTEND_API_BASE_URL',
  accessToken: 'FRONTEND_ACCESS_TOKEN',
  refreshToken: 'FRONTEND_REFRESH_TOKEN',
  userJson: 'FRONTEND_USER_JSON',
  backendRevision: 'FRONTEND_BACKEND_REVISION',
  backendTree: 'FRONTEND_BACKEND_TREE',
  testScope: 'FRONTEND_TEST_SCOPE',
  fixtureApproval: 'FRONTEND_FIXTURE_APPROVAL'
};

/**
 * Resolves the integration fixture from the environment.
 *
 * @returns {{ready: boolean, missing: string[], invalid: string[], fixture: object|null}}
 *   `ready` is false with `missing` non-empty when no backend was provided (pending);
 *   `invalid` non-empty means the owner provided something unusable, which is a failure, not a skip.
 */
export function readIntegrationFixture(env = process.env) {
  const missing = [];
  const invalid = [];
  const fixture = {};

  for (const [field, key] of Object.entries(READY_ENV_KEYS)) {
    const value = env[key];
    if (value === undefined || value === null || String(value).trim() === '') missing.push(key);
    else fixture[field] = String(value).trim();
  }

  for (const field of ['backendRevision', 'backendTree']) {
    if (fixture[field] && !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(fixture[field])) {
      invalid.push(`${READY_ENV_KEYS[field]} must be a full immutable Git SHA`);
    }
  }
  if (fixture.testScope && fixture.testScope !== 'capabilities') invalid.push('FRONTEND_TEST_SCOPE must be capabilities for this suite');
  if (fixture.apiBaseUrl) {
    try {
      const url = new URL(fixture.apiBaseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) invalid.push('FRONTEND_API_BASE_URL must be an http(s) URL');
      else if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash) {
        invalid.push('FRONTEND_API_BASE_URL must be a local prepared endpoint without credentials/query/fragment');
      } else fixture.apiBaseUrl = url.origin + url.pathname.replace(/\/+$/, '');
    } catch { invalid.push('FRONTEND_API_BASE_URL is not a URL'); }
  }
  if (fixture.userJson) {
    try {
      const user = JSON.parse(fixture.userJson);
      if (!user || typeof user !== 'object' || Array.isArray(user)) invalid.push('FRONTEND_USER_JSON must be a user object, not a scalar or an array');
      else fixture.user = user;
    } catch { invalid.push('FRONTEND_USER_JSON is not valid JSON'); }
  }
  if (fixture.accessToken && fixture.refreshToken && fixture.accessToken === fixture.refreshToken) {
    invalid.push('FRONTEND_ACCESS_TOKEN and FRONTEND_REFRESH_TOKEN must differ');
  }

  return { ready: missing.length === 0 && invalid.length === 0, missing, invalid, fixture };
}
