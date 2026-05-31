// ====================================================================
// FILE 01: PUSAT KONFIGURASI GLOBAL & UTILITAS UTAMA (REVISI V4)
// ====================================================================

const SAAS_CONFIG = {
  ADMIN_TELEGRAM    : "@Septian_DK",
  ADMIN_WHATSAPP_NO : "6285100062524",   // Nomor WA admin tanpa tanda +
  ADMIN_WHATSAPP_LINK: "https://wa.me/6285100062524?text=Halo%20Admin%20Kinerja%20RHK%2C%20saya%20butuh%20bantuan%20terkait%20Sistem%20RHK",
  EMAIL_MITRA_EDITOR: "waliasrama.43@gmail.com",

  // ── ALERT DARURAT KE ADMIN ("Ping" ala BBM) ────────────────────
  // Saat ada klien butuh aksi segera (aktivasi/approve), bot mengirim
  // notifikasi keras & MENGULANGNYA sampai admin menekan "Stop Alarm".
  // Override opsional via sheet Pengaturan: ALERT_ULANG_MAX, ALERT_ULANG_INTERVAL_MENIT
  ALERT_ULANG_MAX           : 5,   // berapa kali diulang bila belum ditangani
  ALERT_ULANG_INTERVAL_MENIT: 2,   // jeda antar pengingat (menit)

  // ID MASTER DRIVE INDUK MILIK ADMIN (Tempat menyimpan template kiriman klien)
  ADMIN_ROOT_FOLDER_ID: "1zisjFNqoSV5RTAp-9ysyHIc7d9eJ2Yfp",
  QRIS_FOLDER_ID      : "1l2pRo9QQKA--44hq8cQ8KNvuNy7FI1hd",
  QRIS_FILE_ID        : "1mTvS-fGL9wpAEl3wlRdSNtvI1XHSzqja",

  // ── QRIS DINAMIS (GENERATIF) ───────────────────────────────────
  // Tempel di sini *payload string* QRIS STATIS milik merchant Anda
  // (teks panjang diawali "00020101..."). Cara mendapatkannya:
  //   1. Scan gambar QRIS statis Anda dengan aplikasi/website QR reader
  //   2. Salin teks hasilnya, tempel di antara tanda kutip di bawah ini
  // Disarankan mengisinya di sel sheet *Pengaturan* (kunci: QRIS_STATIS)
  // agar bisa diubah tanpa menyentuh kode. Nilai sheet akan diprioritaskan.
  // Default di bawah = QRIS merchant "Mitra RHK" (Kab. Pasuruan), CRC terverifikasi.
  QRIS_STATIS_PAYLOAD : "00020101021126570011ID.DANA.WWW011893600915302450525202090245052520303UMI51440014ID.CO.QRIS.WWW0215ID10265204376450303UMI5204737253033605802ID5909Mitra RHK6013Kab. Pasuruan6105671766304F2F4",

  TEKS_PRIVASI_DRIVE:
    "🔒 *JAMINAN PRIVASI & KEAMANAN DATA*\n" +
    "Folder yang dibagikan 100% tetap menjadi hak milik Anda sepenuhnya. " +
    "Sistem hanya menyimpan file PDF hasil laporan di dalam folder tersebut.\n\n" +
    "➖➖➖➖➖➖➖➖➖➖\n\n" +
    "👇 *LANGKAH YANG PERLU DILAKUKAN:* 👇\n\n" +
    "1️⃣ Buat *1 folder baru kosong* di Google Drive Anda.\n" +
    "2️⃣ Ubah pengaturan berbagi menjadi akses *EDITOR* (bukan Pelihat).\n" +
    "3️⃣ Tambahkan email `waliasrama.43@gmail.com` sebagai Editor.\n\n" +
    "🔗 *Setelah selesai, salin dan kirimkan link folder tersebut ke sini.* 😊"
};

// ====================================================================
// UTILITAS: Ambil sapaan profesional berdasarkan nama klien
// Aturan:
//   - Jika nama tersedia → gunakan nama langsung (tanpa Pak/Bu)
//   - Jika nama kosong → gunakan sapaan generik "Anda"
// ====================================================================
function getSapaan(namaKlien) {
  if (!namaKlien || namaKlien.toString().trim() === "") return "Anda";
  // Ambil nama depan saja untuk sapaan yang lebih ringkas
  var namaDepan = namaKlien.toString().trim().split(" ")[0];
  return namaDepan;
}

// ====================================================================
// UTILITAS: Buat inline keyboard tombol WhatsApp yang interaktif
// Tampilan: tombol dengan ikon telepon + teks klik — profesional & bersih
// ====================================================================
function buatTombolWA(labelTeks, pesanWA) {
  var urlWA = "https://wa.me/" + SAAS_CONFIG.ADMIN_WHATSAPP_NO +
              "?text=" + encodeURIComponent(pesanWA);
  return {"text": "📲  " + labelTeks, "url": urlWA};
}

// Tombol WA standar — digunakan di banyak tempat
function tombolHubungiAdminWA() {
  return buatTombolWA(
    "WhatsApp Admin",
    "Halo Admin Kinerja RHK, saya membutuhkan bantuan terkait sistem."
  );
}

// ====================================================================
// SETUP: Buat/inisialisasi semua sheet database
// ====================================================================
function ambilKonfigurasiSaaS() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Pengaturan");
  var data  = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) { config[data[i][0]] = data[i][1]; }
  return config;
}

function setupStrukturDatabaseSaaS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var templateSheets = {
    // ── 3 kunci utama sistem ─────────────────────────────────────
    // BOT_TOKEN     : token bot dari @BotFather
    // ADMIN_CHAT_ID : Chat ID Telegram admin
    // WEBHOOK_URL   : URL Web App GAS (isi setelah deploy)
    "Pengaturan": [
      ["Kunci", "Nilai"],
      ["BOT_TOKEN",    "ISI_BOT_TOKEN_ANDA"],
      ["ADMIN_CHAT_ID","ISI_CHAT_ID_ADMIN"],
      ["WEBHOOK_URL",  "https://script.google.com/macros/s/ISI_DEPLOYMENT_ID/exec"],
      // QRIS_STATIS: tempel payload string QRIS statis merchant (diawali "00020101...").
      // Diisi sekali → sistem otomatis membuat QRIS dinamis bernominal saat klien membayar.
      ["QRIS_STATIS",  "TEMPEL_PAYLOAD_QRIS_STATIS_DISINI"]
    ],

    // ── Client_SaaS: kolom utama klien ───────────────────────────
    // Warning_Sent  : flag warning terkirim (7,3,0,BLOCKED)
    // Reg_Reminder  : tanggal terakhir kirim reminder pendaftaran macet
    "Client_SaaS": [[
      "Chat_ID", "Nama_Pendaftar", "Folder_Root_ID", "Status_Akses",
      "Masa_Aktif", "Limit_Harian", "Total_Laporan", "Catatan_Admin",
      "State_Sesi", "RHK_Terpilih", "Tanggal_Terpilih", "Hari_Terpilih",
      "Current_Placeholder_Index", "Foto_Count", "Warning_Sent", "Reg_Reminder"
    ]],

    "RHK_Config": [[
      "Chat_ID", "RHK_ID", "Label_Menu", "Emoji",
      "Template_ID", "Folder_PDF_ID", "Folder_Foto_ID",
      "Min_Foto", "Max_Foto", "Urutan"
    ]],

    "Kamus_Placeholder": [
      ["Kode_Placeholder", "Pertanyaan_Bot"],
      ["LOKASI",     "Di mana lokasi pelaksanaan kegiatan hari ini? 📍"],
      ["URAIAN",     "Ceritakan uraian singkat mengenai kegiatan tersebut: 📝"],
      ["TUJUAN",     "Apa target utama atau tujuan yang ingin dicapai? 🎯"],
      ["PIHAK",      "Siapa saja pihak atau partisipan yang terlibat? 👥"],
      ["TL",         "Bagaimana rencana Tindak Lanjut ke depan? 🚀"],
      ["KESIMPULAN", "Tuliskan kesimpulan akhir atau ringkasan hasil kegiatan: 📊"]
    ],

    // ── Log_Sistem: catatan event & error ────────────────────────
    "Log_Sistem": [["Timestamp", "Tipe", "Detail"]],

    // ── Transaksi: buku besar pembayaran (audit trail keuangan) ──
    "Transaksi": [[
      "Timestamp", "Chat_ID", "Nama", "Paket_Bulan",
      "Nominal", "Kode_Unik", "Trx_ID", "Status", "Keterangan"
    ]],

    // ── Antrian_Request: queue engine untuk skalabilitas ─────────
    // Kolom:
    //   ID          : ID unik antrian (timestamp + random)
    //   Timestamp   : waktu masuk antrian
    //   Chat_ID     : chat ID pengirim
    //   Tipe_Update : MESSAGE_TEKS | MESSAGE_FOTO | MESSAGE_DOC | CALLBACK
    //   Payload_JSON: isi lengkap update Telegram (JSON string)
    //   Status      : PENDING | PROCESSING | DONE | FAILED
    //   Retry       : jumlah percobaan ulang (max 3)
    //   Error_Log   : pesan error terakhir jika gagal
    "Antrian_Request": [[
      "ID", "Timestamp", "Chat_ID", "Tipe_Update",
      "Payload_JSON", "Status", "Retry", "Error_Log"
    ]],

    // ── Admin_Commands: perintah dinamis tanpa ubah kode ─────────
    "Admin_Commands": [
      ["Perintah", "Tipe", "Parameter", "Isi_Pesan", "Aktif", "Deskripsi"],
      ["/admin info_kontak", "BALAS_TEKS", "",
       "📞 *Kontak Dukungan Platform*\n\n▪️ Telegram: @Septian_DK\n▪️ WhatsApp: wa.me/6285100062524\n▪️ Email: waliasrama.43@gmail.com\n\n_Jam layanan: Senin–Jumat, 08.00–17.00 WIB_",
       "TRUE", "Info kontak dukungan teknis platform"],
      ["/admin umumkan_libur", "BROADCAST", "",
       "📢 *Pemberitahuan Layanan*\n\nLayanan bot Kinerja RHK akan libur sementara pada hari raya nasional. Pelaporan dapat dilanjutkan kembali setelah layanan aktif. Terima kasih atas pengertiannya. 🙏",
       "TRUE", "Broadcast pengumuman libur"],
      ["/admin teguran", "KIRIM_KE_USER", "{chatId}",
       "⚠️ *Pemberitahuan Khusus*\n\nTim Admin mendeteksi adanya hal yang perlu dikonfirmasi terkait akun Anda. Mohon segera hubungi Admin untuk klarifikasi. Terima kasih.",
       "TRUE", "Kirim pesan teguran ke klien (sertakan Chat ID)"],
      ["/admin promo_perpanjang", "BROADCAST", "",
       "🎁 *Penawaran Perpanjangan Spesial!*\n\nDapatkan penawaran menarik untuk perpanjangan paket premium bulan ini. Ketik /bayar untuk melihat pilihan paket. Jangan lewatkan! 🥰",
       "TRUE", "Broadcast promo perpanjangan paket"]
    ]
  };

  for (var sheetName in templateSheets) {
    if (!ss.getSheetByName(sheetName)) {
      var sheet = ss.insertSheet(sheetName);
      var rows  = templateSheets[sheetName];
      sheet.getRange(1, 1, 1, rows[0].length)
           .setValues([rows[0]]).setFontWeight("bold");
      if (rows.length > 1) {
        sheet.getRange(2, 1, rows.length - 1, rows[0].length)
             .setValues(rows.slice(1));
      }
      sheet.autoResizeColumns(1, rows[0].length);
    }
  }

  // Style sheet Admin_Commands
  var acSh = ss.getSheetByName("Admin_Commands");
  if (acSh) {
    acSh.getRange(1, 1, 1, 6)
        .setBackground("#1a73e8").setFontColor("#ffffff").setFontWeight("bold");
    acSh.setFrozenRows(1);
  }

  // Style sheet Antrian_Request
  var aqSh = ss.getSheetByName("Antrian_Request");
  if (aqSh) {
    aqSh.getRange(1, 1, 1, 8)
        .setBackground("#137333").setFontColor("#ffffff").setFontWeight("bold");
    aqSh.setFrozenRows(1);
    // Lebar kolom agar mudah dibaca
    aqSh.setColumnWidth(1, 160);  // ID
    aqSh.setColumnWidth(2, 160);  // Timestamp
    aqSh.setColumnWidth(3, 120);  // Chat_ID
    aqSh.setColumnWidth(4, 130);  // Tipe_Update
    aqSh.setColumnWidth(5, 400);  // Payload_JSON
    aqSh.setColumnWidth(6, 100);  // Status
    aqSh.setColumnWidth(7, 60);   // Retry
    aqSh.setColumnWidth(8, 300);  // Error_Log
  }

  // Style sheet Log_Sistem
  var logSh = ss.getSheetByName("Log_Sistem");
  if (logSh) {
    logSh.getRange(1, 1, 1, 3)
         .setBackground("#b45309").setFontColor("#ffffff").setFontWeight("bold");
    logSh.setFrozenRows(1);
    logSh.setColumnWidth(1, 160);
    logSh.setColumnWidth(2, 140);
    logSh.setColumnWidth(3, 500);
  }
}

// ====================================================================
// UTILITAS PENGIRIMAN PESAN
// ====================================================================
function kirimPesanSaaS(chatId, text, kb, token) {
  var p = {
    "chat_id"                  : chatId,
    "text"                     : text,
    "parse_mode"               : "Markdown",
    "disable_web_page_preview" : true
  };
  if (kb) p.reply_markup = JSON.stringify(kb);
  return UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + token + "/sendMessage",
    {"method": "post", "contentType": "application/json",
     "payload": JSON.stringify(p), "muteHttpExceptions": true}
  );
}

function kirimDokumenSaaS(chatId, blob, caption, token) {
  return UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + token + "/sendDocument",
    {"method": "post", "payload": {
      "chat_id"    : chatId.toString(),
      "document"   : blob,
      "caption"    : caption,
      "parse_mode" : "Markdown"
    }, "muteHttpExceptions": true}
  );
}

function tesBacaTemplate() {
  var id = "192OgBgLeB9uqeA4dBJb0aEohbh822hlhMiVOVdLF7FA";
  try {
    DocumentApp.openById(id);
    Logger.log("✅ SUKSES! Google Doc terbaca.");
  } catch(e) {
    Logger.log("❌ GAGAL: " + e.toString());
  }
}

function OtorisasiGoogleDocs() {
  var tesFile = DocumentApp.create("File_Pancingan_Otorisasi");
  tesFile.setTrashed(true);
  Logger.log("✅ Izin Google Docs berhasil.");
}

// ====================================================================
// CATATAN: Logika QRIS DINAMIS dipindah ke file modul 10_QRIS.js
//   - buatQrisDinamis(payloadStatis, nominal)
//   - ambilPayloadQrisStatis(config)
//   - tesQrisDinamis()
// Field SAAS_CONFIG.QRIS_STATIS_PAYLOAD tetap di file ini (konfigurasi).
// ====================================================================


// ====================================================================
// FILE 02: LAYANAN MANIPULASI & QUERY DATA SPREADSHEET (REVISI V3)
// ====================================================================

function cariAtauDaftarKlienSaaS(chatId, usernameTelegram) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === chatId.toString()) {
      var klien = {};
      for (var j = 0; j < data[0].length; j++) {
        klien[data[0][j]] = data[i][j];
      }
      return klien;
    }
  }

  // Klien baru — daftarkan dengan status BELUM_DAFTAR
  // Kolom: Chat_ID, Nama_Pendaftar, Folder_Root_ID, Status_Akses, Masa_Aktif,
  //        Limit_Harian, Total_Laporan, Catatan_Admin, State_Sesi,
  //        RHK_Terpilih, Tanggal_Terpilih, Hari_Terpilih,
  //        Current_Placeholder_Index, Foto_Count, Warning_Sent, Reg_Reminder
  sheet.appendRow([
    chatId, usernameTelegram, "", "BELUM_DAFTAR", new Date(),
    5, 0, "Pendaftaran Baru", "",
    "", "", "", 0, 0, "", ""
  ]);

  return {
    Chat_ID          : chatId,
    Nama_Pendaftar   : usernameTelegram,
    Status_Akses     : "BELUM_DAFTAR",
    Limit_Harian     : 5,
    Total_Laporan    : 0,
    State_Sesi       : "",
    Warning_Sent     : "",
    Reg_Reminder     : ""
  };
}

function perbaruiKolomKlien(chatId, namaKolom, nilaiBaru) {
  // LockService: cegah race condition antara webhook & worker antrian
  // yang bisa menulis baris klien bersamaan (data saling menimpa).
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (eLock) { /* best-effort bila lock tak didapat */ }
  try {
    var sheet    = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var data     = sheet.getDataRange().getValues();
    var colIndex = data[0].indexOf(namaKolom);
    if (colIndex === -1) return;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === chatId.toString()) {
        sheet.getRange(i + 1, colIndex + 1).setValue(nilaiBaru);
        SpreadsheetApp.flush();
        break;
      }
    }
  } finally {
    try { lock.releaseLock(); } catch (eRel) {}
  }
}

// ── Ambil semua klien berdasarkan status ("*" = semua) ─────────────
function cariSemuaKlienByStatus(statusTarget) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  var data  = sheet.getDataRange().getValues();
  var hasil = [];

  for (var i = 1; i < data.length; i++) {
    var status = data[i][data[0].indexOf("Status_Akses")];
    if (statusTarget === "*" || status === statusTarget) {
      var klien = {};
      for (var j = 0; j < data[0].length; j++) klien[data[0][j]] = data[i][j];
      hasil.push(klien);
    }
  }
  return hasil;
}

// ── Alias ringkas ─────────────────────────────────────────────────
function ambilKlien(chatId) {
  return cariAtauDaftarKlienSaaS(chatId, "");
}

// ── Buat deeplink WhatsApp (normalisasi 08xx → 628xx) ─────────────
function buatLinkWA(noWa, pesan) {
  if (!noWa || noWa.toString().trim() === "") return null;
  var no = noWa.toString().replace(/[^0-9]/g, "");
  if (no.indexOf("0") === 0) no = "62" + no.substring(1);
  return "https://wa.me/" + no + "?text=" + encodeURIComponent(pesan);
}

// ── Reset limit harian — hanya klien AKTIF ────────────────────────
function resetLimitHarianSaaSOtomatis() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  if (!sheet) return;
  var data      = sheet.getDataRange().getValues();
  var colLimit  = data[0].indexOf("Limit_Harian");
  var colStatus = data[0].indexOf("Status_Akses");

  for (var i = 1; i < data.length; i++) {
    if (data[i][colStatus] === "AKTIF") {
      sheet.getRange(i + 1, colLimit + 1).setValue(5);
    }
  }
}


// ====================================================================
// FILE 03: INTERACTIVE ONBOARDING WIZARD (REVISI V3)
// ====================================================================
// Alur pendaftaran (DISEDERHANAKAN — 2 langkah inti):
//   /start → REG_TUNGGU_NAMA → REG_TUNGGU_DRIVE_LINK
//   → REG_TUNGGU_KONFIRMASI_WORD → PENDING_RHK (menunggu template .docx)
//   → Admin terima .docx, konfigurasi RHK_Config → Admin aktifkan akun
//
// Catatan: langkah "pilih jumlah RHK" dihapus dari sisi klien agar lebih
// ringkas. Jumlah RHK ditentukan Admin saat konfigurasi (dari template).
// Handler REG_JML_* lama tetap ada untuk kompatibilitas mundur.
// ====================================================================

