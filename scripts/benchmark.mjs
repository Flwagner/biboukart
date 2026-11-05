import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5173');
  await page.waitForFunction(() => !!window.__bibou);
  console.log(
    'Non-gating software-rendering benchmark:',
    browser.version(),
    '1280×800, SwiftShader, 3 seconds per layout. Not a hardware FPS certification.',
  );
  const results = [];
  for (const players of [1, 2, 4]) {
    await page.evaluate((players) => window.__bibou.start(players, 0), players);
    await page.waitForTimeout(1500);
    const metrics = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          let previous = performance.now(),
            start = previous;
          function sample(now) {
            samples.push(now - previous);
            previous = now;
            if (now - start < 3000) {
              requestAnimationFrame(sample);
              return;
            }
            const sorted = [...samples].sort((a, b) => a - b);
            resolve({
              fps: Math.round(((samples.length * 1000) / (now - start)) * 10) / 10,
              p95FrameMs: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
              geometries: window.__bibou.renderer.renderer.info.memory.geometries,
            });
          }
          requestAnimationFrame(sample);
        }),
    );
    results.push({ players, ...metrics });
  }
  console.table(results);
} finally {
  await browser.close();
}
