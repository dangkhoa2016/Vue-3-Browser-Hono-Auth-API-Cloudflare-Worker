<template>
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
            @click="$emit('create-rule')"
          >
            {{ tf('message.realtime_monitoring.create_rule', 'Create Rule') }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
            @click="$emit('create-channel')"
          >
            {{ tf('message.realtime_monitoring.create_channel', 'Create Channel') }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
            @click="$emit('test-alerts')"
          >
            {{ tf('message.realtime_monitoring.test_alerts', 'Test Alerts') }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
            @click="$emit('clear-cache')"
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
</template>

<script setup>
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

defineProps({
  isSuperAdmin: { type: Boolean, default: false },
  performanceSummary: { type: Object, required: true },
  latestIncident: { type: Object, default: null },
  latestAnalysis: { type: Object, default: null },
  latestAnalysisSummary: { type: Object, required: true },
  latestAnalysisThreats: { type: Array, default: () => [] },
  formatDate: { type: Function, required: true }
});

defineEmits(['create-rule', 'create-channel', 'test-alerts', 'clear-cache']);

const { tf } = useI18nFallback();
</script>
