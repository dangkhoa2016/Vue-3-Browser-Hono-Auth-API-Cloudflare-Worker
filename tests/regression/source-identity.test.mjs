/**
 * FR9-05 — the identity a gate run records has to be the *content* of the source, not its shape.
 *
 * The gate wrapper used to record `status_sha256`, the hash of `git status --porcelain`. That is a hash
 * of file *names*: it says which paths differ from HEAD and nothing about what is in them. So editing
 * the bytes of a file that is already `M` left the recorded identity untouched, and two runs against
 * different source carried the same identity — including a red run and a green one. An untracked
 * directory collapsed to a single `?? reports/` line, so everything underneath it was unnamed, and the
 * `tree=` field made it read like a precise answer while naming the *base* tree rather than the tree
 * that was tested.
 *
 * Every case below is therefore written as a pair: the same edit, observed through the old status hash
 * and through the content digest. Where the status hash does not move, that is the defect being pinned
 * shut — a test that only checked "the digest changed" would still pass if the digest were accidentally
 * constant.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  statSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import {
  IDENTITY_SCHEMA,
  MANIFEST_MODES,
  MODE_CONTRACT,
  SNAPSHOT_EXTRACT_ARGS,
  SNAPSHOT_PRESERVES_PERMISSIONS,
  buildManifest,
  buildSnapshot,
  collectSourcePaths,
  digestOf,
  extractSnapshot,
  hasExecuteBit,
  preservesPermissions,
  splitUstarPath,
  symlinkTarget,
} from '../../tools/frontend-source-identity.mjs';

const TOOL = fileURLToPath(new URL('../../tools/frontend-source-identity.mjs', import.meta.url));

/** A throwaway repository shaped like this one: a committed baseline plus the dirty delta a round leaves. */
function makeRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'frontend-identity-'));
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '--quiet');
  git('config', 'user.email', 'identity@example.test');
  git('config', 'user.name', 'identity');

  const write = (path, content, mode = 0o644) => {
    const absolute = join(repo, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
    chmodSync(absolute, mode);
  };

  write('index.html', '<script src="https://unpkg.com/vue@3.5.43/dist/vue.global.js"></script>\n');
  write('assets/js/api/sessionCoordinator.js', 'export const A = 1;\n');
  write('tests/regression/some.test.mjs', "import { test } from 'node:test';\n");
  write('tests/package.json', '{ "name": "verification" }\n');
  write('tests/package-lock.json', '{ "lockfileVersion": 3 }\n');
  write('reports/FRONTEND-HANDOFF.vi.md', 'handoff\n');
  git('add', '--all');
  git('commit', '--quiet', '-m', 'baseline');

  // The delta a remediation round actually leaves behind: a file already modified, new untracked
  // helpers, and a new evidence directory. The wrapper and the browser helper are *untracked* on
  // purpose — that is the shape R7 left, and an untracked file is the one `git status` names as a
  // single line no matter how much is under it.
  write('assets/js/api/sessionCoordinator.js', 'export const A = 2;\n');
  write('tests/browser/helpers/browser-fixture.mjs', 'export const guard = true;\n');
  write('tools/run-frontend-gate.sh', '#!/usr/bin/env bash\n# wrapper\n', 0o755);
  write('reports/evidence/old.log', 'previous run\n');
  return { repo, write, git };
}

/** The identity the R7 wrapper recorded: names, not content. */
const statusHash = (repo) => execFileSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' });

const withRepo = (fn) => {
  const fixture = makeRepo();
  try {
    return fn(fixture);
  } finally {
    rmSync(fixture.repo, { recursive: true, force: true });
  }
};

test('editing the bytes of an already-modified file changes the identity, and the old status hash does not', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);
    const statusBefore = statusHash(repo);
    assert.match(statusBefore, /^ M assets\/js\/api\/sessionCoordinator\.js$/m,
      'the fixture really is a file that git already calls modified');

    write('assets/js/api/sessionCoordinator.js', 'export const A = 2; // one more byte\n');

    const after = buildManifest(repo);
    assert.equal(statusHash(repo), statusBefore,
      'this is the defect: the file was already M, so the status text — and its hash — cannot move');
    assert.notEqual(after.digest, before.digest,
      'the content digest has to move, because the source the next run would test is not the same source');
  });
});

