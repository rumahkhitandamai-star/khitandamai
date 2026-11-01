const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Verify Telegram Evaluasi H+1 and H+2 functions, templates, and buttons in Code.gs', async () => {
  const codeGsContent = fs.readFileSync(path.resolve(__dirname, '../asset/Code.gs'), 'utf8');

  // Evaluasi fungsi di runtime sandbox Node
  const sandbox = {
    Logger: { log: () => {} },
    Utilities: {
      formatDate: (date, tz, fmt) => {
        const d = new Date(date);
        if (fmt === "yyyy-MM-dd'T'HH:mm:ss") {
          return "2026-11-01T08:30:00";
        }
        if (fmt === "UTC" || fmt === "yyyy-MM-dd") {
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return d.toISOString();
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
        setProperty: () => {}
      })
    }
  };

  const sampleKunjunganList = [
    {
      register: 'KD-202610-001',
      namaAnanda: 'Rayyan Al-Fatih',
      namaPenanggungJawab: 'Bambang Santoso',
      hubunganKeluarga: 'Ayah',
      nomorHp: '081234567890',
      tanggalKhitan: '2026-10-31',
      jamKhitan: '09:00',
      metodeKhitan: 'Smart Klamp'
    },
    {
      register: 'KD-202610-002',
      namaAnanda: 'Farhan Maulana',
      namaPenanggungJawab: 'Siti Rahma',
      hubunganKeluarga: 'Ibu',
      nomorHp: '081298765432',
      tanggalKhitan: '2026-10-30',
      jamKhitan: '10:00',
      metodeKhitan: 'Laser Cauter'
    }
  ];

  const contextScript = `
    ${codeGsContent}
    // Override readKunjunganFromSheet untuk testing
    function readKunjunganFromSheet() {
      return ${JSON.stringify(sampleKunjunganList)};
    }

    return {
      resolveHubunganKeluarga: resolveHubunganKeluarga_,
      buildWaEvaluasiText: buildWaEvaluasiText_,
      buildWaEvaluasiH2Text: buildWaEvaluasiH2Text_,
      cleanPhoneForWa: cleanPhoneForWa_,
      escapeTelegramHtml: escapeTelegramHtml_,
      getKunjunganEvaluasiItems: getKunjunganEvaluasiItems_,
      buildTelegramEvaluasiH1Response: buildTelegramEvaluasiH1Response_,
      buildTelegramEvaluasiH2Response: buildTelegramEvaluasiH2Response_,
      buildTelegramEvaluasiCombinedResponse: buildTelegramEvaluasiCombinedResponse_,
      buildTelegramEvaluasiDailyDigest: buildTelegramEvaluasiDailyDigest_
    };
  `;

  const fn = new Function('Utilities', 'Logger', 'PropertiesService', contextScript);
  const helpers = fn(sandbox.Utilities, sandbox.Logger, sandbox.PropertiesService);

  // 1. Verifikasi resolveHubunganKeluarga
  expect(helpers.resolveHubunganKeluarga('Ayah')).toBe('Ayah');
  expect(helpers.resolveHubunganKeluarga('ayah')).toBe('Ayah');
  expect(helpers.resolveHubunganKeluarga('Bapak')).toBe('Ayah');
  expect(helpers.resolveHubunganKeluarga('Papa')).toBe('Ayah');
  expect(helpers.resolveHubunganKeluarga('Abi')).toBe('Ayah');
  expect(helpers.resolveHubunganKeluarga('Ibu')).toBe('Bunda');
  expect(helpers.resolveHubunganKeluarga('bunda')).toBe('Bunda');
  expect(helpers.resolveHubunganKeluarga('Mama')).toBe('Bunda');
  expect(helpers.resolveHubunganKeluarga('Umi')).toBe('Bunda');
  expect(helpers.resolveHubunganKeluarga('Kakek')).toBe('Kakek');
  expect(helpers.resolveHubunganKeluarga('Wali')).toBe('Wali');
  expect(helpers.resolveHubunganKeluarga('')).toBe('Ayah/Bunda');
  expect(helpers.resolveHubunganKeluarga(null)).toBe('Ayah/Bunda');

  // 2. Verifikasi Template Teks H+1
  const textH1 = helpers.buildWaEvaluasiText(sampleKunjunganList[0]);
  expect(textH1).toContain("Assalamu'alaikum Warahmatullahi Wabarakatuh 🌸");
  expect(textH1).toContain("Ayah Bambang Santoso, bagaimana kabar Ananda Rayyan Al-Fatih hari ini?");
  expect(textH1).toContain("1. Apakah ananda masih merasakan nyeri atau bengkak pada area khitan?");
  expect(textH1).toContain("2. Apakah ada keluhan lain seperti perdarahan atau demam?");
  expect(textH1).toContain("3. Bagaimana dengan buang air kecilnya, apakah sudah lancar?");
  expect(textH1).toContain("Mohon dipastikan obat yang diberikan diminum secara teratur sesuai petunjuk ya Ayah.");
  expect(textH1).toContain("🏥 khitandamai.my.id");

  // 3. Verifikasi Template Teks H+2
  const textH2 = helpers.buildWaEvaluasiH2Text(sampleKunjunganList[1]);
  expect(textH2).toContain("Assalamu’alaikum Warahmatullahi Wabarakatuh 🌸");
  expect(textH2).toContain("Bunda Siti Rahma, apa kabar? Semoga Ananda Farhan Maulana sehat dan lukanya pulih dengan baik 🤍");
  expect(textH2).toContain("https://g.page/r/CbVAUU-xn-ylEBM/review");
  expect(textH2).toContain("Ulasan dari Bunda membantu orang tua lain");
  expect(textH2).toContain("boleh kami tampilkan sebagai testimoni di media sosial");
  expect(textH2).toContain("💐 Hormat kami,");
  expect(textH2).toContain("Admin Rumah Khitan Damai");

  // 4. Verifikasi format nomor WA
  expect(helpers.cleanPhoneForWa('081234567890')).toBe('6281234567890');
  expect(helpers.cleanPhoneForWa('+62 812-3456-7890')).toBe('6281234567890');

  // 5. Verifikasi Tanggal Evaluasi H+1 (Kemarin: 2026-10-31) & H+2 (2 Hari Lalu: 2026-10-30)
  const evalH1 = helpers.getKunjunganEvaluasiItems(-1);
  expect(evalH1.targetYmd).toBe('2026-10-31');
  expect(evalH1.items.length).toBe(1);
  expect(evalH1.items[0].register).toBe('KD-202610-001');

  const evalH2 = helpers.getKunjunganEvaluasiItems(-2);
  expect(evalH2.targetYmd).toBe('2026-10-30');
  expect(evalH2.items.length).toBe(1);
  expect(evalH2.items[0].register).toBe('KD-202610-002');

  // 6. Verifikasi buildTelegramEvaluasiH1Response
  const respH1 = helpers.buildTelegramEvaluasiH1Response();
  expect(respH1.text).toContain('DAFTAR EVALUASI H+1 (KHITAN KEMARIN)');
  expect(respH1.text).toContain('Rayyan Al-Fatih');
  expect(respH1.text).toContain('Ayah Bambang Santoso (Ayah)');
  expect(respH1.keyboard.inline_keyboard.length).toBeGreaterThan(0);
  const h1WaButton = respH1.keyboard.inline_keyboard[0][0];
  expect(h1WaButton.text).toContain('WA Evaluasi H+1 • Rayyan Al-Fatih');
  expect(h1WaButton.url).toContain('https://wa.me/6281234567890?text=');

  // 7. Verifikasi buildTelegramEvaluasiH2Response
  const respH2 = helpers.buildTelegramEvaluasiH2Response();
  expect(respH2.text).toContain('DAFTAR EVALUASI H+2 (KHITAN 2 HARI LALU)');
  expect(respH2.text).toContain('Farhan Maulana');
  expect(respH2.text).toContain('Bunda Siti Rahma (Ibu)');
  expect(respH2.keyboard.inline_keyboard.length).toBeGreaterThan(0);
  const h2WaButton = respH2.keyboard.inline_keyboard[0][0];
  expect(h2WaButton.text).toContain('WA Evaluasi H+2 • Farhan Maulana');
  expect(h2WaButton.url).toContain('https://wa.me/6281298765432?text=');

  // 8. Verifikasi buildTelegramEvaluasiCombinedResponse
  const respCombined = helpers.buildTelegramEvaluasiCombinedResponse();
  expect(respCombined.text).toContain('REKAP PENGINGAT EVALUASI PASIEN KHITAN');
  expect(respCombined.text).toContain('EVALUASI H+1');
  expect(respCombined.text).toContain('EVALUASI H+2');
  expect(respCombined.keyboard.inline_keyboard.length).toBeGreaterThan(1);

  // 9. Verifikasi buildTelegramEvaluasiDailyDigest
  const digest = helpers.buildTelegramEvaluasiDailyDigest(evalH1, evalH2);
  expect(digest.text).toContain('PENGINGAT PAGI EVALUASI PASIEN PASCA KHITAN');
  expect(digest.text).toContain('EVALUASI H+1 (1 Pasien)');
  expect(digest.text).toContain('EVALUASI H+2 (1 Pasien)');
  expect(digest.keyboard.inline_keyboard.length).toBe(3); // 2 WA buttons + 1 nav row
});
