// One civilian driver: follows a lane, keeps a gap, stops at red and for people in its path,
// then takes a seeded turn through the crossing on a quadratic curve.
export class TrafficDriver {
  constructor(car) {
    this.car = car;
    this.lane = null;
    this.offsetIndex = 0;
    this.s = 0;
    this.turn = null;
    this.speed = 0;
    this.cruise = 11;
    this.waitingAtRed = false;
    this.blockedFor = 0;
  }

  place(lane, s, offsetIndex, random) {
    this.lane = lane;
    this.s = s;
    this.offsetIndex = Math.min(offsetIndex, lane.offsets.length - 1);
    this.turn = null;
    this.speed = 6;
    this.cruise = (lane.offsets.length > 1 ? 13 : 10.5) + random.range(-1.5, 1.5);
    this.chooseNext(random);
    this.pose();
  }

  // The turn is picked when a lane begins, so the crossing gate knows whether it is a left turn.
  chooseNext(random) {
    this.next = random.pick(turnChoices(this.lane));
    const lx = this.lane.dz, lz = -this.lane.dx;
    this.turningLeft = this.next.dx * lx + this.next.dz * lz > 0.5;
  }

  // Straight-on and right turns share a crossing with their own axis; a left turn needs it empty.
  crossingFree(node) {
    if (!node.users) return true;
    return !this.turningLeft && !node.lefts && node.usersAxis === this.lane.axis;
  }

  get offset() { return this.lane.offsets[Math.min(this.offsetIndex, this.lane.offsets.length - 1)]; }

  // One fixed tick: pick a speed limit from the signal, the crossing, the car ahead and people.
  update(dt, traffic) {
    const car = this.car;
    let limit = this.cruise;
    this.waitingAtRed = false;
    if (!this.turn) {
      const toStop = this.lane.stopS - this.s;
      const node = this.lane.to;
      const color = signalColor(node, this.lane.axis, traffic.time);
      const mustStop = color === 'red' || (color === 'amber' && toStop > 6) || !this.crossingFree(node);
      if (mustStop && toStop > -0.5) {
        limit = Math.min(limit, Math.sqrt(2 * BRAKE * Math.max(0, toStop - 0.4)));
        if (color === 'red' && toStop < 12 && this.speed < 0.6) this.waitingAtRed = true;
      }
    }
    const gap = traffic.clearAhead(this);
    if (gap < LOOK_AHEAD) limit = Math.min(limit, Math.sqrt(2 * BRAKE * Math.max(0, gap - KEEP_GAP)));
    this.blockedFor = gap < KEEP_GAP + 1 && this.speed < 0.5 ? this.blockedFor + dt : 0;
    if (this.blockedFor > 3 && !this.turn && this.lane.offsets.length > 1) { this.offsetIndex = 1 - this.offsetIndex; this.blockedFor = 0; }

    this.speed = limit > this.speed ? Math.min(limit, this.speed + ACCEL * dt) : Math.max(limit, this.speed - BRAKE * 1.4 * dt, 0);
    const step = this.speed * dt;
    if (this.turn) this.advanceTurn(step, traffic.random);
    else {
      this.s = Math.min(this.s + step, this.crossingFree(this.lane.to) ? Infinity : this.lane.stopS);
      if (this.s >= this.lane.stopS && this.crossingFree(this.lane.to)) this.enterCrossing();
    }
    this.pose();
    car.speed = this.speed;
    const f = car.forward;
    car.vx = f.x * this.speed; car.vz = f.z * this.speed;
  }

  enterCrossing() {
    const node = this.lane.to;
    const next = this.next;
    const outIndex = next.offsets.length > 1 ? (this.lane.offsets.length > 1 ? this.offsetIndex : 0) : 0;
    const p0 = pointOnLane(this.lane, this.lane.stopS, this.offset);
    const p2 = pointOnLane(next, next.startS, next.offsets[outIndex]);
    const straight = next.axis === this.lane.axis;
    const p1 = straight ? { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 } : (this.lane.dx === 0 ? { x: p0.x, z: p2.z } : { x: p2.x, z: p0.z });
    const len = Math.hypot(p2.x - p0.x, p2.z - p0.z) * (straight ? 1 : 1.18);
    node.users = (node.users || 0) + 1;
    node.lefts = (node.lefts || 0) + (this.turningLeft ? 1 : 0);
    node.usersAxis = this.lane.axis;
    this.turn = { p0, p1, p2, len, t: 0, next, outIndex, node, left: this.turningLeft };
  }

  advanceTurn(step, random) {
    const t = this.turn;
    t.t += step / t.len;
    if (t.t < 1) return;
    this.leaveCrossing();
    this.lane = t.next;
    this.offsetIndex = t.outIndex;
    this.s = t.next.startS + (t.t - 1) * t.len;
    this.chooseNext(random);
  }

  leaveCrossing() {
    const t = this.turn;
    t.node.users--;
    if (t.left) t.node.lefts--;
    this.turn = null;
  }

