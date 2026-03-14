<template>
  <section :class="sectionClass">
    <i :class="iconClass"></i>
    <h3 :class="titleClass">{{ title }}</h3>
    <p :class="messageClass">{{ message }}</p>
    <ActionTextButton
      :icon="buttonIcon"
      :tone="buttonTone"
      :size="buttonSize"
      :shape="buttonShape"
      @click="$emit('action')"
    >
      {{ buttonText }}
    </ActionTextButton>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import ActionTextButton from './ActionTextButton.vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  buttonText: {
    type: String,
    required: true
  },
  tone: {
    type: String,
    default: 'blue'
  },
  buttonTone: {
    type: String,
    default: ''
  },
  buttonIcon: {
    type: String,
    default: 'bi bi-box-arrow-in-right'
  },
  buttonSize: {
    type: String,
    default: 'sm'
  },
  buttonShape: {
    type: String,
    default: 'xl'
  },
  icon: {
    type: String,
    default: 'bi bi-lock-fill'
  }
});

defineEmits(['action']);

const toneMap = {
  blue: {
    section: 'bg-blue-50/80 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-300'
  },
  teal: {
    section: 'bg-teal-50/80 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800',
    icon: 'text-teal-600 dark:text-teal-400',
    title: 'text-teal-900 dark:text-teal-100',
    message: 'text-teal-700 dark:text-teal-300'
  },
  red: {
    section: 'bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-700 dark:text-red-300'
  },
  amber: {
    section: 'bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-100',
    message: 'text-amber-700 dark:text-amber-300'
  }
};

const resolvedTone = computed(() => toneMap[props.tone] || toneMap.blue);
const buttonTone = computed(() => props.buttonTone || props.tone || 'blue');

const sectionClass = computed(() => `${resolvedTone.value.section} rounded-3xl p-8 text-center shadow-sm`);
const iconClass = computed(() => `${props.icon} text-5xl ${resolvedTone.value.icon} mb-4`);
const titleClass = computed(() => `text-xl font-bold ${resolvedTone.value.title} mb-2`);
const messageClass = computed(() => `${resolvedTone.value.message} mb-4`);
</script>