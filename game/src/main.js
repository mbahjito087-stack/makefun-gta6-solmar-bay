// Solmar Bay — Mara Voss's open world. Boot, the one fixed-step loop, input,
// driving and walking, stealing cars, the wanted level, police chases, combat,
// missions, the camera, saving, and the staged screenshot scenes.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|win (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import * as THREE from 'three';
import { CITY_HALF, STEP, PLAYER_WALK, PLAYER_RUN, CAR_TOP_SPEED, CAR_ACCEL, CAR_BRAKE, MAX_WANTED, WANTED_DECAY_SEC, PLAYER_HEALTH, BEST_KEY, SAVE_KEY } from './config.js';
import { createRandom } from './random.js';
import { createCity, collideCircle } from './city.js';
import { createTraffic, stepTraffic, createPolice, spawnPolice, stepPolice, removePolice, makeCarMesh } from './vehicles.js';
import { createPedestrians, stepPedestrians, makePlayerMesh } from './people.js';
import { MISSIONS, createMissions, missionTarget, updateMissions } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const random = createRandom(seed);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d6);
scene.fog = new THREE.Fog(0x87b5d6, 120, 420);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const sun = new THREE.DirectionalLight(0xffe8b0, 2.4);
sun.position.set(120, 180, 60);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x8a7a5a, 1.3));

const city = createCity(random);
scene.add(city.group);
const traffic = createTraffic(random, scene, city.colliders, city.streets);
const peds = createPedestrians(random, scene);
const police = createPolice(scene);
const missions = createMissions(scene);
const audio = createAudio();
const hud = createHud();

const player = {
  mesh: makePlayerMesh(),
  x: 14, z: 14, angle: 0, speed: 0,
};
scene.add(player.mesh);

const state = {
  screen: 'title',
  cash: 0,
  health: PLAYER_HEALTH,
  wanted: 0,
  wantedTimer: 0,
  inCar: false,
  car: null,
  carSpeed: 0,
  carAngle: 0,
  camAngle: Math.PI * 0.75,
  camDist: 16,
  best: 0,
  ramCooldown: 0,
  punchCooldown: 0,
  message: '',
};
try { state.best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { /* storage off */ }
try {
  const save = JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? 'null');
  if (save) { state.cash = save.cash || 0; }
} catch { /* no save */ }

const keys = new Set();
let dragX = null;
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
  if (state.screen === 'title' || state.screen === 'over' || state.screen === 'win') startGame();
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
  title.textContent = name === 'title' ? 'SOLMAR BAY' : name === 'paused' ? 'PAUSED' : name === 'win' ? 'CLEAN GETAWAY!' : 'WASTED';
  text.textContent = message || '';
}

