<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    <Navbar />
    <main class="container mx-auto px-4 py-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>
    </main>
    
    <button 
      @click="scrollToTop"
      class="fixed bottom-8 right-8 p-3 rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 z-50 transform translate-y-20 opacity-0"
      :class="{ '!translate-y-0 !opacity-100': showBackToTop }"
      :aria-label="$t('message.app.back_to_top')"
    >
      <i class="bi bi-arrow-up text-xl"></i>
    </button>
  </div>
</template>

<script>
import Navbar from '/vue/components/Navbar.vue';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useMainStore } from '/assets/js/stores/main.js';
import { setupMock } from '/assets/js/api.js';

export default {
  components: {
    Navbar
  },
  setup() {
    const store = useMainStore();
    
    // Initialize theme
    store.initTheme();
    
    // Initial mock setup
    setupMock(store.mockApi);
    
    // Watch mock setting
    watch(() => store.mockApi, (val) => {
      setupMock(val);
    });

    const showBackToTop = ref(false);

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
      scrollToTop,
    };
  }
}
</script>
