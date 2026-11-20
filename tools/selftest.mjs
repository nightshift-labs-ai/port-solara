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

await test('mission', async () => {
  const s = await call(() => window.__test.mission());
  ok(s.startsInside === 0, `${s.startsInside} mission start rings inside buildings`);
  ok(s.started, 'walking into the mission 1 ring did not start it');
  ok(s.deliverPanel && /^MISSION 1\/5/.test(s.deliverPanel.header) && /Quist Auto · \d/.test(s.deliverPanel.objective), 'mission panel missing header or live distance');
  ok(s.card && s.card.title === 'JOB DONE', 'no JOB DONE result card');
  ok(s.cash === 5000 && s.rep === 120 && s.done, `paid $${s.cash}, ${s.rep} REP, done ${s.done}`);
  return s;
});

await test('gps', async () => {
  const s = await call(() => window.__test.gps());
  ok(s.points >= 4, `route has ${s.points} points`);
  ok(s.onNodes && s.axisAligned, 'route leaves the road grid');
  ok(s.endsAtTarget, 'route does not end at the marker');
  ok(s.lengthM >= s.straightM && s.lengthM < s.straightM * 1.6, `route ${s.lengthM} m for ${s.straightM} m straight`);
  return s;
});

await test('combat', async () => {
  const s = await call(() => window.__test.combat());
  ok(s.aimed, 'RMB did not bring up the shoulder aim');
  ok(s.firstShotHit, 'the first Wasp shot at a target 10 m ahead missed');
  ok(s.hitMarker, 'no hit marker after a hit');
  ok(s.dropped && s.shotsToDrop <= 6, `target still up after ${s.shotsToDrop} shots`);
  return s;
});

await test('enemy', async () => {
  const s = await call(() => window.__test.enemy());
  ok(s.firstShotHit, 'the first Wasp shot at a gunman 12 m ahead missed');
  ok(s.hitMarker, 'no hit marker on the gunman');
  ok(s.down && s.shots <= 6, `gunman still up after ${s.shots} shots`);
  ok(s.retired, 'the downed gunman was not returned to the pool');
  return s;
});

await test('blast', async () => {
  const s = await call(() => window.__test.blast());
  ok(s.smoking, 'a car at 30 health does not smoke');
  ok(s.blown && s.shake && s.debris, 'no blast, shake or debris at 0 health');
  ok(s.cruiserBlown && s.wantedFromCruiser === 2, `a blown Beacon gave ${s.wantedFromCruiser} pips`);
  return s;
});

await test('career', async () => {
  const s = await call(() => window.__test.career());
  ok(s.jacked && s.carsStolen === 1, `a jack counted ${s.carsStolen} cars stolen`);
  ok(s.gangDowned === 1, `a downed gunman counted ${s.gangDowned}`);
  ok(s.carsBlownUp === 1, `a blown van counted ${s.carsBlownUp}`);
  ok(s.tagged >= 1 && s.escapesAfterClear === 0, `clear() counted ${s.escapesAfterClear} escapes`);
  ok(s.policeEscapes === 1 && s.highestWanted >= 1, `the escape timer counted ${s.policeEscapes} escapes (highest ${s.highestWanted})`);
  ok(s.secondsPlayed > 0, 'no time played counted');
  return s;
});

await test('pause-tabs', async () => {
  const s = await call(() => window.__test.pauseTabs());
  const want = ['menu', 'map', 'story', 'save', 'menu', 'save', 'stats', 'menu'];
  ok(JSON.stringify(s.seen) === JSON.stringify(want), `views ${s.seen.join(' > ')}`);
  ok(s.tabs === 6, `${s.tabs} tabs`);
  ok(/^Saved to slot|^Lose the SPD|^No saving/.test(s.saveNote), `SAVE NOW gave "${s.saveNote}"`);
  ok(s.stillPaused && s.resumed, 'a click in STATS ran a menu item, or Esc did not resume');
  return s;
});

await test('completion', async () => {
  const s = await call(() => window.__test.completion());
  ok(s.weights === 100 && s.story === 24 && s.races === 4 && s.courier === 3, `rows ${JSON.stringify(s)}`);
  ok(s.percent === s.sum && s.percent >= 31, `completion ${s.percent}%`);
  ok(s.paid === 8000 && s.payouts === 53500, `payouts ${s.paid} of ${s.payouts}`);
  return s;
});

