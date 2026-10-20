import assert from 'node:assert/strict';
import { Engine } from '../src/engine.js';
import { AI } from '../src/ai.js';
import { MOVES, WORLD, MAX_ROUNDS } from '../src/config.js';
import { CHARACTER_MOVES, validateCharacterMoves } from '../src/characters.js';

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

// 8. Frame advantage matches the v1.2 design table.
{
  const measure = (key, block) => {
    const engine = freshFight();
    engine.p1.x = 700;
    engine.p2.x = 758;
    engine.p1.startMove(key);
    const guard = block === 'crouch' ? { right: true, down: true } : block ? { right: true } : {};
    let attackerFree = null;
    let defenderFree = null;
    let connected = false;
    for (let f = 0; f < 90; f += 1) {
      step(engine, {}, guard);
      if (!connected && (engine.p2.state === 'hitstun' || engine.p2.state === 'blockstun')) connected = true;
      if (connected && attackerFree === null && engine.p1.state !== 'attack') attackerFree = f;
      if (connected && defenderFree === null && !['hitstun', 'blockstun'].includes(engine.p2.state)) defenderFree = f;
    }
    assert.ok(connected, key + ' connected');
    return defenderFree - attackerFree;
  };
  assert.equal(measure('lp', false), 2, 'jab is +2 on hit');
  assert.equal(measure('hp', false), 1, 'heavy is +1 on hit');
  assert.equal(measure('low', false), 0, 'low is neutral on hit');
  assert.equal(measure('overhead', false), 1, 'overhead is +1 on hit');
  assert.equal(measure('lp', true), 0, 'jab is neutral on block');
  assert.equal(measure('hp', true), -5, 'heavy is -5 on block');
  assert.equal(measure('low', 'crouch'), -5, 'low is -5 on block');
  assert.equal(measure('kick', true), -4, 'kick is -4 on block');
}

// 9. Jab pressure cannot lock a defender who holds back.
{
  const engine = freshFight();
  engine.p1.x = 1460;
  engine.p2.x = 1520;
  let maxCombo = 0;
  for (let f = 0; f < 60 * 20; f += 1) {
    const canStart = ['idle', 'crouch', 'walk'].includes(engine.p1.state);
    step(engine, canStart ? { light: true } : {}, { right: true });
    maxCombo = Math.max(maxCombo, engine.combo.p1);
  }
  assert.equal(engine.p2.hp, engine.p2.maxHp, 'blocked jab pressure deals no damage');
  assert.ok(maxCombo <= 6, 'a blocking defender is never comboed past 6 hits, got ' + maxCombo);
}

// 10. Mashing a jab cannot kill from full health (old build died in 93 hits).
{
  const engine = freshFight();
  engine.p1.x = 1460;
  engine.p2.x = 1520;
  let maxCombo = 0;
  for (let f = 0; f < 60 * 30; f += 1) {
    const canStart = ['idle', 'crouch', 'walk'].includes(engine.p1.state);
    const defenderFree = !['hitstun', 'blockstun', 'knockdown', 'getup'].includes(engine.p2.state);
    step(engine, canStart ? { light: true } : {}, defenderFree ? { light: true } : {});
    maxCombo = Math.max(maxCombo, engine.combo.p1);
  }
  assert.ok(engine.p2.hp > 500, 'mashing escapes before losing half health, hp=' + engine.p2.hp);
  assert.ok(maxCombo <= 8, 'combo stays short, got ' + maxCombo);
}

// 11. Combo scaling decays hitstun, damage and pushback.
{
  const engine = new Engine();
  const attacker = engine.p1;
  engine.combo.p1 = 0;
  const hit0 = engine.hitstunScale(attacker);
  const dmg0 = engine.damageScale(attacker);
  engine.combo.p1 = 4;
  const hit4 = engine.hitstunScale(attacker);
  const dmg4 = engine.damageScale(attacker);
  engine.combo.p1 = 20;
  assert.ok(hit4 < hit0 && dmg4 < dmg0, 'scaling shrinks with combo length');
  assert.equal(engine.hitstunScale(attacker), 0.55, 'hitstun scale floor is 0.55');
  assert.equal(engine.damageScale(attacker), 0.3, 'damage scale floor is 0.3');
  assert.ok(engine.pushScale(attacker) >= 0.35, 'push scale floor is 0.35');
}

// 12. Throw grabs an idle defender and knocks them down.
{
  const engine = freshFight();
  engine.p1.startMove('throw');
  const before = engine.p2.hp;
  for (let i = 0; i < 20; i += 1) step(engine);
  assert.ok(before - engine.p2.hp >= 100, 'throw deals heavy damage');
  assert.equal(engine.p2.state, 'knockdown', 'throw knocks the defender down');
}

// 13. Throw tech cancels the grab.
{
  const engine = freshFight();
  engine.p1.startMove('throw');
  const before = engine.p2.hp;
  let teched = false;
  for (let i = 0; i < 20; i += 1) {
    step(engine, {}, { tech: true });
    if (engine.events.some((e) => e.type === 'block')) teched = true;
  }
  assert.equal(engine.p2.hp, before, 'teched throw deals no damage');
  assert.ok(teched, 'tech was registered');
}

