import a from './a-iron-room.js';
import b from './b-gravity-map.js';
import c from './c-riso-climb.js';
import { IS_STORE_BUILD } from '../storeBuild.js';

// „classic“ = die bestehende React-Karte (SkillsCard.jsx), kein Eintrag hier.
export const DESIGNS = [a, b, c];
export const STORAGE_KEY = 'skills:design';

export function readDesign() {
  // Store-Build: nur die Original-App, kein Design-Experiment (Umschalter ist dort ausgeblendet).
  if (IS_STORE_BUILD) return 'classic';
  const known = ['classic', ...DESIGNS.map(d => d.id)];
  try {
    const q = new URLSearchParams(location.search).get('design');
    if (known.includes(q)) return q;
    const v = localStorage.getItem(STORAGE_KEY);
    if (known.includes(v)) return v;
  } catch { /* Storage blockiert */ }
  return 'classic';
}

export function saveDesign(id) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignorieren */ }
}
