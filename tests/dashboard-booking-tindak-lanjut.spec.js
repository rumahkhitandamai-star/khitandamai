const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Dashboard Card Operasional Booking Tindak Lanjut only displays today and future bookings', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Masuk ke Panel Admin
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Login dengan akun admin
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();

  // 2. Tunggu Widget Operasional & Pasien Hari Ini di Dashboard
  const widgetOperasional = page.locator('text=Operasional & Pasien Hari Ini');
  await widgetOperasional.waitFor({ timeout: 25000 });
  await expect(widgetOperasional).toBeVisible();

  // Tunggu data booking termuat
  await page.waitForTimeout(2000);

  // 3. Verifikasi Kartu Booking Tindak Lanjut
  const kartuBooking = page.locator('div.rounded-2xl:has-text("Booking Tindak Lanjut")').filter({ hasText: 'Pendaftar' }).first();
  await expect(kartuBooking).toBeVisible();

  const kartuText = await kartuBooking.innerText();
  expect(kartuText.toLowerCase()).toContain('booking tindak lanjut');
  expect(kartuText).toContain('Pendaftar');

  // Pastikan pendaftar yang tampil adalah pendaftar jadwal hari ini / mendatang
  // Pada database tersimpan Abil Shidqi Arsalaan (jadwal mendatang/hari ini)
  expect(kartuText).toContain('Abil Shidqi Arsalaan');

  // 4. Klik tombol "Periksa Booking →"
  const periksaBookingBtn = kartuBooking.locator('button:has-text("Periksa Booking →")');
  await expect(periksaBookingBtn).toBeVisible();
  await periksaBookingBtn.click();
  await page.waitForTimeout(800);

  // Verifikasi telah berpindah ke tab Booking dengan filter Jadwal "Mendatang"
  const dateFilterSelect = page.locator('#booking-date-filter');
  await expect(dateFilterSelect).toBeVisible();
  const selectedFilterValue = await dateFilterSelect.inputValue();
  expect(selectedFilterValue).toBe('Mendatang');

  // Verifikasi baris pendaftar jadwal hari ini / mendatang tampil di tabel
  const barisPendaftar = page.locator('tr:has-text("Abil Shidqi Arsalaan")');
  await expect(barisPendaftar.first()).toBeVisible();

  // Pastikan tidak ada console error
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
