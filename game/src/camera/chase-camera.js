import * as THREE from 'three';

// Follows Wren on foot (over-the-shoulder spring arm that pulls in at walls) or the car
// (8 m behind, 3.5 m up, lagging the heading). Mouse look orbits; it eases back while driving.
export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'foot';
    this.yaw = 0;
    this.pitch = 0.18;
    this.lookOffset = 0;
    this.arm = 4.2;
    this.shake = 0;
    this.pos = new THREE.Vector3();
    this.target = new THREE.Vector3();
  }

  look(dx, dy) {
    if (this.mode === 'foot') {
      this.yaw -= dx * 0.0032;
      this.pitch = Math.max(-0.35, Math.min(0.9, this.pitch + dy * 0.0026));
    } else {
      this.lookOffset = Math.max(-2.6, Math.min(2.6, this.lookOffset - dx * 0.004));
    }
  }

  // Called once per frame with the interpolation-free sim state.
  update(dt, focus, collide) {
    const cam = this.camera;
    if (this.mode === 'car') {
      const car = focus;
      const speed = Math.abs(car.speed);
      this.lookOffset *= Math.pow(0.35, dt);
      // Heading lag: the arm swings after the car, looser in a slide so its flank shows.
      let d = car.heading + this.lookOffset - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * (car.drifting ? 1.7 : 3.2));
      // `framing` (set by the shot module) brings the arm lower and closer than play's 8 m / 3.5 m.
      const fr = this.framing || { back: CAR_BACK, up: CAR_UP };
      const back = fr.back + Math.min(0.8, speed * 0.02), up = fr.up;
      const wx = car.x + Math.sin(this.yaw) * back, wz = car.z + Math.cos(this.yaw) * back;
      // Position lag: a stiff spring, so hard acceleration stretches the arm a little.
      if (this.lastMode !== 'car') this.pos.set(wx, up, wz);
      else {
        const k = Math.min(1, dt * POSITION_SPRING);
        this.pos.set(this.pos.x + (wx - this.pos.x) * k, up, this.pos.z + (wz - this.pos.z) * k);
      }
      // Look-ahead: aim further down the road as speed rises, leaning into the velocity.
      const ahead = 6 + Math.min(7, speed * 0.2);
      this.target.set(car.x - Math.sin(this.yaw) * ahead + car.vx * 0.08, 1.3, car.z - Math.cos(this.yaw) * ahead + car.vz * 0.08);
      cam.fov += ((65 + Math.min(12, speed * 0.24)) - cam.fov) * Math.min(1, dt * 2);
    } else {
      const p = focus;
      // RMB shoulder aim: the arm pulls in to 2.4 m over the right shoulder and the lens narrows.
      const side = this.aiming ? 0.85 : 0.7, height = this.aiming ? 1.7 : 1.75, reach = this.aiming ? 2.4 : 4.2;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      // Spring arm: march out from the shoulder and stop short of any building.
      let want = reach;
      for (let s = 0.5; s <= reach; s += 0.35) {
        const x = p.x + rx * side - fx * s * Math.cos(this.pitch), z = p.z + rz * side - fz * s * Math.cos(this.pitch);
        if (collide.pointInside(x, z)) { want = Math.max(0.6, s - 0.4); break; }
      }
      this.arm += (want - this.arm) * Math.min(1, dt * (want < this.arm ? 20 : 4));
      const horiz = this.arm * Math.cos(this.pitch);
      this.pos.set(p.x + rx * side - fx * horiz, height + this.arm * Math.sin(this.pitch), p.z + rz * side - fz * horiz);
      this.target.set(p.x + rx * side + fx * 4, height - 0.1, p.z + rz * side + fz * 4);
      cam.fov += ((this.aiming ? 50 : 62) - cam.fov) * Math.min(1, dt * 3);
    }
    cam.position.copy(this.pos);
    if (this.shake > 0) {
      cam.position.x += (Math.sin(performance.now() * 0.09) * this.shake) * 0.3;
      cam.position.y += (Math.cos(performance.now() * 0.11) * this.shake) * 0.3;
      this.shake = Math.max(0, this.shake - dt * 2);
    }
    cam.lookAt(this.target);
    cam.updateProjectionMatrix();
    this.lastMode = this.mode;
  }
}

const CAR_BACK = 8, CAR_UP = 3.5, POSITION_SPRING = 12;
