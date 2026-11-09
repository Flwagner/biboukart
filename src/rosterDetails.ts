import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Factory = (
  geometry: THREE.BufferGeometry,
  color: string,
  x?: number,
  y?: number,
  z?: number,
) => THREE.Mesh;

/** Small bespoke sculpts, baked into the existing material batches by the caller. */
function tools(root: THREE.Group, factory: Factory) {
  return {
    oval(color: string, size: number[], p: number[]) {
      const part = factory(new THREE.SphereGeometry(1, 12, 8), color, p[0], p[1], p[2]);
      part.scale.set(size[0], size[1], size[2]);
      root.add(part);
      return part;
    },
    box(color: string, size: number[], p: number[]) {
      const part = factory(new RoundedBoxGeometry(1, 1, 1, 1, 0.15), color, p[0], p[1], p[2]);
      part.scale.set(size[0], size[1], size[2]);
      root.add(part);
      return part;
    },
  };
}

export function sculptDriver(
  root: THREE.Group,
  character: number,
  color: string,
  factory: Factory,
) {
  if (character === 0) return; // Keep the approved Roxy reference unchanged.
  const { oval, box } = tools(root, factory);
  const scarves = [
    '#e78549',
    '#b79bde',
    '#df8768',
    '#6db9c9',
    '#c66b53',
    '#d4b477',
    '#ecbd6a',
    '#a08bcc',
  ];
  // Soft paws on the steering wheel and a small racing scarf give every driver a finished costume.
  for (const side of [-1, 1]) {
    oval(character === 2 ? '#273442' : color, [0.16, 0.21, 0.2], [side * 0.38, 1.23, 0.48]);
  }
  box(scarves[character], [0.74, 0.15, 0.7], [0, 1.43, 0]);
  const scarf = box(scarves[character], [0.22, 0.46, 0.1], [0.33, 1.17, -0.38]);
  scarf.rotation.z = -0.3;
  switch (character) {
    case 1:
      for (const side of [-1, 1]) oval('#53515b', [0.22, 0.16, 0.13], [side * 0.15, 1.66, 0.5]);
      oval('#dba5ad', [0.09, 0.07, 0.06], [0, 1.7, 0.63]);
      break;
    case 2:
      for (const side of [-1, 1]) {
        const patch = oval('#273442', [0.19, 0.24, 0.08], [side * 0.24, 1.91, 0.49]);
        patch.rotation.z = side * -0.28;
        oval('#fff9e9', [0.065, 0.085, 0.035], [side * 0.22, 1.96, 0.58]);
        oval('#273442', [0.032, 0.05, 0.02], [side * 0.22, 1.96, 0.615]);
        oval('#fff9e9', [0.015, 0.02, 0.012], [side * 0.22 - 0.015, 1.985, 0.635]);
      }
      oval('#fff9e9', [0.32, 0.2, 0.17], [0, 1.64, 0.47]);
      oval('#273442', [0.12, 0.08, 0.065], [0, 1.7, 0.64]);
      oval('#fff9e9', [0.32, 0.28, 0.1], [0, 1.16, 0.32]);
      break;
    case 3:
      for (const side of [-1, 1]) {
        oval('#fff0dc', [0.22, 0.16, 0.12], [side * 0.17, 1.64, 0.47]);
        oval('#edc1bf', [0.12, 0.065, 0.035], [side * 0.41, 1.72, 0.43]);
      }
      break;
    case 4:
      for (const side of [-1, 1]) {
        oval('#f0b35c', [0.23, 0.11, 0.31], [side * 0.25, 0.96, 0.3]);
        oval('#e7b3a3', [0.09, 0.055, 0.025], [side * 0.34, 1.79, 0.58]);
        oval('#fff9e9', [0.025, 0.03, 0.015], [side * 0.22 - 0.02, 1.98, 0.635]);
      }
      break;
    case 5:
      for (const side of [-1, 1]) {
        oval('#e6e1d7', [0.19, 0.15, 0.12], [side * 0.19, 1.63, 0.47]);
        oval('#fff7df', [0.035, 0.04, 0.025], [side * 0.22 - 0.02, 1.94, 0.56]);
      }
      oval('#d8dce0', [0.3, 0.25, 0.08], [0, 1.16, 0.33]);
      break;
    case 6:
      oval('#c6df8a', [0.46, 0.22, 0.14], [0, 1.63, 0.43]);
      box('#416d44', [0.34, 0.02, 0.035], [0, 1.54, 0.56]);
      for (const side of [-1, 1]) {
        oval('#e4b28a', [0.12, 0.07, 0.035], [side * 0.4, 1.76, 0.46]);
        oval('#fff9e8', [0.04, 0.05, 0.025], [side * 0.37 - 0.02, 2.34, 0.58]);
      }
      break;
    case 7:
      for (const side of [-1, 1]) {
        oval('#db86a1', [0.15, 0.075, 0.035], [side * 0.41, 1.73, 0.43]);
        const inner = oval('#b86783', [0.1, 0.18, 0.035], [side * 0.4, 2.35, 0.11]);
        inner.rotation.z = -side * 0.2;
      }
      break;
  }
  // Tiny eye catchlights remain legible without adding lights or transparent overlays.
  if (![2, 4, 6].includes(character))
    for (const side of [-1, 1])
      oval(
        '#fff9e9',
        [0.025, 0.032, 0.018],
        [side * 0.23 - 0.02, 1.94, character === 1 || character === 3 ? 0.58 : 0.56],
      );
}

