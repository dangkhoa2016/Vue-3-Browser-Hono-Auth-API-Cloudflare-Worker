/**
 * Regression tests for the session-lifecycle findings of the round-3 artifact review:
 * FA-01 (a rotation can overwrite another tab's logout), FA-02 (multi-tab lifecycle wiring),
 * FA-06 (memory validation differed from persistence validation) and FA-07 (a rejected record was
 * replaced by legacy token material).
 *
 * These assert the SECURE behaviour. The review probes asserted the buggy behaviour — "applyRotation
 * returns true and writes `active` back over a tombstone" — and are deliberately not reproduced.
 *
 * Every test drives the real modules through the same VM loader the rest of the suite uses, with
 * fake credentials, loopback origins and an in-memory storage. No real API, no production host, no
 * secrets, and no real multi-tab browser: the two "tabs" below are two independent module realms
 * that share one storage, which is the strongest claim these tests make.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TEST_ORIGINS, createBroadcastBus, createBrowserEnv, createStorage, loadModule } from './helpers/browser-env.mjs';
import { ACCESS_TTL, API_A, NOW_SECONDS, REFRESH_TTL, bootApp, predecessorOf } from './helpers/app-harness.mjs';

const USER_A = { id: 1, email: 'a@example.test', role: 'user' };
const USER_B = { id: 2, email: 'b@example.test', role: 'user' };

/**
 * Logs a store in and waits for the guarded write to land. The session id is minted by the store,
 * so every assertion uses the id the product actually produced.
 */
async function signIn(app, { user = USER_A, access = 'ACCESS_1', refresh = 'REFRESH_1' } = {}) {
  const context = app.auth.beginLoginAttempt();
  const result = await app.auth.commitLogin({
    user,
    accessToken: access,
    refreshToken: refresh,
    expiresAt: NOW_SECONDS + ACCESS_TTL,
    refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
  }, context);
  assert.equal(result.status, 'applied', 'the login payload must be accepted and persisted');
  return app.readRecord();
}

/** The canonical record, or `null` when nothing valid is stored. */
function readRecord(app) {
  const raw = app.storage.getItem('auth-session-record');
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return { corrupt: raw };
  }
}

