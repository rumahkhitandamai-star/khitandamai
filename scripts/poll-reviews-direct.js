const https = require('https');

const GOOGLE_MAPS_FEATURE_ID = "0x2e693c78f4580f35:0xa5ec9fb14f5140b5";
const GOOGLE_REVIEW_PAGE_URL = "https://www.google.co.id/search?sca_esv=47d3a503fd7b42d7&output=search&q=Rumah+Khitan+Damai&ludocid=11956106694650577077&lsig=AB86z5VxZiMPhsIh3gsUvrMYbXGw&sa=X&ved=2ahUKEwiv5syJga6UAxXtd2wGHZtNK40Qj9IGegQIExAG#ebo=0";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8582652009:AAHoB81ErIc_oN4e6Kr7a3sdx2c7z029bpA";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8746493929";

function fetchReviews(limit = 20) {
  return new Promise((resolve, reject) => {
    const inner = new Array(12).fill(null);
    inner[1] = 2; // Newest first
    inner[9] = limit;
    inner[11] = [GOOGLE_MAPS_FEATURE_ID];
    const payload = [null, new Array(9).fill(null).concat([inner])];
    const jsonStr = JSON.stringify(payload);
    const cb = Date.now().toString() + "_" + Math.floor(Math.random() * 1000000);
    const url = "https://www.google.co.id/httpservice/web/PrivateLocalSearchUiDataService/GetLocalBoqProxy?msc=gwsrpc&hl=id&_cb=" + cb + "&reqpld=" + encodeURIComponent(jsonStr);

    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache"
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const cleanJson = body.replace(/^\)\]\}'\s*/, "");
          const data = JSON.parse(cleanJson);
          const rawList = (data && data[1] && data[1][10] && Array.isArray(data[1][10][2])) ? data[1][10][2] : [];
          const reviews = [];
          for (let i = 0; i < rawList.length; i++) {
            const item = rawList[i];
            if (!item) continue;
            const reviewId = String(item[5] || ("gmap_rev_" + (item[3] ? item[3][0] : i)));
            const rating = (typeof item[1] === "number") ? item[1] : 5;
            const authorName = (item[3] && item[3][0]) ? String(item[3][0]).trim() : "Pengguna Google";
            const authorPhoto = (item[3] && item[3][1]) ? String(item[3][1]) : "";
            const timeAgo = (item[2] && item[2][0]) ? String(item[2][0]) : "";
            let epochMs = 0;
            if (item[2] && item[2][2]) {
              epochMs = parseInt(item[2][2], 10) || 0;
            }
            let commentText = "";
            if (item[27] && typeof item[27] === "string") commentText = item[27];
            else if (item[28] && typeof item[28] === "string") commentText = item[28];
            commentText = commentText.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();

            reviews.push({
              id: reviewId,
              reviewerName: authorName,
              rating: rating,
              comment: commentText,
              epochMs: epochMs,
              timeAgo: timeAgo,
              authorPhoto: authorPhoto
            });
          }
          resolve(reviews);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function sendTelegramNotification(review) {
  return new Promise((resolve) => {
    const starsNum = Math.max(1, Math.min(5, parseInt(review.rating || 5, 10)));
    const starsIcon = "⭐".repeat(starsNum) + "☆".repeat(5 - starsNum);
    const ratingDisplay = starsIcon + " (" + starsNum + "/5 Bintang)";

    const text = "⭐ <b>ULASAN GOOGLE REVIEW BARU DITERIMA!</b> ⭐\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "📍 <b>Profil:</b> Rumah Khitan Damai Subang\n" +
      "🌐 <b>Sumber:</b> Google Maps (Real-time) ✅\n" +
      "👤 <b>Pengulas:</b> <b>" + review.reviewerName + "</b>\n" +
      "🌟 <b>Penilaian:</b> " + ratingDisplay + "\n" +
      "📅 <b>Waktu:</b> " + (review.timeAgo ? review.timeAgo : "Baru saja") + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "💬 <b>Isi Ulasan:</b>\n" +
      (review.comment ? ("<i>\"" + review.comment + "\"</i>") : "<i>(Pengulas memberikan rating bintang tanpa ulasan tertulis)</i>") + "\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "💡 <i>Ulasan baru terdeteksi secara real-time dari profil Google Review Rumah Khitan Damai.</i>";

    const payload = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "⭐ Buka di Google Review",
              url: GOOGLE_REVIEW_PAGE_URL
            }
          ],
          [
            {
              text: "🔄 Cek 10 Ulasan Terbaru",
              callback_data: "cb_review_force"
            }
          ]
        ]
      }
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`Telegram response for ${review.reviewerName}:`, res.statusCode);
        resolve({ ok: res.statusCode === 200 });
      });
    });

    req.on('error', err => {
      console.error('Telegram send error:', err);
      resolve({ ok: false, error: err });
    });

    req.write(payload);
    req.end();
  });
}

