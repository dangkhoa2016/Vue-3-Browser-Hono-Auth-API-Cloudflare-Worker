<template>
  <slot v-if="loading" name="loading"></slot>

  <slot v-else-if="hasError" name="error" :error-message="errorMessage">
    <div class="rounded-[28px] border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-6 text-rose-700 dark:text-rose-300">
      <div class="flex items-center gap-2">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>{{ errorMessage }}</span>
      </div>
    </div>
  </slot>

  <slot v-else-if="isEmpty" name="empty">
    <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-10 text-center">
      <i class="bi bi-emoji-neutral text-4xl text-slate-400 mb-3"></i>
      <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ emptyTitle }}</h3>
      <p class="text-slate-500 dark:text-slate-400">{{ emptyMessage }}</p>
    </div>
  </slot>

  <slot v-else></slot>
</template>

<script>
export default {
  name: 'AsyncStateSection',
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: [String, Object],
      default: null
    },
    isEmpty: {
      type: Boolean,
      default: false
    },
    emptyTitle: {
      type: String,
      default: ''
    },
    emptyMessage: {
      type: String,
      default: ''
    }
  },
  computed: {
    hasError() {
      return this.error !== null && this.error !== undefined && String(this.error).trim() !== '';
    },
    errorMessage() {
      if (typeof this.error === 'string') return this.error;
      if (this.error && typeof this.error === 'object' && this.error.message) return String(this.error.message);
      return '';
    }
  }
};
</script>