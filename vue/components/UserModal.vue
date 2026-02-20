<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">
          {{ mode === 'create' ? $t('message.admin_users.create_user', 'Create User') : $t('message.admin_users.edit_user', 'Edit User') }}
        </h3>
        <button :disabled="loading" @click="$emit('close')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
        <!-- Full Name -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {{ $t('message.admin_users.column_full_name') }}
          </label>
          <div class="relative group">
            <i class="bi bi-person absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors text-lg"></i>
            <input
              v-model="formData.full_name"
              type="text"
              required
              :disabled="loading"
              class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none"
              :placeholder="$t('message.admin_users.column_full_name')"
            />
          </div>
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {{ $t('message.admin_users.column_email') }}
          </label>
          <div class="relative group">
            <i class="bi bi-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors text-lg"></i>
            <input
              v-model="formData.email"
              type="email"
              required
              :disabled="loading"
              class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <!-- Password (only for create) -->
        <div v-if="mode === 'create'">
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {{ $t('message.auth.password', 'Password') }}
          </label>
          <div class="relative group">
            <i class="bi bi-key absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors text-lg"></i>
            <input
              v-model="formData.password"
              type="password"
              required
              minlength="8"
              :disabled="loading"
              class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 ml-1">
            {{ $t('message.auth.password_min_length', { length: 8 }, 'Minimum 8 characters') }}
          </p>
        </div>

        <div :class="mode === 'edit' ? 'grid grid-cols-2 gap-4' : ''">
          <!-- Role -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {{ $t('message.admin_users.column_role') }}
            </label>
            <div class="relative group">
              <i class="bi bi-shield-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors text-lg"></i>
              <select
                v-model="formData.role"
                :disabled="loading"
                class="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none appearance-none"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <i class="bi bi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
            </div>
          </div>

          <!-- Status (Edit only) -->
          <div v-if="mode === 'edit'">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {{ $t('message.admin_users.column_status') }}
            </label>
            <div class="relative group">
              <i class="bi bi-activity absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors text-lg"></i>
              <select
                v-model="formData.status"
                :disabled="loading"
                class="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none appearance-none"
              >
                <option value="active">{{ $t('message.admin_users.status_active') }}</option>
                <option value="inactive">{{ $t('message.admin_users.status_inactive') }}</option>
              </select>
              <i class="bi bi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
            </div>
          </div>
        </div>

        <!-- Improved Error Message -->
        <div v-if="error" class="group p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-sm rounded-xl flex items-start gap-3 transition-all hover:bg-rose-100 dark:hover:bg-rose-900/20">
            <div class="mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
               <i class="bi bi-exclamation-circle-fill text-sm"></i>
            </div>
            <div class="flex-1">
               <h4 class="font-bold text-rose-700 dark:text-rose-300 mb-0.5">{{ $t('message.errors.error_title', 'Error') }}</h4>
               <p>{{ error }}</p>
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
            {{ mode === 'create' ? $t('message.common.create', 'Create') : $t('message.common.save', 'Save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, watch, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'UserModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'create',
      validator: (value) => ['create', 'edit'].includes(value)
    },
    initialData: {
      type: Object,
      default: () => ({})
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const { t } = useI18n({ useScope: 'global' });
    const { show, initialData } = toRefs(props);
    
    const getInitialState = () => ({
      full_name: '',
      email: '',
      password: '',
      role: 'user',
      status: 'active'
    });

    const formData = ref(getInitialState());

    watch(show, (newVal) => {
      if (newVal) {
        if (props.mode === 'edit') {
           formData.value = {
            ...getInitialState(),
            ...props.initialData,
            password: '' // Don't populate password on edit
           };
        } else {
          formData.value = getInitialState();
        }
      }
    });

    const handleSubmit = () => {
      emit('save', formData.value);
    };

    return {
      t,
      formData,
      handleSubmit
    };
  }
};
</script>
