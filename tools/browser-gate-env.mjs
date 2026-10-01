/**
 * browser-gate-env.mjs — the parts of the browser gate wrapper that have to be *checked* rather than
 * trusted, as a program the unit suite can run.
 *
 * FR10-07 found three things wrong with `run-browser-gate.sh` that a shell review can only ever describe:
 *
 *  1. It used one shared scratch directory and deleted it if it existed. Two runs with the same
 *     `RUN_ROOT` — the normal case, because the default is a fixed path — would `rm -rf` a worktree the
 *     other one was running against. A gate that destroys its own subject is worse than no gate.
 *  2. It copied `node_modules` and then *wrote* `.install-ok`, unconditionally, and passed
 *     `--no-gate-install` so nothing could check it. The lockfile is hashed into the manifest, so the
 *     evidence could prove the lockfile was in the tree and the install was from something else entirely.
 *  3. It started nothing, so the static server came from whoever happened to be listening: the run's own
 *     frozen copy, or a developer's other checkout, and nothing in the evidence could say which.
 *
 * The reason these are here rather than inline in the shell: "two concurrent runs do not delete each
 * other" and "a stale install is refused" are properties, and a property that can only be checked by
 * running the real browser suite — twenty minutes, Playwright, a Chromium download — is a property nobody
 * checks. So the decisions live in a program with a test, and the shell is left to do the copying.
 *
 * Commands (all exit 0 on success; see `usage` for the codes):
 *   scratch-dir <base>                 create and print a run-owned directory under <base>
 *   is-owned <path> <base>             exit 0 if <path> is a run-owned directory under <base>
 *   cleanup <path> <base>              remove <path>, but only if `is-owned` would pass
 *   install-key <repo>                 print the cache key for this repo's lockfile and runtime
 *   verify-install <cache> <key>       exit 0 stamped and current, 3 absent, 4 stale
 *   prepare-install <cache> <key> <repo>  verify, or run a clean `npm ci` into <cache> and stamp it
 */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STAMP_NAME = '.install.json';

/**
 * The prefix a run-owned directory has to carry.
 *
 * Cleanup is the dangerous operation here, so ownership is not "some path the wrapper was told about" —
 * it is a name this file minted, in a directory the caller named, matching this shape. `mktemp -d` gives
 * uniqueness, but the prefix is what makes it *checkable* by a separate process that has no memory of
 * having created anything.
 */
export const SCRATCH_PREFIX = 'frontend-browser-run.';

export const SCRATCH_PATTERN = new RegExp(`^${SCRATCH_PREFIX}[A-Za-z0-9]{6,}$`);

/**
 * The marker that makes a directory *this tool's*.
 *
 * A name is not proof of anything. `frontend-browser-run.notes` matches the pattern perfectly well, and a
 * cleanup that trusted the pattern would `rm -rf` a reviewer's own directory because it happened to be
 * called the same thing — which is the original defect with an extra step, since the thing being deleted
 * is now a *run* directory rather than any directory at all. So `createScratch` drops a marker file inside
 * what it mints, and ownership is the marker's presence. The name check stays as a cheap first gate; the
 * marker is the one that means it.
 */
export const SCRATCH_MARKER = '.browser-gate-scratch';
export const SCRATCH_MARKER_BODY = 'frontend-browser-gate scratch v1\n';

/** Exit codes, so the shell can branch without parsing prose. */
export const EXIT_OK = 0;
export const EXIT_ABSENT = 3;
export const EXIT_STALE = 4;
export const EXIT_NOT_OWNED = 5;
export const EXIT_USAGE = 2;

/**
 * A scratch directory this run owns, and can therefore safely remove.
 *
 * `mkdtempSync` gives six random characters under the caller's base. The base is created if it is missing
 * but never emptied, and never deleted: the previous version's `rm -rf "${SCRATCH}"` is the exact defect
 * this replaces, and leaving a shared base intact is the only way two runs can share one without either
 * being able to remove the other's work.
 */