function jalankanWizardPendaftaran(chatId, text, state, token) {

  // ── STEP 1: Nama lengkap → langsung minta link Drive ──────────────
  if (state === "REG_TUNGGU_NAMA") {
    var namaBersih = (text || "").trim();
    if (!namaBersih || namaBersih.length < 2) {
      kirimPesanEngine(chatId,
        "⚠️ Mohon ketikkan *Nama Lengkap beserta Gelar* Anda terlebih dahulu. 🙏",
        null, token);
      return;
    }
    perbaruiKolomKlien(chatId, "Nama_Pendaftar", namaBersih);
    perbaruiKolomKlien(chatId, "State_Sesi",     "REG_TUNGGU_DRIVE_LINK");

    var sapaan = getSapaan(namaBersih);
    kirimPesanEngine(chatId,
      "✨ Selamat datang, *" + namaBersih + "*!\n\n" +
      "Pendaftaran ini *singkat* — hanya *2 langkah*:\n" +
      "1️⃣ Hubungkan folder Google Drive (tempat hasil laporan disimpan)\n" +
      "2️⃣ Kirim template laporan RHK (.docx)\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      SAAS_CONFIG.TEKS_PRIVASI_DRIVE,
      null, token);
    return;
  }

  // ── (LEGACY) Jumlah RHK manual — dipertahankan utk kompatibilitas ─
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
      perbaruiKolomKlien(chatId, "State_Sesi", "");

      var klien   = cariAtauDaftarKlienSaaS(chatId, "");
      var sapaan  = getSapaan(klien.Nama_Pendaftar);

      // Langsung tampilkan paket langganan setelah Drive berhasil
      kirimPesanEngine(chatId,
        "✅ *Koneksi Google Drive berhasil!*\n\n" +
        "Halo *" + sapaan + "*, pendaftaran hampir selesai! 🎉\n\n" +
        "📌 *Penting:* Jangan ubah nama atau hapus folder tersebut.\n\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "💎 *LANGKAH TERAKHIR — Pilih Paket Langganan*\n\n" +
        "Pilih paket premium untuk mengaktifkan fitur pelaporan RHK otomatis:",
        {"inline_keyboard": [
          [{"text": "💎 Paket 1 Bulan  — Rp 10.000",  "callback_data": "ORDER_PAKET_1"}],
          [{"text": "💎 Paket 3 Bulan  — Rp 30.000",  "callback_data": "ORDER_PAKET_3"}],
          [{"text": "💎 Paket 6 Bulan  — Rp 50.000",  "callback_data": "ORDER_PAKET_6"}],
          [{"text": "💎 Paket 12 Bulan — Rp 100.000", "callback_data": "ORDER_PAKET_12"}],
          [tombolHubungiAdminWA()]
        ]}, token);

      // Notif ke admin: klien baru berhasil hubungkan Drive
      var configNotif = ambilKonfigurasiSaaS();
      kirimPesanSaaS(configNotif.ADMIN_CHAT_ID,
        "🔔 *Klien Baru — Drive Terhubung*\n\n" +
        "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
        "📂 Drive: " + linkDrive + "\n\n" +
        "_Klien sedang memilih paket langganan._",
        null, configNotif.BOT_TOKEN);

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


// ====================================================================
// FILE 04: ENGINE UTAMA INTERAKSI & ALUR KERJA KLIEN (REVISI V6)
// ====================================================================

function prosesFiturKlienSaaS(update, config, token) {
  var chatId   = (update.message
    ? update.message.chat.id
    : update.callback_query.message.chat.id).toString();

  var klien   = cariAtauDaftarKlienSaaS(
    chatId,
    update.message ? update.message.from.first_name : ""
  );
  var sapaan  = getSapaan(klien.Nama_Pendaftar);

  if (update.message && update.message.text) {
    var text = update.message.text.trim();

    // ── 1. PERINTAH UTAMA ──────────────────────────────────────────
    if (text === "/start" || text === "/lapor") {

      // Belum daftar → mulai wizard
      if (klien.Status_Akses === "BELUM_DAFTAR") {
        perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_NAMA");
        kirimPesanSaaS(chatId,
          "👋 Halo! Selamat datang di *Kinerja RHK* — platform pelaporan " +
          "harian otomatis langsung dari Telegram.\n\n" +
          "Akun Anda belum terdaftar. Mari kita mulai pendaftaran singkat.\n\n" +
          "Silakan ketikkan *Nama Lengkap beserta Gelar* Anda: 👇",
          null, token);
        return;
      }

      // Sedang dalam proses registrasi wizard
      if (klien.Status_Akses === "REG_WIZARD") {
        var kbLanjutReg = {"inline_keyboard": [
          [{"text": "🔄 Lanjutkan Pendaftaran", "callback_data": "REG_LANJUT"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "⏳ *Pendaftaran " + sapaan + " sedang diproses.*\n\n" +
          "Admin sedang memverifikasi berkas dan menyiapkan konfigurasi menu RHK. " +
          "Notifikasi akan dikirimkan begitu sistem siap digunakan.\n\n" +
          "Jika ada pertanyaan, silakan hubungi Admin langsung.",
          kbLanjutReg, token);
        return;
      }

      // Menunggu admin konfigurasi template → arahkan kirim .docx
      if (klien.Status_Akses === "PENDING_RHK") {
        var kbPending = {"inline_keyboard": [
          [{"text": "📄 Kirim File Template .docx", "callback_data": "PENDING_INFO_TEMPLATE"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "⚙️ *Konfigurasi Menu Sedang Disiapkan*\n\n" +
          "Halo *" + sapaan + "*, pembayaran sudah terverifikasi! 🎉\n\n" +
          "Saat ini Admin sedang menyiapkan menu RHK berdasarkan template dokumen " +
          "laporan *" + sapaan + "*.\n\n" +
          "Jika belum mengirimkan file template *(.docx)*, silakan kirimkan sekarang " +
          "langsung ke chat ini — sistem akan meneruskannya ke Admin secara otomatis.",
          kbPending, token);
        return;
      }

      // Akun nonaktif/diblokir
      if (klien.Status_Akses !== "AKTIF") {
        var kbNonaktif = {"inline_keyboard": [
          [{"text": "💎 Perpanjang Langganan", "callback_data": "SHORTCUT_BAYAR"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "🔒 *Akses akun " + sapaan + " saat ini dinonaktifkan.*\n\n" +
          "Silakan hubungi Admin atau lakukan perpanjangan untuk mengaktifkan kembali.",
          kbNonaktif, token);
        return;
      }

      // Masa aktif habis
      if (new Date() > new Date(klien.Masa_Aktif)) {
        var kbExpired = {"inline_keyboard": [
          [{"text": "💎 Perpanjang Sekarang", "callback_data": "SHORTCUT_BAYAR"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "⏰ *Masa aktif akun " + sapaan + " telah berakhir.*\n\n" +
          "Berakhir pada: *" +
          Utilities.formatDate(new Date(klien.Masa_Aktif), "GMT+7", "dd/MM/yyyy") + "*\n\n" +
          "Lakukan perpanjangan untuk melanjutkan pelaporan RHK. " +
          "Semua data & template tetap tersimpan. 💎",
          kbExpired, token);
        return;
      }

      // Limit harian habis
      if (parseInt(klien.Limit_Harian) <= 0) {
        var kbLimit = {"inline_keyboard": [
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "🛑 *Kuota harian " + sapaan + " telah habis.*\n\n" +
          "Sangat produktif hari ini! Kuota cetak akan direset otomatis " +
          "besok pukul 00:01. Silakan kembali melaporkan besok. 🌟",
          kbLimit, token);
        return;
      }

      // ✅ Semua validasi lolos → tampilkan menu RHK
      var props = PropertiesService.getScriptProperties();
      // Bersihkan session properties lama
      var allProps = props.getProperties();
      for (var k in allProps) {
        if (k.indexOf("sess_" + chatId + "_") === 0) props.deleteProperty(k);
      }

      perbaruiKolomKlien(chatId, "State_Sesi", "PILIH_RHK");
      perbaruiKolomKlien(chatId, "Foto_Count", 0);
      tampilkanMenuRHKKlien(chatId, token);
      return;
    }

    if (text === "/langganan" || text === "/bayar") {
      tampilkanMenuPaketKomersial(chatId, token);
      return;
    }

    // ── 2. SESI INPUT TANGGAL MANUAL ──────────────────────────────
    if (klien.State_Sesi === "TUNGGU_TGL_MANUAL") {
      var polaTgl = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (polaTgl.test(text)) {
        var parts = text.split("/");
        var d     = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
        var hIndo = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
        var bIndo = ["Januari","Februari","Maret","April","Mei","Juni",
                     "Juli","Agustus","September","Oktober","November","Desember"];
        var formatIndo = parts[0] + " " + bIndo[parseInt(parts[1]) - 1] + " " + parts[2];

        perbaruiKolomKlien(chatId, "Tanggal_Terpilih", formatIndo);
        perbaruiKolomKlien(chatId, "Hari_Terpilih",    hIndo[d.getDay()]);
        kirimPesanSaaS(chatId, "🗓️ Tanggal dikunci: *" + formatIndo + "*", null, token);
        analisisDanMulaiPertanyaanDoc(chatId, token);
      } else {
        kirimPesanSaaS(chatId,
          "⚠️ *Format tanggal salah.*\n\n" +
          "Gunakan format `DD/MM/YYYY` — contoh: `22/05/2026`\n\n" +
          "Ketik /batal untuk membatalkan.", null, token);
      }
      return;
    }

    // ── 3. SESI KUESIONER PERTANYAAN ──────────────────────────────
    if (klien.State_Sesi.indexOf("TUNGGU_TAG_") === 0) {
      var tagAktif = klien.State_Sesi.replace("TUNGGU_TAG_", "");
      PropertiesService.getScriptProperties()
        .setProperty("sess_" + chatId + "_ans_" + tagAktif, text);
      pindahKePertanyaanBerikutnya(chatId, token);
      return;
    }

    // ── 4. FALLBACK — perintah tidak dikenal ──────────────────────
    if (klien.State_Sesi === "") {
      // Notif senyap ke admin
      var configFb = ambilKonfigurasiSaaS();
      kirimPesanSaaS(configFb.ADMIN_CHAT_ID,
        "🔔 *Perintah Tidak Dikenal*\n\n" +
        "👤 *" + sapaan + "* (`" + chatId + "`)\n" +
        "💬 Teks: `" + text + "`\n" +
        "📌 Status: `" + klien.Status_Akses + "`",
        null, configFb.BOT_TOKEN);

      var kbFallback = {"inline_keyboard": [
        [{"text": "📋 Mulai Laporan RHK",       "callback_data": "SHORTCUT_LAPOR"}],
        [{"text": "💎 Info & Perpanjang Paket",  "callback_data": "SHORTCUT_BAYAR"}],
        [tombolHubungiAdminWA()]
      ]};
      kirimPesanSaaS(chatId,
        "🤔 *Perintah tidak dikenali.*\n\n" +
        "Gunakan menu di bawah atau perintah:\n" +
        "▪️ `/lapor` — Mulai pelaporan RHK\n" +
        "▪️ `/bayar` — Info & perpanjang langganan\n" +
        "▪️ `/batal` — Batalkan proses saat ini",
        kbFallback, token);

    } else {
      // Masih di tengah sesi
      var kbSesi = {"inline_keyboard": [
        [{"text": "🔄 Batalkan & Mulai Ulang", "callback_data": "SHORTCUT_BATAL"}],
        [tombolHubungiAdminWA()]
      ]};
      kirimPesanSaaS(chatId,
        "⚠️ *Masih dalam sesi pengisian data.*\n\n" +
        "Ikuti instruksi terakhir bot, atau tekan *Batalkan* untuk mengulang dari awal.",
        kbSesi, token);
    }
    return;
  }
}

// ====================================================================
// MENU & ALUR KERJA
// ====================================================================

function tampilkanMenuRHKKlien(chatId, token) {
  var sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
  var data    = sheet.getDataRange().getValues();
  var klien   = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan  = getSapaan(klien.Nama_Pendaftar);
  var buttons = [];

  var userRhk = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === chatId.toString()) {
      userRhk.push({id: data[i][1], label: data[i][2], emoji: data[i][3], urut: data[i][9]});
    }
  }
  userRhk.sort(function(a, b) { return a.urut - b.urut; });
  userRhk.forEach(function(item) {
    buttons.push([{"text": item.emoji + "  " + item.label, "callback_data": "RUN_RHK_" + item.id}]);
  });

  if (buttons.length === 0) {
    var kbBelumSiap = {"inline_keyboard": [
      [tombolHubungiAdminWA()]
    ]};
    kirimPesanSaaS(chatId,
      "⚙️ *Menu RHK " + sapaan + " sedang disiapkan.*\n\n" +
      "Admin sedang mengonfigurasi template dokumen. " +
      "Notifikasi akan dikirimkan begitu menu siap digunakan. 🙏",
      kbBelumSiap, token);
  } else {
    kirimPesanSaaS(chatId,
      "📋 *Pilih RHK yang ingin dilaporkan hari ini, " + sapaan + ":*",
      {"inline_keyboard": buttons}, token);
  }
}

function tampilkanMenuTanggalSaaS(chatId, token) {
  var rows  = [];
  var hIndo = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  var bIndo = ["Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];

  for (var i = 0; i < 6; i++) {
    var d    = new Date(); d.setDate(d.getDate() - i);
    var tglF = d.getDate() + " " + bIndo[d.getMonth()] + " " + d.getFullYear();
    var lbl  = i === 0 ? "📅 Hari Ini (" + hIndo[d.getDay()] + ")"
             : i === 1 ? "🗓️ Kemarin (" + hIndo[d.getDay()] + ")"
             : "📆 " + hIndo[d.getDay()] + ", " + tglF;
    rows.push([{"text": lbl, "callback_data": "SET_TGL_" + tglF + "_" + hIndo[d.getDay()]}]);
  }
  rows.push([{"text": "⌨️ Input Tanggal Manual", "callback_data": "SET_TGL_MANUAL"}]);

  kirimPesanSaaS(chatId,
    "🕒 *Pilih tanggal pelaksanaan kegiatan:*",
    {"inline_keyboard": rows}, token);
}

function analisisDanMulaiPertanyaanDoc(chatId, token) {
  try {
    var klien      = cariAtauDaftarKlienSaaS(chatId, "");
    var sheet      = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
    var data       = sheet.getDataRange().getValues();
    var templateId = "";

    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === chatId.toString() && data[i][1] === klien.RHK_Terpilih) {
        templateId = data[i][4]; break;
      }
    }

    var docText  = DocumentApp.openById(templateId).getBody().getText();
    var regex    = /\{\{([A-Za-z0-9_]+)\}\}/g;
    var daftarTag = [];
    var match;
    var SKIP_TAGS = ["HARI","TANGGAL","FOTO1","FOTO2","FOTO3","FOTO4"];

    while ((match = regex.exec(docText)) !== null) {
      var tag = match[1];
      if (SKIP_TAGS.indexOf(tag) === -1 && daftarTag.indexOf(tag) === -1) {
        daftarTag.push(tag);
      }
    }

    var props = PropertiesService.getScriptProperties();
    props.setProperty("sess_" + chatId + "_list_tags",        daftarTag.join(","));
    props.setProperty("sess_" + chatId + "_current_tag_idx",  "0");

    pindahKePertanyaanBerikutnya(chatId, token);
  } catch(e) {
    var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
    if (logSheet) logSheet.appendRow([new Date(), "ERROR_BACA_DOC",
      "ChatID: " + chatId + " | " + e.toString()]);

    var kbErrTemplate = {"inline_keyboard": [
      [tombolHubungiAdminWA()]
    ]};
    kirimPesanSaaS(chatId,
      "⚠️ *Gagal membaca template RHK.*\n\n" +
      "Kemungkinan file template masih berformat `.docx` atau ID template tidak valid. " +
      "Admin telah menerima notifikasi error ini.",
      kbErrTemplate, token);
  }
}

// ====================================================================
// BANTUAN PLACEHOLDER OTOMATIS (memudahkan admin)
// ====================================================================
// Ubah "NAMA_KEGIATAN" → "Nama Kegiatan"
function _tagKeLabel(tag) {
  return tag.toLowerCase().replace(/_/g, " ")
            .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

// Pindai semua placeholder {{TAG}} pada sebuah Google Doc template
// (mengabaikan tag sistem HARI/TANGGAL/FOTO1..4). Return: array nama tag.
function pindaiTagTemplate(templateId) {
  var SKIP = ["HARI", "TANGGAL", "FOTO1", "FOTO2", "FOTO3", "FOTO4"];
  var hasil = [];
  try {
    var teks = DocumentApp.openById(templateId).getBody().getText();
    var re = /\{\{([A-Za-z0-9_]+)\}\}/g, m;
    while ((m = re.exec(teks)) !== null) {
      var t = m[1];
      if (SKIP.indexOf(t) === -1 && hasil.indexOf(t) === -1) hasil.push(t);
    }
  } catch (e) { /* templateId tak valid / masih .docx */ }
  return hasil;
}

// Tambahkan tag yang BELUM ada ke Kamus_Placeholder dengan pertanyaan default.
// Idempotent + LockService. Return: array tag yang baru ditambahkan.
function sinkronkanKamusDariTag(tags) {
  var baru = [];
  if (!tags || !tags.length) return baru;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kamus_Placeholder");
  if (!sh) return baru;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (eL) {}
  try {
    var data = sh.getDataRange().getValues();
    var ada  = {};
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) ada[data[i][0].toString().toUpperCase()] = true;
    }
    for (var k = 0; k < tags.length; k++) {
      var tag = tags[k];
      if (ada[tag.toUpperCase()]) continue;
      sh.appendRow([tag, "Silakan isi " + _tagKeLabel(tag) + " untuk laporan ini:"]);
      ada[tag.toUpperCase()] = true;
      baru.push(tag);
    }
  } finally {
    try { lock.releaseLock(); } catch (eR) {}
  }
  return baru;
}

function pindahKePertanyaanBerikutnya(chatId, token) {
  var props       = PropertiesService.getScriptProperties();
  var listTagsStr = props.getProperty("sess_" + chatId + "_list_tags") || "";
  var idx         = parseInt(props.getProperty("sess_" + chatId + "_current_tag_idx") || "0");

  if (listTagsStr === "") { lompatKeFaseFoto(chatId, token); return; }

  var tags = listTagsStr.split(",");
  if (idx < tags.length) {
    var tagSekarang = tags[idx];
    perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_TAG_" + tagSekarang);
    props.setProperty("sess_" + chatId + "_current_tag_idx", (idx + 1).toString());

    // ── Cari pertanyaan di Kamus_Placeholder ────────────────────────
    // Jika tag TIDAK ADA di kamus → bot tetap tanya dengan format
    // otomatis yang rapi berdasarkan nama tag itu sendiri.
    // Admin tidak perlu mendaftarkan semua tag terlebih dahulu.
    var kamusSheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kamus_Placeholder");
    var kData        = kamusSheet.getDataRange().getValues();
    var kalimatTanya = null;   // null = belum ditemukan di kamus

    for (var i = 1; i < kData.length; i++) {
      if (kData[i][0].toString().toUpperCase() === tagSekarang.toUpperCase()) {
        kalimatTanya = kData[i][1];
        break;
      }
    }

    // Fallback otomatis jika tag tidak ada di kamus:
    // Bot TETAP bertanya (pakai kalimat otomatis dari nama tag), DAN
    // tag langsung ditambahkan ke Kamus_Placeholder (swa-pulih) sehingga
    // admin tak perlu khawatir lupa mendaftarkannya. Admin diberi tahu
    // SEKALI saat tag benar-benar baru.
    if (kalimatTanya === null) {
      kalimatTanya = "Silakan isi *" + _tagKeLabel(tagSekarang) + "* untuk laporan ini:";
      try {
        var ditambah = sinkronkanKamusDariTag([tagSekarang]);
        if (ditambah.length) {
          var cfgNotif = ambilKonfigurasiSaaS();
          kirimPesanSaaS(cfgNotif.ADMIN_CHAT_ID,
            "🧩 *Placeholder Baru Terdeteksi*\n\n" +
            "Tag `{{" + tagSekarang + "}}` belum ada di Kamus_Placeholder — " +
            "sudah *ditambahkan otomatis* dengan pertanyaan default.\n" +
            "Perbaiki kalimatnya di sheet *Kamus_Placeholder* bila perlu.",
            null, cfgNotif.BOT_TOKEN);
        }
      } catch (eSync) { /* abaikan; kuesioner tetap lanjut */ }
    }

    var kbOpsi = {"inline_keyboard": [
      [{"text": "⚠️ Laporkan Kesalahan Template", "callback_data": "KOMPLAIN_TAG_" + tagSekarang}],
      [tombolHubungiAdminWA()]
    ]};

    kirimPesanSaaS(chatId,
      "✏️ *Pertanyaan " + (idx + 1) + "/" + tags.length + ":*\n\n" + kalimatTanya,
      kbOpsi, token);

  } else {
    lompatKeFaseFoto(chatId, token);
  }
}

function lompatKeFaseFoto(chatId, token) {
  perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_FOTO");
  kirimPesanSaaS(chatId,
    "✅ *Semua data teks berhasil disimpan!*\n\n" +
    "Sekarang kirimkan *Foto Bukti Kegiatan ke-1* " +
    "(minimal 2 foto, maksimal 4 foto):",
    null, token);
}

function tampilkanMenuPaketKomersial(chatId, token) {
  var kb = {"inline_keyboard": [
    [{"text": "💎 Paket 1 Bulan  — Rp 10.000",  "callback_data": "ORDER_PAKET_1"}],
    [{"text": "💎 Paket 3 Bulan  — Rp 30.000",  "callback_data": "ORDER_PAKET_3"}],
    [{"text": "💎 Paket 6 Bulan  — Rp 50.000",  "callback_data": "ORDER_PAKET_6"}],
    [{"text": "💎 Paket 12 Bulan — Rp 100.000", "callback_data": "ORDER_PAKET_12"}]
  ]};
  kirimPesanSaaS(chatId,
    "🛍️ *PILIHAN PAKET PREMIUM KINERJA RHK*\n\n" +
    "Pilih durasi langganan yang sesuai kebutuhan:",
    kb, token);
}

// ====================================================================
// HUBUNGI ADMIN — tampilkan kontak + notif ke admin
// ====================================================================
function tampilkanKontakAdmin(chatId, token) {
  var config  = ambilKonfigurasiSaaS();
  var klien   = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan  = getSapaan(klien.Nama_Pendaftar);

  // Dua tombol WA dengan konteks berbeda
  var urlWAUmum = "https://wa.me/" + SAAS_CONFIG.ADMIN_WHATSAPP_NO +
    "?text=" + encodeURIComponent(
      "Halo Admin Kinerja RHK, saya " + (klien.Nama_Pendaftar || "pengguna baru") +
      " membutuhkan bantuan terkait sistem RHK.");
  var urlWATelegram = "https://t.me/" + SAAS_CONFIG.ADMIN_TELEGRAM.replace("@", "");

  var kbKontak = {"inline_keyboard": [
    [{"text": "📲  Chat via WhatsApp",  "url": urlWAUmum}],
    [{"text": "✈️  Chat via Telegram",  "url": urlWATelegram}]
  ]};

  kirimPesanSaaS(chatId,
    "📞 *Hubungi Admin Kinerja RHK*\n\n" +
    "Halo *" + sapaan + "*! Tim Admin siap membantu.\n\n" +
    "Pilih saluran komunikasi yang paling nyaman:\n\n" +
    "🕐 _Jam layanan: Senin–Jumat, 08.00–17.00 WIB_",
    kbKontak, token);

  // Notif ke admin
  kirimPesanSaaS(config.ADMIN_CHAT_ID,
    "🔔 *Klien Meminta Bantuan*\n\n" +
    "👤 *" + (klien.Nama_Pendaftar || "—") + "* (`" + chatId + "`)\n" +
    "📌 Status: `" + klien.Status_Akses + "`\n" +
    "🕐 " + Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm") + " WIB\n\n" +
    "_Klien menekan tombol Hubungi Admin dan sedang menunggu respons._",
    null, token);
}


// ====================================================================
// FILE 05: COMMAND CENTER ADMIN SAAS (REVISI V5)
// ====================================================================

function prosesFiturAdminSaaS(update, config) {
  var chatId = update.message.chat.id.toString();
  var text   = update.message.text ? update.message.text.trim() : "";

  // ── /admin broadcast [pesan] ──────────────────────────────────────
  if (text.indexOf("/admin broadcast ") === 0) {
    var isiPesan = text.replace("/admin broadcast ", "");
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var data  = sheet.getDataRange().getValues();
    var sukses = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] === "AKTIF") {
        kirimPesanSaaS(data[i][0].toString(),
          "📢 *PENGUMUMAN PLATFORM KINERJA RHK*\n\n" + isiPesan, null, config.BOT_TOKEN);
        sukses++;
        Utilities.sleep(100);
      }
    }
    kirimPesanSaaS(chatId,
      "✅ Broadcast terkirim ke *" + sukses + "* klien aktif.", null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin blokir [ID] [alasan] ───────────────────────────────────
  if (text.indexOf("/admin blokir ") === 0) {
    var params = text.split(" ");
    if (params.length >= 3) {
      var targetId = params[2];
      var alasan   = params.slice(3).join(" ") || "Tidak ada alasan tercatat.";
      perbaruiKolomKlien(targetId, "Status_Akses",  "NONAKTIF");
      perbaruiKolomKlien(targetId, "Catatan_Admin", "Blokir: " + alasan);
      kirimPesanSaaS(chatId,
        "🔒 Akun `" + targetId + "` dinonaktifkan.\n📝 Alasan: _" + alasan + "_",
        null, config.BOT_TOKEN);
      var kbBlokir = {"inline_keyboard": [
        [{"text": "💎 Perpanjang Langganan", "callback_data": "SHORTCUT_BAYAR"}],
        [tombolHubungiAdminWA()]
      ]};
      kirimPesanSaaS(targetId,
        "🔔 *Akses akun Anda telah ditangguhkan.*\n\nAlasan: *" + alasan + "*\n\n" +
        "Hubungi Admin untuk informasi lebih lanjut.",
        kbBlokir, config.BOT_TOKEN);
    } else {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin blokir [Chat_ID] [Alasan]`", null, config.BOT_TOKEN);
    }
    return true;
  }


  // ── /admin aktifkan [ID] [bulan] ──────────────────────────────────
  if (text.indexOf("/admin aktifkan ") === 0) {
    var parts         = text.split(" ");
    var targetAktifId = parts[2] ? parts[2].trim() : "";
    var jmlBulan      = parts[3] ? parseInt(parts[3]) : 1;
    if (!targetAktifId) {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin aktifkan [Chat_ID] [durasi_bulan]`\n" +
        "Contoh: `/admin aktifkan 927597163 3`", null, config.BOT_TOKEN);
      return true;
    }
    var klienAktif = cariAtauDaftarKlienSaaS(targetAktifId, "");
    var tglExp = new Date();
    if (klienAktif.Status_Akses === "AKTIF" && new Date(klienAktif.Masa_Aktif) > new Date()) {
      tglExp = new Date(klienAktif.Masa_Aktif);
    }
    tglExp.setMonth(tglExp.getMonth() + jmlBulan);
    perbaruiKolomKlien(targetAktifId, "Status_Akses",  "AKTIF");
    perbaruiKolomKlien(targetAktifId, "Masa_Aktif",    tglExp);
    perbaruiKolomKlien(targetAktifId, "Warning_Sent",  "");
    var sapAktif = getSapaan(klienAktif.Nama_Pendaftar);
    kirimPesanSaaS(chatId,
      "✅ Akun *" + (klienAktif.Nama_Pendaftar || targetAktifId) + "* aktif *" +
      jmlBulan + " bulan* hingga *" +
      Utilities.formatDate(tglExp, "GMT+7", "dd/MM/yyyy") + "*.",
      null, config.BOT_TOKEN);
    kirimPesanSaaS(targetAktifId,
      "🎉 *Akun berhasil diaktifkan!*\n\n" +
      "Halo *" + sapAktif + "*, akun premium aktif hingga *" +
      Utilities.formatDate(tglExp, "GMT+7", "dd/MM/yyyy") + "*.\n\n" +
      "Ketik /lapor untuk mulai membuat laporan RHK. 🚀",
      null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin kirim_template [ID] ────────────────────────────────────
  if (text.indexOf("/admin kirim_template ") === 0) {
    var tgtId = text.replace("/admin kirim_template ", "").trim();
    if (!tgtId) {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin kirim_template [Chat_ID]`", null, config.BOT_TOKEN);
      return true;
    }
    kirimTemplateKeKlien(tgtId, chatId, config);
    return true;
  }

  // ── /admin follow_up [ID] ─────────────────────────────────────────
  if (text.indexOf("/admin follow_up ") === 0) {
    tampilkanInfoFollowUp(text.replace("/admin follow_up ", "").trim(), chatId, config);
    return true;
  }

  // ── /admin follow_up_semua ────────────────────────────────────────
  if (text === "/admin follow_up_semua") {
    tampilkanDaftarFollowUpSemua(chatId, config);
    return true;
  }

  // ── /admin daftar_chatid ──────────────────────────────────────────
  if (text === "/admin daftar_chatid") {
    var dSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var dData  = dSheet.getDataRange().getValues();
    if (dData.length <= 1) {
      kirimPesanSaaS(chatId, "📭 Belum ada klien terdaftar.", null, config.BOT_TOKEN);
      return true;
    }
    var emojiSt = {
      "AKTIF":"🟢","NONAKTIF":"🔴","BELUM_DAFTAR":"⚪",
      "REG_WIZARD":"🟡","PENDING_RHK":"🟠"
    };
    var BATCH = 25;
    var baris = "📋 *DAFTAR KLIEN* _(Total: " + (dData.length-1) + ")_\n\n";
    var batch = [];
    for (var d = 1; d < dData.length; d++) {
      var stD   = dData[d][3] || "BELUM_DAFTAR";
      var expD  = dData[d][4]
        ? Utilities.formatDate(new Date(dData[d][4]), "GMT+7", "dd/MM/yy") : "—";
      baris += d + ". " + (emojiSt[stD]||"⚫") + " *" + (dData[d][1]||"—") + "*\n" +
               "   🆔 `" + dData[d][0] + "` | `" + stD + "`" +
               (stD==="AKTIF" ? " | exp `"+expD+"`" : "") + "\n\n";
      if (d % BATCH === 0 || d === dData.length-1) {
        batch.push(baris);
        baris = "📋 _(Lanjutan " + (batch.length+1) + ")_\n\n";
      }
    }
    for (var b = 0; b < batch.length; b++) {
      kirimPesanSaaS(chatId, batch[b], null, config.BOT_TOKEN);
    }
    var kbCepat = {"inline_keyboard": [
      [{"text":"📊 Cek Sistem","callback_data":"ADM_CEK_SISTEM"},
       {"text":"📋 Cek Pendaftaran Macet","callback_data":"ADM_CEK_DAFTAR"}]
    ]};
    kirimPesanSaaS(chatId, "⚡ *Aksi cepat:*", kbCepat, config.BOT_TOKEN);
    return true;
  }


  // ── /admin cek_antrian ────────────────────────────────────────────
  if (text === "/admin cek_antrian") {
    tampilkanStatusAntrianKeAdmin(chatId, config.BOT_TOKEN);
    return true;
  }

  // ── /admin bersihkan_antrian ──────────────────────────────────────
  if (text === "/admin bersihkan_antrian") {
    bersihkanAntrianFailed(chatId, config.BOT_TOKEN);
    return true;
  }

  // ── /admin reset_antrian ──────────────────────────────────────────
  // Gunakan jika ada item stuck di PROCESSING > 5 menit
  if (text === "/admin reset_antrian") {
    var nReset = resetStuckProcessing();
    kirimPesanSaaS(chatId,
      "🔄 Reset selesai. *" + nReset + "* item stuck dikembalikan ke PENDING.",
      null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin cek_pendaftaran ────────────────────────────────────────
  if (text === "/admin cek_pendaftaran") {
    var shC  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var cD   = shC.getDataRange().getValues();
    var lap  = "📋 *KLIEN PENDAFTARAN BELUM SELESAI*\n\n";
    var ada  = false; var no = 1;
    for (var j = 1; j < cD.length; j++) {
      var st = cD[j][3];
      if (st !== "AKTIF" && st !== "NONAKTIF") {
        var sesiMacet = cD[j][8] || "BELUM MULAI";
        var linkDrive = cD[j][2]
          ? "[Buka Drive](" + cD[j][2] + ")" : "`Belum dikirim`";
        lap += no++ + ". *" + (cD[j][1]||"—") + "* (`" + cD[j][0] + "`)\n" +
               "   📍 Tahap: `" + sesiMacet + "`\n" +
               "   📁 Drive: " + linkDrive + "\n\n";
        ada = true;
      }
    }
    if (!ada) lap += "🎉 Semua pendaftar sudah menyelesaikan administrasi!";
    var kbMacet = {"inline_keyboard": [
      [{"text":"📣 Kirim Reminder ke Semua Macet","callback_data":"ADM_REMINDER_MACET"}]
    ]};
    kirimPesanSaaS(chatId, lap, ada ? kbMacet : null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin cek_template [ID] ──────────────────────────────────────
  // Pindai semua template RHK milik klien, deteksi placeholder, dan
  // otomatis tambahkan yang belum ada ke Kamus_Placeholder.
  if (text.indexOf("/admin cek_template ") === 0) {
    var idCek = text.replace("/admin cek_template ", "").trim();
    if (!idCek) {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin cek_template [Chat_ID]`", null, config.BOT_TOKEN);
      return true;
    }
    var rcSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
    var rcD  = rcSh.getDataRange().getValues();
    var semuaTag = [], jmlTpl = 0, tplKosong = 0;
    for (var r = 1; r < rcD.length; r++) {
      if (rcD[r][0].toString() !== idCek) continue;
      var tplId = (rcD[r][4] || "").toString().trim();
      if (!tplId) { tplKosong++; continue; }
      jmlTpl++;
      pindaiTagTemplate(tplId).forEach(function(t) {
        if (semuaTag.indexOf(t) === -1) semuaTag.push(t);
      });
    }
    if (jmlTpl === 0) {
      kirimPesanSaaS(chatId,
        "⚠️ Tidak ada `Template_ID` terisi untuk `" + idCek + "` di sheet RHK_Config" +
        (tplKosong ? " (" + tplKosong + " baris Template_ID kosong)" : "") + ".",
        null, config.BOT_TOKEN);
      return true;
    }
    var tagBaruCek = sinkronkanKamusDariTag(semuaTag);
    kirimPesanSaaS(chatId,
      "🧩 *CEK TEMPLATE — `" + idCek + "`*\n\n" +
      "📄 Template terbaca : *" + jmlTpl + "*\n" +
      "🏷️ Total placeholder: *" + semuaTag.length + "*\n" +
      (semuaTag.length ? "`" + semuaTag.join("`, `") + "`\n\n" : "\n") +
      (tagBaruCek.length
        ? "✅ *" + tagBaruCek.length + "* tag baru ditambahkan ke Kamus_Placeholder:\n`" +
          tagBaruCek.join("`, `") + "`\n\n_Perbaiki kalimat pertanyaannya di sheet bila perlu._"
        : "✅ Semua placeholder sudah ada di Kamus_Placeholder."),
      null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin ringkasan ──────────────────────────────────────────────
  // Dashboard operasional cepat: perlu approve, aktif, akan expired, antrian.
  if (text === "/admin ringkasan") {
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var cShR   = ss.getSheetByName("Client_SaaS");
    var vR     = cShR.getDataRange().getValues();
    var aktif = 0, pending = 0, tungguBukti = 0, akanExp = 0;
    var now    = new Date();
    for (var k = 1; k < vR.length; k++) {
      var st   = vR[k][3];
      var sesi = (vR[k][8] || "").toString();
      if (st === "AKTIF") {
        aktif++;
        if (vR[k][4]) {
          var sisaH = Math.ceil((new Date(vR[k][4]) - now) / 86400000);
          if (sisaH >= 0 && sisaH <= 7) akanExp++;
        }
      } else if (st !== "NONAKTIF") {
        pending++;
      }
      if (sesi === "TUNGGU_BUKTI_BAYAR") tungguBukti++;
    }
    // Hitung transaksi hari ini (LUNAS) + omzet
    var trxSh = ss.getSheetByName("Transaksi");
    var lunasHariIni = 0, omzetHariIni = 0;
    if (trxSh) {
      var tD = trxSh.getDataRange().getValues();
      var hariIni = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
      for (var t = 1; t < tD.length; t++) {
        if ((tD[t][7] || "").toString().toUpperCase() !== "LUNAS") continue;
        if (Utilities.formatDate(new Date(tD[t][0]), "GMT+7", "yyyy-MM-dd") !== hariIni) continue;
        lunasHariIni++;
        omzetHariIni += parseInt(tD[t][4] || 0) || 0;
      }
    }
    // Antrian pending
    var aqSh = ss.getSheetByName("Antrian_Request");
    var qPending = 0, qFailed = 0;
    if (aqSh) {
      var qD = aqSh.getDataRange().getValues();
      for (var q = 1; q < qD.length; q++) {
        if (qD[q][5] === "PENDING")     qPending++;
        else if (qD[q][5] === "FAILED") qFailed++;
      }
    }
    kirimPesanSaaS(chatId,
      "📊 *RINGKASAN OPERASIONAL*\n" +
      "_" + Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm") + " WIB_\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "⏳ *PERLU TINDAKAN:*\n" +
      "   🧾 Tunggu bukti bayar : *" + tungguBukti + "*\n" +
      "   🟠 Pendaftaran proses : *" + pending + "*\n\n" +
      "👥 *KLIEN:*\n" +
      "   🟢 Aktif      : *" + aktif + "*\n" +
      "   ⏰ Akan expired (≤7 hari): *" + akanExp + "*\n\n" +
      "💰 *HARI INI:*\n" +
      "   ✅ Lunas : *" + lunasHariIni + "* transaksi\n" +
      "   💵 Omzet : *Rp " + omzetHariIni.toLocaleString("id-ID") + "*\n\n" +
      "⚙️ *ANTRIAN:* PENDING *" + qPending + "* | FAILED *" + qFailed + "*",
      {"inline_keyboard": [
        [{"text":"📋 Pendaftaran Macet","callback_data":"ADM_CEK_DAFTAR"},
         {"text":"🔄 Cek Antrian","callback_data":"ADM_CEK_ANTRIAN"}]
      ]}, config.BOT_TOKEN);
    return true;
  }

  // ── /admin cek_sistem | /admin ────────────────────────────────────
  if (text === "/admin cek_sistem" || text === "/admin") {
    var cSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var tot = cSh.getLastRow() - 1;
    var vD  = cSh.getDataRange().getValues();
    var aktC = 0, pendC = 0, nonC = 0;
    for (var k = 1; k < vD.length; k++) {
      var s = vD[k][3];
      if (s==="AKTIF") aktC++;
      else if (s==="NONAKTIF") nonC++;
      else pendC++;
    }
    var acSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
    var jCmd = 0;
    if (acSh) {
      var acD = acSh.getDataRange().getValues();
      for (var ac = 1; ac < acD.length; ac++) {
        if ((acD[ac][4]||"").toString().toUpperCase() === "TRUE") jCmd++;
      }
    }
    var dashboard =
      "📊 *DASHBOARD KINERJA RHK*\n\n" +
      "👥 *Klien:*\n" +
      "   🟢 Aktif: *" + aktC + "*\n" +
      "   🟡 Pending/Proses: *" + pendC + "*\n" +
      "   🔴 Nonaktif: *" + nonC + "*\n" +
      "   📦 Total: *" + tot + "*\n\n" +
      "⚙️ *Sistem:*\n" +
      "   ▪️ Perintah Sheet Aktif: *" + jCmd + "*\n" +
      "   ▪️ Status Server: *ONLINE* ✅\n\n" +
      "📌 *Pintasan:*\n" +
      "   `/admin bantuan` — Daftar semua perintah\n" +
      "   `/admin daftar_chatid` — Semua Chat ID\n" +
      "   `/admin follow_up_semua` — Klien perlu follow-up\n" +
      "   `/admin cek_antrian` — Status antrian queue";
    var kbDashboard = {"inline_keyboard": [
      [{"text":"🔄 Cek Antrian Queue", "callback_data":"ADM_CEK_ANTRIAN"},
       {"text":"📋 Cek Pendaftaran",   "callback_data":"ADM_CEK_DAFTAR"}]
    ]};
    kirimPesanSaaS(chatId, dashboard, kbDashboard, config.BOT_TOKEN);
    return true;
  }

  // ── /admin bantuan ────────────────────────────────────────────────
  if (text === "/admin bantuan") {
    var bTeks =
      "📖 *PANDUAN PERINTAH ADMIN*\n\n" +
      "━━━ *PERINTAH INTI* ━━━\n" +
      "▪️ `/admin` — Dashboard statistik\n" +
      "▪️ `/admin bantuan` — Panduan ini\n" +
      "▪️ `/admin daftar_chatid` — Semua Chat ID klien\n" +
      "▪️ `/admin cek_pendaftaran` — Pendaftaran macet\n" +
      "▪️ `/admin broadcast [pesan]` — Kirim ke semua aktif\n" +
      "▪️ `/admin blokir [ID] [alasan]` — Blokir akun\n" +
      "▪️ `/admin aktifkan [ID] [bulan]` — Aktifkan akun\n" +
      "▪️ `/admin kirim_template [ID]` — Kirim template ke klien\n" +
      "▪️ `/admin follow_up [ID]` — Info detail + aksi klien\n" +
      "▪️ `/admin follow_up_semua` — Daftar klien expired/hampir\n" +
      "▪️ `/admin ringkasan` — Ringkasan operasional harian\n" +
      "▪️ `/admin cek_template [ID]` — Pindai placeholder template klien\n\n" +
      "━━━ *PERINTAH ANTRIAN (QUEUE)* ━━━\n" +
      "▪️ `/admin cek_antrian` — Status antrian saat ini\n" +
      "▪️ `/admin bersihkan_antrian` — Hapus item FAILED\n" +
      "▪️ `/admin reset_antrian` — Reset item stuck PROCESSING\n\n" +
      "━━━ *PERINTAH DARI SHEET* ━━━\n";
    var acSh2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
    if (acSh2) {
      var acD2 = acSh2.getDataRange().getValues();
      var adaPC = false;
      for (var ac2 = 1; ac2 < acD2.length; ac2++) {
        var fl = (acD2[ac2][4]||"").toString().toUpperCase() === "TRUE" ? "✅" : "❌";
        bTeks += fl + " `" + acD2[ac2][0] + "` — _" + (acD2[ac2][5]||"—") + "_\n";
        adaPC = true;
      }
      if (!adaPC) bTeks += "_Belum ada perintah di sheet Admin_Commands._\n";
    }
    bTeks += "\n💡 Tambah perintah baru di sheet *Admin_Commands* tanpa ubah kode!";
    kirimPesanSaaS(chatId, bTeks, null, config.BOT_TOKEN);
    return true;
  }

  // ── Engine perintah dinamis dari sheet ────────────────────────────
  var hasilSheet = eksekusiPerintahDariSheet(chatId, text, config);
  if (hasilSheet) return true;

  kirimPesanSaaS(chatId,
    "❓ Perintah tidak dikenali.\n\nKetik `/admin bantuan` untuk panduan lengkap.",
    null, config.BOT_TOKEN);
  return true;
}


// ====================================================================
// ENGINE PERINTAH DINAMIS DARI SHEET Admin_Commands
// Tipe: BALAS_TEKS | BROADCAST | KIRIM_KE_USER
// ====================================================================
function eksekusiPerintahDariSheet(chatId, text, config) {
  var acSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
  if (!acSheet) return false;
  var acData = acSheet.getDataRange().getValues();

  for (var i = 1; i < acData.length; i++) {
    var pSheet = acData[i][0] ? acData[i][0].toString().trim() : "";
    if (!pSheet) continue;
    var cocok = (text === pSheet) || (text.indexOf(pSheet + " ") === 0);
    if (!cocok) continue;

    var tipe      = (acData[i][1]||"").toString().trim().toUpperCase();
    var isiPesan  = (acData[i][3]||"").toString();
    var aktifFlag = (acData[i][4]||"").toString().toUpperCase();

    if (aktifFlag !== "TRUE") {
      kirimPesanSaaS(chatId,
        "⚠️ Perintah `" + pSheet + "` sedang *dinonaktifkan*.", null, config.BOT_TOKEN);
      return true;
    }

    if (tipe === "BALAS_TEKS") {
      kirimPesanSaaS(chatId, isiPesan, null, config.BOT_TOKEN);
      return true;
    }
    if (tipe === "BROADCAST") {
      var cSht = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
      var cDat = cSht.getDataRange().getValues();
      var hit  = 0;
      for (var bc = 1; bc < cDat.length; bc++) {
        if (cDat[bc][3] === "AKTIF") {
          kirimPesanSaaS(cDat[bc][0].toString(),
            "📢 *PENGUMUMAN PLATFORM KINERJA RHK*\n\n" + isiPesan, null, config.BOT_TOKEN);
          hit++; Utilities.sleep(100);
        }
      }
      kirimPesanSaaS(chatId,
        "🚀 Broadcast `" + pSheet + "` terkirim ke *" + hit + "* klien aktif.",
        null, config.BOT_TOKEN);
      return true;
    }
    if (tipe === "KIRIM_KE_USER") {
      var bagian    = text.replace(pSheet, "").trim();
      var targetUID = bagian !== "" ? bagian.split(" ")[0] : "";
      if (!targetUID) {
        kirimPesanSaaS(chatId,
          "💡 Sertakan Chat ID setelah perintah.\nContoh: `" + pSheet + " 927597163`",
          null, config.BOT_TOKEN);
        return true;
      }
      var pFinal = isiPesan.replace(/\{chatId\}/g, targetUID);
      kirimPesanSaaS(targetUID, pFinal, null, config.BOT_TOKEN);
      kirimPesanSaaS(chatId,
        "✅ Pesan `" + pSheet + "` terkirim ke `" + targetUID + "`.",
        null, config.BOT_TOKEN);
      return true;
    }
    kirimPesanSaaS(chatId,
      "⚠️ Tipe `" + tipe + "` tidak dikenal. Gunakan: BALAS_TEKS | BROADCAST | KIRIM_KE_USER",
      null, config.BOT_TOKEN);
    return true;
  }

  return false; // Tidak ada perintah yang cocok di sheet
}



// ====================================================================
// TERIMA TEMPLATE .docx DARI KLIEN
// ====================================================================
// Alur kerja yang benar:
//   1. Klien kirim file .docx setelah akun AKTIF atau saat PENDING_RHK
//   2. Sistem simpan ke Drive Admin (sub-folder nama klien)
//   3. Konversi otomatis ke Google Docs
//   4. Notif admin: nama klien, ID template, tombol aksi langsung
//   5. Admin tambahkan placeholder {{TAG}} di Google Doc
//   6. Admin isi RHK_Config dengan Template_ID
//   7. Admin jalankan /admin aktifkan atau ubah status ke AKTIF
// ====================================================================
function prosesUnduhTemplateWordKlien(chatId, documentObj, config) {
  var klien    = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan   = getSapaan(klien.Nama_Pendaftar);
  var namaFile = documentObj.file_name || "template.docx";

  // ── Validasi format ──────────────────────────────────────────────
  if (namaFile.toLowerCase().indexOf(".docx") === -1) {
    kirimPesanSaaS(chatId,
      "❌ *Format file salah.*\n\n" +
      "Sistem hanya menerima file *Microsoft Word (.docx)*.\n\n" +
      "Pastikan template laporan RHK berformat .docx (bukan .doc/.pdf).",
      {"inline_keyboard": [[tombolHubungiAdminWA()]]}, config.BOT_TOKEN);
    return;
  }

  // ── Best-effort: arsip .docx ke Drive + konversi ke Google Doc ────
  // Tidak menggagalkan alur — file tetap diteruskan ke admin walau ini gagal.
  var templateId = null, linkFolder = null, linkDocx = null;
  try {
    var filePath = JSON.parse(UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getFile?file_id=" + documentObj.file_id,
      {"muteHttpExceptions": true}).getContentText()).result.file_path;
    var blobWord = UrlFetchApp.fetch(
      "https://api.telegram.org/file/bot" + config.BOT_TOKEN + "/" + filePath,
      {"muteHttpExceptions": true}).getBlob().setName(namaFile);

    var adminRoot   = DriveApp.getFolderById(SAAS_CONFIG.ADMIN_ROOT_FOLDER_ID);
    var folderNama  = klien.Nama_Pendaftar || ("Klien_" + chatId);
    var iterFolder  = adminRoot.getFoldersByName(folderNama);
    var folderKlien = iterFolder.hasNext() ? iterFolder.next() : adminRoot.createFolder(folderNama);
    linkFolder      = folderKlien.getUrl();
    linkDocx        = folderKlien.createFile(blobWord).getUrl();   // arsip .docx asli (DriveApp)

    // Konversi ke Google Doc lewat Drive REST API (independen advanced service)
    try {
      templateId = _konversiDocxKeGdoc(blobWord, namaFile.replace(/\.docx$/i, ""), folderKlien.getId());
    } catch (eConv) {
      _logSistem("WARN_KONVERSI_DOCX", "ChatID: " + chatId + " | " + eConv.toString());
    }
  } catch (eArsip) {
    _logSistem("WARN_ARSIP_DOCX", "ChatID: " + chatId + " | " + eArsip.toString());
  }

  // ── Update status klien ──────────────────────────────────────────
  if (klien.Status_Akses === "REG_WIZARD" || klien.Status_Akses === "BELUM_DAFTAR") {
    perbaruiKolomKlien(chatId, "Status_Akses", "PENDING_RHK");
  }
  perbaruiKolomKlien(chatId, "State_Sesi", "");

  // ── Teruskan file .docx LANGSUNG ke admin + caption + tombol aksi ─
  var baris = [];
  if (templateId) baris.push([{"text":"📝  Buka & Edit Google Doc",
                               "url":"https://docs.google.com/document/d/" + templateId + "/edit"}]);
  if (linkFolder) baris.push([{"text":"📂  Buka Folder Drive Klien", "url": linkFolder}]);
  baris.push([{"text":"✅  Aktifkan Akun Klien", "callback_data":"ADM_AKTIFKAN_" + chatId}]);

  var caption =
    "📄 *TEMPLATE BARU MASUK*\n\n" +
    "👤 Klien : *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
    "📁 File  : `" + namaFile + "`\n" +
    (templateId
      ? "🆔 Doc ID: `" + templateId + "`\n"
      : "⚠️ Konversi Google Doc gagal — gunakan file .docx terlampir di atas.\n") +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "📌 *Langkah Admin:*\n" +
    (templateId
      ? "1. Buka Google Doc, tambahkan placeholder `{{TAG}}`\n"
      : "1. Buka file .docx, jadikan Google Doc, tambahkan placeholder `{{TAG}}`\n") +
    "2. Salin *Doc ID* ke kolom `Template_ID` di sheet *RHK_Config*\n" +
    "3. Tekan *Aktifkan Akun* setelah konfigurasi selesai";

  var adminOK = _kirimDokumenKeAdmin(documentObj.file_id, caption,
                                     {"inline_keyboard": baris}, config);
  if (!adminOK) {
    // Fallback: bila forward file gagal, kirim teks + link arsip
    kirimPesanSaaS(config.ADMIN_CHAT_ID,
      caption + (linkDocx ? "\n\n📎 File arsip: " + linkDocx : ""),
      {"inline_keyboard": baris}, config.BOT_TOKEN);
  }

  // ── Bantu admin: pindai placeholder template & sinkronkan Kamus ──
  if (templateId) {
    try {
      var tagTpl  = pindaiTagTemplate(templateId);
      var tagBaru = sinkronkanKamusDariTag(tagTpl);
      kirimPesanSaaS(config.ADMIN_CHAT_ID,
        "🧩 *Placeholder Terdeteksi di Template*\n\n" +
        "👤 " + (klien.Nama_Pendaftar||"—") + " (`" + chatId + "`)\n" +
        "🏷️ " + (tagTpl.length ? "`" + tagTpl.join("`, `") + "`"
                               : "_Tidak ada placeholder kustom (selain HARI/TANGGAL/FOTO)._") + "\n\n" +
        (tagBaru.length
          ? "✅ *" + tagBaru.length + "* tag baru otomatis ditambahkan ke *Kamus_Placeholder*.\n" +
            "Periksa & perbaiki kalimat pertanyaannya di sheet bila perlu."
          : "✅ Semua placeholder sudah ada di Kamus_Placeholder."),
        null, config.BOT_TOKEN);
    } catch (eScanU) {
      _logSistem("WARN_SCAN_TPL", chatId + " | " + eScanU.toString());
    }
  }

  // ── Alert DARURAT: klien baru butuh aktivasi segera ──────────────
  kirimAlertDarurat(config,
    "KLIEN BARU BUTUH AKTIVASI",
    "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
    "📁 Template `" + namaFile + "` sudah masuk.\n" +
    "Mohon konfigurasi menu RHK lalu *aktifkan akun*.",
    { tombolAksi: [{"text":"✅ Aktifkan Akun Klien", "callback_data":"ADM_AKTIFKAN_" + chatId}] });

  // ── Konfirmasi positif ke klien (file sudah pasti diterima admin) ─
  kirimPesanSaaS(chatId,
    "✅ *File template berhasil diterima!*\n\n" +
    "Terima kasih, *" + sapaan + "*. File *" + namaFile + "* sudah diteruskan ke Admin " +
    "untuk dikonfigurasi.\n\n" +
    "Admin akan menyiapkan menu pelaporan RHK khusus untuk *" + sapaan + "*. " +
    "Notifikasi dikirim begitu menu siap digunakan. 🙏",
    null, config.BOT_TOKEN);
}

// ── Helper: teruskan dokumen (by file_id) ke admin via Telegram ─────
function _kirimDokumenKeAdmin(fileId, caption, kb, config) {
  try {
    var res = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendDocument",
      {"method":"post","payload":{
        "chat_id"      : config.ADMIN_CHAT_ID.toString(),
        "document"     : fileId,
        "caption"      : caption,
        "parse_mode"   : "Markdown",
        "reply_markup" : JSON.stringify(kb)
      }, "muteHttpExceptions": true});
    return res.getResponseCode() === 200;
  } catch (e) { return false; }
}

// ── Helper: konversi .docx → Google Doc lewat Drive REST API v3 ─────
// Tidak butuh Advanced Drive Service. Memakai OAuth token bawaan script
// (scope drive sudah aktif karena project memakai DriveApp).
function _konversiDocxKeGdoc(blobDocx, judul, folderId) {
  var metadata = { name: judul, mimeType: "application/vnd.google-apps.document" };
  if (folderId) metadata.parents = [folderId];

  var boundary = "----kinerjaRHK" + Date.now();
  var nl = "\r\n";
  var head = "--" + boundary + nl +
    "Content-Type: application/json; charset=UTF-8" + nl + nl +
    JSON.stringify(metadata) + nl +
    "--" + boundary + nl +
    "Content-Type: " +
      (blobDocx.getContentType() ||
       "application/vnd.openxmlformats-officedocument.wordprocessingml.document") + nl + nl;
  var tail = nl + "--" + boundary + "--";

  var payloadBytes = Utilities.newBlob(head).getBytes()
    .concat(blobDocx.getBytes())
    .concat(Utilities.newBlob(tail).getBytes());

  var res = UrlFetchApp.fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      "method"      : "post",
      "contentType" : "multipart/related; boundary=" + boundary,
      "payload"     : payloadBytes,
      "headers"     : { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      "muteHttpExceptions": true
    });
  var code = res.getResponseCode();
  var obj  = JSON.parse(res.getContentText());
  if (code >= 200 && code < 300 && obj.id) return obj.id;
  throw new Error("Drive REST convert HTTP " + code + ": " + res.getContentText());
}


// ====================================================================
// INVOICE + QR DINAMIS + OCR AUTO-APPROVE
// ====================================================================
function buatInvoiceOtonomSaaS(chatId, durasiBulan, config) {
  var hargaAwal    = {"1":10000,"3":30000,"6":50000,"12":100000}[durasiBulan];
  var kodeUnik     = Math.floor(Math.random() * 900) + 100;
  var nominalTotal = hargaAwal + kodeUnik;
  var trxId        = "TRX" + new Date().getTime();
  var klien        = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan       = getSapaan(klien.Nama_Pendaftar);

  var props = PropertiesService.getScriptProperties();
  props.setProperty("pending_trx_"   + chatId, trxId);
  props.setProperty("pending_total_" + chatId, nominalTotal.toString());
  props.setProperty("pending_bulan_" + chatId, durasiBulan);
  perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_BUKTI_BAYAR");

  // Catat ke buku besar Transaksi (status awal: DITAGIHKAN)
  _catatTransaksi(chatId, klien.Nama_Pendaftar, durasiBulan, nominalTotal,
                  kodeUnik, trxId, "DITAGIHKAN", "Invoice dibuat");

  // ── Ambil payload QRIS statis (sheet diprioritaskan, lihat 10_QRIS.js) ──
  var qrisStatis = ambilPayloadQrisStatis(config);

  // ── Coba bangun QRIS DINAMIS (nominal otomatis terisi) ───────────
  var qrisDinamis = null;
  try {
    if (qrisStatis) qrisDinamis = buatQrisDinamis(qrisStatis, nominalTotal);
  } catch (eGen) {
    qrisDinamis = null;
    _logSistem("ERR_QRIS_DINAMIS", "ChatID: " + chatId + " | " + eGen.toString());
  }

  if (qrisDinamis) {
    // ===== MODE DINAMIS: klien scan → nominal langsung terisi =====
    var panduanDinamis =
      "🧾 *INVOICE LISENSI PREMIUM*\n\n" +
      "▪️ Nama       : *" + (klien.Nama_Pendaftar||"—") + "*\n" +
      "▪️ Kode Order : `" + trxId + "`\n" +
      "▪️ Paket      : *" + durasiBulan + " Bulan*\n" +
      "▪️ Harga Dasar: `Rp " + hargaAwal.toLocaleString("id-ID") + "`\n" +
      "▪️ Kode Unik  : `+" + kodeUnik + "`\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "💰 *TOTAL TAGIHAN:*\n" +
      "   `Rp " + nominalTotal.toLocaleString("id-ID") + "`\n" +
      "━━━━━━━━━━━━━━━━━━━━\n\n" +
      "✨ *QRIS sudah berisi nominal otomatis!*\n\n" +
      "1️⃣ Scan QRIS di bawah ini dengan aplikasi bank / e-wallet\n" +
      "2️⃣ Pastikan nominal tampil *Rp " + nominalTotal.toLocaleString("id-ID") + "* lalu bayar\n" +
      "3️⃣ Kirim *screenshot bukti pembayaran* ke chat ini\n\n" +
      "_Nominal sudah terkunci pada QR — tidak perlu ketik manual._";

    var terkirim = false;
    try {
      var urlQRD = "https://api.qrserver.com/v1/create-qr-code/" +
        "?size=512x512&margin=16&ecc=M&data=" + encodeURIComponent(qrisDinamis);
      var blobQRD = UrlFetchApp.fetch(urlQRD, {"muteHttpExceptions":true}).getBlob()
                      .setName("QRIS_" + trxId + ".png");
      var resQRD = UrlFetchApp.fetch(
        "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
        {"method":"post","payload":{
          "chat_id":chatId.toString(), "photo":blobQRD,
          "caption":panduanDinamis, "parse_mode":"Markdown"
        }, "muteHttpExceptions":true});
      terkirim = (resQRD.getResponseCode() === 200);
    } catch (eKirim) {
      terkirim = false;
      _logSistem("ERR_KIRIM_QRIS_DINAMIS", "ChatID: " + chatId + " | " + eKirim.toString());
    }

    if (!terkirim) {
      // Fallback: kirim payload sebagai teks agar tetap bisa dibayar
      kirimPesanSaaS(chatId,
        panduanDinamis + "\n\n⚠️ Gambar QR gagal dimuat. Salin kode QRIS berikut:\n`" +
        qrisDinamis + "`", null, config.BOT_TOKEN);
    }

  } else {
    // ===== MODE FALLBACK: QRIS statis lama (input nominal manual) =====
    var panduanStatis =
      "🧾 *INVOICE LISENSI PREMIUM*\n\n" +
      "▪️ Nama       : *" + (klien.Nama_Pendaftar||"—") + "*\n" +
      "▪️ Kode Order : `" + trxId + "`\n" +
      "▪️ Paket      : *" + durasiBulan + " Bulan*\n" +
      "▪️ Harga Dasar: `Rp " + hargaAwal.toLocaleString("id-ID") + "`\n" +
      "▪️ Kode Unik  : `+" + kodeUnik + "`\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "💰 *TOTAL TRANSFER:*\n" +
      "   `Rp " + nominalTotal.toLocaleString("id-ID") + "`\n" +
      "━━━━━━━━━━━━━━━━━━━━\n\n" +
      "📌 Transfer nominal *persis* termasuk 3 digit kode unik.\n" +
      "Sistem akan memverifikasi otomatis.\n\n" +
      "1️⃣ Scan QRIS di bawah ini\n" +
      "2️⃣ Masukkan nominal *Rp " + nominalTotal.toLocaleString("id-ID") + "* secara manual\n" +
      "3️⃣ Kirim *screenshot bukti pembayaran* ke chat ini";

    var blobQris = DriveApp.getFileById(SAAS_CONFIG.QRIS_FILE_ID).getBlob();
    UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
      {"method":"post","payload":{"chat_id":chatId,"photo":blobQris,
       "caption":panduanStatis,"parse_mode":"Markdown"}});

    // Beritahu admin agar mengisi QRIS_STATIS untuk mengaktifkan mode dinamis
    _logSistem("QRIS_FALLBACK_STATIS",
      "ChatID: " + chatId + " | QRIS_STATIS belum dikonfigurasi → pakai QR statis manual.");
  }

  // ── Notifikasi ke admin: ada tagihan baru menunggu (approve manual) ──
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(),
    "🧾 *Invoice Baru Dibuat*\n\n" +
    "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
    "▪️ Paket  : *" + durasiBulan + " Bulan*\n" +
    "▪️ Nominal: *Rp " + nominalTotal.toLocaleString("id-ID") + "*\n" +
    "▪️ Kode   : `" + trxId + "` (unik `+" + kodeUnik + "`)\n" +
    "▪️ Mode QR: " + (qrisDinamis ? "Dinamis ✅" : "Statis (manual) ⚠️") + "\n\n" +
    "_Menunggu klien mengirim bukti bayar. Cocokkan nominal unik di mutasi lalu Setujui/Tolak._",
    null, config.BOT_TOKEN);
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
  var props       = PropertiesService.getScriptProperties();
  var trxId       = props.getProperty("pending_trx_"   + chatId) || "TRX_UNKNOWN";
  var totalSistem = parseInt(props.getProperty("pending_total_" + chatId) || "0");
  var bulan       = props.getProperty("pending_bulan_" + chatId) || "1";
  var fileIdFoto  = photoArray[photoArray.length - 1].file_id;
  var klien       = cariAtauDaftarKlienSaaS(chatId, "");
  perbaruiKolomKlien(chatId, "State_Sesi", "");

  kirimPesanSaaS(chatId,
    "⏳ *Bukti pembayaran diterima!*\n" +
    "Sistem sedang memverifikasi nominal secara otomatis...",
    null, config.BOT_TOKEN);

  // OCR via Drive
  var hasilOCR = ""; var driveFileId = null;
  try {
    var getFileRes = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getFile?file_id=" + fileIdFoto,
      {"muteHttpExceptions":true});
    var filePath   = JSON.parse(getFileRes.getContentText()).result.file_path;
    var fotoBlob   = UrlFetchApp.fetch(
      "https://api.telegram.org/file/bot" + config.BOT_TOKEN + "/" + filePath,
      {"muteHttpExceptions":true}).getBlob()
      .setName("bukti.jpg").setContentType("image/jpeg");
    var ocrFile    = Drive.Files.insert(
      {title:"ocr_"+chatId, mimeType:MimeType.GOOGLE_DOCS}, fotoBlob);
    driveFileId    = ocrFile.id;
    hasilOCR       = DocumentApp.openById(driveFileId).getBody().getText();
    DriveApp.getFileById(driveFileId).setTrashed(true);
  } catch(eOCR) {
    if (driveFileId) { try { DriveApp.getFileById(driveFileId).setTrashed(true); } catch(e2){} }
  }

  var nominalOCR = _ekstrakNominalDariTeks(hasilOCR);
  if (nominalOCR !== null && Math.abs(nominalOCR - totalSistem) <= 5) {
    _logSistem("AUTO_APPROVE", chatId + " | OCR: " + nominalOCR + " | Sistem: " + totalSistem);
    eksekusiApprovePembayaranKlien(chatId + "_" + bulan, config);
    kirimPesanSaaS(config.ADMIN_CHAT_ID,
      "🤖 *Auto-Approve Berhasil* ✅\n\n" +
      "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
      "▪️ OCR: `Rp " + nominalOCR.toLocaleString("id-ID") + "`\n" +
      "▪️ Sistem: `Rp " + totalSistem.toLocaleString("id-ID") + "`\n" +
      "▪️ Paket: *" + bulan + " Bulan*",
      null, config.BOT_TOKEN);
  } else {
    var label = nominalOCR !== null
      ? "RAGU (OCR: Rp " + nominalOCR.toLocaleString("id-ID") +
        ", Sistem: Rp " + totalSistem.toLocaleString("id-ID") + ")"
      : (hasilOCR ? "OCR_NO_NOMINAL" : "OCR_GAGAL");
    _forwardBuktiBayarKeAdmin(chatId, fileIdFoto, klien, bulan, totalSistem, label, config);
  }
}

function _ekstrakNominalDariTeks(teks) {
  if (!teks || !teks.trim()) return null;
  var bersih    = teks.replace(/\./g,"").replace(/,/g,"");
  var matches   = bersih.match(/\b\d{4,9}\b/g);
  if (!matches)  return null;
  var kandidat  = matches.map(function(m){return parseInt(m);})
                         .filter(function(n){return n>=10000 && n<=999999;});
  return kandidat.length ? Math.max.apply(null, kandidat) : null;
}

function _forwardBuktiBayarKeAdmin(chatId, fileIdFoto, klien, bulan, totalSistem, label, config) {
  var kbAdmin = {"inline_keyboard": [
    [{"text":"✅ Setujui & Aktifkan","callback_data":"ADM_APP_" + chatId + "_" + bulan}],
    [{"text":"❌ Tolak Transfer",    "callback_data":"ADM_REJ_" + chatId}]
  ]};
  UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
    {"method":"post","payload":{
      "chat_id"      : config.ADMIN_CHAT_ID.toString(),
      "photo"        : fileIdFoto,
      "caption"      :
        "🔔 *BUKTI BAYAR — PERLU REVIEW*\n\n" +
        "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
        "▪️ Paket  : *" + bulan + " Bulan*\n" +
        "▪️ Nominal: *Rp " + totalSistem.toLocaleString("id-ID") + "*\n" +
        "▪️ Kode   : `+" + (totalSistem % 1000) + "`\n" +
        "▪️ Status OCR: `" + label + "`\n\n" +
        "Cek mutasi DANA Bisnis, lalu pilih aksi:",
      "parse_mode"   : "Markdown",
      "reply_markup" : JSON.stringify(kbAdmin)
    }});
  // ── Alert DARURAT: bukti bayar butuh approve manual ──────────────
  kirimAlertDarurat(config,
    "BUKTI BAYAR BUTUH APPROVE",
    "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
    "💰 Nominal sistem: *Rp " + totalSistem.toLocaleString("id-ID") + "*\n" +
    "🔎 Status OCR: `" + label + "`\n" +
    "Cek mutasi lalu *Setujui/Tolak*.",
    { tombolAksi: [{"text":"✅ Setujui & Aktifkan", "callback_data":"ADM_APP_" + chatId + "_" + bulan}] });

  kirimPesanSaaS(chatId,
    "✅ *Bukti pembayaran diterima!*\n\n" +
    "Admin sedang memverifikasi pembayaran. " +
    "Akun akan aktif otomatis setelah konfirmasi. 🙏",
    null, config.BOT_TOKEN);
}

function _logSistem(tipe, detail) {
  var ls = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
  if (ls) ls.appendRow([new Date(), tipe, detail]);
}

// ── Catat transaksi ke buku besar (sheet Transaksi) ──────────────
// status: DITAGIHKAN | LUNAS | DITOLAK
function _catatTransaksi(chatId, nama, paketBulan, nominal, kodeUnik, trxId, status, keterangan) {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transaksi");
    if (!sh) return;
    sh.appendRow([
      new Date(), chatId.toString(), nama || "", paketBulan || "",
      nominal || "", kodeUnik || "", trxId || "", status || "", keterangan || ""
    ]);
  } catch (e) {
    _logSistem("ERR_CATAT_TRX", chatId + " | " + e.toString());
  }
}


// ====================================================================
// APPROVE / REJECT PEMBAYARAN
// ====================================================================
function eksekusiApprovePembayaranKlien(callbackDataStr, config) {
  var last    = callbackDataStr.lastIndexOf("_");
  var targetId = callbackDataStr.substring(0, last);
  var jmlBulan = parseInt(callbackDataStr.substring(last + 1));

  var targetKlien = cariAtauDaftarKlienSaaS(targetId, "");
  var sapaan      = getSapaan(targetKlien.Nama_Pendaftar);
  var expBaru     = new Date();
  if (targetKlien.Status_Akses === "AKTIF" && new Date(targetKlien.Masa_Aktif) > new Date()) {
    expBaru = new Date(targetKlien.Masa_Aktif);
  }
  expBaru.setMonth(expBaru.getMonth() + jmlBulan);

  perbaruiKolomKlien(targetId, "Status_Akses",  "AKTIF");
  perbaruiKolomKlien(targetId, "Masa_Aktif",    expBaru);
  perbaruiKolomKlien(targetId, "Warning_Sent",  "");

  var props = PropertiesService.getScriptProperties();
  // Baca nilai pending SEBELUM dihapus → untuk pencatatan transaksi LUNAS
  var trxLunas = props.getProperty("pending_trx_"   + targetId) || "";
  var totLunas = props.getProperty("pending_total_" + targetId) || "";
  _catatTransaksi(targetId, targetKlien.Nama_Pendaftar, jmlBulan, totLunas,
                  (totLunas ? (parseInt(totLunas) % 1000) : ""), trxLunas,
                  "LUNAS", "Pembayaran disetujui (" + jmlBulan + " bln)");
  props.deleteProperty("pending_trx_"   + targetId);
  props.deleteProperty("pending_total_" + targetId);
  props.deleteProperty("pending_bulan_" + targetId);

  if (config && config.BOT_TOKEN) {
    var expStr = Utilities.formatDate(expBaru, "GMT+7", "dd/MM/yyyy");
    kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(),
      "✅ Akun `" + targetId + "` aktif *" + jmlBulan + " bulan* hingga *" + expStr + "*.",
      null, config.BOT_TOKEN);
    // Cek apakah klien sudah punya konfigurasi RHK
    var _rhkSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
    var _rhkDt = _rhkSh ? _rhkSh.getDataRange().getValues() : [];
    var _adaRhk = false;
    for (var _ri = 1; _ri < _rhkDt.length; _ri++) {
      if (_rhkDt[_ri][0].toString() === targetId.toString() && _rhkDt[_ri][4]) {
        _adaRhk = true; break;
      }
    }

    if (_adaRhk) {
      // Klien perpanjang (sudah punya RHK) → langsung bisa lapor
      kirimPesanSaaS(targetId,
        "🎉 *Pembayaran Disetujui — Akun Diperpanjang!*\n\n" +
        "Halo *" + sapaan + "*, akun premium aktif hingga *" + expStr + "*.\n\n" +
        "Menu pelaporan RHK sudah siap. Ketik /lapor untuk mulai. 🚀",
        {"inline_keyboard": [[{"text":"📋 Mulai Laporan RHK", "callback_data":"SHORTCUT_LAPOR"}]]},
        config.BOT_TOKEN);
    } else {
      // Klien baru → info pembayaran diterima + panduan template + cara kerja
      perbaruiKolomKlien(targetId, "Status_Akses", "PENDING_RHK");
      kirimPesanSaaS(targetId,
        "🎉 *Pembayaran Diterima & Disetujui!*\n\n" +
        "Halo *" + sapaan + "*, terima kasih! Akun premium aktif hingga *" + expStr + "*.\n\n" +
        "⏳ *Status:* Dalam proses pemeriksaan Admin.\n\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📄 *PANDUAN UPLOAD TEMPLATE*\n\n" +
        "Agar menu pelaporan RHK bisa disiapkan, kirimkan *file template " +
        "laporan RHK (.docx)* langsung ke chat bot ini.\n\n" +
        "📌 *Yang perlu dikirim:*\n" +
        "File Word (.docx) laporan harian yang biasa Anda gunakan.\n\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "🤖 *CARA KERJA BOT KINERJA RHK*\n\n" +
        "Setelah Admin menyiapkan menu, Anda tinggal:\n" +
        "1️⃣ Ketik /lapor → pilih jenis RHK\n" +
        "2️⃣ Pilih tanggal pelaksanaan\n" +
        "3️⃣ Jawab beberapa pertanyaan singkat\n" +
        "4️⃣ Kirim 2-4 foto bukti kegiatan\n" +
        "5️⃣ Tekan *Cetak PDF* → laporan langsung jadi!\n\n" +
        "📁 Hasil PDF otomatis tersimpan di Google Drive Anda.\n" +
        "⏱️ Proses cetak hanya *30 detik* per laporan!\n\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "⏳ Admin akan konfigurasi dalam *1x24 jam*. " +
        "Notifikasi otomatis dikirim begitu menu siap. 🙏",
        {"inline_keyboard": [
          [{"text":"📄 Cara Kirim File Template", "callback_data":"PENDING_INFO_TEMPLATE"}],
          [tombolHubungiAdminWA()]
        ]}, config.BOT_TOKEN);
    }
  }
  _logSistem("APPROVE", targetId + " | " + jmlBulan + " bln");
}

function eksekusiRejectPembayaranKlien(targetId, config) {
  var kbRej = {"inline_keyboard": [
    [{"text":"🔄 Coba Bayar Ulang", "callback_data":"SHORTCUT_BAYAR"}],
    [tombolHubungiAdminWA()]
  ]};
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(),
    "❌ Pembayaran ID `" + targetId + "` ditolak.", null, config.BOT_TOKEN);
  kirimPesanSaaS(targetId,
    "🛑 *Pembayaran Tidak Valid*\n\n" +
    "Bukti transfer yang dikirimkan tidak dapat diverifikasi. " +
    "Silakan ulangi pembayaran dengan nominal yang tepat.",
    kbRej, config.BOT_TOKEN);
  _logSistem("REJECT", targetId);
}

// ====================================================================
// FOTO LAPORAN KEGIATAN
// ====================================================================
function terimaFotoLaporanKegiatanKlien(chatId, photoArray, config) {
  var klien = cariAtauDaftarKlienSaaS(chatId, "");
  var count = parseInt(klien.Foto_Count || "0") + 1;

  if (count > 4) {
    kirimPesanSaaS(chatId,
      "🛑 Maksimal *4 foto* per laporan. Silakan ketuk tombol cetak PDF.",
      null, config.BOT_TOKEN);
    return;
  }

  perbaruiKolomKlien(chatId, "Foto_Count", count);
  PropertiesService.getScriptProperties()
    .setProperty("sess_" + chatId + "_foto_" + count, photoArray[photoArray.length-1].file_id);

  if (count < 2) {
    kirimPesanSaaS(chatId,
      "📸 Foto ke-1 tersimpan! Kirimkan *foto ke-2* untuk memenuhi syarat minimal:",
      null, config.BOT_TOKEN);
  } else {
    var kbCetak = {"inline_keyboard": [
      [{"text":"📷 Tambah Foto (" + count + "/4)", "callback_data":"SaaS_PROSES_FOTO_LAGI"}],
      [{"text":"🚀 Rakit Jadi PDF Sekarang!",       "callback_data":"SaaS_PROSES_NOW"}]
    ]};
    kirimPesanSaaS(chatId,
      "✅ *" + count + " foto* tersimpan. Lanjut tambah foto atau cetak PDF?",
      kbCetak, config.BOT_TOKEN);
  }
}

// ====================================================================
// FOLLOW-UP KLIEN: INFO DETAIL + TOMBOL AKSI
// ====================================================================
function tampilkanInfoFollowUp(targetChatId, adminChatId, config) {
  var klien   = cariAtauDaftarKlienSaaS(targetChatId, "");
  if (!klien || klien.Status_Akses === "BELUM_DAFTAR") {
    kirimPesanSaaS(adminChatId,
      "❌ Chat ID `" + targetChatId + "` tidak ditemukan.", null, config.BOT_TOKEN);
    return;
  }
  var sapaan   = getSapaan(klien.Nama_Pendaftar);
  var expStr   = klien.Masa_Aktif
    ? Utilities.formatDate(new Date(klien.Masa_Aktif), "GMT+7", "dd/MM/yyyy") : "—";
  var sisaHari = klien.Masa_Aktif
    ? Math.ceil((new Date(klien.Masa_Aktif) - new Date()) / 86400000) : null;
  var infoSisa = sisaHari !== null
    ? (sisaHari > 0 ? "Sisa *" + sisaHari + " hari*" : "⛔ *EXPIRED*") : "—";

  var info =
    "👤 *PROFIL KLIEN*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "▪️ Nama      : *" + (klien.Nama_Pendaftar||"—") + "*\n" +
    "▪️ Chat ID   : `" + targetChatId + "`\n" +
    "▪️ Status    : `" + klien.Status_Akses + "`\n" +
    "▪️ Masa Aktif: `" + expStr + "` — " + infoSisa + "\n" +
    "▪️ Total Cetak: " + (klien.Total_Laporan||0) + "x\n" +
    "▪️ Warning   : `" + (klien.Warning_Sent||"—") + "`\n\n";

  // Deeplink WA dengan pesan kontekstual
  var pesanWA = "Halo " + sapaan + ", saya Admin Kinerja RHK ingin menghubungi " +
    "terkait akun yang " +
    (sisaHari !== null && sisaHari <= 0 ? "sudah expired" : "akan segera expired") + ".";
  var linkWA  = "https://wa.me/" + SAAS_CONFIG.ADMIN_WHATSAPP_NO +
                "?text=" + encodeURIComponent(pesanWA);

  var kb = {"inline_keyboard": [
    [{"text":"📲  Buka WhatsApp Admin (Kirim ke Klien)", "url": linkWA}],
    [{"text":"💬 Kirim Pesan Bot ke Klien",  "callback_data":"ADM_MSG_"      + targetChatId}],
    [{"text":"📄 Kirim Ulang Template",       "callback_data":"ADM_SEND_TPL_" + targetChatId}]
  ]};
  kirimPesanSaaS(adminChatId, info + "Pilih aksi untuk *" + sapaan + "*:", kb, config.BOT_TOKEN);
}

function tampilkanDaftarFollowUpSemua(adminChatId, config) {
  var semua    = cariSemuaKlienByStatus("AKTIF");
  var sekarang = new Date();
  var daftar   = [];

  semua.forEach(function(k) {
    if (!k.Masa_Aktif) return;
    var sisa = Math.ceil((new Date(k.Masa_Aktif) - sekarang) / 86400000);
    if (sisa <= 7) daftar.push({klien:k, sisa:sisa});
  });
  var nonaktif = cariSemuaKlienByStatus("NONAKTIF");
  nonaktif.forEach(function(k) {
    if ((k.Catatan_Admin||"").toString().indexOf("Expired") !== -1)
      daftar.push({klien:k, sisa:-999});
  });

  if (!daftar.length) {
    kirimPesanSaaS(adminChatId,
      "🎉 Tidak ada klien yang expired atau hampir expired (≤7 hari).",
      null, config.BOT_TOKEN);
    return;
  }
  daftar.sort(function(a,b){return a.sisa-b.sisa;});

  var teks = "⚠️ *KLIEN PERLU FOLLOW-UP*\n_(Expired / Sisa ≤ 7 hari)_\n\n";
  var kb   = {"inline_keyboard":[]};

  for (var i = 0; i < daftar.length; i++) {
    var k    = daftar[i].klien;
    var sisa = daftar[i].sisa;
    var lbl  = sisa <= 0 ? "❌ EXPIRED" : "⚠️ H-" + sisa;
    teks += (i+1) + ". *" + (k.Nama_Pendaftar||"—") +
            "* (`" + k.Chat_ID + "`) — " + lbl + "\n";
    var pesanWAFU = "Halo " + getSapaan(k.Nama_Pendaftar) +
      ", masa aktif akun Kinerja RHK " +
      (sisa <= 0 ? "sudah berakhir" : "tersisa " + sisa + " hari") +
      ". Ketik /bayar untuk perpanjangan.";
    kb.inline_keyboard.push([{
      "text": "📲  WA " + getSapaan(k.Nama_Pendaftar) + " (" + lbl + ")",
      "url" : "https://wa.me/" + SAAS_CONFIG.ADMIN_WHATSAPP_NO +
              "?text=" + encodeURIComponent(pesanWAFU)
    }]);
  }
  kirimPesanSaaS(adminChatId, teks, null, config.BOT_TOKEN);
  if (kb.inline_keyboard.length)
    kirimPesanSaaS(adminChatId, "📲 *Tombol WA cepat:*", kb, config.BOT_TOKEN);
}

// ====================================================================
// KIRIM TEMPLATE KE KLIEN
// ====================================================================
function kirimTemplateKeKlien(targetChatId, adminChatId, config) {
  try {
    var klien  = cariAtauDaftarKlienSaaS(targetChatId, "");
    var sapaan = getSapaan(klien.Nama_Pendaftar);
    if (!klien.Nama_Pendaftar) {
      kirimPesanSaaS(adminChatId,
        "❌ Chat ID `" + targetChatId + "` tidak ditemukan.", null, config.BOT_TOKEN);
      return;
    }
    var adminRoot = DriveApp.getFolderById(SAAS_CONFIG.ADMIN_ROOT_FOLDER_ID);
    var iter      = adminRoot.getFoldersByName(klien.Nama_Pendaftar);
    if (!iter.hasNext()) {
      kirimPesanSaaS(adminChatId,
        "❌ Folder Drive untuk *" + sapaan + "* belum ada.\n" +
        "Klien belum pernah mengirim file template.", null, config.BOT_TOKEN);
      return;
    }
    var folder    = iter.next();
    var files     = folder.getFiles();
    var jumlah    = 0; var daftarId = "";

    kirimPesanSaaS(adminChatId,
      "⏳ Mengirim template *" + sapaan + "* ke `" + targetChatId + "`...",
      null, config.BOT_TOKEN);
    kirimPesanSaaS(targetChatId,
      "📄 *Admin mengirimkan file template RHK Anda kembali:*",
      null, config.BOT_TOKEN);

    while (files.hasNext()) {
      var file   = files.next();
      var mime   = file.getMimeType();
      var blob   = mime === MimeType.GOOGLE_DOCS
        ? file.getAs("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
               .setName(file.getName() + ".docx")
        : file.getBlob();
      kirimDokumenSaaS(targetChatId, blob, "📋 " + file.getName(), config.BOT_TOKEN);
      if (mime === MimeType.GOOGLE_DOCS)
        daftarId += "▪️ `" + file.getName() + "` → ID: `" + file.getId() + "`\n";
      jumlah++;
      Utilities.sleep(500);
    }
    if (!jumlah) {
      kirimPesanSaaS(adminChatId, "⚠️ Folder *" + sapaan + "* kosong.", null, config.BOT_TOKEN);
      return;
    }
    kirimPesanSaaS(adminChatId,
      "✅ *" + jumlah + " file* terkirim ke *" + sapaan + "*.\n\n" +
      "📌 *ID untuk RHK_Config:*\n" + daftarId,
      null, config.BOT_TOKEN);
  } catch(eK) {
    kirimPesanSaaS(adminChatId,
      "⚠️ Gagal kirim template: `" + eK.toString() + "`", null, config.BOT_TOKEN);
  }
}


// ====================================================================
// FILE 06: ENGINE GENERATOR DOKUMEN & KONDISI OVERWRITE (REVISI V4)
// ====================================================================

function cetakBerkasLaporanPremiumSaaS(chatId, config) {
  try {
    var klien = cariAtauDaftarKlienSaaS(chatId, "");
    var configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
    var cData = configSheet.getDataRange().getValues();
    
    var tId = "", minF = 2, maxF = 4;
    for (var i = 1; i < cData.length; i++) {
      if (cData[i][0].toString() === chatId.toString() && cData[i][1] === klien.RHK_Terpilih) {
        tId = cData[i][4]; minF = parseInt(cData[i][7]); maxF = parseInt(cData[i][8]); break;
      }
    }
    
    var fId = "";
    if (klien.Folder_Root_ID) {
      var match = /[-\w]{25,}/.exec(klien.Folder_Root_ID);
      if (match) fId = match[0];
    }
    
    if (!fId || !tId) throw new Error("ID Folder Root klien atau ID Template RHK belum terbaca dari database pusat.");
    
    // PERBAIKAN 4: Proteksi Tanggal Indo Murni & Format Nama File (RHK 1 23 Mei 2026)
    var tglKlien = klien.Tanggal_Terpilih;
    var tglString = "";
    
    // Mengubah kembali jika Google Sheets iseng mengubah teks jadi objek bahasa inggris
    if (tglKlien instanceof Date) {
      var bIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      tglString = tglKlien.getDate() + " " + bIndo[tglKlien.getMonth()] + " " + tglKlien.getFullYear();
    } else {
      tglString = tglKlien.toString(); // Output asli: "23 Mei 2026"
    }

    var rhkBersih = klien.RHK_Terpilih.replace("_", " "); // Merubah "RHK_1" jadi "RHK 1"
    var docName = rhkBersih + " " + tglString; // Hasil akhir: "RHK 1 23 Mei 2026"
    var namaBulan = tglString.split(" ")[1] + " " + tglString.split(" ")[2];
    
    var userRootDrive = DriveApp.getFolderById(fId);
    
    var fIndukFoto = userRootDrive.getFoldersByName("Foto Laporan").hasNext() ? userRootDrive.getFoldersByName("Foto Laporan").next() : userRootDrive.createFolder("Foto Laporan");
    var fIndukPdf = userRootDrive.getFoldersByName("PDF Laporan").hasNext() ? userRootDrive.getFoldersByName("PDF Laporan").next() : userRootDrive.createFolder("PDF Laporan");
    
    var fRhkFoto = fIndukFoto.getFoldersByName(rhkBersih).hasNext() ? fIndukFoto.getFoldersByName(rhkBersih).next() : fIndukFoto.createFolder(rhkBersih);
    var fRhkPdf = fIndukPdf.getFoldersByName(rhkBersih).hasNext() ? fIndukPdf.getFoldersByName(rhkBersih).next() : fIndukPdf.createFolder(rhkBersih);
    
    var fBulanFoto = fRhkFoto.getFoldersByName(namaBulan).hasNext() ? fRhkFoto.getFoldersByName(namaBulan).next() : fRhkFoto.createFolder(namaBulan);
    var fBulanPdf = fRhkPdf.getFoldersByName(namaBulan).hasNext() ? fRhkPdf.getFoldersByName(namaBulan).next() : fRhkPdf.createFolder(namaBulan);
    
    var folderFinalFoto = fBulanFoto.getFoldersByName(docName).hasNext() ? fBulanFoto.getFoldersByName(docName).next() : fBulanFoto.createFolder(docName);
    var fFiles = folderFinalFoto.getFiles(); while (fFiles.hasNext()) { fFiles.next().setTrashed(true); }
    
    var folderFinalPdf;
    var itPdf = fBulanPdf.getFoldersByName(docName);
    if (itPdf.hasNext()) {
      folderFinalPdf = itPdf.next();
      var pFiles = folderFinalPdf.getFiles(); while (pFiles.hasNext()) { pFiles.next().setTrashed(true); }
    } else {
      folderFinalPdf = fBulanPdf.createFolder(docName);
    }
    
    var copyDocFile = DriveApp.getFileById(tId).makeCopy(docName, folderFinalPdf);
    var openDoc = DocumentApp.openById(copyDocFile.getId());
    var docBody = openDoc.getBody();
    
    docBody.replaceText("{{HARI}}", klien.Hari_Terpilih);
    docBody.replaceText("{{TANGGAL}}", tglString); // Dipaksa jadi bahasa Indonesia!
    
    // PENTING: sumber data harus SAMA dengan tempat kuesioner menyimpan, yaitu
    // ScriptProperties dengan prefix "sess_". (Sebelumnya keliru memakai
    // getUserProperties tanpa prefix → jawaban & foto tidak terbaca → PDF kosong.)
    var props = PropertiesService.getScriptProperties();
    var listTagsStr = props.getProperty("sess_" + chatId + "_list_tags") || "";
    if (listTagsStr !== "") {
      var tagsArr = listTagsStr.split(",");
      tagsArr.forEach(function(tagKey) {
        var jawabanUser = props.getProperty("sess_" + chatId + "_ans_" + tagKey) || "-";
        docBody.replaceText("{{" + tagKey + "}}", jawabanUser);
      });
    }
    
    var totalFotoTerkirim = parseInt(klien.Foto_Count);
    
    for (var i = 1; i <= totalFotoTerkirim; i++) {
      var idFileTelegram = props.getProperty("sess_" + chatId + "_foto_" + i);
      if (idFileTelegram) {
        var blobGambar = unduhFisikBlobTelegram(idFileTelegram, config.BOT_TOKEN);
        
        folderFinalFoto.createFile(blobGambar).setName(docName + "_Foto" + i + ".jpg");
        
        var matchTagFoto = docBody.findText("{{FOTO" + i + "}}");
        if (matchTagFoto) {
          var inlineImg = matchTagFoto.getElement().getParent().asParagraph().insertInlineImage(0, blobGambar);
          inlineImg.setWidth(480); 
          inlineImg.setHeight(340);
          matchTagFoto.getElement().asText().setText("");
        }
      }
    }
    
    for (var n = 1; n <= 4; n++) { docBody.replaceText("{{FOTO" + n + "}}", ""); }
    var teksSisaDoc = docBody.getText();
    if (teksSisaDoc.includes("{{") && teksSisaDoc.includes("}}")) {
      var regexSisa = /\{\{[A-Za-z0-9_]+\}\}/g; var matchSisa;
      while ((matchSisa = regexSisa.exec(teksSisaDoc)) !== null) { docBody.replaceText(matchSisa[0], ""); }
    }
    
    openDoc.saveAndClose();
    
    var pdfBlobFile = copyDocFile.getAs(MimeType.PDF);
    folderFinalPdf.createFile(pdfBlobFile).setName(docName + ".pdf");
    
    var rawLinkEvidenMyAsn = folderFinalPdf.getUrl();
    var sisaKuotaCetak = parseInt(klien.Limit_Harian) - 1;
    perbaruiKolomKlien(chatId, "Limit_Harian", sisaKuotaCetak);
    perbaruiKolomKlien(chatId, "Total_Laporan", parseInt(klien.Total_Laporan) + 1);
    
    // PERBAIKAN 2: Tautan folder dibungkus rapi dengan monospaced markdown agar bisa ditekan 1x untuk copy!
    var teksSelesai = "🎉 *Laporan Sukses Diterbitkan Premium!* 🎉\n\n" +
                      "▪️ *Nama Berkas:* `" + docName + ".pdf`\n" +
                      "▪️ *Sisa Jatah Hari Ini:* " + sisaKuotaCetak + " Kali Cetak.\n\n" +
                      "🔗 *Tautan Folder Eviden (Ketuk link di bawah 1x untuk copy):*\n" +
                      "`" + rawLinkEvidenMyAsn + "`";
                      
    kirimDokumenSaaS(chatId, pdfBlobFile, teksSelesai, config.BOT_TOKEN);
    copyDocFile.setTrashed(true); 
    perbaruiKolomKlien(chatId, "State_Sesi", "");
    
  } catch (error) {
    var kbGagalCetak = {"inline_keyboard": [
      [{"text": "🚀 Tekan Cetak Ulang Laporan", "callback_data": "RETRY_CETAK_NOW"}],
      [{"text": "📱 Hubungi Kendala Admin", "url": SAAS_CONFIG.ADMIN_WHATSAPP_LINK}]
    ]};
    var teksGagal = "⚠️ *Aduh Maaf, Jaringan Server Sedang Padat!* ⚠️\n\nData teks isian Anda *tetap aman*. Silakan ketuk tombol di bawah ini untuk mengulang kembali proses cetak PDF:";
    kirimPesanSaaS(chatId, teksGagal, kbGagalCetak, config.BOT_TOKEN);
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem").appendRow([new Date(), "ERROR PDF ENGINE", "User " + chatId + ": " + error.toString()]);
  }
}

function unduhFisikBlobTelegram(fileId, token) {
  var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/getFile?file_id=" + fileId);
  var path = JSON.parse(res.getContentText()).result.file_path;
  return UrlFetchApp.fetch("https://api.telegram.org/file/bot" + token + "/" + path).getBlob();
}

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
    // ── KEAMANAN: validasi secret webhook ──────────────────────────
    // Apps Script doPost TIDAK menerima header HTTP, jadi secret dikirim
    // sebagai query param (?s=...) yang dipasang pasangWebhookOtomatis().
    // Bila WEBHOOK_SECRET diset namun tidak cocok → abaikan (anti-POST palsu).
    var _sp = PropertiesService.getScriptProperties();
    var _secret = _sp.getProperty("WEBHOOK_SECRET");
    if (_secret && (!e || !e.parameter || e.parameter.s !== _secret)) {
      return HtmlService.createHtmlOutput("OK");
    }

    var config = ambilKonfigurasiSaaS();
    var token  = config.BOT_TOKEN;
    var update = JSON.parse(e.postData.contents);

    // ── IDEMPOTENCY: cegah proses ganda bila Telegram kirim ulang ───
    if (update.update_id != null) {
      var _cache = CacheService.getScriptCache();
      var _kDedup = "upd_" + update.update_id;
      if (_cache.get(_kDedup)) {
        return HtmlService.createHtmlOutput("OK"); // update ini sudah diproses
      }
      _cache.put(_kDedup, "1", 600); // tandai 10 menit
    }

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

  // Blokir /lapor saat status tidak valid — bedakan per tahap
  if ((text === "/lapor" || text === "/start") &&
      klien.Status_Akses !== "AKTIF" &&
      klien.Status_Akses !== "BELUM_DAFTAR") {
    
    // Klien yang SUDAH bayar tapi menu RHK belum siap
    if (klien.Status_Akses === "PENDING_RHK" || klien.Status_Akses === "REG_WIZARD") {
      kirimPesanSaaS(chatId,
        "⏳ *Menu RHK Sedang Disiapkan*\n\n" +
        "Halo *" + getSapaan(klien.Nama_Pendaftar) + "*, pembayaran Anda sudah diterima! ✅\n\n" +
        "Admin sedang menyiapkan menu pelaporan RHK. " +
        "Notifikasi akan dikirim begitu menu siap digunakan.\n\n" +
        "📄 Jika belum mengirim file template (.docx), kirimkan sekarang ke chat ini.",
        {"inline_keyboard": [
          [{"text":"📄 Cara Kirim File Template", "callback_data":"PENDING_INFO_TEMPLATE"}],
          [tombolHubungiAdminWA()]
        ]}, token);
      return HtmlService.createHtmlOutput("OK");
    }
    
    // Klien NONAKTIF / expired → arahkan perpanjang
    kirimPesanSaaS(chatId,
      "🔒 *Akses pelaporan belum tersedia.*\n\n" +
      "Silakan perpanjang langganan untuk mengaktifkan kembali akun.",
      {"inline_keyboard": [
        [{"text":"💎 Perpanjang Langganan", "callback_data":"SHORTCUT_BAYAR"}],
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
      // Bedakan klien yang sudah bayar vs belum
      if (cbKlien.Status_Akses === "PENDING_RHK" || cbKlien.Status_Akses === "REG_WIZARD") {
        kirimPesanSaaS(cbChatId,
          "⏳ *Menu RHK Sedang Disiapkan*\n\n" +
          "Pembayaran sudah diterima! Admin sedang menyiapkan menu pelaporan.\n\n" +
          "📄 Kirimkan file template (.docx) jika belum, agar proses lebih cepat.",
          {"inline_keyboard": [
            [{"text":"📄 Cara Kirim File Template", "callback_data":"PENDING_INFO_TEMPLATE"}],
            [tombolHubungiAdminWA()]
          ]}, token);
      } else {
        kirimPesanSaaS(cbChatId,
          "🔒 Akses pelaporan belum tersedia.\n\nPilih paket langganan untuk mengaktifkan akun:",
          {"inline_keyboard": [
            [{"text":"💎 Lihat Paket", "callback_data":"SHORTCUT_BAYAR"}],
            [tombolHubungiAdminWA()]
          ]}, token);
      }
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
    // Cek apakah RHK sudah dikonfigurasi
    var _rhkShA = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
    var _rhkDtA = _rhkShA ? _rhkShA.getDataRange().getValues() : [];
    var _adaRhkA = false;
    for (var _riA = 1; _riA < _rhkDtA.length; _riA++) {
      if (_rhkDtA[_riA][0].toString() === targetAktifId.toString() && _rhkDtA[_riA][4]) {
        _adaRhkA = true; break;
      }
    }
    if (_adaRhkA) {
      kirimPesanSaaS(targetAktifId,
        "🎉 *Akun Anda Telah Diaktifkan!*\n\n" +
        "Halo *" + getSapaan(klienTarget.Nama_Pendaftar) +
        "*, menu pelaporan RHK sudah siap digunakan.\n\nKetik /lapor untuk mulai. 🚀",
        {"inline_keyboard": [[{"text":"📋 Mulai Laporan RHK", "callback_data":"SHORTCUT_LAPOR"}]]},
        config.BOT_TOKEN);
    } else {
      kirimPesanSaaS(targetAktifId,
        "🎉 *Akun Anda Telah Diaktifkan!*\n\n" +
        "Halo *" + getSapaan(klienTarget.Nama_Pendaftar) +
        "*, akun premium sudah aktif!\n\n" +
        "📄 Kirimkan *file template laporan RHK (.docx)* ke chat ini agar " +
        "Admin dapat menyiapkan menu pelaporan otomatis.\n\n" +
        "Notifikasi dikirim begitu menu siap. 🙏",
        {"inline_keyboard": [
          [{"text":"📄 Cara Kirim File Template", "callback_data":"PENDING_INFO_TEMPLATE"}],
          [tombolHubungiAdminWA()]
        ]}, config.BOT_TOKEN);
    }
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
    // Legacy handler - redirect ke pilih paket jika belum bayar
    if (cbKlien.Status_Akses !== "AKTIF" && cbKlien.Status_Akses !== "PENDING_RHK") {
      perbaruiKolomKlien(cbChatId, "State_Sesi", "");
      kirimPesanSaaS(cbChatId,
        "✅ *Terima kasih!*\n\nUntuk mengaktifkan layanan, pilih paket langganan:",
        {"inline_keyboard": [
          [{"text": "💎 Paket 1 Bulan  — Rp 10.000",  "callback_data": "ORDER_PAKET_1"}],
          [{"text": "💎 Paket 3 Bulan  — Rp 30.000",  "callback_data": "ORDER_PAKET_3"}],
          [{"text": "💎 Paket 6 Bulan  — Rp 50.000",  "callback_data": "ORDER_PAKET_6"}],
          [{"text": "💎 Paket 12 Bulan — Rp 100.000", "callback_data": "ORDER_PAKET_12"}]
        ]}, token);
    } else {
      perbaruiKolomKlien(cbChatId, "State_Sesi", "");
      kirimPesanSaaS(cbChatId,
        "✅ *Akun Anda sudah aktif / dalam proses!*\n\n" +
        "Kirimkan file template .docx jika belum, agar Admin bisa menyiapkan menu RHK.",
        {"inline_keyboard": [
          [{"text":"📄 Cara Kirim File Template", "callback_data":"PENDING_INFO_TEMPLATE"}],
          [tombolHubungiAdminWA()]
        ]}, token);
    }
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
    "cekDanIngatkanPendaftaranMacet",
    "backupHarianDatabase"
  ];

  // Hapus semua trigger lama milik fungsi-fungsi di atas agar tidak dobel
  var existing = ScriptApp.getProjectTriggers();
  for (var x = 0; x < existing.length; x++) {
    if (daftarFungsi.indexOf(existing[x].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(existing[x]);
    }
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

  // ── 6. Backup harian database: 23:30 WIB ──────────────────────
  ScriptApp.newTrigger("backupHarianDatabase")
    .timeBased().atHour(23).nearMinute(30).everyDays(1).create();

  // Log konfirmasi
  Logger.log("✅ 6 trigger berhasil dipasang:");
  Logger.log("   ⭐ prosesBatchAntrian              → tiap 1 menit");
  Logger.log("   • resetLimitHarianOtonom          → 00:00 WIB");
  Logger.log("   • cekDanKirimWarningMasaAktif      → 08:00 WIB");
  Logger.log("   • cekDanAutoBlockExpired           → 08:30 WIB");
  Logger.log("   • cekDanIngatkanPendaftaranMacet   → 09:00 WIB");
  Logger.log("   • backupHarianDatabase             → 23:30 WIB");

  var ls = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
  if (ls) ls.appendRow([new Date(), "TRIGGER_SETUP",
    "6 trigger dipasang. Queue worker aktif tiap 1 menit."]);
}

// ====================================================================
// 6. BACKUP HARIAN DATABASE (23:30 WIB)
// ====================================================================
// Menyalin seluruh Spreadsheet ke folder backup di Drive admin, lalu
// menyisakan maksimal BACKUP_MAX_SIMPAN salinan terbaru (rotasi).
// Tujuan: jaring pengaman bila terjadi kerusakan data / insiden darurat.
// ====================================================================
function backupHarianDatabase() {
  var BACKUP_MAX_SIMPAN = 14;   // simpan 14 backup terakhir (≈2 minggu)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    // Folder backup di dalam folder induk admin
    var adminRoot = DriveApp.getFolderById(SAAS_CONFIG.ADMIN_ROOT_FOLDER_ID);
    var itBackup  = adminRoot.getFoldersByName("Backup_Database_RHK");
    var folderBak = itBackup.hasNext() ? itBackup.next()
                                       : adminRoot.createFolder("Backup_Database_RHK");

    // Salin file spreadsheet
    var stempel  = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd_HH-mm");
    var namaBak  = "BACKUP_" + ss.getName() + "_" + stempel;
    DriveApp.getFileById(ss.getId()).makeCopy(namaBak, folderBak);

    // Rotasi: hapus backup terlama bila melebihi batas
    var semua = [];
    var it    = folderBak.getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (f.getName().indexOf("BACKUP_") === 0) semua.push(f);
    }
    semua.sort(function(a, b) { return b.getDateCreated() - a.getDateCreated(); });
    for (var i = BACKUP_MAX_SIMPAN; i < semua.length; i++) {
      semua[i].setTrashed(true);
    }

    var ls = ss.getSheetByName("Log_Sistem");
    if (ls) ls.appendRow([new Date(), "BACKUP_OK",
      "Backup harian dibuat: " + namaBak + " (" + Math.min(semua.length, BACKUP_MAX_SIMPAN) + " disimpan)."]);

    // Notif ringkas ke admin
    try {
      var cfg = ambilKonfigurasiSaaS();
      kirimPesanSaaS(cfg.ADMIN_CHAT_ID,
        "💾 *Backup Harian Berhasil*\n`" + namaBak + "`\nLokasi: folder *Backup_Database_RHK*.",
        null, cfg.BOT_TOKEN);
    } catch (eN) { /* abaikan notif gagal */ }

  } catch (eBak) {
    var ls2 = ss.getSheetByName("Log_Sistem");
    if (ls2) ls2.appendRow([new Date(), "BACKUP_ERROR", eBak.toString()]);
    try {
      var cfg2 = ambilKonfigurasiSaaS();
      kirimPesanSaaS(cfg2.ADMIN_CHAT_ID,
        "⚠️ *Backup harian GAGAL.*\n" + eBak.toString() +
        "\n\nPeriksa ADMIN_ROOT_FOLDER_ID & izin Drive.", null, cfg2.BOT_TOKEN);
    } catch (eN2) {}
  }
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


// ====================================================================
// FILE 09: QUEUE ENGINE — SISTEM ANTRIAN SKALABILITAS (v1)
// ====================================================================
//
// ARSITEKTUR:
//
//   Telegram → doPost() [07_MainWebhook.js]
//                  │
//          ┌───────┴────────┐
//          │                │
//     RINGAN: proses      BERAT: tulis ke
//     langsung (<200ms)   Antrian_Request
//     • /start /batal     • Foto laporan (PDF gen)
//     • /lapor /bayar     • Foto bukti bayar (OCR)
//     • Callback teks     • Upload dokumen .docx
//     • Perintah admin    • Callback SaaS_PROSES_NOW
//          │                │
//          │           Trigger 1 menit
//          │         prosesBatchAntrian()
//          │           ambil PENDING → proses
//          │           → mark DONE / FAILED
//          └───────────────┘
//
// MENGAPA EFEKTIF:
//   - doPost() selesai < 300ms → Telegram tidak timeout
//   - Tidak ada request yang hilang meski bersamaan
//   - Retry otomatis 3x jika gagal (jaringan, quota Drive, dll)
//   - Worker berjalan tiap 1 menit via time-based trigger
//   - Monitor realtime: lihat sheet Antrian_Request
//
// KOLOM Antrian_Request:
//   [0] ID          - unik per request
//   [1] Timestamp   - waktu masuk
//   [2] Chat_ID     - pemilik request
//   [3] Tipe_Update - label jenis request
//   [4] Payload_JSON- JSON update Telegram lengkap
//   [5] Status      - PENDING | PROCESSING | DONE | FAILED
//   [6] Retry       - counter percobaan (max 3)
//   [7] Error_Log   - pesan error terakhir
// ====================================================================

// ── Konstanta ────────────────────────────────────────────────────────
var QUEUE_MAX_RETRY    = 3;
var QUEUE_BATCH_SIZE   = 10;   // proses max 10 item per eksekusi trigger
var QUEUE_MAX_AGE_HARI = 3;    // hapus entri DONE/FAILED lebih dari 3 hari

// ── Tipe update yang dimasukkan ke antrian (BERAT) ───────────────────
var TIPE_ANTRIAN = {
  FOTO_LAPORAN  : "FOTO_LAPORAN",    // foto bukti kegiatan → generate PDF
  FOTO_BAYAR    : "FOTO_BAYAR",      // foto bukti transfer → OCR
  DOKUMEN_DOCX  : "DOKUMEN_DOCX",    // upload template .docx
  CETAK_PDF     : "CETAK_PDF"        // callback SaaS_PROSES_NOW
};

// ====================================================================
// FUNGSI PUBLIK: Tulis request ke antrian
// Dipanggil dari 07_MainWebhook.js untuk request berat
// ====================================================================
function masukkanKeAntrian(chatId, tipeUpdate, payloadUpdate) {
  try {
    var sheet     = SpreadsheetApp.getActiveSpreadsheet()
                                  .getSheetByName("Antrian_Request");
    if (!sheet) {
      // Sheet belum ada → fallback proses langsung
      _logQueue("WARN", "Sheet Antrian_Request tidak ditemukan, fallback langsung.");
      return false;
    }

    var id        = "Q" + new Date().getTime() +
                    "_" + Math.floor(Math.random() * 9000 + 1000);
    var payload   = JSON.stringify(payloadUpdate);

    // Cegah duplikasi: jika Chat_ID + Tipe yang sama sudah PENDING < 30 detik, skip
    var data = sheet.getDataRange().getValues();
    var sekarang = new Date();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2].toString() === chatId.toString() &&
          data[i][3] === tipeUpdate &&
          data[i][5] === "PENDING") {
        var tsMasuk = new Date(data[i][1]);
        if ((sekarang - tsMasuk) < 30000) { // dalam 30 detik
          _logQueue("SKIP_DUPLIKAT", chatId + " | " + tipeUpdate);
          return true; // dianggap berhasil masuk (sudah ada)
        }
      }
    }

    sheet.appendRow([
      id,           // ID
      new Date(),   // Timestamp
      chatId,       // Chat_ID
      tipeUpdate,   // Tipe_Update
      payload,      // Payload_JSON
      "PENDING",    // Status
      0,            // Retry
      ""            // Error_Log
    ]);

    _logQueue("ENQUEUE", chatId + " | " + tipeUpdate + " | " + id);
    return true;

  } catch (eQueue) {
    _logQueue("ENQUEUE_ERROR", chatId + ": " + eQueue.toString());
    return false; // gagal masuk antrian → caller harus fallback
  }
}

// ====================================================================
// WORKER UTAMA: Proses batch antrian
// Dipanggil oleh time-based trigger tiap 1 menit
// ====================================================================
function prosesBatchAntrian() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Antrian_Request");
  if (!sheet) return;

  var config = ambilKonfigurasiSaaS();

  // Eskalasi alert darurat (dering ulang) — jalan tiap menit walau antrian kosong
  try { prosesAlertDaruratTertunda(config); } catch (eAlert) {
    _logQueue("ALERT_ERROR", eAlert.toString().substring(0, 200));
  }

  var data   = sheet.getDataRange().getValues();

  // Ambil semua baris PENDING, urutkan berdasarkan Timestamp (FIFO)
  var pending = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][5] === "PENDING" && parseInt(data[i][6] || 0) < QUEUE_MAX_RETRY) {
      pending.push({
        row       : i + 1,           // nomor baris di sheet (1-based)
        id        : data[i][0],
        timestamp : data[i][1],
        chatId    : data[i][2].toString(),
        tipe      : data[i][3],
        payload   : data[i][4],
        retry     : parseInt(data[i][6] || 0)
      });
    }
  }

  // FIFO: urutkan dari yang paling lama masuk
  pending.sort(function(a, b) {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  // Ambil BATCH_SIZE item teratas
  var batch = pending.slice(0, QUEUE_BATCH_SIZE);
  if (batch.length === 0) return; // tidak ada yang perlu diproses

  _logQueue("WORKER_START",
    "Memproses " + batch.length + " dari " + pending.length + " item pending.");

  for (var j = 0; j < batch.length; j++) {
    var item = batch[j];

    // Mark PROCESSING — cegah worker lain ambil item yang sama
    sheet.getRange(item.row, 6).setValue("PROCESSING");
    SpreadsheetApp.flush(); // tulis langsung ke sheet

    try {
      // Parse payload JSON
      var update = JSON.parse(item.payload);

      // Eksekusi berdasarkan tipe
      var berhasil = _eksekusiItemAntrian(item.tipe, item.chatId, update, config);

      if (berhasil) {
        sheet.getRange(item.row, 6).setValue("DONE");
        sheet.getRange(item.row, 8).setValue(""); // clear error log
        _logQueue("DONE", item.id + " | " + item.chatId + " | " + item.tipe);
      } else {
        // Eksekusi mengembalikan false → retry
        _handleRetryOrFail(sheet, item);
      }

    } catch (eProses) {
      // Exception saat eksekusi → catat error + retry
      sheet.getRange(item.row, 8).setValue(eProses.toString());
      _handleRetryOrFail(sheet, item);
      _logQueue("PROCESS_ERROR",
        item.id + " | " + item.chatId + " | " + eProses.toString().substring(0, 200));
    }

    SpreadsheetApp.flush();
  } // end for batch

  // Bersihkan entri lama (DONE/FAILED > QUEUE_MAX_AGE_HARI hari)
  _bersihkanAntrianLama(sheet);
}

// ====================================================================
// DISPATCHER: Eksekusi item antrian sesuai tipenya
// Return: true jika berhasil, false jika perlu retry
// ====================================================================
function _eksekusiItemAntrian(tipe, chatId, update, config) {
  var token = config.BOT_TOKEN;

  // ── FOTO_BAYAR: foto bukti transfer → OCR auto-approve ──────────
  if (tipe === TIPE_ANTRIAN.FOTO_BAYAR) {
    var photoArray = update.message.photo;
    terimaFotoBuktiTransferKlien(chatId, photoArray, config);
    return true;
  }

  // ── FOTO_LAPORAN: foto bukti kegiatan ───────────────────────────
  if (tipe === TIPE_ANTRIAN.FOTO_LAPORAN) {
    var fotoArr = update.message.photo;
    terimaFotoLaporanKegiatanKlien(chatId, fotoArr, config);
    return true;
  }

  // ── DOKUMEN_DOCX: upload file template ──────────────────────────
  if (tipe === TIPE_ANTRIAN.DOKUMEN_DOCX) {
    var docObj = update.message.document;
    prosesUnduhTemplateWordKlien(chatId, docObj, config);
    return true;
  }

  // ── CETAK_PDF: generate PDF laporan ─────────────────────────────
  if (tipe === TIPE_ANTRIAN.CETAK_PDF) {
    var klienPdf = cariAtauDaftarKlienSaaS(chatId, "");
    if (parseInt(klienPdf.Foto_Count) < 2) {
      kirimPesanSaaS(chatId,
        "⚠️ Minimal *2 foto* diperlukan. Kirimkan foto ke-2 terlebih dahulu.",
        null, token);
      return true; // bukan error, anggap selesai
    }
    perbaruiKolomKlien(chatId, "State_Sesi", "PROSES_PDF");
    kirimPesanSaaS(chatId,
      "⏳ *Merakit laporan PDF...* Mohon tunggu sebentar. " +
      "_Sistem sedang memproses antrian._",
      null, token);
    cetakBerkasLaporanPremiumSaaS(chatId, config);
    return true;
  }

  // Tipe tidak dikenal
  _logQueue("UNKNOWN_TIPE", chatId + " | " + tipe);
  return false;
}

// ====================================================================
// HELPER: Retry atau tandai FAILED
// ====================================================================
function _handleRetryOrFail(sheet, item) {
  var retryBaru = item.retry + 1;
  if (retryBaru >= QUEUE_MAX_RETRY) {
    sheet.getRange(item.row, 5).setValue("FAILED");
    sheet.getRange(item.row, 6).setValue("FAILED");
    _logQueue("FAILED",
      item.id + " | " + item.chatId + " | Retry habis (" + QUEUE_MAX_RETRY + "x)");

    // Notif ke admin jika item gagal permanen
    try {
      var cfg = ambilKonfigurasiSaaS();
      kirimPesanSaaS(cfg.ADMIN_CHAT_ID,
        "⚠️ *Queue Item FAILED*\n\n" +
        "▪️ ID     : `" + item.id + "`\n" +
        "▪️ ChatID : `" + item.chatId + "`\n" +
        "▪️ Tipe   : `" + item.tipe + "`\n" +
        "▪️ Retry  : " + QUEUE_MAX_RETRY + "x\n\n" +
        "_Cek sheet Antrian_Request untuk detail error._",
        null, cfg.BOT_TOKEN);
    } catch(eNotif) { /* ignore */ }

  } else {
    // Kembalikan ke PENDING untuk dicoba ulang
    sheet.getRange(item.row, 5).setValue("PENDING");
    sheet.getRange(item.row, 6).setValue("PENDING");
    sheet.getRange(item.row, 7).setValue(retryBaru);
    _logQueue("RETRY",
      item.id + " | " + item.chatId + " | Attempt " + retryBaru);
  }
}

// ====================================================================
// HELPER: Hapus baris lama dari sheet (housekeeping)
// Hapus DONE/FAILED yang timestamp-nya > QUEUE_MAX_AGE_HARI hari lalu
// ====================================================================
function _bersihkanAntrianLama(sheet) {
  var data     = sheet.getDataRange().getValues();
  var sekarang = new Date();
  var batasMs  = QUEUE_MAX_AGE_HARI * 24 * 60 * 60 * 1000;
  var barisHapus = [];

  for (var i = data.length - 1; i >= 1; i--) {
    var status = data[i][5];
    if (status !== "DONE" && status !== "FAILED") continue;
    var ts = new Date(data[i][1]);
    if ((sekarang - ts) > batasMs) {
      barisHapus.push(i + 1); // 1-based
    }
  }

  // Hapus dari bawah ke atas agar indeks tidak bergeser
  for (var h = 0; h < barisHapus.length; h++) {
    sheet.deleteRow(barisHapus[h]);
  }

  if (barisHapus.length > 0) {
    _logQueue("CLEANUP",
      "Hapus " + barisHapus.length + " entri lama (>" + QUEUE_MAX_AGE_HARI + " hari).");
  }
}

// ====================================================================
// HELPER: Tulis log ke Log_Sistem
// ====================================================================
function _logQueue(tipe, detail) {
  try {
    var ls = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
    if (ls) ls.appendRow([new Date(), "QUEUE_" + tipe, detail]);
  } catch(e) { /* jangan sampai crash hanya karena log */ }
}

// ====================================================================
// UTILITAS ADMIN: Status antrian saat ini
// Dipanggil dari /admin cek_sistem atau manual
// ====================================================================
function getStatusAntrian() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
                            .getSheetByName("Antrian_Request");
  if (!sheet) return {pending:0, processing:0, done:0, failed:0, total:0};

  var data      = sheet.getDataRange().getValues();
  var pending   = 0, processing = 0, done = 0, failed = 0;

  for (var i = 1; i < data.length; i++) {
    var s = (data[i][5] || "").toString();
    if (s === "PENDING")    pending++;
    else if (s === "PROCESSING") processing++;
    else if (s === "DONE")       done++;
    else if (s === "FAILED")     failed++;
  }

  return {
    pending    : pending,
    processing : processing,
    done       : done,
    failed     : failed,
    total      : data.length - 1
  };
}