test('the bytes of an untracked helper change the identity, even though the status names only its directory', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);
    // The whole untracked tree collapses to one line. Nothing in it is identified, which is the other
    // half of the same defect: `?? tools/` is equally true of a one-line wrapper and of a full suite.
    const statusBefore = statusHash(repo);
    assert.match(statusBefore, /^\?\? tools\/$/m);

    write('tools/run-frontend-gate.sh', '#!/usr/bin/env bash\n# a different wrapper\n', 0o755);

    const after = buildManifest(repo);
    assert.equal(statusHash(repo), statusBefore, 'the status line is unchanged, so the edit is not on the record');
    assert.notEqual(after.digest, before.digest);
  });
});

test('an executable bit is part of the identity', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);
    assert.equal(before.files.find((file) => file.path === 'tools/run-frontend-gate.sh').mode, '100755');

    write('tools/run-frontend-gate.sh', '#!/usr/bin/env bash\n# wrapper\n', 0o644);

    const after = buildManifest(repo);
    assert.equal(after.files.find((file) => file.path === 'tools/run-frontend-gate.sh').mode, '100644');
    assert.notEqual(after.digest, before.digest, 'losing the executable bit changes what the tool can do');
  });
});

test('adding and deleting a file both change the identity', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);

    write('tests/regression/harness-boundaries.test.mjs', "import { test } from 'node:test';\n");
    const added = buildManifest(repo);
    assert.notEqual(added.digest, before.digest);
    assert.ok(added.files.some((file) => file.path === 'tests/regression/harness-boundaries.test.mjs'));

    rmSync(join(repo, 'tests/regression/harness-boundaries.test.mjs'));
    const removed = buildManifest(repo);
    assert.notEqual(removed.digest, added.digest);
    assert.equal(removed.digest, before.digest, 'a deleted file puts the identity back where it was');
  });
});

test('the same tree produces the same digest however the filesystem feels about it', () => {
  withRepo(({ repo }) => {
    const first = buildManifest(repo);
    // Touching mtimes is what a checkout, a copy or a `touch` does, and none of it changes the source.
    for (const file of first.files) {
      const stamp = new Date(Date.UTC(1999, 0, 1));
      utimesSync(join(repo, file.path), stamp, stamp);
    }
    const second = buildManifest(repo);
    assert.equal(second.digest, first.digest, 'mtime is not identity');
    assert.deepEqual(second.files, first.files);
  });
});

test('evidence written by a run is outside the identity, so a run cannot invalidate its own record', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);
    // What the wrapper does after the producer finishes: a log, a manifest and a snapshot, all under
    // reports/evidence. If those were hashed, the digest would change the instant the run recorded it
    // and every run would read as having drifted from itself.
    write('reports/evidence/unit-20260928T000000Z.log', 'pass 220\n');
    write('reports/evidence/unit-20260928T000000Z.meta', 'exit: 0\n');
    write('reports/evidence/unit-20260928T000000Z.manifest.json', '{ "digest": "..." }\n');
    assert.equal(buildManifest(repo).digest, before.digest);
    assert.ok(!collectSourcePaths(repo).some((path) => path.startsWith('reports/evidence/')));
  });
});

test('the run-claims sidecar is outside the identity, so a run can be recorded against the tree it ran', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);
    // The sidecar declares each run's tier, exit code, counts and source digest, so it is written after
    // the runs it describes. If it were hashed, every run's digest would be a function of the previous
    // round's reporting and no run could ever match the tree that records it.
    write('reports/FRONTEND-RUN-CLAIMS.json', '{ "schema": "frontend-run-claims/1", "runs": [] }\n');
    assert.equal(buildManifest(repo).digest, before.digest);
    assert.ok(!collectSourcePaths(repo).includes('reports/FRONTEND-RUN-CLAIMS.json'));
  });
});

test('the reports prose is inside the identity, so editing a report moves the digest', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);
    // The sidecar is excluded because it is a record *about* runs. The prose is not: it is written by the
    // same hands as the code, and a digest that ignores it cannot tell two delivered trees apart.
    write('reports/FRONTEND-HANDOFF.vi.md', '# Handoff\n\n| unit | 314/314 |\n');
    assert.notEqual(buildManifest(repo).digest, before.digest);
  });
});

