#!/usr/bin/env bash
# run-browser-gate.sh — run the browser suite against a frozen copy of the work tree.
#
# Why: the browser suite is the long pole (tens of minutes), and it has to run against a source that
# cannot move while it runs. Editing the working tree in parallel is the normal way to spend that time,
# and `run-frontend-gate.sh` would — correctly — report INVALID_SOURCE_DRIFT for exactly that. So the
# browser gate runs in its own checkout: the source is synced in, the run is recorded there, and the
# evidence is copied back to the real reports directory with the identity that actually produced it.
#
# What FR10-07 changed, and why each part is where it is:
#
#   * The scratch directory is per-run (`browser-gate-env.mjs scratch-dir`), not a fixed path. The old
#     script deleted one shared worktree before every run, so two runs — which is the default, because the
#     path was a constant and not even an argument — destroyed each other's source. Cleanup goes through
#     `cleanup`, which refuses anything this script did not mint; there is no `rm -rf` of a caller-supplied
#     directory anywhere in this file.
#   * The install is verified, not assumed. The old script copied `node_modules`, wrote `.install-ok` with a
#     `:` redirect that creates the file regardless, and passed `--no-gate-install` so nothing could check
#     it — while the lockfile was hashed into the manifest, so the evidence could prove the lockfile was
#     present and say nothing about what was loaded. The install cache is now keyed by the lockfile, the
#     platform, the Node ABI, the Node version, the Playwright version and the browsers path, and a cache
#     stamped for anything else is refused rather than quietly replaced.
#   * The ports are this run's. Both defaults are conventional constants, so two runs — or a developer's own
#     server — collide. Ports are chosen free, exported to the producer, and recorded.
#   * The served root is checked. `fake-api.mjs` reports the root it serves, its static responses carry that
#     root and a hash of the bytes, and `served-source-identity.spec.mjs` compares both against the tree the
#     spec runs from. The wrapper also hands the producer the identity digest of the copy, so the run can
#     confirm it is testing the source the evidence names.
#
# Usage:
#   tools/run-browser-gate.sh [--label NAME] [--base DIR] [--keep-scratch] [-- extra playwright args]
#
# Environment:
#   FRONTEND_BROWSER_RUN_BASE        where run directories are created (default: the system temp dir)
#   FRONTEND_BROWSER_INSTALL_CACHE   where verified installs live (default: ~/.cache/frontend-browser-install)
#   FRONTEND_BROWSER_SCRATCH_BASE    accepted as an alias of FRONTEND_BROWSER_RUN_BASE

set -uo pipefail

SELF_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SELF_DIR}/.." && pwd)"
ENV_TOOL="${REPO_ROOT}/tools/browser-gate-env.mjs"
IDENTITY_TOOL="${REPO_ROOT}/tools/frontend-source-identity.mjs"

LABEL="browser"
KEEP_SCRATCH=0
RUN_BASE="${FRONTEND_BROWSER_RUN_BASE:-${FRONTEND_BROWSER_SCRATCH_BASE:-${TMPDIR:-/tmp}}}"
INSTALL_CACHE="${FRONTEND_BROWSER_INSTALL_CACHE:-${XDG_CACHE_HOME:-${HOME}/.cache}/frontend-browser-install}"

while [ "${#}" -gt 0 ]; do
  case "$1" in
    --label) LABEL="${2:?--label needs a value}"; shift 2 ;;
    --base) RUN_BASE="${2:?--base needs a value}"; shift 2 ;;
    --keep-scratch) KEEP_SCRATCH=1; shift ;;
    --) shift; break ;;
    *) break ;;
  esac
done

log () { printf 'run-browser-gate: %s\n' "$1" >&2; }

if [ ! -f "${ENV_TOOL}" ]; then
  log "cannot find ${ENV_TOOL}"
  exit 2
fi

# --- a directory this run owns -------------------------------------------------------------------
# `mkdtempSync` under a base we never empty. Nothing in this script removes a path it did not create.
#
# RUN_DIR is the minted directory and stays that name for the whole script. SCRATCH is a subdirectory of
# it holding the copy, and it deliberately has a different basename: ownership is checked against the
# directory's name, so cleaning up "whatever SCRATCH currently points at" would hand `cleanup` a
# subdirectory called `worktree` and it would — correctly — refuse to delete the run's own files.
RUN_DIR="$(node "${ENV_TOOL}" scratch-dir "${RUN_BASE}")" || {
  log "could not create a run directory under ${RUN_BASE}"
  exit 2
}
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "run directory ${RUN_DIR}"

# A trap rather than a line at the end, so an interrupt, a `set -e` abort or a failed command still
# releases the directory — and still only this one.
release_scratch () {
  if [ "${KEEP_SCRATCH}" = "1" ]; then
    log "keeping ${SCRATCH}"
    return 0
  fi
  if node "${ENV_TOOL}" cleanup "${RUN_DIR}" "${RUN_BASE}" >/dev/null 2>&1; then
    log "removed ${RUN_DIR}"
  else
    # Not a failure of the run: refusing to delete is the correct behaviour, and saying so is better than
    # leaving a directory behind with no explanation.
    log "left ${RUN_DIR} in place: it is not a directory this script created"
  fi
}
trap release_scratch EXIT

