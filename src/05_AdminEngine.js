// ====================================================================
// FILE 05: COMMAND CENTER KENDALI OPERASIONAL ADMIN SAAS (REVISI V3)
// ====================================================================

function prosesFiturAdminSaaS(update, config) {
  var chatId = update.message.chat.id.toString();
  var text = update.message.text ? update.message.text.trim() : "";

  // SIMPAN PAYLOAD QRIS STATIS UNTUK QRIS DINAMIS OTOMATIS
  if (text.indexOf("/admin set_qris ") === 0) {
    var qrisStr = text.replace("/admin set_qris ", "").trim();
    if (qrisStr.length < 20 || qrisStr.indexOf("0002") !== 0) {
      kirimPesanSaaS(chatId, "❌ *Payload QRIS tidak valid.*\nPayload QRIS statis biasanya diawali `0002` dan cukup panjang. Salin teks mentah dari QRIS Anda (bisa didapat dgn memindai QRIS pakai aplikasi pembaca QR), lalu kirim:\n`/admin set_qris 00020101...`", null, config.BOT_TOKEN);
      return true;
    }
    simpanKonfigurasiSaaS("QRIS_STATIC_STRING", qrisStr);
    var contohDin;
    try {
      contohDin = buatQrisDinamis(qrisStr, 10123);
    } catch (eC) {
      kirimPesanSaaS(chatId, "⚠️ QRIS tersimpan, namun gagal membentuk contoh dinamis: " + eC.toString(), null, config.BOT_TOKEN);
      return true;
    }
    kirimPesanSaaS(chatId, "✅ *QRIS statis berhasil disimpan!*\nMulai sekarang setiap invoice akan otomatis memakai *QRIS dinamis* (nominal tertanam).\n\nContoh payload dinamis untuk Rp 10.123:\n`" + contohDin + "`", null, config.BOT_TOKEN);
    return true;
  }

  if (text.indexOf("/admin broadcast ") === 0) {
    var isiPesan = text.replace("/admin broadcast ", "");
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var data = sheet.getDataRange().getValues();
    var sukses = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] === "AKTIF") {
        kirimPesanSaaS(data[i][0].toString(), "📢 *PENGUMUMAN RESMI PLATFORM RHK:* \n\n" + isiPesan, null, config.BOT_TOKEN);
        sukses++;
      }
    }
    kirimPesanSaaS(chatId, "🚀 Berhasil menyebarkan pesan broadcast kepada *" + sukses + "* klien premium aktif!", null, config.BOT_TOKEN);
    return true;
  }

  if (text.indexOf("/admin blokir ") === 0) {
    var params = text.split(" ");
    if (params.length >= 3) {
      var targetId = params[1]; var alasan = text.replace("/admin blokir " + targetId + " ", "");
      perbaruiKolomKlien(targetId, "Status_Akses", "NONAKTIF");
      perbaruiKolomKlien(targetId, "Catatan_Admin", "Blokir: " + alasan);
      kirimPesanSaaS(chatId, "🔒 Akun ID `" + targetId + "` berhasil dinonaktifkan.", null, config.ADMIN_CHAT_ID);
      kirimPesanSaaS(targetId, "🔔 Pemberitahuan: Akses bot Anda telah ditangguhkan sepihak oleh Admin dengan alasan: *" + alasan + "*.", null, config.BOT_TOKEN);
    } else {
      kirimPesanSaaS(chatId, "💡 Gunakan pola: `/admin blokir [ID_Chat] [Alasan_Blokir]`", null, config.BOT_TOKEN);
    }
    return true;
  }

  if (text.indexOf("/admin aktifkan ") === 0) {
    var targetAktifId = text.replace("/admin aktifkan ", "").trim();
    var tglExp = new Date(); tglExp.setMonth(tglExp.getMonth() + 1);
    perbaruiKolomKlien(targetAktifId, "Status_Akses", "AKTIF");
    perbaruiKolomKlien(targetAktifId, "Masa_Aktif", tglExp);
    kirimPesanSaaS(chatId, "✅ Sukses membuka gembok akun ID `" + targetAktifId + "`.", null, config.BOT_TOKEN);
    return true;
  }

  // FITUR PENGAWASAN/AUDIT BERKALA STATUS PENDAFTARAN KLIEN YANG MACET
  if (text === "/admin cek_pendaftaran") {
    var shClient = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var cData = shClient.getDataRange().getValues();
    var laporanMacet = "📋 *DAFTAR KLIEN BELUM SELESAI DAFTAR* 📋\n\n";
    var adaMacet = false;
    var nomor = 1;
    
    for (var j = 1; j < cData.length; j++) {
      var status = cData[j][3];
      if (status !== "AKTIF" && status !== "NONAKTIF") {
        laporanMacet += nomor + ". *" + cData[j][1] + "* (`" + cData[j][0] + "`)\n" +
                        "   📍 Tahapan Sesi: `" + (cData[j][8] || "KOSONG/START") + "`\n" +
                        "   🔗 Link Drive Klien: " + (cData[j][2] ? "[Buka Drive Klien](" + cData[j][2] + ")" : "`Belum Kirim`") + "\n\n";
        adaMacet = true; nomor++;
      }
    }
    if (!adaMacet) laporanMacet += "🎉 Luar biasa! Semua pendaftar sudah menyelesaikan administrasi pembayaran premium, Pak Admin!";
    kirimPesanSaaS(chatId, laporanMacet, null, config.BOT_TOKEN);
    return true;
  }

  if (text === "/admin cek_sistem" || text === "/admin") {
    var cSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var totalUser = cSheet.getLastRow() - 1; var vData = cSheet.getDataRange().getValues(); var aktif = 0;
    for (var k = 1; k < vData.length; k++) { if (vData[k][3] === "AKTIF") aktif++; }
    
    var statusSistem = "📊 *LAPORAN UTALITAS SAAS INTEGRASI* 📊\n\n" +
                       "▪️ Total Klien Terdaftar: " + totalUser + " Orang\n" +
                       "▪️ Klien Premium Aktif: " + aktif + " Akun\n" +
                       "▪️ Status Gerbang Server: *ONLINE (Cloudflare)*\n" +
                       "▪️ Menu Cek Macet: `/admin cek_pendaftaran`\n" +
                       "▪️ Set QRIS Dinamis: `/admin set_qris <payload>`";
    kirimPesanSaaS(chatId, statusSistem, null, config.BOT_TOKEN);
    return true;
  }
  return false;
}

