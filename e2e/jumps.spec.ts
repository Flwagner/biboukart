import { test, expect } from '@playwright/test';
for (const index of [0, 1, 2])
  test(`track ${index}: real jump, grounded shadow and safe landing`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.locator('#play').click();
    const air = await page.evaluate((index) => {
      window.__bibou.start(1, index);
      const { race, renderer } = window.__bibou,
        r = race.racers[0];
      race.racers.splice(1);
      race.pickups = [];
      race.countdown = 0;
      race.elapsed = 5;
      const start = race.track.bumps[0].t - 8 / race.track.length;
      r.pos.copy(race.track.at(start));
      r.previous.copy(r.pos);
      r.progress = start;
      r.lastT = start;
      r.checkpoint = Math.floor(start * 8);
      r.speed = 26;
      const tangent = race.track.tangent(start);
      r.heading = Math.atan2(tangent.x, tangent.z);
      for (let i = 0; i < 180; i++) {
        race.update(1 / 60, [race.ai(r, false)]);
        if (r.airborne && r.pos.y - r.groundHeight > 0.8) break;
      }
      renderer.cameras[0].position.set(
        r.pos.x - Math.sin(r.heading) * 9,
        r.pos.y + 6.3,
        r.pos.z - Math.cos(r.heading) * 9,
      );
      document.querySelector<HTMLButtonElement>('#pause')!.click();
      return { airborne: r.airborne, clearance: r.pos.y - r.groundHeight, takeoffs: r.takeoffs };
    }, index);
    expect(air.airborne).toBe(true);
    expect(air.clearance).toBeGreaterThan(0.8);
    expect(air.takeoffs).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const mesh = window.__bibou.renderer.kartMeshes[0];
          return mesh.position.y - mesh.userData.rig.shadow.position.y;
        }),
      )
      .toBeGreaterThan(0.6);
    await page.screenshot({
      path: `test-results/jump-${index}.png`,
      style: '#app { visibility: hidden; }',
    });
    await page.evaluate(() => window.__bibou.renderer.setQuality('low', true));
    expect(await page.evaluate(() => window.__bibou.race.racers[0].airborne)).toBe(true);
    await page.locator('#resume').click();
    const landing = await page.evaluate(() => {
      const race = window.__bibou.race,
        r = race.racers[0];
      for (let i = 0; i < 180 && r.airborne; i++) race.update(1 / 60, [race.ai(r, false)]);
      document.querySelector<HTMLButtonElement>('#pause')!.click();
      return {
        air: r.airborne,
        height: r.pos.y,
        ground: r.groundHeight,
        checkpoint: r.checkpoint,
        progress: r.progress,
      };
    });
    expect(landing.air).toBe(false);
    expect(landing.height).toBeCloseTo(landing.ground, 2);
    expect(landing.checkpoint).toBeLessThanOrEqual(Math.floor(landing.progress * 8));
    expect(errors).toEqual([]);
  });
