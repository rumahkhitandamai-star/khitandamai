const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Program card is removed from public Home', async ({ page }) => {
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const homeSection = page.locator('main section').first();
  await expect(homeSection).toBeVisible();

  // Verify that there is no element with title "Program" or h3 "Program" in home
  const programTitle = homeSection.locator('h3:has-text("Program")');
  await expect(programTitle).toHaveCount(0);

  // Verify that Program lightbox is not in DOM
  const programLightbox = page.locator('.fixed.inset-0:has-text("Program Jumat Khitan Berkah")');
  await expect(programLightbox).toHaveCount(0);
});
