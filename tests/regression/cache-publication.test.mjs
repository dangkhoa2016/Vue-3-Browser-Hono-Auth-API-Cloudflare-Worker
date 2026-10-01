import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {installKey,prepareInstall,verifyInstall} from '../../tools/browser-gate-env.mjs';
const moduleUrl=new URL('../../tools/browser-gate-env.mjs',import.meta.url).href;
const install = root => {
  mkdirSync(join(root,'node_modules/alpha'),{recursive:true});
  writeFileSync(join(root,'node_modules/alpha/package.json'),'{"version":"1.0.0","main":"index.js"}');
  writeFileSync(join(root,'node_modules/alpha/index.js'),'module.exports=1;');
};
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'cache-publish-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'tests'));
  writeFileSync(join(root,'tests/package.json'),'{"name":"fixture"}');
  writeFileSync(join(root,'tests/package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'':{name:'fixture'},'node_modules/alpha':{version:'1.0.0'}}}));
  return {root,cache:join(root,'cache'),key:installKey(root)};
}

test('FR12-01: concurrent prepare publishes only verified install; reader and loser preserve winner',async t=>{
  const {root,cache,key}=fixture(t);
  const ready=join(root,'ready'),release=join(root,'release');
  const script=`import {prepareInstall} from ${JSON.stringify(moduleUrl)};import {mkdirSync,writeFileSync,existsSync} from 'node:fs';import {join} from 'node:path';
    prepareInstall(process.argv[1],process.argv[2],process.argv[3],{installer(root){
      writeFileSync(process.argv[4],'ready');console.log('READY');
      const deadline=Date.now()+10000;while(!existsSync(process.argv[5])){if(Date.now()>deadline)throw Error('fixture timed out');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);}
      (${install.toString()})(root);
    }});`;
  const child=spawn(process.execPath,['--input-type=module','-e',script,cache,key,root,ready,release],{stdio:['ignore','pipe','pipe']});
  t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
  const done=once(child,'exit');let errors='';child.stderr.on('data',b=>errors+=b);
  await once(child.stdout,'data');
  assert.equal(readFileSync(ready,'utf8'),'ready');
  assert.equal(verifyInstall(cache,key).state,'absent');
  assert.throws(()=>prepareInstall(cache,key,root,{installer:install}),/busy|lock/);
  assert.equal(existsSync(cache),false);
  writeFileSync(release,'go');
  assert.deepEqual(await done,[0,null],errors);
  assert.equal(verifyInstall(cache,key).state,'current');
  assert.equal(prepareInstall(cache,key,root,{installer(){throw Error('must not reinstall');}}).built,false);
});

test('FR12-01: crashed builder leaves no published partial install and future readers refuse boundedly',async t=>{
  const {root,cache,key}=fixture(t);
  const child=spawn(process.execPath,['--input-type=module','-e',`import {prepareInstall} from ${JSON.stringify(moduleUrl)};prepareInstall(process.argv[1],process.argv[2],process.argv[3],{installer(){console.log('READY');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10000);}});`,cache,key,root],{stdio:['ignore','pipe','pipe']});
  const done=once(child,'exit');await once(child.stdout,'data');child.kill('SIGKILL');await done;
  assert.equal(verifyInstall(cache,key).state,'absent');
  assert.throws(()=>prepareInstall(cache,key,root,{installer:install}),/busy|lock/);
  assert.equal(existsSync(cache),false);
});

test('FR12-01: missing main entrypoint and changed manifest are stale',t=>{
  const {root,cache,key}=fixture(t);prepareInstall(cache,key,root,{installer:install});
  rmSync(join(cache,'node_modules/alpha/index.js'));
  assert.equal(verifyInstall(cache,key).state,'stale');
  install(cache);writeFileSync(join(cache,'package.json'),'{"name":"tampered"}');
  assert.equal(verifyInstall(cache,key).state,'stale');
});

test('review N3: undeclared nested resolution package is stale',t=>{
  const {root,cache,key}=fixture(t);prepareInstall(cache,key,root,{installer:install});
  const shadow=join(cache,'node_modules/alpha/node_modules/beta');
  mkdirSync(shadow,{recursive:true});writeFileSync(join(shadow,'package.json'),'{"version":"99.0.0"}');
  writeFileSync(join(shadow,'index.js'),'module.exports=99;');
  assert.equal(verifyInstall(cache,key).state,'stale');
});
test('review N3: metadata edit cannot hide deleted published entrypoint',t=>{
  const {root,cache,key}=fixture(t);prepareInstall(cache,key,root,{installer:install});
  rmSync(join(cache,'node_modules/alpha/index.js'));
  writeFileSync(join(cache,'node_modules/alpha/package.json'),'{"version":"1.0.0","exports":{}}');
  assert.equal(verifyInstall(cache,key).state,'stale');
});

test('review N3: directory symlinks cannot conceal transitive escapes',t=>{
  const {root,cache,key}=fixture(t);prepareInstall(cache,key,root,{installer:install});
  mkdirSync(join(cache,'payload'));writeFileSync(join(root,'outside'),'fixture');
  symlinkSync(join(root,'outside'),join(cache,'payload/secret'));
  symlinkSync('../../payload',join(cache,'node_modules/alpha/data'));
  assert.equal(verifyInstall(cache,key).state,'stale');
});
test('review N3: directory alias cannot suppress nested graph verification',t=>{
  const {root,cache,key}=fixture(t);prepareInstall(cache,key,root,{installer:install});
  const shadow=join(cache,'node_modules/alpha/node_modules/beta');
  mkdirSync(shadow,{recursive:true});writeFileSync(join(shadow,'package.json'),'{"version":"99.0.0"}');
  writeFileSync(join(shadow,'index.js'),'module.exports=99;');
  symlinkSync('node_modules',join(cache,'node_modules/alpha/data'));
  assert.equal(verifyInstall(cache,key).state,'stale');
});
