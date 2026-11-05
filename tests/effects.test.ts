import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { RaceEffects } from '../src/effects';
import { Race } from '../src/race';

function setup() {
  const race = new Race(0, [{ character: 0, kart: 0, device: 'keyboard' }]);
  return { race, effects: new RaceEffects(race.racers.length) };
}
describe('race visual effects', () => {
  it('preallocates a bounded particle pool and isolates each pickup', () => {
    const { race, effects } = setup();
    const origin = race.racers[2].pos.clone();
    effects.pickup(2, origin);
    origin.set(999, 0, 999);
    effects.update(0.1, race.racers, false);
    expect(effects.stars.count).toBe(72);
    expect(effects.stars.visible).toBe(true);
    expect(effects.karts.map((k) => k.ring.visible)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(effects.karts[2].origin.equals(race.racers[2].pos)).toBe(true);
    const matrix = new THREE.Matrix4(),
      scale = new THREE.Vector3();
    effects.stars.getMatrixAt(0, matrix);
    scale.setFromMatrixScale(matrix);
    expect(scale.length()).toBe(0);
    effects.stars.getMatrixAt(24, matrix);
    scale.setFromMatrixScale(matrix);
    expect(scale.length()).toBeGreaterThan(0);
    effects.dispose();
  });
  it('expires and reuses the same resources for subsequent pickups', () => {
    const { race, effects } = setup(),
      geometry = effects.stars.geometry,
      material = effects.stars.material;
    effects.pickup(0, race.racers[0].pos);
    effects.update(1.1, race.racers, false);
    expect(effects.stars.visible).toBe(false);
    expect(effects.isCollecting(0)).toBe(false);
    effects.pickup(0, race.racers[0].pos);
    effects.update(0.1, race.racers, false);
    expect(effects.isCollecting(0)).toBe(true);
    expect(effects.stars.geometry).toBe(geometry);
    expect(effects.stars.material).toBe(material);
    effects.dispose();
  });
  it('shows turbo trails only for boosted unfinished karts', () => {
    const { race, effects } = setup();
    race.racers[1].boost = 1;
    effects.update(0.1, race.racers, false);
    expect(effects.karts.map((k) => k.trail.visible)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    race.racers[1].finished = true;
    effects.update(0.1, race.racers, false);
    expect(effects.karts[1].trail.visible).toBe(false);
    effects.dispose();
  });
  it('replaces animated particles and turbo flames with a quiet ring in reduced mode', () => {
    const { race, effects } = setup();
    race.racers[0].boost = 2;
    effects.pickup(1, race.racers[1].pos);
    effects.update(0.1, race.racers, true);
    expect(effects.stars.visible).toBe(false);
    expect(effects.karts.every((k) => !k.trail.visible)).toBe(true);
    expect(effects.karts[0].ring.visible).toBe(true);
    expect(effects.karts[1].ring.scale.x).toBe(1);
    effects.dispose();
  });
  it('freezes effect lifetimes when paused and disposes shared geometry once', () => {
    const { race, effects } = setup();
    effects.pickup(0, race.racers[0].pos);
    effects.update(0.2, race.racers, false);
    effects.update(0, race.racers, false);
    expect(effects.karts[0].pickupAge).toBe(0.2);
    const dispose = vi.fn();
    effects.stars.geometry.addEventListener('dispose', dispose);
    effects.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(effects.root.children).toHaveLength(0);
  });
});
