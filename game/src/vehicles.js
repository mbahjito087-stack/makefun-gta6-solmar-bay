// Vehicles: traffic, parked cars, police cruisers, the helicopter and
// roadblocks. Cars are simple grouped meshes with headlights and taillights;
// their behaviour is what makes them feel alive.

import * as THREE from 'three';
import { CAR_STYLES, PARKED_SPOTS, ROAD_LINES, TRAFFIC_COUNT, WORLD_HALF } from './config.js';

const TRAFFIC_COLORS = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad, 0xecf0f1, 0x2c3e50, 0xe67e22];

export function makeCarMesh(styleName, color, isPolice) {
  const style = CAR_STYLES[styleName];
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1a1a22 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(style.width, style.height * 0.62, style.length), bodyMat);
  body.position.y = style.height * 0.42;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(style.width * 0.86, style.height * 0.55, style.length * 0.48),
    new THREE.MeshLambertMaterial({ color: 0x18202c })
  );
  cabin.position.set(0, style.height * 0.95, -style.length * 0.05);
  cabin.castShadow = true;
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0c0c0e });
  const wheels = [];
  for (const [wx, wz] of [
    [-style.width / 2, style.length * 0.32], [style.width / 2, style.length * 0.32],
    [-style.width / 2, -style.length * 0.32], [style.width / 2, -style.length * 0.32],
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    g.add(wheel);
    wheels.push(wheel);
  }
  // Headlights and taillights glow at dusk.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const hx of [-style.width * 0.32, style.width * 0.32]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.08), headMat);
    head.position.set(hx, style.height * 0.42, style.length / 2 + 0.02);
    g.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.08), tailMat);
    tail.position.set(hx, style.height * 0.42, -style.length / 2 - 0.02);
    g.add(tail);
  }
  let lightbar = null;
  if (isPolice) {
    lightbar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.x = -0.3;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    blue.position.x = 0.3;
    lightbar.add(red);
    lightbar.add(blue);
    lightbar.position.set(0, style.height * 1.32, -style.length * 0.05);
    lightbar.userData.red = red;
    lightbar.userData.blue = blue;
    g.add(lightbar);
  }
  g.userData.wheels = wheels;
  g.userData.lightbar = lightbar;
  return g;
}

export function createParkedCars(scene) {
  const cars = [];
  for (const spot of PARKED_SPOTS) {
    const mesh = makeCarMesh(spot.style, spot.color, false);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = 0;
    scene.add(mesh);
    cars.push({
      mesh, x: spot.x, z: spot.z, heading: 0, speed: 0,
      style: spot.style, topSpeed: CAR_STYLES[spot.style].topSpeed,
      health: 100, parked: true, isPolice: false, smoke: 0,
    });
  }
  return cars;
}

export function createTraffic(scene, rng) {
  const cars = [];
  const styles = ['sedan', 'sedan', 'van', 'sports'];
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const horizontal = rng.chance(0.5);
    const line = rng.pick(ROAD_LINES);
    const dir = rng.sign();
    const style = rng.pick(styles);
    const mesh = makeCarMesh(style, rng.pick(TRAFFIC_COLORS), false);
    const along = rng.range(-WORLD_HALF, WORLD_HALF);
    const lane = dir * 2.6;
    const x = horizontal ? along : line + lane;
    const z = horizontal ? line + lane : along;
    const heading = horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    scene.add(mesh);
    cars.push({
      mesh, x, z, heading, speed: rng.range(8, 14),
      style, topSpeed: CAR_STYLES[style].topSpeed,
      health: 100, horizontal, dir, line, parked: false, isPolice: false,
      smoke: 0, distance: 0, nextTurnAt: rng.range(40, 140),
    });
  }
  return cars;
}

// Traffic drives its road; at an intersection, once it has covered enough
// ground, it may turn. Turns are decided by distance travelled, never by
// frame count, so the same seed drives the same routes.
export function updateTraffic(cars, dt, rng) {
  for (const car of cars) {
    const step = car.speed * dt;
    car.distance += step;
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.x += fx * step;
    car.z += fz * step;
    const nearLine = ROAD_LINES.some((l) => Math.abs((car.horizontal ? car.z : car.x) - l) < 6);
    if (nearLine && car.distance > car.nextTurnAt && rng.chance(0.5)) {
      car.horizontal = !car.horizontal;
      car.heading += rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
      car.nextTurnAt = car.distance + rng.range(50, 160);
      const lane = car.dir * 2.6;
      if (car.horizontal) car.z = Math.round(car.z / 30) * 30 + lane;
      else car.x = Math.round(car.x / 30) * 30 + lane;
    }
    if (car.x > WORLD_HALF + 10) car.x = -WORLD_HALF - 10;
    if (car.x < -WORLD_HALF - 10) car.x = WORLD_HALF + 10;
    if (car.z > WORLD_HALF + 10) car.z = -WORLD_HALF - 10;
    if (car.z < -WORLD_HALF - 10) car.z = WORLD_HALF + 10;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    for (const w of car.mesh.userData.wheels) w.rotation.x += step * 2.4;
  }
}

