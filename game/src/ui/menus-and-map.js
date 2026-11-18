import { districtAt, LANDMARKS } from '../world/city-builder.js';
import { nearestNode } from '../police/police-ai.js';
import { latestSave, continueLabel } from '../core/save-slots.js';

const FONT = '"DejaVu Sans", Verdana, sans-serif';

// The places on the Tab map besides the story rings, snapped to the nearest road crossing so a
// marker always sits on a street Wren can reach.
const SPOT_PLAN = [
  { id: 'safehouse', name: 'CALLOWAY SALVAGE', note: 'safehouse · save', x: 30, z: 250, mark: 'H', fill: '#3fae6a' },
  { id: 'quist', name: 'QUIST AUTO', note: 'sell stolen cars', x: LANDMARKS.quist.x, z: LANDMARKS.quist.z + 30, mark: '$', fill: '#f2b134' },
  { id: 'guns', name: 'BRASS & BARREL', note: 'gun shop', x: 110, z: -10, mark: 'G', fill: '#c2412d' },
  { id: 'spd', name: 'SPD STATION', note: 'Solara Police Dept.', x: 60, z: -140, mark: 'P', fill: '#3b7bff' },
  { id: 'respray', name: 'PELICAN FUEL', note: 'respray $500', x: -150, z: 120, mark: 'R', fill: '#e07a2f' },
  { id: 'race1', name: 'RING ROAD RACE', note: 'race', x: -160, z: -200, mark: 'F', fill: '#14304f', race: 1 },
  { id: 'race2', name: 'RING ROAD RACE', note: 'race', x: 200, z: -120, mark: 'F', fill: '#14304f', race: 2 },
  { id: 'race3', name: 'RING ROAD RACE', note: 'race', x: 220, z: 160, mark: 'F', fill: '#14304f', race: 3 },
  { id: 'race4', name: 'RING ROAD RACE', note: 'race', x: -200, z: 60, mark: 'F', fill: '#14304f', race: 4 },
];

// District names move off the story rings that sit near their middles (metres).
const LABEL_NUDGE = { mercado: [-30, 75], coral: [0, 25], lantern: [40, 30] };

export function citySpots(game) {
  if (!game.spots) {
    game.spots = SPOT_PLAN.map((p) => {
      const n = nearestNode(game.roads.nodes, p.x, p.z);
      return { ...p, x: n.x, z: n.z };
    });
  }
  return game.spots;
}

