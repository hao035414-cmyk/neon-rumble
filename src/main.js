/**
 * Boot, loop and shell: title screen, match lifecycle, pause and audio.
 */

import { Engine } from './engine.js';
import { InputManager } from './input.js';
import { AI } from './ai.js';
import { VIEW } from './config.js';
import { drawPause, drawTitle, renderScene } from './render.js';

const STEP = 1000 / 60;

class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  blip(from, to, duration, type = 'square', gain = 0.07) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  play(type) {
    if (this.muted) return;
    switch (type) {
      case 'hit':
        this.blip(180, 70, 0.1, 'square', 0.08);
        break;
      case 'block':
        this.blip(360, 240, 0.06, 'triangle', 0.05);
        break;
      case 'special':
        this.blip(260, 720, 0.18, 'sine', 0.06);
        break;
      case 'super':
        this.blip(120, 960, 0.42, 'sawtooth', 0.07);
        break;
      case 'ko':
        this.blip(240, 40, 0.7, 'sawtooth', 0.09);
        break;
      case 'fight':
        this.blip(520, 880, 0.16, 'square', 0.05);
        break;
      case 'time':
        this.blip(600, 300, 0.3, 'square', 0.05);
        break;
      default:
        break;
    }
  }
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = VIEW.width * dpr;
canvas.height = VIEW.height * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const input = new InputManager(window);
const sfx = new Sfx();
const ai = new AI({ difficulty: 1 });
const aiP1 = new AI({ difficulty: 1 });
const params = new URLSearchParams(window.location.search);
const demo = params.has('demo');
const debug = params.has('debug');

window.addEventListener('error', (event) => {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:99;margin:0;padding:8px;background:#160008;color:#ff6b6b;font:12px monospace;max-width:92vw;white-space:pre-wrap;border:1px solid #ff6b6b';
  el.textContent = `ERROR: ${event.message}\n${event.error?.stack ?? ''}`;
  document.body.appendChild(el);
});

const ui = { muted: false, debug };
let mode = 'cpu';
let state = 'title';
let engine = null;
let started = performance.now();

function startMatch(nextMode) {
  mode = nextMode;
  engine = new Engine();
  state = 'fight';
  input.clearHits();
  sfx.play('fight');
  started = performance.now();
}

function toTitle() {
  engine = null;
  state = 'title';
  input.clearHits();
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') {
    sfx.muted = !sfx.muted;
    ui.muted = sfx.muted;
    return;
  }

  if (state === 'title') {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      startMatch('cpu');
    } else if (event.code === 'Digit2' || event.code === 'Numpad2') {
      startMatch('2p');
    }
    return;
  }

  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (state === 'fight') state = 'paused';
    else if (state === 'paused') {
      state = 'fight';
      input.clearHits();
    }
    return;
  }

  if (event.code === 'KeyR' && (state === 'fight' || state === 'paused' || state === 'over')) {
    startMatch(mode);
    return;
  }

  if (event.code === 'KeyQ' && state === 'paused') {
    toTitle();
    return;
  }

  if ((event.code === 'Enter' || event.code === 'NumpadEnter') && state === 'over') {
    startMatch(mode);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'fight') state = 'paused';
});

function update() {
  if (state !== 'fight' || !engine) return;

  if (engine.isOver) {
    state = 'over';
    return;
  }

  const { p1, p2 } = input.poll();
  const p1Input = demo ? aiP1.think(engine, engine.p1, engine.p2) : p1;
  const p2Input = mode === 'cpu' || demo ? ai.think(engine, engine.p2, engine.p1) : p2;
  engine.update(p1Input, p2Input);

  for (const event of engine.drainEvents()) sfx.play(event.type);

  if (engine.isOver) state = 'over';
}

function draw(now) {
  if (state === 'title' || !engine) {
    drawTitle(ctx, now / 16, state);
    return;
  }

  renderScene(ctx, engine, ui);

  if (state === 'paused') drawPause(ctx);
}

let accumulator = 0;
let last = performance.now();

function frame(now) {
  const delta = Math.min(120, now - last);
  last = now;
  accumulator += delta;

  let steps = 0;
  while (accumulator >= STEP && steps < 5) {
    update();
    accumulator -= STEP;
    steps += 1;
  }
  if (accumulator > STEP * 6) accumulator = 0;

  draw(now);
  requestAnimationFrame(frame);
}

if (demo) {
  startMatch('cpu');
  const ff = Number(params.get('ff') ?? 0);
  if (Number.isFinite(ff) && ff > 0) {
    for (let i = 0; i < Math.min(ff, 60 * 90); i += 1) update();
    input.clearHits();
  }
}

requestAnimationFrame(frame);

// Expose a tiny debug handle for the browser console.
window.__neonRumble = {
  get engine() {
    return engine;
  },
  get state() {
    return state;
  },
  start: startMatch,
  toTitle,
};
