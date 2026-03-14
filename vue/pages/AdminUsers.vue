<template>
  <div class="relative max-w-7xl mx-auto">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="teal"
      :title="$t('message.auth.login_required')"
      :message="$t('message.admin_users.login_required_message')"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <template v-else>
      <PageHeroSection
        :section-class="heroSectionClass"
        top-blob-class="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"
        bottom-blob-class="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"
        content-class="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center"
      >
        <template #left>
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-teal-900/10 text-teal-800 dark:bg-teal-400/10 dark:text-teal-200 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
              <span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              {{ tf('message.admin_users.badge', 'Account Administration') }}
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {{ $t('message.admin_users.title') }}
            </h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ $t('message.admin_users.subtitle') }}
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <ActionTextButton
                variant="soft"
                shape="full"
                :icon="loading ? 'bi bi-arrow-clockwise animate-spin' : 'bi bi-arrow-clockwise'"
                :title="$t('message.common.retry_title')"
                :disabled="loading"
                @click="reload"
              >
                {{ $t('message.admin_users.reload') }}
              </ActionTextButton>
            </div>
          </div>
        </template>

        <template #right>
          <div class="grid gap-4">
            <StatCard
              :label="$t('message.admin_users.stats_total')"
              :value="pagination.total"
              :loading="showDataSkeleton"
              loading-class="h-9 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
              value-class="text-3xl font-black text-slate-900 dark:text-white"
              icon-class="bi bi-people text-2xl text-teal-500"
            />
            <div class="grid grid-cols-2 gap-4">
              <StatCard
                :label="$t('message.admin_users.stats_active')"
                :value="activeCount"
                :loading="showDataSkeleton"
                loading-class="h-8 w-14 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
                value-class="text-2xl font-black text-slate-900 dark:text-white"
                icon-class="bi bi-check-circle text-xl text-emerald-500"
              />
              <StatCard
                :label="$t('message.admin_users.stats_inactive')"
                :value="inactiveCount"
                :loading="showDataSkeleton"
                loading-class="h-8 w-14 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
                value-class="text-2xl font-black text-slate-900 dark:text-white"
                icon-class="bi bi-x-circle text-xl text-rose-500"
              />
            </div>
          </div>
        </template>
      </PageHeroSection>


      <section v-if="!isAdmin" class="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-8 text-center shadow-sm">
        <i class="bi bi-shield-lock-fill text-5xl text-amber-600 dark:text-amber-400 mb-4"></i>
        <h3 class="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">{{ $t('message.admin_users.access_denied_title') }}</h3>
        <p class="text-amber-700 dark:text-amber-300">{{ $t('message.admin_users.access_denied_message') }}</p>
      </section>

      <section v-else class="mt-6 space-y-6">
        <div class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="relative flex-1 min-w-[220px]">
              <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                v-model="search"
                ref="searchInput"
                type="text"
                :class="searchInputClass"
                :placeholder="$t('message.admin_users.search_placeholder')"
              />
              <ActionIconButton
                v-if="search"
                icon="bi bi-x-lg"
                tone="indigo"
                class="absolute right-2 top-1/2 -translate-y-1/2"
                :title="tf('message.common.clear', 'Clear')"
                :aria-label="tf('message.common.clear', 'Clear')"
                @click="search = ''; $refs.searchInput && $refs.searchInput.focus()"
              />
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <select
                v-model="roleFilter"
                class="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5"
              >
                <option value="all">{{ $t('message.admin_users.role_all') }}</option>
                <option v-for="role in roleOptions" :key="role" :value="role">{{ role.toUpperCase() }}</option>
              </select>
              <select
                v-model="statusFilter"
                class="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5"
              >
                <option value="all">{{ $t('message.admin_users.status_all') }}</option>
                <option value="active">{{ $t('message.admin_users.status_active') }}</option>
                <option value="inactive">{{ $t('message.admin_users.status_inactive') }}</option>
              </select>
              <label :class="serverFilterLabelClass">
                <input
                  v-model="useServerFilter"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>{{ useServerFilter ? $t('message.admin_users.server_filtering') : $t('message.admin_users.client_filtering') }}</span>
              </label>
            </div>
          </div>
        </div>

        <div ref="tableTopRef" class="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('message.admin_users.table_title') }}</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('message.admin_users.table_subtitle') }}</p>
            </div>
            <ActionTextButton
              icon="bi bi-person-plus-fill"
              tone="teal"
              shape="xl"
              @click="openCreateModal"
            >
              {{ $t('message.admin_users.create_user', 'Create User') }}
            </ActionTextButton>
          </div>

          <AsyncStateSection
            :loading="showDataSkeleton"
            :error="error"
            :is-empty="filteredUsers.length === 0"
            :empty-title="$t('message.admin_users.empty_title')"
            :empty-message="$t('message.admin_users.empty_message')"
          >
            <template #loading>
              <div class="p-6 space-y-4 animate-pulse">
                <div v-for="row in 6" :key="row" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
              </div>
            </template>

            <template #error>
              <div class="p-8 text-center">
                <i class="bi bi-exclamation-triangle-fill text-4xl text-rose-500 mb-3"></i>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('message.errors.failed_to_load', { item: $t('message.admin_users.list_title'), message: error }) }}</h3>
                <ActionTextButton
                  class="mt-4"
                  tone="rose"
                  shape="full"
                  icon="bi bi-arrow-clockwise"
                  @click="reload"
                >
                  {{ $t('message.common.retry') }}
                </ActionTextButton>
              </div>
            </template>

            <div class="overflow-x-auto">
              <table class="max-[992px]:mt-4 mt-0 min-w-full text-sm max-[992px]:block">
                <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider max-[992px]:hidden">
                  <tr>
                    <th class="px-6 py-3 text-center">{{ $t('message.common.actions', 'Actions') }}</th>
                    <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_id') }}</th>
                    <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_full_name') }}</th>
                    <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_email') }}</th>
                    <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_role') }}</th>
                    <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_status') }}</th>
                    <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_created_at') }}</th>
                    <th class="px-6 py-3 text-left">{{ $t('message.admin_users.column_updated_at') }}</th>
                  </tr>
                </thead>
                <tbody class="max-[992px]:block max-[992px]:px-4">
                  <tr
                    v-for="userItem in filteredUsers"
                    :key="userItem.id"
                    :class="tableRowClass"
                  >
                    <td :class="actionsCellClass" :data-label="$t('message.common.actions', 'Actions')">
                      <div class="flex items-center justify-center gap-2">
                        <ActionIconButton
                          v-if="isAdmin && !isCurrentUser(userItem)"
                          @click="openRoleModal(userItem)"
                          icon="bi bi-shield-shaded"
                          tone="amber"
                          :title="$t('message.admin_users.change_role', 'Change Role')"
                          :aria-label="$t('message.admin_users.change_role', 'Change Role')"
                        />
                        <ActionIconButton
                          @click="openEditModal(userItem)"
                          icon="bi bi-pencil-fill"
                          tone="indigo"
                          :title="tf('message.common.edit', 'Edit')"
                          :aria-label="tf('message.common.edit', 'Edit')"
                        />
                        <ActionIconButton
                          @click="confirmDelete(userItem)"
                          icon="bi bi-trash-fill"
                          tone="rose"
                          :title="tf('message.common.delete', 'Delete')"
                          :aria-label="tf('message.common.delete', 'Delete')"
                        />
                      </div>
                    </td>
                    <td :class="idCellClass" :data-label="$t('message.admin_users.column_id')">#{{ userItem.id }}</td>
                    <td :class="nameCellClass" :data-label="$t('message.admin_users.column_full_name')">
                      <div class="font-semibold">{{ userItem.full_name }}</div>
                    </td>
                    <td :class="emailCellClass" :data-label="$t('message.admin_users.column_email')">{{ userItem.email }}</td>
                    <td :class="roleCellClass" :data-label="$t('message.admin_users.column_role')">
                      <span :class="roleBadgeClass(userItem.role)">{{ formatRole(userItem.role) }}</span>
                    </td>
                    <td :class="statusCellClass" :data-label="$t('message.admin_users.column_status')">
                      <span :class="statusBadgeClass(userItem.status)">{{ formatStatus(userItem.status) }}</span>
                    </td>
                    <td :class="createdAtCellClass" :data-label="$t('message.admin_users.column_created_at')">{{ formatDate(userItem.created_at) }}</td>
                    <td :class="updatedAtCellClass" :data-label="$t('message.admin_users.column_updated_at')">{{ formatDate(userItem.updated_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AsyncStateSection>
        </div>

        <div class="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" v-if="(pagination.totalPages || 1) > 1">
          <PaginationControls
            :current-page="pagination.page || 1"
            :total-pages="pagination.totalPages || 1"
            :page-size="pagination.limit || 20"
            :page-size-options="[10, 20, 50]"
            :show-page-size="true"
            :loading="loading"
            @change="goToPage"
            @change-size="handlePageSizeChange"
          />
        </div>
      </section>
    </template>
    
    <ConfirmDeleteModal
      :show="!!showConfirm"
      :item-id="showConfirm?.id"
      :item-name="showConfirm?.full_name"
      :model="t('message.admin_users.models.user')"
      :loading="isDeleting"
      @confirm="performDelete"
      @cancel="cancelDelete"
    />

    <RoleChangeModal
      :show="showRoleModal"
      :user="selectedRoleUser"
      :role-value="selectedRoleValue"
      :role-options="roleChangeOptions"
      :loading="isChangingRole"
      @close="closeRoleModal"
      @save="submitRoleChange"
      @update:role-value="selectedRoleValue = $event"
    />

    <!-- User Modal Component -->
    <UserModal
      :show="showModal"
      :mode="modalMode"
      :initial-data="userForm"
      :loading="isSubmitting"
      :error="formError"
      @close="closeModal"
      @save="handleSaveUser"
    />
  </div>
</template>

<script>
export default {
  name: 'AdminUsers'
};
</script>

<script setup>
import UserModal from '../components/UserModal.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import RoleChangeModal from '../components/RoleChangeModal.vue';
import PaginationControls from '../components/PaginationControls.vue';
import ActionIconButton from '../components/ActionIconButton.vue';
import ActionTextButton from '../components/ActionTextButton.vue';
import LoginRequiredPrompt from '../components/LoginRequiredPrompt.vue';
import PageHeroSection from '../components/PageHeroSection.vue';
import AsyncStateSection from '../components/AsyncStateSection.vue';
import StatCard from '../components/StatCard.vue';
import { useAdminUsersPage } from '/vue/composables/useAdminUsersPage.js';

const {
  t,
  tf,
  authStore,
  showLoginRequired,
  error,
  loading,
  isAdmin,
  isSuperAdmin,
  search,
  roleFilter,
  statusFilter,
  useServerFilter,
  heroSectionClass,
  searchInputClass,
  serverFilterLabelClass,
  tableRowClass,
  actionsCellClass,
  idCellClass,
  nameCellClass,
  emailCellClass,
  roleCellClass,
  statusCellClass,
  createdAtCellClass,
  updatedAtCellClass,
  roleOptions,
  users,
  pagination,
  showDataSkeleton,
  filteredUsers,
  activeCount,
  inactiveCount,
  openLoginModal,
  reload,
  goToPage,
  handlePageSizeChange,
  formatDate,
  formatRole,
  formatStatus,
  roleBadgeClass,
  statusBadgeClass,
  isCurrentUser,
  showModal,
  modalMode,
  userForm,
  formError,
  isSubmitting,
  openCreateModal,
  openEditModal,
  closeModal,
  handleSaveUser,
  showRoleModal,
  selectedRoleUser,
  selectedRoleValue,
  roleChangeOptions,
  isChangingRole,
  tableTopRef,
  openRoleModal,
  closeRoleModal,
  submitRoleChange,
  showConfirm,
  isDeleting,
  performDelete,
  cancelDelete,
  confirmDelete
} = useAdminUsersPage();
</script>
