// ====================================================================
// FILE 04: ENGINE UTAMA UTK INTERAKSI & ALUR KERJA KLIEN (REVISI V5)
// ====================================================================

function prosesFiturKlienSaaS(update, config, token) {
  var chatId = (update.message ? update.message.chat.id : update.callback_query.message.chat.id).toString();
  var username = update.message ? (update.message.from.username ? "@" + update.message.from.username : update.message.from.first_name) : "";
  
  var klien = cariAtauDaftarKlienSaaS(chatId, update.message ? update.message.from.first_name : "");
  var sapaan = (klien.Status_Akses === "BELUM_DAFTAR" || klien.Status_Akses === "REG_WIZARD") ? username : klien.Nama_Pendaftar;

  if (update.message && update.message.text) {
    var text = update.message.text.trim();

    // 1. PENANGANAN PERINTAH UTAMA
    if (text === "/start" || text === "/lapor") {
      if (klien.Status_Akses === "BELUM_DAFTAR") {
        perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_NAMA");
        kirimPesanSaaS(chatId, "👋 Halo " + sapaan + "!\n\nSelamat datang di platform premium *Kinerja RHK*. Akun Anda belum terdaftar di sistem kami.\n\nYuk, kita mulai pendaftaran instan terlebih dahulu. Silakan ketik *Nama Lengkap beserta Gelar resmi* Anda, Pak/Bu: 👇", null, token);
        return;
      }
      if (klien.Status_Akses === "REG_WIZARD" || klien.Status_Akses === "PENDING_RHK") {
        kirimPesanSaaS(chatId, "✨ Halo Pak/Bu *" + sapaan + "*!\n\nPendaftaran Anda sudah kami amankan. Saat ini Admin sedang melakukan verifikasi berkas dan mengonfigurasi susunan menu RHK khusus untuk Anda. Mohon ditunggu ya, kami akan segera memberikan notifikasi jika sistem sudah siap! 🥰", null, token);
        return;
      }
      if (klien.Status_Akses !== "AKTIF") {
        kirimPesanSaaS(chatId, "🔒 Mohon maaf, status akses akun Anda saat ini sedang dinonaktifkan oleh Admin. Silakan hubungi " + linkAdmin() + " untuk bantuan aktivasi.", null, token);
        return;
      }
      if (new Date() > new Date(klien.Masa_Aktif)) {
        kirimPesanSaaS(chatId, "⏰ Oh tidak! Masa aktif paket premium Anda telah berakhir pada " + Utilities.formatDate(new Date(klien.Masa_Aktif), "GMT+7", "dd/MM/yyyy") + ".\n\nYuk, lakukan perpanjangan lisensi Anda terlebih dahulu dengan mengetik /bayar atau /langganan 💎", null, token);
        return;
      }
      if (parseInt(klien.Limit_Harian) <= 0) {
        kirimPesanSaaS(chatId, "🛑 Wah, Anda sangat produktif hari ini! Namun jatah Anda telah mencapai *Limit Maksimal* untuk hari ini. Silakan kembali melakukan pelaporan besok hari setelah pukul 00:01 malam ya, Pak/Bu! 🌟", null, token);
        return;
      }

      var props = PropertiesService.getUserProperties();
      var keys = props.getKeys();
      for (var i = 0; i < keys.length; i++) { if (keys[i].indexOf(chatId) === 0) props.deleteProperty(keys[i]); }
      
      perbaruiKolomKlien(chatId, "State_Sesi", "PILIH_RHK");
      perbaruiKolomKlien(chatId, "Foto_Count", 0);
      tampilkanMenuRHKKlien(chatId, token);
      return;
    }

    if (text === "/langganan" || text === "/bayar") {
      tampilkanMenuPaketKomersial(chatId, token);
      return;
    }

    // 2. PENANGANAN SESI INPUT TANGGAL MANUAL
    if (klien.State_Sesi === "TUNGGU_TGL_MANUAL") {
      var polaTgl = /^(\d{2})\/(\d{2})\/(\d{4})$/; // Format cek DD/MM/YYYY
      if (polaTgl.test(text)) {
        var parts = text.split("/");
        var d = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
        var hIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        var bIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        var formatIndo = parts[0] + " " + bIndo[parseInt(parts[1]) - 1] + " " + parts[2];
        
        perbaruiKolomKlien(chatId, "Tanggal_Terpilih", formatIndo);
        perbaruiKolomKlien(chatId, "Hari_Terpilih", hIndo[d.getDay()]);
        
        kirimPesanSaaS(chatId, "🗓️ Tanggal dikunci: *" + formatIndo + "*", null, token);
        analisisDanMulaiPertanyaanDoc(chatId, token);
      } else {
        kirimPesanSaaS(chatId, "⚠️ *Format tanggal salah!*\n\nMohon pastikan format yang Anda ketik adalah `DD/MM/YYYY` (contoh: `22/05/2026`).\n\nJika ingin membatalkan, silakan ketik /batal.", null, token);
      }
      return;
    }

    // 3. PENANGANAN SESI KUESIONER PERTANYAAN
    if (klien.State_Sesi.indexOf("TUNGGU_TAG_") === 0) {
      var tagAktif = klien.State_Sesi.replace("TUNGGU_TAG_", "");
      PropertiesService.getUserProperties().setProperty(chatId + "_ans_" + tagAktif, text);
      pindahKePertanyaanBerikutnya(chatId, token);
      return;
    }

    // 4. JARING PENGAMAN (FALLBACK / CATCH-ALL) UNTUK TEKS TIDAK DIKENAL
    if (klien.State_Sesi === "") {
      var fallbackMsg = "🤔 *Maaf, saya tidak mengenali perintah tersebut.*\n\n" +
                        "Silakan gunakan menu perintah yang tersedia:\n" +
                        "🔸 `/lapor` - Mulai pelaporan RHK\n" +
                        "🔸 `/bayar` - Info langganan paket\n" +
                        "🔸 `/batal` - Batalkan proses saat ini";
      kirimPesanSaaS(chatId, fallbackMsg, null, token);
    } else {
      var warningMsg = "⚠️ *Anda masih dalam sesi pengisian data (" + klien.State_Sesi + ").*\n\n" +
                       "Mohon ikuti instruksi bot yang terakhir, atau ketik `/batal` jika Anda ingin mereset dan mengulang dari awal.";
      kirimPesanSaaS(chatId, warningMsg, null, token);
    }
    return;
  }
}

