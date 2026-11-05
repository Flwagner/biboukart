import { test, expect } from '@playwright/test';
test('music is generated once after interaction, and independent volumes persist', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#play')).toBeVisible();
  expect(await page.evaluate(() => window.__bibou.audio.context)).toBeNull();
  await page.locator('#play').click();
  await expect
    .poll(() => page.evaluate(() => !!window.__bibou.audio.musicSource), { timeout: 20000 })
    .toBe(true);
  const metrics = await page.evaluate(async () => {
    const audio = window.__bibou.audio,
      source = audio.musicSource;
    await Promise.all([audio.unlock(), audio.unlock(), audio.unlock()]);
    const data = audio.musicBuffer.getChannelData(0);
    let peak = 0,
      energy = 0;
    for (const value of data) {
      peak = Math.max(peak, Math.abs(value));
      energy += value * value;
    }
    return {
      duration: audio.musicBuffer.duration,
      peak,
      rms: Math.sqrt(energy / data.length),
      loop: source.loop,
      singleSource: source === audio.musicSource,
      state: audio.context.state,
    };
  });
  console.log('Synthesized music waveform:', metrics);
  expect(metrics.duration).toBeGreaterThan(16);
  expect(metrics.duration).toBeLessThan(17);
  expect(metrics.peak).toBeGreaterThan(0.05);
  expect(metrics.peak).toBeLessThanOrEqual(0.801);
  expect(metrics.rms).toBeGreaterThan(0.01);
  expect(metrics.loop).toBe(true);
  expect(metrics.singleSource).toBe(true);
  expect(metrics.state).toBe('running');
  await page.locator('#back').click();
  await page.locator('#settings').click();
  await page.locator('#music-volume').evaluate((element: HTMLInputElement) => {
    element.value = '0';
    element.dispatchEvent(new Event('input'));
  });
  await page.locator('#effects-volume').evaluate((element: HTMLInputElement) => {
    element.value = '0.25';
    element.dispatchEvent(new Event('input'));
  });
  await expect
    .poll(() => page.evaluate(() => window.__bibou.audio.musicBus.gain.value))
    .toBeLessThan(0.001);
  await page.locator('#back').click();
  await page.locator('#play').click();
  await page.locator('#next').click();
  await page.locator('#start').click();
  expect(
    await page.evaluate(() => {
      const race = window.__bibou.race;
      race.racers[0].item = 'missile';
      race.racers[0].itemCooldown = 0;
      race.use(race.racers[0]);
      return window.__bibou.audio.lastSound;
    }),
  ).toBe('missile');
  await page.locator('#pause').click();
  await expect
    .poll(() => page.evaluate(() => window.__bibou.audio.master.gain.value))
    .toBeLessThan(0.001);
  await page.locator('#resume').click();
  await expect
    .poll(() => page.evaluate(() => window.__bibou.audio.master.gain.value))
    .toBeGreaterThan(0.25);
  await page.locator('#pause').click();
  await page.locator('#quit').click();
  await page.locator('#sound').click();
  await expect
    .poll(() => page.evaluate(() => window.__bibou.audio.master.gain.value))
    .toBeLessThan(0.001);
  await page.reload();
  await page.locator('#settings').click();
  await expect(page.locator('#music-volume')).toHaveValue('0');
  await expect(page.locator('#effects-volume')).toHaveValue('0.25');
  await expect(page.locator('#volume')).toHaveValue('0');
  expect(errors).toEqual([]);
});
test('all layered sound effects produce distinct finite non-clipping waveforms', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#play')).toBeVisible();
  const metrics = await page.evaluate(async () => {
    // Vite resolves these source modules; offline rendering needs no speakers or autoplay permission.
    const { soundEffect } = await import('/src/sounds.ts');
    const { makeNoise } = await import('/src/synth.ts');
    const results = [];
    for (const kind of [
      'pickup',
      'turbo',
      'missile',
      'shield',
      'trap',
      'hit',
      'finish',
      'go',
      'countdown',
      'click',
      'block',
    ]) {
      const context = new OfflineAudioContext(1, 26460, 22050);
      soundEffect(context, context.destination, makeNoise(context), kind, 0);
      const buffer = await context.startRendering(),
        data = buffer.getChannelData(0);
      let peak = 0,
        energy = 0;
      for (const value of data) {
        peak = Math.max(peak, Math.abs(value));
        energy += value * value;
      }
      results.push({ kind, peak, rms: Math.sqrt(energy / data.length) });
    }
    return results;
  });
  console.log('Offline sound effects:', metrics);
  expect(metrics).toHaveLength(11);
  for (const metric of metrics) {
    expect(Number.isFinite(metric.rms)).toBe(true);
    expect(metric.peak).toBeGreaterThan(0.01);
    expect(metric.peak).toBeLessThan(1);
    expect(metric.rms).toBeGreaterThan(0.002);
  }
  expect(new Set(metrics.map((metric) => metric.rms.toFixed(6))).size).toBe(11);
});
