<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <template v-if="showLoginRequired">
      <section class="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-lock-fill text-5xl text-amber-600 dark:text-amber-400 mb-4"></i>
        <h3 class="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">{{ $t('message.auth.login_required') }}</h3>
        <p class="text-amber-700 dark:text-amber-300 mb-4">{{ $t('message.kv_admin_page.login_required_message') }}</p>
        <ActionTextButton tone="amber" shape="xl" size="sm" icon="bi bi-box-arrow-in-right text-lg" class="shadow-lg hover:shadow-xl" @click="openLoginModal">
          {{ $t('message.auth.login') }}
        </ActionTextButton>
      </section>
    </template>
    <template v-else-if="!isSuperAdmin">
      <section class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.kv_admin_page.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.kv_admin_page.access_denied_message') }}</p>
      </section>
    </template>
    <template v-else>
      <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]">
        <div class="absolute -top-20 -right-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div class="relative flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-blue-900/10 text-blue-800 dark:bg-blue-400/10 dark:text-blue-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              {{ $t('message.navbar.kv_admin_audit') || 'KV ADMIN AUDIT' }}
            </div>
            <h1 class="mt-4 text-3xl font-black text-slate-900 dark:text-white">Audit System Configs</h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300">Manage retention, performance, alerts, and feature flags.</p>
          </div>
          <div>
            <ActionTextButton variant="soft" shape="full" icon="bi bi-arrow-clockwise" @click="loadData">
              {{ $t('message.kv_admin_page.reload') || 'Reload' }}
            </ActionTextButton>
          </div>
        </div>
      </section>

      <div v-if="error" class="p-8 text-center rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-3"></i>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Error</h3>
        <p class="text-slate-500 mt-2">{{ error }}</p>
      </div>

      <div v-else class="flex flex-col gap-6">
        <!-- Feature Flags -->
        <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-6">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-toggles2 text-indigo-500 mr-2"></i> Features</h2>
          
          <div v-if="loadingState.features" class="space-y-4 animate-pulse">
            <div v-for="i in 4" :key="i" class="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div class="space-y-2">
                <div class="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div class="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
              <div class="h-6 w-11 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
          
          <div v-else class="grid md:grid-cols-2 grid-cols-1 gap-4">
            <div v-for="(val, key) in auditData.features" :key="key" class="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p class="font-medium text-slate-800 dark:text-slate-200">{{ formatFeatureName(key) }}</p>
                <p class="text-xs text-slate-500">{{ key }}</p>
              </div>
              <button 
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="val ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'"
                @click="toggleFeature(key, !val)"
                :disabled="isToggling[key]"
              >
                <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" :class="val ? 'translate-x-6' : 'translate-x-1'"/>
              </button>
            </div>
          </div>
        </div>

        <!-- Retention Policies -->
        <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-clock-history text-amber-500 mr-2"></i> Retention Policies</h2>
          
          <div v-if="loadingState.retention" class="grid md:grid-cols-2 grid-cols-1 gap-4 animate-pulse">
            <div v-for="i in 4" :key="i" class="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
              <div class="h-3 w-20 bg-amber-200 dark:bg-amber-800/50 rounded mb-2"></div>
              <div class="h-5 w-16 bg-amber-200 dark:bg-amber-800/50 rounded"></div>
            </div>
          </div>
          
          <div v-else class="grid md:grid-cols-2 grid-cols-1 gap-4">
            <div v-for="(val, key) in auditData.retention" :key="key" class="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
              <span class="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1 shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">{{ formatFeatureName(key) }}</span>
              <span class="font-mono text-lg text-slate-800 dark:text-slate-200 font-bold whitespace-normal break-words">{{ formatValueUnit(key, val) }}</span>
            </div>
          </div>
        </div>

        <!-- Performance Settings -->
        <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-speedometer2 text-emerald-500 mr-2"></i> Performance</h2>
          
          <div v-if="loadingState.performance" class="grid md:grid-cols-2 grid-cols-1 gap-4 animate-pulse">
            <div v-for="i in 4" :key="i" class="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
              <div class="h-3 w-20 bg-emerald-200 dark:bg-emerald-800/50 rounded mb-2"></div>
              <div class="h-5 w-16 bg-emerald-200 dark:bg-emerald-800/50 rounded"></div>
            </div>
          </div>
          
          <div v-else class="grid md:grid-cols-2 grid-cols-1 gap-4">
            <div v-for="(val, key) in auditData.performance" :key="key" class="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
              <span class="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1 truncate">{{ formatFeatureName(key) }}</span>
              <span class="font-mono text-lg text-slate-800 dark:text-slate-200 font-bold whitespace-normal break-words">{{ formatValueUnit(key, val) }}</span>
            </div>
          </div>
        </div>

        <!-- Alert & Thresholds -->
        <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-bell text-rose-500 mr-2"></i> Alerts & Thresholds</h2>
          
          <div v-if="loadingState.alerts" class="grid grid-cols-2 gap-4 animate-pulse">
            <div v-for="i in 4" :key="i" class="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
              <div class="h-3 w-20 bg-rose-200 dark:bg-rose-800/50 rounded mb-2"></div>
              <div class="h-5 w-16 bg-rose-200 dark:bg-rose-800/50 rounded"></div>
            </div>
          </div>
          
          <div v-else class="grid grid-cols-2 gap-4">
            <div v-for="(val, key) in auditData.alerts" :key="key" class="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
              <span class="text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1 truncate">{{ formatFeatureName(key) }}</span>
              <span class="font-mono text-lg text-slate-800 dark:text-slate-200 font-bold whitespace-normal break-words">{{ formatValueUnit(key, val) }}</span>
            </div>
          </div>
        </div>

        <!-- Compliance Settings -->
        <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-shield-check text-purple-500 mr-2"></i> Compliance Settings</h2>
          
          <div v-if="loadingState.compliance" class="grid grid-cols-2 gap-4 animate-pulse">
            <div v-for="i in 6" :key="i" class="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
              <div class="h-3 w-20 bg-purple-200 dark:bg-purple-800/50 rounded mb-2"></div>
              <div class="h-5 w-16 bg-purple-200 dark:bg-purple-800/50 rounded"></div>
            </div>
          </div>
          
          <div v-else class="grid grid-cols-2 gap-4">
            <div v-for="(val, key) in auditData.compliance" :key="key" class="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
              <span class="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1 shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">{{ formatFeatureName(key) }}</span>
              <span class="font-mono text-lg text-slate-800 dark:text-slate-200 font-bold whitespace-normal break-words">
                <span v-if="typeof val === 'boolean'" :class="val ? 'text-emerald-500' : 'text-slate-400'">
                  <i :class="val ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i> {{ val ? 'Enabled' : 'Disabled' }}
                </span>
                <span v-else>{{ formatValueUnit(key, val) }}</span>
              </span>
            </div>
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

