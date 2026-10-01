/**
 * Shared browser fixture: the boundaries a browser run is not allowed to cross, and the barriers it is
 * allowed to wait on.
 *
 * Two things here exist because "the test passed" was previously achievable without either.
 *
 * **Egress.** Binding the servers to 127.0.0.1 is not a browser guard: the page can still reach any
 * host the machine can, and a suite that quietly fetched something from the internet would still
 * report green. `installEgressGuard()` runs on the browser context *before* any page exists, allows
 * exactly the loopback fixture origins plus the pinned CDN origin the app loads its runtime from, and
 * records — and aborts — everything else. `egress-canary.spec.mjs` proved it fires and is not part of
 * the suite; a guard nobody has seen fail is a comment.
 *
 * **Barriers.** `navigator.locks.query()` is an observable answer to "is the writer request queued?",
 * and the stand-in's hold/release control is an observable answer to "has the server finished
 * answering?". Together they replace `waitForTimeout(1200)` with something a report can stand behind.
 *
 * @see fake-api.mjs for the stand-in this talks to.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

/** The static server for this worktree, and the stand-in API. Loopback only. */
export const STATIC_ORIGIN = `http://127.0.0.1:${process.env.FRONTEND_STATIC_PORT || 4173}`;
export const API_ORIGIN = `http://127.0.0.1:${process.env.FRONTEND_API_PORT || 18788}`;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * The exact artifacts the app is allowed to load from a package CDN.
 *
 * These are read out of the loader rather than written down here, because a hand-kept copy of a list
 * that already exists in the source is a list that will be right until the day somebody bumps a version
 * and forgets this file. `check-cdn-pins` fails the run on an unpinned reference, so the two together
 * mean the allowlist can only ever be as wide as the loader's own pinned references.
 *
 * The unit is the *artifact*, not the host (FA8-03). An origin allowlist cannot tell
 * `axios@1.20.0/dist/axios.min.js` from `axios@1.21.0/...` or from a package nobody pinned at all, and
 * both of those are exactly what a "the app loads from unpkg" rule waves through.
 */
/**
 * The files that name the app's external resources.
 *
 * This is the same list `tools/check-cdn-pins.cjs` scans, plus `vue/Loader.vue`, and it has to be.
 * The loader's Vue component carries an `@import` of a Google Fonts stylesheet, so before this file
 * listed it the allowlist had no way to name that URL — which is exactly why the two Google origins
 * were in it as blanket allowances. The app genuinely fetches those fonts, but nothing that derives
 * the allowlist could see it, so the policy fell back to "any path on these two hosts" and the
 * review was right to call that a hole: a host the app uses for one stylesheet was reachable for
 * anything at all.
 *
 * Deriving the exact URL instead of hand-writing it is the point. A hand-written copy of a URL that
 * lives in a `.vue` file is a copy that is right until somebody edits the loader.
 */
const CDN_REFERENCE_FILES = [
  'index.html',
  'vue/Loader.js',
  'vue/Loader.vue',
  'assets/js/init.js',
  'assets/js/appServices.js'
];

/**
 * Every external URL a reference file names, whatever the host.
 *
 * Deliberately not host-limited. The previous pattern matched only unpkg and jsDelivr, which is the
 * same blind spot one level up: the host is the thing the policy should be *deciding* about, and a
 * pattern that quietly ignores every other host cannot be used to notice a new one.
 */
