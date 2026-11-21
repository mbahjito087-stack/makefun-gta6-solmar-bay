// Mara Voss's story in three jobs: a pickup, a getaway, and the vault run.
// Each mission names a target point; reaching it pays out and opens the next.
import * as THREE from 'three';
import { MISSION_PAYOUTS } from './config.js';

export const MISSIONS = [
  {
    name: 'Job 1: The Pickup',
    brief: 'Dario needs a package from the north market. Get there on foot or by car.',
    target: { x: -120, z: -120, label: 'North Market' },
    hint: 'Follow the gold beacon. Press E near a parked car to drive it.',
  },
  {
    name: 'Job 2: The Getaway',
    brief: 'The package is hot. The Solmar police are coming — lose them and reach the hideout.',
    target: { x: 120, z: 120, label: 'Hideout' },
    hint: 'Wanted stars fade when no cruiser can see you. Drive fast, cut corners.',
  },
  {
    name: 'Job 3: The Vault Run',
    brief: 'One last job: steal the gold Comet from the harbour garage and bring it to the chop shop.',
    target: { x: 120, z: -120, label: 'Chop Shop' },
    hint: 'Steal a car with E, then drive it to the gold beacon. Do not get busted.',
  },
];

export function createMissions(scene) {
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  beam.position.y = 30;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3, 4.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.2;
  beacon.add(beam, ring);
  scene.add(beacon);
  return { index: 0, beacon, done: false, earned: 0 };
}

export function missionTarget(missions) {
  return MISSIONS[missions.index].target;
}

export function updateMissions(missions, playerPos, inCar) {
  const t = missionTarget(missions);
  missions.beacon.position.set(t.x, 0, t.z);
  missions.beacon.rotation.y += 0.02;
  const d = Math.hypot(playerPos.x - t.x, playerPos.z - t.z);
  if (d < 6) {
    const pay = MISSION_PAYOUTS[missions.index];
    missions.earned += pay;
    missions.index += 1;
    if (missions.index >= MISSIONS.length) {
      missions.done = true;
      missions.beacon.visible = false;
      return { paid: pay, finished: true };
    }
    return { paid: pay, finished: false, next: MISSIONS[missions.index].name };
  }
  return null;
}
