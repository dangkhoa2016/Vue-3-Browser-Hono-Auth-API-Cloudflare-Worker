const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';
import { i18n } from '../i18n.js';
import { getToastStore, getModalStore } from '../appServices.js';
import {
  beginLoginAttempt as beginLoginIntent,
  captureContext,
  createSessionId,
  getApiIdentity,
  getSessionEpoch,
  getSessionId,
  isCurrentContext,
  invalidateContext,
  onApiIdentityChange,
  setSessionId,
  syncApiIdentityFromStorage,
} from '../api/apiIdentity.js';
import {
  SESSION_COMMIT_STATUS,
  SESSION_OPERATION,
  SESSION_READ_STATUS,
  SESSION_RECORD_SOURCE,
  SESSION_SCHEMA_VERSION,
  SESSION_STATE_ACTIVE,
  SESSION_STATE_ENDED,
  commitSession,
  isSameLifecycle,
  isWriterSerializationAvailable,
  isSessionStorageAvailable,
  nextRecordVersion,
  readLegacySession,
  readSessionState,
  toEpochSeconds,
  validateSessionSnapshot,
} from '../api/sessionStorage.js';
import { SESSION_EVENT_TYPE, classifyRefreshError, createSessionCoordinator } from '../api/sessionCoordinator.js';
import { resetProtectedState } from '../api/protectedState.js';

const DEFAULT_SESSION_CONFLICT_TIMEOUT_MS = 5000;

/** Typed failures a caller can branch on instead of parsing a null token (FRONTEND-MASTER-REMEDIATION §4.3). */
export const AUTH_ERROR_CODES = {
  STALE_SESSION: 'STALE_SESSION',
  REAUTH_REQUIRED: 'REAUTH_REQUIRED',
  AUTH_TEMPORARILY_UNAVAILABLE: 'AUTH_TEMPORARILY_UNAVAILABLE'
};

/** How durable the session in this tab is. See FRONTEND-SESSION-DESIGN.vi.md §6. */
export const SESSION_PERSISTENCE = Object.freeze({
  DURABLE: 'durable',
  MEMORY_ONLY: 'memory-only'
});

const commitResult = (status, reason, record = null) => ({ status, record, reason });

function createAuthError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  error.isAuthError = true;
  return error;
}

/** Extracts the session payload of a login/refresh response, or null when it is not one. */
export function readSessionPayload(data) {
  const body = data && typeof data === 'object' ? data : null;
  if (!body) return null;

  const source = body.data && typeof body.data === 'object' ? body.data : null;
  if (!source) return null;

  const accessToken = source.access_token;
  const refreshToken = source.refresh_token;
  if (typeof accessToken !== 'string' || !accessToken) return null;
  if (typeof refreshToken !== 'string' || !refreshToken) return null;

  // Strict second-precision parse. `parseInt` would accept milliseconds and `'123garbage'`, both of
  // which then look like a valid expiry to every later step (FA-06).
  const expiresAt = toEpochSeconds(source.expires_at);
  const refreshExpiresAt = toEpochSeconds(source.refresh_expires_at);

  return {
    user: source.user && typeof source.user === 'object' ? source.user : null,
    accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt
  };
}

