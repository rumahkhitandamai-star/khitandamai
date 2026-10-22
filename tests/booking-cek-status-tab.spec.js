const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Cek Status is integrated into Booking menu and removed from bottom nav', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Pasang mock endpoint checkStatus
  await page.route('**/exec?*action=checkStatus*', async (route) => {
    const url = new URL(route.request().url());
    const id = (url.searchParams.get('id') || '').toUpperCase();
    const phone = (url.searchParams.get('phone') || '').replace(/\D/g, '');

    if (id === 'KD26001' || phone === '081234567890' || phone.endsWith('81234567890')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          found: true,
          data: {
            id: 'KD26001',
            idBooking: 'KD26001',
            timestamp: '2026-10-10 09:30:00',
            namaAnanda: 'Muhammad Rayhan',
            tempatLahir: 'Subang',
            tanggalLahir: '2018-05-12',
            beratBadan: '25',
            tanggalKhitan: '2026-10-15',
            jamKhitan: '05:00 WIB',
            metodeKhitan: 'Thermocauter Lem',
            ukuranCelana: 'M',
            obat: 'Syrup',
            namaPenanggungJawab: 'Bambang Santoso',
            usiaPenanggungJawab: '38',
            pekerjaan: 'Karyawan Swasta',
            hubunganKeluarga: 'Ayah',
            noHp: '0812****7890',
            nomorHp: '0812****7890',
            alamat: 'Jl. Otista No. 45 RT 02/RW 04',
            provinsi: 'Jawa Barat',
            kabupaten: 'Subang',
            kecamatan: 'Subang',
            kelurahan: 'Karanganyar',
            status: 'Confirmed'
          }
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'not_found',
          found: false,
          message: 'Data booking tidak ditemukan',
          data: null
        })
      });
    }
  });

  // 1. Kunjungi Beranda
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Verifikasi Menu Sticky Bottom Nav TIDAK LAGI memuat 'Cek Status'
  const navCekStatus = page.locator('nav a:has-text("Cek Status")');
  await expect(navCekStatus).toHaveCount(0);

  // Verifikasi Menu Booking ada di nav
  const navBooking = page.locator('nav a:has-text("Booking")');
  await expect(navBooking).toBeVisible();

  // 2. Klik menu Booking di nav bawah
  await navBooking.click();
  await page.waitForTimeout(600);
  expect(page.url()).toContain('#/booking');

  // 3. Verifikasi Tab Switcher di Menu Booking
  const tabForm = page.locator('#tab-btn-form');
  const tabCek = page.locator('#tab-btn-cek');

  await expect(tabForm).toBeVisible();
  await expect(tabCek).toBeVisible();

  // Tab Form aktif secara default
  await expect(page.locator('text=Formulir Pendaftaran Khitan')).toBeVisible();

  // 4. Beralih ke Tab 'Cek Status'
  await tabCek.click();
  await page.waitForTimeout(400);

  // Judul Cek Status tampil dan Formulir Pendaftaran tersembunyi
  await expect(page.locator('text=Cek Bukti & Status Booking')).toBeVisible();
  await expect(page.locator('text=Formulir Pendaftaran Khitan')).not.toBeVisible();

  // Form pencarian ID Booking tampil
  const inputId = page.locator('input[placeholder*="KDHTQ26"]');
  await expect(inputId).toBeVisible();
  await inputId.fill('KD26001');

  const btnCari = page.getByRole('button', { name: 'Cari Bukti' });
  await btnCari.click();
  await page.waitForTimeout(1000);

  // Verifikasi hasil ditemukan
  await expect(page.locator('text=Muhammad Rayhan').first()).toBeVisible();
  await expect(page.locator('text=0812****7890').first()).toBeVisible();

  // 5. Uji tombol Cari Data Booking Lain
  const btnCariLain = page.getByRole('button', { name: 'Cari Data Booking Lain' });
  await expect(btnCariLain).toBeVisible();
  await btnCariLain.click();
  await page.waitForTimeout(400);

  // 6. Uji State Not Found & tombol 'Daftar Baru' switch kembali ke Form
  await inputId.fill('KD99999');
  await btnCari.click();
  await page.waitForTimeout(600);

  await expect(page.locator('text=ID Booking Tidak Ditemukan')).toBeVisible();

  // Klik tombol 'Daftar Baru' pada kartu not-found
  const btnDaftarBaru = page.getByRole('button', { name: 'Daftar Baru' });
  await expect(btnDaftarBaru).toBeVisible();
  await btnDaftarBaru.click();
  await page.waitForTimeout(400);

  // Harus kembali ke tab Form Pendaftaran
  await expect(page.locator('text=Formulir Pendaftaran Khitan')).toBeVisible();
  await expect(page.locator('text=Cek Bukti & Status Booking')).not.toBeVisible();

  // 7. Uji Backward Compatibility tautan #/cek-booking
  await page.goto(filePath + '#/cek-booking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Langsung aktif di menu Booking dengan tab Cek Status
  await expect(page.locator('text=Cek Bukti & Status Booking')).toBeVisible();
  await expect(inputId).toBeVisible();
});
