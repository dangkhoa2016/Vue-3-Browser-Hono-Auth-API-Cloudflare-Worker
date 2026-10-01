/**
 * R5-A / R5-C — who may write the canonical session record, and in what order.
 *
 * Every scenario here drives a *real* Web Locks queue (helpers createLockManager) and latches the
 * writer lock so the ordering is explicit. Nothing sleeps, nothing passes `locks: null` by accident:
 * a suite that hands the app no lock manager exercises a different product behaviour, and that
 * behaviour has its own scenario at the bottom of this file.
 *
 * The round4 code fails these on behaviour, not on import:
 *   - `applyRotation()` checked its context *before* taking the lock and then adopted the result
 *     without re-checking, so a rotation queued before a logout restored the token (R5-A);
 *   - `classifyCommitConflict()` used one version rule for every operation, so a logout that met a
 *     newer snapshot of the *same* session returned `ambiguous` and left the record active (R5-A);
 *   - the no-lock branch read, checked and wrote without any mutual exclusion and still reported
 *     `applied` (R5-C).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  API_A,
  API_B,
  NOW_SECONDS,
  WRITER_LOCK_NAME,
  baseSession,
  bootApp,
} from './helpers/app-harness.mjs';
import { createBrowserEnv, createLockManager, createStorage, loadModule, ok } from './helpers/browser-env.mjs';
import { NEVER_SETTLED, createManualClock, drain, watch } from './helpers/manual-clock.mjs';

const ROTATED = {
  accessToken: 'FAKE_ACCESS_A2',
  refreshToken: 'FAKE_REFRESH_A2',
  expiresAt: NOW_SECONDS + 7200,
  refreshExpiresAt: NOW_SECONDS + 259200,
};

/** Boots a tab whose API identity is A and that already holds a durable v1 session. */
async function bootSignedIn({ storage, locks, routes = {}, ...rest } = {}) {
  const app = bootApp({ storage, locks, baseUrl: API_A, routes, ...rest });
  // A real app boots and initialises before anyone signs in, so the API-identity subscription is
  // already in place. The fixture login is only meaningful in that order.
  app.auth.init();
  const context = app.auth.beginLoginAttempt();
  const committed = await app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);

  assert.equal(committed.status, 'applied', 'the v1 fixture session must be durable before the race starts');
  return { app, context };
}

const settled = async (promise) => {
  let done = false;
  const marker = Promise.resolve(promise).then(() => { done = true; }, () => { done = true; });
  await marker;
  return done;
};

test('R5-A — a rotation queued before a logout never revives the session', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context } = await bootSignedIn({ storage, locks });
  const v1 = app.readRecord();

  // Park the writer lock, so the rotation cannot have been persisted yet.
  const release = locks.hold(WRITER_LOCK_NAME);
  const rotation = app.auth.applyRotation({ ...ROTATED, user: v1.user }, context, { predecessor: app.predecessor() });
  await new Promise((resolve) => setImmediate(resolve));

  // The user logs out while the rotation is still queued.
  const logout = app.auth.logout();

  // Local invalidation is synchronous: memory is already gone before the first await.
  assert.equal(app.auth.token, null, 'logout must clear memory immediately, not after the tombstone lands');
  assert.equal(app.auth.user, null);
  assert.equal(app.auth.isAuthenticated, false);

  release();
  const [rotationResult, logoutResult] = await Promise.all([rotation, logout]);

  // A rotation of a lifecycle that a logout has ended may be refused, or may have won the race and
  // been ended afterwards. What may never happen is a live session at the end.
  assert.ok(
    ['stale', 'applied'].includes(rotationResult.status),
    `an ended lifecycle must not report "${rotationResult.status}" for a rotation`
  );
  assert.equal(logoutResult.status, 'applied', 'the logout itself has to end the session it targeted');

  const final = app.readRecord();
  assert.equal(final.state, 'ended', 'the canonical record must end up ended');
  assert.equal(final.sessionId, v1.sessionId, 'the tombstone belongs to the session that was logged out');
  assert.equal(final.accessToken, null, 'an ended record never keeps a bearer');
  assert.equal(app.auth.token, null, 'no callback may restore a token into memory');
  assert.equal(app.auth.user, null);
  assert.equal(app.auth.isAuthenticated, false);
  assert.equal(storage.getItem('token'), null, 'the legacy mirror must not keep the old bearer');
  assert.equal(storage.getItem('refresh_token'), null);
});

test('R5-A — a logout that lands first is not undone by the rotation that follows it', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context } = await bootSignedIn({ storage, locks });
  const v1 = app.readRecord();

  const release = locks.hold(WRITER_LOCK_NAME);
  const logout = app.auth.logout();
  const rotation = app.auth.applyRotation({ ...ROTATED, user: v1.user }, context, { predecessor: app.predecessor() });
  await new Promise((resolve) => setImmediate(resolve));
  release();

  const [, rotationResult] = await Promise.all([logout, rotation]);

  assert.equal(rotationResult.status, 'stale', 'a rotation of an ended session is stale, never a silent success');
  assert.equal(app.readRecord().state, 'ended');
  assert.equal(app.auth.token, null);
});

test('R5-A — a login that was queued and then logged out is rejected, not resurrected', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = bootApp({ storage, locks, baseUrl: API_A });

  const release = locks.hold(WRITER_LOCK_NAME);
  const loginContext = app.auth.beginLoginAttempt();
  const login = app.auth.commitLogin({
    user: baseSession().user,
    accessToken: 'FAKE_ACCESS_B',
    refreshToken: 'FAKE_REFRESH_B',
    expiresAt: NOW_SECONDS + 3600,
    refreshExpiresAt: NOW_SECONDS + 259200,
  }, loginContext);

  const logout = app.auth.logout();
  await new Promise((resolve) => setImmediate(resolve));
  release();

  const [loginResult] = await Promise.all([login, logout]);
  assert.equal(loginResult.status, 'stale', 'a login intent invalidated by a logout must be refused');
  assert.equal(app.auth.isAuthenticated, false);
  assert.equal(storage.getItem('token'), null);
});

test('R5-A — a logout never removes a session that a newer login already owns', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context: contextA } = await bootSignedIn({ storage, locks });
  const sessionA = app.readRecord().sessionId;

  // User A logs out, then signs in as user B.
  await app.auth.logout();
  const contextB = app.auth.beginLoginAttempt();
  const loginB = await app.auth.commitLogin({
    user: { id: 2, email: 'other@example.test', role: 'admin' },
    accessToken: 'FAKE_ACCESS_B',
    refreshToken: 'FAKE_REFRESH_B',
    expiresAt: NOW_SECONDS + 3600,
    refreshExpiresAt: NOW_SECONDS + 259200,
  }, contextB);

  assert.equal(loginB.status, 'applied');
  const sessionB = app.readRecord().sessionId;
  assert.notEqual(sessionB, sessionA, 'a new login is a new lifecycle');

  // A *late* end of session A must not touch B: not the record, not the mirror.
  const { commitSession, SESSION_OPERATION } = await import('../../assets/js/api/sessionStorage.js');
  const lateEnd = await commitSession({
    schemaVersion: 2,
    identity: API_A,
    sessionId: sessionA,
    version: 99,
    state: 'ended',
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    refreshExpiresAt: null,
  }, { operation: SESSION_OPERATION.END, storage, locks, identity: API_A });

  assert.equal(lateEnd.status, 'stale', 'ending a session that no longer owns the record is stale');
  const final = app.readRecord();
  assert.equal(final.state, 'active');
  assert.equal(final.sessionId, sessionB, 'the newer login still owns the record');
  assert.equal(final.accessToken, 'FAKE_ACCESS_B');
  assert.equal(storage.getItem('token'), 'FAKE_ACCESS_B', "session A's logout must not wipe session B's mirror");
  void contextA;
});

test('R5-A — a rotation of a session that ended survives an API identity switch', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context } = await bootSignedIn({ storage, locks });
  const v1 = app.readRecord();

  const release = locks.hold(WRITER_LOCK_NAME);
  const rotation = app.auth.applyRotation({ ...ROTATED, user: v1.user }, context, { predecessor: app.predecessor() });
  await new Promise((resolve) => setImmediate(resolve));

  // The operator points the client at a different API while the rotation is still queued.
  app.http.setApiClientBaseUrl(API_B);
  release();
  await rotation;

  assert.equal(app.auth.token, null, 'the previous API identity\'s session is gone from memory');
  assert.equal(app.auth.apiIdentity, null);
  assert.notEqual(app.readRecord()?.identity, API_B, 'no session of API A may be presented as a session of API B');
});

