import { test, expect } from '@playwright/test';
test('braking illuminates only the current kart rear lights and releases to dim red', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#play').click();
  await page.locator('[data-count="2"]').click();
  await page.locator('#next').click();
  await page.locator('#start').click();
  await page.evaluate(() => {
    const race = window.__bibou.race;
    race.countdown = 0;
    race.racers[0].speed = 8;
    race.racers[1].speed = 8;
  });
  const color = (id: number) =>
    page.evaluate(
      (id) =>
        window.__bibou.renderer.kartMeshes[id].userData.rig.rearLightMaterial.color.getHexString(),
      id,
    );
  await page.keyboard.down('s');
  await expect.poll(() => color(0)).toBe('ff5148');
  expect(await color(1)).toBe('842833');
  await page.screenshot({ path: 'test-results/brake-lights.png' });
  await page.keyboard.up('s');
  await expect.poll(() => color(0)).toBe('842833');
  await page.keyboard.down('ArrowDown');
  await expect.poll(() => color(1)).toBe('ff5148');
  expect(await color(0)).toBe('842833');
  await page.evaluate(() => window.__bibou.renderer.setQuality('low'));
  await expect.poll(() => color(1)).toBe('ff5148');
  const wheel = await page.evaluate(() => {
    const mesh = window.__bibou.renderer.kartMeshes[0].userData.rig.steering;
    return { x: mesh.position.x, z: mesh.position.z, color: mesh.material.color.getHexString() };
  });
  expect(wheel).toEqual({ x: 0, z: 0.85, color: '15191e' });
  await page.keyboard.up('ArrowDown');
  await expect.poll(() => color(1)).toBe('842833');
});
