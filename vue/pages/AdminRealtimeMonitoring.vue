<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="blue"
      :title="tf(['message.audit.login_required', 'message.auth.login_required'], 'Login required')"
      :message="tf(['message.audit.login_required_message', 'message.auth.login_required_message'], 'Please login to continue.')"
      :button-text="tf('message.auth.login', 'Login')"
      @action="openLoginModal"
    />

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-24 -right-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-violet-900/10 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-violet-500"></span>
              {{ tf('message.realtime_monitoring.badge', 'Realtime Monitoring') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ tf('message.navbar.realtime_monitoring', 'Realtime Monitoring') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ tf('message.realtime_monitoring.subtitle', 'Real-time analytics dashboard from audit, user behavior, and security activity.') }}
            </p>
            <p class="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{{ formatDate(dataTimestamp) }}</p>

            <div class="mt-6 flex flex-wrap gap-3">
              <ActionTextButton
                variant="soft"
                icon="bi bi-arrow-clockwise"
                shape="full"
                :disabled="loading"
                @click="refresh"
              >
                  {{ tf('message.refresh', 'Refresh') }}
              </ActionTextButton>

              <ActionTextButton
                variant="soft"
                icon="bi bi-download"
                shape="full"
                :disabled="actionLoading"
                @click="exportDashboard"
              >
                  {{ tf('message.realtime_monitoring.export', 'Export') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin && !isMonitoringActive"
                icon="bi bi-play-fill"
                tone="emerald"
                shape="full"
                :disabled="actionLoading || !isContinuousMonitoringSupported"
                :title="startMonitoringDisabledReason"
                @click="startMonitoring"
              >
                {{ tf('message.realtime_monitoring.start', 'Start') }}
              </ActionTextButton>

              <ActionTextButton
                v-else-if="isSuperAdmin"
                icon="bi bi-stop-fill"
                tone="rose"
                shape="full"
                :disabled="actionLoading"
                @click="stopMonitoring"
              >
                {{ tf('message.realtime_monitoring.stop', 'Stop') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-bar-chart"
                tone="indigo"
                shape="full"
                :disabled="actionLoading"
                @click="analyzeThreats"
              >
                {{ tf('message.realtime_monitoring.analyze', 'Analyze Last 1h') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-lightning-charge"
                tone="indigo"
                shape="full"
                :disabled="actionLoading"
                @click="simulateEvent"
              >
                {{ tf('message.realtime_monitoring.simulate', 'Simulate Event') }}
              </ActionTextButton>

              <ActionTextButton
                icon="bi bi-broadcast-pin"
                tone="sky"
                shape="full"
                :disabled="actionLoading"
                @click="refreshRecentEvents"
              >
                {{ tf('message.realtime_monitoring.refresh_events', 'Recent Events') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-bell"
                tone="amber"
                shape="full"
                :disabled="actionLoading"
                @click="testAlerts"
              >
                {{ tf('message.realtime_monitoring.test_alerts', 'Test Alerts') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-trash3"
                tone="rose"
                shape="full"
                :disabled="actionLoading"
                @click="clearCache"
              >
                {{ tf('message.realtime_monitoring.clear_cache', 'Clear Cache') }}
              </ActionTextButton>

              <ActionTextButton
                v-if="isSuperAdmin"
                icon="bi bi-exclamation-octagon"
                tone="slate"
                shape="full"
                :disabled="actionLoading"
                @click="createIncident"
              >
                {{ tf('message.realtime_monitoring.create_incident', 'Create Incident') }}
              </ActionTextButton>
            </div>
          </div>
        </template>

        <template #right>
          <div class="grid grid-cols-2 gap-4">
            <template v-if="loading">
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Today</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-2xl font-black text-cyan-600 dark:text-cyan-400">{{ overviewTotals.today }}</span>
                  <i class="bi bi-activity text-xl text-cyan-500"></i>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">All Time</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-2xl font-black text-violet-600 dark:text-violet-400">{{ overviewTotals.allTime }}</span>
                  <i class="bi bi-database text-xl text-violet-500"></i>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Failed Today</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-2xl font-black text-rose-600 dark:text-rose-400">{{ overviewTotals.failedActionsToday }}</span>
                  <i class="bi bi-exclamation-triangle text-xl text-rose-500"></i>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Risk Score</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-2xl font-black text-amber-600 dark:text-amber-400">{{ riskScore }}</span>
                  <i class="bi bi-shield-lock text-xl text-amber-500"></i>
                </div>
              </div>
            </template>
          </div>
        </template>
      </PageHeroSection>

      <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ tf('message.realtime_monitoring.access_denied_title', 'Access denied') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ tf('message.realtime_monitoring.access_denied_message', 'Only admin and super admin can access this page.') }}</p>
      </section>

      <template v-else>
      <section v-if="error" class="rounded-[18px] border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-rose-700 dark:text-rose-300">
        <div class="flex items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>{{ error }}</span>
        </div>
      </section>

      <template v-if="loading">
        <section class="grid gap-6 lg:grid-cols-3 animate-pulse">
          <div class="lg:col-span-2 rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6">
            <div class="h-5 w-44 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
            <div class="space-y-3">
              <div v-for="item in 3" :key="`skeleton-actions-${item}`" class="h-14 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>

          <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 space-y-3">
            <div class="h-5 w-36 rounded bg-slate-200 dark:bg-slate-700"></div>
            <div v-for="item in 3" :key="`skeleton-summary-${item}`" class="h-16 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-2 animate-pulse">
          <div v-for="item in 2" :key="`skeleton-table-top-${item}`" class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6">
            <div class="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
            <div class="space-y-2">
              <div v-for="row in 5" :key="`skeleton-table-top-row-${item}-${row}`" class="h-10 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-2 animate-pulse">
          <div v-for="item in 2" :key="`skeleton-table-bottom-${item}`" class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6">
            <div class="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
            <div class="space-y-2">
              <div v-for="row in 5" :key="`skeleton-table-bottom-row-${item}-${row}`" class="h-10 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
      <RealtimeTopActionsSection
        :actions="topActionsToday"
        :timeline="timelineSummary"
      />

      <section class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.realtime_monitoring.recent_events_title', 'Recent Events') }}</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.recent_events_subtitle', 'Latest activity stream exposed by the monitoring service.') }}</p>
            </div>
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
              {{ tf('message.realtime_monitoring.recent_events_count', '{count} events', { count: recentEventCount }) }}
            </div>
          </div>

          <div class="overflow-x-auto max-h-96">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                <tr>
                  <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.event_label', 'Event') }}</th>
                  <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.severity_label', 'Severity') }}</th>
                  <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.source_label', 'Source') }}</th>
                  <th class="px-4 py-3 text-right">{{ tf('message.realtime_monitoring.time_label', 'Time') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in recentEventItems"
                  :key="item.id || item.eventId || `${item.timestamp || item.createdAt || 'event'}-${index}`"
                  class="border-t border-slate-100 dark:border-slate-800"
                >
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-200">
                    <div class="font-semibold uppercase">{{ item.eventType || item.type || item.category || tf('message.realtime_monitoring.event_fallback', 'event') }}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ item.description || item.message || item.details || tf('message.realtime_monitoring.empty_value', '-') }}</div>
                  </td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-200 uppercase">{{ item.severity || item.level || tf('message.realtime_monitoring.empty_value', '-') }}</td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-200">{{ item.source || item.actor || item.ipAddress || tf('message.realtime_monitoring.empty_value', '-') }}</td>
                  <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ formatDate(item.timestamp || item.createdAt) }}</td>
                </tr>
                <tr v-if="recentEventItems.length === 0">
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.no_recent_events', 'No recent events.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      <RealtimeOpsControlsSection
        :is-super-admin="isSuperAdmin"
        :performance-summary="performanceSummary"
        :latest-incident="latestIncident"
        :latest-analysis="latestAnalysis"
        :latest-analysis-summary="latestAnalysisSummary"
        :latest-analysis-threats="latestAnalysisThreats"
        :format-date="formatDate"
        @create-rule="createAlertRule"
        @create-channel="createAlertChannel"
        @test-alerts="testAlerts"
        @clear-cache="clearCache"
      />
      </section>

      <RealtimeBreakdownTables
        :role-rows="usersByRole"
        :action-rows="actionDistribution"
        :timeline-rows="timelineItems"
        :risk-indicators="riskIndicators"
        :cache-status="cacheStatus"
        :cache-hit-rate="cacheHitRate"
        :admin-activity="adminActivity"
        :format-date="formatDate"
      />

      <RealtimeAlertRulesSection
        :rules="alertRuleItems"
        :channels="alertChannelItems"
        :rule-summary="alertRuleSummary"
        :channel-summary="alertChannelSummary"
        :rules-loading="alertsRulesLoading"
        :action-loading="actionLoading"
        :is-super-admin="isSuperAdmin"
        :format-date="formatDate"
        @toggle="toggleAlertRule"
      />

      <RealtimeAlertRuleModal
        :show="showCreateRuleModal"
        :form="createRuleForm"
        :error="createRuleError"
        :loading="actionLoading"
        @close="closeCreateAlertRuleModal"
        @submit="submitCreateAlertRule"
        @update:field="updateCreateRuleField"
      />

      <RealtimeToggleRuleConfirmModal
        :show="showToggleRuleModal"
        :enabled="Boolean(pendingToggleRule?.enabled)"
        @confirm="confirmToggleAlertRule"
        @cancel="closeToggleRuleModal"
      />

      <RealtimeAlertChannelModal
        :show="showCreateChannelModal"
        :form="createChannelForm"
        :error="createChannelError"
        :loading="actionLoading"
        @close="closeCreateAlertChannelModal"
        @submit="submitCreateAlertChannel"
        @update:field="updateCreateChannelField"
      />

      <RealtimeClearCacheModal
        :show="showClearCacheModal"
        :form="clearCacheForm"
        :error="clearCacheError"
        :loading="actionLoading"
        @close="closeClearCacheModal"
        @submit="submitClearCache"
        @update:field="updateClearCacheField"
      />

      <RealtimeIncidentModal
        :show="showCreateIncidentModal"
        :form="createIncidentForm"
        :error="createIncidentError"
        :loading="actionLoading"
        @close="closeCreateIncidentModal"
        @submit="submitCreateIncident"
        @update:field="updateCreateIncidentField"
      />
      </template>
    </template>
    </template>
  </div>
</template>

<script setup>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import ConfirmModal from '/vue/components/ConfirmModal.vue';
import RealtimeAlertChannelModal from '/vue/components/RealtimeAlertChannelModal.vue';
import RealtimeAlertRuleModal from '/vue/components/RealtimeAlertRuleModal.vue';
import RealtimeAlertRulesSection from '/vue/components/RealtimeAlertRulesSection.vue';
import RealtimeBreakdownTables from '/vue/components/RealtimeBreakdownTables.vue';
import RealtimeOpsControlsSection from '/vue/components/RealtimeOpsControlsSection.vue';
import RealtimeClearCacheModal from '/vue/components/RealtimeClearCacheModal.vue';
import RealtimeIncidentModal from '/vue/components/RealtimeIncidentModal.vue';
import RealtimeToggleRuleConfirmModal from '/vue/components/RealtimeToggleRuleConfirmModal.vue';
import RealtimeTopActionsSection from '/vue/components/RealtimeTopActionsSection.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import ModalWindow from '/vue/components/ModalWindow.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useAdminRealtimeMonitoringPage } from '/vue/composables/useAdminRealtimeMonitoringPage.js';

const {
  actionDistribution,
  actionLoading,
  adminActivity,
  analyzeThreats,
  alertChannelItems,
  alertChannelSummary,
  alertRuleItems,
  alertsRulesLoading,
  alertRuleSummary,
  cacheHitRate,
  cacheStatus,
  clearCache,
  clearCacheError,
  clearCacheForm,
  closeClearCacheModal,
  createAlertChannel,
  createAlertRule,
  createChannelError,
  createChannelForm,
  createIncidentError,
  createIncidentForm,
  createRuleError,
  createRuleForm,
  createIncident,
  dataTimestamp,
  error,
  exportDashboard,
  formatDate,
  heroSectionClass,
  isAdmin,
  isSuperAdmin,
  isContinuousMonitoringSupported,
  isMonitoringActive,
  latestIncident,
  latestAnalysis,
  latestAnalysisSummary,
  latestAnalysisThreats,
  latestSimulation,
  loading,
  closeCreateAlertChannelModal,
  closeCreateAlertRuleModal,
  closeCreateIncidentModal,
  closeToggleRuleModal,
  confirmToggleAlertRule,
  openLoginModal,
  overviewTotals,
  pendingToggleRule,
  performanceSummary,
  recentEventCount,
  recentEventItems,
  refresh,
  refreshRecentEvents,
  riskIndicators,
  riskScore,
  security,
  showLoginRequired,
  showClearCacheModal,
  showCreateChannelModal,
  showCreateIncidentModal,
  showCreateRuleModal,
  showToggleRuleModal,
  simulateEvent,
  startMonitoring,
  startMonitoringDisabledReason,
  stopMonitoring,
  submitClearCache,
  submitCreateAlertChannel,
  submitCreateIncident,
  submitCreateAlertRule,
  testAlerts,
  updateClearCacheField,
  updateCreateChannelField,
  updateCreateIncidentField,
  updateCreateRuleField,
  tf,
  timelineItems,
  timelineSummary,
  toggleAlertRule,
  topActionsToday,
  usersByRole
} = useAdminRealtimeMonitoringPage();
</script>
