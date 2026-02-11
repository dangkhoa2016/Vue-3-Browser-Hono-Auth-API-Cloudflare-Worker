<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]">
      <div class="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"></div>
      <div class="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <div>
          <div class="inline-flex items-center gap-2 rounded-full bg-teal-900/10 text-teal-800 dark:bg-teal-400/10 dark:text-teal-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
            <span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            {{ $t('message.admin_users.title') }}
          </div>
          <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            {{ $t('message.admin_users.title') }}
          </h1>
          <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
            {{ $t('message.admin_users.subtitle') }}
          </p>
          <div class="mt-6 flex flex-wrap items-center gap-3">
            <button
              class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition"
              :title="$t('message.common.retry_title')"
              @click="reload"
            >
              <i class="bi bi-arrow-clockwise"></i>
              {{ $t('message.admin_users.reload') }}
            </button>
          </div>
        </div>
        <div class="grid gap-4">
          <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.admin_users.stats_total') }}</p>
            <div class="mt-3 flex items-center justify-between">
              <span class="text-3xl font-black text-slate-900 dark:text-white">{{ pagination.total }}</span>
              <i class="bi bi-people text-2xl text-teal-500"></i>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.admin_users.stats_active') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-2xl font-black text-slate-900 dark:text-white">{{ activeCount }}</span>
                <i class="bi bi-check-circle text-xl text-emerald-500"></i>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.admin_users.stats_inactive') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-2xl font-black text-slate-900 dark:text-white">{{ inactiveCount }}</span>
                <i class="bi bi-x-circle text-xl text-rose-500"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="showLoginRequired" class="bg-teal-50/80 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-3xl p-8 text-center shadow-sm">
      <i class="bi bi-lock-fill text-5xl text-teal-600 dark:text-teal-400 mb-4"></i>
      <h3 class="text-xl font-bold text-teal-900 dark:text-teal-100 mb-2">{{ $t('message.auth.login_required') }}</h3>
      <p class="text-teal-700 dark:text-teal-300 mb-4">{{ $t('message.admin_users.login_required_message') }}</p>
      <button
        @click="openLoginModal"
        class="inline-flex items-center gap-2 px-3 py-1 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
      >
        <i class="bi bi-box-arrow-in-right text-lg"></i>
        {{ $t('message.auth.login') }}
      </button>
    </section>

<<<<<<< HEAD
    <section v-else-if="!isAdmin" class="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-8 text-center shadow-sm">
      <i class="bi bi-shield-lock-fill text-5xl text-amber-600 dark:text-amber-400 mb-4"></i>
      <h3 class="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">{{ $t('message.admin_users.access_denied_title') }}</h3>
      <p class="text-amber-700 dark:text-amber-300">{{ $t('message.admin_users.access_denied_message') }}</p>
    </section>

    <section v-else class="space-y-6">
      <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="relative flex-1 min-w-[220px]">
            <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              v-model="search"
              type="text"
              class="w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              :placeholder="$t('message.admin_users.search_placeholder')"
            />
=======
    <template v-else>
      <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]">
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"></div>
        <div class="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-teal-900/10 text-teal-800 dark:bg-teal-400/10 dark:text-teal-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              {{ $t('message.admin_users.badge') || 'Account Administration' }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.admin_users.title') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.admin_users.subtitle') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <button
                class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition"
                :title="$t('message.common.retry_title')"
                @click="reload"
              >
                <i class="bi bi-arrow-clockwise"></i>
                {{ $t('message.admin_users.reload') }}
              </button>
            </div>
