<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="amber"
      button-icon="bi bi-box-arrow-in-right text-lg"
      :title="$t('message.auth.login_required')"
      :message="$t('message.kv_admin_page.login_required_message')"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-20 -right-16 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"
      >
        <template #left>
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
              <ActionTextButton
                variant="soft"
                shape="full"
                icon="bi bi-arrow-clockwise"
                :title="$t('message.common.retry_title')"
                @click="reload"
              >
                {{ $t('message.kv_admin_page.reload') }}
              </ActionTextButton>
            </div>
          </div>
        </template>

        <template #right>
          <div class="grid gap-4">
            <template v-if="loading">
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                <div class="mt-3 flex items-center justify-between">
                  <div class="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                  <div class="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                  <div class="mt-3 flex items-center justify-between">
                    <div class="h-7 w-14 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                    <div class="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
                  </div>
                </div>
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                  <div class="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                  <div class="mt-3 flex items-center justify-between">
                    <div class="h-7 w-14 rounded bg-slate-200 dark:bg-slate-700/50"></div>
                    <div class="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
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
            </template>
          </div>
        </template>
      </PageHeroSection>

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
                :class="searchInputClass"
                :placeholder="$t('message.kv_admin_page.search_placeholder')"
              />
              <ActionIconButton
                v-if="search"
                icon="bi bi-x-lg"
                tone="indigo"
                class="absolute right-2 top-1/2 -translate-y-1/2"
                :title="$t('message.common.clear') || 'Clear'"
                :aria-label="$t('message.common.clear') || 'Clear'"
                @click="search = ''; $refs.searchInput && $refs.searchInput.focus()"
              />
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <label :class="overrideFilterLabelClass">
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
              <ActionTextButton
                variant="soft"
                shape="full"
                icon="bi bi-ui-checks-grid"
                class="text-xs"
                @click="openBulkModal"
              >
                {{ $t('message.kv_admin_page.bulk_update') }}
              </ActionTextButton>
              <ActionTextButton
                tone="amber"
                shape="full"
                icon="bi bi-plus-circle"
                class="text-xs"
                @click="openAddModal"
              >
                {{ $t('message.kv_admin_page.add_key') }}
              </ActionTextButton>
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
            <ActionTextButton
              class="mt-4"
              tone="rose"
              shape="full"
              icon="bi bi-arrow-clockwise"
              @click="reload"
            >
              {{ $t('message.common.retry') }}
            </ActionTextButton>
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
              :class="configCardClass"
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
                  <ActionTextButton
                    variant="soft"
                    shape="full"
                    size="sm"
                    icon="bi bi-clipboard"
                    class="text-xs"
                    :title="$t('message.kv_admin_page.copy_key')"
                    @click="copyText('key', row.key, row.key)"
                  >
                    {{ copiedKey === row.key ? $t('message.kv_admin_page.copied') : $t('message.kv_admin_page.copy_key') }}
                  </ActionTextButton>
                  <ActionTextButton
                    variant="soft"
                    shape="full"
                    size="sm"
                    icon="bi bi-clipboard-check"
                    class="text-xs"
                    :title="$t('message.kv_admin_page.copy_value')"
                    @click="copyText('value', row.key, row.valueLabel)"
                  >
                    {{ copiedValue === row.key ? $t('message.kv_admin_page.copied') : $t('message.kv_admin_page.copy_value') }}
                  </ActionTextButton>
                  <ActionTextButton
                    variant="soft"
                    shape="full"
                    size="sm"
                    icon="bi bi-pencil"
                    class="text-xs"
                    :title="$t('message.kv_admin_page.edit_action')"
                    @click="openEditModal(row)"
                  >
                    {{ $t('message.kv_admin_page.edit_action') }}
                  </ActionTextButton>
                  <ActionTextButton
                    tone="rose"
                    shape="full"
                    size="sm"
                    icon="bi bi-trash"
                    class="text-xs"
                    :title="$t('message.kv_admin_page.delete_action')"
                    @click="openDeleteModal(row)"
                  >
                    {{ $t('message.kv_admin_page.delete_action') }}
                  </ActionTextButton>
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
            <ActionIconButton
              icon="bi bi-x-lg"
              tone="indigo"
              :title="$t('message.common.close') || 'Close'"
              :aria-label="$t('message.common.close') || 'Close'"
              @click="closeEditor"
            />
          </div>

          <div class="mt-6 space-y-4">
            <div>
              <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.key_label') }}</label>
              <input
                v-model="editorKey"
                :disabled="editorMode === 'edit'"
                :class="editorKeyInputClass"
                placeholder="SECURITY_CSP"
              />
            </div>
            <div>
              <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.value_label') }}</label>
              <textarea
                v-model="editorValue"
                rows="6"
                :class="editorValueTextareaClass"
                placeholder="Enter value"
              ></textarea>
            </div>
            <p v-if="editorError" class="kv-error-message">{{ editorError }}</p>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-3">
            <ActionTextButton
              variant="soft"
              shape="full"
              @click="closeEditor"
            >
              {{ $t('message.kv_admin_page.cancel') }}
            </ActionTextButton>
            <ActionTextButton
              tone="amber"
              shape="full"
              icon="bi bi-check-lg"
              :disabled="isSaving"
              @click="saveConfig"
            >
              {{ $t('message.kv_admin_page.save') }}
            </ActionTextButton>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade" mode="out-in">
      <div v-if="bulkOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
        <div class="w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xl p-6">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('message.kv_admin_page.bulk_modal_title') }}</h3>
            <ActionIconButton
              icon="bi bi-x-lg"
              tone="indigo"
              :title="$t('message.common.close') || 'Close'"
              :aria-label="$t('message.common.close') || 'Close'"
              @click="closeBulkModal"
            />
          </div>

          <div class="mt-6 space-y-3 max-h-[55vh] overflow-auto pr-1">
            <article
              v-for="(item, index) in bulkItems"
              :key="item.id"
              class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4"
            >
              <div class="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <div>
                  <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.key_label') }}</label>
                  <input
                    :id="`bulk-key-${item.id}`"
                    v-model="item.key"
                    :list="bulkListRowId === item.id ? 'kv-bulk-key-options' : undefined"
                    :class="editorKeyInputClass"
                    :placeholder="$t('message.kv_admin_page.bulk_key_placeholder')"
                    @focus="openBulkKeySuggestions(item.id)"
                    @click="openBulkKeySuggestions(item.id)"
                    @input="onBulkKeyInput($event, item.id)"
                    @change="onBulkKeyInput($event, item.id)"
                    @blur="onBulkKeyBlur(item.id)"
                  />
                </div>
                <div>
                  <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.value_label') }}</label>
                  <input
                    :id="`bulk-value-${item.id}`"
                    v-model="item.value"
                    :class="editorKeyInputClass"
                    :placeholder="$t('message.kv_admin_page.bulk_value_placeholder')"
                    @keydown.enter.prevent="onBulkValueEnter(item.id)"
                  />
                </div>
                <div class="flex justify-end">
                  <ActionIconButton
                    icon="bi bi-trash"
                    tone="rose"
                    :disabled="bulkItems.length === 1"
                    :title="$t('message.kv_admin_page.delete_action')"
                    :aria-label="$t('message.kv_admin_page.delete_action')"
                    @click="removeBulkRow(index)"
                  />
                </div>
              </div>
            </article>
            <datalist id="kv-bulk-key-options">
              <option v-for="keyOption in bulkKeyOptions" :key="keyOption" :value="keyOption"></option>
            </datalist>
          </div>

          <p v-if="bulkError" class="kv-error-message mt-4">{{ bulkError }}</p>

          <div class="mt-6 flex flex-wrap justify-between gap-3">
            <ActionTextButton
              variant="soft"
              shape="full"
              icon="bi bi-plus-circle"
              @click="addBulkRow"
            >
              {{ $t('message.kv_admin_page.bulk_add_row') }}
            </ActionTextButton>

            <div class="flex flex-wrap justify-end gap-3">
              <ActionTextButton
                variant="soft"
                shape="full"
                @click="closeBulkModal"
              >
                {{ $t('message.kv_admin_page.cancel') }}
              </ActionTextButton>
              <ActionTextButton
                tone="amber"
                shape="full"
                icon="bi bi-check2-all"
                :disabled="isBulkSaving"
                @click="submitBulkUpdate"
              >
                {{ $t('message.kv_admin_page.bulk_save') }}
              </ActionTextButton>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade" mode="out-in">
      <div v-if="deleteOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
        <div class="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xl p-6 text-center">
          <i class="bi bi-exclamation-circle text-5xl text-rose-500 mb-4 inline-block"></i>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ $t('message.kv_admin_page.delete_title') }}</h3>
          <p class="text-slate-600 dark:text-slate-300 mb-6">
            {{ $t('message.kv_admin_page.delete_confirm') }}
            <br />
            <strong class="text-slate-900 dark:text-white mt-2 block break-all">{{ deleteKey }}</strong>
          </p>
            
          <p v-if="deleteError" class="kv-error-message mb-4 text-left">{{ deleteError }}</p>

          <div class="flex flex-wrap justify-center gap-3">
            <ActionTextButton
              variant="soft"
              shape="full"
              @click="closeDelete"
            >
              {{ $t('message.kv_admin_page.cancel') || 'Cancel' }}
            </ActionTextButton>
            <ActionTextButton
              tone="rose"
              shape="full"
              icon="bi bi-trash"
              :disabled="isDeleting"
              @click="confirmDelete"
            >
              {{ $t('message.kv_admin_page.delete_action') || 'Delete' }}
            </ActionTextButton>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import ActionIconButton from '/vue/components/ActionIconButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useAuthGate } from '/vue/composables/useAuthGate.js';