// OTONOMISASI BARU: SIMPAN FILE TEMPLATE LANGSUNG KE GDRIVE PUSAT ADMIN (HIERARKI NAMA CLIENT)
function prosesUnduhTemplateWordKlien(chatId, documentObj, config) {
  try {
    var namaFile = documentObj.file_name;
    if (namaFile.indexOf(".docx") === -1) {
      kirimPesanSaaS(chatId, "❌ *Jenis berkas salah!* Mohon kirimkan file template laporan Anda dalam format dokumen Microsoft Word asli (`.docx`), Pak/Bu. 🙏", null, config.BOT_TOKEN);
      return;
    }
    
    var klien = cariAtauDaftarKlienSaaS(chatId, "");
    var adminRootDrive = DriveApp.getFolderById(SAAS_CONFIG.ADMIN_ROOT_FOLDER_ID);
    
    // Pembuatan sub-folder otomatis pakai Nama Pendaftar di dalam Drive Admin
    var folderNamaKlien;
    var iter = adminRootDrive.getFoldersByName(klien.Nama_Pendaftar);
    if (iter.hasNext()) {
      folderNamaKlien = iter.next();
    } else {
      folderNamaKlien = adminRootDrive.createFolder(klien.Nama_Pendaftar);
    }
    
    var fileRes = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/getFile?file_id=" + documentObj.file_id);
    var filePath = JSON.parse(fileRes.getContentText()).result.file_path;
    var blobWord = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + config.BOT_TOKEN + "/" + filePath).getBlob();
    
    // Simpan & konversi langsung ke format Google Docs di Drive Admin
    var resource = { title: namaFile.replace(".docx", ""), mimeType: MimeType.GOOGLE_DOCS, parents: [{id: folderNamaKlien.getId()}] };
    var googleDocFile = Drive.Files.insert(resource, blobWord);
    
    perbaruiKolomKlien(chatId, "State_Sesi", "");
    
    var peringatanSetupAdmin = "⚠️ *Pemberitahuan:* Pendaftaran Anda telah selesai dilakukan. Saat ini Admin kami sedang melakukan konfigurasi susunan menu RHK khusus berdasarkan berkas template dokumen yang Anda kirimkan.\n\nMohon ditunggu dengan tenang ya Pak/Bu, kami akan segera mengabari Anda jika menu laporan Anda sudah siap digunakan! 🥰";
    kirimPesanSaaS(chatId, peringatanSetupAdmin, null, config.BOT_TOKEN);
    
    // NOTIFIKASI DISERTAI TOMBOL PINTAS LANGSUNG KE DRIVE ADMIN (SOLUSI 2)
    var alertAdmin = "🔔 *NOTIFIKASI TEMPLATE BARU DI DRIVE ADMIN* 🔔\n\n" +
                     "👤 Pengguna: *" + klien.Nama_Pendaftar + "* (`" + chatId + "`)\n" +
                     "📄 Nama Berkas: `" + namaFile + "`\n" +
                     "🆔 Template ID Pusat: `" + googleDocFile.id + "`\n\n" +
                     "👉 *Tugas Admin:* Silakan salin ID Template tersebut, buat susunan menu barunya ke sheet *RHK_Config*, sistem otonom akan langsung membangun folder harian klien!";
                     
    var kbDriveAdmin = {"inline_keyboard": [
      [{"text": "📂 Buka Folder Drive Pusat Admin", "url": "https://drive.google.com/drive/folders/" + folderNamaKlien.getId()}]
    ]};
    kirimPesanSaaS(config.ADMIN_CHAT_ID, alertAdmin, kbDriveAdmin, config.BOT_TOKEN);
    
  } catch (err) {
    kirimPesanSaaS(chatId, "⚠️ Terjadi kegagalan penulisan dokumen ke Drive pusat Admin. Pastikan konfigurasi ID Root Admin benar.", null, config.BOT_TOKEN);
  }
}

