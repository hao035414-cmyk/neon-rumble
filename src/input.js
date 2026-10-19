/**
 * Keyboard input with fighting-game motion recognition (quarter-circle
 * forward and double quarter-circle) per player.
 */

import { KEYS } from './config.js';

const GAME_CODES = new Set([
  ...Object.values(KEYS.p1).flat(),
  ...Object.values(KEYS.p2).flat(),
]);

const QCF = ['d', 'df', 'f'];
const QCF2 = [...QCF, ...QCF];

const isSubsequence = (tokens, pattern) => {
  let i = 0;
  for (const token of tokens) {
    if (token === pattern[i]) i += 1;
    if (i === pattern.length) return true;
  }
  return false;
};

export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.down = new Set();
    this.hit = new Set();
    this.buffer = { p1: [], p2: [] };
    this.frame = 0;

    this.onKeyDown = (event) => {
      if (event.repeat) return;
      this.down.add(event.code);
      this.hit.add(event.code);
      if (GAME_CODES.has(event.code)) event.preventDefault();
    };
    this.onKeyUp = (event) => {
      this.down.delete(event.code);
    };
    this.onBlur = () => this.down.clear();

    target.addEventListener('keydown', this.onKeyDown, { passive: false });
    target.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  hasAny(codes) {
    return codes.some((code) => this.down.has(code));
  }

  tappedAny(codes) {
    return codes.some((code) => this.hit.has(code));
  }

  sampleMotion(id) {
    const keys = KEYS[id];
    const down = this.hasAny(keys.down);
    const forward = id === 'p1' ? this.hasAny(keys.right) : this.hasAny(keys.left);
    let token = null;
    if (down && forward) token = 'df';
    else if (down) token = 'd';
    else if (forward) token = 'f';

    const buffer = this.buffer[id];
    if (token) buffer.push({ token, frame: this.frame });
    while (buffer.length > 12 || (buffer.length && this.frame - buffer[0].frame > 26)) {
      buffer.shift();
    }
    return buffer.map((entry) => entry.token);
  }

  build(id) {
    const keys = KEYS[id];
    const input = {
      left: this.hasAny(keys.left),
      right: this.hasAny(keys.right),
      up: this.hasAny(keys.up),
      down: this.hasAny(keys.down),
      light: false,
      heavy: false,
      kick: false,
      special: false,
      super: false,
    };

    const tokens = this.sampleMotion(id);
    const qcf = isSubsequence(tokens, QCF);
    const doubleQcf = isSubsequence(tokens, QCF2);
    const attack = this.tappedAny(keys.light) || this.tappedAny(keys.heavy) || this.tappedAny(keys.kick);

    if (attack) {
      if (doubleQcf) {
        input.super = true;
        this.buffer[id] = [];
      } else if (qcf) {
        input.special = true;
        this.buffer[id] = [];
      } else {
        input.light = this.tappedAny(keys.light);
        input.heavy = this.tappedAny(keys.heavy);
        input.kick = this.tappedAny(keys.kick);
      }
    }

    return input;
  }

  /** Called once per fixed simulation step; clears edge-triggered keys. */
  poll() {
    this.frame += 1;
    const p1 = this.build('p1');
    const p2 = this.build('p2');
    this.hit.clear();
    return { p1, p2 };
  }

  clearHits() {
    this.hit.clear();
  }
}
