import * as THREE from 'three';
import type { Track } from './track';
import { trackDefinitions } from './config';
export const terrainLayout = { width: 300, depth: 280, segments: 48 };
export function createTerrainGeometry(track: Track) {
  const { width, depth, segments } = terrainLayout,
    geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position'),
    point = new THREE.Vector3();
  const colors: number[] = [];
  const base = new THREE.Color(trackDefinitions[track.index].ground);
  for (let i = 0; i < positions.count; i++) {
    point.set(positions.getX(i), 0, positions.getZ(i));
    positions.setY(i, track.terrainHeight(point));
    const variation = 0.96 + Math.sin(point.x * 0.12 + Math.cos(point.z * 0.09)) * 0.045;
    const color = base.clone().multiplyScalar(variation);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
