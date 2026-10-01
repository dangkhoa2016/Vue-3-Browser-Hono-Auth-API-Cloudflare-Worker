/**
 * sessionStorage.js — the single canonical persisted session record.
 *
 * Why this exists (F03/F04, review OF-05): the session used to be spread over five independent
 * `localStorage` keys. A second tab could therefore write a new access token while the reading
 * tab kept the previous `user`/`expires_at` from memory, producing a session whose displayed user
 * did not match the token that was sent. One JSON record written by a single writer removes that
 * whole class of mixed-field snapshots.
 *
 * Invariants:
 * - one record per origin holds `{ schemaVersion, identity, sessionId, version, state, user,
 *   accessToken, refreshToken, expiresAt, refreshExpiresAt }`; nothing is merged field by field.
 * - `expiresAt`/`refreshExpiresAt` are epoch **seconds**, matching the backend contract. Values
 *   that cannot be a plausible second-precision epoch (for example milliseconds) are rejected
 *   instead of guessed, because a wrong unit silently refreshes too often or never.
 * - a logout writes a tombstone (`state: 'ended'`) with a raised version instead of deleting the
 *   record, so a refresh that was already in flight cannot resurrect the signed-out session.
 * - `ended` is a **valid, observable state**. Code must ask for `status === 'active'`; turning a
 *   tombstone into "nothing" is what let a stale rotation reinstate a signed-out session (FA-01).
 * - exactly one validator decides validity, and it runs *before* any mutation. An invalid payload
 *   is never reported as a degraded storage (FA-06).
 * - `localStorage` has no compare-and-swap. Web Locks serialise writers when available; without
 *   them the module never claims atomicity and an ambiguous snapshot is refused instead of
 *   guessed.
 * - a corrupt, quota-exceeded or unavailable storage degrades to a bounded, reported state; it
 *   never throws into the app and never emits a bearer whose binding can no longer be verified.
 * - tokens in `localStorage` remain exposed to XSS. This module does not change that.
 *
 * Design record: FRONTEND-SESSION-DESIGN.vi.md §2–§4.
 */

export const SESSION_RECORD_STORAGE_KEY = 'auth-session-record';
export const SESSION_SCHEMA_VERSION = 2;

export const SESSION_STATE_ACTIVE = 'active';
export const SESSION_STATE_ENDED = 'ended';

export const SESSION_RECORD_SOURCE = {
  RECORD: 'record',
  LEGACY: 'legacy',
  NONE: 'none'
};

/** The outcome of reading the record. `active`/`ended` are real states, not "present". */
export const SESSION_READ_STATUS = Object.freeze({
  ABSENT: 'absent',
  ACTIVE: 'active',
  ENDED: 'ended',
  INVALID: 'invalid',
  UNAVAILABLE: 'unavailable'
});

/** The outcome of a guarded write. */
export const SESSION_COMMIT_STATUS = Object.freeze({
  APPLIED: 'applied',
  STALE: 'stale',
  INVALID: 'invalid',
  STORAGE_FAILURE: 'storage-failure',
  UNAVAILABLE: 'unavailable',
  AMBIGUOUS: 'ambiguous'
});

/**
 * The one writer lock for the one canonical storage resource.
 *
 * `auth-session-record` is a **single key on a single origin**, so it needs a **single** lock. The
 * round4 lock was `frontend-session-write:${apiIdentity}`, which meant two different API identities
 * on the same origin took two different locks while still writing the same key — mutual exclusion
 * that looked correct and was not. The origin is already the scope of Web Locks, so the name carries
 * no partition information at all: no session id (a rotation of the same session must not lock
 * itself out) and no API identity (the key is not partitioned either).
 */
export const SESSION_WRITE_LOCK_NAME = 'frontend-session-write:auth-session-record';

/** Kept for callers that only need the namespace, never for building a per-writer name. */
export const SESSION_WRITE_LOCK_PREFIX = 'frontend-session-write:';

/** The writer lock is the same for every writer, so it is a function only for readability. */
export function sessionWriteLockName() {
  return SESSION_WRITE_LOCK_NAME;
}

/**
 * What a writer is trying to do. The operation — not a shared version comparison — decides whether
 * a conflicting read is a refusal, a legitimate take-over, or a no-op.
 */
export const SESSION_OPERATION = Object.freeze({
  LOGIN: 'login',
  ROTATE: 'rotate',
  END: 'end',
  PROFILE: 'profile',
  MIGRATE: 'migrate'
});

/**
 * The decision `commitSession` reaches for an operation before it writes anything.
 *
 * `REFUSE` is the only answer for an operation this module does not know: an unrecognised operation
 * must never fall through to the `login` rule, because "take over whatever is stored" is the one
 * decision that may destroy a session.
 */
export const COMMIT_DECISION = Object.freeze({
  PROCEED: 'proceed',
  IDEMPOTENT: 'idempotent',
  REFUSE: 'refuse'
});

