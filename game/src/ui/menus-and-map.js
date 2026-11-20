import { districtAt, LANDMARKS } from '../world/city-builder.js';
import { nearestNode } from '../police/police-ai.js';
import { latestSave, continueLabel, readAllSlots, clockOf } from '../core/save-slots.js';
import { completionOf } from '../story/completion-percentage.js';
import { kmOf, playClock } from '../story/career-stats.js';

const FONT = '"DejaVu Sans", Verdana, sans-serif';
const GOLD = '#ffc93c', CREAM = '#fff8ec', NAVY = '#14304f';

// The pause tabs, left to right. The PAUSED list (Esc from play) sits under them with no tab lit.
export const PAUSE_TABS = [
  { view: 'map', label: 'MAP' },
  { view: 'story', label: 'STORY' },
  { view: 'stats', label: 'STATS' },
  { view: 'controls', label: 'CONTROLS' },
  { view: 'settings', label: 'SETTINGS' },
  { view: 'save', label: 'SAVE' },
];

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
    { label: 'MAP', run: () => showView('map') },
    { label: 'SETTINGS', run: () => showView('settings') },
    { label: 'SAVE', run: () => { pause.note = game.saveGame ? game.saveGame('Pause menu') : 'Saving is not ready yet'; draw(); } },
    { label: 'QUIT TO TITLE', run: () => { close(false); game.quitToTitle?.(); } },
  ];
  // rects: hit boxes of the current view only (PAUSED list or SETTINGS rows); tabRects: the tab row.
  const pause = { view: 'menu', active: 0, note: '', rects: [], tabRects: [], relock: false };
  game.pause = pause;
  const showView = (view) => {
    pause.view = view;
    if (view === 'settings' || view === 'save') { pause.row = 0; pause.note = ''; }
    draw();
  };
  const saveNow = () => { pause.note = game.saveGame ? game.saveGame('Pause menu') : 'Saving is not ready yet'; draw(); };
  // Q / E step left / right through the tabs; from the PAUSED list E opens MAP and Q the last tab.
  const stepTab = (dir) => {
    const n = PAUSE_TABS.length, i = PAUSE_TABS.findIndex((t) => t.view === pause.view);
    showView(PAUSE_TABS[i < 0 ? (dir > 0 ? 0 : n - 1) : (i + dir + n) % n].view);
  };

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
    if (e.code === 'KeyQ' || e.code === 'KeyE') { stepTab(e.code === 'KeyE' ? 1 : -1); return; } // main.js drops presses while paused
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
    if (pause.view === 'save') { if (e.code === 'Enter' || e.code === 'Space') saveNow(); return; }
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
    const inside = (r) => e.offsetX >= r.x && e.offsetX <= r.x + r.w && e.offsetY >= r.y && e.offsetY <= r.y + r.h;
    const tab = pause.tabRects.findIndex(inside);
    if (tab >= 0) { showView(PAUSE_TABS[tab].view); return; }
    const hit = pause.rects.findIndex(inside);
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
    // The SAVE tab's one hit box is SAVE NOW; only the PAUSED list runs items; MAP, STORY, STATS
    // and CONTROLS have nothing to click.
    if (pause.view === 'save') saveNow();
    else if (pause.view === 'menu') { pause.active = hit; items[hit].run(); }
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

