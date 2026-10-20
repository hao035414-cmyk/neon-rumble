/**
 * A single fighter: state machine, movement, attacks and boxes.
 * DOM-free so the same code runs in the browser and under Node tests.
 */

import { GRAVITY, MOVES, SUPER_COST, WORLD } from './config.js';
import { CHARACTER_MOVES } from './characters.js';

const STAND_HEIGHT = 150;
const CROUCH_HEIGHT = 96;
const HURT_WIDTH = 48;
const AIR_SPEED = 1.05;
const KNOCKDOWN_LIE = 36;
const GETUP_FRAMES = 18;
const GETUP_INVULN = 8;
const DASH_FRAMES = 14;
const BACKDASH_FRAMES = 16;
const DASH_SPEED = 9;
const BACKDASH_SPEED = 5.6;
const BACKDASH_INVULN = 5;

export class Fighter {
  constructor({ id, char, charKey, x, facing, meter = 0, wins = 0 }) {
    this.id = id;
    this.char = char;
    this.charKey = charKey;
    this.x = x;
    this.y = WORLD.ground;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.maxHp = char.hp;
    this.hp = char.hp;
    this.meter = meter;
    this.wins = wins;

    this.state = 'idle';
    this.timer = 0;
    this.stateDur = 0;
    this.move = null;
    this.moveFrame = 0;
    this.hitDone = false;
    this.hitConfirmed = false;
    this.pendingProjectile = null;
    this.moves = CHARACTER_MOVES[charKey] ?? CHARACTER_MOVES.kai;
    this.airUUsed = false;

    this.crouching = false;
    this.blocking = false;
    this.airAttackUsed = false;
    this.juggle = false;
    this.invuln = 0;
    this.walkPhase = 0;
  }

  get airborne() {
    return this.y < WORLD.ground - 0.5;
  }

  get height() {
    return this.crouching && !this.airborne ? CROUCH_HEIGHT : STAND_HEIGHT;
  }

  get hurtbox() {
    return { x: this.x - HURT_WIDTH / 2, y: this.y - this.height, w: HURT_WIDTH, h: this.height };
  }

  get attacking() {
    return this.state === 'attack';
  }

  get meterFull() {
    return this.meter >= SUPER_COST;
  }

  /** Non-null only during the active frames of a strike. */
  activeHitbox() {
    if (this.state !== 'attack') return null;
    const move = MOVES[this.move];
    if (!move || move.projectile || move.throw) return null;
    if (this.moveFrame <= move.startup || this.moveFrame > move.startup + move.active) return null;
    return this.boxToWorld(move.hitbox);
  }

  boxToWorld(box) {
    const left = this.facing > 0 ? this.x + box.ox : this.x - box.ox - box.w;
    return { x: left, y: this.y - box.oy, w: box.w, h: box.h };
  }

  canBlock(move) {
    if (move.throw) return false;
    if (!this.blocking || this.airborne) return false;
    if (['attack', 'hitstun', 'blockstun', 'knockdown', 'getup', 'ko', 'dash'].includes(this.state)) return false;
    if (move.low && !this.crouching) return false;
    if (move.overhead && this.crouching) return false;
    return true;
  }

  setState(state, duration = 0) {
    this.state = state;
    this.timer = 0;
    this.stateDur = duration;
  }

  toIdle() {
    this.state = 'idle';
    this.timer = 0;
    this.stateDur = 0;
    this.move = null;
    this.moveFrame = 0;
    this.hitDone = false;
    this.hitConfirmed = false;
    this.juggle = false;
    this.vx = 0;
  }

  startMove(key) {
    const move = MOVES[key];
    if (!move) return false;
    if (move.meterCost && this.meter < move.meterCost) return false;
    this.state = 'attack';
    this.move = key;
    this.moveFrame = 0;
    this.timer = 0;
    this.hitDone = false;
    this.hitConfirmed = false;
    this.vx = 0;
    if (move.meterCost) this.meter = Math.max(0, this.meter - move.meterCost);
    if (move.invuln) this.invuln = Math.max(this.invuln, move.invuln);
    return true;
  }

  /** Called by the engine when this fighter's strike connects (hit or block). */
  confirmHit() {
    this.hitConfirmed = true;
  }

