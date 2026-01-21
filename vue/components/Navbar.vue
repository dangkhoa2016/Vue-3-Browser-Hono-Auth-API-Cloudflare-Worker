<template>
  <nav class="bg-white dark:bg-gray-800 shadow-md transition-colors duration-300">
    <div class="container mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link to="/" class="flex-shrink-0 flex items-center group" :title="t('message.navbar.brand_title')">
            <img src="/assets/img/favicon.png" alt="Logo"
              class="w-7 h-7 sm:w-8 sm:h-8 mr-2 group-hover:rotate-12 transition-transform" />
            <span
              class="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 hidden xs:inline">{{
                t('message.navbar.brand') }}</span>
          </router-link>
          <div class="hidden lg:ml-8 lg:flex lg:space-x-8">
            <router-link v-for="item in menuItems" :key="item.path" :to="item.path"
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200"
              :class="[
                $route.path === item.path
                  ? 'border-blue-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300'
              ]">
              {{ item.name }}
            </router-link>

            <!-- About / API dropdown -->
            <div class="relative" ref="aboutDropdownRef"
              @mouseenter="openAboutDropdown"
              @mouseleave="closeAboutDropdown">
              <button @click="toggleAboutDropdown"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200"
                :class="showAboutDropdown
                  ? 'border-blue-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300'"
              >
                {{ t('message.navbar.this_project') }}
                <i class="bi bi-chevron-down text-[11px] ml-1"></i>
              </button>
              <transition name="dropdown">
                <div v-if="showAboutDropdown"
                  class="absolute left-0 mt-2 w-max min-w-[230px] bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-40 whitespace-nowrap">
                  <router-link to="/about" @click="showAboutDropdown = false"
                    class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 whitespace-nowrap">
                    {{ t('message.navbar.about') }}
                  </router-link>
                  <router-link to="/api-info" @click="showAboutDropdown = false"
                    class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 whitespace-nowrap">
                    {{ t('message.navbar.api_explorer') }}
                    <span class="text-[11px] text-gray-500 ml-1">({{ t('message.auth.login_required') }})</span>
                  </router-link>
                </div>
              </transition>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
          <!-- User Profile (when authenticated) -->
          <template v-if="isAuthenticated">
            <div class="hidden lg:flex items-center space-x-2">
              <router-link to="/profile" 
                class="flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30">
                <i class="bi bi-person-circle text-sm mr-1.5"></i>
                <span class="max-w-[100px] truncate">{{ user?.full_name || user?.email }}</span>
              </router-link>
              <button @click="handleLogout"
                class="flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm border border-red-200 dark:border-red-800 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                :title="$t('message.auth.logout')">
                <i class="bi bi-box-arrow-right text-sm mr-1.5"></i>
                {{ $t('message.auth.logout') }}
              </button>
            </div>
          </template>
          
          <!-- Login/Register (when not authenticated) -->
          <template v-else>
            <!-- Login Button -->
            <button @click="openLoginModal"
              class="hidden lg:flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              :title="$t('message.auth.login')">
              <i class="bi bi-box-arrow-in-right text-sm mr-1.5"></i> {{ $t('message.auth.login') }}
            </button>

            <!-- Register Button -->
            <button @click="openRegisterModal"
              class="hidden lg:flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm border border-transparent bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
              :title="$t('message.auth.register')">
              <i class="bi bi-person-plus text-sm mr-1.5"></i> {{ $t('message.auth.register') }}
            </button>
          </template>

          <!-- Language Selector -->
          <div class="relative" ref="languageDropdownRef">
            <button @click="toggleLanguageDropdown"
              class="flex items-center px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              :title="t('message.navbar.change_language')">
              <i class="bi bi-translate text-sm"></i>
              <span class="uppercase ml-1 text-xs">{{ currentLanguage }}</span>
              <i class="bi bi-chevron-down text-xs ml-0.5 transition-transform"
                :class="{ 'rotate-180': showLanguageDropdown }"></i>
            </button>

            <transition name="dropdown">
              <div v-if="showLanguageDropdown"
                class="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50">
                <button v-for="lang in languages" :key="lang.code" @click="changeLanguage(lang.code)"
                  class="w-full text-left px-4 py-2 text-sm transition-colors duration-150" :class="[
                    currentLanguage === lang.code
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  ]">
                  <i class="bi bi-check2 text-base mr-2"
                    :class="currentLanguage === lang.code ? 'visible' : 'invisible'"></i>
                  {{ lang.label }}
                </button>
              </div>
            </transition>
          </div>

          <!-- Mock API Toggle -->
          <button @click="store.setMockApi(!store.mockApi)"
            class="hidden md:flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm border"
            :class="store.mockApi
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 hover:bg-green-100'
              : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300 hover:bg-yellow-100'"
            :title="t('message.navbar.toggle_api_mode')">
            <span class="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse"
              :class="store.mockApi ? 'bg-green-500' : 'bg-yellow-500'"></span>
            <span class="hidden lg:inline">{{ store.mockApi ? t('message.navbar.mock_label') : t('message.navbar.real_label') }}</span>
          </button>

          <!-- Dark Mode Toggle -->
          <button @click="store.toggleDarkMode"
            class="h-9 w-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none transition-transform duration-200 hover:scale-110 active:scale-95"
            :title="store.darkMode ? t('message.navbar.switch_to_light') : t('message.navbar.switch_to_dark')">
            <i class="bi text-base" :class="store.darkMode ? 'bi-sun-fill' : 'bi-moon-fill'"></i>
          </button>

          <!-- Mobile Menu Button -->
          <button @click="toggleMobileMenu"
            class="lg:hidden h-9 w-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none transition-transform duration-200 hover:scale-110 active:scale-95"
            :title="t('message.navbar.menu')">
            <i class="bi text-base" :class="showMobileMenu ? 'bi-x-lg' : 'bi-list'"></i>
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <transition name="mobile-menu">
        <div v-if="showMobileMenu" class="lg:hidden pb-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div class="space-y-1">
            <router-link v-for="item in menuItems" :key="item.path" :to="item.path" @click="showMobileMenu = false"
              class="block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200" :class="[
                $route.path === item.path
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              ]">
              {{ item.name }}
            </router-link>

            <!-- Mobile dropdown items rendered flat -->
            <router-link to="/about" @click="showMobileMenu = false"
              class="block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              :class="[
                $route.path === '/about'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              ]">
              {{ t('message.navbar.about') }}
            </router-link>
            <router-link to="/api-info" @click="showMobileMenu = false"
              class="block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              :class="[
                $route.path === '/api-info'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              ]">
              {{ t('message.navbar.api_explorer') }}
              <span class="text-[11px] text-gray-500 ml-1">({{ t('message.auth.login_required') }})</span>
            </router-link>
          </div>

          <!-- Mobile Auth Buttons -->
          <div class="mt-3 space-y-2">
            <template v-if="isAuthenticated">
              <router-link to="/profile" @click="showMobileMenu = false"
                class="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400">
                <i class="bi bi-person-circle text-base mr-2"></i>
                {{ user?.full_name || user?.email }}
              </router-link>
              <button @click="() => { handleLogout(); showMobileMenu = false; }"
                class="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm border border-red-200 dark:border-red-800 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400">
                <i class="bi bi-box-arrow-right text-base mr-2"></i>
                {{ $t('message.auth.logout') }}
              </button>
            </template>
            <template v-else>
              <button @click="openLoginModal"
                class="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400">
                <i class="bi bi-box-arrow-in-right text-base mr-2"></i>
                {{ $t('message.auth.login') }}
              </button>
              <button @click="openRegisterModal"
                class="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 shadow-sm border border-transparent bg-blue-600 dark:bg-blue-500 text-white">
                <i class="bi bi-person-plus text-base mr-2"></i>
                {{ $t('message.auth.register') }}
              </button>
            </template>
          </div>

          <!-- Mobile API Toggle -->
          <div class="mt-3">
            <button @click="store.setMockApi(!store.mockApi)"
              class="w-full flex items-center justify-center px-3 py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-sm border"
              :class="store.mockApi
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300'">
              <span class="w-1.5 h-1.5 rounded-full mr-2 animate-pulse"
                :class="store.mockApi ? 'bg-green-500' : 'bg-yellow-500'"></span>
              {{ store.mockApi ? t('message.navbar.mock_label') : t('message.navbar.real_label') }}
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- Login Modal -->
    <LoginModal 
      :show="showLoginModal" 
      @close="closeModals"
      @login-success="handleLoginSuccess"
      @switch-to-register="switchToRegister" />

    <!-- Register Modal -->
    <RegisterModal 
      :show="showRegisterModal" 
      @close="closeModals"
      @switch-to-login="switchToLogin" />
    
    <!-- Logout Confirm Modal -->
    <ConfirmModal
      :show="showLogoutConfirm"
      :title="$t('message.auth.logout_confirm_title')"
      :message="$t('message.auth.logout_confirm_message')"
      :confirm-text="$t('message.auth.confirm')"
      :cancel-text="$t('message.auth.cancel')"
      icon="bi bi-box-arrow-right"
      icon-bg-class="bg-red-100 dark:bg-red-900/30"
      icon-color-class="text-red-600 dark:text-red-400"
      confirm-button-class="bg-red-600 hover:bg-red-700 focus:ring-red-500"
      @confirm="confirmLogout"
      @cancel="showLogoutConfirm = false"
    />
  </nav>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LANGUAGES, loadLanguageAsync } from '/assets/js/i18n.js';
