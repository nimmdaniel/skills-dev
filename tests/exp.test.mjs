import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS } from '../data/catalog.js';
import { setExp, stageGoal, stageExp, unlockChain } from '../data/exp.js';
import { projectProgress, flattenSets } from '../data/model.js';

const skill = SKILLS.find(s => s.id === 'front-lever');
const first = skill.progressions[0];
const goal = stageGoal(first);
const session = (n, stage, values, day = n) => ({
  id: `session-${n}`, type: 'session', skillId: skill.id, stageId: stage.id, schemaVersion: 1, catalogVersion: 1,
  at: `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`,
  payload: { exercises: [{ stageId: stage.id, name: stage.name, type: stage.type, setsCompleted: values }] },
});
const full = stage => Array(stage.sets).fill(stage.advancement.minimumValue);

test('a set at the minimum earns the full base share, below it proportionally, above it a capped bonus', () => {
  assert.equal(Math.round(setExp(first, goal.target) * 100) / 100, Math.round(goal.base * 100) / 100);
  assert.equal(setExp(first, goal.target / 2), goal.base / 2);
  assert.equal(setExp(first, 0), 0);
  assert(setExp(first, goal.target * 1.2) > goal.base, 'extra performance earns a bonus');
  assert.equal(setExp(first, goal.target * 10), goal.base * 1.5, 'bonus is capped at +50 %');
  assert.equal(setExp(first, NaN), 0);
});
test('two full sessions of the minimum unlock exactly the next stage', () => {
  const events = [session(1, first, full(first)), session(2, first, full(first))];
  const entry = projectProgress(events, SKILLS)[skill.id];
  assert.equal(entry.stage, 1); assert.equal(entry.mastered, false);
  assert.equal(entry.history.at(-1).auto, true);
  assert.equal(projectProgress(events.slice(0, 1), SKILLS)[skill.id].stage, 0);
  assert.equal(Math.round(projectProgress(events.slice(0, 1), SKILLS)[skill.id].exp), 50);
});
test('extra performance unlocks faster; weak sets alone do not', () => {
  const strong = Array(first.sets).fill(Math.ceil(goal.target * 1.5));
  assert.equal(projectProgress([session(1, first, strong), session(2, first, strong)], SKILLS)[skill.id].stage, 1);
  assert.equal(projectProgress([session(1, first, strong)], SKILLS)[skill.id].stage, 1 - 1 + (stageExp(first, [{ ...session(1, first, strong).payload, id: 'x', stageId: first.id }]) >= 100 ? 1 : 0));
  const weak = Array(first.sets).fill(Math.floor(goal.target / 2));
  assert.equal(projectProgress([session(1, first, weak), session(2, first, weak)], SKILLS)[skill.id].stage, 0);
});
test('stages cannot be skipped: sessions on a locked stage earn nothing', () => {
  const third = skill.progressions[2];
  const entry = projectProgress([session(1, third, full(third)), session(2, third, full(third))], SKILLS)[skill.id];
  assert.equal(entry.stage, 0); assert.equal(entry.expByStage[third.id], undefined);
});
test('surplus sets in a session cannot farm EXP and a replayed session counts once', () => {
  const many = [...full(first), ...full(first), ...full(first)];
  const entry = projectProgress([session(1, first, many), session(1, first, many)], SKILLS)[skill.id];
  assert.equal(Math.round(entry.exp), 50);
});
test('the last stage ends in mastery; unlocked stages stay available', () => {
  const events = []; let n = 1;
  for (const stage of skill.progressions) { events.push(session(n, stage, full(stage), n), session(n + 1, stage, full(stage), n + 1)); n += 2; }
  const entry = projectProgress(events, SKILLS)[skill.id];
  assert.equal(entry.mastered, true); assert.equal(entry.stage, skill.progressions.length - 1);
});
test('old manual stage events act as a starting baseline, EXP continues from there', () => {
  const baseline = { id: 'stage-1', type: 'stage', skillId: skill.id, stageId: skill.progressions[2].id, schemaVersion: 1, catalogVersion: 1, at: '2026-10-01T00:00:00.000Z', payload: { mastered: false, manual: true } };
  assert.equal(projectProgress([baseline], SKILLS)[skill.id].stage, 2);
  assert.equal(projectProgress([baseline, session(1, skill.progressions[2], full(skill.progressions[2]))], SKILLS)[skill.id].stage, 2);
});
test('every achieved set is queryable as reps or seconds', () => {
  const hold = SKILLS.flatMap(s => s.progressions).find(p => p.type === 'hold');
  const holdSkill = SKILLS.find(s => s.progressions.includes(hold));
  const events = [session(1, first, [8, 9, 10]), { ...session(2, hold, [31, 35]), skillId: holdSkill.id }];
  const rows = flattenSets(events, SKILLS);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.filter(r => r.unit === 's').map(r => r.value), [31, 35]);
  assert.deepEqual(rows.filter(r => r.unit === 'reps').map(r => r.value), [8, 9, 10]);
  assert(rows.every(r => r.at && r.skillId && r.stageId && r.set >= 1));
});
