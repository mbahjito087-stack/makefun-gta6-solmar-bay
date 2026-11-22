// Procedural sound only: no audio files, every sound is an oscillator, so
// the game ships no asset and plays offline. Engine hum, police siren,
// pickup chime and thud — plus a two-station procedural radio (R switches
// station), each station a looping step sequencer built from oscillators.
const NOTE = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// 16-step patterns. 0 means rest. Bass roots in MIDI, pads as chord roots.
const STATIONS = [
  {
    name: 'SOLMAR FM · Synthwave',
    bpm: 112,
    bass: [45, 0, 45, 0, 48, 0, 45, 0, 43, 0, 43, 0, 50, 0, 48, 0],
    lead: [69, 0, 72, 0, 76, 0, 74, 0, 72, 0, 69, 0, 67, 0, 64, 0],
    wave: 'sawtooth',
  },
  {
    name: 'HARBOUR 88 · Chill',
    bpm: 76,
    bass: [41, 0, 0, 0, 48, 0, 0, 0, 45, 0, 0, 0, 43, 0, 0, 0],
    lead: [65, 0, 0, 69, 0, 0, 72, 0, 0, 69, 0, 0, 67, 0, 0, 64],
    wave: 'sine',
  },
];

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenTimer = null;
  let radioTimer = null;
  let radioStep = 0;
  let radioIndex = 0;
  let radioOn = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when) {
    if (!ctx) return;
    const start = when ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol ?? 0.12, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  function radioTick() {
    if (!ctx || !radioOn) return;
    const station = STATIONS[radioIndex];
    const stepDur = 60 / station.bpm / 4;
    const now = ctx.currentTime + 0.05;
    const bass = station.bass[radioStep];
    const lead = station.lead[radioStep];
    if (bass) tone(NOTE(bass), stepDur * 0.9, station.wave, 0.07, now);
    if (lead) tone(NOTE(lead), stepDur * 1.8, 'triangle', 0.045, now);
    radioStep = (radioStep + 1) % 16;
  }

  function startRadio() {
    if (!ensure() || radioTimer) return;
    radioOn = true;
    radioStep = 0;
    const station = STATIONS[radioIndex];
    radioTimer = setInterval(radioTick, (60 / station.bpm / 4) * 1000);
  }

  function stopRadio() {
    radioOn = false;
    if (radioTimer) { clearInterval(radioTimer); radioTimer = null; }
  }

  return {
    unlock() { ensure(); },
    engine(speed01) {
      if (!ensure() || !ctx) return;
      engineGain.gain.value = speed01 > 0.02 ? 0.04 + speed01 * 0.05 : 0;
      engineOsc.frequency.value = 55 + speed01 * 140;
    },
    pickup() {
      tone(880, 0.18, 'sine', 0.15);
      setTimeout(() => tone(1320, 0.25, 'sine', 0.15), 120);
    },
    thud() { tone(90, 0.2, 'square', 0.18); },
    chime() {
      tone(660, 0.15, 'sine', 0.12);
      setTimeout(() => tone(990, 0.22, 'sine', 0.12), 100);
    },
    siren(on) {
      if (!ensure() || !ctx) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'triangle';
        const g = ctx.createGain();
        g.gain.value = 0.03;
        sirenOsc.connect(g);
        g.connect(ctx.destination);
        sirenOsc.start();
        let up = true;
        sirenTimer = setInterval(() => {
          sirenOsc.frequency.value = up ? 700 : 950;
          up = !up;
        }, 350);
      } else if (!on && sirenOsc) {
        clearInterval(sirenTimer);
        try { sirenOsc.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
      }
    },
    toggleRadio() {
      if (!radioOn) {
        startRadio();
      } else if (radioIndex === 0) {
        stopRadio();
        radioIndex = 1;
        startRadio();
      } else {
        stopRadio();
        radioIndex = 0;
      }
      return this.stationName();
    },
    stationName() {
      return radioOn ? STATIONS[radioIndex].name : 'Radio off';
    },
    radioPlaying() { return radioOn; },
  };
}
