export function createAuthGateCallbacks(options = {}) {
  const {
    when,
    onAuthenticated,
    onModalSuccess
  } = options;

  const run = async (callback) => {
    if (typeof callback !== 'function') {
      return;
    }

    if (typeof when === 'function') {
      const shouldRun = await when();
      if (!shouldRun) {
        return;
      }
    }

    await callback();
  };

  const callbacks = {};

  if (typeof onAuthenticated === 'function') {
    callbacks.onAuthenticated = async () => {
      await run(onAuthenticated);
    };
  }

  if (typeof onModalSuccess === 'function') {
    callbacks.onModalSuccess = async () => {
      await run(onModalSuccess);
    };
  }

  return callbacks;
}
