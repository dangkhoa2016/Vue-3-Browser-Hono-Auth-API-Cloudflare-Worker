/**
 * A clock and a timer queue that only move when a test moves them.
 *
 * The reason this exists (FR9-01, FR9-02): the acquisition deadline used to be checked against a wall
 * clock *and* against a budget of counted timer ticks, and the only way to observe it was to wait. So a
 * 20-second deadline that was silently shortened to 15 seconds could only be found by running the module
 * by hand outside the suite — and the regression that would have caught it needs 20 real seconds per run,
 * which is why it was not written. One R7 attempt made it cheaper by raising the multiplier until five
 * runs happened to be green; that is not evidence of anything.
 *
 * With this, the deadline under test is 20 000 ms and the test costs microseconds: `advance()` moves the
 * clock, `flush()` fires whatever is due, and every assertion is taken at a moment the test chose. The
 * scheduler it exposes has the same shape as the product's (`monotonicNow`, `setTimer`, `clearTimer`), so
 * the code under test cannot tell it from the real one.
 */

/** Yields to the event loop enough times for a chain of awaited promises to finish. */
export const drain = async (turns = 6) => {
  for (let index = 0; index < turns; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

/** The answer of a promise that has not settled yet, so "still waiting" is a fact and not a hang. */
export const NEVER_SETTLED = Symbol('never-settled');

/**
 * A promise that is observed rather than awaited.
 *
 * `let settled = false; p.then(() => { settled = true; })` leaves a floating promise and a variable to
 * remember; this is the same thing with the flag and the value in one place, and `pending()` reports
 * NEVER_SETTLED so a test can assert on "has not finished yet" without racing a stopwatch.
 */
export function watch(promise) {
  const state = { value: NEVER_SETTLED, done: false };
  Promise.resolve(promise).then(
    (value) => { state.value = value; state.done = true; },
    (error) => { state.value = error; state.done = true; }
  );
  return state;
}

/**
 * @param {{now?: number, monotonicAvailable?: boolean}} options
 *   `monotonicAvailable: false` models a runtime with no monotonic clock at all, which is the degraded
 *   mode the product has to have a stated policy for rather than an improvised one.
 */
export function createManualClock({ now = 0, monotonicAvailable = true } = {}) {
  let current = now;
  let sequence = 0;
  /** @type {Map<number, {handler: Function, due: number}>} */
  const timers = new Map();

  const scheduler = {
    monotonicNow: () => (monotonicAvailable ? current : null),
    setTimer(handler, delayMs) {
      sequence += 1;
      timers.set(sequence, { handler, due: current + Math.max(0, Number(delayMs) || 0) });
      return sequence;
    },
    clearTimer(handle) {
      timers.delete(handle);
    }
  };

  return {
    scheduler,
    get now() { return current; },
    set(value) { current = value; },
    advance(ms) { current += ms; },

    /** Every armed timer, as `{ id, due, delay }`, so a test can assert *when* the deadline re-armed. */
    pending: () => [...timers.entries()]
      .map(([id, timer]) => ({ id, due: timer.due, delay: timer.due - current }))
      .sort((a, b) => a.due - b.due || a.id - b.id),

    /**
     * Fires every timer due at or after the current time, in due order, re-arming as it goes.
     *
     * Re-arming is the point: a deadline that re-arms for the remaining time installs a *new* timer while
     * this loop is running, and the loop has to see it or the last step of a 20 000 ms deadline would
     * never be reached. The event loop is yielded between rounds because the handlers settle promises.
     */
    async flush() {
      for (let round = 0; round < 1000; round += 1) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.due <= current)
          .sort((a, b) => a[1].due - b[1].due || a[0] - b[0]);
        if (due.length === 0) return;
        for (const [id, timer] of due) {
          timers.delete(id);
          timer.handler();
        }
        await drain(2);
      }
      throw new Error('createManualClock.flush: timers kept re-arming without ever running out');
    }
  };
}
