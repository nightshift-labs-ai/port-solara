// Three save slots in localStorage. Slot 1 is the autosave written after every finished story
// mission; slots 2 and 3 take turns for saves made at Calloway Salvage or from the pause menu.
// A save holds the story step, cash, REP, weapons and ammo, owned cars, side activity counts,
// the sim time and where Wren stood.
export const SAVE_SLOTS = 3;
export const AUTOSAVE_SLOT = 1;
const KEY = 'port-solara/save-slot-';
const VERSION = 1;

export function captureState(game, place) {
  const f = game.focus;
  return {
    version: VERSION,
    story: [...game.missions.completed],
    storyStep: Math.min(game.story.length, game.missions.completed.size + 1),
    storyOf: game.story.length,
    cash: game.cash,
    rep: game.missions.rep,
    weapons: { slot: game.arms.slot, ammo: game.arms.ammo.map((a) => ({ clip: a.clip, reserve: a.reserve })) },
    cars: game.cars.filter((c) => c.owned && !c.ai).map((c) => c.name),
    stats: { races: game.progress.races, courier: game.progress.courier, bestLaps: { ...(game.progress.bestLaps || {}) } },
    time: Math.round(game.time * 100) / 100,
    at: { x: Math.round(f.x * 10) / 10, z: Math.round(f.z * 10) / 10, facing: game.player.facing },
    place,
    settings: { ...(game.settings || DEFAULT_SETTINGS) },
  };
}

// Puts a saved state back into the running game: story, money, REP, arms, counts and Wren on foot
// where she saved.
export function applyState(game, s) {
  game.missions.completed = new Set(s.story);
  game.missions.rep = s.rep;
  game.cash = s.cash;
  if (s.weapons) {
    s.weapons.ammo.forEach((a, i) => { if (game.arms.ammo[i]) { game.arms.ammo[i].clip = a.clip; game.arms.ammo[i].reserve = a.reserve; } });
    game.arms.slot = s.weapons.slot || 0;
  }
  for (const c of game.cars) if (!c.ai && s.cars?.includes(c.name)) c.owned = true;
  game.progress.races = s.stats?.races || 0;
  game.progress.courier = s.stats?.courier || 0;
  game.progress.bestLaps = { ...(s.stats?.bestLaps || {}) };
  if (s.savedAt) game.progress.savedAt = { clock: clockOf(s.savedAt), place: s.place };
  if (s.settings) { applySettings(game, s.settings); writeSettings(game.settings); }
  if (game.vehicle) game.enterOrExit();
  game.player.x = s.at.x; game.player.z = s.at.z; game.player.facing = s.at.facing || 0;
  game.focus = game.player;
  game.chase.yaw = game.player.facing;
  game.wantedLevel.clear?.();
}

// Settings: volumes 0-10, mouse sensitivity 0.5-2.0, graphics LOW or HIGH. They live under their
// own key (so the title already uses them) and ride along in every save.
const SETTINGS_KEY = 'port-solara/settings';
export const DEFAULT_SETTINGS = { master: 8, music: 7, effects: 8, sensitivity: 1, graphics: 'high' };
// Graphics presets the perf test measures: shadow map size (0 = off), far plane and fog end.
export const GRAPHICS_PRESETS = {
  high: { shadow: 1024, far: 480, fogFar: 420 },
  low: { shadow: 0, far: 300, fogFar: 260 },
};

export function readSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { ...DEFAULT_SETTINGS }; }
}

