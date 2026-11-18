// Seeded random numbers and the spatial hash every collision query goes through.
export function createSeededRandom(seed = 1) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    pick: (list) => list[Math.floor(next() * list.length) % list.length],
    chance: (p) => next() < p,
  };
}

// Axis-aligned boxes (minX, maxX, minZ, maxZ, height) bucketed in 16 m cells.
export function createSpatialHash(cell = 16) {
  const cells = new Map();
  const key = (i, j) => i * 73856093 ^ j * 19349663;
  const boxes = [];
  return {
    boxes,
    insert(box) {
      boxes.push(box);
      for (let i = Math.floor(box.minX / cell); i <= Math.floor(box.maxX / cell); i++) {
        for (let j = Math.floor(box.minZ / cell); j <= Math.floor(box.maxZ / cell); j++) {
          const k = key(i, j);
          if (!cells.has(k)) cells.set(k, []);
          cells.get(k).push(box);
        }
      }
    },
    query(x, z, r) {
      const found = new Set();
      for (let i = Math.floor((x - r) / cell); i <= Math.floor((x + r) / cell); i++) {
        for (let j = Math.floor((z - r) / cell); j <= Math.floor((z + r) / cell); j++) {
          const list = cells.get(key(i, j));
          if (list) for (const b of list) found.add(b);
        }
      }
      return found;
    },
    // Pushes a circle out of every box it overlaps; returns the push normal or null.
    resolveCircle(pos, r) {
      let hit = null;
      for (const b of this.query(pos.x, pos.z, r)) {
        const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        let dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 < 1e-6) {
          const pushes = [[b.minX - r - pos.x, 0], [b.maxX + r - pos.x, 0], [0, b.minZ - r - pos.z], [0, b.maxZ + r - pos.z]];
          pushes.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
          pos.x += pushes[0][0]; pos.z += pushes[0][1];
          const l = Math.hypot(pushes[0][0], pushes[0][1]) || 1;
          hit = { x: pushes[0][0] / l, z: pushes[0][1] / l };
          continue;
        }
        const d = Math.sqrt(d2);
        dx /= d; dz /= d;
        pos.x = cx + dx * r; pos.z = cz + dz * r;
        hit = { x: dx, z: dz };
      }
      return hit;
    },
    pointInside(x, z) {
      for (const b of this.query(x, z, 0)) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
      return false;
    },
  };
}
