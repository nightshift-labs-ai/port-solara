// Exposes window.__test for tools/selftest.mjs: snapshot, step(n), simulated keys, teleport, perf.
import { countWitnesses } from '../police/wanted-level.js';

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
