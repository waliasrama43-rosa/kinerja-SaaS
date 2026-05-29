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
