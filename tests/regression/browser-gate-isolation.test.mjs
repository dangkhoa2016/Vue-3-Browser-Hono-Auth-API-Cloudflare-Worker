/**
 * FR10-07 — a gate that destroys its own subject is worse than no gate.
 *
 * `run-browser-gate.sh` ran the browser suite against a "frozen copy" of the work tree, and the copy was
 * one fixed path that the script deleted before every run. Two runs sharing it — which is the default,
 * because the path is a constant and not even an argument — meant the second run's `rm -rf` landed on the
 * first run's worktree while Playwright was reading it. Every symptom of that failure is innocent: the
 * first run reports a missing file, or passes against a half-deleted tree, and the evidence is complete
 * and true and describes a tree that no longer exists.
 *
 * The second half is quieter. The script copied `node_modules`, wrote `.install-ok` with a `:` redirect
 * that creates the file whatever happened, and then passed `--no-gate-install` so that nothing would ever
 * check it. The lockfile is hashed into the manifest, so the evidence could prove the lockfile was in the
 * tree and say nothing at all about the install that was actually loaded.
 *
 * Both are properties rather than statements, and the only way to observe them through the old script was
 * to run the real browser suite twice at once and hope the race landed. So the decisions are in
 * `tools/browser-gate-env.mjs`, a program this file can drive in milliseconds, and the shell is left to
 * copy files.
 */

import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EXIT_NOT_OWNED,
  EXIT_OK,
  SCRATCH_MARKER,
  SCRATCH_PREFIX,
  cleanupScratch,
  createScratch,
  installKey,
  isOwned,
  prepareInstall,
  verifyInstall,
} from '../../tools/browser-gate-env.mjs';

const HELPER = fileURLToPath(new URL('../../tools/browser-gate-env.mjs', import.meta.url));

/**
 * A throwaway repo with the two files an install key is derived from.
 *
 * The lockfile declares a resolved tree, not just a `sha` field, because FR11-04 stopped asking whether
 * `node_modules` exists and started asking whether it covers the lockfile the install is stamped for. A
 * fixture that only carried a fake `sha` would exercise the old `existsSync` check and nothing else.
 * `alphaVersion` is the lever for "a different lockfile": it is the one field that changes, and the key
 * is taken over the lockfile's bytes, so two versions are two keys.
 */
function makeRepo(alphaVersion = '1.0.0') {
  const repo = mkdtempSync(join(tmpdir(), 'browser-gate-repo-'));
  mkdirSync(join(repo, 'tests'), { recursive: true });
  writeFileSync(join(repo, 'tests', 'package.json'), '{ "name": "verification" }\n');
  writeFileSync(join(repo, 'tests', 'package-lock.json'), `${JSON.stringify({
    name: 'verification',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: 'verification' },
      'node_modules/alpha': { version: alphaVersion },
      'node_modules/beta': { version: '2.0.0' }
    }
  }, null, 2)}\n`);
  return repo;
}

/**
 * The install a stamp claims, written out for real: the lockfile copied beside the tree, and a directory
 * for every package that applies on this machine. `omit` names packages to leave out, so a case can
 * describe an install that is *incomplete* — the shape FR11-04 is about, which no amount of stamp
 * metadata could distinguish from a good one.
 */
function writeInstall(cache, repo, { omit = [], include = ['node_modules/alpha', 'node_modules/beta'] } = {}) {
  mkdirSync(join(cache, 'node_modules'), { recursive: true });
  for (const path of include) {
    if (omit.includes(path)) continue;
    mkdirSync(join(cache, path), { recursive: true });
    const entry=JSON.parse(readFileSync(join(repo,'tests/package-lock.json'))).packages[path];
    writeFileSync(join(cache,path,'package.json'),JSON.stringify({name:path.split('/').pop(),version:entry.version}));
    writeFileSync(join(cache,path,'index.js'),'export {};');
  }
  copyFileSync(join(repo, 'tests', 'package-lock.json'), join(cache, 'package-lock.json'));
  copyFileSync(join(repo, 'tests', 'package.json'), join(cache, 'package.json'));
  return cache;
}

