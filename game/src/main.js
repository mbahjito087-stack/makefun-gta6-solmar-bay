// Solmar Bay — the main loop. Mara Voss on foot and behind the wheel,
// wanted stars, police, six jobs, pickups, radio and the staged shots.
// Everything runs on the game clock; the only unseeded input is the frame
// timestamp, which only ever becomes a clamped delta.

import * as THREE from 'three';
import {
  PLAYER_SPAWN, PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_HEALTH_MAX,
  CAR_STYLES, PARKED_SPOTS, MISSIONS, PACKAGE_COUNT, PACKAGE_VALUE,
  districtAt,
} from './config.js';
import { SeededRandom } from './random.js';
import { buildCity } from './city.js';
import {
  makeCarMesh, createParkedCars, createTraffic, updateTraffic,
  createPoliceCruiser, createHelicopter, updateHelicopter, updatePolice,
  createRoadblock, collideWithBuildings,
} from './vehicles.js';
import { makePersonMesh, createPlayer, createPedestrians, updatePedestrians } from './people.js';
import { MissionRunner, TaxiJob, placePackages } from './missions.js';
import { GameAudio } from './audio.js';
import { Hud } from './hud.js';

const params = new URLSearchParams(window.location.search);
const SEED = Number(params.get('seed') || 7);
const SHOT = params.get('shot') || '';
const rng = new SeededRandom(SEED);

// --- renderer / scene -------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const sun = new THREE.DirectionalLight(0xffb36b, 2.0);
sun.position.set(-80, 55, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -150;
sun.shadow.camera.far = 400;
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xffc4a3, 0x3a2f4a, 1.05);
scene.add(hemi);

// --- world ------------------------------------------------------------------
const city = buildCity(scene, rng);
const parkedCars = createParkedCars(scene);
const traffic = createTraffic(scene, rng);
const peds = createPedestrians(scene, rng);
const audio = new GameAudio();
const hud = new Hud(document);
const missions = new MissionRunner(rng);
const taxi = new TaxiJob(rng);
const packageSpots = placePackages(rng);

const playerMesh = createPlayer(scene);
const player = {
  x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z, heading: 0, speed: 0,
  inCar: false, car: null, mesh: playerMesh, punching: false, punchTimer: 0,
};
let playerCar = null;

// Police, helicopter, roadblocks.
const police = [];
const heli = createHelicopter(scene);
const roadblocks = [];
let policeSpawnTimer = 0;
let wantedQuietTimer = 0;
let crimeCooldown = 0;

// Pickups: green health crosses and blue armour crates, seeded spots.
const pickups = [];
function makePickupMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'health') {
    const mat = new THREE.MeshBasicMaterial({ color: 0x2eff6a });
    const a = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.45), mat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.4, 0.45), mat);
    g.add(a); g.add(b);
  } else {
    const mat = new THREE.MeshBasicMaterial({ color: 0x3aa0ff });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat);
    g.add(box);
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.15, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.75;
  g.add(ring);
  return g;
}
const pickupSpots = [
  { kind: 'health', x: -12, z: 34 }, { kind: 'health', x: 44, z: -20 },
  { kind: 'health', x: -60, z: 44 }, { kind: 'armour', x: 20, z: -52 },
  { kind: 'armour', x: -44, z: -44 },
];
for (const spot of pickupSpots) {
  const mesh = makePickupMesh(spot.kind);
  mesh.position.set(spot.x, 1.0, spot.z);
  scene.add(mesh);
  pickups.push({ ...spot, mesh, taken: false, respawn: 0 });
}

// Packages: small glowing crates worth $50 each.
const packageMeshes = [];
for (const spot of packageSpots) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshBasicMaterial({ color: 0x7dff8a })
  );
  mesh.position.set(spot.x, 0.9, spot.z);
  scene.add(mesh);
  packageMeshes.push(mesh);
}

// Mission beacon: a gold pillar of light with a pulsing ring.
const beaconMesh = new THREE.Group();
const beaconBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(1.6, 1.6, 26, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
);
beaconBeam.position.y = 13;
beaconMesh.add(beaconBeam);
const beaconRing = new THREE.Mesh(
  new THREE.RingGeometry(2.2, 3.0, 28),
  new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
);
beaconRing.rotation.x = -Math.PI / 2;
beaconRing.position.y = 0.12;
beaconMesh.add(beaconRing);
scene.add(beaconMesh);

