import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { Race, idleInput, type Racer } from '../src/race';
import { itemNames, itemIcons } from '../src/config';
import { createHazardModel, updateHazardModel } from '../src/itemModels';
import { RaceEffects } from '../src/effects';

function setup() {
  const race = new Race(
    0,
    Array.from({ length: 6 }, () => ({ character: 0, kart: 0, device: 'keyboard' })),
  );
  race.countdown = 0;
  race.obstacles = [];
  race.pickups = [];
  race.boosts = [];
  race.racers.forEach((r, i) => place(race, r, 0.15 + i * 0.12));
  return race;
}
function place(race: Race, r: Racer, t: number, offset = 0) {
  r.pos.copy(race.track.at(t));
  const tangent = race.track.tangent(t);
  r.pos.addScaledVector(new THREE.Vector3(tangent.z, 0, -tangent.x).normalize(), offset);
  r.previous.copy(r.pos);
  r.groundHeight = r.pos.y;
  r.progress = t;
  r.lastT = t;
  r.checkpoint = Math.floor(t * 8);
  r.heading = Math.atan2(tangent.x, tangent.z);
}
function tick(race: Race, seconds: number, throttle = 0) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++)
    race.update(
      1 / 60,
      race.racers.map(() => ({ ...idleInput(), throttle })),
    );
}

describe('gift powers', () => {
  it('distributes all six labelled objects deterministically to every rank', () => {
    for (let rank = 0; rank < 6; rank++) {
      const race = setup();
      const items = new Set(Array.from({ length: 500 }, () => race.chooseItem(rank)));
      expect([...items].sort()).toEqual(Object.keys(itemNames).sort());
      expect(Object.keys(itemIcons).sort()).toEqual([...items].sort());
    }
  });
  it('grows smoothly for seven seconds and returns to its normal size', () => {
    const race = setup(),
      r = race.racers[0];
    r.item = 'giant';
    race.use(r);
    expect(r.item).toBeNull();
    expect(r.giant).toBe(7);
    tick(race, 0.1);
    expect(r.giantScale).toBeGreaterThan(1);
    expect(r.giantScale).toBeLessThan(2);
    tick(race, 0.3);
    expect(r.giantScale).toBe(2);
    tick(race, 7);
    expect(r.giant).toBe(0);
    expect(r.giantScale).toBe(1);
  });
  it('ignores road obstacles without consuming its shield but remains vulnerable to weapons', () => {
    const race = setup(),
      r = race.racers[0];
    const obstacle = race.track.createObstacle();
    obstacle.pos.copy(r.pos);
    race.obstacles = [obstacle];
    vi.spyOn(race.track, 'moveObstacle').mockImplementation(() => {});
    r.giant = 7;
    r.shield = 5;
    tick(race, 0.1);
    expect(r.shield).toBeGreaterThan(4);
    expect(r.slow).toBe(0);
    r.shield = 0;
    expect(race.hit(r)).toBe(true);
    expect(r.slow).toBeGreaterThan(0);
  });
  it('throws a neighbour off-road then recovers it without advancing its progress', () => {
    const race = setup(),
      [giant, victim] = race.racers;
    place(race, giant, 0.3, -1);
    place(race, victim, 0.3, 1.5);
    giant.giant = 7;
    giant.giantScale = 2;
    const progress = victim.progress,
      checkpoint = victim.checkpoint;
    tick(race, 1 / 60);
    expect(victim.knockedTime).toBeGreaterThan(0);
    expect(victim.verticalSpeed).toBeGreaterThan(0);
    tick(race, 0.7);
    expect(race.track.surface(victim.pos).distance).toBeGreaterThan(race.track.width / 2);
    expect(victim.progress).toBeCloseTo(progress, 5);
    giant.giant = 0;
    tick(race, 0.8);
    expect(victim.knockedTime).toBe(0);
    expect(victim.knockback.length()).toBe(0);
    expect(victim.progress).toBeCloseTo(progress, 5);
    expect(victim.checkpoint).toBe(checkpoint);
    expect(victim.airborne).toBe(false);
  });
  it('does not throw other giants and lets shields absorb the impact', () => {
    const race = setup(),
      [a, b] = race.racers;
    place(race, a, 0.3, -1);
    place(race, b, 0.3, 1);
    a.giant = b.giant = 7;
    tick(race, 1 / 60);
    expect(a.knockedTime + b.knockedTime).toBe(0);
    b.giant = 0;
    b.shield = 5;
    race.throwKart(a, b);
    expect(b.shield).toBe(0);
    expect(b.knockedTime).toBe(0);
    race.throwKart(a, b);
    expect(b.knockedTime).toBe(0);
  });
  it('jumps at rest and stuns nearby rivals only on landing, once', () => {
    const race = setup(),
      [r, near, far] = race.racers;
    place(race, r, 0.3, -2);
    place(race, near, 0.3, 2);
    const event = vi.fn();
    race.onEvent = event;
    r.item = 'shockwave';
    race.use(r);
    expect(r.airborne).toBe(true);
    expect(r.shockPending).toBe(true);
    expect(near.stun).toBe(0);
    tick(race, 0.4);
    expect(near.stun).toBe(0);
    tick(race, 0.5);
    expect(r.shockPending).toBe(false);
    expect(near.stun).toBeGreaterThan(1);
    expect(far.stun).toBe(0);
    expect(r.stun).toBe(0);
    tick(race, 0.2, 1);
    expect(near.speed).toBe(0);
    tick(race, 2, 1);
    expect(near.stun).toBe(0);
    expect(near.speed).toBeGreaterThan(0);
    expect(event.mock.calls.filter(([kind]) => kind === 'shockwaveImpact')).toHaveLength(1);
  });
  it('arms an existing jump without relaunching it, respects shields and chain immunity', () => {
    const race = setup(),
      [r, near] = race.racers;
    place(race, r, 0.3, -2);
    place(race, near, 0.3, 2);
    r.airborne = true;
    r.pos.y += 2;
    r.verticalSpeed = -1;
    r.item = 'shockwave';
    race.use(r);
    expect(r.verticalSpeed).toBe(-1);
    near.shield = 5;
    tick(race, 0.5);
    expect(near.shield).toBe(0);
    expect(near.stun).toBe(0);
    race.shockwave(r);
    expect(near.stun).toBe(0);
  });
  it('places a flaque on the road even when dropped during a jump', () => {
    const race = setup(),
      r = race.racers[0];
    r.pos.y += 4;
    r.item = 'trap';
    race.use(r);
    const hazard = race.hazards[0];
    expect(hazard.pos.y).toBeCloseTo(race.track.surface(hazard.pos).height);
  });
});