test('FR10-07: two runs sharing a base do not delete each other', async (t) => {
  await t.test('every run gets its own directory, and a cleanup touches only its own', () => {
    const base = mkdtempSync(join(tmpdir(), 'browser-gate-base-'));
    // Two runs, one base: the arrangement the old script's single fixed path made unavoidable.
    const first = createScratch(base);
    const second = createScratch(base);

    assert.notEqual(first.path, second.path, 'two runs must not be handed the same worktree');

    // What the old script did, and what a cleanup must still refuse: remove the *other* run's directory
    // because it lives under a shared root.
    assert.equal(cleanupScratch(second.path, base), true, 'a run may clean its own directory');
    assert.equal(existsSync(second.path), false);
    assert.equal(existsSync(first.path), true, 'and the other run is untouched');

    // The shape of the old bug, run in the direction that matters: the surviving run finishes and cleans
    // up after itself while a second one is still going.
    cleanupScratch(first.path, base);
    assert.equal(existsSync(first.path), false);
  });

  await t.test('a base is never emptied to make room', () => {
    const base = mkdtempSync(join(tmpdir(), 'browser-gate-base-'));
    // Something of the reviewer's, sharing the base, that is not a run directory.
    const bystander = join(base, 'my-notes');
    mkdirSync(bystander);
    writeFileSync(join(bystander, 'todo.txt'), 'not a scratch tree\n');

    const run = createScratch(base);
    cleanupScratch(run.path, base);

    assert.equal(existsSync(join(bystander, 'todo.txt')), true, 'the base keeps everything that is not a run');
    assert.equal(existsSync(base), true, 'and the base itself is not removed');
  });

  await t.test('a directory is only owned when this tool minted it', () => {
    const base = mkdtempSync(join(tmpdir(), 'browser-gate-base-'));
    // The hole this closes. A name that matches the pattern perfectly well, created by something else.
    // Trusting the name meant the first version of `isOwned` deleted this directory and its contents.
    const impostor = join(base, `${SCRATCH_PREFIX}someone-elses`);
    mkdirSync(impostor);
    writeFileSync(join(impostor, 'work.txt'), 'a reviewer\'s notes\n');

    assert.equal(isOwned(impostor, base), false, 'the name is not proof of provenance');
    assert.equal(cleanupScratch(impostor, base), false);
    assert.equal(existsSync(join(impostor, 'work.txt')), true, 'and nothing inside it is lost');

    // A marker that is wrong, or a symlink standing in for one, proves nothing either.
    const wrongBody = join(base, `${SCRATCH_PREFIX}wrongbody`);
    mkdirSync(wrongBody);
    writeFileSync(join(wrongBody, SCRATCH_MARKER), 'trust me\n');
    assert.equal(isOwned(wrongBody, base), false);

    const symlinked = join(base, `${SCRATCH_PREFIX}linkaaaaa`);
    symlinkSync(base, symlinked);
    assert.equal(isOwned(symlinked, base), false, 'a symlink out of the base is not a run directory');

    const linked = join(base, `${SCRATCH_PREFIX}markerlnk`);
    mkdirSync(linked);
    symlinkSync(join(base, 'does-not-exist'), join(linked, SCRATCH_MARKER));
    assert.equal(isOwned(linked, base), false, 'a symlinked marker is not a marker');

    const real = createScratch(base);
    assert.equal(isOwned(real.path, base), true, 'while a directory from createScratch is owned');
  });

  await t.test('the shell entry point agrees with the library', () => {
    // The wrapper calls this as a subprocess, so the two have to agree; a library that is right and a CLI
    // that always exits 0 would leave the old behaviour in place with a green test beside it.
    const base = mkdtempSync(join(tmpdir(), 'browser-gate-base-'));
    const run = createScratch(base);
    const call = (...args) => execFileSync(process.execPath, [HELPER, ...args], { encoding: 'utf8' });

    assert.equal(call('scratch-dir', base).trim().startsWith(base), true);
    assert.equal(spawnSync(process.execPath, [HELPER, 'is-owned', run.path, base]).status, EXIT_OK);

    const stranger = join(base, `${SCRATCH_PREFIX}notours1`);
    mkdirSync(stranger);
    assert.equal(
      spawnSync(process.execPath, [HELPER, 'cleanup', stranger, base]).status,
      EXIT_NOT_OWNED,
      'the CLI reports a refused cleanup as a refusal, not as success'
    );
    assert.equal(existsSync(stranger), true);
  });
});