function fetchGasProcessedIds() {
  return new Promise((resolve) => {
    const url = "https://script.google.com/macros/s/AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs/exec?action=testFetchLive";
    function doGet(targetUrl) {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location);
          return;
        }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(Array.isArray(data.processedIds) ? data.processedIds : []);
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    }
    doGet(url);
  });
}

function recordReviewInGas(reviewId) {
  return new Promise((resolve) => {
    const url = "https://script.google.com/macros/s/AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs/exec?action=markReviewProcessed&reviewId=" + encodeURIComponent(reviewId);
    function doGet(targetUrl) {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location);
          return;
        }
        res.resume();
        res.on('end', () => resolve());
      }).on('error', () => resolve());
    }
    doGet(url);
  });
}

function triggerGasPoll() {
  return new Promise((resolve) => {
    const url = "https://script.google.com/macros/s/AKfycbwauluf8oZX58tJl14StNtwzknkB5jY8jI4Gofk_ssmhgXrBw7V-aNjYtYdPu-6yZs/exec?action=pollReviewTrigger";
    function doGet(targetUrl) {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location);
          return;
        }
        res.resume();
        res.on('end', () => resolve());
      }).on('error', () => resolve());
    }
    doGet(url);
  });
}

async function main() {
  console.log("=== MEMULAI MONITOR REAL-TIME GOOGLE REVIEWS ===");
  const [reviews, processedIds] = await Promise.all([
    fetchReviews(20),
    fetchGasProcessedIds()
  ]);

  console.log(`Berhasil mengambil ${reviews.length} ulasan dari Google Maps.`);
  console.log(`Jumlah ID ulasan yang sudah tercatat di sistem: ${processedIds.length}`);

  if (reviews.length === 0) {
    console.log("Tidak ada ulasan ditemukan dari Google Maps.");
    return;
  }

  console.log(`Ulasan teratas saat ini: "${reviews[0].reviewerName}" (${reviews[0].rating}*) - ${reviews[0].timeAgo}: "${reviews[0].comment}"`);

  let newCount = 0;
  const nowMs = Date.now();
  for (const rev of reviews) {
    if (!processedIds.includes(rev.id)) {
      const isRecent = rev.epochMs > 0
        ? ((nowMs - rev.epochMs) < (48 * 60 * 60 * 1000))
        : (rev.timeAgo.includes("jam") || rev.timeAgo.includes("menit") || rev.timeAgo.includes("hari"));

      if (isRecent) {
        console.log(`🚨 DITEMUKAN ULASAN BARU: ${rev.reviewerName} (${rev.rating}*) - ${rev.timeAgo} | ID: ${rev.id}`);
        await sendTelegramNotification(rev);
        newCount++;
      } else {
        console.log(`Menandai ulasan lama sebagai tercatat: ${rev.reviewerName} (${rev.timeAgo})`);
      }
      await recordReviewInGas(rev.id);
    }
  }

  if (newCount === 0) {
    console.log("✓ Semua ulasan sudah dinotifikasikan sebelumnya.");
  } else {
    console.log(`✓ Berhasil mengirim ${newCount} notifikasi ulasan baru ke Bot Telegram.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
