<template>
  <ModalWindow
    :show="show"
    :title="$t('message.auth.login')"
    :subtitle="$t('message.auth.login_subtitle')"
    icon="bi bi-box-arrow-in-right"
    icon-bg-class="bg-blue-100 dark:bg-blue-900/30"
    icon-color-class="text-blue-600 dark:text-blue-400"
    z-index-class="z-[3000]"
    :close-on-click-outside="false"
    @close="handleClose"
  >
    <!-- Form -->
    <form @submit.prevent="handleLogin" class="space-y-4">
      <!-- Error Alert -->
      <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <div class="flex items-center">
          <i class="bi bi-exclamation-triangle-fill text-red-600 dark:text-red-400 mr-2 text-lg"></i>
          <div class="flex-1">
            <p class="text-sm font-medium text-red-800 dark:text-red-300">{{ errorMessage }}</p>
            <ul v-if="fieldErrors.length" class="mt-1 text-xs text-red-700 dark:text-red-400 list-disc list-inside">
              <li v-for="(err, index) in fieldErrors" :key="index">
                <strong>{{ err.field }}:</strong> {{ err.message }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Email -->
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ $t('message.auth.email') }}
        </label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          required
          :disabled="isLoading"
          :class="[loginInputClass, { 'border-red-300 dark:border-red-600': hasFieldError('email') }]"
          :placeholder="$t('message.auth.email_placeholder')"
        />
      </div>

      <!-- Password -->
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ $t('message.auth.password') }}
        </label>
        <input
          id="password"
          v-model="formData.password"
          type="password"
          required
          :disabled="isLoading"
          :class="[loginInputClass, { 'border-red-300 dark:border-red-600': hasFieldError('password') }]"
          :placeholder="$t('message.auth.password_placeholder')"
        />
      </div>

      <!-- Remember & Forgot -->
      <div class="flex items-center justify-between text-sm">
        <label class="flex items-center">
          <input
            v-model="formData.remember"
            type="checkbox"
            :disabled="isLoading"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="ml-2 text-gray-600 dark:text-gray-400">{{ $t('message.auth.remember_me') }}</span>
        </label>
        <button
          type="button"
          :title="$t('message.auth.forgot_password')"
          :aria-label="$t('message.auth.forgot_password')"
          @click.prevent
          class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 cursor-pointer"
        >
          {{ $t('message.auth.forgot_password') }}
        </button>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading"
        :class="submitButtonClass"
      >
        <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-if="isLoading">{{ $t('message.auth.logging_in') }}</span>
        <span v-else>{{ $t('message.auth.login') }}</span>
      </button>
    </form>

    <!-- Register Link -->
    <template #footer>
      <div class="text-center text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ $t('message.auth.no_account') }}</span>
        <button 
          @click="$emit('switch-to-register')"
          :title="$t('message.auth.register_now')"
          :aria-label="$t('message.auth.register_now')"
          class="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
        >
          {{ $t('message.auth.register_now') }}
        </button>
      </div>
    </template>
  </ModalWindow>
</template>

<script setup>
import ModalWindow from './ModalWindow.vue';
import { useLoginModalForm } from '/vue/composables/useLoginModalForm.js';

defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'switch-to-register', 'login-success']);

const loginInputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const submitButtonClass =
  'w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600';

const {
  formData,
  isLoading,
  errorMessage,
  fieldErrors,
  hasFieldError,
  handleLogin,
  handleClose
} = useLoginModalForm(emit);
</script>
