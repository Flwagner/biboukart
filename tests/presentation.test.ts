import { describe, it, expect } from 'vitest';
import { Track, Race, idleInput } from '../src/race';
import { mapProjection, minimapMarkup } from '../src/minimap';
import { animateKart, react, type KartRig } from '../src/animation';
import { makeKart } from '../src/rendering';
describe('race presentation', () => {
  it.each([0, 1, 2])('maps circuit %i inside the HUD and numbers all racers', (index) => {
    const track = new Track(index),
      project = mapProjection(track);
    for (const p of track.samples) {
      const q = project(p.x, p.z);
      expect(q.x).toBeGreaterThanOrEqual(22);
      expect(q.x).toBeLessThanOrEqual(178.001);
      expect(q.y).toBeGreaterThanOrEqual(22);
      expect(q.y).toBeLessThanOrEqual(178.001);
    }
    expect(minimapMarkup(track, 2).match(/data-map-racer=/g)).toHaveLength(6);
  });
  it('rolls wheels forwards/backwards and steers front wheels and steering wheel', () => {
    const rig = makeKart(0, 0, 0).userData.rig as KartRig;
    animateKart(rig, 0.1, 5, 1, false);
    const angle = rig.wheelAngle;
    expect(angle).toBeGreaterThan(0);
    expect(rig.wheels.filter((w) => w.front).every((w) => w.pivot.rotation.y < 0)).toBe(true);
    expect(rig.steering.rotation.z).toBeGreaterThan(0);
    animateKart(rig, 0.1, -5, -1, false);
    expect(rig.wheelAngle).toBeCloseTo(0);
    react(rig, 'pickup');
    animateKart(rig, 0.2, 0, 0, false);
    expect(rig.driver.position.y).toBeGreaterThan(0);
    react(rig, 'hit');
    animateKart(rig, 0.2, 0, 0, false);
    expect(Math.abs(rig.driver.rotation.x)).toBeGreaterThan(0);
    react(rig, 'finish');
    animateKart(rig, 0.2, 0, 0, true);
    expect(rig.driver.rotation.z).toBe(0);
    expect(rig.driver.position.y).toBe(0);
  });
  it('announces the last lap once, without altering the finish rules', () => {
    const race = new Race(0, [{ character: 0, kart: 0, device: 'keyboard' }]);
    race.countdown = 0;
    const racer = race.racers[0];
    racer.progress = 2.02;
    racer.checkpoint = 15;
    racer.lap = 1;
    const events: string[] = [];
    race.onEvent = (kind) => events.push(kind);
    race.update(1 / 60, [idleInput()]);
    race.update(1 / 60, [idleInput()]);
    expect(events.filter((e) => e === 'lastlap')).toHaveLength(1);
    expect(racer.finished).toBe(false);
  });
});