const PINNED_ARTIFACT_PATTERN = /https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\/[^"'\s)]+/g;

const readPinnedArtifacts = () => {
  const found = new Set();
  for (const file of CDN_REFERENCE_FILES) {
    let source = '';
    try {
      source = readFileSync(join(REPO_ROOT, file), 'utf8');
    } catch (_error) {
      continue;
    }
    for (const match of source.matchAll(PINNED_ARTIFACT_PATTERN)) found.add(match[0]);
  }
  return [...found].sort();
};

export const PINNED_ARTIFACTS = readPinnedArtifacts();

/**
 * The resources a pinned stylesheet references that no file in this repo names.
 *
 * `bootstrap-icons.css` is a `<link>` the loader adds, and it points at its own fonts through relative
 * `url(...)`s that the browser resolves against the stylesheet's URL. So the two font binaries have to
 * be named here even though nothing in the tree names them.
 *
 * They are named as exact resources, including the query — which is jsDelivr's content hash for the file
 * at the pinned version, and therefore fixed for as long as the version is. The previous rule was
 * "anything under the pinned artifact's own version directory", derived from the path. That looked like a
 * pin and was not one: it allowed every file in `bootstrap-icons@1.11.0/`, including the package's
 * `package.json` and any script inside it, and the only thing separating it from a host rule was that
 * the version had to be the right one. `from` records which stylesheet derives these, so a bump of that
 * stylesheet makes the mismatch visible instead of silent.
 */
export const DERIVED_RESOURCES = [
  {
    url: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/fonts/bootstrap-icons.woff2?1bb88866b4085542c8ed5fb61b9393dd',
    from: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css',
    reason: 'The font binary the pinned bootstrap-icons stylesheet references by a relative url(), at the exact content hash jsDelivr serves for that file at the pinned version.'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/fonts/bootstrap-icons.woff?1bb88866b4085542c8ed5fb61b9393dd',
    from: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css',
    reason: 'The woff fallback of the same pinned stylesheet, which older browsers request instead of the woff2.'
  }
];

/**
 * The one resource the app reaches that no source file names.
 *
 * The Google Fonts stylesheet above is a stylesheet that points at 256 font binaries, one per unicode
 * range, and none of them is named by any file in this repo. They cannot be enumerated, and pretending
 * otherwise with a hand-written list of 256 URLs would be a list nobody could maintain.
 *
 * So this is the one place a *shape* is used instead of an exact resource — and it is as tight as the
 * real requests allow: the host, the `/s/<family>/v<n>/` prefix Google uses, a `.woff2` file (the only
 * extension the stylesheet actually serves), and a family the pinned stylesheet above actually asks for,
 * which is *derived* from that stylesheet's own `family=` parameters rather than written down here. The
 * old rule was "any path on fonts.gstatic.com", which is not a pin in any sense — the same criticism the
 * artifact-not-origin change (FA8-03) was made for, left behind in the one place it did not reach.
 */
const googleFontFamilies = (pinned) => {
  const families = new Set();
  for (const raw of pinned) {
    if (!raw.startsWith('https://fonts.googleapis.com/')) continue;
    const params = new URL(raw).searchParams;
    for (const family of params.getAll('family')) {
      // `Noto+Sans:wght@500;700` — the family is the part before the axis specifier.
      families.add(family.split(':')[0].replace(/\+/g, ' ').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  }
  return [...families].filter(Boolean).sort();
};

/** The families the pinned Google Fonts stylesheet asks for, derived rather than restated. */
export const GOOGLE_FONT_FAMILIES = googleFontFamilies(PINNED_ARTIFACTS);

const gstaticShape = (families) => new RegExp(
  `^https://fonts\\.gstatic\\.com/s/(?:${families.join('|')})/v[0-9]+/[A-Za-z0-9_-]+(?:\\.[0-9]+)?\\.woff2$`
);

/**
 * The dynamic-subset endpoint on the same origin, which is a different shape entirely.
 *
 * `/s/<family>/v<n>/<file>.woff2` is what the pinned stylesheet lists. It is not the only request the
 * browser makes to that host: when a page needs a glyph no listed unicode range covers — or when the
 * text is not known when the stylesheet is parsed — Chromium asks `fonts.gstatic.com/l/font?kit=…&skey=…`
 * for a font subset to exactly the characters in the document, and gets one back.
 *
 * This was found by a real browser run rather than by reading the policy: the guard refused twenty-two
 * such requests and failed three tests, and it did so *intermittently*, because whether the request is
 * made at all depends on what the font cache already holds for the page. A policy that is right most of
 * the time is not a policy; a test that passes on Tuesday and fails on Wednesday is worse, because it
 * teaches the reader that the guard is unreliable rather than that the run is.
 *
 * The shape is as narrow as the request allows: the same one origin, exactly the `/l/font` path, and a
 * query carrying the subset token. The `kit` parameter is an opaque token Google mints per subset and
 * there is nothing in this repository to check it against — which is the same reason the 256 binaries
 * above are a shape rather than a list, on a single path rather than a subtree. The sibling paths on that
 * host stay refused.
 *
 * "Narrow as the request allows" is the part that was **not** true, and the review is right about it
 * (FR11-05). The old rule tested the query only for `key=value` shape, so
 * `/l/font?unrelated=FAKE_REVIEW_MARKER` and `/l/font?kit=` — an *empty* subset token, which is the
 * opposite of a subset request — were both allowed. Three things constrain it now, and each one is
 * derived from a real captured request rather than from taste:
 *
 *   - the key set is the set actually observed, `{kit, skey, v}`, taken from the two real URLs this
 *     harness recorded when the guard first refused them;
 *   - `kit` must be present and non-empty, because the request is *for* a subset and without a token
 *     there is no subset being asked for;
 *   - no key may repeat. `URLSearchParams` folds duplicates into one value, so a second `kit` is a
 *     different request wearing the first one's name.
 *
 * What that buys is not much in absolute terms and that is worth saying plainly: `kit` is still opaque
 * and unchecked, so a caller who knows the key names can still reach this endpoint. What it removes is
 * the *unconstrained* half — a rule that accepts any key, any number of them, empty, on a path whose
 * entire purpose is to be addressed by a specific token. A rule that can express "the query key the
 * reviewer's marker rode in on" is not a pin.
 */
const GSTATIC_DYNAMIC_FONT_PATH = '/l/font';

/** The query keys a real `/l/font` request has been observed to carry, and no others. */
const GSTATIC_DYNAMIC_FONT_KEYS = new Set(['kit', 'skey', 'v']);

/**
 * Whether a shape rule covers a URL.
 *
 * The two shapes here have different things to check — one is a regex over the whole URL, the other is a
 * path plus a query it has to dissect — so `covers()` is a predicate over a parsed URL and the rules
 * themselves say how to cover. It is exported because a rule that cannot be asked "does this cover that?"
 * is a rule nobody can test apart from the whole policy.
 *
 * @param {{covers: (url: URL) => boolean}} shape
 * @param {URL|string} raw
 */
export const shapeCovers = (shape, raw) => shape.covers(typeof raw === 'string' ? new URL(raw) : raw);

export const SHAPED_ALLOWANCES = [
  {
    origin: 'https://fonts.gstatic.com',
    label: 'a versioned .woff2 under a family the pinned Google Fonts stylesheet asks for, with no query',
    // Observed across the full 41-case browser suite: 96 requests, every one of them this one file,
    // every one of them a GET, and none of them carrying a query. The rule stays a shape rather than a
    // list of those exact URLs because the pinned stylesheet is not content-addressed — Google serves
    // `v42` today and `v43` after its next release, and a rule pinning the version would break on a
    // legitimate upstream change rather than on anything the app did.
    covers: (url) => gstaticShape(GOOGLE_FONT_FAMILIES).test(url.href),
    method: 'GET',
    reason: 'The font binaries the pinned Google Fonts stylesheet points at are content-addressed by Google and named by no file in this repo, so there is no exact resource to pin — the stylesheet serves 256 of them, one per unicode range. The rule is a shape, not a host: a versioned woff2 under a family the pinned stylesheet asks for, fetched by GET, with no query. Anything else on that origin is refused.'
  },
  {
    origin: 'https://fonts.gstatic.com',
    label: `the ${GSTATIC_DYNAMIC_FONT_PATH} dynamic-subset endpoint, fetched by GET, with a non-empty kit token and only the observed query keys`,
    covers: (url) => {
      if (url.origin !== 'https://fonts.gstatic.com') return false;
      if (url.pathname !== GSTATIC_DYNAMIC_FONT_PATH) return false;
      const seen = new Set();
      for (const [key, value] of url.searchParams) {
        if (!GSTATIC_DYNAMIC_FONT_KEYS.has(key)) return false;
        if (seen.has(key)) return false;      // a repeated key is a different request
        seen.add(key);
        if (key === 'kit' && value === '') return false;
      }
      // The token the request exists to present.
      return url.searchParams.getAll('kit').filter((value) => value !== '').length === 1;
    },
    method: 'GET',
    reason: 'The dynamic-subset endpoint of the same pinned Google Fonts origin: /l/font returns a font subset to exactly the characters in the document, and its kit token is minted per subset by Google, so there is no resource in this repo to pin it against. The request is made on some runs and not others depending on what the font cache already holds, so it cannot simply be deleted — but it can be constrained: fetched by GET, carrying a non-empty kit token, with only the query keys a real request has been observed to use (kit, skey, v), no key repeated. kit remains opaque and unchecked; that limit is stated rather than implied. The sibling /s/ and every other path on the host stay under the woff2 rule above or refused.'
  }
];

// No origin-scoped package exceptions: Tailwind is a direct versioned resource.
export const ORIGIN_SCOPED_ALLOWANCES = [];

/**
 * The fixture servers, on every name the loopback answers to.
 *
 * `127.0.0.1` and `localhost` are different origins to a browser, so the endpoint-switch cases reach the
 * same stand-in through both. Enumerating the hostnames here keeps that legitimate move working while
 * still refusing a *port* nothing in this run started — a blanket "any loopback" rule would let a case
 * quietly talk to whatever else the machine happens to be listening on.
 */
const LOOPBACK_HOSTNAMES = ['127.0.0.1', 'localhost', '[::1]'];

const fixtureOrigin = (origin) => new URL(origin);

export const FIXTURE_ORIGINS = [...new Set(
  [STATIC_ORIGIN, API_ORIGIN].flatMap((origin) => {
    const parsed = fixtureOrigin(origin);
    return LOOPBACK_HOSTNAMES.map((hostname) => `${parsed.protocol}//${hostname}:${parsed.port}`);
  })
)];

/**
 * The identity of a resource: scheme, host, port, path *and* query.
 *
 * The query is the part FR9-04 is about. `origin + pathname` is the same string for
 * `axios.min.js` and `axios.min.js?anything`, so the old key could not tell a pinned artifact from the
 * same path with a query appended — and a query is how a CDN is asked for a different representation of
 * the same file. A resource that is pinned to a path and a version is not pinned to a path, a version
 * and whatever else the page felt like adding, and the only way to say it is to compare the whole thing.
 */
const resourceKey = (url) => `${url.origin}${url.pathname}${url.search}`;

/**
 * The egress decision, as a pure function of a URL, so it can be tested without a browser.
 *
 * `reasonFor()` returns `null` for anything allowed and a sentence for anything refused. A guard that can
 * only say yes or no produces failures nobody can act on; this one can say "this is not the pinned
 * resource" and "this is the pinned path with a query the pin does not have", because those are
 * different mistakes and the fix for one is not the fix for the other.
 *
 * Everything is compared as an exact resource, and there is exactly one shape rule, declared above with
 * the reason it exists.
 *
 * External requests require the intercepted method and resource type. Font URLs are usable only
 * as GET/font, CSS as GET/stylesheet, and pinned scripts as GET/script. Missing context fails closed.
 */
export function createEgressPolicy({
  pinnedArtifacts = PINNED_ARTIFACTS,
  derivedResources = DERIVED_RESOURCES,
  originScoped = ORIGIN_SCOPED_ALLOWANCES,
  shaped = SHAPED_ALLOWANCES,
  fixtureOrigins = FIXTURE_ORIGINS
} = {}) {
  const named = new Map([...pinnedArtifacts, ...derivedResources.map((entry) => entry.url)]
    .map((raw) => [resourceKey(new URL(raw)), raw]));
  const scoped = new Map(originScoped.map((entry) => [resourceKey(new URL(entry.url)), entry.reason]));
  const fixture = new Set(fixtureOrigins);

  return {
    /**
     * @param {string} raw
     * @param {{method?: string|null}} [options]
     * @returns {string|null} null when the request is allowed, otherwise why it is not.
     */
    reasonFor(raw, { method, resourceType } = {}) {
      let url;
      try {
        url = new URL(raw);
      } catch (_error) {
        return `"${raw}" is not an absolute URL, so this suite will not decide whether it is one of ours`;
      }
      // A scheme with no origin of its own (`data:`, `blob:`) is not egress. Refusing to parse one must
      // not turn into a hang, and blocking it would break the app rather than test it.
      if (!['http:', 'https:'].includes(url.protocol)) return null;

      // The loopback fixture servers are this run's own, started by the same command as the tests, and
      // addressed on whatever path and query the app's API calls need. Scoping them to exact resources is
      // not available: the app legitimately calls many of them.
      if (fixture.has(url.origin)) return null;

      if (method !== 'GET' || !resourceType) return 'external request requires explicit GET method and resource type';
      const expectedType = url.hostname === 'fonts.gstatic.com' || /\.woff2?$/.test(url.pathname) ? 'font'
        : url.hostname === 'fonts.googleapis.com' || /\.css$/.test(url.pathname) ? 'stylesheet' : 'script';
      const typeMismatch = resourceType !== expectedType ? `external resource requires ${expectedType}, received ${resourceType}` : null;
      const key = resourceKey(url);
      if (named.has(key)) return typeMismatch;
      if (scoped.has(key)) return typeMismatch;
      const covering = shaped.filter((entry) => entry.covers(url));
      if (covering.length > 0) {
        if (typeMismatch) return typeMismatch;
        if (covering.some((entry) => entry.method === method)) return null;
        // The URL is inside a shape and refused only by the method. This is the one case where a broader
        // message would be actively misleading, so it names the rule and the method instead.
        return `${raw} is ${covering.map((entry) => entry.label).join('; ')}, which this app fetches by `
          + `${covering.map((entry) => entry.method).filter((value, at, all) => all.indexOf(value) === at).join(' or ')}; `
          + `this request is ${method === null ? 'unstated, and a shape rule only vouches for a method it can name' : `a ${method}`}`;
      }

      // The refusals are ordered so the message names the actual mistake. A run that failed on
      // "not a resource this app names" when the real difference was one query string would send somebody
      // looking in the wrong place, which is the difference between a failure and a comment.
      const bareKey = `${url.origin}${url.pathname}`;
      const namedPaths = new Set([...named.keys(), ...scoped.keys()].map((entry) => entry.replace(/\?.*$/, '')));
      if (namedPaths.has(bareKey)) {
        return `${raw} is the named path ${bareKey} with a query string this app does not request; a named `
          + 'resource is named in full, and a query is how a CDN is asked for something else under the same path';
      }
      const sameHost = [...named.keys(), ...scoped.keys()].filter((entry) => entry.startsWith(`${url.origin}/`));
      if (sameHost.length > 0) {
        return `${raw} is not a resource this app names; ${url.origin} is used only for `
          + `${sameHost.map((entry) => entry.replace(`${url.origin}`, '')).join(', ')}`;
      }
      // A host reached only by a shape rule. The old fallback said such a host "is not a host this app
      // uses", which is false in the most confusing direction: the host *is* used, just not for this. The
      // reader would go looking for a pinning decision that does not exist instead of at the shape.
      const shapesOnHost = [...new Set(shaped.filter((entry) => entry.origin === url.origin).map((entry) => entry.label))];
      if (shapesOnHost.length > 0) {
        return `${raw} is not a resource this app names; ${url.origin} is used only for `
          + `${shapesOnHost.join('; ')}`;
      }
      return `${url.origin}${url.pathname} is not a resource this app names, and ${url.origin} is not a host `
        + 'this app uses';
    },
    allows(raw, options) {
      return this.reasonFor(raw, options) === null;
    }
  };
}

export const egressPolicy = createEgressPolicy();

const isLoopback = (hostname) => ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname);

/**
 * Whether a recorded value is what a declaration named, by substring or by pattern.
 *
 * Both spellings are used for real reasons: a URL is a literal string, a policy reason is prose, and
 * `String.includes` throws when handed a RegExp — so a declaration could only ever use whichever form
 * happened not to crash, which is the same defect the allowance matcher had.
 */
const matchText = (value, pattern) => (
  pattern instanceof RegExp ? pattern.test(String(value)) : String(value).includes(String(pattern))
);

const GUARD = Symbol.for('frontend.browser.egressGuard');
const PROBLEMS = Symbol.for('frontend.browser.pageProblems');

/**
 * The surveillance runs currently in flight, innermost last (FR10-03).
 *
 * `surveilBrowser` pushes itself here on construction and pops itself in `dispose`, and `watchPage` files
 * the record it creates under whichever run is innermost at the time. That is what lets the teardown reach
 * a page whose case forgot to do anything with its collector — the whole of the finding — without letting
 * a collector that was built outside any run (the unit tests in `harness-boundaries.test.mjs` make dozens
 * of them, on purpose, to assert what a collector reports) be judged by a teardown that has nothing to do
 * with them. One run is in flight at a time per worker, which is what Playwright gives us.
 */
const activeRuns = [];

/**
 * Installs the outbound guard on a context, before any page is created.
 *
 * Every decision is recorded with its reason, so a red run says which rule refused a request rather than
 * only that something was refused.
 *
 * Idempotent per context. That is not a convenience: the suite now guards contexts from a single place
 * that sees every one of them, and a spec that also calls `newGuardedContext()` must get the *same* guard
 * rather than a second route handler over the first. Two handlers would mean the first one's decision is
 * the only one that counts, and a context that was guarded twice would look guarded in a report while the
 * policy that actually applied was whichever was registered first.
 *
 * @returns {{blocked: Array, requests: Array, policy: object}}
 */
export async function installEgressGuard(context, { policy = egressPolicy } = {}) {
  if (context[GUARD]) return context[GUARD];

  const blocked = [];
  const requests = [];
  let contextClosing = false;
  context.once?.('close', () => { contextClosing = true; });
  // Playwright disposes context.request before emitting 'close'. Record the
  // start of our own close call so only its expected cancellation is accepted.
  const closeContext = context.close;
  if (typeof closeContext === 'function') {
    context.close = function (...args) {
      contextClosing = true;
      return closeContext.apply(this, args);
    };
  }

  await context.route('**/*', async (route) => {
    const request = route.request();
    // The method is passed, not assumed: the shape rules are the only ones that read it, and they are
    // the ones standing in for a resource nothing in this repo can pin.
    const reason = policy.reasonFor(request.url(), { method: request.method(), resourceType: request.resourceType() });

    requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      allowed: reason === null,
      reason
    });

    if (reason === null) {
      // Playwright does not route redirect destinations again. Fetch only the direct
      // response and never hand a Location to the browser; every fixture/CDN URL must
      // name its final resource. This HTTP boundary does not cover WebSockets.
      const page = request.frame?.()?.page?.();
      const closedDuringRoute = error => (contextClosing || page?.isClosed())
        && /Target page, context or browser has been closed|^route\.fulfill: Fetch response has been disposed$|^route\.fetch: (?:Test ended|Request context disposed)\.(?:\r?\n|$)/.test(String(error?.message));
      let response;
      try {
        response = await route.fetch({maxRedirects: 0});
        if ([301, 302, 303, 307, 308].includes(response.status())) {
          const location = response.headers().location || '';
          let target = location;
          try { target = new URL(location, request.url()).href; } catch { /* Record malformed targets without following them. */ }
          const redirectReason = 'redirect refused: isolated harness accepts direct responses only';
          requests.push({url: target, method: request.method(), resourceType: request.resourceType(),
            allowed: false, reason: redirectReason, redirectFrom: request.url()});
          blocked.push({url: target, method: request.method(), reason: redirectReason, declared: false});
          await route.abort('blockedbyclient');
        } else {
          await route.fulfill({response});
        }
      } catch (error) {
        if (!closedDuringRoute(error)) throw error;
      } finally {
        if (response) {
          try { await response.dispose(); } catch (error) { if (!closedDuringRoute(error)) throw error; }
        }
      }
      return;
    }

    // Record before refusing: a run that is going to be debugged needs the evidence even though the
    // request is not made. `declared` is set by `expectBlocked` and is what the teardown reads, so a
    // refusal the case accounted for stops being a failure without being deleted from the record.
    blocked.push({ url: request.url(), method: request.method(), reason, declared: false });
    await route.abort('blockedbyclient');
  });

  const guard = {
    blocked,
    requests,
    policy,
    /**
     * Declares the refusals this case means to provoke, one declaration per request (FR10-08).
     *
     * The teardown treats any blocked request as a failure, because a guard that blocks something and
     * lets the suite report green has verified nothing. A negative-control case is the one legitimate
     * exception, and now it has to say *which* refusals it wanted:
     *
     *   - `url` is required. A declaration that only counted refusals would pass just as well if the guard
     *     had refused something else entirely — which is the failure this replaces, since the old
     *     `expectBlocked(count)` took the first `count` entries off the list and `expectBlocked()` with no
     *     argument cleared the lot.
     *   - `method` and `reason` narrow it further, and the reason is checked by substring or pattern
     *     because that is where the policy names the actual mistake.
     *   - `count` defaults to 1 and is a hard number: a case that provokes one refusal twice is doing
     *     something the single declaration does not describe.
     *
     * Both directions fail. A refusal nobody declared is a problem here and again at teardown; a
     * declaration that saw fewer refusals than it asked for is a problem here, because a negative control
     * that never tripped is a case that passes for the wrong reason.
     */
    expectBlocked(...declarations) {
      if (declarations.length === 0) {
        throw new TypeError(
          'a case that provokes egress has to declare what it expects to be refused, e.g. '
          + '{ url, method, reason, count }. expectBlocked() with no argument used to clear every '
          + 'refusal the guard had recorded, which is how "the guard works" became a case that blocked '
          + 'nothing and still passed.'
        );
      }
      for (const declaration of declarations) {
        if (!declaration || typeof declaration !== 'object' || !declaration.url) {
          throw new TypeError('each expectBlocked declaration needs at least a url');
        }
      }

      // Only refusals an earlier declaration did not already account for. A second call is therefore
      // additive rather than double-counting the first one's entries.
      const unaccounted = blocked.filter((entry) => !entry.declared);
      const counts = declarations.map(() => 0);
      const accounted = new Set();
      const problems = [];

      for (const entry of unaccounted) {
        const index = declarations.findIndex((declaration, i) => {
          if (counts[i] >= (declaration.count ?? 1)) return false;
          if (!matchText(entry.url, declaration.url)) return false;
          if (declaration.method && declaration.method.toUpperCase() !== String(entry.method).toUpperCase()) {
            return false;
          }
          if (declaration.reason && !matchText(entry.reason, declaration.reason)) return false;
          return true;
        });
        if (index < 0) {
          problems.push(`the guard refused ${entry.method} ${entry.url} (${entry.reason}) `
            + 'and the case did not declare it');
          continue;
        }
        counts[index] += 1;
        accounted.add(entry);
      }

      declarations.forEach((declaration, i) => {
        const want = declaration.count ?? 1;
        if (counts[i] < want) {
          problems.push(`the case declared ${want} refusal(es) of ${declaration.url} `
            + `(${declaration.reason ?? 'any reason'}) but the guard produced ${counts[i]}`);
        }
      });

      for (const entry of accounted) entry.declared = true;

      expect(problems, 'the refusals the guard produced are not the ones this case declared').toEqual([]);
      return [...accounted];
    },
    /** The refusals no declaration has claimed. This is what teardown judges, not the whole list. */
    undeclared() {
      return blocked.filter((entry) => !entry.declared);
    }
  };

  Object.defineProperty(context, GUARD, { value: guard, configurable: true });
  return guard;
}

