// ====================================================================
// FILE 03: INTERACTIVE ONBOARDING WIZARD (REVISI V2 + NO_WA)
// ====================================================================

function jalankanWizardPendaftaran(chatId, text, state, token) {

  // ── STEP 1: Nama lengkap ─────────────────────────────────────────
  if (state === "REG_TUNGGU_NAMA") {
    perbaruiKolomKlien(chatId, "Nama_Pendaftar", text);
    perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_NO_WA");

    kirimPesanEngine(chatId,
      "Salam kenal Pak/Bu *" + text + "*! ✨\n\n" +
      "Untuk memudahkan Admin menghubungi Anda jika ada kendala atau informasi penting, " +
      "mohon ketikkan *Nomor WhatsApp aktif* Anda berikut ini:\n\n" +
      "📱 Contoh format: `08123456789` atau `628123456789`\n\n" +
      "_Nomor ini hanya digunakan Admin untuk follow-up resmi platform, tidak akan dibagikan ke pihak lain._",
      null, token);
    return;
  }

  // ── STEP 2: Nomor WhatsApp ───────────────────────────────────────
  if (state === "REG_TUNGGU_NO_WA") {
    var noWaBersih = text.replace(/[^0-9]/g, "");

    if (noWaBersih.length < 9 || noWaBersih.length > 15) {
      kirimPesanEngine(chatId,
        "⚠️ *Format nomor tidak valid!*\n\n" +
        "Mohon ketikkan nomor WhatsApp aktif Anda dengan benar.\n" +
        "Contoh: `08123456789`\n\n" +
        "Jika tidak ingin mengisi, ketik *skip* untuk melewati langkah ini.",
        null, token);
      return;
    }

    perbaruiKolomKlien(chatId, "No_WA", noWaBersih);
    perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_JML_RHK");

    var kbRhk = {"inline_keyboard": [
      [{"text": "1 RHK", "callback_data": "REG_JML_1"},
       {"text": "2 RHK", "callback_data": "REG_JML_2"},
       {"text": "3 RHK", "callback_data": "REG_JML_3"}],
      [{"text": "4 RHK", "callback_data": "REG_JML_4"},
       {"text": "5 RHK", "callback_data": "REG_JML_5"},
       {"text": "6 RHK", "callback_data": "REG_JML_6"}],
      [{"text": "⌨️ Lebih Dari 6 RHK", "callback_data": "REG_JML_MANUAL"}]
    ]};
    kirimPesanEngine(chatId,
      "✅ *Nomor WhatsApp tersimpan!*\n\n" +
      "Selanjutnya, berapakah jumlah RHK kerja yang ingin Anda kelola " +
      "di dalam sistem pelaporan bot premium ini?",
      kbRhk, token);
    return;
  }

  // ── STEP 2b: Skip nomor WA ──────────────────────────────────────
  if (state === "REG_TUNGGU_NO_WA" && text.toLowerCase() === "skip") {
    perbaruiKolomKlien(chatId, "No_WA", "");
    perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_JML_RHK");

    var kbRhkSkip = {"inline_keyboard": [
      [{"text": "1 RHK", "callback_data": "REG_JML_1"},
       {"text": "2 RHK", "callback_data": "REG_JML_2"},
       {"text": "3 RHK", "callback_data": "REG_JML_3"}],
      [{"text": "4 RHK", "callback_data": "REG_JML_4"},
       {"text": "5 RHK", "callback_data": "REG_JML_5"},
       {"text": "6 RHK", "callback_data": "REG_JML_6"}],
      [{"text": "⌨️ Lebih Dari 6 RHK", "callback_data": "REG_JML_MANUAL"}]
    ]};
    kirimPesanEngine(chatId,
      "Baik, dilewati. 😊\n\n" +
      "Berapakah jumlah RHK kerja yang ingin Anda kelola?",
      kbRhkSkip, token);
    return;
  }

  // ── STEP 3: Jumlah RHK manual ───────────────────────────────────
  if (state === "REG_TUNGGU_JML_RHK_MANUAL") {
    var angka = parseInt(text);
    if (isNaN(angka) || angka <= 0) {
      kirimPesanEngine(chatId,
        "⚠️ *Input tidak valid!* Mohon ketikkan angka jumlah RHK Anda:",
        null, token);
      return;
    }
    kunciJumlahRhkDanLanjut(chatId, angka, token);
    return;
  }

  // ── STEP 4: Link Google Drive ────────────────────────────────────
  if (state === "REG_TUNGGU_DRIVE_LINK") {
    var match = /[-\w]{25,}/.exec(text);
    if (!match) {
      kirimPesanEngine(chatId,
        "❌ *Tautan tidak dikenali!* Mohon kirimkan link folder Google Drive Anda yang valid, Pak/Bu:",
        null, token);
      return;
    }

    var extractedDriveId = match[0];

    try {
      var folderTes = DriveApp.getFolderById(extractedDriveId);
      var fileTes   = folderTes.createFile("Koneksi_Sistem_RHK.txt", "Koneksi Berhasil.");
      fileTes.setTrashed(true);

      var linkLengkapDrive = "https://drive.google.com/drive/folders/" + extractedDriveId;
      perbaruiKolomKlien(chatId, "Folder_Root_ID", linkLengkapDrive);
      perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_KONFIRMASI_WORD");

      var teksPeringatan =
        "✅ *KONEKSI GOOGLE DRIVE SUKSES BERHASIL!*\n\n" +
        "📌 *PENTING:* Demi kelancaran otonom bot, mohon jangan pernah mengubah nama " +
        "ataupun menghapus folder induk tersebut di Google Drive Anda ya, Pak/Bu.\n\n" +
        "Langkah Terakhir: Apakah Anda sudah mengirimkan file berkas template " +
        "Microsoft Word (.docx) RHK Anda kepada Admin?";

      var kbKonfirmasi = {"inline_keyboard": [
        [{"text": "Sudah, Siap Lanjut! ✅", "callback_data": "REG_WORD_SUDAH"}],
        [{"text": "Belum / Hubungi Admin 📱", "url": SAAS_CONFIG.ADMIN_WHATSAPP_LINK}]
      ]};
      kirimPesanEngine(chatId, teksPeringatan, kbKonfirmasi, token);

    } catch (error) {
      var teksGagal =
        "❌ *Koneksi Gagal / Akses Ditolak!*\n\n" +
        "Sistem mendeteksi bahwa folder tersebut belum Anda bagikan sebagai *Editor* " +
        "ke alamat email: `" + SAAS_CONFIG.EMAIL_MITRA_EDITOR + "`.\n\n" +
        "Silakan buka Google Drive Anda, ubah pengaturan berbagi folder tersebut menjadi " +
        "*Editor* untuk email di atas, lalu kirimkan kembali link foldernya ke sini ya, Pak/Bu. 🙏";
      kirimPesanEngine(chatId, teksGagal, null, token);
    }
    return;
  }
}

function kunciJumlahRhkDanLanjut(chatId, jumlah, token) {
  perbaruiKolomKlien(chatId, "Catatan_Admin", "Klien mendaftar dengan " + jumlah + " RHK.");
  perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_DRIVE_LINK");
  kirimPesanEngine(chatId, SAAS_CONFIG.TEKS_PRIVASI_DRIVE, null, token);
}

function kirimPesanEngine(chatId, text, kb, token) {
  var payload = {
    "chat_id"                  : chatId,
    "text"                     : text,
    "parse_mode"               : "Markdown",
    "disable_web_page_preview" : true
  };
  if (kb) payload.reply_markup = JSON.stringify(kb);
  UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + token + "/sendMessage",
    {"method": "post", "contentType": "application/json", "payload": JSON.stringify(payload)}
  );
}
