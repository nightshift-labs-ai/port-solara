// Exposes window.__test for tools/selftest.mjs: snapshot, step(n), simulated keys, teleport, perf.
export function exposeTestHooks(game) {
  window.__test = {
    start() { game.startPlay(); return this.snapshot(); },
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
    step(n = 1) { for (let i = 0; i < n; i++) game.step(); return this.snapshot(); },
    key(code, down) { game.input.setKey(code, down); },
    teleport(x, z, facing = 0) {
      const t = game.vehicle || game.player;
      t.x = x; t.z = z;
      if (game.vehicle) { t.heading = facing; t.vx = t.vz = 0; t.sync(); } else { t.facing = facing; game.chase.yaw = facing; }
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
