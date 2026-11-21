import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Track } from '../src/track';
import { trackDefinitions } from '../src/config';
import { createRoadGeometry } from '../src/road';
describe('full-width asphalt and clipped shoulders', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])(
    'road %i never narrows and no grass shoulder enters either paved surface',
    (index) => {
      const track = new Track(index),
        geometry = createRoadGeometry(track),
        positions = geometry.getAttribute('position'),
        colors = geometry.getAttribute('color'),
        ground = new THREE.Color(trackDefinitions[index].ground);
      // The first 512 quads are the continuous main-road slab, never clipped.
      for (let quad = 0; quad < 512; quad++) {
        const left = quad * 6,
          right = left + 2;
        expect(
          Math.hypot(
            positions.getX(left) - positions.getX(right),
            positions.getZ(left) - positions.getZ(right),
          ),
        ).toBeCloseTo(track.width, 4);
      }
      const seen = new Set<string>(),
        p = new THREE.Vector3();
      let checked = 0;
      for (let i = 0; i < positions.count; i++) {
        if (
          Math.abs(colors.getX(i) - ground.r) +
            Math.abs(colors.getY(i) - ground.g) +
            Math.abs(colors.getZ(i) - ground.b) >
          1e-5
        )
          continue;
        p.fromBufferAttribute(positions, i);
        const key = `${p.x.toFixed(3)},${p.z.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        expect(track.overlapsRoad(p, 'main', -0.02)).toBe(false);
        expect(track.overlapsRoad(p, 'shortcut', -0.02)).toBe(false);
        checked++;
      }
      expect(checked).toBeGreaterThan(100);
      geometry.dispose();
    },
    30000,
  );
  it.each([0, 1, 2, 3, 4, 5, 6])(
    'paints each boost strip across the full road width on circuit %i',
    (index) => {
      const track = new Track(index),
        geometry = createRoadGeometry(track),
        positions = geometry.getAttribute('position'),
        colors = geometry.getAttribute('color'),
        boost = new THREE.Color('#ffd84a');
      for (const t of track.boostTs) {
        const quad = Math.round(t * 512),
          left = quad * 6,
          right = left + 2;
        // Both painted edges sit on the asphalt edges, not inside them.
        expect(
          Math.hypot(
            positions.getX(left) - positions.getX(right),
            positions.getZ(left) - positions.getZ(right),
          ),
        ).toBeCloseTo(track.width, 4);
        for (let offset = 0; offset < 6; offset++) {
          const i = left + offset;
          expect(colors.getX(i)).toBeCloseTo(boost.r, 4);
          expect(colors.getY(i)).toBeCloseTo(boost.g, 4);
          expect(colors.getZ(i)).toBeCloseTo(boost.b, 4);
        }
      }
      geometry.dispose();
    },
  );
});