// [Fungsi tampilkanMenuRHKKlien, tampilkanMenuTanggalSaaS, analisisDanMulaiPertanyaanDoc, pindahKePertanyaanBerikutnya, lompatKeFaseFoto, tampilkanMenuPaketKomersial tetap utuh di bawah sini]

function tampilkanMenuRHKKlien(chatId, token) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
  var data = sheet.getDataRange().getValues();
  var buttons = [];
  
  var userRhk = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === chatId.toString()) {
      userRhk.push({ id: data[i][1], label: data[i][2], emoji: data[i][3], urut: data[i][9] });
    }
  }
  userRhk.sort(function(a, b) { return a.urut - b.urut; });
  
  userRhk.forEach(function(item) {
    buttons.push([{"text": item.emoji + " " + item.label, "callback_data": "RUN_RHK_" + item.id}]);
  });
  
  if (buttons.length === 0) {
    kirimPesanSaaS(chatId, "⚠️ *Menu RHK Belum Siap!* Admin sedang merakit konfigurasi template dokumen Anda. Mohon hubungi " + linkAdmin() + " untuk mempercepat proses. 🙏", null, token);
  } else {
    kirimPesanSaaS(chatId, "📋 *Silakan pilih salah satu RHK Kerja yang ingin Anda laporkan hari ini, Pak/Bu:*", {"inline_keyboard": buttons}, token);
  }
}

function tampilkanMenuTanggalSaaS(chatId, token) {
  var rows = [], hIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], bIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  for (var i = 0; i < 6; i++) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var tglF = d.getDate() + " " + bIndo[d.getMonth()] + " " + d.getFullYear();
    var lbl = (i === 0) ? "📅 Hari Ini (" + hIndo[d.getDay()] + ")" : (i === 1) ? "🗓️ Kemarin (" + hIndo[d.getDay()] + ")" : "📆 " + hIndo[d.getDay()] + ", " + tglF;
    rows.push([{"text": lbl, "callback_data": "SET_TGL_" + tglF + "_" + hIndo[d.getDay()]}]);
  }
  rows.push([{"text": "⌨️ Input Tanggal Manual", "callback_data": "SET_TGL_MANUAL"}]);
  kirimPesanSaaS(chatId, "🕒 *Pilih Tanggal Pelaksanaan Kegiatan:*", {"inline_keyboard": rows}, token);
}

