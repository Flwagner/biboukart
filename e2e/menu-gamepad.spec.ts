import { test, expect, type Page } from '@playwright/test';

test.setTimeout(180000);

// Only synthetic controller state is changed: no click, focus(), keyboard or selectOption().
async function tap(page: Page, button: number, pad = 0) {
  await page.evaluate(
    async ({ button, pad }) => {
      const p = (window as any).__menuPads[pad];
      p.buttons[button] = { pressed: true, value: 1 };
      await new Promise(requestAnimationFrame);
      p.buttons[button] = { pressed: false, value: 0 };
      await new Promise(requestAnimationFrame);
    },
    { button, pad },
  );
}
async function go(page: Page, selector: string, pad = 0) {
  for (let i = 0; i < 100; i++) {
    if (await page.locator(selector).evaluate((el) => el === document.activeElement)) return;
    await tap(page, 13, pad);
  }
  throw new Error(`Controller navigation could not reach ${selector}`);
}
async function choose(page: Page, selector: string, pad = 0) {
  await go(page, selector, pad);
  await tap(page, 0, pad);
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const makePad = (index: number) => ({
      index,
      connected: true,
      id: `Menu pad ${index}`,
      mapping: 'standard',
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
    });
    (window as any).__menuPads = [makePad(0), null, makePad(2)];
    Object.defineProperty(navigator, 'getGamepads', { value: () => (window as any).__menuPads });
  });
  await page.goto('/');
  await expect(page.locator('#play')).toBeVisible();
});

test('controller-only garage, race, pause, controller dialog, results and rematch', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await tap(page, 0);
  await expect(page.locator('[data-field="device"][data-player="0"]')).toHaveValue('pad:0');
  await go(page, '[data-field="character"][data-player="0"]');
  await tap(page, 15);
  await expect(page.locator('[data-field="character"][data-player="0"]')).toHaveValue('1');
  await expect(page.locator('[data-field="character"][data-player="0"]')).toBeFocused();
  await go(page, '[data-field="kart"][data-player="0"]');
  await tap(page, 0);
  await expect(page.locator('[data-field="kart"][data-player="0"]')).toHaveValue('1');
  await tap(page, 1);
  await expect(page.locator('#play')).toBeVisible();
  await tap(page, 0);
  await choose(page, '#next');
  await choose(page, '[data-track="4"]');
  await expect(page.locator('[data-track="4"]')).toBeFocused();
  await expect(page.locator('[data-track="4"]')).toHaveAttribute('aria-pressed', 'true');
  await go(page, '#difficulty');
  await tap(page, 15);
  await expect(page.locator('#difficulty')).toHaveValue('hard');
  await tap(page, 1);
  await expect(page.locator('#next')).toBeVisible();
  await choose(page, '#next');
  await choose(page, '#start');
  await expect(page.locator('.player-hud')).toHaveCount(1);
  await page.evaluate(() => {
    window.__bibou.race.countdown = 0;
    (window as any).__menuPads[0].buttons[7] = { pressed: true, value: 1 };
  });
  await expect
    .poll(() => page.evaluate(() => window.__bibou.race.racers[0].speed))
    .toBeGreaterThan(3);
  await page.evaluate(() => {
    (window as any).__menuPads[0].buttons[7] = { pressed: false, value: 0 };
  });
  await tap(page, 9);
  await expect(page.locator('#resume')).toBeFocused();
  await tap(page, 1);
  await expect(page.locator('#resume')).toHaveCount(0);
  await tap(page, 9);
  await choose(page, '#controllers');
  await expect(page.locator('[data-controller="0"]')).toBeVisible();
  await tap(page, 1);
  await expect(page.locator('#resume')).toBeVisible();
  await choose(page, '#controllers');
  await choose(page, '#confirm');
  await expect(page.locator('#resume')).toHaveCount(0);
  await page.evaluate(() => window.__bibou.finish());
  await expect(page.locator('#again')).toBeVisible();
  await choose(page, '#again');
  await expect(page.locator('.player-hud')).toHaveCount(1);
  await page.evaluate(() => window.__bibou.finish());
  await choose(page, '#circuits');
  await expect(page.locator('#start')).toBeVisible();
  await tap(page, 1);
  await tap(page, 1);
  await expect(page.locator('#play')).toBeVisible();
  expect(errors).toEqual([]);
});

