// The HUD: cash, health, wanted stars, mission text, speed, and a live
// top-down minimap drawn on a 2D canvas from the same world positions.
import { MAX_WANTED } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  return {
    cash: el('cash'),
    health: el('health'),
    stars: el('stars'),
    mission: el('mission'),
    speed: el('speed'),
    banner: el('banner'),
    map: el('minimap').getContext('2d'),
    showBanner(text) {
      this.banner.textContent = text;
      this.banner.style.opacity = '1';
      setTimeout(() => { this.banner.style.opacity = '0'; }, 2600);
    },
    update(state) {
      this.cash.textContent = `$${state.cash}`;
      this.health.style.width = `${Math.max(0, state.health)}%`;
      this.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(MAX_WANTED - state.wanted);
      this.mission.textContent = `${state.missionName} — ${state.objective}`;
      this.speed.textContent = state.inCar ? `${Math.round(state.speed * 3.6)} km/h` : 'On foot';
    },
    drawMap(world) {
      const g = this.map;
      const S = 180;
      const px = (v) => ((v + 180) / 360) * S;
      g.fillStyle = '#10141a';
      g.fillRect(0, 0, S, S);
      g.fillStyle = '#3a3f46';
      for (let s = -180; s <= 180; s += 60) {
        g.fillRect(px(s) - 3.5, 0, 7, S);
        g.fillRect(0, px(s) - 3.5, S, 7);
      }
      g.fillStyle = '#ffd700';
      g.beginPath();
      g.arc(px(world.target.x), px(world.target.z), 5, 0, 7);
      g.fill();
      for (const c of world.cars) {
        g.fillStyle = '#9aa5b1';
        g.fillRect(px(c.x) - 1, px(c.z) - 1, 3, 3);
      }
      for (const p of world.police) {
        g.fillStyle = '#ff3333';
        g.fillRect(px(p.x) - 2, px(p.z) - 2, 4, 4);
      }
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
    },
  };
}
