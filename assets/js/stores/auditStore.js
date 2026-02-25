const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS, DATA_PATHS } from '../api.js';
import { useMainStore } from './mainStore.js';
import { i18n } from '../i18n.js';

export const useAuditStore = defineStore('audit', {
  state: () => ({
    logs: [],
    stats: null,
    loading: false,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    filters: { search: '', action: '', actorId: '', targetType: '', actorRole: '', startDate: '', endDate: '', page: 1, limit: 20 },
    error: null,
    lastUpdated: null
  }),

  actions: {
    async fetchLogs() {
      this.loading = true;
      this.error = null;
      try {
        const mainStore = useMainStore();
        let responseData;

        const params = {
          query: this.filters.search || undefined,
          action: this.filters.action || undefined,
          userId: this.filters.actorId || undefined,
          entityType: this.filters.targetType || undefined,
          actorRole: this.filters.actorRole || undefined,
          startDate: this.filters.startDate || undefined,
          endDate: this.filters.endDate || undefined,
          page: Number(this.filters.page) || 1,
          limit: Number(this.filters.limit) || 20
        };

        if (mainStore.mockApi) {
          const res = await fetch(DATA_PATHS.AUDIT_LOGS_SUCCESS, { cache: 'no-store' });
          if (!res.ok) {
            if (res.status === 404) {
              const notFoundText = i18n.global.t('message.errors.not_found');
              throw new Error(`404 (${notFoundText})`);
            }
            throw new Error(res.statusText || i18n.global.t('message.errors.unknown_error'));
          }
          responseData = await res.json();
        } else {
          const response = await apiClient.get(API_ENDPOINTS.AUDIT_LOGS, { params });
          responseData = response.data;
        }

        if (!responseData || !responseData.success) {
          const message = responseData && (responseData.error || responseData.message);
          const defaultError = i18n.global.t('message.errors.unknown_error');
          throw new Error(message || defaultError);
        }

        const payload = responseData.data || {};
        const baseLogs = Array.isArray(payload.logs) ? payload.logs : (Array.isArray(payload.items) ? payload.items : []);
        let logs = baseLogs;
        let pagination = payload.pagination || {};

        if (mainStore.mockApi) {
          const normalizedSearch = String(this.filters.search || '').trim().toLowerCase();
          const normalizedAction = String(this.filters.action || '').toLowerCase();
          const normalizedTargetType = String(this.filters.targetType || '').toLowerCase();
          const normalizedActorRole = String(this.filters.actorRole || '').toLowerCase();

          logs = baseLogs.filter((log) => {
            const logAction = String(log?.action || '').toLowerCase();
            const logTargetType = String(log?.target_type || log?.resource || log?.target || '').toLowerCase();
            const logActorRole = String(log?.actor_role || '').toLowerCase();
            const logActorName = String(log?.actor_name || '').toLowerCase();
            const logActorEmail = String(log?.actor_email || log?.user_email || '').toLowerCase();

            const matchesSearch = !normalizedSearch ||
              logAction.includes(normalizedSearch) ||
              logTargetType.includes(normalizedSearch) ||
              logActorName.includes(normalizedSearch) ||
              logActorEmail.includes(normalizedSearch);
            const matchesAction = !normalizedAction || logAction === normalizedAction;
            const matchesTargetType = !normalizedTargetType || logTargetType === normalizedTargetType;
            const matchesActorRole = !normalizedActorRole || logActorRole === normalizedActorRole;

            return matchesSearch && matchesAction && matchesTargetType && matchesActorRole;
          });

          const total = logs.length;
          const safeLimit = typeof params.limit === 'number' && params.limit > 0 ? params.limit : 20;
          const totalPages = Math.max(1, Math.ceil(total / safeLimit));
          const safePage = Math.min(Math.max(params.page, 1), totalPages);
          const startIndex = (safePage - 1) * safeLimit;
          const endIndex = startIndex + safeLimit;

          this.logs = logs.slice(startIndex, endIndex);
          this.pagination = {
            total,
            page: safePage,
            limit: safeLimit,
            totalPages
          };
        } else {
          this.logs = logs;
          const total = typeof pagination.total === 'number' ? pagination.total : this.logs.length;
          const pageValue = typeof pagination.page === 'number' ? pagination.page : params.page;
          const limitValue = typeof pagination.limit === 'number' ? pagination.limit : params.limit;
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

        this.filters.page = this.pagination.page;
        this.filters.limit = this.pagination.limit;
        this.lastUpdated = new Date().toISOString();
      } catch (err) {
        this.logs = [];
        this.error = (err && err.message) || 'Unknown error';
        console.error('[AuditStore] fetchLogs failed', err);
      } finally {
        this.loading = false;
      }
    },

    async fetchStats(timeRange) {
      try {
        const safeTimeRange = String(timeRange || '7d').trim() || '7d';
        const res = await apiClient.get(API_ENDPOINTS.AUDIT_STATS, { params: { timeRange: safeTimeRange } });
        if (res && res.data) {
          const payload = res.data.data || res.data;
          this.stats = payload;
          return this.stats;
        }
      } catch (err) {
        console.warn('[AuditStore] fetchStats failed', err);
      }
      return null;
    },

    async export(format = 'csv') {
      try {
        const mainStore = useMainStore();
        if (mainStore.mockApi) {
          console.log('[AuditStore] Mock export triggered');
          return;
        }

        const params = {
          format,
          query: this.filters.search || undefined,
          action: this.filters.action || undefined,
          userId: this.filters.actorId || undefined,
          entityType: this.filters.targetType || undefined,
          actorRole: this.filters.actorRole || undefined,
          startDate: this.filters.startDate || undefined,
          endDate: this.filters.endDate || undefined
        };

        const res = await apiClient.get(API_ENDPOINTS.AUDIT_EXPORT, { params, responseType: 'blob' });
        const blob = new Blob([res.data], { type: res.headers['content-type'] || 'text/csv' });
        const filename = res.headers['content-disposition'] ? res.headers['content-disposition'].split('filename=')[1] : `audit_export.${format}`;
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.replace(/"/g, '');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        console.error('[AuditStore] export failed', err);
        throw err;
      }
    },

    async reload() {
      await this.fetchLogs();
    },

    async setFilters(newFilters = {}) {
      Object.assign(this.filters, newFilters);
      await this.fetchLogs();
    }
  }
});
