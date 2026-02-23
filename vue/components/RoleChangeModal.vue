<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">
          {{ $t('message.admin_users.change_role', 'Change Role') }}
        </h3>
        <button :disabled="loading" @click="$emit('close')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <form @submit.prevent="$emit('save')" class="p-6 space-y-4">
        <div class="text-sm text-slate-600 dark:text-slate-300">
          {{ $t('message.admin_users.change_role_for', { name: user?.full_name || '' }, `Change role for ${user?.full_name || ''}`) }}
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {{ $t('message.admin_users.column_role') }}
          </label>
          <div class="relative group">
            <i class="bi bi-shield-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors text-lg"></i>
            <select
              :value="roleValue"
              :disabled="loading"
              @change="$emit('update:roleValue', $event.target.value)"
              class="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none appearance-none"
            >
              <option v-for="role in roleOptions" :key="role" :value="role">
                {{ formatRole(role) }}
              </option>
            </select>
            <i class="bi bi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
          </div>
        </div>

        <div class="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
          <button
            type="button"
            :disabled="loading"
            @click="$emit('close')"
            class="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
          >
            {{ $t('message.common.cancel', 'Cancel') }}
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ $t('message.common.save', 'Save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RoleChangeModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    user: {
      type: Object,
      default: null
    },
    roleValue: {
      type: String,
      default: 'user'
    },
    roleOptions: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'save', 'update:roleValue'],
  setup() {
    const formatRole = (role) => {
      if (!role) return '-';
      return String(role).replace('_', ' ').toUpperCase();
    };

    return {
      formatRole
    };
  }
};
</script>
