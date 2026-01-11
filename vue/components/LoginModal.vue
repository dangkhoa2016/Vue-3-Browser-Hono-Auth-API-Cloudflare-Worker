<template>
  <ModalWindow
    :show="show"
    :title="$t('message.auth.login')"
    :subtitle="$t('message.auth.login_subtitle')"
    icon="bi bi-box-arrow-in-right"
    icon-bg-class="bg-blue-100 dark:bg-blue-900/30"
    icon-color-class="text-blue-600 dark:text-blue-400"
    :close-on-click-outside="false"
    @close="$emit('close')"
  >
    <!-- Form -->
    <form @submit.prevent="handleLogin" class="space-y-4">
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
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
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
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
          :placeholder="$t('message.auth.password_placeholder')"
        />
      </div>

      <!-- Remember & Forgot -->
      <div class="flex items-center justify-between text-sm">
        <label class="flex items-center">
          <input
            v-model="formData.remember"
            type="checkbox"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="ml-2 text-gray-600 dark:text-gray-400">{{ $t('message.auth.remember_me') }}</span>
        </label>
        <a href="#" class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
          {{ $t('message.auth.forgot_password') }}
        </a>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        {{ $t('message.auth.login') }}
      </button>
    </form>

    <!-- Register Link -->
    <template #footer>
      <div class="text-center text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ $t('message.auth.no_account') }}</span>
        <button 
          @click="$emit('switch-to-register')"
          class="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
        >
          {{ $t('message.auth.register_now') }}
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
  emits: ['close', 'switch-to-register'],
  setup(props, { emit }) {
    const formData = reactive({
      email: '',
      password: '',
      remember: false
    });

    const handleLogin = () => {
      // TODO: Implement API call
      console.log('Login attempt:', formData);
      // For now, just close the modal
      emit('close');
    };

    return {
      formData,
      handleLogin
    };
  }
}
</script>
