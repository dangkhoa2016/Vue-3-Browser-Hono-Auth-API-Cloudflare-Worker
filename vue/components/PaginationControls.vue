<template>
  <div class="flex items-center gap-2 flex-wrap">
    <button
      @click="emitChange(1)"
      :disabled="isFirstPage || loading"
      :class="navButtonClass"
    >
      <i class="bi bi-chevron-double-left"></i>
      First
    </button>

    <button
      @click="emitChange(currentPage - 1)"
      :disabled="isFirstPage || loading"
      :class="navButtonClass"
    >
      <i class="bi bi-chevron-left"></i>
      {{ $t('message.prev') || 'Prev' }}
    </button>

    <button
      v-for="page in visiblePages"
      :key="page"
      @click="emitChange(page)"
      :disabled="loading"
      :class="getPageButtonClass(page)"
    >
      {{ page }}
    </button>

    <button
      @click="emitChange(currentPage + 1)"
      :disabled="isLastPage || loading"
      :class="navButtonClass"
    >
      {{ $t('message.next') || 'Next' }}
      <i class="bi bi-chevron-right"></i>
    </button>

    <button
      @click="emitChange(totalPages)"
      :disabled="isLastPage || loading"
      :class="navButtonClass"
    >
      Last
      <i class="bi bi-chevron-double-right"></i>
    </button>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'PaginationControls',
  props: {
    currentPage: {
      type: Number,
      default: 1
    },
    totalPages: {
      type: Number,
      default: 1
    },
    loading: {
      type: Boolean,
      default: false
    },
    maxButtons: {
      type: Number,
      default: 5
    }
  },
  emits: ['change'],
  setup(props, { emit }) {
    const navButtonClass =
      'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition';

    const basePageButtonClass =
      'inline-flex items-center justify-center min-w-9 px-2.5 py-1.5 rounded-lg text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed';

    const activePageButtonClass = 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700';
    const inactivePageButtonClass =
      'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700';

    const isFirstPage = computed(() => (Number(props.currentPage) || 1) <= 1);
    const isLastPage = computed(() => {
      const current = Number(props.currentPage) || 1;
      const total = Number(props.totalPages) || 1;
      return current >= total;
    });

    const visiblePages = computed(() => {
      const totalPages = Number(props.totalPages) || 1;
      const currentPage = Number(props.currentPage) || 1;
      const maxButtons = Number(props.maxButtons) || 5;

      let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let end = Math.min(totalPages, start + maxButtons - 1);

      if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
      }

      const pages = [];
      for (let page = start; page <= end; page += 1) {
        pages.push(page);
      }
      return pages;
    });

    const emitChange = (page) => {
      const totalPages = Number(props.totalPages) || 1;
      const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
      if (nextPage === (Number(props.currentPage) || 1)) {
        return;
      }
      emit('change', nextPage);
    };

    const getPageButtonClass = (page) => {
      const current = Number(props.currentPage) || 1;
      return [basePageButtonClass, page === current ? activePageButtonClass : inactivePageButtonClass];
    };

    return {
      navButtonClass,
      isFirstPage,
      isLastPage,
      visiblePages,
      emitChange,
      getPageButtonClass
    };
  }
};
</script>
