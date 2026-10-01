/**
 * Regression tests for F05: UI adaptation to backend capabilities and error codes.
 *
 * The invariant under test: the UI never claims a capability or a success the backend did not
 * confirm at a published contract position. A legacy backend, a missing capability map and an
 * explicit `false` all resolve to the conservative "unsupported" state.
 *
 * Fixtures: fake tokens and loopback origins only. No production API, no secrets.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  REPO_ROOT,
  createBrowserEnv,
  createFakeAxios,
  createPiniaStub,
  createRecordingConsole,
  createTransport,
  loadModule,
  ok,
  fail,
} from './helpers/browser-env.mjs';

/** Pure contract helpers, loaded once: they hold no session or transport state. */
const appContractHelpers = loadModule(
  'assets/js/api/backendContract.js',
  createBrowserEnv({ console: createRecordingConsole() })
);

const readRepoFile = (relativePath) => readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');

/**
 * A 2xx body exactly as given. `ok()` wraps its payload in the success envelope, which is not
 * usable for the semantic-success tests: those need to control the top-level `success` field.
 */
const raw = (data, status = 200) => ({ status, data });

const FAKE_SECRET = 'sk_live_DO_NOT_DISPLAY_0123456789';
const FAKE_MASKED = 'sk_live_****6789';

function loadContract(env) {
  return loadModule('assets/js/api/backendContract.js', env);
}

function bootHttpClient(env, routes) {
  env.window.axios = createFakeAxios();
  const endpoints = loadModule('assets/js/api/endpoints.js', env);
  const identity = loadModule('assets/js/api/apiIdentity.js', env);
  const httpModule = loadModule('assets/js/api/httpClient.js', env, {
    i18n: { mode: 'legacy', global: { locale: 'en', t: (key, fallback) => (fallback === undefined ? key : fallback) } },
    getAuthStore: () => null,
    API_ENDPOINTS: endpoints.API_ENDPOINTS,
    API_CONFIG: endpoints.API_CONFIG,
    HTTP_STATUS: endpoints.HTTP_STATUS,
    axios: env.window.axios,
    ...identity,
  });
  httpModule.apiClient.__state.transport = createTransport(routes);
  return { httpModule, endpoints, identity, transport: httpModule.apiClient.__state.transport };
}

function bootAuditStore({ routes = {} } = {}) {
  const env = createBrowserEnv({ console: createRecordingConsole() });
  const contract = loadContract(env);
  const { httpModule, endpoints, transport, identity } = bootHttpClient(env, routes);

  const pinia = createPiniaStub();
  const protectedState = loadModule('assets/js/api/protectedState.js', env);
  loadModule('assets/js/stores/advancedAuditStore.js', { ...env, Pinia: pinia }, {
    apiClient: httpModule.apiClient,
    API_ENDPOINTS: endpoints.API_ENDPOINTS,
    ...identity,
    ...protectedState,
    ...contract,
  });

  return {
    env,
    store: pinia.defineStore.createStoreInstance('advancedAudit'),
    contract,
    identity,
    transport,
    protectedState
  };
}

function bootMonitoringStore({ routes = {} } = {}) {
  const env = createBrowserEnv({ console: createRecordingConsole() });
  const contract = loadContract(env);
  const toasts = [];
  const { httpModule, endpoints, transport } = bootHttpClient(env, routes);

  const pinia = createPiniaStub();
  loadModule('assets/js/stores/realtimeMonitoringStore.js', { ...env, Pinia: pinia }, {
    apiClient: httpModule.apiClient,
    API_ENDPOINTS: endpoints.API_ENDPOINTS,
    buildRealtimeMonitoringThreatResolveEndpoint: (id) => `/api/realtime-monitoring/threats/${id}/resolve`,
    buildRealtimeMonitoringAlertRuleToggleEndpoint: (id) => `/api/realtime-monitoring/alert-rules/${id}/toggle`,
    DEFAULT_ADMIN_PAGE_SIZE: 25,
    resolveAdminPageSize: (value) => Number(value) || 25,
    getToastStore: () => ({ success: (...a) => toasts.push(a), error: (...a) => toasts.push(a), warning: (...a) => toasts.push(a) }),
    i18n: { global: { t: (key, fallback) => (fallback === undefined ? key : fallback) } },
    useMainStore: () => ({ adminPageSize: 25 }),
    ...contract,
  });

  return { env, store: pinia.defineStore.createStoreInstance('realtimeMonitoring'), contract, transport, toasts };
}

