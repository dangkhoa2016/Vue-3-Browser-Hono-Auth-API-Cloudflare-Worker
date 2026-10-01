<template>
  <ModalWindow :show="show" :title="tf('message.audit.log_details', 'Log Details')" @close="$emit('close')" :panel-class="'max-w-3xl sm:max-w-4xl w-full'">
    <div class="space-y-4">
      <!-- Header: Action, Date, ID, Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 break-words">{{ tf('message.audit.action', 'Action') }}: {{ log?.action || tf('message.audit.log_details', 'Log Details') }}</h3>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ dateText }} • #{{ log?.id }}</div>
        </div>
        <div class="flex items-center gap-2 mt-2 sm:mt-0">
          <ActionTextButton
            variant="soft"
            shape="xl"
            size="sm"
            icon="bi bi-clipboard"
            class="text-xs"
            @click="$emit('copy')"
          >
            {{ tf('message.audit.copy_json', 'Copy JSON') }}
          </ActionTextButton>
          <ActionTextButton
            variant="soft"
            shape="xl"
            size="sm"
            icon="bi bi-x-lg"
            class="text-xs"
            @click="$emit('close')"
          >
            {{ tf('message.common.close', 'Close') }}
          </ActionTextButton>
        </div>
      </div>

      <!-- Responsive Info Grid -->
      <div class="grid grid-cols-1 min-[700px]:grid-cols-2 gap-4 overflow-auto max-h-[600px]">
        <div class="space-y-3 text-sm text-slate-700 dark:text-slate-200">
          <div v-for="field in fields" :key="field.label" class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
            <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ field.label }}</span>
            <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ field.value }}</span>
          </div>
        </div>
        <div class="flex flex-col">
          <div class="mb-2 text-xs text-slate-500">{{ tf('message.audit.full_payload', 'Full Payload') }}</div>
          <div class="relative">
            <pre class="whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded-md text-xs font-mono break-all">{{ payloadText }}</pre>
          </div>
        </div>
      </div>
    </div>
  </ModalWindow>
</template>

<script setup>
import { computed } from 'vue';
import ModalWindow from '/vue/components/ModalWindow.vue';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  log: {
    type: Object,
    default: null
  },
  dateText: {
    type: String,
    default: ''
  },
  payloadText: {
    type: String,
    default: ''
  }
});

defineEmits(['close', 'copy']);

const { tf } = useI18nFallback();

/** Label/value pairs of the selected log; the layout stays identical to the previous markup. */
const fields = computed(() => {
  const log = props.log || {};

  return [
    { label: tf('message.audit.actor', 'Actor'), value: log.actor_name || log.actor_email || log.user_email || '-' },
    { label: tf('message.audit.actor_role', 'Actor Role'), value: log.actor_role || '-' },
    { label: tf('message.audit.action', 'Action'), value: log.action || '-' },
    { label: tf('message.audit.target', 'Target'), value: log.target_type || log.resource || log.target || '-' },
    { label: tf('message.audit.timestamp', 'Timestamp'), value: props.dateText },
    { label: tf('message.audit.request_id', 'Request ID'), value: log.request_id || '-' },
    { label: tf('message.audit.ip_address', 'IP'), value: log.ip_address || '-' },
    { label: tf('message.audit.user_agent', 'User Agent'), value: log.user_agent || log.userAgent || '-' },
    { label: tf('message.audit.status', 'Status'), value: log.status || '-' }
  ];
});
</script>
