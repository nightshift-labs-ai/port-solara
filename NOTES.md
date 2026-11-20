# PORT SOLARA build notes

## M10 arsenal: BREAKER shotgun + GANNET rifle done, explosive dropped (run of 2026-11-20 06:59-07:38 EET)
- (1) Two guns at the END of WEAPONS (saves store ammo by index): BREAKER SHOTGUN (slot 4: 6
  pellets per pull, spread 0.065, 16 per pellet, reach 15 m counted from Wren rather than the
  camera, 0.95 s pump, clip 6 + 30, reload 2.4 s) and GANNET RIFLE (slot 5: 75 damage, 130 m,
  spread 0.0008, 1.15 s bolt, clip 5 + 25, reload 2.8 s). Pellet spread comes from the weapon
  module's own seed, never the world stream; the Wasp and Hornet keep their three rand() calls
  per pull in the same order. One round, one `shots++` and at most one hit counted per pull
  (accuracy can't pass 100%). Every row has a `flash` size (Wasp 0.8, Hornet 0.62, Breaker
  1.08, Gannet 1.0); enemy shots map their flag to 0.62 / 0.8, as before. Gunfire still panics
  walkers and raises WANTED when seen (same path). `cycle(dir)` steps over locked slots and
  wraps, so Q / wheel no longer stall on a locked slot (the old Wasp -> locked Hornet stall is
  fixed too); Digit1-9 select. Two-handed pose and a longer gun for both; Wasp and Hornet poses
  unchanged. CONTROLS: the MOUSE row lists LMB fire, RMB aim and 1-5 / Q / wheel (no new row).
- (2) Brass & Barrel offers the first locked gun in WEAPONS order: Hornet $2,500 at REP 3,
  Breaker $3,800 at REP 4, Gannet $6,500 at REP 5 (`weaponUnlocked(id)`, ranks never go down
  in that order; the prompt reads its rank from the unlocks table). The Hornet career count runs
  only for the Hornet; no count or STATS row for the new guns. Saves carry `weapons.ids`;
  applyState locks any gun the save never knew (old saves: Breaker and Gannet stay locked).
  VERSION stays 1. `DEFAULT_LOCKED` exported and used by PlayerWeapons. The guns are not in
  COMPLETION_WEIGHTS and have no MAP-column row (weights must sum to 100, the column has no
  room, shot 3 shows it), so 3-map.jpg and 4-title.jpg stay byte-identical.
- (3) HUD strip: tile width from the slot count (264 units, 4 apart: 49.6 at five), pictogram
  scale min(1, (w - 14) / 44) = 0.81, slot number 12 units at y+13 so it never touches the
  pictogram, clip only in the tile (17 units, red when low), padlock where the ammo would be,
  the reserve in the held line under the strip, always left-aligned ("HORNET 27/150",
  "BREAKER · RELOADING", 15 units, shrunk if it would pass 248 units, never reaching the REP
  column). New pictograms: pump gun with grooved pump, scoped rifle. Checked at 768x480 (probe
  frames, kept in out/: hud-768-*.png).
- (4) Shots: only 1-chase and 2-seafront re-shot (staging and shot save untouched; the new guns
  show locked there, as the shot save owns neither). A/B in out/ab/before_m10/, pairs
  out/ab/m10-chase-*, m10-seafront-*, m10-sheet-*: kept. Only the bottom-left panel changes; the
  sheet's cover now shows five slots with two padlocks. Judge sheet rebuilt.
- Self-test (SwiftShader, 1280x800): SELFTEST PASS 27/27 (new: arsenal, right after enemy: Q from
  the Hornet with both new guns locked lands on FISTS; one Breaker pull at a gunman 7 m ahead
  does damage, spends one shell and counts one hit; one Gannet round at a gunman 40 m ahead at
  camera pitch 0 does damage and spends one round). The save check now compares the locked
  set before and after. Perf: HIGH 172 draw calls / median 3.0 ms; LOW 112 / 1.6 ms.
- Originality PASS (34 files). main.ts run twice without ulimit: 42 files byte-identical (sha256
  lists compared), dossier 1,117,630 bytes; the text cut still falls inside enemies.js, after
  weapons-and-damage.js (shown whole, 268 lines).
- Shots: 1-chase.jpg 176.6 KiB, 2-seafront.jpg 162.5 KiB, 3-map.jpg 177.4 KiB, 4-title.jpg
  179.1 KiB.
- Dropped: the thrown explosive (it needs a `blastAt(x, z)` split out of explode(car) that keeps
  blown++ / countCarBlownUp in explode only, and a sixth slot would shrink the pictograms to
  0.61 at 768x480). Next: that split, then the explosive on its own slot (never on C).

## M9 on-foot WIDE view: done; seafront reframe tried and not kept (run of 2026-11-20 06:12-06:35 EET)
- (1) C on foot toggles SHOULDER / WIDE (`ChaseCamera.footView`, default 'shoulder', never in
  `view`, not saved in settings); `cycleView` branches on mode, and C in a car still cycles NEAR /
  HIGH with the old code. WIDE (`FOOT_WIDE`): 7.6 m back, 1.9 m right, 5 m up, looking at a point
  16 m ahead of Wren at 1.2 m. The height does not follow the pitch; pitch (clamped to -0.35..0.9)
  tilts the look point one radian per radian, so aimAt and mouse look still work. The spring arm
  marches the WIDE arm and stops at buildings; a pulled-in arm blends height and side back toward
  the shoulder values (by arm / reach), never high straight above her. RMB aim uses the old aim
  view in both. SHOULDER numbers unchanged, so shot 3 and the perf views are the same.
  CONTROLS row: "camera: shoulder / wide on foot · near / high in a car"; title strip unchanged.
  **Note:** hip fire is measured from the camera, so the Hornet's effective reach is about 3 m
  shorter in WIDE.
- (2) Seafront reframe with WIDE (probe: camera 5.00 m up, arm 7.60 m at the frame). Tries: (a)
  the M7 spot: Wren about a fifth of the frame height, left of centre, boulevard and palms, but
  the sea is still a thin line on the right; (b) anchor (7.3, -2.1), looking west at the gunmen:
  sea across the frame, but the sun straight into the lens and an SPD search starts; (c) anchor
  (-3.2, 9.3), yaw 0.73: sea band across the width, lighthouse, gunmen and SUV side-lit, but
  the sun clipped at the left edge, the SPD search box again and a big empty road in front.
- (3) A/B (out/ab/before_m9/, pair out/ab/m9-seafront-*.jpg, try (c) kept as out/ab/m9-try3.jpg):
  **not kept**. In the sheet's cell the sea is still a band of about 5 px and the gunmen become
  dots; the old cell reads the fight better. The old 2-seafront.jpg and the scene (SEAFRONT, no
  footView) restored; all four shots and the judge sheet byte-identical to before.
  The sea lies under the sunset, so a wide sea band and side light pull against each other here.
- Self-test (SwiftShader, 1280x800): SELFTEST PASS 26/26. Perf: HIGH 172 draw calls / median 1.9
  ms / heap 40 MB; LOW 112 / 3.5 ms.
- Originality PASS (34 files). main.ts run twice without ulimit: 42 files byte-identical (sha256
  lists compared), dossier 1,116,277 bytes.
- Shots: 1-chase.jpg 176.0 KiB, 2-seafront.jpg 162.1 KiB, 3-map.jpg 177.4 KiB, 4-title.jpg
  179.1 KiB.
- Next: a seafront frame with WIDE from the north side of the point (sea ahead, sun at the far
  left) once something keeps the SPD from reacting to the fight there.

## M8 career stats + tabbed pause: done, SAVE tab included (run of 2026-11-20 05:48-06:31 EET)
- (1) Career stats (story/career-stats.js owns `game.stats`; `zeroStats`, named `count*` functions,
  `careerFromSave`). Counted silently (no toast, sound or HUD line) at the event sites: cars stolen
  in takeTheWheel's unowned branch (jacks and mission steals), gang members downed in `hurt()`,
  cars blown up in `explode()`, races won and courier jobs in side-activities `finish`, times
  booked (custody), clinic visits, cars sold, Hornet bought, resprays. Police escapes only when
  the escape timer takes the last pip (`had` before `wantedLevel.update` in game.step), never in
  `clear()`; highest wanted is the max after that update; metres driven / on foot are speed x dt
  in the driving and walking branches; time played is `+= dt` after the play gate. No wall clock.
  Saves: a new `career` record key (the old `stats` key untouched, VERSION still 1); applyState
  always sets `game.stats = careerFromSave(s.career)`, so pre-M8 saves and NEW GAME get zeros.
- (2) `completionOf(game)` (story/completion-percentage.js): one % from saved progress only.
  Weights: story 60 (12 each), races 16 (4 each), courier 10, Hornet SMG unlocked 6, first car
  sold 4, first respray 4. Payouts from `mission.reward.cash` ($53,500 in all). The shot save is
  31% (24 + 4 + 3).
