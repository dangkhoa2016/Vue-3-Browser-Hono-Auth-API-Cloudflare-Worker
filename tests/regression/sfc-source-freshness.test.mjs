import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the shipped getFile callback on the production-host branch. The normal
// browser fixture uses localhost, which used to bypass the faulty cache-first path.
function loader({ fetchResponse = () => new Response('current source'), denied = false, available = true } = {}) {
  const requests = [];
  const legacyCache = {
    match: async () => new Response('obsolete component'),
    put: async () => {},
  };
  const cacheStorage = {
    open: async () => { if (denied) throw new Error('Cache Storage denied'); return legacyCache; },
  };
  let options;
  const app = { use() {}, mount() {} };
  const context = vm.createContext({
    Vue: { createApp: () => app },
    VueI18n: {}, URL, console,
    window: {
      location: { hostname: 'console.example.test', href: 'https://console.example.test/' },
      caches: available ? cacheStorage : undefined,
      'vue3-sfc-loader': { loadModule: async () => ({}) },
    },
    caches: cacheStorage,
    fetch: async (url, init) => { requests.push({ url, ...init }); return fetchResponse(); },
    I18nModule: { detectBrowserLanguage: () => 'en', loadLanguageAsync: async () => {} },
    AppServices: { setSfcOptions: value => { options = value; }, setAppServices() {} },
  });
  // Replace only the two static imports with the above bootstrap dependencies;
  // no loader implementation is copied or reconstructed in this test.
  const source = readFileSync(new URL('../../assets/js/init.js', import.meta.url), 'utf8')
    .replace(/^import \* as \w+ from ['"][^'"]+['"];\s*$/gm, '');
  vm.runInContext(source, context, { filename: 'assets/js/init.js' });
  return { options, requests };
}

test('production reload revalidates source instead of consuming a legacy cached component', async () => {
  const { options, requests } = loader();
  const file = await options.getFile('/vue/pages/Home.vue');
  assert.equal(await file.getContentData(false), 'current source');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].cache, 'no-cache');
});

test('a later source read observes a changed deployment', async () => {
  let release = 'release A';
  const { options } = loader({ fetchResponse: () => new Response(release) });
  assert.equal(await (await options.getFile('/vue/pages/Home.vue')).getContentData(false), 'release A');
  release = 'release B';
  assert.equal(await (await options.getFile('/vue/pages/Home.vue')).getContentData(false), 'release B');
});

test('denied Cache Storage cannot prevent loading current source', async () => {
  const { options } = loader({ denied: true });
  assert.equal(await (await options.getFile('/vue/pages/Home.vue')).getContentData(false), 'current source');
});

test('browsers without Cache Storage still revalidate source', async () => {
  const { options, requests } = loader({ available: false });
  await options.getFile('/vue/pages/Home.vue');
  assert.equal(requests[0].cache, 'no-cache');
});

test('network failure is reported instead of falling back to incompatible cached source', async () => {
  const { options } = loader({ fetchResponse: () => { throw new Error('network unavailable'); } });
  await assert.rejects(options.getFile('/vue/pages/Home.vue'), /network unavailable/);
});

test('HTTP failure is reported even if an older component is cached', async () => {
  const { options } = loader({ fetchResponse: () => new Response('missing', { status: 404 }) });
  await assert.rejects(options.getFile('/vue/pages/Home.vue'), error => error.res.status === 404);
});

test('explicit component retry bypasses the HTTP cache', async () => {
  const { options, requests } = loader();
  const file = await options.getFile('/vue/pages/Home.vue?__reload=123');
  assert.equal(await file.getContentData(false), 'current source');
  assert.equal(requests[0].cache, 'no-store');
});
