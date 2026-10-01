/**
 * Seed smoke: does the *fixture* produce a session the app actually adopts, in a real browser?
 *
 * This is **fixture validation, not an integration pass**. It runs against the loopback fake API with
 * fake credentials, so it can say that the seeding mechanism, the canonical record and the app's boot
 * path agree with each other. It cannot say anything about a real backend, and it is not a substitute
 * for `backend-capabilities.spec.mjs` — that suite asks a question only a prepared backend can answer.
 *
 * It exists because the previous fixture seeded `schemaVersion: 1` behind a `ReferenceError`, and the
 * only suite that used it skipped itself. Every assertion below would have failed there; here it
 * cannot, because it needs no backend and therefore always runs.
 *
 * @see helpers/integration-session.mjs
 */

// The shared fixture, not Playwright's: it installs the egress guard on the context before any
// page exists and fails the run if the guard refused something (FA8-03).
import { test, expect } from './fixtures.js';

import {
  API_BASE_URL_KEY,
  buildSeedArgs,
  FRONTEND_BASE_URL,
  MOCK_API_KEY,
  seedSessionScript,
  SESSION_RECORD_KEY,
  SESSION_SCHEMA_VERSION
} from './helpers/integration-session.mjs';

const API_BASE_URL = process.env.FRONTEND_API_BASE_URL || 'http://127.0.0.1:18788';
const USER = { id: 4242, email: 'seed-smoke@example.test', name: 'Seed Smoke', role: 'admin' };
const ACCESS_TOKEN = 'FAKE_ACCESS_SEED_SMOKE';
const REFRESH_TOKEN = 'FAKE_REFRESH_SEED_SMOKE';
const SESSION_ID = 'sid_seed_smoke';

const buildArgs = (overrides = {}) => buildSeedArgs({
  apiBaseUrl: API_BASE_URL,
  user: USER,
  accessToken: ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
  sessionId: SESSION_ID,
  epochSeconds: Math.floor(Date.now() / 1000),
  // The loopback fake API is the peer for this run, and the app's mock switch is stated rather than
  // inherited: unset means the app's own default, which happens to be "on" for the wrong reason.
  mockApi: 'true',
  ...overrides
});

test.describe('integration seed smoke (fixture validation, not an integration pass)', () => {
  test('the app adopts a seeded record and shows the seeded user', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`);
    });

    await page.addInitScript(seedSessionScript, buildArgs());
    await page.goto(FRONTEND_BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#app')).toBeVisible();

    // The record is still the one the fixture wrote, at the version the product reads.
    const record = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) || 'null'),
      SESSION_RECORD_KEY
    );
    expect(record, 'the app did not discard the seeded record').toBeTruthy();
    expect(record.schemaVersion).toBe(SESSION_SCHEMA_VERSION);
    expect(record.state).toBe('active');
    expect(record.sessionId).toBe(SESSION_ID);
    expect(record.accessToken).toBe(ACCESS_TOKEN);
    expect(record.identity).toBe(API_BASE_URL);
    expect(pageErrors, `page errors after adoption: ${pageErrors.join(' | ')}`).toEqual([]);

    // Adoption is a DOM claim, not a storage claim: a signed-out navbar with a valid record would
    // mean the record was read and then refused.
    const userMenu = page.getByTestId('user-menu-toggle').first();
    await expect(userMenu, 'the seeded user is signed in, not merely stored').toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('logout-menu-item')).toHaveCount(0, 'the menu is closed until it is opened');

    // And the mock switch is the one this run declared, not whatever the default happened to be.
    expect(await page.evaluate((key) => window.localStorage.getItem(key), MOCK_API_KEY)).toBe('true');
  });

  test('a record bound to another API identity is stored but not adopted', async ({ page }) => {
    // The app is configured for the loopback peer; the record belongs to a different endpoint.
    await page.addInitScript(seedSessionScript, buildArgs({
      apiBaseUrl: 'http://127.0.0.1:19999/other',
      configuredApiBaseUrl: API_BASE_URL
    }));

    // Read the fixture's own output first, on the same origin but on a page that is not the app, so
    // nothing the app does can be mistaken for what the fixture wrote. The probe is fulfilled locally
    // and carries no scripts.
    await page.route('**/__seed-probe', (route) => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><title>seed probe</title></head><body>seed probe</body></html>'
    }));
    await page.goto(`${FRONTEND_BASE_URL}/__seed-probe`);
    const seeded = await page.evaluate(
      (keys) => ({
        record: JSON.parse(window.localStorage.getItem(keys.recordKey) || 'null'),
        configured: window.localStorage.getItem(keys.apiBaseUrlKey)
      }),
      { recordKey: SESSION_RECORD_KEY, apiBaseUrlKey: API_BASE_URL_KEY }
    );
    expect(seeded.record, 'the fixture wrote what it was asked to write').toBeTruthy();
    expect(seeded.record.identity).toBe('http://127.0.0.1:19999/other');
    expect(seeded.configured, 'and the app is configured for a different endpoint').toBe(API_BASE_URL);

    // Now the real question: does the app present tokens minted for another origin as signed in?
    await page.unroute('**/__seed-probe');
    await page.goto(FRONTEND_BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.getByTestId('user-menu-toggle').first(),
      'a record bound to another identity must not produce a signed-in navbar').toHaveCount(0);
  });
});
