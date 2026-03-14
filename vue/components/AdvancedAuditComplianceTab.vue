<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
      <div class="flex items-center gap-3 flex-1">
        <i class="bi bi-shield-check text-indigo-500 dark:text-indigo-400 text-2xl"></i>
        <div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ $t('message.advanced_audit.compliance.compliance_reports_title') }}</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm">{{ $t('message.advanced_audit.compliance.compliance_reports_desc') }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
    <button @click="$emit('refresh')" :disabled="isLoading || isExtrasLoading" class="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium transition-all disabled:opacity-50">
          <i class="bi bi-arrow-clockwise" :class="{'animate-spin': isLoading}"></i> <span class="hidden sm:inline">{{ $t('message.advanced_audit.common.reload') }}</span>
        </button>
        <button @click="$emit('request-pdf')" :disabled="isLoading" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-none inline-flex items-center gap-2 disabled:opacity-50">
          <i class="bi bi-file-earmark-pdf"></i>{{ $t('message.advanced_audit.compliance.request_full_pdf') }}</button>
      </div>
    </div>
    
    <!-- Top Level Skeleton (Initial load) -->
    <div v-show="isLoading && !data" class="animate-pulse space-y-4 mt-6 transition-all">
      <div class="h-20 bg-slate-200 dark:bg-slate-700/50 rounded-2xl w-full"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="h-64 bg-slate-200 dark:bg-slate-700/50 rounded-2xl"></div>
        <div class="h-64 bg-slate-200 dark:bg-slate-700/50 rounded-2xl"></div>
      </div>
    </div>
    
    <!-- Top Level Skeleton (Reloading) -->
    <div v-show="isLoading && data" class="animate-pulse space-y-4 mt-6">
      <div class="h-20 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full border border-slate-200/50 dark:border-slate-700/50"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="h-64 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"></div>
        <div class="h-64 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"></div>
      </div>
    </div>
    
    <!-- Main Compliance Top Data -->
    <div v-if="data" v-show="!isLoading" class="mt-8 space-y-6">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
         <div class="flex-1">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{{ $t('message.advanced_audit.compliance.current_report_status') }}</span>
            <div class="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                 <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> {{ data.report_period ? data.report_period.toUpperCase() + ' AUDIT' : 'GENERAL' }} (Auto-Evaluated)
            </div>
            <div class="text-sm text-slate-500 mt-1">Generated: {{ new Date(data.generated_at).toLocaleString() }}</div>
         </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
