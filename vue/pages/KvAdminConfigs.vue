<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <template v-if="showLoginRequired">
      <section class="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-lock-fill text-5xl text-amber-600 dark:text-amber-400 mb-4"></i>
        <h3 class="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">{{ $t('message.auth.login_required') }}</h3>
        <p class="text-amber-700 dark:text-amber-300 mb-4">{{ $t('message.kv_admin_page.login_required_message') }}</p>
        <button
          @click="openLoginModal"
          class="inline-flex items-center gap-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
        >
          <i class="bi bi-box-arrow-in-right text-lg"></i>
          {{ $t('message.auth.login') }}
        </button>
      </section>
    </template>

    <template v-else>
      <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]">
        <div class="absolute -top-20 -right-16 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div class="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-amber-900/10 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              {{ $t('message.navbar.kv_admin') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.kv_admin_page.title') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.kv_admin_page.subtitle') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <button
                class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition"
                :title="$t('message.common.retry_title')"
                @click="reload"
              >
                <i class="bi bi-arrow-clockwise"></i>
                {{ $t('message.kv_admin_page.reload') }}
              </button>
            </div>
          </div>
          <div class="grid gap-4">
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.kv_admin_page.stats_total') }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-3xl font-black text-slate-900 dark:text-white">{{ stats.total }}</span>
                <i class="bi bi-hdd-network text-2xl text-amber-500"></i>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.kv_admin_page.stats_overrides') }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-2xl font-black text-slate-900 dark:text-white">{{ stats.overrides }}</span>
                  <i class="bi bi-toggle-on text-xl text-emerald-500"></i>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.kv_admin_page.stats_allowed') }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-2xl font-black text-slate-900 dark:text-white">{{ stats.allowed }}</span>
                  <i class="bi bi-shield-check text-xl text-teal-500"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="!isSuperAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.kv_admin_page.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.kv_admin_page.access_denied_message') }}</p>
      </section>

      <section v-else class="space-y-6">
        <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mt-4">
            <div class="relative flex-1 min-w-[220px]">
              <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                v-model="search"
                ref="searchInput"
                type="text"
                class="w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                :placeholder="$t('message.kv_admin_page.search_placeholder')"
              />
              <button
                v-if="search"
                type="button"
                @click="search = ''; $refs.searchInput && $refs.searchInput.focus()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-1 rounded-full"
                :title="$t('message.common.clear') || 'Clear'"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <label class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200">
                <input
                  v-model="showOverridesOnly"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>{{ $t('message.kv_admin_page.show_overrides_only') }}</span>
              </label>
              <div class="text-xs text-slate-500 dark:text-slate-400">
                {{ $t('message.kv_admin_page.last_updated') }}: {{ lastUpdatedLabel }}
              </div>
              <button
                class="inline-flex items-center gap-2 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-sm"
                @click="openAddModal"
              >
                <i class="bi bi-plus-circle"></i>
                {{ $t('message.kv_admin_page.add_key') }}
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('message.kv_admin_page.table_title') }}</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('message.kv_admin_page.table_subtitle') }}</p>
            </div>
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {{ filteredRows.length }} / {{ rows.length }}
            </span>
          </div>

          <div v-if="loading" class="p-6 space-y-4 animate-pulse">
            <div v-for="row in 6" :key="row" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
          </div>

          <div v-else-if="error" class="p-8 text-center">
            <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-3"></i>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.kv_admin_page.error_loading') }}</h3>
            <p class="text-slate-500 dark:text-slate-400 mt-2">{{ error }}</p>
            <button
              class="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 text-white px-4 py-2 text-sm font-semibold"
              @click="reload"
            >
              <i class="bi bi-arrow-clockwise"></i>
              {{ $t('message.common.retry') }}
            </button>
          </div>

          <div v-else-if="filteredRows.length === 0" class="p-10 text-center">
            <i class="bi bi-emoji-neutral text-4xl text-slate-400 mb-3"></i>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.kv_admin_page.empty_title') }}</h3>
            <p class="text-slate-500 dark:text-slate-400">{{ $t('message.kv_admin_page.empty_message') }}</p>
          </div>

          <div v-else class="px-6 pb-8 pt-6 space-y-5">
            <article
              v-for="row in filteredRows"
              :key="row.key"
              class="group rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5"
            >
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="space-y-2">
                  <div class="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    {{ $t('message.kv_admin_page.column_key') }}
                  </div>
                  <div class="font-mono text-sm text-slate-900 dark:text-slate-100 break-all">
                    {{ row.key }}
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="sourceBadgeClass(row.source)">{{ sourceLabel(row.source) }}</span>
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    :title="$t('message.kv_admin_page.copy_key')"
                    @click="copyText('key', row.key, row.key)"
                  >
                    <i class="bi bi-clipboard"></i>
                    {{ copiedKey === row.key ? $t('message.kv_admin_page.copied') : $t('message.kv_admin_page.copy_key') }}
                  </button>
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    :title="$t('message.kv_admin_page.copy_value')"
                    @click="copyText('value', row.key, row.valueLabel)"
                  >
                    <i class="bi bi-clipboard-check"></i>
                    {{ copiedValue === row.key ? $t('message.kv_admin_page.copied') : $t('message.kv_admin_page.copy_value') }}
                  </button>
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    :title="$t('message.kv_admin_page.edit_action')"
                    @click="openEditModal(row)"
                  >
                    <i class="bi bi-pencil"></i>
                    {{ $t('message.kv_admin_page.edit_action') }}
                  </button>
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-rose-200 dark:border-rose-700 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                    :title="$t('message.kv_admin_page.delete_action')"
                    @click="openDeleteModal(row)"
                  >
                    <i class="bi bi-trash"></i>
                    {{ $t('message.kv_admin_page.delete_action') }}
                  </button>
                </div>
              </div>

              <div class="mt-5 grid gap-4 lg:grid-cols-2">
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-4">
                  <div class="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-3">
                    {{ $t('message.kv_admin_page.column_value') }}
                  </div>
                  <div
                    class="font-mono text-[12px] leading-relaxed text-slate-900 dark:text-slate-100 break-words whitespace-pre-wrap"
                  >
                    {{ row.valueLabel }}
                  </div>
                </div>
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-4">
                  <div class="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-3">
                    {{ $t('message.kv_admin_page.column_default') }}
                  </div>
                  <div
                    class="font-mono text-[12px] leading-relaxed text-slate-700 dark:text-slate-200 break-words whitespace-pre-wrap"
                  >
                    {{ row.defaultLabel }}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </template>

    <transition name="fade" mode="out-in">
      <div v-if="editorOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
        <div class="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xl p-6">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-xl font-bold text-slate-900 dark:text-white">
              {{ editorMode === 'add' ? $t('message.kv_admin_page.add_title') : $t('message.kv_admin_page.edit_title') }}
            </h3>
            <button class="text-slate-400 hover:text-slate-600" @click="closeEditor">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="mt-6 space-y-4">
            <div>
              <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.key_label') }}</label>
              <input
                v-model="editorKey"
                :disabled="editorMode === 'edit'"
                class="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-60"
                placeholder="SECURITY_CSP"
              />
            </div>
            <div>
              <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.value_label') }}</label>
              <textarea
                v-model="editorValue"
                rows="6"
                class="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                placeholder="Enter value"
              ></textarea>
            </div>
            <p v-if="editorError" class="kv-error-message">{{ editorError }}</p>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-3">
            <button
              class="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-200"
              @click="closeEditor"
            >
              {{ $t('message.kv_admin_page.cancel') }}
            </button>
            <button
              class="inline-flex items-center gap-2 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white px-4 py-2 text-sm font-semibold"
              :disabled="isSaving"
              @click="saveConfig"
            >
              <i class="bi bi-check-lg"></i>
              {{ $t('message.kv_admin_page.save') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

      <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('message.kv_admin_page.table_title') }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('message.kv_admin_page.table_subtitle') }}</p>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';

