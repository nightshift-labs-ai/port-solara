// Draws the HUD frame on the overlay canvas: objective banner (top-left), minimap with WANTED
// shields and cash (top-right), health/armour/weapon (bottom-left), speed arc (bottom-right) and
// the action prompt over its target. Sizes are given at 1280 px wide and scale with the window.
import { DISTRICT_TINT } from './menus-and-map.js';
export function drawHud(ctx, game, drawMinimap) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  // Slim HUD: type and padding run about 15% under the 1280 sizes so more street shows.
  const s = w / 1280 * HUD_SCALE;
  const mx = Math.round(w * 0.04), my = Math.round(h * 0.04);
  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';

  // Objective banner, or the mission panel while a story mission runs. Everything on the left
  // stacks under whatever height it takes, so nothing overlaps.
  const mission = game.missions?.panel();
  const bh = mission ? drawMissionPanel(ctx, mission, mx, my, s, game.time) : 92 * s;
  if (!mission) {
    const obj = game.objective;
    ctx.font = font(30 * s);
    const bw = Math.max(ctx.measureText(obj.title).width, (ctx.font = font(26 * s, 700), ctx.measureText(obj.detail).width)) + 44 * s;
    panel(ctx, mx, my, bw, bh);
    ctx.fillStyle = GOLD; ctx.font = font(30 * s);
    ctx.fillText(obj.title, mx + 22 * s, my + 38 * s);
    ctx.fillStyle = WHITE; ctx.font = font(26 * s, 700);
    ctx.fillText(obj.detail, mx + 22 * s, my + 74 * s);
  }

  // District title card under the banner: fades in on entering a district, out after CARD_SECONDS.
  const card = game.districtCard;
  const age = card ? game.time - card.at : Infinity;
  if (age < CARD_SECONDS) {
    ctx.globalAlpha = Math.min(1, age / 0.3, (CARD_SECONDS - age) / 0.6);
    ctx.font = font(38 * s);
    const cw = Math.max(ctx.measureText(card.name).width, (ctx.font = font(22 * s, 700), ctx.measureText(card.sub).width)) + 44 * s;
    const cy = my + bh + 12 * s;
    panel(ctx, mx, cy, cw, 86 * s);
    ctx.fillStyle = WHITE; ctx.font = font(38 * s);
    ctx.fillText(card.name, mx + 22 * s, cy + 44 * s);
    ctx.fillStyle = GOLD; ctx.font = font(22 * s, 700);
    ctx.fillText(card.sub, mx + 22 * s, cy + 74 * s);
    ctx.globalAlpha = 1;
  }

  // Event toasts (police events) under the WANTED panel on the right, newest on top. In a car only
  // those ending 8 units above the radio chip (or the speed panel) show.
  const toasts = (game.police ? game.police.events : []).filter((e) => game.time - e.at < TOAST_SECONDS).slice(-2).reverse();
  const toastY = my + 230 * s + 50 * s + 136 * s + 30 * s + 12 * s;
  const radio = game.radioNow?.();
  const toastEnd = game.vehicle ? h - my - (SPEED_H + (radio ? 64 : 0) + 8) * s : Infinity;
  toasts.forEach((e, i) => {
    if (toastY + (i * 52 + 44) * s > toastEnd) return;
    const age = game.time - e.at;
    ctx.globalAlpha = Math.min(1, age / 0.25, (TOAST_SECONDS - age) / 0.5);
    ctx.font = font(21 * s);
    const tw = ctx.measureText(e.text).width + 58 * s, tx = w - mx - tw, ty = toastY + i * 52 * s;
    panel(ctx, tx, ty, tw, 44 * s);
    ctx.fillStyle = Math.floor(game.time * 4) % 2 ? '#ff3b3b' : '#3b7bff';
    ctx.beginPath(); ctx.arc(tx + 24 * s, ty + 22 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = WHITE; ctx.fillText(e.text, tx + 42 * s, ty + 29 * s);
    ctx.globalAlpha = 1;
  });

  // SPD RESPONSE: the live units nearest first, call sign, distance and a coloured state tag.
  const units = game.police ? game.police.active.slice().sort((a, b) => a.dist - b.dist) : [];
  if (units.length) {
    const rows = units.slice(0, DISPATCH_ROWS), more = units.length - rows.length;
    const px = mx, py = my + bh + 114 * s, pw = 372 * s, ph = (48 + rows.length * 34 + (more > 0 ? 28 : 0)) * s;
    panel(ctx, px, py, pw, ph);
    ctx.fillStyle = GOLD; ctx.font = font(21 * s);
    ctx.fillText(`SPD RESPONSE · ${units.length} UNIT${units.length > 1 ? 'S' : ''}`, px + 16 * s, py + 31 * s);
    rows.forEach((u, i) => {
      const ry = py + (48 + i * 34) * s;
      ctx.fillStyle = WHITE; ctx.font = font(20 * s);
      ctx.fillText(u.call, px + 16 * s, ry + 22 * s);
      // A cruiser that fired in the last 1.2 s reads SHOOTING in place of PURSUIT.
      const tag = u.state === 'PURSUIT' && u.shootingFor > 0 ? 'SHOOTING' : u.state;
      const [bg, fg] = STATE_COLORS[tag] || STATE_COLORS.RESPONDING;
      ctx.font = font(15 * s);
      const tw = ctx.measureText(tag).width + 14 * s;
      // The distance sits right against the state tag, so a long tag never covers it.
      ctx.font = font(19 * s, 700); ctx.fillStyle = 'rgba(255,248,236,0.85)';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(u.dist)} m`, px + pw - 26 * s - tw, ry + 22 * s);
      ctx.textAlign = 'left';
      ctx.font = font(15 * s);
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(px + pw - 16 * s - tw, ry + 3 * s, tw, 24 * s, 6 * s); ctx.fill();
      if (tag === 'SHOOTING') { ctx.strokeStyle = SHOOTING_RIM; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = fg; ctx.fillText(tag, px + pw - 9 * s - tw, ry + 21 * s);
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
  // District plate: a chip in the district's colour and its name, shrunk to fit beside the chip.
  const plateY = mapY + size + 8 * s, did = game.districtAt(game.focus.x, game.focus.z);
  panel(ctx, mapX, plateY, size, 34 * s);
  ctx.fillStyle = DISTRICT_TINT[did] || '#c9c2b4'; ctx.strokeStyle = 'rgba(255,248,236,0.85)'; ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath(); ctx.roundRect(mapX + 14 * s, plateY + 11 * s, 12 * s, 12 * s, 3 * s); ctx.fill(); ctx.stroke();
  const dname = game.lore.districts[did] || '';
  let dpx = 21;
  ctx.font = font(dpx * s);
  while (dpx > 11 && ctx.measureText(dname).width > 184 * s) ctx.font = font(--dpx * s);
  ctx.fillStyle = WHITE; ctx.fillText(dname, mapX + 34 * s, plateY + 24 * s);
  const pipY = plateY + (34 + 8) * s;
  const tagRow = 30 * s; // always kept, so the clock has its own row with or without heat
  panel(ctx, mapX, pipY, size, 136 * s + tagRow);
  ctx.fillStyle = WHITE; ctx.font = font(21 * s);
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
  // Weekday and clock from the game's own time of day (one game minute per second of play).
  ctx.fillStyle = 'rgba(255,248,236,0.9)'; ctx.font = font(16 * s); ctx.textAlign = 'right';
  ctx.fillText(clockText(game), mapX + size - 14 * s, pipY + 29 * s);
  ctx.textAlign = 'left';

  // Health, armour, the weapon strip and REP (bottom-left).
  const arms = game.arms, wpn = arms?.weapon;
  drawVitalsPanel(ctx, game, mx, h - my, s);
  // Crosshair while aiming or firing on foot; the hit marker is four short gold ticks round it.
  if (arms && !game.vehicle && wpn.clip && (arms.aiming || arms.firing > 0)) {
    const cx = w / 2, cy = h / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2 * s;
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(cx + dx * 5 * s, cy + dy * 5 * s); ctx.lineTo(cx + dx * 12 * s, cy + dy * 12 * s); }
    ctx.stroke();
    if (arms.hitMarker > 0) {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3 * s; ctx.globalAlpha = Math.min(1, arms.hitMarker * 6);
      ctx.beginPath();
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(cx + dx * 8 * s, cy + dy * 8 * s); ctx.lineTo(cx + dx * 17 * s, cy + dy * 17 * s); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Radio chip over the speed panel: an animated level meter, the station, song and artist.
  if (radio) {
    ctx.font = font(17 * s, 700);
    const line = `${radio.song} — ${radio.artist}`;
    const rw = Math.max(ctx.measureText(line).width, (ctx.font = font(15 * s), ctx.measureText(radio.station).width)) + 64 * s;
    const rx = w - mx - rw, ry = h - my - (game.vehicle ? SPEED_H : 0) * s - 12 * s - 52 * s;
    panel(ctx, rx, ry, rw, 52 * s);
    ctx.fillStyle = radio.heat ? '#ff6b5b' : GOLD;
    for (let i = 0; i < 4; i++) {
      const lv = 0.35 + 0.65 * Math.abs(Math.sin(game.time * (3.1 + i * 1.7) + i));
      ctx.fillRect(rx + (14 + i * 7) * s, ry + (40 - 24 * lv) * s, 5 * s, 24 * lv * s);
    }
    ctx.font = font(15 * s); ctx.fillText(radio.station, rx + 50 * s, ry + 21 * s);
    ctx.fillStyle = WHITE; ctx.font = font(17 * s, 700); ctx.fillText(line, rx + 50 * s, ry + 42 * s);
  }

  // Mission subtitles, bottom centre, with the speaker's canvas portrait chip.
  const sub = game.missions?.subtitle;
  // It sits in the gap between the health panel and the speed panel, on their baseline.
  const gapL = mx + 434 * s, gapR = w - mx - (game.vehicle ? 244 : 0) * s;
  if (sub) drawSubtitle(ctx, sub, game.speakers?.[sub.who], (gapL + gapR) / 2, Math.min(560 * s, gapR - gapL), h - my, s);

  // Result card: JOB DONE with time, cash and REP, or JOB BLOWN with the reason.
  const res = game.missions?.resultCard();
  if (res) {
    ctx.globalAlpha = Math.min(1, res.age / 0.3, (6 - res.age) / 0.6);
    ctx.font = font(26 * s);
    const rowText = res.rows.join('   ·   ');
    const cw = Math.max(520 * s, ctx.measureText(rowText).width + 60 * s), cx = (w - cw) / 2, cy = h * 0.3;
    panel(ctx, cx, cy, cw, 168 * s);
    ctx.fillStyle = res.passed ? GOLD : '#ff6b5b';
    ctx.fillRect(cx + 2 * s, cy + 2 * s, cw - 4 * s, 8 * s);
    ctx.textAlign = 'center';
    ctx.font = font(60 * s); ctx.fillText(res.title, w / 2, cy + 76 * s);
    ctx.fillStyle = WHITE; ctx.font = font(22 * s); ctx.fillText(res.sub, w / 2, cy + 110 * s);
    ctx.fillStyle = res.passed ? '#9fe0a0' : 'rgba(255,248,236,0.85)'; ctx.font = font(26 * s);
    ctx.fillText(rowText, w / 2, cy + 148 * s);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }

  // Speed arc and car name, or nothing on foot.
  const car = game.vehicle;
  if (car) {
    const cx = w - mx - 110 * s, cy = h - my - 70 * s, r = 86 * s;
    const sx = w - mx - 230 * s, sy = h - my - SPEED_H * s;
    panel(ctx, sx, sy, 230 * s, SPEED_H * s);
    // CONDITION: the car's own health; amber where it smokes (under 45), red where it burns (under 22).
    const cond = Math.max(0, Math.min(100, Math.round(car.health)));
    ctx.font = font(14 * s); ctx.fillStyle = 'rgba(255,248,236,0.88)';
    ctx.fillText('CONDITION', sx + 16 * s, sy + 22 * s);
    ctx.font = font(15 * s); ctx.fillStyle = WHITE; ctx.textAlign = 'right';
    ctx.fillText(`${cond}%`, sx + 214 * s, sy + 22 * s);
    ctx.textAlign = 'left';
    bar(ctx, sx + 16 * s, sy + 27 * s, 198 * s, 9 * s, cond / 100, cond >= 45 ? '#5ad16a' : cond >= 22 ? '#e0a21f' : '#ff6b5b');
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
    let px = Math.max(mx, Math.min(w - mx - tw, p.x - tw / 2));
    const py = Math.max(my, p.y - 50 * s);
    // Never over the minimap / WANTED column: slide left beside it instead.
    const colLeft = w - mx - 240 * s;
    if (py < 488 * s && px + tw > colLeft) px = Math.max(mx, colLeft - tw - 8 * s);
    panel(ctx, px, py, tw, 42 * s);
    ctx.fillStyle = WHITE; ctx.fillText(p.text, px + 15 * s, py + 30 * s);
  }

  // Custody card: the screen fades to navy, the card holds, then fades back on the new spot.
  const cu = game.custody;
  if (cu) {
    const age = game.time - cu.at, hold = CUSTODY_FADE;
    const a = Math.max(0, Math.min(1, age / hold, (cu.end ?? 4.2) - age));
    ctx.fillStyle = `rgba(8, 18, 38, ${0.88 * a})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = WHITE; ctx.font = font(76 * s);
    ctx.fillText(cu.title, w / 2, h * 0.47);
    ctx.fillStyle = GOLD; ctx.font = font(28 * s);
    ctx.fillText(cu.sub, w / 2, h * 0.47 + 52 * s);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}

export const CUSTODY_FADE = 0.6;

export const CARD_SECONDS = 3.1; // fully shown for 2.5 s, then a 0.6 s fade
export const TOAST_SECONDS = 3.5;
export const DISPATCH_ROWS = 4;
// State tag colours [background, text].
export const STATE_COLORS = {
  PURSUIT: ['#d8323c', '#fff8ec'], RAMMING: ['#ff7a1a', '#14304f'], ROADBLOCK: ['#e0a21f', '#14304f'],
  SEARCHING: ['#3b7bff', '#fff8ec'], RESPONDING: ['#6b86a8', '#fff8ec'], LEAVING: ['#4a5566', '#fff8ec'],
  SHOOTING: ['#fff3d6', '#c8202c'],
};
const SHOOTING_RIM = '#d8323c'; // the SHOOTING tag's 2 px alarm-red rim
export const GOLD = '#ffc93c';
export const WHITE = '#fff8ec';
export const NAVY_GLASS = 'rgba(10, 20, 44, 0.8)';
export const OUTLINE = 'rgba(255, 241, 214, 0.38)';
export const HUD_SCALE = 0.85;
const SPEED_H = 186; // speed panel height in units (the top 36 hold CONDITION), its bottom on the HUD margin

export function font(px, weight = 800) { return `${weight} ${Math.round(px)}px "DejaVu Sans", Verdana, sans-serif`; }

// "FRI 17:26" from the game's clock (game.clockMinutes, minutes since the first Friday's 00:00).
export function clockText(game) {
  const c = game.lore.clock, total = Math.floor(game.clockMinutes()), m = ((total % 1440) + 1440) % 1440;
  const day = c.week[(((c.week.indexOf(c.weekday) + Math.floor(total / 1440)) % 7) + 7) % 7];
  return `${day} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Dark glass with a 1 px soft rim and a gold accent strip down the left edge.
export function panel(ctx, x, y, w, h) {
  const s = ctx.canvas.width / 1280;
  ctx.fillStyle = NAVY_GLASS;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 7 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.fillRect(x + 1, y + 6 * s, Math.max(2, 3 * s), Math.max(0, h - 12 * s));
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

// The bottom-left panel (420 x VITALS_HEIGHT units, its bottom on the HUD margin): HEALTH and
// ARMOUR rows across the top, then the weapon strip on the left and the REP column on the right.
export const VITALS_HEIGHT = 144;
const LOW_AMMO = '#ff6b5b';
function drawVitalsPanel(ctx, game, mx, bottom, s) {
  const by = bottom - VITALS_HEIGHT * s;
  panel(ctx, mx, by, 420 * s, VITALS_HEIGHT * s);
  const player = game.player;
  drawLabelledBar(ctx, 'HEALTH', player.health, mx, by + 15 * s, 14, '#5ad16a', s);
  drawLabelledBar(ctx, 'ARMOUR', player.armour, mx, by + 39 * s, 12, '#5fb7ff', s);
  if (game.arms) drawWeaponStrip(ctx, game.arms, mx + 16 * s, by + 60 * s, s);
  if (game.rankFor) drawRepColumn(ctx, game.rankFor(game.missions.rep), mx + 290 * s, by + 60 * s, s);
}

// One vitals row: the label on the left, the bar, and the value (out of 100) right-aligned.
function drawLabelledBar(ctx, label, value, x, y, barH, color, s) {
  const mid = y + barH * s / 2;
  ctx.font = font(14 * s); ctx.fillStyle = 'rgba(255,248,236,0.88)';
  ctx.fillText(label, x + 16 * s, mid + 5 * s);
  bar(ctx, x + 90 * s, y, 268 * s, barH * s, value / 100, color);
  ctx.font = font(15 * s); ctx.fillStyle = WHITE; ctx.textAlign = 'right';
  ctx.fillText(`${Math.max(0, Math.round(value))}`, x + 404 * s, mid + 5.5 * s);
  ctx.textAlign = 'left';
}

// One tile per slot, 4 apart, the strip 264 units wide whatever the slot count (tile width from
// it): a drawn pictogram, the slot number in the corner and the clip under it; the held tile is
// gold-rimmed. The held line under the strip, always left-aligned: "HORNET 30/150" or
// "BREAKER · RELOADING". A locked slot is dimmed with a padlock where its ammo would be.
const TILE = { h: 56, gap: 4, strip: 264 };
function drawWeaponStrip(ctx, arms, x, y, s) {
  const n = arms.slots.length, tw = (TILE.strip - TILE.gap * (n - 1)) / n;
  arms.slots.forEach((wd, i) => {
    const tx = x + i * (tw + TILE.gap) * s;
    drawWeaponTile(ctx, wd, arms.ammo[i], i, i === arms.slot, arms.locked.has(wd.id), tw, tx, y, s);
  });
  const held = arms.weapon, a = arms.clip;
  const reloading = held.clip && arms.reloading > 0;
  const label = reloading ? `${held.short} · RELOADING` : held.clip ? `${held.short} ${a.clip}/${a.reserve}` : held.short;
  ctx.font = font(15 * s);
  // Shrink a long line rather than let it reach the REP column (it ends before 248 units).
  const k = Math.min(1, 248 * s / ctx.measureText(label).width);
  if (k < 1) ctx.font = font(15 * s * k);
  ctx.fillStyle = reloading ? GOLD : WHITE;
  ctx.fillText(label, x, y + (TILE.h + 17) * s);
}

function drawWeaponTile(ctx, wd, ammo, i, held, locked, tw, x, y, s) {
  const w = tw * s, h = TILE.h * s;
  ctx.save();
  if (locked) ctx.globalAlpha = 0.42;
  ctx.fillStyle = held ? 'rgba(255,201,60,0.2)' : 'rgba(255,248,236,0.09)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6 * s); ctx.fill();
  ctx.strokeStyle = held ? GOLD : 'rgba(255,248,236,0.28)';
  ctx.lineWidth = (held ? 2.4 : 1.2) * s;
  ctx.stroke();
  // Slot number, top-left.
  ctx.font = font(12 * s); ctx.fillStyle = held ? GOLD : 'rgba(255,248,236,0.8)';
  ctx.fillText(`${i + 1}`, x + 6 * s, y + 13 * s);
  // The pictogram under and right of the slot number, shrunk to the tile when the strip holds many slots.
  const k = Math.min(1, (tw - 14) / 44);
  drawWeaponPictogram(ctx, wd.id, x + w / 2 + 3 * s, y + 25 * s, s * k, held ? GOLD : WHITE);
  ctx.textAlign = 'center';
  if (locked) {
    // No ammo on a locked slot; the padlock goes on at full strength after the dimmed tile.
  } else if (!wd.clip) {
    ctx.font = font(22 * s); ctx.fillStyle = WHITE;
    ctx.fillText('∞', x + w / 2, y + 51 * s);
  } else {
    ctx.font = font(17 * s); ctx.fillStyle = ammo.clip <= Math.min(3, wd.clip / 3) ? LOW_AMMO : WHITE;
    ctx.fillText(`${ammo.clip}`, x + w / 2, y + 50 * s);
  }
  ctx.restore();
  ctx.textAlign = 'left';
  if (locked) drawLockMark(ctx, x + w / 2, y + 43 * s, s);
}

// Our own flat pictograms in a 44 x 24 unit box round (cx, cy): a side-on fist, the Wasp pistol,
// the compact Hornet SMG, the Breaker pump gun and the scoped Gannet rifle, all facing right.
// Dark seams pick out fingers and parts.
function drawWeaponPictogram(ctx, id, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(10,20,44,0.85)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath();
  if (id === 'fists') {
    ctx.roundRect(-19, -5, 8, 12, 2); // cuff
    ctx.roundRect(-11, -10, 24, 19, 6); // knuckles and back of the hand
    ctx.fill();
    ctx.beginPath();
    for (const fx of [-3, 3, 9]) { ctx.moveTo(fx, -9); ctx.lineTo(fx, -2); } // finger seams
    ctx.moveTo(-9, 2); ctx.quadraticCurveTo(0, 0, 8, 3); // the thumb across the fingers
    ctx.stroke();
  } else if (id === 'wasp') {
    ctx.rect(-17, -10, 36, 8); // slide
    ctx.moveTo(-15, -2); ctx.lineTo(-5, -2); ctx.lineTo(-8, 11); ctx.lineTo(-18, 11); ctx.closePath(); // grip
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, -1); ctx.quadraticCurveTo(-4, 6, 4, -1); // trigger guard
    ctx.moveTo(-12, -7); ctx.lineTo(10, -7); // slide line
    ctx.stroke();
  } else if (id === 'hornet') {
    ctx.rect(-14, -8, 30, 9); // receiver
    ctx.rect(16, -6, 7, 4); // barrel
    ctx.rect(-22, -7, 8, 5); // folded stock
    ctx.moveTo(-10, 1); ctx.lineTo(-4, 1); ctx.lineTo(-7, 10); ctx.lineTo(-13, 10); ctx.closePath(); // grip
    ctx.rect(2, 1, 5, 11); // straight magazine
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, -4); ctx.lineTo(12, -4); // receiver seam
    ctx.stroke();
  } else if (id === 'breaker') {
    // A long pump gun: sloped stock, short receiver, long barrel over the tube, the grooved pump.
    ctx.moveTo(-23, -2); ctx.lineTo(-12, -6); ctx.lineTo(-12, 1); ctx.lineTo(-22, 6); ctx.closePath(); // stock
    ctx.rect(-12, -7, 12, 8); // receiver
    ctx.rect(0, -6, 23, 3); // barrel
    ctx.rect(0, -3, 19, 3); // tube
    ctx.roundRect(4, -4, 10, 6, 2); // pump
    ctx.moveTo(-9, 1); ctx.lineTo(-4, 1); ctx.lineTo(-6, 8); ctx.lineTo(-11, 8); ctx.closePath(); // grip
    ctx.fill();
    ctx.beginPath();
    for (const gx of [7, 10]) { ctx.moveTo(gx, -3); ctx.lineTo(gx, 1); } // pump grooves
    ctx.moveTo(-10, -3); ctx.lineTo(-2, -3); // ejection port
    ctx.stroke();
  } else if (id === 'gannet') {
    // A long rifle: thumbhole stock, slim receiver, a scope on top and the thin barrel to the edge.
    ctx.moveTo(-23, -3); ctx.lineTo(-10, -3); ctx.lineTo(-8, 3); ctx.lineTo(-13, 3); ctx.lineTo(-23, 6); ctx.closePath(); // stock
    ctx.rect(-10, -3, 16, 5); // receiver and fore-end
    ctx.rect(6, -2, 17, 2); // barrel
    ctx.roundRect(-8, -9, 13, 4, 2); // scope
    ctx.rect(-5, -6, 2, 3); ctx.rect(1, -6, 2, 3); // scope mounts
    ctx.rect(-4, 2, 4, 5); // box magazine
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, 1); ctx.lineTo(5, 1); // stock seam
    ctx.stroke();
  }
  ctx.restore();
}

// A small padlock (shackle and body) for a locked slot.
function drawLockMark(ctx, cx, cy, s) {
  ctx.save();
  ctx.strokeStyle = WHITE; ctx.fillStyle = WHITE; ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.arc(cx, cy - 1 * s, 4 * s, Math.PI, 0); ctx.stroke();
  ctx.fillRect(cx - 6 * s, cy - 1 * s, 12 * s, 9 * s);
  ctx.restore();
}

// REP in the right column (114 units wide): "REP 4", the rank name (shrunk to fit), its bar.
function drawRepColumn(ctx, r, x, y, s) {
  ctx.font = font(17 * s); ctx.fillStyle = GOLD;
  ctx.fillText(`REP ${r.rank}`, x, y + 17 * s);
  let px = 15;
  ctx.font = font(px * s);
  while (px > 11 && ctx.measureText(r.name).width > 114 * s) ctx.font = font(--px * s);
  ctx.fillStyle = WHITE;
  ctx.fillText(r.name, x, y + 38 * s);
  bar(ctx, x, y + 47 * s, 114 * s, 7 * s, r.frac, GOLD);
}

// The mission panel: "MISSION 3/5 · THE HARBOR RUN", the objective with live distance, a stage
// bar with "STAGE 2/4", the step timer on the right when it has one, and the NEXT line. Returns
// its height so the panels under it can stack.
function drawMissionPanel(ctx, m, x, y, s, time) {
  const h = 150 * s;
  ctx.font = font(26 * s, 700);
  const ow = ctx.measureText(m.objective).width;
  ctx.font = font(22 * s);
  const w = Math.max(560 * s, ctx.measureText(m.header).width + 44 * s, ow + 44 * s);
  panel(ctx, x, y, w, h);
  ctx.fillStyle = GOLD; ctx.fillText(m.header, x + 22 * s, y + 32 * s);
  ctx.fillStyle = WHITE; ctx.font = font(26 * s, 700);
  ctx.fillText(m.objective, x + 22 * s, y + 68 * s);
  const timerW = m.timer != null ? 92 * s : 0;
  ctx.font = font(15 * s);
  const stage = `STAGE ${m.stage}/${m.stages}`;
  const sw = ctx.measureText(stage).width;
  ctx.fillStyle = 'rgba(255,248,236,0.85)';
  ctx.fillText(stage, x + 22 * s, y + 98 * s);
  bar(ctx, x + 34 * s + sw, y + 87 * s, w - 56 * s - sw - timerW, 12 * s, (m.stage - 1) / m.stages, GOLD);
  if (m.timer != null) {
    const t = Math.ceil(m.timer);
    ctx.font = font(22 * s); ctx.textAlign = 'right';
    ctx.fillStyle = t <= 10 && Math.floor(time * 2) % 2 ? '#ff6b5b' : WHITE;
    ctx.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, x + w - 22 * s, y + 100 * s);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = 'rgba(255,248,236,0.72)'; ctx.font = font(19 * s, 700);
  ctx.fillText(m.next, x + 22 * s, y + 134 * s);
  return h;
}

// A subtitle panel centred on cx within `room` px, bottom at `bottom`: portrait chip, gold speaker
// name, the line wrapped to fit so it never reaches the side panels.
function drawSubtitle(ctx, line, who, cx, room, bottom, s) {
  const maxW = room - 110 * s;
  ctx.font = font(21 * s, 700);
  const words = line.text.split(' '), rows = [''];
  for (const word of words) {
    const tryRow = rows[rows.length - 1] ? rows[rows.length - 1] + ' ' + word : word;
    if (ctx.measureText(tryRow).width > maxW && rows[rows.length - 1]) rows.push(word); else rows[rows.length - 1] = tryRow;
  }
  const textW = Math.max(...rows.map((r) => ctx.measureText(r).width));
  const pw = textW + 110 * s, ph = (44 + rows.length * 26) * s, px = cx - pw / 2, py = bottom - ph;
  panel(ctx, px, py, pw, ph);
  drawPortrait(ctx, who, px + 12 * s, py + 12 * s, 66 * s);
  ctx.fillStyle = GOLD; ctx.font = font(16 * s);
  ctx.fillText(who ? who.name : line.who, px + 92 * s, py + 30 * s);
  ctx.fillStyle = WHITE; ctx.font = font(21 * s, 700);
  rows.forEach((r, i) => ctx.fillText(r, px + 92 * s, py + (56 + i * 26) * s));
}

// A flat canvas face: accent backdrop, shoulders, skin oval, hair, eyes. Mara wears her hair up,
// Ilse a teal bandana, Roarke an SPD cap with a gold badge.
function drawPortrait(ctx, who, x, y, size) {
  const p = who || { skin: '#c99272', hair: '#333', accent: '#445' };
  const c = size / 2;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, size, size, size * 0.18); ctx.clip();
  ctx.fillStyle = p.accent; ctx.fillRect(x, y, size, size);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, size, size * 0.45);
  ctx.fillStyle = p.name === 'CMDR. ROARKE' ? '#14304f' : '#f4efe4';
  ctx.beginPath(); ctx.ellipse(x + c, y + size * 1.02, size * 0.42, size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.skin;
  ctx.fillRect(x + c - size * 0.08, y + size * 0.6, size * 0.16, size * 0.16);
  ctx.beginPath(); ctx.ellipse(x + c, y + size * 0.47, size * 0.21, size * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.hair;
  if (p.name === 'MARA QUIST') {
    ctx.beginPath(); ctx.ellipse(x + c, y + size * 0.3, size * 0.23, size * 0.12, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(x + c, y + size * 0.13, size * 0.1, 0, Math.PI * 2); ctx.fill();
  } else if (p.name === 'ILSE VARGA') {
    ctx.beginPath(); ctx.ellipse(x + c, y + size * 0.42, size * 0.25, size * 0.26, 0, Math.PI * 0.9, Math.PI * 2.1, true); ctx.fill();
    ctx.fillStyle = '#1aa39a'; ctx.fillRect(x + c - size * 0.24, y + size * 0.23, size * 0.48, size * 0.09);
  } else if (p.name === 'AUGUSTIN PELL') {
    // Swept-back silver hair, a black suit collar and the Gilded Hand's gold pin.
    ctx.beginPath(); ctx.ellipse(x + c, y + size * 0.3, size * 0.23, size * 0.11, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(x + c - size * 0.23, y + size * 0.3, size * 0.05, size * 0.12); ctx.fillRect(x + c + size * 0.18, y + size * 0.3, size * 0.05, size * 0.12);
    ctx.fillStyle = '#15171c';
    ctx.beginPath(); ctx.ellipse(x + c, y + size * 1.02, size * 0.42, size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4efe4'; ctx.beginPath(); ctx.moveTo(x + c - size * 0.08, y + size * 0.74); ctx.lineTo(x + c + size * 0.08, y + size * 0.74); ctx.lineTo(x + c, y + size * 0.9); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(x + c - size * 0.22, y + size * 0.86, size * 0.045, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#14304f';
    ctx.fillRect(x + c - size * 0.25, y + size * 0.17, size * 0.5, size * 0.13);
    ctx.fillRect(x + c - size * 0.3, y + size * 0.28, size * 0.6, size * 0.05);
    ctx.fillStyle = '#ffc93c'; ctx.beginPath(); ctx.arc(x + c, y + size * 0.23, size * 0.045, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#1b1f2a';
  ctx.fillRect(x + c - size * 0.11, y + size * 0.46, size * 0.05, size * 0.04);
  ctx.fillRect(x + c + size * 0.06, y + size * 0.46, size * 0.05, size * 0.04);
  ctx.fillStyle = '#8a3b33'; ctx.fillRect(x + c - size * 0.06, y + size * 0.6, size * 0.12, size * 0.025);
  ctx.restore();
  ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE;
  ctx.beginPath(); ctx.roundRect(x, y, size, size, size * 0.18); ctx.stroke();
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