test('controller-only settings, volume sliders, checkboxes, mapping and cancellation', async ({
  page,
}) => {
  await choose(page, '#settings');
  for (const selector of ['#volume', '#music-volume', '#effects-volume']) {
    await go(page, selector);
    const before = Number(await page.locator(selector).inputValue());
    await tap(page, 14);
    expect(Number(await page.locator(selector).inputValue())).toBeCloseTo(before - 0.05);
  }
  await go(page, '#quality');
  await tap(page, 14);
  await expect(page.locator('#quality')).toHaveValue('high');
  await choose(page, '#reduced');
  await expect(page.locator('#reduced')).toBeChecked();
  await choose(page, '[data-bind="0:0"]');
  await tap(page, 1);
  await expect(page.locator('#remap-status')).toBeEmpty();
  await choose(page, '[data-pad-bind="0:0"]');
  await page.waitForFunction(() => window.__bibou.inputs.padRemapReady);
  await page.evaluate(() => {
    (window as any).__menuPads[0].buttons[1] = { pressed: true, value: 1 };
  });
  await expect(page.locator('#pad-remap-cancel')).toBeHidden();
  await page.evaluate(async () => {
    (window as any).__menuPads[0].buttons[1] = { pressed: false, value: 0 };
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  await expect(page.locator('[data-pad-bind="0:0"]')).toContainText('B7 ·');
  await choose(page, '[data-pad-bind="0:4"]');
  await page.waitForFunction(() => window.__bibou.inputs.padRemapReady);
  await tap(page, 3);
  await expect(page.locator('[data-pad-bind="0:4"]')).toContainText('B3 ·');
  await choose(page, '[data-pad-reset="0"]');
  await expect(page.locator('[data-pad-bind="0:4"]')).toContainText('B2 ·');
  await tap(page, 1);
  await expect(page.locator('#play')).toBeVisible();
  await page.reload();
  await choose(page, '#settings');
  await expect(page.locator('#volume')).toHaveValue('0.25');
  await expect(page.locator('#quality')).toHaveValue('high');
  await expect(page.locator('#reduced')).toBeChecked();
});

test('any connected pad can navigate, configure split-screen and recover a disconnect', async ({
  page,
}) => {
  await tap(page, 0, 2);
  await expect(page.locator('[data-field="device"][data-player="0"]')).toHaveValue('pad:2');
  await choose(page, '[data-count="2"]', 2);
  await go(page, '[data-field="device"][data-player="1"]', 2);
  await tap(page, 15, 2); // keyboard → touch
  await tap(page, 15, 2); // touch → pad 0
  await expect(page.locator('[data-field="device"][data-player="1"]')).toHaveValue('pad:0');
  await choose(page, '#next', 2);
  await choose(page, '#start', 2);
  await expect(page.locator('.player-hud')).toHaveCount(2);
  await page.evaluate(() => {
    (window as any).__menuPads[2] = null;
    window.dispatchEvent(new Event('gamepaddisconnected'));
  });
  await expect(page.locator('#resume')).toBeVisible();
  await choose(page, '#controllers');
  await page.evaluate(() => {
    const p = (window as any).__menuPads[0];
    (window as any).__menuPads[2] = {
      ...p,
      index: 2,
      buttons: p.buttons.map(() => ({ pressed: false, value: 0 })),
      axes: [0, 0, 0, 0],
    };
    window.dispatchEvent(new Event('gamepadconnected'));
  });
  await expect(page.locator('[data-controller="0"] option[value="pad:2"]')).toHaveCount(1);
  await go(page, '[data-controller="0"]');
  for (
    let i = 0;
    i < 4 && (await page.locator('[data-controller="0"]').inputValue()) !== 'pad:2';
    i++
  )
    await tap(page, 15);
  await choose(page, '#confirm');
  await expect(page.locator('#resume')).toHaveCount(0);
  await tap(page, 9, 2);
  await expect(page.locator('#resume')).toBeVisible();
  await choose(page, '#quit', 2);
  await expect(page.locator('#play')).toBeVisible();
});

test('help and long content can be scrolled with the right stick and exited with B', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 400 });
  await choose(page, '#help');
  await expect(page.locator('.help')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => {
    (window as any).__menuPads[0].axes[3] = -1;
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before);
  await page.evaluate(() => {
    (window as any).__menuPads[0].axes[3] = 0;
  });
  await tap(page, 1);
  await expect(page.locator('#play')).toBeVisible();
});