// The overlay: the tab row across the top; under it MAP (city map, place legend and the career
// column), STORY, STATS or CONTROLS; SETTINGS and the PAUSED list dim the map behind them.
export function drawPauseScreen(ctx, game, pause, items) {
  const W = ctx.canvas.width, H = ctx.canvas.height, s = H / 800;
  const pad = Math.round(22 * s), tabRow = Math.round(56 * s);
  const colW = Math.round(Math.max(360 * s, W * 0.38));
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10, 26, 44, 0.86)';
  ctx.fillRect(0, 0, W, H);
  pause.rects = []; pause.tabRects = [];
  drawPauseTabs(ctx, pause, { x: pad, y: pad, w: W - pad * 2, h: Math.round(44 * s) }, s);
  const top = pad + tabRow, bodyH = H - top - pad;
  const info = completionOf(game);
  const full = { x: pad, y: top, w: W - pad * 2, h: bodyH };
  if (pause.view === 'story') return drawStoryTab(ctx, game, info, full, s);
  if (pause.view === 'stats') return drawStatsTab(ctx, game, info, full, s);
  if (pause.view === 'controls') return drawControlsTab(ctx, full, s);
  if (pause.view === 'save') return drawSaveTab(ctx, pause, full, s);
  const area = { x: pad, y: top, w: W - colW - pad * 3, h: bodyH };
  const legendH = Math.round(40 * s), gap = Math.round(8 * s);
  const mapRect = { x: area.x, y: area.y, w: area.w, h: area.h - legendH - gap };
  drawCityMap(ctx, game, mapRect, s);
  drawPlaceLegend(ctx, { x: area.x, y: mapRect.y + mapRect.h + gap, w: area.w, h: legendH }, s);
  drawCareerColumn(ctx, game, info, { x: W - colW - pad, y: top, w: colW, h: bodyH }, s);
  if (pause.view === 'settings') {
    ctx.fillStyle = 'rgba(10, 26, 44, 0.8)';
    ctx.fillRect(area.x, area.y, area.w, area.h);
    drawSettings(ctx, game, pause, area, s);
  } else if (pause.view === 'menu') {
    // Same list, same places as before the tabs; the dim covers map and legend, the hint sits on the map.
    ctx.fillStyle = 'rgba(10, 26, 44, 0.72)';
    ctx.fillRect(area.x, area.y, area.w, area.h);
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
    ctx.fillText('ESC RESUME · TAB MAP · ARROWS + ENTER · Q / E TABS', mapRect.x + 44 * s, mapRect.y + mapRect.h - 28 * s);
  } else {
    ctx.font = `700 ${Math.round(18 * s)}px ${FONT}`;
    const hint = 'TAB CLOSE · ESC MENU · Q / E TABS', hw = ctx.measureText(hint).width;
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
  ctx.lineWidth = 1.2 * s; ctx.strokeStyle = 'rgba(255, 241, 214, 0.5)';
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

function font(ctx, weight, px, s) { ctx.font = `${weight} ${Math.round(px * s)}px ${FONT}`; }

function textAt(ctx, t, x, y, px, s, color = CREAM, weight = 800, align = 'left') {
  font(ctx, weight, px, s); ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(t, x, y); ctx.textAlign = 'left';
}

// A dark rounded panel with the gold edge bar every pause panel shares.
function drawPanel(ctx, r, s) {
  ctx.fillStyle = 'rgba(10, 20, 44, 0.9)';
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 18 * s); ctx.fill();
  ctx.lineWidth = 1.2 * s; ctx.strokeStyle = 'rgba(255, 241, 214, 0.5)'; ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.fillRect(r.x + 1, r.y + 18 * s, 4 * s, r.h - 36 * s);
}

function money(n) { return `$${Math.round(n).toLocaleString('en-US')}`; }