// Esc pauses (RESUME, MAP, SETTINGS, SAVE, QUIT TO TITLE); Tab opens the full map. Both freeze the
// fixed step, release held keys and draw one overlay canvas: the city map and the side panel.
export function installPauseAndMap(game) {
  const root = document.getElementById('pause-map');
  const canvas = document.createElement('canvas');
  canvas.className = 'pause-canvas';
  root.replaceChildren(canvas);
  const items = [
    { label: 'RESUME', run: () => close() },
    { label: 'MAP', run: () => { pause.view = 'map'; draw(); } },
    { label: 'SETTINGS', run: () => { pause.view = 'settings'; pause.row = 0; pause.note = ''; draw(); } },
    { label: 'SAVE', run: () => { pause.note = game.saveGame ? game.saveGame('Pause menu') : 'Saving is not ready yet'; draw(); } },
    { label: 'QUIT TO TITLE', run: () => { close(false); game.quitToTitle?.(); } },
  ];
  const pause = { view: 'menu', active: 0, note: '', rects: [], relock: false };
  game.pause = pause;

  const open = (view) => {
    if (game.mode !== 'play') return;
    game.mode = 'paused';
    pause.view = view; pause.active = 0; pause.note = '';
    pause.relock = !!game.input.pointerLocked;
    game.input.held.clear();
    if (document.pointerLockElement) document.exitPointerLock?.();
    root.hidden = false;
    draw();
  };
  const close = (relock = true) => {
    if (game.mode !== 'paused') return;
    game.mode = 'play';
    root.hidden = true;
    game.input.held.clear();
    if (relock && pause.relock) game.renderer.domElement.requestPointerLock?.();
  };
  const draw = () => {
    canvas.width = innerWidth; canvas.height = innerHeight;
    drawPauseScreen(canvas.getContext('2d'), game, pause, items);
  };
  game.openPause = open; game.closePause = close; game.drawPause = draw;

  addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    if (game.mode === 'play') {
      if (e.code === 'Escape' || e.code === 'KeyP') open('menu');
      else if (e.code === 'Tab' || e.code === 'KeyM') open('map');
      return;
    }
    if (game.mode !== 'paused') return;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (pause.view !== 'menu') { pause.view = 'menu'; draw(); } else close(); return; }
    if (e.code === 'Tab' || e.code === 'KeyM') { if (pause.view === 'map') close(); else { pause.view = 'map'; draw(); } return; }
    if (pause.view === 'settings') {
      const n = SETTING_ROWS.length + 1;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') pause.row = (pause.row + 1) % n;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') pause.row = (pause.row + n - 1) % n;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') stepSetting(game, pause.row, -1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') stepSetting(game, pause.row, 1);
      if ((e.code === 'Enter' || e.code === 'Space') && pause.row === SETTING_ROWS.length) pause.view = 'menu';
      draw();
      return;
    }
    if (pause.view !== 'menu') return;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { pause.active = (pause.active + 1) % items.length; draw(); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { pause.active = (pause.active + items.length - 1) % items.length; draw(); }
    if (e.code === 'Enter' || e.code === 'Space') items[pause.active].run();
  });
  // A real browser eats the Esc that ends pointer lock, so losing the lock in play pauses too.
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && game.mode === 'play') open('menu');
  });
  canvas.addEventListener('click', (e) => {
    const hit = pause.rects.findIndex((r) => e.offsetX >= r.x && e.offsetX <= r.x + r.w && e.offsetY >= r.y && e.offsetY <= r.y + r.h);
    if (hit < 0) return;
    if (pause.view === 'settings') {
      // A click on a row's left half lowers it, on the right half raises it; BACK returns.
      const r = pause.rects[hit];
      pause.row = hit;
      if (hit === SETTING_ROWS.length) pause.view = 'menu';
      else stepSetting(game, hit, e.offsetX < r.x + r.w / 2 ? -1 : 1);
      draw();
      return;
    }
    pause.active = hit; items[hit].run();
  });
  addEventListener('resize', () => { if (game.mode === 'paused') draw(); });
}

// The SETTINGS rows: volumes step by 1 (0-10), sensitivity by 0.1 (0.5-2.0), graphics flips.
export const SETTING_ROWS = [
  { key: 'master', label: 'MASTER VOLUME', min: 0, max: 10, step: 1 },
  { key: 'music', label: 'MUSIC / RADIO', min: 0, max: 10, step: 1 },
  { key: 'effects', label: 'EFFECTS', min: 0, max: 10, step: 1 },
  { key: 'sensitivity', label: 'MOUSE SENSITIVITY', min: 0.5, max: 2, step: 0.1 },
  { key: 'graphics', label: 'GRAPHICS', options: ['low', 'high'] },
];

export function stepSetting(game, row, dir) {
  const r = SETTING_ROWS[row];
  if (!r || !game.changeSetting) return;
  const now = game.settings[r.key];
  if (r.options) game.changeSetting(r.key, r.options[(r.options.indexOf(now) + dir + r.options.length) % r.options.length]);
  else game.changeSetting(r.key, Math.round(Math.min(r.max, Math.max(r.min, now + dir * r.step)) * 10) / 10);
}

function settingText(r, v) {
  if (r.options) return v === 'high' ? 'HIGH · shadows, 480 m' : 'LOW · no shadows, 300 m';
  if (r.key === 'sensitivity') return `${v.toFixed(1)}x`;
  return `${'|'.repeat(v)}${'·'.repeat(10 - v)} ${v}`;
}

