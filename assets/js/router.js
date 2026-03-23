const { createRouter, createWebHashHistory } = VueRouter;
const { loadModule } = window['vue3-sfc-loader'];
const { h } = Vue;
import { getSfcOptions } from './appServices.js';

// Load AsyncLoader component once at module load time.
// getSfcOptions() is non-null here because init.js calls setSfcOptions() at module scope
// BEFORE dynamically importing this file inside initMainApp().
const AsyncLoaderComponent = await loadModule('/vue/components/AsyncLoader.vue', getSfcOptions());

// Each route wraps its page path in AsyncLoader which handles lazy-loading, error display, and retries.
const load = (path) => ({
  name: `RouteWrapper_${path.split('/').pop().replace('.vue', '')}`,
  render() { return h(AsyncLoaderComponent, { path }); }
});

const routes = [
  { path: '/', name: 'Home', component: load('/vue/pages/Home.vue') },
  {
    path: '/profile',
    name: 'Profile',
    component: load('/vue/pages/Profile.vue'),
    meta: { requiresAuth: true, keepAlive: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: load('/vue/pages/Settings.vue'),
    meta: { keepAlive: true }
  },
  {
    path: '/api-info',
    name: 'ApiExplorer',
    component: load('/vue/pages/ApiExplorer.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/health',
    name: 'PublicHealth',
    component: load('/vue/pages/PublicHealth.vue')
  },
  {
    path: '/version',
    name: 'PublicVersion',
    component: load('/vue/pages/PublicVersion.vue')
  },
  {
    path: '/language',
    name: 'PublicLanguage',
    component: load('/vue/pages/PublicLanguage.vue')
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: load('/vue/pages/AdminDashboard.vue'),
    meta: { requiresAuth: true, keepAlive: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: load('/vue/pages/AdminUsers.vue'),
    meta: { requiresAuth: true, keepAlive: true }
  },
  {
    path: '/admin/audit-logs',
    name: 'AdminAuditLogs',
    component: load('/vue/pages/AdminAuditLogs.vue'),
    meta: { requiresAuth: true, keepAlive: true }
  },
  {
    path: '/admin/advanced-audit',
    name: 'AdminAdvancedAudit',
    component: load('/vue/pages/AdminAdvancedAudit.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/security-incidents',
    name: 'AdminSecurityIncidents',
    component: load('/vue/pages/AdminSecurityIncidents.vue'),
    meta: { requiresAuth: true, keepAlive: true }
  },
  {
    path: '/admin/monitoring',
    name: 'AdminRealtimeMonitoring',
    component: load('/vue/pages/AdminRealtimeMonitoring.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/stats',
    name: 'AdminSystemStats',
    component: load('/vue/pages/AdminSystemStats.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/system-health',
    name: 'AdminSystemHealth',
    component: load('/vue/pages/AdminSystemHealth.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/kv',
    name: 'KvAdminConfigs',
    component: load('/vue/pages/KvAdminConfigs.vue'),
    meta: { requiresAuth: true, keepAlive: true }
  },
  {
    path: '/admin/kv/audit',
    name: 'KvAdminAuditConfigs',
    component: load('/vue/pages/KvAdminAuditConfigs.vue'),
    meta: { requiresAuth: true, superAdminOnly: true }
  },
  {
    path: '/admin/kv/env-comparison',
    name: 'KvAdminEnvComparison',
    component: load('/vue/pages/KvAdminEnvComparison.vue'),
    meta: { requiresAuth: true, superAdminOnly: true }
  },
  {
    path: '/admin/kv/rate-limits',
    name: 'KvAdminRateLimits',
    component: load('/vue/pages/KvAdminRateLimits.vue'),
    meta: { requiresAuth: true, superAdminOnly: true }
  },
  {
    path: '/admin/token-blacklist',
    name: 'AdminTokenBlacklist',
    component: load('/vue/pages/AdminTokenBlacklist.vue'),
    meta: { requiresAuth: true, superAdminOnly: true }
  },
  {
    path: '/admin/token-audit',
    name: 'AdminTokenAudit',
    component: load('/vue/pages/AdminTokenAudit.vue'),
    meta: { requiresAuth: true, superAdminOnly: true }
  },
  { path: '/about', name: 'About', component: load('/vue/pages/About.vue') },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: load('/vue/pages/NotFound.vue') },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Authentication guard
router.beforeEach(async (to, from, next) => {
  // Check if route requires authentication
  if (to.matched.some(record => record.meta.requiresAuth)) {
    try {
      const { useAuthStore } = await import('/assets/js/stores/authStore.js');
      const authStore = useAuthStore();

      if (!authStore.isAuthenticated) {
        // Store intended destination
        sessionStorage.setItem('authRequired', 'true');
        sessionStorage.setItem('intendedRoute', to.fullPath);

        // Allow navigation but page will show login modal
        next();
      } else {
        next();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      next();
    }
  } else {
    next();
  }
});