describe('item presentation', () => {
  it('reuses a model slot across missiles and puddles without leftover flames', () => {
    const root = createHazardModel();
    const hazard = {
      kind: 'missile' as const,
      owner: 0,
      pos: new THREE.Vector3(1, 2, 3),
      direction: new THREE.Vector3(1, 0, 0),
      ttl: 4,
    };
    updateHazardModel(root, hazard, 1, false);
    expect(root.children[0].visible).toBe(true);
    expect(root.children[1].visible).toBe(false);
    expect(root.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(root.position.equals(hazard.pos)).toBe(true);
    updateHazardModel(root, { ...hazard, kind: 'trap' }, 1, true);
    expect(root.children[0].visible).toBe(false);
    expect(root.children[1].visible).toBe(true);
    expect(root.userData.exhaust.visible).toBe(false);
    const positions = (root.children[1].children[0] as THREE.Mesh).geometry.getAttribute(
      'position',
    );
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
  });
  it('shows shock rings, stun stars and impacts with reduced-animation alternatives', () => {
    const race = setup(),
      effects = new RaceEffects(6),
      r = race.racers[0];
    race.shockwave(r);
    r.stun = 1;
    effects.impact(0, r.pos, true);
    effects.update(0.1, race.racers, false);
    expect(effects.karts[0].shock.visible).toBe(true);
    expect(effects.karts[0].dust.visible).toBe(true);
    expect(effects.karts[0].stunned.visible).toBe(true);
    expect(effects.karts[0].impact.visible).toBe(true);
    effects.update(0.1, race.racers, true);
    expect(effects.karts[0].shock.scale.x).toBe(8);
    expect(effects.karts[0].dust.visible).toBe(false);
    expect(effects.karts[0].impact.visible).toBe(false);
    expect(effects.karts[0].stunned.visible).toBe(true);
    effects.dispose();
  });
});