<!-- Data Retention Metrics -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
             <h3 class="text-slate-800 dark:text-slate-200 font-bold mb-4 flex items-center gap-2"><i class="bi bi-bar-chart text-indigo-500"></i>{{ $t('message.advanced_audit.compliance.audit_scope_metrics') }}</h3>
             <ul class="space-y-3">
                <li class="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-slate-800">
                  <span class="text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.compliance.total_logged') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ data.compliance_summary?.data_retention?.total_logs }}</span>
                </li>
                <li class="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-slate-800">
                  <span class="text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.compliance.retained_90d') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ data.compliance_summary?.data_retention?.logs_90d }}</span>
                </li>
                <li class="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-slate-800">
                  <span class="text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.compliance.logs_retained_1y') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ data.compliance_summary?.data_retention?.logs_1y }}</span>
                </li>
                <li class="flex flex-col text-sm py-2 pt-3 gap-1">
                  <span class="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{{ $t('message.advanced_audit.compliance.retention_spread') }}</span>
                  <span class="font-mono text-[10px] sm:text-xs text-slate-500 overflow-x-auto whitespace-nowrap bg-slate-50 dark:bg-slate-950 p-2 rounded">{{ data.compliance_summary?.data_retention?.oldest_log ? new Date(data.compliance_summary.data_retention.oldest_log).toLocaleDateString() : 'N/A' }} <i class="bi bi-arrow-right mx-1"></i> {{ data.compliance_summary?.data_retention?.newest_log ? new Date(data.compliance_summary.data_retention.newest_log).toLocaleDateString() : 'N/A' }}</span>
              </li>
           </ul>
        </div>
        
        <!-- Compliance Status -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
           <h3 class="text-slate-800 dark:text-slate-200 font-bold mb-4 flex items-center gap-2"><i class="bi bi-check2-circle text-emerald-500"></i>{{ $t('message.advanced_audit.compliance.integrity_validations') }}</h3>
           <ul class="space-y-4">
              <li v-for="(val, key) in data.compliance_status" :key="key" class="flex flex-col gap-1">
                 <div class="flex justify-between items-center text-sm">
                   <span class="text-slate-700 dark:text-slate-300 font-medium capitalize">{{ key.replace(/_/g, ' ') }}</span>
                   <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold"
                         :class="val === 'compliant' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'">
                     <i class="bi" :class="val === 'compliant' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'"></i> {{ val }}
                   </span>
                 </div>
                 <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-1000" :class="val === 'compliant' ? 'bg-emerald-500 w-full' : 'bg-rose-500 w-1/3'"></div>
                 </div>
              </li>
           </ul>
        </div>
      </div>
      
      <!-- Supplementary Report Metrics -->
      <div v-if="data.compliance_summary?.administrative_actions?.length || data.compliance_summary?.access_patterns?.length" class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <!-- Access Patterns -->
        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
           <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><i class="bi bi-people"></i>{{ $t('message.advanced_audit.compliance.access_patterns') }}</h4>
           <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
              <div v-for="(act, idx) in data.compliance_summary.access_patterns" :key="idx" class="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5 rounded-lg">
                 <div>
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mr-2">{{ act.actor_role }}</span>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ act.action }}</span>
                 </div>
                 <div class="text-right">
                    <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400">{{ act.frequency }} attempts</div>
                    <div class="text-[10px] text-slate-500">{{ act.unique_users }} user(s)</div>
                 </div>
              </div>
           </div>
        </div>
        <!-- Admin Actions -->
        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
           <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><i class="bi bi-person-badge"></i>{{ $t('message.advanced_audit.compliance.administrative_events') }}</h4>
           <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
              <div v-for="(act, idx) in data.compliance_summary.administrative_actions" :key="idx" class="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5 rounded-lg">
                 <div>
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 mr-2">{{ act.target_type }}</span>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ act.action }}</span>
                 </div>
                 <div class="text-right">
                    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">{{ act.action_count }} actions</div>
                    <div class="text-[10px] text-slate-500">{{ new Date(act.last_action).toLocaleDateString() }}</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Advanced Compliance Management Section (Independent Loading) -->
    <div v-show="data" class="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ $t('message.advanced_audit.compliance.configurations') }}</h3>
          <div class="flex gap-2">
            <button @click="loadMgmtData" :disabled="isExtrasLoading" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              <i class="bi" :class="isExtrasLoading ? 'bi-arrow-repeat animate-spin' : 'bi-gear'"></i>{{ $t('message.advanced_audit.compliance.inspect_policy') }}</button>
            <button @click="runMgmtAction" :disabled="isExtrasLoading" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              <i class="bi" :class="isExtrasLoading ? 'bi-arrow-repeat animate-spin' : 'bi-play-fill'"></i>{{ $t('message.advanced_audit.compliance.enforce_policy') }}</button>
          </div>
        </div>

        <!-- First Load Skeleton -->
        <div v-show="isExtrasLoading && !mgmtData" class="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse"></div>
        <!-- Reload Skeleton -->
        <div v-show="isExtrasLoading && mgmtData" class="h-40 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse border border-slate-200/50 dark:border-slate-700/50 mb-4"></div>
        
        <div v-if="mgmtData && !mgmtData.error" v-show="!isExtrasLoading" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 transition-all">
          
          <!-- Inspect Policy View -->
          <div v-if="mgmtViewMode === 'inspect'">
            <h4 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
              <i class="bi bi-gear-fill text-slate-500"></i>{{ $t('message.advanced_audit.compliance.active_policy_configurations') }}</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div>
                  <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{{ $t('message.advanced_audit.compliance.data_retention_rules') }}</h5>
                  <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                       <span class="text-sm text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.compliance.total_audited_events') }}</span>
                       <span class="font-black text-slate-800 dark:text-slate-200">{{ mgmtData.audit_trail_metrics?.total_events }}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                       <span class="text-sm text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.compliance.tracked_user_accounts') }}</span>
                       <span class="font-black text-slate-800 dark:text-slate-200">{{ mgmtData.audit_trail_metrics?.unique_users }}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                       <span class="text-sm text-slate-600 dark:text-slate-400">{{ $t('message.advanced_audit.compliance.tracked_action_types') }}</span>
                       <span class="font-black text-slate-800 dark:text-slate-200">{{ mgmtData.audit_trail_metrics?.unique_actions }}</span>
                    </div>
                  </div>
               </div>
               
               <div>
                  <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{{ $t('message.advanced_audit.compliance.integrity_checks') }}</h5>
                  <div class="space-y-3">
                     <div v-for="(status, key) in mgmtData.compliance_status" :key="key" class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                       <span class="text-sm text-slate-600 dark:text-slate-400 capitalize">{{ key.replace(/_/g, ' ') }}</span>
                       <span class="px-2 py-1 text-[10px] font-bold uppercase rounded-md flex items-center gap-1" :class="status === 'compliant' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'">
                          <i class="bi" :class="status === 'compliant' ? 'bi-lock-fill' : 'bi-unlock-fill'"></i> {{ status }}
                       </span>
                     </div>
                  </div>
               </div>
            </div>
            <div class="mt-6 text-xs text-slate-400 text-right font-mono">Policy fetched at {{ new Date(mgmtData.generated_at).toLocaleString() }}</div>
          </div>
          
          <!-- Enforce Policy View -->
          <div v-else-if="mgmtViewMode === 'enforce'">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <i class="bi bi-shield-lock-fill text-indigo-500"></i>{{ $t('message.advanced_audit.compliance.policy_enforcement_results') }}</h4>
              <div class="flex gap-4">
                 <div class="text-center">
                    <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{{ $t('message.advanced_audit.compliance.analyzed_events') }}</div>
                    <div class="text-lg font-black text-indigo-600 dark:text-indigo-400">{{ mgmtData.summary?.total_events }}</div>
                 </div>
                 <div class="text-center">
                    <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{{ $t('message.advanced_audit.compliance.flagged_rules') }}</div>
                    <div class="text-lg font-black text-rose-600 dark:text-rose-400">{{ mgmtData.summary?.total_actions }}</div>
                 </div>
              </div>
            </div>
            
            <div class="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-xl max-h-80 overflow-y-auto">
               <table class="w-full text-left border-collapse m-0">
                 <thead class="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-10">
                    <tr class="text-slate-500 text-[10px] uppercase tracking-wider">
                       <th class="p-3 font-bold border-b border-slate-200 dark:border-slate-700">{{ $t('message.advanced_audit.compliance.target_action') }}</th>
                       <th class="p-3 font-bold border-b border-slate-200 dark:border-slate-700">{{ $t('message.advanced_audit.compliance.event_count') }}</th>
                       <th class="p-3 font-bold border-b border-slate-200 dark:border-slate-700">{{ $t('message.advanced_audit.compliance.unique_actors') }}</th>
                       <th class="p-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">{{ $t('message.advanced_audit.compliance.timeframe_span') }}</th>
                    </tr>
                 </thead>
                 <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                    <tr v-for="(item, idx) in mgmtData.data" :key="idx" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                       <td class="p-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">{{ item.action }}</span>
                       </td>
                       <td class="p-3 text-sm font-semibold text-rose-600 dark:text-rose-400">{{ item.event_count }}</td>
                       <td class="p-3 text-sm text-slate-600 dark:text-slate-400"><i class="bi bi-person text-slate-400 mr-1"></i> {{ item.unique_users }}</td>
                       <td class="p-3 text-right">
                          <div class="text-[10px] text-slate-500 font-mono">{{ new Date(item.first_occurrence).toLocaleDateString() }} - {{ new Date(item.last_occurrence).toLocaleDateString() }}</div>
                       </td>
                    </tr>
                 </tbody>
               </table>
            </div>
            <div class="mt-4 text-[10px] text-slate-400 text-right">Generated: {{ new Date(mgmtData.generated_at).toLocaleString() }} ({{ mgmtData.report_type }})</div>
          </div>
        </div>

        <!-- Error State -->
          <div v-else-if="mgmtData?.error" v-show="!isExtrasLoading" class="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50 flex items-center gap-3">
           <i class="bi bi-exclamation-triangle-fill text-rose-500"></i>
           <div class="text-sm font-medium text-rose-700 dark:text-rose-400">Failed to process: {{ mgmtData.error }}</div>
        </div>
      </div>
      
    </div>
