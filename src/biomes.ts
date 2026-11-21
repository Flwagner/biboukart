import * as THREE from 'three';
import type { Track } from './track';
import { buildHouse } from './house';

export const circuitAtmospheres = [
  { sun: '#fff0d2', skyLight: '#d5eaff', bounce: '#617b52', exposure: 1.15 },
  { sun: '#ffddb1', skyLight: '#d6e1f4', bounce: '#a5795b', exposure: 1.1 },
  { sun: '#fff2ce', skyLight: '#c9edff', bounce: '#6bafa4', exposure: 1.12 },
  { sun: '#ffeacb', skyLight: '#d6edff', bounce: '#8bacc4', exposure: 1.08 },
  { sun: '#ffdcba', skyLight: '#cbd7f0', bounce: '#7d8499', exposure: 1.12 },
  { sun: '#ffe3ba', skyLight: '#f2e2c6', bounce: '#a87f57', exposure: 1.06 },
  { sun: '#b9c6ff', skyLight: '#39457a', bounce: '#111426', exposure: 0.92 },
  { sun: '#ffcf8f', skyLight: '#c8ddc2', bounce: '#2f4d34', exposure: 1.04 },
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
  private orbiters: {
    mesh: THREE.Group;
    radius: number;
    height: number;
    speed: number;
    phase: number;
  }[] = [];
  private materials = new Map<string, THREE.Material>();
  private houseUpdate: ((dt: number) => void) | null = null;
  private lava: THREE.DataTexture | null = null;
  private molten: THREE.MeshBasicMaterial | null = null;

  constructor(private track: Track) {
    this.group.name = `biome-details-${track.index}`;
    this.animated.name = `biome-ambience-${track.index}`;
    this.group.userData.footprints = this.footprints;
    if (track.index === 1) this.canyon();
    if (track.index === 2) this.archipelago();
    if (track.index === 3) this.mountain();
    if (track.index === 4) this.city();
    if (track.index === 5) this.house();
    if (track.index === 6) this.space();
    if (track.index === 7) this.jungleVolcano();
    if (track.index > 0 && track.index !== 5 && track.index !== 6) this.clouds();
  }
  private house() {
    this.houseUpdate = buildHouse(this.track, this.group, this.animated, this.footprints);
  }
  private space() {
    // A deterministic star dome, brighter above the horizon and deep into the distance.
    const starCount = 760,
      positions = new Float32Array(starCount * 3);
    let seed = 417;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < starCount; i++) {
      const angle = random() * Math.PI * 2,
        height = 0.04 + random() * 0.96,
        radius = 290 + random() * 90,
        ring = Math.sqrt(1 - height * height);
      positions[i * 3] = Math.cos(angle) * ring * radius;
      positions[i * 3 + 1] = height * radius;
      positions[i * 3 + 2] = Math.sin(angle) * ring * radius;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: '#eaf2ff',
        size: 1.25,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    );
    stars.name = 'space-stars';
    stars.frustumCulled = false;
    this.group.add(stars);
    const sun = new THREE.Group();
    sun.name = 'space-sun';
    sun.position.set(-250, 315, 165);
    sun.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(16, 20, 14),
        new THREE.MeshBasicMaterial({ color: '#fff4c9', toneMapped: false, fog: false }),
      ),
    );
    for (const [radius, opacity] of [
      [27, 0.25],
      [40, 0.09],
    ] as const) {
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 18, 12),
        new THREE.MeshBasicMaterial({
          color: '#ffad4d',
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          fog: false,
        }),
      );
      sun.add(halo);
    }
    this.group.add(sun);
    const planet = (
      position: [number, number, number],
      radius: number,
      color: string,
      ringed = false,
    ) => {
      const body = new THREE.Group();
      body.position.set(...position);
      body.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(radius, 20, 14),
          new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false }),
        ),
      );
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.01, radius * 0.045, 6, 40),
        new THREE.MeshBasicMaterial({
          color: '#f1eaff',
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          toneMapped: false,
          fog: false,
        }),
      );
      body.add(band);
      if (ringed) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radius * 1.35, radius * 2.05, 42),
          new THREE.MeshBasicMaterial({
            color: '#b7c5ee',
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false,
            toneMapped: false,
            fog: false,
          }),
        );
        ring.rotation.set(Math.PI / 2, 0, 0.35);
        body.add(ring);
      }
      this.group.add(body);
    };
    planet([-300, 120, -210], 18, '#8d7cd8', true);
    planet([265, 170, -230], 13, '#61c9c5');
    planet([235, 100, 270], 10, '#e6a36f');
    for (let i = 0; i < 24; i++) {
      const site = this.site(
        (i + 0.35) / 24,
        (i % 2 ? 1 : -1) * (20 + (i % 4) * 3),
        5.5,
        'asteroid',
      );
      for (let j = 0; j < 3; j++) {
        const rock = this.part(
          site,
          new THREE.DodecahedronGeometry(1, 0),
          ['#262b45', '#313753', '#1d2238'][j],
          [Math.sin(i + j * 2) * 1.4, 0.9 + j * 0.35, Math.cos(i * 1.7 + j) * 1.2],
          [2.1 - j * 0.4, 1.6 + j * 0.25, 1.8 - j * 0.25],
        );
        rock.rotation.set(i * 0.4 + j, i * 0.7, j * 0.5);
      }
      const crystal = this.part(
        site,
        new THREE.OctahedronGeometry(1, 0),
        '#79e7ff',
        [1.8, 1.8, 0.5],
        [0.28, 1, 0.28],
        true,
      );
      crystal.rotation.z = 0.2;
    }
    this.rocket(95, 26, 0.15, 0, '#cdd8ff');
    this.rocket(140, 42, 0.1, 2.2, '#9fd8e9');
    this.rocket(185, 58, 0.065, 4.1, '#e7b4d6');
  }
  /** Molten rock texture: dark basalt crust crossed by bright, flowing veins. */
  private moltenMaterial() {
    if (!this.molten) {
      const pixels = new Uint8Array(64 * 64 * 4);
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const wave =
            Math.sin(x * 0.35 + y * 0.21) +
            Math.sin(x * 0.13 - y * 0.47 + 2.1) +
            Math.sin((x + y) * 0.62 + 0.7) * 0.6;
          const heat = 0.42 + 0.58 * THREE.MathUtils.clamp(wave * 0.22 + 0.5, 0, 1) ** 1.2;
          pixels.set([145 + heat * 110, 42 + heat * 143, 14 + heat * 45, 255], (y * 64 + x) * 4);
        }
      const texture = new THREE.DataTexture(pixels, 64, 64);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      texture.magFilter = texture.minFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      this.lava = texture;
      this.molten = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
    }
    return this.molten;
  }
  private ribbonAlong(
    points: number[][],
    width: number,
    material: THREE.Material,
    parent: THREE.Group,
    name: string,
  ) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
      segments = 84,
      vertices: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments,
        point = curve.getPointAt(u),
        tangent = curve.getTangentAt(u),
        normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize(),
        half = width * (0.54 + 0.46 * u) * 0.5;
      for (const side of [-1, 1])
        vertices.push(
          point.x + normal.x * half * side,
          point.y + 0.035,
          point.z + normal.z * half * side,
        );
      uvs.push(0, u * 3, 1, u * 3);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  }
  private lavaRibbon(points: number[][], width: number) {
    return this.ribbonAlong(points, width, this.moltenMaterial(), this.animated, 'volcanic-flow');
  }
  private jungleTree(parent: THREE.Group, scale: number, seed: number) {
    const trunk = this.part(
      parent,
      new THREE.CylinderGeometry(0.55, 0.95, 1, 7),
      seed % 2 ? '#6b4f36' : '#5d4430',
      [0, 2.8 * scale, 0],
      [1, 5.6 * scale, 1],
    );
    trunk.rotation.z = Math.sin(seed * 1.7) * 0.07;
    const greens = ['#2f6d47', '#3c7d4f', '#4f8f55'];
    for (let lobe = 0; lobe < 4; lobe++) {
      const canopy = this.oval(
        parent,
        greens[(Math.round(seed) + lobe) % greens.length],
        [
          Math.sin(seed + lobe * 2.1) * 2.2 * scale,
          (5.3 + lobe * 0.55) * scale,
          Math.cos(seed + lobe * 1.7) * 2.2 * scale,
        ],
        [3.2 * scale, 1.5 * scale, 3.2 * scale],
      );
      canopy.rotation.y = seed + lobe;
    }
    for (let vine = 0; vine < 2; vine++)
      this.part(
        parent,
        new THREE.CylinderGeometry(0.06, 0.09, 1, 4),
        '#6f8f4e',
        [
          Math.sin(seed + vine * 2.4) * 2.3 * scale,
          (3.5 - vine * 0.7) * scale,
          Math.cos(seed + vine * 1.9) * 2.2 * scale,
        ],
        [1, (2.5 - vine * 0.5) * scale, 1],
      );
  }
  private jungleVolcano() {
    const volcano = new THREE.Group();
    volcano.name = 'jungle-volcano';
    this.group.add(volcano);
    this.footprints.push({ x: 0, z: 0, radius: 44, kind: 'volcano' });
    // One tapered cone, warped by hand so every flank reads as stacked basalt.
    const cone = new THREE.CylinderGeometry(0.23, 1, 1, 13, 6),
      positions = cone.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const height = positions.getY(i) + 0.5,
        angle = Math.atan2(positions.getZ(i), positions.getX(i)),
        warp =
          1 + Math.sin(angle * 3 + height * 7) * 0.055 + Math.sin(angle * 5 - height * 3) * 0.025;
      positions.setX(i, positions.getX(i) * warp);
      positions.setZ(i, positions.getZ(i) * warp);
    }
    cone.computeVertexNormals();
    this.part(volcano, cone, '#4a3a31', [0, 30, 0], [40, 60, 40]);
    for (const [y, radius, color] of [
      [8, 38.4, '#5b4436'],
      [19, 31.8, '#3b312c'],
      [31, 24.3, '#5b4436'],
      [44, 16.4, '#3b312c'],
    ] as const)
      this.part(
        volcano,
        new THREE.CylinderGeometry(1, 1, 1, 13),
        color,
        [0, y, 0],
        [radius, 1.05, radius],
      );
    // Moss and ash streaks break up the flanks.
    for (let patch = 0; patch < 9; patch++) {
      const angle = patch * 2.4,
        radius = 24 + (patch % 3) * 4;
      this.oval(
        volcano,
        patch % 2 ? '#4d6a3a' : '#6b7c52',
        [Math.sin(angle) * radius, 8 + (patch % 4) * 9, Math.cos(angle) * radius],
        [3 + (patch % 3), 1.5, 2.4],
      );
    }
    // Crater rim, dark throat and the glowing pool at the summit.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(9.2, 1.4, 7, 18), this.material('#332824'));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 60;
    volcano.add(rim);
    this.part(
      volcano,
      new THREE.CylinderGeometry(1, 1, 1, 15),
      '#221b18',
      [0, 59.7, 0],
      [7.8, 1.3, 7.8],
    );
    const summit = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7.5, 0.55, 15),
      this.moltenMaterial(),
    );
    summit.name = 'summit-lava';
    summit.position.y = 60.25;
    this.animated.add(summit);
    const fountain = new THREE.Mesh(new THREE.ConeGeometry(3, 9, 9), this.moltenMaterial());
    fountain.name = 'summit-fountain';
    fountain.position.y = 64.5;
    this.animated.add(fountain);
    // The lava river follows the south-east flank, then crosses the infield.
    this.lavaRibbon(
      [
        [2, 59.6, 6],
        [8, 46, 17],
        [12, 34, 24],
        [17, 22, 27],
        [23, 10, 31],
        [30, 2.5, 38],
        [38, 0.4, 46],
        [44, 0.24, 52],
        [48, 0.2, 56],
      ],
      9,
    );
    this.lavaRibbon(
      [
        [30, 2.5, 38],
        [37, 0.9, 45],
        [42, 0.3, 57],
        [38, 0.22, 68],
      ],
      4.5,
    );
    const lake = new THREE.Mesh(
      new THREE.CylinderGeometry(12.4, 13.4, 0.55, 18),
      this.moltenMaterial(),
    );
    lake.name = 'lava-lake';
    lake.position.set(48, 0.2, 56);
    this.animated.add(lake);
    const lakeGlow = new THREE.Mesh(
      new THREE.CircleGeometry(20, 22),
      new THREE.MeshBasicMaterial({
        color: '#ff7a33',
        transparent: true,
        opacity: 0.17,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    lakeGlow.rotation.x = -Math.PI / 2;
    lakeGlow.position.set(48, 0.34, 56);
    this.animated.add(lakeGlow);
    this.footprints.push({ x: 48, z: 56, radius: 15, kind: 'lava-lake' });
    const shore = new THREE.Mesh(
      new THREE.TorusGeometry(13, 1.45, 6, 20),
      this.material('#332824'),
    );
    shore.rotation.x = Math.PI / 2;
    shore.position.set(48, 0.3, 56);
    this.group.add(shore);
    for (let rock = 0; rock < 12; rock++) {
      const angle = (rock / 12) * Math.PI * 2;
      this.part(
        volcano,
        new THREE.DodecahedronGeometry(1, 0),
        rock % 2 ? '#3b312c' : '#5b4436',
        [48 + Math.sin(angle) * 15.4, 0.5, 56 + Math.cos(angle) * 15.4],
        [1.3 + (rock % 3) * 0.4, 1 + (rock % 2) * 0.5, 1.2 + (rock % 3) * 0.3],
      );
    }
    for (let patch = 0; patch < 6; patch++) {
      const angle = patch * 1.1,
        distance = 22 + (patch % 3) * 4,
        scorched = new THREE.Mesh(
          new THREE.CircleGeometry(4 + (patch % 3) * 2, 10),
          this.material('#2f2a22'),
        );
      scorched.rotation.x = -Math.PI / 2;
      scorched.position.set(48 + Math.sin(angle) * distance, 0.05, 56 + Math.cos(angle) * distance);
      this.group.add(scorched);
    }
    for (let boulder = 0; boulder < 18; boulder++) {
      const angle = 2 + boulder * 0.28,
        distance = 46 + (boulder % 4) * 8;
      this.part(
        volcano,
        new THREE.DodecahedronGeometry(1, 0),
        boulder % 3 ? '#3b312c' : '#4d6a3a',
        [Math.sin(angle) * distance, 0.65, Math.cos(angle) * distance],
        [1 + (boulder % 4) * 0.45, 0.8 + (boulder % 3) * 0.4, 1 + (boulder % 3) * 0.35],
      );
    }
    for (let crack = 0; crack < 7; crack++) {
      const angle = 0.55 + crack * 0.42,
        distance = 43 + (crack % 3) * 5;
      this.box(
        volcano,
        crack % 2 ? '#d95d3c' : '#ff9347',
        [Math.sin(angle) * distance, 0.08, Math.cos(angle) * distance],
        [3.2, 0.1, 0.55],
        true,
      ).rotation.y = angle + Math.PI / 2;
    }
    // A basalt ramp launches the karts over a lava river crossing the main road.
    const rampStart = 0.509,
      rampEnd = 0.5205,
      rampPoints: number[][] = [];
    for (let step = 0; step <= 24; step++) {
      const p = this.track.at(rampStart + ((rampEnd - rampStart) * step) / 24);
      rampPoints.push([p.x, p.y + 0.06, p.z]);
    }
    this.ribbonAlong(
      rampPoints,
      this.track.width - 2,
      this.material('#5b4436'),
      this.group,
      'lava-ramp',
    );
    for (let plank = 0; plank < 7; plank++) {
      const t = rampStart + 0.001 + plank * 0.0015,
        p = this.track.at(t),
        tangent = this.track.tangent(t);
      this.box(
        this.group,
        plank % 2 ? '#3b312c' : '#e6d5a8',
        [p.x, p.y + 0.13, p.z],
        [this.track.width - 3, 0.05, 0.32],
        plank % 2 === 0,
      ).rotation.y = Math.atan2(tangent.x, tangent.z);
    }
    const lip = this.track.at(rampEnd),
      lipTangent = this.track.tangent(rampEnd);
    this.box(
      this.group,
      '#f6bd42',
      [lip.x, lip.y + 0.16, lip.z],
      [this.track.width - 2, 0.12, 0.55],
      true,
    ).rotation.y = Math.atan2(lipTangent.x, lipTangent.z);
    for (let step = 0; step <= 6; step++) {
      const t = rampStart + ((rampEnd - rampStart) * step) / 6,
        p = this.track.at(t),
        tangent = this.track.tangent(t),
        normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      for (const side of [-1, 1]) {
        const post = p.clone().addScaledVector(normal, side * (this.track.width / 2 + 0.7));
        this.box(this.group, '#3b312c', [post.x, p.y + 0.65, post.z], [0.24, 1.5, 0.24]);
        this.box(this.group, '#f6bd42', [post.x, p.y + 1.5, post.z], [0.32, 0.32, 0.32], true);
      }
    }
    const crossingT = 0.5255,
      crossing = this.track.at(crossingT),
      crossingTangent = this.track.tangent(crossingT).setY(0).normalize(),
      crossingNormal = new THREE.Vector3(crossingTangent.z, 0, -crossingTangent.x).normalize(),
      laterals = [-36, -27, -19, -12, -6, 0, 6, 12, 19, 27, 36];
    const crossingPoints = (along: number) =>
      laterals.map((lateral) => {
        const p = crossing
          .clone()
          .addScaledVector(crossingNormal, lateral)
          .addScaledVector(crossingTangent, along + Math.sin(lateral * 0.28) * 0.7);
        const roadY = crossing.y + lateral * this.track.bank(crossingT);
        if (Math.abs(lateral) <= this.track.width / 2) p.y = roadY + 0.07;
        else
          p.y =
            THREE.MathUtils.lerp(
              roadY,
              this.track.terrainHeight(p),
              Math.min(1, (Math.abs(lateral) - this.track.width / 2) / 16),
            ) + 0.07;
        return [p.x, p.y, p.z];
      });
    for (const side of [-1, 1])
      this.ribbonAlong(
        crossingPoints(side * 3.7),
        1.6,
        this.material('#332824'),
        this.group,
        'lava-bank',
      );
    this.lavaRibbon(crossingPoints(0), 5.2);
    for (let puff = 0; puff < 3; puff++) {
      const [x, y, z] = crossingPoints(0)[2 + puff * 3];
      this.drift(new THREE.Vector3(x, y + 0.55, z), true, puff / 3);
    }
    for (let puff = 0; puff < 4; puff++) {
      const angle = (puff / 4) * Math.PI * 2;
      this.drift(
        new THREE.Vector3(48 + Math.sin(angle) * 3.5, 0.9, 56 + Math.cos(angle) * 3.5),
        true,
        puff / 4,
      );
    }
    for (let puff = 0; puff < 5; puff++) this.drift(new THREE.Vector3(0, 61, 0), true, puff / 5);
    // Track-side groves and a ring of emergent trees inside the loop.
    for (let i = 0; i < 16; i++) {
      const grove = this.site(
        (i + 0.35) / 16,
        (i % 2 ? 1 : -1) * (24 + (i % 3) * 5),
        9,
        'jungle-grove',
      );
      this.jungleTree(grove, 1.05 + (i % 3) * 0.3, i * 1.7);
    }
    for (let i = 0; i < 9; i++) {
      const angle = 0.45 + (i / 9) * Math.PI * 2;
      if (angle > 0.3 && angle < 1.45) continue;
      const radius = 52 + (i % 3) * 10,
        root = new THREE.Group();
      root.name = 'jungle-emergent';
      root.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      this.group.add(root);
      this.jungleTree(root, 1.7 + (i % 3) * 0.35, i * 2.3);
      this.footprints.push({
        x: root.position.x,
        z: root.position.z,
        radius: 14,
        kind: 'jungle-emergent',
      });
    }
    for (let i = 0; i < 22; i++) {
      const fern = this.site(
        (i + 0.5) / 22,
        (i % 2 ? 1 : -1) * (18 + (i % 3) * 2),
        3.5,
        'jungle-fern',
      );
      for (let leaf = 0; leaf < 4; leaf++) {
        const blade = this.part(
          fern,
          new THREE.ConeGeometry(0.42, 2.3, 5),
          ['#3f814e', '#4f9b58', '#2f7045'][(i + leaf) % 3],
          [Math.sin(leaf * 2.2 + i) * 0.7, 0.9, Math.cos(leaf * 1.7 + i) * 0.7],
          [1, 1, 0.45],
        );
        blade.rotation.z = Math.sin(leaf * 2.2 + i) * 0.45;
      }
    }
  }
  private rocket(radius: number, height: number, speed: number, phase: number, color: string) {
    const rocket = new THREE.Group();
    rocket.name = 'space-rocket';
    const body = this.part(
      rocket,
      new THREE.CylinderGeometry(0.65, 0.9, 4.4, 10),
      color,
      [0, 0, 0],
      [1, 1, 1],
    );
    body.rotation.x = Math.PI / 2;
    const nose = this.part(
      rocket,
      new THREE.ConeGeometry(0.65, 1.5, 10),
      '#dfe8ff',
      [0, 0, 2.95],
      [1, 1, 1],
    );
    nose.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const fin = this.part(
        rocket,
        new THREE.BoxGeometry(1, 0.12, 1.1),
        color,
        [side * 0.75, 0, -1.55],
        [1, 1, 1],
      );
      fin.rotation.z = side * 0.35;
    }
    const flame = this.part(
      rocket,
      new THREE.ConeGeometry(0.45, 1.7, 9),
      '#ffb35c',
      [0, 0, -3.2],
      [1, 1, 1],
      true,
    );
    flame.rotation.x = -Math.PI / 2;
    rocket.position.set(Math.cos(phase) * radius, height, Math.sin(phase) * radius);
    rocket.rotation.y = -phase;
    rocket.scale.setScalar(2.4);
    this.animated.add(rocket);
    this.orbiters.push({ mesh: rocket, radius, height, speed, phase });
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
    this.houseUpdate?.(dt);
    if (this.water) this.water.offset.set(this.clock * 0.006, Math.sin(this.clock * 0.25) * 0.015);
    if (this.lava)
      this.lava.offset.set(Math.sin(this.clock * 0.35) * 0.06, (this.clock * 0.09) % 1);
    for (const orbiter of this.orbiters) {
      const angle = this.clock * orbiter.speed + orbiter.phase;
      orbiter.mesh.position.set(
        Math.cos(angle) * orbiter.radius,
        orbiter.height + Math.sin(angle * 2) * 2,
        Math.sin(angle) * orbiter.radius,
      );
      orbiter.mesh.rotation.y = -angle;
      orbiter.mesh.rotation.z = Math.sin(angle * 2) * 0.06;
    }
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
