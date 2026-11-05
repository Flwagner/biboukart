import * as THREE from 'three';
import type { Track } from './track';
export const terrainLayout = { width: 300, depth: 280, segments: 48 };
export function createTerrainGeometry(track: Track) {
  const { width, depth, segments } = terrainLayout,
    geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position'),
    point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.set(positions.getX(i), 0, positions.getZ(i));
    positions.setY(i, track.terrainHeight(point));
  }
  geometry.computeVertexNormals();
  return geometry;
}
