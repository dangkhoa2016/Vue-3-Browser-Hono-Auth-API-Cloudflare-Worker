# Contributing

[Tiếng Việt](CONTRIBUTING.vi.md)

Use Node.js 24 for verification. The application itself runs directly in the browser.

## Local work

1. Create a feature branch from the maintained base. Keep credentials in ignored environment files.
2. Keep each change complete: introduce imported modules before or with their consumers. Use `feat(scope)`, `refactor(scope)`, `fix(scope)`, `test(scope)`, `docs(scope)` or `chore(scope)` as appropriate.
3. Add meaningful regression coverage for behavior changes. Explain the trigger and resulting behavior in the PR.
4. Install the verification-only dependencies:

   ```bash
   npm --prefix tests ci --ignore-scripts --no-audit --no-fund
   npm --prefix tests run setup:verification
   npm --prefix tests exec -- playwright install chromium
   ```

5. If source inputs changed, explicitly regenerate the derived historical-to-current comparison and review it:

   ```bash
   npm --prefix tests run reports:refresh
   npm --prefix tests run test:static
   npm --prefix tests run test:unit
   npm --prefix tests run test:history
   npm --prefix tests run test:browser
   ```

Unit discovery already includes the real Axios loopback suite. Browser tests use a fake peer; they do not certify a Cloudflare deployment. See [verification and releases](documents/VERIFICATION_AND_RELEASES.md) for integration acceptance and served-source identity.

## Pull requests

Describe the concrete problem, resulting behavior, validation and remaining limits. Review code separately from generated evidence. Do not remove checks or relabel skipped/failed historical runs to obtain a green result.

Before merging, require **Static and unit**, **History integrity** and **Chromium** for the reviewed HEAD. Human review is separate from CI. Keep production changes out of staging-only work. Published main should be protected against direct/force pushes; see the release guide for the proposed rule and solo-maintainer limitation.

Read [HISTORY.md](HISTORY.md) before interpreting the curated branch's dates or rewriting older commits.