export function createPoliceCruiser(scene, x, z) {
  const mesh = makeCarMesh('sedan', 0x1a1a22, true);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh, x, z, heading: 0, speed: 0,
    style: 'sedan', topSpeed: 40, health: 100,
    parked: false, isPolice: true, smoke: 0,
  };
}

export function createHelicopter(scene) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.4, 4.6),
    new THREE.MeshLambertMaterial({ color: 0x1a1a22 })
  );
  body.position.y = 0;
  g.add(body);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 3.4),
    new THREE.MeshLambertMaterial({ color: 0x1a1a22 })
  );
  tail.position.set(0, 0.3, -3.6);
  g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x333338 }));
  rotor.position.y = 1.0;
  g.add(rotor);
  const lamp = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 14, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
  );
  lamp.position.y = -7.5;
  lamp.rotation.x = Math.PI;
  g.add(lamp);
  scene.add(g);
  return { mesh: g, rotor, lamp, x: 0, z: 0, angle: 0, active: false };
}

export function updateHelicopter(heli, world, dt) {
  if (!heli.active) {
    heli.mesh.visible = false;
    return;
  }
  heli.mesh.visible = true;
  heli.angle += dt * 0.18;
  heli.x = world.player.x + Math.cos(heli.angle) * 30;
  heli.z = world.player.z + Math.sin(heli.angle) * 30;
  heli.mesh.position.set(heli.x, 22, heli.z);
  heli.mesh.rotation.y = -heli.angle;
  heli.rotor.rotation.y += dt * 22;
  // Spotlight cone stays aimed at the player below.
  heli.lamp.lookAt(world.player.x, 0, world.player.z);
  heli.lamp.rotateX(Math.PI / 2);
}

// Police chase: steer toward the player, ram their car, and bust them on
// foot at 3+ stars. Returns events like 'busted' for the main loop.
export function updatePolice(police, world, dt) {
  const events = [];
  const px = world.player.x;
  const pz = world.player.z;
  for (const car of police) {
    const dx = px - car.x;
    const dz = pz - car.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const wantHeading = Math.atan2(dx, dz);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const targetSpeed = Math.min(40, 18 + world.wanted * 4.5);
    car.speed += Math.sign(targetSpeed - car.speed) * 14 * dt;
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
    // Flashing lightbar, alternating on the game clock.
    const bar = car.mesh.userData.lightbar;
    if (bar) {
      const phase = Math.floor(world.time * 6) % 2 === 0;
      bar.userData.red.material.color.setHex(phase ? 0xff2020 : 0x551010);
      bar.userData.blue.material.color.setHex(phase ? 0x101055 : 0x2040ff);
    }
    if (dist < 3.2 && world.player.inCar) {
      // Ram: shove the player's car and damage it.
      world.playerCar.health = Math.max(0, world.playerCar.health - 6 * dt * 10);
      world.playerCar.smoke = Math.max(world.playerCar.smoke, 0.6);
      world.damageFlash = 0.5;
      world.audio.thud();
      car.speed *= 0.55;
    }
    if (dist < 2.4 && !world.player.inCar && world.wanted >= 3) {
      events.push('busted');
    }
  }
  return events;
}

export function createRoadblock(scene, x, z, heading) {
  const mesh = makeCarMesh('sedan', 0x1a1a22, true);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, x, z, heading, speed: 0, style: 'sedan', topSpeed: 0, health: 100, parked: true, isPolice: true, smoke: 0 };
}

// Keep a car out of buildings: slide it along the wall it hit.
export function collideWithBuildings(car, colliders, radius) {
  for (const c of colliders) {
    if (car.x > c.minX - radius && car.x < c.maxX + radius && car.z > c.minZ - radius && car.z < c.maxZ + radius) {
      const pushLeft = car.x - (c.minX - radius);
      const pushRight = (c.maxX + radius) - car.x;
      const pushUp = car.z - (c.minZ - radius);
      const pushDown = (c.maxZ + radius) - car.z;
      const min = Math.min(pushLeft, pushRight, pushUp, pushDown);
      if (min === pushLeft) car.x = c.minX - radius;
      else if (min === pushRight) car.x = c.maxX + radius;
      else if (min === pushUp) car.z = c.minZ - radius;
      else car.z = c.maxZ + radius;
      car.speed *= 0.4;
      if (car.health !== undefined) car.health = Math.max(0, car.health - 4);
      car.smoke = Math.max(car.smoke || 0, 0.8);
    }
  }
  car.x = Math.max(-WORLD_HALF - 8, Math.min(WORLD_HALF + 8, car.x));
  car.z = Math.max(-WORLD_HALF - 8, Math.min(WORLD_HALF + 8, car.z));
}
