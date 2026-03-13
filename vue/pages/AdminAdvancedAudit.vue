<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <LoginRequiredPrompt
      v-if="!isAuthenticated"
      tone="blue"
      :title="$t?.('message.auth.login_required') || 'Login Required'"
      :message="$t?.('message.auth.login_required_message') || 'Please login with administrator privileges to view advanced audit features.'"
      :button-text="$t?.('message.auth.login') || 'Login'"
      @action="openLoginModal"
    />

    <template v-else>
      <!-- Enhanced Hero Section -->
      <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.1)]">
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl"></div>
        <div class="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-indigo-900/10 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>{{ $t('message.advanced_audit.general.advanced_protection') }}</div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{{ $t('message.advanced_audit.title') }}</h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">{{ $t('message.advanced_audit.general.main_description') }}</p>
          </div>
        </div>
      </section>

      <!-- Main Content Container with Tabs -->
      <section class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        
        <!-- Tabs Nav -->
        <div class="border-b border-slate-200 dark:border-slate-700 mb-8">
          <nav class="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            <button 
              v-for="tab in tabs" 
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600',
                'whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all duration-200'
              ]"
            >
              <i :class="['bi', tab.icon, 'mr-2']"></i>
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <!-- Content Area -->
        <div class="animate-fade-in-up">
          
          <!-- Analytics Tab -->
          <div v-show="activeTab === 'analytics'">
            <AdvancedAuditAnalyticsTab 
              :data="analyticsData" 
              :loading="loading" 
              @refresh="refreshData" 
            />
          </div>

          <!-- Compliance Tab -->
          <div v-show="activeTab === 'compliance'">
            <AdvancedAuditComplianceTab 
              :data="complianceData" 
              :loading="loading" 
              @refresh="refreshData" 
              @requestPdf="handleRequestPdf"
            />
          </div>

          <!-- Archival Tab -->
          <div v-show="activeTab === 'archival'">
            <AdvancedAuditArchivalTab 
              :data="archivalData" 
              :loading="loading" 
              @refresh="refreshData" 
              @runArchival="handleRunArchival"
              @restoreArchive="handleRestoreArchive"
              @setPolicy="handleSetPolicy"
            />
          </div>

        </div>
      </section>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import AdvancedAuditAnalyticsTab from '/vue/components/AdvancedAuditAnalyticsTab.vue';
import AdvancedAuditComplianceTab from '/vue/components/AdvancedAuditComplianceTab.vue';
import AdvancedAuditArchivalTab from '/vue/components/AdvancedAuditArchivalTab.vue';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useAdvancedAuditStore } from '/assets/js/stores/advancedAuditStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import { useI18n } from 'vue-i18n';

