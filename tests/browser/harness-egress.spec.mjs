/**
 * FA8-03 — the egress guard, proved against a real browser.
 *
 * `regression/harness-boundaries.test.mjs` proves the *policy* as a pure function. That is not the same
 * claim: a policy can be exactly right while nothing ever installs it, and the round6 suite was in
 * precisely that state for two of its spec files. So this case is about the wiring:
 *
 *   - the shared `context` fixture refused an unpinned artifact from a host the app legitimately uses,
 *     which only happens if the route handler ran before the request left the page;
 *   - the same case confirms the pinned artifact from that host still loads, so a guard that refuses
 *     everything would not pass either;
 *   - a spec that takes Playwright's stock `{ page }` and never asks for a guard gets the guard anyway,
 *     which is the part that used to be a README claim rather than a fact.
 *
 * The negative controls are the review's two probes: a path on an allowed host that nobody pinned, and
 * a version of a real dependency that is not the pinned one. Both must be *refused and counted* — a
 * guard that aborts without reporting has not told anyone anything.
 */

import { test, expect } from './fixtures.js';
import { PINNED_ARTIFACTS, collectPageProblems, useLiveApi, waitForApp } from './helpers/browser-fixture.mjs';
/** A dependency the app never asked for, on a host the app does use. */
const UNPINNED_ON_ALLOWED_HOST = 'https://unpkg.com/not-a-pinned-dependency@latest/index.js?FAKE_marker=1';

/** The right path at a version nobody pinned. */
const WRONG_VERSION_OF_A_REAL_DEPENDENCY = 'https://unpkg.com/axios@1.21.0/dist/axios.min.js';

test.describe('the egress boundary, proved rather than assumed', () => {
  test('the shared context refuses an unpinned artifact on a host the app legitimately uses', async ({ context }) => {
    const guard = (await import('./fixtures.js')).currentGuard.value;
    expect(guard, 'the shared context fixture installs a guard').not.toBeNull();

    const page = await context.newPage();
    const problems = collectPageProblems(page, { label: 'probe' });
    await useLiveApi(page);
    await page.goto('/');
    await waitForApp(page);

    const outcome = await page.evaluate(async ({ unpinned, bumped }) => {
      const attempt = (url) => new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve('loaded');
        image.onerror = () => resolve('refused');
        image.src = url;
        setTimeout(() => resolve('hung'), 5_000);
      });
      return { unpinned: await attempt(unpinned), bumped: await attempt(bumped) };
    }, { unpinned: UNPINNED_ON_ALLOWED_HOST, bumped: WRONG_VERSION_OF_A_REAL_DEPENDENCY });

    expect(outcome, 'the app may not reach anything the loader does not name, at any version')
      .toEqual({ unpinned: 'refused', bumped: 'refused' });

    const refusedUrls = guard.blocked.map((entry) => entry.url);
    expect(refusedUrls, 'and the guard reported why, not just that it fired').toContain(UNPINNED_ON_ALLOWED_HOST);
    expect(refusedUrls).toContain(WRONG_VERSION_OF_A_REAL_DEPENDENCY);
    for (const entry of guard.blocked) {
      // The wording is asserted, not just its presence, because a refusal that does not say which rule
      // fired cannot be acted on — and because this is where a *changed* policy would otherwise be
      // invisible: the request is still refused either way, so only the message would tell you the rule
      // behind it had been rewritten (FR9-04 changed this text when the policy stopped being
      // origin-shaped).
      expect(entry.reason, `${entry.url} was refused without a reason`).toMatch(/not a resource this app names/);
      expect(entry.reason).toContain('unpkg.com is used only for',
        'and it says what the host IS used for, so the refusal is a statement about the request');
    }

    // A guard that refuses everything would have produced the same two refusals, so the allow half of
    // the policy is proved in the same run.
    expect(PINNED_ARTIFACTS, 'the real dependencies are still named by the loader').toContain(
      'https://unpkg.com/axios@1.20.0/dist/axios.min.js'
    );
    expect(guard.requests.some((entry) => entry.allowed), 'and allowed requests really are being allowed')
      .toBe(true);

    // One declaration per request, naming the URL, the method and the rule that refused it (FR10-08).
    // A count on its own used to be enough to pass, which meant the case would have been just as happy
    // had the guard refused something else entirely — and `expectBlocked()` with no argument at all used
    // to clear the list, which meant it could pass having provoked nothing.
    guard.expectBlocked(
      { url: UNPINNED_ON_ALLOWED_HOST, method: 'GET', reason: /not a resource this app names/, count: 1 },
      { url: WRONG_VERSION_OF_A_REAL_DEPENDENCY, method: 'GET', reason: /not a resource this app names/, count: 1 }
    );
    // A refused request surfaces twice — as a failed request and as a console error from the browser —
    // and both are the two requests this case provoked on purpose. Declaring them separately is the
    // point of the typed allowance: one declaration would have covered an unrelated console error too.
    problems.allowError({ kind: 'requestfailed', count: 2, url: /not-a-pinned-dependency|axios@1\.21\.0/ },
      'net::ERR_BLOCKED_BY_CLIENT',
      'the two requests this case provokes on purpose are refused by the guard it is testing');
    problems.allowError({ kind: 'console', count: 2 }, /net::ERR_BLOCKED_BY_CLIENT/,
      'the browser logs each of those two refusals as a resource-load console error');
    problems.expectClean();
  });

  test('a spec that never asks for a guard still gets one', async ({ page }) => {
    // This is the round6 defect, restated as a test. `backend-contract-mock.spec.mjs` and
    // `session-seed-smoke.spec.mjs` took the stock `{ page }` and ran with no boundary; nothing failed,
    // because nothing was watching. Here the page is the plain fixture page — no `newGuardedContext`,
    // no `installEgressGuard` — and egress is still refused.
    const guard = (await import('./fixtures.js')).currentGuard.value;
    expect(guard, 'the stock page comes from a context that already has a guard').not.toBeNull();

    const outcome = await page.evaluate(() => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve('loaded');
      image.onerror = () => resolve('refused');
      image.src = 'https://evil.example.com/probe.js';
      setTimeout(() => resolve('hung'), 5_000);
    }));

    expect(outcome, 'an unexpected origin is refused on a page that never opted in').toBe('refused');
    expect(guard.blocked.map((entry) => entry.url)).toContain('https://evil.example.com/probe.js');
    guard.expectBlocked(
      { url: 'https://evil.example.com/probe.js', method: 'GET', reason: /is not a resource this app names/, count: 1 }
    );
  });
});

