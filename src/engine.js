/**
 * Match simulation: fighters, projectiles, hit resolution, rounds and camera.
 * DOM-free; the renderer reads this object and the tests drive it under Node.
 */

import {
  CHARACTERS,
  COMBO_TIMEOUT,
  MAX_ROUNDS,
  MOVES,
  PROJECTILES,
  ROUNDS_TO_WIN,
  ROUND_TIME,
  SUPER_COST,
  VIEW,
  WORLD,
} from './config.js';
import { Fighter } from './fighter.js';

const INTRO_FRAMES = 96;
const KO_FRAMES = 132;
const ROUND_END_FRAMES = 86;
const START_P1 = 540;
const START_P2 = 1060;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Engine {
  constructor(options = {}) {
    const a = options.charA ?? 'kai';
    const b = options.charB ?? 'rin';
    this.p1 = new Fighter({ id: 'p1', char: CHARACTERS[a], charKey: a, x: START_P1, facing: 1 });
    this.p2 = new Fighter({ id: 'p2', char: CHARACTERS[b], charKey: b, x: START_P2, facing: -1 });

    this.fighters = [this.p1, this.p2];
    this.projectiles = [];
    this.particles = [];
    this.events = [];

    this.phase = 'intro';
    this.phaseTimer = 0;
    this.round = 1;
    this.timer = ROUND_TIME * 60;
    this.hitstop = 0;
    this.shake = 0;
    this.cameraX = START_P1 + 260 - VIEW.width / 2;
    this.combo = { p1: 0, p2: 0 };
    this.comboTimer = { p1: 0, p2: 0 };
    this.matchWinner = null;
    this.lastWinner = null;
    this.frame = 0;
  }

  get secondsLeft() {
    return Math.max(0, Math.ceil(this.timer / 60));
  }

  get isOver() {
    return this.phase === 'matchOver';
  }

  startRound() {
    this.p1.reset(START_P1, 1);
    this.p2.reset(START_P2, -1);
    this.projectiles = [];
    this.particles = [];
    this.combo = { p1: 0, p2: 0 };
    this.comboTimer = { p1: 0, p2: 0 };
    this.timer = ROUND_TIME * 60;
    this.phase = 'intro';
    this.phaseTimer = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.cameraX = clamp(START_P1 + 260 - VIEW.width / 2, 0, WORLD.width - VIEW.width);
  }

  update(inputP1, inputP2) {
    this.frame += 1;
    this.updateParticles();
    if (this.shake > 0) this.shake *= 0.86;

    if (this.hitstop > 0) {
      this.hitstop -= 1;
      return;
    }

    this.phaseTimer += 1;

    if (this.phase === 'intro') {
      this.p1.update({}, this.p2);
      this.p2.update({}, this.p1);
      if (this.phaseTimer >= INTRO_FRAMES) {
        this.phase = 'fight';
        this.phaseTimer = 0;
        this.events.push({ type: 'fight' });
      }
    } else if (this.phase === 'fight') {
      // Alternate update order every frame so neither player owns a
      // systematic first-move advantage in trades.
      if (this.frame % 2 === 0) {
        this.p1.update(inputP1, this.p2, this);
        this.p2.update(inputP2, this.p1, this);
      } else {
        this.p2.update(inputP2, this.p1, this);
        this.p1.update(inputP1, this.p2, this);
      }
      this.separate();
      this.spawnPending();
      this.updateProjectiles();
      this.resolveStrikes(inputP1, inputP2);
      this.tickCombo();
      this.timer = Math.max(0, this.timer - 1);
      if (this.timer <= 0) this.timeUp();
      if (this.p1.hp <= 0 || this.p2.hp <= 0) this.finishRound();
    } else if (this.phase === 'ko') {
      this.p1.update({}, this.p2);
      this.p2.update({}, this.p1);
      this.separate();
      this.updateProjectiles();
      if (this.phaseTimer >= KO_FRAMES) this.endRound();
    } else if (this.phase === 'roundEnd') {
      if (this.phaseTimer >= ROUND_END_FRAMES) {
        this.round += 1;
        this.startRound();
      }
    }

    this.updateCamera();
  }

  finishRound() {
    if (this.phase !== 'fight') return;
    this.phase = 'ko';
    this.phaseTimer = 0;
    this.hitstop = 10;
    this.shake = 16;
    if (this.p1.hp <= 0 && this.p2.hp <= 0) this.lastWinner = null;
    else this.lastWinner = this.p1.hp <= 0 ? this.p2 : this.p1;
    this.events.push({ type: 'ko' });
  }

  timeUp() {
    if (this.phase !== 'fight') return;
    this.phase = 'ko';
    this.phaseTimer = 0;
    if (this.p1.hp === this.p2.hp) this.lastWinner = null;
    else this.lastWinner = this.p1.hp > this.p2.hp ? this.p1 : this.p2;
    this.events.push({ type: 'time' });
  }

  endRound() {
    if (this.lastWinner) this.lastWinner.wins += 1;
    if (this.lastWinner && this.lastWinner.wins >= ROUNDS_TO_WIN) {
      this.matchWinner = this.lastWinner;
      this.phase = 'matchOver';
      this.phaseTimer = 0;
      return;
    }
    if (this.round >= MAX_ROUNDS) {
      if (this.p1.wins === this.p2.wins) {
        this.matchWinner = null;
        this.events.push({ type: 'draw' });
      } else {
        this.matchWinner = this.p1.wins > this.p2.wins ? this.p1 : this.p2;
      }
      this.phase = 'matchOver';
      this.phaseTimer = 0;
      return;
    }
    this.phase = 'roundEnd';
    this.phaseTimer = 0;
  }

  separate() {
    const a = this.p1;
    const b = this.p2;
    if (a.airborne || b.airborne) return;
    const dx = b.x - a.x;
    const min = WORLD.pushWidth;
    if (Math.abs(dx) < min) {
      const push = (min - Math.abs(dx)) / 2;
      const dir = dx >= 0 ? 1 : -1;
      a.x = clamp(a.x - push * dir, WORLD.leftWall, WORLD.rightWall);
      b.x = clamp(b.x + push * dir, WORLD.leftWall, WORLD.rightWall);
    }
  }

  spawnPending() {
    for (const fighter of this.fighters) {
      if (!fighter.pendingProjectile) continue;
      const kind = fighter.pendingProjectile;
      fighter.pendingProjectile = null;
      // U tools are limited to one live projectile per owner; supers and
      // placed orbs are exempt (the fighter-level check already blocks U).
      const pendingMove = MOVES[kind];
      if (pendingMove?.u && this.projectiles.some((proj) => proj.owner === fighter && !proj.dead)) continue;
      if (pendingMove?.spread) {
        for (let i = 0; i < pendingMove.spread; i += 1) {
          this.projectiles.push(this.makeProjectile(fighter, kind, { yOffset: 64 + i * 38 }));
        }
      } else {
        this.projectiles.push(this.makeProjectile(fighter, kind));
      }
      this.events.push({ type: kind === 'super' ? 'super' : 'special' });
    }
  }

  makeProjectile(owner, kind, opts = {}) {
    const def = PROJECTILES[kind];
    const offset = opts.offset ?? (def.place ? 90 : 46);
    return {
      owner,
      kind,
      x: owner.x + owner.facing * offset,
      y: owner.y - (opts.yOffset ?? def.yOffset ?? 104),
      vx: owner.facing * def.speed,
      radius: def.radius,
      life: def.life,
      def,
      facing: owner.facing,
      dead: false,
    };
  }

  updateProjectiles() {
    for (const proj of this.projectiles) {
      if (proj.dead) continue;
      proj.x += proj.vx;
      proj.life -= 1;
      if (proj.life <= 0 || proj.x < -80 || proj.x > WORLD.width + 80) {
        proj.dead = true;
        continue;
      }
      // Projectile clash: supers beat normal waves, otherwise both vanish.
      for (const other of this.projectiles) {
        if (other === proj || other.dead || other.owner === proj.owner) continue;
        if (Math.hypot(other.x - proj.x, other.y - proj.y) > proj.radius + other.radius) continue;
        const projSuper = proj.kind === 'super';
        const otherSuper = other.kind === 'super';
        if (projSuper && !otherSuper) {
          other.dead = true;
        } else if (otherSuper && !projSuper) {
          proj.dead = true;
        } else {
          proj.dead = true;
          other.dead = true;
        }
        this.spark((proj.x + other.x) / 2, proj.y, '#b6f3ff', 14);
        this.events.push({ type: 'block' });
        this.hitstop = 3;
        break;
      }
      if (proj.dead) continue;
      const target = proj.owner === this.p1 ? this.p2 : this.p1;
      if (target.invuln > 0) continue;
      const box = {
        x: proj.x - proj.radius,
        y: proj.y - proj.radius,
        w: proj.radius * 2,
        h: proj.radius * 2,
      };
      if (!overlaps(box, target.hurtbox)) continue;
      const pseudo = {
        hitstun: proj.def.hitstun,
        blockstun: proj.def.blockstun,
        push: 4,
        knockdown: proj.kind === 'super',
        low: false,
        overhead: false,
      };
      const blocked = target.canBlock(pseudo);
      if (blocked) {
        target.onBlock(pseudo, proj.def.chip);
        proj.owner.meter = clamp(proj.owner.meter + 4, 0, 100);
        target.meter = clamp(target.meter + 3, 0, 100);
        this.spark(proj.x, proj.y, '#7fd4ff', 8);
        this.events.push({ type: 'block' });
        this.hitstop = 3;
      } else {
        const dmg = Math.round(proj.def.damage * this.damageScale(proj.owner) * proj.owner.char.damageScale);
        target.onHit(pseudo, dmg);
        const ownerGain = proj.def.meterGain ?? 10;
        proj.owner.meter = clamp(proj.owner.meter + ownerGain, 0, 100);
        target.meter = clamp(target.meter + (proj.def.meterGain ? 2 : 6), 0, 100);
        this.spark(proj.x, proj.y, proj.kind === 'super' ? '#ffe066' : '#a7e0ff', 18);
        this.hitstop = proj.def.hitstop;
        this.shake = proj.def.shake;
        this.events.push({ type: 'hit' });
        this.registerCombo(proj.owner);
        if (target.hp <= 0) this.finishRound();
      }
      proj.dead = true;
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  resolveStrikes(inputP1 = {}, inputP2 = {}) {
    const inputs = { p1: inputP1, p2: inputP2 };
    const hits = [];
    const origHurt = { p1: this.p1.hurtbox, p2: this.p2.hurtbox };
    for (const attacker of this.fighters) {
      const defender = attacker === this.p1 ? this.p2 : this.p1;
      if (attacker.hitDone) continue;
      const move = MOVES[attacker.move];
      if (!move) continue;

      if (move.throw) {
        if (attacker.moveFrame <= move.startup || attacker.moveFrame > move.startup + move.active) continue;
        const dx = Math.abs(defender.x - attacker.x);
        const busy = ['hitstun', 'blockstun', 'knockdown', 'getup', 'ko'].includes(defender.state);
        if (dx > move.range || defender.airborne || defender.invuln > 0 || busy) continue;
        attacker.hitDone = true;
        const defenderInput = inputs[defender.id] || {};
        const teched = Boolean(defenderInput.tech) || Boolean(defenderInput.light && defenderInput.heavy);
        hits.push({ attacker, defender, move, kind: 'throw', teched });
        continue;
      }

      const box = attacker.activeHitbox();
      if (!box) continue;
      if (defender.invuln > 0) continue;
      if (!overlaps(box, origHurt[defender.id])) continue;
      attacker.hitDone = true;
      const blocked = defender.canBlock(move);
      const cx = (Math.max(box.x, origHurt[defender.id].x) + Math.min(box.x + box.w, origHurt[defender.id].x + origHurt[defender.id].w)) / 2;
      const cy = (Math.max(box.y, origHurt[defender.id].y) + Math.min(box.y + box.h, origHurt[defender.id].y + origHurt[defender.id].h)) / 2;
      hits.push({ attacker, defender, move, kind: blocked ? 'block' : 'hit', cx, cy });
    }

    // Apply every connect found this frame so simultaneous strikes trade
    // instead of giving player one a free first hit.
    for (const hit of hits) {
      const { attacker, defender, move } = hit;
      if (hit.kind === 'throw') {
        if (hit.teched) {
          this.events.push({ type: 'block' });
          attacker.vx = -attacker.facing * 2;
          defender.vx = defender.facing * 2;
          this.spark((attacker.x + defender.x) / 2, defender.y - 90, '#8fcbff', 8);
          defender.meter = clamp(defender.meter + 4, 0, 100);
          this.hitstop = 3;
          continue;
        }
        const dmg = Math.round(move.damage * this.damageScale(attacker) * attacker.char.damageScale);
        defender.onHit({ ...move, knockdown: true, push: 5.2 }, dmg);
        attacker.meter = clamp(attacker.meter + move.meterGain, 0, 100);
        defender.meter = clamp(defender.meter + 4, 0, 100);
        this.spark(defender.x, defender.y - 90, '#ffd166', 16);
        attacker.confirmHit();
        this.hitstop = 7;
        this.shake = 9;
        this.events.push({ type: 'hit' });
        this.registerCombo(attacker);
        continue;
      }

      if (hit.kind === 'block') {
        const blockedMove = { ...move, blockstun: Math.max(4, Math.round(move.blockstun * this.hitstunScale(attacker))) };
        defender.onBlock(blockedMove, 0);
        attacker.confirmHit();
        attacker.meter = clamp(attacker.meter + move.meterGain * 0.5, 0, 100);
        defender.meter = clamp(defender.meter + move.meterGain * 0.4, 0, 100);
        this.spark(hit.cx, hit.cy, '#8fcbff', 7);
        this.hitstop = Math.max(this.hitstop, 3);
        this.shake = 4;
        this.events.push({ type: 'block' });
        continue;
      }

      const dmg = Math.round(move.damage * this.damageScale(attacker) * attacker.char.damageScale);
      const stunScale = this.hitstunScale(attacker);
      const pushScale = this.pushScale(attacker);
      defender.onHit(
        {
          ...move,
          hitstun: Math.max(6, Math.round((move.hitstun ?? 12) * stunScale)),
          push: (move.push ?? 2.5) * pushScale,
        },
        dmg,
        { juggleHit: defender.airborne },
      );
      attacker.confirmHit();
      attacker.meter = clamp(attacker.meter + move.meterGain, 0, 100);
      defender.meter = clamp(defender.meter + move.meterGain * 0.6, 0, 100);
      this.spark(hit.cx, hit.cy, move.knockdown ? '#ffd166' : '#fff2b8', move.knockdown ? 16 : 10);
      this.hitstop = Math.max(this.hitstop, move.knockdown ? 7 : 4);
      this.shake = move.knockdown ? 10 : 6;
      this.events.push({ type: 'hit' });
      this.registerCombo(attacker);
    }

    if (this.p1.hp <= 0 || this.p2.hp <= 0) this.finishRound();
  }

  damageScale(attacker) {
    const combo = this.combo[attacker.id] ?? 0;
    return Math.max(0.3, 1 - combo * 0.09);
  }

  hitstunScale(attacker) {
    const combo = this.combo[attacker.id] ?? 0;
    return Math.max(0.55, 1 - combo * 0.12);
  }

  pushScale(attacker) {
    const combo = this.combo[attacker.id] ?? 0;
    return Math.max(0.35, Math.pow(0.85, combo));
  }

  registerCombo(attacker) {
    this.combo[attacker.id] = (this.combo[attacker.id] ?? 0) + 1;
    this.comboTimer[attacker.id] = COMBO_TIMEOUT;
  }

  tickCombo() {
    for (const id of ['p1', 'p2']) {
      if (this.comboTimer[id] > 0) {
        this.comboTimer[id] -= 1;
        if (this.comboTimer[id] === 0) this.combo[id] = 0;
      }
    }
  }

  spark(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 16 + Math.random() * 12,
        maxLife: 28,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.vx *= 0.97;
      p.life -= 1;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  updateCamera() {
    const mid = (this.p1.x + this.p2.x) / 2;
    const target = clamp(mid - VIEW.width / 2, 0, WORLD.width - VIEW.width);
    this.cameraX += (target - this.cameraX) * 0.12;
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}

export { SUPER_COST };
