import { ref } from 'vue';

export function useModalState(options = {}) {
  const {
    initialOpen = false,
    initialMode = 'default',
    initialValue = null,
    createInitialValue
  } = options;

  const isOpen = ref(initialOpen);
  const mode = ref(initialMode);
  const value = ref(initialValue);

  const resolveInitialValue = () => {
    if (typeof createInitialValue === 'function') {
      return createInitialValue();
    }
    return initialValue;
  };

  const open = (payload = resolveInitialValue(), nextMode = mode.value) => {
    mode.value = nextMode;
    value.value = payload;
    isOpen.value = true;
  };

  const close = ({ reset = false } = {}) => {
    isOpen.value = false;
    if (reset) {
      value.value = resolveInitialValue();
      mode.value = initialMode;
    }
  };

  const reset = () => {
    value.value = resolveInitialValue();
    mode.value = initialMode;
  };

  return {
    isOpen,
    mode,
    value,
    open,
    close,
    reset
  };
}
