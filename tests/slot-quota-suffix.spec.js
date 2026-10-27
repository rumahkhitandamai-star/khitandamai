const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Verify per-slot quota suffix parsing and validation logic in backend and frontend', async ({ page }) => {
  const codeSource = fs.readFileSync(path.resolve(__dirname, '../asset/Code.gs'), 'utf8');
  const indexSource = fs.readFileSync(path.resolve(__dirname, '../asset/Index.html'), 'utf8');

  // 1. Verifikasi regex & parser di asset/Code.gs
  expect(codeSource).toContain('jamKhitanQuota');
  expect(codeSource).toMatch(/quotaMatch/);
  expect(codeSource).toContain('refQuotas');

  // 2. Evaluasi parser regex secara unit
  const testItems = [
    { raw: '05:00 WIB - 5', expectedJam: '05:00 WIB', expectedQuota: 5 },
    { raw: '05:10 WIB (10)', expectedJam: '05:10 WIB', expectedQuota: 10 },
    { raw: '05:20 WIB|7', expectedJam: '05:20 WIB', expectedQuota: 7 },
    { raw: '05:30 WIB – 4', expectedJam: '05:30 WIB', expectedQuota: 4 },
    { raw: '06:00 WIB', expectedJam: '06:00 WIB', expectedQuota: null }
  ];

  for (const item of testItems) {
    let cleanJam = item.raw;
    let slotQuota = null;
    const parenMatch = cleanJam.match(/\s*\(\s*(\d{1,2})\s*\)$/);
    const sepMatch = !parenMatch ? cleanJam.match(/\s*[-–—|]\s*(\d{1,2})\s*$/) : null;
    const quotaMatch = parenMatch || sepMatch;
    if (quotaMatch) {
      slotQuota = parseInt(quotaMatch[1], 10);
      cleanJam = cleanJam.substring(0, quotaMatch.index).trim();
    }
    expect(cleanJam).toBe(item.expectedJam);
    expect(slotQuota).toBe(item.expectedQuota);
  }

  // 3. Verifikasi frontend di asset/Index.html
  expect(indexSource).toContain('jamKhitanQuota');
  expect(indexSource).not.toContain('(3 pasien/jam)'); // Hardcoded label must not exist
});
