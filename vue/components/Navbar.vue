<template>
  <nav class="bg-white dark:bg-gray-800 shadow-md transition-colors duration-300">
    <div class="container mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link to="/" class="flex-shrink-0 flex items-center group">
            <i class="bi bi-box-seam text-2xl text-blue-600 dark:text-blue-400 mr-2 group-hover:rotate-12 transition-transform"></i>
            <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">{{ t('message.navbar.brand') }}</span>
          </router-link>
          <div class="hidden md:ml-8 md:flex md:space-x-8">
            <router-link 
              v-for="item in menuItems" 
              :key="item.path" 
              :to="item.path"
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200"
              :class="[
                $route.path === item.path 
                  ? 'border-blue-500 text-gray-900 dark:text-white' 
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300'
              ]"
            >
              {{ item.name }}
            </router-link>
          </div>
        </div>
        
        <div class="flex items-center space-x-4">
          <!-- Mock API Toggle -->
          <button 
            @click="store.setMockApi(!store.mockApi)"
            class="flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shadow-sm border"
            :class="store.mockApi 
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 hover:bg-green-100' 
              : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300 hover:bg-yellow-100'"
            :title="t('message.navbar.toggle_api_mode')"
          >
            <span class="w-1.5 h-1.5 rounded-full mr-2 animate-pulse" :class="store.mockApi ? 'bg-green-500' : 'bg-yellow-500'"></span>
            {{ store.mockApi ? t('message.navbar.mock_label') : t('message.navbar.real_label') }}
          </button>

          <!-- Dark Mode Toggle -->
          <button 
            @click="store.toggleDarkMode" 
            class="h-10 w-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none transition-transform duration-200 hover:scale-110 active:scale-95"
            :title="store.darkMode ? t('message.navbar.switch_to_light') : t('message.navbar.switch_to_dark')"
          >
            <i class="bi text-lg" :class="store.darkMode ? 'bi-sun-fill' : 'bi-moon-fill'"></i>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { computed } from 'vue';
import { useMainStore } from '/assets/js/stores/main.js';
import { useI18n } from 'vue-i18n';

export default {
  setup() {
    const store = useMainStore();
    const { t } = useI18n({ useScope: 'global' });
    
    const menuItems = computed(() => ([
      { name: t('message.navbar.home'), path: '/' },
      { name: t('message.navbar.profile'), path: '/profile' },
      { name: t('message.navbar.about'), path: '/about' }
    ]));

    return {
      store,
      menuItems,
      t
    };
  }
}
</script>
