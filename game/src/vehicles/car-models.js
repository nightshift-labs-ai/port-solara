import * as THREE from 'three';

// Builds a car as one merged, vertex-coloured body plus a glowing lights mesh (two draw calls).
export function buildCarModel(kind, paint) {
  const spec = CAR_SPECS[kind];
  const color = new THREE.Color(paint ?? spec.paint);
  const boxes = spec.boxes(color);
  const group = new THREE.Group();
  const body = new THREE.Mesh(mergeBoxes(boxes.filter((b) => !b.glow)), spec.finish === 'satin' ? SATIN_PAINT : BODY_MATERIAL);
  const lights = new THREE.Mesh(mergeBoxes(boxes.filter((b) => b.glow)), LIGHT_MATERIAL);
  body.castShadow = true;
  group.add(body, lights);
  group.userData.kind = kind;
  return group;
}

// The driven car's tail lights glow: two small additive point sprites over the lamps (one draw
// call). Off on foot and at graphics LOW (the brief's "LOW turns bloom off").
export function createTailGlow(game) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.3, 'rgba(255,255,255,0.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.1, color: 0xff4a2a, map: new THREE.CanvasTexture(canvas),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  points.frustumCulled = false;
  game.scene.add(points);
  const p = new THREE.Vector3(), lamps = {};
  // Each kind's own tail-lamp boxes (the TAIL glow boxes in its spec), found once.
  const tailsOf = (kind) => lamps[kind] ??= CAR_SPECS[kind] ? CAR_SPECS[kind].boxes(new THREE.Color()).filter((b) => b.glow && b.c === TAIL) : [];
  return {
    update() {
      const car = game.vehicle, tails = car ? tailsOf(car.model.userData.kind) : [];
      points.visible = tails.length === 2 && game.mode === 'play' && game.settings?.graphics !== 'low';
      if (!points.visible) return;
      car.model.updateMatrixWorld();
      const pos = geo.attributes.position;
      tails.forEach((b, k) => {
        car.model.localToWorld(p.set(b.x, b.y, b.z + 0.1));
        pos.setXYZ(k, p.x, p.y, p.z);
      });
      pos.needsUpdate = true;
    },
  };
}

const BODY_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.15 });
// The coupe wears a satin coat: on gloss paint the low golden-hour sun (and the bounce light opposite)
// glares off its roof, hood and deck and washes the coral to cream.
const SATIN_PAINT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.15 });
const LIGHT_MATERIAL = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

const GLASS = new THREE.Color(0x1d2b3a), TYRE = new THREE.Color(0x1b1c1f), RIM = new THREE.Color(0xc9ccd2);
const HEAD = new THREE.Color(0xfff6d8), TAIL = new THREE.Color(0xff3326), TRIM = new THREE.Color(0x2a2d33);
const PLATE = new THREE.Color(0xf4ecd4);

function wheels(w, l, r) {
  const out = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    out.push({ w: 0.36, h: r * 2, d: r * 2, x: sx * (w / 2 - 0.1), y: r, z: sz * l, c: TYRE });
    out.push({ w: 0.38, h: r * 1.1, d: r * 1.1, x: sx * (w / 2 - 0.08), y: r, z: sz * l, c: RIM });
  }
  return out;
}

function lightsFor(w, len, y) {
  return [
    { w: 0.5, h: 0.18, d: 0.08, x: -w / 2 + 0.4, y, z: -len / 2 - 0.02, c: HEAD, glow: true },
    { w: 0.5, h: 0.18, d: 0.08, x: w / 2 - 0.4, y, z: -len / 2 - 0.02, c: HEAD, glow: true },
    { w: 0.55, h: 0.16, d: 0.08, x: -w / 2 + 0.4, y, z: len / 2 + 0.02, c: TAIL, glow: true },
    { w: 0.55, h: 0.16, d: 0.08, x: w / 2 - 0.4, y, z: len / 2 + 0.02, c: TAIL, glow: true },
  ];
}

