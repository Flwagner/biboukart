import { test, expect } from '@playwright/test';

for (const [index, name] of [
  [3, 'Col des flocons'],
  [4, 'Boulevard des bibous'],
] as const) {
  test(`${name}: menu, themed scenery and saved selection`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('.hero-sticker')).toContainText('5 circuits');
    await page.locator('#play').click();
    await page.locator('#next').click();
    await expect(page.locator('.track-card')).toHaveCount(5);
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await expect(page.locator(`[data-track="${index}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `test-results/destination-${index}-menu.png`, fullPage: true });
    await page.locator('#start').click();
    await expect(page.locator('#hud-0')).toBeVisible();
    expect(await page.evaluate(() => window.__bibou.race.track.index)).toBe(index);
    expect(await page.evaluate(() => Boolean(window.__bibou.renderer.snowfall))).toBe(index === 3);
    if (index === 3) {
      const before = await page.evaluate(() =>
        window.__bibou.renderer.snowfall.geometry.getAttribute('position').getY(0),
      );
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.__bibou.renderer.snowfall.geometry.getAttribute('position').getY(0),
          ),
        )
        .not.toBe(before);
      await page.evaluate(() => {
        window.__bibou.renderer.setQuality('low');
      });
      const still = await page.evaluate(() =>
        window.__bibou.renderer.snowfall.geometry.getAttribute('position').getY(0),
      );
      await page.evaluate(() => window.__bibou.renderer.render(0.1, 1));
      expect(
        await page.evaluate(() =>
          window.__bibou.renderer.snowfall.geometry.getAttribute('position').getY(0),
        ),
      ).not.toBe(still);
    }
    await page.screenshot({ path: `test-results/destination-${index}-race.png` });
    await page.reload();
    await page.locator('#play').click();
    await page.locator('#next').click();
    await expect(page.locator(`[data-track="${index}"]`)).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });
}
