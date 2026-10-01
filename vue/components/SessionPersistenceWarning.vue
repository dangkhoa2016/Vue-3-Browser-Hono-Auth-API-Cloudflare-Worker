<template>
  <div
    v-if="message"
    role="status"
    data-testid="session-persistence-warning"
    :class="containerClass">
    <i :class="icon" class="mt-0.5 shrink-0"></i>
    <span class="flex-1">{{ message }}</span>
    <button
      type="button"
      data-testid="session-persistence-warning-dismiss"
      :class="dismissClass"
      :aria-label="closeLabel"
      :title="closeLabel"
      @click="$emit('dismiss')">
      <i class="bi bi-x-lg"></i>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

/**
 * Shown when this tab's session is not durable, and the user would otherwise find out the hard way.
 *
 * Two cases, and the second one is the dangerous one:
 *  - **memory-only** — the browser cannot serialise session writes (no Web Locks), so nothing is
 *    written at all. The user is signed in, and a reload signs them out with no explanation;
 *  - **degraded** — writes *are* attempted and one has just failed. The session in this tab may now
 *    differ from the record every other tab reads, and nothing else in the UI says so.
 *
 * Both are stated as what they are. The banner never claims the session is safe, and it never claims
 * it is lost: what is true is that this tab cannot promise the session will still be here.
 */
const props = defineProps({
  message: { type: String, default: '' },
  /** `amber` warns about a session that is not stored; `rose` reports one that just failed to store. */
  tone: { type: String, default: 'amber' },
  icon: { type: String, default: 'bi bi-exclamation-triangle-fill' },
  closeLabel: { type: String, default: 'Close' }
});

defineEmits(['dismiss']);

const SHARED = 'mx-auto mb-3 flex w-full max-w-7xl items-start gap-2 rounded-lg border px-4 py-2 text-sm';

const TONES = {
  amber: {
    container: `${SHARED} border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200`,
    dismiss: 'shrink-0 rounded px-2 py-0.5 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40'
  },
  rose: {
    container: `${SHARED} border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/60 dark:bg-rose-900/20 dark:text-rose-200`,
    dismiss: 'shrink-0 rounded px-2 py-0.5 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-900/40'
  }
};

const containerClass = computed(() => (TONES[props.tone] || TONES.amber).container);
const dismissClass = computed(() => (TONES[props.tone] || TONES.amber).dismiss);
</script>
