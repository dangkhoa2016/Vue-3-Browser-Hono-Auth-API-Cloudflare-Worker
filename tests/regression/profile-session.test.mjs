/**
 * R5-B (profile half) — a profile change is a write to the canonical record, not a patch to a
 * variable that happens to be mirrored.
 *
 * The round4 profile page did `authStore.user = { ...authStore.user, full_name }` and wrote the
 * legacy `user` key itself. The canonical record never learned about it, so the next rotation — which
 * rebuilds the session from the record — restored the old profile. The user typed their name, saw
 * "saved", and watched it disappear on the next refresh or on a reload in another tab.
 *
 * What these scenarios pin down:
 *   - `updateSessionUser` writes the newest snapshot of the live session, under the writer lock;
 *   - a rotation that lands between the request and the commit is not rolled back;
 *   - a profile response that belongs to a session this tab no longer owns changes nothing;
 *   - a failed write is reported, and the legacy mirror is not left ahead of the record.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { API_A, NOW_SECONDS, WRITER_LOCK_NAME, baseSession, bootApp } from './helpers/app-harness.mjs';
import { createLockManager, createStorage } from './helpers/browser-env.mjs';

const USER = { id: 1, email: 'user@example.test', role: 'user', full_name: 'Old Name' };
const ROTATED = {
  accessToken: 'FAKE_ROTATED_ACCESS',
  refreshToken: 'FAKE_ROTATED_REFRESH',
  expiresAt: NOW_SECONDS + 7200,
  refreshExpiresAt: NOW_SECONDS + 259200,
};

const drain = async (turns = 4) => {
  for (let index = 0; index < turns; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
  }
};

/** A tab holding a durable session for `user`. */
async function bootSignedIn({ storage, locks, user = USER } = {}) {
  const app = bootApp({ storage, locks, baseUrl: API_A });
  app.auth.init();
  await app.auth.login(user, 'FAKE_ACCESS_A', 'FAKE_REFRESH_A', NOW_SECONDS + 3600, NOW_SECONDS + 259200);
  return app;
}

test('a profile change is written to the canonical record, not only to a variable', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootSignedIn({ storage, locks });

  const next = { ...USER, full_name: 'New Name' };
  const result = await app.auth.updateSessionUser(next, app.auth.captureContext());

  assert.equal(result.status, 'applied', 'the profile write is a real, committed write');
  assert.equal(app.readRecord().user.full_name, 'New Name', 'the record carries the new profile');
  assert.equal(app.readRecord().version, 2, 'and it took the next version of the same session');
  assert.equal(app.auth.user.full_name, 'New Name', 'memory agrees with the record');
  assert.equal(JSON.parse(storage.getItem('user')).full_name, 'New Name', 'the mirror agrees with the record');
});

test('a profile change keeps the tokens it did not mean to replace', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootSignedIn({ storage, locks });

  await app.auth.applyRotation(ROTATED, app.auth.captureContext(), { predecessor: app.predecessor() });
  const beforeProfile = app.readRecord();

  const result = await app.auth.updateSessionUser({ ...USER, full_name: 'New Name' }, app.auth.captureContext());

  assert.equal(result.status, 'applied');
  const after = app.readRecord();
  assert.equal(after.accessToken, ROTATED.accessToken, 'a profile write must not roll the token back');
  assert.equal(after.refreshToken, ROTATED.refreshToken);
  assert.equal(after.expiresAt, ROTATED.expiresAt);
  assert.equal(after.user.full_name, 'New Name');
  assert.equal(after.version, beforeProfile.version + 1);
  assert.equal(after.sessionId, beforeProfile.sessionId, 'and it stays the same login session');
});

test('a rotation queued behind a profile write merges instead of overwriting it', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootSignedIn({ storage, locks });

  // The profile write is issued first and lands first; the rotation was requested against the older
  // snapshot and must merge onto the profile rather than restore the old name.
  const profile = app.auth.updateSessionUser({ ...USER, full_name: 'New Name' }, app.auth.captureContext());
  const rotation = app.auth.applyRotation(ROTATED, app.auth.captureContext(), { predecessor: app.predecessor() });
  const [profileResult, rotationResult] = await Promise.all([profile, rotation]);

  assert.equal(profileResult.status, 'applied');
  assert.equal(rotationResult.status, 'applied');

  const final = app.readRecord();
  assert.equal(final.user.full_name, 'New Name', 'the profile survived the rotation');
  assert.equal(final.accessToken, ROTATED.accessToken, 'and the rotation carried its tokens');
  assert.equal(app.auth.user.full_name, 'New Name');
});

