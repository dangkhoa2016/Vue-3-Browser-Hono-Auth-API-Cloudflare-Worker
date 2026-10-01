/**
 * FA8-03 / FA8-04 — the boundaries the browser suite is supposed to enforce on *itself*.
 *
 * Both findings are about tests that pass when they should not, so a test about them has to be able to
 * fail in exactly the same way. Neither of these needs a browser: the egress policy is a pure decision
 * and the page-problem collector only ever listens to events, so both are driven directly here. The
 * browser-level proof that the guard is actually installed on every context is a separate case in
 * `browser/harness-egress.spec.mjs`, because that one is about Playwright wiring.
 *
 * The round6 code fails these on behaviour:
 *   - the egress allowlist was a set of *origins*, so any path on unpkg was allowed, including
 *     `not-a-pinned-dependency@latest` — an unpinned artifact from an allowed host;
 *   - `allowError()` pushed one pattern into a single list that was then matched against console
 *     errors, page errors and failed requests alike, so a broad allowance for a refused HTTP request
 *     also swallowed an unrelated uncaught `pageerror` that merely contained the same word.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import {
  PINNED_ARTIFACTS,
  DERIVED_RESOURCES,
  GOOGLE_FONT_FAMILIES,
  ORIGIN_SCOPED_ALLOWANCES,
  SHAPED_ALLOWANCES,
  API_ORIGIN,
  STATIC_ORIGIN,
  collectPageProblems,
  createEgressPolicy,
  installEgressGuard,
  surveilBrowser,
} from '../browser/helpers/browser-fixture.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** A page stand-in that only does what the collector uses of a page. */
const fakePage = () => {
  const emitter = new EventEmitter();
  return {
    on: (event, handler) => emitter.on(event, handler),
    emit: (event, payload) => emitter.emit(event, payload)
  };
};

const consoleError = (text) => ({ type: () => 'error', text: () => text });
const failedRequest = ({ method = 'GET', url = 'http://127.0.0.1:4173/x', errorText = 'net::ERR_ABORTED' } = {}) => ({
  method: () => method,
  url: () => url,
  failure: () => ({ errorText })
});

/* ------------------------------------------------------------------------------------------------
 * FA8-03 — the allowlist is the pinned artifacts, not the hosts that serve them.
 * ---------------------------------------------------------------------------------------------- */

const requestType = raw => {
  let url;try {url=new URL(raw);} catch {return 'script';}
  return url.hostname==='fonts.gstatic.com' || /\.woff2?$/.test(url.pathname) ? 'font'
    : url.hostname==='fonts.googleapis.com' || /\.css$/.test(url.pathname) ? 'stylesheet' : 'script';
};

