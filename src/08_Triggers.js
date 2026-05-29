// ====================================================================
// FILE 08: OTOMATISASI MESIN WAKTU — CRON JOBS & TRIGGERS (REVISI V3)
// ====================================================================
//
// DAFTAR TRIGGER YANG PERLU DIPASANG (jalankan pasangSemuaTrigger() SEKALI):
//
//  Fungsi                        Jadwal          Keterangan
//  ─────────────────────────────────────────────────────────────
//  resetLimitHarianOtonom        Tiap hari 00:00  Reset jatah cetak harian
//  cekDanKirimWarningMasaAktif   Tiap hari 08:00  Kirim peringatan H-7, H-3, H-0
//  cekDanAutoBlockExpired        Tiap hari 08:30  Auto-blokir akun yang sudah expired
//
// ====================================================================


// ====================================================================
// 1. RESET LIMIT HARIAN (00:00 WIB)
// ====================================================================
function resetLimitHarianOtonom() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Client_SaaS");
  if (!sheet) return;

  var data      = sheet.getDataRange().getValues();
  var colLimit  = data[0].indexOf("Limit_Harian");
  var colStatus = data[0].indexOf("Status_Akses");

  var jatahHarian = 5; // ← Ganti angka ini sesuai kebutuhan

  var resetCount = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][colStatus] === "AKTIF") {
      sheet.getRange(i + 1, colLimit + 1).setValue(jatahHarian);
      resetCount++;
    }
  }

  var logSheet = ss.getSheetByName("Log_Sistem");
  if (logSheet) {
    logSheet.appendRow([
      new Date(), "RESET_LIMIT",
      "Reset limit harian " + resetCount + " klien aktif → " + jatahHarian + " cetak/hari."
    ]);
  }
}