  // Leaving the pool or losing the car mid-crossing hands the crossing back.
  release() {
    if (this.turn) this.leaveCrossing();
  }

  pose() {
    const car = this.car;
    if (this.turn) {
      const { p0, p1, p2, t: u } = this.turn;
      const t = Math.min(1, u), a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      car.x = a * p0.x + b * p1.x + c * p2.x;
      car.z = a * p0.z + b * p1.z + c * p2.z;
      const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const dz = 2 * (1 - t) * (p1.z - p0.z) + 2 * t * (p2.z - p1.z);
      if (dx * dx + dz * dz > 1e-6) car.heading = Math.atan2(-dx, -dz);
    } else {
      pointOnLane(this.lane, this.s, this.offset, car);
      car.heading = this.lane.heading;
    }
    car.sync();
  }
}

// The traffic pool: a hard cap of cars made once, placed on lanes around the player and recycled
// when they fall too far behind. Owns the gap check against every car and every walker.
export function createTrafficPool(game, makeCar) {
  ({ pointOnLane, turnChoices, signalColor } = game.roads);
  const random = game.random;
  const drivers = [];
  for (let i = 0; i < TRAFFIC_CAP; i++) drivers.push(new TrafficDriver(null));
  const pool = {
    drivers, random, time: 0,
    get active() { return drivers.filter((d) => d.car); },

    clearAhead(me) {
      const car = me.car, f = car.forward;
      let best = LOOK_AHEAD;
      const test = (x, z, radius) => {
        const dx = x - car.x, dz = z - car.z;
        const ahead = dx * f.x + dz * f.z;
        if (ahead <= 0 || ahead > LOOK_AHEAD + radius) return;
        const side = Math.abs(dx * f.z - dz * f.x);
        if (side < 1.9 + Math.min(1.2, ahead * 0.08)) best = Math.min(best, ahead - car.spec.length / 2 - radius);
      };
      // Inside a crossing only the cars already on the exit lane count; the gate keeps the rest apart.
      const exitHeading = me.turn ? me.turn.next.heading : null;
      for (const other of game.cars) {
        if (other === car || !other.model.visible) continue;
        if (exitHeading !== null && other.ai && Math.abs(Math.sin((other.heading - exitHeading) / 2)) > 0.3) continue;
        test(other.x, other.z, other.spec.length / 2);
      }
      if (!game.vehicle) test(game.player.x, game.player.z, 0.6);
      for (const w of game.walkersNear?.(car.x, car.z) ?? []) test(w.x, w.z, 0.5);
      return best;
    },

    // Fills empty pool slots on lanes 45-170 m from the player, never on top of another car.
    spawnAround(focus, count = TRAFFIC_CAP) {
      let placed = 0;
      for (const d of drivers) {
        if (placed >= count) break;
        if (d.car) continue;
        for (let tries = 0; tries < 12; tries++) {
          const lane = random.pick(game.roads.lanes);
          const s = random.range(lane.startS + 4, lane.stopS - 6);
          const oi = random.int(0, lane.offsets.length - 1);
          const p = pointOnLane(lane, s, lane.offsets[oi]);
          const dist = Math.hypot(p.x - focus.x, p.z - focus.z);
          if (dist < SPAWN_MIN || dist > SPAWN_MAX) continue;
          if (game.cars.some((c) => c.model.visible && Math.hypot(c.x - p.x, c.z - p.z) < 9)) continue;
          if (!d.spare) d.spare = makeCar();
          d.car = d.spare;
          d.car.ai = d;
          d.car.model.visible = true;
          d.place(lane, s, oi, random);
          placed++;
          break;
        }
      }
      return placed;
    },

    update(dt, focus) {
      pool.time = game.time;
      for (const d of drivers) {
        if (!d.car) continue;
        if (Math.hypot(d.car.x - focus.x, d.car.z - focus.z) > DESPAWN_DIST) { pool.despawn(d); continue; }
        d.update(dt, pool);
      }
      if (game.tick % 30 === 0) pool.spawnAround(focus, 2);
    },

    despawn(d) {
      d.release();
      d.car.model.visible = false;
      d.car.x = d.car.z = 1e5;
      d.car.ai = null;
      d.car = null;
    },

    // The car is taken: it leaves the pool for good and the slot builds a fresh one next time.
    detach(car) {
      const d = car.ai;
      if (!d) return;
      d.release();
      car.ai = null;
      d.car = null;
      d.spare = null;
    },

    waitingAtRed() { return drivers.filter((d) => d.car && d.waitingAtRed).length; },
  };
  return pool;
}

export const TRAFFIC_CAP = 24;
// Lane helpers handed over by the road network (feature modules import only three and core).
let pointOnLane, turnChoices, signalColor;
const SPAWN_MIN = 45, SPAWN_MAX = 170, DESPAWN_DIST = 230;
const ACCEL = 3.2, BRAKE = 6.5, KEEP_GAP = 2.6, LOOK_AHEAD = 28;
