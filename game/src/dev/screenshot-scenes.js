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

// The one save state behind all four shots: missions 1 and 2 done (story 3/5), REP 640 (rank 4
// WHEELMAN), $18,450, North Ring won, three courier drops, the Hornet still locked, saved at
// Calloway Salvage at 14:32 (UTC, the headless clock). The title's CONTINUE line reads it back.
export const SHOT_SAVE = { story: ['ferry', 'market'], rep: 640, cash: 18450, races: 1, bestLaps: { race1: 52.4 }, courier: 3, savedAt: Date.UTC(2026, 10, 20, 14, 32), place: 'Calloway Salvage' };

function seedShotSave(game) {
  for (const id of SHOT_SAVE.story) game.missions.completed.add(id);
  game.missions.rep = SHOT_SAVE.rep;
  game.cash = SHOT_SAVE.cash;
  Object.assign(game.progress, { races: SHOT_SAVE.races, bestLaps: { ...SHOT_SAVE.bestLaps }, courier: SHOT_SAVE.courier, savedAt: { clock: '14:32', place: SHOT_SAVE.place } });
}

// Writes the shared save into slot 2 as a real record (as the safehouse [E] would) at the fixed time.
function writeShotSave(game) {
  localStorage.clear();
  const h = game.spots.find((p) => p.id === 'safehouse');
  const at = { x: game.player.x, z: game.player.z };
  game.player.x = h.x + 1; game.player.z = h.z;
  game.focus = game.player;
  localStorage.setItem('port-solara/save-slot-2', JSON.stringify({ ...game.captureSave(SHOT_SAVE.place), slot: 2, savedAt: SHOT_SAVE.savedAt }));
  game.player.x = at.x; game.player.z = at.z;
}

// Cover framing: the arm behind and above the Albacore (it fills about 28% of the width), the two
// flanking Beacons' offsets (ahead, sideways; + is the car's right), SKYLARK 1's screen point (NDC)
// and height, and how far right of the low sun the arm looks (rad), so the sun sits up and left of
// centre over the sea at the end of the street.
const FRAME = { back: 2.8, up: 1.55, flank: [[6, -3.5], [9, 3.5]], heliX: 0.2, heliY: 0.5, heliUp: 14, sunRight: 0.2 };
// Where Wren stands for the Mercado fight (south of the van, facing the Clock Arch).
const STREET = { x: 153.2, z: 75.5 };

