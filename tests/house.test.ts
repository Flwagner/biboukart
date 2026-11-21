import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Track, trackPreviewPath } from '../src/track';
import { BiomeDetails } from '../src/biomes';
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

  it('stops the tabletop before the road dives off the plateau', () => {
    const track = new Track(5),
      art = new BiomeDetails(track),
      table = art.group.getObjectByName('breakfast-table')!;
    table.updateMatrixWorld(true);
    const slab = new THREE.Box3().setFromObject(table),
      probe = new THREE.Vector3();
    expect(slab.max.y).toBeLessThan(track.at(0).y);
    // Wherever the ramp drops below the tabletop, its footprint must be clear,
    // otherwise the slab swallows the descent and the kart drives through it.
    for (const [from, to] of [
      [0.056, 0.12],
      [0.88, 0.944],
    ])
      for (let t = from; t < to; t += 0.002) {
        const p = track.at(t);
        if (p.y >= slab.max.y) continue;
        probe.set(p.x, slab.max.y - 0.02, p.z);
        expect(slab.containsPoint(probe), `t=${t.toFixed(3)}`).toBe(false);
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
