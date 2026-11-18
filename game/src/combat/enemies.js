import * as THREE from 'three';
import { fireWeapon } from './weapons-and-damage.js';

// Tidewater gunmen (teal bandanas) and Gilded Hand guards (gold pins): a pool of six figures that
// run to the far side of a car or crate from Wren, crouch, peek and shoot with spread, flee when
// hurt and go down when beaten (no gore: they slump and sink away). Each live one is a combat
// target for fireWeapon; squads are tagged so a mission step can count who is still fighting.
export class EnemyCrews {
  constructor(game) {
    this.game = game;
    this.geo = { tidewater: figureGeometry(CREWS.tidewater), gilded: figureGeometry(CREWS.gilded) };
    this.pool = [];
    for (let i = 0; i < POOL; i++) {
      const mesh = new THREE.Mesh(this.geo.tidewater, FIGURE_MATERIAL);
      mesh.castShadow = true; mesh.visible = false;
      game.scene.add(mesh);
      this.pool.push({ mesh, active: false, alive: false, x: 1e5, z: 1e5, radius: 0.45, height: 1.9 });
    }
    this.seed = 0x51ab3;
    this.shotsAtWren = 0; this.hitsOnWren = 0;
  }

  get active() { return this.pool.filter((e) => e.active); }

  // Puts a squad in the world: [{ crew, x, z, cover: {x, z} }], all tagged `tag`.
  spawnSquad(list, tag) {
    const out = [];
    for (const s of list) {
      const e = this.pool.find((p) => !p.active);
      if (!e) break;
      const crew = CREWS[s.crew] || CREWS.tidewater;
      Object.assign(e, {
        active: true, alive: true, crew, tag, x: s.x, z: s.z, facing: 0, health: crew.health,
        state: 'move', cover: s.cover || null, spot: null, timer: 0.4 + out.length * 0.35, fireIn: 0, downFor: 0, fledFor: 0, height: 1.9,
      });
      e.hit = (d) => this.hurt(e, d);
      e.mesh.geometry = this.geo[crew.id];
      e.mesh.visible = true; e.mesh.rotation.set(0, 0, 0); e.mesh.scale.set(1, 1, 1);
      this.pickSpot(e);
      this.game.combatTargets.push(e);
      out.push(e);
    }
    return out;
  }

  // How many of a squad still stand and fight (not down, not fled).
  fighting(tag) { return this.pool.filter((e) => e.active && e.tag === tag && e.alive && e.state !== 'flee').length; }

  clear() { for (const e of this.pool) this.retire(e); }

  retire(e) {
    e.active = false; e.alive = false; e.mesh.visible = false; e.x = e.z = 1e5;
    const list = this.game.combatTargets, i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
  }

  hurt(e, d) {
    if (!e.alive) return;
    e.health -= d;
    if (e.health <= 0) { e.alive = false; e.state = 'down'; e.downFor = 0; this.game.toast?.(`${e.crew.label} DOWN`); return; }
    if (e.health < e.crew.fleeAt) { e.state = 'flee'; e.fledFor = 0; return; }
    if (e.state === 'cover') e.timer = Math.min(e.timer, 0.25); // a hit draws them up to answer
  }

  // The crouch spot: 1.7 m past the cover's centre on the side away from Wren.
  pickSpot(e) {
    if (!e.cover) { e.spot = { x: e.x, z: e.z }; return; }
    const w = this.game.focus, dx = e.cover.x - w.x, dz = e.cover.z - w.z, d = Math.hypot(dx, dz) || 1;
    const side = (this.pool.indexOf(e) % 3) - 1, lean = this.pool.indexOf(e) % 2 ? 1 : -1;
    e.spot = { x: e.cover.x + dx / d * 1.7 - dz / d * side * 1.3, z: e.cover.z + dz / d * 1.7 + dx / d * side * 1.3 };
    // The peek: step out past the cover's end (a van hides a standing man) to shoot.
    e.peekSpot = { x: e.spot.x - dz / d * lean * 2.6, z: e.spot.z + dx / d * lean * 2.6 };
  }

