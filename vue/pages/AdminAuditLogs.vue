<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <!-- Show login prompt when user is not authenticated -->
    <div v-if="showLoginRequired" class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center">
      <i class="bi bi-lock-fill text-5xl text-blue-600 dark:text-blue-400 mb-4"></i>
      <h3 class="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">{{ $t('message.audit.login_required') || $t('message.auth.login_required') || 'Login required' }}</h3>
      <p class="text-blue-700 dark:text-blue-300 mb-4">{{ $t('message.audit.login_required_message') || $t('message.auth.login_required_message') || 'Please login to view audit logs.' }}</p>
      <ActionTextButton
        icon="bi bi-box-arrow-in-right"
        tone="blue"
        size="sm"
        shape="xl"
        @click="openLoginModal"
      >
        {{ $t('message.auth.login') || 'Login' }}
      </ActionTextButton>
    </div>

    <template v-else>
      <section :class="heroSectionClass">
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
              <ActionTextButton
                variant="soft"
                shape="full"
                icon="bi bi-arrow-clockwise"
                @click="auditStore.reload()"
              >
                {{ $t('message.admin_users.reload') || 'Reload' }}
              </ActionTextButton>
            </div>
          </div>

          <div class="grid gap-4">
            <!-- Stats Skeleton -->
            <template v-if="auditStore.loading">
              <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                <div class="h-3 w-24 bg-slate-200 dark:bg-slate-700/50 rounded mb-4"></div>
                <div class="flex items-center justify-between">
                  <div class="h-8 w-16 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
                  <div class="h-8 w-8 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                  <div class="h-3 w-20 bg-slate-200 dark:bg-slate-700/50 rounded mb-4"></div>
                  <div class="flex items-center justify-between">
                    <div class="h-6 w-12 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
                    <div class="h-6 w-6 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                  </div>
                </div>
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm animate-pulse">
                  <div class="h-3 w-20 bg-slate-200 dark:bg-slate-700/50 rounded mb-4"></div>
                  <div class="flex items-center justify-between">
                    <div class="h-6 w-12 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
                    <div class="h-6 w-6 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Real Stats -->
            <template v-else>
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
            </template>
          </div>
        </div>
      </section>

      <section class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
      <!-- Enhanced Filters Section -->
      <div :class="filtersPanelClass">
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
                :class="filterInputClass"
                :placeholder="$t('message.audit.search_placeholder') || 'Search logs, actors, targets...'"
              />
            </div>
          </div>

          <div class="lg:col-span-3">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ $t('message.audit.action') || 'Action' }}</label>
            <select
              v-model="auditStore.filters.action"
              @change="applyFilters"
              :class="filterSelectClass"
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
              :class="filterSelectClass"
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
              :class="filterSelectClass"
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
                :class="filterInputClass"
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
                :class="filterInputClass"
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
            <ActionTextButton
              tone="teal"
              shape="xl"
              icon="bi bi-check-circle text-sm"
              @click="applyFilters"
            >
              {{ $t('message.audit.apply_filters') || 'Apply Filters' }}
            </ActionTextButton>
            <ActionTextButton
              tone="slate"
              shape="xl"
              icon="bi bi-x-circle text-sm"
              @click="clearFilters"
            >
              {{ $t('message.audit.clear_filters') || 'Clear Filters' }}
            </ActionTextButton>
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
          <ActionTextButton
            tone="emerald"
            shape="xl"
            icon="bi bi-download text-sm"
            @click="onExport('csv')"
          >
            {{ $t('message.audit.export_csv') || 'Export CSV' }}
          </ActionTextButton>
        </div>
      </div>

      <div ref="tableTopRef" class="rounded-[18px] max-[992px]:border-none border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div v-if="auditStore.loading" class="p-6 space-y-4 animate-pulse">
          <div v-for="row in 6" :key="row" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
        </div>

        <div v-else-if="auditStore.error" class="p-8 text-center">
          <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.errors.failed_to_load', { item: $t('message.navbar.audit_logs'), message: auditStore.error }) || 'Failed to load audit logs' }}</h3>
          <ActionTextButton
            class="mt-4"
            tone="rose"
            shape="full"
            icon="bi bi-arrow-clockwise"
            @click="auditStore.reload()"
          >
            {{ $t('message.common.retry') || 'Retry' }}
          </ActionTextButton>
        </div>

        <div v-else class="bg-white/80 dark:bg-slate-900">
          <div class="overflow-x-auto">
            <table class="audit-table">
              <thead class="audit-thead">
                <tr>
                  <th class="px-6 py-3 text-center">{{ $t('message.common.actions', 'Actions') }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.actor') || 'Actor' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.when') || 'When' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.action') || 'Action' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.target') || 'Target' }}</th>
                  <th class="px-6 py-3 text-left">{{ $t('message.audit.details') || 'Details' }}</th>
                </tr>
              </thead>
              <tbody class="audit-tbody">
                <tr v-if="!auditStore.loading && auditStore.logs.length === 0">
                  <td colspan="6" class="p-8 text-center text-slate-500 dark:text-slate-400">No audit logs found.</td>
                </tr>
                <tr v-for="log in auditStore.logs" :key="log.id" class="audit-row">
                  <td class="audit-cell-view" :data-label="$t('message.common.actions', 'Actions')">
                    <div class="flex items-center justify-center gap-2">
                      <ActionIconButton
                        @click="openLog(log)"
                        icon="bi bi-eye-fill"
                        tone="indigo"
                        :title="$t('message.common.view') || 'View'"
                        :aria-label="$t('message.common.view') || 'View'"
                      />
                    </div>
                  </td>
                  <td class="audit-cell-actor cursor-pointer" @click.stop="openLog(log)" :data-label="$t('message.audit.actor') || 'Actor'">
                    <div class="flex items-center gap-3">
                        <div :class="actorAvatarClass">
                        {{ avatarInitial(log) }}
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <div class="font-semibold text-slate-800 dark:text-slate-100 truncate">{{ actorDisplay(log) }}</div>
                          <span
                            v-if="log.actor_role"
                            :class="actorRoleBadgeClass(log.actor_role)"
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
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" v-if="!auditStore.error && (auditStore.pagination.totalPages || 1) > 1">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ $t('message.admin_users.page') || 'Page' }} {{ auditStore.pagination.page || 1 }} {{ $t('message.admin_users.of') || 'of' }} {{ auditStore.pagination.totalPages || 1 }}
        </p>

        <PaginationControls
          :current-page="auditStore.pagination.page || 1"
          :total-pages="auditStore.pagination.totalPages || 1"
          :loading="auditStore.loading"
          @change="goToPage"
        />
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
            <ActionTextButton
              variant="soft"
              shape="xl"
              size="sm"
              icon="bi bi-clipboard"
              class="text-xs"
              @click="copySelectedLog"
            >
              {{ $t('message.audit.copy_json') || 'Copy JSON' }}
            </ActionTextButton>
            <ActionTextButton
              variant="soft"
              shape="xl"
              size="sm"
              icon="bi bi-x-lg"
              class="text-xs"
              @click="closeLog"
            >
              {{ $t('message.common.close') || 'Close' }}
            </ActionTextButton>
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
import PaginationControls from '/vue/components/PaginationControls.vue';
import ActionIconButton from '/vue/components/ActionIconButton.vue';
import ActionTextButton from '/vue/components/ActionTextButton.vue';

