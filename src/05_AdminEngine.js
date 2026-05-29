// ====================================================================
// FILE 05: COMMAND CENTER KENDALI OPERASIONAL ADMIN SAAS (REVISI V4)
// ====================================================================

function prosesFiturAdminSaaS(update, config) {
  var chatId = update.message.chat.id.toString();
  var text = update.message.text ? update.message.text.trim() : "";

  // ----------------------------------------------------------------
  // PERINTAH INTI (HARDCODED) — Tidak dapat diubah via sheet
  // ----------------------------------------------------------------

  if (text.indexOf("/admin broadcast ") === 0) {
    var isiPesan = text.replace("/admin broadcast ", "");
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var data = sheet.getDataRange().getValues();
    var sukses = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] === "AKTIF") {
        kirimPesanSaaS(data[i][0].toString(), "📢 *PENGUMUMAN RESMI PLATFORM RHK:* \n\n" + isiPesan, null, config.BOT_TOKEN);
        sukses++;
      }
    }
    kirimPesanSaaS(chatId, "🚀 Berhasil menyebarkan pesan broadcast kepada *" + sukses + "* klien premium aktif!", null, config.BOT_TOKEN);
    return true;
  }

  if (text.indexOf("/admin blokir ") === 0) {
    var params = text.split(" ");
    if (params.length >= 3) {
      var targetId = params[2]; var alasan = params.slice(3).join(" ") || "Tidak ada alasan tercatat.";
      perbaruiKolomKlien(targetId, "Status_Akses", "NONAKTIF");
      perbaruiKolomKlien(targetId, "Catatan_Admin", "Blokir: " + alasan);
      kirimPesanSaaS(chatId, "🔒 Akun ID `" + targetId + "` berhasil dinonaktifkan.\n📝 Alasan: _" + alasan + "_", null, config.BOT_TOKEN);
      kirimPesanSaaS(targetId, "🔔 Pemberitahuan: Akses bot Anda telah ditangguhkan oleh Admin dengan alasan: *" + alasan + "*.", null, config.BOT_TOKEN);
    } else {
      kirimPesanSaaS(chatId, "💡 Gunakan pola: `/admin blokir [ID_Chat] [Alasan_Blokir]`", null, config.BOT_TOKEN);
    }
    return true;
  }

  if (text.indexOf("/admin aktifkan ") === 0) {
    var parts    = text.split(" ");
    var targetAktifId = parts[2] ? parts[2].trim() : "";
    var jmlBulanAktif = parts[3] ? parseInt(parts[3]) : 1;
    if (!targetAktifId) {
      kirimPesanSaaS(chatId, "💡 Format: `/admin aktifkan [ID] [durasi_bulan]`\nContoh: `/admin aktifkan 927597163 3`", null, config.BOT_TOKEN);
      return true;
    }
    var tglExp = new Date();
    var klienAktif = cariAtauDaftarKlienSaaS(targetAktifId, "");
    if (klienAktif.Status_Akses === "AKTIF" && new Date(klienAktif.Masa_Aktif) > new Date()) {
      tglExp = new Date(klienAktif.Masa_Aktif);
    }
    tglExp.setMonth(tglExp.getMonth() + jmlBulanAktif);
    perbaruiKolomKlien(targetAktifId, "Status_Akses", "AKTIF");
    perbaruiKolomKlien(targetAktifId, "Masa_Aktif", tglExp);
    perbaruiKolomKlien(targetAktifId, "Warning_Sent", "");
    kirimPesanSaaS(chatId, "✅ Akun `" + targetAktifId + "` aktif *" + jmlBulanAktif + " bulan* hingga *" + Utilities.formatDate(tglExp, "GMT+7", "dd/MM/yyyy") + "*.", null, config.BOT_TOKEN);
    kirimPesanSaaS(targetAktifId, "🎉 *Akun Anda telah diaktifkan oleh Admin!*\n\nMasa aktif berlaku hingga *" + Utilities.formatDate(tglExp, "GMT+7", "dd/MM/yyyy") + "*.\nKetik /lapor untuk mulai pelaporan RHK Anda. 🚀", null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin kirim_template [chatId] ────────────────────────────────
  // Kirim ulang file template Google Doc milik klien dari Drive Admin
  // ke chat klien tersebut sebagai dokumen .docx via bot
  if (text.indexOf("/admin kirim_template ") === 0) {
    var tgtId = text.replace("/admin kirim_template ", "").trim();
    if (!tgtId) {
      kirimPesanSaaS(chatId, "💡 Format: `/admin kirim_template [Chat_ID_Klien]`", null, config.BOT_TOKEN);
      return true;
    }
    kirimTemplateKeKlien(tgtId, chatId, config);
    return true;
  }

  // ── /admin follow_up [chatId] ────────────────────────────────────
  // Kirim paket lengkap info klien ke admin + deeplink WA follow-up
  if (text.indexOf("/admin follow_up ") === 0) {
    var fuId = text.replace("/admin follow_up ", "").trim();
    tampilkanInfoFollowUp(fuId, chatId, config);
    return true;
  }

  // ── /admin follow_up_semua ───────────────────────────────────────
  // List semua klien expired/hampir expired + tombol WA per klien
  if (text === "/admin follow_up_semua") {
    tampilkanDaftarFollowUpSemua(chatId, config);
    return true;
  }

  // ── FITUR BARU: /admin daftar_chatid ────────────────────────────
  // Menampilkan daftar lengkap Chat ID semua klien beserta status
  if (text === "/admin daftar_chatid") {
    var dSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var dData = dSheet.getDataRange().getValues();
    
    if (dData.length <= 1) {
      kirimPesanSaaS(chatId, "📭 Belum ada klien yang terdaftar di database.", null, config.BOT_TOKEN);
      return true;
    }

    // Bagi pengiriman per 30 baris agar tidak melebihi batas pesan Telegram (4096 karakter)
    var BATCH_SIZE = 30;
    var batchPesan = [];
    var barisSaatIni = "📋 *DAFTAR CHAT ID KLIEN TERDAFTAR*\n" +
                       "_(Total: " + (dData.length - 1) + " klien)_\n\n";

    var emojiStatus = {
      "AKTIF"       : "🟢",
      "NONAKTIF"    : "🔴",
      "BELUM_DAFTAR": "⚪",
      "REG_WIZARD"  : "🟡",
      "PENDING_RHK" : "🟠"
    };

    for (var d = 1; d < dData.length; d++) {
      var nomD      = d;
      var namaDftr  = dData[d][1] || "—";
      var idChat    = dData[d][0];
      var statusD   = dData[d][3] || "BELUM_DAFTAR";
      var masaAktif = dData[d][4] ? Utilities.formatDate(new Date(dData[d][4]), "GMT+7", "dd/MM/yy") : "—";
      var totalCetak = dData[d][6] || 0;
      var emoji      = emojiStatus[statusD] || "⚫";

      barisSaatIni += nomD + ". " + emoji + " *" + namaDftr + "*\n" +
                      "   🆔 `" + idChat + "`\n" +
                      "   📌 Status: `" + statusD + "`" +
                      (statusD === "AKTIF" ? " | Exp: `" + masaAktif + "`" : "") +
                      " | 📄 Cetak: " + totalCetak + "x\n\n";

      // Kirim batch jika sudah mencapai BATCH_SIZE atau baris terakhir
      if ((d % BATCH_SIZE === 0) || d === dData.length - 1) {
        batchPesan.push(barisSaatIni);
        barisSaatIni = "📋 _(Lanjutan halaman " + (batchPesan.length + 1) + ")_\n\n";
      }
    }

    // Kirim semua batch satu per satu
    for (var b = 0; b < batchPesan.length; b++) {
      kirimPesanSaaS(chatId, batchPesan[b], null, config.BOT_TOKEN);
    }

    // Sertakan tombol aksi cepat untuk kemudahan admin
    var kbAksiCepat = {"inline_keyboard": [
      [{"text": "📊 Cek Sistem", "callback_data": "ADM_CEK_SISTEM"},
       {"text": "📋 Cek Pendaftaran Macet", "callback_data": "ADM_CEK_DAFTAR"}]
    ]};
    kirimPesanSaaS(chatId, "⚡ *Aksi cepat admin:*", kbAksiCepat, config.BOT_TOKEN);
    return true;
  }

  // ── FITUR BARU: /admin daftar_chatid ────────────────────────────
  // Menampilkan daftar lengkap Chat ID semua klien beserta status
  if (text === "/admin daftar_chatid") {
    var dSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var dData = dSheet.getDataRange().getValues();
    
    if (dData.length <= 1) {
      kirimPesanSaaS(chatId, "📭 Belum ada klien yang terdaftar di database.", null, config.BOT_TOKEN);
      return true;
    }

    // Bagi pengiriman per 30 baris agar tidak melebihi batas pesan Telegram (4096 karakter)
    var BATCH_SIZE = 30;
    var batchPesan = [];
    var barisSaatIni = "📋 *DAFTAR CHAT ID KLIEN TERDAFTAR*\n" +
                       "_(Total: " + (dData.length - 1) + " klien)_\n\n";

    var emojiStatus = {
      "AKTIF"       : "🟢",
      "NONAKTIF"    : "🔴",
      "BELUM_DAFTAR": "⚪",
      "REG_WIZARD"  : "🟡",
      "PENDING_RHK" : "🟠"
    };

    for (var d = 1; d < dData.length; d++) {
      var nomD      = d;
      var namaDftr  = dData[d][1] || "—";
      var idChat    = dData[d][0];
      var statusD   = dData[d][3] || "BELUM_DAFTAR";
      var masaAktif = dData[d][4] ? Utilities.formatDate(new Date(dData[d][4]), "GMT+7", "dd/MM/yy") : "—";
      var totalCetak = dData[d][6] || 0;
      var emoji      = emojiStatus[statusD] || "⚫";

      barisSaatIni += nomD + ". " + emoji + " *" + namaDftr + "*\n" +
                      "   🆔 `" + idChat + "`\n" +
                      "   📌 Status: `" + statusD + "`" +
                      (statusD === "AKTIF" ? " | Exp: `" + masaAktif + "`" : "") +
                      " | 📄 Cetak: " + totalCetak + "x\n\n";

      // Kirim batch jika sudah mencapai BATCH_SIZE atau baris terakhir
      if ((d % BATCH_SIZE === 0) || d === dData.length - 1) {
        batchPesan.push(barisSaatIni);
        barisSaatIni = "📋 _(Lanjutan halaman " + (batchPesan.length + 1) + ")_\n\n";
      }
    }

    // Kirim semua batch satu per satu
    for (var b = 0; b < batchPesan.length; b++) {
      kirimPesanSaaS(chatId, batchPesan[b], null, config.BOT_TOKEN);
    }

    // Sertakan tombol aksi cepat untuk kemudahan admin
    var kbAksiCepat = {"inline_keyboard": [
      [{"text": "📊 Cek Sistem", "callback_data": "ADM_CEK_SISTEM"},
       {"text": "📋 Cek Pendaftaran Macet", "callback_data": "ADM_CEK_DAFTAR"}]
    ]};
    kirimPesanSaaS(chatId, "⚡ *Aksi cepat admin:*", kbAksiCepat, config.BOT_TOKEN);
    return true;
  }

  // FITUR PENGAWASAN/AUDIT BERKALA STATUS PENDAFTARAN KLIEN YANG MACET
  if (text === "/admin cek_pendaftaran") {
    var shClient = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var cData = shClient.getDataRange().getValues();
    var laporanMacet = "📋 *DAFTAR KLIEN BELUM SELESAI DAFTAR* 📋\n\n";
    var adaMacet = false;
    var nomor = 1;
    
    for (var j = 1; j < cData.length; j++) {
      var status = cData[j][3];
      if (status !== "AKTIF" && status !== "NONAKTIF") {
        laporanMacet += nomor + ". *" + cData[j][1] + "* (`" + cData[j][0] + "`)\n" +
                        "   📍 Tahapan Sesi: `" + (cData[j][8] || "KOSONG/START") + "`\n" +
                        "   🔗 Link Drive: " + (cData[j][2] ? "[Buka Drive Klien](" + cData[j][2] + ")" : "`Belum Kirim`") + "\n\n";
        adaMacet = true; nomor++;
      }
    }
    if (!adaMacet) laporanMacet += "🎉 Luar biasa! Semua pendaftar sudah menyelesaikan administrasi premium, Pak Admin!";
    kirimPesanSaaS(chatId, laporanMacet, null, config.BOT_TOKEN);
    return true;
  }

  if (text === "/admin cek_sistem" || text === "/admin") {
    var cSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var totalUser = cSheet.getLastRow() - 1;
    var vData = cSheet.getDataRange().getValues();
    var aktif = 0; var pending = 0; var nonaktif = 0;
    for (var k = 1; k < vData.length; k++) {
      var st = vData[k][3];
      if (st === "AKTIF") aktif++;
      else if (st === "NONAKTIF") nonaktif++;
      else pending++;
    }

    // Hitung perintah sheet yang aktif
    var acSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
    var jumlahPerintahSheet = 0;
    if (acSheet) {
      var acData = acSheet.getDataRange().getValues();
      for (var ac = 1; ac < acData.length; ac++) {
        if (acData[ac][4] && acData[ac][4].toString().toUpperCase() === "TRUE") jumlahPerintahSheet++;
      }
    }

    var statusSistem = "📊 *LAPORAN UTILITAS SAAS INTEGRASI* 📊\n\n" +
                       "👥 *Data Klien:*\n" +
                       "   ▪️ Total Terdaftar: *" + totalUser + "* Orang\n" +
                       "   ▪️ Premium Aktif: *" + aktif + "* Akun 🟢\n" +
                       "   ▪️ Pending/Proses: *" + pending + "* Akun 🟡\n" +
                       "   ▪️ Nonaktif/Blokir: *" + nonaktif + "* Akun 🔴\n\n" +
                       "⚙️ *Konfigurasi:*\n" +
                       "   ▪️ Perintah Sheet Aktif: *" + jumlahPerintahSheet + "* perintah\n" +
                       "   ▪️ Status Server: *ONLINE ✅*\n\n" +
                       "📌 *Pintasan Perintah:*\n" +
                       "   `/admin daftar_chatid` — Semua Chat ID klien\n" +
                       "   `/admin cek_pendaftaran` — Cek yang macet\n" +
                       "   `/admin bantuan` — Daftar semua perintah";
    kirimPesanSaaS(chatId, statusSistem, null, config.BOT_TOKEN);
    return true;
  }

  // ── FITUR BARU: /admin bantuan ───────────────────────────────────
  // Menampilkan semua perintah: hardcoded + perintah dari sheet Admin_Commands
  if (text === "/admin bantuan") {
    var bantuanTeks = "📖 *PANDUAN LENGKAP PERINTAH ADMIN* 📖\n\n" +
      "━━━ *PERINTAH INTI (BAWAAN SISTEM)* ━━━\n" +
      "▪️ `/admin` atau `/admin cek_sistem` — Dashboard statistik\n" +
      "▪️ `/admin daftar_chatid` — Daftar semua Chat ID klien\n" +
      "▪️ `/admin cek_pendaftaran` — Klien dengan registrasi macet\n" +
      "▪️ `/admin bantuan` — Tampilkan panduan ini\n" +
      "▪️ `/admin broadcast [pesan]` — Kirim pesan ke semua klien aktif\n" +
      "▪️ `/admin blokir [ID] [alasan]` — Blokir akun klien\n" +
      "▪️ `/admin aktifkan [ID]` — Aktifkan akun klien\n\n" +
      "▪️ `/admin aktifkan [ID] [bulan]` — Aktifkan akun klien\n" +
      "▪️ `/admin kirim_template [ID]` — Kirim ulang file template ke klien\n" +
      "▪️ `/admin follow_up [ID]` — Info lengkap + deeplink WA klien\n" +
      "▪️ `/admin follow_up_semua` — Daftar klien expired/hampir expired\n\n" +
      "━━━ *PERINTAH DARI SHEET Admin_Commands* ━━━\n";

    var acSheet2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
    if (acSheet2) {
      var acData2 = acSheet2.getDataRange().getValues();
      var adaPerintahSheet = false;
      for (var ac2 = 1; ac2 < acData2.length; ac2++) {
        var aktifFlag = acData2[ac2][4] ? acData2[ac2][4].toString().toUpperCase() : "FALSE";
        var labelAktif = (aktifFlag === "TRUE") ? "✅" : "❌";
        bantuanTeks += labelAktif + " `" + acData2[ac2][0] + "`\n   _" + (acData2[ac2][5] || "Tanpa deskripsi") + "_\n";
        adaPerintahSheet = true;
      }
      if (!adaPerintahSheet) bantuanTeks += "_Belum ada perintah di sheet Admin_Commands._\n";
    } else {
      bantuanTeks += "_Sheet Admin_Commands belum dibuat. Jalankan `setupStrukturDatabaseSaaS()` terlebih dahulu._\n";
    }

    bantuanTeks += "\n💡 *Tip:* Tambah perintah baru kapan saja langsung di sheet *Admin_Commands* tanpa mengubah kode!";
    kirimPesanSaaS(chatId, bantuanTeks, null, config.BOT_TOKEN);
    return true;
  }

  // ----------------------------------------------------------------
  // ENGINE PERINTAH DINAMIS — Baca dari sheet Admin_Commands
  // Eksekusi otomatis tanpa ubah kode, cukup tambah baris di sheet
  // ----------------------------------------------------------------
  var hasilSheet = eksekusiPerintahDariSheet(chatId, text, config);
  if (hasilSheet) return true;

  // Tidak ada perintah yang cocok → tampilkan petunjuk
  kirimPesanSaaS(chatId, "❓ Perintah tidak dikenali.\n\nKetik `/admin bantuan` untuk melihat daftar lengkap perintah yang tersedia.", null, config.BOT_TOKEN);
  return true;
}

// ====================================================================
// ENGINE PERINTAH DINAMIS DARI SHEET Admin_Commands
// ====================================================================
// Cara kerja:
//   1. Baca semua baris sheet Admin_Commands
//   2. Cocokkan kolom Perintah dengan teks yang dikirim admin
//   3. Jika cocok & Aktif = TRUE, jalankan sesuai Tipe:
//      - BALAS_TEKS   : kirim Isi_Pesan ke admin
//      - BROADCAST    : kirim Isi_Pesan ke semua klien AKTIF
//      - KIRIM_KE_USER: kirim Isi_Pesan ke Chat ID yang disebut setelah perintah
// ====================================================================
function eksekusiPerintahDariSheet(chatId, text, config) {
  var acSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
  if (!acSheet) return false;

  var acData = acSheet.getDataRange().getValues();

  for (var i = 1; i < acData.length; i++) {
    var perintahSheet = acData[i][0] ? acData[i][0].toString().trim() : "";
    var tipe          = acData[i][1] ? acData[i][1].toString().trim().toUpperCase() : "";
    var parameter     = acData[i][2] ? acData[i][2].toString().trim() : "";
    var isiPesan      = acData[i][3] ? acData[i][3].toString() : "";
    var aktifFlag     = acData[i][4] ? acData[i][4].toString().toUpperCase() : "FALSE";
    
    if (perintahSheet === "") continue;

    // Cocokkan: perintah sheet harus merupakan awalan dari teks yang dikirim
    var cocok = (text === perintahSheet) || (text.indexOf(perintahSheet + " ") === 0);
    if (!cocok) continue;

    // Lewati perintah yang dinonaktifkan (Aktif = FALSE)
    if (aktifFlag !== "TRUE") {
      kirimPesanSaaS(chatId, "⚠️ Perintah `" + perintahSheet + "` saat ini sedang *dinonaktifkan* oleh pengaturan sheet.", null, config.BOT_TOKEN);
      return true;
    }

    // ── Tipe: BALAS_TEKS ──────────────────────────────────────────
    if (tipe === "BALAS_TEKS") {
      kirimPesanSaaS(chatId, isiPesan, null, config.BOT_TOKEN);
      return true;
    }

    // ── Tipe: BROADCAST ───────────────────────────────────────────
    if (tipe === "BROADCAST") {
      var clientSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
      var clientData  = clientSheet.getDataRange().getValues();
      var hitBroadcast = 0;
      for (var bc = 1; bc < clientData.length; bc++) {
        if (clientData[bc][3] === "AKTIF") {
          kirimPesanSaaS(clientData[bc][0].toString(), "📢 *PENGUMUMAN RESMI PLATFORM RHK:*\n\n" + isiPesan, null, config.BOT_TOKEN);
          hitBroadcast++;
        }
      }
      kirimPesanSaaS(chatId, "🚀 Perintah sheet `" + perintahSheet + "` berhasil broadcast ke *" + hitBroadcast + "* klien aktif!", null, config.BOT_TOKEN);
      return true;
    }

    // ── Tipe: KIRIM_KE_USER ───────────────────────────────────────
    // Penggunaan: /admin teguran [CHAT_ID_TARGET]
    if (tipe === "KIRIM_KE_USER") {
      var bagianTeks = text.replace(perintahSheet, "").trim();
      var targetUserId = bagianTeks !== "" ? bagianTeks.split(" ")[0] : "";

      if (!targetUserId) {
        kirimPesanSaaS(chatId, "💡 Sertakan Chat ID target setelah perintah.\nContoh: `" + perintahSheet + " 927597163`", null, config.BOT_TOKEN);
        return true;
      }

      // Ganti placeholder {chatId} jika ada di isi pesan
      var pesanFinal = isiPesan.replace(/\{chatId\}/g, targetUserId);
      kirimPesanSaaS(targetUserId, pesanFinal, null, config.BOT_TOKEN);
      kirimPesanSaaS(chatId, "✅ Pesan dari perintah sheet `" + perintahSheet + "` berhasil dikirim ke `" + targetUserId + "`.", null, config.BOT_TOKEN);
      return true;
    }

    // Tipe tidak dikenal
    kirimPesanSaaS(chatId, "⚠️ Tipe perintah `" + tipe + "` pada baris sheet tidak dikenali. Gunakan: BALAS_TEKS | BROADCAST | KIRIM_KE_USER", null, config.BOT_TOKEN);
    return true;
  }

  return false; // Tidak ada perintah yang cocok di sheet
}

// OTONOMISASI BARU: SIMPAN FILE TEMPLATE LANGSUNG KE GDRIVE PUSAT ADMIN (HIERARKI NAMA CLIENT)
function prosesUnduhTemplateWordKlien(chatId, documentObj, config) {
  try {
    var namaFile = documentObj.file_name;
    if (namaFile.indexOf(".docx") === -1) {
      kirimPesanSaaS(chatId, "❌ *Jenis berkas salah!* Mohon kirimkan file template laporan Anda dalam format dokumen Microsoft Word asli (`.docx`), Pak/Bu. 🙏", null, config.BOT_TOKEN);
      return;
    }
    
    var klien = cariAtauDaftarKlienSaaS(chatId, "");
    var adminRootDrive = DriveApp.getFolderById(SAAS_CONFIG.ADMIN_ROOT_FOLDER_ID);
    
    // Pembuatan sub-folder otomatis pakai Nama Pendaftar di dalam Drive Admin
    var folderNamaKlien;
    var iter = adminRootDrive.getFoldersByName(klien.Nama_Pendaftar);
    if (iter.hasNext()) {
      folderNamaKlien = iter.next();
    } else {
      folderNamaKlien = adminRootDrive.createFolder(klien.Nama_Pendaftar);
    }
    
    var fileRes = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/getFile?file_id=" + documentObj.file_id);
    var filePath = JSON.parse(fileRes.getContentText()).result.file_path;
    var blobWord = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + config.BOT_TOKEN + "/" + filePath).getBlob();
    
    // Simpan & konversi langsung ke format Google Docs di Drive Admin
    var resource = { title: namaFile.replace(".docx", ""), mimeType: MimeType.GOOGLE_DOCS, parents: [{id: folderNamaKlien.getId()}] };
    var googleDocFile = Drive.Files.insert(resource, blobWord);
    
    perbaruiKolomKlien(chatId, "State_Sesi", "");
    
    var peringatanSetupAdmin = "⚠️ *Pemberitahuan:* Pendaftaran Anda telah selesai dilakukan. Saat ini Admin kami sedang melakukan konfigurasi susunan menu RHK khusus berdasarkan berkas template dokumen yang Anda kirimkan.\n\nMohon ditunggu dengan tenang ya Pak/Bu, kami akan segera mengabari Anda jika menu laporan Anda sudah siap digunakan! 🥰";
    kirimPesanSaaS(chatId, peringatanSetupAdmin, null, config.BOT_TOKEN);
    
    // NOTIFIKASI DISERTAI TOMBOL PINTAS LANGSUNG KE DRIVE ADMIN (SOLUSI 2)
    var alertAdmin = "🔔 *NOTIFIKASI TEMPLATE BARU DI DRIVE ADMIN* 🔔\n\n" +
                     "👤 Pengguna: *" + klien.Nama_Pendaftar + "* (`" + chatId + "`)\n" +
                     "📄 Nama Berkas: `" + namaFile + "`\n" +
                     "🆔 Template ID Pusat: `" + googleDocFile.id + "`\n\n" +
                     "👉 *Tugas Admin:* Silakan salin ID Template tersebut, buat susunan menu barunya ke sheet *RHK_Config*, sistem otonom akan langsung membangun folder harian klien!";
                     
    var kbDriveAdmin = {"inline_keyboard": [
      [{"text": "📂 Buka Folder Drive Pusat Admin", "url": "https://drive.google.com/drive/folders/" + folderNamaKlien.getId()}]
    ]};
    kirimPesanSaaS(config.ADMIN_CHAT_ID, alertAdmin, kbDriveAdmin, config.BOT_TOKEN);
    
  } catch (err) {
    kirimPesanSaaS(chatId, "⚠️ Terjadi kegagalan penulisan dokumen ke Drive pusat Admin. Pastikan konfigurasi ID Root Admin benar.", null, config.BOT_TOKEN);
  }
}

