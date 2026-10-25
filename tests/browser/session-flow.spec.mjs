/**
 * The session lifecycle in a real browser, against the real CDN bundles and a loopback API.
 *
 * Everything the Node suites assert about a stand-in axios, a stand-in `localStorage` and a
 * stand-in `BroadcastChannel` is asserted here against the real thing: a real Chromium, the real
 * `localStorage` (so a `storage` event really fires in the other tab), the real `BroadcastChannel`,
 * and the real session record the app writes.
 *
 * No credentials: the fake API issues fake tokens for any password but "wrong", and one path
 * deliberately answers with the validation envelope the FA-03 probe sent.
 *
 * The guard, the page-problem collector and the session helpers are shared with the other specs
 * (helpers/browser-fixture.mjs), so a case here is not quietly running without egress protection or
 * with a different definition of "the record" than the invariants suite uses.
 */

// The shared fixture, not Playwright's: it installs the egress guard on the context before any
// page exists and fails the run if the guard refused something (FA8-03).
import { test, expect } from './fixtures.js';

import {
  API_ORIGIN,
  RECORD_KEY,
  collectPageProblems,
  control,
  expectSignedIn,
  expectSignedOut,
  installStorageWatcher,
  isState,
  logoutViaUi,
  newGuardedContext,
  noLegacyBearers,
  readLegacyKeys,
  readSessionRecord,
  signIn,
  signedInUser,
  submitLoginForm,
  useLiveApi,
  waitForApp,
  waitForRecord,
} from './helpers/browser-fixture.mjs';

const apiRequests = () => control.requests();

/** Opens the login modal through the navbar, as a user does. */
async function openLoginModal(page) {
  const loginButton = page.locator('button[title]', { hasText: /login|đăng nhập/i }).first();
  await loginButton.waitFor({ state: 'visible', timeout: 30_000 });
  await loginButton.click();
  await page.locator('#email').waitFor({ state: 'visible', timeout: 15_000 });
}

/** The FA-03 probe needs the password the stand-in answers with validation errors. */
async function submitRejectedLogin(page) {
  await page.locator('#email').fill('browser@example.test');
  await page.locator('#password').fill('wrong');
  await page.getByTestId('login-submit').click();
}

/**
 * Waits until the peer agrees the session is gone, so the assertions after it are about a logout that
 * finished rather than one that happens to have written a tombstone.
 */
async function waitForPeerToEndTheSession() {
  await expect.poll(async () => (await control.sessions()).length, {
    timeout: 20_000,
    message: 'the stand-in still considers the session live'
  }).toBe(0);
}

