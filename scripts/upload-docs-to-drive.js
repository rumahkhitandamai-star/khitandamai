/**
 * Script untuk mengunggah / menyinkronkan berkas dokumentasi proyek
 * (asset/AGENTS.md dan asset/prd.md) ke Google Drive Folder Target:
 * https://drive.google.com/drive/folders/1uYsc5PERl_KHx5SJaiUyUxt09Ozsxb_0
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const TARGET_FOLDER_ID = '1uYsc5PERl_KHx5SJaiUyUxt09Ozsxb_0';
const FILES_TO_UPLOAD = [
  { localPath: path.resolve('asset/AGENTS.md'), driveName: 'AGENTS.md' },
  { localPath: path.resolve('asset/prd.md'), driveName: 'prd.md' }
];

function getClaspTokenPath() {
  return path.join(os.homedir(), '.clasprc.json');
}

function loadClaspCredentials() {
  const tokenPath = getClaspTokenPath();
  if (!fs.existsSync(tokenPath)) {
    throw new Error('Berkas ~/.clasprc.json tidak ditemukan. Jalankan npx @google/clasp login terlebih dahulu.');
  }
  const raw = fs.readFileSync(tokenPath, 'utf8');
  return JSON.parse(raw);
}

function saveClaspCredentials(creds) {
  const tokenPath = getClaspTokenPath();
  fs.writeFileSync(tokenPath, JSON.stringify(creds, null, 2), 'utf8');
}

async function getValidAccessToken(creds) {
  const tokenData = creds.tokens?.default || creds.tokens || {};
  let accessToken = tokenData.access_token;
  const expiryDate = tokenData.expiry_date || 0;
  const refreshToken = tokenData.refresh_token;
  const clientId = tokenData.client_id;
  const clientSecret = tokenData.client_secret;

  // Jika token masih berlaku lebih dari 60 detik, gunakan langsung
  if (accessToken && expiryDate > Date.now() + 60000) {
    return accessToken;
  }

  if (!refreshToken || !clientId || !clientSecret) {
    if (accessToken) return accessToken; // Coba pakai access token yang ada
    throw new Error('Kredensial refresh token tidak lengkap di ~/.clasprc.json.');
  }

  console.log('Access token kedaluwarsa, memperbarui via refresh_token Google OAuth...');

  const postData = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  }).toString();

  const refreshed = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Gagal refresh token (HTTP ${res.statusCode}): ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  accessToken = refreshed.access_token;
  if (creds.tokens?.default) {
    creds.tokens.default.access_token = accessToken;
    if (refreshed.expires_in) {
      creds.tokens.default.expiry_date = Date.now() + refreshed.expires_in * 1000;
    }
  }
  saveClaspCredentials(creds);
  console.log('Access token berhasil diperbarui.');
  return accessToken;
}

function requestJson(options, postBody = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json, raw: body });
        } catch (err) {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postBody) req.write(postBody);
    req.end();
  });
}

async function findFileInFolder(accessToken, folderId, fileName) {
  const query = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
  const res = await requestJson({
    hostname: 'www.googleapis.com',
    path: `/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=10`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (res.status === 200 && res.data && Array.isArray(res.data.files) && res.data.files.length > 0) {
    return res.data.files[0];
  }
  return null;
}

async function updateFileContent(accessToken, fileId, contentBuffer) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: `/upload/drive/v3/files/${fileId}?uploadType=media`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Length': contentBuffer.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Gagal update file (HTTP ${res.statusCode}): ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(contentBuffer);
    req.end();
  });
}

async function createFileInFolder(accessToken, folderId, fileName, contentBuffer) {
  const boundary = '-------khitandamai_doc_sync_' + Date.now();
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
    mimeType: 'text/markdown'
  });

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const headerPart = Buffer.from(
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    metadata +
    delimiter +
    'Content-Type: text/markdown; charset=utf-8\r\n\r\n'
  );

  const footerPart = Buffer.from(closeDelimiter);
  const multipartBody = Buffer.concat([headerPart, contentBuffer, footerPart]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: `/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartBody.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Gagal membuat file baru (HTTP ${res.statusCode}): ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(multipartBody);
    req.end();
  });
}

async function main() {
  console.log('=== SINKRONISASI DOKUMEN PROYEK KE GOOGLE DRIVE ===');
  console.log(`Folder Target: https://drive.google.com/drive/folders/${TARGET_FOLDER_ID}`);

  const creds = loadClaspCredentials();
  const token = await getValidAccessToken(creds);

  for (const item of FILES_TO_UPLOAD) {
    if (!fs.existsSync(item.localPath)) {
      console.warn(`[SKIP] Berkas lokal tidak ditemukan: ${item.localPath}`);
      continue;
    }

    const contentBuffer = fs.readFileSync(item.localPath);
    const sizeKb = (contentBuffer.length / 1024).toFixed(2);
    console.log(`\nMemproses: ${item.driveName} (${sizeKb} KB)...`);

    const existing = await findFileInFolder(token, TARGET_FOLDER_ID, item.driveName);

    if (existing) {
      console.log(`-> Ditemukan file lama di Drive (ID: ${existing.id}). Memperbarui isi...`);
      const updated = await updateFileContent(token, existing.id, contentBuffer);
      console.log(`-> SUKSES DIPERBARUI: ${item.driveName} (ID: ${updated.id || existing.id})`);
      console.log(`   Link: https://drive.google.com/file/d/${updated.id || existing.id}/view`);
    } else {
      console.log(`-> File belum ada di folder target. Mengunggah file baru...`);
      const created = await createFileInFolder(token, TARGET_FOLDER_ID, item.driveName, contentBuffer);
      console.log(`-> SUKSES DIUNGGAH: ${item.driveName} (ID: ${created.id})`);
      console.log(`   Link: https://drive.google.com/file/d/${created.id}/view`);
    }
  }

  console.log('\n=== SEMUA DOKUMEN BERHASIL DISINKRONKAN KE GOOGLE DRIVE ===\n');
}

main().catch(err => {
  console.error('\n[ERROR] Sinkronisasi ke Google Drive gagal:', err.message);
  process.exit(1);
});
