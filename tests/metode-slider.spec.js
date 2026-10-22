const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Metode Khitan 1 Foto Full-Width Carousel without image crop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Seksi Metode tampak
  const metodeSection = page.locator('main section:has(h3:has-text("Metode"))');
  await expect(metodeSection).toBeVisible();

  // 2. Tombol navigasi header Back (<) dan Next (>)
  const backBtn = page.locator('button[title*="Back (<)"]');
  const nextBtn = page.locator('button[title*="Next (>)"]');
  await expect(backBtn).toBeVisible();
  await expect(nextBtn).toBeVisible();

  // 3. Verifikasi Card 1 Foto Full-Width (aspect-square & object-contain)
  const fullWidthCard = page.locator('.aspect-square.bg-slate-50').first();
  await expect(fullWidthCard).toBeVisible();

  const cardBox = await fullWidthCard.boundingBox();
  console.log('Full-Width Card Box:', cardBox);
  expect(cardBox.width).toBeGreaterThanOrEqual(350);

  // Verifikasi gambar aktif menggunakan object-contain
  const activeImg = fullWidthCard.locator('.opacity-100 img').first();
  await expect(activeImg).toBeVisible();
  await expect(activeImg).toHaveClass(/object-contain/);

  // 4. Verifikasi Counter aktif (misal "1 / 6")
  const counterBadge = page.locator('span:has-text("1 /")').first();
  await expect(counterBadge).toBeVisible();

  // 5. Uji tombol Next (>) untuk berpindah ke foto ke-2
  await nextBtn.click();
  await page.waitForTimeout(400);

  const counterAfterNext = page.locator('span:has-text("2 /")').first();
  await expect(counterAfterNext).toBeVisible();

  // 6. Uji tombol Back (<) untuk kembali ke foto ke-1
  await backBtn.click();
  await page.waitForTimeout(400);
  await expect(counterBadge).toBeVisible();

  // 7. Uji tombol floating di atas gambar
  const floatingNext = page.locator('button[aria-label="Foto Selanjutnya"]');
  if (await floatingNext.count() > 0) {
    await floatingNext.click();
    await page.waitForTimeout(400);
    await expect(counterAfterNext).toBeVisible();
  }

  // 8. Uji dot indicators
  const dots = page.locator('button[aria-label^="Pilih Metode"]');
  const dotCount = await dots.count();
  console.log('Metode dots count:', dotCount);
  expect(dotCount).toBeGreaterThanOrEqual(2);

  // Klik dot ke-3
  await dots.nth(2).click();
  await page.waitForTimeout(400);
  const counterAfterDot = page.locator('span:has-text("3 /")').first();
  await expect(counterAfterDot).toBeVisible();

  // 9. Uji klik foto untuk membuka modal Lightbox
  const currentActiveImg = fullWidthCard.locator('.opacity-100 img').first();
  await currentActiveImg.click();
  await page.waitForTimeout(400);

  const lightbox = page.locator('.fixed.inset-0.z-50:has(button[aria-label="Tutup Tampilan Metode"])');
  await expect(lightbox).toBeVisible();

  // Tutup lightbox
  const closeBtn = lightbox.locator('button[aria-label="Tutup Tampilan Metode"]');
  await closeBtn.click();
  await page.waitForTimeout(200);
  await expect(lightbox).not.toBeVisible();
});
