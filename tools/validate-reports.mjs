#!/usr/bin/env node
/**
 * validate-reports.mjs — checks that the reports say what the evidence supports (FR9-06, FR10-02).
 *
 * The defect this exists for is not that a report was missing. It is that a report could be *wrong* in
 * the specific way a self-report always can: a claim that nothing checks.
 *
 * Every round of this work has produced a matrix, a handoff and a directory of evidence, and every one of
 * them has been written by the same hands that wrote the code. That is the weakest possible arrangement
 * for a document whose entire job is to tell a later reader what has actually been verified. A number in
 * prose ("233/233", "browser 33/33", "closed") is a claim about the world that no test ever made, so it
 * stays plausible-looking forever: bump a test, delete a log, add a finding and forget the row, and the
 * report is still perfectly readable and now quietly untrue.
 *
 * ## What changed in FR10-02, and why
 *
 * The R8 version of this tool could be made to accept a claim that nothing supported. A probe fixture
 * built by the review is the whole demonstration, and it is worth keeping in view because each of its
 * four parts is now a rule below:
 *
 *   1. The handoff said `unit 3/3` and cited run `bad-run`. Run `bad-run` recorded **0 passed, 3 failed**.
 *      Another log in the same directory — `good-run` — happened to record `3 passed`. The tool compared
 *      the claim against *every* log in the directory and accepted it, so the claim was checked against
 *      evidence it did not cite.
 *   2. With no evidence directory at all, `--mode draft` produced one warning and exit 0, and the tool
 *      still printed `every claim backed`. A VERIFIED row was making a claim; the claim was unchecked.
 *   3. A source cell naming a Git SHA that does not exist was not detected, because the cell was only
 *      ever read for path-shaped tokens.
 *   4. `R7-OBS-01` had a row, and deleting the row changed nothing, because it was not in the required
 *      set the missing-ID check iterates.
 *
 * The correction is that a claim is bound to **one run**:
 *
 *   - `reports/FRONTEND-RUN-CLAIMS.json` declares, per run, the run id, the tier, the command, the exit
 *     code, the outcome counts and the source digest the run was made against. A run is a fact with a
 *     shape, not a sentence in prose.
 *   - The run id resolves to *that run's* `.meta` and `.log` — never to "some log in the directory". The
 *     meta carries the producer's own exit code, its own source digest and its own git identity, so a
 *     claim is checked against the run it names instead of against the union of every run that happened
 *     to be shipped.
 *   - The declared source digest is checked against the source manifest that run recorded, and a claimed
 *     commit is checked against a real Git object when the repository has one. A digest that was typed
 *     from memory does not survive either.
 *   - Draft mode still requires evidence for a row that claims VERIFIED. Pending rows are what draft
 *     tolerates; a completed claim without evidence is not a pending row.
 *
 * The prose checks in the handoff are kept, but a count on a line that names a run is now resolved
 * through the run rather than through the directory.
 *
 * Exit 0 when clean, 1 when there is something to say, 2 on bad usage. Output is a list of sentences a
 * human can act on — deliberately not a diff of what the author "meant".
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveReportPaths } from './frontend-report-paths.mjs';
// The digest function the producer used, imported rather than reimplemented. Two implementations of "the
// one hash everything else is checked against" would be two answers to the same question, and the one
// written here would agree with the forgeries.
import { digestOf, verifySourceManifest, verifySnapshot, buildManifest, verifySourceComparisons } from './frontend-source-identity.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The matrix schema, pinned.
 *
 * A matrix with no declared schema is a matrix whose columns can drift without anyone noticing, which is
 * the defect the pinned version is here to prevent: a row that grows or loses a cell still parses, it just
 * starts meaning something else. A consumer that knows the version can refuse a file that is not it.
 */
export const MATRIX_SCHEMA = 'frontend-finding-matrix/1';

/** The run-claims sidecar, pinned for the same reason the matrix is. */
export const CLAIMS_SCHEMA = 'frontend-run-claims/1';

/** The source-identity manifest the runs write, pinned so a foreign manifest is refused, not guessed at. */
export const SOURCE_MANIFEST_SCHEMA = 'frontend-source-identity/1';

/**
 * Read one source manifest and hold it to its own claims.
 *
 * The reason this exists as a function rather than inline is that the check has to be applied twice per
 * run — to the source before and the source after — and a second, weaker copy of a security check is how
 * one of them quietly stops being one.
 *
 * What it returns is deliberately more than the declared digest. `recomputed` is what the manifest's own
 * file list actually hashes to, and callers compare facts to facts with it; `digest` is what the document
 * says, kept only so a reader can be told the two disagree.
 *
 * `readable` is false when the file is absent or unreadable, which is different from "read and found
 * dishonest" — the first is an incomplete evidence set and the second is a finding, and conflating them
 * would let a tampered manifest be dismissed as merely missing.
 */
function readSourceManifest(evidenceDir, name, { problems, warnings, mode, required }) {
  const path = join(evidenceDir, name);
  if (!existsSync(path)) {
    if (required) {
      const sentence = `run ${name.replace(/\.source-(before|after)\.manifest\.json$/, '')} recorded no ${name}, so the source it ran against cannot be identified`;
      if (mode === 'final') problems.push(sentence); else warnings.push(sentence);
    }
    return null;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    problems.push(`${name} is not valid JSON: ${error.message}`);
    return { name, readable: false, digest: null, recomputed: null, repoHead: null, fileCount: null };
  }

  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    problems.push(`${name} is not a source manifest (it is ${manifest === null ? 'null' : Array.isArray(manifest) ? 'an array' : typeof manifest}); the source identity is not readable`);
    return { name, readable: false, digest: null, recomputed: null, repoHead: null, fileCount: null };
  }

  if (manifest.schema !== SOURCE_MANIFEST_SCHEMA) {
    problems.push(`${name} declares schema ${manifest.schema}, not ${SOURCE_MANIFEST_SCHEMA}; the source identity is not readable`);
    return { name, readable: false, digest: manifest.digest ?? null, recomputed: null, repoHead: null, fileCount: null };
  }

  try { verifySourceManifest(manifest); }
  catch (error) { problems.push(`${name}: ${error.message}`); }

  let recomputed = null;
  if (!Array.isArray(manifest.files)) {
    // Checked before anything is digested. `digestOf` iterates and stringifies whatever it is handed, so a
    // manifest whose `files` is a string or null would either throw out of here — taking every other
    // verdict in the report with it — or, worse, digest the string and produce a plausible-looking number
    // to compare against.
    problems.push(`${name} has no usable file list (files is ${manifest.files === null ? 'null' : typeof manifest.files}); `
      + 'a digest over no files is not an identity, so this manifest cannot vouch for a run');
  } else if (typeof manifest.digest !== 'string' || !manifest.digest) {
    problems.push(`${name} declares no digest; the file list it holds is unchecked, so nothing here can be read as evidence`);
  } else {
    try {
      recomputed = digestOf(manifest.files);
    } catch (error) {
      problems.push(`${name} has a file list that cannot be digested: ${error.message}`);
    }

    if (recomputed !== null && recomputed !== manifest.digest) {
      // What this can and cannot say. The digest is one value over the whole list, so a mismatch does not
      // identify *which* entry was edited, and this message does not pretend to: a reader is told the list
      // and the digest disagree, is given both values, and is given the count. What it can additionally do
      // is name an entry that is not even a well-formed record — the case where the list is malformed
      // rather than merely inconsistent, and where there is a specific thing to point at. Inventing a
      // filename would be worse than saying nothing, because a wrong filename sends a reader to audit a
      // file nobody had touched.
      //
      // The shape the producer actually writes is {path, mode, size, sha256} with `mode` a *string* like
      // "100644" — a git mode, not a unix one. An earlier version of this check required
      // `Number.isInteger(mode)` and therefore accused every honest real-world manifest of being
      // malformed, on every genuine mismatch. The predicate below names only what no version of the format
      // has: an entry that is not a record at all, or one missing the path or hash that give it meaning.
      const malformed = manifest.files.find(
        (file) => !file || typeof file !== 'object' || Array.isArray(file)
          || typeof file.path !== 'string' || typeof file.sha256 !== 'string'
      );
      problems.push(
        `${name} records digest ${manifest.digest} but its ${manifest.files.length} file(s) hash to ${recomputed}; `
        + 'the recorded list is not the list the digest was taken over'
        + (malformed ? `, and it contains at least one entry that is not a file record (first: ${JSON.stringify(malformed)})` : '')
      );
    }

    // Two ways of stating how many files were tested, which have to agree. Checked separately from the
    // digest because it is a separate claim, and because a manifest can agree with its own digest and
    // still miscount.
    if (Number.isInteger(manifest.fileCount) && manifest.fileCount !== manifest.files.length) {
      problems.push(`${name} declares fileCount ${manifest.fileCount} but lists ${manifest.files.length} file(s); the count and the list describe different trees`);
    }
  }

  return {
    name,
    manifest,
    readable: true,
    digest: typeof manifest.digest === 'string' ? manifest.digest : null,
    recomputed,
    repoHead: typeof manifest.repo?.head === 'string' ? manifest.repo.head : null,
    fileCount: Number.isInteger(manifest.fileCount) ? manifest.fileCount : null
  };
}

