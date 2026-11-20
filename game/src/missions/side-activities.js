import { buildMarker } from './mission-runner.js';
import { nearestNode } from '../police/police-ai.js';
import { countRaceWon, countCourierJob, countCarSold, countHornetBought, countRespray } from '../story/career-stats.js';
import { WEAPONS } from '../combat/weapons-and-damage.js';

// Side activities between story jobs, all started with [E] at a place on the Tab map:
// ring-road races (from the race flags, in a car), courier drops for Mara (Quist Auto, on foot),
// stolen-car sales (Quist Auto, in a car), the Brass & Barrel gun shop and the Pelican Fuel respray.
// REP ranks unlock the Hornet at the gun shop and better prices at Quist Auto.
export const SIDE_ACTIVITIES = {
  // Each race is a loop of road crossings from its flag: corner offsets in metres (snapped to the
  // nearest crossing when the game boots), par time for the payout, first-win cash and REP.
  races: {
    race1: { name: 'NORTH RING', loop: [[0, 0], [110, 0], [110, 110], [0, 110], [0, 0]], par: 75, cash: 1500, rep: 40 },
    race2: { name: 'CORAL CIRCUIT', loop: [[0, 0], [-110, 0], [-110, 110], [0, 110], [0, 0]], par: 75, cash: 1500, rep: 40 },
    race3: { name: 'DOCKSIDE DASH', loop: [[0, 0], [-110, 0], [-110, -110], [0, -110], [0, 0]], par: 75, cash: 1500, rep: 40 },
    race4: { name: 'PALMLINE SPRINT', loop: [[0, 0], [0, 90], [100, 90], [100, 0], [0, 0]], par: 70, cash: 1500, rep: 40 },
  },
  checkpointRadius: 9,
  raceLimit: 150,
  courier: { pay: 600, rep: 25, seconds: 80, minDistance: 120, maxDistance: 260 },
  // Quist Auto pays by kind; police and gang cars are not for sale.
  carSales: { albacore: 9000, saltrunner: 2200, dockhand: 1800, promenade: 1600, citrine: 1300, pipit: 1100 },
  gunShop: { ammo: 200, hornet: 2500, breaker: 3800, gannet: 6500 },
  respray: { cost: 500 },
  // REP rank -> what it opens (shown on the gun shop and Quist Auto prompts). Gun ranks never go
  // down in WEAPONS order: the shop offers the first locked gun.
  unlocks: [
    { rank: 3, weapon: 'hornet', note: 'HORNET SMG AT BRASS & BARREL' },
    { rank: 4, salesBonus: 0.25, note: 'QUIST AUTO PAYS +25%' },
    { rank: 4, weapon: 'breaker', note: 'BREAKER SHOTGUN AT BRASS & BARREL' },
    { rank: 5, weapon: 'gannet', note: 'GANNET RIFLE AT BRASS & BARREL' },
  ],
  useRange: 7,
};

