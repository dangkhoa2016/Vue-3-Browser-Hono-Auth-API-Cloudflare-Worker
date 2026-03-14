/**
 * appServices.js — Singleton container for core Pinia stores and shared SFC loader options.
 *
 * Populated once during app bootstrap (init.js → setAppServices / setSfcOptions),
 * then consumed read-only by authStore.js, api.js, router.js, and AsyncLoader.vue.
 *
 * This replaces the previous pattern of assigning stores to window.authStore / window.modalStore /
 * window.toastStore / window.vueSfcOptions, which caused implicit global coupling and made
 * call sites impossible to statically trace.
 */

let _authStore = null;
let _modalStore = null;
let _toastStore = null;
let _sfcOptions = null;

/**
 * Called once in init.js immediately after the vue3-sfc-loader options object is created.
 * Must be called before router.js is imported, because router.js uses getSfcOptions() at
 * module load time to bootstrap AsyncLoader.vue.
 */
export function setSfcOptions(options) {
  _sfcOptions = options;
}

/**
 * Called once in init.js after Pinia is created and all stores are instantiated.
 * Must be called before app.mount() so that any component code running post-mount
 * can safely call getAuthStore() / getModalStore() / getToastStore().
 */
export function setAppServices({ authStore, modalStore, toastStore }) {
  _authStore = authStore;
  _modalStore = modalStore;
  _toastStore = toastStore;
}

export function getAuthStore() { return _authStore; }
export function getModalStore() { return _modalStore; }
export function getToastStore() { return _toastStore; }
export function getSfcOptions() { return _sfcOptions; }
