// Solmar Bay at golden hour: a harbour city built from scratch — no map,
// name or asset comes from any commercial game. Streets form a grid; every
// block holds towers, a park or a plaza, and every tower keeps an AABB the
// physics pushes the player and cars out of. The four districts read
// differently: warm Marina Plaza at the centre, green North Market, pink
// Neon Row to the east, and the Harbour beach along the south water.
import * as THREE from 'three';
import { WORLD_HALF, BLOCK_SIZE, ROAD_WIDTH } from './config.js';
import { choice, range } from './random.js';

const FACADE = [0xd8c9a3, 0xc9b8a0, 0xb8c4cc, 0xe0d0b8, 0xc4a58a, 0x9fb4c0, 0xd9b8a6];
const ROOFTOP = [0x8a7a66, 0x6e7f8a, 0x9a8a7a, 0x7a6a58];
const NEON = [0xff5fa2, 0x39d0ff, 0xffe14d, 0x9d6bff, 0x4dffa6];

// Which district a point stands in: quadrants around the plaza.
export function districtAt(x, z) {
  if (Math.abs(x) < 45 && Math.abs(z) < 45) return 'Marina Plaza';
  if (z < -45) return 'North Market';
  if (x > 45) return 'Neon Row';
  return 'Harbour';
}

// True when the coordinate lies on a road centre line.
export function streetAt(v) {
  const m = ((v + WORLD_HALF) % BLOCK_SIZE + BLOCK_SIZE) % BLOCK_SIZE;
  return m < ROAD_WIDTH || m > BLOCK_SIZE - ROAD_WIDTH / 2;
}

// Dusk windows: most panes dark, some lit amber — the city lights up as
// the sun drops.
function duskWindowTexture(random) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8ddc0';
  g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 16) {
    for (let x = 8; x < 56; x += 16) {
      const lit = random();
      g.fillStyle = lit < 0.42 ? '#f7b733' : lit < 0.55 ? '#ff8c5a' : '#2c3e50';
      g.fillRect(x, y, 9, 10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePalm(random) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.45, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0x7a5a38 }),
  );
  trunk.position.y = 3;
  trunk.rotation.z = range(random, -0.08, 0.08);
  palm.add(trunk);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f8a3a });
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 3.4), frondMat);
    const a = (i / 6) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.4, 6.1, Math.sin(a) * 1.4);
    frond.rotation.y = -a;
    frond.rotation.x = 0.5;
    palm.add(frond);
  }
  const coconuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2f }),
  );
  coconuts.position.y = 5.8;
  palm.add(coconuts);
  return palm;
}

function makeTree(random) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2f }),
  );
  trunk.position.y = 1.5;
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x2f7a33 }),
  );
  top.position.y = 4.2;
  tree.add(trunk, top);
  tree.position.set((random() - 0.5) * 30, 0.3, (random() - 0.5) * 30);
  return tree;
}

