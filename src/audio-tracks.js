/**
 * Stage BGM data. Every track is synthesized at runtime; no audio files.
 * 16-step patterns, 8-bar loop, five layers: bass, arp, pad, lead, drums.
 */

export const TRACKS = {
  menu: {
    id: 'menu',
    name: 'MENU',
    bpm: 124,
    bars: 8,
    drums: false,
    lead: false,
    gain: 0.55,
    barsData: [
      { root: 33, chord: [57, 60, 64] },
      { root: 33, chord: [57, 60, 64] },
      { root: 29, chord: [53, 57, 60] },
      { root: 29, chord: [53, 57, 60] },
      { root: 36, chord: [48, 52, 55] },
      { root: 36, chord: [48, 52, 55] },
      { root: 31, chord: [55, 59, 62] },
      { root: 31, chord: [55, 59, 62] },
    ],
    leadEvents: [],
  },
  desert_dusk: {
    id: 'desert_dusk',
    name: 'DESERT DUSK',
    bpm: 96,
    bars: 8,
    drums: true,
    lead: true,
    gain: 0.85,
    barsData: [
      { root: 38, chord: [50, 53, 57] },
      { root: 38, chord: [50, 53, 57] },
      { root: 34, chord: [46, 50, 53] },
      { root: 34, chord: [46, 50, 53] },
      { root: 29, chord: [41, 45, 48] },
      { root: 29, chord: [41, 45, 48] },
      { root: 33, chord: [45, 49, 52] },
      { root: 33, chord: [45, 49, 52] },
    ],
    leadEvents: [
      { bar: 4, step: 0, note: 74, len: 0.6 },
      { bar: 5, step: 6, note: 77, len: 0.4 },
      { bar: 6, step: 2, note: 81, len: 0.6 },
      { bar: 7, step: 10, note: 74, len: 0.5 },
    ],
  },
  snow_peak: {
    id: 'snow_peak',
    name: 'SNOW PEAK',
    bpm: 72,
    bars: 8,
    drums: false,
    lead: true,
    gain: 0.8,
    barsData: [
      { root: 42, chord: [54, 57, 61] },
      { root: 42, chord: [54, 57, 61] },
      { root: 38, chord: [50, 54, 57] },
      { root: 38, chord: [50, 54, 57] },
      { root: 35, chord: [47, 50, 54] },
      { root: 35, chord: [47, 50, 54] },
      { root: 37, chord: [49, 52, 56] },
      { root: 37, chord: [49, 52, 56] },
    ],
    leadEvents: [
      { bar: 4, step: 0, note: 78, len: 1.2 },
      { bar: 5, step: 8, note: 81, len: 1.2 },
      { bar: 6, step: 4, note: 85, len: 1.4 },
      { bar: 7, step: 10, note: 78, len: 1.2 },
    ],
  },
  grassland_wind: {
    id: 'grassland_wind',
    name: 'GRASSLAND WIND',
    bpm: 104,
    bars: 8,
    drums: true,
    lead: true,
    gain: 0.85,
    barsData: [
      { root: 31, chord: [43, 47, 50] },
      { root: 31, chord: [43, 47, 50] },
      { root: 36, chord: [48, 52, 55] },
      { root: 36, chord: [48, 52, 55] },
      { root: 38, chord: [50, 54, 57] },
      { root: 38, chord: [50, 54, 57] },
      { root: 33, chord: [45, 49, 52] },
      { root: 33, chord: [45, 49, 52] },
    ],
    leadEvents: [
      { bar: 4, step: 0, note: 79, len: 0.5 },
      { bar: 5, step: 4, note: 83, len: 0.5 },
      { bar: 6, step: 8, note: 86, len: 0.6 },
      { bar: 7, step: 12, note: 79, len: 0.5 },
    ],
  },
  rainy_night: {
    id: 'rainy_night',
    name: 'RAINY NIGHT',
    bpm: 84,
    bars: 8,
    drums: true,
    lead: true,
    gain: 0.8,
    barsData: [
      { root: 30, chord: [42, 45, 49] },
      { root: 30, chord: [42, 45, 49] },
      { root: 35, chord: [47, 50, 54] },
      { root: 35, chord: [47, 50, 54] },
      { root: 33, chord: [45, 48, 52] },
      { root: 33, chord: [45, 48, 52] },
      { root: 37, chord: [49, 52, 56] },
      { root: 37, chord: [49, 52, 56] },
    ],
    leadEvents: [
      { bar: 4, step: 0, note: 73, len: 0.8 },
      { bar: 5, step: 8, note: 78, len: 0.6 },
      { bar: 6, step: 2, note: 76, len: 0.8 },
      { bar: 7, step: 10, note: 73, len: 0.7 },
    ],
  },
  neon_city: {
    id: 'neon_city',
    name: 'NEON CITY',
    bpm: 124,
    bars: 8,
    drums: true,
    lead: true,
    gain: 0.9,
    barsData: [
      { root: 33, chord: [57, 60, 64] },
      { root: 33, chord: [57, 60, 64] },
      { root: 29, chord: [53, 57, 60] },
      { root: 29, chord: [53, 57, 60] },
      { root: 36, chord: [48, 52, 55] },
      { root: 36, chord: [48, 52, 55] },
      { root: 31, chord: [55, 59, 62] },
      { root: 31, chord: [55, 59, 62] },
    ],
    leadEvents: [
      { bar: 4, step: 0, note: 76, len: 0.5 },
      { bar: 4, step: 6, note: 72, len: 0.3 },
      { bar: 4, step: 12, note: 79, len: 0.3 },
      { bar: 5, step: 2, note: 74, len: 0.4 },
      { bar: 5, step: 8, note: 76, len: 0.35 },
      { bar: 5, step: 14, note: 72, len: 0.3 },
      { bar: 6, step: 0, note: 79, len: 0.6 },
      { bar: 6, step: 10, note: 76, len: 0.3 },
      { bar: 7, step: 4, note: 74, len: 0.4 },
      { bar: 7, step: 8, note: 72, len: 0.4 },
      { bar: 7, step: 12, note: 69, len: 0.5 },
    ],
  },
};

export function validateTrack(track) {
  const errors = [];
  if (!track || typeof track !== 'object') return ['track is not an object'];
  if (!(track.bpm >= 60 && track.bpm <= 140)) errors.push('bpm out of range');
  if (track.bars !== 8) errors.push('bars must be 8');
  if (!Array.isArray(track.barsData) || track.barsData.length !== 8) errors.push('barsData must have 8 bars');
  else {
    for (const bar of track.barsData) {
      if (!Number.isInteger(bar.root)) errors.push('bar root must be an integer midi note');
      if (!Array.isArray(bar.chord) || bar.chord.length !== 3) errors.push('bar chord must have 3 notes');
    }
  }
  if (!Array.isArray(track.leadEvents)) errors.push('leadEvents must be an array');
  else {
    for (const ev of track.leadEvents) {
      if (ev.bar < 0 || ev.bar > 7) errors.push('lead bar out of range');
      if (ev.step < 0 || ev.step > 15) errors.push('lead step out of range');
      if (!Number.isInteger(ev.note) || ev.note < 24 || ev.note > 96) {
        errors.push('lead note out of playable range: ' + ev.note);
      }
    }
  }
  return errors;
}