# --- a verified install ----------------------------------------------------------------------------
# Keyed by the lockfile and the machine. An install for anything else is refused, not repaired: silently
# reinstalling would have the wrapper pick a dependency tree nobody asked for in a run whose evidence says
# the lockfile was honoured.
INSTALL_KEY="$(node "${ENV_TOOL}" install-key "${REPO_ROOT}")" || {
  log "could not key an install for this repository"
  exit 3
}
INSTALL_DIR="${INSTALL_CACHE}/${INSTALL_KEY}"

if ! node "${ENV_TOOL}" prepare-install "${INSTALL_DIR}" "${INSTALL_KEY}" "${REPO_ROOT}" >/dev/null; then
  log "no usable install for key ${INSTALL_KEY} under ${INSTALL_CACHE}; refusing to run"
  log "remove ${INSTALL_DIR} (or set FRONTEND_BROWSER_INSTALL_CACHE) and try again"
  exit 3
fi
log "install ${INSTALL_KEY} verified at ${INSTALL_DIR}"

# --- ports this run owns ---------------------------------------------------------------------------
# A free port is found by binding one and letting the OS choose, then closed; the window between closing
# it and the server binding it is small, and a collision surfaces as a webServer start-up timeout rather
# than as a run against somebody else's server.
pick_port () {
  node -e '
    const net = require("node:net");
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => { process.stdout.write(String(port)); });
    });
  '
}
STATIC_PORT="$(pick_port)"
API_PORT="$(pick_port)"
while [ "${API_PORT}" = "${STATIC_PORT}" ]; do API_PORT="$(pick_port)"; done

# --- the identity of the copy, before it is made ---------------------------------------------------
# Computed from the repository, not from the copy, because the two are the same tree at this point and the
# manifest the gate records inside the scratch would be the authority. Exporting it lets the browser suite
# check that what it is testing is what the evidence will name.
SERVED_DIGEST="$(node "${IDENTITY_TOOL}" --repo "${REPO_ROOT}" --print-digest --quiet \
  --out "${RUN_DIR}/.frontend-served-digest.manifest.json")" || {
  log "could not take the source identity of ${REPO_ROOT}"
  exit 3
}
rm -f "${RUN_DIR}/.frontend-served-digest.manifest.json"

# --- sync a frozen copy ---------------------------------------------------------------------------
# Everything the browser run reads, nothing it writes. `reports/evidence` is excluded so evidence
# accumulates in the real reports directory instead of being mirrored both ways.
SCRATCH="${RUN_DIR}/worktree"
mkdir -p "${SCRATCH}"
tar -C "${REPO_ROOT}" \
  --exclude=./.git --exclude=./tests/node_modules --exclude=./tests/test-results \
  --exclude=./tests/playwright-report --exclude=./reports/evidence \
  -cf - . | tar -C "${SCRATCH}" -xf - || { log "source copy failed"; exit 3; }

mkdir -p "${SCRATCH}/reports/evidence"
node "${ENV_TOOL}" copy-git "${REPO_ROOT}" "${SCRATCH}" || exit 3

# The verified install, copied rather than symlinked: a symlinked `node_modules` is a view of a directory
# another run may be using, and the whole point of the copy is that nothing can move under this run.
log "copying the verified install into the run directory"
cp -a "${INSTALL_DIR}/node_modules" "${SCRATCH}/tests/node_modules" || exit 3
# The manifest and lockfile come from the install cache rather than from the copy above, so the lockfile
# sitting next to this `node_modules` is provably the one the install was made from rather than merely a
# file with the same name.
cp -a "${INSTALL_DIR}/package.json" "${SCRATCH}/tests/package.json" || exit 3
cp -a "${INSTALL_DIR}/package-lock.json" "${SCRATCH}/tests/package-lock.json" || exit 3

# Recheck the actual copied dependency graph and source after the copy window.
cp -a "${INSTALL_DIR}/.install.json" "${SCRATCH}/tests/.install.json" || exit 3
node "${ENV_TOOL}" verify-install "${INSTALL_DIR}" "${INSTALL_KEY}" >/dev/null || exit 3
node "${ENV_TOOL}" verify-install "${SCRATCH}/tests" "${INSTALL_KEY}" >/dev/null || exit 3
[ "$(node "${ENV_TOOL}" install-key "${REPO_ROOT}")" = "${INSTALL_KEY}" ] || { log "lock/manifest drift during copy"; exit 3; }
COPIED_DIGEST="$(node "${IDENTITY_TOOL}" --repo "${SCRATCH}" --print-digest --quiet --out "${RUN_DIR}/copied.manifest.json")" || exit 3
AFTER_COPY_DIGEST="$(node "${IDENTITY_TOOL}" --repo "${REPO_ROOT}" --print-digest --quiet --out "${RUN_DIR}/after-copy.manifest.json")" || exit 3
[ "${COPIED_DIGEST}" = "${SERVED_DIGEST}" ] && [ "${AFTER_COPY_DIGEST}" = "${SERVED_DIGEST}" ] || { log "source drift during frozen copy"; exit 3; }

