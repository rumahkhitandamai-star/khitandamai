const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Vector Icons render cleanly with zero errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check that no page errors occurred
  console.log('Detected errors:', errors);
  expect(errors).toHaveLength(0);

  // Verify that SVG vector icons are rendered in the DOM
  const svgCount = await page.locator('svg').count();
  console.log('Total SVG elements rendered on page:', svgCount);
  expect(svgCount).toBeGreaterThan(10);

  // Check bottom nav icons (Beranda, Booking, Galeri default = 3)
  const bottomNavSvgs = await page.locator('.safe-bottom-nav svg').count();
  console.log('Bottom navigation vector SVG count:', bottomNavSvgs);
  expect(bottomNavSvgs).toBeGreaterThanOrEqual(3);

  // Check that no <i> tags exist on the page
  const iTagCount = await page.locator('i').count();
  console.log('Remaining <i> tag count:', iTagCount);
  expect(iTagCount).toBe(0);

  // Test route change to booking
  await page.goto(filePath + '#/booking');
  await page.waitForTimeout(1000);
  const bookingSvgs = await page.locator('svg').count();
  console.log('Booking page SVG count:', bookingSvgs);
  expect(bookingSvgs).toBeGreaterThan(10);

  // Test route change to cek-booking
  await page.goto(filePath + '#/cek-booking');
  await page.waitForTimeout(1000);
  const cekSvgs = await page.locator('svg').count();
  console.log('Cek Booking page SVG count:', cekSvgs);
  expect(cekSvgs).toBeGreaterThan(5);

  // Test route change to admin login
  await page.goto(filePath + '#/admin');
  await page.waitForTimeout(1000);
  const adminSvgs = await page.locator('svg').count();
  console.log('Admin login page SVG count:', adminSvgs);
  expect(adminSvgs).toBeGreaterThan(3);

  expect(errors).toHaveLength(0);
});
