const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Footer is completely removed from public Home and all public pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // 1. Pada Beranda (#/home) -> Footer publik TIDAK BOLEH ADA
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const homeFooter = page.locator('footer:has-text("Perum Bumi Abdi Praja")');
  await expect(homeFooter).toHaveCount(0);

  // Pastikan tidak ada tag footer yang terlihat di halaman Beranda publik
  const visibleFootersOnHome = page.locator('footer:visible');
  await expect(visibleFootersOnHome).toHaveCount(0);

  // 2. Pada Booking (#/booking) -> Footer publik TIDAK BOLEH ADA
  await page.goto(filePath + '#/booking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await expect(homeFooter).toHaveCount(0);
  await expect(page.locator('footer:visible')).toHaveCount(0);

  // 3. Pada Testimoni (#/testimoni) -> Footer publik TIDAK BOLEH ADA
  await page.goto(filePath + '#/testimoni', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await expect(homeFooter).toHaveCount(0);
  await expect(page.locator('footer:visible')).toHaveCount(0);

  // 4. Pada Galeri (#/galeri) -> Footer publik TIDAK BOLEH ADA
  await page.goto(filePath + '#/galeri', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await expect(homeFooter).toHaveCount(0);
  await expect(page.locator('footer:visible')).toHaveCount(0);

  // 5. Kembali ke Beranda (#/home) -> Tetap TIDAK ADA footer
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await expect(homeFooter).toHaveCount(0);
  await expect(page.locator('footer:visible')).toHaveCount(0);
});
