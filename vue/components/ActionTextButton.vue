<template>
  <button
    type="button"
    :title="title"
    :disabled="disabled"
    class="inline-flex items-center gap-2 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[sizeClass, shapeClass, variantClass]"
    @click="emitClick"
  >
    <i v-if="icon" :class="icon"></i>
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'solid'
  },
  tone: {
    type: String,
    default: 'teal'
  },
  shape: {
    type: String,
    default: 'xl'
  },
  size: {
    type: String,
    default: 'md'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

const sizeClass = computed(() => (props.size === 'sm' ? 'px-3 py-1 text-sm' : 'px-4 py-2 text-sm'));
const shapeClass = computed(() => (props.shape === 'full' ? 'rounded-full' : 'rounded-xl'));

const variantClass = computed(() => {
  if (props.variant === 'soft') {
    return 'border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md';
  }

  switch (props.tone) {
    case 'emerald':
      return 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-sm hover:shadow-md';
    case 'rose':
      return 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white shadow-sm hover:shadow-md';
    case 'blue':
      return 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm hover:shadow-md';
    case 'indigo':
      return 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-sm hover:shadow-md';
    case 'amber':
      return 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white shadow-sm hover:shadow-md';
    case 'slate':
      return 'bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white shadow-sm hover:shadow-md';
    case 'teal':
    default:
      return 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white shadow-sm hover:shadow-md';
  }
});

const emitClick = () => {
  if (!props.disabled) emit('click');
};
};
