import { onActivated, onMounted } from 'vue';

export function useEnsureAuthenticatedLifecycle(ensureAuthenticated, options = {}) {
  const {
    checkSessionFlag = true,
    openModal = true,
    onBeforeMount,
    onBeforeActivate,
    shouldEnsure,
    onSkipMount,
    onSkipActivate
  } = options;

  const run = async ({ before, skip }) => {
    if (typeof before === 'function') {
      await before();
    }

    if (typeof shouldEnsure === 'function') {
      const shouldRunEnsure = await shouldEnsure();
      if (!shouldRunEnsure) {
        if (typeof skip === 'function') {
          await skip();
        }
        return;
      }
    }

    await ensureAuthenticated({ checkSessionFlag, openModal });
  };

  onMounted(async () => {
    await run({ before: onBeforeMount, skip: onSkipMount });
  });

  onActivated(async () => {
    await run({ before: onBeforeActivate, skip: onSkipActivate });
  });
}
