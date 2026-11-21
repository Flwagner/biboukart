import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Track, trackPreviewPath } from '../src/track';
import { BiomeDetails } from '../src/biomes';
import { tableBounds } from '../src/house';
import { obstacleModel } from '../src/scenery';

describe('the miniature house circuit', () => {
  it('climbs onto the breakfast table and returns to the parquet', () => {
    const track = new Track(5);
    expect(track.length).toBeGreaterThan(850);
    expect(track.at(0).y).toBeCloseTo(11, 5);
    expect(track.at(0.3).y).toBeLessThan(4);
    expect(track.at(0.5).y).toBeLessThan(4);
    expect(track.at(0.8).y).toBeLessThan(4);
    expect(track.at(1).distanceTo(track.at(0))).toBeLessThan(0.0001);
    // The climb is continuous: no step between adjacent samples.
    for (let i = 0; i < 1000; i++) {
      const a = track.at(i / 1000),
        b = track.at((i + 1) / 1000);
      expect(Math.abs(a.y - b.y)).toBeLessThan(0.3);
    }
  });

  it('keeps the curved tabletop under the road for its whole length', () => {
    const track = new Track(5),
      art = new BiomeDetails(track),
      table = art.group.getObjectByName('breakfast-table')!;
    table.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(table);
    expect(box.max.y).toBeLessThan(track.at(0).y);
    // The road's lowest edge stays above the tabletop along the whole table.
    for (let t = tableBounds.from; t <= tableBounds.to; t += 0.002) {
      const p = track.at(t),
        lowest = p.y + 0.02 - (Math.abs(track.bank(t)) * track.width) / 2;
      expect(lowest, `t=${t.toFixed(3)}`).toBeGreaterThan(box.max.y);
    }
  });

  it('rolls a jam jar and keeps its own preview', () => {
    const track = new Track(5);
    expect(track.createObstacle().kind).toBe('jam');
    const paths = [0, 1, 2, 3, 4, 5].map((index) => trackPreviewPath(index));
    expect(new Set(paths).size).toBe(6);
  });

  it('builds furniture clear of every road with finite geometry', () => {
    const track = new Track(5),
      art = new BiomeDetails(track);
    expect(art.footprints.length).toBeGreaterThan(15);
    for (const footprint of art.footprints) {
      const p = new THREE.Vector3(footprint.x, 0, footprint.z);
      expect(track.overlapsAnyRoad(p, footprint.radius + 2.9), footprint.kind).toBe(false);
    }
    const materials = new Set<string>();
    for (const root of [art.group, art.animated])
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const positions = object.geometry.getAttribute('position');
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        materials.add((object.material as THREE.Material).uuid);
      });
    expect(materials.size).toBeLessThan(40);
    expect(art.group.getObjectByName('breakfast-table')).toBeTruthy();
    for (const room of ['hallway', 'wc', 'bedroom', 'living-room'])
      expect(art.group.getObjectByName(room), room).toBeTruthy();
    art.update(0.25);
    const transforms = art.animated.children.map((mesh) => mesh.position.toArray());
    art.update(0);
    expect(art.animated.children.map((mesh) => mesh.position.toArray())).toEqual(transforms);
  });

  it('gives the rolling jam jar a bespoke model', () => {
    const jar = obstacleModel({
      kind: 'jam',
      t: 0,
      radius: 1.9,
      pos: new THREE.Vector3(),
      offset: 0,
    });
    expect(jar.children.length).toBeGreaterThan(3);
    jar.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      expect(
        Array.from(object.geometry.getAttribute('position').array).every(Number.isFinite),
      ).toBe(true);
      (object.geometry as THREE.BufferGeometry).dispose();
      (object.material as THREE.Material).dispose();
    });
  });
});
