<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="blue"
      button-tone="indigo"
      :title="$t('message.auth.login_required')"
      :message="$t('message.admin_dashboard_page.login_required_message')"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-20 -right-16 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-indigo-900/10 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
              {{ $t('message.admin_dashboard_page.badge') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.navbar.admin_dashboard') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.admin_dashboard_page.subtitle') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <ActionTextButton
                variant="soft"
                icon="bi bi-arrow-clockwise"
                shape="full"
                :disabled="isLoading"
                @click="refresh"
              >
                {{ $t('message.refresh') }}
              </ActionTextButton>
              <span v-if="showProgressPanel && currentStepLabel" class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">
                <i class="bi bi-arrow-repeat animate-spin"></i>
                {{ currentStepIndex }}/{{ totalSteps }} · {{ currentStepLabel }}
              </span>
              <div v-if="showProgressPanel && !lastUpdatedLabel" class="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
              <span v-else class="text-xs uppercase tracking-[0.2em] text-slate-400">
                {{ $t('message.admin_dashboard_page.last_updated') }}: {{ formatDate(lastUpdatedLabel) }}
              </span>
            </div>
            <div v-if="showProgressPanel" class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in progressItems"
                :key="item.key"
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] border"
                :class="item.classes"
              >
                <i :class="item.icon"></i>
                {{ item.label }}
              </span>
            </div>
          </div>
        </template>

        <template #right>
          <div class="grid grid-cols-2 gap-4">
            <StatCard
              :label="$t('message.system_stats_page.total_users')"
              :value="displayTotalUsers"
              :loading="!hasLoaded.stats"
              icon-class="bi bi-people text-2xl text-indigo-500"
            />
            <StatCard
              :label="$t('message.admin_dashboard_page.health_status')"
              :value="healthStatusText"
              :loading="!hasLoaded.health"
              loading-class="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
            >
              <template #value>
                <div v-if="!hasLoaded.health" class="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <span v-else class="text-xl font-black" :class="healthStatusClass">{{ healthStatusText }}</span>
              </template>
              <template #icon>
                <i class="bi bi-heart-pulse text-2xl" :class="healthStatusClass"></i>
              </template>
            </StatCard>
            <StatCard
              :label="$t('message.admin_dashboard_page.active_incidents')"
              :value="displayActiveIncidents"
              :loading="!hasLoaded.incidents"
              loading-class="h-7 w-14 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
              value-class="text-xl font-black text-rose-600 dark:text-rose-400"
              icon-class="bi bi-shield-exclamation text-2xl text-rose-500"
            />
            <StatCard
              :label="$t('message.admin_dashboard_page.monitoring')"
              :loading="!hasLoaded.realtime"
              loading-class="h-6 w-24 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
            >
              <template #value>
                <div v-if="!hasLoaded.realtime" class="h-6 w-24 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <span v-else class="text-sm font-bold" :class="isMonitoringActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                  {{ isMonitoringActive ? $t('message.admin_dashboard_page.monitoring_active') : $t('message.admin_dashboard_page.monitoring_inactive') }}
                </span>
              </template>
              <template #icon>
                <i class="bi bi-activity text-2xl" :class="isMonitoringActive ? 'text-emerald-500' : 'text-amber-500'"></i>
              </template>
            </StatCard>
          </div>
        </template>
      </PageHeroSection>

      <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.admin_dashboard_page.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.admin_dashboard_page.access_denied_message') }}</p>
      </section>

      <section v-else class="space-y-6">
        <div v-if="errorMessage" class="rounded-[28px] border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-6 text-rose-700 dark:text-rose-300">
          <div class="flex items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>{{ errorMessage }}</span>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.admin_dashboard_page.service_status_title') }}</h2>
              <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.admin_dashboard_page.response_time') }}</span>
                  <div v-if="!hasLoaded.health" class="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <span v-else class="font-bold text-slate-900 dark:text-slate-100">{{ responseTime }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.admin_dashboard_page.total_audit_logs') }}</span>
                  <div v-if="!hasLoaded.audit" class="h-5 w-14 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <span v-else class="font-bold text-slate-900 dark:text-slate-100">{{ displayTotalAuditLogs }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.admin_dashboard_page.active_threats') }}</span>
                  <div v-if="!hasLoaded.realtime" class="h-5 w-14 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <span v-else class="font-bold text-rose-600 dark:text-rose-400">{{ displayActiveThreats }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.admin_dashboard_page.active_alerts') }}</span>
                  <div v-if="!hasLoaded.realtime" class="h-5 w-14 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <span v-else class="font-bold text-amber-600 dark:text-amber-400">{{ displayActiveAlerts }}</span>
                </div>
              </div>
            </section>

            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_stats_page.users_by_role_title') }}</h2>
              <div class="grid grid-cols-3 gap-3">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.role_super_admin') }}</p>
                  <div v-if="!hasLoaded.stats" class="h-7 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1"></div>
                  <p v-else class="text-xl font-black text-violet-600 dark:text-violet-400">{{ roleCounts.super_admin }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.role_admin') }}</p>
                  <div v-if="!hasLoaded.stats" class="h-7 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1"></div>
                  <p v-else class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ roleCounts.admin }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.role_user') }}</p>
                  <div v-if="!hasLoaded.stats" class="h-7 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1"></div>
                  <p v-else class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ roleCounts.user }}</p>
                </div>
              </div>
            </section>
          </div>

          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.admin_dashboard_page.quick_actions') }}</h2>
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <router-link
                v-for="item in quickActions"
                :key="item.path"
                :to="item.path"
                :class="quickActionCardClass"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">{{ item.name }}</p>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ item.meta }}</p>
                  </div>
                  <i :class="item.icon" class="text-xl text-slate-400 group-hover:text-indigo-500 transition"></i>
                </div>
                <div class="mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  {{ $t('message.admin_dashboard_page.open_page') }}
                  <i class="bi bi-arrow-right ml-1"></i>
                </div>
              </router-link>
            </div>
          </section>

      </section>
    </template>
  </div>
</template>

<script setup>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import StatCard from '/vue/components/StatCard.vue';
import { useAdminDashboardPage } from '/vue/composables/useAdminDashboardPage.js';

const {
  currentStepIndex,
  currentStepLabel,
  displayActiveAlerts,
  displayActiveIncidents,
  displayActiveThreats,
  displayTotalAuditLogs,
  displayTotalUsers,
  errorMessage,
  formatDate,
  hasLoaded,
  healthStatusClass,
  healthStatusText,
  heroSectionClass,
  isAdmin,
  isLoading,
  isMonitoringActive,
  lastUpdatedLabel,
  openLoginModal,
  progressItems,
  quickActionCardClass,
  quickActions,
  refresh,
  responseTime,
  roleCounts,
  showLoginRequired,
  showProgressPanel,
  totalSteps
} = useAdminDashboardPage();
</script>
