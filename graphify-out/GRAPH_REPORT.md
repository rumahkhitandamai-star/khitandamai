# Graph Report - khitandamai.my.id  (2026-10-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 304 nodes · 681 edges · 17 communities (16 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aa16c70c`
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
- normalizeYmd_
- getKunjunganSheet

## God Nodes (most connected - your core abstractions)
1. `doPost()` - 81 edges
2. `doGet()` - 42 edges
3. `@playwright/test` - 42 edges
4. `handleTelegramWebhookUpdate_()` - 25 edges
5. `handleSyncAdminData()` - 19 edges
6. `normalizeYmd_()` - 16 edges
7. `readSettings()` - 14 edges
8. `getSheet()` - 13 edges
9. `getSpreadsheet_()` - 12 edges
10. `sendTelegramReminderNotification_()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Commands` --references--> `main()`  [INFERRED]
  AGENTS.md → scripts/upload-docs-to-drive.js
- `Commands` --references--> `main()`  [INFERRED]
  asset/AGENTS.md → scripts/upload-docs-to-drive.js
- `Architecture` --references--> `doGet()`  [INFERRED]
  AGENTS.md → asset/Code.gs
- `Architecture` --references--> `doPost()`  [INFERRED]
  AGENTS.md → asset/Code.gs
- `9.1 Panduan Setup Time-Driven Trigger Pengingat Jadwal (< 12 Jam) di Google Apps Script` --references--> `checkUpcomingKhitanReminders()`  [INFERRED]
  prd.md → asset/Code.gs

## Import Cycles
- None detected.

## Communities (17 total, 1 thin omitted)

### Community 1 - "upload-docs-to-drive.js"
Cohesion: 0.07
Nodes (27): ALAMAT_HEADERS, ALLOWED_RUNNING_TEXT_FONTS, DEFAULT_HERO_CARD, DEFAULT_METODE, DEFAULT_PROGRAM, DEFAULT_RUNNING_TEXT, DEFAULT_SLIDESHOW, DEFAULT_TESTIMONI (+19 more)

### Community 2 - "Code.gs"
Cohesion: 0.09
Nodes (22): API & network quirks (Google Apps Script), Architecture, Commands, Design & product constraints, Layout & source of truth, Rule Sinkronisasi Graph, API & network quirks (Google Apps Script), Architecture (+14 more)

### Community 3 - "doPost"
Cohesion: 0.18
Nodes (28): answerTelegramCallbackQuery_(), buildWaReminderInlineKeyboard_(), buildWaReminderText_(), buildWaSambutanText_(), checkAndSendUpcomingReminders_(), cleanPhoneForWa_(), cleanPhoneNumber(), ensureBookingColumns_() (+20 more)

### Community 4 - "asset/prd.md"
Cohesion: 0.16
Nodes (27): computeDatasetVersion_(), createJsonResponse(), doGet(), fetchSuratMerokokTemplateBlob_(), formatDisplayPhone(), getChunkedCache(), getSaranSheet(), getStoredDatasetVersions_() (+19 more)

### Community 5 - "prd.md"
Cohesion: 0.12
Nodes (20): checkLoginRateLimit(), clearLoginAttempts(), doPost(), generateGaleriId(), generateJumatBerkahRegister_(), generateSaranId(), getJumatBerkahSheet(), getTelegramHookSecret_() (+12 more)

### Community 6 - "handleTelegramWebhookUpdate_"
Cohesion: 0.10
Nodes (19): 1. Problem Statements, 2. Goals & Success Metrics, 3. Target Users, 4. User Stories, 5.1 Alur Utama: Melakukan Booking (Happy Path), 5.2 Alur Alternatif: Cek Status Booking, 5. User Flow, 6. Functional Requirements (+11 more)

### Community 7 - "doGet"
Cohesion: 0.10
Nodes (19): 1. Problem Statements, 2. Goals & Success Metrics, 3. Target Users, 4. User Stories, 5.1 Alur Utama: Melakukan Booking (Happy Path), 5.2 Alur Alternatif: Cek Status Booking, 5. User Flow, 6. Functional Requirements (+11 more)

### Community 8 - "with"
Cohesion: 0.13
Nodes (14): runs-on, steps, jobs, build_and_deploy, name, branches, uses, with (+6 more)

### Community 9 - "handleSyncAdminData"
Cohesion: 0.26
Nodes (13): checkUpcomingKhitanReminders(), executeDatabaseBackup_(), maybeRunMonthlyBackup_(), pruneOldBackups_(), testMonthlyBackupNow(), 9.1 Panduan Setup Time-Driven Trigger Pengingat Jadwal (< 12 Jam) di Google Apps Script, 9.2 Sistem Peringatan & Backup Otomatis Seluruh Sheet (Tanggal 01 Pukul 08:00 WIB), 9.3 Sistem Kuota Jam Khitan & Peringatan Kapasitas Pasien (+5 more)

### Community 10 - "package.json"
Cohesion: 0.17
Nodes (12): description, devDependencies, playwright@^1.64.0, @playwright/test@^1.64.0, name, scripts, serve, serve:asset (+4 more)

### Community 11 - "checkUpcomingKhitanReminders"
Cohesion: 0.22
Nodes (8): dependencies, exceptionLogging, oauthScopes, runtimeVersion, timeZone, webapp, access, executeAs

### Community 12 - "appsscript.json"
Cohesion: 0.22
Nodes (9): getKuotaJamSummary_(), getReferensiSheet(), readReferensiOptions(), readSettings(), sanitizeHeroCard(), sanitizeMetode(), sanitizeProgram(), sanitizeSlideshow() (+1 more)

### Community 13 - "jumatBerkahObjectToRow_"
Cohesion: 0.29
Nodes (8): authenticateUser(), getGaleriSheet(), getJakartaTimestamp(), getSettingsSheet(), getSpreadsheet_(), getUsersSheet(), testSendTelegramAlert(), verifyPassword()

### Community 14 - "readAndWarmAlamatOptions"
Cohesion: 0.29
Nodes (8): clearAllServerCaches(), clearHistorySheet_(), deleteBookingRowById_(), getHistorySheet_(), invalidateDataset_(), logHistory_(), readHistoryFromSheet_(), removeChunkedCache()

### Community 15 - "normalizeYmd_"
Cohesion: 0.53
Nodes (6): calculateUsiaTahun_(), jumatBerkahObjectToRow_(), kunjunganObjectToRow_(), normalizeYmd_(), sanitizeSpreadsheetFormula(), toProperCase_()

### Community 16 - "getKunjunganSheet"
Cohesion: 0.67
Nodes (3): generateKunjunganRegister_(), getKunjunganSheet(), writeKunjunganRowsToSheet_()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doPost()` connect `prd.md` to `upload-docs-to-drive.js`, `Code.gs`, `doPost`, `asset/prd.md`, `handleSyncAdminData`, `appsscript.json`, `jumatBerkahObjectToRow_`, `readAndWarmAlamatOptions`, `normalizeYmd_`, `getKunjunganSheet`?**
  _High betweenness centrality (0.308) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `doPost()` (e.g. with `Architecture` and `Architecture`) actually correct?**
  _`doPost()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._
- **Why does `Architecture` connect `Code.gs` to `asset/prd.md`, `prd.md`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `doGet()` (e.g. with `Architecture` and `Architecture`) actually correct?**
  _`doGet()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `upload-docs-to-drive.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07258064516129033 - nodes in this community are weakly interconnected._
- **Should `Code.gs` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._