/**
 * FR10-07 — the browser run must be against the tree the evidence names.
 *
 * The browser gate runs against a frozen copy, and the static server is started by Playwright from
 * `fake-api.mjs`, whose root is derived from its own location. So the copy is what gets served — but the
 * wrapper started no server, both ports are fixed conventional defaults, and Playwright is told to start
 * the server rather than to reuse one. On a machine where something else already holds 4173, the
 * start-up fails or, worse, a developer serving another checkout is what the browser loads. Every hash in
 * the evidence is then correct, and the evidence describes a source that was never tested.
 *
 * This spec is the closing of that gap, and it is deliberately cheap: it asserts the served bytes against
 * the files in the tree the spec is itself running from. If the two agree, the thing under test is the
 * thing that was hashed; if a server on another root answers, this fails before any behavioural assertion
 * can quietly pass against the wrong code.
 */

import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

import { buildManifest } from '../../tools/frontend-source-identity.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { API_ORIGIN } from './helpers/browser-fixture.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The control plane lives on the *API* port, not on `baseURL`.
 *
 * `baseURL` is the static server, and the static server answers any path it does not recognise with
 * `index.html` — which is the right thing for a single-page app and a trap for an identity check: asking
 * the static port for `/__fake/ready` returns the application's HTML with a 200, so a spec that reads it as
 * JSON gets a parse error and learns nothing, or worse, gets a truthy object and asserts against nothing.
 */
const readyEndpoint = () => new URL('/__fake/ready', API_ORIGIN).toString();

/**
 * Files the app actually loads on its first request, taken from `index.html`.
 *
 * Taken from the real entry points rather than invented: a sentinel that nothing requests would be served
 * correctly by a server whose root is wrong in every way that matters, because a wrong root 404s and a
 * 404 is not this file's content. These three are what the page asks for, so serving the wrong tree
 * cannot produce the right bytes.
 */
const SENTINELS = ['index.html', 'assets/js/init.js', 'assets/css/loader.css'];

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

test.describe('the served source is the tree under test (FR10-07)', () => {
  test('the server states the root it is serving, and it is this tree', async ({ request }) => {
    const ready = await (await request.get(readyEndpoint())).json();

    expect(ready.service).toBe('frontend-fake-api');
    // Compared resolved, because the two can legitimately differ by a trailing separator and by nothing
    // else. A path that differs in any other way is a different tree.
    expect(path.resolve(ready.staticRoot)).toBe(path.resolve(REPO_ROOT));
  });

  test('what the server returns is what is in this tree, byte for byte', async ({ request, baseURL }) => {
    for (const relative of SENTINELS) {
      const expected = readFileSync(path.join(REPO_ROOT, relative));
      const response = await request.get(new URL(`/${relative}`, baseURL).toString());

      expect(response.status(), `${relative} is served`).toBe(200);
      // The header is the server's own claim; the body is the check. Both, so a server that reports one
      // root and serves another cannot pass.
      //
      // Both sides are resolved: the root comes from `new URL('../../', …)`, which keeps the trailing
      // slash, while `path.resolve` drops it. They are the same directory and comparing them as strings
      // would fail on that one character.
      expect(path.resolve(response.headers()['x-served-root'] ?? ''), `${relative} is served from this tree`)
        .toBe(path.resolve(REPO_ROOT));
      expect(sha256(await response.body()), `${relative} is served with these bytes`)
        .toBe(sha256(expected));
    }
  });

  test('the identity the wrapper recorded is the identity this tree has', async ({ request }) => {
    // Only meaningful for a run launched through `run-browser-gate.sh`, which exports the digest of the
    // copy it made. A bare `npm run test:browser` has no such claim to check, so the test states that
    // rather than passing on an absent value.
    const ready = await (await request.get(readyEndpoint())).json();
    const expected = process.env.FRONTEND_SERVED_DIGEST;

    test.skip(!expected, 'NOT_RUN: no wrapper expected identity was provided');
    expect(ready.expectedStaticDigest).toBe(expected);
  });

  test('the digest the server reports is the digest of the tree it is serving', async ({ request }) => {
    // The check the other one could not make (FR11-03).
    //
    // `expectedStaticDigest` is the wrapper's claim about what it copied in. Asserting it equals the
    // environment variable only checks the claim against the thing that made it: a wrapper that copied
    // the wrong tree, a stale `FRONTEND_SERVED_DIGEST` left over in the shell, or another checkout's
    // server already holding port 4173 all produce a run whose claim is self-consistent while the
    // assertions are about a different repository than the reports will name. Every hash in the
    // evidence would still be correct.
    //
    // So the server also reports what it is *actually* serving, hashed by the same `buildManifest` the
    // evidence and the validator use. The two are compared here, and the comparison is done against the
    // tree this spec is running from — so a server on the wrong root fails the suite instead of quietly
    // testing something else.
    const ready = await (await request.get(readyEndpoint())).json();
    const served = buildManifest(REPO_ROOT).digest;

    expect(ready.actualStaticDigest, 'the server states the digest of the tree it serves')
      .toBe(served);

    // And, when there is a claim to check, the claim is the fact — not merely a second consistent story.
    const expected = process.env.FRONTEND_SERVED_DIGEST;
    if (expected) {
      expect(ready.expectedStaticDigest,
        'the digest the wrapper recorded is the digest of what is actually being served')
        .toBe(served);
    }
  });
});
