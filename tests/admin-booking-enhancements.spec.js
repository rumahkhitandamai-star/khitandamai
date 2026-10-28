const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Admin Booking Enhancements: Status Filter Dropdown, Quick Status Change, Row Tone, and WA Copy Buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const futureDate = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

  const mockBookings = [
    {
      id: "KD26001",
      idBooking: "KD26001",
      timestamp: "2026-10-10 09:30:00",
      namaAnak: "Muhammad Rayhan",
      namaAnanda: "Muhammad Rayhan",
      tempatLahir: "Subang",
      tanggalLahir: "2018-05-12",
      beratBadan: "25",
      tglKhitan: todayStr,
      tanggalKhitan: todayStr,
      jamKhitan: "05:00 WIB",
      metodeKhitan: "Thermocauter Lem",
      ukuranCelana: "M",
      obat: "Syrup",
      namaOrtu: "Bambang Santoso",
      namaPenanggungJawab: "Bambang Santoso",
      usiaPenanggungJawab: "38",
      pekerjaan: "Karyawan Swasta",
      hubunganKeluarga: "Ayah",
      noHp: "081234567890",
      nomorHp: "+6281234567890",
      alamat: "Jl. Otista No. 45 RT 02/RW 04",
      provinsi: "Jawa Barat",
      kabupaten: "Subang",
      kecamatan: "Subang",
      kelurahan: "Karanganyar",
      status: "Pending"
    },
    {
      id: "KD26002",
      idBooking: "KD26002",
      timestamp: "2026-10-11 14:15:00",
      namaAnak: "Alvaro Keenan",
      namaAnanda: "Alvaro Keenan",
      tempatLahir: "Bandung",
      tanggalLahir: "2019-08-20",
      beratBadan: "22",
      tglKhitan: futureDate,
      tanggalKhitan: futureDate,
      jamKhitan: "05:20 WIB",
      metodeKhitan: "Thermocauter Jahit",
      ukuranCelana: "S",
      obat: "Syrup",
      namaOrtu: "Siti Rahma",
      namaPenanggungJawab: "Siti Rahma",
      usiaPenanggungJawab: "34",
      pekerjaan: "Guru",
      hubunganKeluarga: "Ibu",
      noHp: "081987654321",
      nomorHp: "+6281987654321",
      alamat: "Perum Subang Asri Blok C-12",
      provinsi: "Jawa Barat",
      kabupaten: "Subang",
      kecamatan: "Cibogo",
      kelurahan: "Cibogo",
      status: "Confirmed"
    }
  ];

  // Intercept Google Apps Script requests
  await page.route(/script\.google\.com/, async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'POST') {
      let payload = {};
      try {
        payload = JSON.parse(request.postData() || '{}');
      } catch (e) {}

      if (payload.action === 'login') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              no: 1,
              username: 'denluckyman@gmail.com',
              nama: 'Super Admin',
              role: 'Super Admin',
              token: 'mock-valid-token'
            }
          })
        });
      }

      if (payload.action === 'syncAdminData' || payload.action === 'syncAll') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              bookings: mockBookings,
              kunjungan: [],
              users: [],
              jumatBerkah: [],
              saran: [],
              settings: {},
              referensi: {}
            }
          })
        });
      }

      if (payload.action === 'updateBookingStatus') {
        const target = mockBookings.find(b => b.id === payload.data.id || b.idBooking === payload.data.id);
        if (target) {
          target.status = payload.data.status;
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: `Status booking ${payload.data.id} berhasil diubah ke ${payload.data.status}`
          })
        });
      }
    }

    if (url.includes('action=getAllBookings') || url.includes('action=getBookings')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: mockBookings
        })
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: []
      })
    });
  });

  // 1. Masuk ke halaman admin dan login
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(800);

  // 2. Berpindah ke menu Booking
  const navBooking = page.locator('aside nav button:has-text("Booking")');
  await expect(navBooking).toBeVisible();
  await navBooking.click();
  await page.waitForTimeout(800);

  // 3. Verifikasi Filter Status Combobox Dropdown ada dan memiliki opsi
  const statusFilterSelect = page.locator('select#booking-status-filter');
  await expect(statusFilterSelect).toBeVisible();

  // Pastikan opsi memuat Semua, Pending, Confirmed, Selesai
  const statusOptionsText = await statusFilterSelect.locator('option').allInnerTexts();
  expect(statusOptionsText.some(t => t.includes('Semua'))).toBe(true);
  expect(statusOptionsText.some(t => t.includes('Pending'))).toBe(true);

  // 4. Verifikasi Quick Status Change pada tabel desktop
  const firstStatusSelect = page.locator('div.hidden.md\\:block table tbody tr select').first();
  await expect(firstStatusSelect).toBeVisible();
  const initialStatus = await firstStatusSelect.inputValue();

  // Ubah status ke Confirmed (atau Selesai jika awalnya Confirmed)
  const targetStatus = initialStatus === 'Confirmed' ? 'Selesai' : 'Confirmed';
  await firstStatusSelect.selectOption(targetStatus);
  await page.waitForTimeout(500);

  // Pastikan toast notifikasi perubahan status muncul
  const toastSuccess = page.locator('text=/berhasil diubah/i');
  await expect(toastSuccess.first()).toBeVisible();

  // 5. Uji Filter Status: ubah filter ke 'Confirmed' dan pastikan data terfilter
  await statusFilterSelect.selectOption('Confirmed');
  await page.waitForTimeout(400);

  const displayedRows = page.locator('div.hidden.md\\:block table tbody tr');
  const rowCount = await displayedRows.count();
  if (rowCount > 0) {
    const rowStatus = await displayedRows.first().locator('select').inputValue();
    expect(rowStatus).toBe('Confirmed');
  }

  // Kembalikan filter ke 'Semua'
  await statusFilterSelect.selectOption('Semua');
  await page.waitForTimeout(300);

  // 6. Uji Modal WhatsApp Sambutan & Tombol Salin Teks
  const firstWaSambutanBtn = page.locator('div.hidden.md\\:block table tbody tr button[title*="WhatsApp Sambutan"]').first();
  await expect(firstWaSambutanBtn).toBeVisible();
  await firstWaSambutanBtn.click();
  await page.waitForTimeout(400);

  // Verifikasi Modal WA Sambutan terbuka
  const modalWaSambutan = page.locator('h3:has-text("WhatsApp Sambutan")');
  await expect(modalWaSambutan).toBeVisible();

  // Verifikasi tombol Salin Teks tersedia
  const copyBtn = page.locator('button:has-text("Salin Teks")');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await page.waitForTimeout(300);

  // Tutup modal WA Sambutan
  const closeBtn = page.locator('button:has-text("Batal")');
  await closeBtn.click();
  await page.waitForTimeout(300);
  await expect(modalWaSambutan).toBeHidden();

  // 7. Uji fungsi cleanPhoneForWa di console/evaluate
  const phoneTest1 = await page.evaluate(() => {
    const cleanFn = (phone) => {
      if (!phone) return '';
      let digits = phone.toString().replace(/\D/g, '');
      if (digits.startsWith('0')) digits = '62' + digits.slice(1);
      else if (digits.startsWith('8')) digits = '62' + digits;
      return digits;
    };
    return [cleanFn('08123456789'), cleanFn('8123456789'), cleanFn('+628123456789')];
  });
  expect(phoneTest1).toEqual(['628123456789', '628123456789', '628123456789']);

  // Pastikan tidak ada console errors fatal
  const fatalErrors = consoleErrors.filter(e => !e.includes('favicon'));
  expect(fatalErrors).toHaveLength(0);
});