const money = (n) => `$${n.toLocaleString('en-US')}`;
const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// Runs the side activities: one active at a time (`active`), a gold checkpoint/drop marker, the
// [E] prompt for whatever place Wren stands at, and the banner while one runs.
export class SideActivities {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.result = null;
    this.marker = buildMarker(game.THREE, 0.8);
    this.marker.visible = false;
    game.scene.add(this.marker);
    this.courierRoll = 0;
    // Race loops snapped onto real crossings once.
    this.raceRoutes = {};
    for (const spot of game.spots.filter((p) => p.race)) {
      const def = SIDE_ACTIVITIES.races[spot.id];
      this.raceRoutes[spot.id] = def.loop.map(([dx, dz]) => {
        const n = nearestNode(game.roads.nodes, spot.x + dx, spot.z + dz);
        return { x: n.x, z: n.z };
      });
    }
  }

  get rank() { return this.game.rankFor(this.game.missions.rep).rank; }
  unlocked(key) { return SIDE_ACTIVITIES.unlocks.some((u) => u[key] && this.rank >= u.rank); }
  weaponUnlocked(id) { return SIDE_ACTIVITIES.unlocks.some((u) => u.weapon === id && this.rank >= u.rank); }
  // The first locked gun Brass & Barrel sells (WEAPONS order), and the rank it opens at.
  nextGun() {
    const w = WEAPONS.find((x) => this.game.arms.locked.has(x.id) && SIDE_ACTIVITIES.gunShop[x.id]);
    const row = w && SIDE_ACTIVITIES.unlocks.find((u) => u.weapon === w.id);
    return w && row ? { w, rank: row.rank, price: SIDE_ACTIVITIES.gunShop[w.id] } : null;
  }

  // The place Wren is at (within reach), or null.
  spotHere() {
    const g = this.game, r = SIDE_ACTIVITIES.useRange * (g.vehicle ? 1.6 : 1);
    return g.spots.find((p) => p.id !== 'safehouse' && p.id !== 'spd' && Math.hypot(g.focus.x - p.x, g.focus.z - p.z) < r) || null;
  }

  // What [E] would do here, as prompt text, or null.
  offer() {
    const g = this.game, p = this.spotHere();
    if (!p || this.active || g.missions.mission) return null;
    const car = g.vehicle;
    if (p.race) return car ? `[E] START ${SIDE_ACTIVITIES.races[p.id].name}` : 'RACE START · BRING A CAR';
    if (p.id === 'quist') {
      if (!car) return '[E] COURIER DROP FOR MARA';
      const price = this.priceOf(car);
      return price ? `[E] SELL ${car.name} ${money(price)}` : 'QUIST AUTO WON\'T TOUCH THAT CAR';
    }
    if (p.id === 'guns') {
      if (car) return 'BRASS & BARREL · ON FOOT';
      const next = this.nextGun(), ammo = `[E] AMMO ${money(SIDE_ACTIVITIES.gunShop.ammo)}`;
      if (!next) return ammo;
      return this.rank >= next.rank ? `[E] BUY ${next.w.name} ${money(next.price)}` : `${ammo} · ${next.w.short} AT RANK ${next.rank}`;
    }
    if (p.id === 'respray') return car ? `[E] RESPRAY ${money(SIDE_ACTIVITIES.respray.cost)}` : 'PELICAN FUEL · RESPRAY IN A CAR';
    return null;
  }

  priceOf(car) {
    const base = SIDE_ACTIVITIES.carSales[car.model.userData.kind];
    if (!base || car.ai === 'spd') return 0;
    const bonus = this.unlocked('salesBonus') ? 1.25 : 1;
    return Math.round(base * bonus * Math.max(0.3, car.health / 100) / 10) * 10;
  }

  // [E] at a place: start or buy whatever it offers. Returns a short note (also toasted).
  use() {
    const g = this.game, p = this.spotHere();
    if (!p || this.active || g.missions.mission) return null;
    const car = g.vehicle;
    let note = null;
    if (p.race && car) note = this.startRace(p.id);
    else if (p.id === 'quist' && car) note = this.sellCar(car);
    else if (p.id === 'quist') note = this.startCourier();
    else if (p.id === 'guns' && !car) note = this.buy();
    else if (p.id === 'respray' && car) note = this.respray();
    if (note) g.toast?.(note);
    return note;
  }

  startRace(id) {
    const route = this.raceRoutes[id];
    this.active = { kind: 'race', id, name: SIDE_ACTIVITIES.races[id].name, route, next: 1, time: 0 };
    return `${this.active.name} · GO`;
  }

  startCourier() {
    const g = this.game, c = SIDE_ACTIVITIES.courier;
    // A seeded pick of a crossing between the min and max distance from Quist Auto.
    const from = g.focus, nodes = g.roads.nodes.filter((n) => {
      const d = Math.hypot(n.x - from.x, n.z - from.z);
      return d > c.minDistance && d < c.maxDistance;
    });
    const n = nodes[(this.courierRoll++ * 7 + g.progress.courier * 3) % nodes.length];
    this.active = { kind: 'courier', name: 'COURIER DROP', drop: { x: n.x, z: n.z }, time: 0 };
    return 'COURIER DROP · PACKAGE ON BOARD';
  }

  sellCar(car) {
    const g = this.game, price = this.priceOf(car);
    if (!price) return null;
    g.enterOrExit();
    car.owned = false;
    car.x = car.z = 1e5; car.speed = car.vx = car.vz = 0; car.model.visible = false; car.sync();
    g.cash += price;
    g.progress.sold = (g.progress.sold || 0) + 1;
    countCarSold(g); // progress.sold is not saved; the career count is
    return `SOLD ${car.name} +${money(price)}`;
  }

  buy() {
    const g = this.game, shop = SIDE_ACTIVITIES.gunShop;
    const next = this.nextGun();
    if (next && this.weaponUnlocked(next.w.id)) {
      if (g.cash < next.price) return 'NOT ENOUGH CASH';
      g.cash -= next.price;
      g.arms.give(next.w.id);
      if (next.w.id === 'hornet') countHornetBought(g);
      return `${next.w.name} -${money(next.price)}`;
    }
    const w = g.arms.weapon;
    if (!w.clip) return 'HOLD A GUN TO BUY ITS AMMO';
    if (g.cash < shop.ammo) return 'NOT ENOUGH CASH';
    g.cash -= shop.ammo;
    g.arms.clip.reserve += w.clip * 2;
    return `${w.short} AMMO +${w.clip * 2} -${money(shop.ammo)}`;
  }

  // Pelican Fuel: $500 and a new coat clears WANTED, but only while no unit sees the car.
  respray() {
    const g = this.game, cost = SIDE_ACTIVITIES.respray.cost;
    if (g.wantedLevel.pips === 0) return 'NO HEAT ON THIS CAR';
    if (g.copsSee()) return 'NOT WHILE THE SPD WATCHES';
    if (g.cash < cost) return 'NOT ENOUGH CASH';
    g.cash -= cost;
    g.wantedLevel.clear();
    g.police.reset?.();
    countRespray(g);
    return `RESPRAYED -${money(cost)} · HEAT CLEARED`;
  }

  // One fixed tick: checkpoints, drops, timers and the marker.
  update(dt) {
    const g = this.game, a = this.active;
    if (!a) { this.marker.visible = false; return; }
    a.time += dt;
    const goal = this.goal;
    this.marker.visible = true;
    this.marker.position.set(goal.x, 0, goal.z);
    this.marker.rotation.y = g.time * 1.4;
    const d = Math.hypot(g.focus.x - goal.x, g.focus.z - goal.z);
    if (a.kind === 'race') {
      if (!g.vehicle) return this.finish(false, 'OUT OF THE CAR');
      if (a.time > SIDE_ACTIVITIES.raceLimit) return this.finish(false, 'OUT OF TIME');
      if (d < SIDE_ACTIVITIES.checkpointRadius) {
        a.next++;
        if (a.next >= a.route.length) return this.finish(true);
      }
    } else if (a.kind === 'courier') {
      if (a.time > SIDE_ACTIVITIES.courier.seconds) return this.finish(false, 'OUT OF TIME');
      if (d < 6) return this.finish(true);
    }
  }

  get goal() { const a = this.active; return a.kind === 'race' ? a.route[a.next] : a.drop; }

  finish(passed, reason = '') {
    const g = this.game, a = this.active;
    this.active = null;
    this.marker.visible = false;
    let cash = 0, rep = 0, line = reason;
    if (passed && a.kind === 'race') {
      const def = SIDE_ACTIVITIES.races[a.id], best = g.progress.bestLaps[a.id];
      const first = best === undefined;
      g.progress.bestLaps[a.id] = Math.round(Math.min(best ?? Infinity, a.time) * 10) / 10;
      g.progress.races = Object.keys(g.progress.bestLaps).length;
      cash = first ? def.cash : a.time <= def.par ? Math.round(def.cash / 3) : 0;
      rep = first ? def.rep : 0;
      line = `TIME ${clock(a.time)} · BEST ${clock(g.progress.bestLaps[a.id])}`;
      countRaceWon(g);
    } else if (passed) {
      g.progress.courier = Math.min(g.progress.courierOf, g.progress.courier + 1);
      countCourierJob(g);
      cash = SIDE_ACTIVITIES.courier.pay; rep = SIDE_ACTIVITIES.courier.rep;
      line = `TIME ${clock(a.time)} · COURIER ${g.progress.courier}/${g.progress.courierOf}`;
    }
    g.cash += cash;
    g.missions.rep += rep;
    this.result = { passed, title: passed ? `${a.name} DONE` : `${a.name} LOST`, line, cash, rep, at: g.time };
    g.toast?.(passed ? `${a.name} +${money(cash)}${rep ? ` +${rep} REP` : ''}` : `${a.name} LOST · ${reason}`);
  }

  // The banner while an activity runs.
  objective() {
    const g = this.game, a = this.active, d = Math.round(Math.hypot(g.focus.x - this.goal.x, g.focus.z - this.goal.z));
    if (a.kind === 'race') {
      const best = g.progress.bestLaps[a.id];
      return { title: `${a.name} · CHECKPOINT ${a.next}/${a.route.length - 1}`, detail: `${clock(a.time)}${best !== undefined ? ` · best ${clock(best)}` : ''} · ${d} m` };
    }
    return { title: 'COURIER DROP FOR MARA', detail: `Deliver the package · ${d} m · ${Math.max(0, Math.ceil(SIDE_ACTIVITIES.courier.seconds - a.time))}s left` };
  }
}
