import config from './playwright.config.mjs';
export default {...config, testMatch:/teardown\.canary\.mjs/};
