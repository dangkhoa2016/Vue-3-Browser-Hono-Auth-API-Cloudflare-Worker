<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div v-if="showLoginRequired" class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center">
      <i class="bi bi-lock-fill text-5xl text-blue-600 dark:text-blue-400 mb-4"></i>
      <h3 class="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">{{ $t('message.audit.login_required') || $t('message.auth.login_required') }}</h3>
      <p class="text-blue-700 dark:text-blue-300 mb-4">{{ $t('message.audit.login_required_message') || $t('message.auth.login_required_message') }}</p>
      <button
        @click="openLoginModal"
        class="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
      >
        <i class="bi bi-box-arrow-in-right text-lg"></i>
        {{ $t('message.auth.login') || 'Login' }}
      </button>
    </div>

    <template v-else>
      <template v-if="loading">
        <section class="rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-8 animate-pulse">
          <div class="space-y-4">
            <div class="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-10 w-80 max-w-full rounded bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-4 w-full max-w-2xl rounded bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-4 w-72 rounded bg-slate-200 dark:bg-slate-700"></div>
          </div>

          <div class="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div v-for="item in 4" :key="`skeleton-top-card-${item}`" class="rounded-2xl border border-slate-200/70 dark:border-slate-800 p-5">
              <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
              <div class="mt-4 h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-3 animate-pulse">
          <div class="lg:col-span-2 rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6">
            <div class="h-5 w-44 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
            <div class="space-y-3">
              <div v-for="item in 3" :key="`skeleton-actions-${item}`" class="h-14 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>

          <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 space-y-3">
            <div class="h-5 w-36 rounded bg-slate-200 dark:bg-slate-700"></div>
            <div v-for="item in 3" :key="`skeleton-summary-${item}`" class="h-16 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-2 animate-pulse">
          <div v-for="item in 2" :key="`skeleton-table-${item}`" class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6">
            <div class="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
            <div class="space-y-2">
              <div v-for="row in 5" :key="`skeleton-table-row-${item}-${row}`" class="h-10 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
      <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-violet-50/40 to-cyan-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]">
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>

        <div class="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-violet-900/10 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-violet-500"></span>
              {{ $t('message.realtime_monitoring.badge') || 'Realtime Monitoring' }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.navbar.realtime_monitoring') || 'Realtime Monitoring' }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.realtime_monitoring.subtitle') || 'Real-time analytics dashboard from audit, user behavior, and security activity.' }}
            </p>
            <p class="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{{ formatDate(dataTimestamp) }}</p>

            <div class="mt-6 flex flex-wrap gap-3">
              <button
                @click="refresh"
                :disabled="loading"
                class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition disabled:opacity-60"
              >
                <i class="bi bi-arrow-clockwise"></i>
                {{ $t('message.refresh') || 'Refresh' }}
              </button>

              <button
                @click="exportDashboard"
                :disabled="actionLoading"
                class="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-700 bg-violet-50/80 dark:bg-violet-900/20 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-200 shadow-sm hover:shadow-md transition disabled:opacity-60"
              >
                <i class="bi bi-download"></i>
                {{ $t('message.realtime_monitoring.export') || 'Export' }}
              </button>

              <button
                v-if="!isMonitoringActive"
                @click="startMonitoring"
                :disabled="actionLoading"
                class="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60"
              >
                <i class="bi bi-play-fill"></i>
                {{ $t('message.realtime_monitoring.start') || 'Start' }}
              </button>

              <button
                v-else
                @click="stopMonitoring"
                :disabled="actionLoading"
                class="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60"
              >
                <i class="bi bi-stop-fill"></i>
                {{ $t('message.realtime_monitoring.stop') || 'Stop' }}
              </button>

              <button
                @click="analyzeThreats"
                :disabled="actionLoading"
                class="inline-flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60"
              >
                <i class="bi bi-bar-chart"></i>
                {{ $t('message.realtime_monitoring.analyze') || 'Analyze Last 1h' }}
              </button>

              <button
                @click="simulateEvent"
                :disabled="actionLoading"
                class="inline-flex items-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60"
              >
                <i class="bi bi-lightning-charge"></i>
                {{ $t('message.realtime_monitoring.simulate') || 'Simulate Event' }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Today</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-2xl font-black text-cyan-600 dark:text-cyan-400">{{ overviewTotals.today }}</span>
                <i class="bi bi-activity text-xl text-cyan-500"></i>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">All Time</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-2xl font-black text-violet-600 dark:text-violet-400">{{ overviewTotals.allTime }}</span>
                <i class="bi bi-database text-xl text-violet-500"></i>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Failed Today</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-2xl font-black text-rose-600 dark:text-rose-400">{{ overviewTotals.failedActionsToday }}</span>
                <i class="bi bi-exclamation-triangle text-xl text-rose-500"></i>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Risk Score</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-2xl font-black text-amber-600 dark:text-amber-400">{{ riskScore }}</span>
                <i class="bi bi-shield-lock text-xl text-amber-500"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="error" class="rounded-[18px] border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-rose-700 dark:text-rose-300">
        <div class="flex items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>{{ error }}</span>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Top Actions Today</h3>
          <div class="space-y-3">
            <div
              v-for="item in topActionsToday"
              :key="item.action"
              class="rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 p-4"
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-800 dark:text-slate-100 uppercase">{{ item.action }}</span>
                <span class="text-xl font-black text-violet-600 dark:text-violet-400">{{ item.count }}</span>
              </div>
            </div>
            <div v-if="topActionsToday.length === 0" class="text-sm text-slate-500 dark:text-slate-400">No action data.</div>
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] space-y-4">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Timeline Summary</h3>
          <div class="space-y-3">
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Total Events</p>
              <p class="text-2xl font-black text-cyan-600 dark:text-cyan-400">{{ timelineSummary.totalEvents || 0 }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Total Failures</p>
              <p class="text-2xl font-black text-rose-600 dark:text-rose-400">{{ timelineSummary.totalFailures || 0 }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Avg / Hour</p>
              <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ timelineSummary.avgEventsPerHour || 0 }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Users By Role (24h)</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-3 text-left">Role</th>
                  <th class="px-4 py-3 text-right">Events</th>
                  <th class="px-4 py-3 text-right">Users</th>
                  <th class="px-4 py-3 text-right">Failure %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in usersByRole" :key="item.role" class="border-t border-slate-100 dark:border-slate-800">
                  <td class="px-4 py-3 uppercase text-slate-700 dark:text-slate-200">{{ item.role }}</td>
                  <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.event_count }}</td>
                  <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.user_count }}</td>
                  <td class="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-semibold">{{ item.failure_rate }}%</td>
                </tr>
                <tr v-if="usersByRole.length === 0">
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No user role data.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Action Distribution</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-3 text-left">Action</th>
                  <th class="px-4 py-3 text-right">Count</th>
                  <th class="px-4 py-3 text-right">Failures</th>
                  <th class="px-4 py-3 text-right">Success %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in actionDistribution" :key="item.action" class="border-t border-slate-100 dark:border-slate-800">
                  <td class="px-4 py-3 uppercase text-slate-700 dark:text-slate-200">{{ item.action }}</td>
                  <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.count }}</td>
                  <td class="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{{ item.failures }}</td>
                  <td class="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{{ item.success_rate }}%</td>
                </tr>
                <tr v-if="actionDistribution.length === 0">
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No action distribution data.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Timeline (Hourly)</h3>
          <div class="overflow-x-auto max-h-80">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                <tr>
                  <th class="px-4 py-3 text-left">Hour</th>
                  <th class="px-4 py-3 text-right">Total</th>
                  <th class="px-4 py-3 text-right">Failed</th>
                  <th class="px-4 py-3 text-right">Users</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in timelineItems" :key="item.hour" class="border-t border-slate-100 dark:border-slate-800">
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-200">{{ formatDate(item.hour) }}</td>
                  <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.total_events }}</td>
                  <td class="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{{ item.failed_events }}</td>
                  <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.unique_users }}</td>
                </tr>
                <tr v-if="timelineItems.length === 0">
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No timeline data.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Security Insights</h3>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">High-risk IPs</p>
              <p class="text-xl font-black text-amber-600 dark:text-amber-400">{{ riskIndicators.high_risk_ips || 0 }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Brute Force</p>
              <p class="text-xl font-black text-rose-600 dark:text-rose-400">{{ riskIndicators.brute_force_attempts || 0 }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Cache Entries</p>
              <p class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ cacheStatus.entries || 0 }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Cache Hit Rate</p>
              <p class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ cacheHitRate }}%</p>
            </div>
          </div>

          <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Top Admin Activity</h4>
          <ul class="space-y-2">
            <li v-for="item in adminActivity" :key="`${item.actor_role}-${item.action}`" class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 px-3 py-2">
              <span class="text-sm text-slate-700 dark:text-slate-200">{{ item.actor_role }} · {{ item.action }}</span>
              <span class="text-sm font-bold text-violet-600 dark:text-violet-400">{{ item.count }}</span>
            </li>
            <li v-if="adminActivity.length === 0" class="text-sm text-slate-500 dark:text-slate-400">No admin activity data.</li>
          </ul>
        </div>
      </section>
      </template>
    </template>
  </div>
