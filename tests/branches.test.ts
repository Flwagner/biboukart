import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Track } from '../src/track';
import { Race, idleInput } from '../src/race';
import { minimapMarkup, mapProjection } from '../src/minimap';

describe('long circuits with genuine route choices', () => {
  it.each([0, 1, 2, 3, 4])(
    'route choices on circuit %i have comparable clean driving times',
    (index) => {
      const times: number[] = [];
      for (const id of [1, 0]) {
        const race = new Race(index, [{ character: 0, kart: 0, device: 'keyboard' }]);
        race.racers.splice(1);
        race.pickups = [];
        race.boosts = [];
        race.obstacles = [];
        race.countdown = 0;
        const r = race.racers[0];
        r.id = id; // Odd takes main, even takes alternative on the first lap.
        r.progress = 0.54;
        r.checkpoint = 4;
        race.respawn(r);
        r.speed = 24;
        for (let step = 0; step < 60 * 60 && r.progress < 0.8; step++) {
          const input = race.ai(r, false);
          race.update(1 / 60, [input, input]);
        }
        expect(r.progress).toBeGreaterThanOrEqual(0.8);
        times.push(race.elapsed);
      }
      console.log(`Circuit ${index} clean fork seconds [main, alternative]:`, times);
      expect(times[1] / times[0]).toBeGreaterThan(0.85);
      expect(times[1] / times[0]).toBeLessThan(1.3);
    },
  );
  it.each([0, 1, 2, 3, 4])(
    'circuit %i has both steering directions and a full-width alternative',
    (index) => {
      const track = new Track(index),
        branch = track.branch('alternative')!;
      expect(track.length).toBeGreaterThan(850);
      const turns = track.samples.map((_, i) => {
        const a = track.tangent(i / track.samples.length),
          b = track.tangent((i + 10) / track.samples.length);
        return a.x * b.z - a.z * b.x;
      });
      expect(Math.min(...turns)).toBeLessThan(-0.05);
      expect(Math.max(...turns)).toBeGreaterThan(0.05);
      expect(branch.width).toBeGreaterThan(track.width * 0.8);
      const ratio = branch.length / ((branch.end - branch.start) * track.length);
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThan(1.25);
      expect(track.nearest(track.routeAt(branch.id, 0.5)).distance).toBeGreaterThan(
        track.width + 8,
      );
      for (let i = 1; i < 128; i++) {
        const u = i / 128;
        const a = track.routeTangent(branch.id, u - 1 / 256),
          b = track.routeTangent(branch.id, u + 1 / 256);
        const distance = track
          .routeAt(branch.id, u - 1 / 256)
          .distanceTo(track.routeAt(branch.id, u + 1 / 256));
        const angle = Math.abs(Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z));
        expect(angle / distance, `alternative bend at ${u}`).toBeLessThan(
          1 / (branch.width / 2 + 2),
        );
      }
      const cross = (a: THREE.Vector3, b: THREE.Vector3, p: THREE.Vector3) =>
        (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
      let intersects = false;
      for (let i = 0; i < branch.samples.length - 1; i++)
        for (let j = i + 2; j < branch.samples.length - 1; j++) {
          const a = branch.samples[i],
            b = branch.samples[i + 1],
            c = branch.samples[j],
            d = branch.samples[j + 1];
          intersects ||= cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
        }
      expect(intersects, 'alternative must not intersect itself').toBe(false);
      for (const u of [0, 1]) {
        expect(
          track.routeAt(branch.id, u).distanceTo(track.at(u ? branch.end : branch.start)),
        ).toBeLessThan(0.01);
        expect(
          track
            .routeTangent(branch.id, u ? 0.9999 : 0.0001)
            .dot(track.tangent(u ? branch.end : branch.start)),
        ).toBeGreaterThan(0.95);
      }
      for (let i = 1; i < 20; i++) {
        const u = i / 20,
          p = track.routeAt(branch.id, u),
          surface = track.surface(p, branch.id);
        expect(surface.route).toBe(branch.id);
        expect(surface.t).toBeCloseTo(branch.start + u * (branch.end - branch.start), 2);
        expect(Math.abs(surface.height - p.y)).toBeLessThan(0.02);
      }
      const project = mapProjection(track);
      for (const p of [...track.samples, ...track.branches.flatMap((b) => b.samples)]) {
        const q = project(p.x, p.z);
        expect(q.x).toBeGreaterThanOrEqual(21.99);
        expect(q.y).toBeGreaterThanOrEqual(21.99);
        expect(q.x).toBeLessThanOrEqual(178.01);
        expect(q.y).toBeLessThanOrEqual(178.01);
      }
      expect(minimapMarkup(track, 0).match(/<polyline/g)).toHaveLength(2);
      console.log(
        `Circuit ${index}: ${Math.round(track.length)} m, alternative ${Math.round(branch.length)} m (${ratio.toFixed(2)}× main section)`,
      );
    },
  );

  it.each([0, 1, 2, 3, 4])(
    'alternative %i preserves progress on respawn and rejects teleportation',
    (index) => {
      const race = new Race(index, [{ character: 0, kart: 0, device: 'keyboard' }]);
      race.racers.splice(1);
      race.countdown = 0;
      const r = race.racers[0],
        branch = race.track.branch('alternative')!;
      r.route = branch.id;
      r.progress = 1 + branch.start + (branch.end - branch.start) * 0.5;
      r.checkpoint = Math.floor(r.progress * 8);
      const before = r.progress;
      race.respawn(r);
      expect(r.route).toBe(branch.id);
      expect(r.pos.distanceTo(race.track.routeAt(branch.id, 0.5))).toBeLessThan(0.01);
      expect(r.progress).toBe(before);
      r.pos.copy(race.track.routeAt(branch.id, 1));
      race.update(1 / 60, [idleInput()]);
      expect(r.progress).toBe(before);
    },
  );

  it.each([0, 1, 2, 3, 4])(
    'an isolated bot drives alternative %i without rescue and validates three laps',
    (index) => {
      const race = new Race(index, [
        { character: 0, kart: 0, device: 'keyboard', childMode: true },
      ]);
      race.racers.splice(1);
      race.pickups = [];
      race.countdown = 0;
      const r = race.racers[0],
        respawn = vi.spyOn(race, 'respawn');
      let visits = 0,
        previous = false;
      for (let step = 0; step < 300 * 60 && !race.finished; step++) {
        race.update(1 / 60, [race.ai(r, false)]);
        const inside = r.route === 'alternative' && race.track.surface(r.pos, r.route).u > 0.4;
        if (inside && !previous) visits++;
        previous = inside;
      }
      expect(r.finished).toBe(true);
      expect(r.checkpoint).toBe(24);
      expect(visits).toBeGreaterThanOrEqual(1);
      expect(respawn).not.toHaveBeenCalled();
    },
    30000,
  );

  it.each([0, 1, 2, 3, 4])(
    'all junctions on circuit %i remain open across the main road',
    (index) => {
      const track = new Track(index);
      for (const branch of track.branches)
        for (const junction of [branch.start, branch.end])
          for (let step = -20; step <= 20; step++)
            for (const offset of [-6, 0, 6]) {
              const t = junction + step * 0.001,
                p = track.at(t),
                tangent = track.tangent(t);
              p.addScaledVector(new THREE.Vector3(tangent.z, 0, -tangent.x).normalize(), offset);
              for (const hint of track.routes) {
                const surface = track.surface(p, hint);
                expect(surface.distance).toBeLessThanOrEqual(surface.width / 2 + 0.05);
              }
            }
    },
  );
});
