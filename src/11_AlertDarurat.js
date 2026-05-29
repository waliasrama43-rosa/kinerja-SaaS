// ====================================================================
// FILE 11: SISTEM ALERT DARURAT KE ADMIN ("Ping" ala BBM)
// ====================================================================
// Tujuan: saat ada kejadian yang butuh aksi MANUAL segera (klien baru
// butuh aktivasi, bukti bayar butuh approve), bot mengirim notifikasi
// keras ke admin dan MENGULANGNYA otomatis sampai admin menekan tombol
// "Stop Alarm". Mirip fitur Ping! di BBM yang terus mengingatkan.
//
// Cara kerja:
//   1. kirimAlertDarurat()  → kirim 1x + simpan "tugas pengingat" di Properties
//   2. prosesAlertDaruratTertunda() → dipanggil worker antrian tiap 1 menit;
//      mengirim ulang bila jeda interval terlampaui, sampai jatah ulang habis
//   3. Admin tekan "Stop Alarm" → callback ALERT_ACK_<id> menghapus tugas
//
// Catatan penting soal "berbunyi walau silent":
//   Bot TIDAK bisa menembus mode senyap/DND OS HP. Agar benar-benar
//   menerobos, admin perlu mengatur chat bot di Telegram:
//     Android: chat bot ▸ Notifikasi ▸ "Bypass Do Not Disturb" + Suara khusus
//     iOS    : chat bot ▸ Notifikasi kustom + kecualikan dari Focus/DND
//   Untuk "berdering" seperti telepon, gunakan integrasi panggilan suara
//   (mis. CallMeBot) — lihat fungsi opsional di bawah.
// ====================================================================

// Ambil parameter alert (prioritas sheet Pengaturan, fallback SAAS_CONFIG)
function _alertParams(config) {
  var maxU = parseInt((config && config.ALERT_ULANG_MAX) || SAAS_CONFIG.ALERT_ULANG_MAX || 5);
  var intv = parseInt((config && config.ALERT_ULANG_INTERVAL_MENIT) ||
                       SAAS_CONFIG.ALERT_ULANG_INTERVAL_MENIT || 2);
  if (isNaN(maxU) || maxU < 1) maxU = 5;
  if (isNaN(intv) || intv < 1) intv = 2;
  return { maxUlang: maxU, intervalMenit: intv };
}

// ── API UTAMA: picu alert darurat ────────────────────────────────
// opts.tombolAksi : array tombol inline (1 baris) untuk aksi cepat, mis.
//                   [{"text":"✅ Aktifkan","callback_data":"ADM_AKTIFKAN_123"}]
function kirimAlertDarurat(config, judul, detail, opts) {
  opts = opts || {};
  var p  = _alertParams(config);
  var id = "AL" + Date.now() + Math.floor(Math.random() * 1000);

  var rows = [];
  if (opts.tombolAksi) rows.push(opts.tombolAksi);
  rows.push([{ "text": "🔕 Stop Alarm / Sudah Ditangani", "callback_data": "ALERT_ACK_" + id }]);
  var kb = { "inline_keyboard": rows };

  // Kirim pertama kali (sisa ulang = maxUlang)
  _kirimAlertSekali(config, _formatAlert(judul, detail, p.maxUlang, false), kb);

  // Simpan tugas pengingat untuk eskalasi
  try {
    PropertiesService.getScriptProperties().setProperty("alert_" + id, JSON.stringify({
      judul   : judul,
      detail  : detail,
      sisa    : p.maxUlang,
      interval: p.intervalMenit,
      last    : Date.now(),
      kb      : kb
    }));
  } catch (e) {
    _logSistem("ERR_ALERT_SIMPAN", id + " | " + e.toString());
  }
  return id;
}

