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
    
    var props = PropertiesService.getUserProperties();
    var listTagsStr = props.getProperty(chatId + "_list_tags") || "";
    if (listTagsStr !== "") {
      var tagsArr = listTagsStr.split(",");
      tagsArr.forEach(function(tagKey) {
        var jawabanUser = props.getProperty(chatId + "_ans_" + tagKey) || "-";
        docBody.replaceText("{{" + tagKey + "}}", jawabanUser);
      });
    }
    
    var totalFotoTerkirim = parseInt(klien.Foto_Count);
    
    for (var i = 1; i <= totalFotoTerkirim; i++) {
      var idFileTelegram = props.getProperty(chatId + "_foto_" + i);
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