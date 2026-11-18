# PORT SOLARA build notes

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
- perf 196 draw calls / 44,945 triangles / median 1.7-3.1 ms / heap 22-23 MB (was 135 at the
  first run of this session; under the 200 cap, over the 150 target; see debts).
- Originality PASS (30 files). main.ts twice: 37 output files byte-identical, dossier 920,477 bytes.
- Shots: 1-chase.jpg 183.1 KiB (q80), 2-street.jpg 179.2 KiB (q88), 4-title.jpg 189.0 KiB (q76).
  Judge sheet rebuilt; at 50% the cover reads mission, chase, police, helicopter, WANTED, minimap,
  subtitle, radio; the street cell reads on-foot combat, the van, the coupe prompt and Mara.

## Next (M5 Shell and depth)
- Pause, the Tab map (3-map.jpg), save slots, settings, gun shop, respray, side activities, REP
  unlocks; CONTINUE on the title (4-title.jpg final). Breaker shotgun (still cut).

## Bugs / debts (M4)
- Perf view draw calls went to 196 late in the test run (135 earlier the same session): find out
  what stays visible after the autopilot / mission-list tests (scorched shells, police after
  WANTED 5) and trim back toward 150.
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
