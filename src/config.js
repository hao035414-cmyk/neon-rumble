/**
 * Static game data: viewport, world, characters and move tables.
 * This module is DOM-free so the simulation can run under Node for tests.
 */

export const FPS = 60;

export const VIEW = { width: 960, height: 540 };

export const WORLD = {
  width: 1600,
  ground: 468,
  leftWall: 48,
  rightWall: 1552,
  pushWidth: 54,
};

export const GRAVITY = 0.82;
export const ROUND_TIME = 99;
export const ROUNDS_TO_WIN = 2;

export const METER_MAX = 100;
export const SUPER_COST = 100;

export const CHARACTERS = {
  kai: {
    name: 'KAI',
    tagline: 'the blue current',
    hp: 1000,
    speed: 3.3,
    jump: 15.6,
    colors: {
      primary: '#2f7cf6',
      primaryDark: '#1b4fa8',
      secondary: '#ffc23c',
      skin: '#f0c49b',
      hair: '#16233f',
      aura: '#57b6ff',
    },
  },
  rin: {
    name: 'RIN',
    tagline: 'the violet edge',
    hp: 1000,
    speed: 3.05,
    jump: 15.2,
    colors: {
      primary: '#c04df0',
      primaryDark: '#6f2494',
      secondary: '#37e6b0',
      skin: '#f3d2b4',
      hair: '#2a1036',
      aura: '#d98bff',
    },
  },
};

/**
 * Move table. All geometry is relative to the fighter's feet:
 * - `ox` horizontal offset from the fighter's centre, forward = facing.
 * - `oy` distance from the feet to the TOP of the hitbox.
 * - `w` / `h` box size; reach is ox + w.
 */
export const MOVES = {
  lp: {
    label: 'jab',
    startup: 4,
    active: 3,
    recovery: 7,
    damage: 26,
    hitstun: 13,
    blockstun: 9,
    hitbox: { ox: 22, oy: 126, w: 58, h: 30 },
    meterGain: 7,
    push: 2.4,
  },
  hp: {
    label: 'heavy',
    startup: 9,
    active: 4,
    recovery: 17,
    damage: 64,
    hitstun: 18,
    blockstun: 12,
    hitbox: { ox: 24, oy: 118, w: 76, h: 36 },
    meterGain: 11,
    push: 4.2,
  },
  kick: {
    label: 'kick',
    startup: 12,
    active: 5,
    recovery: 19,
    damage: 82,
    hitstun: 20,
    blockstun: 14,
    hitbox: { ox: 28, oy: 92, w: 84, h: 42 },
    meterGain: 12,
    push: 5.6,
    knockdown: true,
  },
  low: {
    label: 'low',
    startup: 8,
    active: 4,
    recovery: 14,
    damage: 38,
    hitstun: 14,
    blockstun: 10,
    hitbox: { ox: 24, oy: 42, w: 76, h: 36 },
    meterGain: 8,
    push: 2.8,
    low: true,
  },
  jumpAtk: {
    label: 'air',
    startup: 5,
    active: 8,
    recovery: 8,
    damage: 52,
    hitstun: 16,
    blockstun: 10,
    hitbox: { ox: 18, oy: 74, w: 64, h: 50 },
    meterGain: 8,
    push: 3.2,
    overhead: true,
  },
  special: {
    label: 'wave',
    startup: 12,
    active: 5,
    recovery: 22,
    projectile: true,
    meterGain: 0,
  },
  super: {
    label: 'super',
    startup: 10,
    active: 10,
    recovery: 26,
    projectile: true,
    meterCost: SUPER_COST,
    meterGain: 0,
  },
};

/** Projectile definitions fired by the special / super moves. */
export const PROJECTILES = {
  special: {
    damage: 72,
    chip: 10,
    hitstun: 20,
    blockstun: 14,
    speed: 9.2,
    radius: 20,
    life: 120,
    hitstop: 5,
    shake: 7,
  },
  super: {
    damage: 210,
    chip: 34,
    hitstun: 30,
    blockstun: 20,
    speed: 12.5,
    radius: 40,
    life: 120,
    hitstop: 9,
    shake: 16,
  },
};

/** Keyboard layout for both players (KeyboardEvent.code values). */
export const KEYS = {
  p1: {
    left: ['KeyA'],
    right: ['KeyD'],
    up: ['KeyW'],
    down: ['KeyS'],
    light: ['KeyJ'],
    heavy: ['KeyK'],
    kick: ['KeyL'],
  },
  p2: {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    light: ['Numpad1', 'KeyN'],
    heavy: ['Numpad2', 'KeyM'],
    kick: ['Numpad3', 'Comma'],
  },
};
