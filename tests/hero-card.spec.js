const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Hero Card is positioned above Slideshow and functions correctly', async ({ page }) => {
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const homeSection = page.locator('main section').first();
  await expect(homeSection).toBeVisible();

  // Get children of home section
  const sectionChildren = homeSection.locator('> div');
  const childCount = await sectionChildren.count();
  expect(childCount).toBeGreaterThanOrEqual(2);

  // First child bounding box (Hero Card) and Second child (Slideshow)
  const firstChild = sectionChildren.nth(0);
  const secondChild = sectionChildren.nth(1);

  const firstBox = await firstChild.boundingBox();
  const secondBox = await secondChild.boundingBox();

  console.log('Hero Card Y:', firstBox.y, 'Slideshow Y:', secondBox.y);
  // Hero Card must be ABOVE Slideshow (Pengaturan Ulang Ritme Beranda)
  expect(firstBox.y).toBeLessThan(secondBox.y);

  // First child must contain Hero Card content ("Layanan Khitan Modern & Nyaman")
  await expect(firstChild).toContainText('Layanan Khitan Modern & Nyaman');
  const daftarBtn = firstChild.locator('a[href="#/booking"]:has-text("Daftar Sekarang")');
  await expect(daftarBtn).toBeVisible();
  await expect(daftarBtn).toHaveClass(/w-full/);
  await expect(daftarBtn).toHaveClass(/h-\[44px\]/);
  const daftarBox = await daftarBtn.boundingBox();
  expect(daftarBox.height).toBe(44);

  // Verify Slideshow functionality on second child
  // 1. Check dot indicators exist if slides exist
  const dotButtons = secondChild.locator('button[aria-label^="Pilih keunggulan"]');
  const dotCount = await dotButtons.count();
  if (dotCount > 1) {
    // Click on 2nd dot
    await dotButtons.nth(1).click();
    await page.waitForTimeout(300);
    // 2nd dot should be active (w-6)
    await expect(dotButtons.nth(1)).toHaveClass(/w-6/);
  }

  // 2. Click on active slide to open lightbox
  const activeSlide = secondChild.locator('.cursor-zoom-in.pointer-events-auto, .cursor-zoom-in.opacity-100').first();
  if (await activeSlide.count() > 0) {
    await activeSlide.click();
    await page.waitForTimeout(300);
    // Lightbox modal should be visible
    const lightboxModal = page.locator('.fixed.inset-0.z-50:has-text("Keunggulan Layanan")');
    if (await lightboxModal.count() > 0) {
      await expect(lightboxModal).toBeVisible();
      // Close lightbox
      const closeBtn = lightboxModal.locator('button:has(svg), button').first();
      await closeBtn.click();
    }
  }
});
