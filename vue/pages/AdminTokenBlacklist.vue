<template>
  <div class="relative max-w-7xl mx-auto">
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_45%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(transparent,rgba(15,23,42,0.03))]"></div>
    </div>

    <LoginRequiredPrompt
      v-if="showLoginRequired"
      tone="red"
      :title="$t('message.auth.login_required')"
      :message="tf('message.token_blacklist.access_denied.login_required', 'You need to log in to access the token blacklist.')"
      :button-text="$t('message.auth.login')"
      @action="openLoginModal"
    />

    <!-- Super Admin Required Section -->
    <section v-else-if="!isSuperAdmin" class="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-8 text-center shadow-sm">
      <i class="bi bi-exclamation-triangle-fill text-5xl text-red-600 dark:text-red-400 mb-4"></i>
      <h3 class="text-xl font-bold text-red-900 dark:text-red-100 mb-2">{{ tf('message.token_blacklist.access_denied.title', 'Access Denied') }}</h3>
      <p class="text-red-700 dark:text-red-300">{{ tf('message.token_blacklist.access_denied.message', 'Only Super Admins can access the Token Blacklist.') }}</p>
    </section>

    <template v-else>
      <section class="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 mb-8 border border-slate-100 dark:border-slate-800/60 shadow-sm p-6 lg:p-8">
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-red-500/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div class="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-red-900/10 text-red-800 dark:bg-red-400/10 dark:text-red-200 px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase mb-4 shadow-sm border border-red-200/50 dark:border-red-800/50">
              <i class="bi bi-ban"></i> {{ tf('message.token_blacklist.security', 'SECURITY') }}
            </div>
            <h1 class="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
              {{ tf('message.token_blacklist.title', 'Token Blacklist') }}
            </h1>
            <p class="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-2xl">
              {{ tf('message.token_blacklist.subtitle', 'Manage revoked access tokens to immediately disable compromised accounts and secure the system.') }}
            </p>
          </div>
          <div class="flex flex-wrap items-center lg:justify-end gap-3 z-10 w-full sm:w-auto mt-4 lg:mt-0">
             <ActionIconButton
              icon="bi bi-arrow-clockwise"
              tone="slate"
              size="md"
              :title="$t('message.common.refresh')"
              @click="fetchTokens"
                :class="{ 'animate-spin': isLoading }"
                :disabled="isLoading"
            />
            <ActionTextButton
              icon="bi bi-plus-lg"
              tone="red"
              size="md"
              shape="pill"
              class="w-full sm:w-auto"
              @click="openAddTokenModal"
            >
              {{ tf('message.token_blacklist.add_token', 'Add Token') }}
            </ActionTextButton>
          </div>
        </div>
      </section>

      <!-- Search & Filters -->
      <section class="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm shadow-sm relative z-20">
        <div class="relative w-full sm:max-w-md group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-500 transition-colors">
            <i class="bi bi-search"></i>
          </div>
          <input
            type="text"
            v-model="searchQuery"
            @input="handleSearch"
            :placeholder="tf('message.token_blacklist.search_placeholder', 'Search by JTI or Reason...')"
            class="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 flex-1 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 text-slate-900 dark:text-slate-100 placeholder-slate-400 sm:text-sm shadow-sm"
          />
        </div>
      </section>

      <!-- Main Content Area -->
      <div v-if="isLoading && items.length === 0" class="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm shadow-sm">
        <div class="relative w-16 h-16 mb-4">
          <div class="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
          <div class="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
        </div>
        <p class="text-slate-500 dark:text-slate-400 font-medium animate-pulse">{{ tf('message.common.loading_data', 'Loading data...') }}</p>
      </div>

      <div v-else-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-8 text-center shadow-sm">
         <i class="bi bi-exclamation-octagon text-4xl text-red-500 mb-3"></i>
        <p class="text-red-700 dark:text-red-400 font-medium">{{ errorMessage }}</p>
         <ActionTextButton icon="bi bi-arrow-clockwise" tone="red" size="sm" shape="pill" class="mt-4" @click="fetchTokens">
           {{ tf('message.common.retry', 'Retry') }}
         </ActionTextButton>
      </div>

      <div v-else-if="items.length === 0" class="bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-12 text-center backdrop-blur-sm shadow-sm">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 shadow-inner">
          <i class="bi bi-shield-check text-4xl text-slate-400 dark:text-slate-500"></i>
        </div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{{ tf('message.token_blacklist.no_tokens_title', 'No Blacklisted Tokens') }}</h3>
        <p class="text-slate-500 dark:text-slate-400">{{ tf('message.token_blacklist.no_tokens_desc', 'There are currently no security threats detected requiring revoked tokens.') }}</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 transition-colors duration-300">
        <div class="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pb-2">
          <table class="min-w-[800px] w-full divide-y divide-slate-200 dark:divide-slate-800 transition-colors duration-300 table-fixed">
            <thead class="bg-slate-50/50 dark:bg-slate-800/50">
              <tr>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">{{ tf('message.token_blacklist.table.id', 'ID') }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-56">{{ tf('message.token_blacklist.table.jti', 'JTI') }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">{{ tf('message.token_blacklist.table.userId', 'User ID') }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40">{{ tf('message.token_blacklist.table.reason', 'Reason') }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">{{ tf('message.token_blacklist.table.expiresAt', 'Expires At') }}</th>
                <th scope="col" class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">{{ tf('message.token_blacklist.table.createdAt', 'Created At') }}</th>
                <th scope="col" class="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">{{ tf('message.token_blacklist.table.actions', 'Actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900 transition-colors duration-300">
              <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150 group">
                <td class="px-5 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-medium">#{{ item.id }}</td>
                <td class="px-5 py-3 whitespace-nowrap text-sm font-mono text-slate-900 dark:text-slate-100 truncate" :title="item.jti">{{ item.jti }}</td>
                <td class="px-5 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                  <span v-if="item.user_id" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="bi bi-person mr-1"></i> ID: {{ item.user_id }}
                  </span>
                  <span v-else class="text-slate-400 dark:text-slate-500">-</span>
                </td>
                <td class="px-5 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-medium">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/30">
                    {{ item.reason || tf('message.token_blacklist.table.manual', 'MANUAL') }}
                  </span>
                </td>
                <td class="px-5 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{{ formatDate(item.expires_at) }}</td>
                <td class="px-5 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{{ formatDate(item.created_at) }}</td>
                <td class="px-5 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <ActionIconButton
                    icon="bi bi-trash3"
                    tone="red"
                    size="sm"
                    tooltip="Remove"
                    @click="confirmDeleteToken(item.id)"
                    class="opacity-50 group-hover:opacity-100"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <PaginationControls
            :current-page="pagination.page"
            :total-pages="pagination.totalPages || 1"
            :loading="isLoading"
            @change="changePage"
          />
        </div>
      </div>
    </template>

    <!-- Add Token Modal -->
    <ModalWindow :show="showAddModal" :title="tf('message.token_blacklist.add_modal.title', 'Add To Blacklist')" @close="closeAddTokenModal">
      <div class="p-6">
        <form @submit.prevent="submitAddToken">
          <fieldset :disabled="isSubmitting">
            <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.token_blacklist.add_modal.jti_label', 'JTI (Token ID) *') }}</label>
              <input type="text" v-model="addForm.jti" required
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 dark:text-slate-100 font-mono text-sm"
                :placeholder="tf('message.token_blacklist.add_modal.jti_placeholder', 'e.g. 550e8400-e29b-41d4-a716-446655440000')">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.token_blacklist.add_modal.user_id_label', 'User ID (Optional)') }}</label>
              <input type="number" v-model="addForm.userId"
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 dark:text-slate-100"
                :placeholder="tf('message.token_blacklist.add_modal.user_id_placeholder', 'e.g. 42')">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.token_blacklist.add_modal.reason_label', 'Reason *') }}</label>
              <select v-model="addForm.reason" required
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 dark:text-slate-100">
                <option value="ADMIN_SECURITY_ACTION">{{ tf('message.token_blacklist.add_modal.reasons.admin_security', 'Administrator Security Action') }}</option>
                <option value="USER_LOGOUT">{{ tf('message.token_blacklist.add_modal.reasons.user_logout', 'User Logout') }}</option>
                <option value="PASSWORD_RESET">{{ tf('message.token_blacklist.add_modal.reasons.password_reset', 'Password Reset') }}</option>
                <option value="COMPROMISED_TOKEN">{{ tf('message.token_blacklist.add_modal.reasons.compromised', 'Compromised Token') }}</option>
                <option value="USER_SUSPENDED">{{ tf('message.token_blacklist.add_modal.reasons.suspended', 'User Suspended') }}</option>
                <option value="OTHER">{{ tf('message.token_blacklist.add_modal.reasons.other', 'Other') }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ tf('message.token_blacklist.add_modal.expires_label', 'Expiration Date (Optional)') }}</label>
              <input type="datetime-local" v-model="addForm.expiresAt"
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 dark:text-slate-100">
              <p class="text-xs text-slate-500 mt-1">{{ tf('message.token_blacklist.add_modal.expires_hint', 'If not set, defaults to 24 hours from now.') }}</p>
            </div>
            
            <div v-if="addError" class="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              <i class="bi bi-exclamation-triangle mr-1"></i> {{ addError }}
            </div>
          </div>
          
          <div class="mt-6 flex justify-end gap-3">
            <ActionTextButton tone="slate" size="md" @click="closeAddTokenModal" type="button">
              {{ tf('message.common.cancel', 'Cancel') }}
            </ActionTextButton>
            <ActionTextButton tone="red" size="md" type="submit" icon="bi bi-shield-lock" :disabled="isSubmitting" :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ tf('message.token_blacklist.add_modal.submit', 'Add to Blacklist') }}
            </ActionTextButton>
          </div>
          </fieldset>
        </form>
      </div>
    </ModalWindow>

    <!-- Delete Confirm Modal -->
    <ConfirmDeleteModal
      :show="showDeleteModal"
      :title="tf('message.token_blacklist.delete_modal.title', 'Remove Token from Blacklist?')"
      :message="tf('message.token_blacklist.delete_modal.message', 'Are you sure you want to remove this token from the blacklist? The token might become valid again if it hasn\'t expired naturally.')"
      :confirm-label="tf('message.token_blacklist.delete_modal.remove', 'Remove')"
      :loading="isDeleting"
      @confirm="executeDeleteToken"
      @cancel="closeDeleteTokenModal"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useTokenBlacklistStore } from '/assets/js/stores/tokenBlacklistStore.js';

import ActionIconButton from '../components/ActionIconButton.vue';
import ActionTextButton from '../components/ActionTextButton.vue';
import PaginationControls from '../components/PaginationControls.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import ModalWindow from '../components/ModalWindow.vue';
import LoginRequiredPrompt from '../components/LoginRequiredPrompt.vue';
import { useModalState } from '../composables/useModalState.js';
import { useDebouncedFilters } from '../composables/useDebouncedFilters.js';
import { useAuthGate } from '../composables/useAuthGate.js';
import { useI18nFallback } from '../composables/useI18nFallback.js';

export default {
  components: {
    ActionIconButton,
    ActionTextButton,
    PaginationControls,
    ConfirmDeleteModal,
    ModalWindow,
    LoginRequiredPrompt
  },
  setup() {
    const { tf } = useI18nFallback();
    const mainStore = useMainStore();
    const authStore = useAuthStore();
    const modalStore = useModalStore();
    const blacklistStore = useTokenBlacklistStore();

    // Data state mapped from store
    const items = computed(() => blacklistStore.items);
    const isLoading = computed(() => blacklistStore.loading);
    const errorMessage = computed(() => blacklistStore.error);
    const pagination = computed(() => blacklistStore.pagination);
    
    // Local state for UI
    const searchQuery = ref('');
    const { runDebounced, clearDebounce } = useDebouncedFilters();

    // Modals state
    const addTokenModal = useModalState({ initialMode: 'add-token' });
    const showAddModal = addTokenModal.isOpen;
    const addError = computed(() => blacklistStore.addError);
    const isSubmitting = computed(() => blacklistStore.isSubmitting);
    const addForm = ref({
      jti: '',
      userId: '',
      reason: 'ADMIN_SECURITY_ACTION',
      expiresAt: ''
    });

    const deleteTokenModal = useModalState({ initialMode: 'delete-token', initialValue: null });
    const showDeleteModal = deleteTokenModal.isOpen;
    const isDeleting = computed(() => blacklistStore.isDeleting);
    const deletingId = ref(null);

    // Auth state access
    const isSuperAdmin = computed(() => {
      return authStore.user?.role?.toUpperCase() === 'SUPER_ADMIN';
    });

    const { showLoginRequired, openLoginModal, ensureAuthenticated, handleAuthStateChange } = useAuthGate({
      authStore,
      modalStore,
      onAuthenticated: async () => {
        await fetchTokens();
      }
    });

    // Formatting utilities
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(date);
      } catch (e) {
        return dateString;
      }
    };

    const fetchTokens = async (page = 1) => {
      if (!authStore.isAuthenticated || !isSuperAdmin.value) return;

      await blacklistStore.fetchTokens({
        page,
        limit: pagination.value.limit,
        search: searchQuery.value
      });
    };

    const changePage = (newPage) => {
      if (newPage < 1 || (pagination.value.totalPages && newPage > pagination.value.totalPages)) return;
      fetchTokens(newPage);
    };

    const handleSearch = () => {
      runDebounced('token-blacklist-search', async () => {
        await fetchTokens(1);
      });
    };

    const openAddTokenModal = () => {
      addForm.value = {
        jti: '',
        userId: '',
        reason: 'ADMIN_SECURITY_ACTION',
        expiresAt: ''
      };
      blacklistStore.addError = null;
      addTokenModal.open(null, 'add-token');
    };

    const closeAddTokenModal = () => {
      addTokenModal.close({ reset: true });
    };

    const submitAddToken = async () => {
      const success = await blacklistStore.addToken(addForm.value);
      if (success) {
        closeAddTokenModal();
      }
    };

    const confirmDeleteToken = (id) => {
      deletingId.value = id;
      deleteTokenModal.open(id, 'delete-token');
    };

    const closeDeleteTokenModal = () => {
      deleteTokenModal.close({ reset: true });
    };

    const executeDeleteToken = async () => {
      if (!deletingId.value) return;
      const success = await blacklistStore.removeToken(deletingId.value);
      
      if (success) {
        closeDeleteTokenModal();
        deletingId.value = null;
      }
    };

    onMounted(async () => {
      await ensureAuthenticated({ openModal: false });
    });

    watch(() => mainStore.mockApi, (newVal, oldVal) => {
      if (newVal !== oldVal && authStore.isAuthenticated && isSuperAdmin.value) {
        fetchTokens();
      }
    });

    watch(() => authStore.isAuthenticated, async (newVal) => {
      await handleAuthStateChange(newVal);
    });

    watch(searchQuery, (newVal) => {
      if (!newVal) {
        clearDebounce('token-blacklist-search');
      }
    });

    return {
      items,
      isLoading,
      errorMessage,
      searchQuery,
      pagination,
      showLoginRequired,
      isSuperAdmin,
      showAddModal,
      addForm,
      addError,
      isSubmitting,
      showDeleteModal,
      isDeleting,
      closeAddTokenModal,
      closeDeleteTokenModal,
      tf,
      
      fetchTokens,
      changePage,
      handleSearch,
      formatDate,
      openLoginModal,
      openAddTokenModal,
      submitAddToken,
      confirmDeleteToken,
      executeDeleteToken
    };
  }
}
</script>

<style scoped>
/* Scoped styles mainly handle the transition speeds and subtle effects */
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
