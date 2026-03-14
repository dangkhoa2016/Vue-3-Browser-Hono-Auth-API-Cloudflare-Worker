<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="teal"
      button-tone="emerald"
      button-icon="bi bi-box-arrow-in-right text-lg"
      :title="$t('message.auth.login_required')"
      :message="$t('message.system_health.login_required_message')"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-20 -right-16 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-emerald-900/10 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full" :class="statusDotClass"></span>
              {{ $t('message.system_health.badge') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.navbar.system_health') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.system_health.subtitle') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <ActionTextButton
                variant="soft"
                shape="full"
                :icon="isLoading ? 'bi bi-arrow-clockwise animate-spin' : 'bi bi-arrow-clockwise'"
                :disabled="isLoading"
                @click="refresh"
              >
                {{ $t('message.refresh') }}
              </ActionTextButton>
              <span class="text-xs uppercase tracking-[0.2em] text-slate-400">
                {{ $t('message.system_health.last_updated') }}: {{ formatDate(lastUpdatedLabel) }}
              </span>
            </div>
          </div>
        </template>

        <template #right>
          <div class="grid grid-cols-2 gap-4">
            <!-- Skeleton for Stats Cards -->
            <template v-if="isLoading">
              <div v-for="i in 4" :key="i" class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-24 bg-slate-200 dark:bg-slate-700/50 rounded mb-4"></div>
                <div class="flex items-center justify-between">
                  <div class="h-6 w-20 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
                  <div class="h-8 w-8 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                </div>
              </div>
            </template>

            <!-- Real Stats Cards -->
            <template v-else>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_health.overall_status') }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-xl font-black" :class="statusTextClass">{{ statusText }}</span>
                  <i class="bi bi-heart-pulse text-2xl" :class="statusTextClass"></i>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_health.response_time') }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-xl font-black text-slate-900 dark:text-white">{{ responseTime }}</span>
                  <i class="bi bi-speedometer2 text-2xl text-cyan-500"></i>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_health.environment') }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-xl font-black text-slate-900 dark:text-white">{{ environment }}</span>
                  <i class="bi bi-cloud text-2xl text-sky-500"></i>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.system_health.health_checks') }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-xl font-black text-slate-900 dark:text-white">{{ healthChecks.length }}</span>
                  <i class="bi bi-clipboard2-check text-2xl text-emerald-500"></i>
                </div>
              </div>
            </template>
          </div>
        </template>
      </PageHeroSection>

      <section v-if="!isAdmin" class="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-rose-600 dark:text-rose-400 mb-4"></i>
        <h3 class="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">{{ $t('message.system_health.access_denied_title') }}</h3>
        <p class="text-rose-700 dark:text-rose-300">{{ $t('message.system_health.access_denied_message') }}</p>
      </section>

      <section v-else class="space-y-6">
        <AsyncStateSection
          :loading="isLoading"
          :error="errorMessage"
          :is-empty="!hasData"
          :empty-title="$t('message.system_health.empty_title')"
          :empty-message="$t('message.system_health.empty_message')"
        >
          <template #loading>
          <div class="grid gap-6 lg:grid-cols-2 animate-pulse">
            <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-xl">
               <div class="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-6"></div>
               <div class="grid grid-cols-2 gap-3 mb-4">
                 <div class="h-20 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
                 <div class="h-20 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
               </div>
               <div class="space-y-2">
                 <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
               </div>
            </div>

            <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-xl space-y-3">
               <div class="h-6 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-6"></div>
               <div v-for="i in 3" :key="i" class="rounded-xl border border-slate-200/50 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                 <div class="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700 mb-3"></div>
                 <div class="grid grid-cols-2 gap-2">
                   <div v-for="j in 4" :key="j" class="h-4 rounded bg-slate-200 dark:bg-slate-700"></div>
                 </div>
               </div>
            </div>

            <div class="lg:col-span-2 grid gap-6 lg:grid-cols-2">
               <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-xl">
                 <div class="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
                 <div class="space-y-3">
                   <div class="h-8 bg-slate-100 dark:bg-slate-800 rounded"></div>
                   <div v-for="i in 5" :key="i" class="h-8 border-b border-slate-100 dark:border-slate-800"></div>
                 </div>
               </div>
               <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-xl space-y-4">
                 <div class="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-4"></div>
                 <div class="grid grid-cols-3 gap-3">
                   <div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
                 </div>
                 <div class="h-6 w-32 rounded bg-slate-200 dark:bg-slate-700 mt-4 mb-2"></div>
                 <div class="space-y-2">
                   <div v-for="i in 3" :key="i" class="h-10 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
                 </div>
               </div>
            </div>
          </div>
          </template>

          <div class="grid gap-6 lg:grid-cols-2">
            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.database_title') }}</h2>
              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.connected') }}</p>
                  <p class="text-xl font-black" :class="databaseConnectedClass">{{ databaseConnectedText }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.sqlite_version') }}</p>
                  <p class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ sqliteVersion }}</p>
                </div>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.tables_info') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ databaseInfo.tableCount }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.tables_metrics') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ databaseStructure.totalTables }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.total_indexes') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ databaseStructure.totalIndexes }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.db_query_response') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbPerformance.queryResponseTime }}</span>
                </div>
              </div>
            </section>

            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.system_title') }}</h2>
              <div class="space-y-3">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_health.statistics') }}</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-500">{{ $t('message.system_health.total_users') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.totalUsers }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.active_users') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.activeUsers }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.inactive_users') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.inactiveUsers }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.suspended_users') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.suspendedUsers }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.recent_registrations') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ stats.recentRegistrations }}</div>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_health.performance') }}</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-500">{{ $t('message.system_health.api_response') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ performance.responseTime }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.database_response') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ performance.databaseResponseTime }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.performance_grade') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right uppercase">{{ performance.performanceGrade }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.performant') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ performance.isPerformant ? $t('message.system_health.yes') : $t('message.system_health.no') }}</div>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{{ $t('message.system_health.security') }}</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-500">{{ $t('message.system_health.recent_failed_logins') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ security.recentFailedLogins }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.total_failed_attempts') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ security.totalFailedAttempts }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.ips_with_failures') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right">{{ security.uniqueIpsWithFailures }}</div>
                    <div class="text-slate-500">{{ $t('message.system_health.risk_level') }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100 text-right uppercase">{{ security.riskLevel }}</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.database_indexes_by_table') }}</h2>
              <div class="overflow-x-auto max-h-80">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left">{{ $t('message.system_health.table') }}</th>
                      <th class="px-4 py-3 text-right">{{ $t('message.system_health.index_count') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in databaseStructure.tables" :key="item.table_name" class="border-t border-slate-100 dark:border-slate-800">
                      <td class="px-4 py-3 text-slate-700 dark:text-slate-200 font-mono text-xs">{{ item.table_name }}</td>
                      <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.index_count }}</td>
                    </tr>
                    <tr v-if="databaseStructure.tables.length === 0">
                      <td colspan="2" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">{{ $t('message.system_health.no_table_index_metrics') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] space-y-4">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.system_health.users_by_role') }}</h2>
              <div class="grid grid-cols-3 gap-3">
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.role_super_admin') }}</p>
                  <p class="text-xl font-black text-violet-600 dark:text-violet-400">{{ roleCounts.super_admin }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.role_admin') }}</p>
                  <p class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ roleCounts.admin }}</p>
                </div>
                <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('message.system_health.role_user') }}</p>
                  <p class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ roleCounts.user }}</p>
                </div>
              </div>

              <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.system_health.database_user_metrics') }}</h2>
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.total_records') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbUsers.totalRecords }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.active_users') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbUsers.activeUsers }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.recent_users_24h') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbUsers.recentUsers24h }}</span>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 p-3">
                  <span class="text-slate-500">{{ $t('message.system_health.recent_activity_1h') }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ dbUsers.recentActivity1h }}</span>
                </div>
              </div>
            </section>
          </div>

          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.health_checks_title') }}</h2>
            <div class="space-y-3">
              <div
                v-for="item in healthChecks"
                :key="`${item.name}-${item.status}`"
                class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="font-semibold uppercase text-slate-800 dark:text-slate-100">{{ item.name || '-' }}</div>
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                    :class="healthCheckStatusClass(item.status)"
                  >
                    {{ healthStatusText(item.status) }}
                  </span>
                </div>
              </div>
              <div v-if="healthChecks.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
                {{ $t('message.system_health.no_health_checks') }}
              </div>
            </div>
          </section>

          <section class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">{{ $t('message.system_health.metadata') }}</h2>
            <div class="grid gap-4 md:grid-cols-2 text-sm">
              <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">{{ $t('message.system_health.checked_by_user') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ checkedBy.userId }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">{{ $t('message.system_health.checked_by_role') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100 uppercase">{{ checkedBy.role }}</span>
                </div>
              </div>
              <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">{{ $t('message.system_health.access_level') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100 uppercase">{{ metadata.accessLevel }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">{{ $t('message.system_health.super_admin_data') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ metadata.canViewSuperAdminData ? $t('message.system_health.yes') : $t('message.system_health.no') }}</span>
                </div>
              </div>
            </div>
          </section>
        </AsyncStateSection>
      </section>
    </template>
  </div>
</template>

<script>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import AsyncStateSection from '/vue/components/AsyncStateSection.vue';
import { useAdminSystemHealthPage } from '../composables/useAdminSystemHealthPage.js';

export default {
  name: 'AdminSystemHealth',
  components: { ActionTextButton, LoginRequiredPrompt, PageHeroSection, AsyncStateSection },
  setup() {
    return useAdminSystemHealthPage();
  }
};
</script>