// MAP · STORY · STATS · CONTROLS · SETTINGS between Q and E keycaps; the open tab is gold.
function drawPauseTabs(ctx, pause, r, s) {
  const keycap = (x, label) => {
    const w = 34 * s, y = r.y + (r.h - w) / 2;
    ctx.fillStyle = 'rgba(255, 248, 236, 0.12)';
    ctx.beginPath(); ctx.roundRect(x, y, w, w, 7 * s); ctx.fill();
    ctx.lineWidth = 1.5 * s; ctx.strokeStyle = 'rgba(255, 248, 236, 0.6)'; ctx.stroke();
    textAt(ctx, label, x + w / 2, y + w * 0.7, 18, s, CREAM, 900, 'center');
    return w;
  };
  let x = r.x;
  x += keycap(x, 'Q') + 10 * s;
  font(ctx, 900, 21, s);
  for (const t of PAUSE_TABS) {
    const w = ctx.measureText(t.label).width + 46 * s, on = t.view === pause.view;
    ctx.fillStyle = on ? GOLD : 'rgba(20, 48, 79, 0.92)';
    ctx.beginPath(); ctx.roundRect(x, r.y, w, r.h, 10 * s); ctx.fill();
    ctx.lineWidth = (on ? 2.5 : 1.2) * s; ctx.strokeStyle = on ? CREAM : 'rgba(255, 248, 236, 0.35)'; ctx.stroke();
    textAt(ctx, t.label, x + w / 2, r.y + r.h * 0.68, 21, s, on ? NAVY : CREAM, 900, 'center');
    pause.tabRects.push({ x, y: r.y, w, h: r.h });
    x += w + 10 * s;
  }
  keycap(x, 'E');
  textAt(ctx, 'PORT SOLARA', r.x + r.w, r.y + r.h * 0.7, 26, s, GOLD, 900, 'right');
}

// The place marks under the map, one row.
function drawPlaceLegend(ctx, r, s) {
  ctx.fillStyle = 'rgba(10, 20, 44, 0.9)';
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12 * s); ctx.fill();
  const legend = [['H', '#3fae6a', 'Safehouse'], ['$', '#f2b134', 'Quist Auto'], ['G', '#c2412d', 'Gun shop'], ['P', '#3b7bff', 'SPD station'], ['R', '#e07a2f', 'Respray'], ['F', NAVY, 'Races']];
  // Measured labels, the spare width shared out between the six entries.
  font(ctx, 700, 15, s);
  const widths = legend.map(([, , label]) => 28 * s + ctx.measureText(label).width);
  const spare = (r.w - 24 * s - widths.reduce((a, b) => a + b, 0)) / (legend.length - 1);
  let lx = r.x + 12 * s + 11 * s;
  legend.forEach(([m, c, label], i) => {
    const ly = r.y + r.h / 2;
    badge(ctx, lx, ly, 11 * s, c, m, s);
    textAt(ctx, label, lx + 17 * s, ly + 5.5 * s, 15, s, CREAM, 700);
    lx += widths[i] + spare;
  });
}

// The completion ring: a gold arc over a dim track, the percentage in large type inside.
function drawCompletionRing(ctx, cx, cy, R, percent, s) {
  ctx.lineWidth = 16 * s; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 248, 236, 0.16)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  if (percent > 0) {
    ctx.strokeStyle = GOLD;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * percent) / 100); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = 'rgba(20, 48, 79, 0.95)';
  ctx.beginPath(); ctx.arc(cx, cy, R - 12 * s, 0, Math.PI * 2); ctx.fill();
  // Digits at 80 units (shrunk only if they would leave the ring), a smaller % beside them.
  const big = 80 * (R / (96 * s)), num = String(percent);
  font(ctx, 900, big, s);
  const nw = ctx.measureText(num).width;
  font(ctx, 900, big * 0.42, s);
  const pw = ctx.measureText('%').width, k = Math.min(1, (2 * (R - 20 * s)) / (nw + pw + 4 * s));
  const x0 = cx - ((nw + pw + 4 * s) * k) / 2, base = cy + big * 0.3 * s;
  textAt(ctx, num, x0, base, big * k, s, CREAM, 900);
  textAt(ctx, '%', x0 + (nw + 4 * s) * k, base - big * 0.28 * s * k, big * 0.42 * k, s, GOLD, 900);
  textAt(ctx, 'COMPLETE', cx, cy + R * 0.6, 14 * (R / (96 * s)), s, 'rgba(255, 248, 236, 0.75)', 800, 'center');
}

// Five stars, the first n gold.
function drawStars(ctx, x, y, n, px, s) {
  font(ctx, 900, px, s);
  const w = ctx.measureText('★').width;
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < n ? GOLD : 'rgba(255, 248, 236, 0.22)'; ctx.fillText('★', x + i * w, y); }
}

