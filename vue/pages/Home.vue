<template>
  <div class="technical-home space-y-14 md:space-y-20">
    <section class="home-hero overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div class="home-hero-copy">
        <p class="home-eyebrow text-blue-700 dark:text-blue-300"><span aria-hidden="true">&lt;/&gt;</span> {{ $t('message.home.eyebrow') }}</p>
        <h1 class="home-title text-slate-950 dark:text-white">
          {{ $t('message.home.hero.title') }}
          <span class="text-blue-600 dark:text-blue-400">{{ $t('message.home.hero.emphasis') }}</span>
        </h1>
        <p class="mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">{{ $t('message.home.hero.description') }}</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a :href="frontendSource" target="_blank" rel="noopener noreferrer" class="home-button bg-blue-600 text-white hover:bg-blue-700">
            <i class="bi bi-github" aria-hidden="true"></i> {{ $t('message.home.links.frontend') }}
            <i class="bi bi-arrow-up-right text-xs" aria-hidden="true"></i>
          </a>
          <button type="button" class="home-button border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800" @click="showArchitecture">
            {{ $t('message.home.links.architecture') }} <i class="bi bi-arrow-down" aria-hidden="true"></i>
          </button>
        </div>
        <p class="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ $t('message.home.hero.note') }}</p>
      </div>

      <div class="home-blueprint" role="img" :aria-label="$t('message.home.diagram.description')">
        <div class="flex items-center justify-between gap-4 border-b border-slate-600/60 pb-5">
          <span class="home-eyebrow text-slate-300">{{ $t('message.home.diagram.title') }}</span>
          <i class="bi bi-diagram-3 text-xl text-cyan-300" aria-hidden="true"></i>
        </div>
        <div class="flow-node mt-7">
          <i class="bi bi-window text-cyan-300" aria-hidden="true"></i>
          <div><p class="flow-caption">{{ $t('message.home.diagram.browser') }}</p><p class="font-semibold">Vue 3 <span class="text-slate-400">/</span> Pinia <span class="text-slate-400">/</span> Axios</p></div>
          <span class="flow-index" aria-hidden="true">01</span>
        </div>
        <div class="flow-connector"><span aria-hidden="true">↓</span> HTTPS · JSON</div>
        <div class="flow-node">
          <i class="bi bi-lightning-charge text-amber-300" aria-hidden="true"></i>
          <div><p class="flow-caption">{{ $t('message.home.diagram.api') }}</p><p class="font-semibold">Hono <span class="text-slate-400">/</span> Cloudflare Workers</p></div>
          <span class="flow-index" aria-hidden="true">02</span>
        </div>
        <div class="flow-connector"><span aria-hidden="true">↓</span> {{ $t('message.home.diagram.bindings') }}</div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flow-storage"><i class="bi bi-database text-sky-300" aria-hidden="true"></i><p class="mt-3 font-semibold">Cloudflare D1</p><p class="mt-1 text-xs leading-5 text-slate-300">{{ $t('message.home.diagram.data') }}</p></div>
          <div class="flow-storage"><i class="bi bi-sliders text-violet-300" aria-hidden="true"></i><p class="mt-3 font-semibold">Workers KV</p><p class="mt-1 text-xs leading-5 text-slate-300">{{ $t('message.home.diagram.config') }}</p></div>
        </div>
        <p class="mt-5 text-xs leading-6 text-slate-400">{{ $t('message.home.diagram.note') }}</p>
      </div>
    </section>

    <section aria-labelledby="technology-title">
      <div class="home-section-heading">
        <h2 id="technology-title" class="home-eyebrow text-slate-500 dark:text-slate-400">{{ $t('message.home.technology.title') }}</h2>
        <span class="text-xs text-slate-500 dark:text-slate-400">{{ $t('message.home.technology.note') }}</span>
      </div>
      <div class="home-technology-grid mt-5 border-y border-slate-200 dark:border-slate-700">
        <div v-for="technology in technologies" :key="technology.name" class="py-5">
          <p class="font-bold text-slate-900 dark:text-slate-100">{{ technology.name }}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ technology.role }}</p>
        </div>
      </div>
    </section>

    <section id="architecture" ref="architecture" tabindex="-1" aria-labelledby="architecture-title" class="home-anchor">
      <div class="home-section-heading items-end">
        <div><p class="home-eyebrow text-blue-700 dark:text-blue-300">{{ $t('message.home.architecture.eyebrow') }}</p><h2 id="architecture-title" class="home-heading mt-3 text-slate-900 dark:text-white">{{ $t('message.home.architecture.title') }}</h2></div>
        <p class="max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-300">{{ $t('message.home.architecture.description') }}</p>
      </div>
      <ol class="mt-8 grid gap-5 lg:grid-cols-3">
        <li v-for="(layer, index) in layers" :key="layer.title" class="home-layer rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div class="flex items-center justify-between gap-4"><span class="home-step text-blue-600 dark:text-blue-400" aria-hidden="true">0{{ index + 1 }}</span><i :class="layer.icon" class="text-xl text-slate-400" aria-hidden="true"></i></div>
          <h3 class="mt-6 text-lg font-bold text-slate-900 dark:text-white">{{ layer.title }}</h3>
          <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ layer.body }}</p>
          <p class="mt-6 border-t border-slate-100 pt-4 font-mono text-xs leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">{{ layer.stack }}</p>
        </li>
      </ol>
    </section>

    <section aria-labelledby="capabilities-title" class="home-capabilities rounded-3xl border border-slate-200 bg-slate-100/70 p-6 md:p-10 dark:border-slate-700 dark:bg-slate-800/40">
      <p class="home-eyebrow text-blue-700 dark:text-blue-300">{{ $t('message.home.capabilities.eyebrow') }}</p>
      <h2 id="capabilities-title" class="home-heading mt-3 text-slate-900 dark:text-white">{{ $t('message.home.capabilities.title') }}</h2>
      <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{{ $t('message.home.capabilities.description') }}</p>
      <div class="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
        <article v-for="feature in features" :key="feature.title" class="flex gap-4">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300"><i :class="feature.icon" aria-hidden="true"></i></span>
          <div><h3 class="font-bold text-slate-900 dark:text-white">{{ feature.title }}</h3><p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ feature.body }}</p></div>
        </article>
      </div>
    </section>

    <section aria-labelledby="source-title">
      <p class="home-eyebrow text-blue-700 dark:text-blue-300">{{ $t('message.home.source.eyebrow') }}</p>
      <h2 id="source-title" class="home-heading mt-3 text-slate-900 dark:text-white">{{ $t('message.home.source.title') }}</h2>
      <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{{ $t('message.home.source.description') }}</p>
      <div class="mt-8 grid gap-5 md:grid-cols-2">
        <article class="home-repository rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <p class="home-eyebrow text-slate-500 dark:text-slate-400">{{ $t('message.home.source.client_label') }}</p>
          <h3 class="mt-4 text-xl font-bold text-slate-900 dark:text-white">Vue 3 Browser</h3>
          <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ $t('message.home.source.client_body') }}</p>
          <p class="mt-4 font-mono text-xs text-slate-500 dark:text-slate-400">vue/ · assets/js/ · tests/</p>
          <a :href="frontendSource" target="_blank" rel="noopener noreferrer" class="home-text-link mt-6 text-blue-700 dark:text-blue-300"><i class="bi bi-github" aria-hidden="true"></i> {{ $t('message.home.links.frontend') }} <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
        </article>
        <article class="home-repository rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <p class="home-eyebrow text-slate-500 dark:text-slate-400">{{ $t('message.home.source.server_label') }}</p>
          <h3 class="mt-4 text-xl font-bold text-slate-900 dark:text-white">Hono Auth API</h3>
          <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ $t('message.home.source.server_body') }}</p>
          <p class="mt-4 font-mono text-xs text-slate-500 dark:text-slate-400">Cloudflare Workers · D1 · KV</p>
          <a :href="backendSource" target="_blank" rel="noopener noreferrer" class="home-text-link mt-6 text-blue-700 dark:text-blue-300"><i class="bi bi-github" aria-hidden="true"></i> {{ $t('message.home.links.backend') }} <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
        </article>
      </div>
      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <a v-for="document in documents" :key="document.path" :href="`${frontendSource}/blob/main/documents/${document.path}`" target="_blank" rel="noopener noreferrer" class="home-doc-link rounded-xl border border-slate-200 px-5 py-4 text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-400">
          <i class="bi bi-file-earmark-code text-blue-600 dark:text-blue-400" aria-hidden="true"></i><span>{{ document.title }}</span><i class="bi bi-arrow-up-right text-xs text-slate-400" aria-hidden="true"></i>
        </a>
      </div>
    </section>

    <section aria-labelledby="explore-title" class="home-explore rounded-3xl border border-blue-200 bg-blue-50/70 p-6 md:p-10 dark:border-blue-800 dark:bg-blue-950/30">
      <div>
        <p class="home-eyebrow text-blue-700 dark:text-blue-300">{{ $t('message.home.explore.eyebrow') }}</p>
        <h2 id="explore-title" class="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{{ $t('message.home.explore.title') }}</h2>
        <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{{ $t('message.home.explore.description') }}</p>
        <div class="mt-5 flex flex-wrap gap-x-5 gap-y-3">
          <router-link to="/health" class="home-text-link text-slate-700 dark:text-slate-200"><i class="bi bi-heart-pulse" aria-hidden="true"></i> {{ $t('message.home.explore.health') }}</router-link>
          <router-link to="/version" class="home-text-link text-slate-700 dark:text-slate-200"><i class="bi bi-box-seam" aria-hidden="true"></i> {{ $t('message.home.explore.version') }}</router-link>
          <router-link to="/settings" class="home-text-link text-slate-700 dark:text-slate-200"><i class="bi bi-sliders" aria-hidden="true"></i> {{ $t('message.home.explore.settings') }}</router-link>
        </div>
      </div>
      <router-link v-if="authStore.isAuthenticated" id="home-session-action" to="/profile" data-testid="home-session-action" class="home-button bg-blue-600 text-white hover:bg-blue-700">
        {{ $t('message.home.explore.profile') }} <i class="bi bi-arrow-right" aria-hidden="true"></i>
      </router-link>
      <button v-else id="home-session-action" type="button" data-testid="home-session-action" class="home-button bg-blue-600 text-white hover:bg-blue-700" @click="modalStore.openLogin()">
        {{ $t('message.home.explore.sign_in') }} <i class="bi bi-arrow-right" aria-hidden="true"></i>
      </button>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';

