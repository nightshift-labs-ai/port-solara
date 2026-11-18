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
  const items = [
    { label: 'NEW GAME', run: () => { root.hidden = true; onNewGame(); } },
    { label: 'CONTROLS', run: () => { controls.hidden = !controls.hidden; } },
  ];
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
  ['ESC', 'release the mouse'],
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
