import { describe, it, expect } from 'vitest';
import { Track, Race, idleInput } from '../src/race';
import { mapProjection, minimapMarkup } from '../src/minimap';
import { animateKart, react, type KartRig } from '../src/animation';
import { makeKart } from '../src/rendering';
import * as THREE from 'three';
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
  it('rolls wheels forwards/backwards and steers front wheels with a centered black steering wheel in front', () => {
    const rig = makeKart(0, 0, 0).userData.rig as KartRig;
    animateKart(rig, 0.1, 5, 1, false);
    const angle = rig.wheelAngle;
    expect(angle).toBeGreaterThan(0);
    expect(rig.wheels.filter((w) => w.front).every((w) => w.pivot.rotation.y < 0)).toBe(true);
    expect(rig.steering.rotation.z).toBeGreaterThan(0);
    expect(rig.steering.position.x).toBe(0);
    expect(rig.steering.position.z).toBeGreaterThan(0.75);
    expect(rig.steering.position.y).toBeLessThan(1.4);
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
  it('has warm white front lights and red rear lights on the correct ends, without costly point lights', () => {
    const kart = makeKart(0, 0, 0);
    const rig = kart.userData.rig as KartRig;
    for (const front of [true, false]) {
      const light = (
        front
          ? kart.children.find(
              (child) =>
                child instanceof THREE.Mesh &&
                child.material instanceof THREE.MeshBasicMaterial &&
                child.material.color.getHexString() === 'fff1b8',
            )
          : rig.rearLights.children[0]
      ) as THREE.Mesh;
      expect(light).toBeDefined();
      light.geometry.computeBoundingBox();
      const bounds = light.geometry.boundingBox!;
      expect(bounds.min.x).toBeLessThan(-0.4);
      expect(bounds.max.x).toBeGreaterThan(0.4);
      if (front) expect(bounds.min.z).toBeGreaterThan(1.3);
      else expect(bounds.max.z).toBeLessThan(-1.3);
    }
    expect(kart.children.some((child) => child instanceof THREE.PointLight)).toBe(false);
  });
  it('brightens red brake lights per kart, including reduced motion, and dims them on release', () => {
    const first = makeKart(0, 0, 0).userData.rig as KartRig,
      second = makeKart(0, 0, 1).userData.rig as KartRig;
    expect(first.rearLightMaterial).not.toBe(second.rearLightMaterial);
    animateKart(first, 0.1, 12, 0, false, 1);
    animateKart(second, 0.1, 12, 0, false, 0);
    expect(first.rearLightMaterial.color.getHexString()).toBe('ff5148');
    expect(second.rearLightMaterial.color.getHexString()).toBe('842833');
    animateKart(first, 0.1, 12, 0, true, 1);
    expect(first.rearLightMaterial.color.getHexString()).toBe('ff5148');
    animateKart(first, 0.1, 12, 0, false, 0);
    expect(first.rearLightMaterial.color.getHexString()).toBe('842833');
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
