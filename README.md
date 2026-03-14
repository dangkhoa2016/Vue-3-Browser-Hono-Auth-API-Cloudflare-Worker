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
- [Pinia](https://pinia.vuejs.org/) (if used)
- [Axios](https://axios-http.com/) (if used)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)

## Getting Started
1. No build step is required (browser-only project).
2. Open `index.html` with Live Server or any static server to run the app.
3. Configure API endpoints and authentication as needed.

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

Optional CI (GitHub Actions only) is available at `.github/workflows/i18n-check.yml` and runs `node tools/i18n.js check` on push/PR when i18n-related files change. This is separate from local browser runtime.

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

## Contribution
This is a sample admin project. You can fork and develop additional features or improve the project structure.
