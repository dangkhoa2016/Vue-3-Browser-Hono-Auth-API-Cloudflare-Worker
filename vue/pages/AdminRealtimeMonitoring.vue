<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="blue"
      :title="tf(['message.audit.login_required', 'message.auth.login_required'], 'Login required')"
      :message="tf(['message.audit.login_required_message', 'message.auth.login_required_message'], 'Please login to continue.')"
      :button-text="tf('message.auth.login', 'Login')"
      @action="openLoginModal"
    />

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-24 -right-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-violet-900/10 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-violet-500"></span>
              {{ tf('message.realtime_monitoring.badge', 'Realtime Monitoring') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ tf('message.navbar.realtime_monitoring', 'Realtime Monitoring') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ tf('message.realtime_monitoring.subtitle', 'Real-time analytics dashboard from audit, user behavior, and security activity.') }}
            </p>
            <p class="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{{ formatDate(dataTimestamp) }}</p>

            <div class="mt-6 flex flex-wrap gap-3">
              <ActionTextButton
                variant="soft"
                icon="bi bi-arrow-clockwise"
                shape="full"
                :disabled="loading"
                @click="refresh"
              >
                  {{ tf('message.refresh', 'Refresh') }}
              </ActionTextButton>

              <ActionTextButton
                variant="soft"
                icon="bi bi-download"
                shape="full"
                :disabled="actionLoading"
                @click="exportDashboard"
              >
                  {{ tf('message.realtime_monitoring.export', 'Export') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="!isMonitoringActive"
                icon="bi bi-play-fill"
                tone="emerald"
                shape="full"
                :disabled="actionLoading"
                @click="startMonitoring"
              >
                {{ tf('message.realtime_monitoring.start', 'Start') }}
              </ActionTextButton>

              <ActionTextButton
                v-else
                icon="bi bi-stop-fill"
                tone="rose"
                shape="full"
                :disabled="actionLoading"
                @click="stopMonitoring"
              >
                {{ tf('message.realtime_monitoring.stop', 'Stop') }}
              </ActionTextButton>

              <ActionTextButton
                icon="bi bi-bar-chart"
                tone="indigo"
                shape="full"
                :disabled="actionLoading"
                @click="analyzeThreats"
              >
                {{ tf('message.realtime_monitoring.analyze', 'Analyze Last 1h') }}
              </ActionTextButton>

              <ActionTextButton
                icon="bi bi-lightning-charge"
                tone="indigo"
                shape="full"
                :disabled="actionLoading"
                @click="simulateEvent"
              >
                {{ tf('message.realtime_monitoring.simulate', 'Simulate Event') }}
              </ActionTextButton>
            </div>
          </div>
        </template>

        <template #right>
          <div class="grid grid-cols-2 gap-4">
            <template v-if="loading">
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
            </template>

            <template v-else>
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
            </template>
          </div>
        </template>
      </PageHeroSection>

      <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ tf('message.realtime_monitoring.access_denied_title', 'Access denied') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ tf('message.realtime_monitoring.access_denied_message', 'Only admin and super admin can access this page.') }}</p>
      </section>

      <template v-else>
      <section v-if="error" class="rounded-[18px] border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-rose-700 dark:text-rose-300">
        <div class="flex items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>{{ error }}</span>
        </div>
      </section>

      <template v-if="loading">
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
          <div v-for="item in 2" :key="`skeleton-table-top-${item}`" class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6">
            <div class="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
            <div class="space-y-2">
              <div v-for="row in 5" :key="`skeleton-table-top-row-${item}-${row}`" class="h-10 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-2 animate-pulse">
          <div v-for="item in 2" :key="`skeleton-table-bottom-${item}`" class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6">
            <div class="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
            <div class="space-y-2">
              <div v-for="row in 5" :key="`skeleton-table-bottom-row-${item}-${row}`" class="h-10 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
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

<script setup>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useAdminRealtimeMonitoringPage } from '/vue/composables/useAdminRealtimeMonitoringPage.js';

const {
  actionDistribution,
  actionLoading,
  adminActivity,
  analyzeThreats,
  cacheHitRate,
  cacheStatus,
  dataTimestamp,
  error,
  exportDashboard,
  formatDate,
  heroSectionClass,
  isAdmin,
  isMonitoringActive,
  latestAnalysis,
  latestSimulation,
  loading,
  openLoginModal,
  overviewTotals,
  refresh,
  riskIndicators,
  riskScore,
  security,
  showLoginRequired,
  simulateEvent,
  startMonitoring,
  stopMonitoring,
  tf,
  timelineItems,
  timelineSummary,
  topActionsToday,
  usersByRole
} = useAdminRealtimeMonitoringPage();
</script>
