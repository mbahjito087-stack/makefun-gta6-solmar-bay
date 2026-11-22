// Solmar Bay: Mara Voss Returns — every tuning number lives in this file,
// so balancing the game is a single edit. The city is a 360 m square of
// streets split into four districts: Marina Plaza at the centre, North
// Market to the north, Neon Row to the east, and the Harbour beach along
// the south edge by the water.
export const WORLD_HALF = 180;
export const BLOCK_SIZE = 60;
export const ROAD_WIDTH = 14;

// Mara on foot.
export const WALK_SPEED = 7;
export const RUN_SPEED = 12;
export const PLAYER_MAX_HEALTH = 100;
export const ARMOUR_MAX = 50;
export const PUNCH_RANGE = 2.6;

// Cars come in three body styles, each with its own top speed and grip.
export const CAR_STYLES = {
  sedan: { topSpeed: 32, accel: 17, grip: 1.8 },
  van: { topSpeed: 26, accel: 12, grip: 1.4 },
  sports: { topSpeed: 40, accel: 22, grip: 2.4 },
};
export const CAR_BRAKE = 32;
export const CAR_REVERSE_MAX = 11;

// Population of the streets.
export const TRAFFIC_CARS = 16;
export const PEDESTRIANS = 22;
export const PARKED_CARS = 5;

// Wanted level, 0 to 5 stars. Stealing a car costs 2 stars, a punch or a
// ram costs 1. Stars fade one at a time once no cruiser has the player in
// sight for a while.
export const MAX_WANTED = 5;
export const WANTED_FADE_SECONDS = 20;
export const WANTED_SIGHT_RANGE = 70;
export const HELI_MIN_WANTED = 4;

// Six story jobs with escalating payouts: $1,950 earnable in all.
export const MISSION_REWARDS = [150, 250, 350, 300, 400, 500];
export const TIMED_JOB_SECONDS = 75;

// Pickups scattered around the city: green health crosses and blue armour.
export const PICKUP_RESPAWN_SECONDS = 45;
export const HEALTH_PICKUP_AMOUNT = 25;
export const ARMOUR_PICKUP_AMOUNT = 50;

// District names and their minimap tint, by quadrant.
export const DISTRICTS = [
  { name: 'Marina Plaza', color: '#e8b64c' },
  { name: 'North Market', color: '#7ec850' },
  { name: 'Neon Row', color: '#ff5fa2' },
  { name: 'Harbour', color: '#4fc3e8' },
];

export const BEST_KEY = 'solmar-bay-returns-best-cash';
export const SAVE_KEY = 'solmar-bay-returns-save-v1';
export const STEP = 1 / 60;
