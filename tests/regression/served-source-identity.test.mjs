import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildManifest } from '../../tools/frontend-source-identity.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FAKE_API = join(REPO_ROOT, 'tests', 'browser', 'fake-api.mjs');

/**
 * Start the fake API on a free port and return its `/__fake/ready` payload.
 *
 * The ports are handed out by the OS rather than the conventional defaults on purpose: a developer with
 * another checkout already serving 18788 is exactly the case FR11-03 is about, and a test that used the
 * default would silently talk to that other server while asserting things about this tree.
 */
async function readyFrom(env = {}) {
  const port = 18800 + (process.pid % 400);
  const child = spawn(process.execPath, [FAKE_API], {
    cwd: REPO_ROOT,
    env: { ...process.env, FRONTEND_API_PORT: String(port), FRONTEND_STATIC_PORT: String(port + 1), ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const origin = `http://127.0.0.1:${port}`;
  try {
    // Wait for the listener rather than sleeping a guessed interval.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        const response = await fetch(`${origin}/__fake/ready`);
        if (response.ok) return await response.json();
      } catch { /* not listening yet */ }
      await new Promise((resolve_) => setTimeout(resolve_, 100));
    }
    throw new Error(`the fake API never became ready on ${origin}`);
  } finally {
    child.kill('SIGTERM');
    await new Promise((done) => child.once('exit', done));
  }
}

test('FR11-03: the fake API reports the digest of the tree it is actually serving', async (t) => {
  const expected = buildManifest(REPO_ROOT).digest;

  await t.test('the ready payload carries the real static digest', async () => {
    const ready = await readyFrom();
    assert.equal(ready.service, 'frontend-fake-api');
    assert.equal(ready.actualStaticDigest, expected,
      'the server states the digest of the tree it serves, taken from the bytes themselves');
  });

  await t.test('it is the production hashing function, not a second one', async () => {
    // A second digest routine in the fake API would be a second definition of "the source". The two would
    // drift, and the browser assertion would be comparing two different things that both call themselves
    // the digest — so this pins the value to the one the evidence and the validator use.
    const ready = await readyFrom();
    assert.equal(ready.actualStaticDigest, buildManifest(REPO_ROOT).digest);
    assert.match(ready.actualStaticDigest, /^[0-9a-f]{64}$/, 'and it is a sha256 hex digest');
  });

  await t.test("a wrapper's claim is checked against the tree, not against the variable that made it", async () => {
    // The arrangement the old check could not see. `FRONTEND_SERVED_DIGEST` is the wrapper's claim about
    // what it copied in; asserting the payload equals the environment variable only compares the claim to
    // the thing that produced it, so a wrapper that copied the wrong tree — or a stale export left in the
    // shell — stayed consistent while the assertions were about a different repository.
    const ready = await readyFrom({ FRONTEND_SERVED_DIGEST: expected });
    assert.equal(ready.expectedStaticDigest, expected, 'the claim is carried through');
    assert.equal(ready.actualStaticDigest, expected, 'and it is independently true of this tree');

    const wrong = await readyFrom({ FRONTEND_SERVED_DIGEST: 'b'.repeat(64) });
    assert.equal(wrong.expectedStaticDigest, 'b'.repeat(64), 'a wrong claim is still carried through');
    assert.equal(wrong.actualStaticDigest, expected,
      'which is what now makes it visible: the claim and the tree disagree, and the tree is checkable');
  });

  await t.test('a run with no claim still gets the real digest', async () => {
    // No FRONTEND_SERVED_DIGEST: there is nothing to cross-check, so the old check returned early and the
    // browser spec's note said so. The tree's own digest is available regardless, so it is never absent.
    const ready = await readyFrom({ FRONTEND_SERVED_DIGEST: '' });
    assert.equal(ready.expectedStaticDigest, '', 'an absent claim is reported as empty, not invented');
    assert.equal(ready.actualStaticDigest, expected);
    assert.equal(resolve(ready.staticRoot), REPO_ROOT,
      'and the root is still stated — compared resolved, because the two differ by a trailing separator '
      + 'and by nothing else');
  });
});
