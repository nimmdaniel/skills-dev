import { unlockChain } from './exp.js';
// Immutable events are the sync unit. Stable stage IDs survive catalogue reordering.
export function projectProgress(events, skills) {
  const result = {};
  const ordered = [...new Map(events.map(e => [e.id, e])).values()].sort((a,b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  for (const event of ordered) {
    const skill = skills.find(s => s.id === event.skillId);
    if (!skill || event.catalogVersion !== 1) continue;
    const stage = skill.progressions.findIndex(p => p.id === event.stageId);
    if (stage < 0) continue;
    const entry = result[skill.id] ||= { stage: 0, mastered: false, history: [], holds: [], sessions: [] };
    if (event.type === 'legacy') {
      // Migration is a baseline, never a replacement for later native events.
      if (!entry.native) {
        entry.stage = entry.base = stage;
        entry.history.push(...(event.payload.history || []));
        entry.holds.push(...(event.payload.holds || []));
        entry.sessions.push(...(event.payload.sessions || []));
      }
    } else if (event.type === 'stage') {
      entry.native = true;
      entry.stage = entry.base = stage;
      entry.baseAt = event.at;
      entry.forcedMastered = event.payload.mastered === true;
      entry.mastered = entry.forcedMastered;
      entry.history.push({ stage, name: skill.progressions[stage].name, masteredAt: event.at, reset: !!event.payload.reset, manual: event.payload.manual });
    } else if (event.type === 'hold') {
      entry.holds.push({ ...event.payload, stage, at: event.at, id: event.id, stageId: event.stageId });
    } else if (event.type === 'session') {
      entry.sessions.push({ ...event.payload, stage, at: event.at, timestamp: event.at, id: event.id, stageId: event.stageId });
    }
  }
  // Stages are unlocked by EXP only: the stage is derived from the fixed progression,
  // never chosen. Old manual stage events act as the starting baseline.
  for (const [skillId, entry] of Object.entries(result)) {
    const skill = skills.find(s => s.id === skillId);
    const chain = unlockChain(skill, entry.sessions, entry.base || 0, entry.native ? entry.baseAt : '');
    entry.stage = chain.stage;
    entry.mastered = chain.mastered || entry.forcedMastered === true;
    entry.exp = chain.exp;
    entry.expByStage = chain.expByStage;
    entry.goal = chain.goal;
    for (const unlock of chain.unlocks) entry.history.push({ stage: unlock.stage, name: skill.progressions[unlock.stage].name, masteredAt: unlock.at, auto: true });
  }
  return result;
}
// Flat, queryable record of every achieved set (reps or seconds) for tools and UI.
export function flattenSets(events, skills) {
  const rows = [];
  for (const event of events) {
    if (event.type !== 'session') continue;
    const skill = skills.find(s => s.id === event.skillId);
    for (const exercise of event.payload.exercises || []) {
      (exercise.setsCompleted || []).forEach((value, index) => rows.push({
        at: event.at, sessionId: event.payload.sessionId || event.id, skillId: event.skillId,
        stageId: exercise.stageId || event.stageId, exercise: exercise.name, role: exercise.role,
        set: index + 1, value, unit: exercise.type === 'hold' ? 's' : 'reps', skill: skill?.name,
      }));
    }
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at) || a.set - b.set);
}
export function validateEvent(e, skills) {
  if (!e || typeof e.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(e.id) || e.schemaVersion !== 1 || e.catalogVersion !== 1 || !Number.isFinite(Date.parse(e.at))) throw new Error('Ungültiges Fortschrittsereignis');
  const stage = skills.find(s => s.id === e.skillId)?.progressions.find(s => s.id === e.stageId);
  if (!stage || !['hold','session','stage','legacy'].includes(e.type) || !e.payload || typeof e.payload !== 'object') throw new Error('Unbekannte Skill-Stufe');
  if (e.type === 'hold' && !(Number.isFinite(e.payload.duration) && e.payload.duration > 0)) throw new Error('Ungültige Haltezeit');
  if (e.type === 'session' && (!Array.isArray(e.payload.exercises) || e.payload.exercises.some(x => !Array.isArray(x.setsCompleted) || x.setsCompleted.some(v => !Number.isFinite(v) || v < 0)))) throw new Error('Ungültige Trainingsdaten');
  return e;
}
export function legacyEvents(progress, skills) {
  return skills.flatMap(skill => {
    const p = progress?.[skill.id];
    if (!p || !Number.isInteger(p.stage) || p.stage < 0 || p.stage >= skill.progressions.length) return [];
    return [{ id: `legacy-v1-${skill.id}`, schemaVersion: 1, catalogVersion: 1, type: 'legacy', skillId: skill.id, stageId: skill.progressions[p.stage].id, at: '2000-01-01T00:00:00.000Z', payload: { ...p, history:Array.isArray(p.history) ? p.history : [], holds:Array.isArray(p.holds) ? p.holds : [], sessions:Array.isArray(p.sessions) ? p.sessions : [], mastered: false } }];
  });
}
