import { describe, it, expect } from 'vitest';
import { Race, Track, idleInput, wrap } from '../src/race';
const player = { character: 0, kart: 0, device: 'keyboard' };
function tick(race: Race, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) race.update(1 / 60, [idleInput()]);
}
describe('arcade simulation', () => {
  it('creates six racers and a closed track', () => {
    const r = new Race(0, [player]);
    expect(r.racers).toHaveLength(6);
    expect(r.racers.filter((r) => r.human)).toHaveLength(1);
    expect(r.track.at(0).distanceTo(r.track.at(1))).toBeLessThan(0.001);
  });
  it('keeps all karts still during countdown', () => {
    const r = new Race(0, [player]);
    const start = r.racers[0].pos.clone();
    r.update(1, [{ throttle: 1, brake: 0, steer: 0, use: false }]);
    expect(r.racers[0].pos.distanceTo(start)).toBe(0);
  });
  it('accelerates and brakes into reverse', () => {
    const r = new Race(0, [player]);
    r.countdown = 0;
    for (let i = 0; i < 30; i++)
      r.update(1 / 60, [{ throttle: 1, brake: 0, steer: 0, use: false }]);
    expect(r.racers[0].speed).toBeGreaterThan(5);
    for (let i = 0; i < 120; i++)
      r.update(1 / 60, [{ throttle: 0, brake: 1, steer: 0, use: false }]);
    expect(r.racers[0].speed).toBeLessThan(0);
  });
  it('does not count a lap from a teleport or reversing over start', () => {
    const r = new Race(0, [player]);
    r.countdown = 0;
    const p = r.racers[0];
    p.pos.copy(r.track.at(0.8));
    r.update(1 / 60, [idleInput()]);
    expect(p.checkpoint).toBe(0);
    expect(p.lap).toBe(0);
  });
  it('caps boost stacking and consumes objects', () => {
    const r = new Race(0, [player]),
      p = r.racers[0];
    p.boost = 3.5;
    p.item = 'turbo';
    r.use(p);
    expect(p.boost).toBe(4);
    expect(p.item).toBeNull();
  });
  it('shield absorbs a hit and immunity prevents chain attacks', () => {
    const r = new Race(0, [player]),
      p = r.racers[0];
    p.shield = 5;
    p.speed = 20;
    r.hit(p);
    expect(p.shield).toBe(0);
    expect(p.speed).toBe(20);
    r.hit(p);
    expect(p.slow).toBe(0);
    p.immune = 0;
    r.hit(p);
    expect(p.speed).toBe(9);
    expect(p.immune).toBeGreaterThan(0);
  });
  it('expires shield, traps and temporary effects', () => {
    const r = new Race(0, [player]);
    r.countdown = 0;
    const p = r.racers[0];
    p.item = 'trap';
    r.use(p);
    p.shield = 1;
    p.boost = 0.5;
    tick(r, 16);
    expect(r.hazards).toHaveLength(0);
    expect(p.shield).toBe(0);
    expect(p.boost).toBe(0);
  });
  it('uses deterministic item distribution', () => {
    const a = new Race(0, [player]),
      b = new Race(0, [player]);
    expect(Array.from({ length: 20 }, () => a.chooseItem(4))).toEqual(
      Array.from({ length: 20 }, () => b.chooseItem(4)),
    );
  });
  it('respawns without granting race progress', () => {
    const r = new Race(0, [player]),
      p = r.racers[0];
    p.progress = 0.36;
    r.respawn(p);
    expect(p.pos.distanceTo(r.track.at(0.36))).toBeLessThan(0.01);
    expect(p.progress).toBe(0.36);
    expect(p.speed).toBe(0);
  });
  it.each([0, 1, 2])(
    'all six AI drivers finish three real laps on track %i',
    (index) => {
      const r = new Race(index, [player]);
      r.racers.forEach((p) => (p.human = true));
      r.countdown = 0;
      for (let i = 0; i < 180 * 60 && !r.racers.every((p) => p.finished); i++)
        r.update(
          1 / 60,
          r.racers.map((p) => r.ai(p)),
        );
      expect(
        r.racers.map((p) => ({
          finished: p.finished,
          progress: p.progress,
          checkpoint: p.checkpoint,
        })),
      ).toEqual(Array.from({ length: 6 }, () => expect.objectContaining({ finished: true })));
    },
    20000,
  );
  it('sorts finished drivers by time and unfinished by progress', () => {
    const r = new Race(0, [player]);
    r.racers[3].finished = true;
    r.racers[3].finishTime = 100;
    r.racers[1].progress = 2;
    expect(r.ranking[0].id).toBe(3);
    expect(r.ranking[1].id).toBe(1);
  });
  it('has normalized track tangents and wrapped angles', () => {
    const t = new Track(2);
    expect(t.tangent(0.5).length()).toBeCloseTo(1);
    expect(wrap(2 * Math.PI + 0.2)).toBeCloseTo(0.2);
  });
});
