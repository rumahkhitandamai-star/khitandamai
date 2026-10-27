const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Delta Sync & Cache History Enhancement Suite', () => {
  const codeGsPath = path.resolve(__dirname, '../asset/Code.gs');
  const indexPath = path.resolve(__dirname, '../asset/Index.html');

  test('Verify Code.gs contains getSpreadsheet_ memoization, CACHE_TELEMETRY_, computeDatasetVersion_, and delta sync handling', async () => {
    const codeGs = fs.readFileSync(codeGsPath, 'utf-8');

    // 1. Memoisasi Spreadsheet
    expect(codeGs).toContain('var SPREADSHEET_MEMO_ = null;');
    expect(codeGs).toContain('function getSpreadsheet_()');
    expect(codeGs).toContain('if (!SPREADSHEET_MEMO_)');

    // Verifikasi bahwa pemanggilan openById hanya ada pada helper memo
    const openByIdMatches = codeGs.match(/SpreadsheetApp\.openById/g) || [];
    expect(openByIdMatches.length).toBe(1);

    // 2. Telemetri Cache Hit/Miss
    expect(codeGs).toContain('var CACHE_TELEMETRY_ = {};');
    expect(codeGs).toContain('function recordCacheTelemetry_(');
    expect(codeGs).toContain('recordCacheTelemetry_("bookings", "hit");');
    expect(codeGs).toContain('recordCacheTelemetry_("bookings", "miss");');
    expect(codeGs).toContain('recordCacheTelemetry_("kunjungan", "hit");');
    expect(codeGs).toContain('recordCacheTelemetry_("kunjungan", "miss");');
    expect(codeGs).toContain('recordCacheTelemetry_("settings", "hit");');
    expect(codeGs).toContain('recordCacheTelemetry_("settings", "miss");');

    // 3. Hash Versi Dataset FNV-1a
    expect(codeGs).toContain('function computeDatasetVersion_(data)');
    expect(codeGs).toContain('0x811c9dc5'); // FNV offset basis
    expect(codeGs).toContain('0x01000193'); // FNV prime

    // 4. Delta Sync pada handleSyncAdminData
    expect(codeGs).toContain('const unchanged = {');
    expect(codeGs).toContain('bookings: Boolean(!forceRefresh && clientVersions.bookings && clientVersions.bookings === bVer)');
    expect(codeGs).toContain('telemetry: {');
    expect(codeGs).toContain('cache: CACHE_TELEMETRY_ || {}');
  });

  test('Verify Index.html contains snapshot retention 50, per-target quota, delta badges, and effectiveness metrics', async () => {
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    // 1. Retensi snapshot 50 & kuota target
    expect(indexHtml).toContain('const SNAPSHOT_HISTORY_MAX = 50;');
    expect(indexHtml).toContain('const SNAPSHOT_PER_TARGET_MAX = 8;');
    expect(indexHtml).toContain('function getStoredSyncVersions()');
    expect(indexHtml).toContain('function saveStoredSyncVersions(');
    expect(indexHtml).toContain('localStorage.removeItem(\'kd_sync_versions\');');

    // 2. Metrik Efektivitas
    expect(indexHtml).toContain('cacheHitRatePercent');
    expect(indexHtml).toContain('avgPayloadTransferred');
    expect(indexHtml).toContain('bandwidthSavingsEstimate');
    expect(indexHtml).toContain('Hit-Rate Cache');
    expect(indexHtml).toContain('Rata Payload');
    expect(indexHtml).toContain('Bandwidth Hemat');

    // 3. UI Filter Delta & Badges
    expect(indexHtml).toContain('{ id: \'delta\', label: \'Delta\' }');
    expect(indexHtml).toContain('item.payloadBytes');
    expect(indexHtml).toContain('item.deltaStatus');
    expect(indexHtml).toContain('item.cacheHits');
  });

  test('Verify DOM rendering of Cache Effectiveness cards and Sync Toolbar in Browser', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const fileUrl = 'file://' + indexPath.replace(/\\/g, '/');

    // Mock GAS API calls
    await page.route(/script\.google\.com/, async (route) => {
      const req = route.request();
      const url = req.url();
      let payload = {};
      try {
        const postData = req.postData();
        if (postData) payload = JSON.parse(postData);
      } catch (e) {}

      if (payload.action === 'login') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              no: 1,
              username: 'denluckyman@gmail.com',
              nama: 'Super Admin',
              role: 'Super Admin',
              otorisasi: '',
              token: 'mock-valid-token'
            }
          })
        });
      }

      if (url.includes('syncAdminData') || payload.action === 'syncAdminData') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            delta: true,
            unchanged: { bookings: true, kunjungan: true, settings: true },
            versions: { bookings: 'v1_100', kunjungan: 'v2_200', settings: 'v3_50' },
            telemetry: { cache: { bookings: 'hit', kunjungan: 'hit', settings: 'hit' } },
            counts: { bookings: 10, kunjungan: 5, users: 2 },
            data: {}
          })
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: {} })
      });
    });

    await page.goto(fileUrl + '#/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Buka dialog info login admin
    const infoBtn = page.locator('header button:has-text("INFO")');
    await expect(infoBtn).toBeVisible();
    await infoBtn.click();
    await page.waitForTimeout(400);

    // Login sebagai Admin
    await page.fill('input[placeholder*="admin atau email" i]', 'denluckyman@gmail.com');
    await page.fill('input[placeholder*="kata sandi" i]', '111111111');
    const submitLogin = page.locator('button[type="submit"]:has-text("Masuk sebagai Pengelola")');
    await expect(submitLogin).toBeVisible();
    await submitLogin.click();
    await page.waitForTimeout(800);

    // Navigasi ke menu Setting via Desktop Sidebar
    const settingNavBtn = page.locator('aside nav button:has-text("Setting")').first();
    await expect(settingNavBtn).toBeVisible({ timeout: 10000 });
    await settingNavBtn.click();
    await page.waitForTimeout(500);

    // Buka sub-menu Sinkronisasi & Cache
    const syncChipBtn = page.locator('button:has-text("Sinkronisasi & Cache")').first();
    await expect(syncChipBtn).toBeVisible();
    await syncChipBtn.click();
    await page.waitForTimeout(500);

    // Verifikasi keberadaan kartu metrik efektivitas cache
    await expect(page.locator('text=Hit-Rate Cache').first()).toBeVisible();
    await expect(page.locator('text=Rata Payload').first()).toBeVisible();
    await expect(page.locator('text=Bandwidth Hemat').first()).toBeVisible();
    await expect(page.locator('text=Versi Snapshot').first()).toBeVisible();

    // Verifikasi Filter Delta pada log sinkronisasi
    const deltaFilterBtn = page.locator('button:has-text("Delta")').first();
    await expect(deltaFilterBtn).toBeVisible();
  });
});
