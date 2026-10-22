const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Kontak menu on bottom nav: position, logo, address, whatsapp, email, and Google Maps embed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12/13/14 mobile viewport
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // 1. Kunjungi Beranda
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // 2. Verifikasi tombol navigasi Kontak ada di bottom nav
  const navKontak = page.locator('.safe-bottom-nav a[href="#/kontak"]');
  await expect(navKontak).toBeVisible();
  await expect(navKontak).toContainText('Kontak');

  // Verifikasi ikon whatsapp pada tombol Kontak
  const navKontakSvg = navKontak.locator('svg');
  await expect(navKontakSvg).toBeVisible();

  // 3. Verifikasi posisi Kontak adalah item paling kanan di bottom nav
  const allNavLinks = page.locator('.safe-bottom-nav a');
  const count = await allNavLinks.count();
  expect(count).toBeGreaterThanOrEqual(4);

  const lastLink = allNavLinks.nth(count - 1);
  await expect(lastLink).toHaveAttribute('href', '#/kontak');

  const kontakBox = await navKontak.boundingBox();
  const firstLinkBox = await allNavLinks.first().boundingBox();
  expect(kontakBox.x).toBeGreaterThan(firstLinkBox.x);

  // 4. Klik menu Kontak
  await navKontak.click();
  await page.waitForTimeout(500);
  expect(page.url()).toContain('#/kontak');

  // 5. Verifikasi Judul Halaman
  const heading = page.locator('h2:has-text("Hubungi Kami")');
  await expect(heading).toBeVisible();

  // 6. Verifikasi Logo Klinik Khitan Damai
  const logo = page.locator('section img[alt="Logo Khitan Damai"]');
  await expect(logo).toBeVisible();

  // 7. Verifikasi Alamat Lengkap
  const addressBlock = page.locator('text=Perum Bumi Abdi Praja Blok D2 No.13');
  await expect(addressBlock).toBeVisible();
  await expect(page.locator('text=Kelurahan Sukamelang, Kecamatan Subang')).toBeVisible();
  await expect(page.locator('text=Kabupaten Subang – Jawa Barat 41211')).toBeVisible();

  // 8. Verifikasi WhatsApp Link
  const waLink = page.locator('section a[href*="wa.me/6281222531978"]');
  await expect(waLink).toBeVisible();
  await expect(waLink.locator('text=081222531978')).toBeVisible();

  // 9. Verifikasi Email Link
  const emailLink = page.locator('a[href="mailto:rumahkhitandamai@gmail.com"]');
  await expect(emailLink).toBeVisible();
  await expect(page.locator('text=rumahkhitandamai@gmail.com')).toBeVisible();

  // 10. Verifikasi Embed Google Maps iframe & link resmi baru
  const mapIframe = page.locator('iframe[title*="Peta Lokasi Rumah Khitan Damai"]');
  await expect(mapIframe).toBeVisible();
  const iframeSrc = await mapIframe.getAttribute('src');
  // Pastikan koordinat dan query sesuai lokasi Rumah Khitan Damai Sukamelang Subang
  expect(iframeSrc).toContain('-6.5455663');
  expect(iframeSrc).toContain('107.7619294');
  expect(iframeSrc).toContain('Rumah+Khitan+Damai');
  // Pastikan koordinat lama yang keliru sudah tidak ada (anti-regresi)
  expect(iframeSrc).not.toContain('-6.5986875');

  const mapsBtn = page.locator('a[href="https://maps.app.goo.gl/W3pZFZupzuNU4Cdi9"]');
  await expect(mapsBtn.first()).toBeVisible();
  expect(await mapsBtn.count()).toBe(2); // Ada link di header kartu dan tombol navigasi di bawah kartu

  // 11. Verifikasi Direct Access via hash URL #/kontak
  await page.goto(filePath + '#/kontak', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await expect(heading).toBeVisible();
  await expect(navKontak).toHaveClass(/text-tosca-700/); // Status aktif
});