export const createScratch = (base) => {
  const root = resolve(base);
  mkdirSync(root, { recursive: true });
  const path = mkdtempSync(join(root, SCRATCH_PREFIX));
  writeFileSync(join(path, SCRATCH_MARKER), SCRATCH_MARKER_BODY, 'utf8');
  return { path, base: root };
};

/**
 * Whether `path` is a directory this tool minted under `base`.
 *
 * Checked on both sides, and for the reason a reviewer's machine is the place this matters: `base` is
 * caller-supplied and `path` arrives as an argument, so either could be `/`. The `realpath` comparison is
 * what stops a symlink pointing outside the base from passing, and the name check is what stops a
 * perfectly ordinary shared directory from being deleted because someone passed its path.
 */
export const isOwned = (path, base) => {
  if (!path || !base) return false;
  const root = resolve(base);
  const target = resolve(path);
  if (!SCRATCH_PATTERN.test(basename(target))) return false;

  // A symlink is not the directory it points at, so both sides are resolved before they are compared.
  // That is what stops a path with the right *name* from passing by being a link to somewhere else.
  const realTarget = (() => { try { return resolve(realpathSync(target)); } catch { return null; } })();
  if (!realTarget) return false;
  let realRoot;
  try { realRoot = resolve(realpathSync(root)); } catch { realRoot = root; }
  if (realTarget !== realRoot && !realTarget.startsWith(`${realRoot}${sep}`)) return false;

  // And it must be a directory, not a file that happens to have the right name.
  let stats;
  try { stats = statSync(realTarget); } catch { return false; }
  if (!stats.isDirectory()) return false;

  // The marker, not the name. This is the check that was missing: `frontend-browser-run.notes` matches the
  // pattern, so a directory that was never minted here — a reviewer's, a leftover, a half-finished one from
  // an older wrapper — used to pass and got deleted with whatever was in it. Only `createScratch` writes
  // the marker, so its presence is the only evidence of provenance that cannot be had by coincidence.
  const marker = join(realTarget, SCRATCH_MARKER);
  try {
    const markerStats = lstatSync(marker);
    // A symlinked marker would pass a content check while proving nothing, so it has to be a real file.
    if (!markerStats.isFile() || markerStats.size !== Buffer.byteLength(SCRATCH_MARKER_BODY)) return false;
    return readFileSync(marker, 'utf8') === SCRATCH_MARKER_BODY;
  } catch {
    return false;
  }
};

/** Remove `path` only if this tool minted it. Returns whether anything was removed. */
export const cleanupScratch = (path, base) => {
  if (!isOwned(path, base)) return false;
  rmSync(resolve(path), { recursive: true, force: true });
  return true;
};

/**
 * Everything that decides whether an installed tree may be reused, in one string.
 *
 * The lockfile hash is the point of the exercise: it is what makes "this install matches this lockfile"
 * a question with an answer, instead of a sentence in a report. The rest is the same idea applied to the
 * parts of the lockfile that describe *this machine*: an install is only valid for the platform and the
 * Node ABI it was built for, and a native module that was fetched for one and reused on another fails in
 * ways that look like test failures. Playwright's version is included because the browser binaries are a
 * machine-level cache outside the tree, keyed by it, and a stale binary against a new Playwright is a
 * failure that looks like a flaky test.
 */
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const keyForInstall = root => {
  const lockPath=join(root,'package-lock.json');
  if(!existsSync(lockPath)) throw new Error(`no lockfile at ${lockPath}`);
  const lockBytes=readFileSync(lockPath);
  const lock=JSON.parse(lockBytes);
  return sha([
    sha(readFileSync(join(root,'package.json'))),sha(lockBytes),process.platform,process.arch,
    process.versions.modules,process.versions.node,
    lock.packages?.['node_modules/@playwright/test']?.version || 'absent',
    process.env.PLAYWRIGHT_BROWSERS_PATH || 'default'
  ].join('\n'));
};
export const installKey = repo => keyForInstall(join(repo,'tests'));

