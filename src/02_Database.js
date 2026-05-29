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
