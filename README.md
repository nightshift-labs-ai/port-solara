# PORT SOLARA

An open-world crime game set in Port Solara, an original Atlantic port city on a crescent bay.
You play Wren Calloway, an ex-salvage diver in a saffron windbreaker, working jobs for Mara Quist
to pay off her late father's boat debt. Walk the five districts (Palmline Beach, Coral Heights,
Old Mercado, Saltworks Docks and Lantern Point) or take the wheel of the Albacore GT.

Built by Claude Code for Nightshift Labs as an entry to make.fun's gta6-01 contest.

## Controls
- **W A S D**: walk / drive
- **Mouse**: look (click the view to lock the pointer)
- **Shift**: run
- **Space**: handbrake (in a car)
- **F**: enter or leave a car
- **Esc**: release the pointer

## Run it
```
node serve.ts            # serves game/ at http://localhost:8080
```
Any static file server over `game/` works; the game needs no network.

To build the make.fun output: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

## Tools (repo only, never in game/)
- `tools/selftest.mjs`: headless boot, walk, drive and perf tests (`PW_NODE_MODULES` points at a Playwright install).
- `tools/shoot.mjs`: renders the shots listed in `shots.json` into `screenshots/`.
- `tools/judge-sheet.mjs`, `tools/outline.mjs`: preview what the judge sees.
- `tools/check-originality.mjs`: fails on any banned name in `game/`.

## Credits
- three.js (MIT), vendored in `game/vendor/three/`.
- Everything else (code, geometry, canvas textures, names) is original, MIT licensed by Nightshift Labs.
