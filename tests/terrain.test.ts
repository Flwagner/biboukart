import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Track, type Route } from '../src/track';
import { createTerrainGeometry, terrainLayout } from '../src/terrain';
/** Interpolate the actual rendered triangles, not only the analytical height function. */
function meshHeight(geometry: THREE.BufferGeometry, p: THREE.Vector3) {
  const { width, depth, segments } = terrainLayout,
    x = (p.x + width / 2) / (width / segments),
    z = (p.z + depth / 2) / (depth / segments);
  const col = Math.floor(x),
    row = Math.floor(z),
    u = x - col,
    v = z - row,
    positions = geometry.getAttribute('position');
  const a = positions.getY(row * (segments + 1) + col),
    b = positions.getY((row + 1) * (segments + 1) + col),
    c = positions.getY((row + 1) * (segments + 1) + col + 1),
    d = positions.getY(row * (segments + 1) + col + 1);
  return u + v <= 1 ? a + (d - a) * u + (b - a) * v : c + (b - c) * (1 - u) + (d - c) * (1 - v);
}
describe('terrain never buries a paved road or shortcut merge', () => {
  it.each([0, 1, 2])(
    'rendered triangles stay below every paved corridor on circuit %i',
    (index) => {
      const track = new Track(index),
        terrain = createTerrainGeometry(track);
      for (const route of ['main', 'shortcut'] as Route[])
        for (let step = 0; step <= 256; step++) {
          const u = step / 256,
            width = route === 'main' ? track.width : track.shortcut.width,
            center = track.routeAt(route, u),
            tangent = track.routeTangent(route, u),
            normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
          for (const side of [-0.8, 0, 0.8]) {
            const offset = (width / 2) * side,
              p = center.clone().addScaledVector(normal, offset);
            if (route === 'main') p.y += track.bank(u) * offset;
            expect(
              meshHeight(terrain, p) - p.y,
              `${route} t=${u.toFixed(3)} side=${side}`,
            ).toBeLessThan(-0.01);
          }
        }
      terrain.dispose();
    },
  );
});
