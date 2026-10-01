/**
 * R5-B — a refresh must hand back a session that the canonical record actually holds.
 *
 * The round4 code resolved the refresh flight from whatever the network returned, and only then
 * asked the store to persist it. A caller that joined the flight therefore received a bearer whose
 * write was still queued behind another tab's writer lock: the request went out with a token that no
 * other tab could see, and a tab that restarted in between lost the session entirely.
 *
 * The rules these scenarios pin down:
 *   - the refresh promise does not resolve while the rotation is uncommitted;
 *   - nothing is published before the write lands, so no other tab can adopt an unstored token;
 *   - every caller of one shared flight waits for the same commit and gets the same snapshot;
 *   - a commit this tab did not make (`stale`, `unavailable`) yields no token at all.
 *
 * The ordering is driven by the real lock queue in the harness and by explicit promises. Nothing
 * sleeps: `settled()` is a microtask barrier, so "still pending" is asserted, never approximated.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ACCESS_TTL, API_A, NOW_SECONDS, REFRESH_TTL, WRITER_LOCK_NAME, baseSession, bootApp } from './helpers/app-harness.mjs';
import { createBroadcastBus, createLockManager, createStorage, fail, ok } from './helpers/browser-env.mjs';

const ROTATED = {
  access_token: 'FAKE_ROTATED_ACCESS',
  refresh_token: 'FAKE_ROTATED_REFRESH',
  expires_at: NOW_SECONDS + 7200,
  refresh_expires_at: NOW_SECONDS + 259200,
};

/**
 * Drains the microtask queue and a few macrotask turns without waiting on anything.
 *
 * This is what makes "still pending" assertable: after the queue has been drained, a promise that
 * was going to settle has settled, and one that has not is genuinely waiting on a latch — not on
 * the test's own impatience. No sleeps are involved, so it cannot pass by luck on a slow machine.
 */
const drain = async (turns = 4) => {
  for (let index = 0; index < turns; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
  }
};

/** Starts observing `promise` without awaiting it; call the result to ask whether it has settled. */
const observer = (promise) => {
  let done = false;
  Promise.resolve(promise).then(() => { done = true; }, () => { done = true; });
  return () => done;
};

/** A tab holding a session whose access token has already expired, so a refresh is the only way out. */
async function bootExpired({ storage, locks, routes, broadcastBus = null }) {
  const app = bootApp({ storage, locks, baseUrl: API_A, routes, broadcastBus });
  app.auth.init();
  await app.auth.login(
    baseSession().user,
    baseSession().access_token,
    baseSession().refresh_token,
    NOW_SECONDS - 10,
    baseSession().refresh_expires_at
  );
  app.auth.syncClock();
  return app;
}

test('R5-B — a refresh does not resolve while its rotation is still uncommitted', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootExpired({
    storage,
    locks,
    routes: { 'post /api/auth/refresh_token': ok(ROTATED) }
  });

  // Park the writer: the rotation is issued and cannot land yet.
  const release = locks.hold(WRITER_LOCK_NAME);
  const pending = app.auth.refreshAccessToken();
  const hasSettled = observer(pending);
  await drain();

  assert.equal(hasSettled(), false, 'the refresh must not resolve before the record is written');
  assert.equal(app.auth.token, baseSession().access_token, 'and the tab must not have adopted a token it did not store');
  assert.equal(app.readRecord().accessToken, baseSession().access_token, 'the canonical record still holds the old snapshot');

  release();
  const token = await pending;

  assert.equal(token, ROTATED.access_token, 'the caller gets the token the record now holds');
  const record = app.readRecord();
  assert.equal(record.accessToken, ROTATED.access_token);
  assert.equal(record.refreshToken, ROTATED.refresh_token);
  assert.equal(record.expiresAt, ROTATED.expires_at);
  assert.equal(record.refreshExpiresAt, ROTATED.refresh_expires_at);
  assert.equal(app.auth.token, ROTATED.access_token, 'memory and the record agree');
  assert.equal(storage.getItem('token'), ROTATED.access_token, 'the mirror agrees with the record');
});

