import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { characters, karts } from '../src/config';
import { makeKart } from '../src/rendering';
import { kartPortrait } from '../src/portraits';
import { animateKart, type KartRig } from '../src/animation';
import { Race } from '../src/race';

describe('expanded garage', () => {
  it('offers eight unique characters and eight different kart styles', () => {
    expect(characters).toHaveLength(8);
    expect(karts).toHaveLength(8);
    expect(new Set(characters.map((c) => c.name)).size).toBe(8);
    expect(new Set(karts.map((k) => k.shape)).size).toBe(8);
    expect(new Set(karts.map(kartPortrait)).size).toBe(8);
  });

  it.each(characters.map((_, index) => index))(
    'builds character %i with every kart',
    (character) => {
      for (let kart = 0; kart < karts.length; kart++) {
        const model = makeKart(character, kart, 0);
        const rig = model.userData.rig as KartRig;
        expect(rig.wheels).toHaveLength(4);
        expect(rig.wheels.filter((w) => w.front)).toHaveLength(2);
        animateKart(rig, 0.1, 12, 1, false, 1);
        const bounds = new THREE.Box3().setFromObject(model);
        expect(Number.isFinite(bounds.min.x + bounds.max.y + bounds.max.z)).toBe(true);
        expect(rig.rearLightMaterial.color.getHexString()).toBe('ff5148');
      }
    },
  );

  it('uses distinct body geometries rather than only different paint', () => {
    const signatures = karts.map((_, index) => {
      const model = makeKart(0, index, 0);
      return model.children
        .filter((part) => part instanceof THREE.Mesh)
        .map((part) =>
          Array.from((part as THREE.Mesh).geometry.getAttribute('position').array).join(','),
        )
        .join('|');
    });
    expect(new Set(signatures).size).toBe(8);
  });

  it('includes the new characters and karts among bots', () => {
    const bots = [0, 1, 2].flatMap((track) =>
      new Race(track, [{ character: 0, kart: 0, device: 'keyboard' }]).racers.filter(
        (r) => !r.human,
      ),
    );
    for (const index of [4, 5, 6, 7]) {
      expect(bots.some((r) => r.config.character === index)).toBe(true);
      expect(bots.some((r) => r.config.kart === index)).toBe(true);
    }
  });
});
