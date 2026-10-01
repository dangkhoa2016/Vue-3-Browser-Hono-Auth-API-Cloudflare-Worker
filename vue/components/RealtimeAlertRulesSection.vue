<template>
    <section class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.realtime_monitoring.alert_rules_title', 'Alert Rules') }}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.alert_rules_subtitle', 'Rule engine status and per-rule toggle controls.') }}</p>
          </div>
          <div class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {{ tf('message.realtime_monitoring.enabled_summary', '{enabled} / {total} enabled', { enabled: ruleSummary.enabled, total: ruleSummary.total }) }}
          </div>
        </div>

        <div v-if="rulesLoading" class="space-y-3">
          <div
            v-for="item in 4"
            :key="`alert-rules-skeleton-${item}`"
            class="animate-pulse rounded-xl border border-slate-200/70 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="space-y-2 flex-1">
                <div class="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div class="h-3 w-64 rounded bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div class="h-7 w-20 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </div>

        <div v-else class="overflow-x-auto max-h-96">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.rule_label', 'Rule') }}</th>
                <th class="px-4 py-3 text-left">{{ tf('message.realtime_monitoring.severity_label', 'Severity') }}</th>
                <th class="px-4 py-3 text-right">{{ tf('message.realtime_monitoring.triggers_label', 'Triggers') }}</th>
                <th class="px-4 py-3 text-right">{{ tf('message.realtime_monitoring.status', 'Status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in rules" :key="item.id || item.name" class="border-t border-slate-100 dark:border-slate-800">
                <td class="px-4 py-3 text-slate-700 dark:text-slate-200">
                  <div class="font-semibold">{{ item.name || item.id }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ item.description || tf('message.realtime_monitoring.no_description', 'No description') }}</div>
                </td>
                <td class="px-4 py-3 uppercase text-slate-700 dark:text-slate-200">{{ item.severity || tf('message.realtime_monitoring.empty_value', '-') }}</td>
                <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ item.stats?.triggered || item.stats?.triggerCount || item.stats?.totalTriggered || 0 }}</td>
                <td class="px-4 py-3 text-right">
                  <button
                    v-if="isSuperAdmin"
                    type="button"
                    class="rounded-full px-3 py-1 text-xs font-bold uppercase transition"
                    :class="item.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
                    :disabled="rulesLoading || actionLoading"
                    @click="$emit('toggle', item)"
                  >
                    {{ item.enabled ? tf('message.realtime_monitoring.enabled', 'Enabled') : tf('message.realtime_monitoring.disabled', 'Disabled') }}
                  </button>
                  <span
                    v-else
                    class="rounded-full px-3 py-1 text-xs font-bold uppercase"
                    :class="item.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
                  >
                    {{ item.enabled ? tf('message.realtime_monitoring.enabled', 'Enabled') : tf('message.realtime_monitoring.disabled', 'Disabled') }}
                  </span>
                </td>
              </tr>
              <tr v-if="rules.length === 0">
                <td colspan="4" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.no_alert_rules', 'No alert rules.') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)]">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ tf('message.realtime_monitoring.alert_channels_title', 'Alert Channels') }}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.alert_channels_subtitle', 'Delivery channels configured on the monitoring backend.') }}</p>
          </div>
          <div class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {{ tf('message.realtime_monitoring.enabled_summary', '{enabled} / {total} enabled', { enabled: channelSummary.enabled, total: channelSummary.total }) }}
          </div>
        </div>

        <ul class="space-y-3">
          <li
            v-for="item in channels"
            :key="item.id || item.name"
            class="rounded-xl border border-slate-200/70 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-100">{{ item.name || item.id }}</p>
                <p class="text-xs uppercase tracking-[0.2em] text-slate-500 mt-1">{{ item.type || tf('message.realtime_monitoring.channel_fallback', 'channel') }}</p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-bold uppercase"
                :class="item.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
              >
                {{ item.enabled ? tf('message.realtime_monitoring.enabled', 'Enabled') : tf('message.realtime_monitoring.disabled', 'Disabled') }}
              </span>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.sent_label', 'Sent') }}</p>
                <p class="font-bold text-slate-800 dark:text-slate-100">{{ item.stats?.alertsSent || item.stats?.sent || item.stats?.delivered || item.stats?.totalSent || 0 }}</p>
              </div>
              <div>
                <p class="text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.last_used_label', 'Last Used') }}</p>
                <p class="font-bold text-slate-800 dark:text-slate-100">{{ formatDate(item.lastUsed) }}</p>
              </div>
            </div>
          </li>
          <li v-if="channels.length === 0" class="text-sm text-slate-500 dark:text-slate-400">{{ tf('message.realtime_monitoring.no_alert_channels', 'No alert channels.') }}</li>
        </ul>
      </div>
    </section>
</template>

<script setup>
import { useI18nFallback } from '/vue/composables/useI18nFallback.js';

defineProps({
  rules: { type: Array, default: () => [] },
  channels: { type: Array, default: () => [] },
  ruleSummary: { type: Object, default: () => ({}) },
  channelSummary: { type: Object, default: () => ({}) },
  rulesLoading: { type: Boolean, default: false },
  actionLoading: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  formatDate: { type: Function, required: true }
});

defineEmits(['toggle']);

const { tf } = useI18nFallback();
</script>
