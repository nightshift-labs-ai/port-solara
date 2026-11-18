// Headless self-test through the ?test=1&seed=1 hooks: boot, walk, drive, traffic, peds, steal,
// skid and perf.
// Fails on any console error, page error or non-localhost request. Writes tools/selftest-report.json.
// Env: PW_NODE_MODULES (a Playwright install), SHOT_BASE_URL (default http://127.0.0.1:8806/).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(join(process.env.PW_NODE_MODULES || '.', 'noop.js'));
const { chromium } = require('playwright');
const base = process.env.SHOT_BASE_URL || 'http://127.0.0.1:8806/';
const here = new URL('.', import.meta.url).pathname;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
page.on('request', (r) => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && u.protocol !== 'data:') problems.push('request: ' + r.url()); });

const results = [];
const test = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ name, pass: true, detail });
    console.log(`PASS ${name}`, JSON.stringify(detail));
  } catch (e) {
    results.push({ name, pass: false, detail: String(e.message || e) });
    console.log(`FAIL ${name}: ${e.message || e}`);
  }
};
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
const call = (expr) => page.evaluate(expr);

await test('boot', async () => {
  await page.goto(base + '?test=1&seed=1');
  await page.waitForFunction(() => window.__testReady === true, null, { timeout: 60000 });
  const s = await call(() => window.__test.start());
  ok(s.mode === 'play', 'not in play mode');
  ok(s.cars >= 5, 'too few cars');
  ok(s.cityBuildMs < 1500, `city build ${s.cityBuildMs.toFixed(0)} ms`);
  return { cityBuildMs: Math.round(s.cityBuildMs), cars: s.cars };
});

await test('walk', async () => {
  const a = await call(() => window.__test.snapshot());
  await call(() => window.__test.key('KeyW', true));
  let inside = false, b;
  for (let i = 0; i < 18; i++) {
    b = await call(() => window.__test.step(10));
    inside ||= b.player.insideBuilding;
  }
  await call(() => window.__test.key('KeyW', false));
  const moved = Math.hypot(b.player.x - a.player.x, b.player.z - a.player.z);
  ok(moved > 8, `moved only ${moved.toFixed(1)} m`);
  ok(!inside, 'entered a building');
  return { moved: +moved.toFixed(1) };
});

await test('drive', async () => {
  await call(() => window.__test.teleport(-174.6, 6, 0));
  const e = await call(() => window.__test.enterNearest());
  ok(e.car && e.car.name === 'ALBACORE GT', 'did not enter the Albacore');
  await call(() => window.__test.key('KeyW', true));
  const s = await call(() => window.__test.step(240));
  ok(s.car.speed > 15, `speed ${s.car.speed.toFixed(1)} m/s after 4 s`);
  // Aim east at a Palmline block 13 m away: the wall must stop and dent the car.
  await call(() => window.__test.teleport(-176, 10.5, -Math.PI / 2));
  const w = await call(() => window.__test.step(150));
  await call(() => window.__test.key('KeyW', false));
  const inWall = await call(() => { const g = window.portSolara; return g.collide.pointInside(g.vehicle.x, g.vehicle.z); });
  ok(!inWall, 'car passed into a building');
  ok(w.car.health < 100, 'wall hit did no damage');
  return { speedAfter4s: +s.car.speed.toFixed(1), healthAfterWall: Math.round(w.car.health) };
});

await test('traffic', async () => {
  let closest = Infinity, maxRed = 0, overlaps = 0, s = null;
  for (let k = 0; k < 20; k++) {
    s = await call(() => window.__test.step(60));
    closest = Math.min(closest, s.traffic.closest);
    maxRed = Math.max(maxRed, s.traffic.waitingAtRed);
    if (s.traffic.overlaps) overlaps = Math.max(overlaps, s.traffic.overlaps), console.log('overlap', JSON.stringify(s.traffic));
  }
  ok(s.traffic.active >= 20, `${s.traffic.active} traffic cars after 20 s`);
  ok(overlaps === 0, `cars overlap (${overlaps})`);
  ok(maxRed >= 1, 'no car waited at a red');
  return { active: s.traffic.active, closestM: closest, maxWaitingAtRed: maxRed };
});

