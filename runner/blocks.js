// These are editable app defaults, not an individualized training prescription.
const CONDITIONING_BY_CATEGORY = {
  push: { name: 'Hollow Body Hold', type: 'hold', sets: 3, seconds: 20 },
  pull: { name: 'Scapula Pulls', type: 'reps', sets: 3, reps: 10 },
  core: { name: 'Plank', type: 'hold', sets: 3, seconds: 30 },
  legs: { name: 'Deep Squats', type: 'reps', sets: 2, reps: 8 },
  balance: { name: 'Hollow Body Hold', type: 'hold', sets: 2, seconds: 20 },
};

export function buildWorkoutBlocks(skill, stage) {
  if (!skill?.progressions?.[stage]) throw new Error('Unbekannte Skill-Stufe');
  const blocks = [{ ...skill.progressions[stage], role: 'Primär' }];
  if (stage > 0) blocks.push({ ...skill.progressions[stage - 1], role: 'Sekundär', restSeconds: 75 });
  const conditioning = CONDITIONING_BY_CATEGORY[skill.category];
  if (conditioning) blocks.push({ ...conditioning, role: 'Conditioning', restSeconds: 45 });
  return JSON.parse(JSON.stringify(blocks));
}
