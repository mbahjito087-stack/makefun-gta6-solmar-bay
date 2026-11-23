# Solmar Bay — Mara Voss Returns

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mbahjito087-stack/makefun-gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mbahjito087-stack/makefun-gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun bounty gta6-01](https://make.fun/bounty/gta6-01).
Mara Voss is back in Solmar Bay — steal cars, outrun the police, work your
way through six story jobs, and pull off The Big Score for $1,950.

If you like the game, you can join the bounty yourself with my referral link:
https://make.fun/r/2behakk4

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in your browser. The game runs fully offline:
everything lives under `game/`, and Three.js is vendored in `game/vendor/`,
so no network request is needed once the page loads.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrow keys | Walk, or drive when in a car |
| Shift | Run |
| E | Steal a car / get out of a car |
| F | Punch |
| R | Switch radio station (2 procedural stations) |
| P | Pause |
| Mouse drag / wheel | Orbit and zoom the camera |

## The city

Solmar Bay has four districts, each with its own palette and its own tint
on the minimap: **Marina Plaza**, **North Market**, **Harbour**, and
**Neon Row**. The whole city is lit in golden hour — a low sun, an
orange-pink sky, glowing windows, and shimmering harbour water.

- **Traffic & people:** 14 cars on the road (sedan, van, and sports bodies),
  18 pedestrians on the sidewalks, and 4 parked cars to steal.
- **Wanted system:** 0–5 stars. Stealing, hitting, and ramming raise your
  heat. Police cruisers give chase and ram you back; at 4–5 stars a
  helicopter joins the hunt and roadblocks appear ahead of you. Get caught
  on foot at 3+ stars and you're BUSTED.
- **Story jobs:** six missions with a golden beacon and a mission tracker
  — Pickup, Getaway, Vault Run, the timed Harbour Smuggle, Neon Row Rescue,
  and The Big Score finale — worth $1,950 in total.
- **Side content:** 10 hidden packages ($50 each), taxi fares ($80 a ride),
  health pickups (+25) and armour pickups (+50), and smoke pouring from a
  badly damaged car.
- **HUD:** cash, health, armour, wanted stars, mission tracker with
  distance, speedometer, a live minimap with a north indicator, floating
  cash popups, and a damage vignette.
- **Audio:** fully procedural WebAudio — engine hum, police sirens, chimes,
  thuds, and two radio stations, all synthesized with oscillators.
- **Screens & saves:** title, pause, wasted, busted, and win screens;
  progress and best cash are saved in localStorage.
- **Deterministic:** a seeded RNG drives the world, so `?seed=` replays the
  same city every time.

## Screenshots

Four staged shots live in `screenshots/` (see `shots.json` for the staging
queries):

1. `1-start.jpg` — title over the golden-hour marina skyline
2. `2-drive.jpg` — driving through the harbour with traffic and the mission
   objective in view
3. `3-chase.jpg` — a neon chase at wanted level 4, cruisers and helicopter
   in frame
4. `4-win.jpg` — the finale complete, cash total and a "CLEAN GETAWAY" banner

## License

MIT — see [LICENSE](LICENSE).
