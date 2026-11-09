import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Race } from '../src/race';
import { animateKart, HIT_DURATION, type KartRig } from '../src/animation';
import { makeKart } from '../src/rendering';
import { RaceEffects } from '../src/effects';

describe('impact and turbo feedback regressions', () => {
  it.each(['missile', 'trap'] as const)(
    'starts a full turn from a %s impact without an event subscriber',
    (kind) => {
      const race = new Race(0, [{ character: 0, kart: 0, device: 'keyboard' }]);
      race.countdown = 0;
      const racer = race.racers[0];
      const heading = racer.heading;
      race.hazards.push({
        kind,
        owner: 5,
        pos: racer.pos.clone(),
        direction: new THREE.Vector3(),
        ttl: 2,
      });
      race.update(1 / 60, []);
      expect(racer.impacts).toBe(1);
      const rig = makeKart(0, 0, 0).userData.rig as KartRig;
      const step = (dt: number) => animateKart(rig, dt, 0, 0, false, 0, racer.impacts);
      expect(step(HIT_DURATION / 2).yaw).toBeCloseTo(Math.PI);
      expect(step(HIT_DURATION / 2 - 0.001).yaw).toBeGreaterThan(Math.PI * 1.99);
      expect(step(0.001).yaw).toBe(0);
      expect(step(0.1).yaw).toBe(0);
      expect(racer.heading).toBe(heading);
    },
  );

  it('counts only accepted impacts and leaves reduced motion deliberate', () => {
    const race = new Race(0, [{ character: 0, kart: 0, device: 'keyboard' }]);
    const racer = race.racers[0];
    racer.shield = 1;
    expect(race.hit(racer)).toBe(false);
    expect(racer.impacts).toBe(0);
    racer.immune = 0;
    expect(race.hit(racer)).toBe(true);
    expect(race.hit(racer)).toBe(false);
    expect(racer.impacts).toBe(1);
    const rig = makeKart(0, 0, 0).userData.rig as KartRig;
    expect(animateKart(rig, HIT_DURATION, 0, 0, true, 0, racer.impacts).yaw).toBe(0);
    expect(animateKart(rig, 0, 0, 0, false, 0, racer.impacts).yaw).toBe(0);
  });

  it('keeps turbo flames coloured under ACES rather than blending them into bright asphalt', () => {
    const race = new Race(0, [{ character: 0, kart: 0, device: 'keyboard' }]);
    const effects = new RaceEffects(6);
    const racer = race.racers[0];
    racer.boost = 2;
    effects.update(0.1, race.racers, false);
    const trail = effects.karts[0].trail;
    expect(trail.visible).toBe(true);
    expect(trail.children).toHaveLength(4);
    const envelope = (trail.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(envelope.toneMapped).toBe(false);
    expect(envelope.blending).toBe(THREE.NormalBlending);
    expect(envelope.color.getHexString()).toBe('ff8b26');
    expect(trail.children[1].renderOrder).toBeGreaterThan(trail.children[0].renderOrder);
    expect(trail.position.equals(racer.pos)).toBe(true);
    racer.boost = 0;
    effects.update(0.1, race.racers, false);
    expect(trail.visible).toBe(false);
    effects.dispose();
  });
});
