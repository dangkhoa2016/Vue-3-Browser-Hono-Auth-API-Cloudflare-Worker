<template>
  <div :class="resolvedCardClass">
    <p :class="labelClass">
      <slot name="label">{{ label }}</slot>
    </p>

    <div class="mt-3 flex items-center justify-between">
      <slot name="value">
        <div v-if="loading" :class="loadingClass"></div>
        <span v-else :class="valueClass">{{ value }}</span>
      </slot>

      <slot name="icon">
        <i :class="resolvedIconClass"></i>
      </slot>
    </div>

    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  value: {
    type: [String, Number],
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  iconClass: {
    type: String,
    default: ''
  },
  cardClass: {
    type: String,
    default: ''
  },
  labelClass: {
    type: String,
    default: 'text-xs uppercase tracking-[0.3em] text-slate-500'
  },
  valueClass: {
    type: String,
    default: 'text-xl font-black text-slate-900 dark:text-white'
  },
  loadingClass: {
    type: String,
    default: 'h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse'
  }
});

const resolvedCardClass = computed(() => {
  if (props.cardClass) return props.cardClass;
  return 'rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm';
});

const resolvedIconClass = computed(() => {
  if (props.iconClass) return props.iconClass;
  return 'bi bi-circle text-2xl text-slate-400';
});
</script>