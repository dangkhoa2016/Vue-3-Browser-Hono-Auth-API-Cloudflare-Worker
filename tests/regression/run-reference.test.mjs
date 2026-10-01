import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRunReference } from '../../tools/validate-reports.mjs';
const stamp='20260929T134719Z-1';
const runs=[{runId:`static-${stamp}`,tier:'static'},{runId:`unit-${stamp}`,tier:'unit'}];
test('N8 full run label disambiguates simultaneous static and unit evidence',()=>{
  assert.equal(resolveRunReference(runs,stamp,`unit 437/437 from unit-${stamp}`),runs[1]);
});
test('N8 timestamp alone cannot select arbitrarily between runs',()=>{
  assert.equal(resolveRunReference(runs,stamp,`unit 437/437 from ${stamp}`),null);
  assert.equal(resolveRunReference([runs[1]],stamp,stamp),runs[1]);
});
