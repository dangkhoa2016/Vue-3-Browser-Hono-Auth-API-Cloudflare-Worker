#!/usr/bin/env node
/**
 * frontend-run-claims.mjs — writes `reports/FRONTEND-RUN-CLAIMS.json` out of the runs themselves.
 *
 * ## Why this exists
 *
 * FR10-02's whole correction was that a claim in prose cannot be checked. The handoff says `unit 314/314
 * on run <id>`; that sentence carries a count and a run name and nothing else — not the exit code, not the
 * tier, not the source digest, which are the three things that decide whether the number means anything.
 * The fix was a structured sidecar, and a structured sidecar that a human fills in by hand reintroduces the
 * original defect one level down: now there is a field, and something typed `exitCode: 0` into it.
 *
 * So the sidecar is *derived*. Every value in it is read out of the artefacts the run already wrote:
 *
 *   - the run id is the artefact's own file name;
 *   - the tier is read from the run's `argv`, not from the file name, so a run cannot pass itself off as a
 *     different producer by sitting in a differently named file;
 *   - the command, the exit code and the source digest are the `.meta` the wrapper recorded, and the
 *     digest is cross-checked against the source manifest that run wrote before it is written down;
 *   - the outcome counts are parsed from *that run's* log with the same parser `validate-reports.mjs`
 *     uses, imported from it rather than reimplemented — two parsers of one producer's output is one more
 *     place for a disagreement to hide.
 *
 * Nothing here decides whether a run is good. A red run produces a claim that says so, and the validator
 * reports it; this tool's only promise is that what it writes down is what the run recorded.
 *
 * ## Usage
 *
 *   node tools/frontend-run-claims.mjs --run <id> [--run <id> ...] [--evidence DIR] [--out FILE] [--print]
 *   node tools/frontend-run-claims.mjs --all [--evidence DIR] [--out FILE]
 *
 * `--all` declares every run in the evidence directory that has a `.meta` and a `.log`. It is the right
 * choice for a fresh tree and the wrong one for a directory that still holds the previous round's runs:
 * declaring a stale run makes its digest a claim about this tree that the tree cannot support.
 *
 * Exit: 0 written; 2 usage error; 3 a named run could not be resolved, which is a refusal rather than a
 * warning — a sidecar that silently drops the run a report cites is the exact failure this round is about.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLAIMS_SCHEMA, SOURCE_MANIFEST_SCHEMA, outcomeFromLog, parseMeta, tierFromArgv } from './validate-reports.mjs';
import { verifySourceManifest, verifySnapshot } from './frontend-source-identity.mjs';
import { resolveReportPaths } from './frontend-report-paths.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The tier of a run, and how to tell.
 *
 * Re-exported from `validate-reports.mjs` rather than defined here. The sidecar and the validator have to
 * agree about which tier an `argv` belongs to, and two definitions of that question would be two answers:
 * a run whose declared tier and recorded argv were both internally consistent and mutually contradictory
 * is exactly the shape of defect this round exists to remove. One definition, imported.
 */
export { tierFromArgv };

/**
 * Reads one run's artefacts into a claim.
 *
 * Returns `{ claim, problems, skipped, head }`. The two lists are different in kind and the difference is
 * the whole design of `--all`:
 *
 *   `skipped`  the artefacts cannot back a claim *at all* — no source manifest, no recognisable gate, no
 *              exit code. There is nothing to declare, so nothing is declared. An early hand-made baseline
 *              from before the wrapper existed is in this class, and it is a fact about that tree rather
 *              than a fault in it.
 *   `problems` the artefacts *do* exist and *do* describe a run, but they contradict each other — the meta
 *              and the manifest record different source digests, two runs record different heads. That is
 *              a claim that would be written down saying something untrue, and it is refused.
 */
