import {test} from 'node:test';
import assert from 'node:assert/strict';
import {outcomeFromLog} from '../../tools/validate-reports.mjs';
for(const prefix of ['#','ℹ']) test(`Node summary ${prefix} records actual outcomes`,()=>{
  const text=['tests 5','pass 2','fail 1','skipped 1','cancelled 1'].map(s=>`${prefix} ${s}`).join('\n');
  assert.deepEqual(outcomeFromLog(text,'node'),{tests:5,pass:2,fail:1,skipped:1,cancelled:1,sawSummary:true});
});
