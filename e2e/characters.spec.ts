import { test, expect } from '@playwright/test';
test('all eight characters and karts can be selected and restored', async ({ page }) => {
  await page.goto('/');
  await page.locator('#play').click();
  await expect(page.getByLabel('Personnage joueur 1').locator('option')).toHaveCount(8);
  await expect(page.getByLabel('Kart joueur 1').locator('option')).toHaveCount(8);
  for (let index = 0; index < 8; index++) {
    await page.getByLabel('Personnage joueur 1').selectOption(String(index));
    await page.getByLabel('Kart joueur 1').selectOption(String(index));
    await expect(page.locator('.kart-preview').first()).toBeVisible();
  }
  await page.locator('#next').click();
  await page.locator('#start').click();
  await expect(page.locator('#hud-0')).toContainText('🐷');
  await page.reload();
  await page.locator('#play').click();
  await expect(page.getByLabel('Personnage joueur 1')).toHaveValue('7');
  await expect(page.getByLabel('Kart joueur 1')).toHaveValue('7');
  await page.locator('#next').click();
  await page.locator('#start').click();
  await expect(page.locator('#hud-0')).toContainText('🐷');
});

test('Couscous the black rabbit and Raclette the white cat appear in garage, race and podium', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#play').click();
  await page.locator('[data-count="2"]').click();
  await page.getByLabel('Personnage joueur 1').selectOption('1');
  await page.getByLabel('Personnage joueur 2').selectOption('3');
  await expect(page.getByLabel('Personnage joueur 1')).toHaveValue('1');
  await expect(page.getByLabel('Personnage joueur 2')).toHaveValue('3');
  await expect(page.getByLabel('Personnage joueur 1').locator('option:checked')).toHaveText(
    'Couscous · Lapin',
  );
  await expect(page.getByLabel('Personnage joueur 2').locator('option:checked')).toHaveText(
    'Raclette · Chat',
  );
  await expect(
    page.locator('.character-preview [aria-label="Couscous, lapin noir"]'),
  ).toBeVisible();
  await expect(
    page.locator('.character-preview [aria-label="Raclette, chat blanc"]'),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/couscous-raclette-garage.png' });
  await page.locator('#next').click();
  await page.locator('#start').click();
  await expect(page.locator('#hud-0 [aria-label="Couscous, lapin noir"]')).toBeVisible();
  await expect(page.locator('#hud-1 [aria-label="Raclette, chat blanc"]')).toBeVisible();
  await page.evaluate(() => window.__bibou.finish());
  await expect(page.getByRole('heading', { name: 'Couscous remporte la course !' })).toBeVisible();
  await expect(page.locator('.leaderboard')).toContainText('Raclette');
  expect(
    await page.evaluate(() =>
      window.__bibou.renderer.podium.models
        .slice(0, 2)
        .map((m: any) =>
          m.userData.rig.driver.children.some(
            (part: any) =>
              part.material?.color?.getHexString() ===
              (m.userData.racerId === 0 ? '171a20' : 'f7f7f1'),
          ),
        ),
    ),
  ).toEqual([true, true]);
  await page.screenshot({ path: 'test-results/couscous-raclette-podium.png' });
});
