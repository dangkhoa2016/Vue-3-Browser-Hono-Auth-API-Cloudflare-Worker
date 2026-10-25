<template>
  <transition name="modal">
    <div v-if="show" :class="['fixed inset-0 flex items-center justify-center p-4', zIndexClass]" @click.self="handleOutsideClick">
      <div class="w-full flex items-center justify-center">
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" @click="handleOutsideClick"></div>

        <!-- Modal panel -->
        <div ref="panel" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1" :class="['relative bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all max-w-md w-full max-h-[90vh] overflow-y-auto', panelClass]">
          <div>
            <!-- Close button -->
            <button 
              type="button"
              @click="$emit('close')"
              class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              :title="$t('message.common.close')"
              :aria-label="$t('message.common.close')"
            >
              <i class="bi bi-x-lg text-xl" aria-hidden="true"></i>
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

<script setup>
import { onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';
import { useDialogFocus } from '/vue/composables/useDialogFocus.js';

const props = defineProps({
  manageFocus: { type: Boolean, default: false },
  initialFocus: { type: String, default: '' },
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
  panelClass: {
    type: String,
    default: ''
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true
  },
  zIndexClass: {
    type: String,
    default: 'z-50'
  }
});

const emit = defineEmits(['close']);
const { show, closeOnClickOutside, manageFocus, initialFocus } = toRefs(props);
const panel = ref(null);
useDialogFocus({ show, enabled: manageFocus, panel, initialFocus });

watch(show, (val) => {
  try {
    if (val) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
  } catch (e) {
  }
});

onMounted(() => {
  if (show.value) {
    try { document.body.classList.add('overflow-hidden'); } catch (e) {}
  }
});

onBeforeUnmount(() => {
  try { document.body.classList.remove('overflow-hidden'); } catch (e) {}
});

const handleOutsideClick = () => {
  if (closeOnClickOutside.value) {
    emit('close');
  }
};
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
