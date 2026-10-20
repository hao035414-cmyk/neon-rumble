import assert from 'node:assert/strict';
import { STAGES, STAGE_BY_ID, validateStages } from '../src/stages.js';
import { TRACKS } from '../src/audio-tracks.js';

assert.equal(STAGES.length, 5, 'five stages');
assert.equal(new Set(STAGES.map((s) => s.id)).size, 5, 'unique stage ids');
assert.deepEqual(validateStages(TRACKS), [], 'stage data and BGM tracks are consistent');

for (const stage of STAGES) {
  assert.ok(STAGE_BY_ID[stage.id], 'lookup works for ' + stage.id);
  assert.equal(stage.kind, stage.kind.toLowerCase());
  assert.ok(TRACKS[stage.music], 'stage has a BGM track: ' + stage.id);
}

assert.equal(TRACKS.menu.drums, false, 'menu track is calmer');
assert.notEqual(TRACKS.neon_city.bpm, TRACKS.snow_peak.bpm, 'stages have different tempos');

console.log('all stage tests passed');
