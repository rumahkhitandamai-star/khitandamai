const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify INFO box on public running text acts as a button to open login form', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // 1. Kunjungi Beranda publik
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // 2. Temukan tombol INFO pada running text
  const infoBtn = page.locator('header button:has-text("INFO")');
  await expect(infoBtn).toBeVisible();

  // Verifikasi tombol adalah elemen button interaktif
  await expect(infoBtn).toHaveAttribute('type', 'button');
  await expect(infoBtn).toHaveAttribute('aria-label', 'Buka Form Login Pengelola');

  // Pastikan form login belum terbuka
  const loginModalTitle = page.locator('h3:has-text("Panel Pengelola")');
  await expect(loginModalTitle).not.toBeVisible();

  // 3. Klik tombol INFO
  await infoBtn.click();
  await page.waitForTimeout(400);

  // 4. Verifikasi form/modal login pengelola terbuka
  await expect(loginModalTitle).toBeVisible();
  const usernameInput = page.locator('input[placeholder="Contoh: admin atau email"]');
  const passwordInput = page.locator('input[placeholder="Masukkan kata sandi"]');
  await expect(usernameInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  const submitBtn = page.locator('button:has-text("Masuk sebagai Pengelola")');
  await expect(submitBtn).toBeVisible();

  // 5. Tutup modal login menggunakan tombol X
  const closeBtn = page.locator('button[title="Tutup Form Login"]');
  await expect(closeBtn).toBeVisible();
  await closeBtn.click();
  await page.waitForTimeout(400);

  // Verifikasi modal login sudah tertutup
  await expect(loginModalTitle).not.toBeVisible();

  // 6. Uji fungsionalitas tombol INFO dari halaman lain (misal menu Booking)
  await page.goto(filePath + '#/booking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const infoBtnOnBooking = page.locator('header button:has-text("INFO")');
  await expect(infoBtnOnBooking).toBeVisible();
  await infoBtnOnBooking.click();
  await page.waitForTimeout(400);

  // Modal login harus kembali terbuka dari halaman Booking
  await expect(loginModalTitle).toBeVisible();
});
