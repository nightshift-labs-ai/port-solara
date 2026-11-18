// Stages a shot from the seeded start, plays the real simulation forward a fixed number of
// ticks with scripted input, hides the cursor, then flags window.__shotReady.
export function stageScreenshotScene(game, name) {
  document.body.classList.add('shot-mode');
  const hold = (codes, ticks) => {
    for (const c of codes) game.input.setKey(c, true);
    for (let i = 0; i < ticks; i++) game.step();
    for (const c of codes) game.input.setKey(c, false);
  };
  const scene = SCENES[name] || SCENES.title;
  scene(game, hold);
  game.render();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export const SCENES = {
  // Driving the Albacore north up Palmline Boulevard, the Sundial Tower ahead.
  chase(game, hold) {
    game.startPlay();
    game.player.x = game.albacore.x + 2; game.player.z = game.albacore.z;
    game.enterOrExit();
    hold(['KeyW'], 200);
    hold(['KeyW', 'KeyA'], 10);
    hold(['KeyW'], 30);
  },
  // Wren on foot in Old Mercado's market square, the Clock Arch ahead and a Pipit to take.
  street(game, hold) {
    game.startPlay();
    game.player.x = 151.5; game.player.z = 82; game.player.facing = 0.15;
    game.chase.yaw = 0.15;
    hold(['KeyW'], 70);
  },
  // The title over a drone orbit of the live city.
  title(game) {
    for (let i = 0; i < 420; i++) game.step();
  },
};
