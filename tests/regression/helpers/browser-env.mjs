/**
 * Test-only harness that loads this repository's browser ESM modules inside Node.
 *
 * Scope and rules:
 * - Loads modules from THIS worktree only (paths resolve from the repo root of this checkout).
 * - Fake credentials and loopback origins only; no real API, no production host, no secrets.
 * - Approximates the browser/Pinia behaviour the findings depend on (Date.now based cached
 *   getters, interceptor replay, localStorage persistence) instead of mocking the invariant away.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Loopback origins used by fixtures. Never a real host. */
export const TEST_ORIGINS = {
  apiA: 'http://127.0.0.1:18788',
  apiB: 'http://127.0.0.1:18789',
  app: 'http://127.0.0.1:4173',
};

/**
 * `hooks` lets a suite force an interleaving that a real engine is free to produce but that is
 * impossible to schedule deterministically: `beforeGetItem` may mutate the map *after* the caller
 * observed a value but *before* the value is handed back, which is exactly the read-then-write
 * window `localStorage` leaves open. Used to prove a no-lock writer cannot claim atomicity.
 */
export function createStorage(initial = {}, { hooks = null } = {}) {
  const map = new Map(Object.entries(initial));
  const writes = [];
  const removals = [];
  return {
    getItem: (key) => {
      const value = map.has(key) ? map.get(key) : null;
      return hooks?.beforeGetItem ? hooks.beforeGetItem({ key, value, map }) ?? value : value;
    },
    setItem: (key, value) => {
      const serialized = String(value);
      map.set(key, serialized);
      writes.push({ key, value: serialized });
      if (hooks?.afterSetItem) hooks.afterSetItem({ key, value: serialized, map });
    },
    removeItem: (key) => { map.delete(key); removals.push({ key }); },
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() { return map.size; },
    _dump: () => Object.fromEntries(map),
    /** Every write of the canonical record, so "wrote once" is assertable and not a comment. */
    _writes: writes,
    _removals: removals,
  };
}

export function createRecordingConsole() {
  const records = [];
  const push = (level) => (...args) => { records.push({ level, message: args.map(String).join(' ') }); };
  return {
    records,
    log: push('log'),
    warn: push('warn'),
    error: push('error'),
    info: push('info'),
    debug: push('debug'),
    contains: (needle) => records.some((entry) => entry.message.includes(needle)),
  };
}

/**
 * A `BroadcastChannel` stand-in that keeps a *shared* registry, so two "tabs" built from two
 * browser environments can actually deliver a message to each other. The real API is delivered to
 * nobody: a `BroadcastChannel` never fires its own `postMessage` in the sending context, and a
 * test that forgets that will happily prove a wrong thing.
 */
export function createBroadcastBus() {
  const channels = new Map();
  const created = [];

  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.closed = false;
      this.posted = [];
      this._listeners = [];
      if (!channels.has(name)) channels.set(name, []);
      channels.get(name).push(this);
      created.push(this);
    }

    addEventListener(type, listener) {
      if (type === 'message') this._listeners.push(listener);
    }

    removeEventListener(type, listener) {
      if (type !== 'message') return;
      this._listeners = this._listeners.filter((entry) => entry !== listener);
    }

    postMessage(data) {
      this.posted.push(data);
      for (const channel of channels.get(this.name) || []) {
        if (channel === this || channel.closed) continue;
        for (const listener of [...channel._listeners]) listener({ data });
      }
    }

    close() {
      this.closed = true;
      channels.set(this.name, (channels.get(this.name) || []).filter((entry) => entry !== this));
    }
  }

  return { FakeBroadcastChannel, channels, created };
}

/**
 * A Web Locks stand-in that serialises by queueing, the way the real API does: FIFO per lock name,
 * one holder at a time, released only when the callback settles.
 *
 * It also offers a **latch** (`hold`) so a suite can park the lock and release it in a chosen order.
 * Reproducing a writer race by sleeping is flaky and hides the very interleaving under test; a latch
 * makes the order explicit.
 *
 * Every auth test must run with a real queue. A suite that hands the app `locks: null` to "keep it
 * simple" is exercising the unreduced fallback path, which is a different product behaviour.
 */