const { t } = useI18n({ useScope: 'global' });
const authStore = useAuthStore();
const modalStore = useModalStore();
const architecture = ref(null);
const frontendSource = 'https://github.com/dangkhoa2016/Vue-3-Browser-Hono-Auth-API-Cloudflare-Worker';
const backendSource = 'https://github.com/dangkhoa2016/Hono-Auth-API-Cloudflare-Worker';

const showArchitecture = () => {
  architecture.value?.focus({ preventScroll: true });
  architecture.value?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  });
};

const technologies = computed(() => [
  { name: 'Vue 3', role: t('message.home.technology.vue') },
  { name: 'Pinia', role: t('message.home.technology.pinia') },
  { name: 'Hono', role: t('message.home.technology.hono') },
  { name: 'Workers', role: t('message.home.technology.workers') },
  { name: 'D1', role: t('message.home.technology.d1') },
  { name: 'Workers KV', role: t('message.home.technology.kv') }
]);
const layers = computed(() => [
  { title: t('message.home.architecture.client_title'), body: t('message.home.architecture.client_body'), stack: 'Vue 3 · Vue Router · Pinia · Axios', icon: 'bi bi-window' },
  { title: t('message.home.architecture.api_title'), body: t('message.home.architecture.api_body'), stack: 'Hono · JWT · Cloudflare Workers', icon: 'bi bi-braces' },
  { title: t('message.home.architecture.data_title'), body: t('message.home.architecture.data_body'), stack: 'Cloudflare D1 · Workers KV', icon: 'bi bi-database' }
]);
const features = computed(() => [
  { title: t('message.home.capabilities.users_title'), body: t('message.home.capabilities.users_body'), icon: 'bi bi-people' },
  { title: t('message.home.capabilities.audit_title'), body: t('message.home.capabilities.audit_body'), icon: 'bi bi-shield-check' },
  { title: t('message.home.capabilities.monitoring_title'), body: t('message.home.capabilities.monitoring_body'), icon: 'bi bi-activity' },
  { title: t('message.home.capabilities.config_title'), body: t('message.home.capabilities.config_body'), icon: 'bi bi-toggles' }
]);
const documents = computed(() => [
  { path: 'DOCUMENTATION_INDEX.md', title: t('message.home.source.docs') },
  { path: 'APP_RUNTIME_AND_LOADING.md', title: t('message.home.source.runtime') },
  { path: 'AUTH_AND_SESSION_FLOW.md', title: t('message.home.source.auth') }
]);
</script>

