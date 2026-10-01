#!/usr/bin/env bash
# run-frontend-gate.sh — evidence-preserving gate runner for the frontend remediation rounds.
#
# Contract enforced by this wrapper (see plan frontend-remediation-r7 Task1, amended by FR9-05):
#   * full stdout+stderr of the producer is kept in a log file;
#   * the producer's real exit code is propagated verbatim (exit 7 -> 7, nonzero stays nonzero);
#   * a timeout produces a nonzero exit, never a pass;
#   * a deadline <= 0 is rejected before anything runs;
#   * success -> exit 0;
#   * command, cwd, *content* source identity, start/end wall clock and exit are recorded as metadata;
#   * pipelines keep the producer exit (grep only reads the already-saved log);
#   * the source is captured before and after the producer, and a run whose source moved underneath it
#     is reported as INVALID_SOURCE_DRIFT even when the producer exited 0.
#
# Usage:
#   tools/run-frontend-gate.sh [--label NAME] [--timeout SECONDS] [--out DIR] [--cwd DIR] [--no-snapshot] -- <command> [args...]
#   tools/run-frontend-gate.sh --no-gate-install -- <command> ...   # skip the implicit install
#
# --cwd is where the producer runs. It defaults to the repository root; the project's own scripts live
# in tests/, and a gate that cannot run `npm run test:unit` is not a gate.
#
# Exit codes:
#   producer exit code when the producer runs to completion (0..255);
#   124 on deadline expiry; producer self-exit 124 remains result RAN;
#   3   when the source changed underneath the run (INVALID_SOURCE_DRIFT), or the identity could not be
#       taken. Only ever reported when the producer itself did not already fail.
#   2   on wrapper usage/argument error.
#
# The wrapper never kills processes it did not start.

set -o pipefail
set -u

SELF_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SELF_DIR}/.." && pwd)"
IDENTITY_TOOL="${REPO_ROOT}/tools/frontend-source-identity.mjs"

LABEL="gate"
TIMEOUT=""
# Where the evidence goes is not decided here. It used to be a constant, and the validator had its own
# answer, and the run-claims generator had a third — so a reader who pointed this at a package layout wrote
# evidence to a directory nothing would read, and the run that produced it was invisible to the thing that
# checks runs. The resolver is the single answer all four call sites use (FR11-01); this one contributes
# `--out` and inherits `FRONTEND_EVIDENCE_DIR`, and reports which layer won so the answer is traceable.
OUT_DIR=""
DO_INSTALL=1
DO_SNAPSHOT=1
GATE_INSTALL="tests/node_modules/.install-ok"
GATE_CWD=""

usage() {
  sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --label)    LABEL="${2:?--label needs a value}"; shift 2 ;;
    --timeout)  TIMEOUT="${2:?--timeout needs a value}"; shift 2 ;;
    --out)      OUT_DIR="${2:?--out needs a value}"; shift 2 ;;
    --cwd)      GATE_CWD="${2:?--cwd needs a value}"; shift 2 ;;

    --no-gate-install) DO_INSTALL=0; shift ;;
    --no-snapshot)     DO_SNAPSHOT=0; shift ;;
    -h|--help)  usage; exit 0 ;;
    --)         shift; break ;;
    *)          printf 'run-frontend-gate: unknown option %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ "$#" -eq 0 ]; then
  printf 'run-frontend-gate: no command given\n' >&2
  usage >&2
  exit 2
fi

# --- ask the shared resolver where the evidence goes ------------------------
# One answer, and it is reported rather than assumed. A gate that wrote to a directory it never named is
# how the previous layout lost a run; a gate that prints its own destination cannot do that quietly.
OUT_DIR="$(node --input-type=module -e "
  import { resolveReportPaths } from '${REPO_ROOT}/tools/frontend-report-paths.mjs';
  const r = resolveReportPaths({ repoRoot: '${REPO_ROOT}', evidence: process.argv[1] || null });
  process.stderr.write('run-frontend-gate: evidence directory ' + r.evidenceDir + ' (from ' + r.sources.evidence + ')\n');
  process.stdout.write(r.evidenceDir);
" "${OUT_DIR}")" || { printf 'run-frontend-gate: could not resolve the evidence directory\n' >&2; exit 2; }

# --- resolve the producer's working directory before running anything --------
if [ -n "${GATE_CWD}" ]; then
  if [ ! -d "${GATE_CWD}" ]; then
    printf 'run-frontend-gate: --cwd is not a directory: %s\n' "${GATE_CWD}" >&2
    exit 2
  fi
  GATE_CWD="$(cd -- "${GATE_CWD}" && pwd)"
