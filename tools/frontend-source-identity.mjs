#!/usr/bin/env node
/**
 * frontend-source-identity.mjs — what source a gate run actually tested.
 *
 * Why this exists (FR9-05): the gate wrapper used to record
 * `head=<sha> tree=<sha> branch=<name> status_sha256=<sha of `git status --porcelain`` and call that
 * source identity. It is not one. `git status --porcelain` names *which* paths differ, never what is
 * in them, so editing the bytes of a file that is already `M` leaves the hash untouched and a run
 * against different source carries the same identity as the run before it. An untracked directory
 * collapses to a single `?? reports/` line, so the several hundred kilobytes under it are unnamed too.
 * The `tree` field made it worse by looking precise: it is the *base* tree, the code before the
 * changes being tested, and `source:` in the report was reading like the tested tree when it was not.
 *
 * So identity here is the content: a sorted manifest of `{path, mode, size, sha256}` for every file
 * the gates read, hashed into one digest. Change a byte of a modified file, add a file, delete a file,
 * flip an executable bit, and the digest changes. Same tree, different mtime, and it does not.
 *
 * The manifest is *the record*, and the optional snapshot beside it makes the run reconstructable: the
 * digest says which source produced a result, and the tarball says what that source was, without
 * having to stage a single owner file to get a tree hash for it.
 *
 * Usage:
 *   node tools/frontend-source-identity.mjs --repo <path> --out <manifest.json> [--snapshot <tar.gz>]
 *                                            [--print-digest] [--quiet]
 *
 * Exit codes: 0 written; 2 usage error; 3 the repository could not be read.
 *
 * Nothing here prints file contents, and secrets are excluded by path policy rather than by guessing.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmodSync, closeSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readlinkSync, statSync, writeSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { auditSnapshot, canonicalPath, verifySnapshot } from './frontend-snapshot-verify.mjs';
export { verifySnapshot };

/** Exclusive output: an existing run artifact is never overwritten. */
const writeFile = (path, data) => {
  const fd = openSync(path, 'wx');
  try {
    writeSync(fd, data);
  } finally {
    closeSync(fd);
  }
};

export const IDENTITY_SCHEMA = 'frontend-source-identity/1';

/**
 * What the gates read, and therefore what a digest has to name.
 *
 * A gate can only be about code it loaded. The application, the no-build loader, the test harness and
 * its lockfile, the static gates in `tools/`, and the reports a run appends its own evidence to — all
 * of it decides the answer, so all of it is in the manifest. Documentation, screenshots and CI config
 * are not executed by any gate and are left out deliberately rather than by accident.
 */
export const INCLUDE_ROOTS = [
  'assets',
  'vue',
  'tools',
  'tests/regression',
  'tests/browser',
  'reports',
];

/** Individual files that decide what the gates do. */
export const INCLUDE_FILES = [
  'index.html',
  'tests/package.json',
  'tests/package-lock.json',
];

/**
 * What is left out, and why.
 *
 * The first three are not source: `.git` is the repository, `node_modules` is an install of it, and the
 * Playwright output directories are written *by* a run. The rest is evidence, and evidence is the one
 * thing a gate must not be able to hash into itself: the wrapper writes a manifest per run, so if those
 * files were included the digest would change the moment the run recorded it and every run would look
 * like it had drifted from itself.
 *
 * `.env`-shaped paths are excluded by name so a real credential cannot reach a manifest even if somebody
 * adds one to the tree; nothing in the gates reads them.
 *
 * `reports/FRONTEND-RUN-CLAIMS.json` is excluded for the same reason as `reports/evidence` and is the
 * same hazard. The sidecar declares each run's tier, exit code, outcome counts and source digest, so it
 * is written *after* the runs it describes. Leaving it in the manifest would make every run's digest
 * depend on the previous round's declarations, and no run could ever be recorded against the tree that
 * records it — the digest would be a function of the reporting, not of the code. The reports prose is
 * deliberately *not* excluded on the same grounds: it is written by the same hands as the code and is
 * worth having a digest move when it does.
 */
