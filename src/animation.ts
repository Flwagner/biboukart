import * as THREE from 'three';
const brakeIdle = new THREE.Color('#842833'),
  brakeBright = new THREE.Color('#ff5148');
export type Reaction = 'pickup' | 'hit' | 'finish';
export interface KartRig {
  driver: THREE.Group;
  steering: THREE.Mesh;
  rearLights: THREE.Group;
  rearLightMaterial: THREE.MeshBasicMaterial;
  wheels: { pivot: THREE.Group; wheel: THREE.Mesh; front: boolean }[];
  shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  wheelAngle: number;
  reaction: Reaction | null;
  age: number;
}
export function react(rig: KartRig, kind: string) {
  if (kind === 'pickup' || kind === 'hit' || kind === 'finish') {
    rig.reaction = kind;
    rig.age = 0;
  }
}
export function animateKart(
  rig: KartRig,
  dt: number,
  speed: number,
  steer: number,
  reduced: boolean,
  brake = 0,
) {
  rig.rearLightMaterial.color.copy(brake > 0.05 ? brakeBright : brakeIdle);
  rig.age += dt;
  if (!reduced) rig.wheelAngle = (rig.wheelAngle + (speed * dt) / 0.43) % (Math.PI * 2);
  for (const { pivot, wheel, front } of rig.wheels) {
    wheel.rotation.x = reduced ? 0 : rig.wheelAngle;
    pivot.rotation.y = front ? -steer * 0.45 : 0;
  }
  rig.steering.rotation.z = steer * 0.7;
  const active = rig.age < 0.75,
    phase = rig.age / 0.75;
  rig.driver.position.y =
    !reduced && rig.reaction === 'pickup' && active ? Math.sin(phase * Math.PI) * 0.35 : 0;
  rig.driver.rotation.x =
    !reduced && rig.reaction === 'hit' && active
      ? Math.sin(phase * Math.PI * 3) * (1 - phase) * 0.4
      : 0;
  rig.driver.rotation.z =
    !reduced && rig.reaction === 'finish'
      ? Math.sin(rig.age * 5) * 0.15
      : reduced
        ? 0
        : steer * 0.06;
}
