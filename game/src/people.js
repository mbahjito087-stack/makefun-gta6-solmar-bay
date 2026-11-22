// Pedestrians who stroll the sidewalks — and run when a car barrels at
// them — plus Mara Voss, the player character.
import * as THREE from 'three';
import { WORLD_HALF, PEDESTRIANS } from './config.js';
import { choice, range } from './random.js';

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
  for (let i = 0; i < PEDESTRIANS; i++) {
    const mesh = makePersonMesh(choice(random, SHIRTS));
    const ped = {
      mesh,
      x: range(random, -WORLD_HALF + 10, WORLD_HALF - 10),
      z: range(random, -WORLD_HALF + 10, WORLD_HALF - 10),
      angle: random() * Math.PI * 2,
      speed: 1.2 + random() * 1.2,
      down: 0,
      fleeing: 0,
    };
    mesh.position.set(ped.x, 0, ped.z);
    scene.add(mesh);
    peds.push(ped);
  }
  return peds;
}

// Stroll, turn at the city edge, drift now and then — all from the seeded
// stream. `threats` are danger points (a speeding car, a punch): peds
// inside a threat's radius run away from it for a couple of seconds.
export function stepPedestrians(peds, dt, random, threats) {
  for (const p of peds) {
    if (p.down > 0) {
      p.down -= dt;
      p.mesh.rotation.x = p.down > 0 ? Math.PI / 2 : 0;
      continue;
    }
    let speed = p.speed;
    if (p.fleeing > 0) {
      p.fleeing -= dt;
      speed = p.speed * 2.4;
    } else if (threats) {
      for (const t of threats) {
        const d = Math.hypot(p.x - t.x, p.z - t.z);
        if (d < t.r) {
          p.angle = Math.atan2(p.x - t.x, p.z - t.z) + Math.PI / 2;
          p.fleeing = 2;
          break;
        }
      }
    }
    p.x += Math.cos(p.angle) * speed * dt;
    p.z += Math.sin(p.angle) * speed * dt;
    if (Math.abs(p.x) > WORLD_HALF - 5 || Math.abs(p.z) > WORLD_HALF - 5) p.angle += Math.PI / 2;
    if (random() < 0.002) p.angle += (random() - 0.5) * 2;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = -p.angle + Math.PI / 2;
  }
}

// Mara: orange shirt under a dark vest, so she reads against the crowd.
export function makePlayerMesh() {
  const g = makePersonMesh(0xd35400);
  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.3, 0.46),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  vest.position.y = 1.35;
  g.add(vest);
  return g;
}