export const EXCLUDE_PREFIXES = [
  '.git',
  'node_modules',
  'tests/test-results',
  'tests/playwright-report',
  'reports/evidence',
  'reports/FRONTEND-RUN-CLAIMS.json',
  'reports/FRONTEND-SOURCE-COMPARISONS.json',
];

/** Never hashed, never snapshotted, whatever else the policy says. */
export const EXCLUDE_NAME_PATTERN = /(^|\/)(\.env(\..*)?|.*\.pem|.*\.key|id_rsa(\.pub)?)$/;

const toPosix = (value) => value.split(sep).join('/');

/**
 * Does this file have any execute bit?
 *
 * This is the whole of Git's mode classification, and it is exported because it is the question a restore
 * has to ask and the question the old restore check got wrong (FR11-06). That check read
 * `stat -c %a | .endsWith('5')` — a question about the last character of an octal string, which answers
 * `false` for 0700, 0750, 0754, 0711, 0775, 0100: every executable mode that does not happen to end in a
 * 5. A file restored as 0700 under a restrictive umask was therefore reported as non-executable and the
 * test failed, and the same wrong predicate would have reported it as non-executable on a machine with no
 * unusual umask at all if the archive had ever carried such a mode.
 *
 * The bitmask is the question. `gitMode` and any restore check must ask this one function, so that there
 * is a single answer in the codebase to be right or wrong about.
 */
export const hasExecuteBit = (mode) => (mode & 0o111) !== 0;

/** The git mode (`100644`, `100755`) git itself would record, so a manifest is comparable with a tree. */
const gitMode = (mode) => `100${hasExecuteBit(mode) ? '755' : '644'}`;

/** The two modes a manifest records, and the only two Git stores. */
export const MANIFEST_MODES = Object.freeze({ executable: '100755', plain: '100644' });

/**
 * The mode contract, in one place, because it is three claims and they are easy to mix up (FR11-06).
 *
 *  1. **Classification** is `hasExecuteBit` — "does this file have any execute bit". Nothing else decides
 *     what counts as executable, so there is one answer in the codebase to be right or wrong about.
 *  2. **The recorded mode** is normalised to `100755` or `100644`, because Git stores no other mode. A
 *     file restored as 0700 is *classified* as executable, correctly, and is still not the mode the
 *     manifest recorded.
 *  3. **The restored mode** must be exactly `0755` or `0644` as the manifest says. The bitmask alone
 *     would be satisfied by 0700 standing in for 0755, which is precisely how mode loss hides behind a
 *     correct "yes, it is executable" answer — so the exact assertion is a separate claim, not a
 *     redundant one.
 *
 * The review left this as a choice ("bitmask or exact?") and the answer is both, at different levels, and
 * they are asserted at different levels too. What was genuinely undecided was the *extraction* policy, and
 * that is decided below and measured rather than assumed.
 */
export const MODE_CONTRACT = Object.freeze({
  /** How a mode is asked about executability. */
  classify: hasExecuteBit,
  /** The modes a manifest may record. */
  recorded: MANIFEST_MODES,
  /** The exact mode a restore must produce, per classification. */
  exactModeFor: (isExecutable) => (isExecutable ? 0o755 : 0o644)
});

/** Legacy tar permission flags retained for historical counterfactual tests.
 * Current extraction audits all regular ustar entries, creates exclusive files and chmods
 * exact 0644/0755 after writing, including on hosts with inherited default ACLs.
 */
export const SNAPSHOT_EXTRACT_ARGS = Object.freeze(['-xzpf']);

/**
 * Whether these tar flags carry `--preserve-permissions`, derived from the flags rather than asserted
 * alongside them.
 *
 * `-p` is a letter inside the combined `-xzpf`, not an argument of its own, so a check that looked for the
 * string `'-p'` would be testing a spelling and not the property. Exported as a function so the derivation
 * can be pinned against flags that do *not* preserve — a constant computed once from the real flags would
 * otherwise be untestable and could only ever agree with itself.
 */
