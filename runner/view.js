// One display model for every surface (React card and design variants A/B/C).
// Surfaces only decide how this looks; what is shown and what the numbers mean lives here.
import { setExp, stageGoal } from '../data/exp.js';

const PHASE_LABEL = { prep: 'Bereit machen', work: 'Los', rest: 'Pause', done: 'Fertig' };

export function sliderRange(target, value) {
  return { min: 0, max: Math.max(Math.ceil(target * 2), Math.ceil(value + 5)), step: 1 };
}

export function runnerView(r, baseExp = 0) {
  const block = r.blocks[Math.min(r.bi, r.blocks.length - 1)];
  const target = block.type === 'hold' ? block.seconds : block.reps;
  const hold = block.type === 'hold';
  const unit = hold ? 's' : 'Wdh';
  const unitLong = hold ? 'Sekunden' : 'Wiederholungen';
  const working = r.phase === 'work';
  const elapsed = Math.floor(r.workMs / 1000);
  const lastSet = r.si + 1 >= block.sets && r.bi + 1 >= r.blocks.length;
  // Nothing counts down: holds and rests count up, reps are set with the slider afterwards.
  const value = r.phase === 'done' ? null
    : working ? (hold ? elapsed : r.reps)
    : r.phase === 'rest' ? elapsed : 0;
  const reached = working && value >= target;
  const logged = r.log[r.bi]?.[r.si];
  // EXP always belongs to the primary exercise (block 0), the stage being unlocked.
  const earned = r.log[0].reduce((sum, v) => sum + setExp(r.blocks[0], v), 0);
  const liveSet = r.bi === 0 && working ? setExp(block, value) : 0;
  const view = {
    phase: r.phase, phaseLabel: PHASE_LABEL[r.phase], paused: r.paused, interruption: r.interruption,
    persistenceError: r.persistenceError, role: block.role, name: block.name,
    blockLabel: `Übung ${r.bi + 1}/${r.blocks.length}`, setLabel: `Satz ${r.si + 1}/${block.sets}`,
    hold, unit, unitLong, target, value,
    // holds count up (stopwatch); prep and rest count down; reps are entered by the athlete
    counting: working ? (hold ? 'up' : 'manual') : r.phase === 'rest' ? 'up' : 'none',
    elapsed, restTarget: block.restSeconds, restReached: r.phase === 'rest' && elapsed >= block.restSeconds, lastSet,
    sideHint: block.sidePolicy === 'both' ? 'Einseitig: beide Seiten gleich oft – die schwächere Seite eintragen' : '',
    reached, over: reached ? value - target : 0,
    progress: target ? Math.min(1, (working ? value : 0) / target) : 0,
    hint: working
      ? (hold
        ? (reached ? `Ziel erreicht${value > target ? ` · +${value - target} s extra` : ''} – alles darüber zählt extra` : `Mindestziel ${target} s – weiter, bis du nicht mehr kannst`)
        : `Ziel ${target} Wdh – danach im Slider die echte Anzahl einstellen`)
      : r.phase === 'rest' ? `Pause ${elapsed} s · empfohlen ${block.restSeconds} s – Leistung anpassen, dann weiter`
      : r.phase === 'prep' ? 'Position einnehmen, dann starten' : '',
    primaryButton: working ? (hold ? 'Halten beenden' : 'Satz fertig') : r.phase === 'rest' ? (lastSet ? 'Fertig' : 'Weiter') : 'Start',
    // The last result stays editable while resting; moving on freezes it.
    slider: r.phase === 'rest' && logged !== undefined
      ? { ...sliderRange(target, logged), value: logged, unit, targetMarker: target, reachedTarget: logged >= target } : null,
    exp: { session: Math.round((earned + liveSet) * 10) / 10, before: baseExp,
      after: Math.min(100, Math.round((baseExp + earned + liveSet) * 10) / 10), perSetBase: Math.round(stageGoal(r.blocks[0]).base * 10) / 10 },
    pips: Array.from({ length: block.sets }, (_, k) => k < r.log[r.bi].length
      ? (r.log[r.bi][k] >= target ? 'hit' : 'low') : k === r.si && r.phase !== 'done' ? 'cur' : 'open'),
  };
  if (view.sideHint && (r.phase === 'prep' || r.phase === 'work')) view.hint += ' · ' + view.sideHint;
  return view;
}