// ====================================================================
// FUNGSI LOGISTIK TRANSAKSI KOMERSIAL MULTI-CLIENT (REVISI V5)
// Fitur baru: QR dinamis, OCR auto-approve, follow-up admin
// ====================================================================

function buatInvoiceOtonomSaaS(chatId, durasiBulan, config) {
  var hargaAwal   = { "1": 10000, "3": 30000, "6": 50000, "12": 100000 }[durasiBulan];
  // Kode unik 3 digit: pastikan tidak bertabrakan dengan transaksi pending lain
  var kodeUnik    = Math.floor(Math.random() * 900) + 100;
  var nominalTotal = hargaAwal + kodeUnik;
  var trxId = "TRX" + new Date().getTime();
  
  // Simpan record pesanan sementara ke Script Properties (keyed by chatId)
  // Catatan: ScriptProperties lebih aman dari UserProperties untuk multi-user
  var props = PropertiesService.getScriptProperties();
  props.setProperty("pending_trx_" + chatId, trxId);
  props.setProperty("pending_total_" + chatId, nominalTotal.toString());
  props.setProperty("pending_bulan_" + chatId, durasiBulan);

  perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_BUKTI_BAYAR");

  // ── QR DINAMIS ──────────────────────────────────────────────────
  // Karena QRIS statis tidak bisa embed nominal, kita:
  //   1. Generate QR code berisi teks nominal via api.qrserver.com (gratis)
  //   2. Kirim QRIS asli dari Drive sebagai foto utama
  //   3. Kirim QR nominal sebagai foto kedua — klien scan QRIS asli,
  //      lalu lihat QR nominal sebagai panduan nominal yang harus ditransfer
  var teksNominalQR = "NOMINAL TRANSFER: Rp " + nominalTotal.toLocaleString("id-ID") +
                      " | Kode: " + trxId;
  var urlQRNominal  = "https://api.qrserver.com/v1/create-qr-code/" +
                      "?size=300x300&margin=10&data=" +
                      encodeURIComponent(teksNominalQR);

  var panduanBayar =
    "🛒 *NOTA INVOICE LISENSI PREMIUM* 🛒\n\n" +
    "▪️ Kode Pesanan : `" + trxId + "`\n" +
    "▪️ Durasi Paket : *" + durasiBulan + " Bulan*\n" +
    "▪️ Harga Dasar  : `Rp " + hargaAwal.toLocaleString("id-ID") + "`\n" +
    "▪️ Kode Unik    : `+" + kodeUnik + "`\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "💰 *TOTAL TRANSFER: `Rp " + nominalTotal.toLocaleString("id-ID") + "`*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "📌 *PENTING:* Transfer nominal *PERSIS* termasuk 3 digit kode unik di akhir. " +
    "Sistem membaca kode unik ini untuk verifikasi otomatis. 🙏\n\n" +
    "1️⃣ Scan QRIS di bawah ini\n" +
    "2️⃣ Masukkan nominal *Rp " + nominalTotal.toLocaleString("id-ID") + "* secara manual\n" +
    "3️⃣ Kirim *screenshot/foto bukti pembayaran* ke chat ini";

  // Kirim QRIS statis dari Drive
  var blobQris = DriveApp.getFileById(SAAS_CONFIG.QRIS_FILE_ID).getBlob();
  UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
    {"method": "post", "payload": {"chat_id": chatId, "photo": blobQris,
     "caption": panduanBayar, "parse_mode": "Markdown"}}
  );

  // Kirim QR nominal dinamis sebagai pesan terpisah
  try {
    var blobQRNominal = UrlFetchApp.fetch(urlQRNominal, {"muteHttpExceptions": true}).getBlob();
    UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
      {"method": "post", "payload": {
        "chat_id" : chatId,
        "photo"   : blobQRNominal,
        "caption" : "📋 *QR Panduan Nominal Transfer*\n" +
                    "Kode: `" + trxId + "`\n" +
                    "Total: `Rp " + nominalTotal.toLocaleString("id-ID") + "`\n\n" +
                    "_Scan QR ini untuk melihat nominal yang harus Anda transfer._",
        "parse_mode": "Markdown"
      }}
    );
  } catch(eQR) {
    // QR nominal gagal generate — tidak fatal, QRIS utama tetap terkirim
    kirimPesanSaaS(chatId,
      "📋 *Nominal Transfer:* `Rp " + nominalTotal.toLocaleString("id-ID") + "`\n" +
      "Kode Unik: `+" + kodeUnik + "`",
      null, config.BOT_TOKEN);
  }
}

