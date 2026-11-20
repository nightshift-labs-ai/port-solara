import * as THREE from 'three';
import { buildCityDistricts, districtAt, LANDMARKS } from './world/city-builder.js';
import { buildRoadNetwork } from './world/road-network.js';
import { createSunSoakedLighting } from './world/sunlight-and-sea.js';
import { createDayNightCycle } from './world/day-night-cycle.js';
import { DrivableCar } from './vehicles/car-physics.js';
import { buildCarModel, createTailGlow, CAR_SPECS, PARKED_PAINTS, TRAFFIC_KINDS } from './vehicles/car-models.js';
import { SkidMarksAndSmoke } from './vehicles/skid-marks-and-smoke.js';
import { createTrafficPool } from './traffic/traffic-drivers.js';
import { PedestrianCrowd } from './people/pedestrian-crowd.js';
import { PlayerOnFoot } from './player/player-on-foot.js';
import { stealNearestCar, updateCarTheft, nearestCar } from './player/car-theft.js';
import { WantedLevel } from './police/wanted-level.js';
import { dispatchPoliceUnits, routeOverLanes, nearestNode } from './police/police-ai.js';
import { STORY_MISSIONS, SPEAKERS, rankFor } from './missions/story-missions.js';
import { PlayerWeapons } from './combat/weapons-and-damage.js';
import { EnemyCrews } from './combat/enemies.js';
import { CarExplosions } from './combat/car-explosions.js';
import { createNightLights } from './world/night-lights.js';
import { createNightMarket } from './world/night-market.js';
import { MissionRunner } from './missions/mission-runner.js';
import { SideActivities } from './missions/side-activities.js';
import { ChaseCamera } from './camera/chase-camera.js';
import { drawHud } from './ui/hud.js';
import { drawMinimap } from './ui/minimap.js';
import { showTitleScreen, installPauseAndMap, citySpots } from './ui/menus-and-map.js';
import { installSaveSlots, nearSafehouse } from './core/save-slots.js';
import { createSynthAudio, RADIO_STATIONS, SONG_SECONDS } from './audio/synth-audio.js';
import { PORT_SOLARA_NAMES, FREE_ROAM_OBJECTIVE } from './story/port-solara-lore.js';
import { readKeyboardAndMouse, FIXED_STEP_SECONDS, MAX_SUBSTEPS } from './core/fixed-step-input.js';
import { createSeededRandom, createSpatialHash } from './core/seeded-world-tools.js';
import { zeroStats, countPlayTime, countMetresDriven, countMetresOnFoot, countWantedChange } from './story/career-stats.js';