// The six headline career numbers.
function headlineCareer(game) {
  const st = game.stats || {};
  return [
    { label: 'CARS STOLEN', value: String(st.carsStolen || 0) },
    { label: 'SPD ESCAPES', value: String(st.policeEscapes || 0) },
    { label: 'HIGHEST WANTED', stars: st.highestWanted || 0 },
    { label: 'KM DRIVEN', value: kmOf(st.metresDriven || 0) },
    { label: 'GANG MEMBERS DOWNED', value: String(st.gangDowned || 0) },
    { label: 'RACES WON', value: String(st.racesWon || 0) },
  ];
}

const SHORT_ROW = { story: 'STORY', races: 'RACES', courier: 'COURIER', hornet: 'HORNET SMG', sold: 'CAR SOLD', respray: 'RESPRAY' };
const rowValue = (row) => (row.of === 1 ? (row.done ? '✓' : '—') : `${row.done}/${row.of}`);

// The MAP tab's column: the completion ring and what it is made of, the story with payouts, the
// six headline career numbers, then cash and REP rank.
function drawCareerColumn(ctx, game, info, r, s) {
  drawPanel(ctx, r, s);
  const x = r.x + 26 * s, right = r.x + r.w - 22 * s;
  const R = 96 * s, cx = x + R + 4 * s, cy = r.y + 22 * s + R;
  drawCompletionRing(ctx, cx, cy, R, info.percent, s);
  const tx = cx + R + 30 * s;
  let y = r.y + 46 * s;
  textAt(ctx, 'COMPLETION', tx, y, 18, s, GOLD, 900); y += 31 * s;
  for (const row of info.rows) {
    const full = row.done >= row.of;
    textAt(ctx, SHORT_ROW[row.key], tx, y, 16, s, full ? '#b9c3cc' : CREAM, 700);
    textAt(ctx, rowValue(row), right, y, 16, s, full ? GOLD : CREAM, 800, 'right');
    y += 25 * s;
  }
  y = cy + R + 48 * s;
  // Missions done (the title's CONTINUE line counts the step being played, one more).
  textAt(ctx, `STORY ${info.storyDone}/${info.missions.length} DONE`, x, y, 25, s, CREAM, 900);
  textAt(ctx, 'PAYOUT', right, y, 14, s, 'rgba(255, 248, 236, 0.6)', 800, 'right');
  y += 30 * s;
  const status = storyStatus(game);
  status.forEach((st, i) => {
    const m = info.missions[i], color = st.state === 'current' ? GOLD : st.state === 'done' ? '#b9c3cc' : 'rgba(255,248,236,0.5)';
    const tag = st.state === 'done' ? '✓' : st.state === 'current' ? '▶' : '·';
    textAt(ctx, `${tag} ${m.number}  ${m.title.toUpperCase()}`, x, y, 16, s, color, st.state === 'current' ? 900 : 700);
    textAt(ctx, st.state === 'current' ? `NEXT ${money(m.cash)}` : money(m.cash), right, y, 16, s, color, 800, 'right');
    y += 26 * s;
  });
  y += 8 * s;
  ctx.fillStyle = 'rgba(255, 248, 236, 0.18)'; ctx.fillRect(x, y, right - x, 1.5 * s);
  y += 26 * s;
  textAt(ctx, 'CAREER', x, y, 16, s, GOLD, 900);
  y += 12 * s;
  const cellW = (right - x) / 2;
  headlineCareer(game).forEach((c, i) => {
    const cx2 = x + (i % 2) * cellW, cy2 = y + Math.floor(i / 2) * 56 * s;
    if (c.stars !== undefined) drawStars(ctx, cx2, cy2 + 30 * s, c.stars, 26, s);
    else textAt(ctx, c.value, cx2, cy2 + 30 * s, 30, s, CREAM, 900);
    textAt(ctx, c.label, cx2, cy2 + 48 * s, 13, s, 'rgba(255, 248, 236, 0.72)', 800);
  });
  const rank = game.rankFor(game.missions.rep), by = r.y + r.h - 24 * s;
  textAt(ctx, money(game.cash), x, by, 34, s, '#7fe08a', 900);
  textAt(ctx, `REP RANK ${rank.rank}`, right, by - 18 * s, 18, s, CREAM, 900, 'right');
  textAt(ctx, rank.name, right, by + 2 * s, 15, s, GOLD, 800, 'right');
}