// Pinia auth store
export const useAuthStore = defineStore('auth', {
  // State
  state: () => ({
    user: null,
    token: null,
    refreshToken: null,
    expiresAt: null,
    refreshExpiresAt: null,
    isRefreshing: false,
    requiresReauth: false,
    reauthNoticeShown: false,
    initialized: false,
    /** Why a new login is required: 'invalid-session' or 'identity-change'. */
    reauthReason: null,
    /** API identity (origin + base path) that issued the persisted session. */
    apiIdentity: null,
    /** Client lifecycle id of the current login session. Never the user id. */
    sessionId: getSessionId(),
    /** Monotonic epoch; a response captured under an older epoch may not touch the session. */
    sessionGeneration: getSessionEpoch(),
    /** Seconds since epoch, refreshed by syncClock() at request time so expiry is not cached. */
    clockNow: Math.floor(Date.now() / 1000),
    /** Bounded wait for the tab that wins a refresh race (contract v1: 409 REFRESH_ALREADY_ROTATED). */
    sessionConflictTimeoutMs: DEFAULT_SESSION_CONFLICT_TIMEOUT_MS,
    /** Set when the last logout could not confirm server-side revocation. */
    lastLogoutResult: null,
    /** True when the persisted snapshot could not be read or written; the session is memory-only. */
    storageDegraded: false,
    /** Whether this tab's session is durable in storage, or only lives in memory (reduced mode). */
    sessionPersistence: isWriterSerializationAvailable() ? SESSION_PERSISTENCE.DURABLE : SESSION_PERSISTENCE.MEMORY_ONLY,
    /** Why the last guarded write was refused or failed, for the UI and for the tests. */
    lastCommitReason: null
  }),

  // Getters
  getters: {
    isAuthenticated: (state) => !!state.user && !!state.token,

    isAccessTokenExpired() {
      if (!this.expiresAt) return true;
      // 60s buffer so a token is refreshed before it actually expires.
      // Evaluated against the synced clock: a Date.now() read inside a getter is not reactive (F04).
      return this.clockNow >= (this.expiresAt - 60);
    },

    isRefreshTokenExpired() {
      if (!this.refreshExpiresAt) return true;
      return this.clockNow >= this.refreshExpiresAt;
    },

    /**
     * Whether the access token is stale. This is a UI/scheduling hint only: it never means "a
     * refresh is running, so a stale token is good enough". Callers that need a usable token await
     * `refreshAccessToken(context)` instead (review OF-03).
     */
    shouldRefreshToken() {
      return this.isAccessTokenExpired && !this.isRefreshTokenExpired;
    },

    /** True when the persisted session belongs to the API identity currently configured. */
    isSessionBoundToCurrentApi() {
      return !!this.apiIdentity && this.apiIdentity === getApiIdentity();
    }
  },

  // Actions
  actions: {
    /**
     * Refreshes the reactive clock used by the expiry getters. Called on every request.
     */
    syncClock() {
      this.clockNow = Math.floor(Date.now() / 1000);
      return this.clockNow;
    },

    /**
     * Registers a session write issued from a **synchronous** entry point, so it can be drained.
     *
     * Every caller that can be async — `commitLogin`, `applyRotation`, `updateSessionUser`,
     * `clearLocalSession` — returns the real `CommitResult` and awaits it. Only `init()` and the
     * identity-change subscription are synchronous callbacks that cannot; they register the write
     * here so a boot sequence or a test can still wait for the record to become durable.
     *
     * @param {Promise<object>} promise the commit
     * @returns {Promise<object>} the same promise, never rejecting
     */
    trackSessionWrite(promise) {
      const settled = Promise.resolve(promise)
        .catch((error) => {
          console.warn('[AuthStore] a session write failed unexpectedly:', error);
          return commitResult(SESSION_COMMIT_STATUS.STORAGE_FAILURE, 'write-threw');
        });

      this.pendingSessionWrite = settled;
      void settled.then(() => {
        if (this.pendingSessionWrite === settled) this.pendingSessionWrite = null;
      });

      return settled;
    },

    /** Resolves with the last write registered by a synchronous entry point, or `null`. */
    flushSessionWrites() {
      return this.pendingSessionWrite || Promise.resolve(null);
    },

    /**
     * Starts a login intent and returns the immutable context that must be handed back to
     * `commitLogin`. Starting a new intent invalidates every older in-flight login, so the latest
     * intent wins no matter which response arrives first (review OF-01).
     */
    beginLoginAttempt() {
      // A new login intent means the previous logout no longer describes the current session.
      this._logoutSupersededByLogin = true;
      const context = beginLoginIntent();
      this.sessionGeneration = context.epoch;
      this.isRefreshing = false;
      return context;
    },

    /** Snapshot of the session context this page currently owns. */
    captureContext() {
      return captureContext();
    },

    isCurrentContext(context) {
      return isCurrentContext(context);
    },

    checkLoginSupport() {
      if (!isWriterSerializationAvailable()) return { supported: false, reason: 'no-writer-serialization' };
      if (!isSessionStorageAvailable()) return { supported: false, reason: 'storage-unavailable' };
      return { supported: true, reason: null };
    },

    /**
     * Backwards-compatible entry point for callers that hold a login response directly.
     *
     * It registers its own login intent, so a call made while an older login is still in flight
     * supersedes that older intent rather than racing it (review OF-01). New code should call
     * `beginLoginAttempt()` before sending the request and `commitLogin()` with that context.
     */
    login(user, accessToken, refreshToken, expiresAt, refreshExpiresAt) {
      const context = this.beginLoginAttempt();

      return this.commitLogin(
        { user, accessToken, refreshToken, expiresAt, refreshExpiresAt },
        context
      );
    },

    /**
     * Commits a login payload, but only while the context that issued the request is still live.
     * A late response from an older login, or from a previous API identity, is dropped and reported
     * as a `stale` commit result instead of writing tokens into the current session.
     *
     * The payload is validated **before** anything in memory is touched, so a malformed envelope
     * cannot leave the store holding token material its own persistence rejects (FA-06).
     *
     * @returns {Promise<{status: string, record: object|null, reason: string|null}>} the commit result
     */
    async commitLogin(payload, context) {
      if (!isCurrentContext(context)) {
        console.warn('[AuthStore] dropped a login response for a superseded session context');
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
      }

      const identity = context.identity || getApiIdentity();
      const sessionId = createSessionId();
      const validated = validateSessionSnapshot({
        schemaVersion: SESSION_SCHEMA_VERSION,
        identity,
        sessionId,
        version: 1,
        state: SESSION_STATE_ACTIVE,
        user: payload?.user,
        accessToken: payload?.accessToken,
        refreshToken: payload?.refreshToken,
        expiresAt: payload?.expiresAt,
        refreshExpiresAt: payload?.refreshExpiresAt,
      }, { expectedIdentity: identity });

      if (!validated.ok) {
        // An invalid payload is a rejected login, not a storage problem: `storageDegraded` stays
        // false so the UI can report the real reason.
        console.warn('[AuthStore] dropped a login response without a usable session snapshot', {
          reason: validated.reason
        });
        this.lastCommitReason = validated.reason;
        return commitResult(SESSION_COMMIT_STATUS.INVALID, validated.reason);
      }

      // Whatever the previous session cached is not this session's data.
      resetProtectedState('auth:login');

      // A login is a new lifecycle, not a rotation: it may take over whatever the record held, which
      // is what lets a sign-in follow a logout. The context is re-checked inside the lock, so a
      // logout that queued ahead of this commit is the one that wins.
      const result = await this.commitRecord(validated.record, {
        operation: SESSION_OPERATION.LOGIN,
        context,
        isCurrent: isCurrentContext
      }, identity, 'auth:login');

      if (result.status === SESSION_COMMIT_STATUS.UNAVAILABLE) {
        // Owner policy (option 2): unavailable serialization is a refused sign-in.
        // Re-check after the await so a superseded response still reports stale.
        if (!isCurrentContext(context)) {
          return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
        }
        this.lastCommitReason = result.reason;
        return result;
      }

      if (result.status !== SESSION_COMMIT_STATUS.APPLIED) {
        this.lastCommitReason = result.reason;
        return result;
      }

      this.sessionPersistence = SESSION_PERSISTENCE.DURABLE;
      this.lastCommitReason = null;
      // Adopt only what storage actually accepted, and only while the context is still live.
      if (!isCurrentContext(context)) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
      }

      this.adoptRecord(result.record);
      // A tab that logged in has to hear about the other tabs too, even if nothing called `init()`.
      this.bindCrossTabSession();
      this.publishLifecycle(SESSION_EVENT_TYPE.SESSION, result.record);

      return result;
    },

    /**
     * Applies a token rotation of the session that is already live.
     *
     * A rotation keeps the epoch and the session id and only increases the snapshot version, so
     * requests that were legitimately bound to this session are not rejected by their own refresh.
     *
     * The caller must hand over the **predecessor**: the exact credential pair that was sent to the
     * server, captured immediately before the request was dispatched and after the re-read under
     * refresh coordination. That pair is what makes the write a rotation instead of a blind
     * overwrite. Under the writer lock the current pair decides:
     *
     *   - equal to the predecessor -> apply the successor onto whatever metadata is newest;
     *   - equal to the successor     -> already applied, adopt without writing (idempotent);
     *   - equal to neither          -> refused. Something newer won, and an opaque backend token
     *     cannot be ordered by string or by timestamp, so a mismatch is a conflict, not a hint.
     *
     * A profile update that landed between the predecessor and this call only raises the version and
     * keeps the pair, so the newest profile metadata survives the rotation and the rotation is still
     * valid. A predecessor is **required**: a rotation that cannot name what it replaces would
     * overwrite whatever it finds, which is the defect this signature exists to remove (FR6-E).
     *
     * @param {{accessToken: string, refreshToken: string, expiresAt: ?number, refreshExpiresAt: ?number}} snapshot
     * @param {object} context the context the refresh ran under
     * @param {{predecessor: {identity: string, sessionId: string, accessToken: string, refreshToken: string}}} options
     * @returns {Promise<{status: string, record: object|null, reason: string|null}>} the commit result
     */
    async applyRotation(snapshot, context, options = {}) {
      if (!isCurrentContext(context)) {
        console.warn('[AuthStore] dropped a token rotation for a superseded session context');
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
      }

      if (!snapshot || !snapshot.accessToken || !snapshot.refreshToken) {
        return commitResult(SESSION_COMMIT_STATUS.INVALID, 'missing-tokens');
      }

      const predecessor = options?.predecessor || null;
      if (!predecessor || !predecessor.accessToken || !predecessor.refreshToken) {
        // Not a default: an unnamed predecessor is an unconditional overwrite, so it is refused
        // rather than guessed at. A caller with no predecessor has a login or an adoption, not a
        // rotation.
        return commitResult(SESSION_COMMIT_STATUS.INVALID, 'missing-predecessor');
      }

      if (predecessor.accessToken === snapshot.accessToken && predecessor.refreshToken === snapshot.refreshToken) {
        // The "successor" is the predecessor, unchanged. There is no rotation to record, and writing
        // it would raise the version for a pair that was already stored.
        //
        // Only the *pair* counts. A backend may legitimately answer a refresh with a new access
        // token and the same refresh token; that is still a changed pair, and the one validator
        // already refuses a record whose two tokens are the same string (`token-alias`), so nothing
        // about the invariant depends on this check being stricter.
        return commitResult(SESSION_COMMIT_STATUS.INVALID, 'successor-is-predecessor');
      }

      const identity = context.identity || getApiIdentity();

      if (predecessor.identity && String(predecessor.identity) !== String(identity)) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'predecessor-foreign-identity');
      }

      const sessionId = String(predecessor.sessionId || '');

      if (!sessionId) {
        this.lastCommitReason = 'missing-snapshot';
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'missing-snapshot');
      }

      // The tab must still own the lifecycle the credential belonged to. A rotation for a session
      // this tab has already replaced is a response to a request that is no longer this tab's.
      if (this.sessionId && String(this.sessionId) !== sessionId) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'stale-lifecycle');
      }

      // The builder records *why* it declined, because `commitSession` can only report
      // `builder-declined` and a caller needs the real reason.
      let refusal = null;

      const result = await this.commitRecord((current) => {
        if (current.status !== SESSION_READ_STATUS.ACTIVE) {
          refusal = current.status === SESSION_READ_STATUS.ENDED ? 'session-ended' : 'unreadable-record';
          return null;
        }

        if (!isSameLifecycle(current.record, { identity, sessionId })) {
          refusal = 'foreign-lifecycle';
          return null;
        }

        const pair = (record) => `${record.accessToken}\u0000${record.refreshToken}`;
        const currentPair = pair(current.record);
        const successorPair = pair(snapshot);

        // Already applied by another writer while we waited for the lock: nothing to write.
        if (currentPair === successorPair) {
          refusal = 'already-applied';
          return current.record;
        }

        if (currentPair !== pair(predecessor)) {
          // Neither the pair we replaced nor the pair we produced. Something newer won the
          // rotation; writing ours would roll the server's own rotation back.
          refusal = 'predecessor-superseded';
          return null;
        }

        return {
          ...current.record,
          // A rotation carries tokens, not a profile. The `user` in the payload is whatever the
          // caller had when it asked for the refresh, so writing it here would roll back a profile
          // update another writer committed in the meantime (review R5-B). A real user change goes
          // through `updateSessionUser()`, which is a `profile` write of its own.
          accessToken: snapshot.accessToken,
          refreshToken: snapshot.refreshToken,
          expiresAt: snapshot.expiresAt ?? null,
          refreshExpiresAt: snapshot.refreshExpiresAt ?? null,
          version: nextRecordVersion(current.record)
        };
      }, {
        operation: SESSION_OPERATION.ROTATE,
        // The builder merges into whatever the lock finds, so it names the lifecycle it extends
        // rather than a version it insists on.
        target: { identity, sessionId, merge: true },
        context,
        isCurrent: isCurrentContext
      }, identity, 'auth:rotation');

      if (result.status === SESSION_COMMIT_STATUS.INVALID && result.reason === 'builder-declined') {
        const reason = refusal || 'predecessor-superseded';
        this.lastCommitReason = reason;
        return commitResult(SESSION_COMMIT_STATUS.STALE, reason);
      }

      if (result.status !== SESSION_COMMIT_STATUS.APPLIED) {
        this.lastCommitReason = result.reason;
        return result;
      }

      if (refusal === 'already-applied') {
        // Idempotent: the record already holds exactly this pair, so nothing was written and
        // nothing is announced a second time.
        if (!isCurrentContext(context)) {
          return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
        }
        this.adoptRecord(result.record);
        this.lastCommitReason = null;
        return commitResult(SESSION_COMMIT_STATUS.APPLIED, 'already-applied', result.record);
      }

      // Applied, but the session may have been replaced while the lock was held. Never adopt a
      // commit whose context is dead: that is how a queued rotation revives a signed-out session.
      if (!isCurrentContext(context)) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
      }

      this.lastCommitReason = null;
      this.adoptRecord(result.record);
      this.publishLifecycle(SESSION_EVENT_TYPE.SESSION, result.record);

      return result;
    },

    /**
     * Persists a profile change as a **profile** operation. It merges into the newest snapshot of
     * the live session instead of rebuilding it, so it can never roll back a token that a refresh
     * committed a moment earlier (review R5-B).
     *
     * @returns {Promise<{status: string, record: object|null, reason: string|null}>} the commit result
     */
    async updateSessionUser(user, context) {
      if (!isCurrentContext(context)) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
      }

      const identity = this.apiIdentity || getApiIdentity();
      const sessionId = this.sessionId;
      if (!sessionId) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'missing-lifecycle');
      }

      const result = await this.commitRecord((current) => {
        if (current.status !== SESSION_READ_STATUS.ACTIVE) return null;
        if (current.record.state === SESSION_STATE_ENDED) return null;
        if (!isSameLifecycle(current.record, { identity, sessionId })) return null;
        return { ...current.record, user, version: nextRecordVersion(current.record) };
      }, {
        operation: SESSION_OPERATION.PROFILE,
        // Identity is part of the lifecycle this write extends; without it the same record would be
        // refused (or, worse, accepted) for the wrong API identity.
        target: { identity, sessionId, merge: true },
        context,
        isCurrent: isCurrentContext
      }, identity, 'auth:profile');

      if (result.status !== SESSION_COMMIT_STATUS.APPLIED) {
        this.lastCommitReason = result.reason;
        return result;
      }

      if (!isCurrentContext(context)) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
      }

      this.lastCommitReason = null;
      this.adoptRecord(result.record);
      this.publishLifecycle(SESSION_EVENT_TYPE.SESSION, result.record);

      return result;
    },

    /**
     * The single guarded writer. Everything that writes a record goes through here so the
     * tombstone/version/lifecycle rules cannot be bypassed by a caller.
     */
    /**
     * Adopts a record that **another writer already committed**, and reports it in the commit shape
     * the coordinator reads.
     *
     * This is a pure read, and it must stay one. The record is already in storage, so a rotation
     * commit here would raise the version without changing anything and turn a read into a
     * cross-tab write race (FR6-F). It is also not a rotation: there is no predecessor to check,
     * because no credential is being replaced — the successor is already the record.
     *
     * The only thing that can refuse is a dead context. A result that resolves after this tab
     * replaced or ended its session has no side effect at all.
     *
     * @param {object} session the committed record
     * @param {{identity?: string, epoch?: number, source?: string}} meta the context of the refresh
     * @returns {{status: string, record: object|null, reason: string|null}}
     */
    adoptCommitted(session, meta = {}) {
      const identity = meta?.identity || getApiIdentity();
      const context = { identity, epoch: meta?.epoch ?? this.sessionGeneration };

      if (!isCurrentContext(context)) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
      }

      if (!session || !session.accessToken || !session.refreshToken) {
        return commitResult(SESSION_COMMIT_STATUS.INVALID, 'missing-session');
      }

      const adopted = this.adoptSession(session, { identity });

      return adopted
        ? commitResult(SESSION_COMMIT_STATUS.APPLIED, 'adopted', session)
        : commitResult(SESSION_COMMIT_STATUS.STALE, 'adoption-refused');
    },

    async commitRecord(recordOrBuilder, options, identity, reason) {
      const result = await commitSession(recordOrBuilder, {
        ...options,
        identity,
        onCommitted: () => {
          this.storageDegraded = false;
        },
      });

      // Only a real storage problem degrades the session; a rejected or ambiguous snapshot does not.
      // An unreadable record *is* a storage problem, even though nothing was written: the writer
      // refused to replace a record it could not read, and this tab is no longer able to say what the
      // shared session is. Reporting only a failed write would hide exactly the case that matters
      // (FR6-C).
      this.storageDegraded = result.status === SESSION_COMMIT_STATUS.STORAGE_FAILURE
        || result.status === SESSION_COMMIT_STATUS.UNAVAILABLE
        || result.reason === 'unreadable-record';

      if (this.storageDegraded) {
        console.warn(`[AuthStore] the session record could not be persisted (${reason})`, {
          status: result.status,
          reason: result.reason
        });
      }

      return result;
    },

    /**
     * Copies a validated record into the reactive state. Memory only: it never writes storage and
     * never raises a version, so adopting the same record twice is a no-op (review FA-02).
     */
    adoptRecord(record) {
      if (!record || record.state !== SESSION_STATE_ACTIVE) return false;

      this.user = record.user;
      this.token = record.accessToken;
      this.refreshToken = record.refreshToken;
      this.expiresAt = record.expiresAt;
      this.refreshExpiresAt = record.refreshExpiresAt;
      this.requiresReauth = false;
      this.reauthNoticeShown = false;
      this.reauthReason = null;
      this.apiIdentity = record.identity;
      this.sessionId = record.sessionId;
      this.lastLogoutResult = null;
      this.sessionGeneration = getSessionEpoch();
      setSessionId(record.sessionId);
      this.syncClock();
      return true;
    },

    /** Tells other tabs that this one changed the record. Metadata only, never a token. */
    publishLifecycle(type, record) {
      try {
        this.getSessionCoordinator().publishSession(record ? { sessionId: record.sessionId, version: record.version } : null);
      } catch (error) {
        console.warn('[AuthStore] could not publish the session lifecycle event:', error);
      }
      void type;
    },

    /**
     * Reads the persisted record **with its state**. `ended`, `invalid` and `unavailable` are
     * answers, not an absent record: collapsing them into `null` is what let a stale rotation
     * overwrite a tombstone (FA-01).
     */
    readSessionState() {
      return readSessionState({ expectedIdentity: getApiIdentity() });
    },

    /**
     * The usable session, or null. A tombstone, an invalid record and an unreadable storage all
     * yield null here; use `readSessionState()` when the reason matters.
     */
    readPersistedSession() {
      const observed = this.readSessionState();
      if (observed.status !== SESSION_READ_STATUS.ACTIVE) return null;
      return observed.record;
    },

    /**
     * The session this tab holds in memory, shaped like a record, or null.
     *
     * This is the **only** credential source a reduced-mode tab may use. It is never read from the
     * shared record, because in reduced mode the shared record describes a lifecycle this tab does
     * not own (FR6-C).
     */
    readMemorySession() {
      if (!this.token || !this.refreshToken) return null;
      return {
        schemaVersion: SESSION_SCHEMA_VERSION,
        identity: this.apiIdentity || getApiIdentity(),
        sessionId: this.sessionId || '',
        version: 0,
        state: SESSION_STATE_ACTIVE,
        user: this.user,
        accessToken: this.token,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt,
        refreshExpiresAt: this.refreshExpiresAt,
      };
    },

    getSessionCoordinator() {
      if (!this._coordinator) {
        this._coordinator = createSessionCoordinator({
          getIdentity: () => getApiIdentity(),
          getSessionId: () => this.sessionId || '',
          readSessionState: () => this.readSessionState(),
          readPersistedSession: () => this.readPersistedSession(),
          // A token rotation commits a successor record, so it needs a writer lock. Without one the
          // rotation is refused before the network instead of being dispatched and then dropped.
          canRotate: () => this.sessionPersistence !== SESSION_PERSISTENCE.MEMORY_ONLY,
          readMemorySession: () => this.readMemorySession(),
          storageListenerTarget: (() => {
            try {
              return typeof window !== 'undefined' ? window : null;
            } catch (_error) {
              return null;
            }
          })(),
          performRefresh: async ({ refreshToken }) => {
            if (this.requiresReauth) {
              return { kind: 'stale' };
            }

            try {
              const response = await apiClient.post(API_ENDPOINTS.REFRESH_TOKEN, {
                refresh_token: refreshToken
              });

              if (response.data?.success && response.data?.data) {
                const { access_token, refresh_token, expires_at, refresh_expires_at, user } = response.data.data;
                return {
                  kind: 'ok',
                  session: {
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    expiresAt: expires_at,
                    refreshExpiresAt: refresh_expires_at,
                    user,
                  },
                };
              }

              const code = response.data?.error?.code || response.data?.error;
              return { kind: classifyRefreshError({ code }).kind, code };
            } catch (error) {
              const classified = classifyRefreshError(error);
              return { ...classified, timeoutMs: this.sessionConflictTimeoutMs };
            }
          },
          // A rotation that is refused must not resolve the flight: `applySession` reports whether
          // the record really changed, and a tombstone written elsewhere resolves to `false`.
          // The coordinator supplies the predecessor it captured; the store forwards it unchanged
          // rather than inventing one, so a rotation is always checked against the pair it replaces.
          applySession: (session, meta, rotationOptions) => this.applyRotation(session, meta, rotationOptions),
          // A record another writer persisted is adopted, never re-written: see `adoptCommitted`.
          adoptCommitted: (session, meta) => this.adoptCommitted(session, meta),
          onInvalidSession: async (info) => {
            if (info?.reason === 'refresh-conflict-without-winner') {
              console.warn('[AuthStore] refresh conflict without a winner; requesting a new login');
            }
            await this.requireReauthentication(info?.context || null, info?.reason || 'refresh-rejected');
          },
          onTemporaryFailure: ({ status, code }) => {
            // A busy or unreachable backend is not an invalid token: keep the session (F04).
            console.warn('[AuthStore] temporary refresh failure; keeping the current session', { status, code });
          },
        });
      }

      return this._coordinator;
    },

    async notifySessionExpired(messageKey = null, fallback = null) {
      if (this.reauthNoticeShown) {
        return;
      }

      this.reauthNoticeShown = true;

      try {
        const toastStore = getToastStore();
        if (toastStore) {
          const message = i18n.global.t(
            messageKey || 'message.auth.relogin_required_reason',
            fallback || 'Your session has expired or is invalid. Please login again to continue.'
          );
          const title = i18n.global.t('message.auth.login_required', 'Login Required');
          toastStore.warning(message, 7000, title);
        } else {
          console.warn('[AuthStore] toastStore not yet available via appServices');
        }
      } catch (error) {
        console.warn('[AuthStore] Could not show re-login toast:', error);
      }
    },

    /**
     * Ends the session locally and asks for a new login. When a `context` is supplied the cleanup
     * is skipped entirely if that context is no longer live, so a failure of an old refresh can
     * never clear a session that was created afterwards (review OF-04).
     */
    async requireReauthentication(context = null, reason = 'invalid-session') {
      if (context && !isCurrentContext(context)) {
        console.warn('[AuthStore] ignored a session-expired signal from a superseded context');
        return false;
      }

      // Local cleanup only: an already invalid session must not trigger a remote logout (F01).
      // The tombstone write is awaited, so a rotation that is still in flight elsewhere observes the
      // session as ended before this store asks for a new login (FA-01).
      await this.clearLocalSession(context, reason);
      this.requiresReauth = true;
      this.reauthReason = reason;

      await this.notifySessionExpired();

      try {
        const modalStore = getModalStore();
        if (modalStore) {
          modalStore.openLogin();
        } else {
          console.warn('[AuthStore] modalStore not yet available via appServices');
        }
      } catch (error) {
        console.warn('[AuthStore] Could not open login modal:', error);
      }

      return true;
    },

    /**
     * Returns a usable access token, sharing one in-flight refresh per session context. Every
     * caller awaits the same promise; `isRefreshing` is only a UI flag and is never a way to get
     * a stale token back (review OF-03).
     *
     * Resolves with `null` when no token can be issued. The reason is already reflected in the
     * store: a rejected or expired session has been cleared and flagged for re-login, while a
     * temporary backend failure leaves the existing session untouched. Callers that need the
     * reason use `refreshAccessTokenOrThrow`.
     *
     * @returns {Promise<string|null>}
     */
    async refreshAccessToken(context = null) {
      try {
        return await this.runRefresh(context);
      } catch (error) {
        if (error?.isAuthError) {
          this.lastRefreshError = error.code;
          return null;
        }

        throw error;
      }
    },

    /**
     * Same as `refreshAccessToken`, but reports why no token could be issued as a typed error.
     * The transport uses this so a 401 replay can distinguish "re-login required" from "backend
     * busy" and refuse the request instead of sending an expired bearer.
     *
     * `options.accessTokenUsed` is the bearer the request was rejected for. When the stored session
     * already carries a different one, the rotation happened and no refresh call is made.
     */
    async refreshAccessTokenOrThrow(context = null, options = {}) {
      try {
        return await this.runRefresh(context, options);
      } catch (error) {
        this.lastRefreshError = error?.code || null;
        throw error?.isAuthError
          ? error
          : createAuthError(AUTH_ERROR_CODES.AUTH_TEMPORARILY_UNAVAILABLE, error?.message || 'The session could not be refreshed right now');
      }
    },

    async runRefresh(context = null, options = {}) {
      const activeContext = context || this.captureContext();

      if (this.requiresReauth) {
        throw createAuthError(AUTH_ERROR_CODES.REAUTH_REQUIRED, 'The session must be re-authenticated');
      }

      if (!this.refreshToken) {
        throw createAuthError(AUTH_ERROR_CODES.REAUTH_REQUIRED, 'No refresh token is available');
      }

      // Reduced mode cannot rotate. The current policy is that a memory-only session is **not**
      // silently upgraded to a durable one, so a token rotation is refused here — before the
      // network, and before any read of a shared record. Refusing it late, after a dispatch, is what
      // let a memory-only tab spend the *durable* refresh token of a different user that another tab
      // had persisted on the same origin (FR6-C, probe R6-08).
      //
      // The typed rejection is temporary, not a rejection of this session: the caller must retry
      // once a durable session exists, and must not send the expired bearer meanwhile.
      if (this.sessionPersistence === SESSION_PERSISTENCE.MEMORY_ONLY) {
        this.lastCommitReason = 'no-writer-serialization';
        throw createAuthError(
          AUTH_ERROR_CODES.AUTH_TEMPORARILY_UNAVAILABLE,
          'This session cannot be refreshed: it is not persisted'
        );
      }

      if (this.isRefreshTokenExpired) {
        await this.requireReauthentication(activeContext, 'refresh-expired');
        throw createAuthError(AUTH_ERROR_CODES.REAUTH_REQUIRED, 'The refresh token has expired');
      }

      this.isRefreshing = true;

      let result;

      try {
        result = await this.getSessionCoordinator().ensureFreshSession(activeContext, options);
      } catch (error) {
        if (error && error.isAuthError) throw error;
        throw createAuthError(
          error?.code === AUTH_ERROR_CODES.STALE_SESSION
            ? AUTH_ERROR_CODES.STALE_SESSION
            : AUTH_ERROR_CODES.AUTH_TEMPORARILY_UNAVAILABLE,
          error?.message || 'The session could not be refreshed right now'
        );
      } finally {
        this.isRefreshing = false;
      }

      if (!isCurrentContext(activeContext)) {
        throw createAuthError(AUTH_ERROR_CODES.STALE_SESSION, 'The session changed while the token was refreshed');
      }

      if (!result || !result.accessToken) {
        if (this.requiresReauth) {
          throw createAuthError(AUTH_ERROR_CODES.REAUTH_REQUIRED, 'The session must be re-authenticated');
        }
        // The session record is intact but no fresh token could be obtained: the caller must not
        // continue with an expired bearer.
        throw createAuthError(AUTH_ERROR_CODES.AUTH_TEMPORARILY_UNAVAILABLE, 'The session could not be refreshed right now');
      }

      return result.accessToken;
    },

    /**
     * Revokes the session on the server using a token snapshot taken before cleanup, then clears
     * the session it was started for.
     *
     * The operation owns three things, all captured **before** the first `await`:
     *   - the credential snapshot, so the revoke can only ever send the tokens of the session it was
     *     issued for;
     *   - the lifecycle target `{identity, sessionId}`, so the durable end addresses that session
     *     and not whatever the record says once the lock is finally granted (FR6-A);
     *   - its own operation id, so a `finally` that runs after a *newer* logout took over cannot
     *     reset that logout's promise or its flags.
     *
     * `revoked` is only true when the backend confirmed it (F01), and that answer belongs to the
     * request, not to whatever session happens to be current when it arrives: a local supersession
     * never turns a confirmed revoke into "not confirmed" (FRONTEND-SESSION-DESIGN.vi.md §5).
     */
    logoutRemote(context = null) {
      const activeContext = context || this.captureContext();

      // A repeated click joins the logout that is already running. A *new* login intent is what
      // makes an in-flight logout stop being the current intent: its own cleanup invalidates the
      // epoch, so the epoch alone cannot tell "the same click" from "a different session".
      if (this._logoutPromise && !this._logoutSupersededByLogin) {
        return this._logoutPromise;
      }

      const snapshot = {
        token: this.token,
        refreshToken: this.refreshToken,
        identity: this.apiIdentity,
        sessionId: this.sessionId
      };

      // Fixed for the whole operation. Never re-read from memory or storage below.
      const target = this.captureSessionTarget();
      const operationId = (this._logoutOperationSeq = (this._logoutOperationSeq || 0) + 1);

      this._logoutContext = activeContext.epoch;
      this._logoutSupersededByLogin = false;

      this._logoutPromise = (async () => {
        if (!snapshot.token && !snapshot.refreshToken) {
          await this.clearLocalSession(activeContext, 'logout-no-session');
          const result = { revoked: false, confirmed: false, status: null, code: null, reason: 'no-session' };
          if (this._logoutOperationSeq === operationId) {
            this.lastLogoutResult = result;
            this._logoutContext = null;
            // Released by its owner here too: a settled logout must not be retained as "the logout
            // that is in flight", or a later double click would join a promise that is long done.
            this._logoutPromise = null;
            this._logoutSupersededByLogin = false;
          }
          return result;
        }

        // The local session that is being logged out is invalidated up front, so a protected request
        // can never be issued with the token while the revoke is in flight. The tombstone is awaited
        // next: a rotation that is still in flight in another tab must be able to *see* that the
        // session ended before this logout continues (FA-01).
        this.clearSessionMemory('logout');

        // The context that owns the UI side effects of *this* logout, captured immediately after
        // the synchronous invalidation and before waiting for the end write. Capturing it after the
        // end write instead would hand this operation whatever the next login installed (FR6-A).
        const sideEffectContext = this.captureContext();
        const endResult = await this.endSession(target, { reason: 'logout' });

        let result;

        try {
          const response = await apiClient.post(API_ENDPOINTS.LOGOUT, {
            refresh_token: snapshot.refreshToken
          }, {
            headers: snapshot.token ? { Authorization: `Bearer ${snapshot.token}` } : undefined,
            // The logout request must not be preceded by a refresh and must not be retried.
            skipAuthRefresh: true,
            snapshotAuth: snapshot,
            retry: 0
          });

          result = this.buildLogoutResult(response);
        } catch (error) {
          result = {
            revoked: false,
            confirmed: false,
            status: error?.response?.status ?? null,
            code: error?.response?.data?.error?.code ?? error?.code ?? null,
            reason: 'request-failed'
          };
        } finally {
          // Bounded cleanup of the *same* target only. Memory was already invalidated above, so this
          // never clears a newer session; and a lifecycle that is already ended is recognised
          // instead of written a second time. Only the operation that still owns the logout state
          // may reset it.
          if (endResult.status !== SESSION_COMMIT_STATUS.APPLIED) {
            await this.endSession(target, { reason: 'logout-finalize' });
          }

          if (this._logoutOperationSeq === operationId) {
            this._logoutPromise = null;
            this._logoutContext = null;
            this._logoutSupersededByLogin = false;
          }
        }

        // The revoke outcome is only recorded as *this tab's* state while this logout still owns the
        // session; a superseded logout reports the truth to its own caller and leaves the newer
        // session's `lastLogoutResult` alone.
        if (isCurrentContext(sideEffectContext) && this._logoutOperationSeq === operationId) {
          this.lastLogoutResult = result;
        }
        return result;
      })();

      return this._logoutPromise;
    },

    /**
     * A revoke is only "confirmed" when the response really says so. `success !== false` would
     * accept a malformed HTTP 200 body (or an HTML error page) as proof that the server session
     * was revoked (review OF-06).
     */
    buildLogoutResult(response) {
      const status = Number.isInteger(response?.status) ? response.status : null;
      const body = response?.data && typeof response.data === 'object' ? response.data : null;

      if (status === 204) {
        return { revoked: true, confirmed: true, status, code: null, reason: 'revoked' };
      }

      if (!body || body.success !== true) {
        const code = body && typeof body.error === 'object' ? body.error.code ?? null : null;
        return { revoked: false, confirmed: false, status, code, reason: 'not-confirmed' };
      }

      return { revoked: true, confirmed: true, status, code: null, reason: 'revoked' };
    },

    /**
     * Drops this tab's copy of the session. **Memory only.**
     *
     * It performs no storage write and no storage removal at all. The legacy per-key layout used to
     * be purged from here, which meant a tab that dropped *its own* memory — including a tab merely
     * adopting a session that another tab had just committed — also deleted the compatibility mirror
     * of the record it was about to adopt (FR6-F). A read must not write, and a memory reset must
     * not be able to destroy a durable record this tab does not own.
     *
     * Dropping the legacy keys is part of ending a lifecycle, so it belongs to `endSession`, where
     * the tombstone write already purges them and where a refused end leaves them alone.
     */
    clearSessionMemory(reason = 'clear') {
      this.user = null;
      this.token = null;
      this.refreshToken = null;
      this.expiresAt = null;
      this.refreshExpiresAt = null;
      this.isRefreshing = false;
      this.requiresReauth = false;
      this.reauthNoticeShown = false;
      this.apiIdentity = null;
      this.sessionId = null;
      this.reauthReason = null;
      setSessionId(null);

      // Any in-flight auth work captured the previous epoch and is now stale.
      invalidateContext();
      this.sessionGeneration = getSessionEpoch();
      this.syncClock();

      // Protected caches (audit data, capability answers, comparison rows) belong to the session
      // that just ended, so they are dropped here rather than by whichever page happens to be
      // mounted. A late response of the previous user can no longer refill them (review OF-01/OF-08).
      resetProtectedState(`auth:${reason}`);
    },

    /**
     * The lifecycle this tab owns right now, as an **immutable target**.
     *
     * An end operation must address the lifecycle it was issued for, not whatever the record or
     * memory happens to say when it finally runs. Reading the target again after an `await` is
     * exactly how a logout of session A ended session B (FR6-A): by then the "current" session was
     * whatever the next login had installed.
     *
     * @returns {{identity: string, sessionId: string}}
     */
    captureSessionTarget() {
      return {
        identity: this.apiIdentity || getApiIdentity(),
        sessionId: this.sessionId || '',
      };
    },

    /**
     * Ends one specific lifecycle durably.
     *
     * It writes a tombstone for `target` and nothing else: it does not read a target from memory or
     * storage, it does not clear memory (that is `clearSessionMemory`, and it is synchronous), and
     * it does not announce an end it did not apply. A lifecycle that another writer already ended
     * is adopted as the result instead of being written again, so one logout produces one record
     * and one notification (FA-02).
     *
     * @param {{identity: string, sessionId: string}} target
     * @param {{reason?: string}} options
     * @returns {Promise<{status: string, record: object|null, reason: string|null}>} the commit result
     */
    /**
     * Writes the tombstone for `target` and publishes the end.
     *
     * @param {{identity?: string, sessionId: string}} target the immutable lifecycle to end
     * @param {{reason?: string, allowReplacingUntrusted?: boolean}} options
     *   `allowReplacingUntrusted` forwards the boot path's explicit verdict that the stored record is
     *   unusable. Without it, a record this tab cannot read is left completely alone (FR6-D).
     */
    async endSession(target, { reason = 'end', allowReplacingUntrusted = false } = {}) {
      const sessionId = String(target?.sessionId || '');
      const identity = String(target?.identity || getApiIdentity() || '');

      // A tombstone still needs a session id: without one it would be an invalid record, and a
      // corrupt record that can never be replaced would be reported as invalid on every start.
      if (!sessionId) {
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'missing-lifecycle');
      }

      // A tombstone, not a deletion: a refresh that is still in flight must see that the session
      // is over instead of resurrecting it. It also replaces a corrupt record with valid JSON.
      // `expected` is deliberately absent: the tombstone's version is derived from the observation
      // under the lock, so it is always the next number in the record's own sequence.
      const result = await this.commitRecord({
        schemaVersion: SESSION_SCHEMA_VERSION,
        identity,
        sessionId,
        version: 1,
        state: SESSION_STATE_ENDED,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        refreshExpiresAt: null
      }, {
        // No `isCurrent` here on purpose: the caller's own cleanup deliberately invalidated the
        // context this end was issued under, and ownership of the record is what the `end` rule
        // checks. A *newer* lifecycle is protected by the immutable target, not by the epoch.
        operation: SESSION_OPERATION.END,
        context: null,
        isCurrent: null,
        allowReplacingUntrusted
      }, identity, `auth:${reason}`);

      if (result.status === SESSION_COMMIT_STATUS.APPLIED && result.reason !== 'already-ended') {
        this.publishLifecycle(SESSION_EVENT_TYPE.ENDED, result.record);
      }

      return result;
    },

    /**
     * Ends the session: clears the reactive state, writes a tombstone other tabs and any in-flight
     * rotation can observe, and drops the protected caches that belonged to it.
     *
     * When a `context` is supplied and it is no longer live the call is a no-op, so late cleanup of
     * an old operation cannot erase a newer session.
     *
     * The target is captured **before** memory is cleared, and memory is cleared **synchronously**,
     * before the first `await`, so a protected request can never be issued with the token of a
     * session that is being logged out.
     *
     * @returns {Promise<{status: string, record: object|null, reason: string|null}>} the commit result
     */
    /**
     * @param {object|null} context the intent to check, when there is one
     * @param {string} reason why, for the log and the commit reason
     * @param {{allowReplacingUntrusted?: boolean}} options
     *   `allowReplacingUntrusted` is the boot path declaring that it has *already* judged the stored
     *   record unusable and needs a new login. A logout never sets it: a record this tab cannot
     *   read is a record it does not own, and replacing it with a tombstone would destroy a session
     *   that may be perfectly valid (FR6-D).
     */
    async clearLocalSession(context = null, reason = 'clear', { allowReplacingUntrusted = false } = {}) {
      if (context && !isCurrentContext(context)) {
        console.warn('[AuthStore] skipped clearing a session that is no longer current', { reason });
        return commitResult(SESSION_COMMIT_STATUS.STALE, 'superseded-intent');
      }

      // A record whose session id cannot be read at all still needs *some* lifecycle to end, or the
      // corrupt/absent record would be left in place forever. Reading it here — before the clear —
      // is the last point at which the tab's own answer is still available.
      const target = this.sessionId
        ? this.captureSessionTarget()
        : { ...this.captureSessionTarget(), sessionId: this.readSessionState().record?.sessionId || createSessionId() };

      this.clearSessionMemory(reason);

      return this.endSession(target, { reason, allowReplacingUntrusted });
    },

    /**
     * Ends the session in this tab only. Kept for internal callers and for the local-only cleanup
     * path; the tombstone is awaited so the caller can be sure the record is in its end state.
     */
    logout() {
      return this.clearLocalSession(null, 'local-cleanup');
    },

    /**
     * Called when the configured API endpoint changes. Credentials issued by the previous API
     * server are dropped and the user must log in again against the new one (F03).
     */
    handleApiIdentityChange(nextIdentity) {
      const identity = nextIdentity || getApiIdentity();
      const previous = this.apiIdentity;

      if (previous && previous === identity) {
        return { changed: false, identity };
      }

      const hadSession = !!this.token || !!this.refreshToken || !!this.user;
      void this.clearLocalSession(null, 'identity-change');
      this.requiresReauth = true;
      this.reauthReason = 'identity-change';

      if (hadSession) {
        console.warn('[AuthStore] API identity changed; the previous session was discarded', { previous, identity });
        // The user has to log in again against the new API server.
        void this.notifySessionExpired(
          'message.auth.api_endpoint_changed',
          'The API endpoint changed, so you were signed out. Please login again.'
        );
        try {
          const modalStore = getModalStore();
          if (modalStore) {
            modalStore.openLogin();
          }
        } catch (error) {
          console.warn('[AuthStore] Could not open login modal after the API endpoint changed:', error);
        }
      }

      return { changed: true, identity, previous };
    },

    /**
     * Subscribes to session changes published by other tabs, to the `storage` event of the
     * canonical record, and to focus/visibility reconciliation.
     *
     * The channel is named after the API identity alone, and it is bound as early as possible, so
     * a tab that opened before the login still hears about it (review FA-02). A notification never
     * carries a token: the receiver re-reads and validates the record itself.
     */
    bindCrossTabSession() {
      if (this._crossTabBound) return;
      this._crossTabBound = true;

      this._remoteSession = this.getSessionCoordinator().onRemoteSession(() => {
        void this.adoptCrossTabSession();
      });

      try {
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          this._onWindowReconcile = () => {
            if (this.getSessionCoordinator()) {
              this.getSessionCoordinator().reconcile();
            }
          };
          window.addEventListener('focus', this._onWindowReconcile);
          if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('visibilitychange', this._onWindowReconcile);
          }
        }
      } catch (error) {
        console.warn('[AuthStore] could not bind the focus reconciliation listener:', error);
      }
    },

    /**
     * Adopts the record another tab committed. This is a **read**: it hydrates memory and never
     * writes storage, so re-reading the same record is a no-op and two tabs cannot answer each
     * other's writes in a loop (review FA-02).
     *
     * Adoption therefore never goes through the rotation writer: the record it is adopting is
     * *already* the persisted record, so writing it again would only raise the version and turn a
     * read into a race. A rotation that another tab committed is adopted in place, keeping this
     * session's epoch, so a request bound to this session is not rejected by its own refresh.
     *
     * @param {Object} [session] explicit record; read from storage when omitted
     * @param {Object} [context] `{ identity }` the identity the record must belong to
     * @returns {boolean} whether local state now matches the record
     */
    adoptSession(session = null, context = null) {
      // Reduced mode: this tab's session is memory-only, so there is nothing durable to adopt. A
      // focus, a `storage` event or a background reconciliation must not resurrect a persisted
      // record that this tab deliberately refused to promise (FRONTEND-SESSION-DESIGN.vi.md §6).
      if (this.sessionPersistence === SESSION_PERSISTENCE.MEMORY_ONLY) {
        return false;
      }

      const identity = context?.identity || getApiIdentity();
      const observed = session
        ? { status: session.state === SESSION_STATE_ENDED ? SESSION_READ_STATUS.ENDED : SESSION_READ_STATUS.ACTIVE, record: { ...session, identity } }
        : this.readSessionState();
      const record = observed.record;

      if (!record) return false;

      if (record.state === SESSION_STATE_ENDED) {
        // A tombstone received from another tab ends the local session. It is *not* re-written:
        // the writer that ended it owns the tombstone, and echoing it back would race.
        if ((this.sessionId && record.sessionId === this.sessionId) || this.token || this.user) {
          this.clearSessionMemory('cross-tab-logout');
        }
        return true;
      }

      // This page owns no session yet, so there is nothing to protect and nothing to reset: a login
      // that happened in another tab is simply adopted. Treating it as a "different session" here
      // would end a session this tab never had and write a tombstone over the new one.
      if (!this.sessionId) {
        return this.adoptRecord(record);
      }

      // The record for the session this page already owns is a rotation another tab already
      // committed: adopt it in place, with no write and no epoch change. A record without a session
      // id is the pre-record shape and belongs to this session too, because the coordinator only
      // ever publishes metadata about the live one.
      if (!record.sessionId || record.sessionId === this.sessionId) {
        return this.adoptRecord(record);
      }

      // A different login session owns the page now. Only this tab's memory is dropped: the incoming
      // record is the persisted one and must never be answered with a tombstone, because the session
      // that owns it is alive and a write here would end it (FA-02).
      this.clearSessionMemory('cross-tab-session-change');
      const latest = this.readSessionState();
      if (latest.status === SESSION_READ_STATUS.ACTIVE && latest.record?.sessionId === record.sessionId) {
        this.adoptRecord(latest.record);
      }

      return true;
    },

    adoptCrossTabSession() {
      return this.adoptSession();
    },

    /**
     * Initialises from the canonical record.
     *
     * A legacy migration is attempted **only** when the canonical record is genuinely absent. When
     * a record exists but is corrupt, unbound or unreadable it is never replaced by legacy token
     * material: that would resurrect a session the canonical record already rejected (FA-07).
     *
     * With no writer lock there is no safe way to promise a durable session, so `init` does not
     * hydrate, migrate or purge anything. Owner option 2 also refuses new sign-ins.
     *
     * @returns {void}
     */
    init() {
      if (this.initialized) return;
      this.initialized = true;

      try {
        this.syncClock();
        // Adopt the persisted API base URL before deciding whether the session still matches.
        syncApiIdentityFromStorage();

        const identity = getApiIdentity();
        const subscribeIdentity = () => {
          this._identityUnsubscribe = onApiIdentityChange((nextIdentity) => {
            this.handleApiIdentityChange(nextIdentity);
          });
        };

        const loginSupport = this.checkLoginSupport();
        if (!loginSupport.supported) {
          // Unsupported browser. Session records are neither adopted nor changed: a durable
          // session cannot be promised without a writer lock, so this tab starts signed out and
          // cannot sign in until the required capabilities are available.
          this.sessionPersistence = SESSION_PERSISTENCE.MEMORY_ONLY;
          this.requiresReauth = true;
          this.reauthReason = loginSupport.reason;
          this.storageDegraded = loginSupport.reason === 'storage-unavailable';
          this.reauthNoticeShown = false;
          this.apiIdentity = identity;
          this.sessionGeneration = getSessionEpoch();
          subscribeIdentity();
          this.bindCrossTabSession();
          return;
        }

        this.sessionPersistence = SESSION_PERSISTENCE.DURABLE;
        const observed = this.readSessionState();

        if (observed.status === SESSION_READ_STATUS.ABSENT) {
          // One migration attempt for a pre-record session, and only when it is fully consistent.
          const legacy = readLegacySession({ expectedIdentity: identity });
          if (legacy.record) {
            const validated = validateSessionSnapshot({
              ...legacy.record,
              sessionId: createSessionId(),
              version: 1,
            }, { expectedIdentity: identity });

            if (validated.ok) {
              this.adoptRecord(validated.record);
              // The `migrate` rule is re-checked *inside* the writer lock: a record that appeared
              // between the read above and the write is a real session that legacy material may not
              // replace, so the migration reports a refusal instead of clobbering it (FA-07).
              this.trackSessionWrite(
                this.commitRecord(validated.record, {
                  operation: SESSION_OPERATION.MIGRATE,
                  context: null,
                  isCurrent: null
                }, identity, 'auth:migrate-legacy').then((result) => {
                  if (result.status === SESSION_COMMIT_STATUS.APPLIED) {
                    this.publishLifecycle(SESSION_EVENT_TYPE.SESSION, result.record);
                  } else if (this.sessionId === validated.record.sessionId) {
                    // The migration was refused, so the record it adopted must not stay in memory.
                    this.clearSessionMemory('legacy-migration-refused');
                    this.requiresReauth = true;
                    this.reauthReason = 'invalid-session';
                  }
                  return result;
                })
              );
              subscribeIdentity();
              this.bindCrossTabSession();
              return;
            }
          }

          if (legacy.present) {
            // Persisted token material that is internally inconsistent, or unbound to the
            // configured API identity, is never promoted to a session (F03).
            console.warn('[AuthStore] the persisted legacy session is unbound or unusable; a new login is required', {
              source: SESSION_RECORD_SOURCE.LEGACY,
              reason: legacy.reason
            });
            this.clearLocalSession(null, 'untrusted-legacy');
            this.requiresReauth = true;
            this.reauthReason = 'invalid-session';
            subscribeIdentity();
            this.bindCrossTabSession();
            return;
          }

          this.requiresReauth = false;
          this.reauthNoticeShown = false;
          this.apiIdentity = identity;
          this.sessionGeneration = getSessionEpoch();
          subscribeIdentity();
          this.bindCrossTabSession();
          return;
        }

        if (observed.status === SESSION_READ_STATUS.ENDED) {
          this.apiIdentity = null;
          this.sessionId = null;
          this.storageDegraded = false;
          subscribeIdentity();
          this.bindCrossTabSession();
          return;
        }

        if (observed.status === SESSION_READ_STATUS.INVALID || observed.status === SESSION_READ_STATUS.UNAVAILABLE) {
          // A record that exists but cannot be trusted is discarded, and a fresh login is
          // required. Legacy keys are never used to fill the gap (FA-07).
          console.warn('[AuthStore] the persisted session record is unusable; a new login is required', {
            status: observed.status,
            reason: observed.reason
          });
          if (observed.status === SESSION_READ_STATUS.UNAVAILABLE) {
            // Unreadable is not the same as unusable. The bytes may well be a valid session of
            // another tab or another identity, so this tab refuses to write over them and only
            // reports the degradation: replacing an unreadable record is not a boot decision, it
            // is data loss (FR6-D).
            this.storageDegraded = true;
            this.clearLocalSession(null, 'unreadable-record');
          } else {
            // Readable and rejected: the validator has already decided, so discarding it and
            // requiring a new login is a decision, not a side effect.
            this.clearLocalSession(null, 'untrusted-record', { allowReplacingUntrusted: true });
          }

          // Set after the clear: `clearSessionMemory()` is what resets these flags, so the verdict of
          // the boot path has to be the last word.
          this.requiresReauth = true;
          this.reauthReason = 'invalid-session';
          subscribeIdentity();
          this.bindCrossTabSession();
          return;
        }

        this.adoptRecord(observed.record);
        subscribeIdentity();

        // Check if refresh token is expired on init
        if (this.isRefreshTokenExpired) {
          console.log('[AuthStore] Refresh token expired on init, clearing auth state');
          this.clearLocalSession(null, 'init-refresh-expired');
        }

        this.bindCrossTabSession();
      } catch (error) {
        console.error('Failed to load auth state from localStorage:', error);
        this.clearLocalSession(null, 'init-failure');
        this.storageDegraded = true;
      }
    }
  }
});
