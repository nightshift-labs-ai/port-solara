import * as THREE from 'three';
import { CAR_SPECS } from '../vehicles/car-models.js';

// Night-only lights, hidden by day and fading in with dusk (the day-night cycle's level): warm
// lamps along both edges of the Gull Bridge deck, and the head and tail lamps of the cars on the
// road near Wren (traffic within 150 m, moving or waiting at a signal, and the car she drives).
// Each is one Points draw with no shadows.
const CAR_LAMP_RANGE = 150;

export function createNightLights(game) {
  const { scene } = game;
  const dot = glowDot();
  // Gull Bridge (deck top at y 19, x -392, z -290..310): a lamp every 20 m on both edges.
  const deck = [];
  for (let z = -285; z <= 305; z += 20) deck.push(-398.6, 19.6, z, -385.4, 19.6, z);
  const bridge = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(deck, 3)),
    new THREE.PointsMaterial({ size: 7, map: dot, color: 0xffc27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  bridge.visible = false;
  scene.add(bridge);

  // Car lamps: white heads, red tails, positions rewritten every frame (so never frustum-culled).
  const max = (game.traffic.drivers.length + 1) * 4;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(max * 3), 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(max * 3), 3));
  const cars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.5, map: dot, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  cars.frustumCulled = false;
  cars.visible = false;
  scene.add(cars);
  const lamps = {}, p = new THREE.Vector3(), head = new THREE.Color(0xfff3dc), tail = new THREE.Color(0xff2a1c);
  const lampsOf = (kind) => lamps[kind] ??= CAR_SPECS[kind] ? CAR_SPECS[kind].boxes(new THREE.Color()).filter((b) => b.glow) : [];

  return {
    state: () => ({ bridge: bridge.visible, cars: cars.visible, carLamps: geo.drawRange.count }),
    update(n) {
      bridge.visible = n > 0.02;
      bridge.material.opacity = n;
      cars.visible = n > 0.02 && game.mode === 'play' && game.settings?.graphics !== 'low';
      if (!cars.visible) return;
      cars.material.opacity = n;
      const pos = geo.attributes.position, col = geo.attributes.color, f = game.focus;
      let k = 0;
      const add = (car) => {
        car.model.updateMatrixWorld();
        for (const b of lampsOf(car.model.userData.kind)) {
          if (k >= max) return;
          car.model.localToWorld(p.set(b.x, b.y, b.z + (b.z < 0 ? -0.12 : 0.12)));
          pos.setXYZ(k, p.x, p.y, p.z);
          const c = b.z < 0 ? head : tail;
          col.setXYZ(k++, c.r, c.g, c.b);
        }
      };
      for (const d of game.traffic.drivers) {
        if (d.car && d.car.model.visible && Math.hypot(d.car.x - f.x, d.car.z - f.z) < CAR_LAMP_RANGE) add(d.car);
      }
      if (game.vehicle) add(game.vehicle);
      geo.setDrawRange(0, k);
      pos.needsUpdate = col.needsUpdate = true;
    },
  };
}

function glowDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,0.7)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
