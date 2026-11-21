import { expect, test } from '@playwright/test';

test('the miniature house circuit: menu card, table start and every room', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await page.locator('#play').click();
  await page.locator('#next').click();
  await expect(page.locator('.track-card')).toHaveCount(8);
  await page.getByRole('button', { name: /Maison des miettes/ }).click();
  await expect(page.locator('[data-track="5"]')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/house-menu.png', fullPage: true });

  await page.evaluate(() => window.__bibou.start(1, 5));
  await page.locator('#pause').click();
  const state = await page.evaluate(() => {
    const { race, renderer } = window.__bibou;
    return {
      track: race.track.index,
      table: race.track.at(0).y,
      floor: race.track.at(0.5).y,
      footprints: renderer.biome.footprints.length,
      rooms: ['breakfast-table', 'hallway', 'wc', 'bedroom', 'living-room'].filter((name) =>
        Boolean(renderer.biome.group.getObjectByName(name)),
      ),
      obstacle: race.obstacles[0].kind,
    };
  });
  expect(state.track).toBe(5);
  expect(state.table).toBeCloseTo(11, 1);
  expect(state.floor).toBeLessThan(4);
  expect(state.footprints).toBeGreaterThan(15);
  expect(state.rooms).toEqual(['breakfast-table', 'hallway', 'wc', 'bedroom', 'living-room']);
  expect(state.obstacle).toBe('jam');

  for (const [name, t] of [
    ['table', 0.0],
    ['hallway', 0.12],
    ['wc', 0.32],
    ['bedroom', 0.49],
    ['living-room', 0.68],
  ] as const) {
    await page.evaluate((t) => {
      const { race, renderer } = window.__bibou;
      const r = race.racers[0];
      race.countdown = 0;
      document.querySelectorAll('[data-center]').forEach((el) => {
        el.textContent = '';
      });
      r.pos.copy(race.track.at(t));
      r.previous.copy(r.pos);
      r.groundHeight = r.pos.y;
      const tangent = race.track.tangent(t);
      r.heading = Math.atan2(tangent.x, tangent.z);
      for (const other of race.racers.slice(1)) {
        other.pos.set(10000 + other.id * 5, other.pos.y, 10000);
        other.previous.copy(other.pos);
      }
      renderer.render(1, 1, 0);
    }, t);
    await page.screenshot({
      path: `test-results/house-${name}.png`,
      style: '#app { visibility:hidden; }',
    });
  }
  expect(errors).toEqual([]);
});