// ====================================================================
// TERIMA BUKTI BAYAR + OCR AUTO-APPROVE
// ====================================================================
// Alur:
//   1. Unduh foto ke Drive sementara
//   2. Baca teks via Google Drive OCR (gratis, tanpa API key tambahan)
//   3. Cari angka nominal di teks hasil OCR
//   4. Cocokkan dengan nominal sistem (toleransi ±5 untuk kompresi gambar)
//   5. Jika cocok pasti → AUTO APPROVE
//   6. Jika ada teks tapi nominal tidak cocok → forward ke admin + label RAGU
//   7. Jika OCR gagal/kosong → forward ke admin manual seperti sebelumnya
// ====================================================================
function terimaFotoBuktiTransferKlien(chatId, photoArray, config) {
  var props        = PropertiesService.getScriptProperties();
  var trxId        = props.getProperty("pending_trx_" + chatId) || "TRX_UNKNOWN";
  var totalSistem  = parseInt(props.getProperty("pending_total_" + chatId) || "0");
  var bulan        = props.getProperty("pending_bulan_" + chatId) || "1";
  var fileIdFoto   = photoArray[photoArray.length - 1].file_id; // resolusi tertinggi

  var klien = cariAtauDaftarKlienSaaS(chatId, "");
  perbaruiKolomKlien(chatId, "State_Sesi", "");

  kirimPesanSaaS(chatId,
    "⏳ *Bukti transfer diterima!* Sistem sedang memverifikasi nominal secara otomatis...\n" +
    "_Mohon tunggu sebentar ya, Pak/Bu._",
    null, config.BOT_TOKEN);

  // ── LANGKAH 1: Unduh foto dari Telegram ─────────────────────────
  var fotoBlob = null;
  try {
    var getFileRes  = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getFile?file_id=" + fileIdFoto,
      {"muteHttpExceptions": true}
    );
    var filePath = JSON.parse(getFileRes.getContentText()).result.file_path;
    fotoBlob = UrlFetchApp.fetch(
      "https://api.telegram.org/file/bot" + config.BOT_TOKEN + "/" + filePath,
      {"muteHttpExceptions": true}
    ).getBlob().setName("bukti_bayar.jpg").setContentType("image/jpeg");
  } catch(eUnduh) {
    // Gagal unduh → langsung ke manual review
    _forwardBuktiBayarKeAdmin(chatId, fileIdFoto, klien, bulan, totalSistem, "OCR_SKIP", config);
    return;
  }

  // ── LANGKAH 2: OCR via Google Drive ─────────────────────────────
  var hasilOCR = "";
  var driveFileId = null;
  try {
    var uploadRes = UrlFetchApp.fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&ocrLanguage=id&ocr=true",
      {
        "method"      : "post",
        "headers"     : {"Authorization": "Bearer " + ScriptApp.getOAuthToken()},
        "contentType" : "multipart/related; boundary=boundary_ocr",
        "payload"     :
          "--boundary_ocr\r\n" +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify({name: "ocr_temp_" + chatId, mimeType: "application/vnd.google-apps.document"}) +
          "\r\n--boundary_ocr\r\n" +
          "Content-Type: image/jpeg\r\n\r\n",
        "muteHttpExceptions": true
      }
    );
    // Drive v3 multipart — ambil file ID lalu baca via Docs
    var uploadJson  = JSON.parse(uploadRes.getContentText());
    driveFileId = uploadJson.id;

    if (driveFileId) {
      // Upload ulang menggunakan Drive.Files.insert (lebih reliable di GAS)
      var driveOcrFile = Drive.Files.insert(
        {title: "ocr_temp_" + chatId, mimeType: MimeType.GOOGLE_DOCS},
        fotoBlob
      );
      driveFileId  = driveOcrFile.id;
      hasilOCR = DocumentApp.openById(driveFileId).getBody().getText();
      // Hapus file OCR sementara
      DriveApp.getFileById(driveFileId).setTrashed(true);
    }
  } catch(eOCR) {
    hasilOCR = ""; // OCR gagal — akan di-handle di bawah
    if (driveFileId) {
      try { DriveApp.getFileById(driveFileId).setTrashed(true); } catch(e2) {}
    }
  }

  // ── LANGKAH 3: Parse nominal dari teks OCR ───────────────────────
  // Cari semua angka ≥ 5 digit (minimal nominal Rp10.000)
  var nominalDitemukan = _ekstrakNominalDariTeks(hasilOCR);
  var kodeUnikSistem   = totalSistem % 1000; // 3 digit terakhir = kode unik

  // ── LANGKAH 4: Keputusan auto-approve / ragu / manual ────────────
  if (nominalDitemukan !== null) {
    var selisih = Math.abs(nominalDitemukan - totalSistem);

    if (selisih <= 5) {
      // ✅ AUTO APPROVE — nominal cocok pasti
      _logSistem("AUTO_APPROVE", "ChatID " + chatId + " | Nominal OCR: " + nominalDitemukan + " | Sistem: " + totalSistem);
      eksekusiApprovePembayaranKlien(chatId + "_" + bulan, config);

      // Notif ke admin (informasi, bukan butuh aksi)
      kirimPesanSaaS(config.ADMIN_CHAT_ID,
        "🤖 *AUTO-APPROVE BERHASIL* ✅\n\n" +
        "▪️ Klien: *" + klien.Nama_Pendaftar + "* (`" + chatId + "`)\n" +
        "▪️ Nominal OCR: `Rp " + nominalDitemukan.toLocaleString("id-ID") + "`\n" +
        "▪️ Nominal Sistem: `Rp " + totalSistem.toLocaleString("id-ID") + "`\n" +
        "▪️ Paket: *" + bulan + " Bulan*\n\n" +
        "_Akun telah diaktifkan otomatis oleh sistem._",
        null, config.BOT_TOKEN);
      return;

    } else {
      // ⚠️ RAGU — OCR berhasil tapi nominal tidak cocok → admin review
      _forwardBuktiBayarKeAdmin(chatId, fileIdFoto, klien, bulan, totalSistem,
        "RAGU (OCR baca Rp " + nominalDitemukan.toLocaleString("id-ID") +
        ", sistem expect Rp " + totalSistem.toLocaleString("id-ID") + ")", config);
    }

  } else {
    // ℹ️ OCR tidak berhasil baca nominal → manual review
    _forwardBuktiBayarKeAdmin(chatId, fileIdFoto, klien, bulan, totalSistem,
      hasilOCR !== "" ? "OCR_NO_NOMINAL (teks terbaca tapi nominal tidak ditemukan)" : "OCR_GAGAL",
      config);
  }
}