/** The only statuses a row may carry. Anything else is a word, not a state. */
const STATUSES = new Set([
  'OPEN', 'IN_PROGRESS', 'IMPLEMENTED_UNVERIFIED', 'VERIFIED', 'BLOCKED'
]);

/** The tiers a run may claim. A claim in no tier names no producer, and so no exit code. */
const TIERS = new Set(['static', 'unit', 'loopback', 'browser', 'discovery', 'install', 'other']);

/**
 * The tier a run belongs to, and how it is told apart.
 *
 * The signal is the npm script the run invoked, taken from the `argv` the wrapper recorded as an array
 * rather than a re-joined string. Order matters: `test:browser:install` contains `test:browser`, and
 * reading a dependency download as a browser run would declare an exit code that means something else
 * entirely. `npm --prefix tests ci` is an install for the same reason — the R8 wrapper recorded it under
 * its real name.
 *
 * This lives here rather than in the sidecar generator so that the two cannot disagree about what a tier
 * is. The generator imports it from this module; a second copy would be a second answer to the same
 * question, and the failure mode of that is a run whose declared tier and recorded argv are both
 * internally consistent and mutually contradictory.
 */
const TIER_SIGNALS = [
  { tier: 'install', script: 'test:browser:install' },
  { tier: 'browser', script: 'test:browser' },
  { tier: 'browser', script: 'test:integration' },
  { tier: 'static', script: 'test:static' },
  { tier: 'loopback', script: 'test:loopback' },
  { tier: 'unit', script: 'test:unit' },
  { tier: 'discovery', script: 'test:discovery' },
  { tier: 'install', script: 'npm --prefix tests ci' }
];

/** The tier an `argv` belongs to, or `null` when it names no gate this repository runs. */
export function tierFromArgv(argv) {
  const text = String(argv || '');
  for (const signal of TIER_SIGNALS) {
    if (text.includes(signal.script)) return signal.tier;
  }
  if (text.includes('run-frontend-gate-selftest')) return 'install';
  if (text.includes('playwright')) return 'browser';
  if (text.includes('node --test') || text.includes('node --experimental')) return 'unit';
  return null;
}

/**
 * A status that means "this is finished and checked".
 *
 * `IMPLEMENTED_UNVERIFIED` is deliberately *not* in this set, and that gap is the point of having it. The
 * real work in these rounds happens in that state: the code is written, it looks right, and nobody has
 * watched it fail in the old shape and pass in the new one. An enum that offered only yes/no would have
 * to call that "done", and every wide closure in the previous rounds came from exactly that.
 */
const CLAIMS_DONE = new Set(['VERIFIED']);

/**
 * The findings this round is accountable for. Kept here so an unrecorded finding fails the gate.
 *
 * `R7-OBS-01` was in the matrix for R8 and absent from this list, which meant deleting its row was
 * invisible: the missing-ID check iterates this array, and a finding that is not in it cannot be missed.
 * FR10-01…08 are here for the same reason — they are the findings this round is closing, and a row that
 * silently disappears from a matrix is how a round reports itself clean with work still open.
 */
const REQUIRED_FINDINGS = [
  'FR9-01', 'FR9-02', 'FR9-03', 'FR9-04', 'FR9-05', 'FR9-06',
  'FA8-01', 'FA8-02', 'FA8-03', 'FA8-04', 'FA8-05', 'FA8-06', 'FA8-07',
  'FR10-01', 'FR10-02', 'FR10-03', 'FR10-04', 'FR10-05', 'FR10-06', 'FR10-07', 'FR10-08',
  'R7-OBS-01',
  'FR11-01','FR11-02','FR11-03','FR11-04','FR11-05','FR11-06',
  'FR12-01','FR12-02','FR12-03','FR12-04','FR12-05'
];

/** Files a row may legitimately name, so a typo in a path is caught rather than believed. */
const REPO_PREFIXES = [
  'assets/', 'vue/', 'tests/', 'tools/', 'reports/', 'documents/', 'browser/', 'regression/', 'index.html', 'README'
];

/** Splits a TSV row. `-1` so an empty trailing cell is an empty string and not the whole rest. */
const cells = (line) => line.split('\t').map((cell) => cell.trim());

/**
 * A path-shaped token out of a cell of prose.
 *
 * Rows say `assets/js/api/sessionCoordinator.js:412 acquireWithDeadline`, which is two things at once: a
 * place and a symbol. Only the place is checkable, and the check is worth making, because a row that
 * points at a file that is not in the repo is a claim about code that is not there.
 */
const PATH_TOKEN = /[A-Za-z0-9_./@-]+[A-Za-z0-9_.-]*\.(?:m?js|c?js|json|vue|html|md|sh|txt|css|yml|yaml|ts)\b/g;

/** A Git object id out of a cell of prose: 7 hex characters or more, which is what `git` accepts. */
const GIT_SHA_TOKEN = /\b[0-9a-f]{7,40}\b/g;

const pathTokens = (cell) => (cell || '').match(PATH_TOKEN) || [];
const shaTokens = (cell) => (cell || '').match(GIT_SHA_TOKEN) || [];

/**
 * Whether one token names something that exists.
 *
 * A row refers to a place in the three ways the existing documents already use, and all three have to
 * work or the check only ever fires on the one spelling: the path itself, the path with a `:line` or
 * `:symbol` tail, and the harness shorthand `browser/x.spec.mjs` for `tests/browser/x.spec.mjs`.
 */