export function createLockManager() {
  const states = new Map();
  const granted = [];
  const requested = [];
  const paused = new Set();

  const stateFor = (name) => {
    if (!states.has(name)) states.set(name, { held: 0, waiters: [] });
    return states.get(name);
  };

  const drain = (name) => {
    const state = states.get(name);
    if (!state || paused.has(name)) return;
    while (state.held === 0 && state.waiters.length > 0) {
      const job = state.waiters.shift();
      state.held += 1;
      job();
    }
  };

  const releaseOne = (name) => {
    const state = states.get(name);
    if (!state || state.held === 0) return;
    state.held -= 1;
    drain(name);
  };

  const runJob = (name, callback) => async () => {
    granted.push(name);
    try {
      return await callback({ name, mode: 'exclusive' });
    } finally {
      releaseOne(name);
    }
  };

  return {
    granted,
    requested,
    request(name, callback) {
      const state = stateFor(name);
      requested.push(name);
      return new Promise((resolve, reject) => {
        state.waiters.push(() => {
          runJob(name, callback)().then(resolve, reject);
        });
        drain(name);
      });
    },
    /** Parks the lock: further requests queue but do not run. Returns the release function. */
    hold(name) {
      stateFor(name);
      paused.add(name);
      return () => {
        paused.delete(name);
        drain(name);
      };
    },
    isPaused: (name) => paused.has(name),
    isHeld: (name) => (states.get(name)?.held ?? 0) > 0,
    pending: (name) => states.get(name)?.waiters.length ?? 0,
    async query() {
      return {
        held: [...states.entries()].filter(([, state]) => state.held > 0).map(([name]) => name),
        pending: [...states.entries()].filter(([, state]) => state.waiters.length > 0).map(([name]) => name),
      };
    },
  };
}

/** A real (tiny) event target, so a `storage` or `focus` listener can be exercised. */
function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      const current = listeners.get(type) || [];
      listeners.set(type, current.filter((entry) => entry !== listener));
    },
    _emit(type, event = {}) {
      for (const listener of [...(listeners.get(type) || [])]) listener({ type, ...event });
    },
    _listenerCount(type) {
      return (listeners.get(type) || []).length;
    },
  };
}

export function createBrowserEnv({
  origin = TEST_ORIGINS.app,
  storage = createStorage(),
  console = createRecordingConsole(),
  clock = null,
  broadcastBus = null,
  locks = null,
} = {}) {
  const parsed = new URL(origin);
  // Production code must never capture Date.now() in a getter; tests drive time through this
  // seam, which is installed into the module realm.
  const clockRef = clock || { now: () => Date.now() };
  const SandboxDate = class extends Date {
    static now() {
      return clockRef.now();
    }
  };
  const windowTarget = createEventTarget();
  const documentTarget = createEventTarget();
  const window = {
    location: {
      origin: parsed.origin,
      href: `${parsed.origin}/`,
      hostname: parsed.hostname,
      pathname: '/',
      search: '',
      reload() {},
    },
    // Real listener bookkeeping: a harness whose addEventListener is a no-op cannot tell a
    // missing subscription from a subscribed-but-silent one.
    addEventListener: windowTarget.addEventListener,
    removeEventListener: windowTarget.removeEventListener,
    _emit: windowTarget._emit,
    _listenerCount: windowTarget._listenerCount,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    navigator: { userAgent: 'node-test-harness', ...(locks ? { locks } : {}) },
  };

  const env = {
    window,
    Date: SandboxDate,
    localStorage: storage,
    sessionStorage: createStorage(),
    document: {
      documentElement: { classList: { toggle() {}, add() {}, remove() {} } },
      body: { classList: { toggle() {}, add() {}, remove() {} } },
      head: { appendChild() {}, insertBefore() {}, getElementsByTagName: () => [] },
      getElementById: () => null,
      createElement: () => ({ classList: { toggle() {}, add() {}, remove() {} } }),
      addEventListener: documentTarget.addEventListener,
      removeEventListener: documentTarget.removeEventListener,
      _emit: documentTarget._emit,
      _listenerCount: documentTarget._listenerCount,
    },
    console,
    // Browser performance is independent of the injected wall clock.
    performance: globalThis.performance,
    URL,
    URLSearchParams,
    AbortController,
    Blob: class {
      constructor(parts = [], options = {}) {
        this.parts = parts;
        this.type = options.type || '';
      }
    },
    Promise,
    Math,
    JSON,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
  };

  // A tab without a BroadcastChannel is a supported browser, and the storage event is the fallback
  // that has to work there, so the harness can build both shapes.
  if (broadcastBus) env.BroadcastChannel = broadcastBus.FakeBroadcastChannel;

  // Web Locks are optional: `locks: null` reproduces a browser without them, which is the case
  // where a read-then-write cannot be atomic.
  if (locks) env.navigator = { locks };

  env.globalThis = env;
  return env;
}