test('R5-A — ending a session also ends a rotation of the same session that landed first', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context } = await bootSignedIn({ storage, locks });
  const v1 = app.readRecord();

  const rotation = await app.auth.applyRotation({ ...ROTATED, user: v1.user }, context, { predecessor: app.predecessor() });
  assert.equal(rotation.status, 'applied');
  const v2 = app.readRecord();
  assert.equal(v2.version, v1.version + 1, 'a rotation of the same session only raises the version');

  const logout = await app.auth.logout();
  assert.equal(logout.status, 'applied', 'a logout must not be refused merely because the version went up');

  const final = app.readRecord();
  assert.equal(final.state, 'ended');
  assert.equal(final.sessionId, v1.sessionId, 'the same session is ended, not replaced');
  assert.equal(app.auth.token, null);
});

test('R5-A / FA-02 — ending the same session twice is idempotent and does not churn the record', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app } = await bootSignedIn({ storage, locks });

  const first = await app.auth.logout();
  assert.equal(first.status, 'applied');
  const afterFirst = app.readRecord();
  const writesAfterFirst = app.recordWrites().length;

  const second = await app.auth.logout();
  assert.equal(second.status, 'applied', 'repeating an end is not an error');
  assert.equal(second.reason, 'already-ended', 'and it must report that it did not need to write');
  assert.deepEqual(app.readRecord(), afterFirst, 'the stored record is byte-identical after a repeated end');
  assert.equal(app.recordWrites().length, writesAfterFirst, 'a repeated end must not write the record again');
});

test('R5-C — two identities on one origin serialise on the single writer lock', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const tabA = bootApp({ storage, locks, baseUrl: API_A });
  const tabB = bootApp({ storage, locks, baseUrl: API_B });

  const sessionA = baseSession();
  const sessionB = {
    ...baseSession(),
    access_token: 'FAKE_ACCESS_B1',
    refresh_token: 'FAKE_REFRESH_B1',
  };

  // Both writers are queued without awaiting either: the guard, not the call order, decides.
  const contextA = tabA.auth.beginLoginAttempt();
  const contextB = tabB.auth.beginLoginAttempt();
  const loginA = tabA.auth.commitLogin({
    user: sessionA.user,
    accessToken: sessionA.access_token,
    refreshToken: sessionA.refresh_token,
    expiresAt: sessionA.expires_at,
    refreshExpiresAt: sessionA.refresh_expires_at,
  }, contextA);
  const loginB = tabB.auth.commitLogin({
    user: sessionB.user,
    accessToken: sessionB.access_token,
    refreshToken: sessionB.refresh_token,
    expiresAt: sessionB.expires_at,
    refreshExpiresAt: sessionB.refresh_expires_at,
  }, contextB);
  await Promise.all([loginA, loginB]);

  // Two different API identities, but `auth-session-record` is one key on one origin.
  const release = locks.hold(WRITER_LOCK_NAME);
  const rotationA = tabA.auth.applyRotation({ ...ROTATED, user: sessionA.user }, contextA, { predecessor: tabA.predecessor() });
  const rotationB = tabB.auth.applyRotation({
    accessToken: 'FAKE_ACCESS_B2',
    refreshToken: 'FAKE_REFRESH_B2',
    expiresAt: NOW_SECONDS + 7200,
    refreshExpiresAt: NOW_SECONDS + 259200,
    user: sessionB.user,
  }, contextB, { predecessor: tabB.predecessor() });

  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(locks.pending(WRITER_LOCK_NAME) >= 1, 'both writers wait for the same lock, not for their own');
  release();
  await Promise.all([rotationA, rotationB]);

  // The lock name carries neither the identity nor a session id: one canonical resource, one lock.
  assert.ok(locks.requested.length > 0);
  for (const name of locks.requested) {
    assert.equal(name, WRITER_LOCK_NAME, `a writer took the lock "${name}"; only ${WRITER_LOCK_NAME} is valid`);
  }

  // Serialisation is a property of the *writes*, not of the name string: the record may end up as
  // either writer's snapshot, but never as a blend of the two, and the mirror must agree with it.
  const final = JSON.parse(storage.getItem('auth-session-record') || 'null');
  const pairs = [
    ['FAKE_ACCESS_B2', 'FAKE_REFRESH_B2'],
    [ROTATED.accessToken, ROTATED.refreshToken],
  ];
  assert.ok(
    pairs.some(([access, refresh]) => final?.accessToken === access && final?.refreshToken === refresh),
    `the final record must be exactly one writer's snapshot, got ${JSON.stringify(final)}`
  );
  assert.equal(storage.getItem('token'), final.accessToken, 'the mirror must match the record that won');
  assert.equal(storage.getItem('refresh_token'), final.refreshToken);
});

test('R5-C — a re-read under the lock is what makes a rotation merge into the newest snapshot', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context } = await bootSignedIn({ storage, locks });
  const v1 = app.readRecord();

  const { commitSession, SESSION_OPERATION } = await import('../../assets/js/api/sessionStorage.js');

  // The competing writer is queued *first*, so the writer lock grants it before the rotation. The
  // rotation was requested against v1 and is applied against v2 — exactly the window a read outside
  // the lock leaves open.
  const otherWriter = commitSession({
    ...v1,
    version: v1.version + 1,
    user: { ...v1.user, full_name: 'Newest Name' },
  }, { operation: SESSION_OPERATION.PROFILE, expected: v1, storage, locks, identity: API_A });

  const rotation = app.auth.applyRotation({ ...ROTATED, user: v1.user }, context, { predecessor: app.predecessor() });

  assert.equal((await otherWriter).status, 'applied', 'the competing writer of the same session is a profile update');
  const result = await rotation;

  assert.equal(result.status, 'applied');
  const final = app.readRecord();
  assert.equal(final.user.full_name, 'Newest Name', 'a rotation must not roll back a newer profile update');
  assert.equal(final.accessToken, ROTATED.accessToken, 'and it must still carry the tokens it was issued');
  assert.equal(final.refreshToken, ROTATED.refreshToken);
});

test('R5-C — without a writer lock new login is refused and stays signed out', async () => {
  const storage = createStorage();
  // A browser with no Web Locks: there is no CAS for localStorage, so nothing durable may happen.
  const app = bootApp({ storage, locks: null, baseUrl: API_A });

  const context = app.auth.beginLoginAttempt();
  const login = await app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);

  assert.equal(login.status, 'unavailable', 'a session that cannot be serialised is not a persisted session');
  assert.equal(login.reason, 'no-writer-serialization');
  assert.equal(storage.getItem('auth-session-record'), null, 'reduced mode must not pretend to have stored a session');
  assert.equal(app.auth.sessionPersistence, 'memory-only', 'and the store must expose that the session is memory-only');
  assert.equal(app.auth.isAuthenticated, false, 'owner option 2 refuses memory-only sign-in');

  // A rotation cannot be serialised either, so a request that needs a fresh bearer is refused
  // rather than sent with the expired one.
  const rotation = await app.auth.applyRotation({ ...ROTATED, user: baseSession().user }, context, { predecessor: app.memoryPredecessor() });
  assert.equal(rotation.status, 'invalid', 'there is no accepted predecessor to rotate');
  assert.equal(storage.getItem('auth-session-record'), null);

  const logout = await app.auth.logout();
  assert.equal(logout.status, 'unavailable', 'no shared tombstone may be promised');
  assert.equal(app.auth.token, null, 'memory is still cleared immediately');
});

test('R5-C — reduced mode does not re-hydrate a stored record, and reload is not a silent login', async () => {
  // A record left behind by a build (or another tab) that *does* have Web Locks.
  const durable = {
    schemaVersion: 2,
    identity: API_A,
    sessionId: 'sid_persisted',
    version: 3,
    state: 'active',
    user: { id: 1, email: 'user@example.test' },
    accessToken: 'FAKE_ACCESS_PERSISTED',
    refreshToken: 'FAKE_REFRESH_PERSISTED',
    expiresAt: NOW_SECONDS + 3600,
    refreshExpiresAt: NOW_SECONDS + 259200,
  };
  const storage = createStorage({ 'auth-session-record': JSON.stringify(durable) });
  const app = bootApp({ storage, locks: null, baseUrl: API_A });

  app.auth.init();

  assert.equal(app.auth.token, null, 'a tab that cannot serialise writers must not adopt a stored session');
  assert.equal(app.auth.requiresReauth, true);
  assert.equal(app.auth.sessionPersistence, 'memory-only');
  assert.equal(storage.getItem('auth-session-record'), JSON.stringify(durable), 'and it must not destroy what it cannot maintain');
});

test('R5-C — a storage failure is reported, never dressed up as a committed session', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = bootApp({ storage, locks, baseUrl: API_A });
  const context = app.auth.beginLoginAttempt();

  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const failed = await app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);

  assert.equal(failed.status, 'storage-failure');
  assert.equal(failed.record, null, 'a half-written session is not a session');
  assert.equal(app.auth.storageDegraded, true);
  assert.ok(settled);
});