await test('autopilot', async () => {
  const s = await call(() => window.__test.autopilot(0));
  ok(s.card && s.card.title === 'JOB DONE' && s.done, `mission 1 ended without JOB DONE (${JSON.stringify(s.card)})`);
  ok(s.stages.length >= 4, `only ${s.stages.length} stages: ${s.stages}`);
  const f = await call(() => window.__test.autopilot(4));
  ok(f.card && f.card.title === 'SOLARA COURIER' && f.done, `mission 5 ended without the front page (${JSON.stringify(f.card)})`);
  return { m1: s, m5: { stages: f.stages, card: f.card } };
});

await test('mission-list', async () => {
  const s = await call(() => window.__test.missionList());
  ok(s.length === 5, `${s.length} story missions`);
  s.forEach((m) => ok(m.steps >= 4 && m.header === `MISSION ${m.n}/5 · ${m.header.split(' · ')[1]}`, `mission ${m.n} did not start`));
  ok(s.some((m) => m.kinds.includes('eliminate')) && s.some((m) => m.kinds.includes('defend')), 'no fight steps');
  return s;
});

// M5 shell: the page reloads between these, so each starts from a clean boot.
const reload = async () => {
  await page.reload();
  await page.waitForFunction(() => window.__testReady === true, null, { timeout: 60000 });
};
// The newest save record in localStorage (what CONTINUE loads).
const newestSave = () => Object.keys(localStorage).filter((k) => k.startsWith('port-solara/save-slot-'))
  .map((k) => JSON.parse(localStorage.getItem(k))).sort((a, b) => b.savedAt - a.savedAt)[0] || null;

await test('save', async () => {
  await reload();
  const before = await call(() => {
    const g = window.portSolara;
    localStorage.clear();
    g.startPlay();
    g.missions.completed.add('ferry'); g.missions.completed.add('market');
    g.missions.rep = 640; g.cash = 18450;
    g.progress.bestLaps = { race1: 52.4 }; g.progress.races = 1; g.progress.courier = 3;
    g.arms.give('hornet'); g.arms.select(1);
    g.stats.carsStolen = 7;
    const h = g.spots.find((p) => p.id === 'safehouse');
    g.player.x = h.x + 1; g.player.z = h.z; g.focus = g.player;
    const note = g.saveGame('Calloway Salvage');
    return { note, carsStolen: g.stats.carsStolen, cash: g.cash, rep: g.missions.rep, story: [...g.missions.completed].sort(), races: g.progress.races, courier: g.progress.courier, best: g.progress.bestLaps.race1, slot: g.arms.slot, locked: [...g.arms.locked], x: g.player.x, z: g.player.z };
  });
  ok(/^Saved to slot/.test(before.note), `save refused: ${before.note}`);
  await reload();
  const label = await call(() => document.querySelector('.title-menu li')?.textContent);
  ok(label === 'CONTINUE - Story 3/5 - $18,450', `title shows "${label}"`);
  const after = await call(`(() => {
    const g = window.portSolara, s = (${newestSave.toString()})();
    g.loadSave(s); g.startPlay();
    return { carsStolen: g.stats.carsStolen, cash: g.cash, rep: g.missions.rep, story: [...g.missions.completed].sort(), races: g.progress.races, courier: g.progress.courier, best: g.progress.bestLaps.race1, slot: g.arms.slot, locked: [...g.arms.locked], x: g.player.x, z: g.player.z, place: g.progress.savedAt && g.progress.savedAt.place };
  })()`);
  for (const k of ['carsStolen', 'cash', 'rep', 'races', 'courier', 'best', 'slot']) ok(after[k] === before[k], `${k}: ${before[k]} -> ${after[k]}`);
  ok(JSON.stringify(after.story) === JSON.stringify(before.story) && after.locked.length === 0, 'story or weapons differ');
  ok(Math.hypot(after.x - before.x, after.z - before.z) < 0.2 && after.place === 'Calloway Salvage', 'Wren is not back at the safehouse');
  return { label, ...after };
});

