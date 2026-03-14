const { createApp } = Vue;
const { loadModule } = window['vue3-sfc-loader'];
import * as I18nModule from '/assets/js/i18n.js';
import * as AppServices from '/assets/js/appServices.js';
const { loadLanguageAsync, detectBrowserLanguage } = I18nModule;
const { setSfcOptions, setAppServices } = AppServices;

const options = {
  moduleCache: {
    vue: Vue,
    'vue-i18n': VueI18n,
    '/assets/js/i18n.js': I18nModule,
    // appServices must be in cache from the start so AsyncLoader.vue can import it via sfc-loader
    '/assets/js/appServices.js': AppServices,
  },
  async getFile(url) {
    const res = await fetch(url);
    if (!res.ok)
      throw Object.assign(new Error(res.status + ' ' + res.statusText + ' ' + url), { res });

    if (url.match(/\.(png|jpe?g|gif|svg|ico|webp)$/i)) {
      return {
        getContentData: (asBinary) => asBinary ? res.arrayBuffer() : `export default "${url}"`,
        type: '.mjs'
      }
    }

    return {
      getContentData: asBinary => asBinary ? res.arrayBuffer() : res.text(),
      type: url.endsWith('.js') ? '.mjs' : undefined
    }
  },
  addStyle(textContent) {
    const style = document.createElement('style');
    style.textContent = textContent;
    const ref = document.head.getElementsByTagName('style')[0] || null;
    document.head.insertBefore(style, ref);
  }
};

// Register sfc-loader options via appServices so all modules can access via getSfcOptions().
// Must be called before initMainApp() because router.js uses getSfcOptions() at module load time.
setSfcOptions(options);

// Main App Logic
async function initMainApp() {
  const { createPinia } = Pinia;

  // Populate module cache BEFORE importing router.js.
  // router.js uses a top-level await to load AsyncLoader.vue via loadModule(),
  // so the cache must have vue-router/pinia/axios entries ready at that point.
  options.moduleCache['vue-router'] = VueRouter;
  options.moduleCache['pinia'] = Pinia;
  options.moduleCache['axios'] = window.axios;

  // Load modules dynamically
  const routerModule = await import('/assets/js/router.js');
  const apiModule = await import('/assets/js/api.js');
  const authStoreModule = await import('/assets/js/stores/authStore.js');
  const modalStoreModule = await import('/assets/js/stores/modalStore.js');
  const { router } = routerModule;
  const { setupMock } = apiModule;

  // Register remaining module instances so sfc-loader uses the same singletons
  options.moduleCache['/assets/js/router.js'] = routerModule;
  options.moduleCache['/assets/js/api.js'] = apiModule;
  options.moduleCache['/assets/js/stores/authStore.js'] = authStoreModule;
  options.moduleCache['/assets/js/stores/modalStore.js'] = modalStoreModule;

  try {
    const App = await loadModule('/vue/App.vue', options);
    const app = createApp(App);
    const pinia = createPinia();
    app.use(pinia);
    app.use(router);
    app.use(window.i18nInstance);

    const { useAuthStore } = authStoreModule;
    const { useModalStore } = modalStoreModule;
    const toastStoreModule = await import('/assets/js/stores/toastStore.js');
    options.moduleCache['/assets/js/stores/toastStore.js'] = toastStoreModule;

    // Register store instances via appServices (replaces window.authStore/modalStore/toastStore).
    // Must be called before app.mount() so post-mount component code can safely call getAuthStore() etc.
    setAppServices({
      authStore: useAuthStore(pinia),
      modalStore: useModalStore(pinia),
      toastStore: toastStoreModule.useToastStore(pinia),
    });

    // Catch unhandled Vue component errors globally so they don't silently disappear
    app.config.errorHandler = (err, _instance, info) => {
      console.error('[Vue] Unhandled error in', info, err);
      AppServices.getToastStore()?.error?.('An unexpected error occurred.');
    };

    // Default to mock API
    setupMock(true);

    app.mount('#app');
    return true;
  } catch (err) {
    console.log("Failed to load main app:", err);
    const loaderEl = document.getElementById('loader');
    if (loaderEl) {
      loaderEl.innerHTML = `
        <div class="error-modal-overlay">
          <div class="error-modal-content">
            <h2 class="error-modal-title">Application Error</h2>
            <p class="error-modal-text">Failed to load the main application.</p>
            <div class="error-modal-details">
              ${err.message}
            </div>
            <button onclick="location.reload()" class="error-modal-button">Retry</button>
          </div>
        </div>
      `;
    }

    return false;
  }
}

// Expose initMainApp globally so Loader.vue can call it
window.initMainApp = initMainApp;

// Initialize Loader
(async () => {
  try {
    // Detect and load initial language BEFORE mounting loader
    const initialLang = detectBrowserLanguage();
    await loadLanguageAsync(initialLang);

    const Loader = await loadModule('/vue/Loader.vue', options);
    const loaderApp = createApp(Loader);

    // Use i18n in loaderApp
    loaderApp.use(window.i18nInstance);

    loaderApp.mount('#loader');
  } catch (err) {
    console.error("Failed to load loader component:", err);
    document.body.innerHTML = `
      <div class="error-modal-overlay">
        <div class="error-modal-content">
          <h2 class="error-modal-title">System Error</h2>
          <p class="error-modal-text">Failed to initialize application loader.</p>
          <div class="error-modal-details">
            ${err.message}
          </div>
          <button onclick="location.reload()" class="error-modal-button">Retry</button>
        </div>
      </div>
    `;
  }
})();