test('the egress allowlist is the exact pinned artifacts the loader names, and nothing else', async (t) => {
  const realPolicy = createEgressPolicy();
  // Explicit request contexts for the existing URL matrix; missing-context probes use the raw policy.
  const policy = {
    reasonFor(raw,options={}) { return realPolicy.reasonFor(raw,{method:'GET',resourceType:requestType(raw),...options}); },
    allows(raw,options) {return this.reasonFor(raw,options)===null;}
  };

  await t.test('every named artifact is derived from the loader, so the list cannot drift', () => {
    // If the derived list and the policy disagree about what the app asks for, the guard refuses the
    // app's own boot or — worse — waves something through. `vue/Loader.vue` is in this list because it
    // carries an `@import` of a Google Fonts stylesheet that no other reference file names: without it
    // the policy had no way to name that URL, and fell back to allowing the whole origin (FR9-04).
    const sources = ['index.html', 'vue/Loader.js', 'vue/Loader.vue', 'assets/js/init.js', 'assets/js/appServices.js']
      .map((file) => readFileSync(join(REPO_ROOT, file), 'utf8'))
      .join('\n');
    const referenced = [...sources.matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\/[^"'\s)]+/g)]
      .map((match) => match[0]);

    assert.ok(referenced.length > 0, 'the app really does name external resources');
    assert.deepEqual(
      [...PINNED_ARTIFACTS].sort(),
      [...new Set(referenced)].sort(),
      'the named list is exactly what the app asks for — no more, no less'
    );
    // Every host the app uses must be reachable through an *exact* name, not through an origin
    // allowance. This is the assertion that would have caught the Google Fonts hole.
    const hosts = new Set(referenced.map((url) => new URL(url).origin));
    for (const host of hosts) {
      const named = PINNED_ARTIFACTS.some((url) => new URL(url).origin === host);
      const scoped = ORIGIN_SCOPED_ALLOWANCES.some((entry) => new URL(entry.url).origin === host);
      assert.ok(named || scoped, `${host} is used by the app and is not named exactly anywhere`);
    }
    assert.ok(
      PINNED_ARTIFACTS.some((url) => url.startsWith('https://fonts.googleapis.com/')),
      'the Google Fonts stylesheet is named exactly, from the loader component that imports it'
    );
  });

  await t.test('the pin gate and the browser policy scan the same files, and say so', () => {
    // The two are only useful together. The gate fails a run on an unpinned reference; the policy turns
    // the same references into the allowlist. If they scan different files, the policy cannot name
    // something the gate never checked — which is exactly what happened to the Google Fonts stylesheet in
    // `vue/Loader.vue`, and why the policy had to allow that whole origin to keep the app's fonts
    // loading. This is the assertion that makes the divergence a failure rather than a slow rot.
    const source = readFileSync(join(REPO_ROOT, 'tools/check-cdn-pins.cjs'), 'utf8');
    const targets = /const TARGETS = \[([^\]]+)\]/.exec(source);
    assert.ok(targets, 'the pin gate still declares its target list');

    const gateFiles = [...targets[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
    const policyFiles = [...source.matchAll(/const CDN_REFERENCE_FILES = \[([\s\S]*?)\];/g)];
    assert.equal(policyFiles.length, 0, 'the policy list is in the browser fixture, not the gate');
    const fixture = readFileSync(join(REPO_ROOT, 'tests/browser/helpers/browser-fixture.mjs'), 'utf8');
    const fixtureList = /const CDN_REFERENCE_FILES = \[([\s\S]*?)\];/.exec(fixture);
    assert.ok(fixtureList, 'the browser fixture still declares its reference list');
    const fixtureFiles = [...fixtureList[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);

    assert.deepEqual([...fixtureFiles].sort(), [...gateFiles].sort(),
      'the gate and the policy must read the same files, or one of them is checking nothing');
  });

  await t.test('a named resource is named in full, query included (FR9-04)', () => {
    // The property the old key could not express. `origin + pathname` is the same string for
    // `axios.min.js` and `axios.min.js?v=2`, so a query was invisible to the policy — and a query is
    // exactly how a CDN is asked to serve something else under a name that is otherwise allowed.
    for (const artifact of PINNED_ARTIFACTS) {
      assert.equal(policy.reasonFor(artifact), null, `${artifact} is named and must be allowed`);
      const url = new URL(artifact);
      assert.notEqual(
        policy.reasonFor(`${artifact}?cachebust=1`), null,
        'the query is part of the resource, so adding one is a different resource'
      );
      assert.match(policy.reasonFor(`${artifact}?cachebust=1`), /query string/,
        'and the refusal says the query is what differs, so the failure is actionable');
    }
  });

  await t.test('every package artifact names an exact version, and the rest are accounted for', () => {
    // An allowlist entry without a version is a host rule wearing a path rule's clothes: the difference
    // between `axios@1.20.0` and whatever is published next is the whole point of pinning.
    //
    // The Google Fonts stylesheet is not an npm package and has no version to name — it is query-addressed
    // and Google republishes it. So it is not excused by a blanket rule: it is the *whole* resource, query
    // included, and this is the assertion that says so rather than skipping it quietly.
    const packageHosts = ['unpkg.com', 'cdn.jsdelivr.net'];
    for (const artifact of PINNED_ARTIFACTS) {
      const url = new URL(artifact);
      if (url.host === 'cdn.tailwindcss.com') {
        assert.match(artifact, /^https:\/\/cdn\.tailwindcss\.com\/\d+\.\d+\.\d+$/);
        continue;
      }
      if (packageHosts.includes(url.host)) {
        assert.match(artifact, /@\d+\.\d+\.\d+/, `${artifact} is not pinned to an exact version`);
        continue;
      }
      assert.ok(
        artifact === 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@500;700'
          + '&family=Noto+Sans+KR:wght@500;700&family=Noto+Sans+JP:wght@500;700&display=swap',
        `${artifact} is on a host with no pinnable version, so the policy must name it in full — `
        + 'an unversioned host is only allowed if the exact request is spelled out'
      );
    }
  });

  await t.test('a pinned artifact is allowed', () => {
    for (const artifact of PINNED_ARTIFACTS) {
      assert.equal(policy.reasonFor(artifact), null, `${artifact} is pinned and must be allowed`);
    }
    assert.equal(policy.reasonFor('https://unpkg.com/axios@1.20.0/dist/axios.min.js'), null);
  });

  await t.test('an unpinned artifact on an allowed host is blocked', () => {
    // This is the review's probe. The host is allowlisted, the path is not, and the version is
    // `@latest` — exactly the shape of a dependency that nobody pinned.
    const probed = 'https://unpkg.com/not-a-pinned-dependency@latest/index.js?FAKE_marker=1';
    assert.notEqual(policy.reasonFor(probed), null, 'an unpinned path on unpkg must be refused');
    assert.equal(policy.allows(probed), false);
  });

  await t.test('the right path at the wrong version is blocked', () => {
    // The strongest form of the same mistake: everything about the URL is right except the version, and
    // an origin-only allowlist cannot see the difference.
    const bumped = 'https://unpkg.com/axios@1.21.0/dist/axios.min.js';
    assert.equal(policy.reasonFor('https://unpkg.com/axios@1.20.0/dist/axios.min.js'), null);
    assert.notEqual(policy.reasonFor(bumped), null, 'a bumped version is not the pinned artifact');
  });

  await t.test('a resource a pinned stylesheet references is declared, not inherited from a directory', () => {
    // FR9-04. The previous rule was derived from the pinned artifact's *path*: anything under
    // `bootstrap-icons@1.11.0/` was allowed. That is not a pin. It allowed the package's `package.json`,
    // any script inside the version directory, and any file at all under it — the version being right was
    // the only thing separating it from a host rule, and a directory is not a list of things.
    //
    // The two font binaries the stylesheet actually references are declared as exact resources instead,
    // query included, each recording the stylesheet that derives it.
    for (const entry of DERIVED_RESOURCES) {
      assert.equal(policy.reasonFor(entry.url), null, `${entry.url} is declared and must be allowed`);
      assert.ok(entry.reason && entry.reason.length > 20, `${entry.url} must say why it is declared`);
      const from = new URL(entry.from);
      assert.ok(PINNED_ARTIFACTS.includes(entry.from),
        `${entry.from} is not itself a named artifact, so the declaration derives from nothing`);
      // The declared resource must sit inside the *same* version directory as the stylesheet that
      // references it. That is what makes a bump of the stylesheet a visible mismatch instead of a
      // silently-widened allowance.
      // `/npm/bootstrap-icons@1.11.0/font` — the directory the stylesheet sits in, without either
      // filename, so a font in `font/fonts/` and the stylesheet in `font/` are still one directory.
      const dirOf = (pathname) => pathname.split('/').slice(0, 4).join('/');
      assert.equal(dirOf(new URL(entry.url).pathname), dirOf(from.pathname),
        `${entry.url} is not in the pinned version directory of the stylesheet that references it`);
    }

    // The property the directory rule got wrong, stated as the review stated it.
    const insidePinnedVersionDirectory = [
      'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/package.json',
      'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/dist/js/bootstrap-icons.js',
      'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/fonts/anything-else.woff2',
      'https://cdn.jsdelivr.net/npm/axios@1.20.0/anything/else.js'
    ];
    for (const url of insidePinnedVersionDirectory) {
      assert.equal(policy.allows(url), false,
        `${url} is inside a pinned version directory but is not a resource the app names`);
    }
    assert.notEqual(
      policy.reasonFor('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/fonts/bootstrap-icons.woff2?1bb88866b4085542c8ed5fb61b9393dd'),
      null,
      'and the same file at a bumped version is refused'
    );
    assert.notEqual(
      policy.reasonFor('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/fonts/bootstrap-icons.woff2'),
      null,
      'as is the real file without the content hash the pinned stylesheet actually requests'
    );
  });

  await t.test('the one shape rule is derived from the pinned stylesheet, and is a shape and not a host', () => {
    // The 256 font binaries a Google Fonts stylesheet serves cannot be enumerated — one per unicode
    // range — so this is the single place a shape is used instead of an exact resource. The previous
    // rule was "any path on fonts.gstatic.com", which is the artifact-not-origin mistake left behind in
    // the one place the earlier fix did not reach.
    assert.equal(SHAPED_ALLOWANCES.length, 2, 'there are exactly two shape rules, and both are accounted for');
    assert.deepEqual(GOOGLE_FONT_FAMILIES, ['notosans', 'notosansjp', 'notosanskr'],
      'the families come from the pinned stylesheet\'s own family= parameters, not from a list here');

    for (const font of [
      'https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5aPdu2ui.woff2',
      'https://fonts.gstatic.com/s/notosanskr/v34/-F62fjtqLzI2JPCgQBnw7HFow2oe2EcP5pp0erwTqsSWs9Jezazjcb4.0.woff2'
    ]) {
      assert.equal(policy.reasonFor(font), null, `${font} is the shape the real requests have`);
    }
    for (const url of [
      'https://fonts.gstatic.com/s/roboto/v30/anything.woff2',   // a family the stylesheet does not ask for
      'https://fonts.gstatic.com/s/notosans/v42/x.woff',          // an extension it does not serve
      'https://fonts.gstatic.com/anything-at-all',                // the whole-origin rule, which is what this replaces
      'https://fonts.gstatic.com/s/notosans/v42/x.woff2?v=1'      // a query, which is a different resource
    ]) {
      assert.equal(policy.allows(url), false, `${url} is outside the shape the real requests have`);
    }
  });

  await t.test('the dynamic font subset endpoint is a second shape, scoped to one path', () => {
    // Found by a real browser run, not by reading the policy: Chromium asks
    // `fonts.gstatic.com/l/font?kit=…&skey=…` for a subset to exactly the characters in the document, and
    // the guard refused it. It was intermittent, which is the part that matters — whether the request
    // happens at all depends on what the font cache holds, so three tests failed on one run and passed on
    // the next with identical code.
    //
    // It was then constrained, because a shape nobody can state the limits of is a hole with a comment on
    // it. Over the full 41-case suite it was observed 0 times, while the same origin served 96 `/s/…woff2`
    // requests — so what is allowed now is what has actually been seen: one path, a non-empty `kit`, and
    // only the three query keys a real request uses. The entry says so itself.
    for (const url of [
      'https://fonts.gstatic.com/l/font?kit=o-0xIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyDPA71WwaMiUNhe27Ou2d-FazZm&skey=2b960fe17823056f&v=v42',
      'https://fonts.gstatic.com/l/font?kit=PbyCFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzztgyGr_IAKa93uftYFRn816Q5Lg&skey=87e7ee645936e2c7&v=v39'
    ]) {
      assert.equal(policy.allows(url), true, `${url.slice(0, 60)}… is the request the real browser makes`);
    }

    // Scoped to the one path: the sibling paths on that host are still governed by the woff2 rule or
    // refused, and a lookalike host is not this host.
    for (const url of [
      'https://fonts.gstatic.com/l/font',                          // no subset token: a different request
      'https://fonts.gstatic.com/l/font?kit=',                     // an empty kit presents no subset
      'https://fonts.gstatic.com/l/font?skey=abc&v=v42',           // a kit is the point of the request
      'https://fonts.gstatic.com/l/font?kit=a&kit=b',              // a repeated key is a different request
      'https://fonts.gstatic.com/l/font?kit=abc&style=2',          // a query key nothing has been seen to use
      'https://fonts.gstatic.com/l/anything-else?kit=abc',         // a sibling path on the same host
      'https://fonts.gstatic.com/s/notosans/v42/x.woff2?v=1',      // the woff2 rule, which rejects a query
      'https://fonts.gstatic.com.evil.test/l/font?kit=abc',        // a lookalike host
      'https://not-fonts.gstatic.com/l/font?kit=abc'
    ]) {
      assert.equal(policy.allows(url), false, `${url} is outside the second shape`);
    }

    // The method is now part of the shape rather than a field the URL policy cannot see. The entry used
    // to carry no method at all, which the test recorded: `reasonFor()` took a URL and nothing else, so a
    // `method: 'GET'` on the entry would have been read by the page-problem matcher and ignored by the
    // policy. Both halves take the method now, and this is what says so.
    const entry = SHAPED_ALLOWANCES.find((shape) => shape.covers(new URL('https://fonts.gstatic.com/l/font?kit=abc')));
    assert.ok(entry, 'the /l/font request is covered by exactly one shape');
    assert.equal(entry.method, 'GET', 'and that shape states the method it enforces');
    assert.equal(policy.reasonFor('https://fonts.gstatic.com/l/font?kit=abc', { method: 'GET' }), null,
      'a GET is what the shape allows');
    assert.ok(policy.reasonFor('https://fonts.gstatic.com/l/font?kit=abc', { method: 'POST' }),
      'a POST to the same path is not the request the shape describes');
    assert.match(entry.reason, /non-empty kit/);
  });

  await t.test('the loopback fixture origins are allowed', () => {
    assert.equal(policy.reasonFor(`${STATIC_ORIGIN}/`), null);
    assert.equal(policy.reasonFor(`${API_ORIGIN}/api/auth/refresh_token`), null);
  });

  await t.test('any other origin is blocked, including a lookalike host', () => {
    for (const url of [
      'https://evil.example.com/x.js',
      'https://unpkg.com.evil.example/x.js',
      'https://not-unpkg.com/axios@1.20.0/dist/axios.min.js',
      'http://127.0.0.1:4173.evil.example/x.js',
      'https://10.0.0.1/x.js'
    ]) {
      assert.equal(policy.allows(url), false, `${url} must not be allowed`);
    }
  });

  await t.test('Tailwind uses its direct versioned artifact and refuses root/other versions', () => {
    const url = 'https://cdn.tailwindcss.com/3.4.17';
    assert.ok(PINNED_ARTIFACTS.includes(url));
    assert.equal(policy.reasonFor(url), null);
    for (const other of ['https://cdn.tailwindcss.com/', url+'?anything=1', 'https://cdn.tailwindcss.com/3.4.16']) {
      assert.notEqual(policy.reasonFor(other), null);
    }
    const loader = readFileSync(join(REPO_ROOT, 'vue/Loader.js'), 'utf8');
    assert.ok(loader.includes("script.src = 'https://cdn.tailwindcss.com/3.4.17'"));
  });

  await t.test('a blocked URL says why, so a failure is readable', () => {
    const reason = policy.reasonFor('https://unpkg.com/not-a-pinned-dependency@latest/index.js');
    assert.match(reason, /not a resource this app names/);
    // And it says which resources that host *is* used for, because "refused" without that is a
    // statement about the guard rather than a statement about the request.
    assert.match(reason, /unpkg\.com is used only for/);
  });
});

/* ------------------------------------------------------------------------------------------------
 * FA8-04 — an allowance covers the thing it names, and only that thing.
 * ---------------------------------------------------------------------------------------------- */

test('a problem allowance is typed, so it cannot cover an unrelated failure that shares a word', async (t) => {
  await t.test('an allowance must say which kind of problem it is about', () => {
    const problems = collectPageProblems(fakePage());
    assert.throws(
      () => problems.allowError(/401/, 'untyped allowances are how a broad filter starts'),
      /kind/,
      'an allowance without a kind must be refused outright'
    );
  });

  await t.test('an allowance for a refused request does not swallow an uncaught page error', () => {
    const page = fakePage();
    const problems = collectPageProblems(page);
    problems.allowError(
      { kind: 'console' },
      /Failed to load resource|Network Error|401|Request failed/i,
      'the one request the stand-in refused on purpose, which axios logs as an error'
    );

    page.emit('console', consoleError('Failed to load resource: the server responded with 401'));
    page.emit('pageerror', new Error('Unexpected programming failure: CORS sentinel'));

    assert.deepEqual(
      problems.problems().map((entry) => entry.kind),
      ['pageerror'],
      'the console error was declared, the uncaught page error was not, so it is still reported'
    );
  });

  await t.test('a canary with the same words but a different source still fails', () => {
    const page = fakePage();
    const problems = collectPageProblems(page);
    problems.allowError(
      { kind: 'console' },
      /CORS/i,
      'the loader reports a blocked stylesheet as a console error'
    );
    page.emit('console', consoleError('CORS policy blocked a stylesheet'));
    page.emit('pageerror', new Error('CORS'));

    assert.equal(problems.problems().length, 1, 'the matching console error is covered');
    assert.equal(problems.problems()[0].kind, 'pageerror', 'and the page error is not');
  });

  await t.test('a failed-request allowance is scoped to the request it names', () => {
    const page = fakePage();
    const problems = collectPageProblems(page);
    problems.allowError(
      { kind: 'requestfailed', method: 'POST', url: /\/api\/auth\/refresh_token$/ },
      /ERR_ABORTED/,
      'navigating to the new endpoint aborts exactly the chunk/refresh the router had already asked for'
    );

    page.emit('requestfailed', failedRequest({
      method: 'POST',
      url: 'http://127.0.0.1:18788/api/auth/refresh_token',
      errorText: 'net::ERR_ABORTED'
    }));
    page.emit('requestfailed', failedRequest({
      method: 'GET',
      url: 'http://127.0.0.1:4173/assets/chunk.js',
      errorText: 'net::ERR_ABORTED'
    }));

    const reported = problems.problems();
    assert.equal(reported.length, 1, 'the unrelated aborted request is still reported');
    assert.match(reported[0].text, /chunk\.js/);
  });

  await t.test('an allowance for a method does not cover the same path with another method', () => {
    const page = fakePage();
    const problems = collectPageProblems(page);
    problems.allowError(
      { kind: 'requestfailed', method: 'POST', url: /\/api\/auth\/logout$/ },
      /ERR_ABORTED/,
      'the logout this case triggers is aborted on purpose'
    );
    page.emit('requestfailed', failedRequest({ method: 'GET', url: 'http://127.0.0.1:18788/api/auth/logout' }));

    assert.equal(problems.problems().length, 1, 'a GET of the same path is a different request');
  });

  await t.test('an allowance may state how many problems it expects', () => {
    const page = fakePage();
    const problems = collectPageProblems(page);
    problems.allowError({ kind: 'console', count: 1 }, /refused once/, 'exactly one refused request is expected');
    page.emit('console', consoleError('refused once'));
    page.emit('console', consoleError('refused once'));
    assert.deepEqual(problems.problems().map((entry) => entry.text), ['refused once'], 'the second one is over the declared count');

    const under = collectPageProblems(fakePage());
    under.allowError({ kind: 'console', count: 2 }, /refused twice/, 'two refused requests are expected');
    assert.throws(() => under.expectClean(), /expected \[2, 2\] but matched 0/);
  });

  await t.test('a count may be a range, for noise that is conditional but never legitimate twice', () => {
    // Whether a refused request is logged at all is the browser's mood, not the app's contract, so a
    // case must be able to say "at most one" without pretending it always happens. But the ceiling is
    // still a failure: the same refusal is never legitimate twice, and a floor above zero still demands
    // its share.
    const maybePage = fakePage();
    const maybe = collectPageProblems(maybePage);
    maybe.allowError({ kind: 'console', count: [0, 2] }, /maybe refused/, 'the browser may or may not log this');
    // zero occurrences: the case survives
    maybe.expectClean();
    // one occurrence is fine, and it cannot be anything else
    const onePage = fakePage();
    const one = collectPageProblems(onePage);
    one.allowError({ kind: 'console', count: [0, 1] }, /maybe refused/, 'the browser may or may not log this');
    onePage.emit('console', consoleError('maybe refused'));
    one.expectClean();
    // two occurrences of a refusal a case said happens at most once is a blanket, and must fail
    const twicePage = fakePage();
    const twice = collectPageProblems(twicePage);
    twice.allowError({ kind: 'console', count: [0, 1] }, /maybe refused/, 'the browser may or may not log this');
    twicePage.emit('console', consoleError('maybe refused'));
    twicePage.emit('console', consoleError('maybe refused'));
    assert.throws(() => twice.expectClean(), /maybe refused/, 'the second occurrence is beyond the ceiling and cannot be excused');
    // a floor above zero is still a demand, not a hope
    const demandedPage = fakePage();
    const demanded = collectPageProblems(demandedPage);
    demanded.allowError({ kind: 'console', count: [1, 1] }, /must happen/, 'the case needs one of these');
    assert.throws(() => demanded.expectClean(), /expected \[1, 1\]/, 'a floor of one is a demand');
    demandedPage.emit('console', consoleError('must happen'));
    demanded.expectClean();
  });

  await t.test('the reason is still mandatory', () => {
    const problems = collectPageProblems(fakePage());
    assert.throws(() => problems.allowError({ kind: 'console' }, /401/, ''), /reason/);
  });

  await t.test('an uncaught page error is reported with no allowance at all', () => {
    const page = fakePage();
    const problems = collectPageProblems(page);
    page.emit('pageerror', new Error('TypeError: cannot read properties of undefined'));
    assert.equal(problems.problems().length, 1);
    assert.equal(problems.problems()[0].kind, 'pageerror');
  });
});

/* ------------------------------------------------------------------------------------------------
 * FR10-03 / FR10-04 / FR10-08 — the teardown cannot be talked out of checking, and the patch is undone.
 * ---------------------------------------------------------------------------------------------- */

/**
 * A browser stand-in implementing only what `surveilBrowser` and `installEgressGuard` touch.
 *
 * This is the review's probe, and the point of it is that the *implementation is real*: the real
 * `surveilBrowser`, the real `installEgressGuard`, the real `collectPageProblems` and the real teardown,
 * driven by objects that are fake only in having no Chromium behind them. A failure here is a failure of
 * the harness logic rather than a browser flake, and none of these cases launch a browser.
 */
const fakeBrowser = () => {
  const created = [];

  const makePage = (context) => {
    const emitter = new EventEmitter();
    const page = {
      closed: false,
      context: () => context,
      on: (event, handler) => emitter.on(event, handler),
      emit: (event, payload) => emitter.emit(event, payload),
      isClosed: () => page.closed,
      close: async () => { page.closed = true; }
    };
    return page;
  };

  const makeContext = (options) => {
    const emitter = new EventEmitter();
    const context = {
      options,
      routes: [],
      closed: false,
      route: async (pattern, handler) => { context.routes.push({ pattern, handler }); },
      on: (event, handler) => emitter.on(event, handler),
      newPage: async () => {
        const page = makePage(context);
        emitter.emit('page', page);
        return page;
      },
      close: async () => { context.closed = true; }
    };
    return context;
  };

  const browser = {
    created,
    newContext: async (options) => {
      const context = makeContext(options);
      created.push(context);
      return context;
    },
    newPage: async (options) => {
      // Playwright's real `browser.newPage()` builds a context internally and hands back only the page,
      // which is precisely why `surveilBrowser` has to go and get it from the page.
      const context = makeContext(options);
      created.push(context);
      return makePage(context);
    }
  };
  return browser;
};

/** Drives the guard's one route handler the way Chromium would, and reports what it decided. */
const requestThrough = async (context, url, method = 'GET') => {
  const { handler } = context.routes[0];
  let outcome = null;
  await handler({
    // Playwright's `Route` exposes `request()` as a method; the stand-in keeps that shape so the handler
    // under test is the real one rather than a rewritten imitation of it.
    request: () => ({ url: () => url, method: () => method, resourceType: () => requestType(url) }),
    fetch: async options => { assert.equal(options.maxRedirects,0); return {status:()=>200,headers:()=>({}),dispose:async()=>{}}; },
    fulfill: async () => { outcome = 'continued'; },
    abort: async () => { outcome = 'aborted'; }
  });
  return outcome;
};

/**
 * Asserts a call failed *and* said the thing this test is about.
 *
 * The body is wrapped in an async function so a synchronous throw counts: `guard.expectBlocked` throws
 * rather than rejecting, and a helper that only knew how to collect a rejection would report that as the
 * assertion helper itself being broken.
 */
const rejectsWith = async (run, pattern) => {
  const error = await (async () => run())().then(() => null, (thrown) => thrown);
  assert.ok(error, 'this was supposed to fail and did not');
  assert.match(error.message, pattern);
};

test('FR10-03: attaching a collector no longer switches off the teardown check', async (t) => {
  await t.test('a pageerror nobody declared fails the run even though a collector is attached', async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    const page = await (await browser.newContext()).newPage();

    // The exact shape the review found: a collector exists, so the teardown skipped the page, and the case
    // never called `expectClean()`. Nothing in the run ever looked at the error.
    collectPageProblems(page, { label: 'forgets-to-ask' });
    page.emit('pageerror', new Error('a pageerror nobody declared'));

    // The label in the message is the one the *run* gave the page when it adopted the context, not the one
    // the collector was created with: a page the run watched first is not renamed by a later collector,
    // because the run's name is the one that appears in every report about it.
    await rejectsWith(
      () => surveillance.dispose({ title: 'FR10-03 forgot expectClean' }),
      /has a collector and the page produced 1 problem\(s\) the case never declared.*a pageerror nobody declared/s
    );
  });

  await t.test('a pageerror raised *after* the case checked is still caught', async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    const page = await (await browser.newContext()).newPage();

    const problems = collectPageProblems(page, { label: 'checks-then-regrets' });
    problems.allowError({ kind: 'pageerror', count: 1 }, /the-one-it-declared/,
      'this case provokes exactly one uncaught error on purpose');
    page.emit('pageerror', new Error('the-one-it-declared'));
    problems.expectClean();

    // Everything the case asked about is declared. This is not, and it happened after the check — which is
    // the second half of the finding: a final check is only a final check if it is the last one.
    page.emit('pageerror', new Error('the-one-that-came-after-the-check'));
    await rejectsWith(() => surveillance.dispose(), /the-one-that-came-after-the-check/);
  });

  await t.test('asking twice is the same answer, not a second round of consumption', async () => {
    // Idempotence is what makes the teardown re-check possible at all. The old matcher incremented
    // `matched` as it walked, so the second question saw the allowance already full and reported a clean
    // page as broken — which would have made an automatic check impossible rather than merely absent.
    const page = fakePage();
    const problems = collectPageProblems(page);
    problems.allowError({ kind: 'pageerror', count: 1 }, /exactly-one/, 'one allowed error');
    page.emit('pageerror', new Error('exactly-one'));

    assert.equal(problems.problems().length, 0, 'the declared error is covered');
    assert.equal(problems.problems().length, 0, 'and still covered the second time');
    assert.equal(problems.problems().length, 0, 'and the third');
    problems.expectClean();
    assert.equal(problems.allowedErrors[0].matched, 1, 'the count is still reported honestly');
  });

  await t.test('a case that checks and declares correctly is not failed by the teardown', async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    const page = await (await browser.newContext()).newPage();

    const problems = collectPageProblems(page, { label: 'well-behaved' });
    problems.allowError({ kind: 'pageerror', count: 1 }, 'the-one-it-declared', 'declared');
    page.emit('pageerror', new Error('the-one-it-declared'));
    problems.expectClean();

    // The regression this guards: a teardown that judges a well-behaved case with rules the case cannot
    // see makes the explicit collector a decoration, and every case has to opt out of it to stay green.
    assert.deepEqual(await surveillance.dispose({ title: 'well behaved' }), []);
  });
});

test('FR10-04: the browser is handed back exactly as it was found', async (t) => {
  await t.test('the wrappers are restored on dispose', async () => {
    const browser = fakeBrowser();
    const original = { newContext: browser.newContext, newPage: browser.newPage };

    const surveillance = surveilBrowser(browser);
    assert.notEqual(browser.newContext, original.newContext, 'the run really did patch the browser');
    assert.notEqual(browser.newPage, original.newPage);

    await surveillance.dispose();
    assert.equal(browser.newContext, original.newContext, 'and the real method is back');
    assert.equal(browser.newPage, original.newPage);
  });

  await t.test('a second run does not wrap the first run, and the first registry stops growing', async () => {
    const browser = fakeBrowser();

    const first = surveilBrowser(browser);
    const firstContext = await browser.newContext();
    await first.dispose();
    assert.equal(first.contexts.length, 1);

    const second = surveilBrowser(browser);
    const secondContext = await browser.newContext();

    // The review's probe: the first run's registry went 1 → 2, because the wrapper it installed was still
    // in place and its closure still the one being called.
    assert.equal(first.contexts.length, 1, "the first run stopped recording when it was disposed");
    assert.equal(second.contexts.length, 1);
    assert.notEqual(first.guardFor(firstContext), second.guardFor(secondContext),
      'and the second run got its own guard rather than a wrapper over the first');

    await second.dispose();
  });

  await t.test('a dozen consecutive lifecycles each guard and watch exactly once', async () => {
    const browser = fakeBrowser();
    for (let i = 0; i < 12; i += 1) {
      const surveillance = surveilBrowser(browser);
      const context = await browser.newContext();
      const page = await context.newPage();

      assert.equal(surveillance.contexts.length, 1, `lifecycle ${i}: one context, adopted once`);
      assert.equal(surveillance.pages.length, 1, `lifecycle ${i}: one page, watched once`);
      assert.equal(context.routes.length, 1, `lifecycle ${i}: one route handler, not one per wrapper`);

      await surveillance.dispose();
    }
    assert.equal(browser.created.length, 12, 'nothing was dropped, and nothing was created twice');
  });

  await t.test('a teardown that fails still hands the browser back', async () => {
    const browser = fakeBrowser();
    const original = browser.newContext;

    const surveillance = surveilBrowser(browser);
    const page = await (await browser.newContext()).newPage();
    page.emit('pageerror', new Error('a pageerror on a page nobody claimed'));

    await rejectsWith(() => surveillance.dispose(), /raised 1 uncaught error\(s\) and no case was watching it/);
    assert.equal(browser.newContext, original,
      'leaving the patch in place after a failed teardown would poison every test that follows');
  });

  await t.test("someone else's wrapper is left alone, and the run says it could not restore", async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);

    // A spec that patches the browser for its own reasons, after the run patched it. Writing our original
    // back would silently discard theirs — a bug this fix would be introducing rather than removing.
    const foreign = async () => 'a wrapper from somewhere else';
    browser.newContext = foreign;

    await rejectsWith(() => surveillance.dispose(), /could not restore browser\.newContext/);
    assert.equal(browser.newContext, foreign, 'their wrapper survives');
  });
});