export function readRun(evidenceDir, runId) {
  const skipped = [];
  const problems = [];
  const metaPath = join(evidenceDir, `${runId}.meta`);
  const logPath = join(evidenceDir, `${runId}.log`);
  if (!existsSync(metaPath) || !existsSync(logPath)) {
    return { claim: null, problems, skipped: [`run ${runId}: no ${runId}.meta and ${runId}.log pair in the evidence directory`], head: null };
  }

  const meta = parseMeta(readFileSync(metaPath, 'utf8'));
  const log = readFileSync(logPath, 'utf8');
  const tier = tierFromArgv(meta.argv);

  if (!tier) skipped.push(`run ${runId}: argv "${meta.argv}" names no known gate, so it cannot be placed in a tier`);
  if (!meta.command) skipped.push(`run ${runId}: the meta records no command`);
  if (!Number.isInteger(Number(meta.exit))) skipped.push(`run ${runId}: the meta records no integer exit (read "${meta.exit}")`);
  if (!meta.source_digest) skipped.push(`run ${runId}: the meta records no source_digest`);

  // The digest the run recorded, against the manifest it recorded. They are written by two separate calls
  // and a disagreement means the wrapper and the identity tool are not describing the same tree, which is
  // a fact about the run rather than a typo to normalise away.
  const manifestPath = join(evidenceDir, `${runId}.source-before.manifest.json`);
  let head = null;
  let replay = 'NOT_AVAILABLE';
  if (!existsSync(manifestPath)) {
    skipped.push(`run ${runId}: no ${runId}.source-before.manifest.json, so the source it ran against cannot be identified`);
  } else {
    let manifest = null;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      skipped.push(`run ${runId}: ${manifestPath} is not valid JSON: ${error.message}`);
    }
    if (manifest) {
      try {
        verifySourceManifest(manifest);
        const snapshot = join(evidenceDir, `${runId}.source.tar.gz`);
        if (existsSync(snapshot)) { verifySnapshot(snapshot,manifest); replay='VERIFIED'; }
        else if(meta.source_snapshot) problems.push(`run ${runId}: required snapshot missing`);
      } catch(error) { problems.push(`run ${runId}: ${error.message}`); replay='INVALID'; }

      if (manifest.schema !== SOURCE_MANIFEST_SCHEMA) {
        skipped.push(`run ${runId}: the source manifest declares ${manifest.schema}, not ${SOURCE_MANIFEST_SCHEMA}`);
      } else if (meta.source_digest && manifest.digest !== meta.source_digest) {
        problems.push(`run ${runId}: the meta records source_digest ${meta.source_digest} but the manifest records ${manifest.digest}`);
      }
      head = manifest.repo?.head ?? null;
    }
  }

  if (skipped.length > 0) return { claim: null, problems, skipped, head };

  const outcome = outcomeFromLog(log, tier);
  // A gate that printed no test summary — the static tier, a dependency install — has no counts, and
  // writing `tests: 0, pass: 0` for it would assert that it ran zero tests. That is a different claim from
  // the one this run can support, so the field is omitted rather than filled in with a number that reads
  // as an observation. Its evidence is its exit code, which is declared either way.
  const declared = { runId, tier, command: meta.command, exitCode: Number(meta.exit), sourceDigest: meta.source_digest };
  declared.replay = replay;
  declared.replayRequired = Boolean(meta.source_snapshot);
  if (outcome.sawSummary) {
    declared.outcome = {
      tests: outcome.tests,
      pass: outcome.pass,
      fail: outcome.fail,
      skipped: outcome.skipped,
      cancelled: outcome.cancelled
    };
  }
  return { claim: declared, problems, skipped, head };
}

/** Every run in the evidence directory that has both a `.meta` and a `.log`, sorted by name. */
export function discoverRuns(evidenceDir) {
  if (!existsSync(evidenceDir)) return [];
  return readdirSync(evidenceDir)
    .filter((name) => name.endsWith('.meta'))
    .map((name) => name.slice(0, -'.meta'.length))
    .filter((runId) => existsSync(join(evidenceDir, `${runId}.log`)))
    .sort();
}

/* ------------------------------------------------------------------------ cli ---- */
const USAGE = `usage: node tools/frontend-run-claims.mjs [options]

  --run <id>        declare this run; repeatable. The id is the artefact base name in the evidence dir
  --all             declare every run found in the evidence directory
  --evidence <dir>  evidence directory (default: from FRONTEND_EVIDENCE_DIR, else <repo>/reports/evidence)
  --out <file>      sidecar path (default: <repo>/reports/FRONTEND-RUN-CLAIMS.json)
  --allow-problems  write the sidecar even when a run could not be read cleanly
  --print           write to stdout instead of to disk
  -h, --help        this text

Exit 0 written, 2 usage error, 3 a named run could not be read.
`;

