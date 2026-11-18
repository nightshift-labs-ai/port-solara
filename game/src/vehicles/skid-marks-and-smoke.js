import * as THREE from 'three';

// Tyre marks and tyre smoke for the car Wren drives. While it slides (sideways slip or the handbrake
// at speed) each rear wheel lays a dark strip from its last spot to this one, in a ring buffer of
// MARKS strips, and puffs grey smoke that rises, swells and shrinks away. Two instanced meshes,
// driven only by sim ticks, so a staged shot shows the same marks every run.
export class SkidMarksAndSmoke {
  constructor(scene) {
    const strip = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.marks = new THREE.InstancedMesh(strip, new THREE.MeshBasicMaterial({
      color: 0x18181c, transparent: true, opacity: 0.62, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), MARKS);
    this.puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({
      color: 0xeeebe4, transparent: true, opacity: 0.38, depthWrite: false,
    }), PUFFS);
    this.marks.frustumCulled = this.puffs.frustumCulled = false;
    this.marks.renderOrder = 1;
    this.puffs.renderOrder = 2;
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.p = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.m.makeScale(0, 0, 0);
    for (let i = 0; i < MARKS; i++) this.marks.setMatrixAt(i, this.m);
    for (let i = 0; i < PUFFS; i++) this.puffs.setMatrixAt(i, this.m);
    this.nextMark = 0;
    this.nextPuff = 0;
    this.smoke = Array.from({ length: PUFFS }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: LIFE }));
    this.prev = null;
    this.ticks = 0;
    scene.add(this.marks, this.puffs);
  }

  // One fixed tick: the car Wren drives, or null on foot.
  update(dt, car) {
    this.ticks++;
    const sliding = !!car && Math.abs(car.speed) > 3 && (car.slip > 2.4 || car.handbrake);
    if (sliding) {
      const wheels = rearWheels(car);
      if (this.prev && this.prev.car === car) wheels.forEach((w, i) => this.layStrip(this.prev.wheels[i], w));
      const every = car.slip > 5 ? 3 : 5;
      wheels.forEach((w, i) => { if ((this.ticks + i * 2) % every === 0) this.emit(w, car, i); });
      this.prev = { car, wheels };
    } else this.prev = null;

    for (let i = 0; i < PUFFS; i++) {
      const s = this.smoke[i];
      if (s.age >= LIFE) continue;
      s.age += dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      s.vx *= 0.97; s.vz *= 0.97;
      const k = s.age / LIFE;
      const size = k >= 1 ? 0 : (0.3 + k * 1.15) * (k > 0.6 ? (1 - k) / 0.4 : 1);
      this.p.set(s.x, s.y, s.z);
      this.s.setScalar(size);
      this.m.compose(this.p, this.q.identity(), this.s);
      this.puffs.setMatrixAt(i, this.m);
    }
    this.puffs.instanceMatrix.needsUpdate = true;
  }

  layStrip(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    if (len < 0.02 || len > 3) return;
    this.p.set((a.x + b.x) / 2, MARK_Y, (a.z + b.z) / 2);
    this.q.setFromAxisAngle(this.up, Math.atan2(dx, dz));
    this.s.set(0.26, 1, len + 0.04);
    this.m.compose(this.p, this.q, this.s);
    this.marks.setMatrixAt(this.nextMark, this.m);
    this.nextMark = (this.nextMark + 1) % MARKS;
    this.marks.instanceMatrix.needsUpdate = true;
  }

  // A puff at the wheel, thrown back and outward a little; spread comes from the tick count.
  emit(w, car, i) {
    const s = this.smoke[this.nextPuff];
    this.nextPuff = (this.nextPuff + 1) % PUFFS;
    const r1 = hash(this.ticks * 2 + i), r2 = hash(this.ticks * 2 + i + 0.5);
    s.x = w.x; s.y = 0.3; s.z = w.z;
    s.vx = car.vx * 0.35 + (r1 - 0.5) * 1.4;
    s.vz = car.vz * 0.35 + (r2 - 0.5) * 1.4;
    s.vy = 0.6 + r1 * 0.6;
    s.age = 0;
  }
}

function rearWheels(car) {
  const f = car.forward, sx = Math.cos(car.heading), sz = -Math.sin(car.heading);
  const back = car.spec.length * 0.32, half = car.spec.width * 0.4;
  const cx = car.x - f.x * back, cz = car.z - f.z * back;
  return [{ x: cx - sx * half, z: cz - sz * half }, { x: cx + sx * half, z: cz + sz * half }];
}

const hash = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };

export const MARKS = 600;
const PUFFS = 48, LIFE = 1.0, MARK_Y = 0.085;
