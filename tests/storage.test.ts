import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadSettings, saveSettings, defaultBindings } from '../src/config';
import { loadSelection, saveSelection } from '../src/storage';
import { freshPadBindings } from '../src/gamepad';
afterEach(() => vi.unstubAllGlobals());
describe('resilient local settings', () => {
  it('migrates old settings and persists independent gamepad bindings', () => {
    let stored = '{}';
    vi.stubGlobal('localStorage', {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    });
    const settings = loadSettings();
    expect(settings.padBindings).toEqual(freshPadBindings());
    settings.padBindings[0][0] = [{ kind: 'button', index: 4 }];
    settings.padBindings[1][2] = [{ kind: 'axis', index: 2, direction: -1 }];
    saveSettings(settings);
    expect(loadSettings().padBindings).toEqual(settings.padBindings);
    expect(settings.padBindings[2]).toEqual(freshPadBindings()[2]);
  });
  it.each([null, [], 'invalid', [[{ kind: 'button', index: -1 }]]])(
    'rejects corrupt gamepad profiles: %j',
    (padBindings) => {
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ padBindings }) });
      expect(loadSettings().padBindings).toEqual(freshPadBindings());
    },
  );
  it('rejects invalid gamepad control kinds, indices and axis signs', () => {
    for (const control of [
      { kind: 'button', index: -1 },
      { kind: 'button', index: 0.5 },
      { kind: 'button', index: 64 },
      { kind: '<img>', index: 1 },
      { kind: 'axis', index: 0, direction: 0 },
    ]) {
      const padBindings: unknown[][][] = freshPadBindings();
      padBindings[0][0] = [control];
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ padBindings }) });
      expect(loadSettings().padBindings).toEqual(freshPadBindings());
    }
  });
  it('validates saved bot difficulty and migrates older preferences to normal', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ difficulty }) });
      expect(loadSettings().difficulty).toBe(difficulty);
    }
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ difficulty: 'impossible' }) });
    expect(loadSettings().difficulty).toBe('normal');
  });
  it('migrates existing settings with independent music and effects levels', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ volume: 0.2 }) });
    expect(loadSettings()).toMatchObject({ volume: 0.2, musicVolume: 0.55, effectsVolume: 0.8 });
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ musicVolume: -4, effectsVolume: 3 }),
    });
    expect(loadSettings()).toMatchObject({ musicVolume: 0, effectsVolume: 1 });
  });
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
      players: Array.from({ length: 4 }, (_, i) => ({
        character: i,
        kart: i,
        device: 'keyboard',
        childMode: false,
      })),
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
  it('persists child mode independently and only accepts boolean true', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    let stored = '';
    vi.stubGlobal('localStorage', {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    });
    saveSelection({
      count: 2,
      track: 0,
      players: Array.from({ length: 4 }, (_, i) => ({
        character: i,
        kart: i,
        device: 'keyboard',
        childMode: i === 1,
      })),
    });
    expect(loadSelection()?.players.map((p) => p.childMode)).toEqual([false, true, false, false]);
    const corrupt = JSON.parse(stored);
    corrupt.players[0].childMode = 'true';
    stored = JSON.stringify(corrupt);
    expect(loadSelection()?.players[0].childMode).toBe(false);
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
