import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  asphaltTexture,
  contactShadowTexture,
  isSoftwareRenderer,
  pixelRatioForQuality,
  shadowProfile,
  skyTexture,
  toyMaterial,
} from '../src/art';
import { meadowDetails } from '../src/meadow';
import { Track } from '../src/track';
import { makeKart } from '../src/rendering';

describe('toy art direction', () => {
  it('separates satin paint, matte rubber and metal without changing colour', () => {
    const paint = toyMaterial('#f6bd42');
    const rubber = toyMaterial('#263247');
    const metal = toyMaterial('#a6b6c1');
    expect(paint.color.getHexString()).toBe('f6bd42');
    expect(rubber.roughness).toBeGreaterThan(paint.roughness);
    expect(metal.metalness).toBeGreaterThan(paint.metalness);
    expect(paint.flatShading).toBe(false);
  });
  it('budgets shadows by quality and viewport count', () => {
    expect(shadowProfile('high', 1)).toEqual({ enabled: true, mapSize: 2048 });
    expect(shadowProfile('auto', 2)).toEqual({ enabled: true, mapSize: 1024 });
    expect(shadowProfile('low', 1).enabled).toBe(false);
    expect(shadowProfile('high', 4).enabled).toBe(false);
    expect(shadowProfile('auto', 1, true).enabled).toBe(false);
    expect(shadowProfile('high', 1, true).enabled).toBe(true);
  });
  it('supersamples high quality while respecting low and adaptive resolution budgets', () => {
    expect(pixelRatioForQuality('high', 1, 1)).toBe(1.5);
    expect(pixelRatioForQuality('high', 3, 1)).toBe(1.75);
    expect(pixelRatioForQuality('low', 3, 0.8)).toBe(0.8);
    expect(pixelRatioForQuality('auto', 1, 0.8)).toBeCloseTo(0.92);
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan SwiftShader Device)')).toBe(true);
    expect(isSoftwareRenderer('Mesa llvmpipe')).toBe(true);
    expect(isSoftwareRenderer('NVIDIA GeForce RTX')).toBe(false);
  });
  it('generates repeatable grain, a gradient sky and a shared soft contact shadow', () => {
    const a = asphaltTexture(),
      b = asphaltTexture();
    expect(a.image.data).toEqual(b.image.data);
    expect(a.wrapS).toBe(THREE.RepeatWrapping);
    expect(a.generateMipmaps).toBe(true);
    const sky = skyTexture('#afdded');
    expect(sky.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(sky.image.data.slice(0, 3)).not.toEqual(sky.image.data.slice(-4, -1));
    const shadow = contactShadowTexture();
    expect(shadow).toBe(contactShadowTexture());
    expect(shadow.image.data[3]).toBe(0);
    expect(shadow.image.data[(16 * 32 + 16) * 4 + 3]).toBeGreaterThan(220);
    a.dispose();
    b.dispose();
    sky.dispose();
  });
  it('keeps clustered flowers and shrubs outside both driving corridors', () => {
    const track = new Track(0);
    const decor = meadowDetails(track);
    const point = new THREE.Vector3(),
      matrix = new THREE.Matrix4();
    let count = 0;
    decor.traverse((object) => {
      if (!(object instanceof THREE.InstancedMesh)) return;
      count += object.count;
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, matrix);
        point.setFromMatrixPosition(matrix);
        expect(track.overlapsRoad(point, 'main', 2.49)).toBe(false);
        expect(track.overlapsRoad(point, 'shortcut', 2.49)).toBe(false);
      }
    });
    expect(count).toBeGreaterThan(400);
    decor.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });
  });
  it('retains shadow casting after batching the animated reference kart', () => {
    const kart = makeKart(0, 0, 0);
    expect(kart.children.some((object) => object instanceof THREE.Mesh && object.castShadow)).toBe(
      true,
    );
    const rig = kart.userData.rig;
    expect(rig.driver.children.some((object: THREE.Object3D) => object.castShadow)).toBe(true);
    expect(rig.shadow.material.map).toBe(contactShadowTexture());
    expect(rig.wheels).toHaveLength(4);
  });
});
