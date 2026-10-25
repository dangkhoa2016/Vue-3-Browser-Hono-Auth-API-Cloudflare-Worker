# Repository instructions

- Read the [README](../README.md), [contribution guide](../CONTRIBUTING.md) and [architecture boundaries](../documents/FRONTEND_ARCHITECTURE_BOUNDARIES.md) before changing code.
- This is a Vue 3 browser application using ES modules, Pinia, Vue Router and pinned CDN libraries. Preserve the browser runtime and existing SFC loader; do not introduce an application build step as an incidental change.
- Use Node.js 24 for tooling. Verification dependencies and their lockfile live under `tests/`; coordinate matching CDN and npm pins and run the existing pin check.
- Follow existing composables, stores, shared components and API transport. Keep Vue files within the documented limits. Update locale dictionaries and preserve interpolation keys/fallback behavior.
- Derive authorization from the backend contract. Do not treat hidden controls or mock success as proof that an API operation is authorized or implemented.
- Preserve session coordination, cancellation and stale-response guards. Do not blindly replay credential mutations. Never log tokens, passwords or raw Authorization headers.
- Add meaningful regression coverage for behavior changes. Run the applicable commands from CONTRIBUTING.md and report actual results, including skipped or unverified work.
- When source inputs change, refresh derived comparisons explicitly. Preserve original evidence and read [HISTORY.md](../HISTORY.md) before authorized history curation; do not fabricate dates or test claims.
- Keep credentials and local deployment files out of Git. Source edits do not authorize deployments, production mutations or messages to others.
- Use descriptive commit subjects and bullet bodies. Explain the resulting behavior, reason, verification and material limits in the PR.
