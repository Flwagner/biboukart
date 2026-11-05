import * as THREE from 'three';
import type { Racer } from './race';

const BURST_SECONDS = 1;
const STARS_PER_KART = 12;
interface KartEffect {
  trail: THREE.Group;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  pickupAge: number;
  origin: THREE.Vector3;
  shock: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  dust: THREE.Group;
  stunned: THREE.Group;
  impact: THREE.Group;
  impactAge: number;
}

/** Fixed-size, race-local effects. No allocations or new GPU resources per pickup. */
export class RaceEffects {
  root = new THREE.Group();
  karts: KartEffect[] = [];
  stars: THREE.InstancedMesh;
  private clock = 0;
  private transform = new THREE.Object3D();

  constructor(count: number) {
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const radius = i % 2 ? 0.18 : 0.42;
      const x = Math.sin(angle) * radius,
        y = Math.cos(angle) * radius;
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    star.closePath();
    this.stars = new THREE.InstancedMesh(
      new THREE.ShapeGeometry(star),
      new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, depthWrite: false }),
      count * STARS_PER_KART,
    );
    this.stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.stars.frustumCulled = false;
    this.stars.visible = false;
    const colors = ['#ffe58e', '#fff8df', '#cbb2ff'];
    for (let i = 0; i < count * STARS_PER_KART; i++)
      this.stars.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    this.root.add(this.stars);

    const flame = new THREE.ConeGeometry(0.34, 2.8, 5);
    const amber = new THREE.MeshBasicMaterial({
      color: '#ffc45c',
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const white = new THREE.MeshBasicMaterial({
      color: '#fff5c1',
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ringGeometry = new THREE.RingGeometry(1.6, 1.78, 32);
    for (let i = 0; i < count; i++) {
      const trail = new THREE.Group();
      for (const x of [-0.65, 0.65]) {
        const outer = new THREE.Mesh(flame, amber);
        outer.rotation.x = -Math.PI / 2;
        outer.position.set(x, 0.65, -2.6);
        trail.add(outer);
        const core = new THREE.Mesh(flame, white);
        core.rotation.x = -Math.PI / 2;
        core.position.set(x, 0.65, -2.05);
        core.scale.set(0.55, 0.65, 0.55);
        trail.add(core);
      }
      trail.visible = false;
      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color: '#ffe59a',
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      const shock = new THREE.Mesh(
        new THREE.RingGeometry(0.88, 1, 48),
        new THREE.MeshBasicMaterial({
          color: '#ffcc75',
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      shock.rotation.x = -Math.PI / 2;
      shock.visible = false;
      const dust = new THREE.Group(),
        stunned = new THREE.Group(),
        impact = new THREE.Group();
      const dustGeometry = new THREE.IcosahedronGeometry(0.35, 0);
      const dustMaterial = new THREE.MeshBasicMaterial({
        color: '#d8c1a0',
        transparent: true,
        opacity: 0.6,
      });
      for (let j = 0; j < 10; j++) dust.add(new THREE.Mesh(dustGeometry, dustMaterial));
      for (let j = 0; j < 3; j++)
        stunned.add(
          new THREE.Mesh(
            this.stars.geometry,
            new THREE.MeshBasicMaterial({ color: '#ffe486', side: THREE.DoubleSide }),
          ),
        );
      const impactGeometry = new THREE.IcosahedronGeometry(0.35, 0);
      const impactMaterial = new THREE.MeshBasicMaterial({ color: '#ffbd62' });
      for (let j = 0; j < 8; j++) impact.add(new THREE.Mesh(impactGeometry, impactMaterial));
      dust.visible = stunned.visible = impact.visible = false;
      this.root.add(trail, ring, shock, dust, stunned, impact);
      this.karts.push({
        trail,
        ring,
        shock,
        dust,
        stunned,
        impact,
        impactAge: 1,
        pickupAge: BURST_SECONDS,
        origin: new THREE.Vector3(),
      });
    }
  }
  pickup(id: number, position: THREE.Vector3) {
    const effect = this.karts[id];
    if (!effect) return;
    effect.pickupAge = 0;
    effect.origin.copy(position);
  }
  isCollecting(id: number) {
    return (this.karts[id]?.pickupAge ?? BURST_SECONDS) < BURST_SECONDS;
  }
  impact(id: number, position: THREE.Vector3, splash: boolean) {
    const effect = this.karts[id];
    if (!effect) return;
    effect.impactAge = 0;
    effect.impact.position.copy(position);
    const material = (effect.impact.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    material.color.set(splash ? '#53456e' : '#ffbd62');
  }
  update(dt: number, racers: readonly Racer[], reduced: boolean) {
    this.clock += dt;
    let activeStars = false;
    for (const racer of racers) {
      const effect = this.karts[racer.id];
      if (!effect) continue;
      const pulse = racer.shockPulse / 0.65;
      effect.shock.visible = pulse > 0;
      effect.shock.position.copy(racer.shockOrigin);
      effect.shock.position.y += 0.12;
      effect.shock.scale.setScalar(reduced ? 8 : 1 + (1 - pulse) * 7);
      effect.shock.material.opacity = pulse * 0.8;
      effect.dust.visible = pulse > 0 && !reduced;
      effect.dust.position.copy(racer.shockOrigin);
      effect.dust.children.forEach((puff, j) => {
        const angle = (j / 10) * Math.PI * 2;
        const radius = 1 + (1 - pulse) * 7;
        puff.position.set(
          Math.sin(angle) * radius,
          0.2 + Math.sin(pulse * Math.PI) * 0.7,
          Math.cos(angle) * radius,
        );
        puff.scale.setScalar(pulse * 1.6);
      });
      effect.stunned.visible = racer.stun > 0;
      effect.stunned.position.copy(racer.pos);
      effect.stunned.children.forEach((star, j) => {
        const angle = (j * Math.PI * 2) / 3 + (reduced ? 0 : this.clock * 4);
        star.position.set(
          Math.sin(angle) * 0.9 * racer.giantScale,
          2.7 * racer.giantScale,
          Math.cos(angle) * 0.9 * racer.giantScale,
        );
        star.rotation.y = angle;
        star.scale.setScalar(0.65);
      });
      effect.impactAge = Math.min(1, effect.impactAge + dt * 2);
      effect.impact.visible = effect.impactAge < 1 && !reduced;
      effect.impact.children.forEach((particle, j) => {
        const age = effect.impactAge,
          angle = (j * Math.PI) / 4;
        particle.position.set(
          Math.sin(angle) * age * 2,
          0.6 + Math.sin(age * Math.PI) * (0.5 + (j % 3) * 0.4),
          Math.cos(angle) * age * 2,
        );
        particle.scale.setScalar(1 - age);
      });
      effect.pickupAge = Math.min(BURST_SECONDS, effect.pickupAge + dt);
      const burst = effect.pickupAge < BURST_SECONDS;
      const boosted = racer.boost > 0 && !racer.finished;
      effect.trail.visible = boosted && !reduced;
      effect.trail.position.copy(racer.pos);
      effect.trail.rotation.y = racer.heading;
      effect.trail.scale.z = 1 + Math.sin(this.clock * 12 + racer.id) * 0.12;
      effect.ring.visible = burst || (boosted && reduced);
      effect.ring.position.copy(burst ? effect.origin : racer.pos);
      effect.ring.position.y += 0.12;
      const age = effect.pickupAge / BURST_SECONDS;
      effect.ring.scale.setScalar(burst && !reduced ? 1 + age * 1.8 : 1);
      effect.ring.material.opacity = burst ? 0.85 * (1 - age) : 0.45;
      for (let j = 0; j < STARS_PER_KART; j++) {
        const index = racer.id * STARS_PER_KART + j;
        if (burst && !reduced) {
          activeStars = true;
          const angle = (j * Math.PI * 2) / STARS_PER_KART + racer.id;
          const radius = 0.65 + age * (2.5 + (j % 3) * 0.35);
          this.transform.position.set(
            effect.origin.x + Math.cos(angle) * radius,
            effect.origin.y + 0.7 + Math.sin(age * Math.PI) * 1.8 + (j % 3) * 0.25,
            effect.origin.z + Math.sin(angle) * radius,
          );
          this.transform.rotation.set(0, angle + age * 3, Math.sin(angle) * age);
          this.transform.scale.setScalar((1 - age) * (0.7 + (j % 3) * 0.2));
        } else {
          this.transform.scale.setScalar(0);
        }
        this.transform.updateMatrix();
        this.stars.setMatrixAt(index, this.transform.matrix);
      }
    }
    this.stars.visible = activeStars;
    this.stars.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.stars.dispose();
    this.root.removeFromParent();
    this.root.clear();
    this.karts = [];
  }
}
