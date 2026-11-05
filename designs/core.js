// All designs use the Skills event store; there is no design-specific progress copy.
import { SKILLS } from '../data/catalog.js';
import { buildWorkoutBlocks } from '../runner/blocks.js';
import { createRunner } from '../runner/engine.js';
import { attachRunnerLifecycle } from '../runner/lifecycle.js';
import { videoForExercise } from '../ExerciseVideo.jsx';
import { designProgress } from '../data/designProgress.js';
import { progressStore } from '../data/store.js';
import { attachNav } from '../navigation.js';
const PREP_MS = 3000;
// Der Design-Switcher blendet sich aus, solange ein Workout läuft.
const announce = active => window.dispatchEvent(new CustomEvent('skills-runner', { detail: active }));
const entry = id => designProgress.entry(id);

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const Core = {
  skills: SKILLS,
  CATS: designProgress.categories,
  RPE: [{ id: 'easy', label: 'Leicht' }, { id: 'optimal', label: 'Optimal' }, { id: 'limit', label: 'Am Limit' }],
  esc,
  byId: id => SKILLS.find(s => s.id === id),
  stage: id => entry(id).stage ?? 0,
  history: id => entry(id).history ?? [],
  sessions: id => entry(id).sessions ?? [],
  done: s => entry(s.id).mastered === true,
  target: p => (p.type === 'hold' ? `${p.sets}×${p.seconds}s halten` : `${p.sets}×${p.reps} Wdh`),
  short: p => (p.type === 'hold' ? `${p.sets}×${p.seconds}s` : `${p.sets}×${p.reps}`),
  pad: n => String(n).padStart(2, '0'),
  secs: ms => Math.ceil(Math.max(0, ms) / 1000),
  date: iso => new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' }),

  // Skill-URL: gleicher Hash-Param wie die Original-Karte (#?skill=<id>)
  hash() { const q = new URLSearchParams(location.hash.split('?')[1] || ''); return q.get('skill'); },
  setHash(id) {
    const [path = ''] = location.hash.replace(/^#\/?/, '').split('?');
    history.replaceState(null, '', `#${path}${id ? `?skill=${id}` : ''}`);
  },

  // Wischen + Tastatur (siehe navigation.js); `enabled` sperrt sie während eines Workouts.
  nav: (root, route, enabled) => attachNav({
    skills: SKILLS, root, rows: '[data-open]', current: Core.hash, enabled,
    go: id => { Core.setHash(id); route(); if (id) scrollTo(0, 0); },
  }),

  master: skill => designProgress.master(skill),
  downgrade: skill => designProgress.downgrade(skill),
  saveWorkout: r => designProgress.saveWorkout(r.skill,r.stage,r.sessionData(),r.quality,r.owner),
  qualityHTML(r) {
    const q = r.quality || {};
    return `<fieldset style="display:grid;gap:8px;padding:12px;font:12px system-ui">
      <label><input type="checkbox" data-quality="techniqueConfirmed" ${q.techniqueConfirmed ? 'checked' : ''}> Technik sauber eingehalten</label>
      ${r.blocks[0].sidePolicy === 'both' ? `<label><input type="checkbox" data-quality="bothSidesConfirmed" ${q.bothSidesConfirmed ? 'checked' : ''}> Zielwerte auf beiden Seiten erreicht; schwächere Seite geloggt</label>` : ''}
      <label>Unterstützung / Band <input data-quality="assistance" value="${esc(q.assistance || '')}" style="color:#111"></label>
      <label>Zusatzgewicht (kg) <input type="number" min="0" step="0.5" data-quality="addedLoadKg" value="${esc(q.addedLoadKg || '')}" style="color:#111"></label>
    </fieldset>`;
  },
  qualityInput(r,target) {
    if (!r) return;
    if (target.dataset.result !== undefined) { r.correctSet(r.bi,r.si,Number(target.value)); return; }
    if (!target.dataset.quality) return;
    r.quality ||= {};
    r.quality[target.dataset.quality] = target.type === 'checkbox' ? target.checked : target.value;
    r.persist?.();
  },
  resultHTML(r) {
    if (r.phase !== 'rest' || r.logCur[r.si] === undefined) return '';
    return `<label style="display:block;padding:12px">Letzter Satz (${r.isHold ? 'Sek.' : 'Wdh'}) <input data-result type="number" min="0" step="1" value="${r.logCur[r.si]}" style="width:90px;min-height:44px;color:#111;background:#fff"></label>`;
  },
  subscribe: designProgress.subscribe,

  // Runner: prep → work → rest über Primär/Sekundär/Conditioning-Blöcke (wie WorkoutRunner)
  runner(skill, stage, onUpdate) {
    const owner = progressStore.getSnapshot().owner;
    const saved = progressStore.runner();
    const resume = saved?.skillId === skill.id && saved?.stage === stage ? saved : null;
    const r = createRunner({ skill, stage, blocks: buildWorkoutBlocks(skill,stage), resume,
      onUpdate, onPersist: snapshot => progressStore.saveRunner(snapshot,owner) });
    r.owner = owner;
    const start = r.start, stop = r.stop;
    let detach;
    r.start = () => { detach?.(); detach = attachRunnerLifecycle(r); start(); announce(true); };
    r.stop = (options) => { detach?.(); stop(options); announce(false); };
    return r;
  },
  // gemeinsame Runner-Buttons; true = behandelt
  act(r, ds) {
    if ('fin' in ds) r.finishSet();
    else if ('skip' in ds) r.skip();
    else if ('pause' in ds) r.pause();
    else if ('add' in ds) r.addRest();
    else if ('adj' in ds) r.adj(+ds.adj);
    else if ('end' in ds) r.endEarly();
    else if ('skipblock' in ds) r.skipBlock();
    else if ('rpe' in ds) r.setRpe(ds.rpe);
    else return false;
    return true;
  },

  // Übungsvideos: gleiche Zuordnung/Prüfung wie ExerciseVideo.jsx
  videoHTML(name) {
    const v = videoForExercise(name);
    if (!v) return `<p class="vnote">Für ${esc(name)} ist noch kein Video hinterlegt.</p>`;
    const orig = v.source || `https://www.youtube.com/watch?v=${v.youtubeId}`;
    const media = v.kind === 'demo'
      ? `<video src="${esc(v.url)}" autoplay muted loop playsinline controls preload="metadata"></video>`
      : `<iframe src="https://www.youtube-nocookie.com/embed/${v.youtubeId}?rel=0&playsinline=1&mute=1&loop=1&playlist=${v.youtubeId}${v.startSeconds ? `&start=${+v.startSeconds}` : ''}" title="Übungsvideo: ${esc(name)}" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    return `${media}<p class="vnote">${esc(v.note || v.title || '')} <a href="${esc(orig)}" target="_blank" rel="noopener noreferrer">Original · ${esc(v.author || '')}</a></p>`;
  },
  toggleVideo(trigger, name) {
    const row = trigger.closest('[data-vrow]');
    if (!row) return;
    const next = row.nextElementSibling;
    if (next?.classList.contains('vid')) { next.remove(); return; }
    row.insertAdjacentHTML('afterend', `<div class="vid">${Core.videoHTML(name)}</div>`);
  },
};
export default Core;
