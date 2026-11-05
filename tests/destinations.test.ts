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

  it.each([3, 4])('keeps scenery footprints clear of both roads on circuit %i', (index) => {
    const track = new Track(index),
      decor = scenery(track);
    expect(decor.group.name).toBe(index === 3 ? 'snow-scenery' : 'city-scenery');
    expect(decor.group.children.length).toBeGreaterThan(60);
    for (const child of decor.group.children) {
      const bounds = new THREE.Box3().setFromObject(child);
      for (const route of ['main', 'shortcut'] as const)
        for (let step = 0; step <= 128; step++) {
          const point = track.routeAt(route, step / 128);
          const width = route === 'main' ? track.width : track.shortcut.width;
          const dx = Math.max(bounds.min.x - point.x, 0, point.x - bounds.max.x);
          const dz = Math.max(bounds.min.z - point.z, 0, point.z - bounds.max.z);
          expect(
            Math.hypot(dx, dz),
            `decor ${decor.group.children.indexOf(child)} ${route} ${step / 128}`,
          ).toBeGreaterThan(width / 2);
        }
    }
    expect(obstacleModel(track.createObstacle()).children.length).toBeGreaterThan(0);
  });
});
