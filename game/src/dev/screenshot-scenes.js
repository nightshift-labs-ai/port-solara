// Stages a shot from the seeded start, plays the real simulation forward a fixed number of
// ticks with scripted input, hides the cursor, then flags window.__shotReady.
export function stageScreenshotScene(game, name) {
  document.body.classList.add('shot-mode');
  const hold = (codes, ticks) => {
    for (const c of codes) game.input.setKey(c, true);
    for (let i = 0; i < ticks; i++) game.step();
    for (const c of codes) game.input.setKey(c, false);
  };
  const scene = SCENES[name] || SCENES.title;
  scene(game, hold);
  game.render();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export const SCENES = {
  // The SPD chase on Palmline: a seeded save state at WANTED 3 (the Albacore's theft was seen and
  // a Beacon was rammed), the Albacore already at 26 m/s northbound with three Beacons on it (one
  // alongside), a fourth at the Rua 5 side street, SKYLARK 1 near its orbit and the Bulwarks'
  // roadblock dispatched ahead. Then 2.4 s of the real sim: pursuit, a handbrake drift into the
  // crossing, walkers on the corner. The camera sits lower and closer than in play.
  chase(game, hold) {
    hold([], 600);
    game.crowd.gatherNear(-170, -26, 8, 9);
    game.startPlay();
    const car = game.albacore;
    game.player.x = car.x - 2.2; game.player.z = car.z;
    game.enterOrExit();
    car.x = -174.6; car.z = 60; car.heading = 0; car.vx = 0; car.vz = -26; car.speed = 26; car.sync();
    game.chase.framing = { back: 4.6, up: 1.9 };
    game.chase.yaw = 0.1; game.chase.lastMode = null;
    const wl = game.wantedLevel;
    wl.clear();
    wl.commit('theft', car.x, car.z, 3);
    wl.commit('copAssault', car.x, car.z);
    const pol = game.police;
    pol.place(3, -160, -30, Math.PI / 2, 5);
    hold(['KeyW'], 100);
    // The pursuit closes up around the Albacore: one alongside, two ahead, SKYLARK 1 on its orbit.
    const v = Math.abs(car.speed);
    pol.place(1, car.x - 3.8, car.z + 1.0, 0, v);
    pol.place(0, car.x + 3.6, car.z - 10, 0, v - 1);
    pol.place(2, car.x - 3.8, car.z - 24, 0, v - 2);
    pol.placeHelicopter(car.x + 13.8, car.z - 27.6);
    hold(['KeyW'], 20);
    hold(['KeyW', 'KeyD', 'Space'], 12);
  },
  // Wren on foot in Old Mercado's market square, the Clock Arch ahead and a Pipit to take.
  street(game, hold) {
    hold([], 300);
    game.crowd.gatherNear(150, 30, 12, 18);
    game.startPlay();
    game.player.x = 153.5; game.player.z = 81.5; game.player.facing = 0.03;
    game.chase.yaw = 0.03;
    hold(['KeyW'], 85);
  },
  // The title over a drone orbit of the live city.
  title(game) {
    for (let i = 0; i < 420; i++) game.step();
  },
};
