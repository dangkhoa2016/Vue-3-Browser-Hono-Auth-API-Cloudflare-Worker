<template>
  <transition name="modal">
    <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto" @click.self="handleOutsideClick">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" @click="handleOutsideClick"></div>

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
          <div>
            <!-- Close button -->
            <button 
              @click="$emit('close')"
              class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              :title="$t('message.common.close')"
            >
              <i class="bi bi-x-lg text-xl"></i>
            </button>

            <!-- Icon -->
            <div v-if="icon" class="mx-auto flex items-center justify-center h-12 w-12 rounded-full" :class="iconBgClass">
              <i class="text-2xl" :class="[icon, iconColorClass]"></i>
            </div>

            <!-- Title -->
            <div class="mt-3 text-center sm:mt-5">
              <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ title }}
              </h3>
              <p v-if="subtitle" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {{ subtitle }}
              </p>
            </div>

            <!-- Content Slot -->
            <div class="mt-6">
              <slot></slot>
            </div>

            <!-- Footer Slot -->
            <div v-if="$slots.footer" class="mt-6">
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    iconBgClass: {
      type: String,
      default: 'bg-blue-100 dark:bg-blue-900/30'
    },
    iconColorClass: {
      type: String,
      default: 'text-blue-600 dark:text-blue-400'
    },
    closeOnClickOutside: {
      type: Boolean,
      default: true
    }
  },
  emits: ['close'],
  methods: {
    handleOutsideClick() {
      if (this.closeOnClickOutside) {
        this.$emit('close');
      }
    }
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .inline-block,
.modal-leave-active .inline-block {
  transition: all 0.3s ease;
}

.modal-enter-from .inline-block,
.modal-leave-to .inline-block {
  transform: scale(0.9);
  opacity: 0;
}
</style>
