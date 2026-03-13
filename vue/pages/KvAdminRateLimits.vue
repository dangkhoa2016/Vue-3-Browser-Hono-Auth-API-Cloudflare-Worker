<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
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
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.kv_admin_page.access_denied_title') || 'Access Denied' }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.kv_admin_page.access_denied_message') || 'You do not have permission to view this page.' }}</p>
      </section>
    </template>

    <template v-else>
      <PageHeroSection
        section-class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-red-50/40 to-orange-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]"
        top-blob-class="absolute -top-20 -right-16 w-72 h-72 bg-red-400/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"
        content-class="relative flex flex-col md:flex-row gap-6 md:items-center justify-between"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-red-900/10 text-red-800 dark:bg-red-400/10 dark:text-red-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {{ $t('message.navbar.kv_admin_rate_limits') || 'Rate Limits Admin' }}
            </div>
            <h1 class="mt-4 text-3xl font-black text-slate-900 dark:text-white">Rate Limits Management</h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300">Clean, prune, and configure rate limit keys across the system.</p>
          </div>
        </template>
      </PageHeroSection>

      <div class="grid lg:grid-cols-2 gap-6">
        <!-- Clean Prefix -->
        <div class="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-trash mr-2 text-rose-500"></i> Clean by Prefix</h2>
          <div class="space-y-4">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wider text-slate-500">Prefix</label>
              <input v-model="cleanForm.prefix" type="text" class="w-full mt-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" placeholder="rate_limit:" />
            </div>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="cleanForm.dryRun" class="rounded accent-rose-500">
              <span class="text-sm font-medium">Dry Run (Do not delete)</span>
            </label>
            <ActionTextButton tone="rose" :disabled="loading" :loading="loading" @click="runClean">Run Clean</ActionTextButton>
          </div>
        </div>

        <!-- Prune Time -->
        <div class="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-clock mr-2 text-amber-500"></i> Prune by Time</h2>
          <div class="space-y-4">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wider text-slate-500">Prefix</label>
              <input v-model="pruneForm.prefix" type="text" class="w-full mt-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" placeholder="rate_limit:" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Time</label>
                <input v-model="pruneForm.start" type="datetime-local" class="w-full mt-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-500">End Time</label>
                <input v-model="pruneForm.end" type="datetime-local" class="w-full mt-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" />
              </div>
            </div>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="pruneForm.dryRun" class="rounded accent-amber-500">
              <span class="text-sm font-medium">Dry Run</span>
            </label>
            <ActionTextButton tone="amber" :disabled="loading" :loading="loading" @click="runPrune">Run Prune</ActionTextButton>
          </div>
        </div>
        
        <!-- Result Output -->
        <div v-if="result" class="lg:col-span-2 bg-slate-900 text-slate-100 rounded-[28px] p-6 shadow-xl overflow-hidden">
          <div class="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
             <h2 class="text-xl font-bold font-mono text-emerald-400">Execution Result</h2>
             <ActionTextButton variant="soft" size="sm" @click="result = null">Clear</ActionTextButton>
          </div>
          <pre class="overflow-x-auto text-sm max-h-[400px]">{{ JSON.stringify(result, null, 2) }}</pre>
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
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';

export default {
  name: 'KvAdminRateLimits',
  components: { ActionTextButton, LoginRequiredPrompt, PageHeroSection },
  setup() {
    const { t } = useI18n();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const toastStore = useToastStore();

    const showLoginRequired = ref(false);
    const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');
    const loading = ref(false);
    const result = ref(null);

    const cleanForm = ref({ prefix: 'rate_limit:', dryRun: true });
    const pruneForm = ref({ prefix: 'rate_limit:', start: '', end: '', dryRun: true });

    const openLoginModal = () => {
      modalStore.openLogin();
    };

    const runClean = async () => {
      loading.value = true;
      result.value = null;
      try {
        const res = await apiClient.post(API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_CLEAN, cleanForm.value, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });
        result.value = res.data;
        toastStore.add('Clean operation completed', 'success');
      } catch (err) {
        toastStore.add('Clean operation failed', 'error');
        result.value = err.response?.data || err.message;
      } finally {
        loading.value = false;
      }
    };

    const runPrune = async () => {
      loading.value = true;
      result.value = null;
      try {
        const payload = {
          ...pruneForm.value,
          start: new Date(pruneForm.value.start).getTime(),
          end: new Date(pruneForm.value.end).getTime()
        };
        const res = await apiClient.post(API_ENDPOINTS.KV_ADMIN_RATE_LIMITS_PRUNE_TIME, payload, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });
        result.value = res.data;
        toastStore.add('Prune operation completed', 'success');
      } catch (err) {
        toastStore.add('Prune operation failed', 'error');
        result.value = err.response?.data || err.message;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      if (!authStore.isAuthenticated) showLoginRequired.value = true;
      
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      pruneForm.value.start = past.toISOString().slice(0, 16);
      pruneForm.value.end = now.toISOString().slice(0, 16);
    });

    watch(() => authStore.isAuthenticated, (val) => {
      showLoginRequired.value = !val;
    });

    return {
      showLoginRequired, isSuperAdmin, loading, result,
      cleanForm, pruneForm, openLoginModal, runClean, runPrune
    };
  }
};
</script>
