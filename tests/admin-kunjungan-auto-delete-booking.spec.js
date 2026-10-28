const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Booking row is automatically deleted when transferred and saved to Kunjungan', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

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
      status: "Confirmed"
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
      obat: "Puyer",
      namaOrtu: "Hendra Wijaya",
      namaPenanggungJawab: "Hendra Wijaya",
      usiaPenanggungJawab: "40",
      pekerjaan: "Wiraswasta",
      hubunganKeluarga: "Ayah",
      noHp: "081987654321",
      nomorHp: "+6281987654321",
      alamat: "Jl. Pejuang No. 10",
      provinsi: "Jawa Barat",
      kabupaten: "Subang",
      kecamatan: "Subang",
      kelurahan: "Soklat",
      status: "Pending"
    }
  ];

  let createKunjunganPayload = null;

  // Intercept Google Apps Script API
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

      if (payload.action === 'createKunjungan') {
        createKunjunganPayload = payload;
        const deletedBooking = payload.data && payload.data.idBooking ? payload.data.idBooking : null;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: `Data kunjungan berhasil ditambahkan dengan nomor register KD2610280001 (Data booking ${deletedBooking} telah dihapus dari menu Booking)`,
            data: {
              register: 'KD2610280001',
              deletedBooking: deletedBooking
            }
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

    if (url.includes('action=getKunjungan')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: []
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
  await page.waitForTimeout(1000);

  // 2. Berpindah ke Menu Booking
  const navBooking = page.locator('aside nav button:has-text("Booking")');
  await expect(navBooking).toBeVisible();
  await navBooking.click();
  await page.waitForTimeout(600);

  // 3. Pastikan row KD26001 dan KD26002 terlihat pada tabel booking
  const bookingRow1 = page.locator('tr:has-text("KD26001")');
  const bookingRow2 = page.locator('tr:has-text("KD26002")');
  await expect(bookingRow1.first()).toBeVisible();
  await expect(bookingRow2.first()).toBeVisible();

  // 4. Klik tombol "Proses Data Booking ke Rekam Kunjungan" pada baris KD26001
  const btnKirimKunjungan = bookingRow1.locator('button[title*="Proses Data Booking ke Rekam Kunjungan"]').first();
  await expect(btnKirimKunjungan).toBeVisible();
  await btnKirimKunjungan.click();
  await page.waitForTimeout(600);

  // 5. Pastikan modal Tambah Kunjungan terbuka dengan data ter-prefill dari booking
  const modalKunjungan = page.locator('.kunjungan-compact');
  await expect(modalKunjungan).toBeVisible();

  // Verifikasi banner ID Booking dan inputan form
  const inputNama = modalKunjungan.locator('input[placeholder*="Nama lengkap anak" i]');
  await expect(inputNama).toHaveValue('Muhammad Rayhan');

  // Beralih ke tab 'all' (Semua) agar seluruh formulir termasuk Bagian 5 (Biaya & ID Booking) terlihat
  const btnTabAll = modalKunjungan.locator('button:has-text("Semua")');
  await btnTabAll.click();
  await page.waitForTimeout(300);

  const inputIdBooking = modalKunjungan.locator('input[placeholder="Dari booking"]');
  await expect(inputIdBooking).toHaveValue('KD26001');

  // Verifikasi catatan otomatis hapus muncul
  const hintAutoDelete = modalKunjungan.locator('text=*Baris data booking ini akan otomatis dihapus');
  await expect(hintAutoDelete).toBeVisible();

  // 6. Klik tombol Simpan Data Kunjungan
  const btnSimpan = modalKunjungan.locator('button[type="submit"]:has-text("Simpan Data")').first();
  await btnSimpan.click();
  await page.waitForTimeout(1000);

  // 7. Verifikasi payload yang dikirim ke server memuat deleteSourceBooking: true dan idBooking: KD26001
  expect(createKunjunganPayload).not.toBeNull();
  expect(createKunjunganPayload.action).toBe('createKunjungan');
  expect(createKunjunganPayload.deleteSourceBooking).toBe(true);
  expect(createKunjunganPayload.data.idBooking).toBe('KD26001');

  // 8. Berpindah kembali ke Menu Booking (unhide sidebar bila tersembunyi)
  const unhideBtn = page.locator('button[title="Tampilkan Sidebar (Unhide)"]');
  if (await unhideBtn.isVisible()) {
    await unhideBtn.click();
    await page.waitForTimeout(300);
  }
  const tabBookingBtn = page.locator('aside nav button:has-text("Booking")');
  await tabBookingBtn.click();
  await page.waitForTimeout(600);

  // 9. Pastikan KD26001 SUDAH TERHAPUS dan tidak ada di tabel, sedangkan KD26002 TETAP ADA
  await expect(page.locator('tr:has-text("KD26001")')).toHaveCount(0);
  await expect(page.locator('tr:has-text("KD26002")').first()).toBeVisible();
});
