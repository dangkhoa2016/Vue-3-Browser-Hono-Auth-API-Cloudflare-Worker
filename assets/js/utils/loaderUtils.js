export const formatItemLabel = (stageLabel, itemLabel) => stageLabel ? `${stageLabel}: ${itemLabel}` : itemLabel;

export const safeFetch = async ({ t, currentAction }, url, stageLabel) => {
  if (currentAction) {
    currentAction.value = t('message.loader.loading', { stage: stageLabel || '', item: url });
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const msg = res.status === 404 ? t('message.errors.not_found') : (res.statusText || t('message.errors.something_went_wrong'));
      throw new Error(msg);
    }
    return res;
  } catch (e) {
    throw new Error(t('message.errors.failed_to_load', { item: url, message: e.message }));
  }
};

export const safeImport = async ({ t, currentAction }, item, stageLabel) => {
  if (currentAction) {
    currentAction.value = t('message.loader.loading', { stage: stageLabel || '', item: item.label });
  }
  try {
    return await import(item.url);
  } catch (e) {
    let msg = e.message;
    try {
      const res = await fetch(item.url);
      if (!res.ok) {
        msg = res.status === 404 ? t('message.errors.not_found') : t('message.errors.something_went_wrong');
      }
    } catch (_) {
      msg = t('message.errors.network_error');
    }
    throw new Error(t('message.errors.failed_to_load', { item: item.url, message: msg }));
  }
};

export const loadStyle = ({ t, currentAction }, item, stageLabel) => {
  if (currentAction) {
    currentAction.value = t('message.loader.loading', { stage: stageLabel || '', item: item.label });
  }
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = item.url;
    link.onload = resolve;
    link.onerror = async () => {
      let msg = t('message.errors.network_error');
      try {
        const res = await fetch(item.url);
        if (!res.ok) {
          msg = res.status === 404 ? t('message.errors.not_found') : (res.statusText || t('message.errors.something_went_wrong'));
        }
      } catch (_) { }
      reject(new Error(t('message.errors.failed_to_load', { item: item.url, message: msg })));
    };
    document.head.appendChild(link);
  });
};

export const loadJs = async ({ t, currentAction }, item, stageLabel) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = item.url;
    if (item.crossOrigin) script.crossOrigin = item.crossOrigin;

    const errorHandler = (event) => {
      const isTargetScript = event.filename === item.url || (event.filename === '' && event.message === 'Script error.');
      if (isTargetScript) {
        cleanup();
        const errorMsg = event.message === 'Script error.' 
          ? t('message.errors.script_execution_failed', { message: 'Script error (CORS/Execution mismatch)' }) 
          : t('message.errors.script_execution_failed', { message: `${formatItemLabel(stageLabel, item.label)} -> ${event.message}` });
        reject(new Error(errorMsg));
      }
    };

    const cleanup = () => {
      window.removeEventListener('error', errorHandler);
      script.onload = null;
      script.onerror = null;
    };

    window.addEventListener('error', errorHandler);

    script.onload = () => {
      cleanup();
      resolve();
    };

    script.onerror = async () => {
      cleanup();
      const name = item.label || item.url;
      let msg = t('message.errors.network_error');
      try {
        const res = await fetch(item.url);
        if (!res.ok) {
          msg = res.status === 404 ? t('message.errors.not_found') : (res.statusText || t('message.errors.something_went_wrong'));
        }
      } catch (_) {
        console.log('Failed to fetch script for error details:', _);
      }
      reject(new Error(t('message.errors.failed_to_load', { item: name, message: msg })));
    };

    document.head.appendChild(script);
  });
};
