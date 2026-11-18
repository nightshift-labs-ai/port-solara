import * as THREE from 'three';

// The SPD on the street. A pool of six units is built once (four Beacon cruisers, two Bulwark
// SUVs) and answers the WANTED level: 1 = one cruiser, 2 = two, 3 = four plus a two-car roadblock
// across the road ahead, 4+ = all six with the Bulwarks ramming. Far units route over the lane
// graph with A* to where Wren will be in two seconds; inside 40 m they pursue, ride alongside, try
// a PIT on her rear quarter and ram. Line of sight (a unit within 90 m with no building box in
// between) is what keeps the meter IN SIGHT; unseen, they sweep the search circle.
export function dispatchPoliceUnits(game, makeCar) {
  const units = UNIT_ROSTER.map((r, index) => {
    const model = buildPoliceModel(r.kind);
    model.visible = false;
    game.scene.add(model);
    const car = makeCar(POLICE_SPECS[r.kind], model, 1e5, 1e5, 0);
    car.ai = 'spd';
    return { ...r, index, car, model, active: false, state: 'IDLE', path: [], repathIn: 0, stuckFor: 0, reverseFor: 0, awayFor: 0, dist: 1e9, bumpCooldown: 0 };
  });
  const glow = buildBarGlow(units.length + 1);
  game.scene.add(glow);
  const heli = buildHelicopter();
  game.scene.add(heli.group, heli.cone, heli.spot);
  const air = { call: 'SKYLARK 1', kind: 'heli', index: units.length, active: false, state: 'OVERHEAD', dist: 1e9, car: { x: 1e5, z: 1e5 }, y: 0 };
  const police = {
    units, glow, heli: air, enabled: true, seesPlayer: false, roadblock: null, events: [], dispatchIn: 0,
    get active() { return air.active ? [...units.filter((u) => u.active), air] : units.filter((u) => u.active); },
    // Fixed-step update: dispatch by level, drive every unit, fly the helicopter, then the
    // line-of-sight check (the helicopter sees Wren from 140 m: nothing blocks the sky).
    update(dt) {
      const wl = game.wantedLevel;
      const pips = police.enabled ? wl.pips : 0;
      if ((police.dispatchIn -= dt) <= 0) { police.dispatchIn = 0.5; dispatch(pips); }
      for (const u of units) if (u.active) driveUnit(u, dt, pips);
      flyHelicopter(dt, pips);
      police.seesPlayer = pips > 0 && ((air.active && air.dist < HELI_SIGHT) || units.some((u) => u.active && u.dist < SIGHT_RANGE && clearLine(game.collide, u.car.x, u.car.z, game.focus.x, game.focus.z)));
      flashBars();
    },
    // Puts unit i on the street at a spot (the shot module and tests stage chases with it).
    place(i, x, z, heading, speed = 0, state = 'PURSUIT') {
      const u = units[i];
      activate(u, x, z, heading);
      const f = u.car.forward;
      u.car.vx = f.x * speed; u.car.vz = f.z * speed; u.car.speed = speed;
      u.state = state;
      return u;
    },
    // IN CUSTODY: slower than 2 m/s for 2.5 s with a unit within 6 m. The card fades in, Wren is
    // booked at the nearest SPD post (bail $400) and walks out of it on foot. Returns true while
    // the sequence owns the controls.
    arrestFor: 0, arrests: 0, lastFocus: null,
    updateCustody(dt) {
      const p = game.focus, last = police.lastFocus || { x: p.x, z: p.z };
      const speed = Math.hypot(p.x - last.x, p.z - last.z) / dt;
      police.lastFocus = { x: p.x, z: p.z };
      const cu = game.custody;
      if (cu) {
        const age = game.time - cu.at;
        if (!cu.respawned && age > CUSTODY_CARD * 0.55) {
          if (game.vehicle) game.enterOrExit();
          game.player.x = cu.station.x; game.player.z = cu.station.z; game.player.facing = cu.station.facing;
          game.chase.yaw = cu.station.facing; game.chase.lastMode = null;
          police.lastFocus = null;
          cu.respawned = true;
        }
        if (age > CUSTODY_CARD) game.custody = null;
        return true;
      }
      const pips = police.enabled ? game.wantedLevel.pips : 0;
      const near = units.some((u) => u.active && u.state !== 'LEAVING' && u.dist < ARREST_RANGE);
      if (pips > 0 && near && speed < 2) police.arrestFor += dt; else police.arrestFor = 0;
      if (police.arrestFor < CUSTODY_SECONDS) return false;
      const station = SPD_POSTS.reduce((a, b) => (Math.hypot(b.x - p.x, b.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? b : a));
      game.custody = { at: game.time, title: 'IN CUSTODY', sub: `BOOKED AT ${station.name} · BAIL -$${BAIL}`, station, end: CUSTODY_CARD, respawned: false };
      game.cash = Math.max(0, game.cash - BAIL);
      game.wantedLevel.clear();
      police.reset();
      police.arrestFor = 0; police.arrests++;
      return true;
    },
    // Puts SKYLARK 1 in the air at a spot (shot staging); it then flies its orbit as usual.
    placeHelicopter(x, z, y = HELI_HEIGHT) {
      if (!air.active) police.toast('SPD HELICOPTER OVERHEAD');
      air.active = true; air.car.x = x; air.car.z = z; air.y = y;
    },
    reset() { units.forEach(deactivate); police.roadblock = null; air.active = false; air.car.x = air.car.z = 1e5; air.dist = 1e9; },
    toast(text) { police.events.push({ text, at: game.time }); if (police.events.length > 4) police.events.shift(); },
  };

  function dispatch(pips) {
    const want = RESPONSE_BY_LEVEL[pips];
    units.forEach((u, i) => {
      const needed = u.kind === 'beacon' ? i < want.cruisers : pips >= 3;
      if (needed && !u.active) spawnNear(u);
      if (!needed && u.active && u.state !== 'LEAVING') u.state = 'LEAVING';
    });
    // At WANTED 3 the Bulwarks set up a roadblock across the road ahead of Wren.
    if (pips === 3) placeRoadblock();
    else if (police.roadblock) { police.roadblock = null; units.filter((u) => u.state === 'ROADBLOCK').forEach((u) => { u.state = pips >= 4 ? 'RAMMING' : 'LEAVING'; }); }
  }

  // A spawn crossing 70-140 m out, behind Wren where possible, so units arrive instead of appearing.
  function spawnNear(u) {
    const p = game.focus, f = facingOf();
    let best = null, bestScore = Infinity;
    for (const n of game.roads.nodes) {
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < 70 || d > 140 || units.some((o) => o.active && Math.hypot(o.car.x - n.x, o.car.z - n.z) < 20)) continue;
      const ahead = (n.x - p.x) * f.x + (n.z - p.z) * f.z > 0;
      const score = Math.abs(d - 95) + (ahead ? 45 : 0) + ((n.id * 7 + u.index * 13) % 11);
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (!best) return;
    activate(u, best.x, best.z, Math.atan2(-(p.x - best.x), -(p.z - best.z)));
    u.state = 'RESPONDING';
  }

  function activate(u, x, z, heading) {
    const c = u.car;
    c.x = x; c.z = z; c.heading = heading; c.vx = c.vz = 0; c.speed = 0; c.steer = 0; c.health = 100;
    c.sync();
    u.model.visible = true;
    u.active = true; u.path = []; u.repathIn = 0; u.stuckFor = 0; u.reverseFor = 0; u.awayFor = 0;
  }

  function deactivate(u) {
    u.active = false; u.state = 'IDLE'; u.model.visible = false; u.dist = 1e9;
    u.car.x = u.car.z = 1e5; u.car.sync();
  }

  function placeRoadblock() {
    const p = game.focus, f = facingOf();
    const rb = police.roadblock;
    if (rb) {
      const along = (rb.x - p.x) * rb.fx + (rb.z - p.z) * rb.fz;
      if (along > -40 && Math.hypot(rb.x - p.x, rb.z - p.z) < 170) return;
    }
    const alongZ = Math.abs(f.z) >= Math.abs(f.x);
    const roadsAcross = alongZ ? game.roads.nsRoads : game.roads.ewRoads;
    const at = roadsAcross.reduce((a, b) => (Math.abs(b - (alongZ ? p.x : p.z)) < Math.abs(a - (alongZ ? p.x : p.z)) ? b : a));
    const sign = Math.sign(alongZ ? f.z : f.x) || 1;
    const x = alongZ ? at : p.x + sign * ROADBLOCK_AHEAD, z = alongZ ? p.z + sign * ROADBLOCK_AHEAD : at;
    if (game.collide.pointInside(x, z)) return;
    police.roadblock = { x, z, fx: alongZ ? 0 : sign, fz: alongZ ? sign : 0 };
    const across = alongZ ? Math.PI / 2 : 0;
    units.filter((u) => u.kind === 'bulwark').forEach((u, k) => {
      const off = (k ? 1 : -1) * 2.9;
      activate(u, x + (alongZ ? off : 0), z + (alongZ ? 0 : off), across + (k ? Math.PI : 0));
      u.state = 'ROADBLOCK';
    });
    police.toast('ROADBLOCK AHEAD');
  }

  function facingOf() {
    const v = game.vehicle;
    if (v && Math.abs(v.speed) > 2) { const s = Math.hypot(v.vx, v.vz); return { x: v.vx / s, z: v.vz / s }; }
    const h = v ? v.heading : game.player.facing;
    return { x: -Math.sin(h), z: -Math.cos(h) };
  }

  function driveUnit(u, dt, pips) {
    const c = u.car, p = game.focus, v = game.vehicle;
    const pvx = v ? v.vx : 0, pvz = v ? v.vz : 0, pSpeed = Math.hypot(pvx, pvz);
    u.dist = Math.hypot(p.x - c.x, p.z - c.z);
    u.bumpCooldown = Math.max(0, u.bumpCooldown - dt);
    if (c.health <= 0) { game.wantedLevel.commit('cruiserWrecked', c.x, c.z); police.toast(`${u.call} WRECKED`); deactivate(u); return; }
    if (u.state === 'ROADBLOCK') { c.update(dt, { throttle: 0, steer: 0, handbrake: true }, game.collide); return; }
    if (u.state === 'LEAVING' || pips === 0) {
      u.state = 'LEAVING';
      if ((u.awayFor += dt) > 8 || u.dist > 110) { deactivate(u); return; }
    }
    if (u.dist > DESPAWN_RANGE) { deactivate(u); return; }

    // Choose a target point for this tick.
    let tx, tz, ram = false;
    const wl = game.wantedLevel;
    if (u.state === 'LEAVING') {
      tx = c.x + (c.x - p.x); tz = c.z + (c.z - p.z);
    } else if (!wl.inSight && pips > 0 && u.dist > 25) {
      u.state = 'SEARCHING';
      const a = game.time * 0.25 + u.index * 1.2;
      const goal = { x: wl.lastSeen.x + Math.cos(a) * 30, z: wl.lastSeen.z + Math.sin(a) * 30 };
      [tx, tz] = followRoute(u, goal, dt);
    } else if (u.dist > PURSUIT_RANGE) {
      u.state = 'RESPONDING';
      [tx, tz] = followRoute(u, { x: p.x + pvx * 2, z: p.z + pvz * 2 }, dt);
    } else if (u.kind === 'bulwark' && pips >= 4) {
      u.state = 'RAMMING'; ram = true;
      tx = p.x + pvx * 0.35; tz = p.z + pvz * 0.35;
    } else {
      // Pursuit: odd units ride alongside, even units go for the rear quarter (the PIT).
      u.state = 'PURSUIT';
      const fx = pSpeed > 1 ? pvx / pSpeed : 0, fz = pSpeed > 1 ? pvz / pSpeed : 0;
      const side = Math.sign((c.x - p.x) * -fz + (c.z - p.z) * fx) || 1;
      if (u.index % 2) { tx = p.x + pvx * 0.15 - fz * 3.6 * side; tz = p.z + pvz * 0.15 + fx * 3.6 * side; }
      else { tx = p.x - fx * 1.8 - fz * 1.1 * side + pvx * 0.25; tz = p.z - fz * 1.8 + fx * 1.1 * side + pvz * 0.25; }
      if (u.dist < 6 && pips >= 2) { u.state = 'RAMMING'; ram = true; }
    }

    // Steer for the target; brake into sharp turns, match Wren's pace when close, stop to arrest.
    const desired = Math.atan2(-(tx - c.x), -(tz - c.z));
    const diff = wrapAngle(desired - c.heading);
    let steer = Math.max(-1, Math.min(1, -diff * 2.4));
    let throttle = Math.abs(diff) > 1.3 && Math.abs(c.speed) > 11 ? -0.6 : 1;
    let handbrake = false;
    if (!ram && u.state === 'PURSUIT' && u.dist < 16 && Math.abs(c.speed) > pSpeed + 4) throttle = 0.15;
    if (pSpeed < 2 && u.dist < 11 && u.state !== 'LEAVING') { throttle = c.speed > 0.6 ? -1 : 0; handbrake = true; steer = 0; }
    if (u.reverseFor > 0) { u.reverseFor -= dt; throttle = -1; steer = -steer; }
    else if (throttle > 0.5 && Math.abs(c.speed) < 0.8) { if ((u.stuckFor += dt) > 1.4) { u.reverseFor = 1.1; u.stuckFor = 0; } }
    else u.stuckFor = 0;
    c.update(dt, { throttle, steer, handbrake }, game.collide);
    contact(u, v);
  }

  // Lane-graph A* from the unit's crossing to the goal's, re-planned once a second.
  function followRoute(u, goal, dt) {
    const c = u.car;
    if ((u.repathIn -= dt) <= 0 || !u.path.length) {
      u.repathIn = 1;
      u.path = routeOverLanes(nearestNode(game.roads.nodes, c.x, c.z), nearestNode(game.roads.nodes, goal.x, goal.z));
    }
    while (u.path.length && Math.hypot(u.path[0].x - c.x, u.path[0].z - c.z) < 9) u.path.shift();
    const next = u.path.length ? u.path[0] : goal;
    return [next.x, next.z];
  }

  // Unit against Wren: push apart; a hard hit by the player is an assault on the SPD (+2), a
  // unit's ram or PIT shoves her car sideways and turns it.
  function contact(u, v) {
    const c = u.car, p = game.focus;
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz) || 1;
    const reach = v ? 2.5 : 1.6;
    if (d >= reach) return;
    const nx = dx / d, nz = dz / d, push = (reach - d) / 2;
    p.x += nx * push; p.z += nz * push; c.x -= nx * push; c.z -= nz * push;
    if (!v) { c.sync(); return; }
    const closing = (c.vx - v.vx) * nx + (c.vz - v.vz) * nz;
    if (closing > 0) {
      v.vx += nx * closing * 0.6; v.vz += nz * closing * 0.6;
      c.vx -= nx * closing * 0.5; c.vz -= nz * closing * 0.5;
      if ((u.state === 'RAMMING' || u.index % 2 === 0) && u.bumpCooldown === 0) {
        v.heading += 0.22 * Math.sign(nx * v.forward.z - nz * v.forward.x || 1);
        v.health = Math.max(0, v.health - closing * 1.2);
        u.bumpCooldown = 1.2;
      }
    } else if (-closing > 9 && u.bumpCooldown === 0) {
      game.wantedLevel.commit('copAssault', p.x, p.z);
      u.bumpCooldown = 4;
    }
    c.sync(); v.sync();
  }

  // At WANTED 3+ SKYLARK 1 flies in from 160 m and circles 22 m above a spot just ahead of Wren,
  // its searchlight cone on her; below 3 it climbs away and is gone.
  function flyHelicopter(dt, pips) {
    const p = game.focus, f = facingOf();
    if (pips >= 3 && !air.active) {
      air.active = true;
      air.car.x = p.x - f.x * 160; air.car.z = p.z - f.z * 160; air.y = 40;
      police.toast('SPD HELICOPTER OVERHEAD');
    }
    if (pips < 3 && air.active && (air.y += dt * 8) > 70) { air.active = false; air.car.x = air.car.z = 1e5; }
    heli.group.visible = heli.cone.visible = heli.spot.visible = air.active;
    if (!air.active) return;
    const a = game.time * 0.32 + 2.2;
    const ox = p.x + f.x * 26 + Math.cos(a) * 14, oz = p.z + f.z * 26 + Math.sin(a) * 14;
    const dx = ox - air.car.x, dz = oz - air.car.z, d = Math.hypot(dx, dz), step = Math.min(d, 60 * dt);
    if (d > 0.01) { air.car.x += dx / d * step; air.car.z += dz / d * step; }
    if (pips >= 3) air.y += (HELI_HEIGHT - air.y) * Math.min(1, dt * 0.8);
    air.dist = Math.hypot(p.x - air.car.x, p.z - air.car.z);
    heli.group.position.set(air.car.x, air.y, air.car.z);
    heli.group.rotation.set(0, Math.atan2(-(p.x - air.car.x), -(p.z - air.car.z)), 0);
    heli.group.rotateX(-0.12);
    heli.rotor.rotation.y = game.time * 21;
    heli.tail.rotation.x = game.time * 30;
    // Searchlight: a soft cone from the belly to a lit disc around Wren.
    const from = new THREE.Vector3(air.car.x, air.y - 1.2, air.car.z), to = new THREE.Vector3(p.x, 0, p.z);
    const dir = to.clone().sub(from), len = dir.length();
    heli.cone.position.copy(from);
    heli.cone.quaternion.setFromUnitVectors(DOWN, dir.normalize());
    heli.cone.scale.set(SPOT_RADIUS, len, SPOT_RADIUS);
    heli.spot.position.set(p.x, 0.09, p.z);
  }

  // Red and blue swap six times a second, per unit offset; the glow sprites sit over each bar half.
  function flashBars() {
    const pos = glow.geometry.attributes.position, col = glow.geometry.attributes.color;
    units.forEach((u, i) => {
      const phase = Math.floor(game.time * 6 + i * 0.5) % 2;
      u.model.userData.bar.geometry = phase ? BAR_A : BAR_B;
      const c = u.car, h = c.heading, cos = Math.cos(h), sin = Math.sin(h);
      const top = u.kind === 'bulwark' ? 2.12 : 1.78;
      for (const k of [0, 1]) {
        const lx = k ? 0.36 : -0.36, j = i * 2 + k;
        if (!u.active) { pos.setXYZ(j, 0, -50, 0); continue; }
        pos.setXYZ(j, c.x + lx * cos, top, c.z - lx * sin);
        const on = (k === 0) === (phase === 1);
        col.setXYZ(j, k === 0 ? (on ? 1 : 0.25) : 0.1, k === 0 ? 0.12 : (on ? 0.4 : 0.1), k === 0 ? 0.1 : (on ? 1 : 0.25));
      }
    });
    // The helicopter's belly beacons use the last two sprites.
    const j = units.length * 2, ph = Math.floor(game.time * 3) % 2;
    pos.setXYZ(j, air.active ? air.car.x : 0, air.active ? air.y - 1.1 : -50, air.car.z);
    pos.setXYZ(j + 1, air.active ? air.car.x : 0, air.active ? air.y + 0.9 : -50, air.car.z);
    col.setXYZ(j, ph ? 1 : 0.2, 0.1, ph ? 0.1 : 1);
    col.setXYZ(j + 1, 0.9, 0.85, 0.7);
    pos.needsUpdate = true; col.needsUpdate = true;
  }

  return police;
}

