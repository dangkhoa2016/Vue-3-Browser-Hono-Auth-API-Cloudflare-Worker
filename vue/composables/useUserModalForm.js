import { ref, watch } from 'vue';

export function useUserModalForm(props, emit) {
  const getInitialState = () => ({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  });

  const formData = ref(getInitialState());

  const resetFormData = () => {
    if (props.mode === 'edit') {
      formData.value = {
        ...getInitialState(),
        ...props.initialData,
        password: ''
      };
      return;
    }

    formData.value = getInitialState();
  };

  watch(() => props.show, (newValue) => {
    if (newValue) {
      resetFormData();
    }
  });

  const handleSubmit = () => {
    emit('save', formData.value);
  };

  return {
    formData,
    handleSubmit
  };
}