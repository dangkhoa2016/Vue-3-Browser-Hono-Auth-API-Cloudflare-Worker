<template>
  <div class="flex items-center justify-center min-h-[60vh] fade-in">
    <div class="text-center">
      <div class="mb-4 relative inline-block">
        <i class="bi bi-sign-dead-end text-9xl text-gray-400 opacity-25"></i>
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span class="text-6xl font-bold text-blue-600">404</span>
        </div>
      </div>
      
      <h1 class="text-4xl font-bold mb-3 text-gray-900 dark:text-white">{{ $t('message.not_found.title') }}</h1>
      <p class="text-xl text-gray-500 dark:text-gray-400 mb-8">{{ $t('message.not_found.message') }}</p>
      
      <div class="flex justify-center gap-4">
        <button @click="goBack" class="px-6 py-2 rounded-full border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center">
          <i class="bi bi-arrow-left mr-2"></i> {{ $t('message.not_found.back') }}
        </button>
        <router-link to="/" class="px-6 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center">
          <i class="bi bi-house-door mr-2"></i> {{ $t('message.not_found.home') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router';

export default {
  name: 'NotFound',
  setup() {
    const router = useRouter();

    const goBack = () => {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    };

    return {
      goBack,
    };
  }
}
</script>

<style scoped>
.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-3px);
  box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
}
</style>
