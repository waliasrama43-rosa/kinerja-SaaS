// ====================================================================
// FILE 09: PUSAT DIAGNOSTIK & PERAWATAN WEBHOOK (ALAT BANTU SETUP)
// ====================================================================
// Cara pakai: buka editor Apps Script, pilih fungsi di bawah ini pada
// dropdown, klik "Run", lalu lihat hasilnya di menu "Execution log".
// ====================================================================

/**
 * LANGKAH 1 — JALANKAN INI PERTAMA KALI.
 * Memeriksa seluruh syarat agar bot bisa merespon dan mencetak laporan
 * yang sangat jelas di Execution log. Fungsi ini TIDAK mengubah apa pun.
 */
function cekKesehatanSistem() {
  var L = [];
  L.push("===== LAPORAN KESEHATAN SISTEM KINERJA RHK =====");

  // --- 1. Apakah script terikat (bound) ke Spreadsheet? ---
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    L.push("❌ FATAL: SpreadsheetApp.getActiveSpreadsheet() = null.");
    L.push("   Script ini TIDAK terikat ke Google Sheet. Inilah penyebab bot diam.");
    L.push("   SOLUSI: Buat Google Sheet baru -> menu Extensions -> Apps Script,");
    L.push("           lalu tempel semua kode di project itu (jangan dari script.google.com).");
    console.log(L.join("\n"));
    return;
  }
  L.push("✅ Script terikat ke Spreadsheet: \"" + ss.getName() + "\"");
  L.push("   URL Sheet: " + ss.getUrl());

  // --- 2. Apakah semua sheet wajib sudah ada? ---
  var wajib = ["Pengaturan", "Client_SaaS", "RHK_Config", "Kamus_Placeholder", "Log_Sistem"];
  var adaYangHilang = false;
  wajib.forEach(function (nama) {
    if (ss.getSheetByName(nama)) {
      L.push("✅ Sheet ditemukan: " + nama);
    } else {
      L.push("❌ Sheet HILANG: " + nama);
      adaYangHilang = true;
    }
  });
  if (adaYangHilang) {
    L.push("");
    L.push("   SOLUSI: Jalankan fungsi setupStrukturDatabaseSaaS() sekali untuk membuat sheet.");
    console.log(L.join("\n"));
    return;
  }

  // --- 3. Apakah BOT_TOKEN & ADMIN_CHAT_ID terisi? ---
  var config;
  try {
    config = ambilKonfigurasiSaaS();
  } catch (e) {
    L.push("❌ Gagal membaca sheet Pengaturan: " + e.toString());
    console.log(L.join("\n"));
    return;
  }
  if (!config.BOT_TOKEN) {
    L.push("❌ BOT_TOKEN kosong di sheet Pengaturan.");
    console.log(L.join("\n"));
    return;
  }
  L.push("✅ BOT_TOKEN terisi (…" + String(config.BOT_TOKEN).slice(-6) + ")");
  L.push(config.ADMIN_CHAT_ID ? ("✅ ADMIN_CHAT_ID: " + config.ADMIN_CHAT_ID)
                              : "⚠️ ADMIN_CHAT_ID kosong (fitur admin tidak akan jalan).");

  // --- 4. Apakah token valid? (panggil getMe) ---
  try {
    var me = JSON.parse(UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getMe",
      { muteHttpExceptions: true }).getContentText());
    if (me.ok) {
      L.push("✅ Token VALID. Bot aktif: @" + me.result.username + " (" + me.result.first_name + ")");
    } else {
      L.push("❌ Token DITOLAK Telegram: " + me.description);
      L.push("   SOLUSI: cek ulang BOT_TOKEN dari @BotFather.");
    }
  } catch (e) {
    L.push("❌ Tidak bisa menghubungi Telegram (UrlFetch): " + e.toString());
  }

  // --- 5. Apakah Web App sudah ter-deploy & bagaimana status webhook? ---
  var urlExec = "";
  try { urlExec = ScriptApp.getService().getUrl(); } catch (e) {}
  if (urlExec) {
    var tipeUrl = urlExec.indexOf("/exec") !== -1 ? "/exec" : "/dev (HEAD — hanya utk tes manual)";
    L.push("✅ URL Web App runtime: " + urlExec + "  [" + tipeUrl + "]");
  } else {
    L.push("⚠️ Web App belum ter-deploy. Lakukan Deploy -> New deployment -> Web app.");
  }
  // URL /exec resmi untuk webhook (diambil dari sheet Pengaturan > WEBHOOK_URL)
  var urlWebhookResmi = _resolveUrlExec(config);
  if (urlWebhookResmi) {
    L.push("✅ URL webhook (sumber WEBHOOK_URL): " + urlWebhookResmi);
  } else {
    L.push("⚠️ WEBHOOK_URL '/exec' belum diisi di sheet Pengaturan. " +
           "Tempel URL Web App '/exec' ke sana lalu jalankan pasangWebhookOtomatis().");
  }

  try {
    var info = JSON.parse(UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getWebhookInfo",
      { muteHttpExceptions: true }).getContentText());
    if (info.ok) {
      var r = info.result;
      L.push("----- INFO WEBHOOK TELEGRAM -----");
      L.push("   URL terpasang : " + (r.url || "(KOSONG - belum diset!)"));
      L.push("   Pending update: " + r.pending_update_count);
      if (r.last_error_message) {
        L.push("   ❌ Error terakhir (" + new Date(r.last_error_date * 1000) + "): " + r.last_error_message);
        L.push("      Ini PETUNJUK UTAMA penyebab bot diam. Baca pesan error di atas.");
      } else {
        L.push("   ✅ Tidak ada error pengiriman terakhir dari Telegram.");
      }
      if (r.url && r.url.indexOf("/dev") !== -1) {
        L.push("   ❌ Webhook memakai URL '/dev' — Telegram TIDAK bisa mengaksesnya. " +
               "Pakai URL '/exec' lalu jalankan pasangWebhookOtomatis().");
      } else if (urlWebhookResmi && r.url && r.url !== urlWebhookResmi) {
        L.push("   ⚠️ URL webhook terpasang BERBEDA dengan WEBHOOK_URL di sheet. " +
               "Jalankan pasangWebhookOtomatis() agar sinkron.");
      }
    }
  } catch (e) {
    L.push("❌ Gagal getWebhookInfo: " + e.toString());
  }

  L.push("================================================");
  L.push("Selesai. Jika semua ✅ tapi bot masih diam: jalankan pasangWebhookOtomatis(),");
  L.push("lalu kirim /start ke bot. Jika perlu, jalankan kirimTesKeAdmin().");
  console.log(L.join("\n"));
}