export const preservesPermissions = (args) => args
  .some((flag) => flag === '--preserve-permissions' || (/^-[A-Za-z]+$/.test(flag) && flag.slice(1).includes('p')));

/** Whether the policy above really preserves permissions, for the flags it is actually written with. */
export const SNAPSHOT_PRESERVES_PERMISSIONS = preservesPermissions(SNAPSHOT_EXTRACT_ARGS);

/** Audit the entire archive before restoring regular files with exact permissions. */
export function extractSnapshot(archive, target) {
  const entries = auditSnapshot(archive); // All headers/types audited before any write.
  const root = resolve(target);
  if (!lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()) throw new Error('snapshot: target must be a real directory');
  for (const entry of entries) {
    let parent = root;
    for (const part of entry.path.split('/').slice(0,-1)) {
      parent = join(parent,part);
      try { mkdirSync(parent, {mode:0o755}); } catch(error) { if (error.code !== 'EEXIST') throw error; }
      const stat = lstatSync(parent);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('snapshot: unsafe extraction parent');
      chmodSync(parent,0o755);
    }
    const destination = join(root,entry.path);
    writeFile(destination,entry.bytes); // Exclusive: cannot follow an existing link/file.
    chmodSync(destination,parseInt(entry.mode.slice(-3),8));
  }
}

const isExcluded = (posixPath) => {
  if (EXCLUDE_NAME_PATTERN.test(posixPath)) return true;
  return EXCLUDE_PREFIXES.some((prefix) => posixPath === prefix || posixPath.startsWith(`${prefix}/`));
};

const shouldInclude = (posixPath) => {
  if (isExcluded(posixPath)) return false;
  if (INCLUDE_FILES.includes(posixPath)) return true;
  return INCLUDE_ROOTS.some((root) => posixPath === root || posixPath.startsWith(`${root}/`));
};

/**
 * Every included file under `repo`, as POSIX paths relative to it, in sorted order.
 *
 * Walking the tree rather than reading `git ls-files` is deliberate: the untracked files *are* the ones
 * a status-based identity cannot name, so they have to be in the manifest, and a walk finds them
 * without staging anything.
 *
 * A symlink is collected like anything else and resolved nowhere. `lstat` is what tells the two apart,
 * and the previous version used `readdir`'s own type — which reports a link as a link — but then handed
 * the path to `statSync` and `readFileSync`, both of which follow it. So a `.mjs` symlink pointing at a
 * `.env` file was read, hashed and copied into the snapshot: a file whose *name* was checked against the
 * secret policy and whose *bytes* were not.
 */
export function collectSourcePaths(repo) {
  const found = [];
  const walk = (absolute) => {
    const entries = readdirSync(absolute, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const entry of entries) {
      const child = join(absolute, entry.name);
      const posix = toPosix(relative(repo, child));
      if (isExcluded(posix)) continue;
      if (entry.isDirectory()) {
        walk(child);
        continue;
      }
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      if (shouldInclude(posix)) found.push(posix);
    }
  };
  walk(repo);
  return found.sort();
}

/**
 * Where a symlink points, and whether that is anywhere this identity can vouch for (FR10-05).
 *
 * The link is read as a *path* and never as content — `readlinkSync` stops at the name. That is the whole
 * of the leak: a link's target is a string, so recording it cannot disclose a secret, while following it
 * would hash and copy the secret's bytes into a manifest and a tarball that ship with the review package.
 *
 * A target outside the repository is refused outright rather than recorded. A snapshot that links to
 * something the identity does not cover is not reconstructable, and a link out of the tree is also how a
 * reader is walked somewhere it should not go; a manifest that says "this file was here" when the file
 * lives on a machine that has since been rebuilt is the failure this whole tool exists to prevent.
 *
 * @returns {{target: string, resolved: string, inRepo: boolean, targetExcluded: boolean}}
 * @throws when the link leaves the repository
 */