export default {
  name: 'KvAdminAuditConfigs',
  components: { ActionTextButton },
  setup() {
    const { t } = useI18n();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const toastStore = useToastStore();
    const mainStore = useMainStore();

    const showLoginRequired = ref(false);
    const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');
    const loadingState = ref({
      features: true,
      retention: true,
      performance: true,
      alerts: true,
      compliance: true
    });
    const error = ref(null);
    const isToggling = ref({});

    const auditData = ref({
      features: {},
      retention: {},
      performance: {},
      alerts: {},
      compliance: {}
    });

    const openLoginModal = () => {
      modalStore.openLogin(() => { loadData(); });
    };

    const loadData = async () => {
      if (!isSuperAdmin.value) return;
      loadingState.value = { features: true, retention: true, performance: true, alerts: true, compliance: true };
      error.value = null;
      try {
        // Fetch sequentially to avoid rate limits
        const featuresReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_FEATURES, { headers: { Authorization: `Bearer ${authStore.token}` } }).catch((err) => {
          if (err?.response?.status === 401 || err?.response?.status === 403 || err?.code === 'REAUTH_REQUIRED') throw err;
          return { data: { data: {} } };
        });
        auditData.value.features = featuresReq.data?.data || {};
        loadingState.value.features = false;

        const retentionReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_RETENTION, { headers: { Authorization: `Bearer ${authStore.token}` } }).catch((err) => {
          if (err?.response?.status === 401 || err?.response?.status === 403 || err?.code === 'REAUTH_REQUIRED') throw err;
          return { data: { data: {} } };
        });
        auditData.value.retention = retentionReq.data?.data || {};
        loadingState.value.retention = false;

        const perfReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_PERFORMANCE, { headers: { Authorization: `Bearer ${authStore.token}` } }).catch((err) => {
          if (err?.response?.status === 401 || err?.response?.status === 403 || err?.code === 'REAUTH_REQUIRED') throw err;
          return { data: { data: {} } };
        });
        auditData.value.performance = perfReq.data?.data || {};
        loadingState.value.performance = false;

        const alertsReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_ALERTS, { headers: { Authorization: `Bearer ${authStore.token}` } }).catch((err) => {
          if (err?.response?.status === 401 || err?.response?.status === 403 || err?.code === 'REAUTH_REQUIRED') throw err;
          return { data: { data: {} } };
        });
        auditData.value.alerts = alertsReq.data?.data || {};
        loadingState.value.alerts = false;

        const complianceReq = await apiClient.get(API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_COMPLIANCE, { headers: { Authorization: `Bearer ${authStore.token}` } }).catch((err) => {
          if (err?.response?.status === 401 || err?.response?.status === 403 || err?.code === 'REAUTH_REQUIRED') throw err;
          return { data: { data: {} } };
        });
        auditData.value.compliance = complianceReq.data?.data || {};
        loadingState.value.compliance = false;
      } catch (err) {
        if (err?.code === 'REAUTH_REQUIRED' || err?.response?.status === 401 || err?.response?.status === 403) {
          authStore.logout();
          openLoginModal();
        } else {
          error.value = err.message || 'Failed to load configs';
        }
      } finally {
        loadingState.value = { features: false, retention: false, performance: false, alerts: false, compliance: false };
      }
    };

    const toggleFeature = async (feature, enabled) => {
      isToggling.value[feature] = true;
      try {
        const url = API_ENDPOINTS.KV_ADMIN_AUDIT_CONFIGS_TOGGLE.replace(':feature', feature);
        const response = await apiClient.post(url, { enabled }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });
        auditData.value.features[feature] = enabled;
        
        const successMessage = response.data?.data?.message || `Feature ${feature} set to ${enabled}`;
        toastStore.add(successMessage, 'success');
      } catch (err) {
        toastStore.add(`Failed to toggle ${feature}`, 'error');
      } finally {
        isToggling.value[feature] = false;
      }
    };

    const formatFeatureName = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    const formatValueUnit = (key, val) => {
      if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('days')) return `${val} Days`;
      if (lowerKey.includes('ms')) return `${val} ms`;
      return typeof val === 'object' ? JSON.stringify(val) : val;
    };
    const formatValue = (val) => typeof val === 'object' ? JSON.stringify(val) : val;

    onMounted(() => {
      if (!authStore.isAuthenticated) {
        showLoginRequired.value = true;
      } else {
        loadData();
      }
    });

    watch(() => authStore.isAuthenticated, (val) => {
      showLoginRequired.value = !val;
      if (val && isSuperAdmin.value) loadData();
    });

    watch(() => mainStore.mockApi, (value, oldValue) => {
      if (value === oldValue) return;
      if (!authStore.isAuthenticated || !isSuperAdmin.value) return;
      loadData();
    });

    return {
      showLoginRequired, isSuperAdmin, loadingState, error, auditData, openLoginModal, loadData,
      toggleFeature, isToggling, formatFeatureName, formatValue, formatValueUnit
    };
  }
};
</script>
