import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserEnv,createPiniaStub,loadModule} from './helpers/browser-env.mjs';
function boot(data,type,{BlobClass=Blob}={}) {
  const env=createBrowserEnv(),pinia=createPiniaStub(),downloads=[];
  const link={click(){downloads.push(this.download);},remove(){}};
  env.document.createElement=()=>link;env.document.body={appendChild(){}};
  env.window.URL={createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}};
  const identity=loadModule('assets/js/api/apiIdentity.js',env);
  loadModule('assets/js/stores/auditStore.js',{...env,Pinia:pinia,Blob:BlobClass},{
    ...identity,
    DEFAULT_ADMIN_PAGE_SIZE:10,resolveAdminPageSize:()=>10,
    apiClient:{get:async()=>({data:new Blob([data]),headers:{'content-type':type}})},
    API_ENDPOINTS:{AUDIT_EXPORT:'/api/audit/export'},DATA_PATHS:{},useMainStore:()=>({mockApi:false}),
    i18n:{global:{t:x=>x}},
  });
  return {store:pinia.defineStore.createStoreInstance('audit'),downloads,identity};
}
for(const [format,type,body] of [['json','application/json','[{"action":"login"}]'],['csv','text/csv','action,user\nlogin,fixture\n']]) {
  test(`audit export ${format} accepts actual representation`,async()=>{
    const app=boot(body,type);await app.store.export(format);assert.deepEqual(app.downloads,[`audit_export.${format}`]);
  });
}
for(const [name,format,type,body] of [
  ['HTML200','csv','text/html','<!doctype html><html>error</html>'],
  ['HTML disguised as CSV','csv','text/csv','<html>error</html>'],
  ['malformed JSON','json','application/json','not JSON'],
  ['semantic error','json','application/json','{"success":false,"error":"denied"}'],
  ['empty CSV','csv','text/csv',''],
]) test(`audit export refuses ${name} without download`,async()=>{
  const app=boot(body,type);await assert.rejects(app.store.export(format));assert.equal(app.downloads.length,0);
});

test('N6 an export paused during body decoding cannot download into a replacement context',async()=>{
  let started,release;
  const decoding=new Promise(r=>started=r),held=new Promise(r=>release=r);
  class HeldBlob extends Blob {async text(){started();await held;return super.text();}}
  const app=boot('action\nFAKE_A\n','text/csv',{BlobClass:HeldBlob});
  const pending=app.store.export('csv');
  const rejected=assert.rejects(pending,error=>error.stale===true);
  await decoding;app.identity.invalidateContext();release();
  await rejected;assert.deepEqual(app.downloads,[]);
});
