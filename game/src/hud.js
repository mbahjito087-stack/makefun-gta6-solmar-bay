// HUD: cash, health, wanted stars, mission tracker, speedometer, the live
// minimap, cash popups, damage vignette and the title/pause/wasted/win
// screens. All DOM, no WebGL — the canvas minimap is the only drawing here.

import { WORLD_HALF, MISSIONS } from './config.js';

function starRow(wanted) {
  let out = '';
  for (let i = 0; i < 5; i++) out += i < wanted ? '★' : '☆';
  return out;
}

export class Hud {
  constructor(doc) {
    this.doc = doc;
    this.cashEl = doc.getElementById('cash');
    this.healthEl = doc.getElementById('health');
    this.armourEl = doc.getElementById('armour');
    this.starsEl = doc.getElementById('stars');
    this.missionEl = doc.getElementById('mission');
    this.speedEl = doc.getElementById('speed');
    this.districtEl = doc.getElementById('district');
    this.stationEl = doc.getElementById('station');
    this.packagesEl = doc.getElementById('packages');
    this.timerEl = doc.getElementById('timer');
    this.bannerEl = doc.getElementById('banner');
    this.vignetteEl = doc.getElementById('vignette');
    this.popupLayer = doc.getElementById('popups');
    this.map = doc.getElementById('minimap');
    this.mapCtx = this.map ? this.map.getContext('2d') : null;
    this.screenEl = doc.getElementById('screen');
    this.screenTitleEl = doc.getElementById('screen-title');
    this.screenBodyEl = doc.getElementById('screen-body');
    this.screenHintEl = doc.getElementById('screen-hint');
    this.lastCash = 0;
  }

  showScreen(kind, data) {
    // kind: title | paused | wasted | busted | win | none
    if (!this.screenEl) return;
    if (kind === 'none') {
      this.screenEl.style.display = 'none';
      return;
    }
    this.screenEl.style.display = 'flex';
    const d = data || {};
    if (kind === 'title') {
      this.screenTitleEl.textContent = 'SOLMAR BAY';
      this.screenBodyEl.textContent = 'Mara Voss Returns — an open-world crime story. Steal cars, outrun the law, run six jobs and take the Big Score.';
      this.screenHintEl.textContent = 'Click to start  •  WASD move / drive  •  E steal car  •  F punch  •  R radio  •  P pause';
    } else if (kind === 'paused') {
      this.screenTitleEl.textContent = 'PAUSED';
      this.screenBodyEl.textContent = 'Solmar Bay waits. Your cash is saved.';
      this.screenHintEl.textContent = 'Press P or click to resume';
    } else if (kind === 'wasted') {
      this.screenTitleEl.textContent = 'WASTED';
      this.screenBodyEl.textContent = 'Mara went down in Solmar Bay. Best cash $' + (d.best || 0) + '.';
      this.screenHintEl.textContent = 'Click to try again';
    } else if (kind === 'busted') {
      this.screenTitleEl.textContent = 'BUSTED';
      this.screenBodyEl.textContent = 'The Solmar Bay PD took Mara in. Best cash $' + (d.best || 0) + '.';
      this.screenHintEl.textContent = 'Click to try again';
    } else if (kind === 'win') {
      this.screenTitleEl.textContent = 'CLEAN GETAWAY';
      this.screenBodyEl.textContent = 'All six jobs done. Total take $' + (d.cash || 0) + ' — Mara Voss owns Solmar Bay.';
      this.screenHintEl.textContent = 'Click to keep cruising the city';
    }
  }

  popup(text, good) {
    if (!this.popupLayer) return;
    const el = this.doc.createElement('div');
    el.className = 'cash-pop' + (good === false ? ' bad' : '');
    el.textContent = text;
    this.popupLayer.appendChild(el);
    window.setTimeout(() => el.remove(), 1800);
  }

