import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { characters } from '../src/config';
import { makeKart } from '../src/rendering';
describe('Couscous and Raclette', () => {
  it('preserves saved character indices with the new names and portraits', () => {
    expect(characters[1]).toMatchObject({
      name: 'Couscous',
      animal: 'Lapin',
      color: '#171a20',
    });
    expect(characters[3]).toMatchObject({
      name: 'Raclette',
      animal: 'Chat',
      color: '#f7f7f1',
    });
    expect(characters[1].icon).toContain('<svg');
    expect(characters[3].icon).toContain('Raclette, chat blanc');
    expect(characters).toHaveLength(4);
  });
  it.each([1, 3])('builds a driver in the selected coat colour for index %i', (index) => {
    const driver = makeKart(index, 0, 0).userData.rig.driver as THREE.Group;
    const colors: string[] = [];
    driver.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        !Array.isArray(object.material) &&
        'color' in object.material
      )
        colors.push((object.material as THREE.MeshLambertMaterial).color.getHexString());
    });
    expect(colors).toContain(characters[index].color.slice(1));
    const bounds = new THREE.Box3().setFromObject(driver);
    if (index === 1) expect(bounds.max.y).toBeGreaterThan(2.9);
    else expect(bounds.max.y).toBeLessThan(2.7);
  });
});