export function createCity(random) {
  const group = new THREE.Group();
  const colliders = [];
  const streets = [];
  for (let i = -WORLD_HALF; i <= WORLD_HALF; i += BLOCK_SIZE) streets.push(i);

  // Ground: warm sand-toned earth under the streets.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2, WORLD_HALF * 2),
    new THREE.MeshLambertMaterial({ color: 0x8a7a5e }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Roads, sidewalks, centre dashes, crosswalks and stop lines.
  const asphalt = new THREE.MeshLambertMaterial({ color: 0x33363b });
  const pavement = new THREE.MeshLambertMaterial({ color: 0x9a938a });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (const s of streets) {
    const roadX = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.12, WORLD_HALF * 2), asphalt);
    roadX.position.set(s, 0.06, 0);
    group.add(roadX);
    const roadZ = new THREE.Mesh(new THREE.BoxGeometry(WORLD_HALF * 2, 0.12, ROAD_WIDTH), asphalt);
    roadZ.position.set(0, 0.06, s);
    group.add(roadZ);
    const walkX = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH + 6, 0.1, WORLD_HALF * 2), pavement);
    walkX.position.set(s, 0.035, 0);
    group.add(walkX);
    const walkZ = new THREE.Mesh(new THREE.BoxGeometry(WORLD_HALF * 2, 0.1, ROAD_WIDTH + 6), pavement);
    walkZ.position.set(0, 0.035, s);
    group.add(walkZ);
    for (let d = -WORLD_HALF + 15; d < WORLD_HALF; d += 30) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 4), dashMat);
      dash.position.set(s, 0.13, d);
      group.add(dash);
      const dashZ = new THREE.Mesh(new THREE.BoxGeometry(4, 0.14, 0.6), dashMat);
      dashZ.position.set(d, 0.13, s);
      group.add(dashZ);
    }
    // Zebra crosswalks where streets meet.
    for (const t of streets) {
      for (let k = -2; k <= 2; k++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.13, 5.5), stripeMat);
        stripe.position.set(s + k * 2.4, 0.13, t - ROAD_WIDTH / 2 - 1);
        group.add(stripe);
      }
    }
  }

  // Streetlights that glow at dusk, one per intersection corner.
  const lampPosts = [];
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  for (const sx of streets) {
    for (const sz of streets) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), poleMat);
      pole.position.set(sx + 8, 3.5, sz + 8);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
      bulb.position.set(sx + 8, 7.1, sz + 8);
      group.add(bulb);
      lampPosts.push(bulb);
    }
  }

  // Towers, parks and plazas, one per block.
  const tex = duskWindowTexture(random);
  const neonSigns = [];
  for (let bx = -WORLD_HALF + BLOCK_SIZE / 2; bx < WORLD_HALF; bx += BLOCK_SIZE) {
    for (let bz = -WORLD_HALF + BLOCK_SIZE / 2; bz < WORLD_HALF; bz += BLOCK_SIZE) {
      if (Math.abs(bx) < 10 && Math.abs(bz) < 10) continue; // Marina Plaza, the spawn.
      const roll = random();
      if (roll < 0.16) {
        const park = new THREE.Mesh(
          new THREE.BoxGeometry(BLOCK_SIZE - ROAD_WIDTH, 0.3, BLOCK_SIZE - ROAD_WIDTH),
          new THREE.MeshLambertMaterial({ color: 0x4f8a4a }),
        );
        park.position.set(bx, 0.15, bz);
        group.add(park);
        for (let t = 0; t < 3; t++) {
          const tree = makeTree(random);
          tree.position.x += bx;
          tree.position.z += bz;
          group.add(tree);
        }
        continue;
      }
      const w = 16 + random() * 18;
      const d = 16 + random() * 18;
      const h = 10 + random() * 38;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ map: tex, color: choice(random, FACADE) }),
      );
      tower.position.set(bx, h / 2, bz);
      group.add(tower);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 1, 1, d + 1),
        new THREE.MeshLambertMaterial({ color: choice(random, ROOFTOP) }),
      );
      roof.position.set(bx, h + 0.5, bz);
      group.add(roof);
      // Rooftop clutter: AC units and an antenna, so roofs are not flat slabs.
      const ac = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.1, 2.4),
        new THREE.MeshLambertMaterial({ color: 0x5a5a60 }),
      );
      ac.position.set(bx + w * 0.2, h + 1.5, bz - d * 0.15);
      group.add(ac);
      if (random() < 0.5) {
        const antenna = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 6, 5),
          new THREE.MeshLambertMaterial({ color: 0x888888 }),
        );
        antenna.position.set(bx - w * 0.25, h + 4, bz + d * 0.2);
        group.add(antenna);
      }
      // Neon Row towers wear glowing sign boxes.
      if (bx > 45 && random() < 0.55) {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 2.2, 6),
          new THREE.MeshBasicMaterial({ color: choice(random, NEON) }),
        );
        sign.position.set(bx + w / 2 + 0.4, h * 0.6, bz);
        group.add(sign);
        neonSigns.push(sign);
      }
      colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
    }
  }

  // Marina Plaza: fountain ringed by palms at the spawn.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 8, 1.2, 16),
    new THREE.MeshLambertMaterial({ color: 0x4a90c2 }),
  );
  fountain.position.set(0, 0.6, 0);
  group.add(fountain);
  colliders.push({ minX: -8, maxX: 8, minZ: -8, maxZ: 8 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const palm = makePalm(random);
    palm.position.set(Math.cos(a) * 16, 0, Math.sin(a) * 16);
    group.add(palm);
  }

  // The beach strip, then the harbour water along the south edge.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2, 22),
    new THREE.MeshLambertMaterial({ color: 0xe0c98f }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, WORLD_HALF - 11);
  group.add(sand);
  for (let i = 0; i < 10; i++) {
    const palm = makePalm(random);
    palm.position.set(-WORLD_HALF + 20 + i * 36 + range(random, -6, 6), 0, WORLD_HALF - 16);
    group.add(palm);
  }
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2, 60),
    new THREE.MeshLambertMaterial({ color: 0x2a6ea8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.02, WORLD_HALF + 30);
  group.add(sea);

  return { group, colliders, streets, sea, lampPosts, neonSigns };
}

// Push a circle (x, z, radius) out of every building AABB it overlaps,
// then clamp it inside the city.
export function collideCircle(colliders, p, radius) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(p.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
    const dx = p.x - nx;
    const dz = p.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        p.x = nx + (dx / d) * radius;
        p.z = nz + (dz / d) * radius;
      } else {
        p.x = c.maxX + radius;
      }
    }
  }
  p.x = Math.max(-WORLD_HALF + 2, Math.min(WORLD_HALF - 2, p.x));
  p.z = Math.max(-WORLD_HALF + 2, Math.min(WORLD_HALF - 2, p.z));
}
