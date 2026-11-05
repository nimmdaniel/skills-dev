import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SKILLS } from '../data/catalog.js';
import { createRunner } from '../runner/engine.js';
import { buildWorkoutBlocks } from '../runner/blocks.js';

const root = fileURLToPath(new URL('..', import.meta.url));

// 1. Alle vier Oberflächen (Original + A/B/C) laufen über denselben Kern.
const core = await fs.readFile(root + 'designs/core.js', 'utf8');
const card = await fs.readFile(root + 'SkillsCard.jsx', 'utf8');
for (const [name, source] of [['designs/core.js', core], ['SkillsCard.jsx', card]]) {
  assert(/runner\/engine\.js/.test(source), `${name} importiert den gemeinsamen Runner nicht`);
  assert(/runner\/blocks\.js/.test(source), `${name} importiert die gemeinsamen Blöcke nicht`);
  assert(!/setInterval\(\s*\(\)\s*=>\s*\{[^}]*left\s*-=/.test(source), `${name} enthält eine eigene Timer-Logik`);
}
for (const file of ['a-iron-room.js', 'b-gravity-map.js', 'c-riso-climb.js']) {
  const source = await fs.readFile(root + 'designs/' + file, 'utf8');
  assert(/from '\.\/core\.js'/.test(source), `${file} nutzt core.js nicht`);
}

// 2. Derselbe Ablauf mit Fake-Uhr erzeugt deterministische Ergebnisse.
const skill = SKILLS.find(s => s.progressions.some(p => p.type === 'hold')) || SKILLS[0];
const stage = skill.progressions.findIndex(p => p.type === 'hold');
assert(stage >= 0, 'kein Hold-Skill im Katalog');

function harness(resume = null, persistFails = false) {
  let t = 1_000_000, tickFn = null;
  const snapshots = [];
  const r = createRunner({
    skill, stage, blocks: buildWorkoutBlocks(skill, stage), resume,
    now: () => t, setInterval: fn => { tickFn = fn; return 1; }, clearInterval() {},
    onPersist: s => { snapshots.push(s); if (persistFails) throw new Error('disk full'); },
  });
  const advance = ms => { for (let done = 0; done < ms; done += 100) { t += Math.min(100, ms - done); tickFn?.(); } };
  return { r, advance, snapshots, jump: ms => { t += ms; } };
}

{
  const { r, advance, snapshots } = harness();
  r.start();
  assert.equal(r.phase, 'prep');
  advance(30000);
  assert.equal(r.phase, 'prep', 'kein Countdown: der Start ist ein Tippen');
  r.skip();
  assert.equal(r.phase, 'work');
  const target = r.p.seconds;
  advance(4000);
  r.finishSet();
  r.finishSet(); // Doppeltippen
  assert.equal(r.log[0].length, 1, 'Doppeltippen erzeugt keinen zweiten Satz');
  assert.equal(r.log[0][0], 4, 'Hold wird mit tatsächlicher Zeit erfasst, nicht mit Zielzeit');
  assert(r.log[0][0] < target);
  assert.equal(r.phase, 'rest');
  assert(r.correctSet(0, 0, 5) && r.log[0][0] === 5, 'Korrektur ändert den richtigen Satz');
  advance(5000); assert.equal(r.phase, 'rest', 'die Pause endet nie von selbst');
  assert(snapshots.length > 3, 'Zwischenstand wird nach Aktionen gespeichert');
  const id = r.sessionId;
  r.endEarly();
  const data = r.sessionData();
  assert.equal(data.sessionId, id);
  assert.equal(data.status, 'partial');
  assert.deepEqual(data.exercises[0].setsCompleted, [5]);
  assert(!('volume' in data), 'Sekunden und Wiederholungen werden nicht addiert');
  r.stop();
}

{
  // Unterbrechung im Arbeitssatz: keine erfundene Leistung, Neustart nimmt pausiert wieder auf.
  const { r, advance, jump, snapshots } = harness();
  r.start(); r.skip(); advance(2000);
  jump(60_000); // Anruf / Bildschirmsperre
  r.tick();
  assert(r.paused && r.interruption, 'lange Lücke pausiert');
  assert.equal(r.log[0].length, 0, 'unbeobachtete Zeit erzeugt keinen Satz');
  const saved = JSON.parse(JSON.stringify(snapshots.at(-1)));
  r.stop({ persist: false });
  const restored = harness(saved);
  assert.equal(restored.r.sessionId, r.sessionId, 'gleiche Einheiten-ID nach Neustart');
  assert(restored.r.paused, 'wiederaufgenommene Einheit startet pausiert');
  assert.equal(restored.r.log[0].length, 0);
}

{
  // Speicherfehler sind sichtbar und blockieren den Runner nicht.
  const { r, advance } = harness(null, true);
  r.start(); r.skip();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert(r.persistenceError, 'Speicherfehler wird angezeigt');
  assert.equal(r.phase, 'work');
}

console.log('Runner integration passed: shared core in 4 surfaces, actual hold time, stopwatch without countdowns, double tap, correction, interruption, resume, save errors');