- (3) Tabbed pause (ui/menus-and-map.js): Q · MAP · STORY · STATS · CONTROLS · SETTINGS · SAVE · E
  across the top (gold active tab), PORT SOLARA at the right. Esc from play still opens the
  PAUSED list (same items and places) under an unlit tab row; Esc in a tab returns to it, Esc in
  it resumes; Tab/M as before; Q/E step and wrap (from the list E opens MAP, Q opens SAVE).
  Clicks test `pause.tabRects` first; `pause.rects` holds the current view only and only the list
  runs items (SAVE's one box is SAVE NOW). MAP: the map shrinks for the tab row and a legend strip
  under it; the career column (38% of the width) is the completion ring (80-unit %), its six
  rows, STORY n/5 DONE with done / next / locked and payouts, six headline career numbers
  (highest wanted as stars), cash and REP rank. STORY: five mission cards (giver, payout, REP,
  DONE / NEXT / LOCKED). STATS: the ring with weighted rows and bars, and all 15 career rows.
  CONTROLS: the CONTROLS list. SAVE: the three slots from `readAllSlots` and SAVE NOW (shows the
  note from `game.saveGame('Pause menu')`).
- (4) Shot 3 (3-map.jpg, same scene key and shots.json): MAP tab with the ring at 31%.
  `SHOT_CAREER` (9 stolen, 2 escapes, wanted 3, 11.4 km driven, 1.9 km on foot, 3 downed, 1 blown
  up, 1 race, 3 courier, booked once, 0:58 played, no Hornet, sale or respray) goes through
  `careerFromSave` after the play hold, right before the pause opens. A/B (out/ab/before_m8/,
  pairs in out/ab/m8-map-*.jpg and m8-sheet-*.jpg): **kept**. In the sheet's 256x160 cell, the gold
  MAP tab, the ring with its big %, the map and the column blocks read; the old cell was a map
  and a text column. Shots 1, 2 and 4 byte-identical to before.
- Self-test (SwiftShader, 1280x800): SELFTEST PASS 26/26 (new: career, pause-tabs, completion;
  the save check round-trips carsStolen). Perf: HIGH 172 draw calls / median 1.7 ms / heap 38 MB;
  LOW 112 / 1.7 ms (the pause is 2D canvas).
- Originality PASS (34 files). main.ts run twice without ulimit: 42 files byte-identical (sha256
  lists compared), dossier 1,116,254 bytes.
- Shots: 1-chase.jpg 176.0 KiB, 2-seafront.jpg 162.1 KiB, 3-map.jpg 177.4 KiB, 4-title.jpg
  179.1 KiB.
- Weak spots: at 50% the column's 16-unit rows are small (about 8 px), though the ring, tabs
  and career numbers read. The column needs about 480 units of width, so below a 1.3 aspect
  its rows would crowd. "HORNET SMG" counts as done when the Hornet is unlocked, which mission 4
  also does (it does not have to be bought).
- Next: a per-district completion strip on the map; career milestones on the STATS tab.

## M7 seafront shot + weapon strip: done (run of 2026-11-20 05:04-05:31 EET)
- (1) Weapon strip (ui/hud.js, the play HUD, not only shots): the bottom-left panel is now 420 x
  144 units (`VITALS_HEIGHT`; its top is 17 px higher at 1280x800, and the cover's left cruiser,
  down to about y 630, stays clear of it at y 646). `drawVitalsPanel` draws HEALTH and ARMOUR rows (`drawLabelledBar`:
  label, bar, value, all 14-15 units), then `drawWeaponStrip`: one 84x56 tile per slot
  (`drawWeaponTile`) with our own canvas pictogram (`drawWeaponPictogram`: side-on fist, Wasp
  pistol, compact Hornet SMG), the slot number in the corner and the ammo (FISTS ∞, clip/reserve
  at 17/15 units, red when the clip is 3 or less). The held tile is gold-rimmed with a gold
  pictogram; its short name sits under it (with "· RELOADING" in gold while reloading). The locked
  Hornet is dimmed with a padlock (`drawLockMark`) and no ammo. REP moved to its own right column
  (`drawRepColumn`, x 290-404: "REP 4", the rank name shrunk to fit 114 units, its bar). Subtitle
  gap unchanged (panel still 420 wide, gap at mx + 434*s).
- (2) Shot 2 is now **2-seafront.jpg** (`?shot=seafront`; the street scene, its STREET spot and
  2-street.jpg are gone). Mission 4's real defend step: shared save plus 'harbor' done,
  `missions.start(story[3], 2)` (skips Ilse's hand-over) and `arms.give('hornet')`, 75 ticks to
  the first Gilded Hand wave behind the Aurum SUV, then hip fire (no RMB: the 4.2 m arm and fov 62
  keep Wren to about a tenth of the frame width, left of centre) with aimAt + Mouse0 two ticks before
  the frame. Wren stands at anchor (-2, -16) on the boulevard, looking south-west up the shore;
  the sun is just off the right edge, so the gunmen are side-lit, not silhouettes. In frame: palm
  boulevard, beach palms, sand, the bridge, the sea line, AUGUSTIN PELL on the radio. No palms
  added, no spots moved, SHOT_SAVE unchanged. Tries: facing north-west (lighthouse, sun and sea
  in frame) made the gunmen black silhouettes against the sun; the lighthouse sits only about 14
  degrees from the sun from the point, so it is left out.
  **Weak spot:** the sea reads only as a thin teal line at the horizon. The wave spawns about 80 m
  from the water and the on-foot camera is under 2 m up, so a wide sea band would need Wren within
  about 20 m of the shore, and then the gunmen would be tiny.
- (3) A/B (out/ab/before_m7/ vs now; pairs in out/ab/m7-chase-*.jpg and m7-seafront-*.jpg):
  weapon strip **kept** (pictograms, labelled bars and the dimmed Hornet read even in the sheet's
  cover cell); 1-chase is identical outside the bottom-left panel (same file size, 176.0 KiB at
  q76). Seafront **kept**: the set now shows a second place (sunset beachfront with palms) instead
  of a second orange Mercado block; the gunmen are smaller in the sheet cell than the street
  shot's van fight. Judge sheet rebuilt.
- Self-test (SwiftShader, 1280x800): SELFTEST PASS 23/23. Perf: HIGH 172 draw calls / 61,563 tris
  / median 1.4 ms / heap 45 MB; LOW 112 / 45,291 / 1.6 ms (HUD is 2D canvas, no 3D cost).
- Originality PASS (32 files). main.ts run twice without ulimit: 40 files byte-identical (sha256
  lists compared), dossier 1,103,041 bytes.
- Shots: 1-chase.jpg 176.0 KiB, 2-seafront.jpg 162.1 KiB, 3-map.jpg 167.7 KiB, 4-title.jpg
  179.1 KiB.
- Next: a wider sea band in the seafront shot (a defend spot nearer the water would need a
  mission change); Wren further to one side; searchlight on the cover coupe's roof.

## M6 cover v2: done (run of 2026-11-19 18:31-19:04 EET)
- (1) Street fronts (world/city-builder.js, whole game): stucco tints are now limestone, coral,
  teal, saffron, peach and sky-blue plaster (was pale cream/blush). `dressStreetFronts` adds, on
  every street-facing Mercado/Palmline front: striped sloping awnings (canvas stripes x the tint),
  lit shop signs from one canvas atlas of our names (GAIVOTA CAFÉ, BOLO'S FISH FRY, TIDECALL
  MOBILE, CASA CORAL, SALT & LIME, MAREA BAR, FARMÁCIA SOL, PADARIA LUZ; per-instance row via an
  instanced `aRow` attribute), and lamp posts with warm heads on the kerbs. Four instanced meshes,
  no shadow casting, placed by hashes of each building's spot (the seeded random stream and so
  traffic, walkers and parked cars are unchanged). Lamp posts have no collider (walkers' pavement
  rings cross them; a 0.2 m post collider risked the peds test).
- (2) Sky and grade (world/sunlight-and-sea.js, styles/hud.css): sky bands orange 0xff8a3a at the
  horizon -> coral rose 0xee6f6a -> lavender-blue 0x6c78b4 -> deep blue 0x25428a overhead; no
  white haze band; HORIZON/fog 0xf7935e; sun disc 0xffc27a with an orange halo; sun light 0xffa860
  at 3.3; hemisphere lilac sky 0xc4b8e2 over warm sand. **The sun moved** to just north of due west
  (azimuth 0.025 rad) and about 10 degrees up, so it hangs at the end of the east-west streets.
  Final grade: CSS `saturate(1.16) contrast(1.07)` on #city-view only (never the HUD); graphics LOW
  drops it (body.graphics-low, set in applySettings). Bloom stays the halo + bar glow sprites.
  **Brief 9.3 tension:** the run asked for an orange-pink-violet sky; the brief bans a
  pink/purple/orange sunset-gradient title/palette. A first violet zenith made the title read that
  way, so the upper bands went lavender-blue / deep blue; UI and wordmark stay navy and gold.
- (3) Camera (camera/chase-camera.js): `CAR_VIEWS` near (8 m / 3.5 m, fov 65-77, as before) and
  high (9.5 m back, 5.2 m up, aim -0.2 m about 23 m ahead, fov 50-54). C cycles them while
  driving (main.js); in the CONTROLS list, the title strip and the README. The cover uses `high`
  (no shot-only framing any more).
- (4) Cover (dev/screenshot-scenes.js chase): the coupe waits 300 ticks at the Rua 5 kerb at
  x -22 (Old Mercado, so the district card is gone), then runs west at 40 m/s (144 km/h) toward
  the Hotel Meridiana, the boulevard palms and the sun. GULL 11 1 m ahead / 3.7 m left, TIDE 14
  5.5 m ahead / 3.7 m right, CORAL 7 and traffic ahead, walkers on both pavements
  (`gatherNear(-92, -30, 14)`), SKYLARK 1 at 13 m up under NDC (0.06, 0.66), in front of the sun,
  so the SPD list's fourth row is SKYLARK 1 48 m OVERHEAD (real). HUD fit at 1280x800 and on the
  sheet: no panel covers the car, the cruisers or the street centre. The coupe is about 13% of the
  frame width (the sun cannot stay in frame with a narrower lens from this height).
- (5) A/B (out/ab/before.jpg vs the new cover, out/ab/v2-ab-100.jpg and -50.jpg): **kept**; clearly
  more city (coloured facades, awnings, signs, lamps both sides), warmer light, sun at the street
  end, chase still readable. Weak spot: the searchlight washes the coupe's roof toward cream (the
  rear still reads red). 2-street and 4-title re-shot with the new grade and still read (title strip
  now has C CAMERA and still fits); 3-map unchanged in look.
