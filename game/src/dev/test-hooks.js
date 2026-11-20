// Exposes window.__test for tools/selftest.mjs: snapshot, step(n), simulated keys, teleport, perf.
import { countWitnesses } from '../police/wanted-level.js';
import { completionOf } from '../story/completion-percentage.js';

export function exposeTestHooks(game) {
  window.__test = {
    start() { game.startPlay(); return this.snapshot(); },
    // Starts a mission (a step list) and returns what the mission panel shows.
    startMission(mission) { game.missions.start(mission); return game.missions.panel(); },
    missionState() { const r = game.missions; return { panel: r.panel(), result: r.result, target: r.target, subtitle: r.subtitle, route: game.route }; },
    snapshot() {
      const p = game.player, car = game.vehicle;
      return {
        mode: game.mode, tick: game.tick, cityBuildMs: game.cityBuildMs,
        player: { x: p.x, z: p.z, insideBuilding: !car && game.collide.pointInside(p.x, p.z) },
        car: car ? { name: car.name, x: car.x, z: car.z, speed: car.speed, health: car.health } : null,
        cars: game.cars.length,
        traffic: this.traffic(),
        peds: this.peds(),
      };
    },
    // A theft with walkers gathered around gives 1 pip, an unseen one none; then, with no cop in
    // sight, the pips clear once the escape time (8 s + 3 s per pip) has passed.
    wanted() {
      const wl = game.wantedLevel, p = game.focus;
      wl.clear();
      game.police.enabled = false; // decay with no cop anywhere near: the escape timer alone
      game.police.reset();
      const unseen = wl.commit('theft', p.x, p.z, 0) ? wl.pips : 0;
      game.crowd.gatherNear(p.x, p.z, 6, 10);
      const witnesses = countWitnesses(game, p.x, p.z);
      wl.commit('theft', p.x, p.z, witnesses);
      game.step();
      const pips = wl.pips, escape = wl.escapeSeconds, searching = !wl.inSight, t0 = game.time;
      let n = 0;
      while (wl.pips > 0 && n++ < 2000) game.step();
      game.police.enabled = true;
      return { unseen, witnesses, pips, escape, searching, clearedAfter: Math.round((game.time - t0) * 10) / 10, pipsAfter: wl.pips };
    },
    // WANTED 3 on foot at a Palmline corner: count the units that answer within 30 s and how
    // close the nearest gets, sampled each second (stops once one is within 14 m).
    police() {
      const wl = game.wantedLevel, pol = game.police;
      if (game.vehicle) this.enterNearest();
      this.teleport(-168.6, -40, 0);
      pol.reset(); wl.clear();
      wl.commit('copAssault', game.focus.x, game.focus.z); wl.commit('theft', game.focus.x, game.focus.z);
      const samples = [];
      let maxActive = 0, firstNearest = null, nearest = Infinity, roadblock = false, inSight = false, heli = false;
      for (let sec = 0; sec < 30 && nearest > 14; sec++) {
        for (let i = 0; i < 60; i++) game.step();
        const act = pol.active, chasing = act.filter((u) => u.state !== 'ROADBLOCK' && u.kind !== 'heli');
        maxActive = Math.max(maxActive, chasing.length);
        roadblock ||= act.some((u) => u.state === 'ROADBLOCK');
        heli ||= pol.heli.active;
        inSight ||= wl.inSight;
        const d = Math.min(...chasing.map((u) => u.dist));
        if (firstNearest === null && Number.isFinite(d)) firstNearest = d;
        nearest = Math.min(nearest, d);
        samples.push(Math.round(d));
      }
      return { pips: wl.pips, maxCruisers: maxActive, roadblock, heli, firstNearest: Math.round(firstNearest), nearest: Math.round(nearest), inSight, seconds: samples.length, samples };
    },
    // Walkers placed near the focus, and how many stand inside a building box.
    peds() {
      const live = game.crowd.walkers.filter((w) => w.ring);
      return { walkers: live.length, inside: live.filter((w) => game.collide.pointInside(w.x, w.z)).length };
    },
    // Active traffic, cars stopped at a red, and pairs of visible cars whose bodies overlap
    // (the other car's centre inside this car's footprint grown by the other's half size).
    traffic() {
      const live = game.cars.filter((c) => c.model.visible);
      let overlaps = 0, closest = Infinity, pair = null;
      for (let i = 0; i < live.length; i++) for (let j = 0; j < live.length; j++) {
        if (i === j) continue;
        const a = live[i], b = live[j], f = a.forward;
        const dx = b.x - a.x, dz = b.z - a.z;
        const along = Math.abs(dx * f.x + dz * f.z), side = Math.abs(dx * f.z - dz * f.x);
        if (i < j) { const d = Math.hypot(dx, dz); if (d < closest) { closest = d; pair = [a.name, b.name]; } }
        if (along < (a.spec.length + Math.min(b.spec.length, b.spec.width)) / 2 - 0.2 && side < (a.spec.width + b.spec.width) / 2 - 0.15) { overlaps++; pair = [a, b].map((c) => `${c.name}${c.ai ? '*' : ''}@${c.x.toFixed(1)},${c.z.toFixed(1)},${c.heading.toFixed(2)},${c.speed.toFixed(1)}`); }
      }
      return { active: game.traffic.active.length, waitingAtRed: game.traffic.waitingAtRed(), overlaps, closest: Math.round(closest * 100) / 100, pair };
    },
    // WANTED 1 on foot, a Beacon stopped 5 m away: standing still must end in custody within
    // 2.5 s (+ a tick), bail taken, heat gone, and Wren back on foot at an SPD post after the card.
    custody() {
      const wl = game.wantedLevel, pol = game.police;
      if (game.vehicle) this.enterNearest();
      this.teleport(-168.6, -60, 0);
      pol.reset(); wl.clear(); game.custody = null;
      wl.commit('theft', game.focus.x, game.focus.z, 1);
      pol.place(0, -173.5, -60, 0, 0);
      const cash0 = game.cash, t0 = game.time;
      let n = 0;
      while (!game.custody && n++ < 600) game.step();
      const after = Math.round((game.time - t0) * 100) / 100, card = game.custody && game.custody.title;
      for (let i = 0; i < 300; i++) game.step();
      const p = game.player;
      return { custody: !!card, card, after, bail: cash0 - game.cash, pipsAfter: wl.pips, cardGone: !game.custody, onFoot: !game.vehicle, at: [Math.round(p.x), Math.round(p.z)], insideBuilding: game.collide.pointInside(p.x, p.z) };
    },
    // Mission 1 end to end: walk into its start ring, sit through Mara, teleport to the valet lane,
    // take the Albacore parked there, stop it at Quist Auto, then wait for the result card.
    mission() {
      const r = game.missions, m1 = game.story[0], log = [];
      if (game.vehicle) this.enterNearest();
      game.wantedLevel.clear(); game.police.reset();
      const startsInside = r.starts.filter((s) => game.collide.pointInside(s.mission.start.x, s.mission.start.z)).length;
      const cash0 = game.cash, rep0 = r.rep;
      this.teleport(m1.start.x, m1.start.z + 1, 0);
      this.step(2);
      const started = r.mission === m1;
      const until = (cond, max = 900) => { let n = 0; while (!cond() && n++ < max) game.step(); return n; };
      const note = () => log.push(r.panel() ? `${r.panel().stage}:${r.step.kind}` : 'none');
      note(); until(() => r.step?.kind !== 'dialogue'); note();
      this.teleport(r.target.x, r.target.z, 0); this.step(2); note();
      const car = game.albacore;
      car.x = r.target ? r.target.x : -170.6; car.z = game.player.z - 4; car.vx = car.vz = car.speed = 0; car.sync();
      game.player.x = car.x - 2.2; game.player.z = car.z;
      this.enterNearest(); until(() => r.step?.kind !== 'steal', 120); note();
      const goal = r.target, panel = r.panel();
      this.teleport(goal.x, goal.z, 0); this.step(2); note();
      until(() => !r.mission);
      const card = r.resultCard();
      return { startsInside, started, log, deliverPanel: panel, card, cash: game.cash - cash0, rep: r.rep - rep0, done: r.completed.has(m1.id) };
    },
    // GPS to mission 3's first marker: the route must run crossing to crossing along roads.
    gps() {
      const r = game.missions;
      if (game.vehicle) this.enterNearest();
      this.teleport(-168.6, 20, 0);
      r.start(game.story[2]);
      const route = game.updateRoute(), inner = route.slice(1, -1);
      const roads = game.roads;
      const onNodes = inner.every((p) => roads.nsRoads.includes(p.x) && roads.ewRoads.includes(p.z));
      const axisAligned = inner.every((p, i) => i === 0 || p.x === inner[i - 1].x || p.z === inner[i - 1].z);
      const end = route[route.length - 1], target = r.target;
      const length = route.reduce((d, p, i) => (i ? d + Math.hypot(p.x - route[i - 1].x, p.z - route[i - 1].z) : 0), 0);
      r.finish(false, 'TEST CANCELLED'); r.result = null;
      return { points: route.length, onNodes, axisAligned, endsAtTarget: Math.hypot(end.x - target.x, end.z - target.z) < 0.01, lengthM: Math.round(length), straightM: Math.round(Math.hypot(target.x + 168.6, target.z - 20)) };
    },
    // Combat: a dummy target 10 m ahead on the crosshair line; Wasp, RMB aim, LMB until it drops.
    combat() {
      if (game.vehicle) this.enterNearest();
      this.teleport(-168.6, 20, 0);
      game.chase.yaw = 0; game.chase.pitch = 0.18;
      const arms = game.arms, dummy = { x: -168.6 + 0.85, z: 10, radius: 0.45, height: 1.9, health: 100, alive: true, hit(d) { this.health -= d; if (this.health <= 0) this.alive = false; } };
      game.combatTargets.push(dummy);
      arms.select(1);
      game.input.setKey('Mouse2', true);
      for (let i = 0; i < 40; i++) game.step();
      const aimed = arms.aiming && game.camera.fov < 56;
      let shots = 0, firstHit = null, marker = false;
      while (dummy.alive && shots < 10) {
        game.input.setKey('Mouse0', true); game.step(); game.input.setKey('Mouse0', false);
        shots++;
        if (firstHit === null) { firstHit = dummy.health < 100; marker = arms.hitMarker > 0; }
        for (let i = 0; i < 20; i++) game.step();
      }
      game.input.setKey('Mouse2', false);
      const out = { aimed, firstShotHit: firstHit, hitMarker: marker, shotsToDrop: shots, dropped: !dummy.alive, clip: arms.clip.clip, wantedAfterGunfire: game.wantedLevel.pips };
      game.combatTargets.splice(game.combatTargets.indexOf(dummy), 1);
      game.wantedLevel.clear(); game.police.reset(); arms.select(0);
      for (let i = 0; i < 5; i++) game.step();
      return out;
    },
    // A Tidewater gunman standing 12 m up the crosshair line: Wasp shots must hit, show the hit
    // marker and put him down (no cover so he stands); he shoots back meanwhile.
    enemy() {
      if (game.vehicle) this.enterNearest();
      game.enemies.clear(); game.wantedLevel.clear(); game.police.reset();
      this.teleport(-168.6, 22, 0);
      game.chase.yaw = 0; game.chase.pitch = 0.18;
      const [e] = game.enemies.spawnSquad([{ crew: 'tidewater', x: -168.6 + 0.9, z: 10 }], 'test');
      e.state = 'peek'; e.timer = 99;
      const arms = game.arms;
      arms.select(1); arms.give('wasp');
      game.input.setKey('Mouse2', true);
      for (let i = 0; i < 30; i++) game.step();
      const h0 = e.health, hits0 = arms.hits;
      let shots = 0, firstHit = null, marker = false;
      while (e.alive && shots < 12) {
        e.timer = 99;
        game.input.setKey('Mouse0', true); game.step(); game.input.setKey('Mouse0', false);
        shots++;
        if (firstHit === null) { firstHit = e.health < h0; marker = arms.hitMarker > 0; }
        for (let i = 0; i < 18; i++) game.step();
      }
      game.input.setKey('Mouse2', false);
      const out = { crew: e.crew.label, firstShotHit: firstHit, hitMarker: marker, shots, hits: arms.hits - hits0, down: !e.alive && e.state === 'down', shotsAtWren: game.enemies.shotsAtWren, wrenHealth: game.player.health };
      for (let i = 0; i < 360; i++) game.step();
      out.retired = !e.active && !game.combatTargets.includes(e);
      game.player.health = 100; game.wantedLevel.clear(); game.police.reset();
      return out;
    },
    // Blow a parked car with damage: smoke under 45, a blast at 0 with debris and a shake, and an
    // SPD Beacon blown the same way adds +2 WANTED.
    blast() {
      if (game.vehicle) this.enterNearest();
      this.teleport(-168.6, 30, 0);
      game.wantedLevel.clear(); game.police.reset();
      const car = game.placeProp('van', -168.6, 14, Math.PI / 2), b = game.blasts, n0 = b.blown;
      car.health = 30; game.step(); game.step(); game.step(); game.step();
      const smoking = b.life.some((l) => l > 0);
      car.health = 0; game.step();
      const blown = b.blown === n0 + 1 && car.wrecked, shake = game.chase.shake > 0, debris = b.bits.some((x) => x.life > 0);
      const pol = game.police;
      pol.place(0, -160, 30, 0, 0);
      pol.units[0].car.health = 0;
      const before = game.wantedLevel.pips;
      game.step(); game.step();
      const out = { smoking, blown, shake, debris, cruiserBlown: b.blown === n0 + 2, wantedFromCruiser: game.wantedLevel.pips - before };
      car.model.visible = false; car.x = car.z = 1e5; car.sync();
      game.wantedLevel.clear(); pol.reset(); game.player.health = 100;
      return out;
    },
    // Career numbers move at their event sites: jack a traffic car, down a gunman, blow a parked
    // van, then lose a 1-pip tag by the escape timer. A clear() (custody, respray, loads) must not
    // count as an escape.
    career() {
      const st = game.stats, before = { ...st }, wl = game.wantedLevel;
      const theft = this.steal();
      if (game.vehicle) this.enterNearest();
      wl.clear(); game.police.reset();
      this.teleport(-168.6, 30, 0);
      const [e] = game.enemies.spawnSquad([{ crew: 'tidewater', x: -168.6, z: 18 }], 'test');
      game.enemies.hurt(e, 999);
      game.enemies.clear();
      const van = game.placeProp('van', -168.6, 10, Math.PI / 2);
      van.health = 0; game.step();
      van.model.visible = false; van.x = van.z = 1e5; van.sync();
      wl.clear(); game.police.reset();
      game.police.enabled = false; // the escape timer alone
      const p = game.focus;
      game.crowd.gatherNear(p.x, p.z, 6, 10);
      wl.commit('theft', p.x, p.z, Math.max(1, countWitnesses(game, p.x, p.z)));
      const tagged = wl.pips;
      wl.clear();
      const escapesAfterClear = game.stats.policeEscapes - before.policeEscapes;
      wl.commit('theft', p.x, p.z, Math.max(1, countWitnesses(game, p.x, p.z)));
      let n = 0;
      while (wl.pips > 0 && n++ < 2000) game.step();
      game.police.enabled = true;
      const s = game.stats, d = (k) => Math.round((s[k] - before[k]) * 10) / 10;
      game.player.health = 100; wl.clear(); game.police.reset();
      return {
        jacked: theft.inCar, tagged, carsStolen: d('carsStolen'), gangDowned: d('gangDowned'), carsBlownUp: d('carsBlownUp'),
        policeEscapes: d('policeEscapes'), escapesAfterClear, highestWanted: s.highestWanted, metresDriven: d('metresDriven'), secondsPlayed: d('secondsPlayed'),
      };
    },
    // The tabbed pause: Esc opens the PAUSED list, E / Q step the tabs (wrapping), a click on a tab
    // opens it, a click inside STORY runs no menu item, Esc goes back to the list, Esc resumes.
    pauseTabs() {
      const key = (code) => dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      const p = game.pause, seen = [];
      key('Escape'); seen.push(p.view);
      key('KeyE'); seen.push(p.view);
      key('KeyE'); seen.push(p.view);
      key('KeyQ'); key('KeyQ'); seen.push(p.view);
      key('Escape'); seen.push(p.view);
      key('KeyQ'); seen.push(p.view);
      key('Enter'); const saveNote = p.note; // SAVE NOW
      key('Escape');
      const canvas = document.querySelector('.pause-canvas'), box = canvas.getBoundingClientRect();
      const click = (x, y) => canvas.dispatchEvent(new MouseEvent('click', { clientX: box.left + x, clientY: box.top + y, bubbles: true }));
      const t = p.tabRects[2];
      click(t.x + t.w / 2, t.y + t.h / 2); seen.push(p.view);
      for (let y = 120; y < innerHeight - 40; y += 60) click(innerWidth * 0.08, y); // where RESUME / QUIT would sit
      const stillPaused = game.mode === 'paused';
      key('Escape'); seen.push(p.view);
      key('Escape');
      game.input.takePresses(); game.input.held.clear(); // the synthetic keys never reach play
      return { seen, saveNote, tabs: p.tabRects.length, stillPaused, resumed: game.mode === 'play' };
    },
    // The completion percentage from the shared shot save's progress: story 2/5, races 1/4,
    // courier 3/10 give 24 + 4 + 3 points.
    completion() {
      const done = new Set(game.missions.completed), pr = { races: game.progress.races, courier: game.progress.courier };
      game.missions.completed = new Set(['ferry', 'market']);
      Object.assign(game.progress, { races: 1, courier: 3 });
      const c = completionOf(game), pts = Object.fromEntries(c.rows.map((r) => [r.key, r.points]));
      game.missions.completed = done; Object.assign(game.progress, pr);
      return { percent: c.percent, sum: Math.floor(c.rows.reduce((a, r) => a + r.points, 0)), story: pts.story, races: pts.races, courier: pts.courier, paid: c.paid, payouts: c.payouts, weights: c.rows.reduce((a, r) => a + r.weight, 0) };
    },
    // Each of the five story missions starts and shows its panel; then it is called off.
    missionList() {
      if (game.vehicle) this.enterNearest();
      const r = game.missions, out = [];
      for (const m of game.story) {
        r.start(m);
        out.push({ n: m.number, header: r.panel()?.header, steps: m.steps.length, kinds: [...new Set(m.steps.map((s) => s.kind))].join(',') });
        r.finish(false, 'TEST CANCELLED'); r.result = null;
      }
      game.wantedLevel.clear(); game.police.reset();
      return out;
    },
    // Autopilot: plays a story mission through its steps with test-only moves (walk or drive the
    // focus toward the marker, take the car it needs, beat each fighter, wait out dialogue) until a
    // result card shows. Returns the stages it went through and the card.
    autopilot(index = 0) {
      if (game.vehicle) this.enterNearest();
      game.wantedLevel.clear(); game.police.reset();
      const r = game.missions, m = game.story[index], seen = [];
      r.completed.delete(m.id);
      this.teleport(m.start.x, m.start.z + 1, 0);
      for (let i = 0; i < 3 && !r.mission; i++) game.step();
      if (r.mission !== m) r.start(m);
      let n = 0;
      while (r.mission && n++ < 20000) {
        const step = r.step, tag = `${r.index + 1}:${step.kind}`;
        if (seen[seen.length - 1] !== tag) seen.push(tag);
        const f = game.vehicle || game.player, t = r.target;
        if (step.kind === 'steal') {
          const car = step.car ? game.albacore : game.albacore;
          if (!game.vehicle) { game.player.x = car.x - Math.cos(car.heading) * 2.2; game.player.z = car.z + Math.sin(car.heading) * 2.2; this.enterNearest(); }
          else if (step.car && game.vehicle.name !== step.car) this.enterNearest();
        } else if (step.kind === 'loseWanted' && !t) game.wantedLevel.clear();
        else if (step.kind === 'eliminate' || step.kind === 'defend') {
          for (const e of game.enemies.active) if (e.alive && e.state !== 'flee') e.hit(500);
        } else if (t && Math.hypot(t.x - f.x, t.z - f.z) > 1) {
          const d = Math.hypot(t.x - f.x, t.z - f.z), s = Math.min(d, 1.5);
          f.x += (t.x - f.x) / d * s; f.z += (t.z - f.z) / d * s;
          if (game.vehicle) { f.vx = f.vz = f.speed = 0; f.sync(); }
          if (step.kind === 'loseWanted' && d < 3) game.wantedLevel.clear();
        }
        game.step();
      }
      const card = r.resultCard();
      return { mission: m.title, stages: seen, ticks: n, card: card && { title: card.title, sub: card.sub, rows: card.rows }, done: r.completed.has(m.id) };
    },
    step(n = 1) { for (let i = 0; i < n; i++) game.step(); return this.snapshot(); },
    key(code, down) { game.input.setKey(code, down); },
    teleport(x, z, facing = 0) {
      const t = game.vehicle || game.player;
      t.x = x; t.z = z;
      if (game.vehicle) { t.heading = facing; t.vx = t.vz = 0; t.sync(); game.chase.yaw = facing; } else { t.facing = facing; game.chase.yaw = facing; }
      game.chase.lastMode = null;
      return this.snapshot();
    },
    // Leave any car, stand at the driver's door of a traffic car on a straight lane, press F and
    // play 1.5 s: the driver must be out and running and Wren must be in that very car.
    steal() {
      if (game.vehicle) this.enterNearest();
      const d = game.traffic.drivers.find((x) => x.car && !x.turn && x.lane.stopS - x.s > 25);
      if (!d) return { error: 'no traffic car on a straight' };
      const car = d.car, side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
      game.player.x = car.x - side.x * 2.2; game.player.z = car.z - side.z * 2.2;
      this.enterNearest();
      const target = game.theft && game.theft.car;
      const jacking = target === car;
      this.step(90);
      const runner = (game.runaways || [])[0];
      return {
        target: car.name, jacking, inCar: game.vehicle === car, carLeftTraffic: !car.ai,
        driverRunning: !!runner && runner.figure.visible,
        driverDistance: runner ? +Math.hypot(runner.x - car.x, runner.z - car.z).toFixed(1) : 0,
      };
    },
    // In the car Wren drives: 2 s of throttle, then 0.7 s of throttle, left and handbrake.
    drift() {
      if (!game.vehicle) return { error: 'not in a car' };
      const t = game.tyres, marksBefore = t.nextMark;
      this.key('KeyW', true); this.step(120);
      this.key('KeyA', true); this.key('Space', true); this.step(42);
      const slip = game.vehicle.slip;
      ['KeyW', 'KeyA', 'Space'].forEach((k) => this.key(k, false));
      return { slip: +slip.toFixed(1), marksLaid: t.nextMark - marksBefore, puffsAlive: t.smoke.filter((s) => s.age < 1).length };
    },
    enterNearest() { game.input.setKey('KeyF', true); game.step(); game.input.setKey('KeyF', false); return this.snapshot(); },
    perf(frames = 30) {
      const gl = game.renderer.getContext();
      const times = [];
      for (let i = 0; i < frames; i++) {
        const t = performance.now();
        game.render();
        gl.finish();
        times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      const info = game.renderer.info.render;
      return { medianMs: times[frames >> 1], drawCalls: info.calls, triangles: info.triangles, heapMB: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null };
    },
  };
  window.__testReady = true;
}
