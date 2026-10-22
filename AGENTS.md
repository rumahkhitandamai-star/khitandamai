# AGENTS.md

## Project Context
- **Current Layout**: Working source files reside in `asset/` (`asset/Index.html`, `asset/Code.gs`, `asset/prd.md`).
- **Target Deployment Layout**: `public/index.html` (frontend SPA) and `backend/Code.gs` (CLASP GAS project).
- **Architecture**: Single-file SPA (HTML5 + Vue 3 CDN + Tailwind CSS CDN) backed by Google Apps Script (GAS) REST API & Google Sheets.

## Critical Architectural Constraints
- **Single-File Frontend**: All templates, styles, Vue components (inline JS objects), routing, and logic MUST remain in one file (`Index.html` / `public/index.html`). Never split into separate `.js`, `.css`, or `.vue` files.
- **No Bundler/Build Tools**: Strictly NO Vite, Webpack, PostCSS, React, Angular, or Node dev server.
- **Routing**: Pure client-side hash routing (`#/path`) without page reloads.
- **Design & UI**: Mobile-first viewport (360–430px), Primary Tosca (`#008080`), sticky bottom navigation.
- **Privacy Rule**: Phone numbers in booking lookup results must be partially masked (`0812****1234`).

## Development & Preview Commands
- **Local Preview**: Static file server only (do NOT use `npm run dev`):
  ```bash
  npx serve asset
  # or when target layout is populated:
  firebase serve
  ```
- **Backend Sync (GAS / CLASP) & Docs Sync**:
  - Script ID (GDrive Target Folder): `1kQELrNR8XG8ukJYxJOI74uv3n9SPvw_uveBpesLi-eslPo2b49b6J7_A` (Folder: `1I9j4MFkWThgt4ml_H5vtXcU_6mCoiZe-`)
    - Database Spreadsheet ID: `1j4oUNDspniMA-rEHrRis6RprLIip63UTCluqeU2YiuA` (Sheets: `BOOKING`, `USERS`, `KUNJUNGAN`)
    - Target Documentation Folder: `1uYsc5PERl_KHx5SJaiUyUxt09Ozsxb_0` (Folder "Asset")
  ```bash
  npx @google/clasp push --force
  npx @google/clasp deploy --deploymentId AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs --description "Update"
  node scripts/upload-docs-to-drive.js
  ```
  - **Mandatory Docs Sync**: SETIAP KALI melakukan push/deploy ke GAS (`clasp push` / `clasp deploy`), WAJIB menjalankan `node scripts/upload-docs-to-drive.js` (atau `npm run sync:docs`) untuk mengunggah / memperbarui berkas `asset/AGENTS.md` dan `asset/prd.md` ke folder Google Drive `1uYsc5PERl_KHx5SJaiUyUxt09Ozsxb_0`.
- **Firebase Deploy**:
  ```bash
  firebase deploy --only hosting
  ```

## API & Network Quirks (Google Apps Script)
- **Native `fetch()` Only**: Do not use Axios or jQuery.
- **Redirects**: Always pass `{ redirect: 'follow' }` on fetch calls because GAS Web App endpoints issue 302 redirects.
- **CORS Bypass on POST**: Send POST requests with header `'Content-Type': 'text/plain;charset=utf-8'` and stringified body `JSON.stringify(payload)`. GAS blocks standard `application/json` preflight (OPTIONS) requests.
- **GAS Output Format**: `Code.gs` must return responses via:
  `ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);`
- **Manifest `appsscript.json`**: Field webapp MUST be lowercase `"webapp"` with `"access": "ANYONE_ANONYMOUS"` and `"executeAs": "USER_DEPLOYING"`. Do not use camelCase `webApp`.
- **Offline Mocking**: Set `const USE_MOCK = true` in `Index.html` to bypass network calls and test locally against `LOCAL_MOCK_DATABASE`.

## Testing & Quality Control (Playwright)
- **QC Verification**:
  ```bash
  npm install -D @playwright/test
  npx playwright install
  npx playwright test <test-file>.spec.js --headed
  ```
- **Playwright Flag Warning**: NEVER pass `--ui` flag to Playwright; it hangs CLI/agent environments indefinitely.
