/**
 * Stage definitions. Every stage is cosmetic: same ground, walls and pushbox.
 */

export const STAGES = [
  {
    id: 'neon_city',
    name: '霓虹街道',
    subtitle: 'NEON CITY',
    kind: 'city',
    music: 'neon_city',
    palette: {
      skyTop: '#070417',
      skyBottom: '#2a0f3f',
      far: '#17112e',
      mid: '#0e0a1d',
      ground: '#1a0d22',
      accent: '#ff4fa3',
      accent2: '#38e8ff',
      sun: '#ffd166',
    },
  },
  {
    id: 'desert_dusk',
    name: '荒漠落日',
    subtitle: 'DESERT DUSK',
    kind: 'desert',
    music: 'desert_dusk',
    palette: {
      skyTop: '#2a1020',
      skyBottom: '#d9713a',
      far: '#8a3b2a',
      mid: '#5b2418',
      ground: '#3a1610',
      accent: '#ffb45c',
      accent2: '#ff6b3d',
      sun: '#ffe29a',
    },
  },
  {
    id: 'snow_peak',
    name: '雪山之巅',
    subtitle: 'SNOW PEAK',
    kind: 'snow',
    music: 'snow_peak',
    palette: {
      skyTop: '#0a1230',
      skyBottom: '#3d6ea8',
      far: '#9fc4e8',
      mid: '#5d7fa8',
      ground: '#dfeaf6',
      accent: '#a8e6ff',
      accent2: '#e8f7ff',
      sun: '#dff3ff',
    },
  },
  {
    id: 'grassland_wind',
    name: '草原长风',
    subtitle: 'GRASSLAND WIND',
    kind: 'grass',
    music: 'grassland_wind',
    palette: {
      skyTop: '#123049',
      skyBottom: '#7fc6d9',
      far: '#3f7a5c',
      mid: '#2a5b41',
      ground: '#1f4030',
      accent: '#b7ff8a',
      accent2: '#ffe066',
      sun: '#fff3c4',
    },
  },
  {
    id: 'rainy_night',
    name: '雨夜街头',
    subtitle: 'RAINY NIGHT',
    kind: 'rain',
    music: 'rainy_night',
    palette: {
      skyTop: '#050a18',
      skyBottom: '#14243f',
      far: '#1b2b4a',
      mid: '#0d1626',
      ground: '#0a1220',
      accent: '#5f8dff',
      accent2: '#ff5f9e',
      sun: '#8fb6ff',
    },
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((stage) => [stage.id, stage]));

export function validateStages(tracks) {
  const errors = [];
  if (STAGES.length !== 5) errors.push('expected 5 stages');
  const ids = new Set();
  for (const stage of STAGES) {
    if (ids.has(stage.id)) errors.push('duplicate stage id: ' + stage.id);
    ids.add(stage.id);
    if (!tracks[stage.music]) errors.push('missing BGM track for ' + stage.id + ': ' + stage.music);
    if (!stage.palette || !stage.palette.ground) errors.push('stage palette incomplete: ' + stage.id);
  }
  return errors;
}