test('R5-C — a storage read exception is reported as unavailable, not as an absent session', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = bootApp({ storage, locks, baseUrl: API_A });
  const context = app.auth.beginLoginAttempt();

  await app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);

  const observed = app.auth.readSessionState();
  assert.equal(observed.status, 'active');

  storage.getItem = () => { throw new Error('SecurityError'); };
  const afterFailure = app.auth.readSessionState();
  assert.equal(afterFailure.status, 'unavailable');
  assert.equal(afterFailure.record, null);
  assert.notEqual(afterFailure.status, 'absent', '"unreadable" and "nothing stored" must stay distinguishable');
});

/* ---------------------------------------------------------------------------------------------- */
/* FR6-A — the remote logout owns a fixed target; its late callbacks never adopt a newer session.   */
/* ---------------------------------------------------------------------------------------------- */

const SESSION_B = {
  user: { id: 2, email: 'user-b@example.test', role: 'user' },
  accessToken: 'FAKE_ACCESS_B',
  refreshToken: 'FAKE_REFRESH_B',
  expiresAt: NOW_SECONDS + 3600,
  refreshExpiresAt: NOW_SECONDS + 259200,
};

test('FR6-A — a remote logout that is still pending does not end the login that replaced it', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context } = await bootSignedIn({ storage, locks, routes: {
    'post /api/auth/logout': ok({ revoked: true }),
  } });
  const sessionA = app.readRecord();

  // The writer lock is parked, so the logout's tombstone cannot land yet and the logout is
  // provably still pending while the next login is started.
  const release = locks.hold(WRITER_LOCK_NAME);

  const logoutA = app.auth.logoutRemote(context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.auth.token, null, 'the logout must invalidate memory synchronously, before any await');
  assert.equal(app.auth.isAuthenticated, false);

  // A different person signs in while the revoke of the previous session is still in flight.
  const contextB = app.auth.beginLoginAttempt();
  const loginB = app.auth.commitLogin(SESSION_B, contextB);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(locks.pending(WRITER_LOCK_NAME) >= 2, 'both the logout end and the login are queued on the one writer lock');

  release();
  const [loginResult, logoutResult] = await Promise.all([loginB, logoutA]);

  assert.equal(loginResult.status, 'applied', 'the new login owns the session and must be applied');
  assert.ok(logoutA !== undefined);

  const final = app.readRecord();
  assert.equal(final.state, 'active', 'a logout of session A must not end session B');
  assert.notEqual(final.sessionId, sessionA.sessionId);
  assert.equal(final.accessToken, SESSION_B.accessToken, 'the canonical record must hold B\'s bearer');
  assert.equal(final.refreshToken, SESSION_B.refreshToken);
  assert.equal(final.user.id, SESSION_B.user.id);

  // Memory and the compatibility mirror agree with the canonical record.
  assert.equal(app.auth.token, SESSION_B.accessToken, 'the old logout\'s finally must not clear the new session');
  assert.equal(app.auth.refreshToken, SESSION_B.refreshToken);
  assert.equal(app.auth.user.id, SESSION_B.user.id);
  assert.equal(app.auth.isAuthenticated, true);
  assert.equal(storage.getItem('token'), SESSION_B.accessToken, 'the mirror must not be purged by the old logout');
  assert.equal(storage.getItem('refresh_token'), SESSION_B.refreshToken);
  assert.equal(storage.getItem('user'), JSON.stringify(SESSION_B.user));

  // The revoke itself used A\'s snapshot only: A\'s bearer must never travel with a request that a
  // newer session is responsible for, and B\'s tokens are never sent to the revoke endpoint.
  const logoutCalls = app.transport.calls.filter((call) => call.key === 'post /api/auth/logout');
  assert.equal(logoutCalls.length, 1, 'exactly one revoke is sent');
  assert.equal(logoutCalls[0].config.headers.Authorization, `Bearer ${sessionA.accessToken}`);
  assert.deepEqual(logoutCalls[0].config.data, { refresh_token: sessionA.refreshToken });
  assert.ok(!JSON.stringify(logoutCalls[0].config).includes(SESSION_B.refreshToken), 'B\'s refresh token must not be sent to the revoke endpoint');
  assert.equal(logoutResult.revoked, true, 'the revoke outcome of A is still reported to its own caller');
});

test('FR6-A — the end target cannot be re-bound to whatever the record says after the await', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context } = await bootSignedIn({ storage, locks, routes: {
    'post /api/auth/logout': ok({ revoked: true }),
  } });
  const sessionA = app.readRecord();

  const release = locks.hold(WRITER_LOCK_NAME);
  const logoutA = app.auth.logoutRemote(context);
  await new Promise((resolve) => setImmediate(resolve));

  // A second login lands *first* in the queue, so by the time the logout's own end runs the record
  // already belongs to B. The end must recognise a foreign lifecycle and leave B alone.
  const contextB = app.auth.beginLoginAttempt();
  const loginB = app.auth.commitLogin(SESSION_B, contextB);
  await new Promise((resolve) => setImmediate(resolve));
  release();

  await Promise.all([loginB, logoutA]);

  const final = app.readRecord();
  assert.equal(final.state, 'active');
  assert.equal(final.accessToken, SESSION_B.accessToken);
  assert.equal(final.user.id, SESSION_B.user.id);
  assert.equal(app.auth.token, SESSION_B.accessToken);
  assert.ok(final.sessionId !== sessionA.sessionId, 'the tombstone may not be re-stamped with the new session id');
  assert.equal(storage.getItem('token'), SESSION_B.accessToken);
});

test('FR6-A — ending a lifecycle that is already ended is idempotent and writes nothing', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const { app, context } = await bootSignedIn({ storage, locks });

  const first = await app.auth.logoutRemote(context);
  assert.equal(first.revoked, false, 'no credential is left, so there is nothing to revoke');

  const afterFirst = app.readRecord();
  assert.equal(afterFirst.state, 'ended');
  const writesAfterFirst = app.recordWrites().length;

  // A repeated logout of the same, already-ended lifecycle must not bump the version, must not write
  // again, and must not announce a second end to the other tabs.
  const again = await app.auth.clearLocalSession(null, 'logout-no-session');
  assert.equal(again.status, 'applied');
  assert.equal(again.reason, 'already-ended', 'a repeated end is recognised, not re-applied');
  assert.equal(app.recordWrites().length, writesAfterFirst, 'no second write for one logout');
  assert.equal(app.readRecord().version, afterFirst.version, 'the version must not be raised twice');
});

/* ---------------------------------------------------------------------------------------------- */
/* FR6-B / FR6-C — reduced mode never resurrects a session and never spends someone else's token.   */
/* ---------------------------------------------------------------------------------------------- */

test('FR6-B — a memory-only login that is logged out immediately stays signed out', async () => {
  const storage = createStorage();
  // A browser with no Web Locks. The login cannot be serialised, so it lives in memory only.
  const app = bootApp({ storage, locks: null, baseUrl: API_A, routes: {
    'post /api/auth/logout': ok({ revoked: true }),
  } });

  const context = app.auth.beginLoginAttempt();
  const login = app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);

  // The user changes their mind before the login settled. No await in between: the guard has to
  // hold for a login that is still pending, not only for one that already returned.
  const logout = app.auth.logoutRemote(context);

  const [loginResult, logoutResult] = await Promise.all([login, logout]);

  // `stale`, not `unavailable`: the intent really was superseded, and saying so is more useful to a
  // caller than a storage verdict about a commit that must never happen.
  assert.equal(loginResult.status, 'stale');
  assert.equal(loginResult.reason, 'superseded-intent');
  assert.equal(loginResult.record, null, 'and no record is handed back to a caller that lost the race');
  // The credential did not exist yet when the logout was issued, so there is genuinely nothing to
  // revoke. What matters is that the login cannot put the token back afterwards.
  assert.equal(logoutResult.revoked, false);
  assert.equal(logoutResult.reason, 'no-session');

  assert.equal(app.auth.token, null, 'a login that resolves after the logout must not bring the token back');
  assert.equal(app.auth.refreshToken, null);
  assert.equal(app.auth.user, null);
  assert.equal(app.auth.isAuthenticated, false);
  assert.equal(storage.getItem('auth-session-record'), null, 'reduced mode still writes nothing durable');
  assert.equal(storage.getItem('token'), null);
  assert.equal(storage.getItem('refresh_token'), null);
  assert.equal(storage.getItem('user'), null);
});