// STORY: every mission in full, with who gives it, its payout and where the story stands.
function drawStoryTab(ctx, game, info, r, s) {
  drawPanel(ctx, r, s);
  const x = r.x + 40 * s, right = r.x + r.w - 40 * s;
  textAt(ctx, 'STORY', x, r.y + 56 * s, 40, s, CREAM, 900);
  textAt(ctx, `${info.storyDone}/${info.missions.length} DONE · ${money(info.paid)} OF ${money(info.payouts)} PAID`, right, r.y + 54 * s, 20, s, GOLD, 800, 'right');
  const status = storyStatus(game), cardH = 98 * s, gapY = 12 * s;
  status.forEach((st, i) => {
    const m = info.missions[i], y = r.y + 86 * s + i * (cardH + gapY), on = st.state === 'current';
    ctx.fillStyle = on ? 'rgba(255, 201, 60, 0.16)' : st.state === 'done' ? 'rgba(138, 143, 150, 0.16)' : 'rgba(20, 48, 79, 0.75)';
    ctx.beginPath(); ctx.roundRect(x, y, right - x, cardH, 12 * s); ctx.fill();
    ctx.lineWidth = (on ? 3 : 1.2) * s; ctx.strokeStyle = on ? GOLD : 'rgba(255, 248, 236, 0.3)'; ctx.stroke();
    const bx = x + 52 * s, byc = y + cardH / 2;
    ctx.beginPath(); ctx.arc(bx, byc, 30 * s, 0, Math.PI * 2);
    ctx.fillStyle = st.state === 'done' ? '#8a8f96' : on ? '#ffc21f' : '#7a6a3a'; ctx.fill();
    textAt(ctx, st.state === 'done' ? '✓' : String(m.number), bx, byc + 10 * s, 28, s, st.state === 'locked' ? '#e8d6ae' : NAVY, 900, 'center');
    const dim = st.state === 'locked' ? 'rgba(255, 248, 236, 0.55)' : CREAM;
    textAt(ctx, m.title.toUpperCase(), x + 104 * s, y + 46 * s, 30, s, on ? GOLD : dim, 900);
    textAt(ctx, `MISSION ${m.number} · FROM ${m.giver.toUpperCase()}`, x + 104 * s, y + 78 * s, 17, s, dim, 700);
    textAt(ctx, st.state === 'done' ? 'DONE' : on ? 'NEXT' : 'LOCKED', right - 24 * s, y + 44 * s, 24, s, on ? GOLD : st.state === 'done' ? '#b9c3cc' : dim, 900, 'right');
    textAt(ctx, `${money(m.cash)} · +${m.rep} REP`, right - 24 * s, y + 78 * s, 19, s, st.state === 'done' ? '#7fe08a' : dim, 800, 'right');
  });
  textAt(ctx, 'Q / E TABS · ESC BACK · TAB MAP', x, r.y + r.h - 22 * s, 18, s, 'rgba(255, 248, 236, 0.8)', 700);
}