test('FR10-08: a provoked refusal has to be named, not counted', async (t) => {
  const guarded = async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    const context = await browser.newContext();
    const guard = surveillance.guardFor(context);
    return { browser, context, guard, surveillance };
  };

  await t.test('a bare count is refused outright', async () => {
    const { guard, context, surveillance } = await guarded();
    await requestThrough(context, 'https://evil.example.com/a.js');

    assert.throws(
      () => guard.expectBlocked(1),
      /needs at least a url/,
      'a declaration that only counts would pass just as well if the guard had refused something else'
    );
    await rejectsWith(() => surveillance.dispose(), /a\.js/);
  });

  await t.test('expectBlocked() with no arguments is refused', async () => {
    // This is the one that really mattered: with no argument the old signature spliced the whole list, so
    // "the guard works" was a case that could provoke nothing at all and still pass.
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    const guard = surveillance.guardFor(await browser.newContext());

    assert.throws(() => guard.expectBlocked(), /declare what it expects/);
    assert.deepEqual(await surveillance.dispose(), [], 'declaring nothing provoked nothing, so there is nothing to find');
  });

  await t.test('a declaration that does not match the URL is refused', async () => {
    const { guard, context, surveillance } = await guarded();
    await requestThrough(context, 'https://evil.example.com/the-real-one.js');
    await rejectsWith(
      () => guard.expectBlocked({ url: 'https://elsewhere.example.com/something-else.js', method: 'GET', count: 1 }),
      /the guard refused GET https:\/\/evil\.example\.com\/the-real-one\.js.*did not declare it/s
    );
    await surveillance.dispose().catch(() => {});
  });

  await t.test('a declaration whose reason does not match is refused', async () => {
    const { guard, context, surveillance } = await guarded();
    await requestThrough(context, 'https://evil.example.com/probe.js');
    await rejectsWith(
      () => guard.expectBlocked({ url: 'https://evil.example.com/probe.js', reason: /some other rule entirely/, count: 1 }),
      /did not declare it/
    );
    await surveillance.dispose().catch(() => {});
  });

  await t.test('a declaration that provoked fewer refusals than it asked for is refused', async () => {
    const { guard, context, surveillance } = await guarded();
    await requestThrough(context, 'https://evil.example.com/once.js');
    await rejectsWith(
      () => guard.expectBlocked({ url: 'https://evil.example.com/once.js', count: 2 }),
      /declared 2 refusal\(es\).*but the guard produced 1/
    );
    await surveillance.dispose().catch(() => {});
  });

  await t.test('a refusal smuggled in beside a declared one is caught immediately', async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    const context = await browser.newContext();
    const guard = surveillance.guardFor(context);

    await requestThrough(context, 'https://evil.example.com/declared.js');
    await requestThrough(context, 'https://evil.example.com/smuggled-in.js');

    // Declaring one of the two is not enough, and the declaration itself is where that shows up. Under the
    // old signature the count would have been satisfied by the first entry on the list — which happened to
    // be the declared one — and `smuggled-in.js` would have been deleted along with the rest, so a case
    // could refuse a request it never intended to and never hear about it.
    await rejectsWith(
      () => guard.expectBlocked({ url: 'https://evil.example.com/declared.js', method: 'GET', count: 1 }),
      /smuggled-in\.js.*did not declare it/s
    );
  });

  await t.test('a refusal that arrives after the declaration is caught at teardown', async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    const context = await browser.newContext();
    const guard = surveillance.guardFor(context);

    await requestThrough(context, 'https://evil.example.com/declared.js');
    guard.expectBlocked({ url: 'https://evil.example.com/declared.js', method: 'GET', count: 1 });
    assert.deepEqual(guard.undeclared(), [], 'the declaration covers exactly what it names');

    // A declaration is not a permanent amnesty: something refused afterwards is still undeclared, because
    // the teardown judges the state of the run rather than the state at the moment of the call.
    await requestThrough(context, 'https://evil.example.com/arrived-later.js');
    assert.equal(guard.undeclared().length, 1);
    await rejectsWith(() => surveillance.dispose(), /arrived-later\.js/);
  });

  await t.test('a correctly declared provocation is fully discharged', async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    const context = await browser.newContext();
    const guard = surveillance.guardFor(context);

    await requestThrough(context, 'https://evil.example.com/declared.js', 'GET');
    guard.expectBlocked({
      url: 'https://evil.example.com/declared.js',
      method: 'GET',
      reason: /is not a resource this app names/,
      count: 1
    });

    assert.equal(guard.blocked.length, 1, 'the record is kept, not deleted');
    assert.deepEqual(guard.undeclared(), [], 'and nothing is left for teardown to find');
    assert.deepEqual(await surveillance.dispose(), [], 'a negative control that declared its refusals is green');
  });
});

