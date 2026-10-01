<template>
  <div class="grid gap-4">
    <template v-if="loading">
      <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
        <div class="h-3 w-24 bg-slate-200 dark:bg-slate-700/50 rounded mb-4"></div>
        <div class="flex items-center justify-between">
          <div class="h-8 w-16 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
          <div class="h-8 w-8 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
          <div class="h-3 w-20 bg-slate-200 dark:bg-slate-700/50 rounded mb-4"></div>
          <div class="flex items-center justify-between">
            <div class="h-6 w-12 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
            <div class="h-6 w-6 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
          <div class="h-3 w-20 bg-slate-200 dark:bg-slate-700/50 rounded mb-4"></div>
          <div class="flex items-center justify-between">
            <div class="h-6 w-12 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
            <div class="h-6 w-6 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <StatCard :label="tf('message.audit.stats_total', 'Total Logs')" :value="totalCount" icon-class="bi bi-journal-text text-2xl text-cyan-500" value-class="text-3xl font-black text-slate-900 dark:text-white" />
      <div class="grid grid-cols-2 gap-4">
        <StatCard :label="tf('message.audit.stats_success', 'Success')" :value="successCount" icon-class="bi bi-check-circle text-xl text-emerald-500" value-class="text-2xl font-black text-slate-900 dark:text-white" />
        <StatCard :label="tf('message.audit.stats_issues', 'Issues')" :value="issueCount" icon-class="bi bi-exclamation-triangle text-xl text-amber-500" value-class="text-2xl font-black text-slate-900 dark:text-white" />
      </div>
    </template>
  </div>
</template>

<script setup>
import StatCard from '/vue/components/StatCard.vue';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  totalCount: {
    type: [String, Number],
    default: 0
  },
  successCount: {
    type: [String, Number],
    default: 0
  },
  issueCount: {
    type: [String, Number],
    default: 0
  }
});

const { tf } = useI18nFallback();
</script>
