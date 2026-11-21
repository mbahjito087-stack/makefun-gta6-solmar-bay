// Cars: traffic that cruises the street grid, parked cars to steal, and the
// police cruisers that chase the player when the wanted level rises.
import * as THREE from 'three';
import { CITY_HALF, BLOCK, ROAD_W, CAR_TOP_SPEED } from './config.js';
import { pick } from './random.js';
import { collideCircle } from './city.js';

const PAINTS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x16a085, 0xe67e22, 0xecf0f1, 0x2c3e50];
const MODELS = ['Comet', 'Bison', 'Stinger', 'Falcon', 'Mule'];

export function makeCarMesh(color, police) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.7, 4.4),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.6;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1a2530 }),
  );
  cabin.position.set(0, 1.2, -0.2);
  g.add(body, cabin);
  if (police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    bar.position.set(0, 1.65, -0.2);
    bar.name = 'lightbar';
    g.add(bar);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  return g;
}

export function createTraffic(random, scene, colliders, streets) {
  const cars = [];
  for (let i = 0; i < 14; i++) {
    const alongX = random() < 0.5;
    const street = pick(random, streets);
    const mesh = makeCarMesh(pick(random, PAINTS), false);
    const car = {
      mesh,
      model: pick(random, MODELS),
      alongX,
      street,
      pos: alongX ? street + (random() < 0.5 ? 3.5 : -3.5) : street,
      other: (random() * 2 - 1) * (CITY_HALF - 10),
      speed: 8 + random() * 6,
      dir: random() < 0.5 ? 1 : -1,
    };
    if (alongX) mesh.position.set(car.other, 0, car.pos);
    else mesh.position.set(car.pos, 0, car.other);
    mesh.rotation.y = alongX ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : car.dir > 0 ? 0 : Math.PI;
    scene.add(mesh);
    cars.push(car);
  }
  // Parked cars the player can steal, lined up on Marina Plaza right by the
  // spawn, so the first steal is a few steps away, not a hike.
  const parked = [];
  for (let i = 0; i < 4; i++) {
    const mesh = makeCarMesh(pick(random, PAINTS), false);
    mesh.position.set(-10 + i * 7, 0, 20);
    mesh.rotation.y = Math.PI / 2;
    scene.add(mesh);
    parked.push({ mesh, model: pick(random, MODELS), x: -10 + i * 7, z: 20, stolen: false });
  }
  return { cars, parked };
}

export function stepTraffic(cars, dt) {
  for (const car of cars) {
    car.other += car.speed * car.dir * dt;
    if (car.other > CITY_HALF - 5) car.other = -CITY_HALF + 5;
    if (car.other < -CITY_HALF + 5) car.other = CITY_HALF - 5;
    if (car.alongX) car.mesh.position.set(car.other, 0, car.pos);
    else car.mesh.position.set(car.pos, 0, car.other);
  }
}

export function createPolice(scene) {
  return { list: [], scene };
}

export function spawnPolice(police, x, z, count) {
  while (police.list.length < count) {
    const mesh = makeCarMesh(0x111111, true);
    const angle = Math.random() * Math.PI * 2;
    mesh.position.set(x + Math.cos(angle) * 70, 0, z + Math.sin(angle) * 70);
    police.scene.add(mesh);
    police.list.push({ mesh, speed: 0 });
  }
}

export function stepPolice(police, target, dt, colliders) {
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
    if (bar) bar.material.color.setHex(Math.floor(performance.now() / 250) % 2 ? 0xff2222 : 0x2244ff);
    if (d < 3.2) return true; // A cruiser rammed the player.
  }
  return false;
}

export function removePolice(police) {
  for (const p of police.list) police.scene.remove(p.mesh);
  police.list.length = 0;
}
