<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="blue"
      :title="$t('message.auth.login_required')"
      :message="$t('message.auth.login_required_message')"
      :button-text="$t('message.auth.login')"
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

      <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ tf('message.advanced_audit.access_denied_title', 'Access denied') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ tf('message.advanced_audit.access_denied_message', 'Only admin and super admin can access this page.') }}</p>
      </section>

      <!-- Main Content Container with Tabs -->
      <section v-else class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        
        <!-- Tabs Nav -->
        <div class="border-b border-slate-200 dark:border-slate-700 mb-8">
          <nav class="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
            <div
              v-for="tab in tabs"
              :key="tab.key"
              class="flex items-center gap-2"
            >
              <button
                type="button"
                @click="selectTab(tab.key)"
                :class="[
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600',
                  'whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all duration-200'
                ]"
              >
                <i :class="['bi', tab.icon, 'mr-2']"></i>
                {{ tab.name }}
              </button>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                :title="`${tf('message.settings.copy_link', 'Copy link')}: ${tab.name}`"
                :aria-label="`${tf('message.settings.copy_link', 'Copy link')}: ${tab.name}`"
                @click="copyCurrentTabLink(tab.key)"
              >
                <i :class="copiedTabKey === tab.key ? 'bi bi-clipboard-check' : 'bi bi-link-45deg'"></i>
              </button>
            </div>
          </nav>
        </div>

        <!-- Content Area -->
        <div class="animate-fade-in-up">
          
          <!-- Analytics Tab -->
          <div v-show="activeTab === 'analytics'">
            <AdvancedAuditAnalyticsTab 
              :data="analyticsData" 
              :is-loading="isLoading" 
              @refresh="refreshData" 
            />
          </div>

          <!-- Compliance Tab -->
          <div v-show="activeTab === 'compliance'">
            <AdvancedAuditComplianceTab 
              :data="complianceData" 
              :is-loading="isLoading" 
              @refresh="refreshData" 
              @request-pdf="handleRequestPdf"
            />
          </div>

          <!-- Archival Tab -->
          <div v-show="activeTab === 'archival'">
            <AdvancedAuditArchivalTab 
              :data="archivalData" 
              :is-loading="isLoading" 
              @refresh="refreshData" 
              @run-archival="handleRunArchival"
              @restore-archive="handleRestoreArchive"
              @set-policy="handleSetPolicy"
            />
          </div>

        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import AdvancedAuditAnalyticsTab from '/vue/components/AdvancedAuditAnalyticsTab.vue';
import AdvancedAuditComplianceTab from '/vue/components/AdvancedAuditComplianceTab.vue';
import AdvancedAuditArchivalTab from '/vue/components/AdvancedAuditArchivalTab.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import { useAdminAdvancedAuditPage } from '/vue/composables/useAdminAdvancedAuditPage.js';

const {
  activeTab,
  analyticsData,
  archivalData,
  complianceData,
  copiedTabKey,
  copyCurrentTabLink,
  handleRequestPdf,
  handleRestoreArchive,
  handleRunArchival,
  handleSetPolicy,
  isAdmin,
  isLoading,
  openLoginModal,
  refreshData,
  selectTab,
  showLoginRequired,
  tabs,
  tf
} = useAdminAdvancedAuditPage();
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
