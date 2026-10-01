<template>
    <ModalWindow
      :show="show"
      :title="tf('message.realtime_monitoring.clear_cache', 'Clear Cache')"
      :subtitle="tf('message.realtime_monitoring.confirm_clear_cache', 'Clear {label}?', { label: tf('message.realtime_monitoring.all_dashboard_cache', 'all dashboard cache') })"
      panel-class="max-w-xl w-full"
      @close="$emit('close')"
    >
      <div class="p-6">
        <form @submit.prevent="$emit('submit')">
          <fieldset :disabled="loading" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_cache_key', 'Cache key to clear. Leave blank to clear all.') }}</label>
              <input
                  :value="form.key"
                  @input="emit('update:field', { key: 'key', value: $event.target.value })"
                type="text"
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
              >
              <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{{ form.key || tf('message.realtime_monitoring.all_dashboard_cache', 'all dashboard cache') }}</p>
            </div>

            <div v-if="error" class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {{ error }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <ActionTextButton tone="slate" type="button" @click="$emit('close')">
                {{ tf('message.common.cancel', 'Cancel') }}
              </ActionTextButton>
              <ActionTextButton tone="rose" type="submit" icon="bi bi-trash3" :disabled="loading">
                {{ tf('message.realtime_monitoring.clear_cache', 'Clear Cache') }}
              </ActionTextButton>
            </div>
          </fieldset>
        </form>
      </div>
    </ModalWindow>
</template>

<script setup>
import ModalWindow from '/vue/components/ModalWindow.vue';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

defineProps({
  show: { type: Boolean, default: false },
  form: { type: Object, required: true },
  error: { type: String, default: '' },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'submit', 'update:field']);

const { tf } = useI18nFallback();

</script>