</template>

<script>
import { computed, onActivated, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRealtimeMonitoringStore } from '/assets/js/stores/realtimeMonitoringStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';

export default {
  name: 'AdminRealtimeMonitoring',
  setup() {
    const monitoringStore = useRealtimeMonitoringStore();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const mainStore = useMainStore();

    const {
      loading,
      actionLoading,
      error,
      timestamp,
      overview,
      users,
      security,
      metadata,
      timeline,
      latestAnalysis,
      latestSimulation,
      lastUpdated
    } = storeToRefs(monitoringStore);

    const isAuthenticated = computed(() => authStore.isAuthenticated);
    const showLoginRequired = computed(() => !isAuthenticated.value);

    const isMonitoringActive = computed(() => monitoringStore.isMonitoringActive);

    const overviewTotals = computed(() => ({
      allTime: Number(overview.value?.totals?.allTime) || 0,
      today: Number(overview.value?.totals?.today) || 0,
      thisWeek: Number(overview.value?.totals?.thisWeek) || 0,
      uniqueUsersToday: Number(overview.value?.totals?.uniqueUsersToday) || 0,
      failedActionsToday: Number(overview.value?.totals?.failedActionsToday) || 0
    }));

    const topActionsToday = computed(() => {
      const rows = overview.value?.trends?.topActionsToday;
      return Array.isArray(rows) ? rows : [];
    });

    const timelineSummary = computed(() => timeline.value?.summary || {});

    const timelineItems = computed(() => {
      const rows = timeline.value?.timeline;
      return Array.isArray(rows) ? rows : [];
    });

    const usersByRole = computed(() => {
      const rows = users.value?.byRole;
      return Array.isArray(rows) ? rows : [];
    });

    const actionDistribution = computed(() => {
      const rows = users.value?.actionDistribution;
      return Array.isArray(rows) ? rows : [];
    });

    const adminActivity = computed(() => {
      const rows = security.value?.analytics?.security_summary?.admin_activity;
      return Array.isArray(rows) ? rows.slice(0, 6) : [];
    });

    const riskIndicators = computed(() => security.value?.analytics?.risk_indicators || {});

    const riskScore = computed(() => {
      const value = Number(riskIndicators.value?.risk_score ?? security.value?.riskScore);
      return Number.isNaN(value) ? 0 : value;
    });

    const cacheStatus = computed(() => metadata.value?.cacheStatus || {});

    const cacheHitRate = computed(() => {
      const value = Number(cacheStatus.value?.hitRate);
      if (Number.isNaN(value)) return 0;
      return value.toFixed(1);
    });

    const dataTimestamp = computed(() => timestamp.value || lastUpdated.value);

    const formatDate = (value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString();
    };

    const refresh = async () => {
      if (!isAuthenticated.value) return;
      try {
        await monitoringStore.fetchMonitoringStatus();
      } catch (_error) {
      }
      await monitoringStore.refreshSnapshot();
    };

    const loadInitialMonitoringData = async () => {
      if (!isAuthenticated.value) return;
      try {
        await monitoringStore.fetchMonitoringStatus();
      } catch (_error) {
      }
      await monitoringStore.refreshSnapshot();
    };

    const exportDashboard = async () => {
      if (!isAuthenticated.value) return;
      await monitoringStore.exportDashboard({ format: 'json', timeRange: 'last_24h' });
    };

    const startMonitoring = async () => {
      try {
        await monitoringStore.startMonitoring(5000, true);
      } catch (_error) {
      }
    };

    const stopMonitoring = async () => {
      try {
        await monitoringStore.stopMonitoring();
      } catch (_error) {
      }
    };

    const analyzeThreats = async () => {
      try {
        await monitoringStore.analyzeThreats(1);
      } catch (_error) {
      }
    };

    const simulateEvent = async () => {
      try {
        await monitoringStore.simulateEvent({
          eventType: 'test_event',
          severity: 'medium',
          data: { source: 'ui' }
        });
      } catch (_error) {
      }
    };

    const openLoginModal = () => {
      modalStore.openLogin();
    };

    watch(() => mainStore.mockApi, async (value, oldValue) => {
      if (!isAuthenticated.value || value === oldValue) {
        return;
      }

      // Re-run initial load when switching from mock -> real fetch
      if (oldValue === true && value === false) {
        await loadInitialMonitoringData();
        return;
      }

      // Keep current behavior for other mode changes
      await loadInitialMonitoringData();
    });

    watch(() => authStore.isAuthenticated, async (value, oldValue) => {
      if (value && !oldValue) {
        await loadInitialMonitoringData();
      }
    });

    onMounted(async () => {
      await loadInitialMonitoringData();
    });

    onActivated(async () => {
      await loadInitialMonitoringData();
    });

    return {
      loading,
      actionLoading,
      error,
      latestAnalysis,
      latestSimulation,
      dataTimestamp,
      showLoginRequired,
      isMonitoringActive,
      overviewTotals,
      topActionsToday,
      timelineSummary,
      timelineItems,
      usersByRole,
      actionDistribution,
      adminActivity,
      riskIndicators,
      riskScore,
      cacheStatus,
      cacheHitRate,
      formatDate,
      exportDashboard,
      refresh,
      startMonitoring,
      stopMonitoring,
      analyzeThreats,
      simulateEvent,
      openLoginModal
    };
  }
};
</script>