function drawSettings(ctx, game, pause, rect, s) {
  ctx.fillStyle = '#fff8ec';
  ctx.font = `900 ${Math.round(48 * s)}px ${FONT}`;
  ctx.fillText('SETTINGS', rect.x + 48 * s, rect.y + 96 * s);
  const rows = [...SETTING_ROWS, { label: 'BACK' }];
  rows.forEach((r, i) => {
    const y = rect.y + (140 + i * 62) * s, x = rect.x + 40 * s, w = Math.min(rect.w - 80 * s, 720 * s), h = 50 * s, active = i === pause.row;
    ctx.fillStyle = active ? 'rgba(255, 201, 60, 0.18)' : 'rgba(20, 48, 79, 0.75)';
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 3 * s; ctx.strokeStyle = active ? '#ffc93c' : 'rgba(255, 248, 236, 0.4)';
    ctx.strokeRect(x, y, w, h);
    ctx.font = `800 ${Math.round(26 * s)}px ${FONT}`;
    ctx.fillStyle = active ? '#ffc93c' : '#fff8ec';
    ctx.fillText(r.label, x + 20 * s, y + 35 * s);
    if (r.key) {
      ctx.font = `700 ${Math.round(24 * s)}px ${FONT}`;
      const t = `‹ ${settingText(r, game.settings[r.key])} ›`;
      ctx.fillText(t, x + w - ctx.measureText(t).width - 20 * s, y + 35 * s);
    }
    pause.rects.push({ x, y, w, h });
  });
  ctx.font = `700 ${Math.round(18 * s)}px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 248, 236, 0.8)';
  ctx.fillText('ARROWS CHANGE · ESC BACK · SAVED WITH YOUR GAME', rect.x + 44 * s, rect.y + rect.h - 28 * s);
}

// The overlay: in MAP view the city map fills the left and the side panel the right; in MENU view
// the map dims behind the pause list.
export function drawPauseScreen(ctx, game, pause, items) {
  const W = ctx.canvas.width, H = ctx.canvas.height, s = H / 800;
  const panelW = Math.round(360 * s), pad = Math.round(22 * s);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10, 26, 44, 0.86)';
  ctx.fillRect(0, 0, W, H);
  const mapRect = { x: pad, y: pad, w: W - panelW - pad * 3, h: H - pad * 2 };
  drawCityMap(ctx, game, mapRect, s);
  drawSidePanel(ctx, game, { x: W - panelW - pad, y: pad, w: panelW, h: H - pad * 2 }, s);
  pause.rects = [];
  if (pause.view === 'settings') {
    ctx.fillStyle = 'rgba(10, 26, 44, 0.8)';
    ctx.fillRect(mapRect.x, mapRect.y, mapRect.w, mapRect.h);
    drawSettings(ctx, game, pause, mapRect, s);
  } else if (pause.view === 'menu') {
    ctx.fillStyle = 'rgba(10, 26, 44, 0.72)';
    ctx.fillRect(mapRect.x, mapRect.y, mapRect.w, mapRect.h);
    ctx.fillStyle = '#fff8ec';
    ctx.font = `900 ${Math.round(56 * s)}px ${FONT}`;
    ctx.fillText('PAUSED', mapRect.x + 48 * s, mapRect.y + 110 * s);
    items.forEach((it, i) => {
      const y = mapRect.y + (170 + i * 66) * s, active = i === pause.active;
      ctx.font = `800 ${Math.round(32 * s)}px ${FONT}`;
      const w = ctx.measureText(it.label).width + 44 * s, h = 52 * s, x = mapRect.x + 40 * s;
      ctx.fillStyle = active ? 'rgba(255, 201, 60, 0.18)' : 'rgba(20, 48, 79, 0.75)';
      ctx.fillRect(x, y, w, h);
      ctx.lineWidth = 3 * s; ctx.strokeStyle = active ? '#ffc93c' : 'rgba(255, 248, 236, 0.4)';
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = active ? '#ffc93c' : '#fff8ec';
      ctx.fillText(it.label, x + 22 * s, y + 38 * s);
      pause.rects.push({ x, y, w, h });
    });
    if (pause.note) {
      ctx.font = `700 ${Math.round(20 * s)}px ${FONT}`;
      ctx.fillStyle = '#ffc93c';
      ctx.fillText(pause.note, mapRect.x + 44 * s, mapRect.y + (170 + items.length * 66 + 30) * s);
    }
    ctx.font = `700 ${Math.round(18 * s)}px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 248, 236, 0.8)';
    ctx.fillText('ESC RESUME · TAB MAP · ARROWS + ENTER', mapRect.x + 44 * s, mapRect.y + mapRect.h - 28 * s);
  } else {
    ctx.font = `700 ${Math.round(18 * s)}px ${FONT}`;
    const hint = 'TAB CLOSE · ESC MENU', hw = ctx.measureText(hint).width;
    ctx.fillStyle = 'rgba(20, 48, 79, 0.88)';
    ctx.fillRect(mapRect.x + 12 * s, mapRect.y + mapRect.h - 44 * s, hw + 24 * s, 32 * s);
    ctx.fillStyle = '#fff8ec';
    ctx.fillText(hint, mapRect.x + 24 * s, mapRect.y + mapRect.h - 21 * s);
  }
}

