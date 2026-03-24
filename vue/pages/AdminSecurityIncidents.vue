<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="blue"
      :title="$t('message.auth.login_required')"
      :message="$t('message.auth.login_required_message')"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <template v-else>
    <PageHeroSection
      :section-class="heroSectionClass"
      top-blob-class="absolute -top-24 -right-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl"
      bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"
      content-class="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center"
    >
      <template #left>
        <div>
          <div class="inline-flex items-center gap-2 rounded-full bg-rose-900/10 text-rose-800 dark:bg-rose-400/10 dark:text-rose-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            {{ tf('message.security_incidents.badge', 'Threat Monitoring') }}
          </div>
          <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            {{ tf('message.security_incidents.title', 'Security Incidents') }}
          </h1>
          <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
            {{ tf('message.security_incidents.subtitle', 'Monitor and review detected security incidents.') }}
          </p>
          <div class="mt-6 flex flex-wrap items-center gap-3">
            <ActionTextButton
              variant="soft"
              shape="full"
              icon="bi bi-arrow-clockwise"
              :title="$t('message.common.retry_title')"
              @click="refresh"
            >
              {{ tf('message.refresh', 'Refresh') }}
            </ActionTextButton>
          </div>
        </div>
      </template>

      <template #right>
        <div class="grid gap-4">
          <template v-if="isLoading">
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
              <div class="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700/50"></div>
              <div class="mt-3 flex items-center justify-between">
                <div class="h-8 w-20 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 shadow-sm animate-pulse">
                <div class="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                <div class="mt-2 flex items-center justify-between">
                  <div class="h-6 w-12 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                  <div class="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 shadow-sm animate-pulse">
                <div class="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                <div class="mt-2 flex items-center justify-between">
                  <div class="h-6 w-12 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                  <div class="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 shadow-sm animate-pulse">
                <div class="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                <div class="mt-2 flex items-center justify-between">
                  <div class="h-6 w-12 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                  <div class="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <StatCard
              :label="$t('message.admin_users.stats_total')"
              :value="pagination.total || incidents.length || 0"
              value-class="text-3xl font-black text-slate-900 dark:text-white"
              icon-class="bi bi-shield-exclamation text-2xl text-rose-500"
            />
            <div class="grid grid-cols-3 gap-3">
              <StatCard
                :label="$t('message.security_incidents.stats_open')"
                :value="detectedCount"
                card-class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 shadow-sm"
                label-class="text-[10px] uppercase tracking-[0.25em] text-slate-500"
                value-class="text-xl font-black text-slate-900 dark:text-white"
                icon-class="bi bi-activity text-rose-500"
              />
              <StatCard
                :label="$t('message.security_incidents.stats_resolved')"
                :value="resolvedCount"
                card-class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 shadow-sm"
                label-class="text-[10px] uppercase tracking-[0.25em] text-slate-500"
                value-class="text-xl font-black text-slate-900 dark:text-white"
                icon-class="bi bi-shield-check text-emerald-500"
              />
              <StatCard
                :label="$t('message.security_incidents.stats_high')"
                :value="highSeverityCount"
                card-class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 shadow-sm"
                label-class="text-[10px] uppercase tracking-[0.25em] text-slate-500"
                value-class="text-xl font-black text-slate-900 dark:text-white"
                icon-class="bi bi-exclamation-triangle text-amber-500"
              />
            </div>
          </template>
        </div>
      </template>
    </PageHeroSection>

    <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
      <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
      <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ tf('message.security_incidents.access_denied_title', 'Access denied') }}</h3>
      <p class="text-rose-700 dark:text-rose-300">{{ tf('message.security_incidents.access_denied_message', 'Only admin and super admin can access this page.') }}</p>
    </section>

    <section v-else class="space-y-6">
      <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="relative flex-1 min-w-[220px]">
            <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              v-model="search"
              type="text"
              :class="searchInputClass"
              :placeholder="$t('message.security_incidents.search_placeholder')"
            />
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="severityFilter"
              class="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5"
            >
              <option value="all">{{ $t('message.security_incidents.filter_all_severity') }}</option>
              <option value="high">{{ $t('message.security_incidents.severity_high') }}</option>
              <option value="medium">{{ $t('message.security_incidents.severity_medium') }}</option>
              <option value="low">{{ $t('message.security_incidents.severity_low') }}</option>
            </select>
            <select
              v-model="statusFilter"
              class="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5"
            >
              <option value="all">{{ $t('message.security_incidents.filter_all_status') }}</option>
              <option value="detected">{{ $t('message.security_incidents.status_detected') }}</option>
              <option value="resolved">{{ $t('message.security_incidents.status_resolved') }}</option>
            </select>
            <label :class="serverFilterLabelClass">
              <input
                v-model="useServerFilter"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span>{{ useServerFilter ? $t('message.admin_users.server_filtering') : $t('message.admin_users.client_filtering') }}</span>
            </label>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {{ filteredIncidents.length }} / {{ incidents.length || 0 }} {{ $t('message.security_incidents.items') }}
          </div>
        </div>
      </div>

      <div ref="tableTopRef" class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <AsyncStateSection
          :loading="isLoading"
          :error="errorMessage"
          :is-empty="filteredIncidents.length === 0"
          :empty-title="tf('message.security_incidents.no_data', 'No incidents found.')"
        >
          <template #loading>
            <div class="p-6 space-y-4 animate-pulse">
              <div v-for="row in 6" :key="row" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
            </div>
          </template>

          <template #error>
            <div class="p-8 text-center">
              <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-3"></i>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ $t('message.errors.failed_to_load', { item: $t('message.security_incidents.title'), message: errorMessage }) }}
              </h3>
              <ActionTextButton
                class="mt-4"
                tone="rose"
                shape="full"
                icon="bi bi-arrow-clockwise"
                @click="refresh"
              >
                {{ tf('message.common.retry', 'Retry') }}
              </ActionTextButton>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="max-[992px]:mt-4 mt-0 min-w-full text-sm max-[992px]:block">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider max-[992px]:hidden">
                <tr>
                  <th class="px-6 py-3 text-center">{{ tf('message.security_incidents.actions', 'Actions') }}</th>
                  <th class="px-6 py-3 text-left">{{ tf('message.security_incidents.incident', 'Incident') }}</th>
                  <th class="px-6 py-3 text-left">{{ tf('message.security_incidents.severity_status', 'Severity / Status') }}</th>
                  <th class="px-6 py-3 text-left">{{ tf('message.security_incidents.when_by', 'When / By') }}</th>
                </tr>
              </thead>
              <tbody class="max-[992px]:block max-[992px]:px-4">
                <tr
                  v-for="incident in filteredIncidents"
                  :key="incident.id"
                  :class="tableRowClass"
                >
                  <td :class="actionsCellClass" :data-label="tf('message.security_incidents.actions', 'Actions')">
                    <div class="flex items-center justify-center gap-2">
                      <ActionIconButton
                        @click="openIncident(incident)"
                        icon="bi bi-eye-fill"
                        tone="indigo"
                        :title="tf('message.security_incidents.view_details', 'View')"
                        :aria-label="tf('message.security_incidents.view_details', 'View')"
                      />
                    </div>
                  </td>
                  <td :class="incidentCellClass" :data-label="tf('message.security_incidents.incident', 'Incident')">
                    <div class="space-y-2 max-[992px]:text-right">
                      <div class="font-semibold">#{{ incident.id }} · {{ incident.title }}</div>
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" :class="typeBadgeClass(incident.type)">
                        {{ incident.type }}
                      </span>
                    </div>
                  </td>
                  <td :class="severityStatusCellClass" :data-label="tf('message.security_incidents.severity_status', 'Severity / Status')">
                    <div class="flex flex-wrap gap-2 max-[992px]:justify-end">
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" :class="severityBadgeClass(incident.severity)">
                        {{ incident.severity }}
                      </span>
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" :class="statusBadgeClass(incident.status)">
                        {{ formatStatus(incident.status) }}
                      </span>
                    </div>
                  </td>
                  <td :class="whenByCellClass" :data-label="tf('message.security_incidents.when_by', 'When / By')">
                    <div class="space-y-1 max-[992px]:text-right">
                      <div>{{ formatDate(incident.detected_at) }}</div>
                      <div class="font-semibold text-slate-700 dark:text-slate-200">{{ incident.created_by }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AsyncStateSection>
      </div>

      <div class="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" v-if="(pagination.totalPages || 1) > 1">
        <PaginationControls
          :current-page="pagination.page || 1"
          :total-pages="pagination.totalPages || 1"
          :page-size="pagination.limit"
          :page-size-options="[10, 20, 50]"
          :show-page-size="true"
          :loading="isLoading"
          @change="goToPage"
          @change-size="handlePageSizeChange"
        />
      </div>
    </section>

    <!-- Incident Details Modal -->
    <ModalWindow :show="showModal" :title="tf('message.security_incidents.details', 'Incident Details')" @close="closeIncident" :panel-class="'max-w-3xl sm:max-w-4xl w-full'">
      <div v-if="selectedIncident" class="space-y-4">
        <div class="flex flex-col gap-2">
          <div class="font-bold text-lg">{{ selectedIncident.title }}</div>
          <div class="text-slate-600 dark:text-slate-300">{{ selectedIncident.description }}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="font-semibold">{{ tf('message.security_incidents.type', 'Type') }}:</div>
            <div>{{ selectedIncident.type }}</div>
          </div>
          <div>
            <div class="font-semibold">{{ tf('message.security_incidents.severity', 'Severity') }}:</div>
            <div>{{ selectedIncident.severity }}</div>
          </div>
          <div>
            <div class="font-semibold">{{ tf('message.security_incidents.status', 'Status') }}:</div>
            <div>{{ selectedIncident.status }}</div>
          </div>
          <div>
            <div class="font-semibold">{{ tf('message.security_incidents.detected_at', 'Detected At') }}:</div>
            <div>{{ formatDate(selectedIncident.detected_at) }}</div>
          </div>
          <div>
            <div class="font-semibold">{{ tf('message.security_incidents.created_by', 'Created By') }}:</div>
            <div>{{ selectedIncident.created_by }}</div>
          </div>
        </div>
        <div v-if="selectedIncident.metadata" class="mt-4">
          <div class="font-semibold mb-1">{{ tf('message.security_incidents.metadata', 'Metadata') }}:</div>
          <pre class="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-xs overflow-x-auto">{{ JSON.stringify(selectedIncident.metadata, null, 2) }}</pre>
        </div>
        <div v-if="selectedIncident.tags && selectedIncident.tags.length" class="mt-2">
          <div class="font-semibold mb-1">{{ tf('message.security_incidents.tags', 'Tags') }}:</div>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in selectedIncident.tags" :key="tag" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">{{ tag }}</span>
          </div>
        </div>
      </div>
    </ModalWindow>
    </template>
  </div>
</template>

<script setup>
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import ModalWindow from '/vue/components/ModalWindow.vue';
import PaginationControls from '/vue/components/PaginationControls.vue';
import ActionIconButton from '/vue/components/ActionIconButton.vue';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import AsyncStateSection from '/vue/components/AsyncStateSection.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import StatCard from '/vue/components/StatCard.vue';
import { useAdminSecurityIncidentsPage } from '/vue/composables/useAdminSecurityIncidentsPage.js';

const {
  actionsCellClass,
  closeIncident,
  detectedCount,
  errorMessage,
  filteredIncidents,
  formatDate,
  formatStatus,
  goToPage,
  handlePageSizeChange,
  heroSectionClass,
  highSeverityCount,
  incidentCellClass,
  incidents,
  isAdmin,
  isLoading,
  openIncident,
  openLoginModal,
  pagination,
  refresh,
  resolvedCount,
  search,
  searchInputClass,
  selectedIncident,
  serverFilterLabelClass,
  severityBadgeClass,
  severityFilter,
  showLoginRequired,
  showModal,
  statusBadgeClass,
  statusFilter,
  severityStatusCellClass,
  tableRowClass,
  tableTopRef,
  tf,
  typeBadgeClass,
  useServerFilter,
  whenByCellClass
} = useAdminSecurityIncidentsPage();
</script>