// ====================================================================
// UTILITAS ADMIN: /admin cek_antrian
// Tampilkan status antrian ke admin via Telegram
// ====================================================================
function tampilkanStatusAntrianKeAdmin(adminChatId, token) {
  var s = getStatusAntrian();
  var teks =
    "🔄 *STATUS ANTRIAN SISTEM*\n\n" +
    "▪️ 🟡 Menunggu (PENDING)    : *" + s.pending    + "*\n" +
    "▪️ 🔵 Diproses (PROCESSING) : *" + s.processing + "*\n" +
    "▪️ 🟢 Selesai (DONE)        : *" + s.done       + "*\n" +
    "▪️ 🔴 Gagal (FAILED)        : *" + s.failed     + "*\n" +
    "▪️ 📦 Total di sheet        : *" + s.total      + "*\n\n" +
    "_Antrian dibersihkan otomatis setelah " + QUEUE_MAX_AGE_HARI + " hari._\n\n";

  if (s.failed > 0) {
    teks += "⚠️ Ada *" + s.failed + "* item gagal permanen. " +
            "Cek sheet *Antrian_Request* kolom Error_Log.\n\n";
  }
  if (s.pending > 20) {
    teks += "🚨 Antrian menumpuk *" + s.pending + "* item. " +
            "Pertimbangkan menambah kapasitas atau cek error.\n\n";
  }

  teks += "💡 Worker berjalan otomatis tiap *1 menit* via trigger.";

  kirimPesanSaaS(adminChatId, teks, null, token);
}

