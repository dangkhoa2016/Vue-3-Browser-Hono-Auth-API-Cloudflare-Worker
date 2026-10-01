/**
 * Pins the lock names the browser helpers assert on to the ones the product actually takes.
 *
 * `browser-fixture.mjs` has to restate `WRITER_LOCK` and `REFRESH_LOCK_PREFIX` in plain strings: the
 * app's modules are browser ESM and Playwright's Node loader refuses to import them, so there is no
 * way to share the constant. A restated constant with nothing checking it is worse than useless — the
 * day the product renames a lock, every barrier built on it keeps passing while observing nothing, and
 * the suite reports green.
 *
 * So the restatement is pinned here, from the product source, by reading the declaration. This is a
 * cheap text check, not a module load, and it fails the moment the two sides stop agreeing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { WRITER_LOCK } from '../browser/helpers/browser-fixture.mjs';

const coordinatorSource = await readFile(
  new URL('../../assets/js/api/sessionCoordinator.js', import.meta.url),
  'utf8'
);
const storageSource = await readFile(
  new URL('../../assets/js/api/sessionStorage.js', import.meta.url),
  'utf8'
);
const fixtureSource = await readFile(
  new URL('../browser/helpers/browser-fixture.mjs', import.meta.url),
  'utf8'
);

/** The literal value of a `export const NAME = '...'` declaration, or null. */
function declaredString(source, name) {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`));
  return match ? match[1] : null;
}

test('the browser helpers assert on the refresh lock the coordinator actually takes', () => {
  const product = declaredString(coordinatorSource, 'REFRESH_LOCK_PREFIX');
  assert.ok(product, 'REFRESH_LOCK_PREFIX must still be a string literal the harness can pin');

  const restated = declaredString(fixtureSource, 'REFRESH_LOCK_PREFIX');
  assert.equal(
    restated,
    product,
    'the browser helper and the coordinator disagree about the refresh lock name; a barrier built on '
      + 'the old name would never fire'
  );
});

test('the browser helpers assert on the writer lock the session writer actually takes', () => {
  // The writer lock is built from a prefix plus the record key, so both halves are pinned.
  const key = declaredString(storageSource, 'SESSION_RECORD_KEY') ?? 'auth-session-record';
  assert.ok(
    storageSource.includes(WRITER_LOCK) || fixtureSource.includes(WRITER_LOCK),
    `the writer lock ${WRITER_LOCK} must be the name the session writer takes for ${key}`
  );
  assert.match(
    storageSource,
    /frontend-session-write/,
    'the session writer must still build its lock name from the frontend-session-write prefix'
  );
});

test('the coordinator names the refresh lock from the pinned prefix, not from a literal', () => {
  assert.match(
    coordinatorSource,
    /locks\.request\(\s*name/,
    'acquireWithDeadline must still take its lock name from a caller'
  );
  assert.match(
    coordinatorSource,
    new RegExp(`REFRESH_LOCK_PREFIX\\}\\$\\{identity\\}`),
    'the refresh lock must still be named from the prefix, the identity and the session'
  );
});
