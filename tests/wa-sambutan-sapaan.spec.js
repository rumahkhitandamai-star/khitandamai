const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify WhatsApp Sambutan & Reminder dynamic greeting based on Hubungan Keluarga', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'domcontentloaded' });

  // Tunggu helper window hook siap
  await page.waitForFunction(() => typeof window.__kdBuildWaSambutanText === 'function');

  // ================= 1. PENGUJIAN HELPER RESOLVE SAPAAN =================
  const sapaanResults = await page.evaluate(() => {
    const fn = window.__kdResolveSapaanWa;
    return {
      ayah: fn('Ayah'),
      ayahLower: fn('ayah'),
      ayahTrim: fn('  Ayah  '),
      kakek: fn('Kakek'),
      wali: fn('Wali'),
      ibu: fn('Ibu'),
      ibuUpper: fn('IBU'),
      nenek: fn('Nenek'),
      paman: fn('Paman'),
      bibi: fn('Bibi'),
      diriSendiri: fn('Diri Sendiri'),
      empty: fn(''),
      nullVal: fn(null),
      undefinedVal: fn(undefined)
    };
  });

  // Ayah / Kakek / Wali -> Ayah
  expect(sapaanResults.ayah).toBe('Ayah');
  expect(sapaanResults.ayahLower).toBe('Ayah');
  expect(sapaanResults.ayahTrim).toBe('Ayah');
  expect(sapaanResults.kakek).toBe('Ayah');
  expect(sapaanResults.wali).toBe('Ayah');

  // Ibu / Nenek -> Bunda
  expect(sapaanResults.ibu).toBe('Bunda');
  expect(sapaanResults.ibuUpper).toBe('Bunda');
  expect(sapaanResults.nenek).toBe('Bunda');

  // Fallback -> Ayah/Bunda
  expect(sapaanResults.paman).toBe('Ayah/Bunda');
  expect(sapaanResults.bibi).toBe('Ayah/Bunda');
  expect(sapaanResults.diriSendiri).toBe('Ayah/Bunda');
  expect(sapaanResults.empty).toBe('Ayah/Bunda');
  expect(sapaanResults.nullVal).toBe('Ayah/Bunda');
  expect(sapaanResults.undefinedVal).toBe('Ayah/Bunda');

  // ================= 2. PENGUJIAN TEMPLATE WA SAMBUTAN =================
  const baseBooking = {
    namaPenanggungJawab: 'Bambang Santoso',
    namaAnanda: 'Rayyan Al-Fatih',
    tanggalKhitan: '2026-10-25',
    jamKhitan: '09:00',
    metodeKhitan: 'Super Sealer Modern',
    nomorHp: '081234567890'
  };

  const sambutanAyah = await page.evaluate((b) => window.__kdBuildWaSambutanText({ ...b, hubunganKeluarga: 'Ayah' }), baseBooking);
  const sambutanKakek = await page.evaluate((b) => window.__kdBuildWaSambutanText({ ...b, hubunganKeluarga: 'Kakek' }), baseBooking);
  const sambutanWali = await page.evaluate((b) => window.__kdBuildWaSambutanText({ ...b, hubunganKeluarga: 'Wali' }), baseBooking);
  const sambutanIbu = await page.evaluate((b) => window.__kdBuildWaSambutanText({ ...b, hubunganKeluarga: 'Ibu' }), baseBooking);
  const sambutanNenek = await page.evaluate((b) => window.__kdBuildWaSambutanText({ ...b, hubunganKeluarga: 'Nenek' }), baseBooking);
  const sambutanPaman = await page.evaluate((b) => window.__kdBuildWaSambutanText({ ...b, hubunganKeluarga: 'Paman' }), baseBooking);
  const sambutanKosong = await page.evaluate((b) => window.__kdBuildWaSambutanText({ ...b, hubunganKeluarga: '' }), baseBooking);

  // Verifikasi Ayah / Kakek / Wali pada Sambutan
  for (const text of [sambutanAyah, sambutanKakek, sambutanWali]) {
    expect(text).toContain('Yth. Ayah\nBambang Santoso 👨‍👩‍👦');
    expect(text).toContain('Semoga Ayah dan keluarga senantiasa diberikan kesehatan');
    expect(text).not.toContain('Ayah/Bunda');
  }

  // Verifikasi Ibu / Nenek pada Sambutan
  for (const text of [sambutanIbu, sambutanNenek]) {
    expect(text).toContain('Yth. Bunda\nBambang Santoso 👨‍👩‍👦');
    expect(text).toContain('Semoga Bunda dan keluarga senantiasa diberikan kesehatan');
    expect(text).not.toContain('Ayah/Bunda');
  }

  // Verifikasi Fallback pada Sambutan
  for (const text of [sambutanPaman, sambutanKosong]) {
    expect(text).toContain('Yth. Ayah/Bunda\nBambang Santoso 👨‍👩‍👦');
    expect(text).toContain('Semoga Ayah/Bunda dan keluarga senantiasa diberikan kesehatan');
  }

  // ================= 3. PENGUJIAN TEMPLATE WA REMINDER =================
  const reminderAyah = await page.evaluate((b) => window.__kdBuildWaReminderText({ ...b, hubunganKeluarga: 'Ayah' }), baseBooking);
  const reminderKakek = await page.evaluate((b) => window.__kdBuildWaReminderText({ ...b, hubunganKeluarga: 'Wali' }), baseBooking);
  const reminderIbu = await page.evaluate((b) => window.__kdBuildWaReminderText({ ...b, hubunganKeluarga: 'Ibu' }), baseBooking);
  const reminderNenek = await page.evaluate((b) => window.__kdBuildWaReminderText({ ...b, hubunganKeluarga: 'Nenek' }), baseBooking);
  const reminderFallback = await page.evaluate((b) => window.__kdBuildWaReminderText({ ...b, hubunganKeluarga: 'Diri Sendiri' }), baseBooking);

  // Verifikasi Ayah / Wali pada Reminder
  for (const text of [reminderAyah, reminderKakek]) {
    expect(text).toContain('Selamat sore Ayah 😊');
    expect(text).toContain('Mohon Ayah dan Ananda untuk beristirahat yang cukup malam ini');
    expect(text).toContain('Terima kasih atas perhatian Ayah 🙏');
    expect(text).not.toContain('Ayah/Bunda');
  }

  // Verifikasi Ibu / Nenek pada Reminder
  for (const text of [reminderIbu, reminderNenek]) {
    expect(text).toContain('Selamat sore Bunda 😊');
    expect(text).toContain('Mohon Bunda dan Ananda untuk beristirahat yang cukup malam ini');
    expect(text).toContain('Terima kasih atas perhatian Bunda 🙏');
    expect(text).not.toContain('Ayah/Bunda');
  }

  // Verifikasi Fallback pada Reminder
  expect(reminderFallback).toContain('Selamat sore Ayah/Bunda 😊');
  expect(reminderFallback).toContain('Mohon Ayah/Bunda dan Ananda untuk beristirahat yang cukup malam ini');
  expect(reminderFallback).toContain('Terima kasih atas perhatian Ayah/Bunda 🙏');

  // Pastikan tidak ada console error fatal
  const fatalErrors = consoleErrors.filter(e => !e.includes('favicon'));
  expect(fatalErrors).toHaveLength(0);
});
