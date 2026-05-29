// ====================================================================
// FILE 08: OTOMATISASI MESIN WAKTU — CRON JOBS & TRIGGERS (REVISI V4)
// ====================================================================
//
//  Fungsi                              Jadwal     Keterangan
//  ──────────────────────────────────────────────────────────────────
//  resetLimitHarianOtonom              00:00      Reset kuota cetak harian
//  cekDanKirimWarningMasaAktif         08:00      Warning H-7, H-3, H-0 expired
//  cekDanAutoBlockExpired              08:30      Auto-blokir akun expired
//  cekDanIngatkanPendaftaranMacet      09:00      Reminder klien pendaftaran macet
//
//  CARA PASANG: Jalankan pasangSemuaTrigger() SATU KALI dari Apps Script Editor
// ====================================================================


// ====================================================================
// 1. RESET LIMIT HARIAN (00:00 WIB)
// ====================================================================
function resetLimitHarianOtonom() {
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var sheet  = ss.getSheetByName("Client_SaaS");
  if (!sheet) return;

  var data      = sheet.getDataRange().getValues();
  var colLimit  = data[0].indexOf("Limit_Harian");
  var colStatus = data[0].indexOf("Status_Akses");
  var jatah     = 5;
  var count     = 0;

  for (var i = 1; i < data.length; i++) {
    if (data[i][colStatus] === "AKTIF") {
      sheet.getRange(i + 1, colLimit + 1).setValue(jatah);
      count++;
    }
  }

  var logSh = ss.getSheetByName("Log_Sistem");
  if (logSh) logSh.appendRow([new Date(), "RESET_LIMIT",
    "Reset limit harian " + count + " klien → " + jatah + " cetak."]);
}