// Taxi beacon (cyan) shares the same shape, different colour.
const taxiBeacon = beaconMesh.clone();
taxiBeacon.children[0].material = new THREE.MeshBasicMaterial({ color: 0x2ec4ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
taxiBeacon.children[1].material = new THREE.MeshBasicMaterial({ color: 0x2ec4ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
taxiBeacon.visible = false;
scene.add(taxiBeacon);

// Car damage smoke: one soft sprite per car that needs it.
const smokeMat = new THREE.MeshBasicMaterial({ color: 0x777777, transparent: true, opacity: 0.45 });
function attachSmoke(car) {
  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), smokeMat);
  puff.position.set(0, 1.4, 1.2);
  puff.visible = false;
  car.mesh.add(puff);
  car.smokeMesh = puff;
}
for (const c of [...parkedCars, ...traffic]) attachSmoke(c);

// --- game state -------------------------------------------------------------
const saveKey = 'solmar-bay-save';
let savedBest = 0;
try {
  const raw = window.localStorage.getItem(saveKey);
  if (raw) savedBest = JSON.parse(raw).best || 0;
} catch (e) { /* fresh save */ }

const state = {
  mode: 'title', // title | playing | paused | wasted | busted | win
  cash: 0,
  health: PLAYER_HEALTH_MAX,
  armour: 0,
  wanted: 0,
  best: savedBest,
  speedKmh: 0,
  district: districtAt(PLAYER_SPAWN.x, PLAYER_SPAWN.z),
  station: 'Radio off',
  packages: 0,
  packageTotal: PACKAGE_COUNT,
  timerLeft: 0,
  missionIndex: 0,
  missionText: '',
  missionDistance: 0,
  missionDone: false,
  time: 0,
  damageFlash: 0,
  night: false,
};

function saveGame() {
  state.best = Math.max(state.best, state.cash);
  try {
    window.localStorage.setItem(saveKey, JSON.stringify({ cash: state.cash, best: state.best }));
  } catch (e) { /* storage unavailable */ }
}

function raiseWanted(n) {
  if (crimeCooldown > 0) return;
  state.wanted = Math.min(5, Math.max(state.wanted, n));
  crimeCooldown = 2.5;
  wantedQuietTimer = 0;
}

function earn(amount, label) {
  state.cash += amount;
  hud.popup('+$' + amount + (label ? '  ' + label : ''), true);
  audio.chime();
  saveGame();
}

// --- input ------------------------------------------------------------------
const keys = {};
let camYaw = 3.54;
let camPitch = 0.42;
let camDist = 11;
let camLift = 0;
let cruiseSpeed = 0;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyF' && state.mode === 'playing' && !player.inCar) doPunch();
  if (e.code === 'KeyR' && state.mode === 'playing') {
    audio.toggleRadio();
    state.station = audio.stationName();
  }
  if (e.code === 'KeyE' && state.mode === 'playing') {
    if (player.inCar) exitCar();
    else tryStealCar();
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - lastPointerX) * 0.005;
  camPitch = Math.max(0.12, Math.min(1.1, camPitch + (e.clientY - lastPointerY) * 0.004));
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
});
window.addEventListener('pointerup', () => { dragging = false; });
renderer.domElement.addEventListener('wheel', (e) => {
  camDist = Math.max(6, Math.min(18, camDist + Math.sign(e.deltaY)));
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function togglePause() {
  if (state.mode === 'playing') {
    state.mode = 'paused';
    hud.showScreen('paused');
  } else if (state.mode === 'paused') {
    state.mode = 'playing';
    hud.showScreen('none');
  }
}

document.getElementById('screen').addEventListener('click', () => {
  audio.ensure();
  if (state.mode === 'title') startGame();
  else if (state.mode === 'paused') togglePause();
  else if (state.mode === 'wasted' || state.mode === 'busted' || state.mode === 'win') restartGame();
});

function startGame() {
  state.mode = 'playing';
  hud.showScreen('none');
  audio.ensure();
  const job = missions.startJob();
  if (job) hud.flashBanner('JOB 1/6 — ' + job.name + ': ' + job.intro, 3600);
}

function restartGame() {
  state.cash = 0;
  state.health = PLAYER_HEALTH_MAX;
  state.armour = 0;
  state.wanted = 0;
  state.mode = 'playing';
  player.x = PLAYER_SPAWN.x;
  player.z = PLAYER_SPAWN.z;
  player.inCar = false;
  player.car = null;
  playerCar = null;
  hud.showScreen('none');
  hud.setVignette(0);
}

// --- actions ----------------------------------------------------------------
function nearestCar(maxDist) {
  let bestCar = null;
  let bestDist = maxDist;
  for (const car of [...parkedCars, ...traffic]) {
    if (car.isPolice || car.driven) continue;
    const d = Math.hypot(car.x - player.x, car.z - player.z);
    if (d < bestDist) { bestDist = d; bestCar = car; }
  }
  return bestCar;
}

function tryStealCar() {
  const car = nearestCar(6.5);
  if (!car) return;
  car.parked = false;
  car.driven = true;
  player.inCar = true;
  player.car = car;
  playerCar = car;
  playerMesh.visible = false;
  raiseWanted(1);
  hud.flashBanner('Car stolen — the law is watching', 2000);
  audio.thud();
}

function exitCar() {
  if (!playerCar) return;
  player.inCar = false;
  player.x = playerCar.x + Math.sin(playerCar.heading + Math.PI / 2) * 2.2;
  player.z = playerCar.z + Math.cos(playerCar.heading + Math.PI / 2) * 2.2;
  player.heading = playerCar.heading;
  playerMesh.visible = true;
  playerCar.speed = 0;
  playerCar = null;
  player.car = null;
}

function doPunch() {
  player.punching = true;
  player.punchTimer = 0.35;
  audio.punchSound();
  for (const ped of peds) {
    if (Math.hypot(ped.x - player.x, ped.z - player.z) < 2.4) {
      ped.fleeing = 3;
      raiseWanted(1);
      hud.flashBanner('Assault — witnesses called it in', 1800);
    }
  }
}

// --- police -----------------------------------------------------------------
function ensurePolice() {
  const want = Math.min(state.wanted, 3);
  while (police.length < want) {
    const a = rng.range(0, Math.PI * 2);
    const cruiser = createPoliceCruiser(scene, player.x + Math.cos(a) * 46, player.z + Math.sin(a) * 46);
    attachSmoke(cruiser);
    police.push(cruiser);
  }
  while (police.length > want) {
    const gone = police.pop();
    scene.remove(gone.mesh);
  }
  heli.active = state.wanted >= 4;
  if (state.wanted >= 4 && roadblocks.length === 0) {
    for (let i = 0; i < 2; i++) {
      const ahead = player.heading + (i === 0 ? 0.5 : -0.5);
      const rb = createRoadblock(
        scene,
        player.x + Math.sin(player.heading) * 26 + Math.sin(ahead) * 8,
        player.z + Math.cos(player.heading) * 26 + Math.cos(ahead) * 8,
        player.heading + Math.PI / 2
      );
      roadblocks.push(rb);
    }
  }
  if (state.wanted < 4) {
    for (const rb of roadblocks) scene.remove(rb.mesh);
    roadblocks.length = 0;
  }
}

// --- night mode ---------------------------------------------------------------
function applyNight(on) {
  state.night = on;
  if (on) {
    scene.fog.color.setHex(0x14142a);
    sun.intensity = 0.55;
    sun.color.setHex(0x9fb4ff);
    hemi.intensity = 0.55;
  } else {
    scene.fog.color.setHex(0xe88a5f);
    sun.intensity = 2.0;
    sun.color.setHex(0xffb36b);
    hemi.intensity = 1.05;
  }
}

// --- update -------------------------------------------------------------------
function updatePlayer(dt) {
  const run = keys['ShiftLeft'] || keys['ShiftRight'];
  if (player.inCar && playerCar) {
    const style = CAR_STYLES[playerCar.style];
    const fwd = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
    const steer = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);
    if (fwd > 0) playerCar.speed = Math.min(style.topSpeed, playerCar.speed + style.accel * dt);
    else if (fwd < 0) playerCar.speed = Math.max(-12, playerCar.speed - style.accel * 0.8 * dt);
    else playerCar.speed *= Math.max(0, 1 - 1.6 * dt);
    if (Math.abs(playerCar.speed) > 0.4) {
      playerCar.heading += steer * style.turn * dt * Math.sign(playerCar.speed) * Math.min(1, Math.abs(playerCar.speed) / 10);
    }
    const nx = playerCar.x + Math.sin(playerCar.heading) * playerCar.speed * dt;
    const nz = playerCar.z + Math.cos(playerCar.heading) * playerCar.speed * dt;
    playerCar.x = nx;
    playerCar.z = nz;
    collideWithBuildings(playerCar, city.colliders, 2.2);
    playerCar.mesh.position.set(playerCar.x, 0, playerCar.z);
    playerCar.mesh.rotation.y = playerCar.heading;
    for (const w of playerCar.mesh.userData.wheels) w.rotation.x += playerCar.speed * dt * 2.4;
    player.x = playerCar.x;
    player.z = playerCar.z;
    player.heading = playerCar.heading;
    state.speedKmh = Math.abs(playerCar.speed) * 3.6;
    // Ram traffic and peds: loud, costly, and the law notices.
    for (const car of traffic) {
      if (car === playerCar || car.driven) continue;
      if (Math.hypot(car.x - player.x, car.z - player.z) < 3.4 && Math.abs(playerCar.speed) > 6) {
        car.x += Math.sin(playerCar.heading + Math.PI / 2) * 2.5;
        car.z += Math.cos(playerCar.heading + Math.PI / 2) * 2.5;
        car.speed *= 0.4;
        car.health = Math.max(0, car.health - 12);
        car.smoke = Math.max(car.smoke, 0.7);
        playerCar.health = Math.max(0, playerCar.health - 5);
        playerCar.smoke = Math.max(playerCar.smoke, 0.5);
        playerCar.speed *= 0.55;
        state.damageFlash = 0.55;
        raiseWanted(1);
        audio.thud();
      }
    }
    for (const ped of peds) {
      if (Math.hypot(ped.x - player.x, ped.z - player.z) < 2.2 && Math.abs(playerCar.speed) > 4) {
        ped.fleeing = 3;
        raiseWanted(1);
        state.damageFlash = 0.4;
        audio.thud();
      }
    }
    if (playerCar.health <= 0) {
      playerCar.speed = Math.min(playerCar.speed, 6);
      hud.flashBanner('Engine wrecked — bail out!', 1500);
    }
  } else {
    // On foot: camera-relative WASD, Shift to run.
    const f = { x: -Math.sin(camYaw), z: -Math.cos(camYaw) };
    const r = { x: -f.z, z: f.x };
    let mx = 0;
    let mz = 0;
    if (keys['KeyW'] || keys['ArrowUp']) { mx += f.x; mz += f.z; }
    if (keys['KeyS'] || keys['ArrowDown']) { mx -= f.x; mz -= f.z; }
    if (keys['KeyD'] || keys['ArrowRight']) { mx += r.x; mz += r.z; }
    if (keys['KeyA'] || keys['ArrowLeft']) { mx -= r.x; mz -= r.z; }
    const len = Math.hypot(mx, mz);
    const speed = run ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    if (len > 0) {
      mx /= len;
      mz /= len;
      player.x += mx * speed * dt;
      player.z += mz * speed * dt;
      player.heading = Math.atan2(mx, mz);
      player.speed = speed;
    } else {
      player.speed = 0;
    }
    // Slide around buildings.
    const probe = { x: player.x, z: player.z, speed: 0 };
    collideWithBuildings(probe, city.colliders, 0.7);
    player.x = probe.x;
    player.z = probe.z;
    player.x = Math.max(-138, Math.min(138, player.x));
    player.z = Math.max(-138, Math.min(138, player.z));
    playerMesh.position.set(player.x, 0, player.z);
    playerMesh.rotation.y = player.heading;
    state.speedKmh = player.speed * 3.6;
    if (player.punchTimer > 0) {
      player.punchTimer -= dt;
      if (player.punchTimer <= 0) player.punching = false;
      playerMesh.rotation.y = player.heading + Math.sin(state.time * 30) * 0.3;
    }
  }
}

function updatePickups(dt) {
  for (const p of pickups) {
    if (p.taken) {
      p.respawn -= dt;
      if (p.respawn <= 0) {
        p.taken = false;
        p.mesh.visible = true;
      }
      continue;
    }
    p.mesh.rotation.y += dt * 1.6;
    p.mesh.position.y = 1.0 + Math.sin(state.time * 2 + p.x) * 0.15;
    if (Math.hypot(p.x - player.x, p.z - player.z) < 2.4) {
      p.taken = true;
      p.respawn = 30;
      p.mesh.visible = false;
      if (p.kind === 'health') {
        state.health = Math.min(PLAYER_HEALTH_MAX, state.health + 25);
        hud.popup('+25 HEALTH', true);
      } else {
        state.armour = Math.min(100, state.armour + 50);
        hud.popup('+50 ARMOUR', true);
      }
      audio.chime();
    }
  }
  for (let i = 0; i < packageSpots.length; i++) {
    const spot = packageSpots[i];
    if (spot.taken) continue;
    packageMeshes[i].rotation.y += dt;
    packageMeshes[i].position.y = 0.9 + Math.sin(state.time * 2.4 + i) * 0.12;
    if (Math.hypot(spot.x - player.x, spot.z - player.z) < 2.6) {
      spot.taken = true;
      packageMeshes[i].visible = false;
      state.packages++;
      earn(PACKAGE_VALUE, 'hidden package ' + state.packages + '/' + PACKAGE_COUNT);
    }
  }
}

function updateSmoke(dt) {
  for (const car of [...parkedCars, ...traffic, ...police, ...(playerCar ? [playerCar] : [])]) {
    if (!car.smokeMesh) continue;
    if (car.smoke > 0) car.smoke = Math.max(0, car.smoke - dt * 0.4);
    const smoking = car.health < 45 || car.smoke > 0.15;
    car.smokeMesh.visible = smoking;
    if (smoking) {
      const s = 0.8 + Math.sin(state.time * 9 + car.x) * 0.35;
      car.smokeMesh.scale.setScalar(Math.max(0.4, s));
      car.smokeMesh.position.y = 1.4 + Math.sin(state.time * 5) * 0.15;
    }
  }
}

function updateWanted(dt) {
  crimeCooldown = Math.max(0, crimeCooldown - dt);
  if (state.wanted === 0) {
    wantedQuietTimer = 0;
    return;
  }
  const nearestCop = police.reduce((m, c) => Math.min(m, Math.hypot(c.x - player.x, c.z - player.z)), 999);
  if (nearestCop > 42) {
    wantedQuietTimer += dt;
    if (wantedQuietTimer > 6) {
      state.wanted--;
      wantedQuietTimer = 0;
      hud.popup('Heat cooling off…', true);
    }
  } else {
    wantedQuietTimer = 0;
  }
}

function updateCamera(dt) {
  const focusX = player.x;
  const focusZ = player.z;
  const focusY = player.inCar ? 1.6 : 1.4;
  const cx = focusX + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  const cz = focusZ + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  const cy = focusY + Math.sin(camPitch) * camDist + 1.2;
  camera.position.set(cx, cy, cz);
  camera.lookAt(focusX, focusY + camLift, focusZ);
}

function updateHud() {
  state.district = districtAt(player.x, player.z);
  state.missionIndex = missions.index;
  state.missionText = missions.missionText();
  state.missionDistance = missions.missionDistance(player.x, player.z);
  state.missionDone = missions.done;
  state.timerLeft = missions.timerLeft;
  state.damageFlash = Math.max(0, state.damageFlash - 0.02);
  const lowHealth = state.health < 30 ? 0.35 : 0;
  hud.setVignette(Math.max(state.damageFlash, lowHealth));
  hud.update(state);
  hud.drawMinimap({
    time: state.time,
    player: { x: player.x, z: player.z, heading: player.heading },
    beacon: missions.beacon,
    police: police.map((c) => ({ x: c.x, z: c.z })),
    heli: heli.active ? { x: heli.x, z: heli.z } : null,
    packages: packageSpots,
  });
}

// --- staged shots -------------------------------------------------------------
function stageShot() {
  if (SHOT === 'start') {
    // Title over the marina skyline: camera low in the plaza, looking east
    // down the golden-hour streets toward the harbour water.
    camYaw = -Math.PI / 2;
    camPitch = 0.26;
    camDist = 26;
    player.x = PLAYER_SPAWN.x;
    player.z = PLAYER_SPAWN.z;
    hud.showScreen('title');
  } else if (SHOT === 'drive') {
    startGame();
    const car = parkedCars[1];
    car.parked = false;
    car.driven = true;
    player.inCar = true;
    player.car = car;
    playerCar = car;
    playerMesh.visible = false;
    // Harbour road, driving north with the water on the right.
    car.x = 60;
    car.z = -40;
    car.heading = 0;
    car.speed = 16;
    player.x = 60;
    player.z = -40;
    player.heading = 0;
    camYaw = Math.PI;
    camPitch = 0.35;
    camDist = 12;
    cruiseSpeed = 13;
  } else if (SHOT === 'chase') {
    applyNight(true);
    startGame();
    const car = parkedCars[1];
    car.parked = false;
    car.driven = true;
    player.inCar = true;
    player.car = car;
    playerCar = car;
    playerMesh.visible = false;
    // Neon Row, fleeing east with the law on the bumper.
    car.x = -68;
    car.z = 4;
    car.heading = Math.PI / 2;
    car.speed = 16;
    player.x = -68;
    player.z = 4;
    player.heading = Math.PI / 2;
    state.wanted = 4;
    state.cash = 1150;
    ensurePolice();
    // Helicopter starts ahead-east of the car so it is in frame.
    heli.angle = -0.5;
    camYaw = -Math.PI / 2;
    camPitch = 0.38;
    camDist = 13;
    camLift = 5;
    cruiseSpeed = 15;
  } else if (SHOT === 'win') {
    startGame();
    missions.index = MISSIONS.length;
    missions.done = true;
    missions.beacon = null;
    state.cash = 1950;
    state.missionDone = true;
    saveGame();
    const car = parkedCars[1];
    car.parked = false;
    car.driven = true;
    player.inCar = true;
    player.car = car;
    playerCar = car;
    playerMesh.visible = false;
    // The getaway car on the harbour road, boat and sunset ahead.
    car.x = 90;
    car.z = -30;
    car.heading = 0;
    car.speed = 10;
    player.x = 90;
    player.z = -30;
    player.heading = 0;
    camYaw = Math.PI;
    camPitch = 0.34;
    camDist = 13;
    cruiseSpeed = 11;
    hud.showScreen('none');
    // Persistent banner: clear the fade timer the JOB flash set.
    window.clearTimeout(hud.bannerEl._t);
    hud.bannerEl.textContent = '★ CLEAN GETAWAY ★   Total take $1,950 — all six jobs done';
    hud.bannerEl.style.opacity = '1';
  }
  updateHud();
}

// --- main loop ------------------------------------------------------------------
let lastT = 0;
let frames = 0;
let shotReadyAt = 0;

function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.max(0.001, Math.min(0.12, (t - lastT) / 1000 || 0.016));
  lastT = t;
  state.time += dt;
  frames++;

  if (state.mode === 'playing') {
    updatePlayer(dt);
    // Staged shots cruise at a steady speed so the speedometer stays alive.
    if (cruiseSpeed > 0 && playerCar) playerCar.speed = cruiseSpeed;
    updateTraffic(traffic, dt, rng);
    updatePedestrians(peds, dt, { player: { x: player.x, z: player.z, inCar: player.inCar, punching: player.punching }, playerSpeed: Math.abs(playerCar ? playerCar.speed : player.speed) }, rng);
    ensurePolice();
    const events = updatePolice(police, {
      player: { x: player.x, z: player.z, inCar: player.inCar },
      playerCar, wanted: state.wanted, time: state.time, audio, damageFlash: 0,
    }, dt);
    if (events.includes('busted')) {
      state.mode = 'busted';
      saveGame();
      hud.showScreen('busted', { best: state.best });
    }
    updateHelicopter(heli, { player: { x: player.x, z: player.z } }, dt);
    const missionEvents = missions.update(dt, player.x, player.z);
    for (const ev of missionEvents) {
      if (ev.type === 'jobDone') {
        earn(ev.job.payout, ev.job.name + ' complete');
        hud.flashBanner('JOB DONE — ' + ev.job.name + '  +$' + ev.job.payout, 3200);
      } else if (ev.type === 'jobStart') {
        if (ev.job.wantedAtStart) state.wanted = Math.max(state.wanted, ev.job.wantedAtStart);
        hud.flashBanner('JOB ' + (missions.index + 1) + '/6 — ' + ev.job.name + ': ' + ev.job.intro, 3600);
      } else if (ev.type === 'wanted') {
        state.wanted = Math.max(state.wanted, ev.stars);
      } else if (ev.type === 'timedOut') {
        hud.flashBanner('Too slow — the smuggle fell through', 2800);
      } else if (ev.type === 'allDone') {
        state.mode = 'win';
        state.missionDone = true;
        saveGame();
        hud.showScreen('win', { cash: state.cash });
      }
    }
    const taxiEvents = taxi.update(dt, player.x, player.z, player.inCar);
    for (const ev of taxiEvents) {
      if (ev.type === 'taxiOffer') {
        taxiBeacon.visible = true;
        taxiBeacon.position.set(ev.x, 0, ev.z);
        hud.flashBanner('Taxi fare waiting — pick up the waving passenger', 2600);
      } else if (ev.type === 'taxiPickup') {
        taxiBeacon.position.set(ev.x, 0, ev.z);
        hud.flashBanner('Passenger aboard — deliver them in 60s', 2400);
      } else if (ev.type === 'taxiPaid') {
        taxiBeacon.visible = false;
        earn(ev.fare, 'taxi fare');
      } else if (ev.type === 'taxiFail') {
        taxiBeacon.visible = false;
        hud.flashBanner('Fare lost — the passenger gave up', 2200);
      }
    }
    updatePickups(dt);
    updateWanted(dt);
    if (state.health <= 0) {
      state.mode = 'wasted';
      saveGame();
      hud.showScreen('wasted', { best: state.best });
    }
    // Beacon follows the current job; pulse it on the game clock.
    if (missions.beacon) {
      beaconMesh.visible = true;
      beaconMesh.position.set(missions.beacon.x, 0, missions.beacon.z);
      const pulse = 1 + Math.sin(state.time * 4) * 0.18;
      beaconRing.scale.setScalar(pulse);
      beaconBeam.material.opacity = 0.3 + Math.sin(state.time * 3) * 0.1;
    } else {
      beaconMesh.visible = false;
    }
    updateSmoke(dt);
    city.update(state.time, state.night);
    audio.setEngine(state.speedKmh, player.inCar);
    audio.setSiren(state.wanted > 0, state.time);
  } else {
    // Title and end screens still breathe: water shimmers, traffic rolls.
    updateTraffic(traffic, dt, rng);
    city.update(state.time, state.night);
  }

  updateCamera(dt);
  updateHud();
  renderer.render(scene, camera);

  if (SHOT && !window.__shotReady) {
    shotReadyAt++;
    if (shotReadyAt > 12) window.__shotReady = true;
  }
}

// Debug handle for playtests: live player / wanted / car positions.
window.__solmar = {
  player, state, missions,
  parkedCars, traffic, police,
  get cars() { return [...parkedCars, ...traffic].map((c) => ({ x: Math.round(c.x), z: Math.round(c.z), style: c.style, parked: !!c.parked, driven: !!c.driven })); },
};

// --- boot -----------------------------------------------------------------------
hud.showScreen('title');
if (SHOT) stageShot();
requestAnimationFrame(frame);
