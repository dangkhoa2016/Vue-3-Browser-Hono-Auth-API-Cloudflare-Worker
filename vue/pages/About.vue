<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_46%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.04))]"></div>
    </div>

    <section class="relative overflow-hidden rounded-3xl border border-amber-200/70 dark:border-amber-900/50 bg-gradient-to-r from-amber-50 via-white to-sky-50 dark:from-amber-950/40 dark:via-slate-900 dark:to-sky-950/40 p-6 md:p-8 shadow-sm">
      <div class="absolute -top-16 -right-14 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl"></div>
      <div class="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl"></div>
      <div class="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] gap-6 items-start">
        <div class="space-y-5">
          <div class="inline-flex items-center gap-2 rounded-full bg-amber-100/80 dark:bg-amber-900/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
            <i class="bi bi-window-sidebar text-xs"></i>
            {{ $t('message.about.badge') }}
          </div>
          <div class="space-y-3">
            <h1 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{{ $t('message.about.title') }}</h1>
            <p class="max-w-3xl text-base md:text-lg leading-8 text-slate-600 dark:text-slate-300">
              {{ $t('message.about.description') }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {{ $t('message.about.stack_label') }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in stackItems"
                :key="item"
                class="inline-flex items-center rounded-full border border-slate-300/80 dark:border-slate-600/80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-sm"
              >
                {{ item }}
              </span>
            </div>
          </div>
        </div>

        <div class="grid gap-4">
          <article class="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-800 p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('message.about.summary_title') }}</p>
            <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ $t('message.about.summary_body') }}</p>
          </article>
          <article class="rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-slate-900 p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('message.about.docs_title') }}</p>
            <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ $t('message.about.docs_body') }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="space-y-4">
      <div>
        <h2 class="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{{ $t('message.about.surface_title') }}</h2>
        <p class="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-300">{{ $t('message.about.surface_intro') }}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <article
          v-for="card in surfaceCards"
          :key="card.title"
          class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
        >
          <div :class="card.iconWrapClass" class="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg">
            <i :class="card.icon"></i>
          </div>
          <h3 class="mt-4 text-base font-bold text-slate-900 dark:text-white">{{ card.title }}</h3>
          <p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ card.body }}</p>
        </article>
      </div>
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-6">
      <section class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900 p-6 shadow-sm">
        <h2 class="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{{ $t('message.about.architecture_title') }}</h2>
        <p class="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-300">{{ $t('message.about.architecture_intro') }}</p>
        <div class="mt-5 grid gap-4">
          <article
            v-for="layer in architectureLayers"
            :key="layer.title"
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-4"
          >
            <div class="flex items-start gap-3">
              <div :class="layer.iconWrapClass" class="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-base">
                <i :class="layer.icon"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-900 dark:text-white">{{ layer.title }}</h3>
                <p class="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ layer.body }}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div class="space-y-6">
        <section class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900 p-6 shadow-sm">
          <h2 class="text-xl font-black text-slate-900 dark:text-white">{{ $t('message.about.access_title') }}</h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ $t('message.about.access_intro') }}</p>
          <div class="mt-5 grid gap-3">
            <article
              v-for="item in accessItems"
              :key="item.title"
              class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-4"
            >
              <div class="flex items-start gap-3">
                <div :class="item.iconWrapClass" class="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-base">
                  <i :class="item.icon"></i>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ item.title }}</h3>
                  <p class="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ item.body }}</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900 p-6 shadow-sm">
          <h2 class="text-xl font-black text-slate-900 dark:text-white">{{ $t('message.about.quality_title') }}</h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ $t('message.about.quality_intro') }}</p>
          <div class="mt-5 grid gap-3">
            <article
              v-for="item in qualityItems"
              :key="item.title"
              class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-4"
            >
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ item.title }}</h3>
              <p class="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ item.body }}</p>
            </article>
          </div>
        </section>
      </div>
    </div>

    <section class="rounded-3xl border border-cyan-200/70 dark:border-cyan-900/50 bg-gradient-to-r from-cyan-50 via-white to-sky-50 dark:from-cyan-950/40 dark:via-slate-900 dark:to-sky-950/40 p-6 shadow-sm">
      <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{{ $t('message.about.public_routes_title') }}</h2>
          <p class="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-300">{{ $t('message.about.public_routes_intro') }}</p>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <router-link
          v-for="route in publicRoutes"
          :key="route.to"
          :to="route.to"
          class="group rounded-2xl border border-white/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:focus:ring-cyan-700"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div :class="route.iconWrapClass" class="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg">
                <i :class="route.icon"></i>
              </div>
              <h3 class="mt-4 text-base font-bold text-slate-900 dark:text-white">{{ route.title }}</h3>
              <p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ route.body }}</p>
            </div>
            <i class="bi bi-arrow-up-right text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"></i>
          </div>
          <div class="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-white px-3 py-1.5 text-sm font-semibold text-white dark:text-slate-900">
            {{ $t('message.about.public_routes.cta') }}
            <i class="bi bi-arrow-right"></i>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n({ useScope: 'global' });

