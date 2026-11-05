import { test, expect, type Page } from '@playwright/test';
declare global {
  interface Window {
    __bibou: any;
  }
}
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('#play')).toBeVisible();
}
// Optional regression stress: emulate a renderer slower than the old fixed sleeps.
test.beforeEach(async ({ page }) => {
  const delay = Number(process.env.E2E_FRAME_DELAY_MS ?? 0);
  if (Number.isFinite(delay) && delay > 0) {
    await page.addInitScript((delay) => {
      const requestFrame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        requestFrame(() => {
          window.setTimeout(() => callback(performance.now()), delay);
        });
    }, delay);
  }
});
test('full menu → selection → keyboard driving → pause → results → rematch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.locator('#play').click();
  await expect(page.getByRole('heading', { name: 'Qui prend le volant ?' })).toBeVisible();
  await page.getByLabel('Personnage joueur 1').selectOption('3');
  await page.getByLabel('Kart joueur 1').selectOption('2');
  await page.locator('#next').click();
  await page.locator('[data-track="1"]').click();
  await page.locator('#start').click();
  await expect(page.locator('.player-hud')).toHaveCount(1);
  await page.evaluate(() => {
    window.__bibou.race.countdown = 0;
  });
  await page.keyboard.down('w');
  await expect
    .poll(() => page.evaluate(() => window.__bibou.race.racers[0].speed))
    .toBeGreaterThan(4);
  const beforeLeft = await page.evaluate(() => window.__bibou.race.racers[0].heading);
  await page.keyboard.down('a');
  await expect
    .poll(() =>
      page.evaluate((heading) => {
        const delta = window.__bibou.race.racers[0].heading - heading;
        return Math.atan2(Math.sin(delta), Math.cos(delta));
      }, beforeLeft),
    )
    .toBeGreaterThan(0.02);
  await page.keyboard.up('a');
  const beforeRight = await page.evaluate(() => window.__bibou.race.racers[0].heading);
  await page.keyboard.down('d');
  await expect
    .poll(() =>
      page.evaluate((heading) => {
        const delta = heading - window.__bibou.race.racers[0].heading;
        return Math.atan2(Math.sin(delta), Math.cos(delta));
      }, beforeRight),
    )
    .toBeGreaterThan(0.02);
  await page.keyboard.up('d');
  await page.keyboard.up('w');
  await page.keyboard.press('Escape');
  await expect(page.locator('#resume')).toBeVisible();
  expect(await page.evaluate(() => window.__bibou.state.paused)).toBe(true);
  await page.locator('#resume').click();
  await page.evaluate(() => window.__bibou.finish());
  await expect(page.locator('.leaderboard>div')).toHaveCount(6);
  await page.locator('#again').click();
  await expect(page.locator('.player-hud')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('four split-screen views, independent controls and stable resource counts', async ({
  page,
}) => {
  await ready(page);
  await page.locator('#play').click();
  await page.locator('[data-count="4"]').click();
  await expect(page.locator('.player-card')).toHaveCount(4);
  await page.locator('#next').click();
  await page.locator('#start').click();
  await expect(page.locator('.player-hud')).toHaveCount(4);
  await page.evaluate(() => {
    window.__bibou.race.countdown = 0;
  });
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(() => page.evaluate(() => window.__bibou.race.racers[1].speed))
    .toBeGreaterThan(3);
  expect(await page.evaluate(() => window.__bibou.race.racers[0].speed)).toBe(0);
  await page.keyboard.up('ArrowUp');
  await page.screenshot({ path: 'test-results/four-players.png' });
  const geometries: number[] = [];
  for (let i = 0; i < 6; i++) {
    const previousFrame = await page.evaluate((i) => {
      const frame = window.__bibou.renderer.renderer.info.render.frame;
      window.__bibou.start(4, i % 3);
      // Keep the same scene throughout measurement, independent of CI frame rate.
      window.__bibou.race.countdown = Infinity;
      return frame;
    }, i);
    await page.waitForFunction((previousFrame) => {
      const info = window.__bibou.renderer.renderer.info;
      return info.render.frame > previousFrame && info.memory.geometries > 0;
    }, previousFrame);
    geometries.push(
      await page.evaluate(() => window.__bibou.renderer.renderer.info.memory.geometries),
    );
  }
  console.log('GPU geometries across repeated tracks:', geometries);
  for (let i = 0; i < 3; i++) expect(Math.abs(geometries[i] - geometries[i + 3])).toBeLessThan(3);
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  await expect(page.locator('#play')).toBeVisible();
});
test('settings survive reload and physical keys can be remapped', async ({ page }) => {
  await ready(page);
  await page.locator('#settings').click();
  await page.locator('[data-bind="0:0"]').click();
  await page.keyboard.press('z');
  await expect(page.locator('[data-bind="0:0"]')).toContainText('Z');
  await page.locator('#quality').selectOption('low');
  await page.locator('#reduced').check();
  await page.locator('#back').click();
  await page.reload();
  await page.locator('#settings').click();
  await expect(page.locator('#quality')).toHaveValue('low');
  await expect(page.locator('#reduced')).toBeChecked();
  await expect(page.locator('[data-bind="0:0"]')).toContainText('Z');
});
test('synthetic gamepads cannot be assigned to two players', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          index: 0,
          connected: true,
          id: 'Test pad',
          axes: [0, 0],
          buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
          mapping: 'standard',
          timestamp: 0,
        },
      ],
    });
  });
  await ready(page);
  await page.locator('#play').click();
  await page.locator('[data-count="2"]').click();
  await page.getByLabel('Contrôleur joueur 1').selectOption('pad:0');
  await page.getByLabel('Contrôleur joueur 2').selectOption('pad:0');
  await page.locator('#next').click();
  await expect(page.locator('#setup-error')).toContainText('un seul pilote');
});
test('gamepad throttle, Start pause/resume and disconnect recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = {
      index: 0,
      connected: true,
      id: 'Synthetic standard controller',
      axes: [0, 0],
      buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
      mapping: 'standard',
      timestamp: 0,
    };
    (window as any).__testpad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => (pad.connected ? [pad] : []) });
  });
  await ready(page);
  await page.locator('#play').click();
  await page.getByLabel('Contrôleur joueur 1').selectOption('pad:0');
  await page.locator('#next').click();
  await page.locator('#start').click();
  await page.evaluate(() => {
    window.__bibou.race.countdown = 0;
    (window as any).__testpad.buttons[7] = { pressed: true, value: 1 };
  });
  await expect
    .poll(() => page.evaluate(() => window.__bibou.race.racers[0].speed))
    .toBeGreaterThan(3);
  await page.evaluate(() => {
    (window as any).__testpad.buttons[9].pressed = true;
  });
  await expect(page.locator('#resume')).toBeVisible();
  await page.evaluate(() => {
    (window as any).__testpad.buttons[9].pressed = false;
  });
  // Wait for the actual input poll, not a wall-clock delay between two presses.
  await expect.poll(() => page.evaluate(() => window.__bibou.state.pauseButtons[0])).toBe(false);
  await page.evaluate(() => {
    (window as any).__testpad.buttons[9].pressed = true;
  });
  await expect(page.locator('#resume')).not.toBeVisible();
  await page.evaluate(() => {
    (window as any).__testpad.connected = false;
    window.dispatchEvent(new Event('gamepaddisconnected'));
  });
  await expect(page.locator('#controllers')).toBeVisible();
  await page.locator('#controllers').click();
  await page.locator('[data-controller="0"]').selectOption('keyboard');
  await page.locator('#confirm').click();
  await expect(page.locator('#resume')).not.toBeVisible();
});
test('turbo and gift feedback follows actual pickups, expires and respects reduced effects', async ({
  page,
}) => {
  await ready(page);
  await page.locator('#play').click();
  await page.locator('#next').click();
  await page.locator('#start').click();
  await page.evaluate(() => {
    const { race } = window.__bibou,
      racer = race.racers[0];
    race.countdown = 0;
    race.elapsed = 5;
    racer.pos.copy(race.pickups[0].pos);
    racer.previous.copy(racer.pos);
    race.update(1 / 60, []);
    window.__bibou.renderer.effects.update(0.2, race.racers, false);
  });
  await expect(page.locator('#hud-0')).toHaveClass(/collecting/);
  await page.locator('#pause').click();
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.effects.stars.visible))
    .toBe(true);
  expect(await page.evaluate(() => !!window.__bibou.race.racers[0].item)).toBe(true);
  await page.screenshot({
    path: 'test-results/gift-effect.png',
    style: '#app { visibility: hidden; }',
  });
  await page.evaluate(() => {
    const { race, renderer } = window.__bibou,
      racer = race.racers[0];
    renderer.effects.update(1.1, race.racers, false);
    racer.pos.copy(race.track.at(race.boosts[0]));
    racer.previous.copy(racer.pos);
    const tangent = race.track.tangent(race.boosts[0]);
    racer.heading = Math.atan2(tangent.x, tangent.z);
    race.update(1 / 60, []);
  });
  await page.locator('#resume').click();
  await expect(page.locator('#hud-0')).toHaveClass(/boosting/);
  await page.locator('#pause').click();
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.effects.karts[0].trail.visible))
    .toBe(true);
  expect(await page.evaluate(() => window.__bibou.renderer.effects.stars.visible)).toBe(false);
  await page.screenshot({
    path: 'test-results/turbo-effect.png',
    style: '#app { visibility: hidden; }',
  });
  await page.evaluate(() => window.__bibou.renderer.setQuality('low', true));
  await expect
    .poll(() => page.evaluate(() => window.__bibou.renderer.effects.karts[0].trail.visible))
    .toBe(false);
  expect(await page.evaluate(() => window.__bibou.renderer.effects.karts[0].ring.visible)).toBe(
    true,
  );
  await page.locator('#quit').click();
  expect(await page.evaluate(() => window.__bibou.renderer.effects)).toBeNull();
});
test.describe('mobile landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('two touch players, simultaneous pointers, rotation and interruption', async ({ page }) => {
    await ready(page);
    await page.locator('#play').click();
    await expect(page.locator('[data-count]')).toHaveCount(2);
    await page.locator('[data-count="2"]').click();
    await page.locator('#next').click();
    await page.locator('#start').click();
    await expect(page.locator('.touch-controls')).toHaveCount(2);
    await page.evaluate(() => {
      window.__bibou.race.countdown = 0;
    });
    // Synthetic PointerEvents cover state isolation; physical multitouch still needs a device.
    await page
      .locator('[data-player="0"][data-action="throttle"]')
      .dispatchEvent('pointerdown', { pointerId: 11, pointerType: 'touch', bubbles: true });
    await page
      .locator('[data-player="1"][data-action="throttle"]')
      .dispatchEvent('pointerdown', { pointerId: 12, pointerType: 'touch', bubbles: true });
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.min(window.__bibou.race.racers[0].speed, window.__bibou.race.racers[1].speed),
        ),
      )
      .toBeGreaterThan(3);
    await page.dispatchEvent('body', 'pointerup', { pointerId: 11 });
    await page.dispatchEvent('body', 'pointerup', { pointerId: 12 });
    await page.screenshot({ path: 'test-results/mobile-two-players.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.orientation')).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('.orientation')).not.toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#resume')).toBeVisible();
  });
});
