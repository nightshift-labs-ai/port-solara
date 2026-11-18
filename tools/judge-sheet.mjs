// Builds our copy of the judge's contact sheet from screenshots/ (sorted by name): the cover
// fitted in 768x480 on top, the others in ~256x160 cells beneath, saved at 100% and 50%.
// Env: PW_NODE_MODULES (a Playwright install). Writes tools/judge-sheet.jpg and tools/judge-sheet-50.jpg.
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(join(process.env.PW_NODE_MODULES || '.', 'noop.js'));
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
const dir = join(root, 'screenshots');
const shots = readdirSync(dir).filter((n) => /\.(jpe?g|png)$/i.test(n)).sort()
  .map((n) => 'data:image/jpeg;base64,' + readFileSync(join(dir, n)).toString('base64'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
await page.setContent('<body style="margin:0;background:#fff"><canvas id="c"></canvas></body>');
for (const scale of [1, 0.5]) {
  const jpeg = await page.evaluate(async ({ shots, scale }) => {
    const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const imgs = await Promise.all(shots.map(load));
    const fit = (img, w, h) => { const k = Math.min(w / img.width, h / img.height, 1); return [img.width * k, img.height * k]; };
    const [cw, ch] = fit(imgs[0], 768, 480);
    const rest = imgs.slice(1);
    const cells = rest.map((i) => fit(i, 256, 160));
    const W = Math.max(cw, cells.reduce((a, c) => a + c[0], 0)), H = ch + (cells.length ? Math.max(...cells.map((c) => c[1])) : 0);
    const c = document.getElementById('c');
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(imgs[0], 0, 0, cw * scale, ch * scale);
    let x = 0;
    rest.forEach((img, i) => { g.drawImage(img, x * scale, ch * scale, cells[i][0] * scale, cells[i][1] * scale); x += cells[i][0]; });
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, { shots, scale });
  const out = join(root, 'tools', scale === 1 ? 'judge-sheet.jpg' : 'judge-sheet-50.jpg');
  writeFileSync(out, Buffer.from(jpeg, 'base64'));
  console.log('wrote', out.slice(root.length));
}
await browser.close();
