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
                v-if="isSuperAdmin && !isMonitoringActive"
                icon="bi bi-play-fill"
                tone="emerald"
                shape="full"
                :disabled="actionLoading"
                @click="startMonitoring"
              >
                {{ tf('message.realtime_monitoring.start', 'Start') }}
              </ActionTextButton>

              <ActionTextButton
                v-else-if="isSuperAdmin"
                icon="bi bi-stop-fill"
                tone="rose"
                shape="full"
                :disabled="actionLoading"
                @click="stopMonitoring"
              >
                {{ tf('message.realtime_monitoring.stop', 'Stop') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-bar-chart"
                tone="indigo"
                shape="full"
                :disabled="actionLoading"
                @click="analyzeThreats"
              >
                {{ tf('message.realtime_monitoring.analyze', 'Analyze Last 1h') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-lightning-charge"
                tone="indigo"
                shape="full"
                :disabled="actionLoading"
                @click="simulateEvent"
              >
                {{ tf('message.realtime_monitoring.simulate', 'Simulate Event') }}
              </ActionTextButton>

              <ActionTextButton
                icon="bi bi-broadcast-pin"
                tone="sky"
                shape="full"
                :disabled="actionLoading"
                @click="refreshRecentEvents"
              >
                {{ tf('message.realtime_monitoring.refresh_events', 'Recent Events') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-bell"
                tone="amber"
                shape="full"
                :disabled="actionLoading"
                @click="testAlerts"
              >
                {{ tf('message.realtime_monitoring.test_alerts', 'Test Alerts') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-trash3"
                tone="rose"
                shape="full"
                :disabled="actionLoading"
                @click="clearCache"
              >
                {{ tf('message.realtime_monitoring.clear_cache', 'Clear Cache') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-exclamation-octagon"
                tone="slate"
                shape="full"
                :disabled="actionLoading"
                @click="createIncident"
              >
                {{ tf('message.realtime_monitoring.create_incident', 'Create Incident') }}
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
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.timeline_total_failures', 'Total Failures') }}</p>
              <p class="text-2xl font-black text-rose-600 dark:text-rose-400">{{ timelineSummary.totalFailures || 0 }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.timeline_avg_per_hour', 'Avg / Hour') }}</p>
              <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ timelineSummary.avgEventsPerHour || 0 }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.realtime_monitoring.recent_events_title', 'Recent Events') }}</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.recent_events_subtitle', 'Latest activity stream exposed by the monitoring service.') }}</p>
            </div>
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
              {{ tf('message.realtime_monitoring.recent_events_count', '{count} events', { count: recentEventCount }) }}
            </div>
          </div>

          <div class="overflow-x-auto max-h-96">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                <tr>
                  <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.event_label', 'Event') }}</th>
                  <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.severity_label', 'Severity') }}</th>
                  <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.source_label', 'Source') }}</th>
                  <th class="px-4 py-3 text-right">{{ tf('message.realtime_monitoring.time_label', 'Time') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in recentEventItems"
                  :key="item.id || item.eventId || `${item.timestamp || item.createdAt || 'event'}-${index}`"
                  class="border-t border-slate-100 dark:border-slate-800"
                >
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-200">
                    <div class="font-semibold uppercase">{{ item.eventType || item.type || item.category || tf('message.realtime_monitoring.event_fallback', 'event') }}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ item.description || item.message || item.details || tf('message.realtime_monitoring.empty_value', '-') }}</div>
                  </td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-200 uppercase">{{ item.severity || item.level || tf('message.realtime_monitoring.empty_value', '-') }}</td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-200">{{ item.source || item.actor || item.ipAddress || tf('message.realtime_monitoring.empty_value', '-') }}</td>
                  <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ formatDate(item.timestamp || item.createdAt) }}</td>
                </tr>
                <tr v-if="recentEventItems.length === 0">
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.no_recent_events', 'No recent events.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] space-y-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.realtime_monitoring.ops_controls_title', 'Ops Controls') }}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ isSuperAdmin
                ? tf('message.realtime_monitoring.ops_controls_subtitle', 'Quick actions for alerting and dashboard maintenance.')
                : tf('message.realtime_monitoring.super_admin_controls_only', 'Operational controls require super admin privileges.') }}
            </p>
          </div>

          <div v-if="isSuperAdmin" class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
              @click="createAlertRule"
            >
              {{ tf('message.realtime_monitoring.create_rule', 'Create Rule') }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
              @click="createAlertChannel"
            >
              {{ tf('message.realtime_monitoring.create_channel', 'Create Channel') }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
              @click="testAlerts"
            >
              {{ tf('message.realtime_monitoring.test_alerts', 'Test Alerts') }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
              @click="clearCache"
            >
              {{ tf('message.realtime_monitoring.clear_cache', 'Clear Cache') }}
            </button>
          </div>

          <div v-else class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-300">
            {{ tf('message.realtime_monitoring.super_admin_controls_only', 'Operational controls require super admin privileges.') }}
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.avg_response', 'Avg Response') }}</p>
              <p class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ performanceSummary.averageDurationMs.toFixed(1) }} ms</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.total_events', 'Total Logs') }}</p>
              <p class="text-xl font-black text-violet-600 dark:text-violet-400">{{ performanceSummary.totalLogs }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.avg_per_hour', 'Event Rate') }}</p>
              <p class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ performanceSummary.eventRate.toFixed(2) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.cache_hit', 'Cache Hit') }}</p>
              <p class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ performanceSummary.cacheHitRate }}%</p>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.performance_window', 'Performance Window') }}</p>
            <p class="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ performanceSummary.periodDescription || tf('message.realtime_monitoring.health_unknown', 'unknown') }}</p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ formatDate(performanceSummary.periodStart) }}</p>
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.cache_entries', 'Cache size') }}: {{ performanceSummary.cacheSize }} · {{ tf('message.realtime_monitoring.estimated_size', 'Estimated size') }}: {{ performanceSummary.estimatedSizeKB }} KB</p>
          </div>

          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.latest_incident', 'Latest Incident') }}</p>
            <p class="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ latestIncident?.description || latestIncident?.message || tf('message.realtime_monitoring.no_latest_incident', 'No manual incident created in this session.') }}</p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ formatDate(latestIncident?.createdAt || latestIncident?.timestamp) }}</p>
          </div>

          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.latest_analysis', 'Latest Analysis') }}</p>
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ latestAnalysisSummary.threatsDetected }} {{ tf('message.realtime_monitoring.threats_detected', 'threats') }}</span>
            </div>

            <template v-if="latestAnalysis">
              <div class="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.total_events', 'Events') }}</p>
                  <p class="font-bold text-slate-800 dark:text-slate-100">{{ latestAnalysisSummary.eventCount }}</p>
                </div>
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.threats_detected', 'Threats') }}</p>
                  <p class="font-bold text-slate-800 dark:text-slate-100">{{ latestAnalysisSummary.threatsDetected }}</p>
                </div>
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.period_label', 'Period') }}</p>
                  <p class="font-bold text-slate-800 dark:text-slate-100">1h</p>
                </div>
              </div>

              <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">{{ formatDate(latestAnalysisSummary.startTime) }} - {{ formatDate(latestAnalysisSummary.endTime) }}</p>

              <ul class="mt-3 space-y-2">
                <li
                  v-for="item in latestAnalysisThreats"
                  :key="item.id || item.ruleId"
                  class="flex items-start justify-between gap-3 rounded-lg border border-slate-200/70 dark:border-slate-700 px-3 py-2"
                >
                  <div>
                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ item.ruleName || item.threatType || item.ruleId }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.description || tf('message.realtime_monitoring.no_description', 'No description') }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">{{ item.severity || tf('message.realtime_monitoring.empty_value', '-') }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatDate(item.detectedAt) }}</p>
                  </div>
                </li>
              </ul>
            </template>

            <p v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.no_analysis_run', 'No analysis has been run in this session yet.') }}</p>
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

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.realtime_monitoring.alert_rules_title', 'Alert Rules') }}</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.alert_rules_subtitle', 'Rule engine status and per-rule toggle controls.') }}</p>
            </div>
            <div class="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {{ tf('message.realtime_monitoring.enabled_summary', '{enabled} / {total} enabled', { enabled: alertRuleSummary.enabled, total: alertRuleSummary.total }) }}
            </div>
          </div>

          <div v-if="alertsRulesLoading" class="space-y-3">
            <div
              v-for="item in 4"
              :key="`alert-rules-skeleton-${item}`"
              class="animate-pulse rounded-xl border border-slate-200/70 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="space-y-2 flex-1">
                  <div class="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-3 w-64 rounded bg-slate-200 dark:bg-slate-700"></div>
                </div>
                <div class="h-7 w-20 rounded-full bg-slate-200 dark:bg-slate-700"></div>
              </div>
            </div>
          </div>

          <div v-else class="overflow-x-auto max-h-96">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                <tr>
                  <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.rule_label', 'Rule') }}</th>
                  <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.severity_label', 'Severity') }}</th>
                  <th class="px-4 py-3 text-right">{{ tf('message.realtime_monitoring.triggers_label', 'Triggers') }}</th>
                  <th class="px-4 py-3 text-right">{{ tf('message.realtime_monitoring.status', 'Status') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in alertRuleItems" :key="item.id || item.name" class="border-t border-slate-100 dark:border-slate-800">
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-200">
                    <div class="font-semibold">{{ item.name || item.id }}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ item.description || tf('message.realtime_monitoring.no_description', 'No description') }}</div>
                  </td>
                  <td class="px-4 py-3 uppercase text-slate-700 dark:text-slate-200">{{ item.severity || tf('message.realtime_monitoring.empty_value', '-') }}</td>
                  <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.stats?.triggered || item.stats?.triggerCount || item.stats?.totalTriggered || 0 }}</td>
                  <td class="px-4 py-3 text-right">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="rounded-full px-3 py-1 text-xs font-bold uppercase transition"
                      :class="item.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
                      :disabled="alertsRulesLoading || actionLoading"
                      @click="toggleAlertRule(item)"
                    >
                      {{ item.enabled ? tf('message.realtime_monitoring.enabled', 'Enabled') : tf('message.realtime_monitoring.disabled', 'Disabled') }}
                    </button>
                    <span
                      v-else
                      class="rounded-full px-3 py-1 text-xs font-bold uppercase"
                      :class="item.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
                    >
                      {{ item.enabled ? tf('message.realtime_monitoring.enabled', 'Enabled') : tf('message.realtime_monitoring.disabled', 'Disabled') }}
                    </span>
                  </td>
                </tr>
                <tr v-if="alertRuleItems.length === 0">
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.no_alert_rules', 'No alert rules.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.realtime_monitoring.alert_channels_title', 'Alert Channels') }}</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.alert_channels_subtitle', 'Delivery channels configured on the monitoring backend.') }}</p>
            </div>
            <div class="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {{ tf('message.realtime_monitoring.enabled_summary', '{enabled} / {total} enabled', { enabled: alertChannelSummary.enabled, total: alertChannelSummary.total }) }}
            </div>
          </div>

          <ul class="space-y-3">
            <li
              v-for="item in alertChannelItems"
              :key="item.id || item.name"
              class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-800 dark:text-slate-100">{{ item.name || item.id }}</p>
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mt-1">{{ item.type || tf('message.realtime_monitoring.channel_fallback', 'channel') }}</p>
                </div>
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-bold uppercase"
                  :class="item.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
                >
                  {{ item.enabled ? tf('message.realtime_monitoring.enabled', 'Enabled') : tf('message.realtime_monitoring.disabled', 'Disabled') }}
                </span>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.sent_label', 'Sent') }}</p>
                  <p class="font-bold text-slate-800 dark:text-slate-100">{{ item.stats?.alertsSent || item.stats?.sent || item.stats?.delivered || item.stats?.totalSent || 0 }}</p>
                </div>
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.last_used_label', 'Last Used') }}</p>
                  <p class="font-bold text-slate-800 dark:text-slate-100">{{ formatDate(item.lastUsed) }}</p>
                </div>
              </div>
            </li>
            <li v-if="alertChannelItems.length === 0" class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.no_alert_channels', 'No alert channels.') }}</li>
          </ul>
        </div>
      </section>

      <ModalWindow
        :show="showCreateRuleModal"
        :title="tf('message.realtime_monitoring.create_rule', 'Create Rule')"
        :subtitle="tf('message.realtime_monitoring.prompt_rule_description_default', 'Created from realtime monitoring UI')"
        panel-class="max-w-2xl w-full"
        @close="closeCreateAlertRuleModal"
      >
        <div class="p-6">
          <form @submit.prevent="submitCreateAlertRule">
            <fieldset :disabled="actionLoading" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_rule_name', 'Rule name') }}</label>
                <input
                  v-model="createRuleForm.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_rule_description', 'Rule description') }}</label>
                <textarea
                  v-model="createRuleForm.description"
                  rows="3"
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                ></textarea>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_severity', 'Severity (low, medium, high, critical)') }}</label>
                  <select
                    v-model="createRuleForm.severity"
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_condition_pattern', 'Condition pattern') }}</label>
                  <input
                    v-model="createRuleForm.condition"
                    type="text"
                    required
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                  >
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.cooldown_label', 'Cooldown (seconds)') }}</label>
                  <input
                    v-model.number="createRuleForm.cooldown"
                    type="number"
                    min="0"
                    step="1"
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                  >
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.alert_channels_title', 'Alert Channels') }}</label>
                  <div class="grid grid-cols-1 gap-2 rounded-lg border border-slate-200/70 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3">
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input v-model="createRuleForm.channels" type="checkbox" value="email" class="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
                      <span>email</span>
                    </label>
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input v-model="createRuleForm.channels" type="checkbox" value="webhook" class="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
                      <span>webhook</span>
                    </label>
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input v-model="createRuleForm.channels" type="checkbox" value="slack" class="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
                      <span>slack</span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-300">
                {{ tf('message.realtime_monitoring.enabled_summary', '{enabled} / {total} enabled', { enabled: createRuleForm.channels.length, total: createRuleForm.channels.length }) }} · {{ createRuleForm.channels.join(', ') || 'email' }} · cooldown {{ createRuleForm.cooldown || 0 }}s
              </div>

              <div v-if="createRuleError" class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                {{ createRuleError }}
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <ActionTextButton tone="slate" type="button" @click="closeCreateAlertRuleModal">
                  {{ tf('message.common.cancel', 'Cancel') }}
                </ActionTextButton>
                <ActionTextButton tone="sky" type="submit" icon="bi bi-plus-circle" :disabled="actionLoading">
                  {{ tf('message.realtime_monitoring.create_rule', 'Create Rule') }}
                </ActionTextButton>
              </div>
            </fieldset>
          </form>
        </div>
      </ModalWindow>

      <ConfirmModal
        :show="showToggleRuleModal"
        :title="pendingToggleRule?.enabled
          ? tf('message.realtime_monitoring.disable_rule_confirm_title', 'Disable rule?')
          : tf('message.realtime_monitoring.enable_rule_confirm_title', 'Enable rule?')"
        :message="pendingToggleRule?.enabled
          ? tf('message.realtime_monitoring.disable_rule_confirm_message', 'This will stop the selected rule from triggering alerts until you enable it again.')
          : tf('message.realtime_monitoring.enable_rule_confirm_message', 'This will allow the selected rule to trigger alerts again.')"
        :confirm-text="pendingToggleRule?.enabled
          ? tf('message.realtime_monitoring.disable_rule_action', 'Disable Rule')
          : tf('message.realtime_monitoring.enable_rule_action', 'Enable Rule')"
        :cancel-text="tf('message.common.cancel', 'Cancel')"
        icon="bi bi-toggle-on"
        icon-bg-class="bg-amber-100 dark:bg-amber-900/30"
        icon-color-class="text-amber-600 dark:text-amber-400"
        :confirm-button-class="pendingToggleRule?.enabled
          ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
          : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'"
        @confirm="confirmToggleAlertRule"
        @cancel="closeToggleRuleModal"
      />

      <ModalWindow
        :show="showCreateChannelModal"
        :title="tf('message.realtime_monitoring.create_channel', 'Create Channel')"
        :subtitle="tf('message.realtime_monitoring.alert_channels_subtitle', 'Delivery channels configured on the monitoring backend.')"
        panel-class="max-w-2xl w-full"
        @close="closeCreateAlertChannelModal"
      >
        <div class="p-6">
          <form @submit.prevent="submitCreateAlertChannel">
            <fieldset :disabled="actionLoading" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_channel_name', 'Channel name') }}</label>
                <input
                  v-model="createChannelForm.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                >
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_channel_type', 'Channel type (email, webhook, slack)') }}</label>
                  <select
                    v-model="createChannelForm.type"
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="email">email</option>
                    <option value="webhook">webhook</option>
                    <option value="slack">slack</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_channel_target', 'Channel target') }}</label>
                  <input
                    v-model="createChannelForm.target"
                    type="text"
                    required
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                  >
                </div>
              </div>

              <div v-if="createChannelError" class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                {{ createChannelError }}
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <ActionTextButton tone="slate" type="button" @click="closeCreateAlertChannelModal">
                  {{ tf('message.common.cancel', 'Cancel') }}
                </ActionTextButton>
                <ActionTextButton tone="sky" type="submit" icon="bi bi-plus-circle" :disabled="actionLoading">
                  {{ tf('message.realtime_monitoring.create_channel', 'Create Channel') }}
                </ActionTextButton>
              </div>
            </fieldset>
          </form>
        </div>
      </ModalWindow>

      <ModalWindow
        :show="showClearCacheModal"
        :title="tf('message.realtime_monitoring.clear_cache', 'Clear Cache')"
        :subtitle="tf('message.realtime_monitoring.confirm_clear_cache', 'Clear {label}?', { label: tf('message.realtime_monitoring.all_dashboard_cache', 'all dashboard cache') })"
        panel-class="max-w-xl w-full"
        @close="closeClearCacheModal"
      >
        <div class="p-6">
          <form @submit.prevent="submitClearCache">
            <fieldset :disabled="actionLoading" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_cache_key', 'Cache key to clear. Leave blank to clear all.') }}</label>
                <input
                  v-model="clearCacheForm.key"
                  type="text"
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                >
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{{ clearCacheForm.key || tf('message.realtime_monitoring.all_dashboard_cache', 'all dashboard cache') }}</p>
              </div>

              <div v-if="clearCacheError" class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                {{ clearCacheError }}
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <ActionTextButton tone="slate" type="button" @click="closeClearCacheModal">
                  {{ tf('message.common.cancel', 'Cancel') }}
                </ActionTextButton>
                <ActionTextButton tone="rose" type="submit" icon="bi bi-trash3" :disabled="actionLoading">
                  {{ tf('message.realtime_monitoring.clear_cache', 'Clear Cache') }}
                </ActionTextButton>
              </div>
            </fieldset>
          </form>
        </div>
      </ModalWindow>

      <ModalWindow
        :show="showCreateIncidentModal"
        :title="tf('message.realtime_monitoring.create_incident', 'Create Incident')"
        :subtitle="tf('message.realtime_monitoring.prompt_incident_description_default', 'Manual incident created from monitoring UI')"
        panel-class="max-w-2xl w-full"
        @close="closeCreateIncidentModal"
      >
        <div class="p-6">
          <form @submit.prevent="submitCreateIncident">
            <fieldset :disabled="actionLoading" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_incident_description', 'Incident description') }}</label>
                <textarea
                  v-model="createIncidentForm.description"
                  rows="4"
                  required
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                ></textarea>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_incident_severity', 'Incident severity (low, medium, high, critical)') }}</label>
                  <select
                    v-model="createIncidentForm.severity"
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_incident_type', 'Incident type') }}</label>
                  <input
                    v-model="createIncidentForm.type"
                    type="text"
                    required
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                  >
                </div>
              </div>

              <div v-if="createIncidentError" class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                {{ createIncidentError }}
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <ActionTextButton tone="slate" type="button" @click="closeCreateIncidentModal">
                  {{ tf('message.common.cancel', 'Cancel') }}
                </ActionTextButton>
                <ActionTextButton tone="slate" type="submit" icon="bi bi-exclamation-octagon" :disabled="actionLoading">
                  {{ tf('message.realtime_monitoring.create_incident', 'Create Incident') }}
                </ActionTextButton>
              </div>
            </fieldset>
          </form>
        </div>
      </ModalWindow>
      </template>
    </template>
    </template>
  </div>
