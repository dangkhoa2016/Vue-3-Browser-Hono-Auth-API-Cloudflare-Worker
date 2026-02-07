<template>
  <div class="max-w-6xl mx-auto space-y-8 py-6">
    <!-- Loading State -->
    <div v-if="loading" class="space-y-4 animate-pulse">
      <div class="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="h-36 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        <div class="h-36 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
      </div>
      <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
    </div>

    <!-- Login Required -->
    <div v-else-if="showLoginRequired" class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center">
      <i class="bi bi-lock-fill text-5xl text-blue-600 dark:text-blue-400 mb-4"></i>
      <h3 class="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">{{ $t('message.api_explorer.login_required_title') }}</h3>
      <p class="text-blue-700 dark:text-blue-300 mb-4">{{ $t('message.api_explorer.login_required_message') }}</p>
      <button
        @click="openLoginModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg transition"
      >
        <i class="bi bi-box-arrow-in-right text-lg"></i>
        {{ $t('message.auth.login') }}
      </button>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
      <i class="bi bi-exclamation-triangle-fill text-5xl text-red-600 dark:text-red-400 mb-4"></i>
      <h3 class="text-xl font-bold text-red-900 dark:text-red-100 mb-2">{{ $t('message.api_explorer.error_loading') }}</h3>
      <p class="text-red-700 dark:text-red-300 mb-4">{{ error }}</p>
      <button
        @click="loadApiInfo"
        class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-semibold rounded-lg shadow-lg transition"
      >
        <i class="bi bi-arrow-clockwise text-lg"></i>
        {{ $t('message.common.retry') }}
      </button>
    </div>

    <!-- Content -->
    <div v-else-if="apiInfo" class="space-y-6">
      <!-- Header -->
      <div class="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-2xl p-6 text-white shadow-xl">
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-14 -left-6 w-32 h-32 bg-purple-300/10 rounded-full blur-3xl"></div>
        <div class="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wide text-white/80">{{ $t('message.api_explorer.header_message') }}</p>
            <h1 class="text-2xl font-bold mt-1">{{ apiInfo.message || $t('message.api_explorer.title') }}</h1>
            <p class="text-white/80 mt-1">{{ $t('message.api_explorer.subtitle') }}</p>
          </div>
          <div class="flex gap-3 flex-wrap">
            <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-sm font-semibold">
              <i class="bi bi-person-badge"></i>
              {{ $t('message.api_explorer.role') }}: {{ apiInfo.user?.role }}
            </span>
            <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-sm font-semibold">
              <i class="bi bi-hdd-network"></i>
              {{ $t('message.api_explorer.environment') }}: {{ apiInfo.environment || 'unknown' }}
            </span>
            <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-sm font-semibold">
              <i class="bi bi-activity"></i>
              {{ $t('message.api_explorer.status') }}: {{ apiInfo.status || 'running' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-500 dark:text-gray-300">{{ $t('message.api_explorer.total_available') }}</span>
            <i class="bi bi-unlock text-blue-500"></i>
          </div>
          <div class="text-3xl font-black text-gray-900 dark:text-white">{{ apiInfo.route_summary?.total_available || 0 }}</div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-500 dark:text-gray-300">{{ $t('message.api_explorer.total_system') }}</span>
            <i class="bi bi-globe2 text-purple-500"></i>
          </div>
          <div class="text-3xl font-black text-gray-900 dark:text-white">{{ apiInfo.route_summary?.total_system || 0 }}</div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-500 dark:text-gray-300">{{ $t('message.api_explorer.categories') }}</span>
            <i class="bi bi-folder2-open text-emerald-500"></i>
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            <span v-for="cat in apiInfo.route_summary?.categories || []" :key="cat"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <i class="bi bi-check-circle"></i>{{ cat }}
            </span>
          </div>
        </div>
      </div>

      <!-- Endpoints -->
      <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i class="bi bi-diagram-3 text-purple-500"></i>
            {{ $t('message.api_explorer.endpoints') }}
          </h3>
          <span class="text-sm text-gray-600 dark:text-gray-300">{{ endpointCountLabel }}</span>
        </div>

        <div v-if="endpointCategories.length === 0" class="text-gray-500 dark:text-gray-300 text-sm">
          {{ $t('message.api_explorer.no_endpoints') }}
        </div>

        <div v-else class="space-y-4">
          <div v-for="cat in endpointCategories" :key="cat.name" class="border border-gray-100 dark:border-slate-800 rounded-xl">
            <div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/70 rounded-t-xl cursor-pointer select-none"
              @click="toggleCategory(cat.name)">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200 font-bold">
                  {{ cat.name[0]?.toUpperCase() || '?' }}
                </span>
                <div>
                  <div class="font-semibold text-gray-900 dark:text-white">{{ cat.name }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ cat.countLabel }}</div>
                </div>
              </div>
              <button @click.stop="toggleCategory(cat.name)" :aria-expanded="!collapsed[cat.name]"
                class="p-2 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                <i class="bi" :class="collapsed[cat.name] ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
              </button>
            </div>
            <transition name="collapse">
              <div class="divide-y divide-gray-100 dark:divide-slate-800" v-show="!collapsed[cat.name]">
                <div v-for="route in cat.routes" :key="route.key" class="px-4 py-3 flex flex-col gap-1.5">
                  <div class="flex items-center gap-3">
                    <span class="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                      {{ route.method || '—' }}
                    </span>
                    <div class="font-semibold text-gray-900 dark:text-white break-all">{{ route.path || route.key }}</div>
                  </div>
                  <div v-if="route.description && route.description !== (route.path || route.key)" class="text-sm text-gray-600 dark:text-gray-300">
                    {{ route.description }}
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onActivated, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';

export default {
  name: 'ApiExplorer',
  setup() {
    const apiInfo = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const showLoginRequired = ref(false);
    const collapsed = ref({});

    const mainStore = useMainStore();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const { t, locale } = useI18n({ useScope: 'global' });

    authStore.init();

    const openLoginModal = () => {
      modalStore.openLogin(
        async () => {
          sessionStorage.removeItem('authRequired');
          sessionStorage.removeItem('intendedRoute');
          showLoginRequired.value = false;
          await loadApiInfo();
        },
        () => {
          if (!authStore.isAuthenticated) {
            showLoginRequired.value = true;
          }
        }
      );
    };

    const checkAuthAndShowModal = () => {
      const authRequired = sessionStorage.getItem('authRequired');
      if (!authStore.isAuthenticated || authRequired === 'true') {
        showLoginRequired.value = true;
        openLoginModal();
        return false;
      }
      return true;
    };

    const loadApiInfo = async () => {
      try {
        loading.value = true;
        error.value = null;

        const isAuth = checkAuthAndShowModal();
        if (!isAuth) {
          loading.value = false;
          return;
        }

        const response = await apiClient.get(API_ENDPOINTS.API_INFO, {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        });

        apiInfo.value = response.data;
        showLoginRequired.value = false;
      } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.error || err.message || t('message.api_explorer.error_loading');
        error.value = message;

        if (status === 401) {
          authStore.logout();
          checkAuthAndShowModal();
        }
      } finally {
        loading.value = false;
      }
    };

    const endpointCategories = computed(() => {
      if (!apiInfo.value?.endpoints) return [];
      return Object.entries(apiInfo.value.endpoints).map(([name, routes]) => {
        const routeEntries = Object.entries(routes || {}).map(([key, description]) => ({
          key,
          description,
          method: key.split(' ')[0] || '',
          path: key.split(' ').slice(1).join(' ') || ''
        }));
        return {
          name,
          routes: routeEntries,
          countLabel: t('message.api_explorer.endpoint_count', { count: routeEntries.length })
        };
      });
    });

    const endpointCountLabel = computed(() => {
      const total = endpointCategories.value.reduce((sum, cat) => sum + cat.routes.length, 0);
      return t('message.api_explorer.endpoint_count', { count: total });
    });

    watch(endpointCategories, (cats) => {
      const next = {};
      cats.forEach((c) => {
        next[c.name] = collapsed.value[c.name] || false;
      });
      collapsed.value = next;
    }, { immediate: true });

    const toggleCategory = (name) => {
      collapsed.value = {
        ...collapsed.value,
        [name]: !collapsed.value[name]
      };
    };

    watch([() => mainStore.mockApi, locale], () => {
      if (!mainStore.mockApi) {
        loadApiInfo();
      }
    });

    onMounted(loadApiInfo);
    onActivated(() => {
      loadApiInfo();
    });

    return {
      apiInfo,
      loading,
      error,
      showLoginRequired,
      endpointCategories,
      endpointCountLabel,
      openLoginModal,
      loadApiInfo,
      collapsed,
      toggleCategory
    };
  }
};
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