// [Fungsi buatInvoiceOtonomSaaS, terimaFotoBuktiTransferKlien, terimaFotoLaporanKegiatanKlien, eksekusiApprovePembayaranKlien, eksekusiRejectPembayaranKlien tetap utuh di bawah baris ini]

// ====================================================================
// FUNGSI LOGISTIK TRANSAKSI KOMERSIAL MULTI-CLIENT (PASTIKAN ADA DI FILE 05)
// ====================================================================

function buatInvoiceOtonomSaaS(chatId, durasiBulan, config) {
  var hargaAwal = { "1": 10000, "3": 30000, "6": 50000, "12": 100000 }[durasiBulan];
  var kodeUnik = Math.floor(Math.random() * 900) + 100; // 3 Digit Acak Sistem
  var nominalTotal = hargaAwal + kodeUnik;
  var trxId = "TRX" + new Date().getTime();
  
  // Simpan record pesanan sementara ke User Properties agar webhook tahu nominal yang ditunggu
  var props = PropertiesService.getUserProperties();
  props.setProperty(chatId + "_pending_trx_id", trxId);
  props.setProperty(chatId + "_pending_total", nominalTotal.toString());
  props.setProperty(chatId + "_pending_bulan", durasiBulan);
  
  perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_BUKTI_BAYAR");

  var qrisStatis = config.QRIS_STATIC_STRING || SAAS_CONFIG.QRIS_STATIC_STRING || "";

  if (qrisStatis) {
    // ===== MODE QRIS DINAMIS: nominal sudah tertanam, klien tinggal scan =====
    var nominalFmt = "Rp " + nominalTotal.toLocaleString("id-ID");
    var panduanDinamis = "🛒 *NOTA INVOICE LISENSI PREMIUM* 🛒\n\n" +
                         "▪️ Kode Pesanan: `" + trxId + "`\n" +
                         "▪️ Durasi Paket: *" + durasiBulan + " Bulan*\n" +
                         "▪️ *TOTAL BAYAR:* `" + nominalFmt + "`\n\n" +
                         "✅ *QRIS DINAMIS!* Nominal *" + nominalFmt + "* sudah otomatis tertera saat Anda scan — " +
                         "Anda *tidak perlu* mengetik nominal manual lagi.\n\n" +
                         "📌 Cukup scan QR di atas, pastikan nominalnya *" + nominalFmt + "*, lalu kirimkan " +
                         "*foto bukti transfer* Anda ke chat ini ya, Pak/Bu. 🙏";
    try {
      var payloadDinamis = buatQrisDinamis(qrisStatis, nominalTotal);
      var apiUrl = config.QRIS_API_URL || SAAS_CONFIG.QRIS_API_URL;
      var blobDinamis = generateBlobQris(payloadDinamis, apiUrl);
      var pLoadDin = { "chat_id": chatId, "photo": blobDinamis, "caption": panduanDinamis, "parse_mode": "Markdown" };
      UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto", { "method": "post", "payload": pLoadDin, "muteHttpExceptions": true });
      return;
    } catch (eQ) {
      console.error("Gagal membuat QRIS dinamis, fallback ke gambar statis: " + eQ.toString());
      // Lanjut ke fallback di bawah bila pembuatan QRIS dinamis gagal.
    }
  }

  // ===== FALLBACK: gambar QRIS statis lama (klien input nominal manual) =====
  var panduanBayar = "🛒 *NOTA INVOICE LISENSI PREMIUM* 🛒\n\n" +
                     "▪️ Kode Pesanan: `" + trxId + "`\n" +
                     "▪️ Durasi Paket: *" + durasiBulan + " Bulan*\n" +
                     "▪️ *TOTAL TRANSFER:* `Rp " + nominalTotal.toLocaleString("id-ID") + "`\n\n" +
                     "📌 *PENTING:* Mohon transfer nominal persis hingga *3 digit angka terakhir* ya Pak/Bu. Kelebihan nilai transfer diniatkan sebagai keikhlasan biaya otentikasi sistem. 🙏\n\n" +
                     "Silakan scan QRIS Dana Bisnis di bawah ini, kemudian langsung *kirimkan foto bukti transfer* Anda ke bot ini:";

  // Ambil gambar fisik QRIS langsung dari Google Drive Admin
  var blobQris = DriveApp.getFileById(SAAS_CONFIG.QRIS_FILE_ID).getBlob();
  var pLoad = { "chat_id": chatId, "photo": blobQris, "caption": panduanBayar, "parse_mode": "Markdown" };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto", { "method": "post", "payload": pLoad });
}