// ====================================================================
// UTILITAS ADMIN: Bersihkan antrian FAILED secara manual
// /admin bersihkan_antrian
// ====================================================================
function bersihkanAntrianFailed(adminChatId, token) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
                            .getSheetByName("Antrian_Request");
  if (!sheet) {
    kirimPesanSaaS(adminChatId, "❌ Sheet Antrian_Request tidak ditemukan.", null, token);
    return;
  }

  var data = sheet.getDataRange().getValues();
  var hapus = [];
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][5] === "FAILED") hapus.push(i + 1);
  }
  for (var h = 0; h < hapus.length; h++) sheet.deleteRow(hapus[h]);

  kirimPesanSaaS(adminChatId,
    "🧹 *Pembersihan Selesai*\n\n" +
    "Dihapus *" + hapus.length + "* item berstatus FAILED dari antrian.",
    null, token);
  _logQueue("MANUAL_CLEANUP", adminChatId + " | Hapus " + hapus.length + " FAILED.");
}

// ====================================================================
// UTILITAS ADMIN: Reset item PROCESSING yang stuck (> 5 menit)
// Jalankan jika ada item stuck di PROCESSING setelah restart/error
// ====================================================================
function resetStuckProcessing() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
                            .getSheetByName("Antrian_Request");
  if (!sheet) return;

  var data     = sheet.getDataRange().getValues();
  var sekarang = new Date();
  var reset    = 0;

  for (var i = 1; i < data.length; i++) {
    if (data[i][5] !== "PROCESSING") continue;
    var ts    = new Date(data[i][1]);
    var menitBerjalan = (sekarang - ts) / 60000;
    if (menitBerjalan > 5) {
      sheet.getRange(i + 1, 6).setValue("PENDING"); // kembalikan ke PENDING
      reset++;
    }
  }

  _logQueue("RESET_STUCK", "Reset " + reset + " item stuck PROCESSING > 5 menit.");
  return reset;
}


