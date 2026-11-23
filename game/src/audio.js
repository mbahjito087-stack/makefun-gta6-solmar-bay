// Procedural sound for Solmar Bay: engine, siren, chimes, thuds and two
// radio stations, all synthesized with WebAudio oscillators. No audio files.

import { SeededRandom } from './random.js';
import { RADIO_STATIONS } from './config.js';

const NOTE_FREQ = {
  A1: 55.0, C2: 65.41, D2: 73.42, E2: 82.41, G2: 98.0, A2: 110.0,
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, E5: 659.25, G5: 783.99,
};

// 16-step loops: [note, lengthInSteps]. Null steps rest.
const SYNTH_BASS = ['A1', 'A1', null, 'A1', 'C2', null, 'A1', null, 'E2', null, 'A1', null, 'G2', null, 'E2', null];
const SYNTH_ARP = ['A3', 'C4', 'E4', 'A4', 'G4', 'E4', 'C4', 'E4', 'A3', 'C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4'];
const CHILL_CHORDS = [
  ['C3', 'E3', 'G3'], ['A2', 'C3', 'E3'], ['F3', 'A3', 'C4'], ['G2', 'B2', 'D3'],
];

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.radioOn = false;
    this.stationIndex = 0;
    this.radioTimer = null;
    this.radioStep = 0;
    this.noiseSeed = new SeededRandom(99);
  }

  // Must be called from a user gesture; browsers block audio before that.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.buildEngine();
    this.buildSiren();
  }

  buildEngine() {
    const ctx = this.ctx;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 30;
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    this.engineOsc.connect(this.engineFilter);
    this.engineOsc2.connect(g2);
    g2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    this.engineOsc2.start();
  }

  buildSiren() {
    const ctx = this.ctx;
    this.sirenOsc = ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 720;
    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.value = 0.0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  setEngine(speedKmh, driving) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const target = driving ? 0.05 + Math.min(0.09, speedKmh / 2400) : 0.0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.1);
    const freq = 55 + speedKmh * 1.9;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(freq / 2, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(380 + speedKmh * 9, t, 0.1);
  }

  setSiren(on, gameTime) {
    if (!this.ctx) return;
    this.sirenOn = on;
    const t = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0.0, t, 0.15);
    if (on) {
      // Two-tone wail driven by the game clock, not the wall clock.
      const hi = Math.floor(gameTime * 1.6) % 2 === 0;
      this.sirenOsc.frequency.setTargetAtTime(hi ? 960 : 690, t, 0.05);
    }
  }

  blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  chime() {
    this.blip(523.25, 0.35, 'sine', 0.22, 0);
    this.blip(659.25, 0.35, 'sine', 0.22, 0.09);
    this.blip(783.99, 0.6, 'sine', 0.22, 0.18);
  }

  thud() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (this.noiseSeed.next() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  punchSound() {
    this.blip(140, 0.12, 'square', 0.2, 0);
  }

  stationName() {
    return this.radioOn ? RADIO_STATIONS[this.stationIndex].name : 'Radio off';
  }

  toggleRadio() {
    this.ensure();
    if (!this.ctx) return false;
    if (!this.radioOn) {
      this.radioOn = true;
      this.radioStep = 0;
      this.startRadioLoop();
    } else if (this.stationIndex === RADIO_STATIONS.length - 1) {
      this.radioOn = false;
      this.stopRadioLoop();
    } else {
      this.stationIndex++;
      this.radioStep = 0;
    }
    return this.radioOn;
  }

  startRadioLoop() {
    this.stopRadioLoop();
    this.radioTimer = window.setInterval(() => this.scheduleRadioStep(), 190);
  }

  stopRadioLoop() {
    if (this.radioTimer !== null) {
      window.clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
  }

  scheduleRadioStep() {
    if (!this.ctx || !this.radioOn) return;
    const station = RADIO_STATIONS[this.stationIndex];
    const step = this.radioStep % 16;
    if (station.kind === 'synthwave') {
      const bass = SYNTH_BASS[step];
      if (bass) this.blip(NOTE_FREQ[bass], 0.22, 'sawtooth', 0.1, 0);
      const arp = SYNTH_ARP[step];
      if (step % 2 === 0 && arp) this.blip(NOTE_FREQ[arp], 0.16, 'triangle', 0.06, 0);
      if (step === 0 || step === 8) this.blip(NOTE_FREQ.A2, 0.5, 'sine', 0.05, 0);
    } else {
      if (step % 4 === 0) {
        const chord = CHILL_CHORDS[Math.floor(step / 4) % CHILL_CHORDS.length];
        chord.forEach((n, i) => this.blip(NOTE_FREQ[n], 1.4, 'sine', 0.05, i * 0.02));
      }
      if (step % 8 === 4) this.blip(NOTE_FREQ.E4, 0.3, 'triangle', 0.04, 0);
    }
    this.radioStep++;
  }
}
