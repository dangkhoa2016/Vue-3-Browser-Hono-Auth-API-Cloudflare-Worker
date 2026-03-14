<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 mb-6">
      <i class="bi bi-archive text-indigo-500 dark:text-indigo-400 text-2xl"></i>
      <div class="flex-1">
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ $t('message.advanced_audit.archival.title') }}</h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm">{{ $t('message.advanced_audit.archival.subtitle') }}</p>
      </div>
      <button @click="$emit('refresh')" :disabled="isLoading || isExtrasLoading" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium transition-all disabled:opacity-50">
        <i class="bi bi-arrow-clockwise" :class="{'animate-spin': isLoading}"></i> <span class="hidden sm:inline">{{ $t('message.advanced_audit.common.reload') }}</span>
      </button>
    </div>
  
    <!-- First Load Skeleton -->
    <div v-show="isLoading && !data" class="animate-pulse space-y-6 mt-6 transition-all">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="h-32 bg-slate-200 dark:bg-slate-700/50 rounded-xl"></div><div class="h-32 bg-slate-200 dark:bg-slate-700/50 rounded-xl"></div></div>
      <div class="h-64 bg-slate-200 dark:bg-slate-700/50 rounded-xl"></div>
    </div>

    <!-- Reload Skeleton -->
    <div v-show="isLoading && data" class="animate-pulse space-y-6 mt-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="h-32 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50"></div>
        <div class="h-32 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50"></div>
      </div>
      <div class="h-64 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50"></div>
    </div>

    <!-- Main Archival Top Data -->
    <div v-if="data" v-show="!isLoading" class="mt-8 space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Main Table Stats -->
        <div class="bg-indigo-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
           <h3 class="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold mb-4 border-b border-indigo-200 dark:border-slate-600 pb-2"><i class="bi bi-database"></i>{{ $t('message.advanced_audit.archival.main_hot_storage') }}</h3>
           <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-slate-500 uppercase font-semibold">{{ $t('message.advanced_audit.archival.total_active_logs') }}</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">{{ data.main_table?.total_logs || 0 }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-500 uppercase font-semibold">{{ $t('message.advanced_audit.archival.logs_30d') }}</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">{{ data.main_table?.logs_30d || 0 }}</div>
              </div>
           </div>
           <div class="mt-4 text-xs text-slate-500 flex justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg">
              <span>{{ $t('message.advanced_audit.common.oldest') }}: {{ data.main_table?.oldest_log ? new Date(data.main_table.oldest_log).toLocaleDateString() : 'N/A' }}</span>
              <span>{{ $t('message.advanced_audit.common.newest') }}: {{ data.main_table?.newest_log ? new Date(data.main_table.newest_log).toLocaleDateString() : 'N/A' }}</span>
           </div>
        </div>
        
        <!-- Archive Table Stats -->
        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
           <h3 class="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold mb-4 border-b border-slate-200 dark:border-slate-600 pb-2"><i class="bi bi-usb-drive"></i>{{ $t('message.advanced_audit.archival.cold_archive_storage') }}</h3>
           <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-slate-500 uppercase font-semibold">{{ $t('message.advanced_audit.archival.archived_logs') }}</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">{{ data.archive_table?.archived_logs || 0 }}</div>
              </div>
           </div>
           <div class="mt-4 text-xs text-slate-500 flex justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg">
              <span>{{ $t('message.advanced_audit.common.oldest') }}: {{ data.archive_table?.oldest_archived ? new Date(data.archive_table.oldest_archived).toLocaleDateString() : 'N/A' }}</span>
              <span>{{ $t('message.advanced_audit.common.newest') }}: {{ data.archive_table?.newest_archived ? new Date(data.archive_table.newest_archived).toLocaleDateString() : 'N/A' }}</span>
           </div>
        </div>
      </div>

      <!-- Eligibility by Category -->
      <div v-if="data.eligibility_by_category" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 overflow-hidden">
        <div class="flex justify-between items-center mb-6">
           <div>
             <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ $t('message.advanced_audit.archival.eligibility') }}</h3>
             <p class="text-xs text-slate-500">{{ $t('message.advanced_audit.archival.eligibility_desc') }}</p>
           </div>
           <div class="flex gap-2">
            <button @click="showRestoreModal = true" class="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2">
              <i class="bi bi-arrow-counterclockwise"></i>{{ $t('message.advanced_audit.archival.restore_archive_btn') }}</button>
            <button @click="showRunModal = true" class="bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-400 px-4 py-2 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2">
               <i class="bi bi-lightning-charge-fill"></i>{{ $t('message.advanced_audit.archival.run_archival_now') }}</button>
           </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs">
              <tr>
                <th scope="col" class="px-4 py-3">{{ $t('message.advanced_audit.archival.category') }}</th>
                <th scope="col" class="px-4 py-3">{{ $t('message.advanced_audit.archival.retention_policy') }}</th>
                <th scope="col" class="px-4 py-3">{{ $t('message.advanced_audit.archival.eligible_to_archive') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="(info, category) in data.eligibility_by_category" :key="category" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 capitalize">{{ category.replace(/_/g, ' ') }}</td>
                <td class="px-4 py-3 text-slate-600 dark:text-slate-400"><span class="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">{{ info.retention_days }} days</span></td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold"
                        :class="info.eligible_for_archival > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'">
                    {{ info.eligible_for_archival }} items
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Advanced System Controls Section -->
    <div v-if="data" class="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ $t('message.advanced_audit.archival.advanced_config') }}</h3>
          <div class="flex gap-2 flex-wrap">
            <button @click="loadArchivePolicies" :disabled="isExtrasLoading" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              <i class="bi" :class="isExtrasLoading ? 'bi-arrow-repeat animate-spin' : 'bi-boxes'"></i>{{ $t('message.advanced_audit.archival.review_storage') }}</button>
            <button @click="manageRetention" :disabled="isExtrasLoading" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              <i class="bi" :class="isExtrasLoading ? 'bi-arrow-repeat animate-spin' : 'bi-calendar2-range'"></i>{{ $t('message.advanced_audit.archival.check_retention_policy') }}</button>
            <button @click="openSetPolicyModal" :disabled="isExtrasLoading" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              <i class="bi bi-gear"></i>{{ $t('message.advanced_audit.archival.configure_policy') }}</button>
          </div>
        </div>

        <!-- First Load Skeleton -->
        <div v-show="isExtrasLoading && !extendedData" class="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse"></div>
        <!-- Reload Skeleton -->
        <div v-show="isExtrasLoading && extendedData" class="h-40 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse border border-slate-200/50 dark:border-slate-700/50 mb-4"></div>
        
        <div v-if="extendedData" v-show="!isExtrasLoading" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 transition-all">
          <div class="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <i class="bi bi-info-circle-fill text-indigo-500"></i> {{ extendedData.context || 'Operation Result' }}
            </h4>
            <button @click="extendedData = null" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          </div>
          
          <!-- View: Review Storage Details -->
          <div v-if="extendedData.context === 'Review Storage Details' && extendedData.data" class="space-y-6">
             <!-- Top Summary -->
             <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <i class="bi bi-bar-chart-fill"></i>
                   </div>
                   <div>
                     <div class="text-xs text-slate-500 uppercase font-bold">{{ $t('message.advanced_audit.archival.storage_analytics_generated') }}</div>
                     <div class="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">{{ extendedData.data.generated_at ? new Date(extendedData.data.generated_at).toLocaleString() : 'N/A' }}</div>
                   </div>
                </div>
             </div>

             <!-- Storage Metrics Grid -->
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Hot Storage -->
                <div class="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl overflow-hidden shadow-sm">
                   <div class="bg-indigo-50/50 dark:bg-indigo-900/20 px-5 py-3 border-b border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                      <h5 class="text-sm font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><i class="bi bi-database"></i>{{ $t('message.advanced_audit.archival.database_hot') }}</h5>
                      <span class="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full font-bold">{{ extendedData.data.main_table?.total_logs || 0 }}</span>
                   </div>
                   <div class="p-5">
                      <div class="grid grid-cols-3 gap-2 text-center mb-6">
                         <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                            <div class="text-xs text-slate-500 mb-1">{{ $t('message.advanced_audit.archival.days_30') }}</div>
                            <div class="font-bold text-slate-800 dark:text-slate-200">{{ extendedData.data.main_table?.logs_30d || 0 }}</div>
                         </div>
                         <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                            <div class="text-xs text-slate-500 mb-1">{{ $t('message.advanced_audit.archival.days_90') }}</div>
                            <div class="font-bold text-slate-800 dark:text-slate-200">{{ extendedData.data.main_table?.logs_90d || 0 }}</div>
                         </div>
                         <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                            <div class="text-xs text-slate-500 mb-1">{{ $t('message.advanced_audit.archival.year_1') }}</div>
                            <div class="font-bold text-slate-800 dark:text-slate-200">{{ extendedData.data.main_table?.logs_1y || 0 }}</div>
                         </div>
                      </div>
                      <div class="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                         <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div class="flex items-center justify-center w-5 h-5 rounded-full border border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-500 group-[.is-active]:bg-indigo-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10"><i class="bi bi-clock text-[10px]"></i></div>
                            <div class="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                               <div class="text-[10px] text-slate-400 uppercase">{{ $t('message.advanced_audit.archival.oldest_log') }}</div>
                               <div class="text-xs font-mono text-slate-700 dark:text-slate-300">{{ extendedData.data.main_table?.oldest_log || 'N/A' }}</div>
                            </div>
                         </div>
                         <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div class="flex items-center justify-center w-5 h-5 rounded-full border border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-500 group-[.is-active]:bg-emerald-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10"><i class="bi bi-clock-history text-[10px]"></i></div>
                            <div class="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                               <div class="text-[10px] text-slate-400 uppercase">{{ $t('message.advanced_audit.archival.newest_log') }}</div>
                               <div class="text-xs font-mono text-slate-700 dark:text-slate-300">{{ extendedData.data.main_table?.newest_log ? extendedData.data.main_table.newest_log.replace('T', ' ').substring(0,19) : 'N/A' }}</div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <!-- Cold Storage (Archive) -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                   <div class="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <h5 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><i class="bi bi-usb-drive"></i>{{ $t('message.advanced_audit.archival.offline_archive_cold') }}</h5>
                      <span class="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-bold">{{ extendedData.data.archive_table?.archived_logs || 0 }}</span>
                   </div>
                   <div class="p-5 flex-1 flex flex-col justify-center">
                      <div class="grid grid-cols-2 gap-4">
                         <div class="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                            <div class="text-xs text-slate-500 mb-1"><i class="bi bi-calendar-event"></i>{{ $t('message.advanced_audit.archival.first_archival') }}</div>
                            <div class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ extendedData.data.archive_table?.first_archival || 'None' }}</div>
                         </div>
                         <div class="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                            <div class="text-xs text-slate-500 mb-1"><i class="bi bi-calendar-check"></i>{{ $t('message.advanced_audit.archival.last_archival') }}</div>
                            <div class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ extendedData.data.archive_table?.last_archival || 'None' }}</div>
                         </div>
                         <div class="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                            <div class="text-xs text-slate-500 mb-1"><i class="bi bi-skip-backward"></i>{{ $t('message.advanced_audit.archival.oldest_record') }}</div>
                            <div class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ extendedData.data.archive_table?.oldest_archived || 'N/A' }}</div>
                         </div>
                         <div class="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                            <div class="text-xs text-slate-500 mb-1"><i class="bi bi-skip-forward"></i>{{ $t('message.advanced_audit.archival.newest_record') }}</div>
                            <div class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ extendedData.data.archive_table?.newest_archived || 'N/A' }}</div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <!-- Policies Configuration Overview -->
             <div v-if="extendedData.data.retention_policies" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div class="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                   <h5 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><i class="bi bi-shield-lock"></i>{{ $t('message.advanced_audit.archival.operational_retention_policies') }}</h5>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                   <div v-for="(days, category) in extendedData.data.retention_policies" :key="category" class="p-4 text-center">
                     <div class="text-xs text-slate-500 uppercase mb-2 font-semibold capitalize">{{ category.replace(/_/g, ' ') }}</div>
                     <span class="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold px-3 py-1 rounded-lg text-sm">{{ days }} days</span>
                   </div>
                </div>
             </div>

             <!-- Recommendations -->
             <div v-if="extendedData.data.recommendations?.length" class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-4 rounded-xl">
               <h5 class="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2"><i class="bi bi-lightbulb-fill"></i>{{ $t('message.advanced_audit.archival.system_recommendations') }}</h5>
               <ul class="list-disc pl-5 text-sm text-amber-700 dark:text-amber-500 space-y-1">
                 <li v-for="(rec, idx) in extendedData.data.recommendations" :key="idx">{{ rec }}</li>
               </ul>
             </div>
             <div v-else class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 italic bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
               <i class="bi bi-check-circle-fill text-emerald-500"></i>{{ $t('message.advanced_audit.archival.optimal_storage_desc') }}</div>
          </div>
          

          <!-- View: Retention Policies -->
          <div v-else-if="extendedData.context === 'Retention Policies (Simulation)' && extendedData.data" class="space-y-6">
             <div class="flex items-center gap-3 mb-4">
                <div class="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                   <i class="bi bi-calendar2-range text-xl"></i>
                </div>
                <div>
                   <h4 class="font-bold text-slate-800 dark:text-slate-200">{{ $t('message.advanced_audit.archival.retention_details') }}</h4>
                   <p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('message.advanced_audit.archival.verifying_policies') }}</p>
                </div>
                <div class="ml-auto flex items-center">
                   <span v-if="extendedData.data.dry_run" class="px-3 py-1 bg-amber-100/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-200/50 dark:border-amber-500/20 flex items-center gap-1.5"><i class="bi bi-shield-check"></i>{{ $t('message.advanced_audit.archival.simulation') }}</span>
                   <span v-else class="px-3 py-1 bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200/50 dark:border-emerald-500/20 flex items-center gap-1.5"><i class="bi bi-shield-check"></i>{{ $t('message.advanced_audit.archival.active_badge') }}</span>
                </div>
             </div>

             <!-- Policy Cards -->
             <div v-if="extendedData.data.policy" class="grid grid-cols-1 md:grid-cols-2 gap-4">
               
               <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors">
                  <div class="flex justify-between items-start mb-3">
                     <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
                        <i class="bi bi-journal-text"></i>
                     </div>
                     <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md uppercase tracking-wider">{{ $t('message.advanced_audit.archival.audit_logs') }}</span>
                  </div>
                  <h5 class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">{{ $t('message.advanced_audit.archival.retention_duration') }}</h5>
                  <div class="flex items-baseline gap-2">
                     <span class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ extendedData.data.policy.audit_log_retention_days || 0 }}</span>
                     <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ $t('message.advanced_audit.archival.days_text') }}</span>
                  </div>
                  <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                     <i class="bi bi-info-circle text-blue-500"></i>{{ $t('message.advanced_audit.archival.hard_deletion_desc') }}</div>
               </div>

               <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors">
                  <div class="flex justify-between items-start mb-3">
                     <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                        <i class="bi bi-person-lines-fill"></i>
                     </div>
                     <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md uppercase tracking-wider">{{ $t('message.advanced_audit.archival.user_data') }}</span>
                  </div>
                  <h5 class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">{{ $t('message.advanced_audit.archival.retention_duration') }}</h5>
                  <div class="flex items-baseline gap-2">
                     <span class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ extendedData.data.policy.user_data_retention_days || 0 }}</span>
                     <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ $t('message.advanced_audit.archival.days_text') }}</span>
                  </div>
                  <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                     <i class="bi bi-info-circle text-emerald-500"></i>{{ $t('message.advanced_audit.archival.anonymization_desc') }}</div>
               </div>

             </div>

             <!-- Info message for Check complete -->
             <div class="mt-2 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 p-3 rounded-lg flex items-center gap-3">
                <i class="bi bi-check-circle-fill text-emerald-500"></i>
                <div class="flex-1">
                   <p class="text-sm text-slate-700 dark:text-slate-300">Retention action '{{ extendedData.data.action }}' completed successfully.</p>
                </div>
             </div>
          </div>
          
          <!-- View: Default Raw Fallback -->
          <div v-else>
            <pre class="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-400 overflow-x-auto max-h-60">{{ JSON.stringify(extendedData, null, 2) }}</pre>
          </div>
        </div>
      </div>
    
    <!-- Modals -->
    <ModalWindow
      :show="showRunModal"
      title="Run Archival Process"
      icon="bi bi-lightning-charge-fill"
      @close="showRunModal = false"
    >
      <div class="space-y-4 pt-4">
        <p class="text-sm text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.archival.run_archival_desc') }}</p>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.advanced_audit.archival.batch_size') }}</label>
          <input 
            type="number" 
            min="100"
            v-model.number="runForm.batchSize" 
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white sm:text-sm"
            placeholder="1000"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.advanced_audit.archival.category_filter') }}</label>
          <select 
            v-model="runForm.categoryFilter"
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white sm:text-sm"
          >
            <option value="">{{ $t('message.advanced_audit.archival.all_categories') }}</option>
            <option value="authentication">{{ $t('message.advanced_audit.archival.cat_auth') }}</option>
            <option value="admin_operations">{{ $t('message.advanced_audit.archival.cat_admin') }}</option>
            <option value="security_events">{{ $t('message.advanced_audit.archival.cat_security') }}</option>
            <option value="general">{{ $t('message.advanced_audit.archival.cat_general') }}</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="runDryRun"
            v-model="runForm.dryRun" 
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          >
          <label for="runDryRun" class="text-sm font-medium text-slate-700 dark:text-slate-300">
            {{ $t('message.advanced_audit.archival.dry_run') }}
          </label>
        </div>
        
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="runForceArchival"
            v-model="runForm.forceArchival" 
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          >
          <label for="runForceArchival" class="text-sm font-medium text-slate-700 dark:text-slate-300">
            {{ $t('message.advanced_audit.archival.force_archival') }}
          </label>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showRunModal = false"
            class="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg font-medium transition-colors"
          >{{ $t('message.advanced_audit.archival.cancel_btn') }}</button>
          <button
            @click="executeRunArchival"
            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >{{ $t('message.advanced_audit.archival.execute_btn') }}</button>
        </div>
      </div>
    </ModalWindow>

    <ModalWindow
      :show="showRestoreModal"
      title="Restore Archive"
      icon="bi bi-arrow-counterclockwise"
      @close="showRestoreModal = false"
    >
      <div class="space-y-4 pt-4">
        <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">{{ $t('message.advanced_audit.archival.restore_archive_desc') }}</p>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.advanced_audit.archival.start_date') }}</label>
            <input 
              type="date" 
              v-model="restoreForm.startDate" 
              class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white sm:text-sm"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.advanced_audit.archival.end_date') }}</label>
            <input 
              type="date" 
              v-model="restoreForm.endDate" 
              class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white sm:text-sm"
            >
          </div>
        </div>

        <div class="flex items-center gap-2 mt-4">
          <input 
            type="checkbox" 
            id="restoreDryRun"
            v-model="restoreForm.dryRun" 
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          >
          <label for="restoreDryRun" class="text-sm font-medium text-slate-700 dark:text-slate-300">
            {{ $t('message.advanced_audit.archival.dry_run') }}
          </label>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showRestoreModal = false"
            class="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg font-medium transition-colors"
          >{{ $t('message.advanced_audit.archival.cancel_btn') }}</button>
          <button
            @click="executeRestoreProcess"
            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >{{ $t('message.advanced_audit.archival.restore_btn') }}</button>
        </div>
      </div>
    </ModalWindow>

    <ModalWindow
      :show="showSetPolicyModal"
      title="Configure Retention Policy"
      icon="bi bi-gear"
      @close="showSetPolicyModal = false"
    >
      <div class="space-y-4 pt-4">
        <p class="text-sm text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.archival.set_retention_desc') }}</p>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.advanced_audit.archival.audit_retention_days') }}</label>
          <input 
            type="number" 
            v-model="policyForm.audit_log_retention_days" 
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white sm:text-sm"
            placeholder="90"
            min="1"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.advanced_audit.archival.user_retention_days') }}</label>
          <input 
            type="number" 
            v-model="policyForm.user_data_retention_days" 
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white sm:text-sm"
            placeholder="90"
            min="1"
          >
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showSetPolicyModal = false"
            class="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg font-medium transition-colors"
          >{{ $t('message.advanced_audit.archival.cancel_btn') }}</button>
          <button
            @click="executeSetPolicy"
            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >{{ $t('message.advanced_audit.archival.save_policy_btn') }}</button>
        </div>
      </div>
    </ModalWindow>

    <ModalWindow
      :show="showSetPolicyModal"
      title="Configure Retention Policy"
      icon="bi bi-gear"
      @close="showSetPolicyModal = false"
    >
      <div class="space-y-4 pt-4">
        <p class="text-sm text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.archival.set_retention_desc') }}</p>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.advanced_audit.archival.audit_retention_days') }}</label>
          <input 
            type="number" 
            v-model="policyForm.audit_log_retention_days" 
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white sm:text-sm"
            placeholder="90"
            min="1"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.advanced_audit.archival.user_retention_days') }}</label>
          <input 
            type="number" 
            v-model="policyForm.user_data_retention_days" 
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white sm:text-sm"
            placeholder="90"
            min="1"
          >
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showSetPolicyModal = false"
            class="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg font-medium transition-colors"
          >{{ $t('message.advanced_audit.archival.cancel_btn') }}</button>
          <button
            @click="executeSetPolicy"
            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >{{ $t('message.advanced_audit.archival.save_policy_btn') }}</button>
        </div>
      </div>
    </ModalWindow>
  </div>