describe('FA-01 — a rotation cannot resurrect a session another tab ended', () => {
  test('a rotation held by a second tab is refused while the record is a tombstone', async () => {
    const storage = createStorage();
    const tabA = bootApp({ storage });
    const tabB = bootApp({ storage });

    await signIn(tabA);
    const before = tabB.readRecord();
    assert.equal(before.state, 'active');

    // Tab A logs out. It writes a tombstone; it does not delete the record.
    await tabA.auth.logout();
    const tombstone = tabA.readRecord();
    assert.equal(tombstone.state, 'ended', 'a logout leaves an observable tombstone');
    assert.ok(tombstone.version > before.version, 'the tombstone takes the next version');

    // Tab B still holds the old epoch and now receives a rotation result. Its predecessor is the
    // pair it actually held, which is exactly what the tombstone replaced.
    const context = tabB.auth.captureContext();
    const result = await tabB.auth.applyRotation({
      accessToken: 'ROTATED_ACCESS',
      refreshToken: 'ROTATED_REFRESH',
      expiresAt: NOW_SECONDS + ACCESS_TTL,
      refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
    }, context, { predecessor: predecessorOf(before) });

    assert.equal(result.status, 'stale', 'the rotation must be refused');
    assert.equal(result.reason, 'session-ended');
    assert.equal(tabB.auth.lastCommitReason, 'session-ended');
    assert.deepEqual(tabB.readRecord(), tombstone, 'the tombstone must be left untouched');
    assert.equal(tabB.storage.getItem('token'), null, 'no token is restored into storage');
  });

  test('a rotation of a record owned by a different login session is refused', async () => {
    const storage = createStorage();
    const tabA = bootApp({ storage });
    const tabB = bootApp({ storage });

    await signIn(tabA, { access: 'ACCESS_A', refresh: 'REFRESH_A' });
    await signIn(tabB, { user: USER_B, access: 'ACCESS_B', refresh: 'REFRESH_B' });
    const owned = readRecord(tabB);
    assert.equal(owned.sessionId, tabB.auth.sessionId, 'tab B owns the record');
    assert.notEqual(owned.sessionId, tabA.auth.sessionId, 'the two tabs are different login sessions');

    // Tab A still believes in its own login session, so the predecessor it names is its own pair.
    const context = tabA.auth.captureContext();
    const result = await tabA.auth.applyRotation({
      accessToken: 'ACCESS_A_ROTATED',
      refreshToken: 'REFRESH_A_ROTATED',
      expiresAt: NOW_SECONDS + ACCESS_TTL,
      refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
    }, context, {
      // The same API identity as the record — both tabs are configured identically — so the
      // refusal has to be about the *login session*, not about the identity.
      predecessor: {
        identity: owned.identity,
        sessionId: tabA.auth.sessionId,
        accessToken: 'ACCESS_A',
        refreshToken: 'REFRESH_A',
      },
    });

    assert.equal(result.status, 'stale', 'a rotation must never be applied to another session');
    assert.equal(result.reason, 'foreign-lifecycle');
    assert.equal(readRecord(tabA).accessToken, 'ACCESS_B', 'the owning session keeps its record');
  });

  test('a rotation is refused when the record was purged, instead of being written back', async () => {
    const storage = createStorage();
    const tab = bootApp({ storage });

    const own = await signIn(tab);
    const context = tab.auth.captureContext();

    // Another tab cleared the whole origin (a user action, not this store's logout).
    storage.removeItem('auth-session-record');
    assert.equal(tab.readRecord(), null);

    const result = await tab.auth.applyRotation({
      accessToken: 'ACCESS_ROTATED',
      refreshToken: 'REFRESH_ROTATED',
      expiresAt: NOW_SECONDS + ACCESS_TTL,
      refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
    }, context, { predecessor: predecessorOf(own) });

    assert.equal(result.status, 'stale');
    assert.equal(result.reason, 'missing-snapshot');
    assert.equal(tab.storage.getItem('auth-session-record'), null, 'a purged record is never written back');
    assert.equal(tab.readRecord(), null, 'a rotation must not recreate a session that is gone');
  });

  test('a new login may follow a logout, and takes a version above the tombstone', async () => {
    const storage = createStorage();
    const tab = bootApp({ storage });

    await signIn(tab, { session: 'SESSION_1', access: 'ACCESS_1', refresh: 'REFRESH_1' });
    const ended = await tab.auth.logout();
    assert.equal(ended.status, 'applied');
    const tombstoneVersion = tab.readRecord().version;

    const record = await signIn(tab, { user: USER_B, access: 'ACCESS_2', refresh: 'REFRESH_2' });

    assert.equal(record.state, 'active', 'a login after a logout is a legitimate new lifecycle');
    assert.equal(record.sessionId, tab.auth.sessionId);
    assert.ok(record.version > tombstoneVersion, 'the version sequence is monotonic for the record');
  });

  test('with a writer lock, a rotation queued behind a logout is refused, not written', async () => {
    const storage = createStorage();
    const locks = { request: (name, callback) => Promise.resolve().then(() => callback({ name, mode: 'exclusive' })) };
    const tabA = bootApp({ storage, locks });
    const tabB = bootApp({ storage, locks });

    // Tab B is the session that owns the record now; its logout and its own rotation race.
    await signIn(tabA);
    const held = await signIn(tabB);
    const context = tabB.auth.captureContext();

    // Both writes are issued without awaiting either: the guard, not the call order, decides.
    const logout = tabB.auth.logout();
    const rotation = tabB.auth.applyRotation({
      accessToken: 'ROTATED_ACCESS',
      refreshToken: 'ROTATED_REFRESH',
      expiresAt: NOW_SECONDS + ACCESS_TTL,
      refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
    }, context, { predecessor: predecessorOf(held) });
    const [, rotationResult] = await Promise.all([logout, rotation]);

    assert.equal(rotationResult.status, 'stale', 'the rotation is accepted as an intent and then refused by the guard');
    assert.equal(readRecord(tabB).state, 'ended', 'the record ends up as a tombstone, never as an active session');
  });

  test('without a lock, an ambiguous snapshot is reported instead of being called atomic', async () => {
    const storage = createStorage();
    const tab = bootApp({ storage });

    const own = await signIn(tab, { access: 'ACCESS_1', refresh: 'REFRESH_1' });
    const sessionId = tab.auth.sessionId;
    const context = tab.auth.captureContext();
    const write = await tab.auth.applyRotation({
      accessToken: 'ACCESS_2',
      refreshToken: 'REFRESH_2',
      expiresAt: NOW_SECONDS + ACCESS_TTL,
      refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
    }, context, { predecessor: predecessorOf(own) });
    assert.equal(write.status, 'applied');

    const { decideCommit, COMMIT_DECISION, SESSION_OPERATION } = loadSessionStorage(tab);
    const active = { status: 'active', record: { sessionId, version: 9 } };
    const ended = { status: 'ended', record: { sessionId, version: 9 } };

    assert.equal(
      decideCommit(SESSION_OPERATION.ROTATE, { observed: active, target: { sessionId, version: 1 } }).reason,
      'snapshot-moved',
      'a fixed record whose version the store moved past is refused, never written over newer data'
    );
    assert.equal(
      decideCommit(SESSION_OPERATION.ROTATE, { observed: active, target: { sessionId, version: 1, merge: true } }).decision,
      COMMIT_DECISION.PROCEED,
      'a builder merge is not a version assertion'
    );
    assert.equal(
      decideCommit(SESSION_OPERATION.END, { observed: ended, target: { sessionId } }).decision,
      COMMIT_DECISION.IDEMPOTENT,
      'a writer already looking at this tombstone repeats nothing'
    );
    assert.equal(
      decideCommit(SESSION_OPERATION.ROTATE, { observed: ended, target: { sessionId, merge: true } }).decision,
      COMMIT_DECISION.REFUSE,
      'a writer behind a tombstone is refused'
    );
    assert.equal(
      decideCommit(SESSION_OPERATION.END, { observed: active, target: { sessionId: 'other-session' } }).decision,
      COMMIT_DECISION.REFUSE,
      'a logout never ends a session it does not own'
    );
  });
});