export default {
  name: 'AdminAuditLogs',
  components: {
    ModalWindow,
    PaginationControls,
    ActionIconButton,
    ActionTextButton
  },
  setup() {
    const auditStore = useAuditStore();
    const toastStore = useToastStore();

    const showModal = ref(false);
    const selectedLog = ref(null);
    const tableTopRef = ref(null);

    const heroSectionClass =
      'relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-cyan-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)]';
    const filtersPanelClass =
      'bg-gradient-to-r from-slate-50/80 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-700/80 rounded-2xl p-6 mb-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-5';
    const filterInputClass =
      'w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition';
    const filterSelectClass =
      'w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition';
    const actorAvatarClass =
      'w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-sm font-semibold text-slate-800 dark:text-slate-100';
    const actorRoleBadgeBaseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap';

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

    const actorRoleBadgeClass = (role) => {
      const normalized = (role || '').toString().toLowerCase();
      if (normalized === 'super_admin') {
        return `${actorRoleBadgeBaseClass} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`;
      }
      if (normalized === 'admin') {
        return `${actorRoleBadgeBaseClass} bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300`;
      }
      return `${actorRoleBadgeBaseClass} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`;
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

    watch(() => mainStore.mockApi, async (value, oldValue) => {
      if (value === oldValue) return;
      if (!authStore.isAuthenticated || showLoginRequired.value) return;
      // Only refetch when value actually changes
      auditStore.fetchLogs();
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

    const scrollToTableTop = () => {
      if (tableTopRef.value && typeof tableTopRef.value.scrollIntoView === 'function') {
        const rect = tableTopRef.value.getBoundingClientRect();
        const y = Math.max(0, window.scrollY + rect.top - 100);
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    };

    const goToPage = async (page) => {
      const totalPages = Number(auditStore.pagination.totalPages) || 1;
      const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
      if (nextPage === (Number(auditStore.filters.page) || 1)) return;
      auditStore.filters.page = nextPage;
      await auditStore.fetchLogs();
      scrollToTableTop();
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

    return {
      auditStore,
      formatDate,
      formatDetails,
      applyFilters,
      clearFilters,
      onExport,
      goToPage,
      showModal,
      selectedLog,
      totalLogCount,
      successCount,
      issueCount,
      openLog,
      closeLog,
      copySelectedLog,
      showLoginRequired,
      openLoginModal,
      badgeColor,
      avatarInitial,
      actorDisplay,
      actorRoleBadgeClass,
      heroSectionClass,
      filtersPanelClass,
      filterInputClass,
      filterSelectClass,
      actorAvatarClass,
      tableTopRef
    };
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
  text-align: center;
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
  .audit-cell-view,
  .audit-cell-actor,
  .audit-cell-when,
  .audit-cell-target {
    border-bottom: 1px solid #e2e8f0; /* border-b */
  }
  .dark .audit-cell-view,
  .dark .audit-cell-actor,
  .dark .audit-cell-when,
  .dark .audit-cell-target {
    border-color: #334155; /* dark:border-slate-700 */
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