/**
 * Minimal axios stand-in: keeps interceptor semantics (request chain, error chain, replay by
 * calling the instance again) so transport policy can be asserted instead of mocked.
 */
export function createFakeAxios() {
  const state = {
    requests: [],
    requestHandlers: [],
    responseHandlers: [],
    transport: null,
  };

  const runRequestChain = async (config) => {
    let current = { headers: {}, ...config };
    for (const handler of [...state.requestHandlers].reverse()) {
      if (handler.fulfilled) {
        current = (await handler.fulfilled(current)) ?? current;
      }
    }
    return current;
  };

  const runResponseChain = async (error) => {
    for (const handler of state.responseHandlers) {
      if (!handler.rejected) continue;
      // eslint-disable-next-line no-await-in-loop
      const result = await handler.rejected(error);
      if (result !== undefined) return { settled: true, value: result };
    }
    return { settled: false, value: error };
  };

  const instance = async (config) => {
    const prepared = await runRequestChain(config);
    state.requests.push({ method: (prepared.method || 'get').toLowerCase(), url: prepared.url, baseURL: prepared.baseURL, headers: { ...prepared.headers } });
    try {
      const response = await state.transport(prepared);
      for (const handler of state.responseHandlers) {
        if (!handler.fulfilled) continue;
        // eslint-disable-next-line no-await-in-loop
        const handled = await handler.fulfilled(response);
        if (handled !== undefined) return handled;
      }
      return response;
    } catch (error) {
      if (!error.config) error.config = prepared;
      const outcome = await runResponseChain(error);
      if (outcome.settled) return outcome.value;
      throw outcome.value;
    }
  };

  instance.defaults = {};
  instance.create = (config = {}) => {
    instance.defaults = { ...instance.defaults, ...config };
    return instance;
  };
  for (const method of ['get', 'delete', 'head', 'options']) {
    instance[method] = (url, config = {}) => instance({ ...config, url, method });
  }
  for (const method of ['post', 'put', 'patch']) {
    instance[method] = (url, data, config = {}) => instance({ ...config, url, method, data });
  }
  instance.interceptors = {
    request: {
      use: (fulfilled, rejected) => state.requestHandlers.push({ fulfilled, rejected }),
      eject: () => {},
    },
    response: {
      use: (fulfilled, rejected) => state.responseHandlers.push({ fulfilled, rejected }),
      eject: () => {},
    },
  };
  instance.__state = state;
  return instance;
}

export const axiosStub = { create: (config) => createFakeAxios(config) };

/**
 * Pinia stand-in: `defineStore(id, options)` records options; `createStoreInstance` builds a
 * store whose getters are CACHED until a state key they read changes. That cache is what makes
 * `Date.now()` inside a getter stale, so the harness must reproduce it.
 */
