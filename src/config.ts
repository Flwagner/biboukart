import { petPortrait } from './portraits';
export const characters = [
  { name: 'Roxy', animal: 'Renard', icon: '🦊', color: '#ed8445' },
  { name: 'Couscous', animal: 'Lapin', icon: petPortrait('rabbit'), color: '#171a20' },
  { name: 'Bao', animal: 'Panda', icon: '🐼', color: '#e4ecec' },
  { name: 'Raclette', animal: 'Chat', icon: petPortrait('cat'), color: '#f7f7f1' },
  { name: 'Glaçon', animal: 'Pingouin', icon: '🐧', color: '#34465b' },
  { name: 'Mochi', animal: 'Koala', icon: '🐨', color: '#a9b5c4' },
  { name: 'Pistache', animal: 'Grenouille', icon: '🐸', color: '#80c966' },
  { name: 'Truffe', animal: 'Cochon', icon: '🐷', color: '#efabba' },
];
export const karts = [
  {
    name: 'Comète',
    shape: 'classic',
    description: 'Le parfait équilibre',
    speed: 29,
    acceleration: 14,
    handling: 2.1,
    color: '#f6bd42',
  },
  {
    name: 'Luciole',
    shape: 'round',
    description: 'Légère et agile',
    speed: 26,
    acceleration: 15,
    handling: 2.55,
    color: '#60d8b0',
  },
  {
    name: 'Météore',
    shape: 'formula',
    description: 'Taillée pour la vitesse',
    speed: 33,
    acceleration: 10,
    handling: 1.8,
    color: '#ee7275',
  },
  {
    name: 'Étincelle',
    shape: 'wedge',
    description: 'Un départ électrique',
    speed: 27,
    acceleration: 18,
    handling: 2.15,
    color: '#a195f6',
  },
  {
    name: 'Baroudeur',
    shape: 'buggy',
    description: 'Un buggy qui tient le cap',
    speed: 28,
    acceleration: 13,
    handling: 2.35,
    color: '#ed9851',
  },
  {
    name: 'Biscotte',
    shape: 'retro',
    description: 'Le charme rétro, la reprise en plus',
    speed: 26,
    acceleration: 17,
    handling: 2.3,
    color: '#6eb9e6',
  },
  {
    name: 'Requin',
    shape: 'rocket',
    description: 'Un fuselage pour les lignes droites',
    speed: 32,
    acceleration: 12,
    handling: 1.9,
    color: '#5ccbc9',
  },
  {
    name: 'Scarabée',
    shape: 'beetle',
    description: 'Tout en rondeurs et en souplesse',
    speed: 27,
    acceleration: 15,
    handling: 2.5,
    color: '#cf83c6',
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
  {
    name: 'Col des flocons',
    subtitle: 'Des sommets blancs, des virages au grand air.',
    icon: '🏔️',
    color: '#b3d5e8',
    sky: '#cadfeb',
    ground: '#e7f0f5',
    width: 14,
    points: [
      [0, 80],
      [50, 68],
      [78, 32],
      [58, -5],
      [80, -44],
      [35, -78],
      [-16, -68],
      [-64, -42],
      [-78, 5],
      [-45, 30],
      [-52, 65],
    ],
  },
  {
    name: 'Boulevard des bibous',
    subtitle: 'Entre les immeubles, la ville devient une piste.',
    icon: '🏙️',
    color: '#9badd1',
    sky: '#c4d6e6',
    ground: '#a5adb5',
    width: 15,
    points: [
      [0, 76],
      [56, 76],
      [78, 48],
      [76, -12],
      [50, -24],
      [48, -68],
      [-10, -78],
      [-68, -60],
      [-78, -12],
      [-48, 12],
      [-68, 53],
      [-40, 76],
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
  musicVolume: number;
  effectsVolume: number;
  difficulty: Difficulty;
  quality: string;
  reduced: boolean;
  bindings: string[][];
}
export const difficulties = {
  easy: {
    label: 'Facile',
    description: 'Prudents, vitesse modérée, objets occasionnels',
    speed: 0.7,
    precision: 0.92,
    lookAhead: 9,
    speedLook: 0.5,
    itemChance: 0.006,
    cornerSpeed: 0.58,
    obstacleLook: 25,
  },
  normal: {
    label: 'Normal',
    description: 'Équilibrés, quelques raccourcis, objets réguliers',
    speed: 0.89,
    precision: 1,
    lookAhead: 8,
    speedLook: 0.5,
    itemChance: 0.018,
    cornerSpeed: 0.72,
    obstacleLook: 23,
  },
  hard: {
    label: 'Difficile',
    description: 'Trajectoires précises, raccourcis et anticipation',
    speed: 1,
    precision: 1.05,
    lookAhead: 7,
    speedLook: 0.42,
    itemChance: 0.03,
    cornerSpeed: 0.85,
    obstacleLook: 28,
  },
} as const;
export type Difficulty = keyof typeof difficulties;
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
      musicVolume:
        typeof s.musicVolume === 'number' ? Math.max(0, Math.min(1, s.musicVolume)) : 0.55,
      effectsVolume:
        typeof s.effectsVolume === 'number' ? Math.max(0, Math.min(1, s.effectsVolume)) : 0.8,
      difficulty: ['easy', 'normal', 'hard'].includes(s.difficulty) ? s.difficulty : 'normal',
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
      musicVolume: 0.55,
      effectsVolume: 0.8,
      difficulty: 'normal',
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
