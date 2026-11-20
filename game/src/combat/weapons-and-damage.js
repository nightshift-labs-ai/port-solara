import * as THREE from 'three';
import { countWitnesses } from '../police/wanted-level.js';

// Hitscan along the crosshair ray (the camera's forward), marched in 0.4 m steps against building
// boxes from the spatial hash, cars (their body box in car space), combat targets and the ground.
// Returns { x, y, z, kind: 'target' | 'car' | 'wall' | 'ground' | 'air', what, dist }.
export function fireWeapon(game, from, dir, range, ignore = null) {
  const targets = (game.combatTargets || []).filter((t) => t.alive && t !== ignore && Math.hypot(t.x - from.x, t.z - from.z) < range + 3);
  const cars = allCars(game).filter((c) => c !== ignore && c.model.visible && Math.hypot(c.x - from.x, c.z - from.z) < range + 4);
  const p = { x: 0, y: 0, z: 0 };
  for (let s = 0.6; s <= range; s += RAY_STEP) {
    p.x = from.x + dir.x * s; p.y = from.y + dir.y * s; p.z = from.z + dir.z * s;
    if (p.y <= 0.02) return { ...p, y: 0.02, kind: 'ground', dist: s };
    for (const t of targets) {
      if (p.y < t.height && Math.hypot(p.x - t.x, p.z - t.z) < t.radius) return { ...p, kind: 'target', what: t, dist: s };
    }
    for (const c of cars) {
      const dx = p.x - c.x, dz = p.z - c.z, f = c.forward;
      const along = dx * f.x + dz * f.z, across = dx * f.z - dz * f.x;
      if (p.y < 1.45 && Math.abs(along) < c.spec.length / 2 && Math.abs(across) < c.spec.width / 2) return { ...p, kind: 'car', what: c, dist: s };
    }
    for (const b of game.collide.query(p.x, p.z, 0)) {
      if (p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ && p.y < (b.h ?? 3)) return { ...p, kind: 'wall', dist: s };
    }
  }
  return { x: from.x + dir.x * range, y: from.y + dir.y * range, z: from.z + dir.z * range, kind: 'air', dist: range };
}

// Fists, the Wasp pistol, the Hornet SMG, the Breaker pump shotgun and the Gannet long rifle (one
// heavy, near-exact round, slow bolt). Ammo is clip + reserve.
// Saves store ammo by index, so a new gun goes at the END. `flash` is the muzzle flash size;
// the Breaker throws `pellets` rays per pull, each with its own spread, and its range counts from Wren.
export const WEAPONS = [
  { id: 'fists', name: 'FISTS', short: 'FISTS', damage: 15, range: 1.9, rate: 0.42, auto: false, clip: 0, spread: 0 },
  { id: 'wasp', name: 'WASP PISTOL', short: 'WASP', damage: 24, range: 70, rate: 0.26, auto: false, clip: 12, reserve: 60, reload: 1.2, spread: 0.008, flash: 0.8 },
  { id: 'hornet', name: 'HORNET SMG', short: 'HORNET', damage: 11, range: 50, rate: 0.085, auto: true, clip: 30, reserve: 150, reload: 1.6, spread: 0.03, flash: 0.62 },
  { id: 'breaker', name: 'BREAKER SHOTGUN', short: 'BREAKER', damage: 16, range: 15, rate: 0.95, auto: false, clip: 6, reserve: 30, reload: 2.4, spread: 0.065, flash: 1.08, pellets: 6 },
  { id: 'gannet', name: 'GANNET RIFLE', short: 'GANNET', damage: 75, range: 130, rate: 1.15, auto: false, clip: 5, reserve: 25, reload: 2.8, spread: 0.0008, flash: 1 },
];
// Locked on a new game: the Hornet (REP 3 at Brass & Barrel, or Ilse in mission 4), the Breaker
// (REP 4) and the Gannet (REP 5).
export const DEFAULT_LOCKED = ['hornet', 'breaker', 'gannet'];