/**
 * Attaches the uncaught-error listener to a page, once, and returns the list it writes to.
 *
 * The listener is separated from the collector that interprets it because the two now have different
 * owners. The *interpretation* — what a case is allowed to get away with — belongs to the case, and has
 * always been asked for explicitly. The *listening* belongs to the run: FR9-03 is the finding that a page
 * nobody asked about produced no `pageerror` list at all, so an exception thrown in the second tab of a
 * multi-tab case was collected for the first tab, or for none of them, depending on which page the
 * remembered `collectPageProblems` call happened to name.
 *
 * Every watched page also joins the run that is in flight (`activeRuns`), which is what FR10-03 is about.
 * A page that only ever had a collector attached — and never `expectClean()` — is still registered, so
 * the teardown can find it. The old design let a case disable the automatic check just by creating a
 * collector, which made "I attached a collector" mean "I checked it" even when it did not.
 */
export function watchPage(page, { label = 'page' } = {}) {
  if (page[PROBLEMS]) return page[PROBLEMS];

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(`${label}: ${error.message}`));

  const watched = { pageErrors, label, explicit: false, collector: null };
  Object.defineProperty(page, PROBLEMS, { value: watched, configurable: true });
  const run = activeRuns[activeRuns.length - 1];
  if (run) run.records.add(watched);
  return watched;
}

