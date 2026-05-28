// ====================================================================
// FILE 02: LAYANAN MANIPULASI & QUERY DATA SPREADSHEET
// ====================================================================

function cariAtauDaftarKlienSaaS(chatId, usernameTelegram) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === chatId.toString()) {
      var klien = {};
      for (var j = 0; j < data[0].length; j++) {
        klien[data[0][j]] = data[i][j];
      }
      return klien;
    }
  }
  
  // Jika pengguna baru pertama kali klik /start, daftarkan dengan status BELUM_DAFTAR
  var tglSkrg = new Date();
  sheet.appendRow([chatId, usernameTelegram, "", "BELUM_DAFTAR", tglSkrg, 5, 0, "Pendaftaran Baru", "", "", "", "", 0, 0]);
  return { Chat_ID: chatId, Nama_Pendaftar: usernameTelegram, Status_Akses: "BELUM_DAFTAR", Limit_Harian: 5, Total_Laporan: 0, State_Sesi: "" };
}

function perbaruiKolomKlien(chatId, namaKolom, nilaiBaru) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  var data = sheet.getDataRange().getValues();
  var colIndex = data[0].indexOf(namaKolom);
  
  if (colIndex === -1) return;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === chatId.toString()) {
      sheet.getRange(i + 1, colIndex + 1).setValue(nilaiBaru);
      break;
    }
  }
}

// CRON JOB OTOMATIS: Dihubungkan dengan Trigger Waktu Harian GAS (00:01 Malam)
function resetLimitHarianSaaSOtomatis() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var colIndex = data[0].indexOf("Limit_Harian");
  
  for (var i = 1; i < data.length; i++) {
    sheet.getRange(i + 1, colIndex + 1).setValue(5); // Kembalikan jatah limit ke angka 5 harian
  }
}