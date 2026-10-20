/**
 * Keyboard input with fighting-game motion recognition:
 * QCF (wave), DP (rising fang), double QCF (super), double-tap dash,
 * light+heavy throw / throw tech, and a short attack buffer.
 */

import { INPUT_BUFFER, KEYS, THROW_TECH_WINDOW } from './config.js';

const GAME_CODES = new Set([
  ...Object.values(KEYS.p1).flat(),
  ...Object.values(KEYS.p2).flat(),
]);

const QCF = ['d', 'df', 'f'];
const QCF2 = [...QCF, ...QCF];
const DP = ['f', 'd', 'df'];

const isSubsequence = (tokens, pattern) => {
  let i = 0;
  for (const token of tokens) {
    if (token === pattern[i]) i += 1;
    if (i === pattern.length) return true;
  }
  return false;
};

const freshPress = () => ({ light: -99, heavy: -99, kick: -99 });
const freshTap = () => ({ left: -99, right: -99 });

export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.down = new Set();
    this.hit = new Set();
    this.buffer = { p1: [], p2: [] };
    this.press = { p1: freshPress(), p2: freshPress() };
    this.tap = { p1: freshTap(), p2: freshTap() };
    this.techFrame = { p1: -99, p2: -99 };
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
      u: false,
      special: false,
      super: false,
      dp: false,
      ex: false,
      throw: false,
      tech: false,
      dashLeft: false,
      dashRight: false,
    };

    const tappedLight = this.tappedAny(keys.light);
    const tappedHeavy = this.tappedAny(keys.heavy);
    const tappedKick = this.tappedAny(keys.kick);
    const tappedU = this.tappedAny(keys.u);
    const taps = this.press[id];

    if (tappedLight && tappedHeavy) {
      input.tech = true;
      input.throw = true;
      this.techFrame[id] = this.frame;
      taps.light = -99;
      taps.heavy = -99;
      return input;
    }
    if (tappedLight) taps.light = this.frame;
    if (tappedHeavy) taps.heavy = this.frame;
    if (tappedKick) taps.kick = this.frame;
    if (this.frame - this.techFrame[id] <= THROW_TECH_WINDOW) input.tech = true;

    // Double-tap dash (absolute direction; the fighter resolves forward/back).
    const tap = this.tap[id];
    if (this.tappedAny(keys.right)) {
      if (this.frame - tap.right <= 12) input.dashRight = true;
      tap.right = this.frame;
      tap.left = -99;
    } else if (this.tappedAny(keys.left)) {
      if (this.frame - tap.left <= 12) input.dashLeft = true;
      tap.left = this.frame;
      tap.right = -99;
    }

    const tokens = this.sampleMotion(id);
    const tappedAttack = tappedLight || tappedHeavy || tappedKick;
    input.u = tappedU;

    if (tappedAttack) {
      if (isSubsequence(tokens, QCF2)) {
        input.super = true;
        this.buffer[id] = [];
      } else if (isSubsequence(tokens, DP)) {
        input.dp = true;
        this.buffer[id] = [];
      } else if (isSubsequence(tokens, QCF)) {
        input.special = true;
        input.ex = tappedHeavy;
        this.buffer[id] = [];
      }
    }

    if (input.super || input.dp || input.special) return input;

    // Buffered buttons stay live for a few frames so presses during recovery
    // are not lost, without repeating an action after a move ends.
    input.light = this.frame - taps.light <= INPUT_BUFFER;
    input.heavy = this.frame - taps.heavy <= INPUT_BUFFER;
    input.kick = this.frame - taps.kick <= INPUT_BUFFER;
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
