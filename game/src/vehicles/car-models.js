import * as THREE from 'three';

// Builds a car as one merged, vertex-coloured body plus a glowing lights mesh (two draw calls).
export function buildCarModel(kind, paint) {
  const spec = CAR_SPECS[kind];
  const color = new THREE.Color(paint ?? spec.paint);
  const boxes = spec.boxes(color);
  const group = new THREE.Group();
  const body = new THREE.Mesh(mergeBoxes(boxes.filter((b) => !b.glow)), BODY_MATERIAL);
  const lights = new THREE.Mesh(mergeBoxes(boxes.filter((b) => b.glow)), LIGHT_MATERIAL);
  body.castShadow = true;
  group.add(body, lights);
  group.userData.kind = kind;
  return group;
}

const BODY_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.15 });
const LIGHT_MATERIAL = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

const GLASS = new THREE.Color(0x1d2b3a), TYRE = new THREE.Color(0x1b1c1f), RIM = new THREE.Color(0xc9ccd2);
const HEAD = new THREE.Color(0xfff6d8), TAIL = new THREE.Color(0xff3326), TRIM = new THREE.Color(0x2a2d33);

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
    name: 'ALBACORE GT', paint: 0xe2483a, topSpeed: 62, accel: 13, grip: 7.5, length: 4.5, width: 1.95,
    boxes: (c) => [
      { w: 1.95, h: 0.55, d: 4.5, x: 0, y: 0.55, z: 0, c },
      { w: 1.9, h: 0.22, d: 1.6, x: 0, y: 0.92, z: -1.3, c },
      { w: 1.5, h: 0.42, d: 1.8, x: 0, y: 1.03, z: 0.25, c: GLASS },
      { w: 1.56, h: 0.08, d: 1.4, x: 0, y: 1.27, z: 0.3, c },
      { w: 1.9, h: 0.1, d: 0.35, x: 0, y: 1.0, z: 2.1, c: TRIM },
      { w: 2.0, h: 0.16, d: 4.55, x: 0, y: 0.32, z: 0, c: TRIM },
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
};

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
