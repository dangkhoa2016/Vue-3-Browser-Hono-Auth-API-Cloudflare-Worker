/**
 * apiIdentity.js — normalized API identity (origin + base path) and session generation.
 *
 * Why this exists (F03): the app lets the user point the client at a different API origin at
 * runtime. Persisted tokens were not bound to that origin, so a token issued by server A was
 * attached to requests for server B, and late responses could restore a session that had
 * already been cleared. Identity plus a monotonic generation make those cases decidable.
 *
 * Invariants:
 * - identity is compared as a whole string, never by ambiguous string prefix matching.
 * - changing identity bumps the epoch; in-flight responses from an older epoch are
 *   refused instead of written into the session.
 * - the epoch is per page context; it is not a security control on its own, it only
 *   prevents our own stale writes.
 *
 * Session lifecycle (T1/§4.1 of FRONTEND-MASTER-REMEDIATION.vi.md):
 * - `epoch` changes when a new login intent starts, when a session is cleared, when the API
 *   identity changes, or when another tab takes over the session with a different one.
 * - `sessionId` identifies one login session across tabs. Token rotation of the same session
 *   keeps `sessionId` and `epoch` and only increases the persisted snapshot `version`; bumping
 *   the epoch on every rotation would reject requests that were legitimately bound to the
 *   session that is being rotated.
 * - `sessionId` is a client lifecycle id. It is not a user id and it never replaces the
 *   server's session/revocation authority.
 */

export const API_IDENTITY_STORAGE_KEY = 'api-identity';
export const SESSION_IDENTITY_STORAGE_KEY = 'auth-api-identity';

const HTTP_PROTOCOLS = ['http:', 'https:'];
const TRAVERSAL_SEGMENT = /^(?:\.|%2e){1,2}$/i;

let currentIdentity = '';
let sessionEpoch = 0;
let currentSessionId = null;
let loginAttemptSeq = 0;
const identityListeners = new Set();

const randomSuffix = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch (_error) {
    // Fall through to the time based suffix below.
  }
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
};

/** Mints a new client-side login session id. Never derived from the user id. */
export function createSessionId() {
  return `sid_${randomSuffix()}`;
}

function readStorage(key) {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

/**
 * Normalizes a user supplied API base URL into `<origin><basePath>` (no trailing slash).
 * Rejects non-http(s) protocols, embedded credentials, query/fragment suffixes and any
 * path segment that could escape the configured base path.
 */
export function normalizeApiBaseUrl(value, fallback = '') {
  const raw = String(value || '').trim();
  const candidate = raw || String(fallback || '').trim();

  if (!candidate) {
    throw new Error('Invalid API endpoint: empty value');
  }

  const parsed = new URL(candidate);

  if (!HTTP_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error('Invalid API endpoint protocol');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Invalid API endpoint credentials');
  }

  if (parsed.search || parsed.hash) {
    throw new Error('Invalid API endpoint suffix');
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.some((segment) => TRAVERSAL_SEGMENT.test(segment))) {
    throw new Error('Invalid API endpoint path');
  }

  const basePath = segments.length ? `/${segments.join('/')}` : '';
  return `${parsed.origin}${basePath}`;
}

export function getApiIdentity() {
  return currentIdentity;
}

export function describeApiIdentity(identity = currentIdentity) {
  const value = String(identity || '');
  try {
    const parsed = new URL(value || 'http://invalid.invalid');
    return { origin: parsed.origin, basePath: parsed.pathname.replace(/\/$/, ''), identity: value };
  } catch (_error) {
    return { origin: '', basePath: '', identity: value };
  }
}

/**
 * Sets the active API identity. Returns whether the identity actually changed so callers can
 * decide to invalidate the session (see authStore.handleApiIdentityChange).
 */
export function setApiIdentity(nextIdentity) {
  const normalized = String(nextIdentity || '');
  const previous = currentIdentity;

  if (normalized === previous) {
    return { changed: false, identity: previous, previous };
  }

  currentIdentity = normalized;
  sessionEpoch += 1;
  currentSessionId = null;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(API_IDENTITY_STORAGE_KEY, normalized);
    }
  } catch (_error) {
    // Storage is optional; identity still works for the current page context.
  }

  for (const listener of [...identityListeners]) {
    try {
      listener(normalized, previous);
    } catch (error) {
      console.warn('[apiIdentity] identity listener failed:', error);
    }
  }

  return { changed: true, identity: normalized, previous };
}

