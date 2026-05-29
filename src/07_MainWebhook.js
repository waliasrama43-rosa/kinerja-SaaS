// ====================================================================
// FILE 07: PINTU GERBANG WEBHOOK UTAMA & PENGETATAN AKSES (FINAL + /BATAL)
// ====================================================================

function doPost(e) {
  try {
    var config = ambilKonfigurasiSaaS();
    var token = config.BOT_TOKEN;
    var update = JSON.parse(e.postData.contents);

    // ----------------------------------------------------------------
    // 0. ANTI-GANDA: lewati update yang sudah pernah diproses.
    //    Telegram mengirim ulang update bila webhook lambat merespon,
    //    sehingga tanpa ini QRIS/pesan bisa terkirim berkali-kali.
    // ----------------------------------------------------------------
    if (update.update_id) {
      var lock = LockService.getScriptLock();
      try { lock.waitLock(15000); } catch (eLock) {}
      var cache = CacheService.getScriptCache();
      var kunciUpd = "upd_" + update.update_id;
      if (cache.get(kunciUpd)) {
        try { lock.releaseLock(); } catch (e3) {}
        return HtmlService.createHtmlOutput("OK"); // sudah diproses, abaikan
      }
      cache.put(kunciUpd, "1", 600); // tandai selama 10 menit
      try { lock.releaseLock(); } catch (e4) {}
    }

    // ----------------------------------------------------------------
    // 1. DISTRIBUSI KLIK TOMBOL INLINE KEYBOARD (CALLBACK QUERY)
    // ----------------------------------------------------------------
    if (update.callback_query) {
      var chatId = update.callback_query.message.chat.id.toString();
      var data = update.callback_query.data;

      // Beri tahu Telegram bahwa klik tombol sudah diterima (hentikan animasi loading).
      try {
        UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/answerCallbackQuery", {
          "method": "post", "contentType": "application/json",
          "payload": JSON.stringify({ "callback_query_id": update.callback_query.id }),
          "muteHttpExceptions": true
        });
      } catch (eCb) {}

      var klien = cariAtauDaftarKlienSaaS(chatId, "");
      
      if (data.indexOf("REG_JML_") === 0) {
        var jml = data.replace("REG_JML_", "");
        if (jml === "MANUAL") {
          perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_JML_RHK_MANUAL");
          kirimPesanSaaS(chatId, "⌨️ Silakan ketikkan jumlah RHK yang ingin Anda kelola menggunakan angka biasa:", null, token);
        } else {
          kunciJumlahRhkDanLanjut(chatId, parseInt(jml), token);
        }
      }
      else if (data === "REG_WORD_SUDAH") {
        perbaruiKolomKlien(chatId, "State_Sesi", "");
        tampilkanMenuPaketKomersial(chatId, token);
      }
      
      // PROTEKSI INTERAKTIF: Pengunci bypass tombol menu laporan
      else if (data.indexOf("RUN_RHK_") === 0 || data.indexOf("SET_TGL_") === 0 || data === "SaaS_PROSES_NOW") {
        if (klien.Status_Akses !== "AKTIF") {
          kirimPesanSaaS(chatId, "🔒 *Akses Ditutup!* Silakan selesaikan pendaftaran dan aktivasi pembayaran akun premium Anda terlebih dahulu, Pak/Bu! 🥰", null, token);
          return HtmlService.createHtmlOutput("OK");
        }
        
        // JIKA AKTIF: Proses RHK
        if (data.indexOf("RUN_RHK_") === 0) {
          perbaruiKolomKlien(chatId, "RHK_Terpilih", data.replace("RUN_RHK_", ""));
          tampilkanMenuTanggalSaaS(chatId, token);
        }
        // JIKA AKTIF: Proses Pemilihan Tanggal
        else if (data.indexOf("SET_TGL_") === 0) {
          if (data === "SET_TGL_MANUAL") {
            perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_TGL_MANUAL");
            kirimPesanSaaS(chatId, "⌨️ Silakan ketik tanggal laporan dengan format *DD/MM/YYYY*.\nContoh: `22/05/2026`", null, token);
          } else {
            var pTgl = data.split("_"); 
            perbaruiKolomKlien(chatId, "Tanggal_Terpilih", pTgl[2]);
            perbaruiKolomKlien(chatId, "Hari_Terpilih", pTgl[3]);
            kirimPesanSaaS(chatId, "🗓️ Tanggal dikunci: *" + pTgl[2] + "*", null, token);
            analisisDanMulaiPertanyaanDoc(chatId, token); // Memicu pembacaan Word
          }
        }
        // JIKA AKTIF: Proses Cetak Laporan
        else if (data === "SaaS_PROSES_NOW") {
          if (parseInt(klien.Foto_Count) < 2) {
            kirimPesanSaaS(chatId, "⚠️ Berkas Anda belum memenuhi syarat minimal pencetakan. Harap kirimkan minimal 2 foto terlebih dahulu yaaa!", null, token);
          } else {
            perbaruiKolomKlien(chatId, "State_Sesi", "PROSES_PDF");
            kirimPesanSaaS(chatId, "⏳ *Sedang merakit dokumen laporan premium Anda...* Mohon tunggu sejenak, berkas PDF sedang dikemas otonom.", null, token);
            cetakBerkasLaporanPremiumSaaS(chatId, config);
          }
        }
      }
      
      // ALUR PERTANYAAN (SKIP & KOMPLAIN)
      else if (data.indexOf("SKIP_TAG_") === 0) {
        var tagSkip = data.replace("SKIP_TAG_", "");
        PropertiesService.getUserProperties().setProperty(chatId + "_ans_" + tagSkip, "-");
        pindahKePertanyaanBerikutnya(chatId, token);
      }
      else if (data.indexOf("KOMPLAIN_TAG_") === 0) {
        var tagErr = data.replace("KOMPLAIN_TAG_", "");
        PropertiesService.getUserProperties().setProperty(chatId + "_ans_" + tagErr, "-");
        var alertErr = "🛑 *ADUAN SALAH SETTING TEMPLATE* 🛑\n\nKlien *" + klien.Nama_Pendaftar + "* (`" + chatId + "`) melaporkan ketidaksesuaian kode tag `{{ " + tagErr + " }}` pada RHK *" + klien.RHK_Terpilih + "*. Sila periksa file template kustom miliknya, Pak Admin!";
        kirimPesanSaaS(config.ADMIN_CHAT_ID, alertErr, null, token);
        kirimPesanSaaS(chatId, "⚠️ Laporan salah setting berhasil diteruskan ke Admin! Kolom ini diisi tanda strip (`-`) otomatis agar layout cetak Anda tetap rapi. Mari lanjut.", null, token);
        pindahKePertanyaanBerikutnya(chatId, token);
      }
      
      // ALUR PEMBELIAN & TAMBAH FOTO
      else if (data.indexOf("ORDER_PAKET_") === 0) {
        buatInvoiceOtonomSaaS(chatId, data.replace("ORDER_PAKET_", ""), config);
      }
      else if (data === "SaaS_PROSES_FOTO_LAGI") {
        kirimPesanSaaS(chatId, "📸 Silakan kirimkan file foto bukti kegiatan Anda berikutnya:", null, token);
      }
      else if (data === "RETRY_CETAK_NOW") {
        perbaruiKolomKlien(chatId, "State_Sesi", "PROSES_PDF");
        kirimPesanSaaS(chatId, "⏳ *Sedang merakit ulang dokumen laporan premium Anda...* Mohon tunggu sejenak.", null, token);
        cetakBerkasLaporanPremiumSaaS(chatId, config);
      }
      
      // ALUR ADMIN (APPROVE & REJECT)
      else if (data.indexOf("ADM_APP_") === 0) {
        eksekusiApprovePembayaranKlien(data.replace("ADM_APP_", ""), config);
      }
      else if (data.indexOf("ADM_REJ_") === 0) {
        eksekusiRejectPembayaranKlien(data.replace("ADM_REJ_", ""), config);
      }
      
      return HtmlService.createHtmlOutput("OK");
    }

    // ----------------------------------------------------------------
    // 2. DISTRIBUSI SEGALA BENTUK PESAN MASUK (MESSAGE UPDATE)
    // ----------------------------------------------------------------
    if (update.message) {
      var chatId = update.message.chat.id.toString();
      var klien = cariAtauDaftarKlienSaaS(chatId, update.message.from.first_name);

      if (update.message.text) {
        var text = update.message.text.trim();
        
        // 🟢 FITUR BARU: PERINTAH /BATAL UNTUK MERESET SESI KLIEN 🟢
        if (text.toLowerCase() === "/batal") {
          perbaruiKolomKlien(chatId, "State_Sesi", ""); // Kosongkan status sesi di spreadsheet
          
          // Sapu bersih seluruh data isian memori sementara klien ini di server Google
          var props = PropertiesService.getUserProperties();
          var keys = props.getKeys();
          for (var i = 0; i < keys.length; i++) { 
            if (keys[i].indexOf(chatId) === 0) props.deleteProperty(keys[i]); 
          }
          
          kirimPesanSaaS(chatId, "✅ *Aksi Berhasil Dibatalkan!*\n\nSeluruh sesi isian Anda telah dibersihkan dari memori sistem. Silakan ketik perintah /lapor atau /bayar untuk memulai kembali dengan data yang baru.", null, token);
          return HtmlService.createHtmlOutput("OK");
        }

        // KUNCI SESI KETAT UNTUK PENGGUNA YANG MENCOBA PERINTAH /LAPOR SECARA ILEGAL
        if ((text === "/lapor" || text === "/start") && klien.Status_Akses !== "AKTIF" && klien.Status_Akses !== "BELUM_DAFTAR") {
          kirimPesanSaaS(chatId, "🔒 *Akses Pelaporan Terkunci!* Bapak/Ibu mohon maaf, menu pelaporan belum dapat dibuka. Silakan selesaikan rangkaian registrasi administrasi dan pembayaran paket premium Anda terlebih dahulu ya Pak/Bu! 🥰", null, token);
          return HtmlService.createHtmlOutput("OK");
        }
        
        // Cek jika ini adalah perintah Admin
        if (chatId === config.ADMIN_CHAT_ID.toString() && text.indexOf("/admin") === 0) {
          var isCmdAdmin = prosesFiturAdminSaaS(update, config);
          if (isCmdAdmin) return HtmlService.createHtmlOutput("OK");
        }

        // Jalur pendaftaran klien baru
        if (klien.State_Sesi.indexOf("REG_") === 0) {
          jalankanWizardPendaftaran(chatId, text, klien.State_Sesi, token);
          return HtmlService.createHtmlOutput("OK");
        }
      }

      // Lolos verifikasi keamanan, teruskan ke pemrosesan pesan teks/foto/dokumen biasa
      if (update.message.document) {
        prosesUnduhTemplateWordKlien(chatId, update.message.document, config);
      } else if (update.message.photo) {
        if (klien.State_Sesi === "TUNGGU_BUKTI_BAYAR") terimaFotoBuktiTransferKlien(chatId, update.message.photo, config);
        else if (klien.State_Sesi === "TUNGGU_FOTO") terimaFotoLaporanKegiatanKlien(chatId, update.message.photo, config);
      } else {
        prosesFiturKlienSaaS(update, config, token);
      }
    }
  } catch (err) {
    // Selalu catat ke Stackdriver/Executions agar error TIDAK pernah tersembunyi
    console.error("CRITICAL DOPOST ERROR: " + err.toString() + " | Stack: " + (err.stack || "-"));
    try {
      var ssLog = SpreadsheetApp.getActiveSpreadsheet();
      var logSheet = ssLog ? ssLog.getSheetByName("Log_Sistem") : null;
      if (logSheet) logSheet.appendRow([new Date(), "CRITICAL DOPOST ERROR", err.toString()]);
    } catch (e2) {
      console.error("Gagal menulis Log_Sistem: " + e2.toString());
    }
  }
  return HtmlService.createHtmlOutput("OK");
}