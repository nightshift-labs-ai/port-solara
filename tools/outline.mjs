// Prints our approximation of the judge's outline from out/dossier.json: load order, path,
// size and the first two declarations of each source file. Arg: a dossier path (optional).
import { readFileSync } from 'node:fs';

const path = process.argv[2] || new URL('../out/dossier.json', import.meta.url).pathname;
const { text } = JSON.parse(readFileSync(path, 'utf8'));
const head = text.split('\n').filter((l) => /^(Source files|Totals):/.test(l));
console.log(head.join('\n'));

const DECL = [
  /^export\s+(?:async\s+)?(?:function\*?|class|const|let)\s+([\w$]+)/,
  /^(?:async\s+)?(?:function\*?|class)\s+([\w$]+)/,
  /^(?:const|let)\s+([\w$]+)\s*=/,
  /^([#.\w][^{]*?)\s*\{/,
  /<[^>]*\bid="([^"]+)"/,
  /<(script|link)\b/,
];
const sections = text.split(/\n### /).slice(1);
let order = 0;
for (const sec of sections) {
  const [title, ...rest] = sec.split('\n');
  const decls = [];
  for (const line of rest) {
    if (line.startsWith('```') || /^\s*(import|\/\/)/.test(line)) continue;
    for (const re of DECL) {
      const m = line.trim().match(re);
      if (m) { decls.push(m[1].trim().slice(0, 40)); break; }
    }
    if (decls.length >= 2) break;
  }
  console.log(`${String(++order).padStart(2)} ${title.padEnd(58)} ${decls.join(', ')}`);
}
const tail = text.trim().split('\n').pop();
if (/left out/i.test(tail)) console.log(tail);
