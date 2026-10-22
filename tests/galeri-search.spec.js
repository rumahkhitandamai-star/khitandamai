const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Galeri Search by Photo Name, Filter Results, Reset, and Empty State', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  await page.goto(filePath + '#/galeri', { waitUntil: 'domcontentloaded' });
  // Tunggu data galeri stabil dari remote sheet
  await page.waitForTimeout(2500);

  // 1. Verifikasi input pencarian ada dan terlihat
  const searchInput = page.locator('input[aria-label="Cari foto galeri berdasarkan nama"]');
  await expect(searchInput).toBeVisible();

  // Ambil nama foto pertama dari kartu yang ada
  const firstCardDesc = page.locator('section:has(h2:has-text("Galeri Jagoan Khitan")) div.space-y-4 > div.group p').first();
  await expect(firstCardDesc).toBeVisible();
  const originalName = (await firstCardDesc.textContent()).trim();
  console.log('Sample photo name to search:', originalName);

  // Ambil kata pertama untuk query
  const queryWord = originalName.split(/\s+/)[0] || originalName;
  console.log('Query word:', queryWord);

  // 2. Ketik kata kunci pencarian
  await searchInput.fill(queryWord);
  await page.waitForTimeout(600);

  // Pastikan info status filter spesifik muncul
  const filterInfo = page.locator('div:has-text("Ditemukan"):has(strong)').first();
  await expect(filterInfo).toBeVisible();
  const filterText = await filterInfo.textContent();
  console.log('Filter info text:', filterText.trim());
  expect(filterText).toContain('Ditemukan');
  expect(filterText).toContain(queryWord);

  // Pastikan tombol reset 'X' muncul
  const btnClear = page.locator('button[aria-label="Hapus kata kunci pencarian galeri"]');
  await expect(btnClear).toBeVisible();

  // Pastikan seluruh kartu foto yang ditampilkan memuat kata kunci (case-insensitive)
  const filteredCards = page.locator('section:has(h2:has-text("Galeri Jagoan Khitan")) div.space-y-4 > div.group p');
  const countFiltered = await filteredCards.count();
  console.log('Filtered card count on current page:', countFiltered);
  expect(countFiltered).toBeGreaterThan(0);

  for (let i = 0; i < countFiltered; i++) {
    const descText = (await filteredCards.nth(i).textContent()).toLowerCase();
    expect(descText).toContain(queryWord.toLowerCase());
  }

  // 3. Reset pencarian via tombol 'X'
  await btnClear.click();
  await page.waitForTimeout(400);
  expect(await searchInput.inputValue()).toBe('');
  await expect(filterInfo).toHaveCount(0);

  // 4. Uji Pencarian dengan Kata Kunci yang TIDAK Ditemukan
  await searchInput.fill('xyzfototidakada9999');
  await page.waitForTimeout(600);

  // Pastikan State "Nama Foto Tidak Ditemukan" muncul
  const notFoundHeading = page.locator('h3:has-text("Nama Foto Tidak Ditemukan")');
  await expect(notFoundHeading).toBeVisible();

  const notFoundText = page.locator('text=xyzfototidakada9999').first();
  await expect(notFoundText).toBeVisible();

  // Tombol "Tampilkan Semua Foto" harus ada
  const btnShowAll = page.getByRole('button', { name: 'Tampilkan Semua Foto' });
  await expect(btnShowAll).toBeVisible();

  // 5. Klik "Tampilkan Semua Foto" dan pastikan input ter-reset
  await btnShowAll.click();
  await page.waitForTimeout(500);

  await expect(notFoundHeading).toHaveCount(0);
  expect(await searchInput.inputValue()).toBe('');
  const restoredCardsCount = await page.locator('section:has(h2:has-text("Galeri Jagoan Khitan")) div.space-y-4 > div.group').count();
  expect(restoredCardsCount).toBeGreaterThan(0);
});
