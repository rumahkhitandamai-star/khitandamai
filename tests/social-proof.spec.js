const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Social Proof Counters is positioned below Hero Card and displays 4 metrics', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  await page.goto(filePath + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Dapatkan elemen Hero Card, Social Proof Counters, dan Metode Khitan
  const heroCard = page.locator('div.rounded-2xl.bg-gradient-to-br:has-text("Layanan Khitan Modern & Nyaman")');
  const socialProof = page.locator('#social-proof-counters');
  const metodeHeading = page.locator('h3:has-text("Metode")');

  await expect(heroCard).toBeVisible();
  await expect(socialProof).toBeVisible();
  await expect(metodeHeading).toBeVisible();

  const heroBox = await heroCard.boundingBox();
  const spBox = await socialProof.boundingBox();
  const metodeBox = await metodeHeading.boundingBox();

  console.log('Hero Card Y:', heroBox.y, 'Social Proof Y:', spBox.y, 'Metode Heading Y:', metodeBox.y);

  // Pastikan urutan vertikal: Hero Card < Social Proof Counters < Metode Khitan
  expect(heroBox.y).toBeLessThan(spBox.y);
  expect(spBox.y).toBeLessThan(metodeBox.y);

  // Verifikasi 4 metrik sosial bukti kredibilitas
  await expect(socialProof).toContainText('1.500+');
  await expect(socialProof).toContainText('Jagoan Terkhitan');

  await expect(socialProof).toContainText('4.9 / 5.0');
  await expect(socialProof).toContainText('Rating Kepuasan');

  await expect(socialProof).toContainText('100%');
  await expect(socialProof).toContainText('Steril & Medis');

  await expect(socialProof).toContainText('Minim Nyeri');
  await expect(socialProof).toContainText('Ramah Anak');

  // Pastikan terdapat 4 kartu metrik dalam grid
  const cards = socialProof.locator('> div');
  expect(await cards.count()).toBe(4);
});