export function createPiniaStub() {
  const definitions = new Map();
  // One instance per store id, like Pinia: `useStore()` always returns the live store, so a reset
  // registered by a module affects the instance the application is actually reading.
  const instances = new Map();
  const instanceFor = (id, options) => {
    if (!instances.has(id)) instances.set(id, createStoreInstance(options));
    return instances.get(id);
  };
  const defineStore = (id, options) => {
    const useStore = () => instanceFor(id, options);
    useStore.$id = id;
    useStore.$options = options;
    definitions.set(id, options);
    return useStore;
  };
  defineStore.definitions = definitions;
  defineStore.createStoreInstance = (id) => instanceFor(id, definitions.get(id));
  return { defineStore };
}

export function createStoreInstance(options) {
  const state = options.state ? options.state() : {};
  const getterDefs = options.getters || {};
  const actionDefs = options.actions || {};
  const getterCache = new Map();
  let tracking = null;

  const target = {};
  Object.assign(target, state);

  const invalidate = (prop) => {
    for (const [name, entry] of getterCache) {
      if (entry.deps.has(prop)) getterCache.delete(name);
    }
  };

  // Getters receive the store state; reads through it must be tracked like Pinia does. They read
  // the same object the actions write to, so the cache can never serve a stale value.
  const trackedState = new Proxy(target, {
    get(obj, prop) {
      if (tracking && typeof prop === 'string') tracking.deps.add(prop);
      return obj[prop];
    },
  });

  const store = new Proxy(target, {
    get(obj, prop) {
      if (Object.prototype.hasOwnProperty.call(getterDefs, prop)) {
        const cached = getterCache.get(prop);
        if (cached) return cached.value;
        const previous = tracking;
        const deps = new Set();
        tracking = { name: prop, deps };
        try {
          const value = getterDefs[prop].call(store, trackedState);
          getterCache.set(prop, { value, deps });
          // Nested getters must propagate their dependencies to the outer getter.
          if (previous) {
            for (const dep of deps) previous.deps.add(dep);
          }
          return value;
        } finally {
          tracking = previous;
        }
      }
      if (Object.prototype.hasOwnProperty.call(actionDefs, prop)) {
        return actionDefs[prop].bind(store);
      }
      if (tracking && Object.prototype.hasOwnProperty.call(target, prop)) {
        tracking.deps.add(prop);
      }
      return obj[prop];
    },
    set(obj, prop, value) {
      obj[prop] = value;
      invalidate(prop);
      return true;
    },
    deleteProperty(obj, prop) {
      delete obj[prop];
      invalidate(prop);
      return true;
    },
  });

  return store;
}

/**
 * Loads a repository module as a script in a vm context.
 * `bindings` maps the module's imported identifiers to values (the caller knows the contract).
 * Aliased imports (`import { a as b }`) are resolved from the same bindings, so a module may
 * rename an import without the harness needing to know the alias.
 */
export function loadModule(relativePath, env, bindings = {}) {
  const absolute = path.join(REPO_ROOT, relativePath);
  const { source, exported, imports } = transformModule(readFileSync(absolute, 'utf8'));
  // `const`/`let` at script top level never become global properties, so collect exports explicitly.
  const epilogue = `\n;__exports__ = { ${exported
    .map(([exportedName, localName]) => `${JSON.stringify(exportedName)}: typeof ${localName} === 'undefined' ? undefined : ${localName}`)
    .join(', ')} };`;

  const resolved = { ...bindings };
  for (const [local, imported] of imports) {
    if (local in resolved) continue;
    if (imported in bindings) resolved[local] = bindings[imported];
  }

  const sandbox = { ...env, ...resolved };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(source + epilogue, context, { filename: absolute });
  return { ...(context.__exports__ || {}) };
}