await test('peds', async () => {
  let inside = 0, s = null;
  for (let k = 0; k < 10; k++) {
    s = await call(() => window.__test.step(30));
    inside = Math.max(inside, s.peds.inside);
  }
  ok(s.peds.walkers >= 20, `${s.peds.walkers} walkers`);
  ok(inside === 0, `${inside} walkers inside buildings`);
  return { walkers: s.peds.walkers, inside };
});

await test('steal', async () => {
  const s = await call(() => window.__test.steal());
  ok(!s.error, s.error);
  ok(s.jacking, 'F did not start a jacking on the traffic car');
  ok(s.inCar, 'Wren is not in the jacked car');
  ok(s.carLeftTraffic, 'the car is still driven by traffic');
  ok(s.driverRunning && s.driverDistance > 3, `driver not running away (${s.driverDistance} m)`);
  return s;
});

await test('wanted', async () => {
  const s = await call(() => window.__test.wanted());
  ok(s.unseen === 0, `an unseen theft raised WANTED to ${s.unseen}`);
  ok(s.witnesses > 0 && s.pips === 1, `theft with ${s.witnesses} witnesses gave ${s.pips} pips`);
  ok(s.searching, 'no cop in sight but the tag is not SEARCHING');
  ok(s.pipsAfter === 0 && Math.abs(s.clearedAfter - s.escape) < 0.5, `pips ${s.pipsAfter} after ${s.clearedAfter} s (escape ${s.escape} s)`);
  return s;
});

await test('skid', async () => {
  const s = await call(() => window.__test.drift());
  ok(!s.error, s.error);
  ok(s.marksLaid >= 20, `${s.marksLaid} skid strips laid`);
  ok(s.puffsAlive >= 10, `${s.puffsAlive} smoke puffs`);
  return s;
});

await test('police', async () => {
  const s = await call(() => window.__test.police());
  ok(s.maxCruisers >= 4, `${s.maxCruisers} cruisers answered WANTED 3`);
  ok(s.nearest < s.firstNearest - 20 && s.nearest <= 30, `units did not close in (${s.firstNearest} m -> ${s.nearest} m)`);
  ok(s.inSight, 'no unit ever had line of sight');
  ok(s.heli, 'no helicopter at WANTED 3');
  return s;
});

await test('custody', async () => {
  const s = await call(() => window.__test.custody());
  ok(s.custody && s.card === 'IN CUSTODY', 'standing beside a cop at WANTED 1 did not end in custody');
  ok(s.after >= 2.5 && s.after < 3.2, `custody after ${s.after} s (want 2.5 s)`);
  ok(s.bail === 400 && s.pipsAfter === 0, `bail ${s.bail}, pips ${s.pipsAfter}`);
  ok(s.cardGone && s.onFoot && !s.insideBuilding, 'no clean respawn at the SPD post');
  return s;
});

await test('perf', async () => {
  await call(() => window.__test.teleport(-174.6, 0, 0));
  const p = await call(() => window.__test.perf(30));
  ok(p.drawCalls <= 200, `${p.drawCalls} draw calls`);
  ok(p.triangles <= 300000, `${p.triangles} triangles`);
  ok(p.medianMs <= 70, `median frame ${p.medianMs.toFixed(1)} ms`);
  return { drawCalls: p.drawCalls, triangles: p.triangles, medianMs: +p.medianMs.toFixed(1), heapMB: p.heapMB && Math.round(p.heapMB) };
});

await test('clean-console', async () => { ok(problems.length === 0, problems.join(' | ')); return { problems: 0 }; });

await browser.close();
const pass = results.every((r) => r.pass);
writeFileSync(join(here, 'selftest-report.json'), JSON.stringify({ pass, results }, null, 2) + '\n');
console.log(pass ? 'SELFTEST PASS' : 'SELFTEST FAIL');
process.exit(pass ? 0 : 1);
