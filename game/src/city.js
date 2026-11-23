// Solmar Bay itself: golden-hour streets, four districts, the harbour,
// neon, palms and beach. Built once from a seeded RNG, so seed 7 always
// draws the same skyline.

import * as THREE from 'three';
import { WORLD_HALF, ROAD_LINES, ROAD_WIDTH, districtAt } from './config.js';

function litWindowTexture(rng, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  // Warm tan walls: the building colour multiplies this, so the wall reads
  // as a sunlit facade with dark and lit windows punched into it.
  g.fillStyle = '#b9a48f';
  g.fillRect(0, 0, 64, 128);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      const lit = rng.next() < litRatio;
      g.fillStyle = lit ? (rng.next() < 0.6 ? '#ffd27a' : '#9fd8ff') : '#4a4038';
      g.fillRect(6 + col * 14, 8 + row * 15, 9, 10);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2b1b4d');
  grad.addColorStop(0.35, '#8a3d6b');
  grad.addColorStop(0.6, '#ff7e5f');
  grad.addColorStop(0.8, '#feb47b');
  grad.addColorStop(1, '#ffd194');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];

  // Sky dome + warm fog: the golden hour lives here.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false })
  );
  group.add(sky);
  scene.fog = new THREE.Fog(0xe88a5f, 120, 380);

  // Ground: warm asphalt-grey base for the whole island.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2 + 60, WORLD_HALF * 2 + 60),
    new THREE.MeshLambertMaterial({ color: 0x5a5248 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Roads: one textured ribbon per road line — asphalt with a dashed
  // centreline and edge lines baked into a canvas, so the city costs
  // fourteen draw calls instead of hundreds of little dashes. The canvas
  // is wide along the road: its horizontal axis runs down the street.
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 256;
  roadCanvas.height = 64;
  const rg = roadCanvas.getContext('2d');
  rg.fillStyle = '#3a3a44';
  rg.fillRect(0, 0, 256, 64);
  rg.fillStyle = '#d8c26a';
  rg.fillRect(16, 30, 48, 4);
  rg.fillRect(144, 30, 48, 4);
  rg.fillStyle = '#cfcfd8';
  rg.fillRect(0, 3, 256, 2);
  rg.fillRect(0, 59, 256, 2);
  const roadTex = new THREE.CanvasTexture(roadCanvas);
  roadTex.colorSpace = THREE.SRGBColorSpace;
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(10, 1);
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  const walkMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  for (const line of ROAD_LINES) {
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_HALF * 2 + 20, ROAD_WIDTH), roadMat);
      road.rotation.x = -Math.PI / 2;
      if (!horizontal) road.rotation.z = Math.PI / 2;
      road.position.set(horizontal ? 0 : line, 0.02, horizontal ? line : 0);
      road.receiveShadow = true;
      group.add(road);
      // Crosswalk stripes near the central intersections.
      for (const cross of [-30, 30]) {
        for (let s = -4; s <= 4; s += 2) {
          const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 8), walkMat);
          stripe.rotation.x = -Math.PI / 2;
          stripe.position.set(horizontal ? cross + s : line + s, 0.05, horizontal ? line + 5.6 : cross + 5.6);
          if (!horizontal) stripe.rotation.z = Math.PI / 2;
          group.add(stripe);
        }
      }
    }
  }

  // Beach strip and harbour water on the east edge.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(9, WORLD_HALF * 2 + 20),
    new THREE.MeshLambertMaterial({ color: 0xd9b380 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(96, 0.03, 0);
  group.add(sand);
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x1f7f9e, transparent: true, opacity: 0.86, shininess: 120, specular: 0xffb36b,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(46, WORLD_HALF * 2 + 40), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(124, 0.05, 0);
  group.add(water);

  // Buildings: one lit-window texture per district mood, boxes of seeded
  // height on every block that is not a road or the plaza.
  const windowTexes = [litWindowTexture(rng, 0.55), litWindowTexture(rng, 0.4), litWindowTexture(rng, 0.7)];
  const districtPalette = {
    Harbour: [0x4a9aa0, 0x5aa8b0, 0x3f8a90],
    'Neon Row': [0x7a4a8e, 0x8e4a7a, 0x5a4a9e],
    'North Market': [0xb08a4a, 0x9a7a4a, 0xc09a5a],
    'Marina Plaza': [0x9a6a50, 0xa87a5a, 0x8a5a44],
  };
  const neonColors = [0xff2e88, 0x2ec4ff, 0xffe14d, 0x7dff5e];
  const neonSigns = [];
  const blockCenters = [];
  for (let gx = -120; gx <= 120; gx += 30) {
    for (let gz = -120; gz <= 120; gz += 30) {
      blockCenters.push([gx + 15, gz + 15]);
    }
  }
  for (const [bx, bz] of blockCenters) {
    // Keep the plaza around the spawn open, and the harbour clear.
    if (Math.abs(bx) < 28 && Math.abs(bz - 14) < 28) continue;
    if (bx > 88) continue;
    const district = districtAt(bx, bz);
    const palette = districtPalette[district.name];
    const count = rng.int(1, 2);
    for (let i = 0; i < count; i++) {
      const w = rng.range(9, 16);
      const d = rng.range(9, 16);
      const h = rng.range(9, district.name === 'Marina Plaza' ? 34 : 24);
      // Keep the tower inside its block, clear of the roads around it.
      const maxOffX = Math.max(0, 15 - w / 2 - 3);
      const maxOffZ = Math.max(0, 15 - d / 2 - 3);
      const x = bx + Math.max(-maxOffX, Math.min(maxOffX, (i === 0 ? -4 : 5) + rng.range(-2, 2)));
      const z = bz + Math.max(-maxOffZ, Math.min(maxOffZ, rng.range(-4, 4)));
      const color = rng.pick(palette);
      const mat = new THREE.MeshLambertMaterial({ color, map: windowTexes[rng.int(0, 2)] });
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      tower.position.set(x, h / 2, z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      group.add(tower);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      // Rooftop clutter: AC unit and antenna.
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.6), new THREE.MeshLambertMaterial({ color: 0x8a8a92 }));
      ac.position.set(x - w / 4, h + 0.5, z);
      group.add(ac);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 5), new THREE.MeshLambertMaterial({ color: 0x55555e }));
      antenna.position.set(x + w / 4, h + 2, z);
      group.add(antenna);
      // Neon sign boxes on Neon Row and Marina towers.
      if ((district.name === 'Neon Row' || district.name === 'Marina Plaza') && rng.chance(0.55)) {
        const signColor = rng.pick(neonColors);
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, rng.range(1.5, 3.5), rng.range(3, 6)),
          new THREE.MeshBasicMaterial({ color: signColor })
        );
        sign.position.set(x + w / 2 + 0.3, h * rng.range(0.45, 0.7), z);
        group.add(sign);
        neonSigns.push(sign);
      }
    }
  }

  // Palm rows along the marina, trees scattered in the other districts.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  const palmMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3fae6a });
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 5.5, 6), trunkMat);
    trunk.position.y = 2.75;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 4), palmMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.1, 5.6, Math.sin(a) * 1.1);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    group.add(g);
  }
  function tree(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6), trunkMat);
    trunk.position.y = 1.2;
    g.add(trunk);
    const top = new THREE.Mesh(new THREE.SphereGeometry(rng.range(1.6, 2.4), 8, 6), leafMat);
    top.position.y = 3.4;
    top.castShadow = true;
    g.add(top);
    g.position.set(x, 0, z);
    group.add(g);
  }
  for (let z = -100; z <= 100; z += 20) {
    palm(94, z + rng.range(-3, 3));
    palm(-14 + rng.range(-2, 2), z + 8);
  }
  for (let i = 0; i < 26; i++) {
    const x = rng.range(-110, 88);
    const z = rng.range(-110, 110);
    if (ROAD_LINES.some((l) => Math.abs(x - l) < 7 || Math.abs(z - l) < 7)) continue;
    if (Math.abs(x) < 28 && Math.abs(z - 14) < 28) continue;
    tree(x, z);
  }

  // Streetlights that glow at dusk, on every other intersection.
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a32 });
  const lamps = [];
  for (const lx of [-60, 0, 60]) {
    for (const lz of [-60, 0, 60]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
      pole.position.set(lx + 6, 3, lz + 6);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampGlowMat);
      bulb.position.set(lx + 6, 6.1, lz + 6);
      group.add(bulb);
      lamps.push(bulb);
    }
  }

  // District name boards floating over the plaza and the neon strip.
  function districtBoard(text, x, z, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const g = canvas.getContext('2d');
    g.fillStyle = 'rgba(10,10,18,0.72)';
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = color;
    g.font = 'bold 64px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 66);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    board.position.set(x, 12, z);
    group.add(board);
    return board;
  }
  const boards = [
    districtBoard('MARINA PLAZA', 0, -38, '#ff8c42'),
    districtBoard('NEON ROW', -78, -44, '#ff2e88'),
    districtBoard('HARBOUR', 82, -44, '#2ec4b6'),
  ];

  return {
    group, colliders, water, waterMat, neonSigns, lamps, boards,
    update(time, night) {
      // Animated harbour shimmer: the water breathes with the game clock.
      waterMat.opacity = night ? 0.7 : 0.86 + Math.sin(time * 0.9) * 0.05;
      water.position.y = 0.05 + Math.sin(time * 0.7) * 0.08;
      const glow = night ? 1.0 : 0.55 + Math.sin(time * 1.3) * 0.2;
      // Neon stays vivid at night and softer at golden hour.
      neonSigns.forEach((s, i) => {
        s.visible = true;
        s.scale.setScalar(night ? 1 : 0.9 + glow * 0.05 + (i % 3) * 0.01);
      });
      for (const b of lamps) b.material = lampGlowMat;
    },
  };
}
