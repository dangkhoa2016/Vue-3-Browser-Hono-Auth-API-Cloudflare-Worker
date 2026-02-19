import { defineStore } from 'pinia';

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: []
  }),
  actions: {
    add(message, type = 'info', duration = 5000) {
      const id = Date.now() + Math.random();
      this.toasts.push({ id, message, type });
      if (duration > 0) {
        setTimeout(() => {
          this.remove(id);
        }, duration);
      }
    },
    remove(id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    },
    success(message, duration = 5000) {
      this.add(message, 'success', duration);
    },
    error(message, duration = 5000) {
      this.add(message, 'error', duration);
    },
    info(message, duration = 5000) {
      this.add(message, 'info', duration);
    },
    warning(message, duration = 5000) {
      this.add(message, 'warning', duration);
    }
  }
});
