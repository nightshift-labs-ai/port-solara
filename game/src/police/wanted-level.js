// WANTED in five shield pips. Crimes raise heat: a theft seen by a walker or cop within 25 m, a hit
// pedestrian and gunfire are +1; assaulting a cop and wrecking a cruiser are +2. While a cop has
// line of sight the last-seen spot follows Wren; once nobody sees her, the escape timer runs
// (8 s + 3 s per pip) and the minimap shows a search circle around the last-seen spot. Leave the
// circle or outlast the timer unseen and the heat clears.
export const CRIME_HEAT = { theft: 1, pedHit: 1, gunfire: 1, copAssault: 2, cruiserWrecked: 2 };
export const WITNESS_RANGE = 25;

export class WantedLevel {
  constructor() {
    this.pips = 0;
    this.inSight = false;
    this.unseenFor = 0;
    this.lastSeen = { x: 0, z: 0 };
  }

  // Seconds without a sighting needed to shake the SPD at the current level.
  get escapeSeconds() { return this.pips > 0 ? 8 + 3 * this.pips : 0; }
  get escapeLeft() { return Math.max(0, this.escapeSeconds - this.unseenFor); }
  get searchRadius() { return 60 + 25 * this.pips; }

  // Report a crime at (x, z). Theft only counts when someone within 25 m saw it.
  commit(crime, x, z, witnesses = 1) {
    const heat = CRIME_HEAT[crime] || 0;
    if (!heat || witnesses <= 0) return false;
    this.pips = Math.min(5, this.pips + heat);
    this.inSight = true;
    this.unseenFor = 0;
    this.lastSeen = { x, z };
    return true;
  }

  // Fixed-step update. `seen` is the live line-of-sight check from the police (false until M3 step 2
  // puts cruisers on the street, so the timer runs from the crime spot).
  update(dt, focus, seen) {
    if (this.pips === 0) { this.inSight = false; return; }
    this.inSight = !!seen;
    if (this.inSight) { this.unseenFor = 0; this.lastSeen = { x: focus.x, z: focus.z }; return; }
    this.unseenFor += dt;
    if (this.unseenFor >= this.escapeSeconds) this.clear();
  }

  clear() { this.pips = 0; this.inSight = false; this.unseenFor = 0; }
}

// Walkers within 25 m of a spot: the witnesses to a crime there.
export function countWitnesses(game, x, z) {
  if (!game.crowd) return 0;
  return game.crowd.near(x, z, WITNESS_RANGE).filter((w) => Math.hypot(w.x - x, w.z - z) <= WITNESS_RANGE).length;
}
