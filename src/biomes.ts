import * as THREE from 'three';
import type { Track } from './track';

export const circuitAtmospheres = [
  { sun: '#fff0d2', skyLight: '#d5eaff', bounce: '#617b52', exposure: 1.15 },
  { sun: '#ffddb1', skyLight: '#d6e1f4', bounce: '#a5795b', exposure: 1.1 },
  { sun: '#fff2ce', skyLight: '#c9edff', bounce: '#6bafa4', exposure: 1.12 },
  { sun: '#ffeacb', skyLight: '#d6edff', bounce: '#8bacc4', exposure: 1.08 },
  { sun: '#ffdcba', skyLight: '#cbd7f0', bounce: '#7d8499', exposure: 1.12 },
] as const;

export interface DecorFootprint {
  x: number;
  z: number;
  radius: number;
  kind: string;
}

/** Shared rock/snow silhouette, with an irregular ridge and a toothed snow line. */
export function alpinePeakGeometry(radius: number, height: number, seed: number, snow = false) {
  const geometry = new THREE.ConeGeometry(radius, height, 12, 6);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const u = (positions.getY(i) + height / 2) / height;
    const angle = Math.atan2(positions.getZ(i), positions.getX(i));
    const warp = 1 + Math.sin(angle * 3 + seed + u * 2) * Math.sin(u * Math.PI) * 0.2;
    positions.setX(i, positions.getX(i) * warp + Math.sin(seed) * u * height * 0.12);
    positions.setZ(i, positions.getZ(i) * warp + Math.cos(seed) * u * height * 0.08);
  }
  if (snow) {
    const indices: number[] = [],
      source = geometry.index!;
    for (let i = 0; i < source.count; i += 3) {
      const a = source.getX(i),
        b = source.getX(i + 1),
        c = source.getX(i + 2);
      const y = (positions.getY(a) + positions.getY(b) + positions.getY(c)) / 3;
      const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3;
      if (y > height * (0.03 + Math.sin(x * 0.1 + seed) * 0.04)) indices.push(a, b, c);
    }
    geometry.setIndex(indices);
    geometry.clearGroups();
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(
        i,
        positions.getX(i) * 1.012,
        positions.getY(i) + 0.04,
        positions.getZ(i) * 1.012,
      );
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Static detail is baked by Renderer; only water, dust and chimney smoke remain dynamic. */
export class BiomeDetails {
  group = new THREE.Group();
  animated = new THREE.Group();
  footprints: DecorFootprint[] = [];
  private clock = 0;
  private water: THREE.DataTexture | null = null;
  private drifters: { mesh: THREE.Mesh; origin: THREE.Vector3; phase: number; smoke: boolean }[] =
    [];
  private materials = new Map<string, THREE.Material>();

  constructor(private track: Track) {
    this.group.name = `biome-details-${track.index}`;
    this.animated.name = `biome-ambience-${track.index}`;
    this.group.userData.footprints = this.footprints;
    if (track.index === 1) this.canyon();
    if (track.index === 2) this.archipelago();
    if (track.index === 3) this.mountain();
    if (track.index === 4) this.city();
    if (track.index > 0) this.clouds();
  }
  private material(color: string, lit = false) {
    const key = `${color}:${lit}`;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        lit
          ? new THREE.MeshBasicMaterial({ color, toneMapped: false })
          : new THREE.MeshLambertMaterial({ color }),
      );
    return this.materials.get(key)!;
  }
  private part(
    parent: THREE.Group,
    geometry: THREE.BufferGeometry,
    color: string,
    p: number[],
    size: number[],
    lit = false,
  ) {
    const mesh = new THREE.Mesh(geometry, this.material(color, lit));
    mesh.position.set(p[0], p[1], p[2]);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.castShadow = !lit;
    mesh.receiveShadow = !lit;
    parent.add(mesh);
    return mesh;
  }
  private box(parent: THREE.Group, color: string, p: number[], size: number[], lit = false) {
    return this.part(parent, new THREE.BoxGeometry(1, 1, 1), color, p, size, lit);
  }
  private oval(parent: THREE.Group, color: string, p: number[], size: number[]) {
    return this.part(parent, new THREE.SphereGeometry(1, 10, 7), color, p, size);
  }
  private site(t: number, side: number, radius: number, kind: string) {
    const center = this.track.at(t);
    const tangent = this.track.tangent(t);
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    center.addScaledVector(normal, side);
    // A conservative radius keeps the *whole* model off both paved corridors.
    for (let i = 0; i < 150; i++) {
      if (!this.track.overlapsAnyRoad(center, radius + 3)) break;
      center.addScaledVector(normal, Math.sign(side) * 3);
    }
    center.y = this.track.terrainHeight(center);
    this.footprints.push({ x: center.x, z: center.z, radius, kind });
    const root = new THREE.Group();
    root.position.copy(center);
    root.rotation.y = Math.atan2(tangent.x, tangent.z);
    root.name = kind;
    this.group.add(root);
    return root;
  }
  private drift(origin: THREE.Vector3, smoke: boolean, phase: number) {
    const material = new THREE.MeshBasicMaterial({
      color: smoke ? '#e2e7e8' : '#e2b08a',
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), material);
    this.animated.add(mesh);
    this.drifters.push({ mesh, origin: origin.clone(), phase, smoke });
  }
  private canyon() {
    for (let i = 0; i < 14; i++) {
      const cliff = this.site((i + 0.2) / 14, (i % 2 ? 1 : -1) * 35, 12, 'stratified-cliff');
      const height = 9 + (i % 4) * 3;
      for (let layer = 0; layer < 4; layer++) {
        const rock = this.part(
          cliff,
          new THREE.CylinderGeometry(1, 1.08, 1, 7),
          ['#ae674b', '#c17d55', '#d89b6d', '#e6b784'][layer],
          [Math.sin(i + layer) * 0.6, (height * (layer + 0.5)) / 4, 0],
          [6 - layer * 0.65, height / 4, 4.8 - layer * 0.35],
        );
        rock.rotation.y = i * 0.7;
      }
      for (let stone = 0; stone < 3; stone++)
        this.oval(cliff, '#cd9169', [-6 + stone * 4, 0.65, 4.7], [1.1, 0.8, 0.8]);
    }
    for (let i = 0; i < 28; i++) {
      const patch = this.site((i + 0.55) / 28, (i % 2 ? 1 : -1) * 17, 3, 'desert-garden');
      for (let stem = 0; stem < 3; stem++) {
        const cactus = this.oval(
          patch,
          ['#75946b', '#8b9f73', '#6b8e68'][stem],
          [(stem - 1) * 1.3, 0.65 + stem * 0.2, Math.sin(i + stem)],
          [0.34, 0.8 + stem * 0.2, 0.34],
        );
        cactus.rotation.z = (stem - 1) * 0.14;
        this.oval(
          patch,
          '#edbe9b',
          [(stem - 1) * 1.3, 1.45 + stem * 0.4, Math.sin(i + stem)],
          [0.19, 0.12, 0.19],
        );
      }
      if (i % 4 === 0)
        for (let j = 0; j < 4; j++)
          this.drift(patch.position.clone().add(new THREE.Vector3(0, 0.5, 0)), false, j / 4);
    }
  }
  private archipelago() {
    const pixels = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const ripple = Math.sin((x * Math.PI) / 8 + Math.sin((y * Math.PI) / 16) * 2);
        pixels.set([58 + ripple * 6, 162 + ripple * 12, 184 + ripple * 12, 255], (y * 64 + x) * 4);
      }
    this.water = new THREE.DataTexture(pixels, 64, 64);
    this.water.colorSpace = THREE.SRGBColorSpace;
    this.water.wrapS = this.water.wrapT = THREE.RepeatWrapping;
    this.water.magFilter = this.water.minFilter = THREE.LinearFilter;
    this.water.repeat.set(65, 65);
    this.water.needsUpdate = true;
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(1100, 1100),
      new THREE.MeshLambertMaterial({ map: this.water }),
    );
    ocean.name = 'animated-ocean';
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.16;
    this.animated.add(ocean);
    // Keep the coast outside the larger circuit and its alternative routes.
    for (const [inner, outer, color, y] of [
      [this.track.islandRadius - 3, this.track.islandRadius + 2, '#f0dba3', -0.12],
      [this.track.islandRadius + 2, this.track.islandRadius + 4, '#b9e6da', -0.14],
    ] as const) {
      const shore = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96), this.material(color));
      shore.rotation.x = -Math.PI / 2;
      shore.position.y = y;
      this.group.add(shore);
    }
    for (let i = 0; i < 22; i++) {
      const garden = this.site((i + 0.3) / 22, (i % 2 ? 1 : -1) * 22, 4.5, 'tropical-garden');
      for (let j = 0; j < 3; j++) {
        const leaf = this.oval(
          garden,
          j % 2 ? '#78a875' : '#548f74',
          [(j - 1) * 1.3, 0.8, Math.cos(i + j)],
          [0.45, 1.15, 0.25],
        );
        leaf.rotation.z = (j - 1) * 0.5;
        this.oval(garden, '#e9b5a0', [(j - 1) * 1.2, 1.5, Math.cos(i + j)], [0.22, 0.15, 0.22]);
      }
      this.oval(garden, '#b8c4b8', [2.5, 0.35, 0], [0.8, 0.4, 0.65]);
      if (i % 4 === 0) {
        const canopy = this.part(
          garden,
          new THREE.ConeGeometry(1.7, 0.65, 12),
          i % 8 ? '#dc947d' : '#e8d392',
          [0, 3.1, 0],
          [1, 1, 1],
        );
        canopy.rotation.y = i;
        this.box(garden, '#f4e2ba', [0, 1.5, 0], [0.12, 3, 0.12]);
        this.box(garden, '#eee6d0', [0.8, 0.45, 0.5], [0.8, 0.12, 1.8]).rotation.x = -0.1;
      }
    }
  }
  private mountain() {
    for (let i = 0; i < 22; i++) {
      const bank = this.site((i + 0.35) / 22, (i % 2 ? 1 : -1) * 21, 4.5, 'snow-garden');
      for (let j = 0; j < 3; j++) {
        this.oval(bank, '#90a9b8', [(j - 1) * 2, 0.65, 0], [1.1, 0.9, 1.2]);
        this.oval(bank, '#f5f7f5', [(j - 1) * 2, 1.1, 0], [1.25, 0.65, 1.3]);
      }
      if (i % 5 === 0) {
        for (const side of [-1, 1])
          this.box(bank, '#8c6852', [side * 1.4, 0.6, 0], [0.15, 1.2, 0.15]);
        this.box(bank, '#ad8663', [0, 1.25, 0], [3.4, 0.14, 0.5]);
        this.oval(bank, '#fff9ee', [0, 1.4, 0], [1.9, 0.2, 0.45]);
      }
    }
    for (let i = 0; i < 5; i++) {
      const lodge = this.site((i + 0.2) / 5, 35, 8, 'alpine-lodge');
      this.box(lodge, '#8b644f', [0, 2.5, 0], [8, 5, 7]);
      for (let beam = 0; beam < 5; beam++)
        this.box(lodge, '#b68b68', [0, 0.7 + beam * 0.85, 3.53], [8.2, 0.12, 0.1]);
      for (const side of [-1, 1]) {
        this.box(lodge, '#f5f7f5', [side * 2.1, 5.6, 0], [5.2, 0.5, 8.5]).rotation.z = -side * 0.45;
        this.box(lodge, '#fff0b3', [side * 2.2, 2.7, 3.56], [1.3, 1.5, 0.08], true);
        this.box(lodge, '#71513e', [side * 2.2, 2.7, 3.63], [0.08, 1.5, 0.08]);
      }
      this.box(lodge, '#e5c896', [0, 1.7, 3.57], [1.3, 3.2, 0.1]);
      this.box(lodge, '#7c8792', [2, 6.4, -1], [0.8, 2.6, 0.9]);
      lodge.updateMatrixWorld(true);
      const chimney = new THREE.Vector3(2, 7.7, -1).applyMatrix4(lodge.matrixWorld);
      for (let puff = 0; puff < 4; puff++) this.drift(chimney, true, puff / 4);
    }
  }
  private city() {
    for (let i = 0; i < 32; i++) {
      const terrace = this.site((i + 0.4) / 32, (i % 2 ? 1 : -1) * 18, 4, 'street-furniture');
      this.box(terrace, '#cdd1d1', [0, 0.12, 0], [6, 0.24, 4]);
      this.box(terrace, '#70847d', [-1.8, 0.5, 0], [1.5, 0.8, 1.5]);
      this.box(terrace, '#856c53', [-1.8, 1.9, 0], [0.22, 2.6, 0.22]);
      this.oval(terrace, ['#87a77a', '#a0b58a', '#7da295'][i % 3], [-1.8, 3.3, 0], [1.2, 1.4, 1.1]);
      for (const side of [-1, 1])
        this.box(terrace, '#4e606e', [side * 0.85 + 1, 0.4, 0.7], [0.14, 0.8, 0.5]);
      this.box(terrace, '#bc9873', [1, 0.8, 0.7], [2.3, 0.14, 0.65]);
      this.box(terrace, '#bc9873', [1, 1.1, 1], [2.3, 0.6, 0.12]);
      if (i % 4 === 0) {
        this.box(terrace, '#526a75', [1.9, 1.8, -1], [0.14, 3.6, 0.14]);
        this.box(terrace, i % 8 ? '#db987f' : '#77b2ba', [1.9, 3.1, -1], [1, 1.4, 0.1]);
        this.box(terrace, '#f5e9c8', [1.9, 3.1, -0.92], [0.6, 0.12, 0.05], true);
      }
    }
  }
  private clouds() {
    for (let i = 0; i < 9; i++) {
      const angle = (i * Math.PI * 2) / 9;
      for (let lobe = 0; lobe < 3; lobe++) {
        const cloud = this.oval(
          this.group,
          this.track.index === 1 ? '#f3dfc7' : '#f0f3f0',
          [
            Math.sin(angle) * 215 + lobe * 8,
            48 + (i % 3) * 8 + (lobe === 1 ? 2 : 0),
            Math.cos(angle) * 215,
          ],
          [12, lobe === 1 ? 5 : 3, 7],
        );
        cloud.castShadow = cloud.receiveShadow = false;
      }
    }
  }
  update(dt: number) {
    this.clock += dt;
    if (this.water) this.water.offset.set(this.clock * 0.006, Math.sin(this.clock * 0.25) * 0.015);
    for (const { mesh, origin, phase, smoke } of this.drifters) {
      const age = (this.clock * (smoke ? 0.18 : 0.1) + phase) % 1;
      mesh.position.copy(origin);
      mesh.position.x += smoke ? age * 2 : age * 5 - 2;
      mesh.position.y += smoke ? age * 5 : Math.sin(age * Math.PI) * 0.7;
      mesh.scale.setScalar(smoke ? 0.3 + age * 0.8 : 0.5 + age);
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        Math.sin(age * Math.PI) * (smoke ? 0.25 : 0.13);
    }
  }
}
