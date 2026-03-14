import { reactive, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { sleep } from '/assets/js/helper.js';
import { safeFetch, safeImport, loadStyle, loadJs } from '/assets/js/utils/loaderUtils.js';

export default {
  setup() {
    const { t } = useI18n({ useScope: 'global' });
    const currentAction = ref(t('message.loader.initializing'));
    const currentStage = ref('');
    const stageCurrentItem = reactive({});
    const completed = ref(false);
    const hasError = ref(false);

    const runStageWithItems = async (stage) => {
      const totalItems = stage.items.length || 1;
      const step = 100 / totalItems;

      for (const item of stage.items) {
        if (hasError.value) return; // Immediate stop if previous item failed

        const label = item.label || item.url || item.label || String(item);
        stageCurrentItem[stage.id] = label;
        const stageLabel = stage.label || '';
        currentAction.value = t('message.loader.loading', { stage: stageLabel, item: label });
        if (item.run) {
          await item.run(stageLabel);
        } else if (stage.loader) {
          await stage.loader(item, stageLabel);
        }
        progress[stage.id] = Math.min(100, progress[stage.id] + step);
        // // await sleep(100); // delay removed // delay removed
      }

      stageCurrentItem[stage.id] = '';
      progress[stage.id] = 100;
    };

    const makeStage = ({ id, label, items, loader }) => ({ id, label, items, loader, action: () => runStageWithItems({ id, label, items, loader }) });

    // Configuration for stages with per-item progress
    const stages = computed(() => [
      makeStage({
        id: 'assets',
        label: t('message.loader.assets') || 'Assets',
        loader: async (item) => {
          await loadStyle({ t, currentAction }, item, t('message.loader.assets'));
        },
        items: [
          { label: t('message.loader.items.nprogress_css'), url: 'https://unpkg.com/nprogress@0.2.0/nprogress.css' },
          { label: t('message.loader.items.bootstrap_icons'), url: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css' },
          { label: t('message.loader.items.app_styles'), url: '/assets/css/styles.css' },
        ]
      }),
      makeStage({
        id: 'libraries',
        label: t('message.loader.libraries') || 'Libraries',
        loader: async (item) => {
          await loadJs({ t, currentAction }, item, t('message.loader.libraries'));
        },
        items: [
          { 
            label: t('message.loader.items.tailwind_css'), 
            url: 'https://cdn.tailwindcss.com',
            run: async (stageLabel) => {
              // Load Tailwind
              const script = document.createElement('script');
              script.src = 'https://cdn.tailwindcss.com';
              
              await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
              
              // Wait for Tailwind to fully initialize
              await sleep(500);
              
              // Configure Tailwind for dark mode
              const configScript = document.createElement('script');
              configScript.textContent = `
                tailwind.config = {
                  darkMode: 'class'
                }
              `;
              document.head.appendChild(configScript);
              
              // Wait for config to be processed
              await sleep(300);
            }
          },
          { label: t('message.loader.items.vue_demi'), url: 'https://unpkg.com/vue-demi', crossOrigin: 'anonymous' },
          { label: t('message.loader.items.pinia'), url: 'https://cdn.jsdelivr.net/npm/pinia@3.0.4/dist/pinia.iife.prod.js', crossOrigin: 'anonymous' },
          { label: t('message.loader.items.nprogress_js'), url: 'https://unpkg.com/nprogress@0.2.0/nprogress.js', crossOrigin: 'anonymous' },
          { label: t('message.loader.items.axios'), url: 'https://unpkg.com/axios/dist/axios.min.js', crossOrigin: 'anonymous' },
          { label: t('message.loader.items.axios_mock'), url: 'https://unpkg.com/axios-mock-adapter/dist/axios-mock-adapter.min.js', crossOrigin: 'anonymous' },
          { label: t('message.loader.items.vue_router'), url: 'https://unpkg.com/vue-router@4/dist/vue-router.global.js', crossOrigin: 'anonymous' },
        ]
      }),
      makeStage({
        id: 'components',
        label: t('message.loader.components') || 'Components',
        loader: async (item) => {
          await safeFetch({ t, currentAction }, item.url, t('message.loader.components'));
        },
        items: [
          { label: t('message.loader.items.app_vue'), url: '/vue/App.vue' }
        ]
      }),
      makeStage({
        id: 'store',
        label: t('message.loader.store') || 'Store',
        loader: async (item) => {
          await safeImport({ t, currentAction }, item, t('message.loader.store'));
        },
        items: [
          { label: t('message.loader.items.main_store'), url: '/assets/js/stores/mainStore.js' }
        ]
      }),
      makeStage({
        id: 'app',
        label: t('message.loader.app') || 'App',
        items: [
          {
            label: t('message.loader.starting_app'),
            run: async () => {
              currentAction.value = t('message.loader.starting_app');
              if (window.initMainApp) {
                const result = await window.initMainApp();
                if (result === false)
                  throw new Error(t('message.errors.init_failed'));
              } else {
                throw new Error(t('message.errors.init_undefined'));
              }
            }
          }
        ]
      }),
      makeStage({
        id: 'finalizing',
        label: t('message.loader.finalizing') || 'Finalizing',
        items: [
          {
            label: t('message.loader.finalizing'),
            run: async () => {
              currentAction.value = t('message.loader.finalizing') + '...';
              // // await sleep(1500); // delay removed // delay removed
            }
          }
        ]
      })
    ]);

    // Initialize progress
    const progress = reactive({});
    // Note: stages is now a computed, so we need to watch it or init differently
    // But for simplicity, we can just init all potential IDs or init on start
    // Let's just init based on the first value
    stages.value.forEach(s => {
      progress[s.id] = 0;
      stageCurrentItem[s.id] = '';
    });

    const totalProgress = computed(() => {
      const total = stages.value.length * 100;
      const current = stages.value.reduce((acc, stage) => acc + (progress[stage.id] || 0), 0);
      return (current / total) * 100;
    });

    const progressClass = computed(() => {
      const p = totalProgress.value;
      const stageCount = stages.value.length;
      const epsilon = 1e-6; // avoid floating point rounding down one bucket

      const bucketSize = 100 / stageCount;
      // Map progress into 0...(stageCount-1)
      let index = Math.min(Math.floor((p + epsilon) / bucketSize), stageCount - 1);

      // Show success only when we are actually done (or essentially done)
      if (completed.value || p >= 99.9) return 'bg-success';

      const colors = ['bg-info', 'bg-warning', 'bg-purple', 'bg-pink', 'bg-brown', 'bg-gray'];
      return colors[index % colors.length];
    });

    const finishLoadApp = () => {
      // Mark as completed
      completed.value = true;

      const timeToShow = 1000; // ms, see `.fade-leave-active { transition: opacity 0.8s ease; }` in loader.css
      document.getElementById('app').classList.add('visible');

      // Hide loader container completely after transition
      setTimeout(() => {
        const loaderEl = document.getElementById('loader');
        if (loaderEl) loaderEl.style.display = 'none';

        const loaderCss = document.getElementById('loader-css');
        if (loaderCss) loaderCss.remove();
      }, timeToShow);
    };

    const startLoading = async () => {
      try {
        for (const stage of stages.value) {
          if (hasError.value) break; // Double check to ensure we stop
          currentStage.value = stage.label;
          await stage.action();
          // await sleep(200); // removed
        }
      } catch (e) {
        console.log('Error during loading stages:', e);
        hasError.value = true;
        const msg = e instanceof Error ? e.message : (typeof e === 'string' ? e : t('message.errors.unknown_error'));
        currentAction.value = t('message.loader.error_loading', { stage: currentStage.value, message: msg });
        console.error(e);
      }

      if (!hasError.value)
        finishLoadApp();
    };

    const retryLoading = () => {
      window.location.reload();
    };

    const getStageLayerClass = (stageId) => ({
      active: progress[stageId] > 0,
      completed: progress[stageId] === 100,
      current: progress[stageId] > 0 && progress[stageId] < 100
    });

    return {
      progress,
      stages,
      currentAction,
      currentStage,
      stageCurrentItem,
      completed,
      totalProgress,
      progressClass,
      startLoading,
      hasError,
      retryLoading,
      getStageLayerClass
    };
  },
  mounted() {
    this.startLoading();
  }
}
