// Greps game/ (our source, not vendor/) for names that belong to other games; fails on any hit.
// Short terms match on word boundaries, the rest anywhere, case-insensitive.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../game/', import.meta.url).pathname;
const BANNED = [
  'Grand Theft Auto', 'GTA', 'Rockstar',
  'Vice City', 'Leonida', 'Port Gellhorn', 'Ambrosia', 'Grassrivers', 'Kalaga', 'Los Santos', 'San Andreas',
  'San Fierro', 'Las Venturas', 'Liberty City', 'Vinewood', 'Grove Street',
  'Lucia', 'Jason Duval', 'Niko', 'Tommy Vercetti', 'CJ', 'Franklin', 'Trevor',
  'LSPD', 'LCPD', 'VCPD', 'Ammu-Nation', "Pay 'n' Spray", 'Maze Bank', 'Sprunk', 'eCola', 'Weazel', "Cluckin' Bell",
  'Infernus', 'Banshee', 'Cheetah', 'Sentinel', 'Comet', 'Sultan', 'Elegy', 'Bravado', 'Faggio',
  'Wasted', 'Busted', 'Mission Passed', 'Flash FM',
  'Saints Row', 'Steelport', 'Stilwater', 'Empire Bay', 'Watch Dogs',
  'Miami', 'Florida',
];
const patterns = BANNED.map((term) => {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { term, re: new RegExp(term.length <= 6 ? `\\b${esc}\\b` : esc, 'i') };
});

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'vendor') walk(p); } else files.push(p);
  }
};
walk(root);

let hits = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { term, re } of patterns) {
      if (re.test(line)) { hits++; console.log(`HIT ${relative(root, f)}:${i + 1} "${term}"`); }
    }
  });
}
console.log(hits ? `ORIGINALITY FAIL: ${hits} hit(s) in ${files.length} files` : `ORIGINALITY PASS: ${files.length} files clean`);
process.exit(hits ? 1 : 0);