// Turns the shoulder camera until its crosshair ray runs through a world point (a few passes,
// because the arm's height moves with the pitch).
function aimAt(game, x, y, z) {
  const T = game.THREE, chase = game.chase;
  for (let k = 0; k < 5; k++) {
    chase.update(0, game.focus, game.collide);
    const cam = game.camera, d = cam.getWorldDirection(new T.Vector3());
    const want = new T.Vector3(x - cam.position.x, y - cam.position.y, z - cam.position.z).normalize();
    chase.yaw += Math.atan2(-want.x, -want.z) - Math.atan2(-d.x, -d.z);
    chase.pitch += Math.asin(d.y) - Math.asin(want.y);
  }
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
    hold([], 200); // the district card has come and gone: the sky over Palmline is the helicopter's
    car.x = -174.6; car.z = 10; car.sync();
    game.player.x = car.x - 2.2; game.player.z = car.z;
    game.enterOrExit();
    // Westbound on Rua 5 (z -30) toward Palmline, the beach and the low sun over the sea.
    // It starts inside Palmline Beach (x < -120), so no district card rises over the sun.
    car.x = -122; car.z = -31; car.heading = Math.PI / 2; car.vx = -26; car.vz = 0; car.speed = 26; car.sync();
    game.chase.framing = { back: FRAME.back, up: FRAME.up };
    game.chase.yaw = Math.PI / 2; game.chase.lastMode = null;
    const wl = game.wantedLevel;
    wl.clear();
    wl.commit('theft', car.x, car.z, 3);
    wl.commit('copAssault', car.x, car.z);
    // The same save state as every shot (SHOT_SAVE), mission 3 at its "lose the SPD" step with
    // Mara on the radio.
    seedShotSave(game);
    game.missions.start(game.story[2], 3);
    // Wren carries the Wasp in this save state: the weapon panel shows it, its ammo and the slots.
    game.arms.select(1);
    const pol = game.police;
    // The fourth Beacon comes down Palmline toward the crossing ahead.
    pol.place(3, -183, -62, Math.PI, 8);
    hold(['KeyW'], 40);
    // The pursuit closes up around the Albacore: one on each flank, one ahead, SKYLARK 1 on its orbit.
    const v = Math.abs(car.speed);
    pol.place(1, car.x - 2.5, car.z + 4.2, Math.PI / 2, v);
    pol.place(0, car.x - 16, car.z - 3.8, Math.PI / 2, v + 1);
    pol.place(2, car.x - 24, car.z + 3.8, Math.PI / 2, v - 2);
    pol.placeHelicopter(car.x - 27.6, car.z - 13.8);
    hold(['KeyW'], 20);
    // Squared up due west at chase speed again (a nudge from the pursuit can slow or turn it).
    car.heading = Math.PI / 2; car.vx = -26; car.vz = 0; car.speed = 26; car.sync();
    // Civilian cars inside the flank slots go back to the pool (its own despawn), so the Beacons own them.
    for (const d of game.traffic.drivers) if (d.car && Math.hypot(d.car.x - car.x, d.car.z - car.z) < 14) game.traffic.despawn(d);
    // Two Beacons re-set on the flanks (7-10 m off), so both bars read in full beside the coupe.
    const f = car.forward, side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
    FRAME.flank.forEach(([ahead, right], k) => pol.place(k, car.x + f.x * ahead + side.x * right, car.z + f.z * ahead + side.z * right, car.heading, Math.abs(car.speed)));
    // The arm looks just right of the sun's bearing (yaw for a view along -sunDir is atan2(-x, -z)).
    const sd = game.light.sunDir;
    game.chase.yaw = Math.atan2(-sd.x, -sd.z) - FRAME.sunRight;
    // SKYLARK 1 in open sky: the world spot 13 m up under a fixed screen point (right of the sun,
    // below the right-hand panels), so it never sits on a panel or the sun.
    game.chase.update(0, game.focus, game.collide);
    const cam = game.camera, ray = new game.THREE.Vector3(FRAME.heliX, FRAME.heliY, 0.5).unproject(cam).sub(cam.position).normalize();
    const t = (FRAME.heliUp - cam.position.y) / ray.y;
    pol.placeHelicopter(cam.position.x + ray.x * t, cam.position.z + ray.z * t, FRAME.heliUp);
    game.step();
  },
  // The Mercado fight (mission 3, stage 2/6, the cover's save state one step earlier): Wren on the
  // left third in the shoulder aim with the Wasp, two Tidewater gunmen behind their Dockhand van
  // under the Clock Arch, walkers scattering from the gunfire, Mara on the radio and the Albacore
  // parked within reach. The last shot is fired two ticks before the frame: flash, tracer, sparks
  // and the hit marker are all live.
  street(game, hold) {
    hold([], 300);
    game.crowd.gatherNear(152, 70, 10, 16);
    game.startPlay();
    seedShotSave(game);
    game.player.x = STREET.x; game.player.z = STREET.z; game.player.facing = 0.05; game.chase.yaw = 0.05;
    // The curbside Pipit by the arch moves on, so the parked coupe is the car within reach.
    const pipit = game.cars.find((c) => c.name === 'PIPIT' && Math.hypot(c.x - 156.5, c.z - 73) < 1);
    if (pipit) { pipit.x = pipit.z = 1e5; pipit.model.visible = false; pipit.sync(); }
    hold([], 200); // the district card has come and gone
    game.missions.start(game.story[2], 1);
    game.arms.select(1);
    const [first] = game.enemies.active;
    const aim = () => aimAt(game, first.x, first.height * 0.62, first.z);
    game.input.setKey('Mouse2', true);
    aim();
    hold([], 40);
    for (let i = 0; i < 2; i++) {
      aim(); hold(['Mouse0'], 1); aim(); hold([], 60);
    }
    // Keep the gunmen in the fight for the frame: all three step out past the van's ends to shoot.
    game.enemies.active.forEach((e) => { e.health = Math.max(e.health, 60); e.state = 'peek'; e.timer = 9; });
    hold([], 50);
    aim(); hold(['Mouse0'], 1); hold([], 2);
  },
  // The Tab map on the shared save: story 3/5 with The Harbor Run current, Races 1/4,
  // Courier 3/10, REP rank 4, cash and "Saved 14:32 - Calloway Salvage"; Wren on Palmline.
  map(game, hold) {
    hold([], 300);
    game.startPlay();
    seedShotSave(game);
    // Wren on a crossing inland of Palmline, clear of ring 1 and the race flag at her start.
    const n = game.roads.nodes.reduce((b, p) => (Math.hypot(p.x + 90, p.z - 20) < Math.hypot(b.x + 90, b.z - 20) ? p : b));
    game.player.x = n.x; game.player.z = n.z; game.player.facing = 0.6;
    hold([], 60);
    game.openPause('map');
  },
  // The title over a drone orbit of the live city, with CONTINUE read back from the shared save
  // written into slot 2 as a real record.
  title(game) {
    for (let i = 0; i < 420; i++) game.step();
    seedShotSave(game);
    writeShotSave(game);
    game.quitToTitle();
  },
};