test('FR10-08: every context the run creates has service workers blocked, whatever the case asked for', async (t) => {
  await t.test('a case that asks for allow is overridden', async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);

    // `context.route` never sees a service worker's traffic: it is a second network stack with no route
    // event to refuse. So the pin is forced rather than defaulted — a default would leave the door open to
    // the one caller who writes the word "allow".
    await browser.newContext({ serviceWorkers: 'allow' });
    assert.equal(browser.created[0].options.serviceWorkers, 'block');

    await browser.newContext();
    assert.equal(browser.created[1].options.serviceWorkers, 'block', 'and a case that says nothing is pinned too');

    await browser.newPage({ serviceWorkers: 'allow' });
    assert.equal(browser.created[2].options.serviceWorkers, 'block', 'the implicit context of newPage counts as well');

    await surveillance.dispose();
  });

  await t.test('the pin does not discard the options a case did set', async () => {
    const browser = fakeBrowser();
    const surveillance = surveilBrowser(browser);
    await browser.newContext({ baseURL: 'http://127.0.0.1:4173', locale: 'vi-VN' });

    assert.equal(browser.created[0].options.baseURL, 'http://127.0.0.1:4173');
    assert.equal(browser.created[0].options.locale, 'vi-VN');
    assert.equal(browser.created[0].options.serviceWorkers, 'block');

    await surveillance.dispose();
  });
});