test('node_modules, git and the Playwright output directories are not source', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);
    write('tests/node_modules/playwright/index.js', 'module.exports = 1;\n');
    write('tests/test-results/.last-run.json', '{ "status": "passed" }\n');
    write('tests/playwright-report/index.html', '<html></html>\n');
    assert.equal(buildManifest(repo).digest, before.digest);
  });
});

test('an env-shaped path is excluded by name even inside an included tree', () => {
  withRepo(({ repo, write }) => {
    const before = buildManifest(repo);
    write('assets/js/.env.production', 'SECRET=fake\n');
    const manifest = buildManifest(repo);
    assert.equal(manifest.digest, before.digest);
    assert.ok(!collectSourcePaths(repo).some((path) => path.includes('.env')), 'no credential can reach a manifest');
  });
});

test('a manifest names what was in the run, and the base tree is labelled as the base', () => {
  withRepo(({ repo }) => {
    const manifest = buildManifest(repo);
    assert.equal(manifest.schema, IDENTITY_SCHEMA);
    assert.equal(manifest.digest, digestOf(manifest.files));
    assert.ok(manifest.repo.head, 'HEAD is recorded');
    assert.ok(manifest.repo.baseTree, 'and the base tree, named as the base rather than as "source"');
    assert.equal(manifest.repo.branch, manifest.repo.branch);
    assert.deepEqual(manifest.files.map((file) => file.path), [...manifest.files.map((file) => file.path)].sort(),
      'a sorted manifest is what makes the digest independent of directory order');
    for (const file of manifest.files) {
      assert.match(file.mode, /^100(644|755)$/);
      assert.equal(typeof file.size, 'number');
      assert.match(file.sha256, /^[0-9a-f]{64}$/);
    }
  });
});