- Self-test (SwiftShader, 1280x800): SELFTEST PASS 23/23. Perf before: HIGH 166 draw calls / 41,751
  tris / median 1.8 ms; LOW 108 / 25,743 / 1.5 ms. After: HIGH 172 / 61,563 / median 2.9 ms /
  heap 43 MB; LOW 112 / 45,291 / 1.5 ms (awnings, signs, posts, heads: +4 calls each view plus the
  instanced triangles). Inside the 300k-triangle and 200-call caps; still over the 150 target.
- Originality PASS (32 files). main.ts run three times: 40 files byte-identical (sha256 compared),
  dossier 1,118,099 bytes.
- Shots: 1-chase.jpg 176.0 KiB (q76), 2-street.jpg 173.2 KiB (q88), 3-map.jpg 167.7 KiB (q92),
  4-title.jpg 179.1 KiB (q80). Judge sheet rebuilt.
- Next: tone the searchlight on the coupe (or a smaller ground disc) so the roof keeps its coral;
  a few signs sit behind the SPD and WANTED panels in the cover; real bloom; lane dashes; round
  minimap; drawn weapon icons; dim the locked Hornet chip.

## M6 cover pass: framing and bounce done, road streak reverted again (run of 2026-11-19 00:45-00:56 EET)
- (1) Framing (screenshot-scenes.js chase): the Albacore starts at x -138 on Rua 5 (was -122; -130
  still left the OSTRA BANK board's corner under the minimap), so the board passes out of frame and
  no sign is cut by a HUD panel. Sun, both flanking Beacons and SKYLARK 1 stay in frame; a crosswalk
  now runs under the coupe and the beach palms replace the left-hand buildings. SPD list row 4 is now
  MERCADO 3 31 m PURSUIT (real distance). A/B vs out/ab/run5-before-1-chase.jpg: kept.
- (2) Bounce light (world/sunlight-and-sea.js): a warm shadowless DirectionalLight (0xffc49a, 0.9)
  from opposite the low sun. The coupe's rear now reads red instead of near-black in the chase toward
  the sun, and the cruisers' bodies read better. On at every graphics level (no extra draw calls).
  A/B: kept. All four shots re-shot with it.
- (3) Road glare streak: tried again (a flat additive 9 x 140 m strip from the eye along the sun's
  bearing at y 0.15, depthWrite false, renderOrder 6, frustumCulled false, positioned in
  `light.follow`) and **reverted**: still nothing visible in the cover. Next suspect: the road or
  crosswalk materials draw after renderOrder 6 or with polygonOffset, or the strip lies left of the
  view (the arm looks 0.2 rad right of the sun); test it alone in an ad-hoc frame with a bright colour.
- Self-test (SwiftShader, 1280x800): SELFTEST PASS 23/23. Perf: HIGH 166 draw calls / 41,751 tris /
  median 1.8 ms / heap 40 MB; LOW 108 / 25,743 / 1.5 ms (before: 166 / 1.7 ms, 108 / 1.8 ms).
- Originality PASS (32 files). main.ts twice: 40 files byte-identical, dossier 1,119,191 bytes
  (it must run without `ulimit -v`, as noted before).
- Shots: 1-chase.jpg 173.3 KiB, 2-street.jpg 173.9 KiB, 3-map.jpg 167.5 KiB, 4-title.jpg 188.6 KiB.
  Judge sheet rebuilt and read at 50%: the red coupe reads, no cut signs.
- Next: the road streak debug above, visible lane dashes, real-speed streaks; round minimap, drawn
  weapon icons, a play-time controls strip.

## M6 cover detail: done except the road streak (run of 2026-11-19 00:31-00:54 EET)
- (1) SKYLARK 1 (police/police-ai.js, screenshot-scenes.js `FRAME`): staged at NDC (0.14, 0.66) and
  30 m up (was 0.2, 0.5, 14 m), so it is about half the size on screen, higher and right of the sun,
  in open sky between the mission panel and the minimap; its searchlight cone still lands on the
  coupe. A white belly plate (in the body mesh) and four glow sprites from the shared bar-glow
  Points (count + 2): a warm lamp under the belly, a red nav light on the left side, a green one on
  the right, a white tail strobe (placed with the group's own matrix). A faint pale rotor disc (+1
  draw call while the helicopter is up). It is now 60 m out, so the SPD list's fourth row is
  MERCADO 3 41 m (real order by distance).
- (2) Road sun streak: tried (an additive warm ground strip along the sun's bearing, in
  `light.follow`) and **reverted**: it did not draw in the cover at y 0.06, 0.12 or 0.2 (the frame
  was the same size every time). Not debugged this run. Lane dashes and speed streaks: not done.
- (3) Police bar halos: sprite size 5.6 (was 3.4) with a hotter, wider core (gradient 1 / 0.8 /
  0.3 / 0). Still the one-draw-call additive Points.
- (4) Albacore rear (vehicles/car-models.js): a small raised spoiler on two trim struts in its own
  paint, a bright bumper line, a dark diffuser with three bright fins and a lit cream plate (in the
  lights mesh, so no extra draw call; the tail glow still finds only the two TAIL boxes).
- (5) Cover speed 40 m/s (`FRAME.speed`): the speed panel reads 144 km/h (was 93), the real speed of
  the staged state (the Albacore's top speed is 62 m/s).
- A/B (out/ab/run4-before-1-chase.jpg vs the new cover, out/ab/run4-ab-100.jpg and -50.jpg): the new
  cover kept (helicopter no longer a black blob, the rear reads as a car, 144 km/h). The coupe is a
  little smaller in frame at the higher speed (about 25% of the width, was 27%).
- Self-test (SwiftShader, 1280x800): SELFTEST PASS 23/23. Perf before (last run): HIGH 166 draw
  calls / 41,655 tris / median 1.4-2.0 ms; LOW 108 / 25,743 / 1.5-2.8 ms. After: HIGH 166 / 41,751 /
  median 1.7 ms / heap 32 MB; LOW 108 / 25,743 / 1.8 ms (the perf view has no helicopter up, so the
  rotor disc's +1 call is not in its count). Inside the 4 ms target and the brief's budget.
- Originality PASS (32 files). main.ts twice: 40 files byte-identical, dossier 1,121,486 bytes.
- Shots: 1-chase.jpg 174.9 KiB, 2-street.jpg 172.2 KiB (the parked Albacore shows its new rear),
  3-map.jpg 167.5 KiB, 4-title.jpg 183.7 KiB. Judge sheet rebuilt and read at 50%: the helicopter
  reads as a lit aircraft in open sky, not a blob.
- Next: find why the ground streak does not draw (check that `light.follow` runs in the shot and
  what covers y 0.2 on Rua 5), then the sun reflection, visible lane dashes on Rua 5 and speed
  streaks driven by real speed; round minimap, drawn weapon icons, a play-time controls strip.

## M6 cover light and staging: done (run of 2026-11-19 00:12-00:47 EET)
- (a) Cover re-staged toward the sun (camera spot moved, sun untouched): the Albacore now runs due
  west on Rua 5 (z -30) from x -122 (already inside Palmline Beach, so no district card rises over
  the sky) toward the Palmline crossing, the beach and the sea; 60 ticks of real sim, then squared
  up at 26 m/s. The arm looks 0.2 rad right of the sun's bearing (`FRAME.sunRight`, yaw from
  `light.sunDir`), so the sun disc and its glow sit upper middle-left between the left-hand
  buildings and the palms. The fourth Beacon comes down Palmline toward the crossing ahead.
- World bug fixed on the way (world/city-builder.js): the inland palm row (boulevard + 15 m) is
  planted 8 m on from the loop's z but only the loop's z was tested against cross streets, so a
  palm stood in the roadway of Rua 5 at (-165, -32) (cars could hit it; it cut the new cover). The
  row now tests its own z.
- (b) Warm grade (world/sunlight-and-sea.js): horizon/fog 0xfab27e (was 0xf7c08e), sky orange
  0xffa45e at the horizon into a soft rose 0xf4a596 band up to 10% of the dome, then blue (no
  purple; the rose stays a band near the horizon, as brief section 9.3 asks); the sun's additive
  halo 220 m (was 150) with a hotter core. Police bar glows (the existing one-draw-call additive
  Points) are 3.4 (was 2.6). No vendored bloom pass (three.js addons are not in vendor/), so no
  extra draw calls: the glow stays the halo quad plus the bar Points.
- (c) Two Beacons flank the coupe (`FRAME.flank`: 6 m ahead / 3.5 m left, 9 m ahead / 3.5 m right;
  the SPD list reads GULL 11 7 m and TIDE 14 9 m), both bars lit; civilian cars inside 14 m go back
  to the traffic pool through its own `despawn`. SKYLARK 1 sits right of the sun (NDC 0.2, 0.5,
  14 m up) with its searchlight on the car.
- (d) A/B (out/ab/run3-before-1-chase.jpg vs the new cover, side by side at 100% and 50% in
  out/ab/run3-ab-*.jpg): the new cover is clearly warmer (sun and glow in frame, orange-rose
  horizon over the sea, lit bars) and every panel reads the same, so it stays. It shows 93 km/h
  (was 145); that is the real speed of the staged state.
- Tail-light glow (vehicles/car-models.js `createTailGlow`, updated in main.js's render): two small
  additive red point sprites (size 1.1) over the driven car's own TAIL lamp boxes, read from its
  spec; off on foot, outside play and at graphics LOW. +1 draw call while driving. In the cover the
  coupe's tail lights now carry a soft red halo (A/B against out/ab/run3-try4.jpg: kept).
- Self-test (SwiftShader, 1280x800): SELFTEST PASS 23/23. Perf before (last run): HIGH 169 draw
  calls / 42,379 tris / median 2.1 ms; LOW 110 / 26,135 / 1.3-1.5 ms. After, two runs: HIGH 166 /
  41,655 / median 1.4-2.0 ms / heap 36-45 MB; LOW 108 / 25,743 / 1.5-2.8 ms (the stray in-road
  palms were instances, so fewer calls and tris; the perf view does not have Wren in a car, so the
  tail glow's +1 call is not in its count). Inside the 4 ms target and the brief's budget.
- Originality PASS (32 files). main.ts twice: 40 files byte-identical, dossier 1,113,826 bytes.
- Shots: 1-chase.jpg 172.9 KiB, 2-street.jpg 168.7 KiB, 3-map.jpg 167.5 KiB, 4-title.jpg 183.7 KiB
  (each at its usual quality). Judge sheet rebuilt: at 50% the cover reads as a sunset police chase
  with the helicopter; street, map and title keep their purpose.
- Next: round minimap, drawn weapon icons, a play-time controls strip (from the earlier list); a
  pedestrian or two in the cover's view (the corner crowd sits behind the SPD panel). Graphics LOW
  still keeps the sun halo and bar glows (two cheap draw calls); the tail glow is off at LOW.

## M6 Polish and freeze: steps 1, 2, 4, 5, 6 (run of 2026-11-18 23:24-23:50 EET); step 3 in the run above
- Step 1 golden hour (world/sunlight-and-sea.js): sun about 15 degrees up in the WSW (was 28),
  warm 0xffbf7a sun at 3.1, hemisphere cool sky 0xb8c6ec over warm sand 0xeaae78 (shadows stay
  blue-tinted, as the brief asks), sky bands gold horizon -> thin rose-peach -> blue (kept off a
  pink/purple sunset palette, brief section 9.3), warmer fog/horizon 0xf7c08e, exposure 1.12. The
  WANTED panel's real sim clock reads FRI 17:35 in the cover, which matches the light.
  **No real bloom pass:** three.js addons (EffectComposer / UnrealBloomPass) are not vendored, so the
  only "glow" is an additive halo behind the sun disc (+1 draw call). Police bars, tail lights and
  signs do not glow yet. LOW keeps the halo (it is one quad).
- Step 2 slim HUD (ui/hud.js): one shared `HUD_SCALE` 0.85 on every size and padding; `panel()` is
  deep navy glass at 80% with a 1 px soft rim and a gold accent strip on the left edge. Contents are
  unchanged. SPD RESPONSE: the distance now sits against its state tag (RESPONDING covered "49 m"
  in the street shot; the bug was there at full size too). Title menu and controls strip (CSS) and
  the map frame use the same slim style. **Not done:** round minimap, drawn weapon icons, a
  bottom-centre controls strip in play (the title strip lists the real bindings).
- Step 3 cover staging: done in the 00:12 EET run (see above). At the time of this run it was **not done** (the camera still faces away from the sun, so the sun disc is
  not in the cover; flanking cruisers and the helicopter are the M4 staging, which already has
  SKYLARK 1 over the street and two Beacons near the Albacore).
- Step 4 shots: all four re-shot on the shared save. 4-title.jpg: the drone now swings 250 m east
  of the Sundial Tower looking west (main.js), so the needle no longer cuts across the top centre;
  the sun glow sits behind the wordmark and the bay haze reads warm.
- Step 5 A/B (before copies in out/ab/): the new cover shows more street (narrower mission and
  SPD panels, right column clear of the cruiser) with a warm horizon and is still readable at 50%,
  so it stays. Judge sheet rebuilt; at 50% it still reads car chase, police, wanted, minimap,
  mission, on foot, combat, map and title.

## Self-test after M6 (SwiftShader, 1280x800): SELFTEST PASS, 23/23
- perf before (M5): HIGH 168 draw calls / 42,235 tris / median 2.6-5.6 ms; LOW 110 / 26,135 /
  0.8-0.9 ms. After (M6, two runs): HIGH 169 / 42,379 / median 2.1 ms / heap 30-51 MB; LOW 110 /
  26,135 / 1.3-1.5 ms. Frame time is far inside the 70 ms budget; HIGH's 169 draw calls are over the 150
  target but under the 200 hard cap, as in M5. (Single runs: medians vary by a few ms.)
- Originality PASS (32 files). main.ts twice: 40 files byte-identical, dossier 1,114,339 bytes.
  (main.ts must run without `ulimit -v 3000000`: Node's TypeScript stripper cannot get its Wasm
  memory under that cap.)
- Shots: 1-chase.jpg 172.4 KiB (q80), 2-street.jpg 169.6 KiB (q88), 3-map.jpg 167.6 KiB (q92),
  4-title.jpg 183.5 KiB (q84). The map side panel now has the slim style too (navy glass, 1 px
  rim, gold left strip).

## Next (rest of M6), as written after the 23:24 run
- Cover staging (done in the 00:12 EET run by heading the chase west on Rua 5): re-aim the chase camera so the low sun sits in frame; glow on police bars and
  tail lights (a vendored bloom pass or additive light-bar halos), measured on SwiftShader.
  Tried and reverted in the 23:43-23:52 EET cover-light run: swinging the chase arm toward the sun
  (yaw +1.15 and +0.55, TIDE 14 moved to the other side) warms the left horizon, but the sun disc
  still falls outside the frame and TIDE 14 drops out of view or behind the right-hand toasts, so
  the A/B kept out/ab/after-1-chase.jpg. The sun is about 112 degrees left of the northbound
  chase, so the real fix is to stage the chase heading south (or west) on Palmline instead of
  swinging the arm.
- Round minimap, drawn weapon icons (fists, Wasp, Hornet), dim the locked Hornet chip.

## M5 Shell and depth: done (steps 3-6 in the run of 2026-11-18 23:05-23:44 EET)
- Step 3 settings (core/save-slots.js `DEFAULT_SETTINGS`, `GRAPHICS_PRESETS`, `applySettings`):
  master, music/radio and effects volume 0-10, mouse sensitivity 0.5-2.0x, graphics HIGH (1024
  shadow map, far 480 m, fog to 420 m) or LOW (no shadows, far 300 m, fog to 260 m; the sky dome
  and sun disc shrink with the far plane). Own localStorage key `port-solara/settings`, also copied
  into every save and put back on load; NEW GAME keeps them. Pause SETTINGS view (arrows or
  clicks, left/right halves) and a title SETTINGS panel (click a row to raise it). Audio has an
  output bus: radio on the music level, engine/tyres/siren/guns on the effects level.
- Step 4 missions/side-activities.js `SIDE_ACTIVITIES` + `SideActivities`, all on [E] at the map's
  places with a prompt over each: four ring-road races from the F flags (loops of real crossings,
  gold checkpoint marker, timer, best time in the save, first win $1,500 / 40 REP, a par run later
  pays a third); courier drops for Mara from Quist Auto on foot (seeded drop 120-260 m out, 80 s,
  $600 / 25 REP, Courier n/10); stolen-car sales at Quist Auto by kind and damage (Albacore $9,000
  ... Pipit $1,100; +25% from rank 4; SPD cars refused); Brass & Barrel ammo ($200 for two clips)
  and the Hornet ($2,500, locked until rank 3 or mission 4's hand-out; `PlayerWeapons.locked` is in
  the save); Pelican Fuel respray ($500, clears WANTED and stands the SPD down, refused while a unit
  sees the car). Banner and GPS follow the running activity. Radio was already done in M3b.
- Step 5 tests and shots. New tests: save (safehouse save, reload, the title's first item reads
  "CONTINUE - Story 3/5 - $18,450", load gives back cash, REP, story, races, courier, best lap,
  weapon slot, unlocked Hornet and the spot), settings (persist over a reload; LOW really drops
  shadows and the far plane), race (Coral Circuit through 4 checkpoints by test teleports, paid
  $1,500, Races 1/4), respray (WANTED 2 unseen -> 0, $500), perf now on a fresh boot at HIGH and LOW.
  `SHOT_SAVE` in dev/screenshot-scenes.js is the one save state of all four shots: missions 1-2 done,
  REP 640 (rank 4 WHEELMAN), $18,450, Races 1/4 (North Ring 0:52.4), Courier 3/10, saved 14:32 at
  Calloway Salvage. 3-map.jpg is the live Tab map on it (Wren moved inland so her arrow clears ring 1
  and a race flag); 4-title.jpg writes it into slot 2 as a real record and re-shows the title, so
  CONTINUE is read back from storage. Title strip shortened (it ran off the right edge).

## Self-test after M5 (SwiftShader, 1280x800): SELFTEST PASS, 23/23
- save, settings, race, respray PASS (above). perf on a fresh boot: HIGH 168 draw calls / 42,235
  triangles / median 2.6-5.6 ms / heap 40-43 MB; LOW 110 draw calls / 26,135 triangles / median
  0.8-0.9 ms (two runs).
  (The old perf view after every test read 195; it now reloads first, so the numbers moved.)
- Originality PASS (32 files). main.ts twice: 40 output files byte-identical, dossier 1,135,730
  bytes (under 1.4 MiB). game/ 2.4 MB.
- Shots: 1-chase.jpg 183.4 KiB (q80), 2-street.jpg 179.6 KiB (q88), 3-map.jpg 168.1 KiB (q92),
  4-title.jpg 177.7 KiB (q72). Judge sheet rebuilt: at 50% it reads car chase, police, wanted,
  minimap, mission, on foot, combat, map and title. Cover and street are the M4 stagings on the
  shared save (the weapon row now says REP 4 · WHEELMAN).

## Next (M6 Polish and freeze)
- Handling, camera, effects, audio mix, perf (draw calls), A/B on judge sheets, README (controls,
  side activities, settings). No new systems.

## Bugs / debts (M5)
- The HUD slot chips still show "3 HORNET" while it is locked (it cannot be selected; dim it).
- Side activity results only toast (no JOB DONE-style card); courier has no package prop.
- Races are crossing loops near each flag, not the full ring road; no rival racers.
- The respray does not change the car's colour (merged vertex-coloured bodies).
- Map district labels are small at 50% on the sheet; Lantern Point's label still sits over the sea.
- The shot save's clock assumes the headless browser runs in UTC (it does here).

## M5 steps 1-2 Pause, map, saves: done (short run of 2026-11-18 22:28-22:48 EET)
- Step 1 ui/menus-and-map.js `installPauseAndMap`: Esc (or P) pauses with RESUME, MAP, SETTINGS,
  SAVE, QUIT TO TITLE (arrows + Enter or a click); Tab (or M) opens the full map. Pausing freezes
  the fixed step (no sim time passes), clears held keys and leaves pointer lock; losing pointer lock
  in play pauses too, because a real browser eats the Esc that ends the lock. `drawCityMap` draws the
  map north-up from the city data: shore from coastX, blocks, roads, district names at the middle of
  each district's blocks (from the same districtAt the game uses, nudged off the story rings), place
  marks from `SPOT_PLAN` snapped to the nearest road crossing (H Calloway Salvage safehouse, $ Quist
  Auto, G Brass & Barrel gun shop, P SPD station, R Pelican Fuel respray, F four ring-road race
  starts), the five story rings (grey tick done, big gold current, dim locked) and Wren's arrow.
  The side panel shows STORY n/5 with the mission list, Races n/4 and Courier n/10 (game.progress),
  REP RANK with its name and bar, cash, the last save time and place, and a legend.
- Step 2 core/save-slots.js: three localStorage slots. Slot 1 is the autosave after every finished
  story mission (MissionRunner.finish); slots 2 and 3 take turns for manual saves. A save holds the
  story (completed ids, step n/5), cash, REP, weapon slot and ammo, owned cars, race/courier counts
  and best laps, sim time and Wren's spot. [E] SAVE AT CALLOWAY SALVAGE shows at the safehouse door;
  pause SAVE works anywhere except during a job or while WANTED. The title shows CONTINUE from the
  newest slot ("CONTINUE - Story 3/5 - $21,000" from a real save in the probe); NEW GAME after a
  quit to title starts over from the boot state. Probe (out/, not committed): save, reload, CONTINUE
  gives back the same cash, REP, story, spot and counts; no console errors.

## Self-test after M5 steps 1-2 (SwiftShader, 1280x800): SELFTEST PASS, 19/19
- The script has 19 tests (boot ... clean-console); the "20/20" in the M4 notes was a miscount, not a
  lost test. perf 195 draw calls / 44,801 triangles / median 4.4 ms / heap 23 MB (same view as M4).
- Not run this short run: main.ts twice, originality check, shots. 1-chase.jpg and 2-street.jpg were
  not re-staged. 4-title.jpg is unchanged (its shot boots with empty storage, so no CONTINUE line yet).

## Next (rest of M5)
- Step 3 settings (volume master/music/effects, mouse sensitivity, graphics low/high) stored with the
  save; the pause SETTINGS item only shows a note for now.
- Step 4 side activities (races, courier, Quist Auto sales, gun shop, respray, REP unlocks); the map
  marks and counters are already in place for them.
- Step 5 tests (save round-trip, settings persist, race, respray) and shots: 3-map.jpg from the Tab
  map, 4-title.jpg with CONTINUE from one seeded save shared by all four shots.

## Bugs / debts (M5 steps 1-2)
- Lantern Point's label sits over the sea on the map: the lighthouse spit is not drawn there.
- Race start 4 snaps to the crossing next to story ring 1 and Wren's start, so the marks crowd.
- The save clock is the browser's local wall time (UTC in headless Chromium).
- No slot picker yet: manual saves rotate between slots 2 and 3; CONTINUE takes the newest.

## M4 Combat and story: done (steps 2-6, run of 2026-11-18 22:01-22:42 EET)
- Step 2 combat/enemies.js `EnemyCrews`: a pool of 6 one-mesh figures (merged vertex-coloured boxes,
  1 draw call each, hidden when free). `CREWS.tidewater` (teal bandana, 70 hp, flee under 22,
  6 dmg, 0.42 s, spread 0.06) and `CREWS.gilded` (black suit, gold pin, 90 hp, 8 dmg). States: move
  (run to the crouch spot 1.7 m past the cover on the far side from Wren), cover (crouched, 0.66
  height, timer), peek (step `PEEK` 3.4 m + 0.9 m per slot sideways past the cover's end, shoot
  with spread that grows with range), flee (run off, retired after 7 s or 60 m), down (slump flat,
  sink after 3 s, retired at 5.5 s; no gore). A hit while in cover draws a peek. Rounds at Wren
  hit inside 0.42 m of her chest unless a wall/car is nearer (fireWeapon now takes an `ignore`);
  armour soaks 60%. LIGHTS OUT at 0 health: -$250 St. Elmo Clinic fee, a running job fails with
  "LIGHTS OUT · ST. ELMO CLINIC -$250", crews cleared. Effects share Wren's pools
  (`PlayerWeapons.showEffect`, tracers 4 -> 6). `PlayerWeapons.give(id)` for mission hand-outs.
- Step 3 combat/car-explosions.js `CarExplosions`: under 45 health a car smokes from the hood,
  under 22 it burns (orange puffs fading to soot), at 0 it blows: additive flash sprite (0.4 s),
  12 instanced debris boxes with gravity and bounce, camera shake by distance (70 m), walkers
  panic within 40 m, combat targets within 6 m take 90, Wren in the car is thrown out (-45),
  on foot within 6 m takes up to 40. Civilian cars stay as scorched shells (original materials
  kept in userData for prop reuse); traffic cars leave the pool; SPD units keep livery and the
  police hook makes a blown Beacon +2 WANTED (ticked before the police). 3 draw calls.
- Step 4 missions: the runner's `eliminate` (props + squad by offsets from the step's spot, done
  when none of the squad still fights) and `defend` (waves on timers, `hold` seconds) are real;
  steps may `give` a weapon; the gold beam hides during fights (GPS keeps the spot); props
  (Tidewater van painted teal, two new Aurum SUVs: black with a gold waist line and grille) are
  parked out of sight and cleared when a job ends. Missions: 2 Market Day (Mara hands over the
  Wasp, walk the market, Tidewater ambush behind their van, $3,000 / 90 REP); 3 The Harbor Run's
  Mercado fight is now three gunmen at the van with the Albacore parked by the stalls (Ilse, then
  "The cargo's in their van - grab it!"); 4 Ledger at Lantern Point (Ilse gives the Hornet, reach
  the crossing nearest the lighthouse, hold 20 s against two Gilded Hand waves from two Aurum
  SUVs with Pell on the radio, $12,000 / 400 REP); 5 Sundown (take a fast car, WANTED 5 to the
  crossing nearest the Gull Bridge's south landing in 4:00 with Roarke and Mara, lose the SPD,
  then the SOLARA COURIER front-page card '"PELL LEDGER SINKS OSTRA BANK" · ROARKE SUSPENDED'
  with cash and REP, then free roam; $25,000 / 600 REP). Portraits: Pell added (swept silver
  hair, black suit, gold pin) beside Mara, Ilse and Roarke.
- SKYLARK 1 is built at `HELI_SCALE` 2 (flies at 22 m; cone and beacons scaled). Cover: placed at
  the screen point NDC (-0.08, 0.40) 13 m up, so it hangs over Palmline above the vanishing point
  with its searchlight cone on the Albacore; the cover now runs 200 ticks on foot first so the
  district card is gone. The "[F] STEAL ..." prompt slides left of the minimap/WANTED column
  instead of covering it.
- Step 5 tests (tools/selftest.mjs): `enemy` (a Tidewater gunman 12 m up the crosshair: first
  Wasp shot hits, hit marker, down in 3 shots, he fires back, retired to the pool), `blast`
  (smoke at 30 health, blast with shake and debris at 0, a blown Beacon = +2), `autopilot`
  (mission 1 to JOB DONE and mission 5 to the SOLARA COURIER card through test-only moves),
  `mission-list` (all five start with their panel; eliminate and defend steps exist).
  2-street.jpg staged per section 3: mission 3 stage 2/6 at WANTED 1, Wren on the left third in
  the shoulder aim with the Wasp, Tidewater gunmen stepping out past the teal Dockhand van under
  the Clock Arch, muzzle flash, an enemy tracer, sparks, the gold hit marker on a gunman, Mara's
  subtitle "The cargo's in their van - grab it!", "[F] STEAL ALBACORE GT" over the parked coupe.

## Self-test after M4 (SwiftShader, 1280x800): SELFTEST PASS, 20/20
- All M1-M3 tests unchanged; combat 5 shots / clip 7 / WANTED 1; enemy 3 shots, Wren 97.6 hp;
  blast PASS (+2 from a Beacon); autopilot m1 JOB DONE in 596 ticks, m5 front page; mission-list 5.
- perf 195-196 draw calls / 44,801 triangles / median 1.7-3.1 ms / heap 20-23 MB in the late perf
  view (under the 200 cap, over the 150 target; see debts). A probe (out/, not committed) read 176-182
  at the perf spot on a fresh boot too, and the same after mission-list / autopilot: the count follows
  the view (traffic, walkers, chunks), not anything left behind by a test. Smoke and debris now hide
  when idle (no draw calls until something smokes or blows).
- Originality PASS (30 files). main.ts twice: 37 output files byte-identical, dossier 920,483 bytes.
- Shots: 1-chase.jpg 183.1 KiB (q80), 2-street.jpg 179.2 KiB (q88), 4-title.jpg 189.0 KiB (q76).
  Judge sheet rebuilt; at 50% the cover reads mission, chase, police, helicopter, WANTED, minimap,
  subtitle, radio; the street cell reads on-foot combat, the van, the coupe prompt and Mara.

## Next (M5 Shell and depth)
- Pause, the Tab map (3-map.jpg), save slots, settings, gun shop, respray, side activities, REP
  unlocks; CONTINUE on the title (4-title.jpg final). Breaker shotgun (still cut).

## Bugs / debts (M4)
- Draw calls 176-196 on Palmline depending on traffic and walkers (target 150): instance car bodies
  per kind and fold sign panels before M5 adds the map and shop.
- Story gating: every ring is open from the start (missions 2-5 do not wait for the one before).
- Defend has no "leave the point = fail" rule; Aurum SUVs are parked props, they do not drive in.
- Enemies do not collide with cars (they stand where the cover math puts them); crates as cover
  are not in (cars only).
- The autopilot moves the focus straight to each marker (test-only), not along the GPS.
- In the street shot two of the gunmen overlap at the van's left end; the third (right end) sits
  behind the WANTED panel.
- SKYLARK 1 in the cover is seen nose-on and still crosses palm fronds.

## M4 step 1 Weapons + cover QA: done (short run of 2026-11-18 21:17-21:44 EET)
- File name: the run brief said src/combat/weapons.js, but the brief's file table (row 14) names
  **src/combat/weapons-and-damage.js** with `fireWeapon`, so that is the file (`fireWeapon` first).
- `fireWeapon(game, from, dir, range)`: hitscan along the crosshair ray (camera forward), 0.4 m
  steps against building boxes from the spatial hash (box `h`), car body boxes in car space (parked,
  traffic, SPD units), `game.combatTargets` (x, z, radius, height, alive, hit(d)) and the ground.
- `WEAPONS`: FISTS (15 dmg, 1.9 m punch), WASP PISTOL (24 dmg, 70 m, 12 + 60, semi-auto, 1.2 s
  reload), HORNET SMG (11 dmg, 50 m, 30 + 150, auto, wider spread). The Breaker shotgun is cut for
  now (next step). `PlayerWeapons`: 1/2/3, Q and the wheel switch; R reloads on foot (still the radio
  in a car); RMB shoulder aim (arm 2.4 m over the right shoulder, fov 50, Wren faces the aim, gun arm
  out, both arms for the Hornet, a dark gun box in hand); LMB fires; own LCG for spread (the world's
  seeded random is untouched). Effects: one additive star sprite muzzle flash (0.06 s), a pool of 4
  additive tracer boxes (0.09 s fade), one 48-point sparks cloud with gravity. Hit marker: four gold
  ticks round the crosshair (0.28 s); the crosshair only shows while aiming or firing on foot. No gore.
  Gunfire panics walkers within 30 m and, if a walker or the SPD sees it, commits `gunfire` (+1 pip,
  at most once per 12 s). Shots on cars take `health` (SPD wrecks come from the M3a hook).
- Input: Mouse0 / Mouse2 in the held set, wheel presses, no context menu on the canvas.
- HUD weapon panel 124 px: weapon name + clip (red at 3 or less) / reserve or RELOADING, slot chips
  "1 FISTS · 2 WASP · 3 HORNET" (gold = held), REP rank on the weapon row's right, its bar beside
  the chips.
- Cover QA: (a) the grey disc under the car was SKYLARK 1's ground spot; it is hidden while Wren is
  in a car (cone kept). (b) SKYLARK 1 is placed by unprojecting a fixed screen point (NDC 0.0/0.38,
  11 m up) so it sits in sky below the mission panel and left of the bank tower. (c) Cover arm
  2.8 m back / 1.55 m up (`FRAME` in screenshot-scenes.js): the Albacore is 336 px of 1280 (26%).
  TIDE 14 is set 11 m ahead / 3.4 m left; with the coupe this large, a cruiser right alongside
  falls behind the SPD panel, so the two cruisers read just ahead over the roof with lit bars
  (their lower bodies sit behind the coupe). (d) The cover's save state holds the Wasp: "WASP 12 / 60"
  with the slot chips.

## Self-test after M4 step 1 (SwiftShader, 1280x800): SELFTEST PASS, 15/15
- New `combat` test: RMB aim (fov < 56), the first Wasp shot at a target 10 m ahead hits, hit marker
  shows, the target drops after 5 shots, clip 7 left, gunfire seen = WANTED 1.
- perf 132 draw calls / 40,187 triangles / median 4.2 ms / heap 22 MB, console clean; all M1-M3
  tests unchanged.
- Originality PASS (28 files). main.ts twice: 35 output files byte-identical, dossier 920,400 bytes.
  (Run main.ts without `ulimit -v`: the cap stops Node's type stripper from reserving Wasm memory.)
- Shots: 1-chase.jpg 188.2 KiB (q80), 2-street.jpg 174.0 KiB (q88), 4-title.jpg 189.0 KiB (q76).
  Judge sheet rebuilt; at 50% the cover reads mission, chase, police, helicopter, WANTED, minimap,
  subtitle, radio and the WASP panel.

## Next (rest of M4)
- Breaker shotgun; enemies.js (Tidewater gunmen, Gilded Hand guards in cover, pooled) registering in
  `game.combatTargets`; explosions; missions 2, 4, 5 and the real Mercado fight; Pell's portrait;
  autopilot and mission-list tests; 2-street.jpg staged with the Wasp aimed, two gunmen behind a
  Dockhand van, flash, tracer, sparks, hit marker.

## Bugs / debts (M4 step 1)
- Cover: the cruisers are not fully in frame beside the coupe (left of it is the SPD panel); a
  shorter SPD panel or no district card on the cover would free that space.
- SKYLARK 1 reads small (11 m up, about 45 m out) between palm fronds.
- No drive-by fire; fists only hit combat targets (no punching walkers, on purpose: no gore).
- The tracer starts at a fixed muzzle point, not the gun mesh's world position.
- Cover re-stage (2026-11-18 21:37 EET): TIDE 14 alongside on the right, 8 m ahead (the left slot sits under the SPD panel), in full; SKYLARK 1 at 14 m in the open sky between the district card and the bank sign; 1-chase.jpg 188.8 KiB (q80). Dossier and originality not re-run.

## M3b Missions: done (steps 2-7 in the run of 2026-11-18 20:55-21:36 EET)
- Cover fixes first: the grey disc round the car was SKYLARK 1's searchlight (cone base 5.2 m, so
  the low chase camera sat inside it); cone and ground disc are now `SPOT_RADIUS` 2.6 m, disc
  opacity 0.1. TIDE 14 is re-set alongside on the left, 4.5 m ahead, after the sim, so it reads in
  full. The clock moved to the WANTED title row (WANTED 21 px, clock 16 px) so it never touches
  the IN SIGHT / SEARCHING tag.
- Step 2 missions/story-missions.js `STORY_MISSIONS`: all five by number, title and giver (1 Fresh
  Off the Ferry / Mara, 2 Market Day / Mara, 3 The Harbor Run / Mara, 4 Ledger at Lantern Point /
  Ilse, 5 Sundown / Mara); 1 and 3 playable, 2/4/5 `locked: 'Needs combat (M4)'`.
  Mission 1: Mara dialogue, goto the Meridiana valet lane, steal any car, deliver to Quist Auto
  (-90, 270), Mara's payoff; $5,000 and 120 REP. Mission 3: goto the Mercado, **the Mercado fight is
  a dialogue beat (Ilse, Mara) until M4 combat**, steal the Albacore (moving marker on the car,
  WANTED 3 on entry), lose the SPD and head for the Docks (0, 210) with a 3:00 timer and Mara /
  Roarke on the radio, park at the Docks, payoff; $8,500 and 260 REP. `REP_RANKS` (six ranks),
  `rankFor`, `SPEAKERS`. Start rings (small gold beam + ring, 2 draw calls each, hidden while a
  mission runs or once done) and numbered gold minimap blips clamped to the map edge; walking or
  driving within 5 m starts the mission. Free roam's banner names the next open story mission.
- MissionRunner now: `lines` subtitles on any step, `target(game)` moving markers, `start(m, step)`,
  REP and `completed`, custody fails the running job (IN CUSTODY), `resultCard()`.
- Step 3 GPS: `game.planRoute` = lane-graph A* (`routeOverLanes`) from the crossing nearest Wren to
  the one nearest the goal, re-planned every 30 ticks or when the goal moves 4 m; thick gold line
  (13 px). Goal = mission marker, else the next open start ring, else Quist Auto. Result cards:
  "JOB DONE" + mission name + "TIME m:ss · +$cash · +REP", or "JOB BLOWN" + reason ("OUT OF TIME",
  "IN CUSTODY") + "RETRY AT THE GOLD RING"; 6 s with fades.
- Step 4 subtitles in the gap between the health and speed panels on their baseline: canvas
  portrait chip (flat faces: Mara hair-bun, Ilse teal bandana, Roarke SPD cap with gold badge),
  gold speaker name, wrapped text. REP bar and "REP n · RANK" on the weapon row. Toast
  "VEHICLE STOLEN: <car>" on a car's first theft.
- Step 5 radio: `RADIO_STATIONS` in audio/synth-audio.js (GULL FM 101.4, LOW TIDE 88.2, HEAT 96;
  invented songs and artists, 95 s per song), a 16-step lookahead sequencer (bass + lead
  oscillators per step into one bus, only after the audio unlock, only in a car). R switches Gull
  FM / Low Tide; Heat 96 takes over at WANTED 3+. Chip over the speed panel: level meter, station,
  "song — artist". Title strip and CONTROLS list name R and the gold ring.
- Step 6 tests: `mission` (start rings not inside buildings, walk into ring 1, through all 5 stages
  with teleports, panel header + live distance, JOB DONE card, +$5,000, +120 REP, marked done) and
  `gps` (route from Palmline to mission 3's marker: 8 points, every inner point a crossing, legs
  axis-aligned, ends at the marker, 345 m for 319 m straight). Cover re-staged per brief section 3:
  mission 3 stage 4/6 at WANTED 3 with the 2:58 timer and NEXT line, Mara subtitle with portrait,
  REP 3 · RUNNER, gold GPS + police blips, HEAT 96 chip, cruisers with lit bars, SKYLARK 1, traffic,
  walkers. 2-street.jpg is the same save state one step earlier (mission 3 stage 1/6, 47 m to the
  Mercado marker).
- Outline: wanted-level.js now leads with `WantedLevel` (constants moved below the class); main.js
  imports follow the brief's table (police, missions, then camera, HUD, minimap, menus, audio).

## Self-test after M3b (SwiftShader, 1280x800): SELFTEST PASS, 14/14
- boot 34 ms, walk 9.3 m, drive 35.2 m/s, traffic 24 / 0 overlaps / 7 at a red, peds 32 / 0
  inside, steal, wanted (cleared after 11 s), skid 82 strips / 13 puffs, police (4 cruisers,
  roadblock, helicopter, 69 -> 8 m), custody 2.53 s, mission (5 stages, JOB DONE, $5,000, 120 REP),
  gps (8 points on the grid), perf 127 draw calls / 39,337 triangles / median 1.4-2.5 ms / heap
  16-18 MB in the perf view, console clean. The cover-scene draw count was not re-measured this run
  (171 at M3a with all police up; the mission marker adds 2, start rings are hidden in a mission).
- Originality PASS (27 files). main.ts twice: 34 output files byte-identical, dossier 916,339 bytes.
- Shots: 1-chase.jpg 188.4 KiB (q80), 2-street.jpg 170.7 KiB (q88), 4-title.jpg 189.0 KiB (q76).
  Judge sheet rebuilt; at 50% the cover reads mission, chase, police, helicopter, WANTED, minimap,
  subtitle and radio.

## Next (M4 Combat and story)
- weapons-and-damage.js `fireWeapon`, Tidewater gunmen; replace mission 3's Mercado dialogue beat
  with the fight; missions 2, 4 and 5 as step lists; shot 2 final (aiming, muzzle flash).

## Bugs / debts (M3b)
- The cover is at the 190 KiB limit (188.4 KiB at q80); any more detail drops its JPEG quality.
- The left HUD column (mission panel, district card, SPD RESPONSE) is tall in the cover; the
  district card could skip the cover once the map shot carries districts.
- GPS's first leg runs straight from Wren to the nearest crossing (it can cut a block corner when she
  stands mid-block or in a plaza).
- A start ring is entered by distance only; there is no "[F] start" prompt or briefing card yet.
- Mission 3's ring is open before mission 1 is done (no story gating yet; M5 save carries progress).
- Radio is not saved and has no volume setting (M5 settings).

## M3b steps 0-1 (run of 2026-11-18 20:21-20:37 EET)
- Step 0 cover QA: tyre smoke is now one Points object of soft round sprites (64 px radial-gradient
  CanvasTexture, per-puff size 0.35 -> 1.25 m and alpha 0.42 fading to 0 within 1 s), emitted half
  as often, half a metre behind the rear wheels and drifting back, so it trails the car instead of
  covering it. Cover start z 60 -> 56 so no median trunk stands in front; SKYLARK 1 is re-placed
  after the sim (car + 7, -30) so it is in frame with its searchlight. The bottom-left panel no
  longer repeats the district (title card only); its right slot is kept for ammo/REP.
  1-chase.jpg re-shot: 171.7 KiB (q80).
- Step 1 missions/mission-runner.js `class MissionRunner`: data step lists (goto, steal, deliver,
  chase, loseWanted, dialogue; eliminate/defend are timed stubs for M4; any step may carry
  `seconds` (fails with OUT OF TIME) and `heat` (raises WANTED on entry)). Each step sets the panel
  text, a gold beam + ring world marker (2 draw calls, hidden with no mission) and `missions.target`,
  which the minimap GPS route now aims at. Finishing sets `result` {passed, time, cash, rep} and pays
  the cash. HUD: while a mission runs, the banner is the mission panel ("MISSION 3/5 · THE HARBOR
  RUN", objective with live distance "Reach the Docks · 0.3 km", STAGE n/m bar, step timer m:ss
  flashing under 10 s, "NEXT · ..." line); the district card and SPD RESPONSE stack under its real
  height, so nothing overlaps. Test hooks `startMission(m)` and `missionState()`; a probe ran a
  3-step mission to a passed result with no console errors.
- HUD fix: the WANTED panel always keeps its tag row, so the clock no longer sits on "WANTED" (or on
  the cash) when no pips are lit.
- Self-test after step 1: 12/12 SELFTEST PASS (no mission test yet; that is step 6); skid 13 puffs
  alive; perf 152 draw calls / 41,207 triangles. Originality PASS (26 files). main.ts twice: 33
  output files byte-identical, dossier 896,204 bytes (run main.ts without the `ulimit -v` cap: under
  it Node's TypeScript stripper cannot reserve its Wasm memory). Shots: 1-chase.jpg 171.7 KiB,
  2-street.jpg 172.1 KiB and 4-title.jpg 189.6 KiB unchanged from M3a. Judge sheet not rebuilt yet.
- Next (step 2 on): story-missions.js STORY_MISSIONS (all five by name and giver, 1 and 3 playable;
  mission 3's Mercado fight becomes a short dialogue/escape step until M4 combat), start markers in
  the world and on the minimap; lane-graph gold GPS route (planGridRoute is still the old 3-leg
  grid route); result cards (own wording); dialogue portraits, REP bar, toasts; radio chip; mission
  and gps self-tests; re-stage the cover with the mission panel.

## Done (M3a Police: complete, steps 1-7, run of 2026-11-18 19:51-20:30 EET)
- Step 2 police/police-ai.js `dispatchPoliceUnits` (file named police-ai.js by run direction; the
  brief's table says police-response.js, the first declaration is the same): a pool of 6 units built
  once (Beacon cruisers GULL 11, TIDE 14, CORAL 7, MERCADO 3; Bulwark SUVs ANCHOR 40/41) in SPD
  livery (white over navy sill, gold waist band, push bar; Bulwark navy with white roof), body + light
  bar = 2 draw calls each; the bar swaps two vertex-coloured geometries 6x/s, and one additive Points
  object glows over every bar half (1 draw call). Response: 1 = one cruiser, 2 = two, 3 = four + a
  two-Bulwark roadblock 120 m ahead (toast ROADBLOCK AHEAD), 4+ = all six, Bulwarks RAMMING. Far
  units route over the lane graph with A* (re-planned each second) to Wren's spot 2 s ahead; inside
  40 m odd units ride alongside at 3.6 m, even units aim for the rear quarter (PIT: a contact turns
  her car 0.22 rad and dents it), inside 6 m it is RAMMING. Stuck units reverse for 1.1 s; units past
  230 m recycle; a wrecked unit is +2; a hard hit by the player is a cop assault (+2). Line of sight:
  any unit within 90 m with no building box on the line (sampled every 4 m) => IN SIGHT.
  HUD: SPD RESPONSE panel (call sign, distance, coloured tag PURSUIT/RAMMING/ROADBLOCK/SEARCHING/
  RESPONDING/OVERHEAD, "+N more units in the search zone"); flashing red/blue minimap blips, clamped
  to the map edge.
- Step 3 SKYLARK 1 helicopter at WANTED 3+ (the brief's 5, moved to 3 for the cover): merged body,
  spinning main and tail rotors, belly beacons, additive searchlight cone and ground disc; flies in
  from 160 m at up to 60 m/s, circles 26 m ahead of Wren at 18 m; sees her from 140 m.
- Step 4 SPD siren in audio/synth-audio.js (square voice, band-pass, our 740/990/740/880 Hz four-beat
  with a glide, level from the nearest unit; only after the audio unlock click). IN CUSTODY after
  2.5 s under 2 m/s within 6 m of a unit: navy fade card "IN CUSTODY / BOOKED AT SPD PALMLINE POST ·
  BAIL -$400", heat cleared, police reset, respawn on foot at the nearest of two SPD posts.
- Step 5 HUD: district card = name + one line per district (lore `districtLines`), full for 2.5 s then
  a 0.6 s fade; police toasts under the WANTED panel; "FRI 17:32" clock from game time (17:20 + 1 min
  per second of play); while WANTED the banner reads "LOSE THE SPD - BREAK LINE OF SIGHT" with the
  real escape timer.
- Step 6 tests: wanted (now with the SPD stood down so the unseen timer is measured), police, custody.
  1-chase.jpg re-staged: WANTED 3 save state (witnessed theft + cop assault), the Albacore at 26 m/s on
  Palmline, MERCADO 3 at the Rua 5 side street; after 100 ticks the other units and SKYLARK 1 are
  placed round the car (alongside left, ahead right, ahead left) and 0.53 s of real sim runs (pursuit
  -> RAMMING tags, handbrake flick, smoke). Camera framing 4.6 m back, 1.9 m up (shot only).

## Self-test after M3a (SwiftShader, 1280x800): SELFTEST PASS, 12/12
- boot (23 ms), walk 9.3 m, drive 35.2 m/s, traffic 24 / 0 overlaps / 7 at a red, peds 32 / 0
  inside, steal, wanted (6 witnesses -> 1 pip, cleared after 11.0 s = escape), skid, police (WANTED
  3: 4 cruisers + roadblock + helicopter, nearest 69 -> 8 m in 4 s, IN SIGHT), custody (after 2.53 s,
  bail 400, pips 0, respawned on foot at -169,13), perf 152 draw calls / 45,047 triangles / median
  1.1 ms / heap 20 MB in the perf view (171 draw calls with all police and the helicopter up), clean.
- Originality PASS (25 files). main.ts twice: 32 output files byte-identical, dossier 894,629 bytes
  (after the last cover tweak: TIDE 14 alongside left in full, GULL 11 ahead in PURSUIT).
- Shots: 1-chase.jpg 174.2 KiB (q80), 2-street.jpg 172.1 KiB (q88), 4-title.jpg 189.6 KiB (q76).
  Judge sheet rebuilt; at 50% the cover reads chase, police, helicopter, WANTED, minimap, banner.

## Next (M3b)
- Mission runner with missions 1 and 3, GPS to mission markers, result cards (JOB DONE, LIGHTS OUT),
  then the cover banner as STORY 3/5 - THE HARBOR RUN (no mission text in shots until it exists).

## Bugs / debts (M3a)
- Cover: MERCADO 3 hugs the right frame edge next to the camera (its bar is out of frame); the bars
  that read are on GULL 11 and the roadblock ahead. A median palm trunk fills the left foreground.
- Tyre smoke is still grey low-poly balls; at the low cover camera they sit in front of the car.
- Police cars do not collide with traffic cars or parked cars (only with buildings and Wren).
- Level 2 "they shoot" waits for combat (M4); respray not in yet.
- The helicopter cannot keep up with a car faster than 60 m/s; it trails until the car slows.
- Police routing aims at crossing centres; on the boulevard that is the palm median (palms are not
  colliders, so it works, but looks odd from above).

- M3a step 1 (2026-11-18): police/wanted-level.js `WantedLevel` (theft seen within 25 m +1, pedHit/gunfire +1, copAssault/cruiserWrecked +2, 5 pips, escape 8 s + 3 s/pip unseen) hooked into both theft paths; HUD IN SIGHT / SEARCHING Ns tag under the pips, dashed minimap search circle (60 m + 25 m/pip) round the last-seen spot; `copsSee` is a stub until step 2; wanted self-test PASS (6 witnesses -> 1 pip, cleared after 11 s), 10/10 PASS, perf 152 draw calls; 1-chase.jpg re-shot (WANTED 1, SEARCHING), 2/4 unchanged. Next: step 2 police-ai.js.

## Done (M2 Traffic and theft: complete, all 7 steps, runs of 2026-11-18)
- Step 4 player/car-theft.js `stealNearestCar`: F within 6 m of a traffic car detaches it from the
  pool, brakes it hard, tweens Wren to the driver's door (0.35 s), drags the driver out past her with
  a stumble (0.6 s), then puts her in the car; the driver sprints off (5.5 m/s for 7 s, turning along
  walls) as one of 3 pooled figures; walkers within 14 m panic. Parked cars open at once (with the
  car alarm). Prompt reads "[F] STEAL <car>" until a car is yours, then "[F] ENTER". Input is locked
  while the jacking plays (`game.theft`).
- Step 5 feel: chase camera has a position spring (12/s, snaps on mode change), heading lag that
  loosens in a slide so the flank shows, look-ahead 6-13 m with speed plus a velocity lean, FOV 65-77.
  audio/synth-audio.js (first declaration `playSiren`, used today as the car alarm; the SPD will use
  it in M3): engine = saw + sub-octave square through a rev-following low-pass over 5 gears, tyre
  squeal = looped seeded noise through a band-pass opened by slip and handbrake. Audio is created
  only on the NEW GAME click or a canvas click (never in tests/shots). vehicles/skid-marks-and-smoke.js
  `SkidMarksAndSmoke`: 600 instanced strips in a ring buffer under the rear wheels and 48 instanced
  puffs (1 s life), driven by sim ticks only. DrivableCar now exposes `slip`, `throttle`, `handbrake`.
- Step 6: steal and skid self-tests (traffic and peds tests already in). 1-chase.jpg re-staged: 10 s
  of live sim, 8 walkers gathered on the Rua 5 corners (`PedestrianCrowd.gatherNear`, staging only),
  the Albacore taken from the curb runs north 2.4 s and handbrake-drifts right into the Palmline x
  Rua 5 crossing (smoke, skid marks, two cars held at the red, walkers on the corner, sea and lighthouse).
  2-street.jpg: walkers under the Clock Arch, Wren within reach of the Pipit so "[F] STEAL PIPIT" shows.
- District title card (brief section 1 rival bar, M2): on entering a district the HUD shows the road
  under you (gold) and the district (white, 38 px) under the banner for 4.5 s; district is tracked in
  the fixed step and the card is stamped with sim time. Title strip says "F STEAL/EXIT CAR".

## Self-test after M2 (SwiftShader, 1280x800)
- boot PASS (city 19-34 ms, 33 cars incl. pool), walk PASS (9.3 m), drive PASS (35.2 m/s, 75 health),
  traffic PASS (24 active after 20 s, 0 overlaps, closest 2.12 m, up to 7 waiting at a red), peds PASS
  (32 walkers, 0 inside buildings), steal PASS (Saltrunner jacked, Wren in it, car left the pool,
  driver running 6.1 m away after 1.5 s), skid PASS (82 strips, 24 puffs alive, slip 16), perf PASS
  (158 draw calls, 46,213 triangles, median render 1.0-2.1 ms, heap 15 MB), console clean.
- Originality PASS (23 files). main.ts twice: 30 output files byte-identical, dossier 847,436 bytes.
  main.ts runs without `ulimit -v` (Node's TypeScript wasm cannot allocate under it).
- Shots: 1-chase.jpg 175.9 KiB, 2-street.jpg 167.4 KiB, 4-title.jpg 189.6 KiB (q76). Judge sheet
  rebuilt; at 50% the cover reads as a car drifting through a busy crossing with banner, district
  card, minimap, WANTED and speed. Police are not in any shot yet (M3).

## Next (M3 Police and first missions)
- police/wanted-level.js `WantedLevel` (theft seen within 25 m +1: hook it into `stealNearestCar`),
  police/police-response.js with Beacon/Bulwark models, `playSiren` on the cruisers, search circle,
  custody and LIGHTS OUT, mission runner with missions 1 and 3, then re-stage the cover per section 3.
- Instance car bodies per kind before police land (draw calls).

## Bugs / debts (after M2)
- The cover has two near civilian cars and a few far ones; section 3 wants three with one braking
  (no brake lights yet: tail lamps are part of the merged body).
- Tyre smoke is low-poly icosahedra at one opacity; near the camera the trail reads a little blocky.
- Parked theft is instant (brief says 1 s with an alarm; the alarm is in, the delay is not).
- Jacked-driver figures are 6 meshes each (up to 3 visible for 7 s); fold into the crowd instancing.
- Walkers in 2-street.jpg are far (under the arch); the crowd still only walks block rings, not plazas.

## Earlier M2 steps (1-3)
- people/pedestrian-crowd.js `PedestrianCrowd`: 32 walkers on the sidewalk ring 1.5 m outside each
  block within 120 m (respawn past 160 m), two instanced meshes (outfit-coloured bodies, heads), bob
  while walking; a car within 9 m coming at them sends them running (4 m/s) toward the building side
  for 2 s; `panic(x, z, r)` hook for gunfire later; `game.walkersNear` feeds the traffic gap check
  so cars brake for them. Crosswalk crossings are not in yet (they turn the corner of their block).
- Self-test now: traffic PASS (24 active, 0 overlaps, closest 2.12 m, up to 7 at a red), peds PASS
  (32 walkers, 0 inside buildings), perf PASS (189 draw calls, 43,037 triangles, median 1.2 ms).
  Dossier 806,536 bytes, 27 output files byte-identical on two runs; originality PASS (20 files).
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

## Self-test after M2 steps 1-2 (SwiftShader, 1280x800)
- boot PASS (city 18-22 ms, 33 cars incl. pool), walk PASS (9.3 m), drive PASS (35.2 m/s, 75 health),
  traffic PASS (24 active after 20 s, 0 overlaps, closest pair 2.82 m, up to 7 waiting at a red),
  perf PASS (175 draw calls, 40,769 triangles, median render 1.1-1.9 ms, heap ~14 MB), console clean.
- Originality PASS (19 files). Dossier 801,346 bytes, 26 output files byte-identical on two runs.
- Shots: 1-chase.jpg 162.8 KiB (traffic and signal heads ahead on Palmline, minimap blips),
  2-street.jpg 165.5 KiB (a Saltrunner passes at the left), 4-title.jpg 189.9 KiB at q76 (cars and
  signals on the grid). No pedestrians yet in any shot.

## Bugs / debts (from M2 steps 1-3, still open)
- Draw calls 189 in the perf view (target 150, cap 200): each traffic car is 2 meshes; instance car
  bodies per kind next, before police land in M3.
- Walkers are boxes (body + head) without legs; give them a leg pair in the instanced set.
- No car-to-car collision: the player's car passes through traffic (traffic does brake for it).
- The Albacore start spot sits in the boulevard's inner northbound lane, so traffic behind it swaps to
  the outer lane after 3 s.
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
