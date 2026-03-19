<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="amber"
      button-icon="bi bi-box-arrow-in-right text-lg"
      :title="$t('message.auth.login_required')"
      :message="$t('message.kv_admin_page.login_required_message')"
      :button-text="$t('message.auth.login', 'Login')"
      @action="openLoginModal"
    />
    
    <template v-else-if="!isSuperAdmin">
      <section class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.kv_admin_page.access_denied_title', 'Access Denied') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.kv_admin_page.access_denied_message', 'You do not have permission to view this page.') }}</p>
      </section>
    </template>

    <template v-else>
      <PageHeroSection
        section-class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-red-50/40 to-orange-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]"
        top-blob-class="absolute -top-20 -right-16 w-72 h-72 bg-red-400/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"
        content-class="relative flex flex-col md:flex-row gap-6 md:items-center justify-between"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-red-900/10 text-red-800 dark:bg-red-400/10 dark:text-red-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {{ $t('message.navbar.kv_admin_rate_limits', 'Rate Limits Admin') }}
            </div>
            <h1 class="mt-4 text-3xl font-black text-slate-900 dark:text-white">Rate Limits Management</h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300">Clean, prune, and configure rate limit keys across the system.</p>
          </div>
        </template>
      </PageHeroSection>

      <div class="grid lg:grid-cols-2 gap-6">
        <!-- Clean Prefix -->
        <div class="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-trash mr-2 text-rose-500"></i> Clean by Prefix</h2>
          <div class="space-y-4">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wider text-slate-500">Prefix</label>
              <input v-model="cleanForm.prefix" type="text" class="w-full mt-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" placeholder="rate_limit:" />
            </div>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="cleanForm.dryRun" class="rounded accent-rose-500">
              <span class="text-sm font-medium">Dry Run (Do not delete)</span>
            </label>
            <ActionTextButton tone="rose" :disabled="isLoading" :loading="isLoading" @click="runClean">Run Clean</ActionTextButton>
          </div>
        </div>

        <!-- Prune Time -->
        <div class="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
          <h2 class="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-3"><i class="bi bi-clock mr-2 text-amber-500"></i> Prune by Time</h2>
          <div class="space-y-4">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wider text-slate-500">Prefix</label>
              <input v-model="pruneForm.prefix" type="text" class="w-full mt-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" placeholder="rate_limit:" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Time</label>
                <input v-model="pruneForm.start" type="datetime-local" class="w-full mt-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-500">End Time</label>
                <input v-model="pruneForm.end" type="datetime-local" class="w-full mt-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" />
              </div>
            </div>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="pruneForm.dryRun" class="rounded accent-amber-500">
              <span class="text-sm font-medium">Dry Run</span>
            </label>
            <ActionTextButton tone="amber" :disabled="isLoading" :loading="isLoading" @click="runPrune">Run Prune</ActionTextButton>
          </div>
        </div>
        
        <!-- Result Output -->
        <div v-if="result" class="lg:col-span-2 bg-slate-900 text-slate-100 rounded-[28px] p-6 shadow-xl overflow-hidden">
          <div class="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
             <h2 class="text-xl font-bold font-mono text-emerald-400">Execution Result</h2>
             <ActionTextButton variant="soft" size="sm" @click="result = null">Clear</ActionTextButton>
          </div>
          <pre class="overflow-x-auto text-sm max-h-[400px]">{{ JSON.stringify(result, null, 2) }}</pre>
        </div>

        <!-- Rate Limits List -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 class="text-xl font-bold"><i class="bi bi-list-ul mr-2 text-cyan-500"></i> Rate Limit Keys</h2>
            <div class="flex items-center gap-3">
              <input v-model="listPrefix" @keyup.enter="fetchRateLimits(true, true)" type="text" class="px-4 py-2 text-sm border rounded-xl dark:bg-slate-800 dark:border-slate-700 w-48" placeholder="Prefix (e.g. rate_limit:)" />
              <ActionTextButton tone="cyan" size="sm" :disabled="isLoading" @click="fetchRateLimits(true, true)">
                <i class="bi bi-arrow-clockwise mr-1"></i> Refresh
              </ActionTextButton>
            </div>
          </div>
          
          <div v-if="isLoading && rateLimitsList.length === 0" class="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div class="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
            Loading rate limits...
          </div>
          
          <div v-else-if="rateLimitsList.length === 0" class="py-12 text-center text-slate-500">
            <i class="bi bi-inbox text-4xl mb-2 opacity-50"></i>
            <p>No rate limit keys found for the specified prefix.</p>
          </div>
          
          <div v-else class="space-y-4">
            <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th class="px-4 py-3 font-semibold">Key Name</th>
                    <th class="px-4 py-3 font-semibold">Value</th>
                    <th class="px-4 py-3 font-semibold w-40">Expiration</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr v-for="key in rateLimitsList" :key="key.name" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td class="px-4 py-3 font-mono text-xs text-sky-600 dark:text-sky-400 break-all">{{ key.name }}</td>
                    <td class="px-4 py-3">
                      <pre class="text-xs bg-slate-100 dark:bg-slate-950 p-2 rounded max-h-32 overflow-y-auto max-w-sm ml-0 break-words whitespace-pre-wrap">{{ JSON.stringify(key.value, null, 2) }}</pre>
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-500">
                      {{ key.expiration ? new Date(key.expiration * 1000).toLocaleString() : 'N/A' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div v-if="!listComplete" class="text-center pt-4">
              <ActionTextButton variant="soft" tone="cyan" :disabled="isLoading" @click="loadMoreRateLimits">
                {{ isLoading ? 'Loading...' : 'Load More' }}
              </ActionTextButton>
            </div>
            <div v-else class="text-center text-xs text-slate-400 pt-2">
              Showing all {{ rateLimitsList.length }} keys
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useKvAdminRateLimitsPage } from '/vue/composables/useKvAdminRateLimitsPage.js';

const {
  showLoginRequired,
  openLoginModal,
  isSuperAdmin,
  isLoading,
  result,
  cleanForm,
  pruneForm,
  rateLimitsList,
  listComplete,
  listCursor,
  listPrefix,
  fetchRateLimits,
  loadMoreRateLimits,
  runClean,
  runPrune
} = useKvAdminRateLimitsPage();
</script>
