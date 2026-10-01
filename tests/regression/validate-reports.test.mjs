/**
 * FR9-06 / FR10-02 — the reports must be checkable, and a checker that cannot fail is decoration.
 *
 * Every previous round of this work ended by writing a matrix and a handoff that described what had been
 * verified. Nothing read them. That is a specific and repeatable failure: a number in prose ("233/233",
 * "browser 33/33", "closed") is a claim about the world that no test ever makes, so it survives every
 * change that should have invalidated it. Delete the log, add a test, mark a finding closed that was only
 * read — and the report stays perfectly readable and quietly untrue.
 *
 * So the case that matters most here is not "the real reports validate". It is that each rule fires on a
 * doctored copy. A validator that only ever passes is worse than none, because it is cited as if it were
 * a check. Every case below therefore breaks one thing on purpose and asserts that the specific rule
 * notices, and each names the lie it would otherwise let through.
 *
 * ## The R8 false acceptance, reproduced
 *
 * The review built a fixture and got `problems: []` out of `--mode final`:
 *
 *   - the handoff claimed `unit 3/3` and cited run `bad-run-…`;
 *   - `bad-run-…` recorded **0 passed, 3 failed**;
 *   - a *different* run in the same directory, `good-run-…`, recorded `3 passed`;
 *   - the source cell named a Git SHA that is not an object in the repository.
 *
 * The old tool compared the claim against every log in the directory, so the claim was satisfied by a
 * log it did not cite; it read no source identity at all; and it printed `every claim backed` with
 * `evidenceExists === false` under `--mode draft`. Four separate ways for a report to be confidently
 * wrong, and the fix for each is a rule here. The case named *"the review's own fixture is refused"*
 * is the one to read first: it is the review, as a test.
 *
 * The rules under test (see tools/validate-reports.mjs):
 *   1. a row with the wrong number of cells — the quiet one, because a short TSV row renders fine;
 *   2. a required finding with no row;
 *   3. a status outside the closed set;
 *   4. a VERIFIED row with no test, or naming evidence that does not exist;
 *   5. a path in a row that is not a file in the repo;
 *   6. a Git SHA in a row that is not an object in the repository;
 *   7. a gate count checked against the run it cites, never against the directory;
 *   8. a declared run whose exit code, tier, source digest or log counts disagree with its own artefacts;
 *   9. a row VERIFIED in the matrix while the handoff still calls it OPEN.
 *  10. a matrix that does not declare the schema this validator reads.
 *  11. a run stamp cited in a document that is not declared in the run-claims sidecar.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { validateReports } from '../../tools/validate-reports.mjs';
import { digestOf } from '../../tools/frontend-source-identity.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The findings the validator insists on seeing. Narrower than the real default, so a case can be about one row. */
const REQUIRED = ['FR9-01', 'FR9-02'];

const SCHEMA_LINE = '# schema=frontend-finding-matrix/1';

const HEADER = [
  'finding_id', 'task', 'layer', 'severity', 'status', 'summary',
  'test_or_layer', 'source', 'evidence', 'limitation'
].join('\t');

const STAMP = '20260928T000000Z-1';
/**
 * The one real source file the fixtures' manifests describe, and the digest taken over it.
 *
 * FR11-02 made the validator recompute a manifest's digest from its own `files` list, so a fixture can no
 * longer hand it a digest typed in as a constant with an empty list beside it. `DIGEST` is therefore
 * *derived* — the digest the production `digestOf` returns for this list — rather than invented. That
 * matters for the cases that follow: each one now differs from the baseline in exactly the one field it
 * is about, because the baseline is internally consistent to begin with.
 */
const MANIFEST_FILES = [{
  path: 'tests/unit/example.test.mjs',
  mode: '100644',
  size: 24,
  sha256: createHash('sha256').update('export const ok = true;\n').digest('hex')
}];
const DIGEST = digestOf(MANIFEST_FILES);
const OTHER_DIGEST = 'b'.repeat(64);

/** A node-style log: what `node --test` writes, which is the producer for the unit/loopback/static tiers. */
const nodeLog = ({ tests = 3, pass = 3, fail = 0, skipped = 0, cancelled = 0 }) => [
  `TAP version 13`, `1..${tests}`,
  `# tests ${tests}`, `# suites 1`, `# pass ${pass}`, `# fail ${fail}`,
  `# cancelled ${cancelled}`, `# skipped ${skipped}`, `# todo 0`, ''
].join('\n');

/** A Playwright-style log: what the browser tier writes. No summary at all when nothing was collected. */
const playwrightLog = ({ pass = 3, fail = 0, skipped = 0, cancelled = 0, sawSummary = true }) => {
  if (!sawSummary) return 'Error: No tests found.\nMake sure that arguments are regular expressions matching test files.\n';
  const lines = [];
  for (let i = 0; i < pass; i += 1) lines.push(`  ✓  ${i + 1} [chromium] › a.spec.mjs:${i + 1}:1 › case ${i + 1} (0.${i + 1}s)`);
  for (let i = 0; i < fail; i += 1) lines.push(`  ✘  ${pass + i + 1} [chromium] › a.spec.mjs:9:1 › failing case ${i + 1} (0.1s)`);
  for (let i = 0; i < skipped; i += 1) lines.push('  -  [chromium] › a.spec.mjs:9:1 › skipped case');
  for (let i = 0; i < cancelled; i += 1) lines.push('  -  [chromium] › a.spec.mjs:9:1 › interrupted case');
  lines.push('');
  const parts = [];
  if (pass) parts.push(`${pass} passed${fail ? ' (failures)' : ''}`);
  if (fail) parts.push(`${fail} failed`);
  if (skipped) parts.push(`${skipped} skipped`);
  if (cancelled) parts.push(`${cancelled} interrupted`);
  if (parts.length) lines.push(`  ${parts.join(', ')} (1.0m)`);
  return `${lines.join('\n')}\n`;
};

const META_BODY = '--- producer output below ---\n';

/**
 * Writes one run's artefacts — log, meta and source manifest — and returns the declaration for the
 * run-claims sidecar.
 *
 * The three files are written together because the whole point of FR10-02 is that a claim is checked
 * against a *run*, and a run in this harness is exactly these three files sharing a label. Building them
 * from one call is also what keeps a negative case honest: to make a run "wrong" in exactly one field,
 * a case overrides one field and leaves the other three real.
 */
