<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="blue"
      button-tone="indigo"
      button-icon="bi bi-box-arrow-in-right text-lg"
      :title="$t('message.auth.login_required')"
      :message="$t('message.system_stats_page.login_required_message')"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-20 -right-16 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-indigo-900/10 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
              {{ $t('message.system_stats_page.badge') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.navbar.system_stats') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.system_stats_page.subtitle') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <ActionTextButton
                variant="soft"
                shape="full"
                :icon="isLoading ? 'bi bi-arrow-clockwise animate-spin' : 'bi bi-arrow-clockwise'"
                :disabled="isLoading"
                @click="refresh"
              >
                {{ $t('message.refresh') }}
              </ActionTextButton>
              <span class="text-xs uppercase tracking-[0.2em] text-slate-400">
                {{ $t('message.system_stats_page.last_updated') }}: {{ formatDate(lastUpdatedLabel) }}
              </span>
            </div>
          </div>
        </template>

        <template #right>
          <div class="grid grid-cols-2 gap-4">
            <StatCard
              :label="$t('message.system_stats_page.total_users')"
              :value="stats.totalUsers"
              icon-class="bi bi-people text-2xl text-indigo-500"
              card-class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm relative overflow-hidden"
            >
              <div v-if="isLoading" class="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex flex-col justify-center px-5">
                <div class="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mb-4"></div>
                <div class="flex justify-between items-center">
                  <div class="h-6 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <div class="h-8 w-8 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                </div>
              </div>
            </StatCard>

            <StatCard
              :label="$t('message.system_stats_page.active_users')"
              :value="stats.activeUsers"
              value-class="text-xl font-black text-emerald-600 dark:text-emerald-400"
              icon-class="bi bi-person-check text-2xl text-emerald-500"
              card-class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm relative overflow-hidden"
            >
              <div v-if="isLoading" class="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex flex-col justify-center px-5">
                <div class="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mb-4"></div>
                <div class="flex justify-between items-center">
                  <div class="h-6 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <div class="h-8 w-8 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                </div>
              </div>
            </StatCard>

            <StatCard
              :label="`${$t('message.system_stats_page.audit_total_events')} (7d)`"
              :value="auditBasicStats.total_events"
              icon-class="bi bi-journal-text text-2xl text-slate-500 group-hover:text-amber-500 transition-colors"
              card-class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm relative overflow-hidden group"
            >
              <div v-if="auditStatsLoading" class="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <i class="bi bi-arrow-repeat animate-spin text-2xl text-slate-400"></i>
              </div>
            </StatCard>

            <StatCard
              :label="`${$t('message.system_stats_page.audit_security_events')} (7d)`"
              :value="auditBasicStats.security_events"
              value-class="text-xl font-black text-rose-600 dark:text-rose-400"
              icon-class="bi bi-shield-exclamation text-2xl text-rose-500 group-hover:scale-110 transition-transform"
              card-class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm relative overflow-hidden group"
            >
              <div v-if="auditStatsLoading" class="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <i class="bi bi-arrow-repeat animate-spin text-2xl text-slate-400"></i>
              </div>
            </StatCard>
          </div>
        </template>
      </PageHeroSection>

      <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.system_stats_page.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.system_stats_page.access_denied_message') }}</p>
      </section>

      <section v-else class="space-y-6">
        <AsyncStateSection
          :loading="isLoading"
          :error="errorMessage"
          :is-empty="!hasData"
          :empty-title="$t('message.system_stats_page.empty_title')"
          :empty-message="$t('message.system_stats_page.empty_message')"
        >
          <template #loading>
            <div class="grid gap-6 lg:grid-cols-2">
              <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-xl animate-pulse">
                 <div class="h-7 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-6"></div>
                 <div class="space-y-4">
                    <div v-for="i in 3" :key="i">
                      <div class="flex justify-between mb-2">
                        <div class="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700"></div>
                        <div class="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700"></div>
                      </div>
                      <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800"></div>
                    </div>
                 </div>
              </div>
              <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-xl animate-pulse">
                 <div class="h-7 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-6"></div>
                 <div class="space-y-3">
                   <div v-for="i in 3" :key="i" class="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
                 </div>
              </div>
              <div class="lg:col-span-2 rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-xl animate-pulse">
                 <div class="h-7 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-6"></div>
                 <div class="grid gap-4 md:grid-cols-3">
                   <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
                 </div>
              </div>
            </div>
          </template>

          <div class="grid gap-6 lg:grid-cols-2">
            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_stats_page.distribution_title') }}</h2>

              <div class="space-y-4 text-sm">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-slate-500">{{ $t('message.system_stats_page.active_users') }}</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ activeRate }}</span>
                  </div>
                  <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div class="h-2 rounded-full bg-emerald-500" :style="{ width: activeRate }"></div>
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-slate-500">{{ $t('message.system_stats_page.inactive_users') }}</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ inactiveRate }}</span>
                  </div>
                  <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div class="h-2 rounded-full bg-amber-500" :style="{ width: inactiveRate }"></div>
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-slate-500">{{ $t('message.system_stats_page.suspended_users') }}</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ suspendedRate }}</span>
                  </div>
                  <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div class="h-2 rounded-full bg-rose-500" :style="{ width: suspendedRate }"></div>
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_stats_page.activity_title') }}</h2>

              <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.recent_registrations') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ stats.recentRegistrations }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.active_users') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ stats.activeUsers }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.total_users') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ stats.totalUsers }}</span>
                </div>
              </div>
            </section>
          </div>

          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_stats_page.users_by_role_title') }}</h2>

            <div class="grid gap-4 md:grid-cols-3">
              <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_stats_page.role_super_admin') }}</p>
                <p class="text-2xl font-black text-violet-600 dark:text-violet-400">{{ roleCounts.super_admin }}</p>
              </div>

              <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_stats_page.role_admin') }}</p>
                <p class="text-2xl font-black text-cyan-600 dark:text-cyan-400">{{ roleCounts.admin }}</p>
              </div>

              <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_stats_page.role_user') }}</p>
                <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ roleCounts.user }}</p>
              </div>
            </div>
          </section>

          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] space-y-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.system_stats_page.audit_stats_title') }}</h2>
              <div class="flex flex-wrap items-center gap-2">
                <label class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" for="audit-days-input">
                  {{ $t('message.system_stats_page.audit_days_label') }}
                </label>
                <input
                  id="audit-days-input"
                  v-model.number="auditDays"
                  type="number"
                  min="1"
                  max="365"
                  class="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                  @change="handleAuditDaysChange"
                >

                <span
                  v-if="hasAuditStats"
                  :class="auditScopeBadgeClass"
                >
                  {{ $t('message.system_stats_page.audit_scope_label') }}: {{ auditScopeText }}
                  <i
                    class="bi bi-info-circle ml-1.5 text-[12px] normal-case tracking-normal cursor-help"
                    :title="$t(auditScopeHintKey)"
                  ></i>
                </span>
              </div>
            </div>

            <div v-if="auditStatsLoading" class="space-y-6 animate-pulse mt-4">
              <!-- Basic Stats Cards Skeleton -->
              <div class="grid gap-3 md:grid-cols-3">
                 <div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
              </div>
              
              <!-- Recent Activity Skeleton -->
              <div class="grid gap-3 md:grid-cols-4">
                 <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
              </div>

              <!-- Top Actions List Skeleton -->
              <div class="space-y-2">
                 <div class="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-3"></div>
                 <div v-for="i in 3" :key="i" class="h-10 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
              </div>
            </div>

            <div v-else-if="auditStatsError" class="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-700 dark:text-rose-300">
              {{ auditStatsError }}
            </div>

            <div v-else-if="!hasAuditStats" class="text-sm text-slate-500 dark:text-slate-400">
              {{ $t('message.system_stats_page.audit_no_data') }}
            </div>

            <template v-else>
              <div class="grid gap-3 md:grid-cols-3">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.audit_total_events') }}</p>
                  <p class="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">{{ auditBasicStats.total_events }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.audit_successful_events') }}</p>
                  <p class="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">{{ auditBasicStats.successful_events }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_stats_page.audit_failed_events') }}</p>
                  <p class="mt-1 text-xl font-black text-rose-600 dark:text-rose-400">{{ auditBasicStats.failed_events }}</p>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-2 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.audit_error_events') }}</span>
                  <span class="font-bold text-amber-600 dark:text-amber-400">{{ auditBasicStats.error_events }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.audit_security_events') }}</span>
                  <span class="font-bold text-violet-600 dark:text-violet-400">{{ auditBasicStats.security_events }}</span>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-4 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.audit_events_24h') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ auditRecentActivity.events_24h }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.audit_login_events_24h') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ auditRecentActivity.login_events_24h }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.audit_admin_events_24h') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ auditRecentActivity.admin_events_24h }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_stats_page.audit_kv_events_24h') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ auditRecentActivity.kv_events_24h }}</span>
                </div>
              </div>

              <div>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{{ $t('message.system_stats_page.audit_top_actions') }}</p>
                <div class="space-y-2">
                  <div
                    v-for="item in auditActionStats"
                    :key="`${item.action}-${item.count}`"
                    class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-2.5 text-sm"
                  >
                    <span class="text-slate-600 dark:text-slate-300 truncate">{{ formatAuditAction(item.action) }}</span>
                    <span class="font-bold text-slate-900 dark:text-slate-100">{{ item.count }}</span>
                  </div>
                  <div v-if="auditActionStats.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
                    {{ $t('message.system_stats_page.audit_top_actions_empty') }}
                  </div>
                </div>
              </div>
            </template>
          </section>
        </AsyncStateSection>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, ref, watch } from 'vue';
