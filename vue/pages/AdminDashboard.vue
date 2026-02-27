<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <template v-if="showLoginRequired">
      <section class="bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-lock-fill text-5xl text-indigo-600 dark:text-indigo-400 mb-4"></i>
        <h3 class="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">{{ $t('message.auth.login_required') }}</h3>
        <p class="text-indigo-700 dark:text-indigo-300 mb-4">{{ $t('message.admin_dashboard_page.login_required_message') }}</p>
        <ActionTextButton
          icon="bi bi-box-arrow-in-right"
          tone="indigo"
          size="sm"
          shape="xl"
          @click="openLoginModal"
        >
          {{ $t('message.auth.login') }}
        </ActionTextButton>
      </section>
    </template>

    <template v-else>
      <section :class="heroSectionClass">
        <div class="absolute -top-20 -right-16 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div class="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-indigo-900/10 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
              {{ $t('message.admin_dashboard_page.badge') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.navbar.admin_dashboard') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.admin_dashboard_page.subtitle') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <ActionTextButton
                variant="soft"
                icon="bi bi-arrow-clockwise"
                shape="full"
                :disabled="loading"
                @click="refresh"
              >
                {{ $t('message.refresh') }}
              </ActionTextButton>
              <span v-if="showProgressPanel && currentStepLabel" class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">
                <i class="bi bi-arrow-repeat animate-spin"></i>
                {{ currentStepIndex }}/{{ totalSteps }} · {{ currentStepLabel }}
              </span>
              <div v-if="showProgressPanel && !lastUpdatedLabel" class="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
              <span v-else class="text-xs uppercase tracking-[0.2em] text-slate-400">
                {{ $t('message.admin_dashboard_page.last_updated') }}: {{ formatDate(lastUpdatedLabel) }}
              </span>
            </div>
            <div v-if="showProgressPanel" class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in progressItems"
                :key="item.key"
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] border"
                :class="item.classes"
              >
                <i :class="item.icon"></i>
                {{ item.label }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_stats_page.total_users') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <div v-if="!hasLoaded.stats" class="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <span v-else class="text-xl font-black text-slate-900 dark:text-white">{{ displayTotalUsers }}</span>
                <i class="bi bi-people text-2xl text-indigo-500"></i>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.admin_dashboard_page.health_status') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <div v-if="!hasLoaded.health" class="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <span v-else class="text-xl font-black" :class="healthStatusClass">{{ healthStatusText }}</span>
                <i class="bi bi-heart-pulse text-2xl" :class="healthStatusClass"></i>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.admin_dashboard_page.active_incidents') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <div v-if="!hasLoaded.incidents" class="h-7 w-14 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <span v-else class="text-xl font-black text-rose-600 dark:text-rose-400">{{ displayActiveIncidents }}</span>
                <i class="bi bi-shield-exclamation text-2xl text-rose-500"></i>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.admin_dashboard_page.monitoring') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <div v-if="!hasLoaded.realtime" class="h-6 w-24 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <span v-else class="text-sm font-bold" :class="isMonitoringActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                  {{ isMonitoringActive ? $t('message.admin_dashboard_page.monitoring_active') : $t('message.admin_dashboard_page.monitoring_inactive') }}
                </span>
                <i class="bi bi-activity text-2xl" :class="isMonitoringActive ? 'text-emerald-500' : 'text-amber-500'"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.admin_dashboard_page.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.admin_dashboard_page.access_denied_message') }}</p>
      </section>

      <section v-else class="space-y-6">
        <div v-if="error" class="rounded-[28px] border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-6 text-rose-700 dark:text-rose-300">
          <div class="flex items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>{{ error }}</span>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.admin_dashboard_page.service_status_title') }}</h2>
              <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.admin_dashboard_page.response_time') }}</span>
                  <div v-if="!hasLoaded.health" class="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <span v-else class="font-bold text-slate-900 dark:text-slate-100">{{ responseTime }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.admin_dashboard_page.total_audit_logs') }}</span>
                  <div v-if="!hasLoaded.audit" class="h-5 w-14 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <span v-else class="font-bold text-slate-900 dark:text-slate-100">{{ displayTotalAuditLogs }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.admin_dashboard_page.active_threats') }}</span>
                  <div v-if="!hasLoaded.realtime" class="h-5 w-14 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <span v-else class="font-bold text-rose-600 dark:text-rose-400">{{ displayActiveThreats }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.admin_dashboard_page.active_alerts') }}</span>
                  <div v-if="!hasLoaded.realtime" class="h-5 w-14 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <span v-else class="font-bold text-amber-600 dark:text-amber-400">{{ displayActiveAlerts }}</span>
                </div>
              </div>
            </section>

            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_stats_page.users_by_role_title') }}</h2>
              <div class="grid grid-cols-3 gap-3">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.role_super_admin') }}</p>
                  <div v-if="!hasLoaded.stats" class="h-7 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1"></div>
                  <p v-else class="text-xl font-black text-violet-600 dark:text-violet-400">{{ roleCounts.super_admin }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.role_admin') }}</p>
                  <div v-if="!hasLoaded.stats" class="h-7 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1"></div>
                  <p v-else class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ roleCounts.admin }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.role_user') }}</p>
                  <div v-if="!hasLoaded.stats" class="h-7 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1"></div>
                  <p v-else class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ roleCounts.user }}</p>
                </div>
              </div>
            </section>
          </div>

          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.admin_dashboard_page.quick_actions') }}</h2>
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <router-link
                v-for="item in quickActions"
                :key="item.path"
                :to="item.path"
                :class="quickActionCardClass"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">{{ item.name }}</p>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ item.meta }}</p>
                  </div>
                  <i :class="item.icon" class="text-xl text-slate-400 group-hover:text-indigo-500 transition"></i>
                </div>
                <div class="mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  {{ $t('message.admin_dashboard_page.open_page') }}
                  <i class="bi bi-arrow-right ml-1"></i>
                </div>
              </router-link>
            </div>
          </section>

      </section>
    </template>
  </div>
