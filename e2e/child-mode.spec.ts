import { expect, test } from '@playwright/test';

for (const mobile of [false, true]) {
  test.describe(mobile ? 'child mode on touch' : 'child mode on desktop', () => {
    test.use(
      mobile ? { viewport: { width: 960, height: 600 }, hasTouch: true, isMobile: true } : {},
    );
    test('persists per player, drives automatically and respects pause', async ({ page }) => {
      await page.goto('/');
      await page.locator('#play').click();
      await page.locator('[data-count="2"]').click();
      const first = page.getByRole('checkbox', { name: 'Mode enfant joueur 1', exact: true });
      const second = page.getByRole('checkbox', { name: 'Mode enfant joueur 2', exact: true });
      await expect(first).not.toBeChecked();
      await second.focus();
      await page.keyboard.press('Space');
      await expect(second).toBeChecked();
      // Re-rendering the garage must preserve the toggle.
      await page.getByLabel('Kart joueur 2', { exact: true }).selectOption('2');
      await expect(second).toBeChecked();
      await page.reload();
      await page.locator('#play').click();
      await expect(first).not.toBeChecked();
      await expect(second).toBeChecked();
      await page.locator('#next').click();
      await page.locator('#start').click();
      await expect(page.locator('.player-hud')).toHaveCount(2);
      await page.evaluate(() => {
        window.__bibou.race.countdown = 0;
      });
      await expect
        .poll(() => page.evaluate(() => window.__bibou.race.racers[1].speed))
        .toBeGreaterThan(4);
      expect(await page.evaluate(() => window.__bibou.race.racers[0].speed)).toBe(0);
      await page.keyboard.press('Escape');
      await expect(page.locator('#resume')).toBeVisible();
      const position = await page.evaluate(() => window.__bibou.race.racers[1].pos.toArray());
      // Two animation frames while paused must not run the assistance or physics.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(await page.evaluate(() => window.__bibou.race.racers[1].pos.toArray())).toEqual(
        position,
      );
      await page.locator('#resume').click();
      await expect(page.locator('#resume')).not.toBeVisible();
    });
  });
}
