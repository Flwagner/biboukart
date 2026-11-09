import { test, expect } from '@playwright/test';

test('new power and splash sounds render finite, non-clipping audio', async ({ page }) => {
  await page.goto('/');
  const levels = await page.evaluate(async () => {
    const { soundEffect } = await import('/src/sounds.ts');
    const { makeNoise } = await import('/src/synth.ts');
    const results = [];
    for (const sound of ['giant', 'shockwave', 'shockwaveImpact', 'splash', 'hit']) {
      const context = new OfflineAudioContext(1, 22050, 22050);
      soundEffect(context, context.destination, makeNoise(context), sound, 0);
      const buffer = await context.startRendering();
      let peak = 0,
        energy = 0;
      for (const sample of buffer.getChannelData(0)) {
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
      }
      results.push({ peak, energy });
    }
    return results;
  });
  for (const level of levels) {
    expect(Number.isFinite(level.energy)).toBe(true);
    expect(level.energy).toBeGreaterThan(0);
    expect(level.peak).toBeGreaterThan(0.01);
    expect(level.peak).toBeLessThan(1);
  }
});

test('a hit spins the visible kart without rotating its physics heading or camera', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#play').click();
  const result = await page.evaluate(() => {
    window.__bibou.start(1, 0);
    document.querySelector<HTMLButtonElement>('#pause')!.click();
    const { race, renderer } = window.__bibou;
    const r = race.racers[0];
    const heading = r.heading;
    const position = r.pos.clone();
    race.hit(r);
    renderer.render(0, 1, 0.425);
    const model = renderer.kartMeshes[0];
    const middle = {
      yaw: model.rotation.y - heading,
      lift: model.position.y - r.pos.y,
      visible: model.visible,
    };
    renderer.render(0, 1, 0.425);
    return {
      middle,
      end: {
        yaw: model.rotation.y - heading,
        lift: model.position.y - r.pos.y,
        visible: model.visible,
      },
      headingUnchanged: r.heading === heading,
      positionUnchanged: r.pos.equals(position),
    };
  });
  expect(result.middle.yaw).toBeCloseTo(Math.PI);
  expect(result.middle.lift).toBeCloseTo(0.3);
  expect(result.middle.visible).toBe(true);
  expect(result.end).toEqual({ yaw: 0, lift: 0, visible: true });
  expect(result.headingUnchanged).toBe(true);
  expect(result.positionUnchanged).toBe(true);
});

test('missile and oil puddle are visible ahead of the kart', async ({ page }) => {
  await page.goto('/');
  await page.locator('#play').click();
  await page.evaluate(() => {
    window.__bibou.start(1, 0);
    const { race, renderer } = window.__bibou;
    race.countdown = 0;
    race.elapsed = 5;
    race.racers.splice(1);
    race.pickups = [];
    race.obstacles = [];
    const r = race.racers[0],
      t = 0.04;
    r.pos.copy(race.track.at(t));
    r.previous.copy(r.pos);
    r.heading = Math.atan2(race.track.tangent(t).x, race.track.tangent(t).z);
    r.groundHeight = r.pos.y;
    for (const [index, kind] of ['missile', 'trap'].entries()) {
      const ahead = t + (8 + index * 2) / race.track.length;
      const pos = race.track.at(ahead),
        direction = race.track.tangent(ahead);
      pos.x += direction.z * (index === 0 ? -2 : 2);
      pos.z -= direction.x * (index === 0 ? -2 : 2);
      const surface = race.track.surface(pos);
      pos.y = surface.height;
      race.hazards.push({
        kind,
        owner: 0,
        pos,
        direction,
        ttl: 14,
        pitch:
          kind === 'trap'
            ? -Math.atan2(surface.tangent.y, Math.hypot(surface.tangent.x, surface.tangent.z))
            : 0,
        roll: kind === 'trap' ? surface.bank : 0,
      });
    }
    renderer.cameras[0].position.set(
      r.pos.x - Math.sin(r.heading) * 9,
      r.pos.y + 6.3,
      r.pos.z - Math.cos(r.heading) * 9,
    );
    document.querySelector<HTMLButtonElement>('#pause')!.click();
  });
  await expect.poll(() => page.evaluate(() => window.__bibou.renderer.hazardMeshes.length)).toBe(2);
  await page.screenshot({
    path: 'test-results/items-models.png',
    style: '#app { visibility: hidden; }',
  });
});

test('new gifts render, land and recover correctly in split screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#play').click();
  await page.evaluate(() => {
    window.__bibou.start(2, 0);
    const { race } = window.__bibou;
    race.countdown = 0;
    race.elapsed = 5;
    race.pickups = [];
    race.obstacles = [];
    race.racers.forEach((r: any) => {
      r.human = true;
      r.speed = 0;
    });
    const r = race.racers[0];
    r.item = 'giant';
    race.use(r);
    for (let i = 0; i < 30; i++) race.update(1 / 60, []);
    const other = race.racers[1];
    other.item = 'shockwave';
    race.use(other);
    for (const item of ['missile', 'trap']) {
      r.itemCooldown = 0;
      r.item = item;
      race.use(r);
    }
    document.querySelector<HTMLButtonElement>('#pause')!.click();
  });
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.kartMeshes[0].scale.x))
    .toBe(2);
  await expect.poll(() => page.evaluate(() => window.__bibou.renderer.hazardMeshes.length)).toBe(2);
  const models = await page.evaluate(() => {
    const { renderer } = window.__bibou;
    return renderer.hazardMeshes.map((root: any) =>
      root.children.map((child: any) => child.visible),
    );
  });
  expect(models).toEqual([
    [true, false],
    [false, true],
  ]);
  await page.screenshot({
    path: 'test-results/items-split.png',
    style: '#app { visibility: hidden; }',
  });
  await page.evaluate(() => {
    const { race } = window.__bibou;
    for (let i = 0; i < 52; i++) race.update(1 / 60, []);
  });
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.effects.karts[1].shock.visible))
    .toBe(true);
  await page.screenshot({
    path: 'test-results/items-shockwave.png',
    style: '#app { visibility: hidden; }',
  });
  expect(
    await page.evaluate(() => {
      const { race, renderer } = window.__bibou;
      renderer.setQuality('low');
      race.racers[1].shockPulse = 0.5;
      renderer.render(0, 1, 0);
      return renderer.effects.karts[1].dust.visible;
    }),
  ).toBe(true);
  expect(errors).toEqual([]);
});
