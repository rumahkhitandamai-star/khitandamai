const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify WhatsApp Evaluasi H+2 template, dynamic relation, and UI modal in Kunjungan', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });

  // Tunggu helper window hook siap
  await page.waitForFunction(() => typeof window.__kdBuildWaEvaluasiH2Text === 'function');

  const baseKunjungan = {
    register: 'KD-202610-002',
    namaPenanggungJawab: 'Bambang Santoso',
    namaAnanda: 'Rayyan Al-Fatih',
    tanggalLahir: '2017-08-14',
    tanggalKhitan: '2026-10-25',
    nomorHp: '081234567890'
  };

  // ================= 1. PENGUJIAN TEMPLATE WA EVALUASI H+2 =================
  const evaluasiH2Ayah = await page.evaluate((k) => window.__kdBuildWaEvaluasiH2Text({ ...k, hubunganKeluarga: 'Ayah' }), baseKunjungan);
  const evaluasiH2Bunda = await page.evaluate((k) => window.__kdBuildWaEvaluasiH2Text({ ...k, hubunganKeluarga: 'Ibu' }), baseKunjungan);
  const evaluasiH2Fallback = await page.evaluate((k) => window.__kdBuildWaEvaluasiH2Text({ ...k, hubunganKeluarga: '' }), baseKunjungan);

  // Verifikasi Teks Persis Template Ayah
  expect(evaluasiH2Ayah).toContain('Assalamu’alaikum Warahmatullahi Wabarakatuh 🌸');
  expect(evaluasiH2Ayah).toContain('Ayah Bambang Santoso, apa kabar? Semoga Ananda Rayyan Al-Fatih sehat dan lukanya pulih dengan baik 🤍');
  expect(evaluasiH2Ayah).toContain('Kami ingin mendengar kesan Ayah selama mendampingi Ananda khitan di Rumah Khitan Damai — cukup balas pesan ini dengan singkat saja, misalnya apa yang paling berkesan atau yang menurut Ayah masih perlu kami perbaiki. Masukan Ayah sangat berarti untuk pelayanan kami ke depannya 🙏');
  expect(evaluasiH2Ayah).toContain('Bila berkenan, Ayah juga bisa membagikan pengalamannya lewat ulasan Google di tautan ini:');
  expect(evaluasiH2Ayah).toContain('https://g.page/r/CbVAUU-xn-ylEBM/review');
  expect(evaluasiH2Ayah).toContain('Ulasan dari Ayah membantu orang tua lain yang sedang mencari tempat khitan yang aman dan ramah anak.');
  expect(evaluasiH2Ayah).toContain('Satu hal lagi: bila Ayah mengizinkan, kesan yang ditulis boleh kami tampilkan sebagai testimoni di media sosial Rumah Khitan Damai — nama akan kami tampilkan seizin Ayah (boleh nama lengkap, boleh inisial saja, dan foto hanya bila diizinkan). Bila tidak berkenan, tidak apa-apa sama sekali 🌿');
  expect(evaluasiH2Ayah).toContain('Terima kasih banyak atas kepercayaannya. Semoga Ananda Rayyan Al-Fatih tumbuh sehat, sholeh, dan berani ✨');
  expect(evaluasiH2Ayah).toContain('💐 Hormat kami,');
  expect(evaluasiH2Ayah).toContain('Admin Rumah Khitan Damai');
  expect(evaluasiH2Ayah).toContain('🏥 khitandamai.my.id');

  // Verifikasi Sapaan Bunda
  expect(evaluasiH2Bunda).toContain('Bunda Bambang Santoso, apa kabar? Semoga Ananda Rayyan Al-Fatih sehat dan lukanya pulih dengan baik 🤍');
  expect(evaluasiH2Bunda).toContain('menurut Bunda masih perlu kami perbaiki');
  expect(evaluasiH2Bunda).toContain('Ulasan dari Bunda membantu orang tua lain');

  // Verifikasi Sapaan Fallback
  expect(evaluasiH2Fallback).toContain('Ayah/Bunda Bambang Santoso, apa kabar? Semoga Ananda Rayyan Al-Fatih sehat dan lukanya pulih dengan baik 🤍');
  expect(evaluasiH2Fallback).toContain('menurut Ayah/Bunda masih perlu kami perbaiki');

  // ================= 2. PENGUJIAN MODAL UI & INTERAKSI =================
  await page.evaluate((k) => {
    window.__kdOpenWaEvaluasiH2Modal(k);
  }, { ...baseKunjungan, hubunganKeluarga: 'Ayah' });

  const modalH2 = page.locator('div.admin-panel:has-text("WhatsApp Evaluasi H+2")');
  await expect(modalH2).toBeVisible();
  await expect(modalH2.locator('text=Kirim pesan kesan, masukan & ajakan ulasan Google H+2')).toBeVisible();
  await expect(modalH2.locator('span:has-text("Bambang Santoso (Ayah)")')).toBeVisible();
  await expect(modalH2.locator('span:has-text("081234567890")')).toBeVisible();
  await expect(modalH2.locator('div.whitespace-pre-line')).toContainText('https://g.page/r/CbVAUU-xn-ylEBM/review');
  await expect(modalH2.locator('button:has-text("Buka WhatsApp (Kirim Pesan)")')).toBeVisible();
  await expect(modalH2.locator('button:has-text("Salin Teks")')).toBeVisible();

  // Salin Teks
  await modalH2.locator('button:has-text("Salin Teks")').click();

  // Batal / Tutup Modal
  const btnBatal = modalH2.locator('button:has-text("Batal")');
  await btnBatal.click();
  await expect(modalH2).toBeHidden();

  expect(consoleErrors).toEqual([]);
});
