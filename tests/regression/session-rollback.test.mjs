import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStorage,createBrowserEnv,loadModule} from './helpers/browser-env.mjs';
import {bootApp,NOW_SECONDS,ACCESS_TTL,REFRESH_TTL} from './helpers/app-harness.mjs';

test('N7: coordinated new-old-new cleanup removes only auth keys and prevents legacy resurrection',async t=>{
  const module=loadModule('assets/js/api/sessionStorage.js',createBrowserEnv());
  assert.equal(typeof module.invalidateAuthForRollback,'function');
  for(const oldBehavior of ['logout','rotation','user replacement','partial mirrors','invalid canonical','ended']) await t.test(oldBehavior,async()=>{
    const storage=createStorage({'api-base-url':'https://api.example.test/base','theme':'dark','locale':'vi','unrelated-token':'keep'});
    const fresh=bootApp({storage});
    assert.equal((await fresh.auth.commitLogin({user:{id:1},accessToken:'NEW_ACCESS',refreshToken:'NEW_REFRESH',expiresAt:NOW_SECONDS+ACCESS_TTL,refreshExpiresAt:NOW_SECONDS+REFRESH_TTL},fresh.auth.beginLoginAttempt())).status,'applied');
    assert.equal(module.invalidateAuthForRollback(storage).status,'cleared');
    // Old tabs are closed before downgrade. Model the old version's legacy writes, never concurrent mixed versions.
    if(oldBehavior!=='logout') {
      storage.setItem('user',JSON.stringify({id:2}));storage.setItem('token','OLD_ACCESS');
      if(oldBehavior!=='partial mirrors') {storage.setItem('refresh_token','OLD_REFRESH');storage.setItem('expires_at',String(NOW_SECONDS+ACCESS_TTL));}
    }
    if(oldBehavior==='invalid canonical')storage.setItem('auth-session-record','{bad');
    if(oldBehavior==='ended')storage.setItem('auth-session-record',JSON.stringify({schema:2,state:'ended'}));
    // Close old tabs and invalidate auth again before re-upgrade.
    assert.equal(module.invalidateAuthForRollback(storage).status,'cleared');
    for(const key of ['auth-session-record','auth-api-identity','api-identity','user','token','refresh_token','expires_at','refresh_expires_at'])assert.equal(storage.getItem(key),null,key);
    assert.equal(storage.getItem('api-base-url'),'https://api.example.test/base');
    assert.equal(storage.getItem('theme'),'dark');assert.equal(storage.getItem('locale'),'vi');assert.equal(storage.getItem('unrelated-token'),'keep');
    const upgraded=bootApp({storage});
    assert.equal(upgraded.auth.isAuthenticated,false);
    assert.equal(upgraded.readRecord(),null);
  });
});

test('N7: failed rollback cleanup reports incomplete invalidation',()=>{
  const module=loadModule('assets/js/api/sessionStorage.js',createBrowserEnv());
  assert.equal(typeof module.invalidateAuthForRollback,'function');
  const removed=[];
  const result=module.invalidateAuthForRollback({removeItem(key){if(key==='token')throw Error('denied');removed.push(key);}});
  assert.equal(result.status,'storage-failure');assert.deepEqual([...result.failedKeys],['token']);
  assert.ok(removed.includes('auth-session-record'));assert.ok(!removed.includes('api-base-url'));
});