function bootEnvComparisonStore({ routes = {} } = {}) {
  const env = createBrowserEnv({ console: createRecordingConsole() });
  const contract = loadContract(env);
  const { httpModule, transport } = bootHttpClient(env, routes);

  const pinia = createPiniaStub();
  loadModule('assets/js/stores/kvAdminEnvComparisonStore.js', { ...env, Pinia: pinia }, {
    apiClient: httpModule.apiClient,
    ...contract,
  });

  return { env, store: pinia.defineStore.createStoreInstance('kvAdminEnvComparison'), contract, transport };
}

function bootEnvComparisonPage(store) {
  const env = createBrowserEnv({ console: createRecordingConsole() });
  const authStore = { user: { role: 'super_admin' }, token: 'FAKE_ACCESS', isAuthenticated: true, logout() {} };
  const toasts = [];
  const composable = (value) => ({ value });
  const storeToRefs = (source) => Object.keys(source).reduce((refs, key) => {
    refs[key] = composable(source[key]);
    return refs;
  }, {});

  const { useKvAdminEnvComparisonPage } = loadModule('vue/composables/useKvAdminEnvComparisonPage.js', env, {
    computed: (getter) => ({ get value() { return getter(); } }),
    ref: composable,
    watch: () => {},
    Pinia: { storeToRefs },
    useAuthStore: () => authStore,
    useModalStore: () => ({}),
    useToastStore: () => ({ add: (...a) => toasts.push(a) }),
    useMainStore: () => ({}),
    useKvAdminEnvComparisonStore: () => store,
    useAuthGate: () => ({
      showLoginRequired: { value: false },
      openLoginModal: () => {},
      ensureAuthenticated: async () => {},
      handleAuthStateChange: () => {},
      markUnauthenticated: () => {},
    }),
    createAuthGateCallbacks: () => ({}),
    useAuthStateChangeWatcher: () => {},
    useEnsureAuthenticatedLifecycle: () => {},
    useI18nFallback: () => ({ t: (key, fallback) => (fallback === undefined ? key : fallback), tf: (key, fallback) => (fallback === undefined ? key : fallback) }),
    useMockApiChangeWatcher: () => {},
  });

  return useKvAdminEnvComparisonPage();
}

const plain = (value) => JSON.parse(JSON.stringify(value));

