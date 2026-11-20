// Stages a shot from the seeded start, plays the real simulation forward a fixed number of
// ticks with scripted input, hides the cursor, then flags window.__shotReady.
import { careerFromSave } from '../story/career-stats.js';
import { writeSlot, AUTOSAVE_SLOT } from '../core/save-slots.js';
import { SIDE_ACTIVITIES } from '../missions/side-activities.js';

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
// The career record that save would carry, kept possible for it: Market Day's ambush is the only
// fight so far (3 gang members), one race won (North Ring), three courier drops, the Hornet not
// bought, nothing sold or resprayed; about an hour of play. Applied through careerFromSave, the
// same path a save load uses; the completion % is always computed, never stored.
export const SHOT_CAREER = {
  carsStolen: 9, policeEscapes: 2, highestWanted: 3, metresDriven: 11400, metresOnFoot: 1900,
  gangDowned: 3, carsBlownUp: 1, racesWon: 1, courierDone: 3, timesBooked: 1, clinicVisits: 0,
  carsSold: 0, hornetBought: 0, resprays: 0, secondsPlayed: 3480,
};

function seedShotSave(game) {
  for (const id of SHOT_SAVE.story) game.missions.completed.add(id);
  game.missions.rep = SHOT_SAVE.rep;
  game.cash = SHOT_SAVE.cash;
  Object.assign(game.progress, { races: SHOT_SAVE.races, bestLaps: { ...SHOT_SAVE.bestLaps }, courier: SHOT_SAVE.courier, savedAt: { clock: '14:32', place: SHOT_SAVE.place } });
}

// Writes the shared save into slot 2 as a real record (as the safehouse [E] would) at the fixed time.
function writeShotSave(game) {
  const h = game.spots.find((p) => p.id === 'safehouse');
  const at = { x: game.player.x, z: game.player.z };
  game.player.x = h.x + 1; game.player.z = h.z;
  game.focus = game.player;
  writeSlot(2, game.captureSave(SHOT_SAVE.place), SHOT_SAVE.savedAt);
  game.player.x = at.x; game.player.z = at.z;
}

// Slot 1 as the autosave after Market Day would hold it: the shared save less the North Ring
// first win and the three courier drops (SIDE_ACTIVITIES pay and REP), a shorter career, Wren at
// the ambush (Market Day's last placed step), 45 minutes before slot 2. Everything is put back.
function writeAutosaveShot(game) {
  const market = game.story.find((m) => m.id === 'market'), spot = market.steps.filter((st) => st.at).pop().at;
  const race = SIDE_ACTIVITIES.races.race1, job = SIDE_ACTIVITIES.courier, p = game.player;
  const was = { x: p.x, z: p.z, facing: p.facing, focus: game.focus, done: game.missions.completed, rep: game.missions.rep, cash: game.cash, progress: { ...game.progress }, stats: game.stats };
  game.missions.completed = new Set([...was.done, ...SHOT_SAVE.story]);
  game.missions.rep = SHOT_SAVE.rep - race.rep - SHOT_SAVE.courier * job.rep;
  game.cash = SHOT_SAVE.cash - race.cash - SHOT_SAVE.courier * job.pay;
  Object.assign(game.progress, { races: 0, courier: 0, bestLaps: {} });
  game.stats = careerFromSave({ ...SHOT_CAREER, racesWon: 0, courierDone: 0, metresDriven: 8600, metresOnFoot: 1500, secondsPlayed: 2700 });
  p.x = spot.x; p.z = spot.z; game.focus = p;
  writeSlot(AUTOSAVE_SLOT, game.captureSave(`After ${market.title}`), SHOT_SAVE.savedAt - 45 * 60 * 1000);
  p.x = was.x; p.z = was.z; p.facing = was.facing; game.focus = was.focus;
  game.missions.completed = was.done; game.missions.rep = was.rep; game.cash = was.cash;
  Object.assign(game.progress, was.progress); game.stats = was.stats;
}

// Cover framing: the arm behind and above the Albacore (it fills about 28% of the width), the two
// flanking Beacons' offsets (ahead, sideways; + is the car's right), SKYLARK 1's screen point (NDC)
// and height, and how far right of the low sun the arm looks (rad), so the sun sits up and left of
// centre over the sea at the end of the street.
// v2: the player's own HIGH car view (C in play), down Rua 5 through the Old Mercado toward the
// Palmline front, the beach and the low sun at the end of the street; cruisers beside the coupe.
const FRAME = { start: -22, flank: [[1, -3.7], [5.5, 3.7]], heliX: 0.06, heliY: 0.66, heliUp: 13, speed: 40,
  // The city's parked Pipit (PARKED_SPOTS[8]) up the south kerb of Rua 5 past the Avenida, nose in:
  // at 15 health it burns (under 22) and never blows (over 0); burning never lowers health.
  burner: { x: -75, z: -23.8, heading: Math.PI / 2 + 0.6, health: 15 } };
