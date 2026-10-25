/**
 * Playwright configuration for the browser suite.
 *
 * Two loopback servers are started for every run: this worktree as static files, and a fake API
 * (see `fake-api.mjs`). The suite therefore needs no deployment, no backend and no credentials, and
 * it cannot reach a host other than 127.0.0.1. The CDN pins the app loads are checked separately by
 * `tools/check-cdn-pins.cjs --online`; a browser run therefore does need network access for the
 * runtime dependencies, and the suite says so when it is missing rather than reporting a pass.
 *
 * `backend-capabilities.spec.mjs` is deliberately NOT in this file: it asserts that a *real* backend
 * supports a capability, so it needs a prepared backend and an owner-approved session. It runs under
 * `playwright.integration.config.mjs`, opt-in, and skips rather than reports a pass without one.
 */

import { defineConfig } from '@playwright/test';

const STATIC_PORT = Number(process.env.FRONTEND_STATIC_PORT || 4173);
const API_PORT = Number(process.env.FRONTEND_API_PORT || 18788);

export default defineConfig({
  testDir: '.',
  // `served-source-identity` checks that the static server is serving this tree before anything else
  // asserts behaviour against it, so a run against the wrong source fails as a wrong source rather than as
  // an unexplained behavioural failure. `session-seed-smoke` validates the *fixture* against the real app
  // with fake credentials, so it
  // needs no backend and is the reason a broken seed cannot hide behind a skipped suite.
  testMatch: /(session-flow|session-invariants|backend-contract-mock|session-seed-smoke|harness-egress|served-source-identity|home-overview)\.spec\.mjs/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${STATIC_PORT}`,
    trace: 'off',
    // The app stores its session in localStorage; a fresh context per test keeps the tabs isolated.
    contextOptions: { ignoreHTTPSErrors: true },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'node fake-api.mjs',
      cwd: new URL('.', import.meta.url).pathname,
      url: `http://127.0.0.1:${API_PORT}/__fake/requests`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000,
    },
  ],
});
