// ====================================================================
// FILE 08: OTOMATISASI MESIN WAKTU (CRON JOBS & TRIGGERS)
// ====================================================================

function resetLimitHarianOtonom() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Client_SaaS");
  var data = sheet.getDataRange().getValues();
  
  var jatahHarianBaru = 5; // Silakan sesuaikan jumlah jatah cetak harian di sini
  
  // Looping untuk mereset seluruh klien ke batas harian penuh
  for (var i = 1; i < data.length; i++) {
    // Kolom Limit_Harian berada di Kolom F (Indeks ke-6)
    sheet.getRange(i + 1, 6).setValue(jatahHarianBaru);
  }
  
  var logSheet = ss.getSheetByName("Log_Sistem");
  if (logSheet) logSheet.appendRow([new Date(), "INFO SISTEM", "Sukses mereset Limit Harian " + (data.length - 1) + " klien menjadi " + jatahHarianBaru + " cetak."]);
}

function pasangTriggerResetHarian() {
  // 1. Bersihkan trigger lama agar tidak terjadi penumpukan/dobel
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "resetLimitHarianOtonom") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // 2. Buat trigger baru yang akan tereksekusi otomatis setiap jam 00:00 s.d 01:00 pagi
  ScriptApp.newTrigger("resetLimitHarianOtonom")
           .timeBased()
           .atHour(0)
           .nearMinute(1)
           .everyDays(1)
           .create();
           
  Logger.log("✅ Trigger Reset Harian berhasil dipasang aktif!");
}