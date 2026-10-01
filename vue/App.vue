<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    <Navbar />
    <main class="container mx-auto px-4 py-8">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <keep-alive :include="keepAliveRouteNames">
            <component :is="Component" :key="route.name || route.fullPath" />
          </keep-alive>
        </transition>
      </router-view>
    </main>
    
    <!-- Session durability: this tab cannot promise the session will still be here after a reload. -->
    <SessionPersistenceWarning
      v-if="sessionPersistenceWarning" :tone="sessionPersistenceWarning.tone"
      :icon="sessionPersistenceWarning.icon" :message="$t(sessionPersistenceWarning.key)"
      :close-label="$t('message.auth.close')" @dismiss="dismissSessionPersistenceWarning" />

    <ToastNotification />

    <button 
      @click="scrollToTop"
      :class="[backToTopButtonClass, { '!translate-y-0 !opacity-100': showBackToTop }]"
      :aria-label="$t('message.app.back_to_top')"
    >
      <i class="bi bi-arrow-up text-xl"></i>
    </button>
  </div>
</template>

<script>
import Navbar from '/vue/components/Navbar.vue';
import ToastNotification from '/vue/components/ToastNotification.vue';
import SessionPersistenceWarning from '/vue/components/SessionPersistenceWarning.vue';
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore, SESSION_PERSISTENCE } from '/assets/js/stores/authStore.js';
import { setupMock } from '/assets/js/api.js';

export default {
  components: {
    Navbar,
    ToastNotification,
    SessionPersistenceWarning
  },
  setup() {
    const store = useMainStore();
    const authStore = useAuthStore();
    const router = useRouter();
    
    // Initialize persisted browser preferences
    store.initPreferences();
    
    // Initial mock setup
    setupMock(store.mockApi);
    
    // Watch mock setting
    watch(() => store.mockApi, (val) => {
      setupMock(val);
    });

    /**
     * Whether this tab's session is durable. Both facts already existed in the store and neither
     * could reach the user: a memory-only session looked like a normal one until a reload signed
     * the user out, and a write that just failed looked like one that succeeded — so this tab could
     * silently disagree with every other tab. The banner is what makes them visible.
     */
    const sessionPersistenceDismissed = ref(false);

    // Dismissing mutes the current reason, not the feature: a later failure speaks again.
    watch(
      () => [authStore.sessionPersistence, authStore.storageDegraded],
      () => { sessionPersistenceDismissed.value = false; }
    );

    // Memory-only is checked first on purpose. A tab without Web Locks reports every write as
    // failed, so the generic "could not be saved" is also true there — and it is the less useful of
    // the two: "reloading signs you out" is the answer, "a write failed" sends the user looking for
    // storage that was never used.
    const sessionPersistenceWarning = computed(() => {
      if (sessionPersistenceDismissed.value) return null;
      if (authStore.sessionPersistence === SESSION_PERSISTENCE.MEMORY_ONLY) {
        return { tone: 'amber', key: 'message.auth.session_memory_only', icon: 'bi bi-exclamation-triangle-fill' };
      }
      if (authStore.storageDegraded === true) {
        return { tone: 'rose', key: 'message.auth.session_write_degraded', icon: 'bi bi-x-octagon-fill' };
      }
      return null;
    });

    const showBackToTop = ref(false);
    const backToTopButtonClass = 'fixed bottom-8 right-8 p-3 rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 z-50 transform translate-y-20 opacity-0';
    const keepAliveRouteNames = computed(() => {
      return router
        .getRoutes()
        .filter((route) => route.meta?.keepAlive && typeof route.name === 'string')
        .map((route) => route.name);
    });

    const handleScroll = () => {
      showBackToTop.value = window.scrollY > 300;
    };

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    onMounted(() => {
      window.addEventListener('scroll', handleScroll);
    });

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll);
    });

    return {
      showBackToTop,
      backToTopButtonClass,
      keepAliveRouteNames,
      scrollToTop,
      sessionPersistenceWarning,
      dismissSessionPersistenceWarning: () => { sessionPersistenceDismissed.value = true; },
    };
  }
}
</script>
