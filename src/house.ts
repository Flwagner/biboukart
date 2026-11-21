import * as THREE from 'three';
import type { Track } from './track';

interface Footprint {
  x: number;
  z: number;
  radius: number;
  kind: string;
}

type Vec3 = [number, number, number];

const WALL_HEIGHT = 58;
/** Centre of the table slab; the cloth, runner and props stack above it. */
const TABLE_TOP = 10.35;
/** Top of the tablecloth, where the breakfast props sit (road surface is 11.02). */
const TABLE_SURFACE = 10.88;

/**
 * Everything inside the giant house: rooms, furniture and the breakfast table
 * the race starts on. Static meshes are batched by the renderer; only the
 * pendant lamp, the steam and the TV screen live in the animated group.
 */
export function buildHouse(
  track: Track,
  group: THREE.Group,
  animated: THREE.Group,
  footprints: Footprint[],
) {
  const builder = new HouseBuilder(track, group, animated, footprints);
  builder.build();
  return (dt: number) => builder.update(dt);
}

class HouseBuilder {
  private materials = new Map<string, THREE.Material>();
  private sway: THREE.Object3D[] = [];
  private steam: THREE.Mesh[] = [];
  private steamOrigin = new THREE.Vector3();
  private screen: THREE.MeshBasicMaterial | null = null;
  private clock = 0;

  constructor(
    private track: Track,
    private group: THREE.Group,
    private animated: THREE.Group,
    private footprints: Footprint[],
  ) {}

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
    p: Vec3,
    size: Vec3,
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

  private box(parent: THREE.Group, color: string, p: Vec3, size: Vec3, lit = false) {
    return this.part(parent, new THREE.BoxGeometry(1, 1, 1), color, p, size, lit);
  }

  private oval(parent: THREE.Group, color: string, p: Vec3, size: Vec3) {
    return this.part(parent, new THREE.SphereGeometry(1, 10, 7), color, p, size);
  }

  private cyl(parent: THREE.Group, color: string, p: Vec3, size: Vec3, lit = false) {
    return this.part(parent, new THREE.CylinderGeometry(1, 1, 1, 16), color, p, size, lit);
  }

  /** Outward side of the loop at t, so furniture always grows away from the road. */
  private outward(t: number, distance: number) {
    const p = this.track.at(t),
      tangent = this.track.tangent(t),
      normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const side = Math.sign(normal.dot(new THREE.Vector3(p.x, 0, p.z))) || 1;
    return side * distance;
  }