// ====================================================================
// 2. WARNING MASA AKTIF — H-7, H-3, H-0 (08:00 WIB)
// ====================================================================
function cekDanKirimWarningMasaAktif() {
  var config  = ambilKonfigurasiSaaS();
  var token   = config.BOT_TOKEN;
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheetByName("Client_SaaS");
  if (!sheet) return;

  var data       = sheet.getDataRange().getValues();
  var colChatId  = data[0].indexOf("Chat_ID");
  var colNama    = data[0].indexOf("Nama_Pendaftar");
  var colStatus  = data[0].indexOf("Status_Akses");
  var colExpiry  = data[0].indexOf("Masa_Aktif");
  var colWarning = data[0].indexOf("Warning_Sent");

  var sekarang = new Date(); sekarang.setHours(0,0,0,0);
  var terkirim = 0;

  for (var i = 1; i < data.length; i++) {
    if (data[i][colStatus] !== "AKTIF" || !data[i][colExpiry]) continue;

    var expiry = new Date(data[i][colExpiry]); expiry.setHours(0,0,0,0);
    var sisa   = Math.round((expiry - sekarang) / 86400000);
    if ([7, 3, 0].indexOf(sisa) === -1) continue;

    var chatId  = data[i][colChatId].toString();
    var nama    = data[i][colNama] || "";
    var sapaan  = getSapaan(nama);
    var wSent   = (data[i][colWarning] || "").toString();
    var flag    = sisa.toString();

    if (wSent.indexOf(flag) !== -1) continue; // sudah terkirim

    var expFmt  = Utilities.formatDate(expiry, "GMT+7", "dd MMMM yyyy");
    var teks    = "";
    var kbWarn  = {"inline_keyboard": [
      [{"text":"💎 Perpanjang Sekarang", "callback_data":"SHORTCUT_BAYAR"}],
      [tombolHubungiAdminWA()]
    ]};

    if (sisa === 7) {
      teks =
        "⏰ *Pengingat — Masa Aktif Tersisa 7 Hari*\n\n" +
        "Halo *" + sapaan + "*,\n\n" +
        "Masa aktif akun premium Kinerja RHK akan berakhir dalam " +
        "*7 hari* pada *" + expFmt + "*.\n\n" +
        "Lakukan perpanjangan sebelum masa aktif habis agar pelaporan " +
        "RHK tetap berjalan lancar tanpa gangguan. 🙏\n\n" +
        "Ketuk *Perpanjang Sekarang* atau ketik /bayar.";

    } else if (sisa === 3) {
      teks =
        "⚠️ *Peringatan — Masa Aktif Tersisa 3 Hari*\n\n" +
        "Halo *" + sapaan + "*,\n\n" +
        "Masa aktif akun premium hanya tersisa *3 hari lagi* " +
        "(berakhir: *" + expFmt + "*).\n\n" +
        "Segera lakukan perpanjangan agar akses tidak terputus. 💡\n\n" +
        "Ketuk tombol di bawah atau ketik /bayar:";

    } else if (sisa === 0) {
      teks =
        "🔴 *Peringatan Akhir — Masa Aktif Berakhir Hari Ini*\n\n" +
        "Halo *" + sapaan + "*,\n\n" +
        "Masa aktif akun premium berakhir *hari ini*, " + expFmt + ".\n\n" +
        "Setelah tengah malam, akses pelaporan akan *dinonaktifkan otomatis* " +
        "jika belum diperpanjang.\n\n" +
        "⚡ Perpanjang *sekarang juga* agar tidak ada laporan yang terlewat!";
    }

    try {
      kirimPesanSaaS(chatId, teks, kbWarn, token);
      sheet.getRange(i + 1, colWarning + 1)
           .setValue(wSent ? wSent + "," + flag : flag);
      terkirim++;

      // Notif ke admin + tombol WA admin untuk follow-up manual
      var pesanWA = "Halo " + sapaan +
        ", masa aktif bot Kinerja RHK " +
        (sisa === 0 ? "berakhir HARI INI" : "tersisa " + sisa + " hari") +
        ". Ketik /bayar untuk perpanjangan.";
      var kbAdm = {"inline_keyboard": [
        [{"text":"📲  WA " + sapaan,
          "url":"https://wa.me/" + SAAS_CONFIG.ADMIN_WHATSAPP_NO +
                "?text=" + encodeURIComponent(pesanWA)}],
        [{"text":"📊 Detail Follow-Up", "callback_data":"ADM_FU_" + chatId}]
      ]};
      kirimPesanSaaS(config.ADMIN_CHAT_ID,
        "🔔 *Warning H-" + sisa + " — " + (nama||chatId) + "*\n" +
        "🆔 `" + chatId + "` | Expired: *" +
        Utilities.formatDate(expiry, "GMT+7", "dd/MM/yyyy") + "*",
        kbAdm, token);

    } catch(eW) {
      var ls = ss.getSheetByName("Log_Sistem");
      if (ls) ls.appendRow([new Date(),"WARN_ERROR",
        "H-" + sisa + " ke " + chatId + ": " + eW.toString()]);
    }
    Utilities.sleep(300);
  }

  var ls2 = ss.getSheetByName("Log_Sistem");
  if (ls2 && terkirim > 0)
    ls2.appendRow([new Date(), "WARNING_SENT", terkirim + " warning terkirim."]);
}


