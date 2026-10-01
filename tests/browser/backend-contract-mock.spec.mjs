/**
 * The backend contract, proven in a real browser, with no owner credentials and no backend.
 *
 * `backend-capabilities.spec.mjs` answers a different question: "does the real backend support this".
 * That one legitimately needs a prepared backend and an owner-approved session, and it is skipped
 * without one. But its assertions are mostly about the **client** — that an unconfirmed capability
 * fails closed, that a disabled export explains itself instead of reporting a false success, that a
 * secret value never reaches the DOM, and that unconfirmed monitoring stays unconfirmed. None of that
 * needs a backend, and a skipped suite is not evidence for any of it.
 *
 * So this suite drives the same pages against the loopback stand-in, which is told what to answer
 * through `/__fake/config`. The default answer is "the backend said nothing", the state that has to
 * fail closed. A test then supplies a real answer and the control has to follow it — which is what
 * makes the default meaningful instead of a stub that always says yes.
 */

// The shared fixture, not Playwright's: it installs the egress guard on the context before any
// page exists and fails the run if the guard refused something (FA8-03).
import { test, expect } from './fixtures.js';

const API_BASE = `http://127.0.0.1:${process.env.FRONTEND_API_PORT || 18788}`;
const RECORD_KEY = 'auth-session-record';

// Hash history, per assets/js/router.js. The compliance tab is deep-linked, which is the barrier that
// replaces a sleep: the report is requested by navigation, not by hoping a timer fired.
const PAGES = {
  advancedAuditCompliance: '/admin/advanced-audit?tab=compliance',
  monitoring: '/admin/monitoring',
  envComparison: '/admin/kv/env-comparison'
};

// The control plane is a plain loopback call: it needs no browser context, and it cannot be confused
// with something the page did.
const control = (path, patch = {}) => fetch(`${API_BASE}${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(patch)
});

const setConfig = async (patch) => {
  const response = await control('/__fake/config', patch);
  expect(response.ok, `the fake API refused the config patch: ${await response.text()}`).toBe(true);
};

const apiRequests = async () => (await (await fetch(`${API_BASE}/__fake/requests`)).json()).requests;

const readRecord = (page) => page.evaluate((key) => {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}, RECORD_KEY);

/**
 * Signs in through the real form, so the page is authenticated the way a user authenticates: with a
 * session the app wrote itself, under the real writer lock, and with a `user` the app can gate on.
 */
async function signIn(page, { role = 'admin' } = {}) {
  await setConfig({ userRole: role });
  await page.addInitScript((apiBase) => {
    window.localStorage.setItem('api-base-url', apiBase);
    window.localStorage.setItem('mock-api', 'false');
  }, API_BASE);

  await page.goto('/');
  await page.waitForFunction(() => window.localStorage.getItem('api-base-url') !== null, null, { timeout: 45_000 });

  const loginButton = page.locator('button[title]', { hasText: /login|đăng nhập/i }).first();
  await loginButton.waitFor({ state: 'visible', timeout: 30_000 });
  await loginButton.click();
  await page.locator('#email').fill('browser@example.test');
  await page.locator('#password').fill('fake-password');
  await page.getByTestId('login-submit').click();

  await page.waitForFunction(
    (key) => JSON.parse(window.localStorage.getItem(key) || 'null')?.state === 'active',
    RECORD_KEY,
    { timeout: 20_000 }
  );
}

const pdfButton = (page) => page.locator('button:has(i.bi-file-earmark-pdf)').first();
const startButton = (page) => page.locator('button:has(i.bi-play-fill)').first();

const waitForRecordState = (page, state) => page.waitForFunction(
  ({ key, expected }) => JSON.parse(window.localStorage.getItem(key) || 'null')?.state === expected,
  { key: RECORD_KEY, expected: state },
  { timeout: 20_000 }
);

test('profile remount fetches the current response after its store counter has advanced',async({page})=>{
  await control('/__fake/reset');await signIn(page);
  let revision=1,requests=0;
  await page.route('**/api/user/profile',async route=>{
    if(route.request().method()!=='GET')return route.continue();
    requests++;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{id:1,email:'browser@example.test',full_name:`R11 profile revision ${revision}`,role:'admin',status:'active',created_at:'2026-01-01T00:00:00Z'}})});
  });
  await page.goto('/#/profile');
  await expect(page.getByText('R11 profile revision 1',{exact:true}).first()).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByText('R11 profile revision 1',{exact:true})).toHaveCount(0);
  revision=2;
  await page.goto('/#/profile');
  await expect(page.getByText('R11 profile revision 2',{exact:true}).first()).toBeVisible();
  expect(requests).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(()=>Pinia.getActivePinia()._s.get('profile').loadingProfile)).toBe(false);
});


