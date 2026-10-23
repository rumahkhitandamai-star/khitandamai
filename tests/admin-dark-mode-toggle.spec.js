const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Admin Panel Dark/Light Mode Toggle, Light Default, and Text Readability', async ({ page }) => {
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Buka halaman admin pertama kali (Harus default Mode Terang)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Pastikan class dark TIDAK ada secara default
  const htmlElement = page.locator('html');
  await expect(htmlElement).not.toHaveClass(/dark/);

  // Login ke admin
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(800);

  // Tunggu dashboard muncul
  const dashboardHeading = page.locator('h3:has-text("Dashboard & Grafik Total")');
  await expect(dashboardHeading).toBeVisible({ timeout: 15000 });

  // 2. Verifikasi Tombol Toggle Mode Gelap / Terang di Header
  const themeToggleBtn = page.locator('[data-testid="admin-theme-toggle"]');
  await expect(themeToggleBtn).toBeVisible();

  // Mode Terang adalah bawaan: Tombol menawarkan opsi "Mode Gelap"
  await expect(themeToggleBtn).toContainText('Mode Gelap');
  const storedThemeDefault = await page.evaluate(() => localStorage.getItem('admin_theme'));
  expect(storedThemeDefault === null || storedThemeDefault === 'light').toBe(true);

  // 3. Klik Toggle ke Mode Gelap
  await themeToggleBtn.click();
  await page.waitForTimeout(400);

  // Verifikasi class dark terpasang pada html dan app
  await expect(htmlElement).toHaveClass(/dark/);
  const appElement = page.locator('#app');
  await expect(appElement).toHaveClass(/dark/);

  // Verifikasi localStorage tersimpan sebagai dark
  const storedThemeDark = await page.evaluate(() => localStorage.getItem('admin_theme'));
  expect(storedThemeDark).toBe('dark');

  // Verifikasi label tombol berubah menjadi "Mode Terang"
  await expect(themeToggleBtn).toContainText('Mode Terang');

  // 4. Verifikasi Keterbacaan Teks pada Mode Gelap (Tab Dashboard)
  // Heading dashboard harus putih / terang
  const dashColor = await dashboardHeading.evaluate(el => window.getComputedStyle(el).color);
  expect(dashColor).toBe('rgb(248, 250, 252)');

  // KPI Total Pasien
  const kpiTotal = page.locator('[data-testid="grafik-total-pasien"]');
  await expect(kpiTotal).toBeVisible();
  const kpiColor = await kpiTotal.evaluate(el => window.getComputedStyle(el).color);
  expect(kpiColor).toBe('rgb(248, 250, 252)');

  // 5. Verifikasi Keterbacaan pada Tab Booking (Desktop & Mobile)
  const bookingTabBtn = page.locator('aside button:has-text("Booking")');
  await bookingTabBtn.click();
  await page.waitForTimeout(600);

  const bookingSearchInput = page.locator('input[placeholder*="Cari nama anak, ortu"]');
  await expect(bookingSearchInput).toBeVisible();
  const searchBg = await bookingSearchInput.evaluate(el => window.getComputedStyle(el).backgroundColor);
  expect(searchBg).toBe('rgb(15, 23, 42)');
  const searchColor = await bookingSearchInput.evaluate(el => window.getComputedStyle(el).color);
  expect(searchColor).toBe('rgb(255, 255, 255)');

  // Verifikasi Keterbacaan pada Layar Mobile (390 x 844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);

  const mobileBookingCard = page.locator('.admin-panel .block.md\\:hidden > div').first();
  if (await mobileBookingCard.isVisible()) {
    const cardBg = await mobileBookingCard.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(cardBg).toBe('rgb(30, 41, 59)');

    const anandaLabel = mobileBookingCard.locator('span:has-text("NAMA ANANDA")');
    if (await anandaLabel.isVisible()) {
      const labelColor = await anandaLabel.evaluate(el => window.getComputedStyle(el).color);
      expect(['rgb(148, 163, 184)', 'rgb(203, 213, 225)']).toContain(labelColor);
    }
  }

  // Kembalikan ke Desktop Viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);

  // 6. Verifikasi Preferensi Tema di Tab Setting
  const unhideBtn = page.locator('button[title="Tampilkan Sidebar (Unhide)"]');
  if (await unhideBtn.isVisible()) {
    await unhideBtn.click();
    await page.waitForTimeout(300);
  }
  const settingTabBtn = page.locator('aside button:has-text("Setting")');
  await settingTabBtn.click();
  await page.waitForTimeout(600);

  const profilSectionHeading = page.locator('h5:has-text("Preferensi Tema Tampilan Panel Admin")');
  await expect(profilSectionHeading).toBeVisible();

  // 7. Klik Kembali ke Mode Terang
  await themeToggleBtn.click();
  await page.waitForTimeout(400);

  // Verifikasi class dark dicabut
  await expect(htmlElement).not.toHaveClass(/dark/);
  await expect(appElement).not.toHaveClass(/dark/);
  const storedThemeLight = await page.evaluate(() => localStorage.getItem('admin_theme'));
  expect(storedThemeLight).toBe('light');

  // Heading saat mode terang kembali normal (gelap di atas background terang)
  const lightHeadingColor = await profilSectionHeading.evaluate(el => window.getComputedStyle(el).color);
  expect(lightHeadingColor).toBe('rgb(30, 41, 59)');

  // 8. Verifikasi Isolasi Web Pasien
  // Ubah ke mode gelap lagi di admin
  await themeToggleBtn.click();
  await page.waitForTimeout(300);
  await expect(htmlElement).toHaveClass(/dark/);

  // Beralih ke Web Pasien (#/home)
  const webPasienLink = page.locator('header a[href="#/home"]');
  await webPasienLink.click();
  await page.waitForTimeout(600);

  // Web pasien harus tetap Mode Terang (class dark dinonaktifkan di luar admin)
  await expect(htmlElement).not.toHaveClass(/dark/);
  await expect(appElement).not.toHaveClass(/dark/);

  // Pastikan tidak ada console errors
  expect(consoleErrors).toEqual([]);
});