// Wren's arms: slots, ammo, RMB shoulder aim, LMB fire, and the shot effects (four flash sprites, a
// pool of tracers, one Points cloud of sparks). Gunfire panics walkers and, seen, raises WANTED.
export class PlayerWeapons {
  constructor(game) {
    this.game = game;
    this.slot = 0;
    this.ammo = WEAPONS.map((w) => ({ clip: w.clip, reserve: w.reserve || 0 }));
    this.cooldown = 0; this.reloading = 0; this.heatCooldown = 0;
    this.aiming = false; this.firing = 0;
    this.hitMarker = 0; this.shots = 0; this.hits = 0;
    this.locked = new Set(DEFAULT_LOCKED);
    this.seed = 0x2f6e2b1;
    this.fx = buildShotEffects(game.scene);
  }

  get slots() { return WEAPONS; }
  get weapon() { return WEAPONS[this.slot]; }
  get clip() { return this.ammo[this.slot]; }

  select(i) {
    if (i < 0 || i >= WEAPONS.length || i === this.slot || this.locked.has(WEAPONS[i].id)) return;
    this.slot = i; this.reloading = 0; this.cooldown = Math.max(this.cooldown, 0.2);
  }

  // Q / the wheel: step past locked slots (wrapping) to the next one Wren owns.
  cycle(dir) {
    const n = WEAPONS.length;
    for (let k = 1, i = this.slot; k <= n; k++) {
      i = (i + dir + n) % n;
      if (!this.locked.has(WEAPONS[i].id)) return this.select(i);
    }
  }

  // A mission hands Wren a gun: a full clip, at least half the reserve, and it goes in her hand.
  give(id) {
    const i = WEAPONS.findIndex((w) => w.id === id);
    if (i < 0) return;
    const w = WEAPONS[i], a = this.ammo[i];
    this.locked.delete(id);
    a.clip = w.clip; a.reserve = Math.max(a.reserve, (w.reserve || 0) / 2);
    this.select(i);
  }

  reload() {
    const w = this.weapon, a = this.clip;
    if (!w.clip || this.reloading > 0 || a.clip === w.clip || a.reserve <= 0) return;
    this.reloading = w.reload;
  }