// The whole city north-up: sea, the crescent shore, blocks, roads, district names, the places,
// the numbered story rings and Wren's arrow.
function drawCityMap(ctx, game, rect, s) {
  const roads = game.roads;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const r of roads.roads) {
    const [x0, x1, z0, z1] = r.axis === 'z' ? [r.at, r.at, r.from, r.to] : [r.from, r.to, r.at, r.at];
    minX = Math.min(minX, x0); maxX = Math.max(maxX, x1); minZ = Math.min(minZ, z0); maxZ = Math.max(maxZ, z1);
  }
  // Lantern Point's lighthouse sits off the grid on its own spit; keep it on the map.
  minX = Math.min(minX, LANDMARKS.lighthouse.x); minZ = Math.min(minZ, LANDMARKS.lighthouse.z);
  minX -= 40; maxX += 40; minZ -= 30; maxZ += 30;
  const k = Math.min(rect.w / (maxX - minX), rect.h / (maxZ - minZ));
  const ox = rect.x + (rect.w - (maxX - minX) * k) / 2 - minX * k, oz = rect.y + (rect.h - (maxZ - minZ) * k) / 2 - minZ * k;
  const P = (x, z) => [ox + x * k, oz + z * k];

  ctx.save();
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 18 * s); ctx.clip();
  ctx.fillStyle = '#1b7f8a';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.translate(ox, oz); ctx.scale(k, k);
  ctx.fillStyle = '#e8d6ae';
  ctx.beginPath();
  ctx.moveTo(roads.coastX(minZ - 200), minZ - 200);
  for (let z = minZ - 200; z <= maxZ + 200; z += 10) ctx.lineTo(roads.coastX(z), z);
  ctx.lineTo(maxX + 400, maxZ + 200); ctx.lineTo(maxX + 400, minZ - 200); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9c2b4';
  for (const b of roads.blocks) ctx.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
  ctx.strokeStyle = '#ffffff';
  for (const r of roads.roads) {
    ctx.lineWidth = Math.max(r.width * 0.8, 3 / k);
    ctx.beginPath();
    if (r.axis === 'z') { ctx.moveTo(r.at, r.from); ctx.lineTo(r.at, r.to); } else { ctx.moveTo(r.from, r.at); ctx.lineTo(r.to, r.at); }
    ctx.stroke();
  }
  ctx.restore();

  // District names at the middle of their blocks, from the same districtAt the game uses.
  const sums = {};
  for (const b of roads.blocks) {
    const d = districtAt(b.cx, b.cz), t = (sums[d] ||= { x: 0, z: 0, n: 0 });
    t.x += b.cx; t.z += b.cz; t.n++;
  }
  sums.lantern ||= { x: LANDMARKS.lighthouse.x, z: LANDMARKS.lighthouse.z, n: 1 };
  ctx.textAlign = 'center';
  for (const [id, t] of Object.entries(sums)) {
    const [nx, nz] = LABEL_NUDGE[id] || [0, 0];
    const [px, py] = P(t.x / t.n + nx, t.z / t.n + nz), name = game.lore.districts[id], small = id === 'lantern';
    ctx.font = `900 ${Math.round((small ? 17 : 30) * s)}px ${FONT}`;
    ctx.lineWidth = 6 * s; ctx.strokeStyle = 'rgba(20, 48, 79, 0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(name, px, py); ctx.fillStyle = '#fff8ec'; ctx.fillText(name, px, py);
  }

  for (const sp of citySpots(game)) {
    const [px, py] = P(sp.x, sp.z);
    badge(ctx, px, py, 13 * s, sp.fill, sp.mark, s);
  }
  // Story rings: done ones grey with a tick, the current one gold and large, locked ones dim.
  const status = storyStatus(game);
  for (const st of status) {
    const [px, py] = P(st.mission.start.x, st.mission.start.z);
    const r = (st.state === 'current' ? 19 : 15) * s;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = st.state === 'done' ? '#8a8f96' : st.state === 'current' ? '#ffc21f' : '#7a6a3a';
    ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = st.state === 'current' ? '#fff8ec' : '#14304f'; ctx.stroke();
    ctx.fillStyle = st.state === 'locked' ? '#e8d6ae' : '#14304f';
    ctx.font = `900 ${Math.round((st.state === 'current' ? 20 : 16) * s)}px ${FONT}`;
    ctx.fillText(st.state === 'done' ? '✓' : String(st.mission.number), px, py + 6 * s);
  }
  ctx.textAlign = 'left';

  // Wren: a white arrow with a navy rim, pointing the way she faces.
  const f = game.focus, [px, py] = P(f.x, f.z);
  ctx.save();
  ctx.translate(px, py); ctx.rotate(-(game.vehicle ? game.vehicle.heading : game.player.facing));
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#14304f'; ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(0, -18 * s); ctx.lineTo(13 * s, 14 * s); ctx.lineTo(0, 7 * s); ctx.lineTo(-13 * s, 14 * s); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.font = `900 ${Math.round(20 * s)}px ${FONT}`;
  ctx.fillStyle = '#fff8ec';
  ctx.fillText('N ▲', rect.x + rect.w - 64 * s, rect.y + 34 * s);
  ctx.restore();
  ctx.lineWidth = 2 * s; ctx.strokeStyle = '#fff1d6';
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 18 * s); ctx.stroke();
}

