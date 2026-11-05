import * as THREE from 'three';
import { trackDefinitions } from './config';
export type Route = 'main' | 'shortcut';
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
  kind: 'barrier' | 'rock' | 'crab';
  t: number;
  radius: number;
  pos: THREE.Vector3;
  offset: number;
}
const shortcutDefinitions = [
  { start: 0.13, end: 0.39, width: 5.2 },
  { start: 0.27, end: 0.44, width: 4.8 },
  { start: 0.27, end: 0.43, width: 5 },
];
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
    curve: THREE.CubicBezierCurve3;
    samples: THREE.Vector3[];
    length: number;
  };
  maxProgressRatio: number;
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
    this.samples = Array.from({ length: 512 }, (_, i) => this.at(i / 512));
    this.tangents = Array.from({ length: 512 }, (_, i) => this.tangent(i / 512));
    const spec = shortcutDefinitions[index],
      a = this.at(spec.start),
      b = this.at(spec.end),
      arc = (spec.end - spec.start) * this.length;
    const curve = new THREE.CubicBezierCurve3(
      a,
      a.clone().addScaledVector(this.tangent(spec.start), arc * 0.2),
      b.clone().addScaledVector(this.tangent(spec.end), -arc * 0.2),
      b,
    );
    this.shortcut = {
      ...spec,
      curve,
      length: curve.getLength(),
      samples: Array.from({ length: 129 }, (_, i) => curve.getPointAt(i / 128)),
    };
    this.maxProgressRatio = Math.max(1, arc / this.shortcut.length) * 1.25;
  }
  elevation(t: number) {
    const amplitude = [2.2, 3.4, 1.6][this.index];
    return 4 + amplitude * Math.sin(t * Math.PI * 2) + amplitude * 0.32 * Math.sin(t * Math.PI * 4);
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
    return this.shortcut.curve.getPointAt(u);
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
    const keepBranch =
      hint === 'shortcut' &&
      branch.u > 0.015 &&
      branch.u < 0.985 &&
      branch.distance < this.shortcut.width / 2 + 5;
    const chooseBranch =
      keepBranch ||
      (branch.distance < this.shortcut.width / 2 + 1 &&
        ((branch.distance < main.distance - 0.8 && main.distance > 1.2) ||
          main.distance > this.width / 2));
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
      height: chosen.center.y + chosen.lateral * bank,
      width: chooseBranch ? this.shortcut.width : this.width,
      bank,
    };
  }
  target(surface: Surface, distance: number, preferShortcut: boolean) {
    if (surface.route === 'shortcut')
      return this.routeAt('shortcut', surface.u + distance / this.shortcut.length);
    const target = surface.t + distance / this.length;
    if (preferShortcut && target > this.shortcut.start && target < this.shortcut.end)
      return this.routeAt(
        'shortcut',
        (target - this.shortcut.start) / (this.shortcut.end - this.shortcut.start),
      );
    return this.at(target);
  }
  createObstacle(): Obstacle {
    const t = [0.55, 0.7, 0.12][this.index];
    return {
      kind: (['barrier', 'rock', 'crab'] as const)[this.index],
      t,
      radius: [1.8, 1.6, 1.4][this.index],
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