export function transformModule(source) {
  const exported = [];
  const imports = [];
  let code = source;

  // Record what each import binds locally before the statement itself is stripped.
  code = code.replace(/^[ \t]*import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"];?[ \t]*$/gm, (_m, clause) => {
    const named = clause.match(/\{([\s\S]*)\}/);

    if (named) {
      named[1].split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
        const [imported, local] = part.split(/\s+as\s+/).map((token) => token.trim());
        imports.push([local || imported, imported]);
      });
    }

    const bareDefault = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, '').trim();
    if (bareDefault && /^[A-Za-z_$][\w$]*$/.test(bareDefault)) imports.push([bareDefault, 'default']);

    return '';
  });
  code = code.replace(/^[ \t]*import\s+['"][^'"]+['"];?[ \t]*$/gm, '');

  code = code.replace(/^[ \t]*export\s+(const|let|var|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm, (_m, kind, name) => {
    exported.push([name, name]);
    return `${kind} ${name}`;
  });

  // A re-export (`export { a } from './x.js'`) only re-exports a binding the caller already binds
  // by name, so the statement is dropped and the name is resolved from the sandbox globals.
  code = code.replace(
    /^[ \t]*export\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"];?[ \t]*$/gm,
    (_m, inner) => {
      inner.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
        const [local, alias] = part.split(/\s+as\s+/).map((token) => token.trim());
        exported.push([alias || local, local]);
      });
      return '';
    }
  );

  code = code.replace(/^[ \t]*export\s*\*\s*from\s*['"][^'"]+['"];?[ \t]*$/gm, '');

  code = code.replace(/^[ \t]*export\s*\{([^}]*)\}\s*;?/gm, (_m, inner) => {
    inner.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
      const [local, alias] = part.split(/\s+as\s+/).map((token) => token.trim());
      exported.push([alias || local, local]);
    });
    return '';
  });

  code = code.replace(/^[ \t]*export\s+default\s+/gm, () => {
    exported.push(['default', '__moduleDefault__']);
    return 'const __moduleDefault__ = ';
  });

  return { source: code, exported, imports };
}

/** Programmable transport that records every attempt (used to count replays). */
export function createTransport(routes) {
  const calls = [];
  const transport = async (config) => {
    const key = `${(config.method || 'get').toLowerCase()} ${config.url}`;
    // Store a plain copy: request bodies are built inside the vm realm, so they must not be
    // compared by prototype with deepStrictEqual.
    const record = { ...config };
    if (config.data !== undefined) {
      record.data = JSON.parse(JSON.stringify(config.data));
    }
    calls.push({ key, config: record });
    const route = routes[key] ?? routes[`${(config.method || 'get').toLowerCase()} ${config.baseURL || ''}${config.url}`];
    if (!route) {
      const error = new Error(`No fixture for ${key}`);
      error.config = config;
      throw error;
    }
    if (typeof route === 'function') {
      const result = await route(config);
      // Keep fixtures uniform: a returned 4xx/5xx is a rejection, like a real HTTP response.
      if (result && result.status >= 400) {
        const error = new Error(`Request failed with status code ${result.status}`);
        error.config = record;
        error.response = result;
        error.code = result.data?.error?.code;
        throw error;
      }
      return result;
    }
    if (route.networkError) {
      const error = new Error(route.networkError);
      error.code = route.code || 'ERR_NETWORK';
      error.config = config;
      throw error;
    }
    if (route.cancelled) {
      const error = new Error('canceled');
      error.code = 'ERR_CANCELED';
      error.config = config;
      throw error;
    }
    if (route.status >= 400) {
      const error = new Error(`Request failed with status code ${route.status}`);
      error.config = config;
      error.response = { status: route.status, data: route.data ?? { success: false, error: { code: route.code } } };
      error.code = route.code;
      throw error;
    }
    return { status: route.status || 200, data: route.data };
  };
  transport.calls = calls;
  return transport;
}

export function ok(data) { return { status: 200, data: { success: true, data } }; }
export function fail(status, code, message) {
  return { status, data: { success: false, error: { code, message } } };
}
