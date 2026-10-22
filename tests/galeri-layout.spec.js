const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Galeri 1 Foto Fullscreen (1 Kolom Horizontal), Non-cropped, and Pagination 10 Foto', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // 1. Buka rute Galeri (#/galeri)
  await page.goto(filePath + '#/galeri', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 2. Pastikan section galeri jagoan khitan tampil
  const heading = page.locator('h2:has-text("Galeri Jagoan Khitan")');
  await expect(heading).toBeVisible();

  // 3. Pastikan TIDAK ADA layout grid multi-kolom (grid-cols-2) pada galeri publik
  const oldGrid = page.locator('section[v-else-if*="galeri"] .grid-cols-2');
  await expect(oldGrid).toHaveCount(0);

  // 4. Ambil semua kartu foto di halaman 1
  const galleryCards = page.locator('section:has(h2:has-text("Galeri Jagoan Khitan")) div.space-y-4 > div.group');
  const cardCount = await galleryCards.count();
  console.log('Jumlah kartu foto di Halaman 1:', cardCount);
  expect(cardCount).toBeLessThanOrEqual(10);
  expect(cardCount).toBeGreaterThan(0);

  // 5. Verifikasi kartu foto 1 kolom horizontal memenuhi lebar kontainer (fullscreen width)
  const firstCard = galleryCards.first();
  await expect(firstCard).toBeVisible();
  const box = await firstCard.boundingBox();
  console.log('Ukuran kartu foto pertama:', box);
  expect(box.width).toBeGreaterThanOrEqual(340);

  // 6. Verifikasi foto TIDAK TERPOTONG (menggunakan object-contain, TIDAK menggunakan object-cover)
  const firstImg = firstCard.locator('img');
  await expect(firstImg).toBeVisible();
  const imgClass = await firstImg.getAttribute('class');
  console.log('Image classes:', imgClass);
  expect(imgClass).toContain('object-contain');
  expect(imgClass).not.toContain('object-cover');

  // Pastikan container foto tidak memaksakan aspect-[4/3] atau aspect-[16/9] yang memotong foto
  const imgContainer = firstCard.locator('> div').first();
  const containerClass = await imgContainer.getAttribute('class');
  console.log('Container classes:', containerClass);
  expect(containerClass).not.toContain('aspect-');

  // 7. Verifikasi indikator paginasi di Halaman 1
  const paginationText = page.locator('div:has-text("Menampilkan")').last();
  await expect(paginationText).toBeVisible();
  const textHal1 = await paginationText.textContent();
  console.log('Indikator paginasi:', textHal1.trim());
  expect(textHal1).toContain('Menampilkan 1 -');

  // Tombol "Sebelumnya" disabled di halaman 1
  const prevBtn = page.locator('button[aria-label="Halaman Sebelumnya"]');
  await expect(prevBtn).toBeDisabled();

  // 8. Verifikasi tombol "Selanjutnya" TIDAK tertutup tombol kembali ke atas saat scroll ke bawah
  const nextBtn = page.locator('button[aria-label="Halaman Selanjutnya"]');
  await nextBtn.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(600);

  const scrollTopBtn = page.locator('button[aria-label="Kembali ke atas"]');
  const waBtn = page.locator('a[aria-label="Hubungi WhatsApp Admin"]');

  await expect(nextBtn).toBeEnabled();
  await expect(scrollTopBtn).toBeVisible();
  await expect(waBtn).toHaveCount(0); // Floating WhatsApp sudah dihapus

  const nextBox = await nextBtn.boundingBox();
  const scrollBox = await scrollTopBtn.boundingBox();

  // Pastikan tombol Selanjutnya tidak tertimpa tombol Kembali ke Atas
  expect(nextBox.x + nextBox.width).toBeLessThan(scrollBox.x);

  // Klik tombol "Selanjutnya" untuk berpindah ke Halaman 2
  await nextBtn.click();
  await page.waitForTimeout(600);

  // Verifikasi indikator paginasi di Halaman 2
  const textHal2 = await paginationText.textContent();
  console.log('Indikator paginasi Hal 2:', textHal2.trim());
  expect(textHal2).toContain('Menampilkan 11 -');
  await expect(prevBtn).toBeEnabled();

  // 9. Klik kartu foto untuk membuka modal lightbox gambar utuh
  await galleryCards.first().click();
  await page.waitForTimeout(400);

  const closeBtn = page.locator('button[aria-label="Tutup Tampilan Penuh"]');
  await expect(closeBtn).toBeVisible();

  // Tutup modal lightbox
  await closeBtn.click();
  await page.waitForTimeout(400);
  await expect(closeBtn).toHaveCount(0);

  // 10. Kembali ke Halaman 1 via tombol "Sebelumnya"
  await prevBtn.click();
  await page.waitForTimeout(600);
  const textHal1Kembali = await paginationText.textContent();
  expect(textHal1Kembali).toContain('Menampilkan 1 -');
  await expect(prevBtn).toBeDisabled();
});