/**
 * How long a writer waits to be *granted* the writer lock before it gives up.
 *
 * This bounds queueing only. It never changes the HTTP timeout, and it is not a lease: a writer that
 * gives up is not the holder's problem, and the holder is never stolen from. The default matches the
 * refresh conflict timeout that already existed, so one number describes how long a tab is willing to
 * wait for another tab (FRONTEND-SESSION-DESIGN.vi.md §7).
 */
export const DEFAULT_LOCK_ACQUISITION_TIMEOUT_MS = 5000;

/**
 * True when a writer can be serialised at all.
 *
 * `localStorage` has no compare-and-swap, and a read-then-write without a lock is not atomic: a
 * second writer can commit between the two steps, so any "expected version" check only closes the
 * window it was read in. There is no safe localStorage fallback, so reduced mode is the honest
 * answer (FRONTEND-SESSION-DESIGN.vi.md §6).
 */
export function isWriterSerializationAvailable(locks = undefined) {
  const manager = locks === undefined ? getDefaultLocks() : locks;
  return Boolean(manager && typeof manager.request === 'function');
}

/** Probe only a unique, credential-free key; never alter a session or preference. */
export function isSessionStorageAvailable(storage = defaultStorage()) {
  if (!storage) return false;
  const key = `auth-storage-probe:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  try {
    storage.setItem(key, '1');
    const readable = storage.getItem(key) === '1';
    storage.removeItem(key);
    return readable;
  } catch (_error) {
    try { storage.removeItem(key); } catch (_cleanupError) { /* Storage is unavailable. */ }
    return false;
  }
}

export const LEGACY_SESSION_KEYS = Object.freeze({
  user: 'user',
  accessToken: 'token',
  refreshToken: 'refresh_token',
  expiresAt: 'expires_at',
  refreshExpiresAt: 'refresh_expires_at',
  sessionIdentity: 'auth-api-identity'
});

/** Plausible upper bound for a second-precision epoch: year 5138. */
const MAX_EPOCH_SECONDS = 1e11;

/** Sentinel telling a storage *exception* apart from a stored `null`. */
const READ_FAILED = Object.freeze({ readFailed: true });

function defaultStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (_error) {
    return null;
  }
}

function getDefaultLocks() {
  try {
    return typeof navigator !== 'undefined' ? navigator.locks || null : null;
  } catch (_error) {
    return null;
  }
}

function readRaw(storage, key) {
  if (!storage) return READ_FAILED;
  try {
    const value = storage.getItem(key);
    return value === undefined ? null : value;
  } catch (_error) {
    return READ_FAILED;
  }
}

function writeRaw(storage, key, value) {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch (_error) {
    return false;
  }
}

function removeRaw(storage, key) {
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch (_error) {
    return false;
  }
}

const isReadFailure = (value) => !!value && typeof value === 'object' && value.readFailed === true;

function removeLegacyKeys(storage) {
  for (const key of Object.values(LEGACY_SESSION_KEYS)) removeRaw(storage, key);
}

/**
 * Mirrors the canonical record onto the per-key layout that older builds and the existing
 * regression suite read. The canonical record stays authoritative: every read path goes through
 * `readSessionState`, so the mirror is compatibility, never a second source of truth.
 */
function writeLegacyMirror(storage, record) {
  const pairs = [
    [LEGACY_SESSION_KEYS.accessToken, record.accessToken],
    [LEGACY_SESSION_KEYS.refreshToken, record.refreshToken],
    [LEGACY_SESSION_KEYS.user, record.user ? JSON.stringify(record.user) : null],
    [LEGACY_SESSION_KEYS.expiresAt, record.expiresAt === null ? null : String(record.expiresAt)],
    [LEGACY_SESSION_KEYS.refreshExpiresAt, record.refreshExpiresAt === null ? null : String(record.refreshExpiresAt)],
    [LEGACY_SESSION_KEYS.sessionIdentity, record.identity]
  ];

  let complete = true;

  pairs.forEach(([key, value]) => {
    if (value === null || value === undefined) {
      removeRaw(storage, key);
      return;
    }

    if (!writeRaw(storage, key, value)) complete = false;
  });

  return complete;
}

/**
 * Normalises an expiry to epoch seconds. Returns null for missing, non-finite, negative, or
 * millisecond-precision values instead of coercing them.
 */
export function toEpochSeconds(value) {
  if (typeof value === 'boolean') return null;
  // `parseInt('123garbage')` is 123, which would turn a malformed payload into a valid expiry.
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').trim());

  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (numeric > MAX_EPOCH_SECONDS) return null;

  return Math.floor(numeric);
}

function normalizeUser(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function parseUser(raw) {
  if (raw === null || raw === undefined || raw === '') return null;

  try {
    return normalizeUser(JSON.parse(raw));
  } catch (_error) {
    return undefined; // present but unparseable: the caller must treat it as inconsistent
  }
}

/**
 * The one validator. Login, token rotation and hydrating a persisted record all go through it, so
 * the same payload cannot be accepted on one path and rejected on another (FA-06).
 *
 * @param {*} raw
 * @param {{expectedIdentity?: string, expectedSessionId?: ?string, expectedVersion?: ?number,
 *          allowLegacyVersion?: boolean, allowMissingState?: boolean}} options
 * @returns {{record: object|null, reason: string}}
 */
export function normalizeSessionRecord(raw, {
  expectedIdentity = '',
  expectedSessionId = null,
  expectedVersion = null,
  allowLegacyVersion = false,
  allowMissingState = false
} = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { record: null, reason: 'not-an-object' };
  }

  if (raw.schemaVersion !== SESSION_SCHEMA_VERSION && !allowLegacyVersion) {
    return { record: null, reason: 'schema-version' };
  }

  const identity = String(raw.identity || '');
  if (!identity) return { record: null, reason: 'missing-identity' };
  if (expectedIdentity && identity !== expectedIdentity) {
    return { record: null, reason: 'identity-mismatch' };
  }

  const sessionId = String(raw.sessionId || '');
  if (!sessionId) return { record: null, reason: 'missing-session-id' };
  if (expectedSessionId && sessionId !== expectedSessionId) {
    return { record: null, reason: 'session-id-mismatch' };
  }

  const version = Number.parseInt(raw.version, 10);
  if (!Number.isFinite(version) || version < 0) return { record: null, reason: 'bad-version' };
  if (expectedVersion !== null && version !== expectedVersion) {
    return { record: null, reason: 'version-mismatch' };
  }

  // A `state` that is present but unknown is corruption and is rejected. Defaulting it to
  // `active` is what allowed a damaged record to pass as a usable session (FA-06); a *missing*
  // `state` is only tolerated where an older writer is known to produce that shape.
  const rawState = raw.state;
  if (rawState !== undefined && rawState !== null && rawState !== '') {
    if (rawState !== SESSION_STATE_ACTIVE && rawState !== SESSION_STATE_ENDED) {
      return { record: null, reason: 'bad-state' };
    }
  } else if (!allowMissingState) {
    return { record: null, reason: 'missing-state' };
  }

  const state = rawState === SESSION_STATE_ENDED ? SESSION_STATE_ENDED : SESSION_STATE_ACTIVE;

  if (state === SESSION_STATE_ENDED) {
    return {
      record: { schemaVersion: SESSION_SCHEMA_VERSION, identity, sessionId, version, state, user: null, accessToken: null, refreshToken: null, expiresAt: null, refreshExpiresAt: null },
      reason: 'ended'
    };
  }

  const accessToken = typeof raw.accessToken === 'string' ? raw.accessToken : '';
  const refreshToken = typeof raw.refreshToken === 'string' ? raw.refreshToken : '';
  if (!accessToken || !refreshToken) return { record: null, reason: 'missing-token' };
  if (accessToken === refreshToken) return { record: null, reason: 'token-alias' };

  const expiresAt = toEpochSeconds(raw.expiresAt);
  const refreshExpiresAt = toEpochSeconds(raw.refreshExpiresAt);
  if (expiresAt === null) return { record: null, reason: 'bad-expires-at' };
  if (refreshExpiresAt === null) return { record: null, reason: 'bad-refresh-expires-at' };
  if (refreshExpiresAt < expiresAt) return { record: null, reason: 'expiry-order' };

  const user = normalizeUser(raw.user);
  if (raw.user !== null && raw.user !== undefined && user === null) {
    return { record: null, reason: 'bad-user' };
  }

  return {
    record: {
      schemaVersion: SESSION_SCHEMA_VERSION,
      identity,
      sessionId,
      version,
      state: SESSION_STATE_ACTIVE,
      user,
      accessToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt
    },
    reason: 'ok'
  };
}

/**
 * The public validator name used by the store and the tests. Kept separate from the normaliser so
 * a caller cannot mutate while validating.
 *
 * @returns {{ok: boolean, record: object|null, reason: string}}
 */
export function validateSessionSnapshot(input, options = {}) {
  const { record, reason } = normalizeSessionRecord(input, options);
  return { ok: Boolean(record), record, reason };
}

function buildReadResult(status, record, reason, source = SESSION_RECORD_SOURCE.NONE) {
  return { status, record, reason, source };
}

/**
 * Reads the canonical record and reports *what it is* instead of collapsing every unusable state
 * into `null`. A tombstone is a decision, not an absence (FA-01); a record that exists but cannot
 * be validated is a different decision again (FA-07).
 *
 * @returns {{status: string, record: object|null, reason: string, source: string}}
 */
export function readSessionState({ storage = defaultStorage(), expectedIdentity = '', expectedSessionId = null } = {}) {
  if (!storage) {
    return buildReadResult(SESSION_READ_STATUS.UNAVAILABLE, null, 'no-storage');
  }

  const raw = readRaw(storage, SESSION_RECORD_STORAGE_KEY);

  if (isReadFailure(raw)) {
    return buildReadResult(SESSION_READ_STATUS.UNAVAILABLE, null, 'read-failed', SESSION_RECORD_SOURCE.NONE);
  }

  if (raw === null || raw === '') {
    return buildReadResult(SESSION_READ_STATUS.ABSENT, null, 'absent');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    return buildReadResult(SESSION_READ_STATUS.INVALID, null, 'corrupt-json', SESSION_RECORD_SOURCE.RECORD);
  }

  const result = normalizeSessionRecord(parsed, { expectedIdentity, expectedSessionId });
  if (!result.record) {
    return buildReadResult(SESSION_READ_STATUS.INVALID, null, result.reason, SESSION_RECORD_SOURCE.RECORD);
  }

  const status = result.record.state === SESSION_STATE_ENDED
    ? SESSION_READ_STATUS.ENDED
    : SESSION_READ_STATUS.ACTIVE;

  return buildReadResult(status, result.record, result.reason, SESSION_RECORD_SOURCE.RECORD);
}

/**
 * Backwards-compatible reader. `ended` records are returned as records (callers that want a usable
 * session must check `state`), which is the behaviour change that closes FA-01.
 */
export function readSessionRecord(options = {}) {
  const { status, record, reason, source } = readSessionState(options);
  return { record, source, reason, status };
}

/** Only the usable session, or null. A tombstone is never a usable session. */
export function readActiveSessionRecord(options = {}) {
  const { status, record, reason, source } = readSessionState(options);
  if (status !== SESSION_READ_STATUS.ACTIVE) return { record: null, source, reason, status };
  return { record, source, reason, status };
}

/**
 * One-time migration of a pre-record session. Only a snapshot that is internally consistent —
 * both tokens, a second-precision expiry pair and the identity binding of the issuing server — is
 * adopted. Anything else is left for a fresh login, and the identity is never guessed from the
 * endpoint that happens to be configured now.
 */
export function readLegacySession({ storage = defaultStorage(), expectedIdentity = '' } = {}) {
  const accessTokenRaw = readRaw(storage, LEGACY_SESSION_KEYS.accessToken);
  const refreshTokenRaw = readRaw(storage, LEGACY_SESSION_KEYS.refreshToken);
  const userRaw = readRaw(storage, LEGACY_SESSION_KEYS.user);
  const identityRaw = readRaw(storage, LEGACY_SESSION_KEYS.sessionIdentity);
  const expiresAtRaw = readRaw(storage, LEGACY_SESSION_KEYS.expiresAt);
  const refreshExpiresAtRaw = readRaw(storage, LEGACY_SESSION_KEYS.refreshExpiresAt);

  if ([accessTokenRaw, refreshTokenRaw, userRaw, identityRaw, expiresAtRaw, refreshExpiresAtRaw]
    .some(isReadFailure)) {
    return {
      record: null,
      present: false,
      source: SESSION_RECORD_SOURCE.NONE,
      reason: 'legacy-unavailable'
    };
  }

  const accessToken = accessTokenRaw || '';
  const refreshToken = refreshTokenRaw || '';
  const user = parseUser(userRaw);
  const identity = identityRaw || '';
  const expiresAt = toEpochSeconds(expiresAtRaw);
  const refreshExpiresAt = toEpochSeconds(refreshExpiresAtRaw);

  // "Nothing was persisted" and "something was persisted but cannot be trusted" must stay
  // distinguishable: the first means nothing to do, the second means a fresh login is required.
  const present = Boolean(accessToken || refreshToken || user || identity || expiresAt || refreshExpiresAt);

  const inconsistent =
    !accessToken || !refreshToken || accessToken === refreshToken
    || user === null || user === undefined
    || !identity || (expectedIdentity && identity !== expectedIdentity)
    || expiresAt === null || refreshExpiresAt === null || refreshExpiresAt < expiresAt;

  if (inconsistent) {
    return {
      record: null,
      present,
      source: present ? SESSION_RECORD_SOURCE.LEGACY : SESSION_RECORD_SOURCE.NONE,
      reason: present ? 'legacy-untrusted' : 'legacy-absent'
    };
  }

  return {
    record: {
      schemaVersion: SESSION_SCHEMA_VERSION,
      identity,
      sessionId: '',
      version: 0,
      state: SESSION_STATE_ACTIVE,
      user,
      accessToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt
    },
    present: true,
    source: SESSION_RECORD_SOURCE.LEGACY,
    reason: 'legacy-migratable'
  };
}

/** Persists a full snapshot. Returns false when storage refused the write. */
export function writeSessionRecord(record, { storage = defaultStorage() } = {}) {
  if (!storage) return false;

  const normalized = normalizeSessionRecord(record, { allowMissingState: true });
  if (!normalized.record) return false;

  const stored = writeRaw(storage, SESSION_RECORD_STORAGE_KEY, JSON.stringify(normalized.record));
  // The mirror is best effort: a full record without a mirror is still a valid session, while a
  // partially written record is not, so the canonical write decides the reported result.
  writeLegacyMirror(storage, normalized.record);

  return stored;
}

/**
 * Ends the session: writes a tombstone so other tabs and any refresh still in flight can see the
 * session is over, then drops the legacy keys.
 */
export function writeSessionTombstone({ identity, sessionId, version = 0 }, { storage = defaultStorage() } = {}) {
  if (!storage) return false;

  removeLegacyKeys(storage);
  return writeRaw(storage, SESSION_RECORD_STORAGE_KEY, JSON.stringify({
    schemaVersion: SESSION_SCHEMA_VERSION,
    identity: String(identity || ''),
    sessionId: String(sessionId || ''),
    version: Math.max(0, Number.parseInt(version, 10) || 0) + 1,
    state: SESSION_STATE_ENDED,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    refreshExpiresAt: null
  }));
}

/**
 * Drops the per-key legacy layout immediately. Called synchronously when a session ends, so a
 * bearer that belonged to the finished session is gone from storage before this tab can be closed
 * and before the (asynchronous) tombstone write completes.
 */
export function purgeLegacySessionKeys({ storage = defaultStorage() } = {}) {
  if (!storage) return false;
  return removeLegacyKeys(storage);
}

/** Removes every local trace of the session, including the legacy per-key layout. */
export function purgeSession({ storage = defaultStorage() } = {}) {
  if (!storage) return false;
  const removed = removeRaw(storage, SESSION_RECORD_STORAGE_KEY);
  removeLegacyKeys(storage);
  return removed;
}

/** The next version number to write for `record`, so writers never reuse a version. */
export function nextRecordVersion(record) {
  const version = Number.parseInt(record?.version, 10);
  return Number.isFinite(version) && version >= 0 ? version + 1 : 1;
}

const observedVersionOf = (observed) => {
  const version = Number.parseInt(observed?.record?.version, 10);
  return Number.isFinite(version) ? version : null;
};

/**
 * True when two observations describe the **same lifecycle**: the same API identity *and* the same
 * client session id.
 *
 * Identity is part of the answer, not a detail. `auth-session-record` is one key on one origin and
 * may legitimately hold a record issued by a different API identity — the user re-pointed the
 * endpoint, or two configurations share a host. Comparing only `sessionId` made such a record look
 * like the caller's own, and an `end` of identity A then wrote its tombstone over identity B's live
 * session (FR6-D). An empty `sessionId` on either side is never the same lifecycle: the pre-record
 * shape carries no lifecycle at all, so it cannot be matched by guessing.
 *
 * @param {object|null} left
 * @param {object|null} right
 * @returns {boolean}
 */
export function isSameLifecycle(left, right) {
  if (!left || !right) return false;
  const leftSession = String(left.sessionId || '');
  const rightSession = String(right.sessionId || '');
  if (!leftSession || !rightSession) return false;
  return leftSession === rightSession
    && String(left.identity || '') === String(right.identity || '');
}

const sameLifecycle = isSameLifecycle;

/**
 * Decides what an operation may do with the record it just re-read under the writer lock.
 *
 * This is the whole race policy in one pure function, and it is keyed on **what the writer is
 * doing**, not on a version comparison shared by everybody:
 *
 *  - `end` ends the *lifecycle* it targets. A rotation or profile write of that same lifecycle that
 *    landed first is not a reason to refuse: refusing is exactly how a logout left a live session
 *    behind. What `end` must never do is touch a record owned by a **different** lifecycle.
 *  - `rotate`/`profile` may only extend the newest snapshot of the lifecycle they belong to. They
 *    refuse a tombstone and a foreign lifecycle outright. A **builder** merges into whatever is
 *    current, because the record it is extending is the one it re-read inside the lock; a **fixed
 *    record** asserts a specific version instead, and is refused as `snapshot-moved` when the record
 *    moved past it, because writing it would roll back newer data.

 *  - `login` is a new lifecycle and may take over, which is what lets a sign-in follow a logout.
 *  - `migrate` is the one operation that may only run when nothing is stored at all.
 *
 * @param {string} operation one of `SESSION_OPERATION`
 * @param {{observed: {status: string, record: object|null}, target: object|null}} input
 * @returns {{decision: string, reason: string|null}}
 */
export function decideCommit(operation, { observed, target, allowReplacingUntrusted = false }) {
  const record = observed?.record || null;
  const status = observed?.status || SESSION_READ_STATUS.ABSENT;

  if (operation === SESSION_OPERATION.END) {
    if (allowReplacingUntrusted && !sameLifecycle(record, target)) {
      // The caller has declared the stored record unusable and that a new login is required — the
      // boot path, after its own reader rejected the record. That is a decision made with the
      // scoped read in hand, and this structural re-read cannot re-derive it: from here the record
      // looks fine. So the verdict is honoured, and only for a lifecycle this end does not own,
      // which is the only case in which the record's own identity matters.
      return { decision: COMMIT_DECISION.PROCEED, reason: 'replace-untrusted-record' };
    }

    if (status === SESSION_READ_STATUS.ENDED) {
      // Already over, for exactly this session: repeating the end must not raise the version and
      // must not make every other tab see a second write for one logout (FA-02).
      return sameLifecycle(record, target)
        ? { decision: COMMIT_DECISION.IDEMPOTENT, reason: 'already-ended' }
        : { decision: COMMIT_DECISION.REFUSE, reason: 'foreign-lifecycle' };
    }

    if (status === SESSION_READ_STATUS.ACTIVE && !sameLifecycle(record, target)) {
      // A newer login owns the record. Ending the previous session must not delete it.
      return { decision: COMMIT_DECISION.REFUSE, reason: 'foreign-lifecycle' };
    }

    if (status === SESSION_READ_STATUS.INVALID || status === SESSION_READ_STATUS.UNAVAILABLE) {
      // A record this tab cannot read is a record this tab does not own. Replacing it with a
      // tombstone is only defensible when the caller has *already decided* the record is
      // untrustworthy — the boot path that found an unusable record and requires a new login — and
      // says so explicitly. A logout does not get to make that decision on its own.
      return allowReplacingUntrusted
        ? { decision: COMMIT_DECISION.PROCEED, reason: 'replace-untrusted-record' }
        : { decision: COMMIT_DECISION.REFUSE, reason: status === SESSION_READ_STATUS.UNAVAILABLE ? 'unreadable-record' : 'untrusted-record' };
    }

    // Absent, or a record that is genuinely gone: write the tombstone.
    return { decision: COMMIT_DECISION.PROCEED, reason: 'end-lifecycle' };
  }

  if (operation === SESSION_OPERATION.ROTATE || operation === SESSION_OPERATION.PROFILE) {
    if (status === SESSION_READ_STATUS.ENDED) {
      return { decision: COMMIT_DECISION.REFUSE, reason: 'session-ended' };
    }

    if (status === SESSION_READ_STATUS.ABSENT) {
      return { decision: COMMIT_DECISION.REFUSE, reason: 'missing-snapshot' };
    }

    if (status !== SESSION_READ_STATUS.ACTIVE) {
      return { decision: COMMIT_DECISION.REFUSE, reason: 'unreadable-record' };
    }

    if (!sameLifecycle(record, target)) {
      return { decision: COMMIT_DECISION.REFUSE, reason: 'foreign-lifecycle' };
    }

    // A builder merges into whatever is current, so there is no version to be stale against. A fixed
    // record asserts a specific version and is refused when the record moved past it: writing it
    // anyway would roll back data another writer has already committed.
    if (target && !target.merge) {
      const observedVersion = observedVersionOf(observed);
      const targetVersion = Number.parseInt(target.version, 10);

      if (Number.isFinite(observedVersion) && Number.isFinite(targetVersion) && observedVersion > targetVersion) {
        return { decision: COMMIT_DECISION.REFUSE, reason: 'snapshot-moved' };
      }
    }

    return { decision: COMMIT_DECISION.PROCEED, reason: 'extend-lifecycle' };
  }

  if (operation === SESSION_OPERATION.MIGRATE) {
    // Absent-only, re-checked *inside* the writer lock. A record that appeared between the init
    // read and this write is a real session and legacy material may not replace it (FA-07).
    return status === SESSION_READ_STATUS.ABSENT
      ? { decision: COMMIT_DECISION.PROCEED, reason: 'absent-legacy-migration' }
      : { decision: COMMIT_DECISION.REFUSE, reason: 'legacy-migration-not-applicable' };
  }

  if (operation === SESSION_OPERATION.LOGIN) {
    if (sameLifecycle(record, target)) {
      return { decision: COMMIT_DECISION.REFUSE, reason: 'duplicate-lifecycle' };
    }

    // A login is a new lifecycle and may take over — that is what makes "sign in again after signing
    // out" work. It may take over a record of a *different* lifecycle, but never one it cannot read:
    // overwriting an untrustworthy record is a decision the boot path makes explicitly, not a
    // side effect of signing in.
    if (status === SESSION_READ_STATUS.INVALID || status === SESSION_READ_STATUS.UNAVAILABLE) {
      return allowReplacingUntrusted
        ? { decision: COMMIT_DECISION.PROCEED, reason: 'replace-untrusted-record' }
        : { decision: COMMIT_DECISION.REFUSE, reason: status === SESSION_READ_STATUS.UNAVAILABLE ? 'unreadable-record' : 'untrusted-record' };
    }

    return { decision: COMMIT_DECISION.PROCEED, reason: 'new-lifecycle' };
  }

  // Unknown operation. Refusing is the only safe answer: the `login` rule is the one decision in this
  // function that may replace a live session, and an unrecognised operation must never inherit it.
  return { decision: COMMIT_DECISION.REFUSE, reason: 'unknown-operation' };
}

/**
 * A cancellation fence for a queued lock request.
 *
 * `Promise.race([timeout, locks.request(...)])` is **not** enough on its own: a request that loses
 * the race is still queued inside the lock manager and will eventually be granted, at which point
 * its callback runs — minutes later, with a fresh re-read, and writes. So the timeout does not just
 * stop the caller waiting; it marks the request as cancelled, and the callback checks that mark
 * before it does anything at all. A cancelled request never writes, never adopts and never publishes,
 * no matter when it is finally granted (FRONTEND-SESSION-DESIGN.vi.md §7).
 */
function createLockFence(timeoutMs) {
  const fence = { cancelled: false, reason: null, timer: null };

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return fence;

  fence.timer = setTimeout(() => {
    fence.cancelled = true;
    fence.reason = 'lock-acquisition-timeout';
  }, timeoutMs);

  // A pending acquisition timer must not keep a Node process (or a test runner) alive on its own.
  if (fence.timer && typeof fence.timer.unref === 'function') fence.timer.unref();

  return fence;
}

const releaseLockFence = (fence) => {
  if (fence?.timer) {
    clearTimeout(fence.timer);
    fence.timer = null;
  }
};

/**
 * The only guarded writer, and the only place that mutates the canonical record.
 *
 * One critical section, in this order, with no `await` in it:
 *   1. re-check the caller's intent with the synchronous `isCurrent` predicate;
 *   2. re-read the record;
 *   3. let `decideCommit` rule for the operation;
 *   4. build the final record with a synchronous builder that sees the newest observation;
 *   5. validate it with the one validator;
 *   6. write exactly one record.
 *
 * Step 1 is what stops a rotation that was queued before a logout from reviving the session it was
 * about to belong to, and step 4 is what lets a rotation or a profile update merge into the newest
 * snapshot instead of overwriting it.
 *
 * Step 2 reads the record **structurally**: it is not filtered by API identity. The public scoped
 * reader may legitimately answer "that is not mine", but under the writer lock the record has to be
 * observed as it is — with its own identity and session id — so the operation can be *authorised*
 * against it. A filtered read turned every foreign-but-valid record into `invalid`, and `end` then
 * treated that as permission to replace it (FR6-D).
 *
 * `next` may be a complete record or a synchronous builder `(observed) => record | null`. The
 * builder form is how an operation merges into whatever is current; it must not do I/O. Returning
 * `null` declines the write; returning `observed.record` unchanged means "already stored".
 *
 * @param {object|((observed: object) => object|null)} next
 * @param {{operation?: string, expected?: object|null, target?: object|null, context?: object|null,
 *          isCurrent?: ((context: object|null) => boolean)|null, storage?: object,
 *          locks?: object|null, identity?: string, onCommitted?: Function,
 *          allowReplacingUntrusted?: boolean, lockTimeoutMs?: number}} options
 * @returns {Promise<{status: string, record: object|null, reason: string|null}>}
 */
export async function commitSession(next, {
  operation = SESSION_OPERATION.LOGIN,
  expected = null,
  target = null,
  context = null,
  isCurrent = null,
  storage = defaultStorage(),
  locks = getDefaultLocks(),
  identity = '',
  onCommitted = null,
  allowReplacingUntrusted = false,
  lockTimeoutMs = DEFAULT_LOCK_ACQUISITION_TIMEOUT_MS,
} = {}) {
  const fail = (status, reason) => ({ status, record: null, reason });

  if (!storage) return fail(SESSION_COMMIT_STATUS.UNAVAILABLE, 'no-storage');

  // Fail closed. Without a lock this read-then-write cannot be atomic, and there is no honest way
  // to pretend otherwise: a lease, a "version" or a re-read after the write all still lose to a
  // writer that commits in between. Reduced mode reports that and writes nothing.
  if (!isWriterSerializationAvailable(locks)) {
    return fail(SESSION_COMMIT_STATUS.UNAVAILABLE, 'no-writer-serialization');
  }

  const validate = (candidate) => normalizeSessionRecord(candidate, { expectedIdentity: identity || undefined });

  // A fixed record can be validated up front; a builder can only be validated once it has seen the
  // record, so its validation happens below — always before the `setItem`, never after.
  if (typeof next !== 'function') {
    const validated = validate(next);
    if (!validated.record) return fail(SESSION_COMMIT_STATUS.INVALID, validated.reason);
  }

  const fence = createLockFence(lockTimeoutMs);

  const writeUnderLock = async () => {
    // 0. The queue wait already ended without ever granting this request. The request is still
    //    inside the lock manager, so it is checked here rather than trusted, and it does nothing.
    if (fence.cancelled) {
      return fail(SESSION_COMMIT_STATUS.UNAVAILABLE, fence.reason || 'lock-acquisition-timeout');
    }

    // 1. Intent first. A lifecycle that was ended, replaced or re-pointed while this writer waited
    //    for the lock must not touch the record, however valid its payload still is.
    if (typeof isCurrent === 'function' && !isCurrent(context)) {
      return fail(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
    }

    // 2. Re-read under the lock, structurally: no identity filter. See the note on the signature.
    const observed = readSessionState({ storage });

    // 3. The operation decides. A fixed record is its own target; a builder says which lifecycle it
    //    is extending, because the record it will produce does not exist yet.
    const baseTarget = typeof next === 'function' ? null : validate(next).record;
    const decision = decideCommit(operation, {
      observed,
      target: baseTarget || target || expected,
      allowReplacingUntrusted,
    });

    if (decision.decision === COMMIT_DECISION.REFUSE) {
      return { status: SESSION_COMMIT_STATUS.STALE, record: observed.record, reason: decision.reason };
    }

    if (decision.decision === COMMIT_DECISION.IDEMPOTENT) {
      // Nothing to write. The observed record already *is* the result this operation wanted, so it
      // is returned without a write, a version bump, or a second notification.
      return { status: SESSION_COMMIT_STATUS.APPLIED, record: observed.record, reason: decision.reason };
    }

    // 4. Build against the newest observation.
    const candidate = typeof next === 'function' ? next(observed) : baseTarget;
    if (!candidate) return fail(SESSION_COMMIT_STATUS.INVALID, 'builder-declined');

    // A builder that hands back the record it was given is saying "this is already what is
    // stored": no write, no version bump, no second notification for a rotation another tab or
    // another request already applied.
    if (candidate === observed.record) {
      return { status: SESSION_COMMIT_STATUS.APPLIED, record: observed.record, reason: 'already-current' };
    }

    // 5. One validator, before any mutation.
    const validated = validate(candidate);
    if (!validated.record) return fail(SESSION_COMMIT_STATUS.INVALID, validated.reason);

    const record = validated.record;
    const observedVersion = observedVersionOf(observed);

    // A new lifecycle starts above whatever version the record holds, so the version stays a single
    // monotonic sequence for the whole life of the key and a lagging writer is always detectable.
    const versioned = !expected && Number.isFinite(observedVersion) && record.version <= observedVersion
      ? validate({ ...record, version: observedVersion + 1 })
      : validated;

    if (!versioned.record) return fail(SESSION_COMMIT_STATUS.INVALID, versioned.reason);

    const isTombstone = versioned.record.state === SESSION_STATE_ENDED;
    // The version bump is the tombstone's own sequence number: a slower writer learns how far behind
    // it is without ever reading token material.
    const finalRecord = isTombstone && Number.isFinite(observedVersion)
      ? validate({ ...versioned.record, version: observedVersion + 1 })
      : versioned;

    if (!finalRecord.record) return fail(SESSION_COMMIT_STATUS.INVALID, finalRecord.reason);

    // 6. Write exactly one record.
    if (isTombstone) removeLegacyKeys(storage);

    const stored = writeRaw(storage, SESSION_RECORD_STORAGE_KEY, JSON.stringify(finalRecord.record));
    if (!stored) {
      return fail(SESSION_COMMIT_STATUS.STORAGE_FAILURE, isTombstone ? 'tombstone-write-failed' : 'write-failed');
    }

    if (!isTombstone) writeLegacyMirror(storage, finalRecord.record);

    return { status: SESSION_COMMIT_STATUS.APPLIED, record: finalRecord.record, reason: decision.reason };
  };

  let result;
  let waitExpired = false;

  try {
    result = await locks.request(SESSION_WRITE_LOCK_NAME, writeUnderLock);
  } catch (error) {
    // A lock manager that rejects is a storage-layer problem, not an invalid session: report it as
    // a failure so the caller degrades instead of believing the write landed.
    return fail(SESSION_COMMIT_STATUS.STORAGE_FAILURE, 'lock-request-failed');
  } finally {
    waitExpired = fence.cancelled;
    releaseLockFence(fence);
  }

  if (waitExpired) {
    // The fence fired while this request was queued or while it ran. The callback already refused to
    // write, so the record is untouched; report the timeout so the caller can distinguish "did not
    // get in" from "got in and was refused".
    return fail(SESSION_COMMIT_STATUS.UNAVAILABLE, fence.reason || 'lock-acquisition-timeout');
  }

  if (!result) return fail(SESSION_COMMIT_STATUS.STORAGE_FAILURE, 'lock-returned-nothing');

  if (result.status === SESSION_COMMIT_STATUS.APPLIED && typeof onCommitted === 'function') {
    onCommitted(result.record, result.reason);
  }

  return result;
}

/**
 * Coordinated version rollback/re-upgrade only: close other app tabs first, then reload
 * immediately after cleanup. This cannot revoke credentials or clear another tab's memory.
 * Endpoint preference and unrelated origin storage deliberately survive.
 */
export function invalidateAuthForRollback(storage = defaultStorage()) {
  const keys = ['auth-session-record', 'auth-api-identity', 'api-identity', 'user',
    'token', 'refresh_token', 'expires_at', 'refresh_expires_at'];
  const failedKeys = [];
  for (const key of keys) {
    try { storage.removeItem(key); } catch { failedKeys.push(key); }
  }
  return { status: failedKeys.length ? 'storage-failure' : 'cleared', failedKeys };
}
