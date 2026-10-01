<template>
  <section class="mb-6 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/90 via-white to-rose-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20 p-6 shadow-sm">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase">
          <i class="bi bi-scissors"></i>
          {{ tf('message.audit.truncate_title', 'Safe Audit Truncate') }}
        </div>
        <h2 class="mt-4 text-xl font-black text-slate-900 dark:text-white">
          {{ tf('message.audit.truncate_heading', 'Archive live audit logs before deleting them') }}
        </h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {{ tf('message.audit.truncate_description', 'This action runs against the server endpoint that archives matching live audit logs into audit_logs_archive before deleting them from audit_logs. Always run a dry run first.') }}
        </p>
      </div>

      <div class="rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-white/80 dark:bg-slate-950/60 px-4 py-3 text-xs text-slate-600 dark:text-slate-300 lg:max-w-sm">
        <p class="font-semibold text-slate-900 dark:text-slate-100">
          {{ tf('message.audit.truncate_archive_required', 'Archive-first mode is always enforced by the API.') }}
        </p>
        <p class="mt-1">
          {{ tf('message.audit.truncate_confirm_note', 'Execution requires a successful preview and an explicit confirmation before data is removed from live storage.') }}
        </p>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_180px_auto]">
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {{ tf('message.audit.truncate_range_start', 'Start Date') }}
        </label>
        <input
          :value="startDate"
          type="date"
          class="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
          @input="$emit('update:startDate', $event.target.value)"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {{ tf('message.audit.truncate_range_end', 'End Date') }}
        </label>
        <input
          :value="endDate"
          type="date"
          class="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
          @input="$emit('update:endDate', $event.target.value)"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {{ tf('message.audit.truncate_batch_size', 'Batch Size') }}
        </label>
        <input
          :value="batchSize"
          type="number"
          min="1"
          max="10000"
          class="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
          @input="emitBatchSize"
        />
      </div>

      <div class="flex flex-col justify-end gap-3 lg:items-end">
        <ActionTextButton
          tone="amber"
          shape="xl"
          :icon="loading ? 'bi bi-arrow-repeat animate-spin' : 'bi bi-search'"
          :disabled="loading"
          @click="$emit('preview')"
        >
          {{ tf('message.audit.truncate_preview', 'Preview Dry Run') }}
        </ActionTextButton>
        <ActionTextButton
          tone="rose"
          shape="xl"
          icon="bi bi-exclamation-triangle"
          :disabled="loading || !preview || !preview.total_found"
          @click="$emit('execute')"
        >
          {{ tf('message.audit.truncate_execute', 'Execute Truncate') }}
        </ActionTextButton>
      </div>
    </div>

    <div v-if="preview" class="mt-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/85 dark:bg-slate-950/70 p-5">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {{ tf('message.audit.truncate_preview_result', 'Latest Truncate Preview') }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ preview.start_date }} - {{ preview.end_date }}
          </p>
        </div>
        <span
          class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          :class="preview.dry_run ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'"
        >
          <i :class="preview.dry_run ? 'bi bi-eye' : 'bi bi-trash3'"></i>
          {{ preview.dry_run
            ? tf('message.audit.truncate_mode_dry_run', 'Dry Run')
            : tf('message.audit.truncate_mode_executed', 'Executed') }}
        </span>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div v-for="metric in metrics" :key="metric.label" class="rounded-xl bg-slate-50 dark:bg-slate-900/70 p-3">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ metric.label }}</p>
          <p class="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{{ metric.value }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

const props = defineProps({
  startDate: {
    type: String,
    default: ''
  },
  endDate: {
    type: String,
    default: ''
  },
  batchSize: {
    type: [String, Number],
    default: 1000
  },
  preview: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:startDate', 'update:endDate', 'update:batchSize', 'preview', 'execute']);

const { tf } = useI18nFallback();

/** Mirrors v-model.number: only convert when the input parses as a number. */
const emitBatchSize = (event) => {
  const raw = event.target.value;
  const parsed = Number(raw);
  emit('update:batchSize', raw !== '' && Number.isFinite(parsed) ? parsed : raw);
};

const metrics = computed(() => {
  const preview = props.preview || {};

  return [
    { label: tf('message.audit.truncate_matches', 'Matched'), value: preview.total_found || 0 },
    { label: tf('message.audit.truncate_archived', 'Archived'), value: preview.archived_count || 0 },
    { label: tf('message.audit.truncate_deleted', 'Deleted'), value: preview.deleted_count || 0 },
    { label: tf('message.audit.truncate_batch_size', 'Batch Size'), value: preview.batch_size || 0 },
    { label: tf('message.audit.truncate_duration', 'Duration'), value: `${preview.duration_ms || 0}ms` }
  ];
});
</script>
