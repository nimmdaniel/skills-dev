// EXP and unlock rules. Pure functions, no UI and no storage.
//
// Every stage has a minimum value per set (seconds for holds, reps for rep stages:
// advancement.minimumValue). A set that reaches it earns the full base share of EXP;
// a set below it earns a proportional share; performance above it earns a capped bonus.
// 100 % EXP unlocks the next stage of the fixed progression. Nothing else unlocks it.
export const BONUS_CAP = 0.5; // at most +50 % of the base share per set

export function stageGoal(stage) {
  const rule = stage.advancement || {};
  const target = rule.minimumValue || (stage.type === 'hold' ? stage.seconds : stage.reps) || 1;
  const setsNeeded = Math.max(1, (rule.qualifyingSessions || 1) * (rule.minimumCleanSets || stage.sets || 1));
  return { target, setsNeeded, base: 100 / setsNeeded, unit: stage.type === 'hold' ? 's' : 'Wdh' };
}

// EXP (in percent of the stage) earned by one completed set.
export function setExp(stage, value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const { target, base } = stageGoal(stage);
  const ratio = value / target;
  return ratio < 1 ? base * ratio : base * (1 + Math.min(BONUS_CAP, ratio - 1));
}

function primaryValues(session, stage) {
  const exercise = session.exercises?.find(ex => ex.stageId === stage.id);
  const values = exercise?.setsCompleted || [];
  // Extra sets beyond the prescription never farm EXP.
  return values.slice(0, stage.sets).filter(Number.isFinite);
}

// EXP earned by one session for one stage.
export function sessionExp(stage, session) {
  if (session.stageId !== stage.id) return 0;
  return primaryValues(session, stage).reduce((sum, value) => sum + setExp(stage, value), 0);
}

export function stageExp(stage, sessions) {
  const seen = new Set();
  let total = 0;
  for (const session of sessions) {
    const key = session.id || session.sessionId;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    total += sessionExp(stage, session);
  }
  return Math.round(total * 10) / 10;
}

// Walks the fixed progression from `base` and reports how far the sessions got.
// `floorAt` ignores sessions older than a deliberate (re)baseline.
export function unlockChain(skill, sessions, base = 0, floorAt = '') {
  const stages = skill.progressions;
  const ordered = sessions
    .filter(s => s.stageId && (!floorAt || (s.at || s.timestamp || '') >= floorAt))
    .sort((a, b) => (a.at || a.timestamp || '').localeCompare(b.at || b.timestamp || '') || String(a.id).localeCompare(String(b.id)));
  const expByStage = {}, unlocks = [];
  let stage = Math.min(Math.max(base, 0), stages.length - 1), mastered = false;
  for (;;) {
    let sum = 0, crossedAt = null;
    const seen = new Set();
    for (const session of ordered) {
      if (session.stageId !== stages[stage].id) continue;
      const key = session.id || session.sessionId;
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      sum += sessionExp(stages[stage], session);
      if (crossedAt === null && sum >= 99.95) crossedAt = session.at || session.timestamp;
    }
    expByStage[stages[stage].id] = Math.min(100, Math.round(sum * 10) / 10);
    if (crossedAt === null) break;
    if (stage === stages.length - 1) { mastered = true; unlocks.push({ stage, at: crossedAt, mastered: true }); break; }
    unlocks.push({ stage: stage + 1, at: crossedAt });
    stage++;
  }
  const current = stages[stage];
  return { stage, mastered, expByStage, unlocks, exp: mastered ? 100 : expByStage[current.id] || 0, goal: stageGoal(current) };
}
