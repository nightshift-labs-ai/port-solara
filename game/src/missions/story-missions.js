// The five story missions of "Salt & Gold", in order, with their giver and start spot, as step
// lists for the MissionRunner. Fight steps place props (cover cars, the car to take) and squads by
// offsets from the step's spot; `cover` is the prop index a gunman hides behind.
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
    start: { x: 153.5, z: 88 },
    reward: { cash: 3000, rep: 90 },
    payoffText: 'Report back to Mara',
    steps: [
      { kind: 'dialogue', text: 'Listen to Mara', give: 'wasp', lines: [
        { who: 'MARA', text: 'Ilse\'s crew leans on the Mercado stallholders. Take this Wasp.', secs: 3.2 },
        { who: 'MARA', text: 'Walk the market. If they pull on you, pull back.', secs: 2.8 },
      ] },
      { kind: 'goto', text: 'Walk the Mercado market', at: { x: 151, z: 70 }, radius: 8 },
      { kind: 'eliminate', text: 'Beat the Tidewater ambush', at: { x: 150, z: 54 },
        props: [{ car: 'van', dx: 0, dz: 0, heading: Math.PI / 2 }],
        squad: [{ crew: 'tidewater', dx: -2, dz: -4 }, { crew: 'tidewater', dx: 2, dz: -4 }, { crew: 'tidewater', dx: 5, dz: -6 }],
        lines: [{ who: 'ILSE', text: 'Nobody sells in my square without paying, diver.', secs: 3.4 }] },
      { kind: 'dialogue', text: 'Hear Mara out', lines: [
        { who: 'MARA', text: 'Ilse will hear about that. Come see me when the heat\'s off.', secs: 3.2 },
      ] },
    ],
  },
  {
    number: 3, of: 5, id: 'harbor', title: 'The Harbor Run', giver: 'Mara Quist',
    start: { x: 153.5, z: 58 },
    reward: { cash: 8500, rep: 260 },
    payoffText: 'Get paid at the Saltworks Docks',
    steps: [
      { kind: 'goto', text: 'Meet the Tidewater buyer at the Mercado', at: { x: 152, z: 76 }, radius: 8 },
      // The Mercado fight: two gunmen behind the Tidewater van, the Albacore parked by the stalls.
      { kind: 'eliminate', text: 'Drop the Tidewater gunmen at the van', at: { x: 151.5, z: 61 },
        props: [{ car: 'van', dx: 0, dz: 0, heading: Math.PI / 2 }, { car: 'albacore', dx: 3.9, dz: 9.4, heading: 0.3 }],
        squad: [{ crew: 'tidewater', dx: -1.5, dz: -3 }, { crew: 'tidewater', dx: 1.8, dz: -3 }, { crew: 'tidewater', dx: 4, dz: -7 }],
        lines: [
          { who: 'ILSE', text: 'Tidewater runs this square, Calloway. The Albacore stays.', secs: 2.6 },
          { who: 'MARA', text: 'The cargo\'s in their van - grab it!', secs: 30 },
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
    start: { x: -60, z: -250 },
    reward: { cash: 12000, rep: 400 },
    payoffText: 'Hand the ledger to Ilse',
    steps: [
      { kind: 'dialogue', text: 'Listen to Ilse', give: 'hornet', lines: [
        { who: 'ILSE', text: 'Pell keeps his ledger in the lighthouse keeper\'s office.', secs: 3.2 },
        { who: 'ILSE', text: 'Take it and hold the point. The Gilded Hand will come.', secs: 3 },
      ] },
      { kind: 'goto', text: 'Reach the Lantern Point lighthouse', target: (game) => game.anchors.lantern, radius: 12 },
      { kind: 'defend', text: 'Hold Lantern Point against the Aurum SUVs', target: (game) => game.anchors.lantern, hold: 20,
        props: [{ car: 'aurumA', dx: -11, dz: -5, heading: Math.PI / 2 }, { car: 'aurumB', dx: 11, dz: -7, heading: -Math.PI / 2 }],
        waves: [
          { at: 1, squad: [{ crew: 'gilded', dx: -13, dz: -9, cover: 0 }, { crew: 'gilded', dx: -9, dz: -10, cover: 0 }, { crew: 'gilded', dx: -16, dz: -8, cover: 0 }] },
          { at: 12, squad: [{ crew: 'gilded', dx: 13, dz: -11, cover: 1 }, { crew: 'gilded', dx: 9, dz: -12, cover: 1 }, { crew: 'gilded', dx: 15, dz: -4, cover: 1 }] },
        ],
        lines: [
          { who: 'PELL', text: 'That ledger is Ostra Bank property, Miss Calloway.', secs: 3.2 },
          { who: 'PELL', text: 'Hand it back and your father\'s debt goes away.', secs: 3.2 },
          { who: 'ILSE', text: 'He\'s lying. Hold the point!', secs: 2.6 },
        ] },
      { kind: 'dialogue', text: 'Hand the ledger to Ilse', lines: [
        { who: 'ILSE', text: 'Every bribe Roarke ever took is in here. Mara gets it over the bridge.', secs: 3.6 },
      ] },
    ],
  },
  {
    number: 5, of: 5, id: 'sundown', title: 'Sundown', giver: 'Mara Quist',
    start: { x: 240, z: -210 },
    reward: { cash: 25000, rep: 600 },
    payoffText: 'Read all about it',
    frontPage: { paper: 'SOLARA COURIER', headline: '"PELL LEDGER SINKS OSTRA BANK"', sub: 'ROARKE SUSPENDED' },
    steps: [
      { kind: 'dialogue', text: 'Listen to Mara', lines: [
        { who: 'MARA', text: 'Every cop Roarke owns is waiting for that ledger.', secs: 3 },
        { who: 'MARA', text: 'Take it over the Gull Bridge to the Courier. Don\'t stop.', secs: 3 },
      ] },
      { kind: 'steal', text: 'Take a fast car' },
      { kind: 'goto', text: 'Carry the ledger to the Gull Bridge', target: (game) => game.anchors.bridge, radius: 14, heat: 5, seconds: 240, lines: [
        { who: 'ROARKE', text: 'All units, all channels: the Calloway woman has the ledger. Stop her.', secs: 4 },
        { who: 'MARA', text: 'Five shields on you. Keep your foot down!', secs: 3 },
      ] },
      { kind: 'loseWanted', text: 'Lose the SPD for good', lines: [
        { who: 'MARA', text: 'You\'re over. Shake them and it\'s finished.', secs: 3 },
      ] },
      { kind: 'dialogue', text: 'Watch the sun go down', lines: [
        { who: 'MARA', text: 'The Courier has it. Your father\'s boat is yours, Wren.', secs: 3.4 },
      ] },
    ],
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
  PELL: { name: 'AUGUSTIN PELL', skin: '#e9c7ad', hair: '#d8d4cb', accent: '#3b3220' },
  ROARKE: { name: 'CMDR. ROARKE', skin: '#d29a7a', hair: '#5a5f6a', accent: '#14304f' },
};
