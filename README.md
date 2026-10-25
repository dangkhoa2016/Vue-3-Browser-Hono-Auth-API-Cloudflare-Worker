# Vue 3 Browser - Hono Auth API - Cloudflare Worker

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](README.vi.md)

This project is a Vue 3 web application that provides an admin interface for authentication and user management, designed to work with a Hono Auth API deployed on Cloudflare Workers.

## Purpose
- Demonstrate a modern Vue 3 project structure for admin dashboards.
- Provide a frontend for managing users, roles, audit logs, security incidents, and real-time monitoring via API.
- Showcase integration with Cloudflare Worker backend and Hono Auth API.
- Support multi-language (i18n) and flexible UI components.

## Main Folder Structure
- `index.html`: Main HTML file to launch the application.
- `assets/`: Contains CSS, images, JSON data, JS helpers, and supporting libraries.
- `vue/`: Contains Vue components, pages, and reusable components.
- `tools/`: Scripts and tools for i18n and development.

## Key Components
- **App.vue**: Root component of the application.
- **components/**: Components such as Navbar, Modal dialogs, Toast notifications, etc.
- **pages/**: Main pages like Home, AdminUsers, AdminAuditLogs, AdminRealtimeMonitoring, AdminSecurityIncidents, Profile, ApiExplorer, About, NotFound.
- **stores/**: State management logic for authentication, users, audit, etc.
- **locales/**: Internationalization (vi, en, ja, ko, de).

## Technologies Used
- [Vue 3](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [Axios](https://axios-http.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)

## Getting Started

Use Node.js 24 for the optional local server and verification tools. The Vue application has no build step.

```bash
# Start the Hono backend separately on localhost:8787, then:
node tools/dev-local.mjs
```

Open **http://localhost:4173**. This server selects the real local API through `/backend/` and disables mock mode for that origin. Your backend provisions accounts; fixture credentials are not deployment credentials.

For UI exploration with sample data, serve this directory with a static server and use the API settings to select mock mode. The runtime loads pinned libraries from CDN, so the browser needs Internet access. Authentication requires Web Locks and readable/writable localStorage in an HTTPS secure context or localhost.

Read [support and verification](documents/VERIFICATION_AND_RELEASES.md), [staging deployment](STAGING.vi.md), [contribution rules](CONTRIBUTING.md) and [curated history](HISTORY.md).

## i18n Tools (EN/VI Supported)
The app runtime is browser-only. Node.js is only needed optionally for CLI quality scripts in `tools/` (not for building/running the UI).

```bash
# Audit locale consistency
node tools/i18n.js audit

# Usage check (scan source keys vs locale files)
node tools/i18n.js usage
node tools/i18n.js usage --detail
node tools/i18n.js usage --export

# UI language for CLI output
node tools/i18n.js usage --lang=en
node tools/i18n.js usage --lang=vi

# Check only one locale
node tools/i18n.js usage --locale=vi

# Run both checks (CI-friendly)
node tools/i18n.js check
```

Locale CI (GitHub Actions) is available at `.github/workflows/i18n-check.yml` and runs `node tools/i18n.js check` on push/PR when i18n-related files change. This is separate from local browser runtime.

## Quality Guard

```bash
# Check Vue file size guardrails
node tools/vue-file-size-check.cjs

# Check custom Vue lint rules
node tools/vue-custom-lint.cjs

# Check script-setup migration coverage (defaults aligned with CI)
node tools/vue-script-setup-coverage.cjs

# Custom limits
node tools/vue-file-size-check.cjs --page-limit=600 --component-limit=450
```

- Default limits: pages <= 600 lines, components <= 450 lines.
- CI workflow: `.github/workflows/vue-quality-check.yml` (strict mode, fail on violations).
- Architecture boundaries: `documents/FRONTEND_ARCHITECTURE_BOUNDARIES.md`.

## Verification (test-only harness)

The application ships no dependencies and no build step. The verification harness is a **separate
manifest** in `tests/`, so the app itself stays dependency-free.

Use **Node.js 24** for verification (the CI runtime); the commands use an explicit `regression/*.test.mjs` glob, so suite
discovery does not depend on the runner's directory-discovery behaviour.

```bash
# one-time, from the repository root
npm --prefix tests ci --ignore-scripts --no-audit --no-fund
npm --prefix tests run setup:verification
npm --prefix tests exec -- playwright install chromium

# gates (each is also available on its own)
npm --prefix tests run test:static    # size / lint / script-setup / i18n / CDN pins
npm --prefix tests run test:unit      # every tests/regression/*.test.mjs suite
npm --prefix tests run test:loopback  # real Axios against a loopback server
npm --prefix tests run test:history   # dependencies in every curated snapshot
npm --prefix tests run test:browser   # Playwright + Chromium, mock API only

# every gate above, in order, failing on the first problem
npm --prefix tests run test:all

# the same unit discovery plus an optional online CDN probe
bash tools/test-browser.sh
bash tools/test-browser.sh --online
bash tools/test-browser.sh --browser    # require the Playwright suite instead of reporting PENDING
```

`test:unit` is the only discovery path: `tools/test-browser.sh` calls it, so the wrapper cannot
silently run fewer suites than the manifest. Cross-check from the repository root with
`node --test tests/regression/*.test.mjs`.

`test:integration` (`npm --prefix tests run test:integration`) is separate and opt-in: it needs a
backend whose revision the owner has released for testing. Without one it is reported PENDING, not
passed.

## Review Documentation

- Documentation index: `documents/DOCUMENTATION_INDEX.md`
- Project review guide: `documents/PROJECT_REVIEW_GUIDE.md`
- Runtime and loading: `documents/APP_RUNTIME_AND_LOADING.md`
- Auth and session: `documents/AUTH_AND_SESSION_FLOW.md`
- Admin audit and advanced audit: `documents/ADMIN_AUDIT_AND_ADVANCED_AUDIT.md`
- Data access and mock API: `documents/DATA_ACCESS_AND_MOCK_API.md`
- Realtime monitoring and dashboard: `documents/REALTIME_MONITORING_AND_DASHBOARD.md`
- KV admin configs workflow: `documents/KV_ADMIN_CONFIGS_WORKFLOW.md`
- Settings, i18n, and quality: `documents/SETTINGS_I18N_AND_QUALITY.md`

## Contribution
See [CONTRIBUTING.md](CONTRIBUTING.md) for branch, test and review requirements. The complete GitHub Actions gate covers static checks, unit/loopback, Chromium and history integrity. Historical evidence is restored offline from a pinned bundle; see [HISTORY.md](HISTORY.md).

## Icon License and Attribution

The project icons `assets/img/favicon.ico` and `assets/img/favicon.png` were downloaded from [Application icon on Magnific](https://www.magnific.com/icon/application_14970641), by [juicy_fish](https://www.magnific.com/author/juicy-fish).

See [LICENSE-ICONS.md](LICENSE-ICONS.md) for the icon attribution and licensing notice.