  // One fixed tick on foot: `held` is the input's held set, `presses` this tick's new key presses.
  update(dt, held, presses, onFoot) {
    this.cooldown -= dt; this.heatCooldown -= dt;
    this.hitMarker = Math.max(0, this.hitMarker - dt);
    this.firing = Math.max(0, this.firing - dt);
    for (const code of presses) {
      if (/^Digit[1-9]$/.test(code)) this.select(Number(code.slice(5)) - 1);
      if (code === 'KeyQ' || code === 'WheelDown') this.cycle(1);
      if (code === 'WheelUp') this.cycle(-1);
      if (code === 'KeyR' && onFoot) this.reload();
    }
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const w = this.weapon, a = this.clip, take = Math.min(w.clip - a.clip, a.reserve);
        a.clip += take; a.reserve -= take; this.reloading = 0;
      }
    }
    this.aiming = onFoot && held.has('Mouse2');
    if (onFoot) {
      const want = this.weapon.auto ? held.has('Mouse0') : presses.includes('Mouse0');
      if (want) this.pull();
    }
    updateShotEffects(this.fx, dt);
  }

  // Pull the trigger once: a punch or a hitscan shot, then effects, heat and the hit marker.
  pull() {
    if (this.cooldown > 0 || this.reloading > 0) return null;
    const game = this.game, w = this.weapon, a = this.clip, pl = game.player;
    if (w.clip && a.clip <= 0) { this.reload(); return null; }
    this.cooldown = w.rate;
    this.firing = 0.35;
    pl.facing = game.chase.yaw;
    const fx = -Math.sin(pl.facing), fz = -Math.cos(pl.facing), rx = Math.cos(pl.facing), rz = -Math.sin(pl.facing);
    if (!w.clip) return this.punch(pl, fx, fz);
    a.clip--;
    this.shots++;
    // The crosshair ray from the camera, with the weapon's spread, then the tracer from the muzzle.
    // One ray, or the Breaker's pellets (each drawn from this module's own seed), whose short reach
    // counts from Wren rather than the camera behind her. A pull counts at most one hit.
    const cam = game.camera, aim = cam.getWorldDirection(new THREE.Vector3());
    const muzzle = { x: pl.x + fx * 0.78 + rx * 0.33, y: 1.62, z: pl.z + fz * 0.78 + rz * 0.33 };
    const n = w.pellets || 1, reach = n > 1 ? w.range + Math.hypot(cam.position.x - pl.x, cam.position.z - pl.z) : w.range + 4;
    const hits0 = this.hits;
    let hit = null;
    for (let k = 0; k < n; k++) {
      const d = aim.clone();
      d.x += (this.rand() - 0.5) * w.spread * 2; d.y += (this.rand() - 0.5) * w.spread * 2; d.z += (this.rand() - 0.5) * w.spread * 2;
      d.normalize();
      const h = fireWeapon(game, cam.position, d, reach);
      showShot(this.fx, muzzle, h, w.flash);
      this.resolveHit(h, w.damage);
      if (!hit || h.kind === 'target') hit = h;
    }
    this.hits = Math.min(this.hits, hits0 + 1);
    game.crowd?.panic(pl.x, pl.z, 30);
    if (this.heatCooldown <= 0 && (countWitnesses(game, pl.x, pl.z) > 0 || game.copsSee?.())) {
      game.wantedLevel.commit('gunfire', pl.x, pl.z);
      this.heatCooldown = 12;
    }
    if (!a.clip) this.reload();
    return hit;
  }

  punch(pl, fx, fz) {
    const x = pl.x + fx * 1.1, z = pl.z + fz * 1.1;
    const t = (this.game.combatTargets || []).find((e) => e.alive && Math.hypot(e.x - x, e.z - z) < this.weapon.range);
    if (!t) return null;
    const hit = { x: t.x, y: 1.3, z: t.z, kind: 'target', what: t, dist: 1.1 };
    this.resolveHit(hit, this.weapon.damage);
    return hit;
  }

  resolveHit(hit, damage) {
    if (hit.kind === 'target') { hit.what.hit(damage, this.game.player); this.hitMarker = 0.28; this.hits++; }
    if (hit.kind === 'car' && hit.what.health !== undefined) { hit.what.health -= damage * 0.25; this.hitMarker = 0.18; }
  }

  // A shot effect for anyone (the enemy crews share Wren's flash, tracer and spark pools).
  showEffect(muzzle, hit, smg) { showShot(this.fx, muzzle, hit, smg ? CREW_SMG_FLASH : CREW_FLASH); }

  // An SPD round from a cruiser (its own car never stops it). A car other than Wren's in the line
  // holds the round: no flash or tracer, and the hit comes back marked `held`.
  policeRound(muzzle, dir, range, car) {
    const hit = fireWeapon(this.game, muzzle, dir, range, car);
    if (hit.kind === 'car' && hit.what !== this.game.vehicle) return { ...hit, held: true };
    showShot(this.fx, muzzle, hit, POLICE_FLASH);
    return hit;
  }

  rand() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
}

// Every car a shot can meet: parked, traffic, the player's and the SPD units'.
function allCars(game) {
  const list = game.cars.slice();
  for (const u of game.police?.units || []) if (u.car && !list.includes(u.car)) list.push(u.car);
  return list;
}

const RAY_STEP = 0.4, TRACERS = 6, SPARKS = 48, FLASHES = 4, FLASH_LIFE = 0.06, FLASH_RGB = 0xfffbe8;
const TRACER_W = 0.1, TRACER_LIFE = 0.12, TRACER_RGB = 0xfff0c8, CREW_FLASH = 1.2, CREW_SMG_FLASH = 1.0;
const POLICE_FLASH = 1.0;

