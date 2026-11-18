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
  // The Albacore, just taken from the curb, handbrake-drifts through the Palmline crossing with
  // Rua 5: skid marks and smoke, traffic held at the lights, walkers on the corners jumping clear.
  chase(game, hold) {
    hold([], 600);
    game.crowd.gatherNear(-170, -26, 8, 9);
    game.startPlay();
    game.player.x = game.albacore.x - 2.2; game.player.z = game.albacore.z;
    game.enterOrExit();
    hold(['KeyW'], 144);
    hold(['KeyW', 'KeyD', 'Space'], 22);
  },
  // Wren on foot in Old Mercado's market square, the Clock Arch ahead and a Pipit to take.
  street(game, hold) {
    hold([], 300);
    game.crowd.gatherNear(150, 30, 12, 18);
    game.startPlay();
    game.player.x = 153.5; game.player.z = 81.5; game.player.facing = 0.03;
    game.chase.yaw = 0.03;
    hold(['KeyW'], 85);
  },
  // The title over a drone orbit of the live city.
  title(game) {
    for (let i = 0; i < 420; i++) game.step();
  },
};
