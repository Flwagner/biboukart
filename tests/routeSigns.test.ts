import { afterEach, describe, expect, it, vi } from 'vitest';
import { Track } from '../src/track';
import { createRouteSigns } from '../src/routeSigns';

afterEach(() => vi.unstubAllGlobals());

describe('advance route signs', () => {
  it.each([0, 1, 2, 3, 4])('circuit %i announces both choices without blocking a road', (index) => {
    const text: string[] = [];
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          fillRect() {},
          strokeRect() {},
          fillText(value: string) {
            text.push(value);
          },
        }),
      }),
    });
    const track = new Track(index),
      signs = createRouteSigns(track);
    expect(signs.children).toHaveLength(2);
    expect(text).toContain('Étroit · technique');
    expect(text).toContain('Route alternative · cadeaux');
    expect(text.some((line) => line.includes(track.branch('alternative')!.label))).toBe(true);
    for (const sign of signs.children) {
      expect(track.overlapsAnyRoad(sign.position, 2.5)).toBe(false);
      expect(sign.children).toHaveLength(2);
    }
  });
});
