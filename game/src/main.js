// Solmar Bay: Mara Voss Returns — boot, the fixed-step loop, input,
// walking and driving, stealing cars, the wanted level, police chases and
// the helicopter, combat, pickups, car damage, six story jobs, the camera,
// saving, and the staged screenshot scenes.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|win (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import * as THREE from 'three';
import {
  WORLD_HALF, STEP, WALK_SPEED, RUN_SPEED, CAR_STYLES, CAR_BRAKE,
  CAR_REVERSE_MAX, MAX_WANTED, WANTED_FADE_SECONDS, WANTED_SIGHT_RANGE,
  HELI_MIN_WANTED, PLAYER_MAX_HEALTH, ARMOUR_MAX, PUNCH_RANGE,
  PICKUP_RESPAWN_SECONDS, HEALTH_PICKUP_AMOUNT, ARMOUR_PICKUP_AMOUNT,
  BEST_KEY, SAVE_KEY,
} from './config.js';
import { createSeededRandom, range } from './random.js';
import { createCity, collideCircle, districtAt } from './city.js';
import {
  createTraffic, stepTraffic, createPolice, spawnPolice, placePolice,
  stepPolice, removePolice, createHelicopter, stepHelicopter,
} from './vehicles.js';
import { createPedestrians, stepPedestrians, makePlayerMesh } from './people.js';
import { MISSIONS, createMissions, missionTarget, updateMissions } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const random = createSeededRandom(seed);

// Golden-hour sky: a gradient dome, a low warm sun, pink haze.
function makeSkyDome() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2e4a7a');
  grad.addColorStop(0.45, '#e08a5a');
  grad.addColorStop(0.75, '#ff9e5e');
  grad.addColorStop(1, '#ffb27a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(800, 16, 12),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }),
  );
  return dome;
}

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.add(makeSkyDome());
scene.fog = new THREE.Fog(0xe8906a, 120, 480);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

const sun = new THREE.DirectionalLight(0xffb27a, 2.6);
sun.position.set(220, 70, 90);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xffc4a0, 0x6a5a4a, 1.1));

const city = createCity(random);
scene.add(city.group);
const traffic = createTraffic(random, scene, city.colliders, city.streets);
const peds = createPedestrians(random, scene);
const police = createPolice(scene);
const heli = createHelicopter(scene);
const missions = createMissions(scene);
const audio = createAudio();
const hud = createHud();

const player = {
  mesh: makePlayerMesh(),
  x: 14, z: 14, angle: 0,
};
scene.add(player.mesh);

// Health and armour pickups, placed from the seeded stream.
const pickups = [];
function makePickupMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'health') {
    const mat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
    const a = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.45), mat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.4, 0.45), mat);
    g.add(a, b);
  } else {
    const mat = new THREE.MeshBasicMaterial({ color: 0x4fc3e8 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.4), mat);
    g.add(box);
  }
  g.position.y = 1.2;
  return g;
}
for (let i = 0; i < 4; i++) {
  const mesh = makePickupMesh('health');
  const x = range(random, -150, 150);
  const z = range(random, -150, 150);
  mesh.position.set(x, 1.2, z);
  scene.add(mesh);
  pickups.push({ mesh, kind: 'health', x, z, taken: 0 });
}
for (let i = 0; i < 2; i++) {
  const mesh = makePickupMesh('armour');
  const x = range(random, -150, 150);
  const z = range(random, -150, 150);
  mesh.position.set(x, 1.2, z);
  scene.add(mesh);
  pickups.push({ mesh, kind: 'armour', x, z, taken: 0 });
}

// Smoke puffs for a battered car: a small reusable pool.
const smokePool = [];
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0x777777, transparent: true, opacity: 0 }),
  );
  m.visible = false;
  scene.add(m);
  smokePool.push({ mesh: m, life: 0 });
}
let smokeTimer = 0;
function spawnSmoke(x, z) {
  const p = smokePool.find((s) => s.life <= 0);
  if (!p) return;
  p.life = 1.2;
  p.mesh.visible = true;
  p.mesh.position.set(x, 1.5, z);
}
function stepSmoke(dt) {
  for (const p of smokePool) {
    if (p.life <= 0) continue;
    p.life -= dt;
    p.mesh.position.y += dt * 2.2;
    p.mesh.material.opacity = Math.max(0, p.life / 1.2) * 0.55;
    const s = 1 + (1.2 - p.life) * 1.4;
    p.mesh.scale.set(s, s, s);
    if (p.life <= 0) p.mesh.visible = false;
  }
}

