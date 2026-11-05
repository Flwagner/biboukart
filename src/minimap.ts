import type { Track } from './race';
export const racerColors = ['#ffd568', '#6ce1bf', '#f78b9e', '#bba1fc', '#ffffff', '#87bef2'];
export function mapProjection(track: Track) {
  const xs = track.samples.map((p) => p.x),
    zs = track.samples.map((p) => p.z),
    minX = Math.min(...xs),
    minZ = Math.min(...zs);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...zs) - minZ),
    scale = 156 / span;
  return (x: number, z: number) => ({ x: 22 + (x - minX) * scale, y: 22 + (z - minZ) * scale });
}
export function minimapMarkup(track: Track, player: number) {
  const project = mapProjection(track);
  const points = track.samples
    .filter((_, i) => i % 4 === 0)
    .map((p) => {
      const q = project(p.x, p.z);
      return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    })
    .join(' ');
  const branch = track.shortcut.samples
    .filter((_, i) => i % 4 === 0)
    .map((p) => {
      const q = project(p.x, p.z);
      return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    })
    .join(' ');
  return `<svg class="minimap" viewBox="0 0 200 200" role="img" aria-label="Mini-carte : six concurrents, joueur ${player + 1} en surbrillance"><polygon points="${points}" class="map-track"/><polyline points="${branch}" class="map-shortcut"/>${racerColors.map((color, i) => `<g data-map-racer="${i}" class="${i === player ? 'map-current' : ''}"><circle r="${i === player ? 8 : 6}" fill="${color}"/><text text-anchor="middle" dominant-baseline="central">${i + 1}</text></g>`).join('')}</svg>`;
}
