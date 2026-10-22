const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Floating WhatsApp Button is removed and Back to Top sits right above bottom nav', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // 1. Pada Beranda (#/home) -> Tombol floating WhatsApp TIDAK BOLEH ADA
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const waBtn = page.locator('a[aria-label="Hubungi WhatsApp Admin"]');
  await expect(waBtn).toHaveCount(0);

  // 2. Pada Booking (#/booking) -> Tombol floating WhatsApp TIDAK BOLEH ADA
  await page.goto(filePath + '#/booking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await expect(waBtn).toHaveCount(0);

  // 3. Pada Galeri (#/galeri) -> Tombol floating WhatsApp TIDAK BOLEH ADA
  await page.goto(filePath + '#/galeri', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await expect(waBtn).toHaveCount(0);

  // 4. Kembali ke #/home dan scroll ke bawah untuk memunculkan tombol Back to Top
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Scroll ke bawah 1200px
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(500);

  const backToTopBtn = page.locator('button[aria-label="Kembali ke atas"]');
  await expect(backToTopBtn).toBeVisible();

  // Verifikasi tombol floating WhatsApp tetap tidak ada saat scroll
  await expect(waBtn).toHaveCount(0);

  const topBox = await backToTopBtn.boundingBox();
  console.log('Back to Top Box:', topBox);

  // Verifikasi tombol Back to Top berada di pojok kanan bawah dekat bottom nav (~4.5rem)
  expect(topBox.y).toBeGreaterThan(650);
});
