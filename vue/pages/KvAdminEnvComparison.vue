<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <!-- Background Decorators -->
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="amber"
      button-icon="bi bi-box-arrow-in-right text-lg"
      :title="$t('message.auth.login_required')"
      :message="$t('message.kv_admin_page.login_required_message')"
      :button-text="$t('message.auth.login') || 'Login'"
      @action="openLoginModal"
    />
    
    <template v-else-if="!isSuperAdmin">
      <section class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.kv_admin_page.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.kv_admin_page.access_denied_message') }}</p>
      </section>
    </template>

    <template v-else>
      <!-- Header Section -->
      <PageHeroSection
        section-class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-indigo-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]"
        top-blob-class="absolute -top-20 -right-16 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"
        content-class="relative flex flex-col md:flex-row gap-6 md:items-center justify-between"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/50 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-3">
              <i class="bi bi-arrow-left-right"></i>
               {{ $t('message.kv_admin_page.env_comparison.badge') || 'KV vs ENV' }}
            </div>
            <h1 class="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">{{ $t('message.kv_admin_page.env_comparison.title') || 'Environment Comparison' }}</h1>
            <p class="text-slate-600 dark:text-slate-400 max-w-2xl text-sm">
              {{ $t('message.kv_admin_page.env_comparison.subtitle') }}
            </p>
          </div>

        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <ActionTextButton tone="slate" icon="bi bi-arrow-clockwise" :loading="loading" @click="fetchComparison">
              {{ $t('message.kv_admin_page.reload') || 'Reload' }}
            </ActionTextButton>
          </div>
        </template>

        <!-- Summary Stats (Loaded State) -->
        <div v-if="!loading && summary.total" class="relative mt-8 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm flex flex-wrap gap-4 items-center">
             <button @click="sourceFilter = 'all'" :class="['flex flex-col px-4 border-r border-slate-200 dark:border-slate-700 hover:opacity-80 transition cursor-pointer', sourceFilter === 'all' ? 'bg-slate-100 dark:bg-slate-700 rounded-lg py-1' : 'py-1']">
               <span class="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{{ $t('message.kv_admin_page.stats_total') || 'Total' }}</span>
               <span class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ summary.total }}</span>
             </button>
             <button @click="sourceFilter = 'kv'" :class="['flex flex-col px-4 border-r border-slate-200 dark:border-slate-700 hover:opacity-80 transition cursor-pointer', sourceFilter === 'kv' ? 'bg-emerald-50 dark:bg-emerald-900/30 rounded-lg py-1' : 'py-1']">
               <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">{{ $t('message.kv_admin_page.env_comparison.stats_from_kv') || 'From KV' }}</span>
               <span class="text-xl font-bold text-emerald-700 dark:text-emerald-300">{{ summary.fromKV }}</span>
             </button>
             <button @click="sourceFilter = 'env'" :class="['flex flex-col px-4 border-r border-slate-200 dark:border-slate-700 hover:opacity-80 transition cursor-pointer', sourceFilter === 'env' ? 'bg-indigo-50 dark:bg-indigo-900/30 rounded-lg py-1' : 'py-1']">
               <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wider">{{ $t('message.kv_admin_page.env_comparison.stats_from_env') || 'From ENV' }}</span>
               <span class="text-xl font-bold text-indigo-700 dark:text-indigo-300">{{ summary.fromEnv }}</span>
             </button>
             <button @click="sourceFilter = 'default'" :class="['flex flex-col px-4 hover:opacity-80 transition cursor-pointer', sourceFilter === 'default' ? 'bg-slate-100 dark:bg-slate-700 rounded-lg py-1' : 'py-1']">
               <span class="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{{ $t('message.kv_admin_page.env_comparison.stats_from_default') || 'From Default' }}</span>
               <span class="text-xl font-bold text-slate-700 dark:text-slate-300">{{ summary.fromDefault }}</span>
             </button>
        </div>
      </PageHeroSection>

      <!-- Search Bar and Active Filters -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="relative w-full max-w-md">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i class="bi bi-search text-slate-400"></i>
          </div>
          <input 
            v-model="search" 
            type="text" 
            :placeholder="$t('message.kv_admin_page.search_placeholder') || 'Filter keys...'" 
            class="w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
          />
          <button v-if="search" @click="search = ''" class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>
        
        <!-- Active Filter Badge -->
        <div v-if="sourceFilter !== 'all' || search" class="flex flex-wrap gap-2 items-center text-sm">
          <span class="text-slate-500 dark:text-slate-400"><i class="bi bi-funnel"></i> {{ $t('message.kv_admin_page.env_comparison.active_filters') || 'Active filters:' }}</span>
          
          <div v-if="sourceFilter !== 'all'" class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
            <span class="text-xs font-semibold uppercase">{{ $t('message.kv_admin_page.env_comparison.source') || 'Source' }}: 
              <template v-if="sourceFilter === 'kv'">{{ $t('message.kv_admin_page.source_kv') || 'KV' }}</template>
              <template v-else-if="sourceFilter === 'env'">{{ $t('message.kv_admin_page.env_comparison.stats_from_env') || 'ENV' }}</template>
              <template v-else-if="sourceFilter === 'default'">{{ $t('message.kv_admin_page.env_comparison.default') || 'DEFAULT' }}</template>
              <template v-else>{{ sourceFilter }}</template>
            </span>
            <button @click="sourceFilter = 'all'" class="hover:text-rose-500 transition-colors ml-1"><i class="bi bi-x-lg"></i></button>
          </div>
          
          <div v-if="search" class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <span class="text-xs font-semibold truncate max-w-[150px]">Search: "{{ search }}"</span>
            <button @click="search = ''" class="hover:text-rose-500 transition-colors ml-1"><i class="bi bi-x-lg"></i></button>
          </div>
          
          <button v-if="(sourceFilter !== 'all' && search) || sourceFilter !== 'all' || search" @click="sourceFilter = 'all'; search = ''" class="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline px-2 cursor-pointer transition">
             {{ $t('message.kv_admin_page.env_comparison.clear_all_filters') || 'Clear all filters' }}
          </button>
        </div>
      </div>

      <!-- Main Data Table -->
      <div class="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-500 dark:text-slate-400">
           <i class="bi bi-arrow-repeat animate-spin text-4xl text-indigo-400 dark:text-indigo-600 mb-4 block"></i>
           <p>{{ $t('message.kv_admin_page.env_comparison.loading') || 'Loading comparison data...' }}</p>
        </div>
        
        <div v-else-if="error" class="p-12 text-center text-rose-500">
           <i class="bi bi-exclamation-triangle text-4xl mb-4 block"></i>
           <p>{{ error }}</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 p-4 lg:p-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div v-for="key in filteredKeys" :key="key" class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-between gap-4">
              <span class="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 truncate" :title="key">{{ key }}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0" :class="sourceBadgeClass(comparison[key].source)">
                <template v-if="comparison[key].source === 'kv'">{{ $t('message.kv_admin_page.source_kv') || 'KV' }}</template>
                <template v-else-if="comparison[key].source === 'env'">{{ $t('message.kv_admin_page.env_comparison.stats_from_env') || 'ENV' }}</template>
                <template v-else-if="comparison[key].source === 'default'">{{ $t('message.kv_admin_page.source_default') || 'DEFAULT' }}</template>
                <template v-else>{{ comparison[key].source }}</template>
              </span>
            </div>
            <div class="p-4 grid grid-cols-1 gap-4 flex-1">
              <div class="flex flex-col gap-1.5">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ $t('message.kv_admin_page.env_comparison.column_kv_value') || 'KV Value' }}</span>
                <div class="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80">
                  <p class="font-mono text-xs text-emerald-700 dark:text-emerald-300 break-all whitespace-pre-wrap">{{ formatValue(comparison[key].kv) }}</p>
                </div>
              </div>
              <div class="flex flex-col gap-1.5">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ $t('message.kv_admin_page.env_comparison.column_env_value') || 'ENV Value' }}</span>
                <div class="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80">
                  <p class="font-mono text-xs text-indigo-700 dark:text-indigo-300 break-all whitespace-pre-wrap">{{ formatValue(comparison[key].env) }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="filteredKeys.length === 0" class="col-span-full py-16 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <i class="bi bi-search block text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
            {{ $t('message.kv_admin_page.env_comparison.search_empty') || 'No configurations matched your search' }} <span class="font-semibold text-slate-700 dark:text-slate-300">"{{ search }}"</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useAuthGate } from '../composables/useAuthGate.js';
