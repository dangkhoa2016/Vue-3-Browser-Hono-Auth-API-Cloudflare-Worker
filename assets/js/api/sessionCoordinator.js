/**
 * sessionCoordinator.js — single-flight and cross-tab coordination for access-token refresh.
 *
 * Why this exists (F04): refresh used to be guarded by a per-store boolean, so N parallel
 * requests in one tab, or two tabs sharing `localStorage`, could each mint a new token. The
 * backend contract (v1) answers the losing race with HTTP 409 `REFRESH_ALREADY_ROTATED` and
 * promises at most one successor, so the client must adopt the winner instead of retrying.
 *
 * Policy implemented here:
 * - one refresh in flight per session context (`ensureFreshSession` shares a single promise per
 *   context; a new context never waits for, and is never served by, an older flight);
 * - the lifecycle channel is named after the **API identity only**. Naming it after the session
 *   meant a tab that opened before the login subscribed to an empty namespace and never heard the
 *   login that happened in another tab (review FA-02);
 * - before refreshing inside a cross-tab lock, re-read the persisted snapshot instead of using a
 *   stale refresh-token snapshot;
 * - on a refresh conflict, wait a bounded time for the winning session and adopt it; when no
 *   winner appears, ask for a new login — never loop and never mint another token;
 * - a rejected refresh token is `invalid` (clear the session); 429/5xx/network are `temporary`
 *   (keep the session, do not retry in a loop);
 * - every outcome is validated against the context that started the operation before it can have
 *   a side effect, so a refresh that resolves late cannot replace or clear a newer session;
 * - adopting a record is **read-only**: it hydrates memory and never writes storage or raises the
 *   snapshot version, so a storage listener cannot cause a write loop between tabs (review FA-02).
 *
 * Design record: FRONTEND-SESSION-DESIGN.vi.md §4.
 */

export const REFRESH_CONFLICT_CODES = ['REFRESH_ALREADY_ROTATED'];
export const DEFAULT_CONFLICT_TIMEOUT_MS = 5000;
export const DEFAULT_POLL_INTERVAL_MS = 100;
export const DEFAULT_REFRESH_LOCK_TIMEOUT_MS = 5000;

/** Refresh outcomes that are not a token. `unavailable` is this module's reduced-mode refusal. */
export const REFRESH_OUTCOME_KIND = Object.freeze({
  OK: 'ok',
  STALE: 'stale',
  ADOPTED: 'adopted',
  CONFLICT: 'conflict',
  TEMPORARY: 'temporary',
  INVALID: 'invalid',
  UNAVAILABLE: 'unavailable'
});

/** Lifecycle messages. They carry metadata only — never a token. */
export const SESSION_EVENT_TYPE = Object.freeze({
  SESSION: 'session',
  ENDED: 'ended'
});

export const SESSION_CHANNEL_PREFIX = 'frontend-session:';
export const REFRESH_LOCK_PREFIX = 'frontend-refresh:';

export function isRefreshConflict(status, code) {
  if (status === 409) return true;
  return typeof code === 'string' && REFRESH_CONFLICT_CODES.includes(code.toUpperCase());
}

export function classifyRefreshError(error) {
  const status = error?.response?.status ?? null;
  const code = error?.response?.data?.error?.code ?? error?.code ?? null;

  if (isRefreshConflict(status, code)) {
    return { kind: 'conflict', status, code };
  }

  if (status === 401 || status === 403) {
    return { kind: 'invalid', status, code };
  }

  if (status === 429 || (status !== null && status >= 500)) {
    return { kind: 'temporary', status, code };
  }

  if (status === null) {
    return { kind: 'temporary', status, code };
  }

  return { kind: 'invalid', status, code };
}

const createDefaultChannelFactory = (name) => {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(name);
  } catch (_error) {
    return null;
  }
};

const getDefaultLocks = () => {
  try {
    return typeof navigator !== 'undefined' ? navigator.locks : null;
  } catch (_error) {
    return null;
  }
};