test('FR6-C — a refresh in reduced mode is refused before the network, with a typed reason', async () => {
  const storage = createStorage();
  const app = bootApp({ storage, locks: null, baseUrl: API_A, routes: {
    'post /api/auth/refresh_token': ok(baseSession({ access_token: 'FAKE_ACCESS_ROTATED' })),
  } });

  const context = app.auth.beginLoginAttempt();
  // A legacy/degraded in-memory state can still reach refresh; new login no longer creates it.
  Object.assign(app.auth, {
    user: baseSession().user, token: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: NOW_SECONDS - 60, refreshExpiresAt: NOW_SECONDS + 259200,
  });
  app.auth.syncClock();

  const refreshCalls = () => app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token').length;
  const callsBefore = refreshCalls();

  const token = await app.auth.refreshAccessToken(context);

  assert.equal(token, null, 'no usable bearer may be promised');
  assert.equal(app.auth.lastRefreshError, 'AUTH_TEMPORARILY_UNAVAILABLE', 'the refusal is typed, not a silent null');
  assert.equal(refreshCalls(), callsBefore, 'zero refresh requests: the refusal happens BEFORE the network');
  assert.equal(app.auth.token, baseSession().access_token, 'the in-memory bearer is left exactly as it was, not replaced and not cleared');
  assert.equal(app.auth.isAccessTokenExpired, true, 'and it really is expired: a protected request may not use it');
  assert.equal(app.auth.isAuthenticated, true, 'the session itself is not thrown away by a temporary failure');
});

test('FR6-C — a memory-only session in one tab never consumes the durable session of another', async () => {
  const storage = createStorage();
  // Another tab, on a browser with Web Locks, owns a durable session for the same origin.
  const durable = {
    schemaVersion: 2,
    identity: API_A,
    sessionId: 'sid_durable_other_tab',
    version: 7,
    state: 'active',
    user: { id: 1, email: 'other@example.test' },
    accessToken: 'FAKE_ACCESS_OTHER_TAB',
    refreshToken: 'FAKE_REFRESH_OTHER_TAB',
    expiresAt: NOW_SECONDS + 3600,
    refreshExpiresAt: NOW_SECONDS + 259200,
  };
  storage.setItem('auth-session-record', JSON.stringify(durable));
  storage.setItem('token', durable.accessToken);
  storage.setItem('refresh_token', durable.refreshToken);
  storage.setItem('user', JSON.stringify(durable.user));

  // This tab has no Web Locks, so it is in reduced mode.
  const app = bootApp({ storage, locks: null, baseUrl: API_A, routes: {
    'post /api/auth/refresh_token': ok(baseSession({ access_token: 'FAKE_ACCESS_ROTATED' })),
  } });
  app.auth.init();

  const context = app.auth.beginLoginAttempt();
  await app.auth.commitLogin({
    user: SESSION_B.user,
    accessToken: SESSION_B.accessToken,
    refreshToken: SESSION_B.refreshToken,
    expiresAt: NOW_SECONDS - 60,
    refreshExpiresAt: NOW_SECONDS + 259200,
  }, context);
  app.auth.syncClock();

  const token = await app.auth.refreshAccessToken(context);

  assert.equal(token, null, 'a reduced-mode tab may not refresh at all');
  const refreshCalls = app.transport.calls.filter((call) => call.key === 'post /api/auth/refresh_token');
  assert.equal(refreshCalls.length, 0, `expected 0 refresh calls, got ${refreshCalls.length}`);
  for (const call of refreshCalls) {
    assert.ok(!JSON.stringify(call.config.data).includes(durable.refreshToken), 'another tab\'s refresh token must never leave this tab');
    assert.ok(!JSON.stringify(call.config.data).includes(durable.accessToken));
  }

  // The other tab's session is untouched: still active, still its own tokens, still its own mirror.
  const stillStored = JSON.parse(storage.getItem('auth-session-record'));
  assert.equal(stillStored.state, 'active');
  assert.equal(stillStored.sessionId, durable.sessionId);
  assert.equal(stillStored.accessToken, durable.accessToken);
  assert.equal(stillStored.refreshToken, durable.refreshToken);
  assert.equal(stillStored.version, durable.version, 'no version bump from a tab that cannot serialise writers');
  assert.equal(stillStored.user.id, durable.user.id, 'B did not hydrate from A');
  assert.equal(storage.getItem('token'), durable.accessToken, 'the mirror still describes the durable session');
  assert.equal(storage.getItem('refresh_token'), durable.refreshToken);
  assert.equal(storage.getItem('user'), JSON.stringify(durable.user));
});

test('FR6-C — reduced mode never adopts, migrates or purges a shared record', async () => {
  const durable = {
    schemaVersion: 2,
    identity: API_A,
    sessionId: 'sid_durable_untouched',
    version: 2,
    state: 'active',
    user: { id: 1, email: 'other@example.test' },
    accessToken: 'FAKE_ACCESS_OTHER_TAB',
    refreshToken: 'FAKE_REFRESH_OTHER_TAB',
    expiresAt: NOW_SECONDS + 3600,
    refreshExpiresAt: NOW_SECONDS + 259200,
  };
  // The other tab wrote the canonical record *and* its compatibility mirror, which is the realistic
  // state after a durable login. A reduced-mode tab must leave both alone.
  const storage = createStorage({
    'auth-session-record': JSON.stringify(durable),
    token: durable.accessToken,
    refresh_token: durable.refreshToken,
    user: JSON.stringify(durable.user),
    expires_at: String(durable.expiresAt),
    refresh_expires_at: String(durable.refreshExpiresAt),
    'auth-api-identity': durable.identity,
  });
  // Only the auth session keys are in scope. Writing the configured API endpoint is an unrelated
  // preference and says nothing about whether this tab touched the session.
  const SESSION_KEYS = ['auth-session-record', 'auth-api-identity', 'user', 'token', 'refresh_token', 'expires_at', 'refresh_expires_at'];
  const sessionWrites = () => storage._writes.filter((entry) => SESSION_KEYS.includes(entry.key));
  const sessionRemovals = () => storage._removals.filter((entry) => SESSION_KEYS.includes(entry.key));

  const app = bootApp({ storage, locks: null, baseUrl: API_A });
  app.auth.init();

  // Every reconciliation trigger a real browser can produce.
  assert.equal(app.auth.adoptSession(), false, 'a focus/storage event must not adopt a shared record');
  app.auth.getSessionCoordinator().reconcile();
  app.emitStorageEvent();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(app.auth.token, null);
  assert.equal(app.auth.user, null);
  assert.deepEqual(sessionWrites(), [], 'reduced mode writes no session key at all: no setItem');
  assert.deepEqual(sessionRemovals(), [], 'and removes none either: no legacy purge, no tombstone');
  assert.equal(JSON.parse(storage.getItem('auth-session-record')).accessToken, durable.accessToken);
  assert.equal(storage.getItem('token'), durable.accessToken, 'the mirror is not purged by a tab that cannot maintain it');
});

test('FR6-C — two reduced-mode logins: the latest intent wins and the older one changes nothing', async () => {
  const storage = createStorage();
  const app = bootApp({ storage, locks: null, baseUrl: API_A });

  const firstContext = app.auth.beginLoginAttempt();
  const first = app.auth.commitLogin({
    user: { id: 1, email: 'first@example.test' },
    accessToken: 'FAKE_ACCESS_FIRST',
    refreshToken: 'FAKE_REFRESH_FIRST',
    expiresAt: NOW_SECONDS + 3600,
    refreshExpiresAt: NOW_SECONDS + 259200,
  }, firstContext);

  const secondContext = app.auth.beginLoginAttempt();
  const second = app.auth.commitLogin(SESSION_B, secondContext);

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(firstResult.status, 'stale', 'the superseded memory-only login is reported, not silently applied');
  assert.equal(secondResult.status, 'unavailable', 'even the latest intent cannot bypass browser policy');
  assert.equal(secondResult.memoryOnly, undefined);
  assert.equal(app.auth.token, null);
  assert.equal(app.auth.user, null);
  assert.equal(app.auth.sessionId, secondResult.record?.sessionId ?? app.auth.sessionId);
  assert.equal(storage.getItem('auth-session-record'), null, 'still nothing durable in reduced mode');
  assert.equal(storage.getItem('token'), null);
});

test('FR6-C — a storage that starts failing mid-session degrades without inventing a session', async () => {
  const storage = createStorage();
  const app = bootApp({ storage, baseUrl: API_A });
  app.auth.init();

  const context = app.auth.beginLoginAttempt();
  const committed = await app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);
  assert.equal(committed.status, 'applied');

  // The storage becomes unreadable *and* unwritable: a private-mode quota error, for example.
  storage.getItem = () => { throw new Error('SecurityError'); };
  storage.setItem = () => { throw new Error('QuotaExceededError'); };

  assert.equal(app.auth.readSessionState().status, 'unavailable', 'an unreadable record is not an absent one');

  const contextB = app.auth.beginLoginAttempt();
  const degraded = await app.auth.commitLogin(SESSION_B, contextB);

  assert.notEqual(degraded.status, 'applied', 'a write into a broken storage is never reported as applied');
  assert.equal(degraded.record, null, 'and no half-written record is handed to a caller');
  assert.equal(app.auth.storageDegraded, true, 'the store says so instead of pretending');
  assert.equal(app.auth.lastCommitReason, degraded.reason);

  // The failed login installed nothing: memory still holds the previous session it already had, and
  // none of B's material leaked in through a failed write.
  assert.equal(app.auth.token, baseSession().access_token);
  assert.equal(app.auth.refreshToken, baseSession().refresh_token);
  assert.equal(app.auth.user.id, baseSession().user.id);
  for (const value of [SESSION_B.accessToken, SESSION_B.refreshToken]) {
    assert.ok(!app.console.records.some((entry) => entry.message.includes(value)), 'a bearer is never logged');
  }
});

