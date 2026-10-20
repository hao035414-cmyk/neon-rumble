/**
 * Matchup matrix: every ordered character pair plays N AI matches.
 * Usage: node tools/matchups.mjs [matchesPerPair]
 */

import { Engine } from '../src/engine.js';
import { AI } from '../src/ai.js';
import { CHARACTER_MOVES } from '../src/characters.js';

const N = Number(process.argv[2] ?? 60);
const ids = Object.keys(CHARACTER_MOVES);

function play(charA, charB) {
  const engine = new Engine({ charA, charB });
  const aiA = new AI({ difficulty: 1 });
  const aiB = new AI({ difficulty: 1 });
  let frames = 0;
  let maxCombo = 0;
  while (!engine.isOver && frames < 60 * 400) {
    engine.update(aiA.think(engine, engine.p1, engine.p2), aiB.think(engine, engine.p2, engine.p1));
    maxCombo = Math.max(maxCombo, engine.combo.p1, engine.combo.p2);
    frames += 1;
  }
  return {
    winner: engine.matchWinner === engine.p1 ? 'a' : engine.matchWinner === engine.p2 ? 'b' : 'draw',
    frames,
    maxCombo,
  };
}

const rows = [];
const totals = Object.fromEntries(ids.map((id) => [id, { wins: 0, games: 0 }]));
let worst = { rate: 0.5, pair: '' };

for (const a of ids) {
  for (const b of ids) {
    if (a === b) continue;
    let aw = 0;
    let bw = 0;
    let draw = 0;
    let frames = 0;
    let combo = 0;
    for (let i = 0; i < N; i += 1) {
      const result = play(a, b);
      if (result.winner === 'a') aw += 1;
      else if (result.winner === 'b') bw += 1;
      else draw += 1;
      frames += result.frames;
      combo = Math.max(combo, result.maxCombo);
    }
    const decided = aw + bw;
    const rate = decided ? aw / decided : 0.5;
    totals[a].wins += aw;
    totals[a].games += decided;
    totals[b].wins += bw;
    totals[b].games += decided;
    if (Math.abs(rate - 0.5) > Math.abs(worst.rate - 0.5)) worst = { rate, pair: a + ' vs ' + b };
    rows.push({ a, b, n: N, aw, bw, draw, rate: Number(rate.toFixed(3)), avgSeconds: Number((frames / N / 60).toFixed(1)), combo });
  }
}

console.log('MATCHUP MATRIX (win rate of row vs column)');
for (const a of ids) {
  const cells = ids.map((b) => {
    if (a === b) return '  --  ';
    const row = rows.find((r) => r.a === a && r.b === b);
    return row.rate.toFixed(2).padStart(5) + ' ';
  });
  console.log(a.padEnd(6), cells.join(''));
}

console.log('\nOVERALL WIN RATES');
for (const id of ids) {
  const t = totals[id];
  console.log(id.padEnd(6), (t.games ? t.wins / t.games : 0).toFixed(3), 'games=' + t.games);
}

const bad = rows.filter((r) => r.rate < 0.45 || r.rate > 0.55);
const badTotals = ids.filter((id) => {
  const t = totals[id];
  const rate = t.games ? t.wins / t.games : 0.5;
  return rate < 0.45 || rate > 0.55;
});
console.log('\nOUTLIER PAIRS:', bad.length);
for (const r of bad.slice(0, 20)) console.log(' -', r.a, 'vs', r.b, r.rate);
console.log('OUTLIER CHARACTERS:', badTotals.join(', ') || 'none');
console.log('WORST PAIR:', worst.pair, worst.rate);
console.log('AVG MATCH:', (rows.reduce((sum, r) => sum + r.avgSeconds, 0) / rows.length).toFixed(1) + 's');
console.log('MAX COMBO:', Math.max(...rows.map((r) => r.combo)));

process.exitCode = bad.length || badTotals.length ? 1 : 0;
