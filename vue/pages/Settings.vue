<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.16),transparent_42%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <template v-if="showAccessDenied">
      <section class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-slash-circle-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h2 class="text-2xl font-black text-rose-900 dark:text-rose-100 mb-2">{{ tf('message.settings.access_denied_title', 'Access denied') }}</h2>
        <p class="text-rose-700 dark:text-rose-300 max-w-2xl mx-auto">{{ tf('message.settings.access_denied_message', 'This page is reserved for admin and super admin accounts.') }}</p>
      </section>
    </template>

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-20 -right-12 w-72 h-72 bg-amber-300/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl"
      >
        <template #left>
          <div>
            <div :class="[pillClass, 'bg-amber-900/10 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200']">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              {{ tf('message.settings.badge', 'Settings Center') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ tf('message.navbar.settings', 'Settings') }}
            </h1>
            <p class="mt-3 max-w-2xl text-slate-600 dark:text-slate-300 leading-7">
              {{ tf('message.settings.subtitle', 'Manage browser-level workspace defaults and application preferences that directly affect admin workflows in this browser.') }}
            </p>
            <p class="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">
              {{ tf('message.settings.last_synced', 'Last synced') }}: {{ formatDate(lastSynced) }}
            </p>
          </div>
        </template>

        <template #right>
          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="card in summaryCards"
              :key="card.label"
              class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm"
            >
              <p class="text-[11px] uppercase tracking-[0.28em] text-slate-500">{{ card.label }}</p>
              <div class="mt-3 flex items-center justify-between gap-3">
                <span class="text-lg font-black text-slate-900 dark:text-white">{{ card.value }}</span>
                <i :class="[card.icon, card.tone, 'text-xl']"></i>
              </div>
            </div>
          </div>
        </template>
      </PageHeroSection>

      <section
        v-if="isPublicSettingsMode"
        class="rounded-[28px] border border-amber-200/80 dark:border-amber-700/70 bg-amber-50/90 dark:bg-amber-900/20 p-6 shadow-[0_18px_50px_-40px_rgba(180,83,9,0.65)]"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="max-w-3xl">
            <p :class="[pillClass, 'bg-amber-900/10 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200']">
              <i class="bi bi-unlock"></i>
              {{ tf('message.settings.public_badge', 'Public access') }}
            </p>
            <h2 class="mt-3 text-2xl font-black text-amber-950 dark:text-amber-100">{{ tf('message.settings.public_title', 'Update the API endpoint before signing in') }}</h2>
            <p class="mt-2 text-sm leading-7 text-amber-900/85 dark:text-amber-100/85">{{ tf('message.settings.public_message', 'This public mode keeps only the API endpoint editable so you can point the app at the correct backend first. Sign in and come back to unlock the rest of the settings.') }}</p>
          </div>

          <ActionTextButton
            icon="bi bi-box-arrow-in-right"
            tone="amber"
            shape="full"
            @click="openLoginModal"
          >
            {{ tf('message.settings.public_login_action', 'Login to see more settings') }}
          </ActionTextButton>
        </div>
      </section>

      <section class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/75 p-3 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        <div class="grid gap-3 md:grid-cols-3">
          <div
            v-for="tab in availableTabs"
            :key="tab.key"
            class="relative"
          >
            <button
              type="button"
              class="w-full rounded-2xl border px-4 py-4 pr-14 text-left transition"
              :class="activeTab === tab.key
                ? 'border-amber-300 bg-amber-50 text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100'
                : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'"
              @click="selectTab(tab.key)"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.22em]">{{ tab.label }}</p>
                  <p class="mt-2 text-sm font-medium opacity-80">{{ tab.description }}</p>
                </div>
                <i :class="[tab.icon, 'text-xl shrink-0']"></i>
              </div>
            </button>

            <button
              type="button"
              class="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-current/15 bg-white/80 text-slate-500 transition hover:text-slate-900 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:text-white"
              :title="`${tf('message.settings.copy_link', 'Copy link')}: ${copyTabLabel(tab.key)}`"
              :aria-label="`${tf('message.settings.copy_link', 'Copy link')}: ${copyTabLabel(tab.key)}`"
              @click.stop="copyTabShareLink(tab.key)"
            >
              <i :class="copiedTabKey === tab.key ? 'bi bi-clipboard-check' : 'bi bi-link-45deg'"></i>
            </button>
          </div>
        </div>
      </section>

      <div v-if="activeTab === 'workspace' && !isPublicSettingsMode" class="grid gap-6">
        <section :class="panelClass">
          <div>
            <p :class="[pillClass, 'bg-violet-900/10 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200']">{{ tf('message.settings.workspace_badge', 'Workspace') }}</p>
            <h2 class="mt-3 text-2xl font-black text-slate-900 dark:text-white">{{ tf('message.settings.workspace_title', 'Browser Preferences') }}</h2>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ tf('message.settings.workspace_subtitle', 'These settings are applied in the current browser and align with the locales or modes already supported by the app and API.') }}</p>
          </div>

          <div class="mt-6 space-y-4">
            <div :class="cardClass">
              <label class="block">
                <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.language_label', 'Language') }}</span>
                <select :class="inputClass" :value="currentLanguage" @change="setLanguage($event.target.value)">
                  <option v-for="language in supportedLanguages" :key="language.code" :value="language.code">
                    {{ language.label }}
                  </option>
                </select>
              </label>
              <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {{ tf('message.settings.language_hint', 'Server-advertised locales currently available') }}: {{ serverLanguageLabels }}
              </p>
            </div>

            <div :class="cardClass">
              <span class="mb-3 block text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.theme_label', 'Theme') }}</span>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="rounded-2xl border px-4 py-4 text-left transition"
                  :class="currentTheme === 'light' ? 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
                  @click="setTheme('light')"
                >
                  <span class="text-xs uppercase tracking-[0.22em]">{{ tf('message.settings.theme_light', 'Light') }}</span>
                  <span class="mt-2 block text-sm">{{ tf('message.settings.theme_light_hint', 'Bright surfaces and higher daylight contrast') }}</span>
                </button>
                <button
                  type="button"
                  class="rounded-2xl border px-4 py-4 text-left transition"
                  :class="currentTheme === 'dark' ? 'border-cyan-400 bg-cyan-50 text-cyan-900 dark:bg-cyan-900/20 dark:text-cyan-100' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
                  @click="setTheme('dark')"
                >
                  <span class="text-xs uppercase tracking-[0.22em]">{{ tf('message.settings.theme_dark', 'Dark') }}</span>
                  <span class="mt-2 block text-sm">{{ tf('message.settings.theme_dark_hint', 'Lower-glare palette for dense admin workflows') }}</span>
                </button>
              </div>
            </div>

            <div :class="cardClass">
              <span class="mb-3 block text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.api_mode_label', 'API Mode') }}</span>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="rounded-2xl border px-4 py-4 text-left transition"
                  :class="currentApiMode === 'mock' ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
                  @click="setApiMode('mock')"
                >
                  <span class="text-xs uppercase tracking-[0.22em]">{{ tf('message.navbar.mock_label', 'MOCK') }}</span>
                  <span class="mt-2 block text-sm">{{ tf('message.settings.api_mode_mock_hint', 'Use bundled fixtures for safe UI exploration') }}</span>
                </button>
                <button
                  type="button"
                  class="rounded-2xl border px-4 py-4 text-left transition"
                  :class="currentApiMode === 'real' ? 'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-100' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
                  @click="setApiMode('real')"
                >
                  <span class="text-xs uppercase tracking-[0.22em]">{{ tf('message.navbar.real_label', 'REAL') }}</span>
                  <span class="mt-2 block text-sm">{{ tf('message.settings.api_mode_real_hint', 'Send requests to the configured backend API') }}</span>
                </button>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/50 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.scope_note_title', 'Scope') }}</p>
              <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ tf('message.settings.scope_note_body', 'Theme, locale, API mode, endpoint, and admin page size are browser-local preferences. Account changes are still persisted through the authenticated server endpoints.') }}</p>
            </div>
          </div>
        </section>
      </div>

      <div v-else-if="activeTab === 'system'">
        <section :class="panelClass">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <p :class="[pillClass, 'bg-indigo-900/10 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200']">{{ tf('message.settings.system_badge', 'System') }}</p>
              <h2 class="mt-3 text-2xl font-black text-slate-900 dark:text-white">{{ tf('message.settings.system_title', 'Application Preferences') }}</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ tf('message.settings.system_subtitle', 'These settings are stored in this browser and immediately affect future admin requests and list views.') }}</p>
            </div>
            <ActionTextButton
              icon="bi bi-save"
              tone="indigo"
              shape="full"
              :disabled="isSavingSystemPreferences"
              @click="saveSystemPreferences"
            >
              {{ isSavingSystemPreferences ? tf('message.common.loading', 'Loading') : tf('message.common.save', 'Save') }}
            </ActionTextButton>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block md:col-span-2">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.api_endpoint_label', 'Server Endpoint') }}</span>
              <input v-model="systemPreferencesForm.apiBaseUrl" :class="inputClass" type="url" inputmode="url" placeholder="https://api.example.com">
              <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ tf('message.settings.api_endpoint_hint', 'Used when API mode is REAL. Changes apply to new requests after saving.') }}</p>
            </label>

            <label v-if="!isPublicSettingsMode" class="block">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.page_size_label', 'Default Admin Page Size') }}</span>
              <input v-model="systemPreferencesForm.adminPageSize" :class="inputClass" type="number" min="1" max="200" step="1">
              <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ tf('message.settings.page_size_hint', 'Used as the initial limit for paginated admin tables.') }}</p>
            </label>

            <label v-if="!isPublicSettingsMode" class="block">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.request_timeout_label', 'Request Timeout (ms)') }}</span>
              <input v-model="systemPreferencesForm.apiRequestTimeoutMs" :class="inputClass" type="number" min="1000" max="120000" step="500">
              <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ tf('message.settings.request_timeout_hint', 'Applied to future API requests from this browser. Useful when switching between local, preview, and remote environments.') }}</p>
            </label>

            <label v-if="!isPublicSettingsMode" class="block">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.search_debounce_label', 'Admin Search Debounce (ms)') }}</span>
              <input v-model="systemPreferencesForm.adminSearchDebounceMs" :class="inputClass" type="number" min="0" max="1500" step="50">
              <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ tf('message.settings.search_debounce_hint', 'Used by admin search boxes before firing server-side filtering again.') }}</p>
            </label>

            <label v-if="!isPublicSettingsMode" class="block">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.time_format_label', 'Time Format') }}</span>
              <select v-model="systemPreferencesForm.timeFormat" :class="inputClass">
                <option value="locale">{{ tf('message.settings.time_format_locale', 'Locale default') }}</option>
                <option value="12h">{{ tf('message.settings.time_format_12h', '12-hour clock') }}</option>
                <option value="24h">{{ tf('message.settings.time_format_24h', '24-hour clock') }}</option>
              </select>
              <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ tf('message.settings.time_format_hint', 'Applied to admin timestamps across dashboard, incident, user, audit, and KV admin screens.') }}</p>
            </label>

            <div :class="[cardClass, 'md:col-span-2']">
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">{{ tf('message.settings.current_values_title', 'Current runtime values') }}</p>
              <dl class="mt-4 space-y-3 text-sm">
                <div class="flex items-start justify-between gap-3">
                  <dt class="text-slate-500 dark:text-slate-400">{{ tf('message.settings.current_endpoint', 'Active endpoint') }}</dt>
                  <dd class="text-right font-semibold text-slate-900 dark:text-slate-100 break-all">{{ currentApiBaseUrl }}</dd>
                </div>
                <div v-if="!isPublicSettingsMode" class="flex items-start justify-between gap-3">
                  <dt class="text-slate-500 dark:text-slate-400">{{ tf('message.settings.current_page_size', 'Default page size') }}</dt>
                  <dd class="text-right font-semibold text-slate-900 dark:text-slate-100">{{ defaultAdminPageSize }}</dd>
                </div>
                <div v-if="!isPublicSettingsMode" class="flex items-start justify-between gap-3">
                  <dt class="text-slate-500 dark:text-slate-400">{{ tf('message.settings.current_api_mode', 'API mode') }}</dt>
                  <dd class="text-right font-semibold text-slate-900 dark:text-slate-100 uppercase">{{ currentApiMode }}</dd>
                </div>
                <div v-if="!isPublicSettingsMode" class="flex items-start justify-between gap-3">
                  <dt class="text-slate-500 dark:text-slate-400">{{ tf('message.settings.current_request_timeout', 'Request timeout') }}</dt>
                  <dd class="text-right font-semibold text-slate-900 dark:text-slate-100">{{ currentApiRequestTimeout }} ms</dd>
                </div>
                <div v-if="!isPublicSettingsMode" class="flex items-start justify-between gap-3">
                  <dt class="text-slate-500 dark:text-slate-400">{{ tf('message.settings.current_search_debounce', 'Search debounce') }}</dt>
                  <dd class="text-right font-semibold text-slate-900 dark:text-slate-100">{{ currentAdminSearchDebounce }} ms</dd>
                </div>
                <div v-if="!isPublicSettingsMode" class="flex items-start justify-between gap-3">
                  <dt class="text-slate-500 dark:text-slate-400">{{ tf('message.settings.current_time_format', 'Time format') }}</dt>
                  <dd class="text-right font-semibold text-slate-900 dark:text-slate-100">{{ currentTimeFormatLabel }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
            <ActionTextButton
              icon="bi bi-arrow-counterclockwise"
              tone="slate"
              shape="full"
              :disabled="isSavingSystemPreferences"
              @click="resetApiBaseUrl"
            >
              {{ tf('message.settings.api_endpoint_reset_action', 'Reset Endpoint') }}
            </ActionTextButton>
            <ActionTextButton
              v-if="!isPublicSettingsMode"
              icon="bi bi-stopwatch"
              tone="blue"
              shape="full"
              :disabled="isSavingSystemPreferences"
              @click="resetApiRequestTimeout"
            >
              {{ tf('message.settings.request_timeout_reset_action', 'Use 15000 ms') }}
            </ActionTextButton>
            <ActionTextButton
              v-if="!isPublicSettingsMode"
              icon="bi bi-hourglass-bottom"
              tone="rose"
              shape="full"
              :disabled="isSavingSystemPreferences"
              @click="resetAdminSearchDebounce"
            >
              {{ tf('message.settings.search_debounce_reset_action', 'Use 300 ms') }}
            </ActionTextButton>
            <ActionTextButton
              v-if="!isPublicSettingsMode"
              icon="bi bi-clock-history"
              tone="amber"
              shape="full"
              :disabled="isSavingSystemPreferences"
              @click="resetTimeFormat"
            >
              {{ tf('message.settings.time_format_reset_action', 'Use locale time') }}
            </ActionTextButton>
            <ActionTextButton
              v-if="!isPublicSettingsMode"
              icon="bi bi-layout-sidebar-inset"
              tone="emerald"
              shape="full"
              :disabled="isSavingSystemPreferences"
              @click="resetDefaultAdminPageSize"
            >
              {{ tf('message.settings.page_size_reset_action', 'Use 20 Rows') }}
            </ActionTextButton>
          </div>
        </section>

        <section v-if="!isPublicSettingsMode">
          <div class="rounded-3xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-900/20 p-6 text-sky-800 dark:text-sky-200">
            <div class="flex items-start gap-3">
              <i class="bi bi-info-circle-fill text-2xl"></i>
              <div>
                <h2 class="text-lg font-bold">{{ tf('message.settings.system_scope_title', 'Local scope and effect') }}</h2>
                <p class="mt-2 leading-7">{{ tf('message.settings.system_scope_body', 'Changing the endpoint affects future REAL API requests. Page size changes alter the default row count for admin lists. Search debounce adjusts how quickly admin filters hit the server again, and time format updates how timestamps are rendered across the admin UI.') }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';
import { useSettingsPage } from '/vue/composables/useSettingsPage.js';

const { tf } = useI18nFallback({ useScope: 'global' });

const {
  activeTab,
  availableTabs,
  canSaveSystemPreferences,
  cardClass,
  copiedTabKey,
  copyTabLabel,
  copyTabShareLink,
  currentApiMode,
  currentApiBaseUrl,
  currentApiRequestTimeout,
  currentAdminSearchDebounce,
  currentLanguage,
  currentTheme,
  currentTimeFormatLabel,
  defaultAdminPageSize,
  formatDate,
  heroSectionClass,
  inputClass,
  isPublicSettingsMode,
  isSavingSystemPreferences,
  lastSynced,
  openLoginModal,
  panelClass,
  pillClass,
  saveSystemPreferences,
  resetApiBaseUrl,
  resetApiRequestTimeout,
  resetAdminSearchDebounce,
  resetDefaultAdminPageSize,
  resetTimeFormat,
  selectTab,
  serverLanguageLabels,
  setApiMode,
  setLanguage,
  setTheme,
  showAccessDenied,
  summaryCards,
  supportedLanguages,
  systemPreferencesForm
} = useSettingsPage();
</script>