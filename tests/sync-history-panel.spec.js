const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Sheet HISTORY Audit Trail & Sync History Panel Suite', () => {
  const codeGsPath = path.resolve(__dirname, '../asset/Code.gs');
  const indexPath = path.resolve(__dirname, '../asset/Index.html');

  test('Verify Code.gs contains HISTORY sheet helpers, 5000 max rows retention, pruning, and permission guards', async () => {
    const codeGs = fs.readFileSync(codeGsPath, 'utf-8');

    // 1. Konstanta Sheet HISTORY & Retensi
    expect(codeGs).toContain('const HISTORY_SHEET_NAME = "HISTORY";');
    expect(codeGs).toContain('const HISTORY_MAX_ROWS = 5000;');
    expect(codeGs).toContain('const HISTORY_PRUNE_BATCH = 500;');
    expect(codeGs).toContain('SERVER_CACHE_KEYS.HISTORY');
    expect(codeGs).toContain('SERVER_CACHE_KEYS.VERSIONS');

    // 2. Helper Fungsi Sheet HISTORY
    expect(codeGs).toContain('function getHistorySheet_()');
    expect(codeGs).toContain('function logHistory_(entries)');
    expect(codeGs).toContain('function readHistoryFromSheet_(options)');
    expect(codeGs).toContain('function clearHistorySheet_()');
    expect(codeGs).toContain('function getUserRole_(username)');

    // 3. Endpoint action getSyncHistory & clearSyncHistory
    expect(codeGs).toContain('action === "getSyncHistory"');
    expect(codeGs).toContain('action === "clearSyncHistory"');
    expect(codeGs).toContain('role !== "Super Admin"');

    // 4. Verifikasi aturan ketat: SpreadsheetApp.openById hanya muncul tepat 1 kali
    const openByIdMatches = codeGs.match(/SpreadsheetApp\.openById/g) || [];
    expect(openByIdMatches.length).toBe(1);
  });

  test('Verify Index.html contains sub-tab 3 markup, audit trail container, filters, and Super Admin clear button', async () => {
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    // Sub-tab button 3
    expect(indexHtml).toContain("switchSyncSubTab('history')");
    expect(indexHtml).toContain('Riwayat Perubahan Data');
    expect(indexHtml).toContain('serverSyncHistoryTotal');

    // Container markup
    expect(indexHtml).toContain("syncActiveSubTab === 'history'");
    expect(indexHtml).toContain('Audit Trail Sheet HISTORY');
    expect(indexHtml).toContain('serverSyncHistoryFilterDataset');
    expect(indexHtml).toContain('serverSyncHistoryFilterAksi');
    expect(indexHtml).toContain('serverSyncHistorySearch');
    expect(indexHtml).toContain('isSuperAdmin');

    // JavaScript logic in setup
    expect(indexHtml).toContain('fetchServerHistory');
    expect(indexHtml).toContain('loadMoreServerHistory');
    expect(indexHtml).toContain('clearServerHistory');
    expect(indexHtml).toContain('consecutiveSyncFailures');
  });

  test('Verify DOM rendering of Sub-Tab Riwayat Perubahan Data, Filter Pills, and Super Admin Clear Sheet', async ({ page }) => {
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
              token: 'mock-superadmin-token'
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

      if (url.includes('getSyncHistory') || payload.action === 'getSyncHistory') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            total: 3,
            offset: 0,
            limit: 50,
            hasMore: false,
            data: [
              {
                timestamp: Date.now() - 3600000,
                waktu: '29/10/2026 10:00:00 WIB',
                user: 'Budi (Publik)',
                aksi: 'TAMBAH',
                dataset: 'BOOKINGS',
                idRecord: 'KD2610290001',
                ringkasan: 'Pendaftaran booking baru: Muhammad Rizki (2026-11-01)',
                sumber: 'publik'
              },
              {
                timestamp: Date.now() - 1800000,
                waktu: '29/10/2026 10:30:00 WIB',
                user: 'denluckyman@gmail.com',
                aksi: 'UBAH',
                dataset: 'BOOKINGS',
                idRecord: 'KD2610290001',
                ringkasan: 'Ubah status booking KD2610290001 menjadi Confirmed',
                sumber: 'admin-panel'
              },
              {
                timestamp: Date.now() - 600000,
                waktu: '29/10/2026 11:00:00 WIB',
                user: 'denluckyman@gmail.com',
                aksi: 'HAPUS',
                dataset: 'GALERI',
                idRecord: 'GAL_001',
                ringkasan: 'Hapus foto galeri: GAL_001',
                sumber: 'admin-panel'
              }
            ]
          })
        });
      }

      if (payload.action === 'clearSyncHistory') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: 'Seluruh riwayat perubahan pada sheet HISTORY berhasil dibersihkan.'
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

    // Buka dialog login admin
    const infoBtn = page.locator('header button:has-text("INFO")');
    await expect(infoBtn).toBeVisible();
    await infoBtn.click();
    await page.waitForTimeout(400);

    // Login sebagai Super Admin
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

    // Cari dan klik tombol Sub-Tab "Riwayat Perubahan Data"
    const historySubTabBtn = page.locator('button:has-text("Riwayat Perubahan Data")');
    await expect(historySubTabBtn).toBeVisible();
    await historySubTabBtn.click();
    await page.waitForTimeout(800);

    // Verifikasi Banner Audit Trail Sheet HISTORY tampil
    await expect(page.locator('text=Audit Trail Sheet HISTORY').first()).toBeVisible();

    // Verifikasi ketiga catatan riwayat audit trail ter-render di DOM
    await expect(page.locator('text=Muhammad Rizki').first()).toBeVisible();
    await expect(page.locator('text=KD2610290001').first()).toBeVisible();
    await expect(page.locator('text=Confirmed').first()).toBeVisible();
    await expect(page.locator('text=GAL_001').first()).toBeVisible();

    // Verifikasi tombol Bersihkan Sheet tampak untuk Super Admin
    const clearSheetBtn = page.locator('button:has-text("Bersihkan Sheet")');
    await expect(clearSheetBtn).toBeVisible();

    // Verifikasi Filter Pills Dataset & Aksi
    await expect(page.locator('button:text-is("BOOKINGS")')).toBeVisible();
    await expect(page.locator('button:text-is("KUNJUNGAN")')).toBeVisible();
    await expect(page.locator('button:text-is("TAMBAH")')).toBeVisible();
    await expect(page.locator('button:text-is("HAPUS")')).toBeVisible();

    // Verifikasi aksi dialog bersihkan sheet
    await clearSheetBtn.click();
    await page.waitForTimeout(300);
    const confirmBtn = page.locator('button:has-text("YA, BERSIHKAN RIWAYAT")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await page.waitForTimeout(600);
  });
});