/**
 * The credential pair a rotation replaces, named with the lifecycle it belongs to.
 *
 * Handing this to the store is what makes a rotation checkable: the writer compares it with the
 * record under the lock and refuses anything that is neither it nor the successor. It is a plain
 * value, derived from what was read rather than from what is remembered, and it is never published
 * on the lifecycle channel or logged.
 *
 * @param {object|null} session
 * @returns {{identity: string, sessionId: string, accessToken: string, refreshToken: string}|null}
 */
export function rotationPredecessor(session) {
  if (!session || !session.accessToken || !session.refreshToken) return null;
  return {
    identity: String(session.identity ?? ''),
    sessionId: String(session.sessionId ?? ''),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

/**
 * The timing a bounded lock acquisition is measured against.
 *
 * Elapsed time, and nothing else. A wall clock is a statement about what time *is* according to one
 * machine, and this machine's has been observed to stop and to step backwards; a deadline read off it can
 * therefore be passed by a clock that went nowhere (FA8-02) and, before that, could be missed entirely by
 * a timer that fired a moment early. `performance.now()` cannot be moved by an NTP correction and cannot
 * adjusted by a wall-clock correction. Runtime suspension behavior belongs to the browser;
 * this deadline compares readings from that runtime without mixing in epoch time.
 *
 * The whole thing is injectable so a test can drive it from a controlled clock instead of from wall time.
 * A test that waits 20 real seconds to prove a 20-second deadline is not shortened to 15 is a test that
 * cannot be run, and the bug it is guarding (FR9-01) was found by a reviewer running the module by hand
 * rather than by a test.
 */
const browserPerformance = () => {
  try {
    return typeof performance !== 'undefined' && performance ? performance : null;
  } catch (_error) {
    return null;
  }
};

export const defaultAcquisitionScheduler = Object.freeze({
  /** @returns {number|null} monotonic milliseconds, or null when this runtime has no such clock. */
  monotonicNow() {
    const perf = browserPerformance();
    if (!perf || typeof perf.now !== 'function') return null;
    const value = perf.now();
    return Number.isFinite(value) ? value : null;
  },
  setTimer(handler, delayMs) {
    return setTimeout(handler, delayMs);
  },
  clearTimer(handle) {
    if (handle !== null && handle !== undefined) clearTimeout(handle);
  }
});

/**
 * Takes a lock without letting the wait be unbounded, and without letting a late grant run anyway.
 *
 * `Promise.race` alone is not a timeout: the queued request stays in the lock manager and is granted
 * later, which then performs the work the caller already stopped waiting for. So the fence is
 * installed first, the callback checks it on entry, and the deadline settles the caller. A granted
 * request that finds the fence closed returns the fenced result without dispatching anything.
 *
 * The deadline is `timeoutMs` of *elapsed* time, read from `scheduler`, and it is enforced at **both**
 * ends of the wait:
 *
 *   - when the timer fires (the ordinary case), and
 *   - when the grant arrives, which is the end of the wait and the moment the caller stops being a
 *     waiter (FR10-06). Checking only the timer leaves a hole whenever the event loop is late: a timer
 *     that has not been dispatched, with the grant landing in between, would otherwise run work for a
 *     caller who had already been answered with "timed out". Since `timeoutMs` is a claim about the wait,
 *     the place the wait ends is a place the claim has to be checked.
 *
 *   - It is not capped, and it is not multiplied. A previous version counted the timer's own intervals
 *     as a second measure and capped that count at 15 s, so a caller that asked for 20 s was fenced at
 *     15 s. The two measures were both arbitrary — the count is a guess about how fast a timer queue
 *     drains, which is exactly what a loaded machine refutes — and mixing a wall clock with a nominal
 *     tick budget meant the effective deadline was neither the configured one nor a documented one.
 *   - A timer that fires before the deadline re-arms for the *remaining* time instead of fencing. Timers
 *     fire early; a request that is still legitimately waiting must not be told it ran out.
 *   - A grant that arrives *inside* the budget runs the work to completion however long the work takes.
 *     The bound is on the queueing, not on the callback.
 *   - `now` is deliberately not consulted. A wall clock belongs to the caller's expiry and conflict
 *     arithmetic, where a value is compared with a stored epoch; it is not a stopwatch. Nothing here
 *     converts a token's expiry epoch onto the monotonic clock, because the two measure different things
 *     and a conversion would be a category error rather than a convenience.
 *
 * An unavailable, invalid or regressing monotonic source fails closed. A timer alone
 * cannot prove a grant arrived within budget, especially when the event loop is delayed.
 *
 * @param {{request: Function}|null} locks
 * @param {string} name
 * @param {() => Promise<*>} run
 * @param {{timeoutMs?: number, fence?: (reason: string) => Promise<*>, scheduler?: object}} options
 * @returns {Promise<*>} the callback's result, or the fenced result once the deadline passes
 */
export async function acquireWithDeadline(
  locks,
  name,
  run,
  { timeoutMs, fence = null, scheduler = defaultAcquisitionScheduler } = {}
) {
  if (!locks || typeof locks.request !== 'function') return run();

  let granted = false;
  let timer = null;
  let fenced = false;
  let fenceResult = null;
  const deadline = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : null;

  // The clock is read before anything can call `guarded`. The grant is now one of the two places where
  // the deadline is decided, so it has to be able to answer without reaching into a later declaration.
  const readClock = () => {
    try { return scheduler.monotonicNow(); } catch { return Number.NaN; }
  };
  const startedAt = deadline === null ? Number.NaN : readClock();
  let lastReading = startedAt;
  const hasMonotonicClock = Number.isFinite(startedAt);

  /**
   * Milliseconds of budget spent, or NaN when that cannot be told.
   *
   * The *reading* is checked, not the subtraction: `null - 0` is `0`, so a source that has stopped
   * answering would otherwise be read as "no time has passed" and the wait would go on forever. A source
   * that steps backwards is the wall-clock failure this whole change exists to remove, wearing a monotonic
   * name: `elapsed` is negative, and honouring it would *extend* the wait, which is precisely the defect.
   * Refusing to wait is recoverable; waiting for ever is not.
   *
   * The grant and the timer both read the budget through here, so the two cannot come to different
   * conclusions about what "late" means.
   */
  const elapsed = () => {
    const reading = readClock();
    if (!Number.isFinite(reading) || reading < lastReading) return Number.NaN;
    lastReading = reading;
    return reading - startedAt;
  };

  /** Whether the wait may still honestly be described as inside its budget. */
  const withinBudget = () => {
    const spent = elapsed();
    return Number.isFinite(spent) && spent >= 0 && spent < deadline;
  };

  /**
   * One settle path, so the fence is *decided* once. A late timer and a granted callback that arrives
   * after the fence are the same event seen from two places: both the caller that timed out and the
   * request that is still queued get the one answer, and `fence` — which in the product is where the
   * failure is counted — is not told the same failure happened twice.
   */
  const raiseFence = (reason) => {
    if (!fenced) {
      fenced = true;
      // Every path waits for the same fence, including a grant arriving during its await.
      fenceResult = Promise.resolve().then(() => fence ? fence(reason) : null);
    }
    return fenceResult;
  };

  // An unmeasurable deadline cannot authorize a grant before a delayed timer fires.
  if (deadline !== null && !hasMonotonicClock) return raiseFence('lock-acquisition-timeout');

  const guarded = async () => {
    // The lock is ours from this moment whatever happens next. The timer must stop treating this request
    // as one that is still waiting, or it will try to fence a callback that has already been settled.
    granted = true;

    if (fenced) return raiseFence('lock-acquisition-timeout');

    // The grant is the moment the wait ends, and it is the *other* half of the deadline (FR10-06). Reading
    // the budget only in the timer left a gap the review measured exactly: a timer the event loop had not
    // got around to dispatching, with the grant landing in between, would have run the work for a caller
    // who had already been told the wait timed out. The deadline is a property of the wait, so the place
    // the wait ends is where it has to be enforced.
    //
    if (deadline !== null && !withinBudget()) {
      return raiseFence('lock-acquisition-timeout');
    }

    // Inside the budget the work runs to completion however long it takes. The deadline bounds the
    // queueing, not the callback: a rotation that already holds the lock has peers waiting on its answer,
    // and abandoning it after the grant is how an app ends up holding a credential it can no longer use.
    return run();
  };

  if (deadline === null) return locks.request(name, guarded);

  // A `request` that throws synchronously must not leave a timer behind, so it is called before the timer
  // exists and a rejection is picked up by the race below.
  const acquisition = locks.request(name, guarded);

  const arm = (handler, delayMs) => {
    const handle = scheduler.setTimer(handler, delayMs);
    // An unref'd timer must not be the only thing holding a Node process open; a browser has no such
    // concept and the handle simply has no `unref`.
    if (handle && typeof handle.unref === 'function') handle.unref();
    timer = handle;
    return handle;
  };

  const timeout = new Promise((resolve) => {
    const finish = () => {
      // The deadline bounds *queueing*. Once the lock is ours the wait is over, and a callback slower
      // than the budget must still run to completion — the peer has already rotated the token by the time
      // the network answers, so abandoning the work here is how an app ends up holding a credential it
      // can no longer use (Task 7). `granted` is therefore checked here and not only in the re-arm below.
      if (granted || fenced) return;
      resolve(raiseFence('lock-acquisition-timeout'));
    };

    const tick = () => {
      if (granted || fenced) return;
      const spent = elapsed();
      if (!Number.isFinite(spent) || spent < 0 || spent >= deadline) {
        finish();
        return;
      }
      // A timer that fires early is not a deadline: re-arm for what is left rather than fencing a request
      // that is still legitimately waiting. The re-arm is `Math.ceil`'d and floored at 1 ms so it can
      // neither overshoot the budget nor spin.
      arm(tick, Math.max(1, Math.ceil(deadline - spent)));
    };

    arm(tick, deadline);
  });

  try {
    return await Promise.race([acquisition, timeout]);
  } finally {
    if (timer !== null) scheduler.clearTimer(timer);
    timer = null;
  }
}

export function createSessionCoordinator(options = {}) {
  const {
    getIdentity = () => '',
    getSessionId = () => '',
    readSessionState = () => ({ status: 'absent', record: null }),
    readPersistedSession = null,
    /**
     * Reports whether this tab may take part in a token rotation at all.
     *
     * A tab that cannot serialise its writers has no honest way to commit a successor record, so
     * `false` here refuses the rotation *before* the network. It is deliberately separate from
     * `readSessionState`: a reduced-mode tab must not decide that by reading the shared record,
     * because the record it would read belongs to a session that is not its own.
     */
    canRotate = () => true,
    /**
     * The session this tab holds **in memory only**, used as the credential source while rotation is
     * unavailable. Never the shared record.
     */
    readMemorySession = () => null,
    performRefresh,
    applySession,
    /**
     * Adopts a record another writer already committed. A read, never a write: the record is in
     * storage already, so rotating it again would raise the version for nothing and turn a read
     * into a cross-tab write race (FR6-F). A caller that supplies none cannot confirm such a
     * commit, so the default refuses and the refresh reports no token.
     */
    adoptCommitted = null,
    onInvalidSession = async () => {},
    onTemporaryFailure = () => {},
    conflictTimeoutMs = DEFAULT_CONFLICT_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    /**
     * How long a refresh may wait for the cross-tab coordination lock. Without a deadline, a
     * holder that never releases turns a refresh into a promise that never settles, and the caller's
     * request hangs forever. Exceeding it is reported as `unavailable`, never as a failed session.
     */
    lockTimeoutMs = DEFAULT_REFRESH_LOCK_TIMEOUT_MS,
    now = () => Date.now(),
    /**
     * The clock the acquisition deadline is measured against. Separate from `now` on purpose: `now` is a
     * wall clock because expiry and conflict deadlines are compared with stored epochs, while the
     * acquisition bound is a stopwatch and must not be. Injectable so a test can drive it.
     */
    acquisitionScheduler = defaultAcquisitionScheduler,
    channelFactory = createDefaultChannelFactory,
    storageListenerTarget = null,
    storageListenerKey = 'auth-session-record',
    locks = getDefaultLocks(),
  } = options;

  const flights = new Map();
  let channel = null;
  let channelName = '';
  const sessionListeners = new Set();
  let storageListenerBound = false;

  /**
   * `applySession` is the store's guarded writer and resolves with a `CommitResult`, so a rotation
   * this coordinator did not actually commit must never be read back as a usable session. A commit
   * that reports `stale` means another writer won the lock; `unavailable` means the tab is in
   * reduced mode and promises nothing durable. Both mean "no token from here".
   */
  const isCommitted = (result) => result?.status === 'applied';

  const adoptCommittedSession = async (session, meta) => {
    if (typeof adoptCommitted === 'function') return adoptCommitted(session, meta);
    return { status: 'stale', record: null, reason: 'adoption-unsupported' };
  };

  const rotationAvailable = () => {
    try {
      return canRotate() !== false;
    } catch (_error) {
      // An unreadable policy is a refusal, not a permission: a rotation nobody can account for is
      // exactly the case this guard exists for.
      return false;
    }
  };

  // `readPersistedSession` is the historical name for "the usable session". Keep accepting it so a
  // caller does not have to be rewritten, but prefer the state reader when it is supplied: a
  // tombstone has to stay observable.
  const readState = typeof readSessionState === 'function' ? readSessionState : null;

  /**
   * The session this tab may present to a request, or null.
   *
   * In reduced mode the shared record is off limits: it is written by a tab that can serialise
   * writers and it describes *that* lifecycle. Reading it here is how a memory-only session for one
   * user ended up refreshing with another user's persisted refresh token (FR6-C). The only permitted
   * source in that mode is this tab's own memory, and only for the identity in context.
   */
  const readUsable = (context = null) => {
    if (!rotationAvailable()) {
      const own = typeof readMemorySession === 'function' ? readMemorySession() : null;
      if (!own || !own.accessToken) return null;
      const identity = context?.identity ?? getIdentity();
      if (identity && own.identity && own.identity !== identity) return null;
      return own;
    }

    if (readState) {
      const observed = readState();
      return observed && observed.status === 'active' ? observed.record : null;
    }
    return typeof readPersistedSession === 'function' ? readPersistedSession() : null;
  };
  const readStateOrEmpty = () => (readState ? readState() : { status: 'active', record: readUsable() });

  const contextKey = (context) => `${context?.identity ?? getIdentity()}|${context?.epoch ?? 'any'}`;

  const ensureChannel = () => {
    // Identity only: a tab that has not logged in yet must already listen on the namespace the
    // other tabs publish to.
    const name = `${SESSION_CHANNEL_PREFIX}${getIdentity()}`;

    if (channel && channelName === name) {
      return channel;
    }

    if (channel) {
      try { channel.close(); } catch (_error) { /* already closed */ }
      channel = null;
      channelName = '';
    }

    const created = channelFactory(name);
    channel = created;
    channelName = created ? name : '';

    if (created && typeof created.addEventListener === 'function') {
      created.addEventListener('message', (event) => {
        for (const listener of [...sessionListeners]) {
          try {
            listener(event?.data);
          } catch (error) {
            console.warn('[sessionCoordinator] session listener failed:', error);
          }
        }
      });
    }

    return channel;
  };

  const onRemoteSession = (listener) => {
    ensureChannel();
    sessionListeners.add(listener);
    return () => sessionListeners.delete(listener);
  };

  const publishSession = (session) => {
    const active = ensureChannel();
    if (!active || typeof active.postMessage !== 'function') return;
    try {
      // Only identity/sessionId/version travel between tabs. Tokens stay in the record; each
      // receiver re-reads and validates it, so no bearer is broadcast.
      active.postMessage({
        type: session ? SESSION_EVENT_TYPE.SESSION : SESSION_EVENT_TYPE.ENDED,
        identity: getIdentity(),
        sessionId: session?.sessionId ?? getSessionId(),
        version: session?.version ?? null
      });
    } catch (error) {
      console.warn('[sessionCoordinator] could not publish session:', error);
    }
  };

  /**
   * The storage event is the fallback for a browser without `BroadcastChannel`, for a tab that was
   * closed when the message was sent, and for a listener that was not bound yet. It carries the
   * same metadata and the receiver still re-reads the canonical record itself.
   */
  const bindStorageFallback = () => {
    if (storageListenerBound) return () => {};
    if (!storageListenerTarget || typeof storageListenerTarget.addEventListener !== 'function') {
      return () => {};
    }

    storageListenerBound = true;
    const handler = (event) => {
      if (event && event.key && event.key !== storageListenerKey) return;
      for (const listener of [...sessionListeners]) {
        try {
          listener({ type: SESSION_EVENT_TYPE.SESSION, identity: getIdentity(), source: 'storage' });
        } catch (error) {
          console.warn('[sessionCoordinator] session listener failed:', error);
        }
      }
    };

    storageListenerTarget.addEventListener('storage', handler);
    return () => {
      storageListenerBound = false;
      try { storageListenerTarget.removeEventListener('storage', handler); } catch (_error) { /* noop */ }
    };
  };

  const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  const readWinner = (previousRefreshToken, context = null) => {
    const persisted = readUsable(context);
    if (!persisted) return null;
    if (previousRefreshToken && persisted.refreshToken === previousRefreshToken) return null;
    if (!persisted.accessToken) return null;
    return persisted;
  };

  /** Waits a bounded time for the tab that won the refresh race to publish its session. */
  const waitForWinner = async (previousRefreshToken, timeoutMs, context = null) => {
    const deadline = now() + timeoutMs;

    return new Promise((resolve) => {
      let settled = false;
      let poller = null;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (poller) clearInterval(poller);
        unsubscribe();
        resolve(value);
      };

      poller = setInterval(() => {
        const winner = readWinner(previousRefreshToken, context);
        if (winner) {
          finish(winner);
          return;
        }
        if (now() >= deadline) {
          finish(null);
        }
      }, pollIntervalMs);

      const unsubscribe = onRemoteSession(() => {
        const winner = readWinner(previousRefreshToken, context);
        if (winner) finish(winner);
      });

      const immediate = readWinner(previousRefreshToken, context);
      if (immediate) finish(immediate);
    });
  };

  const refreshWithCoordination = async (context, options = {}) => {
    const identity = context?.identity ?? getIdentity();
    const generationSnapshot = context?.epoch ?? null;

    // Reduced mode, and it is the *first* thing this function does: no lock is taken, no shared
    // record is read and no request is dispatched. A tab that cannot commit a successor record must
    // not spend a refresh token to find out (FR6-C).
    if (!rotationAvailable()) {
      return { kind: REFRESH_OUTCOME_KIND.UNAVAILABLE, reason: 'no-writer-serialization' };
    }

    const snapshot = readUsable(context) || {};
    const previousRefreshToken = snapshot.refreshToken || null;

    // The bearer that failed has already been replaced — by the flight this caller joined a moment
    // ago, or by another tab. Spending the refresh token again would race the rotation the server
    // already performed, and a backend that rotates strictly answers the second call with a
    // conflict. This is a read, so it needs no lock: it only skips a network call that has nothing
    // left to learn.
    const superseded = options.accessTokenUsed;
    if (superseded && snapshot.accessToken && snapshot.accessToken !== superseded) {
      // The record is already the successor, so there is nothing to rotate: this is a read.
      const applied = await adoptCommittedSession(snapshot, { identity, epoch: generationSnapshot, source: 'refresh-already-applied' });
      return isCommitted(applied) ? readUsable(context) : null;
    }

    const attempt = async () => {
      // Inside the lock the persisted session is authoritative: another tab may have won while
      // this tab was waiting, and that session must be adopted instead of rotated again.
      const persisted = readUsable(context);
      if (persisted?.accessToken && persisted.refreshToken !== previousRefreshToken) {
        return { kind: REFRESH_OUTCOME_KIND.ADOPTED, session: persisted };
      }

      // The credential that is about to be spent, captured here — after the re-read under the
      // coordination lock, immediately before dispatch. This is the rotation's predecessor: it is
      // the only thing that makes the eventual write a rotation rather than a blind overwrite
      // (FR6-E). It stays inside this module and is never logged or broadcast.
      const spent = persisted?.accessToken ? persisted : snapshot;
      const predecessor = rotationPredecessor(spent);

      const outcome = await performRefresh({
        identity,
        generation: generationSnapshot,
        refreshToken: spent.refreshToken ?? previousRefreshToken,
      });

      return { ...outcome, predecessor };
    };

    // The refresh lock is held across the commit, not just across the request.
    //
    // Releasing it as soon as the response was in left a window between "the server has rotated" and
    // "the record holds the successor": a second tab took the lock, re-read, still saw the
    // *predecessor* refresh token and spent it again (FA8-01). The window is closed by keeping the
    // whole re-read -> dispatch -> commit sequence inside one exclusive section, so a tab that
    // arrives later re-reads a *committed* successor and adopts it.
    //
    // The writer lock is still never held across the network: `performRefresh` has already resolved
    // by the time `applySession` asks for it, so the ordering stays refresh -> writer and the HTTP
    // call never sits inside a storage transaction.
    const exclusive = async () => {
      const outcome = await attempt();
      // Only an answer that became local state belongs inside the section. The remaining outcomes are
      // reported to another tab (a conflict waits for a winner, a 5xx keeps the session) and doing
      // that here would hold the lock for seconds while a tab that *has* the answer waited for it.
      if (outcome.kind !== REFRESH_OUTCOME_KIND.OK) return outcome;

      // The writer is the store's guarded commit, so it returns a CommitResult rather than a boolean:
      // `stale` means another writer won, `unavailable` means reduced mode promises nothing durable.
      // Neither may be read back as a usable session.
      const applied = await applySession(
        outcome.session,
        { identity, epoch: generationSnapshot, source: 'refresh' },
        { predecessor: outcome.predecessor || rotationPredecessor(snapshot) }
      );

      if (!isCommitted(applied)) {
        // A refusal is not a temporary backend condition and must not end the session: the caller is
        // told there is no token here, and the reason travels with it.
        return { kind: REFRESH_OUTCOME_KIND.STALE, reason: applied?.reason || 'commit-unconfirmed' };
      }

      return { kind: REFRESH_OUTCOME_KIND.OK, session: readUsable(context) };
    };

    let outcome;

    if (locks && typeof locks.request === 'function') {
      // The refresh lock bounds queueing, and only queueing: `acquireWithDeadline` stops settling the
      // caller once the lock is granted, so a slow network or a held writer cannot expire a rotation
      // that is already under way. Ordering is always refresh -> writer. The bound is elapsed time from
      // the acquisition scheduler, not from the wall clock this module otherwise uses.
      outcome = await acquireWithDeadline(
        locks,
        `${REFRESH_LOCK_PREFIX}${identity}:${getSessionId()}`,
        exclusive,
        {
          timeoutMs: lockTimeoutMs,
          scheduler: acquisitionScheduler,
          fence: async () => ({ kind: REFRESH_OUTCOME_KIND.UNAVAILABLE, reason: 'refresh-lock-timeout' })
        }
      );
    } else {
      outcome = await exclusive();
    }

    if (outcome.kind === REFRESH_OUTCOME_KIND.UNAVAILABLE) {
      // Reduced mode, or the coordination lock could not be acquired in time. Either way nothing was
      // dispatched: report a temporary condition of this tab and leave the session alone.
      onTemporaryFailure({ status: null, code: outcome.reason || 'refresh-unavailable' });
      return null;
    }

    if (outcome.kind === REFRESH_OUTCOME_KIND.ADOPTED) {
      // The winner already persisted this session, so this is a read of shared state: adopting it
      // must not write a second record on top of the one the winning tab just committed.
      const adopted = await adoptCommittedSession(outcome.session, { identity, epoch: generationSnapshot, source: 'cross-tab' });
      return isCommitted(adopted) ? readUsable(context) : null;
    }

    if (outcome.kind === REFRESH_OUTCOME_KIND.OK) {
      // The commit already happened inside the coordination section, so there is nothing left to
      // write here: a second write would be the duplicate commit FA8-01's fix removes. Publishing is
      // the only remaining step, and it happens only for a commit that actually landed — announcing
      // an uncommitted rotation is what lets a losing tab adopt a token that was never stored.
      const committed = readStateOrEmpty();
      publishSession(committed?.record ? { sessionId: committed.record.sessionId, version: committed.record.version } : null);
      return outcome.session ?? readUsable(context);
    }

    if (outcome.kind === REFRESH_OUTCOME_KIND.STALE) {
      // Either the server had already moved on, or the commit was refused. A refusal keeps the
      // session as it is and reports a temporary condition of this tab: it is not a verdict on the
      // session, so it must not end it the way a rejected refresh token does.
      if (outcome.reason && outcome.reason !== 'superseded-refresh') {
        onTemporaryFailure({ status: null, code: outcome.reason });
      }
      return null;
    }

    if (outcome.kind === REFRESH_OUTCOME_KIND.UNAVAILABLE) {
      // Reduced mode reached through a caller that did not check `canRotate` itself. It is a
      // temporary condition of this tab, not a verdict on the session: report it as such and leave
      // the session alone, so the caller can retry once a durable session exists.
      onTemporaryFailure({ status: null, code: outcome.reason || 'no-writer-serialization' });
      return null;
    }

    if (outcome.kind === REFRESH_OUTCOME_KIND.CONFLICT) {
      const winner = await waitForWinner(previousRefreshToken, outcome.timeoutMs ?? conflictTimeoutMs, context);
      if (winner) {
        // The winner's record is already the persisted record: adopt it, do not rotate it again.
        const applied = await adoptCommittedSession(winner, { identity, epoch: generationSnapshot, source: 'conflict-winner' });
        return isCommitted(applied) ? readUsable(context) : null;
      }
      await onInvalidSession({
        reason: 'refresh-conflict-without-winner',
        status: outcome.status,
        code: outcome.code,
        context: { identity, epoch: generationSnapshot }
      });
      return null;
    }

    if (outcome.kind === REFRESH_OUTCOME_KIND.TEMPORARY) {
      onTemporaryFailure({ status: outcome.status, code: outcome.code });
      return null;
    }

    await onInvalidSession({
      reason: 'refresh-rejected',
      status: outcome.status,
      code: outcome.code,
      context: { identity, epoch: generationSnapshot }
    });
    return null;
  };

  /**
   * Returns a valid session snapshot, sharing one in-flight refresh per context. A caller that
   * arrives for a *different* context starts its own flight: it must never be handed the result of
   * a refresh that belongs to a session it did not ask about.
   *
   * `options.accessTokenUsed` is the bearer the caller was rejected for. It is what lets a caller
   * that arrives just after a flight finished notice that the rotation already happened.
   */
  const ensureFreshSession = (context = null, options = {}) => {
    const key = contextKey(context);
    const existing = flights.get(key);
    if (existing) return existing;

    const flight = refreshWithCoordination(context, options)
      .catch((error) => {
        if (flights.get(key) === flight) flights.delete(key);
        throw error;
      })
      .finally(() => {
        if (flights.get(key) === flight) flights.delete(key);
      });

    flights.set(key, flight);
    return flight;
  };

  const close = () => {
    if (channel) {
      try { channel.close(); } catch (_error) { /* already closed */ }
      channel = null;
      channelName = '';
    }
    unbindStorage?.();
    flights.clear();
    sessionListeners.clear();
  };

  const unbindStorage = bindStorageFallback();

  return {
    ensureFreshSession,
    publishSession,
    onRemoteSession,
    close,
    waitForWinner,
    /** Re-reads the record and tells listeners; used on focus/visibility reconciliation. */
    reconcile: () => {
      ensureChannel();
      for (const listener of [...sessionListeners]) {
        try {
          listener({ type: SESSION_EVENT_TYPE.SESSION, identity: getIdentity(), source: 'reconcile' });
        } catch (error) {
          console.warn('[sessionCoordinator] reconcile listener failed:', error);
        }
      }
    },
  };
}
