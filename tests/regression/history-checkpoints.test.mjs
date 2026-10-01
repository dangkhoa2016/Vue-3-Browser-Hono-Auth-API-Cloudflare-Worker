import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { prepareHistoricalCheckpoints } from '../../tools/prepare-history-checkpoints.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'history-checkpoints-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source'), target = join(root, 'target');
  mkdirSync(source); mkdirSync(target);
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(source, 'init', '-q');
  writeFileSync(join(source, 'sample.txt'), 'historical fixture\n'); git(source, 'add', 'sample.txt');
  git(source, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture checkpoint');
  const sha = git(source, 'rev-parse', 'HEAD');
  const ref = `refs/heads/checkpoint-${sha.slice(0, 12)}`; git(source, 'update-ref', ref, sha);
  git(target, 'init', '-q'); mkdirSync(join(target, 'reports/evidence'), { recursive: true });
  const bundle = join(target, 'reports/evidence/historical-checkpoints.bundle');
  git(source, 'bundle', 'create', bundle, ref);
  const catalog = { schema: 'frontend-history-checkpoints/1', bundle: 'reports/evidence/historical-checkpoints.bundle',
    sha256: createHash('sha256').update(readFileSync(bundle)).digest('hex'), checkpoints: [{ ref, sha }] };
  writeFileSync(join(target, 'reports/HISTORY-CHECKPOINTS.json'), JSON.stringify(catalog));
  return { target, git, sha, ref, bundle, catalog };
}

test('historical checkpoints restore locally without creating a branch or changing HEAD', t => {
  const f = fixture(t); const first = prepareHistoricalCheckpoints(f.target);
  assert.equal(first.restored, 1);
  assert.equal(f.git(f.target, 'rev-parse', `refs/history-audit/${f.ref.split('/').at(-1)}`), f.sha);
  assert.equal(f.git(f.target, 'for-each-ref', '--format=%(refname)', 'refs/heads'), '');
  assert.equal(prepareHistoricalCheckpoints(f.target).restored, 0);
});

test('a modified bundle is rejected even after the checkpoint already exists', t => {
  const f = fixture(t); prepareHistoricalCheckpoints(f.target);
  writeFileSync(f.bundle, 'tampered bundle\n');
  assert.throws(() => prepareHistoricalCheckpoints(f.target), /checksum/i);
});

test('a catalog cannot direct checkpoint import into user branches', t => {
  const f = fixture(t); f.catalog.checkpoints[0].ref = 'refs/heads/main';
  writeFileSync(join(f.target, 'reports/HISTORY-CHECKPOINTS.json'), JSON.stringify(f.catalog));
  assert.throws(() => prepareHistoricalCheckpoints(f.target), /checkpoint ref/i);
  assert.equal(f.git(f.target, 'for-each-ref', '--format=%(refname)'), '');
});

test('catalog SHA must match the commit actually advertised by the bundle', t => {
  const f = fixture(t); f.catalog.checkpoints[0].sha = '0'.repeat(40);
  assert.throws(() => {
    writeFileSync(join(f.target, 'reports/HISTORY-CHECKPOINTS.json'), JSON.stringify(f.catalog));
    prepareHistoricalCheckpoints(f.target);
  }, /advertised|checkpoint ref/i);
});

test('a symbolic audit destination cannot redirect restoration into main', t => {
  const f = fixture(t);
  writeFileSync(join(f.target, 'current.txt'), 'current branch\n');
  f.git(f.target, 'add', 'current.txt');
  f.git(f.target, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'current checkout');
  f.git(f.target, 'branch', '-M', 'main');
  const before = f.git(f.target, 'rev-parse', 'HEAD');
  const destination = `refs/history-audit/${f.ref.split('/').at(-1)}`;
  f.git(f.target, 'symbolic-ref', destination, 'refs/heads/main');
  assert.throws(() => prepareHistoricalCheckpoints(f.target), /symbolic/i);
  assert.equal(f.git(f.target, 'rev-parse', 'HEAD'), before);
  assert.equal(f.git(f.target, 'rev-parse', 'main'), before);
  assert.equal(f.git(f.target, 'symbolic-ref', destination), 'refs/heads/main');
});

test('a race on the second audit ref cannot create an unborn user branch', t => {
  const f = fixture(t);
  const source = join(f.target, '..', 'source');
  writeFileSync(join(source, 'second.txt'), 'second checkpoint\n');
  f.git(source, 'add', 'second.txt');
  f.git(source, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'second checkpoint');
  const secondSha = f.git(source, 'rev-parse', 'HEAD');
  const secondRef = `refs/heads/checkpoint-${secondSha.slice(0, 12)}`;
  f.git(source, 'update-ref', secondRef, secondSha);
  f.git(source, 'bundle', 'create', f.bundle, f.ref, secondRef);
  f.catalog.checkpoints.push({ ref: secondRef, sha: secondSha });
  f.catalog.sha256 = createHash('sha256').update(readFileSync(f.bundle)).digest('hex');
  writeFileSync(join(f.target, 'reports/HISTORY-CHECKPOINTS.json'), JSON.stringify(f.catalog));
  const actualGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
  const bin = join(f.target, '..', 'race-bin'); mkdirSync(bin);
  const secondDestination = `refs/history-audit/${secondRef.split('/').at(-1)}`;
  writeFileSync(join(bin, 'git'), `#!/usr/bin/env node
const {spawnSync,execFileSync}=require('node:child_process');
const args=process.argv.slice(2);
if(args[2]==='update-ref' && args.includes('--stdin')) {
  execFileSync(${JSON.stringify(actualGit)},['-C',args[1],'symbolic-ref',${JSON.stringify(secondDestination)},'refs/heads/unborn-user-branch']);
}
const result=spawnSync(${JSON.stringify(actualGit)},args,{stdio:'inherit'});
process.exit(result.status ?? 1);
`, { mode: 0o755 });
  const previous = process.env.PATH;
  try {
    process.env.PATH = `${bin}:${previous}`;
    // Git may atomically reject an existing ref or replace only the direct audit
    // destination. Either outcome must leave all user branches untouched.
    try { prepareHistoricalCheckpoints(f.target); }
    catch (error) { assert.match(error.message, /reference already exists|cannot lock ref/i); }
  } finally { process.env.PATH = previous; }
  assert.equal(f.git(f.target, 'for-each-ref', '--format=%(refname)', 'refs/heads'), '');
  assert.throws(() => f.git(f.target, 'rev-parse', '--verify', 'refs/heads/unborn-user-branch'));
});
