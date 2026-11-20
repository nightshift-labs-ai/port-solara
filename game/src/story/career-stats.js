// Career statistics: what Wren has done across the whole save. Every number is counted at the
// game's own event site (a jack, a downed gunman, a blast, a finished race, the escape timer
// running out) and moves silently: no toast, sound or HUD line. They ride in a save record under
// its own `career` key, so older saves simply load with zeros.
export function zeroStats() {
  return {
    carsStolen: 0, // first time Wren takes the wheel of a car that was not hers
    policeEscapes: 0, // the SPD escape timer ran out (never custody, respray or a load)
    highestWanted: 0, // most SPD pips ever after the wanted update
    metresDriven: 0, // |car speed| x step time, never position jumps
    metresOnFoot: 0,
    gangDowned: 0, // crew gunmen whose health reached zero
    carsBlownUp: 0,
    racesWon: 0, // every passed race, repeats included
    courierDone: 0,
    timesBooked: 0, // SPD custody
    clinicVisits: 0, // Wren knocked down, St. Elmo Clinic fee
    carsSold: 0, // Quist Auto (completion counts the first)
    hornetBought: 0, // gun shop SMG purchase
    resprays: 0, // Pelican Fuel
    secondsPlayed: 0, // sim seconds in play, paused time excluded
  };
}

function bump(game, key, by = 1) {
  if (!game.stats) game.stats = zeroStats();
  game.stats[key] = (game.stats[key] || 0) + by;
}

export const countCarStolen = (game) => bump(game, 'carsStolen');
export const countGangMemberDowned = (game) => bump(game, 'gangDowned');
export const countCarBlownUp = (game) => bump(game, 'carsBlownUp');
export const countRaceWon = (game) => bump(game, 'racesWon');
export const countCourierJob = (game) => bump(game, 'courierDone');
export const countTimeBooked = (game) => bump(game, 'timesBooked');
export const countClinicVisit = (game) => bump(game, 'clinicVisits');
export const countCarSold = (game) => bump(game, 'carsSold');
export const countHornetBought = (game) => bump(game, 'hornetBought');
export const countRespray = (game) => bump(game, 'resprays');

// Distance comes from speed in the driving and walking branches of game.step, so teleports,
// loads, custody and shot staging never count; time played is sim time in play.
export const countMetresDriven = (game, dt) => bump(game, 'metresDriven', Math.abs(game.vehicle.speed || 0) * dt);
export const countMetresOnFoot = (game, dt) => bump(game, 'metresOnFoot', Math.abs(game.player.speed || 0) * dt);
export const countPlayTime = (game, dt) => bump(game, 'secondsPlayed', dt);

// Called right after WantedLevel.update with the pips from just before it: an escape is only the
// timer taking the last pip away; the highest level is the max seen after the update.
export function countWantedChange(game, pipsBefore) {
  const now = game.wantedLevel.pips;
  if (pipsBefore > 0 && now === 0) bump(game, 'policeEscapes');
  if (!game.stats) game.stats = zeroStats();
  if (now > game.stats.highestWanted) game.stats.highestWanted = now;
}

// "1:05" (hours:minutes) for time played.
export function playClock(seconds) {
  const m = Math.floor(seconds / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

export function kmOf(metres) {
  return (metres / 1000).toFixed(1);
}
