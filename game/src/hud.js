// The HUD: cash, health and armour bars, wanted stars, district name,
// mission tracker with distance and timer, speed, radio station, and a
// live top-down minimap drawn on a 2D canvas from the same world positions.
import { MAX_WANTED, WORLD_HALF, DISTRICTS } from './config.js';

const DISTRICT_COLORS = Object.fromEntries(DISTRICTS.map((d) => [d.name, d.color]));

export function districtColor(name) {
  return DISTRICT_COLORS[name] ?? '#ffffff';
}

export function createHud() {
  const el = (id) => document.getElementById(id);
  const hud = {
    cash: el('cash'),
    health: el('health'),
    armour: el('armour'),
    stars: el('stars'),
    district: el('district'),
    mission: el('mission'),
    speed: el('speed'),
    radio: el('radio'),
    banner: el('banner'),
    vignette: el('vignette'),
    popups: el('popups'),
    map: el('minimap').getContext('2d'),
    showBanner(text) {
      this.banner.textContent = text;
      this.banner.style.opacity = '1';
      clearTimeout(this._bannerTimer);
      this._bannerTimer = setTimeout(() => { this.banner.style.opacity = '0'; }, 2600);
    },
    cashPopup(text) {
      const d = document.createElement('div');
      d.className = 'cash-pop';
      d.textContent = text;
      this.popups.appendChild(d);
      setTimeout(() => d.remove(), 1800);
    },
    flashDamage() {
      this.vignette.style.opacity = '0.85';
      setTimeout(() => { this.vignette.style.opacity = '0'; }, 220);
    },
    update(s) {
      this.cash.textContent = `$${s.cash}`;
      this.health.style.width = `${Math.max(0, s.health)}%`;
      this.health.style.background = s.health > 50 ? '#2ecc71' : s.health > 25 ? '#f39c12' : '#e74c3c';
      this.armour.style.width = `${Math.max(0, s.armour)}%`;
      this.stars.textContent = '★'.repeat(s.wanted) + '☆'.repeat(MAX_WANTED - s.wanted);
      this.district.textContent = s.district;
      this.district.style.color = s.districtColor;
      const timer = s.timer > 0 ? ` · ⏱ ${Math.ceil(s.timer)}s` : '';
      this.mission.textContent = s.missionDone
        ? 'All jobs done — enjoy Solmar Bay'
        : `Job ${s.missionIndex + 1}/6 · ${s.missionName} — ${s.objective} · ${Math.round(s.distance)}m${timer}`;
      this.speed.textContent = s.inCar
        ? `${Math.round(s.speed * 3.6)} km/h · ${s.carModel} · ${s.carStyle}`
        : 'On foot';
      this.radio.textContent = `♪ ${s.station}`;
    },
    drawMap(world, clock) {
      const g = this.map;
      const S = 180;
      const px = (v) => ((v + WORLD_HALF) / (WORLD_HALF * 2)) * S;
      // District tints, one per quadrant, with the sea along the south.
      g.fillStyle = '#20242e';
      g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(232, 182, 76, 0.20)';
      g.fillRect(px(-45), px(-45), px(45) - px(-45), px(45) - px(-45));
      g.fillStyle = 'rgba(126, 200, 80, 0.16)';
      g.fillRect(0, 0, S, px(-45));
      g.fillStyle = 'rgba(255, 95, 162, 0.18)';
      g.fillRect(px(45), 0, S - px(45), S);
      g.fillStyle = 'rgba(79, 195, 232, 0.22)';
      g.fillRect(0, px(45), S, S - px(45));
      g.fillStyle = '#3a3f46';
      for (let s = -WORLD_HALF; s <= WORLD_HALF; s += 60) {
        g.fillRect(px(s) - 3.5, 0, 7, S);
        g.fillRect(0, px(s) - 3.5, S, 7);
      }
      // Pulsing gold target.
      const pulse = 4 + Math.sin(clock * 3) * 1.5;
      g.fillStyle = '#ffd700';
      g.beginPath();
      g.arc(px(world.target.x), px(world.target.z), pulse, 0, 7);
      g.fill();
      g.strokeStyle = '#ffd700';
      g.beginPath();
      g.arc(px(world.target.x), px(world.target.z), pulse + 4, 0, 7);
      g.stroke();
      for (const c of world.cars) {
        g.fillStyle = '#9aa5b1';
        g.fillRect(px(c.x) - 1, px(c.z) - 1, 3, 3);
      }
      for (const p of world.police) {
        g.fillStyle = '#ff3333';
        g.fillRect(px(p.x) - 2, px(p.z) - 2, 4, 4);
      }
      if (world.heli) {
        g.fillStyle = '#ffe14d';
        g.beginPath();
        g.arc(px(world.heli.x), px(world.heli.z), 4, 0, 7);
        g.fill();
      }
      // Player arrow, rotated to the camera heading.
      g.fillStyle = '#ffffff';
      g.save();
      g.translate(px(world.player.x), px(world.player.z));
      g.rotate(world.player.angle);
      g.beginPath();
      g.moveTo(0, -6);
      g.lineTo(4, 5);
      g.lineTo(-4, 5);
      g.closePath();
      g.fill();
      g.restore();
      // North indicator.
      g.fillStyle = '#ffffff';
      g.font = 'bold 11px system-ui, sans-serif';
      g.fillText('N', 4, 13);
    },
  };
  return hud;
}
