// ====================================================================
// FILE 03: INTERACTIVE ONBOARDING WIZARD (REVISI V3)
// ====================================================================
// Alur pendaftaran:
//   /start → REG_TUNGGU_NAMA → REG_TUNGGU_JML_RHK → REG_TUNGGU_DRIVE_LINK
//   → REG_TUNGGU_KONFIRMASI_WORD → PENDING_RHK (menunggu template .docx)
//   → Admin terima .docx, konfigurasi RHK_Config → Admin aktifkan akun
// ====================================================================

function jalankanWizardPendaftaran(chatId, text, state, token) {

  // ── STEP 1: Nama lengkap ──────────────────────────────────────────
  if (state === "REG_TUNGGU_NAMA") {
    var namaBersih = text.trim();
    perbaruiKolomKlien(chatId, "Nama_Pendaftar", namaBersih);
    perbaruiKolomKlien(chatId, "State_Sesi",     "REG_TUNGGU_JML_RHK");

    var sapaan = getSapaan(namaBersih);
    var kbRhk = {"inline_keyboard": [
      [{"text": "1 RHK", "callback_data": "REG_JML_1"},
       {"text": "2 RHK", "callback_data": "REG_JML_2"},
       {"text": "3 RHK", "callback_data": "REG_JML_3"}],
      [{"text": "4 RHK", "callback_data": "REG_JML_4"},
       {"text": "5 RHK", "callback_data": "REG_JML_5"},
       {"text": "6 RHK", "callback_data": "REG_JML_6"}],
      [{"text": "⌨️ Lebih dari 6 RHK", "callback_data": "REG_JML_MANUAL"}]
    ]};

    kirimPesanEngine(chatId,
      "✨ Selamat datang, *" + namaBersih + "*!\n\n" +
      "Terima kasih telah bergabung di platform *Kinerja RHK*.\n\n" +
      "Untuk memulai konfigurasi, berapa jumlah *RHK kerja* yang ingin " +
      "*" + sapaan + "* kelola di sistem ini?",
      kbRhk, token);
    return;
  }

  // ── STEP 2: Jumlah RHK manual ────────────────────────────────────
  if (state === "REG_TUNGGU_JML_RHK_MANUAL") {
    var angka = parseInt(text);
    if (isNaN(angka) || angka <= 0) {
      kirimPesanEngine(chatId,
        "⚠️ *Input tidak valid.* Mohon ketikkan angka jumlah RHK:", null, token);
      return;
    }
    kunciJumlahRhkDanLanjut(chatId, angka, token);
    return;
  }

  // ── STEP 3: Link Google Drive ────────────────────────────────────
  if (state === "REG_TUNGGU_DRIVE_LINK") {
    var match = /[-\w]{25,}/.exec(text);
    if (!match) {
      kirimPesanEngine(chatId,
        "❌ *Tautan tidak dikenali.*\n\n" +
        "Mohon kirimkan link folder Google Drive yang valid.\n" +
        "_Contoh: https://drive.google.com/drive/folders/xxx_",
        null, token);
      return;
    }

    var driveId = match[0];
    try {
      // Verifikasi akses write ke folder
      var folderTes = DriveApp.getFolderById(driveId);
      var fileTes   = folderTes.createFile("Koneksi_Sistem_RHK.txt", "OK");
      fileTes.setTrashed(true);

      var linkDrive = "https://drive.google.com/drive/folders/" + driveId;
      perbaruiKolomKlien(chatId, "Folder_Root_ID", linkDrive);
      perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_KONFIRMASI_WORD");

      var klien   = cariAtauDaftarKlienSaaS(chatId, "");
      var sapaan  = getSapaan(klien.Nama_Pendaftar);

      var kbKonfirmasi = {"inline_keyboard": [
        [{"text": "✅ Sudah dikirim — Lanjutkan", "callback_data": "REG_WORD_SUDAH"}],
        [tombolHubungiAdminWA()]
      ]};

      kirimPesanEngine(chatId,
        "✅ *Koneksi Google Drive berhasil!*\n\n" +
        "📌 *Penting:* Jangan mengubah nama atau menghapus folder tersebut " +
        "agar sistem dapat bekerja dengan baik.\n\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📄 *Langkah Terakhir — Kirim Template*\n\n" +
        "Sistem Kinerja RHK bekerja berdasarkan *template dokumen Word (.docx)* " +
        "milik *" + sapaan + "*.\n\n" +
        "Silakan kirimkan file *template laporan RHK (.docx)* langsung ke " +
        "chat ini atau ke Admin, agar Admin dapat menyiapkan menu pelaporan khusus " +
        "untuk *" + sapaan + "*.\n\n" +
        "Apakah file template sudah dikirimkan?",
        kbKonfirmasi, token);

    } catch (erive) {
      var klienErr = cariAtauDaftarKlienSaaS(chatId, "");
      kirimPesanEngine(chatId,
        "❌ *Koneksi gagal — Akses ditolak.*\n\n" +
        "Sistem tidak dapat menulis ke folder tersebut. " +
        "Pastikan email `" + SAAS_CONFIG.EMAIL_MITRA_EDITOR + "` " +
        "sudah ditambahkan sebagai *Editor* di pengaturan berbagi folder.\n\n" +
        "Setelah selesai, kirimkan kembali link foldernya ke sini.",
        null, token);
    }
    return;
  }
}

// ── Kunci jumlah RHK lalu minta link Drive ───────────────────────
function kunciJumlahRhkDanLanjut(chatId, jumlah, token) {
  var klien  = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan = getSapaan(klien.Nama_Pendaftar);

  perbaruiKolomKlien(chatId, "Catatan_Admin", "Mendaftar dengan " + jumlah + " RHK.");
  perbaruiKolomKlien(chatId, "State_Sesi",    "REG_TUNGGU_DRIVE_LINK");

  kirimPesanEngine(chatId,
    "📌 *" + jumlah + " RHK* telah dicatat untuk akun *" + sapaan + "*.\n\n" +
    SAAS_CONFIG.TEKS_PRIVASI_DRIVE,
    null, token);
}

// ── Pengirim pesan internal wizard ───────────────────────────────
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
    {"method": "post", "contentType": "application/json",
     "payload": JSON.stringify(payload), "muteHttpExceptions": true}
  );
}