const stackItems = computed(() => [
  t('message.about.stack_items.vue'),
  t('message.about.stack_items.runtime'),
  t('message.about.stack_items.backend'),
  t('message.about.stack_items.i18n')
]);

const surfaceCards = computed(() => [
  {
    title: t('message.about.surface_cards.users.title'),
    body: t('message.about.surface_cards.users.body'),
    icon: 'bi bi-people',
    iconWrapClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  },
  {
    title: t('message.about.surface_cards.audit.title'),
    body: t('message.about.surface_cards.audit.body'),
    icon: 'bi bi-journal-text',
    iconWrapClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
  },
  {
    title: t('message.about.surface_cards.security.title'),
    body: t('message.about.surface_cards.security.body'),
    icon: 'bi bi-shield-check',
    iconWrapClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  },
  {
    title: t('message.about.surface_cards.public_endpoints.title'),
    body: t('message.about.surface_cards.public_endpoints.body'),
    icon: 'bi bi-broadcast-pin',
    iconWrapClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  }
]);

const architectureLayers = computed(() => [
  {
    title: t('message.about.layers.pages.title'),
    body: t('message.about.layers.pages.body'),
    icon: 'bi bi-layout-text-window-reverse',
    iconWrapClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  },
  {
    title: t('message.about.layers.components.title'),
    body: t('message.about.layers.components.body'),
    icon: 'bi bi-grid-1x2',
    iconWrapClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
  },
  {
    title: t('message.about.layers.composables.title'),
    body: t('message.about.layers.composables.body'),
    icon: 'bi bi-bezier2',
    iconWrapClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
  },
  {
    title: t('message.about.layers.stores.title'),
    body: t('message.about.layers.stores.body'),
    icon: 'bi bi-stack',
    iconWrapClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  },
  {
    title: t('message.about.layers.routing.title'),
    body: t('message.about.layers.routing.body'),
    icon: 'bi bi-signpost-split',
    iconWrapClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
  }
]);

const accessItems = computed(() => [
  {
    title: t('message.about.access_items.public.title'),
    body: t('message.about.access_items.public.body'),
    icon: 'bi bi-unlock',
    iconWrapClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  },
  {
    title: t('message.about.access_items.protected.title'),
    body: t('message.about.access_items.protected.body'),
    icon: 'bi bi-shield-lock',
    iconWrapClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  },
  {
    title: t('message.about.access_items.cache.title'),
    body: t('message.about.access_items.cache.body'),
    icon: 'bi bi-layers',
    iconWrapClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
  }
]);

const qualityItems = computed(() => [
  {
    title: t('message.about.quality_items.i18n.title'),
    body: t('message.about.quality_items.i18n.body')
  },
  {
    title: t('message.about.quality_items.file_size.title'),
    body: t('message.about.quality_items.file_size.body')
  },
  {
    title: t('message.about.quality_items.script_setup.title'),
    body: t('message.about.quality_items.script_setup.body')
  },
  {
    title: t('message.about.quality_items.boundaries.title'),
    body: t('message.about.quality_items.boundaries.body')
  }
]);

const publicRoutes = computed(() => [
  {
    to: '/health',
    title: t('message.navbar.api_health'),
    body: t('message.about.public_routes.health'),
    icon: 'bi bi-heart-pulse',
    iconWrapClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  },
  {
    to: '/version',
    title: t('message.navbar.api_version'),
    body: t('message.about.public_routes.version'),
    icon: 'bi bi-box-seam',
    iconWrapClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
  },
  {
    to: '/language',
    title: t('message.navbar.api_language'),
    body: t('message.about.public_routes.language'),
    icon: 'bi bi-translate',
    iconWrapClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
  }
]);
</script>