const state = {
  screen: 'title',
  cash: 0,
  health: PLAYER_MAX_HEALTH,
  armour: 0,
  wanted: 0,
  wantedTimer: 0,
  inCar: false,
  car: null,
  carSpeed: 0,
  carAngle: 0,
  carHealth: 100,
  camAngle: Math.PI * 0.75,
  camDist: 16,
  best: 0,
  ramCooldown: 0,
  punchCooldown: 0,
  roadblockSet: false,
  clock: 0,
};
try { state.best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { /* storage off */ }
try {
  const save = JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? 'null');
  if (save) { state.cash = save.cash || 0; }
} catch { /* no save */ }

const keys = new Set();
let dragX = null;
let prevR = false;
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  audio.unlock();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
canvas.addEventListener('mousedown', (e) => { dragX = e.clientX; audio.unlock(); });
window.addEventListener('mousemove', (e) => {
  if (dragX === null) return;
  state.camAngle -= (e.clientX - dragX) * 0.005;
  dragX = e.clientX;
});
window.addEventListener('mouseup', () => { dragX = null; });
canvas.addEventListener('wheel', (e) => {
  state.camDist = Math.max(9, Math.min(30, state.camDist + e.deltaY * 0.01));
}, { passive: true });
// The title overlay covers the canvas, so it (and the canvas) must both
// accept the click that starts the game.
function tryStart() {
  audio.unlock();
  if (state.screen === 'title' || state.screen === 'over' || state.screen === 'win' || state.screen === 'busted') startGame();
}
canvas.addEventListener('click', tryStart);
document.getElementById('screen').addEventListener('click', tryStart);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function setScreen(name, message) {
  state.screen = name;
  const el = document.getElementById('screen');
  const title = document.getElementById('screen-title');
  const text = document.getElementById('screen-text');
  if (name === 'play') { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  title.textContent = name === 'title'
    ? 'SOLMAR BAY'
    : name === 'paused' ? 'PAUSED'
    : name === 'win' ? 'CLEAN GETAWAY!'
    : name === 'busted' ? 'BUSTED'
    : 'WASTED';
  text.textContent = message || '';
}

function startGame() {
  state.screen = 'play';
  state.cash = 0;
  state.health = PLAYER_MAX_HEALTH;
  state.armour = 0;
  state.wanted = 0;
  state.inCar = false;
  state.car = null;
  state.carSpeed = 0;
  state.carHealth = 100;
  state.roadblockSet = false;
  player.x = 14;
  player.z = 14;
  player.angle = 0;
  missions.index = 0;
  missions.done = false;
  missions.earned = 0;
  missions.timer = 0;
  missions.beacon.visible = true;
  heli.active = false;
  removePolice(police);
  for (const pk of pickups) { pk.taken = 0; pk.mesh.visible = true; }
  setScreen('play');
  hud.showBanner(`${MISSIONS[0].name} — ${MISSIONS[0].brief}`);
}

function saveGame() {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.max(state.best, state.cash)));
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: state.cash, mission: missions.index }));
  } catch { /* storage off */ }
}

function raiseWanted(n) {
  state.wanted = Math.min(MAX_WANTED, state.wanted + n);
  state.wantedTimer = 0;
  audio.siren(state.wanted > 0);
}

function hurt(amount) {
  // Armour soaks damage first.
  const soaked = Math.min(state.armour, amount);
  state.armour -= soaked;
  state.health -= (amount - soaked);
  hud.flashDamage();
}

