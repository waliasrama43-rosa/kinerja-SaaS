// ====================================================================
// FILE 02: LAYANAN MANIPULASI & QUERY DATA SPREADSHEET (REVISI V2)
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
  // Kolom: Chat_ID, Nama_Pendaftar, Folder_Root_ID, Status_Akses, Masa_Aktif,
  //         Limit_Harian, Total_Laporan, Catatan_Admin, State_Sesi,
  //         RHK_Terpilih, Tanggal_Terpilih, Hari_Terpilih, Current_Placeholder_Index,
  //         Foto_Count, No_WA, Warning_Sent
  var tglSkrg = new Date();
  sheet.appendRow([
    chatId, usernameTelegram, "", "BELUM_DAFTAR", tglSkrg,
    5, 0, "Pendaftaran Baru", "",
    "", "", "", 0,
    0, "", ""
  ]);
  return {
    Chat_ID: chatId,
    Nama_Pendaftar: usernameTelegram,
    Status_Akses: "BELUM_DAFTAR",
    Limit_Harian: 5,
    Total_Laporan: 0,
    State_Sesi: "",
    No_WA: "",
    Warning_Sent: ""
  };
}

function perbaruiKolomKlien(chatId, namaKolom, nilaiBaru) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  var data = sheet.getDataRange().getValues();
  var colIndex = data[0].indexOf(namaKolom);
  
  if (colIndex === -1) return; // Kolom tidak ditemukan, lewati
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === chatId.toString()) {
      sheet.getRange(i + 1, colIndex + 1).setValue(nilaiBaru);
      break;
    }
  }
}

// ====================================================================
// FUNGSI BANTU: Ambil semua klien berdasarkan status tertentu
// Digunakan oleh trigger expiry, broadcast, dan laporan admin
// ====================================================================
function cariSemuaKlienByStatus(statusTarget) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  var data  = sheet.getDataRange().getValues();
  var hasil = [];

  for (var i = 1; i < data.length; i++) {
    var row   = data[i];
    var status = row[data[0].indexOf("Status_Akses")];
    if (statusTarget === "*" || status === statusTarget) {
      var klien = {};
      for (var j = 0; j < data[0].length; j++) {
        klien[data[0][j]] = row[j];
      }
      hasil.push(klien);
    }
  }
  return hasil;
}

// ====================================================================
// FUNGSI BANTU: Ambil satu klien by Chat_ID (alias ringkas)
// ====================================================================
function ambilKlien(chatId) {
  return cariAtauDaftarKlienSaaS(chatId, "");
}

// ====================================================================
// FUNGSI BANTU: Buat deeplink WhatsApp untuk follow-up klien
// Digunakan oleh admin dashboard & trigger expired
// ====================================================================
function buatLinkWA(noWa, pesan) {
  if (!noWa || noWa.toString().trim() === "") return null;
  var no = noWa.toString().replace(/[^0-9]/g, "");
  // Normalisasi: 08xx → 628xx
  if (no.indexOf("0") === 0) no = "62" + no.substring(1);
  var encoded = encodeURIComponent(pesan);
  return "https://wa.me/" + no + "?text=" + encoded;
}

// CRON JOB OTOMATIS: Dihubungkan dengan Trigger Waktu Harian GAS (00:01 Malam)
function resetLimitHarianSaaSOtomatis() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var colIndex = data[0].indexOf("Limit_Harian");
  
  // Hanya reset klien yang AKTIF agar tidak percuma untuk akun nonaktif
  var colStatus = data[0].indexOf("Status_Akses");
  for (var i = 1; i < data.length; i++) {
    if (data[i][colStatus] === "AKTIF") {
      sheet.getRange(i + 1, colIndex + 1).setValue(5);
    }
  }
}