export function writeSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Puts settings into the running game: the audio mix, mouse look speed and the graphics preset.
export function applySettings(game, settings) {
  game.settings = { ...DEFAULT_SETTINGS, ...settings };
  const st = game.settings, g = GRAPHICS_PRESETS[st.graphics] || GRAPHICS_PRESETS.high;
  game.audio?.setMix?.({ master: st.master, music: st.music, effects: st.effects });
  game.lookScale = st.sensitivity;
  const sun = game.light?.sun;
  game.renderer.shadowMap.enabled = g.shadow > 0;
  if (sun) {
    sun.castShadow = g.shadow > 0;
    if (g.shadow > 0 && sun.shadow.mapSize.x !== g.shadow) { sun.shadow.mapSize.set(g.shadow, g.shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  }
  game.camera.far = g.far; game.camera.updateProjectionMatrix();
  game.light?.setDrawDistance?.(g.far);
  if (game.scene.fog) game.scene.fog.far = g.fogFar;
  game.scene.traverse((o) => { if (o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; });
  return st;
}

export function writeSlot(slot, state, now = Date.now()) {
  const record = { ...state, slot, savedAt: now };
  localStorage.setItem(KEY + slot, JSON.stringify(record));
  return record;
}

export function readSlot(slot) {
  try {
    const raw = localStorage.getItem(KEY + slot);
    const s = raw ? JSON.parse(raw) : null;
    return s && s.version === VERSION ? s : null;
  } catch { return null; }
}

export function readAllSlots() {
  return Array.from({ length: SAVE_SLOTS }, (_, i) => readSlot(i + 1));
}

// The newest save across the three slots, or null.
export function latestSave() {
  return readAllSlots().filter(Boolean).sort((a, b) => b.savedAt - a.savedAt)[0] || null;
}

// The manual slot to write next: an empty one, else the older of slots 2 and 3.
export function nextManualSlot() {
  const a = readSlot(2), b = readSlot(3);
  if (!a) return 2;
  if (!b) return 3;
  return a.savedAt <= b.savedAt ? 2 : 3;
}

// "CONTINUE - Story 3/5 - $18,450" from a real save record.
export function continueLabel(s) {
  return `CONTINUE - Story ${s.storyStep}/${s.storyOf} - $${s.cash.toLocaleString('en-US')}`;
}

export function clockOf(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Hooks the saves into the game: game.saveGame (pause menu / Calloway Salvage), game.autosave
// (after a mission), game.loadSave (CONTINUE) and game.newGameState (NEW GAME after a quit).
export function installSaveSlots(game) {
  applySettings(game, readSettings());
  game.changeSetting = (key, value) => { applySettings(game, { ...game.settings, [key]: value }); writeSettings(game.settings); return game.settings; };
  const fresh = captureState(game, 'Palmline Beach');
  delete fresh.settings; // NEW GAME keeps the player's settings
  const record = (slot, place) => {
    const r = writeSlot(slot, captureState(game, place));
    game.progress.savedAt = { clock: clockOf(r.savedAt), place };
    return r;
  };
  game.saveGame = (from = 'Pause menu') => {
    if (game.missions.mission) return 'No saving during a job';
    if (game.wantedLevel.pips > 0) return 'Lose the SPD before saving';
    const place = nearSafehouse(game) || from === 'Calloway Salvage' ? 'Calloway Salvage' : game.districtName ? title(game.districtName) : 'Port Solara';
    const r = record(nextManualSlot(), place);
    game.toast?.(`SAVED - SLOT ${r.slot}`);
    return `Saved to slot ${r.slot} - ${place} ${game.progress.savedAt.clock}`;
  };
  game.autosave = (missionTitle) => {
    const r = record(AUTOSAVE_SLOT, `After ${missionTitle}`);
    game.toast?.('AUTOSAVED');
    return r;
  };
  game.loadSave = (s) => applyState(game, s);
  game.newGameState = () => { applyState(game, fresh); game.progress.savedAt = null; };
}

// The safehouse spot when Wren stands within six metres of it on foot, else null.
export function nearSafehouse(game) {
  const h = game.spots?.find((p) => p.id === 'safehouse');
  if (!h || game.vehicle) return null;
  return Math.hypot(game.focus.x - h.x, game.focus.z - h.z) < 6 ? h : null;
}

function title(name) {
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
