<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

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
            {{ $t('message.security_incidents.badge') || 'Threat Monitoring' }}
          </div>
          <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            {{ $t('message.security_incidents.title') || 'Security Incidents' }}
          </h1>
          <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
            {{ $t('message.security_incidents.subtitle') || 'Monitor and review detected security incidents.' }}
          </p>
          <div class="mt-6 flex flex-wrap items-center gap-3">
            <ActionTextButton
              variant="soft"
              shape="full"
              icon="bi bi-arrow-clockwise"
              :title="$t('message.common.retry_title')"
              @click="refresh"
            >
              {{ $t('message.refresh') || 'Refresh' }}
            </ActionTextButton>
          </div>
        </div>
      </template>

      <template #right>
        <div class="grid gap-4">
          <template v-if="loading">
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

    <section class="space-y-6">
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
          :loading="loading"
          :error="error"
          :is-empty="filteredIncidents.length === 0"
          :empty-title="$t('message.security_incidents.no_data') || 'No incidents found.'"
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
                {{ $t('message.errors.failed_to_load', { item: $t('message.security_incidents.title'), message: error }) }}
              </h3>
              <ActionTextButton
                class="mt-4"
                tone="rose"
                shape="full"
                icon="bi bi-arrow-clockwise"
                @click="refresh"
              >
                {{ $t('message.common.retry') || 'Retry' }}
              </ActionTextButton>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="max-[992px]:mt-4 mt-0 min-w-full text-sm max-[992px]:block">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider max-[992px]:hidden">
                <tr>
                  <th class="px-6 py-3 text-center">{{ $t('message.security_incidents.actions') || 'Actions' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.security_incidents.incident') || 'Incident' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.security_incidents.severity_status') || 'Severity / Status' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.security_incidents.when_by') || 'When / By' }}</th>
                </tr>
              </thead>
              <tbody class="max-[992px]:block max-[992px]:px-4">
                <tr
                  v-for="incident in filteredIncidents"
                  :key="incident.id"
                  :class="tableRowClass"
                >
                  <td :class="actionsCellClass" :data-label="$t('message.security_incidents.actions') || 'Actions'">
                    <div class="flex items-center justify-center gap-2">
                      <ActionIconButton
                        @click="openIncident(incident)"
                        icon="bi bi-eye-fill"
                        tone="indigo"
                        :title="$t('message.security_incidents.view_details') || 'View'"
                        :aria-label="$t('message.security_incidents.view_details') || 'View'"
                      />
                    </div>
                  </td>
                  <td :class="incidentCellClass" :data-label="$t('message.security_incidents.incident') || 'Incident'">
                    <div class="space-y-2 max-[992px]:text-right">
                      <div class="font-semibold">#{{ incident.id }} · {{ incident.title }}</div>
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" :class="typeBadgeClass(incident.type)">
                        {{ incident.type }}
                      </span>
                    </div>
                  </td>
                  <td :class="severityStatusCellClass" :data-label="$t('message.security_incidents.severity_status') || 'Severity / Status'">
                    <div class="flex flex-wrap gap-2 max-[992px]:justify-end">
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" :class="severityBadgeClass(incident.severity)">
                        {{ incident.severity }}
                      </span>
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" :class="statusBadgeClass(incident.status)">
                        {{ formatStatus(incident.status) }}
                      </span>
                    </div>
                  </td>
                  <td :class="whenByCellClass" :data-label="$t('message.security_incidents.when_by') || 'When / By'">
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
          :page-size="pagination.limit || 20"
          :page-size-options="[10, 20, 50]"
          :show-page-size="true"
          :loading="loading"
          @change="goToPage"
          @change-size="handlePageSizeChange"
        />
      </div>
    </section>

    <!-- Incident Details Modal -->
    <ModalWindow :show="showModal" :title="$t('message.security_incidents.details') || 'Incident Details'" @close="closeIncident" :panelClass="'max-w-3xl sm:max-w-4xl w-full'">
      <div v-if="selectedIncident" class="space-y-4">
        <div class="flex flex-col gap-2">
          <div class="font-bold text-lg">{{ selectedIncident.title }}</div>
          <div class="text-slate-600 dark:text-slate-300">{{ selectedIncident.description }}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="font-semibold">{{$t('message.security_incidents.type') || 'Type'}}:</div>
            <div>{{ selectedIncident.type }}</div>
          </div>
          <div>
            <div class="font-semibold">{{$t('message.security_incidents.severity') || 'Severity'}}:</div>
            <div>{{ selectedIncident.severity }}</div>
          </div>
          <div>
            <div class="font-semibold">{{$t('message.security_incidents.status') || 'Status'}}:</div>
            <div>{{ selectedIncident.status }}</div>
          </div>
          <div>
            <div class="font-semibold">{{$t('message.security_incidents.detected_at') || 'Detected At'}}:</div>
            <div>{{ formatDate(selectedIncident.detected_at) }}</div>
          </div>
          <div>
            <div class="font-semibold">{{$t('message.security_incidents.created_by') || 'Created By'}}:</div>
            <div>{{ selectedIncident.created_by }}</div>
          </div>
        </div>
        <div v-if="selectedIncident.metadata" class="mt-4">
          <div class="font-semibold mb-1">{{$t('message.security_incidents.metadata') || 'Metadata'}}:</div>
          <pre class="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-xs overflow-x-auto">{{ JSON.stringify(selectedIncident.metadata, null, 2) }}</pre>
        </div>
        <div v-if="selectedIncident.tags && selectedIncident.tags.length" class="mt-2">
          <div class="font-semibold mb-1">{{$t('message.security_incidents.tags') || 'Tags'}}:</div>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in selectedIncident.tags" :key="tag" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">{{ tag }}</span>
          </div>
        </div>
      </div>
    </ModalWindow>
  </div>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue';
const { storeToRefs } = Pinia;
import { useI18n } from 'vue-i18n';
import { useSecurityIncidentStore } from '/assets/js/stores/securityIncidentStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import ModalWindow from '/vue/components/ModalWindow.vue';
import PaginationControls from '/vue/components/PaginationControls.vue';
import ActionIconButton from '/vue/components/ActionIconButton.vue';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import AsyncStateSection from '/vue/components/AsyncStateSection.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import StatCard from '/vue/components/StatCard.vue';
import { useDebouncedFilters } from '/vue/composables/useDebouncedFilters.js';
import { useModalState } from '/vue/composables/useModalState.js';

export default {
  name: 'AdminSecurityIncidents',
  components: { ModalWindow, PaginationControls, ActionIconButton, ActionTextButton, AsyncStateSection, PageHeroSection, StatCard },
  setup() {
    const { t } = useI18n({ useScope: 'global' });
    const mainStore = useMainStore();
    const securityStore = useSecurityIncidentStore();
    const { incidents, loading, error, pagination } = storeToRefs(securityStore);
    const incidentModal = useModalState({ initialMode: 'view', initialValue: null });
    const showModal = incidentModal.isOpen;
    const selectedIncident = incidentModal.value;
    const tableTopRef = ref(null);
    const search = ref('');
    const severityFilter = ref('all');
    const statusFilter = ref('all');
    const useServerFilter = ref(true);
    const { runDebounced } = useDebouncedFilters(400);

    const heroSectionClass =
      'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
    const searchInputClass =
      'w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none';
    const serverFilterLabelClass =
      'inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200';

    const mobileCellBaseClass =
      'max-[992px]:flex max-[992px]:items-start max-[992px]:justify-between max-[992px]:gap-3 max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3';
    const mobileActionsCellBaseClass =
      'max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3';
    const tableRowClass =
      'border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition max-[992px]:block max-[992px]:border max-[992px]:border-slate-200/70 dark:max-[992px]:border-slate-700 max-[992px]:rounded-2xl max-[992px]:p-1 max-[992px]:mb-4 max-[992px]:bg-white/90 dark:max-[992px]:bg-slate-900/80';
    const actionsCellClass = `whitespace-nowrap px-6 py-4 text-center ${mobileActionsCellBaseClass}`;
    const incidentCellClass = `px-6 py-4 text-slate-800 dark:text-slate-100 ${mobileCellBaseClass}`;
    const severityStatusCellClass = `px-6 py-4 ${mobileCellBaseClass}`;
    const whenByCellClass = `px-6 py-4 text-slate-500 dark:text-slate-300 ${mobileCellBaseClass}`;

    const normalizedIncidents = computed(() => incidents.value || []);

    const filteredIncidents = computed(() => {
      const query = search.value.trim().toLowerCase();

      return normalizedIncidents.value.filter((incident) => {
        const severity = (incident.severity || '').toLowerCase();
        const status = (incident.status || '').toLowerCase();
        const type = (incident.type || '').toLowerCase();
        const title = (incident.title || '').toLowerCase();
        const createdBy = String(incident.created_by || '').toLowerCase();

        const matchesSearch = !query || title.includes(query) || type.includes(query) || createdBy.includes(query);
        const matchesSeverity = severityFilter.value === 'all' || severity === severityFilter.value;
        const matchesStatus = statusFilter.value === 'all' || status === statusFilter.value;

        return matchesSearch && matchesSeverity && matchesStatus;
      });
    });

    const detectedCount = computed(() => normalizedIncidents.value.filter((incident) => (incident.status || '').toLowerCase() === 'detected').length);
    const resolvedCount = computed(() => normalizedIncidents.value.filter((incident) => (incident.status || '').toLowerCase() === 'resolved').length);
    const highSeverityCount = computed(() => normalizedIncidents.value.filter((incident) => (incident.severity || '').toLowerCase() === 'high').length);

    const formatDate = (d) => {
      if (!d) return '-';
      const date = new Date(d);
      if (Number.isNaN(date.getTime())) return d;
      return date.toLocaleString();
    };

    const formatStatus = (status) => {
      const normalized = (status || '').toLowerCase();
      if (normalized === 'detected') return t('message.security_incidents.status_detected');
      if (normalized === 'resolved') return t('message.security_incidents.status_resolved');
      return status || '-';
    };

    const typeBadgeClass = (type) => {
      if (!type) return '';
      if (type === 'brute_force_login') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      if (type === 'privilege_escalation') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    };
    const severityBadgeClass = (severity) => {
      if (!severity) return '';
      if (severity === 'high') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      if (severity === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      if (severity === 'low') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    };
    const statusBadgeClass = (status) => {
      if (!status) return '';
      if (status === 'detected') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      if (status === 'resolved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    };

    const openIncident = (incident) => {
      incidentModal.open(incident, 'view');
    };
    const closeIncident = () => {
      incidentModal.close({ reset: true });
    };

    const scrollToTableTop = () => {
      if (tableTopRef.value && typeof tableTopRef.value.scrollIntoView === 'function') {
        const rect = tableTopRef.value.getBoundingClientRect();
        const y = Math.max(0, window.scrollY + rect.top - 100);
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    };

    const goToPage = async (page) => {
      const totalPages = (pagination.value && pagination.value.totalPages) || 1;
      if (page < 1 || page > totalPages) return;
      await loadIncidents(page);
      scrollToTableTop();
    };

    const loadIncidents = async (page = pagination.value?.page || 1, limit = pagination.value?.limit || 20) => {
      await securityStore.fetchIncidents({
        page,
        limit,
        search: useServerFilter.value ? search.value : '',
        severity: useServerFilter.value ? severityFilter.value : 'all',
        status: useServerFilter.value ? statusFilter.value : 'all',
        useServerFilter: useServerFilter.value
      });
    };

    const handlePageSizeChange = async (limit) => {
      const nextLimit = Math.max(1, Number.parseInt(limit, 10) || 20);
      const currentLimit = Math.max(1, Number.parseInt(pagination.value?.limit, 10) || 20);
      if (nextLimit === currentLimit) return;

      await loadIncidents(1, nextLimit);
      scrollToTableTop();
    };

    const refresh = () => loadIncidents(pagination.value?.page || 1);

    watch(search, () => {
      if (!useServerFilter.value) return;
      runDebounced('admin-security-incidents-search', async () => {
        await loadIncidents(1);
      });
    });

    watch([severityFilter, statusFilter], () => {
      if (useServerFilter.value) {
        loadIncidents(1);
      }
    });

    watch(useServerFilter, () => {
      loadIncidents(1);
    });

    watch(() => mainStore.mockApi, (value, oldValue) => {
      if (value !== oldValue) {
        loadIncidents(1);
      }
    });

    onMounted(() => {
      loadIncidents(1);
    });

    return {
      t,
      incidents,
      filteredIncidents,
      loading,
      error,
      pagination,
      search,
      severityFilter,
      statusFilter,
      useServerFilter,
      heroSectionClass,
      searchInputClass,
      serverFilterLabelClass,
      tableRowClass,
      actionsCellClass,
      incidentCellClass,
      severityStatusCellClass,
      whenByCellClass,
      detectedCount,
      resolvedCount,
      highSeverityCount,
      formatDate,
      formatStatus,
      typeBadgeClass,
      severityBadgeClass,
      statusBadgeClass,
      showModal,
      selectedIncident,
      tableTopRef,
      openIncident,
      closeIncident,
      goToPage,
      handlePageSizeChange,
      refresh
    };
  }
};
</script>
