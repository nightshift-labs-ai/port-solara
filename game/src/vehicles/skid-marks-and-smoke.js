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
    // Smoke: one Points object of soft round sprites (a radial-gradient canvas texture), each with
    // its own size and alpha, so a puff grows and fades out within LIFE instead of popping.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PUFFS * 3), 3));
    geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(PUFFS), 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(PUFFS), 1));
    this.puffs = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { map: { value: softDot() }, scale: { value: 700 } },
      vertexShader: `attribute float size; attribute float alpha; varying float vA; uniform float scale;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vA = alpha;
          gl_PointSize = size * scale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying float vA;
        void main() { vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(0.93, 0.92, 0.89, t.a * vA); }`,
      transparent: true, depthWrite: false,
    }));
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
      const every = car.slip > 5 ? 6 : 9;
      wheels.forEach((w, i) => { if ((this.ticks + i * 3) % every === 0) this.emit(w, car, i); });
      this.prev = { car, wheels };
    } else this.prev = null;

    const pos = this.puffs.geometry.attributes.position, size = this.puffs.geometry.attributes.size;
    const alpha = this.puffs.geometry.attributes.alpha;
    for (let i = 0; i < PUFFS; i++) {
      const s = this.smoke[i];
      if (s.age < LIFE) {
        s.age += dt;
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        s.vx *= 0.97; s.vz *= 0.97;
      }
      const k = Math.min(1, s.age / LIFE);
      pos.setXYZ(i, s.x, s.y, s.z);
      size.setX(i, k >= 1 ? 0 : 0.35 + k * 0.9);
      alpha.setX(i, k >= 1 ? 0 : 0.42 * Math.min(1, k / 0.12) * (1 - k));
    }
    pos.needsUpdate = size.needsUpdate = alpha.needsUpdate = true;
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
    // Start half a metre behind the wheel and drift back, so puffs trail the car, not cover it.
    s.x = w.x - car.forward.x * 0.5; s.y = 0.25; s.z = w.z - car.forward.z * 0.5;
    s.vx = car.vx * 0.2 - car.forward.x * 2 + (r1 - 0.5) * 1.2;
    s.vz = car.vz * 0.2 - car.forward.z * 2 + (r2 - 0.5) * 1.2;
    s.vy = 0.35 + r1 * 0.4;
    s.age = 0;
  }
}

// A 64 px white dot whose alpha falls off from the centre: the soft edge of every puff.
function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
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
