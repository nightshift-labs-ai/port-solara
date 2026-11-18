import * as THREE from 'three';

// Late-afternoon light over the bay: sky dome, low sun with a player-centred shadow, land and sea.
export function createSunSoakedLighting(game) {
  const { scene, renderer, roads } = game;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene.fog = new THREE.Fog(HORIZON, 140, 420);
  scene.background = new THREE.Color(HORIZON);

  // Golden hour: cool sky fill keeps the shadows blue, warm sand bounce from below.
  const hemi = new THREE.HemisphereLight(0xb8c6ec, 0xeaae78, 1.2);
  scene.add(hemi);

  // The sun sits low over the sea to the west-south-west, about 15 degrees up (around 18:00).
  const sunDir = new THREE.Vector3(-Math.cos(0.26) * 0.93, Math.sin(0.26), Math.cos(0.26) * 0.37).normalize();
  const sun = new THREE.DirectionalLight(0xffbf7a, 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const cam = sun.shadow.camera;
  cam.left = -45; cam.right = 45; cam.top = 45; cam.bottom = -45; cam.near = 1; cam.far = 260;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  // Sky dome: deep blue overhead to warm peach at the horizon, plus a sun disc.
  const skyGeo = new THREE.SphereGeometry(450, 24, 12);
  const colors = [];
  const pos = skyGeo.attributes.position;
  // Golden-hour bands: warm gold at the horizon, a thin rose-peach band, then clear blue overhead.
  const top = new THREE.Color(0x2a5fa8), mid = new THREE.Color(0x8fb4dc), rose = new THREE.Color(0xf2b49c), low = new THREE.Color(HORIZON);
  for (let i = 0; i < pos.count; i++) {
    const h = Math.max(0, pos.getY(i) / 450);
    const c = h < 0.08 ? low.clone().lerp(rose, h / 0.08)
      : h < 0.24 ? rose.clone().lerp(mid, (h - 0.08) / 0.16) : mid.clone().lerp(top, Math.min(1, (h - 0.24) / 0.55));
    colors.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  sky.renderOrder = -10;
  scene.add(sky);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 24), new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false, toneMapped: false }));
  sunDisc.renderOrder = -8;
  // The sun's glow: a soft additive halo behind the disc (a cheap stand-in for a bloom pass).
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshBasicMaterial({
    map: sunGlowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  glow.position.z = -0.5;
  glow.renderOrder = -9;
  sunDisc.add(glow);
  scene.add(sunDisc);

  // Sea: a turquoise plane that catches the low sun as glitter.
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1fa3a8, roughness: 0.12, metalness: 0.25 }));
  sea.position.y = -0.6;
  scene.add(sea);

  // Land: a sand shelf following the crescent shore, paving over it east of the boulevard.
  const shore = new THREE.Shape();
  shore.moveTo(roads.coastX(-340), -340);
  for (let z = -340; z <= 340; z += 20) shore.lineTo(roads.coastX(z), z);
  shore.lineTo(420, 340); shore.lineTo(420, -340); shore.closePath();
  const sand = new THREE.Mesh(new THREE.ShapeGeometry(shore).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xe9d3a6, roughness: 1, side: THREE.DoubleSide }));
  sand.receiveShadow = true;
  scene.add(sand);
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(520, 600).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.95 }));
  paving.position.set(roads.boulevardX + 260 - 12, 0.02, 0);
  paving.receiveShadow = true;
  scene.add(paving);

  // Lantern Point: a rocky headland at the north tip of the bay, and the south mole.
  const rock = new THREE.MeshStandardMaterial({ color: 0xb9a78a, roughness: 1 });
  for (const [x, z, r] of HEADLANDS) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 6, 3, 18), rock);
    head.position.set(x, 0.9, z);
    head.receiveShadow = true;
    scene.add(head);
  }

  const light = {
    sun, sunDir, sea, skyScale: 1,
    // The graphics preset's draw distance: the dome and sun disc shrink with the far plane.
    setDrawDistance(far) {
      light.skyScale = Math.min(1, (far - 20) / 460);
      sky.scale.setScalar(light.skyScale);
      sunDisc.scale.setScalar(light.skyScale);
    },
    // Keeps the shadow frustum, the sky and the sun disc centred on the focus point.
    follow(focus, eye = focus) {
      sun.position.set(focus.x + sunDir.x * 140, sunDir.y * 140, focus.z + sunDir.z * 140);
      sun.target.position.set(focus.x, 0, focus.z);
      sky.position.set(eye.x, 0, eye.z);
      const d = 430 * light.skyScale;
      sunDisc.position.set(eye.x + sunDir.x * d, sunDir.y * d, eye.z + sunDir.z * d);
      sunDisc.lookAt(eye.x, 0, eye.z);
    },
  };
  return light;
}

export const HORIZON = 0xf7c08e;

function sunGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,236,190,0.95)');
  grad.addColorStop(0.18, 'rgba(255,200,130,0.55)');
  grad.addColorStop(0.5, 'rgba(255,160,90,0.18)');
  grad.addColorStop(1, 'rgba(255,140,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const HEADLANDS = [[-345, -300, 34], [-340, 318, 26]];
