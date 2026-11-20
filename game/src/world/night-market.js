import * as THREE from 'three';
import { createSeededRandom } from '../core/seeded-world-tools.js';
import { glowDot } from './night-lights.js';
import { OUTFITS } from '../people/pedestrian-crowd.js';

// Feira das Lanternas: the Lantern Point night market on the sand west of Palmline Boulevard. Ten
// striped stalls in an L (row A along z -262 facing the boulevard's end, row B along x -199 facing
// the boulevard), strings of lanterns from the awnings to poles along the walkways, warm pools of
// light on the sand. Shuttered by day, lit from dusk. Its own seeded stream, drawn only at build
// time; nothing casts shadows; the whole market is hidden past LOD_RANGE from the camera.
const CENTER = { x: -205, z: -245 };
const LOD_RANGE = 220;
const OPEN_LEVEL = 0.35;
const POOL_COLOR = 0xffa850, POOL_RADIUS = 2.2;
const AWNINGS = [0xe8664a, 0x1fa59a, 0xf2b134, 0x2f5fd0, 0xe5677f]; // coral, teal, saffron, cobalt, rose
const CREAM = 0xf3e6cc, WOOD = 0x8a5a3a, POST = 0x5a3a28, IRON = 0x34343a, WIRE = 0x2a2622;
const GOODS = [0xf2b134, 0xe2483a, 0x7fc8d6, 0xb8d86b, 0xf4f1ea, 0xe5677f, 0x1d9c94, 0xd98a3a];
const LANTERNS = [[0.8, 0.18, 0.14], [0.8, 0.36, 0.26], [0.78, 0.28, 0.45], [0.15, 0.66, 0.6], [0.8, 0.5, 0.12]];
const GOLD = [0.8, 0.64, 0.2], BULB = [0.8, 0.62, 0.36];
const SCARE = 4, RUN = 4.2;
const STALL_W = 4, STALL_D = 2.6, FRONT_Y = 2.85, BACK_Y = 3.35, OVERHANG = 0.3, POLE_H = 4.8, SAG = 0.35;