const { storeToRefs } = Pinia;
import { useI18n } from 'vue-i18n';
import { useSystemStatsStore } from '/assets/js/stores/systemStatsStore.js';
import { useAuditStore } from '/assets/js/stores/auditStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import StatCard from '/vue/components/StatCard.vue';
import AsyncStateSection from '/vue/components/AsyncStateSection.vue';
import { useAuthGate } from '../composables/useAuthGate.js';

const { t } = useI18n({ useScope: 'global' });
const systemStatsStore = useSystemStatsStore();
const auditStore = useAuditStore();
const authStore = useAuthStore();
const modalStore = useModalStore();
const mainStore = useMainStore();
const heroSectionClass = 'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-indigo-50/40 to-cyan-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
const auditScopeBadgeClass = 'inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300';

const auditStatsData = ref(null);
const auditStatsLoading = ref(false);
const auditStatsError = ref(null);
const auditDays = ref(7);

const { statsData, loading: isLoading, error: errorMessage, lastUpdated } = storeToRefs(systemStatsStore);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const role = computed(() => String(authStore.user?.role || '').toLowerCase());
const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin');

const stats = computed(() => ({
  totalUsers: Number(statsData.value?.totalUsers) || 0,
  activeUsers: Number(statsData.value?.activeUsers) || 0,
  inactiveUsers: Number(statsData.value?.inactiveUsers) || 0,
  suspendedUsers: Number(statsData.value?.suspendedUsers) || 0,
  recentRegistrations: Number(statsData.value?.recentRegistrations) || 0
}));

