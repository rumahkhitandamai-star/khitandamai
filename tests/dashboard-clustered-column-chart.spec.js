const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Dashboard Clustered Column Chart: Position under Grid Card Total Kunjungan, Filter Dari-Ke, and Canvas Rendering', async ({ page }) => {
  // Gunakan mobile viewport standar (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Buka aplikasi dan login ke panel admin
  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Buka modal login lewat tombol INFO
  const infoBtn = page.locator('header button:has-text("INFO")');
  await expect(infoBtn).toBeVisible();
  await infoBtn.click();
  await page.waitForTimeout(400);

  // Isi kredensial admin
  await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
  await page.fill('input[placeholder*="kata sandi" i]', '111111111');
  const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
  await submitLogin.click();
  await page.waitForTimeout(1000);

  // 2. Pastikan sudah berada di Tab Dashboard
  const dashboardHeading = page.locator('h4:has-text("Card Grafik Total")');
  await expect(dashboardHeading).toBeVisible({ timeout: 15000 });

  // 3. Verifikasi Grid Card Total Kunjungan terlihat
  const gridCardTotalKunjungan = page.locator('h4:has-text("Grid Card Total Kunjungan")');
  await expect(gridCardTotalKunjungan).toBeVisible();

  // 4. Verifikasi Card Clustered Column Chart ada dan diletakkan tepat setelah Grid Card Total Kunjungan
  const clusteredHeading = page.locator('h4:has-text("Card Clustered Column Chart")');
  await expect(clusteredHeading).toBeVisible();

  // Verifikasi urutan DOM: Grid Card Total Kunjungan harus mendahului Card Clustered Column Chart
  const isOrderCorrect = await page.evaluate(() => {
    const el1 = document.evaluate("//h4[contains(., 'Grid Card Total Kunjungan')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const el2 = document.evaluate("//h4[contains(., 'Card Clustered Column Chart')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!el1 || !el2) return false;
    return Boolean(el1.compareDocumentPosition(el2) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(isOrderCorrect).toBe(true);

  // 5. Verifikasi Filter "Dari Tahun ke Tahun" (2 select dropdown)
  const selectFrom = page.locator('select[title="Pilih Tahun Awal"]');
  const selectTo = page.locator('select[title="Pilih Tahun Akhir"]');
  await expect(selectFrom).toBeVisible();
  await expect(selectTo).toBeVisible();

  const fromOptions = await selectFrom.locator('option').allInnerTexts();
  const toOptions = await selectTo.locator('option').allInnerTexts();
  expect(fromOptions.length).toBeGreaterThan(0);
  expect(toOptions.length).toBeGreaterThan(0);

  // 6. Verifikasi Canvas Chart Clustered Column ter-render
  const canvasClustered = page.locator('canvas#chart-clustered-bulanan');
  await expect(canvasClustered).toBeVisible();

  // Tunggu sinkronisasi database selesai jika sedang fetch
  await page.waitForTimeout(2000);

  // Cek instance Chart.js pada canvas (tunggu jika Chart CDN / database sedang proses)
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const canvas = document.getElementById('chart-clustered-bulanan');
      if (!canvas || typeof Chart === 'undefined') return false;
      const chart = Chart.getChart(canvas);
      return Boolean(chart && chart.data && chart.data.labels && chart.data.labels.length === 12);
    });
  }, { timeout: 15000 }).toBe(true);

  // 7. Uji interaktivitas filter tahun: ubah filter dan verifikasi re-render
  const availableYears = fromOptions.map(t => t.trim());
  if (availableYears.length >= 2) {
    const firstYear = availableYears[0];
    const lastYear = availableYears[availableYears.length - 1];

    await selectFrom.selectOption(firstYear);
    await selectTo.selectOption(lastYear);
    await page.waitForTimeout(500);

    const chartDatasetsCount = await page.evaluate(() => {
      const canvas = document.getElementById('chart-clustered-bulanan');
      const chart = Chart.getChart(canvas);
      return chart ? chart.data.datasets.length : 0;
    });
    expect(chartDatasetsCount).toBeGreaterThanOrEqual(1);
  }

  // 8. Verifikasi tidak ada error di console
  const fatalErrors = consoleErrors.filter(err => 
    err.toLowerCase().includes('canvas is already in use') || 
    err.toLowerCase().includes('cannot read properties') ||
    err.toLowerCase().includes('chart')
  );
  expect(fatalErrors).toHaveLength(0);
});
