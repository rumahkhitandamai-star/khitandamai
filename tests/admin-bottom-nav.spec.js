const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Bottom Navigation is completely hidden when admin panel is open', async ({ page }) => {
  // Gunakan mobile viewport (iPhone 12/13/14 - 390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // 1. Pada Beranda (#/home) -> Bottom nav HARUS tampil
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const bottomNav = page.locator('.safe-bottom-nav');
  await expect(bottomNav).toBeVisible();
  expect(await bottomNav.count()).toBe(1);

  // 2. Akses Panel Admin (#/admin) sebelum login
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Verifikasi Bottom nav TIDAK DITAMPILKAN sama sekali saat di rute admin
  await expect(bottomNav).toHaveCount(0);

  // 3. Login modal otomatis terbuka di rute admin
  // Isi kredensial mock
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(800);

  // 4. Setelah login dan Dashboard Admin terbuka penuh
  // Bottom nav TETAP TIDAK BOLEH TAMPIL
  await expect(bottomNav).toHaveCount(0);

  // Pastikan elemen panel admin mobile (Drawer Menu / Quick Tabs) yang aktif
  const mobileHeaderMenu = page.locator('button[title="Buka Menu Sidebar"]');
  await expect(mobileHeaderMenu).toBeVisible();

  // 5. Klik tombol "Web Pasien" untuk kembali ke beranda publik
  const webPasienBtn = page.locator('a[title*="Web Pasien"], a[href="#/home"]');
  await webPasienBtn.first().click();
  await page.waitForTimeout(600);

  // 6. Di beranda publik, Bottom nav HARUS muncul kembali
  await expect(bottomNav).toBeVisible();
  expect(await bottomNav.count()).toBe(1);
});