import { getKvEnvSourceBadgeClass } from '/vue/composables/useUiClassMap.js';

export default {
  name: 'KvAdminEnvComparison',
  components: { ActionTextButton, LoginRequiredPrompt, PageHeroSection },
  setup() {
    const { t } = useI18n();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const toastStore = useToastStore();
    const mainStore = useMainStore();

    const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');
    const loading = ref(false);
    const error = ref(null);
    const comparison = ref({});
    const summary = ref({});
    const search = ref('');
    const sourceFilter = ref('all');

    const checkAuthAndLoad = async () => {
      const ok = await ensureAuthenticated({ checkSessionFlag: true, openModal: false });
      if (ok && isSuperAdmin.value) {
        await fetchComparison();
      }
    };

    const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange, markUnauthenticated } = useAuthGate({
      authStore,
      modalStore,
      onAuthenticated: async () => {
        if (isSuperAdmin.value) {
          await fetchComparison();
        }
      }
    });

    const formatValue = (val) => {
      if (val === null || val === undefined) return t('message.kv_admin_page.env_comparison.value_none') || '- none -';
      if (typeof val === 'object') return JSON.stringify(val);
      if (val === '') return t('message.kv_admin_page.env_comparison.value_empty_string') || '"" (Empty string)';
      return String(val);
    };

    const filteredKeys = computed(() => {
      let keys = Object.keys(comparison.value);
      
      // Lọc theo source
      if (sourceFilter.value !== 'all') {
        keys = keys.filter(k => comparison.value[k].source === sourceFilter.value);
      }
      
      // Lọc theo ô tìm kiếm search
      if (search.value) {
        const term = search.value.toLowerCase();
        keys = keys.filter(k => {
          if (k.toLowerCase().includes(term)) return true;
          
          const item = comparison.value[k];
          const kvStr = typeof item.kv === 'object' && item.kv !== null ? JSON.stringify(item.kv) : String(item.kv ?? '');
          const envStr = typeof item.env === 'object' && item.env !== null ? JSON.stringify(item.env) : String(item.env ?? '');
          
          if (kvStr.toLowerCase().includes(term)) return true;
          if (envStr.toLowerCase().includes(term)) return true;
          
          return false;
        });
      }
      return keys.sort();
    });

    const fetchComparison = async () => {
      if (!isSuperAdmin.value) return;
      loading.value = true;
      error.value = null;
      try {
        const res = await apiClient.get('/api/kv-admin/configs/env-comparison', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });
        
        if (res.data.success) {
          comparison.value = res.data.data.comparison;
          summary.value = res.data.data.summary;
        } else {
          throw new Error(res.data.error || 'Failed to fetch comparison');
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403 || err?.code === 'REAUTH_REQUIRED') {
          authStore.logout();
          markUnauthenticated();
          error.value = 'Session expired';
          openLoginModal();
        } else {
          error.value = err.response?.data?.error || err.message || t('message.kv_admin_page.env_comparison.error_load_failed') || 'Error loading data';
          toastStore.add(t('message.kv_admin_page.env_comparison.error_load_failed') || 'Failed to load environment comparison', 'error');
        }
      } finally {
        loading.value = false;
      }
    };

    onMounted(checkAuthAndLoad);

    watch(() => authStore.isAuthenticated, async (val) => {
      await handleAuthStateChange(val);
    });

    watch(() => mainStore.mockApi, async (value, oldValue) => {
      if (value === oldValue) return;
      if (!authStore.isAuthenticated || !isSuperAdmin.value) return;
      await fetchComparison();
    });

    return {
      showLoginRequired, isSuperAdmin, loading, error, 
      comparison, summary, search, sourceFilter, filteredKeys,
      openLoginModal, formatValue, sourceBadgeClass: getKvEnvSourceBadgeClass, fetchComparison
    };
  }
};
</script>