function nearestCar(maxD) {
  let bestCar = null;
  let bestD = maxD;
  for (const c of traffic.parked) {
    if (c.stolen || c.health <= 0) continue;
    const d = Math.hypot(c.x - player.x, c.z - player.z);
    if (d < bestD) { bestD = d; bestCar = c; }
  }
  return bestCar;
}

function enterCar(car) {
  car.stolen = true;
  state.inCar = true;
  state.car = car;
  state.carSpeed = 0;
  state.carHealth = car.health;
  state.carAngle = Math.atan2(player.x - car.x, player.z - car.z);
  player.mesh.visible = false;
  raiseWanted(2);
  hud.showBanner(`Stole the ${car.model}. The police noticed.`);
}

function exitCar() {
  const car = state.car;
  player.x = car.x + Math.sin(state.carAngle + Math.PI / 2) * 3;
  player.z = car.z + Math.cos(state.carAngle + Math.PI / 2) * 3;
  player.mesh.visible = true;
  state.inCar = false;
  state.car = null;
  state.carSpeed = 0;
}

let prevE = false;

function stepPlayer(dt, eEdge) {
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = run ? RUN_SPEED : WALK_SPEED;
  let mx = 0;
  let mz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) mz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) mz += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  if (mx || mz) {
    const len = Math.hypot(mx, mz);
    const ca = Math.cos(state.camAngle);
    const sa = Math.sin(state.camAngle);
    const wx = ((mx * ca - mz * sa) / len) * speed * dt;
    const wz = ((mx * sa + mz * ca) / len) * speed * dt;
    player.x += wx;
    player.z += wz;
    player.angle = Math.atan2(wx, wz);
    collideCircle(city.colliders, player, 0.8);
  }
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.angle;
  // Punch: F knocks the nearest pedestrian down and scares the crowd.
  state.punchCooldown -= dt;
  if (keys.has('KeyF') && state.punchCooldown <= 0) {
    state.punchCooldown = 0.5;
    for (const p of peds) {
      if (p.down <= 0 && Math.hypot(p.x - player.x, p.z - player.z) < PUNCH_RANGE) {
        p.down = 4;
        raiseWanted(1);
        audio.thud();
        break;
      }
    }
  }
  // Enter a parked car with E, on the keydown edge only, so holding E
  // cannot enter and exit on consecutive frames.
  if (eEdge) {
    const car = nearestCar(5);
    if (car) enterCar(car);
  }
}

function stepCar(dt, eEdge) {
  const car = state.car;
  const style = CAR_STYLES[car.style] || CAR_STYLES.sedan;
  const forward = keys.has('KeyW') || keys.has('ArrowUp');
  const back = keys.has('KeyS') || keys.has('ArrowDown');
  if (forward) state.carSpeed += style.accel * dt;
  else if (back) state.carSpeed -= CAR_BRAKE * dt;
  else state.carSpeed *= (1 - 0.8 * dt);
  state.carSpeed = Math.max(-CAR_REVERSE_MAX, Math.min(style.topSpeed, state.carSpeed));
  const steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
    - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
  state.carAngle += steer * style.grip * dt * Math.sign(state.carSpeed || 1)
    * Math.min(1, Math.abs(state.carSpeed) / 8);
  const beforeX = car.x;
  const beforeZ = car.z;
  car.x += Math.sin(state.carAngle) * state.carSpeed * dt;
  car.z += Math.cos(state.carAngle) * state.carSpeed * dt;
  collideCircle(city.colliders, car, 2.2);
  // A hard scrape against a building dents the car.
  const pushed = Math.hypot(car.x - beforeX, car.z - beforeZ);
  const travelled = Math.abs(state.carSpeed) * dt;
  if (travelled - pushed > 0.25 && Math.abs(state.carSpeed) > 10) {
    state.carHealth -= 10;
    car.health = state.carHealth;
    state.carSpeed *= 0.55;
    audio.thud();
    hud.flashDamage();
  }
  car.x = Math.max(-WORLD_HALF + 2, Math.min(WORLD_HALF - 2, car.x));
  car.z = Math.max(-WORLD_HALF + 2, Math.min(WORLD_HALF - 2, car.z));
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = state.carAngle;
  player.x = car.x;
  player.z = car.z;
  // Ramming pedestrians raises the heat and dents the car.
  for (const p of peds) {
    if (p.down <= 0 && Math.hypot(p.x - car.x, p.z - car.z) < 2.5 && Math.abs(state.carSpeed) > 6) {
      p.down = 5;
      raiseWanted(1);
      audio.thud();
      state.carSpeed *= 0.7;
      state.carHealth -= 6;
      car.health = state.carHealth;
    }
  }
  // A battered car smokes.
  smokeTimer -= dt;
  if (state.carHealth < 45 && state.carHealth > 0 && smokeTimer <= 0) {
    smokeTimer = 0.15;
    spawnSmoke(car.x, car.z);
  }
  if (state.carHealth <= 0) {
    hud.showBanner('Your car is wrecked! Bail out and find another.');
    exitCar();
    return;
  }
  if (eEdge) exitCar();
  audio.engine(Math.abs(state.carSpeed) / style.topSpeed);
}

