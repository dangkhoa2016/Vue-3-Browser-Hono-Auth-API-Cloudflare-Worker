/**
 * FR6-H: the integration fixture has to work **offline**, before anybody has a backend.
 *
 * The integration suite asserts that a real backend supports a capability, so it legitimately cannot
 * run without one. That is exactly why the fixture that seeds a session must be provable without one:
 * the previous version of it was an inline `addInitScript` callback that read a module-scope constant
 * inside a realm where that module does not exist, and it wrote a record the product's own validator
 * rejects (`schemaVersion: 1`, and an origin-only identity for a backend that lives under a path).
 * Both defects were invisible because the suite skipped itself.
 *
 * These tests therefore evaluate the shipped init callback in a `vm` realm that has nothing in it but
 * `window.localStorage` and the argument, and then hand the result to the product's real reader.
 *
 * @see tests/browser/helpers/integration-session.mjs
 * @see tests/browser/backend-capabilities.spec.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { createStorage } from './helpers/browser-env.mjs';
import { loadModule } from './helpers/browser-env.mjs';
import {
  buildSeedArgs,
  readIntegrationFixture,
  seedSessionScript,
  SESSION_RECORD_KEY,
  SESSION_SCHEMA_VERSION,
  LEGACY_SESSION_KEYS
} from '../browser/helpers/integration-session.mjs';

const API_BASE_URL = 'http://127.0.0.1:18788/api';
const USER = { id: 7, email: 'fixture@example.test', role: 'admin' };
const ACCESS = 'FAKE_ACCESS_FIXTURE';
const REFRESH = 'FAKE_REFRESH_FIXTURE';
const EPOCH_SECONDS = 1_780_000_000;

/**
 * Runs the shipped callback in a realm that shares nothing with this module.
 *
 * `page.addInitScript()` stringifies the callback and evaluates it in the page, so a reference to a
 * module-scope binding is a `ReferenceError` there and nowhere else. Reproducing that is the only
 * honest way to test it.
 */
function runSeedInIsolatedRealm(args) {
  const storage = createStorage();
  const window = { localStorage: storage };
  const context = vm.createContext({ window, JSON, String, Number });
  const callback = vm.runInContext(`(${seedSessionScript.toString()})`, context);
  callback(args);
  return storage;
}

/** The product's own reader, loaded the same way the app loads it. */
function loadProductReader(storage) {
  const module = loadModule('assets/js/api/sessionStorage.js', { window: { localStorage: storage }, localStorage: storage }, {});
  return module;
}

const baseArgs = (overrides = {}) => buildSeedArgs({
  apiBaseUrl: API_BASE_URL,
  user: USER,
  accessToken: ACCESS,
  refreshToken: REFRESH,
  sessionId: 'sid_integration_fixture',
  epochSeconds: EPOCH_SECONDS,
  ...overrides
});

test('FR6-H — the init callback runs in a realm that has only its argument', () => {
  const args = baseArgs();
  const storage = runSeedInIsolatedRealm(args);

  const seeded = JSON.parse(storage.getItem(SESSION_RECORD_KEY));
  assert.equal(seeded.schemaVersion, SESSION_SCHEMA_VERSION, 'the fixture writes the schema the product reads');
  assert.equal(seeded.state, 'active');
  assert.equal(seeded.accessToken, ACCESS);
  assert.equal(seeded.refreshToken, REFRESH);
  assert.notEqual(seeded.accessToken, seeded.refreshToken, 'an aliased pair is refused by the validator');
  assert.equal(seeded.identity, API_BASE_URL, 'the record keeps the full base path, not a bare origin');
});

test('FR6-H — the seeded record is one the product reader accepts, unrelaxed', () => {
  const storage = runSeedInIsolatedRealm(baseArgs());
  const { readSessionState, SESSION_READ_STATUS } = loadProductReader(storage);

  const read = readSessionState({ storage, expectedIdentity: API_BASE_URL });
  assert.equal(read.status, SESSION_READ_STATUS.ACTIVE, `the product refused the fixture: ${read.reason}`);
  assert.equal(read.record.accessToken, ACCESS);
  assert.equal(read.record.user.id, USER.id);
  assert.equal(read.record.expiresAt, EPOCH_SECONDS + 3600, 'expiry is epoch seconds, not milliseconds');
  assert.equal(read.record.refreshExpiresAt, EPOCH_SECONDS + 259200);
});

test('FR6-H — the seed touches auth keys and nothing else', () => {
  const storage = createStorage({ 'theme': 'dark', 'unrelated-sentinel': 'keep me', 'token': 'stale' });
  runSeedInIsolatedRealm(baseArgs());
  // Re-run against the same storage so removals are observable.
  const second = runSeedInIsolatedRealm(baseArgs());
  assert.equal(second.getItem('theme'), null, 'the fixture is seeded into its own context; this run started empty');

  const storage2 = createStorage({ 'theme': 'dark', 'unrelated-sentinel': 'keep me' });
  const windowStorage = storage2;
  const context = vm.createContext({ window: { localStorage: windowStorage }, JSON, String, Number });
  vm.runInContext(`(${seedSessionScript.toString()})`, context)(baseArgs());
  assert.equal(windowStorage.getItem('theme'), 'dark', 'an unrelated preference is not the fixture’s business');
  assert.equal(windowStorage.getItem('unrelated-sentinel'), 'keep me');
  assert.equal(storage2._removals.every((entry) => [SESSION_RECORD_KEY, ...LEGACY_SESSION_KEYS].includes(entry.key)), true,
    'removals are limited to auth keys — no localStorage.clear()');
  assert.ok(storage, 'storage exists');
});

