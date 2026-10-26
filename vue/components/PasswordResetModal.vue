<template>
  <ModalWindow
    :show="show" :title="$t('message.admin_password_reset.title')"
    :manage-focus="true" initial-focus="#admin-reset-password" icon="bi bi-key-fill"
    @close="$emit('close')"
  >
    <form @submit.prevent="$emit('save')" @keydown.esc.prevent.stop="$emit('close')" class="space-y-4">
      <p class="text-sm text-slate-700 dark:text-slate-200 break-words">
        {{ user?.full_name }} &lt;{{ user?.email }}&gt;
      </p>
      <p id="admin-reset-warning" class="text-sm rounded-lg p-3 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
        {{ $t('message.admin_password_reset.warning') }}
      </p>
      <div>
        <label for="admin-reset-password" class="block text-sm font-semibold mb-2 dark:text-slate-200">{{ $t('message.admin_password_reset.new_password') }}</label>
        <input id="admin-reset-password" type="password" autocomplete="new-password" required minlength="8" maxlength="72"
          :value="form.newPassword" :disabled="loading" aria-describedby="admin-reset-policy admin-reset-warning"
          @input="$emit('update:form', { ...form, newPassword: $event.target.value })" :class="inputClass" />
        <p id="admin-reset-policy" class="mt-2 text-xs text-slate-500 dark:text-slate-400">{{ $t('message.admin_password_reset.policy') }}</p>
      </div>
      <div>
        <label for="admin-reset-confirm" class="block text-sm font-semibold mb-2 dark:text-slate-200">{{ $t('message.admin_password_reset.confirm_password') }}</label>
        <input id="admin-reset-confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="72"
          :value="form.confirmPassword" :disabled="loading"
          @input="$emit('update:form', { ...form, confirmPassword: $event.target.value })" :class="inputClass" />
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <div class="flex justify-end gap-3 pt-3">
        <button type="button" @click="$emit('close')" class="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-200">{{ $t('message.common.cancel') }}</button>
        <button type="submit" :disabled="loading" :aria-busy="loading" class="px-4 py-2 rounded-lg bg-teal-600 text-white disabled:opacity-50">
          {{ $t('message.admin_password_reset.title') }}
        </button>
      </div>
    </form>
  </ModalWindow>
</template>

<script setup>
import ModalWindow from './ModalWindow.vue';
defineProps({ show: Boolean, user: { type: Object, default: null }, form: { type: Object, required: true }, loading: Boolean, error: { type: String, default: '' } });
defineEmits(['close', 'save', 'update:form']);
const inputClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500';
</script>
