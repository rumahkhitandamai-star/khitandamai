const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify gap between bottom nav and last card on public routes is ~30px (ergonomic spacing)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');

  const publicRoutes = ['home', 'booking', 'galeri', 'kontak'];

  for (const route of publicRoutes) {
    await page.goto(filePath + '#/' + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Scroll berulang sampai posisi halaman benar-benar mencapai batas terbawah (menghandle lazy image loading)
    await page.evaluate(async () => {
      let prevScroll = -1;
      for (let i = 0; i < 10; i++) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise(r => setTimeout(r, 150));
        if (window.scrollY === prevScroll) break;
        prevScroll = window.scrollY;
      }
    });
    await page.waitForTimeout(300);

    const gap = await page.evaluate(() => {
      const nav = document.querySelector('.safe-bottom-nav');
      const main = document.querySelector('main');
      if (!nav || !main) return null;

      const navBox = nav.getBoundingClientRect();
      const kids = [...main.children].filter(el => el.offsetParent !== null);
      const last = kids[kids.length - 1];
      if (!last) return null;

      const lb = last.getBoundingClientRect();
      return Math.round(navBox.top - lb.bottom);
    });

    console.log(`Route #${route}: Gap = ${gap}px`);

    // Pastikan gap berkisar 30px (+/- 5px, yaitu 25px - 35px) dan tidak lagi berjarak 180px+ yang terlalu lebar
    expect(gap).toBeGreaterThanOrEqual(25);
    expect(gap).toBeLessThanOrEqual(35);
  }
});
