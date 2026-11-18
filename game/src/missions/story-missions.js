// The five story missions of "Salt & Gold", in order, with their giver and start spot. Missions 1
// and 3 are playable step lists for the MissionRunner; 2, 4 and 5 need combat (M4) and are listed
// locked. Until M4, mission 3's Mercado fight is a short dialogue-and-escape beat (no guns yet).
export const STORY_MISSIONS = [
  {
    number: 1, of: 5, id: 'ferry', title: 'Fresh Off the Ferry', giver: 'Mara Quist',
    start: { x: -168.4, z: -8 },
    reward: { cash: 5000, rep: 120 },
    payoffText: 'Collect from Mara at Quist Auto',
    steps: [
      { kind: 'dialogue', text: 'Listen to Mara', lines: [
        { who: 'MARA', text: 'Welcome home, Wren. Your father\'s boat debt won\'t pay itself.', secs: 3.2 },
        { who: 'MARA', text: 'The Meridiana valet leaves keys on the hoods. Bring me one.', secs: 3.2 },
      ] },
      { kind: 'goto', text: 'Walk to the Meridiana valet lane', at: { x: -168.6, z: -58 }, radius: 9 },
      { kind: 'steal', text: 'Take a car from the valet lane' },
      { kind: 'deliver', text: 'Deliver it to Quist Auto', at: { x: -90, z: 270 }, radius: 10, lines: [
        { who: 'MARA', text: 'Clean lift. Bring it round to the lot, no scratches.', secs: 3.5 },
      ] },
      { kind: 'dialogue', text: 'Hand over the keys', lines: [
        { who: 'MARA', text: 'Not bad for a diver. There\'s more where that came from.', secs: 3 },
      ] },
    ],
  },
  {
    number: 2, of: 5, id: 'market', title: 'Market Day', giver: 'Mara Quist',
    start: { x: 128, z: 30 }, locked: 'Needs combat (M4)', steps: [],
  },
  {
    number: 3, of: 5, id: 'harbor', title: 'The Harbor Run', giver: 'Mara Quist',
    start: { x: 153.5, z: 58 },
    reward: { cash: 8500, rep: 260 },
    payoffText: 'Get paid at the Saltworks Docks',
    steps: [
      { kind: 'goto', text: 'Meet the Tidewater buyer at the Mercado', at: { x: 150, z: 30 }, radius: 10 },
      // The Mercado fight is a dialogue and a run for it until weapons land in M4.
      { kind: 'dialogue', text: 'Talk your way out of the Mercado', lines: [
        { who: 'ILSE', text: 'Tidewater runs this square, Calloway. The Albacore stays.', secs: 3.2 },
        { who: 'MARA', text: 'Don\'t fight her crew. Grab the coupe and go!', secs: 2.8 },
      ] },
      { kind: 'steal', text: 'Steal the Albacore GT', car: 'ALBACORE GT', target: (game) => game.albacore, heat: 3 },
      { kind: 'loseWanted', text: 'Lose the SPD, reach the Docks', at: { x: 0, z: 210 }, seconds: 180, lines: [
        { who: 'MARA', text: 'Roarke\'s whole shift is on you. Lose them, then the Docks!', secs: 4.5 },
        { who: 'ROARKE', text: 'All units: coral-red coupe on Palmline. Box it in.', secs: 3.5 },
      ] },
      { kind: 'deliver', text: 'Park the Albacore at the Saltworks Docks', at: { x: 0, z: 210 }, radius: 12 },
      { kind: 'dialogue', text: 'Hand over the coupe', lines: [
        { who: 'MARA', text: 'The cargo\'s in the trunk. Ilse will want it back. Let her try.', secs: 3.2 },
      ] },
    ],
  },
  {
    number: 4, of: 5, id: 'ledger', title: 'Ledger at Lantern Point', giver: 'Ilse Varga',
    start: { x: -60, z: -250 }, locked: 'Needs combat (M4)', steps: [],
  },
  {
    number: 5, of: 5, id: 'sundown', title: 'Sundown', giver: 'Mara Quist',
    start: { x: 240, z: -210 }, locked: 'Needs combat (M4)', steps: [],
  },
];

// REP ranks: the REP needed to reach each, from 0.
export const REP_RANKS = [
  { rep: 0, name: 'NEW IN TOWN' }, { rep: 100, name: 'DECKHAND' }, { rep: 300, name: 'RUNNER' },
  { rep: 600, name: 'WHEELMAN' }, { rep: 1000, name: 'FIXER' }, { rep: 1600, name: 'HARBOR NAME' },
];

// Rank number (1-based), its name and the fraction toward the next rank for a REP total.
export function rankFor(rep) {
  let i = 0;
  while (i + 1 < REP_RANKS.length && rep >= REP_RANKS[i + 1].rep) i++;
  const lo = REP_RANKS[i].rep, hi = REP_RANKS[i + 1]?.rep ?? lo + 1000;
  return { rank: i + 1, name: REP_RANKS[i].name, frac: (rep - lo) / (hi - lo) };
}

// Who speaks, for subtitles and the canvas portrait chip.
export const SPEAKERS = {
  MARA: { name: 'MARA QUIST', skin: '#b9785a', hair: '#2a1a14', accent: '#1d7f7a' },
  ILSE: { name: 'ILSE VARGA', skin: '#e2b896', hair: '#c9a24a', accent: '#1aa39a' },
  ROARKE: { name: 'CMDR. ROARKE', skin: '#d29a7a', hair: '#5a5f6a', accent: '#14304f' },
};