// ====================================================================
// FILE 09: PUSAT DIAGNOSTIK & PERAWATAN WEBHOOK (ALAT BANTU SETUP)
// ====================================================================
// Cara pakai: buka editor Apps Script, pilih fungsi di bawah ini pada
// dropdown, klik "Run", lalu lihat hasilnya di menu "Execution log".
// ====================================================================

/**
 * LANGKAH 1 — JALANKAN INI PERTAMA KALI.
 * Memeriksa seluruh syarat agar bot bisa merespon dan mencetak laporan
 * yang sangat jelas di Execution log. Fungsi ini TIDAK mengubah apa pun.
 */
function cekKesehatanSistem() {
  var L = [];
  L.push("===== LAPORAN KESEHATAN SISTEM KINERJA RHK =====");

  // --- 1. Apakah script terikat (bound) ke Spreadsheet? ---
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    L.push("❌ FATAL: SpreadsheetApp.getActiveSpreadsheet() = null.");
    L.push("   Script ini TIDAK terikat ke Google Sheet. Inilah penyebab bot diam.");
    L.push("   SOLUSI: Buat Google Sheet baru -> menu Extensions -> Apps Script,");
    L.push("           lalu tempel semua kode di project itu (jangan dari script.google.com).");
    console.log(L.join("\n"));
    return;
  }
  L.push("✅ Script terikat ke Spreadsheet: \"" + ss.getName() + "\"");
  L.push("   URL Sheet: " + ss.getUrl());

  // --- 2. Apakah semua sheet wajib sudah ada? ---
  var wajib = ["Pengaturan", "Client_SaaS", "RHK_Config", "Kamus_Placeholder", "Log_Sistem"];
  var adaYangHilang = false;
  wajib.forEach(function (nama) {
    if (ss.getSheetByName(nama)) {
      L.push("✅ Sheet ditemukan: " + nama);
    } else {
      L.push("❌ Sheet HILANG: " + nama);
      adaYangHilang = true;
    }
  });
  if (adaYangHilang) {
    L.push("");
    L.push("   SOLUSI: Jalankan fungsi setupStrukturDatabaseSaaS() sekali untuk membuat sheet.");
    console.log(L.join("\n"));
    return;
  }

  // --- 3. Apakah BOT_TOKEN & ADMIN_CHAT_ID terisi? ---
  var config;
  try {
    config = ambilKonfigurasiSaaS();
  } catch (e) {
    L.push("❌ Gagal membaca sheet Pengaturan: " + e.toString());
    console.log(L.join("\n"));
    return;
  }
  if (!config.BOT_TOKEN) {
    L.push("❌ BOT_TOKEN kosong di sheet Pengaturan.");
    console.log(L.join("\n"));
    return;
  }
  L.push("✅ BOT_TOKEN terisi (…" + String(config.BOT_TOKEN).slice(-6) + ")");
  L.push(config.ADMIN_CHAT_ID ? ("✅ ADMIN_CHAT_ID: " + config.ADMIN_CHAT_ID)
                              : "⚠️ ADMIN_CHAT_ID kosong (fitur admin tidak akan jalan).");

  // --- 4. Apakah token valid? (panggil getMe) ---
  try {
    var me = JSON.parse(UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getMe",
      { muteHttpExceptions: true }).getContentText());
    if (me.ok) {
      L.push("✅ Token VALID. Bot aktif: @" + me.result.username + " (" + me.result.first_name + ")");
    } else {
      L.push("❌ Token DITOLAK Telegram: " + me.description);
      L.push("   SOLUSI: cek ulang BOT_TOKEN dari @BotFather.");
    }
  } catch (e) {
    L.push("❌ Tidak bisa menghubungi Telegram (UrlFetch): " + e.toString());
  }

  // --- 5. Apakah Web App sudah ter-deploy & bagaimana status webhook? ---
  var urlExec = "";
  try { urlExec = ScriptApp.getService().getUrl(); } catch (e) {}
  if (urlExec) {
    var tipeUrl = urlExec.indexOf("/exec") !== -1 ? "/exec" : "/dev (HEAD — hanya utk tes manual)";
    L.push("✅ URL Web App runtime: " + urlExec + "  [" + tipeUrl + "]");
  } else {
    L.push("⚠️ Web App belum ter-deploy. Lakukan Deploy -> New deployment -> Web app.");
  }
  // URL /exec resmi untuk webhook (diambil dari sheet Pengaturan > WEBHOOK_URL)
  var urlWebhookResmi = _resolveUrlExec(config);
  if (urlWebhookResmi) {
    L.push("✅ URL webhook (sumber WEBHOOK_URL): " + urlWebhookResmi);
  } else {
    L.push("⚠️ WEBHOOK_URL '/exec' belum diisi di sheet Pengaturan. " +
           "Tempel URL Web App '/exec' ke sana lalu jalankan pasangWebhookOtomatis().");
  }

  try {
    var info = JSON.parse(UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getWebhookInfo",
      { muteHttpExceptions: true }).getContentText());
    if (info.ok) {
      var r = info.result;
      L.push("----- INFO WEBHOOK TELEGRAM -----");
      L.push("   URL terpasang : " + (r.url || "(KOSONG - belum diset!)"));
      L.push("   Pending update: " + r.pending_update_count);
      if (r.last_error_message) {
        L.push("   ❌ Error terakhir (" + new Date(r.last_error_date * 1000) + "): " + r.last_error_message);
        L.push("      Ini PETUNJUK UTAMA penyebab bot diam. Baca pesan error di atas.");
      } else {
        L.push("   ✅ Tidak ada error pengiriman terakhir dari Telegram.");
      }
      if (r.url && r.url.indexOf("/dev") !== -1) {
        L.push("   ❌ Webhook memakai URL '/dev' — Telegram TIDAK bisa mengaksesnya. " +
               "Pakai URL '/exec' lalu jalankan pasangWebhookOtomatis().");
      } else if (urlWebhookResmi && r.url && r.url !== urlWebhookResmi) {
        L.push("   ⚠️ URL webhook terpasang BERBEDA dengan WEBHOOK_URL di sheet. " +
               "Jalankan pasangWebhookOtomatis() agar sinkron.");
      }
    }
  } catch (e) {
    L.push("❌ Gagal getWebhookInfo: " + e.toString());
  }

  L.push("================================================");
  L.push("Selesai. Jika semua ✅ tapi bot masih diam: jalankan pasangWebhookOtomatis(),");
  L.push("lalu kirim /start ke bot. Jika perlu, jalankan kirimTesKeAdmin().");
  console.log(L.join("\n"));
}