export function sculptKart(root: THREE.Group, shape: string, color: string, factory: Factory) {
  if (shape === 'classic') return; // Preserve Comète's approved sculpt.
  const { oval, box } = tools(root, factory);
  switch (shape) {
    case 'round':
      for (const side of [-1, 1]) {
        oval(color, [0.27, 0.22, 0.7], [side * 0.68, 0.72, 0.05]);
        oval('#fff1c4', [0.16, 0.06, 0.27], [side * 0.5, 0.94, 0.68]);
      }
      box('#d5e3df', [1.25, 0.09, 0.15], [0, 0.47, 1.28]);
      break;
    case 'formula':
      oval(color, [0.48, 0.22, 1.08], [0, 0.67, 0.42]);
      for (const side of [-1, 1]) {
        oval(color, [0.34, 0.25, 0.67], [side * 0.64, 0.63, -0.18]);
        box('#233044', [0.04, 0.13, 0.4], [side * 0.9, 0.69, -0.18]);
        box('#fff1c4', [0.16, 0.035, 0.46], [side * 0.8, 1.33, -1.15]);
      }
      box('#fff1c4', [0.12, 0.035, 0.8], [0, 0.9, 0.67]);
      break;
    case 'wedge':
      for (const side of [-1, 1]) {
        const shoulder = box(color, [0.3, 0.24, 1.9], [side * 0.7, 0.76, -0.08]);
        shoulder.rotation.z = side * -0.15;
        for (let vent = 0; vent < 3; vent++)
          box('#233044', [0.2, 0.03, 0.07], [side * 0.62, 0.91, -0.6 + vent * 0.16]);
      }
      box('#b7f9ef', [1, 0.06, 0.08], [0, 0.84, 1.18]);
      break;
    case 'buggy':
      for (const side of [-1, 1]) {
        for (const z of [-0.85, 0.85]) {
          oval(color, [0.4, 0.19, 0.65], [side * 1.02, 1.05, z]);
          const spring = box('#f2d084', [0.11, 0.38, 0.11], [side * 0.86, 0.54, z]);
          spring.rotation.z = side * 0.3;
        }
        box('#d5e3df', [0.18, 0.17, 0.35], [side * 0.5, 2.12, -0.65]);
      }
      box('#fff1c4', [0.8, 0.03, 0.1], [0, 1.09, 0.56]);
      break;
    case 'retro':
      oval(color, [0.67, 0.21, 0.72], [0, 1.09, 0.55]);
      for (const side of [-1, 1]) {
        oval(color, [0.27, 0.2, 1.12], [side * 0.86, 0.89, 0]);
        box('#d5e3df', [0.07, 0.07, 1.85], [side * 0.76, 0.76, 0]);
      }
      box('#d5e3df', [1.65, 0.13, 0.12], [0, 0.47, 1.35]);
      for (const x of [-0.24, 0, 0.24]) box('#d5e3df', [0.05, 0.29, 0.05], [x, 0.87, 1.31]);
      break;
    case 'rocket':
      for (const side of [-1, 1]) {
        oval(color, [0.32, 0.24, 0.95], [side * 0.7, 0.75, -0.23]);
        box('#fff1c4', [0.07, 0.05, 1.65], [side * 0.32, 1.01, 0]);
        box('#d5e3df', [0.4, 0.09, 0.13], [side * 0.8, 0.61, -1.35]);
      }
      break;
    case 'beetle':
      for (const side of [-1, 1]) {
        for (const z of [-0.78, 0.78]) oval(color, [0.3, 0.23, 0.53], [side * 0.83, 0.85, z]);
        box('#d5e3df', [0.06, 0.06, 1.55], [side * 0.91, 0.65, 0]);
      }
      for (const z of [-0.85, -0.65, -0.45]) box('#233044', [0.65, 0.035, 0.065], [0, 1.5, z]);
      break;
  }
}
