<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 mb-6">
      <i class="bi bi-graph-up text-indigo-500 dark:text-indigo-400 text-2xl"></i>
      <div class="flex-1">
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ $t('message.advanced_audit.analytics.title') }}</h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm">{{ $t('message.advanced_audit.analytics.subtitle') }}</p>
        <div v-if="data?.overview" class="text-xs text-slate-400 mt-1">{{ $t('message.advanced_audit.common.generated_at') }} {{ new Date(data.overview.generated_at).toLocaleString() }} - Timeframe: {{ data.overview.timeframe }}</div>
      </div>
      <button @click="$emit('refresh')" :disabled="isLoading || isExtrasLoading" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium transition-all disabled:opacity-50">
        <i class="bi bi-arrow-clockwise" :class="{'animate-spin': isLoading}"></i> <span class="hidden sm:inline">{{ $t('message.advanced_audit.common.reload') }}</span>
      </button>
    </div>
    
    <!-- Top Level Dashboard Skeleton (Only shows on main load) -->
    <div v-show="isLoading && !data" class="animate-pulse flex space-x-4 transition-all">
       <div class="flex-1 space-y-6 py-1">
         <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="h-32 bg-slate-200 dark:bg-slate-700/50 rounded-2xl"></div>
            <div class="h-32 bg-slate-200 dark:bg-slate-700/50 rounded-2xl"></div>
            <div class="h-32 bg-slate-200 dark:bg-slate-700/50 rounded-2xl"></div>
         </div>
         <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="h-64 bg-slate-200 dark:bg-slate-700/50 rounded-2xl"></div>
            <div class="h-64 bg-slate-200 dark:bg-slate-700/50 rounded-2xl"></div>
         </div>
       </div>
    </div>
    
    <!-- Top Area Skeleton (Shows during reload when data already exists) -->
    <div v-show="isLoading && data" class="animate-pulse flex flex-col space-y-6">
       <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
         <div class="h-32 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"></div>
         <div class="h-32 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"></div>
         <div class="h-32 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"></div>
       </div>
       <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div class="h-64 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"></div>
         <div class="h-64 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"></div>
       </div>
    </div>
    
    <!-- Main Dashboard Top Cards -->
    <div v-if="data" v-show="!isLoading">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div class="bg-indigo-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
          <h3 class="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{{ $t('message.advanced_audit.analytics.total_records') }}</h3>
          <div class="text-4xl font-black text-slate-800 dark:text-white">{{ data.performance?.database_size?.total_records || 0 }}</div>
          <div class="text-xs text-slate-500 mt-2">{{ $t('message.advanced_audit.common.oldest') }} {{ data.performance?.database_size?.oldest_record ? new Date(data.performance.database_size.oldest_record).toLocaleDateString() : 'N/A' }}</div>
        </div>
        <div class="bg-rose-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
          <h3 class="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{{ $t('message.advanced_audit.analytics.action_types') }}</h3>
          <div class="text-4xl font-black text-rose-600 dark:text-rose-400">{{ data.performance?.action_frequency?.length || 0 }}</div>
          <div class="text-xs text-slate-500 mt-2">{{ $t('message.advanced_audit.analytics.action_types_desc') }}</div>
        </div>
        <div class="bg-emerald-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
          <h3 class="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{{ $t('message.advanced_audit.analytics.avg_payload') }}</h3>
          <div class="text-4xl font-black text-emerald-600 dark:text-emerald-400">{{ Math.round(data.performance?.database_size?.avg_details_size || 0) }}<span class="text-lg">B</span></div>
          <div class="text-xs text-slate-500 mt-2">{{ $t('message.advanced_audit.analytics.per_entry') }}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <!-- Volume over time -->
        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col p-6">
           <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">{{ $t('message.advanced_audit.analytics.volume_over_time') }}</h3>
           <div class="flex items-end gap-2 h-48 mt-auto" v-if="data.performance?.volume_analysis?.length">
              <div v-for="item in data.performance.volume_analysis" :key="item.date + item.hour" 
                   class="relative group flex-1 bg-indigo-200 dark:bg-indigo-900/50 rounded-t-sm hover:bg-indigo-400 transition-colors" 
                   :style="{ height: `${Math.max((item.log_count / Math.max(...data.performance.volume_analysis.map(x=>x.log_count))) * 100, 5)}%` }">
                <div class="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 transition-opacity pointer-events-none">
                   {{ item.date }} {{ item.hour }}:00<br/>{{ item.log_count }} events
                </div>
              </div>
           </div>
           <div class="flex justify-between items-center mt-2 border-t border-slate-200 dark:border-slate-700 pt-2 text-xs text-slate-500 font-medium" v-if="data.performance?.volume_analysis?.length">
              <span>{{ data.performance.volume_analysis[0].date }}</span>
              <span>{{ data.performance.volume_analysis[data.performance.volume_analysis.length - 1].date }}</span>
           </div>
           <div v-else class="h-48 flex items-center justify-center text-slate-400">{{ $t('message.advanced_audit.analytics.no_volume_data') }}</div>
        </div>
        
        <!-- Behavior Actions by Role -->
        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col p-6">
           <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">{{ $t('message.advanced_audit.analytics.actions_by_role') }}</h3>
           <div class="overflow-y-auto max-h-56 pr-2 space-y-3" v-if="data.behavior?.actions_by_role?.length">
              <div v-for="(item, i) in data.behavior.actions_by_role" :key="i" class="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                 <div class="flex flex-col">
                   <span class="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                     <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{{ item.actor_role }}</span>
                     {{ item.action }}
                   </span>
                 </div>
                 <div class="text-right">
                   <div class="font-black text-indigo-600 dark:text-indigo-400">{{ item.count }} <span class="text-xs font-normal text-slate-500">{{ $t('message.advanced_audit.analytics.hits') }}</span></div>
                   <div class="text-xs text-slate-500">{{ item.unique_users }} unique user(s)</div>
                 </div>
              </div>
           </div>
           <div v-else class="h-48 flex items-center justify-center text-slate-400">{{ $t('message.advanced_audit.analytics.no_behavior_data') }}</div>
        </div>
      </div>
      
    </div>
    <!-- Extended Endpoints Section (Outside the main v-if data block so its reload is independent) -->
    <div v-if="data" class="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ $t('message.advanced_audit.analytics.extended_metrics') }}</h3>
          <button @click="loadExtendedMetrics" :disabled="isExtrasLoading" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
            <i class="bi" :class="isExtrasLoading ? 'bi-arrow-repeat animate-spin' : 'bi-hdd-network'"></i>{{ $t('message.advanced_audit.analytics.load_more') }}</button>
        </div>
        
        <div v-if="isExtrasLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Loading Security Details -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm animate-pulse">
            <div class="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
              <div class="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
              <div class="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
            </div>
            <div class="flex gap-4 mb-4">
              <div class="flex-1 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
              <div class="flex-1 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
            </div>
            <div class="space-y-2 mt-4">
              <div class="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3"></div>
              <div class="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
              <div class="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
            </div>
          </div>
          
          <!-- Loading Middleware Stats -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm animate-pulse">
            <div class="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
            <div class="flex gap-2 mb-6">
              <div class="h-6 w-24 bg-slate-100 dark:bg-slate-800/50 rounded-full"></div>
              <div class="h-6 w-28 bg-slate-100 dark:bg-slate-800/50 rounded-full"></div>
              <div class="h-6 w-32 bg-slate-100 dark:bg-slate-800/50 rounded-full"></div>
            </div>
            <div class="mt-6">
              <div class="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3"></div>
              <div class="flex gap-2">
                <div class="h-6 w-16 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
                <div class="h-6 w-20 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
                <div class="h-6 w-24 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
              </div>
            </div>
            <div class="mt-8">
              <div class="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3"></div>
              <div class="flex gap-2">
                <div class="h-6 w-20 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
                <div class="h-6 w-16 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
                <div class="h-6 w-24 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="isExtendedDataReady" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Security Details -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <h4 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <i class="bi bi-shield-lock text-rose-500"></i>{{ $t('message.advanced_audit.analytics.security_details') }}</h4>
            
            <div v-if="detailedSecurity?.error" class="text-rose-500 text-sm p-3 bg-rose-50 rounded-lg">
              Failed to load: {{ detailedSecurity.error }}
            </div>
            <div v-else class="space-y-6">
              <!-- Risk Indicators -->
              <div v-if="detailedSecurity?.risk_indicators" class="grid grid-cols-3 gap-3">
                <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                  <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{{ $t('message.advanced_audit.analytics.risk_score') }}</div>
                  <div class="text-2xl font-black" :class="detailedSecurity.risk_indicators.risk_score > 50 ? 'text-rose-500' : 'text-emerald-500'">{{ detailedSecurity.risk_indicators.risk_score }}</div>
                </div>
                <div class="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-800/30 flex flex-col items-center justify-center text-center">
                  <div class="text-[10px] font-bold text-amber-600/70 dark:text-amber-500/70 uppercase tracking-widest mb-1">{{ $t('message.advanced_audit.analytics.high_risk_ips') }}</div>
                  <div class="text-2xl font-black text-amber-600 dark:text-amber-400">{{ detailedSecurity.risk_indicators.high_risk_ips }}</div>
                </div>
                <div class="bg-rose-50/50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-800/30 flex flex-col items-center justify-center text-center">
                  <div class="text-[10px] font-bold text-rose-600/70 dark:text-rose-500/70 uppercase tracking-widest mb-1">{{ $t('message.advanced_audit.analytics.brute_forces') }}</div>
                  <div class="text-2xl font-black text-rose-600 dark:text-rose-400">{{ detailedSecurity.risk_indicators.brute_force_attempts }}</div>
                </div>
              </div>

              <!-- Security Summary Alerts -->
              <div class="flex gap-4 mb-4">
                <div class="flex-1 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800/30">
                  <div class="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">{{ $t('message.advanced_audit.analytics.failed_logins') }}</div>
                  <div class="text-2xl font-black text-rose-700 dark:text-rose-300">{{ detailedSecurity?.security_summary?.failed_logins?.length || 0 }}</div>
                </div>
                <div class="flex-1 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800/30">
                  <div class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">{{ $t('message.advanced_audit.analytics.suspicious_ips') }}</div>
                  <div class="text-2xl font-black text-amber-700 dark:text-amber-300">{{ detailedSecurity?.security_summary?.suspicious_ips?.length || 0 }}</div>
                </div>
              </div>

              <!-- Suspicious IPs List -->
              <div v-if="detailedSecurity?.security_summary?.suspicious_ips?.length">
                <h5 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{{ $t('message.advanced_audit.analytics.top_suspicious_origins') }}</h5>
                <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                  <div v-for="(ipData, idx) in detailedSecurity.security_summary.suspicious_ips.slice(0, 5)" :key="idx" class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div class="flex items-center gap-2">
                       <i class="bi bi-globe text-slate-400"></i>
                       <span class="text-sm font-mono text-slate-700 dark:text-slate-300">{{ ipData.ip_address || 'Unknown IP' }}</span>
                    </div>
                    <span class="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded-full">{{ ipData.total_requests }} reqs</span>
                  </div>
                </div>
              </div>

              <!-- Risk Recommendations -->
              <div v-if="detailedSecurity?.recommendations?.length" class="mt-4">
                <h5 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{{ $t('message.advanced_audit.analytics.security_recommendations') }}</h5>
                <ul class="space-y-2">
                  <li v-for="(rec, i) in detailedSecurity.recommendations" :key="i" class="flex gap-2 text-sm text-slate-700 dark:text-slate-300 bg-blue-50/50 dark:bg-blue-900/10 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <i class="bi bi-info-circle-fill text-blue-500 mt-0.5"></i>
                    <span>{{ rec }}</span>
                  </li>
                </ul>
              </div>

              <!-- Admin Activity -->
              <div v-if="detailedSecurity?.security_summary?.admin_activity?.length" class="mt-4">
                <h5 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{{ $t('message.advanced_audit.analytics.admin_activity_summary') }}</h5>
                <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                  <div v-for="(adminAct, idx) in detailedSecurity.security_summary.admin_activity" :key="idx" class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div class="flex items-center gap-2 text-sm">
                       <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">{{ adminAct.actor_role }}</span>
                       <span class="font-mono text-slate-700 dark:text-slate-300">{{ adminAct.action }}</span>
                    </div>
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full">{{ adminAct.count }} actions</span>
                  </div>
                </div>
              </div>

              <div v-else-if="!detailedSecurity?.security_summary?.suspicious_ips?.length && !detailedSecurity?.security_summary?.admin_activity?.length" class="text-sm text-slate-500 text-center p-4">{{ $t('message.advanced_audit.analytics.no_threats_detected') }}</div>
            </div>
          </div>

          <!-- Middleware Stats -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <h4 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <i class="bi bi-cpu text-emerald-500"></i>{{ $t('message.advanced_audit.analytics.middleware_performance') }}</h4>
            
            <div v-if="middlewareStats?.error" class="text-rose-500 text-sm p-3 bg-rose-50 rounded-lg">
              Failed to load: {{ middlewareStats.error }}
            </div>
            <div v-else-if="middlewareStats?.middleware_stats" class="space-y-4">
              <!-- System Status Badges -->
              <div class="flex flex-wrap gap-2 mb-4">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800/30">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active: {{ middlewareStats.middleware_stats.middleware_type }}
                </span>
                <span v-if="middlewareStats.middleware_stats.batching_enabled" class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-800/30">
                   <i class="bi bi-layers-fill"></i>{{ $t('message.advanced_audit.analytics.batching_on') }}</span>
                <span v-if="middlewareStats.middleware_stats.performance_tracking" class="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 text-xs font-bold rounded-full border border-cyan-200 dark:border-cyan-800/30">
                   <i class="bi bi-speedometer2"></i>{{ $t('message.advanced_audit.analytics.processing_tracked') }}</span>
              </div>

              <!-- Available Levels -->
              <div class="mt-4">
                <h5 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{{ $t('message.advanced_audit.analytics.audit_detail_levels') }}</h5>
                <div class="flex flex-wrap gap-2">
                  <span v-for="level in middlewareStats.middleware_stats.audit_levels_available" :key="level" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono rounded">
                    {{ level }}
                  </span>
                </div>
              </div>

              <!-- Supported Routes -->
              <div class="mt-4">
                <h5 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{{ $t('message.advanced_audit.analytics.protected_routes') }}</h5>
                <div class="flex flex-wrap gap-2">
                  <span v-for="route in middlewareStats.middleware_stats.route_types_supported" :key="route" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700">
                    /{{ route }}/*
                  </span>
                </div>
              </div>
              
              <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                 Snapshot taken: {{ new Date(middlewareStats.generated_at || Date.now()).toLocaleString() }}
              </div>
            </div>
            <div v-else>
               <pre class="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-400 overflow-x-auto max-h-60">{{ JSON.stringify(middlewareStats, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
      
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAdvancedAuditStore } from '/assets/js/stores/advancedAuditStore.js';

defineProps({
  data: {
    type: Object,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['refresh']);

const store = useAdvancedAuditStore();
const isExtrasLoading = ref(false);
const isExtendedDataReady = ref(false);

const detailedSecurity = ref(null);
const middlewareStats = ref(null);

const loadExtendedMetrics = async () => {
  isExtrasLoading.value = true;
  try {
    const [secRes, mwRes] = await Promise.all([
      store.fetchSecurityAnalytics('7d', true, true).catch(e => ({ error: e.message })),
      store.fetchMiddlewareStats(true).catch(e => ({ error: e.message }))
    ]);

    detailedSecurity.value = secRes.error ? secRes : (secRes.data || secRes);
    middlewareStats.value = mwRes.error ? mwRes : (mwRes.data || mwRes);

    isExtendedDataReady.value = true;
  } catch (err) {
    console.error('Failed to load extras', err);
  } finally {
    isExtrasLoading.value = false;
  }
};
</script>