// 14. Special cancel works only after connecting.
{
  const engine = freshFight();
  engine.p1.startMove('lp');
  for (let i = 0; i < 5; i += 1) step(engine);
  for (let i = 0; i < 8; i += 1) step(engine, { special: true });
  assert.equal(engine.p1.move, 'dp', 'jab cancels into the rising fang on hit');

  const whiff = new Engine();
  whiff.phase = 'fight';
  whiff.p1.x = 400;
  whiff.p2.x = 1400;
  whiff.p1.startMove('lp');
  for (let i = 0; i < 6; i += 1) step(whiff, { special: true });
  assert.equal(whiff.p1.move, 'lp', 'a whiffed jab cannot be canceled');
}

// 15. Launcher pops the defender into the air for a juggle.
{
  const engine = freshFight();
  engine.p1.x = 700;
  engine.p2.x = 750;
  engine.p1.startMove('launch');
  for (let i = 0; i < 20; i += 1) step(engine);
  assert.ok(engine.p2.airborne, 'launched defender leaves the ground');
  assert.ok(engine.combo.p1 >= 1, 'launcher starts a combo');
}

// 16. Projectiles clash and both disappear.
{
  const engine = new Engine();
  engine.phase = 'fight';
  engine.p1.x = 500;
  engine.p2.x = 1100;
  engine.p1.startMove('special');
  engine.p2.startMove('special');
  const before = [engine.p1.hp, engine.p2.hp];
  let sawTwo = false;
  for (let i = 0; i < 140; i += 1) {
    step(engine);
    if (engine.projectiles.length === 2) sawTwo = true;
  }
  assert.ok(sawTwo, 'both projectiles existed');
  assert.equal(engine.p1.hp, before[0], 'clash deals no damage to p1');
  assert.equal(engine.p2.hp, before[1], 'clash deals no damage to p2');
}

// 17. Round 5 draw ends the match instead of looping forever.
{
  const engine = new Engine();
  engine.phase = 'roundEnd';
  engine.round = MAX_ROUNDS;
  engine.p1.wins = 1;
  engine.p2.wins = 1;
  engine.lastWinner = null;
  engine.endRound();
  assert.equal(engine.phase, 'matchOver', 'fifth drawn round ends the match');
  assert.equal(engine.matchWinner, null, 'match ends in a draw');

  const lead = new Engine();
  lead.round = MAX_ROUNDS;
  lead.p1.wins = 1;
  lead.p2.wins = 0;
  lead.lastWinner = null;
  lead.endRound();
  assert.equal(lead.matchWinner, lead.p1, 'the fighter with more round wins takes the match');
}

// 18. Rising fang is invincible at the start and punishable on block.
{
  const engine = freshFight();
  engine.p2.x = 1400;
  engine.p1.startMove('dp');
  assert.ok(engine.p1.invuln >= 5, 'dp starts with invulnerability');
  for (let i = 0; i < 10; i += 1) step(engine);
  assert.equal(engine.p1.invuln, 0, 'invulnerability expires');
  const blockAdv = MOVES.dp.blockstun - (MOVES.dp.active + MOVES.dp.recovery - 1);
  assert.ok(blockAdv <= -20, 'blocked dp is heavily punishable, got ' + blockAdv);
}

// 19. The U tool fires a projectile and damages the opponent.
{
  const engine = freshFight();
  engine.p1.x = 400;
  engine.p2.x = 900;
  const before = engine.p2.hp;
  step(engine, { u: true });
  assert.equal(engine.p1.move, 'plasma', 'U starts the plasma bolt');
  let spawned = false;
  for (let i = 0; i < 120; i += 1) {
    step(engine);
    if (engine.projectiles.length > 0) spawned = true;
  }
  assert.ok(spawned, 'U spawned a projectile');
  assert.ok(engine.p2.hp < before, 'U projectile deals damage');
}

// 20. Only one projectile per owner is allowed.
{
  const engine = freshFight();
  engine.p1.x = 400;
  engine.p2.x = 1400;
  step(engine, { u: true });
  for (let i = 0; i < 40; i += 1) step(engine);
  assert.equal(engine.projectiles.length, 1, 'one bolt is live');
  step(engine, { u: true });
  assert.notEqual(engine.p1.move, 'plasma', 'a second U is blocked while the bolt is alive');
  assert.equal(engine.p1.move, null, 'the fighter stays idle');
}

// 21. Air U works once per jump and locks out the air attack.
{
  const engine = freshFight();
  step(engine, { up: true });
  for (let i = 0; i < 3; i += 1) step(engine);
  step(engine, { u: true });
  assert.equal(engine.p1.move, 'plasma', 'U can be fired in the air');
  assert.ok(engine.p1.airborne, 'the fighter is airborne');
  assert.ok(engine.p1.airAttackUsed, 'air U consumes the air action');
}

