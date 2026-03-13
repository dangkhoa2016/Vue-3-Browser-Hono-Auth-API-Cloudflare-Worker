<template>
  <div class="relative max-w-7xl mx-auto">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="blue"
      button-tone="indigo"
      :title="$t('message.auth.login_required')"
      :message="$t('message.token_audit.access_denied.login_required') || 'You need to log in to access the token audit logs.'"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <!-- Super Admin Required Section -->
    <section v-else-if="!isSuperAdmin" class="bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-3xl p-8 text-center shadow-sm">
      <i class="bi bi-exclamation-triangle-fill text-5xl text-indigo-600 dark:text-indigo-400 mb-4"></i>
      <h3 class="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">{{ $t('message.token_audit.access_denied.title') || 'Access Denied' }}</h3>
      <p class="text-indigo-700 dark:text-indigo-300">{{ $t('message.token_audit.access_denied.message') || 'Only Super Admins can access the Token Audit Logs.' }}</p>
    </section>

    <template v-else>
      <section class="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 mb-8 border border-slate-100 dark:border-slate-800/60 shadow-sm p-6 lg:p-8">
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div class="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-indigo-900/10 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200 px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase mb-4 shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
              <i class="bi bi-list-columns-reverse"></i> {{ $t('message.token_audit.security') || 'AUDIT TRAIL' }}
            </div>
            <h1 class="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
              {{ $t('message.token_audit.title') || 'Token Audit Logs' }}
            </h1>
            <p class="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-2xl">
              {{ $t('message.token_audit.subtitle') || 'Review system-wide token activities including logins, logouts, token refreshes, and suspicious activities.' }}
            </p>
          </div>
          <div class="flex flex-col sm:flex-row items-stretch lg:items-center lg:justify-end gap-3 z-10 w-full lg:w-auto mt-4 lg:mt-0">
            <ActionTextButton
              variant="soft"
              shape="full"
              :icon="loading ? 'bi bi-arrow-clockwise animate-spin' : 'bi bi-arrow-clockwise'"
              :title="$t('message.common.retry_title') || 'Reload'"
              :disabled="loading"
              class="w-full sm:w-auto justify-center whitespace-nowrap"
              @click="fetchLogs"
            >
              {{ $t('message.common.reload') || 'Reload' }}
            </ActionTextButton>
          </div>
        </div>
      </section>

      <!-- Search & Filters -->
      <section class="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm shadow-sm relative z-20">
        <div class="relative w-full md:max-w-md group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <i class="bi bi-search"></i>
          </div>
          <input
            type="text"
            v-model="searchQuery"
            @input="handleSearch"
            :placeholder="$t('message.token_audit.search_placeholder') || 'Search by Email, JTI, User ID or Action...'"
            class="block w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 text-slate-900 dark:text-slate-100 placeholder-slate-400 sm:text-sm shadow-sm"
          />
          <button 
            v-if="searchQuery" 
            @click="clearSearch" 
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto">
          <ActionTextButton
            v-if="selectedItems.length > 0"
            icon="bi bi-x-circle"
            tone="slate"
            size="md"
            shape="pill"
            class="w-full sm:flex-1 justify-center whitespace-nowrap"
            @click="clearSelection"
          >
            {{ $t('message.common.clear') || 'Clear' }}
          </ActionTextButton>
          <ActionTextButton
            v-if="selectedItems.length > 0"
            icon="bi bi-trash"
            tone="red"
            size="md"
            shape="pill"
            class="w-full sm:flex-1 justify-center whitespace-nowrap"
            @click="confirmBulkDelete"
          >
            {{ $t('message.token_audit.delete_selected') || 'Delete Selected' }}
          </ActionTextButton>
        </div>
      </section>

      <!-- Main Content Area -->
      <div v-if="loading && items.length === 0" class="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm shadow-sm">
        <div class="relative w-16 h-16 mb-4">
          <div class="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
          <div class="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>
        <p class="text-slate-500 dark:text-slate-400 font-medium animate-pulse">{{ $t('message.common.loading_data') || 'Loading data...' }}</p>
      </div>

      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-8 text-center shadow-sm">
         <i class="bi bi-exclamation-octagon text-4xl text-red-500 mb-3"></i>
         <p class="text-red-700 dark:text-red-400 font-medium">{{ error }}</p>
         <ActionTextButton icon="bi bi-arrow-clockwise" tone="red" size="sm" shape="pill" class="mt-4" @click="fetchLogs">
           {{ $t('message.common.retry') || 'Retry' }}
         </ActionTextButton>
      </div>

      <div v-else-if="items.length === 0" class="bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-12 text-center backdrop-blur-sm shadow-sm">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 shadow-inner">
          <i class="bi bi-list-check text-4xl text-slate-400 dark:text-slate-500"></i>
        </div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{{ $t('message.token_audit.no_logs_title') || 'No Audit Logs Found' }}</h3>
        <p class="text-slate-500 dark:text-slate-400">{{ $t('message.token_audit.no_logs_desc') || 'There are currently no records indicating recent token activity matching your criteria.' }}</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 transition-colors duration-300">
        <div class="overflow-x-auto pb-2">
          <table class="max-[992px]:mt-4 mt-0 min-w-full text-sm max-[992px]:block">
            <thead class="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider max-[992px]:hidden">
              <tr>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold w-12">
                  <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                </th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold">{{ $t('message.token_audit.table.action') || 'Action' }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold">{{ $t('message.token_audit.table.user') || 'User' }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold">{{ $t('message.token_audit.table.ip_address') || 'IP Address' }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold">{{ $t('message.token_audit.table.status') || 'Status' }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold">{{ $t('message.token_audit.table.created_at') || 'Timestamp' }}</th>
                <th scope="col" class="px-5 py-3.5 text-right text-xs font-semibold">{{ $t('message.token_audit.table.actions') || 'Actions' }}</th>
              </tr>
            </thead>
            <tbody class="max-[992px]:block max-[992px]:px-4">
              <tr v-for="item in items" :key="item.id" :class="tableRowClass">
                <td :class="checkboxCellClass" :data-label="$t('message.common.select') || 'Select'">
                  <input type="checkbox" :value="item.id" v-model="selectedItems" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                </td>
                <td :class="actionCellClass" :data-label="$t('message.token_audit.table.action') || 'Action'">
                  <span :class="getActionTailwindClass(item.action)">
                    {{ item.action }}
                  </span>
                </td>
                <td :class="userCellClass" :data-label="$t('message.token_audit.table.user') || 'User'">
                  <div v-if="item.user_email" class="flex flex-col max-[992px]:items-end">
                    <span class="font-medium truncate" :title="item.user_email">{{ item.user_email }}</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">ID: {{ item.user_id }}</span>
                  </div>
                  <span v-else class="text-slate-400 dark:text-slate-500">#{{ item.user_id || 'N/A' }}</span>
                </td>
                <td :class="ipCellClass" :data-label="$t('message.token_audit.table.ip_address') || 'IP Address'">{{ item.ip_address || '-' }}</td>
                <td :class="statusCellClass" :data-label="$t('message.token_audit.table.status') || 'Status'">
                  <span v-if="item.success === 1 || item.success === true" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/30">
                    <i class="bi bi-check2-circle mr-1"></i> {{ $t('message.token_audit.table.status_success') || 'Success' }}
                  </span>
                  <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800/30" :title="item.error_message">
                    <i class="bi bi-x-circle mr-1"></i> {{ $t('message.token_audit.table.status_failure') || 'Failed' }}
                  </span>
                </td>
                <td :class="dateCellClass" :data-label="$t('message.token_audit.table.created_at') || 'Timestamp'">{{ formatDate(item.created_at) }}</td>
                <td :class="actionsCellClass" :data-label="$t('message.token_audit.table.actions') || 'Actions'">
                  <div class="flex items-center justify-end gap-2 max-[992px]:opacity-100 opacity-50 group-hover:opacity-100 transition-opacity">
                    <ActionIconButton
                      icon="bi bi-eye"
                      tone="indigo"
                      size="sm"
                      :tooltip="$t('message.common.view') || 'View Details'"
                      @click="viewLogDetails(item.id)"
                    />
                    <ActionIconButton
                      icon="bi bi-trash3"
                      tone="red"
                      size="sm"
                      :tooltip="$t('message.common.delete') || 'Delete'"
                      @click="confirmDeleteLog(item.id)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <PaginationControls :current-page="pagination.page || 1" :total-pages="pagination.totalPages || 1" :loading="loading" @change="changePage" />
        </div>
      </div>
    </template>

    <!-- Details Modal -->
    <ModalWindow :show="showDetailModal" :title="$t('message.token_audit.detail_modal.title') || 'Audit Log Details'" panelClass="!max-w-4xl !p-0 !overflow-hidden flex flex-col token-audit-detail-modal" @close="closeDetailModal">
      <div v-if="isFetchingLog" class="p-0 flex flex-col h-full">
        <div class="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 px-6 py-5 border-b border-slate-200 dark:border-slate-800 animate-pulse shrink-0">
          <div class="flex items-center justify-between mb-2 pr-8">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
              <div>
                <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
              </div>
            </div>
            <div class="h-8 bg-slate-200 dark:bg-slate-700 rounded-full w-24"></div>
          </div>
        </div>
        <div class="p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/30 animate-pulse overflow-y-auto min-h-0 flex-1">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div class="space-y-3">
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
              </div>
            </div>
            <div class="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div class="space-y-3">
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
              </div>
            </div>
          </div>
          <div class="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
            <div class="space-y-4">
              <div class="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-full"></div>
              <div class="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-full"></div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="currentLog" class="p-0 flex flex-col h-full max-h-[85vh]">
        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 px-6 py-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div class="flex items-center justify-between mb-2 pr-8">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
                <i class="bi bi-fingerprint text-xl"></i>
              </div>
              <div>
                <span :class="getActionTailwindClass(currentLog.action, 'text-lg font-bold tracking-tight')">{{ currentLog.action }}</span>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <i class="bi bi-clock-history"></i> {{ formatDate(currentLog.created_at) }}
                </p>
              </div>
            </div>
            
            <span v-if="currentLog.success === 1 || currentLog.success === true" class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
               <i class="bi bi-check-circle-fill mr-1.5"></i> {{ $t('message.token_audit.table.status_success') || 'Success' }}
            </span>
            <span v-else class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shadow-sm">
               <i class="bi bi-exclamation-triangle-fill mr-1.5"></i> {{ $t('message.token_audit.table.status_failure') || 'Failed' }}
            </span>
          </div>
        </div>
        
        <div class="p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/30 overflow-y-auto min-h-0 flex-1">
          <div v-if="currentLog.error_message" class="bg-rose-50/80 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/50 shadow-sm flex gap-3 items-start">
            <i class="bi bi-x-circle-fill text-rose-500 mt-0.5"></i>
            <div>
              <p class="text-sm font-semibold text-rose-800 dark:text-rose-300 mb-1">{{ $t('message.token_audit.detail_modal.error_message') || 'Error Message' }}</p>
              <p class="text-sm text-rose-600 dark:text-rose-400 leading-relaxed">{{ currentLog.error_message }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="bg-white dark:bg-slate-800/80 p-5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 transition-all hover:shadow-md">
              <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                <i class="bi bi-person-badge text-indigo-500"></i>
                <p class="text-sm font-bold text-slate-800 dark:text-slate-200">User Information</p>
              </div>
              <ul class="space-y-3 test-sm">
                <li class="flex justify-between items-center"><span class="text-slate-500 text-sm">User ID:</span> <span class="font-mono text-sm bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">{{ currentLog.user_id }}</span></li>
                <li class="flex flex-col mt-2">
                  <span class="text-slate-500 text-sm mb-1">Email:</span> 
                  <span class="font-medium text-slate-900 dark:text-slate-100 break-all">{{ currentLog.user_email || '-' }}</span>
                </li>
                <li class="flex justify-between items-center mt-2">
                  <span class="text-slate-500 text-sm">Role:</span> 
                  <span class="font-medium text-xs uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded">{{ currentLog.user_role || '-' }}</span>
                </li>
              </ul>
            </div>
            
            <div class="bg-white dark:bg-slate-800/80 p-5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 transition-all hover:shadow-md">
               <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                <i class="bi bi-display text-indigo-500"></i>
                <p class="text-sm font-bold text-slate-800 dark:text-slate-200">Network & Device</p>
              </div>
              <ul class="space-y-3">
                <li class="flex flex-col">
                  <span class="text-slate-500 text-sm mb-1">IP Address:</span> 
                  <div class="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-mono text-sm bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <i class="bi bi-globe2 text-slate-400"></i> {{ currentLog.ip_address || '-' }}
                  </div>
                </li>
                <li class="flex flex-col mt-2">
                  <span class="text-slate-500 text-sm mb-1">User Agent:</span> 
                  <span class="font-mono text-xs text-slate-600 dark:text-slate-400 break-words bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">{{ currentLog.user_agent || '-' }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-800/80 p-5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 hover:shadow-md transition-all">
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50">
              <i class="bi bi-key text-indigo-500"></i>
              <p class="text-sm font-bold text-slate-800 dark:text-slate-200">Token Details</p>
            </div>
            <ul class="space-y-4">
              <li>
                <span class="text-slate-500 text-sm block mb-1">Access Token JTI:</span> 
                <div class="flex items-center gap-2">
                  <span class="font-mono text-sm text-indigo-700 dark:text-indigo-400 break-all bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg w-full border border-indigo-100 dark:border-indigo-800/30">{{ currentLog.token_jti || '-' }}</span>
                </div>
              </li>
              <li>
                <span class="text-slate-500 text-sm block mb-1">Refresh Token JTI:</span> 
                <div class="flex items-center gap-2">
                  <span class="font-mono text-sm text-purple-700 dark:text-purple-400 break-all bg-purple-50/50 dark:bg-purple-900/20 px-3 py-2 rounded-lg w-full border border-purple-100 dark:border-purple-800/30">{{ currentLog.refresh_jti || '-' }}</span>
                </div>
              </li>
            </ul>
          </div>
          
          <div v-if="currentLog.metadata" class="bg-white dark:bg-slate-800/80 p-5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 hover:shadow-md transition-all">
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50">
              <i class="bi bi-code-slash text-indigo-500"></i>
              <p class="text-sm font-bold text-slate-800 dark:text-slate-200">Metadata</p>
            </div>
            <div class="relative group">
              <pre class="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">{{ formatMetadata(currentLog.metadata) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </ModalWindow>

    <!-- Delete Confirm Modal -->
    <ConfirmDeleteModal
      :show="showDeleteModal"
      :title="$t('message.token_audit.delete_modal.title') || 'Delete Audit Log?'"
      :message="$t('message.token_audit.delete_modal.message') || 'Are you sure you want to delete this token audit log? This action cannot be undone and will remove the record permanently.'"
      :confirm-label="$t('message.common.delete') || 'Delete'"
      :loading="isDeleting"
      @confirm="executeDeleteLog"
      @cancel="closeDeleteModal"
    />
    
    <!-- Bulk Delete Confirm Modal -->
    <ConfirmDeleteModal
      :show="showBulkDeleteModal"
      :title="$t('message.token_audit.bulk_delete_modal.title') || 'Delete Multiple Logs?'"
      :message="($t('message.token_audit.bulk_delete_modal.message') || 'Are you sure you want to delete the selected audit logs? This action cannot be undone.') + ` (${selectedItems.length} selected)`"
      :confirm-label="$t('message.token_audit.delete_selected') || 'Delete Selected'"
      :loading="isDeleting"
      @confirm="executeBulkDelete"
      @cancel="closeBulkDeleteModal"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useTokenAuditStore } from '/assets/js/stores/tokenAuditStore.js';

import ActionIconButton from '../components/ActionIconButton.vue';
import ActionTextButton from '../components/ActionTextButton.vue';
import PaginationControls from '../components/PaginationControls.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import ModalWindow from '../components/ModalWindow.vue';
import LoginRequiredPrompt from '../components/LoginRequiredPrompt.vue';
import { useDebouncedFilters } from '/vue/composables/useDebouncedFilters.js';
import { useModalState } from '/vue/composables/useModalState.js';
import { useAuthGate } from '/vue/composables/useAuthGate.js';

export default {
  name: 'AdminTokenAudit',
  components: {
    ActionIconButton,
    ActionTextButton,
    PaginationControls,
    ConfirmDeleteModal,
    ModalWindow,
    LoginRequiredPrompt
  },
  setup() {
    const { t } = useI18n();
    const mainStore = useMainStore();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const auditStore = useTokenAuditStore();

    // Data state mapped from store
    const items = computed(() => auditStore.items);
    const loading = computed(() => auditStore.loading);
    const error = computed(() => auditStore.error);
    const pagination = computed(() => auditStore.pagination);
    
    // Details
    const currentLog = computed(() => auditStore.currentLog);
    const isFetchingLog = computed(() => auditStore.isFetchingLog);
    const isDeleting = computed(() => auditStore.isDeleting);
    
    // Local state for UI
    const searchQuery = ref('');
    const selectedItems = ref([]);
    const { runDebounced, clearDebounce } = useDebouncedFilters(300);

    // Modals state
    const detailModal = useModalState({ initialMode: 'detail', initialValue: null });
    const showDetailModal = detailModal.isOpen;
    const deleteModal = useModalState({ initialMode: 'delete', initialValue: null });
    const showDeleteModal = deleteModal.isOpen;
    const bulkDeleteModal = useModalState({ initialMode: 'bulk-delete', initialValue: null });
    const showBulkDeleteModal = bulkDeleteModal.isOpen;
    const deletingId = ref(null);

    // Auth state access
    const isSuperAdmin = computed(() => {
      return authStore.user?.role?.toUpperCase() === 'SUPER_ADMIN';
    });

    const isAllSelected = computed(() => {
      return items.value.length > 0 && selectedItems.value.length === items.value.length;
    });

    const mobileDataLabelBaseClass =
      'max-[992px]:flex max-[992px]:items-center max-[992px]:justify-between max-[992px]:px-4 max-[992px]:py-2.5 max-[992px]:before:content-[attr(data-label)] max-[992px]:before:text-[11px] max-[992px]:before:uppercase max-[992px]:before:tracking-[0.2em] max-[992px]:before:text-slate-500 dark:max-[992px]:before:text-slate-400 max-[992px]:before:pr-3';
    
    const tableRowClass =
      'border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition max-[992px]:block max-[992px]:border max-[992px]:border-slate-200/70 dark:max-[992px]:border-slate-700 max-[992px]:rounded-2xl max-[992px]:p-1 max-[992px]:mb-4 max-[992px]:bg-white/90 dark:max-[992px]:bg-slate-900/80';

    const checkboxCellClass = `px-5 py-3 whitespace-nowrap text-sm ${mobileDataLabelBaseClass}`;
    const actionCellClass = `px-5 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-100 ${mobileDataLabelBaseClass}`;
    const userCellClass = `px-5 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 ${mobileDataLabelBaseClass}`;
    const ipCellClass = `px-5 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono ${mobileDataLabelBaseClass}`;
    const statusCellClass = `px-5 py-3 whitespace-nowrap text-sm ${mobileDataLabelBaseClass}`;
    const dateCellClass = `px-5 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 ${mobileDataLabelBaseClass}`;
    const actionsCellClass = `px-5 py-3 whitespace-nowrap text-right text-sm font-medium ${mobileDataLabelBaseClass}`;

    // Formatting utilities
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(date);
      } catch (e) {
        return dateString;
      }
    };
    
    const formatMetadata = (metadata) => {
      if (!metadata) return '';
      try {
        if (typeof metadata === 'string') {
          return JSON.stringify(JSON.parse(metadata), null, 2);
        }
        return JSON.stringify(metadata, null, 2);
      } catch (e) {
        return metadata;
      }
    };

    const getActionTailwindClass = (action, baseClasses = '') => {
      const actions = {
        'LOGIN': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md',
        'LOGOUT': 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md',
        'REFRESH_TOKEN': 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-md',
        'REVOKE': 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md',
        'INVALID_TOKEN': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-md'
      };
      
      const defaultStyle = 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono text-xs';
      return `${baseClasses} ${actions[action] || defaultStyle}`;
    };

    const fetchLogs = async (page = 1) => {
      if (!authStore.isAuthenticated || !isSuperAdmin.value) return;

      selectedItems.value = []; // clear selection on fetch
      await auditStore.fetchLogs({
        page,
        limit: pagination.value.limit,
        search: searchQuery.value
      });
    };

    const {
      showLoginRequired,
      openLoginModal,
      ensureAuthenticated,
      handleAuthStateChange
    } = useAuthGate({
      authStore,
      modalStore,
      sessionAuthFlagKey: 'authRequired',
      onAuthenticated: async () => {
        if (isSuperAdmin.value) {
          await fetchLogs();
        }
      }
    });

    const changePage = (newPage) => {
      if (newPage < 1 || (pagination.value.totalPages && newPage > pagination.value.totalPages)) return;
      fetchLogs(newPage);
    };

    const handleSearch = () => {
      runDebounced('admin-token-audit-search', async () => {
        await fetchLogs(1);
      });
    };

    const clearSearch = () => {
      clearDebounce('admin-token-audit-search');
      searchQuery.value = '';
      fetchLogs(1);
    };

    const clearSelection = () => {
      selectedItems.value = [];
    };

    const toggleSelectAll = (e) => {
      if (e.target.checked) {
        selectedItems.value = items.value.map(item => item.id);
      } else {
        selectedItems.value = [];
      }
    };

    const viewLogDetails = async (id) => {
      detailModal.open(id, 'detail');
      await auditStore.fetchLogDetails(id);
    };

    const closeDetailModal = () => {
      detailModal.close({ reset: true });
    };

    const confirmDeleteLog = (id) => {
      deletingId.value = id;
      deleteModal.open(id, 'delete');
    };

    const confirmBulkDelete = () => {
      if (selectedItems.value.length === 0) return;
      bulkDeleteModal.open(null, 'bulk-delete');
    };

    const closeDeleteModal = () => {
      deleteModal.close({ reset: true });
    };

    const closeBulkDeleteModal = () => {
      bulkDeleteModal.close({ reset: true });
    };

    const executeDeleteLog = async () => {
      if (!deletingId.value) return;
      const targetId = deletingId.value;
      const success = await auditStore.deleteLog(deletingId.value);
      
      if (success) {
        closeDeleteModal();
        deletingId.value = null;
        selectedItems.value = selectedItems.value.filter(id => id !== targetId);
      }
    };
    
    const executeBulkDelete = async () => {
      if (selectedItems.value.length === 0) return;
      const success = await auditStore.bulkDeleteLogs(selectedItems.value);
      if (success) {
        closeBulkDeleteModal();
        selectedItems.value = [];
      }
    };

    onMounted(async () => {
      await ensureAuthenticated({ checkSessionFlag: true, openModal: true });
    });

    watch(() => mainStore.mockApi, (newVal, oldVal) => {
      if (newVal !== oldVal && authStore.isAuthenticated && isSuperAdmin.value) {
        fetchLogs();
      }
    });

    watch(() => authStore.isAuthenticated, async (newVal) => {
      await handleAuthStateChange(newVal);
    });

    return {
      tableRowClass,
      checkboxCellClass,
      actionCellClass,
      userCellClass,
      ipCellClass,
      statusCellClass,
      dateCellClass,
      actionsCellClass,
      
      items,
      loading,
      error,
      searchQuery,
      pagination,
      showLoginRequired,
      isSuperAdmin,
      showDetailModal,
      closeDetailModal,
      currentLog,
      isFetchingLog,
      showDeleteModal,
      showBulkDeleteModal,
      closeDeleteModal,
      closeBulkDeleteModal,
      isDeleting,
      selectedItems,
      isAllSelected,
      
      fetchLogs,
      changePage,
      handleSearch,
      clearSearch,
      clearSelection,
      formatDate,
      formatMetadata,
      getActionTailwindClass,
      openLoginModal,
      viewLogDetails,
      confirmDeleteLog,
      confirmBulkDelete,
      executeDeleteLog,
      executeBulkDelete,
      toggleSelectAll
    };
  }
}
</script>

<style scoped>
:deep(.token-audit-detail-modal > div) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
:deep(.token-audit-detail-modal > div > .mt-3) {
  display: none;
}
:deep(.token-audit-detail-modal > div > .mt-6) {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}
.table-fixed {
  table-layout: fixed;
}
.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  border-radius: 10px;
}
</style>