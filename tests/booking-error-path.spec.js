const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Booking submission fails gracefully and does NOT show receipt when backend returns error', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Intercept GAS endpoint POST createBooking to return an error status
  await page.route(/script\.google\.com/, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          message: 'Simulasi kegagalan server: kuota pendaftaran penuh atau data tidak lengkap.'
        })
      });
    }
    return route.continue();
  });

  await page.goto(filePath + '#/booking', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__kdSubmitBooking === 'function');

  // Trigger pengisian form dan submit langsung via vue state di page context
  await page.evaluate(async () => {
    const fb = window.__kdFormBooking.value;
    fb.idBooking = 'KDERR01';
    fb.namaAnanda = 'Ananda Test Gagal';
    fb.tempatLahir = 'Subang';
    fb.tanggalLahir = '2018-05-12';
    fb.beratBadan = 25;
    fb.tanggalKhitan = '2026-11-20';
    fb.jamKhitan = '08:00 WIB';
    fb.metodeKhitan = 'Metode Lem Khitan Damai';
    fb.ukuranCelana = 'M';
    fb.obat = 'Standar';
    fb.namaPenanggungJawab = 'Bapak Test';
    fb.usiaPenanggungJawab = 35;
    fb.pekerjaan = 'Karyawan Swasta';
    fb.hubunganKeluarga = 'Ayah';
    fb.nomorHpInput = '81234567890';
    fb.alamat = 'Jl. Test No. 123 Sukamelang Subang';
    fb.alamatLokasi = {
      provinsi: 'Jawa Barat',
      kabupaten: 'Subang',
      kecamatan: 'Subang',
      kelurahan: 'Karanganyar'
    };

    // Jalankan submit
    await window.__kdSubmitBooking();
  });

  // Dialog error harus muncul
  const alertDialog = page.locator('text=Pengiriman Gagal');
  await expect(alertDialog).toBeVisible({ timeout: 5000 });

  // Dialog pesan error harus memuat pesan dari server
  const errorText = page.locator('text=Simulasi kegagalan server');
  await expect(errorText).toBeVisible();

  // BUKTI BOOKING / STRUK SUKSES TIDAK BOLEH MUNCUL
  const receiptTitle = page.locator('text=BUKTI BOOKING KHITAN');
  await expect(receiptTitle).toHaveCount(0);
});