// Who answers each level: Beacon cruisers chasing (Bulwarks join from 3: roadblock, then ramming).
export const RESPONSE_BY_LEVEL = [
  { cruisers: 0 }, { cruisers: 1 }, { cruisers: 2 }, { cruisers: 4 }, { cruisers: 4 }, { cruisers: 4 },
];
export const UNIT_ROSTER = [
  { call: 'GULL 11', kind: 'beacon' }, { call: 'TIDE 14', kind: 'beacon' },
  { call: 'CORAL 7', kind: 'beacon' }, { call: 'MERCADO 3', kind: 'beacon' },
  { call: 'ANCHOR 40', kind: 'bulwark' }, { call: 'ANCHOR 41', kind: 'bulwark' },
];
export const POLICE_SPECS = {
  beacon: { name: 'SPD BEACON', topSpeed: 58, accel: 12.5, grip: 7, length: 4.8, width: 1.9 },
  bulwark: { name: 'SPD BULWARK', topSpeed: 52, accel: 11, grip: 6.5, length: 5.0, width: 2.05 },
};
export const SIGHT_RANGE = 90, PURSUIT_RANGE = 40, DESPAWN_RANGE = 230, ROADBLOCK_AHEAD = 120;
export const HELI_SIGHT = 140, HELI_HEIGHT = 18;
// Searchlight radius on the ground: small enough that the low chase camera stays outside the cone.
export const SPOT_RADIUS = 2.6;
export const ARREST_RANGE = 6, CUSTODY_SECONDS = 2.5, CUSTODY_CARD = 4.2, BAIL = 400;
// Where the SPD books Wren: sidewalk spots beside two posts (the nearest one is used).
export const SPD_POSTS = [
  { name: 'SPD PALMLINE POST', x: -168.6, z: 13, facing: 0 },
  { name: 'SPD MERCADO STATION', x: 67.5, z: 60, facing: Math.PI },
];
const DOWN = new THREE.Vector3(0, -1, 0);

