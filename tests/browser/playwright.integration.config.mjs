/**
 * The opt-in browser suite: everything that needs a **prepared backend** and an owner-approved
 * session.
 *
 * Kept out of `playwright.config.mjs` on purpose. When it shared a config, the default run reported
 * "4 skipped" next to real passes, and the four skipped cases were the only ones asserting that a
 * real backend supports a capability. That reads like coverage and is not coverage. So a run here is
 * a deliberate act with its own evidence file, and a missing backend produces a *pending* report
 * rather than a skip buried in a green line.
 *
 * The static port has one owner. It used to be 4173 in this file's sibling and 4174 here, so
 * `FRONTEND_BASE_URL` could point at a port nothing was listening on and every case failed to connect
 * for a reason that had nothing to do with the backend. Both the config and the spec now read the
 * port and the base URL from `helpers/integration-session.mjs`.
 *
 * `fake-api.mjs` is started in **static-only** mode: the app under test is this tree, and the fake
 * API is not started at all, so no integration assertion can be answered by a stand-in. The spec
 * refuses to seed if `FRONTEND_MOCK_API` is anything but `false`.
 *
 * Prerequisites, all supplied by the owner and not inferred from a production environment note:
 *   FRONTEND_API_BASE_URL      the prepared backend, including its base path
 *   FRONTEND_ACCESS_TOKEN      an owner-issued token for a test account
 *   FRONTEND_REFRESH_TOKEN     its refresh token; must differ from the access token
 *   FRONTEND_USER_JSON         the same user as JSON
 *   FRONTEND_BACKEND_REVISION  the immutable revision under test
 *   FRONTEND_BACKEND_TREE      its tree
 *   FRONTEND_TEST_SCOPE        capabilities (the supported scope of this suite)
 *   FRONTEND_FIXTURE_APPROVAL  owner approval reference for the local test fixture
 *
 * A READY manifest that is incomplete is pending. One that is present but unusable fails the run.
 *
 *   FRONTEND_STATIC_PORT=4173 \
 *   FRONTEND_API_BASE_URL=http://127.0.0.1:18789/v1 \
 *   FRONTEND_ACCESS_TOKEN=... FRONTEND_REFRESH_TOKEN=... FRONTEND_USER_JSON='{"id":1}' \
 *   FRONTEND_BACKEND_REVISION=... FRONTEND_BACKEND_TREE=... FRONTEND_TEST_SCOPE=capabilities \
 *   FRONTEND_FIXTURE_APPROVAL=owner-approval-reference \
 *   npm --prefix tests run test:integration
 */

import { defineConfig } from '@playwright/test';

import { FRONTEND_BASE_URL, STATIC_PORT } from './helpers/integration-session.mjs';

const BROWSER_DIR = new URL('.', import.meta.url).pathname;

export default defineConfig({
  testDir: '.',
  testMatch: /backend-capabilities\.spec\.mjs/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  // Relative to this config: keep generated output in the shared, identity-excluded test directory.
  outputDir: '../test-results/integration',
  use: {
    baseURL: FRONTEND_BASE_URL,
    trace: 'off',
    contextOptions: { ignoreHTTPSErrors: true }
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      // Static files for this worktree only. `FRONTEND_STATIC_ONLY` is what keeps the fake API from
      // starting: an integration assertion must not be answerable by a loopback stand-in.
      command: 'node fake-api.mjs',
      cwd: BROWSER_DIR,
      env: {
        FRONTEND_STATIC_PORT: String(STATIC_PORT),
        FRONTEND_STATIC_ONLY: '1',
        FRONTEND_MOCK_API: 'false'
      },
      url: FRONTEND_BASE_URL,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000,
    },
  ],
});