// ====================================================================
// 2. WARNING MASA AKTIF — H-7, H-3, H-0 (08:00 WIB)
// ====================================================================
// Logika:
//   - Cek semua klien AKTIF
//   - Hitung sisa hari (masa_aktif - sekarang)
//   - Jika sisa == 7 dan Warning_Sent tidak mengandung "7" → kirim warning H-7
//   - Jika sisa == 3 dan Warning_Sent tidak mengandung "3" → kirim warning H-3
//   - Jika sisa == 0 dan Warning_Sent tidak mengandung "0" → kirim warning H-0
//   - Simpan flag ke kolom Warning_Sent agar tidak dikirim 2x
// ====================================================================
function cekDanKirimWarningMasaAktif() {
  var config = ambilKonfigurasiSaaS();
  var token  = config.BOT_TOKEN;
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var sheet  = ss.getSheetByName("Client_SaaS");
  if (!sheet) return;

  var data       = sheet.getDataRange().getValues();
  var colChatId  = data[0].indexOf("Chat_ID");
  var colNama    = data[0].indexOf("Nama_Pendaftar");
  var colStatus  = data[0].indexOf("Status_Akses");
  var colExpiry  = data[0].indexOf("Masa_Aktif");
  var colNoWA    = data[0].indexOf("No_WA");
  var colWarning = data[0].indexOf("Warning_Sent");

  var sekarang = new Date();
  sekarang.setHours(0, 0, 0, 0); // normalisasi ke awal hari

  var terkirim = 0;

  for (var i = 1; i < data.length; i++) {
    if (data[i][colStatus] !== "AKTIF") continue;
    if (!data[i][colExpiry])            continue;

    var expiry = new Date(data[i][colExpiry]);
    expiry.setHours(0, 0, 0, 0);

    var sisaMs   = expiry - sekarang;
    var sisaHari = Math.round(sisaMs / (1000 * 60 * 60 * 24));

    // Hanya proses H-7, H-3, H-0
    if ([7, 3, 0].indexOf(sisaHari) === -1) continue;

    var chatId      = data[i][colChatId].toString();
    var nama        = data[i][colNama]    || "Bapak/Ibu";
    var noWA        = data[i][colNoWA]    ? data[i][colNoWA].toString() : "";
    var warningSent = data[i][colWarning] ? data[i][colWarning].toString() : "";
    var flagKey     = sisaHari.toString(); // "7", "3", atau "0"

    // Sudah dikirim untuk milestone ini → lewati
    if (warningSent.indexOf(flagKey) !== -1) continue;

    // ── Susun pesan sesuai milestone ──────────────────────────────
    var teksWarning = "";
    var kbWarning   = {"inline_keyboard": [
      [{"text": "💎 Perpanjang Sekarang",  "callback_data": "SHORTCUT_BAYAR"}],
      [{"text": "📞 Hubungi Admin",         "callback_data": "HUBUNGI_ADMIN"}]
    ]};

    if (sisaHari === 7) {
      teksWarning =
        "⏰ *Pengingat Masa Aktif — 7 Hari Lagi* ⏰\n\n" +
        "Halo Pak/Bu *" + nama + "*! 👋\n\n" +
        "Kami ingin mengingatkan bahwa masa aktif paket premium Anda akan berakhir " +
        "dalam *7 hari lagi*, tepatnya pada *" +
        Utilities.formatDate(expiry, "GMT+7", "dd MMMM yyyy") + "*.\n\n" +
        "Untuk menjaga kelancaran pelaporan RHK Anda tanpa gangguan, yuk segera " +
        "lakukan perpanjangan sebelum kehabisan masa aktif! 🙏\n\n" +
        "Ketuk tombol *Perpanjang Sekarang* di bawah atau ketik /bayar.";

    } else if (sisaHari === 3) {
      teksWarning =
        "⚠️ *PERINGATAN — Masa Aktif Tersisa 3 Hari!* ⚠️\n\n" +
        "Halo Pak/Bu *" + nama + "*! 🔔\n\n" +
        "Masa aktif akun premium Anda *hanya tersisa 3 hari lagi* " +
        "(berakhir: *" + Utilities.formatDate(expiry, "GMT+7", "dd MMMM yyyy") + "*).\n\n" +
        "Jangan sampai pelaporan RHK Anda terganggu! Segera perpanjang sekarang " +
        "agar akses tetap aktif tanpa putus. 💡\n\n" +
        "Ketuk tombol di bawah atau ketik /bayar:";

    } else if (sisaHari === 0) {
      teksWarning =
        "🔴 *PERINGATAN AKHIR — Masa Aktif Berakhir HARI INI!* 🔴\n\n" +
        "Pak/Bu *" + nama + "*, masa aktif paket premium Anda berakhir *HARI INI* " +
        "(" + Utilities.formatDate(expiry, "GMT+7", "dd MMMM yyyy") + ").\n\n" +
        "Setelah tengah malam, akses pelaporan RHK Anda akan *otomatis dinonaktifkan* " +
        "oleh sistem jika belum diperpanjang.\n\n" +
        "⚡ Perpanjang *sekarang juga* agar tidak ada data yang terlewat!";
    }

    // Kirim pesan via Telegram bot
    try {
      kirimPesanSaaS(chatId, teksWarning, kbWarning, token);

      // Simpan flag agar tidak dikirim ulang
      var flagBaru = warningSent ? warningSent + "," + flagKey : flagKey;
      sheet.getRange(i + 1, colWarning + 1).setValue(flagBaru);
      terkirim++;

      // ── Notif ke admin juga ──────────────────────────────────────
      var noWAAdmin = noWA || "Tidak tersedia";
      var pesanWALink = buatLinkWA(noWA,
        "Halo Pak/Bu " + nama + ", masa aktif bot RHK Anda " +
        (sisaHari === 0 ? "berakhir HARI INI" : "tersisa " + sisaHari + " hari") +
        ". Ketik /bayar di bot untuk perpanjangan. Terima kasih 🙏");

      var kbAdminNotif = {"inline_keyboard": []};
      if (pesanWALink) {
        kbAdminNotif.inline_keyboard.push([{
          "text": "💬 WA " + nama, "url": pesanWALink
        }]);
      }
      kbAdminNotif.inline_keyboard.push([{
        "text": "📊 Follow Up Detail", "callback_data": "ADM_FU_" + chatId
      }]);

      kirimPesanSaaS(config.ADMIN_CHAT_ID,
        "🔔 *Notif Warning H-" + sisaHari + " Terkirim*\n\n" +
        "👤 *" + nama + "* (`" + chatId + "`)\n" +
        "📱 No. WA: `" + noWAAdmin + "`\n" +
        "📅 Expired: *" + Utilities.formatDate(expiry, "GMT+7", "dd/MM/yyyy") + "*",
        kbAdminNotif, token);

    } catch(eWarn) {
      var logSheet = ss.getSheetByName("Log_Sistem");
      if (logSheet) {
        logSheet.appendRow([new Date(), "WARN_ERROR",
          "Gagal kirim warning H-" + sisaHari + " ke " + chatId + ": " + eWarn.toString()]);
      }
    }

    Utilities.sleep(300); // jeda antar pengiriman
  }

  var logSheet2 = ss.getSheetByName("Log_Sistem");
  if (logSheet2 && terkirim > 0) {
    logSheet2.appendRow([new Date(), "WARNING_SENT",
      "Terkirim " + terkirim + " pesan warning masa aktif."]);
  }
}


