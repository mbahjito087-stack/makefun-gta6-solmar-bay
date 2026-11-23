# Solmar Bay — Mara Voss Returns

An open-world crime game in the spirit of GTA 6, built for the
[make.fun](https://make.fun/bounty/gta6-01) "Make GTA 6" bounty.
Mara Voss is back in Solmar Bay: steal cars, outrun the Solmar Bay PD,
run six story jobs and take the Big Score — $1,950 on the line.

> Referral: https://make.fun/r/2behakk4

## Play

```sh
node serve.ts
```

Then open http://localhost:8080. Everything runs offline from `game/` —
no network request, no build step. Three.js is vendored under
`game/vendor/`.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| Shift | Run |
| E | Steal nearest car / exit car |
| F | Punch |
| R | Toggle procedural radio (2 stations) |
| P | Pause |
| Mouse drag / wheel | Orbit camera / zoom |

## Features

- **Open world**: four districts — Marina Plaza, North Market, Harbour,
  Neon Row — each with its own palette, signage and minimap tint.
- **Golden-hour art direction**: low warm sun, orange-pink sky, long
  shadows, lit windows, shimmering harbour water, palms, beach, neon.
- **Traffic & pedestrians**: 14 traffic cars (sedan / van / sports),
  18 pedestrians who stroll, cross at crosswalks and flee trouble,
  4 parked cars to steal.
- **Wanted 0–5 stars**: stealing, punching and ramming raise the heat.
  Police cruisers chase and ram; at 4–5 stars a helicopter circles with
  a searchlight and roadblocks wait ahead. Get busted on foot at 3+.
- **Six story jobs** ($150 → $300 → $600 → $350 → $250 → $300):
  Pickup, Getaway, Vault Run, Harbour Smuggle (timed), Neon Row Rescue,
  The Big Score — with a gold beacon and a HUD mission tracker.
- **Side content**: 10 hidden packages ($50 each), taxi fares ($80),
  health (+25) and armour (+50) pickups, car damage smoke.
- **HUD**: cash, health, armour, wanted stars, mission tracker with
  distance, speedometer, live minimap with district tints and north
  indicator, cash popups, damage vignette, district label.
- **Sound**: procedural WebAudio — engine, siren, chimes, thuds and two
  radio stations (synthwave + harbour chill), all synthesized live.
- **Screens & save**: title / pause / wasted / busted / win screens,
  localStorage save with best cash.
- **Deterministic**: every roll comes from a seeded RNG (`?seed=`); the
  same seed always builds the same city.

## Shots

Four staged screenshots live in `screenshots/` (see `shots.json`):
title over the marina skyline, harbour drive, night neon chase at
wanted 4, and the CLEAN GETAWAY finale.

## Verify

```sh
node work/playtest.mjs <repo> <port>   # walk, steal, drive, punch, pause
node work/shoot.mjs <repo> <port>      # regenerate the 4 screenshots
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # deterministic build
```

Playtest: OK, 0 console/page errors. Determinism: two `main.ts` runs
byte-identical (see commit message for sizes).

## License

MIT — see `LICENSE`.
