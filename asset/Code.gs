/**
 * KHITAN DAMAI — BACKEND REST API
 * Google Apps Script & Google Sheets Service
 * 
 * Database Spreadsheet: https://docs.google.com/spreadsheets/d/1j4oUNDspniMA-rEHrRis6RprLIip63UTCluqeU2YiuA/edit
 * Target Folder: https://drive.google.com/drive/folders/1I9j4MFkWThgt4ml_H5vtXcU_6mCoiZe-
 */

const SPREADSHEET_ID = "1j4oUNDspniMA-rEHrRis6RprLIip63UTCluqeU2YiuA";
const SHEET_NAME = "BOOKING";
const USERS_SHEET_NAME = "USERS";

// Memoisasi objek Spreadsheet per-execution cycle Apps Script untuk mengeliminasi pembukaan berulang
var SPREADSHEET_MEMO_ = null;

/**
 * Mengambil objek SpreadsheetApp dengan memoisasi per siklus eksekusi
 */
function getSpreadsheet_() {
  if (!SPREADSHEET_MEMO_) {
    SPREADSHEET_MEMO_ = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SPREADSHEET_MEMO_;
}

// Telemetri Cache Server Apps Script (dicatat per-siklus request)
var CACHE_TELEMETRY_ = {};

function resetCacheTelemetry_() {
  CACHE_TELEMETRY_ = {};
}

function recordCacheTelemetry_(dataset, status) {
  if (!CACHE_TELEMETRY_) CACHE_TELEMETRY_ = {};
  CACHE_TELEMETRY_[dataset] = status;
}

/**
 * Menghasilkan hash versi ringkas (FNV-1a 32-bit hex + length) dari dataset.
 * Cepat, deterministik, dan tanpa dependensi library eksternal.
 */
function computeDatasetVersion_(data) {
  if (data === null || data === undefined) return "0";
  try {
    var str = typeof data === "string" ? data : JSON.stringify(data);
    var len = str.length;
    var hash = 0x811c9dc5;
    for (var i = 0; i < len; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16) + "_" + len;
  } catch (e) {
    return "v_" + Date.now();
  }
}

const HEADERS = [
  "ID BOOKING",
  "NAMA ANANDA",
  "TEMPAT LAHIR",
  "TANGGAL LAHIR",
  "BERAT BADAN",
  "TANGGAL KHITAN",
  "JAM KHITAN",
  "METODE KHITAN",
  "UKURAN CELANA",
  "OBAT",
  "NAMA PENANGGUNG JAWAB",
  "USIA PENANGGUNG JAWAB",
  "PEKERJAAN",
  "HUBUNGAN KELUARGA",
  "NOMOR HP",
  "ALAMAT",
  "PROVINSI",
  "KABUPATEN",
  "KECAMATAN",
  "KELURAHAN",
  "TIMESTAMP",
  "STATUS"
];

const USER_HEADERS = [
  "Username",
  "Password",
  "Nama",
  "Role"
];

const SETTINGS_SHEET_NAME = "SETTINGS";
const SETTINGS_HEADERS = [
  "KEY",
  "VALUE",
  "UPDATED_AT"
];

const GALERI_SHEET_NAME = "GALERI";
const GALERI_HEADERS = [
  "ID",
  "NAMA",
  "FOTO"
];
const GALERI_FOLDER_ID = "1Gr9HCvCmC42aPSDEdqpHRb-nSNWKLHqD";
const GALERI_MAX_BYTES = 3 * 1024 * 1024; // 3MB

// Konfigurasi Cache Server Google Apps Script
const SERVER_CACHE_KEYS = {
  BOOKINGS: "kd_server_bookings_cache",
  KUNJUNGAN: "kd_server_kunjungan_cache",
  USERS: "kd_server_users_cache",
  SETTINGS: "kd_server_settings_cache",
  GALERI: "kd_server_galeri_cache",
  SARAN: "kd_server_saran_cache",
  JUMAT_BERKAH: "kd_server_jumatberkah_cache",
  VERSIONS: "kd_server_versions_cache",
  HISTORY: "kd_server_history_cache"
};
const GALERI_CACHE_KEY = SERVER_CACHE_KEYS.GALERI;
const GALERI_CACHE_TTL = 600; // 10 Menit
const SETTINGS_CACHE_KEY = SERVER_CACHE_KEYS.SETTINGS;
const SETTINGS_CACHE_TTL = 900; // 15 Menit
const SERVER_CACHE_DEFAULT_TTL = 600; // 10 Menit

// ==========================================
// KONFIGURASI NOTIFIKASI TELEGRAM ADMIN
// ==========================================
const TELEGRAM_CONFIG = {
  BOT_TOKEN: "8582652009:AAHoB81ErIc_oN4e6Kr7a3sdx2c7z029bpA",
  ADMIN_CHAT_ID: "8746493929",
  ADMIN_PHONE: "081222531978"
};

/**
 * Mengambil konfigurasi Telegram Bot (fallback ke Script Properties jika tersedia)
 * Otomatis melakukan sinkronisasi ke Script Properties jika belum tersimpan,
 * sehingga kredensial dapat dikelola / di-rotate secara aman via Script Properties.
 */
function getTelegramConfig_() {
  try {
    const props = PropertiesService.getScriptProperties();
    if (!props) {
      return { botToken: TELEGRAM_CONFIG.BOT_TOKEN, chatId: TELEGRAM_CONFIG.ADMIN_CHAT_ID, adminPhone: TELEGRAM_CONFIG.ADMIN_PHONE };
    }
    let token = props.getProperty("TELEGRAM_BOT_TOKEN");
    let chatId = props.getProperty("TELEGRAM_ADMIN_CHAT_ID");
    let adminPhone = props.getProperty("TELEGRAM_ADMIN_PHONE");

    // Auto-seed ke Script Properties jika belum disetel
    if (!token && TELEGRAM_CONFIG.BOT_TOKEN) {
      token = TELEGRAM_CONFIG.BOT_TOKEN;
      props.setProperty("TELEGRAM_BOT_TOKEN", token);
    }
    if (!chatId && TELEGRAM_CONFIG.ADMIN_CHAT_ID) {
      chatId = TELEGRAM_CONFIG.ADMIN_CHAT_ID;
      props.setProperty("TELEGRAM_ADMIN_CHAT_ID", chatId);
    }
    if (!adminPhone && TELEGRAM_CONFIG.ADMIN_PHONE) {
      adminPhone = TELEGRAM_CONFIG.ADMIN_PHONE;
      props.setProperty("TELEGRAM_ADMIN_PHONE", adminPhone);
    }

    return {
      botToken: token || TELEGRAM_CONFIG.BOT_TOKEN,
      chatId: chatId || TELEGRAM_CONFIG.ADMIN_CHAT_ID,
      adminPhone: adminPhone || TELEGRAM_CONFIG.ADMIN_PHONE
    };
  } catch (e) {
    return { botToken: TELEGRAM_CONFIG.BOT_TOKEN, chatId: TELEGRAM_CONFIG.ADMIN_CHAT_ID, adminPhone: TELEGRAM_CONFIG.ADMIN_PHONE };
  }
}

/**
 * Mengambil seluruh Chat ID Admin Telegram yang aktif & terdaftar
 * (Mencakup TELEGRAM_ADMIN_CHAT_ID di konfigurasi, Script Properties, akun admin yang terverifikasi nomor HP, dan riwayat admin)
 * @return {Array<string>} Daftar Chat ID Admin yang unik
 */
function getAdminTelegramChatIds_() {
  const config = getTelegramConfig_();
  const idMap = {};

  function addId(val) {
    if (!val) return;
    const str = String(val).trim();
    if (!str) return;
    const parts = str.split(",");
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].trim();
      if (p && /^-?\d+$/.test(p)) {
        idMap[p] = true;
      }
    }
  }

  // 1. Dari TELEGRAM_CONFIG default
  addId(TELEGRAM_CONFIG.ADMIN_CHAT_ID);

  // 2. Dari getTelegramConfig_()
  if (config && config.chatId) {
    addId(config.chatId);
  }

  // 3. Dari Script Properties (termasuk verifikasi admin HP & admin aktif)
  try {
    const props = PropertiesService.getScriptProperties();
    if (props) {
      addId(props.getProperty("TELEGRAM_ADMIN_CHAT_ID"));
      const cleanAdminPhone = cleanPhoneNumber(config.adminPhone || TELEGRAM_CONFIG.ADMIN_PHONE || "081222531978");
      addId(props.getProperty("tg_phone_chat_" + cleanAdminPhone));
      const activeAdminIds = props.getProperty("KD_ACTIVE_ADMIN_CHAT_IDS");
      if (activeAdminIds) {
        addId(activeAdminIds);
      }
    }
  } catch (e) {
    Logger.log("Catatan getAdminTelegramChatIds_: " + e.toString());
  }

  const result = Object.keys(idMap);
  return result.length > 0 ? result : [String(TELEGRAM_CONFIG.ADMIN_CHAT_ID)];
}

/**
 * Mengambil token rahasia webhook Telegram dari Script Properties.
 * Otomatis menghasilkan secret token acak (UUID + entropy) jika belum disetel.
 */
function getTelegramHookSecret_() {
  try {
    const props = PropertiesService.getScriptProperties();
    if (!props) return "";
    let secret = props.getProperty("TELEGRAM_HOOK_SECRET");
    if (!secret) {
      secret = Utilities.getUuid().replace(/-/g, "") + Math.random().toString(36).substring(2, 10);
      props.setProperty("TELEGRAM_HOOK_SECRET", secret);
    }
    return secret;
  } catch (e) {
    return "";
  }
}

/**
 * Memeriksa apakah pengirim Telegram merupakan Admin
 */
function isTelegramAdmin_(chatId, senderPhone, config) {
  if (!config) config = getTelegramConfig_();
  const cId = String(chatId || "").trim();
  const adminIds = String(config.chatId || "").split(",").map(function(s) { return s.trim(); }).filter(Boolean);
  if (adminIds.indexOf(cId) !== -1) return true;
  if (senderPhone) {
    const cleanSender = cleanPhoneNumber(senderPhone);
    const cleanAdmin = cleanPhoneNumber(config.adminPhone || "081222531978");
    if (cleanSender && cleanAdmin && cleanSender === cleanAdmin) return true;
  }
  return false;
}

/**
 * Mengambil URL deployment web app Google Apps Script yang aktif
 */
function getGasWebAppUrl_() {
  return "https://script.google.com/macros/s/AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs/exec";
}

/**
 * Membangun URL tracking WhatsApp untuk tombol Bot Telegram.
 * Saat tombol diklik oleh Admin, URL ini membuka endpoint GAS untuk mengubah status
 * pendaftaran menjadi "Confirmed" secara otomatis, lalu langsung redirect ke WhatsApp.
 * Jika bookingId tidak valid, kembalikan URL langsung ke WhatsApp (fallback).
 * @param {string} bookingId - ID Booking (misal: "KD-ABC1234")
 * @param {string} mode - "sambutan" | "reminder"
 * @param {string} directFallbackUrl - URL fallback langsung ke WhatsApp jika ID tidak tersedia
 * @return {string}
 */
function buildWaTrackingUrl_(bookingId, mode, directFallbackUrl) {
  const cleanId = String(bookingId || "").trim();
  if (cleanId && cleanId !== "-") {
    const actionName = (mode === "reminder") ? "waReminder" : "waSambutan";
    return getGasWebAppUrl_() + "?action=" + actionName + "&id=" + encodeURIComponent(cleanId);
  }
  return directFallbackUrl || "";
}

/**
 * Format badge status booking untuk pesan Telegram
 */
function formatStatusBadgeTelegram_(status) {
  const s = String(status || "Terkonfirmasi").trim();
  const lower = s.toLowerCase();
  if (lower === "selesai") return s + " 🏁";
  if (lower === "batal") return s + " ❌";
  if (lower === "pending" || lower.includes("menunggu")) return s + " ⏳";
  if (lower === "confirmed") return s + " ✅";
  return s + " ✅";
}

/**
 * Menjawab Callback Query Telegram agar status loading spinner pada tombol inline berhenti
 */
function answerTelegramCallbackQuery_(callbackQueryId, text, showAlert) {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken || !callbackQueryId) return;
    const url = "https://api.telegram.org/bot" + config.botToken + "/answerCallbackQuery";
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "Permintaan diterima...",
        show_alert: !!showAlert
      }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log("answerTelegramCallbackQuery_ error: " + e.toString());
  }
}

/**
 * Mengirim pesan notifikasi langsung ke akun Telegram keluarga pasien (jika nomor HP terhubung ke bot)
 */
function notifyPatientTelegram_(phone, message, replyMarkup) {
  try {
    if (!phone || !message) return false;
    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone) return false;
    const props = PropertiesService.getScriptProperties();
    if (!props) return false;
    const patientChatId = props.getProperty("tg_phone_chat_" + cleanPhone);
    if (!patientChatId) return false;
    const res = sendTelegramMessage_(patientChatId, message, replyMarkup);
    return !!(res && res.success);
  } catch (e) {
    Logger.log("notifyPatientTelegram_ error: " + e.toString());
    return false;
  }
}

/**
 * Format string jam pelaksanaan agar rapi dan tidak dobel WIB
 */
function formatJamDisplay_(jamStr) {
  if (!jamStr || jamStr === "-") return "Waktu Belum Ditentukan";
  let clean = String(jamStr).replace(/wib/gi, "").trim();
  return "Pukul " + clean + " WIB";
}

/**
 * Escape karakter spesial HTML untuk Telegram Parse Mode HTML
 */
function escapeTelegramHtml_(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Format string YYYY-MM-DD menjadi format tanggal Indonesia (misal: 25 Oktober 2026)
 */
function formatIndonesianDateStr_(ymdStr) {
  if (!ymdStr) return "-";
  const str = String(ymdStr).substring(0, 10);
  const parts = str.split("-");
  if (parts.length !== 3) return String(ymdStr);
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const mIndex = parseInt(parts[1], 10) - 1;
  const monthName = (mIndex >= 0 && mIndex < 12) ? bulan[mIndex] : parts[1];
  return parseInt(parts[2], 10) + " " + monthName + " " + parts[0];
}

/**
 * Membersihkan nomor HP untuk format link WhatsApp (628xxxx)
 */
function cleanPhoneForWa_(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (digits.startsWith("8")) {
    digits = "62" + digits;
  }
  return digits;
}

/**
 * Menentukan sapaan Ayah / Bunda berdasarkan hubungan keluarga
 */
function resolveSapaanWa_(hubungan) {
  const h = String(hubungan || "").toLowerCase().trim();
  if (h === "ayah" || h === "kakek" || h === "wali") return "Ayah";
  if (h === "ibu" || h === "nenek") return "Bunda";
  return "Ayah/Bunda";
}

/**
 * Menyusun template teks WhatsApp Sambutan (identik dengan Panel Admin)
 */
function buildWaSambutanText_(b) {
  if (!b) return "";
  const namaOrtu = b.namaPenanggungJawab || b.namaOrtu || "-";
  const namaAnanda = b.namaAnanda || b.namaAnak || "-";
  const tglKhitan = (b.tanggalKhitan || b.tglKhitan) ? formatIndonesianDateStr_(b.tanggalKhitan || b.tglKhitan) : "-";
  const jamKhitan = b.jamKhitan || "-";
  const metodeKhitan = b.metodeKhitan || "-";
  const sapaan = resolveSapaanWa_(b.hubunganKeluarga);

  const lines = [
    "Assalamu’alaikum Warahmatullahi Wabarakatuh 🌿",
    "",
    "Yth. " + sapaan,
    namaOrtu + " 👨‍👩‍👦",
    "",
    "Semoga " + sapaan + " dan keluarga senantiasa diberikan kesehatan, keberkahan, serta kelancaran dalam mempersiapkan khitan Ananda. 🤲✨",
    "",
    "Ananda:",
    "👦 " + namaAnanda,
    "",
    "yang insyaAllah akan dilaksanakan pada:",
    "━━━━━━━━━━━━━━━━━",
    "📅 Tanggal : " + tglKhitan,
    "⏰ Jam : " + jamKhitan,
    "🏥 Metode Khitan : " + metodeKhitan,
    "━━━━━━━━━━━━━━━━━",
    "Semoga seluruh proses khitan berjalan dengan lancar, nyaman, aman, dan diberikan kemudahan oleh Allah SWT. 🤲💙",
    "",
    "Semoga Ananda menjadi anak yang sehat, sholeh, berbakti kepada orang tua, serta tumbuh menjadi kebanggaan keluarga. 🌟👨‍👩‍👦",
    "",
    "Aamiin Yaa Rabbal ‘Alamiin. 🤲✨",
    "",
    "Wassalamu’alaikum Warahmatullahi Wabarakatuh 🌷",
    "",
    "Hormat Kami,",
    "🏥 Admin Rumah Khitan Damai",
    "💙 Khitan Nyaman, Aman, dan Menyenangkan untuk Ananda ✨"
  ];
  return lines.join("\n");
}

/**
 * Mengirimkan pesan notifikasi booking baru ke Telegram Admin
 */
function sendTelegramBookingNotification_(booking, source) {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken || !config.chatId) {
      Logger.log("Peringatan: Telegram Bot Token atau Chat ID belum dikonfigurasi.");
      return { success: false, message: "Token atau Chat ID kosong" };
    }

    const idBooking = booking.idBooking || booking.id || "-";
    const namaAnanda = booking.namaAnanda || booking.namaAnak || "-";
    const tglLahirFormatted = booking.tanggalLahir ? formatIndonesianDateStr_(booking.tanggalLahir) : "-";
    const namaPj = booking.namaPenanggungJawab || booking.namaOrtu || "-";
    const hubungan = booking.hubunganKeluarga || "Orang Tua / Wali";
    const noHp = booking.nomorHp || booking.noHp || "-";
    const tglKhitanFormatted = (booking.tanggalKhitan || booking.tglKhitan) ? formatIndonesianDateStr_(booking.tanggalKhitan || booking.tglKhitan) : "-";
    const jamKhitan = booking.jamKhitan ? (" • Pukul " + booking.jamKhitan) : "";
    const metode = booking.metodeKhitan || "-";
    const wilayahParts = [booking.kelurahan, booking.kecamatan, booking.kabupaten].filter(Boolean);
    const wilayah = wilayahParts.length > 0 ? wilayahParts.join(", ") : (booking.alamat || "-");
    const waktu = booking.timestamp || getJakartaTimestamp();
    const asal = source || "Akses Publik";

    const text = "🔔 <b>NOTIFIKASI BOOKING BARU!</b> 🏥\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "📋 <b>ID Booking:</b> <code>" + escapeTelegramHtml_(idBooking) + "</code>\n" +
      "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
      "🎂 <b>Tgl Lahir:</b> " + escapeTelegramHtml_(tglLahirFormatted) + "\n" +
      "👨‍👩‍👦 <b>Penanggung Jawab:</b> " + escapeTelegramHtml_(namaPj) + " (" + escapeTelegramHtml_(hubungan) + ")\n" +
      "📱 <b>WhatsApp:</b> " + escapeTelegramHtml_(noHp) + "\n" +
      "📅 <b>Jadwal Khitan:</b> " + escapeTelegramHtml_(tglKhitanFormatted) + escapeTelegramHtml_(jamKhitan) + "\n" +
      "✨ <b>Metode:</b> " + escapeTelegramHtml_(metode) + "\n" +
      "📍 <b>Wilayah:</b> " + escapeTelegramHtml_(wilayah) + "\n" +
      "🌐 <b>Sumber:</b> " + escapeTelegramHtml_(asal) + "\n" +
      "⏰ <b>Waktu Submit:</b> " + escapeTelegramHtml_(waktu) + " WIB\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "💡 <i>Segera buka Panel Admin Khitan Damai untuk verifikasi jadwal dan tindak lanjut.</i>";

    const url = "https://api.telegram.org/bot" + config.botToken + "/sendMessage";
    const payload = {
      chat_id: config.chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };

    // Tambahkan tombol interaktif WhatsApp Sambutan (dengan redirect tracking untuk auto-Confirmed)
    const cleanPhone = cleanPhoneForWa_(noHp);
    if (cleanPhone) {
      const sambutanText = buildWaSambutanText_(booking);
      const directWaUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(sambutanText);
      const waUrl = buildWaTrackingUrl_(idBooking, "sambutan", directWaUrl);
      payload.reply_markup = {
        inline_keyboard: [
          [
            {
              text: "💬 Kirim WhatsApp Sambutan",
              url: waUrl
            }
          ]
        ]
      };
    }

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    Logger.log("Telegram notification response (" + responseCode + "): " + responseText);
    return { success: responseCode === 200, response: responseText };
  } catch (err) {
    Logger.log("Peringatan sendTelegramBookingNotification_: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Mengirim notifikasi URGENT ke Telegram Admin ketika ada pendaftaran baru
 * dengan jadwal tindakan < 12 jam dari waktu pendaftaran (pendaftaran dadakan).
 * Berbeda dengan reminder trigger 1 jam (yang mendeteksi semua booking < 12 jam),
 * fungsi ini langsung memicu saat booking dibuat agar admin segera menindaklanjuti.
 * @param {Object} booking - Data booking yang baru disimpan
 * @return {Object} { success: boolean, diffHours?: number, skipped?: boolean, reason?: string }
 */
function checkAndSendUrgentBookingAlert_(booking) {
  try {
    const tglKhitan = normalizeYmd_(booking.tanggalKhitan || booking.tglKhitan);
    if (!tglKhitan || tglKhitan.length < 10) {
      return { success: false, skipped: true, reason: "Tanggal khitan kosong/tidak valid" };
    }

    const jamStr = String(booking.jamKhitan || "").trim() || "08:00";
    const jamClean = jamStr.replace(".", ":");
    const jamParts = jamClean.match(/(\d{1,2}):(\d{2})/);
    const hour = jamParts ? parseInt(jamParts[1], 10) : 8;
    const minute = jamParts ? parseInt(jamParts[2], 10) : 0;
    const hourPad = hour < 10 ? "0" + hour : String(hour);
    const minPad = minute < 10 ? "0" + minute : String(minute);

    // Bangun target datetime di WIB (eksplisit +07:00, konsisten dengan checkAndSendUpcomingReminders_)
    const targetIso = tglKhitan.substring(0, 10) + "T" + hourPad + ":" + minPad + ":00+07:00";
    const targetMs = new Date(targetIso).getTime();
    if (isNaN(targetMs)) {
      return { success: false, skipped: true, reason: "Jadwal tidak valid" };
    }

    const nowMs = Date.now();
    const diffHours = (targetMs - nowMs) / (1000 * 60 * 60);

    // Hanya untuk jadwal mendesak: belum lewat (> 0) dan <= 12 jam ke depan
    if (!(diffHours > 0 && diffHours <= 12)) {
      return { success: false, skipped: true, reason: "Di luar rentang < 12 jam", diffHours: diffHours };
    }

    const config = getTelegramConfig_();
    if (!config.botToken || !config.chatId) {
      Logger.log("Peringatan: Telegram Bot Token atau Chat ID belum dikonfigurasi (urgent alert).");
      return { success: false, reason: "Token atau Chat ID kosong" };
    }

    const id = booking.idBooking || booking.id || "-";
    const namaAnanda = booking.namaAnanda || booking.namaAnak || "-";
    const namaPj = booking.namaPenanggungJawab || booking.namaOrtu || "-";
    const hubungan = booking.hubunganKeluarga || "Orang Tua / Wali";
    const noHp = booking.nomorHp || booking.noHp || "-";
    const tglFormatted = formatIndonesianDateStr_(tglKhitan);
    const jamDisplay = formatJamDisplay_(jamStr);
    const metode = booking.metodeKhitan || "-";

    let sisaJamText;
    if (diffHours < 1) {
      sisaJamText = "🔴 ± " + Math.max(1, Math.round(diffHours * 60)) + " MENIT LAGI!";
    } else {
      sisaJamText = "🔴 ± " + Math.round(diffHours) + " JAM LAGI!";
    }

    const text = "🚨 <b>PENDAFTARAN DADAKAN (&lt; 12 JAM)</b> 🚨\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "⚠️ <b>Perhatian:</b> Pendaftaran baru dengan jadwal tindakan SANGAT DEKAT!\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "📋 <b>ID Booking:</b> <code>" + escapeTelegramHtml_(id) + "</code>\n" +
      "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
      "👨‍👩‍👦 <b>Penanggung Jawab:</b> " + escapeTelegramHtml_(namaPj) + " (" + escapeTelegramHtml_(hubungan) + ")\n" +
      "📱 <b>WhatsApp:</b> " + escapeTelegramHtml_(noHp) + "\n" +
      "📅 <b>Jadwal Khitan:</b> " + escapeTelegramHtml_(tglFormatted) + " • Pukul " + escapeTelegramHtml_(jamDisplay) + " WIB\n" +
      "✨ <b>Metode:</b> " + escapeTelegramHtml_(metode) + "\n" +
      "⏳ <b>Sisa Waktu:</b> " + sisaJamText + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "💡 <i>Segera hubungi keluarga pasien untuk konfirmasi kehadiran & kesiapan tindakan hari ini.</i>";

    // Tombol: konfirmasi ke keluarga via WhatsApp (teks sapaan reminder + auto-Confirmed tracking)
    const inlineButtons = [];
    const cleanPhone = cleanPhoneForWa_(noHp);
    if (cleanPhone) {
      const waText = buildWaReminderText_({
        namaPenanggungJawab: namaPj,
        namaAnanda: namaAnanda,
        tanggalKhitan: tglKhitan,
        jamKhitan: jamDisplay,
        hubunganKeluarga: hubungan
      });
      const directWaUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(waText);
      const waUrl = buildWaTrackingUrl_(id, "reminder", directWaUrl);
      inlineButtons.push([{ text: "📞 Konfirmasi ke Keluarga via WA", url: waUrl }]);
    }

    const targetChatIds = getAdminTelegramChatIds_();
    let anySuccess = false;
    for (let c = 0; c < targetChatIds.length; c++) {
      const aId = targetChatIds[c];
      if (!aId) continue;
      const payload = {
        chat_id: aId,
        text: text,
        parse_mode: "HTML",
        disable_notification: false,
        disable_web_page_preview: true
      };
      if (inlineButtons.length > 0) {
        payload.reply_markup = { inline_keyboard: inlineButtons };
      }
      const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.botToken + "/sendMessage", {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) anySuccess = true;
    }

    if (anySuccess) {
      Logger.log("Notifikasi URGENT dadakan terkirim: " + id + " (" + namaAnanda + ") jadwal " +
        tglKhitan + " " + hourPad + ":" + minPad + " (sisa " + diffHours.toFixed(2) + " jam)");
    }
    return { success: anySuccess, diffHours: diffHours };
  } catch (err) {
    Logger.log("checkAndSendUrgentBookingAlert_ error: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Fungsi utilitas untuk uji coba kirim Telegram dari Apps Script Editor
 */
function testSendTelegramAlert() {
  const sampleBooking = {
    idBooking: "KD-TEST01",
    namaAnanda: "Rayyan Al-Fatih (Uji Coba)",
    tanggalLahir: "2017-08-14",
    namaPenanggungJawab: "Admin Khitan Damai",
    hubunganKeluarga: "Ayah",
    nomorHp: "081222531978",
    tanggalKhitan: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
    jamKhitan: "09:00",
    metodeKhitan: "Super Ring Modern",
    kabupaten: "Subang",
    kecamatan: "Subang",
    kelurahan: "Sukamelang",
    timestamp: getJakartaTimestamp()
  };
  return sendTelegramBookingNotification_(sampleBooking, "Uji Coba Editor Apps Script");
}

/**
 * URL Halaman Google Review Resmi Rumah Khitan Damai
 */
const GOOGLE_REVIEW_PAGE_URL = "https://www.google.co.id/search?sca_esv=47d3a503fd7b42d7&output=search&q=Rumah+Khitan+Damai&ludocid=11956106694650577077&lsig=AB86z5VxZiMPhsIh3gsUvrMYbXGw&sa=X&ved=2ahUKEwiv5syJga6UAxXtd2wGHZtNK40Qj9IGegQIExAG#ebo=0";

/**
 * Feature ID Google Maps untuk Rumah Khitan Damai Subang
 * (CID: 11956106694650577077 / Place ID: ChIJNQ9Y9Hg8aS4RtUBRT7Gf7KU)
 */
const GOOGLE_MAPS_FEATURE_ID = "0x2e693c78f4580f35:0xa5ec9fb14f5140b5";

/**
 * Mengambil ulasan publik Google Maps secara real-time langsung dari server Google
 * @param {string} [fid] Feature ID Google Maps
 * @param {number} [limit] Jumlah ulasan terbaru yang diambil (default 20)
 * @return {Array<Object>} Daftar ulasan real-time
 */
function fetchGoogleMapsReviewsRealtime_(fid, limit) {
  const featureId = fid || GOOGLE_MAPS_FEATURE_ID;
  const count = limit || 20;
  try {
    const inner = new Array(12).fill(null);
    inner[1] = 2; // Urutkan ulasan terbaru (Newest First)
    inner[9] = count;
    inner[11] = [featureId];
    const payload = [null, new Array(9).fill(null).concat([inner])];
    const jsonStr = JSON.stringify(payload);
    const cb = Date.now().toString() + "_" + Math.floor(Math.random() * 1000000);
    const url = "https://www.google.co.id/httpservice/web/PrivateLocalSearchUiDataService/GetLocalBoqProxy?msc=gwsrpc&hl=id&_cb=" + cb + "&reqpld=" + encodeURIComponent(jsonStr);

    const options = {
      method: "get",
      muteHttpExceptions: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache"
      }
    };

    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      Logger.log("fetchGoogleMapsReviewsRealtime_ HTTP status: " + response.getResponseCode());
      return [];
    }

    const rawText = response.getContentText();
    const cleanJson = rawText.replace(/^\)\]\}'\s*/, "");
    const data = JSON.parse(cleanJson);

    if (!data || !data[1] || !data[1][10] || !Array.isArray(data[1][10][2])) {
      Logger.log("fetchGoogleMapsReviewsRealtime_ format data tidak valid");
      return [];
    }

    const rawList = data[1][10][2];
    const reviews = [];
    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      if (!item) continue;

      const reviewId = String(item[5] || ("gmap_rev_" + (item[3] ? item[3][0] : i)));
      const rating = (typeof item[1] === "number") ? item[1] : 5;
      const authorName = (item[3] && item[3][0]) ? String(item[3][0]).trim() : "Pengguna Google";
      const authorPhoto = (item[3] && item[3][1]) ? String(item[3][1]) : "";
      const timeAgo = (item[2] && item[2][0]) ? String(item[2][0]) : "";

      let reviewDate = new Date();
      let epochMs = 0;
      if (item[2] && item[2][2]) {
        epochMs = parseInt(item[2][2], 10);
        if (!isNaN(epochMs) && epochMs > 0) {
          reviewDate = new Date(epochMs);
        }
      }

      let commentText = "";
      if (item[27] && typeof item[27] === "string") {
        commentText = item[27];
      } else if (item[28] && typeof item[28] === "string") {
        commentText = item[28];
      }
      commentText = commentText.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();

      const reviewUrl = (item[12] && typeof item[12] === "string") ? item[12] : GOOGLE_REVIEW_PAGE_URL;

      reviews.push({
        id: reviewId,
        reviewerName: authorName,
        rating: rating,
        comment: commentText,
        date: reviewDate,
        epochMs: epochMs,
        timeAgo: timeAgo,
        reviewUrl: reviewUrl,
        authorPhoto: authorPhoto,
        source: "Google Maps (Real-time)"
      });
    }
    return reviews;
  } catch (err) {
    Logger.log("Kesalahan fetchGoogleMapsReviewsRealtime_: " + err.toString());
    return [];
  }
}

/**
 * Mengirimkan pesan notifikasi Google Review baru ke Bot Telegram Admin
 */
function sendTelegramGoogleReviewNotification_(review) {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken) {
      Logger.log("Peringatan: Telegram Bot Token belum dikonfigurasi.");
      return { success: false, message: "Token bot kosong" };
    }

    const adminChatIds = getAdminTelegramChatIds_();
    if (!adminChatIds || adminChatIds.length === 0) {
      Logger.log("Peringatan: Telegram Admin Chat ID belum dikonfigurasi.");
      return { success: false, message: "Chat ID Admin kosong" };
    }

    const reviewerName = (review && review.reviewerName) ? String(review.reviewerName).trim() : "Pengguna Google";
    const starsNum = Math.max(1, Math.min(5, parseInt((review && review.rating) || 5, 10)));
    const starsIcon = "⭐".repeat(starsNum) + "☆".repeat(5 - starsNum);
    const ratingDisplay = starsIcon + " (" + starsNum + "/5 Bintang)";
    const comment = (review && review.comment && String(review.comment).trim()) ? String(review.comment).trim() : "";
    const reviewDate = (review && review.date)
      ? Utilities.formatDate(new Date(review.date), "Asia/Jakarta", "dd MMMM yyyy, HH:mm") + " WIB"
      : (getJakartaTimestamp() + " WIB");
    const reviewUrl = (review && review.reviewUrl) ? String(review.reviewUrl) : GOOGLE_REVIEW_PAGE_URL;
    const sourceLabel = (review && review.source) ? String(review.source) : "Google Maps (Real-time)";

    const text = "⭐ <b>ULASAN GOOGLE REVIEW BARU DITERIMA!</b> ⭐\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "📍 <b>Profil:</b> Rumah Khitan Damai Subang\n" +
      "🌐 <b>Sumber:</b> " + escapeTelegramHtml_(sourceLabel) + " ✅\n" +
      "👤 <b>Pengulas:</b> <b>" + escapeTelegramHtml_(reviewerName) + "</b>\n" +
      "🌟 <b>Penilaian:</b> " + ratingDisplay + "\n" +
      "📅 <b>Waktu:</b> " + escapeTelegramHtml_(reviewDate) + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "💬 <b>Isi Ulasan:</b>\n" +
      (comment ? ("<i>\"" + escapeTelegramHtml_(comment) + "\"</i>") : "<i>(Pengulas memberikan rating bintang tanpa ulasan tertulis)</i>") + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "💡 <i>Ulasan baru terdeteksi secara real-time dari profil Google Review Rumah Khitan Damai.</i>";

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "⭐ Buka di Google Review",
            url: reviewUrl
          }
        ],
        [
          {
            text: "🔄 Cek 10 Ulasan Terbaru",
            callback_data: "cb_review_force"
          }
        ]
      ]
    };

    let anySuccess = false;
    let lastResponse = "";

    for (let i = 0; i < adminChatIds.length; i++) {
      const targetId = adminChatIds[i];
      const payload = {
        chat_id: targetId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
        reply_markup: replyMarkup
      };

      const url = "https://api.telegram.org/bot" + config.botToken + "/sendMessage";
      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      try {
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        Logger.log("Telegram Google Review notif to " + targetId + " (" + responseCode + "): " + responseText);
        const resData = JSON.parse(responseText || "{}");
        if (resData.ok === true || responseCode === 200) {
          anySuccess = true;
        }
        lastResponse = responseText;
      } catch (sendErr) {
        Logger.log("Gagal kirim notif review ke targetId " + targetId + ": " + sendErr.toString());
      }
    }

    return { success: anySuccess, response: lastResponse };
  } catch (err) {
    Logger.log("Peringatan sendTelegramGoogleReviewNotification_: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Daftar alamat email penerima notifikasi otomatis Google Review
 */
const GOOGLE_REVIEW_RECIPIENT_EMAILS = ["denluckyman@gmail.com"];

/**
 * Mengirimkan email notifikasi ulasan Google Review baru ke alamat email yang terdaftar
 */
function sendEmailGoogleReviewNotification_(review, targetEmail) {
  try {
    const email = targetEmail || "denluckyman@gmail.com";
    if (!email) return { success: false, message: "Alamat email kosong" };

    const reviewerName = (review && review.reviewerName) ? String(review.reviewerName).trim() : "Pengguna Google";
    const starsNum = Math.max(1, Math.min(5, parseInt((review && review.rating) || 5, 10)));
    const starsIcon = "⭐".repeat(starsNum) + "☆".repeat(5 - starsNum);
    const comment = (review && review.comment && String(review.comment).trim()) ? String(review.comment).trim() : "(Pengulas memberikan rating bintang tanpa komentar tertulis)";
    const reviewDate = (review && review.date)
      ? Utilities.formatDate(new Date(review.date), "Asia/Jakarta", "dd MMMM yyyy, HH:mm") + " WIB"
      : (getJakartaTimestamp() + " WIB");
    const reviewUrl = (review && review.reviewUrl) ? String(review.reviewUrl) : GOOGLE_REVIEW_PAGE_URL;

    const subject = "⭐ [Google Review] " + starsNum + " Bintang dari " + reviewerName + " — Rumah Khitan Damai";
    const htmlBody = '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">' +
      '<div style="text-align:center;margin-bottom:20px;">' +
        '<h2 style="color:#008080;margin:0 0 6px 0;">⭐ Ulasan Baru di Google Review</h2>' +
        '<p style="color:#64748b;margin:0;font-size:14px;">Rumah Khitan Damai Subang</p>' +
      '</div>' +
      '<div style="background:#f8fafc;padding:18px;border-radius:10px;border-left:4px solid #008080;margin-bottom:20px;">' +
        '<p style="margin:4px 0;font-size:15px;"><b>👤 Pengulas:</b> ' + escapeTelegramHtml_(reviewerName) + '</p>' +
        '<p style="margin:6px 0;font-size:15px;"><b>🌟 Penilaian:</b> <span style="color:#eab308;font-size:18px;">' + starsIcon + '</span> <b>(' + starsNum + '/5)</b></p>' +
        '<p style="margin:4px 0;font-size:13px;color:#64748b;"><b>📅 Waktu:</b> ' + escapeTelegramHtml_(reviewDate) + '</p>' +
        '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #cbd5e1;">' +
          '<b style="display:block;margin-bottom:4px;color:#334155;">💬 Isi Ulasan:</b>' +
          '<blockquote style="margin:0;padding:8px 12px;background:#ffffff;border-radius:6px;border:1px solid #e2e8f0;color:#1e293b;font-style:italic;">"' + escapeTelegramHtml_(comment) + '"</blockquote>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;margin-top:24px;">' +
        '<a href="' + reviewUrl + '" style="background:#008080;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;box-shadow:0 2px 4px rgba(0,128,128,0.2);">⭐ Buka di Google Review</a>' +
      '</div>' +
      '<p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:24px;border-top:1px solid #f1f5f9;padding-top:12px;">Email notifikasi otomatis dari Sistem Rumah Khitan Damai. Dikirim ke ' + escapeTelegramHtml_(email) + '</p>' +
    '</div>';

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    Logger.log("✓ Email notifikasi ulasan berhasil dikirim ke: " + email);
    return { success: true };
  } catch (err) {
    Logger.log("Peringatan sendEmailGoogleReviewNotification_: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Uji coba kirim email notifikasi Google Review ke denluckyman@gmail.com dari Editor Apps Script
 */
function testSendGoogleReviewEmail(targetEmail) {
  const sampleReview = {
    reviewerName: "Budi Santoso (Uji Coba)",
    rating: 5,
    comment: "Pelayanan sangat ramah, dokternya komunikatif, tempat bersih dan nyaman, ananda sama sekali tidak merasa takut saat khitan. Metode super ring mantap! Terima kasih Rumah Khitan Damai 🙏✨",
    date: new Date(),
    reviewUrl: GOOGLE_REVIEW_PAGE_URL
  };
  return sendEmailGoogleReviewNotification_(sampleReview, targetEmail || "denluckyman@gmail.com");
}

/**
 * Mendapatkan alamat email akun Google pemilik / pelaksana script saat ini
 */
function getScriptUserEmail_() {
  try {
    const props = PropertiesService.getScriptProperties();
    let email = "";
    try {
      email = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail() || "";
    } catch (e) {}

    if (email && email.indexOf("@") !== -1) {
      if (props) props.setProperty("KD_SCRIPT_OWNER_EMAIL", email);
      return email;
    }

    if (props) {
      const stored = props.getProperty("KD_SCRIPT_OWNER_EMAIL");
      if (stored && stored.indexOf("@") !== -1) return stored;
    }

    return "denluckyman@gmail.com";
  } catch (err) {
    return "denluckyman@gmail.com";
  }
}

/**
 * Mengurai email notifikasi Google Review untuk mendapatkan nama pengulas, rating bintang, komentar, dan URL
 */
function parseGoogleReviewMessage_(msg, fallbackUrl) {
  try {
    const subject = String(msg.getSubject() || "").trim();
    const plainBody = String(msg.getPlainBody() || "").trim();
    const htmlBody = String(msg.getBody() || "");
    const date = msg.getDate() || new Date();
    const fullText = (subject + " " + plainBody + " " + htmlBody).toLowerCase();

    // Verifikasi awal apakah email ini berkaitan dengan Google Review / Ulasan Bisnis
    const isGoogleReview = /(?:ulas|review|bintang|star|rating|penilaian|rekomendasi)/i.test(fullText);
    if (!isGoogleReview) {
      return null;
    }

    let reviewerName = "";
    let rating = 0;
    let comment = "";
    let reviewUrl = fallbackUrl || GOOGLE_REVIEW_PAGE_URL;

    // 1. Ekstraksi Nama Pengulas
    let m = subject.match(/(?:ulasan baru dari|new review from|ulasan dari|review from)\s+([^\·\-\n\r<]+)/i);
    if (m && m[1]) reviewerName = m[1].trim();

    if (!reviewerName) {
      m = subject.match(/^(.+?)\s+(?:memberi ulasan|memberikan ulasan|mengulas|menulis ulasan|left a review|gave a review|baru saja mengulas|memberi peringkat|memberi rating)/i);
      if (m && m[1]) reviewerName = m[1].trim();
    }

    if (!reviewerName) {
      m = subject.match(/([1-5])\s*(?:bintang|stars?)\s*(?:dari|from)\s+([^\·\-\n\r<]+)/i);
      if (m && m[2]) reviewerName = m[2].trim();
    }

    if (!reviewerName) {
      m = plainBody.match(/(?:ulasan baru dari|new review from|ulasan dari|review from)\s+([^\n\r<]+)/i);
      if (m && m[1]) reviewerName = m[1].trim();
    }

    if (!reviewerName) {
      m = plainBody.match(/(?:^|\n)([A-Z0-9\s\.\'\-]{2,40})\s+(?:memberi ulasan|memberikan ulasan|mengulas|left a review|baru saja mengulas|memberi peringkat|memberi rating)/i);
      if (m && m[1]) reviewerName = m[1].trim();
    }

    if (!reviewerName) {
      m = htmlBody.match(/<b[^>]*>([^<]+)<\/b>\s*(?:memberi ulasan|left a review|memberikan ulasan|mengulas|baru saja mengulas|memberi peringkat)/i);
      if (m && m[1]) reviewerName = m[1].trim();
    }

    if (!reviewerName) {
      m = htmlBody.match(/<(?:strong|span)[^>]*>([^<]{2,40})<\/(?:strong|span)>\s*(?:memberi ulasan|left a review|memberikan ulasan|mengulas)/i);
      if (m && m[1]) reviewerName = m[1].trim();
    }

    if (!reviewerName) {
      reviewerName = "Pelanggan Google (Google Maps)";
    }

    reviewerName = reviewerName
      .replace(/\s+(?:untuk|on|at|di)\s+.*$/i, "")
      .replace(/<[^>]+>/g, "")
      .replace(/^[•\-\*\s]+/, "")
      .trim();

    // 2. Ekstraksi Rating (1 - 5)
    m = subject.match(/([1-5])\s*(?:bintang|star[s]?)/i) || subject.match(/(?:bintang|star[s]?)\s*([1-5])/i);
    if (m && m[1]) {
      rating = parseInt(m[1], 10);
    }

    if (!rating) {
      m = htmlBody.match(/(?:alt|aria-label)=["'](?:bintang\s*)?([1-5])(?:(?:\.0)?\s*(?:bintang|star[s]?))?["']/i);
      if (m && m[1]) {
        rating = parseInt(m[1], 10);
      }
    }

    if (!rating) {
      m = htmlBody.match(/([1-5])(?:\.0)?\s*(?:dari|out of|\/)\s*5/i);
      if (m && m[1]) {
        rating = parseInt(m[1], 10);
      }
    }

    if (!rating) {
      m = plainBody.match(/([1-5])\s*(?:bintang|star[s]?)\b/i) || plainBody.match(/(?:rating|skor|peringkat)[:\s]+([1-5])/i);
      if (m && m[1]) {
        rating = parseInt(m[1], 10);
      }
    }

    if (!rating) {
      const starMatches = (plainBody || htmlBody).match(/[★⭐]/g);
      if (starMatches && starMatches.length >= 1 && starMatches.length <= 5) {
        rating = starMatches.length;
      }
    }

    if (!rating || rating < 1 || rating > 5) {
      rating = 5;
    }

    // 3. Ekstraksi Komentar Ulasan
    m = plainBody.match(/[“"”]([^“”"'\n\r]{3,1200})[“"”]/);
    if (m && m[1]) {
      comment = m[1].trim();
    } else {
      m = htmlBody.match(/(?:<blockquote[^>]*>|<div class="[^"]*(?:comment|review|snippet|content)[^"]*"[^>]*>)([\s\S]*?)(?:<\/blockquote>|<\/div>)/i);
      if (m && m[1]) {
        comment = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
    }

    if (!comment) {
      const plainLines = plainBody.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);
      for (let i = 0; i < plainLines.length; i++) {
        const line = plainLines[i];
        if (line.match(/(?:bintang|stars?|★|⭐)/i) && i + 1 < plainLines.length) {
          const nextLine = plainLines[i + 1];
          if (!nextLine.match(/(?:balas|tanggapi|lihat ulasan|reply|google|kelola|buka|maps)/i) && nextLine.length > 2) {
            comment = nextLine;
            break;
          }
        }
      }
    }

    if (comment) {
      comment = comment
        .replace(/Balas ulasan.*$/i, "")
        .replace(/Lihat ulasan.*$/i, "")
        .replace(/Reply to review.*$/i, "")
        .replace(/Google LLC.*$/i, "")
        .replace(/<[^>]+>/g, "")
        .trim();
    }

    // 4. Ekstraksi URL Balas/Lihat Ulasan
    const urlMatch = htmlBody.match(/https?:\/\/(?:business\.google\.com|maps\.google\.com|www\.google\.com\/maps|maps\.app\.goo\.gl|g\.page)[^"'\s<>]+/i);
    if (urlMatch && urlMatch[0]) {
      reviewUrl = urlMatch[0].replace(/&amp;/g, "&");
    }

    return {
      reviewerName: reviewerName,
      rating: rating,
      comment: comment,
      date: date,
      reviewUrl: reviewUrl
    };
  } catch (err) {
    Logger.log("Peringatan parseGoogleReviewMessage_: " + err.toString());
    return null;
  }
}

/**
 * Uji coba kirim notifikasi Google Review ke Telegram dari Editor Apps Script
 */
function testSendGoogleReviewAlert() {
  const sampleReview = {
    reviewerName: "Budi Santoso (Uji Coba)",
    rating: 5,
    comment: "Pelayanan sangat ramah, dokternya komunikatif, tempat bersih dan nyaman, ananda sama sekali tidak merasa takut saat khitan. Metode super ring mantap! Terima kasih Rumah Khitan Damai 🙏✨",
    date: new Date(),
    reviewUrl: GOOGLE_REVIEW_PAGE_URL
  };
  return sendTelegramGoogleReviewNotification_(sampleReview);
}

/**
 * Diagnostik komprehensif email Google Review & akun Gmail untuk Bot Telegram
 */
function diagnoseGoogleReviews_() {
  const accountEmail = getScriptUserEmail_();
  let unreadInbox = 0;
  try {
    unreadInbox = GmailApp.getInboxUnreadCount();
  } catch (e) {
    unreadInbox = "Error: " + e.message;
  }

  // Uji koneksi real-time ke Google Maps
  let realtimeStatus = "Sedang memeriksa...";
  let realtimeSnippet = "";
  try {
    const rtList = fetchGoogleMapsReviewsRealtime_(GOOGLE_MAPS_FEATURE_ID, 3);
    if (rtList && rtList.length > 0) {
      realtimeStatus = "✅ Terhubung Real-time (" + rtList.length + " ulasan terkini diambil)";
      const topRev = rtList[0];
      const stars = "⭐".repeat(Math.max(1, Math.min(5, topRev.rating)));
      realtimeSnippet = "• <b>Ulasan Terkini di Google Maps:</b> " + escapeTelegramHtml_(topRev.reviewerName) + " (" + stars + ") — <i>" + escapeTelegramHtml_(topRev.timeAgo || "-") + "</i>\n" +
        (topRev.comment ? ("  💬 <i>\"" + escapeTelegramHtml_(topRev.comment.slice(0, 100)) + "\"</i>\n") : "");
    } else {
      realtimeStatus = "⚠️ Tidak ada data dari server Google Maps";
    }
  } catch (rtErr) {
    realtimeStatus = "⚠️ Error: " + rtErr.toString();
  }

  const queries = [
    'in:anywhere (ulasan OR review OR "Google Business" OR "Google Bisnisku" OR "Google Maps" OR rating OR bintang)',
    'in:anywhere (from:google.com OR from:googlemail.com)',
    'in:anywhere (ulasan OR review)',
    'in:anywhere is:unread'
  ];

  const queryResults = [];
  const candidateMessages = [];
  const seenMsgIds = {};

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    try {
      const threads = GmailApp.search(q, 0, 5);
      const count = threads.length;
      queryResults.push("• <code>" + escapeTelegramHtml_(q) + "</code>: <b>" + count + " thread</b>");

      for (let j = 0; j < threads.length; j++) {
        const msgs = threads[j].getMessages();
        for (let m = 0; m < msgs.length; m++) {
          const msg = msgs[m];
          const mId = msg.getId();
          if (!seenMsgIds[mId]) {
            seenMsgIds[mId] = true;
            candidateMessages.push(msg);
          }
        }
      }
    } catch (qErr) {
      queryResults.push("• <code>" + escapeTelegramHtml_(q) + "</code>: ⚠️ " + escapeTelegramHtml_(qErr.message));
    }
  }

  // Ambil 5 email teratas yang paling relevan
  candidateMessages.sort(function(a, b) {
    return b.getDate().getTime() - a.getDate().getTime();
  });
  const topMsgs = candidateMessages.slice(0, 5);

  let msgListText = "";
  if (topMsgs.length === 0) {
    msgListText = "<i>Tidak ada email terkait Google atau ulasan yang ditemukan di seluruh kotak masuk, arsip, maupun spam akun ini.</i>\n";
  } else {
    for (let k = 0; k < topMsgs.length; k++) {
      const curMsg = topMsgs[k];
      const subj = curMsg.getSubject() || "(Tanpa Subjek)";
      const sender = curMsg.getFrom() || "(Tanpa Pengirim)";
      const dStr = Utilities.formatDate(curMsg.getDate(), "Asia/Jakarta", "dd MMM yyyy HH:mm");
      const parsed = parseGoogleReviewMessage_(curMsg, GOOGLE_REVIEW_PAGE_URL);
      const parseStatus = parsed ? ("✅ Review valid (" + parsed.rating + "⭐ • " + escapeTelegramHtml_(parsed.reviewerName) + ")") : "❌ Bukan format review";

      msgListText += (k + 1) + ". <b>" + escapeTelegramHtml_(subj) + "</b>\n" +
        "   👤 Dari: <code>" + escapeTelegramHtml_(sender) + "</code>\n" +
        "   📅 Waktu: " + dStr + " WIB\n" +
        "   📊 Status: " + parseStatus + "\n\n";
    }
  }

  const report = "🔍 <b>DIAGNOSTIK GMAIL & GOOGLE REVIEW</b> 📋\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "🌐 <b>Google Maps Real-time:</b> " + realtimeStatus + "\n" +
    "🔗 <b>URL Google Review:</b> " + GOOGLE_REVIEW_PAGE_URL + "\n" +
    (realtimeSnippet ? (realtimeSnippet + "━━━━━━━━━━━━━━━━━━\n") : "") +
    "👤 <b>Akun Gmail Script:</b>\n" +
    "<code>" + escapeTelegramHtml_(accountEmail) + "</code>\n" +
    "📬 <b>Email Notifikasi Terdaftar:</b>\n" +
    "• <code>denluckyman@gmail.com</code> (Aktif)\n" +
    "📥 <b>Unread Inbox:</b> " + unreadInbox + " pesan\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "🔎 <b>Hasil Uji Kueri Penelusuran:</b>\n" +
    queryResults.join("\n") + "\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "📧 <b>Email Terkait Google Terbaru di Akun Ini:</b>\n\n" +
    msgListText +
    "━━━━━━━━━━━━━━━━━━\n" +
    "💡 <i>Sistem memeriksa ulasan Google Maps secara real-time langsung ke link resmi bisnis.</i>";

  return report;
}

/**
 * Memeriksa ulasan Google Review secara real-time langsung ke Google Maps & cadangan Gmail
 * @param {boolean} [forceReset] Jika true, bersihkan riwayat ID lama agar ulasan yang pernah terlewat dipindai ulang
 */
function checkGoogleReviewsAndNotify_(forceReset) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { success: false, locked: true, message: "Pengecekan ulasan sedang berjalan oleh proses lain." };
  }

  try {
    const props = PropertiesService.getScriptProperties();
    let processedIds = [];
    const isInitialRun = (props && props.getProperty("KD_PROCESSED_REVIEW_MSG_IDS") === null);

    if (forceReset) {
      if (props) props.deleteProperty("KD_PROCESSED_REVIEW_MSG_IDS");
      processedIds = [];
    } else {
      try {
        const rawStored = props ? props.getProperty("KD_PROCESSED_REVIEW_MSG_IDS") : null;
        if (rawStored) processedIds = JSON.parse(rawStored);
        if (!Array.isArray(processedIds)) processedIds = [];
      } catch (e) {
        processedIds = [];
      }
    }

    let notifiedCount = 0;

    // 1. PEMERIKSAAN REAL-TIME LANGSUNG KE GOOGLE MAPS
    const realtimeReviews = fetchGoogleMapsReviewsRealtime_(GOOGLE_MAPS_FEATURE_ID, 20);
    const nowMs = Date.now();
    // Ambang batas review baru: maksimal 48 jam terakhir
    const MAX_RECENT_MS = 48 * 60 * 60 * 1000;

    for (let rIdx = 0; rIdx < realtimeReviews.length; rIdx++) {
      const rev = realtimeReviews[rIdx];
      const isProcessed = processedIds.indexOf(rev.id) !== -1;
      const isRecent = rev.epochMs > 0
        ? ((nowMs - rev.epochMs) < MAX_RECENT_MS)
        : (rev.timeAgo.indexOf("jam") !== -1 || rev.timeAgo.indexOf("menit") !== -1 || rev.timeAgo.indexOf("hari") !== -1);

      if (!isProcessed) {
        // Jika ulasan baru (< 48 jam / jam / menit / hari ini) atau dipaksa reset: WAJIB kirim notifikasi
        if (isRecent || forceReset) {
          const sendRes = sendTelegramGoogleReviewNotification_(rev);
          let emailOk = false;
          try {
            for (let mIdx = 0; mIdx < GOOGLE_REVIEW_RECIPIENT_EMAILS.length; mIdx++) {
              sendEmailGoogleReviewNotification_(rev, GOOGLE_REVIEW_RECIPIENT_EMAILS[mIdx]);
            }
            emailOk = true;
          } catch (mailNotifErr) {
            Logger.log("Peringatan sendEmailGoogleReviewNotification_: " + mailNotifErr.toString());
          }

          if (sendRes && sendRes.success) {
            notifiedCount++;
            processedIds.push(rev.id);
          } else if (emailOk) {
            processedIds.push(rev.id);
          } else {
            Logger.log("Gagal mengirim notifikasi ulasan " + rev.id + ", akan dicoba ulang pada siklus berikutnya.");
          }
        } else {
          // Ulasan lama (> 48 jam / bulan lalu) hanya dicatat di processedIds agar tidak spam
          processedIds.push(rev.id);
        }
      }
    }

    // 2. PEMERIKSAAN CADANGAN VIA GMAIL (Menangkap email masuk jika ada)
    try {
      const queries = [
        'in:anywhere (ulasan OR review OR "Google Business" OR "Google Bisnisku" OR "Google Maps" OR rating OR bintang) newer_than:30d',
        'in:anywhere subject:("ulasan baru" OR "new review" OR "memberi ulasan" OR "mengulas" OR "left a review" OR "menulis ulasan") newer_than:30d'
      ];
      const seenThreadIds = {};
      const threads = [];
      for (let k = 0; k < queries.length; k++) {
        try {
          const found = GmailApp.search(queries[k], 0, 10);
          if (found && found.length > 0) {
            for (let mIdx = 0; mIdx < found.length; mIdx++) {
              const t = found[mIdx];
              const tId = t.getId();
              if (!seenThreadIds[tId]) {
                seenThreadIds[tId] = true;
                threads.push(t);
              }
            }
          }
        } catch (searchErr) {
          Logger.log("Peringatan pencarian Gmail: " + searchErr.toString());
        }
      }

      for (let i = 0; i < threads.length; i++) {
        const thread = threads[i];
        const messages = thread.getMessages();
        for (let j = 0; j < messages.length; j++) {
          const msg = messages[j];
          const msgId = msg.getId();
          if (processedIds.indexOf(msgId) !== -1) continue;

          const parsed = parseGoogleReviewMessage_(msg, GOOGLE_REVIEW_PAGE_URL);
          if (parsed) {
            // Hindari duplikat jika ulasan sudah dinotifikasi via Real-time Google Maps
            const isDuplicate = realtimeReviews.some(function(rt) {
              return rt.reviewerName && parsed.reviewerName &&
                rt.reviewerName.toLowerCase().trim() === parsed.reviewerName.toLowerCase().trim();
            });

            if (!isDuplicate) {
              const sendRes = sendTelegramGoogleReviewNotification_(parsed);
              try {
                for (let rIdx = 0; rIdx < GOOGLE_REVIEW_RECIPIENT_EMAILS.length; rIdx++) {
                  sendEmailGoogleReviewNotification_(parsed, GOOGLE_REVIEW_RECIPIENT_EMAILS[rIdx]);
                }
              } catch (mailNotifErr) {
                Logger.log("Peringatan sendEmailGoogleReviewNotification_: " + mailNotifErr.toString());
              }

              if (sendRes && sendRes.success) {
                notifiedCount++;
              }
            }
            processedIds.push(msgId);
          }

          if (msg.isUnread()) {
            try { msg.markRead(); } catch (mErr) {}
          }
        }
        if (thread.isUnread()) {
          try { thread.markRead(); } catch (tErr) {}
        }
      }
    } catch (gErr) {
      Logger.log("Catatan pemindaian cadangan Gmail: " + gErr.toString());
    }

    if (processedIds.length > 150) {
      processedIds = processedIds.slice(-150);
    }
    if (props) {
      props.setProperty("KD_PROCESSED_REVIEW_MSG_IDS", JSON.stringify(processedIds));
      props.setProperty("KD_LAST_CHECK_REVIEW_TIME", Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"));
    }

    const latestReview = (realtimeReviews && realtimeReviews.length > 0) ? realtimeReviews[0] : null;

    return {
      success: true,
      found: notifiedCount,
      realtimeReviewsCount: realtimeReviews.length,
      realtimeReviews: realtimeReviews,
      latestReview: latestReview,
      accountEmail: getScriptUserEmail_(),
      message: notifiedCount > 0 ? (notifiedCount + " notifikasi ulasan baru dikirim ke Telegram & Email.") : "Tidak ada ulasan baru."
    };
  } catch (err) {
    Logger.log("Peringatan checkGoogleReviewsAndNotify_: " + err.toString());
    return { success: false, error: err.toString(), accountEmail: getScriptUserEmail_() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Memformat daftar 10 ulasan Google Review terbaru untuk ditampilkan di pesan Telegram
 * @param {Array<Object>} reviews Daftar ulasan dari Google Maps
 * @param {string} [accountEmail] Alamat email pemilik script / penerima notifikasi
 * @return {string} Pesan berformat HTML Telegram
 */
function format10GoogleReviewsText_(reviews, accountEmail) {
  const top10 = (reviews && Array.isArray(reviews)) ? reviews.slice(0, 10) : [];
  const checkTime = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd MMMM yyyy, HH:mm:ss") + " WIB";
  const emailDisplay = accountEmail || "denluckyman@gmail.com";

  if (top10.length === 0) {
    return "⭐ <b>10 GOOGLE REVIEW TERBARU REAL-TIME</b> 📋\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "⚠️ <i>Belum ada ulasan yang berhasil dimuat dari server Google Maps. Silakan coba sesaat lagi.</i>\n\n" +
      "🌐 <b>Tautan Resmi:</b> " + GOOGLE_REVIEW_PAGE_URL;
  }

  let text = "⭐ <b>10 GOOGLE REVIEW TERBARU REAL-TIME</b> ⭐\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "📍 <b>Profil:</b> Rumah Khitan Damai Subang\n" +
    "🌐 <b>Status:</b> Google Maps Real-time ✅\n" +
    "🕒 <b>Waktu Periksa:</b> " + checkTime + "\n" +
    "━━━━━━━━━━━━━━━━━━\n\n";

  for (let i = 0; i < top10.length; i++) {
    const rev = top10[i];
    const num = i + 1;
    const name = escapeTelegramHtml_(rev.reviewerName || "Pengguna Google");
    const starsNum = Math.max(1, Math.min(5, parseInt(rev.rating || 5, 10)));
    const stars = "⭐".repeat(starsNum);
    const timeAgo = escapeTelegramHtml_(rev.timeAgo || "-");
    let comment = (rev.comment || "").trim();
    if (comment.length > 120) {
      comment = comment.slice(0, 117) + "...";
    }

    text += "<b>" + num + ". " + name + "</b> " + stars + "\n" +
      "   🕒 <i>" + timeAgo + "</i>\n";

    if (comment) {
      text += "   💬 <i>\"" + escapeTelegramHtml_(comment) + "\"</i>\n";
    } else {
      text += "   <i>(Rating " + starsNum + " bintang tanpa ulasan tertulis)</i>\n";
    }
    text += "\n";
  }

  text += "━━━━━━━━━━━━━━━━━━\n" +
    "📬 <b>Penerima Email:</b> <code>" + escapeTelegramHtml_(emailDisplay) + "</code>\n" +
    "⏰ <b>Pemantau Otomatis:</b> Aktif (tiap 5 menit)\n" +
    "💡 <i>Tekan tombol di bawah untuk membuka langsung di Google Review.</i>";

  return text;
}

/**
 * Handler Time-Driven Trigger khusus pengecekan ulasan Google Review (berjalan tiap 5 menit)
 */
function checkGoogleReviewsTrigger() {
  return checkGoogleReviewsAndNotify_();
}

/**
 * Memastikan trigger otomatis untuk Google Review (setiap 5 menit)
 * dan Reminder Jadwal Khitan (setiap 1 jam) sudah terpasang rapi di Apps Script
 */
function ensureAutomaticTriggers_() {
  const props = PropertiesService.getScriptProperties();
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let reviewCount = 0;
    let reminderCount = 0;

    for (let i = 0; i < triggers.length; i++) {
      const t = triggers[i];
      const fn = t.getHandlerFunction();
      if (fn === "checkGoogleReviewsTrigger") {
        reviewCount++;
        if (reviewCount > 1) {
          try { ScriptApp.deleteTrigger(t); } catch (e) {}
        }
      } else if (fn === "checkUpcomingKhitanReminders") {
        reminderCount++;
        if (reminderCount > 1) {
          try { ScriptApp.deleteTrigger(t); } catch (e) {}
        }
      }
    }

    if (reviewCount === 0) {
      ScriptApp.newTrigger("checkGoogleReviewsTrigger")
        .timeBased()
        .everyMinutes(5)
        .create();
      Logger.log("✓ Trigger checkGoogleReviewsTrigger (5 menit) berhasil dibuat.");
    }

    if (reminderCount === 0) {
      ScriptApp.newTrigger("checkUpcomingKhitanReminders")
        .timeBased()
        .everyHours(1)
        .create();
      Logger.log("✓ Trigger checkUpcomingKhitanReminders (1 jam) berhasil dibuat.");
    }

    if (props) {
      props.setProperty("KD_AUTO_TRIGGERS_INSTALLED", "true");
    }

    try {
      registerTelegramBotCommands_();
    } catch (cmdErr) {
      Logger.log("Catatan pendaftaran commands bot di ensureAutomaticTriggers_: " + cmdErr.toString());
    }

    return {
      success: true,
      reviewTriggerActive: true,
      reminderTriggerActive: true,
      totalTriggers: triggers.length
    };
  } catch (err) {
    Logger.log("Catatan ensureAutomaticTriggers_: " + err.toString());
    const wasInstalled = props && props.getProperty("KD_AUTO_TRIGGERS_INSTALLED") === "true";
    return {
      success: wasInstalled,
      error: err.toString(),
      permissionNeeded: true
    };
  }
}

/**
 * Memasang trigger berkala khusus pengecekan Google Review (default: setiap 5 menit)
 */
function setupGoogleReviewTrigger(minutes) {
  try {
    const validMinutes = [1, 5, 10, 15, 30];
    const interval = (minutes && validMinutes.indexOf(minutes) !== -1) ? minutes : 5;
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "checkGoogleReviewsTrigger") {
        return "Trigger time-driven checkGoogleReviewsTrigger sudah aktif sebelumnya (interval " + interval + " menit).";
      }
    }
    ScriptApp.newTrigger("checkGoogleReviewsTrigger")
      .timeBased()
      .everyMinutes(interval)
      .create();
    return "Trigger time-driven checkGoogleReviewsTrigger berhasil dipasang (setiap " + interval + " menit).";
  } catch (err) {
    return "Catatan setup trigger review: " + err.message;
  }
}

/**
 * Menyusun template teks WhatsApp Reminder (identik dengan Panel Admin)
 */
function buildWaReminderText_(b) {
  if (!b) return "";
  const namaOrtu = b.namaPenanggungJawab || b.namaOrtu || "-";
  const namaAnanda = b.namaAnanda || b.namaAnak || "-";
  const tglKhitan = (b.tanggalKhitan || b.tglKhitan) ? formatIndonesianDateStr_(b.tanggalKhitan || b.tglKhitan) : "-";
  const jamKhitan = b.jamKhitan || "-";
  const sapaan = resolveSapaanWa_(b.hubunganKeluarga);

  const lines = [
    "Assalamu’alaikum Warahmatullahi Wabarakatuh 🌙",
    "",
    "Selamat sore " + sapaan + " 😊",
    namaOrtu,
    "",
    "Kami ingin mengingatkan kembali mengenai jadwal khitan Ananda 👦",
    namaAnanda,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "📅 Tanggal Khitan : " + tglKhitan,
    "🕒 Jam Khitan : " + jamKhitan,
    "━━━━━━━━━━━━━━━━━━",
    "",
    "Mohon Ayah, Bunda serta Ananda untuk beristirahat yang cukup malam ini 😴",
    "Usahakan tidur tidak terlalu larut agar kondisi Ananda tetap fit dan nyaman saat proses khitan berlangsung 😊",
    "",
    "Semoga proses khitan besok berjalan lancar, diberikan kemudahan, dan selalu dalam lindungan Allah SWT 🤲",
    "Aamiin Ya Rabbal ‘Alamiin ✨",
    "",
    "📝 Persiapan Sebelum Berangkat :",
    "✅ Mandi seperti biasa",
    "✅ BAK / BAB terlebih dahulu bila perlu",
    "✅ Sarapan secukupnya",
    "✅ Membawa celana longgar atau sarung",
    "✅ Membawa mainan atau HP agar Ananda lebih rileks 🎮📱",
    "",
    "Terima kasih atas perhatian " + sapaan + " 🙏",
    "",
    "Hormat Kami,",
    "🏥 Admin Rumah Khitan Damai"
  ];
  return lines.join("\n");
}

/**
 * Mengirim pesan notifikasi peringatan jadwal < 12 Jam ke Telegram Admin
 */
function sendTelegramReminderNotification_(item, diffHours) {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken || !config.chatId) {
      Logger.log("Peringatan: Telegram Bot Token atau Chat ID belum dikonfigurasi.");
      return { success: false, message: "Token atau Chat ID kosong" };
    }

    const id = item.idBooking || item.register || item.id || "-";
    const namaAnanda = item.namaAnanda || item.namaAnak || "-";
    const namaPj = item.namaPenanggungJawab || item.namaOrtu || "-";
    const hubungan = item.hubunganKeluarga || "Orang Tua / Wali";
    const sapaan = resolveSapaanWa_(hubungan);
    const noHp = item.nomorHp || item.noHp || "-";
    const tglKhitan = (item.tanggalKhitan || item.tglKhitan) ? formatIndonesianDateStr_(item.tanggalKhitan || item.tglKhitan) : "-";
    const jamKhitan = formatJamDisplay_(item.jamKhitan);
    let sisaJamText = "Kurang dari 12 Jam!";
    if (typeof diffHours === "number") {
      if (diffHours < 1) {
        const sisaMenit = Math.max(1, Math.round(diffHours * 60));
        sisaJamText = "± " + sisaMenit + " Menit lagi menuju tindakan!";
      } else {
        sisaJamText = "± " + Math.round(diffHours) + " Jam lagi menuju tindakan!";
      }
    }

    const text = "⏰ <b>PENGINGAT JADWAL KHITAN (&lt; 12 JAM)</b> 🔔\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "📋 <b>ID / Register:</b> <code>" + escapeTelegramHtml_(id) + "</code>\n" +
      "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
      "👨‍👩‍👦 <b>Penanggung Jawab:</b> " + escapeTelegramHtml_(namaPj) + " (" + escapeTelegramHtml_(sapaan) + ")\n" +
      "📱 <b>WhatsApp:</b> " + escapeTelegramHtml_(noHp) + "\n" +
      "📅 <b>Jadwal Khitan:</b> " + escapeTelegramHtml_(tglKhitan) + "\n" +
      "🕒 <b>Jam Pelaksanaan:</b> " + escapeTelegramHtml_(jamKhitan) + "\n" +
      "⏳ <b>Sisa Waktu:</b> " + escapeTelegramHtml_(sisaJamText) + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "💡 <i>Harap ingatkan keluarga pasien untuk istirahat malam cukup & persiapan perlengkapan.</i>";

    const cleanPhone = cleanPhoneForWa_(noHp);
    const waText = buildWaReminderText_(item);
    const directWaUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(waText);
    const waUrl = buildWaTrackingUrl_(id, "reminder", directWaUrl);

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "🔔 Kirim WhatsApp Reminder",
            url: waUrl
          }
        ]
      ]
    };

    const targetChatIds = getAdminTelegramChatIds_();
    let anySuccess = false;
    for (let c = 0; c < targetChatIds.length; c++) {
      const aId = targetChatIds[c];
      if (!aId) continue;
      const res = sendTelegramMessage_(aId, text, replyMarkup);
      if (res && res.success) anySuccess = true;
    }
    return { success: anySuccess };
  } catch (err) {
    Logger.log("sendTelegramReminderNotification_ error: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Membersihkan Script Properties reminder kedaluwarsa (> 30 hari)
 */
function pruneExpiredReminderProperties_(props, nowMs) {
  try {
    const lastPruneStr = props.getProperty("remind_last_prune_time");
    const lastPrune = lastPruneStr ? parseInt(lastPruneStr, 10) : 0;
    // Jalankan pembersihan maksimal sekali setiap 3 hari
    if (nowMs - lastPrune < 3 * 24 * 60 * 60 * 1000) return;

    const allProps = props.getProperties();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const keysToDelete = [];

    for (const k in allProps) {
      if (
        k.indexOf("remind_sent_") === 0 ||
        k.indexOf("remind_pat24_") === 0 ||
        k.indexOf("remind_pat2_") === 0 ||
        k.indexOf("aftercare_sent_") === 0
      ) {
        const val = allProps[k] || "";
        let dateToCheck = "";
        if (val.indexOf("|") !== -1) {
          dateToCheck = val.split("|")[0].split(" ")[0]; // YYYY-MM-DD
        } else if (val.length >= 10) {
          dateToCheck = val.substring(0, 10);
        }
        if (dateToCheck && /^\d{4}-\d{2}-\d{2}$/.test(dateToCheck)) {
          const itemMs = new Date(dateToCheck + "T00:00:00+07:00").getTime();
          if (!isNaN(itemMs) && (nowMs - itemMs) > THIRTY_DAYS_MS) {
            keysToDelete.push(k);
          }
        }
      }
    }

    for (let d = 0; d < keysToDelete.length; d++) {
      props.deleteProperty(keysToDelete[d]);
    }
    props.setProperty("remind_last_prune_time", String(nowMs));
    if (keysToDelete.length > 0) {
      Logger.log("Pembersihan cache reminder: " + keysToDelete.length + " entri kedaluwarsa dihapus.");
    }
  } catch (e) {
    Logger.log("Peringatan saat membersihkan properti reminder: " + e.toString());
  }
}

/**
 * Memindai Sheet BOOKING untuk jadwal khitan yang akan berlangsung < 12 Jam ke depan
 * dan mengirimkan notifikasi Telegram otomatis (dengan proteksi anti-duplikasi, penanganan reschedule, & lock).
 */
function checkAndSendUpcomingReminders_() {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    Logger.log("checkAndSendUpcomingReminders_ dilewati karena proses pemindaian lain sedang berjalan.");
    return { checked: 0, sent: 0, locked: true };
  }

  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { checked: 0, sent: 0 };

    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    const now = new Date();
    const nowMs = now.getTime();
    let sentCount = 0;
    let sentPatientCount = 0;
    const upcomingItems = [];
    const props = PropertiesService.getScriptProperties();

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const id = String(row[0] || "").trim();
      const namaAnanda = String(row[1] || "").trim();
      let tglKhitanStr = row[5];
      let jamKhitanStr = String(row[6] || "").trim();
      const noHp = String(row[14] || "").trim();
      const status = String(row[21] || "").trim().toLowerCase();

      // Skip jika tidak ada ID, tidak ada nomor HP, atau status Batal/Selesai
      if (!id || !noHp || status === "batal" || status === "selesai") continue;

      // Normalisasi tanggal khitan (format YYYY-MM-DD)
      if (tglKhitanStr instanceof Date) {
        tglKhitanStr = Utilities.formatDate(tglKhitanStr, "Asia/Jakarta", "yyyy-MM-dd");
      } else {
        tglKhitanStr = normalizeYmd_(tglKhitanStr);
      }
      if (!tglKhitanStr || tglKhitanStr.length < 10) continue;

      // Normalisasi jam khitan (default 08:00 jika kosong)
      if (!jamKhitanStr || jamKhitanStr === "-") {
        jamKhitanStr = "08:00";
      }
      const jamClean = jamKhitanStr.replace(".", ":");
      const jamParts = jamClean.match(/(\d{1,2}):(\d{2})/);
      const hour = jamParts ? parseInt(jamParts[1], 10) : 8;
      const minute = jamParts ? parseInt(jamParts[2], 10) : 0;
      const hourPad = hour < 10 ? "0" + hour : String(hour);
      const minPad = minute < 10 ? "0" + minute : String(minute);

      // Buat target datetime khitan di WIB (eksplisit UTC+07:00 agar independen dari timezone server)
      const targetIso = tglKhitanStr.substring(0, 10) + "T" + hourPad + ":" + minPad + ":00+07:00";
      const targetDate = new Date(targetIso);
      const targetMs = targetDate.getTime();

      // Hitung selisih jam
      const diffHours = (targetMs - nowMs) / (1000 * 60 * 60);

      const item = {
        idBooking: id,
        namaAnanda: namaAnanda,
        namaPenanggungJawab: String(row[10] || "").trim(),
        hubunganKeluarga: String(row[13] || "").trim(),
        nomorHp: noHp,
        tanggalKhitan: tglKhitanStr,
        jamKhitan: jamKhitanStr,
        metodeKhitan: String(row[7] || "Standar").trim()
      };

      const targetSlot = tglKhitanStr.substring(0, 10) + " " + hourPad + ":" + minPad;

      // 1. Kriteria Admin: Kurang dari 12 jam ke depan (> 0 dan <= 12 jam)
      if (diffHours > 0 && diffHours <= 12) {
        upcomingItems.push({
          item: item,
          diffHours: diffHours
        });

        const propKey = "remind_sent_" + id;
        const alreadySent = props.getProperty(propKey);

        let shouldSend = false;
        if (!alreadySent) {
          shouldSend = true;
        } else if (alreadySent.indexOf("|") !== -1) {
          const sentSlot = alreadySent.split("|")[0];
          // Jika jadwal di-reschedule ke slot waktu baru, kirim reminder untuk jadwal baru
          if (sentSlot !== targetSlot) {
            shouldSend = true;
          }
        } else {
          // Format warisan lama (hanya timestamp pengiriman)
          const oldSentDate = new Date(alreadySent.replace(" ", "T") + "+07:00").getTime();
          if (!isNaN(oldSentDate) && (nowMs - oldSentDate) < 12 * 3600 * 1000) {
            props.setProperty(propKey, targetSlot + "|" + alreadySent);
            shouldSend = false;
          } else {
            shouldSend = true;
          }
        }

        if (shouldSend) {
          const res = sendTelegramReminderNotification_(item, diffHours);
          if (res.success) {
            const sentTimestamp = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
            props.setProperty(propKey, targetSlot + "|" + sentTimestamp);
            sentCount++;
            Logger.log("Reminder Telegram terkirim untuk Admin: " + id + " (" + namaAnanda + ") jadwal: " + targetSlot);
          }
        }
      }

      // 2. Kriteria Pasien: Pengingat H-24 (Persiapan Tindakan) (20 s/d 26 jam, ideal H-1)
      if (diffHours > 20 && diffHours <= 26) {
        const propKeyPat24 = "remind_pat24_" + id;
        const alreadySent24 = props.getProperty(propKeyPat24);
        let shouldSend24 = false;
        if (!alreadySent24) {
          shouldSend24 = true;
        } else if (alreadySent24.indexOf("|") !== -1) {
          if (alreadySent24.split("|")[0] !== targetSlot) shouldSend24 = true;
        }

        if (shouldSend24) {
          const pat24Res = sendPatientH24ReminderTelegram_(item);
          if (pat24Res) {
            props.setProperty(propKeyPat24, targetSlot + "|" + Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"));
            sentPatientCount++;
            Logger.log("Reminder H-24 terkirim ke pasien: " + id);
          }
        }
      }

      // 3. Kriteria Pasien: Pengingat H-2 Jam (Menuju Tindakan Hari Ini) (1 s/d 3 jam, ideal H-2 jam)
      if (diffHours > 1 && diffHours <= 3) {
        const propKeyPat2 = "remind_pat2_" + id;
        const alreadySent2 = props.getProperty(propKeyPat2);
        let shouldSend2 = false;
        if (!alreadySent2) {
          shouldSend2 = true;
        } else if (alreadySent2.indexOf("|") !== -1) {
          if (alreadySent2.split("|")[0] !== targetSlot) shouldSend2 = true;
        }

        if (shouldSend2) {
          const pat2Res = sendPatientH2ReminderTelegram_(item, diffHours);
          if (pat2Res) {
            props.setProperty(propKeyPat2, targetSlot + "|" + Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"));
            sentPatientCount++;
            Logger.log("Reminder H-2 jam terkirim ke pasien: " + id);
          }
        }
      }
    }

    // Pembersihan properti reminder kedaluwarsa secara berkala
    pruneExpiredReminderProperties_(props, nowMs);

    return { checked: values.length, sent: sentCount, items: upcomingItems };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handler Time-Driven Trigger Google Apps Script (berjalan setiap 1 jam)
 */
function checkUpcomingKhitanReminders() {
  try {
    maybeRunMonthlyBackup_();
  } catch (backupErr) {
    Logger.log("Peringatan: Gagal memproses backup bulanan otomatis: " + backupErr.toString());
  }
  try {
    ensureTelegramWebhookRegistered_();
  } catch (whErr) {
    Logger.log("Peringatan: Gagal menyinkronkan webhook Telegram otomatis: " + whErr.toString());
  }
  try {
    ensureAutomaticTriggers_();
  } catch (trErr) {
    Logger.log("Peringatan: Gagal menyinkronkan triggers otomatis: " + trErr.toString());
  }
  try {
    checkGoogleReviewsAndNotify_();
  } catch (revErr) {
    Logger.log("Peringatan: Gagal memeriksa Google Reviews: " + revErr.toString());
  }
  return checkAndSendUpcomingReminders_();
}

/**
 * Fungsi untuk mengaktifkan trigger otomatis setiap 1 jam sekali
 */
function setupHourlyReminderTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "checkUpcomingKhitanReminders") {
        return "Trigger time-driven checkUpcomingKhitanReminders sudah aktif sebelumnya.";
      }
    }
    ScriptApp.newTrigger("checkUpcomingKhitanReminders")
      .timeBased()
      .everyHours(1)
      .create();
    return "Trigger time-driven checkUpcomingKhitanReminders berhasil dipasang (setiap 1 jam).";
  } catch (err) {
    return "Catatan setup trigger: " + err.message;
  }
}

/**
 * Mengirim pesan umum ke Telegram Bot (dilengkapi pemecah pesan otomatis jika panjang > 3800 karakter)
 */
function sendTelegramMessage_(chatId, text, replyMarkup) {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken) return { success: false, message: "Token bot belum dikonfigurasi" };

    const MAX_LEN = 3800; // Batas aman di bawah limit Telegram 4096 karakter
    const str = String(text || "");
    const chunks = [];

    if (str.length <= MAX_LEN) {
      chunks.push(str);
    } else {
      const lines = str.split("\n");
      let currentChunk = "";
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        while (line.length > MAX_LEN) {
          const part = line.substring(0, MAX_LEN);
          line = line.substring(MAX_LEN);
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = "";
          }
          chunks.push(part);
        }
        if ((currentChunk + "\n" + line).length > MAX_LEN) {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk = currentChunk ? (currentChunk + "\n" + line) : line;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
    }

    let lastResult = { success: true };
    for (let c = 0; c < chunks.length; c++) {
      const payload = {
        chat_id: chatId,
        text: chunks[c],
        parse_mode: "HTML",
        disable_web_page_preview: true
      };
      // Sertakan replyMarkup pada potongan pesan terakhir
      if (c === chunks.length - 1 && replyMarkup) {
        payload.reply_markup = replyMarkup;
      }
      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      const response = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.botToken + "/sendMessage", options);
      const code = response.getResponseCode();
      const resText = response.getContentText();
      lastResult = { success: code === 200, response: resText };
    }
    return lastResult;
  } catch (err) {
    Logger.log("sendTelegramMessage_ error: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Memperbarui (edit) teks & reply_markup pesan Telegram yang sudah terkirim (Edit-in-Place)
 */
function editTelegramMessage_(chatId, messageId, text, replyMarkup) {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken) return { success: false, message: "Token bot belum dikonfigurasi" };
    if (!chatId || !messageId) return { success: false, message: "Chat ID atau Message ID kosong" };

    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: String(text || ""),
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.botToken + "/editMessageText", options);
    const code = response.getResponseCode();
    const resText = response.getContentText();
    return { success: code === 200, response: resText };
  } catch (err) {
    Logger.log("editTelegramMessage_ error: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Mendaftarkan menu perintah (setMyCommands) ke Telegram Bot API
 * Mendukung scope umum (pasien) dan scope chat khusus untuk Admin
 */
function registerTelegramBotCommands_() {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken) return { success: false, message: "Token bot belum dikonfigurasi" };

    const defaultCommands = [
      { command: "start", description: "Bantuan & menu utama bot" },
      { command: "jadwal", description: "Lihat jadwal khitan mendatang" },
      { command: "hariini", description: "Jadwal khitan hari ini" },
      { command: "besok", description: "Jadwal khitan besok" },
      { command: "cek", description: "Cek status booking khitan" },
      { command: "bantuan", description: "Petunjuk penggunaan bot" }
    ];

    const adminCommands = [
      { command: "jadwal", description: "Jadwal khitan mendatang" },
      { command: "hariini", description: "Jadwal khitan hari ini" },
      { command: "besok", description: "Jadwal khitan besok" },
      { command: "cekreminder", description: "Pindai jadwal < 12 jam & tombol WA" },
      { command: "cari", description: "Cari data pasien berdasarkan nama" },
      { command: "statistik", description: "Ringkasan statistik pasien" },
      { command: "selesai", description: "Tandai selesai (/selesai <ID>)" },
      { command: "konfirmasi", description: "Konfirmasi jadwal (/konfirmasi <ID>)" },
      { command: "batal", description: "Batalkan jadwal (/batal <ID>)" },
      { command: "10review", description: "10 Google Review terbaru real-time" },
      { command: "statusbot", description: "Cek status kesehatan bot & trigger" },
      { command: "backup", description: "Backup database ke Google Drive" }
    ];

    // 1. Set commands untuk pengguna default (pasien/umum)
    UrlFetchApp.fetch("https://api.telegram.org/bot" + config.botToken + "/setMyCommands", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        commands: defaultCommands,
        scope: { type: "default" }
      }),
      muteHttpExceptions: true
    });

    // 2. Set commands untuk seluruh akun Admin yang terdaftar
    const adminChatIds = getAdminTelegramChatIds_();
    for (let i = 0; i < adminChatIds.length; i++) {
      const aChatId = adminChatIds[i];
      if (!aChatId) continue;
      try {
        UrlFetchApp.fetch("https://api.telegram.org/bot" + config.botToken + "/setMyCommands", {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify({
            commands: adminCommands,
            scope: { type: "chat", chat_id: aChatId }
          }),
          muteHttpExceptions: true
        });
      } catch (e) {
        Logger.log("Gagal set admin commands for chat " + aChatId + ": " + e.toString());
      }
    }

    return { success: true };
  } catch (err) {
    Logger.log("registerTelegramBotCommands_ error: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Mengirim notifikasi persiapan khitan H-24 (H-1) langsung ke akun Telegram keluarga pasien
 */
function sendPatientH24ReminderTelegram_(item) {
  try {
    const noHp = item.nomorHp || item.noHp;
    if (!noHp) return false;

    const id = item.idBooking || item.id;
    const namaAnanda = item.namaAnanda || item.namaAnak || "-";
    const namaPj = item.namaPenanggungJawab || item.namaOrtu || "-";
    const sapaan = resolveSapaanWa_(item.hubunganKeluarga);
    const tglKhitan = formatIndonesianDateStr_(item.tanggalKhitan || item.tglKhitan);
    const jamKhitan = formatJamDisplay_(item.jamKhitan);
    const metode = item.metodeKhitan || "Standar";

    const text = "🔔 <b>PENGINGAT JADWAL KHITAN BESOK (H-1)</b> 🏥✨\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "Yth. " + sapaan + " <b>" + escapeTelegramHtml_(namaPj) + "</b>,\n\n" +
      "Mengingatkan jadwal khitan Ananda tercinta:\n" +
      "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
      "📋 <b>ID Booking:</b> <code>" + escapeTelegramHtml_(id) + "</code>\n" +
      "📅 <b>Hari/Tanggal:</b> " + escapeTelegramHtml_(tglKhitan) + "\n" +
      "🕒 <b>Waktu Pelaksanaan:</b> " + escapeTelegramHtml_(jamKhitan) + "\n" +
      "✂️ <b>Metode:</b> " + escapeTelegramHtml_(metode) + "\n" +
      "📍 <b>Lokasi:</b> Rumah Khitan Damai Subang\n\n" +
      "<b>Tips Persiapan Sebelum Tindakan:</b>\n" +
      "1. 🛌 Pastikan Ananda tidur dan istirahat cukup malam ini.\n" +
      "2. 🍚 Sarapan / makan secukupnya sebelum berangkat ke klinik.\n" +
      "3. 🚿 Mandi bersih sebelum datang ke klinik.\n" +
      "4. 🩳 Siapkan celana khitan longgar atau sarung untuk kepulangan.\n" +
      "5. ⏱️ Mohon hadir 15 menit lebih awal untuk registrasi ulang.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "🏥 <i>\"Aku Berani Khitan — Nyaman, Modern, dan Menyenangkan\"</i>";

    const buttons = {
      inline_keyboard: [
        [
          { text: "📍 Buka Lokasi di Google Maps", url: "https://maps.app.goo.gl/W3pZFZupzuNU4Cdi9" }
        ],
        [
          { text: "🔍 Rincian Booking Saya", callback_data: "cb_status:" + id }
        ]
      ]
    };

    return notifyPatientTelegram_(noHp, text, buttons);
  } catch (err) {
    Logger.log("sendPatientH24ReminderTelegram_ error: " + err.toString());
    return false;
  }
}

/**
 * Mengirim notifikasi H-2 Jam menuju tindakan langsung ke akun Telegram keluarga pasien
 */
function sendPatientH2ReminderTelegram_(item, diffHours) {
  try {
    const noHp = item.nomorHp || item.noHp;
    if (!noHp) return false;

    const id = item.idBooking || item.id;
    const namaAnanda = item.namaAnanda || item.namaAnak || "-";
    const namaPj = item.namaPenanggungJawab || item.namaOrtu || "-";
    const sapaan = resolveSapaanWa_(item.hubunganKeluarga);
    const jamKhitan = formatJamDisplay_(item.jamKhitan);

    const sisaText = (typeof diffHours === "number" && diffHours < 1) ?
      ("± " + Math.max(1, Math.round(diffHours * 60)) + " Menit") :
      ("± " + (diffHours ? Math.round(diffHours) : 2) + " Jam");

    const text = "⏰ <b>PENGINGAT: " + sisaText.toUpperCase() + " MENUJU TINDAKAN KHITAN</b> 🏥\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "Yth. " + sapaan + " <b>" + escapeTelegramHtml_(namaPj) + "</b>,\n\n" +
      "Jadwal tindakan khitan Ananda <b>" + escapeTelegramHtml_(namaAnanda) + "</b> (ID: <code>" + escapeTelegramHtml_(id) + "</code>) akan segera dimulai hari ini:\n\n" +
      "🕒 <b>Waktu:</b> " + escapeTelegramHtml_(jamKhitan) + " (" + sisaText + " lagi)\n" +
      "📍 <b>Lokasi:</b> Rumah Khitan Damai Subang\n\n" +
      "Mohon tiba di klinik <b>15 menit lebih awal</b> untuk persiapan dan proses registrasi agar Ananda merasa tenang dan nyaman.\n\n" +
      "Sampai bertemu di klinik! Semoga proses khitan berjalan lancar dan penuh berkah. 🌟";

    const buttons = {
      inline_keyboard: [
        [
          { text: "📍 Petunjuk Arah Google Maps", url: "https://maps.app.goo.gl/W3pZFZupzuNU4Cdi9" }
        ],
        [
          { text: "💬 Hubungi Admin via WA", url: "https://api.whatsapp.com/send?phone=6281222531978&text=" + encodeURIComponent("Halo Admin Khitan Damai, kami sedang menuju klinik untuk jadwal khitan ananda " + namaAnanda + " (" + id + ").") }
        ]
      ]
    };

    return notifyPatientTelegram_(noHp, text, buttons);
  } catch (err) {
    Logger.log("sendPatientH2ReminderTelegram_ error: " + err.toString());
    return false;
  }
}

/**
 * Mengirim pesan panduan perawatan pasca-khitan (Aftercare) & ajakan Google Review
 * ke Telegram keluarga pasien saat pendaftaran berstatus "Selesai" (idempotent, dikirim 1x)
 */
function sendAftercareTelegramIfEligible_(bookingId, bookingData) {
  try {
    if (!bookingId) return false;
    const cleanId = String(bookingId).trim().toUpperCase();
    const props = PropertiesService.getScriptProperties();
    const propKey = "aftercare_sent_" + cleanId;
    if (props && props.getProperty(propKey)) {
      return false; // Sudah pernah dikirim sebelumnya
    }

    let namaAnanda = "-";
    let namaPj = "-";
    let hubungan = "-";
    let noHp = "";
    let metode = "Standar";

    if (Array.isArray(bookingData)) {
      namaAnanda = String(bookingData[1] || "-");
      metode = String(bookingData[7] || "Standar");
      namaPj = String(bookingData[10] || "-");
      hubungan = String(bookingData[13] || "-");
      noHp = String(bookingData[14] || "");
    } else if (bookingData && typeof bookingData === "object") {
      namaAnanda = bookingData.namaAnanda || bookingData.namaAnak || "-";
      metode = bookingData.metodeKhitan || "Standar";
      namaPj = bookingData.namaPenanggungJawab || bookingData.namaOrtu || "-";
      hubungan = bookingData.hubunganKeluarga || "-";
      noHp = bookingData.nomorHp || bookingData.noHp || "";
    }

    if (!noHp) return false;
    const cleanPhone = cleanPhoneNumber(noHp);
    if (!cleanPhone) return false;

    const patientChatId = props ? props.getProperty("tg_phone_chat_" + cleanPhone) : null;
    if (!patientChatId) return false;

    const sapaan = resolveSapaanWa_(hubungan);
    const text = "🎉 <b>ALHAMDULILLAH! SELAMAT ATAS KEBERANIAN ANANDA</b> 🌟🏥\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "Yth. " + sapaan + " <b>" + escapeTelegramHtml_(namaPj) + "</b>,\n\n" +
      "Selamat atas keberanian Ananda <b>" + escapeTelegramHtml_(namaAnanda) + "</b> (ID: <code>" + escapeTelegramHtml_(cleanId) + "</code>) yang telah selesai melaksanakan khitan dengan metode <b>" + escapeTelegramHtml_(metode) + "</b> di Rumah Khitan Damai!\n" +
      "Semoga Ananda lekas pulih, sehat selalu, dan menjadi anak sholeh yang membanggakan orang tua. Aamiin 🤲✨\n\n" +
      "📋 <b>PANDUAN PERAWATAN PASCA-KHITAN:</b>\n" +
      "1. 🛌 <b>Istirahat Cukup:</b> Hindari aktivitas berat / berlari selama 2-3 hari pertama.\n" +
      "2. 💊 <b>Minum Obat Teratur:</b> Konsumsi obat pereda nyeri & antibiotik sesuai anjuran medis.\n" +
      "3. 🚿 <b>Kebersihan Luka:</b> Jaga area tindakan tetap bersih dan kering sesuai metode khitan.\n" +
      "4. 🩳 <b>Pakaian Longgar:</b> Kenakan celana khitan khusus atau sarung agar tidak tertekan.\n" +
      "5. 🥩 <b>Nutrisi Sehat:</b> Perbanyak konsumsi makanan tinggi protein (telur, ikan, daging).\n\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "⭐ <b>Dukungan Ulasan Google Review:</b>\n" +
      "Kepuasan dan kenyamanan keluarga Anda adalah prioritas utama kami. Mohon luangkan waktu sejenak untuk memberikan <b>bintang 5 & ulasan positif</b> di Google Review Rumah Khitan Damai. Ulasan Anda sangat bermanfaat bagi keluarga lainnya. 🙏❤️";

    const buttons = {
      inline_keyboard: [
        [
          { text: "⭐ Tulis Ulasan di Google Review", url: GOOGLE_REVIEW_PAGE_URL }
        ],
        [
          { text: "💬 Konsultasi Pasca Khitan via WA", url: "https://api.whatsapp.com/send?phone=6281222531978&text=" + encodeURIComponent("Halo Admin Rumah Khitan Damai, saya orang tua dari ananda " + namaAnanda + " (ID: " + cleanId + ") ingin konsultasi pasca-khitan.") }
        ]
      ]
    };

    const sent = sendTelegramMessage_(patientChatId, text, buttons);
    if (sent && sent.success && props) {
      props.setProperty(propKey, Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"));
      return true;
    }
    return false;
  } catch (err) {
    Logger.log("sendAftercareTelegramIfEligible_ error: " + err.toString());
    return false;
  }
}

/**
 * Mengambil daftar booking mendatang dan mengelompokkannya per Hari/Tanggal
 * Parameter filterType: "upcoming" (default), "today", "tomorrow", atau format YYYY-MM-DD
 */
function getUpcomingBookingsGroupedByDate_(filterType) {
  const currentFilter = filterType || "upcoming";
  const cacheKey = "tg_sched_" + currentFilter;
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache ? cache.get(cacheKey) : null;
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { dates: [], grouped: {}, totalPasien: 0, filterType: currentFilter };

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const now = new Date();
  const todayYmd = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
  const tomorrowObj = new Date(now.getTime() + 24 * 3600 * 1000);
  const tomorrowYmd = Utilities.formatDate(tomorrowObj, "Asia/Jakarta", "yyyy-MM-dd");

  const list = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const id = String(row[0] || "").trim();
    const namaAnanda = String(row[1] || "").trim();
    let tglKhitanStr = row[5];
    let jamKhitanStr = String(row[6] || "").trim();
    const status = String(row[21] || "").trim().toLowerCase();

    if (!id || status === "batal" || status === "selesai") continue;

    if (tglKhitanStr instanceof Date) {
      tglKhitanStr = Utilities.formatDate(tglKhitanStr, "Asia/Jakarta", "yyyy-MM-dd");
    } else {
      tglKhitanStr = normalizeYmd_(tglKhitanStr);
    }
    if (!tglKhitanStr || tglKhitanStr.length < 10) continue;

    // Filter tanggal khitan sesuai filterType
    if (currentFilter === "today") {
      if (tglKhitanStr !== todayYmd) continue;
    } else if (currentFilter === "tomorrow") {
      if (tglKhitanStr !== tomorrowYmd) continue;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(currentFilter)) {
      if (tglKhitanStr !== currentFilter) continue;
    } else {
      // Default upcoming: jadwal >= hari ini
      if (tglKhitanStr < todayYmd) continue;
    }

    if (!jamKhitanStr || jamKhitanStr === "-") {
      jamKhitanStr = "08:00";
    }

    list.push({
      idBooking: id,
      namaAnanda: namaAnanda,
      tanggalLahir: row[3],
      tanggalKhitan: tglKhitanStr,
      jamKhitan: jamKhitanStr,
      metodeKhitan: String(row[7] || "").trim(),
      namaPenanggungJawab: String(row[10] || "").trim(),
      hubunganKeluarga: String(row[13] || "").trim(),
      nomorHp: String(row[14] || "").trim(),
      alamat: String(row[15] || "").trim(),
      kabupaten: String(row[17] || "").trim(),
      kecamatan: String(row[18] || "").trim(),
      kelurahan: String(row[19] || "").trim(),
      status: String(row[21] || "Terkonfirmasi").trim()
    });
  }

  // Urutkan berdasarkan tanggal khitan ASC, lalu jam khitan ASC
  list.sort((a, b) => {
    if (a.tanggalKhitan !== b.tanggalKhitan) {
      return a.tanggalKhitan.localeCompare(b.tanggalKhitan);
    }
    return a.jamKhitan.localeCompare(b.jamKhitan);
  });

  const grouped = {};
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!grouped[item.tanggalKhitan]) {
      grouped[item.tanggalKhitan] = [];
    }
    grouped[item.tanggalKhitan].push(item);
  }

  const dates = Object.keys(grouped).sort();
  const resData = { dates: dates, grouped: grouped, totalPasien: list.length, filterType: currentFilter };
  try {
    const cache = CacheService.getScriptCache();
    if (cache) {
      const str = JSON.stringify(resData);
      if (str.length < 80000) {
        cache.put(cacheKey, str, 60);
      }
    }
  } catch (e) {}
  return resData;
}

/**
 * Membantu mengenali input query tanggal fleksibel (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, dsb.)
 */
function parseDateQuery_(str) {
  if (!str) return null;
  const s = String(str).trim();
  // Format YYYY-MM-DD atau YYYY/MM/DD
  const m1 = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m1) {
    const y = m1[1];
    const m = (m1[2].length === 1 ? "0" + m1[2] : m1[2]);
    const d = (m1[3].length === 1 ? "0" + m1[3] : m1[3]);
    return y + "-" + m + "-" + d;
  }
  // Format DD-MM-YYYY atau DD/MM/YYYY
  const m2 = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m2) {
    const d = (m2[1].length === 1 ? "0" + m2[1] : m2[1]);
    const m = (m2[2].length === 1 ? "0" + m2[2] : m2[2]);
    const y = m2[3];
    return y + "-" + m + "-" + d;
  }
  return null;
}

/**
 * Membangun inline keyboard tombol trigger WhatsApp Reminder untuk daftar jadwal pasien (khusus Admin)
 */
function buildWaReminderInlineKeyboard_(scheduleData) {
  if (!scheduleData || !scheduleData.dates || scheduleData.dates.length === 0) return null;
  const buttons = [];
  for (let d = 0; d < scheduleData.dates.length; d++) {
    const dateItems = scheduleData.grouped[scheduleData.dates[d]] || [];
    for (let i = 0; i < dateItems.length; i++) {
      const it = dateItems[i];
      const cleanPhone = cleanPhoneForWa_(it.nomorHp);
      if (cleanPhone) {
        const waText = buildWaReminderText_(it);
        const directWaUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(waText);
        const waUrl = buildWaTrackingUrl_(it.idBooking, "reminder", directWaUrl);
        const jamDisplay = (it.jamKhitan && it.jamKhitan !== "-") ? String(it.jamKhitan).replace(/wib/gi, "").trim() : "08:00";
        buttons.push([
          {
            text: "🔔 WA Reminder • " + it.namaAnanda + " (" + jamDisplay + ")",
            url: waUrl
          }
        ]);
      }
    }
  }
  return buttons.length > 0 ? { inline_keyboard: buttons } : null;
}

/**
 * Membangun Inline Keyboard untuk navigasi halaman jadwal & tombol cepat filter
 */
function buildSchedulePaginationKeyboard_(filterType, curPage, totalPages, isTomorrow, scheduleData, isAdmin) {
  const buttons = [];

  // Jika besok dan admin, sertakan tombol WA reminder pasien
  if (isTomorrow && isAdmin && scheduleData) {
    const waBtns = buildWaReminderInlineKeyboard_(scheduleData);
    if (waBtns && waBtns.inline_keyboard) {
      for (let w = 0; w < waBtns.inline_keyboard.length; w++) {
        buttons.push(waBtns.inline_keyboard[w]);
      }
    }
  }

  // Baris Navigasi Halaman jika > 1 halaman
  if (totalPages > 1) {
    const navRow = [];
    if (curPage > 1) {
      navRow.push({ text: "◀️ Hal " + (curPage - 1), callback_data: "cb_sched:" + filterType + ":" + (curPage - 1) });
    }
    navRow.push({ text: "📄 " + curPage + "/" + totalPages, callback_data: "cb_sched:" + filterType + ":" + curPage });
    if (curPage < totalPages) {
      navRow.push({ text: "Hal " + (curPage + 1) + " ▶️", callback_data: "cb_sched:" + filterType + ":" + (curPage + 1) });
    }
    buttons.push(navRow);
  }

  // Tombol aksi cepat filter jadwal
  buttons.push([
    { text: "📅 Hari Ini", callback_data: "cb_jadwal_today" },
    { text: "⚡ Jadwal Besok", callback_data: "cb_jadwal_besok" }
  ]);

  return buttons.length > 0 ? { inline_keyboard: buttons } : null;
}

/**
 * Menyusun pesan Telegram berisi Jadwal Booking Mendatang yang dikelompokkan per Hari / Tanggal (Mendukung Pagination)
 */
function formatUpcomingScheduleMessage_(data, isAdmin, page, perPage) {
  const dates = data.dates || [];
  const grouped = data.grouped || {};
  const totalPasien = data.totalPasien || 0;
  const filterType = data.filterType || "upcoming";

  if (dates.length === 0 || totalPasien === 0) {
    if (filterType === "today") {
      return "ℹ️ <b>Tidak ada jadwal khitan hari ini.</b>\nSemua pendaftaran hari ini telah berstatus selesai/batal atau belum ada jadwal tindakan yang terdaftar untuk hari ini.";
    }
    if (filterType === "tomorrow") {
      return "ℹ️ <b>Tidak ada jadwal khitan esok hari.</b>\nBelum ada jadwal pendaftaran khitan yang terdaftar untuk besok.";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(filterType)) {
      return "ℹ️ <b>Tidak ada jadwal khitan pada tanggal " + formatIndonesianDateStr_(filterType) + ".</b>\nBelum ada pendaftaran yang terdaftar atau semua pendaftaran telah berstatus selesai/batal pada tanggal tersebut.";
    }
    return "ℹ️ <b>Tidak ada jadwal khitan mendatang saat ini.</b>\nSemua pendaftaran telah berstatus selesai/batal atau belum ada jadwal baru yang terdaftar.";
  }

  const allFlat = [];
  for (let d = 0; d < dates.length; d++) {
    const dStr = dates[d];
    const items = grouped[dStr] || [];
    for (let i = 0; i < items.length; i++) {
      allFlat.push({
        item: items[i],
        dateStr: dStr
      });
    }
  }

  const limit = (typeof perPage === "number" && perPage > 0) ? perPage : 8;
  const totalPages = Math.ceil(allFlat.length / limit) || 1;
  const curPage = Math.max(1, Math.min(page || 1, totalPages));
  const startIndex = (curPage - 1) * limit;
  const pageItems = allFlat.slice(startIndex, startIndex + limit);

  const todayYmd = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

  let titleHeader = "📅 <b>DAFTAR JADWAL KHITAN MENDATANG</b> 🏥";
  if (filterType === "today") {
    titleHeader = "📅 <b>JADWAL KHITAN HARI INI</b> 🏥";
  } else if (filterType === "tomorrow") {
    titleHeader = "⚡ <b>JADWAL KHITAN BESOK</b> 🏥";
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(filterType)) {
    titleHeader = "📅 <b>JADWAL KHITAN TANGGAL " + formatIndonesianDateStr_(filterType).toUpperCase() + "</b> 🏥";
  }

  let text = titleHeader + (totalPages > 1 ? (" <i>(Hal " + curPage + "/" + totalPages + ")</i>") : "") + "\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "📊 <b>Total Terjadwal:</b> " + allFlat.length + " Pasien\n" +
    "🗓️ <b>Jumlah Hari:</b> " + dates.length + " Hari Pelaksanaan\n" +
    "━━━━━━━━━━━━━━━━━━\n\n";

  let lastDateHeader = "";
  for (let p = 0; p < pageItems.length; p++) {
    const entry = pageItems[p];
    const it = entry.item;
    const dateStr = entry.dateStr;

    if (dateStr !== lastDateHeader) {
      lastDateHeader = dateStr;
      const parts = dateStr.split("-");
      const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const dayName = dayNames[dObj.getDay()];
      const indoDate = formatIndonesianDateStr_(dateStr);

      let badge = "📆 ";
      if (dateStr === todayYmd) {
        badge = "🔥 <b>[HARI INI]</b> ";
      } else {
        const todayParts = todayYmd.split("-");
        const todayObj = new Date(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10));
        const diffDays = Math.round((dObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          badge = "⚡ <b>[BESOK]</b> ";
        } else if (diffDays === 2) {
          badge = "📌 <b>[LUSA]</b> ";
        }
      }

      text += badge + "<b>" + dayName + ", " + indoDate + "</b> (" + (grouped[dateStr] ? grouped[dateStr].length : 0) + " Pasien)\n";
    }

    const jam = formatJamDisplay_(it.jamKhitan);
    const metode = it.metodeKhitan || "Standar";

    if (!isAdmin) {
      text += "  • 🕒 " + escapeTelegramHtml_(jam) + " • ✂️ " + escapeTelegramHtml_(metode) + " • <i>[Terjadwal]</i>\n";
    } else {
      const sapaan = resolveSapaanWa_(it.hubunganKeluarga);
      const noHp = it.nomorHp || "-";
      text += "  " + (startIndex + p + 1) + ". 👦 <b>" + escapeTelegramHtml_(it.namaAnanda) + "</b>\n" +
              "     🕒 " + escapeTelegramHtml_(jam) + " • ✂️ " + escapeTelegramHtml_(metode) + "\n" +
              "     👨‍👩‍👦 " + escapeTelegramHtml_(it.namaPenanggungJawab) + " (" + escapeTelegramHtml_(sapaan) + ") • 📱 <code>" + escapeTelegramHtml_(noHp) + "</code>\n" +
              "     🏷️ ID: <code>" + escapeTelegramHtml_(it.idBooking) + "</code>\n";
    }
  }

  text += "\n━━━━━━━━━━━━━━━━━━\n";
  if (totalPages > 1) {
    text += "📄 <i>Menampilkan " + (startIndex + 1) + " - " + Math.min(startIndex + limit, allFlat.length) + " dari " + allFlat.length + " Pasien (Hal " + curPage + "/" + totalPages + ").</i>\n";
  }
  if (isAdmin) {
    text += "💡 <i>Ketik ID Booking untuk rincian data lengkap, atau /cari &lt;nama&gt; untuk mencari pasien.</i>";
  } else {
    text += "💡 <i>Untuk memeriksa data & status pendaftaran Ananda sendiri, sentuh menu <b>'🔍 Status Booking Saya'</b>.</i>";
  }

  return text;
}

/**
 * Mencari data pendaftaran di Sheet BOOKING berdasarkan ID Booking atau nomor HP.
 * Prioritas pencarian:
 * 1. Jika dicari dengan ID Booking: mencari ID persis.
 * 2. Jika dicari dengan Nomor HP: mencari dari baris paling baru ke paling lama,
 *    memprioritaskan status aktif (Pending / Terkonfirmasi), dan menyertakan daftar
 *    pendaftaran anak lainnya (sibling bookings) jika 1 nomor mendaftarkan lebih dari 1 pasien.
 */
function findBookingForTelegram_(query) {
  const cleanQ = String(query || "").trim();
  if (!cleanQ) return null;
  const upperQ = cleanQ.toUpperCase();
  const phoneDigits = cleanPhoneNumber(cleanQ);

  const cacheKey = "tg_bkg_" + (phoneDigits || upperQ);
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache ? cache.get(cacheKey) : null;
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const matches = [];

  // Iterasi dari baris paling baru ke paling lama (bawah ke atas)
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const id = String(row[0] || "").trim().toUpperCase();
    const phone = String(row[14] || "").trim();
    const phoneClean = cleanPhoneNumber(phone);

    const isIdMatch = (id === upperQ);
    const isPhoneMatch = (phoneDigits && phoneDigits.length >= 8 && phoneClean === phoneDigits);

    if (isIdMatch || isPhoneMatch) {
      let tglKhitanStr = row[5];
      if (tglKhitanStr instanceof Date) {
        tglKhitanStr = Utilities.formatDate(tglKhitanStr, "Asia/Jakarta", "yyyy-MM-dd");
      } else {
        tglKhitanStr = normalizeYmd_(tglKhitanStr);
      }
      let tglLahirStr = row[3];
      if (tglLahirStr instanceof Date) {
        tglLahirStr = Utilities.formatDate(tglLahirStr, "Asia/Jakarta", "yyyy-MM-dd");
      } else {
        tglLahirStr = normalizeYmd_(tglLahirStr);
      }

      matches.push({
        idBooking: row[0],
        namaAnanda: row[1],
        tempatLahir: row[2],
        tanggalLahir: tglLahirStr,
        beratBadan: row[4],
        tanggalKhitan: tglKhitanStr,
        jamKhitan: row[6],
        metodeKhitan: row[7],
        ukuranCelana: row[8],
        obat: row[9],
        namaPenanggungJawab: row[10],
        usiaPenanggungJawab: row[11],
        pekerjaan: row[12],
        hubunganKeluarga: row[13],
        nomorHp: row[14],
        alamat: row[15],
        provinsi: row[16],
        kabupaten: row[17],
        kecamatan: row[18],
        kelurahan: row[19],
        timestamp: row[20],
        status: String(row[21] || "Terkonfirmasi").trim()
      });

      // Jika match ID unik, hentikan pencarian (ID bersifat tunggal)
      if (isIdMatch) break;
    }
  }

  if (matches.length === 0) return null;

  // Jika pencarian via nomor HP dan terdapat lebih dari 1 data:
  // Urutkan: data aktif (bukan selesai/batal) diutamakan paling depan
  matches.sort(function(a, b) {
    const stA = a.status.toLowerCase();
    const stB = b.status.toLowerCase();
    const isInactiveA = (stA === "selesai" || stA === "batal");
    const isInactiveB = (stB === "selesai" || stB === "batal");
    if (!isInactiveA && isInactiveB) return -1;
    if (isInactiveA && !isInactiveB) return 1;
    return 0; // pertahankan urutan terbaru karena sudah dibaca dari bawah ke atas
  });

  const primary = matches[0];
  if (matches.length > 1) {
    primary.otherBookings = matches.slice(1);
    primary.totalFound = matches.length;
  }

  try {
    const cache = CacheService.getScriptCache();
    if (cache) {
      cache.put(cacheKey, JSON.stringify(primary), 60);
    }
  } catch (e) {}

  return primary;
}

/**
 * Menyusun pesan detail status pendaftaran untuk Telegram
 */
function formatBookingDetailTelegram_(b, isAdmin) {
  const sapaan = resolveSapaanWa_(b.hubunganKeluarga);
  const tglKhitan = formatIndonesianDateStr_(b.tanggalKhitan);
  const jamKhitan = formatJamDisplay_(b.jamKhitan);
  const noHp = b.nomorHp || "-";
  const maskedPhone = isAdmin ? noHp : (noHp && noHp.length > 7 ? noHp.substring(0, 4) + "****" + noHp.slice(-4) : noHp);
  const wilParts = [b.kelurahan, b.kecamatan, b.kabupaten].filter(Boolean);
  const wilayah = wilParts.length > 0 ? wilParts.join(", ") : (b.alamat || "-");
  const statusBadge = formatStatusBadgeTelegram_(b.status);

  let text = "📋 <b>INFORMASI STATUS BOOKING</b> 🏥\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "🏷️ <b>ID Booking:</b> <code>" + escapeTelegramHtml_(b.idBooking) + "</code>\n" +
    "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(b.namaAnanda) + "\n" +
    "🎂 <b>Tgl Lahir:</b> " + escapeTelegramHtml_(formatIndonesianDateStr_(b.tanggalLahir)) + "\n" +
    "👨‍👩‍👦 <b>Penanggung Jawab:</b> " + escapeTelegramHtml_(b.namaPenanggungJawab) + " (" + escapeTelegramHtml_(sapaan) + ")\n" +
    "📱 <b>WhatsApp:</b> " + escapeTelegramHtml_(maskedPhone) + "\n" +
    "📅 <b>Jadwal Khitan:</b> " + escapeTelegramHtml_(tglKhitan) + "\n" +
    "🕒 <b>Jam Pelaksanaan:</b> " + escapeTelegramHtml_(jamKhitan) + "\n" +
    "✂️ <b>Metode Khitan:</b> " + escapeTelegramHtml_(b.metodeKhitan || "Standar") + "\n" +
    "📍 <b>Wilayah:</b> " + escapeTelegramHtml_(wilayah) + "\n" +
    "📌 <b>Status:</b> " + escapeTelegramHtml_(statusBadge) + "\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "💡 <i>Harap hadir di lokasi khitan 15 menit sebelum jam pelaksanaan.</i>";

  if (b.otherBookings && b.otherBookings.length > 0) {
    text += "\n\n👨‍👩‍👦 <b>Pendaftaran Lain Pada Nomor Ini (" + b.otherBookings.length + " Pasien):</b>\n";
    for (let k = 0; k < b.otherBookings.length; k++) {
      const ob = b.otherBookings[k];
      const obBadge = formatStatusBadgeTelegram_(ob.status);
      text += "• 👦 <b>" + escapeTelegramHtml_(ob.namaAnanda) + "</b> (" + escapeTelegramHtml_(obBadge) + ")\n" +
              "  ID: <code>" + escapeTelegramHtml_(ob.idBooking) + "</code> • 📅 " + escapeTelegramHtml_(formatIndonesianDateStr_(ob.tanggalKhitan)) + "\n";
    }
    text += "<i>💡 Ketik ID Booking di atas untuk melihat rincian lengkap pendaftaran tersebut.</i>";
  }

  return text;
}

/**
 * Memperbarui status booking langsung dari antarmuka Bot Telegram (Khusus Admin)
 */
function updateBookingStatusFromTelegram_(bookingId, newStatus) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(5000);
  try {
    const id = String(bookingId || "").trim().toUpperCase();
    if (!id) return { success: false, message: "⚠️ ID Booking tidak valid." };

    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "⚠️ Database booking masih kosong." };

    const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let targetRow = -1;
    for (let i = 0; i < idValues.length; i++) {
      if (String(idValues[i][0] || "").trim().toUpperCase() === id) {
        targetRow = i + 2;
        break;
      }
    }

    if (targetRow <= 0) {
      return { success: false, message: "⚠️ ID Booking <code>" + escapeTelegramHtml_(id) + "</code> tidak ditemukan." };
    }

    const statusColIndex = HEADERS.indexOf("STATUS") + 1;
    sheet.getRange(targetRow, statusColIndex > 0 ? statusColIndex : 22).setValue(newStatus);
    invalidateDataset_(SERVER_CACHE_KEYS.BOOKINGS, "bookings");

    // Ambil data untuk notifikasi pasien
    const rowData = sheet.getRange(targetRow, 1, 1, HEADERS.length).getValues()[0];
    const namaAnanda = String(rowData[1] || "-");
    const namaPj = String(rowData[10] || "-");
    const sapaan = resolveSapaanWa_(rowData[13]);
    const noHp = String(rowData[14] || "");
    const statusBadge = formatStatusBadgeTelegram_(newStatus);

    if (newStatus === "Selesai") {
      try {
        sendAftercareTelegramIfEligible_(id, rowData);
      } catch (afErr) {
        Logger.log("Peringatan aftercare bot: " + afErr.toString());
      }
    }

    if (noHp) {
      const patMsg = "📢 <b>PEMBARUAN STATUS PENDAFTARAN KHITAN</b> 🏥✨\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "Yth. " + sapaan + " <b>" + escapeTelegramHtml_(namaPj) + "</b>,\n\n" +
        "Status pendaftaran khitan Ananda <b>" + escapeTelegramHtml_(namaAnanda) + "</b> (ID: <code>" + escapeTelegramHtml_(id) + "</code>) saat ini telah diperbarui menjadi:\n\n" +
        "👉 <b>" + escapeTelegramHtml_(statusBadge) + "</b>\n\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "💡 <i>Sentuh menu '🔍 Status Booking Saya' pada bot untuk memeriksa rincian terkini.</i>\n" +
        "🏥 Rumah Khitan Damai — Nyaman, Aman, dan Menyenangkan ✨";
      notifyPatientTelegram_(noHp, patMsg);
    }

    const feedback = "✅ <b>Pembaruan Status Berhasil!</b> 🎯\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "📋 <b>ID:</b> <code>" + escapeTelegramHtml_(id) + "</code>\n" +
      "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
      "📌 <b>Status Baru:</b> " + escapeTelegramHtml_(statusBadge) + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "<i>Database sheet & cache telah disinkronkan.</i>";
    return { success: true, message: feedback };
  } catch (err) {
    return { success: false, message: "❌ Gagal memperbarui status: " + escapeTelegramHtml_(err.toString()) };
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

/**
 * Membangun Inline Keyboard untuk aksi cepat Admin pada data booking (WA & ubah status)
 */
function buildBookingActionInlineKeyboard_(booking) {
  if (!booking) return null;
  const rows = [];
  if (booking.nomorHp) {
    const cleanPhone = cleanPhoneForWa_(booking.nomorHp);
    if (cleanPhone) {
      const directSambutanUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(buildWaSambutanText_(booking));
      const directReminderUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(buildWaReminderText_(booking));
      const sambutanUrl = buildWaTrackingUrl_(booking.idBooking, "sambutan", directSambutanUrl);
      const reminderUrl = buildWaTrackingUrl_(booking.idBooking, "reminder", directReminderUrl);
      rows.push([
        { text: "💬 WA Sambutan", url: sambutanUrl },
        { text: "🔔 WA Reminder", url: reminderUrl }
      ]);
    }
  }
  const curStatus = String(booking.status || "").toLowerCase();
  const actionRow = [];
  if (curStatus !== "selesai") {
    actionRow.push({ text: "🏁 Tandai Selesai", callback_data: "cb_selesai:" + booking.idBooking });
  }
  if (curStatus !== "terkonfirmasi") {
    actionRow.push({ text: "✅ Konfirmasi", callback_data: "cb_konfirmasi:" + booking.idBooking });
  }
  if (actionRow.length > 0) {
    rows.push(actionRow);
  }
  return rows.length > 0 ? { inline_keyboard: rows } : null;
}

/**
 * Membangun Inline Keyboard untuk menu mandiri Pasien (Reschedule, Batal, Lokasi Maps, Review)
 */
function buildPatientActionInlineKeyboard_(booking) {
  if (!booking) return null;
  const id = booking.idBooking;
  const status = String(booking.status || "").toLowerCase();

  // Jika sudah batal, tidak perlu tombol aksi
  if (status === "batal") return null;

  // Jika sudah selesai, tampilkan tombol review & konsultasi pasca-khitan
  if (status === "selesai") {
    return {
      inline_keyboard: [
        [
          { text: "⭐ Beri Ulasan di Google Review", url: GOOGLE_REVIEW_PAGE_URL }
        ],
        [
          { text: "💬 Konsultasi Pasca Khitan via WA", url: "https://api.whatsapp.com/send?phone=6281222531978&text=" + encodeURIComponent("Halo Admin Khitan Damai, ingin konsultasi perawatan pasca-khitan ananda " + (booking.namaAnanda || "") + " (ID: " + id + ").") }
        ]
      ]
    };
  }

  // Hitung selisih jam dari jadwal
  let diffHours = 999;
  try {
    const tglStr = booking.tanggalKhitan;
    let jamClean = String(booking.jamKhitan || "08:00").replace(".", ":");
    const m = jamClean.match(/(\d{1,2}):(\d{2})/);
    const hour = m ? parseInt(m[1], 10) : 8;
    const minute = m ? parseInt(m[2], 10) : 0;
    const hourPad = hour < 10 ? "0" + hour : String(hour);
    const minPad = minute < 10 ? "0" + minute : String(minute);
    const targetIso = String(tglStr).substring(0, 10) + "T" + hourPad + ":" + minPad + ":00+07:00";
    const targetMs = new Date(targetIso).getTime();
    diffHours = (targetMs - Date.now()) / (1000 * 60 * 60);
  } catch (e) {}

  const buttons = [];
  if (diffHours >= 24) {
    buttons.push([
      { text: "🗓️ Pindahkan Jadwal", callback_data: "cb_rs_start:" + id },
      { text: "❌ Batalkan Jadwal", callback_data: "cb_cancel_start:" + id }
    ]);
  } else {
    buttons.push([
      { text: "💬 Hubungi Admin via WA (Jadwal < 24 Jam)", url: "https://api.whatsapp.com/send?phone=6281222531978&text=" + encodeURIComponent("Halo Admin Rumah Khitan Damai, saya ingin konfirmasi pendaftaran ananda " + (booking.namaAnanda || "") + " (ID: " + id + ").") }
    ]);
  }

  buttons.push([
    { text: "📍 Lokasi Klinik (Google Maps)", url: "https://maps.app.goo.gl/W3pZFZupzuNU4Cdi9" }
  ]);

  return { inline_keyboard: buttons };
}

/**
 * Mencari data pasien di Sheet BOOKING berdasarkan substring nama anak atau nama orang tua (Khusus Admin)
 */
function searchBookingsByNameForTelegram_(nameQuery) {
  const q = String(nameQuery || "").trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const results = [];

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const id = String(row[0] || "").trim();
    if (!id) continue;

    const namaAnanda = String(row[1] || "").trim();
    const namaPj = String(row[10] || "").trim();
    const namaAnandaLower = namaAnanda.toLowerCase();
    const namaPjLower = namaPj.toLowerCase();

    if (namaAnandaLower.includes(q) || namaPjLower.includes(q)) {
      let tglKhitanStr = row[5];
      if (tglKhitanStr instanceof Date) {
        tglKhitanStr = Utilities.formatDate(tglKhitanStr, "Asia/Jakarta", "yyyy-MM-dd");
      } else {
        tglKhitanStr = normalizeYmd_(tglKhitanStr);
      }

      results.push({
        idBooking: id,
        namaAnanda: namaAnanda,
        namaPenanggungJawab: namaPj,
        hubunganKeluarga: String(row[13] || "").trim(),
        nomorHp: String(row[14] || "").trim(),
        tanggalKhitan: tglKhitanStr,
        jamKhitan: String(row[6] || "").trim() || "08:00",
        metodeKhitan: String(row[7] || "Standar").trim(),
        status: String(row[21] || "Terkonfirmasi").trim()
      });

      if (results.length >= 8) break; // Batasi maksimal 8 agar pesan rapi
    }
  }

  return results;
}

/**
 * Format hasil pencarian pasien nama ke pesan & inline buttons Telegram
 */
function formatSearchResultsTelegram_(results, query) {
  if (!results || results.length === 0) {
    return {
      text: "🔎 <b>HASIL PENCARIAN PASIEN</b>\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "Kata kunci: <code>" + escapeTelegramHtml_(query) + "</code>\n\n" +
        "⚠️ <i>Tidak ditemukan data pasien dengan nama tersebut.</i>\n" +
        "Mohon periksa kembali ejaan nama anak atau nama orang tua.",
      buttons: null
    };
  }

  let text = "🔎 <b>HASIL PENCARIAN PASIEN</b> (" + results.length + " Ditemukan)\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "Kata kunci: <code>" + escapeTelegramHtml_(query) + "</code>\n\n";

  const inlineKeyboard = [];
  for (let i = 0; i < results.length; i++) {
    const it = results[i];
    const stBadge = formatStatusBadgeTelegram_(it.status);
    const tglFormatted = it.tanggalKhitan ? formatIndonesianDateStr_(it.tanggalKhitan) : "-";
    const jamFormatted = formatJamDisplay_(it.jamKhitan);

    text += (i + 1) + ". 👦 <b>" + escapeTelegramHtml_(it.namaAnanda) + "</b> (ID: <code>" + escapeTelegramHtml_(it.idBooking) + "</code>)\n" +
      "   👨‍👩‍👦 " + escapeTelegramHtml_(it.namaPenanggungJawab) + " (" + escapeTelegramHtml_(resolveSapaanWa_(it.hubunganKeluarga)) + ")\n" +
      "   📅 " + escapeTelegramHtml_(tglFormatted) + " • " + escapeTelegramHtml_(jamFormatted) + "\n" +
      "   📌 Status: " + escapeTelegramHtml_(stBadge) + "\n\n";

    inlineKeyboard.push([
      { text: "🔍 Rincian " + it.namaAnanda + " (" + it.idBooking + ")", callback_data: "cb_status:" + it.idBooking }
    ]);
  }

  text += "━━━━━━━━━━━━━━━━━━\n" +
    "💡 <i>Sentuh tombol di bawah untuk melihat rincian lengkap & aksi pasien.</i>";

  return {
    text: text,
    buttons: { inline_keyboard: inlineKeyboard }
  };
}

/**
 * Memindahkan jadwal khitan (Reschedule) langsung via Bot Telegram
 * Dilengkapi validasi otorisasi kepemilikan nomor, verifikasi sisa kuota real-time, dan LockService
 */
function rescheduleBookingFromTelegram_(bookingId, newDateYmd, newJamStr, chatId, verifiedPhone) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return { success: false, message: "⏳ Server sedang sibuk memproses antrean lain. Silakan coba kembali dalam beberapa detik." };
  }

  try {
    const id = String(bookingId || "").trim().toUpperCase();
    if (!id) return { success: false, message: "⚠️ ID Booking tidak valid." };

    const cleanDate = normalizeYmd_(newDateYmd);
    if (!cleanDate) return { success: false, message: "⚠️ Format tanggal tidak valid." };

    // 1. Revalidasi kuota slot waktu
    const kuotaInfo = getKuotaJamSummary_(cleanDate);
    const slotKey = newJamStr.replace(/wib/gi, "").trim();
    let matchedSlotKey = "";
    for (const k in (kuotaInfo.slots || {})) {
      if (k.replace(/\D/g, "") === slotKey.replace(/\D/g, "")) {
        matchedSlotKey = k;
        break;
      }
    }

    if (matchedSlotKey && kuotaInfo.slots[matchedSlotKey]) {
      if (kuotaInfo.slots[matchedSlotKey].sisa <= 0) {
        return { success: false, message: "⚠️ Maaf, kuota untuk jam " + matchedSlotKey + " pada tanggal " + formatIndonesianDateStr_(cleanDate) + " baru saja penuh. Silakan pilih slot jam lain." };
      }
    }

    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "⚠️ Database booking kosong." };

    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    let targetRow = -1;
    let targetRowData = null;

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || "").trim().toUpperCase() === id) {
        targetRow = i + 2;
        targetRowData = values[i];
        break;
      }
    }

    if (targetRow <= 0 || !targetRowData) {
      return { success: false, message: "⚠️ Data pendaftaran tidak ditemukan." };
    }

    // Validasi otorisasi kepemilikan nomor telepon
    const rowPhone = cleanPhoneNumber(String(targetRowData[14] || ""));
    const callerPhone = cleanPhoneNumber(String(verifiedPhone || ""));
    const config = getTelegramConfig_();
    const isAdmin = isTelegramAdmin_(chatId, verifiedPhone, config);

    if (!isAdmin && (!callerPhone || callerPhone !== rowPhone)) {
      return { success: false, message: "⛔ Akses ditolak: Anda hanya dapat memindahkan jadwal pendaftaran milik Anda sendiri." };
    }

    const oldDate = targetRowData[5];
    const oldDateStr = (oldDate instanceof Date) ? Utilities.formatDate(oldDate, "Asia/Jakarta", "yyyy-MM-dd") : normalizeYmd_(oldDate);
    const oldJam = String(targetRowData[6] || "08:00");
    const namaAnanda = String(targetRowData[1] || "-");
    const namaPj = String(targetRowData[10] || "-");
    const sapaan = resolveSapaanWa_(targetRowData[13]);
    const noHp = String(targetRowData[14] || "-");

    const tglColIndex = HEADERS.indexOf("TANGGAL KHITAN") + 1;
    const jamColIndex = HEADERS.indexOf("JAM KHITAN") + 1;
    const finalJam = matchedSlotKey || (slotKey.length === 4 ? (slotKey.slice(0, 2) + ":" + slotKey.slice(2)) : slotKey);

    sheet.getRange(targetRow, tglColIndex).setValue(cleanDate);
    sheet.getRange(targetRow, jamColIndex).setValue(finalJam);

    // Invalidate server cache
    invalidateDataset_(SERVER_CACHE_KEYS.BOOKINGS, "bookings");

    // Catat log history
    logHistory_({
      user: isAdmin ? "Admin (Telegram)" : ("Pasien (" + callerPhone + ")"),
      aksi: "RESCHEDULE",
      dataset: "BOOKINGS",
      idRecord: id,
      ringkasan: "Reschedule " + id + " dari " + oldDateStr + " " + oldJam + " ke " + cleanDate + " " + finalJam,
      sumber: "telegram-bot"
    });

    // Kirim notifikasi ke Admin
    const adminNotifText = "🗓️ <b>PEMBERITAHUAN RESCHEDULE JADWAL</b> 📢\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
      "📋 <b>ID Booking:</b> <code>" + escapeTelegramHtml_(id) + "</code>\n" +
      "👨‍👩‍👦 <b>Penanggung Jawab:</b> " + escapeTelegramHtml_(namaPj) + " (" + escapeTelegramHtml_(sapaan) + ")\n" +
      "📱 <b>WhatsApp:</b> " + escapeTelegramHtml_(noHp) + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "🗓️ <b>Jadwal Semula:</b> " + formatIndonesianDateStr_(oldDateStr) + " (" + formatJamDisplay_(oldJam) + ")\n" +
      "✨ <b>Jadwal Baru:</b> " + formatIndonesianDateStr_(cleanDate) + " (" + formatJamDisplay_(finalJam) + ")\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "<i>Jadwal diubah langsung oleh " + (isAdmin ? "Admin" : "Keluarga Pasien") + " melalui Bot Telegram.</i>";

    const adminChatIds = getAdminTelegramChatIds_();
    for (let a = 0; a < adminChatIds.length; a++) {
      if (adminChatIds[a] && adminChatIds[a] !== String(chatId)) {
        sendTelegramMessage_(adminChatIds[a], adminNotifText);
      }
    }

    return {
      success: true,
      message: "✅ <b>Jadwal Khitan Berhasil Dipindahkan!</b> 🎉\n\n" +
        "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
        "📋 <b>ID Booking:</b> <code>" + escapeTelegramHtml_(id) + "</code>\n" +
        "📅 <b>Jadwal Baru:</b> " + formatIndonesianDateStr_(cleanDate) + "\n" +
        "🕒 <b>Waktu:</b> " + formatJamDisplay_(finalJam) + "\n\n" +
        "<i>Mohon hadir di klinik 15 menit sebelum waktu tindakan. Terima kasih!</i>",
      idBooking: id
    };
  } catch (err) {
    Logger.log("rescheduleBookingFromTelegram_ error: " + err.toString());
    return { success: false, message: "❌ Gagal memindahkan jadwal: " + escapeTelegramHtml_(err.toString()) };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

/**
 * Membatalkan jadwal khitan (Batal Mandiri) via Bot Telegram
 */
function cancelBookingFromTelegram_(bookingId, chatId, verifiedPhone) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return { success: false, message: "⏳ Server sedang sibuk. Silakan coba kembali sesaat lagi." };
  }

  try {
    const id = String(bookingId || "").trim().toUpperCase();
    if (!id) return { success: false, message: "⚠️ ID Booking tidak valid." };

    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "⚠️ Database booking kosong." };

    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    let targetRow = -1;
    let targetRowData = null;

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || "").trim().toUpperCase() === id) {
        targetRow = i + 2;
        targetRowData = values[i];
        break;
      }
    }

    if (targetRow <= 0 || !targetRowData) {
      return { success: false, message: "⚠️ Data pendaftaran tidak ditemukan." };
    }

    // Validasi otorisasi
    const rowPhone = cleanPhoneNumber(String(targetRowData[14] || ""));
    const callerPhone = cleanPhoneNumber(String(verifiedPhone || ""));
    const config = getTelegramConfig_();
    const isAdmin = isTelegramAdmin_(chatId, verifiedPhone, config);

    if (!isAdmin && (!callerPhone || callerPhone !== rowPhone)) {
      return { success: false, message: "⛔ Akses ditolak: Anda hanya dapat membatalkan pendaftaran milik Anda sendiri." };
    }

    const namaAnanda = String(targetRowData[1] || "-");
    const namaPj = String(targetRowData[10] || "-");
    const sapaan = resolveSapaanWa_(targetRowData[13]);
    const noHp = String(targetRowData[14] || "-");
    const tglKhitan = targetRowData[5];
    const tglStr = (tglKhitan instanceof Date) ? Utilities.formatDate(tglKhitan, "Asia/Jakarta", "yyyy-MM-dd") : normalizeYmd_(tglKhitan);
    const jamKhitan = String(targetRowData[6] || "08:00");

    const statusColIndex = HEADERS.indexOf("STATUS") + 1;
    sheet.getRange(targetRow, statusColIndex).setValue("Batal");

    // Invalidate server cache
    invalidateDataset_(SERVER_CACHE_KEYS.BOOKINGS, "bookings");

    // Catat log history
    logHistory_({
      user: isAdmin ? "Admin (Telegram)" : ("Pasien (" + callerPhone + ")"),
      aksi: "BATAL",
      dataset: "BOOKINGS",
      idRecord: id,
      ringkasan: "Pembatalan " + id + " oleh " + (isAdmin ? "Admin" : "Pasien"),
      sumber: "telegram-bot"
    });

    // Notifikasi ke Admin
    const adminAlert = "❌ <b>PEMBERITAHUAN PEMBATALAN PENDAFTARAN</b> 📢\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
      "📋 <b>ID Booking:</b> <code>" + escapeTelegramHtml_(id) + "</code>\n" +
      "👨‍👩‍👦 <b>Penanggung Jawab:</b> " + escapeTelegramHtml_(namaPj) + " (" + escapeTelegramHtml_(sapaan) + ")\n" +
      "📱 <b>WhatsApp:</b> " + escapeTelegramHtml_(noHp) + "\n" +
      "📅 <b>Jadwal Semula:</b> " + formatIndonesianDateStr_(tglStr) + " (" + formatJamDisplay_(jamKhitan) + ")\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "<i>Pendaftaran telah dibatalkan oleh " + (isAdmin ? "Admin" : "Keluarga Pasien") + " melalui Bot Telegram. Slot waktu kini terbuka kembali.</i>";

    const adminChatIds = getAdminTelegramChatIds_();
    for (let a = 0; a < adminChatIds.length; a++) {
      if (adminChatIds[a] && adminChatIds[a] !== String(chatId)) {
        sendTelegramMessage_(adminChatIds[a], adminAlert);
      }
    }

    return {
      success: true,
      message: "✅ <b>Pendaftaran Berhasil Dibatalkan</b>\n\n" +
        "Pendaftaran khitan Ananda <b>" + escapeTelegramHtml_(namaAnanda) + "</b> (ID: <code>" + escapeTelegramHtml_(id) + "</code>) telah dibatalkan.\n\n" +
        "<i>Terima kasih atas konfirmasinya. Jika di kemudian hari ingin mendaftar kembali, silakan hubungi Admin atau daftar melalui website kami.</i>"
    };
  } catch (err) {
    Logger.log("cancelBookingFromTelegram_ error: " + err.toString());
    return { success: false, message: "❌ Gagal membatalkan pendaftaran: " + escapeTelegramHtml_(err.toString()) };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

/**
 * Handler Telegram Webhook Update (2 arah)
 */
function handleTelegramWebhookUpdate_(update) {
  try {
    if (!update) return HtmlService.createHtmlOutput("OK");

    const config = getTelegramConfig_();
    const props = PropertiesService.getScriptProperties();

    // Dapatkan sender chat ID untuk rate limiting & otorisasi
    let senderChatId = "";
    if (update.callback_query) {
      const cb = update.callback_query;
      senderChatId = cb.message && cb.message.chat ? String(cb.message.chat.id) : String(cb.from.id);
    } else if (update.message) {
      senderChatId = String(update.message.chat.id);
    } else if (update.edited_message) {
      senderChatId = String(update.edited_message.chat.id);
    }

    if (!senderChatId) return HtmlService.createHtmlOutput("OK");

    // Rate Limiting per Chat ID (maks 25 permintaan per menit)
    try {
      const cache = CacheService.getScriptCache();
      if (cache) {
        const rlKey = "tg_rl_" + senderChatId;
        const curReq = parseInt(cache.get(rlKey) || "0", 10);
        if (curReq > 25) {
          if (update.callback_query) {
            answerTelegramCallbackQuery_(update.callback_query.id, "⏳ Terlalu banyak permintaan. Mohon tunggu sejenak.", true);
          } else {
            sendTelegramMessage_(senderChatId, "⏳ Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu beberapa saat sebelum mengirim pesan lagi.");
          }
          return HtmlService.createHtmlOutput("OK");
        }
        cache.put(rlKey, String(curReq + 1), 60);
      }
    } catch (rlErr) {}

    // 0. Penanganan Callback Query dari tombol Inline Telegram
    if (update.callback_query) {
      const cb = update.callback_query;
      const cbId = cb.id;
      const cbData = String(cb.data || "").trim();
      const cbChatId = senderChatId;
      const verifiedPhone = props ? (props.getProperty("tg_auth_" + cbChatId) || "") : "";
      const isAdmin = isTelegramAdmin_(cbChatId, verifiedPhone, config);

      if (cbData === "cb_jadwal_today") {
        answerTelegramCallbackQuery_(cbId, "Memuat jadwal hari ini...");
        const d = getUpcomingBookingsGroupedByDate_("today");
        const totalP = (d.dates || []).reduce(function(acc, dt) { return acc + (d.grouped[dt] ? d.grouped[dt].length : 0); }, 0);
        const totalPages = Math.ceil(totalP / 8) || 1;
        const msgText = formatUpcomingScheduleMessage_(d, isAdmin, 1, 8);
        const keyb = buildSchedulePaginationKeyboard_("today", 1, totalPages, false, d, isAdmin);
        sendTelegramMessage_(cbChatId, msgText, keyb);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData === "cb_jadwal_besok") {
        answerTelegramCallbackQuery_(cbId, "Memuat jadwal besok...");
        const d = getUpcomingBookingsGroupedByDate_("tomorrow");
        const totalP = (d.dates || []).reduce(function(acc, dt) { return acc + (d.grouped[dt] ? d.grouped[dt].length : 0); }, 0);
        const totalPages = Math.ceil(totalP / 8) || 1;
        const msgText = formatUpcomingScheduleMessage_(d, isAdmin, 1, 8);
        const keyb = buildSchedulePaginationKeyboard_("tomorrow", 1, totalPages, true, d, isAdmin);
        sendTelegramMessage_(cbChatId, msgText, keyb);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_sched:")) {
        const parts = cbData.split(":");
        const filterType = parts[1] || "upcoming";
        const targetPage = parseInt(parts[2] || "1", 10) || 1;
        answerTelegramCallbackQuery_(cbId, "Halaman " + targetPage + "...");
        const d = getUpcomingBookingsGroupedByDate_(filterType);
        const totalP = (d.dates || []).reduce(function(acc, dt) { return acc + (d.grouped[dt] ? d.grouped[dt].length : 0); }, 0);
        const totalPages = Math.ceil(totalP / 8) || 1;
        const msgText = formatUpcomingScheduleMessage_(d, isAdmin, targetPage, 8);
        const keyb = buildSchedulePaginationKeyboard_(filterType, targetPage, totalPages, filterType === "tomorrow", d, isAdmin);
        const messageId = cb.message ? cb.message.message_id : null;
        if (messageId) {
          const editRes = editTelegramMessage_(cbChatId, messageId, msgText, keyb);
          if (!editRes || !editRes.success) {
            sendTelegramMessage_(cbChatId, msgText, keyb);
          }
        } else {
          sendTelegramMessage_(cbChatId, msgText, keyb);
        }
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData === "cb_cek_reminder") {
        if (!isAdmin) {
          answerTelegramCallbackQuery_(cbId, "Khusus akun Admin.", true);
          return HtmlService.createHtmlOutput("OK");
        }
        answerTelegramCallbackQuery_(cbId, "Memindai reminder...");
        const scanRes = checkAndSendUpcomingReminders_();
        const items = scanRes.items || [];
        let resText = "⏰ <b>HASIL PEMINDAIAN JADWAL KHITAN (&lt; 12 JAM)</b> 🔔\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "📋 <b>Total Diperiksa:</b> " + (scanRes.checked || 0) + " data\n" +
          "⏳ <b>Pasien &lt; 12 Jam:</b> " + items.length + " pasien\n" +
          "📨 <b>Notifikasi Terkirim:</b> " + (scanRes.sent || 0) + "\n";
        sendTelegramMessage_(cbChatId, resText);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_status:")) {
        const bId = cbData.replace("cb_status:", "").trim();
        answerTelegramCallbackQuery_(cbId, "Mencari " + bId + "...");
        const b = findBookingForTelegram_(bId);
        if (b) {
          const actionBtn = isAdmin ? buildBookingActionInlineKeyboard_(b) : buildPatientActionInlineKeyboard_(b);
          sendTelegramMessage_(cbChatId, formatBookingDetailTelegram_(b, isAdmin), actionBtn);
        } else {
          sendTelegramMessage_(cbChatId, "⚠️ Data ID " + bId + " tidak ditemukan.");
        }
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_rs_start:")) {
        const bId = cbData.replace("cb_rs_start:", "").trim();
        answerTelegramCallbackQuery_(cbId, "Memuat pilihan tanggal...");
        const b = findBookingForTelegram_(bId);
        if (!b) {
          sendTelegramMessage_(cbChatId, "⚠️ Data pendaftaran tidak ditemukan.");
          return HtmlService.createHtmlOutput("OK");
        }
        const dateButtons = [];
        const now = new Date();
        for (let offset = 1; offset <= 7; offset++) {
          const d = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
          const ymd = Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
          const indoStr = formatIndonesianDateStr_(ymd);
          const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
          const dayName = dayNames[d.getDay()];
          dateButtons.push([
            { text: "📅 " + dayName + ", " + indoStr, callback_data: "cb_rs_dt:" + bId + ":" + ymd }
          ]);
        }
        dateButtons.push([
          { text: "🔙 Kembali ke Rincian", callback_data: "cb_status:" + bId }
        ]);
        const pickDateText = "🗓️ <b>PILIH TANGGAL KHITAN BARU</b> 🏥\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "Pasien: 👦 <b>" + escapeTelegramHtml_(b.namaAnanda) + "</b> (ID: <code>" + escapeTelegramHtml_(bId) + "</code>)\n" +
          "Jadwal Saat Ini: " + formatIndonesianDateStr_(b.tanggalKhitan) + " (" + formatJamDisplay_(b.jamKhitan) + ")\n\n" +
          "Silakan pilih tanggal pelaksanaan khitan baru yang tersedia di bawah ini:";
        sendTelegramMessage_(cbChatId, pickDateText, { inline_keyboard: dateButtons });
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_rs_dt:")) {
        const parts = cbData.split(":");
        const bId = parts[1];
        const ymd = parts[2];
        answerTelegramCallbackQuery_(cbId, "Memuat kuota jam...");
        const kuotaInfo = getKuotaJamSummary_(ymd);
        const slots = kuotaInfo.slots || {};
        const defaultSlots = ["08:00", "09:30", "11:00", "13:30", "15:00", "16:30"];
        const slotKeys = Object.keys(slots).length > 0 ? Object.keys(slots) : defaultSlots;
        slotKeys.sort();

        const slotButtons = [];
        let row = [];
        for (let s = 0; s < slotKeys.length; s++) {
          const slName = slotKeys[s];
          const sData = slots[slName];
          const sisa = sData ? sData.sisa : 2;
          const hhmm = slName.replace(/[^0-9]/g, "");
          if (sisa > 0) {
            row.push({
              text: slName + " (" + sisa + " sisa)",
              callback_data: "cb_rs_sl:" + bId + ":" + ymd + ":" + hhmm
            });
          } else {
            row.push({
              text: slName + " (Penuh)",
              callback_data: "cb_rs_full:" + slName
            });
          }
          if (row.length === 2) {
            slotButtons.push(row);
            row = [];
          }
        }
        if (row.length > 0) slotButtons.push(row);
        slotButtons.push([
          { text: "🔙 Ganti Tanggal", callback_data: "cb_rs_start:" + bId }
        ]);

        const indoStr = formatIndonesianDateStr_(ymd);
        const pickSlotText = "🕒 <b>PILIH WAKTU / JAM TINDAKAN</b> 🏥\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "📅 <b>Tanggal Dipilih:</b> " + indoStr + "\n\n" +
          "Silakan pilih jam pelaksanaan tindakan yang masih tersedia kuotanya:";
        sendTelegramMessage_(cbChatId, pickSlotText, { inline_keyboard: slotButtons });
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_rs_full:")) {
        const sl = cbData.replace("cb_rs_full:", "");
        answerTelegramCallbackQuery_(cbId, "Maaf, slot jam " + sl + " sudah penuh. Silakan pilih jam lain.", true);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_rs_sl:")) {
        const parts = cbData.split(":");
        const bId = parts[1];
        const ymd = parts[2];
        const hhmm = parts[3];
        const jamClean = hhmm.length === 4 ? (hhmm.slice(0, 2) + ":" + hhmm.slice(2)) : hhmm;
        answerTelegramCallbackQuery_(cbId, "Konfirmasi jadwal...");

        const b = findBookingForTelegram_(bId);
        const namaAnanda = b ? b.namaAnanda : "-";
        const indoStr = formatIndonesianDateStr_(ymd);

        const confText = "⚠️ <b>KONFIRMASI PEMINDAHAN JADWAL</b> 🗓️\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
          "📋 <b>ID Booking:</b> <code>" + escapeTelegramHtml_(bId) + "</code>\n" +
          "🗓️ <b>Jadwal Semula:</b> " + (b ? formatIndonesianDateStr_(b.tanggalKhitan) + " (" + formatJamDisplay_(b.jamKhitan) + ")" : "-") + "\n" +
          "✨ <b>Jadwal Baru:</b> <b>" + indoStr + " (" + formatJamDisplay_(jamClean) + ")</b>\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "Apakah Anda yakin ingin memindahkan jadwal khitan ke waktu tersebut?";

        const confButtons = {
          inline_keyboard: [
            [
              { text: "✅ Ya, Pindahkan Jadwal", callback_data: "cb_rs_ok:" + bId + ":" + ymd + ":" + hhmm }
            ],
            [
              { text: "❌ Batalkan & Kembali", callback_data: "cb_status:" + bId }
            ]
          ]
        };
        sendTelegramMessage_(cbChatId, confText, confButtons);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_rs_ok:")) {
        const parts = cbData.split(":");
        const bId = parts[1];
        const ymd = parts[2];
        const hhmm = parts[3];
        const jamClean = hhmm.length === 4 ? (hhmm.slice(0, 2) + ":" + hhmm.slice(2)) : hhmm;
        answerTelegramCallbackQuery_(cbId, "Memproses pemindahan...");

        const res = rescheduleBookingFromTelegram_(bId, ymd, jamClean, cbChatId, verifiedPhone);
        const backBtn = {
          inline_keyboard: [
            [{ text: "🔍 Lihat Rincian Jadwal Baru", callback_data: "cb_status:" + bId }]
          ]
        };
        sendTelegramMessage_(cbChatId, res.message, backBtn);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_cancel_start:")) {
        const bId = cbData.replace("cb_cancel_start:", "").trim();
        answerTelegramCallbackQuery_(cbId, "Konfirmasi pembatalan...");
        const b = findBookingForTelegram_(bId);
        const namaAnanda = b ? b.namaAnanda : "-";
        const warnText = "⚠️ <b>KONFIRMASI PEMBATALAN PENDAFTARAN</b> ❌\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "👦 <b>Nama Ananda:</b> " + escapeTelegramHtml_(namaAnanda) + "\n" +
          "📋 <b>ID Booking:</b> <code>" + escapeTelegramHtml_(bId) + "</code>\n" +
          "📅 <b>Jadwal:</b> " + (b ? formatIndonesianDateStr_(b.tanggalKhitan) + " (" + formatJamDisplay_(b.jamKhitan) + ")" : "-") + "\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "Apakah Anda yakin ingin membatalkan jadwal pendaftaran khitan ini?\n" +
          "<i>Tindakan ini akan mengosongkan slot kuota jadwal tindakan untuk pasien lain.</i>";
        const cancelButtons = {
          inline_keyboard: [
            [
              { text: "❌ Ya, Batalkan Pendaftaran", callback_data: "cb_cancel_ok:" + bId }
            ],
            [
              { text: "🔙 Kembali ke Rincian Data", callback_data: "cb_status:" + bId }
            ]
          ]
        };
        sendTelegramMessage_(cbChatId, warnText, cancelButtons);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_cancel_ok:")) {
        const bId = cbData.replace("cb_cancel_ok:", "").trim();
        answerTelegramCallbackQuery_(cbId, "Memproses pembatalan...");
        const res = cancelBookingFromTelegram_(bId, cbChatId, verifiedPhone);
        const backBtn = {
          inline_keyboard: [
            [{ text: "🔍 Lihat Status Terkini", callback_data: "cb_status:" + bId }]
          ]
        };
        sendTelegramMessage_(cbChatId, res.message, backBtn);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.startsWith("cb_selesai:") || cbData.startsWith("cb_konfirmasi:")) {
        if (!isAdmin) {
          answerTelegramCallbackQuery_(cbId, "Khusus akun Admin.", true);
          return HtmlService.createHtmlOutput("OK");
        }
        const isSelesai = cbData.startsWith("cb_selesai:");
        const bId = (isSelesai ? cbData.replace("cb_selesai:", "") : cbData.replace("cb_konfirmasi:", "")).trim();
        const targetStatus = isSelesai ? "Selesai" : "Terkonfirmasi";
        answerTelegramCallbackQuery_(cbId, "Mengubah status " + bId + "...");
        const updRes = updateBookingStatusFromTelegram_(bId, targetStatus);
        const detailBtn = {
          inline_keyboard: [
            [{ text: "🔍 Lihat Rincian Data", callback_data: "cb_status:" + bId }]
          ]
        };
        sendTelegramMessage_(cbChatId, updRes.message, detailBtn);
        return HtmlService.createHtmlOutput("OK");
      }

      if (cbData === "cb_review_force") {
        if (!isAdmin) {
          answerTelegramCallbackQuery_(cbId, "Khusus akun Admin.", true);
          return HtmlService.createHtmlOutput("OK");
        }
        answerTelegramCallbackQuery_(cbId, "Mereset cache & memuat 10 ulasan terbaru...");
        const resForce = checkGoogleReviewsAndNotify_(true);
        const accEmail = resForce.accountEmail || getScriptUserEmail_();
        const review10Text = format10GoogleReviewsText_(resForce.realtimeReviews, accEmail);
        const forceBtn = {
          inline_keyboard: [
            [
              { text: "⭐ Buka di Google Review", url: GOOGLE_REVIEW_PAGE_URL }
            ],
            [
              { text: "🔄 Pindai Ulang Real-time", callback_data: "cb_review_force" },
              { text: "✉️ Tes Email Notifikasi", callback_data: "cb_review_test_email" }
            ],
            [
              { text: "🔍 Diagnostik Sistem", callback_data: "cb_review_debug" },
              { text: "🧪 Uji Coba Format Bot", callback_data: "cb_review_test" }
            ]
          ]
        };
        sendTelegramMessage_(cbChatId, review10Text, forceBtn);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData === "cb_review_debug") {
        if (!isAdmin) {
          answerTelegramCallbackQuery_(cbId, "Khusus akun Admin.", true);
          return HtmlService.createHtmlOutput("OK");
        }
        answerTelegramCallbackQuery_(cbId, "Menjalankan diagnostik...");
        const diagText = diagnoseGoogleReviews_();
        const diagBtn = {
          inline_keyboard: [
            [
              { text: "🔄 Reset & Pindai Ulang", callback_data: "cb_review_force" },
              { text: "🧪 Uji Coba Format Bot", callback_data: "cb_review_test" }
            ],
            [
              { text: "⭐ Buka di Google Review", url: GOOGLE_REVIEW_PAGE_URL }
            ]
          ]
        };
        sendTelegramMessage_(cbChatId, diagText, diagBtn);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData === "cb_review_setup_trigger") {
        if (!isAdmin) {
          answerTelegramCallbackQuery_(cbId, "Khusus akun Admin.", true);
          return HtmlService.createHtmlOutput("OK");
        }
        answerTelegramCallbackQuery_(cbId, "Memperbarui status pemicu otomatis...");
        if (props) props.setProperty("KD_AUTO_TRIGGERS_INSTALLED", "true");
        const trText = "✅ <b>Pemicu Otomatis Berhasil Diperbarui!</b>\n" +
          "• ⭐ <b>Google Review:</b> Berjalan tiap 10 menit\n" +
          "• 🔔 <b>Reminder Khitan:</b> Berjalan tiap 1 jam\n" +
          "• 💾 <b>Pencadangan Database:</b> Aktif\n\n" +
          "<i>Status pemantauan ulasan berjalan otomatis di latar belakang.</i>";
        sendTelegramMessage_(cbChatId, trText, mainKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData === "cb_review_test") {
        if (!isAdmin) {
          answerTelegramCallbackQuery_(cbId, "Khusus akun Admin.", true);
          return HtmlService.createHtmlOutput("OK");
        }
        answerTelegramCallbackQuery_(cbId, "Mengirim contoh notifikasi...");
        testSendGoogleReviewAlert();
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData === "cb_review_test_email") {
        if (!isAdmin) {
          answerTelegramCallbackQuery_(cbId, "Khusus akun Admin.", true);
          return HtmlService.createHtmlOutput("OK");
        }
        answerTelegramCallbackQuery_(cbId, "Mengirim contoh email ulasan...");
        const emailRes = testSendGoogleReviewEmail("denluckyman@gmail.com");
        if (emailRes.success) {
          sendTelegramMessage_(cbChatId, "✅ <b>Email Uji Coba Berhasil Dikirim!</b>\nNotifikasi simulasi ulasan telah dikirim ke <code>denluckyman@gmail.com</code>. Silakan periksa inbox.", mainKeyboard);
        } else {
          sendTelegramMessage_(cbChatId, "⚠️ Gagal kirim email: " + escapeTelegramHtml_(emailRes.error || ""), mainKeyboard);
        }
        return HtmlService.createHtmlOutput("OK");
      }

      answerTelegramCallbackQuery_(cbId, "Perintah diterima.");
      return HtmlService.createHtmlOutput("OK");
    }

    const msg = update.message || update.edited_message;
    if (!msg) {
      return HtmlService.createHtmlOutput("OK");
    }

    const chatId = senderChatId;

    // 1. Otorisasi Pengguna & Admin
    const cleanAdminPhone = cleanPhoneNumber(config.adminPhone || "081222531978");
    let verifiedPhone = props ? (props.getProperty("tg_auth_" + chatId) || "") : "";
    let isAdmin = isTelegramAdmin_(chatId, verifiedPhone, config);

    // Otomatis rekam chat ID Admin & pastikan pemicu ulasan aktif
    if (isAdmin && props) {
      try {
        let activeAdmins = props.getProperty("KD_ACTIVE_ADMIN_CHAT_IDS") || "";
        const parts = activeAdmins.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
        if (chatId && parts.indexOf(String(chatId)) === -1) {
          parts.push(String(chatId));
          props.setProperty("KD_ACTIVE_ADMIN_CHAT_IDS", parts.join(","));
        }
      } catch (e) {}

      if (props.getProperty("KD_AUTO_TRIGGERS_INSTALLED") !== "true") {
        try { ensureAutomaticTriggers_(); } catch (trErr) {}
      }
    }

    // 2. Otorisasi Pengguna Terdaftar (Keluarga Pasien di Sheet BOOKING):
    let isRegistered = false;
    let registeredBooking = null;
    if (!isAdmin && verifiedPhone) {
      registeredBooking = findBookingForTelegram_(verifiedPhone);
      if (registeredBooking) {
        isRegistered = true;
      } else {
        if (props) props.deleteProperty("tg_auth_" + chatId);
        verifiedPhone = "";
      }
    }

    const isAuthorized = isAdmin || isRegistered;

    // Keyboard Menu Bawah Cepat
    const adminKeyboard = {
      keyboard: [
        [{ text: "📅 Jadwal Mendatang" }, { text: "🔍 Cek Status Booking" }],
        [{ text: "📅 Hari Ini" }, { text: "⚡ Jadwal Besok" }],
        [{ text: "⭐ 10 Google Review Terbaru" }, { text: "⏰ Cek Reminder (< 12 Jam)" }],
        [{ text: "📊 Statistik Khitan" }, { text: "💾 Backup Database" }],
        [{ text: "ℹ️ Bantuan & Info" }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    const userKeyboard = {
      keyboard: [
        [{ text: "🔍 Status Booking Saya" }, { text: "📅 Jadwal Khitan" }],
        [{ text: "⚡ Jadwal Besok" }, { text: "ℹ️ Bantuan & Info" }],
        [{ text: "🚪 Keluar / Ganti Nomor" }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    const authKeyboard = {
      keyboard: [
        [{ text: "📱 Verifikasi Nomor WhatsApp Saya", request_contact: true }],
        [{ text: "ℹ️ Bantuan & Info" }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    const mainKeyboard = isAdmin ? adminKeyboard : (isRegistered ? userKeyboard : authKeyboard);

    // A. Penanganan Kirim Kontak (Verifikasi Nomor via Tombol Telegram)
    if (msg.contact && msg.contact.phone_number) {
      const incomingPhone = String(msg.contact.phone_number || "").trim();
      const cleanIncoming = cleanPhoneNumber(incomingPhone);
      const contactUserId = msg.contact.user_id ? String(msg.contact.user_id) : "";
      const senderUserId = msg.from ? String(msg.from.id) : (msg.chat ? String(msg.chat.id) : "");

      // Proteksi Spoofing: Pastikan kartu kontak yang dikirim benar-benar milik akun pengirim
      if (contactUserId && senderUserId && contactUserId !== senderUserId) {
        const spoofMsg = "⚠️ <b>Verifikasi Ditolak: Kontak Tidak Sah</b> 🔒\n\n" +
          "Kontak yang Anda kirim bukan berasal dari akun Telegram Anda sendiri.\n" +
          "Silakan gunakan tombol resmi <b>'📱 Verifikasi Nomor WhatsApp Saya'</b> di bawah untuk verifikasi otomatis.";
        sendTelegramMessage_(chatId, spoofMsg, authKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      // Verifikasi Admin
      if (cleanIncoming === cleanAdminPhone) {
        if (props) {
          props.setProperty("tg_auth_" + chatId, incomingPhone);
          props.setProperty("tg_phone_chat_" + cleanIncoming, chatId);
        }
        const welcAdmin = "✅ <b>Verifikasi Admin Berhasil!</b> 👨‍⚕️\n\n" +
          "Selamat datang, <b>Admin Rumah Khitan Damai</b>.\n" +
          "Akun Telegram Anda telah terverifikasi dengan nomor <code>" + escapeTelegramHtml_(incomingPhone) + "</code>.\n" +
          "Seluruh fitur kendali bot, pemindai reminder, dan pengingat jadwal telah diaktifkan.";
        sendTelegramMessage_(chatId, welcAdmin, adminKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      // Verifikasi Pasien Terdaftar
      const found = findBookingForTelegram_(incomingPhone);
      if (found) {
        if (props) {
          props.setProperty("tg_auth_" + chatId, incomingPhone);
          props.setProperty("tg_phone_chat_" + cleanIncoming, chatId);
        }
        const sapaan = resolveSapaanWa_(found.hubunganKeluarga);
        const welcUser = "✅ <b>Verifikasi Berhasil!</b> 🎉\n\n" +
          "Selamat datang, " + sapaan + " <b>" + escapeTelegramHtml_(found.namaPenanggungJawab) + "</b>!\n" +
          "Akun Telegram Anda telah terhubung dengan data pendaftaran Ananda <b>" + escapeTelegramHtml_(found.namaAnanda) + "</b> (ID: <code>" + escapeTelegramHtml_(found.idBooking) + "</code>).\n\n" +
          "Silakan gunakan menu di bawah untuk memeriksa rincian status booking dan jadwal khitan Anda.";
        sendTelegramMessage_(chatId, welcUser, userKeyboard);
        return HtmlService.createHtmlOutput("OK");
      } else {
        const notFoundMsg = "⛔ <b>Akses Ditolak: Nomor Belum Terdaftar</b> 🔒\n\n" +
          "Nomor HP Telegram Anda (<code>" + escapeTelegramHtml_(incomingPhone) + "</code>) tidak terdaftar dalam database pendaftaran khitan kami.\n\n" +
          "Akses bot ini khusus untuk <b>Admin (081222531978)</b> dan <b>Keluarga Pasien yang Telah Terdaftar</b> di Rumah Khitan Damai.\n\n" +
          "💡 <i>Jika Anda mendaftar menggunakan nomor WhatsApp yang berbeda, silakan ketik langsung nomor WhatsApp atau ID Booking Anda di chat ini untuk verifikasi manual.</i>\n\n" +
          "📞 Hubungi Admin jika Anda butuh bantuan: 081222531978";
        sendTelegramMessage_(chatId, notFoundMsg, authKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }
    }

    // B. Respon jika pesan bukan teks (misal: stiker, gambar, audio, lokasi)
    if (!msg.text) {
      if (!isAuthorized) {
        const authGateMsg = "🔒 <b>Layanan Khusus Pasien Terdaftar & Admin</b> 🏥✨\n\n" +
          "Mohon maaf, Bot Telegram Rumah Khitan Damai saat ini hanya dapat diakses oleh:\n" +
          "1. 👨‍⚕️ <b>Admin / Pengelola Klinik</b> (081222531978)\n" +
          "2. 👨‍👩‍👦 <b>Keluarga Pasien yang Telah Terdaftar</b> di sistem pendaftaran kami.\n\n" +
          "Silakan sentuh tombol <b>'📱 Verifikasi Nomor WhatsApp Saya'</b> di bawah atau ketik nomor WhatsApp yang didaftarkan.";
        sendTelegramMessage_(chatId, authGateMsg, authKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      const mediaReply = "Halo! Terima kasih telah menghubungi Bot Resmi Rumah Khitan Damai 😊\n\n" +
        "Bot saat ini melayani input berupa teks.\n" +
        "Silakan sentuh menu di bawah atau kirimkan perintah.";
      sendTelegramMessage_(chatId, mediaReply, mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    const rawText = String(msg.text).trim();
    const lowerText = rawText.toLowerCase();

    // C. Logout / Keluar Sesi
    if (lowerText === "/logout" || lowerText === "keluar" || lowerText === "🚪 keluar / ganti nomor") {
      if (props) {
        props.deleteProperty("tg_auth_" + chatId);
        if (verifiedPhone) {
          props.deleteProperty("tg_phone_chat_" + cleanPhoneNumber(verifiedPhone));
        }
      }
      const logoutMsg = "👋 <b>Anda Telah Keluar</b>\n\n" +
        "Sesi akses bot untuk akun Telegram ini telah dihentikan.\n" +
        "Silakan verifikasi nomor kembali sewaktu-waktu jika ingin mengakses layanan bot Rumah Khitan Damai.";
      sendTelegramMessage_(chatId, logoutMsg, authKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // D. Perintah Start / Bantuan / Info (DAPAT DIAKSES OLEH SIAPAPUN, TERMASUK PENGGUNA BARU)
    if (lowerText === "/start" || lowerText === "/help" || lowerText === "bantuan" || lowerText === "info" || lowerText === "/info" || lowerText === "ℹ️ bantuan & info" || lowerText === "halo" || lowerText === "hai") {
      let welcomeText = "👋 <b>Halo! Selamat Datang di Bot Resmi Rumah Khitan Damai</b> 🏥✨\n" +
        "<i>\"Aku Berani Khitan — Nyaman, Modern, dan Menyenangkan\"</i>\n\n";

      if (isAdmin) {
        welcomeText += "Silakan pilih menu di bawah atau ketik perintah kendali Admin:\n" +
          "📅 <b>/jadwal</b> — Lihat Jadwal Khitan Mendatang\n" +
          "📅 <b>/hariini</b> — Lihat Jadwal Khitan Hari Ini\n" +
          "⚡ <b>/besok</b> — Lihat Jadwal Khitan Besok (Lengkap dengan Tombol WhatsApp Reminder)\n" +
          "⏰ <b>/cekreminder</b> — Pindai jadwal khitan &lt; 12 jam\n" +
          "🔎 <b>/cari &lt;nama&gt;</b> — Cari pasien berdasarkan nama\n" +
          "📊 <b>/statistik</b> — Ringkasan total & status pasien\n" +
          "⭐ <b>/cekreview</b> atau <b>/10review</b> — Lihat 10 Google Review terbaru real-time\n" +
          "🧪 <b>/tesreview</b> — Uji coba kirim notifikasi Google Review\n" +
          "🤖 <b>/statusbot</b> — Cek kesehatan webhook & trigger bot\n" +
          "💾 <b>/backup</b> — Backup seluruh database ke Google Drive\n" +
          "🏁 <b>/selesai &lt;ID&gt;</b> — Tandai pasien selesai tindakan\n" +
          "✅ <b>/konfirmasi &lt;ID&gt;</b> — Konfirmasi jadwal pasien\n" +
          "❌ <b>/batal &lt;ID&gt;</b> — Batalkan jadwal pendaftaran\n" +
          "🔘 <b>/setcommands</b> — Daftarkan shortcut perintah bot Telegram\n" +
          "🔍 <b>Cek Booking</b> — Ketik ID Booking / Nomor WhatsApp pasien.\n";
      } else if (isRegistered) {
        welcomeText += "Silakan pilih menu di bawah untuk memeriksa informasi pendaftaran khitan Ananda:\n" +
          "🔍 <b>Status Booking Saya</b> — Informasi lengkap jadwal & status tindakan Ananda\n" +
          "📅 <b>Jadwal Khitan</b> — Jadwal pelaksanaan khitan klinik mendatang\n" +
          "⚡ <b>Jadwal Besok</b> — Jadwal khitan esok hari\n" +
          "🚪 <b>Keluar</b> — Ganti nomor WhatsApp akun ini\n";
      } else {
        welcomeText += "Bot ini melayani <b>Keluarga Pasien yang Telah Terdaftar</b> dan <b>Admin Klinik</b>.\n\n" +
          "Untuk mulai mengakses layanan bot, silakan hubungkan nomor Anda:\n" +
          "👉 Sentuh tombol <b>'📱 Verifikasi Nomor WhatsApp Saya'</b> di bawah, ATAU\n" +
          "👉 Ketik langsung <b>Nomor WhatsApp</b> yang didaftarkan / <b>ID Booking</b> Anda di chat ini.\n";
      }

      welcomeText += "\n📞 <i>Pusat Bantuan WhatsApp: 081222531978</i>";
      const startInlineButtons = isAuthorized ? {
        inline_keyboard: [
          [
            { text: "📅 Jadwal Hari Ini", callback_data: "cb_jadwal_today" },
            { text: "⚡ Jadwal Besok", callback_data: "cb_jadwal_besok" }
          ]
        ]
      } : null;
      sendTelegramMessage_(chatId, welcomeText, startInlineButtons || mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // E. Gerbang Akses: Verifikasi untuk pengguna yang belum terverifikasi
    if (!isAuthorized) {
      const cleanDigits = cleanPhoneNumber(rawText);
      const isPhone = cleanDigits.length >= 8 && cleanDigits.length <= 15;
      const nonBookingWords = ["info", "help", "bantuan", "halo", "hello", "hi", "menu", "admin", "jadwal", "daftar", "khitan", "status", "test", "tes"];
      const isIdBooking = !nonBookingWords.includes(lowerText) && !rawText.startsWith("/") &&
        (/^KD-[A-Za-z0-9\-]+$/i.test(rawText) || (/^[A-Za-z0-9]{5,10}$/i.test(rawText)));

      if (isPhone || isIdBooking) {
        const found = findBookingForTelegram_(rawText);
        if (found) {
          const registeredPhone = found.nomorHp || rawText;
          if (props) {
            props.setProperty("tg_auth_" + chatId, registeredPhone);
            props.setProperty("tg_phone_chat_" + cleanPhoneNumber(registeredPhone), chatId);
          }
          const sapaan = resolveSapaanWa_(found.hubunganKeluarga);
          const welcText = "✅ <b>Verifikasi Berhasil!</b> 🎉\n\n" +
            "Selamat datang, " + sapaan + " <b>" + escapeTelegramHtml_(found.namaPenanggungJawab) + "</b>!\n" +
            "Akun Anda terhubung dengan pendaftaran Ananda <b>" + escapeTelegramHtml_(found.namaAnanda) + "</b>.\n\n" +
            formatBookingDetailTelegram_(found, false);
          sendTelegramMessage_(chatId, welcText, userKeyboard);
          return HtmlService.createHtmlOutput("OK");
        } else if (cleanDigits === cleanAdminPhone) {
          const adminNotice = "🔐 <b>Verifikasi Akun Admin</b>\n\n" +
            "Untuk keamanan, verifikasi nomor Admin (081222531978) wajib menggunakan tombol <b>'📱 Verifikasi Nomor WhatsApp Saya'</b> di bawah.";
          sendTelegramMessage_(chatId, adminNotice, authKeyboard);
          return HtmlService.createHtmlOutput("OK");
        } else {
          const deniedMsg = "⛔ <b>Akses Ditolak: Data Tidak Ditemukan</b> 🔒\n\n" +
            "Data pendaftaran dengan kata kunci: <code>" + escapeTelegramHtml_(rawText) + "</code> tidak ditemukan dalam database pendaftaran khitan kami.\n\n" +
            "Akses bot ini khusus untuk <b>Admin (081222531978)</b> dan <b>Keluarga Pasien yang Telah Terdaftar</b> di Rumah Khitan Damai.\n\n" +
            "Silakan pastikan nomor WhatsApp atau ID Booking yang Anda masukkan sesuai saat mendaftar, atau hubungi Admin WhatsApp: 081222531978.";
          sendTelegramMessage_(chatId, deniedMsg, authKeyboard);
          return HtmlService.createHtmlOutput("OK");
        }
      }

      // Jika mengetik pesan umum / perintah lain saat belum terverifikasi
      const authGateMsg = "🔒 <b>Layanan Khusus Pasien Terdaftar & Admin</b> 🏥✨\n" +
        "<i>\"Rumah Khitan Damai — Nyaman, Modern, dan Menyenangkan\"</i>\n\n" +
        "Mohon maaf, Bot Telegram resmi ini hanya dapat diakses oleh:\n" +
        "1. 👨‍⚕️ <b>Admin / Pengelola Klinik</b> (081222531978)\n" +
        "2. 👨‍👩‍👦 <b>Keluarga Pasien yang Telah Mendaftar Khitan</b> di sistem kami.\n\n" +
        "Untuk membuka akses layanan bot, silakan verifikasi nomor Anda:\n" +
        "👉 Sentuh tombol <b>'📱 Verifikasi Nomor WhatsApp Saya'</b> di bawah, ATAU\n" +
        "👉 Ketik <b>Nomor WhatsApp</b> yang didaftarkan / <b>ID Booking</b> Anda di chat ini.\n\n" +
        "📞 <i>Pusat Bantuan WhatsApp: 081222531978</i>";
      sendTelegramMessage_(chatId, authGateMsg, authKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // F. Tombol "🔍 Status Booking Saya" (Khusus Pengguna Terdaftar)
    if (lowerText === "🔍 status booking saya" || lowerText === "status booking saya" || lowerText === "status booking") {
      const myBooking = findBookingForTelegram_(verifiedPhone || chatId);
      if (myBooking) {
        const detailText = formatBookingDetailTelegram_(myBooking, isAdmin);
        const actionBtn = isAdmin ? buildBookingActionInlineKeyboard_(myBooking) : buildPatientActionInlineKeyboard_(myBooking);
        sendTelegramMessage_(chatId, detailText, actionBtn || mainKeyboard);
      } else {
        sendTelegramMessage_(chatId, "⚠️ Data pendaftaran Anda tidak ditemukan. Silakan hubungi Admin WhatsApp: 081222531978.", mainKeyboard);
      }
      return HtmlService.createHtmlOutput("OK");
    }

    // 1b. Perintah Cek Reminder Jadwal < 12 Jam (Khusus Admin)
    if (lowerText === "/cekreminder" || lowerText === "/scanreminder" || lowerText === "cekreminder" || lowerText === "⏰ cek reminder (< 12 jam)") {
      if (!isAdmin) {
        sendTelegramMessage_(chatId, "⛔ <b>Akses Khusus Admin</b>\nPerintah pemindaian pengingat jadwal hanya dapat dijalankan oleh akun pengelola / Admin Khitan Damai.", mainKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      const scanRes = checkAndSendUpcomingReminders_();
      if (scanRes.locked) {
        sendTelegramMessage_(chatId, "⏳ <i>Pemindaian reminder sedang berjalan oleh proses lain. Silakan coba kembali dalam beberapa saat.</i>", mainKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      const items = scanRes.items || [];
      let resText = "⏰ <b>HASIL PEMINDAIAN JADWAL KHITAN (&lt; 12 JAM)</b> 🔔\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "📋 <b>Total Pendaftaran Diperiksa:</b> " + (scanRes.checked || 0) + " baris data\n" +
        "⏳ <b>Jadwal Pasien &lt; 12 Jam:</b> " + items.length + " pasien\n" +
        "📨 <b>Notifikasi Otomatis Baru Terkirim:</b> " + (scanRes.sent || 0) + " pasien\n" +
        "━━━━━━━━━━━━━━━━━━\n";

      let inlineButtons = null;
      if (items.length > 0) {
        resText += "\n📋 <b>Daftar Pasien Menuju Tindakan (&lt; 12 Jam):</b>\n";
        const buttons = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i];
          const it = entry.item;
          const diffH = entry.diffHours;
          const sisaText = diffH < 1 ? ("± " + Math.max(1, Math.round(diffH * 60)) + " Menit") : ("± " + Math.round(diffH) + " Jam");
          const jamDisplay = (it.jamKhitan && it.jamKhitan !== "-") ? String(it.jamKhitan).replace(/wib/gi, "").trim() : "08:00";

          resText += (i + 1) + ". 👦 <b>" + escapeTelegramHtml_(it.namaAnanda) + "</b> (" + escapeTelegramHtml_(sisaText) + " lagi)\n" +
                     "   🕒 Pukul " + escapeTelegramHtml_(jamDisplay) + " WIB • 📱 <code>" + escapeTelegramHtml_(it.nomorHp) + "</code>\n";

          const cleanPhone = cleanPhoneForWa_(it.nomorHp);
          if (cleanPhone) {
            const waText = buildWaReminderText_(it);
            const directWaUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(waText);
            const waUrl = buildWaTrackingUrl_(it.idBooking, "reminder", directWaUrl);
            buttons.push([
              {
                text: "🔔 WA Reminder • " + it.namaAnanda + " (" + sisaText + ")",
                url: waUrl
              }
            ]);
          }
        }
        resText += "\n💡 <i>Sentuh tombol di bawah untuk membuka WhatsApp & mengirim pesan reminder langsung ke keluarga pasien.</i>";
        if (buttons.length > 0) {
          inlineButtons = { inline_keyboard: buttons };
        }
      } else {
        resText += "ℹ️ <i>Tidak ada jadwal khitan yang berjarak &lt; 12 jam saat ini (semua pendaftaran belum memasuki rentang 12 jam atau sudah berstatus selesai/batal).</i>";
      }

      sendTelegramMessage_(chatId, resText, inlineButtons || mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 1c. Perintah Backup Database Manual (Khusus Admin)
    if (lowerText === "/backup" || lowerText === "backup" || lowerText === "backup database" || lowerText === "💾 backup database") {
      if (!isAdmin) {
        sendTelegramMessage_(chatId, "⛔ <b>Akses Khusus Admin</b>\nPerintah backup database hanya dapat dijalankan oleh akun pengelola / Admin Khitan Damai.", mainKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      // Proteksi deduplikasi: cegah backup berulang dalam interval 2 menit
      const lastBackupMs = parseInt((props && props.getProperty("LAST_BACKUP_TIME")) || "0", 10);
      if (Date.now() - lastBackupMs < 120000) {
        sendTelegramMessage_(chatId, "ℹ️ <i>Pencadangan baru saja dijalankan kurang dari 2 menit yang lalu. Silakan tunggu sebentar jika ingin mencadangkan ulang.</i>", mainKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      sendTelegramMessage_(chatId, "⏳ <i>Sedang memproses backup seluruh sheet database ke Google Drive...</i>", mainKeyboard);
      try {
        const bRes = executeDatabaseBackup_();
        if (props) props.setProperty("LAST_BACKUP_TIME", String(Date.now()));
        sendTelegramBackupNotification_(bRes, false);
      } catch (errBackup) {
        sendTelegramMessage_(chatId, "❌ <b>Gagal Memproses Backup Database:</b>\n" + escapeTelegramHtml_(errBackup.toString()), mainKeyboard);
      }
      return HtmlService.createHtmlOutput("OK");
    }

    // 1c2. Perintah Pengecekan Google Review Manual & 10 Ulasan Terbaru (Khusus Admin)
    const isCekReviewCmd = lowerText === "/cekreview" || lowerText.startsWith("/cekreview ") ||
      lowerText === "cekreview" || lowerText.startsWith("cekreview ") ||
      lowerText === "cek review" || lowerText === "⭐ cek google review" ||
      lowerText === "/review" || lowerText.startsWith("/review ") ||
      lowerText === "/10review" || lowerText === "10review" ||
      lowerText === "/review10" || lowerText === "review10" ||
      lowerText === "⭐ 10 google review terbaru" || lowerText === "10 google review terbaru" ||
      lowerText === "⭐ 10 review terbaru" || lowerText === "10 review terbaru";

    if (isAdmin && isCekReviewCmd) {
      if (lowerText.includes("debug") || lowerText.includes("diagnosa") || lowerText.includes("diagnose")) {
        sendTelegramMessage_(chatId, "⏳ <i>Menjalankan diagnostik menyeluruh sistem Google Review & Gmail...</i>", mainKeyboard);
        const diagReport = diagnoseGoogleReviews_();
        const diagBtn = {
          inline_keyboard: [
            [
              { text: "🔄 Reset & Pindai Ulang", callback_data: "cb_review_force" },
              { text: "🧪 Uji Coba Format Bot", callback_data: "cb_review_test" }
            ],
            [
              { text: "⭐ Buka di Google Review", url: GOOGLE_REVIEW_PAGE_URL }
            ]
          ]
        };
        sendTelegramMessage_(chatId, diagReport, diagBtn);
        return HtmlService.createHtmlOutput("OK");
      }

      const isForce = lowerText.includes("reset") || lowerText.includes("force") || lowerText.includes("ulang");
      sendTelegramMessage_(chatId, "⏳ <i>Sedang memuat 10 Google Review terbaru secara real-time dari Google Maps..." + (isForce ? " (Reset Cache)..." : "") + "</i>", mainKeyboard);

      let trInfo = "Aktif (tiap 10 menit)";
      if (props && props.getProperty("KD_AUTO_TRIGGERS_INSTALLED") !== "true") {
        props.setProperty("KD_AUTO_TRIGGERS_INSTALLED", "true");
      }

      const revRes = checkGoogleReviewsAndNotify_(isForce);
      const accEmail = (revRes && revRes.accountEmail) || getScriptUserEmail_();

      if (revRes.locked) {
        sendTelegramMessage_(chatId, "⏳ <i>Pengecekan ulasan sedang berjalan oleh proses lain. Silakan coba sesaat lagi.</i>", mainKeyboard);
      } else if (!revRes.success) {
        sendTelegramMessage_(chatId, "⚠️ <b>Gagal Memeriksa Google Review:</b>\n" + escapeTelegramHtml_(revRes.error || revRes.message || "Kesalahan tidak diketahui"), mainKeyboard);
      } else {
        if (revRes.found > 0) {
          const succMsg = "✅ <b>Pemeriksaan Real-time Selesai!</b>\n" +
            "━━━━━━━━━━━━━━━━━━\n" +
            "⭐ <b>" + revRes.found + " Ulasan Baru</b> berhasil ditemukan dari Google Maps dan dinotifikasikan ke Telegram & Email!\n" +
            "👤 <b>Email Penerima:</b> <code>" + escapeTelegramHtml_(accEmail) + "</code>\n" +
            "⏰ <b>Pemicu Otomatis:</b> " + trInfo;
          sendTelegramMessage_(chatId, succMsg, mainKeyboard);
        }

        // Tampilkan 10 Google Review Terbaru secara lengkap dan terstruktur
        const review10Text = format10GoogleReviewsText_(revRes.realtimeReviews, accEmail);
        const reviewBtn = {
          inline_keyboard: [
            [
              { text: "⭐ Buka di Google Review", url: GOOGLE_REVIEW_PAGE_URL }
            ],
            [
              { text: "🔄 Pindai Ulang Real-time", callback_data: "cb_review_force" },
              { text: "✉️ Tes Email Notifikasi", callback_data: "cb_review_test_email" }
            ],
            [
              { text: "🧪 Uji Coba Format Bot", callback_data: "cb_review_test" },
              { text: "🔍 Diagnostik Sistem", callback_data: "cb_review_debug" }
            ]
          ]
        };
        sendTelegramMessage_(chatId, review10Text, reviewBtn);
      }
      return HtmlService.createHtmlOutput("OK");
    }

    if (isAdmin && (lowerText === "/tesreview" || lowerText === "tesreview" || lowerText === "test review" || lowerText === "tes review")) {
      sendTelegramMessage_(chatId, "🧪 <i>Mengirim contoh format notifikasi Google Review ke Telegram...</i>", mainKeyboard);
      const testRes = testSendGoogleReviewAlert();
      if (!testRes.success) {
        sendTelegramMessage_(chatId, "⚠️ Gagal mengirim tes review: " + escapeTelegramHtml_(testRes.error || testRes.message), mainKeyboard);
      }
      return HtmlService.createHtmlOutput("OK");
    }

    if (isAdmin && (lowerText === "/tesemailreview" || lowerText === "tesemailreview" || lowerText === "tes email review" || lowerText === "test email review")) {
      sendTelegramMessage_(chatId, "⏳ <i>Mengirim contoh email notifikasi Google Review ke <code>denluckyman@gmail.com</code>...</i>", mainKeyboard);
      const testEmailRes = testSendGoogleReviewEmail("denluckyman@gmail.com");
      if (testEmailRes.success) {
        sendTelegramMessage_(chatId, "✅ <b>Email Uji Coba Berhasil Dikirim!</b>\nNotifikasi simulasi ulasan Google Review telah terkirim ke alamat email:\n<code>denluckyman@gmail.com</code>\n\nSilakan periksa Kotak Masuk atau folder Spam.", mainKeyboard);
      } else {
        sendTelegramMessage_(chatId, "⚠️ <b>Gagal Mengirim Email:</b>\n" + escapeTelegramHtml_(testEmailRes.error || "Terjadi kesalahan"), mainKeyboard);
      }
      return HtmlService.createHtmlOutput("OK");
    }

    // 1c3. Perintah Pasang Trigger Background Otomatis (Khusus Admin)
    if (isAdmin && (lowerText === "/settrigger" || lowerText === "settrigger" || lowerText === "/aktifkantrigger" || lowerText === "aktifkantrigger")) {
      const trRes = ensureAutomaticTriggers_();
      let statusDetail = "Aktif (setiap 5 menit)";
      if (!trRes.success && trRes.error) {
        statusDetail = "⚠️ " + trRes.error;
      }
      const trMsg = "✅ <b>PEMICU OTOMATIS AKTIF!</b> ⏰\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "• ⭐ <b>Google Review Trigger:</b> " + statusDetail + "\n" +
        "• 🔔 <b>Reminder Jadwal Khitan:</b> Aktif (setiap 1 jam)\n" +
        "• 💾 <b>Auto Backup Bulanan:</b> Aktif\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "<i>Semua proses pemantauan ulasan berjalan otomatis di latar belakang setiap 5 menit. Setiap ulasan baru akan langsung dinotifikasikan ke bot Telegram ini dan email admin.</i>";
      sendTelegramMessage_(chatId, trMsg, mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 1d. Perintah Cepat Ubah Status Booking (Khusus Admin)
    if (isAdmin && (lowerText.startsWith("/selesai ") || lowerText.startsWith("/konfirmasi ") || lowerText.startsWith("/batal "))) {
      const parts = rawText.split(/\s+/);
      const cmd = parts[0].toLowerCase().replace("/", "");
      const targetId = (parts[1] || "").trim().toUpperCase();

      if (!targetId) {
        sendTelegramMessage_(chatId, "⚠️ Mohon sertakan ID Booking.\nContoh: <code>/" + cmd + " KD-202610-001</code>", mainKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      let newStatus = "Terkonfirmasi";
      if (cmd === "selesai") newStatus = "Selesai";
      else if (cmd === "batal") newStatus = "Batal";
      else if (cmd === "konfirmasi") newStatus = "Terkonfirmasi";

      const resUpd = updateBookingStatusFromTelegram_(targetId, newStatus);
      sendTelegramMessage_(chatId, resUpd.message, mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 1e. Perintah Statistik Khitan (Khusus Admin)
    if (isAdmin && (lowerText === "/statistik" || lowerText === "statistik" || lowerText === "📊 statistik khitan")) {
      const sheet = getSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        sendTelegramMessage_(chatId, "📊 Belum ada data pendaftaran.", mainKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }

      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      const now = new Date();
      const currentMonthKey = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM");
      const todayYmd = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");

      let total = 0;
      let countConfirmed = 0;
      let countPending = 0;
      let countSelesai = 0;
      let countBatal = 0;
      let countBulanIni = 0;
      let countHariIni = 0;

      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const id = String(row[0] || "").trim();
        if (!id) continue;
        total++;

        const st = String(row[21] || "").trim().toLowerCase();
        if (st === "selesai") countSelesai++;
        else if (st === "batal") countBatal++;
        else if (st === "pending" || st.includes("menunggu")) countPending++;
        else countConfirmed++;

        let tglKhitanStr = row[5];
        if (tglKhitanStr instanceof Date) {
          tglKhitanStr = Utilities.formatDate(tglKhitanStr, "Asia/Jakarta", "yyyy-MM-dd");
        } else {
          tglKhitanStr = normalizeYmd_(tglKhitanStr);
        }

        if (tglKhitanStr) {
          if (tglKhitanStr.substring(0, 7) === currentMonthKey) countBulanIni++;
          if (tglKhitanStr.substring(0, 10) === todayYmd) countHariIni++;
        }
      }

      const statMsg = "📊 <b>RINGKASAN STATISTIK KHITAN DAMAI</b> 🏥\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "📈 <b>Total Seluruh Pasien:</b> " + total + " Orang\n" +
        "🔥 <b>Jadwal Hari Ini:</b> " + countHariIni + " Pasien\n" +
        "🗓️ <b>Jadwal Bulan Ini:</b> " + countBulanIni + " Pasien\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "<b>Status Pasien:</b>\n" +
        "• ✅ Terkonfirmasi: " + countConfirmed + " Pasien\n" +
        "• ⏳ Menunggu Konfirmasi: " + countPending + " Pasien\n" +
        "• 🏁 Telah Selesai: " + countSelesai + " Pasien\n" +
        "• ❌ Dibatalkan: " + countBatal + " Pasien\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "<i>Data ditarik langsung secara real-time dari Sheet BOOKING.</i>";

      sendTelegramMessage_(chatId, statMsg, mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 1f. Perintah Status Bot & Webhook Diagnostik (Khusus Admin)
    if (isAdmin && (lowerText === "/statusbot" || lowerText === "statusbot" || lowerText === "status bot")) {
      let webhookInfoText = "Tidak dapat memeriksa webhook info.";
      try {
        const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.botToken + "/getWebhookInfo", { muteHttpExceptions: true });
        if (res.getResponseCode() === 200) {
          const wData = JSON.parse(res.getContentText()).result;
          webhookInfoText = "• <b>URL:</b> <code>" + escapeTelegramHtml_(wData.url ? (wData.url.substring(0, 45) + "...") : "Belum di-set") + "</code>\n" +
            "• <b>Custom Cert:</b> " + (wData.has_custom_certificate ? "Ya" : "Tidak") + "\n" +
            "• <b>Pending Updates:</b> " + (wData.pending_update_count || 0) + " update\n" +
            "• <b>Error Terakhir:</b> " + escapeTelegramHtml_(wData.last_error_message || "Tidak ada (Normal)") + "\n" +
            (wData.last_error_date ? ("• <b>Waktu Error:</b> " + Utilities.formatDate(new Date(wData.last_error_date * 1000), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss") + " WIB\n") : "");
        }
      } catch (wErr) {
        webhookInfoText = "Peringatan getWebhookInfo: " + escapeTelegramHtml_(wErr.toString());
      }

      // Cek status triggers di Apps Script
      let reminderTriggerStatus = "❌ Belum Aktif";
      let reviewTriggerStatus = "❌ Belum Aktif";
      try {
        const triggers = ScriptApp.getProjectTriggers();
        for (let t = 0; t < triggers.length; t++) {
          const fn = triggers[t].getHandlerFunction();
          if (fn === "checkUpcomingKhitanReminders") {
            reminderTriggerStatus = "✅ Aktif (Setiap 1 Jam)";
          } else if (fn === "checkGoogleReviewsTrigger") {
            reviewTriggerStatus = "✅ Aktif (Setiap 10 Menit)";
          }
        }
      } catch (trErr) {
        reminderTriggerStatus = "⚠️ Error: " + trErr.message;
        reviewTriggerStatus = "⚠️ Error: " + trErr.message;
      }

      const lastBackupTime = (props && props.getProperty("AUTO_BACKUP_LAST_RUN")) || "Belum tercatat";
      const lastBackupFile = (props && props.getProperty("AUTO_BACKUP_LAST_FILE")) || "-";
      const lastReviewCheck = (props && props.getProperty("KD_LAST_CHECK_REVIEW_TIME")) || "Belum pernah diperiksa";
      const maskedToken = config.botToken ? (config.botToken.substring(0, 6) + "..." + config.botToken.slice(-4)) : "Belum diatur";

      const diagMsg = "🤖 <b>STATUS KESEHATAN BOT &amp; SISTEM KHITAN DAMAI</b> 🏥\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "🔑 <b>Bot Token:</b> <code>" + maskedToken + "</code>\n" +
        "👨‍⚕️ <b>Admin Chat ID:</b> <code>" + escapeTelegramHtml_(config.chatId) + "</code>\n" +
        "📱 <b>Admin Phone:</b> <code>" + escapeTelegramHtml_(config.adminPhone) + "</code>\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "🌐 <b>Status Webhook Telegram:</b>\n" +
        webhookInfoText +
        "━━━━━━━━━━━━━━━━━━\n" +
        "⭐ <b>Trigger Google Review (10m):</b> " + reviewTriggerStatus + "\n" +
        "⏰ <b>Trigger Reminder Khitan (1h):</b> " + reminderTriggerStatus + "\n" +
        "🕒 <b>Cek Review Terakhir:</b> " + escapeTelegramHtml_(lastReviewCheck) + "\n" +
        "💾 <b>Backup Terakhir:</b> " + escapeTelegramHtml_(lastBackupTime) + "\n" +
        "📁 <b>File Backup:</b> <code>" + escapeTelegramHtml_(lastBackupFile) + "</code>\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "💡 <i>Ketik <code>/settrigger</code> jika ingin memperbarui pemicu otomatis, atau <code>/cekreview</code> untuk memindai ulasan.</i>";

      sendTelegramMessage_(chatId, diagMsg, mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 1g. Perintah Mendaftarkan Ulang Webhook (Khusus Admin)
    if (isAdmin && (lowerText === "/setwebhook" || lowerText === "setwebhook")) {
      sendTelegramMessage_(chatId, "⏳ <i>Sedang mendaftarkan ulang Webhook Telegram ke Apps Script...</i>", mainKeyboard);
      const hookRes = setTelegramWebhookUrl_();
      if (hookRes.success) {
        sendTelegramMessage_(chatId, "✅ <b>Pendaftaran Webhook Berhasil!</b>\nTarget URL: <code>" + escapeTelegramHtml_(hookRes.webhookUrl) + "</code>", mainKeyboard);
      } else {
        sendTelegramMessage_(chatId, "❌ <b>Gagal Mendaftarkan Webhook:</b>\n" + escapeTelegramHtml_(hookRes.error || hookRes.response || "Unknown error"), mainKeyboard);
      }
      return HtmlService.createHtmlOutput("OK");
    }

    // 1h. Perintah Cari Pasien Berdasarkan Nama (Khusus Admin)
    if (isAdmin && (lowerText.startsWith("/cari ") || lowerText.startsWith("cari "))) {
      const q = rawText.substring(rawText.indexOf(" ") + 1).trim();
      if (!q || q.length < 2) {
        sendTelegramMessage_(chatId, "⚠️ Mohon sertakan nama pasien minimal 2 karakter.\nContoh: <code>/cari Ahmad</code>", mainKeyboard);
        return HtmlService.createHtmlOutput("OK");
      }
      const results = searchBookingsByNameForTelegram_(q);
      const formatted = formatSearchResultsTelegram_(results, q);
      sendTelegramMessage_(chatId, formatted.text, formatted.buttons || mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 1i. Perintah Registrasi Bot Commands Shortcut Menu (Khusus Admin)
    if (isAdmin && (lowerText === "/setcommands" || lowerText === "setcommands")) {
      sendTelegramMessage_(chatId, "⏳ <i>Mendaftarkan shortcut perintah bot ke Telegram API...</i>", mainKeyboard);
      const cmdRes = registerTelegramBotCommands_();
      if (cmdRes && cmdRes.success) {
        sendTelegramMessage_(chatId, "✅ <b>Menu Commands Bot Berhasil Didaftarkan!</b>\nScope default (pasien) dan scope chat admin telah diperbarui.", mainKeyboard);
      } else {
        sendTelegramMessage_(chatId, "⚠️ Gagal mendaftarkan commands: " + escapeTelegramHtml_(cmdRes.error || "Unknown error"), mainKeyboard);
      }
      return HtmlService.createHtmlOutput("OK");
    }

    // 2a. Perintah Jadwal Mendatang / Jadwal Spesifik Tanggal
    if (lowerText === "/jadwal" || lowerText === "/upcoming" || lowerText === "jadwal" || lowerText === "📅 jadwal mendatang" || lowerText === "📅 jadwal khitan" || lowerText.startsWith("/jadwal ") || lowerText.startsWith("jadwal ")) {
      let filterArg = "upcoming";
      const parts = rawText.split(/\s+/);
      if (parts.length > 1) {
        const sub = parts.slice(1).join(" ").trim().toLowerCase();
        if (sub === "hari ini" || sub === "hariini" || sub === "today") {
          filterArg = "today";
        } else if (sub === "besok" || sub === "tomorrow") {
          filterArg = "tomorrow";
        } else {
          const parsedDate = parseDateQuery_(sub);
          if (parsedDate) {
            filterArg = parsedDate;
          }
        }
      }

      const upcomingData = getUpcomingBookingsGroupedByDate_(filterArg);
      const totalP = (upcomingData.dates || []).reduce(function(acc, dt) { return acc + (upcomingData.grouped[dt] ? upcomingData.grouped[dt].length : 0); }, 0);
      const totalPages = Math.ceil(totalP / 8) || 1;
      const scheduleText = formatUpcomingScheduleMessage_(upcomingData, isAdmin, 1, 8);
      const inlineButtons = buildSchedulePaginationKeyboard_(filterArg, 1, totalPages, filterArg === "tomorrow", upcomingData, isAdmin);
      sendTelegramMessage_(chatId, scheduleText, inlineButtons || mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 2b. Perintah Jadwal Hari Ini
    if (lowerText === "/hariini" || lowerText === "/today" || lowerText === "hari ini" || lowerText === "📅 hari ini") {
      const todayData = getUpcomingBookingsGroupedByDate_("today");
      const totalP = (todayData.dates || []).reduce(function(acc, dt) { return acc + (todayData.grouped[dt] ? todayData.grouped[dt].length : 0); }, 0);
      const totalPages = Math.ceil(totalP / 8) || 1;
      const scheduleText = formatUpcomingScheduleMessage_(todayData, isAdmin, 1, 8);
      const inlineButtons = buildSchedulePaginationKeyboard_("today", 1, totalPages, false, todayData, isAdmin);
      sendTelegramMessage_(chatId, scheduleText, inlineButtons || mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 2c. Perintah Jadwal Besok
    if (lowerText === "/besok" || lowerText === "/tomorrow" || lowerText === "besok" || lowerText === "⚡ jadwal besok") {
      const tomorrowData = getUpcomingBookingsGroupedByDate_("tomorrow");
      const totalP = (tomorrowData.dates || []).reduce(function(acc, dt) { return acc + (tomorrowData.grouped[dt] ? tomorrowData.grouped[dt].length : 0); }, 0);
      const totalPages = Math.ceil(totalP / 8) || 1;
      const scheduleText = formatUpcomingScheduleMessage_(tomorrowData, isAdmin, 1, 8);
      const inlineButtons = buildSchedulePaginationKeyboard_("tomorrow", 1, totalPages, true, tomorrowData, isAdmin);
      sendTelegramMessage_(chatId, scheduleText, inlineButtons || mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 3. Tombol "🔍 Cek Status Booking" (Panduan)
    if (lowerText === "🔍 cek status booking" || lowerText === "/cek") {
      const askText = "🔍 <b>Pencarian Status Booking Khitan</b>\n\n" +
        "Silakan ketikkan <b>ID Booking</b> (contoh: <code>KD-202610-001</code> atau <code>6UZA6KM</code>) atau <b>Nomor WhatsApp</b> yang didaftarkan.\n\n" +
        "Bot akan segera mencari data pendaftaran Anda.";
      sendTelegramMessage_(chatId, askText, mainKeyboard);
      return HtmlService.createHtmlOutput("OK");
    }

    // 4. Deteksi Pencarian (Bisa langsung ketik ID / No HP, atau diawali /cek <query> / /status <query>)
    let searchQuery = rawText;
    if (lowerText.startsWith("/cek ") || lowerText.startsWith("/status ")) {
      searchQuery = rawText.substring(rawText.indexOf(" ") + 1).trim();
    }

    const cleanDigits = cleanPhoneNumber(searchQuery);
    const isPhoneNumber = cleanDigits.length >= 8 && cleanDigits.length <= 15;
    const isIdBooking = /^[A-Za-z0-9\-_]{4,20}$/.test(searchQuery) && !searchQuery.startsWith("/");

    if (isPhoneNumber || isIdBooking) {
      const booking = findBookingForTelegram_(searchQuery);
      if (booking) {
        const detailText = formatBookingDetailTelegram_(booking, isAdmin);
        const inlineButtons = isAdmin ? buildBookingActionInlineKeyboard_(booking) : buildPatientActionInlineKeyboard_(booking);
        sendTelegramMessage_(chatId, detailText, inlineButtons || mainKeyboard);
      } else {
        const notFoundText = "⚠️ <b>Data Booking Tidak Ditemukan</b>\n\n" +
          "Pendaftaran dengan kata kunci: <code>" + escapeTelegramHtml_(searchQuery) + "</code> tidak ditemukan di database.\n" +
          "Mohon pastikan ID Booking (misal: <code>KD-202610-001</code> atau <code>6UZA6KM</code>) atau nomor WhatsApp yang dimasukkan sudah sesuai.";
        sendTelegramMessage_(chatId, notFoundText, mainKeyboard);
      }
      return HtmlService.createHtmlOutput("OK");
    }

    // 5. Fallback respon jika teks tidak dikenali
    const fallbackText = "Halo! Bot Khitan Damai siap melayani Anda 😊\n\n" +
      "Silakan pilih menu di bawah atau ketik:\n" +
      "• <b>/jadwal</b> — Melihat seluruh jadwal khitan mendatang\n" +
      "• <b>/hariini</b> — Melihat jadwal khitan hari ini\n" +
      "• <b>/besok</b> — Melihat jadwal khitan besok\n" +
      "• <b>ID Booking</b> atau <b>Nomor WhatsApp</b> untuk cek status pendaftaran.";
    sendTelegramMessage_(chatId, fallbackText, mainKeyboard);
    return HtmlService.createHtmlOutput("OK");
  } catch (err) {
    Logger.log("handleTelegramWebhookUpdate_ error: " + err.toString());
    return HtmlService.createHtmlOutput("OK");
  }
}

/**
 * Mendaftarkan Webhook Telegram ke URL Web App Google Apps Script
 */
function setTelegramWebhookUrl_(customUrl) {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken) {
      return { success: false, message: "Telegram Bot Token belum dikonfigurasi." };
    }
    const secret = getTelegramHookSecret_();
    let defaultUrl = "https://script.google.com/macros/s/AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs/exec";
    if (secret && !defaultUrl.includes("hook=")) {
      defaultUrl += "?hook=" + encodeURIComponent(secret);
    }
    const targetUrl = customUrl || defaultUrl;
    let endpoint = "https://api.telegram.org/bot" + config.botToken + "/setWebhook?url=" + encodeURIComponent(targetUrl);
    if (secret) {
      endpoint += "&secret_token=" + encodeURIComponent(secret);
    }
    const res = UrlFetchApp.fetch(endpoint, { muteHttpExceptions: true });
    const code = res.getResponseCode();
    const body = res.getContentText();
    if (code === 200) {
      try {
        const props = PropertiesService.getScriptProperties();
        if (props) props.setProperty("TG_WEBHOOK_MIGRATED", "true");
      } catch (pErr) {}
    }
    return { success: code === 200, code: code, response: body, webhookUrl: targetUrl };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Memeriksa dan memastikan Webhook Telegram terdaftar ke URL Apps Script aktif
 */
function ensureTelegramWebhookRegistered_() {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken) return;
    const secret = getTelegramHookSecret_();
    let expectedUrl = "https://script.google.com/macros/s/AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs/exec";
    if (secret && !expectedUrl.includes("hook=")) {
      expectedUrl += "?hook=" + encodeURIComponent(secret);
    }
    const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.botToken + "/getWebhookInfo", { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const wInfo = JSON.parse(res.getContentText()).result;
      if (wInfo && wInfo.url !== expectedUrl) {
        Logger.log("Penyelarasan Webhook: " + (wInfo.url || "kosong") + " -> " + expectedUrl);
        setTelegramWebhookUrl_(expectedUrl);
      }
    }
  } catch (e) {
    Logger.log("ensureTelegramWebhookRegistered_ error: " + e.toString());
  }
}

/**
 * Menyimpan data besar ke CacheService dengan pemecahan chunk aman (batas 100KB per key Apps Script)
 */
function putChunkedCache(key, data, ttlSeconds) {
  try {
    const cache = CacheService.getScriptCache();
    const ttl = ttlSeconds || SERVER_CACHE_DEFAULT_TTL;
    const str = typeof data === "string" ? data : JSON.stringify(data);
    const CHUNK_SIZE = 80000; // 80KB aman di bawah limit 100KB Apps Script

    if (str.length <= CHUNK_SIZE) {
      cache.put(key, str, ttl);
      cache.put(key + "_chunk_count", "1", ttl);
    } else {
      const count = Math.ceil(str.length / CHUNK_SIZE);
      const entries = {};
      entries[key + "_chunk_count"] = String(count);
      for (let i = 0; i < count; i++) {
        entries[key + "_chunk_" + i] = str.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      }
      cache.putAll(entries, ttl);
    }
  } catch (err) {
    Logger.log("Peringatan putChunkedCache(" + key + "): " + err.message);
  }
}

/**
 * Membaca data dari CacheService dengan penggabungan chunk otomatis
 */
function getChunkedCache(key) {
  try {
    const cache = CacheService.getScriptCache();
    const countStr = cache.get(key + "_chunk_count");
    if (!countStr) {
      const direct = cache.get(key);
      return direct ? JSON.parse(direct) : null;
    }
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count <= 0) return null;

    if (count === 1) {
      const single = cache.get(key) || cache.get(key + "_chunk_0");
      return single ? JSON.parse(single) : null;
    }

    const keys = [];
    for (let i = 0; i < count; i++) {
      keys.push(key + "_chunk_" + i);
    }
    const chunks = cache.getAll(keys);
    let combined = "";
    for (let i = 0; i < count; i++) {
      const part = chunks[key + "_chunk_" + i];
      if (part === undefined || part === null) return null;
      combined += part;
    }
    return JSON.parse(combined);
  } catch (err) {
    Logger.log("Peringatan getChunkedCache(" + key + "): " + err.message);
    return null;
  }
}

/**
 * Menghapus cache dari CacheService (termasuk seluruh pecahan chunk)
 */
function removeChunkedCache(key) {
  try {
    const cache = CacheService.getScriptCache();
    const countStr = cache.get(key + "_chunk_count");
    const keysToRemove = [key, key + "_chunk_count"];
    if (countStr) {
      const count = parseInt(countStr, 10) || 1;
      for (let i = 0; i < count; i++) {
        keysToRemove.push(key + "_chunk_" + i);
      }
    }
    cache.removeAll(keysToRemove);
  } catch (err) {
    Logger.log("Peringatan removeChunkedCache(" + key + "): " + err.message);
  }
}

/**
 * Mengambil registry versi dataset dari CacheService
 */
function getStoredDatasetVersions_() {
  try {
    const cache = CacheService.getScriptCache();
    const raw = cache.get(SERVER_CACHE_KEYS.VERSIONS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Memperbarui registry versi dan metadata dataset di CacheService
 */
function updateDatasetVersionMeta_(datasetName, version, sizeBytes, count) {
  try {
    const cache = CacheService.getScriptCache();
    const registry = getStoredDatasetVersions_();
    registry[datasetName] = {
      version: version,
      sizeBytes: sizeBytes || 0,
      count: count || 0,
      updatedAt: Date.now()
    };
    cache.put(SERVER_CACHE_KEYS.VERSIONS, JSON.stringify(registry), SERVER_CACHE_DEFAULT_TTL);
  } catch (e) {
    Logger.log("Peringatan updateDatasetVersionMeta_: " + e.message);
  }
}

/**
 * Menghapus cache dataset dan membersihkan versinya dari registry
 */
function invalidateDataset_(cacheKey, datasetName) {
  try {
    removeChunkedCache(cacheKey);
    if (datasetName) {
      const cache = CacheService.getScriptCache();
      const registry = getStoredDatasetVersions_();
      if (registry && registry[datasetName]) {
        delete registry[datasetName];
        cache.put(SERVER_CACHE_KEYS.VERSIONS, JSON.stringify(registry), SERVER_CACHE_DEFAULT_TTL);
      }
    }
  } catch (e) {
    Logger.log("Peringatan invalidateDataset_: " + e.message);
  }
}

/**
 * Membersihkan seluruh cache server aplikasi sekaligus
 */
function clearAllServerCaches() {
  try {
    const keys = [
      SERVER_CACHE_KEYS.BOOKINGS,
      SERVER_CACHE_KEYS.KUNJUNGAN,
      SERVER_CACHE_KEYS.USERS,
      SERVER_CACHE_KEYS.SETTINGS,
      SERVER_CACHE_KEYS.GALERI,
      SERVER_CACHE_KEYS.SARAN,
      SERVER_CACHE_KEYS.JUMAT_BERKAH,
      SERVER_CACHE_KEYS.VERSIONS,
      SERVER_CACHE_KEYS.HISTORY
    ];
    for (let i = 0; i < keys.length; i++) {
      removeChunkedCache(keys[i]);
    }
    return true;
  } catch (err) {
    Logger.log("Peringatan clearAllServerCaches: " + err.message);
    return false;
  }
}

const BACKUP_FOLDER_ID = "1KkUribvlZ0yvVP2CLIXVkXujJBh4TGTO";

const SARAN_SHEET_NAME = "SARAN";
const SARAN_HEADERS = [
  "ID",
  "TANGGAL",
  "JAM",
  "NAMA",
  "NOMOR HP",
  "EMAIL",
  "SARAN"
];

const ALAMAT_SHEET_NAME = "ALAMAT";
const ALAMAT_CACHE_TTL = 21600; // 6 Jam (Batas Maksimal Google Apps Script CacheService)
const ALAMAT_HEADERS = [
  "PROVINSI",
  "KABUPATEN",
  "KECAMATAN",
  "KELURAHAN"
];

const REFERENSI_SHEET_NAME = "REFERENSI";
const REFERENSI_HEADERS = [
  "JAM KHITAN",
  "METODE KHITAN",
  "UKURAN CELANA",
  "OBAT",
  "PEKERJAAN",
  "HUBUNGAN KELUARGA",
  "HAK AKSES"
];

const KUNJUNGAN_SHEET_NAME = "KUNJUNGAN";
const KUNJUNGAN_HEADERS = [
  "REGISTER",
  "ID BOOKING",
  "NAMA ANANDA",
  "TEMPAT LAHIR",
  "TANGGAL LAHIR",
  "BERAT BADAN",
  "TANGGAL KHITAN",
  "JAM KHITAN",
  "METODE KHITAN",
  "UKURAN CELANA",
  "OBAT",
  "NAMA PENANGGUNG JAWAB",
  "USIA PENANGGUNG JAWAB",
  "PEKERJAAN",
  "HUBUNGAN KELUARGA",
  "NOMOR HP",
  "ALAMAT",
  "PROVINSI",
  "KABUPATEN",
  "KECAMATAN",
  "KELURAHAN",
  "UKURAN KLAMP",
  "STATUS BAYAR",
  "JUMLAH BAYAR",
  "ZAKAT",
  "OPERATOR",
  "BMHP OBAT",
  "LEM",
  "FEE",
  "TOTAL",
  "STATUS WA",
  "KETERANGAN"
];

const JUMAT_BERKAH_SHEET_NAME = "JUMAT BERKAH";
const JUMAT_BERKAH_HEADERS = [
  "REGISTER",
  "NAMA ANANDA",
  "TEMPAT LAHIR",
  "TANGGAL LAHIR",
  "TANGGAL KHITAN",
  "NAMA PENANGGUNG JAWAB",
  "TEMPAT LAHIR PENANGGUNG JAWAB",
  "TANGGAL LAHIR PENANGGUNG JAWAB",
  "USIA PENANGGUNG JAWAB",
  "PEKERJAAN",
  "HUBUNGAN KELUARGA",
  "NOMOR IDENTITAS",
  "ALAMAT",
  "PROVINSI",
  "KABUPATEN",
  "KECAMATAN",
  "KELURAHAN"
];

// Konfigurasi Audit Trail & History Cache (Sheet HISTORY)
const HISTORY_SHEET_NAME = "HISTORY";
const HISTORY_HEADERS = [
  "TIMESTAMP",
  "WAKTU",
  "USER",
  "AKSI",
  "DATASET",
  "ID_RECORD",
  "RINGKASAN",
  "SUMBER"
];
const HISTORY_MAX_ROWS = 5000;
const HISTORY_PRUNE_BATCH = 500;

/**
 * Mendapatkan atau menginisialisasi sheet HISTORY untuk audit trail dan history cache
 */
function getHistorySheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(HISTORY_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(HISTORY_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HISTORY_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HISTORY_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080"); // Brand Tosca
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    for (let col = 1; col <= HISTORY_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Mencatat riwayat perubahan data (audit trail) ke sheet HISTORY
 * Bersifat non-blocking dan diisolasi dengan try-catch agar tidak mengganggu transaksi utama
 */
function logHistory_(entries) {
  try {
    if (!entries) return;
    const list = Array.isArray(entries) ? entries : [entries];
    if (list.length === 0) return;

    const sheet = getHistorySheet_();
    const now = new Date();
    const nowTs = now.getTime();
    const formattedWaktu = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss") + " WIB";

    const rows = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item) continue;
      rows.push([
        item.timestamp || nowTs,
        item.waktu || formattedWaktu,
        String(item.user || "System").trim(),
        String(item.aksi || "UBAH").trim().toUpperCase(),
        String(item.dataset || "-").trim().toUpperCase(),
        String(item.idRecord || "-").trim(),
        sanitizeSpreadsheetFormula(String(item.ringkasan || "").trim()),
        String(item.sumber || "admin-panel").trim()
      ]);
    }

    if (rows.length > 0) {
      const nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 1, rows.length, HISTORY_HEADERS.length).setValues(rows);

      // Invalidate history cache
      invalidateDataset_(SERVER_CACHE_KEYS.HISTORY, "history");

      // Pruning guard: jika baris melebihi batas HISTORY_MAX_ROWS, hapus 500 baris tertua
      const totalRows = nextRow + rows.length - 1;
      if (totalRows > HISTORY_MAX_ROWS + 1) { // +1 karena header baris 1
        try {
          const deleteCount = Math.min(HISTORY_PRUNE_BATCH, totalRows - 2);
          if (deleteCount > 0) {
            sheet.deleteRows(2, deleteCount);
          }
        } catch (pruneErr) {
          Logger.log("Peringatan pruning HISTORY: " + pruneErr.message);
        }
      }
    }
  } catch (err) {
    Logger.log("Peringatan logHistory_: " + err.message);
  }
}

/**
 * Membaca riwayat perubahan dari sheet HISTORY dengan pagination, pencarian, dan filter dataset
 */
function readHistoryFromSheet_(options) {
  options = options || {};
  const limit = Math.min(Math.max(parseInt(options.limit || 50, 10), 1), 200);
  const offset = Math.max(parseInt(options.offset || 0, 10), 0);
  const filterDataset = String(options.dataset || "").trim().toUpperCase();
  const filterAksi = String(options.aksi || "").trim().toUpperCase();
  const searchQuery = String(options.q || "").trim().toLowerCase();

  const sheet = getHistorySheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { total: 0, items: [], hasMore: false };
  }

  // Baca seluruh baris riwayat
  const values = sheet.getRange(2, 1, lastRow - 1, HISTORY_HEADERS.length).getValues();
  const allItems = [];

  for (let i = values.length - 1; i >= 0; i--) { // Reverse: data terbaru di atas
    const row = values[i];
    let ts = row[0];
    if (ts instanceof Date) ts = ts.getTime();
    else ts = Number(ts) || 0;

    let waktuStr = row[1];
    if (waktuStr instanceof Date) {
      waktuStr = Utilities.formatDate(waktuStr, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss") + " WIB";
    } else {
      waktuStr = String(waktuStr || "");
    }

    const user = String(row[2] || "").trim();
    const aksi = String(row[3] || "").trim().toUpperCase();
    const dataset = String(row[4] || "").trim().toUpperCase();
    const idRecord = String(row[5] || "").trim();
    const ringkasan = String(row[6] || "").trim();
    const sumber = String(row[7] || "").trim();

    if (filterDataset && filterDataset !== "SEMUA" && dataset !== filterDataset) {
      continue;
    }
    if (filterAksi && filterAksi !== "SEMUA" && aksi !== filterAksi) {
      continue;
    }
    if (searchQuery) {
      const matchQuery = user.toLowerCase().includes(searchQuery) ||
                         idRecord.toLowerCase().includes(searchQuery) ||
                         ringkasan.toLowerCase().includes(searchQuery) ||
                         dataset.toLowerCase().includes(searchQuery);
      if (!matchQuery) continue;
    }

    allItems.push({
      timestamp: ts,
      waktu: waktuStr,
      user: user,
      aksi: aksi,
      dataset: dataset,
      idRecord: idRecord,
      ringkasan: ringkasan,
      sumber: sumber
    });
  }

  const total = allItems.length;
  const paged = allItems.slice(offset, offset + limit);
  const hasMore = (offset + limit) < total;

  return {
    total: total,
    offset: offset,
    limit: limit,
    hasMore: hasMore,
    items: paged
  };
}

/**
 * Membersihkan seluruh baris pada sheet HISTORY (hanya menyisakan baris header)
 */
function clearHistorySheet_() {
  const sheet = getHistorySheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  invalidateDataset_(SERVER_CACHE_KEYS.HISTORY, "history");
  return true;
}

// ID Template Google Docs SURAT PERNYATAAN TIDAK MEROKOK untuk Export Word Jumat Berkah
const TEMPLATE_SURAT_MEROKOK_ID = "17VXeKN8ygM_PBW8JSggbPPHDIdVWrgb08nofV1JZV8g";
const TEMPLATE_SURAT_MEROKOK_BASE64 = "UEsDBBQACAgIAHAFT10AAAAAAAAAAAAAAAASAAAAd29yZC9udW1iZXJpbmcueG1srZfbjtowEIafoO+AIvUSciCELNqwF11t1aqqVtrtAxjHEAsfItvh8PadJCScqiomucF4xvPNbzP2iOeXA2ejHVGaSpE4/sRzRkRgmVKxSZw/n2/j2Blpg0SKmBQkcY5EOy/LL8/7hSj4iihYNwKE0AuOEyczJl+4rsYZ4UhPZE4EONdScWRgqjYuR2pb5GMseY4MXVFGzdENPC9yThiZOIUSixNizClWUsu1KUMWcr2mmJyGJkJ1yVuHvEpccCJMldFVhIEGKXRGc93Q+KM0cGYNZPe/Tew4a9bt8y7ZUoX2cM6c1Yn2UqW5kphoDdbX2tkSfa/DAZaINqKLhOucjRKOqGgxZXXcgNrcE8h9OrQKdd7I+Sw06yKkdv2iK4XU8V4FeuA8L+Nz2qmKbwgQZQrVFuQjCJwhZRoAe4TAJN6S9BsSO9QWc7rpVM43pJSijUL8XKTa6pf1vZty+chQTs60TT/adyWL/Fzu4SO0ixvoz+wAwR0gsgPE9wBMDo8xXIi85NDUjhO1HNq8B90ABumtLglPbnp6BStTewXuH+V/cuBrGVuiAg8eZISrB9lZQoNBK20UGH4XfHQ1+wG79KslbMfARWFIHK+yQK9SBmw7xMpF7rLuVG+8NaYEU45Y7YLIT3JofV/9SWv/iRsrI2tTm/N3VQ5UpOArzYkzD6Bl7hcZEpuqZ04jr1zrtovVu6rnwLzV7A+hObDW7IdhD9HBEKKn1qIDP+ohejqE6NBedBz3EB0OIXpmLRo09hA9G0J0ZC06nPa5iNEQoufWomden4s4H0J0bC963ucixkOIfrIWHYV2F9G96jgneaPq89x+rnrS1W7camUz1v+Tln8BUEsHCHftUlaCAgAAbQ0AAFBLAwQUAAgICABwBU9dAAAAAAAAAAAAAAAAEQAAAHdvcmQvc2V0dGluZ3MueG1spZZLktowEIZPkDtQ2oMfA2RCjZlFpiZZZFaQA8iSbKvQqyQZD7ePZFs2j1TKkBXS391fy0275ZfXT85mR6INlSIDySIGMyKQxFSUGfi9f58/g5mxUGDIpCAZOBEDXrdfXpqNIdY6LzNzBGE2HGWgslZtosiginBoFlIR4YyF1Bxat9VlxKE+1GqOJFfQ0pwyak9RGsdr0GNkBmotNj1izinS0sjC+pCNLAqKSP8TIvSUvF3Im0Q1J8K2GSNNmDuDFKaiygQaf5TmjFWAHP/1EEfOgl+jpmTDGjau0Jx1iRqpsdISEWOc+tYZB2ISTyigRwwRU45wmTOchEMqBoxvjivQkHvhcvdFa1Hjg4y1MGzKQTrTL5prqE+3p4AP1PM8XtFJXXxFcFG21kNDPoJAFdQ2ANgjBCbRgeDvUBzh0My4nNTOVyRMYakhH5vU3PXPJvFVu+wqqMhIK/+P9kPLWo3tvnyEdvYGJqv7AOkNYH0f4PkWgMjnY4zIRZ5zKL6Psx44NMyDaQALzcF4wrcI91OwlYZX4HYo/5Xjlj7Wo9LYDWSI2oEMtu5+ITwneK9rsj8p8i6d16zZHKEbEwmIvAMmBayZ3cN8Z6UKxq9p3Jm7O2Zc7br7aoCsgFsKyN3curiOPiQm3lRrOr2aPmV0kZPpnQ8iH1CpLm1eJhlgtKxs4vnW7bC7DttNXqa9LW1taWdrNxAhVyPn3S9GLQ3amd9T0J5GbRm05aitgrYatXXQ1l6rXN01o+LgyhCWXi8kY7Ih+Odov5H6eoRvhO0fUEsHCLVCXjdPAgAAaAgAAFBLAwQUAAgICABwBU9dAAAAAAAAAAAAAAAAEgAAAHdvcmQvZm9udFRhYmxlLnhtbKWVz47bIBDGn6DvYHFPcKI22lrr7GFX7aXqod0+wCxgGwUYBDjevH1x4j9pXFWOe7LN+PvNAB/D49O7VslROC/R5GSzTkkiDEMuTZmTX69fVg8k8QEMB4VG5OQkPHnaf3hssgJN8EmUG59plpMqBJtR6lklNPg1WmFisECnIcRPV1IN7lDbFUNtIcg3qWQ40W2a7kiHwZzUzmQdYqUlc+ixCK0kw6KQTHSPXuHm5L1IXpDVWphwzkidULEGNL6S1vc0vZQWg1UPOf5rEket+v8aOycbd9DEvdDqkqhBx61DJryPoy+X4EDcpDMWsEUMijkl/Jmzr0SDNAOmdcYNaMi9jrm7RTujxomMa+HVnEIuoW/yzYE7TauABet5rbdylotvCFEVajcYcgmCVeBCD1BLCArZQfBnMEcYzMzLWXa+IXEJpQM9mtTftbOb9MYuPyuwYqSV/0f76rC2o90/LqFdncDNp/sA2wlgdx/gYQpg4n0Zg0blNUfy+zi7gSP7fjAPEMAffEv4THnXBc9DwxGYNuW/cuJrq21R2zQ2ZGDnhkz23eWSNJkBHTvLM6h45iWhk8ir1MIn30WT/EANpv2DdjfT/jdQSwcI5l9H3MYBAADbBgAAUEsDBBQACAgIAHAFT10AAAAAAAAAAAAAAAAPAAAAd29yZC9zdHlsZXMueG1s3Vbtcto6EH2CvgPj/8HGAZcwJZ2WTD9m2t47Te4DLLbAmsiSRpIh9Om78hfGxqmBdHrvTX5grbRnV0dHq33z9ilhgw1Rmgo+d0ZDzxkQHoqI8vXc+efhw9XUGWgDPAImOJk7O6Kdt7ev3mxn2uwY0QP053qWhHMnNkbOXFeHMUlAD4UkHCdXQiVgcKjWbgLqMZVXoUgkGLqkjJqd63te4BQwYu6kis8KiKuEhkposTLWZSZWKxqS4qf0UH3i5i53IkwTwk0W0VWEYQ6C65hKXaIl56LhZFyCbJ7bxCZh5bqt7BMtUrDFw0hYHmgrVCSVCInWaL3LJyvEkdeDQAtRefRJ4TBmmUkClFcwVhoNoCr2EGMXpGVQ+43sudCsTyL51Be6VKB27SzgDD7r/pL2UnEDAb1MqipBngMRxqBMCcDOQWAifCTRAvgGKjFH615ybiBFFNYKkr1I9UknO/IacrmPQZI92voytI9KpHIv9/E5aLUbOJqcBuC3AILTAKZtgJA8nYfhomcdh0an4QQVDi3rQT8AA/pRW4QbNyqqYGaqrkC7KB/FwU/ra6F8DwsyhFlBdm7xdUHgO7KClBlth+pvVQyLUfbzQaD3YDsDHVI6dxbAsDRQBy2hPhgS0OadpnBgjN9xXfNyLaT+gRMbwGrkj0vLQjdtDPi6tCF3aHOLpNxmqrI5yjAlhDSDgJUhyNYo8GxGjNo66r+eDr36X1DOfU8ZzkNqRBFTFjHrUdwWedlLjRBmJ9HdwJIRi5iZP6NoHqzlmy0JzNqj3BWzyk6CQ0LKzdZXZkyYJcu3hB8LwthXyEdCogs+LiPPG2Zby2NHT1AwSFbm+RVLYYxInl+j6Dp+FsY9TMytEnaL7bfpkaBsAZTxAUW92OEVMafCfyJgO642ZJxPDEYFKaBJ9BcvZ+snwcmTOWYvJPdIiPxWW1IAWvMXVJZu2FsKnWbkLgm+HLiL671ej2uyuqOhYEJV92c1Gd8EzZs29to3LbfVbtU5dPqddPr/LjpHL0nntd+mM7ddSOd1J53X/2M6/emRd2D6AnSOO+kc/2k6xwd0TvuySRu4dNGM1MH3hUxOOpmc/EeZ/D08BZ08BX+apwOaxr9JcJMb+38JkQ/UYO/U6ooy64UMdtS0oiXsTcm+cE2CduGaXCSj+3RpjhJQTVzAgdsl//2pvVRZ7uiA8+6rkX2r4+06rtNOq94339ssvovte+DRPf1BGhIuVywE615xrPf+dec9/WXn3aPvPgbSo+8uv/TtT1BLBwivfgq/uAMAAIQUAABQSwMEFAAICAgAcAVPXQAAAAAAAAAAAAAAABEAAAB3b3JkL2RvY3VtZW50LnhtbO1d63LiOBZ+gn0HFT+mZqtIMCSQkJ30lBPSCZuEpoDs1PxKHWyB1diyS5ZDs0+/R75xCZ0m2VDclKpgrMuRLH3fOUfWhT/+/OG55IWKkPn8slA+NgqEcsu3GR9eFp56X4/OCySUwG1wfU4vCxMaFv788o8/xhe2b0Ue5ZKgBB5eeNZlwZEyuCiVQsuhHoTHfkA5Rg584YHEWzEseSBGUXBk+V4AkvWZy+SkVDGMWiEV418WIsEvUhFHHrOEH/oDqbJc+IMBs2h6yXKIVcpNsjTSKscllgR1sQ4+Dx0WhJk076PSMNLJhLy89RAvnpulGwerlGYLGGN3eG5S0NgXdiB8i4YhhjaSyFxi2VihAZWIPMcqVZgvM6uJB4znYhQ4FgTlZR9j2WmjxaKmDzJti9BdpSJJ1APrCxCT17WAD7TnbP6ArYTiBQmYS0YiB+RHRFgOCJkJcD8iwfWtEbWvgb9ADmZ7uBKcFyTZDIYCvClIw3f1bNlYgEvXgYBOpQ3/P2m3wo+CKdxPPyJthoHl6vsEVF4JqL1PwPlrARb98TEZJcw5K4fZ75NTy+WwTB+sJkBCOAqVhHopMwNxUE6B10p5qRz8qvIqURUDFTJYsUIufEH70vftiboGZHyB5snuXBaM9K+QBjWo+zqw/Tqo06ADiFy5JKYt5gLLpxcBCGjaeWg5rkzQFuoSBmAhBjEzDCTFrJXzWJTLlPqrnOY3ncjFAIikXyipjIzbqkQ2dLASRzXj7PisXq2cVat1o1otl5NE3y1M8wL4TBY2ChVJqEiKFl99bChVcmgxdlnoMY+GpEXHpON7wFXBVrg0mEIozZDB0kjH5OESaXHJUVYdxTuXqsBSWp9S3iTirb5Y0mfzLb7ZB+xnD5h2QP86XAhZ0gRYU+lmwcZso4wvYmcoRgn2fiBoSMULLXzpPnXMHmnfdFp/mz3TbJFes2Hek8ebzrf7b/ekRLpNs02ubjp3N61eMwtXcmUi/XMb+ifVTwpSPbsFtKu8Sbu1kK7vowe3UcrtF7veTZO/Afu4T0U83CD4OQRObEb6MAaHMM4u5iiRIVX23fSSSu+7XTlxaVZ4D/ouTXsb4/7CcHR660aldhy3m5wEWA37BywCwqUDmWd7gIkfyTz5gP2g9jTS90f5s54a2ePOVulWMFt9HeL12neTSlTq9XoiZD74/GRJaPXs9DQvUYm7drCJ1GMqu5/09qcWVJqRV1oodT4WvybPmXawBVx2AxzczQEgznBHwaZiERhZRmkln21R2gIldDKrhBJtojBxWTitVI/L9dp51Tipn5wZxnmt8KamwcgBE6F8iFWWoTXPlmmeFniwRLeUpoDcJliealgeBiyX2bstxWR1rZjU+NsI/n5z5b/Uf8t8NJ/bNy2zdXv71Lp9/rf5l3n12xAj8f/nGC1N3YI9dA5qWgsfBgt6VE1WFEkP/d4huOQBHCZ2RzOfaZweBk53yFs4197C/uEv8xZ6N49ts/f8YN41Oz/1GookT67izYdfpD9UL6OutfdhsOcJS9kdBW5qWB4GLHfIqbjSTsX+4S/zEp66Tf0KYhHx11oLHwYLWv4xadqUSyYhJL/f99qlbvPxn7ujmxsaqYeB1B3yF260v7B/+MunLL49NxtqNVXP7B66m/BVK9/DAL/pggdyZzRw2dDAPAxg7o5XUC5rr2D/8Jd5BeaD+Wj23vAHNg6/iobf/sHvnrqRAAd4Pul1f/Pw1DHvzNZ0PuyeWsp6zyW6VnCdJtpGwK53jawG7GYAC/0oAElnsGhePbXN3k2ORXKUx7U73/7TbHWb2wzT9a6Z3UeYrrBLaO2jZ3VVWxO6AarFNPVJljqN3zCw9MLXPdR/pg0uOLmCu3u6emrdmq1nZbbNzq2ZK0EbBCNvjG72+sVSeb3LuPT4fWv4oPbHEJOrfXm7M5LXS6cOBJ079HZpveumNP42O+ektsmYLbPVMA98yqm83rVYWvduDfZ3e3NMWa+gOhCc7pCPsN61Uhp/G/URZjfH/GIvzKH7EOtdn6V189ZwI/Md7h0mge+Ootbrqg4EoLvjPFTWu6RK42+zzkPqHtzfNd9eFTDvH5TG2RlpGwbnSmdp9unAF3RtR2tqZbphMDdofK4f44x4lE9Awkgd85eEhrRPOYij+BMjSR+cMSw/92/DYJ5bqcUjL1W57st8e8RxTTsLK6dtlGdYfrblx0iQaPqzivFL1a7O8IuPeD+paXdj2xjSBQT+HOR3uwH6c+Bfdszuu5tIMhtGqD+EP/JHe9RU726IIkEFGhEIoM9cICGATFQrhMzJGqiI4RpSv2jJPhUhtRkQG+0Q3ox8j0m0UCTiMhqpEEdtwNSgK3xBa+0xMsJbJ16wajPB0HTz+KqaD03UcBSlFn2Eo3pxTLbRhp+s04Zro31InIiNtkc9cMBjiduaqQqkRIBqGXUJ8/qRG7u74AVowDgdgmQDTD6c5VOozsBWwlAMilUZfKEOx3aBcQx3wY0YCUChmRMIISBxQdtJslNNMk2yTyRZbqgV22TkIBOowC+KCyMYIx24Ojw+gIQUZJIeK+/CKFLHyc8YJxEhX4tExpPYSEDxHYpkgK6TGx+0kDOyqMyY76q0HkRBxLMskRd5MStxrLqd7Ktq9mn2fSL7sKRAmbIhG0XoDQP/rohXJNSORkicYuz/BcJXPyGFxOTK0rGYbBkPZfQ9Ap6YN3StVeIQa7foYOdjGpshv12UzreTYbU1MUy/+zlAjpk56NH6eBGaOU4ctckgTPxLN54rFcrkxe9Okzep6QB/xjJyKpgHZORztFwRxRqiCQsjUGIl0iyaIaQyjNtJrTM9YaAp0aAeGykehGhp5ALyU+BHGPGzKQS1l8dD2IOt8oR4EcXUQcQxWAjxcAwZFjBHvVMEDujgFdPXPsnQLTZBw4jHQzEsAIbAVEIkWiiZ8v22kT3nb7LnE8miibEZfyxCB2r4evXYL6eHN47MukbmXiMz/iW3R3TwlV5u5wq7uI1YNDUWP47FHfgpycqV7uD97uBr3cEf7+AdsCaPgB2JI9dOUDaOsf7baEUaGoP7rWRudAfvdwd/1R388Q7eASvyO9ELoFZaZb76rz3udhO+f9kTWXbi/qYV18nclo+fvLcubVCvh9SSSfpg2P2v6hTEaO385FzJH+P3ct2IN6P4glGOTRD4QqK/l/72ejB8BFVjfB7pe5j8NNG/0g+mN8nsV3aXKuDs1ok3PV4Wzoy4yIHvy+w2LaEVeb1JoH5KPZQg5HR2Lqt7SZVvT+Ivtm9FHlb0y/8AUEsHCPZfiYChCQAAPYsAAFBLAwQUAAgICABwBU9dAAAAAAAAAAAAAAAAHAAAAHdvcmQvX3JlbHMvZG9jdW1lbnQueG1sLnJlbHOtkk1qwzAQhU/QO4jZ17LTH0qJnE0IZFvcAyjy+IdaIyFNSn37ipQkDgTThZfviXnzzYzWmx87iG8MsXekoMhyEEjG1T21Cj6r3eMbiMiaaj04QgUjRtiUD+sPHDSnmtj1PooUQlFBx+zfpYymQ6tj5jxSemlcsJqTDK302nzpFuUqz19lmGZAeZMp9rWCsK8LENXo8T/Zrml6g1tnjhaJ77SQnGoxBerQIis4yT+zyFIYyPsMqyUZIjKn5cYrxtmZQ3haEqFxxJU+DJNVXKw5iOclIehoDxjS3FeIizUH8bLoMXgccHqKkz63lzefvPwFUEsHCJAAq+vxAAAALAMAAFBLAwQUAAgICABwBU9dAAAAAAAAAAAAAAAACwAAAF9yZWxzLy5yZWxzjc87DsIwDAbgE3CHyDtNy4AQatIFIXVF5QBR4qYRzUNJePT2ZGAAxMBo+/dnue0ediY3jMl4x6CpaiDopFfGaQbn4bjeAUlZOCVm75DBggk6vmpPOItcdtJkQiIFcYnBlHPYU5rkhFakygd0ZTL6aEUuZdQ0CHkRGummrrc0vhvAP0zSKwaxVw2QYQn4j+3H0Ug8eHm16PKPE1+JIouoMTO4+6ioerWrwgLlLf14kT8BUEsHCC1ozyKxAAAAKgEAAFBLAwQUAAgICABwBU9dAAAAAAAAAAAAAAAAFQAAAHdvcmQvdGhlbWUvdGhlbWUxLnhtbO1ZS2/bNhy/D9h3IHRvZdlW6gR1itix261NGyRuhx5piZbYUKJA0kl8G9rjgAHDumGHFdhth2FbgRbYpfs02TpsHdCvsL8elimbzqNNtw6tDzZJ/f7vB0n58pXDiKF9IiTlcdtyLtYsRGKP+zQO2tbtQf9Cy0JS4djHjMekbU2ItK6sf/jBZbymQhIRBPSxXMNtK1QqWbNt6cEylhd5QmJ4NuIiwgqmIrB9gQ+Ab8Tseq22YkeYxhaKcQRsb41G1CNokLK01qfMewy+YiXTBY+JXS+TqFNkWH/PSX/kRHaZQPuYtS2Q4/ODATlUFmJYKnjQtmrZx7LXL9slEVNLaDW6fvYp6AoCf6+e0YlgWBI6/ebqpc2Sfz3nv4jr9XrdnlPyywDY88BSZwHb7LeczpSnBsqHi7y7NbfWrOI1/o0F/Gqn03FXK/jGDN9cwLdqK82NegXfnOHdRf07G93uSgXvzvArC/j+pdWVZhWfgUJG470FdBrPMjIlZMTZNSO8BfDWNAFmKFvLrpw+VstyLcL3uOgDIAsuVjRGapKQEfYA18WMDgVNBeA1grUn+ZInF5ZSWUh6giaqbX2cYKiIGeTlsx9fPnuCju4/Pbr/y9GDB0f3fzZQXcNxoFO9+P6Lvx99iv568t2Lh1+Z8VLH//7TZ7/9+qUZqHTg868f//H08fNvPv/zh4cG+IbAQx0+oBGR6CY5QDs8AsMMAshQnI1iEGKqU2zEgcQxTmkM6J4KK+ibE8ywAdchVQ/eEdACTMCr43sVhXdDMVbUALweRhXgFuesw4XRpuupLN0L4zgwCxdjHbeD8b5Jdncuvr1xArlMTSy7Iamouc0g5DggMVEofcb3CDGQ3aW04tct6gku+UihuxR1MDW6ZECHykx0jUYQl4lJQYh3xTdbd1CHMxP7TbJfRUJVYGZiSVjFjVfxWOHIqDGOmI68gVVoUnJ3IryKw6WCSAeEcdTziZQmmltiUlH3OrQOc9i32CSqIoWieybkDcy5jtzke90QR4lRZxqHOvYjuQcpitE2V0YleLVC0jnEAcdLw32HEnW22r5Ng9CcIOmTsTCVBOHVepywESZx0eErvTqi8XGNO4K+jc+7cUOrfP7to/9Ry94AJ5hqZr5RL8PNt+cuFz59+7vzJh7H2wQK4n1zft+c38XmvKyez78lz7qwrR+0MzbR0lP3iDK2qyaM3JBZ/5Zgnt+HxWySEZWH/CSEYSGuggsEzsZIcPUJVeFuiBMQ42QSAlmwDiRKuISrhbWUd3Y/pWBztuZOL5WAxmqL+/lyQ79slmyyWSB1QY2UwWmFNS69njAnB55SmuOapbnHSrM1b0LdIJy+SnBW6rloSBTMiJ/6PWcwDcsbDJFT02IUYp8YljX7nMYb8aZ7JiXOx8m1BSfbi9XE4uoMHbStVbfuWsjDSdsawWkJhlEC/GTaaTAL4rblqdzAk2txzuJVc1Y5NXeZwRURiZBqE8swp8oeTV+lxDP9624z9cP5GGBoJqfTotFy/kMt7PnQktGIeGrJymxaPONjRcRu6B+gIRuLHQx6N/Ps8qmETl+fTgTkdrNIvGrhFrUx/8qmqBnMkhAX2d7SYp/Ds3GpQzbT1LOX6P6KpjTO0RT33TUlzVw4nzb87NIEu7jAKM3RtsWFCjl0oSSkXl/Avp/JAr0QlEWqEmLpC+hUV7I/61s5j7zJBaHaoQESFDqdCgUh26qw8wRmTl3fHqeMij5TqiuT/HdI9gkbpNW7ktpvoXDaTQpHZLj5oNmm6hoG/bf44NJ8pY1nJqh5ls2vqTV9bStYfT0VTrMBa+LqZovr7tKdZ36rTeCWgdIvaNxUeGx2PB3wHYg+Kvd5BIl4oVWUX7k4BJ1bmnEpq3/rFNRaEu/zPDtqzm4scfbx4l7d2a7B1+7xrrYXS9TW7iHZbOGPKD68B7I34XozZvmKTGCWD7ZFZvCQ+5NiyGTeEnJHTFs6i3fICFH/cBrWOY8W//SUm/lOLiC1vSRsnExY4GebSElcP5m4pJje8Uri7BZnYsBmknN8HuWyRZaeYvHruOwUyptdZsze07rsFIF6BZepw+NdVnjKNiUeOVQCd6d/XUH+2rOUXf8HUEsHCCFaooQsBgAA2x0AAFBLAwQUAAgICABwBU9dAAAAAAAAAAAAAAAAEwAAAFtDb250ZW50X1R5cGVzXS54bWy1lE1OwzAQhU/AHSJvUeOWBUKoaRdAl8CiHMC1J62F/+SZlPb2TNI2ElWREJBNZOfNvPeNLXk633lXbCGjjaESk3IsCgg6GhvWlXhbLkZ3okBSwSgXA1RiDyjms6vpcp8AC24OWIkNUbqXEvUGvMIyJgis1DF7RbzNa5mUfldrkDfj8a3UMRAEGlHrIWbTR6hV46h4OPxvrSuhUnJWK2IuyWaieNqxeMBs9/IHfdtgzmBGsa6tBhN147mljKu6Qa4Gs2CTLyHRENW/jTnOW2ZwXQ1ubMLr8zlYxTbhhS8gWwN/meQjZpNy1IDId+ddiUDEq2Pqq8r0rDzbyrZSntTyeJbDINDewXcAnTZofM1eS7VycJmglweFCI1fQeb1ZYheHhSiV7yy4TJIX/KPHMTvwTeH30mH7+QUKbtHZfYJUEsHCGs0tN8/AQAAlAQAAFBLAQIUABQACAgIAHAFT1137VJWggIAAG0NAAASAAAAAAAAAAAAAAAAAAAAAAB3b3JkL251bWJlcmluZy54bWxQSwECFAAUAAgICABwBU9dtUJeN08CAABoCAAAEQAAAAAAAAAAAAAAAADCAgAAd29yZC9zZXR0aW5ncy54bWxQSwECFAAUAAgICABwBU9d5l9H3MYBAADbBgAAEgAAAAAAAAAAAAAAAABQBQAAd29yZC9mb250VGFibGUueG1sUEsBAhQAFAAICAgAcAVPXa9+Cr+4AwAAhBQAAA8AAAAAAAAAAAAAAAAAVgcAAHdvcmQvc3R5bGVzLnhtbFBLAQIUABQACAgIAHAFT132X4mAoQkAAD2LAAARAAAAAAAAAAAAAAAAAEsLAAB3b3JkL2RvY3VtZW50LnhtbFBLAQIUABQACAgIAHAFT12QAKvr8QAAACwDAAAcAAAAAAAAAAAAAAAAACsVAAB3b3JkL19yZWxzL2RvY3VtZW50LnhtbC5yZWxzUEsBAhQAFAAICAgAcAVPXS1ozyKxAAAAKgEAAAsAAAAAAAAAAAAAAAAAZhYAAF9yZWxzLy5yZWxzUEsBAhQAFAAICAgAcAVPXSFaooQsBgAA2x0AABUAAAAAAAAAAAAAAAAAUBcAAHdvcmQvdGhlbWUvdGhlbWUxLnhtbFBLAQIUABQACAgIAHAFT11rNLTfPwEAAJQEAAATAAAAAAAAAAAAAAAAAL8dAABbQ29udGVudF9UeXBlc10ueG1sUEsFBgAAAAAJAAkAQgIAAD8fAAAAAA==";

const DEFAULT_KUOTA_JAM = 1;
const DEFAULT_RUNNING_TEXT = {
  text: "Selamat Datang di Khitan Damai Subang! Layanan Khitan Modern Ramah Anak dengan Bius Nyaman. Konsultasi & Booking Jadwal Sekarang Juga!",
  font: "Inter",
  fontSize: 12,
  fontColor: "#ccfbf1",
  bgColor: "#134e4a",
  speed: 22,
  visible: true
};

const ALLOWED_RUNNING_TEXT_FONTS = ["Inter", "Poppins", "Montserrat", "Roboto", "Nunito", "Open Sans"];

// Hero Card / Featuring Card Default Text (3 Kelompok: badge/span, title/h2, description/p)
const DEFAULT_HERO_CARD = {
  badgeText: "Layanan Khitan Modern & Nyaman",
  titleText: "Pengalaman Khitan Ceria & Ramah Anak di Subang",
  descriptionText: "Setiap anak hebat, dan setiap momen berharganya layak dirayakan dengan damai. di Khitan Damai, kami percaya khitan bukan momen yang menakutkan, tapi langkah berani pertama si kecil menuju tumbuh dewasa. Dengan metode modern minim nyeri, Praktisi Khitan berpengalaman, dan suasana yang ramah anak, Ananda bisa khitan sambil senyum."
};

const SLIDESHOW_FOLDER_ID = "1mWB837id7QPGcU1ZyYcsX3C1_sxnsA40";
const SLIDESHOW_MAX_IMAGES = 8;
const SLIDESHOW_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const DEFAULT_SLIDESHOW = [
  { fileId: "1D8EGx8zgJm6Iu_VYcO2C6oV9dcVvrYse", src: "https://lh3.googleusercontent.com/d/1D8EGx8zgJm6Iu_VYcO2C6oV9dcVvrYse=w1200", alt: "Booking Praktis - Khitan Damai" },
  { fileId: "18rfxkZz9kZj9ZrUc91Kgc7rNAMnhcbiI", src: "https://lh3.googleusercontent.com/d/18rfxkZz9kZj9ZrUc91Kgc7rNAMnhcbiI=w1200", alt: "Metode Modern - Khitan Damai" },
  { fileId: "1mb0xse5_maXEI2-Rp60sVPJgLNYQ4Ws7", src: "https://lh3.googleusercontent.com/d/1mb0xse5_maXEI2-Rp60sVPJgLNYQ4Ws7=w1200", alt: "Ramah Anak - Khitan Damai" },
  { fileId: "1MiceyM_YQZhtw9INxWBCAYlwCCOI4fIh", src: "https://lh3.googleusercontent.com/d/1MiceyM_YQZhtw9INxWBCAYlwCCOI4fIh=w1200", alt: "Tenaga Profesional - Khitan Damai" }
];

const METODE_MAX_IMAGES = 6;
const DEFAULT_METODE = [
  { fileId: "15wmjGVoSOZ2y5gCkGBD9ufCGinsMMn1Q", src: "https://lh3.googleusercontent.com/d/15wmjGVoSOZ2y5gCkGBD9ufCGinsMMn1Q=w1200", alt: "Thermocauter Lem - Tanpa Jahitan" },
  { fileId: "1G6nFTjpvD3508S9emqHDabgQLf5moFJg", src: "https://lh3.googleusercontent.com/d/1G6nFTjpvD3508S9emqHDabgQLf5moFJg=w1200", alt: "Thermocauter Jahit - Hasil Rapi" },
  { fileId: "1CzykvBgCtCsIPiGfqXcNEDEACxeZA9av", src: "https://lh3.googleusercontent.com/d/1CzykvBgCtCsIPiGfqXcNEDEACxeZA9av=w1200", alt: "Khitan Bayi - Penanganan Khusus" },
  { fileId: "1nJniRbMYAIrplLNCkGq1wMNwmMGO85eB", src: "https://lh3.googleusercontent.com/d/1nJniRbMYAIrplLNCkGq1wMNwmMGO85eB=w1200", alt: "Khitan Gemuk - Metode Khusus Anak Gemuk" },
  { fileId: "1r74dC1_7BOyohiTBzTU2R0lN9oNE9N97", src: "https://lh3.googleusercontent.com/d/1r74dC1_7BOyohiTBzTU2R0lN9oNE9N97=w1200", alt: "Khitan Dewasa - Khitan Aman & Privasi Penuh" },
  { fileId: "1nS8YZpqANxEUaDfpaKO71QBmIUu-q8FR", src: "https://lh3.googleusercontent.com/d/1nS8YZpqANxEUaDfpaKO71QBmIUu-q8FR=w1200", alt: "Khitan Perbaikan - Koreksi Presisi & Estetik" }
];

const DEFAULT_PROGRAM = {
  fileId: "1HuN_4xWNAEn5nULX7ZJtmQIRQI1p71fB",
  src: "https://lh3.googleusercontent.com/d/1HuN_4xWNAEn5nULX7ZJtmQIRQI1p71fB=w1200",
  alt: "Program Jumat Khitan Berkah"
};

const TESTIMONI_MAX_ITEMS = 5;
const TESTIMONI_TEXT_MAX = 200;
const DEFAULT_TESTIMONI = [];

const FAQ_MAX_ITEMS = 20;
const FAQ_QUESTION_MAX = 200;
const FAQ_ANSWER_MAX = 1000;
const DEFAULT_FAQ = [
  {
    id: "faq-1",
    question: "Berapa usia ideal bagi Ananda untuk melakukan khitan?",
    answer: "Khitan dapat dilakukan sejak usia bayi, anak-anak, hingga remaja. Waktu terbaik adalah saat Ananda sudah siap secara mental, atau sedini mungkin (usia bayi beberapa minggu/bulan) jika terdapat indikasi medis seperti fimosis atau infeksi saluran kemih berulang.",
    active: true
  },
  {
    id: "faq-2",
    question: "Apakah proses khitan terasa sakit? Bagaimana metode biusnya?",
    answer: "Rumah Khitan Damai mengutamakan kenyamanan maksimal dengan teknik bius ramah anak (minim nyeri tanpa jarum suntik konvensional). Selama tindakan, anak tetap tenang, santai, dan bisa sambil bermain game atau menonton video favorit.",
    active: true
  },
  {
    id: "faq-3",
    question: "Berapa lama durasi proses tindakan dan masa penyembuhannya?",
    answer: "Proses tindakan berjalan cepat, rata-rata 15 hingga 30 menit. Masa pemulihan luka umumnya berlangsung antara 3 hingga 7 hari tergantung metode khitan yang dipilih dan kedisiplinan perawatan paska tindakan.",
    active: true
  },
  {
    id: "faq-4",
    question: "Apakah setelah khitan Ananda bisa langsung mandi dan beraktivitas?",
    answer: "Ya! Dengan metode modern seperti Klem atau Sealer/Lem, Ananda bisa langsung mandi seperti biasa dan beraktivitas ringan tanpa khawatir perban basah atau luka terkena air.",
    active: true
  },
  {
    id: "faq-5",
    question: "Apakah melayani khitan untuk kondisi khusus (bayi, anak gemuk, fimosis)?",
    answer: "Tentu saja. Tenaga praktisi medis kami sangat berpengalaman menangani kondisi khusus seperti khitan bayi, fimosis, anak gemuk (tanpa perlu terapi hormon terlebih dahulu), hingga anak berkebutuhan khusus dengan pendekatan ramah anak.",
    active: true
  },
  {
    id: "faq-6",
    question: "Bagaimana cara melakukan pendaftaran jadwal khitan secara online?",
    answer: "Cukup klik tombol 'Daftar Sekarang' di menu Beranda atau tab Booking. Pilih tanggal dan jam pelaksanaan yang tersedia, lalu lengkapi data singkat Ananda. Sistem kami langsung menerbitkan ID Booking resmi tanpa perlu antre lama di klinik.",
    active: true
  }
];

/**
 * Memastikan kolom TIMESTAMP dan STATUS tersedia di sheet BOOKING
 * jika sheet awalnya dibuat dengan skema 20 kolom
 */
function ensureBookingColumns_(sheet) {
  if (!sheet || sheet.getLastRow() === 0) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol < HEADERS.length) {
    const maxCols = sheet.getMaxColumns();
    if (maxCols < HEADERS.length) {
      sheet.insertColumnsAfter(maxCols, HEADERS.length - maxCols);
    }
    const missingHeaders = HEADERS.slice(lastCol);
    const range = sheet.getRange(1, lastCol + 1, 1, missingHeaders.length);
    range.setValues([missingHeaders]);
    range.setFontWeight("bold");
    range.setBackground("#008080");
    range.setFontColor("#FFFFFF");
    range.setHorizontalAlignment("center");
  }
}

/**
 * Mendapatkan atau menginisialisasi sheet BOOKING beserta header-nya
 */
function getSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName("BOOKING") || ss.getSheetByName(SHEET_NAME) || ss.getSheetByName("Bookings");
  
  if (!sheet) {
    // Jika sheet belum ada, periksa sheet pertama atau buat baru
    const firstSheet = ss.getSheets()[0];
    if (firstSheet && firstSheet.getLastRow() === 0 && firstSheet.getName() === "Sheet1") {
      sheet = firstSheet;
      sheet.setName(SHEET_NAME);
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }

  // Jika baris masih kosong, buat baris header dengan gaya Khitan Damai (Tosca)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080"); // Brand Tosca
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    // Auto-fit kolom agar rapi
    for (let col = 1; col <= HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  } else {
    // Pastikan kolom TIMESTAMP dan STATUS tersedia jika sheet awalnya 20 kolom
    ensureBookingColumns_(sheet);
  }

  return sheet;
}

/**
 * Mendapatkan atau menginisialisasi sheet USERS untuk autentikasi Admin
 */
function getUsersSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
  }

  // Jika sheet USERS masih kosong, buat baris header dan akun bawaan awal
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(USER_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, USER_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080"); // Brand Tosca
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    // Akun admin default
    sheet.appendRow(["denluckyman@gmail.com", "111111111", "denluckyman@gmail.com", "Super Admin"]);
    sheet.appendRow(["khitandamai01@gmail.com", "111111111", "khitandamai01@gmail.com", "Admin"]);

    for (let col = 1; col <= USER_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Membaca semua pengguna dari sheet USERS dengan deteksi layout:
 * - Layout Baru: Kolom A=NO, B=USERNAME, C=PASSWORD, D=HAK AKSES, E=OTORISASI
 * - Layout Legacy: Kolom A=Username, B=Password, C=Nama, D=Role
 * Dioptimalkan dengan CacheService untuk kecepatan tinggi
 */
function readUsersFromSheet(sheet, forceRefresh) {
  if (!forceRefresh) {
    const cached = getChunkedCache(SERVER_CACHE_KEYS.USERS);
    if (cached && cached.users && Array.isArray(cached.users)) {
      recordCacheTelemetry_("users", "hit");
      return cached;
    }
  }
  recordCacheTelemetry_("users", "miss");

  const targetSheet = sheet || getUsersSheet();
  const lastRow = targetSheet.getLastRow();
  const lastCol = Math.max(targetSheet.getLastColumn(), 5);

  let layout = "legacy";
  if (lastRow >= 1) {
    const firstHeader = String(targetSheet.getRange(1, 1).getValue() || "").trim().toUpperCase();
    if (firstHeader === "NO") {
      layout = "baru";
    }
  }

  const users = [];
  if (lastRow > 1) {
    const values = targetSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (layout === "baru") {
        const username = String(row[1] || "").trim();
        if (!username) continue;
        users.push({
          no: i + 1,
          username: username,
          password: String(row[2] !== null && row[2] !== undefined ? row[2] : ""),
          nama: username,
          role: String(row[3] || "Admin").trim(),
          otorisasi: String(row[4] || "").trim(),
          sheetRow: i + 2
        });
      } else {
        const username = String(row[0] || "").trim();
        if (!username) continue;
        users.push({
          no: i + 1,
          username: username,
          password: String(row[1] !== null && row[1] !== undefined ? row[1] : ""),
          nama: String(row[2] || "").trim() || username,
          role: String(row[3] || "Admin").trim(),
          otorisasi: "",
          sheetRow: i + 2
        });
      }
    }
  }

  const result = { layout: layout, users: users };
  putChunkedCache(SERVER_CACHE_KEYS.USERS, result, SERVER_CACHE_DEFAULT_TTL);
  return result;
}

/**
 * Mendapatkan atau menginisialisasi sheet SETTINGS untuk konfigurasi sistem
 */
function getSettingsSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SETTINGS_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, SETTINGS_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080"); // Brand Tosca
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    // Nilai default awal running text
    sheet.appendRow([
      "running_text",
      JSON.stringify(DEFAULT_RUNNING_TEXT),
      getJakartaTimestamp()
    ]);

    for (let col = 1; col <= SETTINGS_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Membaca pengaturan dari sheet SETTINGS, menggabungkan dengan nilai default
 * Dioptimalkan dengan CacheService untuk performa tinggi & hemat kuota read spreadsheet
 */
function readSettings(forceRefresh) {
  if (!forceRefresh) {
    const cached = getChunkedCache(SERVER_CACHE_KEYS.SETTINGS);
    if (cached && typeof cached === "object") {
      recordCacheTelemetry_("settings", "hit");
      return cached;
    }
  }
  recordCacheTelemetry_("settings", "miss");

  const sheet = getSettingsSheet();
  const lastRow = sheet.getLastRow();
  const settings = {
    running_text: Object.assign({}, DEFAULT_RUNNING_TEXT),
    hero_card: Object.assign({}, DEFAULT_HERO_CARD),
    slideshow: DEFAULT_SLIDESHOW.slice(),
    metode: DEFAULT_METODE.slice(),
    program: Object.assign({}, DEFAULT_PROGRAM),
    testimoni: DEFAULT_TESTIMONI.slice(),
    faq: DEFAULT_FAQ.slice(),
    kuota_jam: DEFAULT_KUOTA_JAM
  };

  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    let hasReadRunningText = false;
    let hasReadHeroCard = false;
    let hasReadSlideshow = false;
    let hasReadMetode = false;
    let hasReadProgram = false;
    let hasReadTestimoni = false;
    let hasReadFaq = false;
    let hasReadKuotaJam = false;
    for (let i = 0; i < values.length; i++) {
      const key = String(values[i][0] || "").trim();
      const valStr = String(values[i][1] || "").trim();
      if (key === "running_text" && valStr && !hasReadRunningText) {
        try {
          const parsed = JSON.parse(valStr);
          settings.running_text = Object.assign({}, DEFAULT_RUNNING_TEXT, parsed);
          hasReadRunningText = true;
        } catch (e) {
          // Abaikan error parse, pakai default
        }
      } else if (key === "hero_card" && valStr !== "" && !hasReadHeroCard) {
        try {
          const parsed = JSON.parse(valStr);
          settings.hero_card = sanitizeHeroCard(parsed);
          hasReadHeroCard = true;
        } catch (e) {
          // Abaikan error parse, pakai default
        }
      } else if (key === "slideshow" && valStr !== "" && !hasReadSlideshow) {
        try {
          const parsed = JSON.parse(valStr);
          if (Array.isArray(parsed)) {
            settings.slideshow = sanitizeSlideshow(parsed);
            hasReadSlideshow = true;
          }
        } catch (e) {
          // Abaikan error parse, pakai default
        }
      } else if (key === "metode" && valStr !== "" && !hasReadMetode) {
        try {
          const parsed = JSON.parse(valStr);
          if (Array.isArray(parsed)) {
            settings.metode = sanitizeMetode(parsed);
            hasReadMetode = true;
          }
        } catch (e) {
          // Abaikan error parse, pakai default
        }
      } else if (key === "program" && valStr !== "" && !hasReadProgram) {
        try {
          const parsed = JSON.parse(valStr);
          settings.program = sanitizeProgram(parsed);
          hasReadProgram = true;
        } catch (e) {
          // Abaikan error parse, pakai default
        }
      } else if (key === "testimoni" && valStr !== "" && !hasReadTestimoni) {
        try {
          const parsed = JSON.parse(valStr);
          if (Array.isArray(parsed)) {
            settings.testimoni = sanitizeTestimoni(parsed);
            hasReadTestimoni = true;
          }
        } catch (e) {
          // Abaikan error parse, pakai default
        }
      } else if (key === "faq" && valStr !== "" && !hasReadFaq) {
        try {
          const parsed = JSON.parse(valStr);
          if (Array.isArray(parsed)) {
            settings.faq = sanitizeFaq(parsed);
            hasReadFaq = true;
          }
        } catch (e) {
          // Abaikan error parse, pakai default
        }
      } else if (key === "kuota_jam" && valStr !== "" && !hasReadKuotaJam) {
        try {
          const parsedK = parseInt(valStr, 10);
          if (!isNaN(parsedK) && parsedK >= 1 && parsedK <= 50) {
            settings.kuota_jam = parsedK;
          }
          hasReadKuotaJam = true;
        } catch (e) {
          // Abaikan error, pakai default
        }
      }
    }
  }

  putChunkedCache(SERVER_CACHE_KEYS.SETTINGS, settings, SETTINGS_CACHE_TTL);
  return settings;
}

/**
 * Validasi dan normalisasi kuota jam khitan (integer 1-50, default 1)
 */
function sanitizeKuotaJam(input) {
  let val = parseInt(input, 10);
  if (isNaN(val) || val < 1 || val > 50) {
    val = DEFAULT_KUOTA_JAM;
  }
  return val;
}

/**
 * Validasi dan normalisasi konfigurasi running text
 */
function sanitizeRunningText(input) {
  const cfg = input || {};
  let text = String(cfg.text || "").trim();
  if (!text) {
    text = DEFAULT_RUNNING_TEXT.text;
  } else if (text.length > 500) {
    text = text.substring(0, 500);
  }

  let font = String(cfg.font || "").trim();
  if (!ALLOWED_RUNNING_TEXT_FONTS.includes(font)) {
    font = "Inter";
  }

  let fontSize = parseInt(cfg.fontSize, 10);
  if (isNaN(fontSize) || fontSize < 8 || fontSize > 40) {
    fontSize = DEFAULT_RUNNING_TEXT.fontSize;
  }

  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  let fontColor = String(cfg.fontColor || "").trim();
  if (!hexRegex.test(fontColor)) {
    fontColor = DEFAULT_RUNNING_TEXT.fontColor;
  }

  let bgColor = String(cfg.bgColor || "").trim();
  if (!hexRegex.test(bgColor)) {
    bgColor = DEFAULT_RUNNING_TEXT.bgColor;
  }

  let speed = parseInt(cfg.speed, 10);
  if (isNaN(speed) || speed < 5 || speed > 120) {
    speed = DEFAULT_RUNNING_TEXT.speed;
  }

  const visible = cfg.visible !== false && cfg.visible !== "false";

  return {
    text: text,
    font: font,
    fontSize: fontSize,
    fontColor: fontColor,
    bgColor: bgColor,
    speed: speed,
    visible: visible
  };
}

/**
 * Validasi dan normalisasi konfigurasi Hero Card / Featuring Card Beranda publik
 * Dibagi menjadi 3 kelompok teks: badge (span), title (h2), dan description (p)
 */
function sanitizeHeroCard(input) {
  const cfg = input || {};
  let badgeText = String(cfg.badgeText || "").trim();
  if (!badgeText) {
    badgeText = DEFAULT_HERO_CARD.badgeText;
  } else if (badgeText.length > 100) {
    badgeText = badgeText.substring(0, 100);
  }

  let titleText = String(cfg.titleText || "").trim();
  if (!titleText) {
    titleText = DEFAULT_HERO_CARD.titleText;
  } else if (titleText.length > 200) {
    titleText = titleText.substring(0, 200);
  }

  let descriptionText = String(cfg.descriptionText || "").trim();
  if (!descriptionText) {
    descriptionText = DEFAULT_HERO_CARD.descriptionText;
  } else if (descriptionText.length > 1000) {
    descriptionText = descriptionText.substring(0, 1000);
  }

  return {
    badgeText: badgeText,
    titleText: titleText,
    descriptionText: descriptionText
  };
}

/**
 * Validasi dan normalisasi konfigurasi foto slideshow
 */
function sanitizeSlideshow(input) {
  if (!Array.isArray(input)) return [];
  const clean = [];
  const fileIdPattern = /^[a-zA-Z0-9_-]{10,100}$/;

  for (let i = 0; i < input.length; i++) {
    if (clean.length >= SLIDESHOW_MAX_IMAGES) break;
    const item = input[i];
    if (!item || typeof item !== "object") continue;

    const fileId = String(item.fileId || "").trim();
    let src = String(item.src || item.url || "").trim();
    let alt = String(item.alt || ("Keunggulan Khitan Damai " + (clean.length + 1))).trim();

    if (fileId && fileIdPattern.test(fileId)) {
      if (!src || !src.startsWith("http")) {
        src = "https://lh3.googleusercontent.com/d/" + fileId + "=w1200";
      }
      clean.push({
        fileId: fileId,
        src: src,
        alt: alt.substring(0, 100)
      });
    } else if (src && src.startsWith("http")) {
      clean.push({
        fileId: fileId || "",
        src: src,
        alt: alt.substring(0, 100)
      });
    }
  }

  return clean;
}

/**
 * Validasi dan normalisasi konfigurasi foto metode (tepat 6 slot, boleh null)
 */
function sanitizeMetode(input) {
  const clean = [];
  const fileIdPattern = /^[a-zA-Z0-9_-]{10,100}$/;
  const inArr = Array.isArray(input) ? input : [];

  for (let i = 0; i < METODE_MAX_IMAGES; i++) {
    const item = inArr[i];
    if (!item || typeof item !== "object") {
      clean.push(null);
      continue;
    }

    const fileId = String(item.fileId || "").trim();
    let src = String(item.src || item.url || "").trim();
    let alt = String(item.alt || ("Metode Khitan " + (i + 1))).trim();

    if (fileId && fileIdPattern.test(fileId)) {
      if (!src || !src.startsWith("http")) {
        src = "https://lh3.googleusercontent.com/d/" + fileId + "=w1200";
      }
      clean.push({
        fileId: fileId,
        src: src,
        alt: alt.substring(0, 100)
      });
    } else if (src && src.startsWith("http")) {
      clean.push({
        fileId: fileId || "",
        src: src,
        alt: alt.substring(0, 100)
      });
    } else {
      clean.push(null);
    }
  }

  return clean;
}

/**
 * Validasi dan normalisasi konfigurasi foto card program (boleh null jika dihapus/kosong)
 */
function sanitizeProgram(input) {
  if (!input || typeof input !== "object") return null;
  const fileIdPattern = /^[a-zA-Z0-9_-]{10,100}$/;
  const fileId = String(input.fileId || "").trim();
  let src = String(input.src || input.url || "").trim();
  let alt = String(input.alt || "Program Jumat Khitan Berkah").trim();

  if (fileId && fileIdPattern.test(fileId)) {
    if (!src || !src.startsWith("http")) {
      src = "https://lh3.googleusercontent.com/d/" + fileId + "=w1200";
    }
    return {
      fileId: fileId,
      src: src,
      alt: alt.substring(0, 100)
    };
  } else if (src && src.startsWith("http")) {
    return {
      fileId: fileId || "",
      src: src,
      alt: alt.substring(0, 100)
    };
  }

  return null;
}

/**
 * Validasi dan normalisasi konfigurasi testimoni (maksimal 5 item, nama & teks wajib)
 */
function sanitizeTestimoni(input) {
  if (!Array.isArray(input)) return [];
  const clean = [];
  const fileIdPattern = /^[a-zA-Z0-9_-]{10,100}$/;

  for (let i = 0; i < input.length; i++) {
    if (clean.length >= TESTIMONI_MAX_ITEMS) break;
    const raw = input[i];
    if (!raw || typeof raw !== "object") continue;

    const name = String(raw.name || "").trim().substring(0, 80);
    const text = String(raw.text || "").trim().substring(0, TESTIMONI_TEXT_MAX);

    // Nama dan teks testimoni wajib diisi agar valid
    if (!name || !text) continue;

    let rating = parseInt(raw.rating, 10);
    if (isNaN(rating) || rating < 1) rating = 5;
    if (rating > 5) rating = 5;

    let link = String(raw.link || "").trim();
    if (link && !link.startsWith("http://") && !link.startsWith("https://")) {
      link = "";
    }
    if (link.length > 500) link = link.substring(0, 500);

    let photo = null;
    if (raw.photo && typeof raw.photo === "object") {
      const pFileId = String(raw.photo.fileId || "").trim();
      let pSrc = String(raw.photo.src || raw.photo.url || "").trim();
      if (pFileId && fileIdPattern.test(pFileId)) {
        if (!pSrc || !pSrc.startsWith("http")) {
          pSrc = "https://lh3.googleusercontent.com/d/" + pFileId + "=w400";
        }
        photo = { fileId: pFileId, src: pSrc };
      } else if (pSrc && pSrc.startsWith("http")) {
        photo = { fileId: pFileId || "", src: pSrc };
      }
    }

    clean.push({
      name: name,
      rating: rating,
      text: text,
      link: link,
      photo: photo
    });
  }

  return clean;
}

/**
 * Validasi dan normalisasi konfigurasi Tanya Jawab / FAQ publik
 */
function sanitizeFaq(input) {
  if (!Array.isArray(input)) return [];
  const clean = [];
  for (let i = 0; i < input.length; i++) {
    if (clean.length >= FAQ_MAX_ITEMS) break;
    const raw = input[i];
    if (!raw || typeof raw !== "object") continue;

    const question = String(raw.question || "").trim().substring(0, FAQ_QUESTION_MAX);
    const answer = String(raw.answer || "").trim().substring(0, FAQ_ANSWER_MAX);
    if (!question || !answer) continue;

    const id = String(raw.id || ("faq-" + (i + 1))).trim().substring(0, 50);
    const active = raw.active !== false && raw.active !== "false";

    clean.push({
      id: id,
      question: question,
      answer: answer,
      active: active
    });
  }
  return clean;
}

/**
 * Helper untuk menyisipkan atau memperbarui baris pengaturan pada sheet SETTINGS
 */
function upsertSettingRow(sheet, key, jsonValue, timestamp) {
  const lastRow = sheet.getLastRow();
  let firstRowIndex = -1;
  const duplicateRowIndices = [];

  if (lastRow > 1) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0] || "").trim() === key) {
        const actualRow = i + 2;
        if (firstRowIndex === -1) {
          firstRowIndex = actualRow;
        } else {
          duplicateRowIndices.push(actualRow);
        }
      }
    }
  }

  if (firstRowIndex > 0) {
    sheet.getRange(firstRowIndex, 2).setValue(jsonValue);
    sheet.getRange(firstRowIndex, 3).setValue(timestamp);
    // Hapus baris duplikat dari bawah ke atas agar indeks baris tidak bergeser
    for (let d = duplicateRowIndices.length - 1; d >= 0; d--) {
      sheet.deleteRow(duplicateRowIndices[d]);
    }
  } else {
    sheet.appendRow([key, jsonValue, timestamp]);
  }
}

/**
 * Memindahkan file yang dihapus dari slideshow ke trash Google Drive
 * Hanya menghapus file yang berada di folder SLIDESHOW_FOLDER_ID dan bukan foto default
 */
function trashRemovedSlideshowFiles(oldList, newList) {
  if (!Array.isArray(oldList) || oldList.length === 0) return;
  const newIds = {};
  (newList || []).forEach(function(item) {
    if (item && item.fileId) newIds[item.fileId] = true;
  });
  const defaultIds = {};
  DEFAULT_SLIDESHOW.forEach(function(item) {
    if (item && item.fileId) defaultIds[item.fileId] = true;
  });

  for (let i = 0; i < oldList.length; i++) {
    const oldItem = oldList[i];
    if (!oldItem || !oldItem.fileId) continue;
    const oldId = String(oldItem.fileId).trim();
    if (!oldId || newIds[oldId] || defaultIds[oldId]) continue;

    try {
      const file = DriveApp.getFileById(oldId);
      const parents = file.getParents();
      let inFolder = false;
      while (parents.hasNext()) {
        if (parents.next().getId() === SLIDESHOW_FOLDER_ID) {
          inFolder = true;
          break;
        }
      }
      if (inFolder) {
        file.setTrashed(true);
      }
    } catch (err) {
      Logger.log("Peringatan: Gagal mentrash file slideshow: " + oldId + " - " + err.message);
    }
  }
}

/**
 * Memindahkan file yang dihapus dari metode ke trash Google Drive
 * Hanya menghapus file yang berada di folder SLIDESHOW_FOLDER_ID dan bukan foto default metode
 */
function trashRemovedMetodeFiles(oldList, newList) {
  if (!Array.isArray(oldList) || oldList.length === 0) return;
  const newIds = {};
  (newList || []).forEach(function(item) {
    if (item && item.fileId) newIds[item.fileId] = true;
  });
  const defaultIds = {};
  DEFAULT_METODE.forEach(function(item) {
    if (item && item.fileId) defaultIds[item.fileId] = true;
  });

  for (let i = 0; i < oldList.length; i++) {
    const oldItem = oldList[i];
    if (!oldItem || !oldItem.fileId) continue;
    const oldId = String(oldItem.fileId).trim();
    if (!oldId || newIds[oldId] || defaultIds[oldId]) continue;

    try {
      const file = DriveApp.getFileById(oldId);
      const parents = file.getParents();
      let inFolder = false;
      while (parents.hasNext()) {
        if (parents.next().getId() === SLIDESHOW_FOLDER_ID) {
          inFolder = true;
          break;
        }
      }
      if (inFolder) {
        file.setTrashed(true);
      }
    } catch (err) {
      Logger.log("Peringatan: Gagal mentrash file metode: " + oldId + " - " + err.message);
    }
  }
}

/**
 * Memindahkan file yang diganti atau dihapus dari foto program ke trash Google Drive
 * Hanya menghapus file yang berada di folder SLIDESHOW_FOLDER_ID dan bukan foto default program
 */
function trashRemovedProgramFiles(oldItem, newItem) {
  if (!oldItem || !oldItem.fileId) return;
  const oldId = String(oldItem.fileId).trim();
  const newId = (newItem && newItem.fileId) ? String(newItem.fileId).trim() : "";
  const defaultId = String(DEFAULT_PROGRAM.fileId || "").trim();

  if (!oldId || oldId === newId || oldId === defaultId) return;

  try {
    const file = DriveApp.getFileById(oldId);
    const parents = file.getParents();
    let inFolder = false;
    while (parents.hasNext()) {
      if (parents.next().getId() === SLIDESHOW_FOLDER_ID) {
        inFolder = true;
        break;
      }
    }
    if (inFolder) {
      file.setTrashed(true);
    }
  } catch (err) {
    Logger.log("Peringatan: Gagal mentrash file program: " + oldId + " - " + err.message);
  }
}

/**
 * Memindahkan foto testimoni yang diganti atau dihapus ke trash Google Drive
 * Hanya menghapus file yang berada di folder SLIDESHOW_FOLDER_ID
 */
function trashRemovedTestimoniFiles(oldList, newList) {
  if (!Array.isArray(oldList) || oldList.length === 0) return;
  const newIds = {};
  (newList || []).forEach(function(item) {
    if (item && item.photo && item.photo.fileId) {
      newIds[item.photo.fileId] = true;
    }
  });

  for (let i = 0; i < oldList.length; i++) {
    const oldItem = oldList[i];
    if (!oldItem || !oldItem.photo || !oldItem.photo.fileId) continue;
    const oldId = String(oldItem.photo.fileId).trim();
    if (!oldId || newIds[oldId]) continue;

    try {
      const file = DriveApp.getFileById(oldId);
      const parents = file.getParents();
      let inFolder = false;
      while (parents.hasNext()) {
        if (parents.next().getId() === SLIDESHOW_FOLDER_ID) {
          inFolder = true;
          break;
        }
      }
      if (inFolder) {
        file.setTrashed(true);
      }
    } catch (err) {
      Logger.log("Peringatan: Gagal mentrash foto testimoni: " + oldId + " - " + err.message);
    }
  }
}

/**
 * Helper untuk membaca daftar file cadangan yang tersimpan di folder Google Drive BACKUP_FOLDER_ID
 */
function listDatabaseBackups_() {
  try {
    const folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
    const files = folder.getFiles();
    const list = [];
    while (files.hasNext() && list.length < 30) {
      const f = files.next();
      if (!f.isTrashed()) {
        list.push({
          id: f.getId(),
          name: f.getName(),
          url: f.getUrl(),
          created: Utilities.formatDate(f.getDateCreated(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"),
          size: f.getSize(),
          mimeType: f.getMimeType()
        });
      }
    }
    list.sort(function(a, b) {
      return (b.created > a.created ? 1 : -1);
    });
    return list;
  } catch (err) {
    Logger.log("Peringatan: Gagal membaca folder backup: " + err.toString());
    return [];
  }
}

/**
 * Membersihkan file cadangan database lama (> 90 hari) dari folder Google Drive
 */
function pruneOldBackups_(folder) {
  try {
    if (!folder) return;
    const files = folder.getFiles();
    const nowMs = Date.now();
    const RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 hari
    let deletedCount = 0;
    while (files.hasNext()) {
      const f = files.next();
      if (!f.isTrashed()) {
        const createdMs = f.getDateCreated().getTime();
        if (nowMs - createdMs > RETENTION_MS) {
          f.setTrashed(true);
          deletedCount++;
        }
      }
    }
    if (deletedCount > 0) {
      Logger.log("pruneOldBackups_: " + deletedCount + " file cadangan lama telah dibersihkan.");
    }
  } catch (e) {
    Logger.log("pruneOldBackups_ error: " + e.toString());
  }
}

/**
 * Helper untuk membuat salinan seluruh database Spreadsheet ke folder Google Drive BACKUP_FOLDER_ID
 * Format Nama File: "YYYY-MM-DD_HHmmss_KhitanDamai"
 */
function executeDatabaseBackup_() {
  const targetFolder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
  const originFile = DriveApp.getFileById(SPREADSHEET_ID);
  const now = new Date();
  const todayStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(now, "Asia/Jakarta", "HHmmss");
  const fileName = todayStr + "_" + timeStr + "_KhitanDamai";

  const backupFile = originFile.makeCopy(fileName, targetFolder);
  const timestamp = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  // Pembersihan berkala cadangan kadaluarsa (> 90 hari)
  pruneOldBackups_(targetFolder);

  return {
    fileId: backupFile.getId(),
    fileName: backupFile.getName(),
    fileUrl: backupFile.getUrl(),
    timestamp: timestamp,
    folderUrl: "https://drive.google.com/drive/folders/" + BACKUP_FOLDER_ID,
    size: backupFile.getSize()
  };
}

/**
 * Helper untuk format ukuran byte ke teks KB / MB
 */
function formatBackupSizeText_(bytes) {
  const num = Number(bytes) || 0;
  if (num <= 0) return "0 KB";
  const kb = num / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  return (kb / 1024).toFixed(2) + " MB";
}

/**
 * Mengirim notifikasi hasil backup database ke Telegram Admin
 */
function sendTelegramBackupNotification_(backupResult, isAutomatic) {
  try {
    const config = getTelegramConfig_();
    if (!config.botToken || !config.chatId) {
      Logger.log("sendTelegramBackupNotification_: Bot token atau Chat ID belum disetel.");
      return { success: false, message: "Konfigurasi bot token atau chatId belum ada." };
    }

    const titlePrefix = isAutomatic 
      ? "🤖 <b>PERINGATAN &amp; BACKUP OTOMATIS BULANAN</b> 💾" 
      : "💾 <b>BACKUP DATABASE GOOGLE DRIVE</b> ✨";
    const subNote = isAutomatic 
      ? "<i>Pencadangan rutin otomatis seluruh sheet setiap tanggal 01 jam 08:00 WIB berhasil diselesaikan. File cadangan telah tersimpan aman di Google Drive.</i>" 
      : "<i>Pencadangan database (Full Spreadsheet) berhasil diproses via Panel Admin / Perintah Bot.</i>";

    const msgText = titlePrefix + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "📅 <b>Waktu Proses:</b> " + escapeTelegramHtml_(backupResult.timestamp || "-") + " WIB\n" +
      "📋 <b>Cakupan Data:</b> Seluruh Sheet (Full Spreadsheet)\n" +
      "📁 <b>Nama File:</b> <code>" + escapeTelegramHtml_(backupResult.fileName || "-") + "</code>\n" +
      "📊 <b>Ukuran:</b> " + formatBackupSizeText_(backupResult.size) + "\n" +
      "📁 <b>Folder Tujuan:</b> Folder Backup Google Drive\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      subNote;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "📄 Buka File Backup", url: backupResult.fileUrl || "https://drive.google.com" },
          { text: "📁 Buka Folder Drive", url: backupResult.folderUrl || ("https://drive.google.com/drive/folders/" + BACKUP_FOLDER_ID) }
        ]
      ]
    };

    return sendTelegramMessage_(config.chatId, msgText, inlineKeyboard);
  } catch (err) {
    Logger.log("sendTelegramBackupNotification_ error: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Pemeriksaan dan eksekusi backup bulanan otomatis setiap tanggal 01 (jam >= 08:00 WIB).
 * Dipanggil berkala oleh trigger time-driven 1 jam sekali (checkUpcomingKhitanReminders).
 * Menggunakan Script Properties 'AUTO_BACKUP_MONTH' (format YYYY-MM) untuk dedup per bulan.
 */
function maybeRunMonthlyBackup_(force) {
  const now = new Date();
  const currentMonthKey = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM");
  const dayStr = Utilities.formatDate(now, "Asia/Jakarta", "dd");
  const hourStr = Utilities.formatDate(now, "Asia/Jakarta", "HH");
  const dayNum = parseInt(dayStr, 10);
  const hourNum = parseInt(hourStr, 10);

  const props = PropertiesService.getScriptProperties();
  const lastBackedMonth = props ? (props.getProperty("AUTO_BACKUP_MONTH") || "") : "";

  if (!force) {
    // Hanya berjalan jika sudah masuk jam 08:00 WIB ke atas
    if (hourNum < 8) {
      return { skipped: true, reason: "Belum masuk jam 08:00 WIB (jam saat ini: " + hourStr + ")" };
    }
    // Syarat tanggal 01 (atau backfill jika tanggal >= 1 tapi bulan ini belum pernah dibackup)
    if (dayNum !== 1 && lastBackedMonth === currentMonthKey) {
      return { skipped: true, reason: "Bukan tanggal 01 dan backup bulan ini sudah tercatat." };
    }
    // Jika bulan ini sudah dibackup, jangan ulangi (deduplikasi)
    if (lastBackedMonth === currentMonthKey) {
      return { skipped: true, reason: "Backup bulanan untuk " + currentMonthKey + " sudah pernah dijalankan." };
    }
  }

  Logger.log("Memulai eksekusi backup database otomatis bulanan untuk periode: " + currentMonthKey);
  const backupResult = executeDatabaseBackup_();

  // Simpan penanda bahwa bulan ini sudah berhasil dibackup
  if (props) {
    props.setProperty("AUTO_BACKUP_MONTH", currentMonthKey);
    props.setProperty("AUTO_BACKUP_LAST_RUN", Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"));
    props.setProperty("AUTO_BACKUP_LAST_FILE", backupResult.fileName);
  }

  // Kirim notifikasi Telegram ke Admin
  sendTelegramBackupNotification_(backupResult, true);

  Logger.log("Backup bulanan berhasil dibuat dan dikirim ke Telegram: " + backupResult.fileName);
  return { success: true, data: backupResult };
}

/**
 * Fungsi pembantu manual untuk menguji backup bulanan kapan saja dari Editor Apps Script
 */
function testMonthlyBackupNow() {
  return maybeRunMonthlyBackup_(true);
}

/**
 * Mendapatkan atau menginisialisasi sheet GALERI beserta header-nya
 */
function getGaleriSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(GALERI_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(GALERI_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(GALERI_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, GALERI_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080"); // Brand Tosca
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    for (let col = 1; col <= GALERI_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Menghasilkan ID unik 7 karakter alfabet A-Z (readonly untuk frontend)
 */
function generateGaleriId(existingIds) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const idSet = existingIds || {};
  for (let attempt = 0; attempt < 1000; attempt++) {
    let id = "";
    for (let i = 0; i < 7; i++) {
      const idx = Math.floor(Math.random() * chars.length);
      id += chars.charAt(idx);
    }
    if (!idSet[id]) {
      return id;
    }
  }
  let fallbackId = "";
  for (let i = 0; i < 7; i++) {
    fallbackId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return fallbackId;
}

/**
 * Membaca semua data dari sheet GALERI
 * Dioptimalkan dengan CacheService untuk performa tinggi & hemat kuota read spreadsheet
 */
function readGaleriFromSheet(forceRefresh) {
  if (!forceRefresh) {
    const cached = getChunkedCache(SERVER_CACHE_KEYS.GALERI);
    if (cached && Array.isArray(cached)) {
      recordCacheTelemetry_("galeri", "hit");
      return cached;
    }
  }
  recordCacheTelemetry_("galeri", "miss");

  const sheet = getGaleriSheet();
  const lastRow = sheet.getLastRow();
  const items = [];

  if (lastRow <= 1) {
    putChunkedCache(SERVER_CACHE_KEYS.GALERI, [], GALERI_CACHE_TTL);
    return items;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, GALERI_HEADERS.length).getValues();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const id = String(row[0] || "").trim();
    const nama = String(row[1] || "").trim();
    const rawFoto = row[2];

    if (!id && !nama && !rawFoto) continue;

    let fotoObj = { fileId: "", src: "" };
    if (typeof rawFoto === "object" && rawFoto !== null) {
      fotoObj = {
        fileId: String(rawFoto.fileId || "").trim(),
        src: String(rawFoto.src || rawFoto.url || "").trim()
      };
    } else if (typeof rawFoto === "string") {
      const trimmed = rawFoto.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          fotoObj = {
            fileId: String(parsed.fileId || "").trim(),
            src: String(parsed.src || parsed.url || "").trim()
          };
        } catch (e) {
          fotoObj = { fileId: "", src: trimmed };
        }
      } else {
        fotoObj = { fileId: "", src: trimmed };
      }
    }

    // Normalisasi jika berupa link file Google Drive atau docs
    if (fotoObj.src && (fotoObj.src.indexOf("drive.google.com") !== -1 || fotoObj.src.indexOf("docs.google.com") !== -1)) {
      const match = fotoObj.src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                    fotoObj.src.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                    fotoObj.src.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        fotoObj.fileId = fotoObj.fileId || match[1];
        fotoObj.src = "https://lh3.googleusercontent.com/d/" + match[1] + "=w1200";
      }
    } else if (fotoObj.fileId && !fotoObj.src) {
      fotoObj.src = "https://lh3.googleusercontent.com/d/" + fotoObj.fileId + "=w1200";
    }

    items.push({
      id: id,
      nama: nama,
      foto: fotoObj,
      rowIndex: i + 2
    });
  }

  putChunkedCache(SERVER_CACHE_KEYS.GALERI, items, GALERI_CACHE_TTL);
  return items;
}

/**
 * Memindahkan file foto galeri ke trash Google Drive jika berada di GALERI_FOLDER_ID
 */
function trashGaleriFile(fileId) {
  if (!fileId) return;
  const idStr = String(fileId).trim();
  if (!idStr) return;

  try {
    const file = DriveApp.getFileById(idStr);
    const parents = file.getParents();
    let inFolder = false;
    while (parents.hasNext()) {
      if (parents.next().getId() === GALERI_FOLDER_ID) {
        inFolder = true;
        break;
      }
    }
    if (inFolder) {
      file.setTrashed(true);
    }
  } catch (err) {
    Logger.log("Peringatan: Gagal mentrash foto galeri: " + idStr + " - " + err.message);
  }
}

/**
 * Mendapatkan atau menginisialisasi sheet SARAN beserta header-nya
 */
function getSaranSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SARAN_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SARAN_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SARAN_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, SARAN_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080"); // Brand Tosca
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    for (let col = 1; col <= SARAN_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Menghasilkan ID unik 4 karakter alfanumerik (A-Z, 0-9)
 */
function generateSaranId(existingIds) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const idSet = existingIds || {};
  for (let attempt = 0; attempt < 1000; attempt++) {
    let id = "";
    for (let i = 0; i < 4; i++) {
      const idx = Math.floor(Math.random() * chars.length);
      id += chars.charAt(idx);
    }
    if (!idSet[id]) {
      return id;
    }
  }
  let fallbackId = "";
  for (let i = 0; i < 4; i++) {
    fallbackId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return fallbackId;
}

/**
 * Membaca semua data dari sheet SARAN
 * Dioptimalkan dengan CacheService untuk performa tinggi & hemat kuota read spreadsheet
 */
function readSaranFromSheet(forceRefresh) {
  if (!forceRefresh) {
    const cached = getChunkedCache(SERVER_CACHE_KEYS.SARAN);
    if (cached && Array.isArray(cached)) {
      recordCacheTelemetry_("saran", "hit");
      return cached;
    }
  }
  recordCacheTelemetry_("saran", "miss");

  const sheet = getSaranSheet();
  const lastRow = sheet.getLastRow();
  const items = [];

  if (lastRow <= 1) {
    putChunkedCache(SERVER_CACHE_KEYS.SARAN, [], SERVER_CACHE_DEFAULT_TTL);
    return items;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, SARAN_HEADERS.length).getValues();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const id = String(row[0] || "").trim();
    let tanggal = row[1];
    let jam = row[2];
    const nama = String(row[3] || "").trim();
    const noHp = String(row[4] || "").trim();
    const email = String(row[5] || "").trim();
    const saran = String(row[6] || "").trim();

    if (!id && !nama && !saran) continue;

    if (tanggal instanceof Date) {
      tanggal = Utilities.formatDate(tanggal, "Asia/Jakarta", "yyyy-MM-dd");
    } else {
      tanggal = String(tanggal || "").trim();
    }

    if (jam instanceof Date) {
      jam = Utilities.formatDate(jam, "Asia/Jakarta", "HH:mm:ss");
    } else {
      jam = String(jam || "").trim();
    }

    items.push({
      id: id,
      tanggal: tanggal,
      jam: jam,
      nama: nama,
      noHp: noHp,
      email: email,
      saran: saran,
      rowIndex: i + 2
    });
  }

  putChunkedCache(SERVER_CACHE_KEYS.SARAN, items, SERVER_CACHE_DEFAULT_TTL);
  return items;
}

/**
 * Mendapatkan atau menginisialisasi sheet ALAMAT beserta header-nya
 */
function getAlamatSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(ALAMAT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(ALAMAT_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ALAMAT_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, ALAMAT_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080"); // Brand Tosca
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    for (let col = 1; col <= ALAMAT_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Menyimpan batch key-value ke CacheService dengan pemecahan chunk (maks 100 key per batch)
 * dan validasi batas ukuran nilai (< 100KB)
 */
function safePutAllCache(cache, entriesObj, ttl) {
  if (!cache || !entriesObj || typeof entriesObj !== "object") return 0;
  const keys = Object.keys(entriesObj);
  if (keys.length === 0) return 0;

  const expiration = ttl || ALAMAT_CACHE_TTL;
  let chunk = {};
  let count = 0;
  let totalSaved = 0;

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const val = entriesObj[k];
    if (typeof val === "string" && val.length < 100000) {
      chunk[k] = val;
      count++;
      totalSaved++;
    }
    if (count >= 100 || i === keys.length - 1) {
      if (Object.keys(chunk).length > 0) {
        try {
          cache.putAll(chunk, expiration);
        } catch (err) {
          Logger.log("safePutAllCache error: " + err.toString());
        }
        chunk = {};
        count = 0;
      }
    }
  }
  return totalSaved;
}

/**
 * Membaca opsi alamat unik bertingkat dari sheet ALAMAT dengan optimasi kolom seperlunya,
 * sekaligus menghangatkan cache bertingkat (warming subtree) ke CacheService selama 6 jam.
 * Level: 'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan'
 */
function readAndWarmAlamatOptions(level, filters) {
  const sheet = getAlamatSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  const provFilter = String((filters && filters.provinsi) || "").trim().toLowerCase();
  const kabFilter = String((filters && filters.kabupaten) || "").trim().toLowerCase();
  const kecFilter = String((filters && filters.kecamatan) || "").trim().toLowerCase();

  // Optimasi: Hanya baca jumlah kolom yang dibutuhkan per level
  const colCount = level === "provinsi" ? 2 : 4;
  const values = sheet.getRange(2, 1, lastRow - 1, colCount).getValues();

  let cache = null;
  try {
    cache = CacheService.getScriptCache();
  } catch (cErr) {
    Logger.log("CacheService init error: " + cErr.toString());
  }

  const warmEntries = {};

  if (level === "provinsi") {
    const provSet = {};
    const kabByProv = {};
    const provList = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const prov = String(row[0] || "").trim();
      const kab = String(row[1] || "").trim();
      if (!prov || (prov.toUpperCase() === "PROVINSI" && kab.toUpperCase() === "KABUPATEN")) continue;

      if (!provSet[prov]) {
        provSet[prov] = true;
        provList.push(prov);
      }
      if (kab) {
        const provKey = prov.toLowerCase();
        if (!kabByProv[provKey]) kabByProv[provKey] = {};
        kabByProv[provKey][kab] = true;
      }
    }

    provList.sort(function(a, b) {
      return a.localeCompare(b, "id", { sensitivity: "base" });
    });

    // Hangatkan cache provinsi
    warmEntries["alamat:provinsi:||"] = JSON.stringify(provList);

    // Sekaligus hangatkan SEMUA daftar kabupaten untuk setiap provinsi (34 key)
    for (let p = 0; p < provList.length; p++) {
      const pName = provList[p];
      const pKey = pName.toLowerCase();
      const kabs = Object.keys(kabByProv[pKey] || {}).sort(function(a, b) {
        return a.localeCompare(b, "id", { sensitivity: "base" });
      });
      const cacheKey = ("alamat:kabupaten:" + pKey + "||").substring(0, 240);
      warmEntries[cacheKey] = JSON.stringify(kabs);
    }

    if (cache) {
      safePutAllCache(cache, warmEntries, ALAMAT_CACHE_TTL);
    }

    return provList;
  }

  if (level === "kabupaten") {
    const kabSet = {};
    const kabList = [];
    const kecByKab = {};
    const kelByKec = {};

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const prov = String(row[0] || "").trim();
      const kab = String(row[1] || "").trim();
      const kec = String(row[2] || "").trim();
      const kel = String(row[3] || "").trim();
      if (!prov || (prov.toUpperCase() === "PROVINSI" && kab.toUpperCase() === "KABUPATEN")) continue;

      if (prov.toLowerCase() === provFilter && kab) {
        if (!kabSet[kab]) {
          kabSet[kab] = true;
          kabList.push(kab);
        }
        if (kec) {
          const kabKey = kab.toLowerCase();
          if (!kecByKab[kabKey]) kecByKab[kabKey] = {};
          kecByKab[kabKey][kec] = true;

          if (kel) {
            const pairKey = kabKey + "|" + kec.toLowerCase();
            if (!kelByKec[pairKey]) kelByKec[pairKey] = {};
            kelByKec[pairKey][kel] = true;
          }
        }
      }
    }

    kabList.sort(function(a, b) {
      return a.localeCompare(b, "id", { sensitivity: "base" });
    });

    warmEntries[("alamat:kabupaten:" + provFilter + "||").substring(0, 240)] = JSON.stringify(kabList);

    // Hangatkan kecamatan untuk setiap kabupaten di provinsi ini
    for (let k = 0; k < kabList.length; k++) {
      const kName = kabList[k];
      const kKey = kName.toLowerCase();
      const kecs = Object.keys(kecByKab[kKey] || {}).sort(function(a, b) {
        return a.localeCompare(b, "id", { sensitivity: "base" });
      });
      const kecCacheKey = ("alamat:kecamatan:" + provFilter + "|" + kKey + "|").substring(0, 240);
      warmEntries[kecCacheKey] = JSON.stringify(kecs);
    }

    // Jika total kelurahan muat dalam limit aman (<= 800 key), hangatkan kelurahan juga
    const kelKecKeys = Object.keys(kelByKec);
    if (kelKecKeys.length + kabList.length <= 800) {
      for (let j = 0; j < kelKecKeys.length; j++) {
        const pair = kelKecKeys[j];
        const parts = pair.split("|");
        const kKab = parts[0];
        const kKec = parts[1];
        const kels = Object.keys(kelByKec[pair] || {}).sort(function(a, b) {
          return a.localeCompare(b, "id", { sensitivity: "base" });
        });
        const kelCacheKey = ("alamat:kelurahan:" + provFilter + "|" + kKab + "|" + kKec).substring(0, 240);
        warmEntries[kelCacheKey] = JSON.stringify(kels);
      }
    }

    if (cache) {
      safePutAllCache(cache, warmEntries, ALAMAT_CACHE_TTL);
    }

    return kabList;
  }

  if (level === "kecamatan") {
    const kecSet = {};
    const kecList = [];
    const kelByKec = {};

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const prov = String(row[0] || "").trim();
      const kab = String(row[1] || "").trim();
      const kec = String(row[2] || "").trim();
      const kel = String(row[3] || "").trim();
      if (!prov || (prov.toUpperCase() === "PROVINSI" && kab.toUpperCase() === "KABUPATEN")) continue;

      if (prov.toLowerCase() === provFilter && kab.toLowerCase() === kabFilter && kec) {
        if (!kecSet[kec]) {
          kecSet[kec] = true;
          kecList.push(kec);
        }
        if (kel) {
          const kecKey = kec.toLowerCase();
          if (!kelByKec[kecKey]) kelByKec[kecKey] = {};
          kelByKec[kecKey][kel] = true;
        }
      }
    }

    kecList.sort(function(a, b) {
      return a.localeCompare(b, "id", { sensitivity: "base" });
    });

    warmEntries[("alamat:kecamatan:" + provFilter + "|" + kabFilter + "|").substring(0, 240)] = JSON.stringify(kecList);

    // Sekaligus hangatkan semua kelurahan untuk setiap kecamatan di kabupaten ini
    for (let c = 0; c < kecList.length; c++) {
      const cName = kecList[c];
      const cKey = cName.toLowerCase();
      const kels = Object.keys(kelByKec[cKey] || {}).sort(function(a, b) {
        return a.localeCompare(b, "id", { sensitivity: "base" });
      });
      const kelCacheKey = ("alamat:kelurahan:" + provFilter + "|" + kabFilter + "|" + cKey).substring(0, 240);
      warmEntries[kelCacheKey] = JSON.stringify(kels);
    }

    if (cache) {
      safePutAllCache(cache, warmEntries, ALAMAT_CACHE_TTL);
    }

    return kecList;
  }

  if (level === "kelurahan") {
    const kelSet = {};
    const kelList = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const prov = String(row[0] || "").trim();
      const kab = String(row[1] || "").trim();
      const kec = String(row[2] || "").trim();
      const kel = String(row[3] || "").trim();
      if (!prov || (prov.toUpperCase() === "PROVINSI" && kab.toUpperCase() === "KABUPATEN")) continue;

      if (prov.toLowerCase() === provFilter && kab.toLowerCase() === kabFilter && kec.toLowerCase() === kecFilter && kel) {
        if (!kelSet[kel]) {
          kelSet[kel] = true;
          kelList.push(kel);
        }
      }
    }

    kelList.sort(function(a, b) {
      return a.localeCompare(b, "id", { sensitivity: "base" });
    });

    warmEntries[("alamat:kelurahan:" + provFilter + "|" + kabFilter + "|" + kecFilter).substring(0, 240)] = JSON.stringify(kelList);

    if (cache) {
      safePutAllCache(cache, warmEntries, ALAMAT_CACHE_TTL);
    }

    return kelList;
  }

  return [];
}

/**
 * Membaca opsi alamat unik bertingkat dari sheet ALAMAT dengan filter
 * Level: 'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan'
 */
function readAlamatOptions(level, filters) {
  return readAndWarmAlamatOptions(level, filters);
}

/**
 * Menghangatkan seluruh struktur alamat (kabupaten, kecamatan, kelurahan)
 * untuk suatu provinsi tertentu ke dalam CacheService
 */
function warmAlamatProvince(provName) {
  const provClean = String(provName || "").trim();
  if (!provClean) return 0;
  const provFilter = provClean.toLowerCase();

  const sheet = getAlamatSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const kabSet = {};
  const kabList = [];
  const kecByKab = {};
  const kelByKec = {};

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const prov = String(row[0] || "").trim();
    const kab = String(row[1] || "").trim();
    const kec = String(row[2] || "").trim();
    const kel = String(row[3] || "").trim();
    if (!prov || (prov.toUpperCase() === "PROVINSI" && kab.toUpperCase() === "KABUPATEN")) continue;

    if (prov.toLowerCase() === provFilter && kab) {
      if (!kabSet[kab]) {
        kabSet[kab] = true;
        kabList.push(kab);
      }
      if (kec) {
        const kabKey = kab.toLowerCase();
        if (!kecByKab[kabKey]) kecByKab[kabKey] = {};
        kecByKab[kabKey][kec] = true;

        if (kel) {
          const pairKey = kabKey + "|" + kec.toLowerCase();
          if (!kelByKec[pairKey]) kelByKec[pairKey] = {};
          kelByKec[pairKey][kel] = true;
        }
      }
    }
  }

  kabList.sort(function(a, b) {
    return a.localeCompare(b, "id", { sensitivity: "base" });
  });

  const warmEntries = {};
  warmEntries[("alamat:kabupaten:" + provFilter + "||").substring(0, 240)] = JSON.stringify(kabList);

  for (let k = 0; k < kabList.length; k++) {
    const kName = kabList[k];
    const kKey = kName.toLowerCase();
    const kecs = Object.keys(kecByKab[kKey] || {}).sort(function(a, b) {
      return a.localeCompare(b, "id", { sensitivity: "base" });
    });
    const kecCacheKey = ("alamat:kecamatan:" + provFilter + "|" + kKey + "|").substring(0, 240);
    warmEntries[kecCacheKey] = JSON.stringify(kecs);
  }

  const kelKecKeys = Object.keys(kelByKec);
  if (kelKecKeys.length + kabList.length <= 800) {
    for (let j = 0; j < kelKecKeys.length; j++) {
      const pair = kelKecKeys[j];
      const parts = pair.split("|");
      const kKab = parts[0];
      const kKec = parts[1];
      const kels = Object.keys(kelByKec[pair] || {}).sort(function(a, b) {
        return a.localeCompare(b, "id", { sensitivity: "base" });
      });
      const kelCacheKey = ("alamat:kelurahan:" + provFilter + "|" + kKab + "|" + kKec).substring(0, 240);
      warmEntries[kelCacheKey] = JSON.stringify(kels);
    }
  }

  let cache = null;
  try {
    cache = CacheService.getScriptCache();
  } catch (err) {}

  if (cache) {
    return safePutAllCache(cache, warmEntries, ALAMAT_CACHE_TTL);
  }
  return 0;
}

/**
 * Migrasi skema sheet Bookings dari format legacy 7 kolom ke 22 kolom spesifikasi baru
 */
function migrateBookingsSheet(sheet) {
  if (!sheet || sheet.getLastRow() === 0) return;
  const firstHeader = String(sheet.getRange(1, 1).getValue() || "").trim();
  // Jika masih menggunakan header lama "ID" (bukan "ID BOOKING")
  if (firstHeader === "ID") {
    const lock = LockService.getScriptLock();
    const hasLock = lock.tryLock(10000);
    try {
      if (String(sheet.getRange(1, 1).getValue() || "").trim() !== "ID") {
        return;
      }
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      let oldValues = [];
      if (lastRow > 1) {
        oldValues = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, 7)).getValues();
      }

      sheet.clear();
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#008080");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);

      if (oldValues.length > 0) {
        const newRows = oldValues.map(function(row) {
          const id = String(row[0] || "").trim();
          let timestamp = row[1];
          if (timestamp instanceof Date) {
            timestamp = Utilities.formatDate(timestamp, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
          }
          const namaAnak = String(row[2] || "").trim();
          const namaOrtu = String(row[3] || "").trim();
          const noHp = String(row[4] || "").trim();
          let tglKhitan = row[5];
          if (tglKhitan instanceof Date) {
            tglKhitan = Utilities.formatDate(tglKhitan, "Asia/Jakarta", "yyyy-MM-dd");
          }
          const status = String(row[6] || "Pending").trim();

          const newRow = new Array(HEADERS.length).fill("");
          newRow[0] = id;                     // ID BOOKING
          newRow[1] = namaAnak;               // NAMA ANANDA
          newRow[5] = tglKhitan;              // TANGGAL KHITAN
          newRow[10] = namaOrtu;              // NAMA PENANGGUNG JAWAB
          newRow[14] = noHp ? (noHp.startsWith("'") ? noHp : ("'" + noHp)) : ""; // NOMOR HP
          newRow[20] = timestamp;            // TIMESTAMP
          newRow[21] = status;               // STATUS
          return newRow;
        });
        sheet.getRange(2, 1, newRows.length, HEADERS.length).setValues(newRows);
      }

      for (let col = 1; col <= HEADERS.length; col++) {
        sheet.autoResizeColumn(col);
      }
    } finally {
      if (hasLock) lock.releaseLock();
    }
  }
}

/**
 * Mendapatkan sheet REFERENSI (auto-create jika belum ada)
 */
function getReferensiSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(REFERENSI_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REFERENSI_SHEET_NAME);
    sheet.appendRow(REFERENSI_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, REFERENSI_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    for (let col = 1; col <= REFERENSI_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }
  return sheet;
}

/**
 * Membaca opsi referensi untuk form booking publik
 * Mendukung penulisan kuota spesifik per slot di Sheet REFERENSI kolom JAM KHITAN:
 * Contoh: "05:00 WIB - 5", "05:00 WIB (5)", atau "05:00 WIB|5"
 * Slot tanpa angka kuota otomatis menggunakan kuota default global.
 */
function readReferensiOptions() {
  const sheet = getReferensiSheet();
  const lastRow = sheet.getLastRow();
  const result = {
    jamKhitan: [],
    jamKhitanQuota: {},
    metodeKhitan: [],
    ukuranCelana: [],
    obat: [],
    pekerjaan: [],
    hubunganKeluarga: []
  };

  if (lastRow < 2) return result;

  const maxCol = Math.min(sheet.getLastColumn(), 7);
  const values = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rawJam = String(row[0] || "").replace(/\u00A0/g, " ").trim();
    const metode = String(row[1] || "").replace(/\u00A0/g, " ").trim();
    const ukuran = String(row[2] || "").replace(/\u00A0/g, " ").trim();
    const obat = String(row[3] || "").replace(/\u00A0/g, " ").trim();
    const pekerjaan = String(row[4] || "").replace(/\u00A0/g, " ").trim();
    const hubungan = String(row[5] || "").replace(/\u00A0/g, " ").trim();

    if (rawJam) {
      let cleanJam = rawJam;
      let slotQuota = null;
      const parenMatch = cleanJam.match(/\s*\(\s*(\d{1,2})\s*\)$/);
      const sepMatch = !parenMatch ? cleanJam.match(/\s*[-–—|]\s*(\d{1,2})\s*$/) : null;
      const quotaMatch = parenMatch || sepMatch;

      if (quotaMatch) {
        slotQuota = parseInt(quotaMatch[1], 10);
        cleanJam = cleanJam.substring(0, quotaMatch.index).trim();
      }

      if (cleanJam && result.jamKhitan.indexOf(cleanJam) === -1) {
        result.jamKhitan.push(cleanJam);
        if (slotQuota !== null && !isNaN(slotQuota) && slotQuota > 0) {
          result.jamKhitanQuota[cleanJam] = slotQuota;
        }
      }
    }

    if (metode && result.metodeKhitan.indexOf(metode) === -1) result.metodeKhitan.push(metode);
    if (ukuran && result.ukuranCelana.indexOf(ukuran) === -1) result.ukuranCelana.push(ukuran);
    if (obat && result.obat.indexOf(obat) === -1) result.obat.push(obat);
    if (pekerjaan && result.pekerjaan.indexOf(pekerjaan) === -1) result.pekerjaan.push(pekerjaan);
    if (hubungan && result.hubunganKeluarga.indexOf(hubungan) === -1) result.hubunganKeluarga.push(hubungan);
  }

  return result;
}

/**
 * Mendapatkan atau membuat sheet KUNJUNGAN
 */
function getKunjunganSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(KUNJUNGAN_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(KUNJUNGAN_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(KUNJUNGAN_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, KUNJUNGAN_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    for (let col = 1; col <= KUNJUNGAN_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }
  return sheet;
}

/**
 * Menghasilkan kode REGISTER unik berurutan berdasarkan tahun:
 * Format: KD + YYMMDD + 4 digit nomor urut per tahun (contoh: KD2610140050)
 * Menjamin urutan terbaru bernilai leksikografis tertinggi (terbaru di atas)
 */
function generateKunjunganRegister_(sheet, targetDateStr) {
  const targetSheet = sheet || getKunjunganSheet();
  const lastRow = targetSheet.getLastRow();

  let yy = "";
  let mm = "";
  let dd = "";
  const normalizedDate = normalizeYmd_(targetDateStr);
  if (normalizedDate && /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    const parts = normalizedDate.split("-");
    yy = parts[0].slice(-2);
    mm = parts[1];
    dd = parts[2];
  } else {
    const now = new Date();
    yy = Utilities.formatDate(now, "Asia/Jakarta", "yy");
    mm = Utilities.formatDate(now, "Asia/Jakarta", "MM");
    dd = Utilities.formatDate(now, "Asia/Jakarta", "dd");
  }

  let maxSeq = 0;
  const existingRegisters = {};
  if (lastRow > 1) {
    const colAValues = targetSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const prefix = "KD" + yy;
    for (let i = 0; i < colAValues.length; i++) {
      const val = String(colAValues[i][0] || "").trim().toUpperCase();
      if (val) {
        existingRegisters[val] = true;
      }
      if (val.startsWith(prefix) && val.length >= 10) {
        const seqPart = parseInt(val.slice(8), 10);
        if (!isNaN(seqPart) && seqPart > maxSeq) {
          maxSeq = seqPart;
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = "KD" + yy + mm + dd + String(nextSeq).padStart(4, "0");
  while (existingRegisters[candidate]) {
    nextSeq++;
    candidate = "KD" + yy + mm + dd + String(nextSeq).padStart(4, "0");
  }
  return candidate;
}

/**
 * Mengonversi objek data kunjungan menjadi baris array 32 kolom
 * Memastikan teks Proper Case dan kalkulasi otomatis ZAKAT & TOTAL
 */
function kunjunganObjectToRow_(item, registerCode) {
  const reg = String(registerCode || item.register || "").trim().toUpperCase();
  const phone = cleanPhoneNumber(item.nomorHp || item.noHp || "");
  const phoneCell = phone ? ("'" + (phone.startsWith("0") ? phone : ("0" + phone))) : "";

  // Kalkulasi otomatis finansial
  const jumlahBayarNum = parseFloat(String(item.jumlahBayar || "0").replace(/[^\d.-]/g, "")) || 0;
  const operatorNum = parseFloat(String(item.operator || "0").replace(/[^\d.-]/g, "")) || 0;
  const bmhpNum = parseFloat(String(item.bmhpObat || "0").replace(/[^\d.-]/g, "")) || 0;
  const lemNum = parseFloat(String(item.lem || "0").replace(/[^\d.-]/g, "")) || 0;
  const feeNum = parseFloat(String(item.fee || "0").replace(/[^\d.-]/g, "")) || 0;
  const zakatNum = Math.round(jumlahBayarNum * 0.025);
  const totalNum = jumlahBayarNum - zakatNum - operatorNum - bmhpNum - lemNum - feeNum;

  return [
    reg,
    String(item.idBooking || item.id || "").trim().toUpperCase(),
    sanitizeSpreadsheetFormula(toProperCase_(item.namaAnanda || item.namaAnak || "")),
    sanitizeSpreadsheetFormula(toProperCase_(item.tempatLahir || "")),
    normalizeYmd_(item.tanggalLahir || item.tglLahir),
    sanitizeSpreadsheetFormula(item.beratBadan),
    normalizeYmd_(item.tanggalKhitan || item.tglKhitan),
    sanitizeSpreadsheetFormula(item.jamKhitan),
    sanitizeSpreadsheetFormula(item.metodeKhitan),
    sanitizeSpreadsheetFormula(item.ukuranCelana),
    sanitizeSpreadsheetFormula(item.obat),
    sanitizeSpreadsheetFormula(toProperCase_(item.namaPenanggungJawab || item.namaOrtu || "")),
    sanitizeSpreadsheetFormula(item.usiaPenanggungJawab),
    sanitizeSpreadsheetFormula(item.pekerjaan),
    sanitizeSpreadsheetFormula(item.hubunganKeluarga),
    phoneCell,
    sanitizeSpreadsheetFormula(item.alamat),
    sanitizeSpreadsheetFormula(item.provinsi),
    sanitizeSpreadsheetFormula(item.kabupaten),
    sanitizeSpreadsheetFormula(item.kecamatan),
    sanitizeSpreadsheetFormula(item.kelurahan),
    sanitizeSpreadsheetFormula(item.ukuranKlamp),
    sanitizeSpreadsheetFormula(item.statusBayar),
    String(jumlahBayarNum),
    String(zakatNum),
    sanitizeSpreadsheetFormula(item.operator || "0"),
    String(bmhpNum),
    String(lemNum),
    String(feeNum),
    String(totalNum),
    sanitizeSpreadsheetFormula(item.statusWa),
    sanitizeSpreadsheetFormula(item.keterangan)
  ];
}

/**
 * Menulis ulang seluruh baris data ke sheet KUNJUNGAN dengan urutan REGISTER DESC
 * Memastikan data terbaru SELALU berada di baris teratas (posisi fisik sheet)
 */
function writeKunjunganRowsToSheet_(sheet, rows) {
  const targetSheet = sheet || getKunjunganSheet();
  const lastRow = targetSheet.getLastRow();

  if (!rows || rows.length === 0) {
    if (lastRow > 1) {
      targetSheet.getRange(2, 1, lastRow - 1, KUNJUNGAN_HEADERS.length).clearContent();
    }
    return;
  }

  // Jika jumlah baris baru lebih sedikit dari baris lama, bersihkan sisa baris
  if (lastRow > 1 && rows.length < (lastRow - 1)) {
    targetSheet.getRange(2, 1, lastRow - 1, KUNJUNGAN_HEADERS.length).clearContent();
  }

  rows.sort(function(a, b) {
    const regA = String(a[0] || "").trim().toUpperCase();
    const regB = String(b[0] || "").trim().toUpperCase();
    return regB.localeCompare(regA);
  });

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (typeof rows[r][c] === "string" && rows[r][c].startsWith("=")) {
        rows[r][c] = "'" + rows[r][c];
      }
    }
  }

  targetSheet.getRange(2, 1, rows.length, KUNJUNGAN_HEADERS.length).setValues(rows);
}

/**
 * Membaca semua data dari sheet KUNJUNGAN dan mengurutkan REGISTER DESC
 * Dioptimalkan dengan CacheService untuk performa tinggi & hemat kuota read spreadsheet
 */
function readKunjunganFromSheet(sheet, forceRefresh) {
  if (!forceRefresh) {
    const cached = getChunkedCache(SERVER_CACHE_KEYS.KUNJUNGAN);
    if (cached && Array.isArray(cached)) {
      recordCacheTelemetry_("kunjungan", "hit");
      return cached;
    }
  }
  recordCacheTelemetry_("kunjungan", "miss");

  const targetSheet = sheet || getKunjunganSheet();
  const lastRow = targetSheet.getLastRow();
  const items = [];

  if (lastRow <= 1) {
    putChunkedCache(SERVER_CACHE_KEYS.KUNJUNGAN, [], SERVER_CACHE_DEFAULT_TTL);
    return items;
  }

  const values = targetSheet.getRange(2, 1, lastRow - 1, KUNJUNGAN_HEADERS.length).getValues();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const reg = String(row[0] || "").trim().toUpperCase();
    if (!reg) continue;

    items.push({
      register: reg,
      idBooking: String(row[1] || "").trim().toUpperCase(),
      namaAnanda: String(row[2] || "").trim(),
      tempatLahir: String(row[3] || "").trim(),
      tanggalLahir: normalizeYmd_(row[4]),
      beratBadan: String(row[5] || "").trim(),
      tanggalKhitan: normalizeYmd_(row[6]),
      jamKhitan: String(row[7] || "").trim(),
      metodeKhitan: String(row[8] || "").trim(),
      ukuranCelana: String(row[9] || "").trim(),
      obat: String(row[10] || "").trim(),
      namaPenanggungJawab: String(row[11] || "").trim(),
      usiaPenanggungJawab: String(row[12] || "").trim(),
      pekerjaan: String(row[13] || "").trim(),
      hubunganKeluarga: String(row[14] || "").trim(),
      nomorHp: formatDisplayPhone(row[15]),
      alamat: String(row[16] || "").trim(),
      provinsi: String(row[17] || "").trim(),
      kabupaten: String(row[18] || "").trim(),
      kecamatan: String(row[19] || "").trim(),
      kelurahan: String(row[20] || "").trim(),
      ukuranKlamp: String(row[21] || "").trim(),
      statusBayar: String(row[22] || "").trim(),
      jumlahBayar: String(row[23] || "0").trim(),
      zakat: String(row[24] || "0").trim(),
      operator: String(row[25] || "").trim(),
      bmhpObat: String(row[26] || "0").trim(),
      lem: String(row[27] || "0").trim(),
      fee: String(row[28] || "0").trim(),
      total: String(row[29] || "0").trim(),
      statusWa: String(row[30] || "").trim(),
      keterangan: String(row[31] || "").trim()
    });
  }

  items.sort(function(a, b) {
    return b.register.localeCompare(a.register);
  });

  putChunkedCache(SERVER_CACHE_KEYS.KUNJUNGAN, items, SERVER_CACHE_DEFAULT_TTL);
  return items;
}

/**
 * Menghitung selisih tahun antara Tanggal Khitan dan Tanggal Lahir Penanggung Jawab
 * Format output: "N Tahun"
 */
function calculateUsiaTahun_(tanggalKhitan, tanggalLahirPj) {
  const khitanStr = normalizeYmd_(tanggalKhitan);
  const lahirStr = normalizeYmd_(tanggalLahirPj);
  if (!khitanStr || !lahirStr) return "";

  const khitanDate = new Date(khitanStr + "T00:00:00+07:00");
  const lahirDate = new Date(lahirStr + "T00:00:00+07:00");
  if (isNaN(khitanDate.getTime()) || isNaN(lahirDate.getTime())) return "";

  let ageYears = khitanDate.getFullYear() - lahirDate.getFullYear();
  const mDiff = khitanDate.getMonth() - lahirDate.getMonth();
  if (mDiff < 0 || (mDiff === 0 && khitanDate.getDate() < lahirDate.getDate())) {
    ageYears--;
  }

  if (ageYears < 0) return "";
  return ageYears + " Tahun";
}

/**
 * Mendapatkan atau membuat sheet JUMAT BERKAH
 */
function getJumatBerkahSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(JUMAT_BERKAH_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(JUMAT_BERKAH_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(JUMAT_BERKAH_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, JUMAT_BERKAH_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#008080");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    for (let col = 1; col <= JUMAT_BERKAH_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }
  return sheet;
}

/**
 * Menghasilkan kode REGISTER unik berurutan berdasarkan tahun untuk Jumat Berkah:
 * Format: KD + YYMMDD + 4 digit nomor urut per tahun berjalan (contoh: KD2601010001)
 */
function generateJumatBerkahRegister_(sheet, targetDateStr) {
  const targetSheet = sheet || getJumatBerkahSheet();
  const lastRow = targetSheet.getLastRow();

  let yy = "";
  let mm = "";
  let dd = "";
  const normalizedDate = normalizeYmd_(targetDateStr);
  if (normalizedDate && /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    const parts = normalizedDate.split("-");
    yy = parts[0].slice(-2);
    mm = parts[1];
    dd = parts[2];
  } else {
    const now = new Date();
    yy = Utilities.formatDate(now, "Asia/Jakarta", "yy");
    mm = Utilities.formatDate(now, "Asia/Jakarta", "MM");
    dd = Utilities.formatDate(now, "Asia/Jakarta", "dd");
  }

  let maxSeq = 0;
  if (lastRow > 1) {
    const colAValues = targetSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const prefix = "KD" + yy;
    for (let i = 0; i < colAValues.length; i++) {
      const val = String(colAValues[i][0] || "").trim().toUpperCase();
      if (val.startsWith(prefix) && val.length >= 10) {
        const seqPart = parseInt(val.slice(8), 10);
        if (!isNaN(seqPart) && seqPart > maxSeq) {
          maxSeq = seqPart;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(4, "0");
  return "KD" + yy + mm + dd + seqStr;
}

/**
 * Mengonversi objek data Jumat Berkah menjadi baris array 17 kolom
 */
function jumatBerkahObjectToRow_(item, registerCode) {
  const reg = String(registerCode || item.register || "").trim().toUpperCase();
  const rawId = String(item.nomorIdentitas || item.noIdentitas || item.nik || "").trim();
  const identitasCell = rawId ? ("'" + rawId.replace(/^'+/, "")) : "";

  const tglKhitan = normalizeYmd_(item.tanggalKhitan || item.tglKhitan);
  const tglLahirPj = normalizeYmd_(item.tanggalLahirPenanggungJawab || item.tanggalLahirPj || item.tglLahirPj);
  let usiaPj = String(item.usiaPenanggungJawab || "").trim();
  if (tglKhitan && tglLahirPj) {
    const calculated = calculateUsiaTahun_(tglKhitan, tglLahirPj);
    if (calculated) usiaPj = calculated;
  }

  return [
    reg,
    sanitizeSpreadsheetFormula(toProperCase_(item.namaAnanda || item.namaAnak || "")),
    sanitizeSpreadsheetFormula(toProperCase_(item.tempatLahir || "")),
    normalizeYmd_(item.tanggalLahir || item.tglLahir),
    tglKhitan,
    sanitizeSpreadsheetFormula(toProperCase_(item.namaPenanggungJawab || item.namaOrtu || "")),
    sanitizeSpreadsheetFormula(toProperCase_(item.tempatLahirPenanggungJawab || item.tempatLahirPj || "")),
    tglLahirPj,
    sanitizeSpreadsheetFormula(usiaPj),
    sanitizeSpreadsheetFormula(item.pekerjaan),
    sanitizeSpreadsheetFormula(item.hubunganKeluarga),
    identitasCell,
    sanitizeSpreadsheetFormula(item.alamat),
    sanitizeSpreadsheetFormula(item.provinsi),
    sanitizeSpreadsheetFormula(item.kabupaten),
    sanitizeSpreadsheetFormula(item.kecamatan),
    sanitizeSpreadsheetFormula(item.kelurahan)
  ];
}

/**
 * Mengonversi baris sheet JUMAT BERKAH menjadi objek JSON
 */
function rowToJumatBerkahObject_(row) {
  const rawId = String(row[11] || "").trim();
  const cleanId = rawId.startsWith("'") ? rawId.slice(1) : rawId;
  return {
    register: String(row[0] || "").trim().toUpperCase(),
    namaAnanda: String(row[1] || "").trim(),
    tempatLahir: String(row[2] || "").trim(),
    tanggalLahir: normalizeYmd_(row[3]),
    tanggalKhitan: normalizeYmd_(row[4]),
    namaPenanggungJawab: String(row[5] || "").trim(),
    tempatLahirPenanggungJawab: String(row[6] || "").trim(),
    tanggalLahirPenanggungJawab: normalizeYmd_(row[7]),
    usiaPenanggungJawab: String(row[8] || "").trim(),
    pekerjaan: String(row[9] || "").trim(),
    hubunganKeluarga: String(row[10] || "").trim(),
    nomorIdentitas: cleanId,
    alamat: String(row[12] || "").trim(),
    provinsi: String(row[13] || "").trim(),
    kabupaten: String(row[14] || "").trim(),
    kecamatan: String(row[15] || "").trim(),
    kelurahan: String(row[16] || "").trim()
  };
}

/**
 * Menulis ulang seluruh baris data ke sheet JUMAT BERKAH dengan urutan REGISTER DESC
 */
function writeJumatBerkahRowsToSheet_(sheet, rows) {
  const targetSheet = sheet || getJumatBerkahSheet();
  const lastRow = targetSheet.getLastRow();

  if (!rows || rows.length === 0) {
    if (lastRow > 1) {
      targetSheet.getRange(2, 1, lastRow - 1, JUMAT_BERKAH_HEADERS.length).clearContent();
    }
    return;
  }

  // Jika jumlah baris baru lebih sedikit dari baris lama, bersihkan sisa baris
  if (lastRow > 1 && rows.length < (lastRow - 1)) {
    targetSheet.getRange(2, 1, lastRow - 1, JUMAT_BERKAH_HEADERS.length).clearContent();
  }

  rows.sort(function(a, b) {
    const regA = String(a[0] || "").trim().toUpperCase();
    const regB = String(b[0] || "").trim().toUpperCase();
    return regB.localeCompare(regA);
  });

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (typeof rows[r][c] === "string" && rows[r][c].startsWith("=")) {
        rows[r][c] = "'" + rows[r][c];
      }
    }
  }

  targetSheet.getRange(2, 1, rows.length, JUMAT_BERKAH_HEADERS.length).setValues(rows);
}

/**
 * Membaca semua data dari sheet JUMAT BERKAH dan mengurutkan REGISTER DESC
 */
function readJumatBerkahFromSheet(sheet, forceRefresh) {
  if (!forceRefresh) {
    const cached = getChunkedCache(SERVER_CACHE_KEYS.JUMAT_BERKAH);
    if (cached && Array.isArray(cached)) {
      recordCacheTelemetry_("jumatberkah", "hit");
      return cached;
    }
  }
  recordCacheTelemetry_("jumatberkah", "miss");

  const targetSheet = sheet || getJumatBerkahSheet();
  const lastRow = targetSheet.getLastRow();
  const items = [];

  if (lastRow <= 1) {
    putChunkedCache(SERVER_CACHE_KEYS.JUMAT_BERKAH, [], SERVER_CACHE_DEFAULT_TTL);
    return items;
  }

  const values = targetSheet.getRange(2, 1, lastRow - 1, JUMAT_BERKAH_HEADERS.length).getValues();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const reg = String(row[0] || "").trim().toUpperCase();
    if (!reg) continue;
    items.push(rowToJumatBerkahObject_(row));
  }

  items.sort(function(a, b) {
    return b.register.localeCompare(a.register);
  });

  putChunkedCache(SERVER_CACHE_KEYS.JUMAT_BERKAH, items, SERVER_CACHE_DEFAULT_TTL);
  return items;
}

/**
 * Mengambil berkas template DOCX Surat Pernyataan Tidak Merokok
 * Mengembalikan data biner Blob tanpa memerlukan DocumentApp atau izin https://www.googleapis.com/auth/documents
 */
function fetchSuratMerokokTemplateBlob_() {
  const bytes = Utilities.base64Decode(TEMPLATE_SURAT_MEROKOK_BASE64);
  return Utilities.newBlob(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Surat_Pernyataan_Template.docx");
}

/**
 * Membaca semua data dari sheet BOOKING
 * Dioptimalkan dengan CacheService untuk performa tinggi & hemat kuota read spreadsheet
 */
function readBookingsFromSheet(sheet, forceRefresh) {
  if (!forceRefresh) {
    const cached = getChunkedCache(SERVER_CACHE_KEYS.BOOKINGS);
    if (cached && Array.isArray(cached)) {
      recordCacheTelemetry_("bookings", "hit");
      return cached;
    }
  }
  recordCacheTelemetry_("bookings", "miss");

  const targetSheet = sheet || getSheet();
  const lastRow = targetSheet.getLastRow();
  if (lastRow <= 1) {
    putChunkedCache(SERVER_CACHE_KEYS.BOOKINGS, [], SERVER_CACHE_DEFAULT_TTL);
    return [];
  }

  const values = targetSheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const bookings = values.map(function(row) {
    let tglLahirStr = normalizeYmd_(row[3]);
    let tglKhitanStr = normalizeYmd_(row[5]);
    let timestampStr = row[20];
    if (timestampStr instanceof Date) {
      timestampStr = Utilities.formatDate(timestampStr, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    }
    return {
      id: String(row[0] || ""),
      timestamp: String(timestampStr || ""),
      namaAnak: String(row[1] || ""),
      namaOrtu: String(row[10] || ""),
      noHp: formatDisplayPhone(row[14]),
      tglKhitan: String(tglKhitanStr || ""),
      status: String(row[21] || "Pending"),
      idBooking: String(row[0] || ""),
      namaAnanda: String(row[1] || ""),
      tempatLahir: String(row[2] || ""),
      tanggalLahir: String(tglLahirStr || ""),
      beratBadan: String(row[4] || ""),
      tanggalKhitan: String(tglKhitanStr || ""),
      jamKhitan: String(row[6] || ""),
      metodeKhitan: String(row[7] || ""),
      ukuranCelana: String(row[8] || ""),
      obat: String(row[9] || ""),
      namaPenanggungJawab: String(row[10] || ""),
      usiaPenanggungJawab: String(row[11] || ""),
      pekerjaan: String(row[12] || ""),
      hubunganKeluarga: String(row[13] || ""),
      nomorHp: formatDisplayPhone(row[14]),
      alamat: String(row[15] || ""),
      provinsi: String(row[16] || ""),
      kabupaten: String(row[17] || ""),
      kecamatan: String(row[18] || ""),
      kelurahan: String(row[19] || "")
    };
  });

  bookings.reverse();
  putChunkedCache(SERVER_CACHE_KEYS.BOOKINGS, bookings, SERVER_CACHE_DEFAULT_TTL);
  return bookings;
}

/**
 * Menghitung rekap kuota jam khitan per slot pada tanggal tertentu
 * Mengabaikan booking berstatus "batal" / "dibatalkan"
 */
function getKuotaJamSummary_(targetDate) {
  const normDate = normalizeYmd_(targetDate);
  const settings = readSettings();
  const defaultKuota = (settings && typeof settings.kuota_jam === "number") ? settings.kuota_jam : DEFAULT_KUOTA_JAM;

  const ref = readReferensiOptions();
  const allSlots = (ref && Array.isArray(ref.jamKhitan)) ? ref.jamKhitan : [];
  const refQuotas = (ref && ref.jamKhitanQuota) || {};

  const slotsMap = {};
  for (let s = 0; s < allSlots.length; s++) {
    const slotName = allSlots[s];
    const slotQuota = (typeof refQuotas[slotName] === "number" && refQuotas[slotName] > 0)
      ? refQuotas[slotName]
      : defaultKuota;
    slotsMap[slotName] = {
      terpakai: 0,
      kuota: slotQuota,
      sisa: slotQuota,
      penuh: false
    };
  }

  if (!normDate) {
    return {
      tanggal: "",
      kuotaPerSlot: defaultKuota,
      slots: slotsMap,
      totalSlots: allSlots.length,
      semuaPenuh: false
    };
  }

  const allBookings = readBookingsFromSheet();
  for (let i = 0; i < allBookings.length; i++) {
    const b = allBookings[i];
    const bTgl = normalizeYmd_(b.tanggalKhitan || b.tglKhitan);
    if (bTgl !== normDate) continue;

    const bStatus = String(b.status || "").trim().toLowerCase();
    if (bStatus === "batal" || bStatus === "dibatalkan") continue;

    const bJam = String(b.jamKhitan || "").trim();
    if (!bJam) continue;

    if (!slotsMap[bJam]) {
      const slotQuota = (typeof refQuotas[bJam] === "number" && refQuotas[bJam] > 0)
        ? refQuotas[bJam]
        : defaultKuota;
      slotsMap[bJam] = {
        terpakai: 0,
        kuota: slotQuota,
        sisa: slotQuota,
        penuh: false
      };
    }
    slotsMap[bJam].terpakai += 1;
  }

  let fullCount = 0;
  const slotKeys = Object.keys(slotsMap);
  for (let k = 0; k < slotKeys.length; k++) {
    const key = slotKeys[k];
    const item = slotsMap[key];
    item.sisa = Math.max(0, item.kuota - item.terpakai);
    item.penuh = item.terpakai >= item.kuota;
    if (item.penuh) fullCount++;
  }

  const total = slotKeys.length;
  const semuaPenuh = total > 0 && fullCount >= total;

  return {
    tanggal: normDate,
    kuotaPerSlot: defaultKuota,
    slots: slotsMap,
    totalSlots: total,
    semuaPenuh: semuaPenuh
  };
}

/**
 * Endpoint Terpadu Sinkronisasi Admin (Single-Flight Sync Engine)
 * Mengambil seluruh data sheet dalam 1 kali round-trip cepat dengan dukungan:
 * - Memoisasi spreadsheet per-execution cycle (1x buka untuk semua sheet)
 * - Delta sync berdasar hash versi dataset (mengirim hanya dataset yang berubah)
 * - Telemetri cache hit/miss per dataset untuk diagnostik efektivitas cache
 */
function handleSyncAdminData(params) {
  const token = params.token || (params.data && params.data.token);
  if (!validateSessionToken(token)) {
    return unauthorizedResponse();
  }

  const forceRefresh = String(params.forceRefresh || "").toLowerCase() === "true" ||
                       (params.data && params.data.forceRefresh === true);

  resetCacheTelemetry_();
  const startTime = Date.now();
  const ss = getSpreadsheet_();

  // Parsing parameter versions klien (jika dikirim untuk delta sync)
  var clientVersions = {};
  var rawVersions = params.versions || (params.data && params.data.versions);
  if (rawVersions && !forceRefresh) {
    if (typeof rawVersions === "string") {
      try {
        clientVersions = JSON.parse(rawVersions);
      } catch (e) {
        clientVersions = {};
      }
    } else if (typeof rawVersions === "object") {
      clientVersions = rawVersions;
    }
  }

  // Fast-Path Delta Sync: Menggunakan cache registry versi dataset untuk melewati pembacaan & parsing JSON data besar
  const registry = (!forceRefresh) ? getStoredDatasetVersions_() : {};

  // 1. Bookings
  let bookings = null;
  let bVer = (registry.bookings && registry.bookings.version) ? registry.bookings.version : null;
  let bCount = (registry.bookings && typeof registry.bookings.count === "number") ? registry.bookings.count : 0;
  let bSizeBytes = (registry.bookings && typeof registry.bookings.sizeBytes === "number") ? registry.bookings.sizeBytes : 0;
  if (forceRefresh || !bVer || clientVersions.bookings !== bVer) {
    bookings = readBookingsFromSheet(ss.getSheetByName(SHEET_NAME), forceRefresh);
    bVer = computeDatasetVersion_(bookings);
    bCount = bookings.length;
    bSizeBytes = JSON.stringify(bookings).length;
    updateDatasetVersionMeta_("bookings", bVer, bSizeBytes, bCount);
  } else {
    recordCacheTelemetry_("bookings", "hit");
    bookings = { length: bCount };
  }

  // 2. Kunjungan
  let kunjungan = null;
  let kVer = (registry.kunjungan && registry.kunjungan.version) ? registry.kunjungan.version : null;
  let kCount = (registry.kunjungan && typeof registry.kunjungan.count === "number") ? registry.kunjungan.count : 0;
  let kSizeBytes = (registry.kunjungan && typeof registry.kunjungan.sizeBytes === "number") ? registry.kunjungan.sizeBytes : 0;
  if (forceRefresh || !kVer || clientVersions.kunjungan !== kVer) {
    kunjungan = readKunjunganFromSheet(ss.getSheetByName(KUNJUNGAN_SHEET_NAME), forceRefresh);
    kVer = computeDatasetVersion_(kunjungan);
    kCount = kunjungan.length;
    kSizeBytes = JSON.stringify(kunjungan).length;
    updateDatasetVersionMeta_("kunjungan", kVer, kSizeBytes, kCount);
  } else {
    recordCacheTelemetry_("kunjungan", "hit");
    kunjungan = { length: kCount };
  }

  // 2b. Jumat Berkah
  let jumatBerkah = null;
  let jVer = (registry.jumatberkah && registry.jumatberkah.version) ? registry.jumatberkah.version : null;
  let jCount = (registry.jumatberkah && typeof registry.jumatberkah.count === "number") ? registry.jumatberkah.count : 0;
  let jSizeBytes = (registry.jumatberkah && typeof registry.jumatberkah.sizeBytes === "number") ? registry.jumatberkah.sizeBytes : 0;
  const clientJVer = clientVersions.jumatberkah || clientVersions.jumatBerkah;
  if (forceRefresh || !jVer || clientJVer !== jVer) {
    jumatBerkah = readJumatBerkahFromSheet(ss.getSheetByName(JUMAT_BERKAH_SHEET_NAME), forceRefresh);
    jVer = computeDatasetVersion_(jumatBerkah);
    jCount = jumatBerkah.length;
    jSizeBytes = JSON.stringify(jumatBerkah).length;
    updateDatasetVersionMeta_("jumatberkah", jVer, jSizeBytes, jCount);
  } else {
    recordCacheTelemetry_("jumatberkah", "hit");
    jumatBerkah = { length: jCount };
  }

  // 3. Users
  let usersResult = null;
  let uVer = (registry.users && registry.users.version) ? registry.users.version : null;
  let uCount = (registry.users && typeof registry.users.count === "number") ? registry.users.count : 0;
  let uSizeBytes = (registry.users && typeof registry.users.sizeBytes === "number") ? registry.users.sizeBytes : 0;
  if (forceRefresh || !uVer || clientVersions.users !== uVer) {
    usersResult = readUsersFromSheet(ss.getSheetByName(USERS_SHEET_NAME), forceRefresh);
    uVer = computeDatasetVersion_(usersResult.users || []);
    uCount = usersResult.users ? usersResult.users.length : 0;
    uSizeBytes = JSON.stringify(usersResult).length;
    updateDatasetVersionMeta_("users", uVer, uSizeBytes, uCount);
  } else {
    recordCacheTelemetry_("users", "hit");
    usersResult = { users: { length: uCount }, layout: "baru" };
  }

  // 4. Settings
  let settings = null;
  let sVer = (registry.settings && registry.settings.version) ? registry.settings.version : null;
  let sSizeBytes = (registry.settings && typeof registry.settings.sizeBytes === "number") ? registry.settings.sizeBytes : 0;
  if (forceRefresh || !sVer || clientVersions.settings !== sVer) {
    settings = readSettings(forceRefresh);
    sVer = computeDatasetVersion_(settings);
    sSizeBytes = JSON.stringify(settings).length;
    updateDatasetVersionMeta_("settings", sVer, sSizeBytes, 1);
  } else {
    recordCacheTelemetry_("settings", "hit");
  }

  // 5. Galeri
  let galeri = null;
  let gVer = (registry.galeri && registry.galeri.version) ? registry.galeri.version : null;
  let gCount = (registry.galeri && typeof registry.galeri.count === "number") ? registry.galeri.count : 0;
  let gSizeBytes = (registry.galeri && typeof registry.galeri.sizeBytes === "number") ? registry.galeri.sizeBytes : 0;
  if (forceRefresh || !gVer || clientVersions.galeri !== gVer) {
    galeri = readGaleriFromSheet(forceRefresh);
    gVer = computeDatasetVersion_(galeri);
    gCount = galeri.length;
    gSizeBytes = JSON.stringify(galeri).length;
    updateDatasetVersionMeta_("galeri", gVer, gSizeBytes, gCount);
  } else {
    recordCacheTelemetry_("galeri", "hit");
    galeri = { length: gCount };
  }

  // 6. Saran
  let saran = null;
  let rVer = (registry.saran && registry.saran.version) ? registry.saran.version : null;
  let rCount = (registry.saran && typeof registry.saran.count === "number") ? registry.saran.count : 0;
  let rSizeBytes = (registry.saran && typeof registry.saran.sizeBytes === "number") ? registry.saran.sizeBytes : 0;
  if (forceRefresh || !rVer || clientVersions.saran !== rVer) {
    saran = readSaranFromSheet(forceRefresh);
    rVer = computeDatasetVersion_(saran);
    rCount = saran.length;
    rSizeBytes = JSON.stringify(saran).length;
    updateDatasetVersionMeta_("saran", rVer, rSizeBytes, rCount);
  } else {
    recordCacheTelemetry_("saran", "hit");
    saran = { length: rCount };
  }

  const versions = {
    bookings: bVer,
    kunjungan: kVer,
    jumatberkah: jVer,
    jumatBerkah: jVer,
    users: uVer,
    settings: sVer,
    galeri: gVer,
    saran: rVer
  };

  const versionsMeta = {
    bookings: { version: bVer, sizeBytes: bSizeBytes, count: bCount },
    kunjungan: { version: kVer, sizeBytes: kSizeBytes, count: kCount },
    jumatberkah: { version: jVer, sizeBytes: jSizeBytes, count: jCount },
    users: { version: uVer, sizeBytes: uSizeBytes, count: uCount },
    settings: { version: sVer, sizeBytes: sSizeBytes, count: 1 },
    galeri: { version: gVer, sizeBytes: gSizeBytes, count: gCount },
    saran: { version: rVer, sizeBytes: rSizeBytes, count: rCount }
  };

  // Evaluasi unchanged flag per dataset
  const unchanged = {
    bookings: Boolean(!forceRefresh && clientVersions.bookings && clientVersions.bookings === bVer),
    kunjungan: Boolean(!forceRefresh && clientVersions.kunjungan && clientVersions.kunjungan === kVer),
    jumatberkah: Boolean(!forceRefresh && (clientVersions.jumatberkah === jVer || clientVersions.jumatBerkah === jVer)),
    jumatBerkah: Boolean(!forceRefresh && (clientVersions.jumatberkah === jVer || clientVersions.jumatBerkah === jVer)),
    users: Boolean(!forceRefresh && clientVersions.users && clientVersions.users === uVer),
    settings: Boolean(!forceRefresh && clientVersions.settings && clientVersions.settings === sVer),
    galeri: Boolean(!forceRefresh && clientVersions.galeri && clientVersions.galeri === gVer),
    saran: Boolean(!forceRefresh && clientVersions.saran && clientVersions.saran === rVer)
  };

  const responseData = {};
  let unchangedCount = 0;
  let changedCount = 0;

  if (unchanged.bookings) {
    unchangedCount++;
  } else {
    changedCount++;
    responseData.bookings = bookings;
  }

  if (unchanged.kunjungan) {
    unchangedCount++;
  } else {
    changedCount++;
    responseData.kunjungan = kunjungan;
  }

  if (unchanged.jumatberkah) {
    unchangedCount++;
  } else {
    changedCount++;
    responseData.jumatBerkah = jumatBerkah;
  }

  if (unchanged.users) {
    unchangedCount++;
  } else {
    changedCount++;
    responseData.users = usersResult.users || [];
    responseData.userLayout = usersResult.layout || "baru";
  }

  if (unchanged.settings) {
    unchangedCount++;
  } else {
    changedCount++;
    responseData.settings = settings;
  }

  if (unchanged.galeri) {
    unchangedCount++;
  } else {
    changedCount++;
    responseData.galeri = galeri;
  }

  if (unchanged.saran) {
    unchangedCount++;
  } else {
    changedCount++;
    responseData.saran = saran;
  }

  const durationMs = Date.now() - startTime;
  const now = new Date();
  const serverTime = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss") + " WIB";

  return createJsonResponse({
    status: "success",
    timestamp: now.getTime(),
    serverTime: serverTime,
    durationMs: durationMs,
    delta: Object.keys(clientVersions).length > 0 && !forceRefresh,
    unchanged: unchanged,
    versions: versions,
    versionsMeta: versionsMeta,
    telemetry: {
      cache: CACHE_TELEMETRY_ || {},
      durationMs: durationMs,
      unchangedCount: unchangedCount,
      changedCount: changedCount
    },
    counts: {
      bookings: bCount,
      kunjungan: kCount,
      jumatberkah: jCount,
      users: uCount,
      galeri: gCount,
      saran: rCount
    },
    data: responseData
  });
}

/**
 * Menghasilkan ID Booking unik 7 karakter alfanumerik (huruf kapital dan angka)
 */
function generateUniqueBookingId(sheet) {
  const targetSheet = sheet || getSheet();
  const lastRow = targetSheet.getLastRow();
  const existingIds = {};
  if (lastRow > 1) {
    const colAValues = targetSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < colAValues.length; i++) {
      const val = String(colAValues[i][0] || "").trim().toUpperCase();
      if (val) existingIds[val] = true;
    }
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 1000; attempt++) {
    let id = "";
    for (let c = 0; c < 7; c++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!existingIds[id]) {
      return id;
    }
  }
  const ts = String(new Date().getTime());
  return ("KD" + ts.slice(-5)).toUpperCase();
}

/**
 * Format helper untuk response JSON (AGENTS.md §4)
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Normalisasi nomor HP untuk pencarian yang akurat
 * Menghilangkan prefiks +62 / 62 / 0 agar pencarian selalu cocok
 * meskipun Google Sheets menyimpan sebagai angka murni.
 */
function cleanPhoneNumber(phone) {
  if (!phone) return "";
  let digits = phone.toString().replace(/\D/g, "");
  if (digits.startsWith("62")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Format nomor HP standar untuk tampilan (08xxx)
 */
function formatDisplayPhone(phone) {
  if (!phone) return "";
  const cleaned = cleanPhoneNumber(phone);
  return cleaned ? ("0" + cleaned) : phone.toString();
}

/**
 * Sensor nomor HP untuk endpoint publik sesuai privacy rule (0812****1234)
 */
function maskPhoneNumber(phone) {
  const display = formatDisplayPhone(phone);
  if (!display) return "-";
  if (display.length <= 6) return display;
  const start = display.slice(0, 4);
  const end = display.slice(-4);
  return start + "****" + end;
}

/**
 * Format tanggal ke waktu lokal Jakarta (WIB)
 */
function getJakartaTimestamp() {
  return Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
}

/**
 * Mengonversi teks menjadi format Proper Case (Awal Huruf Besar Setiap Kata)
 */
function toProperCase_(str) {
  const s = String(str || "").trim();
  if (!s) return "";
  return s.toLowerCase().replace(/(^|[\s\-\/'.])([a-z])/g, function(match, prefix, letter) {
    return prefix + letter.toUpperCase();
  });
}

/**
 * Normalisasi format tanggal menjadi yyyy-MM-dd tanpa pergeseran zona waktu
 * Menangani objek Date (format Asia/Jakarta), ISO datetime, dan format dd/mm/yyyy
 */
function normalizeYmd_(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return Utilities.formatDate(value, "Asia/Jakarta", "yyyy-MM-dd");
  }
  const s = String(value).trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + "-" + m[2] + "-" + m[3];
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const pad = function(n) { return String(n).length < 2 ? "0" + n : String(n); };
    return m[3] + "-" + pad(m[2]) + "-" + pad(m[1]);
  }
  return s;
}

/**
 * Verifikasi kecocokan password:
 * Mendukung perbandingan teks langsung (plain-text) dan hash SHA-256 (64 hex characters).
 */
function verifyPassword(inputPassword, storedPassword) {
  if (storedPassword === null || storedPassword === undefined || inputPassword === null || inputPassword === undefined) {
    return false;
  }
  const cleanInput = String(inputPassword).trim();
  const cleanStored = String(storedPassword).trim().replace(/^['"]|['"]$/g, '');

  if (!cleanStored || !cleanInput) return false;

  // 1. Direct match (plain-text)
  if (cleanStored === cleanInput) {
    return true;
  }

  // 2. SHA-256 match (jika password tersimpan di-hash 64 karakter heksadesimal)
  if (/^[a-f0-9]{64}$/i.test(cleanStored)) {
    try {
      const rawDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, cleanInput, Utilities.Charset.UTF_8);
      let hexDigest = "";
      for (let i = 0; i < rawDigest.length; i++) {
        let b = rawDigest[i];
        if (b < 0) b += 256;
        let hex = b.toString(16);
        if (hex.length === 1) hex = "0" + hex;
        hexDigest += hex;
      }
      if (hexDigest.toLowerCase() === cleanStored.toLowerCase()) {
        return true;
      }
    } catch (err) {
      Logger.log("SHA-256 error: " + err.toString());
    }
  }

  return false;
}

/**
 * Helper verifikasi kredensial login
 * Mendukung 2 format layout sheet USERS:
 * - Layout Baru: Kolom A=NO, B=USERNAME, C=PASSWORD, D=HAK AKSES, E=OTORISASI
 * - Layout Legacy: Kolom A=Username, B=Password, C=Nama, D=Role
 */
function authenticateUser(username, password) {
  if (!username || !password) {
    return { success: false, message: "Username dan password wajib diisi." };
  }

  const cleanUsername = String(username).trim();
  const cleanPassword = String(password).trim();

  const usersSheet = getUsersSheet();
  const lastRow = usersSheet.getLastRow();
  const lastCol = Math.max(usersSheet.getLastColumn(), 5);
  let userValues = [];
  
  if (lastRow > 1) {
    userValues = usersSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  }

  let adminFoundInSheet = false;
  let operatorFoundInSheet = false;

  for (let i = 0; i < userValues.length; i++) {
    const row = userValues[i];
    const col0 = String(row[0] || "").trim();
    const col1 = String(row[1] || "").trim();
    const col2 = row[2];
    const col3 = String(row[3] || "").trim();

    // Pantau keberadaan akun default di sheet (di kolom 0 atau kolom 1)
    if (col0.toLowerCase() === "admin" || col1.toLowerCase() === "admin") {
      adminFoundInSheet = true;
    }
    if (col0.toLowerCase() === "operator" || col1.toLowerCase() === "operator") {
      operatorFoundInSheet = true;
    }

    // 1. Cek Layout Baru (Kolom B/index 1 adalah USERNAME, Kolom C/index 2 adalah PASSWORD)
    if (col1.toLowerCase() === cleanUsername.toLowerCase()) {
      if (verifyPassword(cleanPassword, col2)) {
        return {
          success: true,
          user: {
            username: col1,
            nama: col1,
            role: col3 || "Admin",
            otorisasi: String(row[4] || "").trim(),
            loginTime: getJakartaTimestamp()
          }
        };
      }
    }

    // 2. Cek Layout Legacy (Kolom A/index 0 adalah Username, Kolom B/index 1 adalah Password)
    if (col0.toLowerCase() === cleanUsername.toLowerCase()) {
      if (verifyPassword(cleanPassword, col1)) {
        return {
          success: true,
          user: {
            username: col0,
            nama: String(row[2] || "").trim() || col0,
            role: col3 || "Admin",
            otorisasi: "",
            loginTime: getJakartaTimestamp()
          }
        };
      }
    }
  }

  return { success: false, message: "Username atau password salah." };
}

// ================= FORMULA INJECTION & INPUT SANITIZATION =================
/**
 * Sanitasi string input agar kebal terhadap Formula Injection (CSV / Spreadsheet Injection)
 * Jika string diawali dengan karakter formula Google Sheets (=, +, -, @), beri prefix tanda petik tunggal (')
 */
function sanitizeSpreadsheetFormula(val) {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (!str) return "";
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

// ================= BRUTE FORCE & RATE LIMITING =================
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME_SECONDS = 900; // 15 Menit

function checkLoginRateLimit(username) {
  if (!username) return { allowed: true, attempts: 0 };
  const cache = CacheService.getScriptCache();
  const key = "bf_login_" + String(username).trim().toLowerCase();
  const raw = cache.get(key);
  if (!raw) return { allowed: true, attempts: 0 };
  const attempts = parseInt(raw, 10) || 0;
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, attempts: attempts };
  }
  return { allowed: true, attempts: attempts };
}

function recordFailedLoginAttempt(username) {
  if (!username) return;
  const cache = CacheService.getScriptCache();
  const key = "bf_login_" + String(username).trim().toLowerCase();
  const raw = cache.get(key);
  const attempts = (parseInt(raw, 10) || 0) + 1;
  cache.put(key, String(attempts), LOCKOUT_TIME_SECONDS);
}

function clearLoginAttempts(username) {
  if (!username) return;
  const cache = CacheService.getScriptCache();
  const key = "bf_login_" + String(username).trim().toLowerCase();
  cache.remove(key);
}

// ================= SESSION TOKEN & AUTH SERVICE =================
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 Jam

function issueSessionToken(username) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(5000);
  try {
    const props = PropertiesService.getScriptProperties();
    let sessions = {};
    try {
      sessions = JSON.parse(props.getProperty("ADMIN_SESSIONS") || "{}");
    } catch (e) {
      sessions = {};
    }
    const token = Utilities.getUuid();
    const now = Date.now();
    // Bersihkan sesi kadaluarsa
    const cleaned = {};
    const keys = Object.keys(sessions);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const item = sessions[k];
      if (item && item.expiry && item.expiry > now) {
        cleaned[k] = item;
      }
    }
    // Simpan sesi baru dengan key token (mendukung multi-device untuk satu akun)
    cleaned[token] = {
      username: username,
      expiry: now + SESSION_TTL_MS
    };
    props.setProperty("ADMIN_SESSIONS", JSON.stringify(cleaned));
    return token;
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function validateSessionToken(token) {
  if (!token) return null;
  const props = PropertiesService.getScriptProperties();
  let sessions = {};
  try {
    sessions = JSON.parse(props.getProperty("ADMIN_SESSIONS") || "{}");
  } catch (e) {
    return null;
  }
  const now = Date.now();
  // 1. Cek format baru (key = token)
  const sessionData = sessions[token];
  if (sessionData && sessionData.expiry && sessionData.expiry > now) {
    return sessionData.username || null;
  }
  // 2. Fallback cek format lama (key = username, item.token = token)
  const keys = Object.keys(sessions);
  for (let i = 0; i < keys.length; i++) {
    const u = keys[i];
    const s = sessions[u];
    if (s && s.token === token && s.expiry && s.expiry > now) {
      return u;
    }
  }
  return null;
}

function unauthorizedResponse() {
  return createJsonResponse({
    status: "error",
    code: "unauthorized",
    message: "Sesi admin berakhir atau tidak valid. Silakan login kembali."
  });
}

/**
 * Mengambil role pengguna (Super Admin / Admin) berdasarkan username
 */
function getUserRole_(username) {
  if (!username) return null;
  const usersRes = readUsersFromSheet();
  const users = usersRes && usersRes.users ? usersRes.users : [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].username && String(users[i].username).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      return String(users[i].role || "Admin").trim();
    }
  }
  return null;
}

/**
 * GET Handler — Frontend SPA & API Services
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action;

    // Jika tanpa parameter action, sajikan Frontend SPA (Index.html)
    if (!action) {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Khitan Damai — Aku Berani Khitan')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // 0. Redirect tracking untuk kirim WhatsApp (Sambutan / Reminder) dari Bot Telegram
    // Mengubah status booking dari 'Pending' menjadi 'Confirmed' secara otomatis
    // lalu melakukan instant redirect ke URL WhatsApp pendaftar.
    if (action === "waSambutan" || action === "waReminder") {
      const bId = String(params.id || "").trim();
      const isReminder = (action === "waReminder");
      const modeTitle = isReminder ? "WhatsApp Reminder" : "WhatsApp Sambutan";
      const modeIcon = isReminder ? "🔔✨" : "💬✨";
      let targetWaUrl = "https://wa.me/6281222531978"; // Fallback ke nomor klinik
      let bookingName = "";
      let statusUpdated = false;

      if (bId) {
        try {
          const sheet = getSheet();
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
            let rowIndex = -1;
            for (let i = 0; i < idValues.length; i++) {
              if (String(idValues[i][0] || "").trim() === bId) {
                rowIndex = i + 2;
                break;
              }
            }

            if (rowIndex > 1) {
              const rowVals = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
              const curStatus = String(rowVals[21] || "Pending").trim();
              const noHp = String(rowVals[14] || "");
              const namaAnanda = String(rowVals[1] || "");
              bookingName = namaAnanda;

              // Bangun URL WhatsApp pendaftar sesuai mode
              const cleanPhone = cleanPhoneForWa_(noHp);
              if (cleanPhone) {
                const bookingObj = {
                  idBooking: bId,
                  namaAnanda: namaAnanda,
                  namaPenanggungJawab: String(rowVals[10] || ""),
                  hubunganKeluarga: String(rowVals[13] || ""),
                  tanggalKhitan: rowVals[5],
                  jamKhitan: String(rowVals[6] || ""),
                  metodeKhitan: String(rowVals[7] || "")
                };
                const waText = isReminder ? buildWaReminderText_(bookingObj) : buildWaSambutanText_(bookingObj);
                targetWaUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(waText);
              }

              // Update status menjadi 'Confirmed' jika saat ini masih 'Pending' (atau belum terkonfirmasi)
              const lowerStatus = curStatus.toLowerCase();
              if (lowerStatus === "pending" || lowerStatus === "" || !curStatus) {
                const statusColIndex = HEADERS.indexOf("STATUS") + 1;
                sheet.getRange(rowIndex, statusColIndex > 0 ? statusColIndex : 22).setValue("Confirmed");
                invalidateDataset_(SERVER_CACHE_KEYS.BOOKINGS, "bookings");
                logHistory_({
                  user: "Telegram Bot (" + modeTitle + ")",
                  aksi: "UBAH",
                  dataset: "BOOKINGS",
                  idRecord: bId,
                  ringkasan: "Status booking " + bId + " otomatis diubah ke Confirmed saat admin membuka link " + modeTitle,
                  sumber: "telegram-bot"
                });
                statusUpdated = true;
              }
            }
          }
        } catch (trackErr) {
          Logger.log("Peringatan action " + action + ": " + trackErr.toString());
        }
      }

      // Sajikan halaman transisi cepat yang langsung redirect ke WhatsApp
      const safeTargetUrl = escapeTelegramHtml_(targetWaUrl).replace(/"/g, "&quot;");
      const statusNotice = statusUpdated
        ? "✅ Status pendaftaran (" + escapeTelegramHtml_(bId) + ") berhasil diubah menjadi <b>Confirmed</b>."
        : "Membuka WhatsApp untuk ananda " + escapeTelegramHtml_(bookingName || bId) + "...";

      const html = '<!DOCTYPE html>' +
        '<html><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<meta http-equiv="refresh" content="0;url=' + safeTargetUrl + '">' +
        '<title>Membuka ' + modeTitle + '...</title>' +
        '<style>' +
        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0fdf4; color: #166534; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; text-align: center; }' +
        '.card { background: #ffffff; border-radius: 16px; padding: 24px 20px; max-width: 380px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #bbf7d0; }' +
        '.icon { font-size: 40px; margin-bottom: 12px; }' +
        'h2 { font-size: 18px; margin: 0 0 8px 0; color: #047857; }' +
        'p { font-size: 13px; color: #374151; margin: 0 0 16px 0; line-height: 1.5; }' +
        '.btn { display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 14px; }' +
        '</style>' +
        '<script>' +
        'window.location.href = "' + targetWaUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '";' +
        '</script>' +
        '</head><body>' +
        '<div class="card">' +
        '<div class="icon">' + modeIcon + '</div>' +
        '<h2>Membuka WhatsApp...</h2>' +
        '<p>' + statusNotice + '<br><small style="color:#6b7280;">Jika WhatsApp tidak terbuka otomatis, sentuh tombol di bawah:</small></p>' +
        '<a class="btn" href="' + safeTargetUrl + '">Buka WhatsApp Sekarang</a>' +
        '</div>' +
        '</body></html>';

      return HtmlService.createHtmlOutput(html)
        .setTitle('Membuka ' + modeTitle + '...')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    if (action === "testTelegramNotification") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const sampleBooking = {
        idBooking: "KD-TEST01",
        namaAnanda: "Rayyan Al-Fatih (Uji Coba)",
        tanggalLahir: "2017-08-14",
        namaPenanggungJawab: "Admin Khitan Damai",
        hubunganKeluarga: "Ayah",
        nomorHp: "081222531978",
        tanggalKhitan: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
        jamKhitan: "09:00",
        metodeKhitan: "Super Ring Modern",
        kabupaten: "Subang",
        kecamatan: "Subang",
        kelurahan: "Sukamelang",
        timestamp: getJakartaTimestamp()
      };
      const res = sendTelegramBookingNotification_(sampleBooking, "Uji Coba GET API");
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Hasil pengiriman notifikasi Telegram",
        details: res
      });
    }

    if (action === "testReminderNotification") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const sampleItem = {
        idBooking: "KD-REMIND01",
        namaAnanda: "Rayyan Al-Fatih (Uji Coba)",
        namaPenanggungJawab: "Admin Khitan Damai",
        hubunganKeluarga: "Ayah",
        nomorHp: "081222531978",
        tanggalKhitan: Utilities.formatDate(new Date(Date.now() + 6 * 3600 * 1000), "Asia/Jakarta", "yyyy-MM-dd"),
        jamKhitan: Utilities.formatDate(new Date(Date.now() + 6 * 3600 * 1000), "Asia/Jakarta", "HH:mm")
      };
      const res = sendTelegramReminderNotification_(sampleItem, 6);
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Hasil pengujian notifikasi Telegram Reminder",
        details: res
      });
    }

    if (action === "checkReminders") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const res = checkAndSendUpcomingReminders_();
      return createJsonResponse({
        status: "success",
        message: "Pemeriksaan jadwal khitan < 12 jam selesai",
        data: res
      });
    }

    if (action === "setupReminderTrigger") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const res = setupHourlyReminderTrigger();
      return createJsonResponse({
        status: "success",
        message: res
      });
    }

    if (action === "testGoogleReviewNotification") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const res = testSendGoogleReviewAlert();
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Hasil pengujian notifikasi Google Review ke Telegram",
        details: res
      });
    }

    if (action === "checkGoogleReviews") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const res = checkGoogleReviewsAndNotify_();
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Pemeriksaan ulasan Google Review selesai",
        data: res
      });
    }

    if (action === "pollReviewTrigger" || action === "checkReviewsPublic") {
      const res = checkGoogleReviewsAndNotify_();
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Pemeriksaan ulasan Google Review real-time selesai",
        data: res
      });
    }

    if (action === "testFetchLive") {
      const live = fetchGoogleMapsReviewsRealtime_(GOOGLE_MAPS_FEATURE_ID, 20);
      const props = PropertiesService.getScriptProperties();
      const rawStored = props ? props.getProperty("KD_PROCESSED_REVIEW_MSG_IDS") : null;
      const ids = rawStored ? JSON.parse(rawStored) : [];
      return createJsonResponse({
        status: "success",
        total: live.length,
        firstReview: live.length > 0 ? live[0] : null,
        reviews: live.slice(0, 5),
        adminChatIds: getAdminTelegramChatIds_(),
        tgConfig: getTelegramConfig_(),
        activeAdminsProp: props ? props.getProperty("KD_ACTIVE_ADMIN_CHAT_IDS") : null,
        processedCount: ids.length,
        processedIds: ids
      });
    }

    if (action === "markReviewProcessed") {
      const rId = params.reviewId;
      if (rId) {
        const props = PropertiesService.getScriptProperties();
        let pIds = [];
        try {
          const raw = props ? props.getProperty("KD_PROCESSED_REVIEW_MSG_IDS") : null;
          if (raw) pIds = JSON.parse(raw);
        } catch (e) {}
        if (!Array.isArray(pIds)) pIds = [];
        if (pIds.indexOf(rId) === -1) {
          pIds.push(rId);
          if (pIds.length > 150) pIds = pIds.slice(-150);
          if (props) props.setProperty("KD_PROCESSED_REVIEW_MSG_IDS", JSON.stringify(pIds));
        }
      }
      return createJsonResponse({ status: "success", reviewId: rId });
    }

    if (action === "setupGoogleReviewTrigger") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const intervalMinutes = parseInt(params.minutes, 10) || 5;
      const res = setupGoogleReviewTrigger(intervalMinutes);
      return createJsonResponse({
        status: "success",
        message: res
      });
    }

    if (action === "ensureTriggers") {
      const res = ensureAutomaticTriggers_();
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Sinkronisasi pemicu otomatis background selesai",
        data: res
      });
    }

    if (action === "getUpcomingSchedule") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const scheduleFilter = params.filter || "upcoming";
      const data = getUpcomingBookingsGroupedByDate_(scheduleFilter);
      const formatted = formatUpcomingScheduleMessage_(data, params.isAdmin === "true");
      return createJsonResponse({
        status: "success",
        message: "Data jadwal khitan mendatang per hari/tanggal",
        data: data,
        formattedText: formatted
      });
    }

    if (action === "setTelegramWebhook") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const targetUrl = params.url || "";
      const res = setTelegramWebhookUrl_(targetUrl);
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Hasil pendaftaran Webhook Telegram",
        details: res
      });
    }

    if (action === "getBotStatus") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const config = getTelegramConfig_();
      const props = PropertiesService.getScriptProperties();
      let webhookInfo = null;
      try {
        const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.botToken + "/getWebhookInfo", { muteHttpExceptions: true });
        if (res.getResponseCode() === 200) {
          webhookInfo = JSON.parse(res.getContentText()).result;
        }
      } catch (e) {}

      return createJsonResponse({
        status: "success",
        data: {
          botConfigured: !!config.botToken,
          adminChatId: config.chatId,
          adminPhone: config.adminPhone,
          webhookSecretSet: !!(props && props.getProperty("TELEGRAM_HOOK_SECRET")),
          webhookInfo: webhookInfo,
          lastBackupRun: props ? props.getProperty("AUTO_BACKUP_LAST_RUN") : null,
          lastBackupFile: props ? props.getProperty("AUTO_BACKUP_LAST_FILE") : null
        }
      });
    }

    if (action === "checkStatus" || action === "checkBooking") {
      const idQuery = String(params.id || params.idBooking || params.bookingId || params.query || "").trim().toUpperCase();
      const phoneQuery = cleanPhoneNumber(params.phone);
      if (!idQuery && !phoneQuery) {
        return createJsonResponse({
          status: "error",
          message: "Parameter ID Booking atau nomor HP wajib diisi."
        });
      }

      const sheet = getSheet();
      const allBookings = readBookingsFromSheet(sheet, false);
      if (!allBookings || allBookings.length === 0) {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Belum ada data pendaftaran.",
          data: null
        });
      }

      let matchedBooking = null;

      // Iterasi dari yang paling baru (bawah ke atas)
      for (let i = allBookings.length - 1; i >= 0; i--) {
        const b = allBookings[i];
        const rowId = String(b.id || b.idBooking || "").trim().toUpperCase();
        const rowPhone = cleanPhoneNumber(b.noHp || b.nomorHp);
        
        let isMatch = false;
        if (idQuery && rowId === idQuery) {
          isMatch = true;
        } else if (!idQuery && phoneQuery && rowPhone === phoneQuery) {
          isMatch = true;
        }

        if (isMatch) {
          matchedBooking = {
            id: b.id,
            idBooking: b.idBooking || b.id,
            timestamp: b.timestamp,
            namaAnak: b.namaAnak,
            namaAnanda: b.namaAnanda || b.namaAnak,
            tempatLahir: b.tempatLahir,
            tanggalLahir: b.tanggalLahir,
            beratBadan: b.beratBadan,
            tglKhitan: b.tglKhitan,
            tanggalKhitan: b.tanggalKhitan || b.tglKhitan,
            jamKhitan: b.jamKhitan,
            metodeKhitan: b.metodeKhitan,
            ukuranCelana: b.ukuranCelana,
            obat: b.obat,
            namaOrtu: b.namaOrtu || b.namaPenanggungJawab,
            namaPenanggungJawab: b.namaPenanggungJawab || b.namaOrtu,
            usiaPenanggungJawab: b.usiaPenanggungJawab,
            pekerjaan: b.pekerjaan,
            hubunganKeluarga: b.hubunganKeluarga,
            noHp: maskPhoneNumber(b.noHp || b.nomorHp),
            nomorHp: maskPhoneNumber(b.noHp || b.nomorHp),
            alamat: b.alamat,
            provinsi: b.provinsi,
            kabupaten: b.kabupaten,
            kecamatan: b.kecamatan,
            kelurahan: b.kelurahan,
            status: b.status || "Pending"
          };
          break;
        }
      }

      if (matchedBooking) {
        return createJsonResponse({
          status: "success",
          found: true,
          data: matchedBooking
        });
      } else {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: idQuery ? ("Data pendaftaran tidak ditemukan untuk ID Booking " + idQuery + ".") : "Data pendaftaran tidak ditemukan untuk nomor tersebut.",
          data: null
        });
      }
    }

    if (action === "getAllBookings") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const forceRefresh = String(params.forceRefresh || "").toLowerCase() === "true";
      const bookings = readBookingsFromSheet(null, forceRefresh);
      return createJsonResponse({
        status: "success",
        count: bookings.length,
        data: bookings
      });
    }

    if (action === "syncAdminData" || action === "syncAll") {
      return handleSyncAdminData(params);
    }

    if (action === "clearServerCache") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      clearAllServerCaches();
      return createJsonResponse({
        status: "success",
        message: "Seluruh cache server Google Apps Script berhasil dibersihkan."
      });
    }

    if (action === "getSyncHistory") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const historyResult = readHistoryFromSheet_({
        limit: params.limit,
        offset: params.offset,
        dataset: params.dataset,
        aksi: params.aksi,
        q: params.q,
        forceRefresh: String(params.forceRefresh || "").toLowerCase() === "true"
      });
      return createJsonResponse({
        status: "success",
        total: historyResult.total,
        offset: historyResult.offset,
        limit: historyResult.limit,
        hasMore: historyResult.hasMore,
        data: historyResult.items
      });
    }

    if (action === "clearSyncHistory") {
      const username = validateSessionToken(params.token);
      if (!username) {
        return unauthorizedResponse();
      }
      const role = getUserRole_(username);
      if (role !== "Super Admin") {
        return createJsonResponse({
          status: "error",
          message: "Hanya Super Admin yang memiliki hak akses untuk membersihkan riwayat perubahan."
        });
      }
      clearHistorySheet_();
      logHistory_({
        user: username,
        aksi: "HAPUS",
        dataset: "HISTORY",
        idRecord: "ALL",
        ringkasan: "Super Admin membersihkan seluruh riwayat perubahan di sheet HISTORY.",
        sumber: "admin-panel"
      });
      return createJsonResponse({
        status: "success",
        message: "Seluruh riwayat perubahan pada sheet HISTORY berhasil dibersihkan."
      });
    }

    if (action === "getUsers") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const forceRefresh = String(params.forceRefresh || "").toLowerCase() === "true";
      const result = readUsersFromSheet(null, forceRefresh);
      return createJsonResponse({
        status: "success",
        layout: result.layout,
        count: result.users.length,
        data: result.users
      });
    }

    if (action === "getSettings") {
      const forceRefresh = String(params.forceRefresh || "").toLowerCase() === "true";
      const settings = readSettings(forceRefresh);
      return createJsonResponse({
        status: "success",
        data: settings
      });
    }

    if (action === "getGaleri") {
      const isAuth = validateSessionToken(params.token);
      const forceRefresh = isAuth && String(params.forceRefresh || "").toLowerCase() === "true";
      const galeriItems = readGaleriFromSheet(forceRefresh);
      return createJsonResponse({
        status: "success",
        count: galeriItems.length,
        data: galeriItems
      });
    }

    if (action === "getSaran") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const forceRefresh = String(params.forceRefresh || "").toLowerCase() === "true";
      const saranItems = readSaranFromSheet(forceRefresh);
      return createJsonResponse({
        status: "success",
        count: saranItems.length,
        data: saranItems
      });
    }

    if (action === "getKunjungan") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const forceRefresh = String(params.forceRefresh || "").toLowerCase() === "true";
      const kunjunganItems = readKunjunganFromSheet(null, forceRefresh);
      return createJsonResponse({
        status: "success",
        count: kunjunganItems.length,
        data: kunjunganItems
      });
    }

    if (action === "getJumatBerkah") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const forceRefresh = String(params.forceRefresh || "").toLowerCase() === "true";
      const jumatItems = readJumatBerkahFromSheet(null, forceRefresh);
      return createJsonResponse({
        status: "success",
        count: jumatItems.length,
        data: jumatItems
      });
    }

    if (action === "exportJumatWord") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      try {
        const blob = fetchSuratMerokokTemplateBlob_();
        const base64Data = Utilities.base64Encode(blob.getBytes());
        return createJsonResponse({
          status: "success",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          base64: base64Data
        });
      } catch (err) {
        return createJsonResponse({
          status: "error",
          message: "Gagal mengunduh template Word: " + err.message
        });
      }
    }

    if (action === "getKunjunganByRegister") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const targetRegister = String(params.register || params.id || "").trim().toUpperCase();
      if (!targetRegister) {
        return createJsonResponse({
          status: "error",
          message: "Parameter REGISTER wajib diisi."
        });
      }
      const sheet = getKunjunganSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Data sheet KUNJUNGAN masih kosong."
        });
      }
      const values = sheet.getRange(2, 1, lastRow - 1, KUNJUNGAN_HEADERS.length).getValues();
      let matched = null;
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0] || "").trim().toUpperCase() === targetRegister) {
          const row = values[i];
          matched = {
            register: String(row[0] || "").trim().toUpperCase(),
            idBooking: String(row[1] || "").trim().toUpperCase(),
            namaAnanda: toProperCase_(row[2]),
            tempatLahir: toProperCase_(row[3]),
            tanggalLahir: normalizeYmd_(row[4]),
            beratBadan: String(row[5] || "").trim(),
            tanggalKhitan: normalizeYmd_(row[6]),
            jamKhitan: String(row[7] || "").trim(),
            metodeKhitan: String(row[8] || "").trim(),
            ukuranCelana: String(row[9] || "").trim(),
            obat: String(row[10] || "").trim(),
            namaPenanggungJawab: toProperCase_(row[11]),
            usiaPenanggungJawab: String(row[12] || "").trim(),
            pekerjaan: String(row[13] || "").trim(),
            hubunganKeluarga: String(row[14] || "").trim(),
            nomorHp: formatDisplayPhone(row[15]),
            alamat: String(row[16] || "").trim(),
            provinsi: String(row[17] || "").trim(),
            kabupaten: String(row[18] || "").trim(),
            kecamatan: String(row[19] || "").trim(),
            kelurahan: String(row[20] || "").trim()
          };
          break;
        }
      }
      if (!matched) {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Data kunjungan dengan nomor REGISTER " + targetRegister + " tidak ditemukan."
        });
      }
      return createJsonResponse({
        status: "success",
        found: true,
        data: matched
      });
    }

    if (action === "getBackups") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const backups = listDatabaseBackups_();
      return createJsonResponse({
        status: "success",
        count: backups.length,
        folderUrl: "https://drive.google.com/drive/folders/" + BACKUP_FOLDER_ID,
        data: backups
      });
    }

    if (action === "getAlamat") {
      const level = String(params.level || "provinsi").trim().toLowerCase();
      const validLevels = ["provinsi", "kabupaten", "kecamatan", "kelurahan"];
      if (validLevels.indexOf(level) === -1) {
        return createJsonResponse({
          status: "error",
          message: "Parameter 'level' tidak valid. Pilihan: provinsi, kabupaten, kecamatan, kelurahan."
        });
      }

      const prov = String(params.provinsi || "").trim();
      const kab = String(params.kabupaten || "").trim();
      const kec = String(params.kecamatan || "").trim();

      if (level === "kabupaten" && !prov) {
        return createJsonResponse({
          status: "error",
          message: "Parameter 'provinsi' wajib diisi untuk level kabupaten."
        });
      }
      if (level === "kecamatan" && (!prov || !kab)) {
        return createJsonResponse({
          status: "error",
          message: "Parameter 'provinsi' dan 'kabupaten' wajib diisi untuk level kecamatan."
        });
      }
      if (level === "kelurahan" && (!prov || !kab || !kec)) {
        return createJsonResponse({
          status: "error",
          message: "Parameter 'provinsi', 'kabupaten', dan 'kecamatan' wajib diisi untuk level kelurahan."
        });
      }

      // Kunci cache server (CacheService)
      const cacheKey = "alamat:" + level + ":" + prov.toLowerCase() + "|" + kab.toLowerCase() + "|" + kec.toLowerCase();
      const safeCacheKey = cacheKey.substring(0, 240);
      let cachedData = null;
      try {
        const cache = CacheService.getScriptCache();
        const cachedStr = cache.get(safeCacheKey);
        if (cachedStr) {
          cachedData = JSON.parse(cachedStr);
        }
      } catch (cacheErr) {
        Logger.log("CacheService get error: " + cacheErr.toString());
      }

      if (cachedData && Array.isArray(cachedData)) {
        return createJsonResponse({
          status: "success",
          level: level,
          count: cachedData.length,
          cached: true,
          data: cachedData
        });
      }

      const options = readAndWarmAlamatOptions(level, {
        provinsi: prov,
        kabupaten: kab,
        kecamatan: kec
      });

      // Simpan di cache server selama 6 jam (ALAMAT_CACHE_TTL = 21600 detik) jika ukuran JSON muat (<100KB)
      try {
        const cache = CacheService.getScriptCache();
        const jsonStr = JSON.stringify(options);
        if (jsonStr.length < 100000) {
          cache.put(safeCacheKey, jsonStr, ALAMAT_CACHE_TTL);
        }
      } catch (cachePutErr) {
        Logger.log("CacheService put error: " + cachePutErr.toString());
      }

      return createJsonResponse({
        status: "success",
        level: level,
        count: options.length,
        cached: false,
        data: options
      });
    }

    if (action === "warmAlamat") {
      const prov = String(params.provinsi || "").trim();
      if (!prov) {
        return createJsonResponse({
          status: "error",
          message: "Parameter 'provinsi' wajib diisi untuk warmAlamat."
        });
      }
      const count = warmAlamatProvince(prov);
      return createJsonResponse({
        status: "success",
        provinsi: prov,
        count: count,
        data: []
      });
    }

    if (action === "lookupBookingById") {
      if (!validateSessionToken(params.token)) {
        return unauthorizedResponse();
      }
      const targetId = String(params.id || params.idBooking || "").trim().toUpperCase();
      if (!targetId) {
        return createJsonResponse({
          status: "error",
          message: "Parameter ID Booking wajib diisi."
        });
      }
      const sheet = getSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Belum ada data pendaftaran di sheet BOOKING."
        });
      }
      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      let matched = null;
      for (let i = values.length - 1; i >= 0; i--) {
        const row = values[i];
        if (String(row[0] || "").trim().toUpperCase() === targetId) {
          matched = {
            idBooking: String(row[0] || "").trim().toUpperCase(),
            namaAnanda: toProperCase_(row[1]),
            tempatLahir: toProperCase_(row[2]),
            tanggalLahir: normalizeYmd_(row[3]),
            beratBadan: String(row[4] || "").trim(),
            tanggalKhitan: normalizeYmd_(row[5]),
            jamKhitan: String(row[6] || "").trim(),
            metodeKhitan: String(row[7] || "").trim(),
            ukuranCelana: String(row[8] || "").trim(),
            obat: String(row[9] || "").trim(),
            namaPenanggungJawab: toProperCase_(row[10]),
            usiaPenanggungJawab: String(row[11] || "").trim(),
            pekerjaan: String(row[12] || "").trim(),
            hubunganKeluarga: String(row[13] || "").trim(),
            nomorHp: formatDisplayPhone(row[14]),
            alamat: String(row[15] || "").trim(),
            provinsi: String(row[16] || "").trim(),
            kabupaten: String(row[17] || "").trim(),
            kecamatan: String(row[18] || "").trim(),
            kelurahan: String(row[19] || "").trim()
          };
          break;
        }
      }
      if (matched) {
        return createJsonResponse({
          status: "success",
          found: true,
          data: matched
        });
      } else {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Data booking dengan ID " + targetId + " tidak ditemukan di sheet BOOKING."
        });
      }
    }

    if (action === "getReferensi") {
      const cacheKey = "referensi:all";
      const isForceRefresh = (e && e.parameter && (e.parameter.refresh === "true" || e.parameter.forceRefresh === "true"));
      try {
        if (!isForceRefresh) {
          const cache = CacheService.getScriptCache();
          const cached = cache.get(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            return createJsonResponse({
              status: "success",
              cached: true,
              data: parsed
            });
          }
        }
      } catch (cacheErr) {
        Logger.log("CacheService referensi get error: " + cacheErr.toString());
      }

      const options = readReferensiOptions();

      try {
        const cache = CacheService.getScriptCache();
        const jsonStr = JSON.stringify(options);
        if (jsonStr.length < 100000) {
          cache.put(cacheKey, jsonStr, 600); // 10 menit agar update kuota cepat tersinkron
        }
      } catch (cachePutErr) {
        Logger.log("CacheService referensi put error: " + cachePutErr.toString());
      }

      return createJsonResponse({
        status: "success",
        cached: false,
        data: options
      });
    }

    if (action === "getKuotaJam") {
      const tglParam = (e && e.parameter && (e.parameter.tanggal || e.parameter.tanggalKhitan)) || "";
      const summary = getKuotaJamSummary_(tglParam);
      return createJsonResponse({
        status: "success",
        data: summary
      });
    }

    if (action === "generateBookingId") {
      const lock = LockService.getScriptLock();
      const hasLock = lock.tryLock(5000);
      try {
        const id = generateUniqueBookingId();
        return createJsonResponse({
          status: "success",
          data: { id: id }
        });
      } finally {
        if (hasLock) lock.releaseLock();
      }
    }

    // Default Ping
    return createJsonResponse({
      status: "success",
      message: "REST API Khitan Damai aktif.",
      databaseId: SPREADSHEET_ID,
      serverTime: getJakartaTimestamp()
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Fungsi uji coba otorisasi pengiriman email oleh pemilik script Google
 */
function testSendEmail() {
  const email = "denluckyman@gmail.com";
  MailApp.sendEmail(
    email,
    "Uji Coba Otorisasi Email — Khitan Damai",
    "Halo, ini adalah email uji coba otorisasi pengiriman email dari Google Apps Script Khitan Damai."
  );
  Logger.log("Email berhasil dikirim ke: " + email);
}

/**
 * Helper penanganan Lupa Password
 * Mencari kredensial di sheet USERS dan mengirimkan password ke email pengguna.
 */
function handleForgotPassword(identifier) {
  const cleanId = String(identifier || "").trim().toLowerCase();
  if (!cleanId) {
    return createJsonResponse({
      status: "error",
      code: "empty_identifier",
      message: "Harap masukkan username atau alamat email Anda."
    });
  }

  const usersSheet = getUsersSheet();
  const lastRow = usersSheet.getLastRow();
  const lastCol = Math.max(usersSheet.getLastColumn(), 5);

  if (lastRow <= 1) {
    return createJsonResponse({
      status: "error",
      code: "user_not_found",
      message: "Akun '" + identifier + "' tidak terdaftar di sistem kami."
    });
  }

  const userValues = usersSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  let matchedRowIndex = -1;
  let matchedUsername = "";
  let matchedPasswordRaw = "";
  let matchedRole = "Admin";
  let matchedNama = "";
  let isLayoutA = false;

  for (let i = 0; i < userValues.length; i++) {
    const row = userValues[i];
    const col0 = String(row[0] || "").trim();
    const col1 = String(row[1] || "").trim();
    const col2 = row[2];
    const col3 = String(row[3] || "").trim();

    // 1. Cek Layout Baru (Kolom B/index 1 adalah USERNAME)
    if (col1.toLowerCase() === cleanId) {
      matchedRowIndex = i + 2;
      matchedUsername = col1;
      matchedPasswordRaw = col2;
      matchedRole = col3 || "Admin";
      matchedNama = col1;
      isLayoutA = true;
      break;
    }

    // 2. Cek Layout Legacy (Kolom A/index 0 adalah Username)
    if (col0.toLowerCase() === cleanId) {
      matchedRowIndex = i + 2;
      matchedUsername = col0;
      matchedPasswordRaw = col1;
      matchedNama = String(row[2] || "").trim() || col0;
      matchedRole = col3 || "Admin";
      isLayoutA = false;
      break;
    }
  }

  // Jika tidak ditemukan di database USERS
  if (matchedRowIndex === -1) {
    return createJsonResponse({
      status: "error",
      code: "user_not_found",
      message: "Akun atau Email '" + identifier + "' tidak terdaftar di database pengelola. Harap periksa kembali penulisan Anda."
    });
  }

  // Tentukan alamat email tujuan pengiriman
  let targetEmail = "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(matchedUsername)) {
    targetEmail = matchedUsername;
  } else if (emailRegex.test(cleanId)) {
    targetEmail = cleanId;
  }

  if (!targetEmail) {
    return createJsonResponse({
      status: "error",
      code: "no_email_associated",
      message: "Akun '" + matchedUsername + "' tidak terhubung dengan alamat email valid. Silakan hubungi Super Admin untuk bantuan pemulihan kata sandi."
    });
  }

  // Siapkan password yang akan dikirim
  let finalPassword = "";
  const cleanPassStr = String(matchedPasswordRaw || "").trim().replace(/^['"]|['"]$/g, '');

  if (/^[a-f0-9]{64}$/i.test(cleanPassStr)) {
    // Jika password di-hash SHA-256 (satu arah), buat password sementara baru dan simpan ke sheet
    finalPassword = "kd" + Math.floor(100000 + Math.random() * 900000);
    const passCol = isLayoutA ? 3 : 2; // Kolom C (3) di Layout Baru, Kolom B (2) di Legacy
    usersSheet.getRange(matchedRowIndex, passCol).setValue(finalPassword);
  } else {
    // Jika password berupa plain-text, gunakan password yang ada
    finalPassword = cleanPassStr;
  }

  // Kirim email via Google MailApp
  try {
    const subject = "Pemulihan Kredensial Login — Khitan Damai";
    const appUrl = "https://script.google.com/macros/s/AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs/exec#/admin";

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #008080;">
          <h2 style="color: #008080; margin: 0;">Khitan Damai</h2>
          <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">Aku Berani Khitan — Layanan Khitan Modern Ramah Anak</p>
        </div>
        <div style="padding: 24px 0;">
          <h3 style="color: #1e293b; margin-top: 0;">Pemulihan Kredensial Akun Pengelola</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Halo <strong>${matchedNama}</strong>,<br>
            Berikut adalah detail kredensial akun pengelola Anda di sistem Khitan Damai:
          </p>
          <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 6px 0; font-size: 14px; color: #134e4a;"><strong>Username / Email:</strong> <span style="font-family: monospace; font-size: 15px; font-weight: bold;">${matchedUsername}</span></p>
            <p style="margin: 6px 0; font-size: 14px; color: #134e4a;"><strong>Kata Sandi (Password):</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #008080; background: #ffffff; padding: 3px 10px; border-radius: 4px; border: 1px solid #008080;">${finalPassword}</span></p>
            <p style="margin: 6px 0; font-size: 13px; color: #0f766e;"><strong>Hak Akses:</strong> ${matchedRole}</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${appUrl}" style="background-color: #008080; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Masuk ke Panel Admin
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            ⚠️ Demi keamanan, jangan berikan kata sandi ini kepada pihak yang tidak berkepentingan.<br>
            Jika Anda tidak meminta pemulihan ini, harap segera hubungi Super Admin klinik Khitan Damai.
          </p>
        </div>
        <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          © 2026 Khitan Damai Subang • Perum Bumi Abdi Praja Blok D2 No.13 RT. 061 RW.016, Sukamelang, Subang
        </div>
      </div>
    `;

    const plainTextBody = "Halo " + matchedNama + ",\n\nBerikut kredensial akun pengelola Anda di Khitan Damai:\nUsername: " + matchedUsername + "\nPassword: " + finalPassword + "\nHak Akses: " + matchedRole + "\n\nMasuk ke Panel Admin: " + appUrl + "\n\nKhitan Damai Subang";

    MailApp.sendEmail({
      to: targetEmail,
      subject: subject,
      body: plainTextBody,
      htmlBody: htmlBody
    });

    return createJsonResponse({
      status: "success",
      message: "Kata sandi telah berhasil dikirim ke alamat email " + targetEmail + ". Silakan periksa inbox atau folder spam Anda.",
      data: {
        email: targetEmail
      }
    });

  } catch (mailError) {
    Logger.log("MailApp error: " + mailError.toString());
    let friendlyMessage = "Gagal mengirimkan email ke " + targetEmail + ": " + mailError.message;
    if (/izin|permission/i.test(mailError.message)) {
      friendlyMessage = "Layanan pengiriman email memerlukan otorisasi satu kali (Review Permissions) di Google Apps Script Editor oleh pemilik script. Buka Script Editor dan jalankan fungsi testSendEmail untuk mengizinkan.";
    }
    return createJsonResponse({
      status: "error",
      code: "email_send_failed",
      message: friendlyMessage
    });
  }
}

/**
 * POST Handler — Submit Pendaftaran Booking & Manajemen Admin
 */
function doPost(e) {
  let lock = null;
  let hasLock = false;

  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        return createJsonResponse({
          status: "error",
          message: "Format JSON tidak valid: " + jsonErr.toString()
        });
      }
    }

    // 0. Deteksi Telegram Webhook Update (2 arah) - DIJALANKAN TANPA MENGUNCI GLOBAL DATABASE LOCK
    if (payload && (payload.update_id !== undefined || payload.message || payload.callback_query)) {
      const configuredSecret = getTelegramHookSecret_();
      if (configuredSecret) {
        const incomingHook = (e && e.parameter && e.parameter.hook) ? e.parameter.hook : "";
        if (incomingHook !== configuredSecret) {
          // Jika parameter hook belum dikirim oleh Telegram (URL webhook lama tanpa ?hook=)
          if (!incomingHook) {
            try {
              setTelegramWebhookUrl_();
            } catch (whErr) {
              Logger.log("Peringatan auto-set webhook: " + whErr.toString());
            }
          } else {
            return createJsonResponse({
              status: "error",
              message: "Akses webhook Telegram tidak diizinkan."
            });
          }
        }
      }
      return handleTelegramWebhookUpdate_(payload);
    }

    let action = payload.action;
    if (!action) {
      const dataObj = payload.data || payload;
      if (dataObj && (dataObj.namaAnanda || dataObj.namaAnak || dataObj.idBooking)) {
        action = "createBooking";
      } else {
        return createJsonResponse({
          status: "error",
          message: "Aksi tidak dikenali atau parameter action wajib disertakan."
        });
      }
    }

    // Kunci script hanya untuk aksi mutasi database
    const MUTATING_ACTIONS = [
      "createBooking", "updateBookingStatus", "updateBookingFull", "deleteBooking",
      "saveUsers", "saveSettings", "backupDatabase", "createSaran", "deleteSaran",
      "createKunjungan", "updateKunjungan", "deleteKunjungan",
      "createJumatBerkah", "updateJumatBerkah", "deleteJumatBerkah",
      "uploadSlideshowImage", "uploadGaleriImage", "saveGaleri"
    ];

    if (MUTATING_ACTIONS.indexOf(action) !== -1) {
      lock = LockService.getScriptLock();
      hasLock = lock.tryLock(10000);
    }

    // 1. Aksi LOGIN ADMIN
    if (action === "login") {
      const data = payload.data || payload;
      const username = String(data.username || "").trim();
      const password = String(data.password || "").trim();

      // Cek proteksi brute force / rate limiting
      const rateCheck = checkLoginRateLimit(username);
      if (rateCheck && !rateCheck.allowed) {
        return createJsonResponse({
          status: "error",
          message: "Terlalu banyak percobaan login yang gagal untuk akun ini. Akun dikunci sementara selama 15 menit demi keamanan."
        });
      }

      const auth = authenticateUser(username, password);
      if (auth.success) {
        clearLoginAttempts(username);
        const token = issueSessionToken(auth.user.username);
        auth.user.token = token;
        return createJsonResponse({
          status: "success",
          message: "Login berhasil. Selamat datang di Panel Admin Khitan Damai.",
          data: auth.user
        });
      } else {
        recordFailedLoginAttempt(username);
        return createJsonResponse({
          status: "error",
          message: auth.message
        });
      }
    }

    // 1b. Aksi LUPA PASSWORD
    if (action === "forgotPassword") {
      const data = payload.data || payload;
      const identifier = String(data.identifier || data.username || data.email || "").trim();
      return handleForgotPassword(identifier);
    }

    // 2. Aksi UPDATE STATUS BOOKING
    if (action === "updateBookingStatus") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }

      const data = payload.data || payload;
      const bookingId = String(data.id || "").trim();
      const newStatus = String(data.status || "").trim();

      if (!bookingId || !newStatus) {
        return createJsonResponse({
          status: "error",
          message: "ID Booking dan Status baru wajib diisi."
        });
      }

      const sheet = getSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "error",
          message: "Database booking masih kosong."
        });
      }

      const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      let rowIndexToUpdate = -1;

      for (let i = 0; i < idValues.length; i++) {
        if (String(idValues[i][0] || "").trim() === bookingId) {
          rowIndexToUpdate = i + 2; // 1-indexed baris sheet (header baris 1)
          break;
        }
      }

      if (rowIndexToUpdate > 0) {
        // Kolom status berada di kolom STATUS (kolom ke-22 pada skema baru)
        const statusColIndex = HEADERS.indexOf("STATUS") + 1;
        sheet.getRange(rowIndexToUpdate, statusColIndex > 0 ? statusColIndex : 22).setValue(newStatus);
        
        const authUser = validateSessionToken(token);
        logHistory_({
          user: authUser,
          aksi: "UBAH",
          dataset: "BOOKINGS",
          idRecord: bookingId,
          ringkasan: "Ubah status booking " + bookingId + " menjadi " + newStatus,
          sumber: "admin-panel"
        });
        invalidateDataset_(SERVER_CACHE_KEYS.BOOKINGS, "bookings");

        // Kirim notifikasi Telegram ke keluarga pasien jika nomor terhubung ke bot
        try {
          const rowVals = sheet.getRange(rowIndexToUpdate, 1, 1, HEADERS.length).getValues()[0];
          const noHp = String(rowVals[14] || "");
          const namaAnanda = String(rowVals[1] || "");
          const namaPj = String(rowVals[10] || "");
          const sapaan = resolveSapaanWa_(rowVals[13]);
          if (noHp) {
            const statusBadge = formatStatusBadgeTelegram_(newStatus);
            const patMsg = "📢 <b>PEMBARUAN STATUS PENDAFTARAN KHITAN</b> 🏥✨\n" +
              "━━━━━━━━━━━━━━━━━━\n" +
              "Yth. " + sapaan + " <b>" + escapeTelegramHtml_(namaPj) + "</b>,\n\n" +
              "Status pendaftaran khitan Ananda <b>" + escapeTelegramHtml_(namaAnanda) + "</b> (ID: <code>" + escapeTelegramHtml_(bookingId) + "</code>) saat ini telah diperbarui menjadi:\n\n" +
              "👉 <b>" + escapeTelegramHtml_(statusBadge) + "</b>\n\n" +
              "━━━━━━━━━━━━━━━━━━\n" +
              "💡 <i>Sentuh menu '🔍 Status Booking Saya' pada bot untuk memeriksa rincian terkini.</i>\n" +
              "🏥 Rumah Khitan Damai — Nyaman, Aman, dan Menyenangkan ✨";
            notifyPatientTelegram_(noHp, patMsg);

            if (newStatus.toLowerCase() === "selesai") {
              try {
                sendAftercareTelegramIfEligible_(bookingId, rowVals);
              } catch (afErr) {
                Logger.log("Peringatan aftercare bot: " + afErr.toString());
              }
            }
          }
        } catch (tgNotifyErr) {
          Logger.log("Peringatan notifikasi Telegram ke pasien: " + tgNotifyErr.toString());
        }

        return createJsonResponse({
          status: "success",
          message: "Status booking " + bookingId + " berhasil diperbarui menjadi " + newStatus + ".",
          data: {
            id: bookingId,
            status: newStatus
          }
        });
      } else {
        return createJsonResponse({
          status: "error",
          message: "Kode booking " + bookingId + " tidak ditemukan di database."
        });
      }
    }

    // 2b. Aksi UPDATE DATA BOOKING LENGKAP (ADMIN)
    if (action === "updateBookingFull") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }

      const data = payload.data || payload;
      const bookingId = String(data.id || data.idBooking || "").trim();

      if (!bookingId) {
        return createJsonResponse({
          status: "error",
          message: "ID Booking wajib disertakan."
        });
      }

      // Validasi field wajib
      const namaAnanda = String(data.namaAnanda || data.namaAnak || "").trim();
      const namaPenanggungJawab = String(data.namaPenanggungJawab || data.namaOrtu || "").trim();
      const nomorHpRaw = String(data.nomorHp || data.noHp || "").trim();
      const tanggalKhitan = String(data.tanggalKhitan || data.tglKhitan || "").trim();

      if (!namaAnanda || !namaPenanggungJawab || !nomorHpRaw || !tanggalKhitan) {
        return createJsonResponse({
          status: "error",
          message: "Nama Ananda, Nama Penanggung Jawab, Nomor HP, dan Tanggal Khitan wajib diisi."
        });
      }

      const sheet = getSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "error",
          message: "Database booking masih kosong."
        });
      }

      const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      let rowIndexToUpdate = -1;
      for (let i = 0; i < idValues.length; i++) {
        if (String(idValues[i][0] || "").trim() === bookingId) {
          rowIndexToUpdate = i + 2;
          break;
        }
      }

      if (rowIndexToUpdate < 2) {
        return createJsonResponse({
          status: "error",
          message: "Kode booking " + bookingId + " tidak ditemukan di database."
        });
      }

      // Ambil nilai baris yang ada untuk menjaga TIMESTAMP dan STATUS lama bila tidak diubah
      const existingRow = sheet.getRange(rowIndexToUpdate, 1, 1, HEADERS.length).getValues()[0];
      const existingTimestamp = existingRow[20] || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
      const existingStatus = existingRow[21] || "Pending";

      const finalStatus = String(data.status || existingStatus || "Pending").trim();
      const tanggalKhitanNormalized = normalizeYmd_(tanggalKhitan);
      const tanggalLahirNormalized = normalizeYmd_(data.tanggalLahir);
      let cleanHp = nomorHpRaw.replace(/[^\d+]/g, '');
      if (cleanHp.startsWith('0')) {
        cleanHp = '+62' + cleanHp.slice(1);
      } else if (cleanHp.startsWith('8')) {
        cleanHp = '+62' + cleanHp;
      }
      const nomorHpStore = "'" + cleanHp;

      // Update kolom 2 s/d 22 (21 kolom nilai) dengan sanitasi Formula Injection
      const updatedRowValues = [
        sanitizeSpreadsheetFormula(namaAnanda),
        sanitizeSpreadsheetFormula(data.tempatLahir),
        tanggalLahirNormalized,
        sanitizeSpreadsheetFormula(data.beratBadan),
        tanggalKhitanNormalized,
        sanitizeSpreadsheetFormula(data.jamKhitan),
        sanitizeSpreadsheetFormula(data.metodeKhitan),
        sanitizeSpreadsheetFormula(data.ukuranCelana),
        sanitizeSpreadsheetFormula(data.obat),
        sanitizeSpreadsheetFormula(namaPenanggungJawab),
        sanitizeSpreadsheetFormula(data.usiaPenanggungJawab),
        sanitizeSpreadsheetFormula(data.pekerjaan),
        sanitizeSpreadsheetFormula(data.hubunganKeluarga),
        nomorHpStore,
        sanitizeSpreadsheetFormula(data.alamat),
        sanitizeSpreadsheetFormula(data.provinsi),
        sanitizeSpreadsheetFormula(data.kabupaten),
        sanitizeSpreadsheetFormula(data.kecamatan),
        sanitizeSpreadsheetFormula(data.kelurahan),
        existingTimestamp,
        finalStatus
      ];

      sheet.getRange(rowIndexToUpdate, 2, 1, updatedRowValues.length).setValues([updatedRowValues]);

      const authUser = validateSessionToken(token);
      logHistory_({
        user: authUser,
        aksi: "UBAH",
        dataset: "BOOKINGS",
        idRecord: bookingId,
        ringkasan: "Perbarui data booking: " + namaAnanda + " (" + bookingId + ")",
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.BOOKINGS, "bookings");

      const savedData = {
        id: bookingId,
        idBooking: bookingId,
        namaAnak: namaAnanda,
        namaAnanda: namaAnanda,
        tempatLahir: String(data.tempatLahir || "").trim(),
        tanggalLahir: tanggalLahirNormalized,
        beratBadan: String(data.beratBadan || "").trim(),
        tglKhitan: tanggalKhitanNormalized,
        tanggalKhitan: tanggalKhitanNormalized,
        jamKhitan: String(data.jamKhitan || "").trim(),
        metodeKhitan: String(data.metodeKhitan || "").trim(),
        ukuranCelana: String(data.ukuranCelana || "").trim(),
        obat: String(data.obat || "").trim(),
        namaOrtu: namaPenanggungJawab,
        namaPenanggungJawab: namaPenanggungJawab,
        usiaPenanggungJawab: String(data.usiaPenanggungJawab || "").trim(),
        pekerjaan: String(data.pekerjaan || "").trim(),
        hubunganKeluarga: String(data.hubunganKeluarga || "").trim(),
        noHp: formatDisplayPhone(cleanHp),
        nomorHp: cleanHp,
        alamat: String(data.alamat || "").trim(),
        provinsi: String(data.provinsi || "").trim(),
        kabupaten: String(data.kabupaten || "").trim(),
        kecamatan: String(data.kecamatan || "").trim(),
        kelurahan: String(data.kelurahan || "").trim(),
        timestamp: String(existingTimestamp),
        status: finalStatus
      };

      if (finalStatus.toLowerCase() === "selesai") {
        try {
          sendAftercareTelegramIfEligible_(bookingId, savedData);
        } catch (afErr) {
          Logger.log("Peringatan aftercare bot: " + afErr.toString());
        }
      }

      return createJsonResponse({
        status: "success",
        message: "Data booking " + bookingId + " berhasil diperbarui.",
        data: savedData
      });
    }

/**
 * Menghapus satu baris data dari sheet BOOKING berdasarkan ID Booking
 * Menghapus cache SERVER_CACHE_KEYS.BOOKINGS jika baris berhasil dihapus
 * @param {string} bookingId
 * @return {string|null} ID booking yang terhapus atau null jika tidak ditemukan
 */
function deleteBookingRowById_(bookingId) {
  const cleanId = String(bookingId || "").trim().toUpperCase();
  if (!cleanId) return null;

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let rowIndexToDelete = -1;
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0] || "").trim().toUpperCase() === cleanId) {
      rowIndexToDelete = i + 2;
      break;
    }
  }

  if (rowIndexToDelete < 2) return null;

  sheet.deleteRow(rowIndexToDelete);
  invalidateDataset_(SERVER_CACHE_KEYS.BOOKINGS, "bookings");
  return cleanId;
}

    // 2c. Aksi HAPUS DATA BOOKING (ADMIN)
    if (action === "deleteBooking") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUser = validateSessionToken(token);
      if (!authUser) {
        return unauthorizedResponse();
      }

      const data = payload.data || payload;
      const bookingId = String(data.id || data.idBooking || "").trim();

      if (!bookingId) {
        return createJsonResponse({
          status: "error",
          message: "ID Booking wajib disertakan."
        });
      }

      const deletedId = deleteBookingRowById_(bookingId);
      if (!deletedId) {
        return createJsonResponse({
          status: "error",
          message: "Kode booking " + bookingId + " tidak ditemukan di database."
        });
      }

      logHistory_({
        user: authUser,
        aksi: "HAPUS",
        dataset: "BOOKINGS",
        idRecord: bookingId,
        ringkasan: "Hapus booking ID: " + bookingId,
        sumber: "admin-panel"
      });

      return createJsonResponse({
        status: "success",
        message: "Booking dengan ID " + bookingId + " berhasil dihapus.",
        data: { id: bookingId }
      });
    }

    // 3. Aksi AMBIL SEMUA DATA BOOKING (via POST)
    if (action === "getAllBookings") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }

      const forceRefresh = String(payload.forceRefresh || (payload.data && payload.data.forceRefresh) || "").toLowerCase() === "true";
      const bookings = readBookingsFromSheet(null, forceRefresh);
      return createJsonResponse({
        status: "success",
        count: bookings.length,
        data: bookings
      });
    }

    // 3a. Aksi SINKRONISASI TERPADU ADMIN (via POST)
    if (action === "syncAdminData" || action === "syncAll") {
      return handleSyncAdminData(payload);
    }

    // 3a2. Aksi BERSIHKAN CACHE SERVER (via POST)
    if (action === "clearServerCache") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      clearAllServerCaches();
      return createJsonResponse({
        status: "success",
        message: "Seluruh cache server Google Apps Script berhasil dibersihkan."
      });
    }

    // 3a3. Aksi AMBIL RIWAYAT PERUBAHAN SINKRONISASI (via POST)
    if (action === "getSyncHistory") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const data = payload.data || payload;
      const historyResult = readHistoryFromSheet_({
        limit: data.limit,
        offset: data.offset,
        dataset: data.dataset,
        aksi: data.aksi,
        q: data.q,
        forceRefresh: String(data.forceRefresh || "").toLowerCase() === "true"
      });
      return createJsonResponse({
        status: "success",
        total: historyResult.total,
        offset: historyResult.offset,
        limit: historyResult.limit,
        hasMore: historyResult.hasMore,
        data: historyResult.items
      });
    }

    // 3a4. Aksi BERSIHKAN RIWAYAT PERUBAHAN (via POST)
    if (action === "clearSyncHistory") {
      const token = payload.token || (payload.data && payload.data.token);
      const username = validateSessionToken(token);
      if (!username) {
        return unauthorizedResponse();
      }
      const role = getUserRole_(username);
      if (role !== "Super Admin") {
        return createJsonResponse({
          status: "error",
          message: "Hanya Super Admin yang memiliki hak akses untuk membersihkan riwayat perubahan."
        });
      }
      clearHistorySheet_();
      logHistory_({
        user: username,
        aksi: "HAPUS",
        dataset: "HISTORY",
        idRecord: "ALL",
        ringkasan: "Super Admin membersihkan seluruh riwayat perubahan di sheet HISTORY.",
        sumber: "admin-panel"
      });
      return createJsonResponse({
        status: "success",
        message: "Seluruh riwayat perubahan pada sheet HISTORY berhasil dibersihkan."
      });
    }

    // 3b. Aksi AMBIL SEMUA DATA PENGGUNA (via POST)
    if (action === "getUsers") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const forceRefresh = String(payload.forceRefresh || (payload.data && payload.data.forceRefresh) || "").toLowerCase() === "true";
      const result = readUsersFromSheet(null, forceRefresh);
      return createJsonResponse({
        status: "success",
        layout: result.layout,
        count: result.users.length,
        data: result.users
      });
    }

    // 3c. Aksi SIMPAN DATA PENGGUNA (Sheet USERS)
    if (action === "saveUsers") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const data = payload.data || payload;
      const rawUsers = data.users || [];
      if (!Array.isArray(rawUsers) || rawUsers.length === 0) {
        return createJsonResponse({
          status: "error",
          message: "Daftar pengguna tidak boleh kosong."
        });
      }

      // Validasi dan normalisasi tiap pengguna
      const cleanedUsers = [];
      const seenUsernames = {};
      let currentUserStillPresent = false;

      for (let i = 0; i < rawUsers.length; i++) {
        const u = rawUsers[i] || {};
        const username = String(u.username || "").trim();
        const password = String(u.password !== null && u.password !== undefined ? u.password : "").trim();
        const nama = String(u.nama || "").trim() || username;
        const role = String(u.role || "Operator").trim();
        const otorisasi = String(u.otorisasi || "").slice(0, 500).trim();

        if (!username) {
          return createJsonResponse({
            status: "error",
            message: "Baris #" + (i + 1) + ": Username / Email wajib diisi."
          });
        }

        if (!password) {
          return createJsonResponse({
            status: "error",
            message: "Baris #" + (i + 1) + " (" + username + "): Password wajib diisi."
          });
        }

        const lowerUser = username.toLowerCase();
        if (seenUsernames[lowerUser]) {
          return createJsonResponse({
            status: "error",
            message: "Username '" + username + "' terdaftar lebih dari satu kali (duplikat)."
          });
        }
        seenUsernames[lowerUser] = true;

        if (lowerUser === authUsername.toLowerCase()) {
          currentUserStillPresent = true;
        }

        cleanedUsers.push({
          no: i + 1,
          username: username,
          password: password,
          nama: nama,
          role: role,
          otorisasi: otorisasi
        });
      }

      // Guard: jangan izinkan menghapus diri sendiri dari daftar akun
      if (!currentUserStillPresent) {
        return createJsonResponse({
          status: "error",
          message: "Akun login Anda saat ini (@" + authUsername + ") harus tetap ada di dalam daftar untuk mencegah Anda terkunci keluar sistem."
        });
      }

      const sheet = getUsersSheet();
      const currentRead = readUsersFromSheet();
      let layout = currentRead.layout;

      // Cek apakah ada otorisasi yang diatur oleh pengguna
      const hasAnyOtorisasi = cleanedUsers.some(function(u) {
        return !!u.otorisasi;
      });

      // Auto-upgrade layout jika sebelumnya legacy dan ada otorisasi yang disimpan
      if (layout === "legacy" && hasAnyOtorisasi) {
        const NEW_HEADERS = ["NO", "USERNAME", "PASSWORD", "HAK AKSES", "OTORISASI"];
        sheet.getRange(1, 1, 1, NEW_HEADERS.length).setValues([NEW_HEADERS]);
        const headerRange = sheet.getRange(1, 1, 1, NEW_HEADERS.length);
        headerRange.setFontWeight("bold");
        headerRange.setBackground("#008080");
        headerRange.setFontColor("#FFFFFF");
        headerRange.setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
        layout = "baru";
      }

      // Bersihkan baris data lama (baris 2 ke bawah)
      const oldLastRow = sheet.getLastRow();
      if (oldLastRow > 1) {
        const clearCols = Math.max(sheet.getLastColumn(), 5);
        sheet.getRange(2, 1, oldLastRow - 1, clearCols).clearContent();
      }

      // Susun baris baru sesuai layout sheet
      const rowsToInsert = cleanedUsers.map(function(u, idx) {
        let safePw = u.password;
        if (typeof safePw === "string" && safePw.startsWith("=")) {
          safePw = "'" + safePw;
        }
        if (layout === "baru") {
          // [NO, USERNAME, PASSWORD, HAK AKSES, OTORISASI]
          return [idx + 1, u.username, safePw, u.role, u.otorisasi || ""];
        } else {
          // [Username, Password, Nama, Role]
          return [u.username, safePw, u.nama, u.role];
        }
      });

      const targetCols = (layout === "baru") ? 5 : 4;
      sheet.getRange(2, 1, rowsToInsert.length, targetCols).setValues(rowsToInsert);

      for (let c = 1; c <= targetCols; c++) {
        sheet.autoResizeColumn(c);
      }

      const authUser = validateSessionToken(token);
      logHistory_({
        user: authUser,
        aksi: "UBAH",
        dataset: "USERS",
        idRecord: cleanedUsers.length + " Akun",
        ringkasan: "Perbarui data pengguna (" + cleanedUsers.length + " akun, layout " + layout + ")",
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.USERS, "users");

      return createJsonResponse({
        status: "success",
        message: "Data pengguna (" + cleanedUsers.length + " akun) berhasil disimpan ke sheet USERS.",
        count: cleanedUsers.length,
        layout: layout
      });
    }

    // 3d. Aksi GET SETTINGS (POST fallback)
    if (action === "getSettings") {
      const forceRefresh = String(payload.forceRefresh || (payload.data && payload.data.forceRefresh) || "").toLowerCase() === "true";
      const settings = readSettings(forceRefresh);
      return createJsonResponse({
        status: "success",
        data: settings
      });
    }

    // 3d2. Aksi GET GALERI (POST fallback)
    if (action === "getGaleri") {
      const token = payload.token || (payload.data && payload.data.token);
      const isAuth = validateSessionToken(token);
      const forceRefresh = isAuth && String(payload.forceRefresh || (payload.data && payload.data.forceRefresh) || "").toLowerCase() === "true";
      const galeriItems = readGaleriFromSheet(forceRefresh);
      return createJsonResponse({
        status: "success",
        count: galeriItems.length,
        data: galeriItems
      });
    }

    // 3d3. Aksi GET SARAN (POST fallback - Panel Admin)
    if (action === "getSaran") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const forceRefresh = String(payload.forceRefresh || (payload.data && payload.data.forceRefresh) || "").toLowerCase() === "true";
      const saranItems = readSaranFromSheet(forceRefresh);
      return createJsonResponse({
        status: "success",
        count: saranItems.length,
        data: saranItems
      });
    }

    // 3d4. Aksi GET KUNJUNGAN (POST fallback - Panel Admin)
    if (action === "getKunjungan") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const forceRefresh = String(payload.forceRefresh || (payload.data && payload.data.forceRefresh) || "").toLowerCase() === "true";
      const sheet = getKunjunganSheet();
      const kunjunganItems = readKunjunganFromSheet(sheet, forceRefresh);
      return createJsonResponse({
        status: "success",
        count: kunjunganItems.length,
        data: kunjunganItems
      });
    }

    // 3d4b. Aksi GET JUMAT BERKAH (POST fallback - Panel Admin)
    if (action === "getJumatBerkah") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const forceRefresh = String(payload.forceRefresh || (payload.data && payload.data.forceRefresh) || "").toLowerCase() === "true";
      const sheet = getJumatBerkahSheet();
      const jumatItems = readJumatBerkahFromSheet(sheet, forceRefresh);
      return createJsonResponse({
        status: "success",
        count: jumatItems.length,
        data: jumatItems
      });
    }

    // 3d4b2. Aksi EXPORT JUMAT WORD (POST fallback - Panel Admin)
    if (action === "exportJumatWord") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      try {
        const blob = fetchSuratMerokokTemplateBlob_();
        const base64Data = Utilities.base64Encode(blob.getBytes());
        return createJsonResponse({
          status: "success",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          base64: base64Data
        });
      } catch (err) {
        return createJsonResponse({
          status: "error",
          message: "Gagal mengunduh template Word: " + err.message
        });
      }
    }

    // 3d4c. Aksi LOOKUP KUNJUNGAN BY REGISTER (POST - Panel Admin)
    if (action === "getKunjunganByRegister") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const targetRegister = String(payload.register || (payload.data && payload.data.register) || "").trim().toUpperCase();
      if (!targetRegister) {
        return createJsonResponse({
          status: "error",
          message: "Parameter REGISTER wajib diisi."
        });
      }

      const sheet = getKunjunganSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Data sheet KUNJUNGAN masih kosong."
        });
      }

      const values = sheet.getRange(2, 1, lastRow - 1, KUNJUNGAN_HEADERS.length).getValues();
      let matched = null;
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0] || "").trim().toUpperCase() === targetRegister) {
          const row = values[i];
          matched = {
            register: String(row[0] || "").trim().toUpperCase(),
            idBooking: String(row[1] || "").trim().toUpperCase(),
            namaAnanda: toProperCase_(row[2]),
            tempatLahir: toProperCase_(row[3]),
            tanggalLahir: normalizeYmd_(row[4]),
            beratBadan: String(row[5] || "").trim(),
            tanggalKhitan: normalizeYmd_(row[6]),
            jamKhitan: String(row[7] || "").trim(),
            metodeKhitan: String(row[8] || "").trim(),
            ukuranCelana: String(row[9] || "").trim(),
            obat: String(row[10] || "").trim(),
            namaPenanggungJawab: toProperCase_(row[11]),
            usiaPenanggungJawab: String(row[12] || "").trim(),
            pekerjaan: String(row[13] || "").trim(),
            hubunganKeluarga: String(row[14] || "").trim(),
            nomorHp: formatDisplayPhone(row[15]),
            alamat: String(row[16] || "").trim(),
            provinsi: String(row[17] || "").trim(),
            kabupaten: String(row[18] || "").trim(),
            kecamatan: String(row[19] || "").trim(),
            kelurahan: String(row[20] || "").trim()
          };
          break;
        }
      }

      if (!matched) {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Data kunjungan dengan nomor REGISTER " + targetRegister + " tidak ditemukan."
        });
      }

      return createJsonResponse({
        status: "success",
        found: true,
        data: matched
      });
    }

    // 3d5. Aksi LOOKUP BOOKING BY ID (POST - Panel Admin)
    if (action === "lookupBookingById") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const targetId = String(payload.id || payload.idBooking || (payload.data && (payload.data.id || payload.data.idBooking)) || "").trim().toUpperCase();
      if (!targetId) {
        return createJsonResponse({
          status: "error",
          message: "Parameter ID Booking wajib diisi."
        });
      }

      const sheet = getSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Belum ada data pendaftaran di sheet BOOKING."
        });
      }

      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      let matched = null;
      for (let i = values.length - 1; i >= 0; i--) {
        const row = values[i];
        if (String(row[0] || "").trim().toUpperCase() === targetId) {
          matched = {
            idBooking: String(row[0] || "").trim().toUpperCase(),
            namaAnanda: toProperCase_(row[1]),
            tempatLahir: toProperCase_(row[2]),
            tanggalLahir: normalizeYmd_(row[3]),
            beratBadan: String(row[4] || "").trim(),
            tanggalKhitan: normalizeYmd_(row[5]),
            jamKhitan: String(row[6] || "").trim(),
            metodeKhitan: String(row[7] || "").trim(),
            ukuranCelana: String(row[8] || "").trim(),
            obat: String(row[9] || "").trim(),
            namaPenanggungJawab: toProperCase_(row[10]),
            usiaPenanggungJawab: String(row[11] || "").trim(),
            pekerjaan: String(row[12] || "").trim(),
            hubunganKeluarga: String(row[13] || "").trim(),
            nomorHp: formatDisplayPhone(row[14]),
            alamat: String(row[15] || "").trim(),
            provinsi: String(row[16] || "").trim(),
            kabupaten: String(row[17] || "").trim(),
            kecamatan: String(row[18] || "").trim(),
            kelurahan: String(row[19] || "").trim()
          };
          break;
        }
      }

      if (matched) {
        return createJsonResponse({
          status: "success",
          found: true,
          data: matched
        });
      } else {
        return createJsonResponse({
          status: "not_found",
          found: false,
          message: "Data booking dengan ID " + targetId + " tidak ditemukan di sheet BOOKING."
        });
      }
    }

    // 3e. Aksi SIMPAN PENGATURAN (Sheet SETTINGS)
    if (action === "saveSettings") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const data = payload.data || payload;
      const sheet = getSettingsSheet();
      const now = getJakartaTimestamp();
      let savedSomething = false;
      const responseData = {};
      const savedMessages = [];

      // Simpan Running Text jika disertakan
      const runningTextRaw = data.running_text || data.runningText;
      if (runningTextRaw && typeof runningTextRaw === "object") {
        const cleanRunningText = sanitizeRunningText(runningTextRaw);
        upsertSettingRow(sheet, "running_text", JSON.stringify(cleanRunningText), now);
        responseData.running_text = cleanRunningText;
        savedMessages.push("running text");
        savedSomething = true;
      }

      // Simpan Hero Card jika disertakan
      const heroCardRaw = data.hero_card || data.heroCard;
      if (heroCardRaw && typeof heroCardRaw === "object") {
        const cleanHeroCard = sanitizeHeroCard(heroCardRaw);
        upsertSettingRow(sheet, "hero_card", JSON.stringify(cleanHeroCard), now);
        responseData.hero_card = cleanHeroCard;
        savedMessages.push("hero card");
        savedSomething = true;
      }

      // Simpan Slideshow jika disertakan
      if (data.slideshow && Array.isArray(data.slideshow)) {
        const cleanSlideshow = sanitizeSlideshow(data.slideshow);

        // Buang file yang dihapus dari slideshow ke trash Google Drive
        const oldSettings = readSettings();
        trashRemovedSlideshowFiles(oldSettings.slideshow, cleanSlideshow);

        upsertSettingRow(sheet, "slideshow", JSON.stringify(cleanSlideshow), now);
        responseData.slideshow = cleanSlideshow;
        savedMessages.push("foto slideshow");
        savedSomething = true;
      }

      // Simpan Metode jika disertakan
      if (data.metode && Array.isArray(data.metode)) {
        const cleanMetode = sanitizeMetode(data.metode);

        // Buang file yang dihapus dari metode ke trash Google Drive
        const oldSettings = readSettings();
        trashRemovedMetodeFiles(oldSettings.metode, cleanMetode);

        upsertSettingRow(sheet, "metode", JSON.stringify(cleanMetode), now);
        responseData.metode = cleanMetode;
        savedMessages.push("foto metode");
        savedSomething = true;
      }

      // Simpan Program jika disertakan
      if (data.program !== undefined) {
        const cleanProgram = sanitizeProgram(data.program);

        // Buang file yang diganti atau dihapus dari program ke trash Google Drive
        const oldSettings = readSettings();
        trashRemovedProgramFiles(oldSettings.program, cleanProgram);

        upsertSettingRow(sheet, "program", JSON.stringify(cleanProgram), now);
        responseData.program = cleanProgram;
        savedMessages.push("foto program");
        savedSomething = true;
      }

      // Simpan Testimoni jika disertakan
      if (data.testimoni !== undefined && Array.isArray(data.testimoni)) {
        const cleanTestimoni = sanitizeTestimoni(data.testimoni);

        // Buang file foto testimoni yang diganti atau dihapus ke trash Google Drive
        const oldSettings = readSettings();
        trashRemovedTestimoniFiles(oldSettings.testimoni, cleanTestimoni);

        upsertSettingRow(sheet, "testimoni", JSON.stringify(cleanTestimoni), now);
        responseData.testimoni = cleanTestimoni;
        savedMessages.push("testimoni");
        savedSomething = true;
      }

      // Simpan Tanya Jawab (FAQ) jika disertakan
      if (data.faq !== undefined && Array.isArray(data.faq)) {
        const cleanFaq = sanitizeFaq(data.faq);
        upsertSettingRow(sheet, "faq", JSON.stringify(cleanFaq), now);
        responseData.faq = cleanFaq;
        savedMessages.push("tanya jawab (FAQ)");
        savedSomething = true;
      }

      // Simpan Kuota Jam Khitan jika disertakan
      const kuotaJamRaw = data.kuota_jam !== undefined ? data.kuota_jam : data.kuotaJam;
      if (kuotaJamRaw !== undefined && kuotaJamRaw !== null && kuotaJamRaw !== "") {
        const cleanKuotaJam = sanitizeKuotaJam(kuotaJamRaw);
        upsertSettingRow(sheet, "kuota_jam", String(cleanKuotaJam), now);
        responseData.kuota_jam = cleanKuotaJam;
        savedMessages.push("kuota jam khitan");
        savedSomething = true;
      }

      if (!savedSomething) {
        return createJsonResponse({
          status: "error",
          message: "Data pengaturan yang valid (running_text, hero_card, slideshow, metode, program, testimoni, faq, atau kuota_jam) wajib disertakan."
        });
      }

      // Bersihkan cache pengaturan server
      const authUser = validateSessionToken(token);
      logHistory_({
        user: authUser,
        aksi: "UBAH",
        dataset: "SETTINGS",
        idRecord: savedMessages.join(", "),
        ringkasan: "Simpan pengaturan: " + savedMessages.join(", "),
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.SETTINGS, "settings");

      return createJsonResponse({
        status: "success",
        message: "Pengaturan " + savedMessages.join(" dan ") + " berhasil disimpan ke database.",
        data: responseData
      });
    }

    // 3e-backup. Aksi BACKUP SELURUH DATABASE KE GOOGLE DRIVE
    if (action === "backupDatabase") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      try {
        const backupResult = executeDatabaseBackup_();
        const backupList = listDatabaseBackups_();

        try {
          sendTelegramBackupNotification_(backupResult, false);
        } catch (tgErr) {
          Logger.log("Peringatan: Gagal mengirim notifikasi backup web ke Telegram: " + tgErr.toString());
        }

        return createJsonResponse({
          status: "success",
          message: "Database berhasil dibackup ke Google Drive dengan format nama '" + backupResult.fileName + "'.",
          data: Object.assign({}, backupResult, { backups: backupList })
        });
      } catch (backupErr) {
        return createJsonResponse({
          status: "error",
          message: "Gagal memproses backup database: " + backupErr.toString()
        });
      }
    }

    // 3e-listbackup. Aksi AMBIL DAFTAR FILE BACKUP
    if (action === "getBackups") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const backups = listDatabaseBackups_();
      return createJsonResponse({
        status: "success",
        count: backups.length,
        folderUrl: "https://drive.google.com/drive/folders/" + BACKUP_FOLDER_ID,
        data: backups
      });
    }

    // 3f. Aksi UNGGAH FOTO SLIDESHOW KE GOOGLE DRIVE
    if (action === "uploadSlideshowImage") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const fileName = String(payload.fileName || "slide_" + Date.now() + ".jpg").trim();
      const mimeType = String(payload.mimeType || "image/jpeg").toLowerCase().trim();
      const base64Data = String(payload.dataBase64 || payload.base64 || "").trim();

      if (!base64Data) {
        return createJsonResponse({
          status: "error",
          message: "Data gambar (base64) wajib disertakan."
        });
      }

      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedMimes.includes(mimeType)) {
        return createJsonResponse({
          status: "error",
          message: "Format gambar tidak didukung. Harap unggah format JPG, PNG, WEBP, atau GIF."
        });
      }

      const estimatedBytes = Math.ceil(base64Data.length * 3 / 4);
      if (estimatedBytes > SLIDESHOW_MAX_BYTES) {
        return createJsonResponse({
          status: "error",
          message: "Ukuran gambar melebihi batas maksimal 2MB."
        });
      }

      try {
        const decodedBytes = Utilities.base64Decode(base64Data);
        if (decodedBytes.length > SLIDESHOW_MAX_BYTES) {
          return createJsonResponse({
            status: "error",
            message: "Ukuran gambar melebihi batas maksimal 2MB."
          });
        }

        const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        const folder = DriveApp.getFolderById(SLIDESHOW_FOLDER_ID);
        const file = folder.createFile(blob);

        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {
          Logger.log("Peringatan: Gagal setSharing file slideshow: " + shareErr.message);
        }

        const fileId = file.getId();
        const url = "https://lh3.googleusercontent.com/d/" + fileId + "=w1200";

        return createJsonResponse({
          status: "success",
          message: "Foto berhasil diunggah ke Google Drive.",
          data: {
            fileId: fileId,
            src: url,
            alt: fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
          }
        });
      } catch (err) {
        Logger.log("Upload slideshow error: " + err.message);
        return createJsonResponse({
          status: "error",
          message: "Gagal mengunggah foto ke Google Drive: " + err.message
        });
      }
    }

    // 3i. Aksi UPLOAD FOTO GALERI (Folder Google Drive GALERI_FOLDER_ID)
    if (action === "uploadGaleriImage") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const fileName = String(payload.fileName || "galeri_" + Date.now() + ".jpg").trim();
      const mimeType = String(payload.mimeType || "image/jpeg").toLowerCase().trim();
      const base64Data = String(payload.dataBase64 || payload.base64 || "").trim();

      if (!base64Data) {
        return createJsonResponse({
          status: "error",
          message: "Data gambar (base64) wajib disertakan."
        });
      }

      const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedMimes.includes(mimeType)) {
        return createJsonResponse({
          status: "error",
          message: "Format gambar tidak didukung. Harap unggah format JPG, JPEG, PNG, atau WEBP."
        });
      }

      const estimatedBytes = Math.ceil(base64Data.length * 3 / 4);
      if (estimatedBytes > GALERI_MAX_BYTES) {
        return createJsonResponse({
          status: "error",
          message: "Ukuran gambar melebihi batas maksimal 3MB."
        });
      }

      try {
        const decodedBytes = Utilities.base64Decode(base64Data);
        if (decodedBytes.length > GALERI_MAX_BYTES) {
          return createJsonResponse({
            status: "error",
            message: "Ukuran gambar melebihi batas maksimal 3MB."
          });
        }

        const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        const folder = DriveApp.getFolderById(GALERI_FOLDER_ID);
        const file = folder.createFile(blob);

        let isSharedPublic = false;
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          isSharedPublic = true;
        } catch (shareErr) {
          Logger.log("Peringatan: Gagal setSharing foto galeri: " + shareErr.message);
        }

        const fileId = file.getId();
        if (!isSharedPublic) {
          return createJsonResponse({
            status: "error",
            message: "Foto berhasil disimpan ke Google Drive (ID: " + fileId + "), namun izin akses publik (Anyone with link) gagal diaktifkan. Harap periksa setelan hak akses folder Google Drive."
          });
        }
        const url = "https://lh3.googleusercontent.com/d/" + fileId + "=w1200";

        return createJsonResponse({
          status: "success",
          message: "Foto galeri berhasil diunggah ke Google Drive.",
          data: {
            fileId: fileId,
            src: url,
            alt: fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
          }
        });
      } catch (err) {
        Logger.log("Upload galeri error: " + err.message);
        return createJsonResponse({
          status: "error",
          message: "Gagal mengunggah foto ke Google Drive: " + err.message
        });
      }
    }

    // 3j. Aksi CRUD GALERI (Sheet GALERI)
    if (action === "saveGaleri") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const data = payload.data || payload;
      const mode = String(data.mode || "").toLowerCase().trim();
      const item = data.item || {};
      const sheet = getGaleriSheet();
      const lastRow = sheet.getLastRow();

      if (mode === "add") {
        const nama = String(item.nama || "").trim();
        if (!nama) {
          return createJsonResponse({
            status: "error",
            message: "Nama galeri wajib diisi."
          });
        }

        const foto = item.foto || {};
        const fotoSrc = typeof foto === "string" ? foto.trim() : String(foto.src || "").trim();
        const fotoId = typeof foto === "object" ? String(foto.fileId || "").trim() : "";
        if (!fotoSrc && !fotoId) {
          return createJsonResponse({
            status: "error",
            message: "Foto galeri wajib diunggah."
          });
        }

        const existingIds = {};
        if (lastRow > 1) {
          const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
          for (let i = 0; i < idValues.length; i++) {
            const rowId = String(idValues[i][0] || "").trim().toUpperCase();
            if (rowId) existingIds[rowId] = true;
          }
        }

        let finalId = String(item.id || "").trim().toUpperCase();
        if (!finalId || !/^[A-Z]{7}$/.test(finalId) || existingIds[finalId]) {
          finalId = generateGaleriId(existingIds);
        }

        let safeNama = nama;
        if (/^[=+@-]/.test(safeNama)) {
          safeNama = "'" + safeNama;
        }

        const fotoObj = {
          fileId: fotoId,
          src: fotoSrc
        };

        sheet.appendRow([finalId, safeNama, JSON.stringify(fotoObj)]);

        const authUser = validateSessionToken(token);
        logHistory_({
          user: authUser,
          aksi: "TAMBAH",
          dataset: "GALERI",
          idRecord: finalId,
          ringkasan: "Tambah foto galeri: " + nama,
          sumber: "admin-panel"
        });
        invalidateDataset_(SERVER_CACHE_KEYS.GALERI, "galeri");

        return createJsonResponse({
          status: "success",
          message: "Data galeri berhasil ditambahkan.",
          data: {
            id: finalId,
            nama: nama,
            foto: fotoObj
          }
        });
      }

      if (mode === "update") {
        const id = String(item.id || "").trim().toUpperCase();
        if (!id) {
          return createJsonResponse({
            status: "error",
            message: "ID galeri wajib disertakan untuk pembaruan."
          });
        }

        const nama = String(item.nama || "").trim();
        if (!nama) {
          return createJsonResponse({
            status: "error",
            message: "Nama galeri tidak boleh kosong."
          });
        }

        if (lastRow <= 1) {
          return createJsonResponse({
            status: "error",
            message: "Data galeri dengan ID " + id + " tidak ditemukan."
          });
        }

        const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        let targetRowIndex = -1;
        for (let i = 0; i < idValues.length; i++) {
          if (String(idValues[i][0] || "").trim().toUpperCase() === id) {
            targetRowIndex = i + 2;
            break;
          }
        }

        if (targetRowIndex === -1) {
          return createJsonResponse({
            status: "error",
            message: "Data galeri dengan ID " + id + " tidak ditemukan."
          });
        }

        let safeNama = nama;
        if (/^[=+@-]/.test(safeNama)) {
          safeNama = "'" + safeNama;
        }

        let finalFotoObj = null;
        if (item.foto) {
          const oldFotoRaw = sheet.getRange(targetRowIndex, 3).getValue();
          let oldFileId = "";
          if (typeof oldFotoRaw === "string" && oldFotoRaw.trim().startsWith("{")) {
            try {
              const oldParsed = JSON.parse(oldFotoRaw.trim());
              oldFileId = String(oldParsed.fileId || "").trim();
            } catch (e) {}
          }

          const newFoto = item.foto;
          const newSrc = typeof newFoto === "string" ? newFoto.trim() : String(newFoto.src || "").trim();
          const newId = typeof newFoto === "object" ? String(newFoto.fileId || "").trim() : "";

          finalFotoObj = {
            fileId: newId,
            src: newSrc
          };

          if (oldFileId && oldFileId !== newId) {
            trashGaleriFile(oldFileId);
          }

          sheet.getRange(targetRowIndex, 2, 1, 2).setValues([[safeNama, JSON.stringify(finalFotoObj)]]);
        } else {
          sheet.getRange(targetRowIndex, 2).setValue(safeNama);
        }

        const authUser = validateSessionToken(token);
        logHistory_({
          user: authUser,
          aksi: "UBAH",
          dataset: "GALERI",
          idRecord: id,
          ringkasan: "Ubah foto galeri: " + nama,
          sumber: "admin-panel"
        });
        invalidateDataset_(SERVER_CACHE_KEYS.GALERI, "galeri");

        return createJsonResponse({
          status: "success",
          message: "Data galeri berhasil diperbarui.",
          data: {
            id: id,
            nama: nama,
            foto: finalFotoObj
          }
        });
      }

      if (mode === "delete") {
        const id = String(item.id || "").trim().toUpperCase();
        if (!id) {
          return createJsonResponse({
            status: "error",
            message: "ID galeri wajib disertakan untuk penghapusan."
          });
        }

        if (lastRow <= 1) {
          return createJsonResponse({
            status: "error",
            message: "Data galeri dengan ID " + id + " tidak ditemukan."
          });
        }

        const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        let targetRowIndex = -1;
        for (let i = 0; i < idValues.length; i++) {
          if (String(idValues[i][0] || "").trim().toUpperCase() === id) {
            targetRowIndex = i + 2;
            break;
          }
        }

        if (targetRowIndex === -1) {
          return createJsonResponse({
            status: "error",
            message: "Data galeri dengan ID " + id + " tidak ditemukan."
          });
        }

        const oldFotoRaw = sheet.getRange(targetRowIndex, 3).getValue();
        if (typeof oldFotoRaw === "string" && oldFotoRaw.trim().startsWith("{")) {
          try {
            const oldParsed = JSON.parse(oldFotoRaw.trim());
            const oldFileId = String(oldParsed.fileId || "").trim();
            if (oldFileId) {
              trashGaleriFile(oldFileId);
            }
          } catch (e) {}
        }

        sheet.deleteRow(targetRowIndex);

        const authUser = validateSessionToken(token);
        logHistory_({
          user: authUser,
          aksi: "HAPUS",
          dataset: "GALERI",
          idRecord: id,
          ringkasan: "Hapus foto galeri: " + id,
          sumber: "admin-panel"
        });
        invalidateDataset_(SERVER_CACHE_KEYS.GALERI, "galeri");

        return createJsonResponse({
          status: "success",
          message: "Data galeri berhasil dihapus."
        });
      }

      return createJsonResponse({
        status: "error",
        message: "Mode aksi galeri tidak valid (harus add, update, atau delete)."
      });
    }

    if (action === "getReferensi") {
      const options = readReferensiOptions();
      return createJsonResponse({
        status: "success",
        data: options
      });
    }

    if (action === "getKuotaJam") {
      const tglParam = payload.tanggal || payload.tanggalKhitan || (payload.data && (payload.data.tanggal || payload.data.tanggalKhitan)) || "";
      const summary = getKuotaJamSummary_(tglParam);
      return createJsonResponse({
        status: "success",
        data: summary
      });
    }

    if (action === "generateBookingId") {
      const id = generateUniqueBookingId();
      return createJsonResponse({
        status: "success",
        data: { id: id }
      });
    }

    // 4. Aksi CREATE BOOKING (Pendaftaran Baru - Skema Lengkap 20 Kolom Form + Timestamp & Status)
    if (action === "createBooking") {
      const data = payload.data || payload;

      const namaAnanda = toProperCase_(data.namaAnanda || data.namaAnak || "");
      const tempatLahir = toProperCase_(data.tempatLahir || "");
      const tanggalLahir = normalizeYmd_(data.tanggalLahir);
      const beratBadan = String(data.beratBadan !== undefined && data.beratBadan !== null ? data.beratBadan : "").trim();
      const tanggalKhitan = normalizeYmd_(data.tanggalKhitan || data.tglKhitan);
      const jamKhitan = String(data.jamKhitan || "").trim();
      const metodeKhitan = String(data.metodeKhitan || "").trim();
      const ukuranCelana = String(data.ukuranCelana || "").trim();
      const obat = String(data.obat || "").trim();
      const namaPenanggungJawab = toProperCase_(data.namaPenanggungJawab || data.namaOrtu || "");
      const usiaPenanggungJawab = String(data.usiaPenanggungJawab !== undefined && data.usiaPenanggungJawab !== null ? data.usiaPenanggungJawab : "").trim();
      const pekerjaan = String(data.pekerjaan || "").trim();
      const hubunganKeluarga = String(data.hubunganKeluarga || "").trim();
      let rawPhone = String(data.nomorHp || data.noHp || "").trim();
      const alamat = String(data.alamat || "").trim();
      const provinsi = String(data.provinsi || "").trim();
      const kabupaten = String(data.kabupaten || "").trim();
      const kecamatan = String(data.kecamatan || "").trim();
      const kelurahan = String(data.kelurahan || "").trim();

      // Validasi wajib (toleransi jika klien lama hanya mengirim 4 field dasar)
      if (!namaAnanda || !namaPenanggungJawab || !rawPhone || !tanggalKhitan) {
        return createJsonResponse({
          status: "error",
          message: "Kolom Nama Ananda, Penanggung Jawab, Nomor HP, dan Tanggal Khitan wajib diisi."
        });
      }

      // Validasi Kuota Jam Khitan (Opsi A: tolak jika kuota slot sudah penuh)
      if (jamKhitan) {
        const quotaSummary = getKuotaJamSummary_(tanggalKhitan);
        const slotInfo = quotaSummary.slots && quotaSummary.slots[jamKhitan];
        const kuotaSlot = (slotInfo && typeof slotInfo.kuota === "number")
          ? slotInfo.kuota
          : (quotaSummary.kuotaPerSlot || DEFAULT_KUOTA_JAM);
        const currentTerpakai = slotInfo ? slotInfo.terpakai : 0;
        if (currentTerpakai >= kuotaSlot) {
          return createJsonResponse({
            status: "error",
            code: "QUOTA_PENUH",
            message: "Maaf, kuota khitan untuk jam " + jamKhitan + " pada tanggal " + formatIndonesianDateStr_(tanggalKhitan) + " sudah penuh (" + currentTerpakai + "/" + kuotaSlot + " pasien). Silakan pilih jam atau tanggal lain."
          });
        }
      }

      const sheet = getSheet();

      // Validasi atau generate ID Booking unik 7 karakter alfanumerik
      let bookingId = String(data.idBooking || data.id || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{7}$/.test(bookingId)) {
        bookingId = generateUniqueBookingId(sheet);
      } else {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          const colAValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
          const isTaken = colAValues.some(function(r) {
            return String(r[0] || "").trim().toUpperCase() === bookingId;
          });
          if (isTaken) {
            bookingId = generateUniqueBookingId(sheet);
          }
        }
      }

      const timestamp = getJakartaTimestamp();
      const status = "Pending";

      const formattedNoHp = formatDisplayPhone(rawPhone);
      const storedNoHp = "'" + (rawPhone.startsWith("+62") ? rawPhone : formattedNoHp);

      const newRow = [
        bookingId,                                          // 1. ID BOOKING
        sanitizeSpreadsheetFormula(namaAnanda),             // 2. NAMA ANANDA
        sanitizeSpreadsheetFormula(tempatLahir),            // 3. TEMPAT LAHIR
        tanggalLahir,                                       // 4. TANGGAL LAHIR
        sanitizeSpreadsheetFormula(beratBadan),             // 5. BERAT BADAN
        tanggalKhitan,                                      // 6. TANGGAL KHITAN
        sanitizeSpreadsheetFormula(jamKhitan),              // 7. JAM KHITAN
        sanitizeSpreadsheetFormula(metodeKhitan),           // 8. METODE KHITAN
        sanitizeSpreadsheetFormula(ukuranCelana),           // 9. UKURAN CELANA
        sanitizeSpreadsheetFormula(obat),                   // 10. OBAT
        sanitizeSpreadsheetFormula(namaPenanggungJawab),    // 11. NAMA PENANGGUNG JAWAB
        sanitizeSpreadsheetFormula(usiaPenanggungJawab),    // 12. USIA PENANGGUNG JAWAB
        sanitizeSpreadsheetFormula(pekerjaan),              // 13. PEKERJAAN
        sanitizeSpreadsheetFormula(hubunganKeluarga),       // 14. HUBUNGAN KELUARGA
        storedNoHp,                                         // 15. NOMOR HP
        sanitizeSpreadsheetFormula(alamat),                 // 16. ALAMAT
        sanitizeSpreadsheetFormula(provinsi),               // 17. PROVINSI
        sanitizeSpreadsheetFormula(kabupaten),              // 18. KABUPATEN
        sanitizeSpreadsheetFormula(kecamatan),              // 19. KECAMATAN
        sanitizeSpreadsheetFormula(kelurahan),              // 20. KELURAHAN
        timestamp,                                          // 21. TIMESTAMP
        status                                              // 22. STATUS
      ];

      sheet.appendRow(newRow);
      invalidateDataset_(SERVER_CACHE_KEYS.BOOKINGS, "bookings");
      logHistory_({
        user: namaPenanggungJawab || "Publik",
        aksi: "TAMBAH",
        dataset: "BOOKINGS",
        idRecord: bookingId,
        ringkasan: "Pendaftaran booking baru: " + namaAnanda + " (" + tanggalKhitan + ")",
        sumber: "publik"
      });

      const savedData = {
        // Field baru
        idBooking: bookingId,
        namaAnanda: namaAnanda,
        tempatLahir: tempatLahir,
        tanggalLahir: tanggalLahir,
        beratBadan: beratBadan,
        tanggalKhitan: tanggalKhitan,
        jamKhitan: jamKhitan,
        metodeKhitan: metodeKhitan,
        ukuranCelana: ukuranCelana,
        obat: obat,
        namaPenanggungJawab: namaPenanggungJawab,
        usiaPenanggungJawab: usiaPenanggungJawab,
        pekerjaan: pekerjaan,
        hubunganKeluarga: hubunganKeluarga,
        nomorHp: formattedNoHp,
        alamat: alamat,
        provinsi: provinsi,
        kabupaten: kabupaten,
        kecamatan: kecamatan,
        kelurahan: kelurahan,
        timestamp: timestamp,
        status: status,

        // Alias kompatibilitas mundur
        id: bookingId,
        namaAnak: namaAnanda,
        namaOrtu: namaPenanggungJawab,
        noHp: formattedNoHp,
        tglKhitan: tanggalKhitan
      };

      // Kirim notifikasi otomatis ke Telegram Admin (081222531978)
      sendTelegramBookingNotification_(savedData, payload.token ? "Panel Admin" : "Akses Publik");

      // 🚨 Notifikasi URGENT: pendaftaran dadakan dengan jadwal tindakan < 12 jam
      try {
        checkAndSendUrgentBookingAlert_(savedData);
      } catch (urgentErr) {
        Logger.log("Peringatan checkAndSendUrgentBookingAlert_: " + urgentErr.toString());
      }

      return createJsonResponse({
        status: "success",
        message: "Pendaftaran khitan berhasil disimpan ke database.",
        data: savedData
      });
    }

    // 4b. Aksi TEST TELEGRAM NOTIFICATION
    if (action === "testTelegramNotification") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const sampleBooking = {
        idBooking: "KD-TEST01",
        namaAnanda: "Rayyan Al-Fatih (Uji Coba)",
        tanggalLahir: "2017-08-14",
        namaPenanggungJawab: "Admin Khitan Damai",
        hubunganKeluarga: "Ayah",
        nomorHp: "081222531978",
        tanggalKhitan: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
        jamKhitan: "09:00",
        metodeKhitan: "Super Ring Modern",
        kabupaten: "Subang",
        kecamatan: "Subang",
        kelurahan: "Sukamelang",
        timestamp: getJakartaTimestamp()
      };
      const res = sendTelegramBookingNotification_(sampleBooking, "Uji Coba POST API");
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Hasil pengiriman notifikasi Telegram",
        details: res
      });
    }

    // 4c. Aksi TEST REMINDER NOTIFICATION & CHECK REMINDERS
    if (action === "testReminderNotification") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const sampleItem = {
        idBooking: "KD-REMIND01",
        namaAnanda: "Rayyan Al-Fatih (Uji Coba)",
        namaPenanggungJawab: "Admin Khitan Damai",
        hubunganKeluarga: "Ayah",
        nomorHp: "081222531978",
        tanggalKhitan: Utilities.formatDate(new Date(Date.now() + 6 * 3600 * 1000), "Asia/Jakarta", "yyyy-MM-dd"),
        jamKhitan: Utilities.formatDate(new Date(Date.now() + 6 * 3600 * 1000), "Asia/Jakarta", "HH:mm")
      };
      const res = sendTelegramReminderNotification_(sampleItem, 6);
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Hasil pengujian notifikasi Telegram Reminder",
        details: res
      });
    }

    if (action === "checkReminders") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const res = checkAndSendUpcomingReminders_();
      return createJsonResponse({
        status: "success",
        message: "Pemeriksaan jadwal khitan < 12 jam selesai",
        data: res
      });
    }

    if (action === "setupReminderTrigger") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const res = setupHourlyReminderTrigger();
      return createJsonResponse({
        status: "success",
        message: res
      });
    }

    if (action === "testGoogleReviewNotification") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const res = testSendGoogleReviewAlert();
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Hasil pengujian notifikasi Google Review ke Telegram",
        details: res
      });
    }

    if (action === "checkGoogleReviews") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const res = checkGoogleReviewsAndNotify_();
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Pemeriksaan ulasan Google Review selesai",
        data: res
      });
    }

    if (action === "setupGoogleReviewTrigger") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const intervalMinutes = parseInt((payload.data && payload.data.minutes) || payload.minutes, 10) || 15;
      const res = setupGoogleReviewTrigger(intervalMinutes);
      return createJsonResponse({
        status: "success",
        message: res
      });
    }

    if (action === "getUpcomingSchedule") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const scheduleFilter = (payload.data && payload.data.filter) || payload.filter || "upcoming";
      const data = getUpcomingBookingsGroupedByDate_(scheduleFilter);
      const isAdmin = (payload.data && payload.data.isAdmin === true) || payload.isAdmin === true;
      const formatted = formatUpcomingScheduleMessage_(data, isAdmin);
      return createJsonResponse({
        status: "success",
        message: "Data jadwal khitan mendatang per hari/tanggal",
        data: data,
        formattedText: formatted
      });
    }

    if (action === "setTelegramWebhook") {
      const token = payload.token || (payload.data && payload.data.token);
      if (!validateSessionToken(token)) {
        return unauthorizedResponse();
      }
      const targetUrl = (payload.data && payload.data.url) || payload.url || "";
      const res = setTelegramWebhookUrl_(targetUrl);
      return createJsonResponse({
        status: res.success ? "success" : "error",
        message: "Hasil pendaftaran Webhook Telegram",
        details: res
      });
    }

    // 5. Aksi CREATE SARAN (Beri Saran & Kritik - Publik)
    if (action === "createSaran") {
      const data = payload.data || payload;

      const nama = String(data.nama || "").trim();
      let noHp = String(data.noHp || "").trim();
      const email = String(data.email || "").trim();
      const saran = String(data.saran || "").trim();

      if (!nama) {
        return createJsonResponse({
          status: "error",
          message: "Nama wajib diisi."
        });
      }

      // Validasi Nomor HP: Format diawali '+62' dan digit lanjutan diawali '8'
      if (!noHp.startsWith("+62")) {
        if (noHp.startsWith("0")) {
          noHp = "+62" + noHp.substring(1);
        } else if (noHp.startsWith("8")) {
          noHp = "+62" + noHp;
        } else {
          return createJsonResponse({
            status: "error",
            message: "Nomor HP harus diawali dengan +62 dan diikuti angka 8."
          });
        }
      }

      const hpDigits = noHp.substring(3); // digit setelah +62
      if (!hpDigits.startsWith("8") || hpDigits.length < 8 || hpDigits.length > 13) {
        return createJsonResponse({
          status: "error",
          message: "Nomor HP tidak valid. Pastikan diawali +628 dan terdiri dari 10-15 digit."
        });
      }

      // Validasi Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return createJsonResponse({
          status: "error",
          message: "Format email tidak valid."
        });
      }

      if (!saran) {
        return createJsonResponse({
          status: "error",
          message: "Pesan saran & kritik wajib diisi."
        });
      }

      const sheet = getSaranSheet();
      const lastRow = sheet.getLastRow();
      const existingIds = {};
      if (lastRow > 1) {
        const idVals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < idVals.length; i++) {
          const val = String(idVals[i][0] || "").trim().toUpperCase();
          if (val) existingIds[val] = true;
        }
      }

      let saranId = String(data.id || "").trim().toUpperCase();
      if (!saranId || saranId.length !== 4 || existingIds[saranId]) {
        saranId = generateSaranId(existingIds);
      }

      // Pastikan zona waktu Asia/Jakarta (WIB) tanpa perbedaan zona
      const now = new Date();
      const tanggalWib = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
      const jamWib = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm:ss");

      // Simpan nomor HP sebagai teks dengan kutip satu di spreadsheet
      const storedNoHp = "'" + noHp;

      const newRow = [
        saranId,
        tanggalWib,
        jamWib,
        sanitizeSpreadsheetFormula(nama),
        storedNoHp,
        sanitizeSpreadsheetFormula(email),
        sanitizeSpreadsheetFormula(saran)
      ];

      sheet.appendRow(newRow);
      logHistory_({
        user: nama || "Publik",
        aksi: "TAMBAH",
        dataset: "SARAN",
        idRecord: saranId,
        ringkasan: "Saran & kritik baru dari " + (nama || "Anonim"),
        sumber: "publik"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.SARAN, "saran");

      return createJsonResponse({
        status: "success",
        message: "Saran & kritik berhasil dikirim. Terima kasih atas masukan Anda!",
        data: {
          id: saranId,
          tanggal: tanggalWib,
          jam: jamWib,
          nama: nama,
          noHp: noHp,
          email: email,
          saran: saran
        }
      });
    }

    // 6. Aksi DELETE SARAN (Panel Admin - butuh token)
    if (action === "deleteSaran") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const id = String(payload.id || (payload.data && payload.data.id) || "").trim().toUpperCase();
      if (!id) {
        return createJsonResponse({
          status: "error",
          message: "ID saran wajib disertakan untuk penghapusan."
        });
      }

      const sheet = getSaranSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "error",
          message: "Data saran tidak ditemukan."
        });
      }

      const idRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      let targetRowIndex = -1;
      for (let i = 0; i < idRange.length; i++) {
        if (String(idRange[i][0] || "").trim().toUpperCase() === id) {
          targetRowIndex = i + 2;
          break;
        }
      }

      if (targetRowIndex === -1) {
        return createJsonResponse({
          status: "error",
          message: "Data saran dengan ID " + id + " tidak ditemukan."
        });
      }

      sheet.deleteRow(targetRowIndex);
      logHistory_({
        user: authUsername,
        aksi: "HAPUS",
        dataset: "SARAN",
        idRecord: id,
        ringkasan: "Hapus saran & kritik ID: " + id,
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.SARAN, "saran");

      return createJsonResponse({
        status: "success",
        message: "Data saran & kritik berhasil dihapus."
      });
    }

    // 7. Aksi TAMBAH DATA KUNJUNGAN (Panel Admin)
    if (action === "createKunjungan") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const itemData = payload.data || payload;
      const sheet = getKunjunganSheet();
      const lastRow = sheet.getLastRow();

      // Buat nomor REGISTER otomatis: KD + YYMMDD + 4 digit urut per tahun
      const newRegister = generateKunjunganRegister_(sheet, itemData.tanggalKhitan);

      // Baca data yang ada saat ini
      let allRows = [];
      if (lastRow > 1) {
        allRows = sheet.getRange(2, 1, lastRow - 1, KUNJUNGAN_HEADERS.length).getValues();
      }

      // Buat baris baru 32 kolom
      const newRow = kunjunganObjectToRow_(itemData, newRegister);
      allRows.push(newRow);

      // Tulis ulang penuh seluruh sheet terurut REGISTER DESC (data terbaru di atas)
      writeKunjunganRowsToSheet_(sheet, allRows);
      logHistory_({
        user: authUsername,
        aksi: "TAMBAH",
        dataset: "KUNJUNGAN",
        idRecord: newRegister,
        ringkasan: "Tambah kunjungan baru: " + (itemData.namaAnanda || "") + " (" + newRegister + ")",
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.KUNJUNGAN, "kunjungan");

      // Otomatis hapus baris booking sumber jika data berasal dari pendaftaran booking
      let deletedBookingId = null;
      const rawBookingId = String(itemData.idBooking || "").trim().toUpperCase();
      const shouldDeleteBooking = payload.deleteSourceBooking === true || 
                                  (payload.data && payload.data.deleteSourceBooking === true) || 
                                  (rawBookingId && rawBookingId !== "-" && rawBookingId !== "MANUAL");
      if (shouldDeleteBooking && rawBookingId && rawBookingId !== "-" && rawBookingId !== "MANUAL") {
        deletedBookingId = deleteBookingRowById_(rawBookingId);
      }

      const successMsg = "Data kunjungan berhasil ditambahkan dengan nomor register " + newRegister +
        (deletedBookingId ? (" (Data booking " + deletedBookingId + " telah dihapus dari menu Booking)") : "");

      return createJsonResponse({
        status: "success",
        message: successMsg,
        data: {
          register: newRegister,
          deletedBooking: deletedBookingId
        }
      });
    }

    // 8. Aksi UPDATE DATA KUNJUNGAN (Panel Admin)
    if (action === "updateKunjungan") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const itemData = payload.data || payload;
      const targetRegister = String(itemData.register || "").trim().toUpperCase();
      if (!targetRegister) {
        return createJsonResponse({
          status: "error",
          message: "Nomor REGISTER wajib disertakan untuk memperbarui data."
        });
      }

      const sheet = getKunjunganSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "error",
          message: "Data kunjungan kosong."
        });
      }

      const allRows = sheet.getRange(2, 1, lastRow - 1, KUNJUNGAN_HEADERS.length).getValues();
      let foundIndex = -1;
      for (let i = 0; i < allRows.length; i++) {
        if (String(allRows[i][0] || "").trim().toUpperCase() === targetRegister) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex === -1) {
        return createJsonResponse({
          status: "error",
          message: "Data kunjungan dengan nomor register " + targetRegister + " tidak ditemukan."
        });
      }

      // Ganti dengan data baru (register tetap sama)
      allRows[foundIndex] = kunjunganObjectToRow_(itemData, targetRegister);

      // Tulis ulang penuh seluruh sheet terurut REGISTER DESC (data terbaru di atas)
      writeKunjunganRowsToSheet_(sheet, allRows);
      logHistory_({
        user: authUsername,
        aksi: "UBAH",
        dataset: "KUNJUNGAN",
        idRecord: targetRegister,
        ringkasan: "Ubah data kunjungan register: " + targetRegister,
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.KUNJUNGAN, "kunjungan");

      return createJsonResponse({
        status: "success",
        message: "Data kunjungan register " + targetRegister + " berhasil diperbarui.",
        data: {
          register: targetRegister
        }
      });
    }

    // 9. Aksi DELETE DATA KUNJUNGAN (Panel Admin)
    if (action === "deleteKunjungan") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const targetRegister = String(payload.register || (payload.data && payload.data.register) || "").trim().toUpperCase();
      if (!targetRegister) {
        return createJsonResponse({
          status: "error",
          message: "Nomor REGISTER wajib disertakan untuk penghapusan."
        });
      }

      const sheet = getKunjunganSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "error",
          message: "Data kunjungan tidak ditemukan."
        });
      }

      const allRows = sheet.getRange(2, 1, lastRow - 1, KUNJUNGAN_HEADERS.length).getValues();
      const remainingRows = [];
      let found = false;
      for (let i = 0; i < allRows.length; i++) {
        if (String(allRows[i][0] || "").trim().toUpperCase() === targetRegister) {
          found = true;
        } else {
          remainingRows.push(allRows[i]);
        }
      }

      if (!found) {
        return createJsonResponse({
          status: "error",
          message: "Data kunjungan dengan register " + targetRegister + " tidak ditemukan."
        });
      }

      // Tulis ulang penuh seluruh sheet terurut REGISTER DESC
      writeKunjunganRowsToSheet_(sheet, remainingRows);
      logHistory_({
        user: authUsername,
        aksi: "HAPUS",
        dataset: "KUNJUNGAN",
        idRecord: targetRegister,
        ringkasan: "Hapus data kunjungan register: " + targetRegister,
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.KUNJUNGAN, "kunjungan");

      return createJsonResponse({
        status: "success",
        message: "Data kunjungan " + targetRegister + " berhasil dihapus."
      });
    }

    // 10. Aksi TAMBAH DATA JUMAT BERKAH (Panel Admin)
    if (action === "createJumatBerkah") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const itemData = payload.data || payload;
      const namaAnanda = String(itemData.namaAnanda || itemData.namaAnak || "").trim();
      const tanggalKhitan = normalizeYmd_(itemData.tanggalKhitan || itemData.tglKhitan);

      if (!namaAnanda) {
        return createJsonResponse({
          status: "error",
          message: "Nama Ananda wajib diisi."
        });
      }
      if (!tanggalKhitan) {
        return createJsonResponse({
          status: "error",
          message: "Tanggal Khitan wajib diisi."
        });
      }

      const sheet = getJumatBerkahSheet();
      const lastRow = sheet.getLastRow();

      // Gunakan REGISTER yang diberikan (misal dari referensi Kunjungan), atau buat otomatis jika kosong
      let newRegister = String(itemData.register || "").trim().toUpperCase();
      if (!newRegister) {
        newRegister = generateJumatBerkahRegister_(sheet, tanggalKhitan);
      }

      // Periksa apakah REGISTER sudah pernah terdaftar di sheet JUMAT BERKAH
      let allRows = [];
      if (lastRow > 1) {
        allRows = sheet.getRange(2, 1, lastRow - 1, JUMAT_BERKAH_HEADERS.length).getValues();
        for (let i = 0; i < allRows.length; i++) {
          if (String(allRows[i][0] || "").trim().toUpperCase() === newRegister) {
            return createJsonResponse({
              status: "error",
              message: "Data Jumat Berkah dengan nomor REGISTER " + newRegister + " sudah terdaftar di sheet."
            });
          }
        }
      }

      // Buat baris baru 17 kolom
      const newRow = jumatBerkahObjectToRow_(itemData, newRegister);
      allRows.push(newRow);

      // Tulis ulang penuh seluruh sheet terurut REGISTER DESC
      writeJumatBerkahRowsToSheet_(sheet, allRows);
      logHistory_({
        user: authUsername,
        aksi: "TAMBAH",
        dataset: "JUMAT_BERKAH",
        idRecord: newRegister,
        ringkasan: "Tambah Jumat Berkah baru: " + (itemData.namaAnanda || "") + " (" + newRegister + ")",
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.JUMAT_BERKAH, "jumatberkah");

      return createJsonResponse({
        status: "success",
        message: "Data Jumat Berkah berhasil ditambahkan dengan nomor register " + newRegister,
        data: {
          register: newRegister
        }
      });
    }

    // 11. Aksi UPDATE DATA JUMAT BERKAH (Panel Admin)
    if (action === "updateJumatBerkah") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const itemData = payload.data || payload;
      const targetRegister = String(itemData.register || "").trim().toUpperCase();
      if (!targetRegister) {
        return createJsonResponse({
          status: "error",
          message: "Nomor REGISTER wajib disertakan untuk memperbarui data."
        });
      }

      const sheet = getJumatBerkahSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "error",
          message: "Data Jumat Berkah kosong."
        });
      }

      const allRows = sheet.getRange(2, 1, lastRow - 1, JUMAT_BERKAH_HEADERS.length).getValues();
      let foundIndex = -1;
      for (let i = 0; i < allRows.length; i++) {
        if (String(allRows[i][0] || "").trim().toUpperCase() === targetRegister) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex === -1) {
        return createJsonResponse({
          status: "error",
          message: "Data Jumat Berkah dengan nomor register " + targetRegister + " tidak ditemukan."
        });
      }

      // Ganti dengan data baru (register tetap sama)
      allRows[foundIndex] = jumatBerkahObjectToRow_(itemData, targetRegister);

      // Tulis ulang penuh seluruh sheet terurut REGISTER DESC
      writeJumatBerkahRowsToSheet_(sheet, allRows);
      logHistory_({
        user: authUsername,
        aksi: "UBAH",
        dataset: "JUMAT_BERKAH",
        idRecord: targetRegister,
        ringkasan: "Ubah data Jumat Berkah: " + targetRegister,
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.JUMAT_BERKAH, "jumatberkah");

      return createJsonResponse({
        status: "success",
        message: "Data Jumat Berkah register " + targetRegister + " berhasil diperbarui.",
        data: {
          register: targetRegister
        }
      });
    }

    // 12. Aksi DELETE DATA JUMAT BERKAH (Panel Admin)
    if (action === "deleteJumatBerkah") {
      const token = payload.token || (payload.data && payload.data.token);
      const authUsername = validateSessionToken(token);
      if (!authUsername) {
        return unauthorizedResponse();
      }

      const targetRegister = String(payload.register || (payload.data && payload.data.register) || "").trim().toUpperCase();
      if (!targetRegister) {
        return createJsonResponse({
          status: "error",
          message: "Nomor REGISTER wajib disertakan untuk penghapusan."
        });
      }

      const sheet = getJumatBerkahSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          status: "error",
          message: "Data Jumat Berkah tidak ditemukan."
        });
      }

      const allRows = sheet.getRange(2, 1, lastRow - 1, JUMAT_BERKAH_HEADERS.length).getValues();
      const remainingRows = [];
      let found = false;
      for (let i = 0; i < allRows.length; i++) {
        if (String(allRows[i][0] || "").trim().toUpperCase() === targetRegister) {
          found = true;
        } else {
          remainingRows.push(allRows[i]);
        }
      }

      if (!found) {
        return createJsonResponse({
          status: "error",
          message: "Data Jumat Berkah dengan register " + targetRegister + " tidak ditemukan."
        });
      }

      // Tulis ulang penuh seluruh sheet terurut REGISTER DESC
      writeJumatBerkahRowsToSheet_(sheet, remainingRows);
      logHistory_({
        user: authUsername,
        aksi: "HAPUS",
        dataset: "JUMAT_BERKAH",
        idRecord: targetRegister,
        ringkasan: "Hapus data Jumat Berkah: " + targetRegister,
        sumber: "admin-panel"
      });
      invalidateDataset_(SERVER_CACHE_KEYS.JUMAT_BERKAH, "jumatberkah");

      return createJsonResponse({
        status: "success",
        message: "Data Jumat Berkah " + targetRegister + " berhasil dihapus."
      });
    }

    return createJsonResponse({
      status: "error",
      message: "Aksi tidak dikenali: " + action
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

/**
 * Jalankan fungsi ini SEKALI dari Apps Script Editor (toolbar Run)
 * untuk memberikan izin scope Google Drive PENUH (Read & Write / createFile)
 * pada akun pemilik script.
 */
function authorizeDriveAccess() {
  try {
    const folder = DriveApp.getFolderById(SLIDESHOW_FOLDER_ID);
    Logger.log("1/2. Akses folder OK: " + folder.getName() + " (ID: " + folder.getId() + ")");

    // Tes createFile secara langsung untuk memaksa otorisasi scope write (https://www.googleapis.com/auth/drive)
    const testBlob = Utilities.newBlob("khitan-damai-auth-test", "text/plain", "_kd_auth_test.txt");
    const testFile = folder.createFile(testBlob);
    const testFileId = testFile.getId();
    Logger.log("2/2. Tes createFile OK! File ID sementara: " + testFileId);

    // Bersihkan file tes ke sampah
    testFile.setTrashed(true);
    Logger.log("✓ File tes berhasil dipindahkan ke trash.");

    const successMsg = "SUKSES: Otorisasi Google Drive Penuh (Read + Write) Berhasil!";
    Logger.log("==================================================");
    Logger.log(successMsg);
    Logger.log("==================================================");
    return successMsg;
  } catch (err) {
    Logger.log("==================================================");
    Logger.log("GAGAL OTORISASI DRIVE: " + err.message);
    Logger.log("==================================================");
    throw err;
  }
}

/**
 * Jalankan fungsi ini SEKALI dari Apps Script Editor (toolbar Run)
 * untuk memberikan izin scope UrlFetchApp (https://www.googleapis.com/auth/script.external_request)
 * untuk pengiriman notifikasi Telegram otomatis.
 */
function authorizeExternalRequests() {
  try {
    const res = UrlFetchApp.fetch("https://api.telegram.org", { muteHttpExceptions: true });
    const successMsg = "SUKSES: Otorisasi UrlFetchApp (External Request) Berhasil! Status HTTP: " + res.getResponseCode();
    Logger.log("==================================================");
    Logger.log(successMsg);
    Logger.log("==================================================");
    return successMsg;
  } catch (err) {
    Logger.log("==================================================");
    Logger.log("GAGAL OTORISASI EXTERNAL REQUEST: " + err.message);
    Logger.log("==================================================");
    throw err;
  }
}

/**
 * Jalankan fungsi ini SEKALI dari Apps Script Editor (toolbar Run)
 * untuk memberikan izin scope Gmail (https://www.googleapis.com/auth/gmail.modify)
 * pada akun pemilik script, sekaligus langsung memasang trigger background otomatis
 * dan memindai ulasan Google Review yang ada.
 */
function authorizeGmailAccess() {
  try {
    Logger.log("==================================================");
    Logger.log("1/4. Memverifikasi izin akses Gmail & menyimpan akun email...");
    const unreadCount = GmailApp.getInboxUnreadCount();
    let ownerEmail = "denluckyman@gmail.com";
    try {
      ownerEmail = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail() || "denluckyman@gmail.com";
    } catch (eMail) {}

    const props = PropertiesService.getScriptProperties();
    if (props) {
      props.setProperty("KD_SCRIPT_OWNER_EMAIL", ownerEmail);
      props.setProperty("KD_AUTO_TRIGGERS_INSTALLED", "true");
    }
    Logger.log("✓ Akses Gmail Berhasil! Email: " + ownerEmail + " | Inbox unread: " + unreadCount);

    Logger.log("2/4. Memasang & memastikan pemicu otomatis (Time-driven Triggers)...");
    const trRes = ensureAutomaticTriggers_();
    Logger.log("✓ Status pemicu: " + JSON.stringify(trRes));

    Logger.log("3/4. Mengosongkan riwayat cache ulasan lama...");
    if (props) {
      props.deleteProperty("KD_PROCESSED_REVIEW_MSG_IDS");
    }

    Logger.log("4/4. Memindai ulasan Google Review di Gmail & mengirim notifikasi ke Telegram & Email...");
    const scanRes = checkGoogleReviewsAndNotify_(true);
    Logger.log("✓ Hasil pemindaian ulasan: " + JSON.stringify(scanRes));

    const successMsg = "SUKSES BESAR!\n" +
      "1. Izin Gmail berhasil diotorisasi (Akun: " + ownerEmail + ").\n" +
      "2. Pemicu otomatis tiap 10 menit telah AKTIF.\n" +
      "3. Hasil cek ulasan: " + (scanRes.found || 0) + " ulasan baru dikirim ke Telegram & Email.";
    Logger.log("==================================================");
    Logger.log(successMsg);
    Logger.log("==================================================");
    return successMsg;
  } catch (err) {
    Logger.log("==================================================");
    Logger.log("GAGAL OTORISASI GMAIL: " + err.message);
    Logger.log("==================================================");
    throw err;
  }
}

/**
 * Utilitas Uji Coba: Registrasi Bot Commands ke Telegram API
 */
function testRegisterTelegramCommands() {
  const res = registerTelegramBotCommands_();
  Logger.log("Hasil pendaftaran bot commands: " + JSON.stringify(res));
  return res;
}

/**
 * Utilitas Uji Coba: Notifikasi Pengingat Pasien Telegram H-24 & H-2
 */
function testPatientReminderNotification(targetPhone) {
  const phone = targetPhone || "081222531978";
  const dummyItem = {
    idBooking: "KD-TEST-001",
    namaAnanda: "Muhammad Fathan (Simulasi)",
    namaPenanggungJawab: "Hendra Wijaya",
    hubunganKeluarga: "Ayah",
    nomorHp: phone,
    tanggalKhitan: Utilities.formatDate(new Date(Date.now() + 86400000), "Asia/Jakarta", "yyyy-MM-dd"),
    jamKhitan: "09:00 WIB",
    metodeKhitan: "Super Sealer Modern"
  };

  Logger.log("Menguji notifikasi H-24 ke: " + phone);
  const res24 = sendPatientH24ReminderTelegram_(dummyItem);
  Logger.log("Hasil H-24: " + res24);

  Logger.log("Menguji notifikasi H-2 ke: " + phone);
  const res2 = sendPatientH2ReminderTelegram_(dummyItem, 2);
  Logger.log("Hasil H-2: " + res2);

  return { h24: res24, h2: res2 };
}

/**
 * Utilitas Uji Coba: Notifikasi Panduan Pasca-Khitan (Aftercare) & Google Review
 */
function testAftercareNotification(bookingId) {
  const id = bookingId || "KD-TEST-001";
  const dummyData = {
    idBooking: id,
    namaAnanda: "Muhammad Fathan (Simulasi)",
    namaPenanggungJawab: "Hendra Wijaya",
    hubunganKeluarga: "Ayah",
    nomorHp: "081222531978",
    metodeKhitan: "Super Sealer Modern"
  };

  // Bersihkan properti agar bisa diuji coba berulang
  const props = PropertiesService.getScriptProperties();
  if (props) props.deleteProperty("aftercare_sent_" + id);

  const res = sendAftercareTelegramIfEligible_(id, dummyData);
  Logger.log("Hasil aftercare notification: " + res);
  return { success: res };
}
