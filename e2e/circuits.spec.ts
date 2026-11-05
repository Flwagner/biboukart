import { test, expect } from '@playwright/test';
for (const difficulty of ['easy', 'normal', 'hard'])
  for (const index of [0, 1, 2])
    test(`circuit ${index}, ${difficulty}: scenery, relief, obstacle, shortcut and complete race`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await expect(page.locator('#play')).toBeVisible();
      await page.locator('#play').click();
      await page.locator('#next').click();
      await page.locator('#difficulty').selectOption(difficulty);
      await page.evaluate((index) => {
        window.__bibou.start(2, index);
        const race = window.__bibou.race,
          r = race.racers[0],
          s = race.track.shortcut;
        race.countdown = 0;
        race.elapsed = 5;
        r.route = 'shortcut';
        r.pos.copy(race.track.routeAt('shortcut', 0.45));
        r.previous.copy(r.pos);
        r.progress = s.start + 0.45 * (s.end - s.start);
        r.lastT = r.progress;
        const tangent = race.track.routeTangent('shortcut', 0.45);
        r.heading = Math.atan2(tangent.x, tangent.z);
      }, index);
      await expect(page.locator('.map-shortcut')).toHaveCount(2);
      await expect
        .poll(() => page.evaluate(() => window.__bibou.renderer.obstacleMeshes[0].position.y))
        .toBeGreaterThan(0.5);
      expect(await page.evaluate(() => window.__bibou.race.racers[0].route)).toBe('shortcut');
      const before = await page.evaluate(
        () => window.__bibou.race.obstacles[0].pos.x + window.__bibou.race.obstacles[0].pos.z,
      );
      await expect
        .poll(() =>
          page.evaluate(
            (before) =>
              Math.abs(
                window.__bibou.race.obstacles[0].pos.x +
                  window.__bibou.race.obstacles[0].pos.z -
                  before,
              ),
            before,
          ),
        )
        .toBeGreaterThan(0.05);
      await page.screenshot({ path: `test-results/circuit-${index}.png` });
      const result = await page.evaluate((index) => {
        window.__bibou.start(2, index);
        const race = window.__bibou.race;
        race.countdown = 0;
        race.racers.forEach((r: any) => (r.human = true));
        for (let i = 0; i < 240 * 60 && !race.finished; i++)
          race.update(
            1 / 60,
            race.racers.map((r: any) => race.ai(r, true)),
          );
        return race.racers.map((r: any) => ({
          finished: r.finished,
          checkpoints: r.checkpoint,
          shortcuts: r.shortcutPasses,
        }));
      }, index);
      expect(result.every((r: any) => r.finished && r.checkpoints === 24)).toBe(true);
      expect(result.some((r: any) => r.shortcuts >= 3)).toBe(true);
      await expect(page.locator('#podium-view')).toBeVisible();
      expect(errors).toEqual([]);
    });
