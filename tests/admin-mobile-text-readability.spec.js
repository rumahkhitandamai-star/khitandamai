const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Admin Panel Text Readability on Mobile Viewport', async ({ page }) => {
  // Gunakan mobile viewport standar (iPhone 12/13/14: 390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Buka aplikasi publik
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // 2. Buka modal login dan cek keterbacaan teks form login
  const infoBtn = page.locator('header button:has-text("INFO")');
  await expect(infoBtn).toBeVisible();
  await infoBtn.click();
  await page.waitForTimeout(400);

  // Cek heading login
  const loginTitle = page.locator('h3:has-text("Panel Pengelola")');
  await expect(loginTitle).toBeVisible();
  const titleFontSize = await loginTitle.evaluate(el => window.getComputedStyle(el).fontSize);
  expect(parseFloat(titleFontSize)).toBeGreaterThanOrEqual(16);

  // Cek label username dan password
  const usernameLabel = page.locator('label:has-text("Username / Email")');
  await expect(usernameLabel).toBeVisible();
  const userLabelFontSize = await usernameLabel.evaluate(el => window.getComputedStyle(el).fontSize);
  expect(parseFloat(userLabelFontSize)).toBeGreaterThanOrEqual(12);

  // Login ke admin
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();

  // Tunggu transisi login berhasil masuk ke panel admin
  const dashboardHeading = page.locator('h4:has-text("Card Grafik Total")');
  await expect(dashboardHeading).toBeVisible({ timeout: 15000 });

  // 3. Verifikasi Topbar Header Admin pada HP
  const topbar = page.locator('header .admin-panel');
  await expect(topbar).toBeVisible();

  // 4. Verifikasi Mobile Quick Pill Tabs
  const mobilePills = page.locator('button:has-text("Dashboard")').first();
  await expect(mobilePills).toBeVisible();
  const pillFontSize = await mobilePills.evaluate(el => window.getComputedStyle(el).fontSize);
  expect(parseFloat(pillFontSize)).toBeGreaterThanOrEqual(12);

  // 5. Verifikasi Widget Operasional Harian
  const opHeader = page.locator('h4:has-text("Operasional & Pasien Hari Ini")');
  await expect(opHeader).toBeVisible();
  const opHeaderFontSize = await opHeader.evaluate(el => window.getComputedStyle(el).fontSize);
  expect(parseFloat(opHeaderFontSize)).toBeGreaterThanOrEqual(12);

  // 6. Verifikasi Card Grafik Total & KPI Bar pada Layar HP
  const kpiTotalPasien = page.locator('[data-testid="grafik-total-pasien"]');
  await expect(kpiTotalPasien).toBeVisible();

  const kpiLabel = page.locator('div:has-text("TOTAL PASIEN AKUMULATIF")').first();
  await expect(kpiLabel).toBeVisible();
  const kpiLabelFontSize = await kpiLabel.evaluate(el => window.getComputedStyle(el).fontSize);
  expect(parseFloat(kpiLabelFontSize)).toBeGreaterThanOrEqual(12);

  // 7. Verifikasi Grid Card Total Kunjungan (Tersusun 1 kolom rapi di HP)
  const totalKunjunganCard = page.locator('span:has-text("Total Kunjungan")').first();
  await expect(totalKunjunganCard).toBeVisible();
  const totalCardFontSize = await totalKunjunganCard.evaluate(el => window.getComputedStyle(el).fontSize);
  expect(parseFloat(totalCardFontSize)).toBeGreaterThanOrEqual(12);

  // 8. Buka Tab Booking dan verifikasi Mobile Card View
  const bookingTabBtn = page.locator('button:has-text("Booking")').first();
  await bookingTabBtn.click();
  await page.waitForTimeout(800);

  // Cari kartu mobile pertama
  const bookingCards = page.locator('.admin-panel .block.md\\:hidden > div');
  const count = await bookingCards.count();
  if (count > 0) {
    const firstCard = bookingCards.first();
    await expect(firstCard).toBeVisible();

    // Verifikasi label nama ananda terbaca jelas
    const anandaLabel = firstCard.locator('span:has-text("NAMA ANANDA")');
    await expect(anandaLabel).toBeVisible();
    const anandaLabelFontSize = await anandaLabel.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(parseFloat(anandaLabelFontSize)).toBeGreaterThanOrEqual(12);

    // Verifikasi tombol edit
    const editBtn = firstCard.locator('button:has-text("Edit")');
    await expect(editBtn).toBeVisible();
  }

  // 9. Buka Tab Kunjungan dan verifikasi Mobile Card View
  const kunjunganTabBtn = page.locator('button:has-text("Kunjungan")').first();
  await kunjunganTabBtn.click();
  await page.waitForTimeout(800);

  const kunjunganCards = page.locator('.admin-panel .block.md\\:hidden > div');
  const kunjCount = await kunjunganCards.count();
  if (kunjCount > 0) {
    const firstKunjCard = kunjunganCards.first();
    await expect(firstKunjCard).toBeVisible();

    // Verifikasi label dan teks registrasi
    const tglKhitanLabel = firstKunjCard.locator('span:has-text("TGL KHITAN")');
    await expect(tglKhitanLabel).toBeVisible();
    const tglKhitanFontSize = await tglKhitanLabel.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(parseFloat(tglKhitanFontSize)).toBeGreaterThanOrEqual(12);
  }

  // Tidak boleh ada critical console errors
  expect(consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Chart is not defined'))).toHaveLength(0);
});