/**
 * FR9-03 — the boundary covers every context and every page, not only the fixture's.
 *
 * FA8-03 fixed the same class of defect for the `context` fixture and missed the two ways it can still
 * be walked around, both of which the suite did at the time:
 *
 *   - `session-invariants.spec.mjs` called a bare `browser.newContext()`. Nothing installed a guard on
 *     that context, so it could reach anything the machine can reach, in a suite whose README claims
 *     every context has a boundary. The teardown did not notice because it only ever looked at the
 *     fixture context — a context the case built itself was not in the fixture's list to check.
 *   - A page created in a second tab collected `pageerror` only if the case remembered to call
 *     `collectPageProblems` on *that* page. An uncaught exception in an unwatched page was not merely
 *     undeclared: no list existed, so nothing at teardown could have looked.
 *
 * Both are now properties of the run rather than of the case's memory, and these are the cases that
 * prove it. Each one does the thing the old harness could not survive, and then asserts on the
 * *refusal* — because a case that merely completed would also have completed before the fix.
 */
test.describe('FR9-03 — a context or page the case did not ask about is still covered', () => {
  test('a context opened with a bare newContext is guarded, watched and closed', async ({ browser }) => {
    const { currentSurveillance } = await import('./fixtures.js');
    const surveillance = currentSurveillance.value;
    expect(surveillance, 'the run tracks every context it hands out').not.toBeNull();

    // Exactly the line the old harness could not survive: no fixture, no helper, no guard argument.
    const context = await browser.newContext();
    const guard = surveillance.guardFor(context);
    expect(guard, 'a context created by any route has a guard before its first page').not.toBeNull();

    const page = await context.newPage();
    const outcome = await page.evaluate(() => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve('loaded');
      image.onerror = () => resolve('refused');
      image.src = 'https://evil.example.com/from-a-bare-context.js';
      setTimeout(() => resolve('hung'), 5_000);
    }));

    expect(outcome, 'egress is refused on a context nobody installed a guard on').toBe('refused');
    expect(guard.blocked.map((entry) => entry.url))
      .toContain('https://evil.example.com/from-a-bare-context.js');
    guard.expectBlocked(
      { url: 'https://evil.example.com/from-a-bare-context.js', method: 'GET',
        reason: /is not a resource this app names/, count: 1 }
    );
  });

  test('a page that throws and is nobody\'s to answer for fails the run', async ({ context }) => {
    // The collector is deliberately *not* attached: this is the page the old harness was blind to, and
    // the assertion that matters is the run's, not the case's. A case cannot assert on a teardown
    // failure, so the way this is proved is that the suite reports it — see the note in the README and
    // `reports/FRONTEND-HANDOFF.vi.md`. What is asserted here is the mechanism: the page was watched, and
    // the watch recorded the error.
    const page = await context.newPage();
    await page.setContent('<script>setTimeout(() => { throw new Error("a-uncaught-error-nobody-declared"); }, 0)</script>');

    const { currentSurveillance } = await import('./fixtures.js');
    const watched = currentSurveillance.value.pages.find((entry) => entry.page === page);
    expect(watched, 'the run watched a page no case asked it to watch').not.toBeUndefined();

    // Wait for the throw to be reported rather than asserting immediately, so the case proves the
    // listener is attached and not merely that the object exists.
    await expect.poll(() => watched.watched.pageErrors.length, { timeout: 10_000 })
      .toBeGreaterThan(0);
    expect(watched.watched.pageErrors.join(' ')).toContain('a-uncaught-error-nobody-declared');
    expect(watched.watched.explicit, 'and no case claimed responsibility for it')
      .toBe(false);

    // This case *means* to produce an uncaught error, so it has to be the one page the teardown judges
    // as claimed. Attaching a collector is how a case says "I know about this page"; the error is then
    // declared through the collector's own rules rather than excused by the run ignoring it.
    const problems = collectPageProblems(page, { label: 'deliberate' });
    problems.allowError({ kind: 'pageerror', count: 1 }, 'a-uncaught-error-nobody-declared',
      'this case throws on purpose, to prove the run watches pages no case claimed');
    problems.expectClean();
  });

  test('every context the run created is closed at teardown', async ({ browser }) => {
    // Not the same claim as "the guard fired", and the one the old teardown could not make at all: the
    // contexts are recorded, so the run can say what it created and whether any of it survived.
    const { currentSurveillance } = await import('./fixtures.js');
    const surveillance = currentSurveillance.value;

    const first = await browser.newContext();
    const second = await browser.newContext();
    const page = await first.newPage();

    expect(surveillance.contexts.length, 'both are recorded').toBeGreaterThanOrEqual(2);
    expect(surveillance.pages.some((entry) => entry.page === page), 'and so is a page from one of them')
      .toBe(true);

    // The wrapper returns the same context, guarded, and closing one does not close the other: a case
    // that tears down early must not take its sibling with it.
    await first.close();
    expect(second.pages, 'the surviving context still has its own pages').toBeDefined();
    // `context.pages()` does not throw on a closed context, so it cannot be used to ask. Using it does:
    // a closed context refuses to open a page, and that refusal is the only honest observable.
    await expect(first.newPage(), 'and the closed one really is').rejects.toThrow();
  });
});


test('N5 redirects cannot send a request to a policy-denied target', async ({context}) => {
  const {createServer} = await import('node:http');
  let arrivals = 0;
  const server = createServer((_request,response) => { arrivals++; response.end('unexpected target'); });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const target = `http://127.0.0.1:${server.address().port}/FAKE_REDIRECT_MARKER`;
  const source = `http://127.0.0.1:${process.env.FRONTEND_API_PORT || 18788}/__fake/redirect?target=${encodeURIComponent(target)}`;
  const page = await context.newPage();
  const problems = collectPageProblems(page);
  const guard = (await import('./fixtures.js')).currentGuard.value;
  try {
    const failure = await page.goto(source).then(() => null, error => error.message);
    expect(failure).toContain('ERR_BLOCKED_BY_CLIENT');
    expect(arrivals,'the denied hop must never reach its loopback receiver').toBe(0);
    guard.expectBlocked({url:target,method:'GET',reason:'redirect'});
    problems.expectClean();
  } finally {await new Promise(resolve=>server.close(resolve));}
});