function stepPickups(dt) {
  for (const pk of pickups) {
    if (pk.taken > 0) {
      pk.taken -= dt;
      if (pk.taken <= 0) pk.mesh.visible = true;
      continue;
    }
    pk.mesh.rotation.y = state.clock * 1.5;
    if (Math.hypot(pk.x - player.x, pk.z - player.z) < 3) {
      pk.taken = PICKUP_RESPAWN_SECONDS;
      pk.mesh.visible = false;
      if (pk.kind === 'health') {
        state.health = Math.min(PLAYER_MAX_HEALTH, state.health + HEALTH_PICKUP_AMOUNT);
        hud.showBanner(`+${HEALTH_PICKUP_AMOUNT} health`);
      } else {
        state.armour = Math.min(ARMOUR_MAX, state.armour + ARMOUR_PICKUP_AMOUNT);
        hud.showBanner(`+${ARMOUR_PICKUP_AMOUNT} armour`);
      }
      audio.chime();
    }
  }
}

function step(dt) {
  if (state.screen !== 'play') return;
  state.clock += dt;
  const eEdge = keys.has('KeyE') && !prevE;
  prevE = keys.has('KeyE');
  const rDown = keys.has('KeyR');
  if (rDown && !prevR) hud.showBanner(`♪ ${audio.toggleRadio()}`);
  prevR = rDown;
  if (state.inCar) stepCar(dt, eEdge); else stepPlayer(dt, eEdge);
  stepTraffic(traffic.cars, dt);
  const threats = [];
  if (state.inCar && Math.abs(state.carSpeed) > 8) {
    threats.push({ x: state.car.x, z: state.car.z, r: 12 });
  }
  stepPedestrians(peds, dt, random, threats);
  stepPickups(dt);
  stepSmoke(dt);

  // Wanted: cruisers spawn, chase, ram — and at 4 stars the helicopter
  // joins. At 3 stars a roadblock waits ahead of the player once.
  if (state.wanted > 0) {
    spawnPolice(police, player.x, player.z, Math.min(3, state.wanted), random);
    if (state.wanted >= 3 && !state.roadblockSet) {
      state.roadblockSet = true;
      const ahead = {
        x: player.x + Math.sin(state.carAngle || player.angle) * 45,
        z: player.z + Math.cos(state.carAngle || player.angle) * 45,
      };
      placePolice(police, ahead.x, ahead.z);
      hud.showBanner('Roadblock ahead!');
    }
    const hit = stepPolice(police, player, dt, city.colliders, state.clock, !state.inCar, state.wanted);
    state.ramCooldown -= dt;
    if (hit === 'bust') {
      audio.siren(false);
      setScreen('busted', `The Solmar police caught Mara on foot with $${state.cash} earned. Click to try again.`);
      return;
    }
    if (hit === 'ram' && state.ramCooldown <= 0) {
      state.ramCooldown = 1;
      if (state.inCar) {
        state.carHealth -= 12;
        if (state.car) state.car.health = state.carHealth;
        hud.showBanner('The police rammed your car!');
      } else {
        hurt(20);
        hud.showBanner('The police rammed you!');
      }
      audio.thud();
    }
    state.wantedTimer += dt;
    const nearestCop = police.list.reduce(
      (m, p) => Math.min(m, Math.hypot(p.mesh.position.x - player.x, p.mesh.position.z - player.z)), 999,
    );
    if (nearestCop > WANTED_SIGHT_RANGE && state.wantedTimer > WANTED_FADE_SECONDS) {
      state.wanted -= 1;
      state.wantedTimer = 0;
      state.roadblockSet = false;
      if (state.wanted === 0) { removePolice(police); audio.siren(false); }
    }
  }
  heli.active = state.wanted >= HELI_MIN_WANTED;
  stepHelicopter(heli, player, dt, state.clock);

  // Missions.
  const result = updateMissions(missions, player, state.wanted, dt);
  if (result) {
    if (result.failed) {
      hud.showBanner(`${result.name} failed — out of time. Try again.`);
      audio.thud();
    } else if (result.blocked) {
      if (missions.blockedNote > 3) {
        missions.blockedNote = 0;
        hud.showBanner('Lose the cops first — the hideout is hot while you are wanted!');
      }
    } else {
      state.cash += result.paid;
      hud.cashPopup(`+$${result.paid}`);
      audio.pickup();
      saveGame();
      if (result.finished) {
        state.best = Math.max(state.best, state.cash);
        saveGame();
        setScreen('win', `All six jobs done. You earned $${state.cash}. Best: $${state.best}. Click to play again.`);
        return;
      }
      hud.showBanner(`${result.next} — +$${result.paid}`);
      if (result.next === MISSIONS[5].name) {
        raiseWanted(3);
        hud.showBanner('The Big Score: the whole city is on you now!');
      }
    }
  }

  if (state.health <= 0) {
    audio.siren(false);
    setScreen('over', `Mara was taken down with $${state.cash} earned. Click to try again.`);
  }
  if (!state.inCar) audio.engine(0);
}

