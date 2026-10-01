#!/usr/bin/env bash
# run-frontend-gate-selftest.sh — the wrapper's own contract, checked by running it.
#
# A gate runner is evidence, so its behaviour is itself something that has to be demonstrated rather than
# asserted in a comment: the exit code it reports, the identity it records and the drift it detects are
# all claims a report can make wrongly. Every case below runs the real wrapper against a real (temporary)
# producer and reads the recorded metadata back.
#
# It is deliberately a shell script rather than a Node test: the wrapper is shell, and a Node test would
# only prove the Node side of it.

set -u

SELF_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SELF_DIR}/.." && pwd)"
WRAPPER="${REPO_ROOT}/tools/run-frontend-gate.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); printf 'ok   %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf 'FAIL %s\n' "$1"; }

# The wrapper resolves its repository from its own location, so these cases exercise a copy of the real
# tree rather than a mock: a mock would not catch the wrapper reading the wrong directory.
FIXTURE="${WORK}/repo"
mkdir -p "${FIXTURE}/tools" "${FIXTURE}/tests" "${FIXTURE}/assets"
cp "${WRAPPER}" "${FIXTURE}/tools/run-frontend-gate.sh"
for helper in frontend-source-identity.mjs frontend-snapshot-verify.mjs frontend-report-paths.mjs; do
  cp "${REPO_ROOT}/tools/${helper}" "${FIXTURE}/tools/${helper}"
done
if [ -f "${REPO_ROOT}/tools/frontend-gate-deadline.mjs" ]; then cp "${REPO_ROOT}/tools/frontend-gate-deadline.mjs" "${FIXTURE}/tools/"; fi
printf 'export const A = 1;\n' > "${FIXTURE}/assets/app.js"
printf '{ "name": "fixture" }\n'   > "${FIXTURE}/tests/package.json"
printf 'x\n'                       > "${FIXTURE}/tests/package-lock.json"
( cd "${FIXTURE}" && git init --quiet && git config user.email a@b.test && git config user.name a \
  && git add --all && git commit --quiet -m fixture )
# The install marker keeps the implicit `npm ci` out of these cases; the real install is its own gate run.
mkdir -p "${FIXTURE}/tests/node_modules" && : > "${FIXTURE}/tests/node_modules/.install-ok"

gate() { bash "${FIXTURE}/tools/run-frontend-gate.sh" --out "${WORK}/evidence" --no-gate-install "$@"; }

expect_exit() {
  local want="$1" got="$2" name="$3"
  if [ "${want}" = "${got}" ]; then ok "${name} (exit ${got})"; else bad "${name}: expected exit ${want}, got ${got}"; fi
}

expect_field() {
  local file="$1" key="$2" want="$3" name="$4"
  local got
  got="$(sed -n "s/^${key}: *//p" "${file}" | tail -n 1)"
  if [ "${got}" = "${want}" ]; then ok "${name}"; else bad "${name}: ${key} was '${got}', expected '${want}'"; fi
}

expect_match() {
  local file="$1" pattern="$2" name="$3"
  if grep -qE "${pattern}" "${file}"; then ok "${name}"; else bad "${name}: '${pattern}' not in ${file}"; fi
}

# --- 1. the producer's exit code is its own, not a normalised zero ------------
gate --label exit7 -- sh -c 'echo SHOULD_BE_IN_LOG; exit 7'; rc=$?
expect_exit 7 "${rc}" 'a producer that exits 7 is reported as 7'
LAST="$(ls -t "${WORK}/evidence"/exit7-*.meta | head -n 1)"
expect_field "${LAST}" 'exit' 7 'the recorded exit is 7'
expect_field "${LAST}" 'result' RAN 'a producer that ran is recorded as RAN'
expect_match "${LAST%%.meta}.log" 'SHOULD_BE_IN_LOG' 'the full producer output is kept'
expect_match "${LAST}" '^source_digest: +[0-9a-f]{64}$' 'a content digest is recorded'
expect_match "${LAST}" '^source_manifest: +.*\.json$' 'the manifest path is recorded'
expect_match "${LAST}" '^git: +branch=.*head=[0-9a-f]{40} base_tree=[0-9a-f]{40}' \
  'git metadata names the base tree as the base tree'
expect_match "${LAST}" '^argv: +sh -c ' 'the argv array is recorded'
expect_field "${LAST}" 'source_drift' 'none' 'an untouched source reports no drift'

# --- 2. success is success ---------------------------------------------------
gate --label ok -- true; expect_exit 0 "$?" 'a producer that succeeds reports 0'

# --- 3. a timeout is never a pass -------------------------------------------
gate --label timeout --timeout 2 -- sh -c 'sleep 30'; rc=$?
expect_exit 124 "${rc}" 'a producer that outlives its deadline is reported as 124'
expect_field "$(ls -t "${WORK}/evidence"/timeout-*.meta | head -n 1)" 'result' TIMEOUT 'and recorded as TIMEOUT'

gate --label self124 --timeout 5 -- sh -c 'exit 124'; rc=$?
expect_exit 124 "${rc}" 'producer self-exit124 is preserved'
expect_field "$(ls -t "${WORK}/evidence"/self124-*.meta | head -n 1)" 'result' RAN 'self-exit124 is not deadline expiry'
gate --label termzero --timeout 1 -- sh -c 'trap "exit 0" TERM; while :; do sleep 1; done'; rc=$?
expect_exit 124 "${rc}" 'TERM handler exit0 after deadline cannot pass'
expect_field "$(ls -t "${WORK}/evidence"/termzero-*.meta | head -n 1)" 'result' TIMEOUT 'TERM handler zero is deadline expiry'

