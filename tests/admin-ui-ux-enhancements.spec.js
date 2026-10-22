const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Admin UI/UX Enhancements (Dashboard Widgets, Table Dropdown/Compact View, Form Tabs, and Booking Flow)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // 1. Masuk ke Panel Admin
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Login dengan akun mock
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(800);

  // 2. Verifikasi Widget Operasional Harian di Dashboard
  const widgetOperasional = page.locator('text=Operasional & Pasien Hari Ini');
  await expect(widgetOperasional).toBeVisible();

  const kartuPasienHariIni = page.locator('text=Pasien Khitan Hari Ini');
  await expect(kartuPasienHariIni).toBeVisible();

  const kartuBookingPending = page.locator('text=Booking Tindak Lanjut');
  await expect(kartuBookingPending).toBeVisible();

  const kartuAksiCepat = page.locator('text=Aksi Cepat Operator');
  await expect(kartuAksiCepat).toBeVisible();

  // 3. Masuk ke Tab Kunjungan melalui tombol pintas widget operasional atau menu navigasi
  const bukaKunjunganBtn = page.locator('button:has-text("Buka Kunjungan →")');
  await expect(bukaKunjunganBtn).toBeVisible();
  await bukaKunjunganBtn.click();
  await page.waitForTimeout(600);

  // Sakelar Tampilan Kolom (Ringkas 10 Kolom vs Semua Kolom 30 Kolom)
  const modeRingkasBtn = page.locator('button:has-text("Mode Ringkas (10 Kolom)")');
  const modeSemuaBtn = page.locator('button:has-text("Semua Kolom (30 Kolom)")');
  await expect(modeRingkasBtn).toBeVisible();
  await expect(modeSemuaBtn).toBeVisible();

  // Klik mode Semua Kolom
  await modeSemuaBtn.click();
  await page.waitForTimeout(200);
  await expect(modeSemuaBtn).toHaveClass(/bg-tosca-700/);

  // Kembalikan ke Mode Ringkas
  await modeRingkasBtn.click();
  await page.waitForTimeout(200);
  await expect(modeRingkasBtn).toHaveClass(/bg-tosca-700/);

  // 4. Buka Modal Tambah Kunjungan dan Verifikasi Tabulasi Form (Biodata, Tindakan, Biaya)
  const tambahKunjunganBtn = page.locator('button:has-text("Tambah Kunjungan")');
  await tambahKunjunganBtn.click();
  await page.waitForTimeout(400);

  const tabBiodata = page.locator('button:has-text("1. Biodata & Alamat")');
  const tabTindakan = page.locator('button:has-text("2. Tindakan Medis")');
  const tabBiaya = page.locator('button:has-text("3. Administrasi & Biaya")');
  const tabSemua = page.locator('button:has-text("Semua Bagian")');

  await expect(tabBiodata).toBeVisible();
  await expect(tabTindakan).toBeVisible();
  await expect(tabBiaya).toBeVisible();
  await expect(tabSemua).toBeVisible();

  // Klik tab 2: Tindakan Medis
  await tabTindakan.click();
  await page.waitForTimeout(200);
  await expect(page.locator('text=Langkah 2/3: Tanggal, Metode, Obat & Klamp')).toBeVisible();

  // Klik tab 3: Administrasi & Biaya
  await tabBiaya.click();
  await page.waitForTimeout(200);
  await expect(page.locator('text=Langkah 3/3: Status Pembayaran, BMHP & Fee')).toBeVisible();

  // Tutup Modal
  const batalBtn = page.locator('footer button:has-text("Batal")');
  await batalBtn.click();
  await page.waitForTimeout(400);

  // 5. Masuk ke Tab Booking dan Verifikasi Tombol Proses ke Kunjungan
  // Unhide sidebar jika sedang tersembunyi
  const unhideBtn = page.locator('button[title="Tampilkan Sidebar (Unhide)"]');
  if (await unhideBtn.isVisible()) {
    await unhideBtn.click();
    await page.waitForTimeout(300);
  }

  const tabBookingBtn = page.locator('nav.space-y-1 button:has-text("Booking")');
  await tabBookingBtn.click();
  await page.waitForTimeout(600);

  // Tombol Proses Data Booking ke Rekam Kunjungan harus ada di tabel booking
  const prosesBtn = page.locator('button[title*="Proses Data Booking ke Rekam Kunjungan"]').first();
  await expect(prosesBtn).toBeVisible();
});
