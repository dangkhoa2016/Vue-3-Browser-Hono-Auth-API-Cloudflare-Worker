const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';
import { useMainStore } from './mainStore.js';

const MOCK_USERS_PATH = '/assets/data/users/succeed/super-admin+users.json';

export const useUserStore = defineStore('users', {
  state: () => ({
    users: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1
    },
    loading: false,
    error: null,
    lastUpdated: null
  }),

  actions: {
    async fetchUsers({ page = 1, limit = 10, search = '', role = 'all', status = 'all', useServerFilter = true } = {}) {
      this.loading = true;
      this.error = null;

      try {
        const mainStore = useMainStore();
        let responseData;

        const params = { page, limit };
        if (search) {
          params.search = search;
        }
        if (role && role !== 'all') {
          params.role = role;
        }
        if (status && status !== 'all') {
          params.status = status;
        }

        if (mainStore.mockApi) {
          const res = await fetch(MOCK_USERS_PATH, { cache: 'no-store' });
          if (!res.ok) {
            throw new Error(res.statusText || 'Failed to load users');
          }
          responseData = await res.json();
        } else {
          const response = await apiClient.get(API_ENDPOINTS.USERS, {
            params
          });
          responseData = response.data;
        }

        if (!responseData || !responseData.success) {
          const message = responseData && (responseData.error || responseData.message);
          throw new Error(message || 'Failed to load users');
        }

        const payload = responseData.data || {};
        const baseUsers = Array.isArray(payload.users) ? payload.users : [];
        let users = baseUsers;
        let pagination = payload.pagination || {};

        if (mainStore.mockApi) {
          const searchValue = search.trim().toLowerCase();
          const isFiltered = searchValue || (role && role !== 'all') || (status && status !== 'all');
          const hasPagination = typeof pagination.total === 'number';

          users = baseUsers.filter((userItem) => {
            const matchesSearch = !searchValue ||
              (userItem.full_name && userItem.full_name.toLowerCase().includes(searchValue)) ||
              (userItem.email && userItem.email.toLowerCase().includes(searchValue));
            const matchesRole = !role || role === 'all' || userItem.role === role;
            const matchesStatus = !status || status === 'all' || userItem.status === status;
            return matchesSearch && matchesRole && matchesStatus;
          });

          if (useServerFilter && !isFiltered && hasPagination) {
            const total = pagination.total;
            const pageValue = typeof pagination.page === 'number' ? pagination.page : page;
            const limitValue = typeof pagination.limit === 'number' ? pagination.limit : limit;
            const totalPages = typeof pagination.totalPages === 'number'
              ? pagination.totalPages
              : Math.max(1, Math.ceil(total / limitValue));

            this.users = baseUsers;
            this.pagination = {
              total,
              page: pageValue,
              limit: limitValue,
              totalPages
            };
          } else {
            const total = users.length;
            const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 10;
            const totalPages = Math.max(1, Math.ceil(total / safeLimit));
            const safePage = Math.min(Math.max(page, 1), totalPages);
            const startIndex = (safePage - 1) * safeLimit;
            const endIndex = startIndex + safeLimit;

            this.users = users.slice(startIndex, endIndex);
            this.pagination = {
              total,
              page: safePage,
              limit: safeLimit,
              totalPages
            };
          }
        } else {
          this.users = users;
        }
        if (!mainStore.mockApi) {
          const total = typeof pagination.total === 'number' ? pagination.total : this.users.length;
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
        this.users = [];
        this.error = (error && error.message) || 'Unknown error';
      } finally {
        this.loading = false;
      }
    }
  }
});