// Boots Port Solara: one shared game object, the city, Wren and the cars, and a 60 Hz fixed-step loop.
export function bootPortSolara() {
  const params = new URLSearchParams(location.search);
  const canvas = document.getElementById('city-view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 16 / 10, 0.3, 480);
  const hudCanvas = document.getElementById('hud-canvas');
  const game = {
    THREE, scene, camera, renderer, params,
    seed: Number(params.get('seed') || 1),
    lore: PORT_SOLARA_NAMES,
    collide: createSpatialHash(16),
    input: readKeyboardAndMouse(canvas),
    time: 0, tick: 0,
    mode: 'title',
    cash: 18450, wanted: 0,
    // Side activity counts for the map panel (missions/side-activities.js runs them).
    progress: { races: 0, racesOf: 4, courier: 0, courierOf: 10, bestLaps: {}, sold: 0, savedAt: null },
    objective: FREE_ROAM_OBJECTIVE,
    cars: [], vehicle: null, prompt: null, route: null,
    districtAt, districtName: '',
    autoStep: !params.has('shot') && !params.has('test'),
  };
  game.random = createSeededRandom(game.seed);
  // The clock: minutes since 00:00 of the first Friday, an offset over game.time (one game minute
  // per sim second, so it holds still while paused). setClock is the only way to set it.
  game.clockOffset = 0;
  game.clockMinutes = () => game.lore.clock.startMinutes + game.time + game.clockOffset;
  game.setClock = (minutes) => { game.clockOffset = minutes - game.lore.clock.startMinutes - game.time; };

  const t0 = performance.now();
  buildRoadNetwork(game);
  game.light = createSunSoakedLighting(game);
  game.tailGlow = createTailGlow(game);
  buildCityDistricts(game);
  game.cityBuildMs = performance.now() - t0;
  game.dayNight = createDayNightCycle(game);

  // Wren starts on the Palmline sidewalk next to the Albacore; Pipits and Promenades line the curbs.
  game.player = new PlayerOnFoot(scene, -168.6, 13);
  game.chase = new ChaseCamera(camera);
  const addCar = (kind, x, z, heading, paint) => {
    const model = buildCarModel(kind, paint);
    scene.add(model);
    const car = new DrivableCar({ spec: CAR_SPECS[kind], model, x, z, heading });
    game.cars.push(car);
    return car;
  };
  game.albacore = addCar('albacore', -174.6, 10, 0);
  PARKED_SPOTS.forEach(([kind, x, z, h], i) => addCar(kind, x, z, h, PARKED_PAINTS[i % PARKED_PAINTS.length]));
  game.focus = game.player;
  game.traffic = createTrafficPool(game, () => {
    const kind = game.random.pick(TRAFFIC_KINDS);
    const paint = kind === 'pipit' || kind === 'promenade' ? game.random.pick(PARKED_PAINTS) : undefined;
    const car = addCar(kind, 1e5, 1e5, 0, paint);
    car.model.visible = false;
    return car;
  });
  game.traffic.spawnAround(game.player);
  game.nightLights = createNightLights(game);
  game.crowd = new PedestrianCrowd(game);
  game.nightMarket = createNightMarket(game);
  game.walkersNear = (x, z) => game.crowd.near(x, z);
  game.tyres = new SkidMarksAndSmoke(scene);
  game.wantedLevel = new WantedLevel();
  game.police = dispatchPoliceUnits(game, (spec, model, x, z, heading) => new DrivableCar({ spec, model, x, z, heading }));
  game.copsSee = () => game.police.seesPlayer;
  game.toast = (text) => game.police.toast(text);
  game.combatTargets = [];
  game.arms = new PlayerWeapons(game);
  game.enemies = new EnemyCrews(game);
  game.blasts = new CarExplosions(game);
  // Mission props, built once and parked out of sight: the Tidewater van and two Aurum SUVs.
  const props = { van: addCar('dockhand', 1e5, 1e5, 0, 0x1f8a86),aurumA: addCar('aurum', 1e5, 1e5, 0), aurumB: addCar('aurum', 1e5, 1e5, 0) };
  for (const p of Object.values(props)) p.model.visible = false;
  props.albacore = game.albacore;
  game.placeProp = (name, x, z, heading) => {
    const car = props[name];
    if (car.wrecked) { car.model.traverse((m) => { if (m.userData.mat) m.material = m.userData.mat; }); car.wrecked = false; }
    car.x = x; car.z = z; car.heading = heading; car.vx = car.vz = car.speed = 0; car.health = 100;
    car.model.visible = true; car.sync();
    return car;
  };
  // A finished or failed job takes its cover cars away (the Albacore stays where it was left).
  game.clearProps = () => {
    for (const name of ['van', 'aurumA', 'aurumB']) {
      const car = props[name];
      if (car === game.vehicle) continue;
      car.model.visible = false; car.x = car.z = 1e5; car.sync();
    }
  };
  // Road crossings nearest Lantern Point's lighthouse and the Gull Bridge's south landing.
  game.anchors = {
    lantern: nearestNode(game.roads.nodes, LANDMARKS.lighthouse.x, LANDMARKS.lighthouse.z),
    bridge: nearestNode(game.roads.nodes, -392, -290),
  };
  game.story = STORY_MISSIONS;
  game.missions = new MissionRunner(game, STORY_MISSIONS);
  // GPS: the lane graph's A* from the crossing nearest Wren to the one nearest the goal, re-planned
  // every half second or when the goal moves.
  game.planRoute = (from, to) => {
    const a = nearestNode(game.roads.nodes, from.x, from.z), b = nearestNode(game.roads.nodes, to.x, to.z);
    const path = a === b ? [a] : [a, ...routeOverLanes(a, b)];
    return [{ x: from.x, z: from.z }, ...path.map((n) => ({ x: n.x, z: n.z })), { x: to.x, z: to.z }];
  };
  game.gpsGoal = () => game.missions.target || (game.side?.active && game.side.goal) || game.missions.openStarts[0]?.mission.start || { x: LANDMARKS.quist.x, z: LANDMARKS.quist.z + 30 };
  let routeAt = -1, routeGoal = null;
  game.updateRoute = () => {
    const goal = game.gpsGoal();
    if (routeGoal && game.tick - routeAt < 30 && Math.hypot(goal.x - routeGoal.x, goal.z - routeGoal.z) < 4) {
      if (game.route) game.route[0] = { x: game.focus.x, z: game.focus.z };
      return game.route;
    }
    routeAt = game.tick; routeGoal = { x: goal.x, z: goal.z };
    return (game.route = game.planRoute(game.focus, goal));
  };
  game.speakers = SPEAKERS;
  game.rankFor = rankFor;
  // The car radio: Gull FM or Low Tide by the R key, Heat 96 by itself at WANTED 3+.
  game.radio = { station: 0, heat: false };
  game.radioIndex = () => (game.radio.heat ? 2 : game.radio.station);
  game.radioNow = () => {
    if (!game.vehicle) return null;
    const st = RADIO_STATIONS[game.radioIndex()], [song, artist] = st.songs[Math.floor(game.time / SONG_SECONDS) % st.songs.length];
    return { station: st.name, song, artist, heat: game.radio.heat };
  };
  game.audio = createSynthAudio();
  canvas.addEventListener('pointerdown', () => game.audio.unlock());

  game.enterOrExit = () => {
    if (game.vehicle) {
      const car = game.vehicle;
      const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
      game.player.x = car.x - side.x * 2.2; game.player.z = car.z - side.z * 2.2;
      game.player.facing = car.heading;
      game.player.setVisible(true);
      game.vehicle = null;
      game.chase.mode = 'foot';
      game.focus = game.player;
      return;
    }
    stealNearestCar(game);
  };

  game.step = () => {
    const dt = FIXED_STEP_SECONDS;
    const input = game.input;
    if (game.mode === 'paused') { input.takePresses(); input.takeLook(); return; } // the city holds still
    game.time += dt; game.tick++;
    game.roads.signals.update(game.time);
    game.traffic.update(dt, game.focus);
    game.crowd.update(dt, game.focus);
    game.nightMarket.update(dt, game.focus);
    if (game.mode !== 'play') { game.input.takePresses(); return; }
    countPlayTime(game, dt);
    const inCustody = game.police.updateCustody(dt);
    const presses = input.takePresses();
    for (const code of presses) {
      if (code === 'KeyF' && !game.theft && !inCustody) game.enterOrExit();
      if (code === 'KeyR' && game.vehicle) game.radio.station = (game.radio.station + 1) % 2; // Gull FM / Low Tide
      if (code === 'KeyC') game.chase.cycleView(); // SHOULDER / WIDE on foot, NEAR / HIGH in a car
      if (code === 'KeyE' && nearSafehouse(game)) game.saveNote = { text: game.saveGame('Calloway Salvage'), at: game.time };
      else if (code === 'KeyE') game.side.use(); // races, courier, Quist Auto, gun shop, respray
    }
    const onFoot = !game.vehicle && !game.theft && !inCustody;
    game.arms.update(dt, input.held, presses, onFoot);
    game.enemies.update(dt);
    game.chase.aiming = game.arms.aiming;
    game.radio.heat = game.wantedLevel.pips >= 3; // Heat 96 cuts in at WANTED 3+
    const look = input.takeLook();
    game.chase.look(look.x * (game.lookScale || 1), look.y * (game.lookScale || 1));
    updateCarTheft(game, dt);
    if (inCustody) {
      if (game.vehicle) game.vehicle.update(dt, { throttle: 0, steer: 0, handbrake: true }, game.collide);
    } else if (game.theft) {
      // Wren is busy at the driver's door; the tween owns her until the car is hers.
    } else if (game.vehicle) {
      game.vehicle.update(dt, { throttle: input.axis('KeyS', 'KeyW'), steer: input.axis('KeyA', 'KeyD'), handbrake: input.held.has('Space') }, game.collide);
      countMetresDriven(game, dt);
      if (game.vehicle.lastImpact > 6) { game.chase.shake = Math.min(1, game.vehicle.lastImpact / 20); game.vehicle.lastImpact = 0; }
      game.player.x = game.vehicle.x; game.player.z = game.vehicle.z;
    } else {
      const aim = game.arms.aiming || game.arms.firing > 0;
      game.player.update(dt, { x: input.axis('KeyA', 'KeyD'), z: input.axis('KeyW', 'KeyS') }, game.chase.yaw, !aim && (input.held.has('ShiftLeft') || input.held.has('ShiftRight')), game.collide, aim ? game.chase.yaw : null);
      game.player.pose(aim ? game.arms.weapon.id : null);
      countMetresOnFoot(game, dt);
    }
    for (const car of game.cars) if (car !== game.vehicle && !car.ai && Math.abs(car.speed) > 0.05) car.update(dt, { throttle: 0, steer: 0, handbrake: true }, game.collide);
    game.tyres.update(dt, game.vehicle);
    game.blasts.update(dt); // before the police, so a blown Beacon is their +2 wreck this tick
    game.police.update(dt);
    const had = game.wantedLevel.pips;
    game.wantedLevel.update(dt, game.focus, game.copsSee());
    countWantedChange(game, had); // an escape only when the timer takes the last pip
    game.wanted = game.wantedLevel.pips;
    game.missions.update(dt);
    game.side.update(dt);
    game.chase.update(dt, game.focus, game.collide);
    // Entering a district shows its title card, stamped with sim time so shots repeat.
    const district = PORT_SOLARA_NAMES.districts[districtAt(game.focus.x, game.focus.z)];
    if (district !== game.districtName) {
      game.districtName = district;
      game.districtCard = { name: district, sub: PORT_SOLARA_NAMES.districtLines[district] || nearestRoadName(game.roads, game.focus.x, game.focus.z) || 'PORT SOLARA', at: game.time };
    }
    // While WANTED the banner carries the real escape goal and its timer.
    const wl = game.wantedLevel;
    game.objective = wl.pips > 0 ? {
      title: 'LOSE THE SPD - BREAK LINE OF SIGHT',
      detail: wl.inSight ? `In sight · stay unseen ${wl.escapeSeconds}s to escape` : `Unseen ${Math.floor(wl.unseenFor)}s of ${wl.escapeSeconds}s · leave the search zone`,
    } : game.side.active ? game.side.objective() : game.missions.openStarts[0] ? storyObjective(game.missions.openStarts[0].mission) : FREE_ROAM_OBJECTIVE;
  };

  const v = new THREE.Vector3();
  game.render = () => {
    const hudCtx = hudCanvas.getContext('2d');
    game.dayNight.update(); // the light follows the clock (golden hour on the title)
    game.nightLights.update(game.dayNight.level);
    game.nightMarket.render(game.dayNight.level);
    if (game.mode === 'title') {
      // A slow drone swing 250 m east of the Sundial Tower, looking west over the city to the
      // low sun and the bay; the needle stays out past the right edge, clear of the wordmark.
      const a = 0.35 + Math.sin(game.time * 0.05) * 0.12;
      camera.position.set(-30 + Math.cos(a) * 250, 85, -180 + Math.sin(a) * 250);
      camera.lookAt(-47, 20, 69);
      game.light.follow({ x: -60, z: -120 }, camera.position);
    } else {
      game.chase.update(0, game.focus, game.collide);
      game.light.follow(game.focus, camera.position);
    }
    game.tailGlow.update();
    renderer.render(scene, camera);
    const copDistance = game.police.active.reduce((d, u) => Math.min(d, u.dist), Infinity);
    game.audio.update(game.mode === 'play' ? game.vehicle : null, game.mode === 'play' ? copDistance : Infinity, game.radioIndex());
    if (game.mode === 'play') {
      game.updateRoute();
      const near = game.vehicle || game.theft ? null : nearestCar(game);
      game.prompt = null;
      if (near) {
        v.set(near.x, 1.9, near.z).project(camera);
        if (v.z < 1) game.prompt = { text: `[F] ${near.owned ? 'ENTER' : 'STEAL'} ${near.name}`, x: (v.x * 0.5 + 0.5) * hudCanvas.width, y: (-v.y * 0.5 + 0.5) * hudCanvas.height };
      }
      // At the safehouse door: the save prompt, then for three seconds what the save did.
      const home = !game.prompt && nearSafehouse(game);
      if (home) {
        const note = game.saveNote && game.time - game.saveNote.at < 3 ? game.saveNote.text.toUpperCase() : '[E] SAVE AT CALLOWAY SALVAGE';
        v.set(home.x, 2.2, home.z).project(camera);
        if (v.z < 1) game.prompt = { text: note, x: (v.x * 0.5 + 0.5) * hudCanvas.width, y: (-v.y * 0.5 + 0.5) * hudCanvas.height };
      }
      // At a race flag, Quist Auto, the gun shop or Pelican Fuel: what [E] does there.
      const offer = !game.prompt && game.side.offer();
      if (offer) {
        const p = game.side.spotHere();
        v.set(p.x, 2.2, p.z).project(camera);
        if (v.z < 1) game.prompt = { text: offer, x: (v.x * 0.5 + 0.5) * hudCanvas.width, y: (-v.y * 0.5 + 0.5) * hudCanvas.height };
      }
      drawHud(hudCtx, game, drawMinimap);
    }
  };

  game.startPlay = () => {
    game.mode = 'play';
    game.playedOnce = true; // NEW GAME after a quit to title starts over from the boot state
    document.getElementById('title-screen').hidden = true;
    document.getElementById('hud-overlay').hidden = false;
    game.chase.yaw = game.player.facing;
  };

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    hudCanvas.width = innerWidth; hudCanvas.height = innerHeight;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  game.onNewGame = () => { game.audio.unlock(); game.startPlay(); canvas.requestPointerLock?.(); };
  game.quitToTitle = () => {
    game.mode = 'title';
    document.getElementById('hud-overlay').hidden = true;
    showTitleScreen(game, game.onNewGame);
  };
  citySpots(game);
  game.side = new SideActivities(game);
  game.stats = zeroStats(); // career numbers (story/career-stats.js); NEW GAME and loads reset them
  installSaveSlots(game);
  installPauseAndMap(game);
  showTitleScreen(game, game.onNewGame);

  let last = performance.now(), acc = 0;
  const frameTimes = [];
  game.frameTimes = frameTimes;
  renderer.setAnimationLoop((now) => {
    if (game.autoStep) {
      acc = Math.min(acc + (now - last) / 1000, FIXED_STEP_SECONDS * MAX_SUBSTEPS);
      while (acc >= FIXED_STEP_SECONDS) { game.step(); acc -= FIXED_STEP_SECONDS; }
    }
    frameTimes.push(now - last);
    if (frameTimes.length > 240) frameTimes.shift();
    last = now;
    game.render();
  });
  window.portSolara = game;

  if (params.has('shot')) import('./dev/screenshot-scenes.js').then((m) => m.stageScreenshotScene(game, params.get('shot')));
  if (params.has('test')) import('./dev/test-hooks.js').then((m) => m.exposeTestHooks(game));
  return game;
}

// The name of the road under a spot (within its half width plus the sidewalk), or ''.
function nearestRoadName(network, x, z) {
  let best = '', bd = Infinity;
  for (const r of network.roads) {
    const along = r.axis === 'z' ? z : x, across = Math.abs((r.axis === 'z' ? x : z) - r.at);
    if (along < r.from || along > r.to || across > r.width / 2 + 3 || across >= bd) continue;
    bd = across; best = r.name;
  }
  return best;
}

// Free roam with a story mission open: the banner names it and points at its gold ring.
function storyObjective(m) {
  return { title: `STORY ${m.number}/${m.of} - ${m.title.toUpperCase()}`, detail: `Meet ${m.giver.split(' ')[0]} at the gold ring ${m.number} on the map` };
}

// Parked cars along the curbs: [kind, x, z, heading].
export const PARKED_SPOTS = [
  ['pipit', -170.6, -12, 0], ['promenade', -189.4, -4, Math.PI], ['pipit', -170.6, 48, 0],
  ['promenade', -112.5, 70, 0], ['pipit', -66, 100, Math.PI / 2], ['promenade', 113, 50, 0],
  ['pipit', 156.5, 73, 0.5], ['promenade', -170.6, -110, 0], ['pipit', -53, -140, 0],
];

bootPortSolara();
