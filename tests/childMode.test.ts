import { describe, expect, it } from 'vitest';
import { Race, idleInput, wrap } from '../src/race';

const child = { character: 0, kart: 0, device: 'keyboard', childMode: true };
function solo(track = 0) {
  const race = new Race(track, [child]);
  race.countdown = 0;
  // Isolate driving from bots; collision coverage has its own test below.
  race.racers = [race.racers[0]];
  return race;
}
function tick(race: Race, seconds: number, input = idleInput()) {
  for (let i = 0; i < seconds * 60; i++) race.update(1 / 60, [input]);
}

describe('per-player child assistance', () => {
  it('waits for the start, accelerates automatically and never mutates raw input', () => {
    const race = solo();
    const input = idleInput();
    race.countdown = 1;
    const start = race.racers[0].pos.clone();
    tick(race, 0.5, input);
    expect(race.racers[0].pos.equals(start)).toBe(true);
    tick(race, 2, input);
    expect(race.racers[0].speed).toBeGreaterThan(5);
    expect(input).toEqual(idleInput());
  });
  it('lets the brake stop the kart without reversing, then restarts', () => {
    const race = solo();
    tick(race, 2);
    tick(race, 3, { ...idleInput(), throttle: 1, brake: 1 });
    expect(race.racers[0].speed).toBe(0);
    tick(race, 1);
    expect(race.racers[0].speed).toBeGreaterThan(5);
  });
  it('does not change normal human controls or enable assistance on bots', () => {
    const race = new Race(0, [child, { ...child, childMode: false }]);
    race.countdown = 0;
    tick(race, 1);
    expect(race.racers[0].speed).toBeGreaterThan(0);
    expect(race.racers[1].speed).toBe(0);
    expect(race.racers[2].config.childMode).not.toBe(true);
  });
  it('preserves manual steering and object use in a safe part of the road', () => {
    const race = solo();
    const r = race.racers[0];
    r.pos.copy(race.track.at(0.5));
    const tangent = race.track.tangent(0.5);
    r.heading = Math.atan2(tangent.x, tangent.z);
    r.item = 'shield';
    race.update(1 / 60, [{ ...idleInput(), steer: 0.2, use: true }]);
    expect(r.steering).toBe(0.2);
    expect(r.item).toBeNull();
    expect(r.shield).toBeGreaterThan(0);
  });
  it('respects stun and finish states', () => {
    const race = solo();
    const r = race.racers[0];
    r.stun = 2;
    tick(race, 1);
    expect(r.speed).toBe(0);
    r.stun = 0;
    r.finished = true;
    tick(race, 1);
    expect(r.speed).toBe(0);
  });
  it.each([0, 1, 2, 3, 4])(
    'does not follow circuit %i automatically before touching an edge',
    (track) => {
      for (const steer of [-1, 0, 1]) {
        const race = solo(track);
        const r = race.racers[0];
        r.pos.copy(race.track.at(0.5));
        r.heading = 0.7;
        r.speed = 12;
        const before = r.heading;
        race.update(1 / 60, [{ ...idleInput(), steer }]);
        expect(r.heading).toBeCloseTo(before - (steer * 2.1) / 60, 10);
        expect(r.steering).toBe(steer);
      }
    },
  );
  it.each([0, 1, 2, 3, 4].flatMap((track) => [-1, 1].map((steer) => [track, steer])))(
    'stays on circuit %i with steering held at %i',
    (track, steer) => {
      const race = solo(track);
      const r = race.racers[0];
      for (let i = 0; i < 60 * 40; i++) {
        race.update(1 / 60, [{ ...idleInput(), steer }]);
        const surface = race.track.surface(r.pos, r.route);
        expect(surface.distance).toBeLessThanOrEqual(surface.width / 2 + 0.01);
      }
    },
  );
  it('does not correct a backwards heading before touching the edge', () => {
    const race = solo();
    const r = race.racers[0];
    r.heading += Math.PI;
    const heading = r.heading;
    tick(race, 0.5);
    expect(r.heading).toBe(heading);
  });
  it('only redirects when the kart actually touches the road boundary', () => {
    const race = solo();
    const r = race.racers[0];
    const center = race.track.at(0.5);
    const tangent = race.track.tangent(0.5);
    const radius = race.track.width / 2 - 1.1;
    const side = { x: tangent.z, z: -tangent.x };
    const forward = Math.atan2(tangent.x, tangent.z);
    r.heading = forward + Math.PI / 2;
    r.pos.copy(center);
    r.pos.x += side.x * (radius - 0.1);
    r.pos.z += side.z * (radius - 0.1);
    const before = r.heading;
    expect(race.keepChildOnRoad(r, 1 / 60)).toBe(false);
    expect(r.heading).toBe(before);
    r.pos.x += side.x * 0.3;
    r.pos.z += side.z * 0.3;
    expect(race.keepChildOnRoad(r, 1 / 60)).toBe(true);
    expect(Math.abs(wrap(r.heading - forward))).toBeLessThan(Math.abs(wrap(before - forward)));
  });
  it('softens edge correction and eases out without snapping to the target heading', () => {
    const corrections: number[] = [];
    for (const error of [1.5, 0.15]) {
      const race = solo();
      const r = race.racers[0];
      r.pos.copy(race.track.at(0.5));
      const tangent = race.track.tangent(0.5);
      r.pos.x += tangent.z * race.track.width;
      r.pos.z -= tangent.x * race.track.width;
      const surface = race.track.surface(r.pos, r.route);
      const contact = r.pos.clone();
      r.stun = 1;
      race.keepChildOnRoad(r, 1 / 60);
      const target = surface.center.clone().addScaledVector(surface.tangent, 8);
      const desired = Math.atan2(target.x - r.pos.x, target.z - r.pos.z);
      r.pos.copy(contact);
      r.stun = 0;
      r.heading = desired + error;
      const before = r.heading;
      race.keepChildOnRoad(r, 1 / 60);
      const correction = Math.abs(wrap(r.heading - before));
      expect(correction).toBeGreaterThan(0);
      expect(correction).toBeLessThanOrEqual(2.8 / 60 + 1e-10);
      expect(correction).toBeLessThan(error);
      corrections.push(correction);
    }
    expect(corrections[1]).toBeLessThan(corrections[0] / 5);
  });
  it('does not reset a stationary kart away from the boundary', () => {
    const race = solo();
    const r = race.racers[0];
    for (let i = 0; i < 360; i++) {
      r.speed = 0;
      race.update(1 / 60, [idleInput()]);
    }
    expect(r.immune).toBe(0);
    expect(r.assistedStuck).toBe(0);
  });
  it('recovers from a persistent edge blockage without awarding progress', () => {
    const race = solo();
    const r = race.racers[0];
    const startProgress = r.progress;
    const edge = r.pos.clone();
    const tangent = race.track.tangent(r.lastT);
    edge.x += tangent.z * race.track.width;
    edge.z -= tangent.x * race.track.width;
    for (let i = 0; i < 130; i++) {
      r.pos.copy(edge);
      r.speed = 0;
      race.update(1 / 60, [idleInput()]);
    }
    expect(r.immune).toBeGreaterThan(0);
    expect(r.progress - startProgress).toBeLessThan(0.02);
  });
  it.each([0, 1, 2, 3, 4])(
    'protects shortcuts and preserves jump height on circuit %i',
    (track) => {
      const race = solo(track);
      const r = race.racers[0];
      r.route = 'shortcut';
      r.pos.copy(race.track.routeAt('shortcut', 0.5));
      const tangent = race.track.routeTangent('shortcut', 0.5);
      r.pos.x += tangent.z * 10;
      r.pos.z -= tangent.x * 10;
      r.pos.y += 5;
      const height = r.pos.y;
      race.keepChildOnRoad(r, 1 / 60);
      expect(r.pos.y).toBe(height);
      const surface = race.track.surface(r.pos, r.route);
      expect(surface.distance).toBeLessThanOrEqual(surface.width / 2 + 0.01);
    },
  );
  it('constrains the kart after racer collisions and giant knockback', () => {
    const race = new Race(0, [child]);
    race.countdown = 0;
    const r = race.racers[0];
    const bot = race.racers[1];
    bot.giant = 5;
    bot.giantScale = 2;
    bot.pos.copy(r.pos).addScalar(0.1);
    race.update(1 / 60, [idleInput()]);
    expect(r.knockedTime).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) {
      race.update(1 / 60, [idleInput()]);
      const surface = race.track.surface(r.pos, r.route);
      expect(surface.distance).toBeLessThanOrEqual(surface.width / 2 + 0.01);
    }
  });
});