  flashBanner(text, ms) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = text;
    this.bannerEl.style.opacity = '1';
    window.clearTimeout(this.bannerEl._t);
    this.bannerEl._t = window.setTimeout(() => { this.bannerEl.style.opacity = '0'; }, ms || 2400);
  }

  setVignette(amount) {
    if (!this.vignetteEl) return;
    this.vignetteEl.style.opacity = String(Math.max(0, Math.min(0.85, amount)));
  }

  update(state) {
    if (this.cashEl) this.cashEl.textContent = '$' + state.cash;
    if (this.healthEl) {
      this.healthEl.textContent = '♥ ' + Math.max(0, Math.round(state.health));
      this.healthEl.style.color = state.health < 30 ? '#ff5252' : '#7dff8a';
    }
    if (this.armourEl) this.armourEl.textContent = '⛨ ' + Math.round(state.armour);
    if (this.starsEl) {
      this.starsEl.textContent = starRow(state.wanted);
      this.starsEl.style.color = state.wanted >= 4 ? '#ff5252' : '#ffd54a';
    }
    if (this.speedEl) this.speedEl.textContent = Math.round(state.speedKmh) + ' km/h';
    if (this.districtEl) {
      this.districtEl.textContent = state.district.name;
      this.districtEl.style.color = state.district.color;
    }
    if (this.stationEl) this.stationEl.textContent = '♪ ' + state.station;
    if (this.packagesEl) this.packagesEl.textContent = '▣ ' + state.packages + '/' + state.packageTotal;
    if (this.timerEl) {
      this.timerEl.textContent = state.timerLeft > 0 ? '⏱ ' + Math.ceil(state.timerLeft) + 's' : '';
    }
    if (this.missionEl) {
      if (state.missionDone) {
        this.missionEl.textContent = 'All jobs done — free roam. Best $' + state.best;
      } else {
        const job = MISSIONS[state.missionIndex];
        const dist = Math.round(state.missionDistance);
        this.missionEl.textContent = 'Job ' + (state.missionIndex + 1) + '/6 — ' + job.name + ' (' + job.giver + '): ' + state.missionText + '  •  ' + dist + 'm';
      }
    }
  }

  drawMinimap(world) {
    const ctx = this.mapCtx;
    if (!ctx || !world) return;
    const S = 180;
    const half = WORLD_HALF + 14;
    const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
    ctx.clearRect(0, 0, S, S);
    // District tints.
    ctx.fillStyle = 'rgba(46,196,182,0.30)';
    ctx.fillRect((S * (55 + half)) / (half * 2), 0, S, S);
    ctx.fillStyle = 'rgba(255,46,136,0.30)';
    ctx.fillRect(0, 0, (S * (-55 + half)) / (half * 2), S);
    ctx.fillStyle = 'rgba(255,183,3,0.25)';
    ctx.fillRect(0, 0, S, (S * (-55 + half)) / (half * 2));
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, S, 3);
    // Roads.
    ctx.strokeStyle = 'rgba(200,200,220,0.55)';
    ctx.lineWidth = 2;
    for (const line of [-90, -60, -30, 0, 30, 60, 90]) {
      const [ax] = toMap(line, 0);
      const [, bz] = toMap(0, line);
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, bz); ctx.lineTo(S, bz); ctx.stroke();
    }
    // Harbour water.
    ctx.fillStyle = '#1b6f8f';
    ctx.fillRect((S * (100 + half)) / (half * 2), 0, S, S);
    // Packages.
    ctx.fillStyle = '#7dff8a';
    for (const p of world.packages || []) {
      if (p.taken) continue;
      const [px, py] = toMap(p.x, p.z);
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
    // Mission beacon with a gold pulse.
    if (world.beacon) {
      const pulse = 3 + Math.sin(world.time * 4) * 1.5;
      const [bx, by] = toMap(world.beacon.x, world.beacon.z);
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath(); ctx.arc(bx, by, pulse + 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5200';
      ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    // Police cruisers.
    ctx.fillStyle = '#ff5252';
    for (const c of world.police || []) {
      const [cx, cy] = toMap(c.x, c.z);
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Helicopter.
    if (world.heli) {
      const [hx, hy] = toMap(world.heli.x, world.heli.z);
      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.stroke();
    }
    // Player arrow.
    const [px, py] = toMap(world.player.x, world.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(world.player.heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5); ctx.closePath();
    ctx.fill();
    ctx.restore();
    // North indicator.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('N', S - 16, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(S - 11, 20); ctx.lineTo(S - 11, 30); ctx.stroke();
  }
}