test('FR6-H — a legacy mirror cannot lead the record after seeding', () => {
  const storage = createStorage({
    token: 'FAKE_STALE_MIRROR',
    user: JSON.stringify({ id: 999 }),
    refresh_token: 'FAKE_STALE_MIRROR'
  });
  const context = vm.createContext({ window: { localStorage: storage }, JSON, String, Number });
  vm.runInContext(`(${seedSessionScript.toString()})`, context)(baseArgs());

  for (const key of LEGACY_SESSION_KEYS) {
    assert.equal(storage.getItem(key), null, `${key} is removed so the app has one source of truth`);
  }
  const seeded = JSON.parse(storage.getItem(SESSION_RECORD_KEY));
  assert.notEqual(seeded.accessToken, 'FAKE_STALE_MIRROR');
});

test('FR6-H — buildSeedArgs refuses the shapes the validator would reject', () => {
  assert.throws(() => buildSeedArgs({ apiBaseUrl: API_BASE_URL, user: USER, accessToken: 'X', refreshToken: 'X' }),
    /must differ/, 'an aliased token pair is refused at build time, not written and hoped over');
  assert.throws(() => buildSeedArgs({ apiBaseUrl: API_BASE_URL, user: null, accessToken: 'X', refreshToken: 'Y' }),
    /user must be an object/);
  assert.throws(() => buildSeedArgs({ apiBaseUrl: '', user: USER, accessToken: 'X', refreshToken: 'Y' }),
    /apiBaseUrl is required/);
});

test('FR6-H — a missing READY manifest is pending; a broken one fails', () => {
  const missing = readIntegrationFixture({});
  assert.equal(missing.ready, false);
  assert.ok(missing.missing.length > 0, 'the run reports what is absent instead of skipping silently');
  assert.deepEqual(missing.invalid, [], 'nothing is invalid when nothing was provided');

  const complete = {
    FRONTEND_API_BASE_URL: API_BASE_URL,
    FRONTEND_ACCESS_TOKEN: ACCESS,
    FRONTEND_REFRESH_TOKEN: REFRESH,
    FRONTEND_USER_JSON: JSON.stringify(USER),
    FRONTEND_BACKEND_REVISION: 'a'.repeat(40),
    FRONTEND_BACKEND_TREE: 'b'.repeat(40),
    FRONTEND_TEST_SCOPE: 'capabilities',
    FRONTEND_FIXTURE_APPROVAL: 'owner-local-fixture-reference'
  };

  // Each of these is a *provided* fixture, so none of them is a pending run. Reporting a skip here is
  // how a broken manifest hides a bug the integration suite was supposed to find.
  const brokenManifests = [
    [{ ...complete, FRONTEND_USER_JSON: '{oops' }, /FRONTEND_USER_JSON is not valid JSON/],
    [{ ...complete, FRONTEND_USER_JSON: '7' }, /must be a user object/],
    [{ ...complete, FRONTEND_REFRESH_TOKEN: ACCESS }, /must differ/],
    [{ ...complete, FRONTEND_API_BASE_URL: 'not-a-url' }, /FRONTEND_API_BASE_URL is not a URL/],
    [{ ...complete, FRONTEND_API_BASE_URL: 'ftp://example.test' }, /must be an http\(s\) URL/]
  ];
  for (const [env, expected] of brokenManifests) {
    const broken = readIntegrationFixture(env);
    assert.equal(broken.ready, false, 'an unusable fixture is never ready');
    assert.equal(broken.missing.length, 0, 'everything was provided — so this is not a pending run');
    assert.equal(broken.invalid.length, 1, `one honest reason per manifest: ${broken.invalid.join(' | ')}`);
    assert.match(broken.invalid[0], expected);
  }

  const good = readIntegrationFixture(complete);
  assert.equal(good.ready, true, `a complete manifest must be usable: ${good.invalid.join(' | ')}`);
  assert.equal(good.fixture.user.id, USER.id);
});

test('N6 READY pins immutable backend identity, local scope and fixture approval',()=>{
  const ready={FRONTEND_API_BASE_URL:API_BASE_URL,FRONTEND_ACCESS_TOKEN:ACCESS,FRONTEND_REFRESH_TOKEN:REFRESH,
    FRONTEND_USER_JSON:JSON.stringify(USER),FRONTEND_BACKEND_REVISION:'a'.repeat(40),FRONTEND_BACKEND_TREE:'b'.repeat(40),
    FRONTEND_TEST_SCOPE:'capabilities',FRONTEND_FIXTURE_APPROVAL:'owner-local-fixture-reference'};
  assert.equal(readIntegrationFixture(ready).ready,true);
  for(const patch of [{FRONTEND_BACKEND_REVISION:'main'},{FRONTEND_BACKEND_TREE:'tree_fixture'},
    {FRONTEND_API_BASE_URL:'https://api.example.com'},{FRONTEND_API_BASE_URL:'http://user:secret@localhost:18788'},
    {FRONTEND_TEST_SCOPE:'all'}]) {
    const result=readIntegrationFixture({...ready,...patch});assert.equal(result.ready,false);assert.ok(result.invalid.length>0);
  }
  const missing=readIntegrationFixture({...ready,FRONTEND_FIXTURE_APPROVAL:''});assert.equal(missing.ready,false);
  assert.ok(missing.missing.includes('FRONTEND_FIXTURE_APPROVAL'));
  const partialInvalid=readIntegrationFixture({FRONTEND_BACKEND_REVISION:'main'});assert.ok(partialInvalid.invalid.length>0);
});