test('a snapshot restores every file the manifest names, with the mode the manifest recorded', () => {
  withRepo(({ repo }) => {
    const manifest = buildManifest(repo);
    const archive = buildSnapshot(repo, manifest.files);
    const target = mkdtempSync(join(tmpdir(), 'frontend-restore-'));
    try {
      writeFileSync(join(target, 'snapshot.tar.gz'), archive);
      extractSnapshot(join(target, 'snapshot.tar.gz'),target);
      for (const file of manifest.files) {
        const restored = join(target, file.path);
        const actual = readFileSync(restored);
        assert.equal(actual.length, file.size, `${file.path} size`);
        assert.equal(execFileSync('sha256sum', [restored], { encoding: 'utf8' }).slice(0, 64), file.sha256,
          `${file.path} content`);
        const executable = hasExecuteBit(statSync(restored).mode);
        assert.equal(statSync(restored).mode & 0o777, file.mode === '100755' ? 0o755 : 0o644);
        assert.equal(executable, file.mode === '100755', `${file.path} mode`);
      }
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

test('the same content snapshots to the same bytes, and a changed byte changes them', () => {
  withRepo(({ repo, write }) => {
    const first = buildSnapshot(repo, buildManifest(repo).files);
    const second = buildSnapshot(repo, buildManifest(repo).files);
    assert.deepEqual(first, second, 'a snapshot that varies run to run cannot be compared across runs');

    write('assets/js/api/sessionCoordinator.js', 'export const A = 3;\n');
    assert.notDeepEqual(buildSnapshot(repo, buildManifest(repo).files), first);
  });
});

test('the CLI writes what the library builds, and reports the digest on stdout', () => {
  withRepo(({ repo }) => {
    const out = join(repo, 'reports', 'evidence', 'cli.manifest.json');
    const printed = execFileSync('node', [TOOL, '--repo', repo, '--out', out], { encoding: 'utf8' });
    const written = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(written.digest, buildManifest(repo).digest);
    assert.match(printed, new RegExp(written.digest), 'the digest the wrapper records is the digest on stdout');

    // `--print-digest` alone is what the wrapper pipes into its metadata, so it has to be the only
    // thing on stdout: a line of prose there would end up inside a recorded hash field.
    assert.equal(
      execFileSync('node', [TOOL, '--repo', repo, '--out', out + '.second', '--print-digest', '--quiet'], { encoding: 'utf8' }).trim(),
      written.digest
    );
  });
});

test('a usage error is exit 2 and an unreadable repository is exit 3, not a zero that looks like a pass', () => {
  const statusOf = (args) => {
    try {
      execFileSync('node', [TOOL, ...args], { stdio: 'pipe' });
      return 0;
    } catch (error) {
      return error.status;
    }
  };
  assert.equal(statusOf([]), 2, 'no arguments is a usage error');
  assert.equal(statusOf(['--nonsense']), 2, 'an unknown option is a usage error');
  assert.equal(statusOf(['--repo', '/nonexistent-repo', '--out', '/tmp/unused.json']), 3,
    'a repository that cannot be read is distinguishable from a usage error');
});

/* ------------------------------------------------------------------------------------------------
 * FR10-05 — a snapshot has to restore the tree it claims to describe.
 *
 * Both defects here are the same shape: the manifest was right and the archive was wrong, so every
 * digest in the review package could be checked and reproduce while the files behind them were filed
 * under names that do not exist. Neither shows up as a hash mismatch, which is exactly why they survived
 * R7 and R8.
 * ---------------------------------------------------------------------------------------------- */

/**
 * A ustar reader written from the format rather than from the writer.
 *
 * A round-trip checked with the same code that produced the archive proves the writer agrees with itself.
 * This one agrees with the *specification*: `name` at 0 (100 bytes), `prefix` at 345 (155 bytes), joined
 * with a single `/`, and the entry's type at 156. If the writer and this reader were derived from each
 * other, the long-path bug would pass in both directions at once.
 */
const BLOCK = 512;

const readUstar = (gzipped) => {
  const tar = gunzipSync(gzipped);
  const entries = [];
  for (let at = 0; at + BLOCK <= tar.length; at += BLOCK) {
    const header = tar.subarray(at, at + BLOCK);
    if (header.every((byte) => byte === 0)) continue;

    const readField = (offset, length) => {
      const raw = header.subarray(offset, offset + length);
      const end = raw.indexOf(0);
      return raw.subarray(0, end === -1 ? raw.length : end).toString('utf8');
    };
    const name = readField(0, 100);
    const prefix = readField(345, 155);
    const size = parseInt(readField(124, 12).trim() || '0', 8);
    const type = readField(156, 1) || '0';
    const mode = readField(100, 8).trim();

    // The checksum, recomputed the way a reader does it: the checksum field itself reads as spaces.
    const sum = (() => {
      const copy = Buffer.from(header);
      copy.write('        ', 148, 8, 'ascii');
      let total = 0;
      for (const byte of copy) total += byte;
      return total;
    })();
    const recorded = parseInt(readField(148, 7).trim() || '0', 8);
    if (sum !== recorded) throw new Error(`bad ustar checksum for ${name}: ${sum} != ${recorded}`);

    const bodyStart = at + BLOCK;
    entries.push({
      path: prefix ? `${prefix}/${name}` : name,
      mode,
      type,
      size,
      body: tar.subarray(bodyStart, bodyStart + size),
    });
    at += Math.ceil(size / BLOCK) * BLOCK;
  }
  return entries;
};

test('FR10-05: a path longer than the name field is split at a separator, not at a byte offset', async (t) => {
  await t.test('the review\'s exact case is refused rather than stored under a name that does not exist', () => {
    // `tools/` + 110 a's + `.mjs` has exactly one separator, and using it leaves a 114-byte name — over
    // the field. The old writer cut at `length - 100` and stored a *different path* whose hash was
    // correct, so a reader restored `tools/aaaa…/…mjs` and a report could point at a file that never
    // existed. There is no honest encoding for this path in ustar without PAX, so the answer is an error.
    const path = `tools/${'a'.repeat(110)}.mjs`;
    assert.throws(() => splitUstarPath(path), /cannot be stored in a ustar header/);
    assert.throws(() => splitUstarPath(path), /no "\/" that leaves a name of at most 100 bytes/);
  });

  await t.test('a path that fits the name field needs no split at all', () => {
    // A reader uses `name` alone when `prefix` is empty, so the empty prefix must not be mistaken for a
    // real one — joining unconditionally would produce a leading slash and an absolute path.
    const path = `tools/${'a'.repeat(40)}.mjs`;
    const { name, prefix } = splitUstarPath(path);
    assert.equal(prefix, '', 'and it is recorded as no prefix, not as a slash');
    assert.equal(name, path);
  });

  await t.test('a path too long for the name field is split at a separator that fits', () => {
    const path = `tools/${'a'.repeat(40)}/${'b'.repeat(60)}.mjs`;
    const { name, prefix } = splitUstarPath(path);

    assert.equal(`${prefix}/${name}`, path, 'a reader joins the two fields with one slash');
    assert.ok(Buffer.byteLength(name) <= 100, 'and the name fits its field');
    assert.ok(Buffer.byteLength(prefix) <= 155, 'and the prefix fits its field');
    assert.ok(prefix.startsWith('tools/'), 'and the split landed on a real separator, not a byte offset');
  });

  await t.test('a multi-byte name is split on whole characters', () => {
    // `é` is two bytes. Cutting at an arbitrary offset is what produced half a character in a field, and
    // a reader decoding that field would either throw or substitute U+FFFD — a different path, again.
    const path = `tools/${'\u00e9'.repeat(60)}/${'\u00fc'.repeat(30)}.mjs`;
    const { name, prefix } = splitUstarPath(path);
    const joined = `${prefix}/${name}`;

    assert.equal(joined, path);
    assert.equal(Buffer.from(joined, 'utf8').length, Buffer.byteLength(path, 'utf8'), 'no character was lost');
    assert.ok(!joined.includes('\ufffd'), 'and none was replaced by a decoding error');
  });
});

test('FR10-05: a snapshot restores the paths, modes and bytes the manifest names', async (t) => {
  await t.test('the whole file set round-trips, including a long path and an executable', () => {
    const { repo } = makeRepo();
    try {
      const longPath = `tools/${'a'.repeat(30)}/${'b'.repeat(30)}.mjs`;
      // The awkward files are added before the manifest that is checked, so they are part of it.
      mkdirSync(join(repo, dirname(longPath)), { recursive: true });
      writeFileSync(join(repo, longPath), 'export const deep = true;\n');
      writeFileSync(join(repo, 'tools', 'runner.sh'), '#!/usr/bin/env bash\n', { mode: 0o755 });

      const withExtras = buildManifest(repo);
      const entries = readUstar(buildSnapshot(repo, withExtras.files));
      const byPath = new Map(entries.map((entry) => [entry.path, entry]));

      for (const file of withExtras.files) {
        const entry = byPath.get(file.path);
        assert.ok(entry, `${file.path} is in the manifest and must be in the archive`);
        assert.equal(entry.size, file.size, `${file.path} restores with the recorded size`);
        // The manifest records a git mode, the archive records a unix mode, and the translation has to
        // happen: `100644` applied as a permission set is `0100644`, which no restore will reproduce.
        const expectedMode = file.kind === 'symlink' ? 0o777 : parseInt(file.mode.slice(-3), 8);
        assert.equal(parseInt(entry.mode, 8), expectedMode, `${file.path} restores with the recorded mode`);
        if (file.kind !== 'symlink') {
          assert.equal(
            entry.body.toString('utf8'),
            readFileSync(join(repo, file.path), 'utf8'),
            `${file.path} restores with the bytes that were hashed`
          );
        }
      }

      // The executable bit is inside the identity, so a snapshot that lost it would restore a tree whose
      // modes no longer match the digest that describes it.
      assert.equal(parseInt(byPath.get('tools/runner.sh').mode, 8), 0o755, 'an executable file restores executable');
      assert.ok(byPath.has(longPath), 'and a path longer than the name field restores under its own name');
      assert.equal(byPath.get(longPath).path, longPath, 'at the path the manifest recorded, not a mangled one');

      assert.equal(entries.length, withExtras.files.length, 'and nothing extra came along');
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });

  await t.test('the system tar agrees, which is the reader that actually matters', () => {
    const { repo } = makeRepo();
    const out = join(repo, 'snapshot.tar.gz');
    try {
      const manifest = buildManifest(repo);
      writeFileSync(out, buildSnapshot(repo, manifest.files));

      // Written outside the repository's own identity scope, so reading it back does not perturb what is
      // being checked.
      const listed = execFileSync('tar', ['-tzf', out], { encoding: 'utf8' }).trim().split('\n').sort();
      assert.deepEqual(listed, manifest.files.map((file) => file.path).sort(),
        'GNU tar reads back exactly the paths the manifest names');
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });
});

test('FR12-02: current source rejects symlinks, including internal aliases and excluded targets', async t => {
  for (const target of ['../.env', 'real.js', '/etc/hostname', '../js/alias.js']) {
    await t.test(target, () => {
      const {repo}=makeRepo();
      try {
        writeFileSync(join(repo,'.env'),'FAKE_REVIEW_SECRET_NOT_REAL');
        symlinkSync(target,join(repo,'tools/alias.mjs'));
        assert.throws(() => buildManifest(repo), /symlink refused/);
      } finally {rmSync(repo,{recursive:true,force:true});}
    });
  }
});

/* ------------------------------------ the mode contract and extraction policy (FR11-06) ---- */

/** Extract an archive the way a restore would, and report the mode of one restored file. */
function extractWith(archiveBuffer, umask, { preserve }) {
  const target = mkdtempSync(join(tmpdir(), 'frontend-umask-'));
  chmodSync(target, 0o777);
  writeFileSync(join(target, 'snapshot.tar.gz'), archiveBuffer);
  if (preserve) {
    execFileSync(process.execPath, ['--input-type=module','-e',
      `import {extractSnapshot} from ${JSON.stringify(new URL('../../tools/frontend-source-identity.mjs',import.meta.url).href)};
       process.umask(parseInt(process.argv[1],8)); extractSnapshot(process.argv[2],process.argv[3]);`,
      umask,join(target,'snapshot.tar.gz'),target], {stdio:'pipe'});
  } else {
    // Counterfactual requires no inherited default ACL; only normalize our own fixture directory.
    execFileSync('setfacl',['-k',target],{stdio:'pipe'});
    execFileSync('sh',['-c',`umask ${umask} && exec tar -xzf snapshot.tar.gz`],{cwd:target,stdio:'pipe'});
  }
  return target;
}

test('FR11-06: the mode contract has one classifier, two recorded modes and one exact restore', async (t) => {
  await t.test('executability is asked as a bitmask, not as a mode', () => {
    // The three questions that get confused. `hasExecuteBit` answers the first, and it is the only thing in
    // the codebase that decides the other two by classification.
    assert.equal(hasExecuteBit(0o644), false);
    assert.equal(hasExecuteBit(0o755), true);
    for (const mode of [0o700,0o754,0o711,0o775]) assert.equal(hasExecuteBit(mode),true);
    // The cases that make "any execute bit" the right question rather than "owner execute": a file restored
    // group-executable really can be run, and not seeing that would be a false negative.
    assert.equal(hasExecuteBit(0o744), true, 'owner-execute alone is enough');
    assert.equal(hasExecuteBit(0o655), true, 'other-execute alone is enough');
    assert.equal(hasExecuteBit(0o000), false, 'no bit set is not executable');
    // A git mode string is not a bitmask, and this is why that is written down rather than left to be
    // discovered: `'100755' & 0o111` is not 0, because `&` coerces the *decimal* digits 100755 and the low
    // bits of that number happen to be set. It returns true — the right answer, for the wrong reason.
    // `'100700'` also returns true, again by accident. So the function silently agrees with callers that
    // hand it the wrong type, and a future change to either side would start disagreeing with no signal.
    // The contract is therefore "a numeric mode", `gitMode` is the only caller and passes `lstat`'s
    // number, and the case below pins that the real path does so.
    assert.equal(typeof hasExecuteBit(0o755), 'boolean', 'the answer is a boolean, not a mode');
  });

  await t.test('a manifest records only the two modes Git stores', () => {
    assert.deepEqual(MANIFEST_MODES, { executable: '100755', plain: '100644' });
    // A file restored as 0700 is *classified* executable and is still not what the manifest recorded. That
    // gap is the finding, so the recorded set is pinned to exclude it.
    assert.ok(!Object.values(MANIFEST_MODES).includes('100700'));
    assert.equal(MODE_CONTRACT.recorded, MANIFEST_MODES, 'the contract names the same two modes');
  });

  await t.test('the restored mode is exact, and is not the bitmask', () => {
    // The bitmask alone would be satisfied by 0700 standing in for 0755 — which is exactly how mode loss
    // hides behind a correct "yes, it is executable" answer. The exact assertion is a separate claim.
    assert.equal(MODE_CONTRACT.exactModeFor(true), 0o755);
    assert.equal(MODE_CONTRACT.exactModeFor(false), 0o644);
    assert.notEqual(MODE_CONTRACT.exactModeFor(true), 0o700);
    assert.equal(MODE_CONTRACT.classify, hasExecuteBit, 'and the contract classifies with the one function');
  });

  await t.test('a file is recorded with the mode Git would give it, and the mode is in the digest', () => {
    const { repo, write } = makeRepo();
    try {
      write('assets/js/api/runner.js', '#!/bin/sh\n');
      chmodSync(join(repo, 'assets', 'js', 'api', 'runner.js'), 0o755);

      const manifest = buildManifest(repo);
      const modes = Object.fromEntries(manifest.files.map((file) => [file.path, file.mode]));
      assert.equal(modes['assets/js/api/runner.js'], MANIFEST_MODES.executable);
      assert.equal(modes['assets/js/api/sessionCoordinator.js'], MANIFEST_MODES.plain, 'an ordinary file is the other mode');

      const before = manifest.digest;
      chmodSync(join(repo, 'assets', 'js', 'api', 'runner.js'), 0o644);
      assert.notEqual(buildManifest(repo).digest, before, 'a mode is part of the source identity');
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });
});

test('FR11-06: the extraction policy preserves modes, and that is derived from the flags', async (t) => {
  await t.test('the -p is recognised in the combined flag, not as its own argument', () => {
    // `-xzpf` is one word, so a check for the string '-p' would be testing a spelling.
    assert.equal(preservesPermissions(['-xzpf']), true);
    assert.equal(preservesPermissions(['-xzf']), false, 'without it a restrictive umask really does strip bits');
    assert.equal(preservesPermissions(['-x', '-z', '--preserve-permissions']), true,
      'the long form is the same property');
    // Derived rather than asserted alongside the flags: a constant computed once from the real flags could
    // only ever agree with itself, so this is a function and it is tested against flags that do not preserve.
    assert.equal(SNAPSHOT_PRESERVES_PERMISSIONS, true);
    assert.ok(SNAPSHOT_EXTRACT_ARGS.includes('-xzpf'), 'and the policy is written with the flags it describes');
  });

  await t.test('an executable survives a restrictive umask, which is the finding', () => {
    const { repo, write } = makeRepo();
    try {
      write('assets/js/api/runner.sh', '#!/bin/sh\n');
      chmodSync(join(repo, 'assets', 'js', 'api', 'runner.sh'), 0o755);
      const archive = buildSnapshot(repo, buildManifest(repo).files);

      const target = extractWith(archive, '077', { preserve: true });
      try {
        const restored = statSync(join(target, 'assets', 'js', 'api', 'runner.sh')).mode & 0o777;
        // This case cannot prove much as root — root restores the stored mode whatever the umask — so it
        // asserts the property holds here, and the counterfactual below is what shows the umask matters.
        assert.equal(restored, 0o755, `a recorded 0755 came back as ${restored.toString(8)}`);
        assert.equal(hasExecuteBit(restored), true, 'and it is still classified executable, whatever the mode');
      } finally { rmSync(target, { recursive: true, force: true }); }
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });

  await t.test('the policy is the reason a restore is umask-independent at all three umasks', () => {
    // The claim in the tool's comment, as a table rather than a sentence, so it is one artefact. The values
    // are what this machine does; the point is that the policy is what makes the column on the right flat.
    const { repo, write } = makeRepo();
    try {
      write('assets/js/api/runner.sh', '#!/bin/sh\n');
      chmodSync(join(repo, 'assets', 'js', 'api', 'runner.sh'), 0o755);
      const archive = buildSnapshot(repo, buildManifest(repo).files);

      const rows = ['022', '077', '002'].map((umask) => {
        const withP = extractWith(archive, umask, { preserve: true });
        const without = extractWith(archive, umask, { preserve: false });
        try {
          return {
            umask,
            withP: statSync(join(withP, 'assets', 'js', 'api', 'runner.sh')).mode & 0o777,
            without: statSync(join(without, 'assets', 'js', 'api', 'runner.sh')).mode & 0o777
          };
        } finally {
          rmSync(withP, { recursive: true, force: true });
          rmSync(without, { recursive: true, force: true });
        }
      });
      for (const row of rows) {
        assert.equal(hasExecuteBit(row.withP), true,
          `umask ${row.umask}: -p gave ${row.withP.toString(8)}, without -p ${row.without.toString(8)}`);
      }
      // Recorded rather than asserted, because as root the two columns agree and a hard assertion here
      // would be asserting the environment. The umask-077 difference is what the reviewer's unprivileged
      // run saw, and it is what `preservesPermissions` exists to prevent.
      const atRestrictiveUmask = rows.find((row) => row.umask === '077');
      if (process.getuid && process.getuid() === 0) {
        // Running as root: the stored mode is restored regardless of umask, so the two columns agree here
        // and the umask-077 difference is not reproducible on this machine. Asserted rather than skipped,
        // because the agreement is itself a fact about the environment worth failing on if it changes.
        assert.equal(atRestrictiveUmask.withP, atRestrictiveUmask.without);
      } else {
        assert.equal(atRestrictiveUmask.withP, 0o755);
        assert.equal(atRestrictiveUmask.without, 0o700,
          'an unprivileged umask-077 restore without -p really does strip the group and other bits');
      }
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });

  await t.test('extractSnapshot is the one entry point, and it uses the policy', () => {
    const { repo } = makeRepo();
    const archive = buildSnapshot(repo, buildManifest(repo).files);
    const holder = mkdtempSync(join(tmpdir(), 'frontend-archive-'));
    try {
      writeFileSync(join(holder, 'snapshot.tar.gz'), archive);
      const target = mkdtempSync(join(tmpdir(), 'frontend-extract-'));
      try {
        extractSnapshot(join(holder, 'snapshot.tar.gz'), target);
        assert.ok(existsSync(join(target, 'index.html')),
          'the snapshot extracts through the shared helper rather than an inline tar');
      } finally { rmSync(target, { recursive: true, force: true }); }
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(holder, { recursive: true, force: true });
    }
  });
});

test('FR12-03: exact modes survive real default ACLs and nonroot umask 022/077/002', t => {
  try {execFileSync('setfacl',['--version'],{stdio:'pipe'});} catch {t.skip('ACL tools unavailable');return;}
  if(process.getuid?.()===0) {t.skip('nonroot matrix requires unprivileged execution');return;}
  withRepo(({repo}) => {
    const manifest=buildManifest(repo);
    const archive=buildSnapshot(repo,manifest.files);
    for(const mask of ['022','077','002']) {
      const root=mkdtempSync(join(tmpdir(),'real-default-acl-'));
      try {
        execFileSync('setfacl',['-m','d:u::rwx,d:g::rwx,d:o::r--',root]);
        const acl=execFileSync('getfacl',['-cp',root],{encoding:'utf8'});
        assert.match(acl,/default:other::r--/);
        writeFileSync(join(root,'source.gz'),archive);
        execFileSync(process.execPath,['--input-type=module','-e',
          `import {extractSnapshot} from ${JSON.stringify(new URL('../../tools/frontend-source-identity.mjs',import.meta.url).href)};process.umask(parseInt(process.argv[1],8));extractSnapshot(process.argv[2],process.argv[3]);`,
          mask,join(root,'source.gz'),root]);
        for(const file of manifest.files) assert.equal(statSync(join(root,file.path)).mode&0o777,file.mode==='100755'?0o755:0o644,`${mask}: ${file.path}`);
      } finally {rmSync(root,{recursive:true,force:true});}
    }
  });
});
