const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Booking Compact/Full View Mode Switcher and Dashboard Sub-view Simplification & Unified Sync', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

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

    // Sinkronisasi terpadu (GET) dipakai tombol "Perbarui Data"
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

  // 1. Masuk ke halaman admin dan login
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(800);

  // ================= 2. UJI PENYEDERHANAAN DASHBOARD =================
  // A. Verifikasi Segmented Control Sub-tampilan Dashboard
  const btnSemuaTampilan = page.locator('button:has-text("Semua Tampilan")');
  const btnOperasionalHarian = page.locator('button:has-text("Operasional Harian")');
  const btnLaporanKeuangan = page.locator('button:has-text("Laporan & Keuangan")');

  await expect(btnSemuaTampilan).toBeVisible();
  await expect(btnOperasionalHarian).toBeVisible();
  await expect(btnLaporanKeuangan).toBeVisible();

  // Default aktif: Semua Tampilan
  await expect(btnSemuaTampilan).toHaveClass(/bg-tosca-700/);

  // Widget operasional & kartu grafik total keduanya terlihat saat 'Semua Tampilan'
  const widgetOperasional = page.locator('text=Operasional & Pasien Hari Ini');
  const cardGrafikTotal = page.locator('h4:has-text("Card Grafik Total")');
  await expect(widgetOperasional).toBeVisible();
  await expect(cardGrafikTotal).toBeVisible();

  // B. Switch ke 'Operasional Harian'
  await btnOperasionalHarian.click();
  await page.waitForTimeout(300);
  await expect(btnOperasionalHarian).toHaveClass(/bg-tosca-700/);
  await expect(widgetOperasional).toBeVisible();
  await expect(cardGrafikTotal).toBeHidden();

  // C. Switch ke 'Laporan & Keuangan'
  await btnLaporanKeuangan.click();
  await page.waitForTimeout(300);
  await expect(btnLaporanKeuangan).toHaveClass(/bg-tosca-700/);
  await expect(cardGrafikTotal).toBeVisible();
  await expect(widgetOperasional).toBeHidden();

  // D. Kembalikan ke 'Semua Tampilan'
  await btnSemuaTampilan.click();
  await page.waitForTimeout(300);
  await expect(btnSemuaTampilan).toHaveClass(/bg-tosca-700/);
  await expect(widgetOperasional).toBeVisible();
  await expect(cardGrafikTotal).toBeVisible();

  // E. Uji Tombol Sinkronisasi Terpadu di Header Dashboard
  const perbaruiBtn = page.locator('button:has-text("Perbarui Data")');
  await expect(perbaruiBtn).toBeVisible();
  await perbaruiBtn.click();
  await page.waitForTimeout(600);

  // Pastikan toast sukses sinkronisasi terpadu muncul
  const toastSync = page.locator('text=/sinkronisasi|berhasil disinkronkan/i');
  await expect(toastSync.first()).toBeVisible();

  // ================= 3. UJI MODE RINGKAS KOLOM TAB BOOKING =================
  // Pindah ke Tab Booking lewat sidebar desktop
  const navBooking = page.locator('aside nav button:has-text("Booking")');
  await expect(navBooking).toBeVisible();
  await navBooking.click();
  await page.waitForTimeout(800);

  // Verifikasi sakelar mode kolom pada Booking
  const modeRingkasBookingBtn = page.locator('button:has-text("Mode Ringkas (9 Kolom)")');
  const modeSemuaBookingBtn = page.locator('button:has-text("Semua Kolom (22 Kolom)")');
  await expect(modeRingkasBookingBtn).toBeVisible();
  await expect(modeSemuaBookingBtn).toBeVisible();

  // Default mode: Mode Ringkas
  await expect(modeRingkasBookingBtn).toHaveClass(/bg-tosca-700/);

  // Verifikasi kolom STATUS ada dan terlihat di header tabel
  const colStatusHeader = page.locator('table thead th:has-text("STATUS")');
  await expect(colStatusHeader).toBeVisible();

  // Verifikasi kolom esensial terlihat: ID BOOKING, NAMA ANANDA, TANGGAL KHITAN, METODE KHITAN, NOMOR HP
  await expect(page.locator('table thead th:has-text("ID BOOKING")')).toBeVisible();
  await expect(page.locator('table thead th:has-text("NAMA ANANDA")')).toBeVisible();
  await expect(page.locator('table thead th:has-text("TANGGAL KHITAN")')).toBeVisible();
  await expect(page.locator('table thead th:has-text("METODE KHITAN")')).toBeVisible();
  await expect(page.locator('table thead th:has-text("NOMOR HP")')).toBeVisible();

  // Verifikasi kolom non-esensial TERSEMBUNYI pada Mode Ringkas
  await expect(page.locator('table thead th:has-text("TEMPAT LAHIR")')).toBeHidden();
  await expect(page.locator('table thead th:has-text("BERAT BADAN")')).toBeHidden();
  await expect(page.locator('table thead th:has-text("UKURAN CELANA")')).toBeHidden();
  await expect(page.locator('table thead th:has-text("PEKERJAAN")')).toBeHidden();

  // Verifikasi tabel memiliki class lebar ringkas min-w-[1250px]
  const tableEl = page.locator('div.hidden.md\\:block table');
  await expect(tableEl).toHaveClass(/min-w-\[1250px\]/);

  // Beralih ke 'Semua Kolom (22 Kolom)'
  await modeSemuaBookingBtn.click();
  await page.waitForTimeout(300);
  await expect(modeSemuaBookingBtn).toHaveClass(/bg-tosca-700/);

  // Sekarang kolom-kolom detail harus MUNCUL
  await expect(page.locator('table thead th:has-text("TEMPAT LAHIR")')).toBeVisible();
  await expect(page.locator('table thead th:has-text("BERAT BADAN")')).toBeVisible();
  await expect(page.locator('table thead th:has-text("UKURAN CELANA")')).toBeVisible();
  await expect(page.locator('table thead th:has-text("PEKERJAAN")')).toBeVisible();
  await expect(tableEl).toHaveClass(/min-w-\[2900px\]/);

  // Kembalikan ke Mode Ringkas (9 Kolom)
  await modeRingkasBookingBtn.click();
  await page.waitForTimeout(300);
  await expect(modeRingkasBookingBtn).toHaveClass(/bg-tosca-700/);
  await expect(page.locator('table thead th:has-text("TEMPAT LAHIR")')).toBeHidden();
  await expect(tableEl).toHaveClass(/min-w-\[1250px\]/);

  // Pastikan tidak ada console error fatal
  const fatalErrors = consoleErrors.filter(e => !e.includes('favicon'));
  expect(fatalErrors).toHaveLength(0);
});
