/**
 * FR10-01 — a spec that is on disk has to be in the run.
 *
 * `session-seed-smoke.spec.mjs` was in the tree, was the reason the suite claimed it could not hide a
 * broken seed behind a skipped file, and was discovered by nobody: the `testMatch` in
 * `playwright.config.mjs` spelled it `session-seed-smock`. Playwright reported
 * `36 tests in 4 files` and exit 0, the run was green, and the missing suite was invisible because
 * "green" and "green with the seed suite silently removed" are the same output. The suite it was
 * supposed to cover — does a seeded session actually load in the real app — went unexecuted and
 * unreported in the same breath.
 *
 * A typo in a regex is the cheapest possible way to delete a test, so this file does not trust any
 * count. It compares what is *on disk* against what Playwright actually collects, per suite, and it
 * asks Playwright for each suite by name rather than only for the total, because a total is exactly the
 * number a shrunken list still gets right.
 *
 * The expected inventory is derived, not written down:
 *
 *   - the suites that *must* run against the mock/fake backend, read off the mock config's own
 *     `testMatch`, so the assertion cannot disagree with the config by construction;
 *   - plus a name-level check that the mock config has not quietly absorbed
 *     `backend-capabilities.spec.mjs`, which asserts a capability against a *real* prepared backend and
 *     belongs to `playwright.integration.config.mjs` alone. Pulling it in would let a run "cover" a
 *     capability it never exercised.
 *
 * @see browser/playwright.config.mjs
 * @see browser/playwright.integration.config.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test, { describe } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TESTS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_DIR = join(TESTS_ROOT, 'browser');
const MOCK_CONFIG = join(BROWSER_DIR, 'playwright.config.mjs');
const INTEGRATION_CONFIG = join(BROWSER_DIR, 'playwright.integration.config.mjs');

/** The suites the mock run is required to discover, each with what it is there to prove. */
const REQUIRED_SUITES = [
  { name: 'session-flow', proves: 'the canonical session record and its legacy mirror, through the real form' },
  { name: 'session-invariants', proves: 'cross-tab and rotation invariants' },
  { name: 'backend-contract-mock', proves: 'the backend contract the frontend depends on, against the stand-in' },
  { name: 'session-seed-smoke', proves: 'that a seeded session actually loads in the real app — the suite whose absence made a broken seed invisible' },
  { name: 'harness-egress', proves: 'that the egress guard and the page watchers are wired, not merely implemented' },
  { name: 'served-source-identity', proves: 'that the static server is serving the tree under test — FR10-07, where a run could test one checkout and file the evidence under another\'s name' }
];

/** The suites that must NOT be in the mock run, and why. */
const FORBIDDEN_IN_MOCK_RUN = [
  { name: 'backend-capabilities', why: 'it asserts a capability against a real prepared backend; in the mock run it would be a skip wearing a pass' }
];

/** Every `*.spec.mjs` that exists, so "on disk but not collected" is expressible. */
const specFilesOnDisk = () => readdirSync(BROWSER_DIR)
  .filter((entry) => entry.endsWith('.spec.mjs'))
  .map((entry) => entry.replace(/\.spec\.mjs$/, ''))
  .sort();

/** The names the mock config's own `testMatch` names, so the two cannot drift apart silently. */
const namesInMockTestMatch = async () => {
  // The config is imported rather than parsed out of its text. A hand-rolled regex over the config's
  // source is a second, smaller version of the matcher under test — and it is the version that breaks
  // when somebody reformats the line, which is the worst possible moment to find out. `testMatch` here is
  // the actual RegExp Playwright will apply, applied to the actual file names on disk.
  const { default: config } = await import(pathToFileURL(MOCK_CONFIG).href);
  const match = config.testMatch;
  assert.ok(match instanceof RegExp, 'the mock config must declare testMatch as a RegExp this test can apply');
  return specFilesOnDisk().filter((name) => match.test(`${name}.spec.mjs`));
};

/**
 * Runs Playwright's own collector and returns what it found.
 *
 * `--list` does not start a browser, so this is the discovery path exactly as the runner takes it —
 * not a re-implementation of the regex. `--reporter=json` on `--list` gives per-file, per-test rows
 * rather than a pretty tree, which is what has to be asserted against.
 */
const collect = (config, args = []) => {
  // Resolved from the test-only `tests/node_modules` rather than from a shell lookup, so this asks the
  // same Playwright the browser run asks and cannot silently pick up a different installation from
  // somewhere else on the machine.
  const cli = join(TESTS_ROOT, 'node_modules', 'playwright', 'cli.js');
  const stdout = execFileSync(process.execPath, [cli, 'test', '--config', config, '--list', '--reporter=json', ...args], {
    cwd: TESTS_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PW_TEST_HTML_REPORT_OPEN: 'never' }
  });
  return JSON.parse(stdout);
};

