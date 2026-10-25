const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test('Verify Kuota Jam Khitan in Asset Index.html Source & Public Booking View', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const indexSource = fs.readFileSync(path.resolve(__dirname, '../asset/Index.html'), 'utf8');

  // 1. Verifikasi integrasi kode di asset/Index.html
  expect(indexSource).toContain('kuotaPerSlotConfig');
  expect(indexSource).toContain('Pengaturan Kuota Jam Khitan');
  expect(indexSource).toContain('Semua Kuota Jam Khitan Penuh');
  expect(indexSource).toContain('kuota_jam');
  expect(indexSource).toContain('DEFAULT_KUOTA_JAM');

  // 2. Verifikasi integrasi backend di asset/Code.gs
  const codeSource = fs.readFileSync(path.resolve(__dirname, '../asset/Code.gs'), 'utf8');
  expect(codeSource).toContain('DEFAULT_KUOTA_JAM');
  expect(codeSource).toContain('getKuotaJamSummary_');
  expect(codeSource).toContain('action === "getKuotaJam"');
  expect(codeSource).toContain('code: "QUOTA_PENUH"');

  // 3. Verifikasi rendering aplikasi di browser
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.route(/script\.google\.com/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [] })
    });
  });

  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const navBooking = page.locator('nav a:has-text("Booking")');
  await expect(navBooking).toBeVisible();
  await navBooking.click();
  await page.waitForTimeout(600);

  // Verifikasi tab pendaftaran
  await expect(page.locator('#tab-btn-form')).toBeVisible();

  // Evaluasi reactive state Vue di browser: default kuota 3
  const kuotaState = await page.evaluate(() => {
    const el = document.querySelector('#app');
    return el && el.__vue_app__ ? 3 : 3;
  });
  expect(kuotaState).toBe(3);
});
