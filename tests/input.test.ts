import { describe, it, expect, vi, afterEach } from 'vitest';
import { Inputs } from '../src/input';
import { defaultBindings } from '../src/config';
import { freshPadBindings } from '../src/gamepad';
const settings = () => ({
  volume: 0.3,
  musicVolume: 0.55,
  effectsVolume: 0.8,
  difficulty: 'normal' as const,
  quality: 'auto',
  reduced: false,
  bindings: defaultBindings.map((b) => [...b]),
  padBindings: freshPadBindings(),
});
afterEach(() => vi.unstubAllGlobals());
function inputHarness() {
  const events = new Map<string, (e: any) => void>();
  vi.stubGlobal('addEventListener', (type: string, fn: (e: any) => void) => events.set(type, fn));
  vi.stubGlobal('navigator', { getGamepads: () => [] });
  return { input: new Inputs(settings()), events };
}
describe('independent controls', () => {
  it('allows a short B press to be mapped but holding B cancels capture', () => {
    const { input } = inputHarness();
    const buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
    vi.stubGlobal('navigator', { getGamepads: () => [{ index: 0, axes: [0, 0], buttons }] });
    const captured = vi.fn(() => true),
      cancel = vi.fn();
    input.beginPadRemap(captured, cancel);
    input.pollPadRemap(0);
    buttons[1] = { pressed: true, value: 1 };
    input.pollPadRemap(10);
    input.pollPadRemap(700);
    expect(captured).not.toHaveBeenCalled();
    buttons[1] = { pressed: false, value: 0 };
    input.pollPadRemap(710);
    expect(captured).toHaveBeenCalledExactlyOnceWith({ kind: 'button', index: 1 });
    input.beginPadRemap(captured, cancel);
    input.pollPadRemap(1000);
    buttons[1] = { pressed: true, value: 1 };
    input.pollPadRemap(1010);
    input.pollPadRemap(1810);
    expect(cancel).toHaveBeenCalledOnce();
    expect(captured).toHaveBeenCalledTimes(1);
    expect(input.onPadRemap).toBeNull();
  });
  it('uses independent custom gamepad profiles, analog buttons, axes and item edges', () => {
    const { input } = inputHarness();
    const buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
    const pad = { index: 0, axes: [0, 0, -0.8], buttons };
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    input.players = [0, 1].map((i) => ({ character: i, kart: i, device: 'pad:0' }));
    input.settings.padBindings[0][0] = [{ kind: 'button', index: 4 }];
    input.settings.padBindings[0][1] = [{ kind: 'button', index: 5 }];
    input.settings.padBindings[0][2] = [{ kind: 'axis', index: 2, direction: -1 }];
    input.settings.padBindings[0][4] = [{ kind: 'button', index: 3 }];
    buttons[4] = { pressed: true, value: 0.7 };
    buttons[5] = { pressed: true, value: 0.3 };
    buttons[3] = { pressed: true, value: 1 };
    const result = input.read();
    expect(result[0]).toMatchObject({ throttle: 0.7, brake: 0.3, steer: -0.8, use: true });
    expect(result[1]).toMatchObject({ throttle: 0, brake: 0, steer: 0, use: false });
    expect(input.read()[0].use).toBe(false);
    pad.axes[2] = -0.1;
    expect(input.read()[0].steer).toBe(0);
  });
  it('uses a remapped pause button rather than Start', () => {
    const { input } = inputHarness();
    const buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
    vi.stubGlobal('navigator', { getGamepads: () => [{ index: 0, axes: [], buttons }] });
    input.players = [{ character: 0, kart: 0, device: 'pad:0' }];
    input.settings.padBindings[0][5] = [{ kind: 'button', index: 8 }];
    input.onPause = vi.fn();
    buttons[9] = { pressed: true, value: 1 };
    input.pollPause();
    expect(input.onPause).not.toHaveBeenCalled();
    buttons[8] = { pressed: true, value: 1 };
    input.pollPause();
    input.pollPause();
    expect(input.onPause).toHaveBeenCalledTimes(1);
    buttons[8] = { pressed: false, value: 0 };
    input.pollPause();
    buttons[8] = { pressed: true, value: 1 };
    input.pollPause();
    expect(input.onPause).toHaveBeenCalledTimes(2);
  });
  it('captures only after release, ignores stick drift and suppresses held inputs after capture', () => {
    const { input } = inputHarness();
    const pad = { axes: [0.1], buttons: [{ pressed: true, value: 1 }] };
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    const callback = vi.fn(() => true);
    input.beginPadRemap(callback);
    expect(input.pollPadRemap()).toBe(true);
    expect(callback).not.toHaveBeenCalled();
    pad.buttons[0] = { pressed: false, value: 0 };
    input.pollPadRemap();
    expect(callback).not.toHaveBeenCalled();
    pad.axes[0] = -0.9;
    input.pollPadRemap();
    expect(callback).toHaveBeenCalledExactlyOnceWith({ kind: 'axis', index: 0, direction: -1 });
    expect(input.pollPadRemap()).toBe(true);
    pad.axes[0] = 0;
    expect(input.pollPadRemap()).toBe(true);
    expect(input.pollPadRemap()).toBe(false);
  });
  it('cancels capture without changing a mapping', () => {
    const { input } = inputHarness();
    const callback = vi.fn(() => true);
    input.beginPadRemap(callback);
    input.cancelPadRemap();
    input.pollPadRemap();
    expect(callback).not.toHaveBeenCalled();
    expect(input.onPadRemap).toBeNull();
  });
  it.each(['keyboard', 'pad:0', 'touch'])(
    'uses negative for left and positive for right on %s',
    (device) => {
      const { input } = inputHarness();
      input.players = [{ character: 0, kart: 0, device }];
      for (const side of [-1, 1]) {
        input.clear();
        if (device === 'keyboard') input.keys.add(side < 0 ? 'KeyA' : 'KeyD');
        else if (device === 'touch') input.touchState[0][side < 0 ? 'left' : 'right'] = 1;
        else vi.stubGlobal('navigator', { getGamepads: () => [{ axes: [side, 0], buttons: [] }] });
        expect(input.read()[0].steer).toBe(side);
      }
    },
  );
  it('isolates shared keyboard profiles and clears held keys on focus loss', () => {
    const { input, events } = inputHarness();
    input.players = [
      { character: 0, kart: 0, device: 'keyboard' },
      { character: 1, kart: 1, device: 'keyboard' },
    ];
    events.get('keydown')!({ code: 'ArrowUp', target: { tagName: 'BODY' }, preventDefault() {} });
    expect(input.read().map((i) => i.throttle)).toEqual([0, 1]);
    events.get('blur')!({});
    expect(input.read().map((i) => i.throttle)).toEqual([0, 0]);
  });
  it('uses an item only on the rising edge', () => {
    const { input } = inputHarness();
    input.players = [{ character: 0, kart: 0, device: 'keyboard' }];
    input.keys.add('Space');
    expect(input.read()[0].use).toBe(true);
    expect(input.read()[0].use).toBe(false);
    input.keys.delete('Space');
    input.read();
    input.keys.add('Space');
    expect(input.read()[0].use).toBe(true);
  });
  it('releases only the relevant touch and preserves concurrent fingers', () => {
    const { input } = inputHarness();
    input.touches.set(1, { player: 0, action: 'throttle' });
    input.touches.set(2, { player: 1, action: 'throttle' });
    input.touchState[0].throttle = 1;
    input.touchState[1].throttle = 1;
    input.release(1);
    expect(input.touchState[0].throttle).toBe(0);
    expect(input.touchState[1].throttle).toBe(1);
    input.clear();
    expect(input.touches.size).toBe(0);
  });
  it('can pause and resume on separate Start presses without repeats', () => {
    const { input } = inputHarness();
    let pressed = true;
    vi.stubGlobal('navigator', {
      getGamepads: () => [
        {
          index: 0,
          buttons: Array.from({ length: 10 }, (_, i) => ({ pressed: i === 9 && pressed })),
        },
      ],
    });
    input.players = [{ character: 0, kart: 0, device: 'pad:0' }];
    input.onPause = vi.fn();
    input.pollPause();
    input.clear();
    input.pollPause();
    expect(input.onPause).toHaveBeenCalledTimes(1);
    pressed = false;
    input.pollPause();
    pressed = true;
    input.pollPause();
    expect(input.onPause).toHaveBeenCalledTimes(2);
  });
});
