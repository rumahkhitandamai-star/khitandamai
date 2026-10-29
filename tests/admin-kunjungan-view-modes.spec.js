import { test, expect } from '@playwright/test';
import path from 'path';

test('Verify Admin Kunjungan Compact Mode and Full 30-Column Grouped Mode', async ({ page }) => {
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  const todayStr = '2026-10-29';
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
      ukuranKlamp: '14',
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
    }
  ];

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

  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });

  // 1. Login
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(600);

  // 2. Ke Tab Kunjungan
  const navKunjungan = page.locator('aside nav button').filter({ hasText: 'Jadwal Tindakan' });
  await expect(navKunjungan).toBeVisible();
  await navKunjungan.click();
  await page.waitForTimeout(600);

  // Suntikkan mock data kunjungan
  await page.evaluate((data) => {
    if (window.__kdAdminKunjungan) {
      window.__kdAdminKunjungan.value = data;
    }
  }, mockKunjungan);
  await page.waitForTimeout(300);

  // 3. Verifikasi Mode Ringkas (Default)
  const btnCompact = page.locator('button:has-text("Mode Ringkas")');
  const btnFull = page.locator('button:has-text("Semua Kolom")');
  await expect(btnCompact).toBeVisible();
  await expect(btnFull).toBeVisible();

  // Mode Ringkas harus menampilkan tabel compact
  const compactRow = page.locator('tr:has-text("KD2610260001")').first();
  await expect(compactRow).toBeVisible();
  await expect(compactRow.locator('text=Muhammad Fadhil')).toBeVisible();

  // 4. Beralih ke Mode Semua Kolom (30 Kolom)
  await btnFull.click();
  await page.waitForTimeout(400);

  // Pastikan bar pengurutan cepat tampil
  const sortBar = page.locator('text=Urutkan:');
  await expect(sortBar).toBeVisible();

  // Pastikan kelima grup data 30 kolom tampil di row full
  const fullRow = page.locator('tr:has-text("KD2610260001")').first();
  await expect(fullRow).toBeVisible();

  // Grup 1: Identitas Pasien
  await expect(fullRow.locator('text=Identitas Pasien')).toBeVisible();
  await expect(fullRow.locator('text=Muhammad Fadhil')).toBeVisible();
  await expect(fullRow.locator('text=Subang, Sabtu, 12 Mei 2018')).toBeVisible();
  await expect(fullRow.locator('text=22 Kg')).toBeVisible();
  await expect(fullRow.locator('text=Ukuran Celana:').locator('..')).toContainText('M');

  // Grup 2: Tindakan Medis
  await expect(fullRow.locator('text=Tindakan Medis')).toBeVisible();
  await expect(fullRow.locator('text=Thermocauter Lem')).toBeVisible();
  await expect(fullRow.locator('text=Syrup')).toBeVisible();
  await expect(fullRow.locator('text=Ukuran Klamp:').locator('..')).toContainText('14');

  // Grup 3: Orang Tua / PJ
  await expect(fullRow.locator('text=Orang Tua / Penanggung Jawab')).toBeVisible();
  await expect(fullRow.locator('text=Ahmad Subagio')).toBeVisible();
  await expect(fullRow.getByText('Ayah', { exact: true })).toBeVisible();
  await expect(fullRow.locator('text=38 Tahun')).toBeVisible();
  await expect(fullRow.locator('text=PNS')).toBeVisible();
  await expect(fullRow.locator('text=081234567890')).toBeVisible();

  // Grup 4: Alamat
  await expect(fullRow.locator('text=Alamat Lengkap & Wilayah')).toBeVisible();
  await expect(fullRow.locator('text=Jl. Veteran No. 12')).toBeVisible();
  await expect(fullRow.locator('text=Kel. Karanganyar, Kec. Subang, Subang, Prov. Jawa Barat')).toBeVisible();

  // Grup 5: Keuangan & Biaya
  await expect(fullRow.locator('text=Rincian Biaya & Keuangan')).toBeVisible();
  await expect(fullRow.locator('text=1.200.000')).toBeVisible();
  await expect(fullRow.locator('text=30.000')).toBeVisible();
  await expect(fullRow.locator('text=dr. Hendra')).toBeVisible();
  await expect(fullRow.locator('text=1.020.000')).toBeVisible();

  // Quick Status Bayar di mode Semua Kolom
  const selectStatusFull = fullRow.locator('select');
  await expect(selectStatusFull).toBeVisible();
  await expect(selectStatusFull).toHaveValue('Belum');
  await selectStatusFull.selectOption('Bayar');
  await page.waitForTimeout(300);

  const updatedStatus = await page.evaluate(() => {
    const item = window.__kdAdminKunjungan.value.find(k => k.register === 'KD2610260001');
    return item ? item.statusBayar : '';
  });
  expect(updatedStatus).toBe('Bayar');

  // Seluruh tombol aksi tampil
  await expect(fullRow.locator('button[title="Edit Rekam Kunjungan"]')).toBeVisible();
  await expect(fullRow.locator('button[title="Whatsapp Ucapan"]')).toBeVisible();
  await expect(fullRow.locator('button[title="Cetak Form Word A4 (4 Hal)"]')).toBeVisible();
  await expect(fullRow.locator('button[title="Cetak Sertifikat Khitan A4"]')).toBeVisible();
  await expect(fullRow.locator('button[title="Salin Review Google"]')).toBeVisible();
  await expect(fullRow.locator('button[title="Hapus Data Kunjungan"]')).toBeVisible();

  // 5. Kembalikan ke mode Ringkas
  await btnCompact.click();
  await page.waitForTimeout(300);
  await expect(page.locator('th:has-text("REGISTER")')).toBeVisible();

  // 6. Verifikasi Modal Tambah Kunjungan langsung 1 Halaman Utuh
  const btnTambahKunjungan = page.locator('button:has-text("Tambah Kunjungan")').first();
  await btnTambahKunjungan.click();
  await page.waitForTimeout(400);

  const modalTambah = page.locator('.kunjungan-compact');
  await expect(modalTambah).toBeVisible();
  // Semua 5 bagian langsung terlihat tanpa perlu ganti tab
  await expect(modalTambah.locator('h4:has-text("Identitas Pasien")')).toBeVisible();
  await expect(modalTambah.locator('h4:has-text("Tindakan Khitan")')).toBeVisible();
  await expect(modalTambah.locator('h4:has-text("Penanggung Jawab")')).toBeVisible();
  await expect(modalTambah.locator('h4:has-text("Wilayah & Alamat Pasien")')).toBeVisible();
  await expect(modalTambah.locator('h4:has-text("Administrasi & Rincian Biaya")')).toBeVisible();
  await expect(modalTambah.locator('button:has-text("Semua Bagian (1 Halaman Utuh)")')).toBeVisible();
  await expect(modalTambah.locator('text=Menampilkan Seluruh Formulir')).toBeVisible();

  // Tutup Modal Tambah
  const btnBatalTambah = modalTambah.locator('button:has-text("Batal")').first();
  await btnBatalTambah.click();
  await page.waitForTimeout(400);

  // 7. Verifikasi Modal Edit Kunjungan langsung 1 Halaman Utuh
  const btnEditKunjungan = page.locator('button[title="Edit Rekam Kunjungan"]').first();
  await btnEditKunjungan.click();
  await page.waitForTimeout(400);

  const modalEdit = page.locator('.kunjungan-compact');
  await expect(modalEdit).toBeVisible();
  await expect(modalEdit.locator('text=REGISTER: KD2610260001')).toBeVisible();
  // Semua 5 bagian langsung terlihat dengan nilai terisi
  await expect(modalEdit.locator('h4:has-text("Identitas Pasien")')).toBeVisible();
  await expect(modalEdit.locator('input[placeholder="Nama lengkap anak"]')).toHaveValue('Muhammad Fadhil');
  await expect(modalEdit.locator('h4:has-text("Tindakan Khitan")')).toBeVisible();
  await expect(modalEdit.locator('h4:has-text("Penanggung Jawab")')).toBeVisible();
  await expect(modalEdit.locator('input[placeholder="Nama ayah / ibu / wali"]')).toHaveValue('Ahmad Subagio');
  await expect(modalEdit.locator('h4:has-text("Wilayah & Alamat Pasien")')).toBeVisible();
  await expect(modalEdit.locator('h4:has-text("Administrasi & Rincian Biaya")')).toBeVisible();
  await expect(modalEdit.locator('input[placeholder="Dari booking"]')).toHaveValue('KD26001');

  // Tutup Modal Edit
  const btnBatalEdit = modalEdit.locator('button:has-text("Batal")').first();
  await btnBatalEdit.click();
  await page.waitForTimeout(400);
});
