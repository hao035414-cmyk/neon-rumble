/**
 * Per-character move mapping. Universal normals stay in MOVES; each
 * character owns one U ranged tool, one S special and one super.
 */

export const CHARACTER_MOVES = {
  kai: { id: 'kai', role: '均衡', weapon: 'fist', stats: { speed: 3, power: 3, range: 3, difficulty: 2 }, u: 'plasma', s: 'dp', super: 'super' },
  rin: { id: 'rin', role: '突进', weapon: 'blades', stats: { speed: 5, power: 3, range: 2, difficulty: 3 }, u: 'kunai', s: 'rush', super: 'rinSuper' },
  volt: { id: 'volt', role: '投技', weapon: 'gauntlet', stats: { speed: 2, power: 5, range: 2, difficulty: 2 }, u: 'quake', s: 'grab', super: 'superThrow' },
  nova: { id: 'nova', role: '弓手', weapon: 'bow', stats: { speed: 3, power: 2, range: 5, difficulty: 4 }, u: 'arrow', s: 'bowSweep', super: 'superArrow' },
  saber: { id: 'saber', role: '连击', weapon: 'claws', stats: { speed: 4, power: 4, range: 2, difficulty: 4 }, u: 'sonic', s: 'triple', super: 'superRush' },
  echo: { id: 'echo', role: '设置', weapon: 'device', stats: { speed: 2, power: 3, range: 4, difficulty: 3 }, u: 'resonance', s: 'orb', super: 'superOrb' },
};

export function validateCharacterMoves(moves, allMoves) {
  const errors = [];
  for (const key of ['u', 's', 'super']) {
    if (!moves[key]) errors.push(moves.id + ': missing ' + key);
    else if (!allMoves[moves[key]]) errors.push(moves.id + ': unknown move ' + moves[key]);
  }
  if (moves.u === moves.s) errors.push(moves.id + ': U and S must differ');
  return errors;
}
