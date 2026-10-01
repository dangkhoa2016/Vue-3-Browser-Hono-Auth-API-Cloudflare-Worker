import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  defaultEvidenceDir,
  defaultReportsDir,
  resolveReportPaths
} from '../../tools/frontend-report-paths.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** A path that stands for the repo, so assertions read as the repo-relative thing they mean. */
const shown = (root, absolute) => relative(root, absolute) || '.';

test('FR11-01: the resolver has one precedence, and it says which layer answered', () => {
  const inRepo = (root, paths) => ({
    reports: shown(root, paths.reportsDir),
    evidence: shown(root, paths.evidenceDir),
    sources: paths.sources
  });

  // With nothing configured, the defaults are the ones a fresh clone uses, and the evidence sits inside the
  // reports directory so a reader knows where to look for it.
  assert.deepEqual(inRepo(REPO_ROOT, resolveReportPaths({ repoRoot: REPO_ROOT, env: {} })), {
    reports: 'reports',
    evidence: join('reports', 'evidence'),
    sources: { reports: 'default', evidence: 'default' }
  });
  assert.equal(defaultReportsDir(REPO_ROOT), join(REPO_ROOT, 'reports'));
  assert.equal(defaultEvidenceDir(REPO_ROOT), join(REPO_ROOT, 'reports', 'evidence'));

  // The precedence is total and ordered: option, then environment, then default. Each of the two paths is
  // resolved independently, so pointing one of them at a package layout does not drag the other along.
  assert.deepEqual(
    inRepo(REPO_ROOT, resolveReportPaths({ repoRoot: REPO_ROOT, evidence: 'from-option', env: { FRONTEND_EVIDENCE_DIR: 'from-env' } })),
    { reports: 'reports', evidence: 'from-option', sources: { reports: 'default', evidence: 'option' } }
  );
  assert.deepEqual(
    inRepo(REPO_ROOT, resolveReportPaths({ repoRoot: REPO_ROOT, env: { FRONTEND_EVIDENCE_DIR: 'from-env' } })),
    { reports: 'reports', evidence: 'from-env', sources: { reports: 'default', evidence: 'env' } }
  );
  assert.deepEqual(
    resolveReportPaths({ repoRoot: REPO_ROOT, env: { FRONTEND_EVIDENCE_DIR: '' } }).sources,
    { reports: 'default', evidence: 'default' },
    'an empty variable is not a configuration, and must not silently become the empty path'
  );
});

test('FR11-01: a relative path is relative to the repo, not to the process', async (t) => {
  // This is the half that bit. `npm --prefix tests run test:static` runs with a cwd of `tests/`, so a
  // relative `--evidence reports/evidence` used to resolve to `tests/reports/evidence` — a directory the
  // wrapper had just created, so the run "passed" against evidence it had invented for itself.
  const original = process.cwd();
  const elsewhere = mkdtempSync(join(tmpdir(), 'reports-cwd-'));
  try {
    process.chdir(elsewhere);
    assert.equal(process.cwd(), resolve(elsewhere), 'the test really is running from somewhere else');

    const fromElsewhere = resolveReportPaths({ repoRoot: REPO_ROOT, evidence: 'reports/evidence', env: {} });
    const fromRepo = resolveReportPaths({ repoRoot: REPO_ROOT, evidence: 'reports/evidence', env: {} });
    assert.equal(fromElsewhere.evidenceDir, fromRepo.evidenceDir);
    assert.equal(fromElsewhere.evidenceDir, join(REPO_ROOT, 'reports', 'evidence'),
      'the same argument means the same thing whatever the caller\'s working directory is');
  } finally {
    process.chdir(original);
    rmSync(elsewhere, { recursive: true, force: true });
  }

  // And from inside tests/, which is the case that actually occurs.
  process.chdir(join(REPO_ROOT, 'tests'));
  try {
    assert.equal(resolveReportPaths({ repoRoot: REPO_ROOT, evidence: 'reports/evidence', env: {} }).evidenceDir,
      join(REPO_ROOT, 'reports', 'evidence'),
      'run from tests/ the evidence is the repo\'s evidence, not a new directory under tests/');
  } finally {
    process.chdir(original);
  }
});

test('FR11-01: an absolute path is left alone, because a package layout lives outside the tree', () => {
  // The reason this module exists: a reader who points a gate at a review bundle's layout must not have
  // that path rewritten into the source tree, where it would be silently excluded from the source digest.
  const outside = mkdtempSync(join(tmpdir(), 'reports-outside-'));
  try {
    const paths = resolveReportPaths({ repoRoot: REPO_ROOT, evidence: outside, env: {} });
    assert.equal(paths.evidenceDir, resolve(outside), 'the absolute path is used as given');
    assert.equal(paths.sources.evidence, 'option');
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test('FR11-01: moving the reports moves the evidence with them, unless evidence is named', () => {
  // A reader who set only FRONTEND_REPORTS_DIR means "put the evidence beside the reports". A default that
  // ignored the layers above it would write evidence to the source tree while the reports it describes sat
  // somewhere else — the two halves of one record, in two trees.
  const moved = resolveReportPaths({ repoRoot: REPO_ROOT, env: { FRONTEND_REPORTS_DIR: '/pkg/reports' } });
  assert.equal(moved.reportsDir, '/pkg/reports');
  assert.equal(moved.evidenceDir, join('/pkg/reports', 'evidence'));
  assert.equal(moved.sources.evidence, 'default', 'it is still the default layer, and says so');

  const named = resolveReportPaths({
    repoRoot: REPO_ROOT,
    env: { FRONTEND_REPORTS_DIR: '/pkg/reports', FRONTEND_EVIDENCE_DIR: '/pkg/evidence' }
  });
  assert.equal(named.evidenceDir, '/pkg/evidence', 'and a named evidence directory is not overridden');
  assert.equal(named.sources.evidence, 'env');
});

test('FR11-01: the default is the environment, and it is injectable', () => {
  // Injectable so a test can state the environment it means. A fixture that inherited `process.env` was
  // how the canonical gate — which exports both variables — failed 35 cases that pass under plain npm:
  // 348 tests, 313 passing under the gate and 348 outside it, with identical code.
  const inherited = resolveReportPaths({ repoRoot: REPO_ROOT });
  assert.equal(inherited.evidenceDir, defaultEvidenceDir(REPO_ROOT),
    'with no env given the module reads the real environment, which is right for a real invocation');

  // The wrapper's own configuration resolves to the repo's evidence rather than somewhere a caller guessed.
  const configured = resolveReportPaths({
    repoRoot: REPO_ROOT,
    env: { FRONTEND_REPORTS_DIR: join(REPO_ROOT, 'reports'), FRONTEND_EVIDENCE_DIR: join(REPO_ROOT, 'reports', 'evidence') }
  });
  assert.equal(configured.evidenceDir, join(REPO_ROOT, 'reports', 'evidence'));
  assert.deepEqual(configured.sources, { reports: 'env', evidence: 'env' });
});
