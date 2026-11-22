// Mara Voss's story in six jobs, told by Dario on the phone. A job pays
// when Mara reaches its gold beacon — except the getaway, which only pays
// once the wanted level is clean, and the smuggle, which pays only inside
// its timer. The finale raises the heat the moment it starts.
import * as THREE from 'three';
import { MISSION_REWARDS, TIMED_JOB_SECONDS } from './config.js';

export const MISSIONS = [
  {
    name: 'Job 1: The Pickup',
    brief: 'Dario needs a package from the north market. Get there on foot or by car.',
    target: { x: -120, z: -120, label: 'North Market' },
    hint: 'Follow the gold beacon. Press E near a parked car to drive it.',
    kind: 'reach',
  },
  {
    name: 'Job 2: The Getaway',
    brief: 'The package is hot and the Solmar police are coming. Lose them, then reach the hideout.',
    target: { x: 120, z: 120, label: 'Hideout' },
    hint: 'Stars fade when no cruiser can see you. Reach the beacon only when clean.',
    kind: 'escape',
  },
  {
    name: 'Job 3: The Vault Run',
    brief: 'One last easy one, she says: lift the gold Comet from the harbour garage and bring it to the chop shop.',
    target: { x: 120, z: -120, label: 'Chop Shop' },
    hint: 'Steal a car with E, then drive it to the gold beacon.',
    kind: 'reach',
  },
  {
    name: 'Job 4: Harbour Smuggle',
    brief: 'A crate of harbour goods has to cross town before the tide turns. Seventy-five seconds, no excuses.',
    target: { x: -120, z: 120, label: 'Harbour Drop' },
    hint: 'Timed delivery — watch the clock. Drive fast, cut corners.',
    kind: 'timed',
  },
  {
    name: 'Job 5: Neon Row Rescue',
    brief: 'Dario’s kid brother got cornered on Neon Row. Get him out — the crew there does not ask twice.',
    target: { x: 150, z: -60, label: 'Neon Row' },
    hint: 'Reach the beacon on Neon Row. Expect company.',
    kind: 'reach',
  },
  {
    name: 'Job 6: The Big Score',
    brief: 'The casino vault on Marina Plaza. Take it all, then vanish. The whole city will be on you.',
    target: { x: 0, z: -150, label: 'Marina Vault' },
    hint: 'The finale: grab the score and reach the vault beacon.',
    kind: 'finale',
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
  return {
    index: 0,
    beacon,
    done: false,
    earned: 0,
    timer: 0,
    warned: false,
    blockedNote: 0,
  };
}

export function missionTarget(missions) {
  return MISSIONS[missions.index].target;
}

// Advance the current job. Returns an event object, or null. `wanted` is
// the current star count; `dt` ticks the timed job's clock.
export function updateMissions(missions, playerPos, wanted, dt) {
  const job = MISSIONS[missions.index];
  const t = job.target;
  missions.beacon.position.set(t.x, 0, t.z);
  missions.beacon.rotation.y += 0.02;
  if (job.kind === 'timed') {
    if (missions.timer <= 0) missions.timer = TIMED_JOB_SECONDS;
    missions.timer -= dt;
    if (missions.timer <= 0) {
      missions.timer = TIMED_JOB_SECONDS;
      return { failed: true, name: job.name };
    }
  }
  const d = Math.hypot(playerPos.x - t.x, playerPos.z - t.z);
  if (d >= 6) return null;
  // The getaway only counts once the heat is gone.
  if (job.kind === 'escape' && wanted > 0) {
    missions.blockedNote += dt;
    return { blocked: true };
  }
  const pay = MISSION_REWARDS[missions.index];
  missions.earned += pay;
  missions.timer = 0;
  missions.index += 1;
  if (missions.index >= MISSIONS.length) {
    missions.done = true;
    missions.beacon.visible = false;
    return { paid: pay, finished: true };
  }
  return { paid: pay, finished: false, next: MISSIONS[missions.index].name };
}
