<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <template v-if="showLoginRequired">
      <section class="bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-lock-fill text-5xl text-emerald-600 dark:text-emerald-400 mb-4"></i>
        <h3 class="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">{{ $t('message.auth.login_required') }}</h3>
        <p class="text-emerald-700 dark:text-emerald-300 mb-4">{{ $t('message.system_health.login_required_message') }}</p>
        <button
          @click="openLoginModal"
          class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
        >
          <i class="bi bi-box-arrow-in-right text-lg"></i>
          {{ $t('message.auth.login') }}
        </button>
      </section>
    </template>

    <template v-else>
      <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]">
        <div class="absolute -top-20 -right-16 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div class="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-emerald-900/10 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full" :class="statusDotClass"></span>
              {{ $t('message.system_health.badge') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.navbar.system_health') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.system_health.subtitle') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <button
                class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition"
                :disabled="loading"
                @click="refresh"
              >
                <i class="bi bi-arrow-clockwise"></i>
                {{ $t('message.refresh') }}
              </button>
              <span class="text-xs uppercase tracking-[0.2em] text-slate-400">
                {{ $t('message.system_health.last_updated') }}: {{ formatDate(lastUpdatedLabel) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_health.overall_status') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-xl font-black" :class="statusTextClass">{{ statusText }}</span>
                <i class="bi bi-heart-pulse text-2xl" :class="statusTextClass"></i>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_health.response_time') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-xl font-black text-slate-900 dark:text-white">{{ responseTime }}</span>
                <i class="bi bi-speedometer2 text-2xl text-cyan-500"></i>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_health.environment') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-xl font-black text-slate-900 dark:text-white">{{ environment }}</span>
                <i class="bi bi-cloud text-2xl text-sky-500"></i>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_health.health_checks') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-xl font-black text-slate-900 dark:text-white">{{ healthChecks.length }}</span>
                <i class="bi bi-clipboard2-check text-2xl text-emerald-500"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.system_health.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.system_health.access_denied_message') }}</p>
      </section>

      <section v-else class="space-y-6">
        <div v-if="loading" class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 space-y-4 animate-pulse">
          <div v-for="item in 6" :key="item" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
        </div>

        <div v-else-if="error" class="rounded-[28px] border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-6 text-rose-700 dark:text-rose-300">
          <div class="flex items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>{{ error }}</span>
          </div>
        </div>

        <div v-else-if="!hasData" class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-10 text-center">
          <i class="bi bi-emoji-neutral text-4xl text-slate-400 mb-3"></i>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.system_health.empty_title') }}</h3>
          <p class="text-slate-500 dark:text-slate-400">{{ $t('message.system_health.empty_message') }}</p>
        </div>

        <template v-else>
          <div class="grid gap-6 lg:grid-cols-2">
            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.database_title') }}</h2>
              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.connected') }}</p>
                  <p class="text-xl font-black" :class="databaseConnectedClass">{{ databaseConnectedText }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.sqlite_version') }}</p>
                  <p class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ sqliteVersion }}</p>
                </div>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.tables_info') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ databaseInfo.tableCount }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.tables_metrics') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ databaseStructure.totalTables }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.total_indexes') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ databaseStructure.totalIndexes }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.db_query_response') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbPerformance.queryResponseTime }}</span>
                </div>
              </div>
            </section>

            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.system_title') }}</h2>
              <div class="space-y-3">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_health.statistics') }}</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-500">{{ $t('message.system_health.total_users') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.totalUsers }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.active_users') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.activeUsers }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.inactive_users') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.inactiveUsers }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.suspended_users') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.suspendedUsers }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.recent_registrations') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.recentRegistrations }}</div>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_health.performance') }}</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-500">{{ $t('message.system_health.api_response') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ performance.responseTime }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.database_response') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ performance.databaseResponseTime }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.performance_grade') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right uppercase">{{ performance.performanceGrade }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.performant') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ performance.isPerformant ? $t('message.system_health.yes') : $t('message.system_health.no') }}</div>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_health.security') }}</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-500">{{ $t('message.system_health.recent_failed_logins') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ security.recentFailedLogins }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.total_failed_attempts') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ security.totalFailedAttempts }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.ips_with_failures') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ security.uniqueIpsWithFailures }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.risk_level') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right uppercase">{{ security.riskLevel }}</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.database_indexes_by_table') }}</h2>
              <div class="overflow-x-auto max-h-80">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left">{{ $t('message.system_health.table') }}</th>
                      <th class="px-4 py-3 text-right">{{ $t('message.system_health.index_count') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in databaseStructure.tables" :key="item.table_name" class="border-t border-slate-100 dark:border-slate-800">
                      <td class="px-4 py-3 text-slate-700 dark:text-slate-200 font-mono text-xs">{{ item.table_name }}</td>
                      <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.index_count }}</td>
                    </tr>
                    <tr v-if="databaseStructure.tables.length === 0">
                      <td colspan="2" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">{{ $t('message.system_health.no_table_index_metrics') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] space-y-4">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.system_health.users_by_role') }}</h2>
              <div class="grid grid-cols-3 gap-3">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.role_super_admin') }}</p>
                  <p class="text-xl font-black text-violet-600 dark:text-violet-400">{{ roleCounts.super_admin }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.role_admin') }}</p>
                  <p class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ roleCounts.admin }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.role_user') }}</p>
                  <p class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ roleCounts.user }}</p>
                </div>
              </div>

              <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.system_health.database_user_metrics') }}</h2>
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.total_records') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbUsers.totalRecords }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.active_users') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbUsers.activeUsers }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.recent_users_24h') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbUsers.recentUsers24h }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.recent_activity_1h') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbUsers.recentActivity1h }}</span>
                </div>
              </div>
            </section>
          </div>

          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.health_checks_title') }}</h2>
            <div class="space-y-3">
              <div
                v-for="item in healthChecks"
                :key="`${item.name}-${item.status}`"
                class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="font-semibold uppercase text-slate-800 dark:text-slate-100">{{ item.name || '-' }}</div>
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                    :class="healthCheckStatusClass(item.status)"
                  >
                    {{ healthStatusText(item.status) }}
                  </span>
                </div>
              </div>
              <div v-if="healthChecks.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
                {{ $t('message.system_health.no_health_checks') }}
              </div>
            </div>
          </section>

          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.metadata') }}</h2>
            <div class="grid gap-4 md:grid-cols-2 text-sm">
              <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">{{ $t('message.system_health.checked_by_user') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ checkedBy.userId }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">{{ $t('message.system_health.checked_by_role') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100 uppercase">{{ checkedBy.role }}</span>
                </div>
              </div>
              <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">{{ $t('message.system_health.access_level') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100 uppercase">{{ metadata.accessLevel }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">{{ $t('message.system_health.super_admin_data') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ metadata.canViewSuperAdminData ? $t('message.system_health.yes') : $t('message.system_health.no') }}</span>
                </div>
              </div>
            </div>
          </section>
        </template>
      </section>
    </template>
  </div>
</template>

<script>
import { computed, onActivated, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { i18n } from '/assets/js/i18n.js';
import { useSystemHealthStore } from '/assets/js/stores/systemHealthStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';

export default {
  name: 'AdminSystemHealth',
  setup() {
    const systemHealthStore = useSystemHealthStore();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const mainStore = useMainStore();

    const { healthData, loading, error, lastUpdated } = storeToRefs(systemHealthStore);

    const isAuthenticated = computed(() => authStore.isAuthenticated);
    const role = computed(() => String(authStore.user?.role || '').toLowerCase());
    const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');
    const showLoginRequired = computed(() => !isAuthenticated.value);

    const status = computed(() => String(healthData.value?.status || '').toLowerCase());
    const t = (key) => i18n.global.t(key);
    const statusText = computed(() => {
      if (status.value === 'healthy') return t('message.system_health.status_healthy');
      if (status.value === 'unhealthy') return t('message.system_health.status_unhealthy');
      return t('message.system_health.status_unknown');
    });

    const statusDotClass = computed(() => {
      if (status.value === 'healthy') return 'bg-emerald-500';
      if (status.value === 'unhealthy') return 'bg-rose-500';
      return 'bg-slate-400';
    });

    const statusTextClass = computed(() => {
      if (status.value === 'healthy') return 'text-emerald-600 dark:text-emerald-400';
      if (status.value === 'unhealthy') return 'text-rose-600 dark:text-rose-400';
      return 'text-slate-600 dark:text-slate-300';
    });

    const responseTime = computed(() => String(healthData.value?.responseTime || '-'));
    const environment = computed(() => String(healthData.value?.environment || '-'));
    const healthChecks = computed(() => {
      const source = healthData.value?.healthChecks;
      if (Array.isArray(source)) {
        return source;
      }
      if (source && typeof source === 'object') {
        return Object.entries(source).map(([name, status]) => ({ name, status }));
      }
      return [];
    });

    const databaseConnected = computed(() => Boolean(healthData.value?.database?.isConnected));
    const databaseConnectedText = computed(() => (databaseConnected.value ? t('message.system_health.yes') : t('message.system_health.no')));
    const databaseConnectedClass = computed(() => (
      databaseConnected.value
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400'
    ));

    const sqliteVersion = computed(() => String(healthData.value?.database?.info?.version || '-'));

    const databaseInfo = computed(() => ({
      tableCount: Number(healthData.value?.database?.info?.tableCount) || 0,
      tables: Array.isArray(healthData.value?.database?.info?.tables) ? healthData.value.database.info.tables : []
    }));

    const dbPerformance = computed(() => ({
      queryResponseTime: String(healthData.value?.database?.metrics?.performance?.queryResponseTime || '-'),
      isResponsive: Boolean(healthData.value?.database?.metrics?.performance?.isResponsive),
      testQuerySuccess: Boolean(healthData.value?.database?.metrics?.performance?.testQuerySuccess)
    }));

    const databaseStructure = computed(() => ({
      tables: Array.isArray(healthData.value?.database?.metrics?.database?.tables) ? healthData.value.database.metrics.database.tables : [],
      totalTables: Number(healthData.value?.database?.metrics?.database?.totalTables) || 0,
      totalIndexes: Number(healthData.value?.database?.metrics?.database?.totalIndexes) || 0
    }));

    const dbUsers = computed(() => ({
      totalRecords: Number(healthData.value?.database?.metrics?.users?.totalRecords) || 0,
      activeUsers: Number(healthData.value?.database?.metrics?.users?.activeUsers) || 0,
      recentUsers24h: Number(
        healthData.value?.database?.metrics?.users?.recentUsers24h ??
        healthData.value?.database?.metrics?.users?.recentUsers
      ) || 0,
      recentActivity1h: Number(
        healthData.value?.database?.metrics?.users?.recentActivity1h ??
        healthData.value?.database?.metrics?.users?.recentActivity
      ) || 0
    }));

    const stats = computed(() => ({
      totalUsers: Number(healthData.value?.system?.statistics?.totalUsers) || 0,
      activeUsers: Number(healthData.value?.system?.statistics?.activeUsers) || 0,
      inactiveUsers: Number(healthData.value?.system?.statistics?.inactiveUsers) || 0,
      suspendedUsers: Number(healthData.value?.system?.statistics?.suspendedUsers) || 0,
      recentRegistrations: Number(healthData.value?.system?.statistics?.recentRegistrations) || 0
    }));

    const roleCounts = computed(() => ({
      super_admin: Number(healthData.value?.system?.statistics?.usersByRole?.super_admin) || 0,
      admin: Number(healthData.value?.system?.statistics?.usersByRole?.admin) || 0,
      user: Number(healthData.value?.system?.statistics?.usersByRole?.user) || 0
    }));

    const performance = computed(() => ({
      responseTime: String(
        healthData.value?.system?.performance?.responseTime ||
        healthData.value?.responseTime ||
        '-'
      ),
      databaseResponseTime: String(
        healthData.value?.system?.performance?.databaseResponseTime ||
        healthData.value?.database?.metrics?.performance?.queryResponseTime ||
        '-'
      ),
      isPerformant: Boolean(healthData.value?.system?.performance?.isPerformant),
      performanceGrade: String(healthData.value?.system?.performance?.performanceGrade || '-')
    }));

    const security = computed(() => ({
      recentFailedLogins: Number(
        healthData.value?.system?.security?.recentFailedLogins ??
        healthData.value?.database?.metrics?.security?.recentFailures
      ) || 0,
      totalFailedAttempts: Number(
        healthData.value?.system?.security?.totalFailedAttempts ??
        healthData.value?.database?.metrics?.security?.totalFailedAttempts
      ) || 0,
      uniqueIpsWithFailures: Number(
        healthData.value?.system?.security?.uniqueIpsWithFailures ??
        healthData.value?.database?.metrics?.security?.uniqueIpsWithFailures
      ) || 0,
      riskLevel: String(healthData.value?.system?.security?.riskLevel || '-')
    }));

    const metadata = computed(() => ({
      accessLevel: String(healthData.value?.metadata?.accessLevel || '-'),
      canViewSuperAdminData: Boolean(healthData.value?.metadata?.canViewSuperAdminData)
    }));

    const checkedBy = computed(() => ({
      userId: Number(healthData.value?.metadata?.checkedBy?.userId) || 0,
      role: String(healthData.value?.metadata?.checkedBy?.role || '-')
    }));

    const lastUpdatedLabel = computed(() => healthData.value?.timestamp || lastUpdated.value);
    const hasData = computed(() => Boolean(healthData.value));

    const formatDate = (value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString();
    };

    const healthStatusText = (value) => {
      const normalized = String(value || '').toLowerCase();
      if (normalized === 'healthy' || normalized === 'pass') return t('message.system_health.health_pass');
      if (normalized === 'warn') return t('message.system_health.health_warn');
      if (normalized === 'unhealthy' || normalized === 'fail') return t('message.system_health.health_fail');
      return normalized || t('message.system_health.health_unknown');
    };

    const healthCheckStatusClass = (value) => {
      const normalized = String(value || '').toLowerCase();
      if (normalized === 'healthy' || normalized === 'pass') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      if (normalized === 'warn') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      if (normalized === 'unhealthy' || normalized === 'fail') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    };

    const refresh = async () => {
      if (!isAuthenticated.value || !isAdmin.value) return;
      await systemHealthStore.fetchSystemHealth();
    };

    const loadInitial = async () => {
      if (!isAuthenticated.value || !isAdmin.value) return;
      await systemHealthStore.fetchSystemHealth();
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
      isAdmin,
      showLoginRequired,
      statusDotClass,
      statusText,
      statusTextClass,
      responseTime,
      environment,
      healthChecks,
      databaseInfo,
      dbPerformance,
      dbUsers,
      databaseStructure,
      databaseConnectedText,
      databaseConnectedClass,
      sqliteVersion,
      stats,
      roleCounts,
      performance,
      security,
      metadata,
      checkedBy,
      hasData,
      lastUpdatedLabel,
      formatDate,
      healthStatusText,
      healthCheckStatusClass,
      refresh,
      openLoginModal
    };
  }
};
</script>