  canCancel(inp) {
    if (this.state !== 'attack' || !this.hitConfirmed) return false;
    const move = MOVES[this.move];
    if (!move || !move.cancelable) return false;
    if (this.airborne) return false;
    if (inp.super && this.meter >= SUPER_COST) return true;
    return Boolean(inp.special || inp.dp);
  }

  /** Called by the engine when a round starts. */
  reset(x, facing) {
    this.x = x;
    this.y = WORLD.ground;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.state = 'idle';
    this.move = null;
    this.moveFrame = 0;
    this.hitDone = false;
    this.hitConfirmed = false;
    this.crouching = false;
    this.blocking = false;
    this.airAttackUsed = false;
    this.juggle = false;
    this.airUUsed = false;
    this.invuln = 0;
  }

  update(inp, opponent, engine) {
    if (this.invuln > 0) this.invuln -= 1;

    if (this.state === 'ko') {
      this.physics();
      return;
    }

    if (this.state === 'knockdown') {
      this.updateKnockdown();
      return;
    }

    if (this.state === 'getup') {
      this.timer += 1;
      if (this.timer >= this.stateDur) this.toIdle();
      return;
    }

    if (this.state === 'dash' || this.state === 'backdash') {
      this.timer += 1;
      this.vx = this.state === 'dash' ? this.facing * DASH_SPEED : -this.facing * BACKDASH_SPEED;
      this.physics();
      if (this.timer >= this.stateDur) this.toIdle();
      return;
    }

    if (this.state === 'hitstun' || this.state === 'blockstun') {
      this.timer += 1;
      if (!this.airborne) this.vx *= 0.8;
      this.physics();
      if (this.juggle && !this.airborne) {
        this.juggle = false;
        this.toIdle();
        return;
      }
      if (!this.airborne && this.timer >= this.stateDur) this.toIdle();
      return;
    }

    if (this.state === 'attack') {
      this.updateAttack(inp);
      this.physics();
      return;
    }

    if (this.airborne || this.state === 'jump') {
      this.updateAir(inp, engine);
      this.physics();
      return;
    }

    this.updateGround(inp, opponent, engine);
    this.physics();
  }

  /** True when the character may fire the U tool (one projectile per owner). */
  canUseU(engine) {
    if (!engine || !Array.isArray(engine.projectiles)) return true;
    return !engine.projectiles.some((proj) => proj.owner === this && !proj.dead);
  }

  updateGround(inp, opponent, engine) {
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    this.facing = opponent.x >= this.x ? 1 : -1;
    this.crouching = Boolean(inp.down);
    this.blocking = dir !== 0 && dir === -this.facing;

    // Attacks take priority over movement.
    if (inp.u && this.canUseU(engine)) {
      this.startMove(this.moves.u);
      return;
    }
    if (inp.super && this.meter >= SUPER_COST) {
      this.startMove(this.moves.super);
      return;
    }
    if (inp.dp || inp.special) {
      this.startMove(this.moves.s);
      return;
    }
    if (inp.throw) {
      this.startMove('throw');
      return;
    }
    if (inp.dashRight || inp.dashLeft) {
      const toward = inp.dashRight ? 1 : -1;
      if (toward === this.facing) {
        this.setState('dash', DASH_FRAMES);
        this.vx = this.facing * DASH_SPEED;
      } else {
        this.setState('backdash', BACKDASH_FRAMES);
        this.vx = -this.facing * BACKDASH_SPEED;
        this.invuln = Math.max(this.invuln, BACKDASH_INVULN);
      }
      return;
    }

    if (this.crouching) {
      if (inp.kick) return void this.startMove('low');
      if (inp.light) return void this.startMove('lp');
      if (inp.heavy) return void this.startMove('launch');
      this.state = 'crouch';
      this.vx = 0;
      return;
    }
    if (inp.kick && dir === this.facing) return void this.startMove('overhead');
    if (inp.light) return void this.startMove('lp');
    if (inp.heavy) return void this.startMove('hp');
    if (inp.kick) return void this.startMove('kick');

    if (inp.up) {
      this.state = 'jump';
      this.timer = 0;
      this.vy = -this.char.jump;
      this.vx = dir * this.char.speed * AIR_SPEED;
      this.airAttackUsed = false;
      this.crouching = false;
      return;
    }

    if (dir !== 0) {
      this.state = 'walk';
      this.walkPhase += 0.22;
      const speed = dir === this.facing ? this.char.speed : this.char.speed * 0.78;
      this.vx = dir * speed;
    } else {
      this.state = 'idle';
      this.vx = 0;
    }
  }

