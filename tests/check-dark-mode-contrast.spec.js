const { test, expect } = require('@playwright/test');
const path = require('path');

test('Inspect all text contrast across all admin tabs and modals in dark mode', async ({ page }) => {
  const filePath = 'file://' + path.resolve(__dirname, '../public/index.html').replace(/\\/g, '/');

  // Pre-seed localStorage with admin user and dark mode
  await page.addInitScript(() => {
    localStorage.setItem('admin_theme', 'dark');
    localStorage.setItem('kd_admin_user', JSON.stringify({
      no: 1,
      username: 'denluckyman@gmail.com',
      nama: 'denluckyman@gmail.com',
      role: 'Super Admin',
      otorisasi: '',
      token: 'mock-token-test'
    }));
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(filePath + '#/admin', { waitUntil: 'domcontentloaded' });

  // Wait for dark mode to be applied
  await page.waitForSelector('html.dark', { timeout: 10000 });
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(isDark).toBe(true);

  // Inspection function
  async function inspectTextContrast(label) {
    return await page.evaluate((tabName) => {
      const allElements = document.querySelectorAll('.admin-panel *');
      const lowContrastTexts = [];

      allElements.forEach(el => {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'svg' || el.tagName === 'path') return;
        const text = (el.innerText || '').trim();
        if (!text) return;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

        const color = style.color;
        const bg = style.backgroundColor;

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

          // If text is dark (lum < 0.55) on dark background (bgLum < 0.45)
          if (lum < 0.55 && bgLum < 0.45) {
            lowContrastTexts.push({
              tab: tabName,
              tag: el.tagName,
              cls: el.className,
              text: text.slice(0, 50).replace(/\s+/g, ' '),
              color: color,
              bg: bg,
              lum: lum.toFixed(2)
            });
          }
        }
      });
      return lowContrastTexts;
    }, label);
  }

  // 1. Desktop Check
  const desktopIssues = await inspectTextContrast('Dashboard Desktop');
  console.log(`Desktop Dashboard: ${desktopIssues.length} low contrast elements.`);
  expect(desktopIssues.length).toBe(0);

  // 2. Open Tambah Kunjungan Modal via "Kunjungan Baru" button
  const kunjunganBaruBtn = page.locator('button:has-text("Kunjungan Baru")').first();
  if (await kunjunganBaruBtn.isVisible()) {
    await kunjunganBaruBtn.click();
    await page.waitForTimeout(600);

    const modalIssues = await inspectTextContrast('Modal Tambah Kunjungan');
    console.log(`Modal Tambah Kunjungan: ${modalIssues.length} low contrast elements.`);
    modalIssues.forEach((iss, idx) => {
      console.log(`  [MODAL ${idx}] <${iss.tag}> cls="${iss.cls}" color=${iss.color} bg=${iss.bg} text="${iss.text}"`);
    });
    expect(modalIssues.length).toBe(0);

    // Close modal
    const closeBtn = page.locator('.kunjungan-compact button:has-text("Batal"), .kunjungan-compact button:has-text("Tutup")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // 3. Mobile Viewport Check (390 x 844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);

  const mobileTabs = ['dashboard', 'booking', 'kunjungan', 'galeri', 'saran', 'jumatberkah', 'setting'];
  for (const tabId of mobileTabs) {
    const pill = page.locator(`.md\\:hidden button:has-text("${tabId}")`).first();
    if (await pill.isVisible()) {
      await pill.click();
      await page.waitForTimeout(300);
    }
    const issues = await inspectTextContrast(`Mobile ${tabId}`);
    console.log(`Mobile Tab ${tabId.toUpperCase()}: ${issues.length} low contrast elements.`);
    expect(issues.length).toBe(0);
  }

  // Also check Setting Sub-menu Users contrast
  const usersSubChip = page.locator('button:has-text("Users & Hak Akses"):visible').first();
  if (await usersSubChip.isVisible()) {
    await usersSubChip.click();
    await page.waitForTimeout(400);
    const usersIssues = await inspectTextContrast('Mobile Setting Sub-menu Users');
    console.log(`Mobile Setting Sub-menu Users: ${usersIssues.length} low contrast elements.`);
    expect(usersIssues.length).toBe(0);
  }
});
