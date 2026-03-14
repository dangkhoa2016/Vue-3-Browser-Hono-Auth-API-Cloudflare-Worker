<template>
  <div class="max-w-7xl mx-auto space-y-6">
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
          <h1 class="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            {{ $t('message.kv_admin_page.title') }}
          </h1>
          <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
            {{ $t('message.kv_admin_page.subtitle') }}
          </p>
        </template>

        <template #right>
          <div class="grid grid-cols-3 gap-3 w-full sm:w-auto">
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 text-center">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.stats_total') }}</div>
              <div class="mt-2 text-2xl font-black text-slate-900 dark:text-white">{{ stats.total }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 text-center">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.stats_overrides') }}</div>
              <div class="mt-2 text-2xl font-black text-slate-900 dark:text-white">{{ stats.overrides }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4 text-center">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.stats_allowed') }}</div>
              <div class="mt-2 text-2xl font-black text-slate-900 dark:text-white">{{ stats.allowed }}</div>
            </div>
          </div>
        </template>
      </PageHeroSection>

      <section v-if="!isSuperAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.kv_admin_page.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.kv_admin_page.access_denied_message') }}</p>
      </section>

      <section v-else class="space-y-6">
        <div class="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="relative flex-1">
            <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              v-model="search"
              :class="searchInputClass"
              type="text"
              :placeholder="$t('message.kv_admin_page.search_placeholder')"
            />
          </div>
          <label :class="overrideFilterLabelClass">
            <input
              v-model="showOverridesOnly"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>{{ $t('message.kv_admin_page.show_overrides_only') }}</span>
          </label>
          <div class="flex flex-wrap gap-2">
            <ActionTextButton variant="soft" shape="full" icon="bi bi-arrow-clockwise" @click="reload">
              {{ $t('message.kv_admin_page.reload') }}
            </ActionTextButton>
            <ActionTextButton variant="soft" shape="full" icon="bi bi-x-circle" @click="clearSearch">
              {{ tf('message.common.clear', 'Clear') }}
            </ActionTextButton>
            <ActionTextButton variant="primary" shape="full" icon="bi bi-plus-circle" @click="openAddModal">
              {{ $t('message.kv_admin_page.add_key') }}
            </ActionTextButton>
            <ActionTextButton variant="soft" shape="full" icon="bi bi-list-check" @click="openBulkModal">
              {{ $t('message.kv_admin_page.bulk_update') }}
            </ActionTextButton>
          </div>
        </div>

        <div class="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('message.kv_admin_page.table_title') }}</h2>
            <span class="text-xs text-slate-500">{{ $t('message.kv_admin_page.last_updated') }}: {{ lastUpdatedLabel }}</span>
          </div>

          <div v-if="isLoading" class="space-y-3 animate-pulse">
            <div v-for="row in 5" :key="row" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
          </div>

          <div v-else-if="errorMessage" class="text-center py-10">
            <p class="text-rose-600 dark:text-rose-300">{{ errorMessage }}</p>
            <div class="mt-4">
              <ActionTextButton variant="soft" shape="full" icon="bi bi-arrow-clockwise" @click="reload">
                {{ $t('message.kv_admin_page.reload') }}
              </ActionTextButton>
            </div>
          </div>

          <div v-else-if="filteredRows.length === 0" class="text-center py-10 text-slate-500 dark:text-slate-400">
            {{ $t('message.kv_admin_page.empty_title') }}
          </div>

          <div v-else class="space-y-4">
            <article
              v-for="row in filteredRows"
              :key="row.key"
              :class="configCardClass"
            >
              <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div class="space-y-2 min-w-0">
                  <div class="font-mono text-sm md:text-base text-slate-900 dark:text-slate-100 break-all">{{ row.key }}</div>
                  <span :class="sourceBadgeClass(row.source)">{{ sourceLabel(row.source) }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <ActionTextButton variant="soft" shape="full" icon="bi bi-key" @click="copyText('key', row.key, row.key)">
                    {{ copiedKey === row.key ? $t('message.kv_admin_page.copied') : $t('message.kv_admin_page.copy_key') }}
                  </ActionTextButton>
                  <ActionTextButton variant="soft" shape="full" icon="bi bi-clipboard" @click="copyText('value', row.key, row.valueLabel)">
                    {{ copiedValue === row.key ? $t('message.kv_admin_page.copied') : $t('message.kv_admin_page.copy_value') }}
                  </ActionTextButton>
                  <ActionTextButton variant="soft" shape="full" icon="bi bi-pencil" @click="openEditModal(row)">
                    {{ $t('message.common.edit') }}
                  </ActionTextButton>
                  <ActionTextButton variant="danger" shape="full" icon="bi bi-trash" @click="openDeleteModal(row)">
                    {{ $t('message.common.delete') }}
                  </ActionTextButton>
                </div>
              </div>
              <div class="mt-4 grid md:grid-cols-2 gap-3">
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 p-3 text-xs">
                  <div class="uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.kv_admin_page.column_value') }}</div>
                  <div class="font-mono break-all text-slate-700 dark:text-slate-200">{{ row.valueLabel }}</div>
                </div>
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs">
                  <div class="uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.kv_admin_page.column_default') }}</div>
                  <div class="font-mono break-all text-slate-700 dark:text-slate-200">{{ row.defaultLabel }}</div>
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
              {{ editorMode === 'add' ? $t('message.kv_admin_page.add_title') : $t('message.common.edit') }}
            </h3>
            <ActionIconButton icon="bi bi-x-lg" tone="slate" @click="closeEditor" />
          </div>

          <div class="mt-6 space-y-4">
            <div>
              <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.key_label') }}</label>
              <input v-model="editorKey" :disabled="editorMode === 'edit'" :class="editorKeyInputClass" type="text" />
            </div>
            <div>
              <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.value_label') }}</label>
              <textarea v-model="editorValue" :class="editorValueTextareaClass" rows="8"></textarea>
            </div>
            <p v-if="editorError" class="kv-error-message">{{ editorError }}</p>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-3">
            <ActionTextButton variant="soft" shape="full" @click="closeEditor">{{ $t('message.common.cancel') }}</ActionTextButton>
            <ActionTextButton :disabled="isSaving" variant="primary" shape="full" @click="saveConfig">
              {{ isSaving ? $t('message.common.loading') : $t('message.common.save') }}
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
            <ActionIconButton icon="bi bi-x-lg" tone="slate" @click="closeBulkModal" />
          </div>

          <div class="mt-6 space-y-3 max-h-[55vh] overflow-auto pr-1">
            <article v-for="(item, index) in bulkItems" :key="item.id" class="rounded-2xl border border-slate-200/70 dark:border-slate-800 p-4">
              <div class="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <div>
                  <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.key_label') }}</label>
                  <input
                    :id="`bulk-key-${item.id}`"
                    v-model="item.key"
                    type="text"
                    list="kv-bulk-key-options"
                    :class="editorKeyInputClass"
                    @focus="openBulkKeySuggestions(item.id)"
                    @blur="onBulkKeyBlur(item.id)"
                    @input="onBulkKeyInput($event, item.id)"
                  />
                </div>
                <div>
                  <label class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.kv_admin_page.value_label') }}</label>
                  <input
                    :id="`bulk-value-${item.id}`"
                    v-model="item.value"
                    type="text"
                    :class="editorKeyInputClass"
                    @keydown.enter.prevent="onBulkValueEnter(item.id)"
                  />
                </div>
                <div class="flex justify-end">
                  <ActionIconButton icon="bi bi-trash" tone="danger" :disabled="bulkItems.length <= 1" @click="removeBulkRow(index)" />
                </div>
              </div>
            </article>

            <datalist id="kv-bulk-key-options">
              <option v-for="keyOption in bulkKeyOptions" :key="keyOption" :value="keyOption"></option>
            </datalist>
          </div>

          <p v-if="bulkError" class="kv-error-message mt-4">{{ bulkError }}</p>

          <div class="mt-6 flex flex-wrap justify-between gap-3">
            <ActionTextButton variant="soft" shape="full" icon="bi bi-plus-circle" @click="addBulkRow">
              {{ $t('message.kv_admin_page.bulk_add_row') }}
            </ActionTextButton>
            <div class="flex gap-2">
              <ActionTextButton variant="soft" shape="full" @click="closeBulkModal">{{ $t('message.common.cancel') }}</ActionTextButton>
              <ActionTextButton :disabled="isBulkSaving" variant="primary" shape="full" @click="submitBulkUpdate">
                {{ isBulkSaving ? $t('message.common.loading') : $t('message.common.save') }}
              </ActionTextButton>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade" mode="out-in">
      <div v-if="deleteOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
        <div class="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xl p-6 text-center">
          <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-4"></i>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ $t('message.kv_admin_page.delete_title') }}</h3>
          <p class="text-slate-600 dark:text-slate-300 mb-5">
            {{ $t('message.kv_admin_page.delete_confirm') }}
            <strong class="text-slate-900 dark:text-white mt-2 block break-all">{{ deleteKey }}</strong>
          </p>
          <p v-if="deleteError" class="kv-error-message mb-4">{{ deleteError }}</p>
          <div class="flex flex-wrap justify-center gap-3">
            <ActionTextButton variant="soft" shape="full" @click="closeDelete">{{ $t('message.common.cancel') }}</ActionTextButton>
            <ActionTextButton :disabled="isDeleting" variant="danger" shape="full" @click="confirmDelete">
              {{ isDeleting ? $t('message.common.loading') : $t('message.common.delete') }}
            </ActionTextButton>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import ActionIconButton from '/vue/components/ActionIconButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useKvAdminConfigsPage } from '/vue/composables/useKvAdminConfigsPage.js';

const {
  showLoginRequired,
  isSuperAdmin,
  tf,
  isLoading,
  errorMessage,
  search,
  showOverridesOnly,
  heroSectionClass,
  searchInputClass,
  overrideFilterLabelClass,
  configCardClass,
  editorKeyInputClass,
  editorValueTextareaClass,
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
  clearSearch,
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
} = useKvAdminConfigsPage();
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
