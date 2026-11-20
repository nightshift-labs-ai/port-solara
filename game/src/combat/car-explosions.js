import * as THREE from 'three';
import { countCarBlownUp } from '../story/career-stats.js';

// Car damage you can see: under 45 health a car smokes from the hood, under 22 it burns, at 0 it
// blows (a white-orange flash, a ring of debris boxes, a camera shake by distance, a scorched shell
// for civilian cars). Anyone close is hurt; a Beacon blown this way is the police hook's wrecked
// cruiser (+2 WANTED). A burning car (and a wreck for 9 s) shows additive flame tongues rising
// from the front half, a pale plume of smoke over their tips, a flickering warm glow over the hood
// and a warm light on the ground under it. Draw calls: smoke Points, flame Points, the blast
// sprite, the debris mesh, 2 glow sprites, 2 ground pools: at most 8; idle 0; a smoking car 1; a
// burning car at most 3 more (flames, its glow, its pool). Flicker comes from game.time and the
// car's position only: nothing here draws a random number, casts a shadow or feeds the sim.
export class CarExplosions {
  constructor(game) {
    this.game = game;
    const pos = new Float32Array(PUFFS * 3).fill(-100), col = new Float32Array(PUFFS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.puffs = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, map: softTexture(), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.85 }));
    this.puffs.frustumCulled = false;
    this.life = new Float32Array(PUFFS); this.vel = new Float32Array(PUFFS * 3);
    this.next = 0;
    // Flames: their own additive cloud, made after the smoke so it draws over it.
    const fpos = new Float32Array(FLAMES * 3).fill(-100), fcol = new Float32Array(FLAMES * 3);
    const fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    fgeo.setAttribute('color', new THREE.BufferAttribute(fcol, 3));
    this.flames = new THREE.Points(fgeo, new THREE.PointsMaterial({ size: FLAME_SIZE, map: this.puffs.material.map, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.flames.frustumCulled = false; this.flames.visible = false;
    this.flameLife = new Float32Array(FLAMES); this.flameVel = new Float32Array(FLAMES * 3);
    this.flameNext = 0; this.emits = 0;
    // Glows over the hood and light pools on the ground, one each for up to GLOWS burning cars.
    this.glows = Array.from({ length: GLOWS }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffs.material.map, color: GLOW_COLOR, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      s.visible = false;
      return s;
    });
    const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.pools = Array.from({ length: GLOWS }, () => {
      const m = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: this.puffs.material.map, color: POOL_COLOR, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      m.scale.setScalar(POOL_SIZE); m.visible = false;
      return m;
    });
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffs.material.map, color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.flash.visible = false; this.flashLife = 0;
    this.debris = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.25, 0.7), new THREE.MeshStandardMaterial({ color: 0x2b2a2a, roughness: 0.9 }), DEBRIS);
    this.debris.frustumCulled = false;
    this.bits = Array.from({ length: DEBRIS }, () => ({ x: 0, y: -50, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, life: 0 }));
    this.puffs.visible = this.debris.visible = false; // until something smokes or blows
    game.scene.add(this.puffs, this.flames, ...this.glows, ...this.pools, this.flash, this.debris);
    this.emitAcc = 0;
    this.blown = 0;
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.one = new THREE.Vector3(1, 1, 1);
  }

  // One fixed tick: smoke and fire from damaged cars, blasts, then the particles. Glows and pools
  // follow the burning cars every tick; only puffs and flames wait for the emit interval.
  update(dt) {
    const game = this.game;
    this.emitAcc += dt;
    const emit = this.emitAcc > 0.05;
    if (emit) { this.emitAcc = 0; this.emits++; }
    let lit = 0;
    for (const car of allCars(game)) {
      if (!car.model.visible || car.health === undefined) continue;
      if (!car.wrecked && car.health <= 0) this.explode(car);
      const burning = car.wrecked ? game.time - car.wreckedAt < 9 : car.health < 22;
      if (burning && lit < GLOWS) this.light(car, lit++);
      if (!emit) continue;
      if (burning) {
        this.flame(car);
        if (this.emits & 1) this.puff(car, PLUME_Y); // the pale plume over the flame tips
      } else if (car.health < 45) this.puff(car, PUFF_Y);
    }
    for (let i = lit; i < GLOWS; i++) this.glows[i].visible = this.pools[i].visible = false;
    this.updateParticles(dt);
  }

  // Where the fire sits: over the hood, or the middle of a wreck.
  hood(car) {
    const f = car.forward, front = car.wrecked ? 0 : car.spec.length * 0.3;
    return [car.x + f.x * front, car.z + f.z * front];
  }

  puff(car, y) {
    const k = this.next++ % PUFFS, [hx, hz] = this.hood(car);
    const pos = this.puffs.geometry.attributes.position.array, col = this.puffs.geometry.attributes.color.array;
    pos[k * 3] = hx + ((k * 37) % 7 - 3) * 0.08; pos[k * 3 + 1] = y; pos[k * 3 + 2] = hz + ((k * 53) % 7 - 3) * 0.08;
    this.vel[k * 3] = ((k * 13) % 5 - 2) * 0.15; this.vel[k * 3 + 1] = 1.5; this.vel[k * 3 + 2] = ((k * 17) % 5 - 2) * 0.15;
    this.life[k] = 1.6;
    col.set(SMOKE_COLOR, k * 3);
  }

  // One flame tongue along the front half of the car (a wreck: anywhere near its middle).
  flame(car) {
    const k = this.flameNext++ % FLAMES, f = car.forward, L = car.spec.length;
    const pos = this.flames.geometry.attributes.position.array, col = this.flames.geometry.attributes.color.array;
    const u = ((k * 7) % 9) / 8, w = ((k * 5) % 7) / 6 - 0.5;
    const along = car.wrecked ? (u - 0.5) * 2 * FLAME_WRECK : L * (FLAME_FRONT[0] + u * (FLAME_FRONT[1] - FLAME_FRONT[0]));
    const across = w * 2 * (car.wrecked ? FLAME_WRECK / 2 : FLAME_ACROSS);
    pos[k * 3] = car.x + f.x * along - f.z * across; pos[k * 3 + 1] = FLAME_Y; pos[k * 3 + 2] = car.z + f.z * along + f.x * across;
    this.flameVel[k * 3] = ((k * 13) % 5 - 2) * 0.1;
    this.flameVel[k * 3 + 1] = FLAME_RISE[0] + (((k * 3) % 5) / 4) * (FLAME_RISE[1] - FLAME_RISE[0]);
    this.flameVel[k * 3 + 2] = ((k * 17) % 5 - 2) * 0.1;
    this.flameLife[k] = FLAME_LIFE;
    col.set(FLAME_COLOR, k * 3);
  }

  // Glow and ground light number i over a burning car, flickering by game.time and its position.
  light(car, i) {
    const t = this.game.time, [hx, hz] = this.hood(car);
    const a = 1 + FLICKER * (0.6 * Math.sin(t * 13.1 + car.x * 0.7) + 0.4 * Math.sin(t * 21.7 + car.z * 1.3));
    const b = 1 + FLICKER * (0.5 * Math.sin(t * 9.3 + car.z * 0.9) + 0.5 * Math.sin(t * 17.9 + car.x * 1.1));
    const g = this.glows[i], p = this.pools[i];
    g.position.set(hx, GLOW_Y, hz); g.scale.setScalar(GLOW_SIZE * a); g.material.opacity = GLOW_OPACITY * b;
    p.position.set(hx, POOL_Y, hz); p.material.opacity = POOL_OPACITY * b;
    g.visible = p.visible = true;
  }

  explode(car) {
    const game = this.game;
    car.wrecked = true; car.wreckedAt = game.time; car.health = 0;
    car.speed = 0; car.vx = car.vz = 0;
    this.blown++;
    countCarBlownUp(game);
    this.flash.position.set(car.x, 1.6, car.z); this.flash.scale.setScalar(11); this.flash.visible = true; this.flashLife = 0.4;
    this.bits.forEach((b, i) => {
      const a = i / DEBRIS * Math.PI * 2;
      Object.assign(b, { x: car.x, y: 1.1, z: car.z, vx: Math.cos(a) * (5 + (i % 3) * 2), vy: 6 + (i % 4) * 1.6, vz: Math.sin(a) * (5 + (i % 3) * 2), spin: 4 + i, life: 2.4 });
    });
    for (let i = 0; i < 6; i++) this.flame(car);
    const w = game.focus, d = Math.hypot(w.x - car.x, w.z - car.z);
    if (game.chase) game.chase.shake = Math.max(game.chase.shake || 0, Math.max(0, 1 - d / 70));
    game.crowd?.panic(car.x, car.z, 40);
    for (const t of game.combatTargets || []) if (t.alive && Math.hypot(t.x - car.x, t.z - car.z) < BLAST) t.hit(90);
    if (game.vehicle === car) { game.enterOrExit(); game.player.health -= 45; }
    else if (!game.vehicle && d < BLAST) game.player.health -= Math.round(40 * (1 - d / BLAST));
    if (game.player.health <= 0) game.enemies?.lightsOut();
    // Civilian cars stay as scorched shells; traffic lets the car go first. SPD units are recycled
    // by the police (their health at 0 is the +2 hook), so they keep their livery.
    if (car.ai && !car.police) game.traffic.detach(car);
    if (!car.police) car.model.traverse((m) => { if (m.isMesh) { m.userData.mat ??= m.material; m.material = m === car.model.children[0] ? SCORCHED : HIDDEN; } });
    game.toast?.(`${car.name} BLOWN`);
  }

  updateParticles(dt) {
    const geo = this.puffs.geometry, pos = geo.attributes.position.array, col = geo.attributes.color.array;
    // Idle (nothing smoking, burning or flying) costs no draw calls.
    this.puffs.visible = this.life.some((l) => l > 0);
    this.flames.visible = this.flameLife.some((l) => l > 0);
    this.debris.visible = this.bits.some((b) => b.life > 0);
    if (!this.puffs.visible && !this.flames.visible && !this.debris.visible && this.flashLife <= 0 && !this.glows.some((g) => g.visible)) return;
    for (let k = 0; k < PUFFS; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      pos[k * 3] += this.vel[k * 3] * dt; pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      if (this.life[k] <= 0) pos[k * 3 + 1] = -100;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    // Flames rise and cool from orange toward a dim deep red (additive, so they fade out too).
    const fgeo = this.flames.geometry, fpos = fgeo.attributes.position.array, fcol = fgeo.attributes.color.array;
    for (let k = 0; k < FLAMES; k++) {
      if (this.flameLife[k] <= 0) continue;
      this.flameLife[k] -= dt;
      fpos[k * 3] += this.flameVel[k * 3] * dt; fpos[k * 3 + 1] += this.flameVel[k * 3 + 1] * dt; fpos[k * 3 + 2] += this.flameVel[k * 3 + 2] * dt;
      fcol[k * 3] *= FLAME_COOL[0]; fcol[k * 3 + 1] *= FLAME_COOL[1]; fcol[k * 3 + 2] *= FLAME_COOL[2];
      if (this.flameLife[k] <= 0) fpos[k * 3 + 1] = -100;
    }
    fgeo.attributes.position.needsUpdate = true; fgeo.attributes.color.needsUpdate = true;
    if (this.flashLife > 0) {
      this.flashLife -= dt;
      this.flash.material.opacity = Math.max(0, this.flashLife / 0.4);
      if (this.flashLife <= 0) this.flash.visible = false;
    }
    this.bits.forEach((b, i) => {
      if (b.life > 0) {
        b.life -= dt; b.vy -= 9.8 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        if (b.y < 0.12) { b.y = 0.12; b.vy *= -0.3; b.vx *= 0.6; b.vz *= 0.6; b.spin *= 0.5; }
        if (b.life <= 0) b.y = -50;
      }
      this.e.set(b.life * b.spin, b.life * b.spin * 0.7, 0);
      this.m.compose(this.v.set(b.x, b.y, b.z), this.q.setFromEuler(this.e), this.one);
      this.debris.setMatrixAt(i, this.m);
    });
    this.debris.instanceMatrix.needsUpdate = true;
  }
}