// ====================================================================
// 3. AUTO-BLOCK EXPIRED (08:30 WIB)
// ====================================================================
function cekDanAutoBlockExpired() {
  var config  = ambilKonfigurasiSaaS();
  var token   = config.BOT_TOKEN;
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheetByName("Client_SaaS");
  if (!sheet) return;

  var data       = sheet.getDataRange().getValues();
  var colChatId  = data[0].indexOf("Chat_ID");
  var colNama    = data[0].indexOf("Nama_Pendaftar");
  var colStatus  = data[0].indexOf("Status_Akses");
  var colExpiry  = data[0].indexOf("Masa_Aktif");
  var colCatatan = data[0].indexOf("Catatan_Admin");
  var colWarning = data[0].indexOf("Warning_Sent");
  var sekarang   = new Date();
  var terblokir  = 0;

  for (var i = 1; i < data.length; i++) {
    if (data[i][colStatus] !== "AKTIF" || !data[i][colExpiry]) continue;
    var expiry = new Date(data[i][colExpiry]);
    if (expiry >= sekarang) continue;

    var chatId  = data[i][colChatId].toString();
    var nama    = data[i][colNama] || "";
    var sapaan  = getSapaan(nama);
    var expFmt  = Utilities.formatDate(expiry, "GMT+7", "dd MMMM yyyy");

    sheet.getRange(i+1, colStatus  +1).setValue("NONAKTIF");
    sheet.getRange(i+1, colCatatan +1).setValue(
      "Expired otomatis: " + Utilities.formatDate(expiry, "GMT+7", "dd/MM/yyyy"));
    sheet.getRange(i+1, colWarning +1).setValue("BLOCKED");
    terblokir++;

    var kbExp = {"inline_keyboard": [
      [{"text":"💎 Perpanjang Sekarang", "callback_data":"SHORTCUT_BAYAR"}],
      [tombolHubungiAdminWA()]
    ]};
    try {
      kirimPesanSaaS(chatId,
        "🔒 *Masa Aktif Telah Berakhir*\n\n" +
        "Halo *" + sapaan + "*, akun premium berakhir pada *" + expFmt + "*.\n\n" +
        "Akses pelaporan RHK saat ini *dinonaktifkan sementara*.\n\n" +
        "Semua data & template *tetap tersimpan* dan siap aktif kembali " +
        "setelah perpanjangan. 🙏\n\n" +
        "Ketuk *Perpanjang Sekarang* atau ketik /bayar:",
        kbExp, token);
    } catch(eB) { /* lanjut */ }
    Utilities.sleep(300);
  }

  if (terblokir > 0) {
    try {
      kirimPesanSaaS(config.ADMIN_CHAT_ID,
        "🤖 *Laporan Auto-Block*\n\n" +
        "*" + terblokir + "* akun dinonaktifkan otomatis (expired).\n\n" +
        "Ketik `/admin follow_up_semua` untuk daftar & tombol WA follow-up.",
        null, token);
    } catch(eA) { /* ignore */ }
  }

  var ls = ss.getSheetByName("Log_Sistem");
  if (ls) ls.appendRow([new Date(),"AUTO_BLOCK","Blokir " + terblokir + " klien expired."]);
}



