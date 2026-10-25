/**
 * The session invariants the Node suites assert against stand-ins, asserted here against the real
 * thing: a real Chromium, a real `localStorage`, a real `BroadcastChannel`, and a **real Web Lock**
 * held by a second tab.
 *
 * The gap this closes is named in review R5-E: four browser cases existed and all four asserted the
 * same tombstone. What they did not show is the rest of what the code claims — a rotation that waits
 * for another tab's writer, a rotation the backend has already invalidated, a logout queued behind a
 * lock, a session with no writer serialization at all, and a session that must not survive a change
 * of API identity.
 *
 * **No sleep is a barrier here.** The previous version of the writer-lock case waited 1200ms after a
 * fake 1500ms server delay and called the result "pending", which is a claim about two timers rather
 * than about the browser. Every wait below is now one of:
 *   - a fixture request the server has *received* (`/__fake/requests`),
 *   - a fixture response the server has *finished sending* (`/__fake/completed`),
 *   - a lock request the browser reports as *queued* (`navigator.locks.query()`),
 *   - a DOM or record state.
 * The stand-in's hold/release control makes "received but not answered" a state a test can sit in,
 * and `navigator.locks.query()` makes "waiting for the writer" observable rather than inferred.
 *
 * No credentials and no backend: the loopback stand-in issues fake tokens and can be told to answer
 * `401`, to be slow, to hold a response open, or to expire the access token on issue. Every token it
 * issues is distinct, so "the token changed" is a claim about the token and not about the clock.
 */

// The shared fixture, not Playwright's: it installs the egress guard on the context before any
// page exists and fails the run if the guard refused something (FA8-03).
import { test, expect } from './fixtures.js';

import {
  API_ORIGIN,
  collectPageProblems,
  holdBrowserResponse,
  control,
  expectSignedIn,
  expectSignedOut,
  holdWriterLock,
  logoutViaUi,
  installEgressGuard,
  LEGACY_KEYS,
  lockState,
  noLegacyBearers,
  noUsableSession,
  readLegacyKeys,
  readApiBaseUrl,
  readSessionRecord,
  RECORD_KEY,
  REFRESH_LOCK_PREFIX,
  releaseWriterLock,
  signIn,
  submitLoginForm,
  useLiveApi,
  versionAbove,
  waitForApp,
  waitForFixtureRequest,
  waitForFixtureResponse,
  waitForRecord,
  waitForWriterLockFree,
  isState
} from './helpers/browser-fixture.mjs';

const API_BASE = API_ORIGIN;
const setConfig = (patch) => control.setConfig(patch);
const apiRequests = () => control.requests();
const readRecord = readSessionRecord;
const legacyTokens = readLegacyKeys;

/** The browser's own answer to "is a writer request queued?". */
const waitForWriterLockPending = (page) => expect
  .poll(async () => (await lockState(page)).pending > 0,
    { timeout: 20_000, message: 'no writer-lock request became pending' })
  .toBe(true);

/**
 * The cross-tab *refresh* coordination lock, by prefix.
 *
 * It is named after the API identity and the session, so its exact suffix is not something a test
 * should restate: a hard-coded name would let a rename make this barrier silently observe nothing.
 * Matching the prefix keeps the assertion about "a rotation is queued" instead of about a string.
 */
const refreshLockState = (page) => page.evaluate(async (prefix) => {
  if (!navigator.locks?.query) return { supported: false, held: 0, pending: 0 };
  const snapshot = await navigator.locks.query();
  const match = (entry) => entry.name.startsWith(prefix);
  return {
    supported: true,
    held: snapshot.held.filter(match).length,
    pending: snapshot.pending.filter(match).length
  };
}, REFRESH_LOCK_PREFIX);

const waitForRefreshLockPending = (page) => expect
  .poll(async () => (await refreshLockState(page)).pending > 0,
    { timeout: 20_000, message: 'no refresh-coordination request became pending' })
  .toBe(true);

/** A context with the outbound guard installed, so no page in this file can reach the internet. */
const guardedContext = async (browser) => {
  const context = await browser.newContext();
  const guard = await installEgressGuard(context);
  return { context, guard };
};

/**
 * Counts the refresh requests **one page** puts on the wire.
 *
 * The stand-in's own log is shared by every tab in the context, so it cannot say *which* tab spent a
 * refresh token — and this case is entirely about which tab spent one. A page-scoped route is the only
 * observer that can answer that, and it is an observation rather than a stub: the request is passed
 * straight through with `fallback()`, so the app's behaviour is untouched and the counter records what
 * the page really sent.
 *
 * A refused request still counts. The claim under test is about the *attempt* to spend a predecessor,
 * which is decided before the server ever answers.
 */
const countRefreshDispatches = (page) => {
  const counter = { sent: [] };
  page.route('**/api/auth/refresh_token', async (route, request) => {
    let body = null;
    try { body = JSON.parse(request.postData() || 'null'); } catch (_error) { body = null; }
    counter.sent.push(body?.refresh_token ?? null);
    await route.fallback();
  });
  return counter;
};

