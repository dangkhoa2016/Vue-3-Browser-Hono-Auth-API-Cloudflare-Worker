<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <!-- Show login prompt when user is not authenticated -->
    <div v-if="showLoginRequired" class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center">
      <i class="bi bi-lock-fill text-5xl text-blue-600 dark:text-blue-400 mb-4"></i>
      <h3 class="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">{{ $t('message.audit.login_required') || $t('message.auth.login_required') || 'Login required' }}</h3>
      <p class="text-blue-700 dark:text-blue-300 mb-4">{{ $t('message.audit.login_required_message') || $t('message.auth.login_required_message') || 'Please login to view audit logs.' }}</p>
      <button
        @click="openLoginModal"
        class="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
      >
        <i class="bi bi-box-arrow-in-right text-lg"></i>
        {{ $t('message.auth.login') || 'Login' }}
      </button>
    </div>

    <template v-else>
      <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-cyan-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]">
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div class="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-cyan-900/10 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              {{ $t('message.audit.badge') || 'Activity Monitoring' }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{{ $t('message.navbar.audit_logs') || 'Audit Logs' }}</h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.audit.search_placeholder') || 'Search logs, actors, targets...' }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <button
                @click="auditStore.reload()"
                class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition"
              >
                <i class="bi bi-arrow-clockwise"></i>
                {{ $t('message.admin_users.reload') || 'Reload' }}
              </button>
            </div>
          </div>

          <div class="grid gap-4">
            <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.audit.stats_total') || 'Total Logs' }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-3xl font-black text-slate-900 dark:text-white">{{ totalLogCount }}</span>
                <i class="bi bi-journal-text text-2xl text-cyan-500"></i>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.audit.stats_success') || 'Success' }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-2xl font-black text-slate-900 dark:text-white">{{ successCount }}</span>
                  <i class="bi bi-check-circle text-xl text-emerald-500"></i>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('message.audit.stats_issues') || 'Issues' }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-2xl font-black text-slate-900 dark:text-white">{{ issueCount }}</span>
                  <i class="bi bi-exclamation-triangle text-xl text-amber-500"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
      <!-- Enhanced Filters Section -->
      <div class="bg-gradient-to-r from-slate-50/80 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-700/80 rounded-2xl p-6 mb-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <i class="bi bi-funnel-fill text-slate-600 dark:text-slate-400 text-lg"></i>
            <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200">{{ $t('message.audit.filters') || 'Filters' }}</h3>
          </div>
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {{ totalLogCount }} {{ $t('message.audit.items') || 'items' }}
          </span>
        </div>

        <!-- Row 1: Search + Main selectors -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-6">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ $t('message.audit.search') || 'Search' }}</label>
            <div class="relative">
              <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                v-model="auditStore.filters.search"
                @keyup.enter="applyFilters"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                :placeholder="$t('message.audit.search_placeholder') || 'Search logs, actors, targets...'"
              />
            </div>
          </div>

          <div class="lg:col-span-3">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ $t('message.audit.action') || 'Action' }}</label>
            <select
              v-model="auditStore.filters.action"
              @change="applyFilters"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
            >
              <option value="">{{ $t('message.audit.all_actions') || 'All Actions' }}</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="view">View</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="export">Export</option>
              <option value="search">Search</option>
            </select>
          </div>

          <div class="lg:col-span-3">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ $t('message.audit.target_type') || 'Target Type' }}</label>
            <select
              v-model="auditStore.filters.targetType"
              @change="applyFilters"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
            >
              <option value="">{{ $t('message.audit.all_targets') || 'All Targets' }}</option>
              <option value="authentication">Authentication</option>
              <option value="user">User</option>
              <option value="role">Role</option>
              <option value="audit">Audit</option>
              <option value="system">System</option>
              <option value="config">Config</option>
            </select>
          </div>
        </div>

        <!-- Row 2: Role + Date range -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ $t('message.audit.actor_role') || 'Actor Role' }}</label>
            <select
              v-model="auditStore.filters.actorRole"
              @change="applyFilters"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
            >
              <option value="">{{ $t('message.audit.all_roles') || 'All Roles' }}</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="anonymous">Anonymous</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ $t('message.audit.start_date') || 'Start Date' }}</label>
            <div class="relative">
              <i class="bi bi-calendar absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                v-model="auditStore.filters.startDate"
                @change="applyFilters"
                type="date"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ $t('message.audit.end_date') || 'End Date' }}</label>
            <div class="relative">
              <i class="bi bi-calendar-check absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                v-model="auditStore.filters.endDate"
                @change="applyFilters"
                type="date"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              />
            </div>
          </div>
        </div>

        <!-- Row 3: Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-600/60">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ $t('message.audit.search_placeholder') || 'Search logs, actors, targets...' }}
          </p>
          <div class="flex items-center gap-3">
            <button
              @click="applyFilters"
              class="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition"
            >
              <i class="bi bi-check-circle text-sm"></i>
              {{ $t('message.audit.apply_filters') || 'Apply Filters' }}
            </button>
            <button
              @click="clearFilters"
              class="inline-flex items-center gap-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 dark:bg-slate-400 dark:hover:bg-slate-500 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition"
            >
              <i class="bi bi-x-circle text-sm"></i>
              {{ $t('message.audit.clear_filters') || 'Clear Filters' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Summary and Export -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <span class="text-sm text-slate-600 dark:text-slate-400">
            {{ totalLogCount }} {{ $t('message.audit.items') || 'items' }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="onExport('csv')"
            class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition"
          >
            <i class="bi bi-download text-sm"></i>
            {{ $t('message.audit.export_csv') || 'Export CSV' }}
          </button>
        </div>
      </div>

      <div class="rounded-[18px] max-[992px]:border-none border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div v-if="auditStore.loading" class="p-6 space-y-4 animate-pulse">
          <div v-for="row in 6" :key="row" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
        </div>

        <div v-else-if="auditStore.error" class="p-8 text-center">
          <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.errors.failed_to_load', { item: $t('message.navbar.audit_logs'), message: auditStore.error }) || 'Failed to load audit logs' }}</h3>
          <button
            class="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 text-white px-4 py-2 text-sm font-semibold"
            @click="auditStore.reload()"
          >
            <i class="bi bi-arrow-clockwise"></i>
            {{ $t('message.common.retry') || 'Retry' }}
          </button>
        </div>

        <div v-else class="bg-white/80 dark:bg-slate-900">
          <div class="overflow-x-auto">
            <table class="audit-table">
              <thead class="audit-thead">
                <tr>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.actor') || 'Actor' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.when') || 'When' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.action') || 'Action' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.target') || 'Target' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.details') || 'Details' }}</th>
                  <th class="px-6 py-3 text-left"> </th>
                </tr>
              </thead>
              <tbody class="audit-tbody">
                <tr v-if="!auditStore.loading && auditStore.logs.length === 0">
                  <td colspan="6" class="p-8 text-center text-slate-500 dark:text-slate-400">No audit logs found.</td>
                </tr>
                <tr v-for="log in auditStore.logs" :key="log.id" class="audit-row">
                  <td class="audit-cell-actor cursor-pointer" @click.stop="openLog(log)" :data-label="$t('message.audit.actor') || 'Actor'">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {{ avatarInitial(log) }}
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <div class="font-semibold text-slate-800 dark:text-slate-100 truncate">{{ actorDisplay(log) }}</div>
                          <span
                            v-if="log.actor_role"
                            :class="[
                              (log.actor_role || '').toString().toLowerCase() === 'super_admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                              (log.actor_role || '').toString().toLowerCase() === 'admin' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            ]"
                            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                          >{{ (log.actor_role || '').toString().replace('_', ' ').toUpperCase() }}</span>
                        </div>
                        <div v-if="log.actor_email || log.user_email" class="text-xs text-slate-500 dark:text-slate-400 hidden md:flex items-center gap-1 truncate">
                          <i class="bi bi-envelope text-xs"></i>
                          <span class="truncate">{{ log.actor_email || log.user_email }}</span>
                        </div>
                        <div class="text-xs text-slate-500 dark:text-slate-400">{{ log.actor_id ? ('#' + log.actor_id) : ('#' + log.id) }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="audit-cell-when cursor-pointer" @click.stop="openLog(log)" :data-label="$t('message.audit.when') || 'When'">{{ formatDate(log.timestamp || log.created_at) }}</td>
                  <td class="audit-cell-action cursor-pointer" @click.stop="openLog(log)" :data-label="$t('message.audit.action') || 'Action'">
                    <span :class="badgeColor(log.action)" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold">
                      {{ log.action }}</span>
                  </td>
                  <td class="audit-cell-target cursor-pointer" @click.stop="openLog(log)" :data-label="$t('message.audit.target') || 'Target'">{{ log.target_type || log.resource || log.target || '-' }}</td>
                  <td class="audit-cell-details" :data-label="$t('message.audit.details') || 'Details'"><div class="text-xs line-clamp-2 w-full text-left">{{ formatDetails(log.details || log.meta || log.payload) }}</div></td>
                  <td class="audit-cell-view" :data-label="' '">
                    <button @click.stop="openLog(log)" class="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-lg text-sm">
                      <i class="bi bi-eye"></i>
                      {{ $t('message.common.view') || 'View' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" v-if="!auditStore.error && (auditStore.pagination.totalPages || 1) > 1">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Page {{ auditStore.pagination.page || 1 }} / {{ auditStore.pagination.totalPages || 1 }}
        </p>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            @click="goToPage(1)"
            :disabled="(auditStore.pagination.page || 1) <= 1 || auditStore.loading"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i class="bi bi-chevron-double-left"></i>
            First
          </button>

          <button
            @click="prevPage"
            :disabled="(auditStore.pagination.page || 1) <= 1 || auditStore.loading"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i class="bi bi-chevron-left"></i>
            Prev
          </button>

          <button
            v-for="page in visiblePages"
            :key="page"
            @click="goToPage(page)"
            :disabled="auditStore.loading"
            :class="[
              'inline-flex items-center justify-center min-w-9 px-2.5 py-1.5 rounded-lg text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed',
              page === (auditStore.pagination.page || 1)
                ? 'bg-teal-600 border-teal-600 text-white'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            ]"
          >
            {{ page }}
          </button>

          <button
            @click="nextPage"
            :disabled="(auditStore.pagination.page || 1) >= (auditStore.pagination.totalPages || 1) || auditStore.loading"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <i class="bi bi-chevron-right"></i>
          </button>

          <button
            @click="goToPage(auditStore.pagination.totalPages || 1)"
            :disabled="(auditStore.pagination.page || 1) >= (auditStore.pagination.totalPages || 1) || auditStore.loading"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
            <i class="bi bi-chevron-double-right"></i>
          </button>
        </div>
      </div>
      </section>
    </template>

    <!-- Log Details Modal -->

    <ModalWindow :show="showModal" :title="$t('message.audit.log_details') || 'Log Details'" @close="closeLog" :panelClass="'max-w-3xl sm:max-w-4xl w-full'">
      <div class="space-y-4 modal-detail-body">
        <!-- Header: Action, Date, ID, Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 break-words">{{ $t('message.audit.action') }}: {{ selectedLog?.action || ($t('message.audit.log_details') || 'Log Details') }}</h3>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ formatDate(selectedLog?.timestamp || selectedLog?.created_at) }} • #{{ selectedLog?.id }}</div>
          </div>
          <div class="flex items-center gap-2 mt-2 sm:mt-0">
            <button @click="copySelectedLog" class="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
              <i class="bi bi-clipboard"></i>
              {{ $t('message.audit.copy_json') || 'Copy JSON' }}
            </button>
            <button @click="closeLog" class="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-transparent border border-slate-200 dark:border-slate-700 text-xs">
              <i class="bi bi-x-lg"></i>
              {{ $t('message.common.close') || 'Close' }}
            </button>
          </div>
        </div>

        <!-- Responsive Info Grid -->
        <div class="grid grid-cols-1 min-[700px]:grid-cols-2 gap-4 overflow-auto max-h-[600px]">
          <div class="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.actor') || 'Actor' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.actor_name || selectedLog?.actor_email || selectedLog?.user_email || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.actor_role') || 'Actor Role' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.actor_role || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.action') || 'Action' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.action || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.target') || 'Target' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.target_type || selectedLog?.resource || selectedLog?.target || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.timestamp') || 'Timestamp' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ formatDate(selectedLog?.timestamp || selectedLog?.created_at) }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.request_id') || 'Request ID' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.request_id || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.ip_address') || 'IP' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.ip_address || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.user_agent') || 'User Agent' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.user_agent || selectedLog?.userAgent || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ $t('message.audit.status') || 'Status' }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.status || '-' }}</span>
            </div>
          </div>
          <div class="flex flex-col">
            <div class="mb-2 text-xs text-slate-500">{{ $t('message.audit.full_payload') || 'Full Payload' }}</div>
            <div class="relative">
              <pre class="whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded-md text-xs font-mono break-all">{{ formatDetails(selectedLog) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </ModalWindow>
  </div>
</template>

<script>
import { onMounted, watch, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuditStore } from '/assets/js/stores/auditStore.js';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useToastStore } from '/assets/js/stores/toastStore.js';
import ModalWindow from '/vue/components/ModalWindow.vue';

export default {
  name: 'AdminAuditLogs',
  components: {
    ModalWindow
  },
  setup() {
    const auditStore = useAuditStore();
    const toastStore = useToastStore();

    const showModal = ref(false);
    const selectedLog = ref(null);

    const totalLogCount = computed(() => auditStore.error ? 0 : (Number(auditStore.pagination.total) || auditStore.logs.length || 0));
    const successCount = computed(() => auditStore.error ? 0 : (auditStore.logs || []).filter((log) => (log.status || '').toUpperCase() === 'SUCCESS').length);
    const issueCount = computed(() => auditStore.error ? 0 : (auditStore.logs || []).filter((log) => {
      const status = (log.status || '').toUpperCase();
      return status === 'FAILED' || status === 'UNAUTHORIZED';
    }).length);

    const formatDate = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return dt.toLocaleString();
    };

    const formatDetails = (obj) => {
      try {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        return JSON.stringify(obj, null, 2);
      } catch (e) {
        return String(obj);
      }
    };

    const avatarInitial = (log) => {
      if (!log) return 'U'; // U for Unknown or User

      const normalize = (val) => {
        if (val == null) return '';
        if (typeof val === 'object') {
          if (val.name) return String(val.name);
          if (val.email) return String(val.email);
          return '';
        }
        return String(val);
      };

      // Prioritized, minimal candidates based on response.json: name, email local-part, user, id
      const candidates = [
        log.actor_name,
        log.actor_email,
        log.user_email,
        log.actor_id,
        log.id
      ];

      for (const c of candidates) {
        const s = normalize(c).trim();
        if (!s) continue;
        const token = s.includes('@') ? s.split('@')[0] : s.split(/\s+/)[0];
        const match = token.match(/[A-Za-z0-9]/);
        if (match) return match[0].toUpperCase();
      }

      return 'U';
    };

    const actorDisplay = (log) => {
      if (!log) return '-';
      if (log.actor_name) return log.actor_name;
      if (log.actor_email) {
        try {
          const local = String(log.actor_email).split('@')[0];
          return local || log.actor_email;
        } catch (e) {
          return log.actor_email;
        }
      }
      if (log.user_email) {
        try {
          const local = String(log.user_email).split('@')[0];
          return local || log.user_email;
        } catch (e) {
          return log.user_email;
        }
      }
      if (log.actor_id) return `#${log.actor_id}`;
      return '-';
    };

    const mainStore = useMainStore();
    const { t } = useI18n({ useScope: 'global' });
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const showLoginRequired = ref(false);

    // Initialize auth from localStorage
    authStore.init();

    const openLoginModal = () => {
      modalStore.openLogin(
        // on success
        async () => {
          sessionStorage.removeItem('authRequired');
          sessionStorage.removeItem('intendedRoute');
          showLoginRequired.value = false;
          await auditStore.fetchLogs();
        },
        // on close
        () => {
          if (!authStore.isAuthenticated) {
            showLoginRequired.value = true;
          }
        }
      );
    };

    const checkAuthAndShowModal = () => {
      const authRequired = sessionStorage.getItem('authRequired');
      if (!authStore.isAuthenticated || authRequired === 'true') {
        showLoginRequired.value = true;
        openLoginModal();
        return false;
      }
      return true;
    };

    // React to global mock toggle changes (App.vue controls setupMock)
    watch(() => mainStore.mockApi, (val, oldVal) => {
      // Only refetch when value actually changes
      if (val !== oldVal) auditStore.fetchLogs();
    });


    const onExport = async (format = 'csv') => {
      try {
        await auditStore.export(format);
        showToast('Export started', 'success');
      } catch (err) {
        console.error('Export failed', err);
        showToast('Export failed', 'error');
      }
    };

    const applyFilters = () => {
      auditStore.filters.page = 1;
      auditStore.fetchLogs();
    };

    const clearFilters = () => {
      auditStore.filters.search = '';
      auditStore.filters.action = '';
      auditStore.filters.actorId = '';
      auditStore.filters.targetType = '';
      auditStore.filters.actorRole = '';
      auditStore.filters.startDate = '';
      auditStore.filters.endDate = '';
      auditStore.filters.page = 1;
      auditStore.fetchLogs();
    };

    const visiblePages = computed(() => {
      const totalPages = Number(auditStore.pagination.totalPages) || 1;
      const currentPage = Number(auditStore.pagination.page) || 1;
      const maxButtons = 5;

      let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let end = Math.min(totalPages, start + maxButtons - 1);

      if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
      }

      const pages = [];
      for (let page = start; page <= end; page += 1) pages.push(page);
      return pages;
    });

    const goToPage = (page) => {
      const totalPages = Number(auditStore.pagination.totalPages) || 1;
      const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
      if (nextPage === (Number(auditStore.filters.page) || 1)) return;
      auditStore.filters.page = nextPage;
      auditStore.fetchLogs();
    };

    const prevPage = () => {
      goToPage((Number(auditStore.pagination.page) || 1) - 1);
    };

    const nextPage = () => {
      goToPage((Number(auditStore.pagination.page) || 1) + 1);
    };

    const showToast = (message, type = 'info') => {
      toastStore.add(message, type);
    };

    const copySelectedLog = async () => {
      try {
        const json = JSON.stringify(selectedLog.value || {}, null, 2);
        await navigator.clipboard.writeText(json);
        showToast(t('message.audit.copied') || 'Copied to clipboard', 'success');
      } catch (err) {
        console.error('Copy failed', err);
        showToast(t('message.errors.network_error') || 'Copy failed', 'error');
      }
    };

    const badgeColor = (action) => {
      const a = (action || '').toString().toLowerCase();
      if (['create', 'update'].includes(a)) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/30 dark:text-emerald-200';
      if (['delete'].includes(a)) return 'bg-rose-100 text-rose-800 dark:bg-rose-800/30 dark:text-rose-200';
      if (['login', 'logout'].includes(a)) return 'bg-sky-100 text-sky-800 dark:bg-sky-800/30 dark:text-sky-200';
      if (['export'].includes(a)) return 'bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-200';
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-200';
    };

    const openLog = (log) => {
      selectedLog.value = log;
      showModal.value = true;
    };

    const closeLog = () => {
      showModal.value = false;
      selectedLog.value = null;
    };

    onMounted(() => {
      // Initial load: require auth before fetching
      const ok = checkAuthAndShowModal();
      if (ok) {
        auditStore.fetchLogs();
        if (auditStore.fetchStats) {
          auditStore.fetchStats().catch(() => {});
        }
      }
    });

    // React to auth changes
    watch(
      () => authStore.isAuthenticated,
      async (isAuthenticated) => {
        if (isAuthenticated === false && !showLoginRequired.value) {
          checkAuthAndShowModal();
        } else if (isAuthenticated === true && showLoginRequired.value) {
          showLoginRequired.value = false;
          await auditStore.fetchLogs();
        }
      }
    );

    return { auditStore, formatDate, formatDetails, applyFilters, clearFilters, onExport, visiblePages, goToPage, prevPage, nextPage, showModal, selectedLog, totalLogCount, successCount, issueCount, openLog, closeLog, copySelectedLog, showLoginRequired, openLoginModal, badgeColor, avatarInitial, actorDisplay };
  }
};
</script>

<style scoped>

/* Table */
.audit-table {
  min-width: 100%;
  font-size: 0.875rem; /* text-sm */
  line-height: 1.25rem;
}
@media (max-width: 992px) {
  .audit-table {
    display: block;
  }
}

/* Thead */
.audit-thead {
  background-color: rgb(248, 250, 252); /* bg-slate-50 */
  color: rgb(100, 116, 139); /* text-slate-500 */
  text-transform: uppercase;
  letter-spacing: 0.05em; /* tracking-wider */
}

.dark .audit-thead {
  background-color: rgba(30, 41, 59, 0.7); /* dark:bg-slate-800/70 */
  color: rgb(148, 163, 184); /* dark:text-slate-400 */
}
@media (max-width: 992px) {
  .audit-thead {
    display: none;
  }
}

/* Tbody */
.audit-tbody {
  margin-top: 0.75rem; /* mt-3 */
}
@media (max-width: 992px) {
  .audit-tbody {
    display: block;
  }
}

/* Row (tr) */
.audit-row {
  border-top: 1px solid #f1f5f9; /* border-slate-100 */
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
.dark .audit-row {
  border-color: #1e293b; /* dark:border-slate-800 */
}
.audit-row:hover {
  background-color: rgba(248, 250, 252, 0.7); /* hover:bg-slate-50/70 */
}
.dark .audit-row:hover {
  background-color: rgba(30, 41, 59, 0.6); /* dark:hover:bg-slate-800/60 */
}
@media (max-width: 992px) {
  .audit-row {
    display: block;
    border: 1px solid rgba(226, 232, 240, 0.7); /* border-slate-200/70 */
    border-radius: 1rem; /* rounded-2xl */
    padding: 0.25rem; /* p-1 */
    margin-bottom: 1rem; /* mb-4 */
    background-color: rgba(255, 255, 255, 0.9); /* bg-white/90 */
  }
  .dark .audit-row {
    border-color: #334155; /* dark:border-slate-700 */
    background-color: #0f172a; /* dark:bg-slate-900 */
  }
}

/* Cell Common */
.audit-cell-actor,
.audit-cell-when,
.audit-cell-action,
.audit-cell-target,
.audit-cell-details,
.audit-cell-view {
  padding-left: 1.5rem; /* px-6 */
  padding-right: 1.5rem; /* px-6 */
  padding-top: 1rem; /* py-4 */
  padding-bottom: 1rem; /* py-4 */
}

/* Cell Specific Styles */
.audit-cell-when {
  color: #64748b; /* text-slate-500 */
}
.dark .audit-cell-when {
  color: #94a3b8; /* dark:text-slate-400 */
}

.audit-cell-target {
  color: #334155; /* text-slate-700 */
}
.dark .audit-cell-target {
  color: #e2e8f0; /* dark:text-slate-200 */
}

.audit-cell-details {
  color: #64748b; /* text-slate-500 */
}
.dark .audit-cell-details {
  color: #cbd5e1; /* dark:text-slate-300 */
}
@media (min-width: 768px) {
  .audit-cell-details {
    max-width: 480px; /* md:max-w-[480px] */
  }
}

.audit-cell-view {
  text-align: right;
}

/* Responsive Cell Styles (max-width: 992px) */
@media (max-width: 992px) {
  .audit-cell-actor,
  .audit-cell-when,
  .audit-cell-action,
  .audit-cell-target,
  .audit-cell-details,
  .audit-cell-view {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 1rem; /* px-4 */
    padding-right: 1rem; /* px-4 */
    padding-top: 0.625rem; /* py-2.5 */
    padding-bottom: 0.625rem; /* py-2.5 */
  }

  /* Label pseudo-element */
  .audit-cell-actor::before,
  .audit-cell-when::before,
  .audit-cell-action::before,
  .audit-cell-target::before,
  .audit-cell-details::before,
  .audit-cell-view::before {
    content: attr(data-label);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #64748b; /* text-slate-500 */
    padding-right: 0.75rem; /* pr-3 */
  }
  
  .dark .audit-cell-actor::before,
  .dark .audit-cell-when::before,
  .dark .audit-cell-action::before,
  .dark .audit-cell-target::before,
  .dark .audit-cell-details::before,
  .dark .audit-cell-view::before {
    color: #94a3b8; /* dark:text-slate-400 */
  }

  /* Borders between rows on mobile */
  .audit-cell-actor,
  .audit-cell-when,
  .audit-cell-target {
    border-bottom: 1px solid #e2e8f0; /* border-b */
  }
  .dark .audit-cell-actor,
  .dark .audit-cell-when,
  .dark .audit-cell-target {
    border-color: #334155; /* dark:border-slate-700 */
  }

  .audit-cell-view {
    justify-content: flex-end;
    border-top: 1px solid #e2e8f0; /* border-t */
  }
  .dark .audit-cell-view {
    border-color: #334155; /* dark:border-slate-700 */
  }
  .audit-cell-view::before {
    display: none; /* hidden */
  }
  
  /* Details specific mobile */
  .audit-cell-details {
    display: block;
    width: 100%;
    max-width: none;
  }
  .audit-cell-details::before {
    display: block;
    margin-bottom: 0.5rem; /* mb-2 */
  }
}
</style>

