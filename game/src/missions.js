// Missions: the six-job story arc, the gold beacon, hidden packages and
// the taxi side gig. Pure logic — the main loop owns the meshes and the HUD.

import { MISSIONS, PACKAGE_COUNT, PACKAGE_VALUE, TAXI_FARE } from './config.js';

export class MissionRunner {
  constructor(rng) {
    this.rng = rng;
    this.index = 0;
    this.step = 0;
    this.timerLeft = 0;
    this.done = false;
    this.beacon = null;
    this.packagesFound = 0;
    this.taxi = null;
    this.refreshBeacon();
  }

  current() {
    return MISSIONS[this.index];
  }

  stepTarget() {
    const job = this.current();
    if (!job) return null;
    return job.steps[this.step];
  }

  refreshBeacon() {
    const target = this.stepTarget();
    this.beacon = target ? { x: target.x, z: target.z } : null;
  }

  startJob() {
    const job = this.current();
    if (!job) return null;
    if (job.wantedAtStart) this.pendingWanted = job.wantedAtStart;
    if (job.timed) this.timerLeft = job.timed;
    this.refreshBeacon();
    return job;
  }

  // Returns events for the main loop: step, complete, jobDone, timedOut.
  update(dt, playerX, playerZ) {
    const events = [];
    if (this.done) return events;
    const job = this.current();
    if (!job) return events;
    if (job.timed && this.timerLeft > 0) {
      this.timerLeft -= dt;
      if (this.timerLeft <= 0) {
        this.timerLeft = 0;
        events.push({ type: 'timedOut', job });
        this.advanceJob(events);
        return events;
      }
    }
    const target = this.stepTarget();
    if (target && Math.hypot(target.x - playerX, target.z - playerZ) < 6) {
      this.step++;
      if (this.step >= job.steps.length) {
        events.push({ type: 'jobDone', job });
        if (job.wantedOnComplete) events.push({ type: 'wanted', stars: job.wantedOnComplete });
        this.advanceJob(events);
      } else {
        events.push({ type: 'step', job, step: this.step });
        this.refreshBeacon();
      }
    }
    return events;
  }

  advanceJob(events) {
    this.index++;
    this.step = 0;
    this.timerLeft = 0;
    if (this.index >= MISSIONS.length) {
      this.done = true;
      this.beacon = null;
      events.push({ type: 'allDone' });
    } else {
      const next = this.startJob();
      events.push({ type: 'jobStart', job: next });
    }
  }

  missionText() {
    if (this.done) return '';
    const target = this.stepTarget();
    return target ? target.text : '';
  }

  missionDistance(playerX, playerZ) {
    if (!this.beacon) return 0;
    return Math.hypot(this.beacon.x - playerX, this.beacon.z - playerZ);
  }
}

// Ten glowing crates hidden around the city, placed by seeded RNG.
export function placePackages(rng) {
  const spots = [];
  const used = new Set();
  while (spots.length < PACKAGE_COUNT) {
    const x = Math.round(rng.range(-110, 105));
    const z = Math.round(rng.range(-110, 110));
    const key = x + ',' + z;
    if (used.has(key)) continue;
    if (Math.abs(x - 14) < 12 && Math.abs(z - 14) < 12) continue;
    used.add(key);
    spots.push({ x, z, taken: false });
  }
  return spots;
}

// A waving ped flags a taxi: pick them up, deliver, get paid. One fare at
// a time, 60 seconds on the meter.
export class TaxiJob {
  constructor(rng) {
    this.rng = rng;
    this.active = false;
    this.pickup = null;
    this.dropoff = null;
    this.timerLeft = 0;
    this.cooldown = 8;
    this.pickupX = 0;
    this.pickupZ = 0;
  }

  update(dt, playerX, playerZ, inCar) {
    const events = [];
    this.cooldown -= dt;
    if (!this.active) {
      if (this.cooldown <= 0 && inCar) {
        this.active = true;
        this.pickupX = Math.round(this.rng.range(-90, 90));
        this.pickupZ = Math.round(this.rng.range(-90, 90));
        this.pickup = { x: this.pickupX, z: this.pickupZ };
        this.timerLeft = 0;
        events.push({ type: 'taxiOffer', x: this.pickupX, z: this.pickupZ });
      }
      return events;
    }
    if (!this.pickup) {
      // Passenger aboard: drive to the dropoff before the meter runs out.
      this.timerLeft -= dt;
      if (this.timerLeft <= 0) {
        this.active = false;
        this.cooldown = 20;
        events.push({ type: 'taxiFail' });
      } else if (Math.hypot(this.dropoff.x - playerX, this.dropoff.z - playerZ) < 7) {
        this.active = false;
        this.cooldown = 25;
        events.push({ type: 'taxiPaid', fare: TAXI_FARE });
      }
      return events;
    }
    if (inCar && Math.hypot(this.pickup.x - playerX, this.pickup.z - playerZ) < 6) {
      this.pickup = null;
      this.dropoff = {
        x: Math.round(this.rng.range(-100, 100)),
        z: Math.round(this.rng.range(-100, 100)),
      };
      this.timerLeft = 60;
      events.push({ type: 'taxiPickup', x: this.dropoff.x, z: this.dropoff.z });
    }
    return events;
  }
}

export { PACKAGE_VALUE };
