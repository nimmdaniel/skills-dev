// One framework-independent runner for React, the design variants and Android.
// Clock ticks update the display; elapsed time comes from a clock anchor.
const PREP_MS = 3000;
const MAX_UNOBSERVED_MS = 10000;
const clone = value => JSON.parse(JSON.stringify(value));
const nonNegative = value => Number.isFinite(value) && value >= 0;
const validBlocks = blocks => Array.isArray(blocks) && blocks.length > 0 && blocks.every(b =>
  b && ['hold', 'reps'].includes(b.type) && Number.isInteger(b.sets) && b.sets > 0 &&
  nonNegative(b.restSeconds) && (b.type === 'hold' ? b.seconds > 0 : b.reps > 0));
const id = () => globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createRunner({ skill, stage, blocks, resume = null, onUpdate = () => {},
  onPersist = () => {}, now = () => Date.now(), setInterval: schedule = globalThis.setInterval,
  clearInterval: unschedule = globalThis.clearInterval } = {}) {
  if (!skill?.progressions?.[stage]) throw new Error('Unbekannte Skill-Stufe');
  const stageId = skill.progressions[stage].id;
  const candidate = resume?.skillId === skill.id && (resume.stageId ? resume.stageId === stageId : resume.stage === stage) ? resume : null;
  const saved = candidate && Number.isInteger(candidate.blockIndex) && Number.isInteger(candidate.setIndex) ? candidate : null;
  const plan = saved?.schemaVersion === 2 && validBlocks(saved.blocks) ? saved.blocks : blocks;
  if (!validBlocks(plan)) throw new Error('Ungültiger Trainingsplan');
  const t = now();
  const r = {
    skill, stage, blocks: clone(plan), sessionId: saved?.sessionId || id(),
    bi: 0, si: 0, phase: 'prep', total: PREP_MS, left: PREP_MS,
    workMs: 0, paused: false, rpe: null, quality: {}, startedAt: t, endedAt: null,
    activeDurationMs: 0, log: plan.map(() => []), reps: plan[0].reps || 0,
    completionStatus: null, interruption: '', persistenceError: '', revision: 0,
  };
  Object.defineProperties(r, {
    p: { get: () => r.blocks[r.bi] }, set: { get: () => r.si + 1 },
    sets: { get: () => r.p.sets }, logCur: { get: () => r.log[r.bi] },
    isHold: { get: () => r.p.type === 'hold' },
  });
  if (saved && saved.blockIndex >= 0 && saved.blockIndex < plan.length &&
      saved.setIndex >= 0 && saved.setIndex < plan[saved.blockIndex].sets &&
      Array.isArray(saved.log) && saved.log.length === plan.length &&
      saved.log.every((values, i) => Array.isArray(values) && values.length <= plan[i].sets && values.every(nonNegative))) {
    Object.assign(r, {
      bi: saved.blockIndex, si: saved.setIndex, log: clone(saved.log),
      startedAt: Number.isFinite(saved.startedAt) ? saved.startedAt : t,
      rpe: saved.rpe || null, quality: clone(saved.quality || {}),
      reps: nonNegative(saved.actualReps) ? saved.actualReps : plan[saved.blockIndex].reps || 0,
      phase: ['prep', 'work', 'rest', 'done'].includes(saved.phase) ? saved.phase : 'prep',
    });
    if (saved.schemaVersion === 2) {
      for (const key of ['total', 'left', 'workMs', 'activeDurationMs']) if (nonNegative(saved[key])) r[key] = saved[key];
      r.endedAt = Number.isFinite(saved.endedAt) ? saved.endedAt : null;
      r.completionStatus = saved.completionStatus || null;
    } else {
      // A legacy rest snapshot already contains this set. Never replay it.
      if (r.phase === 'rest') r.total = r.left = r.p.restSeconds * 1000;
      else if (r.phase !== 'done') r.phase = 'prep';
    }
    r.paused = r.phase !== 'done';
    r.interruption = r.paused ? 'Wiederaufgenommen – Werte prüfen und fortsetzen' : '';
    if (r.phase === 'done') {
      r.left = 0;
      r.endedAt ||= t;
      r.completionStatus ||= 'completed';
    }
  }
  let lastAt = t, interval = null, running = false, persistRevision = 0, detached = false;
  const notify = () => { if (!detached) onUpdate(r); };
  r.snapshot = () => clone({
    schemaVersion: 2, sessionId: r.sessionId, skillId: skill.id, stage, stageId,
    blocks: r.blocks, blockIndex: r.bi, setIndex: r.si, phase: r.phase,
    total: r.total, left: r.left, workMs: r.workMs, paused: r.paused,
    log: r.log, rpe: r.rpe, quality: r.quality, actualReps: r.reps,
    startedAt: r.startedAt, endedAt: r.endedAt, activeDurationMs: r.activeDurationMs,
    completionStatus: r.completionStatus,
  });
  r.persist = () => {
    const revision = ++persistRevision;
    let result;
    try { result = onPersist(r.snapshot()); } catch (error) { result = Promise.reject(error); }
    return Promise.resolve(result).then(() => {
      if (revision === persistRevision && r.persistenceError) { r.persistenceError = ''; notify(); }
      return true;
    }, error => {
      if (revision === persistRevision) {
        r.persistenceError = error?.message || 'Zwischenstand konnte nicht gespeichert werden';
        notify();
      }
      return false;
    });
  };
  const checkpoint = () => { r.revision++; r.persist(); notify(); };
  const move = (phase, duration) => {
    r.phase = phase; r.total = duration; r.left = duration; r.workMs = 0; lastAt = now();
    if (phase === 'work') r.reps = r.p.reps || 0;
  };
  const finish = status => {
    r.phase = 'done'; r.left = 0; r.paused = false; r.endedAt = now();
    r.completionStatus = status === 'completed' && r.blocks.some((b, i) => r.log[i].length < b.sets) ? 'partial' : status;
    r.interruption = '';
  };
  const next = () => {
    if (r.si + 1 < r.p.sets) { r.si++; move('prep', PREP_MS); }
    else if (r.bi + 1 < r.blocks.length) { r.bi++; r.si = 0; move('prep', PREP_MS); }
    else finish('completed');
  };
  // Long unobserved gaps are interruption evidence, never exercise evidence.
  function sample() {
    const time = now(), delta = time - lastAt;
    lastAt = time;
    if (r.paused || r.phase === 'done') return false;
    if (delta < 0 || delta > MAX_UNOBSERVED_MS) {
      r.paused = true;
      r.interruption = 'Training unterbrochen – aktuellen Satz prüfen';
      checkpoint();
      return false;
    }
    r.activeDurationMs += delta;
    if (r.phase === 'work') r.workMs += delta;
    if (r.phase !== 'work' || r.isHold) r.left = Math.max(0, r.left - delta);
    return true;
  }
  r.tick = () => {
    if (!sample()) return;
    if (r.left <= 0) {
      if (r.phase === 'prep') { move('work', r.isHold ? r.p.seconds * 1000 : 0); checkpoint(); return; }
      if (r.phase === 'rest') { next(); checkpoint(); return; }
      if (r.phase === 'work' && r.isHold) { finishSet(false); return; }
    }
    notify();
  };
  function finishSet(sampleFirst = true) {
    if (r.phase !== 'work') return;
    if (sampleFirst && !r.paused) sample();
    if (r.paused && r.interruption) return;
    // Index assignment makes even a restored, already-recorded set idempotent.
    r.log[r.bi][r.si] = r.isHold ? Math.min(r.p.seconds, Math.floor(r.workMs / 1000)) : r.reps;
    if (r.si + 1 >= r.p.sets && r.bi + 1 >= r.blocks.length) finish('completed');
    else move('rest', r.p.restSeconds * 1000);
    checkpoint();
  }
  r.finishSet = () => finishSet();
  r.skip = () => {
    if (r.paused || !['prep', 'rest'].includes(r.phase)) return;
    if (!sample()) return;
    if (r.phase === 'prep') move('work', r.isHold ? r.p.seconds * 1000 : 0);
    else next();
    checkpoint();
  };
  r.skipBlock = () => {
    if (r.phase === 'done') return;
    sample();
    if (r.bi + 1 >= r.blocks.length) finish('partial');
    else { r.bi++; r.si = 0; move('prep', PREP_MS); }
    checkpoint();
  };
  r.addRest = (milliseconds = 30000) => {
    if (r.phase !== 'rest' || !Number.isFinite(milliseconds)) return;
    sample(); r.left = Math.max(0, r.left + milliseconds); r.total = Math.max(0, r.total + milliseconds); checkpoint();
  };
  r.adj = delta => {
    if (r.phase !== 'work' || r.isHold || !Number.isFinite(delta)) return;
    r.reps = Math.max(0, Math.round(r.reps + delta)); checkpoint();
  };
  r.correctSet = (blockIndex, setIndex, value) => {
    if (!nonNegative(value) || !Number.isInteger(blockIndex) || !Number.isInteger(setIndex) || r.log[blockIndex]?.[setIndex] === undefined) return false;
    r.log[blockIndex][setIndex] = r.blocks[blockIndex].type === 'reps' ? Math.round(value) : value;
    checkpoint(); return true;
  };
  r.pause = () => {
    if (r.phase === 'done') return;
    if (r.paused) { r.paused = false; r.interruption = ''; lastAt = now(); }
    else { sample(); r.paused = true; }
    checkpoint();
  };
  r.suspend = (reason = 'Training pausiert') => {
    if (r.phase === 'done') return;
    sample(); r.paused = true; r.interruption = reason; checkpoint();
  };
  r.endEarly = () => {
    if (r.phase === 'done') return;
    sample(); finish('partial'); checkpoint();
  };
  r.setRpe = value => { r.rpe = r.rpe === value ? null : value; checkpoint(); };
  r.sig = () => [r.phase, r.bi, r.si, r.revision, r.paused, r.rpe, r.persistenceError].join();
  r.metTarget = () => {
    const b = r.blocks[0], values = r.log[0];
    return values.length >= b.sets && values.every(value => value >= (b.type === 'hold' ? b.seconds : b.reps));
  };
  r.sessionData = () => clone({
    sessionId: r.sessionId, timestamp: new Date(r.endedAt ?? now()).toISOString(),
    skillId: skill.id, progressionStage: stage, stageId,
    totalDurationSeconds: Math.max(0, Math.round(((r.endedAt ?? now()) - r.startedAt) / 1000)),
    activeDurationSeconds: Math.round(r.activeDurationMs / 1000),
    status: r.completionStatus || 'partial', rpe: r.rpe, metTarget: r.metTarget(),
    exercises: r.blocks.map((b, i) => ({ name: b.name, role: b.role, type: b.type,
      ...(b.id ? { stageId: b.id } : {}), prescription: b, setsCompleted: r.log[i] })),
  });
  r.start = () => {
    if (running) return;
    running = true; detached = false; lastAt = now();
    interval = schedule(r.tick, 100); checkpoint();
  };
  r.stop = ({ persist = true } = {}) => {
    if (interval !== null) unschedule(interval);
    interval = null; running = false;
    // A completed runner may already have been cleared by durable save.
    if (persist && r.phase !== 'done') r.suspend();
    detached = true;
  };
  r.detach = () => r.stop({ persist: false });
  return r;
}