/**
 * LANGKAH 2 — Pasang webhook otomatis ke URL Web App yang sedang aktif.
 * Wajib: Web App sudah di-deploy (Deploy -> New deployment -> Web app,
 * Execute as = Me, Who has access = Anyone).
 */
function pasangWebhookOtomatis() {
  var config = ambilKonfigurasiSaaS();
  var url    = _resolveUrlExec(config);

  if (!url) {
    console.log(
      "❌ URL '/exec' belum tersedia.\n\n" +
      "LANGKAH:\n" +
      "1. Deploy ▸ Manage deployments ▸ buka deployment Web App aktif\n" +
      "2. Salin URL yang DIAKHIRI '/exec'  (BUKAN '/dev')\n" +
      "3. Tempel ke sheet 'Pengaturan' baris kunci 'WEBHOOK_URL'\n" +
      "4. Jalankan ulang pasangWebhookOtomatis()");
    return;
  }
  if (url.indexOf("/exec") === -1) {
    console.log(
      "⚠️ URL terdeteksi BUKAN '/exec':\n   " + url + "\n\n" +
      "Telegram tidak bisa memakai URL '/dev' (butuh login). " +
      "Tempel URL '/exec' Web App ke sheet 'Pengaturan' > 'WEBHOOK_URL', lalu ulangi.");
    return;
  }

  var res = JSON.parse(UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(url) +
    "&drop_pending_updates=true",
    { muteHttpExceptions: true }).getContentText());
  console.log("Hasil setWebhook ke:\n  " + url + "\n\n" + JSON.stringify(res, null, 2));
  if (res.ok) console.log("\n✅ Webhook terpasang. Kirim /start ke bot untuk menguji.");
}

/**
 * Tentukan URL '/exec' untuk webhook.
 * Prioritas:
 *   1. Sheet 'Pengaturan' kunci 'WEBHOOK_URL' (cara paling andal — tempel URL /exec sekali)
 *   2. Runtime ScriptApp.getService().getUrl() HANYA bila sudah berupa /exec
 * Catatan: dari editor, getUrl() mengembalikan '/dev' (tak bisa dipakai webhook),
 *          karena itu sumber utama adalah WEBHOOK_URL di sheet.
 */
function _resolveUrlExec(config) {
  if (config && config.WEBHOOK_URL) {
    var u = config.WEBHOOK_URL.toString().trim();
    if (u.indexOf("https://") === 0 &&
        u.indexOf("/exec") !== -1 &&
        u.indexOf("ISI_DEPLOYMENT_ID") === -1) {
      return u;
    }
  }
  try {
    var svc = ScriptApp.getService().getUrl();
    if (svc && svc.indexOf("/exec") !== -1) return svc;
  } catch (e) {}
  return "";
}

/** Lihat status webhook saat ini beserta pesan error terakhir dari Telegram. */
function cekInfoWebhook() {
  var config = ambilKonfigurasiSaaS();
  var res = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getWebhookInfo",
    { muteHttpExceptions: true }).getContentText();
  console.log(JSON.stringify(JSON.parse(res), null, 2));
}

/** Hapus webhook (berguna saat ingin memasang ulang dari awal). */
function hapusWebhook() {
  var config = ambilKonfigurasiSaaS();
  var res = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.BOT_TOKEN + "/deleteWebhook?drop_pending_updates=true",
    { muteHttpExceptions: true }).getContentText();
  console.log(res);
}

/** Kirim pesan tes ke ADMIN_CHAT_ID untuk memastikan jalur kirim pesan berfungsi. */
function kirimTesKeAdmin() {
  var config = ambilKonfigurasiSaaS();
  if (!config.ADMIN_CHAT_ID) { console.log("ADMIN_CHAT_ID kosong."); return; }
  var res = kirimPesanSaaS(config.ADMIN_CHAT_ID,
    "🤖 *Tes Sistem Kinerja RHK*\nJika Anda menerima pesan ini, jalur pengiriman pesan bot sudah berfungsi normal. ✅",
    null, config.BOT_TOKEN);
  console.log("Status kirim: " + res.getResponseCode() + "\n" + res.getContentText());
}

/**
 * Endpoint kesehatan: buka URL /exec Web App di browser untuk memastikan
 * deployment hidup dan sudah terotorisasi. Tidak memengaruhi webhook.
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var status = ss ? ("OK - terikat ke: " + ss.getName()) : "PERINGATAN - script tidak terikat ke Spreadsheet";
  return HtmlService.createHtmlOutput(
    "<h2>Kinerja RHK Web App AKTIF</h2><p>" + status + "</p><p>Waktu server: " + new Date() + "</p>");
}
