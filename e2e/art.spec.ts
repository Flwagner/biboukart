import { expect, test } from '@playwright/test';

test('toy presentation and low-quality fallback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await page.locator('#play').click();
  await page.getByLabel('Personnage joueur 1').selectOption('0');
  await page.getByLabel('Kart joueur 1').selectOption('0');
  await page.locator('#next').click();
  await page.locator('#start').click();
  await page.evaluate(() => {
    const { renderer, race } = window.__bibou;
    renderer.setQuality('high');
    race.countdown = 0;
    renderer.render(1, 1, 0);
  });
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.renderer.shadowMap.enabled))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.sun.shadow.mapSize.x))
    .toBe(2048);
  await page.screenshot({ path: 'test-results/art-prairie-high.png' });
  const presentation = await page.evaluate(() => {
    const { renderer } = window.__bibou;
    return {
      supersampling: renderer.renderer.getPixelRatio() > 1,
      gradient: renderer.scene.background.isDataTexture,
      clusteredDecor: !!renderer.world.getObjectByName('meadow-details'),
      shadows: renderer.kartMeshes[0].children.some((child: any) => child.castShadow),
    };
  });
  expect(presentation).toEqual({
    supersampling: true,
    gradient: true,
    clusteredDecor: true,
    shadows: true,
  });
  const materialVersion = await page.evaluate(
    () =>
      window.__bibou.renderer.kartMeshes[0].children.find(
        (child: any) => child.isMesh && child.castShadow,
      ).material.version,
  );
  await page.evaluate(() => window.__bibou.renderer.setQuality('low'));
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.renderer.shadowMap.enabled))
    .toBe(false);
  await page.screenshot({ path: 'test-results/art-prairie-low.png' });
  expect(
    await page.evaluate(
      () =>
        window.__bibou.renderer.kartMeshes[0].children.find(
          (child: any) => child.isMesh && child.castShadow,
        ).material.version,
    ),
  ).toBeGreaterThan(materialVersion);
  await page.evaluate(() => window.__bibou.renderer.setQuality('high'));
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.renderer.shadowMap.enabled))
    .toBe(true);
  expect(errors).toEqual([]);
});

test('four views retain contact shadows without rendering a shadow map', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => {
    window.__bibou.renderer.setQuality('high');
    window.__bibou.start(4, 0);
  });
  await expect(page.locator('.player-hud')).toHaveCount(4);
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.renderer.shadowMap.enabled))
    .toBe(false);
  await page.screenshot({ path: 'test-results/art-prairie-four.png' });
  expect(errors).toEqual([]);
});

test('two views share a single directional-shadow pass', async ({ page }) => {
  await page.goto('/');
  const passes = await page.evaluate(() => {
    window.__bibou.start(2, 0);
    const { renderer } = window.__bibou;
    renderer.setQuality('high');
    const shadow = renderer.sun.shadow;
    const update = shadow.updateMatrices;
    let passes = 0;
    shadow.updateMatrices = function (...args: any[]) {
      passes++;
      return update.apply(this, args);
    };
    try {
      renderer.render(0, 1, 0);
      return passes;
    } finally {
      shadow.updateMatrices = update;
    }
  });
  expect(passes).toBe(1);
});

test('rebuilding art releases world textures as well as geometry', async ({ page }) => {
  await page.goto('/');
  const textures: number[] = [];
  for (let i = 0; i < 6; i++) {
    const frame = await page.evaluate((i) => {
      const { renderer } = window.__bibou;
      const frame = renderer.renderer.info.render.frame;
      window.__bibou.start(1, i % 3);
      window.__bibou.race.countdown = Infinity;
      return frame;
    }, i);
    await page.waitForFunction(
      (frame) => window.__bibou.renderer.renderer.info.render.frame > frame,
      frame,
    );
    textures.push(await page.evaluate(() => window.__bibou.renderer.renderer.info.memory.textures));
  }
  console.log('GPU textures across repeated tracks:', textures);
  for (let i = 0; i < 3; i++) expect(textures[i + 3]).toBe(textures[i]);
});
