import * as THREE from 'three';

// Wren Calloway on foot: camera-relative walking and running, a capsule against building boxes,
// a simple walk cycle, and a saffron windbreaker you can pick out at any distance.
export class PlayerOnFoot {
  constructor(scene, x, z) {
    this.x = x; this.z = z;
    this.facing = 0;
    this.speed = 0;
    this.health = 100;
    this.armour = 40;
    this.radius = 0.4;
    this.walkPhase = 0;
    this.model = buildWrenModel();
    scene.add(this.model);
    this.sync();
  }

  // One fixed tick: move = { x, z } in camera space, yaw = camera heading.
  update(dt, move, yaw, running, collide, aimYaw = null) {
    if (aimYaw !== null) this.facing = aimYaw;
    const len = Math.hypot(move.x, move.z);
    const target = len > 0 ? (running ? RUN_SPEED : WALK_SPEED) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
    if (len > 0) {
      const mx = move.x / len, mz = move.z / len;
      const wx = mx * Math.cos(yaw) + mz * Math.sin(yaw);
      const wz = -mx * Math.sin(yaw) + mz * Math.cos(yaw);
      const want = Math.atan2(-wx, -wz);
      let d = want - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (aimYaw === null) this.facing += d * Math.min(1, dt * 12);
      this.x += wx * this.speed * dt;
      this.z += wz * this.speed * dt;
    }
    const p = { x: this.x, z: this.z };
    collide.resolveCircle(p, this.radius);
    this.x = p.x; this.z = p.z;
    this.walkPhase += this.speed * dt * 2.2;
    this.sync();
  }

  sync() {
    const m = this.model;
    m.position.set(this.x, 0.18, this.z);
    m.rotation.y = this.facing;
    const swing = Math.sin(this.walkPhase) * Math.min(1, this.speed / 3) * 0.7;
    m.userData.legL.rotation.x = swing;
    m.userData.legR.rotation.x = -swing;
    m.userData.armL.rotation.x = -swing * 0.8;
    m.userData.armR.rotation.x = swing * 0.8;
    // Aiming: the gun arm straight out at shoulder height (both arms for the long guns), gun in hand.
    const u = m.userData, pose = this.weaponPose, twoHands = pose === 'hornet' || pose === 'breaker';
    u.gun.visible = !!pose && pose !== 'fists';
    u.gun.scale.y = pose === 'breaker' ? 2.4 : pose === 'hornet' ? 1.7 : 1;
    if (u.gun.visible) {
      u.armR.rotation.set(Math.PI / 2, 0, 0);
      if (twoHands) u.armL.rotation.set(Math.PI / 2, 0, -0.5);
    } else { u.armR.rotation.y = u.armR.rotation.z = 0; u.armL.rotation.y = u.armL.rotation.z = 0; }
  }

  // The held weapon's pose ('wasp', 'hornet', or null for arms down / fists).
  pose(id) {
    if (id === this.weaponPose) return;
    this.weaponPose = id;
    this.sync();
  }

  setVisible(v) { this.model.visible = v; }
}

export const WALK_SPEED = 3.2;
export const RUN_SPEED = 6.8;

function buildWrenModel() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const jacket = mat(0xf2a516), jeans = mat(0x2c3e66), skin = mat(0xc58c64), hair = mat(0x3a2418), shoe = mat(0xf4f1ea);
  const part = (w, h, d, m, x, y, z, pivotY) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0), m);
    const pivot = new THREE.Group();
    pivot.position.set(x, pivotY ?? y, z);
    mesh.castShadow = true;
    pivot.add(mesh);
    g.add(pivot);
    return pivot;
  };
  const legL = part(0.2, 0.86, 0.22, jeans, -0.12, 0, 0, 0.9);
  const legR = part(0.2, 0.86, 0.22, jeans, 0.12, 0, 0, 0.9);
  part(0.22, 0.08, 0.3, shoe, -0.12, 0, -0.04, 0.08);
  part(0.22, 0.08, 0.3, shoe, 0.12, 0, -0.04, 0.08);
  part(0.5, 0.66, 0.3, jacket, 0, 0, 0, 1.56);
  part(0.52, 0.14, 0.32, jacket, 0, 0, 0, 1.6);
  const armL = part(0.14, 0.64, 0.16, jacket, -0.33, 0, 0, 1.52);
  const armR = part(0.14, 0.64, 0.16, jacket, 0.33, 0, 0, 1.52);
  part(0.24, 0.26, 0.24, skin, 0, 0, 0, 1.86);
  part(0.27, 0.12, 0.28, hair, 0, 0, 0.02, 1.9);
  part(0.12, 0.3, 0.1, hair, 0, 0, 0.14, 1.82);
  // The gun: a dark slide and grip at the end of the right arm, pointing down the arm.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.11).translate(0, -0.13, 0.02), mat(0x22262c));
  gun.position.y = -0.6;
  gun.visible = false;
  armR.add(gun);
  g.userData = { legL, legR, armL, armR, gun };
  return g;
}