  // One fixed tick.
  update(dt) {
    const game = this.game, w = game.focus;
    for (const e of this.pool) {
      if (!e.active) continue;
      const dx = w.x - e.x, dz = w.z - e.z, dist = Math.hypot(dx, dz);
      if (e.state === 'down') {
        e.downFor += dt;
        e.mesh.rotation.set(-Math.PI / 2 * Math.min(1, e.downFor * 3), e.facing, 0, 'YXZ');
        e.mesh.position.set(e.x, Math.max(-0.6, 0.12 - Math.max(0, e.downFor - 3) * 0.3), e.z);
        if (e.downFor > 5.5) this.retire(e);
        continue;
      }
      let speed = 0, tx = e.x, tz = e.z, crouch = false;
      if (e.state === 'flee') {
        e.fledFor += dt; speed = 5.2; tx = e.x - dx; tz = e.z - dz;
        if (e.fledFor > 7 || dist > 60) { this.retire(e); continue; }
      } else if (e.state === 'move') {
        speed = 4.6; tx = e.spot.x; tz = e.spot.z;
        if (Math.hypot(tx - e.x, tz - e.z) < 0.35) { e.state = 'cover'; e.timer = 0.5 + this.rand() * 0.9; }
      } else if (e.state === 'cover') {
        crouch = true; e.timer -= dt; speed = 2.4; tx = e.spot.x; tz = e.spot.z;
        if (e.timer <= 0) { e.state = 'peek'; e.timer = 1.1 + this.rand() * 0.6; e.fireIn = 0.3; }
      } else if (e.state === 'peek') {
        e.timer -= dt; e.fireIn -= dt; speed = 3; tx = e.peekSpot?.x ?? e.x; tz = e.peekSpot?.z ?? e.z;
        if (e.fireIn <= 0 && dist < e.crew.range) { this.shoot(e, dist); e.fireIn = e.crew.rate; }
        if (e.timer <= 0) {
          e.state = 'cover'; e.timer = 0.9 + this.rand() * 1.1;
          const old = e.spot; this.pickSpot(e);
          if (Math.hypot(old.x - e.spot.x, old.z - e.spot.z) > 1.5) e.state = 'move';
        }
      }
      if (speed > 0) {
        const mx = tx - e.x, mz = tz - e.z, m = Math.hypot(mx, mz);
        if (m > 0.01) {
          const step = Math.min(m, speed * dt);
          e.x += mx / m * step; e.z += mz / m * step;
          // Runners face where they run; in a fight they keep their eyes (and gun) on Wren.
          e.facing = e.state === 'move' || e.state === 'flee' ? Math.atan2(-mx, -mz) : Math.atan2(-dx, -dz);
          const p = { x: e.x, z: e.z };
          game.collide.resolveCircle(p, 0.4);
          e.x = p.x; e.z = p.z;
        }
        else e.facing = Math.atan2(-dx, -dz);
      } else e.facing = Math.atan2(-dx, -dz);
      e.height = crouch ? 1.25 : 1.9;
      const bob = speed > 0 && e.state !== 'cover' && e.state !== 'peek' ?Math.abs(Math.sin(game.time * 11 + e.x)) * 0.06 : 0;
      e.mesh.position.set(e.x, bob, e.z);
      e.mesh.rotation.set(0, e.facing, 0);
      e.mesh.scale.set(1, crouch ? 0.66 : 1, 1);
    }
  }

  // One round at Wren with the crew's spread. Inside 0.42 m of her chest it hits (armour first),
  // otherwise the tracer runs on to whatever the ray meets. Effects share Wren's flash/tracer pool.
  shoot(e, dist) {
    const game = this.game, w = game.focus, pl = game.player;
    const fx = -Math.sin(e.facing), fz = -Math.cos(e.facing);
    const muzzle = { x: e.x + fx * 0.6, y: 1.6, z: e.z + fz * 0.6 };
    const aim = new THREE.Vector3(w.x - muzzle.x, 1.3 - muzzle.y, w.z - muzzle.z).normalize();
    const sp = e.crew.spread * (1 + dist / 25);
    aim.x += (this.rand() - 0.5) * sp * 2; aim.y += (this.rand() - 0.5) * sp; aim.z += (this.rand() - 0.5) * sp * 2;
    aim.normalize();
    this.shotsAtWren++;
    // Closest approach of the round to Wren's chest.
    const ox = w.x - muzzle.x, oy = 1.3 - muzzle.y, oz = w.z - muzzle.z, along = ox * aim.x + oy * aim.y + oz * aim.z;
    const miss = Math.hypot(ox - aim.x * along, oy - aim.y * along, oz - aim.z * along);
    const wall = fireWeapon(game, muzzle, aim, Math.max(2, along), e);
    let hit;
    if (miss < 0.42 && (wall.kind === 'air' || wall.dist >= along - 0.6)) {
      hit = { x: w.x, y: 1.3, z: w.z, kind: 'wren' };
      this.hitsOnWren++;
      const dmg = e.crew.damage, soak = Math.min(pl.armour, dmg * 0.6);
      pl.armour -= soak; pl.health -= dmg - soak;
      if (pl.health <= 0) this.lightsOut();
    } else hit = wall.kind === 'air' ? fireWeapon(game, muzzle, aim, 60, e) : wall;
    game.arms?.showEffect(muzzle, hit, e.crew.id === 'gilded');
    if (game.vehicle && hit.kind === 'wren') game.vehicle.health -= 2;
  }