/**
 * The stamp for an install, or why it cannot be used.
 *
 * `absent` and `stale` are separate answers because they call for different behaviour: an absent install
 * should be made, and a stale one should be *refused*. Silently repairing a stale install is how a machine
 * ends up running against a dependency tree that nobody chose — the wrapper would be picking a version
 * the reviewer did not ask for, in a run whose evidence says the lockfile was honoured.
 */
export const verifyInstall = (cache, key) => {
  const stampPath = join(resolve(cache), STAMP_NAME);
  if (!existsSync(stampPath)) return { state: 'absent', stampPath };

  let stamp;
  try {
    stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
  } catch (error) {
    return { state: 'stale', stampPath, reason: `the stamp at ${stampPath} is not readable JSON (${error.message})` };
  }
  if (stamp.key !== key) {
    return {
      state: 'stale',
      stampPath,
      reason: `the install in ${cache} was made for key ${stamp.key} and this run needs ${key}; `
        + 'the lockfile, platform, Node ABI or Playwright version is not the one it was built for',
    };
  }
  // The key is the whole answer in principle, but the stamp is a file on disk that a careless edit or a
  // bad merge can make inconsistent with it. Re-reading the two fields a reader can check for itself costs
  // two comparisons and turns "the key matches" from a claim about the key into a claim about the machine.
  const here = { platform: `${process.platform}-${process.arch}`, abi: process.versions.modules };
  for (const [field, value] of Object.entries(here)) {
    if (stamp[field] !== undefined && stamp[field] !== value) {
      return {
        state: 'stale',
        stampPath,
        reason: `the install in ${cache} records ${field}=${stamp[field]} and this machine is ${value}; `
          + 'the stamp does not describe this platform, so it cannot be trusted whatever its key says',
      };
    }
  }
  const root = resolve(cache);

  // The tree the stamp promises, checked against the lockfile that produced it (FR11-04).
  //
  // The previous check was `existsSync(join(cache, 'node_modules'))`, which asks whether a directory
  // exists and not what is in it. An *empty* node_modules answers that question correctly and is
  // worthless: reproduction — correct key, correct platform, correct ABI, `node_modules` present and
  // empty, `verify-install` printed `current` and exited 0, and `prepare-install` then returned
  // `built: false` and handed that empty tree to the browser run. The gate would have launched Playwright
  // against no dependencies at all, and every digest in the resulting evidence would have been correct.
  //
  // So the question is no longer "is there a node_modules" but "does this install cover the lockfile it
  // is stamped for". The lockfile is copied into the cache beside the tree, so the answer needs nothing
  // from the repository and cannot be satisfied by a stale key alone: a directory the lockfile names must
  // exist, and `npm ci` is the thing that guarantees it. This is the same lockfile the key already hashes,
  // which is what makes the key and this check one fact rather than two.
  const modulesDir = join(root, 'node_modules');
  if (!existsSync(modulesDir)) {
    return { state: 'stale', stampPath, reason: `the install in ${cache} is stamped but has no node_modules` };
  }
  if (!statSync(modulesDir).isDirectory()) {
    return { state: 'stale', stampPath, reason: `the install in ${cache} has a node_modules that is not a directory` };
  }

  const lockPath = join(root, 'package-lock.json');
  if (!existsSync(lockPath)) {
    return {
      state: 'stale',
      stampPath,
      reason: `the install in ${cache} is stamped but has no package-lock.json beside it, so the tree cannot be `
        + 'checked against the lockfile it claims to satisfy',
    };
  }

  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch (error) {
    return {
      state: 'stale',
      stampPath,
      reason: `the lockfile in ${cache} is not readable JSON (${error.message}), so the tree cannot be checked against it`,
    };
  }

  try {
    if (sha(readFileSync(lockPath)) !== stamp.lockSha256 || sha(readFileSync(join(root,'package.json'))) !== stamp.manifestSha256 || keyForInstall(root) !== key) {
      return {state:'stale',stampPath,reason:'manifest/lock bytes do not match stamped key inputs'};
    }
  } catch(error) { return {state:'stale',stampPath,reason:`invalid install identity: ${error.message}`}; }
  const matches = (filters, value) => !Array.isArray(filters) ||
    (!filters.includes(`!${value}`) && (filters.includes('any') || !filters.some(x => !x.startsWith('!')) || filters.includes(value)));
  const appliesHere = entry => matches(entry?.os,process.platform) && matches(entry?.cpu,process.arch);
  const declared = [];
  const notApplicable = [];
  if (lock.packages && typeof lock.packages === 'object') {
    for (const [path, entry] of Object.entries(lock.packages)) {
      if (path === '') continue; // the root project, which is not installed into node_modules
      if (entry && entry.link) return {state:'stale',stampPath,reason:'workspace links are not supported in isolated installs'}; // // a symlink into the workspace: there is no directory to find here
      if (!appliesHere(entry)) { notApplicable.push(path); continue; }
      declared.push(path);
    }
  } else if (lock.dependencies && typeof lock.dependencies === 'object') {
    for (const name of Object.keys(lock.dependencies)) declared.push(`node_modules/${name}`);
  } else {
    return {
      state: 'stale',
      stampPath,
      reason: `the lockfile in ${cache} declares neither "packages" nor "dependencies", so it names no tree to check`,
    };
  }

  const missing = declared.filter((path) => {
    const target = join(root, path);
    return !existsSync(target) || !statSync(target).isDirectory();
  });

  if (missing.length > 0) {
    // The first few by name, and the count, because the useful number is "how much of this is missing" —
    // one package is a bad `npm ci`, most of them is an interrupted one, and the reader should not have to
    // count lines to tell those apart.
    const shown = missing.slice(0, 5).join(', ');
    const more = missing.length > 5 ? `, and ${missing.length - 5} more` : '';
    return {
      state: 'stale',
      stampPath,
      reason: `the install in ${cache} is stamped for this lockfile but ${missing.length} of its `
        + `${declared.length} package(s) that apply to ${process.platform}-${process.arch} are not installed: ${shown}${more}. `
        + 'A stamp is a claim, and an empty or half-finished node_modules satisfies a claim about the key '
        + 'while satisfying nothing about the tree; remove the directory and run again to rebuild it.',
      missing,
    };
  }

  try {
    const inside = path => {const real=realpathSync(path);if(real !== root && !real.startsWith(root+sep)) throw new Error('symlink escape');return real;};
    const regular = path => { inside(path); if(!statSync(path).isFile()) throw new Error(`missing entrypoint ${path}`); };
    const visited=new Set();
    const walk = path => {
      const real=inside(path), st=statSync(path);
      if(st.isDirectory()) {
        if(lstatSync(path).isSymbolicLink()) throw new Error('directory symlinks are unsupported in isolated installs');
        if(visited.has(real)) return;
        visited.add(real);
        if(basename(path)==='node_modules') {
          for(const name of readdirSync(path)) {
            if(name.startsWith('.')) continue;
            const candidates=name.startsWith('@')?readdirSync(join(path,name)).map(n=>join(path,name,n)):[join(path,name)];
            for(const candidate of candidates) {
              const relative=candidate.slice(root.length+1).split(sep).join('/');
              if(!declared.includes(relative)) throw new Error(`undeclared installed package: ${relative}`);
            }
          }
        }
        for(const name of readdirSync(path)) walk(join(path,name));
      }
    };
    walk(modulesDir);
    for(const path of declared) {
      if(!path.startsWith('node_modules/') || path.split('/').includes('..') || path.includes('\\')) throw new Error('invalid lock package path');
      const base=join(root,path); const entry=lock.packages?.[path];
      const metadata=readFileSync(join(base,'package.json'));
      if(stamp.packageMetadata?.[path] !== sha(metadata)) throw new Error(`changed or unstamped package metadata: ${path}`);
      const pkg=JSON.parse(metadata);
      if(!entry || pkg.version !== entry.version) throw new Error(`wrong package version: ${path}`);
      if(pkg.main) regular(require.resolve(resolve(base,pkg.main)));
      else if(!pkg.exports) regular(join(base,'index.js'));
      const exports = value => {
        if(typeof value==='string' && value.startsWith('./') && !value.includes('*')) regular(resolve(base,value));
        else if(value && typeof value==='object') for(const v of Object.values(value)) exports(v);
      };
      exports(pkg.exports);
      const bins=typeof entry.bin==='string'?{[basename(path)]:entry.bin}:(entry.bin||{});
      for(const [name,rel] of Object.entries(bins)) {
        const executable=resolve(base,rel);regular(executable);
        if(!(statSync(executable).mode&0o111)) throw new Error(`nonexecutable bin: ${name}`);
        const moduleRoot=base.slice(0,base.lastIndexOf(`${sep}node_modules${sep}`))+sep+'node_modules';
        const binPath=join(moduleRoot,'.bin',name);
        regular(binPath);
        const candidates=declared.filter(p => resolve(root,p).startsWith(moduleRoot+sep)).flatMap(p => {const b=lock.packages[p].bin;const rel=typeof b==='string'?(basename(p)===name?b:null):b?.[name];return rel?[realpathSync(resolve(root,p,rel))]:[];});
        if(!candidates.includes(realpathSync(binPath))) throw new Error(`wrong bin target: ${name}`);
      }
    }
  } catch(error) {return {state:'stale',stampPath,reason:`invalid package/entrypoint: ${error.message}`};}

  return { state: 'current', stampPath, stamp, declaredPackages: declared.length, notApplicable };
};

