import { Engine } from '../src/engine.js';
import { AI } from '../src/ai.js';

const engine = new Engine();
const a = new AI({ difficulty: 1 });
const b = new AI({ difficulty: 1 });
engine.phase = 'fight';
const N = 10000;
const t0 = performance.now();
for (let i = 0; i < N; i += 1) {
  engine.update(a.think(engine, engine.p1, engine.p2), b.think(engine, engine.p2, engine.p1));
}
const ms = performance.now() - t0;
console.log(JSON.stringify({ frames: N, ms: Number(ms.toFixed(1)), perFrameMs: Number((ms / N).toFixed(4)), budget16_7ms: ms / N < 16.7 }));
