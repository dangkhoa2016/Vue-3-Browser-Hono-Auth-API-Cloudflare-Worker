const { defineStore } = Pinia;

const toastTimers = new Map();

const createToastId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const clearToastTimer = (id) => {
  const timer = toastTimers.get(id);

  if (!timer) {
    return;
  }

  clearTimeout(timer);
  toastTimers.delete(id);
};

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: []
  }),
  actions: {
    add(message, type = 'info', duration = 5000, title = null) {
      const normalizedMessage = String(message || '');
      const normalizedTitle = title == null ? null : String(title);
      const existingToast = this.toasts.find((toast) => (
        toast.message === normalizedMessage
        && toast.type === type
        && toast.title === normalizedTitle
      ));

      if (existingToast) {
        clearToastTimer(existingToast.id);
        this.toasts = this.toasts.filter((toast) => toast.id !== existingToast.id);
      }

      const id = createToastId();
      this.toasts.push({ id, message: normalizedMessage, type, title: normalizedTitle });

      if (duration > 0) {
        const timer = setTimeout(() => {
          this.remove(id);
        }, duration);

        toastTimers.set(id, timer);
      }
    },
    remove(id) {
      clearToastTimer(id);
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
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
