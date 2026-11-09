import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Race, idleInput } from '../src/race';
import { karts } from '../src/config';
import type { Route } from '../src/track';

const routes: Route[] = ['main', 'shortcut', 'alternative'];
const cases = [0, 1, 2, 3, 4].flatMap((track) => routes.map((route) => ({ track, route })));
const accelerate = { ...idleInput(), throttle: 1 };

function setup(track = 0, route: Route = 'main', side = 1) {
  const race = new Race(track, [{ character: 0, kart: 0, device: 'keyboard' }]);
  race.racers.splice(1);
  race.countdown = 0;
  race.pickups = [];
  race.boosts = [];
  race.obstacles = [];
  // Stay away from the shortcut's automatic turbo at u=0.5.
  const u = route === 'main' ? 0.02 : route === 'shortcut' ? 0.4 : 0.5;
  const center = race.track.routeAt(route, u);
  const tangent = race.track.routeTangent(route, u);
  const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize().multiplyScalar(side);
  const outside = center.clone().addScaledVector(normal, race.track.routeWidth(route) / 2 + 5);
  outside.y = race.track.surface(outside, route).height;
  const r = race.racers[0];
  r.route = route;
  r.pos.copy(outside);
  r.progress = r.lastT = race.track.surface(outside, route).t;
  r.heading = Math.atan2(normal.x, normal.z);
  return { race, r, outside, center };
}

describe('off-road speed is halved, not repeatedly reduced at the boundary', () => {
  it.each(cases)(
    'track $track / $route: maintains half speed against either edge and can accelerate from rest',
    ({ track, route }) => {
      for (const side of [-1, 1]) {
        const { race, r, outside } = setup(track, route, side);
        const halfSpeed = karts[r.config.kart].speed / 2;
        expect(race.track.surface(outside, route).distance).toBeGreaterThan(
          race.track.routeWidth(route) / 2,
        );
        r.speed = halfSpeed * 2;
        for (let frame = 0; frame < 60; frame++) {
          // Hold an outward course at the boundary: previously *= 0.93 compounded here.
          r.pos.copy(outside);
          race.update(1 / 60, [accelerate]);
          expect(r.speed).toBeCloseTo(halfSpeed, 5);
        }
        r.speed = 0;
        for (let frame = 0; frame < 300; frame++) {
          r.pos.copy(outside);
          race.update(1 / 60, [accelerate]);
        }
        expect(r.speed).toBeCloseTo(halfSpeed, 5);
      }
    },
  );

  it.each([
    { boost: 2, slow: 0, factor: 1.5 },
    { boost: 0, slow: 1, factor: 0.5 },
    { boost: 2, slow: 1, factor: 0.75 },
  ])('preserves item modifiers: boost=$boost slow=$slow', ({ boost, slow, factor }) => {
    const { race, r } = setup();
    r.speed = 100;
    r.boost = boost;
    r.slow = slow;
    race.update(1 / 60, [accelerate]);
    expect(r.speed).toBeCloseTo((karts[r.config.kart].speed * factor) / 2, 5);
  });

  it('restores normal acceleration and full top speed on returning to the road', () => {
    const { race, r, center } = setup();
    r.speed = karts[r.config.kart].speed;
    race.update(1 / 60, [accelerate]);
    expect(r.speed).toBe(karts[r.config.kart].speed / 2);
    const tangent = race.track.tangent(0.02);
    r.heading = Math.atan2(tangent.x, tangent.z);
    for (let frame = 0; frame < 120; frame++) {
      r.pos.copy(center);
      race.update(1 / 60, [accelerate]);
    }
    expect(r.speed).toBe(karts[r.config.kart].speed);
  });

  it('also halves the reverse speed limit off-road', () => {
    const { race, r, center } = setup();
    r.speed = -7;
    race.update(1 / 60, [{ ...idleInput(), brake: 1 }]);
    expect(r.speed).toBe(-3.5);
    r.pos.copy(center);
    r.speed = -7;
    race.update(1 / 60, [{ ...idleInput(), brake: 1 }]);
    expect(r.speed).toBe(-7);
  });
});
