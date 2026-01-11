<template>
  <div class="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center">
    <!-- Background Effects -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div class="container mx-auto px-4 relative z-10 text-center space-y-12">
      <!-- Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-sm font-medium text-blue-600 dark:text-blue-300 shadow-lg hover:scale-105 transition-transform cursor-default">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        {{ $t('message.home.badge') }}
      </div>

      <!-- Main Title -->
      <div class="space-y-6 max-w-4xl mx-auto">
        <h1 class="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
          {{ $t('message.home.hero.title_start') }} <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">{{ $t('message.home.hero.title_emphasis') }}</span>
          <br /> {{ $t('message.home.hero.title_end') }}
        </h1>
        <p class="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
           {{ $t('message.home.hero.subtitle') }}
        </p>
      </div>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <button 
          class="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
          :title="$t('message.home.cta.get_started_title')"
        >
          <i class="bi bi-rocket-takeoff group-hover:rotate-12 transition-transform"></i>
          {{ $t('message.home.cta.get_started') }}
        </button>
        <button 
          class="w-full sm:w-auto px-8 py-4 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
          :title="$t('message.home.cta.documentation_title')"
        >
          <i class="bi bi-github"></i>
          {{ $t('message.home.cta.documentation') }}
        </button>
      </div>

      <!-- Tech Stack -->
      <div class="pt-16 border-t border-gray-200 dark:border-gray-800 max-w-5xl mx-auto">
         <p class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-8">{{ $t('message.home.tech.heading') }}</p>
         <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div 
              class="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors backdrop-blur-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
              :title="$t('message.home.tech.hono_title')"
            >
              <i class="bi bi-lightning-charge-fill text-3xl text-yellow-500 group-hover:scale-110 transition-transform"></i>
              <span class="font-bold text-gray-700 dark:text-gray-200">Hono.js</span>
            </div>
            <div 
              class="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors backdrop-blur-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
              :title="$t('message.home.tech.d1_title')"
            >
              <i class="bi bi-database-fill text-3xl text-blue-500 group-hover:scale-110 transition-transform"></i>
              <span class="font-bold text-gray-700 dark:text-gray-200">Cloudflare D1</span>
            </div>
            <div 
              class="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors backdrop-blur-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
              :title="$t('message.home.tech.jwt_title')"
            >
              <i class="bi bi-shield-lock-fill text-3xl text-green-500 group-hover:scale-110 transition-transform"></i>
              <span class="font-bold text-gray-700 dark:text-gray-200">JWT Auth</span>
            </div>
            <div 
              class="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors backdrop-blur-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
              :title="$t('message.home.tech.edge_title')"
            >
              <i class="bi bi-globe-americas text-3xl text-purple-500 group-hover:scale-110 transition-transform"></i>
              <span class="font-bold text-gray-700 dark:text-gray-200">Cloudflare Edge</span>
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px) saturate(1.5);
  opacity: 0.5;
  animation: blob 3s ease-in-out infinite alternate;
}
.orb-1 {
  top: -30%;
  right: -10%;
  width: 60rem;
  height: 60rem;
  background: radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.8), rgba(59, 130, 246, 0.3));
  animation-delay: 0s;
}
.orb-2 {
  top: 20%;
  left: -20%;
  width: 50rem;
  height: 50rem;
  background: radial-gradient(circle at 60% 20%, rgba(59, 130, 246, 0.7), rgba(99, 102, 241, 0.25));
  animation-delay: 2s;
}
.orb-3 {
  bottom: -20%;
  left: 20%;
  width: 45rem;
  height: 45rem;
  background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.7), rgba(56, 189, 248, 0.25));
  animation-delay: 4s;
}
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(80px, -100px) scale(1.2); }
  66% { transform: translate(-60px, 60px) scale(0.85); }
  100% { transform: translate(0px, 0px) scale(1.1); }
}
</style>