/**
 * `{ suiteName: { file, tests: [titlePath] } }` from a `--list --reporter=json` payload.
 *
 * The suite tree is nested — a file is a suite, and each `describe` inside it is another — so this walks
 * down rather than reading one level. A reader that stopped at the top level would see every file as
 * contributing zero tests, which is how a "collected but empty" false failure appears in a report about
 * a run that is in fact fine.
 */
const bySuite = (payload) => {
  const suites = new Map();
  const walk = (node) => {
    for (const spec of node.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const base = String(spec.file ?? node.file ?? '').split('/').pop()?.replace(/\.spec\.mjs$/, '');
        if (!base) continue;
        const existing = suites.get(base) ?? { file: String(spec.file ?? node.file ?? ''), tests: [] };
        existing.tests.push([...(node.title ? [node.title] : []), spec.title].filter(Boolean));
        suites.set(base, existing);
      }
    }
    for (const child of node.suites ?? []) walk(child);
  };
  for (const root of payload.suites ?? []) walk(root);
  return suites;
};

describe('the browser run discovers every suite that is on disk', () => {
  test('the mock config names exactly the required suites, spelled the way the files are spelled', async () => {
    // The typo this file exists for was a name in `testMatch` that no file on disk has. Comparing the
    // config's own matcher to the disk inventory catches that class of error at the source.
    const named = (await namesInMockTestMatch()).sort();
    const required = REQUIRED_SUITES.map((suite) => suite.name).sort();
    assert.deepEqual(named, required,
      'the mock config testMatch must match exactly the required suites, spelled as the files on disk spell them');

    for (const suite of REQUIRED_SUITES) {
      assert.ok(specFilesOnDisk().includes(suite.name),
        `${suite.name}.spec.mjs must exist in tests/browser/ — the suite that ${suite.proves} has no file`);
    }
  });

  test('every required suite is collected by a real --list run, with at least one test each', () => {
    const suites = bySuite(collect(MOCK_CONFIG));

    for (const suite of REQUIRED_SUITES) {
      const found = suites.get(suite.name);
      assert.ok(found, `--list did not collect ${suite.name}.spec.mjs at all; it proves that ${suite.proves}. `
        + `Collected: ${[...suites.keys()].join(', ') || '(nothing)'}`);
      assert.ok(found.tests.length > 0,
        `${suite.name}.spec.mjs was collected but contributed 0 tests — an empty or wholly-skipped suite is a `
        + 'suite that proves nothing');
    }
  });

  test('asking Playwright for one suite by name finds it, rather than only the total being right', () => {
    // A total is what a shrunken collection still gets right. Each suite is therefore requested on its
    // own, the same way a developer would run it while fixing a failure in that suite.
    for (const suite of REQUIRED_SUITES) {
      const payload = collect(MOCK_CONFIG, [suite.name]);
      const found = bySuite(payload);
      assert.ok(found.has(suite.name),
        `--list ${suite.name} returned no rows for ${suite.name}.spec.mjs, so that suite cannot be run on its own. `
        + `Returned: ${[...found.keys()].join(', ') || '(nothing)'}`);
      const count = found.get(suite.name).tests.length;
      assert.ok(count > 0, `--list ${suite.name} collected ${suite.name}.spec.mjs but reported 0 tests`);
    }
  });

  test('the mock run does not absorb a suite that needs a prepared backend', () => {
    const suites = bySuite(collect(MOCK_CONFIG));
    for (const forbidden of FORBIDDEN_IN_MOCK_RUN) {
      assert.ok(!suites.has(forbidden.name),
        `${forbidden.name}.spec.mjs was collected by the mock config, but ${forbidden.why}`);
    }
  });

  test('the integration config is where a prepared-backend suite is run from', () => {
    // The other half of the same boundary: the forbidden suite has to live *somewhere*, and where it
    // lives is the difference between "it ran" and "it was skipped and the run said nothing".
    const integration = readFileSync(INTEGRATION_CONFIG, 'utf8');
    for (const forbidden of FORBIDDEN_IN_MOCK_RUN) {
      assert.ok(integration.includes(forbidden.name),
        `${forbidden.name}.spec.mjs must be in playwright.integration.config.mjs, because ${forbidden.why}`);
    }
  });

  test('no spec file on disk is silently absent from the run without being accounted for', () => {
    // The general shape of FR10-01, stated once: a new mock spec that nobody added to `testMatch`
    // would otherwise be a file that exists and is never executed.
    const onDisk = specFilesOnDisk();
    const collected = bySuite(collect(MOCK_CONFIG));
    const integrationConfig = readFileSync(INTEGRATION_CONFIG, 'utf8');

    const unaccounted = onDisk.filter((name) =>
      !collected.has(name) && !integrationConfig.includes(name));

    assert.deepEqual(unaccounted, [],
      'these spec files exist on disk but are in neither the mock config nor the integration config, so they are '
      + 'never executed by any run');
  });
});