export function createNightMarket(game) {
  const rng = createSeededRandom((game.seed ^ 0x4c414e54) >>> 0);
  const root = new THREE.Group();
  const frame = boxSink(), lit = boxSink(), shut = boxSink();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), col = new THREE.Color();

  // Row A faces -z (toward the stand at the boulevard's end), row B faces +x (the boulevard).
  const stalls = [];
  for (let i = 0; i < 5; i++) stalls.push({ x: -197 - 6 * i, z: -262, fx: 0, fz: -1 });
  for (let i = 0; i < 5; i++) stalls.push({ x: -199, z: -254 + 6 * i, fx: 1, fz: 0 });
  // Local frame: u along the row, v back from the front edge, y up.
  const at = (s, u, v) => {
    const yaw = Math.atan2(s.fx, s.fz), d = STALL_D / 2 - v;
    return { x: s.x + Math.cos(yaw) * u + s.fx * d, z: s.z - Math.sin(yaw) * u + s.fz * d, yaw };
  };
  const box = (sink, s, u, v, y, sx, sy, sz, color, tilt = 0) => {
    const p = at(s, u, v);
    e.set(tilt, p.yaw, 0);
    m.compose(new THREE.Vector3(p.x, y, p.z), q.setFromEuler(e), new THREE.Vector3(1, 1, 1));
    sink.add(sx, sy, sz, m, col.set(color));
  };
  const run = STALL_D + OVERHANG, rise = BACK_Y - FRONT_Y, slope = Math.atan2(rise, run), len = Math.hypot(run, rise);
  stalls.forEach((s, i) => {
    const tint = AWNINGS[i % 5], stripe = 4.4 / 6;
    s.tint = tint;
    box(frame, s, 0, 0.3, 0.5, 3.8, 1, 0.6, WOOD);
    for (const u of [-1.95, 1.95]) {
      box(frame, s, u, 0.05, FRONT_Y / 2, 0.1, FRONT_Y, 0.1, POST);
      box(frame, s, u, 2.55, BACK_Y / 2, 0.1, BACK_Y, 0.1, POST);
    }
    const vMid = (STALL_D - OVERHANG) / 2, yMid = (FRONT_Y + BACK_Y) / 2;
    for (let k = 0; k < 6; k++) {
      const u = -2.2 + stripe * (k + 0.5), c = k % 2 ? CREAM : tint;
      box(frame, s, u, vMid, yMid + 0.02, stripe, 0.04, len, c, slope);
      box(lit, s, u, -OVERHANG, FRONT_Y - 0.19, stripe, 0.38, 0.03, c);
    }
    box(lit, s, 0, vMid, yMid - 0.03, 4.4, 0.02, len, col.set(tint).lerp(new THREE.Color(0xffd9a0), 0.55).getHex(), slope);
    box(lit, s, 0, 2.58, 2.15, 3.9, 2.3, 0.05, col.set(tint).multiplyScalar(0.7).getHex());
    for (let k = 0; k < 5; k++) {
      const h = rng.range(0.22, 0.42);
      box(lit, s, -1.5 + k * 0.75, 0.3, 1 + h / 2, 0.55, h, 0.42, rng.pick(GOODS));
    }
    for (let k = 0; k < 3; k++) box(lit, s, -1.2 + k * 1.2, 2.52, 2.2, 0.8, 0.6, 0.04, rng.pick(GOODS));
    box(shut, s, 0, -0.03, 1.92, 4, 1.86, 0.05, col.set(tint).lerp(new THREE.Color(0xd8d0c0), 0.55).getHex());
    const a = at(s, -2, 0), b = at(s, 2, STALL_D);
    game.collide.insert({ minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z), h: 2.6 });
  });

  // Poles along each walkway's outer edge, every 8 m.
  const poles = [];
  for (let z = -262; z <= -206; z += 8) poles.push({ x: -192.6, z, row: 'B' });
  for (let x = -197; x >= -221; x -= 8) poles.push({ x, z: -267.6, row: 'A' });
  const poleTop = POLE_H - 0.2;
  for (const p of poles) {
    m.makeTranslation(p.x, POLE_H / 2, p.z);
    frame.add(0.12, POLE_H, 0.12, m, col.set(IRON));
  }

  // Lantern strings (catenary chords, sag SAG), a lantern every metre, gold at most 1 in 4.
  const glowPos = [], glowCol = [], glowSize = [];
  let lanterns = 0, gold = 0;
  const string = (x0, y0, z0, x1, y1, z1) => {
    const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const pt = (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 4 * SAG * t * (1 - t), z0 + (z1 - z0) * t];
    const segs = Math.max(2, Math.ceil(L / 2));
    for (let k = 0; k < segs; k++) {
      const [ax, ay, az] = pt(k / segs), [bx, by, bz] = pt((k + 1) / segs);
      const d = Math.hypot(bx - ax, by - ay, bz - az);
      m.lookAt(new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz), new THREE.Vector3(0, 1, 0));
      m.setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      frame.add(0.03, 0.03, d, m, col.set(WIRE));
    }
    const n = Math.max(1, Math.floor(L));
    for (let k = 0; k < n; k++) {
      const [x, y, z] = pt((k + 0.5) / n);
      const c = rng.next() < 0.2 && gold + 1 <= (lanterns + 1) / 4 ? (gold++, GOLD) : rng.pick(LANTERNS);
      lanterns++;
      m.makeTranslation(x, y - 0.14, z);
      lit.add(0.16, 0.22, 0.16, m, col.setRGB(c[0], c[1], c[2]));
      glowPos.push(x, y - 0.14, z); glowCol.push(...c); glowSize.push(1);
    }
  };
  for (const row of ['A', 'B']) {
    const line = poles.filter((p) => p.row === row);
    for (let k = 0; k + 1 < line.length; k++) string(line[k].x, poleTop, line[k].z, line[k + 1].x, poleTop, line[k + 1].z);
  }
  const pools = [];
  for (const s of stalls) {
    for (const u of [-2.2, 2.2]) {
      const c = at(s, u, -OVERHANG);
      const p = poles.reduce((best, o) => (Math.hypot(o.x - c.x, o.z - c.z) < Math.hypot(best.x - c.x, best.z - c.z) ? o : best));
      string(c.x, FRONT_Y, c.z, p.x, poleTop, p.z);
    }
    const b = at(s, 0, 0.9);
    glowPos.push(b.x, 2.72, b.z); glowCol.push(...BULB); glowSize.push(1.6);
    pools.push(at(s, 0, -1.4));
  }
  for (const p of poles) pools.push(p);

  const frames = frame.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  const litMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const fronts = lit.mesh(litMat);
  const shutters = shut.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  frames.receiveShadow = shutters.receiveShadow = true;

  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
  gGeo.setAttribute('color', new THREE.Float32BufferAttribute(glowCol, 3));
  gGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(glowSize, 1));
  const gMat = new THREE.PointsMaterial({ size: 1, map: glowDot(), vertexColors: true, transparent: true, sizeAttenuation: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  gMat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float aSize;\n' + sh.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = size * aSize;');
  };
  const glows = new THREE.Points(gGeo, gMat);

  const poolMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2 * POOL_RADIUS, 2 * POOL_RADIUS).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: POOL_COLOR, map: glowDot(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), pools.length);
  pools.forEach((p, i) => poolMesh.setMatrixAt(i, m.makeTranslation(p.x, 0.06, p.z)));
  poolMesh.computeBoundingSphere();
  glows.visible = poolMesh.visible = false;
  root.add(frames, fronts, shutters, glows, poolMesh);
  game.scene.add(root);

  // Shoppers: their own instanced bodies and heads (the crowd's sizes), each at home before a
  // counter; 13 at the five busiest stalls, one at each other. Never witnesses (not in game.crowd).
  const homes = [0, 0, 0, 1, 1, 1, 2, 2, 2, 5, 5, 6, 6, 3, 4, 7, 8, 9];
  const outfits = OUTFITS.filter((c) => c !== 0x2a2d33), skins = [0x8a5a3c, 0xc68e64, 0x5e3a26, 0xe0b48c];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const bodies = new THREE.InstancedMesh(unitBox, new THREE.MeshStandardMaterial({ roughness: 0.8 }), homes.length);
  const heads = new THREE.InstancedMesh(unitBox, new THREE.MeshStandardMaterial({ roughness: 0.7 }), homes.length);
  bodies.frustumCulled = heads.frustumCulled = false;
  const shoppers = homes.map((si, i) => {
    const s = stalls[si], k = homes.slice(0, i).filter((h) => h === si).length;
    bodies.setColorAt(i, col.set(rng.pick(outfits)));
    heads.setColorAt(i, col.set(rng.pick(skins)));
    const p = { i, stall: si, x: 0, z: 0, hx: 0, hz: 0, tx: 0, tz: 0, state: 'shop', timer: 0, phase: i * 0.9 };
    p.home = (stall, u) => {
      const h = at(stalls[stall], u, -rng.range(1.0, 1.6));
      p.stall = stall; p.hx = h.x; p.hz = h.z;
    };
    p.home(si, -1.3 + k * 1.3 + rng.range(-0.25, 0.25));
    return p;
  });
  const shopGroup = new THREE.Group();
  shopGroup.add(bodies, heads);
  shopGroup.visible = false;
  root.add(shopGroup);
  let open = false, strollIn = 0;
  const v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0);
  const rowOf = (si) => (si < 5 ? 0 : 5);
  // Running stays on the front of its own row and clear of the other row's stalls.
  const clampRun = (p, x, z) => (p.stall < 5 ? [Math.max(-226, Math.min(-186, x)), z] : [x, Math.max(-257.5, Math.min(-200, z))]);

  const market = {
    stalls, poles, shoppers,
    state: () => ({
      stalls: stalls.length, lanterns, gold, glows: root.visible && glows.visible, open: open ? shoppers.length : 0,
      fleeing: shoppers.filter((p) => p.state === 'run').length,
      crouched: shoppers.filter((p) => p.state === 'duck' || p.state === 'crouch').length,
    }),
    // Shots, blasts and thefts nearby (PedestrianCrowd.panic forwards here).
    panic(x, z, radius) {
      if (!open) return;
      for (const p of shoppers) {
        if (Math.hypot(p.x - x, p.z - z) >= radius) continue;
        p.away = Math.atan2(-(p.x - x), -(p.z - z));
        if (p.state === 'run' || p.state === 'duck' || p.state === 'crouch') { p.timer = SCARE; continue; }
        p.timer = SCARE;
        if (p.i % 3 === 0) { p.state = 'duck'; continue; }
        const s = stalls[p.stall], rx = Math.abs(s.fz), rz = Math.abs(s.fx);
        const sign = (p.x - x) * rx + (p.z - z) * rz >= 0 ? 1 : -1, d = rng.range(8, 14);
        [p.tx, p.tz] = clampRun(p, p.x + rx * sign * d, p.z + rz * sign * d);
        p.state = 'run';
      }
    },
    update(dt, focus) {
      const now = game.dayNight.levelNow() >= OPEN_LEVEL && Math.hypot(focus.x - CENTER.x, focus.z - CENTER.z) < 160;
      if (now && !open) {
        for (const p of shoppers) { p.x = p.hx; p.z = p.hz; p.state = 'shop'; p.timer = 0; }
        strollIn = rng.range(4, 9);
      }
      open = shopGroup.visible = now;
      if (!open) return;
      if ((strollIn -= dt) <= 0) {
        strollIn = rng.range(4, 9);
        const p = rng.pick(shoppers);
        if (p.state === 'shop') {
          const base = rowOf(p.stall), next = Math.min(base + 4, Math.max(base, p.stall + rng.int(-1, 1)));
          p.home(next, rng.range(-1.4, 1.4));
          p.state = 'stroll';
        }
      }
      for (const p of shoppers) {
        if ((p.state === 'run' || p.state === 'duck' || p.state === 'crouch') && (p.timer -= dt) <= 0) p.state = 'home';
        let speed = 0, tx = p.hx, tz = p.hz;
        if (p.state === 'run') { speed = RUN; tx = p.tx; tz = p.tz; } else if (p.state === 'stroll') speed = 1; else if (p.state === 'home') speed = 1.3;
        let heading = p.face ?? 0;
        if (speed > 0) {
          const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), stepLen = Math.min(d, speed * dt);
          if (d > 1e-4) { p.x += dx / d * stepLen; p.z += dz / d * stepLen; heading = Math.atan2(-dx, -dz); }
          if (d <= speed * dt) p.state = p.state === 'run' ? 'crouch' : 'shop';
        }
        const s = stalls[p.stall];
        if (p.state === 'shop') heading = Math.atan2(s.fx, s.fz) + Math.sin(game.time * 0.8 + p.phase) * 0.25;
        if (p.state === 'duck' || p.state === 'crouch') heading = p.away ?? heading;
        p.face = heading;
        const h = p.state === 'duck' || p.state === 'crouch' ? 0.6 : 1;
        const bob = p.state === 'run' ? Math.abs(Math.sin(game.time * 14 + p.phase)) * 0.06 : 0;
        q.setFromAxisAngle(yAxis, heading);
        bodies.setMatrixAt(p.i, m.compose(v3.set(p.x, 0.95 * h + bob, p.z), q, s3.set(0.5, 1.1 * h, 0.3)));
        heads.setMatrixAt(p.i, m.compose(v3.set(p.x, 1.68 * h + bob, p.z), q, s3.set(0.26, 0.28, 0.26)));
      }
      bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    },
    render(level) {
      const cam = game.camera.position;
      root.visible = Math.hypot(cam.x - CENTER.x, cam.z - CENTER.z) < LOD_RANGE;
      if (!root.visible) return;
      glows.visible = poolMesh.visible = level > 0.02;
      gMat.opacity = level;
      poolMesh.material.opacity = 0.35 * level;
      litMat.color.setScalar(0.55 + 0.35 * level);
      shutters.visible = level < OPEN_LEVEL;
    },
  };
  return market;
}

// Collects transformed boxes into one vertex-coloured geometry.
function boxSink() {
  const pos = [], nor = [], colr = [], idx = [];
  const unit = new THREE.BoxGeometry(1, 1, 1), v = new THREE.Vector3(), nm = new THREE.Matrix3(), s = new THREE.Matrix4();
  const up = unit.attributes.position, un = unit.attributes.normal;
  return {
    add(sx, sy, sz, m, c) {
      const base = pos.length / 3, full = s.copy(m).multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
      nm.getNormalMatrix(full);
      for (let i = 0; i < up.count; i++) {
        v.fromBufferAttribute(up, i).applyMatrix4(full); pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(un, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
        colr.push(c.r, c.g, c.b);
      }
      for (let i = 0; i < unit.index.count; i++) idx.push(base + unit.index.getX(i));
    },
    mesh(material) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
      g.setIndex(idx);
      g.computeBoundingSphere();
      return new THREE.Mesh(g, material);
    },
  };
}