test.describe('the session record in a real browser', () => {
  test.beforeEach(async () => {
    // Readiness first: a control plane that answers is a precondition, not an assumption.
    const ready = await control.ready();
    expect(ready.ok, 'the loopback stand-in must be up before any case runs').toBe(true);
    await control.reset();
  });

  test('API explorer replaces loading with a sign-in prompt after login is dismissed', async ({ page }) => {
    await useLiveApi(page);
    await page.addInitScript(() => localStorage.setItem('user-locale', 'en'));
    await page.goto('/#/api-info');
    const dialog = page.getByRole('dialog', { name: 'Login', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: 'Login required', exact: true })).toBeVisible();
    await expect(main.getByText('Please login to view role-based endpoints.', { exact: true })).toBeVisible();
    await expect(main.locator('.animate-pulse')).toHaveCount(0);
    const signInButton = main.getByRole('button', { name: /Login/ });
    await expect(signInButton).toBeVisible();
    expect((await apiRequests()).filter(request => request.path === '/api')).toHaveLength(0);

    await signInButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(main.getByRole('heading', { name: 'Login required', exact: true })).toBeVisible();
    await signInButton.click();
    await submitLoginForm(page);
    await expect(main.getByRole('heading', { name: 'Role-based API Explorer', exact: true })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Login required', exact: true })).toHaveCount(0);
    await expect(main.locator('.animate-pulse')).toHaveCount(0);
    expect((await apiRequests()).filter(request => request.path === '/api' && request.method === 'GET')).toHaveLength(1);
  });

  test('API explorer loads once per login, including a later login after logout', async ({ page }) => {
    await useLiveApi(page);
    await page.addInitScript(() => localStorage.setItem('user-locale', 'en'));
    await page.goto('/#/api-info');
    const dialog = page.getByRole('dialog', { name: 'Login', exact: true });
    const main = page.locator('main');
    const content = main.getByRole('heading', { name: 'Role-based API Explorer', exact: true });
    await expect(dialog).toBeVisible();
    await submitLoginForm(page);
    await expect(dialog).toHaveCount(0);
    await expect(content).toBeVisible();
    expect((await apiRequests()).filter(request => request.path === '/api' && request.method === 'GET')).toHaveLength(1);

    await logoutViaUi(page);
    await expect(main.getByRole('heading', { name: 'Login required', exact: true })).toBeVisible();
    await main.getByRole('button', { name: /Login/ }).click();
    await submitLoginForm(page);
    await expect(dialog).toHaveCount(0);
    await expect(content).toBeVisible();
    expect((await apiRequests()).filter(request => request.path === '/api' && request.method === 'GET')).toHaveLength(2);
  });

  test('a login through the real form writes one canonical record and a matching mirror', async ({ browser }) => {
    const { context, guard } = await newGuardedContext(browser);
    const page = await context.newPage();
    const problems = collectPageProblems(page, { label: 'page' });
    await useLiveApi(page);
    await page.goto('/');
    await waitForApp(page);
    await openLoginModal(page);
    await submitLoginForm(page);

    await waitForRecord(page, isState('active'), 'active');

    const record = await readSessionRecord(page);
    expect(record.state).toBe('active');
    expect(record.sessionId).toBeTruthy();
    expect(record.accessToken).toBeTruthy();
    expect(record.identity).toBe(API_ORIGIN);
    expect(Number.isInteger(record.version)).toBe(true);
    await expectSignedIn(page);

    // The per-key mirror older code reads must agree with the record, never lead it. The user mirror
    // holds the serialised user, so it is compared as what it is rather than as an email string.
    const mirror = await readLegacyKeys(page);
    expect(JSON.parse(mirror.user), 'the user mirror is the record\'s user').toEqual(record.user);
    expect({ ...mirror, user: undefined }).toEqual({
      user: undefined,
      token: record.accessToken,
      expires_at: String(record.expiresAt),
      refresh_token: record.refreshToken,
      refresh_expires_at: String(record.refreshExpiresAt),
    });

    problems.expectClean();
    expect(guard.blocked, 'the guard blocked something in this case').toEqual([]);
    await context.close();
  });

  test('a rejected login renders the field errors instead of crashing the form (FA-03)', async ({ browser }) => {
    const { context } = await newGuardedContext(browser);
    const page = await context.newPage();
    const problems = collectPageProblems(page, { label: 'page' });
    await useLiveApi(page);
    await page.goto('/');
    await waitForApp(page);
    await openLoginModal(page);
    await submitRejectedLogin(page);

    // The envelope carries `field` on every entry. The old read was `error.field`, which threw from
    // the render path and took the validation list down with it.
    await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/too short/i)).toBeVisible();

    // The form is still usable afterwards: the failure is reported, not fatal.
    await expect(page.locator('#email')).toBeEditable();
    expect((await readSessionRecord(page))?.state ?? null).toBeNull();

    problems.allowError({ kind: 'console' }, /Failed to load resource|Network Error|422|Request failed/i,
      'the stand-in refused this login with the validation envelope on purpose, which axios logs as an error');
    problems.expectClean();
    await context.close();
  });

  test('a logout writes a tombstone and clears the legacy keys', async ({ browser }) => {
    const { context } = await newGuardedContext(browser);
    const page = await context.newPage();
    const problems = collectPageProblems(page, { label: 'page' });
    await useLiveApi(page);
    await signIn(page);

    // The identity that is being ended is named before it is gone: a logout that ends *some* session
    // still satisfies "the record says ended".
    const before = await readSessionRecord(page);
    const who = await signedInUser(page);
    expect(who.email, 'the tab is signed in as the session it is about to end').toBe(before.user.email);

    // The navbar asks for confirmation first, and the warning banner afterwards says what really
    // happened with the revocation; the session is gone either way.
    await logoutViaUi(page);

    await waitForRecord(page, isState('ended'), 'ended');
    await expectSignedOut(page);

    const record = await readSessionRecord(page);
    expect(record.state).toBe('ended');
    expect(record.accessToken).toBeNull();
    expect(record.refreshToken).toBeNull();
    expect(record.sessionId, 'the tombstone names the lifecycle it ends').toBe(before.sessionId);
    expect(record.version, 'and it is a new version of that lifecycle, not a new one').toBe(before.version + 1);
    // A bearer from a session that has ended must not survive anywhere the old code can read it.
    expect(await readLegacyKeys(page), 'a bearer must not survive an ended session').toEqual(noLegacyBearers);

    problems.expectClean();
    await context.close();
  });

  test('a second tab learns about the logout without writing a tombstone of its own', async ({ browser }) => {
    const { context } = await newGuardedContext(browser);
    const first = await context.newPage();
    const firstProblems = collectPageProblems(first, { label: 'first' });
    await useLiveApi(first);
    await signIn(first);
    const versionBefore = (await readSessionRecord(first)).version;

    // A second tab of the same origin, sharing localStorage and the channel. It counts the storage
    // events it receives, so "it has finished reacting" is an observed state rather than a sleep.
    const second = await context.newPage();
    const secondProblems = collectPageProblems(second, { label: 'second' });
    const watcher = await installStorageWatcher(second);
    await useLiveApi(second);
    await second.goto('/');
    await waitForApp(second);
    await waitForRecord(second, isState('active'), 'active');

    await logoutViaUi(first);
    // Two different facts, and neither one implies the other: the peer has to have finished revoking,
    // and *this* tab has to have adopted the tombstone. Waiting only for the peer would read the record
    // before the tab that is under test had reacted, and call the result a failure.
    await waitForPeerToEndTheSession();
    await waitForRecord(second, isState('ended'), 'ended');

    // The other tab observes the tombstone. It must not raise the version itself: adoption is a
    // read, and a write here is what turns two tabs into a write loop.
    const after = await readSessionRecord(second);
    expect(after.state).toBe('ended');
    expect(after.version, 'the observing tab must not write').toBe(versionBefore + 1);
    expect(await watcher.count(RECORD_KEY), 'and it really heard the event, so this is not a timing accident')
      .toBeGreaterThan(0);
    await expectSignedOut(second);
    expect(await readLegacyKeys(second), 'a bearer must not survive an ended session').toEqual(noLegacyBearers);

    // The part a sleep cannot prove: once this tab has reacted, doing protected work must not
    // resurrect the session. A tab that kept the old bearer would send it here, and a tab that
    // "helpfully" re-wrote the record would raise the version.
    const writesBefore = (await apiRequests()).length;
    await second.goto('/#/profile');
    await waitForApp(second);
    await expectSignedOut(second);

    const ended = await readSessionRecord(second);
    expect(ended.state, 'protected work after another tab signed out must not restore a session')
      .toBe('ended');
    expect(ended.version, 'and it must not rewrite the record to say so').toBe(versionBefore + 1);

    const staleBearers = (await apiRequests())
      .slice(writesBefore)
      .filter((entry) => entry.authorization && entry.authorization !== 'Bearer null');
    expect(staleBearers, `the ended session's bearer was sent again: ${JSON.stringify(staleBearers)}`).toEqual([]);

    firstProblems.expectClean();
    // Whether the refused read logs at all is the browser's mood, not the app's contract: one run can
    // end without any API call after the logout, and the case cannot depend on a log line it does not
    // control. What *is* the contract: never two, and never any other shape of problem.
    secondProblems.allowError({ kind: 'console', count: [0, 1] }, /Failed to load resource|Network Error|401|Request failed/i,
      'the one profile read this tab is no longer allowed to make is refused, and axios logs that when the browser feels like it');
    secondProblems.expectClean();
    await context.close();
  });
});
