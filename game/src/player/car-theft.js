import * as THREE from 'three';

// F next to a car. A parked one opens at once. An occupied one is jacked: the car brakes hard,
// Wren steps to the driver's door, drags the driver out (a short tween with a stumble), the
// driver runs off on foot and the car is hers. Returns what happened, or null if nothing is in reach.
export function stealNearestCar(game) {
  if (game.theft || game.vehicle) return null;
  const car = nearestCar(game);
  if (!car) return null;
  if (!car.ai) {
    if (!car.owned) game.audio?.alarm();
    takeTheWheel(game, car);
    return { car, jacked: false };
  }
  game.traffic.detach(car);
  const p = game.player;
  const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
  const figure = borrowDriverFigure(game);
  figure.visible = false;
  game.theft = { car, t: 0, side, from: { x: p.x, z: p.z }, figure };
  game.crowd?.panic(car.x, car.z, 14);
  return { car, jacked: true };
}

// The closest car within reach of Wren, parked or in traffic.
export function nearestCar(game) {
  let best = null, bd = THEFT_RANGE;
  for (const car of game.cars) {
    if (!car.model.visible || car === game.vehicle) continue;
    const d = Math.hypot(car.x - game.player.x, car.z - game.player.z);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

// Wren is in the driver's seat: hide her, switch the camera, and mark the car as hers.
export function takeTheWheel(game, car) {
  game.vehicle = car;
  car.owned = true;
  game.player.setVisible(false);
  game.chase.mode = 'car';
  game.chase.yaw = car.heading;
  game.focus = car;
}

// One fixed tick of a jacking in progress and of every jacked driver still running away.
export function updateCarTheft(game, dt) {
  const t = game.theft;
  if (t) {
    t.t += dt;
    const car = t.car;
    car.vx *= 0.86; car.vz *= 0.86; car.speed *= 0.86;
    car.sync();
    const p = game.player;
    const door = { x: car.x - t.side.x * 2.0, z: car.z - t.side.z * 2.0 };
    const reach = smooth(Math.min(1, t.t / REACH_TIME));
    p.x = t.from.x + (door.x - t.from.x) * reach;
    p.z = t.from.z + (door.z - t.from.z) * reach;
    p.facing = Math.atan2(-(car.x - p.x), -(car.z - p.z));
    p.speed = reach < 1 ? 3 : 0;
    p.walkPhase += dt * 9;
    p.sync();
    // The driver: in the seat, then dragged out past Wren and tipped off balance.
    const u = Math.max(0, Math.min(1, (t.t - REACH_TIME) / PULL_TIME));
    const f = t.figure;
    if (t.t >= REACH_TIME * 0.8) {
      f.visible = true;
      const out = 0.7 + smooth(u) * 2.9;
      f.position.set(car.x - t.side.x * out, -0.35 + Math.min(1, u * 2) * 0.35, car.z - t.side.z * out);
      f.rotation.set(0, car.heading + Math.PI / 2 * smooth(u), -Math.sin(u * Math.PI) * 0.55);
    }
    if (t.t >= REACH_TIME + PULL_TIME + 0.12) {
      game.theft = null;
      takeTheWheel(game, car);
      const away = { x: -t.side.x, z: -t.side.z };
      (game.runaways ??= []).push({ figure: f, x: f.position.x, z: f.position.z, dir: away, left: RUN_TIME, phase: 0 });
    }
  }
  const runaways = game.runaways || [];
  for (let i = runaways.length - 1; i >= 0; i--) {
    const r = runaways[i];
    r.left -= dt;
    if (r.left <= 0) { r.figure.visible = false; runaways.splice(i, 1); continue; }
    // Sprint away from the car and turn along any wall in the way.
    const before = { x: r.x + r.dir.x * RUN_SPEED * dt, z: r.z + r.dir.z * RUN_SPEED * dt };
    const p = { x: before.x, z: before.z };
    const n = game.collide.resolveCircle(p, 0.4);
    if (n) { const tx = -n.z, tz = n.x, s = Math.sign(tx * r.dir.x + tz * r.dir.z) || 1; r.dir = { x: tx * s, z: tz * s }; }
    r.x = p.x; r.z = p.z;
    r.phase += dt * 13;
    const swing = Math.sin(r.phase) * 0.8;
    const fig = r.figure;
    fig.position.set(r.x, Math.abs(Math.sin(r.phase)) * 0.08, r.z);
    fig.rotation.set(0, Math.atan2(-r.dir.x, -r.dir.z), 0);
    fig.userData.legL.rotation.x = swing;
    fig.userData.legR.rotation.x = -swing;
    fig.userData.armL.rotation.x = -swing;
    fig.userData.armR.rotation.x = swing;
  }
}

// Jacked drivers are a small pool of figures, built on first use and reused oldest-first.
function borrowDriverFigure(game) {
  const pool = (game.driverFigures ??= []);
  if (pool.length < DRIVER_FIGURES) {
    const fig = buildDriverFigure(OUTFITS[pool.length % OUTFITS.length]);
    game.scene.add(fig);
    pool.push(fig);
    return fig;
  }
  const fig = pool.shift();
  pool.push(fig);
  game.runaways = (game.runaways || []).filter((r) => r.figure !== fig);
  return fig;
}

function buildDriverFigure(outfit) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const shirt = mat(outfit), trousers = mat(0x2a2d33), skin = mat(0x8a5a3c);
  const part = (w, h, d, m, x, pivotY) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0), m);
    mesh.castShadow = true;
    const pivot = new THREE.Group();
    pivot.position.set(x, pivotY, 0);
    pivot.add(mesh);
    g.add(pivot);
    return pivot;
  };
  const legL = part(0.2, 0.88, 0.22, trousers, -0.12, 0.9);
  const legR = part(0.2, 0.88, 0.22, trousers, 0.12, 0.9);
  part(0.5, 0.68, 0.3, shirt, 0, 1.56);
  const armL = part(0.14, 0.64, 0.16, shirt, -0.33, 1.52);
  const armR = part(0.14, 0.64, 0.16, shirt, 0.33, 1.52);
  part(0.25, 0.27, 0.25, skin, 0, 1.86);
  g.userData = { legL, legR, armL, armR };
  g.visible = false;
  return g;
}

const smooth = (x) => x * x * (3 - 2 * x);

export const THEFT_RANGE = 6;
const REACH_TIME = 0.35, PULL_TIME = 0.6, RUN_TIME = 7, RUN_SPEED = 5.5, DRIVER_FIGURES = 3;
const OUTFITS = [0x3a6fb0, 0xe2483a, 0x1d9c94];
