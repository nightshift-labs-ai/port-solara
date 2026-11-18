import * as THREE from 'three';

// Car damage you can see: under 45 health a car smokes from the hood, under 22 it burns, at 0 it
// blows (a white-orange flash, a ring of debris boxes, a camera shake by distance, a scorched shell
// for civilian cars). Anyone close is hurt; a Beacon blown this way is the police hook's wrecked
// cruiser (+2 WANTED). One Points cloud, one sprite, one instanced debris mesh: 3 draw calls.
export class CarExplosions {
  constructor(game) {
    this.game = game;
    const pos = new Float32Array(PUFFS * 3).fill(-100), col = new Float32Array(PUFFS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.puffs = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, map: softTexture(), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.85 }));
    this.puffs.frustumCulled = false;
    this.life = new Float32Array(PUFFS); this.vel = new Float32Array(PUFFS * 3); this.fire = new Uint8Array(PUFFS);
    this.next = 0;
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffs.material.map, color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.flash.visible = false; this.flashLife = 0;
    this.debris = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.25, 0.7), new THREE.MeshStandardMaterial({ color: 0x2b2a2a, roughness: 0.9 }), DEBRIS);
    this.debris.frustumCulled = false;
    this.bits = Array.from({ length: DEBRIS }, () => ({ x: 0, y: -50, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, life: 0 }));
    game.scene.add(this.puffs, this.flash, this.debris);
    this.emitAcc = 0;
    this.blown = 0;
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.one = new THREE.Vector3(1, 1, 1);
  }

  // One fixed tick: smoke and fire from damaged cars, blasts, then the particles.
  update(dt) {
    const game = this.game;
    this.emitAcc += dt;
    const emit = this.emitAcc > 0.05;
    if (emit) this.emitAcc = 0;
    for (const car of allCars(game)) {
      if (!car.model.visible || car.health === undefined) continue;
      if (!car.wrecked && car.health <= 0) this.explode(car);
      if (!emit) continue;
      const burning = car.wrecked ? game.time - car.wreckedAt < 9 : car.health < 22;
      if (burning || car.health < 45) this.puff(car, burning);
    }
    this.updateParticles(dt);
  }

  puff(car, fire) {
    const k = this.next++ % PUFFS, f = car.forward, front = car.wrecked ? 0 : car.spec.length * 0.3;
    const pos = this.puffs.geometry.attributes.position.array, col = this.puffs.geometry.attributes.color.array;
    pos[k * 3] = car.x + f.x * front + ((k * 37) % 7 - 3) * 0.08; pos[k * 3 + 1] = 1.2; pos[k * 3 + 2] = car.z + f.z * front + ((k * 53) % 7 - 3) * 0.08;
    this.vel[k * 3] = ((k * 13) % 5 - 2) * 0.15; this.vel[k * 3 + 1] = fire ? 2.6 : 1.5; this.vel[k * 3 + 2] = ((k * 17) % 5 - 2) * 0.15;
    this.life[k] = fire ? 0.8 : 1.6; this.fire[k] = fire ? 1 : 0;
    const c = fire ? [1, 0.55, 0.15] : [0.32, 0.31, 0.3];
    col.set(c, k * 3);
  }

  explode(car) {
    const game = this.game;
    car.wrecked = true; car.wreckedAt = game.time; car.health = 0;
    car.speed = 0; car.vx = car.vz = 0;
    this.blown++;
    this.flash.position.set(car.x, 1.6, car.z); this.flash.scale.setScalar(11); this.flash.visible = true; this.flashLife = 0.4;
    this.bits.forEach((b, i) => {
      const a = i / DEBRIS * Math.PI * 2;
      Object.assign(b, { x: car.x, y: 1.1, z: car.z, vx: Math.cos(a) * (5 + (i % 3) * 2), vy: 6 + (i % 4) * 1.6, vz: Math.sin(a) * (5 + (i % 3) * 2), spin: 4 + i, life: 2.4 });
    });
    for (let i = 0; i < 6; i++) this.puff(car, true);
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
    for (let k = 0; k < PUFFS; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      pos[k * 3] += this.vel[k * 3] * dt; pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      if (this.fire[k]) { col[k * 3 + 1] *= 0.97; col[k * 3 + 2] *= 0.95; }
      if (this.life[k] <= 0) pos[k * 3 + 1] = -100;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
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
