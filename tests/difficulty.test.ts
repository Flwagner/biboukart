import { describe, it, expect, vi } from 'vitest';
import { Race, idleInput } from '../src/race';
import { karts, difficulties, type Difficulty } from '../src/config';
const player = { character: 0, kart: 0, device: 'keyboard' };
const matrix = (['easy', 'normal', 'hard'] as Difficulty[]).flatMap((difficulty) =>
  [0, 1, 2, 3, 4].flatMap((track) =>
    [false, true].map((shortcuts) => ({ difficulty, track, shortcuts })),
  ),
);
describe('fair and adjustable bot difficulty', () => {
  it.each(matrix)(
    '$difficulty / track $track / shortcuts $shortcuts: all six finish without unintended recovery or illegal speeds',
    ({ difficulty, track, shortcuts }) => {
      const race = new Race(track, [player], difficulty);
      race.racers.forEach((r) => (r.human = true));
      race.countdown = 0;
      const recoveries: boolean[] = [];
      const respawn = race.respawn.bind(race);
      vi.spyOn(race, 'respawn').mockImplementation((r) => {
        // Giant knockback deliberately recovers after its flight; stuck bots must not.
        recoveries.push(r.knockback.lengthSq() > 0 && r.knockedTime === 0 && r.stuck < 5);
        respawn(r);
      });
      for (let step = 0; step < 300 * 60 && !race.finished; step++) {
        race.update(
          1 / 60,
          race.racers.map((r) => race.ai(r, shortcuts ? true : undefined)),
        );
        for (const r of race.racers) {
          expect(Number.isFinite(r.pos.y)).toBe(true);
          expect(r.speed).toBeLessThanOrEqual(
            karts[r.config.kart].speed * (r.boost > 0 ? 1.5 : 1) + 0.001,
          );
        }
      }
      expect(
        race.racers.map((r) => ({
          id: r.id,
          finished: r.finished,
          progress: r.progress,
          checkpoint: r.checkpoint,
        })),
      ).toEqual(
        Array.from({ length: 6 }, () =>
          expect.objectContaining({ finished: true, checkpoint: 24 }),
        ),
      );
      expect(recoveries.every(Boolean)).toBe(true);
      if (shortcuts) expect(race.racers.some((r) => r.shortcutPasses === 3)).toBe(true);
    },
    30000,
  );
  it('changes AI decisions, not human acceleration or physical limits', () => {
    const speeds = [];
    for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
      const race = new Race(0, [player], difficulty);
      race.countdown = 0;
      race.racers[0].pos.copy(race.track.at(0.8));
      for (let i = 0; i < 30; i++) race.update(1 / 60, [{ ...idleInput(), throttle: 1 }]);
      speeds.push(race.racers[0].speed);
    }
    expect(speeds[0]).toBeCloseTo(speeds[1]);
    expect(speeds[1]).toBeCloseTo(speeds[2]);
    expect(difficulties.easy.speed).toBeLessThan(difficulties.normal.speed);
    expect(difficulties.normal.speed).toBeLessThan(difficulties.hard.speed);
  });
  it('hard bots finish a clean reference race faster than easy bots using the same kart', () => {
    const times: number[] = [];
    for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
      const race = new Race(0, [player], difficulty);
      race.racers.splice(1);
      race.pickups = [];
      race.countdown = 0;
      for (let step = 0; step < 300 * 60 && !race.finished; step++)
        race.update(1 / 60, [race.ai(race.racers[0])]);
      expect(race.finished).toBe(true);
      times.push(race.elapsed);
    }
    console.log('Reference race seconds [easy, normal, hard]:', times);
    expect(times[0]).toBeGreaterThan(times[1]);
    expect(times[1]).toBeGreaterThan(times[2]);
  });
});
