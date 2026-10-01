import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import * as identity from '../../tools/frontend-source-identity.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'snapshot-integrity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'tools'));
  writeFileSync(join(root, 'tools/a.sh'), 'echo safe\n');
  chmodSync(join(root, 'tools/a.sh'), 0o755);
  const manifest = identity.buildManifest(root);
  const bytes = identity.buildSnapshot(root, manifest.files);
  const archive = join(root, 'snapshot.gz');
  writeFileSync(archive, bytes);
  return { root, manifest, bytes, archive };
}
function checksum(tar) {
  tar.fill(32, 148, 156);
  let sum = 0; for (const v of tar.subarray(0, 512)) sum += v;
  tar.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return tar;
}

test('FR12-02: reject malformed manifests even with recomputed digest', async t => {
  const { manifest } = fixture(t);
  assert.equal(typeof identity.verifySourceManifest, 'function', 'shared strict verifier must exist');
  assert.equal(identity.verifySourceManifest(manifest).digest, manifest.digest);
  const cases = [
    ['missing count', m => delete m.fileCount],
    ['fractional size', m => m.files[0].size = 1.5],
    ['negative size', m => m.files[0].size = -1],
    ['bad hash', m => m.files[0].sha256 = 'z'.repeat(64)],
    ['bad mode', m => m.files[0].mode = '100754'],
    ['bad kind', m => m.files[0].kind = 'directory'],
    ['absolute', m => m.files[0].path = '/tools/a.sh'],
    ['traversal', m => m.files[0].path = 'tools/../a.sh'],
    ['backslash', m => m.files[0].path = 'tools\\a.sh'],
    ['noncanonical', m => m.files[0].path = './tools/a.sh'],
    ['duplicate', m => { m.files.push({...m.files[0]}); m.fileCount++; }],
    ['unsorted', m => { m.files.unshift({...m.files[0], path:'tools/z.sh'}); m.fileCount++; }],
    ['file directory collision', m => { m.files.push({...m.files[0], path:'tools/a.sh/b'}); m.fileCount++; }],
    ['link', m => Object.assign(m.files[0], {kind:'symlink',mode:'120000',target:'../../secret'})]
  ];
  for (const [name, mutate] of cases) await t.test(name, () => {
    const m = structuredClone(manifest); mutate(m); m.digest = identity.digestOf(m.files);
    assert.throws(() => identity.verifySourceManifest(m), /manifest/i);
  });
});

test('FR12-02: actual archived set, bytes, modes and safe types must match', async t => {
  const { manifest, bytes, archive } = fixture(t);
  assert.equal(typeof identity.verifySnapshot, 'function', 'archive verifier must exist');
  assert.equal(identity.verifySnapshot(archive, manifest).fileCount, 1);
  const original = gunzipSync(bytes);
  const variants = [
    ['corrupt gzip', () => Buffer.from('not a gzip snapshot')],
    ['missing', () => gzipSync(Buffer.alloc(1024))],
    ['changed byte', () => { const b=Buffer.from(original); b[512]^=1; return gzipSync(b); }],
    ['mode', () => { const b=Buffer.from(original); b.write('0000644\0',100); return gzipSync(checksum(b)); }],
    ['traversal', () => { const b=Buffer.from(original); b.fill(0,0,100); b.write('../escape'); return gzipSync(checksum(b)); }],
    ['symlink', () => { const b=Buffer.from(original); b[156]=50; return gzipSync(checksum(b)); }],
    ['hardlink', () => { const b=Buffer.from(original); b[156]=49; return gzipSync(checksum(b)); }],
    ['duplicate', () => gzipSync(Buffer.concat([original.subarray(0,1024),original]))],
    ['extra', () => { const b=Buffer.from(original); b.fill(0,0,100); b.write('tools/b.sh'); return gzipSync(Buffer.concat([original.subarray(0,1024),checksum(b)])); }],
    ['truncated', () => gzipSync(original.subarray(0,700))],
    ['unsupported PAX', () => { const b=Buffer.from(original); b[156]=120; return gzipSync(checksum(b)); }]
  ];
  for(const [name, mutate] of variants) await t.test(name, () => {
    writeFileSync(archive, mutate());
    assert.throws(() => identity.verifySnapshot(archive, manifest), /snapshot|archive|gzip|header|manifest|unexpected|invalid/i);
  });
});

test('FR12-02: snapshot producer refuses changed bytes after manifest capture', t => {
  const { root, manifest }=fixture(t);
  writeFileSync(join(root,'tools/a.sh'), 'echo evil\n');
  assert.throws(() => identity.buildSnapshot(root, manifest.files), /drift|changed|mismatch/i);
});

test('FR12-02: unsafe archive collisions are rejected before extracting any member', t=>{
  const {root,bytes}=fixture(t);
  const tar=gunzipSync(bytes);
  const extra=Buffer.from(tar);extra.fill(0,0,100);extra.write('tools/a.sh/child');checksum(extra);
  const archive=join(root,'collision.gz');writeFileSync(archive,gzipSync(Buffer.concat([tar.subarray(0,1024),extra])));
  const target=join(root,'restore');mkdirSync(target);
  assert.throws(()=>identity.extractSnapshot(archive,target),/snapshot|collision/i);
  assert.throws(()=>readFileSync(join(target,'tools/a.sh')),/ENOENT/,'no partial extraction before audit rejection');
});
