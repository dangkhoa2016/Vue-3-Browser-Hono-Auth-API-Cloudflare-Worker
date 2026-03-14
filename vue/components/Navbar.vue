<template>
  <nav class="bg-white dark:bg-gray-800 shadow-md transition-colors duration-300">
    <div class="container mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link to="/" class="flex-shrink-0 flex items-center group" :title="$t('message.navbar.brand_title')">
            <img src="/assets/img/favicon.png" alt="Logo"
              class="w-7 h-7 sm:w-8 sm:h-8 mr-2 group-hover:rotate-12 transition-transform" />
            <span
              class="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 hidden xs:inline">
              {{ $t('message.navbar.brand') }}</span>
          </router-link>
          <div class="hidden lg:ml-4 lg:flex lg:space-x-1">
            <router-link v-for="item in menuItems" :key="item.path" :to="item.path"
              :class="getTopMenuClass($route.path === item.path)">
              {{ item.name }}
            </router-link>

            <!-- Admin dropdown -->
            <div v-if="isAuthenticated && isAdmin" class="relative" ref="adminDropdownRef"
              @mouseenter="openAdminDropdown"
              @mouseleave="closeAdminDropdown">
              <button @click="toggleAdminDropdown"
                :class="getTopMenuClass(showAdminDropdown || isAdminRouteActive)"
              >
                <i class="bi bi-shield-lock text-[14px] mr-1.5"></i>
                <span class="truncate max-w-[110px] xl:max-w-none">{{ $t('message.navbar.admin') }}</span>
                <i class="bi bi-chevron-down text-[11px] ml-1.5 transition-transform duration-200" :class="{ 'rotate-180': showAdminDropdown }"></i>
              </button>
              <transition name="dropdown">
                <div v-if="showAdminDropdown"
                  class="absolute left-0 mt-2 w-max min-w-[230px] bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-40 whitespace-nowrap">
                  <router-link v-for="item in adminMenuItems" :key="item.path" :to="item.path" @click="showAdminDropdown = false"
                    :class="getDropdownItemClass($route.path === item.path, true)">
                    <i :class="item.icon" class="text-base mr-2"></i>
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- About / API dropdown -->
            <div class="relative" ref="aboutDropdownRef"
              @mouseenter="openAboutDropdown"
              @mouseleave="closeAboutDropdown">
              <button @click="toggleAboutDropdown"
                :class="getTopMenuClass(showAboutDropdown || isAboutRouteActive)"
              >
                <span class="truncate max-w-[110px] xl:max-w-none">{{ $t('message.navbar.this_project') }}</span>
                <i class="bi bi-chevron-down text-[11px] ml-1.5 transition-transform duration-200" :class="{ 'rotate-180': showAboutDropdown }"></i>
              </button>
              <transition name="dropdown">
                <div v-if="showAboutDropdown"
                  class="absolute left-0 mt-2 w-max min-w-[230px] bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-40 whitespace-nowrap">
                  <template v-for="item in aboutMenuItems" :key="item.key">
                    <router-link :to="item.path" @click="showAboutDropdown = false"
                      :class="getDropdownItemClass($route.path === item.path)">
                      {{ item.name }}
                      <span v-if="item.loginRequired" class="text-[11px] text-gray-500 ml-1">({{ $t('message.auth.login_required') }})</span>
                    </router-link>
                  </template>
                </div>
              </transition>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
          <!-- User Profile (when authenticated) -->
          <template v-if="isAuthenticated">
            <div class="hidden lg:flex items-center ml-1 border-l border-gray-200 dark:border-gray-700 pl-2 space-x-1">
              <router-link to="/profile" 
                :class="desktopProfileLinkClass">
                <i class="bi bi-person-circle text-lg mr-2 text-gray-400 group-hover:text-blue-500 transition-colors"></i>
                <span class="hidden xl:block max-w-[150px] truncate">{{ user?.full_name || user?.email }}</span>
              </router-link>
              <button @click="handleLogout"
                :class="desktopLogoutButtonClass"
                :title="$t('message.auth.logout')">
                <i class="bi bi-box-arrow-right text-lg"></i>
              </button>
            </div>
          </template>
          
          <!-- Login/Register (when not authenticated) -->
          <template v-else>
            <!-- Login Button -->
            <button @click="openLoginModal"
              :class="desktopLoginButtonClass"
              :title="$t('message.auth.login')">
              <i class="bi bi-box-arrow-in-right text-sm mr-1.5"></i> {{ $t('message.auth.login') }}
            </button>

            <!-- Register Button -->
            <button @click="openRegisterModal"
              :class="desktopRegisterButtonClass"
              :title="$t('message.auth.register')">
              <i class="bi bi-person-plus text-sm mr-1.5"></i> {{ $t('message.auth.register') }}
            </button>
          </template>

          <!-- Language Selector -->
          <div class="relative" ref="languageDropdownRef">
            <button @click="toggleLanguageDropdown"
              :class="languageToggleButtonClass"
              :title="$t('message.navbar.change_language')">
              <i class="bi bi-translate text-lg"></i>
              <span class="uppercase ml-2 text-xs font-semibold">{{ currentLanguage }}</span>
              <i class="bi bi-chevron-down text-[10px] ml-1 transition-transform"
                :class="{ 'rotate-180': showLanguageDropdown }"></i>
            </button>

            <transition name="dropdown">
              <div v-if="showLanguageDropdown"
                class="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50">
                <button v-for="lang in languages" :key="lang.code" @click="changeLanguage(lang.code)"
                  :class="getLanguageOptionClass(lang.code)">
                  <i class="bi bi-check2 text-base mr-2"
                    :class="currentLanguage === lang.code ? 'visible' : 'invisible'"></i>
                  {{ lang.label }}
                </button>
              </div>
            </transition>
          </div>

          <!-- Mock API Toggle -->
          <button @click="store.setMockApi(!store.mockApi)"
            :class="getDesktopApiToggleClass()"
            :title="$t('message.navbar.toggle_api_mode')">
            <span class="w-2 h-2 rounded-full mr-2 shadow-sm"
              :class="store.mockApi ? 'bg-green-500' : 'bg-amber-500'"></span>
            <span class="hidden lg:inline font-medium uppercase tracking-wider text-[11px] whitespace-nowrap">{{ store.mockApi ? $t('message.navbar.mock_label') : $t('message.navbar.real_label') }}</span>
          </button>

          <!-- Dark Mode Toggle -->
          <button @click="store.toggleDarkMode"
            :class="iconCircleButtonClass"
            :title="store.darkMode ? $t('message.navbar.switch_to_light') : $t('message.navbar.switch_to_dark')">
            <i class="bi text-base" :class="store.darkMode ? 'bi-sun-fill' : 'bi-moon-fill'"></i>
          </button>

          <!-- Mobile Menu Button -->
          <button @click="toggleMobileMenu"
            :class="mobileMenuButtonClass"
            :title="$t('message.navbar.menu')">
            <i class="bi text-base" :class="showMobileMenu ? 'bi-x-lg' : 'bi-list'"></i>
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <transition name="mobile-menu">
        <div v-if="showMobileMenu" class="lg:hidden pb-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div class="space-y-1">
            <router-link v-for="item in menuItems" :key="item.path" :to="item.path" @click="showMobileMenu = false"
              :class="getMobilePrimaryClass($route.path === item.path)">
              {{ item.name }}
            </router-link>

            <!-- Mobile Admin Group -->
            <div v-if="isAuthenticated && isAdmin">
              <button @click="toggleMobileAdminMenu"
                :class="getMobileGroupClass(isAdminRouteActive || showMobileAdminMenu)">
                <span class="flex items-center">
                  <i class="bi bi-shield-lock text-base mr-2"></i>
                  {{ $t('message.navbar.admin') }}
                </span>
                <i class="bi bi-chevron-down text-xs transition-transform duration-200"
                   :class="{ 'rotate-180': showMobileAdminMenu }"></i>
              </button>

              <div v-show="showMobileAdminMenu || isAdminRouteActive" class="space-y-1">
                <router-link v-for="item in adminMenuItems" :key="item.path" :to="item.path" @click="showMobileMenu = false"
                  :class="getMobileSubLinkClass($route.path === item.path, true)">
                  <i :class="item.icon" class="text-base mr-2"></i>
                  {{ item.name }}
                </router-link>
              </div>
            </div>

            <!-- Mobile "This Project" Group -->
            <div>
              <button @click="toggleMobileAboutMenu"
                :class="getMobileGroupClass(isAboutRouteActive || showMobileAboutMenu)">
                <span>{{ $t('message.navbar.this_project') }}</span>
                <i class="bi bi-chevron-down text-xs transition-transform duration-200"
                   :class="{ 'rotate-180': showMobileAboutMenu }"></i>
              </button>

              <div v-show="showMobileAboutMenu || isAboutRouteActive" class="space-y-1">
                <template v-for="item in aboutMenuItems" :key="`mobile-${item.key}`">
                  <router-link :to="item.path" @click="showMobileMenu = false"
                    :class="getMobileSubLinkClass($route.path === item.path)">
                    {{ item.name }}
                    <span v-if="item.loginRequired" class="text-[11px] text-gray-500 ml-1">({{ $t('message.auth.login_required') }})</span>
                  </router-link>
                </template>
              </div>
            </div>
          </div>

          <!-- Mobile Auth Buttons -->
          <div class="mt-3 space-y-2">
            <template v-if="isAuthenticated">
              <router-link to="/profile" @click="showMobileMenu = false"
                :class="mobileProfileButtonClass">
                <i class="bi bi-person-circle text-base mr-2"></i>
                {{ user?.full_name || user?.email }}
              </router-link>
              <button @click="() => { handleLogout(); showMobileMenu = false; }"
                :class="mobileLogoutButtonClass">
                <i class="bi bi-box-arrow-right text-base mr-2"></i>
                {{ $t('message.auth.logout') }}
              </button>
            </template>
            <template v-else>
              <button @click="openLoginModal"
                :class="mobileLoginButtonClass">
                <i class="bi bi-box-arrow-in-right text-base mr-2"></i>
                {{ $t('message.auth.login') }}
              </button>
              <button @click="openRegisterModal"
                :class="mobileRegisterButtonClass">
                <i class="bi bi-person-plus text-base mr-2"></i>
                {{ $t('message.auth.register') }}
              </button>
            </template>
          </div>

          <!-- Mobile API Toggle -->
          <div class="mt-3">
            <button @click="store.setMockApi(!store.mockApi)"
              :class="getMobileApiToggleClass()">
              <span class="w-1.5 h-1.5 rounded-full mr-2 animate-pulse"
                :class="store.mockApi ? 'bg-green-500' : 'bg-yellow-500'"></span>
              {{ store.mockApi ? $t('message.navbar.mock_label') : $t('message.navbar.real_label') }}
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
import LoginModal from './LoginModal.vue';
import RegisterModal from './RegisterModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import { useNavbar } from '/vue/composables/useNavbar.js';

export default {
  components: {
    LoginModal,
    RegisterModal,
    ConfirmModal
  },
  setup() {
    return useNavbar();
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
