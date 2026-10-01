import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const helper=new URL('../../tools/frontend-gate-deadline.mjs',import.meta.url).pathname;
test('cancelling deadline supervisor terminates producer group',async t=>{
 const root=mkdtempSync(join(tmpdir(),'deadline-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const child=spawn(process.execPath,[helper,'30',join(root,'marker'),process.execPath,'-e','console.log(process.pid);setInterval(()=>{},1000)'],{stdio:['ignore','pipe','pipe']});
 const done=once(child,'exit');const [line]=await once(child.stdout,'data');const producer=Number(String(line).trim());
 t.after(()=>{try{process.kill(-producer,'SIGKILL');}catch{}});
 child.kill('SIGTERM');await done;
 assert.throws(()=>process.kill(producer,0),{code:'ESRCH'});
 assert.equal(existsSync(join(root,'marker')),false);
});
test('unsupported deadline cannot overflow into immediate expiry',()=>{
 const result=spawnSync(process.execPath,[helper,'2147484','/tmp/unused-deadline-marker',process.execPath,'-e','setInterval(()=>{},1000)'],{timeout:2000});
 assert.equal(result.status,2);
});
