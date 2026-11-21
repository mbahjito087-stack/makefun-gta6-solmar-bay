// Pedestrians who stroll the sidewalks, and the player character Mara Voss.
import * as THREE from 'three';
import { CITY_HALF } from './config.js';
import { pick } from './random.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1];

export function makePersonMesh(shirt) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  body.position.y = 1.05;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe0ac69 }),
  );
  head.position.y = 1.8;
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
  );
  legs.position.y = 0.3;
  g.add(body, head, legs);
  return g;
}

export function createPedestrians(random, scene) {
  const peds = [];
  for (let i = 0; i < 18; i++) {
    const mesh = makePersonMesh(pick(random, SHIRTS));
    const ped = {
      mesh,
      x: (random() * 2 - 1) * (CITY_HALF - 10),
      z: (random() * 2 - 1) * (CITY_HALF - 10),
      angle: random() * Math.PI * 2,
      speed: 1.2 + random() * 1.2,
      down: 0,
    };
    mesh.position.set(ped.x, 0, ped.z);
    scene.add(mesh);
    peds.push(ped);
  }
  return peds;
}

export function stepPedestrians(peds, dt) {
  for (const p of peds) {
    if (p.down > 0) {
      p.down -= dt;
      p.mesh.rotation.x = p.down > 0 ? Math.PI / 2 : 0;
      continue;
    }
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.z += Math.sin(p.angle) * p.speed * dt;
    if (Math.abs(p.x) > CITY_HALF - 5 || Math.abs(p.z) > CITY_HALF - 5) p.angle += Math.PI / 2;
    if (Math.random() < 0.002) p.angle += (Math.random() - 0.5) * 2;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = -p.angle + Math.PI / 2;
  }
}

export function makePlayerMesh() {
  const g = makePersonMesh(0xd35400);
  const jacket = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.3, 0.46),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  jacket.position.y = 1.35;
  g.add(jacket);
  return g;
}
