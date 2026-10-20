/**
 * Character and stage selection state machine. DOM-free so it can be
 * driven from Node tests and from the browser loop alike.
 */

export const ROSTER = ['kai', 'rin', 'volt', 'nova', 'saber', 'echo'];
export const STAGE_IDS = ['neon_city', 'desert_dusk', 'snow_peak', 'grassland_wind', 'rainy_night'];

const CHARACTER_TIMEOUT = 30 * 60;
const STAGE_TIMEOUT = 15 * 60;
const CPU_PICK_DELAY = 20;
const COLS = 4;

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

function moveCursor(cursor, dir, size) {
  const row = Math.floor(cursor / COLS);
  const col = cursor % COLS;
  if (dir === 'left' && col > 0) return cursor - 1;
  if (dir === 'right' && col < COLS - 1 && cursor + 1 < size) return cursor + 1;
  if (dir === 'up' && row > 0) return cursor - COLS;
  if (dir === 'down' && cursor + COLS < size) return cursor + COLS;
  return cursor;
}

export class SelectState {
  constructor({ mode = 'cpu', roster = ROSTER, stages = STAGE_IDS, difficulty = 1, lastLoser = null } = {}) {
    this.mode = mode;
    this.roster = roster;
    this.stages = stages;
    this.difficulty = difficulty;
    this.lastLoser = lastLoser;
    this.phase = 'character';
    this.cursor = { p1: 0, p2: 1 };
    this.locked = { p1: false, p2: false };
    this.pick = { p1: null, p2: null };
    this.timer = CHARACTER_TIMEOUT;
    this.cpuTimer = -1;
    this.stageCursor = 0;
    this.stage = null;
    this.done = false;
  }

  get stageChooser() {
    if (this.mode === '2p' && this.lastLoser) return this.lastLoser;
    return 'p1';
  }

  rosterSize() {
    return this.roster.length + 1; // + RANDOM tile
  }

  update(inputs = {}) {
    if (this.phase === 'character') this.updateCharacter(inputs);
    else if (this.phase === 'stage') this.updateStage(inputs);
    return this.snapshot();
  }

  updateCharacter(inputs) {
    for (const id of ['p1', 'p2']) {
      if (this.locked[id]) continue;
      if (this.mode === 'cpu' && id === 'p2') continue;
      const inp = inputs[id] || {};
      if (inp.left) this.cursor[id] = moveCursor(this.cursor[id], 'left', this.rosterSize());
      if (inp.right) this.cursor[id] = moveCursor(this.cursor[id], 'right', this.rosterSize());
      if (inp.up) this.cursor[id] = moveCursor(this.cursor[id], 'up', this.rosterSize());
      if (inp.down) this.cursor[id] = moveCursor(this.cursor[id], 'down', this.rosterSize());
      if (inp.confirm) this.lockPlayer(id, this.cursor[id]);
    }

    if (this.mode === 'cpu' && this.locked.p1 && !this.locked.p2) {
      if (this.cpuTimer < 0) this.cpuTimer = CPU_PICK_DELAY;
      this.cpuTimer -= 1;
      if (this.cpuTimer <= 0) this.lockPlayer('p2', Math.floor(Math.random() * this.roster.length));
    }

    this.timer -= 1;
    if (this.timer <= 0) {
      for (const id of ['p1', 'p2']) {
        if (!this.locked[id]) this.lockPlayer(id, Math.floor(Math.random() * this.roster.length));
      }
    }

    if (this.locked.p1 && this.locked.p2) {
      this.phase = 'stage';
      this.timer = STAGE_TIMEOUT;
      this.stageCursor = Math.floor(Math.random() * (this.stages.length + 1));
    }
  }

  lockPlayer(id, index) {
    const isRandom = index >= this.roster.length;
    this.pick[id] = isRandom ? randomOf(this.roster) : this.roster[index];
    this.locked[id] = true;
  }

  updateStage(inputs) {
    const chooser = this.stageChooser;
    const inp = inputs[chooser] || {};
    const size = this.stages.length + 1;
    if (inp.left) this.stageCursor = moveCursor(this.stageCursor, 'left', size);
    if (inp.right) this.stageCursor = moveCursor(this.stageCursor, 'right', size);
    if (inp.up) this.stageCursor = moveCursor(this.stageCursor, 'up', size);
    if (inp.down) this.stageCursor = moveCursor(this.stageCursor, 'down', size);
    if (inp.cancel) {
      this.phase = 'character';
      this.timer = CHARACTER_TIMEOUT;
      this.locked[chooser] = false;
      this.pick[chooser] = null;
      return;
    }
    if (inp.confirm) {
      this.stage = this.stageCursor >= this.stages.length ? randomOf(this.stages) : this.stages[this.stageCursor];
      this.phase = 'done';
      this.done = true;
      return;
    }
    this.timer -= 1;
    if (this.timer <= 0) {
      this.stage = randomOf(this.stages);
      this.phase = 'done';
      this.done = true;
    }
  }

  snapshot() {
    return {
      phase: this.phase,
      mode: this.mode,
      cursor: { ...this.cursor },
      locked: { ...this.locked },
      pick: { ...this.pick },
      timer: this.timer,
      stageCursor: this.stageCursor,
      stage: this.stage,
      done: this.done,
    };
  }
}
