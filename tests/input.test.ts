import { describe, it, expect, vi, afterEach } from 'vitest';
import { Inputs } from '../src/input';
import { defaultBindings } from '../src/config';
const settings = () => ({
  volume: 0.3,
  musicVolume: 0.55,
  effectsVolume: 0.8,
  quality: 'auto',
  reduced: false,
  bindings: defaultBindings.map((b) => [...b]),
});
afterEach(() => vi.unstubAllGlobals());
function inputHarness() {
  const events = new Map<string, (e: any) => void>();
  vi.stubGlobal('addEventListener', (type: string, fn: (e: any) => void) => events.set(type, fn));
  vi.stubGlobal('navigator', { getGamepads: () => [] });
  return { input: new Inputs(settings()), events };
}
describe('independent controls', () => {
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
