import * as THREE from 'three';

// Fills every block by district (Palmline Beach, Coral Heights, Old Mercado, Saltworks Docks),
// then raises the landmarks, palms and our signs. Buildings are instanced per archetype.
export function buildCityDistricts(game) {
  const { scene, roads, random, collide, lore } = game;
  const lots = { stucco: [], glass: [], shed: [], roof: [], clutter: [], slab: [] };
  const tints = {
    stucco: [0xfbf6ec, 0xf1dfc0, 0xf6c9a8, 0xbfe3dc, 0xf7e7b4, 0xf3d2c9],
    glass: [0x9fd0e6, 0x7fb7d6, 0xb6dde0, 0x8fc7c4],
    shed: [0xe8e2d6, 0xc9d6dd, 0xe6c7a5, 0xd9483b],
  };
  const addBuilding = (kind, x, z, w, d, h) => {
    lots[kind].push({ x, z, w, d, h, color: random.pick(tints[kind]) });
    collide.insert({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h });
    if (kind !== 'shed' && random.chance(0.8)) {
      for (let k = random.int(1, 3); k > 0; k--) {
        lots.clutter.push({ x: x + random.range(-w / 3, w / 3), z: z + random.range(-d / 3, d / 3), y: h, s: random.range(1.5, 3.2) });
      }
    }
  };

  for (const b of roads.blocks) {
    const district = districtAt(b.cx, b.cz);
    b.district = district;
    lots.slab.push(b);
    const bw = b.maxX - b.minX, bd = b.maxZ - b.minZ;
    if (isLandmarkBlock(b)) continue;
    if (district === 'mercado') {
      for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const w = bw / 2 - 1.5, d = bd / 2 - 1.5, h = 3.5 * random.int(2, 4);
        const x = b.cx + fx * (bw / 4), z = b.cz + fz * (bd / 4);
        addBuilding('stucco', x, z, w, d, h);
        lots.roof.push({ x, z, w, d, y: h });
      }
    } else if (district === 'palmline') {
      const h = 3.5 * random.int(4, 8);
      addBuilding('stucco', b.cx + 2, b.cz - bd / 4, bw - 8, bd / 2 - 2, h);
      addBuilding('stucco', b.cx + 2, b.cz + bd / 4, bw - 8, bd / 2 - 2, 3.5 * random.int(3, 6));
    } else if (district === 'coral') {
      const tall = random.range(40, 105);
      addBuilding('glass', b.cx - bw / 5, b.cz, bw / 2, bd - 6, tall);
      addBuilding('glass', b.cx + bw / 4, b.cz + bd / 5, bw / 2.6, bd / 2.2, tall * random.range(0.4, 0.7));
    } else {
      addBuilding('shed', b.cx, b.cz - bd / 5, bw - 6, bd / 2, random.range(8, 12));
    }
  }

  const facades = makeFacadeTextures();
  scene.add(instancedBoxes(lots.stucco, facades.stucco, 3.5, 5, true));
  scene.add(instancedBoxes(lots.glass, facades.glass, 4, 4, true));
  scene.add(instancedBoxes(lots.shed, facades.shed, 6, 8, true));
  scene.add(roofCaps(lots.roof));
  scene.add(plainBoxes(lots.clutter.map((c) => ({ x: c.x, y: c.y + c.s / 2, z: c.z, w: c.s, h: c.s, d: c.s * 0.8 })), 0xd9d4ca));
  scene.add(plainBoxes(lots.slab.map((b) => ({ x: b.cx, y: 0.09, z: b.cz, w: b.maxX - b.minX + 6, h: 0.18, d: b.maxZ - b.minZ + 6 })), 0xe4ddd0, false));

  buildLandmarks(game);
  plantPalms(game);
  raiseSigns(game);
  return { lots };
}

// Which district a point belongs to; the map, HUD and spawners all ask this.
export function districtAt(x, z) {
  if (x < -300 && z < -250) return 'lantern';
  if (z > 150 && x < 120) return 'saltworks';
  if (x < -120) return 'palmline';
  if (z < -60) return 'coral';
  return 'mercado';
}

