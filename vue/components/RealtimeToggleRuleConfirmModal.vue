<template>
    <ConfirmModal
      :show="show"
      :title="enabled
        ? tf('message.realtime_monitoring.disable_rule_confirm_title', 'Disable rule?')
        : tf('message.realtime_monitoring.enable_rule_confirm_title', 'Enable rule?')"
      :message="enabled
        ? tf('message.realtime_monitoring.disable_rule_confirm_message', 'This will stop the selected rule from triggering alerts until you enable it again.')
        : tf('message.realtime_monitoring.enable_rule_confirm_message', 'This will allow the selected rule to trigger alerts again.')"
      :confirm-text="enabled
        ? tf('message.realtime_monitoring.disable_rule_action', 'Disable Rule')
        : tf('message.realtime_monitoring.enable_rule_action', 'Enable Rule')"
      :cancel-text="tf('message.common.cancel', 'Cancel')"
      icon="bi bi-toggle-on"
      icon-bg-class="bg-amber-100 dark:bg-amber-900/30"
      icon-color-class="text-amber-600 dark:text-amber-400"
      :confirm-button-class="enabled
        ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
        : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'"
      @confirm="$emit('confirm')"
      @cancel="$emit('cancel')"
    />
</template>

<script setup>
import ConfirmModal from '/vue/components/ConfirmModal.vue';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

defineProps({
  show: { type: Boolean, default: false },
  enabled: { type: Boolean, default: false }
});

defineEmits(['confirm', 'cancel']);

const { tf } = useI18nFallback();
</script>
