<template>
    <ModalWindow
      :show="show"
      :title="tf('message.realtime_monitoring.create_channel', 'Create Channel')"
      :subtitle="tf('message.realtime_monitoring.alert_channels_subtitle', 'Delivery channels configured on the monitoring backend.')"
      panel-class="max-w-2xl w-full"
      @close="$emit('close')"
    >
      <div class="p-6">
        <form @submit.prevent="$emit('submit')">
          <fieldset :disabled="loading" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_channel_name', 'Channel name') }}</label>
              <input
                  :value="form.name"
                  @input="emit('update:field', { key: 'name', value: $event.target.value })"
                type="text"
                required
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
              >
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_channel_type', 'Channel type (email, webhook, slack)') }}</label>
                <select
                  :value="form.type"
                  @input="emit('update:field', { key: 'type', value: $event.target.value })"
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
                  :value="form.target"
                  @input="emit('update:field', { key: 'target', value: $event.target.value })"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
                >
              </div>
            </div>

            <div v-if="error" class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {{ error }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <ActionTextButton tone="slate" type="button" @click="$emit('close')">
                {{ tf('message.common.cancel', 'Cancel') }}
              </ActionTextButton>
              <ActionTextButton tone="sky" type="submit" icon="bi bi-plus-circle" :disabled="loading">
                {{ tf('message.realtime_monitoring.create_channel', 'Create Channel') }}
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

