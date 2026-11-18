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
      };
    },
    step(n = 1) { for (let i = 0; i < n; i++) game.step(); return this.snapshot(); },
    key(code, down) { game.input.setKey(code, down); },
    teleport(x, z, facing = 0) {
      const t = game.vehicle || game.player;
      t.x = x; t.z = z;
      if (game.vehicle) { t.heading = facing; t.vx = t.vz = 0; t.sync(); } else { t.facing = facing; game.chase.yaw = facing; }
      return this.snapshot();
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