export function symlinkTarget(repo, posixPath) {
  const root = resolve(repo);
  const target = readlinkSync(join(root, posixPath));
  // A relative target is relative to the directory holding the link, which is what the link means to
  // anything that opens it — and the only interpretation that makes `tools/alias.mjs -> ../secrets` work.
  const resolved = resolve(dirname(join(root, posixPath)), target);
  const inRepo = resolved === root || resolved.startsWith(`${root}${sep}`);
  const targetExcluded = isExcluded(toPosix(relative(root, resolved)));

  if (!inRepo) {
    throw new Error(
      `${posixPath} is a symlink to ${target}, which resolves to ${resolved} — outside the repository. `
      + 'A snapshot that links outside its own tree cannot be reconstructed or checked, so this is refused. '
      + 'Remove the link, or move what it points at inside the repository.'
    );
  }
  return { target, resolved, inRepo, targetExcluded };
}

const sha256File = (absolute) => {
  const digest = createHash('sha256');
  digest.update(readFileSync(absolute));
  return digest.digest('hex');
};

/** `git status --porcelain` is kept as *metadata* — it names paths, so it explains a change, not proves one. */
const gitState = (repo) => {
  const run = (...args) => {
    try {
      return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (_error) {
      return null;
    }
  };
  const status = run('status', '--porcelain');
  return {
    head: run('rev-parse', 'HEAD'),
    // The base tree, explicitly named as such. The tested tree is the `digest` below; calling this
    // "source" is what made the old metadata read like an identity when it was not one.
    baseTree: run('rev-parse', 'HEAD^{tree}'),
    branch: run('rev-parse', '--abbrev-ref', 'HEAD'),
    statusSha256: status === null ? null : createHash('sha256').update(status).digest('hex'),
    statusEntryCount: status === null ? null : status.split('\n').filter(Boolean).length,
  };
};

/** The one hash everything else is checked against. Paths and modes are inside it, not beside it. */
export const digestOf = (files) => {
  const digest = createHash('sha256');
  for (const file of files) {
    digest.update(`${JSON.stringify(file)}\n`);
  }
  return digest.digest('hex');
};

/** Strict schema precedes digest checking; self-consistent malformed JSON is not evidence. */
export function verifySourceManifest(manifest) {
  const fail = message => { throw new Error(`source manifest: ${message}`); };
  if (!manifest || manifest.schema !== IDENTITY_SCHEMA || !Array.isArray(manifest.files)) fail('invalid schema or files');
  if (!Number.isSafeInteger(manifest.fileCount) || manifest.fileCount < 0 || manifest.fileCount !== manifest.files.length) fail('invalid fileCount');
  if (typeof manifest.digest !== 'string' || !/^[0-9a-f]{64}$/.test(manifest.digest)) fail('invalid digest');
  const seen = new Set();
  let previous = null;
  for (const file of manifest.files) {
    if (!file || !canonicalPath(file.path)) fail('invalid canonical path');
    if (previous !== null && previous >= file.path) fail('files must be unique and sorted');
    if ((file.kind !== undefined && file.kind !== 'file') || !['100644','100755'].includes(file.mode)) fail('invalid kind or mode; symlinks refused');
    if ('target' in file || 'targetExcluded' in file) fail('unexpected link target');
    if (!Number.isSafeInteger(file.size) || file.size < 0 || typeof file.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(file.sha256)) fail('invalid size or hash');
    seen.add(file.path); previous=file.path;
  }
  for (const path of seen) {
    const parts=path.split('/');
    while(parts.length>1) { parts.pop(); if(seen.has(parts.join('/'))) fail('file-directory collision'); }
  }
  if (digestOf(manifest.files) !== manifest.digest) fail('digest mismatch');
  return manifest;
}

export function compareSourceManifests(fromRunId, before, after) {
  verifySourceManifest(before); verifySourceManifest(after);
  const left=new Map(before.files.map(f=>[f.path,JSON.stringify(f)]));
  const right=new Map(after.files.map(f=>[f.path,JSON.stringify(f)]));
  const changedPaths=[...new Set([...left.keys(),...right.keys()])].sort().filter(path=>left.get(path)!==right.get(path));
  const reportOnly=new Set(['reports/FRONTEND-HANDOFF.vi.md','reports/FRONTEND-FINDING-MATRIX.tsv','reports/FRONTEND-EXECUTION-LOG.vi.md']);
  return {fromRunId,fromDigest:before.digest,toDigest:after.digest,changedPaths,
    classification:changedPaths.length===0?'IDENTICAL':changedPaths.every(path=>reportOnly.has(path))?'REPORT_ONLY':'SOURCE_CHANGE'};
}

export function verifySourceComparisons(document, runManifests, current) {
  if(document?.schema !== 'frontend-source-comparisons/1' || !Array.isArray(document.entries)) throw new Error('invalid comparison schema');
  const seen=new Set();
  for(const entry of document.entries) {
    if(!entry || typeof entry.fromRunId !== 'string' || seen.has(entry.fromRunId)) throw new Error('invalid/duplicate comparison run');
    seen.add(entry.fromRunId);
    const before=runManifests.get(entry.fromRunId);
    if(!before) throw new Error(`comparison run unavailable: ${entry.fromRunId}`);
    const actual=compareSourceManifests(entry.fromRunId,before,current);
    for(const key of Object.keys(actual)) if(JSON.stringify(entry[key])!==JSON.stringify(actual[key])) throw new Error(`comparison ${entry.fromRunId}: incorrect ${key}`);
  }
  return document;
}

export function buildManifest(repo, { generatedAt = new Date().toISOString() } = {}) {
  const root = resolve(repo);
  const paths = collectSourcePaths(root);
  const files = paths.map((posix) => {
    const absolute = join(root, posix);
    // `lstat`, never `stat`: the question is what is at this path, not what it eventually reaches.
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink()) throw new Error(`source manifest: symlink refused by current policy: ${posix}`);
    return {
      path: posix,
      kind: 'file',
      mode: gitMode(stats.mode),
      size: stats.size,
      sha256: sha256File(absolute),
    };
  });
  return verifySourceManifest({
    schema: IDENTITY_SCHEMA,
    generatedAt,
    repo: gitState(root),
    policy: { includeRoots: INCLUDE_ROOTS, includeFiles: INCLUDE_FILES, excludePrefixes: EXCLUDE_PREFIXES },
    fileCount: files.length,
    digest: digestOf(files),
    files,
  });
}

