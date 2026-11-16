const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Foto Jagoan Khitan in Kunjungan Modal (Tambah & Edit) with Drive storage', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

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
      statusBayar: 'Bayar',
      jumlahBayar: '1200000',
      zakat: '30000',
      operator: 'dr. Hendra',
      bmhpObat: '50000',
      lem: '50000',
      fee: '50000',
      total: '1020000',
      statusWa: 'Terkirim',
      keterangan: 'Tindakan lancar',
      fotoJagoanKhitan: 'https://lh3.googleusercontent.com/d/1XdUvWNvwTeORb3ZOnKKE-9PORXQCH0FS_mock=w1200'
    }
  ];

  let uploadedPhotoPayload = null;
  let createKunjunganPayload = null;
  let updateKunjunganPayload = null;

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

      if (payload.action === 'uploadFotoJagoanKhitan' || payload.action === 'uploadFotoJagoan') {
        uploadedPhotoPayload = payload;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: 'Foto jagoan khitan berhasil diunggah ke Google Drive.',
            data: {
              fileId: 'mock_uploaded_file_id_123',
              src: 'https://lh3.googleusercontent.com/d/mock_uploaded_file_id_123=w1200',
              fileName: payload.fileName || 'foto_jagoan.jpg'
            }
          })
        });
      }

      if (payload.action === 'createKunjungan') {
        createKunjunganPayload = payload.data || payload;
        const newRegister = 'KD2611150099';
        const newRecord = { ...createKunjunganPayload, register: newRegister };
        mockKunjungan.unshift(newRecord);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: 'Data kunjungan berhasil ditambahkan.',
            data: { register: newRegister }
          })
        });
      }

      if (payload.action === 'updateKunjungan') {
        updateKunjunganPayload = payload.data || payload;
        const target = mockKunjungan.find(k => k.register === updateKunjunganPayload.register);
        if (target) {
          Object.assign(target, updateKunjunganPayload);
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: 'Data kunjungan berhasil diperbarui.'
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

  // 1. Buka Halaman Admin
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // 2. Login Pengelola
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(600);

  // 3. Masuk ke Tab Kunjungan
  const tabKunjungan = page.locator('aside nav button').filter({ hasText: 'Jadwal Tindakan' });
  await tabKunjungan.click();
  await page.waitForTimeout(600);

  // Verifikasi baris rekam kunjungan awal
  const rowTarget = page.locator('tr:has-text("KD2610260001")').first();
  await expect(rowTarget).toBeVisible();

  // 4. Buka Modal Edit Kunjungan (Verifikasi Foto Jagoan yang Sudah Ada)
  const btnEdit = rowTarget.locator('button[title*="Edit"]').first();
  await btnEdit.click();
  await page.waitForTimeout(400);

  // Verifikasi Label & Field Foto Jagoan Khitan di Modal
  const labelFoto = page.locator('label:has-text("FOTO JAGOAN KHITAN")');
  await expect(labelFoto).toBeVisible();
  await expect(page.locator('text=Maks. 5 MB · JPG, JPEG, PNG')).toBeVisible();

  // Verifikasi Foto Tersimpan di Modal Edit
  await expect(page.locator('text=Foto Tersimpan')).toBeVisible();
  await expect(page.locator('text=Tersimpan di Google Drive')).toBeVisible();

  // Uji tombol Hapus Foto pada modal edit
  const btnHapusFoto = page.locator('button:has-text("Hapus")').filter({ has: page.locator('xpath=ancestor::*[contains(@class, "rounded-xl")]') }).first();
  await btnHapusFoto.click();
  await page.waitForTimeout(200);

  // Verifikasi dropzone muncul kembali setelah dihapus
  await expect(page.locator('text=Pilih Foto Jagoan Khitan')).toBeVisible();

  // Unggah foto baru di modal edit menggunakan setInputFiles
  const mockImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const fileInput = page.locator('input[type="file"][accept*=".png"]');
  await fileInput.setInputFiles({
    name: 'jagoan_baru.png',
    mimeType: 'image/png',
    buffer: mockImageBuffer
  });

  await page.waitForTimeout(600);

  // Verifikasi request upload foto terpanggil
  expect(uploadedPhotoPayload).not.toBeNull();
  expect(uploadedPhotoPayload.action).toBe('uploadFotoJagoanKhitan');

  // Simpan perubahan edit
  const btnSimpanEdit = page.locator('footer button[type="submit"]:has-text("Simpan")');
  await btnSimpanEdit.click();
  await page.waitForTimeout(600);

  // Verifikasi update payload
  expect(updateKunjunganPayload).not.toBeNull();
  expect(updateKunjunganPayload.fotoJagoanKhitan).toContain('mock_uploaded_file_id_123');

  // 5. Buka Modal Tambah Kunjungan
  const btnTambah = page.locator('button:has-text("Tambah Kunjungan")').first();
  await btnTambah.click();
  await page.waitForTimeout(400);

  // Beralih ke Mode Input Manual
  const btnManualMode = page.locator('button:has-text("Input Manual")');
  if (await btnManualMode.isVisible()) {
    await btnManualMode.click();
    await page.waitForTimeout(200);
  }

  // Verifikasi dropzone upload foto di modal tambah
  await expect(page.locator('text=Pilih Foto Jagoan Khitan')).toBeVisible();

  // Verifikasi penolakan format berkas selain JPG, JPEG, PNG
  await fileInput.setInputFiles({
    name: 'berkas.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test')
  });
  await page.waitForTimeout(300);
  await expect(page.locator('text=Format Tidak Didukung')).toBeVisible();
  const btnTutupAlert = page.locator('button:has-text("Mengerti"), button:has-text("Tutup")').first();
  if (await btnTutupAlert.isVisible()) {
    await btnTutupAlert.click();
    await page.waitForTimeout(300);
  }

  // Unggah foto jagoan khitan valid (JPG/PNG) pada data baru
  await fileInput.setInputFiles({
    name: 'jagoan_tambah.jpg',
    mimeType: 'image/jpeg',
    buffer: mockImageBuffer
  });

  await page.waitForTimeout(600);

  // Verifikasi foto tersimpan di modal tambah
  await expect(page.locator('text=Foto Tersimpan')).toBeVisible();

  // Isi data wajib: Nama Ananda & Tanggal Khitan
  const inputNama = page.locator('input[placeholder*="Nama lengkap anak" i]');
  await inputNama.fill('Ahmad Zaki');

  // Simpan Data Kunjungan Baru
  const btnSimpanTambah = page.locator('footer button[type="submit"]:has-text("Simpan")');
  await btnSimpanTambah.click();
  await page.waitForTimeout(600);

  // Verifikasi create payload
  expect(createKunjunganPayload).not.toBeNull();
  expect(createKunjunganPayload.namaAnanda).toBe('Ahmad Zaki');
  expect(createKunjunganPayload.fotoJagoanKhitan).toContain('mock_uploaded_file_id_123');
});
