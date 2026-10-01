import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserEnv, createLockManager, loadModule} from './helpers/browser-env.mjs';
import {createManualClock, drain, watch, NEVER_SETTLED} from './helpers/manual-clock.mjs';

const {acquireWithDeadline} = loadModule('assets/js/api/sessionCoordinator.js', createBrowserEnv());

for (const value of [null, NaN, Infinity, 'throws']) test(`N7 invalid initial monotonic reading refuses work: ${value}`, async () => {
  const clock = createManualClock();
  let ran = 0, fences = 0;
  const answer = await acquireWithDeadline(createLockManager(), 'deadline-probe', () => ++ran, {
    timeoutMs: 20,
    scheduler: {...clock.scheduler, monotonicNow() { if (value === 'throws') throw Error('clock unavailable'); return value; }},
    fence: reason => { fences++; return {fenced: reason}; }
  });
  assert.deepEqual(answer, {fenced: 'lock-acquisition-timeout'});
  assert.equal(ran, 0);
  assert.equal(fences, 1);
  assert.deepEqual(clock.pending(), []);
});

test('N7 late grant waits for the already-running asynchronous fence', async () => {
  const clock = createManualClock(), locks = createLockManager();
  const release = locks.hold('deadline-probe');
  let finishFence, fences = 0, ran = 0;
  const answer = watch(acquireWithDeadline(locks, 'deadline-probe', () => ++ran, {
    timeoutMs: 20, scheduler: clock.scheduler,
    fence: async reason => { fences++; await new Promise(resolve => finishFence = resolve); return {fenced: reason}; }
  }));
  clock.advance(20); await clock.flush();
  assert.equal(fences, 1);
  release(); await drain();
  assert.equal(answer.value, NEVER_SETTLED, 'grant must not return the uninitialized fence result');
  finishFence(); await drain();
  assert.deepEqual(answer.value, {fenced: 'lock-acquisition-timeout'});
  assert.equal(ran, 0); assert.equal(fences, 1);
});

test('N7 a clock regression above its initial value cannot extend the budget', async () => {
  const clock = createManualClock({now: 100}), locks = createLockManager();
  const release = locks.hold('deadline-probe');
  let timerCallback, timerId, ran = 0;
  const scheduler = {...clock.scheduler, setTimer(fn, delay) {
    timerCallback = fn; timerId = clock.scheduler.setTimer(fn, delay); return timerId;
  }};
  const answer = watch(acquireWithDeadline(locks, 'deadline-probe', () => ++ran, {
    timeoutMs: 100, scheduler, fence: reason => ({fenced: reason})
  }));
  clock.set(150); clock.scheduler.clearTimer(timerId); timerCallback();
  assert.deepEqual(clock.pending().map(t => t.delay), [50]);
  clock.set(140); release(); await drain();
  assert.deepEqual(answer.value, {fenced: 'lock-acquisition-timeout'});
  assert.equal(ran, 0);
});