const deepScan = (value, needle, path = 'state') => {
  if (typeof value === 'string') {
    assert.ok(!value.includes(needle), `${path} must not contain a raw secret`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => deepScan(item, needle, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) deepScan(item, needle, `${path}.${key}`);
  }
};

describe('F05 — contract adapter reads published fields only', () => {
  test('a capability is supported only when explicitly true', () => {
    const { readCapability, isCapabilitySupported, CAPABILITY_KEYS } = loadContract(createBrowserEnv());

    assert.equal(readCapability({ continuousMonitoring: true }, CAPABILITY_KEYS.CONTINUOUS_MONITORING), true);
    assert.equal(readCapability({ continuousMonitoring: false }, CAPABILITY_KEYS.CONTINUOUS_MONITORING), false);
    assert.equal(readCapability({}, CAPABILITY_KEYS.CONTINUOUS_MONITORING), null, 'missing capability is unknown');
    assert.equal(readCapability(null, CAPABILITY_KEYS.CONTINUOUS_MONITORING), null);
    assert.equal(readCapability({ continuousMonitoring: 'yes' }, CAPABILITY_KEYS.CONTINUOUS_MONITORING), null, 'non-boolean is unknown');
    assert.equal(isCapabilitySupported({ continuousMonitoring: false }, CAPABILITY_KEYS.CONTINUOUS_MONITORING), false);
    assert.equal(isCapabilitySupported(null, CAPABILITY_KEYS.CONTINUOUS_MONITORING), false);
  });

  test('capability map is found at the published envelope positions and merged forward only', () => {
    const { readCapabilityMap, mergeCapabilityMap } = loadContract(createBrowserEnv());

    assert.deepEqual(plain(readCapabilityMap({ capabilities: { exportPdf: true } })), { exportPdf: true });
    assert.deepEqual(plain(readCapabilityMap({ data: { capabilities: { exportCsv: true } } })), { exportCsv: true });
    assert.equal(readCapabilityMap({ data: { something: 1 } }), null);
    assert.deepEqual(plain(mergeCapabilityMap({ exportPdf: true }, { data: { capabilities: { exportCsv: true } } })), { exportPdf: true, exportCsv: true });
    assert.equal(mergeCapabilityMap(null, { data: {} }), null, 'a response without capabilities cannot invent one');
  });

  test('error codes are read from machine fields, never from a localized message', () => {
    const { readErrorCode, isUnsupportedError } = loadContract(createBrowserEnv());

    assert.equal(readErrorCode({ response: { data: { error: { code: 'UNSUPPORTED_EXPORT_OPTION', message: 'PDF export unavailable' } } } }), 'UNSUPPORTED_EXPORT_OPTION');
    assert.equal(readErrorCode({ response: { data: { data: { code: 'DB_UNAVAILABLE' } } } }), 'DB_UNAVAILABLE');
    assert.equal(readErrorCode({ response: { data: { error: 'Không hỗ trợ PDF' } } }), null, 'a message alone yields no code');
    assert.equal(isUnsupportedError({ response: { status: 422, data: { error: { code: 'UNSUPPORTED_MONITORING_MODE' } } } }), true);
    assert.equal(isUnsupportedError({ response: { status: 422, data: { error: 'anything' } } }), true, '422 is an unsupported option by contract');
    assert.equal(isUnsupportedError({ response: { status: 500, data: { error: { code: 'DB_UNAVAILABLE' } } } }), false);
  });
});

describe('F05 — advanced audit export never claims an unverified capability', () => {
  test('PDF export is refused locally when the backend publishes no capability', async () => {
    const app = bootAuditStore();

    await assert.rejects(
      () => app.store.exportAdvanced({ format: 'pdf', type: 'compliance' }),
      (error) => error.isUnsupported === true && error.code === 'UNSUPPORTED_EXPORT_OPTION'
    );

    assert.equal(app.transport.calls.length, 0, 'an unverified option must not reach the network');
    assert.equal(app.store.exportUnsupportedCode, 'UNSUPPORTED_EXPORT_OPTION');
    assert.equal(app.store.isPdfExportSupported, false);
  });

  test('PDF export is allowed only when the backend explicitly confirms the capability', async () => {
    const app = bootAuditStore({ routes: { 'post /api/advanced-audit/export-advanced': ok({ jobId: 'job-1' }) } });

    app.store.captureCapabilities({ data: { capabilities: { exportPdf: true } } });
    assert.equal(app.store.isPdfExportSupported, true);

    const result = await app.store.exportAdvanced({ format: 'pdf', type: 'compliance' });
    assert.deepEqual(result.data, { jobId: 'job-1' });
    assert.equal(app.transport.calls.length, 1);
  });

  test('a 422 UNSUPPORTED_EXPORT_OPTION response is an error, never a download success', async () => {
    const app = bootAuditStore({
      routes: {
        'post /api/advanced-audit/export-advanced': fail(422, 'UNSUPPORTED_EXPORT_OPTION', 'PDF export is not available'),
      },
    });

    app.store.captureCapabilities({ capabilities: { exportPdf: true } });

    await assert.rejects(
      () => app.store.exportAdvanced({ format: 'pdf', type: 'compliance' }),
      (error) => error.isUnsupported === true && error.code === 'UNSUPPORTED_EXPORT_OPTION'
    );
    assert.equal(app.store.exportUnsupportedCode, 'UNSUPPORTED_EXPORT_OPTION');
    assert.equal(app.store.loading, false, 'a rejected export must not stay in a loading state');
  });

  test('verified JSON/CSV exports keep working without a capability map, and stop when denied', async () => {
    const app = bootAuditStore({ routes: { 'post /api/advanced-audit/export-advanced': ok({ jobId: 'job-2' }) } });

    await app.store.exportAdvanced({ format: 'csv', type: 'behavior' });
    assert.equal(app.transport.calls.length, 1, 'CSV is a verified format');

    app.store.captureCapabilities({ capabilities: { exportCsv: false } });
    await assert.rejects(() => app.store.exportAdvanced({ format: 'csv' }), (error) => error.isUnsupported === true);
    assert.equal(app.transport.calls.length, 1, 'a denied format must not add a request');
  });

  test('encryption and compression options are refused unless the backend publishes them', async () => {
    const app = bootAuditStore({ routes: { 'post /api/advanced-audit/export-advanced': ok({ jobId: 'job-3' }) } });
    app.store.captureCapabilities({ capabilities: { exportJson: true } });

    await assert.rejects(
      () => app.store.exportAdvanced({ format: 'json', encrypted: true }),
      (error) => error.isUnsupported === true && error.capability === 'exportEncryption'
    );
    assert.equal(app.transport.calls.length, 0);

    app.store.captureCapabilities({ capabilities: { exportEncryption: true, exportCompression: true } });
    await app.store.exportAdvanced({ format: 'json', encrypted: true, compressed: true });
    assert.equal(app.transport.calls.length, 1, 'published options are allowed');
  });
});

describe('F05 — continuous monitoring follows the backend, never an optimistic flag', () => {
  test('start is blocked without a published capability and no request is sent', async () => {
    const app = bootMonitoringStore();

    await assert.rejects(
      () => app.store.startMonitoring(5000, true),
      (error) => error.isUnsupported === true && error.code === 'UNSUPPORTED_MONITORING_MODE'
    );
    assert.equal(app.transport.calls.length, 0);
    assert.equal(app.store.isContinuousMonitoringSupported, false);
    assert.equal(app.store.isMonitoringActive, false);
  });

  test('an explicit false capability is reported as confirmed-but-disabled', async () => {
    const app = bootMonitoringStore();
    app.store.captureCapabilities({ data: { capabilities: { continuousMonitoring: false } } });

    assert.equal(app.store.isContinuousMonitoringConfirmed, true);
    assert.equal(app.store.isContinuousMonitoringSupported, false);

    await assert.rejects(() => app.store.startMonitoring(5000, true), (error) => error.isUnsupported === true);
    assert.equal(app.transport.calls.length, 0);
  });

  test('a start response without an explicit active flag must not claim active monitoring', async () => {
    const app = bootMonitoringStore({
      routes: { 'post /api/realtime-monitoring/monitoring/start': ok({ startedAt: '2026-09-26T00:00:00.000Z' }) },
    });
    app.store.captureCapabilities({ capabilities: { continuousMonitoring: true } });

    await app.store.startMonitoring(5000, true);

    assert.equal(app.transport.calls.length, 1);
    assert.equal(app.store.isMonitoringActive, false, 'no server-confirmed active flag means not active');
  });

  test('422 UNSUPPORTED_MONITORING_MODE never becomes an active monitoring state', async () => {
    const app = bootMonitoringStore({
      routes: {
        'post /api/realtime-monitoring/monitoring/start': fail(422, 'UNSUPPORTED_MONITORING_MODE', 'continuous mode is unavailable'),
      },
    });
    app.store.captureCapabilities({ capabilities: { continuousMonitoring: true } });

    const result = await app.store.startMonitoring(5000, true);

    assert.equal(result, null);
    assert.equal(app.store.isMonitoringActive, false);
    assert.equal(app.store.monitoringUnsupportedCode, 'UNSUPPORTED_MONITORING_MODE');
  });

  test('status polling after start/stop keeps the active flag server-owned', async () => {
    const app = bootMonitoringStore({
      routes: {
        'get /api/realtime-monitoring/monitoring/status': ok({ isActive: false }),
        'post /api/realtime-monitoring/monitoring/start': ok({ isActive: true }),
        'post /api/realtime-monitoring/monitoring/stop': ok({ isActive: false }),
      },
    });

    await app.store.fetchMonitoringStatus();
    assert.equal(app.store.isMonitoringActive, false);

    app.store.captureCapabilities({ capabilities: { continuousMonitoring: true } });
    await app.store.startMonitoring(5000, true);
    assert.equal(app.store.isMonitoringActive, true, 'a confirmed active flag is shown');

    await app.store.stopMonitoring();
    assert.equal(app.store.isMonitoringActive, false);

    await app.store.fetchMonitoringStatus();
    assert.equal(app.store.isMonitoringActive, false, 'a later status poll must win over local optimism');
  });

  test('capabilities published on the status payload unlock the start control', async () => {
    const app = bootMonitoringStore({
      routes: {
        'get /api/realtime-monitoring/monitoring/status': ok({ isActive: false, capabilities: { continuousMonitoring: true } }),
        'post /api/realtime-monitoring/monitoring/start': ok({ isActive: true }),
      },
    });

    await app.store.fetchMonitoringStatus();
    assert.equal(app.store.isContinuousMonitoringSupported, true);

    await app.store.startMonitoring(5000, true);
    assert.equal(app.store.isMonitoringActive, true);
  });
});

describe('F05 — a failure envelope is never downloaded as a successful file', () => {
  const withDocument = (app) => {
    const created = [];
    app.env.document.createElement = () => {
      const element = { click() { created.push('click'); }, remove() {}, href: '', download: '' };
      return element;
    };
    app.env.document.body.appendChild = () => created.push('attach');
    app.env.document.body.removeChild = () => created.push('detach');
    app.env.window.URL = { createObjectURL: () => { created.push('blob'); return 'blob:fixture'; }, revokeObjectURL: () => {} };
    return created;
  };

  test('a 200 response carrying an error envelope writes no file', async () => {
    const app = bootMonitoringStore({
      routes: {
        'post /api/realtime-monitoring/dashboard/export': ok({ error: { code: 'UNSUPPORTED_EXPORT_OPTION', message: 'CSV export unavailable' } }),
      },
    });
    const events = withDocument(app);

    const result = await app.store.exportDashboard({ format: 'csv' });

    assert.equal(result, null);
    assert.ok(!events.includes('click'), 'an error body must not be saved as a file');
    assert.equal(app.store.exportUnsupportedCode, 'UNSUPPORTED_EXPORT_OPTION');
    assert.ok(app.store.error, 'the failure envelope must surface as an error state');
  });

  test('an empty result is reported as an error, not downloaded as an empty export', async () => {
    const app = bootMonitoringStore({
      routes: {
        'post /api/realtime-monitoring/dashboard/export': ok({}),
      },
    });
    const events = withDocument(app);

    const result = await app.store.exportDashboard({ format: 'json' });

    assert.equal(result, null);
    assert.ok(!events.includes('click'), 'an empty result must not be downloaded');
    assert.ok(app.store.error, 'an empty export must surface an error state');
  });

  test('a real export body still produces a file', async () => {
    const app = bootMonitoringStore({
      routes: {
        'post /api/realtime-monitoring/dashboard/export': ok({ data: { events: [{ id: 1 }] }, meta: { filename: 'export.json' } }),
      },
    });
    const events = withDocument(app);

    const result = await app.store.exportDashboard({ format: 'json' });

    assert.ok(events.includes('click'), 'a verified export body is still downloaded');
    assert.ok(events.includes('blob'));
    assert.ok(result);
  });
});

describe('F05 — env comparison never discloses raw secret values', () => {
  test('a legacy response with raw values is sanitized before it reaches the UI state', async () => {
    const app = bootEnvComparisonStore({
      routes: {
        'get /api/kv-admin/configs/env-comparison': ok({
          comparison: {
            EMAIL_PROVIDER_API_KEY: { env: null, kv: FAKE_SECRET, default: null, source: 'kv' },
            JWT_SECRET: { env: FAKE_SECRET, kv: null, default: null, source: 'env' },
            APP_MODE: { env: null, kv: 'production', default: 'production', source: 'kv' },
          },
          summary: { total: 3, fromKV: 2, fromEnv: 1, fromDefault: 0 },
        }),
      },
    });

    await app.store.fetchComparison('FAKE_ACCESS');

    deepScan(app.store.comparison, FAKE_SECRET);
    assert.equal(app.store.comparison.EMAIL_PROVIDER_API_KEY.kv.configured, true);
    assert.equal(app.store.comparison.EMAIL_PROVIDER_API_KEY.kv.masked, null, 'a raw value is not re-published as masked text');
    assert.equal(app.store.comparison.EMAIL_PROVIDER_API_KEY.source, 'kv');
    assert.equal(app.store.comparison.JWT_SECRET.env.configured, true);
    assert.equal(app.store.summary.total, 3);
  });

  test('a real masked value survives; a "masked" field carrying a raw value is dropped', async () => {
    const app = bootEnvComparisonStore({
      routes: {
        'get /api/kv-admin/configs/env-comparison': ok({
          comparison: {
            SMTP_PASSWORD: { env: null, kv: { configured: true, masked: FAKE_MASKED, value: FAKE_SECRET }, source: 'kv' },
            STRIPE_KEY: { env: null, kv: { configured: true, masked: FAKE_SECRET }, source: 'kv' },
            OPTIONAL_KEY: { env: null, kv: { configured: false, masked: null }, source: 'default' },
          },
        }),
      },
    });

    await app.store.fetchComparison('FAKE_ACCESS');
    deepScan(app.store.comparison, FAKE_SECRET);

    assert.equal(app.store.comparison.SMTP_PASSWORD.kv.masked, FAKE_MASKED);
    assert.equal(app.store.comparison.STRIPE_KEY.kv.masked, null);
    assert.equal(app.store.comparison.STRIPE_KEY.kv.configured, true);
    assert.equal(app.store.comparison.OPTIONAL_KEY.kv.configured, false);
    assert.equal(app.store.summary.total, 3, 'the summary is derived from sanitized entries when the backend omits it');
  });

  test('the page renders configured/masked states only, and masked text is not editable input', async () => {
    const app = bootEnvComparisonStore({
      routes: {
        'get /api/kv-admin/configs/env-comparison': ok({
          comparison: {
            SMTP_PASSWORD: { env: null, kv: { configured: true, masked: FAKE_MASKED, value: FAKE_SECRET }, source: 'kv' },
            STRIPE_KEY: { env: null, kv: { configured: true, masked: FAKE_SECRET }, source: 'kv' },
            EMPTY_KEY: { env: null, kv: '', source: 'kv' },
            ABSENT_KEY: { env: null, kv: null, source: 'default' },
          },
        }),
      },
    });

    await app.store.fetchComparison('FAKE_ACCESS');
    const page = bootEnvComparisonPage(app.store);

    const rendered = [
      page.formatValue(app.store.comparison.SMTP_PASSWORD.kv),
      page.formatValue(app.store.comparison.STRIPE_KEY.kv),
      page.formatValue(app.store.comparison.EMPTY_KEY.kv),
      page.formatValue(app.store.comparison.ABSENT_KEY.kv),
    ].join(' | ');

    assert.ok(!rendered.includes(FAKE_SECRET), 'no raw secret may reach the rendered text');
    assert.ok(rendered.includes(FAKE_MASKED), 'a genuine mask stays visible');
    assert.ok(rendered.includes('Configured'), 'a configured value without a mask is reported as configured');

    const pageSource = (await import('node:fs')).readFileSync(
      new URL('../../vue/pages/KvAdminEnvComparison.vue', import.meta.url),
      'utf8'
    );
    assert.equal(/v-model="comparison\[/.test(pageSource), false, 'masked text must not be bound to an editable input');
    assert.equal(/value="comparison\[/.test(pageSource), false);
  });
});

describe('OF-07 — export options reach the backend under the names it reads', () => {
  test('an alias the UI still sends is verified, then transmitted as the canonical key', async () => {
    const app = bootAuditStore({ routes: { 'post /api/advanced-audit/export-advanced': ok({ jobId: 'job-1' }) } });
    app.store.captureCapabilities({ capabilities: { exportJson: true, exportEncryption: true, exportCompression: true } });

    await app.store.exportAdvanced({ format: 'json', encrypted: true, compressed: true });

    const call = app.transport.calls.at(-1);
    assert.equal(call.config.data.encrypt, true, 'the backend reads `encrypt`');
    assert.equal(call.config.data.compress, true, 'the backend reads `compress`');
    assert.equal('encrypted' in call.config.data, false, 'the unreadable alias must not reach the wire');
    assert.equal('compressed' in call.config.data, false);
  });

  test('an option with no published capability is still refused under the alias spelling', async () => {
    const app = bootAuditStore({ routes: { 'post /api/advanced-audit/export-advanced': ok({ jobId: 'job-1' }) } });
    app.store.captureCapabilities({ capabilities: { exportJson: true } });

    await assert.rejects(
      () => app.store.exportAdvanced({ format: 'json', encrypted: true }),
      (error) => error.isUnsupported === true && error.capability === 'exportEncryption'
    );
    assert.equal(app.transport.calls.length, 0, 'nothing is sent for an unverified option');
  });

  test('the canonical spelling is accepted directly', async () => {
    const app = bootAuditStore({ routes: { 'post /api/advanced-audit/export-advanced': ok({ jobId: 'job-2' }) } });
    app.store.captureCapabilities({ capabilities: { exportJson: true, exportEncryption: true } });

    await app.store.exportAdvanced({ format: 'json', encrypt: true });
    assert.equal(app.transport.calls.at(-1).config.data.encrypt, true);
  });
});

describe('OF-08 — a capability answer belongs to the context it was fetched for', () => {
  test('a session change discards the cached capability map', async () => {
    const app = bootAuditStore({ routes: {} });
    app.store.captureCapabilities({ capabilities: { exportJson: true, exportPdf: true } });
    assert.equal(app.store.isPdfExportSupported, true);
    assert.equal(app.store.capabilitiesAreCurrent, true);

    // A new login ends the previous session, which drops every protected cache of that session.
    app.protectedState.resetProtectedState('test:new-login');
    app.identity.setSessionId('another-login-session');

    assert.equal(app.store.isExportCapabilityKnown, false, 'a previous session answer is never inherited');
    assert.equal(app.store.capabilitiesAreCurrent, false);
    assert.equal(app.store.isPdfExportSupported, false);
    assert.equal(app.store.analytics, null);
  });

  test('an API identity change discards the cached capability map', async () => {
    const app = bootAuditStore({ routes: {} });
    app.store.captureCapabilities({ capabilities: { exportJson: true } });
    assert.equal(app.store.isExportCapabilityKnown, true);

    app.protectedState.resetProtectedState('test:api-change');
    app.identity.setApiIdentity('http://127.0.0.1:19999/other-api');

    assert.equal(app.store.isExportCapabilityKnown, false);
    assert.equal(app.store.isPdfExportSupported, false);
  });

  test('the scope key separates identity, session and contract revision', () => {
    const { buildCapabilityContextKey, isCapabilityContextCurrent, readContractRevision } = appContractHelpers;

    assert.notEqual(
      buildCapabilityContextKey({ identity: 'http://a', sessionId: 's1' }),
      buildCapabilityContextKey({ identity: 'http://b', sessionId: 's1' })
    );
    assert.notEqual(
      buildCapabilityContextKey({ identity: 'http://a', sessionId: 's1' }),
      buildCapabilityContextKey({ identity: 'http://a', sessionId: 's2' })
    );
    assert.equal(
      isCapabilityContextCurrent('http://a|s1', buildCapabilityContextKey({ identity: 'http://a', sessionId: 's1' })),
      true
    );
    assert.equal(isCapabilityContextCurrent(null, 'http://a|s1'), false, 'an unknown scope is never "current"');

    assert.equal(readContractRevision({ contractRevision: ' 2026-09-26 ' }), '2026-09-26');
    assert.equal(readContractRevision({ data: { contract_revision: 7 } }), '7');
    assert.equal(readContractRevision({ capabilities: {} }), null);
  });
});

describe('OF-05 — a 2xx is not a success', () => {
  test('export reports a semantic failure instead of a completed download', async () => {
    const app = bootAuditStore({
      routes: { 'post /api/advanced-audit/export-advanced': raw({ success: false, error: 'export job rejected' }) }
    });
    app.store.captureCapabilities({ capabilities: { exportJson: true } });

    await assert.rejects(
      () => app.store.exportAdvanced({ format: 'json' }),
      (error) => error.semanticFailure === true && /rejected/.test(error.message)
    );
  });

  test('archival run and manual archive refuse a 200 that reports failure', async () => {
    const app = bootAuditStore({
      routes: {
        'post /api/advanced-audit/archival/run': raw({ success: false, error: 'nothing to archive' }),
        'post /api/advanced-audit/archive': raw({ success: false, error: 'retention window rejected' })
      }
    });

    await assert.rejects(() => app.store.runArchival({}), (error) => error.semanticFailure === true);
    await assert.rejects(() => app.store.manualArchive({}), (error) => error.semanticFailure === true);
  });

  test('a genuine success is still reported as success', async () => {
    const app = bootAuditStore({ routes: { 'post /api/advanced-audit/archival/run': raw({ success: true, jobId: 'j1' }) } });

    const result = await app.store.runArchival({});
    assert.equal(result.jobId, 'j1');
  });

  test('a payload without a `success` field keeps the status-based behaviour', async () => {
    const app = bootAuditStore({ routes: { 'post /api/advanced-audit/archival/run': raw({ jobId: 'j2' }) } });

    const result = await app.store.runArchival({});
    assert.equal(result.jobId, 'j2', 'a backend that does not publish `success` is not forced to fail');
  });
});

describe('OF-09 — a masked secret is never rendered as a raw value', () => {
  test('sanitisation drops an unmasked value instead of passing it through', () => {
    const { sanitizeSecretEntry, sanitizeEnvComparison, containsSecretDisclosure } = appContractHelpers;

    const sanitized = sanitizeEnvComparison({
      JWT_SECRET: { kv: { configured: true, value: FAKE_SECRET }, env: { configured: true, masked: FAKE_MASKED } }
    });

    assert.equal(JSON.stringify(sanitized).includes(FAKE_SECRET), false, 'a raw secret must never reach the view model');
    assert.equal(sanitized.JWT_SECRET.env.masked, FAKE_MASKED);
    assert.equal(containsSecretDisclosure({ JWT_SECRET: { kv: { configured: true, value: FAKE_SECRET } } }), true);
    assert.equal(containsSecretDisclosure({ JWT_SECRET: { kv: { configured: true, masked: FAKE_MASKED } } }), false);
  });

  test('a masked-only comparison is not reported as a disclosure', () => {
    const { containsSecretDisclosure } = appContractHelpers;

    assert.equal(containsSecretDisclosure({ JWT_SECRET: { kv: { configured: true, masked: FAKE_MASKED }, env: { configured: true, masked: FAKE_MASKED } } }), false);
    assert.equal(containsSecretDisclosure(null), false);
  });
});

describe('OF-06 — the revocation warning is actually rendered', () => {
  test('Navbar binds the warning message and the dismiss action to the component', () => {
    const navbarSource = readRepoFile('vue/components/Navbar.vue');
    const warningSource = readRepoFile('vue/components/LogoutWarning.vue');

    assert.match(navbarSource, /logoutWarningMessage/, 'the message the composable computed must be bound in the template');
    assert.match(navbarSource, /dismissLogoutWarning/, 'the user must be able to dismiss the warning');
    assert.match(navbarSource, /LogoutWarning/, 'the warning is rendered through a component');
    assert.match(warningSource, /v-if="message"/, 'an empty message renders nothing');
    assert.match(warningSource, /role="status"/, 'the warning is announced, not only drawn');
  });
});

test('N6: late audit rejection cannot overwrite B error or loading state', async () => {
  let rejectA,accepted;
  const dispatched=new Promise(r=>accepted=r);
  const pending=new Promise((_,reject)=>rejectA=reject);
  const app=bootAuditStore({routes:{'get /api/advanced-audit/compliance/report':()=>{accepted();return pending;}}});
  const request=app.store.fetchCompliance();
  const caught=assert.rejects(request);
  await dispatched;
  app.identity.invalidateContext();app.protectedState.resetProtectedState('login-B');
  app.store.loading=true;app.store.error='B-owned';
  rejectA(Error('A-late-failure'));
  await caught;
  assert.equal(app.store.loading,true);assert.equal(app.store.error,'B-owned');
  assert.equal(app.store.compliance,null);
});
