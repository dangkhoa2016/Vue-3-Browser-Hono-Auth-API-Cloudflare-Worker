import { onBeforeUnmount } from 'vue';

export function useDebouncedFilters(defaultDelay = 300) {
  const timers = new Map();

  const runDebounced = (key, callback, delay = defaultDelay) => {
    const normalizedKey = String(key);
    const wait = Math.max(0, Number(delay) || defaultDelay);

    if (timers.has(normalizedKey)) {
      clearTimeout(timers.get(normalizedKey));
    }

    const timerId = setTimeout(async () => {
      timers.delete(normalizedKey);
      await callback();
    }, wait);

    timers.set(normalizedKey, timerId);
  };

  const clearDebounce = (key) => {
    const normalizedKey = String(key);
    const timerId = timers.get(normalizedKey);
    if (timerId) {
      clearTimeout(timerId);
      timers.delete(normalizedKey);
    }
  };

  const clearAllDebounce = () => {
    timers.forEach((timerId) => clearTimeout(timerId));
    timers.clear();
  };

  onBeforeUnmount(() => {
    clearAllDebounce();
  });

  return {
    runDebounced,
    clearDebounce,
    clearAllDebounce
  };
}
