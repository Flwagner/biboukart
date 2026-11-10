import { petPortrait } from './portraits';
import { freshPadBindings, validPadBindings, type PadControl } from './gamepad';
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
// Kart choice is cosmetic: humans and bots share the same driving characteristics.
const kartPerformance = { speed: 29, acceleration: 14, handling: 2.1 };
export const karts = [
  {
    name: 'Comète',
    shape: 'classic',
    description: 'Le charme du kart classique',
    color: '#f6bd42',
  },
  {
    name: 'Luciole',
    shape: 'round',
    description: 'Une silhouette ronde et lumineuse',
    color: '#60d8b0',
  },
  {
    name: 'Météore',
    shape: 'formula',
    description: 'Le look des monoplaces',
    color: '#ee7275',
  },
  {
    name: 'Étincelle',
    shape: 'wedge',
    description: 'Des lignes anguleuses et une robe violette',
    color: '#a195f6',
  },
  {
    name: 'Baroudeur',
    shape: 'buggy',
    description: 'Un look de buggy aventurier',
    color: '#ed9851',
  },
  {
    name: 'Biscotte',
    shape: 'retro',
    description: 'Le charme rétro en bleu ciel',
    color: '#6eb9e6',
  },
  {
    name: 'Requin',
    shape: 'rocket',
    description: 'Un fuselage aux allures de fusée',
    color: '#5ccbc9',
  },
  {
    name: 'Scarabée',
    shape: 'beetle',
    description: 'Tout en rondeurs et en couleurs',
    color: '#cf83c6',
  },
].map((kart) => ({ ...kart, ...kartPerformance }));
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
      [0, 130],
      [80, 130],
      [140, 90],
      [150, 30],
      [100, -10],
      [130, -65],
      [85, -125],
      [15, -145],
      [-60, -120],
      [-115, -70],
      [-100, -15],
      [-145, 40],
      [-120, 100],
      [-65, 130],
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
      [0, 150],
      [90, 140],
      [160, 90],
      [150, 35],
      [80, 5],
      [105, -40],
      [155, -85],
      [105, -140],
      [10, -150],
      [-75, -125],
      [-145, -75],
      [-140, -10],
      [-70, 35],
      [-110, 90],
      [-75, 140],
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
      [0, 150],
      [80, 120],
      [135, 70],
      [130, 15],
      [75, -25],
      [115, -80],
      [85, -135],
      [15, -155],
      [-65, -130],
      [-125, -90],
      [-95, -30],
      [-140, 30],
      [-130, 90],
      [-70, 135],
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
      [0, 160],
      [90, 145],
      [155, 90],
      [150, 30],
      [90, -5],
      [150, -65],
      [105, -120],
      [35, -160],
      [-35, -140],
      [-90, -90],
      [-155, -70],
      [-155, 5],
      [-90, 50],
      [-115, 110],
      [-65, 155],
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
      [0, 150],
      [105, 150],
      [155, 105],
      [155, 25],
      [100, 0],
      [100, -65],
      [145, -95],
      [115, -145],
      [10, -155],
      [-115, -140],
      [-155, -90],
      [-155, -15],
      [-95, 30],
      [-140, 90],
      [-85, 150],
    ],
  },
];
export const itemNames = {
  missile: 'Missile',
  turbo: 'Turbo',
  shield: 'Bouclier',
  trap: 'Flaque',
  giant: 'Géant',
  shockwave: 'Onde de choc',
};
export const itemIcons = {
  missile: '🚀',
  turbo: '⚡',
  shield: '🛡️',
  trap: '🛢️',
  giant: '🍄',
  shockwave: '💥',
};
export type Item = keyof typeof itemNames;
export interface PlayerConfig {
  character: number;
  kart: number;
  device: string;
  childMode?: boolean;
}
export interface Settings {
  volume: number;
  musicVolume: number;
  effectsVolume: number;
  difficulty: Difficulty;
  quality: string;
  bindings: string[][];
  padBindings: PadControl[][][];
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
      padBindings: validPadBindings(s.padBindings) ? s.padBindings : freshPadBindings(),
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
      padBindings: freshPadBindings(),
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
