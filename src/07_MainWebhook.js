// ====================================================================
// FILE 07: PINTU GERBANG WEBHOOK UTAMA (REVISI V6 — QUEUE ENABLED)
// ====================================================================
//
// STRATEGI RINGAN vs BERAT:
//
//   RINGAN → proses langsung (< 300ms, aman dari timeout Telegram)
//   ─────────────────────────────────────────────────────────────
//   • Semua teks: /start, /lapor, /batal, /bayar, perintah admin
//   • Callback navigasi: SHORTCUT_*, HUBUNGI_ADMIN, REG_*, ORDER_*
//   • Callback info: PENDING_INFO_TEMPLATE, REG_LANJUT, RETRY tombol
//
//   BERAT → masuk antrian → worker proses tiap 1 menit
//   ─────────────────────────────────────────────────────────────
//   • Foto bukti transfer (OCR + Drive upload)
//   • Foto laporan kegiatan (simpan file_id, tunggu PROSES_NOW)
//   • Upload dokumen .docx (Drive upload + konversi GDoc)
//   • Callback SaaS_PROSES_NOW (generate PDF = operasi terlama)
//
// ====================================================================

function doPost(e) {
  try {
    var config = ambilKonfigurasiSaaS();
    var token  = config.BOT_TOKEN;
    var update = JSON.parse(e.postData.contents);

    // ==============================================================
    // 1. CALLBACK QUERY — semua ringan kecuali SaaS_PROSES_NOW
    // ==============================================================
    if (update.callback_query) {
      var cbChatId = update.callback_query.message.chat.id.toString();
      var cbData   = update.callback_query.data;
      var cbKlien  = cariAtauDaftarKlienSaaS(cbChatId, "");

      // ── [BERAT] Generate PDF → antrian ──────────────────────────
      if (cbData === "SaaS_PROSES_NOW") {
        if (cbKlien.Status_Akses !== "AKTIF") {
          kirimPesanSaaS(cbChatId,
            "🔒 *Akses ditutup.* Selesaikan aktivasi akun terlebih dahulu.",
            {"inline_keyboard": [[tombolHubungiAdminWA()]]}, token);
          return HtmlService.createHtmlOutput("OK");
        }
        if (parseInt(cbKlien.Foto_Count) < 2) {
          kirimPesanSaaS(cbChatId,
            "⚠️ Minimal *2 foto* diperlukan. Kirimkan foto ke-2 terlebih dahulu.",
            null, token);
          return HtmlService.createHtmlOutput("OK");
        }
        // Masukkan ke antrian + ACK instan
        var masuk = masukkanKeAntrian(cbChatId, TIPE_ANTRIAN.CETAK_PDF, update);
        if (masuk) {
          kirimPesanSaaS(cbChatId,
            "📥 *Permintaan cetak PDF diterima!*\n\n" +
            "Laporan sedang masuk antrian pemrosesan. " +
            "PDF akan dikirimkan dalam beberapa saat. ⏳",
            null, token);
        } else {
          // Fallback: proses langsung jika antrian gagal
          perbaruiKolomKlien(cbChatId, "State_Sesi", "PROSES_PDF");
          kirimPesanSaaS(cbChatId,
            "⏳ *Merakit laporan PDF...* Mohon tunggu sebentar.", null, token);
          cetakBerkasLaporanPremiumSaaS(cbChatId, config);
        }
        return HtmlService.createHtmlOutput("OK");
      }

      // ── [RINGAN] Semua callback lainnya ─────────────────────────
      return _prosesCallbackRingan(cbChatId, cbData, cbKlien, update, config, token);
    }

    // ==============================================================
    // 2. MESSAGE — pisah ringan vs berat
    // ==============================================================
    if (update.message) {
      var msgChatId = update.message.chat.id.toString();
      var msgKlien  = cariAtauDaftarKlienSaaS(msgChatId, update.message.from.first_name);

      // ── [BERAT] Foto ─────────────────────────────────────────────
      if (update.message.photo) {
        return _prosesPhotoBerat(msgChatId, msgKlien, update, config, token);
      }

      // ── [BERAT] Dokumen .docx ────────────────────────────────────
      if (update.message.document) {
        var namaFile = (update.message.document.file_name || "").toLowerCase();
        if (namaFile.indexOf(".docx") !== -1) {
          var masukDoc = masukkanKeAntrian(msgChatId, TIPE_ANTRIAN.DOKUMEN_DOCX, update);
          if (masukDoc) {
            kirimPesanSaaS(msgChatId,
              "📥 *File template diterima!*\n\n" +
              "File *" + update.message.document.file_name + "* sedang diproses. " +
              "Admin akan menerima notifikasi dalam beberapa saat. ⏳",
              null, token);
          } else {
            // Fallback langsung
            prosesUnduhTemplateWordKlien(msgChatId, update.message.document, config);
          }
        } else {
          // Bukan .docx → tolak langsung (ringan)
          kirimPesanSaaS(msgChatId,
            "❌ *Format file salah.*\n\nSistem hanya menerima file *Microsoft Word (.docx)*.",
            {"inline_keyboard": [[tombolHubungiAdminWA()]]}, token);
        }
        return HtmlService.createHtmlOutput("OK");
      }

      // ── [RINGAN] Semua teks ──────────────────────────────────────
      if (update.message.text) {
        return _prosesTeksRingan(msgChatId, msgKlien, update, config, token);
      }
    }

  } catch (err) {
    var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
    if (logSheet) logSheet.appendRow([new Date(), "CRITICAL_DOPOST", err.toString()]);
  }
  return HtmlService.createHtmlOutput("OK");
}