// STATS: the completion ring with every row it is built from, and every career number.
function drawStatsTab(ctx, game, info, r, s) {
  drawPanel(ctx, r, s);
  const x = r.x + 40 * s, split = r.x + r.w * 0.45;
  const R = 112 * s, cx = x + R + 10 * s, cy = r.y + 36 * s + R;
  drawCompletionRing(ctx, cx, cy, R, info.percent, s);
  textAt(ctx, 'COMPLETION', cx + R + 34 * s, cy - 10 * s, 26, s, GOLD, 900);
  textAt(ctx, 'from what a save keeps', cx + R + 34 * s, cy + 20 * s, 15, s, 'rgba(255, 248, 236, 0.7)', 700);
  let y = cy + R + 56 * s;
  const barW = split - x - 40 * s;
  for (const row of info.rows) {
    textAt(ctx, row.label, x, y, 17, s, CREAM, 800);
    textAt(ctx, `${rowValue(row)}  ·  ${Math.round(row.points * 10) / 10} / ${row.weight}%`, x + barW, y, 16, s, GOLD, 800, 'right');
    ctx.fillStyle = 'rgba(255, 248, 236, 0.18)'; ctx.fillRect(x, y + 8 * s, barW, 6 * s);
    ctx.fillStyle = GOLD; ctx.fillRect(x, y + 8 * s, barW * (row.points / row.weight), 6 * s);
    y += 46 * s;
  }
  const st = game.stats || {}, rank = game.rankFor(game.missions.rep);
  const career = [
    ['CARS STOLEN', st.carsStolen], ['SPD ESCAPES', st.policeEscapes], ['HIGHEST WANTED', null],
    ['KM DRIVEN', kmOf(st.metresDriven || 0)], ['KM ON FOOT', kmOf(st.metresOnFoot || 0)],
    ['GANG MEMBERS DOWNED', st.gangDowned], ['CARS BLOWN UP', st.carsBlownUp], ['RACES WON', st.racesWon],
    ['COURIER JOBS', st.courierDone], ['TIMES BOOKED', st.timesBooked], ['CLINIC VISITS', st.clinicVisits],
    ['CARS SOLD', st.carsSold], ['RESPRAYS', st.resprays], ['TIME PLAYED', playClock(st.secondsPlayed || 0)],
    ['CASH · REP RANK', `${money(game.cash)} · ${rank.rank}`],
  ];
  const cx0 = split, cright = r.x + r.w - 40 * s;
  textAt(ctx, 'CAREER', cx0, r.y + 56 * s, 32, s, CREAM, 900);
  career.forEach(([label, v], i) => {
    const ry = r.y + 76 * s + i * 39 * s;
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(255, 248, 236, 0.05)'; ctx.fillRect(cx0 - 12 * s, ry, cright - cx0 + 24 * s, 39 * s); }
    textAt(ctx, label, cx0, ry + 27 * s, 18, s, 'rgba(255, 248, 236, 0.85)', 800);
    if (v === null) {
      font(ctx, 900, 22, s);
      drawStars(ctx, cright - ctx.measureText('★').width * 5, ry + 28 * s, st.highestWanted || 0, 22, s);
    } else textAt(ctx, String(v ?? 0), cright, ry + 27 * s, 21, s, CREAM, 900, 'right');
  });
  textAt(ctx, 'Q / E TABS · ESC BACK · TAB MAP', x, r.y + r.h - 22 * s, 18, s, 'rgba(255, 248, 236, 0.8)', 700);
}

