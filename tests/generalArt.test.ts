import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { alpinePeakGeometry, BiomeDetails, circuitAtmospheres } from '../src/biomes';
import { sculptDriver, sculptKart } from '../src/rosterDetails';
import { palmFrondGeometry } from '../src/scenery';
import { characters, karts } from '../src/config';
import { Track } from '../src/track';

const factory = (geometry: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, y, z);
  return mesh;
};
function release(...roots: THREE.Object3D[]) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  roots.forEach((root) =>
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(material);
      }
    }),
  );
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => {
    if (material instanceof THREE.MeshLambertMaterial) material.map?.dispose();
    material.dispose();
  });
}

describe('art direction throughout the game', () => {
  it('preserves the approved Prairie lighting and gives every other biome its own atmosphere', () => {
    expect(circuitAtmospheres).toHaveLength(5);
    expect(circuitAtmospheres[0]).toEqual({
      sun: '#fff0d2',
      skyLight: '#d5eaff',
      bounce: '#617b52',
      exposure: 1.15,
    });
    expect(new Set(circuitAtmospheres.map((profile) => profile.sun)).size).toBe(5);
  });
  it.each([1, 2, 3, 4])('keeps the whole new decor outside both routes on circuit %i', (index) => {
    const track = new Track(index);
    const before = track.samples.map((point) => point.toArray());
    const art = new BiomeDetails(track);
    expect(art.footprints.length).toBeGreaterThan(15);
    for (const footprint of art.footprints) {
      const p = new THREE.Vector3(footprint.x, 0, footprint.z);
      expect(track.overlapsAnyRoad(p, footprint.radius + 2.9), footprint.kind).toBe(false);
    }
    expect(track.samples.map((point) => point.toArray())).toEqual(before);
    const materialIds = new Set<string>();
    for (const root of [art.group, art.animated])
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const positions = object.geometry.getAttribute('position');
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        materialIds.add((object.material as THREE.Material).uuid);
      });
    expect(materialIds.size).toBeLessThan(40);
    release(art.group, art.animated);
  });
  it('animates local water and freezes ambience when given a zero simulation step', () => {
    for (const index of [1, 2, 3]) {
      const art = new BiomeDetails(new Track(index));
      art.update(0.25);
      const transforms = art.animated.children.map((mesh) => mesh.position.toArray());
      art.update(0);
      expect(art.animated.children.map((mesh) => mesh.position.toArray())).toEqual(transforms);
      if (index === 2) {
        const ocean = art.animated.getObjectByName('animated-ocean') as THREE.Mesh<
          THREE.PlaneGeometry,
          THREE.MeshLambertMaterial
        >;
        const map = ocean.material.map!;
        const x = map.offset.x;
        art.update(0.25);
        expect(map.offset.x).toBeGreaterThan(x);
        expect(map.wrapS).toBe(THREE.RepeatWrapping);
      }
      release(art.group, art.animated);
    }
  });
  it('uses curved and tapered palm fronds with valid indexed normals', () => {
    const geometry = palmFrondGeometry();
    const positions = geometry.getAttribute('position');
    expect(positions.getZ(positions.count - 1)).toBeCloseTo(4.8);
    expect(positions.getY(8)).toBeGreaterThan(positions.getY(0));
    expect(Math.abs(positions.getX(8))).toBeGreaterThan(Math.abs(positions.getX(0)));
    expect(geometry.getAttribute('normal').count).toBe(positions.count);
    expect(geometry.index!.count).toBe(48);
    geometry.dispose();
  });
  it('sculpts irregular alpine ridges and a snow cap from the same mountain silhouette', () => {
    const rock = alpinePeakGeometry(30, 60, 2);
    const snow = alpinePeakGeometry(30, 60, 2, true);
    const other = alpinePeakGeometry(30, 60, 3);
    expect(Array.from(rock.getAttribute('position').array).every(Number.isFinite)).toBe(true);
    expect(snow.index!.count).toBeLessThan(rock.index!.count);
    expect(snow.index!.count).toBeGreaterThan(0);
    expect(rock.getAttribute('position').array).not.toEqual(other.getAttribute('position').array);
    rock.dispose();
    snow.dispose();
    other.dispose();
  });
  it.each([1, 2, 3, 4, 5, 6, 7])('adds a bespoke sculpt and costume to pilot %i', (index) => {
    const root = new THREE.Group();
    sculptDriver(root, index, characters[index].color, factory);
    expect(root.children.length).toBeGreaterThanOrEqual(9);
    expect(
      new Set(
        root.children.map((object) =>
          ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHexString(),
        ),
      ).size,
    ).toBeGreaterThanOrEqual(3);
    release(root);
  });
  it('gives every non-reference kart a different detail geometry, not just a colour', () => {
    const signatures: string[] = [];
    for (let index = 1; index < 8; index++) {
      const root = new THREE.Group();
      sculptKart(root, karts[index].shape, karts[index].color, factory);
      expect(root.children.length).toBeGreaterThanOrEqual(4);
      root.updateMatrixWorld(true);
      signatures.push(
        root.children
          .map((object) => {
            const mesh = object as THREE.Mesh;
            return `${mesh.geometry.getAttribute('position').count}:${mesh.matrixWorld.elements.join(',')}`;
          })
          .join('|'),
      );
      release(root);
    }
    expect(new Set(signatures).size).toBe(7);
  });
});
