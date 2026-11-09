import * as THREE from 'three';
import type { Track } from './track';

/** Readable roadside choices, placed before the split, never inside its paved union. */
export function createRouteSigns(track: Track) {
  const group = new THREE.Group();
  group.name = 'route-signs';
  const postGeometry = new THREE.BoxGeometry(0.18, 4, 0.18);
  const postMaterial = new THREE.MeshLambertMaterial({ color: '#425369' });
  for (const branch of track.branches) {
    const t = branch.start - 18 / track.length;
    const tangent = track.tangent(t);
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const split = track
      .routeAt(branch.id, 0.2)
      .sub(track.at(branch.start + (branch.end - branch.start) * 0.2));
    const side = Math.sign(split.dot(normal)) || 1;
    const position = track.at(t).addScaledVector(normal, side * (track.width / 2 + 3));
    while (track.overlapsAnyRoad(position, 2.5)) position.addScaledVector(normal, side * 2);
    position.y = track.terrainHeight(position);
    const sign = new THREE.Group();
    sign.name = `sign-${branch.id}`;
    sign.position.copy(position);
    sign.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI;
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = 2;
    sign.add(post);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.fillStyle = branch.id === 'shortcut' ? '#604a85' : '#205b65';
    context.fillRect(0, 0, 512, 256);
    context.strokeStyle = '#fff6df';
    context.lineWidth = 10;
    context.strokeRect(8, 8, 496, 240);
    context.fillStyle = '#fff6df';
    context.font = 'bold 36px sans-serif';
    context.fillText('↑  Circuit', 28, 80);
    // The engine's forward axis is +Z: its (tangent.z, 0, -tangent.x) normal is left.
    context.fillText(`${side > 0 ? '←' : '→'}  ${branch.label}`, 28, 155);
    context.font = '25px sans-serif';
    context.fillText(
      branch.id === 'shortcut' ? 'Étroit · technique' : 'Route alternative · cadeaux',
      28,
      213,
    );
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 2.7),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
    plate.position.y = 4;
    sign.add(plate);
    group.add(sign);
  }
  return group;
}