// SAVE: the three slots as the slot reader sees them, then SAVE NOW (the pause menu's save) and
// the note it returns.
function drawSaveTab(ctx, pause, r, s) {
  drawPanel(ctx, r, s);
  const x = r.x + 40 * s, right = r.x + r.w - 40 * s;
  textAt(ctx, 'SAVE', x, r.y + 56 * s, 40, s, CREAM, 900);
  textAt(ctx, 'SLOT 1 IS THE AUTOSAVE AFTER EACH MISSION · SLOTS 2 AND 3 TAKE TURNS', right, r.y + 54 * s, 16, s, 'rgba(255, 248, 236, 0.7)', 800, 'right');
  readAllSlots().forEach((rec, i) => {
    const y = r.y + 86 * s + i * 108 * s, h = 94 * s;
    ctx.fillStyle = rec ? 'rgba(20, 48, 79, 0.85)' : 'rgba(20, 48, 79, 0.45)';
    ctx.beginPath(); ctx.roundRect(x, y, right - x, h, 12 * s); ctx.fill();
    ctx.lineWidth = 1.2 * s; ctx.strokeStyle = 'rgba(255, 248, 236, 0.3)'; ctx.stroke();
    textAt(ctx, `SLOT ${i + 1}${i === 0 ? ' · AUTOSAVE' : ''}`, x + 24 * s, y + 38 * s, 24, s, GOLD, 900);
    if (!rec) { textAt(ctx, 'EMPTY', x + 24 * s, y + 72 * s, 18, s, 'rgba(255, 248, 236, 0.55)', 800); return; }
    const c = rec.career || {};
    textAt(ctx, `STORY ${rec.storyStep}/${rec.storyOf} · ${money(rec.cash)} · ${String(rec.place || '').toUpperCase()}`, x + 24 * s, y + 72 * s, 18, s, CREAM, 800);
    textAt(ctx, `SAVED ${clockOf(rec.savedAt)}`, right - 24 * s, y + 38 * s, 20, s, CREAM, 900, 'right');
    textAt(ctx, `${c.carsStolen || 0} CARS STOLEN · ${playClock(c.secondsPlayed || 0)} PLAYED`, right - 24 * s, y + 72 * s, 16, s, 'rgba(255, 248, 236, 0.7)', 800, 'right');
  });
  const by = r.y + 86 * s + 3 * 108 * s + 10 * s, bw = 300 * s, bh = 58 * s;
  ctx.fillStyle = 'rgba(255, 201, 60, 0.18)'; ctx.fillRect(x, by, bw, bh);
  ctx.lineWidth = 3 * s; ctx.strokeStyle = GOLD; ctx.strokeRect(x, by, bw, bh);
  textAt(ctx, 'SAVE NOW', x + bw / 2, by + 39 * s, 28, s, GOLD, 900, 'center');
  pause.rects.push({ x, y: by, w: bw, h: bh });
  if (pause.note) textAt(ctx, pause.note, x + bw + 30 * s, by + 37 * s, 20, s, GOLD, 700);
  textAt(ctx, 'ENTER SAVE NOW · Q / E TABS · ESC BACK', x, r.y + r.h - 22 * s, 18, s, 'rgba(255, 248, 236, 0.8)', 700);
}

// CONTROLS: the same list the title screen shows.
function drawControlsTab(ctx, r, s) {
  drawPanel(ctx, r, s);
  const x = r.x + 40 * s;
  textAt(ctx, 'CONTROLS', x, r.y + 56 * s, 40, s, CREAM, 900);
  CONTROLS.forEach(([k, v], i) => {
    const y = r.y + 84 * s + i * 50 * s;
    ctx.fillStyle = 'rgba(255, 248, 236, 0.1)';
    ctx.beginPath(); ctx.roundRect(x, y, 190 * s, 38 * s, 8 * s); ctx.fill();
    textAt(ctx, k, x + 95 * s, y + 26 * s, 18, s, GOLD, 900, 'center');
    textAt(ctx, v, x + 214 * s, y + 26 * s, 19, s, CREAM, 700);
  });
  textAt(ctx, 'Q / E TABS · ESC BACK · TAB MAP', x, r.y + r.h - 22 * s, 18, s, 'rgba(255, 248, 236, 0.8)', 700);
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
    { label: 'NEW GAME', run: () => { root.hidden = true; if (game.mode !== 'title' || game.playedOnce) game.newGameState?.(); game.setClock(game.lore.clock.startMinutes); onNewGame(); } },
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
  strip.textContent = 'WASD MOVE · F STEAL · SPACE DRIFT · C CAMERA · E USE · TAB MAP · ESC PAUSE';
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
  ['MOUSE', 'look (click to lock) · LMB fire · RMB aim · 1-5 / Q / wheel: weapon'],
  ['SHIFT', 'run'],
  ['SPACE', 'handbrake'],
  ['F', 'enter / leave a car'],
  ['R', 'radio: Gull FM / Low Tide (Heat 96 at WANTED 3+)'],
  ['C', 'camera: shoulder / wide on foot · near / high in a car'],
  ['GOLD RING', 'walk in to start a story mission'],
  ['E', 'save at Calloway Salvage · race flags · Quist Auto · gun shop · respray'],
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