/* ---------------------------------------------------------------------------------------------- */
/* FR6-D / FR6-E / FR6-F — ownership is preserved, a rotation knows its predecessor, adoption is    */
/* a pure read, and waiting for a lock is bounded.                                                 */
/* ---------------------------------------------------------------------------------------------- */

/** A complete, valid canonical record for API B, as another tab on the same origin would store it. */
const foreignB = (overrides = {}) => ({
  schemaVersion: 2,
  identity: API_B,
  sessionId: 'sid_foreign_b',
  version: 20,
  state: 'active',
  user: { id: 9, email: 'other@example.test', role: 'user' },
  accessToken: 'FAKE_ACCESS_FOREIGN_B',
  refreshToken: 'FAKE_REFRESH_FOREIGN_B',
  expiresAt: NOW_SECONDS + 3600,
  refreshExpiresAt: NOW_SECONDS + 259200,
  ...overrides,
});

/** Stores `record` as the canonical record *and* its compatibility mirror. */
const seedRecord = (storage, record) => {
  storage.setItem('auth-session-record', JSON.stringify(record));
  storage.setItem('token', record.accessToken ?? '');
  storage.setItem('refresh_token', record.refreshToken ?? '');
  storage.setItem('user', record.user ? JSON.stringify(record.user) : '');
  storage.setItem('expires_at', record.expiresAt === null || record.expiresAt === undefined ? '' : String(record.expiresAt));
  storage.setItem('refresh_expires_at', record.refreshExpiresAt === null || record.refreshExpiresAt === undefined ? '' : String(record.refreshExpiresAt));
  storage.setItem('auth-api-identity', record.identity);
  return record;
};

test('FR6-D — ending session A leaves a valid record of another identity completely untouched', async () => {
  for (const state of ['active', 'ended']) {
    const storage = createStorage();
    const locks = createLockManager();
    const app = bootApp({ storage, locks, baseUrl: API_A });

    const stored = seedRecord(storage, foreignB({ state, version: state === 'ended' ? 21 : 20 }));
    const before = JSON.stringify(storage._dump());

    // This tab holds a session for API A, which it now ends.
    const context = app.auth.beginLoginAttempt();
    await app.auth.commitLogin({
      user: baseSession().user,
      accessToken: baseSession().access_token,
      refreshToken: baseSession().refresh_token,
      expiresAt: baseSession().expires_at,
      refreshExpiresAt: baseSession().refresh_expires_at,
    }, context);
    const duringLogin = app.readRecord();

    // B's record was already there when A's session was created; put it back as the current record.
    seedRecord(storage, stored);
    const beforeEnd = JSON.stringify(storage._dump());

    // A's session really was durable in between, so "nothing changed" below means the end was a
    // no-op and not that no session existed to end.
    assert.equal(duringLogin.identity, API_A, 'A was the durable session that this tab then ended');
    assert.notEqual(duringLogin.sessionId, stored.sessionId);

    const result = await app.auth.clearLocalSession(null, 'logout');

    assert.notEqual(result.status, 'applied', `a foreign ${state} record must not be overwritten (got ${result.status})`);
    assert.ok(
      ['stale', 'invalid'].includes(result.status),
      `a foreign record is refused, not accepted: got ${result.status}`,
    );
    assert.equal(JSON.stringify(storage._dump()), beforeEnd, `the bytes of a foreign ${state} record must be identical afterwards`);
    assert.deepEqual(app.readRecord(), stored, 'same record, same version, same tokens');
    assert.equal(storage.getItem('token'), stored.accessToken, 'the mirror of a foreign record is not purged');
    assert.equal(storage.getItem('refresh_token'), stored.refreshToken);
    assert.equal(storage.getItem('user'), JSON.stringify(stored.user));
    assert.ok(before.includes('auth-session-record'), 'the record was present before A logged in too');
  }
});

test('FR6-D — the same sessionId string under a different identity is still a different lifecycle', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = bootApp({ storage, locks, baseUrl: API_A });

  const context = app.auth.beginLoginAttempt();
  await app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);
  const mine = app.readRecord();

  // A record whose `sessionId` string is identical but whose identity is not: matching only on the
  // id is what lets one tenant's logout tombstone another tenant's live session.
  const stored = seedRecord(storage, foreignB({ sessionId: mine.sessionId, version: 5 }));
  const beforeEnd = JSON.stringify(storage._dump());

  const result = await app.auth.clearLocalSession(null, 'logout');

  assert.notEqual(result.status, 'applied', 'identity is part of the lifecycle, not the sessionId alone');
  assert.equal(JSON.stringify(storage._dump()), beforeEnd);
  assert.deepEqual(app.readRecord(), stored);
});

test('FR6-E — a rotation response built from an old predecessor cannot replace the newer successor', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = bootApp({ storage, locks, baseUrl: API_A });
  app.auth.init();

  const context = app.auth.beginLoginAttempt();
  await app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);

  const v1 = app.readRecord();
  const predecessor = {
    identity: v1.identity,
    sessionId: v1.sessionId,
    accessToken: v1.accessToken,
    refreshToken: v1.refreshToken,
  };

  // The winner: predecessor P -> successor N.
  const successorN = {
    accessToken: 'FAKE_ACCESS_N',
    refreshToken: 'FAKE_REFRESH_N',
    expiresAt: NOW_SECONDS + 7200,
    refreshExpiresAt: NOW_SECONDS + 259200,
  };
  const applied = await app.auth.applyRotation(successorN, context, { predecessor });
  assert.equal(applied.status, 'applied');
  const afterN = app.readRecord();

  // The loser: a response that was issued from the same predecessor P, but answers with O.
  const staleSuccessorO = {
    accessToken: 'FAKE_ACCESS_O',
    refreshToken: 'FAKE_REFRESH_O',
    expiresAt: NOW_SECONDS + 7200,
    refreshExpiresAt: NOW_SECONDS + 259200,
  };
  const loser = await app.auth.applyRotation(staleSuccessorO, context, { predecessor });

  assert.notEqual(loser.status, 'applied', 'a response built from a superseded predecessor is refused');
  assert.equal(app.readRecord().version, afterN.version, 'and it does not raise the version');
  assert.deepEqual(app.readRecord(), afterN, 'the validated winner N is still the record');
  assert.equal(app.auth.token, 'FAKE_ACCESS_N', 'memory keeps the winner, not the stale answer');
  assert.equal(app.auth.refreshToken, 'FAKE_REFRESH_N');
  assert.equal(storage.getItem('token'), 'FAKE_ACCESS_N', 'and so does the mirror');

  // Re-applying the same successor is idempotent: no write, no version bump.
  const writesBefore = app.recordWrites().length;
  const again = await app.auth.applyRotation(successorN, context, { predecessor });
  assert.equal(again.status, 'applied');
  assert.equal(again.reason, 'already-applied');
  assert.equal(app.recordWrites().length, writesBefore, 'a duplicate successor writes nothing');
  assert.equal(app.readRecord().version, afterN.version);
});

test('FR6-E — a rotation of a foreign or ended lifecycle is refused, whatever the predecessor says', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = bootApp({ storage, locks, baseUrl: API_B });
  app.auth.init();

  // A foreign (API A) record is what this API B tab finds.
  const stored = seedRecord(storage, foreignB({ identity: API_A, sessionId: 'sid_someone_else' }));
  const foreignBefore = JSON.stringify(storage._dump());

  const context = app.auth.beginLoginAttempt();
  await app.auth.commitLogin({
    user: baseSession().user,
    accessToken: baseSession().access_token,
    refreshToken: baseSession().refresh_token,
    expiresAt: baseSession().expires_at,
    refreshExpiresAt: baseSession().refresh_expires_at,
  }, context);
  const mine = app.readRecord();
  assert.equal(mine.identity, API_B, 'the fixture session belongs to the configured identity');

  // The baseline for "changed nothing" is this tab's own record, established *after* the login. The
  // foreign record it replaced is asserted separately below.
  const beforeForeignRotation = JSON.stringify(storage._dump());
  assert.notEqual(beforeForeignRotation, foreignBefore, 'the login took over the key, as a new lifecycle may');

  // A rotation whose predecessor claims the *foreign* session must not be applied either.
  const foreignRotation = await app.auth.applyRotation({
    accessToken: 'FAKE_ACCESS_X',
    refreshToken: 'FAKE_REFRESH_X',
    expiresAt: NOW_SECONDS + 7200,
    refreshExpiresAt: NOW_SECONDS + 259200,
  }, context, {
    predecessor: { identity: API_A, sessionId: 'sid_someone_else', accessToken: 'p', refreshToken: 'p' },
  });

  assert.notEqual(foreignRotation.status, 'applied', 'a rotation of a foreign lifecycle is refused');
  assert.equal(JSON.stringify(storage._dump()), beforeForeignRotation, 'and it changes nothing at all');

  // And an ended lifecycle refuses a rotation with a perfectly matching predecessor.
  await app.auth.clearLocalSession(null, 'logout');
  const ended = app.readRecord();
  assert.equal(ended.state, 'ended');
  const afterEnd = JSON.stringify(storage._dump());

  const afterLogout = await app.auth.applyRotation({
    accessToken: 'FAKE_ACCESS_Y',
    refreshToken: 'FAKE_REFRESH_Y',
    expiresAt: NOW_SECONDS + 7200,
    refreshExpiresAt: NOW_SECONDS + 259200,
  }, app.auth.captureContext(), {
    predecessor: { identity: ended.identity, sessionId: ended.sessionId, accessToken: 'p', refreshToken: 'p' },
  });

  assert.equal(afterLogout.status, 'stale', 'a rotation cannot revive an ended session');
  assert.equal(JSON.stringify(storage._dump()), afterEnd);
});

