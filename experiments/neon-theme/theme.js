// BGM prototype: "Neon City" — 124 BPM, A minor, 8-bar loop.
// Version 2: more drive — pumping sidechain, 16th arp, octave bass, riser + crash.
// Procedural WebAudio only; no samples, no files.

const TRACK = {
  bpm: 124,
  bars: 8,
  barsData: [
    { root: 33, chord: [57, 60, 64] }, // Am
    { root: 33, chord: [57, 60, 64] },
    { root: 29, chord: [53, 57, 60] }, // F
    { root: 29, chord: [53, 57, 60] },
    { root: 36, chord: [48, 52, 55] }, // C
    { root: 36, chord: [48, 52, 55] },
    { root: 31, chord: [55, 59, 62] }, // G
    { root: 31, chord: [55, 59, 62] },
  ],
  lead: [
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
};

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const STEP = 60 / TRACK.bpm / 4; // 16th note

let ctx = null;
let master = null;
let music = null;
let harmony = null;
let analyser = null;
let noiseBuffer = null;
let delaySend = null;
let vol = 0.7;
let playing = false;
let timer = null;
let step = 0;
let nextTime = 0;
let startedAt = 0;
const DURATION = 30;

function createNoise() {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function makeGraph() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = vol;
  master.connect(ctx.destination);

  music = ctx.createGain();
  music.gain.value = 0.9;
  music.connect(master);

  harmony = ctx.createGain();
  harmony.gain.value = 1;
  harmony.connect(music);

  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  music.connect(analyser);

  const delay = ctx.createDelay(1);
  delay.delayTime.value = (60 / TRACK.bpm) * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  delay.connect(feedback);
  feedback.connect(delay);
  delaySend = ctx.createGain();
  delaySend.gain.value = 0.22;
  delaySend.connect(delay);
  delay.connect(music);

  noiseBuffer = createNoise();
  startNoiseBed();
}

function startNoiseBed() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 480;
  const gain = ctx.createGain();
  gain.gain.value = 0.016;
  src.connect(filter).connect(gain).connect(music);
  src.start();
}

function envelope(gain, t, attack, decay, peak, sustain) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), t + attack + decay);
}

function kick(t) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(44, t + 0.12);
  gain.gain.setValueAtTime(1, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(gain).connect(music);
  osc.start(t);
  osc.stop(t + 0.24);

  // Sidechain pump: duck the harmony bus on every kick.
  harmony.gain.cancelScheduledValues(t);
  harmony.gain.setValueAtTime(0.45, t);
  harmony.gain.linearRampToValueAtTime(1, t + 0.18);
}

function snare(t, ghost) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1900;
  bp.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(ghost ? 0.14 : 0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (ghost ? 0.06 : 0.15));
  src.connect(bp).connect(gain).connect(music);
  src.start(t, Math.random() * 1.5, 0.16);

  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'triangle';
  body.frequency.setValueAtTime(200, t);
  bodyGain.gain.setValueAtTime(ghost ? 0.08 : 0.28, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  body.connect(bodyGain).connect(music);
  body.start(t);
  body.stop(t + 0.1);
}

function hat(t, open) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7200;
  const gain = ctx.createGain();
  const dur = open ? 0.11 : 0.028;
  gain.gain.setValueAtTime(open ? 0.16 : 0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(hp).connect(gain).connect(music);
  src.start(t, Math.random() * 1.5, dur + 0.02);
}

function crash(t) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 4200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  src.connect(hp).connect(gain).connect(music);
  src.start(t, 0, 1);
}

function riser(t, dur) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(320, t);
  bp.frequency.exponentialRampToValueAtTime(6800, t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.16, t + dur * 0.85);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(gain).connect(music);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function bass(t, midi, dur) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = midiToHz(midi);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, t);
  filter.frequency.exponentialRampToValueAtTime(240, t + dur);
  envelope(gain, t, 0.006, dur * 0.5, 0.32, 0.3);
  osc.connect(filter).connect(gain).connect(harmony);
  osc.start(t);
  osc.stop(t + dur + 0.04);
}

function pad(t, chord, dur) {
  for (const note of chord) {
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = midiToHz(note);
      osc.detune.value = detune;
      filter.type = 'lowpass';
      filter.frequency.value = 1300;
      filter.Q.value = 0.7;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.042, t + 0.3);
      gain.gain.setValueAtTime(0.042, t + dur - 0.3);
      gain.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.connect(filter).connect(gain).connect(harmony);
      osc.start(t);
      osc.stop(t + dur + 0.04);
    }
  }
}