// ====================================================================
// 4. REMINDER PENDAFTARAN MACET (09:00 WIB) — FITUR BARU
// ====================================================================
// Logika:
//   - Cari semua klien dengan status bukan AKTIF dan bukan NONAKTIF
//     (BELUM_DAFTAR, REG_WIZARD, PENDING_RHK)
//   - Jika terakhir kali reminder dikirim > 1 hari lalu (atau belum pernah)
//     → kirim pesan panduan lanjutkan pendaftaran
//   - Pesan disesuaikan berdasarkan tahap yang sedang macet
//   - Update kolom Reg_Reminder dengan timestamp terakhir kirim
// ====================================================================
function cekDanIngatkanPendaftaranMacet() {
  var config    = ambilKonfigurasiSaaS();
  var token     = config.BOT_TOKEN;
  var ss        = SpreadsheetApp.getActiveSpreadsheet();
  var sheet     = ss.getSheetByName("Client_SaaS");
  if (!sheet) return;

  var data         = sheet.getDataRange().getValues();
  var colChatId    = data[0].indexOf("Chat_ID");
  var colNama      = data[0].indexOf("Nama_Pendaftar");
  var colStatus    = data[0].indexOf("Status_Akses");
  var colSesi      = data[0].indexOf("State_Sesi");
  var colReminder  = data[0].indexOf("Reg_Reminder");
  var sekarang     = new Date();
  var terkirim     = 0;

  for (var i = 1; i < data.length; i++) {
    var status = data[i][colStatus];
    // Hanya proses yang belum AKTIF dan belum NONAKTIF
    if (status === "AKTIF" || status === "NONAKTIF") continue;

    var chatId      = data[i][colChatId].toString();
    var nama        = (data[i][colNama] || "").toString().trim();
    var sapaan      = getSapaan(nama);
    var sesi        = (data[i][colSesi]  || "").toString().trim();
    var lastRemind  = data[i][colReminder];

    // Cek apakah sudah 24 jam sejak reminder terakhir
    if (lastRemind) {
      var lastDate = new Date(lastRemind);
      var selisihJam = (sekarang - lastDate) / (1000 * 60 * 60);
      if (selisihJam < 23) continue; // belum 24 jam, lewati
    }

    // Susun pesan berdasarkan tahap yang macet
    var teks    = "";
    var kbMacet = {"inline_keyboard": []};

    if (status === "BELUM_DAFTAR" || sesi === "" || sesi === "REG_TUNGGU_NAMA") {
      teks =
        "👋 Halo" + (sapaan !== "Anda" ? " *" + sapaan + "*" : "") + "!\n\n" +
        "Pendaftaran akun *Kinerja RHK* Anda belum diselesaikan.\n\n" +
        "Platform ini membantu pembuatan laporan RHK harian secara otomatis " +
        "langsung dari Telegram — cukup jawab beberapa pertanyaan, " +
        "laporan PDF siap dalam hitungan detik.\n\n" +
        "Ketik /start untuk melanjutkan pendaftaran. Hanya butuh beberapa menit! ✨";
      kbMacet.inline_keyboard = [
        [{"text":"🚀 Mulai / Lanjut Pendaftaran", "callback_data":"SHORTCUT_LAPOR"}]
      ];

    } else if (sesi.indexOf("REG_TUNGGU_JML_RHK") === 0) {
      teks =
        "✨ Halo *" + sapaan + "*,\n\n" +
        "Pendaftaran Anda sudah dimulai, namun *jumlah RHK* belum ditentukan.\n\n" +
        "Ketik /start untuk melanjutkan dari tahap ini. " +
        "Pilih jumlah RHK yang ingin dikelola dan proses akan berlanjut otomatis.";
      kbMacet.inline_keyboard = [
        [{"text":"▶️ Lanjutkan Pendaftaran", "callback_data":"SHORTCUT_LAPOR"}]
      ];

    } else if (sesi === "REG_TUNGGU_DRIVE_LINK") {
      teks =
        "📁 Halo *" + sapaan + "*,\n\n" +
        "Pendaftaran Anda hampir selesai! Hanya tinggal satu langkah:\n\n" +
        "*Kirimkan link folder Google Drive* yang sudah diberi akses Editor " +
        "ke email `" + SAAS_CONFIG.EMAIL_MITRA_EDITOR + "`.\n\n" +
        "Folder ini digunakan sistem untuk menyimpan hasil laporan PDF secara otomatis.\n\n" +
        "Ketik /start untuk melanjutkan dan kirimkan link folder Anda.";
      kbMacet.inline_keyboard = [
        [{"text":"▶️ Lanjutkan — Kirim Link Drive", "callback_data":"SHORTCUT_LAPOR"}],
        [tombolHubungiAdminWA()]
      ];

    } else if (sesi === "REG_TUNGGU_KONFIRMASI_WORD" || status === "PENDING_RHK") {
      teks =
        "📄 Halo *" + sapaan + "*,\n\n" +
        "Koneksi Google Drive sudah terhubung! ✅\n\n" +
        "Langkah terakhir: kirimkan *file template laporan RHK (.docx)* " +
        "langsung ke chat ini.\n\n" +
        "Template ini adalah file Word laporan harian yang biasa digunakan. " +
        "Sistem akan menganalisa strukturnya dan menyiapkan menu pelaporan " +
        "otomatis khusus untuk *" + sapaan + "*.\n\n" +
        "Cukup drag & drop file .docx ke chat ini sekarang! 📎";
      kbMacet.inline_keyboard = [
        [tombolHubungiAdminWA()]
      ];

    } else if (sesi === "TUNGGU_BUKTI_BAYAR") {
      teks =
        "💳 Halo *" + sapaan + "*,\n\n" +
        "Invoice pembayaran sudah dikirimkan. " +
        "Sistem menunggu *bukti transfer* dari *" + sapaan + "*.\n\n" +
        "Setelah transfer, langsung kirimkan *screenshot bukti pembayaran* " +
        "ke chat ini. Verifikasi dilakukan otomatis.\n\n" +
        "Ketik /bayar jika ingin membuat invoice baru.";
      kbMacet.inline_keyboard = [
        [{"text":"💎 Buat Invoice Baru",  "callback_data":"SHORTCUT_BAYAR"}],
        [tombolHubungiAdminWA()]
      ];

    } else {
      // Tahap lain yang macet — pesan umum
      teks =
        "🔔 Halo *" + sapaan + "*,\n\n" +
        "Ada proses pendaftaran yang belum diselesaikan di akun Kinerja RHK.\n\n" +
        "Ketik /start untuk melanjutkan, atau hubungi Admin jika membutuhkan bantuan.";
      kbMacet.inline_keyboard = [
        [{"text":"▶️ Lanjutkan Pendaftaran", "callback_data":"SHORTCUT_LAPOR"}],
        [tombolHubungiAdminWA()]
      ];
    }

    try {
      kirimPesanSaaS(chatId, teks, kbMacet, token);
      // Catat waktu terkirim
      sheet.getRange(i + 1, colReminder + 1).setValue(new Date());
      terkirim++;

      // Notif ringkas ke admin
      kirimPesanSaaS(config.ADMIN_CHAT_ID,
        "🔔 Reminder pendaftaran terkirim ke *" + (nama||chatId) +
        "* (`" + chatId + "`)\n📍 Tahap: `" + (sesi||status) + "`",
        null, token);

    } catch(eR) {
      var ls = ss.getSheetByName("Log_Sistem");
      if (ls) ls.appendRow([new Date(),"REG_REMINDER_ERROR",
        chatId + ": " + eR.toString()]);
    }
    Utilities.sleep(400);
  }

  var ls2 = ss.getSheetByName("Log_Sistem");
  if (ls2)
    ls2.appendRow([new Date(), "REG_REMINDER",
      terkirim + " reminder pendaftaran macet terkirim."]);
}


