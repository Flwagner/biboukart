import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { Track } from '../src/track';
import { Race, wrap } from '../src/race';
import { karts } from '../src/config';
describe('shortcut junctions have no invisible wall on the main road', () => {
  it.each([0, 1, 2, 3, 4])(
    'the entire width of main road %i remains driveable with either route hint',
    (index) => {
      const track = new Track(index);
      for (const junction of [track.shortcut.start, track.shortcut.end])
        for (let step = -30; step <= 30; step++)
          for (const offset of [-6, -3, 0, 3, 6]) {
            const t = junction + step * 0.001,
              p = track.at(t),
              tangent = track.tangent(t);
            p.addScaledVector(new THREE.Vector3(tangent.z, 0, -tangent.x).normalize(), offset);
            const main = track.surface(p, 'main');
            expect(main.route).toBe('main');
            expect(main.distance).toBeLessThanOrEqual(main.width / 2 + 0.05);
            const priorBranch = track.surface(p, 'shortcut');
            expect(priorBranch.distance).toBeLessThanOrEqual(priorBranch.width / 2 + 0.05);
          }
    },
  );
  it.each([0, 1, 2, 3, 4])(
    'a driver can continue along main road %i past entry and exit, without sticking or respawning',
    (index) => {
      for (const end of [false, true])
        for (const offset of [-3, 0, 3]) {
          const race = new Race(index, [{ character: 0, kart: 0, device: 'keyboard' }]);
          race.racers.splice(1);
          race.pickups = [];
          race.countdown = 0;
          const r = race.racers[0],
            junction = end ? race.track.shortcut.end : race.track.shortcut.start,
            start = junction - 0.035;
          r.pos.copy(race.track.at(start));
          const tangent = race.track.tangent(start);
          r.pos.addScaledVector(new THREE.Vector3(tangent.z, 0, -tangent.x).normalize(), offset);
          r.previous.copy(r.pos);
          r.progress = start;
          r.lastT = start;
          r.checkpoint = Math.floor(start * 8);
          r.heading = Math.atan2(tangent.x, tangent.z);
          r.speed = 18;
          const respawn = vi.spyOn(race, 'respawn');
          for (let step = 0; step < 600 && r.progress < junction + 0.035; step++) {
            const nearest = race.track.nearest(r.pos),
              look = 8 + Math.abs(r.speed) * 0.4,
              target = race.track.at(nearest.t + look / race.track.length),
              forward = race.track.tangent(nearest.t + look / race.track.length);
            target.addScaledVector(new THREE.Vector3(forward.z, 0, -forward.x).normalize(), offset);
            const angle = wrap(Math.atan2(target.x - r.pos.x, target.z - r.pos.z) - r.heading);
            const steer = -THREE.MathUtils.clamp(
              (2 * Math.abs(r.speed) * Math.sin(angle)) / (look * karts[r.config.kart].handling),
              -1,
              1,
            );
            race.update(1 / 60, [{ throttle: r.speed < 25 ? 1 : 0, brake: 0, steer, use: false }]);
            expect(r.route).toBe('main');
          }
          expect(r.progress).toBeGreaterThanOrEqual(junction + 0.035);
          expect(r.speed).toBeGreaterThan(8);
          expect(respawn).not.toHaveBeenCalled();
        }
    },
  );
});