test.describe('session invariants in a real browser', () => {
  test.beforeEach(async () => {
    // Readiness first: a control plane that answers is a precondition, not an assumption.
    const ready = await control.ready();
    expect(ready.ok, 'the loopback stand-in must be up before any case runs').toBe(true);
    expect(ready.apiPort).toBe(Number(new URL(API_BASE).port));
    await control.reset();
  });

  test('the second tab is authenticated in the DOM, and the logout takes that away', async ({ browser }) => {
    const { context } = await guardedContext(browser);
    const first = await context.newPage();
    await useLiveApi(first);
    await signIn(first);

    const second = await context.newPage();
    await useLiveApi(second);
    await second.goto('/');
    await waitForApp(second);

    // Before the logout, the second tab is a *signed-in tab*, not a tab that happens to share a key.
    // Asserting this is what gives the assertion after it its meaning.
    await expectSignedIn(second);
    const beforeSecond = await readRecord(second);
    expect(beforeSecond.state).toBe('active');
    expect(beforeSecond.accessToken).toBeTruthy();
    const versionBefore = beforeSecond.version;

    await logoutViaUi(first);
    await waitForRecord(first, isState('ended'), 'ended');

    // The barrier is the second tab's own signed-out state, not a sleep. By the time the DOM says it
    // is out, the record is already a tombstone — so the ordering claim is about the app, not timing.
    await expectSignedOut(second);
    const after = await readRecord(second);
    expect(after.state, 'the record is a tombstone, not an absence').toBe('ended');
    expect(after.accessToken).toBeNull();
    expect(after.version, 'the observing tab adopts; it never writes').toBe(versionBefore + 1);

    // And no bearer survives in the mirror, in either tab.
    for (const page of [first, second]) {
      expect(await legacyTokens(page), 'a bearer must not survive an ended session').toEqual(noLegacyBearers);
    }

    await context.close();
  });

  test('a protected action that carried a bearer stops carrying one once the session ended', async ({ browser }) => {
    const { context } = await guardedContext(browser);
    const page = await context.newPage();
    await useLiveApi(page);
    await signIn(page);

    // The control: while signed in, the same protected visit does authenticate. The profile page is
    // used because it is the one protected read that happens on load, and the wait is for the request
    // to arrive rather than for a fixed time.
    await control.reset();
    await page.goto('/#/profile');
    await waitForApp(page);
    await expectSignedIn(page);
    await expect.poll(async () => (await apiRequests()).filter((entry) => entry.authorization).length, {
      timeout: 20_000,
      message: 'a signed-in visit must really send a bearer, or the rest of this test proves nothing'
    }).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Browser Test', exact: true })).toBeVisible();

    await logoutViaUi(page);
    await waitForRecord(page, isState('ended'), 'ended');
    await expectSignedOut(page);

    // The revocation request carries a bearer on purpose — that is what revoking means. Empty the log
    // after it, so what follows is only what a signed-out tab does on its own.
    await control.reset();
    await page.goto('/#/profile');
    await waitForApp(page);
    await expectSignedOut(page);

    // The barrier for "nothing was sent": the profile view's own mount work has finished when it has
    // decided it is not authenticated, and the app says so by opening the login modal. The old version
    // slept 1500ms here, which is not a statement about anything the product did.
    await page.locator('#email').waitFor({ state: 'visible', timeout: 25_000 });

    const withBearer = (await apiRequests()).filter((entry) => entry.authorization);
    expect(withBearer, `a signed-out tab sent a bearer: ${JSON.stringify(withBearer)}`).toEqual([]);
    // And the read was never sent at all, rather than sent and refused: an authenticated-looking 401
    // round trip is what a client-side gate exists to avoid.
    expect((await apiRequests()).map((entry) => entry.path),
      'a signed-out tab still asked the API for the profile').not.toContain('/api/user/profile');

    await context.close();
  });

  test('with reconciliation disabled, the second tab does *not* sign out', async ({ browser }) => {
    const { context } = await guardedContext(browser);
    const first = await context.newPage();
    await useLiveApi(first);
    await signIn(first);

    // The mutation: the second tab's reconciliation is cut, so the mechanism the previous test relies
    // on is removed. If that test could still pass, it was measuring a sleep.
    //
    // Reconciliation has two channels — a `BroadcastChannel` and a `storage` event — and both are cut.
    // The `addEventListener` wrapper is put back once the tab is up, so the mutation removes the
    // reconciliation and nothing else: the tab boots and signs in exactly as before.
    const second = await context.newPage();
    await second.addInitScript((base) => {
      window.localStorage.setItem('api-base-url', base);
      window.localStorage.setItem('mock-api', 'false');
      window.__nativeAddEventListener = window.addEventListener.bind(window);
      Object.defineProperty(window, 'BroadcastChannel', { value: undefined, configurable: true });
      window.addEventListener = (type, ...rest) => (
        type === 'storage' ? undefined : window.__nativeAddEventListener(type, ...rest)
      );
    }, API_BASE);
    await second.goto('/');
    await waitForApp(second);
    await expectSignedIn(second);
    await second.evaluate(() => { window.addEventListener = window.__nativeAddEventListener; });

    await logoutViaUi(first);
    await waitForRecord(first, isState('ended'), 'ended');

    // The writer has committed, but the other renderer can still be receiving the
    // storage update. Observe that tab's record before checking its deliberately
    // disconnected in-memory session; this read does not reconcile the auth store.
    await waitForRecord(second, isState('ended'), 'ended');

    // The record on disk is a tombstone ...
    expect((await readRecord(second)).state).toBe('ended');
    // ... but this tab still shows a session, because nothing told it. That is the proof the previous
    // test is reading the mechanism and not a timer.
    await expectSignedIn(second);
    expect((await readRecord(second)).accessToken, 'and the tombstone still has no token').toBeNull();

    await context.close();
  });

  test('a rotation queued behind another tab\'s writer lock lands once, after the lock', async ({ browser }) => {
    const { context } = await guardedContext(browser);
    const first = await context.newPage();
    const problems = collectPageProblems(first, { label: 'first' });
    await useLiveApi(first);
    // A valid TTL, and one refused request, is what provokes *one* rotation. An already-expired token
    // refreshes again after every rotation, so the app is entitled to dispatch a second one at any
    // moment and a count of dispatched rotations would measure that loop instead of this race — and it
    // would race the test itself, because whether the next protected request lands before or after the
    // barrier is not something the test controls.
    await signIn(first);
    const before = await readRecord(first);

    // The stand-in will hold its refresh answer open. The request is real and the answer is real; it
    // simply has not been sent yet, which is the state the previous version approximated with a
    // 1500ms delay and a 1200ms sleep.
    await control.hold(['/api/auth/refresh_token']);

    const holder = await context.newPage();
    await useLiveApi(holder);
    await holder.goto('/');
    await waitForApp(holder);
    await holdWriterLock(holder);

    // The request log is *not* reset here: a reset would also drop the stand-in's live sessions and
    // the rotation would be answered with a replay 401. The count is asserted as a delta instead.
    const requestsBefore = (await apiRequests()).filter((entry) => entry.path === '/api/auth/refresh_token').length;
    const beforeRotation = await readRecord(first);

    // Any protected navigation takes the refresh path, because the peer refuses the first one.
    await setConfig({ forced: { staleAccessOnce: true } });
    await first.goto('/#/admin/dashboard');

    // Barrier 1: the server has received the refresh and has not answered it. The refused request needs
    // no path of its own: the refresh is dispatched *because* of it, so the refresh arriving is the
    // proof, and pinning a path here would only guess which call the dashboard happens to make first.
    await waitForFixtureRequest('/api/auth/refresh_token');
    expect((await control.held()).waiting.map((entry) => entry.path),
      'the refresh response must be held open, not merely slow').toContain('/api/auth/refresh_token');
    expect((await readRecord(first)).version, 'no write may land while the answer is in flight')
      .toBe(beforeRotation.version);

    // Barrier 2: release the answer, and wait until the stand-in has actually finished sending it.
    await control.release();
    await waitForFixtureResponse('/api/auth/refresh_token', 200);

    // Barrier 3: now the client is waiting for the writer, and the browser says so. A queued lock
    // request is an observable state; a timer is not.
    await waitForWriterLockPending(first);
    const whileQueued = await readRecord(first);
    expect(whileQueued.version, 'a write landed while another tab held the writer lock')
      .toBe(beforeRotation.version);
    expect(whileQueued.accessToken, 'and the pre-rotation token is still the one in the record')
      .toBe(beforeRotation.accessToken);

    // Barrier 4: release the lock, and only then may the rotation land — exactly once.
    await releaseWriterLock(holder);
    await waitForRecord(first, versionAbove, beforeRotation.version);

    const after = await readRecord(first);
    expect(after.version, 'the queued rotation wrote exactly once').toBe(beforeRotation.version + 1);
    expect(after.state).toBe('active');
    expect(after.accessToken).not.toBe(beforeRotation.accessToken);
    expect(after.refreshToken, 'both halves of the pair move together').not.toBe(beforeRotation.refreshToken);
    expect(after.sessionId, 'a rotation is not a new login session').toBe(beforeRotation.sessionId);
    expect(after.identity).toBe(beforeRotation.identity);
    expect((await legacyTokens(first)).token, 'and the mirror follows the record').toBe(after.accessToken);

    // The request count is part of the claim: one rotation was dispatched, not two.
    const rotations = (await apiRequests()).filter((entry) => entry.path === '/api/auth/refresh_token');
    expect(rotations.length - requestsBefore, 'a queued rotation must be dispatched once, not re-dispatched on release')
      .toBe(1);

    // The refused rotation is the contract, the log line is not: whether the 401 is ever logged is the
    // browser's mood. At most one keeps the allowance from becoming a blanket, without demanding a log
    // line the case does not control.
    problems.allowError({ kind: 'console', count: [0, 1] }, /Failed to load resource|Network Error|401|Request failed/i,
      'the one request the stand-in refused on purpose, which axios logs only when the browser does');
    problems.expectClean();

    await context.close();
  });

  test('a second tab does not spend the predecessor while the first rotation is uncommitted (FA8-01)', async ({ browser }) => {
    const { context } = await guardedContext(browser);
    const winner = await context.newPage();
    const problems = collectPageProblems(winner, { label: 'winner' });
    const winnerDispatches = countRefreshDispatches(winner);
    await useLiveApi(winner);
    await signIn(winner);
    const beforeRotation = await readRecord(winner);

    // The other tab is opened and settled before the window opens. The one tab that is inside the
    // window below is the one the claim is about, and it must spend that window doing nothing but
    // deciding.
    const arriving = await context.newPage();
    const arrivingProblems = collectPageProblems(arriving, { label: 'arriving' });
    const arrivingDispatches = countRefreshDispatches(arriving);
    await useLiveApi(arriving);
    await arriving.goto('/');
    await waitForApp(arriving);
    await expectSignedIn(arriving);

    // Barrier 1: the winner has been refused a token and its rotation is in flight, unanswered.
    //
    // No third page takes the writer lock. Holding it here would be the obvious way to park the commit
    // past its acquisition deadline (`DEFAULT_LOCK_ACQUISITION_TIMEOUT_MS`), and it is a trap: a commit
    // that waits that long *should* answer `unavailable`, so the record stays on the predecessor and the
    // arriving tab is then right to rotate it. That is a true statement about the code and a useless
    // statement about FA8-01 — the test would be measuring the test's own lock. The window below is
    // instead the one the finding is actually about: the answer is back, the write has not landed, and
    // the coordination lock is still held around it.
    await setConfig({ forced: { staleAccessOnce: true } });
    await control.hold(['/api/auth/refresh_token']);
    await arriving.goto('/#/admin/dashboard');

    await waitForFixtureRequest('/api/auth/refresh_token');
    expect((await control.held()).waiting.map((entry) => entry.path),
      'the refresh response must be held open, not merely slow').toContain('/api/auth/refresh_token');

    // The record still holds the predecessor, and only one tab has spent it.
    expect(winnerDispatches.sent, 'the idle tab has spent nothing').toEqual([]);
    expect(arrivingDispatches.sent, 'exactly one rotation has been dispatched, and it is this tab\'s')
      .toEqual([beforeRotation.refreshToken]);

    // Barrier 2: the idle tab now needs a token too, in the middle of that window. The record still
    // holds a *valid* predecessor access token, so this tab would sail past the dashboard without
    // refreshing and the case would prove nothing — the stand-in's one-shot refusal is re-armed to put
    // it on the refresh path for real. "No extra request" has to be the result of the coordination, not
    // of the tab never asking.
    //
    // The refusal is unambiguous here: the arriving tab is parked inside the coordination lock, so it is
    // the only tab that can spend it.
    await setConfig({ forced: { staleAccessOnce: true } });
    await winner.goto('/#/admin/dashboard');

    // The tab that is waiting must be *observably* waiting, not merely absent from the request log. The
    // browser reports its refresh request queued behind the coordination lock. It is the *refresh* lock,
    // not the writer, so this is what distinguishes "waited and adopted" from "never asked" and from
    // "asked and raced" — and it is the observation that fails first if the section is released too early.
    await waitForRefreshLockPending(winner);

    expect(arrivingDispatches.sent,
      'the tab that is already rotating is the only one that may spend the predecessor')
      .toEqual([beforeRotation.refreshToken]);
    expect(winnerDispatches.sent,
      'the arriving tab must not spend the predecessor again while the first rotation is uncommitted')
      .toEqual([]);

    // Barrier 3: release the answer. The winner's rotation lands exactly once, and the tab that was
    // waiting re-reads a *committed* successor and adopts it instead of rotating the predecessor that
    // the server has already spent.
    await control.release();
    await waitForFixtureResponse('/api/auth/refresh_token', 200);
    await waitForRecord(winner, versionAbove, beforeRotation.version);
    await waitForWriterLockFree(winner);

    const after = await readRecord(winner);

    // The claim comes before the evidence that supports it. A tab that slips past the coordination lock
    // and spends the predecessor does so *after* it is granted the lock, so a record assertion would fire
    // first and name a symptom ("the version moved twice") instead of the thing that is actually wrong
    // ("two tabs spent a token that only one of them was allowed to spend").
    expect(arrivingDispatches.sent, 'the whole window spends one refresh token, not two')
      .toEqual([beforeRotation.refreshToken]);
    expect(winnerDispatches.sent, 'and the tab that waited never spent one at all').toEqual([]);

    const onTheWire = (await apiRequests()).filter((entry) => entry.path === '/api/auth/refresh_token');
    expect(onTheWire.length, 'the stand-in saw exactly one rotation for the whole window').toBe(1);

    expect(after.version, 'the rotation wrote exactly once').toBe(beforeRotation.version + 1);
    expect(after.state, 'and it landed as a usable session, not a tombstone').toBe('active');
    expect(after.accessToken).not.toBe(beforeRotation.accessToken);

    // Both tabs end on the same committed successor: the waiting tab adopted it rather than
    // re-rotating, and neither tab was signed out along the way.
    const winnerRecord = await readRecord(winner);
    expect(winnerRecord.accessToken, 'both tabs end on the same committed successor')
      .toBe(after.accessToken);
    expect(winnerRecord.state, 'and the tab that waited is still signed in').toBe('active');
    await expectSignedIn(winner);

    // The winner made no refused request, so its log line is conditional; the arriving tab's side of the
    // same claim is the dispatch count above, not the browser's mood. Both capped at one.
    problems.allowError({ kind: 'console', count: [0, 1] }, /Failed to load resource|Network Error|401|Request failed/i,
      'the one request the stand-in refused on purpose, which axios logs only when the browser does');
    problems.expectClean();
    arrivingProblems.allowError({ kind: 'console', count: [0, 1] }, /Failed to load resource|Network Error|401|Request failed/i,
      'the same refused request observed from the tab that was already rotating');
    arrivingProblems.expectClean();

    await context.close();
  });


  test('a rotation the backend has already invalidated ends the session instead of continuing', async ({ page }) => {
    await useLiveApi(page);
    await signIn(page, { expired: true });
    const before = await readRecord(page);

    await setConfig({ forced: { refreshReplay: true } });
    await page.goto('/#/admin/dashboard');

    // The refresh token was already rotated away: there is no session left to continue with.
    await waitForRecord(page, isState('ended'), 'ended');
    await expectSignedOut(page);

    const record = await readRecord(page);
    expect(record.accessToken).toBeNull();
    expect(record.refreshToken).toBeNull();
    expect(record.sessionId, 'and it is the same session that ended').toBe(before.sessionId);

    // The refresh call itself carried the expired bearer — that is how a refresh is made. What must
    // not happen is a *successful* request afterwards with a token that no longer exists.
    const afterReplay = (await apiRequests()).filter((entry) => entry.authorization && entry.path !== '/api/auth/refresh_token');
    expect(afterReplay, `a bearer was still used after the session ended: ${JSON.stringify(afterReplay)}`)
      .toEqual([]);
    expect(await legacyTokens(page)).toEqual(noLegacyBearers);
  });

  test('a temporary backend failure keeps the session instead of ending it', async ({ page }) => {
    const problems = collectPageProblems(page, { label: 'page' });
    await useLiveApi(page);
    await signIn(page, { expired: true });
    const before = await readRecord(page);
    const mirrorBefore = await legacyTokens(page);

    await setConfig({ forced: { refreshStatus: 503 } });
    await page.goto('/#/admin/dashboard');

    // The old version of this case waited for the record to be `active`, which it already was, so the
    // assertion could have been made before the request was ever sent. These three barriers cannot.
    await waitForFixtureRequest('/api/auth/refresh_token');
    await waitForFixtureResponse('/api/auth/refresh_token', 503);
    // Settlement, observed from the product: it says the failure was temporary and kept the session.
    // A build that classified 503 as an invalid token would not say this, and would end the record.
    await problems.waitForWarning(/temporary refresh failure; keeping the current session/i);

    const after = await readRecord(page);
    expect(after.state, 'a 503 is not a logout').toBe('active');
    expect(after.accessToken, 'and the token it had is the token it keeps').toBe(before.accessToken);
    expect(after.refreshToken).toBe(before.refreshToken);
    expect(after.sessionId).toBe(before.sessionId);
    expect(after.version, 'a temporary failure commits nothing').toBe(before.version);
    expect(await legacyTokens(page), 'nor does it disturb the mirror').toEqual(mirrorBefore);
    await expectSignedIn(page);

    // And the expired bearer was not spent on a follow-up request after the refresh could not produce
    // a new one: the caller is refused instead.
    const after503 = (await apiRequests()).filter((entry) => entry.authorization && entry.path !== '/api/auth/refresh_token');
    expect(after503, `an expired bearer was dispatched after a failed refresh: ${JSON.stringify(after503)}`)
      .toEqual([]);
    expect((await control.sessions()).length, 'the stand-in still considers the session live').toBe(1);

    problems.allowError({ kind: 'console' }, /Failed to load resource|Network Error|503|Request failed/i,
      'the protected read the page asked for was refused by design, and axios logs that as an error');
    problems.expectClean();
  });

  test('a rotation answer computed for the old session never overwrites the session that replaced it', async ({ browser }) => {
    // The predecessor race, end to end. A rotation is dispatched for session A and its answer is parked
    // in the browser, the session A belongs to is ended and replaced by B, and only then does the answer
    // reach the client. The rotation is legitimate — the peer really does rotate A — but it is a rotation
    // of a session that no longer exists, so applying it would hand A's successor to a record owning B.
    const { context, guard } = await guardedContext(browser);
    const page = await context.newPage();
    const problems = collectPageProblems(page, { label: 'page' });
    await useLiveApi(page, API_ORIGIN, { requestTimeoutMs: 180_000 });
    await signIn(page);
    const sessionA = await readRecord(page);

    const hold = await holdBrowserResponse(context, '/api/auth/refresh_token');
    // One authenticated request is refused, so the app asks for a rotation — with a *valid* TTL, so the
    // rotation it gets back is the last one. (An expired TTL refreshes again after every rotation, and
    // the case would measure a loop instead of a race.)
    await setConfig({ forced: { staleAccessOnce: true } });
    await page.goto('/#/profile');
    await waitForFixtureResponse('/api/user/profile', 401);

    // Barrier 1: the client is waiting on an answer, and the peer has not been asked yet. Parking it at
    // the peer instead would leave a lock lease running while the test does its slow work.
    await hold.waitForParked();
    expect(hold.parked().map((route) => new URL(route.request().url()).pathname),
      'the rotation must be parked at the browser').toEqual(['/api/auth/refresh_token']);
    expect((await apiRequests()).filter((entry) => entry.path === '/api/auth/refresh_token'),
      'and the peer must not have seen it yet').toEqual([]);

    // The record is origin-wide, so the successor is installed the only way it can really happen: the old
    // session is ended in another tab and a new sign-in commits over it. The peer is told *not* to revoke
    // on logout, which is the state a real deployment is in while a revoke has not propagated — and the
    // reason the answer that is about to arrive is a successful rotation rather than a 401.
    await setConfig({ forced: { revokeOnLogout: false } });
    const other = await context.newPage();
    const otherProblems = collectPageProblems(other, { label: 'other' });
    await useLiveApi(other, API_ORIGIN, { requestTimeoutMs: 180_000 });
    await other.goto('/');
    await waitForApp(other);
    await logoutViaUi(other);
    await waitForRecord(other, isState('ended'), 'ended');
    await waitForFixtureResponse('/api/auth/logout');

    await submitLoginForm(other, { email: 'second@example.test' });
    const sessionB = await readRecord(other);
    expect(sessionB.state).toBe('active');
    expect(sessionB.accessToken, 'B is a different credential').not.toBe(sessionA.accessToken);
    expect(sessionB.sessionId, 'and a different session').not.toBe(sessionA.sessionId);
    expect(sessionB.version, 'and its own write, not a shared one').toBeGreaterThan(sessionA.version);

    // Barrier 2: the answer is let go. Everything after this is measured from the peer's own log, and A's
    // bearer is legitimately on the request that provoked the rotation.
    const requestMark = (await apiRequests()).length;
    await hold.release();
    await waitForFixtureResponse('/api/auth/refresh_token', 200);

    // The late answer was a good one: the peer issued a successor for the session the record replaced.
    // Knowing that token is what makes the assertions below specific instead of hopeful.
    const live = (await control.sessions()).map((entry) => entry.refreshToken);
    const successor = live.filter((token) => token !== sessionB.refreshToken && token !== sessionA.refreshToken);
    expect(successor, 'the peer answered the late rotation with a live successor for the replaced session')
      .toHaveLength(1);
    const successorBearer = `Bearer ${String(successor[0]).replace(/^FAKE_REFRESH_/, 'FAKE_ACCESS_')}`;

    // Barrier 3: the record, polled. A refused late answer has nothing left to do, so the record settles.
    await expect.poll(async () => (await readRecord(other)).version, {
      timeout: 25_000,
      message: 'the record never settled after the late rotation answer'
    }).toBe(sessionB.version);

    const settled = await readRecord(other);
    expect(settled.state, 'the late rotation ended the session that replaced it').toBe('active');
    expect(settled.accessToken, 'or replaced its access token').toBe(sessionB.accessToken);
    expect(settled.refreshToken, 'or its refresh token').toBe(sessionB.refreshToken);
    expect(settled.sessionId, 'or its session').toBe(sessionB.sessionId);
    expect(settled.user, 'or its user').toEqual(sessionB.user);
    expect(settled.expiresAt, 'or its expiry').toBe(sessionB.expiresAt);
    expect(settled.refreshExpiresAt, 'or its refresh expiry').toBe(sessionB.refreshExpiresAt);

    // Request counts, from the peer's own log: one rotation, one revoke, one login per session. A
    // superseded predecessor must not buy a second rotation, and a refused late answer must not leave a
    // half-applied pair behind for the next request to adopt.
    const completed = await control.completed();
    const count = (path) => completed.filter((entry) => entry.path === path).length;
    expect(count('/api/auth/refresh_token'), 'the rotation was dispatched more than once').toBe(1);
    expect(count('/api/auth/logout'), 'the replaced session was really revoked at the client').toBe(1);
    expect(count('/api/auth/login'), 'and each session was signed in exactly once').toBe(2);

    // B keeps working with its own bearer, and after the answer landed neither the superseded bearer nor
    // the late successor is sent anywhere.
    await other.goto('/#/profile');
    await waitForApp(other);
    await expectSignedIn(other);
    await expect.poll(async () => (await apiRequests()).slice(requestMark).some((entry) => entry.authorization === `Bearer ${sessionB.accessToken}`),
      { timeout: 20_000, message: 'B never made a protected request with its own bearer' })
      .toBe(true);
    // The two auth calls that present the credential they operate on — the rotation that was parked, and
    // the revoke — are excluded: spending a credential at the endpoint that replaces or kills it is the
    // point of those calls. A protected read is a different matter.
    const afterMark = (await apiRequests()).slice(requestMark)
      .filter((entry) => !entry.path.startsWith('/api/auth/'));
    for (const [bearer, what] of [
      [`Bearer ${sessionA.accessToken}`, 'the superseded bearer'],
      [successorBearer, 'the late successor']
    ]) {
      const used = afterMark.filter((entry) => entry.authorization === bearer);
      expect(used, `${what} was sent after the late answer: ${JSON.stringify(used)}`).toEqual([]);
    }

    expect(guard.blocked, 'the guard blocked something in this case').toEqual([]);
    problems.allowError({ kind: 'console' }, /Failed to load resource|Network Error|401|Request failed|temporary|superseded|stale/i,
      'the tab that asked for the replaced session is refused by design, and axios logs that');
    problems.expectClean();
    otherProblems.expectClean();

    await context.close();
  });

  test('a logout queued behind a held lock still ends the session exactly once', async ({ browser }) => {
    const { context } = await guardedContext(browser);
    const first = await context.newPage();
    const problems = collectPageProblems(first, { label: 'first' });
    await useLiveApi(first);
    await signIn(first);
    const before = await readRecord(first);

    const holder = await context.newPage();
    await useLiveApi(holder);
    await holder.goto('/');
    await waitForApp(holder);
    await holdWriterLock(holder);

    // The revoke answer is held open, so once it is dispatched the test can sit in "received, not
    // answered" instead of guessing how long a revoke takes.
    await control.hold(['/api/auth/logout']);
    await logoutViaUi(first);

    // The end of the session is what waits: the app invalidates its memory up front and then needs the
    // writer lock to leave a tombstone. The browser reports that request as queued, which is the
    // barrier — the old version slept 800ms and called the absence of change "pending".
    await waitForWriterLockPending(first);
    expect((await readRecord(first)).state, 'the logout landed while the lock was held').toBe('active');
    expect((await readRecord(first)).version, 'and claimed a version it could not have written').toBe(before.version);

    // Release the lock: the tombstone lands, and only then is the revoke dispatched — so the request
    // being pending is a consequence of the end being pending, not the other way round.
    await releaseWriterLock(holder);
    await waitForRecord(first, isState('ended'), 'ended');
    await waitForFixtureRequest('/api/auth/logout');
    expect((await control.held()).waiting.map((entry) => entry.path),
      'the revoke must be held open, not merely in flight').toContain('/api/auth/logout');

    await control.release();
    await waitForFixtureResponse('/api/auth/logout');

    const after = await readRecord(first);
    expect(after.version, 'the queued logout wrote exactly once').toBe(before.version + 1);
    expect(after.state).toBe('ended');
    expect(after.accessToken).toBeNull();
    expect(await legacyTokens(first)).toEqual(noLegacyBearers);
    await expectSignedOut(first);

    // The revoke was a real one: the stand-in no longer holds the session, so a later rotation of the
    // same refresh token is refused the way a replay is.
    expect((await control.sessions()), 'the peer still believes the session is live').toEqual([]);

    const revocations = (await apiRequests()).filter((entry) => entry.path === '/api/auth/logout');
    expect(revocations, 'a queued logout is dispatched once').toHaveLength(1);
    problems.expectClean();

    await context.close();
  });

  test('a login that lands while an old logout is still settling owns the session, not the logout', async ({ browser }) => {
    // The race the previous suite never had: a logout has left its tombstone, its revoke is still in
    // flight, and a new sign-in completes before the old logout's `finally` runs. The last thing that
    // happened must win, and the losing side must not clear the winner.
    const { context } = await guardedContext(browser);
    const page = await context.newPage();
    const problems = collectPageProblems(page, { label: 'page' });
    await useLiveApi(page);
    await signIn(page);
    const firstSession = await readRecord(page);

    const holder = await context.newPage();
    await useLiveApi(holder);
    await holder.goto('/');
    await waitForApp(holder);
    await holdWriterLock(holder);

    await control.hold(['/api/auth/logout']);
    await logoutViaUi(page);
    await waitForWriterLockPending(page);
    await releaseWriterLock(holder);

    // The end has landed and the revoke is parked at the stand-in. The tab is signed out, and the
    // logout operation is still running.
    await waitForRecord(page, isState('ended'), 'ended');
    await waitForFixtureRequest('/api/auth/logout');
    await expectSignedOut(page);

    // A new sign-in through the real form, on the same page, while that logout is still in flight.
    await submitLoginForm(page, { email: 'second@example.test' });
    const secondSession = await readRecord(page);
    expect(secondSession.state).toBe('active');
    expect(secondSession.accessToken, 'the second sign-in is a different credential').not.toBe(firstSession.accessToken);
    expect(secondSession.sessionId, 'and a different login session').not.toBe(firstSession.sessionId);
    const mirrorAfterLogin = await legacyTokens(page);

    // Now the logout finishes: its `finally`, and anything its late answer triggers, must not touch
    // the session that replaced it.
    await control.release();
    await waitForFixtureResponse('/api/auth/logout');
    await waitForWriterLockFree(page);
    await expectSignedIn(page);

    const settled = await readRecord(page);
    expect(settled.state, 'the late logout ended the session that replaced it').toBe('active');
    expect(settled.accessToken, 'and replaced its token').toBe(secondSession.accessToken);
    expect(settled.sessionId).toBe(secondSession.sessionId);
    expect(settled.version, 'without inventing a version the app never wrote').toBe(secondSession.version);
    expect(await legacyTokens(page), 'the mirror still describes the surviving record')
      .toEqual(mirrorAfterLogin);
    // The stand-in's own view: the old credential is gone and the new one is live. Asserted by token,
    // not by the app's session id, because the peer names its sessions.
    const live = await control.sessions();
    expect(live, 'the stand-in revoked the old session and kept the new one')
      .toEqual([expect.objectContaining({ refreshToken: secondSession.refreshToken, accessToken: secondSession.accessToken })]);
    expect(live.map((entry) => entry.refreshToken)).not.toContain(firstSession.refreshToken);

    // A protected read after the dust settles must carry the *winner's* bearer, never the old one.
    await page.goto('/#/profile');
    await waitForApp(page);
    await expect.poll(async () => (await apiRequests()).some((entry) => entry.authorization === `Bearer ${secondSession.accessToken}`),
      { timeout: 20_000, message: 'no protected request carried the new session bearer' })
      .toBe(true);
    // The one place the ended bearer is still correct is the revoke itself — it must present the
    // credential it is revoking. Everywhere else, it is gone.
    const revokes = (await apiRequests()).filter((entry) => entry.path === '/api/auth/logout');
    expect(revokes.map((entry) => entry.authorization), 'the revoke presented the credential it revokes')
      .toEqual([`Bearer ${firstSession.accessToken}`]);
    const staleBearers = (await apiRequests())
      .filter((entry) => entry.authorization === `Bearer ${firstSession.accessToken}` && entry.path !== '/api/auth/logout');
    expect(staleBearers, `the ended session's bearer was sent again: ${JSON.stringify(staleBearers)}`).toEqual([]);

    problems.expectClean();
    await context.close();
  });

  for (const missing of ['writer serialization', 'session storage', 'storage access']) {
  test(`without ${missing} login is refused before sending credentials`, async ({ page }) => {
    // Deny the real browser capability before application modules load.
    await page.addInitScript(({ base, missing }) => {
      window.localStorage.setItem('api-base-url', base);
      window.localStorage.setItem('mock-api', 'false');
      if (missing === 'writer serialization') {
        Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
      } else if (missing === 'storage access') {
        Object.defineProperty(window, 'localStorage', {
          get() { throw new DOMException('denied', 'SecurityError'); }, configurable: true
        });
      } else {
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (this === window.localStorage) throw new DOMException('quota', 'QuotaExceededError');
          return setItem.call(this, key, value);
        };
      }
    }, { base: API_BASE, missing });

    await page.goto('/');
    await expect(page.locator('button[title]', { hasText: /login|đăng nhập/i }).first()).toBeVisible();
    await page.locator('button[title]', { hasText: /login|đăng nhập/i }).first().click();
    await page.locator('#email').fill('browser@example.test');
    await page.locator('#password').fill('fake-password');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-submit')).toBeVisible();
    await expect(page.locator('form')).toContainText(/Sign-in is unavailable|Không thể đăng nhập/i);
    expect((await apiRequests()).filter(r => r.path === '/api/auth/login')).toHaveLength(0);
    if (missing !== 'storage access') {
      expect(await readRecord(page)).toBeNull();
      expect(await legacyTokens(page)).toEqual(noLegacyBearers);
    }

    await page.reload();
    await expect(page.locator('button[title]', { hasText: /login|đăng nhập/i }).first()).toBeVisible();
    await expectSignedOut(page);
    if (missing !== 'storage access') expect(await readRecord(page)).toBeNull();
  });

  }

  test('a session whose write fails says so, instead of looking saved', async ({ page }) => {
    await useLiveApi(page);
    await signIn(page, { expired: true });
    const before = await readRecord(page);

    // A full quota, which is what this is in the wild. Web Locks are still available, so the app
    // believes the session is durable — and this tab is about to hold tokens that never reached the
    // record the other tabs read.
    await page.evaluate((key) => {
      const setItem = window.localStorage.setItem.bind(window.localStorage);
      window.localStorage.setItem = (name, value) => {
        if (name === key) throw new DOMException('quota', 'QuotaExceededError');
        setItem(name, value);
      };
    }, RECORD_KEY);

    // Any protected navigation takes the refresh path, and the rotation is the write that fails.
    await page.goto('/#/admin/dashboard');
    const banner = page.getByTestId('session-persistence-warning');
    await expect(banner).toBeVisible({ timeout: 25_000 });
    await expect(banner).toContainText(/saved|sign in again|lưu|đăng nhập lại|gespeichert|erneut anmelden|保存|再ログイン|저장|다시 로그인/i);

    // The record still holds the tokens from before the failure. That is the whole point of the
    // message: a silent success here would leave this tab authenticated with a refresh token the
    // backend has already replaced, and no way for the user to know.
    const after = await readRecord(page);
    expect(after.accessToken, 'a refused write must not appear to have landed').toBe(before.accessToken);
    expect(after.version, 'nor may it claim a new version').toBe(before.version);

    // A reload is where the disagreement becomes a signed-out user, and the banner is the warning
    // that was on screen beforehand.
    await page.reload();
    await waitForApp(page);
    await expectSignedOut(page);
  });

  test('a session is not carried over to a different API identity', async ({ browser }) => {
    const { context } = await guardedContext(browser);
    const first = await context.newPage();
    await useLiveApi(first);
    await signIn(first);
    await expectSignedIn(first);

    // The same server under a different origin string: a different API identity, which is what
    // pointing the app at another server looks like from inside a record.
    const second = await context.newPage();
    await useLiveApi(second, 'http://localhost:18788');
    await second.goto('/');
    await waitForApp(second);

    await expectSignedOut(second);
    // Whatever it does with the storage, it must not end up with a session for this origin.
    await waitForRecord(second, noUsableSession);
    const foreign = await readRecord(second);
    if (foreign !== null) {
      expect(foreign.state, 'a token minted for another origin is never adopted').not.toBe('active');
      expect(foreign.accessToken).toBeNull();
    }

    // Scope: this covers the read path — a record bound to another origin is never adopted. It is not
    // a state the app's own settings can produce, because `api-base-url` is one origin-wide setting,
    // so a per-tab endpoint is only reachable from a test. What a real endpoint switch does is
    // covered by the store's own identity-change tests; asserting a claim about a tab that keeps a
    // stale in-memory session here would be asserting a configuration nothing can reach.
    await context.close();
  });

  test('a record that is not a session at all is refused, and the tab asks to sign in again', async ({ page }) => {
    await useLiveApi(page);
    // A record in the shape the old code wrote: milliseconds, one token for both, no binding. The
    // validator has to refuse it rather than adopt a session it cannot vouch for.
    await page.addInitScript((key) => {
      const nowMs = Date.now();
      window.localStorage.setItem(key, JSON.stringify({
        schemaVersion: 1,
        identity: window.localStorage.getItem('api-base-url'),
        sessionId: 'sid_broken',
        version: 1,
        state: 'active',
        user: { id: 1, email: 'x@example.test', role: 'admin' },
        accessToken: 'FAKE_SAME_TOKEN',
        refreshToken: 'FAKE_SAME_TOKEN',
        expiresAt: nowMs + 3600_000,
        refreshExpiresAt: nowMs + 259_200_000
      }));
    }, RECORD_KEY);

    await page.goto('/');
    await waitForApp(page);
    await expectSignedOut(page);

    // Whatever the app leaves behind, it must not be a usable session: no `active`, no token, nothing
    // for the next request to send.
    await waitForRecord(page, noUsableSession);
    const left = await readRecord(page);
    if (left !== null) {
      // Clearing the unusable record is a legitimate decision; adopting it is not.
      expect(left.state).not.toBe('active');
      expect(left.accessToken).toBeNull();
      expect(left.refreshToken).toBeNull();
    }
    expect(await legacyTokens(page), 'and no bearer is left behind').toEqual(noLegacyBearers);
  });

  test('an endpoint switched in another tab is adopted, and the old server\'s session does not follow it', async ({ browser }) => {
    // F03. The API endpoint is a browser-local preference, so one tab may point the whole origin at a
    // different server while another tab is mid-session. Two things have to be true at once: a tab that
    // did not make the change has to *adopt* it, and the credential the previous server issued has to
    // stop being used. A session is a credential of one server; sending it to the next one is how a
    // user ends up apparently signed in to a backend that has never heard of them.
    const { context, guard } = await guardedContext(browser);
    // Two origins, one server: `127.0.0.1` and `localhost` are different origins to the browser, so
    // this is a real endpoint change — new identity, new CORS origin — without a second fake backend.
    // Both are covered by the guard's fixture origins, which enumerate the loopback names rather than
    // opening the run to any host: there used to be an `allow(origin)` escape hatch here, and an
    // escape hatch on an allowlist is the same hole with a nicer name (FA8-03).
    const otherOrigin = API_BASE.replace('127.0.0.1', 'localhost');
    expect(guard.policy.reasonFor(`${otherOrigin}/api/auth/session`), 'the switched endpoint is a fixture origin')
      .toBeNull();

    const first = await context.newPage();
    const firstProblems = collectPageProblems(first, { label: 'first' });
    await useLiveApi(first);
    await signIn(first);
    const session = await readRecord(first);
    expect(session.state).toBe('active');
    expect(session.identity).toBe(API_BASE);

    // The switch happens in a second tab, through the settings UI, exactly as a user does it. The tab
    // never signs in: it shares the origin, so it already holds the session the first tab signed in
    // with, which is exactly what makes the switch interesting.
    const second = await context.newPage();
    const secondProblems = collectPageProblems(second, { label: 'second' });
    await useLiveApi(second);
    await second.goto('/#/settings');
    await waitForApp(second);
    await expectSignedIn(second);
    await second.getByRole('button', { name: /system/i }).first().click();

    const endpoint = second.locator('input[type="url"]').first();
    await endpoint.waitFor({ state: 'visible', timeout: 20_000 });
    await endpoint.fill(otherOrigin);
    // Scoped to the panel the endpoint input lives in: the settings page has a save action per tab, and
    // "the save button" is not a thing this page has.
    const systemPanel = second.locator('section').filter({ has: endpoint }).last();
    await systemPanel.getByRole('button', { name: /save/i }).click();

    // Barrier: the save really reached storage before anything is claimed about it. Deliberately not
    // the adoption proof: `api-base-url` lives in `localStorage`, which tabs of one origin share, so
    // reading it back only proves that somebody saved the preference.
    await expect.poll(async () => readApiBaseUrl(first), { timeout: 20_000,
      message: 'the endpoint was never saved' })
      .toBe(otherOrigin);

    // The per-tab proof of adoption, in the tab's own in-memory state. The module read here is the one
    // the auth store subscribes to, so this is the identity that decides whether a session survives —
    // and it cannot be faked by a tab that merely read the shared preference back. It is also the
    // assertion that a second copy of the identity singleton would fail: such a copy reports the old
    // identity here forever, while this tab's own session is dropped by whoever else changed it.
    const tabIdentity = (page) => page.evaluate(async () => {
      const identity = await import('/assets/js/api/apiIdentity.js');
      return identity.getApiIdentity();
    });
    await expect.poll(async () => tabIdentity(first), { timeout: 20_000,
      message: 'the other tab never adopted the new identity' })
      .toBe(otherOrigin);

    // The consequence, in the tab that did not make the change: a session of the previous server does
    // not survive there. The route change is a real user action, not a sleep — it is the moment the app
    // re-reads its own state and answers "is this record still mine?".
    await first.goto('/#/');
    await waitForApp(first);
    const switchedAt = (await apiRequests()).length;
    await first.goto('/#/profile');
    await waitForApp(first);
    await expectSignedOut(first);

    // And the credential the previous server issued is not spent against the new one, checked where a
    // leak would actually happen: on the wire, not in the state a tab displays. The filter is the old
    // bearer itself, so an unauthenticated read or a 401 cannot stand in for the thing being checked.
    const afterSwitch = (await apiRequests()).slice(switchedAt);
    const leaked = afterSwitch.filter((entry) => entry.authorization === `Bearer ${session.accessToken}`);
    expect(leaked, `the old server's bearer was sent after the endpoint changed: ${JSON.stringify(leaked)}`)
      .toEqual([]);

    // Nothing this tab sends any more is authenticated as the old server, to either one. The profile
    // read is gated rather than attempted, so the honest claim is the absence of a bearer, not the
    // presence of a particular request.
    const bearers = afterSwitch.filter((entry) => entry.authorization);
    expect(bearers, `a bearer left the switched tab: ${JSON.stringify(bearers)}`).toEqual([]);
    expect(await legacyTokens(first),
      'and the previous server\'s tokens are not left sitting in the tab').toEqual(noLegacyBearers);

    // Finally the user-visible half: a session belonging to the previous server does not survive a
    // reload against the new endpoint. The reload points the tab at the new origin for real, so what is
    // being asserted is the app's answer to "is this record mine?", not a flag the old tab left behind.
    await useLiveApi(first, otherOrigin);
    await first.goto('/');
    await waitForApp(first);
    await expectSignedOut(first);
    expect(await readApiBaseUrl(first)).toBe(otherOrigin);

    await waitForRecord(first, noUsableSession);
    const left = await readRecord(first);
    if (left !== null) {
      expect(left.state, 'a session of the previous server may not stay active').not.toBe('active');
      expect(left.accessToken).toBeNull();
      expect(left.refreshToken).toBeNull();
    }
    expect(await legacyTokens(first), 'and no bearer of the old server is left behind').toEqual(noLegacyBearers);

    // Two kinds of noise, both caused by the test's own navigation rather than by the app, and declared
    // separately because they are different things. An axios refusal is a *console* error; a lazy chunk
    // the router abandoned is a *failed request*. One pattern covering both — the previous
    // `/…|CORS/i` — also covered an uncaught page error that merely contained the same word, so a real
    // uncaught exception in this case would have been excused (FA8-04). The abort is scoped to the
    // static origin so it cannot stand in for a request the app really failed to make.
    const refusedRead = { kind: 'console', count: [0, 1] };
    const refusedReadNoise = /Failed to load resource|Network Error|401|Request failed/i;
    const abandonedChunk = { kind: 'requestfailed', url: /\/vue\//, count: [0, Infinity] };
    const abandonedChunkNoise = /net::ERR_ABORTED/;
    firstProblems.allowError(refusedRead, refusedReadNoise, 'protected reads are refused once there is no session');
    firstProblems.allowError(abandonedChunk, abandonedChunkNoise, 'navigating to the new endpoint aborts the chunk the router had already asked for');
    secondProblems.allowError(refusedRead, refusedReadNoise, 'the same, for the tab that switched the endpoint while signed in');
    secondProblems.allowError(abandonedChunk, abandonedChunkNoise, 'and the same navigation, in the tab that made the change');
    firstProblems.expectClean();
    secondProblems.expectClean();
    expect(guard.blocked, 'the guard blocked something in this case').toEqual([]);
    await context.close();
  });
});