test('FR10-07: an install is reused only when it matches this lockfile and this machine', async (t) => {
  await t.test('the key follows the lockfile', () => {
    const one = makeRepo('1.0.0');
    const two = makeRepo('2.0.0');
    try {
      assert.equal(installKey(one), installKey(one), 'the same repo twice is the same key');
      assert.notEqual(installKey(one), installKey(two), 'and a changed lockfile is a different key');
    } finally {
      rm(one); rm(two);
    }
  });

  await t.test('the key names the platform, the ABI and Playwright, not just the lock', () => {
    // These are read from the environment at call time, so a machine that differs cannot produce the same
    // key by accident. Asserted through the stamp rather than by reading the source: the thing that matters
    // is that a stamp written for another machine is refused.
    const repo = makeRepo();
    const cache = mkdtempSync(join(tmpdir(), 'browser-gate-cache-'));
    try {
      const key = installKey(repo);
      stampInstall(cache, key, { platform: 'darwin-arm64', abi: '127' });

      const result = verifyInstall(cache, key);
      assert.equal(result.state, 'stale', 'a stamp for another machine is not usable here');
      assert.match(result.reason, /does not describe this platform/);
    } finally { rm(repo); rm(cache); }
  });

  await t.test('an absent install is missing, and a stale one is refused', () => {
    const repo = makeRepo();
    const cache = mkdtempSync(join(tmpdir(), 'browser-gate-cache-'));
    try {
      const key = installKey(repo);
      assert.equal(verifyInstall(cache, key).state, 'absent', 'nothing there yet is not a failure');

      // Built for something else, then offered to this run.
      stampInstall(cache, 'f'.repeat(64));
      const stale = verifyInstall(cache, key);
      assert.equal(stale.state, 'stale');
      assert.match(stale.reason, /was made for key/);

      // And the refusal is a refusal: preparing an install does not quietly repair a mismatched one by
      // reinstalling whatever it likes. A wrapper that "fixed" this silently would be choosing a dependency
      // tree the reviewer never asked for, in a run whose evidence claims the lockfile was honoured.
      assert.throws(() => prepareInstall(cache, key, repo), /refusing to use a stale install/);
      assert.equal(existsSync(join(cache, 'package.json')), false, 'nothing was installed over the top');
      assert.equal(existsSync(join(cache, 'node_modules')), true, 'and the mismatched tree is left alone, not deleted');
    } finally { rm(repo); rm(cache); }
  });

  await t.test('a stamp with no node_modules behind it is stale, not current', () => {
    const repo = makeRepo();
    const cache = mkdtempSync(join(tmpdir(), 'browser-gate-cache-'));
    try {
      const key = installKey(repo);
      stampInstall(cache, key, { tree: false });
      // The stamp survived, the tree did not: an interrupted `rm -rf`, or a cache someone pruned.
      assert.equal(verifyInstall(cache, key).state, 'stale');
      assert.match(verifyInstall(cache, key).reason, /no node_modules/);
    } finally { rm(repo); rm(cache); }
  });

  await t.test('a matching stamp with a tree behind it is accepted', () => {
    const repo = makeRepo();
    const cache = mkdtempSync(join(tmpdir(), 'browser-gate-cache-'));
    try {
      const key = installKey(repo);
      writeInstall(cache, repo);
      stampInstall(cache, key);
      assert.equal(verifyInstall(cache, key).state, 'current');
      // And the gate reuses it rather than paying for the install again.
      const prepared = prepareInstall(cache, key, repo);
      assert.equal(prepared.built, false, 'a current install is reused, not rebuilt');
    } finally { rm(repo); rm(cache); }
  });

  await t.test('a stamp over an install that does not cover its lockfile is refused', () => {
    // The reproduction, exactly. Key, platform and ABI all agree, `node_modules` is present, the stamp is
    // valid JSON — and beta was never installed. The old check asked only whether the directory existed,
    // so this printed `current`, `prepare-install` returned `built: false`, and the browser gate ran
    // against an install with a package missing while every digest it recorded stayed correct.
    const repo = makeRepo();
    const cache = mkdtempSync(join(tmpdir(), 'browser-gate-cache-'));
    try {
      const key = installKey(repo);
      writeInstall(cache, repo, { omit: ['node_modules/beta'] });
      stampInstall(cache, key);

      const result = verifyInstall(cache, key);
      assert.equal(result.state, 'stale', 'a tree that does not cover the lockfile is not a usable install');
      assert.match(result.reason, /node_modules\/beta/);
      assert.match(result.reason, /1 of its 2/);

      assert.throws(() => prepareInstall(cache, key, repo), /stale/i,
        'and a stale install is rebuilt rather than handed to the browser run');
    } finally { rm(repo); rm(cache); }
  });

  await t.test('a package the lockfile excludes on this platform is absent by design, not missing', () => {
    // `fsevents` is darwin-only. `npm ci` on Linux never installs it, so requiring it turned a real,
    // working install into `stale` on the first run of the coverage check.
    const repo = mkdtempSync(join(tmpdir(), 'browser-gate-repo-'));
    const cache = mkdtempSync(join(tmpdir(), 'browser-gate-cache-'));
    try {
      mkdirSync(join(repo, 'tests'), { recursive: true });
      writeFileSync(join(repo, 'tests', 'package.json'), '{ "name": "verification" }\n');
      writeFileSync(join(repo, 'tests', 'package-lock.json'), `${JSON.stringify({
        name: 'verification',
        lockfileVersion: 3,
        packages: {
          '': { name: 'verification' },
          'node_modules/alpha': { version: '1.0.0' },
          'node_modules/fsevents': { version: '2.3.3', os: ['darwin'] }
        }
      }, null, 2)}\n`);
      const key = installKey(repo);
      writeInstall(cache, repo, { include: ['node_modules/alpha'] });
      stampInstall(cache, key);

      assert.equal(verifyInstall(cache, key).state, 'current',
        'a package this platform never installs cannot be a missing package');
    } finally { rm(repo); rm(cache); }
  });

  await t.test('a stamp that is not JSON is stale, and says which file', () => {
    const cache = mkdtempSync(join(tmpdir(), 'browser-gate-cache-'));
    try {
      writeFileSync(join(cache, '.install.json'), 'I am not JSON\n');
      const result = verifyInstall(cache, 'a'.repeat(64));
      assert.equal(result.state, 'stale');
      assert.match(result.reason, /not readable JSON/);
    } finally { rm(cache); }
  });

  await t.test('a repo with no lockfile cannot be keyed, and says so', () => {
    const repo = mkdtempSync(join(tmpdir(), 'browser-gate-repo-'));
    try {
      assert.throws(() => installKey(repo), /no lockfile/);
    } finally { rm(repo); }
  });
});

