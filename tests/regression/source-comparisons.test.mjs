import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as identity from '../../tools/frontend-source-identity.mjs';
const file=path=>({path,kind:'file',mode:'100644',size:1,sha256:'a'.repeat(64)});
const manifest=files=>({schema:identity.IDENTITY_SCHEMA,fileCount:files.length,digest:identity.digestOf(files),files});
test('N8: report-only comparison allows exactly handoff, matrix and execution log',()=>{
  assert.equal(typeof identity.compareSourceManifests,'function');
  for(const [path,classification] of [
    ['reports/FRONTEND-HANDOFF.vi.md','REPORT_ONLY'],
    ['reports/FRONTEND-FINDING-MATRIX.tsv','REPORT_ONLY'],
    ['reports/FRONTEND-EXECUTION-LOG.vi.md','REPORT_ONLY'],
    ['reports/other.md','SOURCE_CHANGE'],['tools/gate.mjs','SOURCE_CHANGE'],['tests/package-lock.json','SOURCE_CHANGE']
  ]) {
    const before=manifest([file(path)]),after=manifest([{...file(path),sha256:'b'.repeat(64)}]);
    assert.deepEqual(identity.compareSourceManifests('run-1',before,after),{fromRunId:'run-1',fromDigest:before.digest,toDigest:after.digest,changedPaths:[path],classification});
  }
});
test('N8: additions/deletions/modes are computed, not supplied classification',()=>{
  assert.equal(typeof identity.compareSourceManifests,'function');
  const before=manifest([file('assets/a.js'),file('tools/a.sh')]);
  const after=manifest([file('assets/b.js'),{...file('tools/a.sh'),mode:'100755'}]);
  assert.deepEqual(identity.compareSourceManifests('run-2',before,after).changedPaths,['assets/a.js','assets/b.js','tools/a.sh']);
});
test('N8: comparison document refuses invented paths, classification, identity and missing run',()=>{
  assert.equal(typeof identity.verifySourceComparisons,'function');
  const before=manifest([file('assets/a.js')]),after=manifest([{...file('assets/a.js'),size:2}]);
  const entry=identity.compareSourceManifests('run-1',before,after);
  const valid={schema:'frontend-source-comparisons/1',entries:[entry]};
  assert.doesNotThrow(()=>identity.verifySourceComparisons(valid,new Map([['run-1',before]]),after));
  for(const patch of [{changedPaths:[]},{classification:'REPORT_ONLY'},{toDigest:'a'.repeat(64)},{fromRunId:'missing'}]) {
    assert.throws(()=>identity.verifySourceComparisons({...valid,entries:[{...entry,...patch}]},new Map([['run-1',before]]),after));
  }
});
