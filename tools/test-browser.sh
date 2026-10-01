#!/usr/bin/env bash
# Reproducible frontend verification entry point.
#
# Runs every gate that works without a browser, then reports the browser suite honestly:
# it is executed only when Playwright is present, and it never reports a pass it did not run.
#
# Usage:
#   bash tools/test-browser.sh              # static gates + node regression suites
#   bash tools/test-browser.sh --online     # also probe every pinned CDN artifact
#   bash tools/test-browser.sh --browser    # additionally require the Playwright suite
#
# Browser suite prerequisites (not provided by this repository):
#   1. A static server for the repository root on FRONTEND_BASE_URL (default http://127.0.0.1:4173)
#   2. A prepared API or mock endpoint on FRONTEND_API_BASE_URL (default http://127.0.0.1:18788)
#   3. An authenticated session: FRONTEND_USER_JSON plus FRONTEND_ACCESS_TOKEN (only for
#      tests/browser/backend-capabilities.spec.mjs; tests/browser/session-flow.spec.mjs runs against
#      the loopback stand-in and needs neither)
#
# The verification dependencies live in their own manifest (tests/package.json) so the application
# itself keeps shipping without a build step and without npm dependencies. Install them with
#   npm --prefix tests install
# and the browser suite becomes runnable; `npx playwright install chromium` additionally needs the
# browser binaries.
set -euo pipefail

cd "$(dirname "$0")/.."

ONLINE=""
REQUIRE_BROWSER=0
for arg in "$@"; do
  case "$arg" in
    --online) ONLINE="--online" ;;
    --browser) REQUIRE_BROWSER=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

run_gate () {
  local title="$1"
  shift
  echo ""
  echo "== ${title} =="
  if "$@"; then
    echo "PASS: ${title}"
  else
    echo "FAIL: ${title}" >&2
    exit 1
  fi
}

run_gate "vue file size" node tools/vue-file-size-check.cjs
run_gate "vue custom lint" node tools/vue-custom-lint.cjs
run_gate "vue script setup coverage" node tools/vue-script-setup-coverage.cjs
run_gate "i18n key check" node tools/i18n.js check
run_gate "cdn pins" node tools/check-cdn-pins.cjs ${ONLINE}

echo ""
echo "== node regression suites =="
# One discovery, one place. This used to list five suites by hand, which silently dropped every
# suite added later (25 tests at the time of FR6-G) and turned "all green" into a partial run.
# `npm --prefix tests run test:unit` expands `regression/*.test.mjs` from the manifest's own cwd,
# so the wrapper and the manifest can never disagree about what is covered. A directory argument
# (`node --test regression/`) is not used: its discovery depends on the runner version.
npm --prefix tests run test:unit

echo ""
echo "== browser suite =="
if node -e "require.resolve('@playwright/test', { paths: ['./tests'] })" >/dev/null 2>&1; then
  run_gate "playwright browser suite" npx --prefix tests playwright test --config tests/browser/playwright.config.mjs
elif [ "${REQUIRE_BROWSER}" -eq 1 ]; then
  echo "FAIL: --browser was requested but @playwright/test is not installed." >&2
  echo "Run 'npm --prefix tests install && npx --prefix tests playwright install chromium' first." >&2
  exit 1
else
  echo "PENDING: @playwright/test is not installed, so tests/browser was NOT executed."
  echo "         This run is static + node regression only. Do not record a browser pass from it."
fi

echo ""
echo "All executed gates passed."
