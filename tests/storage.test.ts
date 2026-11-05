import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadSettings, saveSettings, defaultBindings } from '../src/config';
import { loadSelection, saveSelection } from '../src/storage';
afterEach(() => vi.unstubAllGlobals());
describe('resilient local settings', () => {
  it('rejects corrupted key codes instead of interpolating them into menus', () => {
    vi.stubGlobal('localStorage', {
      getItem: () =>
        JSON.stringify({ bindings: Array.from({ length: 4 }, () => Array(5).fill('<img src=x>')) }),
    });
    expect(loadSettings().bindings).toEqual(defaultBindings);
  });
  it('loads valid selections but resets hardware controller indices', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('localStorage', {
      getItem: () =>
        JSON.stringify({
          count: 2,
          track: 1,
          players: Array.from({ length: 4 }, (_, i) => ({
            character: i,
            kart: i,
            device: 'pad:7',
          })),
        }),
    });
    expect(loadSelection()).toEqual({
      count: 2,
      track: 1,
      players: Array.from({ length: 4 }, (_, i) => ({ character: i, kart: i, device: 'keyboard' })),
    });
  });
  it('rejects invalid selections and tolerates denied writes', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ count: 99, track: 0, players: [] }),
      setItem() {
        throw Error('denied');
      },
    });
    expect(loadSelection()).toBeNull();
    expect(() => saveSelection({ count: 1, track: 0, players: [] })).not.toThrow();
  });
  it('works with unavailable storage', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw Error('unavailable');
      },
      setItem() {
        throw Error('unavailable');
      },
    });
    expect(loadSettings().bindings).toEqual(defaultBindings);
    expect(() => saveSettings(loadSettings())).not.toThrow();
  });
  it('ignores corrupt data and clamps volume', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{bad json' });
    expect(loadSettings().volume).toBe(0.3);
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ volume: 8, quality: 'invalid', bindings: [null] }),
    });
    expect(loadSettings().volume).toBe(1);
    expect(loadSettings().quality).toBe('auto');
    expect(loadSettings().bindings).toEqual(defaultBindings);
  });
});