test('a rotation waits for the writer lock, and the profile it was built on is not lost', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootSignedIn({ storage, locks });

  const release = locks.hold(WRITER_LOCK_NAME);
  let rotationDone = false;
  const rotation = app.auth.applyRotation(ROTATED, app.auth.captureContext(), { predecessor: app.predecessor() }).then((result) => {
    rotationDone = true;
    return result;
  });
  await drain();

  assert.equal(rotationDone, false, 'the rotation is still queued behind the writer lock');
  assert.equal(app.readRecord().accessToken, 'FAKE_ACCESS_A', 'and nothing was written yet');

  release();
  await rotation;

  const final = app.readRecord();
  assert.equal(final.accessToken, ROTATED.accessToken);
  assert.equal(final.user.full_name, USER.full_name, 'a rotation carries tokens, not a profile');
});

test('a profile response for a session this tab no longer owns changes nothing', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootSignedIn({ storage, locks });
  const otherUser = { id: 2, email: 'other@example.test', role: 'user', full_name: 'Other' };

  // Another tab signs in: a new lifecycle that owns the record now.
  const otherTab = await bootSignedIn({ storage, locks, user: otherUser });
  const owned = otherTab.readRecord();
  assert.equal(owned.sessionId, otherTab.auth.sessionId, 'the second login owns the record');

  // The first tab's page had already captured a context and a user object before that happened.
  const staleContext = app.auth.captureContext();
  const result = await app.auth.updateSessionUser({ ...USER, full_name: 'Stale Name' }, staleContext);

  assert.equal(result.status, 'stale', 'a profile write for a session it no longer owns is refused');
  assert.deepEqual(app.readRecord(), owned, 'the owning session keeps its record untouched');
  assert.equal(app.readRecord().user.full_name, otherUser.full_name, 'and definitely not the stale name');
  assert.equal(JSON.parse(storage.getItem('user')).full_name, otherUser.full_name, 'the mirror is not left stale either');
});

test('a profile write that cannot be stored is reported, and the mirror is not left ahead', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootSignedIn({ storage, locks });
  const before = app.readRecord();

  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const result = await app.auth.updateSessionUser({ ...USER, full_name: 'New Name' }, app.auth.captureContext());

  assert.equal(result.status, 'storage-failure', 'a failed write is not a successful update');
  assert.equal(result.record, null, 'and it hands back no half-written session');
  assert.equal(app.auth.storageDegraded, true, 'the tab knows the session is not durable');
  assert.deepEqual(JSON.parse(storage.getItem('auth-session-record')), before, 'the stored record is unchanged');
  assert.equal(JSON.parse(storage.getItem('user')).full_name, USER.full_name, 'the mirror did not get ahead of it');
});

test('a profile write for an ended session is refused', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootSignedIn({ storage, locks });
  // A second tab that hydrated the *same* login session, so it still holds a live context and a
  // session id while the record is already a tombstone.
  const otherTab = bootApp({ storage, locks, baseUrl: API_A });
  otherTab.auth.init();
  assert.equal(otherTab.auth.sessionId, app.auth.sessionId, 'both tabs own one login session');

  await app.auth.logout();
  assert.equal(app.readRecord().state, 'ended');

  const own = await otherTab.auth.updateSessionUser({ ...USER, full_name: 'New Name' }, otherTab.auth.captureContext());
  assert.equal(own.status, 'stale');
  assert.equal(own.reason, 'session-ended', 'a tombstone is what a profile write finds, and it is a refusal');
  assert.equal(app.readRecord().state, 'ended', 'and the tombstone stays a tombstone');
  assert.equal(app.readRecord().user, null, 'a tombstone never regains a profile');

  // The tab that did the logout owns nothing at all, and says so rather than inventing a lifecycle.
  const afterOwnLogout = await app.auth.updateSessionUser({ ...USER, full_name: 'New Name' }, app.auth.captureContext());
  assert.equal(afterOwnLogout.status, 'stale');
  assert.equal(afterOwnLogout.reason, 'missing-lifecycle');
});