  private site(t: number, side: number, radius: number, kind: string) {
    const center = this.track.at(t);
    const tangent = this.track.tangent(t);
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    center.addScaledVector(normal, side);
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

  build() {
    this.roomShell();
    this.breakfastTable();
    this.books();
    this.hallway();
    this.wc();
    this.bedroom();
    this.livingRoom();
    this.alternativeLandmark();
    for (const t of [0.17, 0.34, 0.53, 0.72, 0.9]) this.doorway(t);
    this.roomSign(0.17, 'COULOIR', '#5f7f6c');
    this.roomSign(0.37, 'WC', '#4f7f8c');
    this.roomSign(0.53, 'CHAMBRE', '#a06a62');
    this.roomSign(0.72, 'SALON', '#7a6a9a');
    this.roomSign(0.9, 'CUISINE', '#8a6a43');
    for (const [t, side, length, color] of [
      [0.2, 24, 26, '#dfe7e0'],
      [0.38, 26, 24, '#d7e5e1'],
      [0.5, 26, 24, '#d7e5e1'],
      [0.68, 26, 26, '#ead9bf'],
      [0.9, 24, 26, '#dfe7e0'],
    ] as const)
      this.wallPanel(t, this.outward(t, side), length, color);
    this.ambience();
  }

  private roomShell() {
    const radius = this.track.islandRadius;
    const wallColors = ['#ead9bf', '#dfe7e0'];
    const segments = 30;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.sin(angle) * radius,
        z = Math.cos(angle) * radius;
      const wall = new THREE.Group();
      wall.position.set(x, 0, z);
      wall.rotation.y = -angle - Math.PI / 2;
      this.box(
        wall,
        wallColors[Math.floor(i / 8) % wallColors.length],
        [0, WALL_HEIGHT / 2, 0],
        [2 * radius * Math.tan(Math.PI / segments) + 2, WALL_HEIGHT, 3.5],
      );
      this.box(
        wall,
        '#f1dfc0',
        [0, 1.6, -0.4],
        [2 * radius * Math.tan(Math.PI / segments), 3.2, 4],
      );
      if (i % 5 === 1) this.box(wall, '#cfe9f2', [0, WALL_HEIGHT * 0.58, -2], [12, 16, 0.4], true);
      this.group.add(wall);
    }
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2.4, radius * 2.4),
      this.material('#f1dfc0'),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    ceiling.castShadow = false;
    ceiling.receiveShadow = false;
    this.group.add(ceiling);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 1.9, 1.4, 2.4),
        this.material('#a97a4f'),
      );
      beam.position.set(0, WALL_HEIGHT - 1, 0);
      beam.rotation.y = angle;
      beam.castShadow = false;
      this.group.add(beam);
    }
  }

  private breakfastTable() {
    // The tabletop must stop where the road leaves the plateau. A slab sized
    // from the ramp samples used to swallow the descent, so the kart drove
    // through the table and the cream underside filled the screen.
    const flat = 0.055,
      half = this.track.width / 2,
      footprint: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = -flat + (2 * flat * i) / 40,
        p = this.track.at(t),
        tangent = this.track.tangent(t),
        normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      for (const side of [-1, 1])
        footprint.push(p.clone().addScaledVector(normal, side * (half + 36)));
    }
    const bounds = new THREE.Box3().setFromPoints(footprint);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const width = size.x,
      depth = size.z;
    const table = new THREE.Group();
    table.name = 'breakfast-table';
    table.position.set(center.x, 0, center.z);
    this.box(table, '#a97a4f', [0, TABLE_TOP, 0], [width, 0.9, depth]);
    this.box(table, '#f1dfc0', [0, TABLE_TOP + 0.49, 0], [width + 2.5, 0.08, depth + 2.5]);
    this.box(table, '#c4574e', [0, TABLE_TOP + 0.54, 0], [width * 0.34, 0.02, depth * 0.34]);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        this.box(
          table,
          '#8c6340',
          [sx * (width / 2 - 6), (TABLE_TOP - 0.45) / 2, sz * (depth / 2 - 6)],
          [4.6, TABLE_TOP - 0.45, 4.6],
        );
    this.group.add(table);

    const chairs: [number, number, number][] = [
      [0, 0, depth / 2 + 9],
      [0, 0, -depth / 2 - 9],
      [width / 2 + 9, 0, 0],
      [-width / 2 - 9, 0, 0],
    ];
    for (const [cx, , cz] of chairs) {
      const position = new THREE.Vector3(center.x + cx, 0, center.z + cz);
      if (this.track.overlapsAnyRoad(position, 9)) continue;
      position.y = this.track.terrainHeight(position);
      const chair = new THREE.Group();
      chair.position.copy(position);
      chair.rotation.y = Math.atan2(center.x - position.x, center.z - position.z);
      this.box(chair, '#a97a4f', [0, 6, 0], [13, 1.4, 13]);
      this.box(chair, '#a97a4f', [0, 11.5, -5.8], [13, 10, 1.4]);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          this.box(chair, '#8c6340', [sx * 5.2, 3, sz * 5.2], [1.2, 6, 1.2]);
      this.group.add(chair);
    }

    const item = (t: number, side: number, radius: number, kind: string) => {
      const root = this.site(t, side, radius, kind);
      root.position.y = TABLE_SURFACE;
      return root;
    };

    for (const [t, side] of [
      [0.0, 27],
      [0.012, -27],
      [0.042, 28],
    ] as const) {
      const stack = item(t, side, 8, 'biscottes');
      for (let layer = 0; layer < 4; layer++) {
        const biscuit = this.box(
          stack,
          layer % 2 ? '#d9a86c' : '#d9a86c',
          [0, 0.5 + layer * 0.9, 0],
          [7, 0.85, 10.5],
        );
        biscuit.rotation.y = layer * 0.16;
        for (let dot = 0; dot < 5; dot++)
          this.oval(
            stack,
            '#8c6340',
            [Math.sin(dot * 2.3) * 2.4, 0.94 + layer * 0.9, Math.cos(dot * 2.3) * 3.2],
            [0.28, 0.12, 0.28],
          );
      }
    }

    for (const [t, side] of [
      [0.03, -26],
      [0.052, 25],
    ] as const) {
      const jar = item(t, side, 6, 'jam-jar');
      this.cyl(jar, '#d7e5e1', [0, 4, 0], [3.4, 8, 3.4]);
      this.cyl(jar, '#b23a48', [0, 3, 0], [3.05, 4.6, 3.05]);
      this.cyl(jar, '#c9a24a', [0, 8.4, 0], [3.6, 1.1, 3.6]);
      this.box(jar, '#f5e7c8', [0, 4, 3.2], [3.4, 2.6, 0.2]);
      this.box(jar, '#b23a48', [0, 4, 3.32], [2.2, 0.35, 0.05]);
    }

    const mug = item(0.008, 30, 6, 'mug');
    this.cyl(mug, '#6d94b8', [0, 4, 0], [3.2, 8, 3.2]);
    this.cyl(mug, '#f7f0e2', [0, 7.9, 0], [2.6, 0.2, 2.6]);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(2, 0.6, 7, 14), this.material('#6d94b8'));
    handle.position.set(3.1, 4.2, 0);
    mug.add(handle);

    const butter = item(0.04, -31, 6, 'butter-dish');
    this.box(butter, '#f7f0e2', [0, 1, 0], [9, 1.6, 6]);
    this.oval(butter, '#e3c06a', [0, 2.6, 0], [4, 1.4, 2.6]);
    this.oval(butter, '#f7f0e2', [0, 3.4, 0], [5, 1.5, 3.4]);

    const knife = item(0.024, -32, 7, 'butter-knife');
    this.box(knife, '#9fb0ba', [0, 0.4, 1.5], [2.6, 0.4, 13]);
    this.box(knife, '#7a5335', [0, 0.6, -6.5], [2.8, 0.9, 6]);
  }

  private books() {
    for (const [t, side] of [
      [0.1, 20],
      [0.92, 20],
    ] as const) {
      const book = this.site(t, this.outward(t, side), 10, 'cookbook');
      this.box(book, '#c4574e', [0, 0.8, 0], [18, 1.6, 13]);
      this.box(book, '#f7f0e2', [0, 1.75, 0], [16.5, 0.4, 12]);
      for (const turn of [-1, 1]) {
        const page = this.box(book, '#f7f0e2', [turn * 4.2, 2.5, 0], [8, 1.2, 11.5]);
        page.rotation.z = turn * 0.16;
      }
    }
  }

  private hallway() {
    const hall = this.site(0.27, this.outward(0.27, 34), 17, 'hallway');
    this.box(hall, '#b26c5d', [0, 0.14, 0], [15, 0.25, 36]);
    this.box(hall, '#f1dfc0', [0, 0.2, 0], [11, 0.12, 32]);
    for (const side of [-1, 1]) {
      const shoe = new THREE.Group();
      shoe.position.set(side * 4.2, 0, 8);
      this.box(shoe, side > 0 ? '#4b4239' : '#4b4239', [0, 1.8, 0], [7, 3.6, 13]);
      this.oval(shoe, side > 0 ? '#4b4239' : '#4b4239', [0, 2, 6.2], [3.6, 2.4, 3]);
      this.box(shoe, '#4b4239', [0, 0.5, -4.5], [6.8, 0.8, 3.5]);
      hall.add(shoe);
    }
    this.cyl(hall, '#7a5335', [13, 10, -12], [0.8, 20, 0.8]);
    this.oval(hall, '#7a5335', [13, 20, -12], [1.4, 1, 1.4]);
    this.oval(hall, '#78927f', [13, 15, -9.5], [3.2, 7, 1.4]);
    this.oval(hall, '#d9a0a8', [13, 14, -14.2], [2.8, 6, 1.2]);
    this.box(hall, '#f1dfc0', [-13, 6, -12], [6, 12, 0.8]);
    const stand = this.site(0.24, this.outward(0.24, 30), 8, 'umbrella-stand');
    this.cyl(stand, '#4b4239', [0, 4, 0], [3, 8, 3]);
    for (const side of [-1, 1]) {
      const umbrella = this.cyl(
        stand,
        side > 0 ? '#c4574e' : '#6d94b8',
        [side * 1.2, 12, 0],
        [1.2, 18, 1.2],
      );
      umbrella.rotation.z = side * 0.16;
    }
  }

  private wc() {
    const wc = this.site(0.44, this.outward(0.44, 40), 21, 'wc');
    this.box(wc, '#d7e5e1', [0, 0.1, 0], [46, 0.2, 46]);
    for (let i = -2; i <= 2; i++) {
      this.box(wc, '#c3d0cc', [0, 0.22, i * 9], [46, 0.06, 0.4]);
      this.box(wc, '#c3d0cc', [i * 9, 0.22, 0], [0.4, 0.06, 46]);
    }
    const toilet = new THREE.Group();
    toilet.position.set(-8, 0, 0);
    this.oval(toilet, '#f7f0e2', [0, 2.2, 0], [5, 2.4, 6.5]);
    this.cyl(toilet, '#f7f0e2', [0, 5.6, 0], [6.2, 4.6, 6.2]);
    this.box(toilet, '#f7f0e2', [-6.5, 8.5, 0], [7, 9, 5.5]);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.9, 8, 20), this.material('#f7f0e2'));
    seat.rotation.x = -Math.PI / 2;
    seat.position.y = 8.3;
    toilet.add(seat);
    this.oval(toilet, '#f7f0e2', [0, 8.7, -5], [4.4, 0.7, 3]);
    this.box(toilet, '#9fb0ba', [-6.5, 13.6, 0], [2.4, 0.6, 1.8]);
    wc.add(toilet);
    const roll = this.cyl(wc, '#f7f0e2', [10, 9, -8], [2.4, 4.4, 2.4]);
    roll.rotation.z = Math.PI / 2;
    this.box(wc, '#9fb0ba', [10, 9, -8], [0.5, 6.4, 0.5]);
    this.box(wc, '#f7f0e2', [14, 4.5, -13], [8, 1.6, 6]);
    this.cyl(wc, '#f7f0e2', [14, 2.2, -13], [2, 4.4, 2]);
    this.oval(wc, '#f7f0e2', [14, 5.4, -13], [4.4, 1.2, 3.4]);
    this.box(wc, '#9fb0ba', [14, 13, -16.5], [9, 12, 0.5], true);
    this.cyl(wc, '#7a5335', [18, 7, 4], [0.6, 14, 0.6]);
    this.oval(wc, '#6d94b8', [18, 2.4, 4], [2.2, 1.6, 3]);
    this.oval(wc, '#e3c06a', [18, 4.4, 5.4], [1.1, 0.7, 1.4]);
    this.oval(wc, '#6d94b8', [18, 4.6, 4], [1.2, 1.2, 1.2]);
    const mat = this.site(0.4, this.outward(0.4, 30), 9, 'bath-mat');
    this.box(mat, '#d9a0a8', [0, 0.16, 0], [18, 0.24, 12]);
    this.box(mat, '#f7f0e2', [0, 0.3, 0], [15, 0.12, 9]);
  }

  private bedroom() {
    const bed = this.site(0.6, this.outward(0.6, 44), 30, 'bedroom');
    this.box(bed, '#b26c5d', [0, 0.14, 0], [48, 0.22, 38]);
    this.box(bed, '#f1dfc0', [0, 0.24, 0], [42, 0.12, 32]);
    this.box(bed, '#a97a4f', [0, 3.5, 0], [32, 7, 44]);
    this.box(bed, '#f7f0e2', [0, 8, 0], [30, 3, 42]);
    this.box(bed, '#78927f', [0, 10.6, -4], [32, 2.4, 32]);
    for (const side of [-1, 1]) this.oval(bed, '#f7f0e2', [side * 8, 10.6, 12], [7, 2, 4]);
    this.box(bed, '#7a5335', [0, 12, -21.5], [32, 17, 2.4]);
    const nightstand = new THREE.Group();
    nightstand.position.set(24, 0, 10);
    this.box(nightstand, '#a97a4f', [0, 5.5, 0], [12, 11, 12]);
    this.box(nightstand, '#c9a24a', [0, 7.5, 6.1], [1.2, 0.5, 0.4]);
    this.cyl(nightstand, '#7a5335', [0, 15, 0], [0.6, 8, 0.6]);
    this.cyl(nightstand, '#fff0c4', [0, 20, 0], [3.6, 4, 3.6], true);
    this.box(nightstand, '#4b4239', [0, 12, 4], [4, 3, 3]);
    this.box(nightstand, '#cfe9f2', [0, 12, 5.55], [3, 2, 0.2], true);
    bed.add(nightstand);
    for (const side of [-1, 1]) {
      const slipper = this.oval(bed, '#d9a0a8', [side * 5, 1.4, 18], [3, 1.4, 5]);
      slipper.rotation.y = side * 0.2;
    }
    for (let i = 0; i < 3; i++)
      this.box(bed, ['#c4574e', '#6d94b8', '#e3c06a'][i], [-18 + i * 5, 2.2, 14], [4, 4, 4]);
    const chest = this.site(0.64, this.outward(0.64, 40), 12, 'toy-chest');
    this.box(chest, '#7a5335', [0, 5, 0], [16, 10, 11]);
    this.box(chest, '#a97a4f', [0, 10.6, 0], [16.5, 1.2, 11.5]);
    this.box(chest, '#e3c06a', [0, 8, 5.8], [2.4, 2.4, 0.5]);
  }

  private livingRoom() {
    const living = this.site(0.8, this.outward(0.8, 44), 30, 'living-room');
    this.box(living, '#b26c5d', [0, 0.14, 0], [52, 0.22, 42]);
    this.box(living, '#e5dfcd', [0, 0.24, 0], [46, 0.12, 36]);
    const sofa = new THREE.Group();
    sofa.position.set(0, 0, -14);
    this.box(sofa, '#78927f', [0, 4, 0], [44, 8, 20]);
    this.box(sofa, '#6a8574', [0, 13, -8], [44, 16, 6]);
    for (const side of [-1, 1]) this.box(sofa, '#6a8574', [side * 22, 8, 0], [6, 12, 20]);
    for (let i = -1; i <= 1; i++)
      this.box(sofa, i === 0 ? '#d9a0a8' : '#e3c06a', [i * 12, 9, 0], [11, 4, 15]);
    living.add(sofa);
    const coffee = new THREE.Group();
    coffee.position.set(0, 0, 9);
    this.box(coffee, '#a97a4f', [0, 7, 0], [26, 1.6, 16]);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) this.box(coffee, '#8c6340', [sx * 10, 3.5, sz * 6], [1.4, 7, 1.4]);
    this.box(coffee, '#f7f0e2', [0, 8, 0], [9, 0.2, 6]);
    living.add(coffee);
    const tv = new THREE.Group();
    tv.position.set(0, 0, 26);
    this.box(tv, '#4b4239', [0, 4.5, 0], [26, 9, 9]);
    this.box(tv, '#2b3a49', [0, 17, 0], [30, 20, 1.6]);
    living.add(tv);
    living.updateMatrixWorld(true);
    const screenMaterial = new THREE.MeshBasicMaterial({ color: '#5c86a4', toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(25, 16), screenMaterial);
    screen.position.set(0, 17, 27.2).applyMatrix4(living.matrixWorld);
    screen.rotation.copy(living.rotation);
    this.animated.add(screen);
    this.screen = screenMaterial;
    const plant = new THREE.Group();
    plant.position.set(28, 0, 2);
    this.cyl(plant, '#c07a5a', [0, 4, 0], [4.5, 8, 4.5]);
    for (let leaf = 0; leaf < 7; leaf++) {
      const blade = this.oval(
        plant,
        leaf % 2 ? '#5f8f5c' : '#7fa86f',
        [Math.sin(leaf * 2.1) * 4, 10 + (leaf % 3) * 3, Math.cos(leaf * 2.1) * 4],
        [1.8, 6, 1.8],
      );
      blade.rotation.z = Math.sin(leaf * 2.1) * 0.5;
    }
    living.add(plant);
    const lamp = new THREE.Group();
    lamp.position.set(-28, 0, 4);
    this.cyl(lamp, '#4b4239', [0, 12, 0], [0.7, 24, 0.7]);
    this.cyl(lamp, '#fff0c4', [0, 26, 0], [5, 6, 5], true);
    this.cyl(lamp, '#e3c06a', [0, 29.4, 0], [5.4, 1.2, 5.4]);
    living.add(lamp);
    const shelf = new THREE.Group();
    shelf.position.set(0, 0, -30);
    this.box(shelf, '#8c6340', [0, 13, 0], [22, 26, 8]);
    for (let row = 0; row < 3; row++) {
      this.box(shelf, '#a97a4f', [0, 4 + row * 8, 4.2], [20, 0.8, 0.6]);
      for (let book = 0; book < 5; book++)
        this.box(
          shelf,
          ['#c4574e', '#6d94b8', '#e3c06a', '#78927f', '#d9a0a8'][book],
          [-8 + book * 4, 7 + row * 8, 4.6],
          [2.2, 5, 1.2],
        );
    }
    living.add(shelf);
    const pouf = this.site(0.76, this.outward(0.76, 38), 12, 'pouf');
    this.cyl(pouf, '#d9a0a8', [0, 3.5, 0], [7, 7, 7]);
    this.cyl(pouf, '#d9a0a8', [0, 7.4, 0], [6.4, 0.8, 6.4]);
  }

  /** A giant armchair marks the scenic fork, mirroring the other biomes' landmarks. */
  private alternativeLandmark() {
    const u = 0.25;
    const p = this.track.routeAt('alternative', u);
    const tangent = this.track.routeTangent('alternative', u);
    const radial = new THREE.Vector3(p.x, 0, p.z).normalize();
    p.addScaledVector(radial, 24);
    for (let attempt = 0; attempt < 60; attempt++) {
      if (!this.track.overlapsAnyRoad(p, 16)) break;
      p.addScaledVector(radial, 3);
    }
    p.y = this.track.terrainHeight(p);
    this.footprints.push({ x: p.x, z: p.z, radius: 12, kind: 'alternative-landmark' });
    const chair = new THREE.Group();
    chair.name = 'alternative-landmark-5-0';
    chair.position.copy(p);
    chair.rotation.y = Math.atan2(tangent.x, tangent.z);
    this.box(chair, '#78927f', [0, 4, 0], [15, 8, 15]);
    this.box(chair, '#6a8574', [0, 13, -6], [15, 15, 4]);
    for (const side of [-1, 1]) this.box(chair, '#6a8574', [side * 7, 8, 0], [3, 10, 15]);
    this.box(chair, '#d9a0a8', [0, 9, 1], [11, 3, 10]);
    this.group.add(chair);
  }

  private doorway(t: number) {
    const p = this.track.at(t),
      tangent = this.track.tangent(t),
      frame = new THREE.Group();
    frame.position.copy(p);
    frame.rotation.y = Math.atan2(tangent.x, tangent.z);
    const half = this.track.width / 2 + 2.4;
    for (const side of [-1, 1]) this.box(frame, '#f2e6d2', [side * half, 10, 0], [2.4, 20, 2.4]);
    this.box(frame, '#f2e6d2', [0, 21, 0], [half * 2 + 2.4, 2.6, 2.8]);
    this.group.add(frame);
  }

  /** Room name hanging over the track, so every area reads at racing speed. */
  private roomSign(t: number, text: string, color: string) {
    const p = this.track.at(t),
      tangent = this.track.tangent(t),
      frame = new THREE.Group();
    frame.position.copy(p);
    frame.rotation.y = Math.atan2(tangent.x, tangent.z);
    const half = this.track.width / 2 + 2.6;
    for (const side of [-1, 1]) this.box(frame, '#f2e6d2', [side * half, 8.5, 0], [1.8, 17, 1.8]);
    this.box(frame, '#f2e6d2', [0, 17.4, 0], [half * 2 + 1.8, 1.8, 2]);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const context = canvas.getContext('2d')!;
      context.fillStyle = color;
      context.fillRect(0, 0, 512, 128);
      context.strokeStyle = '#fff6df';
      context.lineWidth = 8;
      context.strokeRect(6, 6, 500, 116);
      context.fillStyle = '#fff6df';
      context.font = 'bold 62px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 256, 68);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(15, 3.75),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
      );
      plate.position.set(0, 11.8, 0);
      // Face the oncoming karts, so the text reads left-to-right from the road.
      plate.rotation.y = Math.PI;
      frame.add(plate);
    } else this.box(frame, color, [0, 13.6, 0], [15, 3.75, 0.3], true);
    this.group.add(frame);
  }

  /** Interior wall panel beside the road, with skirting and a framed picture. */
  private wallPanel(t: number, side: number, length: number, color: string) {
    const tangent = this.track.tangent(t);
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const center = this.track.at(t).addScaledVector(normal, side);
    for (let attempt = 0; attempt < 30; attempt++) {
      let clear = true;
      for (const along of [-length / 2, 0, length / 2])
        for (const depth of [-1, 1]) {
          const corner = center
            .clone()
            .addScaledVector(tangent, along)
            .addScaledVector(normal, depth * 1.4);
          if (this.track.overlapsAnyRoad(corner, 1.5)) clear = false;
        }
      if (clear) break;
      center.addScaledVector(normal, Math.sign(side) * 2);
    }
    center.y = 0;
    const panel = new THREE.Group();
    panel.position.copy(center);
    panel.rotation.y = Math.atan2(tangent.x, tangent.z);
    this.box(panel, color, [0, 17, 0], [2, 34, length]);
    this.box(panel, '#f1dfc0', [-0.1, 1.6, 0], [2.3, 3.2, length]);
    this.box(panel, '#f1dfc0', [-0.1, 33.2, 0], [2.3, 1.4, length]);
    this.box(panel, '#a97a4f', [-1.15, 20, 0], [0.4, 9, 11]);
    this.box(panel, '#cfe9f2', [-1.38, 20, 0], [0.2, 7, 9], true);
    this.group.add(panel);
  }

  /** Pendant lamp, steam and the breakfast table ambience. */
  private ambience() {
    const start = this.track.at(0);
    const pendant = new THREE.Group();
    pendant.position.set(start.x, WALL_HEIGHT, start.z);
    this.box(pendant, '#4b4239', [0, -6, 0], [0.5, 12, 0.5]);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(7, 7, 14, 1, true),
      this.material('#e3c06a'),
    );
    shade.position.y = -14;
    shade.rotation.x = Math.PI;
    pendant.add(shade);
    this.oval(pendant, '#fff0c4', [0, -16.5, 0], [2.4, 2.4, 2.4]);
    this.animated.add(pendant);
    this.sway.push(pendant);

    const kettle = this.site(0.055, this.outward(0.055, 30), 7, 'kettle');
    kettle.position.y = TABLE_SURFACE;
    this.cyl(kettle, '#9fb0ba', [0, 3.6, 0], [3.6, 7, 3.6]);
    this.cyl(kettle, '#7a5335', [0, 7.4, 0], [1.4, 1.2, 1.4]);
    this.cyl(kettle, '#9fb0ba', [4.2, 5, 0], [0.8, 4, 0.8]);
    this.steamOrigin.set(kettle.position.x, kettle.position.y + 9, kettle.position.z);
    const steamMaterial = new THREE.MeshBasicMaterial({
      color: '#f7f0e2',
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), steamMaterial);
      puff.position.copy(this.steamOrigin);
      this.animated.add(puff);
      this.steam.push(puff);
    }
  }

  update(dt: number) {
    this.clock += dt;
    for (const object of this.sway) object.rotation.z = Math.sin(this.clock * 0.9) * 0.05;
    for (let i = 0; i < this.steam.length; i++) {
      const puff = this.steam[i],
        age = (this.clock * 0.22 + i / this.steam.length) % 1;
      puff.position.set(
        this.steamOrigin.x + Math.sin(age * 5 + i) * 1.4,
        this.steamOrigin.y + age * 13,
        this.steamOrigin.z + Math.cos(age * 4 + i) * 1.2,
      );
      puff.scale.setScalar(0.5 + age * 1.5);
      (puff.material as THREE.MeshBasicMaterial).opacity = Math.sin(age * Math.PI) * 0.28;
    }
    if (this.screen) {
      const flicker = 0.6 + 0.12 * Math.sin(this.clock * 7.3) + 0.06 * Math.sin(this.clock * 13.1);
      this.screen.color.setRGB(flicker * 0.5, flicker * 0.7, flicker * 0.92);
    }
  }
}
