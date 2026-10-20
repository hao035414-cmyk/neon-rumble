/**
 * Procedural BGM engine. Tracks are synthesized at runtime; no audio files.
 * One AudioContext shared with the SFX layer.
 */

import { TRACKS } from './audio-tracks.js';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.harmony = null;
    this.delaySend = null;
    this.noiseBuffer = null;
    this.track = null;
    this.playing = false;
    this.muted = false;
    this.volume = 0.32;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.9;
    this.musicBus.connect(this.master);

    this.harmony = this.ctx.createGain();
    this.harmony.gain.value = 1;
    this.harmony.connect(this.musicBus);

    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = 0.36;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.3;
    delay.connect(feedback);
    feedback.connect(delay);
    this.delaySend = this.ctx.createGain();
    this.delaySend.gain.value = 0.22;
    this.delaySend.connect(delay);
    delay.connect(this.musicBus);

    this.noiseBuffer = this.createNoise();
    return this.ctx;
  }

  createNoise() {
    const len = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : this.volume, now, 0.03);
  }

  playTrack(id, fade = 0.4) {
    const track = TRACKS[id];
    if (!track) return;
    this.ensure();
    if (!this.ctx) return;
    if (this.track === track && this.playing) return;

    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : this.volume, now + fade);

    this.track = track;
    this.step = 0;
    this.nextTime = now + 0.06;
    this.playing = true;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  stop(fade = 0.4) {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.0001, now + fade);
  }

  tick() {
    if (!this.playing || !this.track) return;
    const now = this.ctx.currentTime;
    while (this.nextTime < now + SCHEDULE_AHEAD) {
      const step = this.step % 16;
      const bar = Math.floor(this.step / 16) % this.track.bars;
      this.scheduleStep(this.track, bar, step, this.nextTime);
      this.step += 1;
      this.nextTime += 60 / this.track.bpm / 4;
    }
  }

  scheduleStep(track, barIndex, s, t) {
    const bar = track.barsData[barIndex];
    const beat = 60 / track.bpm;
    const chord = [bar.chord[0], bar.chord[1], bar.chord[2], bar.chord[0] + 12];

    if (track.drums) {
      if (s % 4 === 0 || s === 14) this.kick(t);
      if (s === 4 || s === 12) this.snare(t, false);
      if (s === 15 && barIndex % 2 === 1) this.snare(t, true);
      this.hat(t, s === 14);
      if (barIndex === 0 && s === 0) this.crash(t);
      if (barIndex === 6 && s === 0) this.riser(t, beat * 4);
    }

    if (s % 2 === 0) {
      const octave = (s === 6 || s === 12) ? 12 : 0;
      this.bass(t, bar.root + octave, beat * 0.42);
    }

    const shape = [0, 1, 2, 3, 2, 1, 2, 3, 0, 2, 1, 2, 3, 2, 1, 0];
    this.arp(t, chord[shape[s] % 4], beat * 0.22, false);
    if (s % 4 === 2) this.arp(t, chord[shape[s] % 4], beat * 0.18, true);

    if (s === 0) this.pad(t, bar.chord, beat * 4);

    if (track.lead) {
      for (const ev of track.leadEvents) {
        if (ev.bar === barIndex && ev.step === s) this.lead(t, ev.note, beat * ev.len);
      }
    }
  }

  kick(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(this.musicBus);
    osc.start(t);
    osc.stop(t + 0.24);

    this.harmony.gain.cancelScheduledValues(t);
    this.harmony.gain.setValueAtTime(0.45, t);
    this.harmony.gain.linearRampToValueAtTime(1, t + 0.18);
  }

  snare(t, ghost) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(ghost ? 0.12 : 0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (ghost ? 0.06 : 0.15));
    src.connect(bp).connect(gain).connect(this.musicBus);
    src.start(t, Math.random() * 1.5, 0.16);

    const body = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(200, t);
    bodyGain.gain.setValueAtTime(ghost ? 0.06 : 0.22, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    body.connect(bodyGain).connect(this.musicBus);
    body.start(t);
    body.stop(t + 0.1);
  }

  hat(t, open) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7200;
    const gain = this.ctx.createGain();
    const dur = open ? 0.11 : 0.028;
    gain.gain.setValueAtTime(open ? 0.13 : 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(gain).connect(this.musicBus);
    src.start(t, Math.random() * 1.5, dur + 0.02);
  }

  crash(t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(hp).connect(gain).connect(this.musicBus);
    src.start(t, 0, 1);
  }

  riser(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(320, t);
    bp.frequency.exponentialRampToValueAtTime(6800, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.14, t + dur * 0.85);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(gain).connect(this.musicBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  bass(t, midi, dur) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(240, t + dur);
    this.envelope(gain, t, 0.006, dur * 0.5, 0.3, 0.3);
    osc.connect(filter).connect(gain).connect(this.harmony);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  pad(t, notes, dur) {
    for (const note of notes) {
      for (const detune of [-7, 7]) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
        osc.detune.value = detune;
        filter.type = 'lowpass';
        filter.frequency.value = 1300;
        filter.Q.value = 0.7;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 0.3);
        gain.gain.setValueAtTime(0.04, t + dur - 0.3);
        gain.gain.linearRampToValueAtTime(0.0001, t + dur);
        osc.connect(filter).connect(gain).connect(this.harmony);
        osc.start(t);
        osc.stop(t + dur + 0.04);
      }
    }
  }

  arp(t, midi, dur, octave) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 440 * Math.pow(2, (midi + (octave ? 12 : 0) - 69) / 12);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4200, t);
    filter.frequency.exponentialRampToValueAtTime(1600, t + dur);
    this.envelope(gain, t, 0.003, dur * 0.55, octave ? 0.06 : 0.1, 0.2);
    osc.connect(filter).connect(gain);
    gain.connect(this.harmony);
    gain.connect(this.delaySend);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  lead(t, midi, dur) {
    for (const detune of [-8, 8]) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      osc.detune.value = detune;
      filter.type = 'lowpass';
      filter.frequency.value = 3000;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(filter).connect(gain);
      gain.connect(this.harmony);
      gain.connect(this.delaySend);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }
  }

  envelope(gain, t, attack, decay, peak, sustain) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), t + attack + decay);
  }
}
