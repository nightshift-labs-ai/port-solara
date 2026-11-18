// Draws the HUD frame on the overlay canvas: objective banner (top-left), minimap with WANTED
// shields and cash (top-right), health/armour/weapon (bottom-left), speed arc (bottom-right) and
// the action prompt over its target. Sizes are given at 1280 px wide and scale with the window.
export function drawHud(ctx, game, drawMinimap) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const s = w / 1280;
  const mx = Math.round(w * 0.04), my = Math.round(h * 0.04);
  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';

  // Objective banner.
  const obj = game.objective;
  ctx.font = font(30 * s);
  const bw = Math.max(ctx.measureText(obj.title).width, (ctx.font = font(26 * s, 700), ctx.measureText(obj.detail).width)) + 44 * s;
  panel(ctx, mx, my, bw, 92 * s);
  ctx.fillStyle = GOLD; ctx.font = font(30 * s);
  ctx.fillText(obj.title, mx + 22 * s, my + 38 * s);
  ctx.fillStyle = WHITE; ctx.font = font(26 * s, 700);
  ctx.fillText(obj.detail, mx + 22 * s, my + 74 * s);

  // District title card under the banner: fades in on entering a district, out after CARD_SECONDS.
  const card = game.districtCard;
  const age = card ? game.time - card.at : Infinity;
  if (age < CARD_SECONDS) {
    ctx.globalAlpha = Math.min(1, age / 0.3, (CARD_SECONDS - age) / 0.6);
    ctx.font = font(38 * s);
    const cw = Math.max(ctx.measureText(card.name).width, (ctx.font = font(22 * s, 700), ctx.measureText(card.sub).width)) + 44 * s;
    const cy = my + 104 * s;
    panel(ctx, mx, cy, cw, 86 * s);
    ctx.fillStyle = GOLD; ctx.font = font(22 * s, 700);
    ctx.fillText(card.sub, mx + 22 * s, cy + 30 * s);
    ctx.fillStyle = WHITE; ctx.font = font(38 * s);
    ctx.fillText(card.name, mx + 22 * s, cy + 72 * s);
    ctx.globalAlpha = 1;
  }

  // SPD RESPONSE: the live units nearest first, call sign, distance and a coloured state tag.
  const units = game.police ? game.police.active.slice().sort((a, b) => a.dist - b.dist) : [];
  if (units.length) {
    const rows = units.slice(0, DISPATCH_ROWS), more = units.length - rows.length;
    const px = mx, py = my + 206 * s, pw = 356 * s, ph = (48 + rows.length * 34 + (more > 0 ? 28 : 0)) * s;
    panel(ctx, px, py, pw, ph);
    ctx.fillStyle = GOLD; ctx.font = font(21 * s);
    ctx.fillText(`SPD RESPONSE · ${units.length} UNIT${units.length > 1 ? 'S' : ''}`, px + 16 * s, py + 31 * s);
    rows.forEach((u, i) => {
      const ry = py + (48 + i * 34) * s;
      ctx.fillStyle = WHITE; ctx.font = font(20 * s);
      ctx.fillText(u.call, px + 16 * s, ry + 22 * s);
      ctx.font = font(19 * s, 700); ctx.fillStyle = 'rgba(255,248,236,0.85)';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(u.dist)} m`, px + 196 * s, ry + 22 * s);
      ctx.textAlign = 'left';
      const [bg, fg] = STATE_COLORS[u.state] || STATE_COLORS.RESPONDING;
      ctx.font = font(15 * s);
      const tw = ctx.measureText(u.state).width + 14 * s;
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(px + pw - 16 * s - tw, ry + 3 * s, tw, 24 * s, 6 * s); ctx.fill();
      ctx.fillStyle = fg; ctx.fillText(u.state, px + pw - 9 * s - tw, ry + 21 * s);
    });
    if (more > 0) {
      ctx.fillStyle = 'rgba(255,248,236,0.8)'; ctx.font = font(17 * s, 700);
      ctx.fillText(`+${more} more unit${more > 1 ? 's' : ''} in the search zone`, px + 16 * s, py + ph - 12 * s);
    }
  }

  // Minimap, WANTED shields and cash.
  const size = 230 * s;
  const mapX = w - mx - size, mapY = my;
  drawMinimap(ctx, game, mapX, mapY, size);
  const pipY = mapY + size + 12 * s;
  const tagRow = game.wantedLevel?.pips > 0 ? 30 * s : 0;
  panel(ctx, mapX, pipY, size, 136 * s + tagRow);
  ctx.fillStyle = WHITE; ctx.font = font(24 * s);
  ctx.fillText('WANTED', mapX + 14 * s, pipY + 30 * s);
  // IN SIGHT (red) while a cop sees Wren, SEARCHING (amber) with the escape countdown otherwise.
  const wl = game.wantedLevel;
  if (wl && wl.pips > 0) {
    const seen = wl.inSight;
    const tag = seen ? 'IN SIGHT' : `SEARCHING ${Math.ceil(wl.escapeLeft)}s`;
    ctx.font = font(15 * s);
    const tw = ctx.measureText(tag).width + 14 * s;
    const tx = mapX + 14 * s, ty = pipY + 86 * s;
    ctx.fillStyle = seen ? '#d8323c' : '#e0a21f';
    ctx.beginPath(); ctx.roundRect(tx, ty, tw, 24 * s, 6 * s); ctx.fill();
    ctx.fillStyle = seen ? WHITE : '#14304f';
    ctx.fillText(tag, tx + 7 * s, ty + 18 * s);
    ctx.font = font(24 * s);
  }
  for (let i = 0; i < 5; i++) shield(ctx, mapX + 14 * s + i * 42 * s, pipY + 40 * s, 38 * s, i < game.wanted, game.time);
  ctx.fillStyle = '#9fe0a0'; ctx.font = font(28 * s);
  ctx.fillText('$' + game.cash.toLocaleString('en-US'), mapX + 14 * s, pipY + 122 * s + tagRow);

  // Health, armour and weapon.
  const by = h - my - 96 * s;
  panel(ctx, mx, by, 420 * s, 96 * s);
  const player = game.player;
  bar(ctx, mx + 16 * s, by + 16 * s, 388 * s, 16 * s, player.health / 100, '#5ad16a');
  bar(ctx, mx + 16 * s, by + 40 * s, 388 * s, 12 * s, player.armour / 100, '#5fb7ff');
  ctx.fillStyle = WHITE; ctx.font = font(26 * s);
  ctx.fillText('FISTS', mx + 16 * s, by + 84 * s);
  ctx.fillStyle = GOLD; ctx.textAlign = 'right';
  ctx.fillText(game.districtName, mx + 404 * s, by + 84 * s);
  ctx.textAlign = 'left';

  // Speed arc and car name, or nothing on foot.
  const car = game.vehicle;
  if (car) {
    const cx = w - mx - 110 * s, cy = h - my - 70 * s, r = 86 * s;
    panel(ctx, w - mx - 230 * s, h - my - 150 * s, 230 * s, 150 * s);
    const kmh = Math.round(Math.abs(car.speed) * 3.6);
    const frac = Math.min(1, kmh / 240);
    ctx.lineCap = 'round';
    ctx.lineWidth = 12 * s; ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(cx, cy + 20 * s, r * 0.82, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.beginPath(); ctx.arc(cx, cy + 20 * s, r * 0.82, Math.PI * 1.1, Math.PI * (1.1 + 0.8 * frac)); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = WHITE; ctx.font = font(44 * s);
    ctx.fillText(String(kmh), cx, cy + 14 * s);
    ctx.font = font(20 * s); ctx.fillText('KM/H', cx, cy + 38 * s);
    ctx.fillStyle = GOLD; ctx.font = font(24 * s);
    ctx.fillText(car.name, cx, cy + 64 * s);
    ctx.textAlign = 'left';
  }

  // The context prompt floats over its target.
  if (game.prompt) {
    const p = game.prompt;
    ctx.font = font(26 * s);
    const tw = ctx.measureText(p.text).width + 30 * s;
    const px = Math.max(mx, Math.min(w - mx - tw, p.x - tw / 2)), py = Math.max(my, p.y - 50 * s);
    panel(ctx, px, py, tw, 42 * s);
    ctx.fillStyle = WHITE; ctx.fillText(p.text, px + 15 * s, py + 30 * s);
  }
}

export const CARD_SECONDS = 4.5;
export const DISPATCH_ROWS = 4;
// State tag colours [background, text].
export const STATE_COLORS = {
  PURSUIT: ['#d8323c', '#fff8ec'], RAMMING: ['#ff7a1a', '#14304f'], ROADBLOCK: ['#e0a21f', '#14304f'],
  SEARCHING: ['#3b7bff', '#fff8ec'], RESPONDING: ['#6b86a8', '#fff8ec'], LEAVING: ['#4a5566', '#fff8ec'],
};
export const GOLD = '#ffc93c';
export const WHITE = '#fff8ec';
export const NAVY_GLASS = 'rgba(14, 30, 60, 0.65)';
export const OUTLINE = '#fff1d6';

export function font(px, weight = 800) { return `${weight} ${Math.round(px)}px "DejaVu Sans", Verdana, sans-serif`; }

export function panel(ctx, x, y, w, h) {
  const s = ctx.canvas.width / 1280;
  ctx.fillStyle = NAVY_GLASS;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(2, 2 * s);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10 * s);
  ctx.fill();
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

// A police shield pip: dark when unlit, pulsing red/blue when lit.
function shield(ctx, x, y, size, lit, time) {
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y);
  ctx.lineTo(x + size, y + size * 0.16);
  ctx.lineTo(x + size * 0.92, y + size * 0.62);
  ctx.lineTo(x + size / 2, y + size * 1.0);
  ctx.lineTo(x + size * 0.08, y + size * 0.62);
  ctx.lineTo(x, y + size * 0.16);
  ctx.closePath();
  ctx.fillStyle = lit ? (Math.floor(time * 4) % 2 ? '#ff3b3b' : '#3b7bff') : 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = lit ? WHITE : 'rgba(255,241,214,0.55)';
  ctx.stroke();
}