else
  GATE_CWD="${REPO_ROOT}"
fi

# --- reject a non-positive deadline before running anything -------------------
if [ -n "${TIMEOUT}" ]; then
  case "${TIMEOUT}" in
    ''|*[!0-9]*) printf 'run-frontend-gate: --timeout must be a non-negative integer, got %s\n' "${TIMEOUT}" >&2; exit 2 ;;
  esac
  if ! node -e 'const n=Number(process.argv[1]);process.exit(Number.isSafeInteger(n)&&n>0&&n<=2147483?0:1)' "${TIMEOUT}"; then
    printf 'run-frontend-gate: rejected deadline %s (supported range 1..2147483 seconds); refusing to run\n' "${TIMEOUT}" >&2
    exit 2
  fi
fi

mkdir -p "${OUT_DIR}"

# --- stable, non-clobbering log name ----------------------------------------
# The name is *claimed* with mkdir, which is atomic and fails when the directory already exists. The
# obvious alternative — test for the file, then create it — is a check-then-write race, and two gates
# with the same label in the same second is exactly the case where evidence gets overwritten.
slug="$(printf '%s' "${LABEL}" | tr -c 'A-Za-z0-9._-' '-')"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
n=0
while :; do
  n=$((n + 1))
  BASE="${OUT_DIR}/${slug}-${STAMP}-${n}"
  if mkdir "${BASE}.run" 2>/dev/null; then
    if compgen -G "${BASE}.*" | rg -qv '\.run$'; then
      rmdir "${BASE}.run"
    else
      break
    fi
  fi
  if [ "$n" -gt 999 ]; then
    printf 'run-frontend-gate: could not claim a unique log name under %s\n' "${OUT_DIR}" >&2
    exit 2
  fi
done
LOG="${BASE}.log"
META="${BASE}.meta"
BEFORE="${BASE}.source-before.manifest.json"
AFTER="${BASE}.source-after.manifest.json"

# --- source identity ---------------------------------------------------------
# Content, not shape. `git status --porcelain` names the paths that differ and says nothing about what
# is in them, so hashing it left a red run and a green run of *different* source under one identity
# (FR9-05). The manifest below is a sorted list of path/mode/size/sha256 over everything the gates
# read, so an edit, an added file, a deleted file or a lost executable bit all move the digest, and
# `reports/evidence` is outside the policy so a run cannot invalidate the record it is writing.
source_identity() {
  local target="$1"
  local snapshot="${2:-}"
  if [ -n "${snapshot}" ]; then
    node "${IDENTITY_TOOL}" --repo "${REPO_ROOT}" --out "${target}" --snapshot "${snapshot}" --print-digest --quiet
  else
    node "${IDENTITY_TOOL}" --repo "${REPO_ROOT}" --out "${target}" --print-digest --quiet
  fi
}

SNAPSHOT_BEFORE=""
if [ "${DO_SNAPSHOT}" -eq 1 ]; then SNAPSHOT_BEFORE="${BASE}.source.tar.gz"; fi

if ! BEFORE_DIGEST="$(source_identity "${BEFORE}" "${SNAPSHOT_BEFORE:-}")"; then
  printf 'run-frontend-gate: could not take the source identity before the run; refusing to record a run with unknown source\n' >&2
  rmdir "${BASE}.run" 2>/dev/null || true
  exit 3
fi

# Metadata, kept as metadata. `base_tree` is the code *before* the working-tree delta, so it is labelled
# that way rather than as "source"; the tested tree is the content digest above.
GIT_STATE="$(printf 'branch=%s head=%s base_tree=%s status_sha256=%s' \
  "$(git -C "${REPO_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo NO-GIT)" \
  "$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo NO-GIT)" \
  "$(git -C "${REPO_ROOT}" rev-parse 'HEAD^{tree}' 2>/dev/null || echo NO-GIT)" \
  "$(git -C "${REPO_ROOT}" status --porcelain 2>/dev/null | sha256sum | cut -d' ' -f1)")"

{
  printf 'run-frontend-gate: evidence for one producer run\n'
  printf 'label:      %s\n' "${LABEL}"
  # The argv array, not a re-joined string: a command whose arguments contain a space is otherwise
  # unreadable and a run cannot be repeated from its own record.
  printf 'argv:       %s\n' "$(printf '%q ' "$@")"
  printf 'command:    %s\n' "$*"
  printf 'cwd:        %s\n' "${GATE_CWD}"
  printf 'repo_root:  %s\n' "${REPO_ROOT}"
  printf 'source_digest:      %s\n' "${BEFORE_DIGEST}"
  printf 'source_manifest:    %s\n' "${BEFORE}"
  if [ -n "${SNAPSHOT_BEFORE}" ]; then printf 'source_snapshot:    %s\n' "${SNAPSHOT_BEFORE}"; fi
  printf 'git:        %s\n' "${GIT_STATE}"
  printf 'timeout_s:  %s\n' "${TIMEOUT:-<none>}"
} > "${META}"

STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
{
  printf 'started_at: %s\n' "${STARTED}"
  printf 'node:       %s\n' "$(node --version 2>/dev/null || echo none)"
  printf 'npm:        %s\n' "$(npm --version 2>/dev/null || echo none)"
  printf 'git:        %s\n' "$(git --version 2>/dev/null || echo none)"
  printf 'os:         %s %s\n' "$(uname -s)" "$(uname -m)"
  printf -- '---- producer output below ----\n'
} >> "${META}"

# --- optional implicit dependency install (isolated, test-only manifest) -----
if [ "${DO_INSTALL}" -eq 1 ] && [ ! -e "${REPO_ROOT}/${GATE_INSTALL}" ]; then
  {
    printf '\n[run-frontend-gate] installing test-only dependencies from tests/package-lock.json\n'
    printf '[run-frontend-gate] $ npm --prefix tests ci --ignore-scripts --no-audit --no-fund\n'
  } >> "${LOG}"
  ( cd "${REPO_ROOT}" && npm --prefix tests ci --ignore-scripts --no-audit --no-fund ) >> "${LOG}" 2>&1
  inst_rc=$?
  printf '[run-frontend-gate] install exit: %s\n' "${inst_rc}" >> "${LOG}"
  if [ "${inst_rc}" -ne 0 ]; then
    ENDED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    { printf 'ended_at:   %s\n' "${ENDED}"
      printf 'exit:       %s\n' "${inst_rc}"
      printf 'result:     INSTALL_FAILED\n'
      printf 'log:        %s\n' "${LOG}"
    } >> "${META}"
    rmdir "${BASE}.run" 2>/dev/null || true
    printf 'run-frontend-gate: dependency install failed (exit %s); see %s\n' "${inst_rc}" "${LOG}" >&2
    exit "${inst_rc}"
  fi
  : > "${REPO_ROOT}/${GATE_INSTALL}"
fi

# --- run the producer, keeping its real exit code ---------------------------
printf '[run-frontend-gate] $ %s\n' "$(printf '%q ' "$@")" >> "${LOG}"
if [ -n "${TIMEOUT}" ]; then
  printf '[run-frontend-gate] (timeout %ss enforced)\n' "${TIMEOUT}" >> "${LOG}"
  ( cd "${GATE_CWD}" && node "${REPO_ROOT}/tools/frontend-gate-deadline.mjs" "${TIMEOUT}" "${BASE}.deadline" "$@" ) >> "${LOG}" 2>&1
  rc=$?
else
  ( cd "${GATE_CWD}" && "$@" ) >> "${LOG}" 2>&1
  rc=$?
fi

# --- did the source move underneath the run? --------------------------------
# A producer that edits its own source — or an editor, a generator, another gate in parallel — makes the
# result unattributable: the log says pass, and the tree it passed is not the tree on disk now. That is
# reported even when the producer exited 0, because "green" against unidentifiable source is the exact
# failure FR9-05 is about. A failing producer keeps its own exit, which is already nonzero.
AFTER_DIGEST="$(source_identity "${AFTER}" 2>/dev/null || echo 'UNAVAILABLE')"
if [ "${AFTER_DIGEST}" != "${BEFORE_DIGEST}" ]; then
  DRIFT="INVALID_SOURCE_DRIFT (before ${BEFORE_DIGEST} after ${AFTER_DIGEST})"
else
  DRIFT="none"
fi
[ "${rc}" -eq 0 ] && [ "${DRIFT}" != "none" ] && rc=3

ENDED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ -f "${BASE}.deadline" ]; then RESULT="TIMEOUT"; elif [ "${DRIFT}" != "none" ]; then RESULT="SOURCE_DRIFT"; else RESULT="RAN"; fi
{
  printf 'ended_at:   %s\n' "${ENDED}"
  printf 'exit:       %s\n' "${rc}"
  printf 'result:     %s\n' "${RESULT}"
  printf 'source_digest_after:  %s\n' "${AFTER_DIGEST}"
  printf 'source_manifest_after: %s\n' "${AFTER}"
  printf 'source_drift: %s\n' "${DRIFT}"
  printf 'log:        %s\n' "${LOG}"
} >> "${META}"
rmdir "${BASE}.run" 2>/dev/null || true

# The exit code is the producer's own; a failure is never normalised to zero.
exit "${rc}"
