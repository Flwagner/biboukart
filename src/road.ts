import * as THREE from 'three';
import { trackDefinitions } from './config';
import type { Track, Route } from './track';
/** Shared rendered road geometry; shoulders are clipped out of the paved union. */
export function createRoadGeometry(track: Track) {
  const vertices: number[] = [],
    colors: number[] = [],
    def = trackDefinitions[track.index];
  const roadColor = new THREE.Color('#59636c'),
    groundColor = new THREE.Color(def.ground),
    edgeColors = [new THREE.Color('#f4e9cf'), new THREE.Color('#ec8d76')],
    white = new THREE.Color('#d6d5c5');
  const segments = 512;
  const ribbon = (
    left: number,
    right: number,
    height: number,
    colorAt: (i: number) => THREE.Color,
    route: Route = 'main',
    embankment = false,
    edgeMarking = false,
  ) => {
    for (let i = 0; i < segments; i++) {
      const a = track.routeAt(route, i / segments),
        b = track.routeAt(route, (i + 1) / segments),
        ta = track.routeTangent(route, i / segments),
        tb = track.routeTangent(route, (i + 1) / segments),
        na = new THREE.Vector3(ta.z, 0, -ta.x).normalize(),
        nb = new THREE.Vector3(tb.z, 0, -tb.x).normalize();
      const ps = [
        a.clone().addScaledVector(na, left),
        a.clone().addScaledVector(na, right),
        b.clone().addScaledVector(nb, left),
        b.clone().addScaledVector(nb, right),
      ];
      const middle = a
        .clone()
        .lerp(b, 0.5)
        .addScaledVector(na, (left + right) * 0.5);
      if (embankment) {
        const onRoad = (p: THREE.Vector3, margin: number) =>
          track.overlapsRoad(p, 'main', margin) || track.overlapsRoad(p, 'shortcut', margin);
        // Also test our own route: inside a tight bend, a shoulder can fold
        // across a different part of that same road, not only the shortcut.
        if (onRoad(middle, 1.2) || ps.some((p) => onRoad(p, 0.1))) continue;
      } else if (
        edgeMarking &&
        track.overlapsRoad(middle, route === 'main' ? 'shortcut' : 'main', 0.25)
      )
        continue;
      if (route === 'main')
        ps.forEach(
          (p, j) => (p.y += track.bank((i + (j > 1 ? 1 : 0)) / segments) * (j % 2 ? right : left)),
        );
      if (embankment) {
        const width = route === 'main' ? track.width : track.shortcut.width;
        ps.forEach((p, j) => {
          const lateral = j % 2 ? right : left,
            fraction = THREE.MathUtils.clamp((Math.abs(lateral) - width / 2 - 0.7) / 5.3, 0, 1);
          p.y = THREE.MathUtils.lerp(p.y, track.terrainHeight(p), fraction);
        });
      }
      const color = colorAt(i);
      for (const j of [0, 2, 1, 1, 2, 3]) {
        vertices.push(ps[j].x, ps[j].y + height, ps[j].z);
        colors.push(color.r, color.g, color.b);
      }
    }
  };
  ribbon(-track.width / 2, track.width / 2, 0.02, () => roadColor);
  for (const route of ['main', 'shortcut'] as Route[]) {
    const width = route === 'main' ? track.width : track.shortcut.width;
    for (const side of [-1, 1])
      for (let band = 0; band < 4; band++)
        ribbon(
          side * (width / 2 + 0.7 + (band * 5.3) / 4),
          side * (width / 2 + 0.7 + ((band + 1) * 5.3) / 4),
          0,
          () => groundColor,
          route,
          true,
        );
  }
  ribbon(-track.shortcut.width / 2, track.shortcut.width / 2, 0.025, () => roadColor, 'shortcut');
  for (const side of [-1, 1])
    ribbon(
      (side * track.shortcut.width) / 2,
      side * (track.shortcut.width / 2 + 0.25),
      0.04,
      () => white,
      'shortcut',
      false,
      true,
    );
  for (const side of [-1, 1])
    ribbon(
      (side * track.width) / 2,
      side * (track.width / 2 + 0.7),
      0.035,
      (i) => edgeColors[Math.floor(i / 5) % 2],
      'main',
      false,
      true,
    );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