// ── Helper: ekstrak angka nominal terbesar dari teks OCR ─────────
function _ekstrakNominalDariTeks(teks) {
  if (!teks || teks.trim() === "") return null;
  // Hapus titik/koma sebagai pemisah ribuan, tangkap angka ≥ 4 digit
  var teksClean = teks.replace(/\./g, "").replace(/,/g, "");
  var matches   = teksClean.match(/\b\d{4,9}\b/g);
  if (!matches || matches.length === 0) return null;
  // Ambil angka yang paling masuk akal sebagai nominal (10.000 – 999.999)
  var kandidat = matches
    .map(function(m) { return parseInt(m); })
    .filter(function(n) { return n >= 10000 && n <= 999999; });
  if (kandidat.length === 0) return null;
  // Kembalikan angka terbesar (nominal transfer biasanya angka paling besar)
  return Math.max.apply(null, kandidat);
}

// ── Helper: forward foto + info ke admin untuk review manual ─────
function _forwardBuktiBayarKeAdmin(chatId, fileIdFoto, klien, bulan, totalSistem, labelStatus, config) {
  var infoNotif =
    "🔔 *KONFIRMASI BAYAR — PERLU REVIEW* 🔔\n\n" +
    "▪️ Klien   : *" + klien.Nama_Pendaftar + "* (`" + chatId + "`)\n" +
    "▪️ Paket   : *" + bulan + " Bulan*\n" +
    "▪️ Nominal : *Rp " + parseInt(totalSistem).toLocaleString("id-ID") + "*\n" +
    "▪️ Kode Unik: `+" + (parseInt(totalSistem) % 1000) + "`\n" +
    "▪️ Status OCR: `" + labelStatus + "`\n\n" +
    "🔍 Silakan cek mutasi DANA Bisnis Anda, lalu klik tombol di bawah:";

  var kbAdmin = {"inline_keyboard": [
    [{"text": "✅ Setujui & Aktifkan Akun", "callback_data": "ADM_APP_" + chatId + "_" + bulan}],
    [{"text": "❌ Tolak Bukti Transfer",    "callback_data": "ADM_REJ_" + chatId}]
  ]};

  UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
    {"method": "post", "payload": {
      "chat_id"      : config.ADMIN_CHAT_ID.toString(),
      "photo"        : fileIdFoto,
      "caption"      : infoNotif,
      "parse_mode"   : "Markdown",
      "reply_markup" : JSON.stringify(kbAdmin)
    }}
  );

  kirimPesanSaaS(chatId,
    "✨ *Bukti transfer Anda berhasil diterima!*\n\n" +
    "Sistem sedang memproses verifikasi. Admin akan segera mengkonfirmasi " +
    "dan akun Anda akan aktif otomatis setelah disetujui. 🥰👍",
    null, config.BOT_TOKEN);
}

