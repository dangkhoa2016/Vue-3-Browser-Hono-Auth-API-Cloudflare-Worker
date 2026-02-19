const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS, DATA_PATHS } from '../api.js';
import { useMainStore } from './mainStore.js';
import { i18n } from '../i18n.js';

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
          const res = await fetch(DATA_PATHS.USERS_LIST, { cache: 'no-store' });
          if (!res.ok) {
            console.log('Failed to load mock users:', res.status, res.statusText);
            
            if (res.status === 404) {
               // Friendly 404 error
               console.error(`Mock data not found at: ${DATA_PATHS.USERS_LIST}`);
               const notFoundText = i18n.global.t('message.errors.not_found');
               // Simplified error message to avoid duplication in UI
               throw new Error(`404 (${notFoundText})`);
            }
            throw new Error(res.statusText || i18n.global.t('message.errors.unknown_error'));
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
          const defaultError = i18n.global.t('message.errors.unknown_error');
          throw new Error(message || defaultError);
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
        this.pagination = {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 1
        };
        this.error = (error && error.message) || 'Unknown error';
      } finally {
        this.loading = false;
      }
    },

    async createUser(userData) {
      // Don't set global loading here to avoid flashing the list
      this.error = null;
      try {
        const response = await apiClient.post(API_ENDPOINTS.USERS, userData);
        if (response.data.success) {
          // Do not fetch users here, let the component decide when to reload
          return { success: true, data: response.data.data, message: response.data.message };
        } else {
          throw new Error(response.data.message || 'Failed to create user');
        }
      } catch (error) {
        // Don't set global error here either, let the component handle it
        throw error;
      }
    },

    async updateUser(userId, userData) {
      // Don't set global loading here
      this.error = null;
      try {
        const response = await apiClient.put(`${API_ENDPOINTS.USERS}/${userId}`, userData);
        if (response.data.success) {
          // Do not fetch users here, let the component decide when to reload
          return { success: true, data: response.data.data, message: response.data.message };
        } else {
          throw new Error(response.data.message || 'Failed to update user');
        }
      } catch (error) {
        throw error;
      }
    },
    
    async updateUserRole(userId, role) {
      // Don't set global loading here
      this.error = null;
      try {
        const response = await apiClient.put(`${API_ENDPOINTS.USERS}/${userId}/role`, { role });
        if (response.data.success) {
          // Do not fetch users here, let the component decide when to reload
          return { success: true, data: response.data.data, message: response.data.message };
        } else {
          throw new Error(response.data.message || 'Failed to update user role');
        }
      } catch (error) {
        throw error;
      }
    },

    async deleteUser(userId) {
      // For delete, we might want to show loading on the list, but let's be consistent
      this.error = null;
      try {
        const response = await apiClient.delete(`${API_ENDPOINTS.USERS}/${userId}`);
        if (response.data.success) {
          // Do not fetch users here, let the component decide when to reload
          return { success: true, message: response.data.message };
        } else {
          throw new Error(response.data.message || 'Failed to delete user');
        }
      } catch (error) {
        throw error;
      }
    }
  }
});