function tokenExists(repoRoot, token) {
  const bare = token.replace(/[:(].*$/, '');
  const candidates = [bare, join('tests', bare), join('reports', bare)];
  return candidates.some((candidate) => existsSync(join(repoRoot, candidate)));
}

/**
 * Whether a Git object id is a real object in this repository.
 *
 * A row that names a commit is making a checkable claim — "this is what the code looks like" — and a
 * commit that does not exist is a claim about a revision nobody can look at. `git cat-file -e` asks the
 * object database rather than a regex, so a truncated-but-valid prefix resolves and a fabricated one
 * does not.
 *
 * A repository with no `.git` is not a failure: a source snapshot shipped without its history cannot
 * answer, and that is a limitation to record rather than an error to invent.
 */
function gitObjectExists(repoRoot, sha) {
  if (!existsSync(join(repoRoot, '.git'))) return null;
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch (_error) {
    // A 40-hex token may be a content digest rather than a commit; only a token that is *meant* as a
    // commit is checked, which is what the `commit` column below establishes.
    return false;
  }
}

/** Every `reports/evidence/...` path a document mentions, whether it exists or not. */
function evidenceReferences(text) {
  return [...text.matchAll(/reports\/evidence\/[A-Za-z0-9._/-]+/g)]
    .map((match) => match[0].replace(/[.,;)]+$/, ''));
}

/**
 * Backticked tokens a cell names as evidence, which are either a file or a run label.
 *
 * A run label is `r8cd-browser`; its evidence files are `browser-r8cd-browser-<timestamp>-1.log`. Writing
 * the timestamp into a matrix cell would mean every rerun edits six rows, and the incentive that produces
 * is "do not rerun the browser suite". So a row names the run and the check asks the directory whether
 * a run by that name exists — which still catches the failure that matters, a row claiming a run that
 * never happened.
 */
function backtickedTokens(text) {
  return [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim()).filter(Boolean);
}

/**
 * Resolves a `reports/evidence/...` reference against the evidence directory it names.
 *
 * The reference is written relative to the repo root, so the obvious check is `join(repoRoot, ref)`. That
 * is only right when the evidence happens to sit under the repo root, which is not true of a review
 * bundle that ships it curated and separately. A checker hard-wired to the layout reports a tree full of
 * problems that are really a different arrangement of the same files, and a reader who cannot tell that
 * difference stops trusting the tool on the findings that matter.
 */