test('FR12-04: external resources require actual method and resource type', () => {
  const policy=createEgressPolicy();
  const url='https://fonts.gstatic.com/l/font?kit=FAKE_REVIEW_MARKER';
  assert.equal(policy.reasonFor(url,{method:'GET',resourceType:'font'}),null);
  for(const options of [undefined,{}, {method:'GET'}, {resourceType:'font'}, {method:'GET',resourceType:'fetch'}, {method:'GET',resourceType:'script'}, {method:'POST',resourceType:'font'}]) {
    assert.notEqual(policy.reasonFor(url,options),null,JSON.stringify(options));
  }
  const script='https://unpkg.com/axios@1.20.0/dist/axios.min.js';
  assert.equal(policy.reasonFor(script,{method:'GET',resourceType:'script'}),null);
  assert.notEqual(policy.reasonFor(script,{method:'GET',resourceType:'font'}),null);
});

// Context.close disposes API responses before pending route callbacks finish.
// The same message outside close, and unrelated errors during close, must fail.
for (const [label, closing, message, tolerated] of [
  ['response disposal caused by context close', true, 'route.fulfill: Fetch response has been disposed', true],
  ['response disposal while context is open', false, 'route.fulfill: Fetch response has been disposed', false],
  ['unrelated network error during close', true, 'route.fulfill: unexpected network failure', false]
]) test(`N5 route lifecycle: ${label}`, async () => {
  let handler, entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  const context = {route: async (_pattern, callback) => {handler = callback;}, close: async () => {}};
  await installEgressGuard(context, {policy: {reasonFor: () => null}});
  const pending = handler({
    request: () => ({url: () => 'http://127.0.0.1/fixture', method: () => 'GET', resourceType: () => 'fetch'}),
    fetch: async () => {entered(); await held; return {status: () => 200, dispose: async () => {}};},
    fulfill: async () => {throw new Error(message);}
  });
  const outcome = pending.then(() => null, error => error);
  await started;
  if (closing) await context.close();
  release();
  const error = await outcome;
  if (tolerated) assert.equal(error, null);
  else assert.equal(error?.message, message);
});