// SKYLARK 1: a navy-and-white cabin, tail boom, fin and skids in one mesh, two rotors, and the
// searchlight cone and ground disc (additive, no depth write). Five draw calls.
function buildHelicopter() {
  const body = boxesToGeometry([
    { w: 1.9, h: 1.3, d: 3.4, x: 0, y: 0, z: 0, c: NAVY },
    { w: 1.92, h: 0.5, d: 3.0, x: 0, y: 0.75, z: 0.1, c: WHITE },
    { w: 1.94, h: 0.14, d: 3.42, x: 0, y: 0.15, z: 0, c: GOLD },
    { w: 1.6, h: 0.9, d: 0.9, x: 0, y: 0.15, z: -1.95, c: GLASS },
    { w: 0.36, h: 0.4, d: 4.6, x: 0, y: 0.35, z: 3.9, c: NAVY },
    { w: 0.12, h: 1.3, d: 0.8, x: 0, y: 0.9, z: 6.0, c: WHITE },
    { w: 0.5, h: 0.4, d: 0.5, x: 0, y: 1.2, z: 0, c: TRIM },
    { w: 0.1, h: 0.1, d: 3.4, x: -0.85, y: -1.05, z: 0, c: TRIM },
    { w: 0.1, h: 0.1, d: 3.4, x: 0.85, y: -1.05, z: 0, c: TRIM },
    { w: 0.08, h: 0.5, d: 0.08, x: -0.85, y: -0.8, z: -0.8, c: TRIM }, { w: 0.08, h: 0.5, d: 0.08, x: 0.85, y: -0.8, z: -0.8, c: TRIM },
    { w: 0.08, h: 0.5, d: 0.08, x: -0.85, y: -0.8, z: 0.9, c: TRIM }, { w: 0.08, h: 0.5, d: 0.08, x: 0.85, y: -0.8, z: 0.9, c: TRIM },
  ]);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(body, POLICE_BODY));
  const rotor = new THREE.Mesh(boxesToGeometry([
    { w: 10, h: 0.06, d: 0.32, x: 0, y: 0, z: 0, c: TRIM }, { w: 0.32, h: 0.06, d: 10, x: 0, y: 0, z: 0, c: TRIM },
  ]), POLICE_BODY);
  rotor.position.y = 1.5;
  const tail = new THREE.Mesh(boxesToGeometry([{ w: 0.05, h: 1.8, d: 0.2, x: 0, y: 0, z: 0, c: TRIM }]), POLICE_BODY);
  tail.position.set(0.15, 1.0, 6.1);
  group.add(rotor, tail);
  group.visible = false;
  const coneGeo = new THREE.ConeGeometry(1, 1, 24, 1, true);
  coneGeo.translate(0, -0.5, 0); // apex at the origin, opening down -y
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const cone = new THREE.Mesh(coneGeo, lightMat);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(SPOT_RADIUS, 28).rotateX(-Math.PI / 2), lightMat.clone());
  spot.material.opacity = 0.1;
  cone.visible = spot.visible = false;
  cone.frustumCulled = spot.frustumCulled = false;
  return { group, rotor, tail, cone, spot };
}