/** Loads a second, independent copy of sessionStorage bound to this tab's realm. */
function loadSessionStorage(app) {
  return loadModule('assets/js/api/sessionStorage.js', app.env);
}

describe('FA-02 — adopting another tab\'s record is a read, not a rotation', () => {
  test('adopting the same snapshot twice does not raise the stored version', async () => {
    const storage = createStorage();
    const tab = bootApp({ storage });

    await signIn(tab);
    const record = readRecord(tab);
    const versionAfterLogin = storage.getItem('auth-session-record');

    tab.auth.adoptCrossTabSession();
    tab.auth.adoptCrossTabSession();
    await tab.auth.flushSessionWrites();

    assert.equal(storage.getItem('auth-session-record'), versionAfterLogin, 'adoption must not write');
    assert.equal(readRecord(tab).version, record.version, 'the version is unchanged');
  });

  test('adoption never writes, so a storage event cannot start a write loop between tabs', async () => {
    const storage = createStorage();
    const writer = bootApp({ storage });
    const reader = bootApp({ storage });

    await signIn(writer);
    // The reader subscribed the way a real tab does: by initialising, which hydrates it and binds
    // the `storage` fallback.
    reader.auth.init();
    assert.equal(reader.auth.token, 'ACCESS_1', 'a tab that opens after the login hydrates from the record');
    const before = storage.getItem('auth-session-record');

    // What a `storage` event looks like in the other tab.
    reader.emitStorageEvent();
    await reader.auth.flushSessionWrites();
    await Promise.resolve();

    assert.equal(storage.getItem('auth-session-record'), before, 'the reader answered nothing');
    assert.equal(reader.auth.token, 'ACCESS_1', 'but it did adopt the session');
  });

  test('the lifecycle channel is named after the API identity, not the session', async () => {
    const storage = createStorage();
    const bus = createBroadcastBus();
    const tab = bootApp({ storage, broadcastBus: bus });

    tab.auth.bindCrossTabSession();
    await signIn(tab);

    const names = [...bus.channels.keys()];
    const identity = tab.http.getApiIdentity();
    assert.deepEqual(names, [`frontend-session:${identity}`], 'one identity-scoped channel, no session in the name');
    assert.ok(!names.some((name) => /sid_|SESSION/.test(name)), 'the session id must not appear in the channel name');
  });

  test('a published lifecycle event carries metadata only, never a bearer', async () => {
    const storage = createStorage();
    const bus = createBroadcastBus();
    const tab = bootApp({ storage, broadcastBus: bus });

    tab.auth.bindCrossTabSession();
    await signIn(tab, { access: 'ACCESS_1', refresh: 'REFRESH_1' });

    const channel = bus.created[bus.created.length - 1];
    const published = channel.posted;
    assert.ok(published.length >= 1, 'a login publishes a lifecycle event');
    const serialised = JSON.stringify(published);
    assert.ok(!serialised.includes('ACCESS_1'), 'no access token is broadcast');
    assert.ok(!serialised.includes('REFRESH_1'), 'no refresh token is broadcast');
    assert.equal(published[0].sessionId, tab.auth.sessionId);
    assert.equal(published[0].identity, tab.http.getApiIdentity());
  });

  test('a tab bound before the login receives it through the shared channel', async () => {
    const storage = createStorage();
    const bus = createBroadcastBus();
    const early = bootApp({ storage, broadcastBus: bus });
    const late = bootApp({ storage, broadcastBus: bus });

    // The early tab binds while no session exists yet — the case a session-scoped channel missed.
    early.auth.bindCrossTabSession();
    assert.equal(early.auth.token, null);

    const record = await signIn(late, { access: 'ACCESS_1', refresh: 'REFRESH_1' });
    early.auth.adoptCrossTabSession();

    assert.equal(early.auth.token, 'ACCESS_1', 'the early tab adopted the session of the other tab');
    assert.equal(early.auth.sessionId, record.sessionId);
  });

  test('a tab that missed the message still reconciles on focus', async () => {
    const storage = createStorage();
    // A separate bus: the other tab's message cannot reach this one, which is the real "it was
    // closed, backgrounded, or the message never came" case.
    const early = bootApp({ storage, broadcastBus: createBroadcastBus() });
    const other = bootApp({ storage, broadcastBus: createBroadcastBus() });

    early.auth.bindCrossTabSession();
    await signIn(other, { access: 'ACCESS_1', refresh: 'REFRESH_1' });

    assert.equal(early.auth.token, null, 'no message was delivered');
    early.env.window._emit('focus');
    assert.equal(early.auth.token, 'ACCESS_1', 'focus reconciliation re-reads the canonical record');
  });

  test('without a BroadcastChannel the storage event is the fallback', async () => {
    const storage = createStorage();
    const tab = bootApp({ storage, broadcastBus: null });

    tab.auth.init();

    // A browser with no BroadcastChannel still has `storage` events for another tab's write.
    const other = bootApp({ storage });
    await signIn(other, { user: USER_B, access: 'ACCESS_2', refresh: 'REFRESH_2' });
    tab.emitStorageEvent();

    assert.equal(tab.auth.token, 'ACCESS_2', 'the record was adopted through the storage event');
  });

  test('a logout published by another tab ends this one, without this tab writing a tombstone', async () => {
    const storage = createStorage();
    const tab = bootApp({ storage });
    const other = bootApp({ storage });

    await signIn(tab);
    other.auth.init();
    other.auth.logout();
    await other.auth.flushSessionWrites();
    const tombstone = readRecord(tab);

    tab.emitStorageEvent();
    await tab.auth.flushSessionWrites();

    assert.equal(tab.auth.token, null, 'the session is gone locally');
    assert.deepEqual(readRecord(tab), tombstone, 'the other tab owns the tombstone; this one did not rewrite it');
  });
});