export function getSessionGeneration() {
  return sessionEpoch;
}

export const getSessionEpoch = getSessionGeneration;

/** Session lifecycle id of the session this page currently owns, or null when signed out. */
export function getSessionId() {
  return currentSessionId;
}

/**
 * Records the session lifecycle id that the page has adopted. A different id means another tab
 * committed a different login session, so the previous id is no longer valid here.
 */
export function setSessionId(sessionId) {
  const next = sessionId ? String(sessionId) : null;
  currentSessionId = next;
  return currentSessionId;
}

/**
 * Immutable snapshot of the session context. Every asynchronous auth/transport operation takes
 * one before it does any work and validates it again before any side effect.
 *
 * @returns {{identity: string, epoch: number, sessionId: string|null}}
 */
export function captureContext() {
  return Object.freeze({ identity: currentIdentity, epoch: sessionEpoch, sessionId: currentSessionId });
}

/**
 * True when `context` still describes the live session. Callers must re-check this before they
 * commit a session, write a protected cache, or surface an error for the current user.
 */
export function isCurrentContext(context) {
  if (!context) return false;
  return context.identity === currentIdentity && context.epoch === sessionEpoch;
}

/**
 * Invalidates every context captured before this call. Used when a new login intent starts, when
 * the session is cleared, and when another tab takes over the session.
 *
 * @returns {object} the new context
 */
export function invalidateContext() {
  sessionEpoch += 1;
  return captureContext();
}

/**
 * Starts a login intent: a new login invalidates any login still in flight, so the latest
 * intent always wins regardless of which response arrives first.
 *
 * @returns {{identity: string, epoch: number, sessionId: string|null, attempt: number}}
 */
export function beginLoginAttempt() {
  const context = invalidateContext();
  loginAttemptSeq += 1;
  return Object.freeze({ ...context, attempt: loginAttemptSeq });
}

export function getLoginAttemptSequence() {
  return loginAttemptSeq;
}

/**
 * Re-reads the API base URL persisted in storage and adopts it as the active identity.
 * Storage can be changed by another tab or by an older build, so the identity is verified
 * instead of trusted from module load time.
 */
export function syncApiIdentityFromStorage(fallback = '') {
  // Only the configured endpoint decides the active identity. `auth-api-identity` only records
  // which server issued the current session and must never be able to move the client.
  const candidate = readStorage('api-base-url') || fallback;

  if (!candidate) {
    return { changed: false, identity: currentIdentity };
  }

  let normalized;

  try {
    normalized = normalizeApiBaseUrl(candidate);
  } catch (_error) {
    return { changed: false, identity: currentIdentity, invalid: true };
  }

  return setApiIdentity(normalized);
}

export function bumpSessionGeneration() {
  sessionEpoch += 1;
  return sessionEpoch;
}

export function onApiIdentityChange(listener) {
  identityListeners.add(listener);
  return () => identityListeners.delete(listener);
}

/**
 * Non-cryptographic namespace used only to keep per-tab channel/lock names unique per identity
 * and session. It must never be used as a secret or as a security boundary.
 */
export function identityNamespace(identity = currentIdentity, sessionId = '') {
  const source = `${identity}|${sessionId}`;
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash.toString(36);
}

export const SESSION_IDENTITY_STORAGE = {
  read: () => readStorage(SESSION_IDENTITY_STORAGE_KEY),
  write: (value) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SESSION_IDENTITY_STORAGE_KEY, String(value || ''));
      }
    } catch (_error) {
      // Ignore storage failures: the in-memory binding is authoritative for this page.
    }
  },
  clear: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SESSION_IDENTITY_STORAGE_KEY);
      }
    } catch (_error) {
      // Ignore storage failures.
    }
  },
};