// ====================================================================
// 3. AUTO-BLOCK EXPIRED (08:30 WIB)
// ====================================================================
// Logika:
//   - Cek semua klien AKTIF
//   - Jika masa_aktif < sekarang (sudah lewat) → ubah status NONAKTIF
//   - Kirim notifikasi ke klien + admin
//   - Simpan catatan di kolom Catatan_Admin
// ====================================================================
function cekDanAutoBlockExpired() {
  var config = ambilKonfigurasiSaaS();
  var token  = config.BOT_TOKEN;
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var sheet  = ss.getSheetByName("Client_SaaS");
  if (!sheet) return;

  var data        = sheet.getDataRange().getValues();
  var colChatId   = data[0].indexOf("Chat_ID");
  var colNama     = data[0].indexOf("Nama_Pendaftar");
  var colStatus   = data[0].indexOf("Status_Akses");
  var colExpiry   = data[0].indexOf("Masa_Aktif");
  var colCatatan  = data[0].indexOf("Catatan_Admin");
  var colWarning  = data[0].indexOf("Warning_Sent");

  var sekarang = new Date();
  var terblokir = 0;

  for (var i = 1; i < data.length; i++) {
    if (data[i][colStatus] !== "AKTIF") continue;
    if (!data[i][colExpiry])            continue;

    var expiry   = new Date(data[i][colExpiry]);
    var chatId   = data[i][colChatId].toString();
    var nama     = data[i][colNama] || "Bapak/Ibu";

    // Expired jika masa_aktif sudah terlewati lebih dari 1 hari penuh
    // (Toleransi 1 hari agar tidak block di hari yang sama dengan H-0 warning)
    if (expiry >= sekarang) continue;

    // Sudah expired → nonaktifkan
    sheet.getRange(i + 1, colStatus  + 1).setValue("NONAKTIF");
    sheet.getRange(i + 1, colCatatan + 1).setValue(
      "Expired otomatis: " + Utilities.formatDate(expiry, "GMT+7", "dd/MM/yyyy")
    );
    sheet.getRange(i + 1, colWarning + 1).setValue("BLOCKED");
    terblokir++;

    // Notifikasi ke klien
    var kbExpired = {"inline_keyboard": [
      [{"text": "💎 Perpanjang Sekarang", "callback_data": "SHORTCUT_BAYAR"}],
      [{"text": "📞 Hubungi Admin",        "callback_data": "HUBUNGI_ADMIN"}]
    ]};
    try {
      kirimPesanSaaS(chatId,
        "🔒 *Akses Premium Anda Telah Berakhir*\n\n" +
        "Halo Pak/Bu *" + nama + "*, masa aktif paket premium Anda telah berakhir " +
        "pada *" + Utilities.formatDate(expiry, "GMT+7", "dd MMMM yyyy") + "*.\n\n" +
        "Akses pelaporan RHK Anda saat ini *dinonaktifkan sementara* oleh sistem.\n\n" +
        "Untuk mengaktifkan kembali, silakan lakukan perpanjangan langganan. " +
        "Semua data & template Anda *tetap tersimpan* dan siap digunakan kembali setelah " +
        "perpanjangan. 🙏\n\n" +
        "Ketuk tombol *Perpanjang Sekarang* atau ketik /bayar:",
        kbExpired, token);
    } catch(eBlock) { /* lanjut meski notif gagal */ }

    Utilities.sleep(300);
  }

  // Laporan ke admin
  if (terblokir > 0) {
    try {
      kirimPesanSaaS(config.ADMIN_CHAT_ID,
        "🤖 *Laporan Auto-Block Sistem*\n\n" +
        "*" + terblokir + "* akun dinonaktifkan otomatis karena masa aktif berakhir.\n\n" +
        "Ketik `/admin follow_up_semua` untuk melihat daftar dan follow-up via WA.",
        null, token);
    } catch(eAdm) { /* ignore */ }
  }

  var logSheet = ss.getSheetByName("Log_Sistem");
  if (logSheet) {
    logSheet.appendRow([new Date(), "AUTO_BLOCK",
      "Auto-block " + terblokir + " klien expired."]);
  }
}


