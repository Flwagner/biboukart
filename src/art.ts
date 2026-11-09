import * as THREE from 'three';

/** Restrained toy-like finishes; no downloaded textures or per-frame allocations. */
export function toyMaterial(color: THREE.ColorRepresentation) {
  const hex = new THREE.Color(color).getHexString();
  const rubber = ['15191e', '263247', '273442', '233044'].includes(hex);
  const metal = ['a6b6c1', 'd5e3df'].includes(hex);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rubber ? 0.94 : metal ? 0.32 : 0.48,
    metalness: metal ? 0.55 : 0,
  });
}

/** Screen-space gradient: stays behind every split-screen camera. */
export function skyTexture(color: string) {
  const horizon = new THREE.Color(color).lerp(new THREE.Color('#fff4d9'), 0.45);
  const zenith = new THREE.Color(color).lerp(new THREE.Color('#388cc6'), 0.38);
  const pixels = new Uint8Array(64 * 4);
  for (let y = 0; y < 64; y++) {
    const c = horizon
      .clone()
      .lerp(zenith, Math.pow(y / 63, 0.8))
      .convertLinearToSRGB();
    pixels.set([c.r * 255, c.g * 255, c.b * 255, 255], y * 4);
  }
  const texture = new THREE.DataTexture(pixels, 1, 64);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function shadowProfile(quality: string, views: number, constrained = false) {
  return {
    enabled: quality !== 'low' && views < 3 && (!constrained || quality === 'high'),
    mapSize: quality === 'high' ? 2048 : 1024,
  };
}

export function isSoftwareRenderer(name: string) {
  return /swiftshader|llvmpipe|lavapipe|software/i.test(name);
}

/** Slight supersampling avoids a permanent 4× MSAA cost on the shared WebGL context. */
export function pixelRatioForQuality(quality: string, deviceRatio: number, resolution: number) {
  const cap = quality === 'low' ? 1 : quality === 'high' ? 1.75 : 1.35;
  const floor = quality === 'low' ? 1 : quality === 'high' ? 1.5 : 1.15;
  return Math.min(Math.max(deviceRatio, floor), cap) * resolution;
}

export function asphaltTexture() {
  const pixels = new Uint8Array(64 * 64 * 4);
  let seed = 71;
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const grain = 218 + (seed % 38);
    pixels.set([grain, grain, grain, 255], i);
  }
  const texture = new THREE.DataTexture(pixels, 64, 64);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

let contactTexture: THREE.DataTexture | undefined;
export function contactShadowTexture() {
  if (contactTexture) return contactTexture;
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const radius = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
      pixels.set([255, 255, 255, Math.pow(Math.max(0, 1 - radius), 0.8) * 255], (y * 32 + x) * 4);
    }
  contactTexture = new THREE.DataTexture(pixels, 32, 32);
  contactTexture.magFilter = THREE.LinearFilter;
  contactTexture.needsUpdate = true;
  return contactTexture;
}

/** Original local signage, rasterized only when a world is built. */
export function startBanner(width: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff0ce';
  context.fillRect(0, 0, 1024, 128);
  context.fillStyle = '#233e47';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 76px system-ui, sans-serif';
  context.fillText('BIBOU KART', 512, 66);
  for (const offset of [20, 884])
    for (let x = 0; x < 4; x++)
      for (let y = 0; y < 3; y++) {
        context.fillStyle = (x + y) % 2 ? '#fff0ce' : '#233e47';
        context.fillRect(offset + x * 30, 19 + y * 30, 30, 30);
      }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.8),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  banner.position.set(0, 6, -0.28);
  banner.rotation.y = Math.PI;
  return banner;
}
