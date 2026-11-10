import { describe, expect, it } from 'vitest';
import { karts } from '../src/config';
import { Race, idleInput } from '../src/race';

describe('cosmetic kart selection', () => {
  it('gives every design the same driving characteristics', () => {
    for (const kart of karts) {
      expect(kart).toMatchObject({ speed: 29, acceleration: 14, handling: 2.1 });
    }
    expect(new Set(karts.map((kart) => kart.shape)).size).toBe(karts.length);
  });

  it.each([false, true])('drives identically across designs (AI: %s)', (ai) => {
    const results = karts.map((_, kart) => {
      const race = new Race(0, [{ character: 0, kart, device: 'keyboard' }]);
      race.countdown = 0;
      // Isolate the driver from other racers and random pickups.
      race.racers.splice(1);
      race.pickups = [];
      race.obstacles = [];
      const racer = race.racers[0];
      racer.human = !ai;
      for (let frame = 0; frame < 240; frame++) {
        race.update(1 / 60, [
          {
            ...idleInput(),
            throttle: frame < 180 ? 1 : 0,
            brake: frame >= 180 ? 1 : 0,
            steer: frame >= 120 && frame < 180 ? 0.4 : 0,
          },
        ]);
      }
      return { speed: racer.speed, heading: racer.heading, position: racer.pos.toArray() };
    });
    for (const result of results) expect(result).toEqual(results[0]);
  });
});
