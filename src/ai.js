/**
 * A small, readable opponent AI.
 * It reacts to attacks, anti-airs jumps, pokes at range and throws projectiles.
 */

export class AI {
  constructor({ difficulty = 1 } = {}) {
    this.difficulty = difficulty;
    this.cooldown = 0;
  }

  think(engine, self, opponent) {
    const input = {};
    if (self.hp <= 0 || self.state === 'ko') return input;
    if (['hitstun', 'knockdown', 'getup', 'blockstun'].includes(self.state)) return input;

    const dist = Math.abs(opponent.x - self.x);
    const toward = opponent.x > self.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';
    const busy = self.state === 'attack';

    if (!busy) this.cooldown = Math.max(0, this.cooldown - 1);

    if (self.airborne) {
      if (!self.airAttackUsed && dist < 150) input.heavy = true;
      return input;
    }

    const incoming = engine.projectiles.some(
      (p) => p.owner !== self && Math.abs(p.x - self.x) < 300 && Math.sign(p.vx) === Math.sign(self.x - p.x),
    );

    // Guard when the opponent commits or a projectile is closing in.
    if ((opponent.attacking && dist < 170) || incoming) {
      if (Math.random() < 0.62 * this.difficulty) {
        input[away] = true;
        if (Math.random() < 0.5) input.down = true;
        return input;
      }
    }

    // Anti-air.
    if (opponent.airborne && dist < 180 && this.cooldown === 0 && Math.random() < 0.55) {
      input.heavy = true;
      this.cooldown = 26;
      return input;
    }

    if (busy) return input;

    if (dist > 320) {
      input[toward] = true;
      if (this.cooldown === 0 && Math.random() < 0.012) {
        input.special = true;
        this.cooldown = 80;
      }
      return input;
    }

    if (dist > 160) {
      input[toward] = true;
      if (this.cooldown === 0 && Math.random() < 0.014) {
        input.special = true;
        this.cooldown = 90;
      } else if (this.cooldown === 0 && Math.random() < 0.01) {
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

    const roll = Math.random();
    if (self.meter >= 100 && roll < 0.14) {
      input.super = true;
      this.cooldown = 100;
    } else if (roll < 0.38) {
      input.light = true;
      this.cooldown = 16;
    } else if (roll < 0.62) {
      input.heavy = true;
      this.cooldown = 26;
    } else if (roll < 0.78) {
      input.kick = true;
      this.cooldown = 34;
    } else if (roll < 0.9) {
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