function startGame() {
  state.screen = 'play';
  state.cash = 0;
  state.health = PLAYER_HEALTH;
  state.wanted = 0;
  state.inCar = false;
  state.car = null;
  state.carSpeed = 0;
  player.x = 14;
  player.z = 14;
  player.angle = 0;
  missions.index = 0;
  missions.done = false;
  missions.earned = 0;
  missions.beacon.visible = true;
  removePolice(police);
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

function nearestCar(maxD) {
  let bestCar = null;
  let bestD = maxD;
  for (const c of traffic.parked) {
    if (c.stolen) continue;
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
  const speed = run ? PLAYER_RUN : PLAYER_WALK;
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
  // Punch: F knocks the nearest pedestrian down.
  state.punchCooldown -= dt;
  if (keys.has('KeyF') && state.punchCooldown <= 0) {
    state.punchCooldown = 0.5;
    for (const p of peds) {
      if (p.down <= 0 && Math.hypot(p.x - player.x, p.z - player.z) < 2.5) {
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
  const forward = keys.has('KeyW') || keys.has('ArrowUp');
  const back = keys.has('KeyS') || keys.has('ArrowDown');
  if (forward) state.carSpeed += CAR_ACCEL * dt;
  else if (back) state.carSpeed -= CAR_BRAKE * dt;
  else state.carSpeed *= (1 - 0.8 * dt);
  state.carSpeed = Math.max(-10, Math.min(CAR_TOP_SPEED, state.carSpeed));
  const steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
  state.carAngle += steer * 1.8 * dt * Math.sign(state.carSpeed || 1) * Math.min(1, Math.abs(state.carSpeed) / 8);
  car.x += Math.sin(state.carAngle) * state.carSpeed * dt;
  car.z += Math.cos(state.carAngle) * state.carSpeed * dt;
  collideCircle(city.colliders, car, 2.2);
  car.x = Math.max(-CITY_HALF + 2, Math.min(CITY_HALF - 2, car.x));
  car.z = Math.max(-CITY_HALF + 2, Math.min(CITY_HALF - 2, car.z));
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = state.carAngle;
  player.x = car.x;
  player.z = car.z;
  // Ramming pedestrians and traffic raises the heat.
  for (const p of peds) {
    if (p.down <= 0 && Math.hypot(p.x - car.x, p.z - car.z) < 2.5 && Math.abs(state.carSpeed) > 6) {
      p.down = 5;
      raiseWanted(1);
      audio.thud();
      state.carSpeed *= 0.7;
    }
  }
  if (eEdge) exitCar();
  audio.engine(Math.abs(state.carSpeed) / CAR_TOP_SPEED);
}

function step(dt) {
  if (state.screen !== 'play') return;
  const eEdge = keys.has('KeyE') && !prevE;
  prevE = keys.has('KeyE');
  if (state.inCar) stepCar(dt, eEdge); else stepPlayer(dt, eEdge);
  stepTraffic(traffic.cars, dt);
  stepPedestrians(peds, dt);

  // Wanted: police spawn, chase, and ram.
  if (state.wanted > 0) {
    spawnPolice(police, player.x, player.z, Math.min(3, state.wanted));
    const rammed = stepPolice(police, player, dt, city.colliders);
    state.ramCooldown -= dt;
    if (rammed && state.ramCooldown <= 0) {
      state.ramCooldown = 1;
      state.health -= 20;
      audio.thud();
      hud.showBanner('The police rammed you!');
    }
    state.wantedTimer += dt;
    const nearestCop = police.list.reduce((m, p) => Math.min(m, Math.hypot(p.mesh.position.x - player.x, p.mesh.position.z - player.z)), 999);
    if (nearestCop > 70 && state.wantedTimer > WANTED_DECAY_SEC) {
      state.wanted -= 1;
      state.wantedTimer = 0;
      if (state.wanted === 0) { removePolice(police); audio.siren(false); }
    }
  }

  // Missions.
  const result = updateMissions(missions, player, state.inCar);
  if (result) {
    state.cash += result.paid;
    audio.pickup();
    saveGame();
    if (result.finished) {
      state.best = Math.max(state.best, state.cash);
      saveGame();
      setScreen('win', `All three jobs done. You earned $${state.cash}. Best: $${state.best}. Click to play again.`);
      return;
    }
    hud.showBanner(`${result.next} — +$${result.paid}`);
  }

  if (state.health <= 0) {
    audio.siren(false);
    setScreen('over', `Mara was taken down with $${state.cash} earned. Click to try again.`);
  }
  if (!state.inCar) audio.engine(0);
}

function updateCamera(dt) {
  const focus = state.inCar && state.car ? state.car : player;
  const fx = state.inCar ? focus.x : player.x;
  const fz = state.inCar ? focus.z : player.z;
  const targetAngle = state.inCar ? state.carAngle : player.angle;
  // Camera trails behind the direction of travel, smoothed.
  const desired = state.camAngle;
  const cx = fx - Math.sin(desired) * state.camDist;
  const cz = fz - Math.cos(desired) * state.camDist;
  camera.position.lerp(new THREE.Vector3(cx, 9 + state.camDist * 0.35, cz), 1 - Math.pow(0.001, dt));
  camera.lookAt(fx, 2, fz);
  void targetAngle;
}

function drawFrame() {
  const target = missionTarget(missions);
  hud.update({
    cash: state.cash,
    health: state.health,
    wanted: state.wanted,
    missionName: missions.done ? 'All jobs done' : MISSIONS[missions.index].name,
    objective: missions.done ? 'Enjoy Solmar Bay' : `${target.label} — ${MISSIONS[missions.index].hint}`,
    inCar: state.inCar,
    speed: Math.abs(state.carSpeed),
  });
  hud.drawMap({
    target,
    cars: traffic.cars.map((c) => ({ x: c.alongX ? c.other : c.pos, z: c.alongX ? c.pos : c.other })),
    police: police.list.map((p) => ({ x: p.mesh.position.x, z: p.mesh.position.z })),
    player: { x: player.x, z: player.z, angle: state.camAngle },
  });
  renderer.render(scene, camera);
}

function runShot(name) {
  // Stage a fixed scene for a screenshot, then paint it twice. The start
  // shot keeps the title screen over the plaza; the others hide it.
  if (name !== 'start') setScreen('play');
  if (name === 'drive') {
    const car = traffic.parked[1];
    car.stolen = true;
    state.inCar = true;
    state.car = car;
    state.carSpeed = 18;
    state.carAngle = 0;
    car.x = -60; car.z = 60;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = state.carAngle;
    player.x = car.x; player.z = car.z;
    state.camAngle = 0;
  } else if (name === 'chase') {
    const car = traffic.parked[0];
    car.stolen = true;
    state.inCar = true;
    state.car = car;
    state.carSpeed = 24;
    state.carAngle = 0;
    car.x = 0; car.z = -40;
    car.mesh.position.set(car.x, 0, car.z);
    player.x = car.x; player.z = car.z;
    state.wanted = 3;
    spawnPolice(police, player.x, player.z, 3);
    police.list.forEach((p, i) => {
      p.mesh.position.set(player.x - 12 - i * 8, 0, player.z - 18 - i * 6);
    });
    state.camAngle = 0;
    audio.siren(true);
  } else if (name === 'win') {
    missions.index = 2;
    missions.earned = 450;
    missions.done = true;
    missions.beacon.visible = false;
    state.cash = 1050;
    player.x = 120; player.z = -120;
    player.mesh.position.set(player.x, 0, player.z);
    state.camAngle = Math.PI * 0.8;
    setScreen('play');
    hud.showBanner('CLEAN GETAWAY! All three jobs done — $1,050 earned.');
    document.getElementById('banner').style.opacity = '1';
  }
  // Title shot keeps the title screen over the plaza.
  let painted = 0;
  function paint() {
    // Snap the camera on the first paint (the follow lerp is for live play).
    updateCamera(painted === 0 ? 10 : 1 / 60);
    drawFrame();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  setScreen('title', 'Mara Voss is back in Solmar Bay. Three jobs. One city. Steal a car with E, drive with WASD, punch with F. Click to start.');
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
    drawFrame();
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