import LoginModal from './LoginModal.vue';
import RegisterModal from './RegisterModal.vue';
import ConfirmModal from './ConfirmModal.vue';

export default {
  components: {
    LoginModal,
    RegisterModal,
    ConfirmModal
  },
  setup() {
    const store = useMainStore();
    const { t, locale } = useI18n({ useScope: 'global' });

    const showLanguageDropdown = ref(false);
    const showMobileMenu = ref(false);
    const showLogoutConfirm = ref(false);
    const languageDropdownRef = ref(null);
    const currentLanguage = computed(() => locale.value);
    const languages = SUPPORTED_LANGUAGES;
    
    // Use Pinia stores
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    
    // Initialize auth store from localStorage
    authStore.init();
    
    // Auth state
    const isAuthenticated = computed(() => authStore.isAuthenticated);
    const user = computed(() => authStore.user);
    
    // Modal states from modalStore
    const showLoginModal = computed(() => modalStore.showLoginModal);
    const showRegisterModal = computed(() => modalStore.showRegisterModal);

    const menuItems = computed(() => ([
      { name: t('message.navbar.home'), path: '/' },
      { name: t('message.navbar.profile'), path: '/profile' }
    ]));

    const showAboutDropdown = ref(false);
    const aboutDropdownRef = ref(null);
    let aboutDropdownTimer = null;

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
      if (aboutDropdownRef.value && !aboutDropdownRef.value.contains(event.target)) {
        showAboutDropdown.value = false;
      }
    };

    const openAboutDropdown = () => {
      if (aboutDropdownTimer) {
        clearTimeout(aboutDropdownTimer);
        aboutDropdownTimer = null;
      }
      showAboutDropdown.value = true;
    };

    const closeAboutDropdown = () => {
      if (aboutDropdownTimer) {
        clearTimeout(aboutDropdownTimer);
      }
      aboutDropdownTimer = setTimeout(() => {
        showAboutDropdown.value = false;
      }, 120);
    };

    const toggleAboutDropdown = () => {
      if (showAboutDropdown.value) {
        if (aboutDropdownTimer) {
          clearTimeout(aboutDropdownTimer);
        }
        showAboutDropdown.value = false;
      } else {
        openAboutDropdown();
      }
    };

    const handleLoginSuccess = async (response) => {
      if (response.data) {
        // Extract user and tokens from response.data
        const { user, access_token, refresh_token } = response.data;
        
        // Save to auth store
        authStore.login(user, access_token, refresh_token);
        
        // Clear auth required flags
        sessionStorage.removeItem('authRequired');
        sessionStorage.removeItem('intendedRoute');
        
        // Let modalStore handle success
        modalStore.handleLoginSuccess(response);
      }
    };

    const handleLogout = () => {
      showLogoutConfirm.value = true;
    };
    
    const confirmLogout = () => {
      authStore.logout();
      showLogoutConfirm.value = false;
      showMobileMenu.value = false;
    };
    
    const openLoginModal = () => {
      modalStore.openLogin();
      showMobileMenu.value = false;
    };
    
    const openRegisterModal = () => {
      modalStore.openRegister();
      showMobileMenu.value = false;
    };
    
    const closeModals = () => {
      modalStore.closeAll();
    };
    
    const switchToRegister = () => {
      modalStore.switchToRegister();
    };
    
    const switchToLogin = () => {
      modalStore.switchToLogin();
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
      if (aboutDropdownTimer) {
        clearTimeout(aboutDropdownTimer);
      }
    });

    return {
      store,
      menuItems,
      t,
      showLanguageDropdown,
      showMobileMenu,
      showLogoutConfirm,
      showAboutDropdown,
      showLoginModal,
      showRegisterModal,
      languageDropdownRef,
      aboutDropdownRef,
      currentLanguage,
      languages,
      isAuthenticated,
      user,
      toggleLanguageDropdown,
      toggleMobileMenu,
      changeLanguage,
      openAboutDropdown,
      closeAboutDropdown,
      toggleAboutDropdown,
      handleLoginSuccess,
      handleLogout,
      confirmLogout,
      openLoginModal,
      openRegisterModal,
      closeModals,
      switchToRegister,
      switchToLogin
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
