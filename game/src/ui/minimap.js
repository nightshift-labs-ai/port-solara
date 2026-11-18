// Draws the rounded-square minimap: it turns with the camera heading, shows sea, blocks and
// roads from the city data, a thick gold GPS line to the objective, and blips.
export function drawMinimap(ctx, game, x, y, size) {
  const s = ctx.canvas.width / 1280;
  const scale = size / 300; // pixels per metre: about 300 m across
  const focus = game.focus;
  const yaw = game.chase.yaw;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 22 * s);
  ctx.fillStyle = '#1b7f8a';
  ctx.fill();
  ctx.clip();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(yaw);
  ctx.scale(scale, scale);
  ctx.translate(-focus.x, -focus.z);

  // Land follows the crescent shore.
  const roads = game.roads;
  ctx.fillStyle = '#e8d6ae';
  ctx.beginPath();
  ctx.moveTo(roads.coastX(-360), -360);
  for (let z = -360; z <= 360; z += 20) ctx.lineTo(roads.coastX(z), z);
  ctx.lineTo(500, 360); ctx.lineTo(500, -360); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9c2b4';
  for (const b of roads.blocks) ctx.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
  ctx.strokeStyle = '#ffffff';
  for (const r of roads.roads) {
    ctx.lineWidth = r.width * 0.9;
    ctx.beginPath();
    if (r.axis === 'z') { ctx.moveTo(r.at, r.from); ctx.lineTo(r.at, r.to); } else { ctx.moveTo(r.from, r.at); ctx.lineTo(r.to, r.at); }
    ctx.stroke();
  }

  // GPS route along the grid to the objective.
  const route = game.route;
  if (route && route.length > 1) {
    ctx.strokeStyle = '#ffc21f';
    ctx.lineWidth = 9 / scale * s;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(route[0].x, route[0].z);
    for (const p of route) ctx.lineTo(p.x, p.z);
    ctx.stroke();
    const end = route[route.length - 1];
    blip(ctx, end.x, end.z, 9 / scale * s, '#ffc21f', '#14304f');
  }
  for (const car of game.cars) if (car !== game.vehicle) blip(ctx, car.x, car.z, 4.5 / scale * s, '#ffffff', '#14304f');
  ctx.restore();

  // Player arrow, always centred and pointing up.
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(yaw - (game.vehicle ? game.vehicle.heading : game.player.facing));
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#14304f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -12 * s); ctx.lineTo(9 * s, 10 * s); ctx.lineTo(0, 5 * s); ctx.lineTo(-9 * s, 10 * s); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.lineWidth = Math.max(2, 2 * s);
  ctx.strokeStyle = '#fff1d6';
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 22 * s);
  ctx.stroke();
  ctx.fillStyle = '#fff8ec';
  ctx.font = `800 ${Math.round(16 * s)}px "DejaVu Sans", Verdana, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('N', x + size / 2 + Math.sin(yaw) * size * 0.42, y + size / 2 - Math.cos(yaw) * size * 0.42 + 6 * s);
  ctx.textAlign = 'left';
}

function blip(ctx, x, z, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, z, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = r * 0.35; ctx.strokeStyle = stroke; ctx.stroke();
}

// A grid route: out to the nearest avenue, along it, then across to the goal.
export function planGridRoute(roads, from, to) {
  const nearest = (list, v) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  const ax = nearest(roads.nsRoads, from.x);
  const tz = nearest(roads.ewRoads, to.z);
  return [{ x: from.x, z: from.z }, { x: ax, z: from.z }, { x: ax, z: tz }, { x: to.x, z: tz }, { x: to.x, z: to.z }];
}
