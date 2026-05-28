// ====================================================================
// FILE 07: PINTU GERBANG WEBHOOK UTAMA (REVISI V5)
// ====================================================================

function doPost(e) {
  try {
    var config = ambilKonfigurasiSaaS();
    var token  = config.BOT_TOKEN;
    var update = JSON.parse(e.postData.contents);

    // ================================================================
    // 1. CALLBACK QUERY (klik tombol inline keyboard)
    // ================================================================
    if (update.callback_query) {
      var cbChatId = update.callback_query.message.chat.id.toString();
      var cbData   = update.callback_query.data;
      var cbKlien  = cariAtauDaftarKlienSaaS(cbChatId, "");

      // ── Universal: Hubungi Admin ────────────────────────────────
      if (cbData === "HUBUNGI_ADMIN") {
        tampilkanKontakAdmin(cbChatId, token);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Universal: Info cara kirim template (PENDING_RHK) ───────
      if (cbData === "PENDING_INFO_TEMPLATE") {
        kirimPesanSaaS(cbChatId,
          "📄 *Cara Mengirim File Template*\n\n" +
          "1. Siapkan file laporan RHK dalam format *Microsoft Word (.docx)*\n" +
          "2. Di Telegram, ketuk ikon 📎 (lampiran)\n" +
          "3. Pilih *File* — cari dan pilih file .docx Anda\n" +
          "4. Kirim ke chat ini — sistem akan meneruskan ke Admin otomatis\n\n" +
          "📌 *Catatan:* Pastikan format file adalah *.docx* " +
          "(bukan .doc, .pdf, atau format lain).\n\n" +
          "Setelah file diterima, Admin akan menyiapkan menu pelaporan RHK " +
          "dan memberikan notifikasi ketika sudah siap digunakan. 🙏",
          null, token);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Lanjutkan pendaftaran (REG_LANJUT) ──────────────────────
      if (cbData === "REG_LANJUT") {
        var sesiLanjut = cbKlien.State_Sesi || "";
        if (sesiLanjut.indexOf("REG_") === 0) {
          jalankanWizardPendaftaran(cbChatId, "", sesiLanjut, token);
        } else {
          kirimPesanSaaS(cbChatId,
            "Ketik /start untuk melanjutkan proses.", null, token);
        }
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Shortcut navigasi ───────────────────────────────────────
      if (cbData === "SHORTCUT_BAYAR") {
        tampilkanMenuPaketKomersial(cbChatId, token);
        return HtmlService.createHtmlOutput("OK");
      }

      if (cbData === "SHORTCUT_LAPOR") {
        var propsL = PropertiesService.getScriptProperties();
        var allL   = propsL.getProperties();
        for (var kL in allL) {
          if (kL.indexOf("sess_" + cbChatId + "_") === 0) propsL.deleteProperty(kL);
        }
        if (cbKlien.Status_Akses === "AKTIF" &&
            new Date() <= new Date(cbKlien.Masa_Aktif) &&
            parseInt(cbKlien.Limit_Harian) > 0) {
          perbaruiKolomKlien(cbChatId, "State_Sesi", "PILIH_RHK");
          perbaruiKolomKlien(cbChatId, "Foto_Count", 0);
          tampilkanMenuRHKKlien(cbChatId, token);
        } else {
          var kbBlkd = {"inline_keyboard": [
            [{"text": "💎 Lihat Paket Langganan", "callback_data": "SHORTCUT_BAYAR"}],
            [tombolHubungiAdminWA()]
          ]};
          kirimPesanSaaS(cbChatId,
            "🔒 Akses pelaporan belum tersedia. " +
            "Pastikan akun aktif dan masa berlaku masih valid.",
            kbBlkd, token);
        }
        return HtmlService.createHtmlOutput("OK");
      }

      if (cbData === "SHORTCUT_BATAL") {
        perbaruiKolomKlien(cbChatId, "State_Sesi", "");
        var propsBt = PropertiesService.getScriptProperties();
        var allBt   = propsBt.getProperties();
        for (var kBt in allBt) {
          if (kBt.indexOf("sess_" + cbChatId + "_") === 0) propsBt.deleteProperty(kBt);
        }
        var kbBatal = {"inline_keyboard": [
          [{"text": "📋 Mulai Laporan RHK",      "callback_data": "SHORTCUT_LAPOR"}],
          [{"text": "💎 Info Paket Langganan",    "callback_data": "SHORTCUT_BAYAR"}]
        ]};
        kirimPesanSaaS(cbChatId,
          "✅ *Sesi dibatalkan.* Data isian telah dibersihkan.\n\nSilakan mulai kembali:",
          kbBatal, token);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Admin: Aksi cepat dari dashboard ────────────────────────
      if (cbData === "ADM_CEK_SISTEM" && cbChatId === config.ADMIN_CHAT_ID.toString()) {
        prosesFiturAdminSaaS(
          {message:{chat:{id:cbChatId},from:{first_name:"Admin"},text:"/admin cek_sistem"}},
          config);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData === "ADM_CEK_DAFTAR" && cbChatId === config.ADMIN_CHAT_ID.toString()) {
        prosesFiturAdminSaaS(
          {message:{chat:{id:cbChatId},from:{first_name:"Admin"},text:"/admin cek_pendaftaran"}},
          config);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Admin: Aktifkan akun langsung dari notif template ────────
      // Dipicu tombol "✅ Aktifkan Akun Klien" di pesan notif template masuk
      if (cbData.indexOf("ADM_AKTIFKAN_") === 0 && cbChatId === config.ADMIN_CHAT_ID.toString()) {
        var targetAktifId = cbData.replace("ADM_AKTIFKAN_", "");
        var klienTarget   = cariAtauDaftarKlienSaaS(targetAktifId, "");
        var sapaanTarget  = getSapaan(klienTarget.Nama_Pendaftar);
        var tglExpAktif   = new Date();
        tglExpAktif.setMonth(tglExpAktif.getMonth() + 1); // default 1 bulan
        perbaruiKolomKlien(targetAktifId, "Status_Akses", "AKTIF");
        perbaruiKolomKlien(targetAktifId, "Masa_Aktif",   tglExpAktif);
        perbaruiKolomKlien(targetAktifId, "Warning_Sent", "");
        var expAktifStr = Utilities.formatDate(tglExpAktif, "GMT+7", "dd/MM/yyyy");
        kirimPesanSaaS(cbChatId,
          "✅ Akun *" + (klienTarget.Nama_Pendaftar||targetAktifId) +
          "* (`" + targetAktifId + "`) diaktifkan *1 bulan* hingga *" + expAktifStr + "*.\n\n" +
          "💡 Gunakan `/admin aktifkan " + targetAktifId + " [bulan]` untuk durasi berbeda.",
          null, config.BOT_TOKEN);
        kirimPesanSaaS(targetAktifId,
          "🎉 *Akun Anda Telah Diaktifkan!*\n\n" +
          "Halo *" + sapaanTarget + "*, menu pelaporan RHK sudah siap digunakan.\n\n" +
          "Ketik /lapor untuk mulai membuat laporan pertama Anda. 🚀",
          null, config.BOT_TOKEN);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Admin: Reminder pendaftaran massal ───────────────────────
      if (cbData === "ADM_REMINDER_MACET" && cbChatId === config.ADMIN_CHAT_ID.toString()) {
        kirimPesanSaaS(cbChatId,
          "⏳ Mengirim reminder ke semua klien dengan pendaftaran macet...",
          null, config.BOT_TOKEN);
        cekDanIngatkanPendaftaranMacet();
        kirimPesanSaaS(cbChatId,
          "✅ Proses reminder selesai. Cek Log_Sistem untuk detail.",
          null, config.BOT_TOKEN);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Admin: Follow-up detail dari notif warning ───────────────
      if (cbData.indexOf("ADM_FU_") === 0 && cbChatId === config.ADMIN_CHAT_ID.toString()) {
        tampilkanInfoFollowUp(cbData.replace("ADM_FU_", ""), cbChatId, config);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Admin: Kirim pesan reminder bot ke klien ─────────────────
      if (cbData.indexOf("ADM_MSG_") === 0 && cbChatId === config.ADMIN_CHAT_ID.toString()) {
        var msgTarget = cbData.replace("ADM_MSG_", "");
        var klienMsg  = cariAtauDaftarKlienSaaS(msgTarget, "");
        var kbRmd     = {"inline_keyboard": [
          [{"text":"💎 Perpanjang Sekarang", "callback_data":"SHORTCUT_BAYAR"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(msgTarget,
          "🔔 *Pemberitahuan dari Admin Kinerja RHK*\n\n" +
          "Halo *" + getSapaan(klienMsg.Nama_Pendaftar) + "*, " +
          "masa aktif akun premium Anda akan segera berakhir atau telah berakhir.\n\n" +
          "Lakukan perpanjangan agar pelaporan RHK tetap berjalan lancar.",
          kbRmd, token);
        kirimPesanSaaS(cbChatId,
          "✅ Pesan reminder terkirim ke `" + msgTarget + "`.",
          null, config.BOT_TOKEN);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Admin: Kirim ulang template ke klien ─────────────────────
      if (cbData.indexOf("ADM_SEND_TPL_") === 0 && cbChatId === config.ADMIN_CHAT_ID.toString()) {
        kirimTemplateKeKlien(cbData.replace("ADM_SEND_TPL_", ""), cbChatId, config);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Registrasi: Pilih jumlah RHK ────────────────────────────
      if (cbData.indexOf("REG_JML_") === 0) {
        var jml = cbData.replace("REG_JML_", "");
        if (jml === "MANUAL") {
          perbaruiKolomKlien(cbChatId, "State_Sesi", "REG_TUNGGU_JML_RHK_MANUAL");
          kirimPesanSaaS(cbChatId,
            "⌨️ Ketikkan jumlah RHK yang ingin dikelola (angka):", null, token);
        } else {
          kunciJumlahRhkDanLanjut(cbChatId, parseInt(jml), token);
        }
        return HtmlService.createHtmlOutput("OK");
      }

      if (cbData === "REG_WORD_SUDAH") {
        perbaruiKolomKlien(cbChatId, "Status_Akses", "REG_WIZARD");
        perbaruiKolomKlien(cbChatId, "State_Sesi",   "");
        var kbSudahKirim = {"inline_keyboard": [
          [{"text":"📄 Cara Kirim File Template", "callback_data":"PENDING_INFO_TEMPLATE"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(cbChatId,
          "✅ *Pendaftaran awal selesai!*\n\n" +
          "Admin akan segera memverifikasi dan menyiapkan menu RHK. " +
          "Notifikasi dikirimkan begitu sistem siap.\n\n" +
          "Jika belum mengirim file template .docx, kirimkan sekarang ke chat ini.",
          kbSudahKirim, token);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Proteksi tombol RHK/tanggal/cetak ───────────────────────
      if (cbData.indexOf("RUN_RHK_") === 0 ||
          cbData.indexOf("SET_TGL_") === 0 ||
          cbData === "SaaS_PROSES_NOW") {

        if (cbKlien.Status_Akses !== "AKTIF") {
          var kbBlk = {"inline_keyboard": [
            [{"text":"💎 Lihat Paket", "callback_data":"SHORTCUT_BAYAR"}],
            [tombolHubungiAdminWA()]
          ]};
          kirimPesanSaaS(cbChatId,
            "🔒 *Akses ditutup.* Selesaikan pembayaran dan aktivasi akun terlebih dahulu.",
            kbBlk, token);
          return HtmlService.createHtmlOutput("OK");
        }

        if (cbData.indexOf("RUN_RHK_") === 0) {
          perbaruiKolomKlien(cbChatId, "RHK_Terpilih", cbData.replace("RUN_RHK_", ""));
          tampilkanMenuTanggalSaaS(cbChatId, token);

        } else if (cbData.indexOf("SET_TGL_") === 0) {
          if (cbData === "SET_TGL_MANUAL") {
            perbaruiKolomKlien(cbChatId, "State_Sesi", "TUNGGU_TGL_MANUAL");
            kirimPesanSaaS(cbChatId,
              "⌨️ Ketik tanggal dengan format *DD/MM/YYYY*\nContoh: `22/05/2026`",
              null, token);
          } else {
            var pTgl = cbData.split("_");
            perbaruiKolomKlien(cbChatId, "Tanggal_Terpilih", pTgl[2]);
            perbaruiKolomKlien(cbChatId, "Hari_Terpilih",    pTgl[3]);
            kirimPesanSaaS(cbChatId, "🗓️ Tanggal dikunci: *" + pTgl[2] + "*", null, token);
            analisisDanMulaiPertanyaanDoc(cbChatId, token);
          }

        } else if (cbData === "SaaS_PROSES_NOW") {
          if (parseInt(cbKlien.Foto_Count) < 2) {
            kirimPesanSaaS(cbChatId,
              "⚠️ Minimal *2 foto* diperlukan. Kirimkan foto ke-2 terlebih dahulu.",
              null, token);
          } else {
            perbaruiKolomKlien(cbChatId, "State_Sesi", "PROSES_PDF");
            kirimPesanSaaS(cbChatId,
              "⏳ *Merakit laporan PDF...* Mohon tunggu sebentar.", null, token);
            cetakBerkasLaporanPremiumSaaS(cbChatId, config);
          }
        }
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Kuesioner: skip / komplain ───────────────────────────────
      if (cbData.indexOf("SKIP_TAG_") === 0) {
        var tagSkip = cbData.replace("SKIP_TAG_", "");
        PropertiesService.getScriptProperties()
          .setProperty("sess_" + cbChatId + "_ans_" + tagSkip, "-");
        pindahKePertanyaanBerikutnya(cbChatId, token);
        return HtmlService.createHtmlOutput("OK");
      }

      if (cbData.indexOf("KOMPLAIN_TAG_") === 0) {
        var tagErr  = cbData.replace("KOMPLAIN_TAG_", "");
        PropertiesService.getScriptProperties()
          .setProperty("sess_" + cbChatId + "_ans_" + tagErr, "-");
        kirimPesanSaaS(config.ADMIN_CHAT_ID,
          "🛑 *Aduan Salah Setting Template*\n\n" +
          "Klien *" + cbKlien.Nama_Pendaftar + "* (`" + cbChatId + "`)\n" +
          "Tag: `{{" + tagErr + "}}` pada RHK *" + cbKlien.RHK_Terpilih + "*\n\n" +
          "Periksa file template kustom miliknya.",
          null, token);
        kirimPesanSaaS(cbChatId,
          "⚠️ Laporan diteruskan ke Admin. " +
          "Kolom ini diisi `-` otomatis agar cetak tetap rapi. Lanjut.",
          null, token);
        pindahKePertanyaanBerikutnya(cbChatId, token);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Pembelian paket ──────────────────────────────────────────
      if (cbData.indexOf("ORDER_PAKET_") === 0) {
        buatInvoiceOtonomSaaS(cbChatId, cbData.replace("ORDER_PAKET_", ""), config);
        return HtmlService.createHtmlOutput("OK");
      }

      if (cbData === "SaaS_PROSES_FOTO_LAGI") {
        kirimPesanSaaS(cbChatId, "📸 Kirimkan foto berikutnya:", null, token);
        return HtmlService.createHtmlOutput("OK");
      }

      if (cbData === "RETRY_CETAK_NOW") {
        perbaruiKolomKlien(cbChatId, "State_Sesi", "PROSES_PDF");
        kirimPesanSaaS(cbChatId, "⏳ *Merakit ulang laporan PDF...* Mohon tunggu.", null, token);
        cetakBerkasLaporanPremiumSaaS(cbChatId, config);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Admin: Approve / Reject pembayaran ───────────────────────
      if (cbData.indexOf("ADM_APP_") === 0) {
        eksekusiApprovePembayaranKlien(cbData.replace("ADM_APP_", ""), config);
        return HtmlService.createHtmlOutput("OK");
      }
      if (cbData.indexOf("ADM_REJ_") === 0) {
        eksekusiRejectPembayaranKlien(cbData.replace("ADM_REJ_", ""), config);
        return HtmlService.createHtmlOutput("OK");
      }

      return HtmlService.createHtmlOutput("OK");
    } // end callback_query

    // ================================================================
    // 2. MESSAGE (teks / foto / dokumen)
    // ================================================================
    if (update.message) {
      var msgChatId = update.message.chat.id.toString();
      var msgKlien  = cariAtauDaftarKlienSaaS(
        msgChatId, update.message.from.first_name);

      if (update.message.text) {
        var msgText = update.message.text.trim();

        // ── /batal ──────────────────────────────────────────────
        if (msgText.toLowerCase() === "/batal") {
          perbaruiKolomKlien(msgChatId, "State_Sesi", "");
          var propsBl = PropertiesService.getScriptProperties();
          var allBl   = propsBl.getProperties();
          for (var kBl in allBl) {
            if (kBl.indexOf("sess_" + msgChatId + "_") === 0) propsBl.deleteProperty(kBl);
          }
          var kbBl = {"inline_keyboard": [
            [{"text":"📋 Mulai Laporan RHK",   "callback_data":"SHORTCUT_LAPOR"}],
            [{"text":"💎 Info Paket Langganan", "callback_data":"SHORTCUT_BAYAR"}]
          ]};
          kirimPesanSaaS(msgChatId,
            "✅ *Sesi dibatalkan.* Semua data isian telah dibersihkan.\n\nSilakan mulai kembali:",
            kbBl, token);
          return HtmlService.createHtmlOutput("OK");
        }

        // ── Blokir /lapor saat status tidak valid ────────────────
        if ((msgText === "/lapor" || msgText === "/start") &&
            msgKlien.Status_Akses !== "AKTIF" &&
            msgKlien.Status_Akses !== "BELUM_DAFTAR") {
          var kbTk = {"inline_keyboard": [
            [{"text":"💎 Lihat Paket Langganan", "callback_data":"SHORTCUT_BAYAR"}],
            [tombolHubungiAdminWA()]
          ]};
          kirimPesanSaaS(msgChatId,
            "🔒 *Akses pelaporan belum tersedia.*\n\n" +
            "Selesaikan proses pendaftaran dan pembayaran terlebih dahulu.",
            kbTk, token);
          return HtmlService.createHtmlOutput("OK");
        }

        // ── Perintah admin ───────────────────────────────────────
        if (msgChatId === config.ADMIN_CHAT_ID.toString() &&
            msgText.indexOf("/admin") === 0) {
          prosesFiturAdminSaaS(update, config);
          return HtmlService.createHtmlOutput("OK");
        }

        // ── Wizard pendaftaran ───────────────────────────────────
        if (msgKlien.State_Sesi.indexOf("REG_") === 0) {
          jalankanWizardPendaftaran(msgChatId, msgText, msgKlien.State_Sesi, token);
          return HtmlService.createHtmlOutput("OK");
        }
      }

      // ── Dokumen (.docx template) ─────────────────────────────────
      if (update.message.document) {
        prosesUnduhTemplateWordKlien(msgChatId, update.message.document, config);
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Foto ─────────────────────────────────────────────────────
      if (update.message.photo) {
        if (msgKlien.State_Sesi === "TUNGGU_BUKTI_BAYAR") {
          terimaFotoBuktiTransferKlien(msgChatId, update.message.photo, config);
        } else if (msgKlien.State_Sesi === "TUNGGU_FOTO") {
          terimaFotoLaporanKegiatanKlien(msgChatId, update.message.photo, config);
        }
        return HtmlService.createHtmlOutput("OK");
      }

      // ── Teks biasa / perintah lainnya ────────────────────────────
      prosesFiturKlienSaaS(update, config, token);
    }

  } catch (err) {
    var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
    if (logSheet) logSheet.appendRow([new Date(), "CRITICAL_DOPOST", err.toString()]);
  }
  return HtmlService.createHtmlOutput("OK");
}