// ====================================================================
// SETUP: PASANG SEMUA TRIGGER (TERMASUK QUEUE WORKER)
// ====================================================================
//
//  Trigger lengkap setelah update ini (5 trigger):
//
//  Fungsi                              Jadwal        Keterangan
//  ────────────────────────────────────────────────────────────────
//  prosesBatchAntrian                  Tiap 1 menit  Worker queue utama ⭐
//  resetLimitHarianOtonom              00:00 WIB     Reset kuota cetak
//  cekDanKirimWarningMasaAktif         08:00 WIB     Warning H-7, H-3, H-0
//  cekDanAutoBlockExpired              08:30 WIB     Auto-blokir expired
//  cekDanIngatkanPendaftaranMacet      09:00 WIB     Reminder macet
//
//  CARA PAKAI:
//  1. Buka Apps Script Editor (Extensions > Apps Script)
//  2. Pilih fungsi "pasangSemuaTrigger" di dropdown atas
//  3. Klik ▶ Run — izinkan akses jika diminta
//  Selesai! Semua 5 trigger aktif otomatis.
// ====================================================================
function pasangSemuaTrigger() {
  var daftarFungsi = [
    "prosesBatchAntrian",
    "resetLimitHarianOtonom",
    "cekDanKirimWarningMasaAktif",
    "cekDanAutoBlockExpired",
    "cekDanIngatkanPendaftaranMacet"
  ];

  // Hapus semua trigger lama milik fungsi-fungsi di atas agar tidak dobel
  var existing = ScriptApp.getProjectTriggers();
  for (var x = 0; x < existing.length; x++) {
    if (daftarFungsi.indexOf(existing[x].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(existing[x]);
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

  // ── 1. Queue Worker: tiap 1 menit ─────────────────────────────
  // Ini adalah jantung sistem antrian — jangan diubah ke interval lebih lama
  ScriptApp.newTrigger("prosesBatchAntrian")
    .timeBased().everyMinutes(1).create();

  // ── 2. Reset limit harian: 00:00 WIB ──────────────────────────
  ScriptApp.newTrigger("resetLimitHarianOtonom")
    .timeBased().atHour(0).nearMinute(1).everyDays(1).create();

  // ── 3. Warning masa aktif: 08:00 WIB ──────────────────────────
  ScriptApp.newTrigger("cekDanKirimWarningMasaAktif")
    .timeBased().atHour(8).nearMinute(0).everyDays(1).create();

  // ── 4. Auto-block expired: 08:30 WIB ──────────────────────────
  ScriptApp.newTrigger("cekDanAutoBlockExpired")
    .timeBased().atHour(8).nearMinute(30).everyDays(1).create();

  // ── 5. Reminder pendaftaran macet: 09:00 WIB ──────────────────
  ScriptApp.newTrigger("cekDanIngatkanPendaftaranMacet")
    .timeBased().atHour(9).nearMinute(0).everyDays(1).create();

  // Log konfirmasi
  Logger.log("✅ 5 trigger berhasil dipasang:");
  Logger.log("   ⭐ prosesBatchAntrian              → tiap 1 menit");
  Logger.log("   • resetLimitHarianOtonom          → 00:00 WIB");
  Logger.log("   • cekDanKirimWarningMasaAktif      → 08:00 WIB");
  Logger.log("   • cekDanAutoBlockExpired           → 08:30 WIB");
  Logger.log("   • cekDanIngatkanPendaftaranMacet   → 09:00 WIB");

  var ls = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
  if (ls) ls.appendRow([new Date(), "TRIGGER_SETUP",
    "5 trigger dipasang. Queue worker aktif tiap 1 menit."]);
}

// ====================================================================
// SETUP TERPISAH: Pasang hanya trigger queue worker
// Gunakan ini jika ingin mengaktifkan/mematikan antrian saja
// tanpa mengganggu trigger harian lainnya
// ====================================================================
function pasangTriggerAntrian() {
  // Hapus worker lama jika ada
  var existing = ScriptApp.getProjectTriggers();
  for (var x = 0; x < existing.length; x++) {
    if (existing[x].getHandlerFunction() === "prosesBatchAntrian") {
      ScriptApp.deleteTrigger(existing[x]);
    }
  }
  // Buat baru
  ScriptApp.newTrigger("prosesBatchAntrian")
    .timeBased().everyMinutes(1).create();

  Logger.log("✅ Trigger antrian (prosesBatchAntrian tiap 1 menit) dipasang.");
  var ls = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
  if (ls) ls.appendRow([new Date(), "TRIGGER_ANTRIAN", "Worker queue dipasang tiap 1 menit."]);
}

function nonaktifkanTriggerAntrian() {
  var existing = ScriptApp.getProjectTriggers();
  var count    = 0;
  for (var x = 0; x < existing.length; x++) {
    if (existing[x].getHandlerFunction() === "prosesBatchAntrian") {
      ScriptApp.deleteTrigger(existing[x]);
      count++;
    }
  }
  Logger.log("🛑 " + count + " trigger antrian dihapus.");
  var ls = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
  if (ls) ls.appendRow([new Date(), "TRIGGER_ANTRIAN", "Worker queue dihentikan (" + count + " trigger dihapus)."]);
}

// Backward compatibility
function pasangTriggerResetHarian() { pasangSemuaTrigger(); }
