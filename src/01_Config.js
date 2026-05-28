// ====================================================================
// FILE 01: PUSAT KONFIGURASI GLOBAL & UTilitas UTAMA (REVISI V3)
// ====================================================================

const SAAS_CONFIG = {
  ADMIN_TELEGRAM: "@Septian_DK",
  ADMIN_WHATSAPP_LINK: "https://wa.me/6285100062524?text=Halo%20Admin%20Kinerja%20RHK%2C%20saya%20butuh%20bantuan%20terkait%20Sistem%20RHK",
  EMAIL_MITRA_EDITOR: "waliasrama.43@gmail.com",
  
  // ID MASTER DRIVE INDUK MILIK ADMIN (Tempat menyimpan template kiriman klien)
  ADMIN_ROOT_FOLDER_ID: "1zisjFNqoSV5RTAp-9ysyHIc7d9eJ2Yfp",
  
  QRIS_FOLDER_ID: "1l2pRo9QQKA--44hq8cQ8KNvuNy7FI1hd",
  QRIS_FILE_ID: "1mTvS-fGL9wpAEl3wlRdSNtvI1XHSzqja",
  
  TEKS_PRIVASI_DRIVE: "🔒 *JAMINAN PRIVASI & KEAMANAN DATA*\n" +
                      "Folder yang Anda bagikan 100% tetap menjadi hak milik penuh Anda pribadi. Sistem hanya menaruh file PDF di dalam folder tersebut saja.\n\n" +
                      "➖➖➖➖➖➖➖➖➖➖\n\n" +
                      "👇 *MOHON LAKUKAN LANGKAH BERIKUT:* 👇\n\n" +
                      "1️⃣ Buatlah 1 folder baru yang kosong di Google Drive Anda.\n" +
                      "2️⃣ Ubah pengaturan berbaginya menjadi hak akses *EDITOR* (bukan Pelihat).\n" +
                      "3️⃣ Pastikan email `waliasrama.43@gmail.com` telah dimasukkan ke dalam akses Editor tersebut.\n\n" +
                      "🔗 *Jika sudah, silakan salin (copy) dan KIRIMKAN LINK/TAUTAN folder tersebut ke obrolan ini sekarang ya, Pak/Bu!* 😊"
};

function ambilKonfigurasiSaaS() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Pengaturan");
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) { config[data[i][0]] = data[i][1]; }
  return config;
}

function setupStrukturDatabaseSaaS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var templateSheets = {
    "Pengaturan": [["Kunci", "Nilai"], ["BOT_TOKEN", "8892439073:AAE-BYuT8-bEOBlYjMugLK6sCiugPVki-j0"], ["ADMIN_CHAT_ID", "927597163"]],
    "Client_SaaS": [["Chat_ID", "Nama_Pendaftar", "Folder_Root_ID", "Status_Akses", "Masa_Aktif", "Limit_Harian", "Total_Laporan", "Catatan_Admin", "State_Sesi", "RHK_Terpilih", "Tanggal_Terpilih", "Hari_Terpilih", "Current_Placeholder_Index", "Foto_Count"]],
    "RHK_Config": [["Chat_ID", "RHK_ID", "Label_Menu", "Emoji", "Template_ID", "Folder_PDF_ID", "Folder_Foto_ID", "Min_Foto", "Max_Foto", "Urutan"]],
    "Kamus_Placeholder": [["Kode_Placeholder", "Pertanyaan_Bot"], ["LOKASI", "Di mana lokasi pelaksanaan kegiatan Anda hari ini, Pak/Bu? 📍"], ["URAIAN", "Mohon ceritakan uraian singkat mengenai jalan dan poin kegiatan tersebut: 📝"], ["TUJUAN", "Apa target utama atau tujuan yang ingin dicapai dari agenda ini? 🎯"], ["PIHAK", "Siapa saja pihak, rekan sejawat, atau partisipan yang terlibat di lokasi? 👥"], ["TL", "Bagaimana rencana Tindak Lanjut (TL) ke depan pasca kegiatan selesai? 🚀"], ["KESIMPULAN", "Tuliskan kesimpulan akhir atau ringkasan hasil kegiatan Anda: 📊"]]
  };
  for (var sheetName in templateSheets) {
    if (!ss.getSheetByName(sheetName)) {
      var sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, templateSheets[sheetName][0].length).setValues([templateSheets[sheetName][0]]).setFontWeight("bold");
      if (templateSheets[sheetName].length > 1) sheet.getRange(2, 1, templateSheets[sheetName].length - 1, templateSheets[sheetName][0].length).setValues(templateSheets[sheetName].slice(1));
      sheet.autoResizeColumns(1, templateSheets[sheetName][0].length);
    }
  }
}

function kirimPesanSaaS(chatId, text, kb, token) {
  var p = {"chat_id": chatId, "text": text, "parse_mode": "Markdown", "disable_web_page_preview": true};
  if (kb) p.reply_markup = JSON.stringify(kb);
  return UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {"method": "post", "contentType": "application/json", "payload": JSON.stringify(p), "muteHttpExceptions": true});
}

function kirimDokumenSaaS(chatId, blob, caption, token) {
  return UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendDocument", {"method": "post", "payload": {"chat_id": chatId.toString(), "document": blob, "caption": caption, "parse_mode": "Markdown"}, "muteHttpExceptions": true});
}

function tesBacaTemplate() {
  // Kita tes ID RHK_1 milik Adelia
  var id = "192OgBgLeB9uqeA4dBJb0aEohbh822hlhMiVOVdLF7FA"; 
  try {
    var doc = DocumentApp.openById(id);
    Logger.log("✅ SUKSES! Ini adalah Google Doc asli.");
  } catch(e) {
    Logger.log("❌ GAGAL! File tidak terbaca.");
    Logger.log("Detail Error: " + e.toString());
    Logger.log("💡 Solusi: File tersebut masih .docx atau Anda tidak memiliki akses Editor.");
  }
}

function OtorisasiGoogleDocs() {
  // Fungsi pancingan agar Google memunculkan popup Review Permissions
  var tesFile = DocumentApp.create("File_Pancingan_Otorisasi");
  tesFile.setTrashed(true); // Langsung dibuang ke tempat sampah
  Logger.log("✅ Izin Google Docs berhasil diberikan!");
}