import { useModalState } from '/vue/composables/useModalState.js';

export default {
  name: 'KvAdminConfigs',
  components: { ActionTextButton, ActionIconButton, LoginRequiredPrompt, PageHeroSection },
  setup() {
    const { t } = useI18n({ useScope: 'global' });
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const mainStore = useMainStore();

    const loading = ref(false);
    const error = ref(null);
    const search = ref('');
    const showOverridesOnly = ref(false);
    const rows = ref([]);
    const allowedKeys = ref([]);
    const allowedCount = ref(0);
    const lastUpdated = ref(null);
    const copiedKey = ref(null);
    const copiedValue = ref(null);
    const editorModal = useModalState({ initialOpen: false, initialMode: 'add' });
    const editorOpen = editorModal.isOpen;
    const editorMode = editorModal.mode;
    const editorKey = ref('');
    const editorValue = ref('');
    const editorError = ref('');
    const isSaving = ref(false);

    const deleteModal = useModalState({ initialOpen: false, initialMode: 'delete' });
    const deleteOpen = deleteModal.isOpen;
    const deleteKey = ref('');
    const deleteError = ref('');
    const isDeleting = ref(false);

    const bulkModal = useModalState({ initialOpen: false, initialMode: 'bulk' });
    const bulkOpen = bulkModal.isOpen;
    const bulkItems = ref([]);
    const bulkError = ref('');
    const isBulkSaving = ref(false);
    const bulkSeed = ref(0);
    const bulkListRowId = ref(null);
    const toastStore = useToastStore();

    const heroSectionClass =
      'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-amber-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
    const searchInputClass =
      'w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';
    const overrideFilterLabelClass =
      'inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200';
    const configCardClass =
      'group rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5';
    const editorKeyInputClass =
      'mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-60';
    const editorValueTextareaClass =
      'mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono';

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

    const bulkKeyOptions = computed(() => {
      const keySet = new Set([...(allowedKeys.value || []), ...rows.value.map((row) => row.key)]);
      return Array.from(keySet).sort((first, second) => first.localeCompare(second));
    });

    const lastUpdatedLabel = computed(() => {
      if (!lastUpdated.value) return '-';
      const date = new Date(lastUpdated.value);
      return Number.isNaN(date.getTime()) ? lastUpdated.value : date.toLocaleString();
    });

    const resetKvState = () => {
      rows.value = [];
      allowedCount.value = 0;
    };

    const buildRows = ({ configs = {}, defaults = {}, allowedKeys: allowedKeyList = [] } = {}) => {
      const configKeys = Object.keys(configs || {});
      const defaultKeys = Object.keys(defaults || {});
      const baseKeys = allowedKeyList && allowedKeyList.length
        ? allowedKeyList
        : Array.from(new Set([...configKeys, ...defaultKeys])).sort();

      allowedKeys.value = [...baseKeys];
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
          markUnauthenticated();
        }
        error.value = (err && err.message) || t('message.kv_admin_page.error_loading');
      } finally {
        loading.value = false;
      }
    };

    const {
      showLoginRequired,
      openLoginModal,
      ensureAuthenticated,
      handleAuthStateChange,
      markUnauthenticated
    } = useAuthGate({
      authStore,
      modalStore,
      sessionAuthFlagKey: 'authRequired',
      resetProtectedState: resetKvState,
      onAuthenticated: async () => {
        if (isSuperAdmin.value) {
          await loadConfigs();
        }
      },
      onModalSuccess: async () => {
        if (isSuperAdmin.value) {
          await loadConfigs();
        }
      }
    });

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
      editorModal.open(null, 'add');
    };

    const openEditModal = (row) => {
      editorMode.value = 'edit';
      editorKey.value = row.key;
      editorValue.value = formatValueForEdit(row.value);
      editorError.value = '';
      editorModal.open(null, 'edit');
    };

    const closeEditor = () => {
      editorModal.close({ reset: false });
      editorError.value = '';
    };

    const createBulkItem = () => {
      const id = `bulk-${Date.now()}-${bulkSeed.value}`;
      bulkSeed.value += 1;
      return { id, key: '', value: '' };
    };

    const hydrateAllowedKeys = (data) => {
      if (!data || typeof data !== 'object') return;
      const nextAllowed = Array.isArray(data.allowedKeys) ? data.allowedKeys : [];
      const configKeys = Object.keys(data.configs || {});
      const defaultKeys = Object.keys(data.defaults || {});
      const merged = Array.from(new Set([...allowedKeys.value, ...nextAllowed, ...configKeys, ...defaultKeys]));
      if (merged.length > 0) {
        allowedKeys.value = merged.sort((first, second) => first.localeCompare(second));
      }
    };

    const ensureBulkKeyOptionsLoaded = async () => {
      if (bulkKeyOptions.value.length > 0) return;
      try {
        if (mainStore.mockApi) {
          const res = await fetch('/assets/data/kv-admin/configs.json', { cache: 'no-store' });
          if (!res.ok) return;
          const payload = await res.json();
          const data = payload?.data || payload || {};
          hydrateAllowedKeys(data);
          return;
        }

        const defaultsEndpoint = `${API_ENDPOINTS.KV_ADMIN_CONFIGS}/defaults`;
        const defaultsRes = await apiClient.get(defaultsEndpoint, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });
        const defaultsPayload = defaultsRes?.data || {};
        const defaultsData = defaultsPayload?.data || defaultsPayload || {};
        hydrateAllowedKeys(defaultsData);
      } catch (_error) {
      }
    };

    const openBulkModal = async () => {
      bulkItems.value = [createBulkItem()];
      bulkError.value = '';
      bulkModal.open(null, 'bulk');
      await ensureBulkKeyOptionsLoaded();
    };

    const closeBulkModal = () => {
      bulkModal.close({ reset: false });
      bulkError.value = '';
      isBulkSaving.value = false;
      bulkListRowId.value = null;
    };

    const addBulkRow = () => {
      bulkItems.value = [...bulkItems.value, createBulkItem()];
    };

    const removeBulkRow = (index) => {
      if (bulkItems.value.length <= 1) return;
      bulkItems.value = bulkItems.value.filter((_, itemIndex) => itemIndex !== index);
    };

    const openBulkKeySuggestions = async (itemId) => {
      await ensureBulkKeyOptionsLoaded();
      bulkListRowId.value = itemId;
    };

    const onBulkKeyBlur = (itemId) => {
      if (bulkListRowId.value === itemId) {
        bulkListRowId.value = null;
      }
    };

    const focusBulkValueInput = (itemId) => {
      const valueInput = document.getElementById(`bulk-value-${itemId}`);
      if (!valueInput) return;
      requestAnimationFrame(() => {
        valueInput.focus();
      });
    };

    const onBulkKeyInput = (event, itemId) => {
      const keyInput = event?.target;
      if (!keyInput) return;
      bulkListRowId.value = itemId;

      requestAnimationFrame(() => {
        const value = String(keyInput.value || '').trim();
        if (!value) return;
        if (!bulkKeyOptions.value.includes(value)) return;

        bulkListRowId.value = null;
        keyInput.blur();
        focusBulkValueInput(itemId);
      });
    };

    const onBulkValueEnter = async (itemId) => {
      const currentIndex = bulkItems.value.findIndex((item) => item.id === itemId);
      if (currentIndex < 0) return;

      const isLastRow = currentIndex === bulkItems.value.length - 1;
      if (isLastRow) {
        const nextItem = createBulkItem();
        bulkItems.value = [...bulkItems.value, nextItem];
        await nextTick();
        const nextKeyInput = document.getElementById(`bulk-key-${nextItem.id}`);
        if (nextKeyInput) {
          nextKeyInput.focus();
        }
        return;
      }

      const nextRow = bulkItems.value[currentIndex + 1];
      if (!nextRow) return;
      await nextTick();
      const nextKeyInput = document.getElementById(`bulk-key-${nextRow.id}`);
      if (nextKeyInput) {
        nextKeyInput.focus();
      }
    };

    const openDeleteModal = (row) => {
      deleteKey.value = row.key;
      deleteError.value = '';
      deleteModal.open(null, 'delete');
    };

    const closeDelete = () => {
      deleteModal.close({ reset: false });
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

    const isAuthTokenError = (error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403) return true;
      const code = String(error?.code || '').toUpperCase();
      if (code === 'REAUTH_REQUIRED') return true;
      const message = String(error?.message || '').toLowerCase();
      return message.includes('token') || message.includes('re-login') || message.includes('reauth');
    };

    const applyLocalUpsert = (key, value) => {
      const existingIndex = rows.value.findIndex((row) => row.key === key);
      const defaultValue = existingIndex >= 0 ? rows.value[existingIndex].defaultValue : undefined;
      const valueLabel = formatValue(value);
      const defaultLabel = formatValue(defaultValue);
      const isOverride = valueLabel !== defaultLabel;
      const source = isOverride ? 'kv' : (defaultValue !== undefined ? 'default' : 'unknown');
      const nextRow = {
        key,
        value,
        defaultValue,
        valueLabel,
        defaultLabel,
        source,
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
        closeEditor();
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

        if (isAuthTokenError(error)) {
          closeEditor();
        }

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
        const endpoint = API_ENDPOINTS.KV_ADMIN_CONFIGS_SPECIFIC.replace(':key', encodeURIComponent(deleteKey.value));
        const apiResponse = await apiClient.delete(endpoint, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });
        const response = apiResponse.data;

        if (response.success) {
          if (response.data && response.data.defaultValue !== undefined) {
             // Reset back to default value instead of deleting row
             applyLocalUpsert(deleteKey.value, response.data.defaultValue);
          } else {
             // Fallback behavior if no defaultValue returned
             rows.value = rows.value.filter((row) => row.key !== deleteKey.value);
             allowedCount.value = Math.max(0, allowedCount.value - 1);
          }
        } else {
          throw new Error(response.error || 'Unknown error');
        }

        const toastMsg = response.message || t('message.kv_admin_page.delete_success');
        showToast(toastMsg, 'success');
        closeDelete();
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

    const submitBulkUpdate = async () => {
      bulkError.value = '';

      const normalizedItems = bulkItems.value
        .map((item) => ({
          key: String(item.key || '').trim(),
          rawValue: item.value
        }))
        .filter((item) => item.key || String(item.rawValue || '').trim() !== '');

      if (!normalizedItems.length) {
        bulkError.value = t('message.kv_admin_page.bulk_validation_min_items');
        showToast(bulkError.value, 'error');
        return;
      }

      const missingKey = normalizedItems.some((item) => !item.key);
      if (missingKey) {
        bulkError.value = t('message.kv_admin_page.bulk_validation_missing_key');
        showToast(bulkError.value, 'error');
        return;
      }

      const duplicateKeys = new Set();
      const seenKeys = new Set();
      normalizedItems.forEach((item) => {
        if (seenKeys.has(item.key)) {
          duplicateKeys.add(item.key);
        }
        seenKeys.add(item.key);
      });

      if (duplicateKeys.size > 0) {
        bulkError.value = t('message.kv_admin_page.bulk_validation_duplicate_keys', {
          keys: Array.from(duplicateKeys).join(', ')
        });
        showToast(bulkError.value, 'error');
        return;
      }

      const availableKeys = new Set(bulkKeyOptions.value);
      const invalidKeys = normalizedItems
        .map((item) => item.key)
        .filter((key) => availableKeys.size > 0 && !availableKeys.has(key));

      if (invalidKeys.length > 0) {
        bulkError.value = t('message.kv_admin_page.bulk_validation_invalid_keys', {
          keys: invalidKeys.join(', ')
        });
        showToast(bulkError.value, 'error');
        return;
      }

      const requestConfigs = normalizedItems.map((item) => ({
        key: item.key,
        value: parseInputValue(item.rawValue)
      }));

      isBulkSaving.value = true;

      try {
        const endpoint = `${API_ENDPOINTS.KV_ADMIN_CONFIGS}/batch`;
        const apiResponse = await apiClient.post(endpoint, {
          configs: requestConfigs
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });

        const payload = apiResponse.data || {};
        const resultData = payload.data || {};
        const responseErrors = resultData.errors || {};
        const failedKeys = new Set(Object.keys(responseErrors));
        const updatedCount = Number(resultData.summary?.updated) || (requestConfigs.length - failedKeys.size);

        requestConfigs.forEach((configItem) => {
          if (!failedKeys.has(configItem.key)) {
            applyLocalUpsert(configItem.key, configItem.value);
          }
        });

        if (failedKeys.size > 0) {
          bulkError.value = Object.entries(responseErrors)
            .map(([key, message]) => `${key}: ${message}`)
            .join('\n');
          showToast(t('message.kv_admin_page.bulk_partial_error', {
            updated: updatedCount,
            failed: failedKeys.size
          }), 'error');
        } else {
          showToast(payload.message || t('message.kv_admin_page.edit_success'), 'success');
          closeBulkModal();
        }
      } catch (error) {
        let errorMsg = t('message.errors.unknown_error');
        if (error.response?.data) {
          const data = error.response.data;
          errorMsg = data.error || data.message || errorMsg;
        } else if (error.message) {
          errorMsg = error.message;
        }
        bulkError.value = errorMsg;

        if (isAuthTokenError(error)) {
          closeBulkModal();
        }

        showToast(errorMsg, 'error');
      } finally {
        isBulkSaving.value = false;
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
        await handleAuthStateChange(isAuthenticated);
      }
    );

    watch(
      () => isSuperAdmin.value,
      async (value) => {
        if (value) {
          if (authStore.isAuthenticated) {
            await loadConfigs();
          }
          return;
        }
        resetKvState();
      }
    );

    watch(() => mainStore.mockApi, async (value, oldValue) => {
        if (value === oldValue) return;
        if (!authStore.isAuthenticated || !isSuperAdmin.value) return;
        await loadConfigs();
      }
    );

    onMounted(async () => {
      await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
    });

    return {
      showLoginRequired,
      isSuperAdmin,
      loading,
      error,
      search,
      showOverridesOnly,
      heroSectionClass,
      searchInputClass,
      overrideFilterLabelClass,
      configCardClass,
      editorKeyInputClass,
      editorValueTextareaClass,
      rows,
      bulkOpen,
      bulkItems,
      bulkError,
      isBulkSaving,
      bulkKeyOptions,
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
      openBulkModal,
      closeBulkModal,
      addBulkRow,
      removeBulkRow,
      openBulkKeySuggestions,
      onBulkKeyBlur,
      bulkListRowId,
      onBulkKeyInput,
      onBulkValueEnter,
      submitBulkUpdate,
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
