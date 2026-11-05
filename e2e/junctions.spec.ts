import { test, expect } from '@playwright/test';
for (const index of [0, 1, 2])
  test(`main road ${index}: pass both shortcut junctions without an invisible wall`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('#play').click();
    for (const offset of [-3, 3]) {
      const result = await page.evaluate(
        ({ index, offset }) => {
          window.__bibou.start(1, index);
          const race = window.__bibou.race,
            r = race.racers[0];
          race.racers.splice(1);
          race.pickups = [];
          race.countdown = 0;
          const start = race.track.shortcut.start - 0.035,
            end = race.track.shortcut.end + 0.035,
            p = race.track.at(start),
            tangent = race.track.tangent(start),
            norm = Math.hypot(tangent.x, tangent.z);
          r.pos.copy(p);
          r.pos.x += (tangent.z / norm) * offset;
          r.pos.z -= (tangent.x / norm) * offset;
          r.previous.copy(r.pos);
          r.progress = start;
          r.lastT = start;
          r.checkpoint = Math.floor(start * 8);
          r.heading = Math.atan2(tangent.x, tangent.z);
          r.speed = 18;
          let leftMain = false,
            minSpeed = Infinity;
          for (let step = 0; step < 1500 && r.progress < end; step++) {
            const n = race.track.nearest(r.pos),
              look = 6 + Math.abs(r.speed) * 0.3,
              t = n.t + look / race.track.length,
              target = race.track.at(t),
              forward = race.track.tangent(t),
              length = Math.hypot(forward.x, forward.z);
            target.x += (forward.z / length) * offset;
            target.z -= (forward.x / length) * offset;
            const delta = Math.atan2(target.x - r.pos.x, target.z - r.pos.z) - r.heading,
              angle = Math.atan2(Math.sin(delta), Math.cos(delta));
            const steer = -Math.max(
              -1,
              Math.min(1, (2 * Math.abs(r.speed) * Math.sin(angle)) / (look * 2.1)),
            );
            race.update(1 / 60, [{ throttle: r.speed < 18 ? 1 : 0, brake: 0, steer, use: false }]);
            leftMain ||= r.route !== 'main';
            minSpeed = Math.min(minSpeed, r.speed);
          }
          document.querySelector<HTMLButtonElement>('#pause')!.click();
          return { leftMain, minSpeed, progress: r.progress, end };
        },
        { index, offset },
      );
      expect(result.leftMain).toBe(false);
      expect(result.progress).toBeGreaterThanOrEqual(result.end);
      expect(result.minSpeed).toBeGreaterThan(8);
    }
    await page.evaluate(() => {
      const renderer = window.__bibou.renderer,
        point = renderer.track.at(renderer.track.shortcut.end),
        camera = renderer.cameras[0];
      for (const model of renderer.kartMeshes) model.visible = false;
      renderer.render = () => {
        camera.position.set(point.x + 15, point.y + 38, point.z + 20);
        camera.lookAt(point);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.renderer.setScissorTest(false);
        renderer.renderer.setViewport(0, 0, innerWidth, innerHeight);
        renderer.renderer.render(renderer.scene, camera);
      };
    });
    await page.screenshot({
      path: `test-results/junction-${index}.png`,
      style: '#app,#hud { visibility: hidden; }',
    });
  });
