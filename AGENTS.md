# AGENTS.md

## Layout & source of truth
- **Edit only in `asset/`**: `asset/Index.html` (whole frontend), `asset/Code.gs` (GAS backend),
  `asset/appsscript.json`, `asset/prd.md`, `asset/AGENTS.md`.
- `backend/` and `public/` are byte-identical mirrors. There is NO sync script — copy manually
  after every edit:
  ```powershell
  Copy-Item asset\Code.gs            backend\Code.gs -Force
  Copy-Item asset\Index.html         backend\Index.html -Force
  Copy-Item asset\appsscript.json    backend\appsscript.json -Force
  Copy-Item asset\Index.html         public\index.html -Force
  ```
- Forgetting a mirror breaks real workflows: `.clasp.json` pushes `rootDir: backend`, `firebase.json`
  deploys `public/`, and 2 of 30 specs (`admin-hero-card-setting`, `check-dark-mode-contrast`) load
  `../public/index.html` while the other 28 load `../asset/Index.html`.
- Root `AGENTS.md` is the master; `sync:docs` uploads **`asset/AGENTS.md`** and `asset/prd.md`, so copy
  root `AGENTS.md` → `asset/AGENTS.md` before syncing docs. Root `prd.md` must stay identical to `asset/prd.md`.
- `wrapper/index.html` + `firebase.wrapper.json`: separate loader page that iframes the GAS `/exec` URL
  for the custom domain, deployed with its own Firebase config.

## Architecture
- Single-file SPA: HTML5 + Vue 3 CDN + Tailwind CDN; all templates, styles, components, routing and
  logic live inside `asset/Index.html` (~2.7 MB). Hard rule: NO bundler/build tools (Vite, Webpack,
  PostCSS, React, Angular, Node dev server) and never split into separate `.js`/`.css`/`.vue` files.
- Client-side hash routing `#/path` only — no page reloads.
- Backend: GAS `doGet`/`doPost` in `asset/Code.gs` over Sheets (`BOOKING`, `USERS`, `KUNJUNGAN`,
  `SETTINGS`), plus a Telegram bot webhook and hourly reminder triggers (manual setup steps in
  `prd.md` §9.1).
- `GAS_ENDPOINT_URL` is hardcoded in `asset/Index.html` (~line 11642) and `wrapper/index.html` as
  `/macros/s/<deploymentId>/exec`. It must match the `clasp deploy --deploymentId ...` value below;
  deploying a new deployment ID means updating both URLs.

## Commands
- Preview (static server only, never `npm run dev`): `npm run serve` (= `npx serve public`) or
  `npm run serve:asset`.
- Tests: `npx playwright test` (config: `testDir: ./tests`, `workers: 1`). One file:
  `npx playwright test tests/whatsapp-fab.spec.js` (add `--headed` to watch).
  - First run: `npm install` + `npx playwright install`.
  - Tests open the app via `file://` URLs and stub GAS with `page.route(/script\.google\.com/)` —
    no dev server, no network, no Google login needed.
  - **NEVER pass `--ui`** to Playwright; it hangs CLI/agent environments indefinitely.
  - `npm run test:qc` runs `qc-test.spec.js`, which is gitignored and usually absent — use `npx playwright test`.
  - Many spec files (and `asset/Code.gs`, `prd.md`, `AGENTS.md`) have the Windows *Hidden* attribute:
    `Get-ChildItem` / `Select-String -Path tests\*.spec.js` silently under-report them (only 6 of 30 show).
    Use `-Force`, or glob/ripgrep, to see the whole suite.
- Backend deploy (mirror first, then):
  ```bash
  npx @google/clasp push --force
  npx @google/clasp deploy --deploymentId AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs --description "Update"
  node scripts/upload-docs-to-drive.js   # atau: npm run sync:docs
  ```
  - Script ID `1kQELrNR8XG8ukJYxJOI74uv3n9SPvw_uveBpesLi-eslPo2b49b6J7_A` (folder `1I9j4MFkWThgt4ml_H5vtXcU_6mCoiZe-`);
    Spreadsheet `1j4oUNDspniMA-rEHrRis6RprLIip63UTCluqeU2YiuA`; docs Drive folder `1uYsc5PERl_KHx5SJaiUyUxt09Ozsxb_0`.
  - **Mandatory**: SETIAP KALI `clasp push` / `clasp deploy`, WAJIB jalankan `npm run sync:docs` untuk
    mengunggah `asset/AGENTS.md` dan `asset/prd.md` ke folder Drive `1uYsc5PERl_KHx5SJaiUyUxt09Ozsxb_0`.
    Script reads `~/.clasprc.json` — run `npx @google/clasp login` if missing.
- Firebase: `firebase deploy --only hosting` (site `rumahkhitandamai`, project `khitandamai-9c7bf`).
  A push to `main` also auto-deploys live via `.github/workflows/deploy.yml`, and CI runs **no tests** —
  run Playwright locally before pushing.

## API & network quirks (Google Apps Script)
- **Native `fetch()` only**: never Axios or jQuery.
- **Redirects**: always pass `{ redirect: 'follow' }` (GAS web apps 302-redirect).
- **CORS bypass on POST**: header `'Content-Type': 'text/plain;charset=utf-8'` + `JSON.stringify(payload)`;
  GAS blocks `application/json` preflight.
- **Output format**: `ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);`
- **Manifest `appsscript.json`**: lowercase `"webapp"` key with `"access": "ANYONE_ANONYMOUS"` and
  `"executeAs": "USER_DEPLOYING"` — never camelCase `webApp`.
- **Offline mocking**: `const USE_MOCK = false;` in `asset/Index.html` (~line 11641); set `true` to test
  against `LOCAL_MOCK_DATABASE` without network.

## Design & product constraints
- Mobile-first 360–430 px, Primary Tosca `#008080` (`tailwind.config` `tosca.700`), sticky bottom navigation.
- Phone numbers in booking lookup results must be masked (`0812****1234`).

## Rule Sinkronisasi Graph
- Jika kamu selesai melakukan refactoring atau menambahkan modul/file baru, jalankan perintah terminal: `graphify .`
- Pastikan perubahan node pada `graphify-out/graph.json` digunakan sebagai referensi untuk task berikutnya.