// ── Dipanggil worker antrian tiap 1 menit (lihat 09_QueueEngine) ──
function prosesAlertDaruratTertunda(config) {
  var props = PropertiesService.getScriptProperties();
  var semua;
  try { semua = props.getProperties(); } catch (e) { return; }
  var now = Date.now();

  for (var key in semua) {
    if (key.indexOf("alert_") !== 0) continue;

    var a;
    try { a = JSON.parse(semua[key]); }
    catch (eParse) { props.deleteProperty(key); continue; }

    if (!a || a.sisa <= 0) { props.deleteProperty(key); continue; }
    if (now - a.last < a.interval * 60000) continue;   // belum waktunya mengulang

    a.sisa -= 1;
    a.last  = now;
    _kirimAlertSekali(config, _formatAlert(a.judul, a.detail, a.sisa, true), a.kb);

    if (a.sisa <= 0) props.deleteProperty(key);          // jatah habis → berhenti
    else             props.setProperty(key, JSON.stringify(a));
  }
}

// ── Admin menekan "Stop Alarm" → matikan pengingat ───────────────
function matikanAlertDarurat(alertId, adminChatId, config) {
  PropertiesService.getScriptProperties().deleteProperty("alert_" + alertId);
  kirimPesanSaaS(adminChatId,
    "🔕 *Alarm dimatikan.* Terima kasih sudah menangani. ✅",
    null, config.BOT_TOKEN);
}

// ── Helper internal ──────────────────────────────────────────────
function _formatAlert(judul, detail, sisaUlang, isUlangan) {
  return "🚨🚨🚨 *DARURAT — " + judul + "* 🚨🚨🚨\n" +
    (isUlangan ? "🔁 _Pengingat berulang (belum ditangani)_\n" : "") +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    detail + "\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "👉 Tekan *Stop Alarm* setelah ditangani." +
    (sisaUlang > 0
      ? "\n_Akan diingatkan lagi hingga " + sisaUlang + "x bila dibiarkan._"
      : "\n_(Pengingat terakhir — tidak diulang lagi.)_");
}

function _kirimAlertSekali(config, teks, kb) {
  try {
    UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendMessage",
      { "method": "post", "contentType": "application/json",
        "payload": JSON.stringify({
          "chat_id"             : config.ADMIN_CHAT_ID.toString(),
          "text"                : teks,
          "parse_mode"          : "Markdown",
          "disable_notification": false,   // pastikan notifikasi + suara aktif
          "reply_markup"        : kb
        }),
        "muteHttpExceptions": true });
  } catch (e) {
    _logSistem("ERR_ALERT_KIRIM", e.toString());
  }
}

// ── OPSIONAL: panggilan suara via CallMeBot (berdering walau silent) ──
// Aktifkan dengan mengisi sheet Pengaturan:
//   ALERT_CALL_AKTIF = TRUE
//   ALERT_CALL_NOMOR = nomor HP admin format internasional (mis. 6285100062524)
// Lalu daftar sekali di https://www.callmebot.com (gratis untuk pemakaian wajar).
// Panggilan telepon umumnya tetap berdering meski HP dalam mode senyap.
function picuPanggilanDaruratOpsional(config, pesanSingkat) {
  if (!config || String(config.ALERT_CALL_AKTIF).toUpperCase() !== "TRUE") return false;
  var nomor = config.ALERT_CALL_NOMOR;
  if (!nomor) return false;
  try {
    var url = "https://api.callmebot.com/start.php?source=web&user=@" +
      "&text=" + encodeURIComponent(pesanSingkat || "Ada permintaan darurat di bot Kinerja RHK") +
      "&lang=id-ID&rpt=2";
    UrlFetchApp.fetch(url, { "muteHttpExceptions": true });
    return true;
  } catch (e) {
    _logSistem("ERR_ALERT_CALL", e.toString());
    return false;
  }
}

// ── Tes cepat dari editor Apps Script ────────────────────────────
function tesAlertDarurat() {
  var config = ambilKonfigurasiSaaS();
  var id = kirimAlertDarurat(config,
    "TES ALERT",
    "Ini hanya uji coba sistem alert darurat.\nTekan Stop Alarm untuk menghentikan.",
    { tombolAksi: [{ "text": "👁️ Contoh Aksi", "callback_data": "HUBUNGI_ADMIN" }] });
  Logger.log("Alert terkirim dengan ID: " + id + ". Cek Telegram admin.");
}