export const PUFFS = 72, DEBRIS = 12, BLAST = 6;
// Smoke: grey puffs from the hood at PUFF_Y; a burning car's plume starts at the flame tips.
const SMOKE_COLOR = [0.32, 0.31, 0.3], PUFF_Y = 1.2, PLUME_Y = 4.4;
// Flames: pool, sprite size (m), start height, rise speed range (m/s), life (s), birth colour and
// per-tick cooling (r, g, b), the stretch of the car they leave from (fraction of its length from
// the middle forward), half-width across, and a wreck's half-spread around its middle.
export const FLAMES = 48;
const FLAME_SIZE = 3.2, FLAME_Y = 1.15, FLAME_RISE = [3.8, 4.6], FLAME_LIFE = 0.85;
const FLAME_COLOR = [0.8, 0.36, 0.07], FLAME_COOL = [0.975, 0.95, 0.9];
const FLAME_FRONT = [0.05, 0.45], FLAME_ACROSS = 0.5, FLAME_WRECK = 1.2;
// Glow over the hood and light on the ground: per burning car, flickering by FLICKER.
export const GLOWS = 2;
const GLOW_SIZE = 3.0, GLOW_Y = 1.4, GLOW_OPACITY = 0.4, GLOW_COLOR = 0xff9a40;
const POOL_SIZE = 10, POOL_Y = 0.07, POOL_OPACITY = 0.5, POOL_COLOR = 0xff7a2a, FLICKER = 0.2;
const SCORCHED = new THREE.MeshStandardMaterial({ color: 0x262422, roughness: 1 });
const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });

// Every car a blast can take: the city's and the SPD's.
function allCars(game) {
  const list = game.cars.slice();
  for (const u of game.police?.units || []) if (u.car && u.active && !list.includes(u.car)) { u.car.police = true; list.push(u.car); }
  return list;
}

// A soft round 64 px puff for smoke, fire and the blast flash.
function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.5)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