</template>

<script setup>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import ConfirmModal from '/vue/components/ConfirmModal.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import ModalWindow from '/vue/components/ModalWindow.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useAdminRealtimeMonitoringPage } from '/vue/composables/useAdminRealtimeMonitoringPage.js';

const {
  actionDistribution,
  actionLoading,
  adminActivity,
  analyzeThreats,
  alertChannelItems,
  alertChannelSummary,
  alertRuleItems,
  alertsRulesLoading,
  alertRuleSummary,
  cacheHitRate,
  cacheStatus,
  clearCache,
  clearCacheError,
  clearCacheForm,
  closeClearCacheModal,
  createAlertChannel,
  createAlertRule,
  createChannelError,
  createChannelForm,
  createIncidentError,
  createIncidentForm,
  createRuleError,
  createRuleForm,
  createIncident,
  dataTimestamp,
  error,
  exportDashboard,
  formatDate,
  heroSectionClass,
  isAdmin,
  isSuperAdmin,
  isMonitoringActive,
  latestIncident,
  latestAnalysis,
  latestAnalysisSummary,
  latestAnalysisThreats,
  latestSimulation,
  loading,
  closeCreateAlertChannelModal,
  closeCreateAlertRuleModal,
  closeCreateIncidentModal,
  closeToggleRuleModal,
  confirmToggleAlertRule,
  openLoginModal,
  overviewTotals,
  pendingToggleRule,
  performanceSummary,
  recentEventCount,
  recentEventItems,
  refresh,
  refreshRecentEvents,
  riskIndicators,
  riskScore,
  security,
  showLoginRequired,
  showClearCacheModal,
  showCreateChannelModal,
  showCreateIncidentModal,
  showCreateRuleModal,
  showToggleRuleModal,
  simulateEvent,
  startMonitoring,
  stopMonitoring,
  submitClearCache,
  submitCreateAlertChannel,
  submitCreateIncident,
  submitCreateAlertRule,
  testAlerts,
  tf,
  timelineItems,
  timelineSummary,
  toggleAlertRule,
  topActionsToday,
  usersByRole
} = useAdminRealtimeMonitoringPage();
</script>
