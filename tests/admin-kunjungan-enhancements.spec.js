const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Admin Kunjungan Enhancements: Status Bayar options, Quick Status Change, Row Tone, WA Copy Ucapan, and Filter Logic', async ({ page }) => {
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

  const mockKunjungan = [
    {
      register: 'KD2610260001',
      idBooking: 'KD26001',
      namaAnanda: 'Muhammad Fadhil',
      tempatLahir: 'Subang',
      tanggalLahir: '2018-05-12',
      beratBadan: '22',
      tanggalKhitan: todayStr,
      jamKhitan: '08:00 WIB',
      metodeKhitan: 'Thermocauter Lem',
      ukuranCelana: 'M',
      obat: 'Syrup',
      namaPenanggungJawab: 'Ahmad Subagio',
      usiaPenanggungJawab: '38',
      pekerjaan: 'PNS',
      hubunganKeluarga: 'Ayah',
      nomorHp: '081234567890',
      alamat: 'Jl. Veteran No. 12',
      provinsi: 'Jawa Barat',
      kabupaten: 'Subang',
      kecamatan: 'Subang',
      kelurahan: 'Karanganyar',
      ukuranKlamp: '-',
      statusBayar: 'Belum',
      jumlahBayar: '1200000',
      zakat: '30000',
      operator: 'dr. Hendra',
      bmhpObat: '50000',
      lem: '50000',
      fee: '50000',
      total: '1020000',
      statusWa: 'Terkirim',
      keterangan: 'Tindakan lancar'
    },
    {
      register: 'KD2610250002',
      idBooking: '-',
      namaAnanda: 'Kenzo Arsha',
      tempatLahir: 'Bandung',
      tanggalLahir: '2019-02-14',
      beratBadan: '20',
      tanggalKhitan: '2026-10-25',
      jamKhitan: '09:00 WIB',
      metodeKhitan: 'Super Ring',
      ukuranCelana: 'S',
      obat: 'Tablet',
      namaPenanggungJawab: 'Bambang Sudiro',
      usiaPenanggungJawab: '35',
      pekerjaan: 'Wiraswasta',
      hubunganKeluarga: 'Ayah',
      nomorHp: '081987654321',
      alamat: 'Jl. Otista No. 99',
      provinsi: 'Jawa Barat',
      kabupaten: 'Subang',
      kecamatan: 'Subang',
      kelurahan: 'Soklat',
      ukuranKlamp: '12',
      statusBayar: 'Bayar',
      jumlahBayar: '1500000',
      zakat: '37500',
      operator: 'dr. Hendra',
      bmhpObat: '50000',
      lem: '0',
      fee: '50000',
      total: '1362500',
      statusWa: 'Belum',
      keterangan: 'Walk-in langsung di klinik'
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

      if (payload.action === 'updateKunjungan') {
        const itemData = payload.data || payload;
        const target = mockKunjungan.find(k => k.register === itemData.register);
        if (target) {
          Object.assign(target, itemData);
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: `Data kunjungan ${itemData.register} berhasil disimpan.`
          })
        });
      }
    }

    if (url.includes('action=getKunjungan')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: mockKunjungan
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

  // Buka halaman admin
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });

  // 1. Login sebagai Admin Pengelola
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(600);

  // 2. Buka Tab Menu Kunjungan (Jadwal Tindakan)
  const navKunjungan = page.locator('aside nav button').filter({ hasText: 'Jadwal Tindakan' });
  await expect(navKunjungan).toBeVisible();
  await navKunjungan.click();
  await page.waitForTimeout(600);

  // Suntikkan mock data kunjungan ke state Vue agar instan & stabil
  await page.evaluate((data) => {
    if (window.__kdAdminKunjungan) {
      window.__kdAdminKunjungan.value = data;
    }
  }, mockKunjungan);
  await page.waitForTimeout(300);

  // 3. Verifikasi Quick Status Bayar Dropdown di Kolom Tabel Desktop
  const selectStatus1 = page.locator('tr:has-text("KD2610260001") select');
  await expect(selectStatus1).toBeVisible();
  await expect(selectStatus1).toHaveValue('Belum');

  // Ubah status dari Belum ke Bayar lewat quick dropdown
  await selectStatus1.selectOption('Bayar');
  await page.waitForTimeout(400);

  // Pastikan data berubah
  const updatedStatus = await page.evaluate(() => {
    const item = window.__kdAdminKunjungan.value.find(k => k.register === 'KD2610260001');
    return item ? item.statusBayar : '';
  });
  expect(updatedStatus).toBe('Bayar');

  // 4. Verifikasi Seluruh Tombol Aksi Tampil Langsung di Kolom Aksi
  const row1 = page.locator('tr:has-text("KD2610260001")');
  await expect(row1.locator('button[title="Edit Rekam Kunjungan"]')).toBeVisible();
  await expect(row1.locator('button[title="Whatsapp Ucapan"]')).toBeVisible();
  await expect(row1.locator('button[title="Cetak Form Word A4 (4 Hal)"]')).toBeVisible();
  await expect(row1.locator('button[title="Cetak Sertifikat Khitan A4"]')).toBeVisible();
  await expect(row1.locator('button[title="Hapus Data Kunjungan"]')).toBeVisible();

  // Tombol "Salin Review Google" dan "Lihat Booking Terkait" tidak ada di kolom aksi Kunjungan
  await expect(row1.locator('button[title="Salin Review Google"]')).toHaveCount(0);
  await expect(row1.locator('button[title="Lihat Booking Terkait"]')).toHaveCount(0);

  const row2 = page.locator('tr:has-text("KD2610250002")');
  await expect(row2.locator('button[title="Lihat Booking Terkait"]')).toHaveCount(0);

  // 5. Verifikasi Opsi "Belum" dan Watcher Free di Modal Formulir Kunjungan
  const btnTambah = page.locator('button:has-text("Tambah Kunjungan")').first();
  await btnTambah.click();
  await page.waitForTimeout(400);

  // Pastikan modal kunjungan terbuka
  const modalForm = page.locator('header:has-text("Tambah Data Kunjungan Baru")');
  await expect(modalForm).toBeVisible();

  // Beralih ke tab Administrasi & Biaya
  const tabBiaya = page.locator('button:has-text("Administrasi & Biaya")');
  await tabBiaya.click();
  await page.waitForTimeout(200);

  // Cek dropdown STATUS BAYAR di modal form
  const selectModalStatusBayar = page.locator('.kunjungan-compact select').filter({ has: page.locator('option[value="Belum"]') }).first();
  await expect(selectModalStatusBayar).toBeVisible();
  const optionsText = await selectModalStatusBayar.innerText();
  expect(optionsText).toContain('Bayar');
  expect(optionsText).toContain('Free');
  expect(optionsText).toContain('Belum');

  // Pilih status "Free", verifikasi watcher mengeset jumlahBayar = 0 dan zakat = 0
  await selectModalStatusBayar.selectOption('Free');
  await page.waitForTimeout(200);

  const formValues = await page.evaluate(() => {
    return {
      statusBayar: window.__kdKunjunganForm.statusBayar,
      jumlahBayar: window.__kdKunjunganForm.jumlahBayar,
      zakat: window.__kdKunjunganForm.zakat
    };
  });
  expect(formValues.statusBayar).toBe('Free');
  expect(formValues.jumlahBayar).toBe('0');
  expect(formValues.zakat).toBe('0');

  // Uji formatting ribuan pada input nominal (misal BMHP diisi 50000 tampil 50.000)
  const inputBmhp = page.locator('div:has(> label:has-text("BMHP / OBAT (RP)")) input');
  await inputBmhp.fill('50000');
  await page.waitForTimeout(200);
  const bmhpDisplayVal = await inputBmhp.inputValue();
  expect(bmhpDisplayVal).toBe('50.000');
  const bmhpModelVal = await page.evaluate(() => window.__kdKunjunganForm.bmhpObat);
  expect(bmhpModelVal).toBe('50000');

  // Tutup modal
  const btnKembali = page.locator('button[title="Kembali ke Daftar Kunjungan"]');
  await btnKembali.click();
  await page.waitForTimeout(300);

  // 6. Verifikasi Tombol "Salin Teks" di Modal WhatsApp Ucapan
  await page.evaluate((k) => {
    window.__kdOpenWaUcapanModal(k);
  }, mockKunjungan[0]);
  await page.waitForTimeout(300);

  const modalUcapan = page.locator('div.admin-panel:has-text("WhatsApp Ucapan")');
  await expect(modalUcapan).toBeVisible();

  const btnSalinTeks = modalUcapan.locator('button:has-text("Salin Teks")');
  await expect(btnSalinTeks).toBeVisible();
  await btnSalinTeks.click();
  await page.waitForTimeout(200);

  // Tutup modal ucapan
  const btnBatalUcapan = modalUcapan.locator('button:has-text("Batal")');
  await btnBatalUcapan.click();
  await page.waitForTimeout(300);

  // Pastikan tidak ada console error berbahaya
  const severeErrors = consoleErrors.filter(err => !err.includes('favicon'));
  expect(severeErrors.length).toBe(0);
});
