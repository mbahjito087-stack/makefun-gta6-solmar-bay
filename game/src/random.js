// Seeded randomness for Solmar Bay. Every roll in the game comes from here,
// so the same seed always builds the same city, traffic and missions.
// No unseeded rolls anywhere in the game: determinism is a feature.

export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededRandom {
  constructor(seed) {
    if (typeof seed === 'string') seed = hashSeed(seed);
    this.seed = seed >>> 0;
    this.nextFn = mulberry32(this.seed);
  }
  next() {
    return this.nextFn();
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
  chance(p) {
    return this.next() < p;
  }
  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }
  // Deterministic shuffle (Fisher-Yates driven by this RNG).
  shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }
}
