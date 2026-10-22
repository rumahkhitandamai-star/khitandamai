const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Running Text starts running immediately on page open without blank delay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  // 1. Elemen running text harus langsung tampak
  const runningTextItems = page.locator('header .animate-marquee');
  await expect(runningTextItems.first()).toBeVisible();
  expect(await runningTextItems.count()).toBe(2); // Seamless loop (2 elemen teks berdampingan)

  // 2. Teks di dalamnya langsung terisi dari awal load
  const textContent = await runningTextItems.first().innerText();
  expect(textContent).toContain('Khitan Damai Subang');

  // 3. Pastikan teks langsung bergerak (posisi horizontal berubah ke kiri)
  const box1 = await runningTextItems.first().boundingBox();
  expect(box1).not.toBeNull();
  expect(box1.x).toBeLessThanOrEqual(100); // Teks langsung berada di dalam viewport dekat tombol INFO

  // Tunggu 800ms dan ukur kembali posisinya
  await page.waitForTimeout(800);
  const box2 = await runningTextItems.first().boundingBox();
  expect(box2).not.toBeNull();
  expect(box2.x).toBeLessThan(box1.x); // Posisi x berkurang karena bergerak mengalir ke arah kiri
});
