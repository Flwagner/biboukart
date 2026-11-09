import { describe, expect, it } from 'vitest';
import { MenuGamepad } from '../src/menuGamepad';

function pad(index = 0) {
  return {
    index,
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0, touched: false })),
  };
}
describe('menu gamepad events', () => {
  it('validates and goes back once per press, independently for every controller', () => {
    const menu = new MenuGamepad();
    const first = pad(),
      second = pad(3);
    expect(menu.poll([first, null, null, second], 0)).toEqual([]);
    second.buttons[0].pressed = true;
    expect(menu.poll([first, null, null, second], 1)).toMatchObject([{ pad: 3, kind: 'confirm' }]);
    expect(menu.poll([first, null, null, second], 1000)).toEqual([]);
    first.buttons[1].pressed = true;
    expect(menu.poll([first, second], 1100)).toMatchObject([{ pad: 0, kind: 'back' }]);
    first.buttons[1].pressed = false;
    menu.poll([first, second], 1200);
    first.buttons[1].pressed = true;
    expect(menu.poll([first, second], 1300)).toMatchObject([{ kind: 'back' }]);
  });
  it('responds immediately to taps and repeats held directions after a delay', () => {
    const menu = new MenuGamepad(),
      p = pad();
    p.buttons[13].pressed = true;
    expect(menu.poll([p], 0)).toMatchObject([{ kind: 'move', y: 1 }]);
    expect(menu.poll([p], 399)).toEqual([]);
    expect(menu.poll([p], 400)).toMatchObject([{ kind: 'move', y: 1 }]);
    expect(menu.poll([p], 559)).toEqual([]);
    expect(menu.poll([p], 560)).toMatchObject([{ kind: 'move', y: 1 }]);
    p.buttons[13].pressed = false;
    menu.poll([p], 561);
    p.buttons[13].pressed = true;
    expect(menu.poll([p], 562)).toMatchObject([{ kind: 'move', y: 1 }]);
  });
  it('supports sticks, ignores drift and clears disconnected state', () => {
    const menu = new MenuGamepad(),
      p = pad();
    p.axes[0] = 0.1;
    expect(menu.poll([p], 0)).toEqual([]);
    p.axes[0] = -0.8;
    p.axes[3] = 0.7;
    expect(menu.poll([p], 1)).toMatchObject([
      { kind: 'move', x: -1 },
      { kind: 'scroll', y: 0.7 },
    ]);
    menu.poll([], 2);
    p.axes[0] = 0;
    p.axes[3] = 0;
    p.buttons[0].pressed = true;
    expect(menu.poll([null, p], 3)).toMatchObject([{ kind: 'confirm' }]);
  });
  it('gives back priority over confirm on simultaneous presses', () => {
    const menu = new MenuGamepad(),
      p = pad();
    p.buttons[0].pressed = p.buttons[1].pressed = true;
    expect(menu.poll([p], 0)).toMatchObject([{ kind: 'back' }]);
  });
});
