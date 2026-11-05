import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { characters, karts, trackDefinitions } from './config';
import { Race, Track } from './race';
import { RaceEffects } from './effects';
import { animateKart, react, type KartRig } from './animation';
import { scenery, obstacleModel } from './scenery';
import { createTerrainGeometry } from './terrain';
import { createRoadGeometry } from './road';
const mat = (color: THREE.ColorRepresentation) =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });
const materialCache = new Map<string, THREE.Material>();
function material(color: string) {
  if (!materialCache.has(color)) materialCache.set(color, mat(color));
  return materialCache.get(color)!;
}
function lampMaterial(color: string) {
  const key = `lamp:${color}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshBasicMaterial({ color }));
  return materialCache.get(key)!;
}
function mesh(geometry: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material(color));
  m.position.set(x, y, z);
  return m;
}
const box = new THREE.BoxGeometry(1, 1, 1),
  sphere = new THREE.IcosahedronGeometry(1, 1),
  wheel = new THREE.CylinderGeometry(0.43, 0.43, 0.35, 10);
// Bake immobile parts by material, reducing draw calls in every split-screen view.
// Called only on identity-root groups before attaching them to moving parents.
function batchStatic(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const batches = new Map<
    string,
    { material: THREE.Material; geometries: THREE.BufferGeometry[] }
  >();
  const originals: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    const key = object.material.uuid + Object.keys(geometry.attributes).sort().join(',');
    const batch: { material: THREE.Material; geometries: THREE.BufferGeometry[] } = batches.get(
      key,
    ) ?? { material: object.material, geometries: [] };
    batch.geometries.push(geometry);
    batches.set(key, batch);
    originals.push(object);
  });
  for (const object of originals) {
    object.removeFromParent();
    if (object.geometry !== box && object.geometry !== sphere && object.geometry !== wheel)
      object.geometry.dispose();
  }
  for (const batch of batches.values()) {
    const merged = mergeGeometries(batch.geometries);
    if (!merged) throw new Error('Incompatible procedural geometry batch');
    batch.geometries.forEach((geometry) => geometry.dispose());
    root.add(new THREE.Mesh(merged, batch.material));
  }
}
function block(parent: THREE.Object3D, color: string, size: number[], position: number[]) {
  const m = mesh(box, color, ...(position as [number, number, number]));
  m.scale.set(...(size as [number, number, number]));
  parent.add(m);
  return m;
}
export function makeKart(character: number, kart: number, id: number) {
  const group = new THREE.Group(),
    spec = karts[kart],
    c = characters[character];
  const driver = new THREE.Group();
  const rearLights = new THREE.Group(),
    rearLightMaterial = new THREE.MeshBasicMaterial({ color: '#842833' });
  const wheels: KartRig['wheels'] = [];
  block(group, spec.color, [1.65, 0.55, 2.6], [0, 0.65, 0]);
  block(group, '#233044', [1.1, 0.4, 0.85], [0, 0.95, -0.45]);
  block(group, spec.color, [1.9, 0.18, 0.3], [0, 0.7, -1.3]);
  block(group, '#273442', [1.65, 0.28, 0.12], [0, 0.67, 1.35]);
  block(group, '#15191e', [0.07, 0.32, 0.07], [0, 1.03, 0.75]).rotation.x = -0.4;
  for (const side of [-1, 1]) {
    block(group, '#273442', [0.47, 0.29, 0.1], [side * 0.58, 0.7, 1.43]);
    const front = new THREE.Mesh(box, lampMaterial('#fff1b8'));
    front.position.set(side * 0.58, 0.7, 1.5);
    front.scale.set(0.34, 0.2, 0.06);
    group.add(front);
    block(group, '#273442', [0.44, 0.26, 0.08], [side * 0.62, 0.7, -1.47]);
    const rear = new THREE.Mesh(box, rearLightMaterial);
    rear.position.set(side * 0.62, 0.7, -1.53);
    rear.scale.set(0.32, 0.16, 0.05);
    rearLights.add(rear);
  }
  for (const x of [-0.94, 0.94])
    for (const z of [-0.85, 0.85]) {
      const w = mesh(wheel, '#263247');
      w.rotation.z = Math.PI / 2;
      block(w, '#a6b6c1', [0.6, 0.025, 0.1], [0, x < 0 ? 0.19 : -0.19, 0]);
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.43, z);
      pivot.add(w);
      wheels.push({ pivot, wheel: w, front: z > 0 });
    }
  const head = mesh(sphere, c.color, 0, 1.8, 0);
  head.scale.set(0.63, 0.65, 0.55);
  driver.add(head);
  block(driver, c.color, [0.7, 0.6, 0.65], [0, 1.2, 0]);
  for (const x of [-0.23, 0.23]) {
    const eye = mesh(
      sphere,
      character === 1 ? '#fff0cb' : character === 3 ? '#8ebfa9' : '#152337',
      x,
      1.9,
      0.49,
    );
    eye.scale.set(0.085, 0.12, 0.07);
    driver.add(eye);
    if (character === 1 || character === 3) {
      const pupil = mesh(sphere, '#152337', x, 1.9, 0.55);
      pupil.scale.set(0.035, 0.08, 0.02);
      driver.add(pupil);
    }
  }
  {
    for (const x of [-0.4, 0.4]) {
      const pointed = character === 0 || character === 3;
      const ear = mesh(
        pointed ? new THREE.ConeGeometry(0.23, character === 3 ? 0.45 : 0.6, 4) : sphere,
        character === 2 ? '#263247' : c.color,
        x,
        2.35,
        0,
      );
      if (!pointed) ear.scale.set(0.2, character === 1 ? 0.65 : 0.2, 0.2);
      driver.add(ear);
      if (character === 1) {
        const inside = mesh(sphere, '#b18f9d', x, 2.47, 0.15);
        inside.scale.set(0.1, 0.44, 0.06);
        driver.add(inside);
      }
      if (character === 3) {
        const inside = mesh(new THREE.ConeGeometry(0.13, 0.27, 3), '#e6b8bd', x, 2.35, 0.15);
        inside.scale.z = 0.2;
        driver.add(inside);
      }
    }
  }
  if (character === 3) {
    const nose = mesh(sphere, '#d994a4', 0, 1.67, 0.56);
    nose.scale.set(0.09, 0.06, 0.045);
    driver.add(nose);
    for (const side of [-1, 1])
      for (const row of [-1, 0, 1]) {
        const whisker = block(
          driver,
          '#8b969c',
          [0.36, 0.018, 0.025],
          [side * 0.43, 1.67 + row * 0.09, 0.53],
        );
        whisker.rotation.z = side * row * 0.16;
      }
    const tail = mesh(
      new THREE.TorusGeometry(0.35, 0.09, 6, 12, Math.PI * 1.4),
      c.color,
      0.45,
      1.4,
      -0.5,
    );
    driver.add(tail);
  } else if (character === 1) {
    const nose = mesh(sphere, '#d994a4', 0, 1.67, 0.55);
    nose.scale.set(0.08, 0.055, 0.04);
    driver.add(nose);
    const tail = mesh(sphere, c.color, 0, 1.15, -0.48);
    tail.scale.setScalar(0.23);
    driver.add(tail);
  }
  const flag = mesh(
    new THREE.ConeGeometry(0.23, 0.5, 3),
    ['#ffd568', '#6ce1bf', '#f78b9e', '#bba1fc', '#ffffff', '#87bef2'][id],
    0,
    3.3,
    0,
  );
  flag.rotation.z = Math.PI;
  group.add(flag);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.3, 16),
    new THREE.MeshBasicMaterial({
      color: '#182330',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  batchStatic(group);
  batchStatic(driver);
  batchStatic(rearLights);
  const steering = mesh(new THREE.TorusGeometry(0.26, 0.045, 6, 16), '#15191e', 0, 1.22, 0.85);
  steering.rotation.x = -0.5;
  group.add(driver, steering, shadow, rearLights, ...wheels.map((w) => w.pivot));
  group.userData.rig = {
    driver,
    steering,
    rearLights,
    rearLightMaterial,
    shadow,
    wheels,
    wheelAngle: 0,
    reaction: null,
    age: 0,
  } satisfies KartRig;
  return group;
}
export function viewports(count: number, w: number, h: number) {
  if (count === 1) return [{ x: 0, y: 0, w, h }];
  if (count === 2)
    return [
      { x: 0, y: 0, w: w / 2, h },
      { x: w / 2, y: 0, w: w / 2, h },
    ];
  return Array.from({ length: 4 }, (_, i) => ({
    x: ((i % 2) * w) / 2,
    y: (Math.floor(i / 2) * h) / 2,
    w: w / 2,
    h: h / 2,
  }));
}
export class Renderer {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  world = new THREE.Group();
  cameras: THREE.PerspectiveCamera[] = [];
  kartMeshes: THREE.Group[] = [];
  shieldMeshes: THREE.Mesh[] = [];
  pickupMeshes: THREE.Group[] = [];
  hazardMeshes: THREE.Mesh[] = [];
  obstacleMeshes: THREE.Group[] = [];
  animatedScenery: THREE.Group[] = [];
  track: Track;
  race: Race | null = null;
  effects: RaceEffects | null = null;
  podium: { models: THREE.Group[]; camera: THREE.PerspectiveCamera } | null = null;
  width = innerWidth;
  height = innerHeight;
  time = 0;
  quality = 'auto';
  resolution = 1;
  reduced = false;
  fps = 60;
  frameCount = 0;
  frameTime = 0;
  adaptiveTime = 0;
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor('#b4dce9');
    this.scene.add(this.world);
    this.scene.add(new THREE.HemisphereLight('#fff8e7', '#6a786a', 2.5));
    const sun = new THREE.DirectionalLight('#ffffff', 2.3);
    sun.position.set(-40, 80, 35);
    this.scene.add(sun);
    this.track = new Track(0);
    this.buildWorld(this.track);
    this.resize();
  }
  resize() {
    this.width = innerWidth;
    this.height = innerHeight;
    const cap = this.quality === 'low' ? 1 : this.quality === 'high' ? 1.75 : 1.35;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, cap) * this.resolution);
    this.renderer.setSize(this.width, this.height);
  }
  setQuality(q: string, reduced: boolean) {
    this.quality = q;
    this.reduced = reduced;
    this.resolution = q === 'low' ? 0.8 : 1;
    this.resize();
  }
  clearWorld() {
    this.effects?.dispose();
    this.effects = null;
    this.podium = null;
    this.world.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose();
      if (o instanceof THREE.Mesh && ![box, sphere, wheel].includes(o.geometry))
        o.geometry.dispose();
      if (
        o instanceof THREE.Mesh &&
        ![...materialCache.values()].includes(o.material as THREE.Material)
      ) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
    this.world.clear();
    this.kartMeshes = [];
    this.shieldMeshes = [];
    this.pickupMeshes = [];
    this.hazardMeshes = [];
    this.obstacleMeshes = [];
    this.animatedScenery = [];
  }
  buildWorld(track: Track) {
    this.clearWorld();
    this.track = track;
    const def = trackDefinitions[track.index];
    this.scene.background = new THREE.Color(def.sky);
    this.scene.fog = new THREE.Fog(def.sky, 100, 260);
    const ground = mesh(
      new THREE.PlaneGeometry(1100, 1100),
      track.index === 2 ? '#5bb9cb' : def.ground,
      0,
      -0.18,
      0,
    );
    ground.rotation.x = -Math.PI / 2;
    this.world.add(ground);
    if (track.index === 2) {
      const island = mesh(new THREE.CylinderGeometry(108, 113, 0.3, 48), def.ground, 0, -0.18, 0);
      island.scale.z = 0.95;
      this.world.add(island);
    }
    const terrainGeometry = createTerrainGeometry(track);
    this.world.add(mesh(terrainGeometry, def.ground));
    const geo = createRoadGeometry(track);
    this.world.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
      ),
    );
    for (let i = 0; i < 70; i++) {
      const t = i / 70,
        p = track.at(t),
        tan = track.tangent(t),
        dash = mesh(box, '#d6d5c5', p.x, p.y + 0.04, p.z);
      dash.scale.set(0.15, 0.02, 1.8);
      dash.rotation.set(
        -Math.atan2(tan.y, Math.hypot(tan.x, tan.z)),
        Math.atan2(tan.x, tan.z),
        track.bank(t),
        'YXZ',
      );
      this.world.add(dash);
    }
    for (const t of [0, 0.17, 0.48, 0.79]) {
      const p = track.at(t),
        tan = track.tangent(t),
        g = new THREE.Group();
      g.position.copy(p);
      g.rotation.set(
        -Math.atan2(tan.y, Math.hypot(tan.x, tan.z)),
        Math.atan2(tan.x, tan.z),
        track.bank(t),
        'YXZ',
      );
      if (t === 0) {
        for (let x = 0; x < 12; x++)
          for (let z = 0; z < 2; z++)
            block(
              g,
              (x + z) % 2 ? '#fff6dc' : '#263345',
              [track.width / 12, 0.04, 1],
              [(x * track.width) / 12 - track.width / 2 + track.width / 24, 0.06, z],
            );
        for (const side of [-1, 1])
          block(g, '#f6bd42', [0.4, 6, 0.4], [side * (track.width / 2 + 1), 3, 0]);
        block(g, '#263345', [track.width + 3, 1, 0.5], [0, 6, 0]);
      } else {
        block(g, '#f8c658', [track.width - 1, 0.025, 4], [0, 0.06, 0]);
        for (const x of [-3, 0, 3]) {
          const arrow = mesh(new THREE.ConeGeometry(0.7, 1.5, 3), '#fff2be', x, 0.1, 0);
          arrow.rotation.x = Math.PI / 2;
          arrow.scale.z = 0.03;
          g.add(arrow);
        }
      }
      this.world.add(g);
    }
    // White chevrons identify raised crests; yellow remains reserved for turbos.
    for (const bump of track.bumps)
      for (const offset of [-4, -2, 0]) {
        const t = bump.t + offset / track.length,
          p = track.at(t),
          tangent = track.tangent(t),
          mark = new THREE.Group();
        mark.position.copy(p);
        mark.rotation.set(
          -Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z)),
          Math.atan2(tangent.x, tangent.z),
          track.bank(t),
          'YXZ',
        );
        for (const side of [-1, 1]) {
          const stripe = block(mark, '#f2eee0', [2.5, 0.025, 0.22], [side * 1, 0.06, 0]);
          stripe.rotation.y = side * 0.4;
        }
        this.world.add(mark);
      }
    // Deterministic decoration, kept outside the driving corridor.
    let seed = 231;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const treePositions: THREE.Matrix4[] = [];
    const rockPositions: THREE.Matrix4[] = [];
    for (let i = 0; i < 260; i++) {
      const p = new THREE.Vector3((random() - 0.5) * 260, 0, (random() - 0.5) * 240);
      const branchDistance = Math.min(
        ...track.shortcut.samples.map((s) => Math.hypot(p.x - s.x, p.z - s.z)),
      );
      if (
        track.nearest(p).distance < track.width / 2 + 5 ||
        branchDistance < track.shortcut.width / 2 + 4 ||
        p.length() > 130
      )
        continue;
      const s = 1 + random() * 2;
      p.y = track.terrainHeight(p);
      if (track.index === 1) {
        const matrix = new THREE.Matrix4().compose(
          p.clone().add(new THREE.Vector3(0, s * 2, 0)),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 6, 0.1)),
          new THREE.Vector3(s * 2, s * 3, s * 1.7),
        );
        rockPositions.push(matrix);
      } else if (track.index === 0) {
        treePositions.push(
          new THREE.Matrix4().compose(
            p.clone().add(new THREE.Vector3(0, s * 2.5, 0)),
            new THREE.Quaternion(),
            new THREE.Vector3(s * 1.5, s * 2.5, s * 1.5),
          ),
        );
        const trunk = mesh(
          new THREE.CylinderGeometry(0.22, 0.35, s * 2, 5),
          '#92704d',
          p.x,
          s + p.y,
          p.z,
        );
        this.world.add(trunk);
      }
    }
    if (treePositions.length) {
      const trees = new THREE.InstancedMesh(
        new THREE.ConeGeometry(1, 2, 6),
        material(track.index === 2 ? '#459b7b' : '#4e9363'),
        treePositions.length,
      );
      treePositions.forEach((m, i) => trees.setMatrixAt(i, m));
      this.world.add(trees);
    }
    if (rockPositions.length) {
      const rocks = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(1, 0),
        material('#b66f4b'),
        rockPositions.length,
      );
      rockPositions.forEach((m, i) => rocks.setMatrixAt(i, m));
      this.world.add(rocks);
    }
    for (let i = 0; i < 9; i++) {
      const hill = mesh(
        new THREE.ConeGeometry(22 + (i % 3) * 9, 25 + (i % 4) * 7, 6),
        track.index === 1 ? '#b87955' : track.index === 2 ? '#74afa4' : '#79a46f',
        Math.sin(i * 2.4) * 180,
        8,
        Math.cos(i * 2.4) * 170,
      );
      this.world.add(hill);
    }
    const decor = scenery(track);
    this.world.add(decor.group);
    this.animatedScenery = decor.moving;
    const obstacle = track.createObstacle();
    const branchBoost = new THREE.Group(),
      branchPoint = track.routeAt('shortcut', 0.5),
      branchTangent = track.routeTangent('shortcut', 0.5);
    branchBoost.position.copy(branchPoint);
    branchBoost.rotation.set(
      -Math.atan2(branchTangent.y, Math.hypot(branchTangent.x, branchTangent.z)),
      Math.atan2(branchTangent.x, branchTangent.z),
      0,
      'YXZ',
    );
    block(branchBoost, '#f8c658', [track.shortcut.width - 0.3, 0.04, 3], [0, 0.08, 0]);
    for (const z of [-0.8, 0, 0.8]) block(branchBoost, '#fff2be', [2, 0.05, 0.18], [0, 0.13, z]);
    this.world.add(branchBoost);
    for (const side of [-1, 1]) {
      const t = obstacle.t - 0.025,
        p = track.at(t),
        tan = track.tangent(t),
        sign = new THREE.Group();
      sign.position
        .copy(p)
        .addScaledVector(
          new THREE.Vector3(tan.z, 0, -tan.x).normalize(),
          side * (track.width / 2 + 1),
        );
      sign.rotation.y = Math.atan2(tan.x, tan.z);
      block(sign, '#3e5051', [0.12, 2.5, 0.12], [0, 1.25, 0]);
      const triangle = mesh(new THREE.ConeGeometry(0.85, 1.4, 3), '#f7cd71', 0, 2.8, 0);
      triangle.scale.z = 0.12;
      sign.add(triangle);
      block(sign, '#4b4b43', [0.13, 0.5, 0.15], [0, 2.8, 0.16]);
      block(sign, '#4b4b43', [0.14, 0.14, 0.16], [0, 2.4, 0.16]);
      this.world.add(sign);
    }
    batchStatic(this.world);
    this.world.add(...this.animatedScenery);
  }
  start(race: Race) {
    this.race = race;
    this.buildWorld(race.track);
    this.cameras = [];
    for (const r of race.racers) {
      const g = makeKart(r.config.character, r.config.kart, r.id);
      const shadow = (g.userData.rig as KartRig).shadow;
      this.world.add(shadow);
      shadow.position.copy(r.pos);
      shadow.position.y = r.groundHeight + 0.04;
      const shield = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.85, 1),
        new THREE.MeshBasicMaterial({
          color: '#9ae5f4',
          wireframe: true,
          transparent: true,
          opacity: 0.4,
        }),
      );
      shield.position.y = 1.1;
      shield.visible = false;
      g.add(shield);
      this.shieldMeshes.push(shield);
      this.world.add(g);
      this.kartMeshes.push(g);
      if (r.human) {
        const c = new THREE.PerspectiveCamera(64, 1, 0.1, 400);
        c.position
          .copy(r.pos)
          .add(new THREE.Vector3(-Math.sin(r.heading) * 9, 6, -Math.cos(r.heading) * 9));
        this.cameras.push(c);
      }
    }
    for (const pickup of race.pickups) {
      const g = new THREE.Group();
      const cube = mesh(box, '#b6a1f8', 0, 1.4, 0);
      cube.scale.setScalar(1.45);
      g.add(cube);
      for (const side of [0, 1]) {
        const ribbon = mesh(box, '#fff1c4', 0, 1.4, 0);
        ribbon.scale.set(side ? 0.22 : 1.5, 1.5, side ? 1.5 : 0.22);
        g.add(ribbon);
      }
      batchStatic(g);
      g.position.copy(pickup.pos);
      this.world.add(g);
      this.pickupMeshes.push(g);
    }
    this.effects = new RaceEffects(race.racers.length);
    this.world.add(this.effects.root);
    this.obstacleMeshes = race.obstacles.map((obstacle) => {
      const model = obstacleModel(obstacle);
      batchStatic(model);
      this.world.add(model);
      return model;
    });
    this.resolution =
      this.quality === 'low' || race.racers.filter((r) => r.human).length > 2
        ? 0.8
        : matchMedia('(pointer: coarse)').matches
          ? 0.85
          : 1;
    this.resize();
  }
  render(dt: number, alpha: number, effectsDt = dt) {
    this.time += dt;
    this.frameTime += dt;
    this.frameCount++;
    if (this.frameTime > 1) {
      this.fps = this.frameCount / this.frameTime;
      this.frameTime = 0;
      this.frameCount = 0;
    }
    this.adaptiveTime += dt;
    if (this.quality === 'auto' && this.adaptiveTime > 4) {
      this.adaptiveTime = 0;
      const next =
        this.fps < 28
          ? Math.max(0.55, this.resolution - 0.1)
          : this.fps > 55
            ? Math.min(1, this.resolution + 0.05)
            : this.resolution;
      if (next !== this.resolution) {
        this.resolution = next;
        this.resize();
      }
    }
    const race = this.race;
    if (race) {
      race.obstacles.forEach((obstacle, i) => {
        const model = this.obstacleMeshes[i];
        model.position.copy(obstacle.pos);
        model.rotation.y = Math.atan2(
          race.track.tangent(obstacle.t).x,
          race.track.tangent(obstacle.t).z,
        );
        if (obstacle.kind === 'rock') {
          model.position.y += 1.6;
          model.rotation.z = race.elapsed * 1.4;
        }
      });
      this.effects?.update(effectsDt, race.racers, this.reduced);
      for (const r of race.racers) {
        const g = this.kartMeshes[r.id];
        g.position.lerpVectors(r.previous, r.pos, alpha);
        g.rotation.set(
          r.airborne
            ? THREE.MathUtils.clamp(
                -Math.atan2(r.verticalSpeed, Math.max(8, Math.abs(r.speed))) * 0.7,
                -0.28,
                0.28,
              )
            : r.pitch,
          r.heading,
          r.roll,
          'YXZ',
        );
        animateKart(g.userData.rig, effectsDt, r.speed, r.steering, this.reduced, r.braking);
        this.shieldMeshes[r.id].visible = r.shield > 0;
        this.shieldMeshes[r.id].rotation.y = this.reduced ? 0 : this.time * 0.5;
        g.visible = this.reduced || r.immune <= 0 || Math.sin(this.time * 24) > -0.35;
        g.scale.setScalar(r.shield > 0 ? 1.04 : 1);
        if (!this.reduced && r.landingTime > 0)
          g.scale.y *= 1 - 0.12 * Math.sin((r.landingTime / 0.28) * Math.PI);
        const rig = g.userData.rig as KartRig;
        rig.shadow.position.set(g.position.x, r.groundHeight + 0.04, g.position.z);
        rig.shadow.scale.setScalar(1 / (1 + Math.max(0, r.pos.y - r.groundHeight) * 0.08));
        rig.shadow.material.opacity = 0.22 / (1 + Math.max(0, r.pos.y - r.groundHeight) * 0.2);
        g.position.y += r.boost > 0 && !this.reduced ? Math.sin(this.time * 30) * 0.025 : 0;
      }
      race.pickups.forEach((p, i) => {
        const g = this.pickupMeshes[i];
        g.visible = p.cooldown <= 0;
        g.rotation.y = this.reduced ? 0 : this.time;
        g.position.y = p.pos.y + (this.reduced ? 0 : Math.sin(this.time * 2 + i) * 0.2);
      });
      while (this.hazardMeshes.length < race.hazards.length) {
        const m = mesh(sphere, '#f27491');
        this.hazardMeshes.push(m);
        this.world.add(m);
      }
      this.hazardMeshes.forEach((m, i) => {
        const h = race.hazards[i];
        m.visible = !!h;
        if (h) {
          m.position.copy(h.pos);
          m.position.y += h.kind === 'missile' ? 0.8 : 0.25;
          m.scale.set(
            h.kind === 'missile' ? 0.4 : 1,
            h.kind === 'missile' ? 0.4 : 0.25,
            h.kind === 'missile' ? 1 : 0.8,
          );
          m.rotation.y = Math.atan2(h.direction.x, h.direction.z);
        }
      });
    }
    for (const sails of this.animatedScenery)
      sails.rotation.z = this.reduced ? 0 : sails.rotation.z + (race ? effectsDt : dt) * 0.3;
    const count = race ? this.cameras.length : 1;
    let views = viewports(count, this.width, this.height);
    if (this.podium) {
      const rect = document.querySelector('#podium-view')?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0)
        views = [{ x: rect.left, y: rect.top, w: rect.width, h: rect.height }];
      this.renderer.setScissorTest(false);
      this.renderer.setClearColor('#b8d9e1');
      this.renderer.clear();
    }
    this.renderer.setScissorTest(true);
    for (let i = 0; i < views.length; i++) {
      const v = views[i];
      let camera = this.cameras[i];
      if (this.podium) {
        camera = this.podium.camera;
        for (const [rank, model] of this.podium.models.entries()) {
          animateKart(model.userData.rig, dt, 0, 0, this.reduced);
          model.rotation.y = this.reduced ? 0 : Math.sin(this.time * 1.3 + rank) * 0.1;
        }
        camera.position.set(6, 6, 11);
        camera.lookAt(0, 2.6, 0);
      } else if (!race) {
        camera = this.cameras[0] ?? new THREE.PerspectiveCamera(55, 1, 0.1, 500);
        this.cameras[0] = camera;
        camera.position.set(
          Math.sin(this.time * 0.025) * 115,
          100,
          Math.cos(this.time * 0.025) * 115,
        );
        camera.lookAt(0, 0, 0);
      } else if (!camera) continue;
      if (race) {
        const r = race.racers[i],
          target = new THREE.Vector3(
            r.pos.x - Math.sin(r.heading) * 9,
            r.pos.y + 6.3,
            r.pos.z - Math.cos(r.heading) * 9,
          );
        camera.position.lerp(target, 1 - Math.exp(-dt * 7));
        camera.lookAt(
          r.pos.x + Math.sin(r.heading) * 6,
          r.pos.y + 1,
          r.pos.z + Math.cos(r.heading) * 6,
        );
        const targetFov = r.boost > 0 && !r.finished && !this.reduced ? 71 : 64;
        camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-effectsDt * 5));
      }
      camera.aspect = v.w / v.h;
      camera.updateProjectionMatrix();
      this.renderer.setViewport(v.x, this.height - v.y - v.h, v.w, v.h);
      this.renderer.setScissor(v.x, this.height - v.y - v.h, v.w, v.h);
      this.renderer.clear();
      this.renderer.render(this.scene, camera);
    }
    this.renderer.setScissorTest(false);
  }
  menu(track = 0) {
    this.race = null;
    this.cameras = [];
    this.buildWorld(new Track(track));
  }
  react(kind: string, id: number) {
    const rig = this.kartMeshes[id]?.userData.rig as KartRig | undefined;
    if (rig) react(rig, kind);
  }
  showPodium(race: Race) {
    this.clearWorld();
    this.race = null;
    this.cameras = [];
    this.scene.background = new THREE.Color('#b8d9e1');
    this.scene.fog = new THREE.Fog('#b8d9e1', 60, 160);
    const floor = mesh(new THREE.CylinderGeometry(13, 14, 0.5, 32), '#709d88', 0, -0.3, 0);
    this.world.add(floor);
    const models: THREE.Group[] = [];
    const places = [
      { x: 0, h: 3.2, color: '#e9b94d' },
      { x: -4, h: 2, color: '#bbcbd5' },
      { x: 4, h: 1.2, color: '#c98b60' },
    ];
    for (const [rank, racer] of race.ranking.slice(0, 3).entries()) {
      const place = places[rank];
      block(this.world, place.color, [3.5, place.h, 3.4], [place.x, place.h / 2, 0]);
      // Readable 3D rank numerals built from simple segments, no font/texture downloads.
      const digits = [
        [1, 2],
        [0, 1, 6, 4, 3],
        [0, 1, 6, 2, 3],
      ][rank];
      const segments = [
        [0, 0.5],
        [0.3, 0.25],
        [0.3, -0.25],
        [0, -0.5],
        [-0.3, -0.25],
        [-0.3, 0.25],
        [0, 0],
      ];
      for (const segment of digits) {
        const [x, y] = segments[segment];
        block(
          this.world,
          '#fff4d0',
          segment === 0 || segment === 3 || segment === 6 ? [0.6, 0.1, 0.04] : [0.1, 0.4, 0.04],
          [place.x + x, place.h * 0.5 + y, 1.73],
        );
      }
      const model = makeKart(racer.config.character, racer.config.kart, racer.id);
      model.userData.racerId = racer.id;
      model.position.set(place.x, place.h, 0);
      model.scale.setScalar(0.85);
      react(model.userData.rig, 'finish');
      models.push(model);
    }
    batchStatic(this.world);
    this.world.add(...models);
    this.podium = { models, camera: new THREE.PerspectiveCamera(36, 1, 0.1, 200) };
  }
}
