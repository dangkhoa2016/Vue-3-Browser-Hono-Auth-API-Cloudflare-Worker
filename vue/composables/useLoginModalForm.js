import { reactive, ref } from 'vue';
import { apiClient } from '/assets/js/api.js';

export function useLoginModalForm(emit) {
  const formData = reactive({
    email: '',
    password: '',
    remember: false
  });

  const isLoading = ref(false);
  const errorMessage = ref('');
  const fieldErrors = ref([]);

  const clearErrors = () => {
    errorMessage.value = '';
    fieldErrors.value = [];
  };

  const resetForm = () => {
    formData.email = '';
    formData.password = '';
    formData.remember = false;
  };

  const hasFieldError = (fieldName) => {
    return fieldErrors.value.some((errorItem) => errorItem.field === fieldName);
  };

  const handleLogin = async () => {
    clearErrors();
    isLoading.value = true;

    try {
      const response = await apiClient.post('/api/auth/login', {
        email: formData.email.trim(),
        password: formData.password,
        remember: formData.remember
      });

      if (response.data.success) {
        emit('login-success', response.data);
        resetForm();
        emit('close');
        return;
      }

      errorMessage.value = response.data.error || 'Login failed';
      if (Array.isArray(response.data.errors)) {
        fieldErrors.value = response.data.errors;
      }
    } catch (error) {
      if (error.response) {
        const responseData = error.response.data;
        errorMessage.value = responseData.error || 'Login failed';
        if (Array.isArray(responseData.errors)) {
          fieldErrors.value = responseData.errors;
        }
      } else if (error.request) {
        errorMessage.value = 'Cannot connect to server. Please try again later.';
      } else {
        errorMessage.value = 'An unexpected error occurred. Please try again.';
      }
    } finally {
      isLoading.value = false;
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
    hasFieldError,
    handleLogin,
    handleClose
  };
}