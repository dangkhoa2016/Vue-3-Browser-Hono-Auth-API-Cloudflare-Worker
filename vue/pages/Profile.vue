<template>
  <div class="max-w-5xl mx-auto space-y-8 py-4">
    <!-- Loading State - Skeleton -->
    <div v-if="loadingProfile" class="space-y-6 animate-pulse">
      <!-- Header Skeleton -->
      <div class="relative overflow-hidden bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-xl p-8">
        <div class="flex items-center space-x-6">
          <div class="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-600"></div>
          <div class="flex-1 space-y-3">
            <div class="h-8 bg-gray-200 dark:bg-gray-600 rounded-lg w-48"></div>
            <div class="h-6 bg-gray-200 dark:bg-gray-600 rounded-lg w-64"></div>
          </div>
        </div>
      </div>

      <!-- Content Grid Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Account Info Skeleton -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-slate-800">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
            <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-40"></div>
          </div>
          
          <div class="space-y-4">
            <div v-for="i in 5" :key="i" class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
              <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          </div>
        </div>

        <!-- Stats Skeleton -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-slate-800">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
            <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-28"></div>
          </div>
          
          <div class="space-y-4">
            <div v-for="i in 2" :key="i" class="bg-gray-100 dark:bg-slate-800/50 p-6 rounded-2xl">
              <div class="flex items-center justify-between mb-2">
                <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Login Required State -->
    <div v-else-if="showLoginRequired" class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center">
      <i class="bi bi-lock-fill text-5xl text-blue-600 dark:text-blue-400 mb-4"></i>
      <h3 class="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">{{ $t('message.auth.login_required') }}</h3>
      <p class="text-blue-700 dark:text-blue-300 mb-4">{{ $t('message.auth.login_required_message') }}</p>
      <button
        @click="openLoginModal"
        class="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
      >
        <i class="bi bi-box-arrow-in-right text-lg"></i>
        {{ $t('message.auth.login') }}
      </button>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
      <i class="bi bi-exclamation-triangle-fill text-5xl text-red-600 dark:text-red-400 mb-4"></i>
      <h3 class="text-xl font-bold text-red-900 dark:text-red-100 mb-2">{{ $t('message.errors.failed_to_load', { item: 'Profile' }) }}</h3>
      <p class="text-red-700 dark:text-red-300 mb-4">{{ error }}</p>
      <button
        @click="loadProfile"
        class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
      >
        <i class="bi bi-arrow-clockwise text-lg"></i>
        {{ $t('message.common.retry') }}
      </button>
    </div>

    <!-- Profile Content -->
    <template v-else-if="profile">
      <!-- Header Card with Gradient -->
      <div class="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 dark:from-blue-700 dark:via-blue-800 dark:to-purple-800 rounded-2xl shadow-xl p-8 transition-all duration-300">
        <!-- Decorative circles -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-300/10 rounded-full blur-2xl"></div>
        
        <div class="relative flex items-center space-x-6">
          <div class="relative group">
            <div class="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all"></div>
            <div class="relative h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white/30 group-hover:ring-white/50 transition-all group-hover:scale-105">
              <i :class="getRoleIcon(profile.role)"></i>
            </div>
          </div>
          <div class="text-white">
            <h1 class="text-3xl font-bold mb-2 drop-shadow-lg">{{ profile.full_name }}</h1>
            <p class="text-blue-100 text-lg font-medium">{{ profile.email }}</p>
          </div>
        </div>
      </div>
      
      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Account Info Card -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-xl p-8 transition-all duration-300 border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <i class="bi bi-person-circle text-blue-600 dark:text-blue-400 text-xl"></i>
              </div>
              {{ $t('message.profile.account_info') }}
            </h2>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all group">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i class="bi bi-person-fill text-blue-600 dark:text-blue-400"></i>
                </div>
                <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.profile.username') }}</span>
              </div>
              <span class="font-bold text-gray-900 dark:text-slate-100">{{ profile.full_name }}</span>
            </div>

            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all group">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i class="bi bi-envelope-fill text-cyan-600 dark:text-cyan-400"></i>
                </div>
                <span class="text-gray-600 dark:text-slate-400 font-medium">Email</span>
              </div>
              <span class="font-bold text-gray-900 dark:text-slate-100">{{ profile.email }}</span>
            </div>
            
            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all group">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i :class="getRoleIcon(profile.role)" class="text-purple-600 dark:text-purple-400"></i>
                </div>
                <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.profile.role') }}</span>
              </div>
              <span :class="`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r ${getRoleBadgeColor(profile.role)} text-white shadow-lg`">
                {{ profile.role.replace('_', ' ').toUpperCase() }}
              </span>
            </div>
            
            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all group">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i class="bi bi-check-circle-fill text-green-600 dark:text-green-400"></i>
                </div>
                <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.profile.status') }}</span>
              </div>
              <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30">
                <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                {{ profile.status.toUpperCase() }}
              </span>
            </div>

            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all group">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i class="bi bi-calendar-check text-orange-600 dark:text-orange-400"></i>
                </div>
                <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.profile.joined') }}</span>
              </div>
              <span class="font-bold text-gray-900 dark:text-slate-100">{{ formatDate(profile.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Stats Card -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-xl p-8 transition-all duration-300 border border-gray-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <i class="bi bi-bar-chart-fill text-purple-600 dark:text-purple-400 text-xl"></i>
              </div>
              {{ $t('message.profile.stats') }}
            </h2>
          </div>
          
          <div class="space-y-4">
            <div class="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-2xl hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700">
              <div class="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 dark:bg-blue-700/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
              <div class="relative">
                <div class="flex items-center justify-between mb-2">
                  <i class="bi bi-person-fill text-2xl text-blue-600 dark:text-blue-400"></i>
                  <div class="text-4xl font-black text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">{{ profile.id }}</div>
                </div>
                <div class="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">{{ $t('message.profile.user_id') }}</div>
              </div>
            </div>
            
            <div class="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-2xl hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-700">
              <div class="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 dark:bg-purple-700/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
              <div class="relative">
                <div class="flex items-center justify-between mb-2">
                  <i class="bi bi-shield-check text-2xl text-purple-600 dark:text-purple-400"></i>
                  <div class="text-2xl font-black text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform uppercase">{{ profile.role.split('_')[0] }}</div>
                </div>
                <div class="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">{{ $t('message.profile.access_level') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, onMounted, onActivated, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';

export default {
  name: 'Profile',
  setup() {
    const profile = ref(null);
    const loadingProfile = ref(true);
    const error = ref(null);
    const { locale } = useI18n({ useScope: 'global' });
    const showLoginRequired = ref(false);
    
    // Use Pinia stores
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    
    // Initialize auth store from localStorage
    authStore.init();

    const openLoginModal = () => {
      modalStore.openLogin(
        // On success callback
        async (loginData) => {
          sessionStorage.removeItem('authRequired');
          sessionStorage.removeItem('intendedRoute');
          showLoginRequired.value = false;
          await loadProfile();
        },
        // On close callback
        () => {
          if (!authStore.isAuthenticated) {
            showLoginRequired.value = true;
          }
        }
      );
    };
    
    // Check authentication and show modal if needed
    const checkAuthAndShowModal = () => {
      // Check if auth is required from router guard
      const authRequired = sessionStorage.getItem('authRequired');
      
      if (!authStore.isAuthenticated || authRequired === 'true') {
        showLoginRequired.value = true;
        openLoginModal();
        return false;
      }
      
      return true;
    };

    const loadProfile = async () => {
      try {
        loadingProfile.value = true;
        error.value = null;
        
        // Check authentication
        const isAuth = checkAuthAndShowModal();
        if (!isAuth) {
          loadingProfile.value = false;
          return;
        }

        // Fetch profile from API
        const response = await apiClient.get(API_ENDPOINTS.PROFILE, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        });
        
        if (response.data.success) {
          profile.value = response.data.data;
          showLoginRequired.value = false;
        } else {
          throw new Error(response.data.error || 'Failed to load profile');
        }
      } catch (err) {
        error.value = err.response?.data?.error || err.message || 'Failed to load profile';
        console.error('Failed to load profile:', err);
        
        // If unauthorized, show login
        if (err.response?.status === 401) {
          authStore.logout();
          checkAuthAndShowModal();
        }
      } finally {
        loadingProfile.value = false;
      }
    };

    // Watch for authentication changes
    watch(
      () => authStore.isAuthenticated,
      async (isAuthenticated) => {
        if (isAuthenticated === false && !showLoginRequired.value) {
          // User logged out, show modal
          checkAuthAndShowModal();
        } else if (isAuthenticated === true && showLoginRequired.value) {
          // User logged in, reload profile
          await loadProfile();
        }
      },
      { immediate: false }
    );

    // Initial load on mount
    onMounted(async () => {
      await loadProfile();
    });

    // Check auth when component is reactivated (from keep-alive)
    onActivated(async () => {
      // Recheck authentication when page becomes active
      if (!authStore.isAuthenticated) {
        checkAuthAndShowModal();
      } else {
        // Refresh profile data
        await loadProfile();
      }
    });

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString(locale.value, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const getRoleBadgeColor = (role) => {
      const colors = {
        'super_admin': 'from-purple-500 to-pink-500',
        'admin': 'from-blue-500 to-cyan-500',
        'user': 'from-green-500 to-emerald-500',
      };
      return colors[role] || 'from-gray-500 to-slate-500';
    };

    const getRoleIcon = (role) => {
      const icons = {
        'super_admin': 'bi-shield-fill-check',
        'admin': 'bi-shield-check',
        'user': 'bi-person-badge',
      };
      return icons[role] || 'bi-person';
    };

    return {
      profile,
      loadingProfile,
      error,
      showLoginRequired,
      formatDate,
      getRoleBadgeColor,
      getRoleIcon,
      openLoginModal,
      loadProfile
    };
  }
}
</script>
