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

// Cover framing: the arm behind and above the Albacore (it fills about 28% of the width), TIDE 14's
// offset ahead/left of it, and SKYLARK 1's screen point (NDC) and height.
const FRAME = { back: 2.8, up: 1.55, tideAhead: 8, tideLeft: -3.4, heliX: -0.04, heliY: 0.33, heliUp: 14 };

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
    // z sits half a palm spacing (16 m) on from M3a so the camera falls between two median trunks.
    car.x = -174.6; car.z = 56; car.heading = 0; car.vx = 0; car.vz = -26; car.speed = 26; car.sync();
    game.chase.framing = { back: FRAME.back, up: FRAME.up };
    game.chase.yaw = 0.1; game.chase.lastMode = null;
    const wl = game.wantedLevel;
    wl.clear();
    wl.commit('theft', car.x, car.z, 3);
    wl.commit('copAssault', car.x, car.z);
    // The same save state as every shot: mission 1 done (REP and cash paid), mission 3 at its
    // "lose the SPD" step with Mara on the radio.
    game.missions.completed.add('ferry');
    game.missions.rep = 380;
    game.missions.start(game.story[2], 3);
    // Wren carries the Wasp in this save state: the weapon panel shows it, its ammo and the slots.
    game.arms.select(1);
    const pol = game.police;
    pol.place(3, -160, -30, Math.PI / 2, 5);
    hold(['KeyW'], 100);
    // The pursuit closes up around the Albacore: one alongside, two ahead, SKYLARK 1 on its orbit.
    const v = Math.abs(car.speed);
    pol.place(1, car.x - 4.2, car.z - 2.5, 0, v);
    pol.place(0, car.x + 3.8, car.z - 16, 0, v + 1);
    pol.place(2, car.x - 3.8, car.z - 24, 0, v - 2);
    pol.placeHelicopter(car.x + 13.8, car.z - 27.6);
    hold(['KeyW'], 20);
    hold(['KeyW', 'KeyD', 'Space'], 12);
    // TIDE 14 re-set alongside on the left, ahead enough to read in full beside the coupe.
    const f = car.forward, side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
    pol.place(1, car.x + f.x * FRAME.tideAhead - side.x * FRAME.tideLeft, car.z + f.z * FRAME.tideAhead - side.z * FRAME.tideLeft, car.heading, Math.abs(car.speed));
    // SKYLARK 1 in open sky: the world spot 15 m up under a fixed screen point (centre, below the
    // mission panel, left of the bank tower), so it never sits on a panel whatever the start z.
    game.chase.update(0, game.focus, game.collide);
    const cam = game.camera, ray = new game.THREE.Vector3(FRAME.heliX, FRAME.heliY, 0.5).unproject(cam).sub(cam.position).normalize();
    const t = (FRAME.heliUp - cam.position.y) / ray.y;
    pol.placeHelicopter(cam.position.x + ray.x * t, cam.position.z + ray.z * t, FRAME.heliUp);
    game.step();
  },
  // Wren on foot in Old Mercado's market square, the Clock Arch ahead and a Pipit to take.
  street(game, hold) {
    hold([], 300);
    game.crowd.gatherNear(150, 30, 12, 18);
    game.startPlay();
    // The cover's save state, an earlier step: mission 1 done, mission 3 just started at the Mercado.
    game.missions.completed.add('ferry');
    game.missions.rep = 380;
    game.missions.start(game.story[2], 0);
    game.player.x = 153.5; game.player.z = 81.5; game.player.facing = 0.03;
    game.chase.yaw = 0.03;
    hold(['KeyW'], 85);
  },
  // The title over a drone orbit of the live city.
  title(game) {
    for (let i = 0; i < 420; i++) game.step();
  },
};
