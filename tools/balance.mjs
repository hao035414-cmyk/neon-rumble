/**
 * Balance harness: AI-vs-AI matches reporting win rates, match length and combo length.
 *
 * Usage: node tools/balance.mjs [matchesPerPairing]
 */

import { Engine } from '../src/engine.js';
import { AI } from '../src/ai.js';

const MATCHES = Number(process.argv[2] ?? 200);

function playMatch(diffA, diffB) {
  const engine = new Engine();
  const aiA = new AI({ difficulty: diffA });
  const aiB = new AI({ difficulty: diffB });
  let frames = 0;
  let maxCombo = 0;
  while (!engine.isOver && frames < 60 * 400) {
    engine.update(aiA.think(engine, engine.p1, engine.p2), aiB.think(engine, engine.p2, engine.p1));
    maxCombo = Math.max(maxCombo, engine.combo.p1, engine.combo.p2);
    frames += 1;
  }
  const winner = engine.matchWinner === engine.p1 ? 'a' : engine.matchWinner === engine.p2 ? 'b' : 'draw';
  return { winner, frames, maxCombo };
}

function series(label, diffA, diffB, matches) {
  let a = 0;
  let b = 0;
  let draw = 0;
  let frames = 0;
  let maxCombo = 0;
  for (let i = 0; i < matches; i += 1) {
    const result = playMatch(diffA, diffB);
    if (result.winner === 'a') a += 1;
    else if (result.winner === 'b') b += 1;
    else draw += 1;
    frames += result.frames;
    maxCombo = Math.max(maxCombo, result.maxCombo);
  }
  const decided = a + b;
  const rate = decided ? a / decided : 0;
  console.log(
    JSON.stringify({
      label,
      matches,
      a,
      b,
      draw,
      winRateA: Number(rate.toFixed(3)),
      avgMatchSeconds: Number((frames / matches / 60).toFixed(1)),
      maxCombo,
    }),
  );
  return rate;
}

const mirror = series('mirror 1.0 vs 1.0', 1, 1, MATCHES);
const low = series('0.8 vs 1.0', 0.8, 1, MATCHES);
const high = series('1.2 vs 1.0', 1.2, 1, MATCHES);
const cross = series('1.2 vs 0.8', 1.2, 0.8, MATCHES);

const problems = [];
if (Math.abs(mirror - 0.5) > 0.05) problems.push('mirror win rate outside 45-55%: ' + mirror);
if (low > 0.45) problems.push('difficulty 0.8 beats 1.0 too often: ' + low);
if (high < 0.55) problems.push('difficulty 1.2 does not beat 1.0: ' + high);
if (cross < 0.6) problems.push('1.2 does not beat 0.8 clearly: ' + cross);

if (problems.length) {
  console.log('BALANCE FAIL');
  for (const p of problems) console.log(' - ' + p);
  process.exitCode = 1;
} else {
  console.log('BALANCE OK');
}
