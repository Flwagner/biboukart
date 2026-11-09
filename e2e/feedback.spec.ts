import { expect, test } from '@playwright/test';

test('rendered kart completes a 360 on impact and turbo flames survive the new lighting', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('biboukart-v1', JSON.stringify({ reduced: true, quality: 'low' }));
  });
  await page.goto('/');
  await page.locator('#settings').click();
  await expect(page.locator('#reduced')).toHaveCount(0);
  await expect(page.getByText('Réduire les animations', { exact: true })).toHaveCount(0);
  await page.locator('#back').click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('biboukart-v1')!).reduced),
  ).toBeUndefined();
  await page.locator('#play').click();
  await page.locator('#next').click();
  await page.locator('#start').click();
  await page.locator('#pause').click();
  const impact = await page.evaluate(() => {
    const { race, renderer } = window.__bibou;
    renderer.setQuality('low');
    const racer = race.racers[0];
    race.onEvent = () => {};
    racer.immune = racer.shield = 0;
    race.hit(racer);
    const heading = racer.heading;
    renderer.render(0.425, 1, 0.425);
    const half = renderer.kartMeshes[0].rotation.y - heading;
    renderer.render(0.424, 1, 0.424);
    const last = renderer.kartMeshes[0].rotation.y - heading;
    renderer.render(0.001, 1, 0.001);
    return {
      half,
      last,
      end: renderer.kartMeshes[0].rotation.y - heading,
      headingUnchanged: heading === racer.heading,
    };
  });
  expect(impact.half).toBeCloseTo(Math.PI);
  expect(impact.last).toBeGreaterThan(Math.PI * 1.99);
  expect(impact.end).toBe(0);
  expect(impact.headingUnchanged).toBe(true);
  const flame = await page.evaluate(() => {
    const { race, renderer } = window.__bibou;
    race.countdown = 0;
    const racer = race.racers[0];
    racer.boost = 2;
    // Clear the starting grid for a legible visual fixture, without moving the player.
    for (const other of race.racers.slice(1)) {
      other.pos.x += 80;
      other.previous.copy(other.pos);
    }
    renderer.render(1, 1, 0.1);
    const trail = renderer.effects.karts[0].trail;
    return {
      visible: trail.visible,
      children: trail.children.length,
      toneMapped: trail.children[0].material.toneMapped,
    };
  });
  expect(flame).toEqual({ visible: true, children: 4, toneMapped: false });
  await page.screenshot({
    path: 'test-results/restored-turbo-flames.png',
    style: '#app { visibility: hidden; }',
  });
  await page.evaluate(() => {
    const { race, renderer } = window.__bibou;
    race.racers[0].boost = 0;
    renderer.render(0, 1, 0);
  });
  expect(await page.evaluate(() => window.__bibou.renderer.effects.karts[0].trail.visible)).toBe(
    false,
  );
  expect(errors).toEqual([]);
});
