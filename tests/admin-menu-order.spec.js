const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Admin Panel Menu Order is Dashboard, Booking, Kunjungan, Galeri, Saran, Jumat Berkah, Users, Setting', async ({ page }) => {
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Masuk ke halaman admin pada layar Desktop (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Login dengan akun Super Admin
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();

  // Tunggu transisi login berhasil masuk ke panel admin
  const dashboardHeading = page.locator('h4:has-text("Card Grafik Total")');
  await expect(dashboardHeading).toBeVisible({ timeout: 15000 });

  // 2. Verifikasi Urutan Menu pada Sidebar Desktop
  const desktopSidebarButtons = page.locator('aside nav button span.block.truncate.leading-tight');
  const expectedLabels = [
    'Dashboard',
    'Booking',
    'Kunjungan',
    'Galeri',
    'Saran',
    'Jumat Berkah',
    'Users',
    'Setting'
  ];

  const desktopCount = await desktopSidebarButtons.count();
  expect(desktopCount).toBe(8);

  for (let i = 0; i < expectedLabels.length; i++) {
    const text = await desktopSidebarButtons.nth(i).innerText();
    expect(text.trim()).toBe(expectedLabels[i]);
  }

  // 3. Verifikasi pada Layar Mobile (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);

  // Verifikasi Urutan Menu pada Mobile Horizontal Quick Tabs (Pill Tabs)
  const mobilePillButtons = page.locator('.admin-panel .md\\:hidden.overflow-x-auto button');
  const pillCount = await mobilePillButtons.count();
  expect(pillCount).toBe(8);

  for (let i = 0; i < expectedLabels.length; i++) {
    const text = await mobilePillButtons.nth(i).innerText();
    expect(text).toContain(expectedLabels[i]);
  }

  // 4. Verifikasi Urutan Menu pada Mobile Drawer Sidebar
  // Buka drawer dengan tombol Menu
  const menuBtn = page.locator('header button:has-text("Menu")');
  await expect(menuBtn).toBeVisible();
  await menuBtn.click();
  await page.waitForTimeout(400);

  const drawerMenuButtons = page.locator('.animate-bounce-short nav button span.block.truncate.font-bold');
  const drawerCount = await drawerMenuButtons.count();
  expect(drawerCount).toBe(8);

  for (let i = 0; i < expectedLabels.length; i++) {
    const text = await drawerMenuButtons.nth(i).innerText();
    expect(text.trim()).toBe(expectedLabels[i]);
  }

  // 5. Verifikasi Navigasi Berfungsi untuk Menu Baru (Galeri, Saran, Jumat Berkah)
  // Klik menu Galeri di drawer
  const galeriDrawerBtn = drawerMenuButtons.nth(3); // Galeri index 3
  await galeriDrawerBtn.click();
  await page.waitForTimeout(500);

  // Heading Galeri harus tampil
  const galeriHeading = page.locator('h3:has-text("Dokumentasi & Galeri Kegiatan")');
  await expect(galeriHeading).toBeVisible();

  // Buka kembali drawer dan klik Saran
  await menuBtn.click();
  await page.waitForTimeout(400);
  const saranDrawerBtn = drawerMenuButtons.nth(4); // Saran index 4
  await saranDrawerBtn.click();
  await page.waitForTimeout(500);

  // Heading Saran harus tampil
  const saranHeading = page.locator('h3:has-text("Data Masukan & Kritik")');
  await expect(saranHeading).toBeVisible();

  // Buka kembali drawer dan klik Jumat Berkah
  await menuBtn.click();
  await page.waitForTimeout(400);
  const jumatDrawerBtn = drawerMenuButtons.nth(5); // Jumat Berkah index 5
  await jumatDrawerBtn.click();
  await page.waitForTimeout(500);

  // Heading Jumat Berkah harus tampil
  const jumatHeading = page.locator('h3:has-text("Program Khitan Jumat Berkah")');
  await expect(jumatHeading).toBeVisible();

  // Tidak boleh ada error kritis di konsol browser
  expect(consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Chart is not defined'))).toHaveLength(0);
});
