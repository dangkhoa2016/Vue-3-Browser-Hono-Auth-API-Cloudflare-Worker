<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <section class="relative overflow-hidden rounded-3xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50 via-white to-violet-50 dark:from-indigo-950/60 dark:via-slate-900 dark:to-violet-950/40 p-6 shadow-sm">
      <div class="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-indigo-300/20 blur-2xl"></div>
      <div class="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-violet-300/20 blur-2xl"></div>
      <div class="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 dark:bg-indigo-900/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">
            <i class="bi bi-box text-xs"></i>
            {{ $t('message.public_endpoints.version.badge') }}
          </div>
          <h1 class="mt-3 text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{{ $t('message.public_endpoints.version.title') }}</h1>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ $t('message.public_endpoints.version.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2">
          <ActionTextButton
            tone="indigo"
            :icon="isLoading ? 'bi bi-arrow-clockwise animate-spin' : 'bi bi-arrow-clockwise'"
            :disabled="isLoading"
            @click="loadData"
          >
            {{ $t('message.refresh', 'Refresh') }}
          </ActionTextButton>
          <ActionTextButton
            variant="soft"
            :icon="'bi bi-code-square'"
            :disabled="!payload"
            @click="openJsonModal"
          >
            {{ $t('message.public_endpoints.common.view_json') }}
          </ActionTextButton>
        </div>
      </div>
    </section>

    <section v-if="isLoading" class="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
      <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
      <div class="md:col-span-4 h-56 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
    </section>

    <section v-else-if="errorMessage" class="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-5 text-rose-700 dark:text-rose-300">
      {{ errorMessage }}
    </section>

    <template v-else-if="payload">
      <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <article class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ $t('message.public_endpoints.version.service_name') }}</p>
          <p class="mt-2 text-xl font-black text-slate-900 dark:text-white">{{ endpointData.name || $t('message.public_endpoints.version.unknown_service') }}</p>
        </article>
        <article class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ $t('message.public_endpoints.common.version') }}</p>
          <p class="mt-2 text-xl font-black text-indigo-600 dark:text-indigo-400">{{ endpointData.version || $t('message.public_endpoints.common.unknown') }}</p>
        </article>
        <article class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ $t('message.public_endpoints.common.language') }}</p>
          <p class="mt-2 text-xl font-black text-slate-900 dark:text-white uppercase">{{ endpointData.language || $t('message.public_endpoints.common.unknown') }}</p>
        </article>
        <article class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ $t('message.public_endpoints.common.endpoint') }}</p>
          <p class="mt-2 text-xl font-black text-slate-900 dark:text-white">{{ endpointPath }}</p>
        </article>
      </section>

      <section class="grid grid-cols-1 gap-4">
        <article class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">{{ $t('message.public_endpoints.version.summary_title') }}</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ $t('message.public_endpoints.version.summary_subtitle') }}</p>
          <dl class="mt-4 space-y-2 text-sm">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500 dark:text-slate-400">{{ $t('message.public_endpoints.common.success') }}</dt>
              <dd class="font-semibold" :class="payload.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">{{ payload.success ? 'true' : 'false' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500 dark:text-slate-400">{{ $t('message.public_endpoints.common.message') }}</dt>
              <dd class="font-semibold text-slate-900 dark:text-white text-right">{{ endpointMessage }}</dd>
            </div>
          </dl>
        </article>
      </section>
    </template>

    <ModalWindow
      :show="showJsonModal"
      :title="$t('message.public_endpoints.common.raw_json')"
      :subtitle="$t('message.public_endpoints.version.title')"
      icon="bi bi-code-square"
      icon-bg-class="bg-indigo-100 dark:bg-indigo-900/30"
      icon-color-class="text-indigo-600 dark:text-indigo-400"
      panel-class="max-w-5xl"
      @close="closeJsonModal"
    >
      <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-100 p-4 overflow-auto max-h-[60vh]">
        <pre class="text-xs sm:text-sm leading-6">{{ formattedPayload }}</pre>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <ActionTextButton variant="soft" @click="closeJsonModal">
            {{ $t('message.common.close') }}
          </ActionTextButton>
        </div>
      </template>
    </ModalWindow>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import ModalWindow from '/vue/components/ModalWindow.vue';
import { useModalState } from '../composables/useModalState.js';

const { t } = useI18n({ useScope: 'global' });
const mainStore = useMainStore();
const isLoading = ref(false);
const errorMessage = ref('');
const payload = ref(null);
const jsonModal = useModalState({ initialMode: 'json' });
const showJsonModal = jsonModal.isOpen;

const endpointData = computed(() => payload.value?.data || {});
const endpointMessage = computed(() => payload.value?.message || payload.value?.data?.message || '—');
const formattedPayload = computed(() => JSON.stringify(payload.value ?? {}, null, 2));
const endpointPath = API_ENDPOINTS.PUBLIC_VERSION;

const loadData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    const response = await apiClient.get(endpointPath);
    payload.value = response.data;
  } catch (err) {
    errorMessage.value = err?.response?.data?.error || err?.message || t('message.public_endpoints.version.load_error');
  } finally {
    isLoading.value = false;
  }
};

const openJsonModal = () => {
  if (!payload.value) return;
  jsonModal.open(null, 'json');
};

const closeJsonModal = () => {
  jsonModal.close({ reset: true });
};

watch(() => mainStore.mockApi, async (value, oldValue) => {
  if (value === oldValue) return;
  await loadData();
});

onMounted(loadData);
</script>