// ====================================================================
// HANDLER FOTO BERAT
// ====================================================================
function _prosesPhotoBerat(chatId, klien, update, config, token) {
  var state = klien.State_Sesi || "";

  // Foto bukti bayar → OCR berat
  if (state === "TUNGGU_BUKTI_BAYAR") {
    var masukBayar = masukkanKeAntrian(chatId, TIPE_ANTRIAN.FOTO_BAYAR, update);
    if (masukBayar) {
      kirimPesanSaaS(chatId,
        "📥 *Bukti pembayaran diterima!*\n\n" +
        "Sistem sedang memverifikasi nominal secara otomatis. " +
        "Hasilnya akan dikirimkan dalam beberapa saat. ⏳",
        null, token);
    } else {
      // Fallback langsung
      terimaFotoBuktiTransferKlien(chatId, update.message.photo, config);
    }
    return HtmlService.createHtmlOutput("OK");
  }

  // Foto laporan kegiatan
  if (state === "TUNGGU_FOTO") {
    var masukFoto = masukkanKeAntrian(chatId, TIPE_ANTRIAN.FOTO_LAPORAN, update);
    if (masukFoto) {
      // ACK singkat — bukan "loading lama", foto cepat diproses worker
      kirimPesanSaaS(chatId,
        "📸 *Foto diterima!* Sedang disimpan ke sistem...",
        null, token);
    } else {
      terimaFotoLaporanKegiatanKlien(chatId, update.message.photo, config);
    }
    return HtmlService.createHtmlOutput("OK");
  }

  // Foto di luar konteks yang diharapkan → abaikan / fallback ke engine klien
  prosesFiturKlienSaaS(update, config, token);
  return HtmlService.createHtmlOutput("OK");
}

// ====================================================================
// HANDLER TEKS RINGAN
// ====================================================================
function _prosesTeksRingan(chatId, klien, update, config, token) {
  var text = update.message.text.trim();

  // /batal — bersihkan sesi
  if (text.toLowerCase() === "/batal") {
    perbaruiKolomKlien(chatId, "State_Sesi", "");
    var propsBl = PropertiesService.getScriptProperties();
    var allBl   = propsBl.getProperties();
    for (var kBl in allBl) {
      if (kBl.indexOf("sess_" + chatId + "_") === 0) propsBl.deleteProperty(kBl);
    }
    kirimPesanSaaS(chatId,
      "✅ *Sesi dibatalkan.* Semua data isian telah dibersihkan.\n\nSilakan mulai kembali:",
      {"inline_keyboard": [
        [{"text":"📋 Mulai Laporan RHK",   "callback_data":"SHORTCUT_LAPOR"}],
        [{"text":"💎 Info Paket Langganan", "callback_data":"SHORTCUT_BAYAR"}]
      ]}, token);
    return HtmlService.createHtmlOutput("OK");
  }

  // Blokir /lapor saat status tidak valid
  if ((text === "/lapor" || text === "/start") &&
      klien.Status_Akses !== "AKTIF" &&
      klien.Status_Akses !== "BELUM_DAFTAR") {
    kirimPesanSaaS(chatId,
      "🔒 *Akses pelaporan belum tersedia.*\n\n" +
      "Selesaikan proses pendaftaran dan pembayaran terlebih dahulu.",
      {"inline_keyboard": [
        [{"text":"💎 Lihat Paket Langganan", "callback_data":"SHORTCUT_BAYAR"}],
        [tombolHubungiAdminWA()]
      ]}, token);
    return HtmlService.createHtmlOutput("OK");
  }

  // Perintah admin
  if (chatId === config.ADMIN_CHAT_ID.toString() && text.indexOf("/admin") === 0) {
    prosesFiturAdminSaaS(update, config);
    return HtmlService.createHtmlOutput("OK");
  }

  // Wizard pendaftaran
  if (klien.State_Sesi.indexOf("REG_") === 0) {
    jalankanWizardPendaftaran(chatId, text, klien.State_Sesi, token);
    return HtmlService.createHtmlOutput("OK");
  }

  // Semua teks lainnya → engine klien
  prosesFiturKlienSaaS(update, config, token);
  return HtmlService.createHtmlOutput("OK");
}


