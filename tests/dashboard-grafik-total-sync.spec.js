const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Dashboard Card Grafik Total Database Sync, KPI Bar, and Chart Canvas Rendering', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Buka aplikasi dan login ke panel admin
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Buka modal login lewat tombol INFO pada running text
  const infoBtn = page.locator('header button:has-text("INFO")');
  await expect(infoBtn).toBeVisible();
  await infoBtn.click();
  await page.waitForTimeout(400);

  // Isi kredensial admin
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(1000);

  // 2. Pastikan sudah berada di Tab Dashboard
  const dashboardHeading = page.locator('h4:has-text("Card Grafik Total")');
  await expect(dashboardHeading).toBeVisible();

  // 3. Verifikasi elemen optimasi pada Card Grafik Total
  // Badge Bebas Filter
  const bebasFilterBadge = page.locator('span:has-text("Bebas Filter")');
  await expect(bebasFilterBadge.first()).toBeVisible();

  // Indikator Status Database
  const dbStatusIndicator = page.locator('text=/Database:|Menyinkronkan/i');
  await expect(dbStatusIndicator.first()).toBeVisible();

  // Tombol Sinkron Database di Card Grafik Total
  const syncDbBtn = page.locator('button:has-text("Sinkron Database")');
  await expect(syncDbBtn).toBeVisible();

  // 4. Verifikasi KPI Bar Akumulatif (tunggu respons database)
  const kpiPasien = page.locator('[data-testid="grafik-total-pasien"]');
  await expect(kpiPasien).toBeVisible();

  // Tunggu sinkronisasi database selesai (network request ke GAS)
  await expect(kpiPasien).not.toHaveText('0', { timeout: 15000 });
  
  const pasienCount = await kpiPasien.innerText();
  expect(parseInt(pasienCount, 10)).toBeGreaterThan(0);

  const kpiOmzet = page.locator('[data-testid="grafik-total-omzet"]');
  await expect(kpiOmzet).toBeVisible();
  const omzetText = await kpiOmzet.innerText();
  expect(omzetText).toContain('Rp');

  const kpiPeriode = page.locator('[data-testid="grafik-periode-tahun"]');
  await expect(kpiPeriode).toBeVisible();
  const periodeText = await kpiPeriode.innerText();
  expect(periodeText).toMatch(/202\d/); // Memuat tahun 202x

  // 5. Verifikasi Canvas Chart terpasang
  const chartKunjungan = page.locator('canvas#chart-kunjungan-tahun');
  const chartPendapatan = page.locator('canvas#chart-pendapatan-tahun');
  await expect(chartKunjungan).toBeVisible();
  await expect(chartPendapatan).toBeVisible();

  // 6. Uji tombol "Sinkron Database" manual
  await syncDbBtn.click();
  await page.waitForTimeout(600);

  // Toast sukses sinkronisasi muncul
  const toastSuccess = page.locator('text=/sinkronisasi database sukses|grafik total/i');
  await expect(toastSuccess.first()).toBeVisible();

  // Verifikasi tidak ada runtime error fatal di console (termasuk Canvas is already in use)
  const chartErrors = consoleErrors.filter(err => err.toLowerCase().includes('canvas is already in use') || err.toLowerCase().includes('chart'));
  expect(chartErrors).toHaveLength(0);
});
