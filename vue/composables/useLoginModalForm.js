import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient } from '/assets/js/api.js';
import { useAuthStore, readSessionPayload } from '/assets/js/stores/authStore.js';
import { hasFieldError, normalizeFieldErrors } from '/assets/js/api/loginFieldErrors.js';
const formFields = {
  email: '',
  password: '',
  remember: false
};

export function useLoginModalForm(emit) {
  const { t } = useI18n({ useScope: 'global' });
  const authStore = useAuthStore();
  const formData = reactive({ ...formFields });

  const isLoading = ref(false);
  const errorMessage = ref('');
  const fieldErrors = ref([]);

  // Each submit owns the form until it settles. A second submit invalidates the first, so a late
  // response from the older attempt cannot clear the newer one's errors, close the modal, or reset
  // the button while the newer request is still in the air (FR6-J).
  let attempt = 0;

  const clearErrors = () => {
    errorMessage.value = '';
    fieldErrors.value = [];
  };

  const resetForm = () => {
    Object.assign(formData, { ...formFields });
  };

  // The envelope is normalised on the way in, and the match itself lives in `loginFieldErrors`:
  // the template calls `hasFieldError` on every render, so it must not be able to throw on a
  // missing, blank or unexpected entry (review FA-03).
  const fieldHasError = (fieldName) => hasFieldError(fieldErrors.value, fieldName);

  const handleLogin = async () => {
    const mine = ++attempt;
    const stillMine = () => mine === attempt;

    clearErrors();
    // Even a refused submit supersedes any older response already queued for commit.
    const context = authStore.beginLoginAttempt();
    if (!authStore.checkLoginSupport().supported) {
      errorMessage.value = t('message.auth.login_browser_unsupported');
      isLoading.value = false;
      return;
    }
    isLoading.value = true;

    // Register the intent before the request leaves, and carry that context all the way to the
    // commit. A response that belongs to a superseded login is reported as such instead of being
    // presented as a successful sign-in (review OF-01).

    try {
      const response = await apiClient.post('/api/auth/login', {
        email: formData.email.trim(),
        password: formData.password,
        remember: formData.remember
      });

      if (response.data.success) {
        if (!stillMine() || !authStore.isCurrentContext(context)) {
          // Nothing is emitted: this response belongs to an attempt the form has already replaced,
          // so it must not close the modal, clear the fields or report a sign-in.
          if (stillMine()) {
            errorMessage.value = t('message.auth.login_superseded');
          }
          return;
        }

        // The commit happens here, and the modal waits for it. Closing on a successful HTTP response
        // is what let the UI report a sign-in that the session record never accepted; a superseded,
        // refused or unpersistable commit keeps the form open with a reason instead.
        const payload = readSessionPayload(response.data);

        if (!payload) {
          errorMessage.value = t('message.auth.login_failed');
          return;
        }

        const committed = await authStore.commitLogin(payload, context);

        if (!stillMine() || !authStore.isCurrentContext(context)) {
          // The commit landed, but this form no longer describes the intent that produced it. The
          // session store owns the truth from here; the modal only reports that its attempt is over.
          return;
        }

        if (committed.status !== 'applied') {
          // The form stays open with a reason. Closing here is what told the user the sign-in worked
          // when the session record never accepted it.
          errorMessage.value = t('message.auth.login_commit_failed');
          return;
        }

        resetForm();
        emit('login-success', response, context, committed);
        emit('close');
        return;
      }

      if (!stillMine()) {
        return;
      }

      errorMessage.value = response.data.error || t('message.auth.login_failed');
      fieldErrors.value = normalizeFieldErrors(response.data);
    } catch (error) {
      if (!stillMine()) {
        return;
      }

      if (error.response) {
        const responseData = error.response.data;
        errorMessage.value = responseData.error || t('message.auth.login_failed');
        fieldErrors.value = normalizeFieldErrors(responseData);
      } else if (error.request) {
        errorMessage.value = t('message.auth.login_network_error');
      } else {
        errorMessage.value = t('message.auth.login_unexpected_error');
      }
    } finally {
      if (stillMine()) {
        isLoading.value = false;
      }
    }
  };

  const handleClose = () => {
    if (isLoading.value) {
      return;
    }

    clearErrors();
    emit('close');
  };

  return {
    formData,
    isLoading,
    errorMessage,
    fieldErrors,
    hasFieldError: fieldHasError,
    handleLogin,
    handleClose
  };
}