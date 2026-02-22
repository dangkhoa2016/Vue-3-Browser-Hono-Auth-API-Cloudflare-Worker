const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS, DATA_PATHS } from '../api.js';
import { useMainStore } from './mainStore.js';
import { i18n } from '../i18n.js';

export const useSecurityIncidentStore = defineStore('securityIncidents', {
  state: () => ({
    incidents: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 1
    },
    loading: false,
    error: null,
    lastUpdated: null
  }),

  actions: {
    async fetchIncidents({
      page = 1,
      limit = 50,
      search = '',
      severity = 'all',
      status = 'all',
      useServerFilter = false
    } = {}) {
      this.loading = true;
      this.error = null;
      try {
        const mainStore = useMainStore();
        let responseData;
        const params = { page, limit };
        if (useServerFilter) {
          const searchValue = String(search || '').trim();
          if (searchValue) {
            params.search = searchValue;
          }
          if (severity && severity !== 'all') {
            params.severity = severity;
          }
          if (status && status !== 'all') {
            params.status = status;
          }
        }
        if (mainStore.mockApi) {
          const res = await fetch(DATA_PATHS.SECURITY_INCIDENTS, { cache: 'no-store' });
          if (!res.ok) {
            if (res.status === 404) {
              const notFoundText = i18n.global.t('message.errors.not_found');
              throw new Error(`404 (${notFoundText})`);
            }
            throw new Error(res.statusText || i18n.global.t('message.errors.unknown_error'));
          }
          responseData = await res.json();
        } else {
          const response = await apiClient.get(API_ENDPOINTS.SECURITY_INCIDENTS, { params });
          responseData = response.data;
        }

        if (!responseData || !responseData.success) {
          const message = responseData && (responseData.error || responseData.message);
          const defaultError = i18n.global.t('message.errors.unknown_error');
          throw new Error(message || defaultError);
        }

        const payload = responseData.data || {};
        const baseIncidents = Array.isArray(payload.incidents) ? payload.incidents : [];
        let incidents = baseIncidents;
        let pagination = payload.pagination || {};

        if (mainStore.mockApi && useServerFilter) {
          const normalizedSearch = String(search || '').trim().toLowerCase();
          const normalizedSeverity = String(severity || 'all').toLowerCase();
          const normalizedStatus = String(status || 'all').toLowerCase();

          incidents = baseIncidents.filter((incident) => {
            const incidentSeverity = String(incident?.severity || '').toLowerCase();
            const incidentStatus = String(incident?.status || '').toLowerCase();
            const incidentType = String(incident?.type || '').toLowerCase();
            const incidentTitle = String(incident?.title || '').toLowerCase();
            const incidentCreator = String(incident?.created_by || '').toLowerCase();

            const matchesSearch = !normalizedSearch ||
              incidentTitle.includes(normalizedSearch) ||
              incidentType.includes(normalizedSearch) ||
              incidentCreator.includes(normalizedSearch);
            const matchesSeverity = normalizedSeverity === 'all' || incidentSeverity === normalizedSeverity;
            const matchesStatus = normalizedStatus === 'all' || incidentStatus === normalizedStatus;

            return matchesSearch && matchesSeverity && matchesStatus;
          });
        }

        // Pagination logic for mock
        if (mainStore.mockApi) {
          const total = incidents.length;
          const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;
          const totalPages = Math.max(1, Math.ceil(total / safeLimit));
          const safePage = Math.min(Math.max(page, 1), totalPages);
          const startIndex = (safePage - 1) * safeLimit;
          const endIndex = startIndex + safeLimit;

          this.incidents = incidents.slice(startIndex, endIndex);
          this.pagination = {
            total,
            page: safePage,
            limit: safeLimit,
            totalPages
          };
        } else {
          this.incidents = incidents;
          const total = typeof pagination.total === 'number' ? pagination.total : this.incidents.length;
          const pageValue = typeof pagination.page === 'number' ? pagination.page : page;
          const limitValue = typeof pagination.limit === 'number' ? pagination.limit : limit;
          const totalPages = typeof pagination.totalPages === 'number'
            ? pagination.totalPages
            : Math.max(1, Math.ceil(total / limitValue));

          this.pagination = {
            total,
            page: pageValue,
            limit: limitValue,
            totalPages
          };
        }
        this.lastUpdated = new Date().toISOString();
      } catch (error) {
        this.incidents = [];
        this.error = (error && error.message) || 'Unknown error';
      } finally {
        this.loading = false;
      }
    },

    async reload() {
      await this.fetchIncidents({ page: this.pagination.page, limit: this.pagination.limit });
    }
  }
});