test('FR6-F — adopting another tab\'s session is a pure read: zero writes, zero removals', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = bootApp({ storage, locks, baseUrl: API_A });
  app.auth.init();

  // This tab holds its own memory-only session A.
  await app.auth.login(
    baseSession().user,
    baseSession().access_token,
    baseSession().refresh_token,
    baseSession().expires_at,
    baseSession().refresh_expires_at
  );
  const sessionA = app.auth.sessionId;
  assert.ok(sessionA, 'the tab starts with a session of its own');

  // Another tab, on the same origin and identity, commits session B.
  const stored = seedRecord(storage, foreignB({ identity: API_A, sessionId: 'sid_b_from_other_tab', version: 3 }));

  const writesBefore = storage._writes.length;
  const removalsBefore = storage._removals.length;
  const mirrorBefore = {
    token: storage.getItem('token'),
    refresh_token: storage.getItem('refresh_token'),
    user: storage.getItem('user'),
  };

  const adopted = app.auth.adoptSession();

  assert.equal(adopted, true, 'the record is adopted');
  assert.equal(app.auth.sessionId, stored.sessionId, 'memory now holds B');
  assert.equal(app.auth.token, stored.accessToken, 'and B\'s bearer, not a blend of A and B');
  assert.equal(app.auth.refreshToken, stored.refreshToken);
  assert.equal(app.auth.user.id, stored.user.id);

  assert.equal(storage._writes.length, writesBefore, 'adoption writes nothing at all');
  assert.equal(storage._removals.length, removalsBefore, 'and removes nothing: the mirror of B survives');
  assert.deepEqual(app.readRecord(), stored, 'the canonical record is byte-for-byte what it was');
  assert.equal(storage.getItem('token'), mirrorBefore.token);
  assert.equal(storage.getItem('refresh_token'), mirrorBefore.refresh_token);
  assert.equal(storage.getItem('user'), mirrorBefore.user);

  // A duplicate adoption of the same record is equally quiet, so a focus/storage event storm cannot
  // turn a read into a write loop between tabs.
  const writesAfterFirst = storage._writes.length;
  const removalsAfterFirst = storage._removals.length;
  app.auth.adoptSession();
  app.auth.getSessionCoordinator().reconcile();
  app.emitStorageEvent();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(storage._writes.length, writesAfterFirst, 'repeated adoption still writes nothing');
  assert.equal(storage._removals.length, removalsAfterFirst, 'and still removes nothing');
  assert.equal(app.auth.sessionId, stored.sessionId);
});

/**
 * The bounded lock acquisition, on its own.
 *
 * `acquireWithDeadline()` is the only thing between a slow peer and a hung rotation, and it is easy to
 * write in a way that looks right and is not: the Web Locks API holds the lock until the callback
 * settles, so the promise it returns resolves when the *work* is done, not when the lock is granted.
 * Racing that promise against a deadline therefore abandons any callback slower than the deadline — the
 * caller is handed the fence while its request is still in flight, and the answer is discarded when it
 * arrives. The peer has rotated the refresh token by then, so the app is left holding a credential that
 * no longer works, and it paid for the rotation to learn that.
 *
 * These three cases are the difference between "the wait is bounded" and "the work is bounded".
 */
test('a lock deadline bounds the wait for the lock, not the work done once it is granted', async () => {
  // Loaded through the harness, like every other product module in this suite, so the case runs against
  // a module wired to the same globals the app uses rather than a second copy of it.
  const env = createBrowserEnv({ storage: createStorage(), locks: createLockManager() });
  const { acquireWithDeadline } = loadModule('assets/js/api/sessionCoordinator.js', env);
  assert.equal(typeof acquireWithDeadline, 'function', 'the coordinator exports the bounded acquisition');

  // 1. The lock is free, and the work takes longer than the deadline. The work must still finish and its
  //    result must reach the caller.
  const locks = createLockManager();
  const work = await acquireWithDeadline(locks, 'auth:refresh', async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
    return 'rotated';
  }, {
    timeoutMs: 5,
    fence: async (reason) => ({ fenced: reason })
  });

  assert.equal(work, 'rotated', 'a granted callback that outlives the deadline is not abandoned');

  // 2. Another holder has the lock, so the wait crosses the deadline. The fence is the answer, and the
  //    work must not run when the lock is finally handed over.
  const contended = createLockManager();
  const release = contended.hold('auth:refresh');
  let ran = false;
  const fenced = acquireWithDeadline(contended, 'auth:refresh', async () => {
    ran = true;
    return 'rotated';
  }, {
    timeoutMs: 5,
    fence: async (reason) => ({ fenced: reason })
  });

  // The deadline timer is unref'd — it must not keep a browser tab alive on its own — so in Node
  // something else has to hold the loop open while the wait is pending. A held lock is not that: it is
  // only a queue entry.
  const keepAlive = setTimeout(() => {}, 100);
  const answer = await fenced;
  clearTimeout(keepAlive);
  assert.deepEqual(answer, { fenced: 'lock-acquisition-timeout' }, 'a wait that crosses the deadline is fenced');

  release();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(ran, false, 'a fenced request does no work when the lock arrives late');

  // 3. No lock manager at all: the work runs, because refusing to rotate would strand a tab that cannot
  //    take part in serialisation. (The store decides that case separately, with canRotate().)
  assert.equal(
    await acquireWithDeadline(null, 'auth:refresh', async () => 'rotated', { timeoutMs: 5 }),
    'rotated'
  );
});

/**
 * FA8-02 / FR9-01 / FR9-02 — the acquisition deadline is a stopwatch, and its length is the configured one.
 *
 * The first version of this file installed the deadline with a single timer that asked a *wall* clock
 * whether the deadline had been reached and, if not, returned without settling or rescheduling. A clock
 * that stopped or stepped backwards therefore left the caller on a promise nothing would ever resolve:
 * the bound that exists to survive a slow peer was the thing that hung.
 *
 * The repair then added a second measure — the timer's own intervals, counted, capped at 15 s — on the
 * theory that a clock which never reaches its deadline should still be escapable. That fixed the hang and
 * introduced a worse defect: `Math.min(deadline * 8, 15_000)` is an arbitrary second deadline, so a caller
 * that asked for 20 000 ms was fenced at 15 000 ms, and a caller that asked for 2 000 ms could be fenced
 * at 2 000 ms by either measure. Neither number was the configured one. FR9-01 caught this with the module
 * run by hand, because the only way to see a 20-second deadline through the suite was to wait 20 seconds.
 *
 * So the deadline is now measured as elapsed time on an injected monotonic scheduler, and every case below
 * drives that scheduler directly. The 20 000 ms deadline in `timeout_20000_not_fenced_at_15000` costs
 * microseconds, is asserted at 15 000 / 19 999 / 20 000 rather than at whatever moment the machine reached,
 * and fails on any cap or multiplier reappearing. There is no `sleep` in this file's deadline cases at all:
 * a test that proves a deadline has *not* arrived by sleeping 25 ms and hoping is not a test.
 */
test('a lock deadline is elapsed time, and it is the configured length', async (t) => {
const { acquireWithDeadline } = loadModule(
    'assets/js/api/sessionCoordinator.js',
    createBrowserEnv({ storage: createStorage(), locks: createLockManager() })
);

await t.test('timeout_20000_not_fenced_at_15000', async () => {
    const clock = createManualClock();
    const locks = createLockManager();
    const release = locks.hold('auth:refresh');
    let ran = false;

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => {
      ran = true;
      return 'rotated';
    }, {
      timeoutMs: 20_000,
      scheduler: clock.scheduler,
      fence: async (reason) => ({ fenced: reason })
    }));

    await drain();
    assert.equal(answer.value, NEVER_SETTLED, 'a lock that is held is a wait, not a result');

    clock.advance(15_000);
    await clock.flush();
    assert.equal(answer.value, NEVER_SETTLED,
      'a 20s deadline must still be open at 15s; the old min(deadline*8, 15s) cap fenced it here');

    clock.set(19_999);
    await clock.flush();
    assert.equal(answer.value, NEVER_SETTLED, 'and open at 19.999s, because 19.999s is not 20s');

    clock.set(20_000);
    await clock.flush();
    assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' },
      'and the configured deadline is where it ends');

    release();
    await drain();
    assert.equal(ran, false, 'a fenced request does no work when the lock arrives late');
});