>>>>>>> 6a3c342 (feat: add admin user management page with user listing, filtering, and pagination)
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="roleFilter"
              class="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5"
            >
              <option value="all">{{ $t('message.admin_users.role_all') }}</option>
              <option v-for="role in roleOptions" :key="role" :value="role">{{ role.toUpperCase() }}</option>
            </select>
            <select
              v-model="statusFilter"
              class="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5"
            >
              <option value="all">{{ $t('message.admin_users.status_all') }}</option>
              <option value="active">{{ $t('message.admin_users.status_active') }}</option>
              <option value="inactive">{{ $t('message.admin_users.status_inactive') }}</option>
            </select>
            <label class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200">
              <input
                v-model="useServerFilter"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>{{ useServerFilter ? 'Server filtering' : 'Client filtering' }}</span>
            </label>
          </div>
        </div>
        <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ $t('message.admin_users.page') }} {{ pagination.page }} {{ $t('message.admin_users.of') }} {{ pagination.totalPages }}
          </p>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-200 disabled:opacity-50"
              :disabled="pagination.page <= 1"
              @click="prevPage"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
            <button
              class="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-200 disabled:opacity-50"
              :disabled="pagination.page >= pagination.totalPages"
              @click="nextPage"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('message.admin_users.table_title') }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('message.admin_users.table_subtitle') }}</p>
          </div>
        </div>

        <div v-if="loading" class="p-6 space-y-4 animate-pulse">
          <div v-for="row in 6" :key="row" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
        </div>

        <div v-else-if="error" class="p-8 text-center">
          <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.errors.failed_to_load', { item: $t('message.admin_users.title'), message: error }) }}</h3>
          <button
            class="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 text-white px-4 py-2 text-sm font-semibold"
            @click="reload"
          >
            <i class="bi bi-arrow-clockwise"></i>
            {{ $t('message.common.retry') }}
          </button>
        </div>

        <div v-else-if="filteredUsers.length === 0" class="p-10 text-center">
          <i class="bi bi-emoji-neutral text-4xl text-slate-400 mb-3"></i>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.admin_users.empty_title') }}</h3>
          <p class="text-slate-500 dark:text-slate-400">{{ $t('message.admin_users.empty_message') }}</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="max-[992px]:mt-4 mt-0 min-w-full text-sm max-[992px]:block">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider max-[992px]:hidden">
              <tr>
                <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_id') }}</th>
                <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_full_name') }}</th>
                <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_email') }}</th>
                <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_role') }}</th>
                <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_status') }}</th>
                <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_created_at') }}</th>
                <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_updated_at') }}</th>
              </tr>
            </thead>
            <tbody class="max-[992px]:block max-[992px]:px-4">
              <tr
                v-for="userItem in filteredUsers"
                :key="userItem.id"
                class="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition max-[992px]:block max-[992px]:border max-[992px]:border-slate-200/70 dark:max-[992px]:border-slate-700 max-[992px]:rounded-2xl max-[992px]:p-1 max-[992px]:mb-4 max-[992px]:bg-white/90 dark:max-[992px]:bg-slate-900/80"
              >
                <td class="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3" :data-label="$t('message.admin_users.column_id')">#{{ userItem.id }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-slate-800 dark:text-slate-100 max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3" :data-label="$t('message.admin_users.column_full_name')">
                  <div class="font-semibold">{{ userItem.full_name }}</div>
                </td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-300 max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3" :data-label="$t('message.admin_users.column_email')">{{ userItem.email }}</td>
                <td class="px-6 py-4 max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3" :data-label="$t('message.admin_users.column_role')">
                  <span :class="roleBadgeClass(userItem.role)">{{ formatRole(userItem.role) }}</span>
                </td>
                <td class="whitespace-nowrap px-6 py-4 max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3" :data-label="$t('message.admin_users.column_status')">
                  <span :class="statusBadgeClass(userItem.status)">{{ formatStatus(userItem.status) }}</span>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-300 max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3" :data-label="$t('message.admin_users.column_created_at')">{{ formatDate(userItem.created_at) }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-300 max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3" :data-label="$t('message.admin_users.column_updated_at')">{{ formatDate(userItem.updated_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useUserStore } from '/assets/js/stores/userStore.js';

export default {
  name: 'AdminUsers',
  setup() {
    const { t } = useI18n({ useScope: 'global' });
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const userStore = useUserStore();

    authStore.init();

    const showLoginRequired = ref(false);
    const search = ref('');
    const roleFilter = ref('all');
    const statusFilter = ref('all');
    const useServerFilter = ref(true);

    const isAdmin = computed(() => {
      const role = authStore.user?.role?.toLowerCase();
      return role === 'admin' || role === 'super_admin';
    });

    const loading = computed(() => userStore.loading);
    const error = computed(() => userStore.error);
    const users = computed(() => userStore.users);
    const pagination = computed(() => userStore.pagination);

    const roleOptions = ['super_admin', 'admin', 'user'];

    const filteredUsers = computed(() => {
      const searchValue = search.value.trim().toLowerCase();
      return users.value.filter((userItem) => {
        const matchesSearch = !searchValue ||
          (userItem.full_name && userItem.full_name.toLowerCase().includes(searchValue)) ||
          (userItem.email && userItem.email.toLowerCase().includes(searchValue));
        const matchesRole = roleFilter.value === 'all' || userItem.role === roleFilter.value;
        const matchesStatus = statusFilter.value === 'all' || userItem.status === statusFilter.value;
        return matchesSearch && matchesRole && matchesStatus;
      });
    });

    const activeCount = computed(() => filteredUsers.value.filter(userItem => userItem.status === 'active').length);
    const inactiveCount = computed(() => filteredUsers.value.filter(userItem => userItem.status === 'inactive').length);

    const openLoginModal = () => {
      modalStore.openLogin(
        async () => {
          sessionStorage.removeItem('authRequired');
          sessionStorage.removeItem('intendedRoute');
          showLoginRequired.value = false;
          await loadUsers();
        },
        () => {
          if (!authStore.isAuthenticated) {
            showLoginRequired.value = true;
          }
        }
      );
    };

    const checkAuthAndLoad = async () => {
      if (!authStore.isAuthenticated) {
        showLoginRequired.value = true;
        const authRequired = sessionStorage.getItem('authRequired') === 'true';
        if (authRequired) {
          openLoginModal();
        }
        return;
      }

      showLoginRequired.value = false;
      await loadUsers(1);
    };

    const loadUsers = async (page = pagination.value.page) => {
      if (!authStore.isAuthenticated) {
        return;
      }

      const searchValue = useServerFilter.value ? search.value.trim() : '';
      const roleValue = useServerFilter.value ? roleFilter.value : 'all';
      const statusValue = useServerFilter.value ? statusFilter.value : 'all';

      await userStore.fetchUsers({
        page,
        limit: pagination.value.limit,
        search: searchValue,
        role: roleValue,
        status: statusValue,
        useServerFilter: useServerFilter.value
      });
    };

    const reload = async () => {
      await loadUsers();
    };

    const nextPage = async () => {
      if (pagination.value.page < pagination.value.totalPages) {
        await loadUsers(pagination.value.page + 1);
      }
    };

    const prevPage = async () => {
      if (pagination.value.page > 1) {
        await loadUsers(pagination.value.page - 1);
      }
    };

    const formatDate = (value) => {
      if (!value) return '-';
      const normalized = value.replace(' ', 'T');
      const date = new Date(normalized);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString();
    };

    const formatRole = (role) => {
      if (!role) return '-';
      return role.replace('_', ' ').toUpperCase();
    };

    const formatStatus = (status) => {
      if (!status) return '-';
      return status.toLowerCase() === 'active'
        ? t('message.admin_users.status_active')
        : t('message.admin_users.status_inactive');
    };

    const roleBadgeClass = (role) => {
      const normalized = (role || '').toLowerCase();
      if (normalized === 'super_admin') {
        return 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      }
      if (normalized === 'admin') {
        return 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
      }
      return 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    };

    const statusBadgeClass = (status) => {
      const normalized = (status || '').toLowerCase();
      if (normalized === 'active') {
        return 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      }
      return 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    };

    let searchTimer = null;

    watch(search, () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
      searchTimer = setTimeout(() => {
        if (useServerFilter.value) {
          loadUsers(1);
        }
      }, 400);
    });

    watch([roleFilter, statusFilter], () => {
      if (useServerFilter.value) {
        loadUsers(1);
      }
    });

    watch(useServerFilter, () => {
      if (useServerFilter.value) {
        loadUsers(1);
      }
    });

    onMounted(checkAuthAndLoad);

    return {
      showLoginRequired,
      isAdmin,
      loading,
      error,
      search,
      roleFilter,
      statusFilter,
      useServerFilter,
      roleOptions,
      users,
      filteredUsers,
      pagination,
      activeCount,
      inactiveCount,
      openLoginModal,
      reload,
      nextPage,
      prevPage,
      formatDate,
      formatRole,
      formatStatus,
      roleBadgeClass,
      statusBadgeClass
    };
  }
};
</script>