/* ------------------------------------------------------------------------------------------------
 * A deterministic tar of the same files, so a run can be reconstructed.
 *
 * Written here rather than shelled out to because "deterministic" has to mean the same thing on every
 * machine: entries sorted by path, owner and mode from the manifest, and mtime/uid/gid fixed at zero,
 * so re-snapshotting identical content produces identical bytes and a diff between two snapshots says
 * something about the source rather than about the clock.
 * ---------------------------------------------------------------------------------------------- */

const BLOCK = 512;

const octal = (value, width) => value.toString(8).padStart(width - 1, '0') + '\0';

/**
 * Splits a path across ustar's `name` and `prefix` fields at a `/` (FR10-05).
 *
 * A ustar header stores the path as `prefix + '/' + name`, with 100 bytes for the name and 155 for the
 * prefix. The previous version cut at `length - 100` — an arbitrary byte offset — and then wrote both
 * halves as if the split were at a separator. A reader joins the two fields with a slash, so the archive
 * did not contain a mangled name: it contained a *different file*. `tools/` plus 110 `a`s plus `.mjs`
 * came back as `tools/aaaa…/…mjs`, a path that does not exist, from a manifest whose hash was perfectly
 * correct. That is the worst shape a snapshot bug can take — the digest says the content is right and the
 * content is right, and the two are filed under different names.
 *
 * So the split is a separator, always. The search is over the byte positions of the `/` characters and
 * takes the first one that leaves both fields non-empty and inside their limits, which is the same choice
 * GNU tar makes. Splitting *between* characters is not a hazard here for the same reason it is a hazard
 * elsewhere: the candidate positions are slash bytes, and a slash byte cannot be the continuation byte of
 * a multi-byte sequence, so each half is always whole characters.
 *
 * A path with no usable split is refused rather than mangled. A PAX extended header would express it, but
 * adding a second on-disk format to keep a byte-stable output would trade a reproducible archive for one
 * that differs between a reader that understands PAX and one that does not — so the honest answer is the
 * error, naming the limit that was hit.
 *
 * @returns {{name: string, prefix: string}}
 */
