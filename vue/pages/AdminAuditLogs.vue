<template>
  <div class="relative max-w-7xl mx-auto space-y-8">
    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="blue"
      :title="tf(['message.audit.login_required', 'message.auth.login_required'], 'Login required')"
      :message="tf(['message.audit.login_required_message', 'message.auth.login_required_message'], 'Please login to view audit logs.')"
      :button-text="tf('message.auth.login', 'Login')"
      @action="openLoginModal"
    />

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"
        content-class="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-cyan-900/10 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              {{ tf('message.audit.badge', 'Activity Monitoring') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{{ tf('message.navbar.audit_logs', 'Audit Logs') }}</h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ tf('message.audit.search_placeholder', 'Search logs, actors, targets...') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <ActionTextButton
                variant="soft"
                shape="full"
                icon="bi bi-arrow-clockwise"
                @click="auditStore.reload()"
              >
                {{ tf('message.admin_users.reload', 'Reload') }}
              </ActionTextButton>
            </div>
          </div>
        </template>

        <template #right>
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
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ tf('message.audit.stats_total', 'Total Logs') }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-3xl font-black text-slate-900 dark:text-white">{{ totalLogCount }}</span>
                  <i class="bi bi-journal-text text-2xl text-cyan-500"></i>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                  <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ tf('message.audit.stats_success', 'Success') }}</p>
                  <div class="mt-3 flex items-center justify-between">
                    <span class="text-2xl font-black text-slate-900 dark:text-white">{{ successCount }}</span>
                    <i class="bi bi-check-circle text-xl text-emerald-500"></i>
                  </div>
                </div>
                <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
                  <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ tf('message.audit.stats_issues', 'Issues') }}</p>
                  <div class="mt-3 flex items-center justify-between">
                    <span class="text-2xl font-black text-slate-900 dark:text-white">{{ issueCount }}</span>
                    <i class="bi bi-exclamation-triangle text-xl text-amber-500"></i>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </PageHeroSection>

      <section class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
      <!-- Enhanced Filters Section -->
      <div :class="filtersPanelClass">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <i class="bi bi-funnel-fill text-slate-600 dark:text-slate-400 text-lg"></i>
            <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200">{{ tf('message.audit.filters', 'Filters') }}</h3>
          </div>
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {{ totalLogCount }} {{ tf('message.audit.items', 'items') }}
          </span>
        </div>

        <!-- Row 1: Search + Main selectors -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-6">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ tf('message.audit.search', 'Search') }}</label>
            <div class="relative">
              <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                v-model="auditStore.filters.search"
                @keyup.enter="applyFilters"
                :class="filterInputClass"
                :placeholder="tf('message.audit.search_placeholder', 'Search logs, actors, targets...')"
              />
            </div>
          </div>

          <div class="lg:col-span-3">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ tf('message.audit.action', 'Action') }}</label>
            <select
              v-model="auditStore.filters.action"
              @change="applyFilters"
              :class="filterSelectClass"
            >
              <option value="">{{ tf('message.audit.all_actions', 'All Actions') }}</option>
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
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ tf('message.audit.target_type', 'Target Type') }}</label>
            <select
              v-model="auditStore.filters.targetType"
              @change="applyFilters"
              :class="filterSelectClass"
            >
              <option value="">{{ tf('message.audit.all_targets', 'All Targets') }}</option>
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
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ tf('message.audit.actor_role', 'Actor Role') }}</label>
            <select
              v-model="auditStore.filters.actorRole"
              @change="applyFilters"
              :class="filterSelectClass"
            >
              <option value="">{{ tf('message.audit.all_roles', 'All Roles') }}</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="anonymous">Anonymous</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ tf('message.audit.start_date', 'Start Date') }}</label>
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
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{{ tf('message.audit.end_date', 'End Date') }}</label>
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
            {{ tf('message.audit.search_placeholder', 'Search logs, actors, targets...') }}
          </p>
          <div class="flex items-center gap-3">
            <ActionTextButton
              tone="teal"
              shape="xl"
              icon="bi bi-check-circle text-sm"
              @click="applyFilters"
            >
              {{ tf('message.audit.apply_filters', 'Apply Filters') }}
            </ActionTextButton>
            <ActionTextButton
              tone="slate"
              shape="xl"
              icon="bi bi-x-circle text-sm"
              @click="clearFilters"
            >
              {{ tf('message.audit.clear_filters', 'Clear Filters') }}
            </ActionTextButton>
          </div>
        </div>
      </div>

      <!-- Summary and Export -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <span class="text-sm text-slate-600 dark:text-slate-400">
            {{ totalLogCount }} {{ tf('message.audit.items', 'items') }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <ActionTextButton
            tone="emerald"
            shape="xl"
            icon="bi bi-download text-sm"
            @click="onExport('csv')"
          >
            {{ tf('message.audit.export_csv', 'Export CSV') }}
          </ActionTextButton>
        </div>
      </div>

      <div ref="tableTopRef" class="rounded-[18px] max-[992px]:border-none border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div v-if="auditStore.loading" class="p-6 space-y-4 animate-pulse">
          <div v-for="row in 6" :key="row" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
        </div>

        <div v-else-if="auditStore.error" class="p-8 text-center">
          <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.errors.failed_to_load', 'Failed to load audit logs', { item: tf('message.navbar.audit_logs', 'Audit Logs'), message: auditStore.error }) }}</h3>
          <ActionTextButton
            class="mt-4"
            tone="rose"
            shape="full"
            icon="bi bi-arrow-clockwise"
            @click="auditStore.reload()"
          >
            {{ tf('message.common.retry', 'Retry') }}
          </ActionTextButton>
        </div>

        <div v-else class="bg-white/80 dark:bg-slate-900">
          <div class="overflow-x-auto">
            <table class="audit-table">
              <thead class="audit-thead">
                <tr>
                  <th class="px-6 py-3 text-center">{{ $t('message.common.actions', 'Actions') }}</th>
                  <th class="px-6 py-3 text-left">{{ tf('message.audit.actor', 'Actor') }}</th>
                  <th class="px-6 py-3 text-left">{{ tf('message.audit.when', 'When') }}</th>
                  <th class="px-6 py-3 text-left">{{ tf('message.audit.action', 'Action') }}</th>
                  <th class="px-6 py-3 text-left">{{ tf('message.audit.target', 'Target') }}</th>
                  <th class="px-6 py-3 text-left">{{ tf('message.audit.details', 'Details') }}</th>
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
                        :title="tf('message.common.view', 'View')"
                        :aria-label="tf('message.common.view', 'View')"
                      />
                    </div>
                  </td>
                  <td class="audit-cell-actor cursor-pointer" @click.stop="openLog(log)" :data-label="tf('message.audit.actor', 'Actor')">
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
                  <td class="audit-cell-when cursor-pointer" @click.stop="openLog(log)" :data-label="tf('message.audit.when', 'When')">{{ formatDate(log.timestamp || log.created_at) }}</td>
                  <td class="audit-cell-action cursor-pointer" @click.stop="openLog(log)" :data-label="tf('message.audit.action', 'Action')">
                    <span :class="badgeColor(log.action)" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold">
                      {{ log.action }}</span>
                  </td>
                  <td class="audit-cell-target cursor-pointer" @click.stop="openLog(log)" :data-label="tf('message.audit.target', 'Target')">{{ log.target_type || log.resource || log.target || '-' }}</td>
                  <td class="audit-cell-details" :data-label="tf('message.audit.details', 'Details')"><div class="text-xs line-clamp-2 w-full text-left">{{ formatDetails(log.details || log.meta || log.payload) }}</div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" v-if="!auditStore.error && (auditStore.pagination.totalPages || 1) > 1">
        <PaginationControls
          :current-page="auditStore.pagination.page || 1"
          :total-pages="auditStore.pagination.totalPages || 1"
          :page-size="auditStore.pagination.limit || 20"
          :page-size-options="[10, 20, 50]"
          :show-page-size="true"
          :loading="auditStore.loading"
          @change="goToPage"
          @change-size="handlePageSizeChange"
        />
      </div>
      </section>
    </template>

    <!-- Log Details Modal -->

    <ModalWindow :show="showModal" :title="tf('message.audit.log_details', 'Log Details')" @close="closeLog" :panel-class="'max-w-3xl sm:max-w-4xl w-full'">
      <div class="space-y-4 modal-detail-body">
        <!-- Header: Action, Date, ID, Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 break-words">{{ $t('message.audit.action') }}: {{ selectedLog?.action || tf('message.audit.log_details', 'Log Details') }}</h3>
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
              {{ tf('message.audit.copy_json', 'Copy JSON') }}
            </ActionTextButton>
            <ActionTextButton
              variant="soft"
              shape="xl"
              size="sm"
              icon="bi bi-x-lg"
              class="text-xs"
              @click="closeLog"
            >
              {{ tf('message.common.close', 'Close') }}
            </ActionTextButton>
          </div>
        </div>

        <!-- Responsive Info Grid -->
        <div class="grid grid-cols-1 min-[700px]:grid-cols-2 gap-4 overflow-auto max-h-[600px]">
          <div class="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.actor', 'Actor') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.actor_name || selectedLog?.actor_email || selectedLog?.user_email || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.actor_role', 'Actor Role') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.actor_role || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.action', 'Action') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.action || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.target', 'Target') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.target_type || selectedLog?.resource || selectedLog?.target || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.timestamp', 'Timestamp') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ formatDate(selectedLog?.timestamp || selectedLog?.created_at) }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.request_id', 'Request ID') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.request_id || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.ip_address', 'IP') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.ip_address || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.user_agent', 'User Agent') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.user_agent || selectedLog?.userAgent || '-' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2 py-2 px-3 rounded-md bg-slate-50 border border-slate-200 mb-1 break-words dark:bg-slate-800 dark:border-slate-700">
              <span class="min-w-0 sm:min-w-[110px] text-[0.82em] sm:text-[0.85em] text-slate-500 font-medium flex-shrink-0 dark:text-slate-300">{{ tf('message.audit.status', 'Status') }}</span>
              <span class="font-semibold text-slate-900 flex-1 break-words dark:text-slate-100">{{ selectedLog?.status || '-' }}</span>
            </div>
          </div>
          <div class="flex flex-col">
            <div class="mb-2 text-xs text-slate-500">{{ tf('message.audit.full_payload', 'Full Payload') }}</div>
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
export default {
  name: 'AdminAuditLogs'
};
</script>

<script setup>
import ModalWindow from '/vue/components/ModalWindow.vue';
import PaginationControls from '/vue/components/PaginationControls.vue';
import ActionIconButton from '/vue/components/ActionIconButton.vue';
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import PageHeroSection from '/vue/components/PageHeroSection.vue';
import { useAdminAuditLogsPage } from '/vue/composables/useAdminAuditLogsPage.js';

const {
  auditStore,
  formatDate,
  formatDetails,
  applyFilters,
  clearFilters,
  onExport,
  goToPage,
  handlePageSizeChange,
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
  tf,
  tableTopRef
} = useAdminAuditLogsPage();
</script>

<style scoped>
.audit-table { min-width: 100%; font-size: 0.875rem; line-height: 1.25rem; }
.audit-thead { background-color: rgb(248, 250, 252); color: rgb(100, 116, 139); text-transform: uppercase; letter-spacing: 0.05em; }
.dark .audit-thead { background-color: rgba(30, 41, 59, 0.7); color: rgb(148, 163, 184); }
.audit-tbody { margin-top: 0.75rem; }
.audit-row { border-top: 1px solid #f1f5f9; transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); }
.dark .audit-row { border-color: #1e293b; }
.audit-row:hover { background-color: rgba(248, 250, 252, 0.7); }
.dark .audit-row:hover { background-color: rgba(30, 41, 59, 0.6); }
.audit-cell-actor,
.audit-cell-when,
.audit-cell-action,
.audit-cell-target,
.audit-cell-details,
.audit-cell-view {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
}
.audit-cell-when { color: #64748b; }
.dark .audit-cell-when { color: #94a3b8; }
.audit-cell-target { color: #334155; }
.dark .audit-cell-target { color: #e2e8f0; }
.audit-cell-details { color: #64748b; }
.dark .audit-cell-details { color: #cbd5e1; }
.audit-cell-view { text-align: center; }

@media (max-width: 992px) {
  .audit-table,
  .audit-tbody,
  .audit-row { display: block; }
  .audit-thead { display: none; }
  .audit-row {
    border: 1px solid rgba(226, 232, 240, 0.7);
    border-radius: 1rem;
    padding: 0.25rem;
    margin-bottom: 1rem;
    background-color: rgba(255, 255, 255, 0.9);
  }
  .dark .audit-row { border-color: #334155; background-color: #0f172a; }
  .audit-cell-actor,
  .audit-cell-when,
  .audit-cell-action,
  .audit-cell-target,
  .audit-cell-details,
  .audit-cell-view {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
  }
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
    color: #64748b;
    padding-right: 0.75rem;
  }
  .dark .audit-cell-actor::before,
  .dark .audit-cell-when::before,
  .dark .audit-cell-action::before,
  .dark .audit-cell-target::before,
  .dark .audit-cell-details::before,
  .dark .audit-cell-view::before { color: #94a3b8; }
  .audit-cell-view,
  .audit-cell-actor,
  .audit-cell-when,
  .audit-cell-target { border-bottom: 1px solid #e2e8f0; }
  .dark .audit-cell-view,
  .dark .audit-cell-actor,
  .dark .audit-cell-when,
  .dark .audit-cell-target { border-color: #334155; }
  .audit-cell-details { display: block; width: 100%; max-width: none; }
  .audit-cell-details::before { display: block; margin-bottom: 0.5rem; }
}

@media (min-width: 768px) {
  .audit-cell-details { max-width: 480px; }
}
</style>

