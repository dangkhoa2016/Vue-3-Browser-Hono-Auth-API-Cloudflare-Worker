<template>
  <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all min-w-[300px] max-w-sm',
          toast.type === 'success' ? 'bg-emerald-50/90 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100' :
          toast.type === 'error' ? 'bg-rose-50/90 dark:bg-rose-900/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-100' :
          toast.type === 'warning' ? 'bg-amber-50/90 dark:bg-amber-900/80 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100' :
          'bg-slate-50/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
        ]"
      >
        <div class="flex-shrink-0">
          <i v-if="toast.type === 'success'" class="bi bi-check-circle-fill text-xl text-emerald-500"></i>
          <i v-else-if="toast.type === 'error'" class="bi bi-x-circle-fill text-xl text-rose-500"></i>
          <i v-else-if="toast.type === 'warning'" class="bi bi-exclamation-triangle-fill text-xl text-amber-500"></i>
          <i v-else class="bi bi-info-circle-fill text-xl text-blue-500"></i>
        </div>
        <div class="flex-1 text-sm font-medium pr-2">
          <div v-if="toast.title" class="font-bold text-sm mb-1">{{ toast.title }}</div>
          <div>{{ toast.message }}</div>
        </div>
        <button
          @click="remove(toast.id)"
          class="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
        >
          <i class="bi bi-x text-lg"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useToastStore } from '/assets/js/stores/toastStore.js';

export default {
  name: 'ToastNotification',
  setup() {
    const toastStore = useToastStore();
    const toasts = computed(() => toastStore.toasts);

    const remove = (id) => {
      toastStore.remove(id);
    };

    return {
      toasts,
      remove
    };
  }
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