test('R5-B — nothing is published before the write lands', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  // One origin, so one broadcast bus: the two tabs are two module realms sharing it.
  const broadcastBus = createBroadcastBus();
  const app = await bootExpired({
    storage,
    locks,
    routes: { 'post /api/auth/refresh_token': ok(ROTATED) },
    broadcastBus
  });

  // A second tab on the same origin: it would adopt anything this tab announced.
  const otherTab = bootApp({ storage, locks, baseUrl: API_A, broadcastBus });
  otherTab.auth.init();
  assert.equal(otherTab.auth.token, baseSession().access_token, 'both tabs start on the same snapshot');

  const release = locks.hold(WRITER_LOCK_NAME);
  const pending = app.auth.refreshAccessToken();
  await drain();

  assert.equal(otherTab.auth.token, baseSession().access_token, 'no tab adopts a rotation that is not stored yet');

  release();
  await pending;
  await drain();
  assert.equal(otherTab.auth.token, ROTATED.access_token, 'and the other tab picks it up once it is real');
  assert.equal(otherTab.readRecord().accessToken, ROTATED.access_token);
});

test('R5-B — twenty callers share one flight and one commit, and none gets the expired bearer', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  let refreshes = 0;
  let releaseNetwork;
  const networkGate = new Promise((resolve) => { releaseNetwork = resolve; });

  const app = await bootExpired({
    storage,
    locks,
    routes: {
      'post /api/auth/refresh_token': async () => {
        refreshes += 1;
        await networkGate;
        return ok(ROTATED);
      }
    }
  });

  // Both latches at once: the network has not answered and the writer is busy, so no caller may be
  // served from either side.
  const releaseWriter = locks.hold(WRITER_LOCK_NAME);
  const callers = Array.from({ length: 20 }, () => app.auth.refreshAccessToken());
  const anySettled = observer(Promise.all(callers));

  await drain();
  assert.equal(anySettled(), false, 'no caller is served before the network answers');

  releaseNetwork();
  await drain();
  assert.equal(anySettled(), false, 'nor before the record is written');

  releaseWriter();
  const tokens = await Promise.all(callers);

  assert.equal(refreshes, 1, 'one shared flight, one network call');
  assert.equal(app.readRecord().version, 2, 'one rotation, not twenty');
  for (const [index, token] of tokens.entries()) {
    assert.equal(token, ROTATED.access_token, `caller ${index} must receive the committed token`);
    assert.notEqual(token, baseSession().access_token, 'no caller may continue with the expired bearer');
  }
});

/* ------------------------------------------------------------------------------------------------
 * R7 / FA8-01 — the refresh lock has to cover the commit, not just the request.
 *
 * `refreshWithCoordination` used to wrap only `performRefresh` in the cross-tab refresh lock and then
 * release it before `applySession` ran. That leaves a window between "the server has rotated" and "the
 * record holds the successor": a second tab acquires the lock, re-reads, still sees the *predecessor*
 * refresh token, and spends it again. Two tabs therefore dispatch the same predecessor.
 *
 * The scenarios below pin the whole-flow behaviour the review asked for. They deliberately do not
 * call `applyRotation` directly — that bypasses the coordination being fixed and passes either way.
 *
 * The window is opened with a real latch on the real writer lock, not with a sleep: `locks.hold()`
 * parks the writer, so the commit genuinely cannot land until the test releases it.
 * ---------------------------------------------------------------------------------------------- */

/** The refresh coordination lock both tabs contend for, named exactly as production names it. */
const REFRESH_ROUTE = 'post /api/auth/refresh_token';

/**
 * Every refresh this tab has actually put on the wire, in order.
 *
 * Counted from the transport's own call log rather than from a counter inside a fixture: the log is
 * what the app really sent, so a fixture that is never reached cannot make the count look right.
 */
const refreshesSent = (app) => app.transport.calls
  .filter((call) => call.key === REFRESH_ROUTE)
  .map((call) => call.config.data?.refresh_token);

