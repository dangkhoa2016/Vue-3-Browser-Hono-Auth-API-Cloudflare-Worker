<template>
  <ModalWindow
    :show="show"
    :title="$t('message.auth.register')"
    :subtitle="$t('message.auth.register_subtitle')"
    icon="bi bi-person-plus"
    icon-bg-class="bg-green-100 dark:bg-green-900/30"
    icon-color-class="text-green-600 dark:text-green-400"
    :close-on-click-outside="false"
    @close="handleClose"
  >
    <!-- Form -->
    <form @submit.prevent="handleRegister" class="space-y-4">
      <!-- Success Alert (Status: Active) -->
      <div v-if="successMessage && registrationStatus === 'active'" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <div class="flex items-start">
          <i class="bi bi-check-circle-fill text-green-600 dark:text-green-400 mt-0.5 mr-2"></i>
          <div class="flex-1">
            <p class="text-sm font-medium text-green-800 dark:text-green-300">{{ successMessage }}</p>
            <p class="text-xs text-green-700 dark:text-green-400 mt-1">{{ $t('message.auth.can_login_now') }}</p>
          </div>
        </div>
      </div>

      <!-- Info Alert (Status: Inactive) -->
      <div v-if="successMessage && registrationStatus === 'inactive'" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <div class="flex items-start">
          <i class="bi bi-info-circle-fill text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2"></i>
          <div class="flex-1">
            <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">{{ successMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <div class="flex items-center">
          <i class="bi bi-exclamation-triangle-fill text-red-600 dark:text-red-400 mr-2 text-lg"></i>
          <div class="flex-1">
            <p class="text-sm font-medium text-red-800 dark:text-red-300">{{ errorMessage }}</p>
            <ul v-if="fieldErrors.length" class="mt-1 text-xs text-red-700 dark:text-red-400 list-disc list-inside">
              <li v-for="(err, index) in fieldErrors" :key="index">
                {{ err.message }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Full Name -->
      <div>
        <label for="fullname" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ $t('message.auth.full_name') }}
        </label>
        <input
          id="fullname"
          v-model="formData.fullName"
          type="text"
          required
          :disabled="isLoading"
          :class="[registerInputClass, { 'border-red-300 dark:border-red-600': hasFieldError('full_name') }]"
          :placeholder="$t('message.auth.full_name_placeholder')"
        />
      </div>

      <!-- Email -->
      <div>
        <label for="reg-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ $t('message.auth.email') }}
        </label>
        <input
          id="reg-email"
          v-model="formData.email"
          type="email"
          required
          :disabled="isLoading"
          :class="[registerInputClass, { 'border-red-300 dark:border-red-600': hasFieldError('email') }]"
          :placeholder="$t('message.auth.email_placeholder')"
        />
      </div>

      <!-- Password -->
      <div>
        <label for="reg-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ $t('message.auth.password') }}
        </label>
        <input
          id="reg-password"
          v-model="formData.password"
          type="password"
          required
          :disabled="isLoading"
          :class="[registerInputClass, { 'border-red-300 dark:border-red-600': hasFieldError('password') }]"
          :placeholder="$t('message.auth.password_placeholder')"
        />
      </div>

      <!-- Confirm Password -->
      <div>
        <label for="confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ $t('message.auth.confirm_password') }}
        </label>
        <input
          id="confirm-password"
          v-model="formData.confirmPassword"
          type="password"
          required
          :disabled="isLoading"
          :class="registerInputClass"
          :placeholder="$t('message.auth.confirm_password_placeholder')"
        />
      </div>

      <!-- Terms -->
      <div class="flex items-start">
        <input
          v-model="formData.acceptTerms"
          type="checkbox"
          required
          :disabled="isLoading"
          class="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <label class="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('message.auth.accept_terms_prefix') }}
          <button
            type="button"
            :title="$t('message.auth.terms_of_service')"
            :aria-label="$t('message.auth.terms_of_service')"
            @click.prevent
            class="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 cursor-pointer"
          >
            {{ $t('message.auth.terms_of_service') }}
          </button>
          {{ $t('message.auth.and') }}
          <button
            type="button"
            :title="$t('message.auth.privacy_policy')"
            :aria-label="$t('message.auth.privacy_policy')"
            @click.prevent
            class="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 cursor-pointer"
          >
            {{ $t('message.auth.privacy_policy') }}
          </button>
        </label>
      </div>

      <!-- Submit Button -->
      <button
        v-if="!successMessage"
        type="submit"
        :disabled="isLoading"
        :class="registerSubmitButtonClass"
      >
        <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-if="isLoading">{{ $t('message.auth.registering') }}</span>
        <span v-else>{{ $t('message.auth.register') }}</span>
      </button>

      <!-- Login Button (After Success) -->
      <button
        v-if="successMessage && registrationStatus === 'active'"
        type="button"
        @click="handleGoToLogin"
        :class="goToLoginButtonClass"
      >
        {{ $t('message.auth.go_to_login') }}
      </button>

      <!-- Close Button (After Inactive Registration) -->
      <button
        v-if="successMessage && registrationStatus === 'inactive'"
        type="button"
        @click="handleClose"
        :class="inactiveCloseButtonClass"
      >
        {{ $t('message.auth.close') }}
      </button>
    </form>

    <!-- Login Link -->
    <template #footer>
      <div v-if="!successMessage" class="text-center text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ $t('message.auth.already_have_account') }}</span>
        <button 
          @click="$emit('switch-to-login')"
          :title="$t('message.auth.login_now')"
          :aria-label="$t('message.auth.login_now')"
          class="ml-1 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 font-medium"
        >
          {{ $t('message.auth.login_now') }}
        </button>
      </div>
    </template>
  </ModalWindow>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import ModalWindow from './ModalWindow.vue';
import { useRegisterModalForm } from '/vue/composables/useRegisterModalForm.js';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'switch-to-login', 'register-success']);
const { t } = useI18n();

const registerInputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const registerSubmitButtonClass =
  'w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600';
const goToLoginButtonClass =
  'w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors';
const inactiveCloseButtonClass =
  'w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors';
const {
  formData,
  isLoading,
  errorMessage,
  fieldErrors,
  successMessage,
  registrationStatus,
  hasFieldError,
  handleRegister,
  handleGoToLogin,
  handleClose
} = useRegisterModalForm(props, emit, t);
</script>