const roleCounts = computed(() => ({
  super_admin: Number(statsData.value?.usersByRole?.super_admin) || 0,
  admin: Number(statsData.value?.usersByRole?.admin) || 0,
  user: Number(statsData.value?.usersByRole?.user) || 0
}));

const toPercent = (value, total) => {
  if (!total) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

const activeRate = computed(() => toPercent(stats.value.activeUsers, stats.value.totalUsers));
const inactiveRate = computed(() => toPercent(stats.value.inactiveUsers, stats.value.totalUsers));
const suspendedRate = computed(() => toPercent(stats.value.suspendedUsers, stats.value.totalUsers));

const hasData = computed(() => Boolean(statsData.value));
const lastUpdatedLabel = computed(() => lastUpdated.value);
const hasAuditStats = computed(() => Boolean(auditStatsData.value));

const auditBasicStats = computed(() => ({
  total_events: Number(auditStatsData.value?.basic_stats?.total_events) || 0,
  successful_events: Number(auditStatsData.value?.basic_stats?.successful_events) || 0,
  failed_events: Number(auditStatsData.value?.basic_stats?.failed_events) || 0,
  error_events: Number(auditStatsData.value?.basic_stats?.error_events) || 0,
  security_events: Number(auditStatsData.value?.basic_stats?.security_events) || 0
}));

const auditRecentActivity = computed(() => ({
  events_24h: Number(auditStatsData.value?.recent_activity?.events_24h) || 0,
  login_events_24h: Number(auditStatsData.value?.recent_activity?.login_events_24h) || 0,
  admin_events_24h: Number(auditStatsData.value?.recent_activity?.admin_events_24h) || 0,
  kv_events_24h: Number(auditStatsData.value?.recent_activity?.kv_events_24h) || 0
}));

const auditActionStats = computed(() => (
  Array.isArray(auditStatsData.value?.action_stats) ? auditStatsData.value.action_stats : []
));

const formatAuditAction = (value) => {
  const action = String(value || '').trim();
  if (!action) return '-';
  return action
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const auditScopeText = computed(() => {
  const scope = String(auditStatsData.value?.filtered_for_role || '').toLowerCase();
  if (scope === 'super_admin') return t('message.system_stats_page.audit_scope_full');
  if (scope === 'admin') return t('message.system_stats_page.audit_scope_limited');
  return '-';
});

const auditScopeHintKey = computed(() => {
  const scope = String(auditStatsData.value?.filtered_for_role || '').toLowerCase();
  if (scope === 'super_admin') return 'message.system_stats_page.audit_scope_hint_full';
  return 'message.system_stats_page.audit_scope_hint_limited';
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const normalizeAuditDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 7;
  return Math.min(365, Math.max(1, parsed));
};

const loadAuditStats = async () => {
  if (!isAuthenticated.value || !isAdmin.value) return;
  auditStatsLoading.value = true;
  auditStatsError.value = null;
  try {
    const safeDays = normalizeAuditDays(auditDays.value);
    auditDays.value = safeDays;
    const payload = await auditStore.fetchStats(`${safeDays}d`);
    auditStatsData.value = payload;
  } catch (error) {
    auditStatsError.value = error?.message || null;
  } finally {
    auditStatsLoading.value = false;
  }
};

const handleAuditDaysChange = async () => {
  auditDays.value = normalizeAuditDays(auditDays.value);
  await loadAuditStats();
};

const refresh = async () => {
  if (!isAuthenticated.value || !isAdmin.value) return;
  await systemStatsStore.fetchSystemStats();
  await loadAuditStats();
};

const loadInitial = async () => {
  if (!isAuthenticated.value || !isAdmin.value) return;
  await systemStatsStore.fetchSystemStats();
  await loadAuditStats();
};

const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange } = useAuthGate({
  authStore,
  modalStore,
  onAuthenticated: async () => {
    await loadInitial();
  }
});

watch(() => authStore.isAuthenticated, async (value) => {
  await handleAuthStateChange(value);
});

watch(() => mainStore.mockApi, async (value, oldValue) => {
  if (!isAuthenticated.value || !isAdmin.value || value === oldValue) return;
  await loadInitial();
});

onMounted(async () => {
  await ensureAuthenticated({ checkSessionFlag: true, openModal: false });
});

onActivated(async () => {
  await ensureAuthenticated({ checkSessionFlag: true, openModal: false });
});
</script>
