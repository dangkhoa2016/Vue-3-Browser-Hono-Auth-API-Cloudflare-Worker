const { axios } = window;
const MockAdapter = window.AxiosMockAdapter;
import { i18n } from './i18n.js';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8788/',
  retry: 2,
  retryDelay: 1000,
});

apiClient.interceptors.response.use(undefined, async (err) => {
  const config = err.config;

  // If config does not exist or the retry option is not set, reject
  if (!config || !config.retry) {
    return Promise.reject(err);
  }

  // Set the variable for keeping track of the retry count
  config.__retryCount = config.__retryCount || 0;

  // Check if we've maxed out the total number of retries
  if (config.__retryCount >= config.retry) {
    // Reject with the error
    return Promise.reject(err);
  }

  // Increase the retry count
  config.__retryCount += 1;

  // Create new promise to handle delay
  const backoff = new Promise(function(resolve) {
    setTimeout(function() {
      resolve();
    }, config.retryDelay || 1000);
  });

  // Return the promise in which recalls axios to retry the request
  await backoff;
  return apiClient(config);
});

let mock;

const loadJson = async (path) => {
  const res = await fetch(path);
  if (!res.ok) {
    const t = i18n.global.t;
    throw new Error(t('message.errors.failed_to_load', { item: path, message: res.statusText || t('message.errors.unknown_error') }));
  }
  return await res.json();
};

export const setupMock = (enable) => {
  if (enable) {
    if (!mock) {
      console.log('Enabling Mock API');
      mock = new MockAdapter(apiClient, { delayResponse: 500 });

      // Profile
      mock.onGet(/\/profile($|\?)/).reply(async (config) => {
        const data = await loadJson('/assets/data/profile.json');
        return [200, data];
      });
    }
  } else {
    if (mock) {
      console.log('Disabling Mock API');
      mock.restore();
      mock = null;
    }
  }
};