// Cars face -z. Sizes in metres.
export const CAR_SPECS = {
  albacore: {
    name: 'ALBACORE GT', paint: 0xe2483a, finish: 'satin', topSpeed: 62, accel: 13, grip: 7.5, length: 4.5, width: 1.95,
    boxes: (c) => [
      { w: 1.95, h: 0.55, d: 4.5, x: 0, y: 0.55, z: 0, c },
      { w: 1.9, h: 0.22, d: 1.6, x: 0, y: 0.92, z: -1.3, c },
      { w: 1.5, h: 0.42, d: 1.8, x: 0, y: 1.03, z: 0.25, c: GLASS },
      { w: 1.56, h: 0.08, d: 1.4, x: 0, y: 1.27, z: 0.3, c },
      { w: 1.9, h: 0.1, d: 0.35, x: 0, y: 1.0, z: 2.1, c: TRIM },
      { w: 2.0, h: 0.16, d: 4.55, x: 0, y: 0.32, z: 0, c: TRIM },
      // Rear detail: a small raised spoiler on two struts, a bright bumper line, a diffuser with
      // three fins and a lit plate between them.
      { w: 0.08, h: 0.16, d: 0.12, x: -0.62, y: 1.13, z: 2.0, c: TRIM }, { w: 0.08, h: 0.16, d: 0.12, x: 0.62, y: 1.13, z: 2.0, c: TRIM },
      { w: 1.86, h: 0.06, d: 0.36, x: 0, y: 1.23, z: 2.04, c },
      { w: 1.97, h: 0.04, d: 0.05, x: 0, y: 0.46, z: 2.26, c: RIM },
      { w: 1.5, h: 0.12, d: 0.1, x: 0, y: 0.27, z: 2.27, c: TRIM },
      { w: 0.05, h: 0.1, d: 0.14, x: -0.4, y: 0.27, z: 2.31, c: RIM }, { w: 0.05, h: 0.1, d: 0.14, x: 0, y: 0.27, z: 2.31, c: RIM }, { w: 0.05, h: 0.1, d: 0.14, x: 0.4, y: 0.27, z: 2.31, c: RIM },
      { w: 0.5, h: 0.13, d: 0.04, x: 0, y: 0.58, z: 2.27, c: PLATE, glow: true },
      ...wheels(1.95, 1.45, 0.34),
      ...lightsFor(1.95, 4.5, 0.66),
    ],
  },
  pipit: {
    name: 'PIPIT', paint: 0x7fc8d6, topSpeed: 40, accel: 8, grip: 6, length: 3.7, width: 1.75,
    boxes: (c) => [
      { w: 1.75, h: 0.7, d: 3.7, x: 0, y: 0.65, z: 0, c },
      { w: 1.6, h: 0.62, d: 2.2, x: 0, y: 1.3, z: 0.35, c: GLASS },
      { w: 1.66, h: 0.1, d: 2.1, x: 0, y: 1.65, z: 0.35, c },
      { w: 1.8, h: 0.14, d: 3.75, x: 0, y: 0.36, z: 0, c: TRIM },
      ...wheels(1.75, 1.15, 0.32),
      ...lightsFor(1.75, 3.7, 0.8),
    ],
  },
  promenade: {
    name: 'PROMENADE', paint: 0xf1ead8, topSpeed: 48, accel: 9, grip: 6.5, length: 4.7, width: 1.85,
    boxes: (c) => [
      { w: 1.85, h: 0.65, d: 4.7, x: 0, y: 0.62, z: 0, c },
      { w: 1.66, h: 0.55, d: 2.3, x: 0, y: 1.22, z: 0.15, c: GLASS },
      { w: 1.7, h: 0.1, d: 2.2, x: 0, y: 1.52, z: 0.15, c },
      { w: 1.9, h: 0.14, d: 4.75, x: 0, y: 0.36, z: 0, c: TRIM },
      ...wheels(1.85, 1.5, 0.34),
      ...lightsFor(1.85, 4.7, 0.75),
    ],
  },
  saltrunner: {
    name: 'SALTRUNNER', paint: 0x2f6f8f, topSpeed: 44, accel: 8.5, grip: 5.5, length: 5.1, width: 2.0,
    boxes: (c) => [
      { w: 2.0, h: 0.75, d: 5.1, x: 0, y: 0.75, z: 0, c },
      { w: 1.86, h: 0.62, d: 1.9, x: 0, y: 1.45, z: -0.45, c: GLASS },
      { w: 1.92, h: 0.1, d: 1.8, x: 0, y: 1.8, z: -0.45, c },
      { w: 1.96, h: 0.34, d: 2.0, x: 0, y: 1.29, z: 1.5, c: TRIM },
      { w: 2.05, h: 0.16, d: 5.15, x: 0, y: 0.42, z: 0, c: TRIM },
      ...wheels(2.0, 1.7, 0.4),
      ...lightsFor(2.0, 5.1, 0.95),
    ],
  },
  dockhand: {
    name: 'DOCKHAND', paint: 0xf4f1ea, topSpeed: 36, accel: 6.5, grip: 5, length: 5.4, width: 2.1,
    boxes: (c) => [
      { w: 2.1, h: 1.9, d: 4.2, x: 0, y: 1.35, z: 0.55, c },
      { w: 2.06, h: 1.05, d: 1.2, x: 0, y: 0.92, z: -2.05, c },
      { w: 1.96, h: 0.6, d: 0.1, x: 0, y: 1.72, z: -1.5, c: GLASS },
      { w: 2.12, h: 0.32, d: 4.0, x: 0, y: 1.55, z: 0.6, c: new THREE.Color(0x1d9c94) },
      { w: 2.15, h: 0.18, d: 5.45, x: 0, y: 0.4, z: 0, c: TRIM },
      ...wheels(2.1, 1.8, 0.4),
      ...lightsFor(2.1, 5.4, 0.85),
    ],
  },
  citrine: {
    name: 'CITRINE CAB', paint: 0xc4e83a, topSpeed: 46, accel: 9, grip: 6.5, length: 4.6, width: 1.85,
    boxes: (c) => [
      { w: 1.85, h: 0.66, d: 4.6, x: 0, y: 0.62, z: 0, c },
      { w: 1.66, h: 0.56, d: 2.3, x: 0, y: 1.23, z: 0.1, c: GLASS },
      { w: 1.7, h: 0.1, d: 2.2, x: 0, y: 1.54, z: 0.1, c },
      { w: 0.9, h: 0.26, d: 0.4, x: 0, y: 1.72, z: 0.1, c: new THREE.Color(0xfff6d8), glow: true },
      { w: 1.9, h: 0.14, d: 4.65, x: 0, y: 0.36, z: 0, c: TRIM },
      ...wheels(1.85, 1.45, 0.34),
      ...lightsFor(1.85, 4.6, 0.75),
    ],
  },
  // The Gilded Hand's black SUV with a gold waist line and a gold grille.
  aurum: {
    name: 'AURUM SUV', paint: 0x121418, topSpeed: 50, accel: 10, grip: 6.2, length: 5.0, width: 2.05,
    boxes: (c) => [
      { w: 2.05, h: 0.95, d: 5.0, x: 0, y: 0.85, z: 0, c },
      { w: 1.9, h: 0.7, d: 3.1, x: 0, y: 1.65, z: 0.35, c: GLASS },
      { w: 1.96, h: 0.1, d: 3.1, x: 0, y: 2.04, z: 0.35, c },
      { w: 2.08, h: 0.09, d: 5.02, x: 0, y: 1.2, z: 0, c: new THREE.Color(0xd8a928) },
      { w: 1.2, h: 0.3, d: 0.06, x: 0, y: 0.85, z: -2.52, c: new THREE.Color(0xd8a928) },
      { w: 2.1, h: 0.18, d: 5.05, x: 0, y: 0.42, z: 0, c: TRIM },
      ...wheels(2.05, 1.65, 0.42),
      ...lightsFor(2.05, 5.0, 1.0),
    ],
  },
};

// Traffic mix: Pipits most of all, then sedans, cabs, pickups and vans.
export const TRAFFIC_KINDS = ['pipit', 'pipit', 'pipit', 'promenade', 'promenade', 'citrine', 'citrine', 'saltrunner', 'dockhand'];

export const PARKED_PAINTS = [0x7fc8d6, 0xf2b134, 0xf1ead8, 0x1d9c94, 0x9aa7b8, 0xb8d86b];

function mergeBoxes(list) {
  const pos = [], nor = [], col = [];
  const unit = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const p = unit.attributes.position, n = unit.attributes.normal;
  for (const b of list) {
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i) * b.w + b.x, p.getY(i) * b.h + b.y, p.getZ(i) * b.d + b.z);
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(b.c.r, b.c.g, b.c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
