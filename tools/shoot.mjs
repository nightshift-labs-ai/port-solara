// Renders the shots in shots.json at 1280x800 into screenshots/, each JPEG under 190 KiB.
// Env: PW_NODE_MODULES (a Playwright install), SHOT_BASE_URL (default http://127.0.0.1:8806/).
// Args: [name ...] to shoot only some shots; --query "?x=1" --out file.jpg for an ad-hoc frame.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(join(process.env.PW_NODE_MODULES || '.', 'noop.js'));
const { chromium } = require('playwright');
const base = process.env.SHOT_BASE_URL || 'http://127.0.0.1:8806/';
const root = new URL('..', import.meta.url).pathname;
const LIMIT = 190 * 1024;

const args = process.argv.slice(2);
let shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const qi = args.indexOf('--query');
if (qi >= 0) {
  const oi = args.indexOf('--out');
  shots = [{ name: oi >= 0 ? args[oi + 1] : 'adhoc.jpg', query: args[qi + 1], adhoc: true }];
} else if (args.length) {
  shots = shots.filter((s) => args.includes(s.name));
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
mkdirSync(join(root, 'screenshots'), { recursive: true });
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.error('pageerror', shot.name, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', shot.name, m.text()); });
  await page.goto(base + shot.query);
  if (shot.adhoc && !shot.query.includes('shot=')) await page.waitForTimeout(5000);
  else await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 120000 });
  let quality = 92, buf;
  for (;;) {
    buf = await page.screenshot({ type: 'jpeg', quality });
    if (buf.length <= LIMIT || quality <= 40) break;
    quality -= 4;
  }
  const out = shot.adhoc ? shot.name : join(root, 'screenshots', shot.name);
  writeFileSync(out, buf);
  console.log(`${shot.name}: ${(buf.length / 1024).toFixed(1)} KiB at quality ${quality}`);
  await page.close();
}
await browser.close();
