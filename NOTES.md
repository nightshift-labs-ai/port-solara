# PORT SOLARA build notes

## Done (M1 City slice)
- Plumbing: kit starter replaced; three.js (MIT) vendored in game/vendor/three; index.html with one
  import map, one module script, styles/hud.css and the ids city-view, hud-overlay, title-screen,
  pause-map, mission-briefing, save-slots; main.ts clears its output copies so runs are byte-identical.
- World: crescent bay opening west, street grid (9 avenues x 10 ruas, 20 m Palmline Boulevard with a
  double median of palms), all five districts (Palmline Beach, Coral Heights, Old Mercado, Saltworks
  Docks, Lantern Point), landmarks (Sundial Tower, Hotel Meridiana, Mercado square + Clock Arch,
  coral-red cranes, salt pyramids, Quist Auto, lighthouse, Gull Bridge), canvas facades tiled per
  instance, 10 sign textures with our brands. Late-afternoon sun (~28 degrees), hemisphere fill, ACES,
  fog 140-420 m, sky dome, glinting sea.
- Wren on foot (walk/run, capsule vs building boxes via the spatial hash, walk cycle).
- Chase camera: on-foot spring arm with wall pull-in and mouse look (pointer lock); car mode 8 m back,
  3.5 m up, heading lag, speed FOV, impact shake.
- Cars: bicycle model with speed-narrowed steering, lateral grip blend (handbrake drifts), wall
  push-out with bounce and damage. Albacore GT + 9 parked Pipits/Promenades. F enters/exits.
- HUD frame (navy glass, warm-white outline, sizes per brief section 2): objective banner (free roam,
  route to Quist Auto), rotating rounded minimap with gold GPS grid route and car blips, WANTED with
  5 shield pips (all unlit in M1), cash, health/armour/weapon/district, speed arc + car name, prompt.
- Title: canvas wordmark (navy caps, sand outline, gold sun stamp, half sun with 9 rays), NEW GAME,
  CONTROLS, controls strip, drone orbit of the live city.
- Dev: src/dev/screenshot-scenes.js and test-hooks.js, loaded by literal dynamic import only with
  ?shot= / ?test=.
- Tools: selftest.mjs (boot, walk, drive, perf, clean console), shoot.mjs, judge-sheet.mjs,
  outline.mjs, check-originality.mjs.

## Self-test (SwiftShader, 1280x800)
- boot PASS (city build ~41 ms, 10 cars), walk PASS (9.3 m in 3 s, never inside a building),
  drive PASS (35 m/s after 4 s; wall hit leaves 75 health, no pass-through), perf PASS
  (146 draw calls, ~32k triangles, median render 1.9 ms with gl.finish), console clean.
- Originality: PASS (0 hits).

## Shots
- 1-chase.jpg (~187 KiB): Albacore at 90 km/h up Palmline Boulevard, full HUD, sea + lighthouse. No
  police/traffic/peds yet (M2/M3). Sundial Tower is hidden behind the hotel row from this angle.
- 2-street.jpg (~165 KiB): Wren on foot in the Old Mercado square, Clock Arch, Mercado Central sign,
  parked Pipit. Not yet over-the-shoulder aiming or combat (M4).
- 4-title.jpg (~188 KiB): wordmark over Coral Heights and the Sundial Tower. No CONTINUE yet (M5).
- 3-map.jpg: not taken (M5).
- Dossier: ~795 KiB, byte-identical on two runs.

## Bugs / debts
- Draw calls (146) are close to the 150 target: merge sign panels or instance car bodies in M2.
- Car-to-car collision is not in yet; parked cars can be driven through.
- Market stalls read as brown slabs; give them awnings with stripes.
- One 256 canvas per facade archetype instead of a single 1024 atlas.
- Palmline Boulevard runs straight along the beach, not diagonal.
- Under `ulimit -v 3000000` Node cannot start its TypeScript wasm, so main.ts runs without it.

## Next (M2 Traffic and theft)
- Road graph from road-network.js, lights, traffic drivers, pedestrians, carjacking, Saltrunner,
  Dockhand, Citrine Cab, chase-camera feel, engine/tyre audio, skids and smoke.