// Playwright 1.64 reports "Test ended." when a test closes its context, or
// "Request context disposed." when context.close() has no explicit reason.
// Only that cancellation after close begins may outlive the test's route.fetch.
for (const [label, closing, message, tolerated] of [
  ['test cancellation caused by close', true, 'route.fetch: Test ended.', true],
  ['test cancellation with call log', true, 'route.fetch: Test ended.\nCall log:\n  - GET FAKE', true],
  ['test cancellation with CRLF call log', true, 'route.fetch: Test ended.\r\nCall log:\r\n  - GET FAKE', true],
  ['test cancellation while context is open', false, 'route.fetch: Test ended.', false],
  ['test cancellation with log while context is open', false, 'route.fetch: Test ended.\nCall log:\n  - GET FAKE', false],
  ['similar wording during close', true, 'route.fetch: Test ended unexpectedly', false],
  ['prefixed wording during close', true, 'upstream: route.fetch: Test ended.', false],
  ['request disposal caused by close', true, 'route.fetch: Request context disposed.', true],
  ['request disposal with call log', true, 'route.fetch: Request context disposed.\nCall log:\n  - GET FAKE', true],
  ['request disposal with CRLF call log', true, 'route.fetch: Request context disposed.\r\nCall log:\r\n  - GET FAKE', true],
  ['request disposal while context is open', false, 'route.fetch: Request context disposed.', false],
  ['request disposal with log while context is open', false, 'route.fetch: Request context disposed.\nCall log:\n  - GET FAKE', false],
  ['similar request disposal wording during close', true, 'route.fetch: Request context disposed unexpectedly', false],
  ['prefixed request disposal wording during close', true, 'upstream: route.fetch: Request context disposed.', false],
  ['request disposal without full stop during close', true, 'route.fetch: Request context disposed', false],
  ['network failure during close', true, 'route.fetch: connection reset', false]
]) test(`N5 fetch lifecycle: ${label}`, async () => {
  let handler, entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  const context = {route: async (_pattern, callback) => {handler = callback;}, close: async () => {}};
  await installEgressGuard(context, {policy: {reasonFor: () => null}});
  const pending = handler({
    request: () => ({url: () => 'http://127.0.0.1/fixture', method: () => 'GET', resourceType: () => 'fetch'}),
    fetch: async () => {entered(); await held; throw new Error(message);},
    fulfill: async () => {assert.fail('a cancelled fetch must not produce a response');}
  });
  const outcome = pending.then(() => null, error => error);
  await started;
  if (closing) await context.close();
  release();
  const error = await outcome;
  if (tolerated) assert.equal(error, null);
  else assert.equal(error?.message, message);
});
