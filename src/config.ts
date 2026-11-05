export const characters = [
  { name: 'Roxy', animal: 'Renard', icon: '🦊', color: '#ed8445' },
  { name: 'Pompon', animal: 'Lapin', icon: '🐰', color: '#efd9ec' },
  { name: 'Bao', animal: 'Panda', icon: '🐼', color: '#e4ecec' },
  { name: 'Bip', animal: 'Robot', icon: '🤖', color: '#65ced7' },
];
export const karts = [
  {
    name: 'Comète',
    description: 'Le parfait équilibre',
    speed: 29,
    acceleration: 14,
    handling: 2.1,
    color: '#f6bd42',
  },
  {
    name: 'Luciole',
    description: 'Légère et agile',
    speed: 26,
    acceleration: 15,
    handling: 2.55,
    color: '#60d8b0',
  },
  {
    name: 'Météore',
    description: 'Taillée pour la vitesse',
    speed: 33,
    acceleration: 10,
    handling: 1.8,
    color: '#ee7275',
  },
  {
    name: 'Étincelle',
    description: 'Un départ électrique',
    speed: 27,
    acceleration: 18,
    handling: 2.15,
    color: '#a195f6',
  },
];
export const trackDefinitions = [
  {
    name: 'Prairie des lucioles',
    subtitle: 'Des courbes douces, un grand bol d’air.',
    icon: '🌿',
    color: '#9bc56b',
    sky: '#afdded',
    ground: '#81b35a',
    width: 15,
    points: [
      [0, 65],
      [48, 56],
      [72, 13],
      [52, -43],
      [0, -65],
      [-55, -43],
      [-72, 6],
      [-43, 51],
    ],
  },
  {
    name: 'Canyon vermeil',
    subtitle: 'La poussière retombe. Pas la pression.',
    icon: '🏜️',
    color: '#df9870',
    sky: '#f1d4ae',
    ground: '#c38b58',
    width: 14,
    points: [
      [0, 75],
      [55, 66],
      [82, 30],
      [40, 0],
      [68, -45],
      [5, -72],
      [-55, -55],
      [-70, -5],
      [-35, 23],
      [-45, 62],
    ],
  },
  {
    name: 'Archipel azur',
    subtitle: 'Du soleil, du sel et des dépassements.',
    icon: '🏝️',
    color: '#65c7cc',
    sky: '#b4e7f2',
    ground: '#dec98c',
    width: 14,
    points: [
      [0, 75],
      [46, 55],
      [65, 14],
      [36, -12],
      [55, -56],
      [0, -75],
      [-60, -53],
      [-44, -8],
      [-73, 32],
      [-40, 63],
    ],
  },
];
export const itemNames = { missile: 'Missile', turbo: 'Turbo', shield: 'Bouclier', trap: 'Piège' };
export const itemIcons = { missile: '🚀', turbo: '⚡', shield: '🛡️', trap: '🟣' };
export type Item = keyof typeof itemNames;
export interface PlayerConfig {
  character: number;
  kart: number;
  device: string;
}
export interface Settings {
  volume: number;
  quality: string;
  reduced: boolean;
  bindings: string[][];
}
export const defaultBindings = [
  ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'],
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'],
  ['KeyI', 'KeyK', 'KeyJ', 'KeyL', 'KeyO'],
  ['Numpad8', 'Numpad5', 'Numpad4', 'Numpad6', 'Numpad0'],
];
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem('biboukart-v1') || '{}');
    return {
      volume: typeof s.volume === 'number' ? Math.max(0, Math.min(1, s.volume)) : 0.3,
      quality: ['auto', 'low', 'medium', 'high'].includes(s.quality) ? s.quality : 'auto',
      reduced: !!s.reduced,
      bindings:
        Array.isArray(s.bindings) &&
        s.bindings.length === 4 &&
        s.bindings.every(
          (b: unknown) =>
            Array.isArray(b) &&
            b.length === 5 &&
            b.every((k) => typeof k === 'string' && /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(k)),
        )
          ? s.bindings
          : defaultBindings.map((b) => [...b]),
    };
  } catch {
    return {
      volume: 0.3,
      quality: 'auto',
      reduced: false,
      bindings: defaultBindings.map((b) => [...b]),
    };
  }
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem('biboukart-v1', JSON.stringify(s));
  } catch {
    /* Private browsing: settings stay in memory. */
  }
}
