// Solmar Bay entrypoint (Node 22, standard library only). It hands the game
// in: copy game/ and screenshots/ beside this file into /output (or
// MAKEFUN_OUTPUT_DIR outside the grader) and write the dossier the judge
// reads, using the vendored make.fun library. Run it twice and the bytes
// must come out identical.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest
// refuse an entry the scorer would refuse (over 4 screenshots or one over
// 256 KiB; over 993 files in game/ or 48 MiB of game files, or a game path
// over 1000 bytes).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// A one-line receipt so a local run shows what it handed in: the dossier
// size must stay under the 1.5 MiB gate, and two runs must print the same.
console.log(`Solmar Bay handed in: dossier.json ${dossier.length} bytes in ${out}`);