/**
 * LANGKAH 2 — Pasang webhook otomatis ke URL Web App yang sedang aktif.
 * Wajib: Web App sudah di-deploy (Deploy -> New deployment -> Web app,
 * Execute as = Me, Who has access = Anyone).
 */
function pasangWebhookOtomatis() {
  var config = ambilKonfigurasiSaaS();
  var url    = _resolveUrlExec(config);

  if (!url) {
    console.log(
      "❌ URL '/exec' belum tersedia.\n\n" +
      "LANGKAH:\n" +
      "1. Deploy ▸ Manage deployments ▸ buka deployment Web App aktif\n" +
      "2. Salin URL yang DIAKHIRI '/exec'  (BUKAN '/dev')\n" +
      "3. Tempel ke sheet 'Pengaturan' baris kunci 'WEBHOOK_URL'\n" +
      "4. Jalankan ulang pasangWebhookOtomatis()");
    return;
  }
  if (url.indexOf("/exec") === -1) {
    console.log(
      "⚠️ URL terdeteksi BUKAN '/exec':\n   " + url + "\n\n" +
      "Telegram tidak bisa memakai URL '/dev' (butuh login). " +
      "Tempel URL '/exec' Web App ke sheet 'Pengaturan' > 'WEBHOOK_URL', lalu ulangi.");
    return;
  }

  // ── Secret token via query param (anti-POST palsu ke /exec publik) ──
  var sp     = PropertiesService.getScriptProperties();
  var secret = sp.getProperty("WEBHOOK_SECRET");
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, "");
    sp.setProperty("WEBHOOK_SECRET", secret);
  }
  var urlFinal = url + (url.indexOf("?") === -1 ? "?" : "&") + "s=" + secret;

  var res = JSON.parse(UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(urlFinal) +
    "&drop_pending_updates=true",
    { muteHttpExceptions: true }).getContentText());
  console.log("Hasil setWebhook ke:\n  " + urlFinal.replace(secret, "***SECRET***") +
              "\n\n" + JSON.stringify(res, null, 2));
  if (res.ok) console.log("\n✅ Webhook + secret terpasang. Kirim /start ke bot untuk menguji.");
}

