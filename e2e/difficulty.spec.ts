import { test, expect } from '@playwright/test';
test('bot difficulty is selected before racing, saved and retained for a rematch', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#play').click();
  await page.locator('#next').click();
  await expect(page.locator('#difficulty')).toHaveValue('normal');
  await page.locator('#difficulty').selectOption('hard');
  await page.reload();
  await page.locator('#play').click();
  await page.locator('#next').click();
  await expect(page.locator('#difficulty')).toHaveValue('hard');
  await page.locator('#start').click();
  expect(await page.evaluate(() => window.__bibou.race.difficulty)).toBe('hard');
  await page.evaluate(() => window.__bibou.finish());
  await expect(page.locator('.difficulty-result')).toHaveText('Bots : Difficile');
  await page.locator('#again').click();
  expect(await page.evaluate(() => window.__bibou.race.difficulty)).toBe('hard');
});
