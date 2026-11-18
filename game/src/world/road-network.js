import * as THREE from 'three';

// Lays the street grid bent to the crescent bay and returns the roads and the city blocks.
export function buildRoadNetwork(game) {
  const roads = [];
  for (const x of NS_ROADS) {
    const width = x === BOULEVARD_X ? 20 : ROAD_WIDTH;
    roads.push({ axis: 'z', at: x, from: CITY_MIN_Z, to: CITY_MAX_Z, width, name: x === BOULEVARD_X ? 'PALMLINE BOULEVARD' : 'AVENIDA ' + (NS_ROADS.indexOf(x) + 1) });
  }
  for (const z of EW_ROADS) {
    roads.push({ axis: 'x', at: z, from: BOULEVARD_X, to: CITY_MAX_X, width: ROAD_WIDTH, name: 'RUA ' + (EW_ROADS.indexOf(z) + 1) });
  }

  const group = new THREE.Group();
  group.name = 'road-network';
  const roadTex = makeRoadTexture();
  for (const r of roads) {
    const len = r.to - r.from;
    const mat = r.axis === 'z' ? nsMaterial(roadTex, len) : ewMaterial(roadTex, len);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.width, len), mat);
    mesh.rotation.x = -Math.PI / 2;
    if (r.axis === 'x') mesh.rotation.z = Math.PI / 2;
    const mid = (r.from + r.to) / 2;
    mesh.position.set(r.axis === 'z' ? r.at : mid, r.axis === 'z' ? 0.04 : 0.05, r.axis === 'z' ? mid : r.at);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Plain asphalt patches over each crossing, with zebra crosswalks on all four sides.
  const crossings = [];
  for (const x of NS_ROADS) for (const z of EW_ROADS) crossings.push({ x, z, w: x === BOULEVARD_X ? 20 : ROAD_WIDTH });
  const patch = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.95 }), crossings.length);
  const stripes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.8 }), crossings.length * 4 * 6);
  const m = new THREE.Matrix4();
  let si = 0;
  crossings.forEach((c, i) => {
    m.makeScale(c.w, 1, ROAD_WIDTH).setPosition(c.x, 0.06, c.z);
    patch.setMatrixAt(i, m);
    for (let side = 0; side < 4; side++) {
      for (let k = 0; k < 6; k++) {
        const off = -5 + k * 2;
        if (side < 2) {
          const z = c.z + (side === 0 ? -1 : 1) * (ROAD_WIDTH / 2 + 2);
          m.makeScale(1, 1, 3.4).setPosition(c.x + off * (c.w / 12), 0.07, z);
        } else {
          const x = c.x + (side === 2 ? -1 : 1) * (c.w / 2 + 2);
          m.makeScale(3.4, 1, 1).setPosition(x, 0.07, c.z + off);
        }
        stripes.setMatrixAt(si++, m);
      }
    }
  });
  patch.receiveShadow = stripes.receiveShadow = true;
  group.add(patch, stripes);
  game.scene.add(group);

  // City blocks between the roads; the builder fills them by district.
  const blocks = [];
  const xs = NS_ROADS.map((x) => ({ at: x, half: (x === BOULEVARD_X ? 20 : ROAD_WIDTH) / 2 }));
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < EW_ROADS.length - 1; j++) {
      const minX = xs[i].at + xs[i].half + SIDEWALK, maxX = xs[i + 1].at - xs[i + 1].half - SIDEWALK;
      const minZ = EW_ROADS[j] + ROAD_WIDTH / 2 + SIDEWALK, maxZ = EW_ROADS[j + 1] - ROAD_WIDTH / 2 - SIDEWALK;
      blocks.push({ minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 });
    }
  }
  const network = { roads, blocks, coastX, boulevardX: BOULEVARD_X, nsRoads: NS_ROADS, ewRoads: EW_ROADS };
  game.roads = network;
  return network;
}

function nsMaterial(tex, len) {
  const t = tex.clone();
  t.repeat.set(1, len / 14);
  t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 });
}

function ewMaterial(tex, len) { return nsMaterial(tex, len); }

function makeRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#55585d';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = 70 + ((i * 97) % 40);
    g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    g.fillRect((i * 37) % 128, (i * 61) % 128, 2, 2);
  }
  g.fillStyle = '#f1ede2';
  g.fillRect(4, 0, 3, 128);
  g.fillRect(121, 0, 3, 128);
  g.fillStyle = '#f2c14e';
  g.fillRect(62, 10, 4, 54);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// The crescent bay: the shore bows east in the middle and opens to the west.
export function coastX(z) {
  return -300 + 82 * Math.cos(z * Math.PI / 700);
}

export const BOULEVARD_X = -180;
export const ROAD_WIDTH = 12;
export const SIDEWALK = 3;
export const NS_ROADS = [-180, -120, -60, 0, 60, 120, 180, 240, 300];
export const EW_ROADS = [-270, -210, -150, -90, -30, 30, 90, 150, 210, 270];
export const CITY_MIN_Z = -290, CITY_MAX_Z = 290, CITY_MAX_X = 320;