export const LANDMARKS = {
  sundial: { x: -30, z: -180 },
  meridiana: { x: -150, z: -60 },
  market: { x: 150, z: 60 },
  quist: { x: -90, z: 240 },
  lighthouse: { x: -345, z: -300 },
};

function isLandmarkBlock(b) {
  return Object.values(LANDMARKS).some((l) => Math.abs(l.x - b.cx) < 12 && Math.abs(l.z - b.cz) < 12);
}

function instancedBoxes(list, tex, floor, bay, shadows) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 });
  mat.onBeforeCompile = (shader) => {
    // Tile the facade by the instance's own size, so every building keeps square windows.
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      vec3 bScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      float faceW = abs(normal.x) > 0.5 ? bScale.z : bScale.x;
      vMapUv = abs(normal.y) > 0.5 ? vec2(0.03, 0.03) : vMapUv * vec2(floor(faceW / ${bay.toFixed(1)}) + 1.0, bScale.y / ${floor.toFixed(1)});`);
  };
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const m = new THREE.Matrix4(), c = new THREE.Color();
  list.forEach((b, i) => {
    m.makeScale(b.w, b.h, b.d).setPosition(b.x, 0.18, b.z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setHex(b.color));
  });
  mesh.count = list.length;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

function roofCaps(list) {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xc4583a, roughness: 0.85, flatShading: true }), list.length);
  const m = new THREE.Matrix4();
  list.forEach((r, i) => { m.makeScale(r.w + 0.8, Math.min(r.w, r.d) * 0.15, r.d + 0.8).setPosition(r.x, r.y + 0.18, r.z); mesh.setMatrixAt(i, m); });
  mesh.castShadow = true;
  return mesh;
}

function plainBoxes(list, color, shadows = true) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), Math.max(1, list.length));
  const m = new THREE.Matrix4();
  list.forEach((b, i) => { m.makeScale(b.w, b.h, b.d).setPosition(b.x, b.y, b.z); mesh.setMatrixAt(i, m); });
  mesh.count = list.length;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w, h, d, color, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material || new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts }));
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function buildLandmarks(game) {
  const { scene, collide } = game;
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0a92e, roughness: 0.35, metalness: 0.5 });

  // Sundial Tower (Ostra Bank HQ): a white needle with a gold gnomon fin.
  const s = LANDMARKS.sundial;
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 12, 158, 6), white);
  needle.position.set(s.x, 79, s.z);
  needle.castShadow = true;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 70, 26), gold);
  fin.position.set(s.x + 6, 92, s.z);
  fin.rotation.z = -0.32;
  const podium = box(34, 8, 30, 0x123a5e, s.x, 4, s.z);
  scene.add(needle, fin, podium);
  collide.insert({ minX: s.x - 17, maxX: s.x + 17, minZ: s.z - 15, maxZ: s.z + 15, h: 160 });

  // Hotel Meridiana: a long white slab with teal balcony bands, facing the beach.
  const m = LANDMARKS.meridiana;
  const hotel = new THREE.Group();
  hotel.add(box(30, 36, 36, 0, m.x, 18, m.z, { material: white }));
  const teal = new THREE.MeshStandardMaterial({ color: 0x1d9c94, roughness: 0.5 });
  for (let f = 1; f < 10; f++) hotel.add(box(31.5, 0.7, 37.5, 0, m.x, f * 3.6, m.z, { material: teal }));
  scene.add(hotel);
  collide.insert({ minX: m.x - 15, maxX: m.x + 15, minZ: m.z - 18, maxZ: m.z + 18, h: 36 });

  // Mercado Central: striped market stalls round a square, and the Clock Arch to the north.
  const q = LANDMARKS.market;
  const awnings = [0xd9483b, 0x1d9c94, 0xf2b134, 0xf7f4ee];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const x = q.x + Math.cos(ang) * 13, z = q.z + Math.sin(ang) * 13;
    const stall = box(4.5, 0.4, 3.2, awnings[i % 4], x, 2.6, z);
    stall.rotation.y = -ang;
    const table = box(3.6, 0.9, 1.8, 0xc99a63, x, 0.6, z);
    table.rotation.y = -ang;
    scene.add(stall, table);
  }
  const archMat = new THREE.MeshStandardMaterial({ color: 0xe8c99a, roughness: 0.8 });
  scene.add(box(3, 12, 3, 0, q.x - 7, 6, q.z - 20, { material: archMat }), box(3, 12, 3, 0, q.x + 7, 6, q.z - 20, { material: archMat }),
    box(17, 5, 3.4, 0, q.x, 14.5, q.z - 20, { material: archMat }));
  const clock = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24), new THREE.MeshBasicMaterial({ map: clockFace() }));
  clock.position.set(q.x, 14.5, q.z - 18.2);
  scene.add(clock);
  for (const dx of [-7, 7]) collide.insert({ minX: q.x + dx - 1.5, maxX: q.x + dx + 1.5, minZ: q.z - 21.5, maxZ: q.z - 18.5, h: 12 });

  // Saltworks: coral-red cranes on the quay, salt pyramids and Quist Auto's lot.
  const coral = new THREE.MeshStandardMaterial({ color: 0xd9483b, roughness: 0.6 });
  for (const z of [175, 215, 255]) {
    const x = game.roads.coastX(z) + 14;
    const crane = new THREE.Group();
    crane.add(box(1.4, 30, 1.4, 0, -4, 15, -4, { material: coral }), box(1.4, 30, 1.4, 0, 4, 15, -4, { material: coral }),
      box(1.4, 30, 1.4, 0, -4, 15, 4, { material: coral }), box(1.4, 30, 1.4, 0, 4, 15, 4, { material: coral }),
      box(52, 2.4, 2.4, 0, -12, 31, 0, { material: coral }), box(6, 4, 9, 0, 0, 28, 0, { material: coral }));
    crane.position.set(x, 0, z);
    scene.add(crane);
    collide.insert({ minX: x - 5, maxX: x + 5, minZ: z - 5, maxZ: z + 5, h: 30 });
  }
  const saltMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f0, roughness: 1, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const salt = new THREE.Mesh(new THREE.ConeGeometry(7, 8, 5), saltMat);
    salt.position.set(-30 + i * 14, 4, 182 + (i % 2) * 8);
    salt.castShadow = true;
    scene.add(salt);
    collide.insert({ minX: salt.position.x - 5, maxX: salt.position.x + 5, minZ: salt.position.z - 5, maxZ: salt.position.z + 5, h: 8 });
  }
  const qa = LANDMARKS.quist;
  scene.add(box(26, 9, 16, 0x2b3240, qa.x, 4.5, qa.z - 8));
  collide.insert({ minX: qa.x - 13, maxX: qa.x + 13, minZ: qa.z - 16, maxZ: qa.z, h: 9 });

  // Lantern Point lighthouse: red and white bands.
  const l = LANDMARKS.lighthouse;
  const stripes = document.createElement('canvas');
  stripes.width = 8; stripes.height = 64;
  const g = stripes.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f7f4ee' : '#d23a2f'; g.fillRect(0, i * 8, 8, 8); }
  const stripeTex = new THREE.CanvasTexture(stripes);
  stripeTex.colorSpace = THREE.SRGBColorSpace;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4, 28, 14), new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 }));
  tower.position.set(l.x, 16, l.z);
  tower.castShadow = true;
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 3, 10), new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffd36b, emissiveIntensity: 1.2 }));
  lamp.position.set(l.x, 31.5, l.z);
  scene.add(tower, lamp);

  // Gull Bridge across the bay mouth: deck, two towers, cable runs.
  const steel = new THREE.MeshStandardMaterial({ color: 0xe6e1d6, roughness: 0.5 });
  const bx = -392;
  scene.add(box(14, 2, 600, 0, bx, 18, 10, { material: steel }));
  for (const tz of [-120, 140]) {
    scene.add(box(3, 70, 3, 0, bx - 6, 35, tz, { material: steel }), box(3, 70, 3, 0, bx + 6, 35, tz, { material: steel }),
      box(15, 3, 3, 0, bx, 66, tz, { material: steel }));
  }
  for (const [z1, z2] of [[-290, -120], [-120, 140], [140, 310]]) {
    const len = Math.hypot(z2 - z1, 48);
    const cable = box(0.5, 0.5, len, 0xd9483b, bx, 42, (z1 + z2) / 2);
    scene.add(cable);
  }
}

function clockFace() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fbf6ec'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#123a5e'; g.lineWidth = 6; g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 24); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function plantPalms(game) {
  const { scene, roads, random, collide } = game;
  const spots = [];
  for (let z = -280; z <= 280; z += 16) {
    if (roads.ewRoads.some((r) => Math.abs(r - z) < 10)) continue;
    spots.push([roads.boulevardX - 3.2, z], [roads.boulevardX + 3.2, z]); // the double median row
    // The inland row sits 8 m on: test its own z, or one lands in the roadway (Rua 5 had one at z -32).
    if (!roads.ewRoads.some((r) => Math.abs(r - (z + 8)) < 8)) spots.push([roads.boulevardX + 15, z + 8]);
    if (z < 150) spots.push([roads.coastX(z) + 22 + random.range(-4, 4), z + random.range(-4, 4)]);
  }
  for (const b of roads.blocks) {
    if (b.district === 'mercado' && random.chance(0.3)) spots.push([b.minX - 1.5, b.cz]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 1, 6).translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x9a7b55, roughness: 1 }), spots.length);
  const fronds = new THREE.InstancedMesh(frondGeometry(), new THREE.MeshStandardMaterial({ color: 0x3f9b3c, roughness: 0.8, side: THREE.DoubleSide }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  spots.forEach(([x, z], i) => {
    const h = random.range(8, 12);
    q.setFromEuler(e.set(random.range(-0.06, 0.06), 0, random.range(-0.06, 0.06)));
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, h, 1));
    trunks.setMatrixAt(i, m);
    q.setFromEuler(e.set(0, random.range(0, 6.28), 0));
    m.compose(new THREE.Vector3(x, h, z), q, new THREE.Vector3(1, 1, 1));
    fronds.setMatrixAt(i, m);
    collide.insert({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, h });
  });
  trunks.castShadow = fronds.castShadow = true;
  scene.add(trunks, fronds);
}

function frondGeometry() {
  const pos = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, r = 4.6;
    const tip = [Math.cos(a) * r, -1.9, Math.sin(a) * r];
    const l = [Math.cos(a - 0.3) * r * 0.5, 0.35, Math.sin(a - 0.3) * r * 0.5];
    const rr = [Math.cos(a + 0.3) * r * 0.5, 0.35, Math.sin(a + 0.3) * r * 0.5];
    pos.push(0, 0.3, 0, ...l, ...tip, 0, 0.3, 0, ...tip, ...rr);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Billboards and storefront signs with our own brands, turned to face the boulevard traffic.
function raiseSigns(game) {
  const { scene, lore, roads } = game;
  const spots = [
    { x: roads.boulevardX + 16, z: -40, y: 9, rot: 0, w: 14, h: 5 },
    { x: roads.boulevardX + 16, z: -118, y: 10, rot: 0, w: 14, h: 5 },
    { x: roads.boulevardX + 16, z: 52, y: 9, rot: 0, w: 14, h: 5 },
    { x: -66, z: -118, y: 12, rot: 0, w: 14, h: 5 },
    { x: roads.boulevardX + 16, z: 112, y: 8, rot: 0, w: 12, h: 4.5 },
    { x: 100, z: 22.6, y: 6, rot: 0, w: 12, h: 4 },
    { x: 150, z: 39.5, y: 5, rot: 0, w: 12, h: 3.6 },
    { x: -90, z: 232.4, y: 6.8, rot: 0, w: 14, h: 3.6 },
    { x: -150, z: -44, y: 39.5, rot: 0, w: 26, h: 5 },
    { x: 52.6, z: 120, y: 7, rot: Math.PI / 2, w: 12, h: 4 },
  ];
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.6 });
  spots.forEach((s, i) => {
    const sign = lore.signs[order[i] % lore.signs.length];
    const mat = new THREE.MeshStandardMaterial({ map: signTexture(sign), roughness: 0.55, emissive: 0xffffff, emissiveIntensity: 0.12 });
    mat.emissiveMap = mat.map;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 0.4), [postMat, postMat, postMat, postMat, mat, postMat]);
    panel.position.set(s.x, s.y, s.z);
    panel.rotation.y = s.rot;
    panel.castShadow = true;
    scene.add(panel);
    if (s.y - s.h / 2 > 3 && i < 5) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, s.y - s.h / 2, 0.6), postMat);
      post.position.set(s.x, (s.y - s.h / 2) / 2, s.z - 0.4);
      scene.add(post);
      game.collide.insert({ minX: s.x - 0.4, maxX: s.x + 0.4, minZ: s.z - 0.8, maxZ: s.z, h: s.y });
    }
  });
}

function signTexture(sign) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = sign.bg; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = sign.fg; g.lineWidth = 8; g.strokeRect(8, 8, 496, 144);
  g.fillStyle = sign.fg; g.textAlign = 'center';
  g.font = `bold ${sign.sub ? 62 : 74}px "DejaVu Sans", Verdana, sans-serif`;
  g.fillText(sign.text, 256, sign.sub ? 86 : 104, 470);
  if (sign.sub) { g.font = 'bold 28px "DejaVu Sans", Verdana, sans-serif'; g.fillText(sign.sub, 256, 132, 460); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Canvas facades: shuttered stucco bays, glass curtain wall and corrugated sheds.
function makeFacadeTextures() {
  const make = (draw) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return {
    stucco: make((g) => {
      g.fillStyle = '#fbf7ef'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#2b4a63'; g.fillRect(40, 28, 48, 66);
      g.fillStyle = '#9cc6d8'; g.fillRect(44, 32, 18, 28); g.fillRect(66, 32, 18, 28);
      g.fillStyle = '#1f8f86'; g.fillRect(24, 26, 15, 70); g.fillRect(89, 26, 15, 70);
      g.fillStyle = '#16706a'; for (let y = 30; y < 94; y += 6) { g.fillRect(26, y, 11, 2); g.fillRect(91, y, 11, 2); }
      g.fillStyle = '#3b3f46'; g.fillRect(34, 94, 60, 4); for (let x = 36; x < 94; x += 6) g.fillRect(x, 84, 2, 10);
      for (let x = 0; x < 128; x += 16) { g.fillStyle = (x / 16) % 2 ? '#d9573f' : '#1d9c94'; g.fillRect(x, 116, 16, 8); }
    }),
    glass: make((g) => {
      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, '#5fa6cf'); grad.addColorStop(1, '#2d6f99');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#e8f0f2'; g.fillRect(0, 0, 128, 6); g.fillRect(0, 0, 5, 128); g.fillRect(62, 0, 4, 128);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(8, 10, 22, 110);
    }),
    shed: make((g) => {
      g.fillStyle = '#f2efe8'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#d4d0c6'; for (let x = 0; x < 128; x += 8) g.fillRect(x, 0, 3, 128);
      g.fillStyle = '#3d4450'; g.fillRect(20, 60, 88, 68);
      g.fillStyle = '#56606e'; for (let y = 64; y < 128; y += 8) g.fillRect(20, y, 88, 2);
    }),
  };
}
