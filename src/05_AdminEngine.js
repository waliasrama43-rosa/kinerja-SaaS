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
    var targetAktifId = text.replace("/admin aktifkan ", "").trim();
    var tglExp = new Date(); tglExp.setMonth(tglExp.getMonth() + 1);
    perbaruiKolomKlien(targetAktifId, "Status_Akses", "AKTIF");
    perbaruiKolomKlien(targetAktifId, "Masa_Aktif", tglExp);
    kirimPesanSaaS(chatId, "✅ Sukses membuka gembok akun ID `" + targetAktifId + "`.", null, config.BOT_TOKEN);
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

// [Fungsi buatInvoiceOtonomSaaS, terimaFotoBuktiTransferKlien, terimaFotoLaporanKegiatanKlien, eksekusiApprovePembayaranKlien, eksekusiRejectPembayaranKlien tetap utuh di bawah baris ini]

// ====================================================================
// FUNGSI LOGISTIK TRANSAKSI KOMERSIAL MULTI-CLIENT (PASTIKAN ADA DI FILE 05)
// ====================================================================

function buatInvoiceOtonomSaaS(chatId, durasiBulan, config) {
  var hargaAwal = { "1": 10000, "3": 30000, "6": 50000, "12": 100000 }[durasiBulan];
  var kodeUnik = Math.floor(Math.random() * 900) + 100; // 3 Digit Acak Sistem
  var nominalTotal = hargaAwal + kodeUnik;
  var trxId = "TRX" + new Date().getTime();
  
  // Simpan record pesanan sementara ke User Properties agar webhook tahu nominal yang ditunggu
  var props = PropertiesService.getUserProperties();
  props.setProperty(chatId + "_pending_trx_id", trxId);
  props.setProperty(chatId + "_pending_total", nominalTotal.toString());
  props.setProperty(chatId + "_pending_bulan", durasiBulan);
  
  perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_BUKTI_BAYAR");
  
  var panduanBayar = "🛒 *NOTA INVOICE LISENSI PREMIUM* 🛒\n\n" +
                     "▪️ Kode Pesanan: `" + trxId + "`\n" +
                     "▪️ Durasi Paket: *" + durasiBulan + " Bulan*\n" +
                     "▪️ *TOTAL TRANSFER:* `Rp " + nominalTotal.toLocaleString("id-ID") + "`\n\n" +
                     "📌 *PENTING:* Mohon transfer nominal persis hingga *3 digit angka terakhir* ya Pak/Bu. Kelebihan nilai transfer diniatkan sebagai keikhlasan biaya otentikasi sistem. 🙏\n\n" +
                     "Silakan scan QRIS Dana Bisnis di bawah ini, kemudian langsung *kirimkan foto bukti transfer* Anda ke bot ini:";
  
  // Ambil gambar fisik QRIS langsung dari Google Drive Admin
  var blobQris = DriveApp.getFileById(SAAS_CONFIG.QRIS_FILE_ID).getBlob();
  var pLoad = { "chat_id": chatId, "photo": blobQris, "caption": panduanBayar, "parse_mode": "Markdown" };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto", { "method": "post", "payload": pLoad });
}

