# Frontend Architecture Boundaries

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](FRONTEND_ARCHITECTURE_BOUNDARIES.vi.md)

This document defines practical boundaries for the browser-only Vue frontend (`vue-hono-auth-api-cloudflare-worker`).

## 1) Layer Responsibilities

- **Pages (`vue/pages/`)**
  - Compose sections and connect stores/composables to UI.
  - Own route-level orchestration only.
  - Should avoid embedding low-level API logic when store/composable already exists.

- **Components (`vue/components/`)**
  - Reusable UI blocks and local interactions.
  - Expose clear props/events contracts (kebab-case in templates).
  - Avoid direct cross-feature store coupling unless component is explicitly feature-specific.

- **Composables (`vue/composables/`)**
  - Reusable view logic (auth-gate, debounce, modal state, i18n fallback, UI class maps).
  - No route-specific assumptions unless documented in function name/options.

- **Stores (`assets/js/stores/`)**
  - Business state, API I/O coordination, and mutation actions.
  - Store state naming should follow intent (`isLoading`, `errorMessage`, `isReady`, etc.).

- **Routing (`assets/js/router.js`)**
  - Route registry, auth guards, route metadata (`requiresAuth`, `superAdminOnly`, `keepAlive`).
  - Should not contain page business logic.

- **Bootstrap (`assets/js/init.js`)**
  - App boot sequence and dynamic module loader wiring.
  - Avoid feature logic beyond initialization and global plugin setup.

## 2) Keep-Alive Caching Strategy

- Use route meta `keepAlive: true` for expensive route views that benefit from state persistence.
- Keep-alive inclusion list is derived from route metadata in `vue/App.vue`.
- Default behavior: route views are rendered normally; only selected route names are cached.

Recommended cache candidates:
- Heavy admin list pages with filter/pagination state.
- Dashboards where preserving view state improves operator workflow.

Avoid keep-alive for:
- One-shot forms where stale state is risky.
- Pages that must always re-fetch fresh data on navigation.

## 3) Vue File Size Guardrails

- Pages: target <= 600 lines.
- Components: target <= 450 lines.

Automated guard:
- Local/CI script: `node tools/vue-file-size-check.cjs`
- CI workflow: `.github/workflows/vue-quality-check.yml`

Notes:
- Limits are guardrails, not absolute architecture quality.
- If a file exceeds limit, split by sections/composables while preserving behavior.

## 4) Contract Rules (Phase 3/4 Continuity)

- Use centralized i18n fallback utility (`useI18nFallback`) where fallback text is needed.
- Avoid inline fallback pattern in templates like `$t(...) || '...'`.
- Keep props/events template names kebab-case.
- Keep state names semantic (`isLoading`, `errorMessage`, `isReady`, ...).

## 5) Safe Modernization Checklist

Before merging modernization changes:

1. No behavior/UX drift for existing screens.
2. Existing i18n checks pass: `node tools/i18n.js check`.
3. Vue file-size guard passes: `node tools/vue-file-size-check.cjs`.
4. Updated files keep existing contracts and route behavior.
5. Migration notes are included in PR summary.

---

[Đọc tài liệu này bằng tiếng Việt](FRONTEND_ARCHITECTURE_BOUNDARIES_vi.md)