// True when no building box stands on the line between two points (sampled every 4 m).
export function clearLine(collide, ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 4);
  for (let k = 1; k < n; k++) if (collide.pointInside(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return false;
  return true;
}

export function nearestNode(nodes, x, z) {
  let best = nodes[0], bd = Infinity;
  for (const n of nodes) { const d = Math.abs(n.x - x) + Math.abs(n.z - z); if (d < bd) { bd = d; best = n; } }
  return best;
}

// A* over the crossings, lane lengths as costs, Manhattan distance as the heuristic.
export function routeOverLanes(from, goal) {
  const g = new Map([[from, 0]]), f = new Map([[from, 0]]), came = new Map(), open = [from];
  const h = (n) => Math.abs(n.x - goal.x) + Math.abs(n.z - goal.z);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f.get(open[i]) < f.get(open[bi])) bi = i;
    const n = open.splice(bi, 1)[0];
    if (n === goal) {
      const path = [n];
      for (let c = n; came.has(c);) { c = came.get(c); path.unshift(c); }
      return path.slice(1);
    }
    for (const lane of n.out) {
      const m = lane.to, cost = g.get(n) + lane.length;
      if (cost >= (g.get(m) ?? Infinity)) continue;
      g.set(m, cost); came.set(m, n); f.set(m, cost + h(m));
      if (!open.includes(m)) open.push(m);
    }
  }
  return [];
}

