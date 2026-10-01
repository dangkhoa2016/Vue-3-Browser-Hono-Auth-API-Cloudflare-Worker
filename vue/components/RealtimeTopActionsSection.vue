<template>
    <section class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ tf('message.realtime_monitoring.top_actions_today', 'Top Actions Today') }}</h3>
        <div class="space-y-3">
          <div
            v-for="item in actions"
            :key="item.action"
            class="rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 p-4"
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-800 dark:text-slate-100 uppercase">{{ item.action }}</span>
              <span class="text-xl font-black text-violet-600 dark:text-violet-400">{{ item.count }}</span>
            </div>
          </div>
          <div v-if="actions.length === 0" class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.no_action_data', 'No action data.') }}</div>
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] space-y-4">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.realtime_monitoring.timeline_summary', 'Timeline Summary') }}</h3>
        <div class="space-y-3">
          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.timeline_total_events', 'Total Events') }}</p>
            <p class="text-2xl font-black text-cyan-600 dark:text-cyan-400">{{ timeline.totalEvents || 0 }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.timeline_total_failures', 'Total Failures') }}</p>
            <p class="text-2xl font-black text-rose-600 dark:text-rose-400">{{ timeline.totalFailures || 0 }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ tf('message.realtime_monitoring.timeline_avg_per_hour', 'Avg / Hour') }}</p>
            <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ timeline.avgEventsPerHour || 0 }}</p>
          </div>
        </div>
      </div>
    </section>
</template>

<script setup>
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

defineProps({
  actions: { type: Array, default: () => [] },
  timeline: { type: Object, default: () => ({}) }
});

const { tf } = useI18nFallback();
</script>