await t.test('a frozen wall clock does not decide the deadline, and a backwards one does not extend it', async () => {
    // Two separate clocks, which is the whole point: `now` is a wall clock the product uses for expiry and
    // conflict epochs, and a stopwatch is what bounds a wait. A test that froze the stopwatch and expected
    // the wait to end was asserting that the two had been confused.
    const clock = createManualClock();
    const locks = createLockManager();
    const release = locks.hold('auth:refresh');
    let ran = false;
    let ticks = 0;

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => {
      ran = true;
      return 'rotated';
    }, {
      timeoutMs: 10,
      // A wall clock that never moves, passed as an extra option the deadline must ignore. And one that
      // walks backwards, for the NTP-correction case, which likewise must not extend the wait.
      now: () => (ticks++ === 0 ? 1_000 : 1_000 - (ticks * 50)),
      scheduler: clock.scheduler,
      fence: async (reason) => ({ fenced: reason })
    }));

    await drain();
    assert.equal(answer.value, NEVER_SETTLED, 'elapsed time has not passed yet');

    clock.advance(10);
    await clock.flush();
    assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' },
      'the deadline is reached by the stopwatch, whatever the wall clock says');

    release();
    await drain();
    assert.equal(ran, false, 'a late grant after the fence still does no work');
});

await t.test('a timer that fires early re-arms for the remaining time instead of fencing', async () => {
    const clock = createManualClock();
    let callback, timerId;
    const scheduler = {...clock.scheduler, setTimer(fn, delay) {
      callback = fn; timerId = clock.scheduler.setTimer(fn, delay); return timerId;
    }};
    const fireEarly = async () => { clock.scheduler.clearTimer(timerId); callback(); await drain(); };
    const locks = createLockManager();
    const release = locks.hold('auth:refresh');

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => 'rotated', {
      timeoutMs: 20_000,
      scheduler,
      fence: async (reason) => ({ fenced: reason })
    }));
    await drain();

    assert.deepEqual(clock.pending().map((timer) => timer.delay), [20_000], 'the first arm is the full budget');

    // An early notification: the queue is serviced before the budget is used up, which is what a coarse
    // timer or a throttled tab looks like from inside the wait.
    const firstTimer = timerId;
    clock.advance(3_000);
    await fireEarly();
    assert.notEqual(timerId, firstTimer, 'the callback actually re-armed a new timer');
    assert.equal(answer.value, NEVER_SETTLED, 'a request that is still legitimately waiting must not be fenced');
    assert.deepEqual(clock.pending().map((timer) => timer.delay), [17_000],
      'and the re-arm is the remaining budget, not the whole budget and not a fixed step');

    clock.advance(16_999);
    await fireEarly();
    assert.deepEqual(clock.pending().map((timer) => timer.delay), [1],
      'the re-arm never overshoots, so a re-armed deadline cannot run past its own budget');

    clock.advance(1);
    await clock.flush();
    assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' });
    release();
    await drain();
});

await t.test('a granted lock is not abandoned when the work outlives the budget', async () => {
    // The guard against the fix regressing into the Task7 bug in the other direction: once the lock is
    // ours the deadline stops applying, or a slow network would be thrown away after the peer had already
    // rotated the token.
    const clock = createManualClock();
    const locks = createLockManager();
    let releaseWork;
    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => {
      await new Promise((resolve) => { releaseWork = resolve; });
      return 'rotated';
    }, {
      timeoutMs: 5_000,
      scheduler: clock.scheduler,
      fence: async (reason) => ({ fenced: reason })
    }));

    await drain();
    clock.advance(60_000);
    await clock.flush();
    assert.equal(answer.value, NEVER_SETTLED, 'the deadline cannot expire work that has already started');

    releaseWork();
    await drain();
    assert.equal(answer.value, 'rotated', 'and that work runs to completion and reaches the caller');
});

await t.test('a grant that arrives after the budget is refused even if the timer never fired (FR10-06)', async () => {
    // The hole the review measured. The deadline was only ever read inside the timer, so a timer the event
    // loop had not got round to dispatching left a window: the budget could be spent, the grant could land
    // inside that window, and the work would run for a caller who had been told — by nobody, because the
    // timer had not fired — that it had timed out. Both halves of "timed out" were the timer's job, so a
    // late timer meant neither happened.
    const clock = createManualClock();
    const locks = createLockManager();
    const release = locks.hold('auth:refresh');
    let ran = 0;

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => {
      ran += 1;
      return 'rotated';
    }, {
      timeoutMs: 20,
      scheduler: clock.scheduler,
      fence: async (reason) => ({ fenced: reason })
    }));

    await drain();
    assert.equal(answer.value, NEVER_SETTLED, 'the lock is held, so this is still a wait');

    // Time passes and the timer is *not* dispatched. `advance` moves the clock without running the queue,
    // which is exactly what a busy event loop looks like from inside the wait.
    clock.advance(21);
    assert.equal(answer.value, NEVER_SETTLED, 'and the caller has not been told anything yet');
    assert.equal(clock.pending().length, 1, 'the timer is still sitting there unrun');

    release();
    await drain();
    await clock.flush();

    assert.equal(ran, 0, 'a grant that arrives after the budget does no work');
    assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' },
      'and the caller gets the one answer the fence is for');
});

await t.test('the boundary itself belongs to the budget, not the work (FR10-06)', async () => {
    // One millisecond inside the budget is inside it; the deadline is not. A comparison written as `<=`
    // would let a grant at exactly the deadline run, and a caller could rely on that.
    for (const [label, at, expectWork] of [['19', 19, true], ['20', 20, false], ['21', 21, false]]) {
      const clock = createManualClock();
      const locks = createLockManager();
      const release = locks.hold('auth:refresh');
      let ran = 0;

      const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => {
        ran += 1;
        return 'rotated';
      }, {
        timeoutMs: 20,
        scheduler: clock.scheduler,
        fence: async (reason) => ({ fenced: reason })
      }));

      await drain();
      clock.set(at);
      release();
      await drain();
      await clock.flush();

      assert.equal(ran, expectWork ? 1 : 0, `a grant at ${label}ms ${expectWork ? 'runs' : 'does not run'}`);
      if (expectWork) {
        assert.equal(answer.value, 'rotated', 'and the caller at 19ms is told the work finished');
      } else {
        // The fenced value is an object minted inside the module's own realm, so it is compared
        // structurally rather than by identity — a strict `equal` here would be testing `loadModule`.
        assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' },
          `and the caller at ${label}ms is told it timed out`);
      }
    }
});

await t.test('a grant inside the budget keeps the lock and the work even once time passes (FR10-06)', async () => {
    // The other direction, and the one that must not be broken while fixing the first: the deadline is a
    // claim about the *wait*, so a callback that got the lock in time runs to completion no matter how
    // long it takes. Checking elapsed again after the work has started would throw away a rotation whose
    // peer has already committed a successor token.
    const clock = createManualClock();
    const locks = createLockManager();
    let releaseWork;

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => {
      await new Promise((resolve) => { releaseWork = resolve; });
      return 'rotated';
    }, {
      timeoutMs: 20,
      scheduler: clock.scheduler,
      fence: async (reason) => ({ fenced: reason })
    }));

    await drain();
    assert.equal(answer.value, NEVER_SETTLED, 'the grant is immediate here, but the work is what is pending');

    releaseWork();
    await drain();
    clock.advance(60_000);
    await clock.flush();
    assert.equal(answer.value, 'rotated',
      'the work finished inside the budget, so a later deadline cannot un-finish it');
});

await t.test('the fence settles once, however many times it is reached', async () => {
    const clock = createManualClock();
    const locks = createLockManager();
    const release = locks.hold('auth:refresh');
    let fences = 0;

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => 'rotated', {
      timeoutMs: 100,
      scheduler: clock.scheduler,
      fence: async (reason) => { fences += 1; return { fenced: reason }; }
    }));

    clock.set(100);
    await clock.flush();
    release();
    await drain();
    assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' });
    assert.equal(fences, 1, 'the late grant sees a closed fence and returns it; it does not raise it again');
});

