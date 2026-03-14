<template>
  <button
    type="button"
    :disabled="disabled"
    :title="title"
    :aria-label="ariaLabel || title || undefined"
    class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="toneClass"
    @click.stop="handleClick"
  >
    <i :class="icon"></i>
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  tone: {
    type: String,
    default: 'indigo'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

const toneClass = computed(() => {
  switch (props.tone) {
    case 'amber':
      return 'hover:text-amber-600 dark:hover:text-amber-400';
    case 'rose':
      return 'hover:text-rose-600 dark:hover:text-rose-400';
    case 'emerald':
      return 'hover:text-emerald-600 dark:hover:text-emerald-400';
    case 'indigo':
    default:
      return 'hover:text-indigo-600 dark:hover:text-indigo-400';
  }
});

const handleClick = () => {
  if (!props.disabled) {
    emit('click');
  }
};
</script>