function evidencePathExists(repoRoot, evidenceDir, reference) {
  const name = reference.replace(/^reports\/evidence\//, '');
  return existsSync(join(evidenceDir, name)) || existsSync(join(repoRoot, reference));
}

/**
 * Whether an evidence name the cell gave can be resolved to a file in the evidence directory.
 *
 * A missing directory is a finding, not a crash. Every other rule here degrades to a sentence a human can
 * act on; an unguarded `readdirSync` would take the whole tool down on the one input a reviewer is most
 * likely to try — a tree where the evidence was not shipped — and a validator that dies instead of
 * explaining itself is indistinguishable from a validator that is broken.
 */
function evidenceResolves(repoRoot, evidenceDir, names) {
  const files = existsSync(evidenceDir) ? readdirSync(evidenceDir) : [];
  for (const name of names) {
    const bare = name.replace(/[:(].*$/, '');
    if (existsSync(join(repoRoot, bare))) return true;
    if (existsSync(join(evidenceDir, bare.replace(/^reports\/evidence\//, '')))) return true;
    // A run label resolves when at least one file in the directory is named for it.
    if (files.some((file) => file.includes(bare))) return true;
  }
  return false;
}

/** The run stamp, e.g. `20260928T060057Z-1`, which is unique per run and is the run's identity. */
const RUN_STAMP = /20\d{6}T\d{6}Z-\d+/;

/**
 * The gate counts a document asserts, as `{ gate, passed, total, stamp, line }`.
 *
 * Only the "N/M" shape is read, and only when it sits on a line that also names a run. Both halves of
 * that matter. A bare "N/M" in prose is often not a gate at all: "12/12 CDN references" is a count of
 * checks the static gate performed, and reading it as "12 of 12 unit tests passed" is a false alarm that
 * would train a reader to ignore this tool. Requiring a run reference on the same line keeps the check on
 * the sentences that really are claims — a gate, a count, and the run it came from, which is also the only
 * sentence a reader can go and check.
 */
export function resolveRunReference(runs, stamp, text) {
  const candidates = (runs ?? []).filter((run) => String(run.runId).includes(stamp));
  const named = candidates.filter((run) => text.split(/[^A-Za-z0-9_.-]+/).includes(run.runId));
  if (named.length === 1) return named[0];
  return candidates.length === 1 ? candidates[0] : null;
}

function claimedCounts(text) {
  const gates = [
    { name: 'unit', pattern: /unit[^.\n]{0,24}?(\d+)\s*\/\s*(\d+)/g },
    { name: 'browser', pattern: /browser[^.\n]{0,24}?(\d+)\s*\/\s*(\d+)/g },
    { name: 'loopback', pattern: /loopback[^.\n]{0,24}?(\d+)\s*\/\s*(\d+)/g }
  ];
  const claims = [];
  const lines = text.split('\n');
  for (const [index, line] of lines.entries()) {
    const stamp = RUN_STAMP.exec(line);
    for (const gate of gates) {
      for (const match of line.matchAll(gate.pattern)) {
        if (!stamp) continue;
        claims.push({
          gate: gate.name,
          passed: Number(match[1]),
          total: Number(match[2]),
          stamp: stamp[0],
          line: index + 1,
          text: line
        });
      }
    }
  }
  return claims;
}

/** The pass/fail totals a Playwright or node log actually records, keyed by what the log proves. */
function countsInLog(text) {
  text = text.replace(/\u001b\[[0-9;]*m/g, '').replace(/^ℹ /gm, '# ');
  const read = [];
  for (const match of text.matchAll(/(\d+) passed/g)) read.push({ kind: 'passed', n: Number(match[1]) });
  for (const match of text.matchAll(/(\d+) failed/g)) read.push({ kind: 'failed', n: Number(match[1]) });
  for (const match of text.matchAll(/(\d+) skipped/g)) read.push({ kind: 'skipped', n: Number(match[1]) });
  for (const match of text.matchAll(/(\d+) (?:interrupted|cancelled)/g)) read.push({ kind: 'cancelled', n: Number(match[1]) });
  for (const match of text.matchAll(/# pass (\d+)/g)) read.push({ kind: 'pass', n: Number(match[1]) });
  for (const match of text.matchAll(/# fail (\d+)/g)) read.push({ kind: 'fail', n: Number(match[1]) });
  for (const match of text.matchAll(/# tests (\d+)/g)) read.push({ kind: 'tests', n: Number(match[1]) });
  for (const match of text.matchAll(/# skipped (\d+)/g)) read.push({ kind: 'skipped', n: Number(match[1]) });
  for (const match of text.matchAll(/# cancelled (\d+)/g)) read.push({ kind: 'cancelled', n: Number(match[1]) });
  return read;
}

/**
 * A run's outcome, parsed out of the log by the producer that wrote it.
 *
 * Two producers, two shapes, and the difference is the whole reason a claim has to be tied to a tier: a
 * node test log says `# pass N` / `# fail N` / `# tests N`, while a Playwright log says `N passed` /
 * `N failed` and prints nothing at all when nothing ran. Reading a Playwright number as a node number (or
 * the absence of one as zero) is how a claim ends up satisfied by a log that never said it.
 *
 * The tier comes from the declared run, not from the file name, so a run cannot pass itself off as a
 * different producer by sitting in a differently named file.
 */
export function outcomeFromLog(text, tier) {
  const read = countsInLog(text);
  const value = (kind) => {
    const hits = read.filter((entry) => entry.kind === kind);
    return hits.length > 0 ? hits[hits.length - 1].n : null;
  };

  if (tier === 'browser') {
    // Playwright omits the summary lines entirely for an empty collection, which is a collection with
    // nothing in it rather than a run of zero tests that passed.
    if (read.length === 0) return { tests: 0, pass: 0, fail: 0, skipped: 0, cancelled: 0, sawSummary: false };
    return {
      tests: (value('passed') ?? 0) + (value('failed') ?? 0) + (value('skipped') ?? 0) + (value('cancelled') ?? 0),
      pass: value('passed') ?? 0,
      fail: value('failed') ?? 0,
      skipped: value('skipped') ?? 0,
      cancelled: value('cancelled') ?? 0,
      sawSummary: true
    };
  }

  if (read.length === 0) return { tests: 0, pass: 0, fail: 0, skipped: 0, cancelled: 0, sawSummary: false };
  return {
    tests: value('tests') ?? 0,
    pass: value('pass') ?? 0,
    fail: value('fail') ?? 0,
    skipped: value('skipped') ?? 0,
    cancelled: value('cancelled') ?? 0,
    sawSummary: true
  };
}

/**
 * A `.meta` file, which is the producer's own record of one run.
 *
 * Key/value lines with the key right-aligned in a fixed column, then a marker and the producer's own
 * output. Parsed as key/value pairs rather than as prose because these are the values a claim is checked
 * against: `exit`, `result`, `source_digest`, `source_drift` and the git identity are all recorded by the
 * run, not by the report that cites it.
 */
export function parseMeta(text) {
  const meta = {};
  for (const line of text.split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*$/.exec(line);
    if (match) meta[match[1]] = match[2];
  }
  return meta;
}

/* --------------------------------------------------------------------- runs ---- */

/**
 * Loads the structured run claims, or records why it could not.
 *
 * The sidecar exists because a claim in prose cannot be checked field by field. "unit 276/276 on run X"
 * says how many and which run; it does not say what the run's exit code was, which tier produced it, or
 * which source it was made against, and those are exactly the three things that make a count mean
 * anything. Declaring them as data is what lets a claim be *refused*.
 */
function loadRunClaims(reportsDir, problems) {
  const path = join(reportsDir, 'FRONTEND-RUN-CLAIMS.json');
  if (!existsSync(path)) {
    problems.push('reports/FRONTEND-RUN-CLAIMS.json is missing; without it every run claim is prose, and prose cannot be bound to a run, a tier, an exit code and a source digest');
    return null;
  }
  let claims;
  try {
    claims = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    problems.push(`reports/FRONTEND-RUN-CLAIMS.json is not valid JSON: ${error.message}`);
    return null;
  }
  if (claims.schema !== CLAIMS_SCHEMA) {
    problems.push(`reports/FRONTEND-RUN-CLAIMS.json declares schema ${claims.schema}, but this validator reads ${CLAIMS_SCHEMA}`);
    return null;
  }
  return claims;
}

/**
 * Resolves one declared run to the artefacts that run produced.
 *
 * The mapping is by file name built from the run's own label and stamp, and it is exact: `<label>-<stamp>.meta`
 * and `<label>-<stamp>.log`. This is the function FR10-02 is about. The previous version read every log
 * in the directory and asked whether *any* of them contained the number, which means a claim is supported
 * by evidence it did not cite — a claim of `3/3` satisfied by a different run's `3 passed` while the run
 * it named recorded three failures.
 *
 * Nothing here falls back to "search the directory". A run whose artefacts are absent is a run whose
 * claim cannot be checked, and that is reported as such.
 */
function resolveRun(evidenceDir, run, { problems, warnings, mode }) {
  const label = run.runId;
  const metaPath = join(evidenceDir, `${label}.meta`);
  const logPath = join(evidenceDir, `${label}.log`);
  const resolved = { label, meta: null, log: null, outcome: null };

  if (!existsSync(metaPath)) {
    const sentence = `run ${label} has no ${label}.meta in reports/evidence/, so its exit code, source digest and result cannot be checked`;
    if (mode === 'final' || run.outcome) problems.push(sentence);
    else warnings.push(sentence);
    return resolved;
  }
  if (!existsSync(logPath)) {
    const sentence = `run ${label} has no ${label}.log in reports/evidence/, so its counts cannot be checked`;
    if (mode === 'final' || run.outcome) problems.push(sentence);
    else warnings.push(sentence);
    return resolved;
  }

  resolved.meta = parseMeta(readFileSync(metaPath, 'utf8'));
  resolved.log = readFileSync(logPath, 'utf8');

  // The producer's own exit code is the outcome. A log that says "passed" and an exit code of 7 is a run
  // that failed, and a claim that reads the log instead of the exit code has been told the wrong thing.
  //
  // A nonzero exit is a *warning* here rather than a problem, and the distinction matters. The sidecar is
  // the catalogue of what this round ran, and a catalogue that silently omits the runs that failed is a
  // catalogue that has been cleaned up, not one that has been recorded. The false claim is not "a failed run
  // exists" — it is "a report quotes that run as evidence", and that is caught below, where a document's
  // counts and the run's own log are compared. What would make it a problem is a sidecar reader who cannot
  // see which runs were red, so the red ones are surfaced rather than hidden.
  const exit = Number(resolved.meta.exit);
  if (!Number.isInteger(exit)) {
    problems.push(`${label}.meta does not record an integer exit code; a run whose exit is unknown cannot back a claim`);
  } else if (exit !== 0 && run.exitCode !== exit) {
    problems.push(`run ${label} is declared with exit ${run.exitCode} but ${label}.meta records exit ${exit}`);
  } else if (exit !== 0) {
    warnings.push(`run ${label} exited ${exit}; it is recorded as history and may not be cited as evidence for a passing gate`);
  }

  if (resolved.meta.result && resolved.meta.result !== 'RAN') {
    warnings.push(`run ${label} is recorded as ${resolved.meta.result}, not RAN`);
  }

  // Source identity, twice: the run says which digest it was made against, and the sidecar says which
  // digest the claim is about. A digest typed from memory differs from both.
  const metaDigest = resolved.meta.source_digest;
  if (run.sourceDigest && metaDigest && run.sourceDigest !== metaDigest) {
    problems.push(`run ${label} is claimed against source digest ${run.sourceDigest} but ${label}.meta records ${metaDigest}; `
      + 'the counts are being attributed to a different source than the one that produced them');
  }
  if (run.sourceDigest && !metaDigest) {
    problems.push(`${label}.meta records no source_digest, so a claim about which source produced it cannot be checked`);
  }
  if (resolved.meta.source_drift && resolved.meta.source_drift !== 'none') {
    problems.push(`run ${label} recorded source_drift=${resolved.meta.source_drift}; the source changed during the run, so its counts describe no single tree`);
  }

  // The command and the tier have to be the ones claimed, or a browser run can be quoted as a unit run.
  // The check is against the same `tierFromArgv` the sidecar is generated with, so "declared tier" and
  // "recorded argv" are compared by one rule rather than by a string a reader has to trust.
  if (run.command && resolved.meta.command && resolved.meta.command.trim() !== run.command.trim()) {
    problems.push(`run ${label} is declared with command "${run.command}" but ${label}.meta records "${resolved.meta.command}"`);
  }
  if (run.tier && resolved.meta.argv) {
    const recorded = tierFromArgv(resolved.meta.argv);
    if (recorded !== null && recorded !== run.tier) {
      problems.push(`run ${label} is declared in the ${run.tier} tier but its recorded argv belongs to the ${recorded} tier`);
    }
  }

  // The counts, from the log this run wrote, compared with the counts the claim asserts. A gate that prints
  // no test summary — the static tier, a dependency install — has no counts to assert, and the sidecar
  // declares none for it. Its evidence is its exit code, and the check for a summary only runs when
  // somebody has asserted counts where there are none to compare them against.
  resolved.outcome = outcomeFromLog(resolved.log, run.tier);
  if (run.outcome) {
    if (!resolved.outcome.sawSummary) {
      problems.push(`${label}.log records no pass/fail summary, so the outcome declared for run ${label} cannot be confirmed`);
    } else {
      for (const field of ['tests', 'pass', 'fail', 'skipped', 'cancelled']) {
        const declared = run.outcome[field];
        if (declared === undefined) continue;
        if (declared !== resolved.outcome[field]) {
          problems.push(`run ${label} is declared with ${field}=${declared} but ${label}.log records ${field}=${resolved.outcome[field]}`);
        }
      }
      // A run that skipped or cancelled something has not established the claim it is being used for,
      // whatever the pass count says. This is reported rather than inferred, because "1 skip" is
      // sometimes the honest answer and sometimes a suite that quietly stopped running.
      if (resolved.outcome.skipped > 0) {
        problems.push(`run ${label} skipped ${resolved.outcome.skipped} test(s); a claim may not rest on a run that did not execute everything it was asked to`);
      }
      if (resolved.outcome.cancelled > 0) {
        problems.push(`run ${label} cancelled ${resolved.outcome.cancelled} test(s); a claim may not rest on an interrupted run`);
      }
    }
  }

  return resolved;
}

/* ---------------------------------------------------------------- validation ---- */

/**
 * Validates the reports in a repository.
 *
 * The paths are parameters rather than constants because the reports do not always sit next to the
 * evidence they cite. A review bundle, for instance, ships the evidence curated and separately from the
 * tree, and a checker hard-wired to `<repo>/reports/evidence` would report a tree full of problems that
 * are really just a different layout. Every document the tool reads — matrix, handoff, execution log and
 * run claims — is resolved against the `reports` override, so a bundle cannot be validated against one
 * directory's reports and another directory's execution log.
 *
 * `mode` is `draft` for work in progress and `final` for a tree that is meant to be delivered.
 *
 *   draft  A row that claims VERIFIED must be backed by a run that resolves, with a real exit code and a
 *          source digest. Pending rows are tolerated, and are reported as warnings rather than failures —
 *          a draft is *expected* to have them. A missing evidence directory is a problem rather than a
 *          warning here too: the R8 draft path printed "every claim backed" with zero evidence files
 *          read, and a validator that says "backed" about evidence it never opened is worse than useless.
 *   final  Additionally, a missing evidence directory, a missing run-claims sidecar, a missing source
 *          identity and a nonzero producer exit are all problems of their own.
 */
export function validateReports({
  repoRoot = REPO_ROOT,
  reports = null,
  evidence = null,
  required = REQUIRED_FINDINGS,
  mode = 'draft',
  env = process.env
} = {}) {
  const problems = [];
  const warnings = [];
  // One answer, shared with the run-claims generator, the execution log and both gate wrappers.
  // Previously this function derived its own two paths and read no environment at all, so the
  // `FRONTEND_EVIDENCE_DIR` a reader exported for it did nothing — and `test:static`, which invokes this
  // tool with no flags, had no way to be pointed at a package layout where the evidence lives outside
  // the source tree. See tools/frontend-report-paths.mjs.
  const { reportsDir, evidenceDir, sources } = resolveReportPaths({ repoRoot, reports, evidence, env });
  const evidenceExists = existsSync(evidenceDir);
  if (!evidenceExists) {
    // Previously a warning in draft mode, with the tool still reporting "every claim backed". The claim
    // is the point of the tool; a claim nobody can check is not a weaker claim, it is an unchecked one.
    //
    // The path is named, and nothing else about the configuration is. Which layer supplied it — a flag,
    // `FRONTEND_EVIDENCE_DIR`, or the default — is reported in `paths` on the result instead, because
    // putting it in the sentence would make the problem list depend on *how* a reader configured the run
    // rather than on what was found, and this list is compared between runs. A reader who wants to know
    // why their variable was not honoured has a field to read; a reader who diffs two runs has a stable
    // list.
    problems.push(`evidence directory ${evidenceDir} does not exist; no claim about a run can be checked, so none can be reported as backed`);
  }

  for (const file of ['FRONTEND-FINDING-MATRIX.tsv', 'FRONTEND-HANDOFF.vi.md']) {
    // The directory is named, not just the file. This message used to read `reports/<file> is missing`,
    // which is a true sentence about a *default* layout and a misleading one about a configured one: a
    // reader who pointed `--reports` at their package root was told the file `reports/…` was missing and
    // had no way to learn that the tool had looked in the wrong place (FR11-01). An error a reader cannot
    // act on is worse than no error, because it sends them looking in the one directory the message named.
    if (!existsSync(join(reportsDir, file))) {
      problems.push(`${file} is missing from the reports directory ${reportsDir}; there is nothing to validate`);
    }
  }
  // Every early return has to carry the same shape as the normal one. This one did not: a caller that
  // destructures `warnings` got undefined, and `--mode final` on a tree without evidence died with a
  // TypeError instead of reporting the problem it was asked to report. Found by running it, not by reading
  // it, which is the only way this class of bug turns up.
  // The resolved roots, and which layer chose each one. Reported rather than embedded in the problem
  // sentences, for the reason above: the sentences name what was found, this names how it was configured.
  const paths = { reportsDir, evidenceDir, sources };
  if (problems.length > 0) return { problems, warnings, paths, rows: [], evidenceFiles: [], runs: [] };

  /* --- the matrix ------------------------------------------------------------- */
  const matrixText = readFileSync(join(reportsDir, 'FRONTEND-FINDING-MATRIX.tsv'), 'utf8');
  const lines = matrixText.split('\n').filter((line) => line.trim().length > 0);

  // The schema line is the first thing checked, because a consumer that has already guessed the columns
  // has already lost. A missing or wrong version is a refusal to interpret the file at all.
  const declared = lines[0].startsWith('#') ? /^#\s*schema=(\S+)\s*$/.exec(lines[0]) : null;
  if (!declared) {
    problems.push(`the matrix does not declare "# schema=<version>" on its first line, so its columns cannot be trusted`);
  } else if (declared[1] !== MATRIX_SCHEMA) {
    problems.push(`the matrix declares schema ${declared[1]}, but this validator reads ${MATRIX_SCHEMA}; the file is not the one it was written for`);
  }
  const headerLine = lines[0].startsWith('#') ? lines[1] : lines[0];
  const header = cells(headerLine);
  const expected = ['finding_id', 'task', 'layer', 'severity', 'status', 'summary', 'test_or_layer', 'source', 'evidence', 'limitation'];
  for (const column of expected) {
    if (!header.includes(column)) problems.push(`the matrix header has no ${column} column`);
  }
  const body = lines.slice(lines[0].startsWith('#') ? 2 : 1);
  const rows = body.map((line) => {
    const parts = cells(line);
    // `cells` is kept alongside the named fields so a later check can treat one column as the unit of a
    // claim. The named accessors are the readable way to use a row; the array is the faithful one.
    const row = { _raw: line, _cellCount: parts.length, cells: parts };
    header.forEach((name, index) => { row[name] = parts[index] ?? ''; });
    return row;
  });

  const byId = new Map();
  for (const row of rows) {
    const id = row.finding_id;
    if (!id) { problems.push('a matrix row has no finding_id'); continue; }
    if (byId.has(id)) problems.push(`${id} appears more than once in the matrix; two rows cannot both be the record`);
    byId.set(id, row);

    // A row with the wrong number of cells is the quietest defect in a TSV, because a short row does not
    // look broken: the last column just silently holds whatever was written in the second-to-last. One
    // FA8 row was nine cells wide against a ten-column header, so its evidence cell was reading out a
    // sentence about limitations. Nothing rendered wrong and the claim was still being counted.
    if (row._cellCount !== header.length) {
      problems.push(`${id} has ${row._cellCount} cell(s) but the header has ${header.length}; every value after the missing one is read from the wrong column`);
    }

    for (const column of header) {
      if (row[column] === '') problems.push(`${id} has an empty ${column}; a blank cell reads as "nothing to say" and is indistinguishable from an oversight`);
    }

    if (!STATUSES.has(row.status)) {
      problems.push(`${id} has status "${row.status}", which is not one of ${[...STATUSES].join('/')}`);
    }

    // A path in a row has to exist. Rows name a place and a symbol in the same breath, so every
    // path-shaped token in the row is checked — not the cell as a whole, which would only ever fire on
    // the one spelling a checker guessed.
    for (const cell of [row.source, row.test_or_layer]) {
      for (const token of pathTokens(cell)) {
        if (!REPO_PREFIXES.some((prefix) => token.startsWith(prefix))) continue;
        if (!tokenExists(repoRoot, token)) {
          problems.push(`${id} names "${token}", which is not a file in this repo`);
        }
      }
    }

    // A Git SHA in a row has to be a Git object. Previously a source cell was only read for paths, so a
    // fabricated revision sat in the matrix looking exactly like a real one — and the whole point of the
    // source column is to name the revision the claim is about.
    for (const cell of [row.source, row.evidence]) {
      for (const sha of shaTokens(cell)) {
        const exists = gitObjectExists(repoRoot, sha);
        if (exists === false) {
          problems.push(`${id} names the commit ${sha}, which is not an object in this repository; a revision that cannot be looked up is not a revision`);
        }
      }
    }
  }

  for (const id of required) {
    if (!byId.has(id)) problems.push(`${id} is required by this round and has no row in the matrix`);
  }

  /* --- a VERIFIED row owes a test and evidence that exist ----------------------- */
  const evidenceFiles = evidenceExists
    ? readdirSync(evidenceDir).filter((name) => statSync(join(evidenceDir, name)).isFile())
    : [];

  for (const [id, row] of byId) {
    if (!CLAIMS_DONE.has(row.status)) continue;
    if (!row.test_or_layer || row.test_or_layer === '-') {
      problems.push(`${id} is VERIFIED but names no test; a verified finding with no test is an assertion`);
    }
    if (!row.evidence || row.evidence === '-') {
      problems.push(`${id} is VERIFIED but names no evidence; "verified" has to point at something observed`);
    }
    // `not yet` / `to be produced` is a legitimate honest answer, and it is checked for honesty: the
    // evidence cell must not *also* name a file as though it did.
    const claimsProduced = !/\b(not yet|pending|to be|will be|not reproduced|unreproduced)\b/i.test(row.evidence);
    if (claimsProduced) {
      for (const reference of evidenceReferences(row.evidence)) {
        if (!evidencePathExists(repoRoot, evidenceDir, reference)) {
          problems.push(`${id} claims evidence at ${reference}, which does not exist`);
        }
      }
      const labels = backtickedTokens(row.evidence);
      if (labels.length > 0 && !evidenceResolves(repoRoot, evidenceDir, labels)) {
        problems.push(`${id} names the run ${labels.join(', ')}, and no file in reports/evidence/ belongs to it`);
      }
    }
  }

  /* --- the other documents, all resolved against the same reports override ------ */
  const handoffText = readFileSync(join(reportsDir, 'FRONTEND-HANDOFF.vi.md'), 'utf8');
  // Resolved against `reportsDir`, not against the module root. It was a constant at the module root, so
  // `--reports <other>` validated one directory's matrix and handoff against *this* repository's
  // execution log — two different sets of documents described as one, and the log that was read was not
  // the log the reports were written from.
  const executionLogPath = join(reportsDir, 'FRONTEND-EXECUTION-LOG.vi.md');
  const logText = existsSync(executionLogPath) ? readFileSync(executionLogPath, 'utf8') : '';
  const documentText = `${handoffText}\n${logText}\n${matrixText}`;

  for (const reference of new Set(evidenceReferences(documentText))) {
    if (!evidencePathExists(repoRoot, evidenceDir, reference)) {
      problems.push(`a report names ${reference}, which is not in reports/evidence/`);
    }
  }

  /* --- the structured run claims, bound to the runs that produced them ---------- */
  const claims = loadRunClaims(reportsDir, problems);
  const resolvedRuns = [];

  if (claims) {
    if (claims.source) {
      // A claim about a source identity is only checkable if the identity has a shape. The digest is
      // checked against each run's own manifest, and a claimed commit against the object database.
      for (const sha of shaTokens(JSON.stringify(claims.source))) {
        const exists = gitObjectExists(repoRoot, sha);
        if (exists === false) {
          problems.push(`the run-claims source identity names ${sha}, which is not an object in this repository`);
        }
      }
    } else if (mode === 'final') {
      problems.push('the run-claims sidecar declares no source identity; a final tree must say which source its claims are about');
    }

    const declaredRuns = Array.isArray(claims.runs) ? claims.runs : [];
    if (declaredRuns.length === 0) {
      // A tree that has not run anything yet is a legitimate draft; a tree being delivered with no run
      // behind it is not. Reporting this as a problem in both modes is how a draft rule gets switched off.
      const sentence = 'the run-claims sidecar declares no runs, so no claim is bound to anything';
      if (mode === 'final') problems.push(sentence);
      else warnings.push(sentence);
    }

    const seenRunIds = new Set();
    for (const run of declaredRuns) {
      if (!run.runId) { problems.push('a run claim has no runId'); continue; }
      if (seenRunIds.has(run.runId)) {
        problems.push(`run ${run.runId} is declared more than once; two claims about one run cannot both be the record`);
        continue;
      }
      seenRunIds.add(run.runId);
      if (!TIERS.has(run.tier)) {
        problems.push(`run ${run.runId} is declared in tier "${run.tier}", which is not one of ${[...TIERS].join('/')}`);
      }
      if (!run.command) problems.push(`run ${run.runId} declares no command; a claim names what was run`);
      if (!Number.isInteger(run.exitCode)) {
        problems.push(`run ${run.runId} declares no integer exitCode; the producer's exit is what makes a passing log a passing run`);
      }
      if (!run.sourceDigest) {
        problems.push(`run ${run.runId} declares no sourceDigest; a count without the source it came from is not evidence about this tree`);
      }
      if (evidenceExists) {
        const resolved = resolveRun(evidenceDir, run, { problems, warnings, mode });
        resolvedRuns.push(resolved);

        // Both manifests the run recorded: the source it ran against, and the source that was still
        // there when it finished. Each is held to the same rule rather than one being checked and the
        // other trusted — see `readSourceManifest` for why the digest has to be recomputed rather than
        // compared to another field.
        const before = readSourceManifest(evidenceDir, `${run.runId}.source-before.manifest.json`, { problems, warnings, mode, required: true });
        const after = readSourceManifest(evidenceDir, `${run.runId}.source-after.manifest.json`, { problems, warnings, mode, required: false });

        const snapshotName = `${run.runId}.source.tar.gz`;
        const snapshotPath = join(evidenceDir, snapshotName);
        if (existsSync(snapshotPath)) {
          try {
            verifySnapshot(snapshotPath, before?.manifest);
            resolved.replay = 'VERIFIED';
          } catch (error) {
            resolved.replay = 'INVALID';
            problems.push(`run ${run.runId} snapshot invalid: ${error.message}`);
          }
        } else {
          resolved.replay = 'NOT_AVAILABLE';
          const message = `run ${run.runId} snapshot replay NOT_AVAILABLE`;
          // A wrapper that promised a snapshot, or an explicit required replay, cannot lose it silently.
          if (run.replayRequired === true || (resolved.meta?.source_snapshot && !(run.historicalLogOnly === true && run.replay === 'NOT_AVAILABLE' && run.replayRequired === false))) problems.push(message);
          else warnings.push(message + '; historical log-only evidence');
        }

        if (before && run.sourceDigest) {
          if (before.digest !== run.sourceDigest) {
            problems.push(`run ${run.runId} is claimed against source digest ${run.sourceDigest} but ${before.name} records ${before.digest}`);
          }
          if (before.repoHead && gitObjectExists(repoRoot, before.repoHead) === false) {
            problems.push(`${before.name} records head ${before.repoHead}, which is not an object in this repository`);
          }
        }

        // `source_drift` is a *fact about two digests*, and the gate records it in the meta as a word.
        // Reading the word means believing the writer's arithmetic: a run whose source really did change
        // under it, but whose meta says `none`, is accepted, and every count derived from that run is then
        // cited as if it described a single tree. It is the FR11-02 shape one level up — a declared string
        // standing where a recomputed one belongs — and the after-manifest that would settle it is right
        // there in the evidence directory, unexamined.
        //
        // So when both manifests are present, the drift is derived here and the declaration is only
        // compared against it. Where they disagree, the disagreement *is* the finding: it means either the
        // run drifted and was not recorded, or it did not and was recorded as if it had.
        const declaredDrift = resolved.meta?.source_drift ?? null;
        if (before && after && before.recomputed && after.recomputed) {
          const reallyDrifted = before.recomputed !== after.recomputed;
          const declaredDrifted = typeof declaredDrift === 'string' && declaredDrift !== 'none' && declaredDrift !== '';
          if (reallyDrifted !== declaredDrifted) {
            problems.push(`run ${run.runId} records source_drift=${declaredDrift ?? '<none recorded>'}, but its own manifests give `
              + `${before.recomputed} before and ${after.recomputed} after, which ${reallyDrifted ? 'differ' : 'agree'}; `
              + 'the recorded drift is not what the two source identities say');
          }
          // Same reasoning for the after-digest the meta quotes: it is a restatement of the after-manifest.
          const declaredAfter = resolved.meta?.source_digest_after ?? null;
          if (declaredAfter && declaredAfter !== after.recomputed) {
            problems.push(`run ${run.runId} records source_digest_after=${declaredAfter} but ${after.name} hashes to ${after.recomputed}`);
          }
        } else if (before && after && declaredDrift && declaredDrift !== 'none' && !after.readable) {
          // Drift was declared and the evidence that would confirm it is unusable: report rather than
          // accept, but as a warning in draft, where an incomplete evidence set is expected.
          const sentence = `run ${run.runId} records source_drift=${declaredDrift} and its ${after.name} could not be read, so the drift cannot be confirmed`;
          if (mode === 'final') problems.push(sentence); else warnings.push(sentence);
        }
      }
    }
  }

  // A run stamp cited in a document has to be a run that was declared, a declared run has to have its
  // artefacts, and a cited run has to have *finished*. The previous check only asked whether some file in
  // the directory contained the stamp, which a filename proves and nothing more.
  //
  // The unit of a claim differs by document, and getting that wrong is how a check like this becomes
  // unbearable: in prose a claim is a line, but the matrix is a table with named columns, where a row's
  // evidence cell is the claim and its limitation cell is a remark. Reading a whole matrix row as one claim
  // would make it illegal to write down which run *failed* on the same row that records which run passed —
  // which is exactly the note somebody debugging a red round needs to be able to leave.
  const MATRIX_COLUMNS = header;

  const claimUnits = [
    ...handoffText.split('\n').map((line) => ({ name: 'the handoff', claim: line, row: null })),
    ...logText.split('\n').map((line) => ({ name: 'the execution log', claim: line, row: null })),
    ...rows.map((row) => row.cells.map((cell, column) => ({
      name: `the matrix (${row.finding_id}, ${MATRIX_COLUMNS[column]})`,
      claim: cell,
      // The owning row, not the row as a blob of text. A cell leans on a red run when the cell quotes a
      // count, or when the *finding that cell belongs to* has been closed — not when the cell happens to
      // mention, in passing, the id of some other finding that was closed earlier. Reading the row as
      // context for that second test made an innocent cross-reference fatal: a limitation cell that says
      // "this reopens what FR9-05 claimed" while recording a red run of its own was reported as leaning on
      // the red run, because FR9-05 was VERIFIED and the id appeared in the row. The cross-reference is
      // the opposite of a claim, and the rule has to be able to tell them apart.
      row
    }))).flat()
  ];

  for (const { name, claim, row } of claimUnits) {
    for (const stamp of new Set(claim.match(new RegExp(RUN_STAMP, 'g')) || [])) {
      const declaration = resolveRunReference(claims?.runs, stamp, claim);
      if (!declaration) {
        const anyFile = evidenceFiles.some((file) => file.includes(stamp));
        if (anyFile) {
          problems.push(`${name} cites run ${stamp}, which exists as files in reports/evidence/ but is not declared in the run-claims sidecar; a run nothing claims cannot back a claim`);
        } else {
          problems.push(`${name} cites run ${stamp}, and no file in reports/evidence/ belongs to it`);
        }
        continue;
      }

      // A run whose producer did not exit 0 cannot back a claim, and the counts in its log will not show
      // that: a producer that fails after its last test leaves a log that reads exactly like a green one.
      // This is the one check that has to look at the exit code, and it is why the exit is recorded at all.
      //
      // It fires only where the unit is actually leaning on the run — a gate count, or a finding this round
      // has closed. A document that *names* a failed run in order to record that it failed is doing the
      // opposite of leaning on it, and the reports have to be able to say so without being told they may not.
      // The difference is not wording; it is whether the unit makes a claim the run would be the evidence for.
      const leansOnIt = /\d+\s*\/\s*\d+/.test(claim) || (row
        ? CLAIMS_DONE.has(row.status)
        : [...byId.values()].some((other) => CLAIMS_DONE.has(other.status) && other.finding_id && claim.includes(other.finding_id)));
      const resolved = resolvedRuns.find((entry) => entry.label === declaration.runId);
      const exit = Number(resolved?.meta?.exit);
      if (leansOnIt && Number.isInteger(exit) && exit !== 0) {
        problems.push(`${name} cites run ${declaration.runId}, which exited ${exit}; a run that did not run to completion cannot back a claim, whatever its log says it passed`);
      }
      if (leansOnIt && resolved?.meta?.source_drift && resolved.meta.source_drift !== 'none') {
        problems.push(`${name} cites run ${declaration.runId}, which recorded source_drift=${resolved.meta.source_drift}; its counts describe no single tree`);
      }
    }
  }

  /* --- the counts a document asserts, checked against the run it cites ------------ */
  for (const claim of claimedCounts(handoffText)) {
    if (claim.passed > claim.total) {
      problems.push(`the handoff claims ${claim.gate} ${claim.passed}/${claim.total}, which is not a number of passes`);
      continue;
    }

    // Resolved through the cited run. This is the FR10-02 correction: the claim names a run, and that
    // run's own log is the only thing that can satisfy it.
    const declared = resolveRunReference(claims?.runs, claim.stamp, claim.text);
    if (!declared) continue; // already reported above as an undeclared or absent run

    if (declared.tier !== claim.gate) {
      problems.push(`the handoff claims ${claim.gate} ${claim.passed}/${claim.total} on line ${claim.line} from run ${claim.stamp}, but that run is declared in the ${declared.tier} tier`);
      continue;
    }
    const resolved = resolvedRuns.find((entry) => entry.label === declared.runId);
    if (!resolved || !resolved.outcome) continue;

    const outcome = resolved.outcome;
    if (claim.total !== outcome.tests) {
      problems.push(`the handoff claims ${claim.gate} ${claim.passed}/${claim.total} from run ${claim.stamp}, but ${declared.runId}.log recorded ${outcome.tests} test(s) (${outcome.pass} passed, ${outcome.fail} failed, ${outcome.skipped} skipped)`);
      continue;
    }
    if (claim.passed !== outcome.pass) {
      problems.push(`the handoff claims ${claim.gate} ${claim.passed}/${claim.total} from run ${claim.stamp}, but ${declared.runId}.log recorded ${outcome.pass} passing and ${outcome.fail} failing`);
      continue;
    }
    if (outcome.fail > 0 || outcome.cancelled > 0) {
      problems.push(`the handoff claims ${claim.gate} ${claim.passed}/${claim.total} from run ${claim.stamp}, but that run recorded ${outcome.fail} failure(s) and ${outcome.cancelled} cancellation(s)`);
    }
  }

  const comparisonPath=join(reportsDir,'FRONTEND-SOURCE-COMPARISONS.json');
  if(existsSync(comparisonPath)) {
    try {
      const document=JSON.parse(readFileSync(comparisonPath,'utf8'));
      const manifests=new Map();
      for(const entry of document.entries||[]) {
        if(!resolvedRuns.some(run=>run.label===entry.fromRunId)) throw new Error('comparison references undeclared run');
        manifests.set(entry.fromRunId,JSON.parse(readFileSync(join(evidenceDir,`${entry.fromRunId}.source-before.manifest.json`),'utf8')));
      }
      verifySourceComparisons(document,manifests,buildManifest(repoRoot));
    } catch(error) {problems.push(`source comparisons: ${error.message}`);}
  } else if(required.includes('FR12-05')) problems.push('source comparisons document missing');

  /* --- a finding cannot be both open and closed -------------------------------- */
  // Not a duplicate-id check: a row can be *edited* into a contradiction with the handoff's task table,
  // and that is the version that survives review. The handoff uses "OPEN" as prose for unfinished work,
  // so the check only fires when the row is finished and the handoff still calls it unfinished.
  //
  // The unit examined is the whole line — a table row, or a sentence. Refining this to the `|`-delimited
  // cell that names the id was tried and is wrong: a disagreement is naturally written `| FR9-01 | OPEN |`,
  // and the cell holding the id does not hold the status. The cost of scanning the line is the false
  // positive on a line that names a finished finding and an unfinished one in the same breath, which is a
  // cost paid by writing the sentence clearly. A rule that can be satisfied by rewording the report is not
  // a rule worth refining, so the honest thing is to leave it coarse and say so here.
  for (const [id, row] of byId) {
    if (!CLAIMS_DONE.has(row.status)) continue;
    const handoffLine = handoffText.split('\n').find((line) => line.includes(id));
    if (handoffLine && /\bOPEN\b/.test(handoffLine)) {
      problems.push(`${id} is ${row.status} in the matrix but the handoff still describes it as OPEN`);
    }
  }

  return {
    problems,
    warnings,
    paths,
    mode,
    rows: rows.map(({ _raw, _cellCount, cells, ...row }) => row),
    evidenceFiles,
    runs: resolvedRuns.map(({ label, meta, outcome }) => ({
      runId: label,
      exit: meta?.exit ?? null,
      sourceDigest: meta?.source_digest ?? null,
      outcome
    }))
  };
}

/* ------------------------------------------------------------------ cli ---- */
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const USAGE = `usage: node tools/validate-reports.mjs [options]

  --repo <path>       repository root; the reports are read from <path>/reports unless told otherwise
  --reports <path>    reports directory (default: <repo>/reports) — applies to every document
  --evidence <path>   evidence directory (default: <reports>/evidence)
  --mode draft|final  draft: a VERIFIED row must be backed by a resolvable run (default)
                      final: missing evidence, missing run claims and a nonzero producer exit are problems
  --json              machine-readable output
  -h, --help          this text

--reports and --evidence may also come from FRONTEND_REPORTS_DIR / FRONTEND_EVIDENCE_DIR. A relative
value of any of the three is resolved against the repository, not against the working directory, so the
same command means the same directory however it was invoked. Precedence: flag, then variable, then
default. See tools/frontend-report-paths.mjs.

Exit 0 when every claim holds, 1 when there is something to say, 2 on bad usage.
`;

  const options = { repoRoot: REPO_ROOT, mode: 'draft' };
  const argv = process.argv.slice(2);
  const known = new Set(['--repo', '--reports', '--evidence', '--mode', '--json', '-h', '--help']);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!known.has(arg)) {
      process.stderr.write(`validate-reports: unknown option ${arg}\n\n${USAGE}`);
      process.exit(2);
    }
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '-h' || arg === '--help') { process.stdout.write(USAGE); process.exit(0); }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      process.stderr.write(`validate-reports: ${arg} needs a value\n\n${USAGE}`);
      process.exit(2);
    }
    // `--repo` is resolved against the working directory, because that is how a reader points this tool
    // at a *different* repository from wherever they happen to be standing.
    if (arg === '--repo') options.repoRoot = resolve(value);
    // `--reports` and `--evidence` are deliberately NOT resolved here. They go to the shared helper
    // unresolved so it can resolve a relative one against the repository root — the convention every
    // other consumer now uses, and the one that makes `npm --prefix tests run test:static` (cwd
    // `<repo>/tests`) mean the same directory as a bare `node tools/validate-reports.mjs`.
    if (arg === '--reports') options.reports = value;
    if (arg === '--evidence') options.evidence = value;
    if (arg === '--mode') {
      if (value !== 'draft' && value !== 'final') {
        process.stderr.write(`validate-reports: --mode must be draft or final, not "${value}"\n\n${USAGE}`);
        process.exit(2);
      }
      options.mode = value;
    }
    i += 1;
  }

  const result = validateReports(options);
  const { problems, warnings, rows, evidenceFiles, runs } = result;
  if (options.json) {
    process.stdout.write(`${JSON.stringify({
      ok: problems.length === 0, mode: options.mode, paths: result.paths, problems, warnings, rows, evidenceFiles, runs
    }, null, 2)}\n`);
  } else {
    for (const warning of warnings) process.stdout.write(`  ! ${warning}\n`);
    if (problems.length === 0) {
      process.stdout.write(`reports validate: ${rows.length} finding rows, ${evidenceFiles.length} evidence files, `
        + `${runs.length} run claim(s) bound to their evidence, every claim backed\n`);
    } else {
      process.stdout.write(`reports validate: ${problems.length} problem(s)\n`);
      for (const problem of problems) process.stdout.write(`  - ${problem}\n`);
    }
  }
  process.exit(problems.length === 0 ? 0 : 1);
}
