<template>
  <ModalWindow
    :show="show"
    :title="$t('message.auth.register')"
    :subtitle="$t('message.auth.register_subtitle')"
    icon="bi bi-person-plus"
    icon-bg-class="bg-green-100 dark:bg-green-900/30"
    icon-color-class="text-green-600 dark:text-green-400"
    :close-on-click-outside="false"
    @close="$emit('close')"
  >
    <!-- Form -->
    <form @submit.prevent="handleRegister" class="space-y-4">
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
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white transition-colors"
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
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white transition-colors"
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
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white transition-colors"
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
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white transition-colors"
          :placeholder="$t('message.auth.confirm_password_placeholder')"
        />
      </div>

      <!-- Terms -->
      <div class="flex items-start">
        <input
          v-model="formData.acceptTerms"
          type="checkbox"
          required
          class="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <label class="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('message.auth.accept_terms_prefix') }}
          <a href="#" class="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300">
            {{ $t('message.auth.terms_of_service') }}
          </a>
          {{ $t('message.auth.and') }}
          <a href="#" class="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300">
            {{ $t('message.auth.privacy_policy') }}
          </a>
        </label>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
      >
        {{ $t('message.auth.register') }}
      </button>
    </form>

    <!-- Login Link -->
    <template #footer>
      <div class="text-center text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ $t('message.auth.already_have_account') }}</span>
        <button 
          @click="$emit('switch-to-login')"
          class="ml-1 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 font-medium"
        >
          {{ $t('message.auth.login_now') }}
        </button>
      </div>
    </template>
  </ModalWindow>
</template>

<script>
import { reactive } from 'vue';
import ModalWindow from './ModalWindow.vue';

export default {
  components: {
    ModalWindow
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'switch-to-login'],
  setup(props, { emit }) {
    const formData = reactive({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    });

    const handleRegister = () => {
      // TODO: Implement API call
      console.log('Register attempt:', formData);
      // For now, just close the modal
      emit('close');
    };

    return {
      formData,
      handleRegister
    };
  }
}
</script>