function buildShotEffects(scene) {
  const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const star = starTexture(), flashes = [];
  for (let i = 0; i < FLASHES; i++) {
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: star, color: FLASH_RGB, ...add }));
    f.visible = false; f.userData.life = 0;
    scene.add(f); flashes.push(f);
  }
  const tracerGeo = new THREE.BoxGeometry(1, 1, 1);
  const tracers = [];
  for (let i = 0; i < TRACERS; i++) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: TRACER_RGB, ...add }));
    m.visible = false; m.userData.life = 0;
    scene.add(m);
    tracers.push(m);
  }
  const pos = new Float32Array(SPARKS * 3).fill(-100);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffb347, size: 0.16, ...add }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  return { flashes, tracers, next: 0, sparks, vel: new Float32Array(SPARKS * 3), life: new Float32Array(SPARKS), nextSpark: 0 };
}

function showShot(fx, muzzle, hit, size) {
  const f = fx.flashes[fx.next % FLASHES];
  f.position.set(muzzle.x, muzzle.y, muzzle.z);
  f.scale.setScalar(size);
  f.material.rotation = (fx.next * 1.7) % 6.28;
  f.visible = true; f.userData.life = FLASH_LIFE;
  const t = fx.tracers[fx.next++ % TRACERS];
  const dx = hit.x - muzzle.x, dy = hit.y - muzzle.y, dz = hit.z - muzzle.z, len = Math.hypot(dx, dy, dz);
  t.position.set(muzzle.x + dx / 2, muzzle.y + dy / 2, muzzle.z + dz / 2);
  t.scale.set(TRACER_W, TRACER_W, len);
  t.lookAt(hit.x, hit.y, hit.z);
  t.visible = true; t.userData.life = TRACER_LIFE; t.material.opacity = 1;
  if (hit.kind === 'air') return;
  // A burst of sparks off whatever the round met, kicked back toward the shooter.
  const pos = fx.sparks.geometry.attributes.position.array, n = hit.kind === 'target' ? 6 : 10;
  for (let i = 0; i < n; i++) {
    const k = fx.nextSpark++ % SPARKS, a = (k * 2.399) % 6.283, up = 1.5 + ((k * 7) % 5) * 0.6;
    pos[k * 3] = hit.x; pos[k * 3 + 1] = hit.y; pos[k * 3 + 2] = hit.z;
    fx.vel[k * 3] = Math.cos(a) * 2.6 - dx / len * 2; fx.vel[k * 3 + 1] = up; fx.vel[k * 3 + 2] = Math.sin(a) * 2.6 - dz / len * 2;
    fx.life[k] = 0.32 + (k % 4) * 0.05;
  }
  fx.sparks.geometry.attributes.position.needsUpdate = true;
}

function updateShotEffects(fx, dt) {
  for (const f of fx.flashes) if (f.visible && (f.userData.life -= dt) <= 0) f.visible = false;
  for (const t of fx.tracers) {
    if (!t.visible) continue;
    t.userData.life -= dt;
    t.material.opacity = Math.max(0, t.userData.life / TRACER_LIFE);
    if (t.userData.life <= 0) t.visible = false;
  }
  const pos = fx.sparks.geometry.attributes.position.array;
  let live = false;
  for (let k = 0; k < SPARKS; k++) {
    if (fx.life[k] <= 0) continue;
    live = true;
    fx.life[k] -= dt;
    fx.vel[k * 3 + 1] -= 9.8 * dt;
    pos[k * 3] += fx.vel[k * 3] * dt; pos[k * 3 + 1] += fx.vel[k * 3 + 1] * dt; pos[k * 3 + 2] += fx.vel[k * 3 + 2] * dt;
    if (fx.life[k] <= 0) pos[k * 3 + 1] = -100;
  }
  if (live) fx.sparks.geometry.attributes.position.needsUpdate = true;
}

// A four-point star with a hot core on a 64 px canvas: the muzzle flash.
function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,240,1)'); grad.addColorStop(0.3, 'rgba(255,200,90,0.8)'); grad.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, r = i % 2 ? 9 : 31;
    g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  g.closePath(); g.fill();
  return new THREE.CanvasTexture(c);
}