// Where Wren stands for the Lantern Point stand, from game.anchors.lantern (on the boulevard's sand
// side, 28 m from the nearest walkers' ring corner), the yaw the frame is held near (the SUV, the
// guards and Feira das Lanternas in the WIDE view) and which first-wave guard goes down.
const SEAFRONT = { dx: -6.5, dz: -11.5, yaw: 2.6, down: 0, suv: 32 };

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
    // Walkers on both pavements of Rua 5 in the Old Mercado, ahead of the chase.
    game.crowd.gatherNear(-92, -30, 14, 9);
    game.startPlay();
    const car = game.albacore;
    // The coupe waits at the kerb of Rua 5 in the Old Mercado while the district card comes and
    // goes, so no card rises over the street when the chase starts.
    car.x = FRAME.start; car.z = -31; car.heading = Math.PI / 2; car.vx = car.vz = car.speed = 0; car.sync();
    game.player.x = car.x; game.player.z = car.z + 2.2;
    // The Pipit the pursuit put into the kerb ahead (the city's own parked car), burning.
    const pip = game.cars.find((c) => c.x === -53 && c.z === -140);
    if (!pip) throw new Error('chase: parked Pipit not found');
    Object.assign(pip, FRAME.burner, { speed: 0, vx: 0, vz: 0 }); pip.sync();
    hold([], 300);
    game.enterOrExit();
    // Westbound on Rua 5 (z -30) toward Palmline, the beach and the low sun over the sea.
    car.x = FRAME.start; car.z = -31; car.heading = Math.PI / 2; car.vx = -26; car.vz = 0; car.speed = 26; car.sync();
    game.chase.framing = null;
    game.chase.view = 'high';
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
    // The fourth Beacon comes down the side street at the next crossing ahead.
    pol.place(3, -118, -72, Math.PI, 8);
    hold(['KeyW'], 40);
    // The pursuit closes up around the Albacore: one on each flank, one ahead, SKYLARK 1 on its orbit.
    const v = Math.abs(car.speed);
    pol.place(1, car.x - 2.5, car.z + 4.2, Math.PI / 2, v);
    pol.place(0, car.x - 16, car.z - 3.8, Math.PI / 2, v + 1);
    pol.place(2, car.x - 24, car.z + 3.8, Math.PI / 2, v - 2);
    pol.placeHelicopter(car.x - 27.6, car.z - 13.8);
    hold(['KeyW'], 20);
    // Squared up due west at chase speed again (a nudge from the pursuit can slow or turn it).
    // FRAME.speed is 40 m/s (144 km/h), well under the Albacore's 62 m/s top speed.
    car.heading = Math.PI / 2; car.vx = -FRAME.speed; car.vz = 0; car.speed = FRAME.speed; car.sync();
    // Civilian cars inside the flank slots go back to the pool (its own despawn), so the Beacons own them.
    for (const d of game.traffic.drivers) if (d.car && Math.hypot(d.car.x - car.x, d.car.z - car.z) < 14) game.traffic.despawn(d);
    // Two Beacons re-set on the flanks (one a nose ahead on the left, one a nose behind on the right),
    // so both bars read in full beside the coupe from the high view.
    const f = car.forward, side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
    FRAME.flank.forEach(([ahead, right], k) => pol.place(k, car.x + f.x * ahead + side.x * right, car.z + f.z * ahead + side.z * right, car.heading, Math.abs(car.speed)));
    // The HIGH view follows the car's heading, as in play (the sun hangs at the end of the street).
    game.chase.yaw = car.heading; game.chase.lastMode = null;
    // SKYLARK 1 in open sky: the world spot 30 m up under a fixed screen point (right of the sun,
    // left of the minimap), so it never sits on a panel or the sun.
    game.chase.update(0, game.focus, game.collide);
    const cam = game.camera, ray = new game.THREE.Vector3(FRAME.heliX, FRAME.heliY, 0.5).unproject(cam).sub(cam.position).normalize();
    const t = (FRAME.heliUp - cam.position.y) / ray.y;
    pol.placeHelicopter(cam.position.x + ray.x * t, cam.position.z + ray.z * t, FRAME.heliUp);
    game.step();
  },
  // The Lantern Point stand (mission 4, "Hold Lantern Point against the Aurum SUVs", its spot
  // game.anchors.lantern): the shared save plus The Harbor Run done, the defend step started
  // directly (so Ilse's hand-over of the Hornet is skipped and the gun is given here), and the
  // first Gilded Hand wave (three guards) at the Aurum SUV. At night, in the WIDE view, Wren
  // hip-fires the Hornet until one guard is down, then fires on with Feira das Lanternas lit beyond
  // the SUV; the frame lands when her flash and a guard's show together.
  seafront(game, hold) {
    hold([], 300);
    game.startPlay();
    seedShotSave(game);
    game.missions.completed.add('harbor');
    // The stand at night: Friday 21:38 through the save-load setter (the frame lands near 21:45).
    game.setClock(21 * 60 + 38);
    const a = game.anchors.lantern;
    game.player.x = a.x + SEAFRONT.dx; game.player.z = a.z + SEAFRONT.dz;
    game.player.facing = game.chase.yaw = SEAFRONT.yaw;
    game.chase.footView = 'wide'; // C on foot: the stand, the SUV and the market in one view
    hold([], 200); // the LANTERN POINT card has come and gone
    game.missions.start(game.story[3], 2);
    // aurumA arrives shot up (it smokes); Wren's stray Hornet rounds at the guards behind it set it
    // burning about 1.6 s before the frame.
    game.missions.props[0].health = SEAFRONT.suv;
    game.arms.give('hornet');
    hold([], 75); // the first wave (three guards) lands at 1 s
    // Real fire at one guard until it is down (never while it is behind the SUV).
    const crew = game.enemies.active.slice(), target = crew[SEAFRONT.down];
    for (let n = 0; n < 80 && target.alive; n++) {
      if (target.state === 'cover') { hold([], 5); continue; }
      aimAt(game, target.x, target.height * 0.62, target.z); hold(['Mouse0'], 5);
    }
    if (game.arms.clip.clip < 10) { hold(['KeyR'], 1); hold([], 100); }
    const standing = crew.filter((e) => e.alive);
    standing.forEach((e) => { e.health = Math.max(e.health, 60); e.state = 'peek'; e.timer = 9; });
    // One last aim (a standing guard, or chest height between two) that puts the yaw nearest 2.6.
    const spots = standing.map((e) => [e.x, e.height * 0.62, e.z]);
    for (const a of standing) for (const b of standing) for (const t of [0.25, 0.5, 0.75]) if (a !== b) spots.push([a.x + (b.x - a.x) * t, 1.2, a.z + (b.z - a.z) * t]);
    const off = () => Math.abs(Math.atan2(Math.sin(game.chase.yaw - 2.6), Math.cos(game.chase.yaw - 2.6)));
    let best = spots[0], bestOff = Infinity;
    for (const s of spots) {
      const y0 = game.chase.yaw, p0 = game.chase.pitch;
      aimAt(game, ...s);
      if (off() < bestOff) { bestOff = off(); best = s; }
      game.chase.yaw = y0; game.chase.pitch = p0;
    }
    if (best) aimAt(game, ...best);
    // The frame: Mouse0 held until Wren's and a guard's flash show at once, the downed guard
    // 0.4-2.8 s down.
    const lit = (x, z) => game.arms.fx.flashes.some((f) => f.visible && Math.hypot(f.position.x - x, f.position.z - z) < 1.5);
    game.input.setKey('Mouse0', true);
    for (let i = 0; i < 90; i++) {
      game.step();
      const down = target.alive ? 1 : target.downFor;
      if (lit(game.player.x, game.player.z) && standing.some((e) => lit(e.x, e.z)) && down >= 0.4 && down <= 2.8) break;
    }
    game.input.setKey('Mouse0', false);
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
    game.stats = careerFromSave(SHOT_CAREER); // after the play hold, so no tick adds to it
    game.openPause('map');
  },
  // The title over a drone orbit of the live city: slot 1 the autosave after Market Day (written at
  // step 120), slot 2 the shared save (CONTINUE reads it back), slot 3 empty. Storage is cleared
  // only here, before either is written.
  title(game) {
    localStorage.clear();
    for (let i = 0; i < 120; i++) game.step();
    writeAutosaveShot(game);
    for (let i = 0; i < 300; i++) game.step();
    seedShotSave(game);
    game.stats = careerFromSave(SHOT_CAREER);
    writeShotSave(game);
    game.quitToTitle();
  },
};