function terimaFotoBuktiTransferKlien(chatId, photoArray, config) {
  var props = PropertiesService.getUserProperties();
  var trxId = props.getProperty(chatId + "_pending_trx_id") || "TRX_UNKNOWN";
  var totalSistem = props.getProperty(chatId + "_pending_total") || "0";
  var bulan = props.getProperty(chatId + "_pending_bulan") || "1";
  var fileIdFoto = photoArray[photoArray.length - 1].file_id;
  
  var klien = cariAtauDaftarKlienSaaS(chatId, "");
  perbaruiKolomKlien(chatId, "State_Sesi", ""); // Bebaskan sesi klien
  
  var infoNotif = "🔔 *KONFIRMASI BAYAR MASUK MULTI-CLIENT* 🔔\n\n" +
                   "▪️ Pengguna: *" + klien.Nama_Pendaftar + "* (`" + chatId + "`)\n" +
                   "▪️ Paket Order: *" + bulan + " Bulan*\n" +
                   "▪️ Nominal Sistem: *Rp " + parseInt(totalSistem).toLocaleString("id-ID") + "*\n" +
                   "▪️ Kode Unik: `+" + totalSistem.slice(-3) + "`\n\n" +
                   "🟢 *VERIFIKASI KODE UNIK:* Silakan buka aplikasi DANA Bisnis Anda dan cocokkan apakah ada dana masuk dengan akhiran angka tersebut, lalu klik opsi menu di bawah ini:";
                   
  var kbAdmin = {"inline_keyboard": [
    [{"text": "✅ Setujui & Aktifkan Akun", "callback_data": "ADM_APP_" + chatId + "_" + bulan}],
    [{"text": "❌ Tolak Bukti Transfer", "callback_data": "ADM_REJ_" + chatId}]
  ]};
  
  var pLoad = { "chat_id": config.ADMIN_CHAT_ID.toString(), "photo": fileIdFoto, "caption": infoNotif, "parse_mode": "Markdown", "reply_markup": JSON.stringify(kbAdmin) };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto", { "method": "post", "payload": pLoad });
  
  kirimPesanSaaS(chatId, "✨ *Bukti transfer Anda berhasil diterima!* \n\nSistem telah meneruskannya kepada Admin untuk divalidasi via mutasi rekening. Akun premium Anda akan segera aktif otomatis setelah disetujui ya, Pak/Bu! 🥰👍", null, config.BOT_TOKEN);
}