export const splitUstarPath = (path) => {
  const bytes = Buffer.from(path, 'utf8');
  if (bytes.length <= 100) return { name: path, prefix: '' };

  for (let at = 0; at < bytes.length; at += 1) {
    if (bytes[at] !== 0x2f) continue; // '/'
    const prefix = bytes.subarray(0, at).toString('utf8');
    const name = bytes.subarray(at + 1).toString('utf8');
    // A split needs two fields. The first separator of a relative path would leave the prefix empty, and
    // "empty prefix" is not the same thing as "no prefix": a reader that joins unconditionally would rebuild
    // `/tools/…` with a leading slash, which is an absolute path and points somewhere else on disk. Skipping
    // it also matches how GNU tar chooses, and it makes the chosen split the one a reader would agree with.
    if (prefix === '' || name === '') continue;
    if (Buffer.byteLength(prefix, 'utf8') > 155) break; // prefixes only get longer from here
    if (Buffer.byteLength(name, 'utf8') > 100) continue;
    return { name, prefix };
  }

  throw new Error(
    `path cannot be stored in a ustar header: ${path} is ${bytes.length} bytes and has no "/" that leaves a `
    + `name of at most 100 bytes and a prefix of at most 155 bytes. Renaming it, or moving it nearer the root, `
    + 'is the fix; a snapshot that renames files to fit is worse than one that refuses.'
  );
};

