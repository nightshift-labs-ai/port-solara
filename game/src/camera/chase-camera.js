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
      this.lookOffset *= Math.pow(0.35, dt);
      let d = car.heading + this.lookOffset - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 3.2);
      const back = 8, up = 3.5;
      this.pos.set(car.x + Math.sin(this.yaw) * back, up, car.z + Math.cos(this.yaw) * back);
      this.target.set(car.x - Math.sin(this.yaw) * 6, 1.3, car.z - Math.cos(this.yaw) * 6);
      cam.fov += ((65 + Math.min(10, Math.abs(car.speed) * 0.18)) - cam.fov) * Math.min(1, dt * 2);
    } else {
      const p = focus;
      const side = 0.7, height = 1.75;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      // Spring arm: march out from the shoulder and stop short of any building.
      let want = 4.2;
      for (let s = 0.5; s <= 4.2; s += 0.35) {
        const x = p.x + rx * side - fx * s * Math.cos(this.pitch), z = p.z + rz * side - fz * s * Math.cos(this.pitch);
        if (collide.pointInside(x, z)) { want = Math.max(0.6, s - 0.4); break; }
      }
      this.arm += (want - this.arm) * Math.min(1, dt * (want < this.arm ? 20 : 4));
      const horiz = this.arm * Math.cos(this.pitch);
      this.pos.set(p.x + rx * side - fx * horiz, height + this.arm * Math.sin(this.pitch), p.z + rz * side - fz * horiz);
      this.target.set(p.x + rx * side + fx * 4, height - 0.1, p.z + rz * side + fz * 4);
      cam.fov += (62 - cam.fov) * Math.min(1, dt * 3);
    }
    if (this.shake > 0) {
      this.pos.x += (Math.sin(performance.now() * 0.09) * this.shake) * 0.3;
      this.pos.y += (Math.cos(performance.now() * 0.11) * this.shake) * 0.3;
      this.shake = Math.max(0, this.shake - dt * 2);
    }
    cam.position.copy(this.pos);
    cam.lookAt(this.target);
    cam.updateProjectionMatrix();
  }
}
