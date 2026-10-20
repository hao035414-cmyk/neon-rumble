import assert from 'node:assert/strict';
import { TRACKS, validateTrack } from '../src/audio-tracks.js';

for (const [id, track] of Object.entries(TRACKS)) {
  assert.deepEqual(validateTrack(track), [], 'track data is valid: ' + id);
}

assert.equal(TRACKS.neon_city.bpm, 124, 'neon city keeps the approved tempo');
assert.equal(TRACKS.neon_city.barsData.length, 8, 'eight-bar loop');
assert.equal(TRACKS.menu.drums, false, 'menu variant drops the drums');
assert.ok(TRACKS.neon_city.leadEvents.length > 0, 'stage track has a lead phrase');

const barSeconds = (60 / TRACKS.neon_city.bpm) * 4;
assert.ok(barSeconds > 1.5 && barSeconds < 2.5, 'bar length is sane: ' + barSeconds.toFixed(2));

for (const track of Object.values(TRACKS)) {
  assert.ok(track.gain > 0 && track.gain <= 1, 'track gain in range');
  assert.ok(track.barsData.every((bar) => bar.chord.length === 3), 'triads only');
}

console.log('audio track tests passed');
