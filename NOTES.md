# PORT SOLARA build notes

## Done (M2 Traffic and theft, partial: steps 0-3 of 7, run of 2026-11-18)
- people/pedestrian-crowd.js `PedestrianCrowd`: 32 walkers on the sidewalk ring 1.5 m outside each
  block within 120 m (respawn past 160 m), two instanced meshes (outfit-coloured bodies, heads), bob
  while walking; a car within 9 m coming at them sends them running (4 m/s) toward the building side
  for 2 s; `panic(x, z, r)` hook for gunfire later; `game.walkersNear` feeds the traffic gap check
  so cars brake for them. Crosswalk crossings are not in yet (they turn the corner of their block).
- Self-test now: traffic PASS (24 active, 0 overlaps, closest 2.12 m, up to 7 at a red), peds PASS
  (32 walkers, 0 inside buildings), perf PASS (189 draw calls, 43,037 triangles, median 1.2 ms).
  Dossier 806,536 bytes, 27 output files byte-identical on two runs; originality PASS (20 files).
- Shots re-taken: 1-chase 162.6 KiB, 2-street 165.9 KiB, 4-title 189.9 KiB. Walkers are in frame
  but sparse (one each in 1 and 2): re-stage the cover in step 6.
- README: make.fun badges under the title and the make.fun footer line.
- Lane graph in world/road-network.js: 90 crossing nodes, 322 directed lanes (Palmline Boulevard
  two lanes each way at 4.6/7.2 m, avenues and ruas one at 3 m, right-hand traffic), clearances past
  the zebra stripes, `pointOnLane`, `turnChoices` (no U-turns), handed to features on `game.roads`.
- Traffic signals at the 30 crossings on Palmline, Avenida 4 (x=0) and Avenida 6 (x=120): 22 s cycle
  (8 s green, 2 s amber, 1 s all-red per axis), offsets per crossing; one instanced pole+housing mesh
  and one instanced lamp mesh re-lit only on phase change (2 draw calls). Ticked from the fixed step,
  also on the title so the drone orbit shows them.
- traffic/traffic-drivers.js: `TrafficDriver` (lane following, signal stops with a braking curve,
  amber run-through inside 6 m, gap keeping against every visible car and Wren on foot, boulevard lane
  swap after 3 s blocked, quadratic-curve turns) and `createTrafficPool` (hard cap 24, cars built once
  and recycled, spawn 45-170 m from the focus, despawn past 230 m, 2 refills every 0.5 s). Crossing
  gate: straight and right turns share a crossing with their own axis, left turns need it empty;
  inside a crossing only cars on the exit lane count for the gap.
- New models: Saltrunner pickup, Dockhand van (teal band), Citrine Cab (lime, roof light). Traffic mix:
  Pipit most common, then Promenade, Citrine, Saltrunner, Dockhand.
- F on a traffic car currently takes it straight from the pool (no pull-out animation yet: step 4).

## Self-test after M2 steps 1-2 (SwiftShader, 1280x800)
- boot PASS (city 18-22 ms, 33 cars incl. pool), walk PASS (9.3 m), drive PASS (35.2 m/s, 75 health),
  traffic PASS (24 active after 20 s, 0 overlaps, closest pair 2.82 m, up to 7 waiting at a red),
  perf PASS (175 draw calls, 40,769 triangles, median render 1.1-1.9 ms, heap ~14 MB), console clean.
- Originality PASS (19 files). Dossier 801,346 bytes, 26 output files byte-identical on two runs.
- Shots: 1-chase.jpg 162.8 KiB (traffic and signal heads ahead on Palmline, minimap blips),
  2-street.jpg 165.5 KiB (a Saltrunner passes at the left), 4-title.jpg 189.9 KiB at q76 (cars and
  signals on the grid). No pedestrians yet in any shot.

## Next (rest of M2, in order)
- Step 4 player/car-theft.js `stealNearestCar` (pull-out tween, driver flees, uses
  `game.traffic.detach`), step 5 camera feel + audio/synth-audio.js + skids/smoke, step 6 peds and
  steal tests, re-stage 1-chase.jpg with peds and a braking civilian.

## Bugs / debts (M2)
- Draw calls 189 in the perf view (target 150, cap 200): each traffic car is 2 meshes; instance car
  bodies per kind next, before police land in M3.
- Walkers are boxes (body + head) without legs; give them a leg pair in the instanced set.
- No car-to-car collision: the player's car passes through traffic (traffic does brake for it).
- Traffic ignores walkers until the crowd exists; the Albacore start spot sits in the boulevard's inner
  northbound lane, so traffic behind it swaps to the outer lane after 3 s.
- Left turns at unsignalled crossings wait for an empty crossing, which can queue a short line.

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
- boot PASS (city build 35-41 ms, 10 cars), walk PASS (9.3 m in 3 s, never inside a building),
  drive PASS (35.2 m/s after 4 s; wall hit leaves 75 health, no pass-through), perf PASS
  (146 draw calls, 31,697 triangles, median render 1.6-1.9 ms with gl.finish, heap ~14 MB), console clean.
- The perf median times render() only; a full-frame cover-scene timing comes with traffic in M2.
- Originality: PASS (0 hits).

## Shots
- 1-chase.jpg (~187 KiB): Albacore at 90 km/h up Palmline Boulevard, full HUD, sea + lighthouse. No
  police/traffic/peds yet (M2/M3). Sundial Tower is hidden behind the hotel row from this angle.
- 2-street.jpg (~165 KiB): Wren on foot in the Old Mercado square, Clock Arch, Mercado Central sign,
  parked Pipit. Not yet over-the-shoulder aiming or combat (M4). The "[F] ENTER" prompt is out of
  range in this frame. A handbrake-drift cover was tried and reverted: the camera swung into the hotel wall.
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
