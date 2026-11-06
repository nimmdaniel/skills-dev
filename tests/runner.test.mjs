import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner } from '../runner/engine.js';
import { buildWorkoutBlocks } from '../runner/blocks.js';

const skill = { id: 'test', category: 'core', progressions: [
  { id: 'test/first', name: 'Hold', type: 'hold', sets: 2, seconds: 20, restSeconds: 30 },
  { id: 'test/second', name: 'Reps', type: 'reps', sets: 2, reps: 5, restSeconds: 30 },
] };
function fixture({ blocks = [skill.progressions[0]], resume, onPersist, ...options } = {}) {
  let time = Date.parse('2026-11-05T09:00:00Z'), intervalCount = 0;
  const writes = [], updates = [];
  const r = createRunner({ skill, stage: 0, blocks, resume,
    now: () => time, setInterval: () => ++intervalCount, clearInterval: () => {},
    onUpdate: value => updates.push(value.phase),
    onPersist: onPersist || (snapshot => { writes.push(snapshot); }), ...options });
  return { r, writes, updates, advance: ms => { time += ms; }, tick: ms => { time += ms; r.tick(); }, count: () => intervalCount };
}
test('workout blocks preserve defaults and do not share catalogue objects', () => {
  const plan = buildWorkoutBlocks(skill, 1);
  assert.equal(plan[0].role, 'Primär'); assert.equal(plan[1].restSeconds, 75);
  assert.equal(plan[2].restSeconds, 45);
  plan[0].name = 'changed'; assert.equal(skill.progressions[1].name, 'Reps');
});
test('elapsed time comes from the clock, and interval ticks do not write checkpoints', () => {
  const f = fixture(); f.r.start(); f.r.start(); assert.equal(f.count(), 1);
  f.r.skip(); const count = f.writes.length;
  f.tick(1250); f.tick(2750);
  assert.equal(f.r.workMs, 4000); assert.equal(f.r.left, 0, 'hold runs forward as a stopwatch');
  assert.equal(f.writes.length, count);
  f.r.finishSet(); assert.deepEqual(f.r.log, [[4]]); assert.equal(f.r.phase, 'rest');
  f.r.finishSet(); assert.deepEqual(f.r.log, [[4]], 'double click cannot duplicate a set');
});
test('manual pause excludes elapsed downtime and preserves the hold', () => {
  const f = fixture(); f.r.skip(); f.tick(4000); f.r.pause();
  f.tick(60000); assert.equal(f.r.workMs, 4000);
  f.r.pause(); f.tick(3000); f.r.finishSet();
  assert.equal(f.r.log[0][0], 7); assert.equal(f.r.activeDurationMs, 7000);
});
test('a long unobserved gap pauses instead of inventing successful holds', () => {
  const f = fixture(); f.r.skip(); f.tick(2000); f.tick(120000);
  assert.equal(f.r.paused, true); assert.equal(f.r.phase, 'work'); assert.equal(f.r.workMs, 2000);
  assert.deepEqual(f.r.log, [[]]);
  f.r.finishSet(); assert.deepEqual(f.r.log, [[]]);
  f.r.pause(); f.tick(1000); f.r.finishSet(); assert.deepEqual(f.r.log, [[3]]);
});
test('the last set still offers the slider step; summary timestamp is stable', () => {
  const f = fixture({ blocks: [{ ...skill.progressions[1], sets: 1 }] });
  f.r.skip(); f.r.finishSet();
  assert.equal(f.r.phase, 'rest', 'last set also ends in the adjust step'); assert.deepEqual(f.r.log, [[5]]);
  assert(f.r.correctSet(0, 0, 3)); f.r.skip();
  assert.equal(f.r.phase, 'done'); assert.deepEqual(f.r.log, [[3]]);
  const data = f.r.sessionData(); f.advance(60000);
  assert.deepEqual(f.r.sessionData(), data);
  const writes = f.writes.length; f.r.stop(); assert.equal(f.writes.length, writes);
});
test('v2 reload restores the saved plan and hold state paused without counting downtime', () => {
  const f = fixture(); f.r.skip(); f.tick(5000); f.r.suspend('App hidden');
  const snapshot = f.r.snapshot();
  const next = fixture({ resume: snapshot, blocks: [{ ...skill.progressions[0], seconds: 999 }] });
  assert.equal(next.r.p.seconds, 20); assert.equal(next.r.paused, true);
  assert.equal(next.r.workMs, 5000);
  assert.equal(next.r.sessionId, f.r.sessionId);
  next.tick(60000); next.r.pause(); next.tick(2000); next.r.finishSet();
  assert.deepEqual(next.r.log, [[7]]);
});
test('legacy rest resume never repeats the set already in the log', () => {
  const resume = { skillId: skill.id, stage: 0, blockIndex: 0, setIndex: 0,
    phase: 'rest', startedAt: Date.now(), log: [[12]] };
  const f = fixture({ resume });
  assert.equal(f.r.phase, 'rest'); assert.equal(f.r.paused, true);
  f.r.pause(); f.r.skip(); assert.equal(f.r.si, 1); assert.equal(f.r.phase, 'prep');
  f.r.skip(); f.tick(3000); f.r.finishSet();
  assert.deepEqual(f.r.log, [[12, 3]]); assert.equal(f.r.phase, 'rest'); f.r.skip(); assert.equal(f.r.phase, 'done');
});
test('snapshot and summary are detached copies; partial work and corrections are retained', () => {
  const f = fixture(); f.r.skip(); f.tick(4000); f.r.finishSet();
  const snapshot = f.r.snapshot(); snapshot.log[0][0] = 900; snapshot.blocks[0].seconds = 900;
  assert.equal(f.r.log[0][0], 4); assert.equal(f.r.p.seconds, 20);
  assert.equal(f.r.correctSet(0, 0, 3), true); assert.equal(f.r.correctSet(0, 0, -1), false);
  f.r.endEarly(); const data = f.r.sessionData();
  assert.equal(data.status, 'partial'); assert.deepEqual(data.exercises[0].setsCompleted, [3]);
  data.exercises[0].setsCompleted[0] = 100;
  assert.equal(f.r.log[0][0], 3);
});
test('skip block produces a partial session even when the final block is completed', () => {
  const f = fixture({ blocks: [{ ...skill.progressions[0], sets: 1 }, { ...skill.progressions[1], sets: 1 }] });
  f.r.skipBlock(); f.r.skip(); f.r.finishSet(); f.r.skip();
  assert.equal(f.r.phase, 'done'); assert.equal(f.r.sessionData().status, 'partial');
});
test('persistence errors are visible, can be retried, and do not destroy the state', async () => {
  let fail = true;
  const f = fixture({ onPersist: async () => { if (fail) throw new Error('disk full'); } });
  assert.equal(await f.r.persist(), false); assert.equal(f.r.persistenceError, 'disk full');
  fail = false; assert.equal(await f.r.persist(), true); assert.equal(f.r.persistenceError, '');
});
test('detach leaves the checkpoint untouched and supports React effect cleanup/setup', () => {
  const f = fixture(); f.r.start(); f.r.skip(); const writes = f.writes.length;
  f.r.stop({ persist: false }); assert.equal(f.writes.length, writes); assert.equal(f.r.paused, false);
  f.r.start(); f.tick(1000); assert.equal(f.r.workMs, 1000);
});
test('a hold is a minimum: it keeps running past the target and the full time counts as extra performance', () => {
  const f = fixture({ blocks: [{ ...skill.progressions[0], seconds: 3 }] });
  f.r.skip(); f.tick(4500);
  assert.equal(f.r.phase, 'work', 'reaching the target does not end the hold');
  f.tick(5500); f.r.finishSet();
  assert.deepEqual(f.r.log, [[10]]); assert.equal(f.r.phase, 'rest');
  assert.equal(f.r.left, 30000);
  assert(f.r.correctSet(0, 0, 25) && f.r.log[0][0] === 25, 'the rest slider can raise or lower the result');
});
test('nothing counts down or advances by itself: start, hold and rest are stopwatches', () => {
  const f = fixture({ blocks: [{ ...skill.progressions[0], restSeconds: 5 }] });
  for (let i = 0; i < 6; i++) f.tick(10000);
  assert.equal(f.r.phase, 'prep', 'no automatic start'); assert.equal(f.r.paused, false);
  f.r.skip(); f.tick(1000); assert.equal(f.r.workMs, 1000);
  f.r.finishSet(); f.tick(4000); f.tick(8000);
  assert.equal(f.r.phase, 'rest', 'rest never ends by itself'); assert.equal(f.r.workMs, 12000);
  assert.equal(f.r.left, 0);
});
test('reps default to the target; the slider result is the saved value', () => {
  const f = fixture({ blocks: [{ ...skill.progressions[1], sets: 2 }] });
  f.r.skip(); f.r.finishSet(); assert.deepEqual(f.r.log, [[5]]);
  assert(f.r.correctSet(0, 0, 7, { live: true })); assert.deepEqual(f.r.log, [[7]]);
  assert.equal(f.r.correctSet(0, 1, 4), false, 'an unfinished set cannot be edited');
});
test('conditioning never repeats an exercise already in the session', () => {
  const pull = { id: 'p', category: 'pull', progressions: [{ id: 'p/scapula', name: 'Scapula Pulls', type: 'reps', sets: 3, reps: 10, restSeconds: 60 }] };
  assert.deepEqual(buildWorkoutBlocks(pull, 0).map(b => b.role), ['Primär']);
});
