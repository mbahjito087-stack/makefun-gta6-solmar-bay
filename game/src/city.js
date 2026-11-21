// Solmar Bay, a sun-soaked harbour city built from scratch: no map, name or
// asset comes from any commercial game. Streets form a grid; every block holds
// one or two towers, a park, or a plaza, and every tower keeps an AABB the
// physics pushes the player and cars out of.
import * as THREE from 'three';
import { CITY_HALF, BLOCK, ROAD_W } from './config.js';
import { pick } from './random.js';

const WALL_COLORS = [0xd8c9a3, 0xc9b8a0, 0xb8c4cc, 0xe0d0b8, 0xc4a58a, 0x9fb4c0, 0xd9b8a6];
const ROOF_COLORS = [0x8a7a66, 0x6e7f8a, 0x9a8a7a, 0x7a6a58];

function windowTexture(random) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8ddc0';
  g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 16) {
    for (let x = 8; x < 56; x += 16) {
      g.fillStyle = random() < 0.5 ? '#2c3e50' : '#f5d76e';
      g.fillRect(x, y, 9, 10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function streetAt(v) {
  // True when the coordinate lies on a road centre line.
  const m = ((v + CITY_HALF) % BLOCK + BLOCK) % BLOCK;
  return m < ROAD_W || m > BLOCK - ROAD_W / 2;
}

export function createCity(random) {
  const group = new THREE.Group();
  const colliders = [];
  const streets = [];
  for (let i = -CITY_HALF; i <= CITY_HALF; i += BLOCK) streets.push(i);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2, CITY_HALF * 2),
    new THREE.MeshLambertMaterial({ color: 0x7a8a6a }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33363b });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x9a938a });
  for (const s of streets) {
    const roadX = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.1, CITY_HALF * 2), roadMat);
    roadX.position.set(s, 0.05, 0);
    group.add(roadX);
    const roadZ = new THREE.Mesh(new THREE.BoxGeometry(CITY_HALF * 2, 0.1, ROAD_W), roadMat);
    roadZ.position.set(0, 0.05, s);
    group.add(roadZ);
    const walkX = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 6, 0.12, CITY_HALF * 2), walkMat);
    walkX.position.set(s, 0.04, 0);
    group.add(walkX);
  }

  // Centre-line dashes down every street.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  for (const s of streets) {
    for (let d = -CITY_HALF + 15; d < CITY_HALF; d += 30) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 4), dashMat);
      dash.position.set(s, 0.08, d);
      group.add(dash);
    }
  }

  // Towers, parks and plazas, one per block.
  const tex = windowTexture(random);
  for (let bx = -CITY_HALF + BLOCK / 2; bx < CITY_HALF; bx += BLOCK) {
    for (let bz = -CITY_HALF + BLOCK / 2; bz < CITY_HALF; bz += BLOCK) {
      if (Math.abs(bx) < 10 && Math.abs(bz) < 10) continue; // Marina Plaza, the spawn.
      const roll = random();
      if (roll < 0.18) {
        const park = new THREE.Mesh(
          new THREE.BoxGeometry(BLOCK - ROAD_W, 0.3, BLOCK - ROAD_W),
          new THREE.MeshLambertMaterial({ color: 0x4f8a4a }),
        );
        park.position.set(bx, 0.15, bz);
        group.add(park);
        for (let t = 0; t < 3; t++) {
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
          tree.position.set(bx + (random() - 0.5) * 30, 0.3, bz + (random() - 0.5) * 30);
          group.add(tree);
        }
        continue;
      }
      const w = 16 + random() * 18;
      const d = 16 + random() * 18;
      const h = 10 + random() * 38;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ map: tex, color: pick(random, WALL_COLORS) }),
      );
      tower.position.set(bx, h / 2, bz);
      group.add(tower);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 1, 1, d + 1),
        new THREE.MeshLambertMaterial({ color: pick(random, ROOF_COLORS) }),
      );
      roof.position.set(bx, h + 0.5, bz);
      group.add(roof);
      colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
    }
  }

  // Marina Plaza: fountain and palms at the spawn.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 8, 1.2, 16),
    new THREE.MeshLambertMaterial({ color: 0x4a90c2 }),
  );
  fountain.position.set(0, 0.6, 0);
  group.add(fountain);
  colliders.push({ minX: -8, maxX: 8, minZ: -8, maxZ: 8 });

  // The harbour: blue water along the south edge.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2, 60),
    new THREE.MeshLambertMaterial({ color: 0x2a6ea8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.02, CITY_HALF + 30);
  group.add(sea);

  return { group, colliders, streets };
}

// Push a circle (x, z, radius) out of every building AABB it overlaps.
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
  p.x = Math.max(-CITY_HALF + 2, Math.min(CITY_HALF - 2, p.x));
  p.z = Math.max(-CITY_HALF + 2, Math.min(CITY_HALF - 2, p.z));
}
