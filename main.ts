// PORT SOLARA: Nightshift Labs' make.fun gta6-01 entry (Node 22, standard library only).
// The game is game/: plain static files (index.html, ES modules under src/, styles/, and
// three.js vendored under vendor/three/) that a desktop browser runs offline. This program
// hands it in: it copies game/ and screenshots/ to the output folder and writes dossier.json
// with the vendored make.fun library. Every run starts from clean copies so two runs over the
// same tree write byte-identical output.
//
// Serve locally with `node serve.ts` and open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
// Stale files from an earlier run would change the dossier, so replace both copies whole.
for (const dir of ['game', 'screenshots']) rmSync(join(out, dir), { recursive: true, force: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB, more than 993 files or
// 48 MiB in game/, or a game path over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