  // Wren goes down: the job fails, the clinic takes its fee and she is back on her feet.
  lightsOut() {
    const game = this.game, pl = game.player;
    pl.health = 100; pl.armour = 0;
    game.cash -= CLINIC_FEE;
    if (game.missions?.active) game.missions.finish(false, `LIGHTS OUT · ST. ELMO CLINIC -$${CLINIC_FEE}`);
    else game.toast?.(`LIGHTS OUT · ST. ELMO CLINIC -$${CLINIC_FEE}`);
    this.clear();
  }

  rand() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
}

// The two crews: look, toughness and how they shoot.
export const CREWS = {
  tidewater: { id: 'tidewater', label: 'TIDEWATER GUNMAN', health: 70, fleeAt: 22, damage: 6, rate: 0.42, spread: 0.06, range: 45, shirt: 0x2f3e46, pants: 0x3b3a36, mark: 0x16b3a6, skin: 0xc58c66 },
  gilded: { id: 'gilded', label: 'GILDED HAND GUARD', health: 90, fleeAt: 18, damage: 8, rate: 0.3, spread: 0.05, range: 50, shirt: 0x15171c, pants: 0x1f2128, mark: 0xf2c230, skin: 0xd9a782 },
};
export const POOL = 6, CLINIC_FEE = 250;

const FIGURE_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });

// One merged, vertex-coloured figure (legs, torso, arms out with a gun, head, crew mark): one draw
// call. Tidewater wear a teal bandana over the face; the Gilded Hand a gold pin on a black suit.
function figureGeometry(crew) {
  const boxes = [
    { w: 0.2, h: 0.85, d: 0.24, x: -0.13, y: 0.43, z: 0, c: crew.pants }, { w: 0.2, h: 0.85, d: 0.24, x: 0.13, y: 0.43, z: 0, c: crew.pants },
    { w: 0.56, h: 0.62, d: 0.3, x: 0, y: 1.17, z: 0, c: crew.shirt },
    { w: 0.15, h: 0.15, d: 0.62, x: 0.2, y: 1.38, z: -0.32, c: crew.shirt }, { w: 0.14, h: 0.14, d: 0.5, x: -0.12, y: 1.36, z: -0.3, c: crew.shirt },
    { w: 0.08, h: 0.14, d: 0.34, x: 0.06, y: 1.42, z: -0.7, c: 0x202226 },
    { w: 0.3, h: 0.32, d: 0.3, x: 0, y: 1.67, z: 0, c: crew.skin },
    crew.id === 'tidewater'
      ? { w: 0.32, h: 0.13, d: 0.32, x: 0, y: 1.6, z: -0.01, c: crew.mark }
      : { w: 0.1, h: 0.1, d: 0.04, x: -0.16, y: 1.33, z: -0.16, c: crew.mark },
    crew.id === 'tidewater'
      ? { w: 0.32, h: 0.1, d: 0.32, x: 0, y: 1.84, z: 0, c: 0x1b1b1b }
      : { w: 0.32, h: 0.08, d: 0.32, x: 0, y: 1.85, z: 0, c: 0x3a2a1c },
  ];
  const parts = boxes.map((b) => {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d).toNonIndexed();
    g.translate(b.x, b.y, b.z);
    const col = new THREE.Color(b.c), n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.toArray(c, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  });
  const total = parts.reduce((s, g) => s + g.attributes.position.count, 0);
  const merged = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(total * 3);
    let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    merged.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return merged;
}
