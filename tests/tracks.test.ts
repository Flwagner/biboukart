import { describe, it, expect } from 'vitest';
import { Track } from '../src/track';
import { Race, idleInput } from '../src/race';
const player = { character: 0, kart: 0, device: 'keyboard' };
describe('relief, shortcuts and mobile obstacles', () => {
  it('rejects a jump from shortcut entry to exit and cannot earn a checkpoint by reversing', () => {
    const race = new Race(1, [player]),
      r = race.racers[0],
      s = race.track.shortcut;
    race.countdown = 0;
    r.progress = s.start;
    r.lastT = s.start;
    r.checkpoint = Math.floor(s.start * 8);
    r.route = 'shortcut';
    r.pos.copy(race.track.routeAt('shortcut', 1));
    race.update(1 / 60, [idleInput()]);
    expect(r.progress).toBeCloseTo(s.start, 2);
    expect(r.lap).toBe(0);
    expect(r.checkpoint).toBe(Math.floor(s.start * 8));
    r.progress = s.start + (s.end - s.start) * 0.5;
    r.lastT = r.progress;
    r.pos.copy(race.track.routeAt('shortcut', 0.5));
    r.route = 'shortcut';
    r.checkpoint = Math.floor(r.progress * 8);
    const checkpoint = r.checkpoint,
      progress = r.progress,
      tangent = race.track.routeTangent('shortcut', 0.5);
    r.heading = Math.atan2(tangent.x, tangent.z);
    r.speed = -5;
    for (let i = 0; i < 20; i++) race.update(1 / 60, [idleInput()]);
    expect(r.progress).toBeLessThan(progress);
    expect(r.checkpoint).toBe(checkpoint);
  });
  it.each([0, 1, 2, 3, 4])(
    'track %i has continuous relief, narrower shorter alternative and valid joins',
    (index) => {
      const track = new Track(index),
        s = track.shortcut;
      expect(
        Math.max(...track.samples.map((p) => p.y)) - Math.min(...track.samples.map((p) => p.y)),
      ).toBeGreaterThan(2);
      expect(track.at(0).distanceTo(track.at(1))).toBeLessThan(0.0001);
      expect(s.length).toBeLessThan((s.end - s.start) * track.length);
      expect(s.width).toBeLessThan(track.width * 0.5);
      const separation = track.nearest(track.routeAt('shortcut', 0.5)).distance;
      expect(separation).toBeGreaterThan(track.width / 2 + s.width / 2 + 7);
      expect(track.routeAt('shortcut', 0).distanceTo(track.at(s.start))).toBeLessThan(0.001);
      expect(track.routeAt('shortcut', 1).distanceTo(track.at(s.end))).toBeLessThan(0.001);
      expect(track.routeTangent('shortcut', 0.0001).dot(track.tangent(s.start))).toBeGreaterThan(
        0.95,
      );
      for (let u = 0.1; u < 0.9; u += 0.1) {
        const p = track.routeAt('shortcut', u),
          surface = track.surface(p, 'shortcut');
        expect(surface.route).toBe('shortcut');
        expect(surface.t).toBeCloseTo(s.start + u * (s.end - s.start), 2);
        expect(surface.height).toBeCloseTo(p.y, 2);
      }
      console.log('Shortcut geometry', index, {
        mainArc: (s.end - s.start) * track.length,
        shortcut: s.length,
        width: s.width,
      });
    },
  );
  it.each([0, 1, 2, 3, 4])(
    'six drivers finish track %i with shortcuts, grounded contact and valid flight',
    (index) => {
      const race = new Race(index, [player]);
      race.racers.forEach((r) => (r.human = true));
      race.countdown = 0;
      for (let step = 0; step < 240 * 60 && !race.finished; step++) {
        race.update(
          1 / 60,
          race.racers.map((r) => race.ai(r, true)),
        );
        if (step % 60 === 0)
          for (const racer of race.racers)
            if (!racer.finished) {
              const height = race.track.surface(racer.pos, racer.route).height;
              if (!racer.airborne) expect(Math.abs(racer.pos.y - height)).toBeLessThan(0.25);
              else {
                expect(racer.pos.y - height).toBeGreaterThan(-0.25);
                expect(Number.isFinite(racer.verticalSpeed)).toBe(true);
              }
            }
      }
      expect(
        race.racers.map((r) => ({
          finished: r.finished,
          progress: r.progress,
          route: r.route,
          passes: r.shortcutPasses,
        })),
      ).toEqual(Array.from({ length: 6 }, () => expect.objectContaining({ finished: true })));
      // Traffic can make a driver skip an entry; at least one completes it every lap.
      expect(race.racers[0].shortcutPasses).toBeGreaterThanOrEqual(1);
      expect(race.racers.some((r) => r.shortcutPasses === 3)).toBe(true);
    },
    30000,
  );
  it.each([0, 1, 2, 3, 4])(
    'an isolated driver completes all three shortcut traversals on track %i',
    (index) => {
      const race = new Race(index, [player]);
      race.racers.splice(1);
      race.countdown = 0;
      for (let step = 0; step < 240 * 60 && !race.finished; step++)
        race.update(1 / 60, [race.ai(race.racers[0], true)]);
      expect(race.racers[0].finished).toBe(true);
      expect(race.racers[0].shortcutPasses).toBe(3);
      expect(race.racers[0].checkpoint).toBe(24);
    },
    30000,
  );
  it('respawns inside a shortcut without granting progress or moving to the other road', () => {
    const race = new Race(1, [player]),
      r = race.racers[0],
      s = race.track.shortcut;
    r.route = 'shortcut';
    r.progress = 1 + s.start + (s.end - s.start) * 0.5;
    const before = r.progress;
    race.respawn(r);
    expect(r.route).toBe('shortcut');
    expect(r.progress).toBe(before);
    expect(r.lastT).toBeCloseTo(before % 1);
    expect(r.pos.distanceTo(race.track.routeAt('shortcut', 0.5))).toBeLessThan(0.01);
    expect(r.previous.equals(r.pos)).toBe(true);
  });
  it('obstacles move deterministically inside the road and hits are temporary', () => {
    const race = new Race(0, [player]),
      obstacle = race.obstacles[0];
    race.track.moveObstacle(obstacle, 3);
    const first = obstacle.pos.clone();
    race.track.moveObstacle(obstacle, 3);
    expect(obstacle.pos.equals(first)).toBe(true);
    race.track.moveObstacle(obstacle, 4);
    expect(obstacle.pos.distanceTo(first)).toBeGreaterThan(0.1);
    race.countdown = 0;
    race.elapsed = 4;
    race.racers[0].pos.copy(obstacle.pos);
    race.racers[0].immune = 0;
    race.update(1 / 60, [idleInput()]);
    expect(race.racers[0].slow).toBeGreaterThan(0);
    race.racers[0].pos.copy(race.track.at(0.8));
    for (let i = 0; i < 180; i++) race.update(1 / 60, [idleInput()]);
    expect(race.racers[0].slow).toBe(0);
  });
});
