const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';

/**
 * A response may only be applied if the operation that asked for it is still the one in charge.
 *
 * `isCurrent` is the caller's synchronous verdict — for the profile page, "this tab still owns the
 * session that issued the request" — and `operationId` says which request of this store it was. Both
 * are needed: the predicate catches a session that was replaced, the id catches a second request of
 * the same kind, and either one alone lets an older response overwrite a newer page.
 *
 * Caller and store counters have independent lifetimes. Check the caller guard separately from
 * the store operation: a reset or page remount must not require their numeric IDs to agree.
 */
const responseIsStillOurs = (guard) => {
  if (typeof guard?.isCurrent === 'function') {
    try {
      if (!guard.isCurrent()) return false;
    } catch (_error) {
      // A predicate that cannot answer is a refusal, not a permission.
      return false;
    }
  }

  if (guard?.operationId !== undefined && guard.operationId !== null) {
    return guard.operationId === guard.currentOperationId?.();
  }

  return true;
};

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null,
    loadingProfile: false,
    errorMessage: null,
    lastUpdated: null,
    // Monotonic per-kind operation ids. Not state the UI renders; they exist so a late response can
    // tell that a newer request of the same kind has already taken over.
    saveOperationId: 0,
    clearPendingEmailOperationId: 0,
    passwordOperationId: 0,
    fetchOperationId: 0
  }),

  actions: {
    resetProfile() {
      this.profile = null;
      this.loadingProfile = false;
      this.errorMessage = null;
      this.lastUpdated = null;
      // Invalidate every request in flight: the session they belonged to is gone, so their responses
      // must not repopulate the cache of the session that replaced it.
      this.saveOperationId += 1;
      this.clearPendingEmailOperationId += 1;
      this.passwordOperationId += 1;
      this.fetchOperationId += 1;
    },

    /** Starts an operation of `kind` and returns the id that response will have to match. */
    beginOperation(kind) {
      const field = `${kind}OperationId`;
      this[field] += 1;
      return this[field];
    },

    /** The id the newest operation of `kind` owns; a guard compares against this. */
    currentOperationIdOf(kind) {
      return this[`${kind}OperationId`] ?? 0;
    },

    async fetchProfile(token, guard = {}) {
      const operationId = this.beginOperation('fetch');
      const mine = { isCurrent: () => responseIsStillOurs(guard), operationId, currentOperationId: () => this.fetchOperationId };
      this.loadingProfile = true;
      this.errorMessage = null;

      try {
        const response = await apiClient.get(API_ENDPOINTS.PROFILE, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response?.data?.success) {
          return {
            success: false,
            error: response?.data?.error || response?.data?.message || 'Failed to load profile'
          };
        }

        if (!responseIsStillOurs(mine)) {
          return { success: false, stale: true, reason: 'superseded-request', data: this.profile };
        }

        this.profile = response.data.data || null;
        this.lastUpdated = new Date().toISOString();

        return {
          success: true,
          data: this.profile,
          message: response?.data?.message || ''
        };
      } catch (error) {
        if (!responseIsStillOurs(mine)) {
          return { success: false, stale: true, reason: 'superseded-request' };
        }

        this.errorMessage = error?.response?.data?.error || error?.message || 'Failed to load profile';
        return {
          success: false,
          error: this.errorMessage,
          responseStatus: error?.response?.status,
          responseData: error?.response?.data
        };
      } finally {
        // Only the request that still owns the flag may clear it. A newer request is loading, and
        // clearing here would report "not loading" while its request is still in the air.
        if (mine.operationId === this.fetchOperationId) {
          this.loadingProfile = false;
        }
      }
    },

    async saveProfile(token, payload, guard = {}) {
      const operationId = this.beginOperation('save');
      const mine = { isCurrent: () => responseIsStillOurs(guard), operationId, currentOperationId: () => this.saveOperationId };
      const response = await apiClient.put(API_ENDPOINTS.PROFILE, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!responseIsStillOurs(mine)) {
        // The server did save it, but this response belongs to a request the page has since
        // replaced. Reporting success would show the new session a change the new session never made;
        // reporting failure would show the user an error for an operation that did happen. The caller
        // gets the fact and decides, which is why this is a distinct shape.
        return {
          success: false,
          stale: true,
          reason: 'superseded-request',
          serverSaved: Boolean(response?.data?.success)
        };
      }

      if (!response?.data?.success) {
        return {
          success: false,
          error: response?.data?.error || response?.data?.message || 'Failed to update profile'
        };
      }

      const updatedProfile = response.data.data || {};
      const currentProfile = this.profile || {};

      this.profile = {
        ...currentProfile,
        ...updatedProfile,
        full_name: updatedProfile.full_name || payload.full_name || currentProfile.full_name,
        email: updatedProfile.email || currentProfile.email,
        new_email: Object.prototype.hasOwnProperty.call(updatedProfile, 'new_email') ? updatedProfile.new_email : currentProfile.new_email
      };
      this.lastUpdated = new Date().toISOString();

      return {
        success: true,
        data: this.profile,
        message: response?.data?.message || ''
      };
    },

    async clearPendingEmail(token, guard = {}) {
      const operationId = this.beginOperation('clearPendingEmail');
      const mine = { isCurrent: () => responseIsStillOurs(guard), operationId, currentOperationId: () => this.clearPendingEmailOperationId };
      const response = await apiClient.delete(API_ENDPOINTS.CLEAR_PENDING_EMAIL, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!responseIsStillOurs(mine)) {
        return {
          success: false,
          stale: true,
          reason: 'superseded-request',
          serverSaved: Boolean(response?.data?.success)
        };
      }

      if (!response?.data?.success) {
        return {
          success: false,
          error: response?.data?.error || response?.data?.message || 'Failed to clear pending email'
        };
      }

      const updatedProfile = response.data.data || {};
      const currentProfile = this.profile || {};

      this.profile = {
        ...currentProfile,
        ...updatedProfile,
        new_email: Object.prototype.hasOwnProperty.call(updatedProfile, 'new_email') ? updatedProfile.new_email : null,
        emailVerificationPending: false
      };
      this.lastUpdated = new Date().toISOString();

      return {
        success: true,
        data: this.profile,
        message: response?.data?.message || ''
      };
    },

    async changePassword(token, payload, guard = {}) {
      const operationId = this.beginOperation('password');
      const mine = { isCurrent: () => responseIsStillOurs(guard), operationId, currentOperationId: () => this.passwordOperationId };
      const response = await apiClient.put(API_ENDPOINTS.CHANGE_PASSWORD, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!responseIsStillOurs(mine)) {
        return { success: false, stale: true, reason: 'superseded-request', serverSaved: Boolean(response?.data?.success) };
      }

      if (!response?.data?.success) {
        return {
          success: false,
          error: response?.data?.error || response?.data?.message || 'Failed to change password'
        };
      }

      return {
        success: true,
        data: response?.data?.data || null,
        message: response?.data?.message || ''
      };
    }
  }
});
