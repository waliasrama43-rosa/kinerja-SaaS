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
