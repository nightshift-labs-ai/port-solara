// Every proper name in Port Solara, in one place.
export const PORT_SOLARA_NAMES = {
  city: 'PORT SOLARA',
  districts: {
    palmline: 'PALMLINE BEACH',
    coral: 'CORAL HEIGHTS',
    mercado: 'OLD MERCADO',
    saltworks: 'SALTWORKS DOCKS',
    lantern: 'LANTERN POINT',
  },
  // One line per district for its title card.
  districtLines: {
    'PALMLINE BEACH': 'Double palms and the Hotel Meridiana',
    'CORAL HEIGHTS': 'Glass towers under the Sundial',
    'OLD MERCADO': 'Tiled facades and the Clock Arch',
    'SALTWORKS DOCKS': 'Coral-red cranes and salt pyramids',
    'LANTERN POINT': 'A lighthouse on the headland',
  },
  // The clock starts on a Friday at 17:20; one game minute passes per second of play, and the
  // weekday rolls over at midnight.
  clock: { weekday: 'FRI', day: 1, startMinutes: 17 * 60 + 20, week: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] },
  streets: { boulevard: 'PALMLINE BOULEVARD', ring: 'SOLARA RING ROAD' },
  landmarks: ['Sundial Tower', 'Hotel Meridiana', 'Clock Arch', 'Gull Bridge', 'Lantern Point Lighthouse'],
  player: { name: 'Wren Calloway', look: 'saffron windbreaker' },
  fixer: 'Mara Quist',
  signs: [
    { text: 'OSTRA BANK', sub: 'SINCE 1911', bg: '#123a5e', fg: '#ffd166' },
    { text: 'SOLARA COURIER', sub: 'SAME-DAY ACROSS THE BAY', bg: '#f4efe4', fg: '#c2412d' },
    { text: 'GAIVOTA CAFÉ', sub: 'BICA · PASTRY · SEA VIEW', bg: '#1d7f7a', fg: '#fff6e0' },
    { text: 'PELICAN FUEL', sub: 'RESPRAY BAY', bg: '#f2b134', fg: '#14304f' },
    { text: 'TIDECALL MOBILE', sub: 'SIGNAL TO THE LIGHTHOUSE', bg: '#14304f', fg: '#5fd3c6' },
    { text: "BOLO'S FISH FRY", sub: 'FRESH OFF THE PIER', bg: '#d9483b', fg: '#fff6e0' },
    { text: 'MERCADO CENTRAL', sub: 'OPEN DAWN TO DUSK', bg: '#c8693a', fg: '#fff6e0' },
    { text: 'QUIST AUTO', sub: 'NO QUESTIONS · CASH', bg: '#1b1f2a', fg: '#f2b134' },
    { text: 'HOTEL MERIDIANA', sub: '', bg: '#f7f1e6', fg: '#1d7f7a' },
    { text: 'ST. ELMO CLINIC', sub: 'OPEN 24 HOURS', bg: '#f4efe4', fg: '#1d6fa5' },
  ],
  cars: {
    albacore: 'ALBACORE GT',
    pipit: 'PIPIT',
    promenade: 'PROMENADE',
  },
};

export const FREE_ROAM_OBJECTIVE = {
  title: 'FREE ROAM - PORT SOLARA',
  detail: 'Drive to Quist Auto in the Saltworks Docks',
};