// ====================================================================
// SETUP: PASANG SEMUA TRIGGER SEKALIGUS
// ====================================================================
// CARA PAKAI:
//   1. Buka Apps Script Editor
//   2. Pilih fungsi "pasangSemuaTrigger" di dropdown
//   3. Klik ▶ Run
//   4. Izinkan akses jika diminta
//   Selesai! Semua cron job akan berjalan otomatis setiap hari.
// ====================================================================
function pasangSemuaTrigger() {
  var FUNGSI_TRIGGER = [
    { fn: "resetLimitHarianOtonom",      jam: 0  }, // 00:00 WIB
    { fn: "cekDanKirimWarningMasaAktif", jam: 8  }, // 08:00 WIB
    { fn: "cekDanAutoBlockExpired",      jam: 8  }  // 08:30 WIB (menit berbeda)
  ];

  // Hapus semua trigger lama untuk fungsi-fungsi di atas agar tidak dobel
  var existing = ScriptApp.getProjectTriggers();
  var namaDihapus = FUNGSI_TRIGGER.map(function(t) { return t.fn; });

  for (var x = 0; x < existing.length; x++) {
    if (namaDihapus.indexOf(existing[x].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(existing[x]);
    }
  }

  // Buat trigger baru
  ScriptApp.newTrigger("resetLimitHarianOtonom")
    .timeBased().atHour(0).nearMinute(1).everyDays(1).create();

  ScriptApp.newTrigger("cekDanKirimWarningMasaAktif")
    .timeBased().atHour(8).nearMinute(0).everyDays(1).create();

  // Auto-block dijadwalkan di jam 8 juga tapi nearMinute(30)
  ScriptApp.newTrigger("cekDanAutoBlockExpired")
    .timeBased().atHour(8).nearMinute(30).everyDays(1).create();

  Logger.log("✅ Semua trigger berhasil dipasang:");
  Logger.log("   • resetLimitHarianOtonom      → tiap hari 00:00 WIB");
  Logger.log("   • cekDanKirimWarningMasaAktif → tiap hari 08:00 WIB");
  Logger.log("   • cekDanAutoBlockExpired       → tiap hari 08:30 WIB");

  // Konfirmasi ke sheet Log_Sistem
  var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
  if (logSheet) {
    logSheet.appendRow([new Date(), "TRIGGER_SETUP",
      "pasangSemuaTrigger() dijalankan. 3 trigger aktif."]);
  }
}


// ====================================================================
// (LAMA — tetap ada untuk backward compatibility)
// ====================================================================
function pasangTriggerResetHarian() {
  // Delegate ke pasangSemuaTrigger agar tidak ada trigger dobel
  pasangSemuaTrigger();
  Logger.log("ℹ️  pasangTriggerResetHarian() dialihkan ke pasangSemuaTrigger().");
}
