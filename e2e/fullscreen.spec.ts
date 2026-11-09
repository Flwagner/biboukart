import { test, expect } from '@playwright/test';

test('play enters fullscreen and the pause menu can exit and re-enter it', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.locator('#play').click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === document.documentElement))
    .toBe(true);
  await page.locator('#next').click();
  await page.locator('#start').click();
  await page.locator('#pause').click();
  await page.getByRole('button', { name: 'Quitter le plein écran', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.getByRole('button', { name: 'Plein écran', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === document.documentElement))
    .toBe(true);
});

for (const mode of ['denied', 'unsupported']) {
  test(`play still opens the garage when fullscreen is ${mode}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      Object.defineProperty(document, 'fullscreenEnabled', { value: mode !== 'unsupported' });
      Element.prototype.requestFullscreen = () =>
        Promise.reject(new Error('Fullscreen denied'));
    }, mode);
    await page.goto('/');
    await page.locator('#play').click();
    await expect(page.getByRole('heading', { name: 'Qui prend le volant ?' })).toBeVisible();
    await page.locator('#next').click();
    await page.locator('#start').click();
    await expect(page.locator('.player-hud')).toHaveCount(1);
    expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(true);
    expect(errors).toEqual([]);
  });
}
