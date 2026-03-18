<template>
  <div class="max-w-5xl mx-auto space-y-8 py-4">
    <!-- Loading State - Skeleton -->
    <div v-if="loadingProfile" class="space-y-6 animate-pulse">
      <!-- Header Skeleton -->
      <div class="relative overflow-hidden bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-xl p-8">
        <div class="flex items-center space-x-6">
          <div class="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-600"></div>
          <div class="flex-1 space-y-3">
            <div class="h-8 bg-gray-200 dark:bg-gray-600 rounded-lg w-48"></div>
            <div class="h-6 bg-gray-200 dark:bg-gray-600 rounded-lg w-64"></div>
          </div>
        </div>
      </div>

      <!-- Content Grid Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Account Info Skeleton -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-slate-800">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
            <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-40"></div>
          </div>
          
          <div class="space-y-4">
            <div v-for="i in 5" :key="i" class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
              <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          </div>
        </div>

        <!-- Stats Skeleton -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-slate-800">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
            <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-28"></div>
          </div>
          
          <div class="space-y-4">
            <div v-for="i in 2" :key="i" class="bg-gray-100 dark:bg-slate-800/50 p-6 rounded-2xl">
              <div class="flex items-center justify-between mb-2">
                <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <LoginRequiredPrompt
      v-else-if="showLoginRequired"
      tone="blue"
      :title="$t('message.auth.login_required')"
      :message="$t('message.auth.login_required_message')"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <!-- Error State -->
    <div v-else-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
      <i class="bi bi-exclamation-triangle-fill text-5xl text-red-600 dark:text-red-400 mb-4"></i>
      <h3 class="text-xl font-bold text-red-900 dark:text-red-100 mb-2">{{ $t('message.errors.failed_to_load', { item: 'Profile' }) }}</h3>
      <p class="text-red-700 dark:text-red-300 mb-4">{{ errorMessage }}</p>

      <ActionTextButton
        icon="bi bi-arrow-clockwise"
        tone="rose"
        shape="xl"
        @click="loadProfile"
      >
        {{ $t('message.common.retry') }}
      </ActionTextButton>
    </div>

    <!-- Profile Content -->
    <template v-else-if="profile">
      <!-- Header Card with Gradient -->
      <div :class="profileHeaderCardClass">
        <!-- Decorative circles -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-300/10 rounded-full blur-2xl"></div>
        
        <div class="relative flex items-center space-x-6">
          <div class="relative group">
            <div class="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all"></div>
            <div :class="profileHeaderAvatarClass">
              <i :class="getRoleIcon(profile.role)"></i>
            </div>
          </div>
          <div class="text-white">
            <h1 class="text-3xl font-bold mb-2 drop-shadow-lg">{{ profile.full_name }}</h1>
            <p class="text-blue-100 text-lg font-medium">{{ profile.email }}</p>
          </div>
        </div>
      </div>
      
      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Account Info Card -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 sm:p-8 border border-gray-100 dark:border-slate-800">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <i class="bi bi-person-circle text-blue-600 dark:text-blue-400 text-xl"></i>
              </div>
              {{ $t('message.profile.account_info') }}
            </h2>
            <div class="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <ActionTextButton
                v-if="!isEditing"
                icon="bi bi-pencil-square"
                tone="blue"
                shape="xl"
                class="w-full sm:w-auto justify-center"
                @click="startEditingProfile"
              >
                {{ $t('message.common.edit') }}
              </ActionTextButton>
              <template v-else>
                <div class="flex max-[420px]:flex-col max-[450px]:justify-between gap-2">
                  <ActionTextButton
                    icon="bi bi-x-lg"
                    tone="slate"
                    shape="xl"
                    class="w-full sm:w-auto justify-center"
                    :disabled="isSavingProfile"
                    @click="cancelEditingProfile"
                  >
                    {{ $t('message.common.cancel') }}
                  </ActionTextButton>
                  <ActionTextButton
                    :icon="isSavingProfile ? 'bi bi-hourglass-split' : 'bi bi-check-lg'"
                    tone="emerald"
                    shape="xl"
                    class="w-full sm:w-auto justify-center"
                    :disabled="!canSubmitProfile"
                    @click="saveProfile"
                  >
                    {{ isSavingProfile ? $t('message.common.loading') : $t('message.common.save') }}
                  </ActionTextButton>
                </div>
              </template>
            </div>
          </div>
          
          <div class="space-y-4">
            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-blue-100/80 dark:bg-blue-900/30 flex items-center justify-center">
                  <i class="bi bi-person-fill text-blue-600 dark:text-blue-400"></i>
                </div>
                <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.profile.full_name') }}</span>
              </div>
                <span v-if="!isEditing" class="font-semibold text-gray-900 dark:text-slate-100 break-words sm:text-right">{{ profile.full_name }}</span>
                <input
                  v-else
                  v-model="editForm.full_name"
                  type="text"
                  autocomplete="name"
                  :class="profileEditInputClass"
                />
              </div>
            </div>

            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-cyan-100/80 dark:bg-cyan-900/30 flex items-center justify-center">
                  <i class="bi bi-envelope-fill text-cyan-600 dark:text-cyan-400"></i>
                </div>
                <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.common.email') }}</span>
              </div>
                <span v-if="!isEditing" class="font-semibold text-gray-900 dark:text-slate-100 break-all sm:text-right">{{ profile.email }}</span>
                <input
                  v-else
                  v-model="editForm.email"
                  type="email"
                  autocomplete="email"
                  :class="profileEditInputClass"
                />
              </div>
            </div>

            <div
              v-if="profile.new_email"
              class="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-start gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <i class="bi bi-envelope-check-fill text-amber-600 dark:text-amber-400"></i>
                  </div>
                  <div class="min-w-0">
                    <p class="text-amber-700 dark:text-amber-300 font-medium">{{ $t('message.profile.pending_email') }}</p>
                    <p class="font-semibold text-amber-800 dark:text-amber-200 break-all sm:break-normal sm:truncate">{{ profile.new_email }}</p>
                  </div>
                </div>
                <ActionTextButton
                  :icon="isClearingPendingEmail ? 'bi bi-hourglass-split' : 'bi bi-trash3'"
                  tone="amber"
                  shape="xl"
                  size="sm"
                  class="w-full sm:w-auto justify-center whitespace-nowrap"
                  :disabled="isClearingPendingEmail || isSavingProfile"
                  @click="clearPendingEmail"
                >
                  <span v-if="isClearingPendingEmail">{{ $t('message.common.loading') }}</span>
                  <template v-else>
                    {{ $t('message.profile.clear_pending_email') }}
                  </template>
                </ActionTextButton>
              </div>
            </div>
            
            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-purple-100/80 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <i :class="getRoleIcon(profile.role)" class="text-purple-600 dark:text-purple-400"></i>
                  </div>
                  <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.profile.role') }}</span>
                </div>
                <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100 w-fit sm:ml-auto">
                  {{ profile.role.replace('_', ' ').toUpperCase() }}
                </span>
              </div>
            </div>
            
            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-green-100/80 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <i class="bi bi-check-circle-fill text-green-600 dark:text-green-400"></i>
                  </div>
                  <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.profile.status') }}</span>
                </div>
                <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 w-fit sm:ml-auto">
                  <span class="w-2 h-2 rounded-full bg-current opacity-70"></span>
                  {{ profile.status.toUpperCase() }}
                </span>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-orange-100/80 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <i class="bi bi-calendar-check text-orange-600 dark:text-orange-400"></i>
                  </div>
                  <span class="text-gray-600 dark:text-slate-400 font-medium">{{ $t('message.profile.joined') }}</span>
                </div>
                <span class="font-semibold text-gray-900 dark:text-slate-100 break-words sm:text-right">{{ formatDate(profile.created_at) }}</span>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <i class="bi bi-key-fill text-amber-600 dark:text-amber-400 text-lg"></i>
                </div>
                {{ $t('message.profile.change_password') }}
              </h3>
              <ActionTextButton
                v-if="!isChangingPassword"
                icon="bi bi-shield-lock"
                tone="amber"
                shape="xl"
                class="w-full sm:w-auto justify-center"
                :disabled="isEditing || isSavingProfile"
                @click="startChangingPassword"
              >
                {{ $t('message.profile.change_password_action') }}
              </ActionTextButton>
            </div>

            <div v-if="isChangingPassword" class="space-y-4">
              <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ $t('message.profile.current_password') }}</label>
                <input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  autocomplete="current-password"
                  :class="profilePasswordInputClass"
                />
              </div>

              <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ $t('message.profile.new_password') }}</label>
                <input
                  v-model="passwordForm.newPassword"
                  type="password"
                  autocomplete="new-password"
                  :class="profilePasswordInputClass"
                />
              </div>

              <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ $t('message.profile.confirm_password') }}</label>
                <input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  :class="profilePasswordInputClass"
                />
              </div>

              <div class="flex flex-col sm:flex-row gap-2">
                <ActionTextButton
                  icon="bi bi-x-lg"
                  tone="slate"
                  shape="xl"
                  class="w-full sm:w-auto justify-center"
                  :disabled="isSavingPassword"
                  @click="cancelChangingPassword"
                >
                  {{ $t('message.common.cancel') }}
                </ActionTextButton>
                <ActionTextButton
                  :icon="isSavingPassword ? 'bi bi-hourglass-split' : 'bi bi-check-lg'"
                  tone="amber"
                  shape="xl"
                  class="w-full sm:w-auto justify-center"
                  :disabled="!canSubmitPassword"
                  @click="changePassword"
                >
                  {{ isSavingPassword ? $t('message.common.loading') : $t('message.profile.change_password_submit') }}
                </ActionTextButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Card -->
        <div :class="statsCardClass">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <i class="bi bi-bar-chart-fill text-purple-600 dark:text-purple-400 text-xl"></i>
              </div>
              {{ $t('message.profile.stats') }}
            </h2>
          </div>
          
          <div class="space-y-4">
            <div :class="statsUserIdCardClass">
              <div class="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 dark:bg-blue-700/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
              <div class="relative">
                <div class="flex items-center justify-between mb-2">
                  <i class="bi bi-person-fill text-2xl text-blue-600 dark:text-blue-400"></i>
                  <div class="text-4xl font-black text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">{{ profile.id }}</div>
                </div>
                <div class="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">{{ $t('message.profile.user_id') }}</div>
              </div>
            </div>
            
            <div :class="statsAccessLevelCardClass">
              <div class="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 dark:bg-purple-700/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
              <div class="relative">
                <div class="flex items-center justify-between mb-2">
                  <i class="bi bi-shield-check text-2xl text-purple-600 dark:text-purple-400"></i>
                  <div class="text-2xl font-black text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform uppercase">{{ profile.role.split('_')[0] }}</div>
                </div>
                <div class="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">{{ $t('message.profile.access_level') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'Profile'
}
</script>

<script setup>
import ActionTextButton from '/vue/components/ActionTextButton.vue';
import LoginRequiredPrompt from '/vue/components/LoginRequiredPrompt.vue';
import { useProfilePage } from '/vue/composables/useProfilePage.js';

const {
  profile,
  loadingProfile,
  errorMessage,
  showLoginRequired,
  isEditing,
  isSavingProfile,
  isClearingPendingEmail,
  isChangingPassword,
  isSavingPassword,
  profileHeaderCardClass,
  profileHeaderAvatarClass,
  profileEditInputClass,
  profilePasswordInputClass,
  statsCardClass,
  statsUserIdCardClass,
  statsAccessLevelCardClass,
  editForm,
  passwordForm,
  canSubmitProfile,
  canSubmitPassword,
  formatDate,
  getRoleIcon,
  openLoginModal,
  loadProfile,
  startEditingProfile,
  cancelEditingProfile,
  startChangingPassword,
  cancelChangingPassword,
  saveProfile,
  clearPendingEmail,
  changePassword
} = useProfilePage();
</script>
