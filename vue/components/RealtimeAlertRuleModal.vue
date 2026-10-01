<template>
    <ModalWindow
      :show="show"
      :title="tf('message.realtime_monitoring.create_rule', 'Create Rule')"
      :subtitle="tf('message.realtime_monitoring.prompt_rule_description_default', 'Created from realtime monitoring UI')"
      panel-class="max-w-2xl w-full"
      @close="$emit('close')"
    >
      <div class="p-6">
        <form @submit.prevent="$emit('submit')">
          <fieldset :disabled="loading" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_rule_name', 'Rule name') }}</label>
              <input
                  :value="form.name"
                  @input="emit('update:field', { key: 'name', value: $event.target.value })"
                type="text"
                required
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_rule_description', 'Rule description') }}</label>
              <textarea
                  :value="form.description"
                  @input="emit('update:field', { key: 'description', value: $event.target.value })"
                rows="3"
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-slate-100"
              ></textarea>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.realtime_monitoring.prompt_severity', 'Severity (low, medium, high, critical)') }}</label>
                <select
                  :value="form.severity"
                  @input="emit('update:field', { key: 'severity', value: $event.target.value })"
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
                  :value="form.condition"
                  @input="emit('update:field', { key: 'condition', value: $event.target.value })"
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
                  :value="form.cooldown"
                @input="emitNumber('cooldown', $event)"
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
                    <input :checked="form.channels.includes('email')"
                        @change="toggleChannel('email', $event)" type="checkbox" class="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
                    <span>email</span>
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input :checked="form.channels.includes('webhook')"
                        @change="toggleChannel('webhook', $event)" type="checkbox" class="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
                    <span>webhook</span>
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input :checked="form.channels.includes('slack')"
                        @change="toggleChannel('slack', $event)" type="checkbox" class="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
                    <span>slack</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-300">
              {{ tf('message.realtime_monitoring.enabled_summary', '{enabled} / {total} enabled', { enabled: form.channels.length, total: form.channels.length }) }} · {{ form.channels.join(', ') || 'email' }} · cooldown {{ form.cooldown || 0 }}s
            </div>

            <div v-if="error" class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {{ error }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <ActionTextButton tone="slate" type="button" @click="$emit('close')">
                {{ tf('message.common.cancel', 'Cancel') }}
              </ActionTextButton>
              <ActionTextButton tone="sky" type="submit" icon="bi bi-plus-circle" :disabled="loading">
                {{ tf('message.realtime_monitoring.create_rule', 'Create Rule') }}
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

const props = defineProps({
  show: { type: Boolean, default: false },
  form: { type: Object, required: true },
  error: { type: String, default: '' },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'submit', 'update:field']);

const { tf } = useI18nFallback();

const toggleChannel = (channel, event) => {
  const channels = props.form.channels.filter((value) => value !== channel);
  if (event.target.checked) channels.push(channel);
  emit('update:field', { key: 'channels', value: channels });
};

/** Mirrors v-model(.number): only convert when the input parses as a number. */
const emitNumber = (field, event) => {
  const raw = event.target.value;
  const parsed = Number(raw);
  emit('update:field', { key: field, value: raw !== '' && Number.isFinite(parsed) ? parsed : raw });
};
</script>