/**
 * Every context and page a test creates, guarded and watched without being asked (FR9-03).
 *
 * The guard used to be something a spec remembered to install, and the teardown only looked at the
 * `context` fixture. Both halves were defeatable by the same forgotten line:
 *
 *   - `session-invariants.spec.mjs` opened a second context with a bare `browser.newContext()` and
 *     reached the internet through it, in a suite whose README claimed every context had a boundary. A
 *     run with no guard and a run with a permissive guard both report green, so nothing noticed.
 *   - A page that was created and then forgotten collected no `pageerror`, so an uncaught exception in it
 *     was not merely undeclared — it was invisible. Nothing at teardown could look at a list that was
 *     never started.
 *
 * So rather than making the rule easier to remember, this takes the decision away: `newContext` and
 * `newPage` are wrapped for the duration of the test, so a context cannot be created by any route without
 * being guarded and a page cannot be created by any route without a listener. Teardown then asserts what
 * the old design merely hoped for — every context closed, no undeclared refusal anywhere, and no uncaught
 * error on any page a case did not explicitly take responsibility for.
 *
 * Two lifecycle rules came out of FR10-03 and FR10-04 and are part of the contract, not tidying:
 *
 *   - the wrappers are *restored* on dispose, with an ownership guard, so the next test wraps the real
 *     methods rather than this run's closures. Before, every test stacked another layer onto the same
 *     browser object and the first test's registry kept growing with the second test's contexts.
 *   - teardown evaluates every collector it can find, whether or not the case called `expectClean()`.
 *     Attaching a collector used to *disable* the automatic check.
 *
 * @returns {{dispose: Function, guards: Array, pages: Array, contexts: Array}}
 */