function updateCamera(dt) {
  const fx = player.x;
  const fz = player.z;
  const cx = fx - Math.sin(state.camAngle) * state.camDist;
  const cz = fz - Math.cos(state.camAngle) * state.camDist;
  camera.position.lerp(new THREE.Vector3(cx, 9 + state.camDist * 0.35, cz), 1 - Math.pow(0.001, dt));
  camera.lookAt(fx, 2, fz);
}

function drawFrame(clock) {
  const target = missionTarget(missions);
  const district = districtAt(player.x, player.z);
  const districtColor = { 'Marina Plaza': '#e8b64c', 'North Market': '#7ec850', 'Neon Row': '#ff5fa2', Harbour: '#4fc3e8' }[district];
  hud.update({
    cash: state.cash,
    health: state.health,
    armour: state.armour,
    wanted: state.wanted,
    district,
    districtColor,
    missionIndex: missions.index,
    missionDone: missions.done,
    missionName: missions.done ? 'All jobs done' : MISSIONS[missions.index].name,
    objective: missions.done ? 'Enjoy Solmar Bay' : `${target.label} — ${MISSIONS[missions.index].hint}`,
    distance: Math.hypot(player.x - target.x, player.z - target.z),
    timer: missions.timer,
    inCar: state.inCar,
    speed: Math.abs(state.carSpeed),
    carModel: state.car ? state.car.model : '',
    carStyle: state.car ? state.car.style : '',
    station: audio.stationName(),
  });
  hud.drawMap({
    target,
    cars: traffic.cars.map((c) => ({ x: c.alongX ? c.pos : c.lane, z: c.alongX ? c.lane : c.pos })),
    police: police.list.map((p) => ({ x: p.mesh.position.x, z: p.mesh.position.z })),
    heli: heli.active ? { x: heli.mesh.position.x, z: heli.mesh.position.z } : null,
    player: { x: player.x, z: player.z, angle: state.camAngle },
  }, clock);
  // Harbour shimmer: the water warms and cools with the game clock.
  const shimmer = 0.5 + Math.sin(clock * 0.8) * 0.5;
  city.sea.material.color.setHex(shimmer > 0.5 ? 0x2a6ea8 : 0x3a7ab8);
  renderer.render(scene, camera);
}

