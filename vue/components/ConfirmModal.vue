<template>
  <ModalWindow
    :show="show"
    :title="title"
    :subtitle="message"
    :icon="icon"
    :icon-bg-class="iconBgClass"
    :icon-color-class="iconColorClass"
    :close-on-click-outside="false"
    @close="$emit('cancel')"
  >
    <!-- Actions -->
    <div class="flex gap-3 mt-6">
      <button
        @click="$emit('cancel')"
        class="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
      >
        {{ cancelText }}
      </button>
      <button
        @click="$emit('confirm')"
        class="flex-1 px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
        :class="confirmButtonClass"
      >
        {{ confirmText }}
      </button>
    </div>
  </ModalWindow>
</template>

<script>
import ModalWindow from './ModalWindow.vue';

export default {
  components: {
    ModalWindow
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: 'Confirm'
    },
    cancelText: {
      type: String,
      default: 'Cancel'
    },
    icon: {
      type: String,
      default: 'bi bi-question-circle'
    },
    iconBgClass: {
      type: String,
      default: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    iconColorClass: {
      type: String,
      default: 'text-yellow-600 dark:text-yellow-400'
    },
    confirmButtonClass: {
      type: String,
      default: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  },
  emits: ['confirm', 'cancel']
}
</script>
