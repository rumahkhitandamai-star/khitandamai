const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Cek Booking with Phone Number Fallback Option and Privacy Masking', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Pasang mock route untuk endpoint checkStatus agar pengujian deterministik dan cepat
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

  await page.goto(filePath + '#/cek-booking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Verifikasi tab pemilih mode ada dan ID Booking aktif secara default
  const tabId = page.getByRole('button', { name: 'ID Booking', exact: true });
  const tabPhone = page.getByRole('button', { name: 'Nomor HP (Lupa ID)', exact: true });

  await expect(tabId).toBeVisible();
  await expect(tabPhone).toBeVisible();

  // 2. Uji Pencarian via ID Booking (KD26001)
  const inputId = page.locator('input[placeholder*="KDHTQ26"]');
  await expect(inputId).toBeVisible();
  await inputId.fill('KD26001');

  const btnCari = page.getByRole('button', { name: 'Cari Bukti' });
  await btnCari.click();
  await page.waitForTimeout(1000);

  // Verifikasi hasil ditemukan
  const hasilNama = page.locator('text=Muhammad Rayhan');
  await expect(hasilNama.first()).toBeVisible();

  // Verifikasi nomor HP disensor (0812****7890)
  const maskedPhone = page.locator('text=0812****7890');
  await expect(maskedPhone.first()).toBeVisible();

  // 3. Reset dan beralih ke Mode Nomor HP
  const btnCariLain = page.getByRole('button', { name: 'Cari Data Booking Lain' });
  await expect(btnCariLain).toBeVisible();
  await btnCariLain.click();
  await page.waitForTimeout(400);

  // Klik tab Nomor HP
  await tabPhone.click();
  await page.waitForTimeout(300);

  // Input Nomor HP sekarang harus tampil
  const inputPhone = page.locator('input[placeholder*="081234567890"]');
  await expect(inputPhone).toBeVisible();

  // 4. Uji Pencarian via Nomor HP terdaftar (081234567890)
  await inputPhone.fill('081234567890');
  const btnCariPhone = page.getByRole('button', { name: 'Cari Bukti' });
  await btnCariPhone.click();
  await page.waitForTimeout(1000);

  // Verifikasi berhasil menemukan booking via No. HP
  await expect(page.locator('text=Muhammad Rayhan').first()).toBeVisible();
  await expect(page.locator('text=0812****7890').first()).toBeVisible();

  // 5. Reset dan uji nomor yang TIDAK terdaftar
  await btnCariLain.click();
  await page.waitForTimeout(400);

  await tabPhone.click();
  await page.waitForTimeout(300);
  await inputPhone.fill('089999999999');
  await btnCariPhone.click();
  await page.waitForTimeout(1000);

  // Verifikasi alert pesan tidak ditemukan khusus nomor HP
  const alertNotFound = page.locator('h4:has-text("Nomor HP Tidak Ditemukan")');
  await expect(alertNotFound).toBeVisible();

  // Tombol Coba Lagi mengembalikan formulir
  const btnCobaLagi = page.getByRole('button', { name: 'Coba Lagi' });
  await expect(btnCobaLagi).toBeVisible();
  await btnCobaLagi.click();
  await page.waitForTimeout(400);

  // Form pencarian kembali aktif
  await expect(inputPhone).toBeVisible();
});