<style scoped>
.technical-home { max-width: 1248px; margin-inline: auto; overflow-wrap: anywhere; }
.home-hero { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); box-shadow: 0 12px 40px -32px rgba(15, 23, 42, .35); }
.home-hero-copy { padding: clamp(1.5rem, 4vw, 3.5rem); align-self: center; }
.home-eyebrow { font-size: .7rem; line-height: 1.6; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
.home-title { max-width: 13em; margin-top: 1.5rem; font-size: clamp(2rem, 3.5vw, 3.4rem); line-height: 1.13; font-weight: 750; letter-spacing: -.045em; text-wrap: balance; }
.home-title span { display: block; margin-top: .15em; }
.home-button { display: inline-flex; align-items: center; justify-content: center; gap: .65rem; min-height: 46px; padding: .8rem 1.15rem; border-radius: .65rem; font-size: .875rem; line-height: 1.5; font-weight: 600; text-align: center; }
.home-blueprint { min-width: 0; padding: clamp(1.5rem, 3.5vw, 2.75rem); background: radial-gradient(ellipse at top right, #193b56, transparent 70%), #0e1b2f; color: #f8fafc; }
.flow-node { display: flex; align-items: center; gap: .85rem; padding: 1rem; border: 1px solid #40536b; border-radius: .75rem; background: #17283d; font-size: .875rem; }
.flow-node > i { font-size: 1.3rem; flex-shrink: 0; }
.flow-node > div { min-width: 0; }
.flow-caption { margin-bottom: .25rem; font-size: .65rem; text-transform: uppercase; letter-spacing: .1em; color: #b3c6da; }
.flow-index { margin-left: auto; font-family: ui-monospace, monospace; font-size: .7rem; color: #94a3b8; }
.flow-connector { display: flex; align-items: center; gap: .6rem; margin-left: 1.5rem; padding-block: .75rem; font-family: ui-monospace, monospace; font-size: .65rem; color: #cbd5e1; }
.flow-connector span { font-size: 1rem; color: #67e8f9; }
.flow-storage { min-width: 0; border: 1px solid #40536b; border-radius: .75rem; padding: 1rem; background: #17283d; font-size: .875rem; }
.home-section-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1.25rem 3rem; }
.home-technology-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1rem; }
.home-anchor { scroll-margin-top: 6rem; }
.home-heading { font-size: clamp(1.7rem, 2.7vw, 2.25rem); line-height: 1.2; font-weight: 700; letter-spacing: -.035em; text-wrap: balance; }
.home-step { font-family: ui-monospace, monospace; font-size: .9rem; }
.home-text-link { display: inline-flex; align-items: center; gap: .55rem; font-size: .875rem; line-height: 1.6; font-weight: 600; text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 4px; }
.home-text-link:hover { text-decoration-color: currentColor; }
.home-doc-link { display: flex; align-items: center; gap: .65rem; font-size: .875rem; font-weight: 600; }
.home-doc-link > span { flex: 1; min-width: 0; }
.home-explore { display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
.home-explore > .home-button { flex-shrink: 0; max-width: 100%; }
.technical-home a:focus-visible, .technical-home button:focus-visible { outline: 3px solid #3b82f6; outline-offset: 4px; }
@media (max-width: 1023px) {
  .home-hero { grid-template-columns: 1fr; }
  .home-title { max-width: 19em; font-size: clamp(2rem, 5.5vw, 3.25rem); }
  .home-technology-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .home-explore { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 479px) {
  .home-technology-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .home-hero-copy, .home-blueprint { padding: 1.5rem; }
  .home-title { font-size: 2rem; }
  .flow-node, .flow-storage { padding: .85rem; }
  .flow-index { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .technical-home *, .technical-home *::before, .technical-home *::after { animation: none !important; transition: none !important; }
}
</style>