// Story order: done, then the first open one is current, the rest locked.
export function storyStatus(game) {
  const done = game.missions.completed;
  let current = false;
  return game.story.map((m) => {
    if (done.has(m.id)) return { mission: m, state: 'done' };
    if (!current) { current = true; return { mission: m, state: 'current' }; }
    return { mission: m, state: 'locked' };
  });
}

export function storyNumber(game) {
  return Math.min(game.story.length, game.missions.completed.size + 1);
}

function badge(ctx, x, y, r, fill, mark, s) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2.5 * s; ctx.strokeStyle = '#fff8ec'; ctx.stroke();
  ctx.fillStyle = '#fff8ec';
  ctx.font = `900 ${Math.round(r * 1.15)}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.fillText(mark, x, y + r * 0.42); ctx.textAlign = 'left';
}

// The side panel: story progress, side activity counts, REP rank, cash and the last save.
function drawSidePanel(ctx, game, r, s) {
  ctx.fillStyle = 'rgba(20, 48, 79, 0.94)';
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 18 * s); ctx.fill();
  ctx.lineWidth = 2 * s; ctx.strokeStyle = '#fff1d6'; ctx.stroke();
  const x = r.x + 24 * s;
  let y = r.y + 50 * s;
  const text = (t, size, color = '#fff8ec', weight = 800) => {
    ctx.font = `${weight} ${Math.round(size * s)}px ${FONT}`; ctx.fillStyle = color; ctx.fillText(t, x, y);
  };
  text('PORT SOLARA', 26, '#ffc93c', 900); y += 48 * s;
  const status = storyStatus(game);
  text(`STORY ${storyNumber(game)}/${status.length}`, 30, '#fff8ec', 900); y += 34 * s;
  for (const st of status) {
    const tag = st.state === 'done' ? '✓' : st.state === 'current' ? '▶' : '·';
    text(`${tag} ${st.mission.number}  ${st.mission.title.toUpperCase()}`, 17, st.state === 'current' ? '#ffc93c' : st.state === 'done' ? '#b9c3cc' : 'rgba(255,248,236,0.55)', 700);
    y += 27 * s;
  }
  y += 16 * s;
  const p = game.progress;
  text(`Races ${p.races}/${p.racesOf} · Courier ${p.courier}/${p.courierOf}`, 19, '#fff8ec', 700); y += 46 * s;
  const rank = game.rankFor(game.missions.rep);
  text(`REP RANK ${rank.rank}`, 26, '#fff8ec', 900); y += 28 * s;
  text(rank.name, 18, '#ffc93c', 800); y += 14 * s;
  ctx.fillStyle = 'rgba(255,248,236,0.25)'; ctx.fillRect(x, y, r.w - 48 * s, 9 * s);
  ctx.fillStyle = '#ffc93c'; ctx.fillRect(x, y, (r.w - 48 * s) * Math.max(0, Math.min(1, rank.frac)), 9 * s);
  y += 54 * s;
  text(`$${game.cash.toLocaleString('en-US')}`, 36, '#7fe08a', 900); y += 44 * s;
  const saved = p.savedAt;
  text(saved ? `Saved ${saved.clock} -` : 'Not saved yet', 18, '#fff8ec', 700); y += 24 * s;
  if (saved) { text(saved.place, 18, '#fff8ec', 700); y += 4 * s; }
  y += 32 * s;
  // A small legend for the place marks.
  const legend = [['H', '#3fae6a', 'Safehouse'], ['$', '#f2b134', 'Quist Auto'], ['G', '#c2412d', 'Gun shop'], ['P', '#3b7bff', 'SPD station'], ['R', '#e07a2f', 'Respray'], ['F', '#14304f', 'Races']];
  for (let i = 0; i < legend.length; i++) {
    const [m, c, label] = legend[i], lx = x + (i % 2) * (r.w / 2 - 12 * s) + 11 * s, ly = y + Math.floor(i / 2) * 32 * s;
    badge(ctx, lx, ly - 6 * s, 11 * s, c, m, s);
    ctx.textAlign = 'left'; ctx.font = `700 ${Math.round(15 * s)}px ${FONT}`; ctx.fillStyle = '#fff8ec';
    ctx.fillText(label, lx + 18 * s, ly);
  }
}

// The title screen over the live city: the PORT SOLARA wordmark (navy caps, sand outline, a flat
// gold sun stamp, over a half sun with nine rays), NEW GAME and CONTROLS, and a controls strip.
export function showTitleScreen(game, onNewGame) {
  const root = document.getElementById('title-screen');
  root.hidden = false;
  root.replaceChildren();
  root.appendChild(drawWordmark());

  const controls = document.createElement('div');
  controls.className = 'controls-panel';
  controls.hidden = true;
  controls.innerHTML = CONTROLS.map(([k, v]) => `<div><b>${k}</b> &nbsp; ${v}</div>`).join('');

  const menu = document.createElement('ul');
  menu.className = 'title-menu';
  // CONTINUE leads when a save exists, labelled from the newest of the three slots.
  const save = latestSave();
  const items = [
    ...(save ? [{ label: continueLabel(save), run: () => { root.hidden = true; game.loadSave?.(save); onNewGame(); } }] : []),
    { label: 'NEW GAME', run: () => { root.hidden = true; if (game.mode !== 'title' || game.playedOnce) game.newGameState?.(); onNewGame(); } },
    { label: 'CONTROLS', run: () => { settingsPanel.hidden = true; controls.hidden = !controls.hidden; } },
    { label: 'SETTINGS', run: () => { controls.hidden = true; settingsPanel.hidden = !settingsPanel.hidden; fillSettings(); } },
  ];
  // The title's settings: a click on a row raises it (wrapping round), the same store as the pause.
  const settingsPanel = document.createElement('div');
  settingsPanel.className = 'controls-panel';
  settingsPanel.hidden = true;
  const fillSettings = () => {
    settingsPanel.replaceChildren(...SETTING_ROWS.map((r, i) => {
      const row = document.createElement('div');
      row.innerHTML = `<b>${r.label}</b> &nbsp; ${settingText(r, game.settings[r.key])}`;
      row.addEventListener('click', () => {
        const v = game.settings[r.key];
        if (!r.options && v >= r.max) game.changeSetting(r.key, r.min); else stepSetting(game, i, 1);
        fillSettings();
      });
      return row;
    }));
  };
  root.appendChild(settingsPanel);
  let active = 0;
  const lis = items.map((item, i) => {
    const li = document.createElement('li');
    li.textContent = item.label;
    li.addEventListener('click', () => item.run());
    li.addEventListener('mouseenter', () => { active = i; paint(); });
    menu.appendChild(li);
    return li;
  });
  const paint = () => lis.forEach((li, i) => li.classList.toggle('active', i === active));
  paint();

  const strip = document.createElement('div');
  strip.className = 'controls-strip';
  strip.textContent = 'WASD MOVE · SHIFT RUN · F STEAL/EXIT CAR · SPACE HANDBRAKE · R RADIO';
  root.append(controls, menu, strip);

  const onKey = (e) => {
    if (root.hidden) { removeEventListener('keydown', onKey); return; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { active = (active + 1) % items.length; paint(); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { active = (active + items.length - 1) % items.length; paint(); }
    if (e.code === 'Enter' || e.code === 'Space') items[active].run();
  };
  if (root.onTitleKey) removeEventListener('keydown', root.onTitleKey); // a quit to title shows it again
  root.onTitleKey = onKey;
  addEventListener('keydown', onKey);
  return root;
}

export const CONTROLS = [
  ['W A S D', 'walk / drive'],
  ['MOUSE', 'look (click to lock)'],
  ['SHIFT', 'run'],
  ['SPACE', 'handbrake'],
  ['F', 'enter / leave a car'],
  ['R', 'radio: Gull FM / Low Tide (Heat 96 at WANTED 3+)'],
  ['GOLD RING', 'walk in to start a story mission'],
  ['ESC', 'pause menu (resume, map, save, quit)'],
  ['TAB', 'full city map'],
];

function drawWordmark() {
  const c = document.createElement('canvas');
  c.className = 'wordmark';
  c.width = 1120; c.height = 260;
  const g = c.getContext('2d');
  // Half sun with nine rays behind the letters, flat sand gold.
  const sx = 150, sy = 210;
  g.fillStyle = '#f6d58a';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i + 0.5) * (Math.PI / 9);
    g.beginPath();
    g.moveTo(sx + Math.cos(a - 0.07) * 92, sy + Math.sin(a - 0.07) * 92);
    g.lineTo(sx + Math.cos(a) * 176, sy + Math.sin(a) * 176);
    g.lineTo(sx + Math.cos(a + 0.07) * 92, sy + Math.sin(a + 0.07) * 92);
    g.fill();
  }
  g.beginPath(); g.arc(sx, sy, 82, Math.PI, 0); g.fill();
  // The letters: heavy, wide-spaced navy caps with a thin sand outline.
  g.font = '800 112px "DejaVu Sans", Verdana, sans-serif';
  g.letterSpacing = '4px';
  g.lineJoin = 'round';
  g.lineWidth = 8; g.strokeStyle = '#f3e3c3';
  g.strokeText('PORT SOLARA', 30, 200);
  g.fillStyle = '#14304f';
  g.fillText('PORT SOLARA', 30, 200);
  // One flat gold sun stamp beside them.
  const w = g.measureText('PORT SOLARA').width;
  const cx = 30 + w + 40, cy = 150;
  g.fillStyle = '#f2b134';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillRect(cx + Math.cos(a) * 30 - 4, cy + Math.sin(a) * 30 - 4, 8, 8);
  }
  g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill();
  g.font = '800 28px "DejaVu Sans", Verdana, sans-serif';
  g.letterSpacing = '6px';
  g.fillStyle = '#fff8ec';
  g.strokeStyle = '#14304f'; g.lineWidth = 5;
  g.strokeText('SALT & GOLD', 36, 246);
  g.fillText('SALT & GOLD', 36, 246);
  return c;
}