function terimaFotoLaporanKegiatanKlien(chatId, photoArray, config) {
  var klien = cariAtauDaftarKlienSaaS(chatId, "");
  var count = parseInt(klien.Foto_Count || "0") + 1;
  
  if (count > 4) {
    kirimPesanSaaS(chatId, "🛑 Batas pengiriman bukti gambar hanya *maksimal 4 foto* saja demi keserasian halaman dokumen myASN Anda. Yuk, langsung ketuk tombol 'Rakit Jadi PDF' di bawah ini!", null, config.BOT_TOKEN);
    return;
  }
  
  perbaruiKolomKlien(chatId, "Foto_Count", count);
  PropertiesService.getUserProperties().setProperty(chatId + "_foto_" + count, photoArray[photoArray.length - 1].file_id);
  
  if (count < 2) {
    kirimPesanSaaS(chatId, "📸 Foto ke-1 sukses direkam! Sila kirimkan berkas *Foto Bukti Kegiatan ke-2* Anda agar syarat minimal terpenuhi ya Pak/Bu:", null, config.BOT_TOKEN);
  } else {
    var kbCetak = {"inline_keyboard": [
      [{"text": "📷 Tambah Foto Lagi (" + count + "/4)", "callback_data": "SaaS_PROSES_FOTO_LAGI"}],
      [{"text": "🚀 Kirim & Rakit Jadi PDF Now!", "callback_data": "SaaS_PROSES_NOW"}]
    ]};
    kirimPesanSaaS(chatId, "✨ Bagus! Tersimpan *" + count + " foto bukti*. Apakah Anda ingin menyudahi pengiriman dan langsung menerbitkan berkas PDF laporan hari ini?", kbCetak, config.BOT_TOKEN);
  }
}

function eksekusiApprovePembayaranKlien(callbackDataStr, config) {
  var p = callbackDataStr.split("_"); // [chatId, durasiBulan]
  var targetId = p[0]; var jmlBulan = parseInt(p[1]);
  
  var targetKlien = cariAtauDaftarKlienSaaS(targetId, "");
  var expBaru = new Date();
  if (targetKlien.Status_Akses === "AKTIF" && new Date(targetKlien.Masa_Aktif) > new Date()) {
    expBaru = new Date(targetKlien.Masa_Aktif);
  }
  expBaru.setMonth(expBaru.getMonth() + jmlBulan);
  
  perbaruiKolomKlien(targetId, "Status_Akses", "AKTIF");
  perbaruiKolomKlien(targetId, "Masa_Aktif", expBaru);
  
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(), "⚙️ Sukses memvalidasi pembayaran. Akun `" + targetId + "` telah aktif premium.", null, config.BOT_TOKEN);
  
  var txtSuksesKlien = "🎉 *YAY, PEMBAYARAN PREMIUM DISETUJUI!* 🎉\n\n" +
                       "Selamat Pak/Bu *" + targetKlien.Nama_Pendaftar + "*, lisensi Anda telah resmi diverifikasi oleh Admin. Akun Anda kini aktif kembali hingga tanggal *" + Utilities.formatDate(expBaru, "GMT+7", "dd/MM/yyyy") + "*.\n\n" +
                       "Silakan kirimkan file template laporan Microsoft Word (`.docx`) RHK Anda langsung ke chat bot ini sebagai syarat setup awal pembuatan tombol menu, Pak/Bu! 🥰🚀";
  kirimPesanSaaS(targetId, txtSuksesKlien, null, config.BOT_TOKEN);
}

function eksekusiRejectPembayaranKlien(targetId, config) {
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(), "❌ Transaksi untuk ID `" + targetId + "` berhasil ditolak sepihak.", null, config.BOT_TOKEN);
  kirimPesanSaaS(targetId, "🛑 *Konfirmasi Pembayaran Ditolak* 🛑\n\nMohon maaf, bukti transfer yang Anda kirimkan dinyatakan *Tidak Valid* oleh Admin setelah pemeriksaan mutasi. Silakan lakukan pemesanan ulang dengan mengetik /bayar dan pastikan nominal transfer sesuai.", null, config.BOT_TOKEN);
}