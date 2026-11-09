import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { trackDefinitions } from '../src/config';
import { Track, trackPreviewPath } from '../src/track';
import { scenery, obstacleModel } from '../src/scenery';
import { loadSelection } from '../src/storage';

afterEach(() => vi.unstubAllGlobals());

describe('mountain and city destinations', () => {
  it('offers five distinct circuits with previews based on their real curves', () => {
    expect(trackDefinitions).toHaveLength(5);
    const paths = trackDefinitions.map((_, index) => trackPreviewPath(index));
    expect(new Set(paths).size).toBe(5);
    paths.forEach((path) => {
      expect(path).toMatch(/^M.* Z$/);
      expect(path).not.toMatch(/NaN|Infinity/);
    });
  });

  it.each([3, 4])('restores saved destination %i', (track) => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('localStorage', {
      getItem: () =>
        JSON.stringify({
          count: 1,
          track,
          players: Array.from({ length: 4 }, () => ({ character: 7, kart: 7, device: 'keyboard' })),
        }),
    });
    expect(loadSelection()?.track).toBe(track);
  });

  it.each([0, 1, 2, 3, 4])(
    'keeps scenery footprints clear of every road on circuit %i',
    (index) => {
      const track = new Track(index),
        decor = scenery(track);
      if (index >= 3) {
        expect(decor.group.name).toBe(index === 3 ? 'snow-scenery' : 'city-scenery');
        expect(decor.group.children.length).toBeGreaterThan(60);
      }
      const corridors = track.routes.flatMap((route) =>
        Array.from({ length: 129 }, (_, step) => ({
          point: track.routeAt(route, step / 128),
          width: track.routeWidth(route),
          label: `${route} ${step / 128}`,
        })),
      );
      for (const child of decor.group.children) {
        const bounds = new THREE.Box3().setFromObject(child);
        let gap = Infinity,
          closest = '';
        for (const { point, width, label } of corridors) {
          const dx = Math.max(bounds.min.x - point.x, 0, point.x - bounds.max.x);
          const dz = Math.max(bounds.min.z - point.z, 0, point.z - bounds.max.z);
          const clearance = Math.hypot(dx, dz) - width / 2;
          if (clearance < gap) {
            gap = clearance;
            closest = label;
          }
        }
        expect(gap, `decor ${decor.group.children.indexOf(child)} ${closest}`).toBeGreaterThan(0);
      }
      expect(obstacleModel(track.createObstacle()).children.length).toBeGreaterThan(0);
    },
  );
});
