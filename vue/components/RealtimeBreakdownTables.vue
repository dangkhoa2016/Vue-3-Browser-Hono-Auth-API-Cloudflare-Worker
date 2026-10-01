<template>
    <section class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Users By Role (24h)</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Role</th>
                <th class="px-4 py-3 text-right">Events</th>
                <th class="px-4 py-3 text-right">Users</th>
                <th class="px-4 py-3 text-right">Failure %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in roleRows" :key="item.role" class="border-t border-slate-100 dark:border-slate-800">
                <td class="px-4 py-3 uppercase text-slate-700 dark:text-slate-200">{{ item.role }}</td>
                <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.event_count }}</td>
                <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.user_count }}</td>
                <td class="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-semibold">{{ item.failure_rate }}%</td>
              </tr>
              <tr v-if="roleRows.length === 0">
                <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No user role data.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Action Distribution</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Action</th>
                <th class="px-4 py-3 text-right">Count</th>
                <th class="px-4 py-3 text-right">Failures</th>
                <th class="px-4 py-3 text-right">Success %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in actionRows" :key="item.action" class="border-t border-slate-100 dark:border-slate-800">
                <td class="px-4 py-3 uppercase text-slate-700 dark:text-slate-200">{{ item.action }}</td>
                <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.count }}</td>
                <td class="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{{ item.failures }}</td>
                <td class="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{{ item.success_rate }}%</td>
              </tr>
              <tr v-if="actionRows.length === 0">
                <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No action distribution data.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Timeline (Hourly)</h3>
        <div class="overflow-x-auto max-h-80">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left">Hour</th>
                <th class="px-4 py-3 text-right">Total</th>
                <th class="px-4 py-3 text-right">Failed</th>
                <th class="px-4 py-3 text-right">Users</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in timelineRows" :key="item.hour" class="border-t border-slate-100 dark:border-slate-800">
                <td class="px-4 py-3 text-slate-700 dark:text-slate-200">{{ formatDate(item.hour) }}</td>
                <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.total_events }}</td>
                <td class="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{{ item.failed_events }}</td>
                <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.unique_users }}</td>
              </tr>
              <tr v-if="timelineRows.length === 0">
                <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No timeline data.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Security Insights</h3>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">High-risk IPs</p>
            <p class="text-xl font-black text-amber-600 dark:text-amber-400">{{ riskIndicators.high_risk_ips || 0 }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Brute Force</p>
            <p class="text-xl font-black text-rose-600 dark:text-rose-400">{{ riskIndicators.brute_force_attempts || 0 }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Cache Entries</p>
            <p class="text-xl font-black text-cyan-600 dark:text-cyan-400">{{ cacheStatus.entries || 0 }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/50">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Cache Hit Rate</p>
            <p class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ cacheHitRate }}%</p>
          </div>
        </div>

        <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Top Admin Activity</h4>
        <ul class="space-y-2">
          <li v-for="item in adminActivity" :key="`${item.actor_role}-${item.action}`" class="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700 px-3 py-2">
            <span class="text-sm text-slate-700 dark:text-slate-200">{{ item.actor_role }} · {{ item.action }}</span>
            <span class="text-sm font-bold text-violet-600 dark:text-violet-400">{{ item.count }}</span>
          </li>
          <li v-if="adminActivity.length === 0" class="text-sm text-slate-500 dark:text-slate-400">No admin activity data.</li>
        </ul>
      </div>
    </section>
</template>

<script setup>
defineProps({
  roleRows: { type: Array, default: () => [] },
  actionRows: { type: Array, default: () => [] },
  timelineRows: { type: Array, default: () => [] },
  riskIndicators: { type: Object, default: () => ({}) },
  cacheStatus: { type: Object, default: () => ({}) },
  cacheHitRate: { type: Number, default: 0 },
  adminActivity: { type: Array, default: () => [] },
  formatDate: { type: Function, required: true }
});
</script>
