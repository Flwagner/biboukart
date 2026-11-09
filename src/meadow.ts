import * as THREE from 'three';
import type { Track } from './track';

/** Hand-composed clusters along the course, deterministically varied within each patch. */
export function meadowDetails(track: Track) {
  const group = new THREE.Group();
  group.name = 'meadow-details';
  let seed = 9281;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const flowers: THREE.Matrix4[] = [];
  const shrubs: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  for (let patch = 0; patch < 40; patch++) {
    const t = (patch + 0.35) / 40;
    const center = track.at(t);
    const tangent = track.tangent(t);
    center.addScaledVector(
      new THREE.Vector3(tangent.z, 0, -tangent.x).normalize(),
      (patch % 2 ? 1 : -1) * (track.width / 2 + 5 + random() * 8),
    );
    for (let i = 0; i < 20; i++) {
      const p = center
        .clone()
        .add(new THREE.Vector3((random() - 0.5) * 10, 0, (random() - 0.5) * 10));
      if (track.overlapsRoad(p, 'main', 2.5) || track.overlapsRoad(p, 'shortcut', 2.5)) continue;
      p.y = track.terrainHeight(p);
      const shrub = i < 2;
      const s = shrub ? 0.7 + random() * 0.8 : 0.13 + random() * 0.15;
      dummy.position.copy(p).y += shrub ? s * 0.5 : 0.28;
      dummy.rotation.set(0, random() * Math.PI * 2, shrub ? 0 : 0.2);
      dummy.scale.set(s, shrub ? s * 0.65 : s * 0.45, s);
      dummy.updateMatrix();
      (shrub ? shrubs : flowers).push(dummy.matrix.clone());
    }
  }
  const instances = (
    matrices: THREE.Matrix4[],
    geometry: THREE.BufferGeometry,
    colors: string[],
    shadows: boolean,
  ) => {
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshLambertMaterial({ color: '#ffffff' }),
      matrices.length,
    );
    matrices.forEach((matrix, i) => {
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    });
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  instances(
    flowers,
    new THREE.SphereGeometry(1, 6, 4),
    ['#fff0c7', '#efb4ab', '#d4c3ec', '#f5d17b'],
    false,
  );
  instances(shrubs, new THREE.SphereGeometry(1, 10, 8), ['#698f4e', '#7fa55e', '#94b66a'], true);

  // Puffy silhouettes break up the empty sky without a full-screen postprocessing pass.
  const cloudGeometry = new THREE.SphereGeometry(1, 12, 8);
  const cloudMaterial = new THREE.MeshLambertMaterial({ color: '#fff8ec' });
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    for (let lobe = 0; lobe < 3; lobe++) {
      const cloud = new THREE.Mesh(cloudGeometry.clone(), cloudMaterial);
      cloud.position.set(
        Math.sin(angle) * 205 + lobe * 8,
        52 + (i % 3) * 9 + (lobe === 1 ? 3 : 0),
        Math.cos(angle) * 205,
      );
      cloud.scale.set(12, 4 + (lobe === 1 ? 2 : 0), 7);
      group.add(cloud);
    }
  }
  cloudGeometry.dispose();
  return group;
}
