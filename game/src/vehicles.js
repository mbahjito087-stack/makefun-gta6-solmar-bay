// Cars: traffic that cruises the street grid, parked cars to steal, the
// police cruisers that chase the player, and — at four stars and up — a
// police helicopter circling overhead with a searchlight.
import * as THREE from 'three';
import {
  WORLD_HALF, BLOCK_SIZE, CAR_STYLES, MAX_WANTED,
  TRAFFIC_CARS, PARKED_CARS,
} from './config.js';
import { choice, range } from './random.js';
import { collideCircle, streetAt } from './city.js';

const PAINTS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x16a085, 0xe67e22, 0xecf0f1, 0x2c3e50];
const MODELS = ['Comet', 'Bison', 'Stinger', 'Falcon', 'Mule'];
const STYLES = ['sedan', 'van', 'sports'];

// One car body. Sedans are balanced, vans are slow and boxy, sports cars
// are low, fast and grippy. Headlights and taillights are emissive, so
// they read at dusk; police cars wear a flashing lightbar.
export function makeCarMesh(color, style, police) {
  const g = new THREE.Group();
  const dims = style === 'van'
    ? { w: 2.2, h: 1.1, l: 5.2, cabinH: 0.9, cabinL: 3.2 }
    : style === 'sports'
      ? { w: 1.9, h: 0.5, l: 4.6, cabinH: 0.5, cabinL: 1.8 }
      : { w: 2.0, h: 0.7, l: 4.4, cabinH: 0.65, cabinL: 2.2 };
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(dims.w, dims.h, dims.l),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(dims.w - 0.3, dims.cabinH, dims.cabinL),
    new THREE.MeshLambertMaterial({ color: 0x1a2530 }),
  );
  cabin.position.set(0, 0.55 + dims.h / 2 + dims.cabinH / 2 - 0.05, -0.2);
  g.add(cabin);
  if (police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    bar.position.set(0, 1.65, -0.2);
    bar.name = 'lightbar';
    g.add(bar);
  }
  // Headlights (front, +z is the car's forward) and taillights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const x of [-0.65, 0.65]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headMat);
    head.position.set(x, 0.6, dims.l / 2 + 0.02);
    g.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), tailMat);
    tail.position.set(x, 0.6, -dims.l / 2 - 0.02);
    g.add(tail);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelZ = dims.l / 2 - 0.8;
  for (const [x, z] of [[-1, wheelZ], [1, wheelZ], [-1, -wheelZ], [1, -wheelZ]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  return g;
}

export function createTraffic(random, scene, colliders, streets) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_CARS; i++) {
    const alongX = random() < 0.5;
    const street = choice(random, streets);
    const style = choice(random, STYLES);
    const mesh = makeCarMesh(choice(random, PAINTS), style, false);
    const car = {
      mesh,
      model: choice(random, MODELS),
      style,
      alongX,
      street,
      lane: street + (random() < 0.5 ? 3.5 : -3.5),
      pos: range(random, -WORLD_HALF + 10, WORLD_HALF - 10),
      speed: 8 + random() * 6,
      dir: random() < 0.5 ? 1 : -1,
      // Cautious drivers brake at intersections; bold ones roll through.
      caution: random(),
    };
    if (alongX) mesh.position.set(car.pos, 0, car.lane);
    else mesh.position.set(car.lane, 0, car.pos);
    mesh.rotation.y = alongX
      ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (car.dir > 0 ? 0 : Math.PI);
    scene.add(mesh);
    cars.push(car);
  }
  // Parked cars the player can steal, lined up on Marina Plaza right by
  // the spawn, so the first steal is a few steps away, not a hike.
  const parked = [];
  for (let i = 0; i < PARKED_CARS; i++) {
    const style = choice(random, STYLES);
    const mesh = makeCarMesh(choice(random, PAINTS), style, false);
    const x = -14 + i * 7;
    mesh.position.set(x, 0, 20);
    mesh.rotation.y = Math.PI / 2;
    scene.add(mesh);
    parked.push({
      mesh, model: choice(random, MODELS), style,
      x, z: 20, stolen: false,
      health: 100,
    });
  }
  return { cars, parked };
}

