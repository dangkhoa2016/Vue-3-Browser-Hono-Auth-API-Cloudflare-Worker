<template>
  <div
    v-if="message"
    role="status"
    data-testid="logout-warning"
    class="mx-auto mb-3 flex w-full max-w-7xl items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
    <i class="bi bi-exclamation-triangle-fill mt-0.5 shrink-0"></i>
    <span class="flex-1">{{ message }}</span>
    <button
      type="button"
      data-testid="logout-warning-dismiss"
      class="shrink-0 rounded px-2 py-0.5 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
      :aria-label="closeLabel"
      :title="closeLabel"
      @click="$emit('dismiss')">
      <i class="bi bi-x-lg"></i>
    </button>
  </div>
</template>

<script setup>
/**
 * Shown after a sign-out that cleared the local session but could not confirm that the server
 * revoked it. The user is signed out locally either way, so the message never claims the opposite
 * (F01) and never leaves the impression that the server session is still usable.
 */
defineProps({
  message: { type: String, default: '' },
  closeLabel: { type: String, default: 'Close' }
});

defineEmits(['dismiss']);
</script>