await test('settings', async () => {
  await call(() => { const g = window.portSolara; g.changeSetting('master', 4); g.changeSetting('sensitivity', 1.5); g.changeSetting('graphics', 'low'); });
  await reload();
  const s = await call(() => { const g = window.portSolara; return { ...g.settings, far: g.camera.far, shadows: g.renderer.shadowMap.enabled, look: g.lookScale }; });
  ok(s.master === 4 && s.sensitivity === 1.5 && s.graphics === 'low', `settings came back as ${JSON.stringify(s)}`);
  ok(s.far === 300 && !s.shadows && s.look === 1.5, 'the LOW preset or sensitivity is not applied');
  await call(() => window.portSolara.changeSetting('graphics', 'high'));
  return s;
});

await test('race', async () => {
  const s = await call(() => {
    const g = window.portSolara;
    g.startPlay();
    const car = g.albacore, spot = g.spots.find((p) => p.id === 'race2');
    const put = (x, z) => { car.x = x; car.z = z; car.speed = car.vx = car.vz = 0; car.sync(); g.player.x = x; g.player.z = z; };
    g.player.x = car.x - 2.2; g.player.z = car.z; g.enterOrExit();
    put(spot.x, spot.z);
    const offer = g.side.offer(), cash0 = g.cash;
    g.side.use();
    const checkpoints = [];
    for (const cp of g.side.active.route.slice(1)) {
      put(cp.x, cp.z);
      for (let i = 0; i < 60; i++) g.step();
      checkpoints.push(g.side.active ? g.side.active.next : 'done');
    }
    return { offer, checkpoints, result: g.side.result, races: g.progress.races, best: g.progress.bestLaps.race2, paid: g.cash - cash0 };
  });
  ok(s.offer === '[E] START CORAL CIRCUIT', `offer "${s.offer}"`);
  ok(s.result && s.result.passed && s.races === 1 && s.best > 0 && s.paid === 1500, `race did not complete: ${JSON.stringify(s)}`);
  return s;
});

await test('respray', async () => {
  const s = await call(() => {
    const g = window.portSolara, rs = g.spots.find((p) => p.id === 'respray'), car = g.vehicle;
    car.x = rs.x; car.z = rs.z; car.speed = car.vx = car.vz = 0; car.sync(); g.player.x = rs.x; g.player.z = rs.z;
    g.police.reset();
    g.wantedLevel.commit('copAssault', rs.x, rs.z);
    g.step();
    const pips = g.wantedLevel.pips, seen = g.copsSee(), cash0 = g.cash;
    const note = g.side.use();
    return { pips, seen, note, after: g.wantedLevel.pips, paid: cash0 - g.cash };
  });
  ok(s.pips >= 2 && !s.seen, `setup: ${s.pips} pips, seen ${s.seen}`);
  ok(s.after === 0 && s.paid === 500, `respray left ${s.after} pips, paid ${s.paid}: ${s.note}`);
  return s;
});

await test('perf', async () => {
  await reload();
  await call(() => { localStorage.clear(); window.portSolara.changeSetting('graphics', 'high'); window.__test.start(); window.__test.step(120); });
  await call(() => window.__test.teleport(-174.6, 0, 0));
  const p = await call(() => window.__test.perf(30));
  ok(p.drawCalls <= 200, `${p.drawCalls} draw calls`);
  ok(p.triangles <= 300000, `${p.triangles} triangles`);
  ok(p.medianMs <= 70, `median frame ${p.medianMs.toFixed(1)} ms`);
  // The LOW preset in the same view: no shadow pass, 300 m draw distance.
  await call(() => window.portSolara.changeSetting('graphics', 'low'));
  const low = await call(() => window.__test.perf(30));
  await call(() => { window.portSolara.changeSetting('graphics', 'high'); localStorage.clear(); });
  ok(low.medianMs <= p.medianMs * 1.5 + 2, `LOW is slower than HIGH (${low.medianMs} vs ${p.medianMs})`);
  return { drawCalls: p.drawCalls, triangles: p.triangles, medianMs: +p.medianMs.toFixed(1), heapMB: p.heapMB && Math.round(p.heapMB), low: { drawCalls: low.drawCalls, triangles: low.triangles, medianMs: +low.medianMs.toFixed(1) } };
});

await test('clean-console', async () => { ok(problems.length === 0, problems.join(' | ')); return { problems: 0 }; });

await browser.close();
const pass = results.every((r) => r.pass);
writeFileSync(join(here, 'selftest-report.json'), JSON.stringify({ pass, results }, null, 2) + '\n');
console.log(pass ? 'SELFTEST PASS' : 'SELFTEST FAIL');
process.exit(pass ? 0 : 1);
