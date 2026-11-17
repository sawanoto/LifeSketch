// Requires Playwright and a root HTTP server. No production dependencies.
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox'] });
  const errors = [];
  const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:8000/';
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marpan-check-'));
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${root}020_marpan-notebook/`);
    await page.waitForFunction(() => !document.querySelector('#export').disabled);
    await page.screenshot({ path: path.join(directory, 'desktop.png'), fullPage: true });
    const before = await page.locator('#scene canvas').evaluate(c => c.toDataURL());
    const downloaded = page.waitForEvent('download');
    await page.click('#export');
    const file = path.join(directory, 'cover.png');
    await (await downloaded).saveAs(file);
    const png = fs.readFileSync(file);
    assert.equal(png.readUInt32BE(16), 2500);
    assert.equal(png.readUInt32BE(20), 3535);
    await page.waitForFunction(() => !document.querySelector('#export').disabled);
    assert.equal(await page.locator('#scene canvas').evaluate(c => c.toDataURL()), before);
    assert.equal(await page.locator('#fallback').isVisible(), true);
    await page.goto(`${root}020_marpan-notebook/poses.html`);
    await page.waitForFunction(() => document.querySelectorAll('.pose-card').length === 5);
    const images = new Set();
    for (const expression of ['neutral', 'happy', 'surprised', 'confused', 'sleepy']) {
      await page.selectOption('#expression', expression);
      await page.waitForFunction(e => document.querySelector('.pose-image canvas').getAttribute('aria-label')?.includes({ neutral:'無表情', happy:'笑顔', surprised:'驚き', confused:'困惑', sleepy:'眠そう' }[e]), expression);
      images.add(await page.locator('.pose-image canvas').first().evaluate(c => c.toDataURL()));
    }
    assert.equal(images.size, 5);
    await page.check('#mirror');
    await page.locator('#rotation').fill('30');
    await page.waitForFunction(() => document.querySelector('#selection').textContent.includes('30° / 左右反転'));
    // A registered pose is automatically discovered on the next page setup.
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      if (typeof MarpanPoses === 'undefined') return;
      MarpanPoses.registerPose('test-extra', { label: '追加確認', description: 'test', sample: () => ({ angle: 0 }) });
    }));
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.pose-card').length === 6);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const location of ['', '020_marpan-notebook/', '020_marpan-notebook/poses.html', '019_sword-spinning/']) {
        await page.goto(root + location);
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${location} at ${width}`);
      }
    }
    await page.screenshot({ path: path.join(directory, 'library-mobile.png'), fullPage: true });
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await touch.newPage();
    phone.on('pageerror', e => errors.push(e.message));
    await phone.goto(`${root}020_marpan-notebook/`);
    await phone.waitForFunction(() => !document.querySelector('#export').disabled);
    const mobileDownload = phone.waitForEvent('download');
    await phone.locator('#export').tap();
    await (await mobileDownload).saveAs(path.join(directory, 'touch-cover.png'));
    await phone.goto(`${root}020_marpan-notebook/poses.html`);
    await phone.waitForFunction(() => document.querySelectorAll('.pose-card').length === 5);
    await phone.locator('#mirror').tap();
    await phone.waitForFunction(() => document.querySelector('#selection').textContent.includes('左右反転'));
    await touch.close();
    assert.deepEqual(errors, []);
    console.log(`PASS: PNG dimensions, exact display restoration, five distinct expressions, dynamic registration, desktop/mobile overflow, touch export and controls. Artifacts: ${directory}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
