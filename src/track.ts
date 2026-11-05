import * as THREE from 'three';
import { trackDefinitions } from './config';
export type Route = 'main' | 'shortcut';
/** Use the real racing curve for every destination card. */
export function trackPreviewPath(index: number) {
  const curve = new THREE.CatmullRomCurve3(
    trackDefinitions[index].points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.3,
  );
  return (
    curve
      .getPoints(100)
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${(110 + p.x * 0.95).toFixed(1)} ${(72.5 + p.z * 0.65).toFixed(1)}`,
      )
      .join(' ') + ' Z'
  );
}
export interface Surface {
  route: Route;
  t: number;
  u: number;
  distance: number;
  lateral: number;
  center: THREE.Vector3;
  height: number;
  width: number;
  tangent: THREE.Vector3;
  bank: number;
}
export interface Obstacle {
  kind: 'barrier' | 'rock' | 'crab' | 'snowball';
  t: number;
  radius: number;
  pos: THREE.Vector3;
  offset: number;
}
const shortcutDefinitions = [
  { start: 0.08, end: 0.42, width: 5.2 },
  { start: 0.27, end: 0.44, width: 4.8 },
  { start: 0.27, end: 0.43, width: 5 },
  { start: 0.26, end: 0.44, width: 5 },
  { start: 0.26, end: 0.45, width: 5.2 },
];
export class ShortcutCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private base: THREE.CubicBezierCurve3,
    private inward: THREE.Vector3,
    private depth: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    this.base.getPoint(t, target);
    return target.addScaledVector(this.inward, Math.sin(t * Math.PI) ** 2 * this.depth);
  }
}
function projection(samples: THREE.Vector3[], closed: boolean, p: THREE.Vector3) {
  let best = Infinity,
    index = 0,
    fraction = 0;
  const count = closed ? samples.length : samples.length - 1;
  for (let i = 0; i < count; i++) {
    const a = samples[i],
      b = samples[(i + 1) % samples.length],
      dx = b.x - a.x,
      dz = b.z - a.z;
    const u = THREE.MathUtils.clamp(
      ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
      0,
      1,
    );
    const distance = (p.x - a.x - dx * u) ** 2 + (p.z - a.z - dz * u) ** 2;
    if (distance < best) {
      best = distance;
      index = i;
      fraction = u;
    }
  }
  const a = samples[index],
    b = samples[(index + 1) % samples.length],
    tangent = b.clone().sub(a).normalize(),
    center = a.clone().lerp(b, fraction);
  const norm = Math.hypot(tangent.x, tangent.z);
  return {
    u: (index + fraction) / count,
    distance: Math.sqrt(best),
    center,
    tangent,
    lateral: ((p.x - center.x) * tangent.z - (p.z - center.z) * tangent.x) / norm,
  };
}
export class Track {
  curve: THREE.CatmullRomCurve3;
  samples: THREE.Vector3[];
  tangents: THREE.Vector3[];
  length: number;
  width: number;
  shortcut: {
    start: number;
    end: number;
    width: number;
    curve: THREE.Curve<THREE.Vector3>;
    samples: THREE.Vector3[];
    length: number;
    entryEndT: number;
  };
  maxProgressRatio: number;
  bumps: { t: number; height: number; halfLength: number }[] = [];
  constructor(public index: number) {
    const d = trackDefinitions[index];
    this.width = d.width;
    this.curve = new THREE.CatmullRomCurve3(
      d.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      true,
      'catmullrom',
      0.3,
    );
    this.length = this.curve.getLength();
    this.bumps = [
      [0.68, 0.87],
      [0.1, 0.83],
      [0.18, 0.62],
      [0.12, 0.77],
      [0.14, 0.71],
    ][index].map((t) => ({ t, height: [2.2, 2.6, 2, 2.8, 1.8][index], halfLength: 10 }));
    this.samples = Array.from({ length: 512 }, (_, i) => this.at(i / 512));
    this.tangents = Array.from({ length: 512 }, (_, i) => this.tangent(i / 512));
    const spec = shortcutDefinitions[index],
      a = this.at(spec.start),
      b = this.at(spec.end),
      arc = (spec.end - spec.start) * this.length;
    const base = new THREE.CubicBezierCurve3(
      a,
      a.clone().addScaledVector(this.tangent(spec.start), arc * 0.2),
      b.clone().addScaledVector(this.tangent(spec.end), -arc * 0.2),
      b,
    );
    const inward = a
      .clone()
      .lerp(b, 0.5)
      .sub(this.at((spec.start + spec.end) / 2));
    inward.y = 0;
    inward.normalize();
    const curve = new ShortcutCurve(base, inward, [12, 20, 12, 18, 24][index]);
    const shortcutSegments = index >= 3 ? 256 : 128;
    this.shortcut = {
      ...spec,
      curve,
      length: curve.getLength(),
      samples: Array.from({ length: shortcutSegments + 1 }, (_, i) =>
        curve.getPointAt(i / shortcutSegments),
      ),
      entryEndT: spec.start + 0.025,
    };
    this.shortcut.samples = Array.from({ length: shortcutSegments + 1 }, (_, i) =>
      this.routeAt('shortcut', i / shortcutSegments),
    );
    const detached = this.shortcut.samples.find(
      (p) => this.nearest(p).distance > this.width / 2 + 0.3,
    );
    if (detached)
      this.shortcut.entryEndT = Math.max(spec.start + 0.025, this.nearest(detached).t + 0.015);
    this.maxProgressRatio = Math.max(1, arc / this.shortcut.length) * 1.25;
  }
  elevation(t: number) {
    return this.baseElevation(t) + this.bumpHeight(t);
  }
  baseElevation(t: number) {
    const amplitude = [4.5, 6.2, 3.7, 7.2, 2.5][this.index];
    return (
      (this.index === 3 ? 12 : 8) +
      amplitude * Math.sin(t * Math.PI * 2) +
      amplitude * 0.32 * Math.sin(t * Math.PI * 4)
    );
  }
  bumpHeight(t: number) {
    let height = 0;
    for (const bump of this.bumps) {
      const delta =
        (Math.abs(
          Math.atan2(Math.sin((t - bump.t) * Math.PI * 2), Math.cos((t - bump.t) * Math.PI * 2)),
        ) /
          (Math.PI * 2)) *
        this.length;
      if (delta < bump.halfLength)
        height += bump.height * (1 + Math.cos((delta / bump.halfLength) * Math.PI)) * 0.5;
    }
    return height;
  }
  crossesBump(from: number, to: number) {
    const forward = (to - from + 1) % 1;
    return (
      forward > 0 &&
      forward < 0.08 &&
      this.bumps.some((b) => {
        const d = (b.t - from + 1) % 1;
        return d > 0 && d <= forward;
      })
    );
  }
  terrainHeight(p: THREE.Vector3) {
    if (this.index === 2 && Math.hypot(p.x, p.z) > 108) return -0.8;
    const main = this.nearest(p),
      branch = projection(this.shortcut.samples, false, p);
    const useBranch = branch.distance - this.shortcut.width / 2 < main.distance - this.width / 2;
    const distance = useBranch ? branch.distance : main.distance,
      width = useBranch ? this.shortcut.width : this.width;
    const height = useBranch ? branch.center.y : this.baseElevation(main.t);
    let terrain =
      Math.max(0, height - 0.65) * Math.exp(-((Math.max(0, distance - width / 2) / 28) ** 2));
    // Carve beneath both corridors, not just the nearest one. A grid cell at a
    // merge must never fill the lower road with the neighbouring hill's height.
    if (main.distance < this.width / 2 + 6)
      terrain = Math.min(
        terrain,
        this.baseElevation(main.t) - (Math.abs(this.bank(main.t)) * this.width) / 2 - 0.65,
      );
    if (branch.distance < this.shortcut.width / 2 + 6)
      terrain = Math.min(terrain, branch.center.y - 0.65);
    return Math.max(-0.1, terrain);
  }
  bank(t: number) {
    return Math.sin(t * Math.PI * 4) * 0.035;
  }
  at(t: number) {
    const u = ((t % 1) + 1) % 1,
      p = this.curve.getPointAt(u);
    p.y = this.elevation(u);
    return p;
  }
  tangent(t: number) {
    return this.at(t + 0.0001)
      .sub(this.at(t - 0.0001))
      .normalize();
  }
  routeAt(route: Route, u: number) {
    if (route === 'main') return this.at(u);
    if (u < 0) return this.at(this.shortcut.start + (u * this.shortcut.length) / this.length);
    if (u > 1) return this.at(this.shortcut.end + ((u - 1) * this.shortcut.length) / this.length);
    const point = this.shortcut.curve.getPointAt(u),
      main = projection(this.samples, true, point);
    const merge =
      1 - THREE.MathUtils.smoothstep(main.distance, this.width / 2 + 0.5, this.width / 2 + 6);
    point.y = THREE.MathUtils.lerp(
      point.y,
      main.center.y + main.lateral * this.bank(main.u),
      merge,
    );
    return point;
  }
  overlapsRoad(p: THREE.Vector3, route: Route, margin = 0) {
    const projected =
      route === 'main'
        ? projection(this.samples, true, p)
        : projection(this.shortcut.samples, false, p);
    return projected.distance <= (route === 'main' ? this.width : this.shortcut.width) / 2 + margin;
  }
  routeTangent(route: Route, u: number) {
    return this.routeAt(route, u + 0.0001)
      .sub(this.routeAt(route, u - 0.0001))
      .normalize();
  }
  nearest(p: THREE.Vector3) {
    let index = 0,
      distance = Infinity;
    for (let i = 0; i < 512; i++) {
      const a = this.samples[i],
        d = (p.x - a.x) ** 2 + (p.z - a.z) ** 2;
      if (d < distance) {
        distance = d;
        index = i;
      }
    }
    return { index, t: index / 512, distance: Math.sqrt(distance) };
  }
  surface(p: THREE.Vector3, hint: Route = 'main'): Surface {
    const main = projection(this.samples, true, p),
      branch = projection(this.shortcut.samples, false, p);
    const onMain = main.distance <= this.width / 2 + 0.05;
    const onBranch = branch.distance <= this.shortcut.width / 2 + 0.05;
    // A junction is the union of both paved surfaces. Never clamp a kart that is
    // still on the main road against the narrower shortcut's invisible boundary.
    const keepBranch = hint === 'shortcut' && onBranch && branch.u > 0.015 && branch.u < 0.985;
    const chooseBranch =
      keepBranch ||
      (!onMain &&
        (onBranch || branch.distance - this.shortcut.width / 2 < main.distance - this.width / 2));
    const chosen = chooseBranch ? branch : main,
      route = chooseBranch ? 'shortcut' : 'main';
    const t = chooseBranch
      ? this.shortcut.start + branch.u * (this.shortcut.end - this.shortcut.start)
      : main.u;
    const bank = chooseBranch ? 0 : this.bank(t);
    return {
      ...chosen,
      route,
      t,
      height:
        chosen.distance > (chooseBranch ? this.shortcut.width : this.width) / 2
          ? this.terrainHeight(p)
          : chosen.center.y + chosen.lateral * bank,
      width: chooseBranch ? this.shortcut.width : this.width,
      bank,
    };
  }
  target(surface: Surface, distance: number, preferShortcut: boolean) {
    if (surface.route === 'shortcut')
      return this.routeAt('shortcut', surface.u + distance / this.shortcut.length);
    const target = surface.t + distance / this.length;
    // A missed entry must stay on the main road, never aim across the gap mid-corner.
    if (
      preferShortcut &&
      surface.t < this.shortcut.entryEndT &&
      target > this.shortcut.start &&
      target < this.shortcut.end
    )
      return this.routeAt(
        'shortcut',
        (target - this.shortcut.start) / (this.shortcut.end - this.shortcut.start),
      );
    return this.at(target);
  }
  createObstacle(): Obstacle {
    const t = [0.55, 0.7, 0.12, 0.56, 0.58][this.index];
    return {
      kind: (['barrier', 'rock', 'crab', 'snowball', 'barrier'] as const)[this.index],
      t,
      radius: [1.8, 1.6, 1.4, 1.6, 1.8][this.index],
      pos: this.at(t),
      offset: 0,
    };
  }
  moveObstacle(obstacle: Obstacle, time: number) {
    const tangent = this.tangent(obstacle.t);
    obstacle.offset = Math.sin(time * 0.8 + this.index) * this.width * 0.34;
    obstacle.pos
      .copy(this.at(obstacle.t))
      .addScaledVector(new THREE.Vector3(tangent.z, 0, -tangent.x).normalize(), obstacle.offset);
    obstacle.pos.y = this.elevation(obstacle.t) + this.bank(obstacle.t) * obstacle.offset;
  }
}