const tarHeader = ({ path, mode, size, type = '0' }) => {
  const { name, prefix } = splitUstarPath(path);
  const header = Buffer.alloc(BLOCK);
  // `Buffer.write` zero-pads anything shorter than the field, which is exactly the NUL padding ustar
  // expects, so a name of exactly 100 bytes and a name of 3 bytes are written the same way.
  header.write(name, 0, 100, 'utf8');
  header.write(octal(parseInt(mode, 8), 8), 100, 8, 'ascii');
  header.write(octal(0, 8), 108, 8, 'ascii');
  header.write(octal(0, 8), 116, 8, 'ascii');
  header.write(octal(size, 12), 124, 12, 'ascii');
  header.write(octal(0, 12), 136, 12, 'ascii');
  header.write('        ', 148, 8, 'ascii');
  header.write(type, 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  if (prefix) header.write(prefix, 345, 155, 'utf8');
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(octal(checksum, 7), 148, 7, 'ascii');
  header.write(' ', 155, 1, 'ascii');
  return header;
};

const pad = (size) => (size % BLOCK === 0 ? Buffer.alloc(0) : Buffer.alloc(BLOCK - (size % BLOCK)));

/**
 * The ustar mode for a manifest entry.
 *
 * The manifest records the *git* mode (`100644`, `100755`, `120000`) because that is what makes a manifest
 * comparable with a tree, and a git mode is not a unix mode: `100644` is not `644`, it is a four-digit
 * number that a restore would apply as mode `0100644`. Writing the manifest's field into the header is
 * also wrong for links, whose git mode `120000` becomes `0100000`.
 *
 * So the two encodings are translated here, once. A regular file keeps only its permission bits; a link
 * takes `0777`, which is what every tar writer on earth puts there and what a restore needs in order to
 * recreate the link itself rather than a file with odd permissions.
 */
const ustarMode = (file) => (file.kind === 'symlink' ? '777' : file.mode.slice(-3));

/**
 * A gzip of the same content at the same level every time, so a snapshot is comparable byte for byte.
 *
 * A symlink is written as a symlink: ustar type `2`, with the target as the entry's body, and the target's
 * *file* never opened. Copying the bytes through would both disclose whatever it points at and produce an
 * archive that restores as a regular file — a snapshot whose bytes are right and whose tree is wrong, which
 * is the same failure as the long-path one in a different column.
 */
export function buildSnapshot(repo, files) {
  verifySourceManifest({schema:IDENTITY_SCHEMA,files,fileCount:files.length,digest:digestOf(files)});
  const parts = [];
  for (const file of files) {
    const stats = lstatSync(join(repo,file.path));
    if (!stats.isFile() || gitMode(stats.mode) !== file.mode) throw new Error(`source drift: mode/type changed: ${file.path}`);
    const isLink = false;
    parts.push(tarHeader({ path: file.path, mode: ustarMode(file), size: file.size, type: isLink ? '2' : '0' }));
    const body = isLink
      ? Buffer.from(file.target, 'utf8')
      : readFileSync(join(repo, file.path));
    if (body.length !== file.size || createHash('sha256').update(body).digest('hex') !== file.sha256) throw new Error(`source drift: bytes changed: ${file.path}`);
    parts.push(body, pad(body.length));
  }
  parts.push(Buffer.alloc(BLOCK * 2));
  return gzipSync(Buffer.concat(parts), { level: 9, mtime: 0 });
}

/* -------------------------------------------------------------------------------------------------- */

const usage = () => {
  process.stderr.write(
    'usage: frontend-source-identity.mjs --repo <path> --out <manifest.json> '
    + '[--snapshot <tar.gz>] [--print-digest] [--quiet]\n'
  );
};

const main = (argv) => {
  let repo = null;
  let out = null;
  let snapshot = null;
  let printDigest = false;
  let quiet = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo') repo = argv[++index];
    else if (arg === '--out') out = argv[++index];
    else if (arg === '--snapshot') snapshot = argv[++index];
    else if (arg === '--print-digest') printDigest = true;
    else if (arg === '--quiet') quiet = true;
    else if (arg === '-h' || arg === '--help') { usage(); return 0; }
    else { process.stderr.write(`frontend-source-identity: unknown option ${arg}\n`); usage(); return 2; }
  }

  if (!repo || !out) { usage(); return 2; }

  let manifest;
  try {
    manifest = buildManifest(repo);
  } catch (error) {
    process.stderr.write(`frontend-source-identity: could not read ${repo}: ${error.message}\n`);
    return 3;
  }

  const snapshotBytes = snapshot ? buildSnapshot(resolve(repo), manifest.files) : null;
  if (snapshotBytes) {
    verifySnapshot(snapshotBytes,manifest);
    if (buildManifest(repo).digest !== manifest.digest) throw new Error('source drift during snapshot capture');
  }
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFile(resolve(out), Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'));

  if (snapshot) {
    mkdirSync(dirname(resolve(snapshot)), { recursive: true });
    writeFile(resolve(snapshot), snapshotBytes);
  }

  if (printDigest) process.stdout.write(`${manifest.digest}\n`);
  if (!quiet) {
    process.stdout.write(
      `frontend-source-identity: ${manifest.fileCount} files, digest ${manifest.digest}\n`
      + `  manifest: ${out}${snapshot ? `\n  snapshot: ${snapshot}` : ''}\n`
    );
  }
  return 0;
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
