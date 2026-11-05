import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root = resolve('dist');
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/biboukart/')) {
      res.writeHead(404).end();
      return;
    }
    const file = resolve(root, pathname.slice('/biboukart/'.length) || 'index.html');
    if (!file.startsWith(root + '/')) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file),
      type = file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.css')
          ? 'text/css'
          : 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage(),
    errors = [],
    failed = [],
    requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  page.on('request', (r) => requests.push(r.url()));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin + '/biboukart/');
  await page.locator('#play').waitFor();
  assert.equal(
    await page.evaluate(() => typeof window.__bibou),
    'undefined',
    'No debug hooks in production',
  );
  await page.locator('#play').click();
  await page.locator('#next').click();
  await page.locator('#start').click();
  await page.locator('.player-hud').waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  assert(requests.every((url) => url.startsWith(origin) || url.startsWith('data:')));
  console.log(
    'PASS production under /biboukart/: menus, WebGL race, relative assets, zero HTTP/page errors, no external requests, no debug hooks.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
