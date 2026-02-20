import { defineStore } from 'pinia';

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: []
  }),
  actions: {
    add(message, type = 'info', duration = 5000, title = null) {
      const id = Date.now() + Math.random();
      this.toasts.push({ id, message, type, title });
      if (duration > 0) {
        setTimeout(() => {
          this.remove(id);
        }, duration);
      }
    },
    remove(id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    },
    success(message, duration = 5000, title = null) {
      this.add(message, 'success', duration, title);
    },
    error(message, duration = 5000, title = null) {
      this.add(message, 'error', duration, title);
    },
    info(message, duration = 5000, title = null) {
      this.add(message, 'info', duration, title);
    },
    warning(message, duration = 5000, title = null) {
      this.add(message, 'warning', duration, title);
    }
  }
});
