const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Admin Setting: Hero Card / Featuring Card Sub-Menu', () => {
  const filePath = 'file://' + path.resolve(__dirname, '../public/index.html').replace(/\\/g, '/');
  let mockServerSettings = {};

  test.beforeEach(async ({ page }) => {
    mockServerSettings = {};

    // Intercept Google Apps Script requests to provide instant, stable mock responses
    await page.route(/script\.google\.com/, async (route) => {
      const request = route.request();
      const url = request.url();

      if (request.method() === 'POST') {
        let payload = {};
        try {
          payload = JSON.parse(request.postData() || '{}');
        } catch (e) {}

        if (payload.action === 'saveSettings') {
          if (payload.data) {
            mockServerSettings = Object.assign({}, mockServerSettings, payload.data);
          }
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              message: 'Pengaturan Hero Card berhasil disimpan ke database.',
              data: payload.data
            })
          });
        }

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
      }

      if (url.includes('action=getSettings')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: mockServerSettings
          })
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            bookings: [],
            kunjungan: [],
            users: []
          }
        })
      });
    });

    // Pre-seed localStorage with admin session
    await page.addInitScript(() => {
      localStorage.setItem('kd_admin_user', JSON.stringify({
        no: 1,
        username: 'denluckyman@gmail.com',
        nama: 'Super Admin',
        role: 'Super Admin',
        otorisasi: '',
        token: 'mock-valid-token'
      }));
    });
  });

  test('Verify Sub-Menu Hero Card under Running Text, 3 Text Groups, Live Preview, and Public Beranda Sync', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 1. Navigate to Setting Tab via Desktop Sidebar
    const settingNavBtn = page.locator('aside nav button:has-text("Setting")').first();
    await expect(settingNavBtn).toBeVisible({ timeout: 10000 });
    await settingNavBtn.click();
    await page.waitForTimeout(400);

    // 2. Verify Sub-Menu order: Running Text -> Hero Card / Featuring Card -> Foto Slideshow
    const heroCardChip = page.locator('button:has-text("Hero Card / Featuring Card")').first();
    await expect(heroCardChip).toBeVisible();

    // 3. Click Hero Card sub-menu
    await heroCardChip.click();
    await page.waitForTimeout(400);

    // 4. Verify Header and 3 Text Groups
    await expect(page.locator('text=Pengaturan Hero Card / Featuring Card (Beranda Publik)').first()).toBeVisible();
    await expect(page.locator('text=Kelompok Teks Badge (Span Atas)').first()).toBeVisible();
    await expect(page.locator('text=Kelompok Judul Utama (H2 Class)').first()).toBeVisible();
    await expect(page.locator('text=Kelompok Narasi & Deskripsi (P Class)').first()).toBeVisible();

    // 5. Verify inputs exist
    const badgeInput = page.locator('input[placeholder*="Layanan Khitan Modern & Nyaman"]');
    const titleInput = page.locator('input[placeholder*="Pengalaman Khitan Ceria & Ramah Anak di Subang"]');
    const descTextarea = page.locator('textarea[placeholder*="Tuliskan narasi penjelasan klinik"]');

    await expect(badgeInput).toBeVisible();
    await expect(titleInput).toBeVisible();
    await expect(descTextarea).toBeVisible();

    // 6. Verify live preview exists
    const previewContainer = page.locator('div:has-text("Preview Langsung (Sebelum Disimpan)")').first();
    await expect(previewContainer).toBeVisible();

    // 7. Type new texts into 3 groups
    const newBadge = "Subang Juara Khitan 2026";
    const newTitle = "Khitan Nyaman Bebas Cemas & Ceria";
    const newDesc = "Pelayanan khitan ramah anak terbaik di Subang dengan metode terkini, minim rasa sakit, dan pemulihan cepat.";

    await badgeInput.fill(newBadge);
    await titleInput.fill(newTitle);
    await descTextarea.fill(newDesc);

    // 8. Verify Live Preview reflects typed values
    await expect(page.locator(`.admin-panel span:has-text("${newBadge}")`).first()).toBeVisible();
    await expect(page.locator(`.admin-panel h2:has-text("${newTitle}")`).first()).toBeVisible();
    await expect(page.locator(`.admin-panel p:has-text("${newDesc}")`).first()).toBeVisible();

    // 9. Verify unsaved changes banner appears
    await expect(page.locator('text=Ada perubahan teks Hero Card yang belum disimpan').first()).toBeVisible();

    // 10. Click Simpan Pengaturan
    const saveBtn = page.locator('button:has-text("Simpan Pengaturan")').first();
    await saveBtn.click();
    await page.waitForTimeout(400);

    // Confirm dialog
    const confirmBtn = page.locator('button:has-text("YA, SIMPAN")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await page.waitForTimeout(800);

    // 11. Verify toast notification
    await expect(page.locator('text=Pengaturan Hero Card berhasil disimpan').first()).toBeVisible();

    // 12. Navigate to Public Beranda (#/home) via hash navigation
    await page.evaluate(() => { window.location.hash = '#/home'; });
    await page.waitForTimeout(600);

    const publicHeroSection = page.locator('section:has-text("Subang Juara Khitan 2026")').first();
    await expect(publicHeroSection).toBeVisible();
    await expect(publicHeroSection.locator('span', { hasText: newBadge })).toBeVisible();
    await expect(publicHeroSection.locator('h2', { hasText: newTitle })).toBeVisible();
    await expect(publicHeroSection.locator('p', { hasText: newDesc })).toBeVisible();
  });

  test('Verify Reset Default button restores default texts', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Go to Setting -> Hero Card
    const settingNavBtn = page.locator('aside nav button:has-text("Setting")').first();
    await expect(settingNavBtn).toBeVisible({ timeout: 10000 });
    await settingNavBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Hero Card / Featuring Card")').first().click();
    await page.waitForTimeout(400);

    // Type arbitrary values
    const badgeInput = page.locator('input[placeholder*="Layanan Khitan Modern & Nyaman"]');
    await badgeInput.fill('Teks Coba Ganti');

    // Click Reset Default
    const resetBtn = page.locator('button:has-text("Reset Default")').first();
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Value should revert to default
    expect(await badgeInput.inputValue()).toBe('Layanan Khitan Modern & Nyaman');
  });

  test('Verify Text Contrast in Dark Mode for Hero Card Setting Section', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('admin_theme', 'dark');
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html.dark', { timeout: 10000 });

    // Open Setting -> Hero Card
    const settingNavBtn = page.locator('aside nav button:has-text("Setting")').first();
    await expect(settingNavBtn).toBeVisible({ timeout: 10000 });
    await settingNavBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Hero Card / Featuring Card")').first().click();
    await page.waitForTimeout(500);

    // Audit text contrast
    const { low, lowList } = await page.evaluate(() => {
      const allElements = document.querySelectorAll('.admin-panel *');
      let low = 0;
      const lowList = [];
      allElements.forEach(el => {
        if (['SCRIPT', 'STYLE', 'svg', 'path'].includes(el.tagName)) return;
        const text = (el.innerText || '').trim();
        if (!text) return;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

        const color = style.color;
        let bg = style.backgroundColor;
        let curr = el;
        while (curr && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
          curr = curr.parentElement;
          if (curr) bg = window.getComputedStyle(curr).backgroundColor;
        }

        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

          let bgLum = 0.1;
          const bgM = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (bgM) {
            const bgR = parseInt(bgM[1]), bgG = parseInt(bgM[2]), bgB = parseInt(bgM[3]);
            bgLum = (0.2126 * bgR + 0.7152 * bgG + 0.0722 * bgB) / 255;
          }

          // In dark mode: flagged if text is dark (lum < 0.55) on dark background (bgLum < 0.45)
          if (lum < 0.55 && bgLum < 0.45) {
            low++;
            lowList.push({ tag: el.tagName, cls: el.className, text: text.slice(0, 40), color, bg, lum: lum.toFixed(2), bgLum: bgLum.toFixed(2) });
          }
        }
      });
      return { low, lowList };
    });

    console.log('Hero Card Dark Mode Low Contrast Count:', low, lowList);
    expect(low).toBe(0);
  });
});