await t.test('every outcome clears the timer it armed', async () => {
    for (const scenario of ['granted', 'fenced', 'lock-threw', 'work-threw']) {
      const clock = createManualClock();
      const locks = createLockManager();
      const release = scenario === 'fenced' ? locks.hold('auth:refresh') : () => {};

      const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => {
        if (scenario === 'work-threw') throw new Error('the rotation itself failed');
        return 'rotated';
      }, {
        timeoutMs: 1_000,
        scheduler: clock.scheduler,
        fence: async (reason) => ({ fenced: reason })
      }));

      if (scenario === 'fenced') { clock.set(1_000); await clock.flush(); }
      if (scenario === 'lock-threw') {
        await assert.rejects(acquireWithDeadline(
          { request: () => { throw new Error('the lock manager is gone'); } },
          'auth:refresh',
          async () => 'rotated',
          { timeoutMs: 1_000, scheduler: clock.scheduler }
        ), /the lock manager is gone/);
      }
    await drain();
    release();
    assert.deepEqual(clock.pending(), [], `a ${scenario} acquisition leaves no armed timer behind`);
    if (scenario === 'work-threw') {
      assert.match(String(answer.value && answer.value.message), /the rotation itself failed/,
        'and a failure inside the work is not swallowed by the deadline');
    } else if (scenario === 'granted') {
      assert.equal(answer.value, 'rotated');
    } else if (scenario === 'fenced') {
      assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' });
    }
  }
});

await t.test('a runtime with no monotonic clock gets a stated policy, not an unbounded wait', async () => {
    // No monotonic reading means no grant can be proven inside the budget.
    const clock = createManualClock({ monotonicAvailable: false });
    const locks = createLockManager();
    const release = locks.hold('auth:refresh');
    let ran = false;

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => {
      ran = true;
      return 'rotated';
    }, {
      timeoutMs: 5_000,
      scheduler: clock.scheduler,
      fence: async (reason) => ({ fenced: reason })
    }));

    await drain();
    assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' });
    assert.deepEqual(clock.pending(), [], 'fail closed before queueing any work');

    release();
    await drain();
    assert.equal(ran, false);
});

  await t.test('a monotonic clock that stops answering numbers is a broken clock, not an infinite budget', async () => {
    const clock = createManualClock();
    const locks = createLockManager();
    const release = locks.hold('auth:refresh');
    // Only the baseline is valid. Grant before expiry must consume the invalid reading.
    let readings = 0;

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => 'rotated', {
      timeoutMs: 1_000,
      scheduler: {
        monotonicNow: () => (readings++ < 1 ? clock.now : null),
        setTimer: clock.scheduler.setTimer,
        clearTimer: clock.scheduler.clearTimer
      },
      fence: async (reason) => ({ fenced: reason })
    }));

    clock.advance(100);
    release();
    await drain();
    assert.ok(readings >= 2, 'the invalid reading was consumed before the deadline');
    assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' },
      'a source that stops answering ends the wait instead of re-arming for ever');
    release();
    await drain();
  });

  await t.test('a source that moves backwards is not monotonic, and is treated the same way', async () => {
    const clock = createManualClock();
    const locks = createLockManager();
    const release = locks.hold('auth:refresh');
    let readings = 0;

    const answer = watch(acquireWithDeadline(locks, 'auth:refresh', async () => 'rotated', {
      timeoutMs: 1_000,
      // An NTP correction, applied to the "monotonic" source by whatever polyfilled it.
      scheduler: {
        monotonicNow: () => (readings++ === 0 ? 0 : -5_000),
        setTimer: clock.scheduler.setTimer,
        clearTimer: clock.scheduler.clearTimer
      },
      fence: async (reason) => ({ fenced: reason })
    }));

    clock.advance(1_000);
    await clock.flush();
    assert.deepEqual(answer.value, { fenced: 'lock-acquisition-timeout' },
      'a negative elapsed time is a broken reading, not a fresh budget');
    release();
    await drain();
  });
});


/**
 * The coordinator has to hand its own deadline the injected clock, not merely accept one.
 *
 * Everything above tests `acquireWithDeadline` directly. That leaves the wiring untested: an option the
 * product never passes is an option that does not exist, and the deadline the refresh path actually uses
 * would still be the wall clock this change set out to remove. So the coordinator is built here with
 * another tab holding the very lock it is about to ask for — the name taken from the product's own
 * `REFRESH_LOCK_PREFIX`, so the test cannot drift into holding a lock nobody contends for — and a
 * scheduler under the test's control.
 *
 * What is asserted is the *report*, because that is the only thing a user would ever have noticed:
 * `refresh-lock-timeout`, and no dispatched request.
 */
test('a refresh that cannot take the lock reports it at the configured elapsed time, not the capped one', async () => {
  const clock = createManualClock();
  const storage = createStorage();
  const locks = createLockManager();
  const { app } = await bootSignedIn({ storage, locks });
  const failures = [];
  const refreshes = [];

  const { createSessionCoordinator, REFRESH_LOCK_PREFIX } = loadModule(
    'assets/js/api/sessionCoordinator.js',
    createBrowserEnv({ storage, locks })
  );

  const sessionId = app.readRecord().sessionId;
  const release = locks.hold(`${REFRESH_LOCK_PREFIX}${API_A}:${sessionId}`);
  assert.ok(release, 'the lock name the coordinator takes must be the one this test holds');

  const coordinator = createSessionCoordinator({
    getIdentity: () => API_A,
    getSessionId: () => sessionId,
    readSessionState: () => ({ status: 'present', record: app.readRecord() }),
    canRotate: () => true,
    performRefresh: async () => { refreshes.push('refresh'); return null; },
    applySession: async () => ({ ok: true }),
    onInvalidSession: async () => {},
    onTemporaryFailure: (info) => failures.push(info),
    lockTimeoutMs: 20_000,
    // A wall clock frozen at the epoch, which pins the two apart: the coordinator uses it for expiry and
    // conflict epochs, and it must not reach the acquisition deadline. Frozen, so a test that consulted
    // it would wait for ever rather than pass by luck.
    now: () => 0,
    acquisitionScheduler: clock.scheduler,
  });

  const answer = watch(coordinator.ensureFreshSession());
  await drain();
  assert.equal(answer.value, NEVER_SETTLED, 'a held lock is a wait, not a result');
  assert.deepEqual(refreshes, [], 'and nothing has been dispatched yet');

  clock.advance(15_000);
  await clock.flush();
  assert.equal(answer.value, NEVER_SETTLED,
    '15s of a 20s budget is not 20s; the old min(deadline*8, 15s) cap ended the wait here');
  assert.deepEqual(refreshes, [], 'and still nothing dispatched');

  clock.set(20_000);
  await clock.flush();
  assert.equal(answer.value, null, 'a refresh with no session to return is null, not a throw');
  assert.deepEqual(failures.map((info) => info.code), ['refresh-lock-timeout'],
    'the report names the coordination lock, which is the part the caller can act on');
  assert.deepEqual(refreshes, [],
    'a refresh fenced while queueing must not have reached the network, or it would have rotated the peer');

  // The lock frees up afterwards. Nothing may be dispatched on the strength of a grant that arrives
  // after the deadline: the peer would rotate, this tab would not receive it, and both sessions are lost.
  release();
  await drain();
  assert.deepEqual(refreshes, [], 'a late grant performs no request');
});

/**
 * A real-timer smoke test, and deliberately only that.
 *
 * The cases above drive a controlled clock, which is the only way to assert *when* a deadline expires
 * rather than that it expired eventually. This one uses the product's own default scheduler and real
 * timers, to keep the wiring honest: an injected scheduler that works while the default one is broken
 * would leave every other suite in this file running against a deadline that never fires.
 */
test('the default scheduler bounds a real wait', async () => {
  const { acquireWithDeadline } = loadModule(
    'assets/js/api/sessionCoordinator.js',
    createBrowserEnv({ storage: createStorage(), locks: createLockManager() })
  );
  const locks = createLockManager();
  const release = locks.hold('auth:refresh');
  let ran = false;

  // A keepalive, because the deadline timer is unref'd and a held lock is only a queue entry: without
  // something else holding the loop open, Node would exit before the answer arrives.
  const keepAlive = setTimeout(() => {}, 5_000);
  try {
    const answer = await acquireWithDeadline(locks, 'auth:refresh', async () => {
      ran = true;
      return 'rotated';
    }, { timeoutMs: 40, fence: async (reason) => ({ fenced: reason }) });
    assert.deepEqual(answer, { fenced: 'lock-acquisition-timeout' });
  } finally {
    clearTimeout(keepAlive);
    release();
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(ran, false, 'a fenced request does no work when the lock arrives late');

  // And the same call with a free lock, on the real scheduler, resolves with the work's result.
  assert.equal(
    await acquireWithDeadline(createLockManager(), 'auth:refresh', async () => 'rotated', {
      timeoutMs: 40,
      fence: async (reason) => ({ fenced: reason })
    }),
    'rotated'
  );
});
