const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Admin UI/UX Enhancements (Dashboard Widgets, Table Dropdown/Compact View, Form Tabs, and Booking Flow)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // ================= MOCK GOOGLE APPS SCRIPT (OFFLINE & DETERMINISTIK) =================
  // Tanggal memakai waktu LOKAL (bukan UTC) agar selalu lolos filter jadwal
  // "Mendatang" (diff hari <= 0) terlepas dari jam server dijalankan.
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtLocalDate = (dt) => dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
  const todayStr = fmtLocalDate(new Date());
  const futureStr = fmtLocalDate(new Date(Date.now() + 86400000 * 2));

  const mockBookings = [
    {
      id: 'KD26001',
      idBooking: 'KD26001',
      timestamp: '2026-11-20 09:30:00',
      namaAnak: 'Adit Septiawan',
      namaAnanda: 'Adit Septiawan',
      tempatLahir: 'Subang',
      tanggalLahir: '2018-05-12',
      beratBadan: '25',
      tglKhitan: todayStr,
      tanggalKhitan: todayStr,
      jamKhitan: '05:00 WIB',
      metodeKhitan: 'Thermocauter Lem',
      ukuranCelana: 'M',
      obat: 'Syrup',
      namaOrtu: 'Budi Santoso',
      namaPenanggungJawab: 'Budi Santoso',
      usiaPenanggungJawab: '38',
      pekerjaan: 'Karyawan Swasta',
      hubunganKeluarga: 'Ayah',
      noHp: '081234567890',
      nomorHp: '+6281234567890',
      alamat: 'Jl. Otista No. 45 RT 02/RW 04',
      provinsi: 'Jawa Barat',
      kabupaten: 'Subang',
      kecamatan: 'Subang',
      kelurahan: 'Karanganyar',
      status: 'Pending'
    },
    {
      id: 'KD26002',
      idBooking: 'KD26002',
      timestamp: '2026-11-21 14:15:00',
      namaAnak: 'Abil Shidqi Arsalaan',
      namaAnanda: 'Abil Shidqi Arsalaan',
      tempatLahir: 'Bandung',
      tanggalLahir: '2019-08-20',
      beratBadan: '22',
      tglKhitan: futureStr,
      tanggalKhitan: futureStr,
      jamKhitan: '05:20 WIB',
      metodeKhitan: 'Thermocauter Jahit',
      ukuranCelana: 'S',
      obat: 'Syrup',
      namaOrtu: 'Siti Rahma',
      namaPenanggungJawab: 'Siti Rahma',
      usiaPenanggungJawab: '34',
      pekerjaan: 'Guru',
      hubunganKeluarga: 'Ibu',
      noHp: '081987654321',
      nomorHp: '+6281987654321',
      alamat: 'Perum Subang Asri Blok C-12',
      provinsi: 'Jawa Barat',
      kabupaten: 'Subang',
      kecamatan: 'Cibogo',
      kelurahan: 'Cibogo',
      status: 'Confirmed'
    }
  ];

  // Intercept seluruh request ke Google Apps Script
  await page.route(/script\.google\.com/, async (route) => {
    const request = route.request();
    const url = request.url();
    const fulfill = (obj) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(obj)
    });

    if (request.method() === 'POST') {
      let payload = {};
      try { payload = JSON.parse(request.postData() || '{}'); } catch (e) {}

      if (payload.action === 'login') {
        return fulfill({
          status: 'success',
          data: {
            no: 1,
            username: 'denluckyman@gmail.com',
            nama: 'Super Admin',
            role: 'Super Admin',
            token: 'mock-valid-token'
          }
        });
      }
    }

    if (url.includes('action=syncAdminData')) {
      return fulfill({
        status: 'success',
        data: {
          bookings: mockBookings,
          kunjungan: []
        }
      });
    }

    if (url.includes('action=getAllBookings') || url.includes('action=getBookings')) {
      return fulfill({ status: 'success', data: mockBookings });
    }

    // Endpoint lain (getKunjungan, getSettings, getUsers, getReferensi, ...)
    return fulfill({ status: 'success', data: [] });
  });

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
