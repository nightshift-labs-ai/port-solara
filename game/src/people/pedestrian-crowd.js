import * as THREE from 'three';

// Walkers on the sidewalk ring around each block near the player: two instanced meshes (bodies and
// heads), a stroll along the ring, a dash to the wall side when a car comes at them, and a panic hook.
export class PedestrianCrowd {
  constructor(game) {
    this.game = game;
    this.random = game.random;
    this.walkers = [];
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.bodies = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.8 }), CROWD_SIZE);
    this.heads = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.7 }), CROWD_SIZE);
    this.bodies.castShadow = true;
    this.bodies.frustumCulled = this.heads.frustumCulled = false;
    game.scene.add(this.bodies, this.heads);
    for (let i = 0; i < CROWD_SIZE; i++) {
      this.walkers.push({ x: 0, z: 0, ring: null, u: 0, dir: 1, speed: 1.3, flee: 0, side: 0, phase: i * 0.7 });
      this.bodies.setColorAt(i, new THREE.Color(this.random.pick(OUTFITS)));
    }
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.yAxis = new THREE.Vector3(0, 1, 0);
  }

  // Puts a walker on a random block ring 20-120 m from the focus.
  respawn(w, focus) {
    const blocks = this.game.roads.blocks;
    for (let tries = 0; tries < 10; tries++) {
      const b = this.random.pick(blocks);
      if (Math.hypot(b.cx - focus.x, b.cz - focus.z) > 120) continue;
      w.ring = { minX: b.minX - 1.5, maxX: b.maxX + 1.5, minZ: b.minZ - 1.5, maxZ: b.maxZ + 1.5 };
      w.ring.len = 2 * (w.ring.maxX - w.ring.minX + w.ring.maxZ - w.ring.minZ);
      w.u = this.random.range(0, w.ring.len);
      w.dir = this.random.chance(0.5) ? 1 : -1;
      w.speed = this.random.range(1.1, 1.6);
      w.flee = 0; w.side = 0;
      this.place(w);
      return;
    }
  }

  // Ring parameter to a point: north edge, east edge, south edge, west edge.
  place(w) {
    const r = w.ring, a = r.maxX - r.minX, b = r.maxZ - r.minZ;
    let u = ((w.u % r.len) + r.len) % r.len;
    let nx = 0, nz = 0;
    if (u < a) { w.x = r.minX + u; w.z = r.minZ; nz = -1; }
    else if ((u -= a) < b) { w.x = r.maxX; w.z = r.minZ + u; nx = 1; }
    else if ((u -= b) < a) { w.x = r.maxX - u; w.z = r.maxZ; nz = 1; }
    else { u -= a; w.x = r.minX; w.z = r.maxZ - u; nx = -1; }
    // side > 0 steps back toward the buildings (inward), never past the block edge.
    w.x -= nx * w.side; w.z -= nz * w.side;
    w.nx = nx; w.nz = nz;
  }

  update(dt, focus) {
    const game = this.game;
    this.walkers.forEach((w, i) => {
      if (!w.ring || Math.hypot(w.x - focus.x, w.z - focus.z) > 160) this.respawn(w, focus);
      if (!w.ring) return;
      for (const car of game.cars) {
        if (!car.model.visible || Math.abs(car.speed) < 3) continue;
        const dx = w.x - car.x, dz = w.z - car.z, d = Math.hypot(dx, dz);
        const f = car.forward;
        if (d < 9 && (dx * f.x + dz * f.z) * Math.sign(car.speed) > 0) w.flee = 2;
      }
      const running = w.flee > 0;
      if (running) w.flee -= dt;
      w.side = Math.max(0, Math.min(1.2, w.side + (running ? 3 : -0.6) * dt));
      w.u += w.dir * (running ? 4 : w.speed) * dt;
      const px = w.x, pz = w.z;
      this.place(w);
      const heading = Math.atan2(-(w.x - px), -(w.z - pz)) || 0;
      const bob = Math.abs(Math.sin(game.time * (running ? 14 : 8) + w.phase)) * 0.06;
      this.q.setFromAxisAngle(this.yAxis, heading);
      this.m.compose(new THREE.Vector3(w.x, 0.95 + bob, w.z), this.q, new THREE.Vector3(0.5, 1.1, 0.3));
      this.bodies.setMatrixAt(i, this.m);
      this.m.compose(new THREE.Vector3(w.x, 1.68 + bob, w.z), this.q, new THREE.Vector3(0.26, 0.28, 0.26));
      this.heads.setMatrixAt(i, this.m);
    });
    this.bodies.instanceMatrix.needsUpdate = this.heads.instanceMatrix.needsUpdate = true;
  }

  // Everyone within the radius runs (gunfire and crashes call this later).
  panic(x, z, radius) {
    for (const w of this.walkers) if (Math.hypot(w.x - x, w.z - z) < radius) w.flee = 3;
  }

  // Staging (shots and tests): put `count` walkers on the block rings closest to a spot, each at
  // the ring point nearest it plus a seeded spread, so a scene can start with a busy corner.
  gatherNear(x, z, count, spread = 14) {
    const blocks = [...this.game.roads.blocks].sort((a, b) => Math.hypot(a.cx - x, a.cz - z) - Math.hypot(b.cx - x, b.cz - z));
    for (let i = 0; i < Math.min(count, this.walkers.length); i++) {
      const w = this.walkers[i], b = blocks[i % 2];
      w.ring = { minX: b.minX - 1.5, maxX: b.maxX + 1.5, minZ: b.minZ - 1.5, maxZ: b.maxZ + 1.5 };
      const r = w.ring, a = r.maxX - r.minX, h = r.maxZ - r.minZ;
      r.len = 2 * (a + h);
      // Ring parameter of the corner point nearest the spot, then walk a little way from it.
      const cx = Math.max(r.minX, Math.min(r.maxX, x)), cz = Math.max(r.minZ, Math.min(r.maxZ, z));
      let u;
      if (cz === r.minZ) u = cx - r.minX;
      else if (cx === r.maxX) u = a + (cz - r.minZ);
      else if (cz === r.maxZ) u = a + h + (r.maxX - cx);
      else u = 2 * a + h + (r.maxZ - cz);
      w.u = u + this.random.range(-spread, spread);
      w.dir = this.random.chance(0.5) ? 1 : -1;
      w.speed = this.random.range(1.1, 1.6);
      w.flee = 0; w.side = 0;
      this.place(w);
    }
  }

  near(x, z, radius = 30) {
    return this.walkers.filter((w) => w.ring && Math.abs(w.x - x) < radius && Math.abs(w.z - z) < radius);
  }
}

export const CROWD_SIZE = 32;
const OUTFITS = [0xe2483a, 0x1d9c94, 0xf2b134, 0xf4f1ea, 0x3a6fb0, 0x7fc8d6, 0xb8d86b, 0x2a2d33];
