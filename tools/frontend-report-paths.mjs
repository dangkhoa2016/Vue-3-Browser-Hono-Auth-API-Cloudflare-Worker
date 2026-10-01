import { isAbsolute, join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** This tool's own repo root, so a caller that names no repo still gets the repo the tool lives in. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * One answer to "where are the reports and the evidence", for the validator, the run-claims generator,
 * the execution log and both gate wrappers.
 *
 * This module exists because four call sites had four answers and one of them was a lie (FR11-01). Each
 * derived the paths itself: two read no environment at all, so a reader who exported
 * `FRONTEND_EVIDENCE_DIR` for a package layout watched the tool confidently validate an empty evidence
 * directory and report "every claim backed"; and the wrappers hardcoded `${REPO_ROOT}/reports/evidence`
 * while accepting a relative `--out` verbatim, so pointing a gate at a package layout wrote evidence
 * somewhere the validator would never look and the run it produced was invisible to the thing that
 * checks runs.
 *
 * The precedence is fixed and total: **option, then environment, then default.** Each of the two paths is
 * resolved independently, and the result reports which layer supplied it, because a tool that silently
 * falls back to a default is a tool whose output cannot be traced to a configuration.
 *
 * Relative paths are resolved against the **repo root**, never against `process.cwd()`. That is the second
 * half of FR11-01 and the part that bit in practice: `npm --prefix tests run test:static` runs with a cwd
 * of `tests/`, so a relative `--evidence reports/evidence` resolved to `tests/reports/evidence` — a
 * directory the wrapper had just created, so the run "passed" against evidence it had itself invented.
 * Resolving against the repo root makes the same command mean the same thing from either directory, which
 * is the property the gates are supposed to have and did not.
 *
 * The default evidence directory is `<repo>/reports/evidence`, inside the reports directory, so a fresh
 * clone works with no environment at all and writes its evidence where the validator will look for it.
 */

/** The default reports directory for a repo, as an absolute path. */
export const defaultReportsDir = (repoRoot) => join(repoRoot, 'reports');

/** The default evidence directory for a repo, as an absolute path. */
export const defaultEvidenceDir = (repoRoot) => join(defaultReportsDir(repoRoot), 'evidence');

/**
 * Resolve one path through the fixed precedence.
 *
 * @param {object} input
 * @param {string} input.repoRoot            Absolute path to the repo; the anchor for relative paths.
 * @param {string|null} [input.option]        An explicit path, from a flag or an argument.
 * @param {string|undefined} [input.envValue] The value read from the environment.
 * @param {string} input.envName             The variable the environment value came from, for reporting.
 * @param {string} input.fallback            The default, used when neither option nor env supplies one.
 * @returns {{path: string, source: 'option'|'env'|'default'}}
 */
function resolveOne({ repoRoot, option, envValue, envName, fallback }) {
  if (typeof option === 'string' && option !== '') return { path: resolveAgainstRepo(repoRoot, option), source: 'option' };
  if (typeof envValue === 'string' && envValue !== '') {
    return { path: resolveAgainstRepo(repoRoot, envValue), source: 'env' };
  }
  return { path: resolveAgainstRepo(repoRoot, fallback), source: 'default' };
}

/**
 * A relative path is relative to the repo root, not to wherever the process happens to be.
 *
 * An absolute path is returned as it was given: a reader who points a gate at a directory outside the
 * source tree — the package layout this module exists to support — must not have that path rewritten.
 */
const resolveAgainstRepo = (repoRoot, value) => (isAbsolute(value) ? value : resolve(repoRoot, value));

/**
 * @param {object} [input]
 * @param {string} [input.repoRoot]  Defaults to this tool's own repo root.
 * @param {string|null} [input.reports]  Option layer: an explicit reports directory.
 * @param {string|null} [input.evidence] Option layer: an explicit evidence directory.
 * @param {object} [input.env]        Environment layer. Injectable so a test can state the environment it
 *                                    means instead of inheriting the one it happens to run in — a fixture
 *                                    validated against whatever the caller happened to export is a fixture
 *                                    validated against the wrong tree, which is exactly how the canonical
 *                                    gate went red while a plain `npm run` stayed green.
 * @returns {{reportsDir: string, evidenceDir: string, sources: {reports: string, evidence: string}}}
 */
export function resolveReportPaths({
  repoRoot = REPO_ROOT,
  reports = null,
  evidence = null,
  env = process.env
} = {}) {
  const resolvedReports = resolveOne({
    repoRoot,
    option: reports,
    envValue: env.FRONTEND_REPORTS_DIR,
    envName: 'FRONTEND_REPORTS_DIR',
    fallback: defaultReportsDir(repoRoot)
  });
  // The evidence default hangs off the *resolved* reports directory, not off the repo: a reader who moved
  // the reports to a package layout and said nothing about evidence means "put it beside the reports",
  // and a default that ignored the option and environment layers above it would quietly write evidence to
  // a different tree than the reports it is supposed to sit beside.
  const resolvedEvidence = resolveOne({
    repoRoot,
    option: evidence,
    envValue: env.FRONTEND_EVIDENCE_DIR,
    envName: 'FRONTEND_EVIDENCE_DIR',
    fallback: join(resolvedReports.path, 'evidence')
  });
  return {
    reportsDir: resolvedReports.path,
    evidenceDir: resolvedEvidence.path,
    sources: { reports: resolvedReports.source, evidence: resolvedEvidence.source }
  };
}
