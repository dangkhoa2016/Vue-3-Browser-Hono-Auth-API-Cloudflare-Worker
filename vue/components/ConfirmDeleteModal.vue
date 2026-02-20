<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="onCancel">
    <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ titleText }}</h3>
        <button @click="onCancel" :disabled="loading" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div class="p-6">
        <p class="text-sm text-slate-700 dark:text-slate-300">{{ messageText }}</p>
        <p v-if="displayItem" class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ displayItem }}</p>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button @click="onCancel" :disabled="loading" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm">
            {{ cancelText }}
          </button>
          <button @click="onConfirm" :disabled="loading" class="px-4 py-2 rounded-xl bg-rose-600 text-white flex items-center">
            <span v-if="loading" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';

export default {
  name: 'ConfirmDeleteModal',
  props: {
    show: { type: Boolean, default: false },
    itemId: { type: [String, Number], default: null },
    itemName: { type: String, default: '' },
    model: { type: String, default: null },
    loading: { type: Boolean, default: false },
    title: { type: String, default: null },
    message: { type: String, default: null },
    confirmLabel: { type: String, default: null },
    cancelLabel: { type: String, default: null }
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    const { t } = useI18n({ useScope: 'global' });

    const onConfirm = () => {
      if (props.loading) return;
      emit('confirm');
    };

    const onCancel = () => {
      if (props.loading) return;
      emit('cancel');
    };

    const displayItem = computed(() => {
      if (!props.itemId && !props.itemName) return '';
      return `${props.itemId ? '#' + props.itemId : ''}${props.itemId && props.itemName ? ' — ' : ''}${props.itemName || ''}`;
    });

    const cancelText = computed(() => props.cancelLabel || t('message.common.cancel'));
    const confirmText = computed(() => props.confirmLabel || t('message.common.delete'));

    const titleText = computed(() => props.title || t('message.common.confirm_title'));

    const modelName = computed(() => {
      if (props.model) return props.model;
      if (props.itemName) return props.itemName;
      return t('message.admin_users.models.user');
    });

    const messageText = computed(() => {
      if (props.message) return props.message;
      return t('message.common.confirm_message', {
        model: modelName.value,
        id: props.itemId || ''
      });
    });

    return {
      onConfirm,
      onCancel,
      displayItem,
      cancelText,
      confirmText,
      titleText,
      messageText
    };
  }
};
</script>
