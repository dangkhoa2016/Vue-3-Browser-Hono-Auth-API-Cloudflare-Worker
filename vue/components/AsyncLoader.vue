<template>
  <div class="min-h-[60vh]">
    <div v-if="isLoading" class="flex flex-col items-center justify-center p-4 min-h-[60vh]">
      <div class="flex flex-col items-center w-full max-w-md">
        <div class="relative w-16 h-16 mb-6">
          <div class="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div class="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h3 class="text-lg font-bold text-slate-700">{{ $t('message.loader.loading_component_title') }}</h3>
        <p class="text-sm font-mono text-slate-400 mt-2 max-w-xs text-center truncate">{{ path }}</p>
      </div>
    </div>

    <div v-else-if="error" class="flex items-center justify-center p-4">
      <div class="max-w-lg w-full bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-800 dark:bg-slate-900/90 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 dark:border-slate-700/60">
        <div class="relative p-8 md-p-12 text-center">
          <!-- Background Decoration -->
          <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 via-fuchsia-500 to-indigo-500"></div>

          <div class="relative w-24 h-24 mx-auto mb-6">
            <div class="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-20"></div>
            <div class="relative flex items-center justify-center w-full h-full bg-rose-50 rounded-full text-rose-500 ring-8 ring-rose-50">
              <i class="bi bi-exclamation-triangle-fill text-4xl"></i>
            </div>
          </div>

          <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
            {{ error.message && (error.message.includes('404') || error.message.includes('Failed to fetch') || error.message.includes('Not Found')) ? $t('message.loader.component_not_found') : $t('message.page_load_error.title') }}
          </h2>

          <p class="text-slate-600 dark:text-slate-200/80 text-lg mb-8 leading-relaxed max-w-sm mx-auto">
            {{ $t('message.page_load_error.message') }}
          </p>

          <div class="mb-8 text-left">
            <div class="p-4 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-100 dark:border-red-800 overflow-hidden">
              <div class="text-xs font-bold text-red-500 dark:text-red-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span><i class="bi bi-bug-fill mr-2"></i> {{ $t('message.loader.error_details') }}</span>
                <span class="text-[10px] bg-red-100 dark:bg-red-900/60 px-2 py-0.5 rounded text-red-600 dark:text-red-200 font-mono">{{ path }}</span>
              </div>
              <pre class="font-mono text-xs text-red-600 dark:text-red-200 break-words whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">{{ error.stack || error.message || error }}</pre>
            </div>
          </div>

          <div class="space-y-4">
            <button
              @click="retry"
              class="group relative w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white bg-slate-900 rounded-2xl hover:bg-slate-800 transition-all duration-200 shadow-lg hover:shadow-slate-500/25 ring-offset-2 focus:ring-2 ring-slate-900"
            >
              <i class="bi bi-arrow-clockwise mr-2 text-xl group-hover:rotate-180 transition-transform duration-700"></i>
              <span>{{ $t('message.page_load_error.retry') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <transition
      mode="out-in"
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <component :is="resolvedComponent" />
    </transition>
  </div>
</template>

<script setup>
import { shallowRef, onMounted, onUnmounted, onActivated, onErrorCaptured } from 'vue';
import { sleep } from '/assets/js/helper.js';
import { getSfcOptions } from '/assets/js/appServices.js';

const props = defineProps({
  path: { type: String, required: true }
});

const resolvedComponent = shallowRef(null);
const error = shallowRef(null);
const isLoading = shallowRef(false);
let isMounted = true;

onErrorCaptured((err) => {
  // If the error is an API error (AxiosError, 401, etc) bubbling from a child component's
  // lifecycle/watch, let the component handle it locally rather than blowing up the whole view.
  if (err?.isAxiosError || err?.response?.status) {
    console.warn(`[AsyncLoader] API error captured from child ${props.path}, ignoring at loader level:`, err);
    return false;
  }

  console.error(`[AsyncLoader] Render error in ${props.path}:`, err);
  error.value = err;
  resolvedComponent.value = null;

  const sfcOptions = getSfcOptions();
  if (sfcOptions?.moduleCache?.[props.path]) {
    delete sfcOptions.moduleCache[props.path];
  }

  return false;
});

onUnmounted(() => {
  isMounted = false;
});

const fetchComponent = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  error.value = null;
  await sleep(250);

  if (window.NProgress) window.NProgress.start();

  const sfcOptions = getSfcOptions();
  // retryCount = 1 means one attempt only; retries are triggered explicitly via the UI button.
  const retryCount = 1;
  const retryDelay = 1000;

  for (let i = 0; i < retryCount; i++) {
    if (!isMounted) { isLoading.value = false; return; }
    try {
      const { loadModule } = window['vue3-sfc-loader'];
      const component = await loadModule(props.path, sfcOptions);
      if (!isMounted) { isLoading.value = false; return; }

      resolvedComponent.value = component;
      if (window.NProgress) window.NProgress.done();
      isLoading.value = false;
      return;
    } catch (err) {
      if (!isMounted) { isLoading.value = false; return; }

      if (sfcOptions?.moduleCache?.[props.path]) {
        delete sfcOptions.moduleCache[props.path];
      }

      console.warn(`Attempt ${i + 1} failed to load ${props.path}:`, err);
      if (i < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        error.value = err;
      }
    }
  }

  if (window.NProgress) window.NProgress.done();
  isLoading.value = false;
};

onMounted(fetchComponent);
onActivated(() => { if (error.value) fetchComponent(); });

const retry = () => {
  const sfcOptions = getSfcOptions();
  if (sfcOptions?.moduleCache?.[props.path]) {
    delete sfcOptions.moduleCache[props.path];
  }
  fetchComponent();
};
</script>