</template>

<script>
import { ref } from 'vue';
import ModalWindow from './ModalWindow.vue';
import { useAdvancedAuditStore } from '/assets/js/stores/advancedAuditStore.js';

export default {
  name: 'AdvancedAuditArchivalTab',
  components: {
    ModalWindow
  },
  props: {
    data: {
      type: Object,
      default: null
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['refresh', 'run-archival', 'restore-archive', 'set-policy'],
  setup(props, { emit }) {
    const store = useAdvancedAuditStore();
    const isExtrasLoading = ref(false);
    const extendedData = ref(null);
    
    const showSetPolicyModal = ref(false);
    const policyForm = ref({
      audit_log_retention_days: 90,
      user_data_retention_days: 90
    });
    
    const showRunModal = ref(false);
    const runForm = ref({
      batchSize: 1000,
      dryRun: true,
      categoryFilter: '',
      forceArchival: false
    });
    
    const showRestoreModal = ref(false);
    // Provide a default date
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const defaultStart = d.toISOString().split('T')[0];
    const defaultEnd = new Date().toISOString().split('T')[0];
    
    const restoreForm = ref({
      startDate: defaultStart,
      endDate: defaultEnd,
      action: 'restore',
      dryRun: true
    });

    const loadArchivePolicies = async () => {
      isExtrasLoading.value = true;
      try {
        const res = await store.getArchive(true);
        extendedData.value = { context: 'Review Storage Details', data: res };
      } catch (err) {
        extendedData.value = { error: err.message };
      } finally {
        isExtrasLoading.value = false;
      }
    };

    const manageRetention = async () => {
      isExtrasLoading.value = true;
      try {
        const res = await store.manageRetention({ action: 'get_policy', dryRun: true }, true);
        extendedData.value = { context: 'Retention Policies (Simulation)', data: res };
      } catch (err) {
        extendedData.value = { error: err.message };
      } finally {
        isExtrasLoading.value = false;
      }
    };
    
    const executeRunArchival = () => {
      showRunModal.value = false;
      emit('run-archival', { ...runForm.value });
    };
    
    const openSetPolicyModal = () => {
      // Initialize with backend data if available
      if (extendedData.value?.context === 'Retention Policies (Simulation)' && extendedData.value?.data?.policy) {
        policyForm.value.audit_log_retention_days = extendedData.value.data.policy.audit_log_retention_days || 90;
        policyForm.value.user_data_retention_days = extendedData.value.data.policy.user_data_retention_days || 90;
      }
      showSetPolicyModal.value = true;
    };

    const executeSetPolicy = () => {
      showSetPolicyModal.value = false;
      emit('set-policy', {
        audit_log_retention_days: Number(policyForm.value.audit_log_retention_days),
        user_data_retention_days: Number(policyForm.value.user_data_retention_days)
      });
    };

    const executeRestoreProcess = () => {
      showRestoreModal.value = false;
      emit('restore-archive', { ...restoreForm.value });
    };

    return {
      isExtrasLoading,
      extendedData,
      loadArchivePolicies,
      manageRetention,
      showRunModal,
      runForm,
      showRestoreModal,
      restoreForm,
      executeRunArchival,
      executeRestoreProcess,
      showSetPolicyModal,
      policyForm,
      openSetPolicyModal,
      executeSetPolicy
    };
  }
}
</script>