function arp(t, midi, dur, octave) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = midiToHz(midi + (octave ? 12 : 0));
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(4200, t);
  filter.frequency.exponentialRampToValueAtTime(1600, t + dur);
  envelope(gain, t, 0.003, dur * 0.55, octave ? 0.07 : 0.11, 0.2);
  osc.connect(filter).connect(gain);
  gain.connect(harmony);
  gain.connect(delaySend);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function lead(t, midi, dur) {
  for (const detune of [-8, 8]) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = midiToHz(midi);
    osc.detune.value = detune;
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.075, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter).connect(gain);
    gain.connect(harmony);
    gain.connect(delaySend);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }
}

function scheduleStep(barIndex, s, t) {
  const bar = TRACK.barsData[barIndex];
  const beat = 60 / TRACK.bpm;

  // Drums: four on the floor with a syncopated push.
  if (s % 4 === 0 || s === 14) kick(t);
  if (s === 4 || s === 12) snare(t, false);
  if (s === 15 && barIndex % 2 === 1) snare(t, true);
  hat(t, s === 14);
  if (barIndex === 0 && s === 0) crash(t);
  if (barIndex === 6 && s === 0) riser(t, beat * 4);

  // Octave-driving eighth-note bass.
  if (s % 2 === 0) {
    const octave = (s === 6 || s === 12) ? 12 : 0;
    bass(t, bar.root + octave, beat * 0.42);
  }

  // Two 16th arpeggio layers: chord tones and a quiet octave sparkle.
  const shape = [0, 1, 2, 3, 2, 1, 2, 3, 0, 2, 1, 2, 3, 2, 1, 0];
  const chord = [bar.chord[0], bar.chord[1], bar.chord[2], bar.chord[0] + 12];
  arp(t, chord[shape[s] % 4], beat * 0.22, false);
  if (s % 4 === 2) arp(t, chord[shape[s] % 4], beat * 0.18, true);

  if (s === 0) pad(t, bar.chord, beat * 4);

  for (const ev of TRACK.lead) {
    if (ev.bar === barIndex && ev.step === s) lead(t, ev.note, beat * ev.len);
  }
}

function tick() {
  if (!playing) return;
  const now = ctx.currentTime;
  if (now - startedAt >= DURATION) {
    stop(true);
    return;
  }
  while (nextTime < now + 0.12) {
    const s = step % 16;
    const barIndex = Math.floor(step / 16) % TRACK.bars;
    scheduleStep(barIndex, s, nextTime);
    step += 1;
    nextTime += STEP;
  }
  updateClock();
}

function start() {
  if (!ctx) makeGraph();
  if (ctx.state === 'suspended') ctx.resume();
  playing = true;
  step = 0;
  startedAt = ctx.currentTime;
  nextTime = ctx.currentTime + 0.08;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(vol, ctx.currentTime);
  clearInterval(timer);
  timer = setInterval(tick, 25);
  document.getElementById('play').disabled = true;
  document.getElementById('stop').disabled = false;
}

function stop(finished) {
  playing = false;
  clearInterval(timer);
  document.getElementById('play').disabled = false;
  document.getElementById('stop').disabled = true;
  if (!ctx) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0.0001, now + (finished ? 1.2 : 0.25));
  setTimeout(() => {
    if (!playing) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(vol, ctx.currentTime);
    }
  }, finished ? 1400 : 400);
  if (finished) updateClock(0);
}

function updateClock(override) {
  const el = document.getElementById('clock');
  const t = override !== undefined ? override : Math.min(DURATION, Math.max(0, ctx.currentTime - startedAt));
  el.textContent = t.toFixed(1).padStart(4, '0') + ' / ' + DURATION.toFixed(1);
}

function drawViz() {
  const canvas = document.getElementById('viz');
  const g = canvas.getContext('2d');
  requestAnimationFrame(drawViz);
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  g.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width / data.length;
  for (let i = 0; i < data.length; i += 1) {
    const h = (data[i] / 255) * canvas.height;
    const hue = 300 - (i / data.length) * 140;
    g.fillStyle = 'hsl(' + hue + ', 90%, 62%)';
    g.fillRect(i * w, canvas.height - h, w * 0.7, h);
  }
}

document.getElementById('play').addEventListener('click', start);
document.getElementById('stop').addEventListener('click', () => stop(false));
document.getElementById('vol').addEventListener('input', (event) => {
  vol = Number(event.target.value) / 100;
  if (master) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.02);
});

updateClock(0);
drawViz();
