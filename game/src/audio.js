// Procedural sound: no audio files, everything is an oscillator, so the game
// ships no asset and plays offline. Engine hum, siren, pickup chime, thud.
export function createAudio() {
  let ctx = null;
  let engine = null;
  let engineGain = null;
  let siren = null;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engine = ctx.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engine.connect(engineGain);
      engineGain.connect(ctx.destination);
      engine.start();
      return true;
    } catch {
      return false;
    }
  }

  function beep(freq, dur, type) {
    if (!ensure() || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  return {
    unlock() { ensure(); },
    engine(speed01) {
      if (!ensure() || !ctx) return;
      engineGain.gain.value = speed01 > 0.02 ? 0.04 + speed01 * 0.05 : 0;
      engine.frequency.value = 55 + speed01 * 140;
    },
    pickup() { beep(880, 0.18); setTimeout(() => beep(1320, 0.25), 120); },
    thud() { beep(90, 0.2, 'square'); },
    siren(on) {
      if (!ensure() || !ctx) return;
      if (on && !siren) {
        siren = ctx.createOscillator();
        siren.type = 'triangle';
        const g = ctx.createGain();
        g.gain.value = 0.03;
        siren.connect(g);
        g.connect(ctx.destination);
        siren.start();
        let up = true;
        siren._timer = setInterval(() => {
          siren.frequency.value = up ? 700 : 950;
          up = !up;
        }, 350);
      } else if (!on && siren) {
        clearInterval(siren._timer);
        try { siren.stop(); } catch { /* already stopped */ }
        siren = null;
      }
    },
  };
}
