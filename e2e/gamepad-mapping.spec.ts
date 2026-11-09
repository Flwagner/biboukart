import { test, expect, type Page } from '@playwright/test';

async function button(page: Page, index: number, pressed: boolean) {
  await page.evaluate(
    ({ index, pressed }) => {
      (window as any).__mappingPad.buttons[index] = { pressed, value: pressed ? 1 : 0 };
    },
    { index, pressed },
  );
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const pad = {
      index: 0,
      connected: true,
      id: 'Mapping test pad',
      mapping: 'standard',
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
    };
    (window as any).__mappingPad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
  });
  await page.goto('/');
  await page.locator('#settings').click();
});

test('custom gamepad buttons persist and drive, use items and pause in a race', async ({
  page,
}) => {
  for (const [action, index] of [
    [0, 4],
    [4, 3],
    [5, 8],
  ]) {
    await page.locator(`[data-pad-bind="0:${action}"]`).click();
    await expect
      .poll(() => page.evaluate(() => (window.__bibou.inputs as any).onPadRemap !== null))
      .toBe(true);
    // Let the capture observe neutral controls before pressing.
    await page.waitForFunction(() => (window.__bibou.inputs as any).padRemapReady);
    await button(page, index, true);
    await expect(page.locator(`[data-pad-bind="0:${action}"]`)).toContainText(`B${index} ·`);
    await button(page, index, false);
  }
  await page.reload();
  await page.locator('#settings').click();
  await expect(page.locator('[data-pad-bind="0:0"]')).toContainText('B4 ·');
  await expect(page.locator('[data-pad-bind="1:0"]')).toContainText('B7 ·');
  await page.locator('#back').click();
  await page.locator('#play').click();
  await page.getByLabel('Contrôleur joueur 1').selectOption('pad:0');
  await page.locator('#next').click();
  await page.locator('#start').click();
  await page.evaluate(() => {
    window.__bibou.race.countdown = 0;
  });
  await button(page, 4, true);
  await expect
    .poll(() => page.evaluate(() => window.__bibou.race.racers[0].speed))
    .toBeGreaterThan(3);
  await button(page, 4, false);
  await page.evaluate(() => {
    window.__bibou.race.racers[0].item = 'shield';
  });
  await button(page, 3, true);
  await expect.poll(() => page.evaluate(() => window.__bibou.race.racers[0].item)).toBeNull();
  await button(page, 3, false);
  await button(page, 8, true);
  await expect(page.locator('#resume')).toBeVisible();
  await button(page, 8, false);
  await expect.poll(() => page.evaluate(() => window.__bibou.state.pauseButtons[0])).toBe(false);
  await button(page, 8, true);
  await expect(page.locator('#resume')).not.toBeVisible();
});

test('captures sticks, rejects conflicts, cancels and restores defaults per player', async ({
  page,
}) => {
  await page.locator('[data-pad-bind="0:2"]').click();
  await page.waitForFunction(() => (window.__bibou.inputs as any).padRemapReady);
  await page.evaluate(() => {
    (window as any).__mappingPad.axes[2] = -0.9;
  });
  await expect(page.locator('[data-pad-bind="0:2"]')).toContainText('Axe 2 −');
  await page.evaluate(() => {
    (window as any).__mappingPad.axes[2] = 0;
  });
  await page.locator('[data-pad-bind="0:0"]').click();
  await page.waitForFunction(() => (window.__bibou.inputs as any).padRemapReady);
  await button(page, 2, true);
  await expect(page.locator('#pad-remap-status')).toContainText('déjà utilisée');
  await button(page, 2, false);
  await page.keyboard.press('a');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pad-remap-cancel')).toBeHidden();
  await expect(page.locator('[data-pad-bind="0:0"]')).toContainText('B7 ·');
  await page.locator('[data-pad-bind="0:4"]').click();
  await page.locator('#pad-remap-cancel').click();
  await expect(page.locator('#pad-remap-cancel')).toBeHidden();
  await page.locator('[data-pad-reset="0"]').click();
  await expect(page.locator('[data-pad-bind="0:2"]')).toContainText('Axe 0 −');
  await page.reload();
  await page.locator('#settings').click();
  await expect(page.locator('[data-pad-bind="0:2"]')).toContainText('Axe 0 −');
});