  updateAir(inp, engine) {
    if (this.state === 'jump') {
      if (inp.u && !this.airUUsed && this.canUseU(engine)) {
        this.airUUsed = true;
        this.airAttackUsed = true;
        this.startMove(this.moves.u);
        return;
      }
      if (!this.airAttackUsed && (inp.light || inp.heavy || inp.kick)) {
        this.airAttackUsed = true;
        this.startMove('jumpAtk');
        return;
      }
      if (inp.left) this.vx = -this.char.speed * AIR_SPEED;
      if (inp.right) this.vx = this.char.speed * AIR_SPEED;
    }
  }

  updateAttack(inp) {
    const move = MOVES[this.move];
    if (!move) {
      this.toIdle();
      return;
    }
    this.moveFrame += 1;

    if (move.dashSpeed && this.moveFrame >= move.startup - 2 && this.moveFrame <= move.startup + move.active) {
      this.vx = this.facing * move.dashSpeed;
    }

    if (this.canCancel(inp)) {
      if (inp.super && this.meter >= SUPER_COST) {
        this.startMove(this.moves.super);
        return;
      }
      if (inp.special || inp.dp) {
        this.startMove(this.moves.s);
        return;
      }
    }

    if (move.projectile && this.moveFrame === move.startup + 1 && !this.hitDone) {
      this.hitDone = true;
      this.pendingProjectile = this.move;
    }
    if (this.moveFrame >= move.startup + move.active + move.recovery) {
      this.toIdle();
    }
  }

  updateKnockdown() {
    if (this.airborne || this.vy !== 0) {
      this.physics();
      if (!this.airborne) {
        this.vx = 0;
        this.timer = 0;
      }
      return;
    }
    this.timer += 1;
    if (this.timer >= KNOCKDOWN_LIE) {
      this.setState('getup', GETUP_FRAMES);
      this.invuln = Math.max(this.invuln, GETUP_INVULN);
    }
  }

  physics() {
    if (this.airborne || this.vy !== 0) {
      this.vy += GRAVITY;
      this.y += this.vy;
      this.x += this.vx;
      if (this.y >= WORLD.ground) {
        this.y = WORLD.ground;
        this.vy = 0;
        if (this.state === 'jump') {
          this.toIdle();
        } else if (this.state === 'attack' && this.move === 'jumpAtk') {
          this.toIdle();
        } else if (this.state !== 'knockdown' && this.state !== 'ko') {
          this.vx = 0;
        }
      }
    } else {
      this.x += this.vx;
      this.vx *= 0.82;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }
    this.x = Math.max(WORLD.leftWall, Math.min(WORLD.rightWall, this.x));
  }

  onHit(move, hpDamage, opts = {}) {
    this.hp = Math.max(0, this.hp - hpDamage);
    this.crouching = false;
    this.blocking = false;
    if (this.hp <= 0) {
      this.setState('ko');
      this.vx = -this.facing * 4.5;
      this.vy = -7;
      return;
    }
    if (move.knockdown) {
      this.setState('knockdown');
      this.vx = -this.facing * 5.2;
      this.vy = -8.2;
      this.timer = 0;
      return;
    }
    if (move.launcher && !this.airborne && !opts.juggleHit) {
      this.setState('hitstun', move.hitstun || 34);
      this.juggle = true;
      this.vx = -this.facing * (move.push ?? 1.5);
      this.vy = -9.5;
      return;
    }
    this.setState('hitstun', move.hitstun);
    this.vx = opts.push === false ? 0 : -this.facing * (move.push ?? 2.5);
  }

  onBlock(move, chip) {
    this.hp = Math.max(1, this.hp - chip);
    this.setState('blockstun', move.blockstun);
    this.vx = -this.facing * 1.8;
  }
}