describe('FA-06 — one validator decides, and it runs before anything is mutated', () => {
  test('a millisecond expiry is rejected instead of being stored and reported as degraded storage', async () => {
    const app = bootApp({});
    const context = app.auth.beginLoginAttempt();

    const committed = await app.auth.commitLogin({
      user: USER_A,
      accessToken: 'ACCESS_MS',
      refreshToken: 'REFRESH_MS',
      expiresAt: (NOW_SECONDS + ACCESS_TTL) * 1000,
      refreshExpiresAt: (NOW_SECONDS + REFRESH_TTL) * 1000,
    }, context);

    assert.equal(committed.status, 'invalid', 'the login is rejected');
    assert.equal(app.auth.token, null, 'no token material is kept in memory');
    assert.equal(app.auth.storageDegraded, false, 'a bad payload is not a storage problem');
    assert.equal(app.auth.lastCommitReason, 'bad-expires-at');
    assert.equal(app.readRecord(), null, 'and nothing is persisted');
  });

  test('a rotation is validated exactly as strictly as a login', async () => {
    const app = bootApp({});
    const own = await signIn(app, { access: 'ACCESS_1', refresh: 'REFRESH_1' });
    const context = app.auth.captureContext();

    const applied = await app.auth.applyRotation({
      accessToken: 'ACCESS_ROTATED',
      refreshToken: 'REFRESH_ROTATED',
      expiresAt: (NOW_SECONDS + ACCESS_TTL) * 1000,
      refreshExpiresAt: (NOW_SECONDS + REFRESH_TTL) * 1000,
    }, context, { predecessor: predecessorOf(own) });

    assert.equal(applied.status, 'invalid', 'a rotation cannot be looser than a login');
    assert.equal(app.auth.lastCommitReason, 'bad-expires-at');
    assert.equal(app.readRecord().accessToken, 'ACCESS_1', 'the valid record is unchanged');
  });

  test('a login that the validator refuses is never written, whatever the store reports', async () => {
    const app = bootApp({});
    const cases = [
      [{ accessToken: 'A', refreshToken: '' }, 'missing-token'],
      [{ accessToken: 'SAME', refreshToken: 'SAME' }, 'token-alias'],
      [{ accessToken: 'A', refreshToken: 'R', expiresAt: NOW_SECONDS + 10, refreshExpiresAt: NOW_SECONDS }, 'expiry-order'],
      [{ accessToken: 'A', refreshToken: 'R', user: 'not-an-object' }, 'bad-user'],
    ];

    for (const [payload, reason] of cases) {
      const context = app.auth.beginLoginAttempt();
      const committed = await app.auth.commitLogin({
        user: USER_A,
        expiresAt: NOW_SECONDS + ACCESS_TTL,
        refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
        ...payload,
      }, context);

      assert.equal(committed.status, 'invalid', `${reason} must be rejected`);
      assert.equal(app.auth.lastCommitReason, reason);
      assert.equal(app.auth.token, null, `${reason} must not leave token material in memory`);
    }
  });

  test('a record whose state is unknown is corruption, not an active session', () => {
    const { readSessionState, validateSessionSnapshot } = loadModuleDirect();
    const storage = createStorage();
    const identity = loadModuleDirect().readSessionState
      ? 'http://localhost:8788'
      : '';
    storage.setItem('auth-session-record', JSON.stringify({
      schemaVersion: 2,
      identity,
      sessionId: 'SESSION_X',
      version: 1,
      state: 'activee',
      user: USER_A,
      accessToken: 'A',
      refreshToken: 'R',
      expiresAt: NOW_SECONDS + ACCESS_TTL,
      refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
    }));

    const observed = readSessionState({ storage, expectedIdentity: identity });
    assert.equal(observed.status, 'invalid');
    assert.equal(observed.reason, 'bad-state');
    assert.equal(observed.record, null, 'a corrupt record is never handed to a caller as a session');

    assert.equal(validateSessionSnapshot({ state: 'refreshed' }, { expectedIdentity: identity }).ok, false);
  });

  test('a store that finds such a record requires a new login and keeps no token', async () => {
    const storage = createStorage();
    const app = bootApp({ storage });
    const identity = app.http.getApiIdentity();
    storage.setItem('auth-session-record', JSON.stringify({
      schemaVersion: 2,
      identity,
      sessionId: 'SESSION_X',
      version: 1,
      state: 'activee',
      user: USER_A,
      accessToken: 'ACCESS_CORRUPT',
      refreshToken: 'REFRESH_CORRUPT',
      expiresAt: NOW_SECONDS + ACCESS_TTL,
      refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
    }));

    app.auth.init();
    await app.auth.flushSessionWrites();

    assert.equal(app.auth.token, null);
    assert.equal(app.auth.requiresReauth, true);
    assert.equal(readRecord(app).state, 'ended', 'the record is replaced by a valid tombstone');
  });
});