function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

const WHITE = new THREE.Color(0xf7f5ef), NAVY = new THREE.Color(0x14304f), GOLD = new THREE.Color(0xffc21f);
const GLASS = new THREE.Color(0x1d2b3a), TYRE = new THREE.Color(0x1b1c1f), RIM = new THREE.Color(0xc9ccd2);
const TRIM = new THREE.Color(0x24272d), HEAD = new THREE.Color(0xfff6d8), TAIL = new THREE.Color(0xff3326);

// SPD livery: the Beacon is white over a navy sill with a gold waist band and a push bar; the
// Bulwark SUV is navy with a white roof and the same gold band. Body and bar are two meshes.
export function buildPoliceModel(kind) {
  const suv = kind === 'bulwark';
  const L = suv ? 5.0 : 4.8, W = suv ? 2.05 : 1.9, lift = suv ? 0.25 : 0;
  const boxes = [
    { w: W, h: 0.5, d: L, x: 0, y: 0.5 + lift, z: 0, c: NAVY },
    { w: W - 0.02, h: 0.3, d: L - 0.1, x: 0, y: 0.88 + lift, z: 0, c: suv ? NAVY : WHITE },
    { w: W + 0.03, h: 0.11, d: L - 0.06, x: 0, y: 0.78 + lift, z: 0, c: GOLD },
    { w: W - 0.22, h: 0.52, d: suv ? 3.2 : 2.3, x: 0, y: 1.29 + lift, z: suv ? 0.45 : 0.1, c: GLASS },
    { w: W - 0.18, h: 0.09, d: suv ? 3.1 : 2.2, x: 0, y: 1.59 + lift, z: suv ? 0.45 : 0.1, c: WHITE },
    { w: 1.3, h: 0.08, d: 0.36, x: 0, y: 1.66 + lift, z: 0.2, c: TRIM },
    { w: W - 0.3, h: 0.34, d: 0.16, x: 0, y: 0.55 + lift * 0.6, z: -L / 2 - 0.1, c: TRIM },
    { w: W + 0.04, h: 0.16, d: L + 0.04, x: 0, y: 0.32 + lift * 0.4, z: 0, c: TRIM },
  ];
  const r = suv ? 0.42 : 0.35;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    boxes.push({ w: 0.36, h: r * 2, d: r * 2, x: sx * (W / 2 - 0.1), y: r, z: sz * L * 0.31, c: TYRE });
    boxes.push({ w: 0.38, h: r * 1.1, d: r * 1.1, x: sx * (W / 2 - 0.08), y: r, z: sz * L * 0.31, c: RIM });
  }
  const glowBoxes = [];
  for (const sx of [-1, 1]) {
    glowBoxes.push({ w: 0.46, h: 0.16, d: 0.08, x: sx * (W / 2 - 0.38), y: 0.68 + lift, z: -L / 2 - 0.02, c: HEAD });
    glowBoxes.push({ w: 0.5, h: 0.16, d: 0.08, x: sx * (W / 2 - 0.38), y: 0.68 + lift, z: L / 2 + 0.02, c: TAIL });
  }
  const group = new THREE.Group();
  const body = new THREE.Mesh(boxesToGeometry([...boxes, ...glowBoxes]), POLICE_BODY);
  body.castShadow = true;
  const bar = new THREE.Mesh(BAR_A, BAR_MATERIAL);
  bar.position.y = lift;
  group.add(body, bar);
  group.userData = { kind, bar };
  return group;
}