// ── Helper: tulis log ke sheet Log_Sistem ───────────────────────
function _logSistem(tipe, detail) {
  var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
  if (logSheet) logSheet.appendRow([new Date(), tipe, detail]);
}

function terimaFotoLaporanKegiatanKlien(chatId, photoArray, config) {
  var klien = cariAtauDaftarKlienSaaS(chatId, "");
  var count = parseInt(klien.Foto_Count || "0") + 1;
  
  if (count > 4) {
    kirimPesanSaaS(chatId, "🛑 Batas pengiriman bukti gambar hanya *maksimal 4 foto* saja demi keserasian halaman dokumen myASN Anda. Yuk, langsung ketuk tombol 'Rakit Jadi PDF' di bawah ini!", null, config.BOT_TOKEN);
    return;
  }
  
  perbaruiKolomKlien(chatId, "Foto_Count", count);
  PropertiesService.getUserProperties().setProperty(chatId + "_foto_" + count, photoArray[photoArray.length - 1].file_id);
  
  if (count < 2) {
    kirimPesanSaaS(chatId, "📸 Foto ke-1 sukses direkam! Sila kirimkan berkas *Foto Bukti Kegiatan ke-2* Anda agar syarat minimal terpenuhi ya Pak/Bu:", null, config.BOT_TOKEN);
  } else {
    var kbCetak = {"inline_keyboard": [
      [{"text": "📷 Tambah Foto Lagi (" + count + "/4)", "callback_data": "SaaS_PROSES_FOTO_LAGI"}],
      [{"text": "🚀 Kirim & Rakit Jadi PDF Now!", "callback_data": "SaaS_PROSES_NOW"}]
    ]};
    kirimPesanSaaS(chatId, "✨ Bagus! Tersimpan *" + count + " foto bukti*. Apakah Anda ingin menyudahi pengiriman dan langsung menerbitkan berkas PDF laporan hari ini?", kbCetak, config.BOT_TOKEN);
  }
}