// ====================================================================
// HANDLER CALLBACK RINGAN (semua callback selain SaaS_PROSES_NOW)
// ====================================================================
function _prosesCallbackRingan(cbChatId, cbData, cbKlien, update, config, token) {

  // ── Universal ───────────────────────────────────────────────────
  if (cbData === "HUBUNGI_ADMIN") {
    tampilkanKontakAdmin(cbChatId, token);
    return HtmlService.createHtmlOutput("OK");
  }

  if (cbData === "PENDING_INFO_TEMPLATE") {
    kirimPesanSaaS(cbChatId,
      "📄 *Cara Mengirim File Template*\n\n" +
      "1. Siapkan file laporan RHK dalam format *Microsoft Word (.docx)*\n" +
      "2. Di Telegram, ketuk ikon 📎 (lampiran)\n" +
      "3. Pilih *File* — cari dan pilih file .docx Anda\n" +
      "4. Kirim ke chat ini — sistem meneruskan ke Admin otomatis\n\n" +
      "📌 Pastikan format file adalah *.docx* (bukan .doc, .pdf, dll).",
      null, token);
    return HtmlService.createHtmlOutput("OK");
  }

  if (cbData === "REG_LANJUT") {
    var sesiLanjut = cbKlien.State_Sesi || "";
    if (sesiLanjut.indexOf("REG_") === 0) {
      jalankanWizardPendaftaran(cbChatId, "", sesiLanjut, token);
    } else {
      kirimPesanSaaS(cbChatId, "Ketik /start untuk melanjutkan.", null, token);
    }
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Shortcut navigasi ───────────────────────────────────────────
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
      kirimPesanSaaS(cbChatId,
        "🔒 Akses pelaporan belum tersedia. Pastikan akun aktif dan masa berlaku valid.",
        {"inline_keyboard": [
          [{"text":"💎 Lihat Paket", "callback_data":"SHORTCUT_BAYAR"}],
          [tombolHubungiAdminWA()]
        ]}, token);
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
    kirimPesanSaaS(cbChatId,
      "✅ *Sesi dibatalkan.* Data isian dibersihkan.\n\nSilakan mulai kembali:",
      {"inline_keyboard": [
        [{"text":"📋 Mulai Laporan RHK",   "callback_data":"SHORTCUT_LAPOR"}],
        [{"text":"💎 Info Paket Langganan", "callback_data":"SHORTCUT_BAYAR"}]
      ]}, token);
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Admin: aksi cepat dashboard ─────────────────────────────────
  var isAdmin = (cbChatId === config.ADMIN_CHAT_ID.toString());

  if (isAdmin && cbData === "ADM_CEK_SISTEM") {
    prosesFiturAdminSaaS(
      {message:{chat:{id:cbChatId},from:{first_name:"Admin"},text:"/admin cek_sistem"}},
      config);
    return HtmlService.createHtmlOutput("OK");
  }
  if (isAdmin && cbData === "ADM_CEK_DAFTAR") {
    prosesFiturAdminSaaS(
      {message:{chat:{id:cbChatId},from:{first_name:"Admin"},text:"/admin cek_pendaftaran"}},
      config);
    return HtmlService.createHtmlOutput("OK");
  }
  if (isAdmin && cbData === "ADM_CEK_ANTRIAN") {
    tampilkanStatusAntrianKeAdmin(cbChatId, token);
    return HtmlService.createHtmlOutput("OK");
  }
  if (isAdmin && cbData === "ADM_RESET_STUCK") {
    var n = resetStuckProcessing();
    kirimPesanSaaS(cbChatId,
      "🔄 Reset *" + n + "* item stuck PROCESSING → PENDING.", null, config.BOT_TOKEN);
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Admin: matikan alarm darurat ("Stop Alarm") ─────────────────
  if (isAdmin && cbData.indexOf("ALERT_ACK_") === 0) {
    matikanAlertDarurat(cbData.replace("ALERT_ACK_", ""), cbChatId, config);
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Admin: aktifkan akun dari notif template ─────────────────────
  if (isAdmin && cbData.indexOf("ADM_AKTIFKAN_") === 0) {
    var targetAktifId = cbData.replace("ADM_AKTIFKAN_", "");
    var klienTarget   = cariAtauDaftarKlienSaaS(targetAktifId, "");
    var tglExpAktif   = new Date();
    tglExpAktif.setMonth(tglExpAktif.getMonth() + 1);
    perbaruiKolomKlien(targetAktifId, "Status_Akses", "AKTIF");
    perbaruiKolomKlien(targetAktifId, "Masa_Aktif",   tglExpAktif);
    perbaruiKolomKlien(targetAktifId, "Warning_Sent", "");
    var expAktifStr = Utilities.formatDate(tglExpAktif, "GMT+7", "dd/MM/yyyy");
    kirimPesanSaaS(cbChatId,
      "✅ *" + (klienTarget.Nama_Pendaftar || targetAktifId) + "* diaktifkan " +
      "*1 bulan* hingga *" + expAktifStr + "*.\n\n" +
      "💡 Gunakan `/admin aktifkan " + targetAktifId + " [bulan]` untuk durasi berbeda.",
      null, config.BOT_TOKEN);
    kirimPesanSaaS(targetAktifId,
      "🎉 *Akun Anda Telah Diaktifkan!*\n\n" +
      "Halo *" + getSapaan(klienTarget.Nama_Pendaftar) +
      "*, menu pelaporan RHK sudah siap.\n\nKetik /lapor untuk mulai. 🚀",
      null, config.BOT_TOKEN);
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Admin: reminder massal pendaftaran macet ─────────────────────
  if (isAdmin && cbData === "ADM_REMINDER_MACET") {
    kirimPesanSaaS(cbChatId,
      "⏳ Mengirim reminder ke semua klien pendaftaran macet...",
      null, config.BOT_TOKEN);
    cekDanIngatkanPendaftaranMacet();
    kirimPesanSaaS(cbChatId, "✅ Selesai. Cek Log_Sistem untuk detail.",
      null, config.BOT_TOKEN);
    return HtmlService.createHtmlOutput("OK");
  }

  if (isAdmin && cbData.indexOf("ADM_FU_") === 0) {
    tampilkanInfoFollowUp(cbData.replace("ADM_FU_", ""), cbChatId, config);
    return HtmlService.createHtmlOutput("OK");
  }
  if (isAdmin && cbData.indexOf("ADM_MSG_") === 0) {
    var msgTarget = cbData.replace("ADM_MSG_", "");
    var klienMsg  = cariAtauDaftarKlienSaaS(msgTarget, "");
    kirimPesanSaaS(msgTarget,
      "🔔 *Pemberitahuan dari Admin Kinerja RHK*\n\n" +
      "Halo *" + getSapaan(klienMsg.Nama_Pendaftar) +
      "*, masa aktif akun Anda akan segera berakhir atau telah berakhir.\n\n" +
      "Lakukan perpanjangan agar pelaporan RHK tetap berjalan lancar.",
      {"inline_keyboard": [
        [{"text":"💎 Perpanjang Sekarang", "callback_data":"SHORTCUT_BAYAR"}],
        [tombolHubungiAdminWA()]
      ]}, token);
    kirimPesanSaaS(cbChatId,
      "✅ Pesan reminder terkirim ke `" + msgTarget + "`.", null, config.BOT_TOKEN);
    return HtmlService.createHtmlOutput("OK");
  }
  if (isAdmin && cbData.indexOf("ADM_SEND_TPL_") === 0) {
    kirimTemplateKeKlien(cbData.replace("ADM_SEND_TPL_", ""), cbChatId, config);
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Registrasi ───────────────────────────────────────────────────
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
    kirimPesanSaaS(cbChatId,
      "✅ *Pendaftaran awal selesai!*\n\n" +
      "Admin akan segera memverifikasi dan menyiapkan menu RHK.\n\n" +
      "Jika belum mengirim file template .docx, kirimkan sekarang ke chat ini.",
      {"inline_keyboard": [
        [{"text":"📄 Cara Kirim File Template", "callback_data":"PENDING_INFO_TEMPLATE"}],
        [tombolHubungiAdminWA()]
      ]}, token);
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Proteksi tombol RHK & tanggal ───────────────────────────────
  if (cbData.indexOf("RUN_RHK_") === 0 || cbData.indexOf("SET_TGL_") === 0) {
    if (cbKlien.Status_Akses !== "AKTIF") {
      kirimPesanSaaS(cbChatId,
        "🔒 *Akses ditutup.* Selesaikan pembayaran dan aktivasi akun terlebih dahulu.",
        {"inline_keyboard": [
          [{"text":"💎 Lihat Paket", "callback_data":"SHORTCUT_BAYAR"}],
          [tombolHubungiAdminWA()]
        ]}, token);
      return HtmlService.createHtmlOutput("OK");
    }
    if (cbData.indexOf("RUN_RHK_") === 0) {
      perbaruiKolomKlien(cbChatId, "RHK_Terpilih", cbData.replace("RUN_RHK_", ""));
      tampilkanMenuTanggalSaaS(cbChatId, token);
    } else {
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
    }
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Kuesioner ───────────────────────────────────────────────────
  if (cbData.indexOf("SKIP_TAG_") === 0) {
    PropertiesService.getScriptProperties()
      .setProperty("sess_" + cbChatId + "_ans_" + cbData.replace("SKIP_TAG_", ""), "-");
    pindahKePertanyaanBerikutnya(cbChatId, token);
    return HtmlService.createHtmlOutput("OK");
  }
  if (cbData.indexOf("KOMPLAIN_TAG_") === 0) {
    var tagErr = cbData.replace("KOMPLAIN_TAG_", "");
    PropertiesService.getScriptProperties()
      .setProperty("sess_" + cbChatId + "_ans_" + tagErr, "-");
    kirimPesanSaaS(config.ADMIN_CHAT_ID,
      "🛑 *Aduan Salah Setting Template*\n\n" +
      "Klien *" + cbKlien.Nama_Pendaftar + "* (`" + cbChatId + "`)\n" +
      "Tag: `{{" + tagErr + "}}` pada RHK *" + cbKlien.RHK_Terpilih + "*",
      null, token);
    kirimPesanSaaS(cbChatId,
      "⚠️ Laporan diteruskan ke Admin. Kolom ini diisi `-` agar cetak tetap rapi. Lanjut.",
      null, token);
    pindahKePertanyaanBerikutnya(cbChatId, token);
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Pembelian & foto lagi ────────────────────────────────────────
  if (cbData.indexOf("ORDER_PAKET_") === 0) {
    buatInvoiceOtonomSaaS(cbChatId, cbData.replace("ORDER_PAKET_", ""), config);
    return HtmlService.createHtmlOutput("OK");
  }
  if (cbData === "SaaS_PROSES_FOTO_LAGI") {
    kirimPesanSaaS(cbChatId, "📸 Kirimkan foto berikutnya:", null, token);
    return HtmlService.createHtmlOutput("OK");
  }
  if (cbData === "RETRY_CETAK_NOW") {
    // Retry juga lewat antrian
    var masukRetry = masukkanKeAntrian(cbChatId, TIPE_ANTRIAN.CETAK_PDF, update);
    if (masukRetry) {
      kirimPesanSaaS(cbChatId,
        "🔄 *Permintaan cetak ulang diterima!* " +
        "PDF akan dikirimkan dalam beberapa saat. ⏳", null, token);
    } else {
      perbaruiKolomKlien(cbChatId, "State_Sesi", "PROSES_PDF");
      kirimPesanSaaS(cbChatId, "⏳ *Merakit ulang PDF...* Mohon tunggu.", null, token);
      cetakBerkasLaporanPremiumSaaS(cbChatId, config);
    }
    return HtmlService.createHtmlOutput("OK");
  }

  // ── Approve / Reject pembayaran ──────────────────────────────────
  if (cbData.indexOf("ADM_APP_") === 0) {
    eksekusiApprovePembayaranKlien(cbData.replace("ADM_APP_", ""), config);
    return HtmlService.createHtmlOutput("OK");
  }
  if (cbData.indexOf("ADM_REJ_") === 0) {
    eksekusiRejectPembayaranKlien(cbData.replace("ADM_REJ_", ""), config);
    return HtmlService.createHtmlOutput("OK");
  }

  return HtmlService.createHtmlOutput("OK");
}
