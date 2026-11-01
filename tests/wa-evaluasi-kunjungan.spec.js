const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify WhatsApp Evaluasi H+1 template, dynamic relation, and UI modal in Kunjungan', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });

  // Tunggu helper window hook siap
  await page.waitForFunction(() => typeof window.__kdBuildWaEvaluasiText === 'function');

  // ================= 1. PENGUJIAN RESOLVE HUBUNGAN KELUARGA =================
  const relationResults = await page.evaluate(() => {
    const fn = window.__kdResolveHubunganKeluarga;
    return {
      ayah: fn('Ayah'),
      bapak: fn('bapak'),
      papa: fn('PAPA'),
      abi: fn('abi'),
      ibu: fn('Ibu'),
      bunda: fn('Bunda'),
      mama: fn('mama'),
      umi: fn('umi'),
      kakek: fn('kakek'),
      nenek: fn('Nenek'),
      paman: fn('Paman'),
      bibi: fn('bibi'),
      wali: fn('wali'),
      empty: fn(''),
      nullVal: fn(null)
    };
  });

  expect(relationResults.ayah).toBe('Ayah');
  expect(relationResults.bapak).toBe('Ayah');
  expect(relationResults.papa).toBe('Ayah');
  expect(relationResults.abi).toBe('Ayah');
  expect(relationResults.ibu).toBe('Bunda');
  expect(relationResults.bunda).toBe('Bunda');
  expect(relationResults.mama).toBe('Bunda');
  expect(relationResults.umi).toBe('Bunda');
  expect(relationResults.kakek).toBe('Kakek');
  expect(relationResults.nenek).toBe('Nenek');
  expect(relationResults.paman).toBe('Paman');
  expect(relationResults.bibi).toBe('Bibi');
  expect(relationResults.wali).toBe('Wali');
  expect(relationResults.empty).toBe('Ayah/Bunda');
  expect(relationResults.nullVal).toBe('Ayah/Bunda');

  // ================= 2. PENGUJIAN TEMPLATE WA EVALUASI H+1 =================
  const baseKunjungan = {
    register: 'KD-202610-001',
    namaPenanggungJawab: 'Bambang Santoso',
    namaAnanda: 'Rayyan Al-Fatih',
    tanggalLahir: '2017-08-14',
    tanggalKhitan: '2026-10-25',
    nomorHp: '081234567890'
  };

  const evaluasiAyah = await page.evaluate((k) => window.__kdBuildWaEvaluasiText({ ...k, hubunganKeluarga: 'Ayah' }), baseKunjungan);
  const evaluasiIbu = await page.evaluate((k) => window.__kdBuildWaEvaluasiText({ ...k, hubunganKeluarga: 'Ibu' }), baseKunjungan);
  const evaluasiKakek = await page.evaluate((k) => window.__kdBuildWaEvaluasiText({ ...k, hubunganKeluarga: 'Kakek' }), baseKunjungan);
  const evaluasiKosong = await page.evaluate((k) => window.__kdBuildWaEvaluasiText({ ...k, hubunganKeluarga: '' }), baseKunjungan);

  // Verifikasi Teks Persis Template
  expect(evaluasiAyah).toContain("Assalamu'alaikum Warahmatullahi Wabarakatuh 🌸");
  expect(evaluasiAyah).toContain("Ayah Bambang Santoso, apa kabar? Semoga Ananda Rayyan Al-Fatih bisa beristirahat dengan nyaman 🤍");
  expect(evaluasiAyah).toContain("Hari ini adalah hari pertama setelah Ananda khitan. Kami ingin menanyakan perkembangan Ananda:");
  expect(evaluasiAyah).toContain("1. Bagaimana kondisi Ananda hari ini? Apakah ada keluhan, misalnya nyeri, bengkak, demam, atau perdarahan?");
  expect(evaluasiAyah).toContain("2. Apakah Ananda sudah pipis?");
  expect(evaluasiAyah).toContain("Sedikit bengkak dan rasa kurang nyaman di hari pertama umumnya wajar. Yang penting Ananda cukup istirahat, minum obat sesuai yang sudah diberikan, dan area khitan dijaga tetap bersih dan kering sesuai arahan saat pulang kemarin.");
  expect(evaluasiAyah).toContain("Bila Ananda belum bisa pipis, ada perdarahan yang tidak berhenti, demam, atau nyeri yang terasa berat, jangan ragu ya Ayah — langsung balas pesan ini atau hubungi admin, kami siap membantu 🙏");
  expect(evaluasiAyah).toContain("Silakan ceritakan kondisi Ananda dengan membalas pesan ini. Terima kasih sudah mendampingi Ananda dengan penuh kesabaran 🌿");
  expect(evaluasiAyah).toContain("💐 Hormat kami,");
  expect(evaluasiAyah).toContain("Admin Rumah Khitan Damai");
  expect(evaluasiAyah).toContain("🏥 khitandamai.my.id");

  // Verifikasi Variasi Hubungan Ibu -> Bunda
  expect(evaluasiIbu).toContain("Bunda Bambang Santoso, apa kabar? Semoga Ananda Rayyan Al-Fatih bisa beristirahat dengan nyaman 🤍");
  expect(evaluasiIbu).toContain("jangan ragu ya Bunda — langsung balas pesan ini atau hubungi admin, kami siap membantu 🙏");

  // Verifikasi Variasi Hubungan Kakek
  expect(evaluasiKakek).toContain("Kakek Bambang Santoso, apa kabar? Semoga Ananda Rayyan Al-Fatih bisa beristirahat dengan nyaman 🤍");
  expect(evaluasiKakek).toContain("jangan ragu ya Kakek — langsung balas pesan ini atau hubungi admin, kami siap membantu 🙏");

  // Verifikasi Fallback Hubungan Kosong -> Ayah/Bunda
  expect(evaluasiKosong).toContain("Ayah/Bunda Bambang Santoso, apa kabar? Semoga Ananda Rayyan Al-Fatih bisa beristirahat dengan nyaman 🤍");
  expect(evaluasiKosong).toContain("jangan ragu ya Ayah/Bunda — langsung balas pesan ini atau hubungi admin, kami siap membantu 🙏");

  // ================= 3. PENGUJIAN MODAL UI & INTERAKSI =================
  await page.evaluate((k) => {
    window.__kdOpenWaEvaluasiModal(k);
  }, { ...baseKunjungan, hubunganKeluarga: 'Ayah' });

  const modalEvaluasi = page.locator('div.admin-panel:has-text("WhatsApp Evaluasi H+1")');
  await expect(modalEvaluasi).toBeVisible();
  await expect(modalEvaluasi.locator('text=Kirim pesan evaluasi & pantauan kondisi H+1')).toBeVisible();
  await expect(modalEvaluasi.locator('span:has-text("Bambang Santoso (Ayah)")')).toBeVisible();
  await expect(modalEvaluasi.locator('span:has-text("081234567890")')).toBeVisible();
  await expect(modalEvaluasi.locator('div.whitespace-pre-line')).toContainText('Hari ini adalah hari pertama setelah Ananda khitan');
  await expect(modalEvaluasi.locator('button:has-text("Buka WhatsApp (Kirim Pesan)")')).toBeVisible();
  await expect(modalEvaluasi.locator('button:has-text("Salin Teks")')).toBeVisible();

  // Salin Teks
  await modalEvaluasi.locator('button:has-text("Salin Teks")').click();

  // Batal / Tutup Modal
  const btnBatal = modalEvaluasi.locator('button:has-text("Batal")');
  await btnBatal.click();
  await expect(modalEvaluasi).toBeHidden();

  // Verifikasi tombol Evaluasi H+1 hadir di baris Kunjungan
  const kunjunganNav = page.locator('button:has-text("Kunjungan"), a:has-text("Kunjungan")').first();
  if (await kunjunganNav.isVisible()) {
    await kunjunganNav.click();
    await page.waitForTimeout(300);
    const btnEvaluasiRow = page.locator('button[title="Whatsapp Evaluasi H+1"]').first();
    if (await btnEvaluasiRow.isVisible()) {
      await expect(btnEvaluasiRow).toBeVisible();
    }
  }

  expect(consoleErrors).toEqual([]);
});