/**
 * Tentukan URL '/exec' untuk webhook.
 * Prioritas:
 *   1. Sheet 'Pengaturan' kunci 'WEBHOOK_URL' (cara paling andal — tempel URL /exec sekali)
 *   2. Runtime ScriptApp.getService().getUrl() HANYA bila sudah berupa /exec
 * Catatan: dari editor, getUrl() mengembalikan '/dev' (tak bisa dipakai webhook),
 *          karena itu sumber utama adalah WEBHOOK_URL di sheet.
 */
function _resolveUrlExec(config) {
  if (config && config.WEBHOOK_URL) {
    var u = config.WEBHOOK_URL.toString().trim();
    if (u.indexOf("https://") === 0 &&
        u.indexOf("/exec") !== -1 &&
        u.indexOf("ISI_DEPLOYMENT_ID") === -1) {
      return u;
    }
  }
  try {
    var svc = ScriptApp.getService().getUrl();
    if (svc && svc.indexOf("/exec") !== -1) return svc;
  } catch (e) {}
  return "";
}

/** Lihat status webhook saat ini beserta pesan error terakhir dari Telegram. */
function cekInfoWebhook() {
  var config = ambilKonfigurasiSaaS();
  var res = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getWebhookInfo",
    { muteHttpExceptions: true }).getContentText();
  console.log(JSON.stringify(JSON.parse(res), null, 2));
}