</template>

<script>
import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useSystemStatsStore } from '/assets/js/stores/systemStatsStore.js';
import { useSystemHealthStore } from '/assets/js/stores/systemHealthStore.js';
import { useAuditStore } from '/assets/js/stores/auditStore.js';
import { useSecurityIncidentStore } from '/assets/js/stores/securityIncidentStore.js';
import { useRealtimeMonitoringStore } from '/assets/js/stores/realtimeMonitoringStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import ActionTextButton from '/vue/components/ActionTextButton.vue';

export default {
  name: 'AdminDashboard',
  components: {
    ActionTextButton
  },
  setup() {
    const { t } = useI18n({ useScope: 'global' });
    const systemStatsStore = useSystemStatsStore();
    const systemHealthStore = useSystemHealthStore();
    const auditStore = useAuditStore();
    const securityIncidentStore = useSecurityIncidentStore();
    const realtimeStore = useRealtimeMonitoringStore();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const mainStore = useMainStore();

    const loading = ref(false);
    const error = ref(null);
    const heroSectionClass = 'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-indigo-50/40 to-emerald-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
    const quickActionCardClass = 'group rounded-2xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition';
    const currentStep = ref('');
    const currentStepIndex = ref(0);
    const totalSteps = ref(0);
    const showProgressPanel = ref(false);
    const queuedRefresh = ref(false);

    const { statsData, lastUpdated: statsUpdated } = storeToRefs(systemStatsStore);
    const { healthData, lastUpdated: healthUpdated } = storeToRefs(systemHealthStore);
    const { pagination: auditPagination, lastUpdated: auditUpdated } = storeToRefs(auditStore);
    const { pagination: incidentPagination, lastUpdated: incidentUpdated } = storeToRefs(securityIncidentStore);
    const { lastUpdated: realtimeUpdated } = storeToRefs(realtimeStore);

    const hasLoaded = ref({
      stats: Boolean(statsData.value),
      health: Boolean(healthData.value),
      audit: typeof auditPagination.value?.total !== 'undefined',
      incidents: typeof incidentPagination.value?.total !== 'undefined',
      realtime: Boolean(realtimeUpdated.value)
    });

    const isAuthenticated = computed(() => authStore.isAuthenticated);
    const role = computed(() => String(authStore.user?.role || '').toLowerCase());
    const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');
    const showLoginRequired = computed(() => !isAuthenticated.value);

    const totalUsers = computed(() => {
      const value = Number(statsData.value?.totalUsers);
      return Number.isFinite(value) ? value : null;
    });
    const displayTotalUsers = computed(() => (totalUsers.value === null ? '-' : totalUsers.value));
    const roleCounts = computed(() => ({
      super_admin: Number(statsData.value?.usersByRole?.super_admin) || 0,
      admin: Number(statsData.value?.usersByRole?.admin) || 0,
      user: Number(statsData.value?.usersByRole?.user) || 0
    }));

    const healthStatus = computed(() => String(healthData.value?.status || 'unknown').toLowerCase());
    const healthStatusText = computed(() => {
      if (healthStatus.value === 'healthy') return t('message.system_health.status_healthy');
      if (healthStatus.value === 'unhealthy') return t('message.system_health.status_unhealthy');
      return t('message.system_health.status_unknown');
    });
    const healthStatusClass = computed(() => {
      if (healthStatus.value === 'healthy') return 'text-emerald-600 dark:text-emerald-400';
      if (healthStatus.value === 'unhealthy') return 'text-rose-600 dark:text-rose-400';
      return 'text-slate-600 dark:text-slate-300';
    });

    const responseTime = computed(() => {
      return healthData.value?.responseTime || healthData.value?.system?.performance?.responseTime || '-';
    });

    const totalAuditLogs = computed(() => {
      const value = Number(auditPagination.value?.total);
      return Number.isFinite(value) ? value : null;
    });
    const displayTotalAuditLogs = computed(() => (totalAuditLogs.value === null ? '-' : totalAuditLogs.value));
    const activeIncidents = computed(() => {
      const value = Number(incidentPagination.value?.total);
      return Number.isFinite(value) ? value : null;
    });
    const displayActiveIncidents = computed(() => (activeIncidents.value === null ? '-' : activeIncidents.value));
    const activeThreats = computed(() => {
      const value = Number(realtimeStore.activeThreatCount);
      return Number.isFinite(value) ? value : null;
    });
    const displayActiveThreats = computed(() => (activeThreats.value === null ? '-' : activeThreats.value));
    const activeAlerts = computed(() => {
      const value = Number(realtimeStore.alertsCount);
      return Number.isFinite(value) ? value : null;
    });
    const displayActiveAlerts = computed(() => (activeAlerts.value === null ? '-' : activeAlerts.value));
    const isMonitoringActive = computed(() => Boolean(realtimeStore.isMonitoringActive));
    const currentStepLabel = computed(() => {
      if (!currentStep.value) return '';
      const labels = {
        stats: t('message.navbar.system_stats'),
        health: t('message.navbar.system_health'),
        audit: t('message.navbar.audit_logs'),
        incidents: t('message.navbar.security_incidents'),
        realtime: t('message.navbar.realtime_monitoring')
      };
      return labels[currentStep.value] || currentStep.value;
    });
    const progressItems = computed(() => {
      const steps = [
        { key: 'stats', label: t('message.navbar.system_stats') },
        { key: 'health', label: t('message.navbar.system_health') },
        { key: 'audit', label: t('message.navbar.audit_logs') },
        { key: 'incidents', label: t('message.navbar.security_incidents') },
        { key: 'realtime', label: t('message.navbar.realtime_monitoring') }
      ];

      return steps.map((step) => {
        const isDone = Boolean(hasLoaded.value[step.key]);
        const isCurrent = showProgressPanel.value && currentStep.value === step.key;

        if (isDone) {
          return {
            ...step,
            icon: 'bi bi-check-circle-fill text-emerald-500',
            classes: 'border-emerald-300/60 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
          };
        }

        if (isCurrent) {
          return {
            ...step,
            icon: 'bi bi-arrow-repeat animate-spin text-indigo-500',
            classes: 'border-indigo-300/60 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
          };
        }

        return {
          ...step,
          icon: 'bi bi-circle text-slate-400',
          classes: 'border-slate-300/60 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-300'
        };
      });
    });

    const quickActions = computed(() => [
      {
        name: t('message.navbar.system_stats'),
        path: '/admin/stats',
        icon: 'bi bi-graph-up',
        meta: hasLoaded.value.stats
          ? `${displayTotalUsers.value} ${String(t('message.system_stats_page.total_users')).toLowerCase()}`
          : '...'
      },
      {
        name: t('message.navbar.system_health'),
        path: '/admin/system-health',
        icon: 'bi bi-heart-pulse',
        meta: hasLoaded.value.health ? healthStatusText.value : '...'
      },
      {
        name: t('message.navbar.audit_logs'),
        path: '/admin/audit-logs',
        icon: 'bi bi-journal-text',
        meta: hasLoaded.value.audit
          ? `${displayTotalAuditLogs.value} ${String(t('message.admin_dashboard_page.total_audit_logs')).toLowerCase()}`
          : '...'
      },
      {
        name: t('message.navbar.security_incidents'),
        path: '/admin/security-incidents',
        icon: 'bi bi-shield-exclamation',
        meta: hasLoaded.value.incidents
          ? `${displayActiveIncidents.value} ${String(t('message.admin_dashboard_page.active_incidents')).toLowerCase()}`
          : '...'
      },
      {
        name: t('message.navbar.realtime_monitoring'),
        path: '/admin/monitoring',
        icon: 'bi bi-activity',
        meta: hasLoaded.value.realtime
          ? (isMonitoringActive.value
            ? t('message.admin_dashboard_page.monitoring_active')
            : t('message.admin_dashboard_page.monitoring_inactive'))
          : '...'
      },
      {
        name: t('message.navbar.user_management'),
        path: '/admin/users',
        icon: 'bi bi-people',
        meta: t('message.system_stats_page.users_by_role_title')
      }
    ]);

    const lastUpdatedLabel = computed(() => {
      const candidates = [
        statsUpdated.value,
        healthUpdated.value,
        auditUpdated.value,
        incidentUpdated.value,
        realtimeUpdated.value
      ].filter(Boolean);
      if (!candidates.length) return null;
      const sorted = candidates.sort();
      return sorted[sorted.length - 1] || null;
    });

    const formatDate = (value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString();
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const refresh = async () => {
      if (!isAuthenticated.value || !isAdmin.value) return;
      if (loading.value) {
        queuedRefresh.value = true;
        return;
      }

      loading.value = true;
      showProgressPanel.value = true;
      error.value = null;
      hasLoaded.value = {
        stats: false,
        health: false,
        audit: false,
        incidents: false,
        realtime: false
      };
      await nextTick();

      const tasks = [
        { key: 'stats', run: () => systemStatsStore.fetchSystemStats() },
        { key: 'health', run: () => systemHealthStore.fetchSystemHealth() },
        { key: 'audit', run: () => auditStore.fetchLogs() },
        { key: 'incidents', run: () => securityIncidentStore.fetchIncidents({ page: 1, limit: 20 }) },
        { key: 'realtime', run: () => realtimeStore.fetchDashboardData() }
      ];
      const minStepDurationMs = 280;
      totalSteps.value = tasks.length;
      currentStepIndex.value = 0;
      currentStep.value = '';

      const failed = [];
      for (let index = 0; index < tasks.length; index++) {
        const task = tasks[index];
        const stepStartedAt = Date.now();
        try {
          currentStep.value = task.key;
          currentStepIndex.value = index + 1;
          await task.run();
        } catch (err) {
          failed.push({ key: task.key, error: err });

          const status = Number(err?.status || err?.response?.status || 0);
          if (status === 401 || status === 403) {
            const elapsed = Date.now() - stepStartedAt;
            const holdFor = Math.max(0, minStepDurationMs - elapsed);
            if (holdFor > 0) await sleep(holdFor);
            hasLoaded.value[task.key] = true;
            break;
          }
        }

        const elapsed = Date.now() - stepStartedAt;
        const holdFor = Math.max(0, minStepDurationMs - elapsed);
        if (holdFor > 0) await sleep(holdFor);
        hasLoaded.value[task.key] = true;
      }

      if (failed.length > 0) {
        const firstError = failed[0]?.error;
        const firstMessage = String(firstError?.message || '').trim();
        const fallback = t('message.errors.unknown_error');
        const suffix = failed.length > 1 ? ` (+${failed.length - 1})` : '';
        error.value = `${firstMessage || fallback}${suffix}`;
        console.warn('[AdminDashboard] Sequential refresh failed:', failed);
      }

      loading.value = false;
      currentStep.value = '';
      currentStepIndex.value = 0;
      totalSteps.value = 0;

      if (queuedRefresh.value) {
        queuedRefresh.value = false;
        await refresh();
        return;
      }

      await sleep(600);
      showProgressPanel.value = false;
    };

    const loadInitial = async () => {
      if (!isAuthenticated.value || !isAdmin.value) return;
      await refresh();
    };

    const openLoginModal = () => {
      modalStore.openLogin();
    };

    watch(() => authStore.isAuthenticated, async (value, oldValue) => {
      if (value && !oldValue) {
        await loadInitial();
      }
    });

    watch(() => mainStore.mockApi, async (value, oldValue) => {
      if (!isAuthenticated.value || !isAdmin.value || value === oldValue) return;
      await loadInitial();
    });

    onMounted(async () => {
      await loadInitial();
    });

    onActivated(async () => {
      await loadInitial();
    });

    return {
      loading,
      error,
      heroSectionClass,
      quickActionCardClass,
      isAdmin,
      showLoginRequired,
      totalUsers,
      displayTotalUsers,
      roleCounts,
      healthStatusText,
      healthStatusClass,
      responseTime,
      totalAuditLogs,
      displayTotalAuditLogs,
      activeIncidents,
      displayActiveIncidents,
      activeThreats,
      displayActiveThreats,
      activeAlerts,
      displayActiveAlerts,
      isMonitoringActive,
      currentStepLabel,
      currentStepIndex,
      totalSteps,
      showProgressPanel,
      progressItems,
      hasLoaded,
      quickActions,
      lastUpdatedLabel,
      formatDate,
      refresh,
      openLoginModal
    };
  }
};
</script>
