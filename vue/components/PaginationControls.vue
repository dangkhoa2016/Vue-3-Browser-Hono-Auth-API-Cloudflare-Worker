<template>
  <div class="w-full flex flex-col gap-2 items-center lg:items-stretch">
    <div class="w-full flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <label
        v-if="showPageSize"
        class="inline-flex w-full lg:w-auto items-center justify-center lg:justify-start gap-2"
      >
        <span class="text-xs text-slate-500 dark:text-slate-400">
          {{ $t('message.audit.items_per_page') || 'Items per page' }}
        </span>
        <select
          :value="pageSize"
          :disabled="loading"
          :class="selectClass"
          @change="emitSizeChange($event.target.value)"
        >
          <option v-for="size in normalizedPageSizeOptions" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>

      <div class="w-full lg:w-auto lg:ml-auto flex justify-center lg:justify-end items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 lg:pb-0">
        <button
          @click="emitChange(1)"
          :disabled="isFirstPage || loading"
          :class="navButtonClass"
          aria-label="First"
        >
          <i class="bi bi-chevron-double-left"></i>
          <span class="max-[655px]:hidden min-[656px]:inline">First</span>
        </button>

        <button
          @click="emitChange(currentPage - 1)"
          :disabled="isFirstPage || loading"
          :class="navButtonClass"
          :aria-label="$t('message.prev') || 'Prev'"
        >
          <i class="bi bi-chevron-left"></i>
          <span class="hidden sm:inline">{{ $t('message.prev') || 'Prev' }}</span>
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
          :aria-label="$t('message.next') || 'Next'"
        >
          <span class="hidden sm:inline">{{ $t('message.next') || 'Next' }}</span>
          <i class="bi bi-chevron-right"></i>
        </button>

        <button
          @click="emitChange(totalPages)"
          :disabled="isLastPage || loading"
          :class="navButtonClass"
          aria-label="Last"
        >
          <span class="max-[655px]:hidden min-[656px]:inline">Last</span>
          <i class="bi bi-chevron-double-right"></i>
        </button>
      </div>
    </div>

    <div class="w-full text-xs text-slate-500 dark:text-slate-400 text-center lg:text-left">
      {{ paginationInfo }}
    </div>
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
    },
    pageSize: {
      type: Number,
      default: 20
    },
    pageSizeOptions: {
      type: Array,
      default: () => [10, 20, 50]
    },
    showPageSize: {
      type: Boolean,
      default: false
    }
  },
  emits: ['change', 'change-size'],
  setup(props, { emit }) {
    const navButtonClass =
      'inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0';

    const basePageButtonClass =
      'inline-flex items-center justify-center min-w-8 sm:min-w-9 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0';

    const activePageButtonClass = 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700';
    const inactivePageButtonClass =
      'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700';

    const selectClass =
      'max-lg:w-[100px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed';

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

    const normalizedPageSizeOptions = computed(() => {
      const options = Array.isArray(props.pageSizeOptions) ? props.pageSizeOptions : [10, 20, 50];
      const normalized = options
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      return normalized.length ? normalized : [10, 20, 50];
    });

    const paginationInfo = computed(() => {
      const current = Number(props.currentPage) || 1;
      const total = Number(props.totalPages) || 1;
      return `Page ${current} / ${total}`;
    });

    const emitChange = (page) => {
      const totalPages = Number(props.totalPages) || 1;
      const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
      if (nextPage === (Number(props.currentPage) || 1)) {
        return;
      }
      emit('change', nextPage);
    };

    const emitSizeChange = (value) => {
      const nextSize = Number.parseInt(value, 10);
      if (!Number.isFinite(nextSize) || nextSize <= 0) return;

      const currentSize = Number.parseInt(props.pageSize, 10) || 20;
      if (nextSize === currentSize) return;

      emit('change-size', nextSize);
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
      normalizedPageSizeOptions,
      paginationInfo,
      emitChange,
      emitSizeChange,
      getPageButtonClass,
      selectClass
    };
  }
};
</script>
