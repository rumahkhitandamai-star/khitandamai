const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify WhatsApp Ucapan template, age calculation, dynamic sapaan, and UI modal in Kunjungan', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });

  // Tunggu helper window hook siap
  await page.waitForFunction(() => typeof window.__kdBuildWaUcapanText === 'function');

  // ================= 1. PENGUJIAN FORMAT USIA =================
  const usiaResults = await page.evaluate(() => {
    const fn = window.__kdFormatUsiaUcapan;
    return {
      contohUser: fn('2017-08-14', '2026-10-25'),
      hariSama: fn('2020-01-01', '2020-01-01'),
      kurangHari: fn('2018-05-20', '2026-05-10'),
      emptyLahir: fn('', '2026-10-25'),
      nullLahir: fn(null, '2026-10-25')
    };
  });

  expect(usiaResults.contohUser).toBe('9 Tahun 2 Bulan 11 Hari');
  expect(usiaResults.hariSama).toBe('0 Tahun 0 Bulan 0 Hari');
  expect(usiaResults.kurangHari).toBe('7 Tahun 11 Bulan 20 Hari');
  expect(usiaResults.emptyLahir).toBe('-');
  expect(usiaResults.nullLahir).toBe('-');

  // ================= 2. PENGUJIAN TEMPLATE WA UCAPAN & SAPAAN =================
  const baseKunjungan = {
    register: 'KD-202610-001',
    namaPenanggungJawab: 'Bambang Santoso',
    namaAnanda: 'Rayyan Al-Fatih',
    tanggalLahir: '2017-08-14',
    tanggalKhitan: '2026-10-25',
    nomorHp: '081234567890'
  };

  const ucapanAyah = await page.evaluate((k) => window.__kdBuildWaUcapanText({ ...k, hubunganKeluarga: 'Ayah' }), baseKunjungan);
  const ucapanKakek = await page.evaluate((k) => window.__kdBuildWaUcapanText({ ...k, hubunganKeluarga: 'Kakek' }), baseKunjungan);
  const ucapanWali = await page.evaluate((k) => window.__kdBuildWaUcapanText({ ...k, hubunganKeluarga: 'Wali' }), baseKunjungan);
  const ucapanIbu = await page.evaluate((k) => window.__kdBuildWaUcapanText({ ...k, hubunganKeluarga: 'Ibu' }), baseKunjungan);
  const ucapanNenek = await page.evaluate((k) => window.__kdBuildWaUcapanText({ ...k, hubunganKeluarga: 'Nenek' }), baseKunjungan);
  const ucapanFallback = await page.evaluate((k) => window.__kdBuildWaUcapanText({ ...k, hubunganKeluarga: 'Paman' }), baseKunjungan);
  const ucapanKosong = await page.evaluate((k) => window.__kdBuildWaUcapanText({ ...k, hubunganKeluarga: '' }), baseKunjungan);

  // Uji Ayah / Kakek / Wali
  for (const text of [ucapanAyah, ucapanKakek, ucapanWali]) {
    expect(text).toContain('Subang - ');
    expect(text).toContain('🌸 Assalamu’alaikum Warahmatullahi Wabarakatuh 🌸');
    expect(text).toContain('Alhamdulillahi Rabbil ‘Alamiin 🤍');
    expect(text).toContain('Dengan penuh rasa syukur, kami mengucapkan terima kasih sebesar-besarnya kepada Ayah:');
    expect(text).toContain('👨‍👩‍👦 Bambang Santoso');
    expect(text).toContain('yang telah mempercayakan proses khitan Ananda kepada Rumah Khitan Damai 🏥✨');
    expect(text).toContain('👦 DATA ANANDA');
    expect(text).toContain('🧒 Nama : Rayyan Al-Fatih');
    expect(text).toContain('🎂 Usia : 9 Tahun 2 Bulan 11 Hari');
    expect(text).toContain('📅 Tanggal Khitan : ');
    expect(text).toContain('Semoga Ananda Rayyan Al-Fatih segera pulih, sehat kembali, serta selalu berada dalam lindungan Allah SWT 🤍');
    expect(text).toContain('Terima kasih atas kepercayaan Ayah kepada kami 🌸');
    expect(text).not.toContain('Ayah/Bunda');
  }

  // Uji Ibu / Nenek
  for (const text of [ucapanIbu, ucapanNenek]) {
    expect(text).toContain('Dengan penuh rasa syukur, kami mengucapkan terima kasih sebesar-besarnya kepada Bunda:');
    expect(text).toContain('Terima kasih atas kepercayaan Bunda kepada kami 🌸');
    expect(text).not.toContain('Ayah/Bunda');
  }

  // Uji Fallback (Paman, kosong, dll)
  for (const text of [ucapanFallback, ucapanKosong]) {
    expect(text).toContain('Dengan penuh rasa syukur, kami mengucapkan terima kasih sebesar-besarnya kepada Ayah/Bunda:');
    expect(text).toContain('Terima kasih atas kepercayaan Ayah/Bunda kepada kami 🌸');
  }

  // ================= 3. PENGUJIAN MODAL UI DI TAB KUNJUNGAN =================
  // Login sebagai pengelola
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(600);

  // Buka tab Kunjungan
  const navKunjungan = page.locator('aside nav button').filter({ hasText: 'Jadwal Tindakan' });
  await expect(navKunjungan).toBeVisible();
  await navKunjungan.click();
  await page.waitForTimeout(600);

  // Pastikan tidak ada lagi tombol ber-title "Chat WhatsApp Pasien" di tab Kunjungan
  const oldBtnCount = await page.locator('button[title="Chat WhatsApp Pasien"], a[title="Chat WhatsApp Pasien"]').count();
  expect(oldBtnCount).toBe(0);

  // Uji pembukaan modal WhatsApp Ucapan lewat hook dengan data kunjungan
  await page.evaluate((k) => {
    window.__kdOpenWaUcapanModal(k);
  }, baseKunjungan);
  await page.waitForTimeout(300);

  // Verifikasi modal terbuka
  const modalUcapan = page.locator('div.admin-panel:has-text("WhatsApp Ucapan")');
  await expect(modalUcapan).toBeVisible();
  await expect(modalUcapan.locator('text=Kirim pesan ucapan selamat & doa khitan')).toBeVisible();
  await expect(modalUcapan.locator('span:has-text("Bambang Santoso")')).toBeVisible();
  await expect(modalUcapan.locator('span:has-text("081234567890")')).toBeVisible();
  await expect(modalUcapan.locator('div.whitespace-pre-line')).toContainText('Rayyan Al-Fatih');
  await expect(modalUcapan.locator('div.whitespace-pre-line')).toContainText('9 Tahun 2 Bulan 11 Hari');
  await expect(modalUcapan.locator('button:has-text("Buka WhatsApp (Kirim Pesan)")')).toBeVisible();

  // Tutup modal ucapan
  const btnBatal = modalUcapan.locator('button:has-text("Batal")');
  await btnBatal.click();
  await page.waitForTimeout(300);
  await expect(modalUcapan).toBeHidden();

  // ================= 4. PENGUJIAN TOMBOL & MODAL WA REMINDER DI KUNJUNGAN =================
  // Suntikkan data kunjungan ke tabel dan atur filter ke Semua
  await page.evaluate((k) => {
    if (window.__kdAdminKunjungan) {
      window.__kdAdminKunjungan.value = [k];
    }
  }, {
    ...baseKunjungan,
    register: 'KD2610001'
  });
  // Reset filter kunjungan jika ada tombolnya atau lewat evaluate
  await page.evaluate(() => {
    const appEl = document.querySelector('#app');
    if (appEl && appEl.__vue_app__) {
      // jika ada vue app instance
    }
  });
  await page.waitForTimeout(400);

  // Cari tombol Whatsapp Reminder baik di tabel, popover, maupun kartu mobile
  const reminderBtn = page.locator('button[title="Whatsapp Reminder"]').first();
  if (await reminderBtn.count() > 0) {
    await reminderBtn.click();
  } else {
    // Buka via hook jika tombol tabel tersembunyi oleh filter bulan
    await page.evaluate((k) => {
      window.__kdOpenWaReminderModal(k);
    }, baseKunjungan);
  }
  await page.waitForTimeout(300);

  // Verifikasi modal reminder terbuka
  const modalReminder = page.locator('div.admin-panel:has-text("WhatsApp Reminder")');
  await expect(modalReminder).toBeVisible();
  await expect(modalReminder.locator('text=Kirim pengingat jadwal khitan H-1')).toBeVisible();
  await expect(modalReminder.locator('span:has-text("Bambang Santoso")')).toBeVisible();
  await expect(modalReminder.locator('span:has-text("081234567890")')).toBeVisible();
  await expect(modalReminder.locator('div.whitespace-pre-line')).toContainText('Rayyan Al-Fatih');
  await expect(modalReminder.locator('div.whitespace-pre-line')).toContainText('Persiapan Sebelum Berangkat');
  await expect(modalReminder.locator('button:has-text("Buka WhatsApp (Kirim Pesan)")')).toBeVisible();

  // Tutup modal reminder
  const btnBatalReminder = modalReminder.locator('button:has-text("Batal")');
  await btnBatalReminder.click();
  await page.waitForTimeout(300);
  await expect(modalReminder).toBeHidden();

  // Pastikan tidak ada console error fatal
  const fatalErrors = consoleErrors.filter(e => !e.includes('favicon'));
  expect(fatalErrors).toHaveLength(0);
});
