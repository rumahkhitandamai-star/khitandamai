const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Prioritas 1 UX improvements: Mobile input keyboards and Maps Anti-Scroll Trap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // 1. Verifikasi Input Form Booking (Langkah 1 & Langkah 3)
  await page.goto(filePath + '#/booking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Berat Badan harus inputmode="decimal"
  const beratBadan = page.locator('input[placeholder="Contoh: 25.5"]');
  await expect(beratBadan).toHaveAttribute('inputmode', 'decimal');

  // Pindah ke mode Cek Status
  const tabCek = page.locator('#tab-btn-cek');
  await tabCek.click();
  await page.waitForTimeout(300);

  // Mode ID: searchBookingId harus memiliki atribut autocapitalize
  const searchId = page.locator('input[placeholder="Contoh: KDHTQ26"]');
  await expect(searchId).toHaveAttribute('autocapitalize', 'characters');

  // Mode Phone: ganti mode ke phone
  const modePhoneBtn = page.locator('button:has-text("Nomor HP (Lupa ID)")');
  await modePhoneBtn.click();
  await page.waitForTimeout(300);

  const searchPhone = page.locator('input[placeholder="Contoh: 081234567890"]');
  await expect(searchPhone).toHaveAttribute('inputmode', 'numeric');

  // 2. Verifikasi Anti Scroll Trap Google Maps di Kontak
  await page.goto(filePath + '#/kontak', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const mapOverlay = page.locator('text=Ketuk untuk geser peta');
  await expect(mapOverlay).toBeVisible();

  const mapIframe = page.locator('iframe[title*="Peta Lokasi Rumah Khitan Damai"]');
  await expect(mapIframe).toHaveClass(/pointer-events-none/);

  // Klik container peta untuk mengaktifkan interaksi
  const mapContainer = mapIframe.locator('..');
  await mapContainer.click();
  await page.waitForTimeout(300);

  // Overlay harus hilang dan iframe memiliki pointer-events-auto
  await expect(mapOverlay).not.toBeVisible();
  await expect(mapIframe).toHaveClass(/pointer-events-auto/);
});
