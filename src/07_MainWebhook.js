// ====================================================================
// FILE 07: PINTU GERBANG WEBHOOK UTAMA & PENGETATAN AKSES (FINAL + /BATAL)
// ====================================================================

function doPost(e) {
  try {
    var config = ambilKonfigurasiSaaS();
    var token = config.BOT_TOKEN;
    var update = JSON.parse(e.postData.contents);
    
    // ----------------------------------------------------------------
    // 1. DISTRIBUSI KLIK TOMBOL INLINE KEYBOARD (CALLBACK QUERY)
    // ----------------------------------------------------------------
    if (update.callback_query) {
      var chatId = update.callback_query.message.chat.id.toString();
      var data = update.callback_query.data;
      var klien = cariAtauDaftarKlienSaaS(chatId, "");

      // ── TOMBOL UNIVERSAL: HUBUNGI ADMIN ─────────────────────────────
      // Aktif tanpa syarat — bisa ditekan kapanpun oleh siapapun
      if (data === "HUBUNGI_ADMIN") {
        tampilkanKontakAdmin(chatId, token);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── SHORTCUT NAVIGASI CEPAT (dari pesan fallback & batal) ───────
      if (data === "SHORTCUT_BAYAR") {
        tampilkanMenuPaketKomersial(chatId, token);
        return HtmlService.createHtmlOutput("OK");
      }

      if (data === "SHORTCUT_BATAL") {
        perbaruiKolomKlien(chatId, "State_Sesi", "");
        var propsB = PropertiesService.getUserProperties();
        var keysB = propsB.getKeys();
        for (var bi = 0; bi < keysB.length; bi++) {
          if (keysB[bi].indexOf(chatId) === 0) propsB.deleteProperty(keysB[bi]);
        }
        var kbSetelahBatal = {"inline_keyboard": [
          [{"text": "📋 Mulai Laporan RHK", "callback_data": "SHORTCUT_LAPOR"}],
          [{"text": "💎 Info Paket Langganan", "callback_data": "SHORTCUT_BAYAR"}]
        ]};
        kirimPesanSaaS(chatId, "✅ *Sesi berhasil dibatalkan!*\n\nData isian telah dibersihkan. Silakan mulai kembali:", kbSetelahBatal, token);
        return HtmlService.createHtmlOutput("OK");
      }

      if (data === "SHORTCUT_LAPOR") {
        var propsL = PropertiesService.getUserProperties();
        var keysL = propsL.getKeys();
        for (var li = 0; li < keysL.length; li++) {
          if (keysL[li].indexOf(chatId) === 0) propsL.deleteProperty(keysL[li]);
        }
        if (klien.Status_Akses === "AKTIF" && new Date() <= new Date(klien.Masa_Aktif) && parseInt(klien.Limit_Harian) > 0) {
          perbaruiKolomKlien(chatId, "State_Sesi", "PILIH_RHK");
          perbaruiKolomKlien(chatId, "Foto_Count", 0);
          tampilkanMenuRHKKlien(chatId, token);
        } else {
          var kbLaporBlokir = {"inline_keyboard": [
            [{"text": "💎 Lihat Paket Langganan", "callback_data": "SHORTCUT_BAYAR"}],
            [{"text": "📞 Hubungi Admin", "callback_data": "HUBUNGI_ADMIN"}]
          ]};
          kirimPesanSaaS(chatId, "🔒 Akses pelaporan belum tersedia. Pastikan akun Anda aktif dan masa berlaku masih valid ya, Pak/Bu!", kbLaporBlokir, token);
        }
        return HtmlService.createHtmlOutput("OK");
      }

      // ── CALLBACK AKSI CEPAT ADMIN (tombol dari /admin daftar_chatid) ─
      if (data === "ADM_CEK_SISTEM" && chatId === config.ADMIN_CHAT_ID.toString()) {
        var fakeCekSistemUpdate = { message: { chat: { id: chatId }, from: { first_name: "Admin" }, text: "/admin cek_sistem" } };
        prosesFiturAdminSaaS(fakeCekSistemUpdate, config);
        return HtmlService.createHtmlOutput("OK");
      }

      if (data === "ADM_CEK_DAFTAR" && chatId === config.ADMIN_CHAT_ID.toString()) {
        var fakeCekDaftarUpdate = { message: { chat: { id: chatId }, from: { first_name: "Admin" }, text: "/admin cek_pendaftaran" } };
        prosesFiturAdminSaaS(fakeCekDaftarUpdate, config);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── CALLBACK ADMIN: Follow-up detail dari notif warning ────────
      if (data.indexOf("ADM_FU_") === 0 && chatId === config.ADMIN_CHAT_ID.toString()) {
        var fuChatId = data.replace("ADM_FU_", "");
        tampilkanInfoFollowUp(fuChatId, chatId, config);
        return HtmlService.createHtmlOutput("OK");
      }
      if (data.indexOf("ADM_MSG_") === 0 && chatId === config.ADMIN_CHAT_ID.toString()) {
        var targetMsgId = data.replace("ADM_MSG_", "");
        var kbMsgKlien  = {"inline_keyboard": [
          [{"text": "💎 Perpanjang Sekarang", "callback_data": "SHORTCUT_BAYAR"}],
          [{"text": "📞 Hubungi Admin",        "callback_data": "HUBUNGI_ADMIN"}]
        ]};
        kirimPesanSaaS(targetMsgId,
          "🔔 *Pemberitahuan dari Admin Platform RHK*\n\n" +
          "Yth. Bapak/Ibu, Admin ingin menginformasikan bahwa masa aktif langganan Anda " +
          "akan segera berakhir atau telah berakhir.\n\n" +
          "Silakan lakukan perpanjangan agar dapat melanjutkan pelaporan RHK Anda. 🙏",
          kbMsgKlien, token);
        kirimPesanSaaS(chatId, "✅ Pesan reminder berhasil dikirim ke `" + targetMsgId + "`.", null, config.BOT_TOKEN);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── CALLBACK ADMIN: Kirim ulang template ke klien ──────────────
      if (data.indexOf("ADM_SEND_TPL_") === 0 && chatId === config.ADMIN_CHAT_ID.toString()) {
        var targetTplId = data.replace("ADM_SEND_TPL_", "");
        kirimTemplateKeKlien(targetTplId, chatId, config);
        return HtmlService.createHtmlOutput("OK");
      }

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
          var kbAksesBlokir = {"inline_keyboard": [
            [{"text": "💎 Lihat Paket Langganan", "callback_data": "SHORTCUT_BAYAR"}],
            [{"text": "📞 Hubungi Admin", "callback_data": "HUBUNGI_ADMIN"}]
          ]};
          kirimPesanSaaS(chatId, "🔒 *Akses Ditutup!* Silakan selesaikan pendaftaran dan aktivasi pembayaran akun premium Anda terlebih dahulu, Pak/Bu! 🥰", kbAksesBlokir, token);
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
          
          var kbSelesaiBatal = {"inline_keyboard": [
            [{"text": "📋 Mulai Laporan RHK", "callback_data": "SHORTCUT_LAPOR"}],
            [{"text": "💎 Info Paket Langganan", "callback_data": "SHORTCUT_BAYAR"}]
          ]};
          kirimPesanSaaS(chatId, "✅ *Aksi Berhasil Dibatalkan!*\n\nSeluruh sesi isian Anda telah dibersihkan dari memori sistem. Silakan pilih menu di bawah:", kbSelesaiBatal, token);
          return HtmlService.createHtmlOutput("OK");
        }

        // KUNCI SESI KETAT UNTUK PENGGUNA YANG MENCOBA PERINTAH /LAPOR SECARA ILEGAL
        if ((text === "/lapor" || text === "/start") && klien.Status_Akses !== "AKTIF" && klien.Status_Akses !== "BELUM_DAFTAR") {
          var kbTerkunci = {"inline_keyboard": [
            [{"text": "💎 Lihat Paket Langganan", "callback_data": "SHORTCUT_BAYAR"}],
            [{"text": "📞 Hubungi Admin", "callback_data": "HUBUNGI_ADMIN"}]
          ]};
          kirimPesanSaaS(chatId, "🔒 *Akses Pelaporan Terkunci!* Bapak/Ibu mohon maaf, menu pelaporan belum dapat dibuka. Silakan selesaikan rangkaian registrasi administrasi dan pembayaran paket premium Anda terlebih dahulu ya Pak/Bu! 🥰", kbTerkunci, token);
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