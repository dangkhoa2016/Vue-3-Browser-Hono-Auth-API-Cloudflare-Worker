<template>
  <nav class="bg-white dark:bg-gray-800 shadow-md transition-colors duration-300">
    <div class="container mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link 
            to="/" 
            class="flex-shrink-0 flex items-center group"
            :title="t('message.navbar.brand_title')"
          >
            <img 
              src="/assets/img/favicon.png" 
              alt="Logo" 
              class="w-7 h-7 sm:w-8 sm:h-8 mr-2 group-hover:rotate-12 transition-transform"
            />
            <span class="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 hidden xs:inline">{{ t('message.navbar.brand') }}</span>
          </router-link>
          <div class="hidden lg:ml-8 lg:flex lg:space-x-8">
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
        
        <div class="flex items-center space-x-2 sm:space-x-4">
          <!-- Language Selector -->
          <div class="relative" ref="languageDropdownRef">
            <button 
              @click="toggleLanguageDropdown"
              class="flex items-center px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              :title="t('message.navbar.change_language')"
            >
              <i class="bi bi-translate text-sm sm:text-base sm:mr-1.5"></i>
              <span class="uppercase hidden sm:inline ml-1">{{ currentLanguage }}</span>
              <i class="bi bi-chevron-down text-xs ml-1 transition-transform" :class="{ 'rotate-180': showLanguageDropdown }"></i>
            </button>
            
            <transition name="dropdown">
              <div 
                v-if="showLanguageDropdown"
                class="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50"
              >
                <button
                  v-for="lang in languages"
                  :key="lang.code"
                  @click="changeLanguage(lang.code)"
                  class="w-full text-left px-4 py-2 text-sm transition-colors duration-150"
                  :class="[
                    currentLanguage === lang.code 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  ]"
                >
                  <i class="bi bi-check2 text-base mr-2" :class="currentLanguage === lang.code ? 'visible' : 'invisible'"></i>
                  {{ lang.label }}
                </button>
              </div>
            </transition>
          </div>

          <!-- Mock API Toggle -->
          <button 
            @click="store.setMockApi(!store.mockApi)"
            class="hidden sm:flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shadow-sm border"
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
            class="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none transition-transform duration-200 hover:scale-110 active:scale-95"
            :title="store.darkMode ? t('message.navbar.switch_to_light') : t('message.navbar.switch_to_dark')"
          >
            <i class="bi text-base sm:text-lg" :class="store.darkMode ? 'bi-sun-fill' : 'bi-moon-fill'"></i>
          </button>

          <!-- Mobile Menu Button -->
          <button 
            @click="toggleMobileMenu"
            class="lg:hidden h-9 w-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none transition-transform duration-200 hover:scale-110 active:scale-95"
            :title="t('message.navbar.menu')"
          >
            <i class="bi text-lg" :class="showMobileMenu ? 'bi-x-lg' : 'bi-list'"></i>
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <transition name="mobile-menu">
        <div v-if="showMobileMenu" class="lg:hidden pb-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div class="space-y-1">
            <router-link 
              v-for="item in menuItems" 
              :key="item.path" 
              :to="item.path"
              @click="showMobileMenu = false"
              class="block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              :class="[
                $route.path === item.path 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              ]"
            >
              {{ item.name }}
            </router-link>
          </div>
          
          <!-- Mobile API Toggle -->
          <div class="mt-3 px-3 sm:hidden">
            <button 
              @click="store.setMockApi(!store.mockApi)"
              class="w-full flex items-center justify-center px-3 py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-sm border"
              :class="store.mockApi 
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300' 
                : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300'"
            >
              <span class="w-1.5 h-1.5 rounded-full mr-2 animate-pulse" :class="store.mockApi ? 'bg-green-500' : 'bg-yellow-500'"></span>
              {{ store.mockApi ? t('message.navbar.mock_label') : t('message.navbar.real_label') }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </nav>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useMainStore } from '/assets/js/stores/main.js';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LANGUAGES, loadLanguageAsync } from '/assets/js/i18n.js';

export default {
  setup() {
    const store = useMainStore();
    const { t, locale } = useI18n({ useScope: 'global' });
    
    const showLanguageDropdown = ref(false);
    const showMobileMenu = ref(false);
    const languageDropdownRef = ref(null);
    const currentLanguage = computed(() => locale.value);
    const languages = SUPPORTED_LANGUAGES;
    
    const menuItems = computed(() => ([
      { name: t('message.navbar.home'), path: '/' },
      { name: t('message.navbar.profile'), path: '/profile' },
      { name: t('message.navbar.about'), path: '/about' }
    ]));

    const toggleLanguageDropdown = () => {
      showLanguageDropdown.value = !showLanguageDropdown.value;
    };

    const toggleMobileMenu = () => {
      showMobileMenu.value = !showMobileMenu.value;
    };

    const changeLanguage = async (langCode) => {
      await loadLanguageAsync(langCode);
      showLanguageDropdown.value = false;
    };

    const handleClickOutside = (event) => {
      if (languageDropdownRef.value && !languageDropdownRef.value.contains(event.target)) {
        showLanguageDropdown.value = false;
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      store,
      menuItems,
      t,
      showLanguageDropdown,
      showMobileMenu,
      languageDropdownRef,
      currentLanguage,
      languages,
      toggleLanguageDropdown,
      toggleMobileMenu,
      changeLanguage
    };
  }
}
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.mobile-menu-enter-to,
.mobile-menu-leave-from {
  opacity: 1;
  max-height: 500px;
}

@media (min-width: 400px) {
  .hidden.xs\:inline {
    display: inline;
  }
}
</style>