/**
 * A verified install at `cache`, building it with a clean `npm ci` if it is simply not there.
 *
 * `npm ci` and not `npm install`: `ci` deletes whatever is in `node_modules` first, so a cache that was
 * left half-populated by an interrupted run cannot become the tree this run trusts. The package manifest
 * and the lockfile are copied in beside it because `npm ci` insists on reading both, and the copy is what
 * makes the cache a self-contained, hashable artefact rather than something that reaches back into a
 * checkout.
 */
export const prepareInstall = (cache, key, repo, { log = () => {}, installer } = {}) => {
  const root=resolve(cache);
  const existing=verifyInstall(root,key);
  if(existing.state==='current') return {state:'current',cache:root,built:false};
  if(existing.state==='stale') throw Object.assign(new Error(`refusing to use a stale install: ${existing.reason}`),{code:EXIT_STALE});
  if(installKey(repo)!==key) throw new Error('install key does not match source manifests');
  mkdirSync(dirname(root),{recursive:true});
  const lockPath=root+'.lock';
  try {mkdirSync(lockPath);} catch {throw new Error('install busy: key lock held; bounded refusal (do not delete another builder lock)');}
  let temporary;
  try {
    if(existsSync(root)) throw new Error('unverified existing install preserved; choose a fresh cache path');
    temporary=mkdtempSync(root+'.building-');
    for(const name of ['package.json','package-lock.json']) cpSync(join(repo,'tests',name),join(temporary,name));
    log(`building isolated install for ${key.slice(0,12)}`);
    if(installer) installer(temporary);
    else execFileSync('npm',['ci','--prefix',temporary,'--ignore-scripts','--no-audit','--no-fund'],{stdio:['ignore','inherit','inherit']});
    if(keyForInstall(temporary)!==key || installKey(repo)!==key) throw new Error('manifest/lock changed during install');
    const stamp={key,node:process.versions.node,abi:process.versions.modules,platform:`${process.platform}-${process.arch}`,
      lockSha256:sha(readFileSync(join(temporary,'package-lock.json'))),manifestSha256:sha(readFileSync(join(temporary,'package.json'))),
      packageMetadata:Object.fromEntries(Object.keys(JSON.parse(readFileSync(join(temporary,'package-lock.json'))).packages||{}).filter(p=>p && existsSync(join(temporary,p,'package.json'))).map(p=>[p,sha(readFileSync(join(temporary,p,'package.json')))]))};
    writeFileSync(join(temporary,STAMP_NAME),JSON.stringify(stamp));
    const verified=verifyInstall(temporary,key);
    if(verified.state!=='current') throw new Error(`postinstall verification failed: ${verified.reason}`);
    renameSync(temporary,root);temporary=null;
    return {state:'built',cache:root,built:true,stamp};
  } finally {
    if(temporary) rmSync(temporary,{recursive:true,force:true});
    rmSync(lockPath,{recursive:true});
  }
};