const stampInstall = (cache, key, overrides = {}) => {
  if (overrides.tree !== false) mkdirSync(join(cache, 'node_modules'), { recursive: true });
  writeFileSync(join(cache, '.install.json'), `${JSON.stringify({
    key,
    createdAt: '2026-09-28T00:00:00.000Z',
    packageMetadata: existsSync(join(cache,'package-lock.json')) ? Object.fromEntries(Object.keys(JSON.parse(readFileSync(join(cache,'package-lock.json'))).packages||{}).filter(p=>p && existsSync(join(cache,p,'package.json'))).map(p=>[p,createHash('sha256').update(readFileSync(join(cache,p,'package.json'))).digest('hex')])) : {},
    node: process.versions.node,
    abi: process.versions.modules,
    platform: `${process.platform}-${process.arch}`,
    ...(existsSync(join(cache,'package-lock.json')) ? {lockSha256:createHash('sha256').update(readFileSync(join(cache,'package-lock.json'))).digest('hex'),manifestSha256:createHash('sha256').update(readFileSync(join(cache,'package.json'))).digest('hex')} : {}),
    ...overrides,
  })}\n`);
};

const rm = (path) => rmSync(path, { recursive: true, force: true });

test('FR12-01: empty package, wrong version and replaced lock cannot be current', async t => {
  for(const mutation of ['empty','version','lock']) await t.test(mutation, () => {
    const repo=makeRepo(); const cache=mkdtempSync(join(tmpdir(),'cache-negative-'));
    try {
      writeInstall(cache,repo); const key=installKey(repo);stampInstall(cache,key);
      if(mutation==='empty') rmSync(join(cache,'node_modules/alpha/package.json'));
      if(mutation==='version') writeFileSync(join(cache,'node_modules/alpha/package.json'),'{"name":"alpha","version":"99.0.0"}');
      if(mutation==='lock') writeFileSync(join(cache,'package-lock.json'),'{"lockfileVersion":3,"packages":{}}');
      assert.equal(verifyInstall(cache,key).state,'stale');
    } finally {rm(repo);rm(cache);}
  });
});

test('FR12-01: working node_modules must not decide the install key', () => {
  const repo=makeRepo();
  try {
    const key=installKey(repo);
    mkdirSync(join(repo,'tests/node_modules/@playwright/test'),{recursive:true});
    writeFileSync(join(repo,'tests/node_modules/@playwright/test/package.json'),'{"version":"99.0.0"}');
    assert.equal(installKey(repo),key);
  } finally {rm(repo);}
});
