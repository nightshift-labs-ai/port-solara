import * as THREE from 'three';

// Follows Wren on foot (over-the-shoulder spring arm that pulls in at walls) or the car
// (8 m behind, 3.5 m up, lagging the heading). Mouse look orbits; it eases back while driving.
export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'foot';
    this.view = 'near'; // the car view: 'near' or 'high' (C)
    this.footView = 'shoulder'; // the on-foot view: 'shoulder' or 'wide' (C); never stored in view
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
      // The player's car view (C cycles NEAR / HIGH); `framing` (set by the shot module) overrides it.
      const view = CAR_VIEWS[this.view] || CAR_VIEWS.near;
      const fr = this.framing || view;
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
      this.target.set(car.x - Math.sin(this.yaw) * ahead + car.vx * 0.08, view.aimY, car.z - Math.cos(this.yaw) * ahead + car.vz * 0.08);
      const fov = view.fov + Math.min(view.fovGain, speed * 0.24);
      cam.fov = this.lastMode !== 'car' || this.lastView !== this.view ? fov : cam.fov + (fov - cam.fov) * Math.min(1, dt * 2);
    } else if (this.footView === 'wide' && !this.aiming) {
      // WIDE on foot (C): a long, high arm off to the right, looking a little down past Wren at a
      // point 16 m ahead near chest height, so the street (or sand and sea) shows round her and the
      // hip-fire ray (the camera's forward) still crosses chest height at fight range. The height
      // does not follow the pitch; pitch tilts the look point instead (one radian per radian).
      const p = focus, W = FOOT_WIDE;
      this.pitch = Math.max(-0.35, Math.min(0.9, this.pitch));
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      // Spring arm: march back along the (blended) arm and stop short of any building.
      let want = W.reach;
      for (let s = 0.5; s <= W.reach; s += 0.35) {
        const side = 0.7 + (W.side - 0.7) * (s / W.reach);
        if (collide.pointInside(p.x + rx * side - fx * s, p.z + rz * side - fz * s)) { want = Math.max(0.6, s - 0.4); break; }
      }
      this.arm += (want - this.arm) * Math.min(1, dt * (want < this.arm ? 20 : 4));
      // A pulled-in arm comes down and in toward the shoulder view, never high straight above her.
      const k = Math.min(1, this.arm / W.reach);
      const side = 0.7 + (W.side - 0.7) * k, up = 1.75 + (W.up - 1.75) * k;
      this.pos.set(p.x + rx * side - fx * this.arm, up, p.z + rz * side - fz * this.arm);
      const lookY = W.aimY - Math.tan(this.pitch - 0.18) * (this.arm + W.ahead);
      this.target.set(p.x + rx * side + fx * W.ahead, lookY, p.z + rz * side + fz * W.ahead);
      cam.fov += (W.fov - cam.fov) * Math.min(1, dt * 3);
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
    this.lastView = this.view;
  }

  // C while driving: NEAR (8 m behind, 3.5 m up) or HIGH (10 m behind, 5.4 m up, looking down the
  // street over the roof, so both pavements and the cars round you show). The arm jumps to the new
  // spot on the next frame (the position spring starts over). On foot it toggles SHOULDER / WIDE
  // (footView only; the car view is left alone), and the arm grows or pulls in on its spring.
  cycleView() {
    if (this.mode !== 'car') {
      this.footView = this.footView === 'wide' ? 'shoulder' : 'wide';
      return this.footView;
    }
    this.view = this.view === 'high' ? 'near' : 'high';
    this.lastMode = null;
    return this.view;
  }
}

// back / up: the arm; aimY: the look-at height down the road; fov + fovGain: the lens at speed.
export const CAR_VIEWS = {
  near: { back: 8, up: 3.5, aimY: 1.3, fov: 65, fovGain: 12 },
  high: { back: 9.5, up: 5.2, aimY: -0.2, fov: 50, fovGain: 4 },
};
// The WIDE on-foot arm: reach (m back, horizontal), side (m right), up (m), the look point `ahead`
// of Wren at aimY, and the lens. RMB aim still uses the shoulder aim view.
const FOOT_WIDE = { reach: 7.6, side: 1.9, up: 5.0, ahead: 16, aimY: 1.2, fov: 62 };
const POSITION_SPRING = 12;
