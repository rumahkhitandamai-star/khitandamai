# Graph Report - khitandamai.my.id  (2026-10-26)

## Corpus Check
- 48 files · ~161,276 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 4)

## Summary
- 277 nodes · 574 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4870225d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @playwright/test
- upload-docs-to-drive.js
- Code.gs
- doPost
- asset/prd.md
- prd.md
- handleTelegramWebhookUpdate_
- doGet
- with
- handleSyncAdminData
- package.json
- checkUpcomingKhitanReminders
- appsscript.json
- jumatBerkahObjectToRow_
- readAndWarmAlamatOptions
- getJumatBerkahSheet

## God Nodes (most connected - your core abstractions)
1. `doPost()` - 72 edges
2. `doGet()` - 37 edges
3. `@playwright/test` - 37 edges
4. `handleTelegramWebhookUpdate_()` - 17 edges
5. `normalizeYmd_()` - 15 edges
6. `readSettings()` - 13 edges
7. `handleSyncAdminData()` - 13 edges
8. `sendTelegramReminderNotification_()` - 11 edges
9. `sendTelegramBookingNotification_()` - 10 edges
10. `readBookingsFromSheet()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Commands` --references--> `main()`  [INFERRED]
  AGENTS.md → scripts/upload-docs-to-drive.js
- `Commands` --references--> `main()`  [INFERRED]
  asset/AGENTS.md → scripts/upload-docs-to-drive.js
- `9.1 Panduan Setup Time-Driven Trigger Pengingat Jadwal (< 12 Jam) di Google Apps Script` --references--> `checkUpcomingKhitanReminders()`  [INFERRED]
  prd.md → asset/Code.gs
- `Architecture` --references--> `doGet()`  [INFERRED]
  AGENTS.md → asset/Code.gs
- `Architecture` --references--> `doPost()`  [INFERRED]
  AGENTS.md → asset/Code.gs

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 1 - "upload-docs-to-drive.js"
Cohesion: 0.09
Nodes (22): API & network quirks (Google Apps Script), Architecture, Commands, Design & product constraints, Layout & source of truth, Rule Sinkronisasi Graph, API & network quirks (Google Apps Script), Architecture (+14 more)

### Community 2 - "Code.gs"
Cohesion: 0.08
Nodes (23): ALAMAT_HEADERS, ALLOWED_RUNNING_TEXT_FONTS, authenticateUser(), DEFAULT_HERO_CARD, DEFAULT_METODE, DEFAULT_PROGRAM, DEFAULT_RUNNING_TEXT, DEFAULT_SLIDESHOW (+15 more)

### Community 3 - "doPost"
Cohesion: 0.09
Nodes (28): checkLoginRateLimit(), clearAllServerCaches(), clearLoginAttempts(), doPost(), fetchSuratMerokokTemplateBlob_(), generateGaleriId(), generateSaranId(), getTelegramHookSecret_() (+20 more)

### Community 4 - "asset/prd.md"
Cohesion: 0.10
Nodes (19): 1. Problem Statements, 2. Goals & Success Metrics, 3. Target Users, 4. User Stories, 5.1 Alur Utama: Melakukan Booking (Happy Path), 5.2 Alur Alternatif: Cek Status Booking, 5. User Flow, 6. Functional Requirements (+11 more)

### Community 5 - "prd.md"
Cohesion: 0.10
Nodes (19): 1. Problem Statements, 2. Goals & Success Metrics, 3. Target Users, 4. User Stories, 5.1 Alur Utama: Melakukan Booking (Happy Path), 5.2 Alur Alternatif: Cek Status Booking, 5. User Flow, 6. Functional Requirements (+11 more)

### Community 6 - "handleTelegramWebhookUpdate_"
Cohesion: 0.23
Nodes (20): buildWaReminderText_(), buildWaSambutanText_(), cleanPhoneForWa_(), escapeTelegramHtml_(), formatBackupSizeText_(), formatBookingDetailTelegram_(), formatIndonesianDateStr_(), formatJamDisplay_() (+12 more)

### Community 7 - "doGet"
Cohesion: 0.24
Nodes (18): checkAndSendUpcomingReminders_(), cleanPhoneNumber(), doGet(), ensureBookingColumns_(), findBookingForTelegram_(), formatDisplayPhone(), generateKunjunganRegister_(), generateUniqueBookingId() (+10 more)

### Community 8 - "with"
Cohesion: 0.13
Nodes (14): runs-on, steps, jobs, build_and_deploy, name, branches, uses, with (+6 more)

### Community 9 - "handleSyncAdminData"
Cohesion: 0.24
Nodes (13): createJsonResponse(), getChunkedCache(), getGaleriSheet(), getSaranSheet(), handleSyncAdminData(), putChunkedCache(), readGaleriFromSheet(), readJumatBerkahFromSheet() (+5 more)

### Community 10 - "package.json"
Cohesion: 0.17
Nodes (12): description, devDependencies, playwright@^1.64.0, @playwright/test@^1.64.0, name, scripts, serve, serve:asset (+4 more)

### Community 11 - "checkUpcomingKhitanReminders"
Cohesion: 0.29
Nodes (12): checkUpcomingKhitanReminders(), executeDatabaseBackup_(), maybeRunMonthlyBackup_(), testMonthlyBackupNow(), 9.1 Panduan Setup Time-Driven Trigger Pengingat Jadwal (< 12 Jam) di Google Apps Script, 9.2 Sistem Peringatan & Backup Otomatis Seluruh Sheet (Tanggal 01 Pukul 08:00 WIB), 9.3 Sistem Kuota Jam Khitan & Peringatan Kapasitas Pasien, 9. Panduan Operasional & Integrasi (+4 more)

### Community 12 - "appsscript.json"
Cohesion: 0.22
Nodes (8): dependencies, exceptionLogging, oauthScopes, runtimeVersion, timeZone, webapp, access, executeAs

### Community 13 - "jumatBerkahObjectToRow_"
Cohesion: 0.50
Nodes (5): calculateUsiaTahun_(), jumatBerkahObjectToRow_(), kunjunganObjectToRow_(), sanitizeSpreadsheetFormula(), toProperCase_()

### Community 14 - "readAndWarmAlamatOptions"
Cohesion: 0.50
Nodes (5): getAlamatSheet(), readAlamatOptions(), readAndWarmAlamatOptions(), safePutAllCache(), warmAlamatProvince()

### Community 15 - "getJumatBerkahSheet"
Cohesion: 0.67
Nodes (3): generateJumatBerkahRegister_(), getJumatBerkahSheet(), writeJumatBerkahRowsToSheet_()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doPost()` connect `doPost` to `upload-docs-to-drive.js`, `Code.gs`, `handleTelegramWebhookUpdate_`, `doGet`, `handleSyncAdminData`, `checkUpcomingKhitanReminders`, `jumatBerkahObjectToRow_`, `getJumatBerkahSheet`?**
  _High betweenness centrality (0.312) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `doPost()` (e.g. with `Architecture` and `Architecture`) actually correct?**
  _`doPost()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.09581646423751687 - nodes in this community are weakly interconnected._
- **Why does `Architecture` connect `upload-docs-to-drive.js` to `doPost`, `doGet`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `doGet()` (e.g. with `Architecture` and `Architecture`) actually correct?**
  _`doGet()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `upload-docs-to-drive.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._
- **Should `Code.gs` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._