test('R7-FA8-01 — two tabs do not spend the predecessor before the first commit', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const broadcastBus = createBroadcastBus();

  const routes = { [REFRESH_ROUTE]: ok(ROTATED) };

  const tab1 = await bootExpired({ storage, locks, routes, broadcastBus });

  // A second tab on the same origin: same record, same session, same refresh lock.
  const tab2 = bootApp({ storage, locks, baseUrl: API_A, broadcastBus, routes });
  tab2.auth.init();
  assert.equal(tab2.auth.token, baseSession().access_token, 'both tabs start on the same snapshot');

  // Park the writer. The rotation can be dispatched and answered, but not committed.
  const releaseWriter = locks.hold(WRITER_LOCK_NAME);

  const first = tab1.auth.refreshAccessToken();
  await drain();

  assert.deepEqual(refreshesSent(tab1), [baseSession().refresh_token], 'the first tab dispatched the predecessor exactly once');
  assert.equal(locks.pending(WRITER_LOCK_NAME), 1, 'the first tab is parked on the writer, before its commit');

  // The window: the response is in, the record is not updated yet. A second tab asks for a token.
  const second = tab2.auth.refreshAccessToken();
  await drain();

  assert.deepEqual(
    refreshesSent(tab2),
    [],
    'the second tab must not spend the predecessor again while the first commit is uncommitted'
  );

  const secondSettled = observer(second);
  assert.equal(secondSettled(), false, 'and the second tab must still be waiting, not answered with a token');

  releaseWriter();
  const [firstToken, secondToken] = await Promise.all([first, second]);

  const total = [...refreshesSent(tab1), ...refreshesSent(tab2)];
  assert.deepEqual(total, [baseSession().refresh_token], 'the whole scenario spends one refresh token, not two');
  assert.equal(tab1.readRecord().refreshToken, ROTATED.refresh_token, 'the record holds the successor');
  assert.equal(tab1.readRecord().version, 2, 'and exactly one rotation was committed');
  for (const [label, token] of [['first', firstToken], ['second', secondToken]]) {
    assert.equal(token, ROTATED.access_token, `the ${label} tab receives the committed successor`);
  }
});

test('R7-FA8-01 — a tab queued behind a rotation adopts the successor instead of rotating again', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const broadcastBus = createBroadcastBus();

  let releaseNetwork;
  const networkGate = new Promise((resolve) => { releaseNetwork = resolve; });
  const routes = {
    [REFRESH_ROUTE]: async () => {
      await networkGate;
      return ok(ROTATED);
    }
  };

  const tab1 = await bootExpired({ storage, locks, routes, broadcastBus });
  const tab2 = bootApp({ storage, locks, baseUrl: API_A, broadcastBus, routes });
  tab2.auth.init();

  // Tab2 asks first and holds the refresh lock; tab1 arrives while the lock is held.
  const second = tab2.auth.refreshAccessToken();
  await drain();
  assert.equal(refreshesSent(tab2).length, 1, 'tab2 is inside the refresh and holds the coordination lock');

  const first = tab1.auth.refreshAccessToken();
  await drain();
  assert.equal(refreshesSent(tab1).length, 0, 'tab1 is queued behind the coordination lock and has dispatched nothing');

  releaseNetwork();
  const [secondToken, firstToken] = await Promise.all([second, first]);

  assert.equal(refreshesSent(tab1).length + refreshesSent(tab2).length, 1, 'one dispatch: tab1 adopted the committed successor');
  assert.equal(secondToken, ROTATED.access_token);
  assert.equal(firstToken, ROTATED.access_token, 'tab1 ends on the committed successor too');
  assert.equal(tab1.readRecord().version, 2, 'adoption is a read, so only one rotation is committed');
});

/**
 * A session that is replaced while a refresh is queued behind another tab's coordination lock.
 *
 * The flight was created for session A. By the time the lock is granted the tab is signed in as B, so
 * the queued work must not spend A's refresh token, must not clobber B's record, and must not clear B.
 * The dispatch counter has to reach the real production path first, otherwise the scenario would pass
 * on an early `requiresReauth` rejection and prove nothing about the lock.
 */
