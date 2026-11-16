# Graph Report - khitandamai.my.id  (2026-10-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 375 nodes · 910 edges · 20 communities (19 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f17c8cf9`
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
- getSpreadsheet_
- readAndWarmAlamatOptions
- createJsonResponse
- setTelegramWebhookUrl_

## God Nodes (most connected - your core abstractions)
1. `doPost()` - 87 edges
2. `doGet()` - 53 edges
3. `handleTelegramWebhookUpdate_()` - 43 edges
4. `@playwright/test` - 43 edges
5. `escapeTelegramHtml_()` - 21 edges
6. `normalizeYmd_()` - 21 edges
7. `handleSyncAdminData()` - 20 edges
8. `getTelegramConfig_()` - 18 edges
9. `rescheduleBookingFromTelegram_()` - 16 edges
10. `getSheet()` - 16 edges

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

## Communities (20 total, 1 thin omitted)

### Community 1 - "upload-docs-to-drive.js"
Cohesion: 0.14
Nodes (43): answerTelegramCallbackQuery_(), buildBookingActionInlineKeyboard_(), buildSchedulePaginationKeyboard_(), buildWaReminderInlineKeyboard_(), buildWaReminderText_(), buildWaSambutanText_(), buildWaTrackingUrl_(), cancelBookingFromTelegram_() (+35 more)

### Community 2 - "Code.gs"
Cohesion: 0.06
Nodes (35): ALAMAT_HEADERS, ALLOWED_RUNNING_TEXT_FONTS, authenticateUser(), buildPatientActionInlineKeyboard_(), DEFAULT_FAQ, DEFAULT_HERO_CARD, DEFAULT_METODE, DEFAULT_PROGRAM (+27 more)

### Community 3 - "doPost"
Cohesion: 0.10
Nodes (22): API & network quirks (Google Apps Script), Architecture, Commands, Design & product constraints, Layout & source of truth, Rule Sinkronisasi Graph, API & network quirks (Google Apps Script), Architecture (+14 more)

### Community 4 - "asset/prd.md"
Cohesion: 0.17
Nodes (27): computeDatasetVersion_(), doGet(), fetchSuratMerokokTemplateBlob_(), formatDisplayPhone(), getChunkedCache(), getKuotaCacheVersion_(), getKuotaJamSummary_(), getSaranSheet() (+19 more)

### Community 5 - "prd.md"
Cohesion: 0.10
Nodes (26): checkLoginRateLimit(), clearLoginAttempts(), doPost(), generateGaleriId(), generateJumatBerkahRegister_(), generateSaranId(), getJumatBerkahSheet(), issueSessionToken() (+18 more)

### Community 6 - "handleTelegramWebhookUpdate_"
Cohesion: 0.15
Nodes (21): authorizeGmailAccess(), checkGoogleReviewsAndNotify_(), checkGoogleReviewsTrigger(), checkUpcomingKhitanReminders(), diagnoseGoogleReviews_(), ensureAutomaticTriggers_(), executeDatabaseBackup_(), fetchGoogleMapsReviewsRealtime_() (+13 more)

### Community 7 - "doGet"
Cohesion: 0.10
Nodes (19): 1. Problem Statements, 2. Goals & Success Metrics, 3. Target Users, 4. User Stories, 5.1 Alur Utama: Melakukan Booking (Happy Path), 5.2 Alur Alternatif: Cek Status Booking, 5. User Flow, 6. Functional Requirements (+11 more)

### Community 8 - "with"
Cohesion: 0.10
Nodes (19): 1. Problem Statements, 2. Goals & Success Metrics, 3. Target Users, 4. User Stories, 5.1 Alur Utama: Melakukan Booking (Happy Path), 5.2 Alur Alternatif: Cek Status Booking, 5. User Flow, 6. Functional Requirements (+11 more)

### Community 9 - "handleSyncAdminData"
Cohesion: 0.12
Nodes (15): name, runs-on, steps, jobs, check_reviews, name, cron, name (+7 more)

### Community 10 - "package.json"
Cohesion: 0.13
Nodes (14): runs-on, steps, jobs, build_and_deploy, name, branches, uses, with (+6 more)

### Community 11 - "checkUpcomingKhitanReminders"
Cohesion: 0.17
Nodes (12): description, devDependencies, playwright@^1.64.0, @playwright/test@^1.64.0, name, scripts, serve, serve:asset (+4 more)

### Community 12 - "appsscript.json"
Cohesion: 0.25
Nodes (11): calculateUsiaTahun_(), ensureBookingColumns_(), generateUniqueBookingId(), getSheet(), getUpcomingBookingsGroupedByDate_(), jumatBerkahObjectToRow_(), kunjunganObjectToRow_(), normalizeYmd_() (+3 more)

### Community 13 - "jumatBerkahObjectToRow_"
Cohesion: 0.33
Nodes (9): fetchGasProcessedIds(), doGet(), fetchReviews(), main(), recordReviewInGas(), doGet(), sendTelegramNotification(), triggerGasPoll() (+1 more)

### Community 14 - "readAndWarmAlamatOptions"
Cohesion: 0.24
Nodes (10): bumpKuotaCacheVersion_(), clearAllServerCaches(), clearHistorySheet_(), deleteBookingRowById_(), getHistorySheet_(), invalidateDataset_(), invalidateReferensiCache_(), logHistory_() (+2 more)

### Community 15 - "normalizeYmd_"
Cohesion: 0.22
Nodes (8): dependencies, exceptionLogging, oauthScopes, runtimeVersion, timeZone, webapp, access, executeAs

### Community 16 - "getSpreadsheet_"
Cohesion: 0.29
Nodes (7): generateKunjunganRegister_(), getGaleriSheet(), getKunjunganSheet(), getReferensiSheet(), getSpreadsheet_(), readReferensiOptions(), writeKunjunganRowsToSheet_()

### Community 17 - "readAndWarmAlamatOptions"
Cohesion: 0.50
Nodes (5): getAlamatSheet(), readAlamatOptions(), readAndWarmAlamatOptions(), safePutAllCache(), warmAlamatProvince()

### Community 18 - "createJsonResponse"
Cohesion: 0.67
Nodes (3): createJsonResponse(), handleForgotPassword(), unauthorizedResponse()

### Community 19 - "setTelegramWebhookUrl_"
Cohesion: 1.00
Nodes (3): ensureTelegramWebhookRegistered_(), getTelegramHookSecret_(), setTelegramWebhookUrl_()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doPost()` connect `prd.md` to `upload-docs-to-drive.js`, `Code.gs`, `doPost`, `asset/prd.md`, `handleTelegramWebhookUpdate_`, `appsscript.json`, `readAndWarmAlamatOptions`, `getSpreadsheet_`, `createJsonResponse`, `setTelegramWebhookUrl_`?**
  _High betweenness centrality (0.255) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `doPost()` (e.g. with `Architecture` and `Architecture`) actually correct?**
  _`doPost()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.08502415458937199 - nodes in this community are weakly interconnected._
- **Why does `Architecture` connect `doPost` to `asset/prd.md`, `prd.md`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `doGet()` (e.g. with `Architecture` and `Architecture`) actually correct?**
  _`doGet()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `upload-docs-to-drive.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14482029598308668 - nodes in this community are weakly interconnected._
- **Should `Code.gs` be split into smaller, more focused modules?**
  _Cohesion score 0.05897435897435897 - nodes in this community are weakly interconnected._