# --- run ---------------------------------------------------------------------------------------------
# No `--no-snapshot` here. The snapshot is what makes this evidence reconstructable, and the copy-back
# below expects one; a gate that recorded manifests but no content could not be replayed, which is the
# whole reason the content identity was built in the first place (FR9-05).
#
# `test:static` runs first, as a pre-flight in the *real* repository rather than in the copy. It includes
# `validate-reports.mjs`, and the copy deliberately has no `reports/evidence` — evidence accumulates in the
# real reports directory instead of being mirrored both ways — so running it there would have the validator
# reading a sidecar that declares forty runs whose `.meta` files it cannot see, and failing the pre-flight
# over a directory the copy was designed not to contain. The two trees are the same bytes (both come from
# the tar of the repository below, and the browser suite separately proves it is being served the one that
# was hashed), and the static gates are a recorded gate of their own.
set +e
(cd "${REPO_ROOT}/tests" && npm run test:static) >"${RUN_DIR}/static.log" 2>&1
STATIC_RC=$?
if [ "${STATIC_RC}" -ne 0 ]; then
  cat "${RUN_DIR}/static.log" >&2
  log "the static gates failed (exit ${STATIC_RC}); not starting the browser suite"
  exit "${STATIC_RC}"
fi
rm -f "${RUN_DIR}/static.log"

FRONTEND_STATIC_PORT="${STATIC_PORT}" \
FRONTEND_API_PORT="${API_PORT}" \
FRONTEND_SERVED_DIGEST="${SERVED_DIGEST}" \
bash "${SCRATCH}/tools/run-frontend-gate.sh" --label "${LABEL}" --cwd "${SCRATCH}/tests" \
  --no-gate-install -- npm run test:browser -- "$@"
RC=$?

# --- bring the evidence home -----------------------------------------------------------------------
# The metadata names the snapshot digest, so the record travels with the source it describes.
# Resolved by the shared module rather than hardcoded, so a run pointed at a package layout brings its
# evidence to the place the validator will look (FR11-01). This wrapper used a bare constant, which is how
# a run could be reported as successful while the reports directory kept none of it.
DEST="$(node --input-type=module -e "
  import { resolveReportPaths } from '${REPO_ROOT}/tools/frontend-report-paths.mjs';
  process.stdout.write(resolveReportPaths({ repoRoot: '${REPO_ROOT}' }).evidenceDir);
")" || { printf 'run-browser-gate: could not resolve the evidence directory\n' >&2; exit 2; }
mkdir -p "${DEST}"
# One glob per suffix, not two: an exact-name glob followed by a broad one matches the same file twice,
# and the duplicate would be copied again under a random name — two files claiming to be the same run,
# with only one of them named after the run.
for suffix in log meta source-before.manifest.json source-after.manifest.json source.tar.gz; do
  # The glob parts are deliberately unquoted. `"${LABEL}-*-1.${suffix}"` is one quoted word, so the `*`
  # would be a literal asterisk, the loop would run once with a name that does not exist, and the evidence
  # would stay in the scratch tree — a gate that reported success while the reports directory kept none
  # of it. The path prefix stays quoted so a run root with a space in it still works.
  for file in "${SCRATCH}/reports/evidence/${LABEL}"-*-1."${suffix}"; do
    [ -e "${file}" ] || continue
    base="$(basename "${file}")"
    target="${DEST}/browser-${base}"
    [ -e "${target}" ] && target="${DEST}/browser-${base%.${suffix}}-${RANDOM}.${suffix}"
    cp "${file}" "${target}"
  done
done

# The record of what this run was, next to the evidence it produced. Without it the ports and the served
# root exist only in this transcript, and a later reader cannot tell which of two runs on the same digest
# was which.
cat >"${DEST}/browser-${LABEL}-served.json" <<JSON
{
  "label": "${LABEL}",
  "sourceDigest": "${SERVED_DIGEST}",
  "staticPort": ${STATIC_PORT},
  "apiPort": ${API_PORT},
  "installKey": "${INSTALL_KEY}",
  "installCache": "${INSTALL_DIR}",
  "scratchBase": "${RUN_BASE}",
  "servedRoot": "${SCRATCH}",
  "startedAt": "${STARTED_AT:-}"
}
JSON

log "exit ${RC}; static ${STATIC_PORT}, api ${API_PORT}; evidence in ${DEST}"
exit "${RC}"