test('R7-FA8-01 — a queued rotation does not spend or clobber a session that replaced it', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const broadcastBus = createBroadcastBus();

  let releaseNetwork;
  const networkGate = new Promise((resolve) => { releaseNetwork = resolve; });
  const routes = {
    [REFRESH_ROUTE]: async () => {
      await networkGate;
      return ok(ROTATED);
    }
  };

  const tab1 = await bootExpired({ storage, locks, routes, broadcastBus });
  const tab2 = bootApp({ storage, locks, baseUrl: API_A, broadcastBus, routes });
  tab2.auth.init();

  // Tab2 takes the coordination lock and is inside the network; tab1 queues behind it.
  const ahead = tab2.auth.refreshAccessToken();
  await drain();
  assert.equal(refreshesSent(tab2).length, 1, 'the lock is genuinely held and one rotation is in flight');

  const queued = tab1.auth.refreshAccessToken();
  await drain();
  assert.equal(refreshesSent(tab1).length, 0, 'tab1 is queued behind the coordination lock');

  // The session is replaced under the queued flight: A ends, B logs in on the same tab.
  await tab1.auth.logout();
  const sessionB = {
    user: { id: 2, email: 'other@example.test', role: 'user' },
    access_token: 'FAKE_ACCESS_B',
    refresh_token: 'FAKE_REFRESH_B',
    expires_at: NOW_SECONDS + ACCESS_TTL,
    refresh_expires_at: NOW_SECONDS + REFRESH_TTL
  };
  await tab1.auth.login(
    sessionB.user,
    sessionB.access_token,
    sessionB.refresh_token,
    sessionB.expires_at,
    sessionB.refresh_expires_at
  );
  tab1.auth.syncClock();
  await drain();

  releaseNetwork();
  await ahead.catch(() => {});
  await queued.catch(() => {});
  await drain();

  // Nothing from the stale flight reached the wire: A's token was never re-spent, and B's token is
  // not something a refresh of A may use.
  const sent = [...refreshesSent(tab1), ...refreshesSent(tab2)];
  assert.deepEqual(sent, [baseSession().refresh_token], `only A's original rotation may be dispatched, got ${JSON.stringify(sent)}`);

  const record = tab1.readRecord();
  assert.equal(record.state, 'active', 'B is still signed in');
  assert.equal(record.accessToken, sessionB.access_token, 'the stale flight did not overwrite B with the A successor');
  assert.equal(record.refreshToken, sessionB.refresh_token, 'and B keeps its own refresh token');
  assert.equal(tab1.auth.token, sessionB.access_token, 'memory still belongs to B');
  assert.equal(tab1.auth.requiresReauth, false, 'a superseded flight is not a reason to sign B out');
});

test('R5-B — a rotation this tab did not commit yields no token', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootExpired({
    storage,
    locks,
    routes: {
      // The server says the refresh token was already used: this tab lost the race.
      'post /api/auth/refresh_token': fail(409, 'REFRESH_ALREADY_ROTATED', 'refresh token already rotated')
    }
  });

  // Another tab ends the session while this one waits for the conflict to resolve.
  const pending = app.auth.refreshAccessToken();
  await app.auth.logout();

  const token = await pending;

  assert.equal(token, null, 'a commit the guard refused is never reported as a token');
  assert.equal(app.auth.token, null);
  assert.equal(app.readRecord().state, 'ended');
});

test('R5-B — a temporary backend failure keeps the snapshot and still refuses the request', async () => {
  const storage = createStorage();
  const locks = createLockManager();
  const app = await bootExpired({
    storage,
    locks,
    routes: { 'post /api/auth/refresh_token': fail(503, 'DB_UNAVAILABLE', 'database unavailable') }
  });

  const before = app.readRecord();
  const token = await app.auth.refreshAccessToken();

  assert.equal(token, null, 'a busy backend cannot issue a fresh bearer');
  assert.deepEqual(app.readRecord(), before, 'and it must not end or rewrite the session');
  assert.equal(app.auth.requiresReauth, false, 'an outage is not an invalid session');

  // The typed failure is what tells the transport to refuse the request instead of replaying it
  // with the expired bearer it already has.
  await assert.rejects(
    () => app.auth.refreshAccessTokenOrThrow(),
    (error) => error.code === 'AUTH_TEMPORARILY_UNAVAILABLE'
  );
});