export default {
  name: 'AdminAdvancedAudit',
  components: {
    ActionTextButton,
    LoginRequiredPrompt,
    AdvancedAuditAnalyticsTab,
    AdvancedAuditComplianceTab,
    AdvancedAuditArchivalTab
  },
  setup() {
    const { t } = useI18n();
    const authStore = useAuthStore();
    const auditStore = useAdvancedAuditStore();
    const mainStore = useMainStore();
    const modalStore = useModalStore();
    const toastStore = useToastStore();
    
    const isAuthenticated = computed(() => authStore.isAuthenticated);
    
    const openLoginModal = () => {
      modalStore.openLogin();
    };
    
    const tabs = [
      { id: 'analytics', name: t('message.advanced_audit.tabs.analytics') || 'Analytics', icon: 'bi-graph-up' },
      { id: 'compliance', name: t('message.advanced_audit.tabs.compliance') || 'Compliance', icon: 'bi-shield-check' },
      { id: 'archival', name: t('message.advanced_audit.tabs.archival') || 'Archival & Retention', icon: 'bi-archive' }
    ];
    
    const activeTab = ref('analytics');

    const analyticsData = computed(() => auditStore.analytics);
    const complianceData = computed(() => auditStore.compliance);
    const archivalData = computed(() => auditStore.archival);
    
    const localLoading = ref(false);
    const loading = computed(() => auditStore.loading || localLoading.value);
    
    const loadTabData = async (tab) => {
      if (tab === 'analytics' && !analyticsData.value) {
        await auditStore.fetchAnalytics();
      } else if (tab === 'compliance' && !complianceData.value) {
        await auditStore.fetchCompliance('7d');
      } else if (tab === 'archival' && !archivalData.value) {
        await auditStore.fetchArchival();
      }
    };
    
    // Initial fetch
    onMounted(() => {
      if (isAuthenticated.value) {
        loadTabData(activeTab.value);
      } else {
        openLoginModal();
      }
    });

    // Auto-reload data when authentication state changes to true
    watch(isAuthenticated, (newValue, oldValue) => {
      if (newValue && !oldValue) {
        loadTabData(activeTab.value);
      }
    });
    
    watch(activeTab, (newTab) => {
      loadTabData(newTab);
    });

    watch(() => mainStore.mockApi, async (value, oldValue) => {
      if (value === oldValue) return;
      if (!authStore.isAuthenticated) return;
      // Reset stores when mock API setting changes to forcefully reload
      auditStore.analytics = null;
      auditStore.compliance = null;
      auditStore.archival = null;
      loadTabData(activeTab.value);
    });

    watch(isAuthenticated, (newValue) => {
       if (!newValue) {
         // Clear cached data on logout so they reload automatically on next login
         auditStore.analytics = null;
         auditStore.compliance = null;
         auditStore.archival = null;
       }
    });

    const refreshData = async () => {
      localLoading.value = true;
      try {
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 600));
        let fetchPromise;
        
        if (activeTab.value === 'analytics') fetchPromise = auditStore.fetchAnalytics();
        else if (activeTab.value === 'compliance') fetchPromise = auditStore.fetchCompliance('7d');
        else if (activeTab.value === 'archival') fetchPromise = auditStore.fetchArchival();
        
        await Promise.all([fetchPromise, minLoadingTime]);
      } finally {
        localLoading.value = false;
      }
    };

    const handleRunArchival = async (params = {}) => {
      try {
        const res = await auditStore.runArchival(params);
        toastStore.success(res?.message || 'Archival process completed successfully!');
        await refreshData();
      } catch (error) {
        console.error('Run archival failed:', error);
        let errStr = error.response?.data?.error || error.message || 'Archival process failed';
        if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
          errStr += ': ' + error.response.data.errors.map(e => e.message).join(', ');
        }
        toastStore.error(errStr);
      }
    };

    const handleRequestPdf = async () => {
      try {
        await auditStore.exportAdvanced({ format: 'pdf', type: 'compliance' });
        alert('Compliance PDF export initiated successfully!');
      } catch (error) {
        console.error('Export failed:', error);
        alert('PDF Export failed: ' + (error.response?.data?.error || error.message));
      }
    };

    const handleSetPolicy = async (params = {}) => {
      try {
        const res = await auditStore.manageRetention({ action: 'set_policy', policy: params });
        toastStore.success(res?.message || 'Retention policy configured successfully!');
        await refreshData();
      } catch (error) {
        console.error('Set policy failed:', error);
        let errStr = error.response?.data?.error || error.message || 'Set policy failed';
        if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
          errStr += ': ' + error.response.data.errors.map(e => e.message).join(', ');
        }
        toastStore.error(errStr);
      }
    };

    const handleRestoreArchive = async (params = {}) => {
      try {
        const res = await auditStore.restoreArchive(params);
        toastStore.success(res?.message || 'Archive restoration process initiated successfully!');
        await refreshData();
      } catch (error) {
        console.error('Restore archive failed:', error);
        let errStr = error.response?.data?.error || error.message || 'Restore process failed';
        if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
          errStr += ': ' + error.response.data.errors.map(e => e.message).join(', ');
        }
        toastStore.error(errStr);
      }
    };

    return {
      isAuthenticated,
      openLoginModal,
      activeTab,
      tabs,
      refreshData,
      handleRunArchival,
      handleRequestPdf,
      handleSetPolicy,
      handleRestoreArchive,
      loading,
      analyticsData,
      complianceData,
      archivalData
    };
  }
}
</script>

<style scoped>
.animate-fade-in-up {
  animation: fade-in-up 0.3s ease-out forwards;
}

@keyframes fade-in-up {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