export function surveilBrowser(browser, { policy = egressPolicy } = {}) {
  const contexts = [];
  const pages = [];
  const guards = [];
  let patched = false;
  let original = null;
  let wrappers = null;

  // This run's own page registry, so the teardown judges the pages of this test and not of whichever
  // collector some other test happened to build.
  const records = new Set();
  const run = { records };
  activeRuns.push(run);

  const watch = async (page, label) => {
    if (pages.some((entry) => entry.page === page)) return;
    const watched = watchPage(page, { label });
    pages.push({ page, watched, label });
  };

  const adopt = async (context, label) => {
    // The guard is installed here, on the context, before any page of it exists — which is the only
    // point at which installing it is guaranteed to precede the requests a page would make.
    const guard = await installEgressGuard(context, { policy });
    guards.push(guard);
    if (!contexts.some((entry) => entry.context === context)) {
      contexts.push({ context, guard, label });
      // A page created from a context this run already knows about, including the one Playwright's own
      // `page` fixture builds, is watched here rather than waiting for a call that may never come.
      context.on('page', (page) => { void watch(page, `${label}-page`); });
    }
    return context;
  };

  const patch = () => {
    if (patched) return;
    patched = true;
    // The *unbound* methods, and whether they were own properties to begin with. Capturing a bound copy
    // would restore something that behaves the same but is not the method that was there, and each
    // lifecycle would leave another copy behind — so the pristine state is recorded instead: for a
    // Playwright `Browser`, `newContext` lives on the prototype and the honest restoration of "not
    // patched" is the absence of an own property.
    original = {
      newContext: browser.newContext,
      newPage: browser.newPage,
      hadOwn: {
        newContext: Object.prototype.hasOwnProperty.call(browser, 'newContext'),
        newPage: Object.prototype.hasOwnProperty.call(browser, 'newPage')
      }
    };

    // Both wrappers must return the object Playwright's caller expects — a BrowserContext, or a Page.
    // Returning a `{ context, guard }` wrapper looks like it works and fails at the first `context.route`
    // of the next fixture, which is a much less obvious failure than it looks: the suite is not red
    // anywhere near the line that broke.
    const wrappedContext = async (...args) => adopt(
      await original.newContext.call(browser, withServiceWorkersBlocked(args[0])), 'context'
    );
    const wrappedPage = async (...args) => {
      // `browser.newPage()` builds a context of its own and does not hand it back, so the context is
      // taken from the page it produced. Without this the one API that creates a context without saying
      // so would be the one context in the run with no boundary.
      const page = await original.newPage.call(browser, withServiceWorkersBlocked(args[0]));
      await adopt(page.context(), 'implicit-context');
      await watch(page, 'browser-newPage');
      return page;
    };

    wrappers = { newContext: wrappedContext, newPage: wrappedPage };
    browser.newContext = wrappedContext;
    browser.newPage = wrappedPage;
  };

  /**
   * Puts the browser's own methods back (FR10-04).
   *
   * The ownership guard is the part that matters: if something else has patched these methods since this
   * run did — a spec monkeypatching for its own reasons, or a second `surveilBrowser` on the same object —
   * then writing our original back would silently discard *their* wrapper, which is a bug this fix would
   * be introducing. So each method is restored only if it is still the exact function we installed, and
   * the teardown says so when it cannot, rather than pretending the browser is back to normal.
   *
   * @returns {string[]} the methods that could not be restored because someone else owns them now
   */
  const unpatch = () => {
    if (!patched) return [];
    const unclaimed = [];
    for (const name of ['newContext', 'newPage']) {
      if (browser[name] !== wrappers[name]) {
        unclaimed.push(name);
        continue;
      }
      if (original.hadOwn[name]) browser[name] = original[name];
      else delete browser[name];
    }
    patched = false;
    return unclaimed;
  };

  patch();

  return {
    contexts,
    pages,
    guards,
    /** The guard for a context, so a case can read what was refused without installing one. */
    guardFor: (context) => context[GUARD] ?? null,
    /**
     * Closes everything and reports what the run should not have produced.
     *
     * Assertions are collected rather than thrown one at a time: a run with three unwatched pages should
     * say so three times, not fail on the first and hide the other two behind a retry.
     *
     * Restoring the browser's own methods and draining the page registry happen in a `finally` (FR10-04),
     * because a teardown that leaves the next test to run against a half-undone teardown is worse than the
     * failure it was reporting. The order inside is deliberate: judge first, while the evidence is still
     * readable, then close, then let go of everything.
     */
    async dispose({ title = 'this test' } = {}) {
      const problems = [];

      try {
        for (const { guard, label } of contexts) {
          // `expectBlocked` marks what a case declared rather than deleting it, so what is left undeclared
          // here is by definition something nobody accounted for (FR10-08).
          const undeclared = guard.undeclared();
          if (undeclared.length > 0) {
            problems.push(`${label} refused ${undeclared.length} request(s) the case did not declare: `
              + undeclared.map((entry) => `${entry.method} ${entry.url} (${entry.reason})`).join('; '));
          }
        }

        for (const watched of records) {
          // Every collector the run can see, not only the pages the case declared an interest in, and not
          // only the ones whose case remembered to call `expectClean()` (FR10-03). The evaluation is
          // idempotent, so a case that already checked gets the same answer rather than a second,
          // stricter one — and a page that raised something *after* its case's check is still judged by it.
          if (watched.collector) {
            const { outstanding, miscounted, unused } = watched.collector.evaluate();
            if (outstanding.length > 0) {
              problems.push(`${watched.label} has a collector and the page produced `
                + `${outstanding.length} problem(s) the case never declared: `
                + outstanding.map((event) => `${event.kind}: ${event.text}`).join('; '));
            }
            problems.push(...miscounted, ...unused);
            continue;
          }

          // A page nobody claimed is judged strictly, because that is the page the old harness was blind
          // to: with no collector there are no typed allowances, so every uncaught error is a failure.
          if (watched.pageErrors.length > 0) {
            problems.push(`${watched.label} raised ${watched.pageErrors.length} uncaught error(s) and no `
              + `case was watching it: ${watched.pageErrors.join('; ')}`);
          }
        }

        for (const { context, label } of contexts) {
          try {
            await context.close();
          } catch (error) {
            problems.push(`${label} did not close: ${error.message}`);
          }
        }
        for (const { page, label } of pages) {
          if (!page.isClosed()) {
            try {
              await page.close();
            } catch (error) {
              problems.push(`${label} did not close: ${error.message}`);
            }
          }
        }
      } finally {
        // Closing a context drops the `page` listener `adopt` registered on it, but a context that failed
        // to close still holds it — so the registry is released explicitly and the wrappers are put back
        // whatever happened above. A run that is not popped here would be the innermost run for the *next*
        // test, which is a much harder failure to read than this one.
        const at = activeRuns.lastIndexOf(run);
        if (at >= 0) activeRuns.splice(at, 1);
        records.clear();
        for (const name of unpatch()) {
          problems.push(`this test could not restore browser.${name}() because something else replaced it; `
            + 'a later test would be running against a wrapper this run no longer owns');
        }
      }

      if (problems.length > 0) {
        expect(problems, `${title} left ${problems.length} boundary problem(s)`).toEqual([]);
      }
      return problems;
    }
  };
}

/**
 * Forces `serviceWorkers: 'block'` on every context the run creates (FR10-08).
 *
 * This is a *pin*, not a default, so the key goes last: a case that asks for `'allow'` still gets
 * `'block'`. The reason is the shape of the guard itself. `context.route` only sees requests that travel
 * through the page's network stack, and a service worker is a second stack the test never asks about — one
 * that can serve a response the policy has never seen and cannot refuse, because there is no route event
 * to refuse. A suite that claims every context has an egress boundary cannot leave that door unlocked, and
 * the honest thing is to remove the door rather than to add a comment saying it is closed.
 *
 * The app is a static SPA with no service worker of its own, so this costs nothing in coverage; what it
 * buys is that the claim "every context this run creates is guarded" is true of the context as a whole
 * rather than of the request path we happened to instrument.
 */
const withServiceWorkersBlocked = (options) => ({ ...(options ?? {}), serviceWorkers: 'block' });

/**
 * A context with the guard already installed, for tests that need more than one page.
 *
 * The guard comes from the run's surveillance rather than from a second installation, so a case that asks
 * for its own context still cannot get one without a boundary.
 */