export function copyGitMetadata(source, target) {
  const sourceHead=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const gitDir=join(target,'.git');
  if(existsSync(gitDir)) throw new Error('refusing to overwrite copied Git metadata');
  execFileSync('git',['clone','--bare','--no-hardlinks','--',source,gitDir],{stdio:'pipe'});
  execFileSync('git',[`--git-dir=${gitDir}`,'config','core.bare','false']);
  execFileSync('git',['-C',target,'read-tree','HEAD']);
  const copiedHead=execFileSync('git',['-C',target,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const after=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(sourceHead!==copiedHead || sourceHead!==after) throw new Error('Git HEAD drift during metadata clone');
}

const usage = () => {
  process.stderr.write(
    'usage: browser-gate-env.mjs scratch-dir <base>\n'
    + '       browser-gate-env.mjs is-owned <path> <base>\n'
    + '       browser-gate-env.mjs cleanup <path> <base>\n'
    + '       browser-gate-env.mjs install-key <repo>\n'
    + '       browser-gate-env.mjs verify-install <cache> <key>\n'
    + '       browser-gate-env.mjs prepare-install <cache> <key> <repo>\n'
  );
  return EXIT_USAGE;
};

const main = (argv) => {
  const [command, ...args] = argv;
  switch (command) {
    case 'copy-git':
      copyGitMetadata(args[0],args[1]); return EXIT_OK;
    case 'scratch-dir': {
      const { path: created } = createScratch(args[0] || join(tmpdir(), 'opencode'));
      process.stdout.write(`${created}\n`);
      return EXIT_OK;
    }
    case 'is-owned':
      return isOwned(args[0], args[1]) ? EXIT_OK : EXIT_NOT_OWNED;
    case 'cleanup': {
      // A refused cleanup is not a success: the caller asked for a removal, and reporting zero here would
      // let a wrapper carry on believing the scratch is gone.
      return cleanupScratch(args[0], args[1]) ? EXIT_OK : EXIT_NOT_OWNED;
    }
    case 'install-key': {
      process.stdout.write(`${installKey(args[0])}\n`);
      return EXIT_OK;
    }
    case 'verify-install': {
      const result = verifyInstall(args[0], args[1]);
      process.stdout.write(`${result.state}\n`);
      if (result.reason) process.stderr.write(`${result.reason}\n`);
      return result.state === 'current' ? EXIT_OK : (result.state === 'absent' ? EXIT_ABSENT : EXIT_STALE);
    }
    case 'prepare-install': {
      const result = prepareInstall(args[0], args[1], args[2], { log: (line) => process.stderr.write(`${line}\n`) });
      process.stdout.write(`${JSON.stringify(result)}\n`);
      return EXIT_OK;
    }
    case '-h':
    case '--help':
      usage();
      return EXIT_OK;
    default:
      return usage();
  }
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`browser-gate-env: ${error.message}\n`);
    process.exitCode = error.code || 1;
  }
}
