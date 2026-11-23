// People: Mara Voss on foot and the eighteen pedestrians of Solmar Bay.
// Peds stroll the sidewalks, cross at crosswalks, and run when trouble
// comes to their street.

import * as THREE from 'three';
import { PED_COUNT, ROAD_LINES, WORLD_HALF } from './config.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0xecf0f1, 0x1abc9c];
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

export function makePersonMesh(rng, isMara) {
  const g = new THREE.Group();
  const skin = isMara ? 0xf1c27d : rng.pick(SKINS);
  const shirt = isMara ? 0x8e1f2f : rng.pick(SHIRTS);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.75, 0.24),
    new THREE.MeshLambertMaterial({ color: isMara ? 0x1c1c26 : 0x2c3e50 })
  );
  legs.position.y = 0.38;
  g.add(legs);
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.65, 0.3),
    new THREE.MeshLambertMaterial({ color: shirt })
  );
  torso.position.y = 1.08;
  torso.castShadow = true;
  g.add(torso);
  if (isMara) {
    // Mara's dark red jacket with a gold collar stripe.
    const jacket = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.3, 0.33),
      new THREE.MeshLambertMaterial({ color: 0x5e1420 })
    );
    jacket.position.y = 1.28;
    g.add(jacket);
  }
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshLambertMaterial({ color: skin })
  );
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);
  if (isMara) {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x1a0f0a })
    );
    hair.position.set(0, 1.68, -0.06);
    hair.scale.set(1, 0.85, 1);
    g.add(hair);
  }
  return g;
}

export function createPlayer(scene) {
  const mesh = makePersonMesh(null, true);
  scene.add(mesh);
  return mesh;
}

export function createPedestrians(scene, rng) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i++) {
    const mesh = makePersonMesh(rng, false);
    const x = rng.range(-110, 110);
    const z = rng.range(-110, 110);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, x, z,
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(0.9, 1.7),
      targetX: x, targetZ: z,
      fleeing: 0, bobPhase: rng.range(0, Math.PI * 2),
    });
  }
  return peds;
}

function pickSidewalkTarget(ped, rng) {
  // Aim for a point just off a road line: sidewalks, not the middle of traffic.
  const line = rng.pick(ROAD_LINES);
  if (rng.chance(0.5)) {
    ped.targetX = rng.range(-WORLD_HALF, WORLD_HALF);
    ped.targetZ = line + rng.sign() * rng.range(6.5, 9);
  } else {
    ped.targetX = line + rng.sign() * rng.range(6.5, 9);
    ped.targetZ = rng.range(-WORLD_HALF, WORLD_HALF);
  }
}

// Peds walk to their target, pick a new one on arrival, and flee from a
// speeding car or a punch. Fleeing is timed by the game clock.
export function updatePedestrians(peds, dt, world, rng) {
  for (const ped of peds) {
    const dxp = world.player.x - ped.x;
    const dzp = world.player.z - ped.z;
    const playerDist = Math.hypot(dxp, dzp);
    const playerDanger = world.player.inCar ? world.playerSpeed > 12 : world.punching;
    if (playerDanger && playerDist < 9) {
      ped.fleeing = 2.2;
    }
    let speed = ped.speed;
    let tx = ped.targetX;
    let tz = ped.targetZ;
    if (ped.fleeing > 0) {
      ped.fleeing -= dt;
      speed = 4.2;
      tx = ped.x - dxp;
      tz = ped.z - dzp;
    } else if (Math.hypot(tx - ped.x, tz - ped.z) < 1.5) {
      pickSidewalkTarget(ped, rng);
      tx = ped.targetX;
      tz = ped.targetZ;
    }
    const dx = tx - ped.x;
    const dz = tz - ped.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    ped.heading = Math.atan2(dx, dz);
    ped.x += (dx / dist) * speed * dt;
    ped.z += (dz / dist) * speed * dt;
    ped.x = Math.max(-WORLD_HALF - 6, Math.min(WORLD_HALF + 6, ped.x));
    ped.z = Math.max(-WORLD_HALF - 6, Math.min(WORLD_HALF + 6, ped.z));
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.heading;
    // A little walk bob, phased by the game clock so it never desyncs.
    ped.bobPhase += dt * speed * 4;
    ped.mesh.position.y = Math.abs(Math.sin(ped.bobPhase)) * 0.06;
  }
}
