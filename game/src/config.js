// Solmar Bay — tuning, districts, cars and the six story jobs.
// One file holds every number a designer would tweak, so the rest of the
// game reads like a script instead of a spreadsheet.

export const WORLD_HALF = 130;
export const ROAD_LINES = [-90, -60, -30, 0, 30, 60, 90];
export const ROAD_WIDTH = 10;

export const PLAYER_SPAWN = { x: 14, z: 14 };
export const PLAYER_WALK_SPEED = 4.2;
export const PLAYER_RUN_SPEED = 8.5;
export const PLAYER_HEALTH_MAX = 100;

export const DISTRICTS = [
  { name: 'Harbour', color: '#2ec4b6', glow: 0x2ec4b6 },
  { name: 'Neon Row', color: '#ff2e88', glow: 0xff2e88 },
  { name: 'North Market', color: '#ffb703', glow: 0xffb703 },
  { name: 'Marina Plaza', color: '#ff8c42', glow: 0xff8c42 },
];

// East edge is the harbour water, west edge is the neon strip, the far
// north is the market; everything else is the marina plaza heart.
export function districtAt(x, z) {
  if (x >= 55) return DISTRICTS[0];
  if (x <= -55) return DISTRICTS[1];
  if (z <= -55) return DISTRICTS[2];
  return DISTRICTS[3];
}

export const CAR_STYLES = {
  sedan: { topSpeed: 34, accel: 16, turn: 2.1, length: 4.4, width: 1.9, height: 1.15 },
  van: { topSpeed: 26, accel: 11, turn: 1.6, length: 5.2, width: 2.1, height: 1.9 },
  sports: { topSpeed: 46, accel: 24, turn: 2.7, length: 4.2, width: 2.0, height: 0.95 },
};

export const PARKED_SPOTS = [
  { x: 10, z: 20, style: 'sedan', color: 0xc0392b },
  { x: 4, z: 20, style: 'sports', color: 0xf1c40f },
  { x: -2, z: 20, style: 'van', color: 0x3498db },
  { x: -8, z: 20, style: 'sedan', color: 0x9b59b6 },
];

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 18;

// Six story jobs. Payouts climb; the whole arc pays $1,950.
export const MISSIONS = [
  {
    name: 'Pickup',
    giver: 'Rico',
    payout: 150,
    intro: 'Rico needs a package lifted from Marina Plaza. No noise.',
    steps: [
      { text: 'Pick up Rico\u2019s package at Marina Plaza', x: -24, z: 28 },
    ],
  },
  {
    name: 'Getaway',
    giver: 'Rico',
    payout: 300,
    intro: 'The stash is hot. Grab it, then vanish into Neon Row.',
    wantedAtStart: 2,
    steps: [
      { text: 'Grab the stash at North Market', x: 58, z: -42 },
      { text: 'Lose the heat — reach the Neon Row garage', x: -72, z: -18 },
    ],
  },
  {
    name: 'Vault Run',
    giver: 'Dana',
    payout: 600,
    intro: 'Dana cracked the harbour vault. Carry the score north.',
    steps: [
      { text: 'Hit the harbour vault', x: 42, z: 58 },
      { text: 'Deliver the score to Dana up north', x: -28, z: -72 },
    ],
  },
  {
    name: 'Harbour Smuggle',
    giver: 'Captain Ilya',
    payout: 350,
    intro: 'Crates off the freighter, across town, before the tide turns.',
    timed: 100,
    steps: [
      { text: 'Collect the crates at the harbour dock', x: 96, z: 18 },
      { text: 'Deliver the crates before time runs out', x: -82, z: 62 },
    ],
  },
  {
    name: 'Neon Row Rescue',
    giver: 'Lena',
    payout: 250,
    intro: 'Lena is cornered in Neon Row. Get her to the safehouse.',
    steps: [
      { text: 'Reach Lena in Neon Row', x: -76, z: 12 },
      { text: 'Drive Lena to the North Market safehouse', x: 12, z: -78 },
    ],
  },
  {
    name: 'The Big Score',
    giver: 'Mara Voss',
    payout: 300,
    intro: 'One last job. Every crew, every cruiser, one clean getaway.',
    wantedOnComplete: 4,
    steps: [
      { text: 'Crack the Marina vault', x: 84, z: -56 },
      { text: 'Grab the getaway cash at the plaza', x: 2, z: 84 },
      { text: 'Reach the harbour boat and vanish', x: 104, z: -8 },
    ],
  },
];

export const PACKAGE_COUNT = 10;
export const PACKAGE_VALUE = 50;
export const TAXI_FARE = 80;

export const RADIO_STATIONS = [
  { name: 'SOLMAR FM — Synthwave', kind: 'synthwave' },
  { name: 'Harbour Chill 88.4', kind: 'chill' },
];
