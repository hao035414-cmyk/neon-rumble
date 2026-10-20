/**
 * A small, readable opponent AI with a human-like reaction delay.
 * Difficulty changes reaction speed, conversion of hits into combos,
 * punish frequency and how often it takes a bad action.
 */

import { MOVES } from './config.js';

const HISTORY = 40;

export class AI {
  constructor({ difficulty = 1 } = {}) {
    this.difficulty = difficulty;
    this.delay = difficulty >= 1.15 ? 5 : difficulty <= 0.85 ? 14 : 9;
    this.history = [];
    this.cooldown = 0;
  }

  observe(engine, self, opponent) {
    const move = opponent.state === 'attack' ? MOVES[opponent.move] : null;
    const recoveryLeft = move ? move.startup + move.active + move.recovery - opponent.moveFrame : 0;
    const incoming = engine.projectiles.some(
      (p) => p.owner !== self && Math.abs(p.x - self.x) < 300 && Math.sign(p.vx) === Math.sign(self.x - p.x),
    );
    this.history.push({
      dist: Math.abs(opponent.x - self.x),
      attacking: opponent.state === 'attack',
      recoveryLeft,
      airborne: opponent.airborne,
      blocking: opponent.blocking,
      moveKey: opponent.move,
      incoming,
    });
    if (this.history.length > HISTORY) this.history.shift();
    const idx = Math.max(0, this.history.length - 1 - this.delay);
    return this.history[idx];
  }

  think(engine, self, opponent) {
    const input = {};
    if (self.hp <= 0 || self.state === 'ko') return input;
    const seen = this.observe(engine, self, opponent);
    const skill = Math.min(1.25, Math.max(0.5, this.difficulty));
    const sMove = MOVES[self.moves?.s];
    const sIsProjectile = Boolean(sMove && sMove.projectile);

    // Convert a connected jab into the wave: the basic combo every player learns.
    if (self.state === 'attack' && self.move === 'lp' && self.hitConfirmed && Math.random() < 0.85 * skill) {
      input.special = true;
      return input;
    }

    if (['hitstun', 'knockdown', 'getup', 'blockstun', 'dash', 'backdash'].includes(self.state)) return input;
    if (self.state === 'attack') return input;

    const dist = Math.abs(opponent.x - self.x);
    const toward = opponent.x > self.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';
    this.cooldown = Math.max(0, this.cooldown - 1);

    // Low difficulty freezes up or retreats when it should be pressing.
    if (Math.random() < (1.25 - skill) * 0.06) {
      if (Math.random() < 0.6) return input;
      input[away] = true;
      this.cooldown = 24;
      return input;
    }

    if (self.airborne) {
      if (!self.airAttackUsed && dist < 150) input.heavy = true;
      return input;
    }

    // Throw tech.
    if (seen.moveKey === 'throw' && seen.dist < 110 && Math.random() < 0.5 * skill) {
      input.tech = true;
      return input;
    }

    // Guard against a committed attack or an incoming projectile.
    if ((seen.attacking && seen.dist < 170) || seen.incoming) {
      if (Math.random() < 0.5 * skill) {
        input[away] = true;
        if (Math.random() < 0.5) input.down = true;
        return input;
      }
    }

    // Anti-air.
    if (seen.airborne && seen.dist < 190 && this.cooldown === 0) {
      if (Math.random() < 0.2 * skill) {
        input.dp = true;
        this.cooldown = 40;
        return input;
      }
      if (Math.random() < 0.6) {
        input.heavy = true;
        this.cooldown = 26;
        return input;
      }
    }

    // Ranged tool: poke from mid range, never from point blank.
    if (this.cooldown === 0 && seen.dist > 170 && seen.dist < 460 && Math.random() < 0.02 * skill) {
      input.u = true;
      this.cooldown = 50;
      return input;
    }

    // Whiff punish.
    if (seen.recoveryLeft > 12 && seen.dist < 120 && this.cooldown === 0 && Math.random() < 0.9 * skill) {
      input.kick = true;
      this.cooldown = 30;
      return input;
    }

    // Break a turtle with a throw.
    if (seen.blocking && seen.dist < 80 && this.cooldown === 0 && Math.random() < 0.2 * skill) {
      input.throw = true;
      this.cooldown = 34;
      return input;
    }

    if (dist > 320) {
      input[toward] = true;
      if (sIsProjectile && this.cooldown === 0 && Math.random() < 0.012 * skill) {
        input.special = true;
        this.cooldown = 80;
      }
      return input;
    }

    if (dist > 160) {
      input[toward] = true;
      if (sIsProjectile && this.cooldown === 0 && Math.random() < 0.016 * skill) {
        input.special = true;
        this.cooldown = 90;
      } else if (this.cooldown === 0 && Math.random() < 0.008) {
        input.up = true;
        input[toward] = true;
        this.cooldown = 50;
      }
      return input;
    }

    if (this.cooldown > 0) {
      input[toward] = true;
      return input;
    }

    // Spacing: use the kick only inside its reach, otherwise jab.
    const roll = Math.random();
    if (self.meter >= 100 && roll < 0.24 * skill) {
      input.super = true;
      this.cooldown = 100;
    } else if (dist < 105 && roll < 0.25) {
      input.kick = true;
      this.cooldown = 34;
    } else if (roll < 0.55) {
      input.light = true;
      this.cooldown = 14;
    } else if (roll < 0.75) {
      input.heavy = true;
      this.cooldown = 24;
    } else if (roll < 0.85) {
      input.down = true;
      input.heavy = true;
      this.cooldown = 30;
    } else if (roll < 0.93) {
      input.down = true;
      input.kick = true;
      this.cooldown = 26;
    } else {
      input[away] = true;
      this.cooldown = 18;
    }
    return input;
  }
}
