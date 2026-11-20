// Overall completion: one percentage built only from progress a save keeps (story missions, race
// best laps, courier jobs, the Hornet unlocked, and the career firsts for a sale and a respray).
// Weights, out of 100:
//   story missions   60  (12 each, five missions)
//   ring road races  16  (4 each, four races with a best lap)
//   courier jobs     10  (1 each, ten jobs)
//   Hornet SMG        6  (unlocked at Brass & Barrel)
//   first car sold    4  (Quist Auto)
//   first respray     4  (Pelican Fuel)
export const COMPLETION_WEIGHTS = { story: 60, races: 16, courier: 10, hornet: 6, sold: 4, respray: 4 };

export function completionOf(game) {
  const p = game.progress, st = game.stats || {}, W = COMPLETION_WEIGHTS;
  const missions = game.story.map((m) => ({
    number: m.number, id: m.id, title: m.title, giver: m.giver,
    cash: m.reward?.cash || 0, rep: m.reward?.rep || 0, done: game.missions.completed.has(m.id),
  }));
  const storyDone = missions.filter((m) => m.done).length;
  const rows = [
    { key: 'story', label: 'STORY MISSIONS', done: storyDone, of: missions.length, weight: W.story },
    { key: 'races', label: 'RING ROAD RACES', done: p.races || 0, of: p.racesOf, weight: W.races },
    { key: 'courier', label: 'COURIER JOBS', done: p.courier || 0, of: p.courierOf, weight: W.courier },
    { key: 'hornet', label: 'HORNET SMG', done: game.arms.locked.has('hornet') ? 0 : 1, of: 1, weight: W.hornet },
    { key: 'sold', label: 'A CAR SOLD AT QUIST AUTO', done: st.carsSold > 0 ? 1 : 0, of: 1, weight: W.sold },
    { key: 'respray', label: 'A PELICAN FUEL RESPRAY', done: st.resprays > 0 ? 1 : 0, of: 1, weight: W.respray },
  ];
  for (const r of rows) r.points = r.of ? (r.weight * Math.min(r.done, r.of)) / r.of : 0;
  const percent = Math.floor(rows.reduce((a, r) => a + r.points, 0));
  const paid = missions.filter((m) => m.done).reduce((a, m) => a + m.cash, 0);
  const payouts = missions.reduce((a, m) => a + m.cash, 0);
  return { percent, rows, missions, storyDone, paid, payouts };
}

// The percentage a save record would show on the MAP tab once loaded (computed, never stored).
export function completionOfSave(game, rec) {
  const st = rec.stats || {};
  return completionOf({
    story: game.story, missions: { completed: new Set(rec.story || []) }, stats: rec.career || {},
    progress: { races: st.races || 0, racesOf: game.progress.racesOf, courier: st.courier || 0, courierOf: game.progress.courierOf },
    arms: { locked: new Set(rec.weapons?.locked || ['hornet']) },
  }).percent;
}
