// A kinematic bicycle model: speed-narrowed steering, a grip blend that lets the handbrake
// drift, and wall hits that push out, bounce and dent the car.
export class DrivableCar {
  constructor({ spec, model, x, z, heading = 0 }) {
    this.spec = spec;
    this.name = spec.name;
    this.model = model;
    this.x = x; this.z = z;
    this.heading = heading; // radians; 0 faces -z
    this.vx = 0; this.vz = 0;
    this.speed = 0;
    this.steer = 0;
    this.health = 100;
    this.driver = null;
    this.drifting = false;
    this.slip = 0;
    this.throttle = 0;
    this.handbrake = false;
    this.lastImpact = 0;
    this.sync();
  }

  get forward() { return { x: -Math.sin(this.heading), z: -Math.cos(this.heading) }; }

  // One fixed tick. controls: { throttle -1..1, steer -1..1, handbrake bool }.
  update(dt, controls, collide) {
    const s = this.spec;
    const f = this.forward;
    let along = this.vx * f.x + this.vz * f.z;
    const throttle = controls.throttle;
    if (throttle > 0) along += (along < 0 ? s.accel * 2 : s.accel * (1 - Math.max(0, along) / s.topSpeed)) * throttle * dt;
    else if (throttle < 0) along += (along > 0.5 ? -s.accel * 2.2 : -s.accel * 0.6 * (along > -12 ? 1 : 0)) * -throttle * dt;
    else along -= Math.sign(along) * Math.min(Math.abs(along), 2.2 * dt);
    if (controls.handbrake) along -= Math.sign(along) * Math.min(Math.abs(along), 6 * dt);

    // Steering narrows with speed; the heading turns with the rolling speed.
    const target = controls.steer * (0.62 - Math.min(0.42, Math.abs(along) / 90));
    this.steer += (target - this.steer) * Math.min(1, dt * 8);
    const wheelbase = s.length * 0.62;
    this.heading -= (along / wheelbase) * Math.tan(this.steer) * dt * (controls.handbrake ? 1.35 : 1);

    // Grip blend: the forward speed follows the new heading at once; the sideways slip
    // decays with grip, slowly with the handbrake on, which is what makes a drift.
    const nf = this.forward;
    const grip = controls.handbrake ? 1.4 : s.grip;
    const k = Math.min(1, grip * dt);
    const onNew = this.vx * nf.x + this.vz * nf.z;
    const latX = this.vx - nf.x * onNew, latZ = this.vz - nf.z * onNew;
    this.vx = nf.x * along + latX * (1 - k);
    this.vz = nf.z * along + latZ * (1 - k);
    const slip = Math.abs(this.vx * nf.z - this.vz * nf.x);
    this.slip = slip;
    this.throttle = throttle;
    this.handbrake = !!controls.handbrake;
    this.drifting = slip > 3.5;
    this.speed = Math.hypot(this.vx, this.vz) * Math.sign(along || 1);

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.collide(collide);
    this.sync();
  }

  // Two circles along the body stand in for the car against building boxes.
  collide(collide) {
    const f = this.forward;
    const r = this.spec.width * 0.55;
    const off = this.spec.length * 0.28;
    for (const sgn of [1, -1]) {
      const p = { x: this.x + f.x * off * sgn, z: this.z + f.z * off * sgn };
      const n = collide.resolveCircle(p, r);
      if (!n) continue;
      this.x += p.x - (this.x + f.x * off * sgn);
      this.z += p.z - (this.z + f.z * off * sgn);
      const into = this.vx * n.x + this.vz * n.z;
      if (into < 0) {
        this.vx -= into * n.x * 1.4;
        this.vz -= into * n.z * 1.4;
        this.vx *= 0.7; this.vz *= 0.7;
        const impact = -into;
        if (impact > 4) this.health = Math.max(0, this.health - impact * 1.5);
        this.lastImpact = impact;
      }
    }
  }

  sync() {
    if (!this.model) return;
    this.model.position.set(this.x, 0, this.z);
    this.model.rotation.y = this.heading;
    this.model.rotation.z = -this.steer * Math.min(1, Math.abs(this.speed) / 30) * 0.08;
  }
}