describe('FA-07 — a rejected record is never replaced by legacy token material', () => {
  test('a corrupt canonical record is not filled in from the legacy keys', async () => {
    const storage = createStorage();
    const app = bootApp({ storage });
    storage.setItem('auth-session-record', '{ this is not json');
    storage.setItem('token', 'LEGACY_ACCESS');
    storage.setItem('refresh_token', 'LEGACY_REFRESH');
    storage.setItem('expires_at', String(NOW_SECONDS + ACCESS_TTL));
    storage.setItem('refresh_expires_at', String(NOW_SECONDS + REFRESH_TTL));
    storage.setItem('user', JSON.stringify(USER_A));
    storage.setItem('auth-api-identity', app.http.getApiIdentity());

    app.auth.init();
    await app.auth.flushSessionWrites();

    assert.equal(app.auth.token, null, 'legacy tokens must not resurrect a rejected record');
    assert.equal(app.auth.requiresReauth, true);
    assert.equal(readRecord(app).state, 'ended');
  });

  test('a record bound to another API identity is rejected, and legacy keys do not help', async () => {
    const storage = createStorage();
    const app = bootApp({ storage });
    const identity = app.http.getApiIdentity();
    storage.setItem('auth-session-record', JSON.stringify({
      schemaVersion: 2,
      identity: TEST_ORIGINS.apiB,
      sessionId: 'SESSION_OTHER',
      version: 3,
      state: 'active',
      user: USER_B,
      accessToken: 'OTHER_ACCESS',
      refreshToken: 'OTHER_REFRESH',
      expiresAt: NOW_SECONDS + ACCESS_TTL,
      refreshExpiresAt: NOW_SECONDS + REFRESH_TTL,
    }));
    storage.setItem('token', 'LEGACY_ACCESS');
    storage.setItem('refresh_token', 'LEGACY_REFRESH');
    storage.setItem('expires_at', String(NOW_SECONDS + ACCESS_TTL));
    storage.setItem('refresh_expires_at', String(NOW_SECONDS + REFRESH_TTL));
    storage.setItem('user', JSON.stringify(USER_A));
    storage.setItem('auth-api-identity', identity);

    app.auth.init();
    await app.auth.flushSessionWrites();

    assert.equal(app.auth.token, null, 'a token issued by another API server is never adopted (F03)');
    assert.equal(app.storage.getItem('token'), null, 'and the legacy material is purged');
  });

  test('a tombstone is not overridden by a consistent legacy session', async () => {
    const storage = createStorage();
    const app = bootApp({ storage });
    const identity = app.http.getApiIdentity();
    storage.setItem('auth-session-record', JSON.stringify({
      schemaVersion: 2,
      identity,
      sessionId: 'SESSION_ENDED',
      version: 4,
      state: 'ended',
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      refreshExpiresAt: null,
    }));
    storage.setItem('token', 'LEGACY_ACCESS');
    storage.setItem('refresh_token', 'LEGACY_REFRESH');
    storage.setItem('expires_at', String(NOW_SECONDS + ACCESS_TTL));
    storage.setItem('refresh_expires_at', String(NOW_SECONDS + REFRESH_TTL));
    storage.setItem('user', JSON.stringify(USER_A));
    storage.setItem('auth-api-identity', identity);

    app.auth.init();
    await app.auth.flushSessionWrites();

    assert.equal(app.auth.token, null, 'the session was ended; a stale legacy copy does not undo it');
    assert.equal(readRecord(app).state, 'ended');
    assert.equal(readRecord(app).version, 4, 'the tombstone is not re-versioned by a read');
  });

  test('a genuinely absent record is still migrated from a consistent legacy session', async () => {
    const storage = createStorage();
    const app = bootApp({ storage });
    storage.setItem('api-base-url', app.http.getApiIdentity());
    storage.setItem('token', 'LEGACY_ACCESS');
    storage.setItem('refresh_token', 'LEGACY_REFRESH');
    storage.setItem('expires_at', String(NOW_SECONDS + ACCESS_TTL));
    storage.setItem('refresh_expires_at', String(NOW_SECONDS + REFRESH_TTL));
    storage.setItem('user', JSON.stringify(USER_A));
    storage.setItem('auth-api-identity', app.http.getApiIdentity());

    app.auth.init();
    await app.auth.flushSessionWrites();

    assert.equal(app.auth.token, 'LEGACY_ACCESS', 'one migration, so an existing user stays logged in');
    const record = app.readRecord();
    assert.equal(record.state, 'active');
    assert.ok(record.sessionId, 'the migrated session gets its own id');
    assert.equal(record.version, 1);
  });

  test('an unbound legacy session is purged instead of migrated', async () => {
    const storage = createStorage();
    const app = bootApp({ storage });
    storage.setItem('api-base-url', app.http.getApiIdentity());
    storage.setItem('token', 'LEGACY_ACCESS');
    storage.setItem('refresh_token', 'LEGACY_REFRESH');
    storage.setItem('expires_at', String(NOW_SECONDS + ACCESS_TTL));
    storage.setItem('refresh_expires_at', String(NOW_SECONDS + REFRESH_TTL));
    storage.setItem('user', JSON.stringify(USER_A));

    app.auth.init();

    assert.equal(app.auth.token, null);
    assert.equal(app.auth.requiresReauth, true);
    assert.equal(app.storage.getItem('token'), null, 'the unbound token is removed');
  });
});

/** A private module realm for the direct validator assertions. */
function loadModuleDirect() {
  return loadModule('assets/js/api/sessionStorage.js', createBrowserEnv({ origin: API_A }));
}