function eksekusiApprovePembayaranKlien(callbackDataStr, config) {
  // Format callbackDataStr: "{chatId}_{durasiBulan}"
  var lastUnderscore = callbackDataStr.lastIndexOf("_");
  var targetId  = callbackDataStr.substring(0, lastUnderscore);
  var jmlBulan  = parseInt(callbackDataStr.substring(lastUnderscore + 1));

  var targetKlien = cariAtauDaftarKlienSaaS(targetId, "");
  var expBaru = new Date();
  if (targetKlien.Status_Akses === "AKTIF" && new Date(targetKlien.Masa_Aktif) > new Date()) {
    expBaru = new Date(targetKlien.Masa_Aktif); // perpanjang dari tanggal yg sudah ada
  }
  expBaru.setMonth(expBaru.getMonth() + jmlBulan);

  perbaruiKolomKlien(targetId, "Status_Akses", "AKTIF");
  perbaruiKolomKlien(targetId, "Masa_Aktif",   expBaru);
  perbaruiKolomKlien(targetId, "Warning_Sent", ""); // reset warning agar trigger jalan ulang

  // Bersihkan pending props
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty("pending_trx_"   + targetId);
  props.deleteProperty("pending_total_" + targetId);
  props.deleteProperty("pending_bulan_" + targetId);

  if (config && config.BOT_TOKEN) {
    kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(),
      "⚙️ Akun `" + targetId + "` aktif *" + jmlBulan + " bulan* (s/d " +
      Utilities.formatDate(expBaru, "GMT+7", "dd/MM/yyyy") + ").",
      null, config.BOT_TOKEN);

    var txtSuksesKlien =
      "🎉 *YAY, PEMBAYARAN PREMIUM DISETUJUI!* 🎉\n\n" +
      "Selamat Pak/Bu *" + targetKlien.Nama_Pendaftar + "*, lisensi Anda telah resmi " +
      "diverifikasi. Akun aktif hingga *" +
      Utilities.formatDate(expBaru, "GMT+7", "dd/MM/yyyy") + "*.\n\n" +
      "Ketik /lapor untuk langsung mulai membuat laporan RHK! 🚀";
    kirimPesanSaaS(targetId, txtSuksesKlien, null, config.BOT_TOKEN);
  }

  _logSistem("APPROVE", "ChatID " + targetId + " | Bulan: " + jmlBulan +
             " | Exp: " + Utilities.formatDate(expBaru, "GMT+7", "dd/MM/yyyy"));
}

