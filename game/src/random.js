// A small seeded generator (mulberry32) and the helpers the city builder,
// traffic and pedestrians draw from. Nothing in the game rolls an unseeded
// die: the same ?seed= rebuilds the same city, the same traffic and the
// same staged screenshots, run after run.
export function createSeededRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A uniform float in [min, max).
export function range(random, min, max) {
  return min + random() * (max - min);
}

// An integer in [min, max], inclusive.
export function intIn(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

// One element of a list, uniformly.
export function choice(random, list) {
  return list[Math.floor(random() * list.length)];
}

// True with the given probability, from the seeded stream.
export function chance(random, p) {
  return random() < p;
}

// Fisher-Yates shuffle, driven by the seeded stream.
export function shuffle(random, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