/** Hapus webhook (berguna saat ingin memasang ulang dari awal). */
function hapusWebhook() {
  var config = ambilKonfigurasiSaaS();
  var res = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.BOT_TOKEN + "/deleteWebhook?drop_pending_updates=true",
    { muteHttpExceptions: true }).getContentText();
  console.log(res);
}

/** Kirim pesan tes ke ADMIN_CHAT_ID untuk memastikan jalur kirim pesan berfungsi. */
function kirimTesKeAdmin() {
  var config = ambilKonfigurasiSaaS();
  if (!config.ADMIN_CHAT_ID) { console.log("ADMIN_CHAT_ID kosong."); return; }
  var res = kirimPesanSaaS(config.ADMIN_CHAT_ID,
    "🤖 *Tes Sistem Kinerja RHK*\nJika Anda menerima pesan ini, jalur pengiriman pesan bot sudah berfungsi normal. ✅",
    null, config.BOT_TOKEN);
  console.log("Status kirim: " + res.getResponseCode() + "\n" + res.getContentText());
}

/**
 * Endpoint kesehatan: buka URL /exec Web App di browser untuk memastikan
 * deployment hidup dan sudah terotorisasi. Tidak memengaruhi webhook.
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var status = ss ? ("OK - terikat ke: " + ss.getName()) : "PERINGATAN - script tidak terikat ke Spreadsheet";
  return HtmlService.createHtmlOutput(
    "<h2>Kinerja RHK Web App AKTIF</h2><p>" + status + "</p><p>Waktu server: " + new Date() + "</p>");
}


// ====================================================================
// FILE 10: MESIN QRIS DINAMIS (GENERATIF)
// ====================================================================
// Konversi QRIS STATIS → QRIS DINAMIS bernominal otomatis.
// Standar: EMVCo QR Code Specification for Payment Systems (MPM).
//
// Cara kerja konversi statis → dinamis:
//   1. Ubah tag 01 (Point of Initiation) dari "11" (statis) → "12" (dinamis)
//   2. Sisipkan tag 54 (Transaction Amount) berisi nominal transaksi
//   3. Buang CRC lama (tag 63) lalu hitung ulang CRC16-CCITT (0x1021, init 0xFFFF)
//   4. Tempel CRC baru (4 digit HEX kapital) di akhir setelah "6304"
//
// Sumber payload QRIS statis (urutan prioritas):
//   1. Sheet "Pengaturan" kunci `QRIS_STATIS`  (mudah diubah tanpa sentuh kode)
//   2. SAAS_CONFIG.QRIS_STATIS_PAYLOAD          (default di 01_Config.js)
//
// Hasilnya adalah payload QRIS yang bila di-scan aplikasi bank/e-wallet
// akan otomatis menampilkan nominal — klien tinggal bayar tanpa ketik manual.
// Dipakai oleh: buatInvoiceOtonomSaaS() di 05_AdminEngine.js
// ====================================================================

// Padding panjang TLV ke 2 digit (mis. 5 → "05")
function _qrisPad2(n) {
  n = n.toString();
  return n.length < 2 ? "0" + n : n;
}

// Parser TLV level atas (template bersarang diperlakukan sebagai 1 TLV utuh)
function _qrisParseTLV(payload) {
  var hasil = [];
  var i = 0;
  while (i + 4 <= payload.length) {
    var tag = payload.substr(i, 2);          i += 2;
    var len = parseInt(payload.substr(i, 2), 10); i += 2;
    if (isNaN(len) || i + len > payload.length) break;
    var val = payload.substr(i, len);        i += len;
    hasil.push({ tag: tag, val: val });
  }
  return hasil;
}

// CRC16-CCITT (FALSE) — polinomial 0x1021, nilai awal 0xFFFF
function _qrisCRC16(str) {
  var crc = 0xFFFF;
  for (var i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (var j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  var hex = (crc & 0xFFFF).toString(16).toUpperCase();
  while (hex.length < 4) hex = "0" + hex;
  return hex;
}

// Builder utama: payload QRIS statis + nominal → payload QRIS dinamis
function buatQrisDinamis(payloadStatis, nominal) {
  if (!payloadStatis) throw new Error("Payload QRIS statis kosong.");
  // Hanya buang baris baru/tab (artefak copy-paste), JANGAN buang spasi internal
  // karena nama merchant (tag 59) & kota (tag 60) sah mengandung spasi.
  var bersih = payloadStatis.toString().replace(/[\r\n\t]/g, "").trim();
  if (bersih.length < 20 || bersih.substr(0, 4) !== "0002") {
    throw new Error("Format payload QRIS statis tidak valid.");
  }

  var nominalStr = Math.round(parseFloat(nominal)).toString();
  var tag54      = "54" + _qrisPad2(nominalStr.length) + nominalStr;

  var tlv      = _qrisParseTLV(bersih);
  var out      = "";
  var disisip  = false;

  for (var k = 0; k < tlv.length; k++) {
    var t = tlv[k];
    if (t.tag === "63") continue;            // buang CRC lama
    if (t.tag === "54") continue;            // buang nominal lama (kita set sendiri)

    if (t.tag === "01") {                    // paksa jadi dinamis (12)
      out += "0102" + "12";
      continue;
    }
    // Sisipkan nominal tepat sebelum tag 58 (kode negara) sesuai urutan EMVCo
    if (t.tag === "58" && !disisip) {
      out += tag54;
      disisip = true;
    }
    out += t.tag + _qrisPad2(t.val.length) + t.val;
  }
  if (!disisip) out += tag54;                // fallback bila tag 58 tak ada

  out += "6304";                             // id+len untuk CRC
  out += _qrisCRC16(out);                    // CRC16 atas seluruh string termasuk "6304"
  return out;
}

// ── Helper: ambil payload QRIS statis dari sheet/config ──────────
// Mengembalikan string payload (atau "" bila belum dikonfigurasi).
function ambilPayloadQrisStatis(config) {
  if (config && config.QRIS_STATIS &&
      config.QRIS_STATIS.toString().replace(/\s+/g, "").indexOf("0002") === 0) {
    return config.QRIS_STATIS.toString();
  }
  return SAAS_CONFIG.QRIS_STATIS_PAYLOAD || "";
}

// ── Tes cepat di editor Apps Script ──────────────────────────────
// Jalankan fungsi ini setelah mengisi QRIS_STATIS untuk verifikasi.
function tesQrisDinamis() {
  var cfg    = ambilKonfigurasiSaaS();
  var statis = ambilPayloadQrisStatis(cfg);
  if (!statis) { Logger.log("⚠️ QRIS_STATIS belum diisi di sheet Pengaturan / Config."); return; }
  var dinamis = buatQrisDinamis(statis, 10523);
  Logger.log("STATIS : " + statis);
  Logger.log("DINAMIS: " + dinamis);
  Logger.log("CRC akhir 4 digit: " + dinamis.slice(-4));
  Logger.log("Valid CRC: " + (_qrisCRC16(dinamis.slice(0, -4)) === dinamis.slice(-4)));
}


// ====================================================================
// FILE 11: SISTEM ALERT DARURAT KE ADMIN ("Ping" ala BBM)
// ====================================================================
// Tujuan: saat ada kejadian yang butuh aksi MANUAL segera (klien baru
// butuh aktivasi, bukti bayar butuh approve), bot mengirim notifikasi
// keras ke admin dan MENGULANGNYA otomatis sampai admin menekan tombol
// "Stop Alarm". Mirip fitur Ping! di BBM yang terus mengingatkan.
//
// Cara kerja:
//   1. kirimAlertDarurat()  → kirim 1x + simpan "tugas pengingat" di Properties
//   2. prosesAlertDaruratTertunda() → dipanggil worker antrian tiap 1 menit;
//      mengirim ulang bila jeda interval terlampaui, sampai jatah ulang habis
//   3. Admin tekan "Stop Alarm" → callback ALERT_ACK_<id> menghapus tugas
//
// Catatan penting soal "berbunyi walau silent":
//   Bot TIDAK bisa menembus mode senyap/DND OS HP. Agar benar-benar
//   menerobos, admin perlu mengatur chat bot di Telegram:
//     Android: chat bot ▸ Notifikasi ▸ "Bypass Do Not Disturb" + Suara khusus
//     iOS    : chat bot ▸ Notifikasi kustom + kecualikan dari Focus/DND
//   Untuk "berdering" seperti telepon, gunakan integrasi panggilan suara
//   (mis. CallMeBot) — lihat fungsi opsional di bawah.
// ====================================================================

// Ambil parameter alert (prioritas sheet Pengaturan, fallback SAAS_CONFIG)
function _alertParams(config) {
  var maxU = parseInt((config && config.ALERT_ULANG_MAX) || SAAS_CONFIG.ALERT_ULANG_MAX || 5);
  var intv = parseInt((config && config.ALERT_ULANG_INTERVAL_MENIT) ||
                       SAAS_CONFIG.ALERT_ULANG_INTERVAL_MENIT || 2);
  if (isNaN(maxU) || maxU < 1) maxU = 5;
  if (isNaN(intv) || intv < 1) intv = 2;
  return { maxUlang: maxU, intervalMenit: intv };
}

// ── API UTAMA: picu alert darurat ────────────────────────────────
// opts.tombolAksi : array tombol inline (1 baris) untuk aksi cepat, mis.
//                   [{"text":"✅ Aktifkan","callback_data":"ADM_AKTIFKAN_123"}]
function kirimAlertDarurat(config, judul, detail, opts) {
  opts = opts || {};
  var p  = _alertParams(config);
  var id = "AL" + Date.now() + Math.floor(Math.random() * 1000);

  var rows = [];
  if (opts.tombolAksi) rows.push(opts.tombolAksi);
  rows.push([{ "text": "🔕 Stop Alarm / Sudah Ditangani", "callback_data": "ALERT_ACK_" + id }]);
  var kb = { "inline_keyboard": rows };

  // Kirim pertama kali (sisa ulang = maxUlang)
  _kirimAlertSekali(config, _formatAlert(judul, detail, p.maxUlang, false), kb);

  // Simpan tugas pengingat untuk eskalasi
  try {
    PropertiesService.getScriptProperties().setProperty("alert_" + id, JSON.stringify({
      judul   : judul,
      detail  : detail,
      sisa    : p.maxUlang,
      interval: p.intervalMenit,
      last    : Date.now(),
      kb      : kb
    }));
  } catch (e) {
    _logSistem("ERR_ALERT_SIMPAN", id + " | " + e.toString());
  }
  return id;
}

// ── Dipanggil worker antrian tiap 1 menit (lihat 09_QueueEngine) ──
function prosesAlertDaruratTertunda(config) {
  var props = PropertiesService.getScriptProperties();
  var semua;
  try { semua = props.getProperties(); } catch (e) { return; }
  var now = Date.now();

  for (var key in semua) {
    if (key.indexOf("alert_") !== 0) continue;

    var a;
    try { a = JSON.parse(semua[key]); }
    catch (eParse) { props.deleteProperty(key); continue; }

    if (!a || a.sisa <= 0) { props.deleteProperty(key); continue; }
    if (now - a.last < a.interval * 60000) continue;   // belum waktunya mengulang

    a.sisa -= 1;
    a.last  = now;
    _kirimAlertSekali(config, _formatAlert(a.judul, a.detail, a.sisa, true), a.kb);

    if (a.sisa <= 0) props.deleteProperty(key);          // jatah habis → berhenti
    else             props.setProperty(key, JSON.stringify(a));
  }
}

// ── Admin menekan "Stop Alarm" → matikan pengingat ───────────────
function matikanAlertDarurat(alertId, adminChatId, config) {
  PropertiesService.getScriptProperties().deleteProperty("alert_" + alertId);
  kirimPesanSaaS(adminChatId,
    "🔕 *Alarm dimatikan.* Terima kasih sudah menangani. ✅",
    null, config.BOT_TOKEN);
}

// ── Helper internal ──────────────────────────────────────────────
function _formatAlert(judul, detail, sisaUlang, isUlangan) {
  return "🚨🚨🚨 *DARURAT — " + judul + "* 🚨🚨🚨\n" +
    (isUlangan ? "🔁 _Pengingat berulang (belum ditangani)_\n" : "") +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    detail + "\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "👉 Tekan *Stop Alarm* setelah ditangani." +
    (sisaUlang > 0
      ? "\n_Akan diingatkan lagi hingga " + sisaUlang + "x bila dibiarkan._"
      : "\n_(Pengingat terakhir — tidak diulang lagi.)_");
}

function _kirimAlertSekali(config, teks, kb) {
  try {
    UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendMessage",
      { "method": "post", "contentType": "application/json",
        "payload": JSON.stringify({
          "chat_id"             : config.ADMIN_CHAT_ID.toString(),
          "text"                : teks,
          "parse_mode"          : "Markdown",
          "disable_notification": false,   // pastikan notifikasi + suara aktif
          "reply_markup"        : kb
        }),
        "muteHttpExceptions": true });
  } catch (e) {
    _logSistem("ERR_ALERT_KIRIM", e.toString());
  }
}

// ── OPSIONAL: panggilan suara via CallMeBot (berdering walau silent) ──
// Aktifkan dengan mengisi sheet Pengaturan:
//   ALERT_CALL_AKTIF = TRUE
//   ALERT_CALL_NOMOR = nomor HP admin format internasional (mis. 6285100062524)
// Lalu daftar sekali di https://www.callmebot.com (gratis untuk pemakaian wajar).
// Panggilan telepon umumnya tetap berdering meski HP dalam mode senyap.
function picuPanggilanDaruratOpsional(config, pesanSingkat) {
  if (!config || String(config.ALERT_CALL_AKTIF).toUpperCase() !== "TRUE") return false;
  var nomor = config.ALERT_CALL_NOMOR;
  if (!nomor) return false;
  try {
    var url = "https://api.callmebot.com/start.php?source=web&user=@" +
      "&text=" + encodeURIComponent(pesanSingkat || "Ada permintaan darurat di bot Kinerja RHK") +
      "&lang=id-ID&rpt=2";
    UrlFetchApp.fetch(url, { "muteHttpExceptions": true });
    return true;
  } catch (e) {
    _logSistem("ERR_ALERT_CALL", e.toString());
    return false;
  }
}

// ── Tes cepat dari editor Apps Script ────────────────────────────
function tesAlertDarurat() {
  var config = ambilKonfigurasiSaaS();
  var id = kirimAlertDarurat(config,
    "TES ALERT",
    "Ini hanya uji coba sistem alert darurat.\nTekan Stop Alarm untuk menghentikan.",
    { tombolAksi: [{ "text": "👁️ Contoh Aksi", "callback_data": "HUBUNGI_ADMIN" }] });
  Logger.log("Alert terkirim dengan ID: " + id + ". Cek Telegram admin.");
}