// 22. U cannot be canceled into from a normal.
{
  const engine = freshFight();
  engine.p1.startMove('lp');
  for (let i = 0; i < 5; i += 1) step(engine);
  for (let i = 0; i < 4; i += 1) step(engine, { u: true });
  assert.equal(engine.p1.move, 'lp', 'jab does not cancel into U');
}

// 23. RIN's rush travels forward.
{
  const engine = freshFight();
  engine.p2.x = 1200;
  engine.p1.startMove('rush');
  const startX = engine.p1.x;
  for (let i = 0; i < 34; i += 1) step(engine);
  assert.ok(engine.p1.x - startX > 40, 'rush covers ground, moved ' + (engine.p1.x - startX).toFixed(1));
}

// 24. Character move tables reference real moves.
{
  for (const moves of Object.values(CHARACTER_MOVES)) {
    assert.deepEqual(validateCharacterMoves(moves, MOVES), [], 'character table is valid: ' + moves.id);
  }
  assert.notEqual(CHARACTER_MOVES.kai.u, CHARACTER_MOVES.rin.u, 'characters have different U tools');
}

// 25. Six characters with six distinct U tools.
{
  assert.equal(Object.keys(CHARACTER_MOVES).length, 6, 'six characters');
  const tools = Object.values(CHARACTER_MOVES).map((moves) => moves.u);
  assert.equal(new Set(tools).size, 6, 'every character has a distinct U tool');
}

// 26. VOLT's command grab ignores blocking.
{
  const engine = new Engine({ charA: 'volt', charB: 'kai' });
  engine.phase = 'fight';
  engine.p1.x = 1490;
  engine.p2.x = 1550;
  const before = engine.p2.hp;
  engine.p1.startMove('grab');
  let knocked = false;
  for (let i = 0; i < 20; i += 1) {
    step(engine, {}, { right: true });
    if (engine.p2.state === 'knockdown') knocked = true;
  }
  assert.ok(engine.p2.hp < before, 'command grab ignores blocking');
  assert.ok(knocked, 'command grab knocks down');
}

// 27. NOVA's bow sweep is invincible and pushes the opponent away.
{
  const engine = new Engine({ charA: 'nova', charB: 'kai' });
  engine.phase = 'fight';
  engine.p1.x = 700;
  engine.p2.x = 760;
  engine.p1.startMove('bowSweep');
  assert.ok(engine.p1.invuln >= 4, 'bow sweep starts invulnerable');
  const startX = engine.p2.x;
  for (let i = 0; i < 30; i += 1) step(engine);
  const pushed = engine.p2.x - startX;
  assert.ok(pushed > 60 && pushed < 140, 'bow sweep pushes about 90px, moved ' + pushed.toFixed(1));
}

// 28. SABER's super rush closes distance and hits.
{
  const engine = new Engine({ charA: 'saber', charB: 'kai' });
  engine.phase = 'fight';
  engine.p1.x = 600;
  engine.p2.x = 700;
  engine.p1.meter = 100;
  const startX = engine.p1.x;
  const before = engine.p2.hp;
  engine.p1.startMove('superRush');
  assert.equal(engine.p1.meter, 0, 'super spends the meter');
  for (let i = 0; i < 40; i += 1) step(engine);
  assert.ok(engine.p1.x - startX > 30, 'super rush moves forward');
  assert.ok(engine.p2.hp < before, 'super rush deals damage');
}

// 29. ECHO's orb is a stationary trap that hits on contact.
{
  const engine = new Engine({ charA: 'echo', charB: 'kai' });
  engine.phase = 'fight';
  engine.p1.x = 600;
  engine.p2.x = 700;
  const before = engine.p2.hp;
  engine.p1.startMove('orb');
  for (let i = 0; i < 40; i += 1) step(engine);
  for (let i = 0; i < 60; i += 1) step(engine);
  assert.ok(engine.p2.hp < before, 'orb damages on contact');
  assert.ok(engine.events.some((event) => event.type === 'hit'), 'orb produced a hit event');
}

// 30. Every character survives an AI-vs-AI smoke match.
{
  for (const id of Object.keys(CHARACTER_MOVES)) {
    const engine = new Engine({ charA: id, charB: id });
    const ai1 = new AI();
    const ai2 = new AI();
    for (let i = 0; i < 600 && !engine.isOver; i += 1) {
      engine.update(ai1.think(engine, engine.p1, engine.p2), ai2.think(engine, engine.p2, engine.p1));
    }
    for (const fighter of engine.fighters) {
      assert.ok(Number.isFinite(fighter.x) && Number.isFinite(fighter.y), id + ' position stays finite');
      assert.ok(fighter.hp >= 0 && fighter.hp <= fighter.maxHp, id + ' hp stays in range');
      assert.ok(fighter.meter >= 0 && fighter.meter <= 100, id + ' meter stays in range');
    }
  }
}

console.log('all simulation tests passed');