export default {
  name: 'KvAdminConfigs',
  setup() {
    const { t } = useI18n({ useScope: 'global' });
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const mainStore = useMainStore();

    const showLoginRequired = ref(false);
    const loading = ref(false);
    const error = ref(null);
    const search = ref('');
    const showOverridesOnly = ref(false);
    const rows = ref([]);
    const allowedCount = ref(0);
    const lastUpdated = ref(null);
    const copiedKey = ref(null);
    const copiedValue = ref(null);
    const editorOpen = ref(false);
    const editorMode = ref('add');
    const editorKey = ref('');
    const editorValue = ref('');
    const editorError = ref('');
    const isSaving = ref(false);
    const deleteOpen = ref(false);
    const deleteKey = ref('');
    const deleteError = ref('');
    const isDeleting = ref(false);
    const toastStore = useToastStore();

    authStore.init();

    const isSuperAdmin = computed(() => authStore.user?.role?.toLowerCase() === 'super_admin');

    const stats = computed(() => {
      const total = rows.value.length;
      const overrides = rows.value.filter((row) => row.source === 'kv' && row.isOverride).length;
      const allowed = allowedCount.value || rows.value.length;
      return { total, overrides, allowed };
    });

    const filteredRows = computed(() => {
      const term = search.value.trim().toLowerCase();
      return rows.value.filter((row) => {
        if (showOverridesOnly.value && !(row.source === 'kv' && row.isOverride)) {
          return false;
        }
        if (!term) return true;
        return row.key.toLowerCase().includes(term) ||
          row.valueLabel.toLowerCase().includes(term) ||
          row.defaultLabel.toLowerCase().includes(term);
      });
    });

    const lastUpdatedLabel = computed(() => {
      if (!lastUpdated.value) return '-';
      const date = new Date(lastUpdated.value);
      return Number.isNaN(date.getTime()) ? lastUpdated.value : date.toLocaleString();
    });

    const openLoginModal = () => {
      modalStore.openLogin(
        async () => {
          sessionStorage.removeItem('authRequired');
          sessionStorage.removeItem('intendedRoute');
          showLoginRequired.value = false;
          await loadConfigs();
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
        rows.value = [];
        allowedCount.value = 0;
        const authRequired = sessionStorage.getItem('authRequired') === 'true';
        if (authRequired) {
          openLoginModal();
        }
        return;
      }

      showLoginRequired.value = false;
      await loadConfigs();
    };

    const buildRows = ({ configs = {}, defaults = {}, allowedKeys = [] } = {}) => {
      const configKeys = Object.keys(configs || {});
      const defaultKeys = Object.keys(defaults || {});
      const baseKeys = allowedKeys && allowedKeys.length
        ? allowedKeys
        : Array.from(new Set([...configKeys, ...defaultKeys])).sort();

      allowedCount.value = baseKeys.length;

      rows.value = baseKeys.map((key) => {
        const hasOverride = Object.prototype.hasOwnProperty.call(configs, key);
        const value = hasOverride ? configs[key] : defaults[key];
        const defaultValue = defaults[key];
        const valueLabel = formatValue(value);
        const defaultLabel = formatValue(defaultValue);
        const isOverride = hasOverride && valueLabel !== defaultLabel;

        return {
          key,
          value,
          defaultValue,
          valueLabel,
          defaultLabel,
          source: hasOverride ? 'kv' : (defaultValue !== undefined ? 'default' : 'unknown'),
          isOverride
        };
      });
    };

    const loadConfigs = async () => {
      if (!authStore.isAuthenticated || !isSuperAdmin.value) {
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        let payload;

        if (mainStore.mockApi) {
          const res = await fetch('/assets/data/kv-admin/configs.json', { cache: 'no-store' });
          if (!res.ok) {
            throw new Error(res.statusText || 'Failed to load KV configs');
          }
          payload = await res.json();
        } else {
          const response = await apiClient.get(API_ENDPOINTS.KV_ADMIN_CONFIGS, {
            headers: {
              Authorization: `Bearer ${authStore.token}`
            }
          });
          payload = response.data;
        }

        if (!payload || payload.success === false) {
          const message = payload && (payload.error || payload.message);
          throw new Error(message || 'Failed to load KV configs');
        }

        const data = payload.data || payload;
        buildRows({
          configs: data.configs || {},
          defaults: data.defaults || {},
          allowedKeys: Array.isArray(data.allowedKeys) ? data.allowedKeys : []
        });
        lastUpdated.value = new Date().toISOString();
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          authStore.logout();
          showLoginRequired.value = true;
        }
        error.value = (err && err.message) || t('message.kv_admin_page.error_loading');
      } finally {
        loading.value = false;
      }
    };

    const reload = async () => {
      await loadConfigs();
    };

    const formatValue = (value) => {
      if (value === undefined) return '-';
      if (value === null) return 'null';
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      try {
        return JSON.stringify(value);
      } catch (error) {
        return String(value);
      }
    };

    const formatValueForEdit = (value) => {
      if (value === undefined) return '';
      if (value === null) return 'null';
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      try {
        return JSON.stringify(value, null, 2);
      } catch (error) {
        return String(value);
      }
    };

    const sourceLabel = (source) => {
      if (source === 'kv') return t('message.kv_admin_page.source_kv');
      if (source === 'default') return t('message.kv_admin_page.source_default');
      return t('message.kv_admin_page.source_unknown');
    };

    const sourceBadgeClass = (source) => {
      if (source === 'kv') {
        return 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      }
      if (source === 'default') {
        return 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
      }
      return 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    };

    const openAddModal = () => {
      editorMode.value = 'add';
      editorKey.value = '';
      editorValue.value = '';
      editorError.value = '';
      editorOpen.value = true;
    };

    const openEditModal = (row) => {
      editorMode.value = 'edit';
      editorKey.value = row.key;
      editorValue.value = formatValueForEdit(row.value);
      editorError.value = '';
      editorOpen.value = true;
    };

    const closeEditor = () => {
      editorOpen.value = false;
      editorError.value = '';
    };

    const openDeleteModal = (row) => {
      deleteKey.value = row.key;
      deleteError.value = '';
      deleteOpen.value = true;
    };

    const closeDelete = () => {
      deleteOpen.value = false;
      deleteError.value = '';
    };

    const parseInputValue = (value) => {
      const trimmed = String(value).trim();
      if (trimmed === '') return '';
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      if (trimmed === 'null') return null;
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed);
        } catch (error) {
          return trimmed;
        }
      }
      return trimmed;
    };

    const showToast = (message, type = 'info', title = null) => {
      if (!toastStore) return;
      toastStore.add(message, type, 7500, title);
    };

    const applyLocalUpsert = (key, value) => {
      const existingIndex = rows.value.findIndex((row) => row.key === key);
      const defaultValue = existingIndex >= 0 ? rows.value[existingIndex].defaultValue : undefined;
      const valueLabel = formatValue(value);
      const defaultLabel = formatValue(defaultValue);
      const isOverride = valueLabel !== defaultLabel;
      const nextRow = {
        key,
        value,
        defaultValue,
        valueLabel,
        defaultLabel,
        source: 'kv',
        isOverride
      };

      if (existingIndex >= 0) {
        const next = [...rows.value];
        next[existingIndex] = nextRow;
        rows.value = next;
      } else {
        rows.value = [nextRow, ...rows.value];
        allowedCount.value += 1;
      }
    };

    const saveConfig = async () => {
      editorError.value = '';
      const key = editorKey.value.trim();
      if (!key) {
        editorError.value = t('message.kv_admin_page.validation_error');
        showToast(editorError.value, 'error');
        return;
      }

      if (editorMode.value === 'add' && rows.value.some((row) => row.key === key)) {
        editorError.value = t('message.kv_admin_page.validation_error');
        showToast(editorError.value, 'error');
        return;
      }

      const payloadValue = parseInputValue(editorValue.value);
      isSaving.value = true;

      try {
        let response;
        if (mainStore.mockApi) {
          applyLocalUpsert(key, payloadValue);
          response = { success: true, message: editorMode.value === 'add' ? t('message.kv_admin_page.add_success') : t('message.kv_admin_page.edit_success') };
        } else {
          const endpoint = API_ENDPOINTS.KV_ADMIN_CONFIGS_SPECIFIC.replace(':key', encodeURIComponent(key));
          const apiResponse = await apiClient.put(endpoint, { value: payloadValue }, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          });
          response = apiResponse.data;
          if (response.success) {
            applyLocalUpsert(key, payloadValue);
          } else {
            throw new Error(response.error || 'Unknown error');
          }
        }
        const toastMsg = response.message || (editorMode.value === 'add' ? t('message.kv_admin_page.add_success') : t('message.kv_admin_page.edit_success'));
        showToast(toastMsg, 'success');
        editorOpen.value = false;
      } catch (error) {
        let fullError = t('message.errors.unknown_error');
        if (error.response?.data) {
          const data = error.response.data;
          fullError = data.error || data.message || fullError;
        } else if (error.message) {
          fullError = error.message;
        }
        // show full error in modal
        editorError.value = fullError;

        showToast(t(`message.kv_admin_page.save_error_default`, { key }), 'error');
      } finally {
        isSaving.value = false;
      }
    };

    const confirmDelete = async () => {
      deleteError.value = '';
      if (!deleteKey.value) return;
      isDeleting.value = true;

      try {
        let response;
        if (mainStore.mockApi) {
          rows.value = rows.value.filter((row) => row.key !== deleteKey.value);
          allowedCount.value = Math.max(0, allowedCount.value - 1);
          response = { success: true, message: t('message.kv_admin_page.delete_success') };
        } else {
          const endpoint = API_ENDPOINTS.KV_ADMIN_CONFIGS_SPECIFIC.replace(':key', encodeURIComponent(deleteKey.value));
          const apiResponse = await apiClient.delete(endpoint, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          });
          response = apiResponse.data;
          if (response.success) {
            rows.value = rows.value.filter((row) => row.key !== deleteKey.value);
            allowedCount.value = Math.max(0, allowedCount.value - 1);
          } else {
            throw new Error(response.error || 'Unknown error');
          }
        }
        const toastMsg = response.message || t('message.kv_admin_page.delete_success');
        showToast(toastMsg, 'success');
        deleteOpen.value = false;
      } catch (error) {
        let errorMsg = t('message.errors.unknown_error');
        if (error.response?.data) {
          const data = error.response.data;
          errorMsg = data.error || data.message || errorMsg;
        } else if (error.message) {
          errorMsg = error.message;
        }
        deleteError.value = errorMsg;
        showToast(errorMsg, 'error');
      } finally {
        isDeleting.value = false;
      }
    };

    const copyText = async (type, key, value) => {
      try {
        await navigator.clipboard.writeText(String(value));
        if (type === 'key') {
          copiedKey.value = key;
          setTimeout(() => { copiedKey.value = null; }, 1200);
        } else {
          copiedValue.value = key;
          setTimeout(() => { copiedValue.value = null; }, 1200);
        }
      } catch (err) {
        console.warn('Copy failed:', err);
      }
    };

    watch(
      () => authStore.isAuthenticated,
      async (isAuthenticated) => {
        if (!isAuthenticated) {
          showLoginRequired.value = true;
          rows.value = [];
          allowedCount.value = 0;
        } else if (isAuthenticated && isSuperAdmin.value) {
          await loadConfigs();
        }
      }
    );

    watch(
      () => isSuperAdmin.value,
      async (value) => {
        if (value) {
          await loadConfigs();
          return;
        }
        rows.value = [];
        allowedCount.value = 0;
      }
    );

    onMounted(checkAuthAndLoad);

    return {
      showLoginRequired,
      isSuperAdmin,
      loading,
      error,
      search,
      showOverridesOnly,
      rows,
      filteredRows,
      stats,
      lastUpdatedLabel,
      openLoginModal,
      reload,
      sourceBadgeClass,
      sourceLabel,
      copyText,
      copiedKey,
      copiedValue,
      editorOpen,
      editorMode,
      editorKey,
      editorValue,
      editorError,
      isSaving,
      deleteOpen,
      deleteKey,
      deleteError,
      isDeleting,
      openAddModal,
      openEditModal,
      closeEditor,
      saveConfig,
      openDeleteModal,
      closeDelete,
      confirmDelete
    };
  }
};
</script>

<style scoped>
.kv-error-message {
  color: #dc2626;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow: auto;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: rgba(254, 242, 242, 0.6);
}

.dark .kv-error-message {
  background: rgba(139, 0, 0, 0.06);
  color: #fecaca;
}
</style>
