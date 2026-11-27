# Graph Report - khitandamai.my.id  (2026-11-27)

## Corpus Check
- 61 files · ~214,230 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .xml 1)

## Summary
- 419 nodes · 1048 edges · 21 communities (20 shown, 1 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8218f135`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @playwright/test
- upload-docs-to-drive.js
- Code.gs
- upload-docs-to-drive.js
- asset/prd.md
- prd.md
- handleTelegramWebhookUpdate_
- doGet
- with
- jumatBerkahObjectToRow_
- package.json
- checkUpcomingKhitanReminders
- appsscript.json
- antigravity.ps1
- AGENTS.md
- normalizeYmd_
- getSpreadsheet_
- sendTelegramBookingNotification_
- invalidateDataset_
- asset/AGENTS.md
- setTelegramWebhookUrl_

## God Nodes (most connected - your core abstractions)
1. `doPost()` - 89 edges
2. `doGet()` - 53 edges
3. `@playwright/test` - 47 edges
4. `handleTelegramWebhookUpdate_()` - 46 edges
5. `escapeTelegramHtml_()` - 25 edges
6. `normalizeYmd_()` - 21 edges
7. `handleSyncAdminData()` - 20 edges
8. `getTelegramConfig_()` - 18 edges
9. `rescheduleBookingFromTelegram_()` - 16 edges
10. `getSheet()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Architecture` --references--> `doPost()`  [INFERRED]
  AGENTS.md → asset/Code.gs
- `9.4 Peningkatan Bot Telegram (@khitandamai_bot) & Keamanan Backend` --references--> `doPost()`  [INFERRED]
  prd.md → asset/Code.gs
- `9.5 Integrasi Notifikasi Google Review ke Bot Telegram Admin` --references--> `getAdminTelegramChatIds_()`  [INFERRED]
  prd.md → asset/Code.gs
- `9.1 Panduan Setup Time-Driven Trigger Pengingat Jadwal (< 12 Jam) di Google Apps Script` --references--> `checkUpcomingKhitanReminders()`  [INFERRED]
  prd.md → asset/Code.gs
- `9.6 Peningkatan Lanjutan Bot Telegram (@khitandamai_bot): Pagination, Pengingat Pasien, Aftercare, & Layanan Mandiri` --references--> `checkUpcomingKhitanReminders()`  [INFERRED]
  prd.md → asset/Code.gs

## Import Cycles
- None detected.

## Communities (21 total, 1 thin omitted)

### Community 0 - "@playwright/test"
Cohesion: 0.11
Nodes (59): answerTelegramCallbackQuery_(), buildBookingActionInlineKeyboard_(), buildSchedulePaginationKeyboard_(), buildTelegramEvaluasiCombinedResponse_(), buildTelegramEvaluasiDailyDigest_(), buildTelegramEvaluasiH1Response_(), buildTelegramEvaluasiH2Response_(), buildWaEvaluasiH2Text_() (+51 more)

### Community 2 - "Code.gs"
Cohesion: 0.06
Nodes (33): ALAMAT_HEADERS, ALLOWED_RUNNING_TEXT_FONTS, buildPatientActionInlineKeyboard_(), computeDatasetVersion_(), DEFAULT_FAQ, DEFAULT_HERO_CARD, DEFAULT_METODE, DEFAULT_PROGRAM (+25 more)

### Community 3 - "upload-docs-to-drive.js"
Cohesion: 0.15
Nodes (19): fetchGasProcessedIds(), doGet(), fetchReviews(), main(), recordReviewInGas(), doGet(), sendTelegramNotification(), triggerGasPoll() (+11 more)

### Community 4 - "asset/prd.md"
Cohesion: 0.09
Nodes (30): checkLoginRateLimit(), clearLoginAttempts(), doPost(), fetchSuratMerokokTemplateBlob_(), generateGaleriId(), generateJumatBerkahRegister_(), generateSaranId(), generateUniqueBookingId() (+22 more)

### Community 5 - "prd.md"
Cohesion: 0.13
Nodes (26): authorizeGmailAccess(), checkGoogleReviewsAndNotify_(), checkGoogleReviewsTrigger(), checkUpcomingKhitanReminders(), diagnoseGoogleReviews_(), ensureAutomaticTriggers_(), executeDatabaseBackup_(), fetchGoogleMapsReviewsRealtime_() (+18 more)

### Community 6 - "handleTelegramWebhookUpdate_"
Cohesion: 0.27
Nodes (20): createJsonResponse(), doGet(), formatDisplayPhone(), getChunkedCache(), getUserRole_(), handleSyncAdminData(), maskPhoneNumber(), putChunkedCache() (+12 more)

### Community 7 - "doGet"
Cohesion: 0.10
Nodes (19): 1. Problem Statements, 2. Goals & Success Metrics, 3. Target Users, 4. User Stories, 5.1 Alur Utama: Melakukan Booking (Happy Path), 5.2 Alur Alternatif: Cek Status Booking, 5. User Flow, 6. Functional Requirements (+11 more)

### Community 8 - "with"
Cohesion: 0.10
Nodes (19): 1. Problem Statements, 2. Goals & Success Metrics, 3. Target Users, 4. User Stories, 5.1 Alur Utama: Melakukan Booking (Happy Path), 5.2 Alur Alternatif: Cek Status Booking, 5. User Flow, 6. Functional Requirements (+11 more)

### Community 9 - "jumatBerkahObjectToRow_"
Cohesion: 0.50
Nodes (5): calculateUsiaTahun_(), jumatBerkahObjectToRow_(), kunjunganObjectToRow_(), sanitizeSpreadsheetFormula(), toProperCase_()

### Community 10 - "package.json"
Cohesion: 0.12
Nodes (15): name, runs-on, steps, jobs, check_reviews, name, cron, name (+7 more)

### Community 11 - "checkUpcomingKhitanReminders"
Cohesion: 0.13
Nodes (14): runs-on, steps, jobs, build_and_deploy, name, branches, uses, with (+6 more)

### Community 12 - "appsscript.json"
Cohesion: 0.15
Nodes (13): description, devDependencies, playwright@^1.64.0, @playwright/test@^1.64.0, name, scripts, agy, serve (+5 more)

### Community 13 - "antigravity.ps1"
Cohesion: 0.25
Nodes (19): Cmd-Ask(), Cmd-Convos(), Cmd-Metadata(), Cmd-Send(), Cmd-Status(), Cmd-Transcript(), ConvertTo-StepView(), Get-AntigravityHub() (+11 more)

### Community 14 - "AGENTS.md"
Cohesion: 0.22
Nodes (7): Antigravity bridge (opsional), API & network quirks (Google Apps Script), Architecture, Commands, Design & product constraints, Layout & source of truth, Rule Sinkronisasi Graph

### Community 15 - "normalizeYmd_"
Cohesion: 0.22
Nodes (8): dependencies, exceptionLogging, oauthScopes, runtimeVersion, timeZone, webapp, access, executeAs

### Community 16 - "getSpreadsheet_"
Cohesion: 0.22
Nodes (9): ensureKunjunganColumns_(), generateKunjunganRegister_(), getGaleriSheet(), getKunjunganSheet(), getReferensiSheet(), getSaranSheet(), getSpreadsheet_(), readReferensiOptions() (+1 more)

### Community 17 - "sendTelegramBookingNotification_"
Cohesion: 0.22
Nodes (10): authenticateUser(), getJakartaTimestamp(), getSettingsSheet(), getUsersSheet(), handleForgotPassword(), sendEmailGoogleReviewNotification_(), sendTelegramBookingNotification_(), testSendGoogleReviewEmail() (+2 more)

### Community 18 - "invalidateDataset_"
Cohesion: 0.20
Nodes (12): bumpKuotaCacheVersion_(), clearAllServerCaches(), clearHistorySheet_(), deleteBookingRowById_(), getHistorySheet_(), getStoredDatasetVersions_(), invalidateDataset_(), invalidateReferensiCache_() (+4 more)

### Community 19 - "asset/AGENTS.md"
Cohesion: 0.22
Nodes (7): Antigravity bridge (opsional), API & network quirks (Google Apps Script), Architecture, Commands, Design & product constraints, Layout & source of truth, Rule Sinkronisasi Graph

### Community 20 - "setTelegramWebhookUrl_"
Cohesion: 1.00
Nodes (3): ensureTelegramWebhookRegistered_(), getTelegramHookSecret_(), setTelegramWebhookUrl_()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doPost()` connect `asset/prd.md` to `@playwright/test`, `Code.gs`, `prd.md`, `handleTelegramWebhookUpdate_`, `jumatBerkahObjectToRow_`, `AGENTS.md`, `getSpreadsheet_`, `sendTelegramBookingNotification_`, `invalidateDataset_`, `asset/AGENTS.md`, `setTelegramWebhookUrl_`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `doPost()` (e.g. with `Architecture` and `Architecture`) actually correct?**
  _`doPost()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.11242937853107345 - nodes in this community are weakly interconnected._
- **Why does `9. Panduan Operasional & Integrasi` connect `prd.md` to `with`, `@playwright/test`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `upload-docs-to-drive.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07918367346938776 - nodes in this community are weakly interconnected._
- **Why does `9. Panduan Operasional & Integrasi` connect `prd.md` to `@playwright/test`, `doGet`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Code.gs` be split into smaller, more focused modules?**
  _Cohesion score 0.059743954480796585 - nodes in this community are weakly interconnected._