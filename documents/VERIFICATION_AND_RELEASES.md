# Verification, support and releases

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](VERIFICATION_AND_RELEASES.vi.md)

## Supported runtime

The UI is browser-only Vue, with pinned CDN resources and no application build. Running it requires network access to those resources. Use a current browser with JavaScript, Web Locks and working localStorage; authentication requires an HTTPS secure context or localhost. Unsupported session capabilities are refused before credentials are submitted. No particular browser version or device matrix has been certified by the repository.

The primary release verification workflow uses Node.js 24 and Ubuntu 24.04. Auxiliary workflows may use different runtimes; review their YAML separately. Validate browser harness and runner changes together. Node.js 24 is used for local CLI verification. `tests/package-lock.json` pins harness dependencies. Mock examples contain test data, not credentials for a deployed service.

## API compatibility

Use the Hono backend's session/API contract implemented by `assets/js/api/backendContract.js`: canonical access/refresh session payloads, revocation and explicit capabilities for optional exports and monitoring. ENV comparison accepts layer maps and the documented legacy nested metadata. An unconfirmed capability stays disabled. Masked configuration metadata is accepted; raw secrets are not rendered.

Prepared-backend integration is opt-in and requires the inputs declared in `tests/browser/playwright.integration.config.mjs`. A mock-browser PASS is not a real-backend PASS; missing inputs remain pending. A staging login smoke check is not equivalent to all capability integration tests.

## Reproducible gates

From a clean checkout:

```bash
npm --prefix tests ci --ignore-scripts --no-audit --no-fund
npm --prefix tests run setup:verification
npm --prefix tests run test:static
npm --prefix tests run test:unit
npm --prefix tests run test:history
npm --prefix tests exec -- playwright install chromium
npm --prefix tests run test:browser
```

Static/unit npm hooks verify and restore the bundled historical checkpoints offline. This does not refresh derived comparisons. See [HISTORY.md](../HISTORY.md) before changing historical evidence.

The direct browser command has one conditional served-identity probe. Supply the current digest to run that probe too:

```bash
(
  set -e
  manifest_dir="$(mktemp -d)"
  FRONTEND_SERVED_DIGEST="$(node tools/frontend-source-identity.mjs --repo . --print-digest --quiet --out "$manifest_dir/source.json")"
  export FRONTEND_SERVED_DIGEST
  npm --prefix tests run test:browser
)
```

The subshell stops if directory or digest generation fails; assignment is separate from `export` to retain the command status. The output path must be new: the identity tool refuses to overwrite an existing manifest. CI supplies this value, uses a fresh context per case, and uploads complete logs. `History integrity` checks explicit local imports, literal page route loaders and external SFC script files across each snapshot. It is a heuristic, not a full JavaScript parser: unusual same-line imports, re-exports and import-like comments require review. It is not a proof of historical runtime behavior or every dynamic dependency.

## Staging and production

Use [STAGING.vi.md](../STAGING.vi.md) to package and deploy only public assets. Record the source commit and Cloudflare deployment version with the acceptance results. Confirm health, CORS, login, refresh, logout, role boundaries and account administration against the selected backend. Verify old access is refused after logout.

Keep staging D1/KV and secrets separate from production. If an isolated staging setup uses seeded accounts, disabled rate limiting or disabled email, record those exceptions explicitly; do not infer production settings from them. Production needs a separate configuration and acceptance, real account provisioning, appropriate rate limiting/logging and deliberate email-provider setup.

Rollback means deploying the prior verified frontend artifact and using the documented [session transition procedure](SESSION-ROLLBACK.md). A frontend rollback does not automatically revert backend schema or revoke issued credentials.

## Merge controls

Require status checks named `Static and unit`, `History integrity` and `Chromium`, with source app restricted to GitHub Actions where available. Protect main from force push/deletion and direct publication; use PRs. Re-review when the code changes after approval. A solo repository owner cannot approve their own PR, so enabling mandatory peer approval requires an available second reviewer; do not treat an automated review as a human approval.

This document describes the intended rule. Actual repository settings and hosted check results are reported separately in the maintenance handoff; the file itself is not proof they were enabled.