// Traffic cruises its street; cautious cars slow near intersections.
export function stepTraffic(cars, dt) {
  for (const car of cars) {
    const nearCrossing = streetAt(car.pos);
    const factor = nearCrossing && car.caution > 0.55 ? 0.35 : 1;
    car.pos += car.speed * factor * car.dir * dt;
    if (car.pos > WORLD_HALF - 5) car.pos = -WORLD_HALF + 5;
    if (car.pos < -WORLD_HALF + 5) car.pos = WORLD_HALF - 5;
    if (car.alongX) car.mesh.position.set(car.pos, 0, car.lane);
    else car.mesh.position.set(car.lane, 0, car.pos);
  }
}

export function createPolice(scene) {
  return { list: [], scene };
}

// Add cruisers until the wanted count is met, spawning them on a ring
// around the player from the seeded stream — never an unseeded roll.
export function spawnPolice(police, x, z, count, random) {
  while (police.list.length < count) {
    const mesh = makeCarMesh(0x111111, 'sedan', true);
    const angle = random() * Math.PI * 2;
    mesh.position.set(x + Math.cos(angle) * 70, 0, z + Math.sin(angle) * 70);
    police.scene.add(mesh);
    police.list.push({ mesh, speed: 0 });
  }
}

// Drop one cruiser at an exact spot: a roadblock ahead of the player.
export function placePolice(police, x, z) {
  const mesh = makeCarMesh(0x111111, 'sedan', true);
  mesh.position.set(x, 0, z);
  police.scene.add(mesh);
  police.list.push({ mesh, speed: 0 });
  return police.list[police.list.length - 1];
}

// Chase the target. Returns 'ram' when a cruiser hits the player, 'bust'
// when one reaches the player on foot at three stars or more, else null.
// The lightbar alternates on the game clock (a fixed-step value), never on
// performance.now(), so staged screenshots stay identical every run.
export function stepPolice(police, target, dt, colliders, clock, onFoot, wanted) {
  let result = null;
  const phase = Math.floor(clock / 0.25) % 2 === 0;
  for (const p of police.list) {
    const dx = target.x - p.mesh.position.x;
    const dz = target.z - p.mesh.position.z;
    const d = Math.hypot(dx, dz) || 1;
    p.speed = Math.min(p.speed + 18 * dt, 26);
    p.mesh.position.x += (dx / d) * p.speed * dt;
    p.mesh.position.z += (dz / d) * p.speed * dt;
    p.mesh.rotation.y = Math.atan2(dx, dz);
    collideCircle(colliders, p.mesh.position, 2.2);
    const bar = p.mesh.getObjectByName('lightbar');
    if (bar) bar.material.color.setHex(phase ? 0xff2222 : 0x2244ff);
    if (onFoot && wanted >= 3 && d < 2.6) result = 'bust';
    else if (d < 3.2 && !result) result = 'ram';
  }
  return result;
}

export function removePolice(police) {
  for (const p of police.list) police.scene.remove(p.mesh);
  police.list.length = 0;
}

// The police helicopter: a dark body, a spinning rotor and a cone of light
// that tracks the player from above.
export function createHelicopter(scene) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x1a1a22 }),
  );
  g.add(body);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 4),
    new THREE.MeshLambertMaterial({ color: 0x1a1a22 }),
  );
  tail.position.set(0, 0.2, -4.5);
  g.add(tail);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.12, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x888888 }),
  );
  rotor.position.y = 1.1;
  rotor.name = 'rotor';
  g.add(rotor);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(6, 46, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff6c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    }),
  );
  beam.position.y = -23;
  g.add(beam);
  g.visible = false;
  scene.add(g);
  return { mesh: g, rotor, angle: 0, active: false };
}

export function stepHelicopter(heli, player, dt, clock) {
  if (!heli.active) { heli.mesh.visible = false; return; }
  heli.mesh.visible = true;
  heli.angle += dt * 0.35;
  const r = 26;
  heli.mesh.position.set(
    player.x + Math.cos(heli.angle) * r,
    46,
    player.z + Math.sin(heli.angle) * r,
  );
  heli.mesh.rotation.y = Math.atan2(player.x - heli.mesh.position.x, player.z - heli.mesh.position.z);
  heli.rotor.rotation.y = clock * 30;
}
