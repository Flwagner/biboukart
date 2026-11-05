import * as THREE from 'three';
import { karts, difficulties, type Difficulty, type Item, type PlayerConfig } from './config';
import { Track, type Route, type Obstacle } from './track';
export { Track } from './track';
export interface Input {
  throttle: number;
  brake: number;
  steer: number; // -1 = driver-left, +1 = driver-right, for every controller and the AI.
  use: boolean;
}
export const idleInput = (): Input => ({ throttle: 0, brake: 0, steer: 0, use: false });
export interface Racer {
  id: number;
  human: boolean;
  config: PlayerConfig;
  pos: THREE.Vector3;
  previous: THREE.Vector3;
  heading: number;
  speed: number;
  steering: number;
  route: Route;
  pitch: number;
  roll: number;
  shortcutPasses: number;
  shortcutVisitLap: number;
  shortcutCountLap: number;
  progress: number;
  lastT: number;
  checkpoint: number;
  lap: number;
  finished: boolean;
  finishTime: number;
  item: Item | null;
  boost: number;
  shield: number;
  immune: number;
  slow: number;
  itemCooldown: number;
  stuck: number;
  wrongWay: boolean;
}
export interface Pickup {
  t: number;
  pos: THREE.Vector3;
  cooldown: number;
}
export interface Hazard {
  kind: 'missile' | 'trap';
  owner: number;
  pos: THREE.Vector3;
  direction: THREE.Vector3;
  ttl: number;
}
export class Race {
  track: Track;
  racers: Racer[] = [];
  pickups: Pickup[] = [];
  hazards: Hazard[] = [];
  obstacles: Obstacle[] = [];
  boosts: number[] = [0.17, 0.48, 0.79];
  elapsed = 0;
  countdown = 3.5;
  finished = false;
  finishDeadline = Infinity;
  seed = 12345;
  onEvent: (kind: string, racer: number, item?: Item) => void = () => {};
  constructor(
    track: number,
    players: PlayerConfig[],
    public difficulty: Difficulty = 'normal',
  ) {
    this.track = new Track(track);
    this.obstacles = [this.track.createObstacle()];
    for (let i = 0; i < 6; i++) {
      const t = 1 - (3 + Math.floor(i / 2) * 5) / this.track.length,
        tangent = this.track.tangent(t),
        p = this.track.at(t);
      p.addScaledVector(new THREE.Vector3(tangent.z, 0, -tangent.x), i % 2 === 0 ? -2.5 : 2.5);
      this.racers.push({
        id: i,
        human: i < players.length,
        config: players[i] ?? { character: i % 4, kart: i % 4, device: 'bot' },
        pos: p,
        previous: p.clone(),
        heading: Math.atan2(tangent.x, tangent.z),
        speed: 0,
        steering: 0,
        route: 'main',
        pitch: 0,
        roll: 0,
        shortcutPasses: 0,
        shortcutVisitLap: -1,
        shortcutCountLap: -1,
        progress: t - 1,
        lastT: t,
        checkpoint: 0,
        lap: 0,
        finished: false,
        finishTime: 0,
        item: null,
        boost: 0,
        shield: 0,
        immune: 0,
        slow: 0,
        itemCooldown: 0,
        stuck: 0,
        wrongWay: false,
      });
    }
    for (const t of [0.09, 0.32, 0.61, 0.9])
      for (const side of [-3, 3]) {
        const p = this.track.at(t),
          tangent = this.track.tangent(t);
        p.addScaledVector(new THREE.Vector3(tangent.z, 0, -tangent.x), side);
        this.pickups.push({ t, pos: p, cooldown: 0 });
      }
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  get ranking() {
    return [...this.racers].sort((a, b) =>
      a.finished && b.finished
        ? a.finishTime - b.finishTime
        : a.finished
          ? -1
          : b.finished
            ? 1
            : b.progress - a.progress,
    );
  }
  chooseItem(rank: number): Item {
    const pool: Item[] =
      rank < 2
        ? ['shield', 'trap', 'missile', 'turbo']
        : ['turbo', 'missile', 'turbo', 'shield', 'trap'];
    return pool[Math.floor(this.random() * pool.length)];
  }
  ai(
    r: Racer,
    preferShortcut = this.difficulty === 'hard' || (this.difficulty === 'normal' && r.id % 3 === 0),
  ): Input {
    const profile = difficulties[this.difficulty],
      spec = karts[r.config.kart];
    const n = this.track.surface(r.pos, r.route),
      lookAhead =
        n.route === 'shortcut'
          ? 7 + Math.abs(r.speed) * 0.35
          : profile.lookAhead + Math.abs(r.speed) * profile.speedLook,
      target = this.track.target(n, lookAhead, preferShortcut);
    for (const obstacle of this.obstacles) {
      const ahead = ((obstacle.t - n.t + 1) % 1) * this.track.length;
      if (n.route === 'main' && ahead < profile.obstacleLook) {
        const tangent = this.track.tangent(n.t);
        const offset =
          this.difficulty === 'hard'
            ? Math.sin((this.elapsed + ahead / Math.max(8, r.speed)) * 0.8 + this.track.index) *
              this.track.width *
              0.34
            : obstacle.offset;
        target.addScaledVector(
          new THREE.Vector3(tangent.z, 0, -tangent.x).normalize(),
          (offset >= 0 ? -1 : 1) * 4.3,
        );
      }
    }
    const angle = wrap(Math.atan2(target.x - r.pos.x, target.z - r.pos.z) - r.heading);
    // Pure pursuit: requested yaw follows curvature, using the kart's real steering limits.
    let steer =
      Math.abs(r.speed) > 5
        ? (2 * Math.abs(r.speed) * Math.sin(angle) * profile.precision) /
          (lookAhead * spec.handling)
        : angle * 1.5;
    for (const other of this.racers)
      if (other !== r) {
        const delta = other.pos.clone().sub(r.pos);
        const ahead = delta.dot(new THREE.Vector3(Math.sin(r.heading), 0, Math.cos(r.heading)));
        if (ahead > 0 && ahead < 7 && delta.length() < 6)
          steer +=
            Math.sign(delta.dot(new THREE.Vector3(Math.cos(r.heading), 0, -Math.sin(r.heading)))) *
            -0.35;
      }
    const desiredSpeed =
      spec.speed *
      profile.speed *
      (r.boost > 0 ? 1.5 : 1) *
      (r.slow > 0 ? 0.5 : 1) *
      (Math.abs(angle) > 0.6 ? profile.cornerSpeed : 1);
    return {
      throttle: r.speed < desiredSpeed ? 1 : 0,
      brake:
        r.speed > desiredSpeed + 0.7
          ? THREE.MathUtils.clamp((r.speed - desiredSpeed) / 8, 0, 1)
          : 0,
      // Convert signed world-heading correction to the same steering convention as humans.
      steer: -THREE.MathUtils.clamp(steer, -1, 1),
      use: !!r.item && this.random() < profile.itemChance,
    };
  }
  hit(r: Racer) {
    if (r.immune > 0) return;
    if (r.shield > 0) {
      r.shield = 0;
      r.immune = 1;
      this.onEvent('block', r.id);
      return;
    }
    r.slow = 1.3;
    r.speed *= 0.45;
    r.immune = 2.2;
    this.onEvent('hit', r.id);
  }
  use(r: Racer) {
    if (!r.item || r.itemCooldown > 0) return;
    const item = r.item;
    r.item = null;
    r.itemCooldown = 0.4;
    this.onEvent('item', r.id, item);
    if (item === 'turbo') r.boost = Math.min(4, r.boost + 2.2);
    if (item === 'shield') r.shield = 7;
    if (item === 'missile' || item === 'trap') {
      const dir = new THREE.Vector3(Math.sin(r.heading), 0, Math.cos(r.heading));
      this.hazards.push({
        kind: item,
        owner: r.id,
        pos: r.pos.clone().addScaledVector(dir, item === 'trap' ? -3 : 3),
        direction: dir,
        ttl: item === 'trap' ? 14 : 4,
      });
    }
  }
  update(dt: number, inputs: Input[]) {
    if (this.finished) return;
    if (this.countdown > 0) {
      const previous = Math.ceil(Math.max(0, this.countdown - 0.5));
      this.countdown = Math.max(0, this.countdown - dt);
      const current = Math.ceil(Math.max(0, this.countdown - 0.5));
      if (current > 0 && current < previous) this.onEvent('countdown', -1);
      if (this.countdown === 0) this.onEvent('go', -1);
      return;
    }
    this.elapsed += dt;
    for (const obstacle of this.obstacles) this.track.moveObstacle(obstacle, this.elapsed);
    for (const box of this.pickups) box.cooldown = Math.max(0, box.cooldown - dt);
    for (const r of this.racers) {
      r.previous.copy(r.pos);
      for (const key of ['boost', 'shield', 'immune', 'slow', 'itemCooldown'] as const)
        r[key] = Math.max(0, r[key] - dt);
      if (r.finished) {
        r.speed *= Math.exp(-dt * 2);
        continue;
      }
      const input = r.human ? (inputs[r.id] ?? idleInput()) : this.ai(r),
        spec = karts[r.config.kart];
      r.steering = input.steer;
      if (input.use) this.use(r);
      const near = this.track.surface(r.pos, r.route),
        off = near.distance > near.width / 2;
      const max = spec.speed * (r.boost > 0 ? 1.5 : 1) * (r.slow > 0 ? 0.5 : 1) * (off ? 0.48 : 1);
      if (input.throttle > 0) r.speed += spec.acceleration * input.throttle * dt;
      if (input.brake > 0)
        r.speed -= dt * (r.speed > 1 ? 25 : spec.acceleration * 0.7) * input.brake;
      if (!input.throttle && !input.brake) r.speed *= Math.exp(-dt * 0.7);
      r.speed = THREE.MathUtils.clamp(r.speed, -7, max);
      // Forward is (sin(heading), 0, cos(heading)): increasing heading turns left.
      r.heading -=
        input.steer *
        spec.handling *
        Math.min(1, Math.abs(r.speed) / 9) *
        (r.speed < 0 ? -1 : 1) *
        dt;
      r.pos.x += Math.sin(r.heading) * r.speed * dt;
      r.pos.z += Math.cos(r.heading) * r.speed * dt;
      const n = this.track.surface(r.pos, r.route);
      if (n.distance > n.width / 2 + (n.route === 'shortcut' ? 1 : 3)) {
        const center = n.center,
          delta = r.pos.clone().sub(center);
        delta.y = 0;
        r.pos
          .copy(center)
          .addScaledVector(delta, (n.width / 2 + (n.route === 'shortcut' ? 1 : 3)) / n.distance);
        r.speed *= 0.93;
      }
      const routeLap = Math.floor(Math.max(0, r.progress));
      if (n.route === 'shortcut' && n.u > 0.2 && n.u < 0.8) r.shortcutVisitLap = routeLap;
      if (
        r.shortcutVisitLap === routeLap &&
        r.shortcutCountLap !== routeLap &&
        n.t >= this.track.shortcut.end - 0.015 &&
        n.t < this.track.shortcut.end + 0.05
      ) {
        r.shortcutPasses++;
        r.shortcutCountLap = routeLap;
      }
      r.route = n.route;
      r.pos.y = n.height;
      r.pitch = -Math.atan2(n.tangent.y, Math.hypot(n.tangent.x, n.tangent.z));
      r.roll = n.bank;
      let delta = n.t - r.lastT;
      if (delta < -0.5) delta += 1;
      if (delta > 0.5) delta -= 1;
      // Only local, physical movement can advance race progress.
      if (
        Math.abs(delta) * this.track.length <
        Math.abs(r.speed) * dt * this.track.maxProgressRatio + 2
      )
        r.progress += delta;
      r.lastT = n.t;
      const expected = (r.checkpoint + 1) / 8;
      if (r.progress >= expected && r.progress < expected + 0.12) r.checkpoint++;
      const previousLap = r.lap;
      r.lap = Math.min(3, Math.floor(r.checkpoint / 8));
      if (r.lap === 2 && previousLap < 2) this.onEvent('lastlap', r.id);
      r.wrongWay = delta < -0.00015 && r.speed > 3;
      if (r.checkpoint >= 24) {
        r.finished = true;
        r.finishTime = this.elapsed;
        this.onEvent('finish', r.id);
        if (r.human) this.finishDeadline = Math.min(this.finishDeadline, this.elapsed + 45);
      }
      if (Math.abs(r.speed) < 1 && input.throttle > 0) r.stuck += dt;
      else r.stuck = 0;
      if (r.stuck > 5) {
        this.respawn(r);
      }
      if (n.distance > 22) this.respawn(r);
      for (const obstacle of this.obstacles)
        if (Math.hypot(r.pos.x - obstacle.pos.x, r.pos.z - obstacle.pos.z) < obstacle.radius + 1)
          this.hit(r);
      if (!r.item)
        for (const box of this.pickups)
          if (box.cooldown === 0 && r.pos.distanceTo(box.pos) < 2.7) {
            r.item = this.chooseItem(this.ranking.indexOf(r));
            box.cooldown = 5;
            this.onEvent('pickup', r.id);
            break;
          }
      for (const t of this.boosts) {
        let d = Math.abs(n.t - t);
        d = Math.min(d, 1 - d);
        if (
          n.route === 'main' &&
          d * this.track.length < 3 &&
          n.distance < this.track.width / 2 &&
          r.boost < 0.15
        ) {
          r.boost = 1.1;
          this.onEvent('boost', r.id);
        }
      }
      if (
        n.route === 'shortcut' &&
        Math.abs(n.u - 0.5) * this.track.shortcut.length < 2 &&
        r.boost < 0.15
      ) {
        r.boost = 1.3;
        this.onEvent('boost', r.id);
      }
    }
    for (let i = 0; i < this.racers.length; i++)
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i],
          b = this.racers[j],
          d = a.pos.distanceTo(b.pos);
        if (d < 2.1 && d > 0.001) {
          const push = a.pos
            .clone()
            .sub(b.pos)
            .multiplyScalar(((2.1 - d) / d) * 0.5);
          a.pos.add(push);
          b.pos.sub(push);
          a.speed *= 0.995;
          b.speed *= 0.995;
        }
      }
    for (const h of this.hazards) {
      h.ttl -= dt;
      if (h.kind === 'missile') {
        const target = this.racers
          .filter((r) => r.id !== h.owner && !r.finished)
          .filter((r) => r.pos.clone().sub(h.pos).dot(h.direction) > 0)
          .sort((a, b) => a.pos.distanceToSquared(h.pos) - b.pos.distanceToSquared(h.pos))[0];
        if (target && target.pos.distanceTo(h.pos) < 35)
          h.direction.lerp(target.pos.clone().sub(h.pos).normalize(), dt * 2).normalize();
        h.pos.addScaledVector(h.direction, 48 * dt);
        const surface = this.track.surface(h.pos);
        h.pos.y = surface.height;
        if (surface.distance > surface.width / 2 + 3) h.ttl = 0;
      }
      for (const r of this.racers)
        if (r.id !== h.owner && !r.finished && r.pos.distanceTo(h.pos) < 2.2) {
          this.hit(r);
          h.ttl = 0;
          break;
        }
    }
    this.hazards = this.hazards.filter((h) => h.ttl > 0);
    if (
      this.racers.filter((r) => r.human).every((r) => r.finished) ||
      this.elapsed >= this.finishDeadline
    )
      this.finished = true;
  }
  respawn(r: Racer) {
    const t = ((Math.max(0, r.progress) % 1) + 1) % 1;
    const branch =
      r.route === 'shortcut' && t >= this.track.shortcut.start && t <= this.track.shortcut.end;
    const u = branch
      ? (t - this.track.shortcut.start) / (this.track.shortcut.end - this.track.shortcut.start)
      : t;
    r.route = branch ? 'shortcut' : 'main';
    r.pos.copy(this.track.routeAt(r.route, u));
    r.previous.copy(r.pos);
    const tangent = this.track.routeTangent(r.route, u);
    r.heading = Math.atan2(tangent.x, tangent.z);
    r.speed = 0;
    r.stuck = 0;
    r.lastT = t;
    r.immune = 2;
  }
}
export function wrap(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
