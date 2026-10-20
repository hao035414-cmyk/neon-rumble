import assert from 'node:assert/strict';
import { SelectState, ROSTER, STAGE_IDS } from '../src/select.js';

const press = (key) => ({ [key]: true });
const none = {};

// Both players lock in, then the match moves to stage select.
{
  const state = new SelectState({ mode: '2p' });
  state.update({ p1: press('confirm'), p2: none });
  assert.equal(state.phase, 'character', 'waits for the second player');
  state.update({ p1: none, p2: press('confirm') });
  assert.equal(state.phase, 'stage', 'both locked moves to stage select');
  assert.ok(ROSTER.includes(state.pick.p1) && ROSTER.includes(state.pick.p2));
}

// Locking the stage finishes the flow.
{
  const state = new SelectState({ mode: '2p' });
  state.update({ p1: press('confirm'), p2: press('confirm') });
  state.update({ p1: press('confirm') });
  assert.equal(state.phase, 'done');
  assert.ok(STAGE_IDS.includes(state.stage), 'stage is a known id');
}

// Cancel in stage select goes back and unlocks the chooser.
{
  const state = new SelectState({ mode: '2p' });
  state.update({ p1: press('confirm'), p2: press('confirm') });
  state.update({ p1: press('cancel') });
  assert.equal(state.phase, 'character');
  assert.equal(state.locked.p1, false);
  assert.equal(state.locked.p2, true);
}

// Timeout locks random characters and a random stage.
{
  const state = new SelectState();
  state.timer = 1;
  state.update({ p1: none, p2: none });
  assert.ok(state.locked.p1 && state.locked.p2, 'timeout locks both');
  assert.equal(state.phase, 'stage', 'timeout reaches stage select');
  state.timer = 1;
  state.update({ p1: none });
  assert.equal(state.phase, 'done', 'stage timeout finishes');
  assert.ok(STAGE_IDS.includes(state.stage));
}

// CPU picks a character after the human locks in.
{
  const state = new SelectState({ mode: 'cpu' });
  state.update({ p1: press('confirm') });
  for (let i = 0; i < 25; i += 1) state.update({ p1: none });
  assert.ok(state.locked.p2, 'CPU locked a character');
  assert.equal(state.phase, 'stage');
}

// Mirror matches are allowed.
{
  const state = new SelectState({ mode: '2p' });
  state.update({ p1: press('confirm'), p2: none });
  state.update({ p1: none, p2: press('confirm') });
  assert.equal(state.phase, 'stage');
  // Force the same pick by locking the same cursor index.
  const mirror = new SelectState({ mode: '2p' });
  mirror.cursor.p1 = 0;
  mirror.cursor.p2 = 0;
  mirror.update({ p1: press('confirm'), p2: press('confirm') });
  assert.equal(mirror.pick.p1, mirror.pick.p2, 'mirror picks are allowed');
}

// In 2P the previous loser chooses the stage.
{
  const state = new SelectState({ mode: '2p', lastLoser: 'p2' });
  assert.equal(state.stageChooser, 'p2');
  assert.equal(new SelectState({ mode: '2p' }).stageChooser, 'p1');
}

// Grid navigation wraps rows instead of leaving the grid.
{
  const state = new SelectState();
  state.update({ p1: press('right') });
  assert.equal(state.cursor.p1, 1);
  state.update({ p1: press('down') });
  assert.ok(state.cursor.p1 >= 4, 'down moves a full row');
  state.update({ p1: press('left') });
  state.update({ p1: press('left') });
  state.update({ p1: press('left') });
  state.update({ p1: press('left') });
  assert.ok(state.cursor.p1 >= 0, 'cursor stays in bounds');
}

console.log('all select tests passed');
