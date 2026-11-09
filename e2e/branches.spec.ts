import { test, expect } from '@playwright/test';

for (const index of [0, 1, 2, 3, 4]) {
  test(`circuit ${index}: alternative rendered, signed, mapped and driven for three laps`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.locator('#play').click();
    const geometry = await page.evaluate((index) => {
      window.__bibou.start(1, index);
      const race = window.__bibou.race,
        r = race.racers[0];
      race.countdown = 0;
      const branch = race.track.branch('alternative');
      const p = race.track.routeAt('alternative', 0.5),
        tangent = race.track.routeTangent('alternative', 0.5);
      r.pos.copy(p);
      r.previous.copy(p);
      r.route = 'alternative';
      r.heading = Math.atan2(tangent.x, tangent.z);
      r.groundHeight = p.y;
      const camera = window.__bibou.renderer.cameras[0];
      camera.position.set(
        p.x - Math.sin(r.heading) * 10.5,
        p.y + 5.8,
        p.z - Math.cos(r.heading) * 10.5,
      );
      document.querySelector<HTMLButtonElement>('#pause')!.click();
      return {
        length: race.track.length,
        branchWidth: branch.width,
        signed: !!window.__bibou.renderer.world.getObjectByName('sign-alternative'),
        landmarks:
          window.__bibou.renderer.world.getObjectByName(`alternative-landmark-${index}-0`) !==
          undefined,
      };
    }, index);
    expect(geometry.length).toBeGreaterThan(850);
    expect(geometry.branchWidth).toBeGreaterThan(10);
    expect(geometry.signed).toBe(true);
    expect(geometry.landmarks).toBe(true);
    await expect(page.locator('.minimap polyline')).toHaveCount(2);
    await page.screenshot({
      path: `test-results/alternative-${index}.png`,
      style: '#app { visibility: hidden; }',
    });
    await page.evaluate(() => {
      const renderer = window.__bibou.renderer,
        camera = renderer.cameras[0];
      renderer.scene.fog = null;
      camera.far = 1200;
      renderer.render = () => {
        camera.position.set(0, 350, 130);
        camera.lookAt(0, 0, 0);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.renderer.setScissorTest(false);
        renderer.renderer.setViewport(0, 0, innerWidth, innerHeight);
        renderer.renderer.render(renderer.scene, camera);
      };
    });
    await page.screenshot({
      path: `test-results/circuit-overview-${index}.png`,
      style: '#app,#hud { visibility: hidden; }',
    });
    const result = await page.evaluate(() => {
      const race = window.__bibou.race,
        r = race.racers[0];
      race.racers.splice(1);
      race.pickups = [];
      race.countdown = 0;
      r.progress = 0;
      r.route = 'main';
      race.respawn(r);
      let visits = 0,
        previous = false;
      for (let step = 0; step < 300 * 60 && !race.finished; step++) {
        race.update(1 / 60, [race.ai(r, false)]);
        const inside = r.route === 'alternative' && race.track.surface(r.pos, r.route).u > 0.4;
        if (inside && !previous) visits++;
        previous = inside;
      }
      return { finished: r.finished, checkpoints: r.checkpoint, visits };
    });
    expect(result.finished).toBe(true);
    expect(result.checkpoints).toBe(24);
    expect(result.visits).toBe(2); // Stable choice per driver and lap: branch, main, branch.
    expect(errors).toEqual([]);
  });
}

test.describe('touch landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('both route maps remain visible in duo', async ({ page }) => {
    await page.goto('/');
    await page.locator('#play').click();
    await page.evaluate(() => window.__bibou.start(2, 2));
    await expect(page.locator('.minimap polyline')).toHaveCount(4);
    await page.screenshot({ path: 'test-results/alternative-mobile-duo.png' });
  });
});

test('full route map remains usable with four viewports', async ({ page }) => {
  await page.goto('/');
  await page.locator('#play').click();
  await page.evaluate(() => window.__bibou.start(4, 4));
  await expect(page.locator('.minimap polyline')).toHaveCount(8);
  await page.screenshot({ path: 'test-results/alternative-four-players.png' });
});