function analisisDanMulaiPertanyaanDoc(chatId, token) {
  try {
    var klien = cariAtauDaftarKlienSaaS(chatId, "");
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
    var data = sheet.getDataRange().getValues();
    var templateId = "";
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === chatId.toString() && data[i][1] === klien.RHK_Terpilih) {
        templateId = data[i][4]; break;
      }
    }
    
    var docText = DocumentApp.openById(templateId).getBody().getText();
    var regex = /\{\{([A-Za-z0-9_]+)\}\}/g;
    var daftarTag = [];
    var match;
    
    while ((match = regex.exec(docText)) !== null) {
      var tag = match[1];
      if (["HARI", "TANGGAL", "FOTO1", "FOTO2", "FOTO3", "FOTO4"].indexOf(tag) === -1 && daftarTag.indexOf(tag) === -1) {
        daftarTag.push(tag);
      }
    }
    
    var props = PropertiesService.getUserProperties();
    props.setProperty(chatId + "_list_tags", daftarTag.join(","));
    props.setProperty(chatId + "_current_tag_idx", "0");
    
    pindahKePertanyaanBerikutnya(chatId, token);
  } catch(e) {
    var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
    if (logSheet) logSheet.appendRow([new Date(), "ERROR BACA DOC", "ChatID: " + chatId + " | Error: " + e.toString()]);
    kirimPesanSaaS(chatId, "⚠️ *Gagal membaca pola template RHK.* \n\nKemungkinan file template masih berformat Word (.docx) atau ID Template salah. Admin telah menerima log error ini.", null, token);
  }
}

function pindahKePertanyaanBerikutnya(chatId, token) {
  var props = PropertiesService.getUserProperties();
  var listTagsStr = props.getProperty(chatId + "_list_tags") || "";
  var idx = parseInt(props.getProperty(chatId + "_current_tag_idx") || "0");
  
  if (listTagsStr === "") {
    lompatKeFaseFoto(chatId, token); return;
  }
  
  var tags = listTagsStr.split(",");
  if (idx < tags.length) {
    var tagSekarang = tags[idx];
    perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_TAG_" + tagSekarang);
    props.setProperty(chatId + "_current_tag_idx", (idx + 1).toString());
    
    var kamusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kamus_Placeholder");
    var kData = kamusSheet.getDataRange().getValues();
    var kalimatTanya = "Mohon isi informasi untuk kolom *" + tagSekarang + "*:";
    
    for (var i = 1; i < kData.length; i++) {
      if (kData[i][0].toString().toUpperCase() === tagSekarang.toUpperCase()) {
        kalimatTanya = kData[i][1]; break;
      }
    }
    
    var kbOpsi = {"inline_keyboard": [
      [{"text": "⚠️ Laporkan Salah Setting Admin", "callback_data": "KOMPLAIN_TAG_" + tagSekarang}]
    ]};
    
    kirimPesanSaaS(chatId, "✨ *Pertanyaan " + (idx + 1) + "/" + tags.length + ":*\n" + kalimatTanya, kbOpsi, token);
  } else {
    lompatKeFaseFoto(chatId, token);
  }
}

function lompatKeFaseFoto(chatId, token) {
  perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_FOTO");
  kirimPesanSaaS(chatId, "📸 *Seluruh data isian teks berhasil disimpan dengan aman!* \n\nSekarang, silakan kirimkan berkas *Foto Bukti Kegiatan ke-1* Anda (Minimal 2 foto, Maksimal 4 foto):", null, token);
}

function tampilkanMenuPaketKomersial(chatId, token) {
  var kb = {"inline_keyboard": [
    [{"text": "💎 Paket 1 Bulan - Rp 10.000", "callback_data": "ORDER_PAKET_1"}],
    [{"text": "💎 Paket 3 Bulan - Rp 30.000", "callback_data": "ORDER_PAKET_3"}],
    [{"text": "💎 Paket 6 Bulan - Rp 50.000", "callback_data": "ORDER_PAKET_6"}],
    [{"text": "💎 Paket 12 Bulan - Rp 100.000", "callback_data": "ORDER_PAKET_12"}]
  ]};
  kirimPesanSaaS(chatId, "🛍️ *PILIHAN PAKET PREMIUM LAYANAN BOT RHK*\n\nSilakan tentukan durasi masa aktif yang Anda butuhkan, Pak/Bu:", kb, token);
}