function eksekusiRejectPembayaranKlien(targetId, config) {
  var kbRejBayar = {"inline_keyboard": [
    [{"text": "🔄 Coba Bayar Lagi", "callback_data": "SHORTCUT_BAYAR"}],
    [{"text": "📞 Hubungi Admin",    "callback_data": "HUBUNGI_ADMIN"}]
  ]};
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(),
    "❌ Transaksi untuk ID `" + targetId + "` berhasil ditolak.",
    null, config.BOT_TOKEN);
  kirimPesanSaaS(targetId,
    "🛑 *Konfirmasi Pembayaran Ditolak* 🛑\n\n" +
    "Mohon maaf, bukti transfer Anda dinyatakan *Tidak Valid* setelah pemeriksaan mutasi. " +
    "Silakan ulangi pembayaran dengan nominal yang tepat ya, Pak/Bu.",
    kbRejBayar, config.BOT_TOKEN);
  _logSistem("REJECT", "ChatID " + targetId);
}

// ====================================================================
// KIRIM TEMPLATE DOC KE KLIEN
// /admin kirim_template [chatId]
// ====================================================================
// Cara kerja:
//   1. Cari folder Drive Admin berdasarkan nama klien
//   2. Ambil semua file Google Doc di dalamnya
//   3. Export masing-masing sebagai .docx
//   4. Kirim ke chat klien + daftar ID untuk setup RHK_Config
// ====================================================================
function kirimTemplateKeKlien(targetChatId, adminChatId, config) {
  try {
    var klien = cariAtauDaftarKlienSaaS(targetChatId, "");
    if (!klien.Nama_Pendaftar) {
      kirimPesanSaaS(adminChatId, "❌ Chat ID `" + targetChatId + "` tidak ditemukan di database.", null, config.BOT_TOKEN);
      return;
    }

    var adminRoot = DriveApp.getFolderById(SAAS_CONFIG.ADMIN_ROOT_FOLDER_ID);
    var folderIter = adminRoot.getFoldersByName(klien.Nama_Pendaftar);
    if (!folderIter.hasNext()) {
      kirimPesanSaaS(adminChatId,
        "❌ Folder Drive untuk *" + klien.Nama_Pendaftar + "* belum ada di Drive Admin.\n" +
        "Klien belum pernah mengirim file template.", null, config.BOT_TOKEN);
      return;
    }

    var folderKlien = folderIter.next();
    var files       = folderKlien.getFiles();
    var jumlahDikirim = 0;
    var daftarId    = "";

    kirimPesanSaaS(adminChatId,
      "⏳ Mengirimkan template *" + klien.Nama_Pendaftar + "* ke ID `" + targetChatId + "`...",
      null, config.BOT_TOKEN);

    // Beritahu klien
    kirimPesanSaaS(targetChatId,
      "📄 *Admin mengirimkan file template RHK Anda!*\n\nSilakan periksa berkas di bawah ini:",
      null, config.BOT_TOKEN);

    while (files.hasNext()) {
      var file = files.next();
      var mimeType = file.getMimeType();

      // Export Google Doc → .docx, atau kirim file biasa langsung
      var blobKirim;
      if (mimeType === MimeType.GOOGLE_DOCS) {
        blobKirim = file.getAs("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                        .setName(file.getName() + ".docx");
        daftarId += "📄 `" + file.getName() + "`\n   ID: `" + file.getId() + "`\n";
      } else {
        blobKirim = file.getBlob();
      }

      kirimDokumenSaaS(targetChatId, blobKirim,
        "📋 Template: *" + file.getName() + "*", config.BOT_TOKEN);
      jumlahDikirim++;
      Utilities.sleep(500); // jeda agar tidak hit rate limit Telegram
    }

    if (jumlahDikirim === 0) {
      kirimPesanSaaS(adminChatId,
        "⚠️ Folder klien ada tapi *kosong* — belum ada template yang tersimpan.",
        null, config.BOT_TOKEN);
      return;
    }

    // Laporan ke admin: ID template yang bisa langsung dipakai di RHK_Config
    kirimPesanSaaS(adminChatId,
      "✅ *" + jumlahDikirim + " template* berhasil dikirim ke *" + klien.Nama_Pendaftar + "*.\n\n" +
      "📌 *ID Template untuk diisi ke sheet RHK_Config:*\n" + daftarId +
      "\nColom Template_ID pada RHK_Config diisi dengan ID di atas.",
      null, config.BOT_TOKEN);

  } catch(eKirim) {
    kirimPesanSaaS(adminChatId,
      "⚠️ Gagal kirim template: `" + eKirim.toString() + "`",
      null, config.BOT_TOKEN);
  }
}

// ====================================================================
// FOLLOW-UP: Tampilkan info lengkap 1 klien + deeplink WA
// ====================================================================
function tampilkanInfoFollowUp(targetChatId, adminChatId, config) {
  var klien = cariAtauDaftarKlienSaaS(targetChatId, "");
  if (!klien || klien.Status_Akses === "BELUM_DAFTAR") {
    kirimPesanSaaS(adminChatId, "❌ Chat ID `" + targetChatId + "` tidak ditemukan.", null, config.BOT_TOKEN);
    return;
  }

  var masaAktif   = klien.Masa_Aktif ? Utilities.formatDate(new Date(klien.Masa_Aktif), "GMT+7", "dd/MM/yyyy") : "—";
  var sisaHari    = klien.Masa_Aktif
    ? Math.ceil((new Date(klien.Masa_Aktif) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  var infoSisa    = sisaHari !== null
    ? (sisaHari > 0 ? "Sisa *" + sisaHari + " hari*" : "*SUDAH EXPIRED*")
    : "—";

  var noWa    = klien.No_WA ? klien.No_WA.toString() : "";
  var pesanWA = "Halo Pak/Bu " + klien.Nama_Pendaftar + ", saya Admin Platform Kinerja RHK. " +
                "Ingin menginformasikan mengenai status langganan Anda yang " +
                (sisaHari !== null && sisaHari <= 0 ? "sudah berakhir" : "akan segera berakhir") +
                ". Ketik /bayar di bot untuk perpanjangan. Terima kasih 🙏";
  var linkWA  = buatLinkWA(noWa, pesanWA);

  var info =
    "👤 *PROFIL KLIEN — FOLLOW UP*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "▪️ Nama      : *" + klien.Nama_Pendaftar + "*\n" +
    "▪️ Chat ID   : `" + targetChatId + "`\n" +
    "▪️ No. WA    : `" + (noWa || "Tidak tersedia") + "`\n" +
    "▪️ Status    : `" + klien.Status_Akses + "`\n" +
    "▪️ Masa Aktif: `" + masaAktif + "` — " + infoSisa + "\n" +
    "▪️ Total Cetak: " + (klien.Total_Laporan || 0) + "x\n" +
    "▪️ Warning Sent: `" + (klien.Warning_Sent || "—") + "`\n\n" +
    (linkWA ? "📲 Ketuk tombol di bawah untuk langsung chat via WhatsApp:" :
              "⚠️ _Nomor WA tidak tersedia. Minta klien update no WA via bot._");

  var kb = {"inline_keyboard": []};
  if (linkWA) {
    kb.inline_keyboard.push([{"text": "💬 Chat WhatsApp " + klien.Nama_Pendaftar, "url": linkWA}]);
  }
  kb.inline_keyboard.push([{"text": "📤 Kirim Pesan via Bot Telegram", "callback_data": "ADM_MSG_" + targetChatId}]);
  kb.inline_keyboard.push([{"text": "📄 Kirim Ulang Template", "callback_data": "ADM_SEND_TPL_" + targetChatId}]);

  kirimPesanSaaS(adminChatId, info, kb, config.BOT_TOKEN);
}

// ====================================================================
// FOLLOW-UP SEMUA: Daftar klien expired & hampir expired
// ====================================================================
function tampilkanDaftarFollowUpSemua(adminChatId, config) {
  var semua   = cariSemuaKlienByStatus("AKTIF");
  var sekarang = new Date();
  var daftar   = [];

  semua.forEach(function(k) {
    if (!k.Masa_Aktif) return;
    var exp     = new Date(k.Masa_Aktif);
    var sisa    = Math.ceil((exp - sekarang) / (1000 * 60 * 60 * 24));
    if (sisa <= 7) daftar.push({ klien: k, sisa: sisa });
  });

  // Tambahkan klien NONAKTIF yang mungkin sudah auto-block karena expired
  var nonaktif = cariSemuaKlienByStatus("NONAKTIF");
  nonaktif.forEach(function(k) {
    if (k.Catatan_Admin && k.Catatan_Admin.toString().indexOf("Expired") !== -1) {
      daftar.push({ klien: k, sisa: -999 });
    }
  });

  if (daftar.length === 0) {
    kirimPesanSaaS(adminChatId,
      "🎉 Tidak ada klien yang expired atau hampir expired dalam 7 hari ke depan!",
      null, config.BOT_TOKEN);
    return;
  }

  daftar.sort(function(a, b) { return a.sisa - b.sisa; });

  var teks = "⚠️ *DAFTAR KLIEN PERLU FOLLOW-UP* ⚠️\n" +
             "_(Expired / Sisa ≤ 7 hari)_\n\n";
  var kb   = {"inline_keyboard": []};

  for (var i = 0; i < daftar.length; i++) {
    var k    = daftar[i].klien;
    var sisa = daftar[i].sisa;
    var labelSisa = sisa <= 0 ? "❌ EXPIRED" : "⚠️ Sisa " + sisa + " hari";
    var noWa = k.No_WA ? k.No_WA.toString() : "";

    teks += (i + 1) + ". *" + k.Nama_Pendaftar + "* (`" + k.Chat_ID + "`)\n" +
            "   " + labelSisa + " | WA: `" + (noWa || "—") + "`\n\n";

    // Tombol WA untuk setiap klien yang punya nomor
    if (noWa) {
      var pesanWAFU = "Halo Pak/Bu " + k.Nama_Pendaftar + ", masa aktif langganan Anda " +
                      (sisa <= 0 ? "sudah berakhir" : "akan berakhir dalam " + sisa + " hari") +
                      ". Silakan ketik /bayar untuk perpanjangan. Terima kasih 🙏";
      var linkWAFU = buatLinkWA(noWa, pesanWAFU);
      if (linkWAFU) {
        kb.inline_keyboard.push([{
          "text": "💬 WA " + k.Nama_Pendaftar + " (" + (sisa <= 0 ? "Expired" : "H-" + sisa) + ")",
          "url": linkWAFU
        }]);
      }
    }
  }

  kirimPesanSaaS(adminChatId, teks, null, config.BOT_TOKEN);
  if (kb.inline_keyboard.length > 0) {
    kirimPesanSaaS(adminChatId, "📲 *Tombol WA cepat:*", kb, config.BOT_TOKEN);
  }
}