export async function newGuardedContext(browser, options = {}) {
  const context = await browser.newContext(options);
  const guard = await installEgressGuard(context, options.egress);
  return { context, guard };
}

/** The kinds of problem a page can produce. An allowance has to name one of them. */
const PROBLEM_KINDS = ['console', 'pageerror', 'requestfailed'];

/**
 * Collects console errors, uncaught page errors and failed requests.
 *
 * A negative case is allowed to produce errors, but it has to name the one it expects: a filter that
 * accepts anything teaches the suite nothing.
 *
 * The three kinds are kept apart on purpose (FA8-04). One shared list of patterns, matched against every
 * kind, meant that an allowance written for a refused HTTP request also swallowed an uncaught `pageerror`
 * that merely contained the same word — so a case could fail loudly in the product and still report
 * green. An uncaught exception has to be declared as an uncaught exception to be tolerated.
 */
export function collectPageProblems(page, { label = 'page' } = {}) {
  const consoleErrors = [];
  const consoleWarnings = [];
  const failedRequests = [];
  const allowances = [];

  // The same list the run's surveillance is already writing to, and marked as this case's to interpret.
  // Sharing the list is what makes the two views agree: an exception this case allows is in the array it
  // was given, and the same exception is not reported again as unowned by the teardown.
  const watched = watchPage(page, { label });
  watched.explicit = true;
  const { pageErrors } = watched;

  page.on('console', (message) => {
    // Warnings are collected because the product reports some settled states there — "a temporary
    // refresh failure; keeping the current session" is how the app says it did *not* end the
    // session, which is a barrier a test can wait on instead of sleeping.
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('requestfailed', (request) => {
    // A request the guard refused is reported by the guard, not twice here.
    if (request.failure()?.errorText === 'net::ERR_BLOCKED_BY_CLIENT') return;
    failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`);
  });

  // Every problem as one shape, so an allowance can be matched against the kind and the request rather
  // than against a sentence that happens to contain a status code.
  const events = () => [
    ...consoleErrors.map((text) => ({ kind: 'console', text })),
    ...pageErrors.map((text) => ({ kind: 'pageerror', text })),
    ...failedRequests.map((text) => {
      const match = /^(\w+) (\S+) — (.+)$/.exec(text) || [];
      return { kind: 'requestfailed', text, method: match[1] || '', url: match[2] || '', errorText: match[3] || '' };
    })
  ];

  // An allowance may be a substring or a pattern, because "Network Error" is a literal axios string
  // while a stack of request URLs is not. `String.includes` throws on a RegExp, so both go through
  // the same test rather than only the one that happens to work.
  const matches = (text, pattern) => (pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern));

  /**
   * Reads the page and says what is outstanding — a pure function of the current event list (FR10-03).
   *
   * The old matcher advanced `allowance.matched` as it walked, so asking the question twice gave two
   * different answers: the second pass saw the allowance already full and reported every event as
   * undeclared. That is fine for a case that asks once and says nothing afterwards. It is not fine for a
   * teardown, which by definition has to ask again, after the case has finished and the page may have
   * produced something new since its own `expectClean()`.
   *
   * So nothing is consumed here. Each call re-derives which events are covered from the whole list, and
   * only then writes the resulting counts back so `allowedErrors` still reports them. Asking once during
   * the test and again at teardown is therefore two readings of the same state, not two rounds of
   * consumption — and an error raised after the case's own check is still covered by the question.
   */
  const evaluate = () => {
    const counts = new Map(allowances.map((allowance) => [allowance, 0]));
    const outstanding = [];

    for (const event of events()) {
      let covered = false;
      for (const allowance of allowances) {
        if ((counts.get(allowance) ?? 0) >= allowance.limit) continue;
        if (allowance.kind !== event.kind) continue;
        if (allowance.method && allowance.method !== event.method) continue;
        if (allowance.url && !matches(event.url, allowance.url)) continue;
        if (!matches(event.text, allowance.pattern)) continue;
        counts.set(allowance, counts.get(allowance) + 1);
        covered = true;
        break;
      }
      if (!covered) outstanding.push(event);
    }

    for (const allowance of allowances) allowance.matched = counts.get(allowance) ?? 0;

    const miscounted = allowances
      .filter((allowance) => {
        const floor = allowance.countMin ?? 0;
        const ceiling = allowance.countMax ?? Infinity;
        return allowance.matched < floor || allowance.matched > ceiling;
      })
      .map((allowance) => `allowance for ${allowance.kind} expected `
        + `[${allowance.countMin ?? 0}, ${allowance.countMax ?? '∞'}] but matched ${allowance.matched} (${allowance.reason})`);
    const unused = allowances
      .filter((allowance) => allowance.matched === 0 && (allowance.countMin ?? 0) > 0)
      .map((allowance) => `allowance for ${allowance.kind} never matched anything: ${allowance.pattern} (${allowance.reason})`);

    return { outstanding, miscounted, unused };
  };

  const render = (event) => `${event.kind}: ${event.text}`;

  /** The problems nobody declared, as `{ kind, text, … }` so a failure report can say which kind it was. */
  const problems = () => evaluate().outstanding;

  const collector = {
    consoleErrors,
    consoleWarnings,
    pageErrors,
    failedRequests,
    /**
     * Declares one expected problem, and exactly which kind of problem it is.
     *
     * `scope.kind` is required — that is the whole point. `method` and `url` narrow a failed-request
     * allowance to one specific request, so allowing the abort this case causes does not also excuse an
     * unrelated one. `count` states how many the case expects, so an allowance cannot quietly grow into
     * a blanket.
     *
     * The reason is mandatory and is never part of the match: it is there to be read, not to narrow the
     * pattern until the pattern happens to pass.
     *
     * @param {{kind: string, method?: string, url?: string|RegExp, count?: number}} scope
     * @param {string|RegExp} pattern
     * @param {string} reason
     */
    allowError(scope, pattern, reason) {
      if (typeof scope === 'string' || scope instanceof RegExp) {
        throw new TypeError(
          'an allowance must name the kind of problem it covers, e.g. { kind: "console" }. '
          + 'One pattern for every kind is how an unrelated page error gets excused by an HTTP allowance.'
        );
      }
      const { kind, method = null, url = null, count = null } = scope || {};
      if (!PROBLEM_KINDS.includes(kind)) {
        throw new TypeError(`an allowance must name the kind of problem it covers: one of ${PROBLEM_KINDS.join(', ')}`);
      }
      if (!reason) throw new Error('an expected error needs a reason, or it is just a filter');
      if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
        throw new TypeError('an allowance is a string or a RegExp');
      }
      if (pattern instanceof RegExp) {
        pattern = pattern.source.length > 400 ? new RegExp(pattern.source.slice(0, 400)) : pattern;
      }
      // A count may be a single number or a range `[atLeast, atMost]`. A range is for noise that is part
      // of the app's real behaviour but is *conditional* — the browser does not always log a refused
      // request, so a case that only sometimes trips it must be able to say "at most one" rather than
      // pretend it always happens. A single number is `[n, n]`; only a floor above zero makes "it never
      // happened" a failure, and the ceiling is what stops an allowance from quietly becoming a blanket.
      const [countMin, countMax] = Array.isArray(count)
        ? count
        : (count === null ? [0, null] : [count, count]);
      if (countMin !== null && (!Number.isInteger(countMin) || countMin < 0)) {
        throw new TypeError('an allowance count is a non-negative integer or a range of two of them');
      }
      if (countMax !== null && countMax !== Infinity && (!Number.isInteger(countMax) || countMax < countMin)) {
        throw new TypeError('an allowance count ceiling must be an integer at least the floor, or Infinity');
      }
      allowances.push({ kind, method, url, pattern, reason, count, countMin, countMax, matched: 0, limit: countMax ?? Infinity });
      return pattern;
    },
    get allowedErrors() {
      return allowances.map((allowance) => ({ ...allowance }));
    },
    problems,
    /**
     * The whole reading, without asserting it.
     *
     * The teardown uses this rather than `expectClean()` so it can add the finding to the run's own list
     * of boundary problems and say all of them at once. It is a plain function of the page's current state
     * and consumes nothing, so the case may call `expectClean()` first and the teardown still gets a full
     * and correct answer.
     */
    evaluate,
    /** Waits for the app to *say* something, which is a settlement signal rather than a duration. */
    async waitForWarning(pattern, { timeout = 25_000 } = {}) {
      await expect
        .poll(() => consoleWarnings.some((text) => pattern.test(text)),
          { timeout, message: `no console warning matched ${pattern}` })
        .toBe(true);
      return consoleWarnings.filter((text) => pattern.test(text));
    },
    expectClean() {
      // An allowance that declared a count and did not see it is a case that no longer does what it
      // says. An allowance with a floor of zero is admitting the noise is conditional, so seeing nothing
      // is not a failure — but the ceiling still is, because the same refusal is never legitimate twice.
      const { outstanding, miscounted, unused } = evaluate();

      expect([...outstanding.map(render), ...miscounted, ...unused],
        'the page produced problems that were not expected').toEqual([]);
    }
  };

  // The registry now holds this judgment, so the teardown can make it even if the case never asks. This is
  // the whole of FR10-03: attaching a collector is no longer a way to *stop* the run from checking.
  watched.collector = collector;

  return collector;
}

/** The writer lock the app serialises session writes with. One name, so the tests can query it. */
export const WRITER_LOCK = 'frontend-session-write:auth-session-record';

/**
 * The cross-tab refresh coordination lock.
 *
 * This cannot be imported from the product: the app's modules are browser ESM loaded by
 * `<script type="module">`, and Playwright's Node loader treats them as CommonJS. So the value is
 * restated here and *pinned* instead — `tests/regression/refresh-lock-pin.test.mjs` reads the product
 * source and fails if the two ever disagree. A hard-coded copy with nothing checking it would be a
 * barrier that silently stops observing anything the day the product renames its lock.
 *
 * Tests match on the prefix: the suffix is the identity and session, which a test should not have to
 * reconstruct to ask "is a rotation queued?".
 */
export const REFRESH_LOCK_PREFIX = 'frontend-refresh:';

/**
 * `navigator.locks.query()` from the page: what the browser says about held and queued lock requests.
 * This is the observable that replaces "wait a second and hope the request is queued".
 */
export const lockState = (page) => page.evaluate(async (name) => {
  if (!navigator.locks?.query) return { supported: false, held: 0, pending: 0 };
  const snapshot = await navigator.locks.query();
  const mine = snapshot.held.filter((entry) => entry.name === name);
  const queued = snapshot.pending.filter((entry) => entry.name === name);
  return {
    supported: true,
    held: mine.length,
    pending: queued.length,
    heldModes: mine.map((entry) => entry.mode),
    pendingModes: queued.map((entry) => entry.mode)
  };
}, WRITER_LOCK);

/** Waits until a lock request for the writer lock is genuinely queued in the browser. */
export async function waitForPendingWriterLock(page, { timeout = 20_000 } = {}) {
  await expect
    .poll(async () => (await lockState(page)).pending, { timeout, message: 'no writer-lock request became pending' })
    .toBeGreaterThan(0);
}

/** Waits until no writer-lock request is queued and none is held, i.e. the writer finished. */
export async function waitForWriterLockFree(page, { timeout = 30_000 } = {}) {
  await expect
    .poll(async () => {
      const state = await lockState(page);
      return state.pending + state.held;
    }, { timeout, message: 'a writer-lock request never finished' })
    .toBe(0);
}

/**
 * The control plane of the stand-in.
 *
 * Every call is refused loudly if the base is not a loopback test endpoint: the Node side of a browser
 * run has the same reachability the page does, and an unguarded `fetch` here would be exactly the hole
 * the browser guard closes.
 */
export function controlPlane({ base = API_ORIGIN } = {}) {
  const parsed = new URL(base);
  if (!isLoopback(parsed.hostname)) {
    throw new Error(`the control plane may only address a loopback test endpoint, not ${base}`);
  }

  const post = async (path, patch) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch ?? {})
    });
    if (!response.ok) throw new Error(`control ${path} answered ${response.status}`);
    return response.json();
  };

  return {
    base,
    reset: () => post('/__fake/reset'),
    setConfig: (patch) => post('/__fake/config', patch),
    /** Holds matching responses open until released, so nothing in a test has to guess a duration. */
    hold: (routes) => post('/__fake/hold', { routes }),
    release: (routes) => post('/__fake/release', { routes }),
    requests: async () => (await (await fetch(`${base}/__fake/requests`)).json()).requests,
    /** What the peer has finished answering, as `{ method, path, status }`. */
    completed: async () => (await (await fetch(`${base}/__fake/completed`)).json()).completed,
    sessions: async () => (await (await fetch(`${base}/__fake/sessions`)).json()).sessions,
    held: async () => (await (await fetch(`${base}/__fake/held`)).json()),
    ready: async () => (await (await fetch(`${base}/__fake/ready`)).json())
  };
}

/* ------------------------------------------------------------------------------------------------
 * The session helpers every browser spec needs.
 *
 * These lived in `session-invariants.spec.mjs` and were copied into `session-flow.spec.mjs`, which is
 * how the two files ended up disagreeing about what "signed in" means. They are here now so that a
 * browser spec cannot get a weaker boundary than the suite next to it: one record key, one DOM
 * definition of signed in, one way to hold a lock, one set of collectors.
 * ---------------------------------------------------------------------------------------------- */

/** The one canonical record, and the per-key mirror older code still reads. */
export const RECORD_KEY = 'auth-session-record';
export const LEGACY_KEYS = ['user', 'token', 'expires_at', 'refresh_token', 'refresh_expires_at'];
export const noLegacyBearers = Object.fromEntries(LEGACY_KEYS.map((key) => [key, null]));

export const readSessionRecord = (page) => page.evaluate((key) => {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}, RECORD_KEY);

export const readLegacyKeys = (page) => page.evaluate((keys) => (
  Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(key)]))
), LEGACY_KEYS);

export const readApiBaseUrl = (page) => page.evaluate(() => window.localStorage.getItem('api-base-url'));

/**
 * Waits for a condition on the stored record.
 *
 * The predicate is serialised into the page, so it takes everything it needs as an argument: one that
 * closed over a test variable would be evaluated against `undefined` over there, which is a confusing
 * way to be told "not defined".
 */
export const waitForRecord = (page, predicate, arg = null) => page.waitForFunction(
  ({ key, source, expected }) => {
    const raw = window.localStorage.getItem(key);
    const record = raw === null ? null : JSON.parse(raw);
    // eslint-disable-next-line no-new-func
    return new Function('record', 'arg', `return (${source})(record, arg);`)(record, expected);
  },
  { key: RECORD_KEY, source: predicate.toString(), expected: arg },
  { timeout: 25_000 }
);

export const isState = (state) => (record, arg) => record?.state === arg;
export const versionAbove = (record, arg) => Number.isInteger(record?.version) && record.version > arg;
export const noUsableSession = (record) => record?.state !== 'active' || !record?.accessToken;

/**
 * Points the app at the loopback API and switches the shipped mock adapter off.
 *
 * `requestTimeoutMs` exists for the cases that hold a response open on purpose: the app's own request
 * timeout is 15s, and a hold that outlasts it is answered by the *client* giving up, not by the peer —
 * which would quietly turn "a late answer arrived" into "the client timed out first".
 */
export const useLiveApi = (page, apiBase = API_ORIGIN, { requestTimeoutMs = null } = {}) => page.addInitScript(({ base, timeout }) => {
  window.localStorage.setItem('api-base-url', base);
  window.localStorage.setItem('mock-api', 'false');
  if (timeout) window.localStorage.setItem('api-request-timeout-ms', String(timeout));
}, { base: apiBase, timeout: requestTimeoutMs });

/** Waits for the app to have booted far enough to have read its configuration. */
export const waitForApp = (page) => page.waitForFunction(
  () => document.body && document.body.innerText.length > 0 && window.localStorage.getItem('api-base-url') !== null,
  null,
  { timeout: 45_000 }
);

/** The DOM state that means "this tab has a session", and the one that means it does not. */
export const expectSignedIn = async (page) => {
  await expect(page.getByTestId('user-menu-toggle').first()).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('button[title]', { hasText: /login|đăng nhập/i }).first()).toBeHidden();
};

export const expectSignedOut = async (page) => {
  await expect(page.getByTestId('user-menu-toggle')).toHaveCount(0, { timeout: 25_000 });
  await expect(page.locator('button[title]', { hasText: /login|đăng nhập/i }).first()).toBeVisible();
};

/**
 * Who the signed-in DOM says it is.
 *
 * "Signed in" as an icon is not an identity: a tab can render a user menu for a session it does not own,
 * which is the exact failure a cross-tab case has to catch. So the name comes off the toggle and the
 * email out of the panel it opens, and the menu is closed again — a later `logoutViaUi` clicks that same
 * toggle, which would close an open menu instead of opening it.
 */
export const signedInUser = async (page) => {
  const toggle = page.getByTestId('user-menu-toggle').first();
  await expect(toggle).toBeVisible({ timeout: 25_000 });
  const name = String((await toggle.getAttribute('title')) ?? '');

  await toggle.click();
  // The panel has no test id of its own, so the email is the one line in it that looks like an email.
  const emailLine = page.locator('div.truncate').filter({ hasText: /@/ }).last();
  await emailLine.waitFor({ state: 'visible', timeout: 15_000 });
  const email = String(await emailLine.innerText()).trim();
  await toggle.click();
  await emailLine.waitFor({ state: 'hidden', timeout: 15_000 });

  return { name, email };
};

export const logoutViaUi = async (page) => {
  await page.getByTestId('user-menu-toggle').first().click({ timeout: 20_000 });
  await page.getByTestId('logout-menu-item').first().click();
  await page.getByTestId('confirm-modal-confirm').click();
};

/**
 * Fills in the real login form and waits for the record, without navigating.
 *
 * A test that needs to sign in *while something else is in flight* must not reload: a reload destroys
 * the very promise it is trying to race. The modal may already be open (the app opens it when a
 * session ends), so both paths are handled.
 */
export async function submitLoginForm(page, { email = 'browser@example.test', password = 'fake-password' } = {}) {
  const emailField = page.locator('#email');
  if (!(await emailField.isVisible().catch(() => false))) {
    await page.locator('button[title]', { hasText: /login|đăng nhập/i }).first().click();
    await emailField.waitFor({ state: 'visible', timeout: 30_000 });
  }
  await emailField.fill(email);
  await page.locator('#password').fill(password);
  await page.getByTestId('login-submit').click();
  await waitForRecord(page, isState('active'), 'active');
  await expectSignedIn(page);
}

export async function signIn(page, { expired = false, ...credentials } = {}) {
  // An already-expired access token is what puts the app on the refresh path, instead of a test that
  // waits an hour for the clock to do it.
  if (expired) await setFixtureConfig({ accessTtlSeconds: -60 });
  await page.goto('/');
  await waitForApp(page);
  await submitLoginForm(page, credentials);
}

/**
 * Holds the writer lock from another tab, for real.
 *
 * The point is not a fake queue: a second page of the same origin really does hold the browser's
 * writer lock, and the session writer in the first page really does wait on it. The flag is set only
 * once the lock is granted, so "waiting" is never confused with "has not started yet".
 */
export async function holdWriterLock(page) {
  await page.evaluate((name) => new Promise((resolve) => {
    navigator.locks.request(name, () => new Promise((release) => {
      window.__releaseWriterLock = release;
      window.__writerLockHeld = true;
      resolve();
    }));
  }), WRITER_LOCK);
  await page.waitForFunction(() => window.__writerLockHeld === true, null, { timeout: 10_000 });
}

export const releaseWriterLock = (page) => page.evaluate(() => {
  if (window.__releaseWriterLock) window.__releaseWriterLock();
  window.__writerLockHeld = false;
});

/**
 * Counts `storage` events per key in the page.
 *
 * Adoption is a *read*, so a tab that observed a tombstone must not write one. "It did not write" has
 * no positive signal to wait for, but it has a countable one: this tab's own writes are not events,
 * while another tab's are — so the number of events a key received is the number of writes that
 * happened, and "exactly one" is an assertion rather than a sleep.
 */
export async function installStorageWatcher(page) {
  await page.addInitScript(() => {
    window.__storageEvents = Object.create(null);
    window.addEventListener('storage', (event) => {
      if (!event || !event.key) return;
      window.__storageEvents[event.key] = (window.__storageEvents[event.key] || 0) + 1;
      (window.__storageEventLog ||= []).push({ key: event.key, newValue: event.newValue });
    });
  });
  return {
    count: (key) => page.evaluate((k) => window.__storageEvents?.[k] ?? 0, key),
    log: () => page.evaluate(() => window.__storageEventLog ?? [])
  };
}

/** The default stand-in control plane, for specs that address the loopback API directly. */
export const control = controlPlane({ base: API_ORIGIN });
export const setFixtureConfig = (patch) => control.setConfig(patch);

/** A request the stand-in has received. "The server saw it" is not a guess. */
export const waitForFixtureRequest = (path, { control: plane = control } = {}) => expect
  .poll(async () => (await plane.requests()).some((entry) => entry.path === path),
    { timeout: 20_000, message: `the stand-in never received ${path}` })
  .toBe(true);

/** A response the stand-in has finished sending. */
export const waitForFixtureResponse = (path, status, { control: plane = control } = {}) => expect
  .poll(async () => (await plane.completed()).some((entry) => entry.path === path && (status === undefined || entry.status === status)),
    { timeout: 20_000, message: `the stand-in never finished answering ${path}` })
  .toBe(true);

/**
 * Parks a response **in the browser**, before it reaches the peer.
 *
 * The peer's own hold answers late but keeps the peer's request open, which is not the same thing: the
 * peer's request is already being handled, so anything with a deadline on the client side — a request
 * timeout, a lock lease, a single-flight window — expires while the answer is parked, and the case ends
 * up measuring the client's impatience instead of the race. Parking at the browser means the peer has
 * not seen the request at all, so "the client is waiting" and "the peer has answered" are two separate,
 * separately observable states.
 *
 * @returns {{parked: () => Array, waitForParked: (fragment?: string) => Promise<Array>, release: () => Promise<number>}}
 */
export async function holdBrowserResponse(context, pathFragment) {
  const parked = [];
  let releasing = false;
  const waiters = [];

  const settle = () => {
    while (waiters.length > 0) waiters.shift()();
  };

  await context.route(`**${pathFragment}**`, async (route) => {
    if (releasing) {
      // After a release the route is transparent: the egress guard is the only thing left in the chain.
      await route.fallback();
      return;
    }
    parked.push(route);
    settle();
  });

  return {
    parked: () => [...parked],
    /** Resolves once a request matching the fragment is parked, i.e. the client is waiting for it. */
    async waitForParked(fragment = pathFragment) {
      if (parked.some((route) => route.request().url().includes(fragment))) return parked;
      await new Promise((resolve) => waiters.push(resolve));
      return parked;
    },
    async release() {
      releasing = true;
      const held = parked.splice(0, parked.length);
      for (const route of held) await route.fallback();
      return held.length;
    }
  };
}
