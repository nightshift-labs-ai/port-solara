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

  // Golden hour: a lilac sky fill keeps the shadows cool (never black), warm sand bounce from below.
  const hemi = new THREE.HemisphereLight(0xc4b8e2, 0xf0a878, 1.25);
  scene.add(hemi);

  // The sun sits low over the sea a hair north of due west, about 10 degrees up (around 18:20), so
  // it hangs at the far end of the east-west streets that run down to the beach.
  const sunDir = new THREE.Vector3(-Math.cos(0.17) * Math.cos(0.025), Math.sin(0.17), -Math.cos(0.17) * Math.sin(0.025)).normalize();
  const sun = new THREE.DirectionalLight(0xffa860, 3.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const cam = sun.shadow.camera;
  cam.left = -45; cam.right = 45; cam.top = 45; cam.bottom = -45; cam.near = 1; cam.far = 260;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  // Warm bounce from the bright street behind a viewer facing the sun (no shadows): faces turned
  // away from the low sun, like a car's rear in a chase toward it, keep their paint colour.
  const bounce = new THREE.DirectionalLight(0xffc49a, 0.9);
  bounce.position.set(-sunDir.x * 100, 30, -sunDir.z * 100);
  scene.add(bounce);

  // Sky dome: deep blue overhead to warm peach at the horizon, plus a sun disc.
  const skyGeo = new THREE.SphereGeometry(450, 24, 12);
  const colors = [];
  const pos = skyGeo.attributes.position;
  // Late-afternoon bands: saturated orange at the horizon, coral rose above it, a dusky
  // lavender-blue and deep blue overhead (kept off a pink/purple sunset-gradient look: the UI and
  // the wordmark stay navy and gold, brief section 9.3). No white haze band at the horizon.
  const top = new THREE.Color(0x25428a), mid = new THREE.Color(0x6c78b4), rose = new THREE.Color(0xee6f6a), low = new THREE.Color(0xff8a3a);
  for (let i = 0; i < pos.count; i++) {
    const h = Math.max(0, pos.getY(i) / 450);
    const c = h < 0.09 ? low.clone().lerp(rose, h / 0.09)
      : h < 0.3 ? rose.clone().lerp(mid, (h - 0.09) / 0.21) : mid.clone().lerp(top, Math.min(1, (h - 0.3) / 0.45));
    colors.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  sky.renderOrder = -10;
  scene.add(sky);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 24), new THREE.MeshBasicMaterial({ color: 0xffc27a, fog: false, toneMapped: false }));
  sunDisc.renderOrder = -8;
  // The sun's glow: a soft additive halo behind the disc (a cheap stand-in for a bloom pass).
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshBasicMaterial({
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
    sun, sunDir, sea, hemi, bounce, sky, sunDisc, glow, skyScale: 1,
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

export const HORIZON = 0xf7935e;

function sunGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,214,150,1)');
  grad.addColorStop(0.14, 'rgba(255,164,84,0.66)');
  grad.addColorStop(0.42, 'rgba(255,112,60,0.26)');
  grad.addColorStop(1, 'rgba(240,90,70,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const HEADLANDS = [[-345, -300, 34], [-340, 318, 26]];
