import { nextTick, reactive, ref, watch } from 'vue';
import { apiClient, API_ENDPOINTS } from '/assets/js/api.js';

export function useRegisterModalForm(props, emit, t) {
  const formData = reactive({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const isLoading = ref(false);
  const errorMessage = ref('');
  const fieldErrors = ref([]);
  const successMessage = ref('');
  const registrationStatus = ref('');

  const clearErrors = () => {
    errorMessage.value = '';
    fieldErrors.value = [];
  };

  const clearSuccess = () => {
    successMessage.value = '';
    registrationStatus.value = '';
  };

  const resetForm = () => {
    formData.fullName = '';
    formData.email = '';
    formData.password = '';
    formData.confirmPassword = '';
    formData.acceptTerms = false;
    clearErrors();
    clearSuccess();
  };

  watch(() => props.show, (newValue) => {
    if (newValue) {
      nextTick(() => {
        resetForm();
      });
    }
  });

  const hasFieldError = (fieldName) => {
    return fieldErrors.value.some((errorItem) => errorItem.field === fieldName);
  };

  const validatePasswords = () => {
    if (formData.password !== formData.confirmPassword) {
      errorMessage.value = t('message.auth.password_mismatch');
      fieldErrors.value = [
        { field: 'password', message: t('message.auth.password_mismatch_password_hint') },
        { field: 'confirmPassword', message: t('message.auth.password_mismatch_confirm_hint') }
      ];
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    clearErrors();
    clearSuccess();

    if (!validatePasswords()) {
      return;
    }

    isLoading.value = true;

    try {
      const response = await apiClient.post(API_ENDPOINTS.REGISTER, {
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      const data = response?.data || {};

      if (data.success) {
        const userData = data.data || {};
        registrationStatus.value = userData.status || '';
        successMessage.value = data.message || '';
        emit('register-success', data);
        return;
      }

      errorMessage.value = data.error || t('message.auth.registration_failed');
      if (Array.isArray(data.errors)) {
        fieldErrors.value = data.errors;
      }
    } catch (error) {
      const responseData = error?.response?.data;

      if (responseData) {
        errorMessage.value = responseData.error || t('message.auth.registration_failed');
        if (Array.isArray(responseData.errors)) {
          fieldErrors.value = responseData.errors;
        }
      } else if (error?.request) {
        errorMessage.value = t('message.auth.connection_error');
      } else {
        errorMessage.value = t('message.auth.unexpected_error');
      }
    } finally {
      isLoading.value = false;
    }
  };

  const handleGoToLogin = () => {
    emit('switch-to-login');
  };

  const handleClose = () => {
    if (!isLoading.value) {
      emit('close');
    }
  };

  return {
    formData,
    isLoading,
    errorMessage,
    fieldErrors,
    successMessage,
    registrationStatus,
    hasFieldError,
    handleRegister,
    handleGoToLogin,
    handleClose
  };
}