function runShot(name) {
  // Stage a fixed scene for a screenshot, then paint it twice. The start
  // shot keeps the title screen over the plaza; the others hide it.
  const shotClock = 3.0;
  if (name !== 'start') setScreen('play');
  if (name === 'start') {
    // Title over the plaza: pull the camera back so the skyline reads.
    state.camDist = 22;
  } else if (name === 'drive') {
    // Harbour drive at golden hour: heading north up the harbour road
    // toward the North Market beacon, traffic and minimap in frame.
    const car = traffic.parked[1];
    car.stolen = true;
    state.inCar = true;
    state.car = car;
    state.carSpeed = 18;
    state.carAngle = Math.PI;
    car.x = -60; car.z = -60;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = state.carAngle;
    player.x = car.x; player.z = car.z;
    state.camAngle = Math.PI;
    state.camDist = 12;
    state.cash = 150;
  } else if (name === 'chase') {
    // Neon Row chase: four stars, three cruisers in frame ahead and
    // beside the car, the helicopter and its searchlight above the street.
    const car = traffic.parked[0];
    car.stolen = true;
    state.inCar = true;
    state.car = car;
    state.carSpeed = 24;
    state.carAngle = Math.PI / 2;
    car.x = 120; car.z = 0;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = state.carAngle;
    player.x = car.x; player.z = car.z;
    state.wanted = 4;
    missions.index = 1;
    state.cash = 400;
    spawnPolice(police, player.x, player.z, 3, random);
    const cruiserSpots = [
      [player.x + 17, player.z - 3],
      [player.x + 9, player.z + 3],
      [player.x - 8, player.z + 5],
    ];
    police.list.forEach((p, i) => {
      p.mesh.position.set(cruiserSpots[i][0], 0, cruiserSpots[i][1]);
      p.mesh.rotation.y = Math.PI / 2;
    });
    heli.active = true;
    heli.mesh.position.set(player.x + 26, 26, player.z);
    heli.mesh.visible = true;
    state.camAngle = Math.PI / 2;
    state.camDist = 12;
    audio.siren(true);
  } else if (name === 'win') {
    missions.index = 5;
    missions.earned = 1450;
    missions.done = true;
    missions.beacon.visible = false;
    state.cash = 1950;
    player.x = 0; player.z = 26;
    player.mesh.position.set(player.x, 0, player.z);
    state.camAngle = Math.PI;
    state.camDist = 14;
    setScreen('play');
    hud.showBanner('CLEAN GETAWAY! All six jobs done — $1,950 earned.');
    document.getElementById('banner').style.opacity = '1';
  }
  let painted = 0;
  function paint() {
    // Snap the camera on the first paint (the follow lerp is for live play).
    updateCamera(painted === 0 ? 10 : 1 / 60);
    drawFrame(shotClock);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  setScreen('title', 'Mara Voss is back in Solmar Bay. Six jobs. One city. One big score. Steal a car with E, drive with WASD, punch with F, switch radio with R. Click to start.');
  let last = performance.now();
  let acc = 0;
  let prevP = false;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    // Pause toggles on the keydown edge only, so holding P cannot flicker it.
    const pDown = keys.has('KeyP') || keys.has('Escape');
    if (pDown && !prevP) {
      if (state.screen === 'play') setScreen('paused', 'Press P or click to resume.');
      else if (state.screen === 'paused') setScreen('play');
    }
    prevP = pDown;
    while (acc >= STEP && state.screen === 'play') { step(STEP); acc -= STEP; }
    if (state.screen === 'play') updateCamera(STEP);
    else {
      // Title camera slowly orbits the plaza.
      const t = now / 1000;
      camera.position.set(Math.sin(t * 0.1) * 40, 26, Math.cos(t * 0.1) * 40);
      camera.lookAt(0, 2, 0);
    }
    drawFrame(state.clock);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
