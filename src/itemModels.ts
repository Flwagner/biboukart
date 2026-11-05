import * as THREE from 'three';
import type { Hazard } from './race';

/** Both variants stay in a reusable slot when the simulation compacts its hazards. */
export function createHazardModel() {
  const root = new THREE.Group();
  const missile = new THREE.Group(),
    puddle = new THREE.Group();
  const paint = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 });
  const white = paint('#f5eee4'),
    red = paint('#ed5b4f'),
    dark = paint('#31364c');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 10), white);
  body.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.65, 10), red);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.9;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.29, 0.25, 10), dark);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = -0.65;
  missile.add(body, nose, nozzle);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.5), red);
    const angle = (i * Math.PI) / 2;
    fin.position.set(Math.sin(angle) * 0.32, Math.cos(angle) * 0.32, -0.42);
    fin.rotation.z = -angle;
    missile.add(fin);
  }
  const exhaust = new THREE.Group();
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 1.2, 7),
    new THREE.MeshBasicMaterial({ color: '#ffb94d' }),
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = -1.3;
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.7, 7),
    new THREE.MeshBasicMaterial({ color: '#fff3bc' }),
  );
  core.rotation.x = -Math.PI / 2;
  core.position.z = -1.05;
  exhaust.add(flame, core);
  for (let i = 0; i < 5; i++) {
    const smoke = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18 + i * 0.06, 0),
      new THREE.MeshBasicMaterial({
        color: '#e2d5cb',
        transparent: true,
        opacity: 0.45 - i * 0.07,
        depthWrite: false,
      }),
    );
    smoke.position.set(Math.sin(i * 2) * 0.1, 0, -1.8 - i * 0.48);
    exhaust.add(smoke);
  }
  missile.add(exhaust);
  missile.position.y = 0.85;

  const shape = new THREE.Shape();
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const radius = 1.35 + Math.sin(angle * 3) * 0.17 + Math.cos(angle * 5) * 0.1;
    points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.8));
  }
  shape.moveTo(points[0].x, points[0].y);
  shape.splineThru(points.slice(1));
  shape.closePath();
  const oil = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({
      color: '#171a29',
      roughness: 0.12,
      metalness: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  oil.rotation.x = -Math.PI / 2;
  puddle.add(oil);
  for (let i = 0; i < 3; i++) {
    const sheen = new THREE.Mesh(
      new THREE.RingGeometry(0.3 + i * 0.18, 0.35 + i * 0.18, 24, 1, i * 1.5, Math.PI * 1.2),
      new THREE.MeshBasicMaterial({
        color: ['#a37ada', '#58b6c3', '#dfb379'][i],
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.set(0.1, 0.008 + i * 0.002, 0);
    sheen.scale.y = 0.65;
    puddle.add(sheen);
  }
  puddle.position.y = 0.07;
  root.add(missile, puddle);
  root.userData.exhaust = exhaust;
  return root;
}

export function updateHazardModel(
  root: THREE.Group,
  hazard: Hazard,
  time: number,
  reduced: boolean,
) {
  const missile = hazard.kind === 'missile';
  root.children[0].visible = missile;
  root.children[1].visible = !missile;
  root.position.copy(hazard.pos);
  root.rotation.set(
    hazard.pitch ?? 0,
    Math.atan2(hazard.direction.x, hazard.direction.z),
    hazard.roll ?? 0,
    'YXZ',
  );
  const exhaust = root.userData.exhaust as THREE.Group;
  exhaust.visible = !reduced;
  exhaust.scale.z = reduced ? 1 : 1 + Math.sin(time * 35) * 0.15;
}