# --- 4. a non-positive deadline is refused before anything runs --------------
gate --label zero --timeout 0 -- sh -c 'echo SHOULD_NOT_RUN' >/dev/null 2>&1; expect_exit 2 "$?" '--timeout 0 is refused'
if ls "${WORK}/evidence"/zero-*.log >/dev/null 2>&1; then
  bad '--timeout 0 left a log, so something ran'
else
  ok '--timeout 0 runs nothing at all'
fi
gate --label negative --timeout -5 -- true >/dev/null 2>&1; expect_exit 2 "$?" 'a negative deadline is refused'
gate --label word --timeout abc -- true >/dev/null 2>&1; expect_exit 2 "$?" 'a non-numeric deadline is refused'

# --- 5. usage errors are distinguishable from a failing producer --------------
gate --label nocommand >/dev/null 2>&1; expect_exit 2 "$?" 'no command is a usage error'
gate --label bogus --nope -- true >/dev/null 2>&1; expect_exit 2 "$?" 'an unknown option is a usage error'
gate --label nodir --cwd /nonexistent -- true >/dev/null 2>&1; expect_exit 2 "$?" 'a missing --cwd is a usage error'

# --- 6. a producer that edits its own source is not attributable -------------
# The point of the digest: the old identity hashed `git status --porcelain`, which does not move when the
# bytes of an already-modified file change. This producer is a no-op to git's status and still moves it.
gate --label drift -- sh -c 'printf "export const A = 2;\n" > assets/app.js'; rc=$?
expect_exit 3 "${rc}" 'a run whose source changed underneath it is not a pass'
DRIFT_META="$(ls -t "${WORK}/evidence"/drift-*.meta | head -n 1)"
expect_field "${DRIFT_META}" 'result' SOURCE_DRIFT 'and is recorded as SOURCE_DRIFT'
expect_match "${DRIFT_META}" '^source_drift: INVALID_SOURCE_DRIFT' 'the drift names the two digests'
expect_match "${DRIFT_META}" 'after [0-9a-f]{64}' 'the after-digest is on the record'

# A failing producer keeps its own exit even when the source also moved: 7 is a fact, drift is a caveat.
printf 'export const A = 3;\n' > "${FIXTURE}/assets/app.js"
gate --label drift7 -- sh -c 'printf "export const A = 4;\n" > assets/app.js; exit 7'; rc=$?
expect_exit 7 "${rc}" 'a failing producer keeps its own exit even when the source also moved'
expect_field "$(ls -t "${WORK}/evidence"/drift7-*.meta | head -n 1)" 'result' SOURCE_DRIFT 'and the drift is still recorded'
printf 'export const A = 1;\n' > "${FIXTURE}/assets/app.js"

# --- 7. the snapshot beside the manifest restores the source -----------------
SNAP="$(ls -t "${WORK}/evidence"/ok-*.source.tar.gz | head -n 1)"
RESTORE="${WORK}/restore"
mkdir -p "${RESTORE}"
node --input-type=module -e 'import {extractSnapshot} from "./tools/frontend-source-identity.mjs"; extractSnapshot(process.argv[1],process.argv[2]);' "${SNAP}" "${RESTORE}"
if diff -r "${RESTORE}" "${FIXTURE}" -x '.git' -x 'node_modules' -x '.install-ok' -x 'evidence' >/dev/null 2>&1; then
  ok 'the snapshot restores the source byte for byte'
else
  bad 'the snapshot does not restore the source'
fi

# --- 8. concurrent runs do not overwrite each other's evidence ---------------
# The name is claimed with mkdir. Check-then-create would let two gates with the same label in the same
# second pick the same name, and the second run's log would silently replace the first's.
for i in 1 2 3 4 5 6; do gate --label parallel --no-snapshot -- sh -c 'sleep 0.3' & done
wait
UNIQUE="$(ls "${WORK}/evidence"/parallel-*.meta | wc -l | tr -d ' ')"
if [ "${UNIQUE}" = "6" ]; then ok 'six concurrent gates produced six distinct evidence sets';
else bad "six concurrent gates produced ${UNIQUE} evidence sets"; fi

# --- 9. two runs with the same label in the same second stay distinct -------
BEFORE_COUNT="$(ls "${WORK}/evidence"/repeat-*.log 2>/dev/null | wc -l | tr -d ' ')"
gate --label repeat --no-snapshot -- true >/dev/null
gate --label repeat --no-snapshot -- true >/dev/null
AFTER_COUNT="$(ls "${WORK}/evidence"/repeat-*.log 2>/dev/null | wc -l | tr -d ' ')"
if [ "$((AFTER_COUNT - BEFORE_COUNT))" -ge 2 ]; then
  ok 'two runs with one label in one second kept two logs'
else
  bad "two runs with one label produced $((AFTER_COUNT - BEFORE_COUNT)) logs, expected 2"
fi
if [ "$(ls "${WORK}/evidence"/repeat-*.meta | sort -u | wc -l | tr -d ' ')" = "${AFTER_COUNT}" ]; then
  ok 'every log has its own metadata file'
else
  bad 'a log and a metadata file share a name, so one can overwrite the other'
fi

printf '\n%d passed, %d failed\n' "${PASS}" "${FAIL}"
[ "${FAIL}" -eq 0 ]
