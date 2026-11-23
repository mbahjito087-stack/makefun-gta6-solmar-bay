# makefun-gta6-solmar-bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mbahjito087-stack/makefun-gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mbahjito087-stack/makefun-gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay: Mara Voss Returns is an original open-world crime game: Mara Voss returns to a golden-hour harbour city, works six story jobs worth $1,950, steals and drives cars in three body styles, dodges police cruisers, roadblocks and a helicopter as the wanted level climbs to five stars, picks up health and armour, and tunes two procedural radio stations — all on a HUD with a live minimap, district names and a mission tracker, with a save in localStorage.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. The game is plain static files under `game/` and plays offline — no network request, no build step.

## Features

- A golden-hour open world: warm low sun, dusk-lit windows, four districts (Marina Plaza, North Market, Neon Row, Harbour) with their own palettes, neon signs, palms, a beach and a shimmering harbour.
- On foot and by car: walk, run, punch, steal parked cars; sedans, vans and sports cars each handle differently, with headlights, taillights and damage smoke.
- Wanted level 0–5: cruisers chase and ram, a roadblock waits at 3 stars, a police helicopter circles with a searchlight at 4–5 stars; get BUSTED if a cruiser catches Mara on foot at 3+ stars.
- Six story jobs: The Pickup, The Getaway (lose the cops first), The Vault Run, Harbour Smuggle (75 s timed), Neon Row Rescue, and The Big Score finale.
- Traffic that brakes at intersections, pedestrians who flee a speeding car, health and armour pickups, procedural WebAudio (engine, siren, chimes) and two radio stations (R switches).
- HUD with cash, health/armour bars, wanted stars, district label, mission tracker with distance and timer, speedometer, radio display, cash popups, damage vignette and a live minimap with district tints and a north indicator.
- Deterministic: `?seed=N` rebuilds the same city; `main.ts` output is byte-identical across runs.

## Controls

WASD move / drive · E steal or exit a car · F punch · R switch radio · Shift run · Mouse drag camera · Wheel zoom · P pause · Click to start.

## Missions

| Job | Name | Payout |
| --- | --- | --- |
| 1 | The Pickup | $150 |
| 2 | The Getaway | $250 |
| 3 | The Vault Run | $350 |
| 4 | Harbour Smuggle (timed) | $300 |
| 5 | Neon Row Rescue | $400 |
| 6 | The Big Score | $500 |

## Verification

- Playtest (`node work/playtest.mjs`): walk, steal, drive, punch, pause — 0 console/page errors. Verified 2026-11-23 in the recorded session: stolen: true, drove 70 km/h in a Bison sports car, mission tracker showed "Job 1/6 · Job 1: The Pickup — North Market · 217m", 2 wanted stars, PAUSED screen reached. PLAYTEST OK.
- Screenshots: 4 staged shots at 1280×800, seed 7, each ≤256 KiB (68,538 / 46,897 / 50,609 / 63,886 bytes), re-taken 2026-11-23 in the recorded session and eyeballed: title over the golden-hour plaza, harbour drive with traffic and mission objective, Neon Row chase at 4 stars with cruisers and the helicopter, and the finale with $1,950 and the CLEAN GETAWAY banner.
- Determinism: two `main.ts` runs produce byte-identical `/output` (verified 2026-11-23, 1,347,366 bytes total, dossier 378,372 bytes).
- Kit check (`node cli/makefun.mjs check --kit . --repo <repo> --worktree`, 2026-11-23): 4 passed, 0 failed, 17 skipped, 5 at submission (transcript/recording rows are checked at submission).

---

<sub>Entered on [make.fun](https://make.fun/?ref=2behakk4&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