const main = (argv) => {
  // The same resolver the validator and both gates use, so the sidecar is written from the evidence
  // directory the tool was configured with rather than from a path baked in here (FR11-01). The reports
  // directory is resolved with it, so the sidecar lands beside the reports it describes.
  const paths = resolveReportPaths({ repoRoot: REPO_ROOT });
  const options = { evidenceDir: paths.evidenceDir, out: join(paths.reportsDir, 'FRONTEND-RUN-CLAIMS.json') };
  const wanted = [];
  let all = false;
  let allowProblems = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === '-h' || arg === '--help') { process.stdout.write(USAGE); return 0; }
    if (arg === '--all') { all = true; continue; }
    if (arg === '--allow-problems') { allowProblems = true; continue; }
    if (arg === '--print') { options.print = true; continue; }
    if (arg === '--run' || arg === '--evidence' || arg === '--out') {
      if (value === undefined || value.startsWith('--')) {
        process.stderr.write(`frontend-run-claims: ${arg} needs a value\n\n${USAGE}`);
        return 2;
      }
      if (arg === '--run') wanted.push(value);
      // Resolved against the repo root, not the caller's cwd: `npm --prefix tests` runs from `tests/`.
      if (arg === '--evidence') options.evidenceDir = resolve(REPO_ROOT, value);
      if (arg === '--out') options.out = resolve(REPO_ROOT, value);
      i += 1;
      continue;
    }
    process.stderr.write(`frontend-run-claims: unknown option ${arg}\n\n${USAGE}`);
    return 2;
  }

  if (!all && wanted.length === 0) {
    process.stderr.write(`frontend-run-claims: nothing to declare; pass --run <id> or --all\n\n${USAGE}`);
    return 2;
  }

  const runIds = all ? discoverRuns(options.evidenceDir) : wanted;
  if (runIds.length === 0) {
    process.stderr.write(`frontend-run-claims: no runs found in ${options.evidenceDir}\n`);
    return 3;
  }

  const problems = [];
  const notes = [];
  const runs = [];
  let head = null;
  let replay = 'NOT_AVAILABLE';
  for (const runId of runIds) {
    const { claim, problems: runProblems, skipped, head: runHead } = readRun(options.evidenceDir, runId);
    problems.push(...runProblems);
    notes.push(...skipped);
    if (!claim) {
      // Naming a run is a promise that it is declarable. Sweeping a directory is not: half a legacy
      // directory is not a reason to refuse the half that is fine.
      if (!all) problems.push(`run ${runId} was named with --run but cannot back a claim: ${skipped.join('; ')}`);
      continue;
    }
    runs.push(claim);
    // Every run in a coherent tree saw the same HEAD. Recording the first and checking the rest is what
    // makes a sidecar assembled from a mixed directory visible instead of quietly self-inconsistent.
    if (runHead) {
      if (head === null) head = runHead;
      else if (head !== runHead) problems.push(`run ${runId}: recorded head ${runHead} differs from ${head}`);
    }
  }

  // The source identity of the tree these claims are about: the HEAD the runs recorded, and the digest the
  // sidecar was generated against. `contentDigest` is the digest of the first run's manifest, which is the
  // source the *earliest* declared run saw — see the ordering note in the execution log for why the
  // current tree's digest is not written here as if it were the same thing.
  let contentDigest = null;
  for (const runId of runIds) {
    const manifestPath = join(options.evidenceDir, `${runId}.source-before.manifest.json`);
    if (!existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (manifest.schema === SOURCE_MANIFEST_SCHEMA) { contentDigest = manifest.digest; break; }
    } catch (_error) {
      // Already reported by readRun for the runs that are declared; the first id may be a skipped one.
    }
  }

  const sidecar = {
    schema: CLAIMS_SCHEMA,
    generatedBy: 'tools/frontend-run-claims.mjs',
    source: { head, contentDigest },
    runs
  };
  const text = `${JSON.stringify(sidecar, null, 2)}\n`;

  for (const note of notes) process.stderr.write(`  - skipped: ${note}\n`);
  if (options.print) {
    process.stdout.write(text);
  } else {
    if (problems.length > 0 && !allowProblems) {
      for (const problem of problems) process.stderr.write(`frontend-run-claims: ${problem}\n`);
      process.stderr.write(`frontend-run-claims: refusing to write a sidecar with ${problems.length} unresolved problem(s); `
        + 'pass --allow-problems if these are the facts of this tree\n');
      return 3;
    }
    writeFileSync(options.out, text, 'utf8');
    process.stdout.write(`frontend-run-claims: ${runs.length} run(s) declared from ${options.evidenceDir}`
      + `${notes.length ? `, ${notes.length} artefact pair(s) skipped` : ''}\n  ${options.out}\n`);
  }
  for (const problem of problems) process.stderr.write(`  ! ${problem}\n`);
  return 0;
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