</template>

<script>
import { ref } from 'vue';
import { useAdvancedAuditStore } from '/assets/js/stores/advancedAuditStore.js';

export default {
  name: 'AdvancedAuditComplianceTab',
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
  emits: ['refresh', 'request-pdf'],
  setup(props, { emit }) {
    const store = useAdvancedAuditStore();
    const isExtrasLoading = ref(false);
    const mgmtData = ref(null);
    const mgmtViewMode = ref(null);

    const loadMgmtData = async () => {
      isExtrasLoading.value = true;
      mgmtViewMode.value = 'inspect';
      try {
        const res = await store.fetchComplianceManagement(true);
        mgmtData.value = res;
      } catch (err) {
        mgmtData.value = { error: err.message };
      } finally {
        isExtrasLoading.value = false;
      }
    };

    const runMgmtAction = async () => {
      isExtrasLoading.value = true;
      mgmtViewMode.value = 'enforce';
      try {
        const res = await store.manageCompliance({ action: 'evaluate', framework: 'soc2' }, true);
        mgmtData.value = res;
      } catch (err) {
        mgmtData.value = { error: err.message };
      } finally {
        isExtrasLoading.value = false;
      }
    };

    return {
      isExtrasLoading,
      mgmtData,
      mgmtViewMode,
      loadMgmtData,
      runMgmtAction
    };
  }
}
</script>