function terimaFotoBuktiTransferKlien(chatId, photoArray, config) {
  var props = PropertiesService.getUserProperties();
  var trxId = props.getProperty(chatId + "_pending_trx_id") || "TRX_UNKNOWN";
  var totalSistem = props.getProperty(chatId + "_pending_total") || "0";
  var bulan = props.getProperty(chatId + "_pending_bulan") || "1";
  var fileIdFoto = photoArray[photoArray.length - 1].file_id;
  
  var klien = cariAtauDaftarKlienSaaS(chatId, "");
  perbaruiKolomKlien(chatId, "State_Sesi", ""); // Bebaskan sesi klien
  
  var infoNotif = "🔔 *KONFIRMASI BAYAR MASUK MULTI-CLIENT* 🔔\n\n" +
                   "▪️ Pengguna: *" + klien.Nama_Pendaftar + "* (`" + chatId + "`)\n" +
                   "▪️ Paket Order: *" + bulan + " Bulan*\n" +
                   "▪️ Nominal Sistem: *Rp " + parseInt(totalSistem).toLocaleString("id-ID") + "*\n" +
                   "▪️ Kode Unik: `+" + totalSistem.slice(-3) + "`\n\n" +
                   "🟢 *VERIFIKASI KODE UNIK:* Silakan buka aplikasi DANA Bisnis Anda dan cocokkan apakah ada dana masuk dengan akhiran angka tersebut, lalu klik opsi menu di bawah ini:";
                   
  var kbAdmin = {"inline_keyboard": [
    [{"text": "✅ Setujui & Aktifkan Akun", "callback_data": "ADM_APP_" + chatId + "_" + bulan}],
    [{"text": "❌ Tolak Bukti Transfer", "callback_data": "ADM_REJ_" + chatId}]
  ]};
  
  var pLoad = { "chat_id": config.ADMIN_CHAT_ID.toString(), "photo": fileIdFoto, "caption": infoNotif, "parse_mode": "Markdown", "reply_markup": JSON.stringify(kbAdmin) };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto", { "method": "post", "payload": pLoad });
  
  kirimPesanSaaS(chatId, "✨ *Bukti transfer Anda berhasil diterima!* \n\nSistem telah meneruskannya kepada Admin untuk divalidasi via mutasi rekening. Akun premium Anda akan segera aktif otomatis setelah disetujui ya, Pak/Bu! 🥰👍", null, config.BOT_TOKEN);
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
  var p = callbackDataStr.split("_"); // [chatId, durasiBulan]
  var targetId = p[0]; var jmlBulan = parseInt(p[1]);
  
  var targetKlien = cariAtauDaftarKlienSaaS(targetId, "");
  var expBaru = new Date();
  if (targetKlien.Status_Akses === "AKTIF" && new Date(targetKlien.Masa_Aktif) > new Date()) {
    expBaru = new Date(targetKlien.Masa_Aktif);
  }
  expBaru.setMonth(expBaru.getMonth() + jmlBulan);
  
  perbaruiKolomKlien(targetId, "Status_Akses", "AKTIF");
  perbaruiKolomKlien(targetId, "Masa_Aktif", expBaru);
  
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(), "⚙️ Sukses memvalidasi pembayaran. Akun `" + targetId + "` telah aktif premium.", null, config.BOT_TOKEN);
  
  var txtSuksesKlien = "🎉 *YAY, PEMBAYARAN PREMIUM DISETUJUI!* 🎉\n\n" +
                       "Selamat Pak/Bu *" + targetKlien.Nama_Pendaftar + "*, lisensi Anda telah resmi diverifikasi oleh Admin. Akun Anda kini aktif kembali hingga tanggal *" + Utilities.formatDate(expBaru, "GMT+7", "dd/MM/yyyy") + "*.\n\n" +
                       "Silakan kirimkan file template laporan Microsoft Word (`.docx`) RHK Anda langsung ke chat bot ini sebagai syarat setup awal pembuatan tombol menu, Pak/Bu! 🥰🚀";
  kirimPesanSaaS(targetId, txtSuksesKlien, null, config.BOT_TOKEN);
}

function eksekusiRejectPembayaranKlien(targetId, config) {
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(), "❌ Transaksi untuk ID `" + targetId + "` berhasil ditolak sepihak.", null, config.BOT_TOKEN);
  kirimPesanSaaS(targetId, "🛑 *Konfirmasi Pembayaran Ditolak* 🛑\n\nMohon maaf, bukti transfer yang Anda kirimkan dinyatakan *Tidak Valid* oleh Admin setelah pemeriksaan mutasi. Silakan lakukan pemesanan ulang dengan mengetik /bayar dan pastikan nominal transfer sesuai.", null, config.BOT_TOKEN);
}