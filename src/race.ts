import * as THREE from 'three';
import { karts, trackDefinitions, type Item, type PlayerConfig } from './config';
export interface Input {
  throttle: number;
  brake: number;
  steer: number; // -1 = driver-left, +1 = driver-right, for every controller and the AI.
  use: boolean;
}
export const idleInput = (): Input => ({ throttle: 0, brake: 0, steer: 0, use: false });
export class Track {
  curve: THREE.CatmullRomCurve3;
  samples: THREE.Vector3[];
  tangents: THREE.Vector3[];
  length: number;
  width: number;
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
    this.samples = Array.from({ length: 512 }, (_, i) => this.curve.getPointAt(i / 512));
    this.tangents = Array.from({ length: 512 }, (_, i) =>
      this.curve.getTangentAt(i / 512).normalize(),
    );
  }
  at(t: number) {
    return this.curve.getPointAt(((t % 1) + 1) % 1);
  }
  tangent(t: number) {
    return this.curve.getTangentAt(((t % 1) + 1) % 1).normalize();
  }
  nearest(p: THREE.Vector3) {
    let index = 0,
      distance = Infinity;
    for (let i = 0; i < 512; i++) {
      const d = p.distanceToSquared(this.samples[i]);
      if (d < distance) {
        distance = d;
        index = i;
      }
    }
    return { index, t: index / 512, distance: Math.sqrt(distance) };
  }
}
export interface Racer {
  id: number;
  human: boolean;
  config: PlayerConfig;
  pos: THREE.Vector3;
  previous: THREE.Vector3;
  heading: number;
  speed: number;
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
  boosts: number[] = [0.17, 0.48, 0.79];
  elapsed = 0;
  countdown = 3.5;
  finished = false;
  finishDeadline = Infinity;
  seed = 12345;
  onEvent: (kind: string, racer: number, item?: Item) => void = () => {};
  constructor(track: number, players: PlayerConfig[]) {
    this.track = new Track(track);
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
  ai(r: Racer): Input {
    const n = this.track.nearest(r.pos),
      target = this.track.at(n.t + (8 + Math.abs(r.speed) * 0.5) / this.track.length);
    const angle = wrap(Math.atan2(target.x - r.pos.x, target.z - r.pos.z) - r.heading);
    let steer = angle * 1.5;
    for (const other of this.racers)
      if (other !== r) {
        const delta = other.pos.clone().sub(r.pos);
        const ahead = delta.dot(new THREE.Vector3(Math.sin(r.heading), 0, Math.cos(r.heading)));
        if (ahead > 0 && ahead < 7 && delta.length() < 6)
          steer +=
            Math.sign(delta.dot(new THREE.Vector3(Math.cos(r.heading), 0, -Math.sin(r.heading)))) *
            -0.35;
      }
    return {
      throttle: 1,
      brake: Math.abs(angle) > 0.65 && r.speed > 16 ? 0.65 : 0,
      // Convert signed world-heading correction to the same steering convention as humans.
      steer: -THREE.MathUtils.clamp(steer, -1, 1),
      use: !!r.item && this.random() < 0.018,
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
      if (input.use) this.use(r);
      const near = this.track.nearest(r.pos),
        off = near.distance > this.track.width / 2;
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
      const n = this.track.nearest(r.pos);
      if (n.distance > this.track.width / 2 + 3) {
        const center = this.track.samples[n.index],
          delta = r.pos.clone().sub(center);
        r.pos.copy(center).addScaledVector(delta, (this.track.width / 2 + 3) / n.distance);
        r.speed *= 0.93;
      }
      let delta = n.t - r.lastT;
      if (delta < -0.5) delta += 1;
      if (delta > 0.5) delta -= 1;
      // Only local, physical movement can advance race progress.
      if (Math.abs(delta) * this.track.length < Math.abs(r.speed) * dt + 2) r.progress += delta;
      r.lastT = n.t;
      const expected = (r.checkpoint + 1) / 8;
      if (r.progress >= expected && r.progress < expected + 0.12) r.checkpoint++;
      r.lap = Math.min(3, Math.floor(r.checkpoint / 8));
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
      if (r.pos.distanceTo(this.track.samples[n.index]) > 22) this.respawn(r);
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
        if (d * this.track.length < 3 && n.distance < this.track.width / 2 && r.boost < 0.15) {
          r.boost = 1.1;
          this.onEvent('boost', r.id);
        }
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
        if (this.track.nearest(h.pos).distance > this.track.width / 2 + 3) h.ttl = 0;
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
    r.pos.copy(this.track.at(t));
    const tangent = this.track.tangent(t);
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