const POLICE_BODY = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.15 });
const BAR_MATERIAL = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const barHalves = (red, blue) => boxesToGeometry([
  { w: 0.62, h: 0.17, d: 0.3, x: -0.34, y: 1.79, z: 0.2, c: new THREE.Color(...red) },
  { w: 0.62, h: 0.17, d: 0.3, x: 0.34, y: 1.79, z: 0.2, c: new THREE.Color(...blue) },
  { w: 0.08, h: 0.19, d: 0.32, x: 0, y: 1.79, z: 0.2, c: new THREE.Color(0.9, 0.9, 0.9) },
]);
const BAR_A = barHalves([1.6, 0.12, 0.1], [0.06, 0.1, 0.35]);
const BAR_B = barHalves([0.35, 0.05, 0.05], [0.25, 0.55, 1.8]);

// One additive point sprite per bar half (and one spare for the helicopter's lamp): the glow.
function buildBarGlow(count) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,0.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 2 * 3).fill(-50), 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 2 * 3), 3));
  const mat = new THREE.PointsMaterial({ size: 2.6, map: new THREE.CanvasTexture(canvas), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

// Merges coloured boxes into one non-indexed geometry with per-vertex colours.
function boxesToGeometry(list) {
  const unit = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const p = unit.attributes.position, n = unit.attributes.normal;
  const pos = new Float32Array(list.length * p.count * 3), nor = new Float32Array(pos.length), col = new Float32Array(pos.length);
  let o = 0;
  for (const b of list) {
    for (let i = 0; i < p.count; i++, o += 3) {
      pos[o] = p.getX(i) * b.w + b.x; pos[o + 1] = p.getY(i) * b.h + b.y; pos[o + 2] = p.getZ(i) * b.d + b.z;
      nor[o] = n.getX(i); nor[o + 1] = n.getY(i); nor[o + 2] = n.getZ(i);
      col[o] = b.c.r; col[o + 1] = b.c.g; col[o + 2] = b.c.b;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
