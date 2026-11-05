import * as THREE from 'three';
import type { Track, Obstacle } from './track';
export function scenery(track: Track) {
  const group = new THREE.Group(),
    moving: THREE.Group[] = [];
  const materials = new Map<string, THREE.MeshLambertMaterial>();
  const material = (color: string) => {
    if (!materials.has(color))
      materials.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
    return materials.get(color)!;
  };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (parent: THREE.Group, color: string, size: number[], p: number[]) => {
    const mesh = new THREE.Mesh(box, material(color));
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(p[0], p[1], p[2]);
    parent.add(mesh);
    return mesh;
  };
  const location = (t: number, side: number) => {
    const p = track.at(t),
      tan = track.tangent(t);
    p.addScaledVector(new THREE.Vector3(tan.z, 0, -tan.x).normalize(), side);
    const normal = new THREE.Vector3(tan.z, 0, -tan.x).normalize();
    // Decorations must clear both roads, including the inside of shortcut bends.
    for (let attempt = 0; attempt < 60; attempt++) {
      const branch =
        Math.min(...track.shortcut.samples.map((s) => Math.hypot(p.x - s.x, p.z - s.z))) -
        track.shortcut.width / 2;
      if (track.nearest(p).distance - track.width / 2 >= 6 && branch >= 6) break;
      p.addScaledVector(normal, Math.sign(side) * 3);
    }
    p.y = track.terrainHeight(p);
    return p;
  };
  if (track.index === 0) {
    for (const t of [0.06, 0.62]) {
      const p = location(t, 24),
        tower = new THREE.Group();
      tower.position.copy(p);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.5, 10, 8), material('#f2d9a5'));
      body.position.y = 5;
      tower.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.5, 8), material('#b96a4d'));
      roof.position.y = 11;
      tower.add(roof);
      add(tower, '#493d36', [1, 1.8, 0.15], [0, 1.1, 2.4]);
      group.add(tower);
      const sails = new THREE.Group();
      sails.position.set(p.x, p.y + 8, p.z + 2);
      for (let i = 0; i < 4; i++) {
        const sail = add(
          sails,
          '#fff0c3',
          [0.65, 4, 0.2],
          [Math.sin((i * Math.PI) / 2) * 2.4, Math.cos((i * Math.PI) / 2) * 2.4, 0],
        );
        sail.rotation.z = (-i * Math.PI) / 2;
      }
      moving.push(sails);
    }
    for (let i = 0; i < 26; i++) {
      const t = i / 26,
        p = location(t, track.width / 2 + 6),
        fence = new THREE.Group();
      fence.position.copy(p);
      const tan = track.tangent(t);
      fence.rotation.y = Math.atan2(tan.x, tan.z);
      for (const z of [-1.8, 1.8]) add(fence, '#e5c898', [0.18, 1.8, 0.18], [0, 0.9, z]);
      for (const y of [0.6, 1.3]) add(fence, '#f8e3b7', [0.15, 0.16, 3.8], [0, y, 0]);
      group.add(fence);
    }
    for (let i = 0; i < 44; i++) {
      const p = location(i / 44, -13 - (i % 3) * 3);
      add(group, i % 2 ? '#f1c16c' : '#f1d4d8', [0.5, 0.3, 0.5], [p.x, p.y + 0.6, p.z]);
      add(group, '#4d8760', [0.1, 0.5, 0.1], [p.x, p.y + 0.25, p.z]);
    }
  } else if (track.index === 1) {
    for (const t of [0.12, 0.51, 0.83]) {
      const p = location(t, 19),
        arch = new THREE.Group();
      arch.position.copy(p);
      arch.rotation.y = t * Math.PI * 2;
      for (const x of [-4, 4]) add(arch, '#ba754e', [2.2, 8, 2.5], [x, 4, 0]);
      const bridge = new THREE.Mesh(
        new THREE.TorusGeometry(4, 1.1, 5, 12, Math.PI),
        material('#ce8e60'),
      );
      bridge.position.y = 8;
      arch.add(bridge);
      group.add(arch);
    }
    for (let i = 0; i < 20; i++) {
      const p = location(i / 20, (i % 2 ? 1 : -1) * (15 + (i % 4))),
        cactus = new THREE.Group();
      cactus.position.copy(p);
      add(cactus, '#66936d', [0.75, 3.5, 0.75], [0, 1.75, 0]);
      for (const side of [-1, 1]) {
        add(cactus, '#66936d', [1.3, 0.55, 0.6], [side * 0.8, 1.7, 0]);
        add(cactus, '#66936d', [0.55, 1.4, 0.6], [side * 1.4, 2.2, 0]);
      }
      group.add(cactus);
    }
  } else if (track.index === 2) {
    for (let i = 0; i < 24; i++) {
      const p = location(i / 24, (i % 2 ? 1 : -1) * (14 + (i % 3) * 3)),
        palm = new THREE.Group();
      palm.position.copy(p);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 6, 6), material('#9b7954'));
      trunk.position.y = 3;
      trunk.rotation.z = 0.12;
      palm.add(trunk);
      for (let j = 0; j < 6; j++) {
        const leaf = add(
          palm,
          j % 2 ? '#408c67' : '#59a478',
          [0.8, 0.16, 4.8],
          [Math.sin((j * Math.PI) / 3) * 1.7, 6, Math.cos((j * Math.PI) / 3) * 1.7],
        );
        leaf.rotation.set(0.18, (j * Math.PI) / 3, 0);
      }
      group.add(palm);
    }
    for (const t of [0.05, 0.5, 0.82]) {
      const p = location(t, 23),
        hut = new THREE.Group();
      hut.position.copy(p);
      for (const x of [-1.8, 1.8])
        for (const z of [-1.8, 1.8]) add(hut, '#96714f', [0.25, 2, 0.25], [x, 1, z]);
      add(hut, '#79b7b8', [4, 3, 4], [0, 3, 0]);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2, 4), material('#e0b76c'));
      roof.position.y = 5.5;
      roof.rotation.y = Math.PI / 4;
      hut.add(roof);
      add(hut, '#f5e6be', [5, 0.2, 5], [0, 1.9, 0]);
      group.add(hut);
    }
  }
  if (track.index === 3) {
    group.name = 'snow-scenery';
    for (let i = 0; i < 62; i++) {
      const p = location(i / 62, (i % 2 ? 1 : -1) * (15 + (i % 5) * 4));
      const pine = new THREE.Group();
      pine.position.copy(p);
      const height = 4 + (i % 4);
      add(pine, '#77685c', [0.45, height, 0.45], [0, height / 2, 0]);
      for (let layer = 0; layer < 3; layer++) {
        const radius = 2.1 - layer * 0.45;
        const needles = new THREE.Mesh(
          new THREE.ConeGeometry(radius, height * 0.6, 7),
          material('#46716c'),
        );
        needles.position.y = height * (0.45 + layer * 0.22);
        pine.add(needles);
        const snow = new THREE.Mesh(
          new THREE.ConeGeometry(radius * 0.92, height * 0.5, 7),
          material('#f5fbff'),
        );
        snow.position.y = needles.position.y + height * 0.1;
        pine.add(snow);
      }
      group.add(pine);
    }
    for (const t of [0.04, 0.48, 0.82]) {
      const p = location(t, 24),
        chalet = new THREE.Group();
      chalet.position.copy(p);
      chalet.rotation.y = t * Math.PI * 2;
      add(chalet, '#a47758', [7, 4.5, 6], [0, 2.25, 0]);
      for (const side of [-1, 1]) {
        const roof = add(chalet, '#f5fbff', [4.7, 0.4, 7.5], [side * 1.85, 5.2, 0]);
        roof.rotation.z = -side * 0.5;
        add(chalet, '#ffe2a3', [1.2, 1.4, 0.08], [side * 2, 2.6, 3.04]);
      }
      add(chalet, '#654f44', [1.2, 2.4, 0.1], [0, 1.2, 3.05]);
      add(chalet, '#8a807d', [0.7, 2, 0.8], [2, 5.8, -1]);
      group.add(chalet);
    }
    for (let i = 0; i < 48; i++) {
      for (const side of [-1, 1]) {
        const p = track.at(i / 48),
          tangent = track.tangent(i / 48);
        p.addScaledVector(
          new THREE.Vector3(tangent.z, 0, -tangent.x).normalize(),
          side * (track.width / 2 + 1),
        );
        if (
          track.overlapsRoad(p, 'shortcut', 1) ||
          track.nearest(p).distance < track.width / 2 + 0.5
        )
          continue;
        add(group, '#da746b', [0.18, 1.5, 0.18], [p.x, p.y + 0.75, p.z]);
        add(group, '#f7fbff', [0.23, 0.4, 0.23], [p.x, p.y + 1.3, p.z]);
      }
    }
  } else if (track.index === 4) {
    group.name = 'city-scenery';
    const palette = ['#7b91aa', '#a899a4', '#c4b6a3', '#7caaa9', '#8390b4'];
    for (let i = 0; i < 42; i++) {
      const p = location(i / 42, (i % 2 ? 1 : -1) * (22 + (i % 3) * 10));
      const building = new THREE.Group();
      building.position.copy(p);
      const width = 6 + (i % 3),
        depth = 7,
        floors = 3 + ((i * 7) % 8),
        height = floors * 3;
      add(building, '#cdd1d3', [width + 2, 0.4, depth + 2], [0, 0.2, 0]);
      add(building, palette[i % palette.length], [width, height, depth], [0, height / 2, 0]);
      add(building, '#536575', [width + 0.5, 0.5, depth + 0.5], [0, height, 0]);
      add(building, '#657987', [2, 1, 2], [0, height + 0.6, 0]);
      for (let floor = 0; floor < floors; floor++)
        for (const side of [-1, 1])
          for (const x of [-width * 0.3, 0, width * 0.3]) {
            const lit = (floor + i + Math.round(x * 10)) % 3 !== 0;
            add(
              building,
              lit ? '#f8e3aa' : '#405d75',
              [1, 1.4, 0.06],
              [x, floor * 3 + 1.7, side * (depth / 2 + 0.04)],
            );
            add(
              building,
              lit ? '#c3e2ed' : '#405d75',
              [0.06, 1.4, 1],
              [side * (width / 2 + 0.04), floor * 3 + 1.7, x * 0.7],
            );
          }
      add(building, '#385267', [1.4, 2.5, 0.1], [0, 1.25, depth / 2 + 0.08]);
      if (i % 3 === 0) {
        add(building, '#e5a36d', [width, 0.3, 1.6], [0, 3, depth / 2 + 0.7]);
        add(building, '#f5e6c8', [width * 0.8, 0.7, 0.1], [0, 3.8, depth / 2 + 0.1]);
      }
      group.add(building);
    }
    for (let i = 0; i < 32; i++) {
      const p = location(i / 32, (i % 2 ? 1 : -1) * (track.width / 2 + 7));
      const lamp = new THREE.Group();
      lamp.position.copy(p);
      add(lamp, '#42576b', [0.18, 6, 0.18], [0, 3, 0]);
      add(lamp, '#42576b', [1.8, 0.18, 0.18], [0.8, 6, 0]);
      add(lamp, '#fff1bb', [0.9, 0.2, 0.5], [1.4, 5.85, 0]);
      if (i % 4 === 0) {
        add(lamp, '#283c4d', [0.65, 1.7, 0.45], [0, 4.2, 0.3]);
        for (let light = 0; light < 3; light++)
          add(
            lamp,
            ['#ee7b71', '#f6cc63', '#83ce9b'][light],
            [0.35, 0.35, 0.08],
            [0, 4.75 - light * 0.5, 0.56],
          );
      }
      group.add(lamp);
    }
  }
  return { group, moving };
}
export function obstacleModel(obstacle: Obstacle) {
  const group = new THREE.Group();
  const material = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const block = (color: string, size: number[], position: number[]) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...(size as [number, number, number])),
      material(color),
    );
    mesh.position.set(...(position as [number, number, number]));
    group.add(mesh);
    return mesh;
  };
  if (obstacle.kind === 'barrier') {
    block('#f6dfb3', [3.6, 0.65, 0.55], [0, 0.9, 0]);
    for (const x of [-1.2, 0, 1.2]) block('#cc6f59', [0.4, 0.7, 0.6], [x, 0.9, 0]);
    for (const x of [-1.5, 1.5]) block('#4b646a', [0.25, 0.6, 0.35], [x, 0.3, 0]);
  } else if (obstacle.kind === 'rock' || obstacle.kind === 'snowball') {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.6, 0),
      material(obstacle.kind === 'snowball' ? '#f4fbff' : '#a96243'),
    );
    group.add(rock);
  } else {
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), material('#e88e6a'));
    shell.scale.y = 0.5;
    shell.position.y = 0.7;
    group.add(shell);
    for (const side of [-1, 1]) {
      for (const z of [-0.6, 0, 0.6]) {
        const leg = block('#ce6b57', [1.1, 0.15, 0.15], [side * 1.2, 0.3, z]);
        leg.rotation.y = side * z * 0.7;
      }
      block('#e49e7a', [0.6, 0.6, 0.6], [side * 1.2, 1.1, 0.7]);
      block('#273a47', [0.15, 0.3, 0.15], [side * 0.4, 1.2, 0.6]);
    }
  }
  return group;
}