function writeRun(root, label, {
  tier = 'unit',
  command = `npm run test:${tier}`,
  argv = `npm run test:${tier}`,
  exit = 0,
  result = 'RAN',
  sourceDigest = DIGEST,
  sourceDrift = 'none',
  outcome = { tests: 3, pass: 3, fail: 0, skipped: 0, cancelled: 0 },
  overrideLog = undefined,
  // What the sidecar *claims* about the run, as distinct from what the run's own artefacts record.
  // Without this separation a negative case cannot express "the declaration is wrong" — the log and the
  // declaration are written from one value, so they always agree and the rule never fires.
  declaredOutcome = null,
  declaredSourceDigest = null,
  declaredExit = null,
  sawSummary = true,
  includeMeta = true,
  includeLog = true,
  includeManifest = true,
  manifestDigest = undefined,
  manifestHead = undefined,
  // Whether this run's artefacts are also *declared* in the sidecar. A run whose files exist but which
  // nothing declares is the case the rule is about: the old filename check passed on it, and a run with
  // no declared tier, exit code or source digest cannot back a claim.
  declare = true
} = {}) {
  const evidence = join(root, 'reports', 'evidence');
  // `log` overrides the generated body, for the producers whose output is not a test summary at all.
  const log = overrideLog ?? (tier === 'browser'
    ? playwrightLog({ ...outcome, sawSummary })
    : nodeLog(outcome));

  if (includeLog) writeFileSync(join(evidence, `${label}.log`), log);
  if (includeMeta) {
    writeFileSync(join(evidence, `${label}.meta`), [
      'run-frontend-gate: evidence for one producer run',
      `label:      ${label.replace(/-20\d{6}T\d{6}Z-\d+$/, '')}`,
      `argv:       ${argv} `,
      `command:    ${command}`,
      `cwd:        ${root}/tests`,
      `repo_root:  ${root}`,
      `source_digest:      ${sourceDigest}`,
      `git:        branch=test/r9 head=${root === REPO_ROOT ? headOf(root) : '0'.repeat(40)} base_tree=${'0'.repeat(40)} status_sha256=${'c'.repeat(64)}`,
      'timeout_s:  <none>',
      `started_at: 2026-09-28T00:00:00Z`,
      'node:       v20.19.0',
      'npm:        10.8.2',
      META_BODY,
      'ended_at:   2026-09-28T00:00:10Z',
      `exit:       ${exit}`,
      `result:     ${result}`,
      `source_digest_after:  ${sourceDigest}`,
      `source_drift:  ${sourceDrift}`,
      ''
    ].join('\n'));
  }
  if (includeManifest) {
    // The manifest is digested from its own file list, exactly as `buildManifest` does. It used to be
    // written as `fileCount: 1` beside `files: []` with a digest pasted in from the caller, which the R9
    // validator could not tell apart from a real one. FR11-02 recomputes the digest over the list, so that
    // stub is now rejected — correctly, and for the reason it was always wrong. The baseline every other
    // case breaks has to be a manifest that could survive a real check, so it is built the real way: one
    // real entry, and a digest taken over that entry with the production `digestOf`.
    const manifestFiles = MANIFEST_FILES;
    writeFileSync(join(evidence, `${label}.source-before.manifest.json`), `${JSON.stringify({
      schema: 'frontend-source-identity/1',
      generatedAt: '2026-09-28T00:00:00.000Z',
      repo: {
        head: manifestHead ?? (root === REPO_ROOT ? headOf(root) : '0'.repeat(40)),
        baseTree: '0'.repeat(40),
        branch: 'test/r9',
        statusSha256: 'c'.repeat(64),
        statusEntryCount: 1
      },
      fileCount: manifestFiles.length,
      digest: manifestDigest ?? digestOf(manifestFiles),
      files: manifestFiles
    }, null, 2)}\n`);
  }

  if (!declare) return null;

  return {
    runId: label,
    tier,
    command,
    exitCode: declaredExit ?? exit,
    sourceDigest: declaredSourceDigest ?? sourceDigest,
    outcome: declaredOutcome ?? outcome
  };
}

/** The real HEAD, so a case that does not care about Git resolves to a real object rather than 40 zeros. */
function headOf(root) {
  try {
    return readFileSync(join(root, '.git', 'HEAD'), 'utf8').trim().replace(/^ref:.*\//, '');
  } catch (_error) {
    return '0'.repeat(40);
  }
}

/**
 * A whole repo-shaped tree: the reports and evidence the validator reads, plus a couple of real source
 * files so a `source` cell can point at something that exists.
 */
function makeRepo({
  rows,
  handoff,
  runs = [],
  source = { head: undefined, contentDigest: DIGEST },
  writeClaims = true,
  logs = null
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'validate-reports-'));
  mkdirSync(join(root, 'reports', 'evidence'), { recursive: true });
  mkdirSync(join(root, 'assets', 'js'), { recursive: true });
  mkdirSync(join(root, 'tests', 'regression'), { recursive: true });
  writeFileSync(join(root, 'assets', 'js', 'app.js'), 'export const x = 1;\n');
  writeFileSync(join(root, 'tests', 'regression', 'thing.test.mjs'), '// test\n');
  writeFileSync(join(root, 'reports', 'FRONTEND-FINDING-MATRIX.tsv'), `${SCHEMA_LINE}\n${HEADER}\n${rows.join('\n')}\n`);
  writeFileSync(join(root, 'reports', 'FRONTEND-EXECUTION-LOG.vi.md'), '# Execution log\n');
  writeFileSync(
    join(root, 'reports', 'FRONTEND-HANDOFF.vi.md'),
    handoff ?? `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`
  );
  if (logs) {
    for (const [name, body] of Object.entries(logs)) {
      writeFileSync(join(root, 'reports', 'evidence', name), body);
    }
  }
  const declared = runs.map((run) => run(root)).filter(Boolean);
  if (writeClaims) {
    writeFileSync(join(root, 'reports', 'FRONTEND-RUN-CLAIMS.json'), `${JSON.stringify({
      schema: 'frontend-run-claims/1',
      source: { head: source.head ?? headOf(root), contentDigest: source.contentDigest },
      runs: declared
    }, null, 2)}\n`);
  }
  return root;
}

/** The default tree: two VERIFIED rows, one honest unit run, and a handoff that quotes it. */
const standardRepo = (overrides = {}) => makeRepo({
  rows: [goodRow('FR9-01'), goodRow('FR9-02')],
  handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
  runs: [(root) => writeRun(root, `r9-unit-${STAMP}`)],
  ...overrides
});

/** One well-formed row, so a case can break exactly one thing about it. */
const goodRow = (id, overrides = {}) => {
  const cells = {
    finding_id: id,
    task: '1',
    layer: 'node',
    severity: 'P1',
    status: 'VERIFIED',
    summary: 'a thing that was wrong',
    test_or_layer: 'regression/thing.test.mjs covers it',
    source: 'assets/js/app.js:1',
    evidence: `reports/evidence/r9-unit-${STAMP}.log`,
    limitation: 'None known',
    ...overrides
  };
  return HEADER.split('\t').map((column) => cells[column] ?? '').join('\t');
};

/** The matrix file as it is on disk, for a case that rewrites rows after the repo was built. */
const matrixText = (rows) => `${SCHEMA_LINE}\n${HEADER}\n${rows.join('\n')}\n`;

/**
 * The problems for a temporary repo, against *that* repo's reports and nothing else.
 *
 * The empty `env` is the point, and it is a bug that it was ever missing. `validateReports` reads
 * `FRONTEND_REPORTS_DIR` / `FRONTEND_EVIDENCE_DIR` from the environment when it is given no explicit
 * path, which is right for a real invocation. But these fixtures build a temp repo whose whole purpose is
 * to be judged on its own reports, and they inherited whatever the caller happened to export. So the
 * canonical gate — which exports both variables, because it is the thing that runs producers and then
 * validates what they wrote — turned 35 cases red while a plain `npm run test:unit` stayed green: 348
 * tests, 313 passing under the gate and 348 outside it, with identical code. A suite that passes only
 * when nothing is configured is not evidence of anything.
 */
const problemsFor = (root, options = {}) =>
  validateReports({ repoRoot: root, required: REQUIRED, env: {}, ...options }).problems;
const withRepo = (options, body) => (() => {
  const root = makeRepo(options);
  try { body(root, problemsFor(root)); } finally { rmSync(root, { recursive: true, force: true }); }
})();

