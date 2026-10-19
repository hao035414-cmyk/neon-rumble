import assert from 'node:assert/strict';
import { Engine } from '../src/engine.js';
import { AI } from '../src/ai.js';
import { WORLD } from '../src/config.js';

const step = (engine, p1 = {}, p2 = {}) => engine.update(p1, p2);

function freshFight() {
  const engine = new Engine();
  engine.phase = 'fight';
  engine.phaseTimer = 0;
  engine.p1.x = 600;
  engine.p2.x = 660;
  engine.p1.facing = 1;
  engine.p2.facing = -1;
  return engine;
}

// 1. Two AIs play a full match without corrupting state.
{
  const engine = new Engine();
  const ai1 = new AI();
  const ai2 = new AI();
  let frames = 0;
  while (!engine.isOver && frames < 60 * 260) {
    engine.update(ai1.think(engine, engine.p1, engine.p2), ai2.think(engine, engine.p2, engine.p1));
    frames += 1;
    for (const f of engine.fighters) {
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y), 'position stays finite');
      assert.ok(f.x >= WORLD.leftWall && f.x <= WORLD.rightWall, 'fighter stays inside the walls');
      assert.ok(f.hp >= 0 && f.hp <= f.maxHp, 'hp stays in range');
      assert.ok(f.meter >= 0 && f.meter <= 100, 'meter stays in range');
    }
  }
  assert.ok(frames > 60, 'the simulation actually advanced');
  assert.ok(engine.isOver || engine.round > 1, 'a round resolved (KO or time out)');
  assert.ok(engine.p1.wins + engine.p2.wins >= 1 || engine.round > 1, 'someone won or rounds advanced');
}

// 2. A strike connects and removes health.
{
  const engine = freshFight();
  engine.p1.startMove('hp');
  const before = engine.p2.hp;
  for (let i = 0; i < 24; i += 1) step(engine);
  assert.ok(engine.p2.hp < before, 'heavy punch deals damage');
}

// 3. Holding back blocks a normal attack with no chip damage.
{
  const engine = freshFight();
  engine.p1.startMove('hp');
  const before = engine.p2.hp;
  let sawBlock = false;
  for (let i = 0; i < 26; i += 1) {
    step(engine, {}, { right: true });
    if (engine.p2.state === 'blockstun') sawBlock = true;
  }
  assert.equal(engine.p2.hp, before, 'blocked normal attacks deal no chip damage');
  assert.ok(sawBlock, 'the defender entered blockstun');
}

// 4. The special spawns a projectile that travels and hits.
{
  const engine = freshFight();
  engine.p1.x = 380;
  engine.p2.x = 980;
  engine.p1.startMove('special');
  const before = engine.p2.hp;
  let spawned = false;
  for (let i = 0; i < 90; i += 1) {
    step(engine);
    if (engine.projectiles.length > 0) spawned = true;
  }
  assert.ok(spawned, 'special created a projectile');
  for (let i = 0; i < 140; i += 1) step(engine);
  assert.ok(engine.p2.hp < before, 'projectile damaged the opponent');
}

// 5. Lethal damage ends the round and awards a win.
{
  const engine = freshFight();
  engine.p2.hp = 1;
  engine.p1.startMove('lp');
  for (let i = 0; i < 30; i += 1) step(engine);
  assert.equal(engine.phase, 'ko', 'round enters KO phase');
  for (let i = 0; i < 140; i += 1) step(engine);
  assert.equal(engine.p1.wins, 1, 'the winner gets a round point');
}

// 6. Super consumes a full meter and fires a super projectile.
{
  const engine = freshFight();
  engine.p1.x = 320;
  engine.p2.x = 1240;
  engine.p1.meter = 100;
  engine.p1.startMove('super');
  assert.equal(engine.p1.meter, 0, 'super spends the meter');
  let kind = null;
  for (let i = 0; i < 40; i += 1) {
    step(engine);
    if (engine.projectiles.length > 0) kind = engine.projectiles[0].kind;
  }
  assert.equal(kind, 'super', 'super spawns a super projectile');
}

// 7. A new round resets health but keeps meter.
{
  const engine = new Engine();
  engine.p1.meter = 55;
  engine.p2.hp = 10;
  engine.startRound();
  assert.equal(engine.p1.meter, 55, 'meter carries between rounds');
  assert.equal(engine.p2.hp, engine.p2.maxHp, 'health resets between rounds');
}

console.log('all simulation tests passed');
