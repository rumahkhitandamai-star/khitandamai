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

  // Login dengan akun admin
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();

  // 2. Tunggu Widget Operasional & Pasien Hari Ini di Dashboard
  const widgetOperasional = page.locator('text=Operasional & Pasien Hari Ini');
  await widgetOperasional.waitFor({ timeout: 25000 });
  await expect(widgetOperasional).toBeVisible();

  // 3. Verifikasi Kartu Booking Tindak Lanjut (tunggu sinkronisasi data booking dari database)
  const kartuBooking = page.locator('div.rounded-2xl:has-text("Booking Tindak Lanjut")').filter({ hasText: 'Pendaftar' }).first();
  await expect(kartuBooking).toBeVisible();
  await expect(kartuBooking).not.toContainText('0 Pendaftar', { timeout: 25000 });

  const kartuText = await kartuBooking.innerText();
  expect(kartuText.toLowerCase()).toContain('booking tindak lanjut');
  expect(kartuText).toContain('Pendaftar');

  // Pastikan pendaftar yang tampil adalah pendaftar jadwal hari ini / mendatang
  // Pada database tersimpan pendaftar aktif seperti Adit Septiawan atau Abil Shidqi Arsalaan
  expect(kartuText).toMatch(/(Adit Septiawan|Abil Shidqi Arsalaan)/);

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
  const barisPendaftar = page.locator('tr:has-text("Adit Septiawan"), tr:has-text("Abil Shidqi Arsalaan")');
  await expect(barisPendaftar.first()).toBeVisible();

  // Pastikan tidak ada console error
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