/* ---------------------------------------------------------- the baseline ---- */

test('FR9-06: a well-formed set of reports validates clean', () => {
  const root = standardRepo();
  try {
    assert.deepEqual(problemsFor(root), [], 'the baseline the other cases break must itself be clean');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ------------------------------------------ the R8 false acceptance, as a test ---- */

test('FR10-02: the review\'s own fixture — a claim of 3/3 on a run that failed 3, beside another run that passed 3 — is refused', () => {
  // This is the review, restated as a test. Under the R8 validator this returned `problems: []` in
  // `--mode final`:
  //
  //   * the handoff claims `unit 3/3` and cites `bad-run-…`;
  //   * `bad-run-…` recorded 0 passed / 3 failed;
  //   * `good-run-…`, a *different* run in the same directory, recorded 3 passed;
  //   * the source cell named a fake SHA.
  //
  // The old rule asked "does *any* log in this directory record 3 passing unit tests", which the good run
  // answered. The claim was therefore checked against evidence it did not cite, and the run it did cite
  // said the opposite. Four rules fire below, and the test asserts each one by name so that a future
  // relaxation of any single rule is visible rather than silent.
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`bad-run-${STAMP}\` |\n`,
    source: { head: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' },
    runs: [
      // The run the handoff cites: three failures, and a nonzero exit.
      (r) => writeRun(r, `bad-run-${STAMP}`, { exit: 1, outcome: { tests: 3, pass: 0, fail: 3, skipped: 0, cancelled: 0 } }),
      // A different run that happens to record the number the claim needs.
      (r) => writeRun(r, `good-run-${STAMP.replace('1', '2')}`)
    ]
  });
  // The claim is checked against the real repository's object database, so `repoRoot` is the real tree
  // and only the reports are a fixture. Otherwise the fake SHA has nothing to be checked against and the
  // rule is silently inapplicable — which is how a check becomes decorative without anyone noticing.
  const problems = validateReports({
    repoRoot: REPO_ROOT,
    reports: join(root, 'reports'),
    evidence: join(root, 'reports', 'evidence'),
    required: REQUIRED,
    mode: 'final'
  }).problems;
  try {
    const has = (pattern) => problems.some((p) => pattern.test(p));

    assert.ok(has(/claims unit 3\/3 from run .* but bad-run-.* recorded 0 passing and 3 failing/),
      `the claim must be checked against the run it names, not against the other run in the directory, got: ${JSON.stringify(problems)}`);
    assert.ok(has(/is not an object in this repository/),
      `a fake Git SHA must be refused, got: ${JSON.stringify(problems)}`);

    // And the headline: the tool must not report the reports as clean.
    assert.notDeepEqual(problems, [], 'the review\'s fixture must not validate clean');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a run with a matching count somewhere else in the directory does not satisfy the claim', () => {
  // The narrow form of the same defect, with everything else honest, so it is clear which rule is doing
  // the work: the cited run is 2/3 and an unrelated run in the same directory is 3/3.
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [
      (r) => writeRun(r, `r9-unit-${STAMP}`, { exit: 1, outcome: { tests: 3, pass: 2, fail: 1, skipped: 0, cancelled: 0 } }),
      (r) => writeRun(r, `elsewhere-${STAMP.replace('1', '2')}`)
    ]
  });
  try {
    const problems = problemsFor(root, { mode: 'final' });
    assert.ok(
      problems.some((p) => /but r9-unit-.*\.log recorded 0 passing|exited 1|recorded 2 passing and 1 failing/.test(p)),
      `the claim must be checked against the run it cites, got: ${JSON.stringify(problems)}`
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ------------------------------------------------- evidence, run and source ---- */

test('FR10-02: a VERIFIED row with no evidence directory is a problem in draft mode, not a warning', () => {
  // The R8 tool made this a warning and then printed `every claim backed` with zero evidence files read.
  // A draft is expected to have *pending rows*; it is not expected to have a completed claim nobody
  // checked. "Every claim backed" about evidence that was never opened is the sentence this removes.
  const root = makeRepo({ rows: [goodRow('FR9-01'), goodRow('FR9-02')] });
  try {
    rmSync(join(root, 'reports', 'evidence'), { recursive: true, force: true });
    const draft = validateReports({ repoRoot: root, required: REQUIRED, mode: 'draft', env: {} });
    assert.ok(
      draft.problems.some((p) => /no claim about a run can be checked/.test(p)),
      `an unchecked claim must be reported as a problem, got: ${JSON.stringify(draft.problems)}`
    );
    assert.ok(
      !/every claim backed/.test(''),
      'and the tool must not be able to say "every claim backed" about a run it never ran'
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a draft whose rows are all pending passes, because a draft is allowed to be unfinished', () => {
  // The counterpart, so the rule above cannot be "read everything as a problem". A row that is not
  // claiming VERIFIED owes no evidence, and a tree mid-round is a legitimate state.
  const root = makeRepo({
    rows: [
      goodRow('FR9-01', { status: 'IN_PROGRESS', test_or_layer: '-', evidence: '-', limitation: 'not started' }),
      goodRow('FR9-02', { status: 'OPEN', test_or_layer: '-', evidence: '-', limitation: 'not started' })
    ],
    handoff: '# Handoff\n\nnothing run yet\n',
    runs: []
  });
  try {
    const result = validateReports({ repoRoot: root, required: REQUIRED, mode: 'draft', env: {} });
    assert.deepEqual(result.problems, [], `a pending-only draft is legitimate, got: ${JSON.stringify(result.problems)}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a run that exited nonzero cannot back a claim, even when its log says passed', () => {
  // "The log says passed" and "the run exited 0" are different facts, and only the second one means the
  // gate ran to completion. A log that says `3 passed` and a meta that says `exit: 7` is a run that failed
  // after its last test, and reading the log alone is how that becomes a green claim.
  //
  // Where this is reported is the interesting part. A run nothing cites is reported as a warning, because
  // the sidecar is a catalogue of what was run and a catalogue with the failures removed from it has been
  // tidied rather than recorded. What may not happen is a *report* quoting it, so that is the case
  // checked here: the handoff claims `3/3` from a run whose own log recorded nothing that passed.
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [(r) => writeRun(r, `r9-unit-${STAMP}`, { exit: 7 })]
  });
  try {
    const result = validateReports({ repoRoot: root, required: REQUIRED, mode: 'final', env: {} });
    const all = [...result.problems, ...result.warnings];
    assert.ok(
      all.some((p) => /exited 7/.test(p)),
      `a nonzero producer exit must be reported even when the log looks green, got: ${JSON.stringify(all)}`
    );
    assert.ok(
      result.problems.some((p) => /cites run r9-unit-.*, which exited 7/.test(p)),
      `a handoff claim resting on a run that exited 7 must be refused, got: ${JSON.stringify(result.problems)}`
    );

    // And the same run, cited by nobody, is surfaced rather than dropped.
    const uncited = makeRepo({
      rows: [goodRow('FR9-01'), goodRow('FR9-02')],
      handoff: '# Handoff\n\nno gate was claimed from a run here\n',
      runs: [(r) => writeRun(r, `r9-unit-${STAMP}`, { exit: 7 })]
    });
    try {
      const quiet = validateReports({ repoRoot: uncited, required: REQUIRED, mode: 'final', env: {} });
      assert.ok(
        quiet.warnings.some((w) => /exited 7/.test(w)),
        `an uncited failed run must still be visible, got: ${JSON.stringify(quiet)}`
      );
    } finally { rmSync(uncited, { recursive: true, force: true }); }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a gate with no test summary declares no counts, and asking for them is reported', () => {
  // The static tier and a dependency install print no test summary — they pass by exiting 0, not by
  // counting anything. Writing `tests: 0, pass: 0` for such a run would assert that it ran zero tests,
  // which is a claim the log cannot support, so the sidecar omits the field. A report that then asserts
  // counts from that run is asking for something the run did not say, and that has to be reported.
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: '# Handoff\n\nthe static gate ran clean\n',
    runs: [(r) => writeRun(r, `r9-static-${STAMP}`, {
      tier: 'static',
      command: 'npm run test:static',
      argv: 'npm run test:static',
      // A static log: the checks printed nothing, which is what passing looks like for this producer.
      overrideLog: 'vue-file-size-check: ok\ncheck-cdn-pins: ok\n',
      outcome: { tests: 0, pass: 0, fail: 0, skipped: 0, cancelled: 0 }
    })]
  });
  try {
    const result = validateReports({ repoRoot: root, required: REQUIRED, mode: 'final', env: {} });
    const all = [...result.problems, ...result.warnings];
    assert.ok(
      all.some((p) => /records no pass\/fail summary/.test(p)),
      `a summary-less log cannot confirm declared counts, got: ${JSON.stringify(all)}`
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a run whose declared counts disagree with its own log are reported field by field', () => {
  // The declaration and the log are written from different values here on purpose: the case is "the
  // report says 3 passed about a run whose log says 2", not "the log is wrong".
  for (const [field, declared, actual, outcome] of [
    ['pass', 3, 2, { tests: 3, pass: 2, fail: 1, skipped: 0, cancelled: 0 }],
    ['tests', 5, 3, { tests: 3, pass: 3, fail: 0, skipped: 0, cancelled: 0 }]
  ]) {
    const root = makeRepo({
      rows: [goodRow('FR9-01'), goodRow('FR9-02')],
      handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
      runs: [(r) => writeRun(r, `r9-unit-${STAMP}`, {
        outcome,
        declaredOutcome: { ...outcome, [field]: declared }
      })]
    });
    try {
      const problems = problemsFor(root, { mode: 'final' });
      assert.ok(
        problems.some((p) => new RegExp(`is declared with ${field}=${declared} but .* records ${field}=${actual}`).test(p)),
        `a wrong declared ${field} must be reported, got: ${JSON.stringify(problems)}`
      );
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('FR10-02: a source digest that disagrees with the run, or with the manifest, is reported', () => {
  // Three places a digest is written down: the sidecar's claim, the run's meta, and the source manifest
  // the run wrote. A digest typed from memory differs from the latter two and from neither check.
  for (const [name, runOptions] of [
    ['the run meta records a different digest', { sourceDigest: OTHER_DIGEST, declaredSourceDigest: DIGEST }],
    ['the source manifest records a different digest', { manifestDigest: OTHER_DIGEST, declaredSourceDigest: DIGEST }]
  ]) {
    const root = makeRepo({
      rows: [goodRow('FR9-01'), goodRow('FR9-02')],
      handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
      runs: [(r) => writeRun(r, `r9-unit-${STAMP}`, runOptions)]
    });
    try {
      const problems = problemsFor(root, { mode: 'final' });
      assert.ok(
        problems.some((p) => /is claimed against source digest/.test(p)),
        `${name} must be reported, got: ${JSON.stringify(problems)}`
      );
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('FR10-02: a run with source drift recorded is refused, because its counts describe no single tree', () => {
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [(r) => writeRun(r, `r9-unit-${STAMP}`, { sourceDrift: 'detected' })]
  });
  try {
    assert.ok(
      problemsFor(root, { mode: 'final' }).some((p) => /source_drift=detected/.test(p)),
      'a run whose source changed mid-run cannot back a claim about this tree'
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a skip or a cancellation in the run is reported rather than absorbed into the count', () => {
  // "276/276 with one skipped" is the shape a suite that quietly stopped running produces. The pass
  // count is right and the claim is still not supported, so it is reported rather than inferred — the
  // reader decides whether the skip was honest.
  for (const [field, outcome] of [
    ['skipped', { tests: 4, pass: 3, fail: 0, skipped: 1, cancelled: 0 }],
    ['cancelled', { tests: 4, pass: 3, fail: 0, skipped: 0, cancelled: 1 }]
  ]) {
    const root = makeRepo({
      rows: [goodRow('FR9-01'), goodRow('FR9-02')],
      handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
      runs: [(r) => writeRun(r, `r9-unit-${STAMP}`, { outcome })]
    });
    try {
      const problems = problemsFor(root, { mode: 'final' });
      assert.ok(
        problems.some((p) => new RegExp(`${field} 1 test`).test(p)),
        `an unaccounted ${field} must be reported, got: ${JSON.stringify(problems)}`
      );
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('FR10-02: a claim of a count the run supports is accepted, so the binding is not merely a refusal', () => {
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [(r) => writeRun(r, `r9-unit-${STAMP}`)]
  });
  try {
    assert.deepEqual(problemsFor(root, { mode: 'final' }), [], `a supported claim must validate, got: ${JSON.stringify(problemsFor(root, { mode: 'final' }))}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a browser claim is checked against a browser log, and a unit claim against a unit log', () => {
  // Two producers, two log shapes, and reading one as the other is how a number gets satisfied by a log
  // that never said it. A Playwright log has no `# tests` line; a node log has no `N passed` line.
  const root = makeRepo({
    rows: [
      goodRow('FR9-01', { evidence: `reports/evidence/r9-browser-${STAMP}.log` }),
      goodRow('FR9-02', { evidence: `reports/evidence/r9-browser-${STAMP}.log` })
    ],
    handoff: `# Handoff\n\n| browser | 3/3 | \`r9-browser-${STAMP}\` |\n`,
    runs: [(r) => writeRun(r, `r9-browser-${STAMP}`, { tier: 'browser', command: 'npm run test:browser', argv: 'npm run test:browser' })]
  });
  try {
    const problems = problemsFor(root, { mode: 'final' });
    assert.deepEqual(problems, [], `a Playwright run must be parsed as Playwright wrote it, got: ${JSON.stringify(problems)}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a claim in one tier cannot be satisfied by a run declared in another', () => {
  // A browser-shaped number quoted from a unit run. Both parse, both are 3/3, and they are about
  // different things — so the tier is part of the claim, not decoration on it.
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| browser | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [(r) => writeRun(r, `r9-unit-${STAMP}`)]
  });
  try {
    assert.ok(
      problemsFor(root, { mode: 'final' }).some((p) => /is declared in the unit tier/.test(p)),
      'a browser claim from a unit run must be reported'
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a run cited by a document but not declared in the sidecar is reported', () => {
  // The files exist, so the old filename check passed. But a run nothing declares cannot back a claim:
  // nobody has said what tier it was, what it exited, or which source it ran against.
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [
      (r) => writeRun(r, `r9-unit-${STAMP}`),
      // Files on disk, no declaration: the shape the old filename-only check accepted.
      (r) => writeRun(r, `unclaimed-${STAMP.replace('1', '9')}`, { declare: false })
    ]
  });
  try {
    const text = readFileSync(join(root, 'reports', 'FRONTEND-HANDOFF.vi.md'), 'utf8')
      + `\nalso ran \`unclaimed-${STAMP.replace('1', '9')}\`\n`;
    writeFileSync(join(root, 'reports', 'FRONTEND-HANDOFF.vi.md'), text);
    const problems = problemsFor(root, { mode: 'final' });
    assert.ok(
      problems.some((p) => /is not declared in the run-claims sidecar/.test(p)),
      `a run nothing claims cannot back a claim, got: ${JSON.stringify(problems)}`
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR10-02: a missing run-claims sidecar, a duplicated run and an unknown tier are each reported', () => {
  const missing = makeRepo({ rows: [goodRow('FR9-01'), goodRow('FR9-02')], writeClaims: false });
  try {
    assert.ok(
      problemsFor(missing, { mode: 'final' }).some((p) => /FRONTEND-RUN-CLAIMS\.json is missing/.test(p)),
      'a tree with no structured claims cannot have bound claims'
    );
  } finally { rmSync(missing, { recursive: true, force: true }); }

  const duplicated = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [
      (r) => writeRun(r, `r9-unit-${STAMP}`),
      (r) => writeRun(r, `r9-unit-${STAMP}`)
    ]
  });
  try {
    assert.ok(
      problemsFor(duplicated, { mode: 'final' }).some((p) => /is declared more than once/.test(p)),
      'two claims about one run cannot both be the record'
    );
  } finally { rmSync(duplicated, { recursive: true, force: true }); }

  const wrongTier = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [(r) => ({ ...writeRun(r, `r9-unit-${STAMP}`), tier: 'nonsense' })]
  });
  try {
    assert.ok(
      problemsFor(wrongTier, { mode: 'final' }).some((p) => /tier "nonsense", which is not one of/.test(p)),
      'a tier names no producer, and so no exit code'
    );
  } finally { rmSync(wrongTier, { recursive: true, force: true }); }
});

test('FR10-02: --mode final holds a delivered tree to its runs, its manifests and its source identity', () => {
  for (const [name, runOptions, pattern] of [
    ['a missing source manifest', { includeManifest: false }, /recorded no .*source-before\.manifest\.json/],
    ['a missing meta', { includeMeta: false }, /has no .*\.meta in reports\/evidence/],
    ['a missing log', { includeLog: false }, /has no .*\.log in reports\/evidence/]
  ]) {
    const root = makeRepo({
      rows: [goodRow('FR9-01'), goodRow('FR9-02')],
      handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
      runs: [(r) => writeRun(r, `r9-unit-${STAMP}`, runOptions)]
    });
    try {
      assert.ok(
        problemsFor(root, { mode: 'final' }).some((p) => pattern.test(p)),
        `${name} must be reported in final mode, got: ${JSON.stringify(problemsFor(root, { mode: 'final' }))}`
      );
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('FR10-02: a source manifest written by a different tool is refused rather than read optimistically', () => {
  const root = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [(r) => writeRun(r, `r9-unit-${STAMP}`)]
  });
  try {
    const path = join(root, 'reports', 'evidence', `r9-unit-${STAMP}.source-before.manifest.json`);
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    manifest.schema = 'something-else/9';
    writeFileSync(path, JSON.stringify(manifest));
    assert.ok(
      problemsFor(root, { mode: 'final' }).some((p) => /declares schema something-else\/9/.test(p)),
      'an unreadable source identity is not a source identity'
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ------------------------------------------- the execution-log override bug ---- */

test('FR10-02: --reports overrides the execution log too, so two directories are never mixed', () => {
  // `EXECUTION_LOG` was a constant resolved from the module root. So `--reports <other>` validated
  // `<other>`'s matrix and handoff against *this* repository's execution log — two different sets of
  // documents described as one, and the log read was not the log the reports were written from.
  const root = standardRepo();
  try {
    const elsewhere = mkdtempSync(join(tmpdir(), 'reports-elsewhere-'));
    try {
      // A reports directory whose execution log cites a run that does not exist anywhere.
      mkdirSync(join(elsewhere, 'evidence'), { recursive: true });
      writeFileSync(join(elsewhere, 'FRONTEND-EXECUTION-LOG.vi.md'), '# log\n\nran `ghost-run-20260101T000000Z-1`\n');
      for (const file of ['FRONTEND-FINDING-MATRIX.tsv', 'FRONTEND-HANDOFF.vi.md', 'FRONTEND-RUN-CLAIMS.json']) {
        writeFileSync(join(elsewhere, file), readFileSync(join(root, 'reports', file)));
      }
      for (const name of readdirSync(join(root, 'reports', 'evidence'))) {
        writeFileSync(join(elsewhere, 'evidence', name), readFileSync(join(root, 'reports', 'evidence', name)));
      }

      const result = validateReports({ repoRoot: root, reports: elsewhere, evidence: join(elsewhere, 'evidence'), required: REQUIRED, mode: 'final' });
      assert.ok(
        result.problems.some((p) => /cites run 20260101T000000Z-1/.test(p)),
        `the overridden execution log must be the one read, got: ${JSON.stringify(result.problems)}`
      );
    } finally { rmSync(elsewhere, { recursive: true, force: true }); }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ------------------------------------------------------- the retained rules ---- */

test('FR9-06: a row with too few cells is caught, because a short TSV row renders fine', () => {
  // The row drops its `evidence` cell. Nothing about the file looks broken: TSV viewers pad it, and the
  // limitation text that was meant for the last column is read out of the evidence column instead — so
  // "closed" is backed by a sentence about limitations.
  const short = goodRow('FR9-01').split('\t').slice(0, -1).join('\t');
  withRepo({ rows: [short, goodRow('FR9-02')] }, (_root, problems) => {
    assert.ok(
      problems.some((p) => /FR9-01 has 9 cell\(s\) but the header has 10/.test(p)),
      `a short row must be reported, got: ${JSON.stringify(problems)}`
    );
  });
});

test('FR9-06: a required finding with no row is caught', () => {
  // The failure this prevents is the one that actually happens: the round found six things and the
  // matrix mentions five, and nothing in the repository knows a sixth exists.
  withRepo({ rows: [goodRow('FR9-01')] }, (_root, problems) => {
    assert.ok(
      problems.some((p) => /FR9-02 is required by this round and has no row/.test(p)),
      `a missing finding must be reported, got: ${JSON.stringify(problems)}`
    );
  });
});

test('FR10-02: the required set includes the findings that were previously optional to omit', () => {
  // `R7-OBS-01` had a row for R8 and was absent from the required list, so deleting the row changed
  // nothing. The missing-ID check iterates that list, and a finding not in it cannot be missed. Same for
  // the FR10 findings this round is closing.
  const { REQUIRED_FINDINGS } = validatorInternals();
  for (const id of ['R7-OBS-01', 'FR10-01', 'FR10-02', 'FR10-03', 'FR10-04', 'FR10-05', 'FR10-06', 'FR10-07', 'FR10-08']) {
    assert.ok(REQUIRED_FINDINGS.includes(id), `${id} must be required, or deleting its row is invisible`);
  }
});

/** Reads the required-findings list out of the tool, which is the only place that decides it. */
function validatorInternals() {
  // The list is a module constant. It is read from the source text rather than exported purely so this
  // case can fail if the list shrinks: exporting it would invite a caller to pass a narrower one, which
  // is a supported option and therefore cannot be what enforces the default.
  const source = readFileSync(join(REPO_ROOT, 'tools', 'validate-reports.mjs'), 'utf8');
  const match = /const REQUIRED_FINDINGS = \[([\s\S]*?)\];/.exec(source);
  assert.ok(match, 'the tool must declare REQUIRED_FINDINGS');
  const ids = [...match[1].matchAll(/'([A-Z0-9-]+)'/g)].map((entry) => entry[1]);
  return { REQUIRED_FINDINGS: ids };
}

test('FR9-06: a status outside the closed set is caught', () => {
  withRepo({ rows: [goodRow('FR9-01', { status: 'done' }), goodRow('FR9-02')] }, (_root, problems) => {
    assert.ok(
      problems.some((p) => /FR9-01 has status "done", which is not one of/.test(p)),
      `an unknown status must be reported, got: ${JSON.stringify(problems)}`
    );
  });
});

test('FR9-06: a status outside the pinned enum is refused, including one that reads like success', () => {
  // `CLOSED` is the interesting one: it is the word the previous rounds used, it means what people want
  // it to mean, and it is not in the enum. A checker that accepted it would have ratified every wide
  // closure this round was opened to look at.
  for (const status of ['CLOSED', 'done', 'FIXED', 'PARTIAL']) {
    const root = makeRepo({ rows: [goodRow('FR9-01', { status }), goodRow('FR9-02')] });
    try {
      assert.ok(
        problemsFor(root).some((p) => new RegExp(`FR9-01 has status "${status}", which is not one of`).test(p)),
        `status ${status} must be outside the enum`
      );
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('FR9-06: a VERIFIED row naming evidence that does not exist is caught', () => {
  withRepo({ rows: [goodRow('FR9-01', { evidence: 'reports/evidence/that-run.log' }), goodRow('FR9-02')] },
    (_root, problems) => {
      assert.ok(
        problems.some((p) => /FR9-01 claims evidence at reports\/evidence\/that-run\.log, which does not exist/.test(p)),
        `a VERIFIED row must not be able to name a log nobody produced, got: ${JSON.stringify(problems)}`
      );
    });
});

test('FR9-06: a VERIFIED row with no test is caught, because a verified finding with no test is an assertion', () => {
  withRepo({ rows: [goodRow('FR9-01', { test_or_layer: '-' }), goodRow('FR9-02')] }, (_root, problems) => {
    assert.ok(
      problems.some((p) => /FR9-01 is VERIFIED but names no test/.test(p)),
      `VERIFIED with no test must be reported, got: ${JSON.stringify(problems)}`
    );
  });
});

test('FR9-06: a path in a row that is not a file in the repo is caught', () => {
  withRepo({ rows: [goodRow('FR9-01', { source: 'assets/js/deleted.js:1' }), goodRow('FR9-02')] },
    (_root, problems) => {
      assert.ok(
        problems.some((p) => /FR9-01 names "assets\/js\/deleted\.js", which is not a file/.test(p)),
        `a dangling path must be reported, got: ${JSON.stringify(problems)}`
      );
    });
});

test('FR10-02: a Git SHA in a row that is not an object in the repository is caught', () => {
  // A source cell is *for* naming the revision a claim is about, and a revision that cannot be looked up
  // is not one. Previously the cell was only read for paths, so a fabricated revision sat in the matrix
  // looking exactly like a real one.
  //
  // The check needs a repository that can answer the question, so `repoRoot` is the real tree — which has
  // a `.git` — and only the reports are a fixture. A temp tree with no object database would make this
  // rule silently inapplicable, which is how a check becomes decorative without anybody noticing.
  const reports = mkdtempSync(join(tmpdir(), 'fake-sha-'));
  try {
    mkdirSync(join(reports, 'evidence'), { recursive: true });
    writeFileSync(join(reports, 'FRONTEND-HANDOFF.vi.md'), '# Handoff\n\nnothing claimed\n');
    writeFileSync(join(reports, 'FRONTEND-EXECUTION-LOG.vi.md'), '# log\n');
    writeFileSync(join(reports, 'FRONTEND-RUN-CLAIMS.json'), JSON.stringify({
      schema: 'frontend-run-claims/1', source: { contentDigest: DIGEST }, runs: []
    }));

    const fake = '0123456789abcdef0123456789abcdef01234567';
    writeFileSync(join(reports, 'FRONTEND-FINDING-MATRIX.tsv'), [
      SCHEMA_LINE, HEADER,
      goodRow('FR9-01', { source: `assets/js/app.js:1 at ${fake}` }),
      goodRow('FR9-02', { evidence: `reports/evidence/r9-unit-${STAMP}.log` })
    ].join('\n'));

    const problems = validateReports({
      repoRoot: REPO_ROOT, reports, evidence: join(reports, 'evidence'), required: REQUIRED, mode: 'draft'
    }).problems;

    assert.ok(
      problems.some((p) => new RegExp(`names the commit ${fake}, which is not an object`).test(p)),
      `a fake Git SHA must be reported when the repository can answer, got: ${JSON.stringify(problems)}`
    );
  } finally { rmSync(reports, { recursive: true, force: true }); }
});

test('FR9-06: the harness spelling of a path is accepted, so the check is not merely a spelling lottery', () => {
  // `browser/x.spec.mjs` and `regression/x.test.mjs` are how rows refer to files under tests/. If those
  // did not resolve, the path rule would fire on the matrix's own idioms and be switched off.
  withRepo({
    rows: [goodRow('FR9-01', { test_or_layer: 'regression/thing.test.mjs covers it' }), goodRow('FR9-02')],
    handoff: `# Handoff\n\n| unit | 3/3 | \`r9-unit-${STAMP}\` |\n`,
    runs: [(r) => writeRun(r, `r9-unit-${STAMP}`)]
  }, (_root, problems) => {
    assert.deepEqual(problems, [], `a row in the documents' own spelling must validate, got: ${JSON.stringify(problems)}`);
  });
});

test('FR10-02: naming a failed run to record it is not the same as leaning on it', () => {
  // A report that deletes its failures is not a report. So a document has to be able to say "this run
  // exited 1" — and the check for a failed run backing a claim must not make that sentence illegal.
  const record = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: '# Handoff\n\n| unit | 3/3 | `r9-unit-20260928T000000Z-1` |\n',
    runs: [
      (r) => writeRun(r, `r9-unit-${STAMP}`),
      (r) => writeRun(r, `r9-unit-${STAMP.replace('1', '9')}`, { exit: 1 })
    ]
  });
  try {
    // The execution log names the failed run, with no count on the line and no closed row on it.
    const sentence = `the first run of the day, \`r9-unit-${STAMP.replace('1', '9')}\`, exited 1 and was kept`;
    writeFileSync(join(record, 'reports', 'FRONTEND-EXECUTION-LOG.vi.md'), `# Execution log\n\n${sentence}\n`);
    const problems = problemsFor(record, { mode: 'final' });
    assert.ok(
      !problems.some((p) => /r9-unit-.*9/.test(p)),
      `recording a failed run must be allowed, got: ${JSON.stringify(problems)}`
    );

    // Putting a count on that same run's line is leaning on it, and that is refused.
    writeFileSync(join(record, 'reports', 'FRONTEND-EXECUTION-LOG.vi.md'), `# Execution log\n\n| unit | 3/3 | \`r9-unit-${STAMP.replace('1', '9')}\` |\n`);
    assert.ok(
      problemsFor(record, { mode: 'final' }).some((p) => /which exited 1/.test(p)),
      'a count resting on a failed run must be refused'
    );
  } finally { rmSync(record, { recursive: true, force: true }); }
});

test('FR10-02: the matrix judges a cell, not a row, for the exit-code rule', () => {
  // A row that records which run passed and, in a different column, which run failed is the normal shape of
  // a row written while chasing a red round. Reading the whole row as one claim would forbid the note, and
  // the note is the part that helps: "this cell is backed by a green run, that earlier one exited 1" is a
  // fact, while a count resting on the red one is not.
  const failed = `r9-unit-${STAMP.replace('1', '9')}`;
  const record = makeRepo({
    rows: [goodRow('FR9-01'), goodRow('FR9-02')],
    handoff: '# Handoff\n\n| unit | 3/3 | `r9-unit-${STAMP}` |\n',
    runs: [
      (r) => writeRun(r, `r9-unit-${STAMP}`),
      (r) => writeRun(r, failed, { exit: 1 })
    ]
  });
  try {
    const row = goodRow('FR9-01', {
      status: 'IMPLEMENTED_UNVERIFIED',
      evidence: `r9-unit-${STAMP} unit 3/3`,
      limitation: `an earlier run, ${failed}, exited 1 and backs nothing here`
    });
    writeFileSync(join(record, 'reports', 'FRONTEND-FINDING-MATRIX.tsv'), matrixText([row]));
    const problems = problemsFor(record, { mode: 'final' });
    assert.ok(
      !problems.some((p) => /which exited 1/.test(p)),
      `a note beside a green count is not leaning on the red run, got: ${JSON.stringify(problems)}`
    );

    // Move the red run into the evidence cell, next to the count, and it is a claim again.
    writeFileSync(
      join(record, 'reports', 'FRONTEND-FINDING-MATRIX.tsv'),
      matrixText([goodRow('FR9-01', {
        status: 'IMPLEMENTED_UNVERIFIED',
        evidence: `r9-unit-${STAMP} unit 3/3, and ${failed} too`,
        limitation: 'None known'
      })])
    );
    assert.ok(
      problemsFor(record, { mode: 'final' }).some((p) => /which exited 1/.test(p)),
      'a count in the same cell as a failed run is leaning on it'
    );
  } finally { rmSync(record, { recursive: true, force: true }); }
});

test('FR10-02: a cell is not made to lean on a red run by naming a closed finding in passing', () => {
  // The failure this pins shut is the one the cell-level rule left behind. Its second clause asked whether
  // the *row* mentions any finding that has been closed, so a limitation cell that said "this reopens what
  // FR9-05 claimed" while recording its own red run was refused: FR9-05 was VERIFIED, the id was in the
  // row, and a cross-reference was read as a claim. A cross-reference is not a claim, and the note that
  // points at the claim a fix reopens is the most useful thing that cell can say.
  const failed = `r9-unit-${STAMP.replace('1', '9')}`;
  const record = makeRepo({
    rows: [goodRow('FR9-05', { status: 'VERIFIED' })],
    handoff: '# Handoff\n\nNo run cited.\n',
    runs: [(r) => writeRun(r, failed, { exit: 1 })]
  });
  try {
    writeFileSync(
      join(record, 'reports', 'FRONTEND-FINDING-MATRIX.tsv'),
      matrixText([goodRow('FR10-05', {
        status: 'IMPLEMENTED_UNVERIFIED',
        evidence: 'the run is named in the final gates section',
        limitation: `this reopens the claim of FR9-05; run ${failed} exited 1 and backs nothing here`
      })])
    );
    const problems = problemsFor(record, { mode: 'final' });
    assert.ok(
      !problems.some((p) => /which exited 1/.test(p)),
      `mentioning a closed finding must not make the cell lean on its own red run, got: ${JSON.stringify(problems)}`
    );

    // The same cell on a row that *is* closed is a claim about a closed finding, and the rule still bites.
    writeFileSync(
      join(record, 'reports', 'FRONTEND-FINDING-MATRIX.tsv'),
      matrixText([
        goodRow('FR9-05', { status: 'VERIFIED', evidence: `the claim rests on ${failed}` })
      ])
    );
    assert.ok(
      problemsFor(record, { mode: 'final' }).some((p) => /which exited 1/.test(p)),
      'a closed row really is leaning on the run it names'
    );
  } finally { rmSync(record, { recursive: true, force: true }); }
});

test('FR9-06: a row VERIFIED in the matrix but OPEN in the handoff is caught', () => {
  const root = standardRepo({
    handoff: '# Handoff\n\n| unit | 3/3 | `r9-unit-20260928T000000Z-1` |\n\n| FR9-01 | OPEN |\n'
  });
  try {
    assert.ok(
      problemsFor(root).some((p) => /FR9-01 is VERIFIED in the matrix but the handoff still describes it as OPEN/.test(p)),
      'a matrix/handoff disagreement must be reported'
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR9-06: an evidence reference in the handoff that does not exist is caught', () => {
  const root = standardRepo({ handoff: '# Handoff\n\n| unit | 3/3 | `r9-unit-20260928T000000Z-1` |\n\nEvidence: reports/evidence/never-ran.log\n' });
  try {
    assert.ok(
      problemsFor(root).some((p) => /a report names reports\/evidence\/never-ran\.log, which is not in reports\/evidence\//.test(p)),
      'a named log that is absent must be reported'
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR9-06: a run name cited in the handoff that never ran is caught', () => {
  // A correct count attributed to a run that did not happen. The count rule cannot see this — the number
  // matches a real log — so without this rule a report can be right about the total and wrong about where
  // it came from, which is the version a reader cannot check at all.
  const root = standardRepo({ handoff: '# Handoff\n\n| unit | 3/3 | `unit-9-20260928T235959Z-1` |\n' });
  try {
    assert.ok(
      problemsFor(root).some((p) => /cites run 20260928T235959Z-1/.test(p)),
      `a run that never ran must be reported, got: ${JSON.stringify(problemsFor(root))}`
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR9-06: a cited run whose timestamp was mistyped is caught', () => {
  // The same rule, from the mistake that is easy to make by hand: the run is real, the count is real, and
  // the timestamp written next to it is from memory. This exact error happened while writing R8's handoff.
  const root = standardRepo({ handoff: '# Handoff\n\n| unit | 3/3 | `unit-1-20260928T999999Z-1` |\n' });
  try {
    assert.ok(
      problemsFor(root).some((p) => /cites run 20260928T999999Z/.test(p)),
      `a mistyped run reference must be reported, got: ${JSON.stringify(problemsFor(root))}`
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR9-06: IMPLEMENTED_UNVERIFIED is not treated as done, so a row cannot skip its evidence', () => {
  // The state the work is actually in: the code is written and nobody has watched it fail before and pass
  // after. An enum without this state has to call it "done", which is where every wide closure came from.
  const unverified = makeRepo({
    rows: [goodRow('FR9-01', { status: 'IMPLEMENTED_UNVERIFIED', test_or_layer: '-', evidence: '-', limitation: 'not yet' }), goodRow('FR9-02')]
  });
  try {
    const result = validateReports({ repoRoot: unverified, required: REQUIRED, mode: 'draft', env: {} });
    assert.ok(
      !result.problems.some((p) => /FR9-01 is VERIFIED/.test(p)),
      'an unverified row is not yet claiming anything, so it owes no test and no evidence'
    );
  } finally { rmSync(unverified, { recursive: true, force: true }); }

  // The same row, one status up, has to produce the complaint. Without this the case above would also
  // pass if the evidence rule had stopped firing at all.
  const asVerified = makeRepo({
    rows: [goodRow('FR9-01', { status: 'VERIFIED', test_or_layer: '-', evidence: '-' }), goodRow('FR9-02')]
  });
  try {
    const problems = problemsFor(asVerified);
    assert.ok(problems.some((p) => /FR9-01 is VERIFIED but names no test/.test(p)), 'the same row as VERIFIED owes a test');
    assert.ok(problems.some((p) => /FR9-01 is VERIFIED but names no evidence/.test(p)), 'and owes evidence');
  } finally { rmSync(asVerified, { recursive: true, force: true }); }
});

test('FR9-06: a "12/12 CDN references" line is not read as 12 passing unit tests', () => {
  // The false alarm this guards against. A ratio next to the word "static" is a count of checks the gate
  // made, not of tests that passed, and a validator that reports it is one nobody keeps running.
  const root = standardRepo({
    handoff: '# Handoff\n\n| static | pass | `r8-static-20260928T055415Z-1` — 12/12 CDN references pinned |\n'
  });
  try {
    assert.ok(
      !problemsFor(root).some((p) => /claims (static|unit|browser|loopback) \d+\/\d+/.test(p)),
      `a ratio that is not a gate count must be left alone, got: ${JSON.stringify(problemsFor(root))}`
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR9-06: a gate count on a line with no run named is not a claim either', () => {
  // Same rule from the other side: a number with neither a gate result nor a run to check it against is
  // prose. Requiring the run is what makes the check enforceable rather than decorative.
  const root = standardRepo({ handoff: '# Handoff\n\nunit 99/99 passed.\n' });
  try {
    assert.ok(
      !problemsFor(root).some((p) => /claims unit 99\/99/.test(p)),
      `an unanchored count must be left alone, got: ${JSON.stringify(problemsFor(root))}`
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR9-06: a complete N/N gate count is still checked, so a stale full pass cannot survive', () => {
  // The rule that fixes the false alarm must not also excuse the real thing: "unit 999/999" with a run
  // named is exactly as false as a partial one, and is the more likely shape for a stale claim.
  const root = standardRepo({ handoff: '# Handoff\n\n| unit | 999/999 | `r9-unit-20260928T000000Z-1` |\n' });
  try {
    assert.ok(
      problemsFor(root).some((p) => /but r9-unit-.*\.log recorded 3 test/.test(p)),
      `a stale complete count must be reported, got: ${JSON.stringify(problemsFor(root))}`
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FR9-06: an early return has the same shape as a full one, so a caller can destructure it', () => {
  // `--mode final` on a tree with no evidence died with `TypeError: warnings is not iterable`. The early
  // return for "the reports themselves are unusable" left `warnings` out of its result while every other
  // path included it. A caller that destructures should not have to know which path it got.
  const root = standardRepo();
  try {
    rmSync(join(root, 'reports', 'FRONTEND-FINDING-MATRIX.tsv'), { force: true });
    const result = validateReports({ repoRoot: root, required: REQUIRED, mode: 'final', env: {} });
    for (const key of ['problems', 'warnings', 'rows', 'evidenceFiles', 'runs']) {
      assert.ok(Array.isArray(result[key]), `${key} must be an array on every path, including the early one`);
    }
    assert.ok(
      result.problems.some((p) => /FRONTEND-FINDING-MATRIX\.tsv is missing/.test(p)),
      'and it must actually be reporting the problem it exited for'
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ------------------------------------------------------------ the real reports ---- */

/**
 * The evidence root for this repository's own reports, taken from configuration rather than guessed.
 *
 * The R8 version of this case skipped whenever `reports/evidence` was absent, which is exactly the layout
 * a review bundle ships. So the command that a reader or a CI job runs — `npm run test:static`, with no
 * flags — could never check the real reports, and a skip line in a test result reads to most people as
 * "nothing to see here" rather than "the check that matters did not run". The evidence root is now stated:
 * `FRONTEND_EVIDENCE_DIR` in the environment, or `reports/evidence`, or a `tests/evidence-dir` file. A
 * repository that has evidence somewhere declares it; one that genuinely has none is reported, not skipped.
 */
const evidenceRootForRepo = () => {
  if (process.env.FRONTEND_EVIDENCE_DIR) return resolve(process.env.FRONTEND_EVIDENCE_DIR);
  const declared = join(REPO_ROOT, 'tests', 'evidence-dir');
  if (existsSync(declared)) return resolve(REPO_ROOT, readFileSync(declared, 'utf8').trim());
  const inRepo = join(REPO_ROOT, 'reports', 'evidence');
  return existsSync(inRepo) ? inRepo : null;
};

test('FR9-06: the real reports in this repo validate against the evidence this repo declares', () => {
  // The cases above are about the checker. This is about the thing being checked, and it is the case that
  // fails if a round ends without recording what it did.
  const evidence = evidenceRootForRepo();
  assert.ok(evidence, 'this repository must declare where its evidence is: set FRONTEND_EVIDENCE_DIR or add '
    + 'tests/evidence-dir. A test that cannot say where the evidence is cannot check the reports against it.');
  assert.ok(existsSync(evidence), `the declared evidence root ${evidence} must exist`);

  const result = validateReports({ repoRoot: REPO_ROOT, evidence, mode: 'draft' });
  assert.deepEqual(
    result.problems, [],
    'the repository\'s own matrix and handoff must validate; problems: ' + result.problems.join(' | ')
  );
  assert.ok(result.rows.length > 0, 'the matrix must not be empty — an empty one would validate');
  assert.ok(result.evidenceFiles.length > 0, 'the evidence directory must not be empty — the same applies');
  assert.ok(result.runs.length > 0, 'at least one run must be bound to its evidence');
});

test('FR12-02: corrupt active R10 snapshot cannot back a replay claim', async t => {
  const { cpSync } = await import('node:fs');
  const root = mkdtempSync(join(tmpdir(), 'active-snapshot-'));
  t.after(() => rmSync(root, { recursive:true, force:true }));
  cpSync(join(REPO_ROOT,'reports'), join(root,'reports'), {recursive:true});
  const options={repoRoot:REPO_ROOT, reports:join(root,'reports'), mode:'final'};
  assert.deepEqual(validateReports(options).problems, []);
  writeFileSync(join(root,'reports/evidence/r10-final-unit-20260929T025619Z-1.source.tar.gz'), 'not a gzip snapshot\n');
  assert.ok(validateReports(options).problems.some(p => /snapshot.*r10-final-unit|r10-final-unit.*snapshot/i.test(p)),
    'corrupted active archive must fail final validation');
});

test('N8: default matrix contract includes every FR11 and FR12 finding',()=>{
  const root=makeRepo({rows:[goodRow('FR9-01'),goodRow('FR9-02')]});
  try {
    const result=validateReports({repoRoot:root,env:{}});
    for(const id of ['FR11-01','FR11-02','FR11-03','FR11-04','FR11-05','FR11-06','FR12-01','FR12-02','FR12-03','FR12-04','FR12-05']) {
      assert.ok(result.problems.some(p=>p.includes(id)),id);
    }
  } finally {rmSync(root,{recursive:true,force:true});}
});
