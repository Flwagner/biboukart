import { expect, test } from '@playwright/test';

for (const index of [1, 2, 3, 4]) {
  test(`finished circuit ${index}: solo high quality and four low-quality views`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/');
    await page.evaluate((index) => {
      window.__bibou.renderer.setQuality('high');
      window.__bibou.start(1, index);
    }, index);
    await page.locator('#pause').click();
    const art = await page.evaluate(() => {
      const { race, renderer } = window.__bibou;
      const r = race.racers[0],
        t = 0.08;
      race.countdown = 0;
      document.querySelectorAll('[data-center]').forEach((el) => {
        el.textContent = '';
      });
      r.pos.copy(race.track.at(t));
      r.previous.copy(r.pos);
      r.groundHeight = r.pos.y;
      const tangent = race.track.tangent(t);
      r.heading = Math.atan2(tangent.x, tangent.z);
      for (const other of race.racers.slice(1)) {
        other.pos.set(10000 + other.id * 5, other.pos.y, 10000);
        other.previous.copy(other.pos);
      }
      renderer.render(1, 1, 0);
      return {
        details: renderer.biome.footprints.length,
        high: renderer.renderer.shadowMap.enabled,
        attached: renderer.biome.animated.parent === renderer.world,
        meshes: renderer.renderer.info.memory.geometries,
      };
    });
    expect(art.details).toBeGreaterThan(15);
    expect(art.high).toBe(true);
    expect(art.attached).toBe(true);
    expect(art.meshes).toBeLessThan(350);
    await page.screenshot({
      path: `test-results/circuit-art-${index}-solo.png`,
      style: '#app { visibility:hidden; }',
    });
    await page.evaluate((index) => {
      window.__bibou.renderer.setQuality('low');
      window.__bibou.start(4, index);
    }, index);
    await page.locator('#pause').click();
    await expect(page.locator('.player-hud')).toHaveCount(4);
    expect(await page.evaluate(() => window.__bibou.renderer.renderer.shadowMap.enabled)).toBe(
      false,
    );
    await page.screenshot({
      path: `test-results/circuit-art-${index}-four.png`,
      style: '#app { visibility:hidden; }',
    });
    expect(errors).toEqual([]);
  });
}

for (const indices of [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 0],
]) {
  test(`sculpted pilots and karts ${indices.join('-')}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__bibou.start(1, 0));
    await page.locator('#pause').click();
    const models = await page.evaluate((indices) => {
      const { race, renderer } = window.__bibou;
      renderer.setQuality('high');
      race.racers.forEach((r: any, i: number) => {
        r.progress = 6 - i;
      });
      indices.forEach((index, i) => {
        race.racers[i].config = { ...race.racers[i].config, character: index, kart: index };
      });
      renderer.showPodium(race);
      renderer.render(0.1, 1, 0);
      return renderer.podium.models.map((model: any) => ({
        wheels: model.userData.rig.wheels.length,
        driver: model.userData.rig.driver.children.length,
      }));
    }, indices);
    expect(models).toHaveLength(3);
    for (const model of models) {
      expect(model.wheels).toBe(4);
      expect(model.driver).toBeGreaterThan(3);
    }
    await page.screenshot({
      path: `test-results/roster-art-${indices.join('-')}.png`,
      style: '#app, #hud { visibility:hidden; }',
    });
  });
}

test('biome animations freeze in pause and repeated destinations release their GPU resources', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto('/');
  const resources: { textures: number; geometries: number }[] = [];
  for (const index of [1, 2, 3, 4, 1, 2, 3, 4]) {
    const values = await page.evaluate((index) => {
      const { renderer } = window.__bibou;
      renderer.setQuality('low');
      window.__bibou.start(1, index);
      renderer.render(0, 1, 0);
      renderer.biome.update(0.2);
      const moving = renderer.biome.animated;
      const before = moving.children.map((o: any) => o.position.toArray().join(','));
      renderer.biome.update(0);
      const after = moving.children.map((o: any) => o.position.toArray().join(','));
      return { ...renderer.renderer.info.memory, frozen: before.join('|') === after.join('|') };
    }, index);
    expect(values.frozen).toBe(true);
    resources.push(values);
  }
  console.log('GPU resources across two biome cycles:', resources);
  for (let i = 0; i < 4; i++) {
    expect(resources[i + 4].textures).toBe(resources[i].textures);
    expect(Math.abs(resources[i + 4].geometries - resources[i].geometries)).toBeLessThan(3);
  }
});

test.describe('mobile biome presentation', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  test('two touch views keep the city detail and the mobile shadow budget', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.evaluate(() => {
      window.__bibou.renderer.setQuality('auto');
      window.__bibou.start(2, 4);
    });
    await expect(page.locator('.player-hud')).toHaveCount(2);
    await expect(page.locator('.touch-controls')).toHaveCount(2);
    await expect
      .poll(() => page.evaluate(() => window.__bibou.renderer.renderer.shadowMap.enabled))
      .toBe(false);
    expect(
      await page.evaluate(() => window.__bibou.renderer.biome.footprints.length),
    ).toBeGreaterThan(15);
    await page.screenshot({ path: 'test-results/circuit-art-city-mobile.png' });
    expect(errors).toEqual([]);
  });
});
