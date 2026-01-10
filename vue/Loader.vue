<template>
  <transition name="fade">
    <div v-if="!completed" class="loader-overlay">
      <div class="iso-scene">
        <div class="iso-world">
          <!-- The Stack -->
          <div class="stack-container">
            <!-- Base -->
            <div class="stack-base">
               <div class="face top"></div>
               <div class="face side-1"></div>
               <div class="face side-2"></div>
            </div>
            
            <!-- Dynamic Layers for Stages -->
            <div 
              v-for="(stage, index) in stages" 
              :key="stage.id"
              class="stack-layer"
              :class="{ 
                'active': progress[stage.id] > 0, 
                'completed': progress[stage.id] === 100,
                'current': progress[stage.id] > 0 && progress[stage.id] < 100
              }"
              :style="{ 
                '--layer-index': index, 
                'z-index': stages.length - index 
              }"
            >
              <div class="layer-plate">
                <div class="face top"></div>
                <div class="face side-1"></div>
                <div class="face side-2"></div>
              </div>
              
              <!-- Floating Label -->
              <div class="layer-label">
                <div class="label-line"></div>
                <div class="label-text">
                  <span class="status-dot"></span>
                  {{ stage.label }}
                  <span class="percentage" v-if="progress[stage.id] > 0">{{ Math.round(progress[stage.id]) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- HUD Overlay -->
        <div class="hud-overlay">
          <div class="header">
            <h1>{{ $t('message.title') }}</h1>
            <div class="sub-header">{{ $t('message.loader.system_init_sequence') }}</div>
          </div>
          
          <div class="footer-status">
            <div class="action-text">
              <span class="blink">></span> {{ currentAction }}
            </div>
            <div class="total-progress">
              {{ Math.round(totalProgress) }}<small>%</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Modal -->
      <div v-if="hasError" class="error-modal-overlay">
        <div class="error-modal-content">
          <h2 class="error-modal-title">{{ $t('message.error_modal.title') }}</h2>
          <p class="error-modal-text">{{ currentAction }}</p>
          <button @click="retryLoading" class="error-modal-button">{{ $t('message.error_modal.retry') }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script src="./Loader.js"></script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&display=swap');

.loader-overlay {
  font-family: 'Rajdhani', sans-serif;
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 1s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
}
</style>
