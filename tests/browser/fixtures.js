/**
 * The `test` every browser spec in this suite imports instead of Playwright's.
 *
 * It exists because of FA8-03. Two of the specs took Playwright's stock `{ page }` and never installed
 * the egress guard, so those files ran with no network boundary at all while the README claimed every
 * context had one — and nothing in the run could have noticed, because a run with no guard and a run
 * with a permissive guard both report green.
 *
 * FR9-03 is the same defect one level further down, and it survived the FA8-03 fix because that fix only
 * covered the `context` fixture. `session-invariants.spec.mjs` opens a second context with a bare
 * `browser.newContext()`, and a page created in a second tab collected no `pageerror` unless the case
 * remembered to attach a collector to *that* page. Both were invisible rather than merely undeclared: a
 * teardown that only inspects the fixture context cannot see a context the case built itself, and a
 * `pageerror` list that was never started cannot be inspected at all.
 *
 * So the boundary is not something a spec remembers to ask for; it is a property of the run.
 * `surveilBrowser()` wraps `newContext` and `newPage` for the duration of the test, which means:
 *
 *   - no context can be created by any route — the fixture, `newGuardedContext`, or a bare
 *     `browser.newContext()` — without the egress guard on it before its first page;
 *   - no page can be created by any route without an uncaught-error listener, and a page the case never
 *     took responsibility for fails the test if it throws;
 *   - every context and page is closed at teardown, and a teardown that could not close one says so
 *     instead of leaving it to the next test.
 *
 * Specs that need several tabs still call `newGuardedContext(browser)`, which now returns the run's own
 * guard rather than installing a second one over the first.
 */

import { test as base, expect } from '@playwright/test';

import { installEgressGuard, surveilBrowser } from './helpers/browser-fixture.mjs';

/** The guard installed for the current test, so a spec can assert on what was refused. */
export const currentGuard = { value: null };

/** Everything this test created, so a spec can read the run's own bookkeeping instead of guessing. */
export const currentSurveillance = { value: null };

export const test = base.extend({
  /**
   * Wraps the browser for the test, before any context or page exists.
   *
   * Ordering matters and Playwright provides it: the built-in `context` and `page` fixtures depend on
   * `browser`, so patching here is what puts the wrappers in place before the first of them is built.
   */
  _boundary: [async ({ browser }, use, testInfo) => {
    const surveillance = surveilBrowser(browser);
    currentSurveillance.value = surveillance;
    currentGuard.value = null;

    try {
      await use(browser);
    } finally {
      // Dispose before the browser fixture itself is torn down: closing contexts that are already being
      // closed by Playwright is fine, and the other order would lose the ability to say *which* context
      // would not close.
      await surveillance.dispose({ title: testInfo.title });
      currentSurveillance.value = null;
      currentGuard.value = null;
    }
  }, { auto: true }],

  context: async ({ context, _boundary }, use, testInfo) => {
    // The run's guard, not a second one: `surveilBrowser` already installed this on the way in, and
    // installing over it would make the policy that actually applied the first one registered rather than
    // the one a report names.
    const guard = await installEgressGuard(context);
    currentGuard.value = guard;

    try {
      await use(context);
    } finally {
      // A guard nobody has seen refuse something is a comment, so refusing something is a failure. The
      // one legitimate exception is a case that deliberately provokes egress, and it says so by calling
      // `expectBlocked()` with a declaration per request — which marks those refusals as accounted for
      // rather than removing them from the record, so an undeclared one is still visible here.
      expect(guard.undeclared(), `the guard refused ${guard.undeclared().length} request(s) in "${testInfo.title}"; `
        + 'a case that means to provoke egress must declare each one with '
        + 'guard.expectBlocked({ url, method, reason, count })')
        .toEqual([]);
    }
  }
});

export { expect };
export const { describe } = base;
