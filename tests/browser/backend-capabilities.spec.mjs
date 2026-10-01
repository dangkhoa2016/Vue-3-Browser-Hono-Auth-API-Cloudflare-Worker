/**
 * The backend contract against a **prepared backend** — opt-in, and separate from the default run.
 *
 * What is different from `backend-contract-mock.spec.mjs`: that suite asks whether the *client* fails
 * closed when the backend is silent, and needs nothing but a peer it can configure. This one asks
 * whether the *real* backend supports a capability, and the only honest way to answer that is to ask
 * the real backend. So it needs a running backend and an owner-approved session, and it is skipped —
 * never reported as a pass — without one. `npm --prefix tests run test:browser` does not run it.
 *
 * The seeding is in `helpers/integration-session.mjs`, and it is the *product's* validator that
 * decides whether it worked. It used to live here, and it was wrong in three ways that a skipped
 * suite hid completely:
 *   - the `addInitScript` callback read the module-scope `RECORD_KEY`, which does not exist in the
 *     page realm, so the fixture raised `ReferenceError` and seeded nothing;
 *   - it wrote `schemaVersion: 1` while the validator accepts only 2, so the record it wrote was
 *     `invalid` even when the callback did run;
 *   - it reduced the API identity to a bare origin, losing the base path the record is validated
 *     against, and it navigated `/admin/...` while the router uses hash history.
 * The validator was not relaxed to accommodate any of them; `tests/regression/integration-fixture.test.mjs`
 * proves the fixture against the product's own reader offline, and a 404-routed page is no longer
 * treated as a session that loaded.
 *
 * A READY manifest is required and is not inferred from a production environment note. Missing means
 * this run is *pending* and is reported as pending; provided but unusable means the run **fails**,
 * because skipping a broken fixture is how a real defect gets to hide behind a green line.
 *
 * @see playwright.integration.config.mjs for how this is run.
 * @see helpers/integration-session.mjs for the fixture.
 */

import { test, expect } from '@playwright/test';

import {
  buildSeedArgs,
  FRONTEND_BASE_URL,
  readIntegrationFixture,
  seedSessionScript,
  SESSION_RECORD_KEY,
  SESSION_SCHEMA_VERSION
} from './helpers/integration-session.mjs';

const BASE_URL = FRONTEND_BASE_URL;
const READY = readIntegrationFixture();
const LEGACY_KEYS = ['user', 'token', 'expires_at', 'refresh_token', 'refresh_expires_at'];

/**
 * This suite must never talk to the loopback fake API. `playwright.integration.config.mjs` sets this
 * explicitly, and the fixture refuses to seed if it is on, so a mock cannot be recorded as a backend.
 */
const MOCK_API = String(process.env.FRONTEND_MOCK_API ?? 'false');

// Hash history, per assets/js/router.js. Every route below exists in that table.
const PAGE_ROUTES = {
  advancedAudit: '/admin/advanced-audit?tab=compliance',
  monitoring: '/admin/monitoring',
  envComparison: '/admin/kv/env-comparison'
};

const openPage = (page, route) => page.goto(`${BASE_URL}/#${route}`, { waitUntil: 'networkidle' });

/**
 * Writes a record the app's own validator accepts, and nothing else: no hand-written mirror, because
 * a mirror that disagrees with the record is one of the bugs this project is about.
 *
 * The callback and its argument both come from the fixture helper. The callback carries no closure —
 * the page realm has none of this module's bindings — which is asserted offline by
 * `tests/regression/integration-fixture.test.mjs` rather than hoped for.
 */
async function seedSession(page) {
  if (MOCK_API !== 'false') {
    throw new Error(`integration must run against a prepared backend, but FRONTEND_MOCK_API=${MOCK_API}`);
  }
  const args = buildSeedArgs({
    apiBaseUrl: READY.fixture.apiBaseUrl,
    user: READY.fixture.user,
    accessToken: READY.fixture.accessToken,
    refreshToken: READY.fixture.refreshToken,
    sessionId: READY.fixture.sessionId
  });
  await page.addInitScript(seedSessionScript, args);
  return args;
}

test.describe('backend capability contract surfaced in the UI', () => {
  // A fixture that was provided and is unusable is a failure. Only an absent one is a pending run,
  // and a pending run says so in its name so it cannot be counted as coverage.
  test.skip(READY.missing.length > 0 && READY.invalid.length === 0, `PENDING: missing ${READY.missing.join(', ')}`);

  test('the integration fixture is usable', () => {
    expect(READY.invalid, `invalid READY manifest: ${READY.invalid.join(' | ')}`).toEqual([]);
    expect(READY.ready, 'this suite must not run without a complete READY manifest').toBe(true);
  });

  test.beforeEach(async ({ page }) => {
    expect(READY.invalid, `invalid READY manifest: ${READY.invalid.join(' | ')}`).toEqual([]);
    expect(READY.ready, `incomplete READY manifest: ${READY.missing.join(', ')}`).toBe(true);
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
    page.consoleErrors = consoleErrors;
    await seedSession(page);
  });

  test('the seeded session is one the app actually adopts', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('#app')).toBeVisible();

    const record = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || 'null'), SESSION_RECORD_KEY);
    expect(record, 'the record survived the app reading it').toBeTruthy();
    expect(record.state).toBe('active');
    expect(record.schemaVersion).toBe(SESSION_SCHEMA_VERSION);
    expect(record.accessToken).toBe(READY.fixture.accessToken);
    expect(record.identity).toBe(READY.fixture.apiBaseUrl);
    // The mirror, if the app wrote one, agrees with the record rather than leading it.
    const legacy = await page.evaluate(
      (keys) => Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(key)])),
      LEGACY_KEYS
    );
    if (legacy.token !== null) expect(legacy.token).toBe(record.accessToken);
  });

  test('app boots with pinned CDN dependencies and no runtime error', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(page.consoleErrors, `console errors: ${page.consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('unsupported PDF export is disabled with a reason instead of a false success', async ({ page }) => {
    await openPage(page, PAGE_ROUTES.advancedAudit);

    const pdfButton = page.locator('button:has(i.bi-file-earmark-pdf)').first();
    await expect(pdfButton).toBeVisible();
    await expect(pdfButton).toBeDisabled();

    const reason = await pdfButton.getAttribute('title');
    expect(reason, 'a disabled export must explain why it cannot run').toBeTruthy();
    expect(reason).toMatch(/not verified|not supported|not confirmed|chưa xác minh|không hỗ trợ/i);
  });

  test('env comparison never renders an undisclosed secret value', async ({ page }) => {
    await openPage(page, PAGE_ROUTES.envComparison);
    await expect(page.locator('body')).toContainText(/not disclosed|không tiết lộ/i);

    const body = await page.locator('body').innerText();
    const leaks = body.split('\n')
      .filter((line) => /:\s*\S{6,}$/.test(line) && !/not disclosed|masked|configured|không tiết lộ/i.test(line));
    expect(leaks, `possible raw value rendered: ${leaks.join(' | ')}`).toEqual([]);
  });

  test('continuous monitoring stays unconfirmed when the backend does not confirm it', async ({ page }) => {
    await openPage(page, PAGE_ROUTES.monitoring);

    const startButton = page.locator('button:has(i.bi-play-fill)').first();
    const stopButton = page.locator('button:has(i.bi-stop-fill)').first();

    if (await startButton.count()) {
      await expect(startButton).toBeDisabled();
      expect(await startButton.getAttribute('title'), 'a refused start must say why').toBeTruthy();
    } else {
      // Monitoring is already running, so the start control is legitimately replaced.
      await expect(stopButton).toBeVisible();
    }
  });
});
