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
1. Install necessary dependencies (if using a package manager).
2. Open `index.html` with Live Server or a static server to view the demo.
3. Configure API endpoints and authentication as needed.

## Contribution
This is a sample admin project. You can fork and develop additional features or improve the project structure.
